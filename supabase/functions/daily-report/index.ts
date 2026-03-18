// supabase/functions/daily-report/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function todayET(): string {
  const d = new Date();
  d.setHours(d.getHours() - 4);
  return d.toISOString().slice(0, 10);
}

function dayLabel(): string {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const d = new Date();
  d.setHours(d.getHours() - 4);
  const dow = d.getDay();
  const [, m, day] = d.toISOString().slice(0, 10).split("-");
  return `${days[dow]} ${parseInt(m)}/${parseInt(day)}`;
}

function computeStreak(
  data: Record<string, Record<string, number>>,
  goals: Record<string, number>
): number {
  const today = todayET();
  let streak = 0;
  const check = new Date(today + "T12:00:00Z");
  for (let i = 0; i < 365; i++) {
    const dk = check.toISOString().slice(0, 10);
    if (dk === today) { check.setDate(check.getDate() - 1); continue; }
    const isWeekend = [0, 6].includes(check.getDay());
    if (isWeekend) { check.setDate(check.getDate() - 1); continue; }
    const dayData = data[dk] || {};
    const hasActivity = Object.keys(goals).some(k => (dayData[k] || 0) > 0);
    if (!hasActivity) break;
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

async function sendEmail(to: string, subject: string, text: string, resendKey: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Cadence <report@getcadence.net>", to, subject, text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Email to ${to} failed:`, JSON.stringify(err));
    return false;
  }
  console.log(`Email to ${to} sent OK`);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey   = Deno.env.get("RESEND_API_KEY")!;
    if (!resendKey) return json({ error: "RESEND_API_KEY not set" }, 500);

    const sb    = createClient(supabaseUrl, serviceKey);
    const today = todayET();
    const label = dayLabel();

    const { data: recipientRows, error: recipientErr } = await sb
      .from("kv_store")
      .select("key, value")
      .like("key", "%::at-report-recipients");

    if (recipientErr) return json({ error: recipientErr.message }, 500);
    if (!recipientRows?.length) return json({ ok: true, message: "No report recipients configured" });

    const results: string[] = [];

    for (const row of recipientRows) {
      try {
        const orgId = row.key.replace("::at-report-recipients", "");
        const recipients: string[] = Array.isArray(row.value) ? row.value : [];
        if (!recipients.length) continue;

        console.log(`Processing: ${orgId}`);

        // Load users from at-users — works for both org- and solo- prefixes
        const { data: usersRow } = await sb
          .from("kv_store")
          .select("value")
          .eq("key", `${orgId}::at-users`)
          .maybeSingle();

        const users: Array<{ id: string; name: string }> = usersRow?.value || [];
        console.log(`Users found: ${users.length}`);

        if (!users.length) {
          console.log(`No users for ${orgId}, skipping`);
          continue;
        }

        const userLines: string[] = [];
        let maxGap = 0;
        let allHit = true;

        for (const user of users) {
          const dataKey  = `${orgId}::at-data-${user.id}`;
          const goalsKey = `${orgId}::at-goals-${user.id}`;
          console.log(`Querying goals: ${goalsKey}`);

          const { data: dataRow }  = await sb.from("kv_store").select("value").eq("key", dataKey).maybeSingle();
          const { data: goalsRow } = await sb.from("kv_store").select("value").eq("key", goalsKey).maybeSingle();

          console.log(`goalsRow raw: ${JSON.stringify(goalsRow)}`);

          const allData: Record<string, Record<string, number>> = (dataRow as any)?.value || {};
          const goals:   Record<string, number>                 = (goalsRow as any)?.value || {};
          const todayData: Record<string, number>               = allData[today] || {};

          console.log(`${user.name}: todayData=${JSON.stringify(todayData)}, goals=${JSON.stringify(goals)}`);

          const dialKeys = ["dials","calls","outbound","outreach","touches"];
          const dialKey  = dialKeys.find(k => goals[k] > 0) || Object.keys(goals).find(k => goals[k] > 0);
          if (!dialKey) { console.log(`No dial key for ${user.name}`); continue; }

          const logged = todayData[dialKey] || 0;
          const goal   = goals[dialKey]     || 0;
          const pct    = goal > 0 ? Math.round((logged / goal) * 100) : 0;
          const gap    = Math.max(0, goal - logged);
          if (gap > maxGap) maxGap = gap;
          if (pct < 100) allHit = false;

          const streak      = computeStreak(allData, goals);
          const streakPart  = streak > 0 ? ` 🔥${streak}d` : "";
          const connectKeys = ["connects","connect","conversations","interested"];
          const connectKey  = connectKeys.find(k => goals[k] > 0 || todayData[k] > 0);
          const connects    = connectKey ? (todayData[connectKey] || 0) : null;
          const connectPart = connects !== null ? ` · ${connects} connects` : "";
          const firstName   = user.name?.split(" ")[0] || "You";
          const goalPart    = goal > 0 ? `/${goal}` : "";
          const doneMark    = pct >= 100 ? " ✓" : "";

          userLines.push(`${firstName}: ${logged}${goalPart} ${dialKey}${connectPart}${streakPart}${doneMark}`);
        }

        if (!userLines.length) { console.log(`No lines for ${orgId}`); continue; }

        const subject = `Cadence · ${label}`;
        const footer  = allHit ? "Goals hit. Good work today." : `${maxGap} left in the tank. Finish strong.`;
        const body    = [...userLines, "", footer].join("\n");

        console.log(`Sending: ${subject}\n${body}`);

        let sent = 0;
        for (const recipient of recipients) {
          const ok = await sendEmail(recipient, subject, body, resendKey);
          if (ok) sent++;
        }
        results.push(`${orgId}: ${sent}/${recipients.length} sent`);

      } catch (err) {
        console.error(`org error:`, err);
        results.push(`Error: ${err.message}`);
      }
    }

    return json({ ok: true, today, results });

  } catch (err) {
    console.error("fatal:", err);
    return json({ error: err.message }, 500);
  }
});
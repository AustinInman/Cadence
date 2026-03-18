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

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  resendKey: string
): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Cadence <report@getcadence.net>",
      to,
      subject,
      text,
    }),
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

    // Find all entries with report recipients configured
    const { data: recipientRows, error: recipientErr } = await sb
      .from("kv_store")
      .select("key, value")
      .like("key", "%::at-report-recipients");

    if (recipientErr) {
      console.error("Failed to load recipients:", recipientErr);
      return json({ error: recipientErr.message }, 500);
    }

    if (!recipientRows?.length) {
      return json({ ok: true, message: "No report recipients configured" });
    }

    const results: string[] = [];

    for (const row of recipientRows) {
      try {
        const orgId = row.key.replace("::at-report-recipients", "");
        const recipients: string[] = Array.isArray(row.value) ? row.value : [];
        if (!recipients.length) continue;

        console.log(`Processing: ${orgId}, recipients: ${recipients.join(", ")}`);

        // Extract the userId from the key prefix — it's the last segment after "solo-user-" or "org-"
        // For solo-user-{userId}, userId IS the user we need data for
        // But the data keys use a DIFFERENT space prefix — find it by searching for keys containing this userId
        const soloMatch = orgId.match(/^solo-user-(.+)$/);
        const userId = soloMatch ? soloMatch[1] : null;

        if (!userId) {
          console.log(`Could not extract userId from ${orgId}, skipping`);
          continue;
        }

        // Find the actual space prefix that contains this user's data
        // e.g. solo-user-1772508916078::at-data-user-1771872117285
        const { data: dataKeyRows } = await sb
          .from("kv_store")
          .select("key")
          .like("key", `%::at-data-user-${userId}`)
          .order("key", { ascending: false })
          .limit(5);

        console.log(`Data keys for user ${userId}:`, dataKeyRows?.map(r => r.key));

        // Pick the most recent solo- prefixed space, or fall back to first result
        const dataKey = dataKeyRows?.find(r => r.key.startsWith("solo-"))?.key
          || dataKeyRows?.[0]?.key;

        if (!dataKey) {
          console.log(`No data key found for user ${userId}, skipping`);
          continue;
        }

        // Extract the actual space prefix from the data key
        const spacePrefix = dataKey.replace(`::at-data-user-${userId}`, "");
        console.log(`Using space prefix: ${spacePrefix} for user ${userId}`);

        // Load data and goals using the correct space prefix
        const [dataRow, goalsRow, usersRow] = await Promise.all([
          sb.from("kv_store").select("value").eq("key", `${spacePrefix}::at-data-user-${userId}`).maybeSingle(),
          sb.from("kv_store").select("value").eq("key", `${spacePrefix}::at-goals-user-${userId}`).maybeSingle(),
          sb.from("kv_store").select("value").eq("key", `${spacePrefix}::at-users`).maybeSingle(),
        ]);

        const allData: Record<string, Record<string, number>> = dataRow?.value || {};
        const goals:   Record<string, number>                 = goalsRow?.value || {};
        const todayData: Record<string, number>               = allData[today] || {};

        // Get user name from at-users if available
        const users: Array<{ id: string; name: string }> = usersRow?.value || [];
        const userRecord = users.find(u => u.id === userId);
        const userName = userRecord?.name || "You";
        const firstName = userName.split(" ")[0];

        console.log(`User ${firstName}: todayData=${JSON.stringify(todayData)}, goals=${JSON.stringify(goals)}`);

        const dialKeys = ["dials","calls","outbound","outreach","touches"];
        const dialKey  = dialKeys.find(k => goals[k] > 0) || Object.keys(goals).find(k => goals[k] > 0);

        if (!dialKey) {
          console.log(`No dial key found for ${firstName}, skipping`);
          continue;
        }

        const logged = todayData[dialKey] || 0;
        const goal   = goals[dialKey]     || 0;
        const pct    = goal > 0 ? Math.round((logged / goal) * 100) : 0;
        const gap    = Math.max(0, goal - logged);

        const streak     = computeStreak(allData, goals);
        const streakPart = streak > 0 ? ` 🔥${streak}d` : "";

        const connectKeys = ["connects","connect","conversations","interested"];
        const connectKey  = connectKeys.find(k => goals[k] > 0 || todayData[k] > 0);
        const connects    = connectKey ? (todayData[connectKey] || 0) : null;
        const connectPart = connects !== null ? ` · ${connects} connects` : "";

        const goalPart = goal > 0 ? `/${goal}` : "";
        const doneMark = pct >= 100 ? " ✓" : "";

        const userLine = `${firstName}: ${logged}${goalPart} ${dialKey}${connectPart}${streakPart}${doneMark}`;
        const footer   = pct >= 100
          ? "Goals hit. Good work today."
          : gap > 0
            ? `${gap} ${dialKey} left in the tank. Finish strong.`
            : "Keep going.";

        const subject = `Cadence · ${label}`;
        const body    = `${userLine}\n\n${footer}`;

        console.log(`Sending:\nSubject: ${subject}\n${body}`);

        let sent = 0;
        for (const recipient of recipients) {
          const ok = await sendEmail(recipient, subject, body, resendKey);
          if (ok) sent++;
        }

        results.push(`${orgId}: ${sent}/${recipients.length} sent`);

      } catch (err) {
        console.error(`[daily-report] org error:`, err);
        results.push(`Error: ${err.message}`);
      }
    }

    return json({ ok: true, today, results });

  } catch (err) {
    console.error("[daily-report] fatal:", err);
    return json({ error: err.message }, 500);
  }
});
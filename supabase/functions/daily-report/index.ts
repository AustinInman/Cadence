// supabase/functions/daily-report/index.ts
//
// Cadence Daily Report — sends daily activity summary via Resend email
//
// Cron: 0 21 * * 1-5  →  5pm EDT (21:00 UTC) Mon–Fri
//       fires at 6pm Nov–Mar when on EST — acceptable for a personal tool
//
// Required Supabase secret (you already have this set):
//   RESEND_API_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Per-org config in kv_store:
//   {orgId}::at-report-recipients  →  ["austin@inmangroup.net", "jake@example.com"]
//   {orgId}::at-goals-{userId}     →  { dials: 50, connects: 5, ... }
//   {orgId}::at-data-{userId}      →  { "2026-03-18": { dials: 34, connects: 4 }, ... }
//
// Email subject: "Cadence · Tue 3/18"
// Email body (plain text):
//   Austin: 34/50 dials · 4 connects 🔥3d
//   Jake: 28/50 dials · 2 connects
//
//   16 dials left in the tank. Finish strong.

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
  // ET = UTC-4 (EDT) or UTC-5 (EST). Use UTC-4 (EDT) as base.
  // Off by 1hr in winter — acceptable for a daily key.
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
      from: "Cadence <report@inmangroup.net>",
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Email to ${to} failed:`, err);
    return false;
  }
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

    // ── 1. Find all orgs with report recipients configured ───────────────────
    const { data: recipientRows } = await sb
      .from("kv_store")
      .select("key, value")
      .like("key", "%::at-report-recipients");

    if (!recipientRows?.length) {
      return json({ ok: true, message: "No report recipients configured" });
    }

    const results: string[] = [];

    for (const row of recipientRows) {
      try {
        const orgId = row.key.replace("::at-report-recipients", "");
        const recipients: string[] = Array.isArray(row.value) ? row.value : [];
        if (!recipients.length) continue;

        // ── 2. Load all users in this org ─────────────────────────────────
        const { data: usersRow } = await sb
          .from("kv_store")
          .select("value")
          .eq("key", `${orgId}::at-users`)
          .maybeSingle();
        const users: Array<{ id: string; name: string }> = usersRow?.value || [];
        if (!users.length) continue;

        // ── 3. Build a line per user ───────────────────────────────────────
        const userLines: string[] = [];
        let maxGap = 0;
        let allHit = true;

        for (const user of users) {
          const [dataRow, goalsRow] = await Promise.all([
            sb.from("kv_store").select("value").eq("key", `${orgId}::at-data-${user.id}`).maybeSingle(),
            sb.from("kv_store").select("value").eq("key", `${orgId}::at-goals-${user.id}`).maybeSingle(),
          ]);

          const allData: Record<string, Record<string, number>> = dataRow?.value || {};
          const goals:   Record<string, number>                 = goalsRow?.value || {};
          const todayData: Record<string, number>               = allData[today] || {};

          const dialKeys = ["dials","calls","outbound","outreach","touches"];
          const dialKey  = dialKeys.find(k => goals[k] > 0) || Object.keys(goals).find(k => goals[k] > 0);
          if (!dialKey) continue;

          const logged = todayData[dialKey] || 0;
          const goal   = goals[dialKey]     || 0;
          const pct    = goal > 0 ? Math.round((logged / goal) * 100) : 0;
          const gap    = Math.max(0, goal - logged);
          if (gap > maxGap) maxGap = gap;
          if (pct < 100) allHit = false;

          const streak     = computeStreak(allData, goals);
          const streakPart = streak > 0 ? ` 🔥${streak}d` : "";

          const connectKeys  = ["connects","connect","conversations","interested"];
          const connectKey   = connectKeys.find(k => goals[k] > 0 || todayData[k] > 0);
          const connects     = connectKey ? (todayData[connectKey] || 0) : null;
          const connectPart  = connects !== null ? ` · ${connects} connects` : "";

          const firstName = user.name?.split(" ")[0] || user.name || "User";
          const goalPart  = goal > 0 ? `/${goal}` : "";
          const doneMark  = pct >= 100 ? " ✓" : "";

          userLines.push(`${firstName}: ${logged}${goalPart} ${dialKey}${connectPart}${streakPart}${doneMark}`);
        }

        if (!userLines.length) continue;

        // ── 4. Build email ─────────────────────────────────────────────────
        const subject = `Cadence · ${label}`;
        const footer  = allHit
          ? "Goals hit. Good work today."
          : `${maxGap} dial${maxGap !== 1 ? "s" : ""} left in the tank. Finish strong.`;
        const body = [...userLines, "", footer].join("\n");

        // ── 5. Send to each recipient ──────────────────────────────────────
        let sent = 0;
        for (const recipient of recipients) {
          const ok = await sendEmail(recipient, subject, body, resendKey);
          if (ok) sent++;
        }

        results.push(`${orgId}: ${userLines.length} users → ${sent}/${recipients.length} sent`);
        console.log(`[daily-report] ${orgId}:\nSubject: ${subject}\n${body}`);

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

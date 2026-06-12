// ─────────────────────────────────────────────────────────────────────────────
// FocusSession.jsx — Call-list focus sessions for Cadence
//
// Flow: paste a list of companies → AI enriches each one for a freight
// brokerage cold call (web search via ai-proxy) → flashcard/dialer UI →
// every dial and outcome auto-logs to the tracker.
//
// Key behavior: "+1 Dial" tallies an attempt WITHOUT advancing the card.
// Outcome buttons close the card out and advance. Callbacks and disqualified
// companies persist in Supabase across sessions.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from "react";
import { callAI } from "./cadenceAI.js";
import { TA, TM, TS, TD, TP, BG1, BG2, BG3, BD1, BB1, F, haptic } from "./shared.js";

const sb = () => window._sb;

// ── Styles ────────────────────────────────────────────────────────────────────
const FS_CSS = `
@keyframes fsTick { 0% { transform: scale(1); } 35% { transform: scale(1.06); } 100% { transform: scale(1); } }
@keyframes fsShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes fsIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.fs-card { animation: fsIn 0.18s ease; }
.fs-skel {
  height: 12px; border-radius: 6px;
  background: linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 50%, var(--bg-2) 75%);
  background-size: 200% 100%; animation: fsShimmer 1.4s infinite linear;
}
.fs-dialbtn { transition: transform 0.08s ease, filter 0.12s ease; }
.fs-dialbtn:active { transform: scale(0.985); filter: brightness(1.1); }
.fs-dialbtn.ticking { animation: fsTick 0.22s ease; }
.fs-out { transition: background 0.1s ease, border-color 0.1s ease; }
.fs-out:hover { filter: brightness(1.18); }
@media (prefers-reduced-motion: reduce) {
  .fs-card, .fs-dialbtn.ticking, .fs-skel { animation: none; }
}
`;

// ── Enrichment ────────────────────────────────────────────────────────────────
const ENRICH_SYSTEM = `You are a freight brokerage sales intelligence engine. You research a company and produce a pre-call brief for a freight broker about to cold call them. Ideal prospects ship physical product, roughly $20M–$300M revenue — big enough to have consistent freight, small enough that a broker can reach decision makers.

Use web search to find real information. If you cannot verify something, say so in the field or use null — NEVER invent facts, phone numbers, or news.

Respond with ONLY a JSON object — no markdown fences, no preamble — in exactly this shape:
{
  "summary": "one line: what this company makes/does",
  "ships": "what physical products they likely ship, or null",
  "modes": ["FTL","LTL","Reefer","Flatbed","Drayage","Intermodal"],
  "size": "revenue/employee estimate with basis, or null",
  "locations": "HQ + plants/DCs and likely lanes, or null",
  "hook": "one specific, recent, verifiable detail to reference (expansion, new product, news) or null",
  "ask_for": "title(s) to ask for, e.g. Logistics Manager / Shipping Manager / Plant Manager",
  "opener": "a 1-2 sentence cold open tailored to THIS company — conversational, no fluff",
  "red_flags": "disqualify signals if any (private fleet, asset-based 3PL contract, too small, no freight) or null",
  "phone": "main line in (XXX) XXX-XXXX format if found on their site, or null",
  "confidence": "high|medium|low"
}`;

function parseEnrichmentJSON(resp) {
  try {
    const text = (resp?.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function enrichCompany(company) {
  const resp = await callAI({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: ENRICH_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Company: ${company.name}\nWebsite: ${company.website || "unknown — search for it"}\n\nResearch this company for a freight brokerage cold call and return the JSON brief.`,
      },
    ],
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    call_type: "focus_enrich",
  });
  return parseEnrichmentJSON(resp);
}

// ── List parsing ──────────────────────────────────────────────────────────────
// Accepts lines like:  "Acme Manufacturing, acmemfg.com"  /  "Acme\tacmemfg.com"
// "Acme Manufacturing"  /  "acmemfg.com" (website only → name derived)
function parseList(text) {
  const out = [];
  const seen = new Set();
  for (const raw of (text || "").split(/\n+/)) {
    const line = raw.trim().replace(/^[-*\d.)\s]+/, "");
    if (!line) continue;
    let name = "", website = "";
    const parts = line.split(/[,\t;|]+/).map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      if (!website && /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(p) && p.includes(".")) {
        website = p.replace(/^https?:\/\//i, "").replace(/\/$/, "");
      } else if (!name) {
        name = p;
      }
    }
    if (!name && website) name = website.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, website: website || null });
  }
  return out;
}

// ── Small UI atoms ────────────────────────────────────────────────────────────
const chip = (extra = {}) => ({
  display: "inline-flex", alignItems: "center", gap: "5px",
  padding: "3px 9px", borderRadius: "20px", fontSize: "0.7rem",
  fontWeight: 600, fontFamily: F, background: BG2, border: BB1, color: TS,
  ...extra,
});

function StatChip({ label, value, accent }) {
  return (
    <div style={{ textAlign: "center", minWidth: "52px" }}>
      <div style={{ fontSize: "1.05rem", fontWeight: 800, fontFamily: F, color: accent ? TA : TP, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: "0.6rem", fontWeight: 700, color: TD, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function BriefRow({ label, children }) {
  if (!children) return null;
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "baseline" }}>
      <div style={{ fontSize: "0.62rem", fontWeight: 800, color: TD, letterSpacing: "0.08em", textTransform: "uppercase", width: "76px", flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: "0.82rem", color: TS, lineHeight: 1.5, fontFamily: F }}>{children}</div>
    </div>
  );
}

// ── Outcome definitions ───────────────────────────────────────────────────────
const OUTCOMES = [
  { key: "no_answer",    label: "No Answer",    color: TD,        statKey: "no_answers" },
  { key: "voicemail",    label: "Left VM",      color: TD,        statKey: "voicemails" },
  { key: "gatekeeper",   label: "Gatekeeper",   color: "#C9A227", statKey: "gatekeepers" },
  { key: "conversation", label: "Conversation", color: "#4ACF86", statKey: "conversations" },
  { key: "meeting",      label: "Meeting Set",  color: "#4ACF86", statKey: "meetings" },
  { key: "callback",     label: "Callback",     color: "#C9A227", statKey: "callbacks" },
  { key: "disqualified", label: "Disqualify",   color: "#E0566B", statKey: "disqualified" },
];

const DQ_REASONS = ["Too small", "Private fleet", "Locked in contract", "No freight", "Bad fit", "Other"];

const CALLBACK_PRESETS = [
  { label: "In 1 hour",     hours: 1 },
  { label: "This afternoon", hours: 4 },
  { label: "Tomorrow AM",   tomorrowAt: 9 },
  { label: "Tomorrow PM",   tomorrowAt: 14 },
  { label: "Next week",     days: 7 },
];

function callbackTime(preset) {
  const d = new Date();
  if (preset.hours) d.setHours(d.getHours() + preset.hours);
  else if (preset.days) { d.setDate(d.getDate() + preset.days); d.setHours(9, 0, 0, 0); }
  else if (preset.tomorrowAt) { d.setDate(d.getDate() + 1); d.setHours(preset.tomorrowAt, 0, 0, 0); }
  return d.toISOString();
}

// ── Tracker integration ───────────────────────────────────────────────────────
// Uses the existing app listener for "cadence:focus-session-complete".
// `silent` suppresses the per-event toast (patched in ActivityTracker.jsx).
function logToTracker(detail) {
  window.dispatchEvent(new CustomEvent("cadence:focus-session-complete", { detail: { ...detail, silent: true } }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────────────────────────────────────
export default function FocusSessionView({ currentUser, onExit }) {
  const [authId, setAuthId] = useState(null);
  const [phase, setPhase] = useState("setup"); // setup | live | done

  // Setup state
  const [pasteText, setPasteText] = useState("");
  const [pending, setPending] = useState({ callbacks: [], leftovers: [] });
  const [includeCallbacks, setIncludeCallbacks] = useState(true);
  const [includeLeftovers, setIncludeLeftovers] = useState(false);
  const [dialGoal, setDialGoal] = useState("");
  const [starting, setStarting] = useState(false);
  const [setupErr, setSetupErr] = useState("");

  // Live state
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [stats, setStats] = useState({ dials: 0, no_answers: 0, voicemails: 0, gatekeepers: 0, conversations: 0, meetings: 0, callbacks: 0, disqualified: 0 });
  const [note, setNote] = useState("");
  const [picker, setPicker] = useState(null); // "callback" | "dq" | null
  const [ticking, setTicking] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [aiDown, setAiDown] = useState(false);

  // Done state
  const [debrief, setDebrief] = useState("");

  const inFlight = useRef(new Set());
  const failed = useRef(new Set());
  const listRef = useRef(list);
  useEffect(() => { listRef.current = list; }, [list]);

  // Inject CSS once
  useEffect(() => {
    const tag = document.createElement("style");
    tag.textContent = FS_CSS;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);

  // Auth + load pending work
  useEffect(() => {
    (async () => {
      try {
        const { data } = await sb().auth.getSession();
        const uid = data?.session?.user?.id;
        if (!uid) { setSetupErr("Sign in to use focus sessions."); return; }
        setAuthId(uid);
        const { data: rows, error } = await sb()
          .from("focus_companies")
          .select("*")
          .eq("user_id", uid)
          .in("status", ["new", "attempted", "callback"])
          .order("callback_at", { ascending: true, nullsFirst: false });
        if (error) {
          if ((error.message || "").includes("focus_companies")) {
            setSetupErr("Focus tables not found — run the migration SQL in Supabase first (supabase/migrations/20260612_focus_sessions.sql).");
          }
          return;
        }
        const callbacks = (rows || []).filter((r) => r.status === "callback");
        const leftovers = (rows || []).filter((r) => r.status !== "callback");
        setPending({ callbacks, leftovers });
        if (callbacks.length) setIncludeCallbacks(true);
      } catch (e) {
        console.error("focus setup load:", e);
      }
    })();
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (phase !== "live" || !startedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase, startedAt]);

  // Enrichment queue — keep current + next 2 enriched, max 2 concurrent
  useEffect(() => {
    if (phase !== "live") return;
    const want = [idx, idx + 1, idx + 2];
    for (const i of want) {
      const c = list[i];
      if (!c || c.enrichment || inFlight.current.has(c.id) || failed.current.has(c.id)) continue;
      if (inFlight.current.size >= 2) break;
      inFlight.current.add(c.id);
      enrichCompany(c)
        .then(async (brief) => {
          inFlight.current.delete(c.id);
          if (!brief) { failed.current.add(c.id); bump(); return; }
          setList((prev) => prev.map((x) => (x.id === c.id ? { ...x, enrichment: brief } : x)));
          await sb().from("focus_companies").update({ enrichment: brief, updated_at: new Date().toISOString() }).eq("id", c.id);
        })
        .catch((e) => {
          inFlight.current.delete(c.id);
          failed.current.add(c.id);
          if (e?.code === "USAGE_LIMIT") setAiDown(true);
          bump();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, list]);

  const [, setBumpN] = useState(0);
  const bump = () => setBumpN((n) => n + 1);

  // ── Start session ───────────────────────────────────────────────────────────
  async function startSession() {
    if (!authId) return;
    setStarting(true);
    setSetupErr("");
    try {
      const parsed = parseList(pasteText);
      const queue = [];
      if (includeCallbacks) queue.push(...pending.callbacks);
      if (includeLeftovers) queue.push(...pending.leftovers);

      let skippedDq = 0;
      if (parsed.length) {
        const names = parsed.map((p) => p.name.toLowerCase());
        const { data: existing } = await sb()
          .from("focus_companies")
          .select("id,name,status,website,enrichment,dials,notes,callback_at")
          .eq("user_id", authId)
          .filter("name", "in", `(${names.map((n) => `"${n.replace(/"/g, "")}"`).join(",")})`);
        const byName = new Map((existing || []).map((r) => [r.name.toLowerCase(), r]));
        const toInsert = [];
        for (const p of parsed) {
          const ex = byName.get(p.name.toLowerCase());
          if (ex) {
            if (ex.status === "disqualified") { skippedDq++; continue; }
            if (!queue.some((q) => q.id === ex.id)) queue.push(ex); // re-use record
            continue;
          }
          toInsert.push({ user_id: authId, name: p.name, website: p.website });
        }
        if (toInsert.length) {
          const { data: inserted, error } = await sb().from("focus_companies").insert(toInsert).select("*");
          if (error) throw error;
          queue.push(...(inserted || []));
        }
      }

      if (!queue.length) {
        setSetupErr(skippedDq ? `All ${skippedDq} pasted companies were previously disqualified — nothing to call.` : "Paste a list or include callbacks to start.");
        setStarting(false);
        return;
      }

      const { data: sess, error: sErr } = await sb()
        .from("focus_sessions")
        .insert({ user_id: authId, dial_goal: dialGoal ? parseInt(dialGoal, 10) : null })
        .select("id")
        .single();
      if (sErr) throw sErr;

      setSessionId(sess.id);
      setList(queue);
      setIdx(0);
      setNote(queue[0]?.notes || "");
      setStats({ dials: 0, no_answers: 0, voicemails: 0, gatekeepers: 0, conversations: 0, meetings: 0, callbacks: 0, disqualified: 0 });
      setStartedAt(Date.now());
      setPhase("live");
      if (skippedDq) console.info(`Skipped ${skippedDq} previously disqualified compan${skippedDq === 1 ? "y" : "ies"}.`);
    } catch (e) {
      console.error("startSession:", e);
      setSetupErr(e?.message?.includes("focus_") ? "Focus tables missing — run the migration SQL in Supabase first." : "Couldn't start the session — check your connection and try again.");
    }
    setStarting(false);
  }

  // ── Dial tally — logs an attempt, never advances ────────────────────────────
  async function tallyDial() {
    const c = list[idx];
    if (!c || !sessionId) return;
    haptic?.light?.();
    setTicking(true);
    setTimeout(() => setTicking(false), 240);
    setStats((s) => ({ ...s, dials: s.dials + 1 }));
    setList((prev) => prev.map((x) => (x.id === c.id ? { ...x, dials: (x.dials || 0) + 1 } : x)));
    logToTracker({ dials: 1 });
    // fire-and-forget persistence
    sb().from("focus_calls").insert({ user_id: authId, session_id: sessionId, company_id: c.id, outcome: "dial" }).then(() => {});
    sb().from("focus_companies").update({ dials: (c.dials || 0) + 1, updated_at: new Date().toISOString() }).eq("id", c.id).then(() => {});
  }

  // ── Outcomes — close the card, advance ──────────────────────────────────────
  async function recordOutcome(key, extra = {}) {
    const c = list[idx];
    if (!c || !sessionId) return;
    haptic?.light?.();
    setPicker(null);

    const def = OUTCOMES.find((o) => o.key === key);
    setStats((s) => ({ ...s, [def.statKey]: s[def.statKey] + 1 }));

    if (key === "conversation") logToTracker({ conversations: 1 });
    if (key === "meeting") logToTracker({ conversations: 1, advanced: 1 });

    const statusMap = {
      no_answer: "attempted", voicemail: "attempted", gatekeeper: "attempted",
      conversation: "done", meeting: "meeting",
      callback: "callback", disqualified: "disqualified",
    };
    const patch = {
      status: statusMap[key],
      last_outcome: key,
      notes: note || c.notes || null,
      updated_at: new Date().toISOString(),
      ...(key === "callback" ? { callback_at: extra.callback_at } : {}),
      ...(key === "disqualified" ? { dq_reason: extra.dq_reason } : {}),
    };
    sb().from("focus_companies").update(patch).eq("id", c.id).then(() => {});
    sb().from("focus_calls").insert({ user_id: authId, session_id: sessionId, company_id: c.id, outcome: key, note: note || null }).then(() => {});

    setList((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...patch } : x)));

    if (idx + 1 < list.length) {
      setIdx(idx + 1);
      setNote(list[idx + 1]?.notes || "");
    } else {
      endSession({ ...stats, [def.statKey]: stats[def.statKey] + 1 });
    }
  }

  // ── End session ─────────────────────────────────────────────────────────────
  async function endSession(finalStats = stats) {
    setPhase("done");
    if (sessionId) {
      sb().from("focus_sessions").update({ ended_at: new Date().toISOString(), ...finalStats }).eq("id", sessionId).then(() => {});
    }
    // Pacer debrief — non-blocking, plain failure is fine
    try {
      const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      const resp = await callAI({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 220,
        system: "You are Pacer, an AI sales coach for a freight broker. Voice: direct, warm, zero corporate fluff, no exclamation marks, no emojis. 2-3 sentences max. Acknowledge what the numbers actually show, then one specific thing for next session.",
        messages: [{
          role: "user",
          content: `Focus session done. ${mins} min. Dials: ${finalStats.dials}. No answers: ${finalStats.no_answers}. Voicemails: ${finalStats.voicemails}. Gatekeepers: ${finalStats.gatekeepers}. Conversations: ${finalStats.conversations}. Meetings set: ${finalStats.meetings}. Callbacks scheduled: ${finalStats.callbacks}. Disqualified: ${finalStats.disqualified}. ${dialGoal ? `Dial goal was ${dialGoal}.` : ""} Give me the debrief.`,
        }],
        call_type: "focus_debrief",
      });
      const text = (resp?.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
      if (text) setDebrief(text);
    } catch { /* debrief is a nice-to-have */ }
  }

  // ── Render helpers ──────────────────────────────────────────────────────────
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const wrap = { maxWidth: "720px", margin: "0 auto", padding: "4px 2px 80px", fontFamily: F };
  const h = (t) => <div style={{ fontSize: "0.62rem", fontWeight: 800, color: TD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>{t}</div>;
  const card = { background: BG1, border: BB1, borderRadius: "16px", padding: "18px" };
  const btnPrimary = { background: TA, color: "#000", border: "none", borderRadius: "12px", padding: "13px 18px", fontWeight: 800, fontSize: "0.9rem", fontFamily: F, cursor: "pointer" };
  const btnGhost = { background: BG2, color: TS, border: BB1, borderRadius: "12px", padding: "13px 18px", fontWeight: 700, fontSize: "0.85rem", fontFamily: F, cursor: "pointer" };

  // ════════════════════ SETUP ════════════════════
  if (phase === "setup") {
    const parsed = parseList(pasteText);
    const queueCount = parsed.length + (includeCallbacks ? pending.callbacks.length : 0) + (includeLeftovers ? pending.leftovers.length : 0);
    return (
      <div style={wrap}>
        <div style={{ marginBottom: "18px" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: TP }}>Focus Session</div>
          <div style={{ fontSize: "0.82rem", color: TM, marginTop: "3px", lineHeight: 1.5 }}>
            Drop a list. Cadence researches each company while you dial, and every call logs to your tracker automatically.
          </div>
        </div>

        {pending.callbacks.length > 0 && (
          <div style={{ ...card, marginBottom: "12px", borderColor: "rgba(201,162,39,0.35)" }}>
            {h(`Callbacks due — ${pending.callbacks.length}`)}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
              {pending.callbacks.slice(0, 5).map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <span style={{ color: TP, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ color: c.callback_at && new Date(c.callback_at) < new Date() ? "#C9A227" : TD, fontSize: "0.72rem" }}>
                    {c.callback_at ? new Date(c.callback_at).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "anytime"}
                  </span>
                </div>
              ))}
              {pending.callbacks.length > 5 && <div style={{ fontSize: "0.72rem", color: TD }}>+{pending.callbacks.length - 5} more</div>}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: TS, cursor: "pointer" }}>
              <input type="checkbox" checked={includeCallbacks} onChange={(e) => setIncludeCallbacks(e.target.checked)} />
              Put callbacks first in this session
            </label>
          </div>
        )}

        {pending.leftovers.length > 0 && (
          <div style={{ ...card, marginBottom: "12px" }}>
            {h(`Not yet worked — ${pending.leftovers.length}`)}
            <div style={{ fontSize: "0.78rem", color: TM, marginBottom: "10px" }}>Companies from earlier lists you haven't closed out.</div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: TS, cursor: "pointer" }}>
              <input type="checkbox" checked={includeLeftovers} onChange={(e) => setIncludeLeftovers(e.target.checked)} />
              Include them after new companies
            </label>
          </div>
        )}

        <div style={{ ...card, marginBottom: "12px" }}>
          {h("New companies")}
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"One per line — name, website helps accuracy:\n\nAcme Manufacturing, acmemfg.com\nPalmetto Steel Supply, palmettosteel.com\nLowcountry Beverage Co"}
            rows={7}
            style={{ width: "100%", boxSizing: "border-box", background: BG2, border: BB1, borderRadius: "10px", color: TP, fontFamily: F, fontSize: "0.84rem", padding: "12px", resize: "vertical", outline: "none", lineHeight: 1.6 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
            <span style={{ fontSize: "0.74rem", color: parsed.length ? TA : TD, fontWeight: 700 }}>
              {parsed.length ? `${parsed.length} compan${parsed.length === 1 ? "y" : "ies"} detected` : "Nothing detected yet"}
            </span>
            <input
              value={dialGoal}
              onChange={(e) => setDialGoal(e.target.value.replace(/\D/g, ""))}
              placeholder="Dial goal (optional)"
              inputMode="numeric"
              style={{ width: "140px", background: BG2, border: BB1, borderRadius: "8px", color: TP, fontFamily: F, fontSize: "0.78rem", padding: "8px 10px", outline: "none", textAlign: "center" }}
            />
          </div>
        </div>

        {setupErr && <div style={{ color: "#E0566B", fontSize: "0.8rem", marginBottom: "12px", fontWeight: 600 }}>{setupErr}</div>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ ...btnPrimary, flex: 1, opacity: queueCount && !starting ? 1 : 0.5 }} disabled={!queueCount || starting} onClick={startSession}>
            {starting ? "Setting up…" : `Start session${queueCount ? ` — ${queueCount} companies` : ""}`}
          </button>
          <button style={btnGhost} onClick={onExit}>Back</button>
        </div>
      </div>
    );
  }

  // ════════════════════ DONE ════════════════════
  if (phase === "done") {
    const scheduled = list.filter((c) => c.status === "callback");
    return (
      <div style={wrap}>
        <div style={{ textAlign: "center", margin: "18px 0 22px" }}>
          <div style={{ fontSize: "0.62rem", fontWeight: 800, color: TD, letterSpacing: "0.12em", textTransform: "uppercase" }}>Session complete</div>
          <div style={{ fontSize: "2.4rem", fontWeight: 800, color: TA, lineHeight: 1.1, marginTop: "6px" }}>{stats.dials}</div>
          <div style={{ fontSize: "0.74rem", color: TM, fontWeight: 600 }}>dials in {mm}:{ss}{dialGoal ? ` · goal ${dialGoal}` : ""}</div>
        </div>

        <div style={{ ...card, display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-around", marginBottom: "12px" }}>
          <StatChip label="Convos" value={stats.conversations} accent={stats.conversations > 0} />
          <StatChip label="Meetings" value={stats.meetings} accent={stats.meetings > 0} />
          <StatChip label="VMs" value={stats.voicemails} />
          <StatChip label="Gatekeepers" value={stats.gatekeepers} />
          <StatChip label="Callbacks" value={stats.callbacks} />
          <StatChip label="DQ'd" value={stats.disqualified} />
        </div>

        {debrief && (
          <div style={{ ...card, marginBottom: "12px", borderColor: "rgba(29,201,232,0.25)" }}>
            {h("Pacer")}
            <div style={{ fontSize: "0.86rem", color: TS, lineHeight: 1.6 }}>{debrief}</div>
          </div>
        )}

        {scheduled.length > 0 && (
          <div style={{ ...card, marginBottom: "12px" }}>
            {h(`Callbacks scheduled — ${scheduled.length}`)}
            {scheduled.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", padding: "4px 0" }}>
                <span style={{ color: TP, fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: TD, fontSize: "0.72rem" }}>{c.callback_at ? new Date(c.callback_at).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }) : ""}</span>
              </div>
            ))}
            <div style={{ fontSize: "0.7rem", color: TD, marginTop: "8px" }}>These will be waiting at the top of your next session.</div>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={() => { setPhase("setup"); setPasteText(""); setDebrief(""); setSessionId(null); setElapsed(0);
            // refresh pending lists
            sb().from("focus_companies").select("*").eq("user_id", authId).in("status", ["new", "attempted", "callback"]).order("callback_at", { ascending: true, nullsFirst: false })
              .then(({ data }) => setPending({ callbacks: (data || []).filter((r) => r.status === "callback"), leftovers: (data || []).filter((r) => r.status !== "callback") }));
          }}>New session</button>
          <button style={btnGhost} onClick={onExit}>Back to tracker</button>
        </div>
      </div>
    );
  }

  // ════════════════════ LIVE ════════════════════
  const c = list[idx];
  if (!c) return null;
  const e = c.enrichment;
  const researching = !e && !failed.current.has(c.id);
  const attempt = (c.dials || 0) + 1;
  const goalPct = dialGoal ? Math.min(100, Math.round((stats.dials / parseInt(dialGoal, 10)) * 100)) : null;

  return (
    <div style={wrap}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.62rem", fontWeight: 800, color: TA, letterSpacing: "0.12em", textTransform: "uppercase" }}>Focus</span>
          <span style={{ fontSize: "0.74rem", color: TD, fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</span>
        </div>
        <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
          <StatChip label="Dials" value={stats.dials} accent />
          <StatChip label="Convos" value={stats.conversations} />
          <StatChip label="Mtgs" value={stats.meetings} />
          <button onClick={() => endSession()} style={{ ...btnGhost, padding: "7px 12px", fontSize: "0.72rem" }}>End</button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: TD, fontWeight: 700, marginBottom: "4px" }}>
          <span>Company {idx + 1} of {list.length}</span>
          {goalPct !== null && <span style={{ color: goalPct >= 100 ? "#4ACF86" : TD }}>{stats.dials}/{dialGoal} dials</span>}
        </div>
        <div style={{ height: "3px", background: BG2, borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((idx) / list.length) * 100}%`, background: TA, borderRadius: "2px", transition: "width 0.2s ease" }} />
        </div>
      </div>

      {/* Card */}
      <div key={c.id} className="fs-card" style={{ ...card, marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: TP, lineHeight: 1.15 }}>{c.name}</div>
            <div style={{ display: "flex", gap: "6px", marginTop: "7px", flexWrap: "wrap" }}>
              {c.website && (
                <a href={`https://${c.website}`} target="_blank" rel="noreferrer" style={{ ...chip(), color: TA, textDecoration: "none" }}>{c.website}</a>
              )}
              {e?.phone && <span style={chip({ color: TP, fontWeight: 700 })}>📞 {e.phone}</span>}
              {e?.confidence && (
                <span style={chip({ color: e.confidence === "high" ? "#4ACF86" : e.confidence === "low" ? "#C9A227" : TS })}>
                  {e.confidence} confidence
                </span>
              )}
              {c.status === "callback" && <span style={chip({ color: "#C9A227" })}>callback</span>}
            </div>
          </div>
          <span style={chip({ background: "rgba(29,201,232,0.08)", border: "1px solid rgba(29,201,232,0.25)", color: TA, fontWeight: 800 })}>
            Attempt {attempt}
          </span>
        </div>

        {/* Brief */}
        {researching ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "6px 0 2px" }}>
            <div style={{ fontSize: "0.74rem", color: TA, fontWeight: 700 }}>Researching {c.name}… dial while you wait.</div>
            <div className="fs-skel" style={{ width: "85%" }} /><div className="fs-skel" style={{ width: "70%" }} /><div className="fs-skel" style={{ width: "78%" }} />
          </div>
        ) : e ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            <BriefRow label="Does">{e.summary}</BriefRow>
            <BriefRow label="Ships">{e.ships}</BriefRow>
            <BriefRow label="Modes">{Array.isArray(e.modes) && e.modes.length ? e.modes.join(" · ") : null}</BriefRow>
            <BriefRow label="Size">{e.size}</BriefRow>
            <BriefRow label="Where">{e.locations}</BriefRow>
            <BriefRow label="Ask for">{e.ask_for}</BriefRow>
            <BriefRow label="Hook">{e.hook}</BriefRow>
            {e.red_flags && (
              <BriefRow label="Flags"><span style={{ color: "#E0566B" }}>{e.red_flags}</span></BriefRow>
            )}
            {e.opener && (
              <div style={{ background: BG2, border: BB1, borderLeft: `3px solid ${TA}`, borderRadius: "8px", padding: "10px 12px", fontSize: "0.84rem", color: TP, lineHeight: 1.55, marginTop: "2px" }}>
                {e.opener}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: "0.78rem", color: TD }}>
            Research unavailable for this one — dial blind.{aiDown ? " (AI limit reached.)" : ""}{" "}
            <button onClick={() => { failed.current.delete(c.id); bump(); }} style={{ background: "none", border: "none", color: TA, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, padding: 0 }}>Retry</button>
          </div>
        )}

        {/* Notes */}
        <textarea
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          placeholder="Notes — saved when you close this card"
          rows={2}
          style={{ width: "100%", boxSizing: "border-box", background: BG2, border: BB1, borderRadius: "10px", color: TP, fontFamily: F, fontSize: "0.82rem", padding: "10px 12px", resize: "vertical", outline: "none", marginTop: "14px", lineHeight: 1.5 }}
        />
      </div>

      {/* +1 Dial — the tally. Never advances. */}
      <button
        onClick={tallyDial}
        className={`fs-dialbtn${ticking ? " ticking" : ""}`}
        style={{ width: "100%", background: TA, color: "#000", border: "none", borderRadius: "14px", padding: "18px", fontWeight: 800, fontSize: "1.05rem", fontFamily: F, cursor: "pointer", marginBottom: "10px", letterSpacing: "0.01em" }}
      >
        +1 Dial
        <span style={{ opacity: 0.55, fontWeight: 700, fontSize: "0.8rem", marginLeft: "10px" }}>
          {c.dials ? `${c.dials} on this company` : "tally an attempt — stays on this card"}
        </span>
      </button>

      {/* Outcomes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))", gap: "8px" }}>
        {OUTCOMES.map((o) => (
          <button
            key={o.key}
            className="fs-out"
            onClick={() => (o.key === "callback" ? setPicker("callback") : o.key === "disqualified" ? setPicker("dq") : recordOutcome(o.key))}
            style={{ background: BG1, border: `1px solid ${o.color === TD ? "var(--border-1)" : o.color + "55"}`, borderRadius: "10px", padding: "12px 6px", color: o.color === TD ? TS : o.color, fontWeight: 700, fontSize: "0.78rem", fontFamily: F, cursor: "pointer" }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: "0.66rem", color: TD, marginTop: "8px", textAlign: "center" }}>
        Outcomes close this card and move to the next. Dials only count when you tap +1 Dial.
      </div>

      {/* Callback picker */}
      {picker === "callback" && (
        <div style={{ ...card, marginTop: "10px", borderColor: "rgba(201,162,39,0.4)" }}>
          {h("Call back when?")}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {CALLBACK_PRESETS.map((p) => (
              <button key={p.label} onClick={() => recordOutcome("callback", { callback_at: callbackTime(p) })} style={{ ...btnGhost, padding: "9px 13px", fontSize: "0.78rem" }}>{p.label}</button>
            ))}
            <button onClick={() => setPicker(null)} style={{ ...btnGhost, padding: "9px 13px", fontSize: "0.78rem", color: TD }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Disqualify picker */}
      {picker === "dq" && (
        <div style={{ ...card, marginTop: "10px", borderColor: "rgba(224,86,107,0.4)" }}>
          {h("Why disqualify? (never shows up on a list again)")}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {DQ_REASONS.map((r) => (
              <button key={r} onClick={() => recordOutcome("disqualified", { dq_reason: r })} style={{ ...btnGhost, padding: "9px 13px", fontSize: "0.78rem", color: "#E0566B" }}>{r}</button>
            ))}
            <button onClick={() => setPicker(null)} style={{ ...btnGhost, padding: "9px 13px", fontSize: "0.78rem", color: TD }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
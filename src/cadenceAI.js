// ─────────────────────────────────────────────────────────────────────────────
// cadenceAI.js — Drop-in replacement for all direct Anthropic API calls
//
// HOW TO USE:
//   1. Add this file to your src/ folder
//   2. Import at the top of ActivityTracker.jsx, AppViews.jsx, shared.js:
//      import { callAI, getUsageStatus } from './cadenceAI.js';
//   3. Replace every `fetch("https://api.anthropic.com/v1/messages", ...)` with:
//      await callAI({ model, messages, max_tokens, call_type })
//   4. Remove VITE_ANTHROPIC_KEY from your .env — it's no longer needed on frontend
// ─────────────────────────────────────────────────────────────────────────────

// Derive proxy URL lazily — window._sb isn't set at module load time
function getProxyUrl() {
  // Try env var first (Vite projects)
  const envUrl = import.meta.env?.VITE_SUPABASE_URL;
  if (envUrl) return `${envUrl}/functions/v1/ai-proxy`;
  // Fall back to window._sb which is set at runtime in main.jsx
  try {
    const clientUrl = window._sb?.rest?.url || "";
    // rest.url is like "https://xxx.supabase.co/rest/v1" — strip to base
    const base = clientUrl.replace(/\/rest.*$/, "").replace(/\/graphql.*$/, "");
    if (base) return `${base}/functions/v1/ai-proxy`;
  } catch {}
  // Last resort: extract from Supabase CDN client stored URL
  try {
    const url = window._sb?.supabaseUrl || "";
    if (url) return `${url}/functions/v1/ai-proxy`;
  } catch {}
  return "";
}

// In-memory usage cache so we don't hammer the DB for every call
let _usageCache = null;
let _usageCacheTs = 0;
const CACHE_TTL = 60_000; // 1 minute

/**
 * Primary function — replaces every fetch("https://api.anthropic.com/...")
 *
 * @param {object} params
 * @param {string} params.model         - e.g. "claude-haiku-4-5-20251001"
 * @param {Array}  params.messages      - Anthropic messages array
 * @param {number} params.max_tokens    - max response tokens
 * @param {string} [params.system]      - optional system prompt
 * @param {string} [params.call_type]   - tag for analytics ("pacer_insight", "metric_gen", etc.)
 * @returns {Promise<object>}           - Anthropic response object (same shape as before)
 *
 * Throws { code: "USAGE_LIMIT", plan, credits_used, credits_limit } if at limit
 */
export async function callAI({ model, messages, max_tokens = 1000, system, call_type = "general", tools, tool_choice }) {
  // v2 loaded
  const PROXY_URL = getProxyUrl();
  if (!PROXY_URL) {
    throw new Error("AI proxy URL not configured — check VITE_SUPABASE_URL");
  }
  // Get Supabase auth JWT — required by edge function to identify user
  let token = null;
  try {
    const { data: sessionData } = await window._sb.auth.getSession();
    token = sessionData?.session?.access_token || null;
  } catch {}
  // If getSession() returns null, try refreshing the session
  if (!token) {
    try {
      const { data: refreshData } = await window._sb.auth.refreshSession();
      token = refreshData?.session?.access_token || null;
      console.log("[Pacer] session refreshed:", !!token);
    } catch {}
  }
  if (!token) {
    console.error("[Pacer] No auth session — user may need to sign in");
    throw new Error("Not authenticated — please sign in");
  }

  const body = { model, messages, max_tokens, system, call_type };
  if (tools) body.tools = tools;
  if (tool_choice) body.tool_choice = tool_choice;

  const resp = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  let data;
  try { data = await resp.json(); } catch { data = {}; }

  // Log the actual error for debugging
  if (!resp.ok) {
    console.error("[Pacer] proxy error", resp.status, JSON.stringify(data));
    console.error("[Pacer] PROXY_URL:", PROXY_URL);
    console.error("[Pacer] token type:", token?.startsWith("eyJ") ? "JWT (auth session)" : "anon key");
    console.error("[Pacer] token prefix:", token?.substring(0, 30) + "...");
  } else {
    console.log("[Pacer] proxy OK", resp.status, "model:", data?.model);
  }

  if (resp.status === 429 && data.error === "usage_limit_reached") {
    // Invalidate cache so the UI shows updated state immediately
    _usageCache = null;

    // Throw a structured error the UI can catch and handle gracefully
    const err = new Error("Monthly Pacer limit reached");
    err.code = "USAGE_LIMIT";
    err.plan = data.plan;
    err.credits_used = data.credits_used;
    err.credits_limit = data.credits_limit;
    err.upgrade_required = data.upgrade_required;
    throw err;
  }

  if (!resp.ok) {
    throw new Error(data.error?.message || `AI proxy error ${resp.status}`);
  }

  // Update usage cache with server's fresh count
  if (data._cadence_usage) {
    _usageCache = data._cadence_usage;
    _usageCacheTs = Date.now();
  }

  // Return same shape as Anthropic direct call — nothing in your app needs to change
  return data;
}

/**
 * Get current usage status for the UI.
 * Returns { credits_used, credits_limit, credits_remaining, plan, is_free, near_limit, at_limit }
 */
export async function getUsageStatus() {
  // Return cached value if fresh
  if (_usageCache && Date.now() - _usageCacheTs < CACHE_TTL) {
    return _enrichUsage(_usageCache);
  }

  try {
    const session = await window._sb.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) return null;

    // Fetch from DB directly using Supabase client
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [{ data: sub }, { data: usage }] = await Promise.all([
      window._sb.from("user_subscriptions").select("plan, plan_expires_at, credits_override").maybeSingle(),
      window._sb.from("ai_usage").select("credits_used").gte("created_at", monthStart),
    ]);

    // Respect expiry — if plan_expires_at is set and in the past, treat as free
    const rawPlan = sub?.plan || "free";
    const expiresAt = sub?.plan_expires_at ? new Date(sub.plan_expires_at) : null;
    const isExpired = expiresAt && expiresAt < now;
    const plan = isExpired ? "free" : rawPlan;
    const LIMITS = { free: 10, pro: 999999, team: 999999, godmode: 999999 };
    const credits_limit = sub?.credits_override ?? LIMITS[plan] ?? 50;
    const credits_used = (usage || []).reduce((s, r) => s + (r.credits_used || 0), 0);
    const credits_remaining = Math.max(0, credits_limit - credits_used);

    const result = { credits_used, credits_limit, credits_remaining, plan };
    _usageCache = result;
    _usageCacheTs = Date.now();
    return _enrichUsage(result);
  } catch {
    return null;
  }
}

function _enrichUsage(u) {
  return {
    ...u,
    is_free:  u.plan === "free",
    is_pro:   u.plan === "pro"   || u.plan === "team" || u.plan === "godmode" || u.plan === "elite",
    is_elite: u.plan === "elite" || u.plan === "godmode",
    near_limit: (u.plan === "free" && u.credits_remaining <= 2) || (u.plan === "pro" && u.credits_remaining <= 15),
    at_limit:   (u.plan === "free" && u.credits_remaining <= 0) || (u.plan === "pro" && u.credits_remaining <= 0),
    pct_used: u.credits_limit > 900000 ? 0 : Math.min(100, Math.round((u.credits_used / u.credits_limit) * 100)),
    is_elite_unlimited: u.plan === "elite" || u.plan === "godmode",
  };
}

/** 
 * Convenience: check if user can make AI calls before trying.
 * Returns true if they have credits remaining.
 */
export async function canUseAI() {
  const status = await getUsageStatus();
  if (!status) return false;
  return !status.at_limit;
}

/**
 * Invalidate the usage cache — call this after a successful upgrade
 */
export function invalidateUsageCache() {
  _usageCache = null;
  _usageCacheTs = 0;
}

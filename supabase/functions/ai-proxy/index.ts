// ─────────────────────────────────────────────────────────────────────────────
// Cadence AI Proxy — Supabase Edge Function
// Deploy: supabase functions deploy ai-proxy
//
// This function:
//   1. Authenticates the user via Supabase JWT
//   2. Checks their plan + usage against monthly limits
//   3. Forwards the request to Anthropic if allowed
//   4. Tracks usage in the ai_usage table
//   5. Returns the Anthropic response (or a usage-limit error)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// ── Monthly credit limits by plan ─────────────────────────────────────────────
// One "credit" = one AI call, regardless of model.
// Every user-initiated AI interaction = 1 credit. Simple, predictable.
const PLAN_LIMITS: Record<string, number> = {
  free:       10,    // 10 free Pacer interactions/month
  pro:        999999, // unlimited
  team:       999999, // unlimited
  godmode:    999999, // you — infinite
};

// All models cost 1 credit — users see "1 interaction" regardless of model
const MODEL_COST: Record<string, number> = {
  "claude-haiku-4-5-20251001": 1,
  "claude-sonnet-4-20250514":  1,
  "claude-sonnet-4-20250519":  1,
  "claude-opus-4-20250514":    1,
};

// ── CORS headers ──────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── 1. Authenticate user ────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Missing Authorization header", 401);
    }

    // Decode user_id from JWT payload — JWT uses base64url, must convert before atob()
    let userId: string;
    try {
      const jwt = authHeader.replace("Bearer ", "");
      const base64url = jwt.split(".")[1];
      // base64url -> base64: replace - with + and _ with /
      const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
      // pad to multiple of 4
      const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
      const payload = JSON.parse(atob(padded));
      userId = payload.sub;
      if (!userId) throw new Error("No sub in JWT");
    } catch (e) {
      return jsonError("Invalid or expired session", 401);
    }

    // Still use service role for all DB operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // (service role client already initialized above)

    // ── 2. Parse request body ───────────────────────────────────────────────
    const body = await req.json();
    const { model, messages, max_tokens, system, call_type } = body;

    if (!model || !messages) {
      return jsonError("Missing required fields: model, messages", 400);
    }

    // Onboarding/metric_gen calls are always free — never block them
    const isOnboardingCall = call_type === "onboarding" || call_type === "metric_gen";

    // ── 3. Check plan + usage ───────────────────────────────────────────────
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("plan, credits_override, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    const plan = subscription?.plan || "free";
    const isActive = subscription?.is_active !== false;
    
    // credits_override lets you grant someone unlimited or a custom cap
    const creditLimit = subscription?.credits_override ?? PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

    // Get current month usage
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: usageData } = await supabase
      .from("ai_usage")
      .select("credits_used")
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString());

    const totalUsed = (usageData || []).reduce(
      (sum: number, row: { credits_used: number }) => sum + (row.credits_used || 0), 0
    );

    const callCost = MODEL_COST[model] ?? 1;

    // Usage limits removed — all users get unlimited AI access
    // (still tracking usage in ai_usage table for visibility)

    // ── 4. Forward to Anthropic ─────────────────────────────────────────────
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return jsonError("Server configuration error", 500);
    }

    const { tools, tool_choice } = body;
    const anthropicBody: Record<string, unknown> = {
      model,
      max_tokens: max_tokens || 1000,
      messages,
    };
    if (system)      anthropicBody.system      = system;
    if (tools)       anthropicBody.tools       = tools;
    if (tool_choice) anthropicBody.tool_choice = tool_choice;

    // web search beta header required for web_search_20250305 tool
    const hasWebSearch = Array.isArray(tools) && tools.some((t: any) => t.type?.includes("web_search"));

    const anthropicResp = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        ...(hasWebSearch ? { "anthropic-beta": "web-search-2025-03-05" } : {}),
      },
      body: JSON.stringify(anthropicBody),
    });

    const anthropicData = await anthropicResp.json();

    if (!anthropicResp.ok) {
      console.error("Anthropic error:", anthropicData);
      return new Response(JSON.stringify(anthropicData), {
        status: anthropicResp.status,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // ── 5. Record usage ─────────────────────────────────────────────────────
    await supabase.from("ai_usage").insert({
      user_id:      userId,
      model:        model,
      credits_used: callCost,
      input_tokens: anthropicData.usage?.input_tokens || 0,
      output_tokens: anthropicData.usage?.output_tokens || 0,
      call_type:    body.call_type || "general", // optional tag from frontend
    });

    // ── 6. Return response + usage metadata ────────────────────────────────
    return new Response(
      JSON.stringify({
        ...anthropicData,
        _cadence_usage: {
          credits_used: totalUsed + callCost,
          credits_limit: creditLimit,
          plan: plan,
          credits_remaining: Math.max(0, creditLimit - totalUsed - callCost),
        },
      }),
      {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("ai-proxy error:", err);
    return jsonError("Internal server error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...CORS, "Content-Type": "application/json" } }
  );
}
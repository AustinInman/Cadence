import React, { useState, useEffect, useRef } from "react";
import LandingPage from "./LandingPage";
import ReactDOM from "react-dom/client";
import App from "./ActivityTracker";

window._ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
window._sb = window.supabase.createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const sb = window._sb;

// ── Shared styles ─────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
  * { box-sizing: border-box; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes checkIn {
    0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
    60%  { transform: scale(1.15) rotate(2deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }

  .auth-wrap {
    min-height: 100vh;
    background: #080C18;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', system-ui, sans-serif;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }
  .bg-orb {
    position: fixed; pointer-events: none; z-index: 0;
    width: 700px; height: 700px; border-radius: 50%;
    background: radial-gradient(circle, rgba(29,201,232,0.055) 0%, transparent 65%);
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
  }
  .bg-grid {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      linear-gradient(rgba(29,201,232,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(29,201,232,0.025) 1px, transparent 1px);
    background-size: 52px 52px;
    mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 100%);
  }
  .card {
    width: 100%; max-width: 360px;
    position: relative; z-index: 1;
    animation: fadeUp 0.45s ease both;
  }

  .r1 { animation: fadeUp 0.45s 0.05s ease both; opacity: 0; }
  .r2 { animation: fadeUp 0.45s 0.12s ease both; opacity: 0; }
  .r3 { animation: fadeUp 0.45s 0.19s ease both; opacity: 0; }
  .r4 { animation: fadeUp 0.45s 0.26s ease both; opacity: 0; }
  .r5 { animation: fadeUp 0.45s 0.33s ease both; opacity: 0; }
  .r6 { animation: fadeUp 0.45s 0.40s ease both; opacity: 0; }
  .r7 { animation: fadeUp 0.45s 0.47s ease both; opacity: 0; }

  .google-btn {
    width: 100%; background: #fff; color: #111; border: none;
    padding: 14px 20px; border-radius: 12px;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-weight: 700; font-size: 0.94rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
    letter-spacing: -0.01em;
  }
  .google-btn:hover { opacity: 0.93; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
  .google-btn:active { transform: translateY(0); box-shadow: none; }

  .field {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: #E8EDF8;
    padding: 13px 16px;
    border-radius: 12px;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 0.94rem;
    outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    letter-spacing: -0.01em;
    display: block;
  }
  .field::placeholder { color: rgba(255,255,255,0.18); }
  .field:focus {
    border-color: rgba(29,201,232,0.4);
    background: rgba(29,201,232,0.03);
    box-shadow: 0 0 0 3px rgba(29,201,232,0.08);
  }

  .primary-btn {
    width: 100%; background: #1DC9E8; color: #000; border: none;
    padding: 14px 20px; border-radius: 12px;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-weight: 800; font-size: 0.94rem; cursor: pointer;
    letter-spacing: -0.01em;
    transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .primary-btn:not(:disabled):hover {
    opacity: 0.9; transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(29,201,232,0.25);
  }
  .primary-btn:not(:disabled):active { transform: translateY(0); box-shadow: none; }
  .primary-btn:disabled { opacity: 0.3; cursor: default; }
  .primary-btn.loading {
    background: linear-gradient(90deg, #1DC9E8 0%, #7B6FD8 50%, #1DC9E8 100%);
    background-size: 200% auto;
    animation: shimmer 1.2s linear infinite;
    opacity: 1 !important;
  }

  .ghost-btn {
    background: none; border: none; cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 0.82rem; font-weight: 600;
    color: rgba(255,255,255,0.3);
    letter-spacing: -0.01em;
    transition: color 0.15s;
    padding: 0;
  }
  .ghost-btn:hover { color: rgba(255,255,255,0.6); }

  .accent-btn {
    background: none; border: none; cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 0.82rem; font-weight: 700;
    color: #1DC9E8;
    letter-spacing: -0.01em;
    transition: opacity 0.15s;
    padding: 0;
  }
  .accent-btn:hover { opacity: 0.75; }

  .err-box {
    font-size: 0.8rem; color: #F43F5E;
    padding: 9px 13px;
    background: rgba(244,63,94,0.07);
    border: 1px solid rgba(244,63,94,0.18);
    border-radius: 9px; line-height: 1.5;
    margin-bottom: 10px;
  }
  .ok-box {
    font-size: 0.8rem; color: #1DC9E8;
    padding: 9px 13px;
    background: rgba(29,201,232,0.07);
    border: 1px solid rgba(29,201,232,0.2);
    border-radius: 9px; line-height: 1.5;
    margin-bottom: 10px;
  }

  .tab-row {
    display: flex; background: rgba(255,255,255,0.04);
    border-radius: 10px; padding: 3px; gap: 3px; margin-bottom: 20px;
  }
  .tab {
    flex: 1; padding: 9px; border: none; border-radius: 8px; cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 0.86rem; font-weight: 700; letter-spacing: -0.01em;
    transition: all 0.15s;
  }
  .tab.active { background: #1DC9E8; color: #000; }
  .tab.inactive { background: none; color: rgba(255,255,255,0.3); }
  .tab.inactive:hover { color: rgba(255,255,255,0.6); }

  .pw-wrap { position: relative; }
  .pw-toggle {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: rgba(255,255,255,0.25); font-size: 0.82rem;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-weight: 600; transition: color 0.15s; padding: 0;
  }
  .pw-toggle:hover { color: rgba(255,255,255,0.5); }
`;

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);

const Logo = ({ onClick }) => (
  <div style={{ textAlign: "center", marginBottom: "40px", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
      <div style={{ position: "relative", width: "8px", height: "8px", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#1DC9E8", animation: "pulse-ring 2s ease-out infinite" }} />
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#1DC9E8", position: "relative" }} />
      </div>
      <span style={{ fontFamily: "'Syne', 'DM Sans', sans-serif", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.24em", color: "#fff", textTransform: "uppercase" }}>
        Cadence
      </span>
    </div>
    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.22)", letterSpacing: "0.01em", fontWeight: 500 }}>
      Do more, together.
    </div>
  </div>
);

const Divider = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "18px 0" }}>
    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
    <span style={{ fontSize: "0.67rem", color: "rgba(255,255,255,0.18)", fontWeight: 700, letterSpacing: "0.08em" }}>OR</span>
    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
  </div>
);

// ── Forgot password screen ────────────────────────────────────────────
function ForgotScreen({ onBack, onShowLanding }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [errMsg, setErrMsg] = useState("");
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSend(e) {
    e.preventDefault();
    if (!isValid || state === "sending") return;
    setState("sending");
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?reset=1`,
    });
    if (error) { setState("error"); setErrMsg(error.message); }
    else setState("sent");
  }

  return (
    <div style={{ animation: "fadeIn 0.25s ease both" }}>
      <Logo onClick={onShowLanding} />
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "1rem", fontWeight: "700", color: "#fff", letterSpacing: "-0.02em", marginBottom: "6px" }}>
          Reset your password
        </div>
        <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
          Enter your email and we'll send a reset link.
        </div>
      </div>

      {state === "sent" ? (
        <>
          <div className="ok-box">Reset link sent to <strong>{email}</strong> — check your inbox.</div>
          <button className="ghost-btn" onClick={onBack} style={{ marginTop: "8px" }}>← Back to sign in</button>
        </>
      ) : (
        <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {state === "error" && <div className="err-box">{errMsg}</div>}
          <input className="field" type="email" placeholder="your@email.com" value={email}
            onChange={e => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
            autoComplete="email" disabled={state === "sending"} />
          <button type="submit" className={`primary-btn${state === "sending" ? " loading" : ""}`} disabled={!isValid || state === "sending"}>
            {state === "sending" ? "Sending…" : "Send reset link →"}
          </button>
          <div style={{ textAlign: "center", paddingTop: "4px" }}>
            <button type="button" className="ghost-btn" onClick={onBack}>← Back to sign in</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Main auth screen ──────────────────────────────────────────────────
function AuthScreen({ onShowLanding, initialTab = "login" }) {
  const [tab, setTab] = useState(initialTab); // login | signup
  const [screen, setScreen] = useState("main"); // main | forgot
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const emailRef = useRef(null);

  useEffect(() => { setTimeout(() => emailRef.current?.focus(), 600); }, []);

  function reset() { setErrMsg(""); setSuccessMsg(""); }
  function switchTab(t) { setTab(t); reset(); setPw(""); setPw2(""); }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = isValidEmail && pw.length >= 1 && !loading;

  async function handleGoogle() {
    reset(); setLoading(true);
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setErrMsg(error.message); setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    reset();

    if (tab === "signup") {
      if (pw.length < 8) { setErrMsg("Password must be at least 8 characters."); return; }
      if (pw !== pw2) { setErrMsg("Passwords don't match."); return; }
    }

    setLoading(true);

    if (tab === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password: pw });
      setLoading(false);
      if (error) {
        if (error.message.toLowerCase().includes("invalid")) {
          setErrMsg("Wrong email or password. Try again, or reset your password below.");
        } else {
          setErrMsg(error.message);
        }
      }
      // success → AuthGate picks up session change automatically
    } else {
      // signup — create account, then auto sign-in (no email confirm needed if disabled in Supabase)
      const { error } = await sb.auth.signUp({ email, password: pw });
      setLoading(false);
      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          setErrMsg("An account with that email already exists. Try logging in instead.");
          switchTab("login");
        } else {
          setErrMsg(error.message);
        }
      } else {
        // Auto sign-in after signup
        const { error: signInErr } = await sb.auth.signInWithPassword({ email, password: pw });
        if (signInErr) setSuccessMsg("Account created — check your email to confirm, then log in.");
        // If sign-in succeeds, AuthGate handles redirect automatically
      }
    }
  }

  if (screen === "forgot") return (
    <div className="auth-wrap">
      <style>{CSS}</style>
      <div className="bg-orb" /><div className="bg-grid" />
      <div className="card"><ForgotScreen onBack={() => setScreen("main")} /></div>
    </div>
  );

  return (
    <div className="auth-wrap">
      <style>{CSS}</style>
      <div className="bg-orb" /><div className="bg-grid" />

      <div className="card">
        {/* Logo */}
        <div className="r1"><Logo onClick={onShowLanding} /></div>

        {/* Google */}
        <div className="r2">
          <button className="google-btn" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon /> Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="r3"><Divider /></div>

        {/* Login / Signup tabs */}
        <div className="r4">
          <div className="tab-row">
            <button className={`tab ${tab === "login" ? "active" : "inactive"}`} onClick={() => switchTab("login")}>Log in</button>
            <button className={`tab ${tab === "signup" ? "active" : "inactive"}`} onClick={() => switchTab("signup")}>Create account</button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {errMsg && <div className="err-box r5">{errMsg}</div>}
          {successMsg && <div className="ok-box r5">{successMsg}</div>}

          <div className="r5">
            <input ref={emailRef} className="field" type="email" placeholder="your@email.com"
              value={email} onChange={e => { setEmail(e.target.value); reset(); }}
              autoComplete="email" disabled={loading} />
          </div>

          <div className="r6 pw-wrap">
            <input className="field" type={showPw ? "text" : "password"}
              placeholder={tab === "signup" ? "Create a password (8+ chars)" : "Your password"}
              value={pw} onChange={e => { setPw(e.target.value); reset(); }}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              disabled={loading} style={{ paddingRight: "60px" }} />
            <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {tab === "signup" && (
            <div className="r6 pw-wrap">
              <input className="field" type={showPw ? "text" : "password"}
                placeholder="Confirm password"
                value={pw2} onChange={e => { setPw2(e.target.value); reset(); }}
                autoComplete="new-password" disabled={loading} style={{ paddingRight: "60px" }} />
            </div>
          )}

          <div className="r7">
            <button type="submit" className={`primary-btn${loading ? " loading" : ""}`} disabled={!canSubmit}>
              {loading ? "…" : tab === "login" ? "Log in →" : "Create account →"}
            </button>
          </div>
        </form>

        {/* Forgot password — only on login tab */}
        {tab === "login" && (
          <div className="r7" style={{ textAlign: "center", marginTop: "14px" }}>
            <button className="ghost-btn" onClick={() => { reset(); setScreen("forgot"); }}>
              Forgot your password?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AuthGate ──────────────────────────────────────────────────────────
function AuthGate() {
  const [session, setSession] = useState(undefined);
  const [upgradeFlash, setUpgradeFlash] = useState(false);
  // showLanding: true = landing page, false = auth screen
  const [showLanding, setShowLanding] = useState(true);
  const [authTab, setAuthTab] = useState("login"); // pre-select tab from landing CTA

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSession(s));

    // Detect return from Stripe checkout
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "1") {
      setUpgradeFlash(true);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setUpgradeFlash(false), 5000);
    }

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div style={{ minHeight: "100vh", background: "#080C18", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid rgba(29,201,232,0.15)", borderTop: "2px solid #1DC9E8", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!session && showLanding) return (
    <LandingPage
      onSignUp={() => { setAuthTab("signup"); setShowLanding(false); }}
      onLogin={() => { setAuthTab("login"); setShowLanding(false); }}
    />
  );

  if (!session) return <AuthScreen onShowLanding={() => setShowLanding(true)} initialTab={authTab} />;
  if (upgradeFlash) return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 99999, background: "#1DC9E8", color: "#000", textAlign: "center", padding: "14px", fontWeight: 800, fontSize: "0.95rem", fontFamily: "'DM Sans', sans-serif" }}>
        🎉 You're on Pro! Unlimited Pacer coaching is now unlocked.
      </div>
      <App authUser={session.user} />
    </>
  );
  return <App authUser={session.user} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<AuthGate />);

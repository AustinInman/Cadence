// LandingPage.jsx — Cadence
// Props: onSignUp, onLogin

import { useState, useEffect, useRef } from "react";

const C = {
  bg:      "#07090F",
  bg1:     "#0C1018",
  bg2:     "#111827",
  cyan:    "#1DC9E8",
  green:   "#4ACF86",
  text:    "#EEF2FF",
  muted:   "rgba(238,242,255,0.75)",
  dim:     "rgba(238,242,255,0.45)",
  faint:   "rgba(238,242,255,0.06)",
  border:  "rgba(255,255,255,0.08)",
  border2: "rgba(255,255,255,0.14)",
};
const SERIF = "'Instrument Serif', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

function useWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

function useInView(t = 0.08) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } }, { threshold: t });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, v];
}

function FadeUp({ children, delay = 0 }) {
  const [ref, v] = useInView();
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateY(28px)", transition: `opacity .65s ease ${delay}s, transform .65s ease ${delay}s` }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, filled = false, wide = false, style: sx = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseOver={() => setHov(true)}
      onMouseOut={() => setHov(false)}
      style={{
        border: filled ? "none" : `1px solid ${hov ? C.border2 : C.border}`,
        borderRadius: 12, padding: "14px 28px", fontSize: ".9rem", fontWeight: 800,
        cursor: "pointer", fontFamily: SANS, letterSpacing: "-0.01em",
        transition: "all .15s", width: wide ? "100%" : undefined,
        background: filled ? C.cyan : C.faint,
        color: filled ? "#000" : C.text,
        boxShadow: filled ? (hov ? `0 10px 36px ${C.cyan}50` : `0 2px 18px ${C.cyan}28`) : "none",
        transform: hov ? "translateY(-2px)" : "none",
        ...sx,
      }}>
      {children}
    </button>
  );
}

// ─── STAT COUNTER ───────────────────────────────────────────────────────────
function StatPill({ number, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ fontSize: "2.2rem", fontWeight: 900, color: C.text, fontFamily: SANS, letterSpacing: "-0.04em", lineHeight: 1 }}>{number}</div>
      <div style={{ fontSize: ".65rem", fontWeight: 700, color: C.dim, fontFamily: SANS, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

// ─── ARENA PREVIEW MOCKUP ────────────────────────────────────────────────────
function ArenaMockup({ mob }) {
  const outcomes = ["No Answer", "Left VM", "Busy", "Connected", "Not Interested"];
  const [active, setActive] = useState(null);
  const [flash, setFlash] = useState(false);

  const tap = (i) => {
    setActive(i);
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
  };

  return (
    <div style={{
      background: C.bg1,
      border: `1px solid ${C.border2}`,
      borderRadius: 20,
      overflow: "hidden",
      maxWidth: mob ? "100%" : 480,
      width: "100%",
      boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px ${C.border}`,
      fontFamily: SANS,
    }}>
      {/* Session header */}
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
          <span style={{ fontSize: ".72rem", fontWeight: 800, color: C.cyan, letterSpacing: ".08em", textTransform: "uppercase" }}>In the Arena</span>
        </div>
        <div style={{ fontSize: ".72rem", fontWeight: 900, color: C.text, fontFamily: "monospace" }}>47:23</div>
      </div>

      {/* Company card */}
      <div style={{ padding: "20px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: "1.05rem", fontWeight: 900, color: C.text, letterSpacing: "-0.02em", marginBottom: 3 }}>Midwest Steel Fabricators</div>
            <div style={{ fontSize: ".72rem", color: C.dim }}>Gary, IN · Manufacturing · Est. 1987</div>
          </div>
          <div style={{ fontSize: ".6rem", fontWeight: 800, color: C.cyan, background: `${C.cyan}12`, border: `1px solid ${C.cyan}25`, borderRadius: 6, padding: "3px 8px" }}>ICP 87</div>
        </div>

        {/* Pacer brief */}
        <div style={{ background: `${C.cyan}07`, border: `1px solid ${C.cyan}18`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: ".58rem", fontWeight: 800, color: C.cyan, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>⚡ Pacer Intel</div>
          <div style={{ fontSize: ".78rem", color: C.muted, lineHeight: 1.6 }}>
            Steel service center, likely <strong style={{ color: C.text }}>flatbed heavy</strong> — coil and sheet to auto plants in MI/OH. <strong style={{ color: C.text }}>40–60 loads/mo</strong> estimated. Broker-friendly: no fleet evidence, high volume. Q2 capacity crunch coming — <em style={{ color: C.cyan }}>lead with availability.</em>
          </div>
        </div>

        {/* Phone */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: ".88rem", fontWeight: 900, color: C.cyan, fontFamily: "monospace" }}>(219) 555-0142</div>
          <div style={{ fontSize: ".6rem", color: C.dim, background: C.faint, borderRadius: 4, padding: "2px 7px" }}>main line</div>
        </div>

        {/* Outcome buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5, marginBottom: 12 }}>
          {outcomes.map((o, i) => (
            <button key={i} onClick={() => tap(i)}
              style={{
                background: active === i ? `${C.cyan}18` : C.faint,
                border: `1px solid ${active === i ? C.cyan + "50" : C.border}`,
                borderRadius: 8, padding: "7px 4px",
                fontSize: ".58rem", fontWeight: 700, color: active === i ? C.cyan : C.dim,
                cursor: "pointer", fontFamily: SANS, transition: "all .15s",
                textAlign: "center", lineHeight: 1.3,
              }}>{o}</button>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          {[["23", "Dials"], ["4", "Connects"], ["2", "VMs"], ["1", "Moved Fwd"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: ".95rem", fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>{n}</div>
              <div style={{ fontSize: ".55rem", color: C.dim, fontFamily: SANS }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HOW IT WORKS STEPS ──────────────────────────────────────────────────────
function Step({ num, heading, body, delay }) {
  const [ref, v] = useInView();
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateY(24px)", transition: `opacity .6s ease ${delay}s, transform .6s ease ${delay}s`, display: "flex", gap: 24, alignItems: "flex-start" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: C.faint }}>
        <span style={{ fontSize: ".72rem", fontWeight: 900, color: C.cyan, fontFamily: SANS }}>{num}</span>
      </div>
      <div style={{ paddingTop: 8 }}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: C.text, fontFamily: SANS, letterSpacing: "-0.02em", marginBottom: 8 }}>{heading}</div>
        <div style={{ fontSize: ".88rem", color: C.muted, fontFamily: SANS, lineHeight: 1.7 }}>{body}</div>
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
function OverviewTab({ onSignUp, onLogin, mob, sm }) {
  return (
    <>
      {/* HERO */}
      <section style={{
        minHeight: mob ? "auto" : "100vh",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", textAlign: "center", position: "relative",
        overflow: "hidden", padding: mob ? "100px 20px 80px" : "140px 24px 100px",
      }}>
        {/* Glow */}
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: `radial-gradient(ellipse,${C.cyan}0c 0%,transparent 65%)`, pointerEvents: "none" }} />

        <div style={{ maxWidth: 780, position: "relative", animation: "fadeUp .7s ease both" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 800, color: C.cyan, letterSpacing: ".18em", textTransform: "uppercase", fontFamily: SANS, marginBottom: 22 }}>
            Built for freight brokers
          </div>

          <h1 style={{ fontSize: sm ? "2.2rem" : mob ? "2.9rem" : "4.6rem", fontWeight: 400, fontFamily: SERIF, lineHeight: 1.06, letterSpacing: "-0.025em", marginBottom: 24, color: C.text }}>
            Make more calls.<br />
            <em style={{ color: C.cyan }}>Close more freight.</em>
          </h1>

          <p style={{ fontSize: mob ? ".97rem" : "1.1rem", color: C.muted, lineHeight: 1.72, maxWidth: 520, margin: "0 auto 36px", fontFamily: SANS }}>
            Cadence is a sales execution tool that eliminates everything standing between you and 100+ high-quality dials a day. Freight intelligence. AI coaching. Zero friction.
          </p>

          {!mob && (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 14 }}>
              <Btn filled onClick={onSignUp} sx={{ fontSize: ".95rem", padding: "15px 36px" }}>Get early access</Btn>
              <Btn onClick={onLogin} sx={{ fontSize: ".95rem", padding: "15px 24px" }}>Log in →</Btn>
            </div>
          )}
          <p style={{ fontSize: ".66rem", color: C.dim, fontFamily: SANS }}>Built by a freight agent · For freight agents</p>
        </div>
      </section>

      {/* ARENA PREVIEW */}
      <section style={{ padding: `0 max(20px, calc((100vw - 1060px) / 2)) 100px` }}>
        <div style={{ display: "flex", flexDirection: mob ? "column" : "row", gap: mob ? 48 : 80, alignItems: "center", justifyContent: "space-between" }}>
          <FadeUp>
            <div style={{ maxWidth: 440 }}>
              <div style={{ fontSize: ".6rem", fontWeight: 800, color: C.dim, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: SANS, marginBottom: 16 }}>The Arena</div>
              <h2 style={{ fontSize: sm ? "1.8rem" : mob ? "2.2rem" : "2.8rem", fontWeight: 400, fontFamily: SERIF, letterSpacing: "-0.022em", lineHeight: 1.12, marginBottom: 18 }}>
                Your calling session,<br /><em style={{ color: C.cyan }}>fully loaded.</em>
              </h2>
              <p style={{ fontSize: ".93rem", color: C.muted, lineHeight: 1.72, fontFamily: SANS, marginBottom: 24 }}>
                Every card tells you what the company likely ships, how much, and what to say before you dial. Phone numbers surfaced automatically. Activity logged without touching a spreadsheet. Pacer watching your numbers in real time.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "AI freight brief on every company before you dial",
                  "Verified main business number surfaced automatically",
                  "Outcomes logged in one tap — no spreadsheet",
                  "Pacer coaching you through every session",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: C.cyan, fontSize: ".72rem", flexShrink: 0, marginTop: 3 }}>◆</span>
                    <span style={{ fontSize: ".88rem", color: C.muted, fontFamily: SANS, lineHeight: 1.55 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={.1}>
            <ArenaMockup mob={mob} />
          </FadeUp>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: `80px max(20px, calc((100vw - 860px) / 2))`, background: C.bg1, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <FadeUp>
          <div style={{ marginBottom: 60, textAlign: mob ? "center" : "left" }}>
            <div style={{ fontSize: ".6rem", fontWeight: 800, color: C.dim, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: SANS, marginBottom: 16 }}>How it works</div>
            <h2 style={{ fontSize: sm ? "1.8rem" : mob ? "2.2rem" : "2.9rem", fontWeight: 400, fontFamily: SERIF, letterSpacing: "-0.022em", lineHeight: 1.12 }}>
              From zero to dialing<br /><em style={{ color: C.cyan }}>in under a minute.</em>
            </h2>
          </div>
        </FadeUp>
        <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
          <Step num="01" delay={0}
            heading="Find your prospects"
            body="Tell Cadence what trailer type and region you're targeting. The lead generator queries freight shipping data, scores each company by estimated volume and broker-friendliness, and surfaces the main business number. One click to import into a session list." />
          <Step num="02" delay={.08}
            heading="Open a session"
            body="Launch The Arena. Every company card loads with a freight-specific brief — what they likely ship, estimated volume, inferred lanes, and the best opening line for where they are in your pipeline. No Googling mid-call." />
          <Step num="03" delay={.16}
            heading="Execute"
            body="Dial with one keystroke. Log outcomes in one tap. Notes captured instantly. Pacer tracking your pace and coaching you in real time. When a callback is due, it surfaces automatically in your next session — no manual scheduling." />
          <Step num="04" delay={.24}
            heading="Tomorrow's list builds itself"
            body="Session activity automatically queues follow-ups. No Answers come back in 2 days. VMs in 3. Nurture accounts surface when their carrier is most likely failing them. Your pipeline stays warm without you managing it." />
        </div>
      </section>

      {/* PACER SECTION */}
      <section style={{ padding: `100px max(20px, calc((100vw - 900px) / 2))` }}>
        <div style={{ display: "flex", flexDirection: mob ? "column" : "row", gap: mob ? 48 : 80, alignItems: "center" }}>
          <FadeUp delay={.05}>
            {/* Pacer chat mockup */}
            <div style={{ background: C.bg1, border: `1px solid ${C.border2}`, borderRadius: 20, padding: "24px", maxWidth: 420, width: "100%", boxShadow: `0 40px 100px rgba(0,0,0,0.5)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${C.cyan},#7B6FD8)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem" }}>⚡</div>
                <div>
                  <div style={{ fontSize: ".82rem", fontWeight: 800, color: C.text, fontFamily: SANS }}>Pacer</div>
                  <div style={{ fontSize: ".62rem", color: C.cyan, fontFamily: SANS }}>Freight Intelligence · Always on</div>
                </div>
              </div>
              {[
                { role: "assistant", text: "23 dials, 4 connects. Flatbed capacity starts tightening next month — your Midwest manufacturers are going to feel it. Good time to call the ones you haven't reached yet." },
                { role: "user", text: "Got one on the phone, they said they're happy with their carrier" },
                { role: "assistant", text: "Standard answer. Ask them when the last time their carrier missed a pickup was. Steel guys almost always have a story. That's your in." },
              ].map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: m.role === "user" ? "row-reverse" : "row", marginBottom: 12 }}>
                  {m.role === "assistant" && (
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: `linear-gradient(135deg,${C.cyan},#7B6FD8)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".6rem", flexShrink: 0 }}>⚡</div>
                  )}
                  <div style={{
                    background: m.role === "user" ? C.cyan : C.bg2,
                    border: m.role === "user" ? "none" : `1px solid ${C.border}`,
                    borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    padding: "10px 13px", maxWidth: "80%",
                    fontSize: ".78rem", color: m.role === "user" ? "#000" : C.muted,
                    lineHeight: 1.58, fontFamily: SANS, fontWeight: 500,
                  }}>{m.text}</div>
                </div>
              ))}
            </div>
          </FadeUp>
          <FadeUp>
            <div style={{ maxWidth: 420 }}>
              <div style={{ fontSize: ".6rem", fontWeight: 800, color: C.dim, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: SANS, marginBottom: 16 }}>Pacer AI</div>
              <h2 style={{ fontSize: sm ? "1.8rem" : mob ? "2.2rem" : "2.8rem", fontWeight: 400, fontFamily: SERIF, letterSpacing: "-0.022em", lineHeight: 1.12, marginBottom: 18 }}>
                A freight veteran<br /><em style={{ color: C.cyan }}>in your corner.</em>
              </h2>
              <p style={{ fontSize: ".93rem", color: C.muted, lineHeight: 1.72, fontFamily: SANS, marginBottom: 20 }}>
                Pacer knows the freight market. Seasonality, lane dynamics, shipper psychology, how to get past "we're happy with our carrier." It coaches you before, during, and after every session — and holds you accountable when no one else is watching.
              </p>
              <p style={{ fontSize: ".88rem", color: C.dim, lineHeight: 1.7, fontFamily: SANS }}>
                Updated daily with market conditions. Remembers your conversations. Gets sharper the more you use it.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ACCOUNTABILITY + STATS ROW */}
      <section style={{ padding: `80px max(20px, calc((100vw - 900px) / 2))`, background: C.bg1, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: sm ? "1.8rem" : mob ? "2.2rem" : "2.9rem", fontWeight: 400, fontFamily: SERIF, letterSpacing: "-0.022em", lineHeight: 1.12, marginBottom: 16 }}>
              The math is simple.<br /><em style={{ color: C.cyan }}>More calls, better calls, every day.</em>
            </h2>
            <p style={{ fontSize: ".93rem", color: C.muted, maxWidth: 480, margin: "0 auto", fontFamily: SANS, lineHeight: 1.7 }}>
              Freight is a volume and relationship game. Cadence handles the friction so you can focus on both.
            </p>
          </div>
        </FadeUp>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 24, maxWidth: 720, margin: "0 auto 60px" }}>
          {[
            ["100+", "Dials a day, friction-free"],
            ["0", "Spreadsheets to maintain"],
            ["< 1s", "Per lead, pre-call brief"],
            ["Auto", "Follow-up queues built"],
          ].map(([n, l], i) => (
            <FadeUp key={i} delay={i * .07}>
              <div style={{ textAlign: "center", padding: "24px 16px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16 }}>
                <div style={{ fontSize: "1.9rem", fontWeight: 900, color: C.cyan, fontFamily: SANS, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }}>{n}</div>
                <div style={{ fontSize: ".72rem", color: C.dim, fontFamily: SANS, lineHeight: 1.5 }}>{l}</div>
              </div>
            </FadeUp>
          ))}
        </div>
        <FadeUp delay={.2}>
          <div style={{ background: `${C.cyan}07`, border: `1px solid ${C.cyan}20`, borderRadius: 16, padding: "28px 32px", maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontSize: ".62rem", fontWeight: 800, color: C.cyan, letterSpacing: ".12em", textTransform: "uppercase", fontFamily: SANS, marginBottom: 10 }}>Works alongside your CRM</div>
            <p style={{ fontSize: ".9rem", color: C.muted, fontFamily: SANS, lineHeight: 1.7 }}>
              Already using HubSpot? Good. Cadence imports from it and exports back to it. It's the execution layer your CRM was never built to be — not a replacement for it.
            </p>
          </div>
        </FadeUp>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: `100px max(20px, calc((100vw - 700px) / 2))`, textAlign: "center", paddingBottom: mob ? 220 : 110 }}>
        <FadeUp>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, background: `radial-gradient(ellipse,${C.cyan}0d 0%,transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ fontSize: ".65rem", fontWeight: 800, color: C.cyan, letterSpacing: ".18em", textTransform: "uppercase", fontFamily: SANS, marginBottom: 20 }}>Ready to dial</div>
            <h2 style={{ fontSize: sm ? "2rem" : mob ? "2.5rem" : "3.4rem", fontWeight: 400, fontFamily: SERIF, letterSpacing: "-0.022em", lineHeight: 1.1, marginBottom: 20 }}>
              Stop managing your process.<br /><em style={{ color: C.cyan }}>Start building your book.</em>
            </h2>
            <p style={{ fontSize: ".93rem", color: C.muted, lineHeight: 1.7, fontFamily: SANS, marginBottom: 38, maxWidth: 440, margin: "0 auto 38px" }}>
              Built by a freight agent who needed this and couldn't find it. Now it exists.
            </p>
            {!mob && (
              <>
                <Btn filled onClick={onSignUp} sx={{ fontSize: ".95rem", padding: "15px 42px" }}>Get early access</Btn>
                <p style={{ marginTop: 14, fontSize: ".67rem", color: C.dim, fontFamily: SANS }}>Built for independent freight agents · Early access</p>
              </>
            )}
          </div>
        </FadeUp>
      </section>
    </>
  );
}

// ─── STORY TAB ───────────────────────────────────────────────────────────────
function StoryBeat({ b, i, mob }) {
  const [hov, setHov] = useState(false);
  return (
    <FadeUp delay={i * .05}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ display: "flex", gap: mob ? 20 : 44, borderBottom: `1px solid ${C.border}`, padding: mob ? "28px 0" : "38px 0", alignItems: "flex-start", transition: "all .18s", cursor: "default" }}>
        <div style={{ fontSize: ".6rem", fontWeight: 900, color: hov ? C.cyan : C.dim, fontFamily: SANS, letterSpacing: ".1em", flexShrink: 0, paddingTop: 4, minWidth: 28, transition: "color .18s" }}>{b.num}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: mob ? "1.02rem" : "1.15rem", fontWeight: 800, color: hov ? C.text : "rgba(238,242,255,0.88)", fontFamily: SANS, letterSpacing: "-0.02em", lineHeight: 1.28, marginBottom: 12, transition: "color .18s" }}>{b.heading}</div>
          <div style={{ fontSize: mob ? ".87rem" : ".94rem", color: hov ? C.muted : "rgba(238,242,255,0.5)", fontFamily: SANS, lineHeight: 1.76, transition: "color .18s" }}>{b.body}</div>
        </div>
      </div>
    </FadeUp>
  );
}

function StoryTab({ mob, sm }) {
  const beats = [
    {
      num: "01",
      heading: "Starting from zero is brutal.",
      body: "Building a freight book from scratch means cold calling strangers every day until enough of them trust you with a load. No shortcuts. No inherited accounts. Just a phone and the belief that if you can get enough of the right people on the line, you'll figure out the rest.",
    },
    {
      num: "02",
      heading: "The tooling problem hit immediately.",
      body: "Every tool I looked at was built for either a massive 3PL or a generic sales team. Nothing spoke freight. Nothing understood that the product changes price daily, that relationships are everything, that the difference between a good week and a bad one is just who picked up the phone.",
    },
    {
      num: "03",
      heading: "The real enemy wasn't competition. It was friction.",
      body: "Googling phone numbers mid-session. Logging activity in a spreadsheet after the call. Jumping to a browser tab to research a company before dialing. Small things, but they add up. Every piece of friction is a reason not to make the next call. And in freight, that next call is the whole game.",
    },
    {
      num: "04",
      heading: "So I built the thing I needed.",
      body: "Cadence started as an activity tracker I built for myself — just to stay consistent on the phones when no one was watching. Then it became a CRM. Then it became something with actual freight intelligence behind it. Each feature exists because I needed it to make more calls or close more freight.",
    },
    {
      num: "05",
      heading: "The Arena is the whole product.",
      body: "A focus session where every company card loads with freight-specific intelligence before you dial. What they likely ship. How much. What to say. The phone number already there. Activity logged automatically. Pacer watching your numbers and holding you accountable. That's the product. Everything else feeds it.",
    },
    {
      num: "06",
      heading: "Pacer is the accountability partner I didn't have.",
      body: "When you work alone, there's no sales floor, no manager, no peer pressure. It's easy for a slow morning to become a slow week. Pacer fills that gap — it knows the freight market, it knows your numbers, and it won't let you off the hook when you're coasting.",
    },
    {
      num: "07",
      heading: "Built for the agent, not the administrator.",
      body: "Every CRM was designed for the person buying it — the manager pulling reports, the VP reviewing pipeline. Cadence was designed for the person using it at 8am on a Tuesday, trying to make 80 calls before lunch. If a feature doesn't make that person's day easier, it doesn't ship.",
    },
  ];

  return (
    <section style={{ padding: `80px max(20px, calc((100vw - 760px) / 2))`, paddingBottom: mob ? 220 : 100 }}>
      <FadeUp>
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontSize: ".6rem", fontWeight: 800, color: C.dim, letterSpacing: ".14em", textTransform: "uppercase", fontFamily: SANS, marginBottom: 20 }}>Why it exists</div>
          <h2 style={{ fontSize: sm ? "2rem" : mob ? "2.5rem" : "3.3rem", fontWeight: 400, fontFamily: SERIF, letterSpacing: "-0.022em", lineHeight: 1.1, color: C.text }}>
            Built because the tool<br />
            <em style={{ color: C.cyan }}>didn't exist.</em>
          </h2>
        </div>
      </FadeUp>
      {beats.map((b, i) => <StoryBeat key={i} b={b} i={i} mob={mob} />)}
    </section>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "story",    label: "Our Story" },
];

export default function LandingPage({ onSignUp, onLogin }) {
  const [tab, setTab] = useState("overview");
  const [scrolled, setScrolled] = useState(false);
  const w = useWidth();
  const mob = w < 768;
  const sm = w < 480;
  const PAD = `0 max(20px, calc((100vw - 1160px) / 2))`;

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const handleTab = (t) => { setTab(t); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: SANS, overflowX: "hidden", minHeight: "100vh" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        ::selection{background:${C.cyan}28;color:${C.text};}
        @keyframes fadeUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:none}}
        .nl{background:none;border:none;color:${C.muted};font-size:.86rem;font-weight:600;cursor:pointer;font-family:${SANS};padding:7px 13px;transition:color .15s;border-radius:8px;}
        .nl:hover{color:${C.text};}
        .nl.act{color:${C.text};font-weight:800;}
        @media(max-width:768px){.dnl{display:none!important;}.dsk-ctas{display:none!important;}.mob-bar{display:flex!important;}}
        @media(min-width:769px){.mob-bar{display:none!important;}}
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 300, height: 60,
        background: scrolled ? "rgba(7,9,15,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
        transition: "all .3s", display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: PAD,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/cadence-logo.webp" alt="Cadence" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
          <span style={{ fontSize: ".98rem", fontWeight: 900, color: C.text, fontFamily: SANS, letterSpacing: "-0.03em" }}>Cadence</span>
        </div>

        {/* Desktop tabs */}
        <div className="dnl" style={{ display: "flex", gap: 2, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          {TABS.map(t => (
            <button key={t.id} className={`nl${tab === t.id ? " act" : ""}`} onClick={() => handleTab(t.id)}
              style={{ position: "relative" }}>
              {t.label}
              {tab === t.id && <div style={{ position: "absolute", bottom: -2, left: "20%", right: "20%", height: 2, background: C.cyan, borderRadius: 99 }} />}
            </button>
          ))}
        </div>

        <div className="dsk-ctas" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="nl" onClick={onLogin}>Log in</button>
          <Btn filled onClick={onSignUp} sx={{ padding: "9px 20px", fontSize: ".84rem", borderRadius: 10 }}>Get early access</Btn>
        </div>

        <div className="mob-bar" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="nl" onClick={onLogin} style={{ fontSize: ".82rem", padding: "6px 10px" }}>Log in</button>
        </div>
      </nav>

      {/* MOBILE BOTTOM BAR */}
      <div className="mob-bar" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
        background: "rgba(7,9,15,0.97)", backdropFilter: "blur(24px)",
        borderTop: `1px solid ${C.border}`, flexDirection: "column", gap: 8,
        padding: "12px 20px", paddingBottom: "max(14px, env(safe-area-inset-bottom))",
      }}>
        <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => handleTab(t.id)}
              style={{ background: tab === t.id ? C.cyan : C.faint, color: tab === t.id ? "#000" : C.muted, border: "none", borderRadius: 8, padding: "6px 14px", fontSize: ".72rem", fontWeight: 700, cursor: "pointer", fontFamily: SANS, transition: "all .15s" }}>
              {t.label}
            </button>
          ))}
        </div>
        <Btn filled onClick={onSignUp} wide sx={{ padding: "14px", fontSize: ".95rem" }}>Get early access</Btn>
      </div>

      {/* CONTENT */}
      <div style={{ paddingTop: 60 }}>
        {tab === "overview" && <OverviewTab onSignUp={onSignUp} onLogin={onLogin} mob={mob} sm={sm} />}
        {tab === "story"    && <StoryTab    mob={mob} sm={sm} />}
      </div>

      {/* FOOTER */}
      <footer style={{
        borderTop: `1px solid ${C.border}`, padding: `26px max(20px, calc((100vw - 1160px) / 2))`,
        paddingBottom: mob ? "max(26px, env(safe-area-inset-bottom))" : 26,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <img src="/cadence-logo.webp" alt="Cadence" style={{ width: 20, height: 20, objectFit: "contain" }} />
          <span style={{ fontSize: ".82rem", fontWeight: 800, color: C.muted, fontFamily: SANS, letterSpacing: "-0.02em" }}>Cadence</span>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {["Privacy Policy", "Terms of Service", "Contact"].map(l => (
            <button key={l} style={{ background: "none", border: "none", color: C.dim, fontSize: ".72rem", cursor: "pointer", fontFamily: SANS, transition: "color .15s" }}
              onMouseOver={e => e.currentTarget.style.color = C.muted}
              onMouseOut={e => e.currentTarget.style.color = C.dim}>{l}</button>
          ))}
        </div>
        <p style={{ fontSize: ".66rem", color: C.dim, fontFamily: SANS }}>© 2026 Cadence · Built for freight agents.</p>
      </footer>
    </div>
  );
}

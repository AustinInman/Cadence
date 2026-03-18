import { callAI } from './cadenceAI.js';
import React,{useState,useEffect,useRef,useCallback,useMemo} from 'react';
import {AKEY,BB1,BB18,BB1A30,BB1A3A,BB2A10,BB2A28,BBA,BD1,BDIR,BG0,BG1,BG2,BG3,BP,BR,CADENCE_LOGO,DEFAULT_INDUSTRIES,F,METRIC_COLORS,MONTH_NAMES,SHORT_MONTHS,TA,TD,TM,TP,TS,TX,addCommunityMember,addJoinRequest,allDaysInMonth,computeGoalPct,computeStreak,consumeInvite,copyText,createCommunity,createInviteToken,createOrganization,dayName,formatDate,formatShort,genId,getDow,getInviteTokenFromURL,getInviteURL,getNs,getPresenceStatus,initialsColor,isOnline,isWeekend,lastWeekendSat,loadAccountabilityPairs,loadAdmins,loadChallenges,loadCommunityMembers,loadGlobalSuperAdmin,loadIndustryConfig,loadInvite,loadMvpVotes,loadOrgMeta,loadPendingRequests,loadPins,loadSpaceIndex,loadSpaceMeta,loadStreakFreezes,getProtectedDates,canLogPTO,canLogSick,loadSuperAdmin,loadTeams,loadUserData,loadUserMemberships,loadUsers,loadWeeklyRecap,loadWeeklyReflection,migrateSoloToOrg,monthKey,ns,nsKey,loadFeed,saveFeed,postFeedItem,pushNotification,registerUserGlobally,removeCommunityMember,removeJoinRequest,s,saveAdmins,saveChallenges,saveGlobalSuperAdmin,saveIndustryConfig,saveMvpVotes,saveOrgMeta,savePins,saveSpaceMeta,saveSuperAdmin,saveTeams,saveUserData,saveUserMemberships,saveWeeklyRecap,saveWeeklyReflection,setNs,soloNs,storageGet,storageSet,todayStr,updateCommunityMemberIndustry,useFlash,weekKey,loadOrgRoles,saveOrgRoles,loadCommunityRoles,saveCommunityRoles,loadOrgTeams,saveOrgTeams,loadMemberAssignments,setMemberAssignment,defaultOrgRoles,defaultCommunityRoles,ROLE_PERMISSIONS,canPerform,getTeamSubtree,approveOrg,rejectOrg,loadPendingOrgs,loadDeniedRequests,saveDeniedRequest,clearDeniedRequest,deleteFeedItem,loadAllReflections,loadJournalSettings,loadNotifications,loadPersonalMessages,loadPersonalMuted,loadPersonalThreads,loadPresence,loadSpaceAdmins,saveNotifications,savePersonalMessages,savePersonalMuted,savePersonalThreads,saveStreakFreezes,updateFeedItem,writePresence,haptic,notifNewDM,loadUnlockedMilestones} from './shared.js';

// ── Presence display constants ────────────────────────────────────────────────
const PRESENCE_COLORS = { online: "#4ACF86", away: "#F59E0B", offline: "#666" };
const PRESENCE_LABELS = { online: "Online", away: "Away", offline: "Offline" };

function relTimeStatic(ts) {
 const diff = Date.now() - ts;
 if (diff < 60000) return "just now";
 if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
 if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
 return `${Math.floor(diff/86400000)}d ago`;
}

export function OnboardingScreen({ pendingInviteToken, onStartSolo, onCreateOrg, onJoinOrg, onLogin, onLoadSpaceUsers, onRequestJoin, onSignOut }) {
 const [screen, setScreen] = useState(pendingInviteToken ? "join" : null);

 // ── Profile form state ─────────────────────────────────────────────────
 const [firstName, setFirstName] = useState("");
 const [firstNameConfirmed, setFirstNameConfirmed] = useState(false);
 const [lastName, setLastName] = useState("");
 const [lastNameConfirmed, setLastNameConfirmed] = useState(false);
 const [industry, setIndustry] = useState("");
 const [industryConfirmed, setIndustryConfirmed] = useState(false);
 const [pin, setPin] = useState("");
 const [customName, setCustomName] = useState("");
 const [customDesc, setCustomDesc] = useState("");

 // ── Space creation / invite state ─────────────────────────────────────
 const [spaceName, setSpaceName] = useState("");
 const [spaceDesc, setSpaceDesc] = useState("");
 const [loading, setLoading] = useState(false);
 const [generating, setGenerating] = useState(false);
 const [genError, setGenError] = useState("");
 const [inviteToken, setInviteToken] = useState(pendingInviteToken || "");
 const [inviteInfo, setInviteInfo] = useState(null);
 const [inviteErr, setInviteErr] = useState("");
 const [customCfg, setCustomCfg] = useState(null);
 const [customIndKey, setCustomIndKey] = useState("");

 // ── Returning user state ───────────────────────────────────────────────
 const [retTab, setRetTab] = useState("name");
 const [retNameQ, setRetNameQ] = useState("");
 const [retNameResults, setRetNameResults] = useState([]);
 const [retNameSearching, setRetNameSearching] = useState(false);
 const [retSpaceQ, setRetSpaceQ] = useState("");
 const [retSpaceResults, setRetSpaceResults] = useState([]);
 const [retSpaceSearching, setRetSpaceSearching] = useState(false);
 const [retSpaceId, setRetSpaceId] = useState(null);
 const [retSpaceUsers, setRetSpaceUsers] = useState([]);
 const [retSpaceUserQ, setRetSpaceUserQ] = useState("");
 const [retErr, setRetErr] = useState("");

 // ── Find-space state ───────────────────────────────────────────────────
 const [findQ, setFindQ] = useState("");
 const [findResults, setFindResults] = useState([]);
 const [findSearching, setFindSearching] = useState(false);
 const [requestSent, setRequestSent] = useState({});

 const name = (firstName.trim() + " " + lastName.trim()).trim();
 const canSubmit = firstName.trim().length >= 2 && lastName.trim().length >= 2;

 // ── Progress dots ──────────────────────────────────────────────────────
 const SCREEN_STEP = { null: 0, profile: 1, spacepick: 2, join: 3, returning: null };
 const TOTAL_STEPS = 3;
 const currentStep = SCREEN_STEP[screen] ?? null;

 const ProgressBar = () => {
  if (screen === null || screen === "returning" || currentStep === null) return null;
  const labels = ["", "Profile", "Role", "Done"];
  return (
   <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "28px", padding: "0 4px" }}>
    {[1,2,3].map(n => (
     <React.Fragment key={n}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
       <div style={{
        width: "28px", height: "28px", borderRadius: "50%",
        background: n < currentStep ? "var(--accent)" : n === currentStep ? "rgba(29,201,232,0.15)" : "var(--bg-2)",
        border: n <= currentStep ? "2px solid var(--accent)" : "2px solid var(--border-1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.72rem", fontWeight: "800", fontFamily: F,
        color: n < currentStep ? "#000" : n === currentStep ? "var(--accent)" : "var(--text-dim)",
        transition: "all 0.2s",
       }}>
        {n < currentStep ? "✓" : n}
       </div>
       <div style={{ fontSize: "0.58rem", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: n === currentStep ? "var(--accent)" : "var(--text-dim)", fontFamily: F }}>
        {labels[n]}
       </div>
      </div>
      {n < 3 && <div style={{ flex: 1, height: "2px", background: n < currentStep ? "var(--accent)" : "var(--border-1)", marginBottom: "18px", transition: "background 0.3s" }} />}
     </React.Fragment>
    ))}
   </div>
  );
 };

 // ── Shared helpers ─────────────────────────────────────────────────────
 const sInput = { ...s.inpBase, padding: "12px 16px", borderRadius: "12px", fontSize: "1rem", fontFamily: F, width: "100%", boxSizing: "border-box", outline: "none", letterSpacing: "-0.01em" };

 const BtnBack = ({ onClick }) => (
  <button onClick={onClick} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem", padding: "0 0 4px", fontFamily: F, display: "flex", alignItems: "center", gap: "5px", WebkitTapHighlightColor: "transparent", letterSpacing: "-0.01em" }}>← Back</button>
 );

 const UserCard = ({ u, spaceEntry, onClick, actionLabel = "→" }) => (
  <button onClick={onClick}
   style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "12px", border: `1px solid var(--border-1)`, background: "var(--bg-1)", cursor: "pointer", fontFamily: F, textAlign: "left", width: "100%", minHeight: "44px", WebkitTapHighlightColor: "transparent" }}>
   <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: initialsColor(u.name, u.avatarColor), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: "bold", color: "#fff", flexShrink: 0 }}>{u.name.charAt(0).toUpperCase()}</div>
   <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "0.95rem", letterSpacing: "-0.01em" }}>{u.name}</div>
    {spaceEntry && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
     {DEFAULT_INDUSTRIES[u.industry]?.icon || "◆"} {DEFAULT_INDUSTRIES[u.industry]?.label || u.industry}
     <span style={{ color: "var(--text-dim)", marginLeft: "6px" }}>· {spaceEntry.name}</span>
    </div>}
    {!spaceEntry && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
     {DEFAULT_INDUSTRIES[u.industry]?.icon || "◆"} {DEFAULT_INDUSTRIES[u.industry]?.label || u.industry}
    </div>}
   </div>
   <span style={{ color: "var(--text-dim)", flexShrink: 0 }}>{actionLabel}</span>
  </button>
 );

 // ── Invite watcher ─────────────────────────────────────────────────────
 useEffect(() => {
  if (!inviteToken.trim()) { setInviteInfo(null); setInviteErr(""); return; }
  const t = setTimeout(async () => {
   const inv = await loadInvite(inviteToken.trim());
   if (inv) { setInviteInfo(inv); setInviteErr(""); }
   else { setInviteInfo(null); setInviteErr("Invite not found or expired."); }
  }, 400);
  return () => clearTimeout(t);
 }, [inviteToken]);

 useEffect(() => {
  if (pendingInviteToken) { setScreen("join"); setInviteToken(pendingInviteToken); }
 }, [pendingInviteToken]);

 // ── Returning: search by name ──────────────────────────────────────────
 useEffect(() => {
  if (retTab !== "name") return;
  if (!retNameQ.trim() || retNameQ.trim().length < 2) { setRetNameResults([]); return; }
  setRetNameSearching(true);
  const t = setTimeout(async () => {
   try {
    const idx = await loadSpaceIndex();
    const lower = retNameQ.trim().toLowerCase();
    const matches = [];
    await Promise.all(idx.map(async (spaceEntry) => {
     try {
      const users = await onLoadSpaceUsers(spaceEntry.id);
      if (!users) return;
      users.forEach(u => { if (u.name.toLowerCase().includes(lower)) matches.push({ user: u, space: spaceEntry }); });
     } catch {}
    }));
    setRetNameResults(matches.slice(0, 12));
   } catch { setRetNameResults([]); }
   setRetNameSearching(false);
  }, 500);
  return () => { clearTimeout(t); setRetNameSearching(false); };
 }, [retNameQ, retTab]);

 async function searchBySpace(q) {
  setRetSpaceQ(q);
  if (!q.trim() || q.trim().length < 2) { setRetSpaceResults([]); return; }
  setRetSpaceSearching(true);
  try {
   const idx = await loadSpaceIndex();
   const lower = q.trim().toLowerCase();
   setRetSpaceResults(idx.filter(e => e.name.toLowerCase().includes(lower) || e.id.toLowerCase() === lower).slice(0, 8));
  } catch { setRetSpaceResults([]); }
  setRetSpaceSearching(false);
 }

 async function pickReturnSpace(spaceEntry) {
  setRetSpaceId(spaceEntry.id); setRetErr(""); setRetSpaceUsers([]);
  try {
   const lu = await onLoadSpaceUsers(spaceEntry.id);
   if (!lu || lu.length === 0) { setRetErr("No profiles found in this space."); return; }
   setRetSpaceUsers(lu);
  } catch { setRetErr("Could not load space. Try again."); }
 }

 // ── Find-space search ──────────────────────────────────────────────────
 useEffect(() => {
  if (screen !== "findspace") return;
  if (!findQ.trim() || findQ.trim().length < 2) { setFindResults([]); return; }
  setFindSearching(true);
  const t = setTimeout(async () => {
   try {
    const idx = await loadSpaceIndex();
    const lower = findQ.trim().toLowerCase();
    setFindResults(idx.filter(e => e.name.toLowerCase().includes(lower)).slice(0, 8));
   } catch { setFindResults([]); }
   setFindSearching(false);
  }, 400);
  return () => { clearTimeout(t); setFindSearching(false); };
 }, [findQ, screen]);

 async function sendJoinRequest(spaceEntry) {
  if (!canSubmit) return;
  try {
   await onRequestJoin(spaceEntry.id, name);
   setRequestSent(p => ({ ...p, [spaceEntry.id]: true }));
  } catch {}
 }

 // ── Submit ─────────────────────────────────────────────────────────────
 async function submit() {
  if (!canSubmit) return;
  setLoading(true);
  const path = screen === "join" ? "join" : "solo";
  const useCfg = customCfg && customIndKey;
  try {
   if (path === "solo") {
    if (useCfg) await onStartSolo(name, customIndKey, null, "", "", customCfg, customIndKey);
    else await onStartSolo(name, industry || "freight", null);
   } else if (path === "join") {
    if (!inviteInfo) { setLoading(false); return; }
    if (useCfg) await onJoinOrg(inviteToken.trim(), name, customIndKey, null, customCfg, customIndKey);
    else await onJoinOrg(inviteToken.trim(), name, industry || "freight", null);
   }
  } catch (e) { console.error(e); }
  setLoading(false);
 }

 // ── Wrap ───────────────────────────────────────────────────────────────
 const wrap = (children) => (
  <div style={{ position: "fixed", inset: 0, background: "var(--bg-0)", zIndex: 9999, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 20px 80px" }}>
   <style>{`
    @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .onb-chip-btn:hover { opacity: 0.82; }
    .onb-tap-btn:hover { opacity: 0.88; transform: translateY(-1px); }
   `}</style>
   <div style={{ maxWidth: "min(480px,100%)", width: "100%" }}>
    {/* Logo */}
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "36px" }}>
     <img src={CADENCE_LOGO} alt="Cadence" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
     <div style={{ fontSize: "0.82rem", fontWeight: "900", letterSpacing: "0.16em", color: TA, fontFamily: F, textTransform: "uppercase" }}>Cadence</div>
    </div>
    {children}
   </div>
  </div>
 );

 // ── LANDING SCREEN ─────────────────────────────────────────────────────
 if (!screen) {
  // Invite landing
  if (pendingInviteToken && inviteInfo) {
   const isOrg = inviteInfo.spaceType === "org" || inviteInfo.crewType === "managed";
   const sName = inviteInfo.spaceName || "your crew";
   const inviterName = inviteInfo.createdByName || null;
   const accentCol = isOrg ? TA : "#7B6FD8";
   const accentBg = isOrg ? "rgba(29,201,232,0.08)" : "rgba(123,111,216,0.08)";
   const accentBorder = isOrg ? "rgba(29,201,232,0.28)" : "rgba(123,111,216,0.28)";
   return wrap(<>
    <div style={{ background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: "16px", padding: "20px", marginBottom: "24px", animation: "fadeSlideUp 0.3s ease" }}>
     <div style={{ fontSize: "0.6rem", fontWeight: "800", color: accentCol, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>
      {isOrg ? "You've been invited to join a managed crew" : "You've been invited to a crew"}
     </div>
     <div style={{ fontSize: "1.4rem", fontWeight: "900", color: TP, fontFamily: F, marginBottom: "4px", letterSpacing: "-0.02em" }}>
      {isOrg ? "🏢" : "⚡"} {sName}
     </div>
     {inviterName && <div style={{ fontSize: "0.8rem", color: TM }}>Invited by {inviterName}</div>}
    </div>
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "24px" }}>
     <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#1DC9E8,#7B6FD8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>⚡</div>
     <div style={{ background: BG1, border: `1px solid ${BD1}`, borderRadius: "14px 14px 14px 4px", padding: "13px 16px", flex: 1 }}>
      <div style={{ fontSize: "0.6rem", fontWeight: "800", color: TA, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Pacer</div>
      <div style={{ fontSize: "0.92rem", color: TP, fontFamily: F, lineHeight: 1.6, letterSpacing: "-0.01em" }}>
       {isOrg ? "Your team is already in here tracking their numbers. I'll watch yours too — and let you know how you're stacking up." : "This crew holds each other accountable. I'm Pacer — I'll track your activity, flag patterns, and keep you consistent."}
       <div style={{ marginTop: "6px", fontSize: "0.82rem", color: TM }}>60 seconds to set up.</div>
      </div>
     </div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
     <button className="onb-tap-btn"
      style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentCol, padding: "14px 20px", borderRadius: "14px", cursor: "pointer", fontFamily: F, fontSize: "0.95rem", fontWeight: "800", textAlign: "left", WebkitTapHighlightColor: "transparent", transition: "all 0.15s", letterSpacing: "-0.01em" }}
      onClick={() => { haptic.light(); setScreen("profile"); }}>
      Join {sName} →
     </button>
     <button onClick={() => { haptic.light(); setScreen("returning"); }}
      style={{ background: "none", border: "none", color: TM, padding: "10px 4px", cursor: "pointer", fontFamily: F, fontSize: "0.82rem", textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
      Already have an account? Sign in
     </button>
    </div>
   </>);
  }

  // Standard landing
  return wrap(<>
   <div style={{ animation: "fadeSlideUp 0.4s ease" }}>
    <div style={{ marginBottom: "40px" }}>
     <h1 style={{ fontSize: "clamp(1.7rem, 6vw, 2.2rem)", fontWeight: "400", letterSpacing: "-0.03em", color: TP, fontFamily: "'Instrument Serif', Georgia, serif", lineHeight: 1.1, marginBottom: "10px" }}>
      Your CRM.<br /><em style={{ color: TA }}>Your Pacer.</em>
     </h1>
     <p style={{ fontSize: "0.9rem", color: TM, lineHeight: 1.65, letterSpacing: "-0.01em", maxWidth: "320px" }}>
      Full pipeline, activity tracking, AI coaching, focus sessions — free forever. Pacer is your AI layer on top.
     </p>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
     <button className="onb-tap-btn"
      onClick={() => { haptic.light(); setScreen("profile"); }}
      style={{ background: TA, color: "#000", border: "none", padding: "16px 20px", borderRadius: "14px", cursor: "pointer", fontFamily: F, fontSize: "1rem", fontWeight: "900", textAlign: "left", WebkitTapHighlightColor: "transparent", transition: "all 0.15s", letterSpacing: "-0.01em", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>Create free account</span>
      <span style={{ opacity: 0.7 }}>→</span>
     </button>
     <button className="onb-tap-btn"
      onClick={() => { haptic.light(); setScreen("returning"); }}
      style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", color: TP, padding: "16px 20px", borderRadius: "14px", cursor: "pointer", fontFamily: F, fontSize: "1rem", fontWeight: "700", textAlign: "left", WebkitTapHighlightColor: "transparent", transition: "all 0.15s", letterSpacing: "-0.01em", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>Sign in</span>
      <span style={{ opacity: 0.4 }}>→</span>
     </button>
    </div>

    <div style={{ borderTop: "1px solid var(--border-1)", paddingTop: "20px" }}>
     <div style={{ fontSize: "0.65rem", fontWeight: "800", color: TM, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>What's free, forever</div>
     <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {["Full CRM — pipeline, contacts, activity", "Focus sessions + session history", "Cadences, tasks, global search", "Analytics, data export, all integrations"].map((item, i) => (
       <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: "#4ACF86", fontSize: "0.7rem", flexShrink: 0 }}>✓</span>
        <span style={{ fontSize: "0.78rem", color: TM, letterSpacing: "-0.01em" }}>{item}</span>
       </div>
      ))}
     </div>
     <div style={{ marginTop: "12px", padding: "10px 12px", background: "rgba(29,201,232,0.05)", border: "1px solid rgba(29,201,232,0.15)", borderRadius: "10px" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: "800", color: TA, letterSpacing: "0.04em", marginBottom: "3px" }}>⚡ Pacer AI — $49/mo or free</div>
      <div style={{ fontSize: "0.72rem", color: TM, lineHeight: 1.5 }}>Free users get 10 AI credits to try it. Pro unlocks unlimited coaching, list building, ICP scoring, and live intel.</div>
     </div>
    </div>
    <p style={{ fontSize: "0.65rem", color: TD, marginTop: "18px", textAlign: "center" }}>No credit card · No trial · No expiry</p>
   </div>
  </>);
 }

 // ── RETURNING USER ─────────────────────────────────────────────────────
 if (screen === "returning") {
  return wrap(<>
   <BtnBack onClick={() => setScreen(null)} />
   <div style={{ marginBottom: "24px", marginTop: "8px" }}>
    <div style={{ fontSize: "1.2rem", fontWeight: "800", color: TP, letterSpacing: "-0.02em", fontFamily: F }}>Welcome back</div>
    <div style={{ fontSize: "0.82rem", color: TM, marginTop: "4px" }}>Find your profile to sign in</div>
   </div>
   <div style={{ display: "flex", gap: "4px", marginBottom: "18px", background: "var(--bg-2)", borderRadius: "10px", padding: "3px" }}>
    {[["name", "Search by name"], ["space", "Search by space"]].map(([tab, lbl]) => (
     <button key={tab} onClick={() => setRetTab(tab)}
      style={{ flex: 1, background: retTab === tab ? "var(--bg-4)" : "none", border: "none", borderRadius: "8px", padding: "8px 10px", fontSize: "0.78rem", fontWeight: retTab === tab ? "800" : "600", color: retTab === tab ? TP : TM, cursor: "pointer", fontFamily: F, transition: "all 0.15s" }}>
      {lbl}
     </button>
    ))}
   </div>
   {retTab === "name" && (<>
    <input style={sInput} placeholder="Search by name…" value={retNameQ} onChange={e => setRetNameQ(e.target.value)} autoFocus />
    {retNameSearching && <div style={{ fontSize: "0.82rem", color: TM, fontStyle: "italic", marginTop: "8px" }}>Searching…</div>}
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
     {retNameResults.map(({ user: u, space }, i) => (
      <UserCard key={i} u={u} spaceEntry={space} onClick={() => onLogin(space.id, u.id)} />
     ))}
    </div>
   </>)}
   {retTab === "space" && (<>
    <input style={sInput} placeholder="Search by space name…" value={retSpaceQ} onChange={e => searchBySpace(e.target.value)} autoFocus />
    {retSpaceSearching && <div style={{ fontSize: "0.82rem", color: TM, fontStyle: "italic", marginTop: "8px" }}>Searching…</div>}
    {!retSpaceId && (<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
     {retSpaceResults.map(r => (
      <button key={r.id} onClick={() => pickReturnSpace(r)}
       style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "12px", padding: "12px 16px", cursor: "pointer", fontFamily: F, textAlign: "left", color: TP, fontSize: "0.9rem", fontWeight: "600", WebkitTapHighlightColor: "transparent" }}>
       {r.name}
      </button>
     ))}
    </div>)}
    {retSpaceId && (<>
     <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", marginBottom: "10px" }}>
      <button onClick={() => { setRetSpaceId(null); setRetSpaceUsers([]); setRetSpaceUserQ(""); }}
       style={{ background: "none", border: "none", color: TM, cursor: "pointer", fontSize: "0.82rem", fontFamily: F }}>← Back</button>
     </div>
     {retErr && <div style={{ fontSize: "0.82rem", color: "#E05577", marginBottom: "8px" }}>{retErr}</div>}
     {retSpaceUsers.length > 3 && (<input style={sInput} placeholder="Search by name…" value={retSpaceUserQ} onChange={e => setRetSpaceUserQ(e.target.value)} autoFocus />)}
     <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
      {retSpaceUsers.filter(u => !retSpaceUserQ || u.name.toLowerCase().includes(retSpaceUserQ.toLowerCase())).map(u => (
       <UserCard key={u.id} u={u} onClick={() => onLogin(retSpaceId, u.id)} />
      ))}
     </div>
    </>)}
   </>)}
  </>);
 }

 // ── PROFILE SCREEN — conversational, CRM-focused ───────────────────────
 if (screen === "profile") {
  // Memoized PacerMsg — won't re-animate on parent re-render
  const PacerMsg = React.memo(({ children, sub, id }) => (
   <div key={id} style={{ display: "flex", gap: "10px", alignItems: "flex-start", animation: "fadeSlideUp 0.3s ease" }}>
    <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#1DC9E8,#7B6FD8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>⚡</div>
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "16px 16px 16px 4px", padding: "12px 16px", flex: 1 }}>
     <div style={{ fontSize: "0.6rem", fontWeight: "800", color: TA, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "5px" }}>Pacer</div>
     {sub && <div style={{ fontSize: "0.72rem", color: TM, marginBottom: "6px" }}>{sub}</div>}
     <div style={{ fontSize: "0.9rem", color: TP, fontFamily: F, lineHeight: 1.6, letterSpacing: "-0.01em" }}>{children}</div>
    </div>
   </div>
  ));

  const AnswerChip = ({ label, onEdit }) => (
   <div style={{ paddingLeft: "44px" }}>
    <button className="onb-chip-btn" onClick={onEdit}
     style={{ background: "rgba(29,201,232,0.08)", border: "1px solid rgba(29,201,232,0.22)", borderRadius: "22px", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", fontWeight: "700", color: TA, fontFamily: F, cursor: "pointer", transition: "opacity 0.15s", letterSpacing: "-0.01em" }}>
     {label} <span style={{ fontSize: "0.7rem", opacity: 0.55, fontWeight: "500" }}>✎ edit</span>
    </button>
   </div>
  );

  const TapBtn = ({ label, sub, color, border, bg, onClick }) => (
   <button className="onb-tap-btn" onClick={onClick}
    style={{ width: "100%", textAlign: "left", background: bg || "rgba(29,201,232,0.06)", border: border || "1px solid rgba(29,201,232,0.2)", borderRadius: "14px", padding: "14px 16px", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent", transition: "all 0.15s", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div>
     <div style={{ fontSize: "0.92rem", fontWeight: "800", color: color || TA, letterSpacing: "-0.02em" }}>{label}</div>
     {sub && <div style={{ fontSize: "0.76rem", color: TM, marginTop: "3px", letterSpacing: "-0.01em" }}>{sub}</div>}
    </div>
    <span style={{ color: color || TA, opacity: 0.5, fontSize: "0.9rem" }}>→</span>
   </button>
  );

  // CRM-focused industry options (simplified — the industry picker is used after this)
  const ROLE_OPTIONS = [
   { key: "freight",    label: "Freight / Logistics",   sub: "Brokerage, trucking, supply chain" },
   { key: "realestate", label: "Real Estate",            sub: "Agents, brokers, investors" },
   { key: "saas",       label: "SaaS / Tech Sales",      sub: "AEs, SDRs, BDRs, CSMs" },
   { key: "insurance",  label: "Insurance",              sub: "Agents, brokers, P&C, life" },
   { key: "recruiting", label: "Recruiting",             sub: "Agency, in-house, staffing" },
   { key: "other",      label: "Something else",         sub: "Any other sales or professional role" },
  ];

  return wrap(<>
   <BtnBack onClick={() => setScreen(null)} />
   <ProgressBar />
   <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

    {/* First name */}
    <PacerMsg id="fn">Good. Let's make this quick — what's your first name?</PacerMsg>
    {!firstNameConfirmed ? (
     <div style={{ paddingLeft: "44px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <input autoFocus style={{ ...sInput, borderRadius: "22px" }}
       placeholder="First name…" value={firstName} autoComplete="given-name"
       onChange={e => setFirstName(e.target.value)}
       onKeyDown={e => { if (e.key === "Enter" && firstName.trim().length >= 2) setFirstNameConfirmed(true); }} />
      {firstName.trim().length >= 2 && (
       <button onClick={() => setFirstNameConfirmed(true)}
        style={{ alignSelf: "flex-start", marginLeft: "18px", background: TA, color: "#000", border: "none", borderRadius: "22px", padding: "10px 20px", fontSize: "0.88rem", fontWeight: "900", cursor: "pointer", fontFamily: F, letterSpacing: "-0.01em" }}>
        Continue →
       </button>
      )}
     </div>
    ) : (
     <AnswerChip label={firstName} onEdit={() => { setFirstNameConfirmed(false); setLastNameConfirmed(false); setLastName(""); setIndustry(""); setIndustryConfirmed(false); }} />
    )}

    {/* Last name */}
    {firstNameConfirmed && (<>
     <PacerMsg id="ln">{firstName}. Last name?</PacerMsg>
     {!lastNameConfirmed ? (
      <div style={{ paddingLeft: "44px", display: "flex", flexDirection: "column", gap: "8px" }}>
       <input autoFocus style={{ ...sInput, borderRadius: "22px" }}
        placeholder="Last name…" value={lastName} autoComplete="family-name"
        onChange={e => setLastName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && lastName.trim().length >= 2) setLastNameConfirmed(true); }} />
       {lastName.trim().length >= 2 && (
        <button onClick={() => setLastNameConfirmed(true)}
         style={{ alignSelf: "flex-start", marginLeft: "18px", background: TA, color: "#000", border: "none", borderRadius: "22px", padding: "10px 20px", fontSize: "0.88rem", fontWeight: "900", cursor: "pointer", fontFamily: F, letterSpacing: "-0.01em" }}>
         Continue →
        </button>
       )}
      </div>
     ) : (
      <AnswerChip label={lastName} onEdit={() => { setLastNameConfirmed(false); setLastName(""); setIndustry(""); setIndustryConfirmed(false); }} />
     )}
    </>)}

    {/* Role / industry */}
    {firstNameConfirmed && lastNameConfirmed && (<>
     <PacerMsg id="role">Nice to meet you, {firstName}. What's your field?</PacerMsg>
     {!industryConfirmed ? (
      <div style={{ paddingLeft: "44px", display: "flex", flexDirection: "column", gap: "8px", animation: "fadeSlideUp 0.3s ease" }}>
       {ROLE_OPTIONS.map(opt => (
        <TapBtn key={opt.key} label={opt.label} sub={opt.sub}
         onClick={() => {
          haptic.light();
          if (opt.key === "other") {
           setIndustry("freight"); // fallback, they'll see the full picker
           setIndustryConfirmed(true);
           setTimeout(() => setScreen("spacepick"), 200);
          } else {
           setIndustry(opt.key);
           setIndustryConfirmed(true);
           setTimeout(() => setScreen("spacepick"), 200);
          }
         }} />
       ))}
      </div>
     ) : (
      <AnswerChip label={ROLE_OPTIONS.find(o => o.key === industry)?.label || "Custom role"} onEdit={() => { setIndustry(""); setIndustryConfirmed(false); }} />
     )}
    </>)}

   </div>
  </>);
 }

 // ── SPACEPICK — solo setup + Pacer intro ──────────────────────────────
 if (screen === "spacepick") {
  const isReady = canSubmit && industry;
  return wrap(<>
   <BtnBack onClick={() => setScreen("profile")} />
   <ProgressBar />

   {/* Summary card */}
   <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "14px", padding: "14px 16px", marginBottom: "20px" }}>
    <div style={{ fontSize: "0.68rem", fontWeight: "800", color: TM, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Your profile</div>
    <div style={{ fontSize: "1rem", fontWeight: "800", color: TP, letterSpacing: "-0.02em", fontFamily: F }}>{name}</div>
    <div style={{ fontSize: "0.8rem", color: TM, marginTop: "2px" }}>
     {DEFAULT_INDUSTRIES[industry]?.icon || "◆"} {DEFAULT_INDUSTRIES[industry]?.label || "Custom"}
    </div>
   </div>

   {/* Pacer AI intro */}
   <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "20px" }}>
    <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#1DC9E8,#7B6FD8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>⚡</div>
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "16px 16px 16px 4px", padding: "13px 16px", flex: 1 }}>
     <div style={{ fontSize: "0.6rem", fontWeight: "800", color: TA, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Pacer</div>
     <div style={{ fontSize: "0.88rem", color: TP, fontFamily: F, lineHeight: 1.65, letterSpacing: "-0.01em" }}>
      You get a full CRM, focus sessions, cadences, and analytics — <strong style={{ color: TP }}>free, no expiry, no credit card.</strong>
      <div style={{ marginTop: "10px" }}>The AI layer — coaching, list building, ICP scoring, live company intel — that's Pacer. You get <strong style={{ color: TA }}>10 free credits</strong> to try it. Pro unlocks everything, unlimited.</div>
     </div>
    </div>
   </div>

   {loading ? (
    <div style={{ textAlign: "center", padding: "16px", color: TM, fontSize: "0.88rem", fontFamily: F }}>
     <div style={{ width: "20px", height: "20px", border: `2px solid ${TA}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 8px" }} />
     Setting up your account…
    </div>
   ) : (
    <button onClick={() => { if (isReady) { haptic.success(); submit(); } }}
     disabled={!isReady}
     style={{ width: "100%", background: isReady ? TA : "var(--bg-3)", color: isReady ? "#000" : TM, border: "none", borderRadius: "14px", padding: "16px 20px", fontSize: "1rem", fontWeight: "900", cursor: isReady ? "pointer" : "default", fontFamily: F, letterSpacing: "-0.01em", transition: "all 0.15s" }}>
     Start with Cadence →
    </button>
   )}
   <p style={{ fontSize: "0.68rem", color: TD, textAlign: "center", marginTop: "10px" }}>Free forever · No credit card · Cancel Pro anytime</p>
  </>);
 }

 // ── JOIN SCREEN ────────────────────────────────────────────────────────
 if (screen === "join") {
  const isJoin = true;
  const isReady = inviteInfo && canSubmit && industry;
  return wrap(<>
   <BtnBack onClick={() => { setScreen(null); setInviteToken(""); setInviteInfo(null); }} />
   <ProgressBar />
   <div style={{ marginBottom: "20px" }}>
    <div style={{ fontSize: "1.1rem", fontWeight: "800", color: TP, letterSpacing: "-0.02em", marginBottom: "4px" }}>Join via invite</div>
    <div style={{ fontSize: "0.82rem", color: TM }}>Enter your invite code or paste the full invite link</div>
   </div>
   <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
    <input style={sInput} placeholder="Invite code or link…"
     value={inviteToken} onChange={e => setInviteToken(e.target.value)} autoFocus />
    {inviteErr && <div style={{ fontSize: "0.82rem", color: "#E05577" }}>{inviteErr}</div>}
    {inviteInfo && (
     <div style={{ background: "rgba(29,201,232,0.06)", border: "1px solid rgba(29,201,232,0.2)", borderRadius: "12px", padding: "12px 14px", fontSize: "0.85rem", color: TM }}>
      <span style={{ color: TA, fontWeight: "700" }}>✓ Found:</span> {inviteInfo.spaceName || "a crew"}
     </div>
    )}
    <div style={{ display: "flex", gap: "8px" }}>
     <input style={{ ...sInput, flex: 1 }} placeholder="First name" value={firstName} autoComplete="given-name"
      onChange={e => setFirstName(e.target.value)} />
     <input style={{ ...sInput, flex: 1 }} placeholder="Last name" value={lastName} autoComplete="family-name"
      onChange={e => setLastName(e.target.value)} />
    </div>
    {inviteInfo?.spaceType === "community" && (
     <div>
      <div style={{ fontSize: "0.78rem", color: TM, marginBottom: "8px", letterSpacing: "-0.01em" }}>Your role</div>
      <IndustryPicker value={industry} onChange={k => setIndustry(k)} showCustomEntry={false} />
     </div>
    )}
    <button onClick={() => { if (isReady) { haptic.success(); submit(); } }}
     disabled={!isReady}
     style={{ background: isReady ? TA : "var(--bg-3)", color: isReady ? "#000" : TM, border: "none", padding: "14px 20px", borderRadius: "14px", fontSize: "0.95rem", fontFamily: F, fontWeight: "900", cursor: isReady ? "pointer" : "default", letterSpacing: "-0.01em", transition: "all 0.15s" }}>
     {loading ? "Setting up…" : "Join →"}
    </button>
    <button onClick={() => setScreen(null)}
     style={{ background: "none", border: "none", color: TM, fontSize: "0.78rem", cursor: "pointer", padding: "4px", fontFamily: F }}>
     Set up solo instead →
    </button>
   </div>
  </>);
 }

 return null;
}


export function UserSetupModal({existingUsers, admins, teams, industryConfigs, superAdminId, onSelect, onCreateNew, onCreateNewIndustry}) {

 const [firstName,setFirstName] = useState("");
 const [lastName,setLastName] = useState("");
 const name = (firstName.trim()+" "+lastName.trim()).trim(); // combined
 const [industry,setIndustry] = useState("freight");
 const [pin,setPin] = useState("");
 const [customMode,setCustomMode] = useState(false);
 const [customName,setCustomName] = useState("");
 const [customDesc,setCustomDesc] = useState("");
 const [generating,setGenerating] = useState(false);
 const [genError,setGenError] = useState("");

 const [step, setStep] = useState(1); // 1=name+role, 2=team assignment
 const [teamLeaderId, setTeamLeaderId] = useState(null); // null = unassigned
 const isDupe = existingUsers.some(u=>u.name.trim().toLowerCase()===name.toLowerCase());
 const missingLastName = firstName.trim().length>0 && lastName.trim().length===0;

 const METRIC_COLORS_LIST = [TA,"#84D4E8","#5DC1DB","#B07EC8","#E05577",TA,"#7EC8C8","#D4A5D4"];

 async function generateAndCreate() {
  if(!firstName.trim()||!lastName.trim()||isDupe||invalidPin) return;
  if(!customName.trim()) {
   // No custom name — use generic "custom" preset directly
   onCreateNew(name.trim(), "custom", pin||null, teamLeaderId);
   return;
  }
  setGenerating(true); setGenError("");
  try {
   const desc = customDesc.trim() ? `Description: ${customDesc.trim()}` : "";
   const prompt = `You are configuring an activity tracker for someone focused on: "${customName.trim()}". ${desc}

Generate a JSON config with the following structure. Return ONLY valid JSON, no markdown, no explanation:

{
 "label": "Human-readable name for this track",
 "icon": "single emoji",
 "accentColor": "hex color like #7EC897",
 "weekdayMetrics": [
  {"key": "snake_case_key", "label": "Metric Label", "short": "Short", "defaultGoal": 0, "keyBind": "1"},
  ...up to 7 metrics...
 ],
 "weekendMetrics": [
  {"key": "existing_key", "label": "Label", "short": "Short", "defaultGoal": 0, "keyBind": "1"}
 ],
 "primaryGoalMetrics": ["key1", "key2"]
}

Rules:
- weekdayMetrics: 4-7 metrics that actually matter for this specific focus area — not generic
- weekendMetrics: 1-2 metrics that make sense on weekends for this type of activity
- keyBind values must be "1" through "7" in order
- defaultGoal of 0 means no goal set; use realistic daily goals appropriate for this activity
- weekendMetrics keys must exist in weekdayMetrics
- primaryGoalMetrics: 2-4 keys that best measure daily progress for this focus`;

   const resp = await callAI({ model: "claude-sonnet-4-20250514", messages: [{role:"user",content:prompt}], max_tokens: 800, call_type: "metric_gen" })
   if(!resp.ok){setGenError(`API error: ${data?.error?.message||resp.status}`);setGenerating(false);return;}
   const text=(data?.content||[]).filter(b=>b.type==="text").map(b=>b.text||"").join("").trim();
   const clean = text.replace(/^```json\s*/,"").replace(/^```\s*/,"").replace(/\s*```$/,"").trim();
   const cfg = JSON.parse(clean);
   cfg.weekdayMetrics = cfg.weekdayMetrics.map((m,i)=>({...m, color:METRIC_COLORS_LIST[i%METRIC_COLORS_LIST.length]}));
   cfg.weekendMetrics = cfg.weekendMetrics.map((m,i)=>({...m, color:METRIC_COLORS_LIST[i%METRIC_COLORS_LIST.length]}));
   const indKey = makeIndKey(customName);
   onCreateNewIndustry(name.trim(), indKey, cfg, pin||null, teamLeaderId);
  } catch(e) {
   setGenError(`Couldn't generate custom metrics — using generic template.`);
   onCreateNew(name.trim(), "custom", pin||null, teamLeaderId);
  }
  setGenerating(false);
 }

 function tryCreate(){
  if(!firstName.trim()||!lastName.trim()||isDupe||invalidPin)return;
  if(industry==="custom"){generateAndCreate();return;}
  // If there are admins in this industry, offer team assignment
  const eligibleLeaders = admins.map(id=>existingUsers.find(u=>u.id===id)).filter(u=>u&&u.industry===industry);
  if(step===1 && existingUsers.length>0 && eligibleLeaders.length>0){
   setStep(2);
   return;
  }
  onCreateNew(name.trim(),industry,pin||null,teamLeaderId);
 }

 return (
  <div style={s.overlay}>
   <div style={{...s.modal,maxWidth:"min(440px,100%)"}}>
    <div style={s.mHead}><span style={s.mTitle}>Welcome</span></div>
    <div style={s.mBody}>
     {existingUsers.length>0&&<UserTree users={existingUsers} admins={admins} teams={teams} onSelect={onSelect} industryConfigs={industryConfigs}/>}

     <div style={s.fg8}>
      <input style={{...s.nameInput,flex:1,borderColor:isDupe?"#3A1A1A":"var(--bg-4)"}} placeholder="First name" value={firstName} autoFocus
       onChange={e=>setFirstName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryCreate()}/>
      <input style={{...s.nameInput,flex:1,borderColor:missingLastName?"#2A1A08":"var(--bg-4)"}} placeholder="Last name *" value={lastName}
       onChange={e=>setLastName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryCreate()}/>
     </div>
     {isDupe&&<div style={s.importErr}>A profile named "{name}" already exists.</div>}
     {missingLastName&&<div style={s.x9}>Last name required.</div>}

     <div style={s.mHint}>Select your role:</div>
     <IndustryPicker
      value={industry}
      onChange={k => setIndustry(k)}
      industryConfigs={industryConfigs}
      showCustomEntry={true}
      customName={customName}
      onCustomNameChange={v => setCustomName(v)}
      customDesc={customDesc}
      onCustomDescChange={v => setCustomDesc(v)}
     />
     {generating && <div style={{fontSize:"0.9rem",color:TA,marginTop:"8px",display:"flex",alignItems:"center",gap:"8px"}}>
      <span style={{display:"inline-block",width:"12px",height:"12px",border:"2px solid "+TA,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      Generating custom metrics for your role...
     </div>}
     {genError && <div style={{fontSize:"0.9rem",color:"#F59E0B",marginTop:"6px"}}>{genError}</div>}

     <div style={s.mHint}>PIN — optional, 4 digits</div>
     <input style={s.x3}
      type="password" inputMode="numeric" maxLength={4} placeholder="••••"
      value={pin} onChange={e=>{if(/^[0-9]{0,4}$/.test(e.target.value))setPin(e.target.value);}}/>
     {invalidPin&&<div style={s.importErr}>PIN must be exactly 4 digits.</div>}

     {step===1&&(()=>{
      const hasLeaders = existingUsers.length>0 && admins.some(id=>{const u=existingUsers.find(x=>x.id===id);return u&&u.industry===industry;});
      return (
       <button
        style={{...s.primaryBtn,opacity:(name.trim()&&!isDupe&&!invalidPin&&!generating)?1:0.4,...s.w100}}
        disabled={!firstName.trim()||!lastName.trim()||isDupe||invalidPin||generating}
        onClick={() => { haptic.medium(); tryCreate(); }}>
        {generating?"Building your role...":hasLeaders&&industry!=="custom"?"Next →":"Start Tracking"}
       </button>
      );
     })()}

     {step===2&&(()=>{
      const eligibleLeaders = admins.map(id=>existingUsers.find(u=>u.id===id)).filter(u=>u&&u.industry===industry);
      return (
       <div>
        <div style={{fontSize:"0.95rem",...s.priF,...s.mb12}}>Whose team are you on?</div>
        <div style={{...s.fdc,gap:"6px",...s.mb12}}>
         {eligibleLeaders.map(leader=>(
          <button key={leader.id} onClick={()=>setTeamLeaderId(teamLeaderId===leader.id?null:leader.id)}
           style={{...s.userBtn,borderColor:teamLeaderId===leader.id?TA:BD1,color:teamLeaderId===leader.id?TA:TP,...s.fsb}}>
           <span>{(industryConfigs?.[leader.industry]||DEFAULT_INDUSTRIES[leader.industry])?.icon||"◆"} {leader.name}</span>
           {teamLeaderId===leader.id&&<span style={{fontSize:"0.9rem"}}>✓</span>}
          </button>
         ))}
         <button onClick={()=>setTeamLeaderId(null)}
          style={{...s.userBtn,borderColor:teamLeaderId===null?TM:BD1,color:teamLeaderId===null?TS:TD,fontSize:"0.9rem"}}>
          Not on a team yet
         </button>
        </div>
        <div style={s.fg8}>
         <button style={{...s.secondaryBtn,flex:"0 0 auto"}} onClick={()=>setStep(1)}>← Back</button>
         <button style={{...s.primaryBtn,flex:1}} onClick={()=>onCreateNew(name.trim(),industry,pin||null,teamLeaderId)}>
          Start Tracking
         </button>
        </div>
        <div style={{marginTop:"14px",...s.p12,background:BG0,...s.bd1,...s.br8}}>
         <div style={{fontSize:"0.8rem",color:"var(--border-2)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"6px"}}>Request Admin Access</div>
         <div style={{fontSize:"1rem",color:TX,marginBottom:"8px",lineHeight:1.5}}>Need admin tools? Send a request to the team admin.</div>
         <button style={{...s.smallTab,fontSize:"0.8rem",padding:"5px 12px"}} onClick={async()=>{
          if(!superAdminId)return;
          const saUser = existingUsers.find(u=>u.id===superAdminId);
          if(!saUser)return;
          const newUserId = `user-temp-${Date.now()}`;
          const tKey = [newUserId,superAdminId].sort().join("_");
          const msg = {id:Date.now(),senderId:"pending",senderName:name.trim(),text:`Admin request from ${name.trim()} (${industry}) — created ${new Date().toLocaleDateString()}`,ts:Date.now()};
          const saThreads = await loadPersonalThreads(superAdminId);
          const exists = saThreads.find(t=>t.name&&t.name.includes(name.trim())&&t.name.includes("Request"));
          if(!exists){
           await savePersonalThreads(superAdminId,[...saThreads,{threadKey:tKey,participantIds:[newUserId,superAdminId],name:`Admin Request: ${name.trim()}`,lastMsg:msg.text,lastTs:msg.ts,unreadCount:1}]);
           await savePersonalMessages(tKey,[msg]);
          }
          alert("Request sent to admin.");
         }}>Request Admin Access</button>
        </div>
       </div>
      );
     })()}
    </div>
   </div>
  </div>
 );
}

export function SoloDashboard({ currentUser, myData, myCfg, myGoals, now, onNavigate }) {
 const [freezes, setFreezes] = useState({ count: 0, usedDates: [], pto: [], sick: [] });
 useEffect(() => {
  if (currentUser) loadStreakFreezes(currentUser.id).then(setFreezes);
 }, [currentUser?.id]);
 const protectedDates = getProtectedDates(freezes);
 const streak = computeStreak(myData, protectedDates);
 const isWeekendToday = isWeekend(now);
 const todayData = myData[now] || {};
 const todayPct = isWeekendToday ? null : computeGoalPct(todayData, myCfg.weekdayMetrics, myGoals);
 const wdMetrics = myCfg?.weekdayMetrics || [];

 // ── Streak freeze ──────────────────────────────────────────
 // Earn a freeze every 7 consecutive days (max 2 banked)
 const freezesEarned = Math.min(2, Math.floor((streak.longest || streak.current) / 7));
 const freezesAvailable = Math.max(0, freezesEarned - (freezes.usedDates?.length || 0));

 // Check if streak was broken yesterday and freeze could apply
 function prevWeekdayStr(ds) {
  const [y,m,d] = ds.split("-").map(Number);
  const dt = new Date(y,m-1,d);
  do { dt.setDate(dt.getDate()-1); } while(isWeekend(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`));
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
 }
 const yesterday = prevWeekdayStr(now);
 const missedYesterday = !isWeekendToday && !myData[yesterday] && streak.current === 0;
 const freezeAlreadyUsed = freezes.usedDates?.includes(yesterday);

 async function useFreeze() {
  if (!currentUser || !freezesAvailable || freezeAlreadyUsed) return;
  const updated = { ...freezes, usedDates: [...(freezes.usedDates||[]), yesterday] };
  await saveStreakFreezes(currentUser.id, updated);
  setFreezes(updated);
 }

 // ── Pace indicators ────────────────────────────────────────
 const pace = useMemo(() => {
  const metrics = myCfg?.weekdayMetrics || [];
  if (!metrics.length) return null;

  // Get all logged weekdays this week (Mon-today)
  const [y,m,d] = now.split("-").map(Number);
  const dt = new Date(y,m-1,d);
  const dow = dt.getDay(); // 0=Sun
  const weekdays = [];
  for (let i = 1; i <= 5; i++) { // Mon-Fri
   const wd = new Date(y,m-1,d - (dow === 0 ? 7 : dow) + i);
   const ds = `${wd.getFullYear()}-${String(wd.getMonth()+1).padStart(2,"0")}-${String(wd.getDate()).padStart(2,"0")}`;
   if (ds <= now) weekdays.push(ds);
  }

  // Last week weekdays
  const lastWeekDays = weekdays.map(ds => {
   const [wy,wm,wd2] = ds.split("-").map(Number);
   const wdt = new Date(wy,wm-1,wd2-7);
   return `${wdt.getFullYear()}-${String(wdt.getMonth()+1).padStart(2,"0")}-${String(wdt.getDate()).padStart(2,"0")}`;
  });

  // This week avg pct
  const thisWeekPcts = weekdays.map(ds => computeGoalPct(myData[ds]||{}, metrics, myGoals));
  const thisWeekAvg = thisWeekPcts.length ? Math.round(thisWeekPcts.reduce((a,b)=>a+b,0)/thisWeekPcts.length) : 0;

  // Last week avg pct (same number of days)
  const lastWeekPcts = lastWeekDays.map(ds => computeGoalPct(myData[ds]||{}, metrics, myGoals));
  const lastWeekAvg = lastWeekPcts.length ? Math.round(lastWeekPcts.reduce((a,b)=>a+b,0)/lastWeekPcts.length) : 0;

  const weekDiff = thisWeekAvg - lastWeekAvg;

  // Daily pace: time-of-day aware smart target
  const now2 = new Date();
  const hourOfDay = now2.getHours() + now2.getMinutes()/60;
  const workdayStart = 8, workdayEnd = 18;
  const workdayProgress = Math.min(1, Math.max(0, (hourOfDay - workdayStart) / (workdayEnd - workdayStart)));
  const smartTargets = metrics.map(m => {
   const goal = myGoals[m.key] ?? m.defaultGoal ?? 0;
   const current = todayData[m.key] || 0;
   if (!goal) return null;
   const expectedByNow = Math.round(goal * workdayProgress);
   const remaining = Math.max(0, goal - current);
   const hoursLeft = Math.max(0.5, workdayEnd - Math.max(hourOfDay, workdayStart));
   const neededPerHour = remaining / hoursLeft;
   const onTrack = current >= expectedByNow * 0.85;
   return { label: m.label || m.key, current, goal, expectedByNow, remaining, neededPerHour, onTrack, pct: Math.round(current/goal*100) };
  }).filter(Boolean);

  return { thisWeekAvg, lastWeekAvg, weekDiff, smartTargets, workdayProgress };
 }, [myData, myCfg, myGoals, now, todayData]);

 // Last 30 calendar days → heatmap data
 const last30 = useMemo(() => {
  const days = [];
  const d = new Date(now);
  for (let i = 29; i >= 0; i--) {
   const dt = new Date(d);
   dt.setDate(d.getDate() - i);
   const ds = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
   const data = myData[ds] || {};
   const weekend = isWeekend(ds);
   const pct = weekend ? null : computeGoalPct(data, wdMetrics, myGoals);
   const hasData = !weekend && Object.values(data).some(v => typeof v === "number" && v > 0);
   days.push({ ds, pct, weekend, hasData, future: ds > now });
  }
  return days;
 }, [myData, myGoals, wdMetrics, now]);

 // This month stats
 const thisMonth = useMemo(() => {
  const mk = monthKey(now);
  const entries = Object.entries(myData).filter(([d,v]) => monthKey(d) === mk && !isWeekend(d) && v && Object.values(v).some(x => typeof x === "number" && x > 0));
  if (entries.length === 0) return { days: 0, avgPct: 0, goalDays: 0, totals: {} };
  let totalPct = 0, goalDays = 0;
  const totals = {};
  for (const [, data] of entries) {
   const pct = computeGoalPct(data, wdMetrics, myGoals);
   totalPct += pct;
   if (pct >= 100) goalDays++;
   for (const m of wdMetrics) totals[m.key] = (totals[m.key] || 0) + (data[m.key] || 0);
  }
  return { days: entries.length, avgPct: Math.round(totalPct / entries.length), goalDays, totals };
 }, [myData, myGoals, wdMetrics, now]);

 // Last 8 weeks trend (avg pct per week)
 const weekTrend = useMemo(() => {
  const weeks = [];
  for (let w = 7; w >= 0; w--) {
   const refDate = new Date(now);
   refDate.setDate(refDate.getDate() - w * 7);
   const wk = weekKey(`${refDate.getFullYear()}-${String(refDate.getMonth()+1).padStart(2,"0")}-${String(refDate.getDate()).padStart(2,"0")}`);
   const entries = Object.entries(myData).filter(([d]) => weekKey(d) === wk && !isWeekend(d));
   const logged = entries.filter(([,v]) => v && Object.values(v).some(x => typeof x === "number" && x > 0));
   if (logged.length === 0) { weeks.push({ wk, pct: 0, days: 0 }); continue; }
   const avg = Math.round(logged.reduce((s, [,d]) => s + computeGoalPct(d, wdMetrics, myGoals), 0) / logged.length);
   weeks.push({ wk, pct: avg, days: logged.length });
  }
  return weeks;
 }, [myData, myGoals, wdMetrics, now]);

 // Personal bests per metric
 const personalBests = useMemo(() => {
  const bests = {};
  for (const [date, data] of Object.entries(myData)) {
   if (!data || isWeekend(date)) continue;
   for (const m of wdMetrics) {
    const v = data[m.key] || 0;
    if (v > (bests[m.key]?.val || 0)) bests[m.key] = { val: v, date, color: m.color, label: m.short || m.label };
   }
  }
  return Object.values(bests).filter(b => b.val > 0).sort((a,b) => {
   const am = wdMetrics.find(m => m.short === a.label || m.label === a.label);
   const bm = wdMetrics.find(m => m.short === b.label || m.label === b.label);
   return (wdMetrics.indexOf(am) - wdMetrics.indexOf(bm));
  });
 }, [myData, wdMetrics, now]);

 // Goal hit rate past 30 weekdays
 const goalHitRate = useMemo(() => {
  const weekdays = Object.keys(myData)
   .filter(d => !isWeekend(d) && d <= now)
   .sort().slice(-30);
  if (!weekdays.length) return null;
  const hits = weekdays.filter(d => computeGoalPct(myData[d] || {}, wdMetrics, myGoals) >= 100).length;
  return { hits, total: weekdays.length, pct: Math.round((hits / weekdays.length) * 100) };
 }, [myData, myGoals, wdMetrics, now]);

 const indCfg = myCfg || {};
 const accentColor = indCfg.accentColor || "var(--accent)";
 const sCard = { background: BG0, ...s.bd1, borderRadius: "14px", padding: "clamp(14px,1.6vw,22px)" };
 const sLabel = { fontSize: "0.7rem", color: TM, textTransform: "uppercase", letterSpacing: "0.13em", fontWeight: "700", marginBottom: "10px" };
 const totalLoggedDays = Object.keys(myData).filter(d => !isWeekend(d) && myData[d] && Object.values(myData[d]).some(v => typeof v === "number" && v > 0)).length;

 // Heatmap cell color
 function heatColor(pct, weekend, future, hasData) {
  if (future || !hasData && !weekend) return "var(--bg-3)";
  if (weekend) return "var(--bg-2)";
  if (pct >= 100) return "#23CDED";
  if (pct >= 75)  return "#2AADCC";
  if (pct >= 50)  return "#1E8AA0";
  if (pct >= 25)  return "#176880";
  return "#0F4558";
 }

 return (
  <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>

   {/* ── Stat pills row ──────────────────────────────────────── */}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:"10px"}}>

    {/* Today */}
    <div style={{background:isWeekendToday?"var(--bg-1)":todayPct>=100?"rgba(29,201,232,0.1)":"var(--bg-1)",border:`1px solid ${isWeekendToday?"var(--border-1)":todayPct>=100?"rgba(29,201,232,0.3)":"var(--border-1)"}`,borderRadius:"14px",padding:"16px 12px",textAlign:"center"}}>
     <div style={{fontSize:"2rem",fontFamily:"'DM Sans',system-ui,sans-serif",fontWeight:"800",color:isWeekendToday?"var(--text-muted)":todayPct>=100?"#1DC9E8":todayPct>0?"#F59E0B":"var(--text-dim)",lineHeight:1,fontVariantNumeric:"tabular-nums",letterSpacing:"normal"}}>
      {isWeekendToday?"🏖":((todayPct||0)+"%")}
     </div>
     <div style={{fontSize:"0.65rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:"700",marginTop:"7px"}}>Today</div>
    </div>

    {/* Streak */}
    <div style={{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"14px",padding:"16px 12px",textAlign:"center"}}>
     <div style={{fontSize:"2rem",fontFamily:"'DM Sans',system-ui,sans-serif",fontWeight:"800",color:streak.current>0?"#F59E0B":"var(--text-dim)",lineHeight:1,fontVariantNumeric:"tabular-nums"}}>
      {streak.current>0&&<span style={{fontSize:"1.4rem",marginRight:"2px"}}>🔥</span>}{streak.current}
     </div>
     <div style={{fontSize:"0.65rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:"700",marginTop:"7px"}}>Streak</div>
    </div>

    {/* Month avg */}
    <div style={{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"14px",padding:"16px 12px",textAlign:"center"}}>
     <div style={{fontSize:"2rem",fontFamily:"'DM Sans',system-ui,sans-serif",fontWeight:"800",color:thisMonth.avgPct>=100?"#1DC9E8":thisMonth.avgPct>=60?"#F59E0B":"var(--text-dim)",lineHeight:1,fontVariantNumeric:"tabular-nums",letterSpacing:"normal"}}>
      {thisMonth.avgPct}%
     </div>
     <div style={{fontSize:"0.65rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:"700",marginTop:"7px"}}>Month avg</div>
    </div>
   </div>

   {/* ── Log today CTA (if not done) ─────────────────────────── */}
   {!isWeekendToday && (todayPct||0) < 100 && (
    <button onClick={()=>onNavigate("workspace")} style={{
     background: (todayPct||0) === 0
      ? "linear-gradient(135deg, rgba(29,201,232,0.15) 0%, rgba(29,201,232,0.05) 100%)"
      : "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)",
     border: (todayPct||0) === 0 ? "1px solid rgba(29,201,232,0.3)" : "1px solid rgba(245,158,11,0.3)",
     color: (todayPct||0) === 0 ? "var(--accent)" : "#F59E0B",
     borderRadius:"14px",
     padding:"16px 20px",
     display:"flex",alignItems:"center",justifyContent:"space-between",
     cursor:"pointer",fontFamily:F,
     WebkitTapHighlightColor:"transparent",
     textAlign:"left",
    }}>
     <div>
      <div style={{fontSize:"1rem",fontWeight:"700",marginBottom:"2px"}}>{(todayPct||0) === 0 ? "Ready to log today?" : `Keep going — ${todayPct}% done`}</div>
      <div style={{fontSize:"0.82rem",color:(todayPct||0)===0?"rgba(29,201,232,0.7)":"rgba(245,158,11,0.7)"}}>{(todayPct||0) === 0 ? "Tap to open tracker" : "Tap to update your numbers"}</div>
     </div>
     <div style={{fontSize:"1.4rem",opacity:0.8}}>→</div>
    </button>
   )}

   {/* ── Streak freeze alert ──────────────────────────────────── */}
   {missedYesterday && freezesAvailable > 0 && !freezeAlreadyUsed && (
    <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:"14px", padding:"14px 18px", display:"flex", alignItems:"center", gap:"12px" }}>
     <div style={{ fontSize:"1.5rem" }}>🛡️</div>
     <div style={{ flex:1 }}>
      <div style={{ fontSize:"0.88rem", fontWeight:"700", color:"#F59E0B", marginBottom:"2px" }}>Streak freeze available</div>
      <div style={{ fontSize:"0.8rem", color:"var(--text-muted)", lineHeight:1.4 }}>
       You missed yesterday but have {freezesAvailable} freeze{freezesAvailable>1?"s":""} saved. Use one to protect your {streak.longest}-day best?
      </div>
     </div>
     <button onClick={useFreeze} style={{ background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.4)", color:"#F59E0B", padding:"10px 16px", borderRadius:"10px", fontWeight:"700", fontSize:"0.85rem", cursor:"pointer", fontFamily:F, flexShrink:0, WebkitTapHighlightColor:"transparent", minHeight:"44px" }}>
      Use freeze
     </button>
    </div>
   )}

   {/* ── Pace & smart targets ────────────────────────────────── */}
   {pace && !isWeekendToday && (
    <div style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"16px", padding:"16px 18px", display:"flex", flexDirection:"column", gap:"12px" }}>
     {/* Weekly pace */}
     <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:"700" }}>This week vs last week</div>
      <div style={{ fontSize:"0.88rem", fontWeight:"800", color: pace.weekDiff > 0 ? "#4ACF86" : pace.weekDiff < 0 ? "#E05577" : "var(--text-muted)" }}>
       {pace.weekDiff > 0 ? "↑" : pace.weekDiff < 0 ? "↓" : "→"} {Math.abs(pace.weekDiff)}% {pace.weekDiff > 0 ? "ahead" : pace.weekDiff < 0 ? "behind" : "same pace"}
      </div>
     </div>
     {/* Daily smart targets */}
     {pace.smartTargets.length > 0 && pace.workdayProgress > 0.1 && (
      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
       <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:"700" }}>Today's pace</div>
       {pace.smartTargets.slice(0,4).map(t => (
        <div key={t.label} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
         <div style={{ fontSize:"0.78rem", color:"var(--text-secondary)", fontWeight:"600", minWidth:"52px", maxWidth:"80px", flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.label}</div>
         <div style={{ flex:1, background:"var(--bg-3)", borderRadius:"6px", height:"6px", overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${Math.min(100,t.pct)}%`, background: t.onTrack ? "#4ACF86" : "#E05577", borderRadius:"6px", transition:"width 0.4s" }}/>
         </div>
         <div style={{ fontSize:"0.78rem", fontWeight:"700", color: t.onTrack ? "#4ACF86" : "#E05577", width:"38px", textAlign:"right", flexShrink:0 }}>{t.pct}%</div>
         {!t.onTrack && t.remaining > 0 && (
          <div style={{ fontSize:"0.7rem", color:"var(--text-dim)", flexShrink:0, whiteSpace:"nowrap" }}>{t.neededPerHour.toFixed(1)}/hr</div>
         )}
         {t.onTrack && <div style={{ fontSize:"0.7rem", color:"#4ACF86", flexShrink:0, whiteSpace:"nowrap" }}>✓</div>}
        </div>
       ))}
      </div>
     )}
    </div>
   )}

   {/* ── 30-Day Heatmap ──────────────────────────────────────── */}
   <div style={{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"16px",padding:"16px 18px"}}>
    <div style={{fontSize:"0.72rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.14em",fontWeight:"700",marginBottom:"12px"}}>30-Day Activity</div>
    <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
     {last30.map(({ds,pct,weekend,future,hasData})=>{
      const bg = future||(!hasData&&!weekend) ? "var(--bg-3)"
       : weekend ? "var(--bg-2)"
       : pct>=100 ? "#1DC9E8" : pct>=75 ? "#2AADCC" : pct>=50 ? "#1E8AA0" : pct>=25 ? "#176880" : "#0F4558";
      return (
       <div key={ds} title={`${formatDate(ds)}${weekend?" (weekend)":pct!==null?` — ${pct}%`:""}`}
        style={{
         width:"clamp(20px,3.2vw,28px)",height:"clamp(20px,3.2vw,28px)",
         borderRadius:"5px",background:bg,opacity:future?0.3:1,
         cursor:!future&&!weekend?"pointer":"default",
         transition:"transform 0.1s",flexShrink:0,
        }}
        onClick={()=>{if(!future&&!weekend)onNavigate("history");}}
        onMouseEnter={e=>{if(!future&&!weekend)e.currentTarget.style.transform="scale(1.25)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
       />
      );
     })}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"10px"}}>
     <div style={{fontSize:"0.72rem",color:"var(--text-dim)"}}>less</div>
     {[0,25,50,75,100].map(p=>(
      <div key={p} style={{width:"12px",height:"12px",borderRadius:"3px",background:p===0?"var(--bg-3)":p>=100?"#1DC9E8":p>=75?"#2AADCC":p>=50?"#1E8AA0":p>=25?"#176880":"#0F4558"}}/>
     ))}
     <div style={{fontSize:"0.72rem",color:"var(--text-dim)"}}>more</div>
    </div>
   </div>

   {/* ── Month totals grid ───────────────────────────────────── */}
   {thisMonth.days > 0 && Object.keys(thisMonth.totals).length > 0 && (
    <div style={{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"16px",padding:"16px 18px"}}>
     <div style={{fontSize:"0.72rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.14em",fontWeight:"700",marginBottom:"12px"}}>
      Month Totals · <span style={{color:"var(--text-dim)",fontWeight:"500",textTransform:"none",letterSpacing:"normal"}}>{thisMonth.days} days active</span>
     </div>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:"8px"}}>
      {wdMetrics.map(m=>{
       const total = thisMonth.totals[m.key]||0;
       const dailyGoal = myGoals[m.key]??m.defaultGoal;
       const periodGoal = dailyGoal * thisMonth.days;
       const pct = periodGoal>0 ? Math.round((total/periodGoal)*100) : null;
       const mColor = pct===null ? m.color : pct>=100?"#1DC9E8":pct>=60?"#F59E0B":"#F43F5E";
       return (
        <div key={m.key} style={{background:"var(--bg-2)",borderRadius:"12px",padding:"12px",position:"relative",overflow:"hidden"}}>
         <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"var(--bg-3)"}}>
          <div style={{height:"100%",width:pct!=null?`${Math.min(100,pct)}%`:"100%",background:pct!=null?mColor:m.color,transition:"width 0.5s",boxShadow:pct>100?"0 0 4px rgba(29,201,232,0.5)":"none"}}/>
         </div>
         <div style={{fontSize:"0.68rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"6px",fontWeight:"700",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.short||m.label}</div>
         <div style={{fontSize:"1.5rem",fontFamily:"'Inter','DM Sans',system-ui,sans-serif",fontVariantNumeric:"tabular-nums",fontWeight:"800",color:"var(--text-primary)",lineHeight:1}}>{total.toLocaleString()}</div>
         {pct!==null&&<div style={{fontSize:"0.75rem",color:mColor,marginTop:"3px",fontWeight:"600"}}>{pct}%{pct>100&&<span style={{fontSize:"0.68rem",opacity:0.7}}> ↑</span>}</div>}
        </div>
       );
      })}
     </div>
    </div>
   )}

   {/* ── Weekly trend sparkline ──────────────────────────────── */}
   {weekTrend.some(w=>w.days>0) && (
    <div style={{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"16px",padding:"16px 18px"}}>
     <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
      <div style={{fontSize:"0.72rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.14em",fontWeight:"700"}}>8-Week Trend</div>
      <div style={{fontSize:"0.82rem",color:weekTrend[weekTrend.length-1].pct>=100?"#1DC9E8":weekTrend[weekTrend.length-1].pct>=60?"#F59E0B":"var(--text-muted)",fontWeight:"600"}}>
       {weekTrend[weekTrend.length-1].pct}% this week
      </div>
     </div>
     <div style={{display:"flex",alignItems:"flex-end",gap:"4px",height:"56px"}}>
      {weekTrend.map((w,i)=>{
       const h = w.days > 0 ? Math.max(6, Math.round((w.pct/100)*52)) : 3;
       const isLast = i===weekTrend.length-1;
       return (
        <div key={w.wk} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:"100%"}}>
         <div title={w.days>0?`${w.wk}: ${w.pct}% avg (${w.days}d)`:"No data"} style={{
          width:"100%",height:`${h}px`,
          background:isLast?(w.pct>=100?"#1DC9E8":"var(--accent)"):w.pct>=100?"rgba(29,201,232,0.5)":w.pct>=60?"rgba(29,201,232,0.25)":"var(--bg-3)",
          borderRadius:"3px 3px 0 0",
          transition:"height 0.4s ease",
         }}/>
        </div>
       );
      })}
     </div>
     <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px"}}>
      <div style={{fontSize:"0.72rem",color:"var(--text-dim)"}}>8 wk ago</div>
      <div style={{fontSize:"0.72rem",color:"var(--text-dim)"}}>now</div>
     </div>
    </div>
   )}

   {/* ── Personal bests ──────────────────────────────────────── */}
   {personalBests.length > 0 && (
    <div style={{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"16px",padding:"16px 18px"}}>
     <div style={{fontSize:"0.72rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.14em",fontWeight:"700",marginBottom:"12px"}}>Personal Bests</div>
     <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
      {personalBests.map(b=>(
       <div key={b.label} style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{width:"3px",alignSelf:"stretch",minHeight:"36px",background:b.color||"var(--accent)",borderRadius:"4px",flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
         <div style={{fontSize:"0.75rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.09em",fontWeight:"700"}}>{b.label}</div>
         <div style={{fontSize:"0.78rem",color:"var(--text-secondary)",marginTop:"1px"}}>{formatDate(b.date)}</div>
        </div>
        <div style={{fontSize:"clamp(1.4rem,4vw,2rem)",fontFamily:"'Syne','DM Sans',sans-serif",fontWeight:"800",color:b.color||"var(--accent)",flexShrink:0,lineHeight:1,minWidth:"2.5ch",textAlign:"right"}}>{b.val.toLocaleString()}</div>
       </div>
      ))}
     </div>
    </div>
   )}

   {/* ── Empty state for new users — demo preview ─────────────── */}
   {Object.keys(myData).length === 0 && (
    <div>
     {/* Gentle nudge first */}
     <div style={{background:"linear-gradient(135deg,rgba(29,201,232,0.1) 0%,rgba(29,201,232,0.03) 100%)",border:"1px solid rgba(29,201,232,0.25)",borderRadius:"16px",padding:"20px",textAlign:"center",marginBottom:"12px"}}>
      <div style={{fontSize:"1.8rem",marginBottom:"8px"}}>🚀</div>
      <div style={{fontSize:"0.95rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F,marginBottom:"4px"}}>Day 1 starts now</div>
      <div style={{fontSize:"0.82rem",color:"var(--text-muted)",lineHeight:1.5,marginBottom:"14px"}}>Log today's activity to see your dashboard come alive. Here's a preview of what you'll unlock:</div>
      <button style={{background:"var(--accent)",color:"#000",border:"none",padding:"11px 24px",borderRadius:"10px",fontWeight:"800",fontSize:"0.92rem",cursor:"pointer",fontFamily:F,WebkitTapHighlightColor:"transparent"}} onClick={()=>onNavigate("workspace")}>Log Today →</button>
     </div>
     {/* Ghost/demo cards */}
     <div style={{opacity:0.35,pointerEvents:"none",filter:"blur(0.5px)"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"12px"}}>
       {[{label:"Streak",val:"12d",emoji:"🔥",color:"#F59E0B"},{label:"Month avg",val:"78%",color:"#1DC9E8"},{label:"Best",val:"21d",color:"var(--text-muted)"}].map(s2=>(
        <div key={s2.label} style={{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"14px",padding:"16px 12px",textAlign:"center"}}>
         <div style={{fontSize:"1.6rem",fontWeight:"800",color:s2.color,fontFamily:F,lineHeight:1}}>{s2.emoji||""}{s2.val}</div>
         <div style={{fontSize:"0.62rem",color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:"5px",fontWeight:"700"}}>{s2.label}</div>
        </div>
       ))}
      </div>
      <div style={{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"16px",padding:"16px 18px",marginBottom:"12px"}}>
       <div style={{fontSize:"0.72rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.14em",fontWeight:"700",marginBottom:"10px"}}>Today's pace</div>
       {["Dials","Appts","Closes"].map((lbl,i)=>{
        const pcts=[68,45,100];
        const colors=["#F59E0B","#1DC9E8","#4ACF86"];
        return (
         <div key={lbl} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
          <div style={{fontSize:"0.78rem",color:"var(--text-secondary)",fontWeight:"600",minWidth:"52px"}}>{lbl}</div>
          <div style={{flex:1,background:"var(--bg-3)",borderRadius:"6px",height:"6px",overflow:"hidden"}}>
           <div style={{height:"100%",width:`${pcts[i]}%`,background:colors[i],borderRadius:"6px"}}/>
          </div>
          <div style={{fontSize:"0.78rem",fontWeight:"700",color:colors[i],width:"38px",textAlign:"right"}}>{pcts[i]}%</div>
         </div>
        );
       })}
      </div>
      <div style={{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"16px",padding:"16px 18px"}}>
       <div style={{fontSize:"0.72rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.14em",fontWeight:"700",marginBottom:"10px"}}>30-Day Activity</div>
       <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
        {Array.from({length:30},(_,i)=>{
         const pct=[0,0,0,45,72,88,100,0,0,68,82,91,100,95,0,0,74,86,100,88,0,0,92,100,78,84,0,0,65,0][i]||0;
         const bg=pct>=100?"#1DC9E8":pct>=75?"#2AADCC":pct>=50?"#1E8AA0":pct>=25?"#176880":pct>0?"#0F4558":"var(--bg-3)";
         return <div key={i} style={{width:"clamp(20px,3.2vw,28px)",height:"clamp(20px,3.2vw,28px)",borderRadius:"5px",background:bg,flexShrink:0}}/>;
        })}
       </div>
      </div>
     </div>
     <div style={{textAlign:"center",fontSize:"0.75rem",color:"var(--text-dim)",marginTop:"10px",fontStyle:"italic"}}>↑ This is what your dashboard looks like after logging. Start today.</div>
    </div>
   )}

  </div>
 );
}

// SoloPersonalStats — replaces the Leaderboard tab for solo users
export function SoloPersonalStats({ currentUser, myData, myCfg, myGoals, now }) {
 const [period, setPeriod] = useState("month");
 const wdMetrics = myCfg?.weekdayMetrics || [];
 const streak = computeStreak(myData);

 function getStats(range) {
  const entries = Object.entries(myData).filter(([d,v]) => {
   if (isWeekend(d) || !v || !Object.values(v).some(x => typeof x === "number" && x > 0)) return false;
   if (range === "day") return d === now;
   if (range === "week") return weekKey(d) === weekKey(now);
   if (range === "month") return monthKey(d) === monthKey(now);
   return true; // all time
  });
  const totals = {};
  let totalPct = 0, goalDays = 0;
  for (const [, data] of entries) {
   const pct = computeGoalPct(data, wdMetrics, myGoals);
   totalPct += pct;
   if (pct >= 100) goalDays++;
   for (const m of wdMetrics) totals[m.key] = (totals[m.key]||0)+(data[m.key]||0);
  }
  const days = entries.length;
  return { days, avgPct: days>0?Math.round(totalPct/days):0, goalDays, totals };
 }

 const stats = useMemo(() => getStats(period), [myData, myGoals, wdMetrics, period, now]);

 // All-time bests per metric
 const allTimeBests = useMemo(() => {
  const bests = {};
  for (const [date, data] of Object.entries(myData)) {
   if (!data || isWeekend(date)) continue;
   for (const m of wdMetrics) {
    const v = data[m.key] || 0;
    if (v > (bests[m.key]?.val||0)) bests[m.key] = { val:v, date, m };
   }
  }
  return bests;
 }, [myData, wdMetrics]);

 // Metric-by-metric sparklines — last 12 weeks per metric
 const metricWeeklyData = useMemo(() => {
  const out = {};
  for (const m of wdMetrics) {
   const weeks = [];
   for (let w = 11; w >= 0; w--) {
    const refDate = new Date(now);
    refDate.setDate(refDate.getDate() - w * 7);
    const wk = weekKey(`${refDate.getFullYear()}-${String(refDate.getMonth()+1).padStart(2,"0")}-${String(refDate.getDate()).padStart(2,"0")}`);
    const total = Object.entries(myData)
     .filter(([d,v]) => weekKey(d)===wk && !isWeekend(d) && v)
     .reduce((s,[,d]) => s + (d[m.key]||0), 0);
    weeks.push(total);
   }
   out[m.key] = weeks;
  }
  return out;
 }, [myData, wdMetrics, now]);

 const sCard = { background:BG0,...s.bd1,borderRadius:"14px",padding:"clamp(14px,1.6vw,22px)" };
 const sLabel = { fontSize:"0.7rem",color:TM,textTransform:"uppercase",letterSpacing:"0.13em",fontWeight:"700",marginBottom:"10px" };
 const periodLabels = { day:"Today", week:"This Week", month:"This Month", all:"All Time" };
 const allDays = Object.keys(myData).filter(d => !isWeekend(d) && myData[d] && Object.values(myData[d]).some(v => typeof v==="number"&&v>0)).length;

 return (
  <div style={{...s.fdc,gap:"clamp(14px,1.8vw,22px)"}}>

   {/* Period selector */}
   <div style={{...s.fsb,flexWrap:"wrap",gap:"10px",alignItems:"center"}}>
    <div>
     <div style={{fontSize:"clamp(1rem,1.6vw,1.4rem)",...s.fw6,...s.priF,letterSpacing:"0.02em"}}>My Performance</div>
     <div style={{fontSize:"0.95rem",color:TM,marginTop:"3px"}}>Personal stats & historical breakdown</div>
    </div>
    <div style={{...s.fac,gap:"4px",...s.bd1,borderRadius:"12px",padding:"3px",background:BG2,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",flexShrink:0}}>
     {[["day","Today"],["week","Week"],["month","Month"],["all","All Time"]].map(([k,l])=>(
      <button key={k} style={{...s.tab,...(period===k?s.tabActive:{})}} onClick={()=>setPeriod(k)}>{l}</button>
     ))}
    </div>
   </div>

   {/* Summary stats row */}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(150px,44vw),1fr))",gap:"clamp(8px,1vw,14px)"}}>
    {[
     { label:"Days Active", val:stats.days, color:TA, sub:period==="all"?`${allDays} all time`:null },
     { label:"Avg/Day", val:`${stats.avgPct}%`, color:stats.avgPct>=100?"#23CDED":stats.avgPct>=60?TA:"#E05577" },
     { label:"Goals Hit", val:stats.goalDays, color:"#23CDED", sub:`${stats.days>0?Math.round(stats.goalDays/stats.days*100):0}% rate` },
     { label:"Streak", val:`🔥 ${streak.current}`, color:"#E8A430", sub:`best: ${streak.longest}` },
    ].map(({label,val,color,sub})=>(
     <div key={label} style={{...sCard,...s.fdc,gap:"4px"}}>
      <div style={sLabel}>{label}</div>
      <div style={{fontSize:"clamp(1.5rem,2.5vw,2.2rem)",...s.fw8,color,lineHeight:1}}>{val}</div>
      {sub&&<div style={{fontSize:"0.85rem",color:TM,marginTop:"2px"}}>{sub}</div>}
     </div>
    ))}
   </div>

   {/* Metric breakdown cards with sparklines */}
   <div style={{...sCard,...s.fdc,gap:"16px"}}>
    <div style={sLabel}>Metric Breakdown — {periodLabels[period]}</div>
    {stats.days === 0 ? (
     <div style={{fontSize:"0.95rem",color:TD,fontStyle:"italic"}}>No data logged for this period.</div>
    ) : (
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(220px,100%),1fr))",gap:"12px"}}>
      {wdMetrics.map(m=>{
       const total = stats.totals[m.key]||0;
       const dailyGoal = myGoals[m.key]??m.defaultGoal;
       const periodGoal = dailyGoal * Math.max(stats.days,1);
       const pct = periodGoal>0 ? Math.round((total/periodGoal)*100) : null;
       const mColor = pct===null ? m.color : pct>100?"#23CDED":pct>=100?"#23CDED":pct>=60?TA:"#E05577";
       const best = allTimeBests[m.key];
       const weekVals = metricWeeklyData[m.key]||[];
       const maxVal = Math.max(...weekVals, 1);
       return (
        <div key={m.key} style={{background:"var(--bg-root)",...s.bd1,...s.br10,padding:"14px 16px"}}>
         {/* Header */}
         <div style={{...s.fsb,marginBottom:"8px"}}>
          <div style={{fontSize:"0.75rem",color:TM,textTransform:"uppercase",letterSpacing:"0.1em",...s.fw7}}>{m.label}</div>
          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:m.color,flexShrink:0}}/>
         </div>
         {/* Total */}
         <div style={{fontSize:"clamp(1.5rem,2.2vw,2rem)",...s.fw8,color:TP,lineHeight:1,marginBottom:"4px"}}>{total.toLocaleString()}</div>
         {/* Period goal pct */}
         {pct!==null && (
          <div style={{fontSize:"0.85rem",color:mColor,...s.fw6,marginBottom:"8px"}}>{pct}% of period goal{pct>100&&<span style={{fontSize:"0.75rem",marginLeft:"4px",opacity:0.7}}>↑ over</span>}</div>
         )}
         {dailyGoal>0&&<div style={{fontSize:"0.78rem",color:TD,marginBottom:"10px"}}>goal: {dailyGoal}/day · {dailyGoal*Math.max(stats.days,1)} this period</div>}
         {/* Progress bar — visually capped at 100%, glows when over */}
         {pct!==null&&(
          <div style={{height:"4px",borderRadius:"3px",background:"var(--bg-3)",marginBottom:"10px",overflow:"hidden"}}>
           <div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:mColor,borderRadius:"3px",transition:"width 0.5s",boxShadow:pct>100?"0 0 6px rgba(29,201,232,0.5)":"none"}}/>
          </div>
         )}
         {/* 12-week sparkline */}
         <div style={{...s.fac,gap:"2px",height:"28px",alignItems:"flex-end",marginBottom:"6px"}}>
          {weekVals.map((v,i)=>{
           const h = v>0 ? Math.max(3, Math.round((v/maxVal)*26)) : 2;
           const isRecent = i >= weekVals.length - 1;
           return (
            <div key={i} style={{flex:1,height:`${h}px`,background:isRecent?(v>0?m.color:"var(--bg-3)"):"rgba(255,255,255,0.12)",borderRadius:"1px",transition:"height 0.3s"}}/>
           );
          })}
         </div>
         <div style={{fontSize:"0.72rem",color:TX}}>12-week history</div>
         {/* All-time best */}
         {best&&<div style={{marginTop:"8px",paddingTop:"8px",borderTop:"1px solid var(--bg-3)",fontSize:"0.78rem",color:TD}}>
          PB: <span style={{color:m.color,...s.fw7}}>{best.val.toLocaleString()}</span> on {formatDate(best.date)}
         </div>}
        </div>
       );
      })}
     </div>
    )}
   </div>

  </div>
 );
}

// NEW Dashboard component - replaces existing one
// Solo view: personal stats. Org/community view: team leaderboards (unchanged)

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ── ChimeInModal — post composer with multi-space targeting ──────────────────
// ─────────────────────────────────────────────────────────────────────────────
function ChimeInModal({ currentUser, orgId, communities, activeSpace, prefillText, onClose }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [text, setText] = useState(prefillText || "");
 const [selectedSpaces, setSelectedSpaces] = useState(() => {
  const spaces = [];
  if (orgId && !orgId.startsWith("solo-")) spaces.push(orgId);
  if (communities?.length) spaces.push(communities[0].id);
  return spaces.slice(0,1); // default to first available
 });
 const [posting, setPosting] = useState(false);
 const [posted, setPosted] = useState(false);

 const availableSpaces = [];
 if (orgId && !orgId.startsWith("solo-")) availableSpaces.push({ id: orgId, name: "My Crews", icon: "🏢" });
 (communities||[]).forEach(c => availableSpaces.push({ id: c.id, name: c.name, icon: "🌐" }));

 function toggleSpace(id) {
  setSelectedSpaces(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
 }

 async function handlePost() {
  if (!text.trim() || !selectedSpaces.length || !currentUser) return;
  setPosting(true);
  const item = {
   id: `feed-chime-${currentUser.id}-${Date.now()}`,
   type: "win",
   userId: currentUser.id,
   userName: currentUser.name,
   userIndustry: currentUser.industry,
   text: text.trim(),
   ts: Date.now(),
   date: new Date().toISOString().slice(0,10),
  };
  await Promise.all(selectedSpaces.map(spaceId => postFeedItem(spaceId, item).catch(()=>{})));
  setPosted(true);
  setTimeout(onClose, 900);
 }

 return (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
   onClick={e=>e.target===e.currentTarget&&onClose()}>
   <div style={{background:"var(--bg-1)",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:"640px",maxHeight:"80vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 -8px 40px rgba(0,0,0,0.6)"}}>
    <div style={{padding:"16px 20px 12px",borderBottom:"1px solid var(--border-1)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
     <div style={{fontSize:"1rem",fontWeight:"800",color:"var(--text-primary)",fontFamily:F}}>Chime In</div>
     <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:"1.3rem",cursor:"pointer",padding:"2px 6px",lineHeight:1}}>✕</button>
    </div>
    <div style={{padding:"16px 20px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:"14px"}}>
     <textarea
      value={text} onChange={e=>setText(e.target.value)}
      autoFocus
      placeholder="Share your take, add context, or start a discussion…"
      rows={4}
      style={{width:"100%",background:"var(--bg-2)",border:"1px solid var(--border-1)",color:"var(--text-primary)",padding:"12px 14px",borderRadius:"12px",fontSize:"0.95rem",fontFamily:F,outline:"none",boxSizing:"border-box",resize:"vertical",lineHeight:1.6}}
     />
     {availableSpaces.length > 1 && (
      <div>
       <div style={{fontSize:"0.68rem",fontWeight:"800",color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"8px"}}>Post to:</div>
       <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
        {availableSpaces.map(sp=>(
         <button key={sp.id} onClick={()=>toggleSpace(sp.id)}
          style={{padding:"6px 12px",borderRadius:"20px",fontSize:"0.82rem",fontWeight:"700",cursor:"pointer",fontFamily:F,
           background:selectedSpaces.includes(sp.id)?"rgba(29,201,232,0.12)":"var(--bg-2)",
           border:`1px solid ${selectedSpaces.includes(sp.id)?"rgba(29,201,232,0.4)":"var(--border-1)"}`,
           color:selectedSpaces.includes(sp.id)?"var(--accent)":"var(--text-muted)",
           display:"flex",alignItems:"center",gap:"5px"}}>
          {selectedSpaces.includes(sp.id)&&<span style={{fontSize:"0.75rem"}}>✓</span>}
          {sp.icon} {sp.name}
         </button>
        ))}
       </div>
      </div>
     )}
     {availableSpaces.length === 1 && (
      <div style={{fontSize:"0.78rem",color:"var(--text-muted)"}}>Posting to: {availableSpaces[0].icon} {availableSpaces[0].name}</div>
     )}
    </div>
    <div style={{padding:"12px 20px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 20px)",flexShrink:0}}>
     {posted ? (
      <div style={{textAlign:"center",padding:"10px",fontSize:"0.9rem",color:"#4ACF86",fontWeight:"700"}}>✓ Posted!</div>
     ) : (
      <button onClick={handlePost} disabled={!text.trim()||!selectedSpaces.length||posting}
       style={{width:"100%",background:"var(--accent)",color:"#000",border:"none",padding:"13px",borderRadius:"12px",fontSize:"0.9rem",fontWeight:"800",cursor:posting?"wait":"pointer",fontFamily:F,opacity:(!text.trim()||!selectedSpaces.length)?0.5:1}}>
       {posting?"Posting…":"Post →"}
      </button>
     )}
    </div>
   </div>
  </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SpaceBriefing — AI industry briefing for org/community dashboards ────────
// ─────────────────────────────────────────────────────────────────────────────
function SpaceBriefing({ currentUser, industryConfigs, users, spaceName, orgId, communities, activeSpace }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [items, setItems] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(false);
 const [chimeItem, setChimeItem] = useState(null); // item being chimed in on

 // Determine dominant industry
 const spaceIndustry = (() => {
  const counts = {};
  (users||[]).forEach(u => { if(u.industry) counts[u.industry] = (counts[u.industry]||0)+1; });
  if(currentUser?.industry) counts[currentUser.industry] = (counts[currentUser.industry]||0)+2;
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || currentUser?.industry;
 })();
 const cfg = industryConfigs?.[spaceIndustry];

 function getCacheKey(industry) {
  const block = Math.floor(Date.now() / (4 * 3600 * 1000));
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `cadence-space-briefing-${industry}-${dateStamp}-${block}`;
 }

 useEffect(() => {
  if (!spaceIndustry) { setLoading(false); return; }
  const cacheKey = getCacheKey(spaceIndustry);
  try {
   const cached = localStorage.getItem(cacheKey);
   if (cached) { const p = JSON.parse(cached); if (p?.items?.length) { setItems(p.items); setLoading(false); return; } }
  } catch {}
  const industryLabel = cfg?.label || spaceIndustry;
  const metrics = (cfg?.weekdayMetrics||[]).map(m=>m.label).slice(0,4).join(", ");
  const nowDate = new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const prompt = `You are a sharp industry briefing writer. Write exactly 3 briefing items for a team of ${industryLabel} professionals. Their tracked metrics include: ${metrics}. Today is ${nowDate} — keep insights current, not based on stale seasonal events.

Format as JSON only — no markdown, just this:
{"items":[
  {"type":"pulse","label":"Market Pulse","headline":"...","body":"...","searchQuery":"..."},
  {"type":"tactic","label":"Team Edge","headline":"...","body":"...","searchQuery":"..."},
  {"type":"mindset","label":"The Standard","headline":"...","body":"...","searchQuery":"..."}
]}

Rules:
- Headlines: 6-10 words, specific to ${industryLabel}
- Body: 1-2 sentences, actionable or genuinely insightful
- searchQuery: 4-6 word Google search that would find a relevant article about this specific item
- No generic advice. Sound like a seasoned ${industryLabel} operator`;
  callAI({ model: "claude-sonnet-4-20250514", messages: [{ role: "user", content: prompt }], max_tokens: 600, call_type: "metric_gen" })
 }, [spaceIndustry]);

 if (error || (!loading && !items)) return null;

 const typeColors = {
  pulse:   { bg:"rgba(29,201,232,0.06)",  border:"rgba(29,201,232,0.18)",  label:"var(--accent)" },
  tactic:  { bg:"rgba(74,207,134,0.06)",  border:"rgba(74,207,134,0.18)",  label:"#4ACF86" },
  mindset: { bg:"rgba(168,85,247,0.06)",  border:"rgba(168,85,247,0.18)",  label:"#A855F7" },
 };

 return (
  <div style={{display:"flex",flexDirection:"column",gap:"10px",paddingBottom:"14px"}}>
   <div style={{fontSize:"0.68rem",fontWeight:"800",color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.12em"}}>
    Daily Briefing {cfg?.label ? `· ${cfg.label}` : ""}
   </div>
   {loading && [1,2,3].map(i=>(
    <div key={i} style={{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"12px",padding:"14px 16px",opacity:0.4}}>
     <div style={{width:"60px",height:"8px",background:"var(--bg-3)",borderRadius:"4px",marginBottom:"8px"}}/>
     <div style={{width:"80%",height:"10px",background:"var(--bg-3)",borderRadius:"4px",marginBottom:"6px"}}/>
     <div style={{width:"95%",height:"8px",background:"var(--bg-3)",borderRadius:"4px"}}/>
    </div>
   ))}
   {!loading && items && items.map((item,i)=>{
    const colors = typeColors[item.type] || typeColors.pulse;
    return (
     <div key={i} style={{background:colors.bg,border:`1px solid ${colors.border}`,borderRadius:"12px",padding:"14px 16px"}}>
      <div style={{fontSize:"0.65rem",fontWeight:"800",color:colors.label,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"5px"}}>{item.label}</div>
      <div style={{fontSize:"0.9rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F,lineHeight:1.3,marginBottom:"5px"}}>{item.headline}</div>
      <div style={{fontSize:"0.82rem",color:"var(--text-muted)",lineHeight:1.55,marginBottom:"10px"}}>{item.body}</div>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
       <button onClick={()=>setChimeItem(item)}
        style={{padding:"5px 12px",borderRadius:"8px",fontSize:"0.75rem",fontWeight:"700",cursor:"pointer",fontFamily:F,background:"rgba(29,201,232,0.1)",border:"1px solid rgba(29,201,232,0.25)",color:"var(--accent)",WebkitTapHighlightColor:"transparent"}}>
        💬 Chime In
       </button>
       {item.searchQuery && (
        <button onClick={()=>window.dispatchEvent(new CustomEvent("cadence:pacer-prompt",{detail:`Ask Pacer about: "${item.headline}". ${item.body}`}))}
         style={{padding:"5px 12px",borderRadius:"8px",fontSize:"0.75rem",fontWeight:"700",cursor:"pointer",fontFamily:F,background:"transparent",border:"1px solid var(--border-1)",color:"var(--text-muted)",WebkitTapHighlightColor:"transparent"}}>
         Ask Pacer ⚡
        </button>
       )}
      </div>
     </div>
    );
   })}
   {chimeItem && (
    <ChimeInModal
     currentUser={currentUser}
     orgId={orgId}
     communities={communities}
     activeSpace={activeSpace}
     prefillText={`Re: "${chimeItem.headline}" — `}
     onClose={()=>setChimeItem(null)}
    />
   )}
  </div>
 );
}

export function Dashboard({
 currentUser, users, allUsersData, allUserGoals, industryConfigs,
 teams, admins, spaceType, spaceName, communities, communityMembers,
 orgId, activeSpaceFilter, onNavigate, onPostWin, onOpenDm, presenceMap,
 showReflectionPrompt, setShowReflectionPrompt, reflectionDismissedKey, setReflectionDismissedKey,
 onViewProfile
}) {
 const isSolo = !(communities && communities.length > 0) || activeSpaceFilter === "solo";
 const myData = currentUser ? (allUsersData[currentUser.id] || {}) : {};
 const myCfg = currentUser ? (industryConfigs[currentUser.industry] || Object.values(industryConfigs)[0]) : null;
 const myGoals = currentUser ? (allUserGoals[currentUser.id] || {}) : {};
 const now = todayStr();

 if (isSolo && currentUser) {
  return <SoloDashboard
   currentUser={currentUser}
   myData={myData}
   myCfg={myCfg}
   myGoals={myGoals}
   now={now}
   onNavigate={onNavigate}
  />;
 }

 // ── ORG / COMMUNITY DASHBOARD ────────────────────────────────────────
 const isMobileDB = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 600;
 const [feed, setFeed] = useState([]);
 const [winText, setWinText] = useState("");
 const [postPhoto, setPostPhoto] = useState(null); // { file, previewUrl, type:"image"|"gif", url? }
 const [photoUploading, setPhotoUploading] = useState(false);
 const [showGifPicker, setShowGifPicker] = useState(false);
 const [composerFocused, setComposerFocused] = useState(false);
 const composerRef = useRef(null);

 // Clipboard paste → attach image to post from anywhere on page
 useEffect(() => {
  function handlePaste(e) {
   // Skip if user is typing in an unrelated input (messages, search, etc.)
   const tag = document.activeElement?.tagName;
   const isOtherInput = (tag === "INPUT" || tag === "TEXTAREA") && !composerRef.current?.contains(document.activeElement);
   if (isOtherInput) return;
   const items = e.clipboardData?.items;
   if (!items) return;
   for (const item of items) {
    if (item.type.startsWith("image/")) {
     const file = item.getAsFile();
     if (!file) continue;
     const previewUrl = URL.createObjectURL(file);
     setPostPhoto({ file, previewUrl, type: "image" });
     e.preventDefault();
     break;
    }
   }
  }
  document.addEventListener("paste", handlePaste);
  return () => document.removeEventListener("paste", handlePaste);
 }, []);
 const [postType, setPostType] = useState(null); // null | "win" | "shoutout"
 const [shoutoutTarget, setShoutoutTarget] = useState("");
 const [posting, setPosting] = useState(false);
 const [feedLoading, setFeedLoading] = useState(true);
 const [activeSpaceTab, setActiveSpaceTab] = useState(null);
 const [feedFilter, setFeedFilter] = useState("today");
 const [showMembers, setShowMembers] = useState(false);
 const [invCopied, setInvCopied] = useState(false);
 const [invLoading, setInvLoading] = useState(false);
 const [showRightPanel, setShowRightPanel] = useState("standings"); // "standings" | "challenges" | "mvp"

 // Compute streaks for all users
 const streaks = useMemo(() => {
  const out = {};
  for (const u of users) {
   const data = allUsersData[u.id] || {};
   out[u.id] = computeStreak(data);
  }
  return out;
 }, [users, allUsersData]);

 // Detect milestones (100% day) and auto-post + notify
 const prevMyPctRef = useRef(0);
 const milestonePostedTodayRef = useRef(false);
 useEffect(() => { (async () => {
  if (!currentUser || !activeSpace) return;
  const data = (allUsersData[currentUser.id] || {})[now] || {};
  const cfg = industryConfigs[currentUser.industry] || Object.values(industryConfigs)[0];
  const goals = allUserGoals[currentUser.id] || {};
  const wdMets = (cfg?.weekdayMetrics || []).filter(m => (goals[m.key] ?? m.defaultGoal) > 0);
  if (wdMets.length === 0) return;
  const pct = Math.round((wdMets.reduce((s, m) => s + Math.min(1, (data[m.key] || 0) / (goals[m.key] ?? m.defaultGoal)), 0) / wdMets.length) * 100);
  if (pct >= 100 && prevMyPctRef.current < 100 && !milestonePostedTodayRef.current) {
   milestonePostedTodayRef.current = true;
   const item = { id: `feed-${Date.now()}`, type: "milestone", userId: currentUser.id, userName: currentUser.name, userIndustry: currentUser.industry, text: `🎯 Hit 100% of today's goals!`, ts: Date.now(), date: now };
   postFeedItem(activeSpace.id, item).then(next => setFeed(next));
   // Notify all space members
   const spaceUsers = users.filter(u => u.id !== currentUser.id);
   spaceUsers.forEach(u => pushNotification(u.id, { icon: "🎯", text: `${currentUser.name} just hit 100% of their daily goals! 🔥`, link: "dashboard" }).catch(() => {}));
  }
  // Personal best detection
  if (!isWeekend(now)) {
   for (const m of wdMets) {
    const val = data[m.key] || 0;
    if (val === 0) continue;
    const allVals = Object.entries(allUsersData[currentUser.id] || {}).filter(([d]) => !isWeekend(d) && d !== now).map(([, v]) => v?.[m.key] || 0);
    const prevBest = Math.max(0, ...allVals);
    if (val > prevBest && prevBest > 0) {
     const item = { id: `feed-pb-${Date.now()}-${m.key}`, type: "milestone", subtype: "pb", userId: currentUser.id, userName: currentUser.name, userIndustry: currentUser.industry, text: `🏆 New personal best: ${val} ${m.label}${prevBest > 0 ? ` (previous: ${prevBest})` : ""}`, ts: Date.now(), date: now };
     postFeedItem(activeSpace.id, item).then(next => setFeed(next));
     const spaceUsersForPb = users.filter(u => u.id !== currentUser.id);
     spaceUsersForPb.forEach(u => pushNotification(u.id, { icon: "🏆", text: `${currentUser.name} just set a personal best: ${val} ${m.label}`, link: "dashboard" }).catch(() => {}));
    }
   }
  }

  // ── Streak milestone auto-posts ─────────────────────────────────────────
  const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365];
  const myAllData = allUsersData[currentUser.id] || {};
  const freshStreak = computeStreak(myAllData);
  if (STREAK_MILESTONES.includes(freshStreak.current)) {
   const smKey = `cadence-sm-${currentUser.id}-${freshStreak.current}`;
   try {
    const alreadyPosted = await storageGet(smKey);
    if (!alreadyPosted) {
     await storageSet(smKey, "1");
     const milestoneEmoji = freshStreak.current >= 90 ? "🏆" : freshStreak.current >= 30 ? "🔥" : "⚡";
     const milestoneLabel = freshStreak.current >= 365 ? "365-day" : `${freshStreak.current}-day`;
     const streakPost = {
      id: `feed-streak-${Date.now()}`,
      type: "milestone", subtype: "streak",
      streakDays: freshStreak.current,
      userId: currentUser.id, userName: currentUser.name, userIndustry: currentUser.industry,
      text: `${milestoneEmoji} ${milestoneLabel} streak — showing up every single day.`,
      ts: Date.now(), date: now,
     };
     postFeedItem(activeSpace.id, streakPost).then(next => setFeed(next)).catch(() => {});
     const spaceUsersForStreak = users.filter(u => u.id !== currentUser.id);
     spaceUsersForStreak.forEach(u => pushNotification(u.id, {
      icon: milestoneEmoji,
      text: `${currentUser.name} just hit a ${milestoneLabel} streak. That's consistency.`,
      link: "dashboard"
     }).catch(() => {}));
    }
   } catch {}
  }

  prevMyPctRef.current = pct;
 })(); }, [allUsersData, currentUser?.id]);

 const spaces = [
  
  ...(communities || []).map(c => ({ id: c.id, name: c.name, type: "community" })),
 ].filter(Boolean);

 const activeSpace = activeSpaceTab ? spaces.find(sp => sp.id === activeSpaceTab) || spaces[0] : spaces[0];

 // Weekly recap auto-post on Monday morning
 useEffect(() => {
  if (!currentUser || !activeSpace || users.length < 2) return;
  const today = new Date(); const dow = today.getDay();
  if (dow !== 1) return; // Only Mondays
  const wk = weekKey(now);
  loadWeeklyRecap(activeSpace.id, wk).then(existing => {
   if (existing) return; // Already posted this week
   // Compute last week stats
   const lastWeekUsers = users.map(u => {
    const data = allUsersData[u.id] || {};
    const cfg = industryConfigs[u.industry] || Object.values(industryConfigs)[0];
    const goals = allUserGoals[u.id] || {};
    const wdMets = (cfg?.weekdayMetrics || []);
    let totalPct = 0, days = 0;
    for (let i = 1; i <= 5; i++) {
     const d = new Date(today); d.setDate(d.getDate() - i - 1);
     const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
     if (isWeekend(dk)) continue;
     const dayData = data[dk] || {};
     const dayPct = wdMets.length > 0 ? wdMets.reduce((s, m) => s + Math.min(1, (dayData[m.key] || 0) / Math.max(1, goals[m.key] ?? m.defaultGoal)), 0) / wdMets.length : 0;
     if (Object.values(dayData).some(v => typeof v === "number" && v > 0)) { totalPct += dayPct; days++; }
    }
    return { ...u, weekPct: days > 0 ? Math.round((totalPct / days) * 100) : 0, days };
   }).filter(u => u.days > 0).sort((a, b) => b.weekPct - a.weekPct);
   if (lastWeekUsers.length === 0) return;
   const leader = lastWeekUsers[0];
   const mostConsistent = [...lastWeekUsers].sort((a, b) => b.days - a.days)[0];
   const text = `📊 Weekly Recap\n\n1. Top performer: ${leader.name} (${leader.weekPct}% avg)\n🎯 Most consistent: ${mostConsistent.name} (${mostConsistent.days} days logged)\n\nNew week, new goals. Let's go! 💪`;
   const item = { id: `feed-recap-${wk}`, type: "recap", userId: "system", userName: "Cadence", userIndustry: "", text, ts: Date.now(), date: now };
   postFeedItem(activeSpace.id, item).then(next => setFeed(next));
   saveWeeklyRecap(activeSpace.id, wk, { posted: true, ts: Date.now() });
  }).catch(() => {});
 }, [activeSpace?.id, users.length]);

 useEffect(() => {
  if (activeSpaceFilter && activeSpaceFilter !== "solo") setActiveSpaceTab(activeSpaceFilter);
  else setActiveSpaceTab(null);
 }, [activeSpaceFilter]);

 // Show weekly reflection prompt on Fri/Sat/Sun if not yet done this week
 useEffect(() => {
  if (!currentUser) return;
  const dow = new Date().getDay(); // 0=Sun,5=Fri,6=Sat
  if (dow !== 0 && dow !== 5 && dow !== 6) return;
  const wk = weekKey(now);
  if (reflectionDismissedKey === wk) return;
  loadWeeklyReflection(currentUser.id, wk).then(existing => {
   if (!existing) setShowReflectionPrompt(true);
  });
 }, [currentUser?.id]);

 useEffect(() => {
  if(!activeSpace) return;
  setFeedLoading(true);
  loadFeed(activeSpace.id).then(items => { setFeed(items); setFeedLoading(false); })
  if (currentUser) loadJournalSettings(currentUser.id).then(s => setJournalSettings(s)).catch(()=>{});
  const iv = setInterval(() => {
   loadFeed(activeSpace.id).then(items => setFeed(items)).catch(()=>{});
  }, 10000);
  return () => clearInterval(iv);
 }, [activeSpace?.id]);

 const isWeekendToday = isWeekend(now);

 const myTodayPct = (() => {
  if(!currentUser) return 0;
  const data = (allUsersData[currentUser.id] || {})[now] || {};
  const cfg = industryConfigs[currentUser.industry] || Object.values(industryConfigs)[0];
  const goals = allUserGoals[currentUser.id] || {};
  return computeGoalPct(data, cfg.weekdayMetrics, goals);
 })();

 const todayRanking = useMemo(() => {
  if(!users || users.length === 0) return [];
  return users.map(u => {
   const data = (allUsersData[u.id] || {})[now] || {};
   const cfg = industryConfigs[u.industry] || Object.values(industryConfigs)[0];
   const goals = allUserGoals[u.id] || {};
   const pct = computeGoalPct(data, cfg.weekdayMetrics, goals);
   return { ...u, pct };
  }).filter(u => u.pct > 0).sort((a,b) => b.pct - a.pct);
 }, [users, allUsersData, allUserGoals, industryConfigs, now]);

 const monthLeaders = useMemo(() => {
  return users.map(u => {
   const data = allUsersData[u.id] || {};
   const cfg = industryConfigs[u.industry] || Object.values(industryConfigs)[0];
   const goals = allUserGoals[u.id] || {};
   let totalPct = 0, days = 0;
   for(const [date, d] of Object.entries(data)) {
    if(isWeekend(date) || !d || monthKey(date) !== monthKey(now)) continue;
    totalPct += computeGoalPct(d, cfg.weekdayMetrics, goals);
    days++;
   }
   return { ...u, avgPct: days > 0 ? Math.round(totalPct/days) : 0, days };
  }).filter(u => u.days > 0).sort((a,b) => b.avgPct - a.avgPct).slice(0, 5);
 }, [users, allUsersData, allUserGoals, industryConfigs, now]);

 async function handlePostWin() {
  if((!winText.trim() && !postPhoto) || !currentUser || !activeSpace) return;
  setPosting(true);
  const fullText = postType === "shoutout" && shoutoutTarget ? `@${shoutoutTarget} ${winText.trim()}` : winText.trim();
  let imageUrl = null;
  if (postPhoto?.type === "gif" && postPhoto?.url) {
   // GIF — already a public URL, no upload needed
   imageUrl = postPhoto.url;
  } else if (postPhoto?.file) {
   // Image file — upload to Supabase Storage
   setPhotoUploading(true);
   const ext = postPhoto.file.name.split(".").pop() || "jpg";
   const path = `posts/${activeSpace.id}/${currentUser.id}-${Date.now()}.${ext}`;
   const { data: upData, error: upErr } = await window._sb.storage.from("post-images").upload(path, postPhoto.file, { contentType: postPhoto.file.type });
   if (!upErr) {
    const { data: urlData } = window._sb.storage.from("post-images").getPublicUrl(path);
    imageUrl = urlData?.publicUrl || null;
   }
   setPhotoUploading(false);
  }
  const item = { id: `feed-${Date.now()}`, type: postType, userId: currentUser.id, userName: currentUser.name, userIndustry: currentUser.industry, text: fullText, imageUrl, ts: Date.now(), date: now };
  const next = await postFeedItem(activeSpace.id, item);
  setFeed(next); setWinText(""); setPostPhoto(null); setPosting(false);
  if(onPostWin) onPostWin(item);
  // Notify @mentions
  const mentioned = parseMentions(fullText, users);
  for (const mu of mentioned) {
   if (mu.id !== currentUser.id) await pushNotification(mu.id, { icon: postType === "shoutout" ? "🙌" : "📣", text: `${currentUser.name} mentioned you: "${fullText.slice(0,80)}"`, link: "dashboard" }).catch(()=>{});
  }
 }

 function relTime(ts) {
  const diff = Date.now() - ts;
  if(diff < 60000) return "just now";
  if(diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if(diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
 }

 const typeColor = { org: "#1DC9E8", community: "#7B6FD8" };
 const typeIcon  = { org: "🏢", community: "🌐" };

 // Shared card style
 const card = {
  background:"var(--bg-1)",
  border:"1px solid var(--border-1)",
  borderRadius:"16px",
  overflow:"hidden",
 };
 const sectionLabel = {
  fontSize:"0.68rem",
  color:"var(--text-muted)",
  textTransform:"uppercase",
  letterSpacing:"0.14em",
  fontWeight:"700",
 };

 const pctColor = (p) => p>=100?"#1DC9E8":p>=60?"#F59E0B":p>0?"#F43F5E":"var(--text-dim)";
 const myInd = currentUser ? (industryConfigs[currentUser.industry]||{icon:"◆",label:currentUser.industry}) : {};

 return (
  <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>

   {/* ── Space selector (if multiple) ─────────────────────────────── */}
   {spaces.length > 1 && (
    <div style={{display:"flex",gap:"6px",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",paddingBottom:"2px"}}>
     {spaces.map(sp => {
      const isActive = activeSpace?.id === sp.id;
      return (
       <button key={sp.id} onClick={() => setActiveSpaceTab(sp.id)} style={{
        background: isActive ? `${typeColor[sp.type]}18` : "var(--bg-1)",
        border: `1px solid ${isActive ? typeColor[sp.type]+"44" : "var(--border-1)"}`,
        color: isActive ? typeColor[sp.type] : "var(--text-muted)",
        padding:"8px 14px", borderRadius:"10px", fontSize:"0.85rem",
        fontFamily:F, cursor:"pointer", fontWeight:"600",
        display:"flex", alignItems:"center", gap:"6px",
        whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s",
       }}>
        {typeIcon[sp.type]} {sp.name}
       </button>
      );
     })}
    </div>
   )}

   {/* ── Hero: My Today Snapshot ──────────────────────────────────── */}
   {currentUser && (() => {
    const myCfgNow = industryConfigs[currentUser.industry] || Object.values(industryConfigs)[0];
    const myGoalsNow = allUserGoals[currentUser.id] || {};
    const myTodayData = (allUsersData[currentUser.id] || {})[now] || {};
    const wdMets = (myCfgNow?.weekdayMetrics || []).filter(m => (myGoalsNow[m.key] ?? m.defaultGoal) > 0);
    return (
     <div style={{...card,border:myTodayPct>=100?"1px solid rgba(29,201,232,0.25)":"1px solid var(--border-1)"}}>
      {/* Top progress stripe */}
      {!isWeekendToday && (
       <div style={{height:"3px",background:"var(--bg-3)"}}>
        <div style={{height:"100%",width:`${Math.min(100,myTodayPct)}%`,background:myTodayPct>=100?"#1DC9E8":myTodayPct>=60?"#F59E0B":"#F43F5E",transition:"width 0.6s ease"}}/>
       </div>
      )}
      {/* Identity row */}
      <div style={{padding:"14px 18px 12px",display:"flex",alignItems:"center",gap:"12px",borderBottom:"1px solid var(--border-1)"}}>
       <div style={{width:"40px",height:"40px",borderRadius:"12px",background:currentUser.avatarColor||initialsColor(currentUser.name,currentUser.accentColor),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",fontWeight:"800",color:"#fff",flexShrink:0}}>
        {currentUser.name.charAt(0).toUpperCase()}
       </div>
       <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:"0.95rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentUser.name}</div>
        <div style={{fontSize:"0.78rem",color:"var(--text-muted)",marginTop:"1px",display:"flex",alignItems:"center",gap:"5px"}}>
         {myInd.icon} {myInd.label||currentUser.industry}
         {admins.includes(currentUser.id) && <span style={{color:"rgba(29,201,232,0.55)",fontWeight:"700",fontSize:"0.68rem",letterSpacing:"0.07em"}}>ADMIN</span>}
        </div>
       </div>
       <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
        {isWeekendToday ? (
         <span style={{fontSize:"1.4rem"}}>🏖</span>
        ) : (
         <div style={{textAlign:"right"}}>
          <div style={{fontSize:"1.5rem",fontWeight:"800",fontFamily:"'DM Sans',system-ui,sans-serif",color:pctColor(myTodayPct),lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{myTodayPct}%</div>
          <div style={{fontSize:"0.62rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:"700",marginTop:"2px"}}>today</div>
         </div>
        )}
        {(() => {
         const _h = new Date().getHours();
         const _wknd = isWeekendToday;
         let _lbl = "Get to Work";
         if (_wknd) _lbl = "Log Overtime";
         else if (_h >= 21 || _h < 6) _lbl = "Log Anything";
         else if (_h >= 18) _lbl = myTodayPct >= 100 ? "Day Complete ✓" : "Log the Day";
         else if (myTodayPct >= 100) _lbl = "Don't Slow Down";
         return (
          <button onClick={()=>onNavigate("workspace")} style={{background:"linear-gradient(135deg,#1DC9E8 0%,#0EA5C9 100%)",border:"none",color:"#000",padding:"7px 14px",borderRadius:"9px",fontSize:"0.8rem",cursor:"pointer",fontFamily:F,fontWeight:"900",whiteSpace:"nowrap",WebkitTapHighlightColor:"transparent",letterSpacing:"-0.01em"}}>
           {_lbl}
          </button>
         );
        })()}
       </div>
      </div>
      {/* Per-metric mini grid */}
      {!isWeekendToday && wdMets.length > 0 && (
       <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(wdMets.length,4)},1fr)`,gap:"0",padding:"0"}}>
        {wdMets.slice(0,8).map((m,i) => {
         const val = myTodayData[m.key] || 0;
         const goal = myGoalsNow[m.key] ?? m.defaultGoal;
         const mpct = goal > 0 ? Math.round((val/goal)*100) : null;
         const hit = mpct !== null && mpct >= 100;
         const borderR = i < wdMets.length - 1 ? "1px solid var(--border-1)" : "none";
         return (
          <div key={m.key} style={{padding:"10px 12px",borderRight:borderR,borderTop:"1px solid var(--border-1)",position:"relative",overflow:"hidden",cursor:"pointer"}} onClick={()=>onNavigate("workspace")} title={`${m.label}: ${val}${goal?"/"+goal:""}`}>
           {/* Mini progress bar at bottom */}
           {mpct!==null&&(
            <div style={{position:"absolute",bottom:0,left:0,right:0,height:"2px",background:"var(--bg-3)"}}>
             <div style={{height:"100%",width:`${Math.min(100,mpct)}%`,background:hit?"#1DC9E8":mpct>=60?"#F59E0B":"#F43F5E",transition:"width 0.4s",boxShadow:mpct>100?"0 0 4px rgba(29,201,232,0.5)":"none"}}/>
            </div>
           )}
           <div style={{fontSize:"0.65rem",color:(mpct!==null&&mpct>=100)?"#1DC9E8":"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.09em",fontWeight:"700",marginBottom:"4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.short||m.label}</div>
           <div style={{fontSize:"1.2rem",fontWeight:"800",fontFamily:"'DM Sans',system-ui,sans-serif",color:(mpct!==null&&mpct>=100)?"#1DC9E8":"var(--text-primary)",lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{val}</div>
           {goal>0&&<div style={{fontSize:"0.65rem",color:(mpct!==null&&mpct>=100)?"rgba(29,201,232,0.6)":"var(--text-dim)",marginTop:"2px"}}>{mpct!==null&&mpct>100?`${mpct}%`:`/ ${goal}`}</div>}
          </div>
         );
        })}
       </div>
      )}
      {isWeekendToday && (() => {
       const _loggedMets = (myCfgNow?.weekdayMetrics||[]).filter(m => (myTodayData[m.key]||0) > 0);
       return (
        <div style={{padding:"14px 18px"}}>
         {_loggedMets.length > 0 ? (
          <>
           <div style={{fontSize:"0.65rem",fontWeight:"800",color:"#4ACF86",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"8px"}}>⏱ Overtime</div>
           <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
            {_loggedMets.map(m => (
             <div key={m.key} style={{background:"rgba(74,207,134,0.08)",border:"1px solid rgba(74,207,134,0.2)",borderRadius:"8px",padding:"6px 10px",fontSize:"0.78rem",color:"#4ACF86",fontWeight:"700"}}>
              {m.short||m.label} <span style={{fontWeight:"900"}}>{myTodayData[m.key]}</span>
             </div>
            ))}
           </div>
          </>
         ) : (
          <div style={{fontSize:"0.85rem",color:"var(--text-muted)"}}>Weekend — rest up 🌿</div>
         )}
        </div>
       );
      })()}
     </div>
    );
   })()}

   {/* ── Daily Briefing — always at top, single column full-width ── */}
   {(spaceType === "community" || spaceType === "org") && (
    <SpaceBriefing
     currentUser={currentUser}
     industryConfigs={industryConfigs}
     users={users}
     spaceName={spaceName}
     orgId={activeSpaceFilter}
     communities={communities}
     activeSpace={activeSpace}
     onPostToFeed={item => { postFeedItem(activeSpace.id, item).then(next => setFeed(next)); if(onPostWin) onPostWin(item); }}
    />
   )}

   {/* ── Two-column grid on desktop, single column on mobile ──── */}
   <div style={{
    display:"grid",
    gridTemplateColumns:isMobileDB?"1fr":"1fr 1fr",
    gap:"16px",
    alignItems:"start",
   }}>

    {/* LEFT: Feed ───────────────────────────────────────────────── */}
    <div style={{...card}}>
     <div data-tour-composer style={{padding:"16px 18px 12px",borderBottom:"1px solid var(--border-1)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
       <div>
        <div style={{fontSize:"0.9rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F}}>Activity Feed</div>
        {activeSpace&&<div style={{fontSize:"0.75rem",color:typeColor[activeSpace.type]||"var(--text-muted)",marginTop:"2px",fontWeight:"600"}}>{activeSpace.name}</div>}
       </div>
      </div>
      {/* Challenge/accountability CTAs */}
      <div style={{display:"flex",gap:"7px",marginTop:"12px",flexWrap:"wrap"}}>
       <button onClick={()=>onNavigate("compete")} style={{background:"rgba(29,201,232,0.1)",border:"1px solid rgba(29,201,232,0.25)",color:"var(--accent)",borderRadius:"20px",padding:"6px 14px",fontSize:"0.78rem",fontWeight:"700",cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:"6px",WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>
        ⚡ Start a Challenge
       </button>
       <button onClick={()=>onNavigate("compete")} style={{background:"rgba(74,207,134,0.1)",border:"1px solid rgba(74,207,134,0.25)",color:"#4ACF86",borderRadius:"20px",padding:"6px 14px",fontSize:"0.78rem",fontWeight:"700",cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:"6px",WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>
        👥 Start Accountability Group
       </button>
      </div>
     </div>
     {/* Post composer */}
     <div ref={composerRef} style={{padding:"12px 16px",borderBottom:"1px solid var(--border-1)",position:"relative"}}>
      {/* Avatar + input row */}
      <div style={{display:"flex",gap:"10px",alignItems:"flex-start"}}>
       <div style={{width:"32px",height:"32px",borderRadius:"50%",background:currentUser?initialsColor(currentUser.name,currentUser.accentColor):"var(--bg-3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",fontWeight:"800",color:"#fff",flexShrink:0,marginTop:"2px"}}>
        {currentUser?.name?.charAt(0).toUpperCase()||"?"}
       </div>
       <div style={{flex:1,minWidth:0}}>
        <MentionInput
         value={winText}
         onChange={setWinText}
         onSubmit={handlePostWin}
         onFocus={()=>setComposerFocused(true)}
         allUsers={users}
         placeholder="Share a win, update, or milestone..."
         multiline={true}
         style={{minHeight:"72px",borderRadius:"14px",fontSize:"0.92rem"}}
        />
        {/* Expanded controls — only after focus or if media attached */}
        {(composerFocused || postPhoto) && (
         <div style={{marginTop:"10px"}}>
          {/* Post type + shoutout target on one row */}
          <div style={{display:"flex",gap:"6px",alignItems:"center",marginBottom:"8px",flexWrap:"wrap"}}>
           {[["win","Win"],["shoutout","Shoutout"]].map(([t,l])=>(
            <button key={t} onClick={()=>setPostType(prev=>prev===t?null:t)} style={{background:postType===t?"var(--bg-3)":"none",border:`1px solid ${postType===t?"var(--border-2)":"var(--border-1)"}`,color:postType===t?"var(--text-primary)":"var(--text-muted)",padding:"5px 12px",borderRadius:"20px",fontSize:"0.78rem",cursor:"pointer",fontFamily:F,fontWeight:postType===t?"700":"500",WebkitTapHighlightColor:"transparent",minHeight:"32px"}}>{l}</button>
           ))}
           {postType==="shoutout"&&(
            <select style={{flex:1,background:"var(--bg-2)",border:"1px solid var(--border-1)",color:shoutoutTarget?"var(--text-primary)":"var(--text-muted)",padding:"5px 10px",borderRadius:"20px",fontSize:"0.78rem",fontFamily:F,minHeight:"32px",cursor:"pointer"}} value={shoutoutTarget} onChange={e=>setShoutoutTarget(e.target.value)}>
             <option value="">Who?</option>
             {users.filter(u=>u.id!==currentUser?.id).map(u=><option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
           )}
          </div>
          {/* Quick prompts — only when a type is selected */}
          {!winText && postType && (
           <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
            {(postType==="shoutout"
             ? ["Huge help today","Always delivering"]
             : ["Showed up","Big win today"]
            ).map(t=>(
             <button key={t} onClick={()=>setWinText(t)} style={{background:"var(--bg-2)",border:"1px solid var(--border-1)",color:"var(--text-muted)",padding:"5px 12px",borderRadius:"16px",fontSize:"0.78rem",cursor:"pointer",fontFamily:F,whiteSpace:"nowrap",WebkitTapHighlightColor:"transparent"}}>{t}</button>
            ))}
           </div>
          )}
          {/* Media + post row — Photo/GIF only shown after focus */}
          <div style={{display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
           <label style={{display:"flex",alignItems:"center",gap:"5px",color:"var(--text-muted)",fontSize:"0.8rem",fontWeight:"600",cursor:"pointer",padding:"4px 0",WebkitTapHighlightColor:"transparent",fontFamily:F}}>
            📷 Photo
            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
             const file = e.target.files?.[0];
             if(!file) return;
             setPostPhoto({file, previewUrl:URL.createObjectURL(file), type:"image"});
             setShowGifPicker(false);
             e.target.value="";
            }}/>
           </label>
           <button onClick={()=>setShowGifPicker(v=>!v)} style={{background:"none",border:"none",color:showGifPicker?"var(--accent)":"var(--text-muted)",fontSize:"0.8rem",cursor:"pointer",fontFamily:F,fontWeight:"600",padding:"4px 0",WebkitTapHighlightColor:"transparent"}}>
            GIF
           </button>
           {postPhoto && (
            <div style={{position:"relative",display:"inline-block"}}>
             <img src={postPhoto.previewUrl||postPhoto.url} alt="preview" style={{height:"44px",width:"44px",objectFit:"cover",borderRadius:"8px",border:"1px solid var(--border-1)"}}/>
             <button onClick={()=>setPostPhoto(null)} style={{position:"absolute",top:"-6px",right:"-6px",width:"20px",height:"20px",borderRadius:"50%",background:"#E05577",border:"none",color:"#fff",fontSize:"0.7rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,fontWeight:"800",WebkitTapHighlightColor:"transparent"}}>✕</button>
            </div>
           )}
           {(winText.trim()||postPhoto) && (
            <button style={{marginLeft:"auto",background:"var(--accent)",color:"#000",border:"none",padding:"7px 18px",borderRadius:"10px",fontWeight:"700",fontFamily:F,cursor:"pointer",fontSize:"0.85rem",WebkitTapHighlightColor:"transparent"}} disabled={posting||photoUploading} onClick={handlePostWin}>{posting||photoUploading?"...":"Post"}</button>
           )}
          </div>
          {/* GIF picker popup */}
          {showGifPicker && (
           <GifPicker
            onSelect={gif => {
             setPostPhoto({ url: gif.url, previewUrl: gif.previewUrl, type: "gif" });
             setShowGifPicker(false);
            }}
            onClose={() => setShowGifPicker(false)}
           />
          )}
         </div>
        )}
       </div>
      </div>
     </div>
     {/* Weekly reflection — full-screen modal */}
     {showReflectionPrompt && currentUser && (
      <ReflectionModal
       currentUser={currentUser}
       industryConfig={myCfg}
       weekKeyStr={weekKey(now)}
       myData={myData}
       myGoals={myGoals}
       onClose={() => { setShowReflectionPrompt(false); setReflectionDismissedKey(weekKey(now)); }}
       onPostToFeed={reflection => {
        setShowReflectionPrompt(false);
        const parts = [];
        if (reflection.movedNeedle) parts.push(reflection.movedNeedle);
        if (reflection.intention) parts.push(`This week I'm focused on: ${reflection.intention}`);
        if (reflection.wins) parts.push(`Results: ${reflection.wins}`);
        const feedItem = {
         id: `feed-reflect-${currentUser.id}-${Date.now()}`,
         type: "reflection",
         userId: currentUser.id,
         userName: currentUser.name,
         userIndustry: currentUser.industry,
         movedNeedle: reflection.movedNeedle,
         intention: reflection.intention,
         text: parts.join("\n\n"),
         ts: Date.now(),
         date: todayStr(),
        };
        postFeedItem(activeSpace.id, feedItem).then(next => setFeed(next));
       }}
      />
     )}
     {/* Feed filter tabs */}
     <div style={{display:"flex",gap:"0",borderBottom:"1px solid var(--border-1)"}}>
      {[["today","Today"],["week","This Week"],["month","This Month"],["all","All Time"]].map(([key,label])=>(
       <button key={key} onClick={()=>setFeedFilter(key)} style={{
        flex:1,background:"none",border:"none",borderBottom:feedFilter===key?"2px solid var(--accent)":"2px solid transparent",
        color:feedFilter===key?"var(--accent)":"var(--text-muted)",
        padding:"8px 4px",fontSize:"0.75rem",cursor:"pointer",fontFamily:F,fontWeight:feedFilter===key?"700":"500",
        transition:"all 0.15s",WebkitTapHighlightColor:"transparent",
       }}>{label}</button>
      ))}
     </div>
     {/* Feed items */}
     <div style={{maxHeight:"480px",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      {feedLoading ? (
       <div style={{padding:"20px 16px",fontSize:"0.9rem",color:"var(--text-dim)",textAlign:"center"}}>Loading...</div>
      ) : (()=>{
       const nowMs = Date.now();
       const filteredFeed = feed.filter(item=>{
        if(feedFilter==="all") return true;
        const age = nowMs - item.ts;
        if(feedFilter==="today") return age < 86400000;
        if(feedFilter==="week") return age < 604800000;
        if(feedFilter==="month") return age < 2592000000;
        return true;
       });
       if(filteredFeed.length===0) return (
        <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:"14px"}}>
         {feed.length===0 ? (
          <div style={{textAlign:"center",padding:"20px 8px"}}>
           {users.length<=1&&(
            <div style={{background:"rgba(123,111,216,0.08)",border:"1px solid rgba(123,111,216,0.2)",borderRadius:"12px",padding:"14px 16px",marginBottom:"14px",textAlign:"left"}}>
             <div style={{fontSize:"0.82rem",color:"#9B8FE8",fontWeight:"700",marginBottom:"4px"}}>👥 Invite your people</div>
             <div style={{fontSize:"0.82rem",color:"var(--text-muted)",lineHeight:1.5}}>Accountability is better together. Share your invite link to get your crew going.</div>
            </div>
           )}
           <div style={{fontSize:"1.8rem",marginBottom:"8px",opacity:0.5}}>👋</div>
           <div style={{fontSize:"0.88rem",color:"var(--text-muted)",lineHeight:1.6,marginBottom:"14px"}}>No posts yet — be the first to share a win.</div>
           <button onClick={()=>document.querySelector('input[placeholder*="Share a win"], textarea[placeholder*="Share a win"]')?.focus()} style={{background:"var(--accent)",color:"#000",border:"none",padding:"10px 20px",borderRadius:"10px",fontSize:"0.88rem",fontWeight:"700",cursor:"pointer",fontFamily:F,minHeight:"44px"}}>
            Post your first win →
           </button>
          </div>
         ) : (
          <div style={{textAlign:"center",padding:"16px 8px"}}>
           <div style={{fontSize:"1.5rem",marginBottom:"8px",opacity:0.3}}>🏆</div>
           <div style={{fontSize:"0.9rem",color:"var(--text-dim)"}}>No posts in this time period.</div>
          </div>
         )}
        </div>
       );
       return (
       <div data-tour-feedlist>
        {filteredFeed.map((item, idx) => (
         <FeedPost
          key={item.id}
          item={item}
          currentUser={currentUser}
          industryConfigs={industryConfigs}
          spaceId={activeSpace.id}
          onFeedUpdate={setFeed}
          isLast={idx === filteredFeed.length - 1}
          allUsers={users}
          streaks={streaks}
          isAdmin={admins.includes(currentUser?.id)}
          onViewProfile={onViewProfile}
         />
        ))}
       </div>
       );
      })()
     }
     </div>
    </div>

    {/* RIGHT: Stats panels ───────────────────────────────────────── */}
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>

     {/* Panel tabs — Standings + MVP only; Compete/Pairs are their own cards below */}
     <div style={{display:"flex",gap:"0",background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"10px",overflow:"hidden"}}>
      {[["standings","📊 Standings"],["mvp","👑 MVP"]].map(([t,l])=>(
       <button key={t} onClick={()=>setShowRightPanel(t)} style={{flex:1,background:showRightPanel===t?"var(--bg-3)":"none",border:"none",borderBottom:showRightPanel===t?"2px solid var(--accent)":"2px solid transparent",color:showRightPanel===t?"var(--accent)":"var(--text-muted)",padding:"9px 4px",fontSize:"0.82rem",cursor:"pointer",fontFamily:F,fontWeight:showRightPanel===t?"700":"500",WebkitTapHighlightColor:"transparent",transition:"all 0.15s",minHeight:"44px",whiteSpace:"nowrap"}}>{l}</button>
      ))}
     </div>

     {/* Today's leaderboard */}
     {showRightPanel==="standings" && todayRanking.length > 0 && (
      <div style={card}>
       <div style={{padding:"14px 16px 10px"}}>
        <div style={{...sectionLabel,marginBottom:"12px"}}>Today's Standings</div>
        {todayRanking.slice(0,5).map((u,i) => {
         const isMe = u.id === currentUser?.id;
         const medals = ["🥇","🥈","🥉"];
         const uStreak = streaks[u.id]?.current || 0;
         return (
          <div key={u.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"7px 0",borderBottom:i<Math.min(todayRanking.length,5)-1?"1px solid var(--bg-3)":"none"}}>
           <div style={{width:"24px",textAlign:"center",fontSize:"0.95rem",flexShrink:0}}>
            {medals[i]||<span style={{fontSize:"0.82rem",color:"var(--text-dim)",fontFamily:F}}>{i+1}</span>}
           </div>
           <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"0.9rem",color:isMe?"var(--accent)":"var(--text-primary)",fontWeight:isMe?"700":"500",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:F}}>
             {isMe?"You ("+u.name.split(" ")[0]+")":u.name.split(" ")[0]}
            </div>
           </div>
           {uStreak>=3&&<span title={`${uStreak}-day streak`} style={{fontSize:"0.72rem",color:"#F59E0B",fontWeight:"700"}}>🔥{uStreak}</span>}
           <div style={{fontSize:"0.95rem",fontWeight:"700",color:pctColor(u.pct),fontFamily:F,flexShrink:0}}>{u.pct}%</div>
          </div>
         );
        })}
        <div style={{display:"flex",gap:"6px",marginTop:"10px"}}>
         <button onClick={()=>onNavigate("leaderboard")} style={{flex:1,background:"none",border:"1px solid var(--border-1)",color:"var(--text-muted)",padding:"7px",borderRadius:"8px",fontSize:"0.78rem",cursor:"pointer",fontFamily:F,fontWeight:"500",WebkitTapHighlightColor:"transparent"}}>
          Full Board →
         </button>
         <button onClick={()=>onNavigate("workspace")} style={{flex:2,background:"linear-gradient(135deg,#1DC9E8 0%,#0EA5C9 100%)",border:"none",color:"#000",padding:"7px 12px",borderRadius:"8px",fontSize:"0.82rem",cursor:"pointer",fontFamily:F,fontWeight:"900",WebkitTapHighlightColor:"transparent",letterSpacing:"-0.01em"}}>
          Do More
         </button>
        </div>
       </div>
      </div>
     )}
     {/* This month */}
     {showRightPanel==="standings" && monthLeaders.length > 0 && (
      <div style={card}>
       <div style={{padding:"14px 16px 12px"}}>
        <div style={{...sectionLabel,marginBottom:"12px"}}>This Month</div>
        {monthLeaders.map((u,i) => {
         const isMe = u.id === currentUser?.id;
         return (
          <div key={u.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"6px 0",borderBottom:i<monthLeaders.length-1?"1px solid var(--bg-3)":"none"}}>
           <div style={{fontSize:"0.78rem",color:"var(--text-dim)",width:"16px",textAlign:"center",flexShrink:0,fontFamily:F}}>{i+1}</div>
           <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"0.88rem",color:isMe?"var(--accent)":"var(--text-primary)",fontWeight:isMe?"700":"400",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:F}}>
             {isMe?"You":u.name.split(" ")[0]}
            </div>
            <div style={{fontSize:"0.75rem",color:"var(--text-dim)",marginTop:"1px"}}>{u.days}d active</div>
           </div>
           <div style={{fontSize:"0.9rem",fontWeight:"700",color:pctColor(u.avgPct),fontFamily:F,flexShrink:0}}>{u.avgPct}% avg</div>
          </div>
         );
        })}
       </div>
      </div>
     )}

     {/* ── Weekly MVP panel ─────────────────────────────────── */}
     {showRightPanel==="mvp" && (
      <div style={card}>
       <div style={{padding:"14px 16px 10px",borderBottom:"1px solid var(--border-1)"}}>
        <div style={sectionLabel}>👑 Weekly MVP</div>
        <div style={{fontSize:"0.75rem",color:"var(--text-muted)",marginTop:"2px"}}>Vote for who inspired you most this week</div>
       </div>
       <div style={{padding:"12px 14px"}}>
        <WeeklyMVP
         spaceId={activeSpace?.id}
         currentUser={currentUser}
         allUsers={users}
         weekKeyStr={weekKey(now)}
        />
       </div>
      </div>
     )}

     {/* Compete CTA card — leads to Compete tab */}
     <div style={{...card, padding:"16px 18px"}}>
      <div style={{fontSize:"0.72rem",fontWeight:"800",color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:"10px"}}>⚡ Compete</div>
      <div style={{fontSize:"0.85rem",color:"var(--text-muted)",marginBottom:"12px",lineHeight:1.5}}>Run challenges and accountability groups with your team.</div>
      <button onClick={()=>onNavigate("compete")} style={{width:"100%",background:"var(--accent)",color:"#000",border:"none",padding:"10px",borderRadius:"10px",fontWeight:"800",fontSize:"0.88rem",cursor:"pointer",fontFamily:F}}>
       Go to Compete →
      </button>
     </div>

     {/* ── Members panel — always visible for org/community ──── */}
     {(spaceType === "org" || spaceType === "community") && (
      <div style={{ ...card }}>
       <button
        onClick={() => setShowMembers(v => !v)}
        style={{ width: "100%", background: "none", border: "none", padding: "14px 16px", cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", justifyContent: "space-between", WebkitTapHighlightColor: "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
         <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          👥 {spaceType === "community" ? "Crew Members" : "Managed Crew Members"}
         </span>
         <span style={{ fontSize: "0.75rem", background: "var(--bg-3)", color: "var(--text-muted)", borderRadius: "10px", padding: "1px 7px", fontFamily: F }}>{users.length}</span>
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "inline-block", transform: showMembers ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▾</span>
       </button>
       {showMembers && (
        <div style={{ borderTop: "1px solid var(--border-1)" }}>
         <div style={{ maxHeight: "300px", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {users.map(u => {
           const isMe = u.id === currentUser?.id;
           const indCfg = industryConfigs[u.industry] || DEFAULT_INDUSTRIES[u.industry] || {};
           const online = isMe || isOnline(presenceMap || {}, u.id);
           const presStatus = isMe ? "online" : getPresenceStatus(presenceMap || {}, u.id);
           return (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderBottom: "1px solid var(--bg-2)" }}>
             <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: initialsColor(u.name, u.avatarColor), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: "800", color: "#fff" }}>
               {u.name.charAt(0).toUpperCase()}
              </div>
              <PresenceDot status={presStatus} size="sm" style={{ position: "absolute", bottom: 0, right: 0 }} />
             </div>
             <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: "600", color: isMe ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: F }}>
               {isMe ? `${u.name.split(" ")[0]} (You)` : u.name}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>
               {indCfg.icon || "◆"} {indCfg.label || u.industry}
              </div>
             </div>
             {!isMe && onOpenDm && (
              <button
               onClick={() => onOpenDm(u)}
               style={{ background: "var(--bg-3)", border: "1px solid var(--border-1)", color: "var(--accent)", padding: "5px 10px", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer", fontFamily: F, fontWeight: "600", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>
               💬
              </button>
             )}
            </div>
           );
          })}
         </div>
         {(spaceType === "community" || (admins && currentUser && admins.includes(currentUser.id))) && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-1)" }}>
           <button
            disabled={invLoading}
            onClick={async () => {
             setInvLoading(true);
             try {
              const token = await createInviteToken(orgId, spaceName || "Our Space", currentUser?.name || "Admin", spaceType || "community");
              await copyText(getInviteURL(token));
              setInvCopied(true);
              setTimeout(() => setInvCopied(false), 3000);
             } catch(e){ console.error(e); }
             setInvLoading(false);
            }}
            style={{ width: "100%", background: invCopied ? "rgba(74,207,134,0.12)" : "rgba(123,111,216,0.1)", border: `1px solid ${invCopied ? "rgba(74,207,134,0.4)" : "rgba(123,111,216,0.3)"}`, color: invCopied ? "#4ACF86" : "#9B8FE8", padding: "9px 14px", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: F, fontWeight: "600", WebkitTapHighlightColor: "transparent" }}>
            {invLoading ? "Generating…" : invCopied ? "✓ Invite Link Copied!" : "🔗 Copy Invite Link"}
           </button>
          </div>
         )}
        </div>
       )}
      </div>
     )}

    </div>
   </div>
  </div>
 );
}


// ── UserProfileCard — performance identity modal ─────────────────────────────
export function UserProfileCard({ user, allUsersData, industryConfigs, allUserGoals, currentUser, onClose, onOpenDm }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const myData = allUsersData[user.id] || {};
 const cfg = industryConfigs[user.industry] || Object.values(industryConfigs)[0];
 const goals = allUserGoals[user.id] || {};
 const now = todayStr();

 // Streak
 const streak = computeStreak(myData);

 // Win rate (days at 100%+ in last 30 days)
 const last30 = [];
 for (let i = 0; i < 30; i++) {
  const d = new Date(); d.setDate(d.getDate() - i);
  const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  if (!isWeekend(ds)) last30.push(ds);
 }
 const winDays = last30.filter(ds => {
  const d = myData[ds]; if (!d) return false;
  return computeGoalPct(d, cfg?.weekdayMetrics || [], goals) >= 100;
 }).length;
 const winRate = last30.length > 0 ? Math.round((winDays / last30.length) * 100) : 0;

 // Total days logged
 const totalDays = Object.entries(myData).filter(([ds, d]) => !isWeekend(ds) && d && Object.values(d).some(v => typeof v === "number" && v > 0)).length;

 // Best week (highest avg pct)
 const weeklyAvgs = {};
 for (const [ds, d] of Object.entries(myData)) {
  if (isWeekend(ds) || !d) continue;
  const wk = weekKey(ds);
  if (!weeklyAvgs[wk]) weeklyAvgs[wk] = [];
  weeklyAvgs[wk].push(computeGoalPct(d, cfg?.weekdayMetrics || [], goals));
 }
 const bestWeekPct = Math.max(0, ...Object.values(weeklyAvgs).map(arr => Math.round(arr.reduce((a,b) => a+b, 0) / arr.length)));

 const isMe = user.id === currentUser?.id;
 const initColor = isMe
  ? `linear-gradient(135deg, rgba(29,201,232,0.8), rgba(99,102,241,0.8))`
  : `linear-gradient(135deg, rgba(99,102,241,0.6), rgba(168,85,247,0.6))`;

 const statCard = (label, value, sub, color) => (
  <div style={{ background: "var(--bg-2)", borderRadius: "12px", padding: "14px 16px", textAlign: "center" }}>
   <div style={{ fontSize: "1.5rem", fontWeight: "900", color: color || "var(--accent)", fontFamily: F, lineHeight: 1 }}>{value}</div>
   <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "4px" }}>{label}</div>
   {sub && <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "2px" }}>{sub}</div>}
  </div>
 );

 return (
  <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
   <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
   <div style={{ position: "relative", width: "100%", maxWidth: "480px", background: "var(--bg-1)", borderRadius: "24px 24px 0 0", padding: "0 0 env(safe-area-inset-bottom,24px)", zIndex: 1, maxHeight: "85dvh", overflowY: "auto" }}>
    {/* Drag handle */}
    <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "10px auto 0" }} />

    {/* Header */}
    <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", gap: "14px" }}>
     <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: initColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: "900", color: "#fff", flexShrink: 0, fontFamily: F }}>
      {user.name?.charAt(0).toUpperCase()}
     </div>
     <div style={{ flex: 1 }}>
      <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)", fontFamily: F }}>{user.name}</div>
      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
       {cfg?.label || user.industry}
       {streak.current >= 3 && <span style={{ marginLeft: "8px", color: "#F59E0B" }}>🔥 {streak.current}d streak</span>}
      </div>
     </div>
     {!isMe && onOpenDm && (
      <button onClick={() => { onOpenDm(user); onClose(); }} style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", color: "var(--text-muted)", padding: "8px 14px", borderRadius: "10px", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
       Message
      </button>
     )}
    </div>

    {/* Stats grid */}
    <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
     {statCard("Current Streak", streak.current > 0 ? `${streak.current}d` : "—", streak.current > 0 ? `Best: ${streak.longest}d` : "Start logging!", "#F59E0B")}
     {statCard("Win Rate", `${winRate}%`, "last 30 days", winRate >= 80 ? "#4ACF86" : winRate >= 50 ? "var(--accent)" : "var(--text-muted)")}
     {statCard("Best Week", bestWeekPct > 0 ? `${bestWeekPct}%` : "—", "avg goal %", "#A855F7")}
     {statCard("Days Logged", totalDays > 0 ? totalDays : "—", "all time", "var(--accent)")}
    </div>

    {/* Motivation line */}
    {totalDays > 0 && (
     <div style={{ margin: "0 20px 16px", background: "rgba(29,201,232,0.06)", border: "1px solid rgba(29,201,232,0.15)", borderRadius: "12px", padding: "12px 14px", fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
      {streak.current >= 30
       ? `${user.name?.split(" ")[0]} has shown up ${streak.current} days in a row. That's the work.`
       : streak.current >= 7
       ? `${user.name?.split(" ")[0]} is on a ${streak.current}-day run. Momentum is building.`
       : totalDays >= 30
       ? `${user.name?.split(" ")[0]} has ${totalDays} logged days. Consistency over time.`
       : `${user.name?.split(" ")[0]} is building their streak. Every day counts.`}
     </div>
    )}

    {/* Milestones — shown for any user, more detail for self */}
    {totalDays > 0 && (
     <MilestonesPanel user={user} isMe={isMe} cfg={cfg} myData={myData} streak={streak} totalDays={totalDays} winRate={winRate} />
    )}

    {/* Share profile card — only shown for the current user viewing their own profile */}
    {isMe && (
     <div style={{ margin: "0 20px 20px" }}>
      <ShareableProfileCard user={user} streak={streak} totalDays={totalDays} winRate={winRate} bestWeekPct={bestWeekPct} cfg={cfg} goals={goals} myData={myData} />
     </div>
    )}

    <div style={{ height: "8px" }} />
   </div>
  </div>
 );
}


// ── MilestonesPanel — shows earned badges in profile card ────────────────────
function MilestonesPanel({ user, isMe, cfg, myData, streak, totalDays, winRate }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [unlocked, setUnlocked] = React.useState([]);
 const [showAll, setShowAll] = React.useState(false);

 React.useEffect(() => {
  if (!user?.id) return;
  loadUnlockedMilestones(user.id).then(ms => setUnlocked(ms || [])).catch(() => {});
 }, [user?.id]);

 if (!unlocked.length) return null;

 const display = showAll ? unlocked : unlocked.slice(0, 6);

 return (
  <div style={{ margin: "0 20px 16px" }}>
   <div style={{ fontSize: "0.68rem", fontWeight: "800", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
    Milestones · {unlocked.length}
   </div>
   <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
    {display.map(ms => (
     <div key={ms.id} title={ms.label} style={{ display: "flex", alignItems: "center", gap: "5px", background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "6px 10px" }}>
      <span style={{ fontSize: "1rem" }}>{ms.icon}</span>
      <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", fontFamily: F }}>{ms.label}</span>
     </div>
    ))}
    {unlocked.length > 6 && !showAll && (
     <button onClick={() => setShowAll(true)} style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-dim)", padding: "6px 10px", borderRadius: "8px", fontSize: "0.72rem", cursor: "pointer", fontFamily: F }}>
      +{unlocked.length - 6} more
     </button>
    )}
   </div>
  </div>
 );
}

// ── ShareableProfileCard — a screenshot-ready card + link sharing ─────────────
export function ShareableProfileCard({ user, streak, totalDays, winRate, bestWeekPct, cfg, goals, myData }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [show, setShow] = useState(false);
 const [copied, setCopied] = useState(false);

 // Top metric totals all-time
 const metrics = cfg?.weekdayMetrics || [];
 const allTimeTotals = metrics.slice(0, 3).map(m => {
  const total = Object.values(myData || {}).reduce((s, d) => s + (d?.[m.key] || 0), 0);
  return { ...m, total };
 }).filter(m => m.total > 0);

 function shareLink() {
  const url = `https://getcadence.net/u/${encodeURIComponent(user.id)}`;
  if (navigator.share) {
   navigator.share({ title: `${user.name} on Cadence`, text: `${streak.current > 0 ? `${streak.current}-day streak. ` : ''}${totalDays} days logged. Check my Cadence profile.`, url }).catch(() => {});
  } else {
   navigator.clipboard?.writeText(url).catch(() => {});
   setCopied(true);
   setTimeout(() => setCopied(false), 2500);
  }
 }

 return (
  <>
   <button onClick={() => setShow(true)} style={{ width: "100%", background: "none", border: "1px solid rgba(29,201,232,0.25)", color: "var(--accent)", padding: "11px", borderRadius: "11px", fontWeight: "700", fontSize: "0.85rem", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
    ↗ Share my profile
   </button>

   {show && (
    <div style={{ position: "fixed", inset: 0, zIndex: 9100, background: "rgba(8,12,24,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: F }}>
     <div style={{ maxWidth: "340px", width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* The card itself */}
      <div style={{ background: "linear-gradient(135deg, #0D1421 0%, #131C2F 100%)", border: "1px solid rgba(29,201,232,0.2)", borderRadius: "20px", padding: "24px", position: "relative", overflow: "hidden" }}>
       {/* Subtle gradient orb */}
       <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "150px", height: "150px", borderRadius: "50%", background: "radial-gradient(circle, rgba(29,201,232,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
       <div style={{ position: "absolute", bottom: "-30px", left: "-30px", width: "120px", height: "120px", borderRadius: "50%", background: "radial-gradient(circle, rgba(123,111,216,0.10) 0%, transparent 70%)", pointerEvents: "none" }} />

       {/* Header */}
       <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: user.avatarColor || "linear-gradient(135deg,#1DC9E8,#7B6FD8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: user.avatarEmoji ? "1.4rem" : "1.1rem", fontWeight: "800", color: "#fff", flexShrink: 0 }}>
         {user.avatarEmoji || user.name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
        </div>
        <div>
         <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "#fff" }}>{user.name}</div>
         <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>{cfg?.label || user.industry} · Cadence</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: "0.7rem", fontWeight: "800", letterSpacing: "0.08em", color: "#1DC9E8" }}>⚡ CADENCE</div>
       </div>

       {/* Stats row */}
       <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "16px" }}>
        {[
         { label: "Streak", value: `${streak.current}d`, sub: `best ${streak.longest}d` },
         { label: "Days In", value: totalDays, sub: "logged" },
         { label: "Win Rate", value: `${winRate}%`, sub: "days at 100%" },
        ].map(stat => (
         <div key={stat.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "11px 8px", textAlign: "center" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1DC9E8", fontFamily: F, lineHeight: 1 }}>{stat.value}</div>
          <div style={{ fontSize: "0.62rem", fontWeight: "700", color: "rgba(255,255,255,0.35)", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</div>
         </div>
        ))}
       </div>

       {/* All-time metric totals */}
       {allTimeTotals.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
         {allTimeTotals.map(m => (
          <div key={m.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
           <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>{m.label}</span>
           <span style={{ fontSize: "0.88rem", fontWeight: "800", color: "#fff" }}>{m.total.toLocaleString()}</span>
          </div>
         ))}
        </div>
       )}

       {/* Footer */}
       <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>getcadence.net</div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px" }}>
       <button onClick={shareLink} style={{ flex: 1, background: "#1DC9E8", color: "#000", border: "none", padding: "13px", borderRadius: "11px", fontWeight: "800", fontSize: "0.9rem", cursor: "pointer", fontFamily: F }}>
        {copied ? "✓ Copied!" : navigator.share ? "↗ Share" : "Copy link"}
       </button>
       <button onClick={() => setShow(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "13px 16px", borderRadius: "11px", cursor: "pointer", fontFamily: F }}>✕</button>
      </div>
      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
       Screenshot the card above to share on social, or copy your profile link.
      </div>
     </div>
    </div>
   )}
  </>
 );
}

export function LeaderboardView({users,allUsersData,industryConfigs,allUserGoals,teams,admins,currentUser,spaceType,communityIndustries,allFreezes}) {

 // Solo users get a personal stats view instead of leaderboard
 const isSolo = !users || users.length <= 1;
 if (isSolo && currentUser) {
  const myData = allUsersData[currentUser.id] || {};
  const myCfg = industryConfigs[currentUser.industry] || Object.values(industryConfigs)[0];
  const myGoals = allUserGoals[currentUser.id] || {};
  return <SoloPersonalStats
   currentUser={currentUser}
   myData={myData}
   myCfg={myCfg}
   myGoals={myGoals}
   now={todayStr()}
  />;
 }
 const [period,setPeriod]=useState("month");
 const [lbTab,setLbTab]=useState("all");
 const [lbTeamFilter,setLbTeamFilter]=useState("all");
 const [expandedIds,setExpandedIds]=useState(new Set());
 const now=todayStr();
 const labels={day:"Today",week:"This Week",month:"This Month"};

 const [profileUser, setProfileUser] = useState(null);

 function toggleExpand(id){
  setExpandedIds(prev=>{
   const next=new Set(prev);
   if(next.has(id))next.delete(id);else next.add(id);
   return next;
  });
 }

 function getUserStats(user) {
  const data=allUsersData[user.id]||{};
  const cfg=industryConfigs[user.industry]||Object.values(industryConfigs)[0];
  const userGoals=allUserGoals[user.id]||{};
  let totalPct=0,days=0;
  const metricTotals={};
  for(const [date,d] of Object.entries(data)){
   if(isWeekend(date)||!d)continue;
   const match=period==="day"?date===now:period==="week"?weekKey(date)===weekKey(now):monthKey(date)===monthKey(now);
   if(!match)continue;
   totalPct+=computeGoalPct(d,cfg.weekdayMetrics,userGoals);
   days++;
   for(const m of cfg.weekdayMetrics){
    metricTotals[m.key]=(metricTotals[m.key]||0)+(typeof d[m.key]==="number"?d[m.key]:0);
   }
  }
  const avgPct=days>0?Math.round(totalPct/days):0;
  let periodGoalHit=0,periodGoalTotal=0;
  for(const m of cfg.weekdayMetrics){
   const dailyGoal=(userGoals[m.key]!=null)?userGoals[m.key]:m.defaultGoal;
   if(dailyGoal<=0||days===0)continue;
   const periodGoal=dailyGoal*days;
   periodGoalTotal++;
   periodGoalHit+=(metricTotals[m.key]||0)/periodGoal; // allow >100%
  }
  const periodPct=periodGoalTotal>0&&days>0?Math.round((periodGoalHit/periodGoalTotal)*100):0;
  return{avgPct,periodPct,days,cfg,metricTotals};
 }

 function getWeekendStats(user){
  const data=allUsersData[user.id]||{};
  const satKey=lastWeekendSat(now);
  const sunKey=(()=>{const d=new Date(satKey);d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;})();
  let total=0,days=0;
  for(const ds of [satKey,sunKey]){const d=data[ds];if(d&&Object.values(d).some(v=>typeof v==="number"&&v>0)){const t=Object.values(d).reduce((a,b)=>a+(typeof b==="number"?b:0),0);total+=t;days++;}}
  return{total,days};
 }

 const myTeamIds = currentUser&&teams ? [currentUser.id,...Object.entries(teams).filter(([,lid])=>lid===currentUser.id).map(([uid])=>uid),...(teams[currentUser.id]?[teams[currentUser.id]]:[])].filter(Boolean) : [];
 // Community: filter by industry tab. Org: filter by team scope.
 const isCommunityFilter = spaceType === "community";
 const industryFiltered = (!isCommunityFilter||lbTab==="all") ? users : users.filter(u=>u.industry===lbTab);
 const filteredUsers = !isCommunityFilter && lbTeamFilter!=="all"
  ? (lbTeamFilter==="myteam" ? industryFiltered.filter(u=>myTeamIds.includes(u.id))
   : industryFiltered.filter(u=>u.id===lbTeamFilter||teams[u.id]===lbTeamFilter))
  : industryFiltered;
 const ranked=filteredUsers.map(u=>({...u,...getUserStats(u)})).sort((a,b)=>(period==="day"?b.avgPct-a.avgPct:b.periodPct-a.periodPct));
 const weekendRanked=filteredUsers.map(u=>({...u,...getWeekendStats(u)})).sort((a,b)=>b.total-a.total);
 const hasWeekendData=weekendRanked.some(u=>u.days>0);

 // For community: show industry filter. For org/solo: show team scope filter.
 const isCommunity = spaceType === "community";
 // In a community, figure out which industries are actually present
 const presentIndustries = isCommunity && communityIndustries
  ? [...new Set(communityIndustries)]
  : Object.keys(industryConfigs);

 return (
  <div>
   {/* Profile card modal */}
   {profileUser && (
    <UserProfileCard
     user={profileUser}
     allUsersData={allUsersData}
     industryConfigs={industryConfigs}
     allUserGoals={allUserGoals}
     currentUser={currentUser}
     onClose={() => setProfileUser(null)}
     onOpenDm={null}
    />
   )}
   {/* Context-aware filters */}
   {isCommunity ? (
    /* Community: filter by industry */
    <div style={{display:"flex",gap:"6px",...s.mb16,flexWrap:"wrap"}}>
     <button style={{...s.smallTab,...(lbTab==="all"?s.smallTabActive:{})}} onClick={()=>setLbTab("all")}>🌐 All Industries</button>
     {presentIndustries.map(k=>(
      <button key={k} style={{...s.smallTab,...(lbTab===k?s.smallTabActive:{})}} onClick={()=>setLbTab(k)}>
       {(industryConfigs[k]?.icon||"◆")} {industryConfigs[k]?.label||k}
      </button>
     ))}
    </div>
   ) : (
    /* Org/Solo: filter by team scope */
    <div style={{display:"flex",gap:"6px",...s.mb16,flexWrap:"wrap"}}>
     <button style={{...s.smallTab,...(lbTeamFilter==="all"?s.smallTabActive:{})}} onClick={()=>setLbTeamFilter("all")}>🌐 Everyone</button>
     {myTeamIds.length>1&&<button style={{...s.smallTab,...(lbTeamFilter==="myteam"?s.smallTabActive:{})}} onClick={()=>setLbTeamFilter("myteam")}>👥 My Team</button>}
     {admins.filter(id=>id!==currentUser?.id).map(id=>{
      const leader=users.find(u=>u.id===id);
      if(!leader)return null;
      return <button key={id} style={{...s.smallTab,...(lbTeamFilter===id?s.smallTabActive:{})}} onClick={()=>setLbTeamFilter(id)}>
       {leader.name.split(" ")[0]}{"'s"} Team
      </button>;
     })}
    </div>
   )}

   {/* Period tabs */}
   <div style={s.lbPeriodRow}>
    {["day","week","month"].map(p=><button key={p} style={{...s.tab,...(period===p?s.tabActive:{})}} onClick={()=>setPeriod(p)}>{labels[p]}</button>)}
   </div>
   <div style={s.lbSubtitle}>{labels[period]} · {period==="day"?"ranked by % of daily goals":"ranked by % of period goal reached"} · click to expand</div>

   {ranked.length===0?<div style={s.emptyState}>No users yet.</div>:(()=>{
    // Build a nested structure: leaders (admins) with their team members nested underneath
    const adminsInRanked = ranked.filter(u=>admins.includes(u.id));
    const unassigned = ranked.filter(u=>!admins.includes(u.id)&&!(teams||{})[u.id]);
    const teamGroups = adminsInRanked.map(leader=>{
     const members = ranked.filter(u=>(teams||{})[u.id]===leader.id);
     return {leader, members};
    });
    // Overall rank index across all visible rows (leaders + unassigned, not counting nested members)
    const topLevelRanked = [...ranked.filter(u=>admins.includes(u.id)||!(teams||{})[u.id])];

    function renderMetricPanel(u) {
     const cfg=u.cfg||{weekdayMetrics:[]};
     const userGoals=allUserGoals[u.id]||{};
     return (
      <div style={{...s.bgBd8,borderTop:"none",borderBottomLeftRadius:"3px",borderBottomRightRadius:"3px",padding:"14px 16px"}}>
       <div style={{fontSize:"0.9rem",color:TM,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:"10px"}}>{labels[period]} · Metrics Breakdown</div>
       <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"8px"}}>
        {cfg.weekdayMetrics.map(m=>{
         const total=u.metricTotals?.[m.key]||0;
         const dailyGoal=(userGoals[m.key]!=null)?userGoals[m.key]:m.defaultGoal;
         const periodGoal=dailyGoal*Math.max(u.days,1);
         const pct=dailyGoal>0&&u.days>0?Math.round((total/periodGoal)*100):null;
         const mColor=pct===null?m.color:pct>=100?"#5DC1DB":pct>=60?TA:"#E05577";
         return (
          <div key={m.key} style={{background:BR,border:"1px solid #161616",...s.br8,padding:"10px 12px",position:"relative",...s.oh}}>
           <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"var(--bg-4)"}}>
            <div style={{height:"100%",width:pct!=null?`${Math.min(100,pct)}%`:"100%",background:pct!=null?mColor:m.color,transition:"width 0.3s",boxShadow:pct>100?"0 0 4px rgba(29,201,232,0.4)":"none"}}/>
           </div>
           <div style={{fontSize:"0.9rem",color:TS,textTransform:"uppercase",letterSpacing:"0.1em",...s.mb4}}>{m.short||m.label}</div>
           <div style={{fontSize:"1.25rem",fontWeight:"bold",color:TP,lineHeight:1,marginBottom:"2px"}}>{total>0?total:"—"}</div>
           {pct!==null&&<div style={{fontSize:"0.9rem",color:mColor}}>{pct}%{pct>100&&<span style={{fontSize:"0.78rem",opacity:0.7}}> ↑over</span>}{period!=="day"&&u.days>0?` · ${Math.round(total/u.days*10)/10}/day`:""}</div>}
           {dailyGoal>0&&<div style={s.mut95mt2}>goal: {dailyGoal}/day</div>}
          </div>
         );
        })}
       </div>
      </div>
     );
    }

    function renderRow(u, rank, isNested=false) {
     const ind=DEFAULT_INDUSTRIES[u.industry]||{icon:"?",label:u.industry,accentColor:TS};
     const hasGoals=u.days>0;
     const noGoalsSet=u.avgPct===0&&u.days>0;
     const mainPct=period==="day"?u.avgPct:u.periodPct;
     const barColor=mainPct>=100?"#5DC1DB":mainPct>=60?TA:"#E05577";
     const avgColor=u.avgPct>=100?"#5DC1DB":u.avgPct>=60?TA:"#E05577";
     const isExpanded=expandedIds.has(u.id);
     const isLeader=admins.includes(u.id);
     return (
      <div key={u.id} style={{marginBottom:isNested?"3px":"6px"}}>
       <div style={{
        ...s.lbRow, marginBottom:0, ...s.cp,
        borderBottomLeftRadius:isExpanded?0:3, borderBottomRightRadius:isExpanded?0:3,
        ...(isNested?{marginLeft:"20px",background:BG0,borderColor:BG3,...s.p1014}:{}),
        ...(rank===0&&hasGoals&&!isNested?{background:BG1,borderColor:"#1E1C0C"}:{})
       }} onClick={()=>toggleExpand(u.id)}>
        {!isNested&&<div style={s.lbRank}>{rank===0&&hasGoals?"🏆":<span style={{color:TS}}>{rank+1}</span>}</div>}
        {isNested&&<div style={{width:"12px",color:TM,fontSize:"0.8rem",flexShrink:0}}>└</div>}
        <div style={{flex:1}}>
         <div style={{...s.fac,gap:"8px",flexWrap:"wrap"}}>
          <span style={{...s.lbName,fontSize:isNested?"0.9rem":"0.9rem",color:isExpanded?"#E8E0D5":TP,cursor:"pointer",textDecoration:"underline",textDecorationColor:"rgba(29,201,232,0.3)",textUnderlineOffset:"2px"}} onClick={e=>{e.stopPropagation();setProfileUser(u);}}>{u.name}</span>
          {isLeader&&<span style={{fontSize:"0.95rem",color:TA,border:BB2A28,borderRadius:"6px",padding:"0 4px",letterSpacing:"0.06em"}}>ADMIN</span>}
          {(()=>{const uFreezes=allFreezes?.[u.id];const today=todayStr();const isPTO=(uFreezes?.pto||[]).some(e=>e.date===today);const isSick=(uFreezes?.sick||[]).some(e=>e.date===today);if(isPTO)return<span title="On PTO today" style={{fontSize:"0.85rem"}}>🏖</span>;if(isSick)return<span title="Out sick today" style={{fontSize:"0.85rem"}}>🤒</span>;return null;})()}
          {!isNested&&<span style={s.mut8}>{ind.icon} {ind.label}</span>}
          {noGoalsSet&&<span style={{fontSize:"0.9rem",color:TM,border:"1px solid #333",borderRadius:"6px",padding:"1px 5px"}}>no goals</span>}
          <span style={{fontSize:"0.9rem",color:TM,marginLeft:"auto"}}>{isExpanded?"▲":"▼"}</span>
         </div>
         {hasGoals&&!noGoalsSet&&<>
          <div style={{marginTop:"5px",...s.fac,gap:"8px"}}>
           <div style={{flex:1,height:isNested?"3px":"4px",background:"var(--bg-4)",borderRadius:"6px",...s.oh}}>
            <div style={{height:"100%",width:`${Math.min(100,mainPct)}%`,background:barColor,borderRadius:"6px",transition:"width 0.3s"}}/>
           </div>
           <span style={{fontSize:isNested?"11px":"12px",fontWeight:"bold",color:barColor,minWidth:"38px",textAlign:"right"}}>{mainPct}%</span>
           <span style={{fontSize:"0.9rem",color:TM,minWidth:"54px"}}>{period==="day"?"of goal":period==="week"?"of wk goal":"of mo goal"}</span>
          </div>
          {period!=="day"&&<div style={{marginTop:"2px",...s.fac,gap:"8px"}}>
           <div style={{flex:1,height:"2px",background:"var(--bg-4)",borderRadius:"6px",...s.oh}}>
            <div style={{height:"100%",width:`${Math.min(100,u.avgPct)}%`,background:avgColor,borderRadius:"6px",opacity:0.6,transition:"width 0.3s"}}/>
           </div>
           <span style={{fontSize:"0.8rem",color:avgColor,minWidth:"38px",textAlign:"right"}}>{u.avgPct}%</span>
           <span style={{fontSize:"0.9rem",color:TM,minWidth:"54px"}}>avg/day</span>
          </div>}
         </>}
        </div>
        <div style={s.lbStats}>
         <div style={s.lbSG}><div style={{...s.lbBig,fontSize:"0.95rem",color:u.days>0?TS:TD}}>{u.days>0?u.days:"—"}</div><div style={s.lbSL}>days</div></div>
        </div>
       </div>
       {isExpanded&&renderMetricPanel(u)}
      </div>
     );
    }

    return (
     <div>
      {/* Leaders + nested members */}
      {teamGroups.map(({leader,members})=>{
       const rank=topLevelRanked.findIndex(u=>u.id===leader.id);
       return (
        <div key={leader.id} style={s.mb8}>
         {renderRow(leader,rank,false)}
         {/* Team members nest after the leader's row (and metric panel if expanded) */}
         {members.length>0&&(
          <div style={{marginTop:"3px"}}>
           {members.sort((a,b)=>(period==="day"?b.avgPct-a.avgPct:b.periodPct-a.periodPct)).map((m,mi)=>renderRow(m,mi,true))}
          </div>
         )}
        </div>
       );
      })}
      {/* Unassigned non-admins */}
      {unassigned.map((u)=>{
       const rank=topLevelRanked.findIndex(x=>x.id===u.id);
       return renderRow(u,rank,false);
      })}
     </div>
    );
   })()}

   {/* Do More CTA */}
   <div style={{ margin:"16px 0", padding:"2px" }}>
    <button onClick={() => window.dispatchEvent(new CustomEvent("cadence:navigate", {detail:"workspace"}))}
     style={{ width:"100%", background:"linear-gradient(135deg,#1DC9E8 0%,#0EA5C9 100%)", color:"#000", border:"none", padding:"14px 20px", borderRadius:"12px", fontWeight:"900", fontSize:"1rem", cursor:"pointer", fontFamily:"'DM Sans',system-ui,sans-serif", boxShadow:"0 3px 14px rgba(29,201,232,0.28)", WebkitTapHighlightColor:"transparent", letterSpacing:"-0.01em" }}>
     Do More
    </button>
   </div>

   {/* Weekend Warrior */}
   <div style={s.wwSection}>
    <div style={s.wwTitle}>Weekend Warrior</div>
    <div style={s.lbSubtitle}>Most recent weekend · total activities</div>
    {!hasWeekendData?<div style={s.emptyState}>No weekend data logged yet.</div>
    :weekendRanked.map((u,i)=>{
     const ind=DEFAULT_INDUSTRIES[u.industry]||{icon:"?",accentColor:TS};
     return (
      <div key={u.id} style={{...s.lbRow,...(i===0&&u.days>0?{background:BG0,borderColor:BDIR}:{})}}>
       <div style={s.lbRank}>{i===0&&u.days>0?"🌊":<span style={{color:TS}}>{i+1}</span>}</div>
       <div style={s.lbName}>{ind.icon} {u.name}</div>
       <div style={s.lbStats}>
        <div style={s.lbSG}><div style={{...s.lbBig,color:"#84D4E8"}}>{u.total}</div><div style={s.lbSL}>total</div></div>
        <div style={s.lbSG}><div style={{...s.lbBig,color:TM,fontSize:"0.95rem"}}>{u.days}</div><div style={s.lbSL}>days</div></div>
       </div>
      </div>
     );
    })}
   </div>
  </div>
 );
}

// ── Error Boundary ────────────────────────────────────────────────────
export class ErrorBoundary extends React.Component {
 constructor(props) { super(props); this.state = { hasError: false, error: null, feedbackSent: false, feedbackSending: false }; }
 static getDerivedStateFromError(error) { return { hasError: true, error }; }
 componentDidCatch(error, info) { console.error("[Cadence] Uncaught error:", error, info); }

 async sendFeedback() {
  const { error } = this.state;
  const { currentUser, globalSuperAdmin } = this.props;
  if (!currentUser || !globalSuperAdmin?.userId || !error) return;
  this.setState({ feedbackSending: true });
  try {
   const { savePersonalMessages, loadPersonalMessages, savePersonalThreads, loadPersonalThreads, pushNotification } = await import("./shared.js");
   const meId = currentUser.id;
   const adminId = globalSuperAdmin.userId;
   if (meId === adminId) { this.setState({ feedbackSent: true, feedbackSending: false }); return; }
   // Build thread key (sorted IDs)
   const tKey = [meId, adminId].sort().join("-dm-");
   const msgText = `🐛 Error Report from ${currentUser.name}

Page/context: ${window.location.hash || "unknown"}
Time: ${new Date().toLocaleString()}
Error: ${error.message}

Stack: ${error.stack?.slice(0, 400) || "N/A"}`;
   const msg = { id: `fb-${Date.now()}`, userId: meId, userName: currentUser.name, text: msgText, ts: Date.now(), isErrorReport: true };
   // Append to thread messages
   const existing = await loadPersonalMessages(tKey).catch(() => []);
   await savePersonalMessages(tKey, [...(existing || []), msg]);
   // Ensure thread exists for both users
   const myThreads = await loadPersonalThreads(meId).catch(() => []);
   const adminThreads = await loadPersonalThreads(adminId).catch(() => []);
   const thread = { threadKey: tKey, participantIds: [meId, adminId], name: globalSuperAdmin.userName || "Admin", isGroup: false, lastTs: Date.now() };
   const adminThread = { threadKey: tKey, participantIds: [meId, adminId], name: currentUser.name, isGroup: false, lastTs: Date.now(), unreadCount: 1 };
   if (!myThreads.find(t => t.threadKey === tKey)) await savePersonalThreads(meId, [...myThreads, thread]);
   const adminIdx = adminThreads.findIndex(t => t.threadKey === tKey);
   if (adminIdx >= 0) {
    const updated = [...adminThreads]; updated[adminIdx] = { ...updated[adminIdx], lastTs: Date.now(), unreadCount: (updated[adminIdx].unreadCount || 0) + 1 };
    await savePersonalThreads(adminId, updated);
   } else {
    await savePersonalThreads(adminId, [...adminThreads, adminThread]);
   }
   await pushNotification(adminId, { icon: "🐛", text: `Error report from ${currentUser.name}: ${error.message?.slice(0, 80)}`, link: "messages" }).catch(() => {});
   this.setState({ feedbackSent: true, feedbackSending: false });
  } catch (e) { console.error("Feedback send failed:", e); this.setState({ feedbackSending: false }); }
 }

 render() {
  if (!this.state.hasError) return this.props.children;
  const isInline = this.props.inline;
  const reset = () => this.setState({ hasError: false, error: null, feedbackSent: false });
  const F = "'DM Sans',system-ui,sans-serif";
  const { feedbackSent, feedbackSending } = this.state;
  const hasSuperAdmin = !!this.props.globalSuperAdmin?.userId;
  const isOwnError = this.props.currentUser?.id === this.props.globalSuperAdmin?.userId;
  const showFeedbackBtn = hasSuperAdmin && !isOwnError;

  if (isInline) {
   return (
    <div style={{ background: "rgba(224,85,119,0.08)", border: "1px solid rgba(224,85,119,0.25)", borderRadius: "14px", padding: "24px", textAlign: "center", margin: "8px 0", fontFamily: F }}>
     <div style={{ fontSize: "1.5rem", marginBottom: "10px" }}>⚠️</div>
     <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>Something's not right here</div>
     <div style={{ fontSize: "0.82rem", color: "#999", marginBottom: "16px", lineHeight: 1.5 }}>This section hit an error. Your data is safe.</div>
     <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
      <button onClick={reset} style={{ background: "#1DC9E8", color: "#000", border: "none", padding: "9px 20px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>Try Again</button>
      <button onClick={() => { reset(); window.dispatchEvent(new CustomEvent("cadence-nav", { detail: "workspace" })); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "#aaa", padding: "9px 20px", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}>← Home</button>
      {showFeedbackBtn && (
       <button onClick={() => this.sendFeedback()} disabled={feedbackSent || feedbackSending} style={{ background: feedbackSent ? "rgba(74,207,134,0.15)" : "rgba(224,85,119,0.12)", border: feedbackSent ? "1px solid rgba(74,207,134,0.35)" : "1px solid rgba(224,85,119,0.3)", color: feedbackSent ? "#4ACF86" : "#E05577", padding: "9px 20px", borderRadius: "8px", fontSize: "0.85rem", cursor: feedbackSent ? "default" : "pointer", fontFamily: "inherit", fontWeight: "700" }}>
        {feedbackSent ? "✓ Admin notified" : feedbackSending ? "Sending…" : "🐛 Let admin know"}
       </button>
      )}
     </div>
     {this.state.error && <pre style={{ marginTop: "12px", fontSize: "0.65rem", color: "#E05577", textAlign: "left", background: "#111", padding: "8px", borderRadius: "6px", overflow: "auto", maxHeight: "80px" }}>{this.state.error.message}</pre>}
    </div>
   );
  }
  return (
   <div style={{ position: "fixed", inset: 0, background: "#080C18", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: F }}>
    <div style={{ maxWidth: "420px", textAlign: "center" }}>
     <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>⚠️</div>
     <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>Something went wrong</div>
     <div style={{ fontSize: "0.9rem", color: "#888", marginBottom: "24px", lineHeight: 1.6 }}>Cadence hit an unexpected error. Your data is safe.</div>
     <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "12px" }}>
      <button onClick={() => { reset(); window.dispatchEvent(new CustomEvent("cadence-nav", { detail: "home" })); }} style={{ background: "#1DC9E8", color: "#000", border: "none", padding: "12px 24px", borderRadius: "10px", fontSize: "0.95rem", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
       ← Return to Home
      </button>
      <button onClick={() => window.location.reload()} style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "#aaa", padding: "12px 24px", borderRadius: "10px", fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit" }}>
       Reload App
      </button>
     </div>
     {showFeedbackBtn && (
      <button onClick={() => this.sendFeedback()} disabled={feedbackSent || feedbackSending} style={{ width: "100%", background: feedbackSent ? "rgba(74,207,134,0.1)" : "rgba(224,85,119,0.1)", border: feedbackSent ? "1px solid rgba(74,207,134,0.3)" : "1px solid rgba(224,85,119,0.25)", color: feedbackSent ? "#4ACF86" : "#E05577", padding: "11px 24px", borderRadius: "10px", fontSize: "0.88rem", cursor: feedbackSent ? "default" : "pointer", fontFamily: "inherit", fontWeight: "700" }}>
       {feedbackSent ? "✓ Admin has been notified" : feedbackSending ? "Sending error report…" : "🐛 Send error report to admin"}
      </button>
     )}
     {this.state.error && (
      <pre style={{ marginTop: "16px", fontSize: "0.7rem", color: "#E05577", textAlign: "left", background: "#111", padding: "10px", borderRadius: "6px", overflow: "auto", maxHeight: "120px" }}>
       {this.state.error.message}
      </pre>
     )}
    </div>
   </div>
  );
 }
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Page hints data ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export const PAGE_HINTS = {
 home: {
  title: "Home",
  icon: "🏠",
  tips: [
   "Your personal daily snapshot — progress, streak, team activity, and your AI briefing.",
   "Hit 'Get to work →' to jump straight into logging your numbers.",
   "The Daily Briefing below is AI-generated and tailored to your industry. Hit 'Ask Pacer ⚡' on any item to dig deeper with Pacer, your AI companion.",
   "Start a Challenge from Quick Actions — you'll be asked if you want to compete with your org or a community.",
  ],
 },
 feed: {
  title: "Activity Feed",
  icon: "📣",
  tips: [
   "Your org's live activity thread — wins, shoutouts, milestones, and reflections.",
   "Post a win or shout someone out using the composer at the top.",
   "React with emojis, leave comments, or @ mention teammates.",
   "The Daily Briefing at the top is tailored to your team's industry. Hit 'Chime In' to start a discussion.",
  ],
 },
 today: {
  title: "Daily Tracker",
  icon: "📊",
  tips: [
   "Log your numbers here every day. Build a streak by logging at least once on weekdays.",
   "Set your intention for the day at the top — it keeps you focused.",
   "Use the date picker to go back and edit past days if you forgot to log.",
   "The progress bar fills up as you hit your goals. 100% = full color and streak credit.",
  ],
 },
 history: {
  title: "History",
  icon: "📅",
  tips: [
   "Your complete log history, organized by month.",
   "Each day shows a color fill based on how close you got to your goals.",
   "Click any day to edit the numbers for that date.",
   "Use Backup / Restore to export your data or bring it to a new device.",
  ],
 },
 journal: {
  title: "Journal",
  icon: "📓",
  tips: [
   "Private reflections — only you can see these, ever.",
   "Choose a template (Weekly Review, Daily Reflection, etc.) or write freeform.",
   "After 3 entries, unlock AI Pattern Insight — it reads your recent journal and surfaces patterns you might not have noticed.",
   "When your insight is genuinely impressive or worth sharing, Pacer will nudge you to post it to your community.",
  ],
 },
 leaderboard: {
  title: "Team Stats",
  icon: "🏆",
  tips: [
   "See how your whole team is performing side by side.",
   "Filter by time period — today, this week, this month, or all time.",
   "Streaks and goal percentages update in real time.",
   "Use this to recognize strong performers and spot who might need a check-in.",
  ],
 },
 compete: {
  title: "Compete",
  icon: "⚡",
  tips: [
   "Run time-boxed challenges on a single metric — who can log the most calls this week?",
   "Set up accountability pairs or groups to see each other's daily numbers.",
   "Challenges show a live leaderboard so the competition stays hot.",
   "You'll get a notification when someone joins or completes a challenge.",
  ],
 },
 communities: {
  title: "Crews",
  icon: "🌐",
  tips: [
   "Connect and compete with professionals across industries, outside your org.",
   "The Community Briefing is tailored to the mix of industries in your communities.",
   "Post to the crew feed and react to what others are sharing.",
   "Hit 'Chime In' on any briefing item to spark a discussion in your crew feed.",
  ],
 },
 messages: {
  title: "Messages",
  icon: "💬",
  tips: [
   "Direct messages with any teammate or crew member — one-on-one or group threads.",
   "Search for members by name and start a thread instantly.",
   "Messages are private and only visible to the people in the thread.",
  ],
 },
};

// ─────────────────────────────────────────────────────────────────────────────
// ── PageHelper — per-page hint card with first-visit auto-pop ────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── Migrated from ActivityTracker ────────────────────────────────────────────
export function UserTree({users, admins, teams, onSelect, excludeId, isSuperAdmin, onDelete, industryConfigs}) {
 const [collapsed, setCollapsed] = useState({}); // {groupKey: bool}
 function toggle(k){ setCollapsed(p=>({...p,[k]:!p[k]})); }

 const byIndustry = {};
 for(const u of users){
  if(excludeId && u.id===excludeId) continue;
  const ind = u.industry||"other";
  if(!byIndustry[ind]) byIndustry[ind] = [];
  byIndustry[ind].push(u);
 }

 function renderUser(u, indent=0){
  const isAdm = admins.includes(u.id);
  const indCfg = DEFAULT_INDUSTRIES[u.industry]||{icon:"◆",label:u.industry,accentColor:TS};
  return (
   <div key={u.id} style={{...s.fac,gap:"6px",marginBottom:"3px",paddingLeft:`${indent*16}px`}}>
    {indent>0&&<span style={{color:BD1,fontSize:"0.8rem",flexShrink:0}}>└</span>}
    <button style={{...s.userBtn,flex:1,padding:"7px 10px",borderColor:isAdm?"var(--border-2)":BG3}} onClick={()=>onSelect(u)}>
     <span style={s.fac6}>
      <span>{indCfg.icon}</span>
      <span style={{color:isAdm?TA:TP}}>{u.name}</span>
      {isAdm&&<span style={{fontSize:"0.95rem",color:TA,border:BB2A28,borderRadius:"6px",padding:"0 4px",letterSpacing:"0.08em"}}>ADMIN</span>}
     </span>
    </button>
    {isSuperAdmin&&onDelete&&<button style={{background:"none",border:BB2A10,color:"#E05577",padding:"5px 8px",...s.br8,...s.cp,fontSize:"0.8rem",flexShrink:0}} onClick={()=>onDelete(u.id)}>✕</button>}
   </div>
  );
 }

 return (
  <div style={{marginBottom:"6px"}}>
   {Object.entries(byIndustry).map(([ind, indUsers])=>{
    const indCfg = (industryConfigs&&industryConfigs[ind])||DEFAULT_INDUSTRIES[ind]||{icon:"◆",label:ind,accentColor:TS};
    const isCollapsed = collapsed[ind];
    // Leaders = admins in this industry; unassigned = non-admins with no team assignment
    const leaders = indUsers.filter(u=>admins.includes(u.id));
    const unassigned = indUsers.filter(u=>!admins.includes(u.id)&&!(teams||{})[u.id]);
    return (
     <div key={ind} style={s.mb8}>
      {/* Industry header */}
      <div onClick={()=>toggle(ind)} style={{...s.fac,gap:"6px",padding:"5px 8px",...s.cp,userSelect:"none",...s.bbBd,...s.mb4}}>
       <span style={{fontSize:"0.95rem",color:indCfg.accentColor||TS}}>{indCfg.icon} {indCfg.label||ind}</span>
       <span style={{fontSize:"0.9rem",color:"var(--border-2)",marginLeft:"auto"}}>{indUsers.length} user{indUsers.length!==1?"s":""} {isCollapsed?"▶":"▼"}</span>
      </div>
      {!isCollapsed&&(
       <div>
        {/* Leaders with their members nested */}
        {leaders.map(leader=>{
         const leaderKey = `leader_${leader.id}`;
         const members = indUsers.filter(u=>(teams||{})[u.id]===leader.id);
         const leaderCollapsed = collapsed[leaderKey];
         return (
          <div key={leader.id}>
           <div style={{...s.fac,...s.g4}}>
            {members.length>0&&(
             <button onClick={()=>toggle(leaderKey)} style={{background:"none",border:"none",color:"var(--border-2)",...s.cp,fontSize:"0.8rem",padding:"0 2px",flexShrink:0,lineHeight:1}}>
              {leaderCollapsed?"▶":"▼"}
             </button>
            )}
            <div style={{flex:1}}>
             {renderUser(leader, members.length>0?0:0)}
            </div>
           </div>
           {!leaderCollapsed&&members.map(m=>renderUser(m,1))}
          </div>
         );
        })}
        {/* Unassigned non-admins */}
        {unassigned.map(u=>renderUser(u,0))}
       </div>
      )}
     </div>
    );
   })}
   <div style={{...s.orDivider,margin:"10px 0 4px"}}>— or create new —</div>
  </div>
 );
}


export function IndustryPicker({ value, onChange, industryConfigs, showCustomEntry, customName, onCustomNameChange, customDesc, onCustomDescChange }) {
 const [query, setQuery] = useState("");
 const [focused, setFocused] = useState(false);

 const defaultKeys = Object.keys(DEFAULT_INDUSTRIES).filter(k => k !== "custom");
 const extraKeys = industryConfigs
  ? Object.keys(industryConfigs).filter(k => k !== "admins" && k !== "custom" && !defaultKeys.includes(k))
  : [];

 const allEntries = [
  ...defaultKeys.map(k => ({ key: k, ...DEFAULT_INDUSTRIES[k] })),
  ...extraKeys.map(k => ({
   key: k,
   label: industryConfigs[k]?.label || k,
   icon: industryConfigs[k]?.icon || "◆",
   accentColor: industryConfigs[k]?.accentColor || TS,
  })),
 ];

 const isCustom = value === "custom" || (value && !allEntries.find(e => e.key === value) && value !== "");
 const selectedEntry = allEntries.find(e => e.key === value);

 const filtered = query.trim().length === 0
  ? allEntries
  : allEntries.filter(e => e.label.toLowerCase().includes(query.toLowerCase()));

 // If something is already selected and no query, show the selected value
 if (value && !isCustom && !query && selectedEntry) {
  return (
   <div>
    <button
     onClick={() => { onChange(""); setQuery(""); }}
     style={{
      display: "flex", alignItems: "center", gap: "10px",
      background: `${selectedEntry.accentColor}18`,
      border: `1px solid ${selectedEntry.accentColor}`,
      borderRadius: "14px", padding: "12px 16px",
      cursor: "pointer", fontFamily: F, width: "100%", textAlign: "left",
      WebkitTapHighlightColor: "transparent",
     }}>
     <span style={{ fontSize: "1.3rem" }}>{selectedEntry.icon}</span>
     <span style={{ flex: 1, fontSize: "0.92rem", fontWeight: "700", color: selectedEntry.accentColor }}>{selectedEntry.label}</span>
     <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>change</span>
    </button>
   </div>
  );
 }

 return (
  <div>
   {/* Search input */}
   <div style={{ position: "relative", marginBottom: "8px" }}>
    <input
     autoFocus
     autoComplete="off"
     placeholder="Search your industry…"
     value={query}
     onChange={e => setQuery(e.target.value)}
     onFocus={() => setFocused(true)}
     style={{
      width: "100%", boxSizing: "border-box",
      background: BG1, border: `1px solid ${focused ? TA : "var(--border-1)"}`,
      borderRadius: "14px", padding: "12px 16px 12px 40px",
      fontSize: "0.95rem", color: TP, fontFamily: F, outline: "none",
      transition: "border-color 0.15s",
     }}
    />
    <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "1rem", opacity: 0.4 }}>🔍</span>
   </div>

   {/* Results list */}
   <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "220px", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "var(--border-1) transparent" }}>
    {filtered.map(({ key, label, icon, accentColor }) => (
     <button key={key} onClick={() => { onChange(key); setQuery(""); }}
      style={{
       display: "flex", alignItems: "center", gap: "12px",
       background: value === key ? `${accentColor}18` : "rgba(255,255,255,0.02)",
       border: `1px solid ${value === key ? accentColor : "var(--border-1)"}`,
       borderRadius: "12px", padding: "11px 14px",
       cursor: "pointer", fontFamily: F, textAlign: "left",
       transition: "all 0.1s", outline: "none",
       WebkitTapHighlightColor: "transparent",
      }}>
      <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: "0.88rem", fontWeight: value === key ? "700" : "500", color: value === key ? accentColor : TP }}>{label}</span>
      {value === key && <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: accentColor }}>✓</span>}
     </button>
    ))}

    {/* Custom / Other */}
    <button onClick={() => { onChange("custom"); setQuery(""); }}
     style={{
      display: "flex", alignItems: "center", gap: "12px",
      background: isCustom ? "rgba(123,111,216,0.12)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isCustom ? "#7B6FD8" : "var(--border-1)"}`,
      borderRadius: "12px", padding: "11px 14px",
      cursor: "pointer", fontFamily: F, textAlign: "left",
      outline: "none", WebkitTapHighlightColor: "transparent",
     }}>
     <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>✦</span>
     <span style={{ fontSize: "0.88rem", fontWeight: isCustom ? "700" : "500", color: isCustom ? "#7B6FD8" : TP }}>
      {query.trim() && !filtered.length ? `Use "${query}" as my industry` : "Custom / Other"}
     </span>
     {isCustom && <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#7B6FD8" }}>✓</span>}
    </button>

    {filtered.length === 0 && query.trim() && (
     <div style={{ textAlign: "center", padding: "12px", fontSize: "0.8rem", color: "rgba(255,255,255,0.25)" }}>
      No exact match — use "Custom / Other" above
     </div>
    )}
   </div>

   {/* Custom name + description fields */}
   {(value === "custom" || isCustom) && showCustomEntry && (
    <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "7px" }}>
     <input
      style={{ ...s.inpBase, borderRadius: "8px", padding: "9px 12px", fontSize: "0.95rem", fontFamily: F, width: "100%", boxSizing: "border-box", outline: "none" }}
      placeholder="e.g. Solar, Marathon Training, Content Creator, Insurance"
      value={customName || ""}
      onChange={e => onCustomNameChange && onCustomNameChange(e.target.value)}
      autoFocus
     />
     <textarea
      style={{ ...s.inpBase, borderRadius: "8px", padding: "9px 12px", fontSize: "0.9rem", fontFamily: F, width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: "52px", outline: "none", lineHeight: 1.5 }}
      placeholder="Optional: describe your daily activities and who you work with (helps generate better metrics)"
      value={customDesc || ""}
      onChange={e => onCustomDescChange && onCustomDescChange(e.target.value)}
     />
    </div>
   )}
  </div>
 );
}

// ── ReflectionsJournal ───────────────────────────────────────────────

export function PresenceDot({ status = "offline", size = "sm", style = {} }) {
 const px = size === "md" ? 10 : 8;
 return (
  <div title={PRESENCE_LABELS[status]} style={{
   width: px + "px", height: px + "px", borderRadius: "50%",
   background: PRESENCE_COLORS[status] || PRESENCE_COLORS.offline,
   border: "2px solid var(--bg-1, #0C0C0C)",
   flexShrink: 0,
   ...style,
  }} />
 );
}

// ── usePresence hook ─────────────────────────────────────────────────
// Writes a heartbeat every 30s and polls all users' presence every 30s.
export function usePresence(currentUser, spaceId) {
 const [presenceMap, setPresenceMap] = useState({});
 useEffect(() => {
  if (!currentUser || !spaceId || spaceId.startsWith("solo-")) return;
  // Write immediately, then every 30s
  writePresence(spaceId, currentUser.id).catch(() => {});
  const heartbeat = setInterval(() => {
   writePresence(spaceId, currentUser.id).catch(() => {});
  }, 30000);
  // Poll presence map every 30s
  const poll = () => loadPresence(spaceId).then(m => setPresenceMap(m)).catch(() => {});
  poll();
  const poller = setInterval(poll, 30000);
  return () => { clearInterval(heartbeat); clearInterval(poller); };
 }, [currentUser?.id, spaceId]);
 return presenceMap;
}



const REACTION_EMOJIS = ["🔥","💪","🎉","👏","🏆","💯"];

export function FeedPost({ item, currentUser, industryConfigs, spaceId, onFeedUpdate, isLast, allUsers, streaks, isAdmin, onViewProfile }) {
 const [showComments, setShowComments] = useState(false);
 const [commentText, setCommentText] = useState("");
 const [submitting, setSubmitting] = useState(false);
 const [commentPhoto, setCommentPhoto] = useState(null);
 const [showCommentGif, setShowCommentGif] = useState(false);
 const [showMenu, setShowMenu] = useState(false);
 const [editing, setEditing] = useState(false);
 const [editText, setEditText] = useState(item.text || item.movedNeedle || "");
 const commentFileRef = useRef(null);
 const ind = industryConfigs[item.userIndustry] || { icon: "◆" };
 const isMe = item.userId === currentUser?.id;
 const canModify = isMe || isAdmin;
 const reactions = item.reactions || {};
 const comments = item.comments || [];
 const streak = streaks?.[item.userId]?.current || 0;

 async function handleDelete() {
  setShowMenu(false);
  if (!window.confirm("Delete this post?")) return;
  onFeedUpdate(await deleteFeedItem(spaceId, item.id));
 }

 async function handleSaveEdit() {
  if (!editText.trim()) return;
  const updated = { ...item, text: editText.trim(), movedNeedle: item.type === "reflection" ? editText.trim() : item.movedNeedle, edited: true };
  onFeedUpdate(await updateFeedItem(spaceId, updated));
  setEditing(false);
 }

 // Close menu on outside click (use click, not mousedown, so button clicks register first)
 useEffect(() => {
  if (!showMenu) return;
  const close = (e) => setShowMenu(false);
  // Small delay ensures button click fires before menu is torn down
  const timer = setTimeout(() => document.addEventListener("click", close), 0);
  return () => { clearTimeout(timer); document.removeEventListener("click", close); };
 }, [showMenu]);

 async function toggleReaction(emoji) {
  if (!currentUser) return;
  // Snapshot current reactions defensively (handle both object and missing values)
  const current = {};
  for (const [e, val] of Object.entries(reactions || {})) {
   if (val && typeof val === "object") current[e] = { ...val };
  }
  const alreadyOnThis = !!(current[emoji]?.[currentUser.id]);
  // Strip user from every emoji
  const next = {};
  for (const [e, voters] of Object.entries(current)) {
   const without = {};
   for (const [id, name] of Object.entries(voters)) {
    if (id !== currentUser.id) without[id] = name;
   }
   if (Object.keys(without).length > 0) next[e] = without;
  }
  // Add reaction to new emoji (unless toggling off)
  if (!alreadyOnThis) {
   next[emoji] = { ...(next[emoji] || {}), [currentUser.id]: currentUser.name };
  }
  const updatedItem = { ...item, reactions: next };
  onFeedUpdate(await updateFeedItem(spaceId, updatedItem));
 }

 async function addComment() {
  if (!commentText.trim() && !commentPhoto || !currentUser || submitting) return;
  setSubmitting(true);
  const comment = { id: `c-${Date.now()}`, userId: currentUser.id, userName: currentUser.name, text: commentText.trim(), imageUrl: commentPhoto?.url, imageType: commentPhoto?.type, ts: Date.now() };
  const updatedItem = { ...item, comments: [...comments, comment] };
  const next = await updateFeedItem(spaceId, updatedItem);
  onFeedUpdate(next);
  // Notify mentioned users
  const mentioned = parseMentions(commentText, allUsers);
  for (const mu of mentioned) {
   if (mu.id !== currentUser.id) await pushNotification(mu.id, { icon: "💬", text: `${currentUser.name} mentioned you in a comment: "${commentText.trim().slice(0, 60)}"`, link: "dashboard" });
  }
  // Notify post author if not self
  if (item.userId !== currentUser.id) await pushNotification(item.userId, { icon: "💬", text: `${currentUser.name} commented on your post: "${commentText.trim().slice(0, 60)}"`, link: "dashboard" });
  setCommentText(""); setCommentPhoto(null); setShowCommentGif(false);
  setSubmitting(false);
 }

 const activeReactions = REACTION_EMOJIS.filter(e => reactions[e] && Object.keys(reactions[e]).length > 0);
 const totalComments = comments.length;

 // Post type badge
 const isShoutout = item.type === "shoutout";
 const isReflection = item.type === "reflection";
 const isMilestone = item.type === "milestone";
 const isStreakMilestone = isMilestone && item.subtype === "streak";
 const isPBMilestone = isMilestone && item.subtype === "pb";
 const RATING_EMOJIS = ["","😓","😐","🙂","😊","🔥"];
 const badgeStyle = isShoutout
  ? { background: "rgba(123,111,216,0.15)", color: "#7B6FD8", border: "1px solid rgba(123,111,216,0.3)" }
  : isReflection
  ? { background: "rgba(74,207,134,0.12)", color: "#4ACF86", border: "1px solid rgba(74,207,134,0.3)" }
  : isStreakMilestone
  ? { background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }
  : isPBMilestone
  ? { background: "rgba(74,207,134,0.12)", color: "#4ACF86", border: "1px solid rgba(74,207,134,0.3)" }
  : { background: "rgba(29,201,232,0.12)", color: "var(--accent)", border: "1px solid rgba(29,201,232,0.2)" };

 return (
  <div style={{ borderBottom: isLast ? "none" : "1px solid var(--border-1)" }}>
   <div style={{ padding: "12px 16px", display: "flex", gap: "10px" }}>
    <div style={{ position: "relative", flexShrink: 0, marginTop: "2px" }}>
     <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: isMe ? initialsColor(currentUser?.name, currentUser?.accentColor) : initialsColor(item.userName, null), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: "800", color: "#fff" }}>
      {item.userName?.charAt(0).toUpperCase() || "?"}
     </div>
     {streak >= 3 && (
      <div title={`${streak}-day streak`} style={{ position: "absolute", bottom: "-4px", right: "-4px", fontSize: "0.65rem", lineHeight: 1, background: "var(--bg-1)", borderRadius: "6px", padding: "1px 3px", border: "1px solid rgba(245,158,11,0.4)", color: "#F59E0B", fontWeight: "700", fontFamily: F, whiteSpace: "nowrap" }}>🔥{streak}</div>
     )}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
     <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
      <span style={{ fontSize: "0.88rem", fontWeight: "700", color: isMe ? "var(--accent)" : "var(--text-primary)", fontFamily: F, cursor: onViewProfile ? "pointer" : "default" }} onClick={() => { if (onViewProfile) { haptic.light(); const postUser = allUsers?.find(u => u.id === item.userId); if (postUser) onViewProfile(postUser); } }}>{item.userName}</span>
      <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{ind.icon}</span>
      { (isShoutout || isReflection || isMilestone || ["tip","question","challenge","spark"].includes(item.type)) && (
  <span style={{ fontSize: "0.72rem", ...badgeStyle, borderRadius: "6px", padding: "1px 7px", fontWeight: "700", letterSpacing: "0.06em" }}>
    {isShoutout ? "SHOUTOUT" : isReflection ? "WEEK IN REVIEW" : isStreakMilestone ? "STREAK" : isPBMilestone ? "MILESTONE" : item.type === "tip" ? "💡 TIP" : item.type === "question" ? "❓ Q" : item.type === "challenge" ? "⚡ CHALLENGE" : item.type === "spark" ? "💡 SPARK" : ""}
  </span>
)}
      <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginLeft: "auto" }}>{relTimeStatic(item.ts)}{item.edited && <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginLeft: "4px" }}>(edited)</span>}</span>
      {canModify && (
       <div style={{ position: "relative", flexShrink: 0 }}>
        <button onClick={() => setShowMenu(v => !v)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "6px 8px", borderRadius: "6px", fontSize: "0.9rem", lineHeight: 1, WebkitTapHighlightColor: "transparent", minWidth: "32px", minHeight: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>⋯</button>
        {showMenu && (
         <div style={{ position: "absolute", right: 0, top: "100%", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 50, minWidth: "130px", overflow: "hidden" }}
          onClick={e => e.stopPropagation()}>
          {isMe && (
           <button onClick={() => { setShowMenu(false); setEditing(true); setEditText(item.text || item.movedNeedle || ""); }}
            style={{ width: "100%", background: "none", border: "none", padding: "10px 14px", textAlign: "left", color: "var(--text-primary)", fontSize: "0.85rem", cursor: "pointer", fontFamily: F, display: "flex", gap: "8px", alignItems: "center" }}>
            ✏️ Edit post
           </button>
          )}
          {(isMe || isAdmin) && (
           <button onClick={handleDelete}
            style={{ width: "100%", background: "none", border: "none", padding: "10px 14px", textAlign: "left", color: "rgba(224,85,119,0.9)", fontSize: "0.85rem", cursor: "pointer", fontFamily: F, display: "flex", gap: "8px", alignItems: "center" }}>
            🗑 Delete post
           </button>
          )}
         </div>
        )}
       </div>
      )}
     </div>
     {editing ? (
      <div style={{ marginTop: "6px" }}>
       <textarea
        value={editText}
        onChange={e => setEditText(e.target.value)}
        style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--accent)", color: "var(--text-primary)", borderRadius: "10px", padding: "10px 12px", fontSize: "0.92rem", lineHeight: 1.55, fontFamily: F, resize: "vertical", outline: "none", boxSizing: "border-box", minHeight: "80px" }}
        autoFocus
       />
       <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        <button onClick={handleSaveEdit} style={{ background: "var(--accent)", color: "#000", border: "none", padding: "7px 16px", borderRadius: "8px", fontWeight: "700", fontSize: "0.82rem", cursor: "pointer", fontFamily: F }}>Save</button>
        <button onClick={() => setEditing(false)} style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-muted)", padding: "7px 14px", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer", fontFamily: F }}>Cancel</button>
       </div>
      </div>
     ) : (
      <div style={{ fontSize: "0.92rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
       {isReflection ? (
        <div>
         {item.movedNeedle && <div style={{ marginBottom: item.intention ? "10px" : 0 }}>{renderMentionText(item.movedNeedle, allUsers, currentUser?.id)}</div>}
         {item.intention && <div style={{ fontSize: "0.83rem", color: "var(--text-muted)", borderLeft: "2px solid var(--border-2)", paddingLeft: "10px", fontStyle: "italic" }}>This week: {item.intention}</div>}
         {!item.movedNeedle && !item.intention && item.text && renderMentionText(item.text, allUsers, currentUser?.id)}
        </div>
       ) : renderMentionText(item.text, allUsers, currentUser?.id)}
      </div>
     )}
     {/* Post image */}
     {item.imageUrl && (
      <div style={{margin:"10px -16px 0 -16px",paddingLeft:"60px",paddingRight:"16px",overflow:"hidden"}}>
       <img
        src={item.imageUrl}
        alt="post"
        style={{width:"100%",maxHeight:"400px",objectFit:"cover",borderRadius:"10px",display:"block",cursor:"pointer"}}
        onClick={()=>window.open(item.imageUrl,"_blank")}
        onError={e=>e.target.style.display="none"}
       />
      </div>
     )}
     {/* Kudos + Reaction + comment row */}
     {(() => {
      const kudosData = reactions["__kudos__"] || {};
      const kudosCount = Object.keys(kudosData).length;
      const iKudosed = !!kudosData[currentUser?.id];
      const kudosNames = Object.values(kudosData).slice(0,5).join(", ") + (kudosCount > 5 ? ` +${kudosCount - 5}` : "");
      return (
       <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "10px", flexWrap: "wrap" }}>
        {/* ── PACE — primary action ── */}
        <button
         title={kudosCount > 0 ? kudosNames : "Send kudos"}
         onClick={() => { haptic.medium(); toggleReaction("__kudos__"); }}
         style={{
          background: iKudosed ? "rgba(29,201,232,0.12)" : "var(--bg-2)",
          border: `1px solid ${iKudosed ? "rgba(29,201,232,0.35)" : "var(--border-1)"}`,
          borderRadius: "12px", padding: "5px 13px",
          fontSize: "0.78rem", fontWeight: "800", cursor: "pointer", fontFamily: F,
          display: "flex", alignItems: "center", gap: "6px",
          color: iKudosed ? "var(--accent)" : "var(--text-muted)",
          transition: "all 0.12s", WebkitTapHighlightColor: "transparent", minHeight: "32px",
          letterSpacing: "0.04em",
         }}>
         <span style={{ fontSize: "0.9rem" }}>👊</span>
         <span>{iKudosed ? "Kudos" : "Kudos"}</span>
         {kudosCount > 0 && <span style={{ opacity: 0.75, fontWeight: "600" }}>{kudosCount}</span>}
        </button>
        {/* ── Secondary emoji reactions ── */}
        {activeReactions.filter(e => e !== "__kudos__").map(emoji => {
         const count = Object.keys(reactions[emoji] || {}).length;
         const iReacted = !!(reactions[emoji] || {})[currentUser?.id];
         const names = Object.values(reactions[emoji] || {}).join(", ");
         return (
          <button key={emoji} title={names} onClick={() => { haptic.light(); toggleReaction(emoji); }} style={{ background: iReacted ? "rgba(29,201,232,0.08)" : "transparent", border: `1px solid ${iReacted ? "rgba(29,201,232,0.2)" : "transparent"}`, borderRadius: "12px", padding: "4px 8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: "3px", color: iReacted ? "var(--accent)" : "var(--text-muted)", transition: "all 0.1s", WebkitTapHighlightColor: "transparent", minHeight: "30px" }}>
           {emoji} <span style={{ fontWeight: "700", fontSize: "0.72rem" }}>{count}</span>
          </button>
         );
        })}
        <ReactionPicker onPick={(emoji) => { haptic.light(); toggleReaction(emoji); }} />
        <button onClick={() => setShowComments(v => !v)} style={{ background: "none", border: "none", color: showComments ? "var(--accent)" : "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem", padding: "3px 6px", borderRadius: "8px", fontFamily: F, display: "flex", alignItems: "center", gap: "4px", WebkitTapHighlightColor: "transparent" }}>
         💬 {totalComments > 0 ? totalComments : ""} <span style={{ fontSize: "0.75rem" }}>{showComments ? "Hide" : "Comment"}</span>
        </button>
       </div>
      );
     })()}
    </div>
   </div>
   {showComments && (
    <div style={{ padding: "0 16px 12px 60px" }}>
     {comments.map(c => (
      <div key={c.id} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "flex-start" }}>
       <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: c.userId === currentUser?.id ? initialsColor(currentUser?.name, currentUser?.accentColor) : initialsColor(c.userName, null), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: "800", color: "#fff", flexShrink: 0, marginTop: "1px" }}>
        {c.userName?.charAt(0).toUpperCase() || "?"}
       </div>
       <div style={{ flex: 1, background: "var(--bg-2)", borderRadius: "10px", padding: "7px 10px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "2px" }}>
         <span style={{ fontSize: "0.8rem", fontWeight: "700", color: c.userId === currentUser?.id ? "var(--accent)" : "var(--text-primary)", fontFamily: F }}>{c.userName}</span>
         <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{relTimeStatic(c.ts)}</span>
        </div>
        <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>{renderMentionText(c.text, allUsers, currentUser?.id)}</div>
        {c.imageUrl && <img src={c.imageUrl} alt="" style={{ marginTop: "6px", maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", display: "block", cursor: "pointer" }} onClick={() => window.open(c.imageUrl, "_blank")} onError={e => e.target.style.display = "none"} />}
       </div>
      </div>
     ))}
     <div style={{ marginTop: "4px" }}>
      {/* Comment photo preview */}
      {commentPhoto && (
       <div style={{ position: "relative", marginBottom: "6px", display: "inline-block" }}>
        <img src={commentPhoto.url} alt="" style={{ maxHeight: "120px", maxWidth: "100%", borderRadius: "8px", display: "block" }} />
        <button onClick={() => setCommentPhoto(null)} style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", fontSize: "0.7rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
       </div>
      )}
      {showCommentGif && (
       <GifPicker onSelect={g => { setCommentPhoto({ url: g.url, type: "gif" }); setShowCommentGif(false); }} onClose={() => setShowCommentGif(false)} />
      )}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", position: "relative" }}>
       <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: initialsColor(currentUser?.name, currentUser?.accentColor), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: "800", color: "#fff", flexShrink: 0 }}>
        {currentUser?.name?.charAt(0).toUpperCase() || "?"}
       </div>
       <MentionInput value={commentText} onChange={setCommentText} onSubmit={addComment} allUsers={allUsers} placeholder="Add a comment... @mention someone" style={{ borderRadius: "20px", padding: "6px 12px", fontSize: "0.85rem" }} />
       <input ref={commentFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        const { data, error } = await window._sb.storage.from("posts").upload(`comments/${currentUser.id}-${Date.now()}.${file.name.split(".").pop()}`, file, { upsert: true });
        if (!error) { const { data: { publicUrl } } = window._sb.storage.from("posts").getPublicUrl(data.path); setCommentPhoto({ url: publicUrl, type: "image" }); }
        e.target.value = "";
       }} />
       <button onClick={() => commentFileRef.current?.click()} style={{ background: "none", border: "none", fontSize: "1rem", cursor: "pointer", padding: "4px", color: "var(--text-dim)", flexShrink: 0, WebkitTapHighlightColor: "transparent" }} title="Add photo">📷</button>
       <button onClick={() => setShowCommentGif(v => !v)} style={{ background: "none", border: "1px solid var(--border-1)", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer", padding: "4px 6px", color: "var(--text-dim)", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>GIF</button>
       {(commentText.trim() || commentPhoto) && (
        <button onClick={()=>{haptic.medium();addComment();}} disabled={submitting} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer", fontFamily: F, flexShrink: 0 }}>{submitting ? "..." : "→"}</button>
       )}
      </div>
     </div>
    </div>
   )}
  </div>
 );
}


// ── GifPicker ─────────────────────────────────────────────────────────
export function GifPicker({ onSelect, onClose }) {
 const [query, setQuery] = useState("");
 const [results, setResults] = useState([]);
 const [loading, setLoading] = useState(false);
 const [debouncedQ, setDebouncedQ] = useState("");
 const inputRef = useRef(null);
 const API_KEY = import.meta.env.VITE_GIPHY_KEY || "";

 useEffect(() => { inputRef.current?.focus(); }, []);

 // Debounce query
 useEffect(() => {
  const t = setTimeout(() => setDebouncedQ(query), 400);
  return () => clearTimeout(t);
 }, [query]);

 // Fetch on debounced query change
 useEffect(() => {
  const q = debouncedQ.trim();
  if (!q) {
   // Load trending when empty
   fetchGifs("trending");
   return;
  }
  fetchGifs("search", q);
 }, [debouncedQ]);

 // Load trending on mount
 useEffect(() => { fetchGifs("trending"); }, []);

 async function fetchGifs(type, q = "") {
  setLoading(true);
  try {
   const base = type === "trending"
    ? `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=24&rating=g`
    : `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=g`;
   const res = await fetch(base);
   const data = await res.json();
   setResults(data.data || []);
  } catch { setResults([]); }
  setLoading(false);
 }

 // Close on outside click
 const ref = useRef(null);
 useEffect(() => {
  function handle(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
  document.addEventListener("mousedown", handle);
  document.addEventListener("touchstart", handle);
  return () => { document.removeEventListener("mousedown", handle); document.removeEventListener("touchstart", handle); };
 }, []);

 // Calculate position from button ref
 const [pos, setPos] = React.useState(null);
 const btnRef = React.useRef(null);
 React.useLayoutEffect(() => {
  if (ref.current) {
   // Walk up to find the composer container (has position:relative)
   let el = ref.current.parentElement;
   while (el && el.style?.position !== "relative") el = el.parentElement;
   const r = (el || ref.current.parentElement)?.getBoundingClientRect();
   if (r) setPos({ bottom: window.innerHeight - r.top + 8, left: r.left, width: Math.max(320, r.width) });
  }
 }, []);
 return (
  <div ref={ref} onMouseDown={e=>e.stopPropagation()} style={{ position:"fixed", bottom: pos ? pos.bottom : 120, left: pos ? pos.left : 16, width: pos ? pos.width : 320, background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"16px", boxShadow:"0 8px 32px rgba(0,0,0,0.6)", zIndex:9999, overflow:"hidden", maxHeight:"380px", display:"flex", flexDirection:"column" }}>
   {/* Search bar */}
   <div style={{ padding:"10px 12px", borderBottom:"1px solid var(--border-1)", display:"flex", alignItems:"center", gap:"8px" }}>
    <span style={{ fontSize:"1rem" }}>🔍</span>
    <input
     ref={inputRef}
     value={query}
     onChange={e => setQuery(e.target.value)}
     onPaste={e => e.stopPropagation()}
     onKeyDown={e => e.stopPropagation()}
     placeholder="Search GIFs…"
     style={{ flex:1, background:"none", border:"none", outline:"none", color:"var(--text-primary)", fontFamily:F, fontSize:"0.9rem" }}
    />
    <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text-dim)", cursor:"pointer", fontSize:"1rem", lineHeight:1, padding:"2px" }}>✕</button>
   </div>
   {/* Grid */}
   <div style={{ overflowY:"auto", WebkitOverflowScrolling:"touch", flex:1 }}>
    {loading && <div style={{ padding:"20px", textAlign:"center", color:"var(--text-dim)", fontSize:"0.85rem" }}>Loading…</div>}
    {!loading && results.length === 0 && <div style={{ padding:"20px", textAlign:"center", color:"var(--text-dim)", fontSize:"0.85rem" }}>No results</div>}
    {!loading && results.length > 0 && (
     <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"2px", padding:"4px" }}>
      {results.map(gif => {
       const preview = gif.images?.fixed_height_small?.url || gif.images?.preview_gif?.url;
       const full = gif.images?.original?.url || gif.images?.fixed_height?.url;
       if (!preview) return null;
       return (
        <div key={gif.id} onClick={() => onSelect({ url: full || preview, previewUrl: preview, type: "gif" })}
         style={{ aspectRatio:"1", overflow:"hidden", borderRadius:"8px", cursor:"pointer", background:"var(--bg-3)" }}>
         <img src={preview} alt={gif.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} loading="lazy" />
        </div>
       );
      })}
     </div>
    )}
    <div style={{ padding:"8px", textAlign:"center", fontSize:"0.65rem", color:"var(--text-dim)" }}>Powered by GIPHY</div>
   </div>
  </div>
 );
}

export function ReactionPicker({ onPick }) {
 const [open, setOpen] = useState(false);
 const ref = useRef(null);
 useEffect(() => {
  if (!open) return;
  function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
  document.addEventListener("mousedown", handle);
  document.addEventListener("touchstart", handle);
  return () => { document.removeEventListener("mousedown", handle); document.removeEventListener("touchstart", handle); };
 }, [open]);
 return (
  <div ref={ref} style={{ position: "relative" }}>
   <button onClick={() => setOpen(v => !v)} title="React" style={{ background: "none", border: "1px solid var(--border-1)", borderRadius: "12px", padding: "4px 9px", fontSize: "0.85rem", cursor: "pointer", color: "var(--text-dim)", WebkitTapHighlightColor: "transparent", minHeight: "30px" }}>＋😊</button>
   {open && (
    <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "14px", padding: "8px 10px", display: "flex", gap: "2px", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", whiteSpace: "nowrap" }}>
     {REACTION_EMOJIS.map(e => (
      <button key={e} onClick={() => { onPick(e); setOpen(false); }} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", padding: "4px 5px", borderRadius: "8px", lineHeight: 1, WebkitTapHighlightColor: "transparent", minWidth: "36px", minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>{e}</button>
     ))}
    </div>
   )}
  </div>
 );
}

// ── parseMentions: extract @Name tokens from text ────────────────────
function parseMentions(text, allUsers) {
 if (!text || !allUsers) return [];
 const mentioned = [];
 const re = /@([A-Za-z][A-Za-z0-9 ._-]{1,28})/g;
 let m;
 while ((m = re.exec(text)) !== null) {
  const token = m[1].toLowerCase();
  const match = allUsers.find(u => u.name.toLowerCase().startsWith(token));
  if (match && !mentioned.find(x => x.id === match.id)) mentioned.push(match);
 }
 return mentioned;
}

// ── renderMentionText: highlight @mentions in rendered text ──────────
function renderMentionText(text, allUsers, currentUserId) {
 if (!text) return text;
 const parts = text.split(/(@[A-Za-z][A-Za-z0-9 ._-]{1,28})/g);
 return parts.map((part, i) => {
  if (part.startsWith("@")) {
   const token = part.slice(1).toLowerCase();
   const match = (allUsers || []).find(u => u.name.toLowerCase().startsWith(token));
   if (match) {
    const isMe = match.id === currentUserId;
    return <span key={i} style={{ color: isMe ? "#F59E0B" : "var(--accent)", fontWeight: "700", background: isMe ? "rgba(245,158,11,0.1)" : "rgba(29,201,232,0.1)", borderRadius: "4px", padding: "0 3px" }}>{part}</span>;
   }
  }
  return part;
 });
}

// ── MentionInput: textarea/input with @mention autocomplete ──────────
export function MentionInput({ value, onChange, onSubmit, onFocus, allUsers, placeholder, style = {}, multiline = false }) {
 const [suggestions, setSuggestions] = useState([]);
 const [mentionSearch, setMentionSearch] = useState("");
 const [caretPos, setCaretPos] = useState(null);
 const ref = useRef(null);

 function handleChange(e) {
  const val = e.target.value;
  onChange(val);
  // Detect @mention trigger
  const cursor = e.target.selectionStart;
  const textBefore = val.slice(0, cursor);
  const atMatch = textBefore.match(/@([A-Za-z0-9 ]*)$/);
  if (atMatch) {
   const q = atMatch[1].toLowerCase();
   setMentionSearch(q);
   setSuggestions((allUsers || []).filter(u => u.name.toLowerCase().startsWith(q)).slice(0, 5));
  } else {
   setSuggestions([]);
   setMentionSearch("");
  }
 }

 function pickSuggestion(user) {
  const cursor = ref.current.selectionStart;
  const textBefore = value.slice(0, cursor);
  const atIdx = textBefore.lastIndexOf("@");
  const newVal = value.slice(0, atIdx) + "@" + user.name + " " + value.slice(cursor);
  onChange(newVal);
  setSuggestions([]);
  setTimeout(() => ref.current?.focus(), 0);
 }

 const inputStyle = { flex: 1, background: "var(--bg-2)", border: "1px solid var(--border-1)", color: "var(--text-primary)", padding: "9px 14px", borderRadius: multiline ? "14px" : "24px", fontSize: "0.9rem", fontFamily: F, outline: "none", resize: "none", ...style };

 return (
  <div style={{ flex: 1, position: "relative" }}>
   {multiline
    ? <textarea ref={ref} style={{ ...inputStyle, minHeight: "60px", lineHeight: 1.5 }} placeholder={placeholder} value={value} onChange={handleChange} onFocus={onFocus} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && suggestions.length === 0) { e.preventDefault(); onSubmit && onSubmit(); } }} />
    : <input ref={ref} style={inputStyle} placeholder={placeholder} value={value} onChange={handleChange} onFocus={onFocus} onKeyDown={e => { if (e.key === "Enter" && suggestions.length === 0) { e.preventDefault(); onSubmit && onSubmit(); } }} />
   }
   {suggestions.length > 0 && (
    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "10px", zIndex: 60, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", overflow: "hidden" }}>
     {suggestions.map(u => (
      <div key={u.id} onMouseDown={e => { e.preventDefault(); pickSuggestion(u); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.88rem", color: "var(--text-primary)", fontFamily: F, display: "flex", alignItems: "center", gap: "8px" }}
       onMouseEnter={e => e.currentTarget.style.background = "var(--bg-3)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
       <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: initialsColor(u.name, u.avatarColor), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "800", color: "#fff", flexShrink: 0 }}>{u.name.charAt(0)}</div>
       @{u.name}
      </div>
     ))}
    </div>
   )}
  </div>
 );
}

// ── useNotifications hook ────────────────────────────────────────────
export function useNotifications(currentUser) {
 const [notifs, setNotifs] = useState([]);
 const [unread, setUnread] = useState(0);
 useEffect(() => {
  if (!currentUser) return;
  function load() {
   loadNotifications(currentUser.id).then(n => {
    setNotifs(n);
    setUnread(n.filter(x => !x.read).length);
   }).catch(() => {});
  }
  load();
  const iv = setInterval(load, 15000);
  return () => clearInterval(iv);
 }, [currentUser?.id]);

 async function markAllRead() {
  const updated = notifs.map(n => ({ ...n, read: true }));
  setNotifs(updated);
  setUnread(0);
  if (currentUser) await saveNotifications(currentUser.id, updated);
 }
 async function markRead(id) {
  const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
  setNotifs(updated);
  setUnread(updated.filter(x => !x.read).length);
  if (currentUser) await saveNotifications(currentUser.id, updated);
 }
 return { notifs, unread, markAllRead, markRead, setNotifs };
}

// ── NotificationsPanel ───────────────────────────────────────────────

// ── JournalView ───────────────────────────────────────────────────────
// Templates for new entries
// ── Journal prompt schedule helpers ──────────────────────────────────
// Returns which timed prompts are due today
export function getTimedJournalPrompts(settings = {}) {
 const now = new Date();
 const dow  = now.getDay();     // 0=Sun,1=Mon…6=Sat
 const dom  = now.getDate();
 const month = now.getMonth(); // 0-based
 const prompts = [];

 // Daily — show every evening (we display it always, user logged in = "end of day")
 if (settings.showDailyPrompt !== false)
  prompts.push("daily");

 // Weekly — Fri/Sat/Sun
 if (settings.showWeeklyPrompt !== false && [5, 6, 0].includes(dow))
  prompts.push("weekly");

 // Monthly — last 3 days of the month
 const lastDay = new Date(now.getFullYear(), month + 1, 0).getDate();
 if (settings.showMonthlyPrompt !== false && dom >= lastDay - 2)
  prompts.push("monthly");

 // Quarterly — last 3 days of Mar(2), Jun(5), Sep(8), Dec(11)
 if (settings.showQuarterlyPrompt !== false && [2, 5, 8, 11].includes(month) && dom >= lastDay - 2)
  prompts.push("quarterly");

 // Annual — last 3 days of December
 if (settings.showAnnualPrompt !== false && month === 11 && dom >= 29)
  prompts.push("annual");

 return prompts;
}

// Label + icon for the nudge buttons

export function ReflectionModal({ currentUser, industryConfig, weekKeyStr, myData, myGoals, onClose, onPostToFeed }) {
 const [wins, setWins] = useState("");
 const [movedNeedle, setMovedNeedle] = useState("");
 const [intention, setIntention] = useState("");
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);
 const [showHistory, setShowHistory] = useState(false);
 const [history, setHistory] = useState([]);
 const [historyLoading, setHistoryLoading] = useState(false);
 const [lastWeek, setLastWeek] = useState(null);
 const [viewMode, setViewMode] = useState("avg");

 const F = "'DM Sans',system-ui,sans-serif";

 // Load last week reflection for context
 useEffect(() => {
  const today = new Date();
  const dow = today.getDay();
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const ds = `${lastMonday.getFullYear()}-${String(lastMonday.getMonth()+1).padStart(2,"0")}-${String(lastMonday.getDate()).padStart(2,"0")}`;
  const lk = weekKey(ds);
  loadWeeklyReflection(currentUser.id, lk).then(r => setLastWeek(r)).catch(() => {});
 }, []);

 // Load history
 function openHistory() {
  setShowHistory(true);
  setHistoryLoading(true);
  loadAllReflections(currentUser.id).then(r => { setHistory(r); setHistoryLoading(false); }).catch(() => setHistoryLoading(false));
 }

 // Week stats
 const weekStats = useMemo(() => {
  if (!myData || !industryConfig) return null;
  const metrics = industryConfig.weekdayMetrics || [];
  if (!metrics.length) return null;
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const days = [];
  for (let i = 0; i < 7; i++) {
   const d = new Date(monday);
   d.setDate(monday.getDate() + i);
   const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
   const dayData = myData[dk];
   if (dayData && Object.values(dayData).some(v => typeof v === "number" && v > 0)) days.push({ dk, data: dayData });
  }
  if (!days.length) return null;
  const totals = {};
  metrics.forEach(m => { totals[m.key] = days.reduce((sum, d) => sum + (d.data[m.key] || 0), 0); });
  const avgs = {};
  metrics.forEach(m => { avgs[m.key] = days.length > 0 ? totals[m.key] / days.length : 0; });
  return { totals, avgs, activeDays: days.length, metrics };
 }, [myData, industryConfig]);

 async function handleSave(andPost) {
  if (!movedNeedle.trim() && !intention.trim() && !wins.trim()) return;
  setSaving(true);
  const reflection = {
   weekKey: weekKeyStr,
   userId: currentUser.id,
   userName: currentUser.name,
   wins: wins.trim(),
   movedNeedle: movedNeedle.trim(),
   intention: intention.trim(),
   weekStats: weekStats ? { totals: weekStats.totals, avgs: weekStats.avgs, activeDays: weekStats.activeDays } : null,
   ts: Date.now(),
  };
  await saveWeeklyReflection(currentUser.id, weekKeyStr, reflection);
  setSaving(false);
  setSaved(true);
  if (andPost) onPostToFeed(reflection);
  setTimeout(() => onClose(), andPost ? 0 : 1200);
 }

 const inputSty = { width:"100%", background:"var(--bg-2)", border:"1px solid var(--border-1)", color:"var(--text-primary)", padding:"11px 13px", borderRadius:"10px", fontSize:"0.95rem", fontFamily:F, outline:"none", boxSizing:"border-box" };
 const taSty = { ...inputSty, resize:"vertical", minHeight:"90px", lineHeight:1.6 };
 const labelSty = { fontSize:"0.7rem", fontWeight:"700", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:"7px" };

 return (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
   onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
   <div style={{ background:"var(--bg-1)", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:"600px", maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 -8px 40px rgba(0,0,0,0.6)" }}>

    {/* Header */}
    <div style={{ padding:"16px 20px 14px", borderBottom:"1px solid var(--border-1)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
     <div>
      <div style={{ fontSize:"1rem", fontWeight:"800", color:"var(--text-primary)", fontFamily:F }}>
       {showHistory ? "📓 Journal History" : "📝 Week in Review"}
      </div>
      {!showHistory && <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", marginTop:"2px" }}>Saved privately to your journal</div>}
     </div>
     <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
      {!showHistory && (
       <button onClick={openHistory} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"6px 12px", borderRadius:"8px", fontSize:"0.78rem", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
        📓 History
       </button>
      )}
      {showHistory && (
       <button onClick={() => setShowHistory(false)} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"6px 12px", borderRadius:"8px", fontSize:"0.78rem", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
        ← Write
       </button>
      )}
      <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text-dim)", fontSize:"1.3rem", cursor:"pointer", padding:"2px 6px", lineHeight:1, WebkitTapHighlightColor:"transparent" }}>✕</button>
     </div>
    </div>

    {/* Scrollable body */}
    <div style={{ overflowY:"auto", WebkitOverflowScrolling:"touch", flex:1, padding:"20px" }}>

     {/* ── History view ── */}
     {showHistory && (
      <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
       {historyLoading && <div style={{ textAlign:"center", padding:"40px 0", color:"var(--text-dim)", fontSize:"0.9rem" }}>Loading…</div>}
       {!historyLoading && history.length === 0 && (
        <div style={{ textAlign:"center", padding:"40px 16px" }}>
         <div style={{ fontSize:"2rem", marginBottom:"12px", opacity:0.4 }}>📓</div>
         <div style={{ fontSize:"0.9rem", color:"var(--text-muted)", lineHeight:1.6 }}>No journal entries yet. Write your first reflection and it'll appear here.</div>
        </div>
       )}
       {history.map((r, i) => (
        <div key={r.weekKey || i} style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"14px", padding:"16px 18px" }}>
         <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"12px" }}>
          {r.weekKey} · {r.ts ? new Date(r.ts).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : ""}
         </div>
         {r.wins && (
          <div style={{ marginBottom:"10px" }}>
           <div style={{ fontSize:"0.7rem", color:"var(--text-dim)", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"4px" }}>Results</div>
           <div style={{ fontSize:"0.9rem", color:"var(--text-secondary)", lineHeight:1.55 }}>{r.wins}</div>
          </div>
         )}
         {r.movedNeedle && (
          <div style={{ marginBottom:"10px" }}>
           <div style={{ fontSize:"0.7rem", color:"var(--text-dim)", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"4px" }}>What moved the needle</div>
           <div style={{ fontSize:"0.9rem", color:"var(--text-secondary)", lineHeight:1.55, fontStyle:"italic" }}>{r.movedNeedle}</div>
          </div>
         )}
         {r.intention && (
          <div>
           <div style={{ fontSize:"0.7rem", color:"var(--text-dim)", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"4px" }}>Focus for next week</div>
           <div style={{ fontSize:"0.9rem", color:"var(--accent)", lineHeight:1.55, fontWeight:"600" }}>{r.intention}</div>
          </div>
         )}
        </div>
       ))}
      </div>
     )}

     {/* ── Write view ── */}
     {!showHistory && !saved && (
      <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>

       {/* Week stats summary */}
       {weekStats && (
        <div>
         <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
          <div style={labelSty}>Your week</div>
          <div style={{ display:"flex", background:"var(--bg-2)", borderRadius:"8px", padding:"2px", gap:"2px" }}>
           {[["avg","Avg/day"],["total","Totals"]].map(([v,l]) => (
            <button key={v} onClick={() => setViewMode(v)} style={{ padding:"3px 10px", borderRadius:"6px", border:"none", cursor:"pointer", fontFamily:F, fontSize:"0.72rem", fontWeight:"700", background:viewMode===v?"var(--bg-0, #0C0C0C)":"none", color:viewMode===v?"var(--text-primary)":"var(--text-dim)", WebkitTapHighlightColor:"transparent" }}>{l}</button>
           ))}
          </div>
         </div>
         <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:"8px" }}>
          {weekStats.metrics.map(m => {
           const val = viewMode === "avg" ? weekStats.avgs[m.key] : weekStats.totals[m.key];
           const goal = myGoals?.[m.key] ?? m.defaultGoal;
           const pct = goal > 0 ? Math.min(1, (viewMode === "avg" ? weekStats.avgs[m.key] : weekStats.totals[m.key] / (weekStats.activeDays||1)) / goal) : 0;
           return (
            <div key={m.key} style={{ background:"var(--bg-2)", borderRadius:"10px", padding:"10px 12px" }}>
             <div style={{ fontSize:"0.68rem", color:"var(--text-dim)", marginBottom:"4px", fontFamily:F, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.short||m.label}</div>
             <div style={{ fontSize:"1.3rem", fontWeight:"800", color:"var(--text-primary)", lineHeight:1, fontFamily:F }}>{viewMode==="avg" ? (val%1===0?val:val.toFixed(1)) : val}</div>
             {viewMode==="avg" && goal > 0 && (
              <div style={{ marginTop:"5px", height:"3px", background:"var(--bg-3)", borderRadius:"2px", overflow:"hidden" }}>
               <div style={{ height:"100%", width:`${Math.round(pct*100)}%`, background:pct>=1?"#4ACF86":"var(--accent)", borderRadius:"2px" }}/>
              </div>
             )}
            </div>
           );
          })}
         </div>
         <div style={{ fontSize:"0.72rem", color:"var(--text-dim)", marginTop:"6px" }}>{weekStats.activeDays} day{weekStats.activeDays!==1?"s":""} logged</div>
        </div>
       )}

       {/* Last week intention reminder */}
       {lastWeek?.intention && (
        <div style={{ background:"rgba(123,111,216,0.08)", border:"1px solid rgba(123,111,216,0.25)", borderRadius:"10px", padding:"12px 14px" }}>
         <div style={{ fontSize:"0.7rem", fontWeight:"700", color:"#9B8FE8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"5px" }}>Last week you wanted to focus on</div>
         <div style={{ fontSize:"0.9rem", color:"var(--text-secondary)", fontStyle:"italic", lineHeight:1.55 }}>{lastWeek.intention}</div>
        </div>
       )}

       {/* Wins */}
       <div>
        <div style={labelSty}>Results & wins <span style={{ fontWeight:"400", textTransform:"none", letterSpacing:0, opacity:0.6 }}>— optional</span></div>
        <input value={wins} onChange={e=>setWins(e.target.value)} placeholder="Wins, milestones, results — what happened this week?" style={inputSty} />
       </div>

       {/* What moved the needle */}
       <div>
        <div style={labelSty}>What moved the needle this week?</div>
        <textarea value={movedNeedle} onChange={e=>setMovedNeedle(e.target.value)} placeholder="What actually moved the needle — or held you back?" style={taSty} />
       </div>

       {/* Intention */}
       <div>
        <div style={labelSty}>Heading into next week, I want to focus on</div>
        <textarea value={intention} onChange={e=>setIntention(e.target.value)} placeholder="One thing. Be specific." rows={2} style={{ ...taSty, minHeight:"64px" }} />
       </div>
      </div>
     )}

     {saved && (
      <div style={{ textAlign:"center", padding:"40px 20px" }}>
       <div style={{ fontSize:"2rem", marginBottom:"12px" }}>✅</div>
       <div style={{ fontSize:"1rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F }}>Reflection saved.</div>
       <div style={{ fontSize:"0.85rem", color:"var(--text-muted)", marginTop:"4px" }}>Added to your journal.</div>
      </div>
     )}
    </div>

    {/* Footer actions */}
    {!showHistory && !saved && (
     <div style={{ padding:"14px 20px 24px", borderTop:"1px solid var(--border-1)", display:"flex", flexDirection:"column", gap:"8px", flexShrink:0 }}>
      <button onClick={() => handleSave(false)} disabled={saving || (!movedNeedle.trim() && !intention.trim() && !wins.trim())}
       style={{ width:"100%", background:"var(--accent)", color:"#000", border:"none", padding:"13px", borderRadius:"12px", fontWeight:"800", fontSize:"0.95rem", cursor:"pointer", fontFamily:F, minHeight:"48px", opacity:(!movedNeedle.trim()&&!intention.trim()&&!wins.trim())?0.4:1 }}>
       {saving ? "Saving…" : "Save to Journal"}
      </button>
      {(movedNeedle.trim() || intention.trim()) && (
       <button onClick={() => handleSave(true)} disabled={saving}
        style={{ width:"100%", background:"none", border:"1px solid var(--border-1)", color:"var(--text-secondary)", padding:"12px", borderRadius:"12px", fontWeight:"600", fontSize:"0.88rem", cursor:"pointer", fontFamily:F, minHeight:"44px" }}>
        Save & Share to Team Feed
       </button>
      )}
     </div>
    )}
   </div>
  </div>
 );
}

// ── WeeklyReflectionPrompt ───────────────────────────────────────────

export function WeeklyMVP({ spaceId, currentUser, allUsers, weekKeyStr }) {
 const [votes, setVotes] = useState({});
 const [voted, setVoted] = useState(false);
 const [showVoter, setShowVoter] = useState(false);

 useEffect(() => {
  if (!spaceId) return;
  loadMvpVotes(spaceId, weekKeyStr).then(v => {
   setVotes(v);
   setVoted(!!(v[currentUser?.id]));
  }).catch(() => {});
 }, [spaceId, weekKeyStr, currentUser?.id]);

 async function castVote(targetId) {
  const next = { ...votes, [currentUser.id]: targetId };
  await saveMvpVotes(spaceId, weekKeyStr, next);
  setVotes(next); setVoted(true); setShowVoter(false);
 }

 // Tally votes
 const tally = {};
 Object.values(votes).forEach(uid => { tally[uid] = (tally[uid] || 0) + 1; });
 const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
 const [mvpId, mvpCount] = sorted[0] || [null, 0];
 const mvpUser = mvpId ? allUsers.find(u => u.id === mvpId) : null;
 const totalVotes = Object.keys(votes).length;
 const myVote = votes[currentUser?.id];

 return (
  <div>
   {mvpUser && totalVotes >= 2 && (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(123,111,216,0.1)", border: "1px solid rgba(123,111,216,0.25)", borderRadius: "10px", padding: "10px 14px", marginBottom: "10px" }}>
     <div style={{ fontSize: "1.4rem" }}>👑</div>
     <div style={{ flex: 1 }}>
      <div style={{ fontSize: "0.82rem", color: "#7B6FD8", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase" }}>This Week's MVP</div>
      <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: F, fontWeight: "700" }}>{mvpUser.name} <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: "400" }}>{mvpCount}/{totalVotes} votes</span></div>
     </div>
    </div>
   )}
   {!voted && currentUser && (
    <button onClick={() => setShowVoter(v => !v)} style={{ width: "100%", background: "none", border: "1px dashed rgba(123,111,216,0.4)", color: "#7B6FD8", padding: "7px", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer", fontFamily: F }}>
     👑 Vote for this week's MVP
    </button>
   )}
   {voted && myVote && !showVoter && (
    <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", textAlign: "center", padding: "4px" }}>
     You voted for {allUsers.find(u => u.id === myVote)?.name || "?"}
    </div>
   )}
   {showVoter && (
    <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
     {allUsers.filter(u => u.id !== currentUser?.id).map(u => (
      <button key={u.id} onClick={() => castVote(u.id)} style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", color: "var(--text-primary)", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", fontFamily: F, fontSize: "0.88rem", textAlign: "left", display: "flex", alignItems: "center", gap: "8px", width: "100%", minHeight: "44px", WebkitTapHighlightColor: "transparent" }}>
       <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: initialsColor(u.name, u.avatarColor), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "800", color: "#fff" }}>{u.name.charAt(0)}</div>
       {u.name}
      </button>
     ))}
    </div>
   )}
  </div>
 );
}

function getInitials(name) {
 if(!name) return "?";
 const parts = name.trim().split(/\s+/);
 if(parts.length===1) return parts[0][0].toUpperCase();
 return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
}

function makeThreadKey(uids){ return [...uids].sort().join("_"); }

// useMessaging hook — cross-space personal threads, stored outside org namespace

export function useMessaging(currentUser, allUsers) {
 const [threads, setThreads] = useState([]);
 const [openWindows, setOpenWindows] = useState([]);
 const [mutedThreads, setMutedThreads] = useState({});
 const [newBubbles, setNewBubbles] = useState([]);
 const pollRef = useRef(null);
 const prevThreadsRef = useRef([]);

 useEffect(()=>{
  if(!currentUser) return;
  loadPersonalMuted(currentUser.id).then(v=>{ if(v) setMutedThreads(v); });
 },[currentUser?.id]);

 useEffect(()=>{
  if(!currentUser) return;
  async function poll(){
   const ts = await loadPersonalThreads(currentUser.id);
   const prev = prevThreadsRef.current;
   const prevMap = {};
   prev.forEach(t=>{ prevMap[t.threadKey]=t.unreadCount||0; });
   ts.forEach(t=>{
    const wasUnread = prevMap[t.threadKey]||0;
    const nowUnread = t.unreadCount||0;
    if(nowUnread>wasUnread && !mutedThreads[t.threadKey]){
     setNewBubbles(prev=>{
      if(prev.find(b=>b.threadKey===t.threadKey)) return prev;
      return [...prev, t];
     });
     setOpenWindows(prev=>{
      if(prev.find(w=>w.threadKey===t.threadKey)) return prev;
      let next = [...prev];
      if(next.filter(w=>!w.minimized).length>=2){
       next = next.map((w,i)=>i===0?{...w,minimized:true}:w);
      }
      return [...next, {threadKey:t.threadKey, minimized:false}];
     });
     // Push notification when app is backgrounded
     if(document.hidden && typeof notifNewDM === "function") {
      const senderName = t.lastSenderName || t.otherUserName || "Someone";
      const preview = t.lastMessage || "";
      notifNewDM(senderName, preview).catch(()=>{});
     }
    }
   });
   prevThreadsRef.current = ts;
   setThreads(ts);
   const totalUnread = ts.reduce((s,t)=>s+(t.unreadCount||0),0);
   if(totalUnread>0) document.title=`(${totalUnread}) Cadence`;
   else if(document.title.startsWith("(")) document.title="Cadence";
  }
  poll();
  pollRef.current = setInterval(poll, 8000);
  return ()=>clearInterval(pollRef.current);
 },[currentUser?.id, mutedThreads]);

 // Send message — participants may be in different orgs, so we use personal (non-namespaced) storage
 async function sendMessage(thread, text, extra={}){
  if(!text.trim()||!thread||!currentUser) return;
  const msg = {id:Date.now(), senderId:currentUser.id, senderName:currentUser.name, text:text.trim(), ts:Date.now(), ...(extra.replyTo ? {replyTo: extra.replyTo} : {})};
  // Messages stored globally (not org-scoped) so both sides can read them
  const existing = await loadPersonalMessages(thread.threadKey);
  const cutoff = Date.now()-30*24*60*60*1000;
  const updated = [...existing.filter(m=>m.ts>cutoff), msg];
  await savePersonalMessages(thread.threadKey, updated);
  // Update thread list for each participant using their personal storage
  for(const uid of thread.participantIds){
   const uTs = await loadPersonalThreads(uid);
   const exists = uTs.find(t=>t.threadKey===thread.threadKey);
   const isMe = uid===currentUser.id;
   if(exists){
    await savePersonalThreads(uid, uTs.map(t=>t.threadKey===thread.threadKey
     ? {...t, lastMsg:msg.text, lastTs:msg.ts, unreadCount:isMe?0:(t.unreadCount||0)+1}
     : t));
   } else {
    await savePersonalThreads(uid,[...uTs,{
     threadKey:thread.threadKey,
     participantIds:thread.participantIds,
     name:thread.name,
     isGroup:thread.isGroup||false,
     spaceTag:thread.spaceTag||null,
     lastMsg:msg.text,lastTs:msg.ts,
     unreadCount:isMe?0:1
    }]);
   }
  }
  const myTs = await loadPersonalThreads(currentUser.id);
  prevThreadsRef.current = myTs;
  setThreads(myTs);
 }

 async function markRead(threadKey){
  const ts = await loadPersonalThreads(currentUser.id);
  const updated = ts.map(t=>t.threadKey===threadKey?{...t,unreadCount:0}:t);
  await savePersonalThreads(currentUser.id, updated);
  prevThreadsRef.current = updated;
  setThreads(updated);
  setNewBubbles(prev=>prev.filter(b=>b.threadKey!==threadKey));
 }

 function openWindow(thread){
  setOpenWindows(prev=>{
   if(prev.find(w=>w.threadKey===thread.threadKey)){
    return prev.map(w=>w.threadKey===thread.threadKey?{...w,minimized:false}:w);
   }
   let next=[...prev];
   if(next.filter(w=>!w.minimized).length>=2){
    next=next.map((w,i)=>i===0?{...w,minimized:true}:w);
   }
   return [...next,{threadKey:thread.threadKey,minimized:false}];
  });
 }

 function closeWindow(threadKey){
  setOpenWindows(prev=>prev.filter(w=>w.threadKey!==threadKey));
  setNewBubbles(prev=>prev.filter(b=>b.threadKey!==threadKey));
 }

 function toggleMinimize(threadKey){
  setOpenWindows(prev=>prev.map(w=>w.threadKey===threadKey?{...w,minimized:!w.minimized}:w));
 }

 async function toggleMute(threadKey){
  const next = {...mutedThreads};
  if(next[threadKey]) delete next[threadKey]; else next[threadKey]=true;
  setMutedThreads(next);
  if(currentUser) await savePersonalMuted(currentUser.id, next);
 }

 async function openDm(targetUser, spaceTag){
  const tKey = makeThreadKey([currentUser.id, targetUser.id]);
  const thread = threads.find(t=>t.threadKey===tKey) || {threadKey:tKey, participantIds:[currentUser.id,targetUser.id], name:targetUser.name, isGroup:false, spaceTag:spaceTag||null};
  openWindow(thread);
 }

 async function createGroup(memberIds, groupName, spaceTag){
  const allIds=[currentUser.id,...memberIds];
  const tKey=makeThreadKey(allIds);
  const thread={threadKey:tKey,participantIds:allIds,name:groupName,isGroup:true,spaceTag:spaceTag||null};
  openWindow(thread);
 }

 return { threads, openWindows, mutedThreads, sendMessage, markRead, openWindow, closeWindow, toggleMinimize, toggleMute, openDm, createGroup };
}


export function PageHelper({ pageId }) {
 const hint = PAGE_HINTS[pageId];
 if (!hint) return null;
 const storageKey = `cadence-hint-seen-${pageId}`;
 const [open, setOpen] = useState(() => {
  try { return !localStorage.getItem(storageKey); } catch { return true; }
 });
 const [visible, setVisible] = useState(open);
 const F = "'DM Sans',system-ui,sans-serif";

 function dismiss() {
  setOpen(false);
  setTimeout(() => setVisible(false), 250);
  try { localStorage.setItem(storageKey, "1"); } catch {}
 }
 function reopen() {
  setVisible(true);
  setOpen(true);
 }

 return (
  <div style={{ position: "relative", marginBottom: "16px" }}>
   {/* ⓘ pill button — always visible */}
   {!open && (
    <button onClick={reopen} title={`About ${hint.title}`}
     style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(29,201,232,0.08)", border: "1px solid rgba(29,201,232,0.2)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.72rem", fontWeight: "700", color: "rgba(29,201,232,0.7)", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent", letterSpacing: "0.05em" }}>
     <span style={{ fontSize: "0.8rem" }}>ⓘ</span> {hint.title}
    </button>
   )}

   {/* Hint card */}
   {visible && (
    <div style={{
     background: "linear-gradient(135deg, rgba(29,201,232,0.06) 0%, rgba(29,201,232,0.02) 100%)",
     border: "1px solid rgba(29,201,232,0.2)",
     borderRadius: "14px",
     padding: "14px 16px",
     transition: "opacity 0.25s, transform 0.25s",
     opacity: open ? 1 : 0,
     transform: open ? "translateY(0)" : "translateY(-6px)",
    }}>
     <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
       <span style={{ fontSize: "1.1rem" }}>{hint.icon}</span>
       <span style={{ fontSize: "0.82rem", fontWeight: "800", color: "var(--accent)", fontFamily: F, letterSpacing: "0.04em" }}>{hint.title}</span>
      </div>
      <button onClick={dismiss} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem", padding: "2px 5px", lineHeight: 1, WebkitTapHighlightColor: "transparent", borderRadius: "5px" }}>✕</button>
     </div>
     <ul style={{ margin: 0, padding: "0 0 0 14px", display: "flex", flexDirection: "column", gap: "5px", overflowWrap: "break-word" }}>
      {hint.tips.map((tip, i) => (
       <li key={i} style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5, fontFamily: F }}>{tip}</li>
      ))}
     </ul>
    </div>
   )}
  </div>
 );
}

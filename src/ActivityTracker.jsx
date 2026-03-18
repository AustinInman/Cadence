import { callAI } from './cadenceAI.js';
import React,{useState,useEffect,useRef,useCallback,useMemo} from 'react';
import {AKEY,AVATAR_COLOR_PRESETS,BB1,BB18,BB1A30,BB1A3A,BB2A10,BB2A28,BBA,BD1,BDIR,BG0,BG1,BG2,BG3,BP,BR,CADENCE_LOGO,DEFAULT_INDUSTRIES,F,METRIC_COLORS,MONTH_NAMES,SHORT_MONTHS,TA,TD,TM,TP,TS,TX,addCommunityMember,addJoinRequest,allDaysInMonth,computeGoalPct,computeStreak,consumeInvite,copyText,createCommunity,createInviteToken,createOrganization,dayName,formatDate,formatShort,genId,getDow,getInviteTokenFromURL,getInviteURL,getNs,getUserAvatarColor,initialsColor,injectThemeVars,isWeekend,lastWeekendSat,loadAdmins,loadCommunityMembers,loadGlobalSuperAdmin,loadIndustryConfig,loadInvite,loadMessages,loadOrgMeta,loadPendingRequests,loadPins,loadSpaceIndex,loadSpaceMeta,loadSuperAdmin,loadTeams,loadThreads,loadUserData,loadUserMemberships,loadUsers,migrateSoloToOrg,monthKey,ns,nsKey,loadUserRegistry,registerUserGlobally,removeCommunityMember,removeJoinRequest,s,saveAdmins,saveGlobalSuperAdmin,saveIndustryConfig,saveMessages,saveOrgMeta,savePins,saveSpaceMeta,saveSuperAdmin,saveTeams,saveThreads,saveUserData,saveUserMemberships,saveUsers,setNs,soloNs,storageDelete,storageGet,storageSet,todayStr,updateCommunityMemberIndustry,useFlash,weekKey,loadPersonalThreads,savePersonalThreads,loadPersonalMessages,savePersonalMessages,loadPersonalMuted,savePersonalMuted,loadSpaceAdmins,saveSpaceAdmins,writePresence,loadPresence,isOnline,getPresenceStatus,loadNotifications,saveNotifications,pushNotification,loadChallenges,saveChallenges,loadWeeklyRecap,saveWeeklyRecap,loadMvpVotes,saveMvpVotes,loadWeeklyReflection,saveWeeklyReflection,loadStreakFreezes,saveStreakFreezes,getProtectedDates,canLogPTO,canLogSick,loadAccountabilityPairs,saveAccountabilityPairs,saveJournalEntry,loadJournalEntries,loadJournalSettings,saveJournalSettings,loadUserTracks,saveUserTracks,loadActiveTrackId,saveActiveTrackId,trackDataKey,trackGoalKey,loadFeed,saveFeed,postFeedItem,updateFeedItem,deleteFeedItem,loadOrgRoles,saveOrgRoles,loadCommunityRoles,saveCommunityRoles,loadOrgTeams,saveOrgTeams,loadMemberAssignments,saveMemberAssignments,setMemberAssignment,canPerform,getTeamSubtree,defaultOrgRoles,defaultCommunityRoles,ROLE_PERMISSIONS,approveOrg,rejectOrg,loadPendingOrgs,loadDeniedRequests,saveDeniedRequest,clearDeniedRequest,haptic,loadAvatarPhoto,saveAvatarPhoto,registerServiceWorker,notifPermission,requestNotifPermission,fireNotif,notifStreakAtRisk,notifGoalsHit,notifNewDM,notifFeedReaction,notifWeeklyDigest,notifStreakMilestone,scheduleStreakCheck,loadFreezeBank,saveFreezeBank,maybeEarnFreeze,useStreakFreeze,loadPacerMemory,savePacerMemory,updatePacerMemoryFromJournal,detectLogTimePattern,sendWeeklyDigestEmail,loadUnlockedMilestones,saveUnlockedMilestones,getMilestoneDefinitions,computeMilestoneTotals,checkNewMilestones,loadCrewAnnouncement,saveCrewAnnouncement,loadCrewOfficialChallenge,saveCrewOfficialChallenge,loadCrewSlug,saveCrewSlug,resolveCrewSlug} from './shared.js';

// ── Presence display constants ────────────────────────────────────────────────
const PRESENCE_COLORS = { online: "#4ACF86", away: "#F59E0B", offline: "#666" };
const PRESENCE_LABELS = { online: "Online", away: "Away", offline: "Offline" };
import {SpaceSwitcher,SettingsPage,CommunityInviteButton,OrgInviteButton} from './SpaceUI.jsx';
import {OnboardingScreen,UserSetupModal,SoloDashboard,SoloPersonalStats,Dashboard,LeaderboardView,ErrorBoundary,PAGE_HINTS,UserTree,IndustryPicker,PresenceDot,FeedPost,GifPicker,ReactionPicker,MentionInput,ReflectionModal,WeeklyMVP,PageHelper,useMessaging,usePresence,useNotifications,getTimedJournalPrompts,UserProfileCard,ShareableProfileCard} from './AppViews.jsx';

function MetricCard({metric,value,goal,onChange,flashDir,note,onNoteChange,isMobile}) {
 const [editing,setEditing]=useState(false);
 const [raw,setRaw]=useState("");
 const [noteOpen,setNoteOpen]=useState(false);
 function startEdit(){setRaw(String(value));setEditing(true);}
 function commit(){const n=parseInt(raw);if(!isNaN(n)&&n>=0)onChange(n);setEditing(false);}

 // Allow >100% — no cap
 const pct = goal > 0 ? Math.round((value/goal)*100) : null;
 const isOver = pct !== null && pct > 100;
 const isHit  = pct !== null && pct === 100;
 const hasNote = note && note.trim().length > 0;

 // Visual bar is capped at 100% width but label shows real %
 const barPct = pct !== null ? Math.min(100, pct) : null;

 const flashBg = flashDir==="up"?"rgba(29,201,232,0.08)":flashDir==="down"?"rgba(244,63,94,0.06)":"";
 const flashBorder = flashDir==="up"?"rgba(29,201,232,0.3)":flashDir==="down"?"rgba(244,63,94,0.2)":isOver?"rgba(29,201,232,0.35)":isHit?"rgba(29,201,232,0.2)":pct!=null&&pct>=60?"#2E2010":BD1;
 const barColor = pct===null?metric.color:(isOver||isHit)?"var(--accent)":pct>=60?"var(--orange)":"var(--red)";
 const pctColor = pct===null?"var(--text-muted)":(isOver||isHit)?"#1DC9E8":pct>=60?"#F59E0B":"#F43F5E";

 // System-ui + tabular-nums = clean, natural-looking numbers. No Syne weirdness.
 const numStyle = {
  fontFamily:"system-ui,-apple-system,sans-serif",
  fontVariantNumeric:"tabular-nums",
  letterSpacing:"normal",
  fontWeight:"600",
  lineHeight:1,
 };

 // Shared pill style: note button and keybind are visually identical containers
 const pill = {
  width:"20px",height:"20px",
  borderRadius:"5px",
  display:"flex",alignItems:"center",justifyContent:"center",
  flexShrink:0,
  fontSize:"0.6rem",fontWeight:"700",
  border:"1px solid var(--border-1)",
  background:"rgba(255,255,255,0.04)",
  cursor:"pointer",
  transition:"all 0.12s",
  fontFamily:"monospace",
  letterSpacing:"0",
 };

 if(isMobile){
  return (
   <div style={{
    background:flashBg||"var(--bg-1)",
    border:`1px solid ${flashBorder||"var(--border-1)"}`,
    borderRadius:"16px",
    overflow:"hidden",
    transition:"background 0.15s,border-color 0.15s",
    position:"relative",
   }}>
    {/* Left accent bar */}
    <div style={{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:(isOver||isHit)?"#1DC9E8":metric.color,borderRadius:"16px 0 0 16px"}}/>
    {/* Progress wash */}
    {pct!==null&&pct>0&&(
     <div style={{position:"absolute",inset:0,background:`linear-gradient(90deg, ${barColor}${isOver?"14":"08"} 0%, transparent ${Math.max(15,Math.min(100,pct))}%)`,pointerEvents:"none"}}/>
    )}
    <div style={{display:"flex",alignItems:"center",padding:"13px 12px 13px 17px",minHeight:"76px",gap:"10px"}}>
     {/* Left: label + value */}
     <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:"0.68rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:"700",marginBottom:"5px"}}>{metric.label}</div>
      {editing
       ?<input autoFocus style={{...s.metricInput,fontSize:"1.8rem",marginBottom:0,padding:"2px 8px",width:"90px"}} type="number" min="0" value={raw}
         onChange={e=>setRaw(e.target.value)} onBlur={commit}
         onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape")setEditing(false);}}/>
       :<div style={{display:"flex",alignItems:"baseline",gap:"6px"}}>
        <div style={{...numStyle,fontSize:"2.4rem",fontWeight:"700",color:(isOver||isHit)?"#1DC9E8":"var(--text-primary)",cursor:"pointer"}} onClick={startEdit}>{value}</div>
        {pct!==null&&<div style={{fontSize:"0.82rem",color:pctColor,fontWeight:"700"}}>{pct}%{isOver&&<span style={{fontSize:"0.68rem",opacity:0.6}}> ↑</span>}</div>}
        {goal>0&&!isHit&&!isOver&&<div style={{fontSize:"0.72rem",color:"var(--text-dim)"}}>/{goal}</div>}
       </div>
      }
      {noteOpen&&<textarea style={{...s.noteArea,marginTop:"8px",fontSize:"1rem"}} placeholder="Add a note..." value={note||""} onChange={e=>onNoteChange(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setNoteOpen(false);}} rows={2} autoFocus/>}
     </div>
     {/* Right: note pill + equal ± buttons */}
     <div style={{display:"flex",alignItems:"center",gap:"7px",flexShrink:0}}>
      <button
       style={{...pill,width:"26px",height:"26px",background:hasNote?"rgba(29,201,232,0.12)":"rgba(255,255,255,0.04)",borderColor:hasNote?"rgba(29,201,232,0.3)":"var(--border-1)",color:hasNote?"var(--accent)":"var(--text-muted)",fontSize:"0.7rem"}}
       onClick={()=>setNoteOpen(o=>!o)} title={hasNote?"Edit note":"Add note"}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button
       style={{width:"50px",height:"50px",borderRadius:"13px",background:"rgba(255,255,255,0.05)",border:"1px solid var(--border-1)",color:"var(--text-secondary)",fontSize:"1.5rem",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontWeight:"300",flexShrink:0,WebkitTapHighlightColor:"transparent",touchAction:"manipulation"}}
       onClick={()=>onChange(Math.max(0,value-1))}>−</button>
      <button
       style={{width:"50px",height:"50px",borderRadius:"13px",background:"var(--btn-plus-bg)",border:"1px solid var(--btn-plus-border)",color:"var(--accent)",fontSize:"1.5rem",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontWeight:"600",flexShrink:0,WebkitTapHighlightColor:"transparent",touchAction:"manipulation"}}
       onClick={()=>onChange(value+1)}>+</button>
     </div>
    </div>
   </div>
  );
 }

 // ── DESKTOP ──────────────────────────────────────────────────────────
 return (
  <div style={{
   ...s.metricCard,
   background:flashBg||"var(--glass-bg)",
   borderColor:flashBorder||"var(--glass-border)",
   transition:"background 0.15s,border-color 0.15s",
   padding:"11px 11px 9px",
  }}>
   {/* Progress bar — capped visually at 100%, glows when over */}
   <div style={{position:"absolute",top:0,left:0,right:0,height:"3px",background:"var(--bg-4)",overflow:"hidden",borderRadius:"12px 12px 0 0"}}>
    <div style={{height:"100%",width:barPct!=null?`${barPct}%`:"100%",background:barPct!=null?barColor:metric.color,transition:"width 0.5s",borderRadius:"0 2px 2px 0",boxShadow:isOver?"0 0 6px rgba(29,201,232,0.5)":""}}/>
   </div>
   {/* Label row — note pill + keybind pill, exact same size */}
   <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"5px",gap:"4px"}}>
    <div style={{fontSize:"0.67rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:"700",lineHeight:1.3,flex:1,minWidth:0}}>{metric.label}</div>
    <div style={{display:"flex",gap:"2px",alignItems:"center",flexShrink:0}}>
     <button
      style={{...pill,background:hasNote?"rgba(29,201,232,0.13)":"rgba(255,255,255,0.04)",borderColor:hasNote?"rgba(29,201,232,0.32)":"var(--border-1)",color:hasNote?"var(--accent)":"var(--text-muted)",fontFamily:"monospace"}}
      onClick={()=>setNoteOpen(o=>!o)} title={hasNote?"Edit note":"Add note"}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
     </button>
     <div style={{color:"var(--text-dim)",fontSize:"0.58rem",fontWeight:"600",opacity:0.4,letterSpacing:"0.05em",userSelect:"none"}} title={`Press ${metric.keyBind} to +1, Shift+${metric.keyBind} to -1`}>{metric.keyBind}</div>
    </div>
   </div>
   {/* Big number — system-ui, tabular, clean */}
   {editing
    ?<input autoFocus style={s.metricInput} type="number" min="0" value={raw} onChange={e=>setRaw(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape")setEditing(false);}}/>
    :<div style={{fontSize:"1.75rem",fontWeight:"700",lineHeight:1,letterSpacing:"-0.01em",fontVariantNumeric:"tabular-nums",marginBottom:"2px",cursor:"pointer",userSelect:"none",color:flashDir==="up"?"var(--accent)":flashDir==="down"?"var(--red)":"var(--text-primary)",transition:"color 0.15s"}} onClick={startEdit}>{value}</div>
   }
   {/* Pct — shows real value including >100%, same line as /goal */}
   {pct!==null&&(
    <div style={{fontSize:"0.65rem",marginBottom:"8px",fontWeight:"600",color:pctColor,display:"flex",alignItems:"center",gap:"3px"}}>
     {pct}%{isOver&&<span style={{fontSize:"0.6rem",opacity:0.65}}> ↑</span>}
     <span style={{opacity:0.38,fontWeight:"400",marginLeft:"1px"}}>/{goal}</span>
    </div>
   )}
   {noteOpen&&<textarea style={s.noteArea} placeholder="Add a note for today..." value={note||""} onChange={e=>onNoteChange(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setNoteOpen(false);}} rows={2} autoFocus/>}
   {/* Equal-size − and + buttons */}
   <div style={{display:"flex",gap:"3px"}}>
    <button style={{flex:1,height:"44px",borderRadius:"8px",fontSize:"1.2rem",fontWeight:"500",background:"rgba(255,255,255,0.05)",border:"1px solid var(--border-1)",color:"var(--text-secondary)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}} onClick={()=>onChange(Math.max(0,value-1))}>−</button>
    <button style={{flex:1,height:"44px",borderRadius:"8px",fontSize:"1.2rem",fontWeight:"600",background:"rgba(29,201,232,0.1)",border:"1px solid rgba(29,201,232,0.25)",color:"var(--accent)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}} onClick={()=>onChange(value+1)}>+</button>
   </div>
  </div>
 );
}

// AdminPanel removed — crew management now handled in CrewHub


// ─────────────────────────────────────────────────────────────────────────────
// ── PacerHistoryInsight — Pacer's read on your history, shown at top ─────────
// ─────────────────────────────────────────────────────────────────────────────
function PacerHistoryInsight({ myData, indConfig, myGoals, myGoalPeriods, currentUser, streak }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const cacheKey = currentUser ? `pacer-history-insight-${currentUser.id}-${weekKey(todayStr())}` : null;
 const [insight, setInsight] = useState(null);
 const [loading, setLoading] = useState(false);

 const metrics = indConfig?.weekdayMetrics || [];
 const allDays = Object.keys(myData).filter(d => !isWeekend(d)).sort();
 if (allDays.length < 5) return null; // not enough data to say anything worth saying

 useEffect(() => {
  if (!cacheKey) return;
  storageGet(cacheKey).then(v => { if (v) setInsight(v); else generateInsight(); }).catch(() => generateInsight());
 }, [cacheKey]);


 async function generateInsight() {
  if (loading) return;
  setLoading(true);
  const today = todayStr();

  // Build a compact data picture
  const last30 = allDays.filter(d => {
   const age = (new Date(today) - new Date(d)) / 86400000;
   return age <= 30;
  });
  const last90 = allDays.filter(d => {
   const age = (new Date(today) - new Date(d)) / 86400000;
   return age <= 90;
  });

  const avg30 = last30.length
   ? Math.round(last30.reduce((s,d) => s + computeGoalPct(myData[d]||{}, metrics, myGoals, myGoalPeriods), 0) / last30.length)
   : 0;
  const avg90 = last90.length
   ? Math.round(last90.reduce((s,d) => s + computeGoalPct(myData[d]||{}, metrics, myGoals, myGoalPeriods), 0) / last90.length)
   : 0;

  // Best and worst months
  const byMonth = {};
  for (const d of allDays) {
   const mk = monthKey(d);
   if (!byMonth[mk]) byMonth[mk] = [];
   byMonth[mk].push(computeGoalPct(myData[d]||{}, metrics, myGoals, myGoalPeriods));
  }
  const monthAvgs = Object.entries(byMonth).map(([mk, pcts]) => ({
   mk, avg: Math.round(pcts.reduce((s,v)=>s+v,0)/pcts.length)
  })).sort((a,b) => b.avg - a.avg);
  const bestMonth = monthAvgs[0];
  const worstMonth = monthAvgs[monthAvgs.length - 1];

  // Day of week patterns
  const dowTotals = {1:[], 2:[], 3:[], 4:[], 5:[]};
  for (const d of allDays) {
   const dow = new Date(d + "T12:00:00").getDay();
   if (dow >= 1 && dow <= 5) {
    const pct = computeGoalPct(myData[d]||{}, metrics, myGoals, myGoalPeriods);
    dowTotals[dow].push(pct);
   }
  }
  const dowNames = {1:"Monday",2:"Tuesday",3:"Wednesday",4:"Thursday",5:"Friday"};
  const dowAvgs = Object.entries(dowTotals)
   .filter(([,arr]) => arr.length >= 2)
   .map(([dow, arr]) => ({ dow: parseInt(dow), name: dowNames[dow], avg: Math.round(arr.reduce((s,v)=>s+v,0)/arr.length) }))
   .sort((a,b) => b.avg - a.avg);
  const bestDow = dowAvgs[0];
  const worstDow = dowAvgs[dowAvgs.length - 1];

  const topMetricSummary = metrics.slice(0, 3).map(m => {
   const total = allDays.reduce((s,d) => s + (myData[d]?.[m.key] || 0), 0);
   const avg = allDays.length ? (total / allDays.length).toFixed(1) : 0;
   return `${m.label}: ${total} total, ${avg}/day avg`;
  }).join("; ");

  const prompt = `You are Pacer — a high-performing peer who's been watching ${currentUser?.name}'s numbers for ${allDays.length} logged weekdays. They're looking at their history view right now.

Data summary:
- Total weekdays logged: ${allDays.length}
- Streak: ${streak?.current || 0} days current, ${streak?.longest || 0} all-time best
- Last 30 days avg: ${avg30}% of daily goals
- Last 90 days avg: ${avg90}% of daily goals
- Best month: ${bestMonth?.mk} at ${bestMonth?.avg}% avg
- Worst month: ${worstMonth?.mk} at ${worstMonth?.avg}% avg
- Best day of week: ${bestDow?.name} (${bestDow?.avg}% avg)
- Worst day of week: ${worstDow?.name} (${worstDow?.avg}% avg)
- Metric totals: ${topMetricSummary}

Write ONE direct observation about this person's data. Something specific that a peer who's been watching this long would say. NOT a summary — a take. Examples of the right tone:
- "You're a Tuesday person. Your Tuesday average is 20 points higher than Thursday. That's not a coincidence."
- "You've logged ${allDays.length} days. The best month was ${bestMonth?.mk}. What was different?"
- "Your 30-day average is ${avg30}%. Your 90-day average is ${avg90}%. You're trending ${avg30 > avg90 ? "up" : "down"}."

Keep it under 2 sentences. No preamble. Sound like someone who's been paying attention.`;

  try {
   const data = await callAI({ model: "claude-haiku-4-5-20251001", messages: [{ role: "user", content: prompt }], max_tokens: 100, call_type: "metric_gen" })
   const text = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
   if (text) {
    setInsight(text);
    if (cacheKey) storageSet(cacheKey, text).catch(() => {});
   }
  } catch {} finally { setLoading(false); }
 }

 if (!insight && !loading) return null;

 return (
  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 16px", background: "rgba(29,201,232,0.04)", border: "1px solid rgba(29,201,232,0.15)", borderRadius: "12px", marginBottom: "16px" }}>
   <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: "1px" }}>⚡</span>
   <div style={{ flex: 1 }}>
    {loading
     ? <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontStyle: "italic", fontFamily: F }}>Reading your data…</div>
     : <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.55, fontFamily: F, fontStyle: "italic" }}>{insight}</div>
    }
   </div>
   <button
    onClick={() => window.dispatchEvent(new CustomEvent("cadence:open-pacer"))}
    style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.72rem", fontWeight: "700", cursor: "pointer", fontFamily: F, flexShrink: 0, padding: "2px 0", whiteSpace: "nowrap" }}>
    Ask →
   </button>
  </div>
 );
}
// ── MonthInsight — lazy-loads one insight per month, cached permanently ──────
function MonthInsight({ mk, allData, allMonthsData, industryConfig, userGoals }) {
  const F = "'DM Sans',system-ui,sans-serif";
  const [insight, setInsight] = React.useState(null);
  const [expanded, setExpanded] = React.useState(false);
  const cacheKey = `cadence-month-insight-${mk}`;

  React.useEffect(() => {
    if (!expanded) return;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setInsight(cached); return; }
    } catch {}

    const [y, mon] = mk.split("-");
    const days = Object.keys(allData || {}).filter(d => d.startsWith(mk));
    const wdDays = days.filter(d => !isWeekend(d));
    const metrics = industryConfig?.weekdayMetrics || [];
    if (!wdDays.length || !metrics.length) return;

    // Compute this month's metric averages
    const thisAvgs = metrics.map(m => {
      const total = wdDays.reduce((s,d) => s + ((allData[d]||{})[m.key] || 0), 0);
      return { label: m.short || m.label, avg: wdDays.length ? (total / wdDays.length).toFixed(1) : 0, total };
    });

    // Compute prev month's averages for comparison
    const prevDate = new Date(parseInt(y), parseInt(mon) - 2, 1);
    const prevMk = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
    const prevDays = Object.keys(allData || {}).filter(d => d.startsWith(prevMk) && !isWeekend(d));
    const prevAvgs = metrics.map(m => {
      if (!prevDays.length) return { label: m.short || m.label, avg: null };
      const total = prevDays.reduce((s,d) => s + ((allData[d]||{})[m.key] || 0), 0);
      return { label: m.short || m.label, avg: (total / prevDays.length).toFixed(1) };
    });

    const monthName = new Date(parseInt(y), parseInt(mon)-1, 1).toLocaleString('default', { month: 'long' });
    const avgGoalPct = wdDays.length ? Math.round(wdDays.reduce((s,d) => s + computeGoalPct(allData[d]||{}, metrics, userGoals), 0) / wdDays.length) : 0;

    const prompt = `You are Pacer — a sharp, data-focused peer who's been watching this person's numbers.

${monthName} ${y} summary:
- Logged ${wdDays.length} weekdays
- Avg goal attainment: ${avgGoalPct}%
- Metric averages: ${thisAvgs.map(m => `${m.label}: ${m.avg}/day`).join(', ')}
${prevDays.length ? `- vs ${prevDate.toLocaleString('default',{month:'long'})}: ${prevAvgs.map((m,i) => {
  const delta = m.avg !== null ? (parseFloat(thisAvgs[i].avg) - parseFloat(m.avg)).toFixed(1) : null;
  return delta !== null ? `${m.label}: ${delta > 0 ? '+' : ''}${delta}` : '';
}).filter(Boolean).join(', ')}` : ''}

Write ONE insight sentence about this month — a pattern, trend, or notable shift. Be specific (use the numbers). Under 30 words. No preamble. Sound like a sharp peer reviewing their numbers, not a bot.`;

    callAI({ model: "claude-haiku-4-5-20251001", messages: [{ role: "user", content: prompt }], max_tokens: 80, call_type: "metric_gen" })
    .then(r => r.json())
    .then(data => {
      const text = (data?.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("").trim().replace(/^["""']|["""']$/g,"");
      if (text && text.length > 10) {
        setInsight(text);
        try { localStorage.setItem(cacheKey, text); } catch {}
      }
    })
    .catch(() => {});
  }, [expanded]);

  return (
    <div style={{ marginTop: "6px" }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: "0", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
        <span style={{ fontSize: "0.62rem", color: "var(--accent)", opacity: 0.7 }}>⚡</span>
        <span style={{ fontSize: "0.7rem", color: expanded ? "var(--accent)" : "var(--text-dim)", fontWeight: "600" }}>
          {expanded ? "Insight ▲" : "Insight ▼"}
        </span>
      </button>
      {expanded && (
        <div style={{ marginTop: "6px", padding: "8px 12px", background: "rgba(29,201,232,0.04)", border: "1px solid rgba(29,201,232,0.1)", borderRadius: "8px" }}>
          {insight
            ? <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: F, lineHeight: 1.45 }}>{insight}</span>
            : <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic", fontFamily: F }}>Analyzing…</span>
          }
        </div>
      )}
    </div>
  );
}

function MonthBlock({mk, allData, industryConfig, userGoals, onEditDay, bestDays}) {
 const [open,setOpen]=useState(false);
 const [y,m]=mk.split("-");
 const days=allDaysInMonth(mk);
 const wdDays=days.filter(d=>!isWeekend(d)), weDays=days.filter(isWeekend);
 const wdMetrics=industryConfig.weekdayMetrics, weMetrics=industryConfig.weekendMetrics;
 const loggedWd=wdDays.filter(d=>allData[d]&&Object.values(allData[d]).some(v=>v>0));
 const loggedWe=weDays.filter(d=>allData[d]&&Object.values(allData[d]).some(v=>v>0));
 const wdTotals={},weTotals={};
 for(const d of loggedWd) for(const m of wdMetrics) wdTotals[m.key]=(wdTotals[m.key]||0)+(allData[d][m.key]||0);
 for(const d of loggedWe) for(const m of weMetrics) weTotals[m.key]=(weTotals[m.key]||0)+(allData[d][m.key]||0);
 const avgGoalPct = loggedWd.length>0 ? Math.round(loggedWd.reduce((s,d)=>s+computeGoalPct(allData[d]||{},wdMetrics,userGoals),0)/loggedWd.length) : 0;
 const metricTotalsM={};
 for(const d of loggedWd) for(const m of wdMetrics) metricTotalsM[m.key]=(metricTotalsM[m.key]||0)+(typeof (allData[d]||{})[m.key]==="number"?(allData[d]||{})[m.key]:0);
 let mPeriodHit=0,mPeriodTotal=0;
 for(const m of wdMetrics){
  const dg=(userGoals[m.key]!=null)?userGoals[m.key]:m.defaultGoal;
  if(dg<=0||loggedWd.length===0)continue;
  mPeriodTotal++;mPeriodHit+=(metricTotalsM[m.key]||0)/(dg*loggedWd.length); // allow >100%
 }
 const monthPeriodPct=mPeriodTotal>0&&loggedWd.length>0?Math.round((mPeriodHit/mPeriodTotal)*100):0;
 return (
  <div style={s.monthBlock}>
   <div style={s.monthHeader} onClick={()=>setOpen(o=>!o)}>
    <div style={s.monthTitleGroup}>
     <span style={s.monthName}>{MONTH_NAMES[parseInt(m)-1]} {y}</span>
     <span style={s.monthMeta}>{loggedWd.length}/{wdDays.length} weekdays</span>
     {monthPeriodPct>0&&<span style={{...s.pctBadge,color:monthPeriodPct>=80?"#5DC1DB":monthPeriodPct>=50?TA:"#E05577"}} title="% of monthly goal reached (total vs dailyGoal × days logged)">{monthPeriodPct}% of mo goal</span>}
     {avgGoalPct>0&&<span style={{...s.pctBadge,color:avgGoalPct>=80?"#5DC1DB":avgGoalPct>=50?TA:"#E05577"}} title="Average daily goal % across logged days">{avgGoalPct}% avg/day</span>}
    </div>
    <div style={s.monthHeaderRight}>
     <span style={s.chevron}>{open?"▲":"▼"}</span>
    </div>
   </div>
   <div style={s.summaryLabel}>Weekdays</div>
   <div style={{...s.summaryGrid}}>
    {wdMetrics.map(met=>(
     <div key={met.key} style={s.summaryCell}>
      <div style={{...s.summaryDot,background:met.color}}/>
      <div>
       <div style={s.summaryCellLabel}>{met.label}</div>
       <div style={s.summaryCellNumbers}>
        <span style={s.summaryTotal}>{wdTotals[met.key]||0}</span>
        <span style={s.summaryAvg}>{loggedWd.length>0?((wdTotals[met.key]||0)/loggedWd.length).toFixed(1):"—"}/day</span>
       </div>
       {(()=>{const dg=(userGoals[met.key]!=null)?userGoals[met.key]:met.defaultGoal;if(dg<=0||!loggedWd.length)return null;const rawPct=Math.round(((wdTotals[met.key]||0)/(dg*loggedWd.length))*100);const barW=Math.min(100,rawPct);const col=rawPct>=100?"#5DC1DB":rawPct>=60?TA:"#E05577";return(<div style={{marginTop:"3px",...s.fac,...s.g4}}><div style={{...s.w100,height:"2px",background:"var(--bg-4)",borderRadius:"1px"}}><div style={{height:"100%",width:`${barW}%`,background:col,borderRadius:"1px",boxShadow:rawPct>100?"0 0 4px rgba(29,201,232,0.5)":"none"}}/></div><span style={{fontSize:"0.95rem",color:col,flexShrink:0}}>{rawPct}%{rawPct>100&&<span style={{fontSize:"0.75rem",opacity:0.7}}> ↑</span>}</span></div>);})()}
      </div>
     </div>
    ))}
   </div>
   {loggedWe.length>0&&<>
    <div style={{...s.summaryLabel,color:"#7B6FD8"}}>Weekend</div>
    <div style={{...s.summaryGrid}}>
     {weMetrics.map(met=>(
      <div key={met.key} style={s.summaryCell}>
       <div style={{...s.summaryDot,background:met.color}}/>
       <div>
        <div style={s.summaryCellLabel}>{met.label}</div>
        <div style={s.summaryCellNumbers}><span style={s.summaryTotal}>{weTotals[met.key]||0}</span></div>
       </div>
      </div>
     ))}
    </div>
   </>}
   <MonthInsight mk={mk} allData={allData} industryConfig={industryConfig} userGoals={userGoals} />
   {open&&(
    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
     <div style={{...s.dailyTH,minWidth:"min(460px,max-content)"}}>
      <div style={s.x6}>Date</div>
      <div style={{flex:"0 0 36px",fontSize:"0.9rem",color:"var(--border-2)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Goal</div>
      {wdMetrics.map(m=><div key={m.key} style={s.colMet}>{m.short}</div>)}
      <div style={s.colAct}></div>
     </div>
     {days.sort((a,b)=>b.localeCompare(a)).map(date=>{
      const weekend=isWeekend(date),data=allData[date]||{};
      const hasData=allData[date]&&Object.values(allData[date]).some(v=>v>0);
      const future=date>todayStr();
      const low=!hasData&&!weekend&&!future;
      const pct=hasData&&!weekend?computeGoalPct(data,wdMetrics,userGoals):null;
      if(weekend) return (
       <div key={date} style={{...s.dailyRow,...s.drWeekend,minWidth:"min(480px,max-content)"}}>
        <div style={s.x6}><span style={s.dailyDate}>{formatShort(date)}</span></div>
        <div style={{flex:"0 0 36px"}}><span style={{fontSize:"0.9rem",color:TM}}>—</span></div>
        {wdMetrics.map(met=>{
         const metNote=data._notes&&data._notes[met.key];
         return (
          <div key={met.key} style={s.colMet} title={metNote||undefined}>
           {weMetrics.find(w=>w.key===met.key)&&hasData
            ?<span style={{...s.dailyNum,color:"#7B6FD8"}}>{data[met.key]||0}</span>
            :<span style={{color:TX}}>—</span>}
           {metNote&&<span style={s.noteDot} title={metNote}>●</span>}
          </div>
         );
        })}
        <div style={s.colAct}>{!future&&<button style={s.editBtn} onClick={()=>onEditDay(date)}>edit</button>}</div>
       </div>
      );
      return (
       <div key={date} style={{...s.dailyRow,...(!hasData&&!future?s.drEmpty:{}),...(future?s.drFuture:{})}}>
        <div style={s.x6}>
         <span style={s.dailyDate}>{formatShort(date)}</span>
        </div>
        <div style={{flex:"0 0 36px"}}>
         {pct!==null?<span style={{fontSize:"0.95rem",fontWeight:"bold",color:pct>=100?"#5DC1DB":pct>=60?TA:"#E05577"}}>{pct}%</span>
         :<span style={s.dim8}>—</span>}
        </div>
        {wdMetrics.map(met=>{
         const metNote=data._notes&&data._notes[met.key];
         return (
          <div key={met.key} style={s.colMet} title={metNote||undefined}>
           <span style={{...s.dailyNum,color:future||!hasData?TX:TP}}>{future||!hasData?"—":(data[met.key]||0)}</span>
           {!future&&hasData&&bestDays&&bestDays[met.key]===date&&(data[met.key]||0)>0&&<span title={`Best day ever for ${met.label}`} style={{fontSize:"0.9rem",marginLeft:"2px",opacity:0.8}}>👑</span>}
           {metNote&&<span style={s.noteDot} title={metNote}>●</span>}
          </div>
         );
        })}
        <div style={s.colAct}>{!future&&<button style={s.editBtn} onClick={()=>onEditDay(date)}>edit</button>}</div>
       </div>
      );
     })}
    </div>
   )}
  </div>
 );
}

function EditDayModal({date,initialData,industryConfig,onClose,onSave}) {
 const weekend=isWeekend(date),metrics=weekend?industryConfig.weekendMetrics:industryConfig.weekdayMetrics;
 const [data,setData]=useState({...initialData});
 const [editNotes,setEditNotes]=useState({...(initialData._notes||{})});
 const [noteOpen,setNoteOpen]=useState({});
 function adj(k,d){setData(p=>({...p,[k]:Math.max(0,(p[k]||0)+d)}));}
 function set(k,v){const n=parseInt(v);if(!isNaN(n)&&n>=0)setData(p=>({...p,[k]:n}));}
 function saveWithNotes(){onSave({...data,_notes:editNotes});}
 return (
  <div style={s.overlay}>
   <div style={{...s.modal,maxWidth:"min(480px,100%)"}}>
    <div style={s.mHead}><span style={s.mTitle}>{weekend?"🏖 Weekend — ":""}Edit — {formatDate(date)}</span><button style={s.mClose} onClick={onClose}>✕</button></div>
    <div style={s.mBody}>
     {metrics.map(met=>{
      const hasNote=editNotes[met.key]&&editNotes[met.key].trim();
      return (
       <div key={met.key}>
        <div style={s.editRow}>
         <div style={{...s.editDot,background:met.color}}/>
         <div style={s.editLabel}>{met.label}</div>
         <div style={s.fac6}>
          <button style={{...s.noteIconBtn,color:hasNote?TA:"var(--border-2)",borderColor:hasNote?"var(--border-2)":"var(--bg-4)"}}
           onClick={()=>setNoteOpen(p=>({...p,[met.key]:!p[met.key]}))} title="Toggle note">
           {hasNote?"📝":"✎"}
          </button>
          <div style={s.editCtrl}>
           <button style={s.btnMinus} onClick={()=>adj(met.key,-1)}>−</button>
           <input style={s.editNumInput} type="number" min="0" value={data[met.key]||0} onChange={e=>set(met.key,e.target.value)}/>
           <button style={s.btnPlus} onClick={()=>adj(met.key,1)}>+</button>
          </div>
         </div>
        </div>
        {noteOpen[met.key]&&(
         <textarea style={{...s.noteArea,margin:"0 0 4px 22px"}}
          placeholder="Note for this field..."
          value={editNotes[met.key]||""}
          onChange={e=>setEditNotes(p=>({...p,[met.key]:e.target.value}))}
          rows={2} autoFocus/>
        )}
       </div>
      );
     })}
     <div style={s.mActions}>
      <button style={s.secondaryBtn} onClick={onClose}>Cancel</button>
      <button style={s.primaryBtn} onClick={saveWithNotes}>Save</button>
     </div>
    </div>
   </div>
  </div>
 );
}

function DataBackupModal({allData,onImportData,onClose}) {
 const [tab,setTab]=useState("export");
 const [importText,setImportText]=useState("");
 const [importErr,setImportErr]=useState("");
 const [importOk,setImportOk]=useState(false);

 const exportJson=JSON.stringify(
  Object.fromEntries(Object.entries(allData).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).filter(([,val])=>typeof val==="number"||(typeof val==="object"&&val!==null&&k!=="_notes")))])),
  null,2
 );

 const exportClean=JSON.stringify(
  Object.fromEntries(Object.entries(allData).map(([date,day])=>{
   if(!day)return[date,{}];
   const out={};
   for(const[k,v]of Object.entries(day)){
    if(k==="_notes"){if(v&&Object.keys(v).length)out._notes=v;}
    else if(typeof v==="number")out[k]=v;
   }
   return[date,out];
  })),null,2);

 function copyExport(){
  const done=()=>{};
  try{navigator.clipboard.writeText(exportClean).then(done);}catch{}
  copyText(exportClean);
 }

 function downloadExport(){
  const blob=new Blob([exportClean],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download=`activity-backup-${todayStr()}.json`;a.click();
 }

 function tryImport(){
  setImportErr("");setImportOk(false);
  try{
   const parsed=JSON.parse(importText);
   if(typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Expected a JSON object");
   const cleaned={};
   for(const[date,day]of Object.entries(parsed)){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
    if(typeof day!=="object"||!day)continue;
    const out={};
    for(const[k,v]of Object.entries(day)){
     if(k==="_notes"&&typeof v==="object")out._notes=v;
     else if(typeof v==="number")out[k]=v;
    }
    cleaned[date]=out;
   }
   const count=Object.keys(cleaned).length;
   if(!count)throw new Error("No valid date entries found");
   onImportData(cleaned);
   setImportOk(true);
  }catch(e){setImportErr(e.message||"Invalid JSON");}
 }

 return (
  <div style={s.overlay}>
   <div style={{...s.modal,maxWidth:"min(520px,100%)"}}>
    <div style={s.mHead}><span style={s.mTitle}>Backup & Restore</span><button style={s.mClose} onClick={onClose}>✕</button></div>
    <div style={{display:"flex",...s.bbBd,background:BG0}}>
     {[["export","⬇ Export"],["import","⬆ Import"]].map(([k,l])=>(
      <button key={k} style={{...s.settingsTab,...(tab===k?s.settingsTabActive:{})}} onClick={()=>setTab(k)}>{l}</button>
     ))}
    </div>
    <div style={s.mBody}>
     {tab==="export"&&<>
      <p style={s.mHint}>Download a full backup of your data as JSON. Keep this safe — it can be re-imported if your data is ever lost.</p>
      <pre style={{...s.shareText,maxHeight:"220px"}}>{exportClean}</pre>
      <div style={s.mActions}>
       <button style={s.secondaryBtn} onClick={copyExport}>Copy JSON</button>
       <button style={s.primaryBtn} onClick={downloadExport}>⬇ Download .json</button>
      </div>
     </>}
     {tab==="import"&&<>
      <p style={s.mHint}>Paste a previously exported JSON backup to restore your data. This will <strong style={{color:"#E05577"}}>merge</strong> with existing data (imported dates overwrite, others are kept).</p>
      <textarea style={{...s.bulkTA,minHeight:"180px"}} value={importText} onChange={e=>{setImportText(e.target.value);setImportErr("");setImportOk(false);}} placeholder='{"2026-01-05":{"outbound":64,"activities":40},...}'/>
      {importErr&&<div style={s.importErr}>{importErr}</div>}
      {importOk&&<div style={s.grn9}>✓ Data imported successfully</div>}
      <div style={s.mActions}>
       <button style={s.secondaryBtn} onClick={onClose}>Cancel</button>
       <button style={{...s.primaryBtn,opacity:importText.trim()?1:0.4}} disabled={!importText.trim()} onClick={tryImport}>Import</button>
      </div>
     </>}
    </div>
   </div>
  </div>
 );
}

function BulkImportModal({onClose,onImport,industryConfig}) {
 const cols=industryConfig.weekdayMetrics.map(m=>m.key.toUpperCase()).join(",");
 const [text,setText]=useState(`DATE,${cols}\n${todayStr()},${industryConfig.weekdayMetrics.map(()=>0).join(",")}`);
 const [preview,setPreview]=useState(null);
 const [error,setError]=useState("");
 function parse(){
  setError("");const lines=text.trim().split("\n").filter(l=>l.trim());
  if(!lines.length){setError("Nothing to parse.");return;}
  const km={date:"date"};
  for(const m of industryConfig.weekdayMetrics){km[m.key.toLowerCase()]=m.key;km[m.label.toLowerCase().replace(/\s/g,"")]=m.key;}
  const cols=lines[0].toLowerCase().replace(/\s/g,"").split(",").map(h=>km[h.replace(/[^a-z0-9_]/g,"")]||null);
  if(!cols.includes("date")){setError("Need a DATE column (YYYY-MM-DD).");return;}
  const rows=[];
  for(let i=1;i<lines.length;i++){
   const parts=lines[i].split(","),row={};
   cols.forEach((k,ci)=>{if(k)row[k]=parts[ci]?.trim()||"";});
   if(!row.date||!/^\d{4}-\d{2}-\d{2}$/.test(row.date))continue;
   const parsed={};
   for(const m of industryConfig.weekdayMetrics)parsed[m.key]=parseInt(row[m.key])||0;
   rows.push({date:row.date,data:parsed});
  }
  if(!rows.length){setError("No valid rows. Dates must be YYYY-MM-DD.");return;}
  setPreview(rows);
 }
 return (
  <div style={s.overlay}>
   <div style={s.modal}>
    <div style={s.mHead}><span style={s.mTitle}>Bulk Import</span><button style={s.mClose} onClick={onClose}>✕</button></div>
    <div style={s.mBody}>
     <p style={s.mHint}>CSV columns: <code style={s.code}>DATE, {cols}</code>. Dates must be YYYY-MM-DD.</p>
     <textarea style={s.bulkTA} value={text} onChange={e=>{setText(e.target.value);setPreview(null);setError("");}} rows={8} spellCheck={false}/>
     {error&&<div style={s.importErr}>{error}</div>}
     {!preview?<button style={s.primaryBtn} onClick={parse}>Preview Import</button>
     :<>
      <div style={s.prevHead}>{preview.length} rows ready</div>
      <div style={s.prevList}>
       {preview.slice(0,6).map(r=>(
        <div key={r.date} style={s.prevRow}>
         <span style={s.prevDate}>{formatDate(r.date)}{isWeekend(r.date)?" 🏖":""}</span>
         <span style={s.prevStats}>{industryConfig.weekdayMetrics.filter(m=>r.data[m.key]>0).map(m=>`${r.data[m.key]} ${m.short}`).join(" · ")}</span>
        </div>
       ))}
       {preview.length>6&&<div style={s.prevMore}>+{preview.length-6} more</div>}
      </div>
      <div style={s.mActions}>
       <button style={s.secondaryBtn} onClick={()=>setPreview(null)}>Back</button>
       <button style={s.primaryBtn} onClick={()=>onImport(preview)}>Import {preview.length} Days</button>
      </div>
     </>}
    </div>
   </div>
  </div>
 );
}

function ShareModal({userName,allData,liveCounts,industryConfig,userGoals,selDate,onClose}) {
 const today = selDate||todayStr();
 const [include,setInclude] = useState({today:true,week:true,month:false,allTime:false});
 const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

 function toggle(key){setInclude(p=>({...p,[key]:!p[key]}));}

 function buildText(){
  const lines=[`📊 Activity Report — ${userName}`,`${formatDate(today)}`,``];

  if(include.today){
   // Use live unsaved counts if viewing today, else pull from saved data
   const d=(today===todayStr()&&liveCounts)?{...liveCounts}:(allData[today]||{});
   const hasData=industryConfig.weekdayMetrics.some(m=>typeof d[m.key]==="number"&&d[m.key]>0);
   lines.push(`── Today (${dayName(today)}) ──`);
   if(isWeekend(today)){
    for(const m of industryConfig.weekendMetrics){const v=d[m.key]||0;lines.push(`${m.label}: ${v}`);}
   } else {
    for(const m of industryConfig.weekdayMetrics){
     const v=d[m.key]||0;
     const g=(userGoals[m.key]!=null)?userGoals[m.key]:m.defaultGoal;
     const pct=g>0?` (${Math.round(v/g*100)}% of ${g} goal)`:"";
     lines.push(`${m.label}: ${v}${pct}`);
    }
   }
   lines.push(``);
  }

  if(include.week){
   const wk=weekKey(today);
   const [wy,wm,wd]=wk.split("-").map(Number);
   const weekDates=[];
   for(let i=0;i<7;i++){const d=new Date(wy,wm-1,wd+i);weekDates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);}
   const wdDays=weekDates.filter(d=>!isWeekend(d)&&d<=today&&allData[d]);
   const wdTotals={};
   for(const m of industryConfig.weekdayMetrics)wdTotals[m.key]=0;
   for(const d of wdDays){const data=allData[d]||{};for(const m of industryConfig.weekdayMetrics){if(typeof data[m.key]==="number")wdTotals[m.key]+=data[m.key];}}
   lines.push(`── This Week (${wdDays.length} day${wdDays.length!==1?"s":""} logged) ──`);
   for(const m of industryConfig.weekdayMetrics){
    const t=wdTotals[m.key]||0;
    const g=(userGoals[m.key]!=null)?userGoals[m.key]:m.defaultGoal;
    const wkGoal=g*wdDays.length;
    const pct=wkGoal>0?` (${Math.round(t/wkGoal*100)}% of wk goal)`:"";
    lines.push(`${m.label}: ${t} total${wdDays.length>0?`, ${(t/wdDays.length).toFixed(1)}/day`:""}${pct}`);
   }
   lines.push(``);
  }

  if(include.month){
   const mk=monthKey(today);
   const [y,mm]=mk.split("-");
   const moDates=Object.keys(allData).filter(d=>monthKey(d)===mk&&!isWeekend(d)&&d<=today);
   const moTotals={};
   for(const m of industryConfig.weekdayMetrics)moTotals[m.key]=0;
   for(const d of moDates){const data=allData[d]||{};for(const m of industryConfig.weekdayMetrics){if(typeof data[m.key]==="number")moTotals[m.key]+=data[m.key];}}
   lines.push(`── ${MONTH_NAMES[parseInt(mm)-1]} ${y} (${moDates.length} days) ──`);
   for(const m of industryConfig.weekdayMetrics){
    const t=moTotals[m.key]||0;
    lines.push(`${m.label}: ${t} total${moDates.length>0?`, ${(t/moDates.length).toFixed(1)}/day`:""}`);
   }
   lines.push(``);
  }

  if(include.allTime){
   const allDates=Object.keys(allData).filter(d=>!isWeekend(d)&&allData[d]);
   const allTotals={};
   for(const m of industryConfig.weekdayMetrics)allTotals[m.key]=0;
   for(const d of allDates){const data=allData[d]||{};for(const m of industryConfig.weekdayMetrics){if(typeof data[m.key]==="number")allTotals[m.key]+=data[m.key];}}
   lines.push(`── All Time (${allDates.length} days) ──`);
   for(const m of industryConfig.weekdayMetrics){
    const t=allTotals[m.key]||0;
    lines.push(`${m.label}: ${t} total${allDates.length>0?`, ${(t/allDates.length).toFixed(1)}/day`:""}`);
   }
  }
  return lines.join("\n");
 }

 const text = buildText();
 const [copied,setCopied]=useState(false);

 function copy(){
  const done=()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);};
  if(navigator.clipboard){navigator.clipboard.writeText(text).then(done).catch(fb);}else fb();
  function fb(){try{copyText(text);done();}catch{alert("Select all text and copy manually.");}}
 }

 function shareViaMessages(){
  window.location.href=`sms:?&body=${encodeURIComponent(text)}`;
 }

 const checkboxRow = (key,label) => (
  <label key={key} style={{...s.fac,gap:"8px",...s.cp,padding:"6px 0",...s.bbBd}}>
   <div onClick={()=>toggle(key)} style={{width:"16px",height:"16px",border:`1px solid ${include[key]?TA:"var(--border-2)"}`,borderRadius:"6px",background:include[key]?"#1E1800":BG0,...s.fcc,flexShrink:0,...s.cp}}>
    {include[key]&&<span style={{fontSize:"0.8rem",color:TA}}>✓</span>}
   </div>
   <span style={{fontSize:"0.9rem",color:include[key]?TP:TD}}>{label}</span>
  </label>
 );

 return (
  <div style={s.overlay}>
   <div style={s.modal}>
    <div style={s.mHead}><span style={s.mTitle}>Share Report</span><button style={s.mClose} onClick={onClose}>✕</button></div>
    <div style={s.mBody}>
     <div style={{marginBottom:"14px"}}>
      <div style={{fontSize:"0.8rem",color:"var(--border-2)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"8px"}}>Include</div>
      {checkboxRow("today",`Today — ${formatDate(today)}`)}
      {checkboxRow("week","This Week")}
      {checkboxRow("month","This Month")}
      {checkboxRow("allTime","All Time")}
     </div>
     <pre style={s.shareText}>{text||"Select at least one section above."}</pre>
     <div style={{...s.mActions,flexWrap:"wrap",gap:"8px"}}>
      {isMobile&&<button style={s.secondaryBtn} onClick={shareViaMessages}>💬 Share via Messages</button>}
      <button style={s.primaryBtn} onClick={copy}>{copied?"✓ Copied!":"Copy to Clipboard"}</button>
     </div>
    </div>
   </div>
  </div>
 );
}

function CallOutcomeTally() {
 const [open,setOpen] = useState(false);
 const OUTCOMES = [
  {key:"vm",         label:"VM",         color:TM},
  {key:"noanswer",   label:"No Ans",     color:TD},
  {key:"gatekeeper", label:"Gate",       color:"#7B6FD8"},
  {key:"callback",   label:"CB Sched",   color:TA},
  {key:"interested", label:"Interested", color:"#5DC1DB"},
  {key:"dead",       label:"Dead",       color:"#E05577"},
 ];
 const [tallies,setTallies] = useState(()=>Object.fromEntries(OUTCOMES.map(o=>[o.key,0])));
 const total = Object.values(tallies).reduce((a,b)=>a+b,0);
 const connects = (tallies.callback||0)+(tallies.interested||0);
 const connectRate = total>0?Math.round((connects/total)*100):0;

 function inc(key){setTallies(p=>({...p,[key]:p[key]+1}));}
 function dec(key){setTallies(p=>({...p,[key]:Math.max(0,p[key]-1)}));}
 function reset(){setTallies(Object.fromEntries(OUTCOMES.map(o=>[o.key,0])));}

 return (
  <div style={{marginTop:"6px",...s.mb4}}>
   <div
    onClick={()=>setOpen(o=>!o)}
    style={{...s.fac,gap:"8px",...s.cp,userSelect:"none",padding:"5px 0",...s.noTap}}
   >
    <span style={{fontSize:"0.9rem",color:TS,letterSpacing:"0.1em",textTransform:"uppercase"}}>Call Outcomes</span>
    {total>0&&!open&&<span style={s.sec95}>{total} logged · {connectRate}% connect</span>}
    <span style={{fontSize:"0.95rem",color:TM,marginLeft:"auto"}}>{open?"▲":"▼"}</span>
   </div>
   {open&&(
    <div style={{paddingTop:"8px"}}>
     <div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginBottom:"8px"}}>
      {OUTCOMES.map(o=>(
       <div key={o.key} style={{...s.fac,gap:"2px"}}>
        <button
         onClick={()=>inc(o.key)}
         style={{background:BG0,border:`1px solid ${tallies[o.key]>0?"var(--border-2)":"var(--border-2)"}`,color:tallies[o.key]>0?o.color:TS,padding:"6px 12px",borderRadius:"2px 0 0 2px",fontSize:"0.95rem",...s.Fc,letterSpacing:"0.04em",minWidth:"60px",textAlign:"center"}}>
         {o.label} {tallies[o.key]>0?<span style={{fontWeight:"bold",marginLeft:"4px"}}>{tallies[o.key]}</span>:null}
        </button>
        {tallies[o.key]>0&&<button
         onClick={()=>dec(o.key)}
         style={{...s.bgBd8,borderLeft:"none",color:TS,padding:"6px 8px",borderRadius:"0 2px 2px 0",fontSize:"0.95rem",...s.cp,lineHeight:1}}>
         −
        </button>}
       </div>
      ))}
     </div>
     {total>0&&(
      <div style={{...s.fac,...s.g12,flexWrap:"wrap"}}>
       <span style={s.sec95}>{total} logged</span>
       <span style={{fontSize:"0.8rem",color:connectRate>=20?"#5DC1DB":connectRate>=10?TA:TM}}>{connectRate}% connect rate</span>
       <button onClick={reset} style={{background:"none",border:"none",color:TM,...s.cp,fontSize:"0.8rem",padding:"0",marginLeft:"auto",letterSpacing:"0.06em",textTransform:"uppercase"}}>reset</button>
      </div>
     )}
    </div>
   )}
  </div>
 );
}

function WinLogger({wins,setWins,winInput,setWinInput,currentUser,selDate}) {
 const today = selDate||todayStr();
 const isToday = today===todayStr();

 useEffect(()=>{
  if(!currentUser)return;
  async function load(){
   const stored = await storageGet(ns(`at-wins-${currentUser.id}-${today}`));
   if(stored&&Array.isArray(stored))setWins(stored);
  }
  load();
 },[currentUser?.id, today]);

 async function addWin(){
  const w = winInput.trim();
  if(!w||!currentUser)return;
  const ts = new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  const next = [{text:w,time:ts,id:Date.now()},...wins];
  setWins(next);
  setWinInput("");
  await storageSet(ns(`at-wins-${currentUser.id}-${today}`),next);
 }

 async function removeWin(id){
  const next = wins.filter(w=>w.id!==id);
  setWins(next);
  if(currentUser)await storageSet(ns(`at-wins-${currentUser.id}-${today}`),next);
 }

 return (
  <div>
   <div style={{...s.fjsb,alignItems:"center",marginBottom:"10px"}}>
    <div style={{fontSize:"0.95rem",color:TS,letterSpacing:"0.15em",textTransform:"uppercase"}}>{isToday?"Today's":today>todayStr()?"Future":"Past"} Win Log{!isToday&&<span style={{fontSize:"0.8rem",color:TM,marginLeft:"6px"}}>{today}</span>}</div>
    <div style={s.mut8}>{wins.length} logged</div>
   </div>
   {isToday&&<div style={{display:"flex",gap:"8px",...s.mb12}}>
    <input
     style={{flex:1,...s.inpBase,...s.br8,padding:"10px 12px",fontSize:"1rem",...s.Fno}}
     placeholder="Log a win — a callback, a new lead, a load booked..."
     value={winInput}
     onChange={e=>setWinInput(e.target.value)}
     onKeyDown={e=>e.key==="Enter"&&addWin()}
    />
    <button style={{...s.primaryBtn,...s.p1014}} onClick={addWin}>+ Log</button>
   </div>}
   {wins.length===0
    ?<div style={{fontSize:"0.9rem",color:TM,fontStyle:"italic",textAlign:"center",padding:"20px 0"}}>{isToday?"No wins yet today. Go get one.":today>todayStr()?"No wins logged for a future date.":"No wins logged this day."}</div>
    :<div style={{...s.fdc,gap:"6px"}}>
     {wins.map(w=>(
      <div key={w.id} style={{display:"flex",alignItems:"flex-start",gap:"10px",padding:"10px 12px",background:BG0,...s.bd1,...s.br8,borderLeft:"2px solid #23CDED"}}>
       <div style={{flex:1}}>
        <div style={{fontSize:"1rem",...s.priF,lineHeight:1.5}}>{w.text}</div>
        <div style={{fontSize:"0.8rem",color:TM,marginTop:"3px"}}>{w.time}</div>
       </div>
       <button onClick={()=>removeWin(w.id)} style={{background:"none",border:"none",color:"var(--border-2)",...s.ptr9,padding:"2px 4px",lineHeight:1,flexShrink:0}}>x</button>
      </div>
     ))}
    </div>
   }
  </div>
 );
}

const PLAYBOOK_CONTENT = {
 freight: {
  scriptPlaceholder: "Hi, this is [Name] with [Company] — I work with shippers to cover freight more consistently and at better rates. Do you have 30 seconds?\n\n...",
  vmPlaceholder: "Hey [Name], this is [Your Name] with [Company] — quick call about your freight. I help shippers get better coverage and rates, and I'd love to show you what I can do. Give me a ring back at [Number] — again, [Your Name], [Number]. Thanks.",
  vmTip: "Keep it under 20 seconds. State your name and number twice.",
  gateLines: [
   "Who handles the shipping decisions there?",
   "Is [Name] available?",
   "Can you point me to whoever manages your freight carriers?",
   "I'd love to leave a voicemail — what's the best extension?",
   "I've been trying to reach [Name], any chance they're in today?",
  ],
  gateTip: "Keep energy up. Gatekeepers respond to confidence, not scripts.",
  aiQuick: [
   {label:"Objection: Already have a carrier",  q:"We already have a carrier"},
   {label:"Objection: Rates too high",           q:"Your rates are too high"},
   {label:"Objection: Not interested",           q:"Not interested"},
   {label:"Objection: Call me next quarter",     q:"Call me next quarter"},
   {label:"Objection: Handle freight in-house",  q:"We handle freight in-house"},
   {label:"Objection: Bad timing",               q:"Bad timing right now"},
   {label:"Discovery: Opening question",         q:"discovery_open"},
   {label:"Discovery: Find their pain point",    q:"discovery_pain"},
   {label:"Close: Trial close",                  q:"close_trial"},
   {label:"Close: Next step",                    q:"close_next"},
  ],
  aiPromptMap: {
   discovery_open: "Give me 2-3 great opening discovery questions for a freight brokerage cold call, right after getting past the gatekeeper. Short, confident, conversational.",
   discovery_pain: "Give me 2-3 questions to uncover a shipper's pain points around their current freight carrier. Brief and natural for a phone call.",
   close_trial: "Give me 2-3 trial close lines for freight brokerage — soft closes that test interest without being pushy.",
   close_next: "Give me 2-3 ways to set a clear next step at the end of a freight brokerage call (callback, email, load to try). Confident but not aggressive.",
  },
  aiCoach: "freight broker",
 },
 realestate: {
  scriptPlaceholder: "Hi, this is [Name] with [Company] — I specialize in [Neighborhood/Area] and I noticed your home at [Address]. I had a buyer asking about properties like yours recently. Do you have 30 seconds?\n\n...",
  vmPlaceholder: "Hey [Name], this is [Your Name] with [Company]. I work in [Area] and had a question about your property. Give me a call back at [Number] when you get a chance — [Your Name] at [Number]. Thanks.",
  vmTip: "Be specific — mention their neighborhood or address. It triples callbacks.",
  gateLines: [
   "Is this [Name]? I had a quick question about the property.",
   "I work in the area and wanted to reach the homeowner directly.",
   "Is the owner of the property available?",
   "I just had a few quick questions about the home — is now a bad time?",
   "I'm calling from [Company], do you handle real estate decisions for the property?",
  ],
  gateTip: "In real estate you're usually calling direct — if it's a gatekeeper, keep it brief and ask for the decision-maker by name.",
  aiQuick: [
   {label:"Objection: Already have an agent",   q:"We already have an agent"},
   {label:"Objection: Not thinking of selling",  q:"We're not thinking about selling"},
   {label:"Objection: Tried before, no luck",    q:"We tried selling before and it didn't work"},
   {label:"Objection: Market is bad",            q:"The market is bad right now"},
   {label:"Objection: Your commission is high",  q:"Your commission is too high"},
   {label:"Objection: Just looking online",      q:"We're just browsing online for now"},
   {label:"Discovery: Motivation to sell",       q:"discovery_motivation"},
   {label:"Discovery: Timeline question",        q:"discovery_timeline"},
   {label:"Close: Appointment set",              q:"close_appt"},
   {label:"Close: Follow-up",                    q:"close_followup"},
  ],
  aiPromptMap: {
   discovery_motivation: "Give me 2-3 great questions to uncover a homeowner's motivation to sell. Conversational, low-pressure, phone-appropriate.",
   discovery_timeline: "Give me 2-3 ways to ask about a seller's timeline without being pushy. Natural and empathetic.",
   close_appt: "Give me 2-3 ways to ask for a listing appointment or buyer consultation. Confident but not salesy.",
   close_followup: "Give me 2-3 ways to set a follow-up after a real estate cold call where they're not ready yet. Keep the door open.",
  },
  aiCoach: "real estate agent",
 },
 insurance: {
  scriptPlaceholder: "Hi, this is [Name] with [Company] — I specialize in helping [homeowners/businesses] in [Area] make sure they're not over-paying or under-covered. I have a quick question for you — do you have about 30 seconds?\n\n...",
  vmPlaceholder: "Hey [Name], this is [Your Name] with [Company]. I help people in [Area] review their coverage and make sure they're getting the best rate. Give me a call back at [Number] — again, [Your Name] at [Number]. Thanks.",
  vmTip: "Lead with a benefit — saving money or better coverage. Keep it under 20 seconds.",
  gateLines: [
   "Who handles insurance decisions for the household/business?",
   "Is [Name] in? I had a quick question about their current coverage.",
   "I work with a lot of [homeowners/businesses] in the area — is this a good time?",
   "I'd love to leave a quick voicemail — what's the best number?",
  ],
  gateTip: "Stay warm and helpful — insurance feels personal, gatekeepers soften when you're not pushy.",
  aiQuick: [
   {label:"Objection: Happy with current carrier", q:"We're happy with our current carrier"},
   {label:"Objection: Rates too high",             q:"Your rates are too high"},
   {label:"Objection: Already shopped around",     q:"We already shopped around"},
   {label:"Objection: Not interested",             q:"Not interested"},
   {label:"Objection: Bad timing",                 q:"Bad timing right now"},
   {label:"Discovery: Current coverage",           q:"discovery_coverage"},
   {label:"Discovery: Pain points",                q:"discovery_pain"},
   {label:"Close: Free review",                    q:"close_review"},
   {label:"Close: Next step",                      q:"close_next"},
  ],
  aiPromptMap: {
   discovery_coverage: "Give me 2-3 natural questions to ask about someone's current insurance coverage on a cold call. Low pressure, curious tone.",
   discovery_pain: "Give me 2-3 questions to find out if someone is overpaying or underinsured. Conversational, not scary.",
   close_review: "Give me 2-3 ways to ask for a free insurance review or quote. Soft, benefit-focused.",
   close_next: "Give me 2-3 ways to set a clear next step at the end of an insurance cold call. Friendly but decisive.",
  },
  aiCoach: "insurance sales agent",
 },
 solar: {
  scriptPlaceholder: "Hi, I'm [Name] with [Company] — we've been working with homeowners in [Neighborhood] to help them lock in lower energy rates before utility prices go up again. Quick question — do you own your home?\n\n...",
  vmPlaceholder: "Hey, this is [Name] with [Company]. I'm in your neighborhood this week helping homeowners reduce their energy bills with solar — give me a call back at [Number] if you want to hear what your neighbors are saving. [Number]. Thanks.",
  vmTip: "Create local social proof — 'your neighbors' is powerful. Keep it under 20 seconds.",
  gateLines: [
   "Is the homeowner available?",
   "I'm working in the neighborhood this week — is this a good time?",
   "I just had a quick question about the home's energy setup.",
   "Who makes the energy decisions for the household?",
  ],
  gateTip: "For solar D2D, smile at the door — your energy matters more than your words.",
  aiQuick: [
   {label:"Objection: Not interested in solar",   q:"I'm not interested in solar"},
   {label:"Objection: Can't afford it",           q:"I can't afford solar panels"},
   {label:"Objection: Already have solar",        q:"We already have solar"},
   {label:"Objection: Don't own the roof",        q:"I rent / don't own the roof"},
   {label:"Objection: Heard bad things",          q:"I've heard bad things about solar companies"},
   {label:"Objection: Need to talk to spouse",    q:"I need to talk to my spouse first"},
   {label:"Discovery: Current bill",              q:"discovery_bill"},
   {label:"Discovery: Motivation",                q:"discovery_motivation"},
   {label:"Close: Sit request",                   q:"close_sit"},
   {label:"Close: Handle stalls",                 q:"close_stall"},
  ],
  aiPromptMap: {
   discovery_bill: "Give me 2-3 natural ways to ask a homeowner about their current electric bill on a solar door knock. Low pressure.",
   discovery_motivation: "Give me 2-3 questions to understand a homeowner's motivation to go solar — savings, environment, energy independence. Conversational.",
   close_sit: "Give me 2-3 ways to ask for a solar demo/sit at the door. Confident but not pushy.",
   close_stall: "Give me 2-3 ways to handle a solar prospect who says 'I'll think about it'. Keep momentum without being aggressive.",
  },
  aiCoach: "solar energy consultant",
 },
 saas: {
  scriptPlaceholder: "Hey [Name], this is [Your Name] at [Company] — I'll be straight with you, this is a cold call. We help [type of company] teams [specific outcome]. Do you have 27 seconds for me to tell you why I called?\n\n...",
  vmPlaceholder: "Hey [Name], [Your Name] from [Company]. We help [type of company] [specific outcome] — I had one specific idea for [their company name] I wanted to share. I'm at [Number], give me a ring. [Number]. Thanks.",
  vmTip: "Personalize with their company name. Reference a specific outcome, not features.",
  gateLines: [
   "Who owns [sales/marketing/ops] at your company?",
   "Is [Name] available? I had a specific question for them.",
   "I'd love to leave a voicemail — can you connect me?",
   "Who would be the right person to talk to about [outcome you deliver]?",
  ],
  gateTip: "In SaaS, you're often calling into a company — sound confident and specific to get past the front desk.",
  aiQuick: [
   {label:"Objection: We already use [competitor]", q:"We already use a competitor"},
   {label:"Objection: No budget right now",         q:"We don't have budget right now"},
   {label:"Objection: Not the right time",          q:"It's not the right time"},
   {label:"Objection: Send me an email",            q:"Just send me an email"},
   {label:"Objection: Happy with current setup",    q:"We're happy with what we have"},
   {label:"Objection: Too complex to switch",       q:"Switching would be too complex"},
   {label:"Discovery: Current stack / pain",        q:"discovery_pain"},
   {label:"Discovery: Decision process",            q:"discovery_process"},
   {label:"Close: Book a demo",                     q:"close_demo"},
   {label:"Close: Next step after interest",        q:"close_next"},
  ],
  aiPromptMap: {
   discovery_pain: "Give me 2-3 discovery questions for a SaaS cold call to uncover the prospect's current pain with their existing tools. Sharp and conversational.",
   discovery_process: "Give me 2-3 ways to ask about a B2B prospect's buying process or decision-making without sounding like a checklist. Natural.",
   close_demo: "Give me 2-3 ways to book a SaaS demo on a cold call. Confident, value-focused, low-pressure.",
   close_next: "Give me 2-3 ways to set a clear next step after a SaaS prospect shows interest. Specific and easy to commit to.",
  },
  aiCoach: "B2B SaaS account executive",
 },
 mortgage: {
  scriptPlaceholder: "Hi, this is [Name] with [Company] — I work with [homeowners/buyers] in [Area] on their home financing. Quick question — have you had a chance to review your rate recently with everything that's been happening in the market?\n\n...",
  vmPlaceholder: "Hey [Name], this is [Your Name] with [Company]. I'm reaching out to homeowners in [Area] about current rate opportunities — it may be worth a 10-minute conversation. Give me a call at [Number] — [Your Name], [Number]. Thanks.",
  vmTip: "Reference market conditions — rates change and create urgency naturally.",
  gateLines: [
   "Is [Name] available? I had a quick question about their home loan.",
   "Who handles mortgage or refinancing decisions in the household?",
   "I work with homeowners in [Area] — is this a good time for a 30-second question?",
  ],
  gateTip: "Mortgage is personal — be warm, not corporate. You're helping them, not selling to them.",
  aiQuick: [
   {label:"Objection: Happy with current rate",     q:"We're happy with our current rate"},
   {label:"Objection: Just refinanced",             q:"We just refinanced"},
   {label:"Objection: Not thinking of moving",      q:"We're not thinking of moving"},
   {label:"Objection: Bad credit / not qualified",  q:"I don't think I'd qualify"},
   {label:"Objection: Working with another lender", q:"We're already working with a lender"},
   {label:"Discovery: Current rate / situation",    q:"discovery_rate"},
   {label:"Discovery: Goals / timeline",            q:"discovery_goals"},
   {label:"Close: Free review",                     q:"close_review"},
   {label:"Close: Next step",                       q:"close_next"},
  ],
  aiPromptMap: {
   discovery_rate: "Give me 2-3 natural ways to ask a homeowner about their current mortgage rate on a cold call. Low pressure, curious.",
   discovery_goals: "Give me 2-3 questions to understand a mortgage prospect's financial goals — cash out, lower payment, buy soon. Conversational.",
   close_review: "Give me 2-3 ways to ask for a free mortgage review or analysis. Soft sell, benefit-first.",
   close_next: "Give me 2-3 ways to set a next step after a mortgage prospect shows interest. Specific and easy.",
  },
  aiCoach: "mortgage loan officer",
 },
 recruiting: {
  scriptPlaceholder: "Hi [Name], this is [Your Name] with [Company] — I specialize in placing [job type] candidates in [industry/region]. I have a quick question — are you open to hearing about a role that might be a step up from where you are right now?\n\n...",
  vmPlaceholder: "Hey [Name], this is [Your Name] with [Company]. I have a [job type] opportunity in [Area/Industry] that made me think of your background. Give me a call at [Number] if you're open to a quick conversation — [Number]. Thanks.",
  vmTip: "Be specific about the role type — generic messages get ignored. Make them feel chosen.",
  gateLines: [
   "Is [Name] available? I had a confidential opportunity to discuss.",
   "Who handles hiring for [department] on your team?",
   "I'm reaching out from [Company] about a staffing need — is the hiring manager available?",
   "Is this a good time to discuss a potential placement?",
  ],
  gateTip: "For BD calls, sound like a partner not a vendor. For candidate calls, make them feel exclusively chosen.",
  aiQuick: [
   {label:"Candidate: Not looking right now",     q:"I'm not looking right now"},
   {label:"Candidate: Happy where I am",          q:"I'm happy where I am"},
   {label:"Candidate: Just started a new job",    q:"I just started a new job"},
   {label:"Client: Already using another agency", q:"We already use a staffing agency"},
   {label:"Client: No open positions",            q:"We don't have any open positions"},
   {label:"Client: No budget for fees",           q:"We can't afford placement fees"},
   {label:"Discovery: Candidate goals",           q:"discovery_candidate"},
   {label:"Discovery: Client hiring needs",       q:"discovery_client"},
   {label:"Close: Candidate next step",           q:"close_candidate"},
   {label:"Close: Client partnership",            q:"close_client"},
  ],
  aiPromptMap: {
   discovery_candidate: "Give me 2-3 questions to uncover a candidate's career goals and what would make them consider a new role. Warm and non-pressuring.",
   discovery_client: "Give me 2-3 BD discovery questions to understand a hiring manager's current staffing challenges. Consultative tone.",
   close_candidate: "Give me 2-3 ways to get a recruiting candidate to agree to a next step (call, interview, submission). Friendly and clear.",
   close_client: "Give me 2-3 ways to close a new client on a staffing partnership. Confident, value-focused.",
  },
  aiCoach: "recruiter / talent acquisition pro",
 },
 meddevice: {
  scriptPlaceholder: "Hi Dr. [Name], this is [Your Name] with [Company] — we make [device/product] that's been showing strong results for [procedure/outcome]. I know you're busy, so I'll be brief — do you have 60 seconds to hear one thing that might be relevant to your practice?\n\n...",
  vmPlaceholder: "Dr. [Name], this is [Your Name] with [Company]. We've seen great outcomes with [product] for [procedure type] in practices like yours. I'd love 10 minutes to share the data — give me a call at [Number]. [Your Name], [Number].",
  vmTip: "Lead with outcomes and data — clinical audiences respond to evidence, not features.",
  gateLines: [
   "Is Dr. [Name] available? I have a brief clinical question.",
   "I work with the surgical/clinical team — is this a good time?",
   "Who coordinates medical device evaluations for the practice?",
   "Can I leave a quick message for the doctor or office manager?",
  ],
  gateTip: "Be clinical and professional — nurses and office managers are gatekeepers with real influence. Treat them as partners.",
  aiQuick: [
   {label:"Objection: Already using a competitor",  q:"We're already using [competitor device]"},
   {label:"Objection: No budget / on contract",     q:"We're under contract or have no budget"},
   {label:"Objection: Not a priority right now",    q:"This isn't a priority for us right now"},
   {label:"Objection: Need more clinical data",     q:"I'd need to see more data before switching"},
   {label:"Objection: Doesn't see the value",       q:"I don't see how this is better than what I use"},
   {label:"Discovery: Current protocol",            q:"discovery_protocol"},
   {label:"Discovery: Outcomes they care about",    q:"discovery_outcomes"},
   {label:"Close: Trial / eval unit",               q:"close_trial"},
   {label:"Close: In-service / demo",               q:"close_demo"},
  ],
  aiPromptMap: {
   discovery_protocol: "Give me 2-3 questions to understand a physician's current clinical protocol or device preferences. Professional and consultative.",
   discovery_outcomes: "Give me 2-3 questions to uncover what outcomes a clinical buyer cares most about. Evidence-based, respectful of their time.",
   close_trial: "Give me 2-3 ways to ask for a medical device trial or evaluation unit placement. Clinical, low-risk framing.",
   close_demo: "Give me 2-3 ways to ask for an in-service or product demonstration with a clinical team. Confident but respectful of schedules.",
  },
  aiCoach: "medical device or pharma rep",
 },
 financial: {
  scriptPlaceholder: "Hi [Name], this is [Your Name] with [Company]. I work with [families/professionals/business owners] in [Area] on their financial planning — specifically around [retirement/wealth/protection]. Quick question — when was the last time someone did a full review of your financial picture?\n\n...",
  vmPlaceholder: "Hey [Name], this is [Your Name] with [Company]. I work with people in [Area] on making sure their financial plan is built for where they want to go — not just where they've been. Give me a call at [Number]. [Your Name], [Number]. Thanks.",
  vmTip: "Ask about the future, not the past — people get excited about where they're going.",
  gateLines: [
   "Is [Name] available? I had a quick financial question for them.",
   "Who handles the financial decisions in the household?",
   "I work with families in [Area] — is this a good time for a 30-second question?",
  ],
  gateTip: "Financial conversations are deeply personal — warmth and trust matter more than polish.",
  aiQuick: [
   {label:"Objection: Already have an advisor",    q:"I already have a financial advisor"},
   {label:"Objection: Not enough money to invest", q:"I don't have enough money to invest"},
   {label:"Objection: Not interested",             q:"Not interested"},
   {label:"Objection: Bad timing",                 q:"Bad timing right now"},
   {label:"Objection: Just use my 401k",           q:"I just put money in my 401k"},
   {label:"Discovery: Current situation",          q:"discovery_situation"},
   {label:"Discovery: Goals",                      q:"discovery_goals"},
   {label:"Close: Free review",                    q:"close_review"},
   {label:"Close: Next step",                      q:"close_next"},
  ],
  aiPromptMap: {
   discovery_situation: "Give me 2-3 warm discovery questions to understand a prospect's current financial situation on a cold call. Non-threatening, curious.",
   discovery_goals: "Give me 2-3 questions to help a financial planning prospect articulate their goals — retirement, protection, wealth. Conversational.",
   close_review: "Give me 2-3 ways to ask for a free financial review or planning conversation. Soft, trust-building.",
   close_next: "Give me 2-3 ways to set a next step after a financial planning prospect shows interest. Specific and low-commitment to start.",
  },
  aiCoach: "financial advisor / wealth management rep",
 },
 homeservices: {
  scriptPlaceholder: "Hi, this is [Name] with [Company] — we do [service type] for homeowners in [Area]. Quick question — when was the last time you had your [roof/HVAC/gutters] inspected?\n\n...",
  vmPlaceholder: "Hey, this is [Name] with [Company]. I'm reaching out to homeowners in [Area] about [service]. We're running a special right now and I'd love to get you a free estimate — give me a call at [Number]. [Number]. Thanks.",
  vmTip: "Lead with a free estimate — it's a low-risk offer that gets callbacks.",
  gateLines: [
   "Is the homeowner available?",
   "Who makes decisions about home maintenance for the property?",
   "I'm in the neighborhood this week — is this a good time for a 30-second question?",
  ],
  gateTip: "Home services is local and personal — be a neighbor, not a salesperson.",
  aiQuick: [
   {label:"Objection: Already have someone",      q:"We already have someone who does that"},
   {label:"Objection: Not interested right now",  q:"Not interested right now"},
   {label:"Objection: Too expensive",             q:"That sounds too expensive"},
   {label:"Objection: Renting / landlord handles",q:"I rent, my landlord handles that"},
   {label:"Objection: Just had it done",          q:"We just had that done recently"},
   {label:"Discovery: Current situation",         q:"discovery_situation"},
   {label:"Discovery: Pain / urgency",            q:"discovery_pain"},
   {label:"Close: Free estimate",                 q:"close_estimate"},
   {label:"Close: Schedule the job",              q:"close_schedule"},
  ],
  aiPromptMap: {
   discovery_situation: "Give me 2-3 questions to understand a homeowner's current situation with [home service type]. Natural and non-pushy.",
   discovery_pain: "Give me 2-3 questions to uncover urgency or pain around a home service need. Helpful, not scary.",
   close_estimate: "Give me 2-3 ways to ask for a free home service estimate appointment. Easy yes, low friction.",
   close_schedule: "Give me 2-3 ways to close a homeowner on scheduling a home service job. Direct but friendly.",
  },
  aiCoach: "home services professional",
 },
 automotive: {
  scriptPlaceholder: "Hey [Name], this is [Your Name] at [Dealership] — you came in / expressed interest in the [Model] recently. Just wanted to follow up personally and see if you had any questions. We've got some great options right now — is this a good time?\n\n...",
  vmPlaceholder: "Hey [Name], this is [Your Name] at [Dealership]. I wanted to personally follow up about the [vehicle] you were looking at. We've got a great deal lined up and I want to make sure you're taken care of. Call me at [Number]. [Your Name], [Number].",
  vmTip: "Reference the specific vehicle they looked at — it shows you remember them.",
  gateLines: [
   "Is [Name] available? I'm following up on their recent visit to the dealership.",
   "They were looking at a vehicle — can I leave them a message?",
   "This is [Name] at [Dealership] — is now a good time?",
  ],
  gateTip: "Auto sales is relationship-driven — be the rep who remembers names and details.",
  aiQuick: [
   {label:"Objection: Just browsing",             q:"We're just browsing right now"},
   {label:"Objection: Price is too high",         q:"The price is too high"},
   {label:"Objection: Need to think about it",    q:"I need to think about it"},
   {label:"Objection: Talking to other dealers",  q:"We're looking at other dealerships too"},
   {label:"Objection: Trade value too low",       q:"You're not offering enough for my trade"},
   {label:"Objection: Payment too high",          q:"The monthly payment is too high"},
   {label:"Discovery: What they want",            q:"discovery_needs"},
   {label:"Discovery: Trade / timeline",          q:"discovery_timeline"},
   {label:"Close: Demo drive",                    q:"close_demo"},
   {label:"Close: Pencil the deal",               q:"close_pencil"},
  ],
  aiPromptMap: {
   discovery_needs: "Give me 2-3 questions to understand what a car buyer is looking for — features, lifestyle, budget. Conversational.",
   discovery_timeline: "Give me 2-3 natural ways to ask an auto buyer about their timeline and trade-in situation. Low pressure.",
   close_demo: "Give me 2-3 ways to ask an auto buyer to come in for a test drive. Easy and inviting.",
   close_pencil: "Give me 2-3 ways to move an auto prospect to the desk to pencil a deal. Confident and low-pressure.",
  },
  aiCoach: "automotive consultant",
 },
 b2b_general: {
  scriptPlaceholder: "Hey [Name], this is [Your Name] at [Company] — straight up, this is a cold call. We help [type of business] [specific outcome]. I had one specific reason I reached out to [their company] — do you have 30 seconds?\n\n...",
  vmPlaceholder: "Hey [Name], [Your Name] from [Company]. We help [type of business] [specific outcome] — I had a specific idea for [their company name]. I'm at [Number], give me a ring. [Number]. Thanks.",
  vmTip: "Personalize with their company name. Reference a specific outcome, not features.",
  gateLines: [
   "Who owns [the problem you solve] at your company?",
   "Is [Name] available? I had a specific question for them.",
   "I'm reaching out to [Company] about [relevant topic] — who would be the right person?",
  ],
  gateTip: "Sound confident and specific — gatekeepers route people who seem like they belong.",
  aiQuick: [
   {label:"Objection: Not interested",             q:"Not interested"},
   {label:"Objection: Happy with current vendor",  q:"We're happy with what we have"},
   {label:"Objection: No budget",                  q:"We don't have budget"},
   {label:"Objection: Send me an email",           q:"Just send me an email"},
   {label:"Objection: Too busy right now",         q:"I'm too busy right now"},
   {label:"Discovery: Current situation",          q:"discovery_situation"},
   {label:"Discovery: Pain / challenge",           q:"discovery_pain"},
   {label:"Close: Meeting / call",                 q:"close_meeting"},
   {label:"Close: Next step",                      q:"close_next"},
  ],
  aiPromptMap: {
   discovery_situation: "Give me 2-3 B2B discovery questions to understand a prospect's current situation. Sharp, curious, conversational.",
   discovery_pain: "Give me 2-3 questions to uncover a B2B prospect's pain or challenge. Direct but empathetic.",
   close_meeting: "Give me 2-3 ways to book a B2B meeting or discovery call on a cold call. Clear, easy to say yes to.",
   close_next: "Give me 2-3 ways to set a clear next step after a B2B prospect shows interest. Specific with a date/time.",
  },
  aiCoach: "B2B account executive",
 },
 roofing: {
  scriptPlaceholder: "Hi, I'm [Name] with [Company] — we do roofing and exteriors in [Area]. I'm actually in your neighborhood this week doing some work, and I noticed your roof might be due for an inspection. Totally free — would you be open to me taking a quick look while I'm in the area?\n\n...",
  vmPlaceholder: "Hey, this is [Name] with [Company]. I'm in your neighborhood this week and wanted to offer a free roof inspection — no strings attached. Give me a call at [Number] to set a time. [Name], [Number]. Thanks.",
  vmTip: "The free inspection offer is your foot in the door — lead with it every time.",
  gateLines: [
   "Is the homeowner available?",
   "I'm in the neighborhood doing work — is this a good time for a quick question?",
   "Who makes roofing decisions for the property?",
  ],
  gateTip: "Lead with the free inspection — it's a service, not a sale. Removes all resistance.",
  aiQuick: [
   {label:"Objection: Roof is fine",              q:"My roof is fine, I don't need an inspection"},
   {label:"Objection: Already have someone",      q:"We already have a roofer we use"},
   {label:"Objection: Just got a new roof",       q:"We just got a new roof"},
   {label:"Objection: Insurance won't cover it",  q:"I don't think my insurance will cover it"},
   {label:"Objection: Getting other quotes",      q:"I'm getting a few quotes first"},
   {label:"Discovery: Roof age / condition",      q:"discovery_roof"},
   {label:"Discovery: Storm damage / urgency",    q:"discovery_damage"},
   {label:"Close: Schedule inspection",           q:"close_inspect"},
   {label:"Close: Sign the contract",             q:"close_sign"},
  ],
  aiPromptMap: {
   discovery_roof: "Give me 2-3 natural questions to ask a homeowner about the age and condition of their roof. Helpful, non-scary.",
   discovery_damage: "Give me 2-3 ways to ask about potential storm or hail damage without being alarmist. Informative and helpful.",
   close_inspect: "Give me 2-3 ways to ask a homeowner to schedule a free roof inspection. Easy yes, no strings.",
   close_sign: "Give me 2-3 ways to close a roofing homeowner on signing a contract after the estimate. Direct and reassuring.",
  },
  aiCoach: "roofing and exteriors professional",
 },
 smb_retail: {
  scriptPlaceholder: "Hi there, I'm [Name] — how's your day going? Are you looking for anything specific today, or just browsing?\n\n...",
  vmPlaceholder: "Hey [Name], this is [Your Name] at [Store/Company]. I wanted to personally follow up — I think I have exactly what you're looking for. Give me a call at [Number] when you get a chance. [Number]. Thanks.",
  vmTip: "Be personal and helpful — retail is about the experience, not the script.",
  gateLines: [
   "Who's the decision maker for purchasing at your location?",
   "Is the owner or manager available?",
   "I'm reaching out about a product/service that's popular with businesses like yours.",
  ],
  gateTip: "SMB owners are busy — get to the point fast and lead with what's in it for them.",
  aiQuick: [
   {label:"Objection: Just looking",              q:"I'm just looking"},
   {label:"Objection: Price is too high",         q:"That's too expensive"},
   {label:"Objection: Don't need it",             q:"I don't think I need that"},
   {label:"Objection: Need to think about it",    q:"I need to think about it"},
   {label:"Objection: Can get it cheaper online", q:"I can get it cheaper online"},
   {label:"Discovery: What they need",            q:"discovery_needs"},
   {label:"Discovery: Pain / frustration",        q:"discovery_pain"},
   {label:"Close: Trial / sample",               q:"close_trial"},
   {label:"Close: Complete the sale",             q:"close_sale"},
  ],
  aiPromptMap: {
   discovery_needs: "Give me 2-3 consultative questions to understand what a retail or SMB customer is looking for. Friendly and helpful.",
   discovery_pain: "Give me 2-3 questions to uncover what's frustrating a retail customer or SMB owner about their current situation. Natural.",
   close_trial: "Give me 2-3 ways to offer a trial or sample to a hesitant retail customer. Low risk, easy yes.",
   close_sale: "Give me 2-3 ways to close a retail or SMB sale when the customer is on the fence. Warm and confident.",
  },
  aiCoach: "retail or SMB professional",
 },
};

// Generic fallback for custom industries — just a script box + free AI input
const PLAYBOOK_GENERIC = {
 scriptPlaceholder: "Paste your call script here...",
 vmPlaceholder: "Paste your voicemail script here...",
 vmTip: "Keep it under 20 seconds. State your name and number twice.",
 gateLines: [
  "Is [Name] available?",
  "Who should I speak with about [your product/service]?",
  "Can you point me to the decision-maker?",
  "I'd love to leave a voicemail — what's the best extension?",
 ],
 gateTip: "Stay confident and brief with gatekeepers.",
 aiQuick: [
  {label:"Objection: Not interested",     q:"Not interested"},
  {label:"Objection: Bad timing",         q:"Bad timing right now"},
  {label:"Objection: Too expensive",      q:"It's too expensive"},
  {label:"Objection: Happy with current", q:"We're happy with what we have"},
  {label:"Discovery: Opening question",   q:"discovery_open_generic"},
  {label:"Close: Next step",              q:"close_next_generic"},
 ],
 aiPromptMap: {
  discovery_open_generic: "Give me 2-3 strong opening discovery questions for a B2B cold call. Short, confident, conversational.",
  close_next_generic: "Give me 2-3 ways to set a clear next step at the end of a B2B sales call. Confident but not aggressive.",
 },
 aiCoach: "B2B account executive",
};

function CallPlaybook({scriptPad, onScriptChange, vmScript, onVmChange, industry, industryConfig, isAdmin, superAdminId, currentUser}) {
 const [section, setSection] = useState("script");

 // Determine playbook content: known industry → specific, unknown → generic
 const pb = PLAYBOOK_CONTENT[industry] || PLAYBOOK_GENERIC;

 const SECTIONS = [
  {key:"script",  label:"Live Script"},
  {key:"vm",      label:"Voicemail"},
  {key:"gate",    label:"Gatekeeper"},
 ];

 async function runAi(query) {
  const q = query || aiQuery.trim();
  if(!q) return;
  if(!isAdmin){
   setAiQuery(q);
   setAiResult("__ADMIN_GATE__:ai");
   return;
  }
  setAiQuery(q);
  setAiLoading(true); setAiResult(null); setAiError("");
  try {
   const isSpecial = pb.aiPromptMap && pb.aiPromptMap[q];
   // For unknown custom industries, build a description from their metrics
   const industryDesc = PLAYBOOK_CONTENT[industry]
    ? pb.aiCoach
    : `${industryConfig?.label||"professional"} practitioner${industryConfig?.weekdayMetrics ? " (tracks: "+industryConfig.weekdayMetrics.map(m=>m.label).join(", ")+")" : ""}`;
   const prompt = isSpecial
    ? pb.aiPromptMap[q]
    : `You are a performance coach for a ${industryDesc}. Give 2-3 sharp, confident responses for this objection or challenge: "${q}". Each 1-2 sentences, conversational, direct. Numbered list. No preamble.`;

   const data = await callAI({ model: "claude-sonnet-4-20250514", messages: [{role:"user",content:prompt}], max_tokens: 400, call_type: "script" })
   if(!resp.ok){setAiError(`API error: ${data?.error?.message||resp.status}`);setAiLoading(false);return;}
   const text=(data?.content||[]).filter(b=>b.type==="text").map(b=>b.text||"").join("").trim();
   if(text)setAiResult(text); else setAiError("No result.");
  } catch(e){setAiError(`Failed: ${e.message}`);}
  setAiLoading(false);
 }

 return (
  <div>
   {/* Section tabs */}
   <div style={{display:"flex",...s.g4,marginBottom:"14px",flexWrap:"wrap"}}>
    {SECTIONS.map(sec=>(
     <button key={sec.key} onClick={()=>setSection(sec.key)}
      style={{...s.smallTab,...(section===sec.key?s.smallTabActive:{})}}>
      {sec.label}
     </button>
    ))}
   </div>

   {/* Live Script */}
   {section==="script"&&(
    <div>
     <div style={{...s.fjsb,alignItems:"center",marginBottom:"8px"}}>
      <div style={{fontSize:"0.8rem",color:"var(--border-2)",letterSpacing:"0.12em",textTransform:"uppercase"}}>Live Call Script</div>
      <div style={{fontSize:"0.9rem",color:BD1}}>saves automatically · persists daily</div>
     </div>
     <textarea
      style={{...s.inpBase,...s.br8,...s.p12,fontSize:"1rem",fontFamily:F,resize:"vertical",lineHeight:1.7,...s.w100,boxSizing:"border-box",minHeight:"180px",outline:"none"}}
      placeholder={pb.scriptPlaceholder}
      value={scriptPad}
      onChange={e=>onScriptChange(e.target.value)}
     />
    </div>
   )}

   {/* Voicemail */}
   {section==="vm"&&(
    <div>
     <div style={{...s.fjsb,alignItems:"center",marginBottom:"8px"}}>
      <div style={{fontSize:"0.8rem",color:"var(--border-2)",letterSpacing:"0.12em",textTransform:"uppercase"}}>Voicemail Script</div>
      <div style={{fontSize:"0.9rem",color:BD1}}>saves automatically · persists daily</div>
     </div>
     <textarea
      style={{...s.inpBase,...s.br8,...s.p12,fontSize:"1rem",fontFamily:F,resize:"vertical",lineHeight:1.7,...s.w100,boxSizing:"border-box",minHeight:"140px",outline:"none"}}
      placeholder={pb.vmPlaceholder}
      value={vmScript}
      onChange={e=>onVmChange(e.target.value)}
     />
     <div style={{fontSize:"0.9rem",color:BD1,marginTop:"6px"}}>Tip: {pb.vmTip}</div>
    </div>
   )}

   {/* Gatekeeper */}
   {section==="gate"&&(
    <div>
     <div style={{fontSize:"0.8rem",color:"var(--border-2)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"10px"}}>Gatekeeper Talk Track</div>
     <div style={{...s.fdc,gap:"6px"}}>
      {pb.gateLines.map((line,i)=>(
       <div key={i} style={{...s.p1014,background:BG0,...s.bd1,...s.br8,borderLeft:"2px solid #2A2A2A",fontSize:"1rem",...s.priF,lineHeight:1.5}}>
        {line}
       </div>
      ))}
     </div>
     <div style={{fontSize:"0.8rem",color:TM,marginTop:"10px"}}>{pb.gateTip}</div>
    </div>
   )}
  </div>
 );
}

// Shown when a non-admin tries to use an admin-only feature

function AdminGateMsg({superAdminId, currentUser, featureName}) {
 const [sent,setSent] = useState(false);

 async function requestAccess(){
  if(!superAdminId||!currentUser)return;
  const tKey=[currentUser.id,superAdminId].sort().join("_");
  const msg={id:Date.now(),senderId:currentUser.id,senderName:currentUser.name,
   text:`Hi — I'd like access to ${featureName}. Can you grant me admin permissions? (${new Date().toLocaleDateString()})`,
   ts:Date.now()};
  const existing=await loadPersonalMessages(tKey);
  await savePersonalMessages(tKey,[...existing,msg]);
  for(const uid of [currentUser.id,superAdminId]){
   const uThreads=await loadPersonalThreads(uid);
   const exists=uThreads.find(t=>t.threadKey===tKey);
   const isMe=uid===currentUser.id;
   if(exists){
    await savePersonalThreads(uid,uThreads.map(t=>t.threadKey===tKey?{...t,lastMsg:msg.text,lastTs:msg.ts,unreadCount:isMe?0:(t.unreadCount||0)+1}:t));
   } else {
    await savePersonalThreads(uid,[...uThreads,{threadKey:tKey,participantIds:[currentUser.id,superAdminId],name:isMe?"Admin Request":currentUser.name+" (admin request)",lastMsg:msg.text,lastTs:msg.ts,unreadCount:isMe?0:1}]);
   }
  }
  setSent(true);
 }

 return (
  <div style={{padding:"12px 14px",background:BG0,border:"1px solid #1E1010",...s.br8,...s.mt8}}>
   <div style={{fontSize:"0.95rem",color:TS,marginBottom:"6px"}}>{featureName} is available to admins only.</div>
   {!sent
    ? <button style={{...s.smallTab,fontSize:"0.8rem",padding:"5px 12px",color:TA,borderColor:"#2A1A08"}} onClick={requestAccess}>
      Request Access →
     </button>
    : <div style={s.x7}>✓ Request sent to admin via Messages.</div>
   }
  </div>
 );
}

function PhoneLookup({query,setQuery,result,setResult,loading,setLoading,error,setError,isAdmin,superAdminId,currentUser}) {

 async function lookup() {
  const q = query.trim();
  if(!q) return;
  if(!isAdmin){
   setResult(`__ADMIN_GATE__:phone:${q}`);
   return;
  }
  setLoading(true); setResult(null); setError("");
  try {
   const digits = q.replace(/[^\d]/g,"");
   const isPhone = digits.length >= 7;
   const prompt = isPhone
    ? `Someone wants to know what company owns this phone number: "${q}". Based on your knowledge, what company or organization is most commonly associated with this number? Provide: company name, what the number is for (main HQ, sales line, support, etc.), and city/state if known. If it appears to be a personal/unknown number say so. Be concise — 3 sentences max.`
    : `Find the corporate headquarters phone number for this company: "${q}". This may include a city and state to help identify the right location. Provide the best main corporate HQ phone number you know, the full company name, city/state of HQ, and what line it reaches. Format it clearly with the phone number on its own line. If you know a number but aren't fully certain it's current, still provide it and note to verify. Only say you don't know if you truly have no information at all.`;
   const data = await callAI({ model: "claude-sonnet-4-20250514", messages: [{role:"user", content: prompt}], max_tokens: 500, call_type: "general" })
   if(!resp.ok){
    // Show the actual Anthropic error so we know what went wrong
    const msg = data?.error?.message||data?.type||`HTTP ${resp.status}`;
    setError(`API error: ${msg}`);
    setLoading(false); return;
   }
   // Content may include tool_use (search) blocks + text blocks — extract text only
   const text = (data?.content||[]).filter(b=>b.type==="text").map(b=>b.text||"").join("").trim();
   if(text) setResult(text);
   else setError(`No result. Response: ${JSON.stringify(data).slice(0,200)}`);
  } catch(e) {
   setError(`Lookup failed: ${e.message}`);
  }
  setLoading(false);
 }

 return (
  <div>
   <div style={{fontSize:"0.8rem",color:"var(--border-2)",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:"10px"}}>Phone / Company Lookup</div>
   <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
    <input
     style={{flex:1,...s.inpBase,...s.br8,padding:"10px 12px",fontSize:"1rem",...s.Fno}}
     placeholder="Phone number, or: Company Name, City, ST..."
     value={query}
     onChange={e=>setQuery(e.target.value)}
     onKeyDown={e=>e.key==="Enter"&&lookup()}
    />
    <button style={{...s.primaryBtn,padding:"10px 16px",opacity:loading?0.5:1}} onClick={lookup} disabled={loading}>
     {loading?"...":"Look up"}
    </button>
   </div>
   {error&&<div style={{fontSize:"0.95rem",color:"#E05577",padding:"8px 10px",background:BG1,border:BB2A10,...s.br8}}>{error}</div>}
   {result&&(result.startsWith("__ADMIN_GATE__")
    ? <AdminGateMsg superAdminId={superAdminId} currentUser={currentUser} featureName="Phone Lookup"/>
    : <div style={{fontSize:"1rem",color:TP,lineHeight:1.7,padding:"12px 14px",background:BG0,...s.bd1,...s.br8,fontFamily:F}}>{result}</div>
   )}
   {(!result||!result.startsWith("__ADMIN_GATE__"))&&<div style={{fontSize:"0.9rem",color:BD1,...s.mt8,letterSpacing:"0.04em"}}>Powered by Claude · Results based on training data, verify before calling</div>}
  </div>
 );
}

function WorkingTools({scriptPad, onScriptChange, currentUser, industry, industryConfig, isAdmin, allUsers, superAdminId, selDate, activeMetrics, myData, myGoals, counts, onOpenPacer}) {
 const [open,setOpen] = useState(true);
 const [activeTool,setActiveTool] = useState("timer");

 const TIMER_PRESETS = [15,30,45,60,90,120];
 const [timerDuration,setTimerDuration] = useState(30);
 const [timerRemaining,setTimerRemaining] = useState(null);
 const [timerRunning,setTimerRunning] = useState(false);
 const [timerDone,setTimerDone] = useState(false);
 const [timerCustom,setTimerCustom] = useState("");
 const [timerMuted,setTimerMuted] = useState(false);
 const timerIntervalRef = useRef(null);
 const timerAudioRef = useRef(null);
 // Session tracking for Pacer check-in
 const [sessionSnapshot, setSessionSnapshot] = useState(null); // counts at session start
 const [sessionDuration, setSessionDuration] = useState(null); // minutes
 const [showPacerCheckin, setShowPacerCheckin] = useState(false);

 function handleTimerStart(durationMins) {
  // Snapshot current counts when timer starts
  setSessionSnapshot({ ...(counts || {}) });
  setSessionDuration(durationMins);
  setShowPacerCheckin(false);
 }
 function handleTimerDone() {
  setShowPacerCheckin(true);
 }

 const [wins,setWins] = useState([]);
 const [winInput,setWinInput] = useState("");
 useEffect(()=>{setWins([]);setWinInput("");},[selDate]);

 const [vmScript,setVmScript] = useState("");
 const vmSaveTimer = useRef(null);

 // Dynamic AI-generated tools based on industry/track


  // Notes scratchpad state
 const [notesText, setNotesText] = useState("");
 const notesSaveTimer = useRef(null);
 const notesKey = currentUser ? `at-notes-${currentUser.id}-${selDate || "today"}` : null;
 useEffect(() => {
  if (!notesKey) return;
  storageGet(ns(notesKey)).then(v => { if (v) setNotesText(v); else setNotesText(""); }).catch(() => {});
 }, [notesKey]);
 function handleNotesChange(val) {
  setNotesText(val);
  clearTimeout(notesSaveTimer.current);
  if (notesKey) notesSaveTimer.current = setTimeout(() => {
   storageSet(ns(notesKey), val).catch(() => {});
  }, 800);
 }

 // Only show Call Outcomes tab if the current track has outbound call metrics
 const hasCallMetrics = (activeMetrics || industryConfig?.weekdayMetrics || []).some(m =>
  m.key === "outbound" || m.key === "calls" || (m.label||"").toLowerCase().includes("call")
 );
 const tools = [
  {key:"timer",         label:"Timer"},
  {key:"playbook",      label:"Playbook"},
  {key:"wins",          label:"Win Log"},
  {key:"notes",         label:"Notes"},
  ...(hasCallMetrics && selDate===todayStr() ? [{key:"outcomes", label:"Outcomes"}] : []),
 ];

 useEffect(()=>{
  if(!currentUser)return;
  storageGet(ns(`at-vmscript-${currentUser.id}`)).then(v=>{ if(v)setVmScript(v); });
 },[currentUser?.id]);

 const toolIcons  = { timer:"⏱", playbook:"📋", wins:"🏆", notes:"📝", outcomes:"📞" };
 const toolLabels = { timer:"Timer", playbook:"Playbook", wins:"Win Log", notes:"Notes", outcomes:"Outcomes" };

 return (
  <div style={{ marginTop:"32px" }}>
   {/* Collapsible card — defaults open */}
   <div style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"18px", overflow:"hidden" }}>

    {/* Clickable header */}
    <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", background:"none", border:"none", borderBottom: open ? "1px solid var(--border-1)" : "none", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent", minHeight:"48px" }}>
     <span style={{ fontSize:"0.72rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:"700" }}>⚡ Toolkit</span>
     <span style={{ fontSize:"0.72rem", color:"var(--text-dim)", transform:open?"rotate(180deg)":"none", display:"inline-block", transition:"transform 0.2s" }}>▼</span>
    </button>

    {open && <>
    {/* Big icon tab row */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
     {tools.map((t,i) => (
      <button key={t.key} onClick={()=>setActiveTool(t.key)} style={{
       background: activeTool===t.key ? "rgba(29,201,232,0.07)" : "transparent",
       border:"none",
       borderBottom: activeTool===t.key ? "3px solid var(--accent)" : "3px solid transparent",
       borderRight: i < tools.length-1 ? "1px solid var(--border-1)" : "none",
       padding:"18px 8px 14px", cursor:"pointer", fontFamily:F,
       display:"flex", flexDirection:"column", alignItems:"center", gap:"6px",
       transition:"background 0.15s", WebkitTapHighlightColor:"transparent"
      }}>
       <span style={{ fontSize:"1.6rem", lineHeight:1 }}>{toolIcons[t.key]}</span>
       <span style={{ fontSize:"0.7rem", fontWeight:"700", letterSpacing:"0.06em", textTransform:"uppercase",
         color: activeTool===t.key ? "var(--accent)" : "var(--text-muted)" }}>
        {toolLabels[t.key]}
       </span>
      </button>
     ))}
    </div>

    {/* Content area */}
    <div style={{ padding:"22px 20px 24px" }}>
     <div style={{ display:activeTool==="timer"?"block":"none" }}>
      <SalesTimer
       PRESETS={TIMER_PRESETS}
       duration={timerDuration} setDuration={setTimerDuration}
       remaining={timerRemaining} setRemaining={setTimerRemaining}
       running={timerRunning} setRunning={setTimerRunning}
       done={timerDone} setDone={setTimerDone}
       custom={timerCustom} setCustom={setTimerCustom}
       muted={timerMuted} setMuted={setTimerMuted}
       intervalRef={timerIntervalRef} audioCtxRef={timerAudioRef}
       onStart={(mins) => handleTimerStart(mins)}
       onDone={() => handleTimerDone()}
      />
      {showPacerCheckin && (
       <PacerTimerCheckin
        duration={sessionDuration}
        snapshot={sessionSnapshot}
        currentCounts={counts}
        metrics={activeMetrics || industryConfig?.weekdayMetrics || []}
        myGoals={myGoals || {}}
        currentUser={currentUser}
        onOpenPacer={onOpenPacer}
        onDismiss={() => setShowPacerCheckin(false)}
       />
      )}
     </div>
     <div style={{ display:activeTool==="playbook"?"block":"none" }}>
      <CallPlaybook
       scriptPad={scriptPad} onScriptChange={onScriptChange}
       vmScript={vmScript} onVmChange={v=>{
        setVmScript(v);
        clearTimeout(vmSaveTimer.current);
        if(currentUser)vmSaveTimer.current=setTimeout(async()=>{await storageSet(ns(`at-vmscript-${currentUser.id}`),v);},1500);
       }}
       industry={industry} industryConfig={industryConfig}
       isAdmin={isAdmin} superAdminId={superAdminId} currentUser={currentUser}
      />
     </div>
     <div style={{ display:activeTool==="wins"?"block":"none" }}>
      <WinLogger wins={wins} setWins={setWins} winInput={winInput} setWinInput={setWinInput} currentUser={currentUser} selDate={selDate}/>
     </div>
     <div style={{ display:activeTool==="notes"?"block":"none" }}>
      <div style={{ marginBottom:"8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
       <div style={{ fontSize:"0.72rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em" }}>Today's scratch pad</div>
       {notesText && <button onClick={() => handleNotesChange("")} style={{ background:"none", border:"none", color:"var(--text-dim)", fontSize:"0.72rem", cursor:"pointer", fontFamily:F, padding:"2px 6px", borderRadius:"4px" }}>Clear</button>}
      </div>
      <textarea
       value={notesText}
       onChange={e => handleNotesChange(e.target.value)}
       placeholder={"Jot anything down — call notes, ideas, follow-ups...\n\nThis saves automatically and resets each day."}
       style={{
        width:"100%", minHeight:"200px", boxSizing:"border-box",
        background:"var(--bg-0)", border:"1px solid var(--border-1)",
        borderRadius:"10px", padding:"12px 14px",
        fontSize:"0.88rem", color:"var(--text-primary)", fontFamily:F,
        lineHeight:1.65, resize:"vertical", outline:"none",
        WebkitTapHighlightColor:"transparent",
       }}
      />
      <div style={{ fontSize:"0.68rem", color:"var(--text-dim)", marginTop:"6px", textAlign:"right" }}>
       {notesText.length > 0 ? `${notesText.length} chars · auto-saved` : "auto-saves as you type"}
      </div>
     </div>
     {activeTool==="outcomes" && <CallOutcomeTally/>}
    </div>
    </>}
   </div>
  </div>
 );
}


// ── PacerTimerCheckin — fires when the timer ends ────────────────────────────
function PacerTimerCheckin({ duration, snapshot, currentCounts, metrics, myGoals, currentUser, onOpenPacer, onDismiss }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [visible, setVisible] = useState(false);

 useEffect(() => {
  // Animate in after a tick
  const t = setTimeout(() => setVisible(true), 50);
  return () => clearTimeout(t);
 }, []);

 // Calculate what changed during the session
 const deltas = metrics.filter(m => {
  const goal = myGoals[m.key] ?? m.defaultGoal;
  return goal > 0;
 }).map(m => {
  const before = snapshot?.[m.key] || 0;
  const after  = currentCounts?.[m.key] || 0;
  const delta  = Math.max(0, after - before);
  const goal   = myGoals[m.key] ?? m.defaultGoal;
  return { key: m.key, label: m.label, short: m.short || m.label, delta, before, after, goal };
 }).filter(m => m.delta > 0 || m.after > 0);

 const activeDeltas = deltas.filter(m => m.delta > 0);
 const totalGoalPct = deltas.length > 0
  ? Math.round(deltas.reduce((s, m) => s + (m.goal > 0 ? Math.min(1, m.after / m.goal) : 0), 0) / deltas.length * 100)
  : 0;

 // Build a context string for Pacer
 function buildPacerMessage() {
  const sessStr = activeDeltas.length > 0
   ? `In the last ${duration}m: ${activeDeltas.map(m => `${m.delta} ${m.short}`).join(", ")}.`
   : `Just finished a ${duration}-minute session.`;
  const goalStr = deltas.length > 0
   ? `Overall today: ${deltas.map(m => `${m.after}/${m.goal} ${m.short} (${Math.round(m.goal > 0 ? (m.after/m.goal)*100 : 0)}%)`).join(", ")}.`
   : "";
  return `[Timer ended — ${duration}m block] ${sessStr} ${goalStr} Ask ${currentUser?.name || "them"} how the session felt and whether they want to log a reflection or share a post. Reference specific numbers. Keep it under 3 sentences. Be direct — not "great job!", just honest and curious.`;
 }

 function handleOpenPacer() {
  // Store the check-in prompt for Pacer to pick up
  try {
   const msg = buildPacerMessage();
   sessionStorage.setItem("pacer-timer-checkin", msg);
  } catch {}
  if (onOpenPacer) onOpenPacer();
  onDismiss();
 }

 if (!visible) return null;

 return (
  <div style={{
   background: "linear-gradient(135deg, rgba(29,201,232,0.08) 0%, rgba(74,207,134,0.05) 100%)",
   border: "1px solid rgba(29,201,232,0.25)",
   borderRadius: "14px",
   padding: "16px 18px",
   marginTop: "14px",
   animation: "slideUp 0.25s ease-out",
  }}>
   {/* Header */}
   <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
     <span style={{ fontSize: "1rem" }}>⏰</span>
     <span style={{ fontSize: "0.72rem", fontWeight: "800", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
      {duration}m Block Done
     </span>
    </div>
    <button onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem", padding: "0 4px", fontFamily: F }}>✕</button>
   </div>

   {/* Session stats */}
   {deltas.length > 0 && (
    <div style={{ marginBottom: "12px" }}>
     {activeDeltas.length > 0 ? (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
       {activeDeltas.map(m => (
        <div key={m.key} style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "6px 12px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: "60px" }}>
         <span style={{ fontSize: "1.1rem", fontWeight: "900", color: "var(--accent)", fontFamily: F, lineHeight: 1 }}>+{m.delta}</span>
         <span style={{ fontSize: "0.6rem", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "2px" }}>{m.short}</span>
        </div>
       ))}
       {totalGoalPct > 0 && (
        <div style={{ background: totalGoalPct >= 100 ? "rgba(74,207,134,0.1)" : "rgba(29,201,232,0.08)", border: `1px solid ${totalGoalPct >= 100 ? "rgba(74,207,134,0.3)" : "rgba(29,201,232,0.2)"}`, borderRadius: "8px", padding: "6px 12px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: "60px" }}>
         <span style={{ fontSize: "1.1rem", fontWeight: "900", color: totalGoalPct >= 100 ? "#4ACF86" : "var(--accent)", fontFamily: F, lineHeight: 1 }}>{totalGoalPct}%</span>
         <span style={{ fontSize: "0.6rem", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "2px" }}>of goal</span>
        </div>
       )}
      </div>
     ) : (
      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: F, fontStyle: "italic", marginBottom: "8px" }}>
        Nothing logged this session yet.
      </div>
     )}
    </div>
   )}

   {/* CTA row */}
   <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
    <button onClick={()=>{haptic.light();handleOpenPacer();}}
     style={{ flex: 1, background: "var(--accent)", color: "#000", border: "none", borderRadius: "10px", padding: "10px 14px", fontSize: "0.85rem", fontWeight: "800", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
     <span>⚡</span> Ask Pacer how it went
    </button>
    <button onClick={onDismiss}
     style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", color: "var(--text-muted)", borderRadius: "10px", padding: "10px 14px", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
     Dismiss
    </button>
   </div>
  </div>
 );
}


function SalesTimer({PRESETS,duration,setDuration,remaining,setRemaining,running,setRunning,done,setDone,custom,setCustom,muted,setMuted,intervalRef,audioCtxRef,onStart,onDone}) {

 function playChime() {
  if(muted) return;
  try {
   const ctx = new (window.AudioContext||window.webkitAudioContext)();
   audioCtxRef.current = ctx;
   const notes = [523.25, 659.25, 783.99];
   notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * 0.32;
    const end = start + 0.9;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    osc.start(start);
    osc.stop(end);
   });
   setTimeout(()=>{
    if(!audioCtxRef.current) return;
    notes.forEach((freq, i) => {
     const osc = ctx.createOscillator();
     const gain = ctx.createGain();
     osc.connect(gain);
     gain.connect(ctx.destination);
     osc.type = "sine";
     osc.frequency.value = freq;
     const start = ctx.currentTime + i * 0.32;
     const end = start + 0.7;
     gain.gain.setValueAtTime(0, start);
     gain.gain.linearRampToValueAtTime(0.14, start + 0.04);
     gain.gain.exponentialRampToValueAtTime(0.001, end);
     osc.start(start);
     osc.stop(end);
    });
   }, 1400);
  } catch(e) {}
 }

 useEffect(()=>{
  if(running&&remaining>0){
   intervalRef.current=setInterval(()=>{
    setRemaining(r=>{
     if(r<=1){clearInterval(intervalRef.current);setRunning(false);setDone(true);return 0;}
     return r-1;
    });
   },1000);
  }
  return()=>clearInterval(intervalRef.current);
 },[running]);

 useEffect(()=>{
  if(running&&remaining!==null){
   const m=Math.floor(remaining/60);
   const s=remaining%60;
   document.title=`⏱ ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} — Activity Tracker`;
  } else if(done){
   document.title="⏰ Time's up! — Activity Tracker";
  } else {
   document.title="Activity Tracker";
  }
  return()=>{ document.title="Activity Tracker"; };
 },[running,remaining,done]);

 useEffect(()=>{
  if(done) {
   playChime();
   haptic.milestone();
   if(onDone) setTimeout(()=>onDone(), 1200); // slight delay after chime
  }
 },[done]);

 function start(){
  setRemaining(duration*60);
  setRunning(true);
  setDone(false);
  if(onStart) onStart(duration);
 }
 function pause(){setRunning(false);clearInterval(intervalRef.current);}
 function resume(){setRunning(true);}
 function reset(){clearInterval(intervalRef.current);setRunning(false);setRemaining(null);setDone(false);}

 const pct = remaining!==null ? (remaining/(duration*60))*100 : 100;
 const mins = remaining!==null ? Math.floor(remaining/60) : duration;
 const secs = remaining!==null ? remaining%60 : 0;
 const timeStr = `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
 const urgentColor = pct<=10?"#E05577":pct<=25?TA:"#5DC1DB";
 const trackColor = pct<=10?"#2A0A0A":pct<=25?"#1E1400":BP;
 const circumference = 2*Math.PI*54;
 const strokeDash = circumference*(1-pct/100);

 return (
  <div style={{...s.bgBd8,...s.br10,padding:"20px",marginBottom:"18px"}}>
   <div style={{...s.fsb,...s.mb16,flexWrap:"wrap",gap:"10px"}}>
    <div style={{fontSize:"0.8rem",color:"var(--border-2)",letterSpacing:"0.15em",textTransform:"uppercase"}}>Sales Block Timer</div>
    <div style={{display:"flex",...s.g4,flexWrap:"wrap"}}>
     {PRESETS.map(p=>(
      <button key={p} onClick={()=>{setDuration(p);reset();setRemaining(null);}}
       style={{...s.smallTab,...(duration===p&&!custom?s.smallTabActive:{}),fontSize:"0.8rem",padding:"4px 10px"}}>
       {p}m
      </button>
     ))}
     <input
      type="number" min="1" max="480" placeholder="custom"
      value={custom}
      onChange={e=>{setCustom(e.target.value);if(parseInt(e.target.value)>0){setDuration(parseInt(e.target.value));reset();}}}
      style={{background:BG0,...s.bd1,color:TM,width:"64px",padding:"4px 8px",borderRadius:"6px",fontSize:"0.8rem",fontFamily:F,textAlign:"center"}}
     />
    </div>
   </div>

   <div style={{...s.fac,gap:"28px",flexWrap:"wrap"}}>
    {/* Circular progress */}
    <div style={{position:"relative",flexShrink:0}}>
     <svg width="128" height="128" style={{transform:"rotate(-90deg)"}}>
      <circle cx="64" cy="64" r="54" fill="none" stroke={BG3} strokeWidth="6"/>
      <circle cx="64" cy="64" r="54" fill="none"
       stroke={urgentColor} strokeWidth="6"
       strokeDasharray={circumference}
       strokeDashoffset={strokeDash}
       strokeLinecap="round"
       style={{transition:"stroke-dashoffset 1s linear,stroke 0.5s"}}
      />
     </svg>
     <div style={{position:"absolute",inset:0,...s.fdc,alignItems:"center",justifyContent:"center"}}>
      <div style={{fontSize:"1.6rem",fontWeight:"bold",color:done?"#E05577":urgentColor,fontFamily:F,letterSpacing:"0.02em",transition:"color 0.5s",lineHeight:1}}>
       {done?"DONE":timeStr}
      </div>
      {!done&&remaining!==null&&<div style={{fontSize:"0.9rem",color:"var(--border-2)",marginTop:"4px",letterSpacing:"0.1em"}}>{duration}m block</div>}
     </div>
    </div>

    {/* Controls + progress bar */}
    <div style={{flex:1,minWidth:"120px"}}>
     {/* Linear progress bar */}
     <div style={{background:BG2,borderRadius:"6px",height:"4px",marginBottom:"14px",...s.oh}}>
      <div style={{height:"100%",width:`${100-pct}%`,background:urgentColor,borderRadius:"6px",transition:"width 1s linear,background 0.5s"}}/>
     </div>
     {done&&<div style={{fontSize:"0.9rem",color:"#E05577",...s.mb12,letterSpacing:"0.05em"}}>⏰ Time's up!</div>}
     <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
      {remaining===null&&<button style={s.primaryBtn} onClick={()=>{haptic.medium();start();}}>▶ Start</button>}
      {remaining!==null&&!done&&running&&<button style={s.secondaryBtn} onClick={()=>{haptic.light();pause();}}>⏸ Pause</button>}
      {remaining!==null&&!done&&!running&&<button style={s.primaryBtn} onClick={()=>{haptic.medium();resume();}}>▶ Resume</button>}
      {remaining!==null&&<button style={s.secondaryBtn} onClick={reset}>↺ Reset</button>}
      {done&&<button style={s.primaryBtn} onClick={()=>{haptic.medium();start();}}>▶ Again</button>}
      <button
       onClick={()=>setMuted(m=>!m)}
       title={muted?"Unmute alarm":"Mute alarm"}
       style={{background:"none",border:"1px solid #1E1E1E",color:muted?TX:TM,padding:"8px 10px",...s.br8,...s.ptr9,lineHeight:1,marginLeft:"auto"}}>
       {muted?"🔇":"🔔"}
      </button>
     </div>
     {running&&remaining!==null&&remaining<=300&&!done&&(
      <div style={{marginTop:"10px",fontSize:"0.8rem",color:urgentColor,letterSpacing:"0.06em",animation:"pulse 1s infinite"}}>
       {remaining<=60?"⚡ Final minute!":"⚡ Wrapping up..."}
      </div>
     )}
    </div>
   </div>
  </div>
 );
}

// Collapsible tree: grouped by industry → admin leaders → nested members

function ProfileSwitcherModal({currentUser, allUsers, admins, teams, industryConfigs, pins, onSelect, onClose, onGoToSettings, onAddNew, userTracks, activeTrackId, onOpenTrackManager}) {
 // One profile per user — this modal is now primarily a Track Switcher
 // It still allows switching *user accounts* on shared devices (multi-user household) but de-emphasizes it
 const otherUsers = allUsers.filter(u => u.id !== currentUser.id);
 const F = "'DM Sans',system-ui,sans-serif";

 return (
  <div style={{...s.overlay}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
   <div style={{...s.modal, maxWidth:"min(400px,100%)", padding:0, overflow:"hidden"}} onClick={e=>e.stopPropagation()}>

    {/* Header */}
    <div style={{padding:"16px 20px 14px", borderBottom:"1px solid var(--border-1)", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
     <div>
      <div style={{fontSize:"1rem", fontWeight:"800", color:"var(--text-primary)", fontFamily:F}}>My Tracks</div>
      <div style={{fontSize:"0.73rem", color:"var(--text-muted)", marginTop:"2px"}}>Switch between different areas of your life</div>
     </div>
     <button style={s.mClose} onClick={onClose}>✕</button>
    </div>

    <div style={{padding:"16px 20px 8px", display:"flex", flexDirection:"column", gap:"6px", maxHeight:"60vh", overflowY:"auto"}}>

     {/* Track list */}
     {(userTracks||[]).map(t => {
      const cfg = getTrackConfig(t.industryKey, t.customConfig, industryConfigs);
      const isActive = t.id === activeTrackId;
      return (
       <button key={t.id} onClick={() => { if (!isActive) { onOpenTrackManager && onOpenTrackManager(t.id); onClose(); } }}
        disabled={isActive}
        style={{
         width:"100%", background: isActive ? "rgba(29,201,232,0.08)" : "var(--bg-2)",
         border: `1px solid ${isActive ? "rgba(29,201,232,0.35)" : "var(--border-1)"}`,
         borderRadius:"12px", padding:"12px 14px", display:"flex", alignItems:"center",
         gap:"12px", cursor: isActive ? "default" : "pointer",
         fontFamily:F, textAlign:"left", WebkitTapHighlightColor:"transparent",
        }}>
        <span style={{fontSize:"1.4rem", flexShrink:0}}>{t.icon || "◆"}</span>
        <div style={{flex:1, minWidth:0}}>
         <div style={{fontSize:"0.92rem", fontWeight:"700", color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{t.name}</div>
         <div style={{fontSize:"0.72rem", color:"var(--text-muted)", marginTop:"1px"}}>{cfg?.label || t.industryKey}</div>
        </div>
        {isActive
         ? <span style={{fontSize:"0.68rem", fontWeight:"800", color:"#1DC9E8", background:"rgba(29,201,232,0.15)", border:"1px solid rgba(29,201,232,0.3)", borderRadius:"6px", padding:"2px 8px", flexShrink:0, letterSpacing:"0.05em"}}>CURRENT</span>
         : <span style={{color:"var(--text-dim)", fontSize:"0.85rem", flexShrink:0}}>→</span>
        }
       </button>
      );
     })}

     {(!userTracks || userTracks.length === 0) && (
      <div style={{textAlign:"center", padding:"24px 0", color:"var(--text-muted)", fontSize:"0.88rem"}}>No tracks yet. Add one below.</div>
     )}
    </div>

    {/* Footer actions */}
    <div style={{padding:"12px 20px 20px", borderTop:"1px solid var(--border-1)", display:"flex", flexDirection:"column", gap:"8px"}}>
     <button onClick={() => { onClose(); setTimeout(() => onOpenTrackManager && onOpenTrackManager("new"), 50); }}
      style={{...s.primaryBtn, width:"100%", fontSize:"0.92rem", minHeight:"46px", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px"}}>
      + Add New Track
     </button>

     {/* Switch user — only shown if there are other profiles on this device (multi-user) */}
     {otherUsers.length > 0 && (
      <details style={{marginTop:"4px"}}>
       <summary style={{fontSize:"0.78rem", color:"var(--text-dim)", cursor:"pointer", userSelect:"none", listStyle:"none", display:"flex", alignItems:"center", gap:"6px", padding:"4px 0"}}>
        <span style={{fontSize:"0.7rem"}}>▶</span> Switch user account ({otherUsers.length} other{otherUsers.length > 1 ? "s" : ""})
       </summary>
       <div style={{marginTop:"8px", display:"flex", flexDirection:"column", gap:"5px"}}>
        {otherUsers.map(u => {
         const indCfg = DEFAULT_INDUSTRIES[u.industry] || {icon:"◆", accentColor:TS};
         return (
          <button key={u.id} onClick={() => onSelect(u)}
           style={{...s.secondaryBtn, width:"100%", display:"flex", alignItems:"center", gap:"9px", padding:"9px 12px", fontSize:"0.85rem"}}>
           <div style={{width:"26px", height:"26px", borderRadius:"50%", background:initialsColor(u.name, u.avatarColor), display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.9rem", fontWeight:"bold", color:BR, flexShrink:0}}>
            {u.name.charAt(0).toUpperCase()}
           </div>
           <span style={{flex:1, textAlign:"left", color:TP}}>{u.name}</span>
           <span style={{fontSize:"0.8rem", color:TM}}>{indCfg.icon}</span>
          </button>
         );
        })}
       </div>
      </details>
     )}

     <button style={{...s.secondaryBtn, width:"100%", fontSize:"0.85rem", color:TS, borderColor:"var(--bg-4)"}} onClick={() => { onClose(); onGoToSettings(); }}>
      ⚙ Profile Settings
     </button>
    </div>
   </div>
  </div>
 );
}


function PinModal({user, onConfirm, onCancel}) {
 const [digits,setDigits]=useState(["","","",""]);
 const [error,setError]=useState(false);
 const [shake,setShake]=useState(false);
 const refs=[useRef(),useRef(),useRef(),useRef()];

 function handleDigit(i,val){
  if(!/^[0-9]?$/.test(val))return;
  const next=[...digits];next[i]=val;setDigits(next);setError(false);
  if(val&&i<3)refs[i+1].current?.focus();
  if(i===3&&val){
   const pin=next.join("");
   onConfirm(pin).then(ok=>{
    if(!ok){setError(true);setShake(true);setDigits(["","","",""]);setTimeout(()=>{setShake(false);refs[0].current?.focus();},500);}
   });
  }
 }
 function handleKey(i,e){
  if(e.key==="Backspace"&&!digits[i]&&i>0){refs[i-1].current?.focus();}
 }

 return (
  <div style={s.overlay}>
   <div style={{...s.modal,maxWidth:"min(320px,100%)"}}>
    <div style={s.mHead}>
     <span style={s.mTitle}>Enter PIN — {user.name}</span>
     <button style={s.mClose} onClick={onCancel}>✕</button>
    </div>
    <div style={{...s.mBody,alignItems:"center",padding:"28px 20px"}}>
     <div style={{fontSize:"0.9rem",color:TD,marginBottom:"20px",letterSpacing:"0.06em"}}>
      {DEFAULT_INDUSTRIES[user.industry]?.icon} This profile is PIN-protected
     </div>
     <div style={{display:"flex",...s.g12,...s.mb16,animation:shake?"shake 0.4s":"none"}}>
      {digits.map((d,i)=>(
       <input key={i} ref={refs[i]} type="password" inputMode="numeric" maxLength={1}
        value={d} autoFocus={i===0}
        style={{...s.pinDigit,borderColor:error?"#E05577":d?TA:"var(--border-2)",color:error?"#E05577":TP}}
        onChange={e=>handleDigit(i,e.target.value)}
        onKeyDown={e=>handleKey(i,e)}/>
      ))}
     </div>
     {error&&<div style={{fontSize:"0.95rem",color:"#E05577",letterSpacing:"0.05em"}}>Incorrect PIN — try again</div>}
     <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
   </div>
  </div>
 );
}

// ── TrackManagerModal — create / switch / delete tracks ───────────────
// ── TrackListEditor: proper component so hooks work correctly ─────────────────
function TrackListEditor({ userTracks, activeTrackId, industryConfigs, myGoals,
  onSwitch, onClose, onDeleteTrack, onSaveMetrics, onSaveGoals, onUpdateTrack, onAddNew }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [expandedTrack, setExpandedTrack] = useState(null);
 const [trackEditMetrics, setTrackEditMetrics] = useState([]);
 const [trackEditGoals, setTrackEditGoals] = useState({});
 const [trackSaved, setTrackSaved] = useState(false);
 const COLORS = ["#1DC9E8","#4ACF86","#F59E0B","#E05577","#A855F7","#84D4E8","#C084FC","#34D399"];

 function startEdit(t) {
  const cfg = getTrackConfig(t.industryKey, t.customConfig, industryConfigs);
  const metrics = (cfg?.weekdayMetrics || []).map(m => ({...m}));
  const goals = metrics.reduce((g,m) => ({...g, [m.key]: myGoals?.[m.key] ?? m.defaultGoal ?? 0}), {});
  setTrackEditMetrics(metrics);
  setTrackEditGoals(goals);
  setExpandedTrack(t.id);
  setTrackSaved(false);
 }

 function addMetric() {
  setTrackEditMetrics(ms => [...ms, {
   key: `metric_${Date.now()}`,
   label: "New Metric",
   short: "NEW",
   color: COLORS[ms.length % COLORS.length],
   keyBind: String(Math.min(ms.length + 1, 6)),
   defaultGoal: 5
  }]);
 }

 function removeMetric(i) {
  if (trackEditMetrics.length <= 1) return;
  const removed = trackEditMetrics[i];
  setTrackEditMetrics(ms => ms.filter((_,j) => j !== i));
  setTrackEditGoals(g => { const next = {...g}; delete next[removed.key]; return next; });
 }

 function saveTrackEdit(t) {
  const cfg = getTrackConfig(t.industryKey, t.customConfig, industryConfigs);
  // Build updated config with new metrics - works for all track types
  const updated = { ...cfg, weekdayMetrics: trackEditMetrics };
  if (onUpdateTrack) {
   // Save new config as customConfig on this track (overrides preset for this user)
   onUpdateTrack(t.id, updated);
  }
  // Merge new goals with existing goals (don't wipe other tracks' goals)
  if (onSaveGoals) {
   onSaveGoals({ ...myGoals, ...trackEditGoals });
  }
  setTrackSaved(true);
  setTimeout(() => { setExpandedTrack(null); setTrackSaved(false); }, 800);
 }

 const allTracks = userTracks || [];

 return (
  <div style={{ padding:"16px 20px 24px", display:"flex", flexDirection:"column", gap:"8px" }}>
   <div style={{ fontSize:"0.65rem", fontWeight:"800", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"4px" }}>My Tracks</div>
   {allTracks.map(t => {
    const isActive = t.id === activeTrackId;
    const isExpanded = expandedTrack === t.id;
    const cfg = getTrackConfig(t.industryKey, t.customConfig, industryConfigs);
    return (
     <div key={t.id} style={{ background: isActive ? "rgba(29,201,232,0.06)" : "var(--bg-2)", border: isActive ? "1px solid rgba(29,201,232,0.25)" : "1px solid var(--border-1)", borderRadius:"12px", overflow:"hidden" }}>
      {/* Header row */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"13px 16px" }}>
       <span style={{ fontSize:"1.4rem", flexShrink:0 }}>{t.icon || "◆"}</span>
       <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:"0.92rem", fontWeight:"700", color:"var(--text-primary)", display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
         {t.name}
         {isActive && <span style={{ fontSize:"0.6rem", fontWeight:"800", color:"#1DC9E8", border:"1px solid rgba(29,201,232,0.4)", borderRadius:"5px", padding:"1px 7px", letterSpacing:"0.08em" }}>ACTIVE</span>}
        </div>
        <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:"2px" }}>
         {cfg?.label || t.industryKey} · {cfg?.weekdayMetrics?.length || 0} metric{(cfg?.weekdayMetrics?.length || 0) !== 1 ? "s" : ""}
        </div>
       </div>
       <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
        {!isActive && (
         <button onClick={() => { onSwitch(t.id); onClose(); }}
          style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"5px 10px", borderRadius:"8px", fontSize:"0.75rem", cursor:"pointer", fontFamily:F, fontWeight:"600", WebkitTapHighlightColor:"transparent" }}>
          Switch
         </button>
        )}
        <button onClick={() => isExpanded ? setExpandedTrack(null) : startEdit(t)}
         style={{ background: isExpanded ? "rgba(29,201,232,0.12)" : "none", border: isExpanded ? "1px solid rgba(29,201,232,0.35)" : "1px solid var(--border-1)", color: isExpanded ? "var(--accent)" : "var(--text-muted)", padding:"5px 10px", borderRadius:"8px", fontSize:"0.75rem", cursor:"pointer", fontFamily:F, fontWeight:"700", WebkitTapHighlightColor:"transparent" }}>
         {isExpanded ? "Close" : "✏️ Edit"}
        </button>
       </div>
      </div>

      {/* Edit panel */}
      {isExpanded && (
       <div style={{ borderTop:"1px solid var(--border-1)", padding:"14px 16px", display:"flex", flexDirection:"column", gap:"10px", background:"var(--bg-1)" }}>
        <div style={{ fontSize:"0.65rem", fontWeight:"800", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em" }}>Metrics & Daily Goals</div>
        {trackEditMetrics.map((m,i) => (
         <div key={m.key||i} style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"10px", padding:"11px 13px", display:"flex", flexDirection:"column", gap:"9px" }}>
          {/* Name row */}
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
           <div style={{ width:"9px", height:"9px", borderRadius:"50%", background:m.color||"var(--accent)", flexShrink:0 }}/>
           <input
            style={{ flex:1, background:"transparent", border:"none", borderBottom:"1px solid var(--border-1)", color:"var(--text-primary)", fontFamily:F, fontSize:"0.92rem", fontWeight:"700", padding:"3px 0", outline:"none" }}
            value={m.label}
            onChange={e => setTrackEditMetrics(ms => ms.map((x,j) => j===i ? {...x, label:e.target.value} : x))}
            placeholder="Metric name"
           />
           {trackEditMetrics.length > 1 && (
            <button onClick={() => removeMetric(i)}
             style={{ background:"none", border:"none", color:"rgba(224,85,119,0.7)", fontSize:"1.1rem", cursor:"pointer", padding:"0 4px", lineHeight:1, flexShrink:0, WebkitTapHighlightColor:"transparent" }}>
             ✕
            </button>
           )}
          </div>
          {/* Short + Goal row */}
          <div style={{ display:"flex", gap:"8px" }}>
           <div style={{ flex:1 }}>
            <div style={{ fontSize:"0.6rem", color:"var(--text-dim)", marginBottom:"4px", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.07em" }}>Shorthand</div>
            <input
             style={{ width:"100%", background:"var(--bg-0)", border:"1px solid var(--border-1)", borderRadius:"7px", color:"var(--text-primary)", fontFamily:F, fontSize:"0.85rem", fontWeight:"700", padding:"6px 9px", outline:"none", boxSizing:"border-box", letterSpacing:"0.04em" }}
             value={m.short || ""}
             maxLength={6}
             onChange={e => setTrackEditMetrics(ms => ms.map((x,j) => j===i ? {...x, short:e.target.value.slice(0,6).toUpperCase()} : x))}
             placeholder="e.g. CALLS"
            />
           </div>
           <div style={{ flex:1 }}>
            <div style={{ fontSize:"0.6rem", color:"var(--text-dim)", marginBottom:"4px", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.07em" }}>Daily Goal</div>
            <input type="number" min="0" max="9999"
             style={{ width:"100%", background:"var(--bg-0)", border:"1px solid var(--border-1)", borderRadius:"7px", color:"var(--text-primary)", fontFamily:F, fontSize:"0.92rem", fontWeight:"800", padding:"6px 9px", outline:"none", boxSizing:"border-box" }}
             value={trackEditGoals[m.key] ?? m.defaultGoal ?? 0}
             onChange={e => setTrackEditGoals(g => ({...g, [m.key]: Math.max(0, parseInt(e.target.value)||0)}))}
            />
           </div>
          </div>
         </div>
        ))}
        {/* Add metric */}
        <button onClick={addMetric}
         style={{ background:"none", border:"1px dashed rgba(29,201,232,0.3)", color:"var(--accent)", padding:"10px", borderRadius:"10px", fontSize:"0.82rem", cursor:"pointer", fontFamily:F, fontWeight:"700", textAlign:"center", WebkitTapHighlightColor:"transparent" }}>
         + Add Metric
        </button>
        {/* Save / Remove row */}
        <div style={{ display:"flex", gap:"8px" }}>
         {allTracks.length > 1 && (
          <button onClick={() => { if(window.confirm(`Remove "${t.name}"? Your logged data stays, but this track will be gone.`)) { onDeleteTrack(t.id); setExpandedTrack(null); if(t.id===activeTrackId) onClose(); }}}
           style={{ flex:1, background:"none", border:"1px solid rgba(224,85,119,0.3)", color:"rgba(224,85,119,0.75)", padding:"10px", borderRadius:"10px", fontSize:"0.82rem", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
           🗑 Remove
          </button>
         )}
         <button onClick={() => saveTrackEdit(t)}
          style={{ flex:2, background: trackSaved ? "rgba(74,207,134,0.12)" : "var(--accent)", color: trackSaved ? "#4ACF86" : "#000", border: trackSaved ? "1px solid rgba(74,207,134,0.4)" : "none", padding:"10px", borderRadius:"10px", fontSize:"0.88rem", fontWeight:"800", cursor:"pointer", fontFamily:F, transition:"all 0.2s", WebkitTapHighlightColor:"transparent" }}>
          {trackSaved ? "✓ Saved!" : "Save Changes"}
         </button>
        </div>
       </div>
      )}
     </div>
    );
   })}
   {allTracks.length === 0 && (
    <div style={{ textAlign:"center", padding:"32px 16px", color:"var(--text-muted)", fontSize:"0.9rem" }}>No tracks yet.</div>
   )}
   <button onClick={onAddNew}
    style={{ width:"100%", marginTop:"6px", background:"var(--accent)", color:"#000", border:"none", padding:"14px", borderRadius:"12px", fontWeight:"800", fontSize:"0.9rem", cursor:"pointer", fontFamily:F, minHeight:"48px", WebkitTapHighlightColor:"transparent" }}>
    + Add New Track
   </button>
  </div>
 );
}

function TrackManagerModal({ currentUser, userTracks, activeTrackId, industryConfigs, myGoals, onSwitch, onCreateTrack, onDeleteTrack, onSaveMetrics, onSaveGoals, onClose, initialView, onUpdateTrack }) {
 const [view, setView] = useState(initialView === "create" ? "create" : "list"); // "list" | "create"
 const [step, setStep] = useState("pick"); // "pick" | "name" | "generating" | "preview"
 const [selectedPreset, setSelectedPreset] = useState(null);
 const [trackName, setTrackName] = useState("");
 const [trackDesc, setTrackDesc] = useState("");
 const [generatedConfig, setGeneratedConfig] = useState(null);
 const [aiError, setAiError] = useState("");
 const [editingTrackMetrics, setEditingTrackMetrics] = useState(false);
 const [editableMetrics, setEditableMetrics] = useState([]);
 const [editableGoals, setEditableGoals] = useState({});
 const F = "'DM Sans',system-ui,sans-serif";

 // Group presets by category
 const categories = ["Work","Life","Creative","Business","Custom"];
 const byCategory = {};
 for (const p of TRACK_PRESETS) {
  if (!byCategory[p.category]) byCategory[p.category] = [];
  byCategory[p.category].push(p);
 }

 async function handleGenerate() {
  if (!trackName.trim()) return;
  setStep("generating");
  setAiError("");
  const cfg = await generateTrackConfigWithAI(trackName.trim(), trackDesc.trim());
  if (cfg) {
   setGeneratedConfig(cfg);
   setStep("preview");
  } else {
   setAiError("Couldn't generate config. Try again or pick a preset.");
   setStep("name");
  }
 }

 function handleSelectPreset(preset) {
  if (preset.key === "custom") {
   setSelectedPreset(preset);
   setTrackName("");
   setTrackDesc("");
   setStep("name");
  } else {
   setSelectedPreset(preset);
   setTrackName(preset.label);
   setStep("name");
  }
 }

 function handleCreate(cfg) {
  const id = `track-${Date.now()}`;
  const track = {
   id,
   name: trackName.trim() || selectedPreset?.label || "New Track",
   industryKey: selectedPreset?.key === "custom" ? `custom-${id}` : selectedPreset?.key,
   customConfig: cfg || null,
   icon: cfg?.icon || selectedPreset?.icon || "◆",
   accentColor: cfg?.accentColor || selectedPreset?.accentColor,
   createdAt: Date.now(),
  };
  onCreateTrack(track);
  onClose();
 }

 const activeTrk = userTracks?.find(t => t.id === activeTrackId);

 return (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
   onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
   <div style={{ background:"var(--bg-1)", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:"540px", maxHeight:"88vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 -8px 40px rgba(0,0,0,0.6)", paddingBottom:"env(safe-area-inset-bottom, 0px)" }}>

    {/* Header */}
    <div style={{ padding:"16px 20px 14px", borderBottom:"1px solid var(--border-1)", display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
     {view === "create" && <button onClick={() => { setView("list"); setStep("pick"); setSelectedPreset(null); setGeneratedConfig(null); }} style={{ background:"none", border:"none", color:"var(--text-dim)", fontSize:"1.1rem", cursor:"pointer", padding:"2px", fontFamily:F }}>←</button>}
     <div style={{ flex:1 }}>
      <div style={{ fontSize:"1rem", fontWeight:"800", color:"var(--text-primary)", fontFamily:F }}>
       {view === "list" ? "My Tracks" : step === "pick" ? "Choose a Track Type" : step === "generating" ? "Building your Track…" : step === "preview" ? "Preview Track" : "Name your Track"}
      </div>
      {view === "list" && <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginTop:"2px" }}>Switch between different areas of your life</div>}
     </div>
     <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text-dim)", fontSize:"1.3rem", cursor:"pointer", padding:"2px 6px", lineHeight:1, fontFamily:F }}>✕</button>
    </div>

    <div style={{ overflowY:"auto", WebkitOverflowScrolling:"touch", flex:1 }}>

     {/* ── LIST VIEW ── */}
     {view === "list" && (
      <TrackListEditor
       userTracks={userTracks}
       activeTrackId={activeTrackId}
       industryConfigs={industryConfigs}
       myGoals={myGoals}
       onSwitch={onSwitch}
       onClose={onClose}
       onDeleteTrack={onDeleteTrack}
       onSaveMetrics={onSaveMetrics}
       onSaveGoals={onSaveGoals}
       onUpdateTrack={onUpdateTrack}
       onAddNew={() => setView("create")}
      />
     )}

     {/* ── CREATE — STEP: PICK ── */}
     {view === "create" && step === "pick" && (
      <div style={{ padding:"16px 20px 24px" }}>
       {categories.filter(c => byCategory[c]).map(cat => (
        <div key={cat} style={{ marginBottom:"20px" }}>
         <div style={{ fontSize:"0.68rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"10px" }}>{cat}</div>
         <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:"7px" }}>
          {byCategory[cat].map(preset => (
           <button key={preset.key} onClick={() => handleSelectPreset(preset)}
            style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"12px", padding:"12px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", fontFamily:F, WebkitTapHighlightColor:"transparent", transition:"border-color 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(29,201,232,0.4)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border-1)"}>
            <span style={{ fontSize:"1.5rem" }}>{preset.icon}</span>
            <span style={{ fontSize:"0.72rem", color:"var(--text-muted)", fontWeight:"600", textAlign:"center", lineHeight:1.3 }}>{preset.label}</span>
           </button>
          ))}
         </div>
        </div>
       ))}
      </div>
     )}

     {/* ── CREATE — STEP: NAME ── */}
     {view === "create" && step === "name" && (
      <div style={{ padding:"20px" }}>
       <div style={{ textAlign:"center", fontSize:"2.5rem", marginBottom:"12px" }}>{selectedPreset?.icon}</div>
       <div style={{ fontSize:"0.72rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>Track Name</div>
       <input value={trackName} onChange={e=>setTrackName(e.target.value)}
        placeholder={selectedPreset?.key === "custom" ? "e.g. My Fitness Journey" : selectedPreset?.label}
        autoFocus
        style={{ width:"100%", background:"var(--bg-2)", border:"1px solid var(--border-1)", color:"var(--text-primary)", padding:"12px 14px", borderRadius:"10px", fontSize:"1rem", fontFamily:F, outline:"none", boxSizing:"border-box", marginBottom:"16px" }}/>

       {selectedPreset?.key === "custom" && <>
        <div style={{ fontSize:"0.72rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>
         Describe what you want to track <span style={{ color:"var(--text-dim)", fontWeight:"400", textTransform:"none" }}>(helps AI pick the right metrics)</span>
        </div>
        <textarea value={trackDesc} onChange={e=>setTrackDesc(e.target.value)}
         placeholder={`Tell AI what matters to you. Examples:\n- I run 5 days/week and want to track mileage, pace, and sleep\n- I want to log daily calories, water intake, and workouts\n- Track my screen time, books read, and meditation sessions\n\nThe more specific, the better your metrics will be.`}
         rows={4}
         style={{ width:"100%", background:"var(--bg-2)", border:"1px solid var(--border-1)", color:"var(--text-primary)", padding:"11px 14px", borderRadius:"10px", fontSize:"0.88rem", fontFamily:F, outline:"none", boxSizing:"border-box", resize:"vertical", lineHeight:1.55, marginBottom:"16px" }}/>
        {aiError && <div style={{ fontSize:"0.82rem", color:"#E05577", marginBottom:"12px" }}>{aiError}</div>}
        <button onClick={handleGenerate} disabled={!trackName.trim()}
         style={{ width:"100%", background:"var(--accent)", color:"#000", border:"none", padding:"13px", borderRadius:"12px", fontWeight:"800", fontSize:"0.92rem", cursor:"pointer", fontFamily:F, opacity:trackName.trim()?1:0.4, marginBottom:"8px" }}>
         ✨ Generate metrics with AI
        </button>
        <button onClick={() => handleCreate(null)}
         style={{ width:"100%", background:"none", border:"1px solid var(--border-1)", color:"var(--text-secondary)", padding:"11px", borderRadius:"12px", fontSize:"0.85rem", cursor:"pointer", fontFamily:F }}>
         Skip — use generic metrics
        </button>
       </>}

       {selectedPreset?.key !== "custom" && <>
        <div style={{ fontSize:"0.72rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>
         Personalize with AI <span style={{ color:"var(--text-dim)", fontWeight:"400", textTransform:"none" }}>(optional — helps AI tune your metrics)</span>
        </div>
        <textarea value={trackDesc} onChange={e=>setTrackDesc(e.target.value)}
         placeholder={`Describe what you want to track. Examples:\n- Daily calls, appointments set, and revenue closed\n- Outbound touches: dials, emails, LinkedIn DMs\n- Workouts, nutrition logs, and sleep hours\n- Practice sessions, pages written, or hours studied`}
         rows={4}
         style={{ width:"100%", background:"var(--bg-2)", border:"1px solid var(--border-1)", color:"var(--text-primary)", padding:"11px 14px", borderRadius:"10px", fontSize:"0.88rem", fontFamily:F, outline:"none", boxSizing:"border-box", resize:"vertical", lineHeight:1.55, marginBottom:"12px" }}/>
        {trackDesc.trim() ? (
         <>
          <button onClick={handleGenerate} disabled={!trackName.trim()}
           style={{ width:"100%", background:"var(--accent)", color:"#000", border:"none", padding:"13px", borderRadius:"12px", fontWeight:"800", fontSize:"0.92rem", cursor:"pointer", fontFamily:F, opacity:trackName.trim()?1:0.4, marginBottom:"8px" }}>
           ✨ Generate tailored metrics with AI
          </button>
          <button onClick={() => handleCreate(null)}
           style={{ width:"100%", background:"none", border:"1px solid var(--border-1)", color:"var(--text-secondary)", padding:"11px", borderRadius:"12px", fontSize:"0.85rem", cursor:"pointer", fontFamily:F }}>
           Use default metrics instead
          </button>
         </>
        ) : (
         <button onClick={() => handleCreate(null)} disabled={!trackName.trim()}
          style={{ width:"100%", background:"var(--accent)", color:"#000", border:"none", padding:"13px", borderRadius:"12px", fontWeight:"800", fontSize:"0.92rem", cursor:"pointer", fontFamily:F, opacity:trackName.trim()?1:0.4 }}>
          Create Track →
         </button>
        )}
       </>}
      </div>
     )}

     {/* ── CREATE — STEP: GENERATING ── */}
     {view === "create" && step === "generating" && (
      <div style={{ padding:"48px 20px", textAlign:"center" }}>
       <div style={{ fontSize:"2.5rem", marginBottom:"16px", animation:"pulse 1.5s infinite" }}>✨</div>
       <div style={{ fontSize:"0.95rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F, marginBottom:"8px" }}>Building your Track…</div>
       <div style={{ fontSize:"0.82rem", color:"var(--text-muted)" }}>AI is picking the best metrics for {trackName}</div>
      </div>
     )}

     {/* ── CREATE — STEP: PREVIEW ── */}
     {view === "create" && step === "preview" && generatedConfig && (
      <div style={{ padding:"20px" }}>
       <div style={{ textAlign:"center", marginBottom:"16px" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:"6px" }}>{generatedConfig.icon}</div>
        <div style={{ fontSize:"1.1rem", fontWeight:"800", color:"var(--text-primary)", fontFamily:F }}>{trackName}</div>
        <div style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>{generatedConfig.label}</div>
       </div>
       <div style={{ fontSize:"0.68rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"10px" }}>Daily metrics</div>
       <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"20px" }}>
        {(generatedConfig.weekdayMetrics||[]).map((m,i) => (
         <div key={m.key} style={{ background:"var(--bg-2)", borderRadius:"8px", padding:"10px 13px", display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:m.color||"var(--accent)", flexShrink:0 }}/>
          <div style={{ flex:1, fontSize:"0.88rem", color:"var(--text-primary)", fontWeight:"600", fontFamily:F }}>{m.label}</div>
          <div style={{ fontSize:"0.75rem", color:"var(--text-dim)" }}>Goal: {m.defaultGoal}/day</div>
         </div>
        ))}
       </div>
       <button onClick={() => handleCreate(generatedConfig)}
        style={{ width:"100%", background:"var(--accent)", color:"#000", border:"none", padding:"13px", borderRadius:"12px", fontWeight:"800", fontSize:"0.95rem", cursor:"pointer", fontFamily:F, marginBottom:"8px" }}>
        Create this Track ✓
       </button>
       <button onClick={() => { setStep("name"); setGeneratedConfig(null); }}
        style={{ width:"100%", background:"none", border:"1px solid var(--border-1)", color:"var(--text-secondary)", padding:"11px", borderRadius:"12px", fontSize:"0.85rem", cursor:"pointer", fontFamily:F }}>
        ← Try again
       </button>
      </div>
     )}

    </div>
   </div>
  </div>
 );
}

// ── IndustryPicker ────────────────────────────────────────────────────────
// A scrollable card list of all preset industries + a "Custom / Other" option.
// Props: value (key), onChange (key=>void), industryConfigs (optional, for org custom keys),
//        showCustomEntry (bool), customName, onCustomNameChange, customDesc, onCustomDescChange
function ReflectionsJournal({ userId }) {
 const [reflections, setReflections] = React.useState([]);
 const [loading, setLoading] = React.useState(true);
 const RATING_EMOJI = ["","😓","😐","🙂","😊","🔥"];
 const RATING_LABEL = ["","Rough","Okay","Solid","Strong","Crushed it"];

 React.useEffect(() => {
  if (!userId) return;
  // Load last 12 weeks of reflections
  const weeks = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
   const d = new Date(now);
   d.setDate(d.getDate() - (i * 7));
   weeks.push(weekKey(d.toISOString().slice(0,10)));
  }
  Promise.all(weeks.map(wk => loadWeeklyReflection(userId, wk).then(r => r ? {...r, wk} : null)))
   .then(results => {
    setReflections(results.filter(Boolean).sort((a,b) => (b.ts||0) - (a.ts||0)));
    setLoading(false);
   });
 }, [userId]);

 if (loading) return <div style={{padding:"20px",textAlign:"center",color:"var(--text-dim)",fontSize:"0.9rem"}}>Loading...</div>;

 if (reflections.length === 0) return (
  <div style={{padding:"20px 4px",textAlign:"center"}}>
   <div style={{fontSize:"2rem",marginBottom:"8px"}}>📝</div>
   <div style={{fontSize:"0.9rem",color:"var(--text-muted)",fontFamily:F}}>No reflections yet.</div>
   <div style={{fontSize:"0.8rem",color:"var(--text-dim)",marginTop:"4px"}}>Your weekly reflections will appear here.</div>
  </div>
 );

 return (
  <div style={{display:"flex",flexDirection:"column",gap:"10px",padding:"4px 0"}}>
   {reflections.map(r => {
    const d = new Date(r.wk + "-01");
    const label = r.wk; // weekKey format like "2026-W08"
    return (
     <div key={r.wk} style={{background:"var(--bg-3)",borderRadius:"12px",padding:"14px 16px",border:"1px solid var(--border-1)"}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
       <span style={{fontSize:"1.4rem"}}>{RATING_EMOJI[r.rating]||"📝"}</span>
       <div>
        <div style={{fontSize:"0.88rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F}}>{label}</div>
        <div style={{fontSize:"0.75rem",color:"var(--text-muted)"}}>{RATING_LABEL[r.rating]||""} {r.rating ? `· ${r.rating}/5` : ""}</div>
       </div>
      </div>
      {r.results&&<div style={{fontSize:"0.82rem",color:"var(--accent)",marginBottom:"5px",fontFamily:F}}>📊 {r.results}</div>}
      {r.bigWin&&<div style={{fontSize:"0.85rem",color:"var(--text-secondary)",lineHeight:1.5,marginBottom:r.wouldImprove?"6px":"0"}}>🏆 {r.bigWin}</div>}
      {r.wouldImprove&&<div style={{fontSize:"0.82rem",color:"var(--text-dim)",lineHeight:1.5,fontStyle:"italic"}}>🔒 {r.wouldImprove}</div>}
     </div>
    );
   })}
  </div>
 );
}

function ProfileSettingsModal({user, allUsers, admins, teams, industryConfigs, industryConfig, userGoals, userGoalPeriods, pins, isSuperAdmin,
 onRename, onChangeIndustry, onSaveGoals, onSaveMetrics, onSetPin, onRemovePin,
 onSwitch, onAddNew, onDelete, onClose, onSendFeedback, myData, myFreezes}) {

 const [tab,setTab]=useState("profile");
 const [feedbackText,setFeedbackText]=useState("");
 const [feedbackSent,setFeedbackSent]=useState(false);
 const [feedbackSending,setFeedbackSending]=useState(false);
 const [firstName,setFirstName]=useState(()=>user.name.trim().includes(" ")?user.name.trim().split(" ")[0]:user.name.trim());
 const [lastName,setLastName]=useState(()=>{const p=user.name.trim().split(" ");return p.length>1?p.slice(1).join(" "):"";});
 const name=(firstName.trim()+" "+lastName.trim()).trim();
 const [industry,setIndustry]=useState(user.industry);
 const [confirmDelete,setConfirmDelete]=useState(null);

 const metrics=industryConfig.weekdayMetrics;
 const [editableMetrics,setEditableMetrics]=useState(()=>metrics.map(m=>({...m})));
 const [editingMetrics,setEditingMetrics]=useState(false);
 const [goals,setGoals]=useState(()=>{
  const g={};
  for(const m of metrics) g[m.key]=(userGoals&&userGoals[m.key]!=null)?userGoals[m.key]:m.defaultGoal;
  return g;
 });
 const [goalPeriods,setGoalPeriods]=useState(()=>({...(userGoalPeriods||{})}));

 const hasPin=!!pins[user.id];
 const [pinMode,setPinMode]=useState(null); // "set" | "change" | "remove"
 const [pinStep,setPinStep]=useState("enter"); // "enter" | "confirm"
 const [pin1,setPin1]=useState("");
 const [pin2,setPin2]=useState("");
 const [currentPin,setCurrentPin]=useState("");
 const [pinError,setPinError]=useState("");

 function handlePinSave(){
  if(pinMode==="remove"){
   if(currentPin!==pins[user.id]){setPinError("Current PIN incorrect");return;}
   onRemovePin();setPinMode(null);setPinError("");setCurrentPin("");
   return;
  }
  if(pinStep==="enter"){
   if(pin1.length!==4){setPinError("PIN must be 4 digits");return;}
   setPinStep("confirm");setPinError("");return;
  }
  if(pin1!==pin2){setPinError("PINs don't match — try again");setPin2("");return;}
  if(pinMode==="change"&&currentPin!==pins[user.id]){setPinError("Current PIN incorrect");return;}
  onSetPin(pin1);setPinMode(null);setPinStep("enter");setPin1("");setPin2("");setCurrentPin("");setPinError("");
 }

 const [adding,setAdding]=useState(false);
 const [newName,setNewName]=useState("");
 const [newInd,setNewInd]=useState("freight");
 const [newPin,setNewPin]=useState("");
 const isDupe=adding&&allUsers.some(u=>u.name.trim().toLowerCase()===newName.trim().toLowerCase());
 const invalidNewPin=newPin.length>0&&newPin.length!==4;

 const nameChanged=name.trim()&&name.trim()!==user.name&&firstName.trim().length>0&&lastName.trim().length>0;
 const indChanged=industry!==user.industry;

 return (
  <div style={s.overlay}>
   <div style={{...s.modal,maxWidth:"min(520px,100%)",maxHeight:"85dvh"}}>
    <div style={s.mHead}>
     <span style={s.mTitle}>⚙ Profile Settings — {user.name}</span>
     <button style={s.mClose} onClick={onClose}>✕</button>
    </div>

    {/* Tabs */}
    <div style={{display:"flex",...s.bbBd,background:BG0}}>
     {[["profile","👤 Profile"],["goals","🎯 Goals"],["pin","🔒 PIN"],["users","👥 Users"],["reflections","📝 Journal"],["notifications","🔔 Notifications"],["feedback","💬 Feedback"]].map(([k,l])=>(
      <button key={k} style={{...s.settingsTab,...(tab===k?s.settingsTabActive:{})}} onClick={()=>setTab(k)}>{l}</button>
     ))}
    </div>

    <div style={{...s.mBody,maxHeight:"min(60dvh,60vh)",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

     {/* ── PROFILE TAB ── */}
     {tab==="profile"&&<>
      <div style={s.mHint}>Display name</div>
      <div style={s.fg8}>
       <input style={{...s.nameInput,flex:1}} placeholder="First name" value={firstName}
        onChange={e=>setFirstName(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&nameChanged&&onRename(name)}/>
       <input style={{...s.nameInput,flex:1,borderColor:firstName.trim()&&!lastName.trim()?"#2A1A08":"var(--bg-4)"}} placeholder="Last name *" value={lastName}
        onChange={e=>setLastName(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&nameChanged&&onRename(name)}/>
      </div>
      {firstName.trim()&&!lastName.trim()&&<div style={s.x9}>Last name required to save.</div>}

      <div style={s.mHint}>Industry</div>
      <IndustryPicker
       value={industry}
       onChange={k => setIndustry(k)}
       industryConfigs={industryConfigs}
       showCustomEntry={false}
      />
      {indChanged&&<div style={s.x9}>⚠ Changing industry will reset your daily metric goals to the new defaults.</div>}

      <div style={s.mActions}>
       <button style={s.secondaryBtn} onClick={onClose}>Cancel</button>
       <button style={{...s.primaryBtn,opacity:(nameChanged||indChanged)?1:0.4}}
        disabled={!nameChanged&&!indChanged}
        onClick={()=>{
         if(nameChanged)onRename(name.trim());
         if(indChanged)onChangeIndustry(industry);
        }}>Save Changes</button>
      </div>
     </>}

     {/* ── GOALS TAB ── */}
     {tab==="goals"&&<>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
       <p style={{...s.mHint,margin:0}}>Daily targets driving goal % on cards and leaderboard.</p>
       <button onClick={()=>setEditingMetrics(v=>!v)} style={{background:"none",border:"1px solid var(--border-1)",borderRadius:"8px",color:"var(--accent)",fontSize:"0.75rem",fontWeight:"700",padding:"4px 10px",cursor:"pointer",fontFamily:F,flexShrink:0,whiteSpace:"nowrap",marginLeft:"8px"}}>
        {editingMetrics ? "✓ Done" : "✏️ Edit metrics"}
       </button>
      </div>
      {editingMetrics ? (<>
       <p style={{...s.mHint,marginTop:0}}>Edit metric names and shorthands. Shorthands appear on leaderboard columns.</p>
       <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"12px"}}>
        {editableMetrics.map((m,i)=>(
         <div key={m.key} style={{background:"var(--bg-0)",border:"1px solid var(--border-1)",borderRadius:"10px",padding:"12px 14px",display:"flex",flexDirection:"column",gap:"8px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
           <div style={{width:"10px",height:"10px",borderRadius:"50%",background:m.color||"var(--accent)",flexShrink:0}}/>
           <input
            style={{flex:1,background:"transparent",border:"none",borderBottom:"1px solid var(--border-1)",color:TP,fontFamily:F,fontSize:"0.95rem",fontWeight:"600",padding:"2px 0",outline:"none"}}
            value={m.label}
            onChange={e=>setEditableMetrics(ms=>ms.map((x,j)=>j===i?{...x,label:e.target.value}:x))}
            placeholder="Metric name"
           />
          </div>
          <div style={{display:"flex",gap:"8px",alignItems:"flex-end"}}>
           <div style={{flex:1}}>
            <div style={{fontSize:"0.68rem",color:TD,marginBottom:"3px",letterSpacing:"0.06em",fontWeight:"700"}}>SHORT LABEL</div>
            <input
             style={{width:"100%",background:"var(--bg-2)",border:"1px solid var(--border-1)",borderRadius:"6px",color:TM,fontFamily:F,fontSize:"0.82rem",padding:"5px 8px",outline:"none",boxSizing:"border-box"}}
             value={m.short}
             onChange={e=>setEditableMetrics(ms=>ms.map((x,j)=>j===i?{...x,short:e.target.value.slice(0,8)}:x))}
             placeholder="4-6 chars"
             maxLength={8}
            />
           </div>
           <div style={{flex:1}}>
            <div style={{fontSize:"0.68rem",color:TD,marginBottom:"3px",letterSpacing:"0.06em",fontWeight:"700"}}>DAILY GOAL</div>
            <input
             type="number" min="0" max="9999"
             style={{width:"100%",background:"var(--bg-2)",border:"1px solid var(--border-1)",borderRadius:"6px",color:TP,fontFamily:F,fontSize:"0.9rem",fontWeight:"700",padding:"5px 8px",outline:"none",boxSizing:"border-box"}}
             value={m.defaultGoal}
             onChange={e=>setEditableMetrics(ms=>ms.map((x,j)=>j===i?{...x,defaultGoal:Math.max(0,parseInt(e.target.value)||0)}:x))}
            />
           </div>
          </div>
         </div>
        ))}
       </div>
       <div style={s.mActions}>
        <button style={s.secondaryBtn} onClick={()=>{setEditableMetrics(metrics.map(m=>({...m})));setEditingMetrics(false);}}>Cancel</button>
        <button style={s.primaryBtn} onClick={()=>{if(onSaveMetrics)onSaveMetrics(editableMetrics);setEditingMetrics(false);}}>Save Metrics</button>
       </div>
      </>) : (<>
       {metrics.map(m=>{
        const period = goalPeriods[m.key] || "daily";
        const periodLabel = { daily:"/ day", weekly:"/ wk", monthly:"/ mo", annual:"/ yr" }[period];
        return (
        <div key={m.key} style={{display:"flex",flexDirection:"column",gap:"6px",padding:"10px 0",borderBottom:"1px solid var(--border-1)"}}>
         <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{...s.x2,background:m.color||"var(--accent)"}}/>
          <div style={{...s.editLabel,flex:1}}>{m.label}</div>
          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
           <input style={s.x5} type="number" min="0"
            value={goals[m.key]??0}
            onChange={e=>{const n=parseInt(e.target.value);if(!isNaN(n)&&n>=0)setGoals(g=>({...g,[m.key]:n}));}}/>
           <span style={{...s.dim8,minWidth:"28px"}}>{periodLabel}</span>
          </div>
         </div>
         <div style={{display:"flex",gap:"4px",paddingLeft:"18px"}}>
          {["daily","weekly","monthly","annual"].map(p=>(
           <button key={p} onClick={()=>setGoalPeriods(gp=>({...gp,[m.key]:p}))}
            style={{fontSize:"0.6rem",fontWeight:period===p?"800":"500",padding:"2px 7px",borderRadius:"5px",border:`1px solid ${period===p?"rgba(29,201,232,0.5)":"var(--border-1)"}`,background:period===p?"rgba(29,201,232,0.1)":"transparent",color:period===p?"var(--accent)":"var(--text-muted)",cursor:"pointer",fontFamily:F,textTransform:"capitalize",WebkitTapHighlightColor:"transparent"}}>
            {p}
           </button>
          ))}
         </div>
        </div>
        );
       })}
       <div style={s.mActions}>
        <button style={s.secondaryBtn} onClick={onClose}>Cancel</button>
        <button style={s.primaryBtn} onClick={()=>onSaveGoals(goals,null,null,goalPeriods)}>Save Goals</button>
       </div>
      </>)}
     </>}

     {/* ── PIN TAB ── */}
     {tab==="pin"&&<>
      <p style={s.mHint}>
       {hasPin
        ? "Your profile has a PIN. Anyone switching to your profile will need to enter it. Super admin can always bypass."
        : "No PIN set. Add one to protect your profile when others switch users."}
      </p>

      {!pinMode&&(
       <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        {!hasPin&&<button style={{...s.primaryBtn}} onClick={()=>{setPinMode("set");setPinStep("enter");}}>Set PIN</button>}
        {hasPin&&<button style={{...s.secondaryBtn}} onClick={()=>{setPinMode("change");setPinStep("enter");}}>Change PIN</button>}
        {hasPin&&<button style={{...s.secondaryBtn,color:"#E05577",borderColor:BD1}} onClick={()=>setPinMode("remove")}>Remove PIN</button>}
       </div>
      )}

      {pinMode&&<>
       <div style={{...s.bgBd8,...s.br8,padding:"16px",...s.fdc,gap:"10px"}}>
        <div style={{fontSize:"0.95rem",color:TA,letterSpacing:"0.1em",textTransform:"uppercase"}}>
         {pinMode==="set"?"Set New PIN":pinMode==="change"?"Change PIN":"Remove PIN"}
        </div>

        {(pinMode==="change"||pinMode==="remove")&&(
         <div>
          <div style={s.mHint}>Current PIN</div>
          <input style={s.x3}
           type="password" inputMode="numeric" maxLength={4} placeholder="••••"
           value={currentPin} onChange={e=>{if(/^[0-9]{0,4}$/.test(e.target.value))setCurrentPin(e.target.value);}}/>
         </div>
        )}

        {pinMode!=="remove"&&<>
         {pinStep==="enter"&&(
          <div>
           <div style={s.mHint}>New PIN (4 digits)</div>
           <input style={s.x3}
            type="password" inputMode="numeric" maxLength={4} placeholder="••••" autoFocus
            value={pin1} onChange={e=>{if(/^[0-9]{0,4}$/.test(e.target.value))setPin1(e.target.value);}}
            onKeyDown={e=>e.key==="Enter"&&handlePinSave()}/>
          </div>
         )}
         {pinStep==="confirm"&&(
          <div>
           <div style={s.mHint}>Confirm new PIN</div>
           <input style={s.x3}
            type="password" inputMode="numeric" maxLength={4} placeholder="••••" autoFocus
            value={pin2} onChange={e=>{if(/^[0-9]{0,4}$/.test(e.target.value))setPin2(e.target.value);}}
            onKeyDown={e=>e.key==="Enter"&&handlePinSave()}/>
          </div>
         )}
        </>}

        {pinError&&<div style={s.red95}>{pinError}</div>}

        <div style={s.mActions}>
         <button style={s.secondaryBtn} onClick={()=>{setPinMode(null);setPinStep("enter");setPin1("");setPin2("");setCurrentPin("");setPinError("");}}>Cancel</button>
         <button style={{...s.primaryBtn,...(pinMode==="remove"?{background:"#8A2A2A"}:{})}}
          onClick={handlePinSave}>
          {pinMode==="remove"?"Remove PIN":pinStep==="enter"?"Continue":"Confirm"}
         </button>
        </div>
       </div>
      </>}
     </>}

     {/* ── USERS TAB ── */}
     {tab==="users"&&<>
      {confirmDelete?(
       <>
        <div style={{...s.mHint,color:"#E05577"}}>
         Delete <strong style={{color:TP}}>{allUsers.find(u=>u.id===confirmDelete)?.name}</strong>? This permanently erases all their data.
        </div>
        <div style={s.mActions}>
         <button style={s.secondaryBtn} onClick={()=>setConfirmDelete(null)}>Cancel</button>
         <button style={{...s.primaryBtn,background:"#8A2A2A",color:"#fff"}} onClick={()=>onDelete(confirmDelete)}>Yes, Delete</button>
        </div>
       </>
      ):(
       <>
        <div style={s.mHint}>Switch to another profile or manage users.</div>
        <UserTree users={allUsers} admins={admins||[]} teams={teams||{}} onSelect={onSwitch} excludeId={user.id} isSuperAdmin={isSuperAdmin} onDelete={id=>setConfirmDelete(id)} industryConfigs={industryConfigs||{}}/>

        <div style={s.orDivider}>— add new profile —</div>
        {!adding?<button style={s.secondaryBtn} onClick={()=>setAdding(true)}>+ Add New Profile</button>
        :<>
         <input style={{...s.nameInput,borderColor:isDupe?"#3A1A1A":"var(--bg-4)"}} placeholder="Name" value={newName} autoFocus
          onChange={e=>setNewName(e.target.value)}/>
         {isDupe&&<div style={s.importErr}>Name already exists.</div>}
         <div style={s.mHint}>Industry</div>
         <IndustryPicker
          value={newInd}
          onChange={k => setNewInd(k)}
          industryConfigs={industryConfigs}
          showCustomEntry={false}
         />
         <div>
          <div style={s.mHint}>PIN (optional, 4 digits)</div>
          <input style={{...s.nameInput,letterSpacing:"0.3em",fontSize:"1.12rem",maxWidth:"140px"}}
           type="password" inputMode="numeric" maxLength={4} placeholder="••••"
           value={newPin} onChange={e=>{if(/^[0-9]{0,4}$/.test(e.target.value))setNewPin(e.target.value);}}/>
          {invalidNewPin&&<div style={s.importErr}>PIN must be exactly 4 digits.</div>}
         </div>
         <div style={s.mActions}>
          <button style={s.secondaryBtn} onClick={()=>{setAdding(false);setNewName("");setNewPin("");}}>Cancel</button>
          <button style={{...s.primaryBtn,opacity:newName.trim()&&!isDupe&&!invalidNewPin?1:0.4}}
           disabled={!newName.trim()||isDupe||invalidNewPin}
           onClick={()=>onAddNew(newName.trim(),newInd,newPin||null)}>Create Profile</button>
         </div>
        </>}
       </>
      )}
     </>}

     {/* ── REFLECTIONS JOURNAL TAB ── */}
     {tab==="reflections"&&<ReflectionsJournal userId={user.id} />}

     {/* ── FEEDBACK TAB ── */}
     {tab==="notifications"&&(
      <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:"18px"}}>
       <div style={{fontSize:"0.95rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F}}>Notifications</div>
       <div style={{fontSize:"0.82rem",color:"var(--text-muted)",lineHeight:1.6}}>
        Cadence can send notifications for key moments — streak at risk, goals hit, new messages, and your Sunday weekly digest.
       </div>
       {/* Permission status */}
       {(()=>{
        const perm = notifPermission();
        if(perm==="unsupported") return (
         <div style={{background:"var(--bg-2)",borderRadius:"10px",padding:"14px 16px",fontSize:"0.85rem",color:"var(--text-muted)"}}>
          Push notifications aren't supported in this browser.
         </div>
        );
        if(perm==="denied") return (
         <div style={{background:"rgba(244,63,94,0.08)",border:"1px solid rgba(244,63,94,0.2)",borderRadius:"10px",padding:"14px 16px"}}>
          <div style={{fontSize:"0.88rem",fontWeight:"700",color:"#F43F5E",marginBottom:"6px"}}>Notifications blocked</div>
          <div style={{fontSize:"0.8rem",color:"var(--text-muted)",lineHeight:1.5}}>You've blocked notifications for this site. To enable them, go to your browser or phone settings and allow notifications for Cadence.</div>
         </div>
        );
        if(perm==="granted") return (
         <div style={{background:"rgba(74,207,134,0.08)",border:"1px solid rgba(74,207,134,0.2)",borderRadius:"10px",padding:"14px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontSize:"1.3rem"}}>✅</span>
          <div>
           <div style={{fontSize:"0.88rem",fontWeight:"700",color:"#4ACF86",marginBottom:"3px"}}>Notifications on</div>
           <div style={{fontSize:"0.78rem",color:"var(--text-muted)"}}>You'll get notified for streaks, goals, messages, and your weekly digest.</div>
          </div>
         </div>
        );
        // perm === "default" — ask
        return (
         <div style={{background:"rgba(29,201,232,0.06)",border:"1px solid rgba(29,201,232,0.2)",borderRadius:"12px",padding:"16px 18px"}}>
          <div style={{fontSize:"0.88rem",fontWeight:"700",color:"var(--accent)",marginBottom:"6px"}}>Turn on notifications</div>
          <div style={{fontSize:"0.8rem",color:"var(--text-muted)",lineHeight:1.55,marginBottom:"14px"}}>
           Get notified when your streak is at risk, you hit your goals, someone messages you, or your Sunday digest is ready.
          </div>
          <button
           onClick={async()=>{
            const result = await requestNotifPermission();
            if(result==="granted"){
             registerServiceWorker().catch(()=>{});
             haptic.success();
            }
           }}
           style={{width:"100%",background:"var(--accent)",color:"#000",border:"none",padding:"13px",borderRadius:"12px",fontWeight:"800",fontSize:"0.9rem",cursor:"pointer",fontFamily:F}}>
           Enable notifications
          </button>
         </div>
        );
       })()}
       {/* What you'll get */}
       <div>
        <div style={{fontSize:"0.7rem",fontWeight:"800",color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"10px"}}>What you'll get</div>
        {[
         ["⚠️", "Streak at risk", "If nothing's logged by 3pm on a workday"],
         ["🎯", "Goals hit", "When you close out today's targets"],
         ["💬", "New messages", "When someone DMs you"],
         ["📅", "Weekly digest", "Sunday evening — how the week landed"],
         ["🔥", "Streak milestones", "Every 7, 14, 30, 60, 100 days"],
        ].map(([icon,title,desc])=>(
         <div key={title} style={{display:"flex",gap:"12px",paddingBottom:"12px",borderBottom:"1px solid var(--border-1)",marginBottom:"12px"}}>
          <span style={{fontSize:"1.1rem",flexShrink:0,marginTop:"1px"}}>{icon}</span>
          <div>
           <div style={{fontSize:"0.85rem",fontWeight:"700",color:"var(--text-primary)"}}>{title}</div>
           <div style={{fontSize:"0.75rem",color:"var(--text-muted)",marginTop:"2px"}}>{desc}</div>
          </div>
         </div>
        ))}
       </div>
      </div>
     )}

     {tab==="share"&&user&&(()=>{
      const _sd = myData||{};
      const _freez = myFreezes||{};
      const _streak = computeStreak(_sd, getProtectedDates(_freez));
      const _loggedDays = Object.keys(_sd).filter(d=>Object.values(_sd[d]||{}).some(v=>typeof v==='number'&&v>0));
      const _metrics = industryConfig?.weekdayMetrics||[];
      const _goals = userGoals||{};
      const _hitDays = _loggedDays.filter(d=>{
        if(!_metrics.length)return false;
        return computeGoalPct(_sd[d]||{},_metrics,_goals)>=100;
      });
      const _winRate = _loggedDays.length>0 ? Math.round((_hitDays.length/_loggedDays.length)*100) : 0;
      const _allWeekPcts = [];
      const _seenWks = new Set();
      _loggedDays.forEach(d=>{
        const wk = d.slice(0,7);
        if(_seenWks.has(wk))return;
        _seenWks.add(wk);
        const wkDays = _loggedDays.filter(x=>x.slice(0,7)===wk);
        const wkAvg = wkDays.reduce((s,x)=>s+computeGoalPct(_sd[x]||{},_metrics,_goals),0)/Math.max(1,wkDays.length);
        _allWeekPcts.push(Math.round(wkAvg));
      });
      const _bestWeek = _allWeekPcts.length>0 ? Math.max(..._allWeekPcts) : 0;
      return (
       <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:"20px"}}>
        <div style={{fontSize:"0.95rem",fontWeight:"800",color:"var(--text-primary)",fontFamily:F}}>Share Your Profile</div>
        <ShareableProfileCard
         user={user}
         streak={_streak}
         totalDays={_loggedDays.length}
         winRate={_winRate}
         bestWeekPct={_bestWeek}
         cfg={industryConfig}
         goals={_goals}
         myData={_sd}
        />
       </div>
      );
     })()}
     {tab==="feedback"&&(
      <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:"14px"}}>
       <div style={{fontSize:"0.95rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F}}>Send Feedback</div>
       <div style={{fontSize:"0.82rem",color:"var(--text-muted)",lineHeight:1.55}}>
        Spotted a bug? Have a feature idea? Love something? Let us know — your message goes directly to the admin as a DM.
       </div>
       <textarea
        value={feedbackText}
        onChange={e=>setFeedbackText(e.target.value)}
        placeholder={"What's on your mind? Bugs, feature requests, anything — we read every message."}
        rows={5}
        style={{width:"100%",background:"var(--bg-2)",border:"1px solid var(--border-1)",color:"var(--text-primary)",padding:"12px 14px",borderRadius:"10px",fontSize:"0.9rem",fontFamily:F,outline:"none",resize:"vertical",lineHeight:1.55,boxSizing:"border-box"}}
       />
       {feedbackSent ? (
        <div style={{background:"rgba(74,207,134,0.1)",border:"1px solid rgba(74,207,134,0.25)",borderRadius:"10px",padding:"14px",textAlign:"center",fontSize:"0.88rem",color:"#4ACF86",fontWeight:"700"}}>
         ✓ Feedback sent! Thank you.
        </div>
       ) : (
        <button
         disabled={!feedbackText.trim()||feedbackSending||!onSendFeedback}
         onClick={async()=>{
          if(!feedbackText.trim()||!onSendFeedback)return;
          setFeedbackSending(true);
          await onSendFeedback(feedbackText.trim());
          setFeedbackSent(true);setFeedbackSending(false);setFeedbackText("");
         }}
         style={{width:"100%",background:"var(--accent)",color:"#000",border:"none",padding:"13px",borderRadius:"12px",fontWeight:"800",fontSize:"0.9rem",cursor:"pointer",fontFamily:F,opacity:feedbackText.trim()&&!feedbackSending?1:0.45,transition:"opacity 0.15s"}}>
         {feedbackSending?"Sending…":"Send Feedback"}
        </button>
       )}
      </div>
     )}

    </div>
   </div>
  </div>
 );
}

const PROMPT_NUDGE = {
 daily:     { icon: "🌙", label: "End of day check-in" },
 weekly:    { icon: "📝", label: "Reflect on this week" },
 monthly:   { icon: "📆", label: "Month in review" },
 quarterly: { icon: "📊", label: "Quarter in review" },
 annual:    { icon: "🎯", label: "Year in review" },
};

// ── Track Presets catalog ──────────────────────────────────────────────
// These are the curated "pick a track type" options users see when creating a new track.
// industryKey maps to DEFAULT_INDUSTRIES for built-in ones; "ai-custom" triggers AI generation.
const TRACK_PRESETS = [
 { key:"freight",     icon:"🚛", label:"Freight Brokerage",     category:"Work" },
 { key:"realestate",  icon:"🏠", label:"Real Estate",           category:"Work" },
 { key:"insurance",   icon:"🛡️", label:"Insurance",             category:"Work" },
 { key:"solar",       icon:"☀️", label:"Solar Energy",          category:"Work" },
 { key:"saas",        icon:"💻", label:"SaaS / Tech",           category:"Work" },
 { key:"mortgage",    icon:"🏦", label:"Mortgage / Lending",    category:"Work" },
 { key:"recruiting",  icon:"🤝", label:"Recruiting / Staffing", category:"Work" },
 { key:"meddevice",   icon:"⚕️", label:"Medical Device / Pharma", category:"Work" },
 { key:"financial",   icon:"📈", label:"Financial Advisor",     category:"Work" },
 { key:"homeservices",icon:"🔧", label:"Home Services",         category:"Work" },
 { key:"automotive",  icon:"🚗", label:"Auto Sales",            category:"Work" },
 { key:"b2b_general", icon:"💼", label:"B2B",                   category:"Work" },
 { key:"roofing",     icon:"🏗️", label:"Roofing / Exteriors",   category:"Work" },
 { key:"smb_retail",  icon:"🛍️", label:"Retail / SMB",          category:"Work" },
 // Life & Fitness
 { key:"fitness",    icon:"💪", label:"Fitness & Health",      category:"Life" },
 { key:"nutrition",  icon:"🥗", label:"Nutrition & Wellness",  category:"Life" },
 { key:"running",    icon:"🏃", label:"Running / Endurance",   category:"Life" },
 { key:"mindfulness",icon:"🧘", label:"Mindfulness & Habits",  category:"Life" },
 // Creative & Business
 { key:"content",    icon:"🎬", label:"Content Creator",       category:"Creative" },
 { key:"writing",    icon:"✍️", label:"Writing & Publishing",  category:"Creative" },
 { key:"entrepreneurship",icon:"🚀",label:"Entrepreneurship",  category:"Business" },
 { key:"learning",   icon:"📚", label:"Learning & Skills",     category:"Business" },
 // Custom
 { key:"custom",     icon:"✦",  label:"Build my own…",         category:"Custom" },
];

// Built-in configs for Life/Creative tracks not in DEFAULT_INDUSTRIES
const BUILTIN_TRACK_CONFIGS = {
 fitness: {
  label:"Fitness & Health", icon:"💪", accentColor:"#E05577",
  weekdayMetrics:[
   {key:"workout",  label:"Workout Sessions",short:"Sessions",color:"#E05577",keyBind:"1",defaultGoal:1},
   {key:"steps",    label:"Steps",           short:"Steps",   color:"#84D4E8",keyBind:"2",defaultGoal:10000},
   {key:"water",    label:"Water (oz)",      short:"Water",   color:"#5DC1DB",keyBind:"3",defaultGoal:64},
   {key:"sleep",    label:"Sleep (hrs)",     short:"Sleep",   color:"#B07EC8",keyBind:"4",defaultGoal:8},
   {key:"calories", label:"Calories Burned", short:"Cal",     color:"#C8B97E",keyBind:"5",defaultGoal:500},
  ],
  weekendMetrics:[
   {key:"workout",  label:"Workout Sessions",short:"Sessions",color:"#E05577",keyBind:"1",defaultGoal:1},
   {key:"steps",    label:"Steps",           short:"Steps",   color:"#84D4E8",keyBind:"2",defaultGoal:8000},
  ],
  primaryGoalMetrics:["workout","steps","water","sleep"],
 },
 nutrition: {
  label:"Nutrition & Wellness", icon:"🥗", accentColor:"#4CAF7D",
  weekdayMetrics:[
   {key:"protein",  label:"Protein (g)",     short:"Protein", color:"#4CAF7D",keyBind:"1",defaultGoal:150},
   {key:"calories", label:"Calories (eaten)",short:"Cal",     color:"#84D4E8",keyBind:"2",defaultGoal:2000},
   {key:"water",    label:"Water (oz)",      short:"Water",   color:"#5DC1DB",keyBind:"3",defaultGoal:80},
   {key:"veggies",  label:"Veggie Servings", short:"Veggies", color:"#A5D4A5",keyBind:"4",defaultGoal:5},
   {key:"sugar",    label:"Sugar (g)",       short:"Sugar",   color:"#E05577",keyBind:"5",defaultGoal:25},
  ],
  weekendMetrics:[
   {key:"protein",  label:"Protein (g)",     short:"Protein", color:"#4CAF7D",keyBind:"1",defaultGoal:150},
   {key:"water",    label:"Water (oz)",      short:"Water",   color:"#5DC1DB",keyBind:"2",defaultGoal:80},
  ],
  primaryGoalMetrics:["protein","calories","water","veggies"],
 },
 running: {
  label:"Running / Endurance", icon:"🏃", accentColor:"#D4874A",
  weekdayMetrics:[
   {key:"miles",    label:"Miles Run",       short:"Miles",   color:"#D4874A",keyBind:"1",defaultGoal:5},
   {key:"pace",     label:"Pace (min/mi)",   short:"Pace",    color:"#84D4E8",keyBind:"2",defaultGoal:9},
   {key:"steps",    label:"Total Steps",     short:"Steps",   color:"#5DC1DB",keyBind:"3",defaultGoal:15000},
   {key:"strength", label:"Strength (min)",  short:"Strength",color:"#B07EC8",keyBind:"4",defaultGoal:20},
  ],
  weekendMetrics:[
   {key:"miles",    label:"Miles Run",       short:"Miles",   color:"#D4874A",keyBind:"1",defaultGoal:6},
   {key:"steps",    label:"Steps",           short:"Steps",   color:"#5DC1DB",keyBind:"2",defaultGoal:12000},
  ],
  primaryGoalMetrics:["miles","steps","strength"],
 },
 mindfulness: {
  label:"Mindfulness & Habits", icon:"🧘", accentColor:"#7B6FD8",
  weekdayMetrics:[
   {key:"meditation",label:"Meditation (min)",short:"Med",    color:"#7B6FD8",keyBind:"1",defaultGoal:10},
   {key:"journal",   label:"Journal Entry",   short:"Journal",color:"#84D4E8",keyBind:"2",defaultGoal:1},
   {key:"reading",   label:"Reading (min)",   short:"Read",   color:"#B07EC8",keyBind:"3",defaultGoal:20},
   {key:"gratitude", label:"Gratitude Items", short:"Grat",   color:"#A5D4A5",keyBind:"4",defaultGoal:3},
   {key:"screentime",label:"No-Screen (hrs)", short:"NoScr",  color:"#C8B97E",keyBind:"5",defaultGoal:2},
  ],
  weekendMetrics:[
   {key:"meditation",label:"Meditation (min)",short:"Med",    color:"#7B6FD8",keyBind:"1",defaultGoal:15},
   {key:"reading",   label:"Reading (min)",   short:"Read",   color:"#B07EC8",keyBind:"2",defaultGoal:30},
  ],
  primaryGoalMetrics:["meditation","journal","reading","gratitude"],
 },
 content: {
  label:"Content Creator", icon:"🎬", accentColor:"#E05577",
  weekdayMetrics:[
   {key:"videos",   label:"Videos Posted",   short:"Videos", color:"#E05577",keyBind:"1",defaultGoal:1},
   {key:"scripts",  label:"Scripts Written",  short:"Scripts",color:"#84D4E8",keyBind:"2",defaultGoal:2},
   {key:"outreach", label:"Collabs Pitched",  short:"Outreach",color:"#B07EC8",keyBind:"3",defaultGoal:5},
   {key:"edits",    label:"Edits Completed",  short:"Edits",  color:"#C8B97E",keyBind:"4",defaultGoal:2},
  ],
  weekendMetrics:[
   {key:"videos",   label:"Videos Posted",   short:"Videos", color:"#E05577",keyBind:"1",defaultGoal:1},
   {key:"scripts",  label:"Scripts Written",  short:"Scripts",color:"#84D4E8",keyBind:"2",defaultGoal:1},
  ],
  primaryGoalMetrics:["videos","scripts","outreach"],
 },
 writing: {
  label:"Writing & Publishing", icon:"✍️", accentColor:"#C8B97E",
  weekdayMetrics:[
   {key:"words",    label:"Words Written",    short:"Words",  color:"#C8B97E",keyBind:"1",defaultGoal:1000},
   {key:"pages",    label:"Pages Edited",     short:"Pages",  color:"#84D4E8",keyBind:"2",defaultGoal:5},
   {key:"sessions", label:"Writing Sessions", short:"Sessions",color:"#B07EC8",keyBind:"3",defaultGoal:2},
   {key:"pitches",  label:"Pitches Sent",     short:"Pitches",color:"#A5D4A5",keyBind:"4",defaultGoal:1},
  ],
  weekendMetrics:[
   {key:"words",    label:"Words Written",    short:"Words",  color:"#C8B97E",keyBind:"1",defaultGoal:500},
   {key:"sessions", label:"Writing Sessions", short:"Sessions",color:"#B07EC8",keyBind:"2",defaultGoal:1},
  ],
  primaryGoalMetrics:["words","sessions","pitches"],
 },
 entrepreneurship: {
  label:"Entrepreneurship", icon:"🚀", accentColor:"#F5C842",
  weekdayMetrics:[
   {key:"tasks",    label:"Priority Tasks Done",short:"Tasks", color:"#F5C842",keyBind:"1",defaultGoal:3},
   {key:"outreach", label:"Outreach / Networking",short:"Reach",color:"#84D4E8",keyBind:"2",defaultGoal:5},
   {key:"revenue",  label:"Revenue ($)",        short:"Rev",   color:"#A5D4A5",keyBind:"3",defaultGoal:0},
   {key:"calls",    label:"Sales / Discovery Calls",short:"Calls",color:"#B07EC8",keyBind:"4",defaultGoal:2},
  ],
  weekendMetrics:[
   {key:"tasks",    label:"Priority Tasks Done",short:"Tasks", color:"#F5C842",keyBind:"1",defaultGoal:2},
   {key:"outreach", label:"Outreach",           short:"Reach", color:"#84D4E8",keyBind:"2",defaultGoal:2},
  ],
  primaryGoalMetrics:["tasks","outreach","calls"],
 },
 learning: {
  label:"Learning & Skills", icon:"📚", accentColor:"#5DC1DB",
  weekdayMetrics:[
   {key:"study",    label:"Study Time (min)", short:"Study",  color:"#5DC1DB",keyBind:"1",defaultGoal:60},
   {key:"lessons",  label:"Lessons Completed",short:"Lessons",color:"#84D4E8",keyBind:"2",defaultGoal:3},
   {key:"practice", label:"Practice (min)",   short:"Practice",color:"#B07EC8",keyBind:"3",defaultGoal:30},
   {key:"notes",    label:"Note Pages",       short:"Notes",  color:"#C8B97E",keyBind:"4",defaultGoal:2},
  ],
  weekendMetrics:[
   {key:"study",    label:"Study Time (min)", short:"Study",  color:"#5DC1DB",keyBind:"1",defaultGoal:45},
   {key:"practice", label:"Practice (min)",   short:"Practice",color:"#B07EC8",keyBind:"2",defaultGoal:30},
  ],
  primaryGoalMetrics:["study","lessons","practice"],
 },
};

// Get the config for a track's industryKey — checks DEFAULT_INDUSTRIES, then BUILTIN_TRACK_CONFIGS, then custom
function getTrackConfig(industryKey, customConfig, orgIndustryConfigs) {
 if (customConfig) return customConfig;
 if (orgIndustryConfigs && orgIndustryConfigs[industryKey]) return orgIndustryConfigs[industryKey];
 if (BUILTIN_TRACK_CONFIGS[industryKey]) return BUILTIN_TRACK_CONFIGS[industryKey];
 if (DEFAULT_INDUSTRIES[industryKey]) return DEFAULT_INDUSTRIES[industryKey];
 return DEFAULT_INDUSTRIES.freight; // fallback
}

// AI-powered config generation for custom tracks
async function generateTrackConfigWithAI(trackName, trackDescription) {
 const METRIC_COLORS_AI = ["#1DC9E8","#84D4E8","#5DC1DB","#B07EC8","#E05577","#C8B97E","#7EC8C8","#A5D4A5","#D4A5D4","#F5C842","#D4874A"];
 const prompt = `You are helping set up a personal performance tracker. The user wants to track: "${trackName}"${trackDescription ? `. More context: "${trackDescription}"` : ""}.

Generate a JSON config object with these fields:
{
 "label": "short display name (max 3 words)",
 "icon": "single emoji that represents this",
 "accentColor": "a hex color that fits the vibe",
 "weekdayMetrics": [4-6 metrics, each: {"key":"snake_case","label":"Display Label","short":"2-5 char short","color":"hex","keyBind":"1-6","defaultGoal":number}],
 "weekendMetrics": [2-3 metrics (usually lower-stakes versions)],
 "primaryGoalMetrics": [array of 3-4 metric keys that matter most]
}

Rules:
- Metrics should be things someone can realistically count or log daily
- Goals should be ambitious but achievable (daily targets)
- Colors from this palette: ${METRIC_COLORS_AI.join(",")}
- Respond ONLY with valid JSON, no explanation, no markdown fences`;

 try {
  const data = await callAI({ model: "claude-sonnet-4-20250514", messages: [{role:"user",content:prompt}], max_tokens: 1000, call_type: "metric_gen" })
  const text = (data?.content||[]).filter(b=>b.type==="text").map(b=>b.text||"").join("").trim();
  const clean = text.replace(/```json|```/g,"").trim();
  return JSON.parse(clean);
 } catch { return null; }
}

// ────────────────────────────────────────────────────────────────────────
const JOURNAL_TEMPLATES = [
 {
  id: "daily",
  icon: "🌙",
  label: "Daily Check-in",
  desc: "Quick end-of-day debrief",
  timed: true,
  prompts: [
   { key: "done",  label: "What did I accomplish today?",   placeholder: "Big or small — what got done?" },
   { key: "best",  label: "Best moment or win",             placeholder: "Something that went well, felt good, or you're proud of." },
   { key: "hard",  label: "What was hard?",                 placeholder: "An obstacle, frustration, or thing that didn't click." },
   { key: "tmrw",  label: "Top priority tomorrow",          placeholder: "The one thing that matters most tomorrow." },
  ]
 },
 {
  id: "weekly",
  icon: "📅",
  label: "Week in Review",
  desc: "Reflect on your week's performance",
  timed: true,
  prompts: [
   { key: "wins",   label: "Results & Wins",          placeholder: "Key results, completed goals, wins big or small…" },
   { key: "needle", label: "What moved the needle?",  placeholder: "What actually moved the needle — or held you back?" },
   { key: "learn",  label: "What did you learn?",     placeholder: "A lesson, an insight, something you'd do differently…" },
   { key: "next",   label: "Focus for next week",     placeholder: "One thing. Be specific." },
  ]
 },
 {
  id: "monthly",
  icon: "📆",
  label: "Month in Review",
  desc: "Step back and see the bigger picture",
  timed: true,
  prompts: [
   { key: "wins",     label: "Biggest wins this month",        placeholder: "Results, milestones, breakthroughs…" },
   { key: "missed",   label: "Where did you fall short?",      placeholder: "Goals missed, habits broken, areas of drift." },
   { key: "pattern",  label: "What pattern do you notice?",    placeholder: "In your performance, energy, mindset — what's the thread?" },
   { key: "next",     label: "One thing to double down on",    placeholder: "What deserves more focus next month?" },
  ]
 },
 {
  id: "quarterly",
  icon: "📊",
  label: "Last 90 Days",
  desc: "90-day retrospective and reset",
  timed: true,
  prompts: [
   { key: "achieved", label: "What did you achieve this quarter?",    placeholder: "Revenue, relationships, skills, habits…" },
   { key: "gap",      label: "Biggest gap between goal and reality",  placeholder: "Be honest — where did you miss and why?" },
   { key: "insight",  label: "Most important insight",                placeholder: "The thing that changed how you think or operate." },
   { key: "q",        label: "Top 3 priorities for next quarter",     placeholder: "Be ruthlessly specific. Not 10 things — 3." },
  ]
 },
 {
  id: "annual",
  icon: "🎯",
  label: "Year in Review",
  desc: "Your full-year retrospective",
  timed: true,
  prompts: [
   { key: "proud",    label: "What am I most proud of?",             placeholder: "The win, the growth, the moment you stepped up." },
   { key: "hard",     label: "What was the hardest part of the year?", placeholder: "What tested you — and what did it reveal?" },
   { key: "learned",  label: "Most important thing I learned",       placeholder: "About your business, yourself, your industry." },
   { key: "define",   label: "One word that defines this year",      placeholder: "Growth, grind, transition, clarity, breakthrough…" },
   { key: "next",     label: "Who do I want to be next year?",       placeholder: "Not what you want to do — who you want to become." },
  ]
 },
 {
  id: "win",
  icon: "🏆",
  label: "Celebrate a Win",
  desc: "Document a specific win while it's fresh",
  prompts: [
   { key: "what", label: "What happened?",            placeholder: "Describe the win — deal closed, goal smashed, breakthrough moment…" },
   { key: "how",  label: "How did you make it happen?", placeholder: "What did you do differently? What clicked?" },
   { key: "feel", label: "How does it feel?",         placeholder: "Capture the energy. You'll want to remember this." },
   { key: "next", label: "What does this open up?",   placeholder: "What's the next level this unlocks?" },
  ]
 },
 {
  id: "growth",
  icon: "📈",
  label: "Growth & Learning",
  desc: "Identify where you can improve",
  prompts: [
   { key: "gap",    label: "Where did you fall short?",                              placeholder: "Be honest. What didn't go the way you wanted?" },
   { key: "why",    label: "What got in the way?",                                   placeholder: "Fear, distraction, lack of skill, circumstance…" },
   { key: "fix",    label: "What's the one change that would make the biggest difference?", placeholder: "Specific action, not a vague intention." },
   { key: "commit", label: "I commit to…",                                           placeholder: "Write it like a promise to yourself." },
  ]
 },
 {
  id: "intention",
  icon: "🎯",
  label: "Set an Intention",
  desc: "Get clear on what you're going after",
  prompts: [
   { key: "goal",      label: "What's the goal?",              placeholder: "Specific, measurable, time-bound." },
   { key: "why",       label: "Why does it matter?",           placeholder: "The real reason — not the surface one." },
   { key: "obstacles", label: "What could get in the way?",    placeholder: "Name your obstacles before they name you." },
   { key: "first",     label: "First step I'll take today",    placeholder: "The smallest action that starts the chain." },
  ]
 },
 {
  id: "freewrite",
  icon: "✍️",
  label: "Free Write",
  desc: "No structure — just write",
  prompts: [
   { key: "text", label: "Whatever's on your mind", placeholder: "Stream of consciousness. No editing. Just write." },
  ]
 },
 // ── Plan templates ──────────────────────────────────────────────────────
 {
  id: "day_plan",
  icon: "☀️",
  label: "Plan Today",
  desc: "Set your intentions for the day ahead",
  mode: "plan",
  prompts: [
   { key: "priority", label: "The one thing I must accomplish today", placeholder: "If nothing else gets done, this does." },
   { key: "activities", label: "Activities I'm committing to", placeholder: "Calls, meetings, outreach — be specific about numbers." },
   { key: "obstacle", label: "What might get in my way?", placeholder: "Name it now so it doesn't surprise you later." },
   { key: "end_state", label: "What does winning look like today?", placeholder: "How will you know it was a good day?" },
  ]
 },
 {
  id: "monday_plan",
  icon: "🗓️",
  label: "Plan My Week",
  desc: "Start the week with clear priorities",
  mode: "plan",
  prompts: [
   { key: "win", label: "What would make this week a win?", placeholder: "The result that matters most — be specific." },
   { key: "targets", label: "Activity targets I'm committing to", placeholder: "Calls, meetings, proposals — your weekly numbers." },
   { key: "focus", label: "My #1 focus area", placeholder: "The one project, relationship, or skill that needs the most from you." },
   { key: "obstacle", label: "What could derail me?", placeholder: "Calendar conflicts, bad habits, external pressures — name them." },
   { key: "not_doing", label: "What I'm saying no to this week", placeholder: "Protecting your time is part of the plan." },
  ]
 },
 {
  id: "goal_sprint",
  icon: "⚡",
  label: "Goal Sprint",
  desc: "Commit to a short-term target with accountability",
  mode: "plan",
  prompts: [
   { key: "goal", label: "The specific goal I'm sprinting toward", placeholder: "Measurable. Time-bound. No vague intentions." },
   { key: "deadline", label: "My deadline", placeholder: "End of day? This week? This month?" },
   { key: "actions", label: "Exact actions I'll take", placeholder: "Step 1, Step 2, Step 3 — the actual work." },
   { key: "accountability", label: "How I'll hold myself accountable", placeholder: "Who else knows? How will you check in with yourself?" },
  ]
 },
 {
  id: "month_plan",
  icon: "📆",
  label: "Plan My Month",
  desc: "Set the direction for the next 30 days",
  mode: "plan",
  prompts: [
   { key: "outcome", label: "The outcome I want by end of month", placeholder: "Revenue, relationships, habits, milestones." },
   { key: "priorities", label: "My top 3 priorities", placeholder: "Be ruthless — what actually moves the needle?" },
   { key: "habits", label: "Habits I'm building or protecting", placeholder: "Daily non-negotiables that compound over the month." },
   { key: "drop", label: "What I'm dropping or delegating", placeholder: "What's on your plate that shouldn't be?" },
  ]
 },
];

function JournalView({ currentUser, myData, industryConfig, myGoals, activeSpace, orgId, communities, onPostToFeed, userTracks, activeTrackId }) {
 return (
  <ErrorBoundary inline>
   <JournalViewInner currentUser={currentUser} myData={myData} industryConfig={industryConfig} myGoals={myGoals} activeSpace={activeSpace} orgId={orgId} communities={communities} onPostToFeed={onPostToFeed} userTracks={userTracks} activeTrackId={activeTrackId} />
  </ErrorBoundary>
 );
}

function JournalViewInner({ currentUser, myData, industryConfig, myGoals, activeSpace, orgId, communities, onPostToFeed, userTracks, activeTrackId }) {
 const [entries, setEntries] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showNew, setShowNew] = useState(false);
 const [showNewTemplate, setShowNewTemplate] = useState(null);
 const [showNewMode, setShowNewMode] = useState(null); // "reflect" | "plan" | null
 const [expanded, setExpanded] = useState(null);
 const [editEntry, setEditEntry] = useState(null); // entry being edited
 const [aiInsight, setAiInsight] = useState(null);
 const [aiInsightLoading, setAiInsightLoading] = useState(false);
 const [pacerJournalCue, setPacerJournalCue] = useState(null); // text waiting for free user to request insight

 // Listen for free-user pacer journal prompt cue
 useEffect(() => {
  function onCue(e) { setPacerJournalCue(e.detail?.text || true); }
  window.addEventListener("cadence:pacer-journal-prompt", onCue);
  return () => window.removeEventListener("cadence:pacer-journal-prompt", onCue);
 }, []);
 const [shareNudge, setShareNudge] = useState(null); // {text, type, headline}
 const [trackFilter, setTrackFilter] = useState("all"); // "all" or trackId
 const [searchQ, setSearchQ] = useState("");
 const [pacerComments, setPacerComments] = useState({}); // entryTs → comment string
 const [pacerCommentsLoading, setPacerCommentsLoading] = useState(false);
 const [pacerCommentsGenerated, setPacerCommentsGenerated] = useState(false);
 const F = "'DM Sans',system-ui,sans-serif";

 // ── Journal streak ──────────────────────────────────────────────────
 const journalStreak = useMemo(() => {
  if (!entries.length) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const daySet = new Set(entries.map(e => {
   const d = new Date(e.ts || 0); d.setHours(0,0,0,0); return d.getTime();
  }));
  let streak = 0, check = new Date(today);
  // Allow today to count even if no entry yet (so we don't drop streak at midnight)
  while (true) {
   const t = check.getTime();
   if (daySet.has(t)) { streak++; check.setDate(check.getDate()-1); }
   else if (streak === 0 && check.getTime() === today.getTime()) {
    // no entry today yet - check yesterday
    check.setDate(check.getDate()-1);
    if (daySet.has(check.getTime())) { streak++; check.setDate(check.getDate()-1); }
    else break;
   } else break;
  }
  return streak;
 }, [entries]);

 // ── Daily reflection prompt (based on day of week) ─────────────────
 const dailyPrompt = useMemo(() => {
  const today = new Date();
  const dow = today.getDay();
  const dom = today.getDate();
  const month = today.getMonth();
  const lastDay = new Date(today.getFullYear(), month+1, 0).getDate();
  // Priority: annual > quarterly > monthly > weekly > daily
  if (month === 11 && dom >= 29) return { id:"annual",   icon:"🎯", label:"Year in Review",    cta:"It's year-end — time to reflect on your year." };
  if ([2,5,8,11].includes(month) && dom >= lastDay-2) return { id:"quarterly", icon:"📊", label:"Last 90 Days", cta:"Last 90 days done. How did it go?" };
  if (dom >= lastDay-2) return { id:"monthly",   icon:"📆", label:"Month in Review",   cta:"End of the month — time to step back." };
  if ([5,6,0].includes(dow)) return { id:"weekly",    icon:"📅", label:"Week in Review",    cta:"Weekend is a great time to reflect on your week." };
  return { id:"daily", icon:"🌙", label:"Daily Check-in", cta:"How did today go?" };
 }, []);

 // ── Check if already written today ──────────────────────────────────
 const hasEntryToday = useMemo(() => {
  const today = new Date(); today.setHours(0,0,0,0);
  return entries.some(e => {
   const d = new Date(e.ts||0); d.setHours(0,0,0,0);
   return d.getTime() === today.getTime();
  });
 }, [entries]);

 // Listen for deep-link opens from Pacer nudges
 useEffect(() => {
  function handleJournalOpen(e) {
   const { template, mode } = e.detail || {};
   setShowNew(true);
   setShowNewTemplate(template || null);
   setShowNewMode(mode || null);
  }
  window.addEventListener("cadence:open-journal", handleJournalOpen);
  return () => window.removeEventListener("cadence:open-journal", handleJournalOpen);
 }, []);

 async function loadEntries() {
  if (!currentUser) return;
  setLoading(true);
  try {
   // Primary store — unified freeform journal (all new entries go here)
   const all = await loadJournalEntries(currentUser.id);
   const seenWks = new Set(all.map(e => e.weekKey).filter(Boolean));

   // Backward-compat: pull any old weekly-store entries not yet in freeform store
   const legacyResults = [];
   const now = new Date();
   for (let i = 0; i < 52; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const wk = weekKey(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
    if (seenWks.has(wk)) continue; // already in unified store
    try {
     const r = await loadWeeklyReflection(currentUser.id, wk);
     if (r && (r.wins || r.movedNeedle || r.intention || r.needle || r.learn || r.next || r.what || r.how || r.feel || r.gap || r.why || r.fix || r.commit || r.goal || r.obstacles || r.first || r.text)) {
      legacyResults.push({ ...r, _wk: wk, _type: r.templateId || "weekly" });
     }
    } catch {}
   }

   const combined = [...all, ...legacyResults];
   combined.sort((a, b) => (b.ts || 0) - (a.ts || 0));
   setEntries(combined);
   generatePacerComments(combined);
  } catch {}
  setLoading(false);
 }

 useEffect(() => { loadEntries(); }, [currentUser?.id]);

 // Distill recent journal entries into a persistent Pacer memory summary
 async function updatePacerJournalMemory() {
  if (!currentUser) return;
  const all = await loadJournalEntries(currentUser.id).catch(() => []);
  if (!all || all.length === 0) return;
  const recent = all.slice(0, 10);
  const entryTexts = recent.map(e => {
   const fields = Object.entries(e)
    .filter(([k, v]) => typeof v === 'string' && v.trim() && !['userId','userName','templateId','entryMode','trackId','imageUrl','photoCaption','weekKey','movedNeedle','intention'].includes(k))
    .map(([, v]) => v.trim()).join(' ');
   return fields;
  }).filter(Boolean).join('\n---\n');
  if (!entryTexts.trim()) return;
  const existing = await loadPacerMemory(currentUser.id);
  if (existing.updatedAt && Date.now() - existing.updatedAt < 6 * 3600000 && existing.entryCount === all.length) return;
  try {
   const data = await callAI({ model: "claude-haiku-4-5-20251001", messages: [{ role: 'user', content: `Summarize this professional's private journal entries for Pacer, their AI accountability partner. Extract: recurring themes, stated goals or intentions, challenges mentioned, mindset patterns, specific commitments. Concrete, present tense, under 120 words. No preamble.\n\nJournal entries:\n${entryTexts.slice(0, 2000)}` }], max_tokens: 200, call_type: "pacer" })
   const summary = (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
   if (summary && summary.length > 20) {
    const mem = { summary, updatedAt: Date.now(), entryCount: all.length };
    await savePacerMemory(currentUser.id, mem);
    setPacerJournalMem(summary);
   }
  } catch {}
 }

 // Delete a journal entry
 async function deleteEntry(e) {
  if (!window.confirm("Delete this entry? This can\'t be undone.")) return;
  // Try unified store first
  try {
   const all = await loadJournalEntries(currentUser.id);
   const idx = all.findIndex(x => x.ts === e.ts);
   if (idx >= 0) {
    await storageSet(nsKey(`user-${currentUser.id}`, "at-journal"), all.filter((_, i) => i !== idx));
    setExpanded(null); loadEntries(); return;
   }
  } catch {}
  // Fallback: legacy weekly store entry
  if (e._wk) await saveWeeklyReflection(currentUser.id, e._wk, null);
  setExpanded(null);
  loadEntries();
 }

 // Generate Pacer comments on notable entries
 async function generatePacerComments(entriesList) {
  if (!entriesList || !entriesList.length || pacerCommentsGenerated) return;
  setPacerCommentsGenerated(true);
  setPacerCommentsLoading(true);
  const notableKeywords = /first|landed|closed|won|deal|customer|client|milestone|breakthrough|record|best|proud|huge|big|finally|nailed|killed|crush|signed|converted|revenue|quota/i;
  const notable = entriesList.slice(0, 15).filter(e => {
   const text = Object.values(e).filter(v => typeof v === "string" && v.trim()).join(" ");
   return notableKeywords.test(text);
  }).slice(0, 4);
  if (!notable.length) { setPacerCommentsLoading(false); return; }
  const entryDescriptions = notable.map((e, i) => {
   const text = Object.entries(e)
    .filter(([k,v]) => typeof v === "string" && v.trim() && !["userId","userName","templateId","trackId","imageUrl","_wk","_type","_isFreeform"].includes(k))
    .map(([,v]) => v).join(" ").slice(0, 400);
   return `Entry ${i+1} (ts:${e.ts}): ${text}`;
  }).join("\n\n");
  try {
   await callAI({ model: "claude-haiku-4-5-20251001", messages: [{ role: "user", content: prompt }], max_tokens: 100, call_type: "pacer" })
   const raw = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
   const clean = raw.replace(/^[`]{3}json?\s*/i, "").replace(/[`]{3}\s*$/i, "").trim();
   const parsed = JSON.parse(clean);
   const comments = {};
   (parsed?.comments || []).forEach(item => { if (item.ts && item.text) comments[item.ts] = item.text; });
   setPacerComments(comments);
  } catch {}
  setPacerCommentsLoading(false);
 }

 async function generateInsight() {
  if (entries.length < 3) return;
  setAiInsightLoading(true);
  const recentText = entries.slice(0,6).map(e => {
   const vals = Object.entries(e).filter(([k,v]) => typeof v === "string" && v.trim() && !["userId","userName","templateId","trackId","imageUrl","_wk","_type"].includes(k)).map(([,v])=>v).join(" ");
   return vals.slice(0,300);
  }).join("\n\n---\n\n");
  try {
   await callAI({ model: "claude-sonnet-4-20250514", messages: [{ role: "user", content: `You are Pacer — a high-performing peer reviewing someone's recent journal entries.

Part 1 — Insight: Identify one specific, honest pattern — something they might not have noticed. Be direct, not generic. 2-3 sentences.

Part 2 — Share evaluation: Decide if any of this is genuinely worth sharing with their professional community. ONLY suggest sharing if: they described a real win or milestone, shared something insightful others would benefit from, or seem like they could use encouragement. Do NOT suggest sharing for generic updates. If worth sharing, write a SHORT natural prompt (1 sentence, conversational, specific) starting with "💬". If not worth sharing, output nothing for Part 2.

Format your response as JSON: {"insight":"...","sharePrompt":"...or empty string if not worth sharing"}

Journal entries:
${recentText}` }], max_tokens: 400, call_type: "general" })
   const raw = (data?.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("").trim();
   try {
    const clean = raw.replace(/^```json?\s*/i,"").replace(/```\s*$/i,"").trim();
    const parsed = JSON.parse(clean);
    if (parsed?.insight) setAiInsight(parsed.insight);
    if (parsed?.sharePrompt?.trim()) setShareNudge({ text: parsed.sharePrompt, nudgeText: parsed.sharePrompt });
   } catch {
    // Fallback: just use the raw text as insight
    if (raw) setAiInsight(raw);
   }
  } catch {}
  setAiInsightLoading(false);
 }

 const formatDate = (ts) => {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", year:"numeric" });
 };

 const templateOf = (e) => JOURNAL_TEMPLATES.find(t => t.id === e._type) || JOURNAL_TEMPLATES[0];

 const getPreview = (e) => {
  const t = templateOf(e);
  for (const p of t.prompts) {
   const v = e[p.key] || (p.key === "needle" ? e.movedNeedle : null);
   if (v?.trim()) return v.trim();
  }
  return e.movedNeedle || e.text || e.wins || "";
 };

 // Track filter logic + search
 const filteredEntries = entries
  .filter(e => trackFilter === "all" || e.trackId === trackFilter)
  .filter(e => {
   if (!searchQ.trim()) return true;
   const q = searchQ.toLowerCase();
   const allText = Object.values(e).filter(v => typeof v === "string").join(" ").toLowerCase();
   return allText.includes(q);
  });
 const hasTracks = userTracks && userTracks.length > 1;

 const card = { background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"14px", overflow:"hidden" };

 return (
  <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>

   {/* Header row */}
   <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"10px" }}>
    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
     <div>
      <div style={{ fontSize:"1rem", fontWeight:"800", color:"var(--text-primary)", fontFamily:F }}>📓 Journal</div>
      <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", marginTop:"2px" }}>Private — only you can see these</div>
     </div>
     {journalStreak > 0 && (
      <div style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"20px", padding:"4px 10px", display:"flex", alignItems:"center", gap:"5px" }}>
       <span style={{ fontSize:"0.9rem" }}>🔥</span>
       <span style={{ fontSize:"0.75rem", fontWeight:"800", color:"#F59E0B" }}>{journalStreak}d</span>
      </div>
     )}
    </div>
    <button onClick={() => { setShowNew(true); setShowNewTemplate(null); setShowNewMode(null); }} style={{ background:"var(--accent)", color:"#000", border:"none", padding:"10px 18px", borderRadius:"10px", fontWeight:"800", fontSize:"0.88rem", cursor:"pointer", fontFamily:F, minHeight:"42px", WebkitTapHighlightColor:"transparent" }}>
     + New Entry
    </button>
   </div>

   {/* Daily prompt card */}
   {!hasEntryToday && (
    <div style={{ background:"linear-gradient(135deg, rgba(29,201,232,0.08) 0%, rgba(168,85,247,0.06) 100%)", border:"1px solid rgba(29,201,232,0.2)", borderRadius:"14px", padding:"14px 16px" }}>
     <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"10px" }}>
      <div style={{ flex:1 }}>
       <div style={{ fontSize:"0.68rem", fontWeight:"800", color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"4px" }}>
        {dailyPrompt.icon} {dailyPrompt.label}
       </div>
       <div style={{ fontSize:"0.88rem", color:"var(--text-secondary)", lineHeight:1.4 }}>{dailyPrompt.cta}</div>
      </div>
      <button onClick={() => { setShowNewTemplate(dailyPrompt.id); setShowNewMode("reflect"); setShowNew(true); }} style={{ background:"var(--accent)", color:"#000", border:"none", padding:"10px 16px", borderRadius:"10px", fontWeight:"800", fontSize:"0.82rem", cursor:"pointer", fontFamily:F, flexShrink:0, WebkitTapHighlightColor:"transparent", whiteSpace:"nowrap" }}>
       Write →
      </button>
     </div>
    </div>
   )}
   {hasEntryToday && (
    <div style={{ background:"rgba(74,207,134,0.07)", border:"1px solid rgba(74,207,134,0.2)", borderRadius:"14px", padding:"10px 14px", display:"flex", alignItems:"center", gap:"10px" }}>
     <span style={{ fontSize:"1.1rem" }}>✅</span>
     <div style={{ fontSize:"0.85rem", color:"#4ACF86", fontWeight:"600" }}>Entry logged today{journalStreak > 1 ? ` · ${journalStreak}-day streak 🔥` : ""}</div>
    </div>
   )}

   {/* ── Past plan reminder — shown when user has a recent plan entry ── */}
   {(() => {
    const planEntries = entries.filter(e => e.entryMode === "plan" || JOURNAL_TEMPLATES.find(t=>t.id===e.templateId)?.mode === "plan");
    const recent = planEntries[0];
    if (!recent) return null;
    const daysAgo = Math.floor((Date.now() - (recent.ts||0)) / 86400000);
    if (daysAgo > 7) return null; // only show if within a week
    const tmpl = JOURNAL_TEMPLATES.find(t => t.id === recent.templateId) || {};
    const preview = Object.values(recent).find(v => typeof v === "string" && v.trim() && v.length > 10 && !["userId","userName","templateId","trackId","imageUrl","_wk","_type","entryMode"].includes(v));
    const daysText = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;
    return (
     <div style={{ background:"rgba(168,85,247,0.06)", border:"1px solid rgba(168,85,247,0.2)", borderRadius:"14px", padding:"13px 16px", display:"flex", alignItems:"flex-start", gap:"12px" }}>
      <span style={{ fontSize:"1.1rem", flexShrink:0, marginTop:"1px" }}>📋</span>
      <div style={{ flex:1, minWidth:0 }}>
       <div style={{ fontSize:"0.7rem", fontWeight:"800", color:"#A855F7", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"3px" }}>
        {daysText} · {tmpl.label || "Plan"}
       </div>
       <div style={{ fontSize:"0.82rem", color:"var(--text-muted)", lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {typeof preview === "string" ? preview.slice(0,100) : "You had a plan. How did it go?"}
       </div>
      </div>
      <button onClick={() => { setShowNewMode("reflect"); setShowNew(true); }}
       style={{ background:"none", border:"1px solid rgba(168,85,247,0.3)", borderRadius:"8px", padding:"6px 11px", fontSize:"0.75rem", fontWeight:"800", color:"#A855F7", cursor:"pointer", fontFamily:F, flexShrink:0, WebkitTapHighlightColor:"transparent", whiteSpace:"nowrap" }}>
       Reflect →
      </button>
     </div>
    );
   })()}

   {/* ── Entry heatmap: last 12 weeks ── */}
   {entries.length > 0 && (() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const entryDays = new Set(entries.map(e => { const d = new Date(e.ts||0); d.setHours(0,0,0,0); return d.getTime(); }));
    const weeks = [];
    for (let w = 11; w >= 0; w--) {
     const days = [];
     for (let d = 6; d >= 0; d--) {
      const dt = new Date(today); dt.setDate(today.getDate() - w*7 - d);
      days.push({ ts: dt.getTime(), future: dt > today, has: entryDays.has(dt.getTime()) });
     }
     weeks.push(days);
    }
    return (
     <div>
      <div style={{ fontSize:"0.68rem", fontWeight:"800", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>
       Journal Activity · {entries.length} entries
      </div>
      <div style={{ display:"flex", gap:"3px", overflowX:"auto" }}>
       {weeks.map((wk,wi) => (
        <div key={wi} style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
         {wk.map((day,di) => (
          <div key={di} style={{ width:"14px", height:"14px", borderRadius:"3px", background: day.future ? "transparent" : day.has ? "rgba(74,207,134,0.7)" : "var(--bg-2)", border: day.future ? "none" : "1px solid var(--border-1)", flexShrink:0 }} title={new Date(day.ts).toLocaleDateString()} />
         ))}
        </div>
       ))}
      </div>
     </div>
    );
   })()}

   {/* ── AI Pattern Insight ── */}
   <div style={{ background:"rgba(168,85,247,0.06)", border:"1px solid rgba(168,85,247,0.18)", borderRadius:"12px", padding:"14px 16px" }}>
    {/* Free user: "Get Pacer's take" cue after saving a journal entry */}
    {pacerJournalCue && !aiInsight && (
     <div style={{ background:"rgba(29,201,232,0.05)", border:"1px solid rgba(29,201,232,0.2)", borderRadius:"12px", padding:"12px 14px", marginBottom:"12px", display:"flex", alignItems:"center", gap:"12px" }}>
      <span style={{ fontSize:"1.2rem", flexShrink:0 }}>⚡</span>
      <div style={{ flex:1 }}>
       <div style={{ fontSize:"0.82rem", fontWeight:"700", color:"var(--accent)", marginBottom:"2px" }}>Pacer read your entry</div>
       <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", lineHeight:1.4 }}>On Pro, Pacer responds automatically. Tap below for a one-time insight.</div>
      </div>
      <button onClick={() => { setPacerJournalCue(null); generateInsight(); }}
       style={{ background:"rgba(29,201,232,0.12)", border:"1px solid rgba(29,201,232,0.3)", color:"var(--accent)", borderRadius:"8px", padding:"6px 12px", fontSize:"0.78rem", fontWeight:"800", cursor:"pointer", fontFamily:F, flexShrink:0, WebkitTapHighlightColor:"transparent" }}>
       Get insight →
      </button>
     </div>
    )}
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"10px" }}>
     <div style={{ fontSize:"0.68rem", fontWeight:"800", color:"#A855F7", textTransform:"uppercase", letterSpacing:"0.1em" }}>🧠 Pattern Insight</div>
     {entries.length >= 3 && !aiInsight && !aiInsightLoading && (
      <button onClick={generateInsight} style={{ background:"none", border:"1px solid rgba(168,85,247,0.3)", borderRadius:"8px", color:"#A855F7", fontSize:"0.75rem", fontWeight:"700", padding:"4px 10px", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
       Analyze →
      </button>
     )}
    </div>
    {entries.length < 3 && (
     <div style={{ fontSize:"0.82rem", color:"var(--text-muted)", marginTop:"6px", lineHeight:1.55 }}>
      🔒 Write <strong style={{color:"#A855F7"}}>{3 - entries.length} more {3-entries.length===1?"entry":"entries"}</strong> to unlock AI pattern analysis — it reads your recent journal and surfaces patterns you might not have noticed.
     </div>
    )}
    {entries.length >= 3 && aiInsightLoading && <div style={{ fontSize:"0.85rem", color:"var(--text-muted)", marginTop:"6px", fontStyle:"italic" }}>Reading your entries…</div>}
    {entries.length >= 3 && !aiInsight && !aiInsightLoading && <div style={{ fontSize:"0.82rem", color:"var(--text-muted)", marginTop:"6px", lineHeight:1.5 }}>Get an AI-powered pattern insight based on your recent journal entries.</div>}
    {aiInsight && <div style={{ fontSize:"0.88rem", color:"var(--text-secondary)", marginTop:"8px", lineHeight:1.6 }}>{aiInsight}</div>}
    {shareNudge?.nudgeText && aiInsight && (
     <div style={{ marginTop:"10px", background:"rgba(168,85,247,0.05)", border:"1px solid rgba(168,85,247,0.2)", borderRadius:"10px", padding:"10px 12px" }}>
      <div style={{ fontSize:"0.82rem", color:"#A855F7", lineHeight:1.5, marginBottom:"8px" }}>{shareNudge.nudgeText}</div>
      <div style={{ display:"flex", gap:"8px" }}>
       <button onClick={()=>setShareNudge(prev=>({...prev, open:true}))} style={{ padding:"5px 12px", borderRadius:"8px", fontSize:"0.75rem", fontWeight:"700", cursor:"pointer", fontFamily:F, background:"rgba(168,85,247,0.12)", border:"1px solid rgba(168,85,247,0.3)", color:"#A855F7", WebkitTapHighlightColor:"transparent" }}>
        Share →
       </button>
       <button onClick={()=>setShareNudge(null)} style={{ padding:"5px 10px", borderRadius:"8px", fontSize:"0.75rem", cursor:"pointer", fontFamily:F, background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)" }}>
        Not now
       </button>
      </div>
     </div>
    )}
   </div>

   {/* Share nudge modal */}
   {shareNudge?.open && (
    <ChimeInModal
     currentUser={currentUser}
     orgId={orgId}
     communities={communities||[]}
     prefillText={aiInsight || ""}
     onClose={()=>setShareNudge(null)}
    />
   )}

   {/* Edit entry modal */}
   {editEntry && <JournalEntryModal
    currentUser={currentUser} myData={myData} industryConfig={industryConfig} myGoals={myGoals}
    activeSpace={activeSpace} onPostToFeed={onPostToFeed} activeTrackId={activeTrackId}
    initialTemplate={editEntry.templateId || editEntry._type} initialAnswers={editEntry}
    initialMode={editEntry.entryMode || (JOURNAL_TEMPLATES.find(t=>t.id===(editEntry.templateId||editEntry._type))?.mode === "plan" ? "plan" : "reflect")}
    recentPlanEntry={entries.find(e => e.ts !== editEntry.ts && (e.entryMode === "plan" || JOURNAL_TEMPLATES.find(t=>t.id===e.templateId)?.mode === "plan")) || null}
    onClose={() => setEditEntry(null)}
    onSaved={() => { setEditEntry(null); loadEntries(); }}
   />}

   {/* Track filter chips */}
   {hasTracks && (
    <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
     <button onClick={() => setTrackFilter("all")} style={{ padding:"5px 13px", borderRadius:"20px", border:`1px solid ${trackFilter==="all"?"var(--accent)":"var(--border-1)"}`, background:trackFilter==="all"?"rgba(29,201,232,0.12)":"transparent", color:trackFilter==="all"?"var(--accent)":"var(--text-muted)", fontSize:"0.78rem", fontWeight:"700", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
      All Tracks
     </button>
     {userTracks.map(t => (
      <button key={t.id} onClick={() => setTrackFilter(t.id)}
       style={{ padding:"5px 13px", borderRadius:"20px", border:`1px solid ${trackFilter===t.id?"var(--accent)":"var(--border-1)"}`, background:trackFilter===t.id?"rgba(29,201,232,0.12)":"transparent", color:trackFilter===t.id?"var(--accent)":"var(--text-muted)", fontSize:"0.78rem", fontWeight:"700", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent", display:"flex", alignItems:"center", gap:"5px" }}>
       <span>{t.icon||"◆"}</span> {t.name}
      </button>
     ))}
    </div>
   )}

   {/* New entry modal */}
   {showNew && <JournalEntryModal currentUser={currentUser} myData={myData} industryConfig={industryConfig} myGoals={myGoals} activeSpace={activeSpace} onPostToFeed={onPostToFeed} activeTrackId={activeTrackId} initialTemplate={showNewTemplate} initialMode={showNewMode}
    recentPlanEntry={entries.find(e => e.entryMode === "plan" || JOURNAL_TEMPLATES.find(t=>t.id===e.templateId)?.mode === "plan") || null}
    onClose={() => { setShowNew(false); setShowNewTemplate(null); setShowNewMode(null); }} onSaved={() => { setShowNew(false); setShowNewTemplate(null); setShowNewMode(null); loadEntries(); }} />}

   {/* Search bar — show once there are enough entries to search */}
   {!loading && entries.length >= 3 && (
    <div style={{ position:"relative" }}>
     <input
      value={searchQ} onChange={e => setSearchQ(e.target.value)}
      placeholder="Search entries…"
      style={{ width:"100%", boxSizing:"border-box", background:"var(--bg-1)", border:"1px solid var(--border-1)", color:"var(--text-primary)", padding:"9px 14px 9px 36px", borderRadius:"10px", fontSize:"0.88rem", fontFamily:F, outline:"none" }}
     />
     <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"0.85rem", opacity:0.4, pointerEvents:"none" }}>🔍</span>
     {searchQ && <button onClick={()=>setSearchQ("")} style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--text-dim)", cursor:"pointer", fontSize:"0.85rem", padding:"2px 4px", lineHeight:1 }}>✕</button>}
    </div>
   )}

   {loading && <div style={{ textAlign:"center", padding:"48px 0", color:"var(--text-dim)", fontSize:"0.9rem" }}>Loading…</div>}

   {!loading && filteredEntries.length === 0 && (
    <div style={{ ...card, padding:"48px 24px", textAlign:"center" }}>
     <div style={{ fontSize:"2.5rem", marginBottom:"14px", opacity:0.35 }}>📓</div>
     <div style={{ fontSize:"0.95rem", color:"var(--text-muted)", lineHeight:1.6, marginBottom:"20px" }}>
      {searchQ ? `No entries matching "${searchQ}".` : trackFilter !== "all" ? "No entries for this track yet." : `No journal entries yet. Hit "+ New Entry" to write your first one.`}
     </div>
     <button onClick={() => setShowNew(true)} style={{ background:"var(--accent)", color:"#000", border:"none", padding:"11px 24px", borderRadius:"10px", fontWeight:"800", fontSize:"0.9rem", cursor:"pointer", fontFamily:F }}>Write First Entry →</button>
    </div>
   )}

   {!loading && filteredEntries.map((e, i) => {
    const isOpen = expanded === i;
    const preview = getPreview(e);
    const tmpl = templateOf(e);
    const entryTrack = userTracks?.find(t => t.id === e.trackId);
    return (
     <div key={e.ts || i} style={card}>
      <button onClick={() => setExpanded(isOpen ? null : i)} style={{ width:"100%", background:"none", border:"none", padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:"12px", textAlign:"left", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
       <span style={{ fontSize:"1.4rem", flexShrink:0, marginTop:"2px" }}>{tmpl.icon}</span>
       <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"4px", flexWrap:"wrap" }}>
         <span style={{ fontSize:"0.82rem", fontWeight:"700", color:"var(--accent)" }}>{tmpl.label}</span>
         {(() => {
          const isPlan = e.entryMode === "plan" || tmpl.mode === "plan";
          return (
           <span style={{ fontSize:"0.58rem", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.08em", padding:"2px 6px", borderRadius:"20px",
            background: isPlan ? "rgba(168,85,247,0.12)" : "rgba(29,201,232,0.08)",
            color: isPlan ? "#A855F7" : "var(--accent)" }}>
            {isPlan ? "Plan" : "Reflect"}
           </span>
          );
         })()}
         <span style={{ fontSize:"0.72rem", color:"var(--text-dim)" }}>{formatDate(e.ts)}</span>
         {e._wk && <span style={{ fontSize:"0.68rem", color:"var(--text-dim)", background:"var(--bg-2)", borderRadius:"5px", padding:"1px 6px" }}>{e._wk}</span>}
         {entryTrack && hasTracks && <span style={{ fontSize:"0.68rem", color:"var(--text-dim)", background:"var(--bg-2)", borderRadius:"5px", padding:"1px 6px" }}>{entryTrack.icon} {entryTrack.name}</span>}
        </div>
        {!isOpen && preview && <div style={{ fontSize:"0.88rem", color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.45 }}>{preview.slice(0,120)}{preview.length>120?"…":""}</div>}
        {!isOpen && !preview && !e.imageUrl && <div style={{ fontSize:"0.82rem", color:"var(--text-dim)", fontStyle:"italic" }}>No text recorded</div>}
        {!isOpen && e.imageUrl && <div style={{ fontSize:"0.78rem", color:"var(--text-dim)", marginTop:"3px" }}>📷 Photo attached</div>}
        {!isOpen && pacerComments[e.ts] && (
         <div style={{ display:"flex", alignItems:"center", gap:"4px", marginTop:"4px" }}>
          <span style={{ fontSize:"0.75rem" }}>⚡</span>
          <span style={{ fontSize:"0.72rem", color:"var(--accent)", fontWeight:"700" }}>Pacer commented</span>
         </div>
        )}
       </div>
       <span style={{ fontSize:"0.8rem", color:"var(--text-dim)", transform:isOpen?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0, marginTop:"4px" }}>▼</span>
      </button>

      {isOpen && (
       <div style={{ padding:"0 16px 18px", borderTop:"1px solid var(--border-1)" }}>
        {e.weekStats?.totals && Object.keys(e.weekStats.totals).length > 0 && (
         <div style={{ marginTop:"14px", marginBottom:"16px" }}>
          <div style={{ fontSize:"0.68rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>Activity that week</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
           {Object.entries(e.weekStats.totals).map(([k,v]) => (
            <div key={k} style={{ background:"var(--bg-2)", borderRadius:"8px", padding:"6px 12px", fontSize:"0.82rem" }}>
             <span style={{ color:"var(--text-dim)", marginRight:"5px" }}>{k}</span>
             <span style={{ fontWeight:"700", color:"var(--text-primary)" }}>{v}</span>
            </div>
           ))}
          </div>
         </div>
        )}
        {tmpl.prompts.map(p => {
         const val = e[p.key] || (p.key === "needle" ? e.movedNeedle : null) || (p.key === "next" ? e.intention : null);
         if (!val?.trim()) return null;
         const isHighlight = p.key === "next" || p.key === "commit" || p.key === "first";
         return (
          <div key={p.key} style={{ marginTop:"14px" }}>
           <div style={{ fontSize:"0.68rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>{p.label}</div>
           {isHighlight ? (
            <div style={{ background:"rgba(29,201,232,0.07)", border:"1px solid rgba(29,201,232,0.2)", borderRadius:"10px", padding:"10px 14px", fontSize:"0.92rem", color:"var(--accent)", lineHeight:1.6, fontWeight:"600" }}>{val}</div>
           ) : (
            <div style={{ fontSize:"0.92rem", color:"var(--text-secondary)", lineHeight:1.65 }}>{val}</div>
           )}
          </div>
         );
        })}
        {/* Photo */}
        {e.imageUrl && (
         <div style={{ marginTop:"14px" }}>
          <img src={e.imageUrl} alt={e.photoCaption||""} style={{ maxWidth:"100%", maxHeight:"320px", borderRadius:"10px", display:"block", cursor:"pointer", objectFit:"cover", width:"100%" }} onClick={() => window.open(e.imageUrl, "_blank")} onError={ex => ex.target.style.display="none"} />
          {e.photoCaption && (
           <div style={{ fontSize:"0.82rem", color:"var(--text-muted)", marginTop:"7px", fontStyle:"italic", lineHeight:1.5, paddingLeft:"2px" }}>{e.photoCaption}</div>
          )}
         </div>
        )}
        {/* Fallback for old format */}
        {e.wins && !tmpl.prompts.find(p => p.key === "wins") && (
         <div style={{ marginTop:"14px" }}>
          <div style={{ fontSize:"0.68rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Results & Wins</div>
          <div style={{ fontSize:"0.92rem", color:"var(--text-secondary)", lineHeight:1.65 }}>{e.wins}</div>
         </div>
        )}
        {/* Pacer comment on notable entries */}
        {pacerComments[e.ts] && (
         <div style={{ marginTop:"16px", background:"rgba(29,201,232,0.06)", border:"1px solid rgba(29,201,232,0.2)", borderRadius:"12px", padding:"12px 14px", display:"flex", gap:"10px", alignItems:"flex-start" }}>
          <span style={{ fontSize:"1.2rem", flexShrink:0 }}>⚡</span>
          <div style={{ flex:1 }}>
           <div style={{ fontSize:"0.65rem", fontWeight:"800", color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"4px" }}>Pacer</div>
           <div style={{ fontSize:"0.86rem", color:"var(--text-secondary)", lineHeight:1.55 }}>{pacerComments[e.ts]}</div>
          </div>
         </div>
        )}

        {/* Edit + Delete buttons */}
        <div style={{ display:"flex", gap:"8px", marginTop:"16px" }}>
         <button onClick={()=>setEditEntry(e)} style={{ background:"none", border:"1px solid var(--border-1)", borderRadius:"8px", color:"var(--text-muted)", padding:"7px 14px", fontSize:"0.8rem", fontWeight:"700", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
          ✏️ Edit
         </button>
         <button onClick={() => deleteEntry(e)}
          style={{ background:"none", border:"1px solid rgba(224,85,119,0.3)", borderRadius:"8px", color:"#E05577", padding:"7px 14px", fontSize:"0.8rem", fontWeight:"700", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
          🗑 Delete
         </button>
        </div>
       </div>
      )}
     </div>
    );
   })}
  </div>
 );
}

// ── JournalEntryModal ─────────────────────────────────────────────────
// ── PacerReflectCallback — surfaces a recent Plan entry when you Reflect ──────
// Shows the user what they planned, with actual numbers, so they reflect honestly.
function PacerReflectCallback({ templateId, myData, myGoals, industryConfig, currentUser, recentPlanEntry }) {
 const F = "'DM Sans',system-ui,sans-serif";
 if (!recentPlanEntry || !myData) return null;

 const metrics = industryConfig?.weekdayMetrics || [];
 const daysAgo = Math.floor((Date.now() - (recentPlanEntry.ts||0)) / 86400000);
 if (daysAgo > 14) return null; // too stale

 // Get the most meaningful field from the plan entry
 const planPreviewKeys = ["win","priority","goal","targets","outcome"];
 const planText = planPreviewKeys.map(k => recentPlanEntry[k]).find(v => v?.trim());
 if (!planText) return null;

 // Pull actual numbers since the plan was written
 const planDate = new Date(recentPlanEntry.ts || 0);
 const today = new Date();
 const daysSince = Math.max(1, daysAgo);
 let actualSummary = null;
 if (metrics.length > 0) {
  const totals = {};
  for (let i = 0; i < daysSince; i++) {
   const d = new Date(planDate); d.setDate(planDate.getDate() + i);
   if (d > today) break;
   const dow = d.getDay();
   if (dow === 0 || dow === 6) continue; // skip weekends
   const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
   metrics.forEach(m => { totals[m.key] = (totals[m.key]||0) + (myData[dk]?.[m.key]||0); });
  }
  const parts = metrics.slice(0,3).map(m => {
   const v = totals[m.key] || 0;
   const g = (myGoals?.[m.key] || 0) * Math.max(1, daysSince - Math.floor(daysSince/7)*2);
   if (!v && !g) return null;
   return `${m.short || m.label}: ${v}${g ? ` / ${g} goal` : ""}`;
  }).filter(Boolean);
  if (parts.length) actualSummary = parts.join(" · ");
 }

 const daysText = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`;

 return (
  <div style={{ background:"rgba(168,85,247,0.05)", border:"1px solid rgba(168,85,247,0.18)", borderRadius:"14px", padding:"13px 16px" }}>
   <div style={{ fontSize:"0.62rem", fontWeight:"800", color:"#A855F7", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>
    ⚡ You planned this {daysText}
   </div>
   <div style={{ fontSize:"0.84rem", color:"var(--text-secondary)", lineHeight:1.5, marginBottom: actualSummary ? "10px" : "0", fontFamily:F }}>
    "{planText.length > 120 ? planText.slice(0,120)+"…" : planText}"
   </div>
   {actualSummary && (
    <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontFamily:F }}>
     <span style={{ fontWeight:"700", color:"var(--text-dim)" }}>Since then: </span>{actualSummary}
    </div>
   )}
  </div>
 );
}

// ── PacerPlanInsight — AI analysis shown at top of Plan write step ────────────
// Shows a real data card + one AI coaching line. Fires once per session per template.
function PacerPlanInsight({ templateId, myData, myGoals, myGoalPeriods, industryConfig, currentUser }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [insight, setInsight] = useState(null);
 const [loading, setLoading] = useState(false);
 const [dataCards, setDataCards] = useState([]); // [{label, value, sub}]
 const sessionKey = `pacer-plan-insight-${currentUser?.id}-${templateId}-${todayStr()}`;

 useEffect(() => {
  if (!currentUser || !myData || !industryConfig) return;
  try {
   const cached = sessionStorage.getItem(sessionKey);
   if (cached) {
    const parsed = JSON.parse(cached);
    setInsight(parsed.insight);
    setDataCards(parsed.cards || []);
    return;
   }
  } catch {}
  buildInsight();
 }, [templateId, currentUser?.id]);

 async function buildInsight() {
  if (loading) return;
  const metrics = industryConfig?.weekdayMetrics || [];
  if (!metrics.length) return;
  const allDays = Object.keys(myData || {}).filter(d => !isWeekend(d)).sort();
  if (allDays.length < 3) return;
  setLoading(true);

  const today = todayStr();
  const todayDate = new Date();
  const todayDow = todayDate.getDay();
  const dowNames = {1:"Monday",2:"Tuesday",3:"Wednesday",4:"Thursday",5:"Friday"};

  // ── Core analytics ──────────────────────────────────────────────────────
  // Goal % per day
  const goalPcts = allDays.map(d => computeGoalPct(myData[d]||{}, metrics, myGoals, myGoalPeriods));
  const avgGoalPct = goalPcts.length ? Math.round(goalPcts.reduce((s,v)=>s+v,0)/goalPcts.length) : 0;

  // 30-day avg
  const last30 = allDays.filter(d => (new Date(today)-new Date(d))/86400000 <= 30);
  const avg30 = last30.length
   ? Math.round(last30.reduce((s,d)=>s+computeGoalPct(myData[d]||{},metrics,myGoals,myGoalPeriods),0)/last30.length)
   : avgGoalPct;

  // Day-of-week averages
  const dowBuckets = {1:[],2:[],3:[],4:[],5:[]};
  for (const d of allDays) {
   const dow = new Date(d + "T12:00:00").getDay();
   if (dowBuckets[dow]) dowBuckets[dow].push(computeGoalPct(myData[d]||{}, metrics, myGoals, myGoalPeriods));
  }
  const dowAvgs = Object.entries(dowBuckets)
   .filter(([,arr]) => arr.length >= 1)
   .map(([dow, arr]) => ({
    dow: parseInt(dow),
    name: dowNames[dow],
    avg: Math.round(arr.reduce((s,v)=>s+v,0)/arr.length),
    count: arr.length
   }))
   .sort((a,b) => b.avg - a.avg);
  const bestDow = dowAvgs[0];
  const worstDow = dowAvgs[dowAvgs.length-1];
  const mondayStats = dowAvgs.find(d=>d.dow===1);
  const todayDowStats = dowAvgs.find(d=>d.dow===todayDow);

  // Last week
  const lastMon = new Date(todayDate);
  lastMon.setDate(lastMon.getDate() - (todayDow === 0 ? 13 : todayDow + 6));
  const lastWeekDays = [];
  for (let i = 0; i < 5; i++) {
   const d = new Date(lastMon); d.setDate(lastMon.getDate() + i);
   const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
   if (myData[dk] && Object.values(myData[dk]).some(v=>typeof v==="number"&&v>0)) lastWeekDays.push({ dk, data: myData[dk] });
  }
  const lastWeekAvg = lastWeekDays.length
   ? Math.round(lastWeekDays.reduce((s,d)=>s+computeGoalPct(d.data,metrics,myGoals,myGoalPeriods),0)/lastWeekDays.length) : null;

  // Gaps: consecutive zero-log weekdays
  let maxGap = 0, curGap = 0, totalGapDays = 0;
  for (const d of allDays) {
   const hasData = metrics.some(m => (myData[d]?.[m.key]||0) > 0);
   if (!hasData) { curGap++; totalGapDays++; } else { maxGap = Math.max(maxGap, curGap); curGap = 0; }
  }
  maxGap = Math.max(maxGap, curGap);
  const gapRate = allDays.length ? Math.round((totalGapDays/allDays.length)*100) : 0;

  // Goal calibration per metric
  const metricStats = metrics.slice(0,4).map(m => {
   const vals = allDays.map(d => myData[d]?.[m.key]||0).filter(v=>v>0);
   const avg = vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : 0;
   const goal = myGoals?.[m.key] || 0;
   let calibration = null;
   if (avg > 0 && goal > 0) {
    const ratio = avg / goal;
    if (ratio > 1.25) calibration = "undershot";
    else if (ratio < 0.55) calibration = "stretch";
    else calibration = "dialed";
   }
   return { key: m.key, label: m.short||m.label, avg: parseFloat(avg.toFixed(1)), goal, calibration };
  });

  const undershoot = metricStats.filter(m=>m.calibration==="undershot");
  const stretch = metricStats.filter(m=>m.calibration==="stretch");

  // Monthly trend
  const byMonth = {};
  for (const d of allDays) {
   const mk = monthKey(d);
   if (!byMonth[mk]) byMonth[mk] = [];
   byMonth[mk].push(computeGoalPct(myData[d]||{},metrics,myGoals,myGoalPeriods));
  }
  const monthAvgs = Object.entries(byMonth)
   .map(([mk,pcts]) => ({ mk, avg: Math.round(pcts.reduce((s,v)=>s+v,0)/pcts.length) }))
   .sort((a,b) => a.mk.localeCompare(b.mk));
  const bestMonth = [...monthAvgs].sort((a,b)=>b.avg-a.avg)[0];
  const curMonthAvg = byMonth[monthKey(today)]?.length
   ? Math.round(byMonth[monthKey(today)].reduce((s,v)=>s+v,0)/byMonth[monthKey(today)].length) : null;
  const trending = monthAvgs.length >= 2
   ? monthAvgs[monthAvgs.length-1].avg - monthAvgs[monthAvgs.length-2].avg : null;

  // Yesterday
  const yd = new Date(todayDate); yd.setDate(yd.getDate()-1);
  const ydk = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,"0")}-${String(yd.getDate()).padStart(2,"0")}`;
  const ydPct = myData[ydk] ? computeGoalPct(myData[ydk], metrics, myGoals, myGoalPeriods) : null;

  // ── Build data cards per template ──────────────────────────────────────
  let cards = [];
  let focusPrompt = "";

  if (templateId === "monday_plan") {
   cards = [
    mondayStats ? { label: "Mondays avg", value: `${mondayStats.avg}%`, sub: `${mondayStats.count} logged`, color: mondayStats.avg >= avgGoalPct ? "up" : "down" } : null,
    lastWeekAvg !== null ? { label: "Last week", value: `${lastWeekAvg}%`, sub: `${lastWeekDays.length}/5 days`, color: lastWeekAvg >= avg30 ? "up" : "down" } : null,
    { label: "30-day avg", value: `${avg30}%`, sub: "goal completion", color: "neutral" },
    bestDow && worstDow && bestDow.dow !== worstDow.dow ? { label: `Best day`, value: bestDow.name, sub: `${bestDow.avg}% avg`, color: "up" } : null,
   ].filter(Boolean);

   focusPrompt = `They're planning their week (Monday plan). Raw data:
- Monday avg: ${mondayStats ? `${mondayStats.avg}% goal completion (${mondayStats.count} Mondays)` : "no Monday data yet"}
- Compared to their overall avg: ${avgGoalPct}% — Mondays are ${mondayStats ? (mondayStats.avg > avgGoalPct ? `${mondayStats.avg - avgGoalPct}pts ABOVE` : `${avgGoalPct - mondayStats.avg}pts BELOW`) : "unknown"}
- Last week: ${lastWeekAvg !== null ? `${lastWeekAvg}% across ${lastWeekDays.length} days` : "not enough data"}
- Best day of week: ${bestDow?.name} (${bestDow?.avg}%), worst: ${worstDow?.name} (${worstDow?.avg}%)
- Goal calibration: ${undershoot.length ? `${undershoot.map(m=>`${m.label} goal ${m.goal} but avg ${m.avg} — too low`).join("; ")}` : stretch.length ? `${stretch.map(m=>`${m.label} goal ${m.goal} but only avg ${m.avg} — gap`).join("; ")}` : "goals appear well-calibrated"}
- Logging gaps: ${gapRate}% of weekdays have zero activity logged

Write ONE direct coaching point for their week plan. Be specific to their Monday pattern vs other days. If their goals are miscalibrated say so bluntly. If Mondays are their worst day, name it. If they frequently don't log, name it. Under 2 sentences.`;

  } else if (templateId === "day_plan") {
   const todayName = dowNames[todayDow] || "today";
   cards = [
    todayDowStats ? { label: `${todayName} avg`, value: `${todayDowStats.avg}%`, sub: `${todayDowStats.count} ${todayName}s`, color: todayDowStats.avg >= avgGoalPct ? "up" : "down" } : null,
    ydPct !== null ? { label: "Yesterday", value: `${ydPct}%`, sub: "of goals", color: ydPct >= avg30 ? "up" : "down" } : null,
    { label: "30-day avg", value: `${avg30}%`, sub: "baseline", color: "neutral" },
    metricStats[0]?.goal ? { label: metricStats[0].label, value: `${metricStats[0].avg}`, sub: `goal: ${metricStats[0].goal}`, color: metricStats[0].calibration === "undershot" ? "up" : metricStats[0].calibration === "stretch" ? "down" : "neutral" } : null,
   ].filter(Boolean);

   focusPrompt = `They're planning today (${todayName}). Data:
- ${todayName} historical avg: ${todayDowStats ? `${todayDowStats.avg}% (${todayDowStats.count} ${todayName}s logged)` : "not enough data"}
- Yesterday: ${ydPct !== null ? `${ydPct}% of goals` : "not logged"}
- 30-day avg: ${avg30}%
- Goal calibration: ${metricStats.filter(m=>m.goal>0).map(m=>`${m.label}: goal ${m.goal}, avg ${m.avg} (${m.calibration||"unknown"})`).join("; ")||"no goals set"}
- Best day: ${bestDow?.name} (${bestDow?.avg}%), worst: ${worstDow?.name} (${worstDow?.avg}%)

Write ONE sharp line about what today historically looks like for them, and whether their goals are realistic. If ${todayName} is their worst day, call it. If they're coming off a bad/good yesterday, reference it. Under 2 sentences.`;

  } else if (templateId === "goal_sprint") {
   const missRate = goalPcts.length ? Math.round(goalPcts.filter(p=>p<80).length/goalPcts.length*100) : 0;
   cards = [
    { label: "Avg goal %", value: `${avgGoalPct}%`, sub: "all time", color: "neutral" },
    { label: "Last 30 days", value: `${avg30}%`, sub: "goal completion", color: avg30 >= avgGoalPct ? "up" : "down" },
    { label: "Sub-80% days", value: `${missRate}%`, sub: "of logged days", color: missRate > 40 ? "down" : "neutral" },
    metricStats[0]?.goal ? { label: metricStats[0].label, value: `avg ${metricStats[0].avg}`, sub: `goal: ${metricStats[0].goal}`, color: metricStats[0].calibration === "undershot" ? "up" : metricStats[0].calibration === "stretch" ? "down" : "neutral" } : null,
   ].filter(Boolean);

   focusPrompt = `They're writing a goal sprint. Their performance history:
- Overall avg: ${avgGoalPct}% of goals
- 30-day avg: ${avg30}% — trending ${avg30 > avgGoalPct ? "above" : "below"} their baseline
- Days below 80% of goals: ${missRate}% of logged days
- Goal calibration: ${metricStats.filter(m=>m.goal>0).map(m=>`${m.label}: goal ${m.goal}, avg ${m.avg} — ${m.calibration==="undershot"?"goal is too easy, avg exceeds it":m.calibration==="stretch"?"big gap, may be unrealistic":"well-calibrated"}`).join("; ")||"no specific goals set"}
- Total days logged: ${allDays.length}

Write ONE direct line about whether their goals are ambitious enough, too aggressive, or well-calibrated based on actual history. Use their numbers. Don't be vague. Under 2 sentences.`;

  } else if (templateId === "month_plan") {
   cards = [
    curMonthAvg !== null ? { label: "This month", value: `${curMonthAvg}%`, sub: "so far", color: curMonthAvg >= avg30 ? "up" : "down" } : null,
    bestMonth ? { label: "Best month", value: bestMonth.mk, sub: `${bestMonth.avg}% avg`, color: "up" } : null,
    { label: "30-day avg", value: `${avg30}%`, sub: "baseline", color: "neutral" },
    trending !== null ? { label: "Trend", value: trending > 0 ? `+${trending}%` : `${trending}%`, sub: "month over month", color: trending > 0 ? "up" : "down" } : null,
   ].filter(Boolean);

   focusPrompt = `They're planning the month. Their track record:
- Best month: ${bestMonth?.mk} at ${bestMonth?.avg}%
- Current month so far: ${curMonthAvg !== null ? `${curMonthAvg}%` : "just started"}
- Month-over-month trend: ${trending !== null ? (trending > 0 ? `up ${trending}pts` : `down ${Math.abs(trending)}pts`) : "not enough months"}
- 30-day avg: ${avg30}%
- Goal calibration: ${metricStats.filter(m=>m.goal>0).map(m=>`${m.label}: avg ${m.avg} vs goal ${m.goal} (${m.calibration||"?"})`).join("; ")||"no goals"}
- Logging consistency: ${gapRate}% of weekdays with zero activity

Write ONE coaching line about what their monthly data actually shows — trajectory, whether their best month was a fluke or a pattern, or if their goals need adjusting. Reference the actual month names. Under 2 sentences.`;
  }

  // ── Fetch AI line ───────────────────────────────────────────────────────
  if (!focusPrompt) { setLoading(false); return; }

  let aiLine = null;
  try {
   await callAI({ model: "claude-haiku-4-5-20251001", messages: [{ role: "user", content: `You are Pacer, a direct AI companion in Cadence for ${currentUser?.name?.split(" ")[0]}.

Read these journal entries. React to the notable ones — first customers, closed deals, personal bests, milestones. Be specific about what happened. Sound like a real colleague, not a bot.

Return JSON only: {"comments": [{"ts": number, "text": "your reaction"}]}
Rules: Max 2 sentences. Be genuinely energized for real wins. Skip generic updates. Only react to entries that deserve it.

Entries:
${entryDescriptions}` }], max_tokens: 600, call_type: "general" })
   aiLine = (data?.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("").trim().replace(/^["']|["']$/g,"");
   if (aiLine && aiLine.length < 10) aiLine = null;
  } catch {}

  setDataCards(cards);
  if (aiLine) setInsight(aiLine);

  try {
   sessionStorage.setItem(sessionKey, JSON.stringify({ insight: aiLine, cards }));
  } catch {}

  setLoading(false);
 }

 const hasContent = loading || insight || dataCards.length > 0;
 if (!hasContent) return null;

 const upColor = "var(--accent)";
 const downColor = "#F87171";
 const neutralColor = "var(--text-muted)";

 return (
  <div style={{ background:"rgba(168,85,247,0.05)", border:"1px solid rgba(168,85,247,0.2)", borderRadius:"16px", overflow:"hidden" }}>
   {/* Header */}
   <div style={{ padding:"10px 14px 8px", borderBottom: (dataCards.length > 0 || loading) ? "1px solid rgba(168,85,247,0.1)" : "none", display:"flex", alignItems:"center", gap:"7px" }}>
    <span style={{ fontSize:"0.8rem" }}>⚡</span>
    <span style={{ fontSize:"0.65rem", fontWeight:"800", color:"#A855F7", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:F }}>Pacer's read</span>
   </div>

   {/* Data cards row */}
   {(loading || dataCards.length > 0) && (
    <div style={{ padding:"10px 14px", display:"flex", gap:"8px", flexWrap:"wrap", borderBottom: (loading || insight) ? "1px solid rgba(168,85,247,0.08)" : "none" }}>
     {loading && dataCards.length === 0 ? (
      [1,2,3].map(i => (
       <div key={i} style={{ background:"rgba(255,255,255,0.04)", borderRadius:"10px", padding:"8px 12px", minWidth:"70px", flex:1 }}>
        <div style={{ height:"16px", background:"rgba(255,255,255,0.06)", borderRadius:"4px", marginBottom:"5px" }} />
        <div style={{ height:"11px", background:"rgba(255,255,255,0.04)", borderRadius:"4px", width:"60%" }} />
       </div>
      ))
     ) : dataCards.map((card, i) => (
      <div key={i} style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"10px", padding:"8px 12px", flex:"1 1 auto", minWidth:"70px" }}>
       <div style={{ fontSize:"0.65rem", color:"var(--text-dim)", fontFamily:F, marginBottom:"3px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{card.label}</div>
       <div style={{ fontSize:"0.95rem", fontWeight:"800", color: card.color==="up" ? upColor : card.color==="down" ? downColor : "var(--text-primary)", fontFamily:F, letterSpacing:"-0.02em", lineHeight:1 }}>{card.value}</div>
       {card.sub && <div style={{ fontSize:"0.62rem", color:"var(--text-dim)", fontFamily:F, marginTop:"2px" }}>{card.sub}</div>}
      </div>
     ))}
    </div>
   )}

   {/* AI coaching line */}
   {(loading && !insight) ? (
    <div style={{ padding:"10px 14px", fontSize:"0.8rem", color:"var(--text-dim)", fontStyle:"italic", fontFamily:F }}>Reviewing your history…</div>
   ) : insight ? (
    <div style={{ padding:"10px 14px", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"10px" }}>
     <div style={{ fontSize:"0.84rem", color:"var(--text-secondary)", lineHeight:1.55, fontFamily:F, flex:1 }}>{insight}</div>
     <button onClick={() => window.dispatchEvent(new CustomEvent("cadence:open-pacer"))}
      style={{ background:"none", border:"none", color:"#A855F7", fontSize:"0.72rem", fontWeight:"700", cursor:"pointer", fontFamily:F, flexShrink:0, padding:"2px 0", whiteSpace:"nowrap", opacity:0.7 }}>
      Ask ⚡
     </button>
    </div>
   ) : null}
  </div>
 );
}


function JournalEntryModal({ currentUser, myData, industryConfig, myGoals, onPostToFeed, onClose, onSaved, initialTemplate, initialAnswers, activeTrackId, initialMode, recentPlanEntry }) {
 const initTmpl = initialTemplate ? JOURNAL_TEMPLATES.find(t => t.id === initialTemplate) || null : null;
 // If initialMode is set or initialTemplate is plan-mode, skip mode picker
 const initMode = initialMode || (initTmpl?.mode === "plan" ? "plan" : initTmpl ? "reflect" : null);
 const [mode, setMode] = useState(initMode); // null | "reflect" | "plan"
 const [step, setStep] = useState(initTmpl ? "write" : initMode ? "pick" : "mode");
 const [template, setTemplate] = useState(initTmpl);
 const scrollRef = useRef(null);
 // Scroll to top of content when entering write step so Pacer insight is visible
 useEffect(() => {
  if (step === "write" && scrollRef.current) scrollRef.current.scrollTop = 0;
 }, [step]);
 const [showAllTemplates, setShowAllTemplates] = useState(false);
 const [customPromptMode, setCustomPromptMode] = useState(false);
 const [customPromptText, setCustomPromptText] = useState("");
 const [customPromptGenerating, setCustomPromptGenerating] = useState(false);
 const [generatedTemplate, setGeneratedTemplate] = useState(null);
 // Pre-populate answers when editing an existing entry
 const [answers, setAnswers] = useState(() => {
  if (!initialAnswers) return {};
  const a = {};
  (initTmpl?.prompts||[]).forEach(p => { if(initialAnswers[p.key]) a[p.key] = initialAnswers[p.key]; });
  // also handle movedNeedle→needle, intention→next legacy keys
  if(initialAnswers.movedNeedle && !a.needle) a.needle = initialAnswers.movedNeedle;
  if(initialAnswers.intention && !a.next) a.next = initialAnswers.intention;
  if(initialAnswers.text) a.text = initialAnswers.text;
  return a;
 });
 const [saving, setSaving] = useState(false);
 const [photo, setPhoto] = useState(null); // { url, type }
 const [photoCaption, setPhotoCaption] = useState("");
 const [photoUploading, setPhotoUploading] = useState(false);
 const photoRef = useRef(null);
 const cameraRef = useRef(null);
 const F = "'DM Sans',system-ui,sans-serif";

 // Generate a one-time Pacer template from user's custom prompt
 async function generateCustomTemplate(prompt) {
  if (!prompt.trim()) return;
  setCustomPromptGenerating(true);
  try {
   const hour = new Date().getHours();
   const timeCtx = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
const data = await callAI({ model: "claude-haiku-4-5-20251001", messages: [{ role: "user", content: `Create a focused journal template for someone who wants to write about: "${prompt}".
It is ${timeCtx}. Their role: ${industryConfig?.label || "professional"}.

Return JSON only:
{
  "id": "custom_${Date.now()}",
  "icon": "✍️",
  "label": "short title (3-4 words max)",
  "desc": "one line description",
  "prompts": [
    {"key": "p1", "label": "first focused question", "placeholder": "helpful hint"},
    {"key": "p2", "label": "second focused question", "placeholder": "helpful hint"},
    {"key": "p3", "label": "what would you do differently or take forward?", "placeholder": "one concrete action"}
  ]
}

Rules: Questions should be specific to what they want to write about. 3 prompts max. Direct and focused.` }], max_tokens: 600, call_type: "journal" })
   const raw = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
   const clean = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
   const parsed = JSON.parse(clean);
   if (parsed?.prompts?.length) {
    setGeneratedTemplate(parsed);
    setTemplate(parsed);
    setStep("write");
   }
  } catch { setCustomPromptGenerating(false); }
  setCustomPromptGenerating(false);
 }

 // Get smart 3 contextual suggestions based on time + day
 function getSmartSuggestions() {
  const hour = new Date().getHours();
  const dow = new Date().getDay();
  const isWeekend = dow === 0 || dow === 6;
  const isFriday = dow === 5;
  const all = JOURNAL_TEMPLATES;
  if (isWeekend) return [all.find(t=>t.id==="weekly"), all.find(t=>t.id==="win"), all.find(t=>t.id==="freewrite")].filter(Boolean);
  if (isFriday && hour >= 15) return [all.find(t=>t.id==="weekly"), all.find(t=>t.id==="growth"), all.find(t=>t.id==="win")].filter(Boolean);
  if (hour < 10) return [all.find(t=>t.id==="intention"), all.find(t=>t.id==="daily"), all.find(t=>t.id==="freewrite")].filter(Boolean);
  if (hour >= 17) return [all.find(t=>t.id==="daily"), all.find(t=>t.id==="win"), all.find(t=>t.id==="growth")].filter(Boolean);
  return [all.find(t=>t.id==="daily"), all.find(t=>t.id==="intention"), all.find(t=>t.id==="win")].filter(Boolean);
 }

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
   const d = new Date(monday); d.setDate(monday.getDate() + i);
   const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
   const dd = myData[dk];
   if (dd && Object.values(dd).some(v => typeof v === "number" && v > 0)) days.push({ dk, data: dd });
  }
  if (!days.length) return null;
  const totals = {};
  metrics.forEach(m => { totals[m.key] = days.reduce((s,d) => s+(d.data[m.key]||0),0); });
  return { totals, activeDays: days.length, metrics };
 }, [myData, industryConfig]);

 async function handlePhotoUpload(file) {
  if (!file) return;
  setPhotoUploading(true);
  try {
   const sb = window._sb;
   const ext = file.name.split(".").pop() || "jpg";
   const path = `posts/journal/${currentUser.id}-${Date.now()}.${ext}`;
   const { error } = await sb.storage.from("activity-media").upload(path, file, { contentType: file.type });
   if (!error) {
    const { data: urlData } = sb.storage.from("activity-media").getPublicUrl(path);
    setPhoto({ url: urlData?.publicUrl, type: file.type });
   }
  } catch {}
  setPhotoUploading(false);
 }

 async function handleSave(andPost) {
  if (!template) return;
  const hasContent = Object.values(answers).some(v => v?.trim()) || !!photo;
  if (!hasContent) return;
  setSaving(true);
  const now = todayStr();
  const wk = weekKey(now);
  const entry = {
   templateId: template.id,
   entryMode: mode || (template.mode === "plan" ? "plan" : "reflect"),
   ...answers,
   userId: currentUser.id,
   userName: currentUser.name,
   trackId: activeTrackId || "default",
   weekStats: weekStats ? { totals: weekStats.totals, activeDays: weekStats.activeDays } : null,
   imageUrl: photo?.url || null,
   photoCaption: photoCaption.trim() || null,
   ts: Date.now(),
  };
  // Scan all journal answers for commitments
  const journalText = Object.values(answers).filter(v=>v?.trim()).join(" ");
  if (journalText) {
   window.dispatchEvent(new CustomEvent("cadence:pacer-scan", { detail: { text: journalText, source: "journal" } }));
   // Pacer responds to what was written — not just scanning for commitments
   window.dispatchEvent(new CustomEvent("cadence:journal-saved", { detail: { text: journalText } }));
  }
  // Async: distill journal entries into Pacer memory (fire-and-forget)
  updatePacerJournalMemory().catch(() => {});
  // Unified journal storage — all entries go to the same store
  // weekKey included on entry for backward compatibility with old weekly reflections
  await saveJournalEntry(currentUser.id, { ...entry, weekKey: wk, movedNeedle: answers.needle || answers.what || answers.gap || "", intention: answers.next || answers.commit || answers.first || "" });
  if (andPost && onPostToFeed) {
   const text = Object.values(answers).filter(v=>v?.trim()).join("\n\n");
   onPostToFeed({
    id: `feed-journal-${currentUser.id}-${Date.now()}`,
    type: "reflection",
    userId: currentUser.id,
    userName: currentUser.name,
    movedNeedle: answers.needle || answers.what || answers.gap || text.slice(0,200),
    intention: answers.next || answers.commit || answers.first || "",
    text,
    imageUrl: photo?.url || null,
    photoCaption: photoCaption.trim() || null,
    ts: Date.now(),
    date: now,
   });
  }
  setSaving(false);
  onSaved();
 }

 const inputSty = { width:"100%", background:"var(--bg-2)", border:"1px solid var(--border-1)", color:"var(--text-primary)", padding:"11px 13px", borderRadius:"10px", fontSize:"0.95rem", fontFamily:F, outline:"none", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 };

 return (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
   onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
   <div style={{ background:"var(--bg-1)", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:"640px", maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 -8px 40px rgba(0,0,0,0.6)", paddingBottom:"env(safe-area-inset-bottom, 0px)" }}>

    {/* Header */}
    <div style={{ padding:"16px 20px 14px", borderBottom:"1px solid var(--border-1)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
     {step === "write" && template ? (
      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
       <button onClick={() => { setStep("pick"); setTemplate(null); setAnswers({}); setPhoto(null); }} style={{ background:"none", border:"none", color:"var(--text-dim)", fontSize:"1.1rem", cursor:"pointer", padding:"2px", WebkitTapHighlightColor:"transparent" }}>←</button>
       <div>
        <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
         <div style={{ fontSize:"1rem", fontWeight:"800", color:"var(--text-primary)", fontFamily:F }}>{template.icon} {template.label}</div>
         {(mode || template.mode) && (
          <span style={{ fontSize:"0.62rem", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.08em", padding:"2px 7px", borderRadius:"20px",
           background: (mode||template.mode) === "plan" ? "rgba(168,85,247,0.12)" : "rgba(29,201,232,0.1)",
           color: (mode||template.mode) === "plan" ? "#A855F7" : "var(--accent)" }}>
           {(mode||template.mode) === "plan" ? "Plan" : "Reflect"}
          </span>
         )}
        </div>
        <div style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>{template.desc}</div>
       </div>
      </div>
     ) : step === "pick" ? (
      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
       {!initialMode && <button onClick={() => { setStep("mode"); setMode(null); }} style={{ background:"none", border:"none", color:"var(--text-dim)", fontSize:"1.1rem", cursor:"pointer", padding:"2px", WebkitTapHighlightColor:"transparent" }}>←</button>}
       <div>
        <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
         <div style={{ fontSize:"1rem", fontWeight:"800", color:"var(--text-primary)", fontFamily:F }}>
          {mode === "plan" ? "📋 Plan" : "🔍 Reflect"}
         </div>
         {mode && (
          <span style={{ fontSize:"0.62rem", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.08em", padding:"2px 7px", borderRadius:"20px",
           background: mode === "plan" ? "rgba(168,85,247,0.12)" : "rgba(29,201,232,0.1)",
           color: mode === "plan" ? "#A855F7" : "var(--accent)" }}>
           {mode === "plan" ? "Plan" : "Reflect"}
          </span>
         )}
        </div>
        <div style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Choose a template</div>
       </div>
      </div>
     ) : (
      <div style={{ fontSize:"1rem", fontWeight:"800", color:"var(--text-primary)", fontFamily:F }}>📓 New Entry</div>
     )}
     <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text-dim)", fontSize:"1.3rem", cursor:"pointer", padding:"2px 6px", lineHeight:1, WebkitTapHighlightColor:"transparent" }}>✕</button>
    </div>

    <div ref={scrollRef} style={{ overflowY:"auto", WebkitOverflowScrolling:"touch", flex:1, padding:"20px" }}>

     {/* Step 0: Mode picker — Reflect or Plan */}
     {step === "mode" && (
      <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
       <div style={{ fontSize:"0.72rem", fontWeight:"800", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"4px" }}>What do you want to do?</div>

       {/* Reflect card */}
       <button onClick={() => { haptic.light(); setMode("reflect"); setStep("pick"); }}
        style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"16px", padding:"20px", cursor:"pointer", textAlign:"left", fontFamily:F, WebkitTapHighlightColor:"transparent", transition:"border-color 0.15s", width:"100%", display:"flex", alignItems:"flex-start", gap:"16px" }}
        onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(29,201,232,0.4)"}
        onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border-1)"}>
        <div style={{ width:"48px", height:"48px", borderRadius:"14px", background:"rgba(29,201,232,0.1)", border:"1px solid rgba(29,201,232,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem", flexShrink:0 }}>🔍</div>
        <div style={{ flex:1 }}>
         <div style={{ fontSize:"1.05rem", fontWeight:"800", color:"var(--text-primary)", marginBottom:"5px", letterSpacing:"-0.01em" }}>Reflect</div>
         <div style={{ fontSize:"0.82rem", color:"var(--text-muted)", lineHeight:1.5 }}>Look back at what happened. Process wins, lessons, and patterns from your recent work.</div>
         <div style={{ fontSize:"0.72rem", color:"var(--accent)", marginTop:"8px", fontWeight:"700" }}>Daily · Weekly · Monthly · Wins · Growth →</div>
        </div>
       </button>

       {/* Plan card */}
       <button onClick={() => { haptic.light(); setMode("plan"); setStep("pick"); }}
        style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"16px", padding:"20px", cursor:"pointer", textAlign:"left", fontFamily:F, WebkitTapHighlightColor:"transparent", transition:"border-color 0.15s", width:"100%", display:"flex", alignItems:"flex-start", gap:"16px" }}
        onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(168,85,247,0.4)"}
        onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border-1)"}>
        <div style={{ width:"48px", height:"48px", borderRadius:"14px", background:"rgba(168,85,247,0.1)", border:"1px solid rgba(168,85,247,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem", flexShrink:0 }}>📋</div>
        <div style={{ flex:1 }}>
         <div style={{ fontSize:"1.05rem", fontWeight:"800", color:"var(--text-primary)", marginBottom:"5px", letterSpacing:"-0.01em" }}>Plan</div>
         <div style={{ fontSize:"0.82rem", color:"var(--text-muted)", lineHeight:1.5 }}>Look forward. Set intentions, commit to targets, and define what success looks like before it happens.</div>
         <div style={{ fontSize:"0.72rem", color:"#A855F7", marginTop:"8px", fontWeight:"700" }}>Today · Week · Month · Goal Sprint →</div>
        </div>
       </button>

       {/* Free write shortcut */}
       <button onClick={() => { haptic.light(); const fw = JOURNAL_TEMPLATES.find(t=>t.id==="freewrite"); setTemplate(fw); setMode("reflect"); setStep("write"); }}
        style={{ background:"none", border:"1px dashed var(--border-1)", borderRadius:"12px", padding:"13px 16px", cursor:"pointer", textAlign:"left", fontFamily:F, WebkitTapHighlightColor:"transparent", display:"flex", alignItems:"center", gap:"12px", width:"100%" }}>
        <span style={{ fontSize:"1.2rem" }}>✍️</span>
        <span style={{ fontSize:"0.85rem", color:"var(--text-muted)", fontWeight:"600" }}>Just write — no template</span>
        <span style={{ color:"var(--text-dim)", marginLeft:"auto", fontSize:"0.8rem" }}>→</span>
       </button>
      </div>
     )}

     {/* Step 1: Pick template — filtered by mode */}
     {step === "pick" && (() => {
      const reflectIds = ["daily","weekly","monthly","quarterly","annual","win","growth","intention","freewrite"];
      const planIds = ["day_plan","monday_plan","goal_sprint","month_plan","intention"];
      const modeTemplates = mode === "plan"
       ? JOURNAL_TEMPLATES.filter(t => planIds.includes(t.id))
       : JOURNAL_TEMPLATES.filter(t => reflectIds.includes(t.id));

      // Smart suggestions still time-aware
      const smart = getSmartSuggestions().filter(t =>
        mode === "plan" ? planIds.includes(t.id) : reflectIds.includes(t.id)
      );
      const smartIds = new Set(smart.map(t=>t.id));
      // For plan mode, show plan templates as "smart" suggestions
      const displaySmart = mode === "plan"
        ? modeTemplates.slice(0, 3)
        : smart.length >= 2 ? smart : modeTemplates.slice(0, 3);
      const displaySmartIds = new Set(displaySmart.map(t=>t.id));
      const rest = modeTemplates.filter(t => !displaySmartIds.has(t.id));

      const accentCol = mode === "plan" ? "rgba(168,85,247,0.4)" : "rgba(29,201,232,0.4)";

      const TmplBtn = ({ t }) => (
       <button key={t.id} onClick={() => { haptic.light(); setTemplate(t); setStep("write"); }}
        style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"12px", padding:"13px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:"13px", textAlign:"left", fontFamily:F, WebkitTapHighlightColor:"transparent", transition:"border-color 0.15s", width:"100%" }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=accentCol}
        onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border-1)"}>
        <span style={{ fontSize:"1.5rem", flexShrink:0 }}>{t.icon}</span>
        <div style={{ flex:1, minWidth:0 }}>
         <div style={{ fontSize:"0.9rem", fontWeight:"700", color:"var(--text-primary)", marginBottom:"2px" }}>{t.label}</div>
         <div style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>{t.desc}</div>
        </div>
        <span style={{ color:"var(--text-dim)", fontSize:"0.85rem", flexShrink:0 }}>→</span>
       </button>
      );
      return (
       <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
        {displaySmart.map(t => <TmplBtn key={t.id} t={t} />)}
        {rest.length > 0 && (
         <>
          <button onClick={() => setShowAllTemplates(v => !v)}
           style={{ background:"none", border:"1px solid var(--border-1)", borderRadius:"10px", padding:"10px 14px", cursor:"pointer", fontSize:"0.8rem", fontWeight:"700", color:"var(--text-muted)", fontFamily:F, textAlign:"center", WebkitTapHighlightColor:"transparent" }}>
           {showAllTemplates ? "↑ Fewer options" : `More options ↓`}
          </button>
          {showAllTemplates && rest.map(t => <TmplBtn key={t.id} t={t} />)}
         </>
        )}
        {/* Pacer custom prompt */}
        <div style={{ marginTop:"4px", borderTop:"1px solid var(--border-1)", paddingTop:"14px" }}>
         {!customPromptMode ? (
          <button onClick={() => setCustomPromptMode(true)}
           style={{ width:"100%", background:"rgba(168,85,247,0.08)", border:"1px solid rgba(168,85,247,0.25)", borderRadius:"12px", padding:"13px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:"12px", textAlign:"left", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
           <span style={{ fontSize:"1.4rem" }}>⚡</span>
           <div style={{ flex:1 }}>
            <div style={{ fontSize:"0.9rem", fontWeight:"700", color:"#A855F7", marginBottom:"2px" }}>
             {mode === "plan" ? "Tell Pacer what you're planning" : "Tell Pacer what you want to write about"}
            </div>
            <div style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Describe it — Pacer builds a custom template</div>
           </div>
           <span style={{ color:"#A855F7", fontSize:"0.85rem", flexShrink:0 }}>→</span>
          </button>
         ) : (
          <div style={{ background:"rgba(168,85,247,0.06)", border:"1px solid rgba(168,85,247,0.2)", borderRadius:"12px", padding:"14px 16px" }}>
           <div style={{ fontSize:"0.72rem", fontWeight:"800", color:"#A855F7", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>⚡ Pacer is listening</div>
           <textarea
            value={customPromptText}
            onChange={e => setCustomPromptText(e.target.value)}
            placeholder={mode === "plan"
             ? "e.g. I have a big presentation Friday and need to plan my prep… or I'm going into a tough week and want to prioritize clearly…"
             : "e.g. I want to reflect on a difficult client conversation today… or I landed a deal I've been chasing for months…"}
            rows={3}
            style={{ width:"100%", background:"var(--bg-2)", border:"1px solid rgba(168,85,247,0.3)", color:"var(--text-primary)", padding:"10px 12px", borderRadius:"8px", fontSize:"0.88rem", fontFamily:F, outline:"none", boxSizing:"border-box", resize:"none", lineHeight:1.55 }}
            autoFocus
           />
           <div style={{ display:"flex", gap:"8px", marginTop:"10px" }}>
            <button onClick={() => { setCustomPromptMode(false); setCustomPromptText(""); }}
             style={{ flex:1, background:"none", border:"1px solid var(--border-1)", borderRadius:"8px", padding:"9px", fontSize:"0.82rem", fontWeight:"700", color:"var(--text-muted)", cursor:"pointer", fontFamily:F }}>
             Cancel
            </button>
            <button onClick={() => generateCustomTemplate(customPromptText)}
             disabled={!customPromptText.trim() || customPromptGenerating}
             style={{ flex:2, background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.35)", borderRadius:"8px", padding:"9px", fontSize:"0.82rem", fontWeight:"800", color:"#A855F7", cursor:"pointer", fontFamily:F, opacity: customPromptText.trim() ? 1 : 0.5, display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
             {customPromptGenerating ? (
              <><div style={{ width:"12px", height:"12px", border:"2px solid rgba(168,85,247,0.3)", borderTopColor:"#A855F7", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} /> Building template…</>
             ) : "Build my template →"}
            </button>
           </div>
          </div>
         )}
        </div>
       </div>
      );
     })()}

     {/* Step 2: Write */}
     {step === "write" && template && (
      <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
       {/* Pacer insight for Plan mode — loads async, shown at top */}
       {(mode === "plan" || template.mode === "plan") && (
        <PacerPlanInsight
         templateId={template.id}
         myData={myData}
         myGoals={myGoals}
         myGoalPeriods={myGoalPeriods}
         industryConfig={industryConfig}
         currentUser={currentUser}
        />
       )}
       {/* Reflect mode — surface what they planned, with actual numbers */}
       {mode !== "plan" && template.mode !== "plan" && recentPlanEntry && (
        <PacerReflectCallback
         templateId={template.id}
         myData={myData}
         myGoals={myGoals}
         industryConfig={industryConfig}
         currentUser={currentUser}
         recentPlanEntry={recentPlanEntry}
        />
       )}
       {weekStats && template.id === "weekly" && (
        <div>
         <div style={{ fontSize:"0.7rem", fontWeight:"700", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>This week's activity</div>
         <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
          {weekStats.metrics.map(m => (
           <div key={m.key} style={{ background:"var(--bg-2)", borderRadius:"8px", padding:"7px 12px", fontSize:"0.85rem" }}>
            <span style={{ color:"var(--text-dim)", marginRight:"5px" }}>{m.short||m.label}</span>
            <span style={{ fontWeight:"800", color:"var(--text-primary)" }}>{weekStats.totals[m.key]||0}</span>
           </div>
          ))}
          <div style={{ background:"var(--bg-2)", borderRadius:"8px", padding:"7px 12px", fontSize:"0.82rem", color:"var(--text-dim)" }}>{weekStats.activeDays}d logged</div>
         </div>
        </div>
       )}

       {template.prompts.map(p => (
        <div key={p.key}>
         <div style={{ fontSize:"0.72rem", fontWeight:"700", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:"8px" }}>{p.label}</div>
         <textarea
          value={answers[p.key] || ""}
          onChange={e => setAnswers(prev => ({ ...prev, [p.key]: e.target.value }))}
          placeholder={p.placeholder}
          rows={p.key === "text" ? 8 : 3}
          style={{ ...inputSty, minHeight: p.key === "text" ? "180px" : "80px" }}
         />
        </div>
       ))}

       {/* Photo — camera capture + upload + caption */}
       <div>
        <div style={{ fontSize:"0.72rem", fontWeight:"700", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:"8px" }}>📷 Photo (optional)</div>
        {/* Hidden inputs: one for camera, one for library */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={e => { if(e.target.files[0]) handlePhotoUpload(e.target.files[0]); }} />
        <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { if(e.target.files[0]) handlePhotoUpload(e.target.files[0]); }} />
        {photo ? (
         <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          <div style={{ position:"relative", display:"inline-block" }}>
           <img src={photo.url} alt="" style={{ maxWidth:"100%", maxHeight:"220px", borderRadius:"10px", display:"block", objectFit:"cover", width:"100%" }} />
           <button onClick={() => { setPhoto(null); setPhotoCaption(""); }} style={{ position:"absolute", top:"6px", right:"6px", background:"rgba(0,0,0,0.75)", border:"none", color:"#fff", borderRadius:"50%", width:"36px", height:"36px", fontSize:"0.9rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", WebkitTapHighlightColor:"transparent" }}>✕</button>
          </div>
          <textarea
           value={photoCaption}
           onChange={e => setPhotoCaption(e.target.value)}
           placeholder="Add a caption… (optional)"
           rows={2}
           style={{ ...inputSty, minHeight:"56px", fontSize:"0.9rem", resize:"none" }}
          />
         </div>
        ) : (
         <div style={{ display:"flex", gap:"8px" }}>
          {/* Take photo — camera (getUserMedia on desktop, capture on mobile) */}
          <button onClick={async () => {
            haptic.light();
            if (navigator.mediaDevices?.getUserMedia) {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(t => t.stop()); // we got permission, use input
              } catch {}
            }
            cameraRef.current?.click();
          }} disabled={photoUploading}
           style={{ flex:1, background:"rgba(29,201,232,0.06)", border:"1px solid rgba(29,201,232,0.25)", borderRadius:"10px", padding:"14px 12px", cursor:"pointer", color:"var(--accent)", fontSize:"0.88rem", fontFamily:F, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"6px", WebkitTapHighlightColor:"transparent" }}>
           <span style={{ fontSize:"1.4rem" }}>📸</span>
           <span style={{ fontWeight:"600", fontSize:"0.8rem" }}>Take Photo</span>
          </button>
          {/* Upload from library */}
          <button onClick={() => { haptic.light(); photoRef.current?.click(); }} disabled={photoUploading}
           style={{ flex:1, background:"var(--bg-2)", border:"1px dashed var(--border-1)", borderRadius:"10px", padding:"14px 12px", cursor:"pointer", color:"var(--text-muted)", fontSize:"0.88rem", fontFamily:F, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"6px", WebkitTapHighlightColor:"transparent" }}>
           <span style={{ fontSize:"1.4rem" }}>{photoUploading ? "⏳" : "🖼️"}</span>
           <span style={{ fontWeight:"600", fontSize:"0.8rem" }}>{photoUploading ? "Uploading…" : "Choose Photo"}</span>
          </button>
         </div>
        )}
       </div>
      </div>
     )}
    </div>

    {/* Footer */}
    {step === "write" && template && (
     <div style={{ padding:"14px 20px 28px", borderTop:"1px solid var(--border-1)", display:"flex", flexDirection:"column", gap:"8px", flexShrink:0 }}>
      <button onClick={() => { haptic.success(); handleSave(false); }} disabled={saving || (!Object.values(answers).some(v=>v?.trim()) && !photo)}
       style={{ width:"100%", background:"var(--accent)", color:"#000", border:"none", padding:"13px", borderRadius:"12px", fontWeight:"800", fontSize:"0.95rem", cursor:"pointer", fontFamily:F, minHeight:"48px", opacity:(Object.values(answers).some(v=>v?.trim())||photo)?1:0.4 }}>
       {saving ? "Saving…" : "Save to Journal"}
      </button>
      {onPostToFeed && (
       <button onClick={() => { haptic.medium(); handleSave(true); }} disabled={saving || (!Object.values(answers).some(v=>v?.trim()) && !photo)}
        style={{ width:"100%", background:"none", border:"1px solid var(--border-1)", color:"var(--text-secondary)", padding:"12px", borderRadius:"12px", fontWeight:"600", fontSize:"0.88rem", cursor:"pointer", fontFamily:F, minHeight:"44px", opacity:(Object.values(answers).some(v=>v?.trim())||photo)?1:0.4 }}>
        Save & Share to Team Feed
       </button>
      )}
     </div>
    )}
   </div>
  </div>
 );
}

// ── ReflectionModal — full-screen overlay journal entry ─────────────
function WeeklyReflectionPrompt({ currentUser, industryConfig, weekKeyStr, myData, myGoals, onSubmit, onDismiss, onPostToFeed }) {
 const [step, setStep] = useState("prompt"); // "prompt" | "form" | "done"
 const [viewMode, setViewMode] = useState("avg"); // "avg" | "total"
 const [wins, setWins] = useState("");
 const [movedNeedle, setMovedNeedle] = useState("");
 const [intention, setIntention] = useState("");
 const [saving, setSaving] = useState(false);
 const [lastWeekReflection, setLastWeekReflection] = useState(null);
 const [loadingLast, setLoadingLast] = useState(true);

 // Load last week's reflection for the "remind them" step
 useEffect(() => {
  if (step !== "form") return;
  const prevWk = getPrevWeekKey(weekKeyStr);
  loadWeeklyReflection(currentUser.id, prevWk)
   .then(r => setLastWeekReflection(r))
   .catch(() => {})
   .finally(() => setLoadingLast(false));
 }, [step, currentUser.id, weekKeyStr]);

 // Compute this week's activity stats from logged data
 const weekStats = useMemo(() => {
  if (!myData || !industryConfig) return null;
  const metrics = industryConfig.weekdayMetrics || [];
  if (!metrics.length) return null;

  // Get Mon–Sun of the current week
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const days = [];
  for (let i = 0; i < 7; i++) {
   const d = new Date(monday);
   d.setDate(monday.getDate() + i);
   const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
   const dayData = myData[dk];
   if (dayData && Object.values(dayData).some(v => typeof v === "number" && v > 0)) {
    days.push({ dk, data: dayData });
   }
  }

  if (!days.length) return null;

  const totals = {};
  metrics.forEach(m => {
   totals[m.key] = days.reduce((sum, d) => sum + (d.data[m.key] || 0), 0);
  });

  const activeDays = days.length;
  const avgs = {};
  metrics.forEach(m => { avgs[m.key] = activeDays > 0 ? (totals[m.key] / activeDays) : 0; });

  return { totals, avgs, activeDays, metrics };
 }, [myData, industryConfig, weekKeyStr]);

 function getPrevWeekKey(wk) {
  // wk is the result of weekKey(todayStr()) from shared.js
  // Just load by going back 7 days from the monday of this week
  const today = new Date();
  const dow = today.getDay();
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const ds = `${lastMonday.getFullYear()}-${String(lastMonday.getMonth()+1).padStart(2,"0")}-${String(lastMonday.getDate()).padStart(2,"0")}`;
  return weekKey(ds);
 }

 async function handleSave(andPost) {
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
  setStep("done");
  if (andPost && (movedNeedle.trim() || intention.trim())) {
   onPostToFeed(reflection);
  } else {
   setTimeout(() => onSubmit(reflection), 900);
  }
 }

 // ── Shared styles ──────────────────────────────────────────────────
 const card = { background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "14px" };
 const section = { marginBottom: "20px" };
 const labelStyle = { fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" };
 const inputStyle = { width: "100%", background: "var(--bg-3)", border: "1px solid var(--border-1)", color: "var(--text-primary)", padding: "11px 13px", borderRadius: "10px", fontSize: "0.9rem", fontFamily: F, outline: "none", boxSizing: "border-box" };
 const taStyle = { ...inputStyle, resize: "vertical", minHeight: "80px", lineHeight: 1.55 };

 // ── Step: prompt (teaser card) ──────────────────────────────────────
 if (step === "prompt") return (
  <div style={{ ...card, padding: "16px 18px" }}>
   <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
    <div>
     <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F, marginBottom: "3px" }}>Week in review</div>
     <div style={{ fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: 1.5 }}>How did this week go?</div>
    </div>
    <button onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "1rem", cursor: "pointer", padding: "2px 4px", lineHeight: 1, flexShrink: 0 }}>✕</button>
   </div>
   <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
    <button onClick={() => setStep("form")} style={{ flex: 1, background: "var(--accent)", color: "#000", border: "none", padding: "10px", borderRadius: "10px", fontWeight: "700", fontSize: "0.88rem", cursor: "pointer", fontFamily: F, minHeight: "44px" }}>Reflect →</button>
    <button onClick={onDismiss} style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-muted)", padding: "10px 16px", borderRadius: "10px", cursor: "pointer", fontFamily: F, fontSize: "0.85rem", minHeight: "44px" }}>Later</button>
   </div>
  </div>
 );

 // ── Step: done ──────────────────────────────────────────────────────
 if (step === "done") return (
  <div style={{ ...card, padding: "20px 18px", textAlign: "center" }}>
   <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F, marginBottom: "4px" }}>Reflection saved.</div>
   <div style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>See you next week.</div>
  </div>
 );

 // ── Step: form ──────────────────────────────────────────────────────
 return (
  <div style={{ ...card, padding: "20px 18px" }}>
   <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F, marginBottom: "18px" }}>Week in review</div>

   {/* Activity summary — pre-populated from logged data */}
   {weekStats && (
    <div style={{ ...section }}>
     <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
      <div style={labelStyle}>Your activity this week</div>
      {/* Avg / Total toggle */}
      <div style={{ display: "flex", background: "var(--bg-3)", borderRadius: "8px", padding: "2px", gap: "2px" }}>
       {[["avg", "Avg / day"], ["total", "Totals"]].map(([v, l]) => (
        <button key={v} onClick={() => setViewMode(v)} style={{ padding: "3px 10px", borderRadius: "6px", border: "none", cursor: "pointer", fontFamily: F, fontSize: "0.72rem", fontWeight: "700", background: viewMode === v ? "var(--bg-1)" : "none", color: viewMode === v ? "var(--text-primary)" : "var(--text-dim)", transition: "all 0.12s", WebkitTapHighlightColor: "transparent" }}>{l}</button>
       ))}
      </div>
     </div>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
      {weekStats.metrics.map(m => {
       const val = viewMode === "avg" ? weekStats.avgs[m.key] : weekStats.totals[m.key];
       const goal = myGoals?.[m.key] ?? m.defaultGoal;
       const pct = goal > 0 ? Math.min(1, (viewMode === "avg" ? weekStats.avgs[m.key] : weekStats.totals[m.key] / (weekStats.activeDays || 1)) / goal) : 0;
       return (
        <div key={m.key} style={{ background: "var(--bg-3)", borderRadius: "10px", padding: "10px 12px" }}>
         <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "4px", fontFamily: F }}>{m.short || m.label}</div>
         <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "var(--text-primary)", fontFamily: F, lineHeight: 1 }}>
          {viewMode === "avg" ? (val % 1 === 0 ? val : val.toFixed(1)) : val}
         </div>
         {viewMode === "avg" && goal > 0 && (
          <div style={{ marginTop: "5px", height: "3px", background: "var(--bg-1)", borderRadius: "2px", overflow: "hidden" }}>
           <div style={{ height: "100%", width: `${Math.round(pct * 100)}%`, background: pct >= 1 ? "#4ACF86" : "var(--accent)", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>
         )}
        </div>
       );
      })}
     </div>
     <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "8px" }}>
      {weekStats.activeDays} day{weekStats.activeDays !== 1 ? "s" : ""} logged this week
      {viewMode === "avg" && " · Goal bars show daily avg vs. daily goal"}
     </div>
    </div>
   )}

   {/* Wins / results — the correlation data */}
   <div style={section}>
    <div style={labelStyle}>Wins & results <span style={{ fontWeight: "400", textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
    <input
     value={wins}
     onChange={e => setWins(e.target.value)}
     placeholder="Wins, milestones, results — what happened this week?"
     style={inputStyle}
    />
   </div>

   {/* What moved the needle */}
   <div style={section}>
    <div style={labelStyle}>What moved the needle this week?</div>
    <textarea
     value={movedNeedle}
     onChange={e => setMovedNeedle(e.target.value)}
     placeholder="What actually moved the needle — or held you back?"
     style={taStyle}
    />
   </div>

   {/* Last week's intention — shown before asking for next week's */}
   {!loadingLast && lastWeekReflection?.intention && (
    <div style={{ ...section, background: "var(--bg-3)", borderRadius: "10px", padding: "12px 14px" }}>
     <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Last week you wanted to focus on</div>
     <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.55, fontFamily: F }}>{lastWeekReflection.intention}</div>
    </div>
   )}

   {/* Intention heading into next week */}
   <div style={section}>
    <div style={labelStyle}>Heading into next week, I want to focus on</div>
    <textarea
     value={intention}
     onChange={e => setIntention(e.target.value)}
     placeholder="One thing. Be specific."
     rows={2}
     style={{ ...taStyle, minHeight: "64px" }}
    />
   </div>

   {/* Action buttons — save privately or share to feed */}
   <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
    <button
     onClick={() => { haptic.success(); handleSave(false); }}
     disabled={saving}
     style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "700", fontSize: "0.92rem", cursor: "pointer", fontFamily: F, minHeight: "44px" }}>
     {saving ? "Saving…" : "Save reflection"}
    </button>
    {(movedNeedle.trim() || intention.trim()) && (
     <button
      onClick={() => { haptic.success(); handleSave(true); }}
      disabled={saving}
      style={{ width: "100%", background: "none", border: "1px solid var(--border-1)", color: "var(--text-secondary)", padding: "11px", borderRadius: "10px", fontWeight: "600", fontSize: "0.88rem", cursor: "pointer", fontFamily: F, minHeight: "44px" }}>
      Save & share to team feed
     </button>
    )}
    <button onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--text-dim)", padding: "8px", borderRadius: "10px", cursor: "pointer", fontFamily: F, fontSize: "0.83rem", minHeight: "36px" }}>
     Skip for now
    </button>
   </div>
  </div>
 );
}

function NotificationsPanel({ notifs, unread, onMarkAllRead, onMarkRead, onClose, onNavigate }) {
 return (
  <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 108px)", left: "8px", right: "8px", maxWidth: "360px", margin: "0 auto", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 300, overflow: "hidden" }}>
   <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F }}>🔔 Notifications {unread > 0 && <span style={{ background: "var(--accent)", color: "#000", borderRadius: "10px", padding: "1px 7px", fontSize: "0.72rem", fontWeight: "800", marginLeft: "4px" }}>{unread}</span>}</div>
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
     {unread > 0 && <button onClick={onMarkAllRead} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer", fontFamily: F }}>Mark all read</button>}
     <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "1rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
    </div>
   </div>
   <div style={{ maxHeight: "400px", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
    {notifs.length === 0 && <div style={{ padding: "32px 16px", textAlign: "center", fontSize: "0.9rem", color: "var(--text-dim)", fontStyle: "italic" }}>No notifications yet.</div>}
    {notifs.slice(0, 30).map(n => (
     <div key={n.id} onClick={() => { onMarkRead(n.id); if (n.link) onNavigate(n.link); onClose(); }}
      style={{ padding: "10px 16px", borderBottom: "1px solid var(--bg-3)", cursor: "pointer", background: n.read ? "transparent" : "rgba(29,201,232,0.05)", display: "flex", gap: "10px", alignItems: "flex-start" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-2)"} onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "rgba(29,201,232,0.05)"}>
      <div style={{ fontSize: "1.2rem", flexShrink: 0, marginTop: "1px" }}>{n.icon || "🔔"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
       <div style={{ fontSize: "0.88rem", color: n.read ? "var(--text-secondary)" : "var(--text-primary)", lineHeight: 1.45, fontFamily: F }}>{n.text}</div>
       <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "3px" }}>{relTimeStatic(n.ts)}</div>
      </div>
      {!n.read && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: "5px" }} />}
     </div>
    ))}
   </div>
  </div>
 );
}


// ── ChallengeBoard ───────────────────────────────────────────────────
// Pre-built challenge templates — one-tap to launch
const CHALLENGE_TEMPLATES = [
 // Quick / daily
 { id:'daily-100',     icon:'🎯', label:'Hit 100% Today',      desc:'First to hit every daily goal',          type:'first',  metricHint:null,        targetHint:null,  endsIn:'today', category:'quick'  },
 { id:'friday-finish', icon:'💥', label:'Friday Finish Strong', desc:'Most total activity by end of Friday',   type:'most',   metricHint:null,        targetHint:null,  endsIn:'week',  category:'quick'  },
 // Volume sprints
 { id:'sprint-calls',  icon:'📞', label:'Call Sprint',          desc:'First to 100 calls wins',                type:'first',  metricHint:'calls',     targetHint:100,   endsIn:'week',  category:'sprint' },
 { id:'meeting-blitz', icon:'🤝', label:'Meeting Blitz',         desc:'Most meetings booked this week',         type:'most',   metricHint:'meetings',  targetHint:null,  endsIn:'week',  category:'sprint' },
 { id:'email-bomb',    icon:'📧', label:'Email Blitz',           desc:'Most emails sent by Friday',             type:'most',   metricHint:'emails',    targetHint:null,  endsIn:'week',  category:'sprint' },
 { id:'demo-dash',     icon:'🖥️', label:'Demo Dash',             desc:'First to 10 demos this week',           type:'first',  metricHint:'demos',     targetHint:10,    endsIn:'week',  category:'sprint' },
 // Endurance
 { id:'most-week',     icon:'📊', label:'Most This Week',        desc:'Highest total activity by Friday',       type:'most',   metricHint:null,        targetHint:null,  endsIn:'week',  category:'endurance' },
 { id:'30day-grind',   icon:'💪', label:'30-Day Grind',          desc:'Most total activity over a full month',  type:'most',   metricHint:null,        targetHint:null,  endsIn:'month', category:'endurance' },
 { id:'streak-champ',  icon:'🔥', label:'Streak Champion',       desc:'Longest streak by month end',            type:'streak', metricHint:null,        targetHint:null,  endsIn:'month', category:'endurance' },
 { id:'consistency',   icon:'📅', label:'Most Consistent',       desc:'Most days logged this month',            type:'most',   metricHint:null,        targetHint:null,  endsIn:'month', category:'endurance' },
];

function ChallengeBoard({ spaceId, currentUser, allUsers, allUsersData, industryConfigs, allUserGoals, isAdmin, onNotify }) {
 const [challenges, setChallenges] = useState([]);
 const [showCreate, setShowCreate] = useState(false);
 const [templateMode, setTemplateMode] = useState(true); // show templates first
 const [title, setTitle] = useState("");
 const [metricKey, setMetricKey] = useState("");
 const [target, setTarget] = useState("");
 const [endsIn, setEndsIn] = useState("week");
 const [challengeType, setChallengeType] = useState("first"); // "first" | "most" | "streak"

 useEffect(() => {
  if (!spaceId) return;
  loadChallenges(spaceId).then(setChallenges).catch(() => {});
  const iv = setInterval(() => loadChallenges(spaceId).then(setChallenges).catch(() => {}), 15000);
  return () => clearInterval(iv);
 }, [spaceId]);

 const myIndustryCfg = currentUser ? (industryConfigs[currentUser.industry] || Object.values(industryConfigs)[0]) : null;
 const availableMetrics = myIndustryCfg?.weekdayMetrics || [];

 async function createChallenge() {
  if (!title.trim() || !metricKey || !target) return;
  const now = Date.now();
  const endTs = endsIn === "today"  ? new Date(new Date().setHours(23,59,59,999)).getTime()
              : endsIn === "week"   ? now + 7  * 86400000
              : endsIn === "month"  ? now + 30 * 86400000
              :                       now + 3  * 86400000;
  const ch = {
   id: `ch-${now}`, title: title.trim(), metricKey,
   target: Number(target), type: challengeType,
   createdBy: currentUser.id, createdByName: currentUser.name,
   ts: now, startTs: now, endTs,
   participants: [currentUser.id], active: true
  };
  const next = [ch, ...challenges].slice(0, 30);
  await saveChallenges(spaceId, next);
  setChallenges(next);
  setShowCreate(false); setTitle(""); setMetricKey(""); setTarget(""); setEndsIn("week");
  if (onNotify) onNotify({ icon: "⚡", text: `${currentUser.name} started a challenge: "${ch.title}"`, link: "dashboard" });
 }

 async function joinChallenge(chId) {
  if (!currentUser) return;
  const next = challenges.map(ch =>
   ch.id === chId ? { ...ch, participants: [...new Set([...ch.participants, currentUser.id])] } : ch
  );
  await saveChallenges(spaceId, next);
  setChallenges(next);
 }

 async function endChallenge(chId) {
  const next = challenges.map(ch => ch.id === chId ? { ...ch, active: false } : ch);
  await saveChallenges(spaceId, next);
  setChallenges(next);
 }

 const nowMs = Date.now();
 const nowStr = todayStr();
 const active = challenges.filter(ch => ch.active && ch.endTs > nowMs);
 const past   = challenges.filter(ch => !ch.active || ch.endTs <= nowMs).slice(0, 5);

 // Compute scores: sum of metric across all days within challenge window
 function getScores(ch) {
  return ch.participants.map(uid => {
   const u = allUsers.find(x => x.id === uid);
   const uData = allUsersData[uid] || {};
   let val = 0;
   for (const [date, dayData] of Object.entries(uData)) {
    const ts = new Date(date).getTime();
    if (ts >= ch.startTs && ts <= ch.endTs && dayData) {
     if (ch.type === "streak") {
      // Count consecutive logged days within window
      val = computeStreak(uData).current;
     } else {
      val += dayData[ch.metricKey] || 0;
     }
    }
   }
   // endTs already bounds the date range above, no extra override needed
   return { uid, name: u?.name || "?", val, u };
  }).sort((a, b) => b.val - a.val);
 }

 const typeLabels = { first: "First to", most: "Most by end", streak: "Longest streak" };

 return (
  <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

   {/* Create button / form */}
   {isAdmin && !showCreate && (
    <button onClick={() => { setShowCreate(true); setTemplateMode(true); }} style={{
     background:"none", border:"1px dashed rgba(245,158,11,0.4)",
     color:"#F59E0B", padding:"12px", borderRadius:"10px",
     fontSize:"0.85rem", cursor:"pointer", fontFamily:F, fontWeight:"600",
     WebkitTapHighlightColor:"transparent", minHeight:"44px"
    }}>⚡ New Challenge</button>
   )}

   {showCreate && templateMode && (
    <div style={{ background:"var(--bg-2)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:"12px", padding:"14px", display:"flex", flexDirection:"column", gap:"10px" }}>
     <div style={{ fontSize:"0.72rem", fontWeight:"800", color:"#F59E0B", textTransform:"uppercase", letterSpacing:"0.1em" }}>Choose a template</div>
     <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
      {CHALLENGE_TEMPLATES.map(t => {
       const firstMetric = availableMetrics.find(m => m.key === (t.metricHint || availableMetrics[0]?.key)) || availableMetrics[0];
       return (
        <button key={t.id} onClick={() => {
         setTitle(t.label);
         setChallengeType(t.type);
         setMetricKey(t.metricHint ? (availableMetrics.find(m=>m.key===t.metricHint)?.key || availableMetrics[0]?.key || '') : (availableMetrics[0]?.key || ''));
         setTarget(t.targetHint ? String(t.targetHint) : '');
         setEndsIn(t.endsIn);
         setTemplateMode(false);
        }} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"11px 13px", background:"var(--bg-3)", border:"1px solid var(--border-1)", borderRadius:"9px", cursor:"pointer", fontFamily:F, textAlign:"left", WebkitTapHighlightColor:"transparent" }}>
         <span style={{ fontSize:"1.2rem", flexShrink:0 }}>{t.icon}</span>
         <div style={{ flex:1 }}>
          <div style={{ fontSize:"0.85rem", fontWeight:"700", color:"var(--text-primary)" }}>{t.label}</div>
          <div style={{ fontSize:"0.72rem", color:"var(--text-dim)", marginTop:"1px" }}>{t.desc}</div>
         </div>
         <span style={{ fontSize:"0.72rem", color:"var(--text-dim)" }}>→</span>
        </button>
       );
      })}
     </div>
     <div style={{ display:"flex", gap:"8px" }}>
      <button onClick={() => { setTemplateMode(false); setTitle(''); setChallengeType('first'); setMetricKey(''); setTarget(''); setEndsIn('week'); }} style={{ flex:1, background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"10px", borderRadius:"8px", cursor:"pointer", fontFamily:F, fontSize:"0.82rem" }}>Custom →</button>
      <button onClick={() => setShowCreate(false)} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"10px 14px", borderRadius:"8px", cursor:"pointer", fontFamily:F }}>Cancel</button>
     </div>
    </div>
   )}

   {showCreate && !templateMode && (
    <div style={{ background:"var(--bg-2)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:"12px", padding:"14px", display:"flex", flexDirection:"column", gap:"10px" }}>
     <button onClick={() => setTemplateMode(true)} style={{ alignSelf:"flex-start", background:"none", border:"none", color:"var(--text-dim)", cursor:"pointer", fontSize:"0.8rem", padding:"0", fontFamily:F }}>← Templates</button>
     {/* Type selector */}
     <div style={{ display:"flex", gap:"5px" }}>
      {[["first","🥇 First to"],["most","📊 Most by end"],["streak","🔥 Best streak"]].map(([t,l]) => (
       <button key={t} onClick={() => setChallengeType(t)} style={{
        flex:1, background: challengeType===t ? "rgba(245,158,11,0.15)" : "var(--bg-3)",
        border:`1px solid ${challengeType===t ? "rgba(245,158,11,0.5)" : "var(--border-1)"}`,
        color: challengeType===t ? "#F59E0B" : "var(--text-muted)",
        padding:"10px 4px", borderRadius:"8px", fontSize:"0.72rem", fontWeight:"700",
        cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent", minHeight:"40px"
       }}>{l}</button>
      ))}
     </div>
     <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
      <select style={{ flex:"1 1 130px", background:"var(--bg-3)", border:"1px solid var(--border-1)", color:"var(--text-primary)", padding:"10px 8px", borderRadius:"8px", fontSize:"0.85rem", fontFamily:F }} value={metricKey} onChange={e => setMetricKey(e.target.value)}>
       <option value="">Metric...</option>
       {availableMetrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
      </select>
      {challengeType !== "streak" && (
       <input style={{ flex:"0 0 70px", minWidth:0, background:"var(--bg-3)", border:"1px solid var(--border-1)", color:"var(--text-primary)", padding:"10px 8px", borderRadius:"8px", fontSize:"1rem", fontFamily:F, outline:"none", boxSizing:"border-box" }} placeholder="Target" type="number" min="1" value={target} onChange={e => setTarget(e.target.value)} />
      )}
      <select style={{ flex:"1 1 110px", background:"var(--bg-3)", border:"1px solid var(--border-1)", color:"var(--text-primary)", padding:"10px 8px", borderRadius:"8px", fontSize:"0.85rem", fontFamily:F }} value={endsIn} onChange={e => setEndsIn(e.target.value)}>
       <option value="today">Ends today</option>
       <option value="3days">3 days</option>
       <option value="week">This week</option>
       <option value="month">This month</option>
      </select>
     </div>
     <div style={{ display:"flex", gap:"6px" }}>
      <button onClick={() => { haptic.success(); createChallenge(); }} disabled={!title.trim() || !metricKey || (challengeType !== "streak" && !target)} style={{ flex:1, background:"#F59E0B", color:"#000", border:"none", padding:"10px", borderRadius:"8px", fontWeight:"800", fontFamily:F, cursor:"pointer", fontSize:"0.88rem", opacity:(!title.trim()||!metricKey||(challengeType!=="streak"&&!target))?"0.4":"1" }}>
       ⚡ Launch
      </button>
      <button onClick={() => setShowCreate(false)} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"10px 14px", borderRadius:"8px", cursor:"pointer", fontFamily:F }}>Cancel</button>
     </div>
    </div>
   )}

   {/* Active challenges */}
   {active.length === 0 && !showCreate && (
    <div style={{ textAlign:"center", padding:"20px 10px" }}>
     <div style={{ fontSize:"1.5rem", marginBottom:"8px", opacity:0.4 }}>⚡</div>
     <div style={{ fontSize:"0.85rem", color:"var(--text-dim)", lineHeight:1.5 }}>No active challenges.{isAdmin ? "" : " Ask an admin to start one."}</div>
    </div>
   )}

   {active.map(ch => {
    const scores = getScores(ch);
    const hasJoined = ch.participants.includes(currentUser?.id);
    const metricCfg = availableMetrics.find(m => m.key === ch.metricKey) || { label: ch.metricKey, short: ch.metricKey };
    const timeLeft = ch.endTs - nowMs;
    const hoursLeft = Math.floor(timeLeft / 3600000);
    const timeStr = hoursLeft > 48 ? `${Math.floor(hoursLeft/24)}d left` : hoursLeft > 0 ? `${hoursLeft}h left` : "Ending soon";
    const leader = scores[0];
    const myScore = scores.find(s => s.uid === currentUser?.id);
    const maxVal = scores[0]?.val || 1;

    return (
     <div key={ch.id} style={{ background:"var(--bg-2)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:"12px", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"11px 14px", background:"rgba(245,158,11,0.06)", borderBottom:"1px solid rgba(245,158,11,0.15)", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"8px" }}>
       <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:"0.88rem", fontWeight:"800", color:"#F59E0B", fontFamily:F }}>⚡ {ch.title}</div>
        <div style={{ fontSize:"0.72rem", color:"var(--text-dim)", marginTop:"3px" }}>
         {typeLabels[ch.type] || "First to"}{ch.type !== "streak" ? ` ${ch.target} ${metricCfg.short || metricCfg.label}` : ""} · {timeStr} · {ch.participants.length} in
        </div>
       </div>
       <div style={{ display:"flex", gap:"5px", flexShrink:0 }}>
        {!hasJoined && <button onClick={() => { haptic.medium(); joinChallenge(ch.id); }} style={{ background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.4)", color:"#F59E0B", padding:"6px 12px", borderRadius:"7px", fontSize:"0.8rem", cursor:"pointer", fontFamily:F, fontWeight:"700", minHeight:"36px", WebkitTapHighlightColor:"transparent" }}>Join</button>}
        {isAdmin && <button onClick={() => endChallenge(ch.id)} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-dim)", padding:"6px 10px", borderRadius:"7px", fontSize:"0.72rem", cursor:"pointer", fontFamily:F, minHeight:"36px", WebkitTapHighlightColor:"transparent" }}>End</button>}
       </div>
      </div>
      {/* Leaderboard */}
      <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:"7px" }}>
       {scores.slice(0, 5).map((sc, i) => {
        const pct = ch.type === "streak" ? Math.min(100, sc.val * 10) : Math.min(100, Math.round((sc.val / (ch.type === "first" ? ch.target : maxVal)) * 100));
        const isMe = sc.uid === currentUser?.id;
        const won = ch.type !== "streak" && sc.val >= ch.target;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
        return (
         <div key={sc.uid} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"18px", fontSize:"0.78rem", textAlign:"center", flexShrink:0 }}>
           {won ? "✅" : medal || <span style={{ color:"var(--text-dim)", fontSize:"0.72rem" }}>{i+1}</span>}
          </div>
          <div style={{ fontSize:"0.82rem", color: isMe ? "var(--accent)" : "var(--text-primary)", fontFamily:F, fontWeight: isMe ? "800" : "500", flex:"0 0 auto", maxWidth:"80px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
           {isMe ? "You" : sc.name.split(" ")[0]}
          </div>
          <div style={{ flex:2, height:"5px", background:"var(--bg-3)", borderRadius:"3px", overflow:"hidden" }}>
           <div style={{ height:"100%", width:`${pct}%`, background: won ? "#4ACF86" : isMe ? "var(--accent)" : "#F59E0B", borderRadius:"3px", transition:"width 0.4s" }}/>
          </div>
          <div style={{ fontSize:"0.8rem", color: won ? "#4ACF86" : isMe ? "var(--accent)" : "var(--text-muted)", fontWeight:"700", fontFamily:F, flexShrink:0, minWidth:"26px", textAlign:"right" }}>{sc.val}</div>
         </div>
        );
       })}
      </div>
     </div>
    );
   })}

   {/* Past challenges */}
   {past.length > 0 && (
    <details style={{ marginTop:"4px" }}>
     <summary style={{ fontSize:"0.72rem", color:"var(--text-dim)", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:"700", userSelect:"none", WebkitTapHighlightColor:"transparent" }}>Past challenges ({past.length})</summary>
     <div style={{ marginTop:"8px", display:"flex", flexDirection:"column", gap:"6px" }}>
      {past.map(ch => {
       const scores = getScores(ch);
       const winner = scores[0];
       const metricCfg = availableMetrics.find(m => m.key === ch.metricKey) || { label: ch.metricKey };
       return (
        <div key={ch.id} style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"8px", padding:"8px 12px", display:"flex", alignItems:"center", gap:"10px", opacity:0.7 }}>
         <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:"0.82rem", fontWeight:"700", color:"var(--text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ch.title}</div>
          <div style={{ fontSize:"0.72rem", color:"var(--text-dim)", marginTop:"1px" }}>{metricCfg.label} · {new Date(ch.endTs).toLocaleDateString()}</div>
         </div>
         {winner && <div style={{ fontSize:"0.82rem", color:"var(--text-muted)", flexShrink:0 }}>🏆 {winner.name.split(" ")[0]} ({winner.val})</div>}
        </div>
       );
      })}
     </div>
    </details>
   )}
  </div>
 );
}



// ── AccountabilityPairs ───────────────────────────────────────────────
function AccountabilityPairs({ spaceId, currentUser, allUsers, allUsersData, industryConfigs, allUserGoals, onOpenDm }) {
 const [pairs, setPairs] = useState([]);
 const [showCreate, setShowCreate] = useState(false);
 const [selectedPartners, setSelectedPartners] = useState([]);
 const [groupName, setGroupName] = useState("");

 useEffect(() => {
  if (!spaceId) return;
  loadAccountabilityPairs(spaceId).then(setPairs).catch(() => {});
  const iv = setInterval(() => loadAccountabilityPairs(spaceId).then(setPairs).catch(() => {}), 20000);
  return () => clearInterval(iv);
 }, [spaceId]);

 // My active pairs/groups
 const myPairs = pairs.filter(p => p.active && p.members.includes(currentUser?.id));
 const now = todayStr();

 async function createPair() {
  if (!selectedPartners.length) return;
  const members = [...new Set([currentUser.id, ...selectedPartners])];
  const name = groupName.trim() || (members.length === 2
   ? `${currentUser.name.split(" ")[0]} & ${allUsers.find(u => u.id === selectedPartners[0])?.name.split(" ")[0] || "?"}`
   : `${currentUser.name.split(" ")[0]}'s Group`);
  const pair = {
   id: `pair-${Date.now()}`,
   name,
   members,
   createdBy: currentUser.id,
   createdAt: Date.now(),
   active: true,
  };
  const next = [pair, ...pairs].slice(0, 50);
  await saveAccountabilityPairs(spaceId, next);
  setPairs(next);
  setShowCreate(false); setSelectedPartners([]); setGroupName("");
 }

 async function leavePair(pairId) {
  const next = pairs.map(p => {
   if (p.id !== pairId) return p;
   const members = p.members.filter(id => id !== currentUser.id);
   return { ...p, members, active: members.length >= 2 };
  });
  await saveAccountabilityPairs(spaceId, next);
  setPairs(next);
 }

 function getMemberStats(uid) {
  const uForCfg = allUsers.find(x => x.id === uid);
  const cfg = (uForCfg && industryConfigs[uForCfg.industry]) || Object.values(industryConfigs)[0];
  const goals = allUserGoals[uid] || {};
  const data = allUsersData[uid] || {};
  const todayPct = computeGoalPct(data[now] || {}, cfg?.weekdayMetrics || [], goals);
  const streak = computeStreak(data);
  // This week avg
  const today = new Date(now);
  const dow = today.getDay();
  let weekTotal = 0, weekDays = 0;
  for (let i = 0; i < (dow === 0 ? 7 : dow); i++) {
   const d = new Date(today); d.setDate(today.getDate() - i);
   const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
   if (!isWeekend(ds) && data[ds]) { weekTotal += computeGoalPct(data[ds], cfg?.weekdayMetrics || [], goals); weekDays++; }
  }
  const weekAvg = weekDays ? Math.round(weekTotal / weekDays) : 0;
  return { todayPct, streak: streak.current, weekAvg };
 }

 const pctColor = (pct) => pct >= 100 ? "#4ACF86" : pct >= 60 ? "#F59E0B" : pct > 0 ? "var(--accent)" : "var(--text-dim)";

 return (
  <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

   {/* Create button */}
   {!showCreate && (
    <button onClick={() => setShowCreate(true)} style={{
     background:"none", border:"1px dashed rgba(123,111,216,0.4)",
     color:"#9B8FE8", padding:"12px", borderRadius:"10px",
     fontSize:"0.85rem", cursor:"pointer", fontFamily:F, fontWeight:"600",
     WebkitTapHighlightColor:"transparent", minHeight:"44px"
    }}>👥 New accountability group</button>
   )}

   {/* Create form */}
   {showCreate && (
    <div style={{ background:"var(--bg-2)", border:"1px solid rgba(123,111,216,0.3)", borderRadius:"12px", padding:"14px", display:"flex", flexDirection:"column", gap:"10px" }}>
     <div style={{ fontSize:"0.8rem", fontWeight:"700", color:"#9B8FE8", textTransform:"uppercase", letterSpacing:"0.08em" }}>Create accountability group</div>
     <input
      style={{ background:"var(--bg-3)", border:"1px solid var(--border-1)", color:"var(--text-primary)", padding:"9px 12px", borderRadius:"8px", fontSize:"0.85rem", fontFamily:F, outline:"none", width:"100%", boxSizing:"border-box" }}
      placeholder="Group name (optional)" value={groupName} onChange={e => setGroupName(e.target.value)}
     />
     <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", fontWeight:"600", marginBottom:"2px" }}>Select partners:</div>
     {(allUsers||[]).filter(u => u.id !== currentUser?.id).length === 0 ? (
      <div style={{ padding:"12px", textAlign:"center", color:"var(--text-dim)", fontSize:"0.82rem", background:"var(--bg-3)", borderRadius:"8px" }}>
       No other members in your organization yet. Invite teammates to add them.
      </div>
     ) : (
      <div style={{ display:"flex", flexDirection:"column", gap:"5px", maxHeight:"220px", overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
       {(allUsers||[]).filter(u => u.id !== currentUser?.id).map(u => {
        const sel = selectedPartners.includes(u.id);
        return (
         <button key={u.id} onClick={() => setSelectedPartners(prev => sel ? prev.filter(id => id !== u.id) : [...prev, u.id])} style={{
          background: sel ? "rgba(123,111,216,0.12)" : "var(--bg-3)",
          border:`1px solid ${sel ? "rgba(123,111,216,0.5)" : "var(--border-1)"}`,
          color:"var(--text-primary)", padding:"10px 12px", borderRadius:"8px",
          cursor:"pointer", fontFamily:F, fontSize:"0.85rem", textAlign:"left",
          display:"flex", alignItems:"center", gap:"8px", width:"100%",
          WebkitTapHighlightColor:"transparent", minHeight:"44px"
         }}>
          <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:initialsColor(u.name, u.avatarColor||""), display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", fontWeight:"800", color:"#fff", flexShrink:0 }}>{u.name.charAt(0).toUpperCase()}</div>
          <span style={{ flex:1, fontWeight: sel ? "700" : "500" }}>{u.name}</span>
          <span style={{ width:"20px", height:"20px", borderRadius:"50%", border:`2px solid ${sel ? "#9B8FE8" : "var(--border-1)"}`, background: sel ? "#9B8FE8" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"0.7rem", color:"#fff", transition:"all 0.1s" }}>{sel ? "✓" : ""}</span>
         </button>
        );
       })}
      </div>
     )}
     <div style={{ display:"flex", gap:"6px" }}>
      <button onClick={createPair} disabled={!selectedPartners.length} style={{ flex:1, background:"#9B8FE8", color:"#fff", border:"none", padding:"10px", borderRadius:"8px", fontWeight:"800", fontFamily:F, cursor:"pointer", opacity:!selectedPartners.length ? 0.4 : 1 }}>
       Create group
      </button>
      <button onClick={() => { setShowCreate(false); setSelectedPartners([]); setGroupName(""); }} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"10px 14px", borderRadius:"8px", cursor:"pointer", fontFamily:F }}>Cancel</button>
     </div>
    </div>
   )}

   {/* Empty state */}
   {myPairs.length === 0 && !showCreate && (
    <div style={{ textAlign:"center", padding:"20px 10px" }}>
     <div style={{ fontSize:"1.5rem", marginBottom:"8px", opacity:0.4 }}>👥</div>
     <div style={{ fontSize:"0.85rem", color:"var(--text-dim)", lineHeight:1.5 }}>Create a group to see each other's daily numbers and keep each other honest.</div>
    </div>
   )}

   {/* Active pairs/groups */}
   {myPairs.map(pair => {
    const otherMembers = pair.members.filter(id => id !== currentUser?.id);
    return (
     <div key={pair.id} style={{ background:"var(--bg-2)", border:"1px solid rgba(123,111,216,0.2)", borderRadius:"12px", overflow:"hidden" }}>
      {/* Group header */}
      <div style={{ padding:"10px 14px", background:"rgba(123,111,216,0.06)", borderBottom:"1px solid rgba(123,111,216,0.12)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
       <div style={{ fontSize:"0.85rem", fontWeight:"800", color:"#9B8FE8", fontFamily:F }}>👥 {pair.name}</div>
       <button onClick={() => leavePair(pair.id)} style={{ background:"none", border:"none", color:"var(--text-dim)", fontSize:"0.72rem", cursor:"pointer", fontFamily:F, padding:"2px 6px" }}>Leave</button>
      </div>
      {/* Member rows */}
      <div style={{ padding:"8px 0" }}>
       {pair.members.map(uid => {
        const u = allUsers.find(x => x.id === uid) || { name: "?", id: uid };
        const isMe = uid === currentUser?.id;
        const stats = getMemberStats(uid);
        return (
         <div key={uid} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 14px", borderBottom:"1px solid var(--bg-3)" }}>
          {/* Avatar */}
          <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:initialsColor(u.name, u.avatarColor || ""), display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", fontWeight:"800", color:"#fff", flexShrink:0 }}>
           {u.name.charAt(0)}
          </div>
          {/* Name + today bar */}
          <div style={{ flex:1, minWidth:0 }}>
           <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
            <span style={{ fontSize:"0.82rem", fontWeight: isMe ? "800" : "600", color: isMe ? "var(--accent)" : "var(--text-primary)", fontFamily:F }}>
             {isMe ? "You" : u.name.split(" ")[0]}
            </span>
            <span style={{ fontSize:"0.78rem", fontWeight:"800", color:pctColor(stats.todayPct), fontFamily:F }}>
             {isWeekend(now) ? "🏖" : `${stats.todayPct}%`}
            </span>
           </div>
           {/* Today progress bar */}
           {!isWeekend(now) && (
            <div style={{ height:"4px", background:"var(--bg-3)", borderRadius:"3px", overflow:"hidden" }}>
             <div style={{ height:"100%", width:`${Math.min(100,stats.todayPct)}%`, background:pctColor(stats.todayPct), borderRadius:"3px", transition:"width 0.4s" }}/>
            </div>
           )}
           {/* Streak + week avg */}
           <div style={{ display:"flex", gap:"10px", marginTop:"4px" }}>
            {stats.streak > 0 && <span style={{ fontSize:"0.68rem", color:"#F59E0B" }}>🔥 {stats.streak}</span>}
            <span style={{ fontSize:"0.68rem", color:"var(--text-dim)" }}>Week avg {stats.weekAvg}%</span>
           </div>
          </div>
          {/* DM button */}
          {!isMe && onOpenDm && (
           <button onClick={() => onOpenDm(u)} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--accent)", padding:"7px 10px", borderRadius:"8px", fontSize:"0.8rem", cursor:"pointer", fontFamily:F, flexShrink:0, WebkitTapHighlightColor:"transparent", minHeight:"36px", minWidth:"36px" }}>💬</button>
          )}
         </div>
        );
       })}
      </div>
     </div>
    );
   })}
  </div>
 );
}

// ── Messaging helpers ─────────────────────────────────────────────────
function getInitials(name) {
 if (!name) return "?";
 const parts = name.trim().split(/\s+/);
 if (parts.length === 1) return parts[0][0].toUpperCase();
 return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── WeeklyMVP: peer vote + badge display ─────────────────────────────
function ChatWindow({thread, currentUser, allUsers, onClose, onMinimize, minimized, isMuted, onToggleMute, onMarkRead, sendMessageFn, presenceMap}){
 const [messages, setMessages] = useState([]);
 const [input, setInput] = useState("");
 const [replyingTo, setReplyingTo] = useState(null); // { id, senderName, text }
 const bottomRef = useRef(null);
 const inputRef = useRef(null);

 const otherUser = !thread?.isGroup ? allUsers?.find(u => u.id !== currentUser?.id && thread?.participantIds?.includes(u.id)) : null;
 const presStatus = otherUser ? getPresenceStatus(presenceMap || {}, otherUser.id) : "offline";

 useEffect(()=>{
  if(minimized||!thread)return;
  async function load(){
   const msgs = await loadPersonalMessages(thread.threadKey);
   const cutoff = Date.now()-30*24*60*60*1000;
   setMessages(msgs.filter(m=>m.ts>cutoff));
   await onMarkRead(thread.threadKey);
  }
  load();
  const iv = setInterval(async()=>{
   const msgs = await loadPersonalMessages(thread.threadKey);
   const cutoff = Date.now()-30*24*60*60*1000;
   setMessages(msgs.filter(m=>m.ts>cutoff));
  }, 5000);
  return ()=>clearInterval(iv);
 },[thread?.threadKey, minimized]);

 useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);
 useEffect(()=>{ if(!minimized) setTimeout(()=>inputRef.current?.focus(),100); },[minimized]);

 async function send(){
  if(!input.trim())return;
  const msgText = input.trim();
  const replyContext = replyingTo ? { replyTo: { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text.slice(0, 80) } } : {};
  // Pass replyTo via a wrapper that sendMessageFn may or may not support
  await sendMessageFn(thread, msgText, replyContext);
  setInput("");
  setReplyingTo(null);
  const msgs = await loadPersonalMessages(thread.threadKey);
  const cutoff = Date.now()-30*24*60*60*1000;
  setMessages(msgs.filter(m=>m.ts>cutoff));
 }

 const displayName = thread.isGroup
  ? thread.name
  : (allUsers?.find(u=>u.id!==currentUser?.id&&thread.participantIds?.includes(u.id))?.name || thread.name);
 const initials = getInitials(displayName);
 const color = getUserAvatarColor(displayName, allUsers);

 if(minimized){
  return (
   <div style={{...s.fdc,alignItems:"center",gap:"2px",...s.cp}} onClick={()=>onMinimize(thread.threadKey)}>
    <div style={{width:"48px",height:"48px",borderRadius:"50%",background:color,...s.fcc,fontSize:"0.95rem",fontWeight:"bold",color:BR,fontFamily:F,border:"2px solid #1A1A1A",boxShadow:"0 2px 12px rgba(0,0,0,0.6)",position:"relative"}}>
     {initials}
     <PresenceDot status={!thread.isGroup ? presStatus : "offline"} size="sm" style={{position:"absolute",bottom:"1px",right:"1px"}} />
    </div>
   </div>
  );
 }

 return (
  <div style={{width:"min(280px,92vw)",background:BG1,border:"1px solid #252525",borderRadius:"8px 8px 0 0",...s.fdc,boxShadow:"0 -4px 24px rgba(0,0,0,0.7)",...s.oh}}>
   {/* Header */}
   <div style={{...s.fac,gap:"8px",padding:"10px 12px",background:BG3,borderBottom:"1px solid #1E1E1E",...s.cp}} onClick={()=>onMinimize(thread.threadKey)}>
    <div style={{position:"relative",flexShrink:0}}>
     <div style={{width:"28px",height:"28px",borderRadius:"50%",background:color,...s.fcc,fontSize:"0.95rem",fontWeight:"bold",color:BR,fontFamily:F}}>
      {initials}
     </div>
     {!thread.isGroup && <PresenceDot status={presStatus} size="sm" style={{position:"absolute",bottom:"-1px",right:"-1px"}} />}
    </div>
    <div style={{flex:1,...s.oh}}>
     <div style={{fontSize:"0.9rem",...s.priF,...s.oh,...s.toe,...s.wsn}}>{displayName}</div>
     {!thread.isGroup && <div style={{fontSize:"0.78rem",color:PRESENCE_COLORS[presStatus],marginTop:"1px"}}>{PRESENCE_LABELS[presStatus]}</div>}
     {thread.isGroup&&<div style={{fontSize:"0.95rem",color:TM,letterSpacing:"0.06em"}}>GROUP · {thread.participantIds?.length} members</div>}
    </div>
    <div style={s.fg4}>
     <button title={isMuted?"Unmute":"Mute"} onClick={e=>{e.stopPropagation();onToggleMute(thread.threadKey);}} style={{background:"none",border:"none",color:isMuted?TA:TX,...s.ptr9,padding:"2px 4px",lineHeight:1}}>{isMuted?"🔇":"🔔"}</button>
     <button title="Minimize" onClick={e=>{e.stopPropagation();onMinimize(thread.threadKey);}} style={{background:"none",border:"none",color:TX,...s.ptr9,padding:"2px 4px",lineHeight:1}}>—</button>
     <button title="Close" onClick={e=>{e.stopPropagation();onClose(thread.threadKey);}} style={{background:"none",border:"none",color:TD,...s.ptr9,padding:"2px 4px",lineHeight:1}}>✕</button>
    </div>
   </div>
   {/* Messages */}
   <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",...s.fdc,gap:"6px",padding:"10px",minHeight:"220px",maxHeight:"300px"}}>
    {messages.length===0&&<div style={{textAlign:"center",fontSize:"0.95rem",color:"var(--border-2)",fontStyle:"italic",padding:"20px 0"}}>Say hi.</div>}
    {messages.map(m=>{
     const isMe=m.senderId===currentUser?.id;
     return (
      <div key={m.id} style={{...s.fdc,alignItems:isMe?"flex-end":"flex-start"}}
        onContextMenu={e=>{e.preventDefault();setReplyingTo({id:m.id,senderName:m.senderName,text:m.text});}}
        onTouchStart={e=>{const _t=setTimeout(()=>setReplyingTo({id:m.id,senderName:m.senderName,text:m.text}),500);e.currentTarget._lpt=_t;}}
        onTouchEnd={e=>{clearTimeout(e.currentTarget._lpt);}}
        onTouchMove={e=>{clearTimeout(e.currentTarget._lpt);}}>
       {!isMe&&thread.isGroup&&<div style={{fontSize:"0.8rem",color:TS,marginBottom:"2px",paddingLeft:"4px"}}>{m.senderName}</div>}
       {m.replyTo&&(
        <div style={{fontSize:"0.72rem",color:isMe?"rgba(255,255,255,0.45)":TM,background:isMe?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)",borderLeft:`2px solid ${isMe?"rgba(29,201,232,0.4)":"rgba(168,85,247,0.4)"}`,borderRadius:"0 5px 5px 0",padding:"2px 7px",marginBottom:"3px",maxWidth:"85%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.3}}>
         ↩ {m.replyTo.senderName}: {m.replyTo.text}
        </div>
       )}
       <div style={{maxWidth:"85%",padding:"6px 10px",background:isMe?BG2:BG0,border:`1px solid ${isMe?"#252510":BD1}`,borderRadius:isMe?"10px 10px 2px 10px":"10px 10px 10px 2px",fontSize:"1rem",...s.priF,lineHeight:1.5,wordBreak:"break-word",cursor:"pointer"}}>
        {m.text}
       </div>
       <div style={{fontSize:"0.8rem",color:TM,marginTop:"1px",paddingLeft:isMe?"0":"4px",paddingRight:isMe?"4px":"0"}}>
        {new Date(m.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
       </div>
      </div>
     );
    })}
    <div ref={bottomRef}/>
   </div>
   {/* Reply indicator */}
   {replyingTo&&(
    <div style={{display:"flex",alignItems:"center",gap:"6px",padding:"4px 8px 0",borderTop:`1px solid ${BD1}`}}>
     <div style={{flex:1,fontSize:"0.72rem",color:TM,background:"rgba(168,85,247,0.06)",borderLeft:"2px solid rgba(168,85,247,0.4)",borderRadius:"0 5px 5px 0",padding:"2px 7px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
      ↩ {replyingTo.senderName}: {replyingTo.text}
     </div>
     <button onClick={()=>setReplyingTo(null)} style={{background:"none",border:"none",color:TD,...s.cp,fontSize:"0.75rem",padding:"2px 4px",flexShrink:0}}>✕</button>
    </div>
   )}
   {/* Input */}
   <div style={{display:"flex",gap:"0",...s.btBd}}>
    <input
     ref={inputRef}
     style={{flex:1,background:BG0,border:"none",color:TP,padding:"9px 12px",fontSize:"1rem",...s.Fno}}
     placeholder={replyingTo?`Reply to ${replyingTo.senderName}…`:"Message..."}
     value={input}
     onChange={e=>setInput(e.target.value)}
     onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}if(e.key==="Escape")setReplyingTo(null);}}
    />
    <button style={{background:TA,border:"none",color:BR,padding:"9px 14px",...s.cp,fontSize:"0.95rem",fontFamily:F,fontWeight:"bold"}} onClick={send}>→</button>
   </div>
  </div>
 );
}

function FloatingChatBubbles({openWindows, threads, currentUser, allUsers, mutedThreads, sendMessageFn, onClose, onMinimize, onMarkRead, onToggleMute, presenceMap}){
 if(!currentUser||openWindows.length===0) return null;

 return (
  <div style={{position:"fixed",bottom:0,paddingBottom:"env(safe-area-inset-bottom,0px)",right:"12px",display:"flex",alignItems:"flex-end",gap:"10px",zIndex:200,pointerEvents:"none"}}>
   {openWindows.map((w)=>{
    const thread = threads.find(t=>t.threadKey===w.threadKey);
    if(!thread)return null;
    return (
     <div key={w.threadKey} style={{pointerEvents:"auto"}}>
      <ChatWindow
       thread={thread}
       currentUser={currentUser}
       allUsers={allUsers}
       minimized={w.minimized}
       isMuted={mutedThreads[w.threadKey]}
       onClose={onClose}
       onMinimize={onMinimize}
       onMarkRead={onMarkRead}
       onToggleMute={onToggleMute}
       sendMessageFn={sendMessageFn}
       presenceMap={presenceMap}
      />
     </div>
    );
   })}
  </div>
 );
}

function MessagesPage({currentUser, allUsers, threads, sendMessageFn, onOpenWindow, onMarkRead, communities, orgMeta, orgId, communityMembersRef, presenceMap}){
 const [activeThread, setActiveThread] = useState(null);
 const [messages, setMessages] = useState([]);
 const [input, setInput] = useState("");
 const [newDmMode, setNewDmMode] = useState(false);
 const [groupMode, setGroupMode] = useState(false);
 const [groupSelected, setGroupSelected] = useState([]);
 const [groupName, setGroupName] = useState("");
 const [groupSearch, setGroupSearch] = useState("");
 const [dmSearch, setDmSearch] = useState("");
 const [spaceFilter, setSpaceFilter] = useState("all");
 const bottomRef = useRef(null);

 useEffect(()=>{
  if(!activeThread)return;
  async function load(){
   const msgs=await loadPersonalMessages(activeThread.threadKey);
   const cutoff=Date.now()-30*24*60*60*1000;
   setMessages(msgs.filter(m=>m.ts>cutoff));
   await onMarkRead(activeThread.threadKey);
  }
  load();
  const iv=setInterval(async()=>{
   const msgs=await loadPersonalMessages(activeThread.threadKey);
   const cutoff=Date.now()-30*24*60*60*1000;
   setMessages(msgs.filter(m=>m.ts>cutoff));
  },5000);
  return ()=>clearInterval(iv);
 },[activeThread?.threadKey]);

 useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

 async function send(){
  if(!input.trim()||!activeThread)return;
  await sendMessageFn(activeThread, input);
  setInput("");
  const msgs=await loadPersonalMessages(activeThread.threadKey);
  const cutoff=Date.now()-30*24*60*60*1000;
  setMessages(msgs.filter(m=>m.ts>cutoff));
 }

 function openDm(targetUser){
  const tKey=makeThreadKey([currentUser.id,targetUser.id]);
  const existing=threads.find(t=>t.threadKey===tKey);
  const thread=existing||{threadKey:tKey,participantIds:[currentUser.id,targetUser.id],name:targetUser.name,isGroup:false};
  setActiveThread(thread);
  setNewDmMode(false);setGroupMode(false);
 }

 function startGroup(){
  if(groupSelected.length<1||!groupName.trim())return;
  const allIds=[currentUser.id,...groupSelected];
  const tKey=makeThreadKey(allIds);
  const thread={threadKey:tKey,participantIds:allIds,name:groupName.trim(),isGroup:true};
  setActiveThread(thread);
  setGroupMode(false);setGroupSelected([]);setGroupName("");
 }


 // Build space labels for filter chips and thread tags
 const spaceLabels = {};
 if(orgMeta && orgId && !orgId.startsWith("solo-")) spaceLabels[orgId] = {name: orgMeta.name, icon: "🏢"};
 (communities||[]).forEach(cm => { spaceLabels[cm.id] = {name: cm.name, icon: "🌐"}; });

 // Filter out ghost threads (DMs where other user no longer exists in any accessible space)
 const liveUserIdSet = new Set([
  ...(allUsers||[]).map(u=>u.id),
  // Also include crew members so cross-org DMs aren't ghosted
  ...Object.values(
   Object.fromEntries(
    Object.values((communityMembersRef?.current)||{}).flatMap(arr=>arr).map(m=>[m.userId||m.id, m.userId||m.id])
   )
  ).filter(Boolean)
 ]);
 const liveThreads = threads.filter(t => {
  if(t.isGroup) return true; // keep group threads
  const otherId = (t.participantIds||[]).find(id => id !== currentUser?.id);
  return !otherId || liveUserIdSet.has(otherId); // keep if other is still a live user
 });
 const filteredThreads = spaceFilter==="all"
  ? [...liveThreads].sort((a,b)=>(b.lastTs||0)-(a.lastTs||0))
  : [...liveThreads].filter(t=>t.spaceTag===spaceFilter).sort((a,b)=>(b.lastTs||0)-(a.lastTs||0));

 const hasSpaceFilters = Object.keys(spaceLabels).length > 0;

 return (
  <div style={{...s.fdc,gap:"0",border:BB18,...s.br10,...s.oh,background:BG0}}>

   {/* Top: thread list + controls */}
   <div style={{...s.bbBd,...s.fdc}}>
    {/* Actions row */}
    <div style={{padding:"10px 12px",...s.bbBd,display:"flex",gap:"6px"}}>
     <button data-tour-newdm onClick={()=>{setNewDmMode(p=>!p);setGroupMode(false);setActiveThread(null);}} style={{...s.smallTab,flex:1,fontSize:"0.8rem",borderColor:newDmMode?"var(--border-2)":"var(--bg-4)",color:newDmMode?TA:TS}}>New Direct Message</button>
     <button data-tour-newgroup onClick={()=>{setGroupMode(p=>!p);setNewDmMode(false);setGroupSelected([]);setGroupName("");}} style={{...s.smallTab,flex:1,fontSize:"0.8rem",borderColor:groupMode?BDIR:"var(--bg-4)",color:groupMode?"#7B6FD8":TS}}>New Group Message</button>
    </div>

    {/* Space filter chips — only when user belongs to spaces */}
    {hasSpaceFilters&&(
     <div style={{display:"flex",gap:"5px",padding:"7px 10px",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",...s.bbBd}}>
      {[["all","All","✉"],...Object.entries(spaceLabels).map(([id,{name,icon}])=>[id,name,icon])].map(([id,name,icon])=>(
       <button key={id} onClick={()=>setSpaceFilter(id)} style={{...s.smallTab,whiteSpace:"nowrap",fontSize:"0.8rem",padding:"3px 9px",background:spaceFilter===id?"var(--accent-dim)":"none",borderColor:spaceFilter===id?"var(--btn-plus-border)":"var(--bg-4)",color:spaceFilter===id?TA:TM}}>
        {icon} {name}
       </button>
      ))}
     </div>
    )}

    {/* DM picker — searchable, same UX as group picker */}
    {newDmMode&&(()=>{
     const dmCandidates = (allUsers||[]).filter(u=>u.id!==currentUser?.id);
     const dmSearched = dmSearch.trim()
      ? dmCandidates.filter(u=>u.name.toLowerCase().includes(dmSearch.toLowerCase()))
      : dmCandidates;
     return (
      <div style={{...s.p8,...s.bbBd}}>
       <input
        autoFocus
        placeholder="Search people…"
        value={dmSearch}
        onChange={e=>setDmSearch(e.target.value)}
        style={{width:"100%",background:"var(--bg-2)",border:"1px solid var(--border-1)",borderRadius:"8px",color:TP,fontFamily:F,fontSize:"0.88rem",padding:"7px 10px",outline:"none",boxSizing:"border-box",marginBottom:"8px"}}
       />
       {dmCandidates.length===0&&(
        <div style={{padding:"8px",fontSize:"0.9rem",color:TM,fontStyle:"italic"}}>No other members yet.</div>
       )}
       {dmSearched.length===0&&dmSearch.trim()&&(
        <div style={{padding:"8px",fontSize:"0.88rem",color:TM}}>No match for "{dmSearch}"</div>
       )}
       <div style={{maxHeight:"180px",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        {dmSearched.map(u=>{
         const col=getUserAvatarColor(u.name, allUsers);
         const sharedSpaceIds=[];
         if(orgId&&!orgId.startsWith("solo-")&&spaceLabels[orgId]) sharedSpaceIds.push(orgId);
         (communities||[]).forEach(cm=>{
          const cmMembers=communityMembersRef.current[cm.id]||[];
          if(cmMembers.some(m=>(m.userId||m.id)===u.id)&&spaceLabels[cm.id]) sharedSpaceIds.push(cm.id);
         });
         const spaceTag=sharedSpaceIds.length===1?sharedSpaceIds[0]:null;
         return(
          <div key={u.id} onClick={()=>{
           const tKey=makeThreadKey([currentUser.id,u.id]);
           const existing=threads.find(t=>t.threadKey===tKey);
           const thread=existing||{threadKey:tKey,participantIds:[currentUser.id,u.id],name:u.name,isGroup:false,spaceTag};
           setActiveThread(thread);setNewDmMode(false);setDmSearch("");setGroupMode(false);
          }} style={{...s.fac,gap:"8px",...s.p8,...s.cp,...s.br8,marginBottom:"2px"}}
           onMouseEnter={e=>e.currentTarget.style.background=BG2} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
           <div style={{position:"relative",flexShrink:0}}>
            <div style={{width:"30px",height:"30px",borderRadius:"50%",background:col,...s.fcc,fontSize:"0.8rem",fontWeight:"bold",color:BR}}>{getInitials(u.name)}</div>
            <PresenceDot status={getPresenceStatus(presenceMap||{},u.id)} size="sm" style={{position:"absolute",bottom:"-1px",right:"-1px"}} />
           </div>
           <div style={s.f1}>
            <div style={s.pri95F}>{u.name}</div>
            {sharedSpaceIds.length>0&&<div style={{fontSize:"0.78rem",color:TM}}>{sharedSpaceIds.map(id=>spaceLabels[id]?.name).filter(Boolean).join(", ")}</div>}
           </div>
          </div>
         );
        })}
       </div>
      </div>
     );
    })()}

    {/* Group creator */}
    {groupMode&&(()=>{
     // Space-filtered users: only show members from the currently selected space filter
     const spaceUsers = (() => {
      const base = (allUsers||[]).filter(u=>u.id!==currentUser?.id);
      if(spaceFilter==="all") return base;
      if(spaceFilter===orgId) return base; // all org users
      const cmMembers = communityMembersRef.current[spaceFilter]||[];
      const cmIds = new Set(cmMembers.map(m=>m.userId||m.id));
      return base.filter(u=>cmIds.has(u.id));
     })();
     const searchedUsers = groupSearch.trim()
      ? spaceUsers.filter(u=>u.name.toLowerCase().includes(groupSearch.toLowerCase()))
      : spaceUsers;
     return (
      <div style={{...s.p8,...s.bbBd, display:"flex", flexDirection:"column", gap:"8px"}}>
       <input style={{...s.inpBase,...s.br8,padding:"7px 10px",fontSize:"1rem",...s.Fno, width:"100%", boxSizing:"border-box"}} placeholder="Group name (required)..." value={groupName} onChange={e=>setGroupName(e.target.value)}/>
       {/* Selected member chips */}
       {groupSelected.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
         {groupSelected.map(id=>{
          const u=spaceUsers.find(x=>x.id===id);
          if(!u)return null;
          return <span key={id} onClick={()=>setGroupSelected(p=>p.filter(x=>x!==id))} style={{background:"rgba(29,201,232,0.12)",border:"1px solid rgba(29,201,232,0.3)",borderRadius:"20px",padding:"2px 8px",fontSize:"0.78rem",color:"var(--accent)",cursor:"pointer",fontWeight:"700"}}>{u.name} ✕</span>;
         })}
        </div>
       )}
       {/* Member typeahead search */}
       <div style={{position:"relative"}}>
        <input
         style={{...s.inpBase,...s.br8,padding:"6px 10px",fontSize:"0.88rem",...s.Fno, width:"100%", boxSizing:"border-box"}}
         placeholder="Type a name to add members..."
         value={groupSearch}
         onChange={e=>setGroupSearch(e.target.value)}
         autoComplete="off"
        />
        {groupSearch.trim() && searchedUsers.length > 0 && (
         <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"8px",boxShadow:"0 4px 16px rgba(0,0,0,0.4)",zIndex:100,maxHeight:"160px",overflowY:"auto",WebkitOverflowScrolling:"touch",marginTop:"2px"}}>
          {searchedUsers.filter(u=>!groupSelected.includes(u.id)).slice(0,8).map(u=>{
           const col=getUserAvatarColor(u.name,allUsers);
           return (
            <div key={u.id} onClick={()=>{setGroupSelected(p=>[...p,u.id]);setGroupSearch("");}}
             style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",cursor:"pointer",borderBottom:"1px solid var(--border-1)"}}>
             <div style={{width:"26px",height:"26px",borderRadius:"50%",background:col,...s.fcc,fontSize:"0.78rem",fontWeight:"bold",color:BR,flexShrink:0}}>{getInitials(u.name)}</div>
             <div style={{flex:1,fontSize:"0.88rem",color:"var(--text-primary)",fontWeight:"600"}}>{u.name}</div>
             <span style={{color:"var(--accent)",fontSize:"0.75rem",fontWeight:"700"}}>Add +</span>
            </div>
           );
          })}
          {searchedUsers.filter(u=>!groupSelected.includes(u.id)).length===0&&(
           <div style={{padding:"10px",fontSize:"0.82rem",color:TM,fontStyle:"italic",textAlign:"center"}}>No more members to add</div>
          )}
         </div>
        )}
        {groupSearch.trim() && searchedUsers.filter(u=>!groupSelected.includes(u.id)).length===0 && (
         <div style={{fontSize:"0.8rem",color:TM,marginTop:"4px",fontStyle:"italic"}}>No members found matching "{groupSearch}"</div>
        )}
       </div>
       {groupSelected.length>=1&&groupName.trim()&&(
        <button style={{...s.primaryBtn,padding:"8px",fontSize:"0.9rem",width:"100%"}} onClick={startGroup}>Create Group ({groupSelected.length}) →</button>
       )}
      </div>
     );
    })()}

    {/* Thread list — horizontal scroll */}
    <div style={{display:"flex",overflowX:"auto",overflowY:"hidden",WebkitOverflowScrolling:"touch"}}>
     {filteredThreads.length===0&&(
      <div style={{padding:"14px 12px",...s.fdc,gap:"6px"}}>
       <div style={{fontSize:"0.9rem",color:TM,fontStyle:"italic"}}>{threads.length===0?"No conversations yet. Start one!":"No conversations in this filter."}</div>
       {threads.length===0&&!newDmMode&&!groupMode&&(
        <button style={{...s.smallTab,width:"fit-content",fontSize:"0.8rem",color:"#5DC1DB",borderColor:"rgba(29,201,232,0.2)"}} onClick={()=>{setNewDmMode(true);setGroupMode(false);}}>💬 Start a Direct Message →</button>
       )}
      </div>
     )}
     {filteredThreads.map(t=>{
      const isActive=activeThread?.threadKey===t.threadKey;
      const unread=t.unreadCount||0;
      const tDisplayName=t.isGroup?t.name:(allUsers?.find(u=>u.id!==currentUser?.id&&t.participantIds?.includes(u.id))?.name||t.name);
      const tOtherUser = !t.isGroup ? allUsers?.find(u=>u.id!==currentUser?.id&&t.participantIds?.includes(u.id)) : null;
      const tPresStatus = tOtherUser ? getPresenceStatus(presenceMap||{}, tOtherUser.id) : "offline";
      const col=getUserAvatarColor(tDisplayName, allUsers);
      const spaceInfo = t.spaceTag ? spaceLabels[t.spaceTag] : null;
      return (
       <div key={t.threadKey} onClick={()=>setActiveThread(t)} style={{...s.fdc,alignItems:"center",padding:"10px 10px 8px",...s.cp,borderRight:"1px solid #0E0E0E",minWidth:"72px",background:isActive?BG2:"transparent",borderBottom:`2px solid ${isActive?TA:unread>0?"#6A4E28":"transparent"}`,flexShrink:0}}>
        <div style={{width:"36px",height:"36px",borderRadius:"50%",background:col,...s.fcc,fontSize:"0.9rem",fontWeight:"bold",color:BR,flexShrink:0,position:"relative",...s.mb4}}>
         {getInitials(tDisplayName)}
         {unread>0&&<div style={{position:"absolute",top:"-3px",right:"-3px",width:"14px",height:"14px",background:TA,borderRadius:"50%",border:"2px solid #080808",...s.fcc,fontSize:"0.95rem",fontWeight:"bold",color:BR}}>{unread}</div>}
         {!t.isGroup && unread===0 && <PresenceDot status={tPresStatus} size="sm" style={{position:"absolute",bottom:"-1px",right:"-1px"}} />}
        </div>
        <div style={{fontSize:"0.78rem",color:isActive?TA:unread>0?"#D8C090":TS,fontWeight:unread>0?"bold":"normal",textAlign:"center",maxWidth:"64px",...s.oh,...s.toe,...s.wsn}}>{tDisplayName}</div>
        {spaceInfo&&<div style={{fontSize:"0.65rem",color:TD,marginTop:"2px",textAlign:"center",...s.wsn,...s.toe,maxWidth:"64px"}}>{spaceInfo.icon}</div>}
       </div>
      );
     })}
    </div>
   </div>

   {/* Bottom: active chat */}
   <div style={{flex:1,...s.fdc,...s.oh,background:BG0,minHeight:"320px",maxHeight:"min(calc(100dvh - 280px), calc(100vh - 280px))"}}>
    {activeThread ? (
     <>
      {/* Chat header */}
      <div style={{...s.p1014,...s.bbBd,...s.fac,gap:"10px"}}>
       {(() => {
        const hOtherUser = !activeThread.isGroup ? allUsers?.find(u=>u.id!==currentUser?.id&&activeThread.participantIds?.includes(u.id)) : null;
        const hStatus = hOtherUser ? getPresenceStatus(presenceMap||{}, hOtherUser.id) : "offline";
        return (
         <div style={{position:"relative",flexShrink:0}}>
          <div style={{width:"32px",height:"32px",borderRadius:"50%",background:getUserAvatarColor(activeThread.name, allUsers),...s.fcc,fontSize:"0.95rem",fontWeight:"bold",color:BR}}>
           {getInitials(activeThread.name)}
          </div>
          {!activeThread.isGroup && <PresenceDot status={hStatus} size="sm" style={{position:"absolute",bottom:"-1px",right:"-1px"}} />}
         </div>
        );
       })()}
       <div>
        <div style={{fontSize:"0.95rem",color:"#C8C0B4",fontFamily:F,fontWeight:"bold"}}>{activeThread.name}</div>
        {!activeThread.isGroup && (() => {
         const hOther = allUsers?.find(u=>u.id!==currentUser?.id&&activeThread.participantIds?.includes(u.id));
         const hSt = hOther ? getPresenceStatus(presenceMap||{}, hOther.id) : "offline";
         return <div style={{fontSize:"0.78rem",color:PRESENCE_COLORS[hSt],marginTop:"1px"}}>{PRESENCE_LABELS[hSt]}</div>;
        })()}
        {activeThread.isGroup&&<div style={{fontSize:"0.9rem",color:TM,letterSpacing:"0.06em"}}>Group · {activeThread.participantIds?.length} members</div>}
       </div>
       <button style={{marginLeft:"auto",...s.smallTab,fontSize:"0.9rem",padding:"4px 10px"}} onClick={()=>onOpenWindow(activeThread)}>⬡ Pop out</button>
      </div>
      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",...s.fdc,gap:"8px",...s.p12}}>
       {messages.length===0&&<div style={{textAlign:"center",fontSize:"0.9rem",color:TM,fontStyle:"italic",padding:"30px 0"}}>Say hi.</div>}
       {messages.map(m=>{
        const isMe=m.senderId===currentUser?.id;
        return (
         <div key={m.id} style={{...s.fdc,alignItems:isMe?"flex-end":"flex-start"}}>
          {!isMe&&<div style={{...s.fac,gap:"5px",marginBottom:"2px",paddingLeft:"4px"}}>
           <div style={{width:"18px",height:"18px",borderRadius:"50%",background:getUserAvatarColor(m.senderName||"", allUsers),...s.fcc,fontSize:"0.95rem",fontWeight:"bold",color:BR,flexShrink:0}}>{getInitials(m.senderName||"")}</div>
           <span style={{fontSize:"0.9rem",color:TS}}>{m.senderName}</span>
          </div>}
          <div style={{maxWidth:"80%",padding:"9px 13px",background:isMe?BG2:BG0,border:`1px solid ${isMe?"#252510":BD1}`,borderRadius:isMe?"12px 12px 2px 12px":"12px 12px 12px 2px",fontSize:"1rem",color:"#C8C0B4",fontFamily:F,lineHeight:1.6,wordBreak:"break-word"}}>
           {m.text}
          </div>
          <div style={{fontSize:"0.9rem",color:TM,marginTop:"2px",paddingLeft:isMe?"0":"4px",paddingRight:isMe?"4px":"0"}}>
           {new Date(m.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
          </div>
         </div>
        );
       })}
       <div ref={bottomRef}/>
      </div>
      {/* Input */}
      <div style={{display:"flex",...s.btBd}}>
       <input
        style={{flex:1,background:BG0,border:"none",color:TP,padding:"13px 16px",fontSize:"1rem",...s.Fno}}
        placeholder="Write a message..."
        value={input}
        onChange={e=>setInput(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())}
        autoFocus
       />
       <button style={{background:TA,border:"none",color:BR,padding:"13px 20px",...s.ptr9,fontFamily:F,fontWeight:"bold",letterSpacing:"0.08em",minWidth:"70px"}} onClick={send}>Send</button>
      </div>
     </>
    ) : (
     <div style={{flex:1,...s.fdc,alignItems:"center",justifyContent:"center",...s.g12,padding:"40px 0"}}>
      <div style={{fontSize:"2rem",opacity:0.2}}>💬</div>
      <div style={{fontSize:"0.95rem",color:TM,fontFamily:F,fontStyle:"italic"}}>Select a conversation or start a new one.</div>
     </div>
    )}
   </div>
  </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── TourOverlay — full-screen guided tour with anchored bubbles ───────────────
// ─────────────────────────────────────────────────────────────────────────────
const TOUR_STEPS = {
 home: [
  { anchor: "data-tour-greeting", title: "Your dashboard", body: "A live snapshot of your day — progress toward your goals, your current streak, and quick access to everything.", placement: "below" },
  { anchor: "data-tour-streaks", title: "Streaks", body: "Your current streak and all-time best. Log anything on a given day to keep it alive.", placement: "above" },
  { anchor: "data-tour-quickactions", title: "Quick actions", body: "Jump straight to logging, your journal, your stats, or kick off a challenge.", placement: "above" },
  { anchor: "data-tour-pacer", title: "Meet Pacer ⚡", body: "Your AI accountability partner. It watches your activity, remembers your patterns, and checks in when it matters. Tap anytime to talk.", placement: "above" },
 ],
 workspace: [
  { anchor: "data-tour-metriccards", title: "Log your activity", body: "Tap + / – to log, or press the number keys (1–9) on desktop. Shift + number to subtract.", placement: "below" },
  { anchor: "data-tour-intention", title: "Daily intention", body: "Set one focus for the day. Private — just for you.", placement: "below" },
  { anchor: "data-tour-tools", title: "Tools", body: "Timer, a notes scratchpad, and your toolkit — tucked away until you need them.", placement: "above" },
 ],
 communities: [
  { anchor: "data-tour-feedlist", title: "Crew feed", body: "Activity from everyone in your Crew. React, comment, or @ mention someone.", placement: "below" },
  { anchor: "data-tour-challenges", title: "Challenges", body: "Pick a metric, set a target and end date, and compete. The leaderboard updates live.", placement: "below" },
 ],
 messages: [
  { anchor: "data-tour-newdm", title: "Direct messages", body: "Private messages between you and a teammate. No one else sees them.", placement: "below" },
  { anchor: "data-tour-newgroup", title: "Group threads", body: "Start a named group thread with multiple people.", placement: "below" },
 ],
 journal: [
  { anchor: "data-tour-journalentry", title: "Your journal", body: "Completely private — only you can see it. Use a template or write freeform. Pacer reads it and uses it to give you better feedback.", placement: "below" },
 ],
 history: [
  { anchor: "data-tour-historymonths", title: "Your history", body: "Tap any day to edit past entries. The color fill shows how close you were to your goals that day.", placement: "below" },
 ],
};

function TourOverlay({ pageId, onClose }) {
 const steps = TOUR_STEPS[pageId] || [];
 const [step, setStep] = useState(0);
 const [positions, setPositions] = useState({});
 const F = "'DM Sans',system-ui,sans-serif";

 useEffect(() => {
  // Measure anchor positions
  const pos = {};
  steps.forEach(s => {
   const el = document.querySelector(`[${s.anchor}]`);
   if (el) {
    const r = el.getBoundingClientRect();
    pos[s.anchor] = { top: r.top + window.scrollY, left: r.left, width: r.width, height: r.height, bottom: r.bottom + window.scrollY };
   }
  });
  setPositions(pos);
 }, [pageId, step]);

 const cur = steps[step];
 const anchorPos = cur ? positions[cur.anchor] : null;

 // Bubble position
 let bubbleStyle = {};
 const BW = Math.min(300, window.innerWidth - 40);
 if (anchorPos) {
  const cx = anchorPos.left + anchorPos.width / 2;
  const bubbleLeft = Math.max(16, Math.min(cx - BW / 2, window.innerWidth - BW - 16));
  if (cur.placement === "below") {
   bubbleStyle = { top: anchorPos.bottom + 12, left: bubbleLeft };
  } else {
   bubbleStyle = { top: anchorPos.top - 20, left: bubbleLeft, transform: "translateY(-100%)" };
  }
  // Arrow tip cx relative to bubble
  bubbleStyle.arrowLeft = cx - bubbleLeft;
 } else {
  // Fallback — center of screen
  bubbleStyle = { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
 }

 if (steps.length === 0) return null;

 return (
  <div style={{ position: "fixed", inset: 0, zIndex: 9000, pointerEvents: "none" }}>
   {/* Dark overlay with hole around anchor */}
   <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "all" }} onClick={onClose}>
    <defs>
     <mask id="tour-mask">
      <rect width="100%" height="100%" fill="white" />
      {anchorPos && (
       <rect
        x={anchorPos.left - 6} y={anchorPos.top - 6}
        width={anchorPos.width + 12} height={anchorPos.height + 12}
        rx="8" fill="black"
       />
      )}
     </mask>
    </defs>
    <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#tour-mask)" />
   </svg>

   {/* Highlight border around anchor */}
   {anchorPos && (
    <div style={{
     position: "absolute",
     top: anchorPos.top - 6, left: anchorPos.left - 6,
     width: anchorPos.width + 12, height: anchorPos.height + 12,
     borderRadius: "10px", border: "2px solid var(--accent)",
     pointerEvents: "none", boxShadow: "0 0 0 4px rgba(29,201,232,0.15)",
     zIndex: 9001,
    }} />
   )}

   {/* Bubble */}
   <div style={{
    position: "absolute", zIndex: 9002,
    width: BW, background: "var(--bg-1)", border: "1px solid rgba(29,201,232,0.4)",
    borderRadius: "14px", padding: "16px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    pointerEvents: "all",
    ...({ top: bubbleStyle.top, left: bubbleStyle.left, transform: bubbleStyle.transform }),
   }}>
    {/* Arrow pointing up (if placement=below) or down (if above) */}
    {anchorPos && cur.placement === "below" && (
     <div style={{ position: "absolute", top: -8, left: (bubbleStyle.arrowLeft || BW/2) - 8, width: 0, height: 0,
      borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
      borderBottom: "8px solid rgba(29,201,232,0.4)" }} />
    )}
    {anchorPos && cur.placement === "above" && (
     <div style={{ position: "absolute", bottom: -8, left: (bubbleStyle.arrowLeft || BW/2) - 8, width: 0, height: 0,
      borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
      borderTop: "8px solid rgba(29,201,232,0.4)" }} />
    )}
    <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "5px", fontFamily: F }}>
     {step + 1} / {steps.length}
    </div>
    <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px", fontFamily: F }}>{cur.title}</div>
    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.55, fontFamily: F, marginBottom: "14px" }}>{cur.body}</div>
    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
     <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-dim)", padding: "7px 14px", borderRadius: "8px", fontSize: "0.8rem", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
      Skip tour
     </button>
     {step < steps.length - 1 ? (
      <button onClick={() => setStep(s => s + 1)} style={{ background: "var(--accent)", color: "#000", border: "none", padding: "7px 18px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "800", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
       Next →
      </button>
     ) : (
      <button onClick={onClose} style={{ background: "var(--accent)", color: "#000", border: "none", padding: "7px 18px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "800", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
       Done ✓
      </button>
     )}
    </div>
   </div>
  </div>
 );
}

// SoloDashboard - personal performance hub for solo users
function SideNav({ view, navigateTo, currentUser, orgId, communities, messaging, notifications, onOpenNotifs,
  isAdmin, isSuperAdmin, setSettingsInitTab, onOpenProfileSwitcher, orgPendingCount, communityPendingCount,
  comTab, setComTab }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const isSolo = !(communities && communities.length > 0);
 const hasCommunities = (communities||[]).length > 0;
 const totalUnread = messaging.threads.reduce((s,t) => s + (t.unreadCount||0), 0);

 const navItems = [
  { id: "home", icon: "\u{1F3E0}", label: "Home", isGroup: true },
  { id: "tracker", icon: "📊", label: "Tracker" },
  { id: "crews", icon: "⚡", label: "Crews", badge: communityPendingCount > 0 ? String(communityPendingCount) : null, isComGroup: true },
  { id: "messages", icon: "\u{1F4AC}", label: "Messages", badge: totalUnread > 0 ? (totalUnread > 9 ? "9+" : String(totalUnread)) : null },
  { id: "settings", icon: "\u2699\uFE0F", label: "Settings" },
 ].filter(n => !n.hidden);

 function handleNav(id) {
  if (id === "home") navigateTo("home");
  else if (id === "settings") { setSettingsInitTab("profile"); navigateTo("settings"); }
  else navigateTo(id);
 }

 const homeGroupViews = ["home","history","journal"];

 const subBtn = (k, icon, label, isActive, onClick) => (
  <button key={k} onClick={onClick}
   style={{
    display: "flex", alignItems: "center", gap: "8px",
    padding: "7px 10px 7px 18px", borderRadius: "8px",
    background: isActive ? "rgba(29,201,232,0.07)" : "none",
    border: "none",
    color: isActive ? "var(--accent)" : "var(--text-dim)",
    fontWeight: isActive ? "700" : "400",
    fontSize: "0.82rem", fontFamily: F, cursor: "pointer",
    textAlign: "left", width: "100%",
    WebkitTapHighlightColor: "transparent",
   }}>
   <span style={{ flexShrink: 0, fontSize: "0.85rem" }}>{icon}</span>
   <span style={{ flex: 1 }}>{label}</span>
   {isActive && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
  </button>
 );

 return (
  <>
   <nav style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "8px 10px" }}>
    {navItems.map(item => {
     const isActive = item.isGroup ? homeGroupViews.includes(view) : (view === item.id);
     const isOrgActive = false;
     const isComActive = item.isComGroup && view === "crews";
     const anyActive = isActive || isOrgActive || isComActive;
     return (
      <React.Fragment key={item.id}>
       <button
        onClick={() => { haptic.light(); handleNav(item.id); }}
        style={{
         display: "flex", alignItems: "center", gap: "10px",
         padding: "10px 12px", borderRadius: "10px",
         background: anyActive ? "rgba(29,201,232,0.1)" : "none",
         border: `1px solid ${anyActive ? "rgba(29,201,232,0.25)" : "transparent"}`,
         color: anyActive ? "var(--accent)" : "var(--text-muted)",
         fontWeight: anyActive ? "700" : "500",
         fontSize: "0.88rem", fontFamily: F, cursor: "pointer",
         textAlign: "left", width: "100%",
         WebkitTapHighlightColor: "transparent",
         transition: "all 0.12s ease",
        }}>
        <span style={{ fontSize: "1rem", flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.badge && <span style={{ background: "var(--accent)", color: "#000", borderRadius: "10px", fontSize: "0.65rem", padding: "1px 6px", fontWeight: "800", lineHeight: "18px", display: "inline-block", flexShrink: 0 }}>{item.badge}</span>}
        {anyActive && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
       </button>

       {/* Home sub-tabs */}
       {item.isGroup && isActive && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", paddingLeft: "8px", marginTop: "2px", marginBottom: "4px" }}>
         {[["home","\u{1F3E0}","Dashboard"],["journal","\u{1F4D3}","Journal"],["history","\u{1F4C5}","History"]].map(([k,icon,label]) =>
          subBtn(k, icon, label, view===k, () => navigateTo(k))
         )}
        </div>
       )}

       {/* Org sub-tabs */}
       {item.isOrgGroup && isOrgActive && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", paddingLeft: "8px", marginTop: "2px", marginBottom: "4px" }}>
         {[["dashboard","\u{1F4E3}","Dashboard"],["leaderboard","\u{1F3C6}","Leaderboard"],["compete","\u26A1","Compete"],["members","\u{1F465}","Members"],...(isAdmin?[["admin","\u2699\uFE0F","Admin"]]:[])].map(([k,icon,label]) =>
          subBtn(k, icon, label, comTab===k, () => switchOrgTab && setComTab(k))
         )}
        </div>
       )}

       {/* Communities sub-tabs */}
       {item.isComGroup && isComActive && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", paddingLeft: "8px", marginTop: "2px", marginBottom: "4px" }}>
         {[["dashboard","\u{1F4CA}","Dashboard"],["feed","\u{1F4E3}","Pulse"],["members","\u{1F465}","Members"]].map(([k,icon,label]) =>
          subBtn(k, icon, label, comTab===k, () => setComTab && setComTab(k))
         )}
        </div>
       )}
      </React.Fragment>
     );
    })}
   </nav>
  </>
 );
}


// ── Mobile Bottom Nav Bar (mobile only) ──────────────────────────────────────
function MobileBottomNav({ view, navigateTo, orgId, communities, messaging, notifications, isAdmin,
  comTab, setComTab, setSettingsInitTab, currentUser }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const isSolo = !(communities && communities.length > 0);
 const totalUnread = messaging.threads.reduce((s,t) => s + (t.unreadCount||0), 0);
 const [moreOpen, setMoreOpen] = useState(false);

 const homeViews = ["home","history","journal"];
 const isHome = homeViews.includes(view);
  const isOrg  = view === "org";
 const isCrew = view === "crews";
 const isMore = ["messages","settings","history","journal"].includes(view);

 // ── SVG icons (clean, no emoji clutter) ───────────────────────────────
 const IconHome = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--accent)" : "var(--text-dim)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
   <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
   <path d="M9 21V12h6v9"/>
  </svg>
 );
 const IconOrg = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--accent)" : "var(--text-dim)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
   <rect x="2" y="7" width="20" height="14" rx="2"/>
   <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
   <line x1="12" y1="12" x2="12" y2="16"/>
   <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
 );
 const IconCrew = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--accent)" : "var(--text-dim)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
   <circle cx="9" cy="7" r="3"/>
   <circle cx="17" cy="9" r="2.5"/>
   <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/>
   <path d="M17 14c2.2.5 4 2.2 4 4.5"/>
  </svg>
 );
 const IconTracker = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--accent)" : "var(--text-dim)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
   <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
 );
 const IconMore = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active || moreOpen ? "var(--accent)" : "var(--text-dim)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
   <line x1="3" y1="6" x2="21" y2="6"/>
   <line x1="3" y1="12" x2="21" y2="12"/>
   <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
 );

 const isTracker = view === "tracker";

 // Main 4 tabs
 const mainTabs = [
  { id: "home",    label: "Home",    Icon: IconHome,    active: isHome },
  { id: "tracker", label: "Tracker", Icon: IconTracker, active: isTracker },
  { id: "crews",   label: "Crews",   Icon: IconCrew,    active: isCrew },
  { id: "more",    label: "More",    Icon: IconMore,    active: isMore, isMore: true },
 ];

 // Sub-tab rows
 const homeSubTabs  = [["home","Dashboard"],["journal","Journal"],["history","Stats"]];
 // orgSubTabs removed
 const crewSubTabs  = [["dashboard","Dashboard"],["feed","Pulse"],["members","Members"]];

 const showSubTabs  = isHome || isCrew;
 const subTabs      = isHome ? homeSubTabs : crewSubTabs;
 const activeSubTab = isHome ? view : comTab;
 function handleSubTab(k) {
  if (isHome) navigateTo(k);
  else if (isOrg) setComTab(k);
  else setComTab(k);
 }

 // Avatar initials for the More button (like WHOOP)
 const initials = currentUser?.name
  ? currentUser.name.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)
  : "Me";
 const avatarColor = currentUser?.avatarColor || "var(--accent)";
 const avatarEmoji = currentUser?.avatarEmoji || (currentUser?.avatarColor?.startsWith("emoji:") ? currentUser.avatarColor.slice(6) : null);
 const avatarPhoto = currentUser?.avatarUrl || null;

 // More drawer items
 const moreItems = [
  { id: "messages", icon: (
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
  ), label: "Messages", badge: totalUnread > 0 ? (totalUnread > 9 ? "9+" : String(totalUnread)) : null },
  { id: "journal",  icon: (
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  ), label: "Journal" },
  { id: "history",  icon: (
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ), label: "Stats" },
  { id: "settings", icon: (
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
  ), label: "Settings" },
  { id: "signout", icon: (
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E05577" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ), label: "Sign out", danger: true },
 ];

 return (
  <>
   {/* More drawer — slides up from bottom */}
   {moreOpen && (
    <>
     {/* Backdrop */}
     <div onClick={() => setMoreOpen(false)}
      style={{ position:"fixed", inset:0, zIndex:298, background:"rgba(0,0,0,0.5)" }} />
     {/* Drawer */}
     <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:299,
      background:"var(--bg-1)", borderRadius:"20px 20px 0 0",
      borderTop:"1px solid var(--border-1)",
      paddingBottom:"calc(env(safe-area-inset-bottom, 0px) + 80px)",
      boxShadow:"0 -8px 40px rgba(0,0,0,0.4)",
      animation:"slideUp 0.22s cubic-bezier(0.32,0.72,0,1)",
     }}>
      {/* Handle */}
      <div style={{ display:"flex", justifyContent:"center", paddingTop:"10px", paddingBottom:"4px" }}>
       <div style={{ width:"36px", height:"4px", borderRadius:"2px", background:"var(--border-2)" }} />
      </div>
      {/* User identity bar */}
      {currentUser && (
       <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 20px 10px", borderBottom:"1px solid var(--border-1)" }}>
        {avatarPhoto ? (
         <img src={avatarPhoto} alt="avatar" style={{width:"40px",height:"40px",borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
        ) : avatarEmoji ? (
         <div style={{width:"40px",height:"40px",borderRadius:"50%",background:initialsColor(currentUser.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>{avatarEmoji}</div>
        ) : (
         <div style={{width:"40px",height:"40px",borderRadius:"50%",background:avatarColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem",fontWeight:"800",color:"#000",fontFamily:F,flexShrink:0}}>{initials}</div>
        )}
        <div>
         <div style={{ fontSize:"0.95rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F }}>{currentUser.name}</div>
         <div style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>{currentUser.industry?.replace(/_/g," ")}</div>
        </div>
       </div>
      )}
      {/* Menu items */}
      <div style={{ padding:"8px 0" }}>
       {moreItems.map(item => {
        const active = view === item.id;
        return (
         <button key={item.id}
          onClick={async () => {
           haptic.medium();
           setMoreOpen(false);
           if (item.id === "settings") { setSettingsInitTab("profile"); navigateTo("settings"); }
           else if (item.id === "signout") { await window._sb?.auth?.signOut(); window.location.reload(); }
           else navigateTo(item.id);
          }}
          style={{ width:"100%", display:"flex", alignItems:"center", gap:"16px",
           padding:"14px 20px", background: active ? "rgba(29,201,232,0.07)" : "none",
           border:"none", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent",
           position:"relative",
          }}>
          <div style={{ color: active ? "var(--accent)" : item.danger ? "#E05577" : "var(--text-secondary)", flexShrink:0 }}>
           {item.icon}
          </div>
          <span style={{ fontSize:"1rem", fontWeight: active ? "700" : "500", color: active ? "var(--accent)" : item.danger ? "#E05577" : "var(--text-primary)", flex:1, textAlign:"left" }}>
           {item.label}
          </span>
          {item.badge && (
           <span style={{ background:"var(--accent)", color:"#000", borderRadius:"12px", fontSize:"0.65rem", padding:"2px 7px", fontWeight:"800", minWidth:"18px", textAlign:"center" }}>
            {item.badge}
           </span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
         </button>
        );
       })}
      </div>
     </div>
    </>
   )}

   {/* Bottom nav bar */}
   <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:300,
    background:"var(--glass-bg)", borderTop:"1px solid var(--border-1)",
    paddingBottom:"env(safe-area-inset-bottom, 0px)",
    boxShadow:"0 -1px 0 var(--border-1), 0 -8px 32px rgba(0,0,0,0.2)",
    backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
   }}>
    {/* Main tab row */}
    <div style={{ display:"flex", alignItems:"stretch", height:"56px" }}>
     {mainTabs.filter(t => !t.hidden).map(item => (
      <button key={item.id}
       onClick={() => {
        haptic.light();
        if (item.isMore) { setMoreOpen(o => !o); }
        else { setMoreOpen(false); navigateTo(item.id); }
       }}
       style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", gap:"3px", padding:"0 4px",
        background: "none", border:"none", cursor:"pointer",
        WebkitTapHighlightColor:"transparent", position:"relative",
       }}>
       {/* Active indicator — thin line above icon */}
       <div style={{ width:"20px", height:"2px", borderRadius:"1px",
        background: (item.active || (item.isMore && (isMore || moreOpen))) ? "var(--accent)" : "transparent",
        marginBottom:"2px", transition:"all 0.2s",
       }} />
       {item.isMore ? (
        // More button shows avatar when we have a user
        <div style={{ width:"32px", height:"32px", borderRadius:"50%",
         border: (isMore || moreOpen) ? "2px solid var(--accent)" : "2px solid var(--border-2)",
         display:"flex", alignItems:"center", justifyContent:"center",
         background: (isMore || moreOpen) ? "rgba(29,201,232,0.1)" : "var(--bg-2)",
         transition:"all 0.15s", overflow:"hidden",
        }}>
         <span style={{ fontSize:"0.7rem", fontWeight:"800", color: (isMore || moreOpen) ? "var(--accent)" : "var(--text-muted)", fontFamily:F }}>
          {initials}
         </span>
        </div>
       ) : (
        <item.Icon active={item.active} />
       )}
       <span style={{ fontSize:"0.62rem", fontWeight: item.active ? "700" : "500",
        fontFamily: F,
        color: (item.active || (item.isMore && (isMore || moreOpen))) ? "var(--accent)" : "var(--text-dim)",
        letterSpacing:"0.03em", lineHeight:1,
       }}>
        {item.label}
       </span>
       {/* Unread badge on messages (shown via More badge on nav) */}
       {item.isMore && totalUnread > 0 && (
        <span style={{ position:"absolute", top:"4px", right:"calc(50% - 18px)",
         background:"#E05577", color:"#fff", borderRadius:"10px",
         fontSize:"0.48rem", padding:"1px 4px", fontWeight:"800", lineHeight:"13px",
         minWidth:"13px", textAlign:"center",
        }}>
         {totalUnread > 9 ? "9+" : totalUnread}
        </span>
       )}
      </button>
     ))}
    </div>
   </div>

   <style>{`
    @keyframes slideUp {
     from { transform: translateY(100%); opacity: 0; }
     to   { transform: translateY(0);    opacity: 1; }
    }
   `}</style>
  </>
 );
}


// ── OnboardingTour — 3-step overlay for new users arriving via invite ─────────
function OnboardingTour({ step, crewName, onNext, onSkip }) {
  const F = "'DM Sans',system-ui,sans-serif";
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const steps = [
    {
      title: "Welcome to Cadence",
      body: "This is your Home. Every day starts here — your goals, your streak, your command center.",
      cta: "Show me the tracker →",
      // Highlight bottom of screen for Home tab
      spotlightBottom: true,
    },
    {
      title: "Log your activity here",
      body: "The Tracker is where you log your dials, connects, and anything else you're tracking. Tap the numbers, hit save. That's it.",
      cta: crewName ? `Now let's find ${crewName} →` : "Next →",
      spotlightBottom: true,
    },
    {
      title: crewName ? `You're in ${crewName}` : "Your crew",
      body: crewName
        ? `This is where you and your crew hold each other accountable. Everyone's numbers, one place.`
        : "This is where you and your crew hold each other accountable.",
      cta: "Let's go →",
      spotlightBottom: true,
    },
  ];

  const s = steps[step] || steps[0];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:99990, pointerEvents:"none" }}>
      {/* Dark overlay with hole at bottom for nav */}
      <div style={{ position:"absolute", inset:0, background:"rgba(8,12,24,0.88)", pointerEvents:"auto" }}
        onClick={onSkip} />

      {/* Tour card — positioned above bottom nav */}
      <div style={{
        position:"absolute",
        bottom: isMobile ? "calc(env(safe-area-inset-bottom,0px) + 80px)" : "80px",
        left:"50%", transform:"translateX(-50%)",
        width:"min(92vw, 400px)",
        background:"var(--bg-1,#0F1420)",
        border:"1px solid rgba(29,201,232,0.3)",
        borderRadius:"20px",
        padding:"24px",
        zIndex:99991,
        pointerEvents:"auto",
        boxShadow:"0 8px 40px rgba(0,0,0,0.6)",
        animation:"fadeUp 0.3s ease both",
      }}>
        {/* Step dots */}
        <div style={{ display:"flex", gap:"6px", marginBottom:"16px" }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? "20px" : "6px", height:"6px", borderRadius:"3px",
              background: i === step ? "#1DC9E8" : "rgba(255,255,255,0.15)",
              transition:"width 0.3s ease",
            }} />
          ))}
        </div>

        <div style={{ fontSize:"1.05rem", fontWeight:800, color:"#fff", fontFamily:F, marginBottom:"8px" }}>
          {s.title}
        </div>
        <div style={{ fontSize:"0.88rem", color:"rgba(255,255,255,0.55)", lineHeight:1.6, fontFamily:F, marginBottom:"20px" }}>
          {s.body}
        </div>

        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={onSkip} style={{
            background:"none", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.3)",
            borderRadius:"10px", padding:"10px 16px", fontSize:"0.82rem", cursor:"pointer", fontFamily:F,
          }}>
            Skip
          </button>
          <button onClick={onNext} style={{
            flex:1, background:"#1DC9E8", color:"#000", border:"none",
            borderRadius:"10px", padding:"11px 20px", fontSize:"0.88rem", fontWeight:800,
            cursor:"pointer", fontFamily:F,
          }}>
            {s.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App({ authUser, pendingInvite = null, isNewUser = false }) {
 const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 600;
 let _oid = null; // mutable org-id used across async init/onboarding functions

 // ── Onboarding tour ──────────────────────────────────────────────────────
 const [tourStep, setTourStep] = useState(null); // null | 0 | 1 | 2
 const [tourCrewName, setTourCrewName] = useState(null);
 const [joinFlash, setJoinFlash] = useState(null); // { spaceName } for existing users

 // ── Pull-to-refresh ──────────────────────────────────────────────────────
 const [pullRefreshing, setPullRefreshing] = useState(false);
 const [pullY, setPullY] = useState(0);
 const pullStartY = useRef(null);
 const pullStartXRef = useRef(null);
 const pullActive = useRef(false);
 const PULL_THRESHOLD = 72;

 async function doRefresh() {
  if (pullRefreshing) return;
  setPullRefreshing(true);
  haptic.light();
  try {
   const refreshOps = [];
   if (currentUser) {
    refreshOps.push(loadUserData(currentUser.id).then(d => setMyData(d || {})).catch(() => {}));
    refreshOps.push((async () => {
      try {
        const uid = currentUser.id;
        const all = await loadJournalEntries(uid).catch(() => []);
        const seenWks = new Set(all.map(e => e.weekKey).filter(Boolean));
        const legacyResults = [];
        const now2 = new Date();
        for (let i = 0; i < 52; i++) {
          const d = new Date(now2); d.setDate(d.getDate() - i * 7);
          const wk = weekKey(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
          if (seenWks.has(wk)) continue;
          try {
            const r = await loadWeeklyReflection(currentUser.id, wk);
            if (r && (r.wins||r.movedNeedle||r.intention||r.needle||r.what||r.text||r.templateId)) {
              legacyResults.push({ ...r, _wk: wk, templateId: r.templateId || "weekly", _type: r.templateId || "weekly" });
            }
          } catch {}
        }
        setAppJournalEntries([...all, ...legacyResults]);
        setJournalEntriesLoaded(true);
      } catch {}
    })());
    refreshOps.push(loadNotifications(currentUser.id).then(n => setNotifications(n || { items: [], unread: 0 })).catch(() => {}));
   }
   await Promise.all(refreshOps);
   haptic.success();
  } catch {}
  setTimeout(() => { setPullRefreshing(false); setPullY(0); }, 500);
 }

 function onPullTouchStart(e) {
  if (window.scrollY > 4) return;
  // Don't start PTR if touch begins in header + sub-nav zone (~150px total)
  const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sat") || "0") + 150;
  if (e.touches[0].clientY < safeTop) return;
  pullStartY.current = e.touches[0].clientY;
  pullStartXRef.current = e.touches[0].clientX;
  pullActive.current = true;
 }
 function onPullTouchMove(e) {
  if (!pullActive.current || pullStartY.current === null) return;
  if (window.scrollY > 4) { pullActive.current = false; setPullY(0); return; }
  const dx = Math.abs(e.touches[0].clientX - (pullStartXRef.current ?? e.touches[0].clientX));
  const dy = e.touches[0].clientY - pullStartY.current;
  // If horizontal swipe > 12px before significant vertical movement, cancel PTR (sub-nav scroll)
  if (dx > 12 && Math.abs(dy) < 20) { pullActive.current = false; setPullY(0); return; }
  if (dy > 0) {
   const clamped = Math.min(dy * 0.42, PULL_THRESHOLD * 1.15);
   setPullY(clamped);
  }
 }
 function onPullTouchEnd() {
  if (!pullActive.current) return;
  pullActive.current = false;
  if (pullY >= PULL_THRESHOLD) doRefresh();
  else { setPullY(0); }
  pullStartY.current = null;
 }
 const [loading,setLoading]=useState(true);
 const [showReflectionPrompt, setShowReflectionPrompt] = useState(false);
 const [reflectionDismissedKey, setReflectionDismissedKey] = useState(null);
 const [journalSettings, setJournalSettings] = useState({ showWeeklyPrompt: true });
 const [showJournalNudge, setShowJournalNudge] = useState(false);
 const [journalNudgeTemplate, setJournalNudgeTemplate] = useState("daily");
 const [nudgeDismissedKey, setNudgeDismissedKey] = useState(null);
 // ── Tracks ──
 const [userTracks, setUserTracks] = useState(null);   // null = not loaded yet
 const [activeTrackId, setActiveTrackId] = useState(null);
 const [showTrackManager, setShowTrackManager] = useState(false);
 const [users,setUsers]=useState([]);
 const [admins,setAdmins]=useState([]);
 const [superAdmin,setSuperAdmin]=useState(null);
 const [currentUser,setCurrentUser]=useState(null);
 const [allUsersData,setAllUsersData]=useState({});
 const [allUserGoals,setAllUserGoals]=useState({});
 const [myData,setMyData]=useState({});
 const [appJournalEntries,setAppJournalEntries]=useState([]);
 const [journalEntriesLoaded,setJournalEntriesLoaded]=useState(false);
 const [myGoals,setMyGoals]=useState({});
 const [myGoalPeriods,setMyGoalPeriods]=useState({}); // { [metricKey]: 'daily'|'weekly'|'monthly'|'annual' }
 const [myFreezes,setMyFreezes]=useState({ count:0, usedDates:[], pto:[], sick:[] });
 const [freezeBank,setFreezeBank]=useState({ count:0, lastEarnedWeek:'', usedDates:[] });
 const [showFreezePrompt,setShowFreezePrompt]=useState(false); // prompt to use freeze when streak breaks
 const [allFreezes,setAllFreezes]=useState({}); // {[userId]: freezes}
 const [industryConfigs,setIndustryConfigs]=useState(DEFAULT_INDUSTRIES);
 const [orgId, setOrgId] = useState(null);
 const [orgMeta, setOrgMeta] = useState(null);
 const [pendingInviteToken, setPendingInviteToken] = useState(null);
 // Pacer AI settings
 const [pacerSettings, setPacerSettings] = useState(() => {
  try {
   const stored = JSON.parse(localStorage.getItem("cadence-pacer-settings") || "{}");
   return { engagement: "high", tone: "challenging", hidden: false, ...stored };
  } catch { return { engagement: "high", tone: "challenging" }; }
 });
 function savePacerSettings(s) {
  const merged = { ...pacerSettings, ...s };
  setPacerSettings(merged);
  try { localStorage.setItem("cadence-pacer-settings", JSON.stringify(merged)); } catch {}
 }
 const [communities, setCommunities] = useState([]);
 const [activeSpaceId, setActiveSpaceId] = useState(null);
 const [communityMembers, setCommunityMembers] = useState({});
 const communityMembersLiveRef = useRef({});
 const [communityAdmins, setCommunityAdminsState] = useState({}); // {[communityId]: [userId, ...]}
 useEffect(()=>{communityMembersLiveRef.current=communityMembers;},[communityMembers]);
 const [globalSA, setGlobalSA] = useState(null); // { userId, userName, personalNs }
 const isGlobalSA = currentUser?.id === globalSA?.userId;
 const [orgPendingRequests, setOrgPendingRequests] = useState([]); // requests to join current org
 const [communityPendingRequests, setCommunityPendingRequests] = useState({}); // {[communityId]: [...]}
 // null / "solo" = personal, orgId = org view, communityId = community view
 const [activeSpaceFilter, _setActiveSpaceFilter] = useState(() => {
  try { return localStorage.getItem("at-space-filter") || "solo"; } catch { return "solo"; }
 });
 function setActiveSpaceFilter(val) {
  const next = typeof val === "function" ? val(activeSpaceFilter) : val;
  _setActiveSpaceFilter(next);
  try { localStorage.setItem("at-space-filter", next); } catch {}
 }
 // Auto-default: when user has an org, default filter to org (only if no saved preference)
 useEffect(() => {
  if (orgId && !orgId.startsWith("solo-")) {
   const saved = (() => { try { return localStorage.getItem("at-space-filter"); } catch { return null; } })();
   if (!saved) setActiveSpaceFilter(prev => prev === "solo" || prev === null ? orgId : prev);
  }
 }, [orgId]);
 const [spaceSearchResults, setSpaceSearchResults] = useState([]);
 // App-level feed (lifted so HomeScreen + FeedView both share it)
 const [appFeed, setAppFeed] = useState([]);
 function viewFromHash() {
  const h = window.location.hash.replace(/^#\/?/, "") || "home";
  const valid = ["home","org","crews","tracker","history","journal","messages","settings","feed","compete","leaderboard","dashboard","focus"];
  return valid.includes(h) ? h : "home";
 }
 const [view,setView]=useState(viewFromHash);
 const [showNotifs, setShowNotifs] = useState(false);
 const [showProfileMenu, setShowProfileMenu] = useState(false);
 const [viewProfileUser, setViewProfileUser] = useState(null);
 const [tourPage, setTourPage] = useState(null); // which page tour is open
 function openTour(pageId) { setTourPage(pageId); }
 function closeTour() { setTourPage(p => { try { if(p) localStorage.setItem(`cadence-tour-seen-${p}`, "1"); } catch {} return null; }); }
 // Auto-open tour on first visit to a page that has steps
 const tourablePages = Object.keys(TOUR_STEPS);
 useEffect(() => {
  if (!currentUser) return;
  if (!tourablePages.includes(view)) return;
  try {
   if (!localStorage.getItem(`cadence-tour-seen-${view}`)) {
    setTourPage(view);
   }
  } catch {}
 }, [view, currentUser?.id]);
 const [sideNavOpen, setSideNavOpen] = useState(false);
 function toggleSideNav() {
  setSideNavOpen(v => {
   const next = !v;
   try { localStorage.setItem("cadence-sidenav-open", next ? "1" : "0"); } catch {}
   return next;
  });
 }
 function closeSideNav() { setSideNavOpen(false); try { localStorage.setItem("cadence-sidenav-open", "0"); } catch {} }

 // Lifted sub-tab state so header bar can show sub-nav without hamburger
 // orgTab removed — all crew navigation uses comTab
 const [comTab, setComTab] = useState("dashboard");
 function navigateTo(v) {
  if(v===view) {
   // Already on this view — reset to dashboard tab
   if(v==="org") setComTab("dashboard");
   if(v==="crews") setComTab("dashboard");
   return;
  }
  // Navigating to org or communities — always land on dashboard
  if(v==="org") setComTab("dashboard");
  if(v==="crews") setComTab("dashboard");
  window.location.hash = "/" + v;
  setView(v);
 }
 useEffect(()=>{
  function onHashChange() {
   setView(viewFromHash());
  }
  window.addEventListener("hashchange", onHashChange);
  // Listen for internal navigation events (from Dashboard "Explore Crews" button)
  function onCadenceNav(e) { if(e.detail) { setSettingsInitTab("crews"); navigateTo("settings"); } }
  window.addEventListener("cadence:go-spaces", onCadenceNav);
  // Listen for ErrorBoundary "Return to Home"
  function onCadenceNavHome(e) { const dest = e.detail || "home"; window.location.hash = "/" + dest; setView(dest); }
  window.addEventListener("cadence-nav", onCadenceNavHome);
  // Navigate to settings with specific tab
  function onGoSettings(e) { const t = e.detail?.tab || "profile"; setSettingsInitTab(t); navigateTo("settings"); }
  window.addEventListener("cadence:go-settings", onGoSettings);
  // Update admins from AdminOrgTab
  function onUpdateAdmins(e) {
   const { orgId: eid, admins: newAdmins } = e.detail || {};
   if (eid && newAdmins) saveAdmins(eid, newAdmins).catch(()=>{});
  }
  window.addEventListener("cadence:update-admins", onUpdateAdmins);
  // Go to org admin tab from settings callout
  function onGoAdminTab() { navigateTo("crews"); }
  window.addEventListener("cadence:go-admin-tab", onGoAdminTab);
  return ()=> {
   window.removeEventListener("hashchange", onHashChange);
   window.removeEventListener("cadence:go-spaces", onCadenceNav);
   window.removeEventListener("cadence-nav", onCadenceNavHome);
   window.removeEventListener("cadence:go-settings", onGoSettings);
   window.removeEventListener("cadence:update-admins", onUpdateAdmins);
   window.removeEventListener("cadence:go-admin-tab", onGoAdminTab);
  };
 },[]);
 const [settingsInitTab,setSettingsInitTab]=useState("profile");
 const [homeTabState,setHomeTabState]=useState("team"); // "team" | "myperformance"
 const [selDate,setSelDate]=useState(todayStr());
 const [counts,setCounts]=useState({});
 const [notes,setNotes]=useState({});
 const [saving,setSaving]=useState(false);
 const [savedFlash,setSavedFlash]=useState(false);
 const [modal,setModal]=useState(null);
 const [showPacerWelcome,setShowPacerWelcome]=useState(false);
 const [showPaywall,setShowPaywall]=useState(false);
 const [paywallDefaultTier,setPaywallTier]=useState("pro");
 const [isPro,setIsPro]=useState(false);
 const [isElite,setIsElite]=useState(false);
 const [usageStatus,setUsageStatus]=useState(null); // full usage object for credit warnings
 const [isFreePlan,setIsFreePlan]=useState(true); // assume free until checked

 // Refresh plan + usage status whenever auth user changes or after AI calls
 const refreshUsage = React.useCallback(() => {
  import('./cadenceAI.js').then(({getUsageStatus})=>{
   getUsageStatus().then(u => {
    if (!u) return;
    setIsPro(u.is_pro||false);
    setIsElite(u.is_elite||false);
    setIsFreePlan(u.is_free);
    setUsageStatus(u);
   }).catch(()=>{});
  }).catch(()=>{});
 }, []);

 useEffect(()=>{ if(authUser) refreshUsage(); },[authUser]);
 useEffect(()=>{ if(currentUser?.id) refreshUsage(); },[currentUser?.id]);

 const [pacerWelcomeCtx,setPacerWelcomeCtx]=useState({ joinType:"solo", spaceName:"" });
 const [onboardPrompts,setOnboardPrompts]=useState([]); // [{id,text,actions:[{label,icon,action}]}]
 const onboardShownRef = useRef(false);
 const [globalFlashMsg, setGlobalFlashMsg] = useState("");
 function globalFlash(msg) { setGlobalFlashMsg(msg); setTimeout(() => setGlobalFlashMsg(""), 2500); }

 // ── Smart onboarding prompts — fires once per user, context-aware ────────
 function fireOnboardPrompts(user) {
  if (onboardShownRef.current) return;
  // Check if already seen
  try { if (localStorage.getItem(`cadence-onboard-prompts-${user.id}`)) return; } catch {}
  onboardShownRef.current = true;
  try { localStorage.setItem(`cadence-onboard-prompts-${user.id}`, "1"); } catch {}

  const now = new Date();
  const hour = now.getHours();
  const dow = now.getDay(); // 0=Sun, 1=Mon...6=Sat
  const isWeekend = dow === 0 || dow === 6;
  const isMon = dow === 1;
  const firstName = (user.name || "").split(" ")[0] || "there";

  // Welcome line — direct, not corny
  const welcomeLines = [
   "Good to have you here. Let's make this count.",
   "You showed up. That's step one.",
   "This is where the work gets tracked.",
   "Consistency is built one day at a time. Let's start.",
  ];
  const welcome = welcomeLines[Math.floor(Math.random() * welcomeLines.length)];

  // Context-aware prompt + actions
  let promptText = "";
  let actions = [];

  if (isWeekend) {
   promptText = "It's the weekend — a good time to set yourself up. What would you like to do?";
   actions = [
    { label: "Plan my Monday", icon: "📅", view: "tracker" },
    { label: "Set my goals", icon: "🎯", view: "settings", tab: "goals" },
    { label: "Explore the app", icon: "→", view: "home" },
   ];
  } else if (isMon && hour < 10) {
   promptText = "It's Monday morning. Best time to decide what winning looks like this week.";
   actions = [
    { label: "Set today's goals", icon: "🎯", view: "settings", tab: "goals" },
    { label: "Log first activity", icon: "⚡", view: "tracker" },
    { label: "See the leaderboard", icon: "🏆", view: "crews" },
   ];
  } else if (hour >= 5 && hour < 10) {
   promptText = "Morning. The day's wide open — what do you want to accomplish?";
   actions = [
    { label: "Set today's goals", icon: "🎯", view: "settings", tab: "goals" },
    { label: "Log my first activity", icon: "⚡", view: "tracker" },
    { label: "Set up my profile", icon: "👤", view: "settings", tab: "profile" },
   ];
  } else if (hour >= 10 && hour < 17) {
   promptText = "Good time to get your bearings. Here's where to start:";
   actions = [
    { label: "Log activity", icon: "⚡", view: "tracker" },
    { label: "Set my daily goals", icon: "🎯", view: "settings", tab: "goals" },
    { label: "Set up my profile", icon: "👤", view: "settings", tab: "profile" },
   ];
  } else {
   promptText = "Late start — no problem. Get set up so tomorrow hits the ground running.";
   actions = [
    { label: "Set my goals", icon: "🎯", view: "settings", tab: "goals" },
    { label: "Set up my profile", icon: "👤", view: "settings", tab: "profile" },
    { label: "Explore first", icon: "→", view: "home" },
   ];
  }

  // Fire welcome pill first, then context pill 2.5s later
  const welcomeId = Date.now();
  const promptId = Date.now() + 1;

  setTimeout(() => {
   setOnboardPrompts([{ id: welcomeId, text: welcome, actions: [] }]);
  }, 1200);

  setTimeout(() => {
   setOnboardPrompts(prev => [
    { id: promptId, text: promptText, actions },
    ...prev,
   ]);
  }, 3800);
 }

 // ── Daily recurring nudge — fires every app open, context-aware ──────────────
 // Reads real data: logged today? streak? day of week? goals set?
 function fireDailyNudge(user, todayData, streakData, hasGoals, todayPctVal) {
  const now = new Date();
  const hour = now.getHours();
  const dow = now.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const isFriday = dow === 5;
  const isMon = dow === 1;
  const isSun = dow === 0;
  const firstName = (user.name || "").split(" ")[0] || "";

  const hasLoggedToday = todayData && Object.values(todayData).some(v => typeof v === "number" && v > 0);
  const streakCount = streakData?.current || 0;
  const atGoal = todayPctVal >= 100;
  const nearGoal = todayPctVal >= 75 && todayPctVal < 100;

  // Daily check-in only fires after activity has been logged today (weekdays)
  // Weekend/Sunday planning nudges are exempt — those are time-based by design
  const isWeekday = !isWeekend;
  if (isWeekday && !hasLoggedToday) return;

  let text = "";
  let actions = [];

  // Priority decision tree — most specific context wins
  if (isSun && hour >= 18) {
   // Sunday evening — perfect week planning time
   text = "Sunday evening. Good time to get your head right for the week.";
   actions = [
    { label: "Plan my week", icon: "🗓️", view: "journal", journalTemplate: "monday_plan", journalMode: "plan" },
    { label: "Set weekly goals", icon: "🎯", view: "settings", tab: "goals" },
   ];
   // Sunday evening push — weekly digest (once per week)
   const digestKey = `cadence-digest-notif-${user.id}-${weekKey(todayStr())}`;
   const alreadySent = (() => { try { return !!localStorage.getItem(digestKey); } catch { return false; } })();
   if (!alreadySent) {
    try { localStorage.setItem(digestKey, "1"); } catch {}
    const last7 = Object.keys(myData || {}).filter(d => !isWeekend(d) && (new Date(todayStr())-new Date(d))/86400000 <= 7);
    const cfg = industryConfig?.weekdayMetrics || [];
    const weekAvg = last7.length ? Math.round(last7.reduce((s,d)=>s+computeGoalPct(myData[d]||{},cfg,myGoals),0)/last7.length) : null;
    notifWeeklyDigest(user.name, weekAvg, streakCount).catch(()=>{});
   }
  } else if (isWeekend) {
   // Weekend general
   text = streakCount > 0
    ? `${streakCount}-day streak. Weekend is a good time to plan ahead.`
    : "Weekend. Use the time — plan Monday before it arrives.";
   actions = [
    { label: "Plan my week", icon: "🗓️", view: "journal", journalTemplate: "monday_plan", journalMode: "plan" },
    { label: "Write a reflection", icon: "🔍", view: "journal", journalMode: "reflect" },
   ];
  } else if (isMon && hour < 10 && !hasLoggedToday) {
   // Monday morning, nothing logged yet
   text = !hasGoals
    ? "Monday. No goals set yet — hard to win without a target."
    : "Monday morning. First activity of the week.";
   actions = !hasGoals
    ? [
       { label: "Set my goals", icon: "🎯", view: "settings", tab: "goals" },
       { label: "Plan the week", icon: "🗓️", view: "journal", journalTemplate: "monday_plan", journalMode: "plan" },
      ]
    : [
       { label: "Log first activity", icon: "⚡", view: "tracker" },
       { label: "Plan the week", icon: "🗓️", view: "journal", journalTemplate: "monday_plan", journalMode: "plan" },
      ];
  } else if (atGoal && !isWeekend) {
   // Hit goals today
   const lines = [
    "Goals hit today. Reflect on what made it work.",
    "Numbers are in. Good time to write it down.",
    `${streakCount > 1 ? `${streakCount} days running. ` : ""}Goals done. What moved the needle?`,
   ];
   text = lines[Math.floor(Math.random() * lines.length)];
   actions = [
    { label: "Reflect on today", icon: "🔍", view: "journal", journalTemplate: "daily", journalMode: "reflect" },
    { label: "Log more", icon: "⚡", view: "tracker" },
   ];
  } else if (isFriday && hour >= 15) {
   // Friday afternoon — week review time
   text = hasLoggedToday
    ? "End of the week. Good time to look back before you close out."
    : "Friday afternoon. Wrap the week properly.";
   actions = [
    { label: "Week in Review", icon: "📅", view: "journal", journalTemplate: "weekly", journalMode: "reflect" },
    { label: "Log today's activity", icon: "⚡", view: "tracker" },
   ];
  } else if (!hasLoggedToday && !isWeekend && hour >= 9) {
   // Workday, nothing logged yet
   const lines = [
    `Nothing logged yet${streakCount > 1 ? ` — streak's at ${streakCount}` : ""}. Get something on the board.`,
    "No activity today yet. Start the clock.",
    hour >= 14 ? "Afternoon. Still time to make the day count." : "Morning. First log of the day.",
   ];
   text = lines[Math.floor(Math.random() * lines.length)];
   actions = [
    { label: "Log activity now", icon: "⚡", view: "tracker" },
    !hasGoals
     ? { label: "Set today's goals", icon: "🎯", view: "settings", tab: "goals" }
     : { label: "Plan the day", icon: "☀️", view: "journal", journalTemplate: "day_plan", journalMode: "plan" },
   ];
  } else if (nearGoal && !isWeekend) {
   // Close to goal
   text = `${Math.round(todayPctVal)}% of goal done. Push through.`;
   actions = [
    { label: "Log more activity", icon: "⚡", view: "tracker" },
   ];
  } else if (hour >= 17 && hasLoggedToday && !isWeekend) {
   // End of day, logged — reflect
   text = "Day's winding down. Good time to write it down.";
   actions = [
    { label: "Daily check-in", icon: "🔍", view: "journal", journalTemplate: "daily", journalMode: "reflect" },
    { label: "Keep logging", icon: "⚡", view: "tracker" },
   ];
  } else if (!hasGoals) {
   // No goals set at all
   text = "No daily goals set. Hard to know if you're winning without a target.";
   actions = [
    { label: "Set my goals", icon: "🎯", view: "settings", tab: "goals" },
   ];
  } else {
   // Default — time-based
   const defaults = {
    morning: { text: "Morning. Make it count.", actions: [{ label: "Log activity", icon: "⚡", view: "tracker" }, { label: "Log activity", icon: "📊", view: "tracker" }] },
    midday:  { text: "Midday check-in.", actions: [{ label: "Log activity", icon: "⚡", view: "tracker" }, { label: "Log activity", icon: "📊", view: "tracker" }] },
    evening: { text: "Day's almost done.", actions: [{ label: "Log activity", icon: "📊", view: "tracker" }, { label: "Reflect", icon: "🔍", view: "journal", journalTemplate: "daily", journalMode: "reflect" }] },
   };
   const bucket = hour < 12 ? "morning" : hour < 17 ? "midday" : "evening";
   text = defaults[bucket].text;
   actions = defaults[bucket].actions;
  }

  if (!text) return;

  // ── 15-min cooldown: don't fire again if opened recently ──
  const NUDGE_TS_KEY = `cadence-nudge-ts-${user.id}`;
  const NUDGE_DISMISSED_KEY = `cadence-nudge-dismissed-${user.id}-${new Date().toISOString().slice(0,10)}`;
  try {
   const lastFired = parseInt(localStorage.getItem(NUDGE_TS_KEY) || "0");
   const elapsedMin = (Date.now() - lastFired) / 60000;
   if (elapsedMin < 15) return; // opened again within 15 min — stay quiet
   localStorage.setItem(NUDGE_TS_KEY, String(Date.now()));
  } catch {}

  // ── Filter out actions the user already dismissed today ──
  const dismissedActions = (() => {
   try { return JSON.parse(localStorage.getItem(NUDGE_DISMISSED_KEY) || "[]"); } catch { return []; }
  })();
  const filteredActions = actions.filter(a => !dismissedActions.includes(a.label));

  const promptId = Date.now();
  setTimeout(() => {
   setOnboardPrompts([{ id: promptId, text, actions: filteredActions }]);
  }, 1800);
 }
 const [editDate,setEditDate]=useState(null);
 const [flashing,flash]=useFlash();
 const [pins,setPins]=useState({});
 const [teams,setTeams]=useState({}); // {memberId: leaderId}
 const [scriptPad,setScriptPad]=useState("");
 const scriptSaveTimer=useRef(null);
 const [dailyIntention,setDailyIntention]=useState("");

 const [darkMode, setDarkMode] = useState(() => {
  try { const v = localStorage.getItem("cadence-dark-mode"); return v === null ? true : v === "true"; } catch { return true; }
 });
 useEffect(() => {
  try { localStorage.setItem("cadence-dark-mode", String(darkMode)); } catch {}
  if(darkMode) document.body.classList.remove("light-mode");
  else document.body.classList.add("light-mode");
 }, [darkMode]);
 const intentionSaveTimer=useRef(null);

 const messaging = useMessaging(currentUser, users);
 const presenceMap = usePresence(currentUser, orgId);
 const notifications = useNotifications(currentUser);

 // ── Pacer vibe-check: fires ~60min after last nudge on a weekday ──
 useEffect(() => {
  if (!currentUser) return;
  if (isWeekend(todayStr())) return;
  const NUDGE_TS_KEY = `cadence-nudge-ts-${currentUser.id}`;
  const VIBE_KEY = `cadence-vibe-ts-${currentUser.id}-${todayStr()}`;
  function checkVibeTimer() {
   try {
    const lastNudge = parseInt(localStorage.getItem(NUDGE_TS_KEY) || "0");
    const lastVibe = parseInt(localStorage.getItem(VIBE_KEY) || "0");
    const elapsed = (Date.now() - Math.max(lastNudge, lastVibe)) / 60000;
    const hour = new Date().getHours();
    if (elapsed >= 60 && hour >= 9 && hour < 18) {
     localStorage.setItem(VIBE_KEY, String(Date.now()));
     const prompts = [
      "Quick check-in — how's the day going so far?",
      "Haven't heard from you in a bit. Still grinding?",
      "Energy check — on pace, or need to recalibrate?",
      "How's momentum today? Worth a quick look at your numbers.",
     ];
     const text = prompts[Math.floor(Math.random() * prompts.length)];
     setOnboardPrompts(prev => [...prev, { id: Date.now(), text, actions: [
      { label: "I'm good", onClick: () => {} },
      { label: "Behind pace", onClick: () => {} },
     ]}]);
    }
   } catch {}
  }
  const iv = setInterval(checkVibeTimer, 5 * 60 * 1000); // check every 5 min
  return () => clearInterval(iv);
 }, [currentUser?.id]);

 const countsRef=useRef(counts);
 const viewRef=useRef(view);
 const modalRef=useRef(modal);
 const activeMRef=useRef([]);
 const autoSaveTimer=useRef(null);
 const currentUserRef=useRef(currentUser);
 const myDataRef=useRef(myData);
 const selDateRef=useRef(selDate);
 const notesRef=useRef(notes);
 useEffect(()=>{countsRef.current=counts;},[counts]);
 useEffect(()=>{viewRef.current=view;},[view]);
 useEffect(()=>{modalRef.current=modal;},[modal]);
 useEffect(()=>{currentUserRef.current=currentUser;},[currentUser]);
 useEffect(()=>{myDataRef.current=myData;},[myData]);
 useEffect(()=>{selDateRef.current=selDate;},[selDate]);
 useEffect(()=>{notesRef.current=notes;},[notes]);

 const weekend=isWeekend(selDate);
 const activeTrack = userTracks?.find(t => t.id === activeTrackId) || userTracks?.[0] || null;
 const industryConfig = activeTrack
  ? getTrackConfig(activeTrack.industryKey, activeTrack.customConfig, industryConfigs)
  : (currentUser ? industryConfigs[currentUser.industry]||industryConfigs.freight : industryConfigs.freight);
 const activeMetrics=weekend?industryConfig.weekendMetrics:industryConfig.weekdayMetrics;
 useEffect(()=>{activeMRef.current=activeMetrics;},[activeMetrics]);

 useEffect(()=>{
  function onKey(e){
   if(e.key==="s"&&(e.ctrlKey||e.metaKey)){e.preventDefault();saveDay();return;}
   if(["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName))return;
   if(modalRef.current)return;
   if(viewRef.current!=="tracker")return;
   // Use e.code ("Digit1".."Digit9") instead of e.key so Shift+1 still matches keyBind "1"
   // Extract digit from Digit1-9 or Numpad1-9 (e.code is reliable even with Shift held)
   let digit=null;
   if(e.code?.startsWith("Digit"))digit=e.code.replace("Digit","");
   else if(e.code?.startsWith("Numpad")){
    const nd=e.code.replace("Numpad","");
    // e.key is reliable on numpad UNLESS Windows NumLock+Shift converts it to nav key
    if(/^[0-9]$/.test(nd))digit=nd;
   }
   // Also handle NumLock OFF case: e.location===3 means numpad, e.key may be the digit
   if(!digit&&e.location===3&&/^[0-9]$/.test(e.key))digit=e.key;
   const m=digit?activeMRef.current.find(m=>m.keyBind===digit):null;
   if(m){e.preventDefault();const delta=e.shiftKey?-1:1;setCounts(prev=>{const cur=prev[m.key]||0;return{...prev,[m.key]:Math.max(0,cur+delta)};});flash(m.key,delta>0?"up":"down");return;}

  }
  window.addEventListener("keydown",onKey);
  return()=>window.removeEventListener("keydown",onKey);
 },[]);

 useEffect(()=>{init();},[]);

 // ── Handle pending invite (from main.jsx after signup/login via invite link) ─
 useEffect(() => {
   if (!pendingInvite || !currentUser) return;
   sessionStorage.removeItem("cadence-pending-invite");
   // Join the crew using the invite token
   joinCommunity(pendingInvite).then(() => {
     if (isNewUser) {
       // Start onboarding tour for new users
       const inv = window._pendingInviteData;
       setTourCrewName(inv?.spaceName || null);
       setTourStep(0);
     }
     // For existing users — flash handled by joinCommunity itself
   }).catch(console.error);
 }, [pendingInvite, currentUser]);

 // ── Handle cadence:join-invite event (existing session hits invite URL) ──
 useEffect(() => {
   function handleJoinInvite(e) {
     const { token, spaceName, isNewUser: newU } = e.detail || {};
     if (!token) return;
     joinCommunity(token).then(() => {
       setJoinFlash({ spaceName });
       setTimeout(() => setJoinFlash(null), 4000);
       navigateTo("crews");
     }).catch(console.error);
   }
   window.addEventListener("cadence:join-invite", handleJoinInvite);
   return () => window.removeEventListener("cadence:join-invite", handleJoinInvite);
 }, []);

 async function init(){
  setLoading(true);

  const gsa = await loadGlobalSuperAdmin();
  if(gsa) setGlobalSA(gsa);

  const inviteToken = getInviteTokenFromURL();
  if(inviteToken) {
   const invite = await loadInvite(inviteToken);
   if(invite) {
    try { localStorage.setItem("at-pending-invite", inviteToken); } catch {}
    window.history.replaceState({}, "", "/");
   }
  }

  let capturedToken = null;
  try { capturedToken = localStorage.getItem("at-pending-invite"); } catch {}
  if(capturedToken) {
   const inv = await loadInvite(capturedToken);
   if(inv) setPendingInviteToken(capturedToken);
   else { try { localStorage.removeItem("at-pending-invite"); } catch {} }
  }

  let storedOrgId = null;
  let storedUserId = null;
  try {
   storedOrgId = localStorage.getItem("at-org-id");
   storedUserId = localStorage.getItem("at-uid");
  } catch {}

  if(storedOrgId) {
   _oid = storedOrgId; setNs(storedOrgId);
   const meta = await loadOrgMeta(storedOrgId);
   if(meta) { setOrgId(storedOrgId); setOrgMeta(meta); }
   await loadAppData(storedOrgId, storedUserId);
  } else if(storedUserId) {
   const soloOrgId = soloNs(storedUserId);
   _oid = soloOrgId; setNs(soloOrgId);
   setOrgId(soloOrgId);
   await loadAppData(soloOrgId, storedUserId);
  } else {
   // No localStorage — check registry by authUid before showing onboarding
   // This handles Google auth on new devices / after clearing storage
   if(authUser?.id) {
    try {
     const registry = await loadUserRegistry();
     const regEntry = registry?.find(r => r.authUid === authUser.id);
     if(regEntry?.personalNs) {
      _oid = regEntry.personalNs; setNs(regEntry.personalNs);
      setOrgId(regEntry.personalNs);
      localStorage.setItem("at-org-id", regEntry.personalNs);
      if(regEntry.userId) localStorage.setItem("at-uid", regEntry.userId);
      await loadAppData(regEntry.personalNs, regEntry.userId);
      return;
     }
    } catch(e) { console.warn("Registry lookup failed on startup", e); }
   }
   setModal("onboarding");
   setLoading(false);
  }
 }

 async function loadAppData(resolvedOrgId, savedUserId) {
  const [lu,adm,sa]=await Promise.all([loadUsers(),loadAdmins(),loadSuperAdmin()]);
  // Load avatar photos separately (stored outside users array to avoid size limits)
  const usersWithPhotos = await Promise.all(lu.map(async u => {
   const photo = await loadAvatarPhoto(u.id);
   return photo ? {...u, avatarUrl: photo} : u;
  }));
  setUsers(usersWithPhotos);setAdmins(adm);setSuperAdmin(sa);
  const gsa = await loadGlobalSuperAdmin();
  if(gsa) setGlobalSA(gsa);
  const [cfgF,cfgR]=await Promise.all([loadIndustryConfig("freight"),loadIndustryConfig("realestate")]);
  const configs={freight:cfgF,realestate:cfgR};
  const customKeys=(await storageGet(ns("at-custom-industries")))||[];
  for(const k of customKeys){configs[k]=await loadIndustryConfig(k);}
  setIndustryConfigs(configs);
  const allData={},allGoals={};
  for(const u of lu){allData[u.id]=await loadUserData(u.id);allGoals[u.id]=(await storageGet(ns(`at-goals-${u.id}`)))||{};}
  const loadedPins=await loadPins();
  setPins(loadedPins);
  const loadedTeams=await loadTeams();
  setTeams(loadedTeams);
  setAllUsersData(allData);setAllUserGoals(allGoals);
  // Try to find user by Supabase auth UID first (most secure), then fall back to localStorage
  const authMatchedUser = authUser?.id ? lu.find(u => u.authUid === authUser.id) : null;
  const effectiveSavedUserId = authMatchedUser ? authMatchedUser.id : savedUserId;
  if(effectiveSavedUserId){
   const found=lu.find(u=>u.id===effectiveSavedUserId);
   if(found){
    await loginAs(found,allData,allGoals,configs);
    await loadUserCommunities(savedUserId);
    if(adm.includes(savedUserId) && resolvedOrgId && !resolvedOrgId.startsWith("solo-")) {
     loadPendingRequests(resolvedOrgId).then(r => setOrgPendingRequests(r)).catch(()=>{});
    }
    setLoading(false);
    // Register service worker for push notifications (silent — no permission prompt yet)
    registerServiceWorker().catch(() => {});
    // Schedule 3pm streak-at-risk check if notifications already granted
    if (notifPermission() === 'granted') {
     scheduleStreakCheck(
      () => Promise.resolve(computeStreak(allData?.[found.id] || {})?.current || 0),
      () => { const dk = new Date().toISOString().slice(0,10); return Promise.resolve(!!(allData?.[found.id]?.[dk] && Object.values(allData[found.id][dk]).some(v=>v>0))); },
      found.name
     );
     // Schedule time-blocked nudge based on user's historical log pattern
     const logPattern = detectLogTimePattern(allData?.[found.id] || {});
     if (logPattern !== null) {
      // Schedule a time-blocked nudge at the user's typical logging hour
      const scheduleTimeBlockedNudge = () => {
       const now3 = new Date();
       const target3 = new Date(); target3.setHours(logPattern, 15, 0, 0);
       if (target3 <= now3) target3.setDate(target3.getDate() + 1);
       const ms3 = target3 - now3;
       setTimeout(async () => {
        const dk3 = new Date().toISOString().slice(0, 10);
        const logged3 = !!(allData?.[found.id]?.[dk3] && Object.values(allData[found.id][dk3]).some(v => v > 0));
        if (!logged3) {
         await fireNotif({ title: `It's ${logPattern > 12 ? logPattern-12 : logPattern}${logPattern >= 12 ? 'pm' : 'am'} — you usually log around now`, body: `${found.name.split(' ')[0]}, jump in and get a few entries down.`, tag: 'cadence-time-nudge', url: '/?view=tracker' });
        }
        scheduleTimeBlockedNudge(); // reschedule for tomorrow
       }, ms3);
      };
      scheduleTimeBlockedNudge();
     }
     // Schedule Sunday evening weekly digest notification (7pm)
     const now2 = new Date(); const dow2 = now2.getDay();
     if (dow2 === 0 || dow2 === 6) { // weekend — set for this Sunday 7pm
      const nextSun = new Date(); nextSun.setHours(19,0,0,0);
      if (now2.getDay() !== 0) { nextSun.setDate(nextSun.getDate() + (7 - nextSun.getDay())); }
      const msToSun = nextSun - now2;
      if (msToSun > 0 && msToSun < 48*3600000) {
       setTimeout(() => {
        const uData = allData?.[found.id] || {};
        const cfg2 = configs?.[found.industry] || Object.values(configs||{})[0] || {};
        const goals2 = allGoals?.[found.id] || {};
        const wkStr = weekKey(todayStr());
        let totalPct = 0, days = 0;
        for (let i = 0; i < 5; i++) {
         const d = new Date(); d.setDate(d.getDate() - i);
         const dk2 = d.toISOString().slice(0,10);
         if (isWeekend(dk2) || !uData[dk2]) continue;
         totalPct += computeGoalPct(uData[dk2], cfg2?.weekdayMetrics||[], goals2);
         days++;
        }
        const weekAvg = days > 0 ? Math.round(totalPct/days) : null;
        const streak2 = computeStreak(uData)?.current || 0;
        notifWeeklyDigest(found.name, weekAvg, streak2).catch(() => {});
        // Also send email digest if Resend key configured and user has email
        const resendKey2 = import.meta.env.VITE_RESEND_KEY;
        const userEmail2 = found.email || found.authEmail;
        if (resendKey2 && userEmail2) {
         const metrics2 = cfg2?.weekdayMetrics || [];
         const goals2v = allGoals?.[found.id] || {};
         const topMetrics2 = metrics2.slice(0, 4).map(m => {
          let total = 0; let days2 = 0;
          for (let i2 = 0; i2 < 5; i2++) {
           const d2 = new Date(); d2.setDate(d2.getDate() - i2);
           const dk3 = d2.toISOString().slice(0,10);
           if (!isWeekend(dk3) && uData[dk3]?.[m.key]) { total += uData[dk3][m.key]; days2++; }
          }
          return { label: m.label || m.key, value: total, goal: (goals2v[m.key] ?? m.defaultGoal ?? 0) * 5 };
         }).filter(m => m.value > 0);
         const bestDayStr = (() => {
          let best = null, bestPct2 = -1;
          for (let i3 = 0; i3 < 5; i3++) {
           const d3 = new Date(); d3.setDate(d3.getDate() - i3);
           const dk4 = d3.toISOString().slice(0,10);
           if (isWeekend(dk4)) continue;
           const p = computeGoalPct(uData[dk4]||{}, metrics2, goals2v);
           if (p > bestPct2) { bestPct2 = p; best = dk4; }
          }
          if (!best) return null;
          const d4 = new Date(best + 'T12:00:00');
          return d4.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' }) + ` (${bestPct2}%)`;
         })();
         sendWeeklyDigestEmail({ toEmail: userEmail2, userName: found.name, weekAvgPct: weekAvg, streakDays: streak2, topMetrics: topMetrics2, bestDay: bestDayStr, resendKey: resendKey2 }).catch(() => {});
        }
       }, msToSun);
      }
     }
    }
    // Fire onboarding prompts for brand-new users; daily nudge for everyone else
    const isFirstTime = !(() => { try { return localStorage.getItem(`cadence-onboard-prompts-${found.id}`); } catch { return false; } })();
    if (isFirstTime) {
     setTimeout(() => fireOnboardPrompts(found), 2000);
    } else {
     setTimeout(() => {
      const todayKey = new Date().toISOString().slice(0,10);
      const td = allData?.[todayKey] || {};
      const hasGoals = !!(allGoals?.[found.id] && Object.keys(allGoals[found.id]).length > 0);
      const goals = allGoals?.[found.id] || {};
      const cfg = configs?.[found.industry] || Object.values(configs||{})[0] || {};
      const wdMetrics = cfg?.weekdayMetrics || [];
      const realPct = wdMetrics.length ? computeGoalPct(td, wdMetrics, goals) : 0;
      fireDailyNudge(found, td, null, hasGoals, realPct);
     }, 2500);
    }
    return;
   }
  }
  // If authenticated via Supabase but no matching Cadence profile found in current namespace —
  // do a global registry search before creating anything new (prevents duplicates on new devices)
  if (authUser?.id) {
   try {
    const registry = await loadUserRegistry();
    const regMatch = registry.find(r => r.userId && lu.find(u => u.id === r.userId && u.authUid === authUser.id));
    if (!regMatch) {
     // Also search by scanning all solo namespaces for this authUid
     // Try common pattern: registry entry where personalNs exists
     let regEntry = registry.find(r => r.authUid === authUser.id);

     // Fallback: search by email for Google users whose profiles predate authUid linking
     if (!regEntry && authUser.email) {
      regEntry = registry.find(r => r.email && r.email.toLowerCase() === authUser.email.toLowerCase());
      // Also try matching by userName against email prefix
      if (!regEntry) {
       const emailPrefix = authUser.email.split("@")[0].toLowerCase();
       const fullName = (authUser.user_metadata?.full_name || authUser.user_metadata?.name || "").toLowerCase();
       regEntry = registry.find(r =>
        r.userName && (
         r.userName.toLowerCase().replace(/\s+/g, "") === fullName.replace(/\s+/g, "") ||
         r.userName.toLowerCase().replace(/\s+/g, "").includes(emailPrefix)
        )
       );
      }
     }

     if (regEntry?.personalNs) {
      // Found their namespace in registry — switch to it and reload
      _oid = regEntry.personalNs; setNs(regEntry.personalNs);
      setOrgId(regEntry.personalNs);
      localStorage.setItem("at-org-id", regEntry.personalNs);
      if (regEntry.userId) localStorage.setItem("at-uid", regEntry.userId);
      await loadAppData(regEntry.personalNs, regEntry.userId);
      return;
     }
    }
   } catch(e) { console.warn("Registry search failed", e); }

   // Truly new user — safe to create
   const displayName = authUser.user_metadata?.full_name
     || authUser.user_metadata?.name
     || authUser.email?.split("@")[0]
     || "New User";
   const userId = `user-${Date.now()}`;
   const soloOrgId = soloNs(userId); // use cadence userId for namespace, not auth.id
   _oid = soloOrgId;
   setNs(soloOrgId);
   setOrgId(soloOrgId);
   const nu = { id: userId, name: displayName, industry: "freight", authUid: authUser.id };
   const updated = [nu]; // solo space starts fresh
   setUsers(updated);
   await saveUsers(updated);
   const newAllData = { [nu.id]: {} };
   const newAllGoals = { [nu.id]: {} };
   setAllUsersData(newAllData);
   setAllUserGoals(newAllGoals);
   await saveUserData(nu.id, {});
   const newAdmins = [nu.id];
   setAdmins(newAdmins); await saveAdmins(newAdmins);
   setSuperAdmin(nu.id); await saveSuperAdmin(nu.id);
   localStorage.setItem("at-uid", nu.id);
   localStorage.setItem("at-org-id", soloOrgId);
   await registerUserGlobally(nu.id, nu.name, soloOrgId, soloOrgId, "solo", "Solo");
   await loginAs(nu, newAllData, newAllGoals, industryConfigs);
   setPacerWelcomeCtx({ joinType: "solo", spaceName: "" });
   setShowPacerWelcome(true);
   setModal(null);
   setLoading(false);
   // Fire onboarding prompts after a short delay so home screen loads first
   setTimeout(() => fireOnboardPrompts(nu), 1500);
   return; // new users get onboarding prompts, not daily nudge
  }
  if(lu.length > 0) { setModal("setup"); } else { setModal("onboarding"); }
  setLoading(false);
 }

 async function loadUserCommunities(userId) {
  const mem = await loadUserMemberships(userId);
  const comIds = mem.communityIds || [];
  if(comIds.length === 0) { setCommunities([]); setCommunityMembers({}); return []; }
  const metas = await Promise.all(comIds.map(cid => loadSpaceMeta(cid)));
  const validMetas = metas.filter(Boolean);
  setCommunities(validMetas);
  const membersMap = {};
  const adminsMap = {};
  for(const cm of validMetas) {
   membersMap[cm.id] = await loadCommunityMembers(cm.id);
   adminsMap[cm.id] = await loadSpaceAdmins(cm.id);
  }
  setCommunityMembers(membersMap);
  setCommunityAdminsState(adminsMap);
  return validMetas;
 }

 async function loginAs(user,allData,allGoals,configs){
  try{
   localStorage.setItem("at-uid",user.id);
   if(_oid) localStorage.setItem("at-org-id", _oid);
   // Link auth UID to cadence user ID for future auto-login
   if(authUser?.id && !user.authUid) {
    const updated = {...user, authUid: authUser.id};
    const lu = await loadUsers();
    const idx = lu.findIndex(u => u.id === user.id);
    if(idx >= 0) { lu[idx] = updated; await saveUsers(lu); setCurrentUser(updated); user = updated; }
    // Also store authUid in global registry so cross-device lookup works
    try {
     const reg = await loadUserRegistry();
     const regIdx = reg.findIndex(r => r.userId === user.id);
     if(regIdx >= 0 && !reg[regIdx].authUid) {
      reg[regIdx] = {...reg[regIdx], authUid: authUser.id};
      await storageSet("USER_REGISTRY", reg);
     }
    } catch {}
   }
  }catch{}
  setCurrentUser(user);
  // ── Load journal entries for workspace nudge / week recap ──
  (async () => {
    try {
      const uid = user.id;
      const all = await loadJournalEntries(uid).catch(() => []);
      const seenWks = new Set(all.map(e => e.weekKey).filter(Boolean));
      const legacyResults = [];
      const now2 = new Date();
      for (let i = 0; i < 52; i++) {
        const d = new Date(now2); d.setDate(d.getDate() - i * 7);
        const wk = weekKey(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
        if (seenWks.has(wk)) continue;
        try {
          const r = await loadWeeklyReflection(uid, wk);
          if (r && (r.wins||r.movedNeedle||r.intention||r.needle||r.what||r.text||r.templateId)) {
            legacyResults.push({ ...r, _wk: wk, templateId: r.templateId || "weekly", _type: r.templateId || "weekly" });
          }
        } catch {}
      }
      setAppJournalEntries([...all, ...legacyResults]);
    } catch {}
    setJournalEntriesLoaded(true);
  })();
  // ── Load user's Tracks ──
  loadUserTracks(user.id).then(async tracks => {
   if (!tracks) {
    // Migrate: create a default track from their existing industry
    const defaultTrack = {
     id: "default",
     name: user.industry ? (DEFAULT_INDUSTRIES[user.industry]?.label || user.industry) : "My Work",
     industryKey: user.industry || "freight",
     icon: user.industry ? (DEFAULT_INDUSTRIES[user.industry]?.icon || "◆") : "🚛",
     createdAt: Date.now(),
    };
    tracks = [defaultTrack];
    await saveUserTracks(user.id, tracks);
   }
   setUserTracks(tracks);
   const aid = await loadActiveTrackId(user.id);
   const validId = tracks.find(t => t.id === (aid || "default")) ? (aid || "default") : tracks[0]?.id;
   setActiveTrackId(validId);
  }).catch(() => {});
  const ud=allData?allData[user.id]:await loadUserData(user.id);
  const ug=allGoals?allGoals[user.id]:(await storageGet(ns(`at-goals-${user.id}`)))||{};
  const ugp=(await storageGet(ns(`at-goalperiods-${user.id}`)))||{};
  setMyData(ud||{});setMyGoals(ug||{});setMyGoalPeriods(ugp||{});
  loadStreakFreezes(user.id).then(f=>{
   const fData=f||{count:0,usedDates:[],pto:[],sick:[]};
   setMyFreezes(fData);
   setAllFreezes(p=>({...p,[user.id]:fData}));
  }).catch(()=>{});
  loadFreezeBank(user.id).then(b=>setFreezeBank(b||{count:0,lastEarnedWeek:'',usedDates:[]})).catch(()=>{});
  const activeDate=selDateRef.current||todayStr();
  const activeData=(ud||{})[activeDate]||{};
  setCounts(activeData);
  setNotes(activeData._notes||{});
  const script=await storageGet(ns(`at-script-${user.id}`));
  setScriptPad(script||"");
  const intention=await storageGet(ns(`at-intention-${user.id}-${todayStr()}`));
  setDailyIntention(intention||"");
  // Load crew memberships and pending requests (non-blocking)
  loadUserCommunities(user.id).then(async comList => {
   if(comList && comList.length > 0) loadAllCommunityPending(comList).catch(()=>{});
  }).catch(()=>{});
 }

 // ── Track management ──────────────────────────────────────────────────
 async function switchTrack(trackId) {
  if (!currentUser) return;
  setActiveTrackId(trackId);
  await saveActiveTrackId(currentUser.id, trackId);
  // Load data for the newly active track
  const track = userTracks?.find(t => t.id === trackId);
  if (!track) return;
  const dataKey = trackDataKey(currentUser.id, trackId);
  const goalKey = trackGoalKey(currentUser.id, trackId);
  const [ud, ug] = await Promise.all([
   storageGet(ns(dataKey)),
   storageGet(ns(goalKey)),
  ]);
  setMyData(ud || {});
  setMyGoals(ug || {});
  const today = todayStr();
  const todayData = (ud || {})[today] || {};
  setCounts(todayData);
  setNotes(todayData._notes || {});
 }

 async function createTrack(track) {
  if (!currentUser) return;
  const newTracks = [...(userTracks || []), track];
  setUserTracks(newTracks);
  await saveUserTracks(currentUser.id, newTracks);
  // Switch to the new track
  await switchTrack(track.id);
 }

 async function updateTrack(trackId, updatedConfig) {
  if (!currentUser) return;
  // Update the customConfig on the matching track
  const newTracks = (userTracks || []).map(t => t.id === trackId
   ? { ...t, customConfig: updatedConfig }
   : t
  );
  setUserTracks(newTracks);
  await saveUserTracks(currentUser.id, newTracks);
  // Also update industryConfigs in memory for immediate UI refresh
  const customKey = `custom-${trackId}`;
  setIndustryConfigs(prev => ({ ...prev, [customKey]: updatedConfig }));
 }

 async function deleteTrack(trackId) {
  if (!currentUser || (userTracks || []).length <= 1) return;
  const newTracks = (userTracks || []).filter(t => t.id !== trackId);
  setUserTracks(newTracks);
  await saveUserTracks(currentUser.id, newTracks);
  // Switch to first remaining track
  if (activeTrackId === trackId) {
   await switchTrack(newTracks[0]?.id || "default");
  }
 }

 // Override saveUserData/loadUserData to be track-scoped
 async function saveMyData(updated) {
  const tId = activeTrackId || "default";
  const key = ns(trackDataKey(currentUser.id, tId));
  await storageSet(key, updated);
  setMyData(updated);
  // Keep allUsersData in sync for leaderboard
  setAllUsersData(prev => ({ ...prev, [currentUser.id]: updated }));
 }

 async function selectUser(user){
  if(currentUser?.id===superAdmin){
   await loginAs(user,allUsersData,allUserGoals,industryConfigs);
   setModal(null);
   return;
  }
  if(pins[user.id]){
   setPinTarget(user);
   setModal("pin");
  } else {
   await loginAs(user,allUsersData,allUserGoals,industryConfigs);
   setModal(null);
  }
 }

 // Called by onboarding after path is chosen — sets _oid and orgId state
 async function loginToSpace(spaceId, userId) {
  _oid = spaceId; setNs(spaceId);
  try { localStorage.setItem("at-org-id", spaceId); } catch {}
  const meta = await loadOrgMeta(spaceId);
  if(meta) { setOrgId(spaceId); setOrgMeta(meta); } else { setOrgId(spaceId); }
  // Load space data without auto-login so we can check PIN first
  await loadAppData(spaceId, null);
  const loadedPins = await loadPins();
  // Find the user in newly loaded state via the returned list
  const lu = await loadUsers();
  const found = lu.find(u=>u.id===userId);
  if(!found) { setModal("setup"); setLoading(false); return; }
  if(loadedPins[userId]) {
   setPinTarget(found);
   setModal("pin");
  } else {
   await loginAs(found, null, null, null);
   setModal(null);
  }
  setLoading(false);
 }

 async function loadUsersForSpace(spaceId) {
  const savedOid = getNs();
  setNs(spaceId);
  try { return (await loadUsers()) || []; }
  catch { return []; }
  finally { setNs(savedOid); }
 }

 async function resolveOrg(resolvedOrgId, meta) {
  _oid = resolvedOrgId; setNs(resolvedOrgId);
  setOrgId(resolvedOrgId);
  if(meta) setOrgMeta(meta);
  try { localStorage.setItem("at-org-id", resolvedOrgId); } catch {}
 }

 async function createUser(name,industry,withPreload=false,initialPin=null,teamLeaderId=null){
  if(users.some(u=>u.name.trim().toLowerCase()===name.trim().toLowerCase())) return;
  // If this is an org and the org has an enforced industry, use it
  const effectiveIndustry = (orgMeta && orgMeta.enforcedIndustry) ? orgMeta.enforcedIndustry : industry;
  const nu={id:`user-${Date.now()}`,name,industry:effectiveIndustry,...(authUser?.id?{authUid:authUser.id}:{})};
  const initData=withPreload&&effectiveIndustry==="freight"?{...PRELOADED_DATA}:{};
  const updated=[...users,nu];setUsers(updated);await saveUsers(updated);
  const newAllData={...allUsersData,[nu.id]:initData};
  const newAllGoals={...allUserGoals,[nu.id]:{}};
  setAllUsersData(newAllData);setAllUserGoals(newAllGoals);
  await saveUserData(nu.id,initData);
  if(initialPin){const nextPins={...pins,[nu.id]:initialPin};setPins(nextPins);await savePins(nextPins);}
  if(teamLeaderId){const nextTeams={...teams,[nu.id]:teamLeaderId};setTeams(nextTeams);await saveTeams(nextTeams);}
  // Note: admin/superadmin designation is set separately by the founder — not auto-assigned
  await registerUserGlobally(nu.id, nu.name, _oid, _oid, _oid?.startsWith("org-")?"org":_oid?.startsWith("solo-")?"solo":"unknown", orgMeta?.name||"Solo");
  await loginAs(nu,newAllData,newAllGoals,industryConfigs);
  try { localStorage.removeItem("at-pending-invite"); } catch {}
  setPendingInviteToken(null);
  setModal(null);
 }

 // Start a new org — called from onboarding "Create Managed Crew" path
 // startOrganization → now creates a managed crew using personal namespace
 async function startOrganization(crewName, userName, industry, initialPin=null, customCfg=null, customIndKey=null) {
  // User gets personal namespace just like solo/open crew
  const tempId = `user-${Date.now()}`;
  const soloId = soloNs(tempId);
  await resolveOrg(soloId, null);
  if (customCfg && customIndKey) {
   await saveIndustryConfig(customIndKey, customCfg);
   const existing = (await storageGet(ns("at-custom-industries"))) || [];
   if (!existing.includes(customIndKey)) await storageSet(ns("at-custom-industries"), [...existing, customIndKey]);
   setIndustryConfigs(p=>({...p,[customIndKey]:customCfg}));
   await createUser(userName, customIndKey, false, initialPin, null);
  } else {
   await createUser(userName, industry, false, initialPin, null);
  }
  // Create the managed crew and add founder
  setTimeout(async () => {
   try {
    await createCommunitySpace(crewName, "", "", "managed");
   } catch(e) { console.error("Managed crew creation error:", e); }
  }, 200);
 }

 // Start as solo individual (optionally creates a community too)
 async function startSolo(userName, industry, initialPin=null, communityName=null, communityDesc="", customCfg=null, customIndKey=null) {
  const tempId = `user-${Date.now()}`;
  const soloOrgId = soloNs(tempId);
  await resolveOrg(soloOrgId, null);
  // Save custom industry config if provided
  if(customCfg && customIndKey) {
   await saveIndustryConfig(customIndKey, customCfg);
   const existing = (await storageGet(ns("at-custom-industries"))) || [];
   if(!existing.includes(customIndKey)) await storageSet(ns("at-custom-industries"), [...existing, customIndKey]);
   setIndustryConfigs(p=>({...p,[customIndKey]:customCfg}));
   await createUser(userName, customIndKey, false, initialPin, null);
  } else {
   await createUser(userName, industry, false, initialPin, null);
  }
  // If they also want to create a community, do it after user is set up
  if(communityName) {
   setTimeout(async () => {
    try { await createCommunitySpace(communityName, communityDesc); } catch(e) { console.error(e); }
   }, 100);
  }
 }

 async function joinOrg(token, name, industry, initialPin=null, customCfg=null, customIndKey=null) {
  const invite = await consumeInvite(token);
  if(!invite) { alert("This invite link is no longer valid or has been revoked."); return; }
  if(invite._expired) { alert("This invite link has expired. Please ask your admin for a fresh link."); return; }
  if(invite._maxed) { alert("This invite link has reached its maximum uses. Please ask your admin for a new one."); return; }

  // Handle Crew invites — set up solo user first, then add to community
  // All invite types (open and managed crews) use personal namespace
  if(invite.spaceType === "community" || invite.spaceType === "org" || invite.crewType) {
   const crewId = invite.spaceId;
   await startSolo(name, industry, initialPin, null, "", customCfg, customIndKey);
   setTimeout(async () => {
    try {
     const meta = await loadSpaceMeta(crewId);
     if(!meta) return;
     const user = currentUserRef.current;
     if(!user) return;
     await addCommunityMember(crewId, user, _oid);
     const mem = await loadUserMemberships(user.id);
     if(!(mem.communityIds||[]).includes(crewId)) {
      await saveUserMemberships(user.id, { ...mem, communityIds: [...(mem.communityIds||[]), crewId] });
     }
     await loadUserCommunities(user.id);
     const crewMeta2 = meta;
     const isManaged = crewMeta2?.crewType === "managed";
     setPacerWelcomeCtx({ joinType: isManaged ? "managed" : "crew", spaceName: crewMeta2?.name || invite?.spaceName || "" });
     setShowPacerWelcome(true);
     setTimeout(() => fireOnboardPrompts(user), 1500);
     setActiveSpaceFilter(crewId);
     navigateTo("crews");
    } catch(e) { console.error("Crew join error:", e); }
   }, 500);
   return;
  }

  const { spaceId: targetOrgId, spaceName: orgName } = invite;
  if(_oid && _oid.startsWith("solo-")) {
   const soloUserId = _oid.replace("solo-","");
   await migrateSoloToOrg(soloUserId, targetOrgId);
  }
  await resolveOrg(targetOrgId, await loadSpaceMeta(targetOrgId));
  const [lu,adm,sa]=await Promise.all([loadUsers(),loadAdmins(),loadSuperAdmin()]);
  setUsers(lu);setAdmins(adm);setSuperAdmin(sa);
  const allData={},allGoals={};
  for(const u of lu){allData[u.id]=await loadUserData(u.id);allGoals[u.id]=(await storageGet(ns(`at-goals-${u.id}`)))||{};}
  setAllUsersData(allData);setAllUserGoals(allGoals);
  if(customCfg && customIndKey) {
   await saveIndustryConfig(customIndKey, customCfg);
   const existing = (await storageGet(ns("at-custom-industries"))) || [];
   if(!existing.includes(customIndKey)) await storageSet(ns("at-custom-industries"), [...existing, customIndKey]);
   setIndustryConfigs(p=>({...p,[customIndKey]:customCfg}));
   await createUser(name, customIndKey, false, initialPin, null);
  } else {
   await createUser(name,industry,false,initialPin,null);
  }
  // Show contextual welcome for org joiners
  setPacerWelcomeCtx({ joinType: "managed", spaceName: orgName || invite?.spaceName || "" });
  setShowPacerWelcome(true);
  setTimeout(() => fireOnboardPrompts({ id: currentUserRef.current?.id || "", name }), 1500);
 }

 // Create a new crew — type: "open" (anyone can join) | "managed" (approval-gated, private)
 async function createCommunitySpace(communityName, description="", joinPin="", crewType="open") {
  if(!currentUser) return;
  // Free tier: max 1 Crew created by this user
  if (!isPro) {
   const myCreatedCrews = (communities || []).filter(c => c.createdBy === currentUser.id || c.adminId === currentUser.id);
   if (myCreatedCrews.length >= 1) {
    setShowPaywall(true);
    throw new Error("CREW_LIMIT");
   }
  }
  const meta = await createCommunity(communityName, currentUser.id, description, joinPin);
  // Store crew type on the space meta
  const metaWithType = { ...meta, crewType: crewType || "open" };
  await saveSpaceMeta(metaWithType);
  await addCommunityMember(meta.id, currentUser, _oid, currentUser.industry);
  const mem = await loadUserMemberships(currentUser.id);
  const updated = { ...mem, communityIds: [...(mem.communityIds||[]), meta.id] };
  await saveUserMemberships(currentUser.id, updated);
  setCommunities(prev => [...prev, metaWithType]);
  setCommunityMembers(prev => ({ ...prev, [meta.id]: [{ userId: currentUser.id, name: currentUser.name, industry: currentUser.industry, communityIndustry: currentUser.industry, avatarColor: currentUser.avatarColor, joinedAt: new Date().toISOString(), personalNs: _oid }] }));
  return metaWithType;
 }

 async function joinCommunity(token) {
  if(!currentUser) return;
  const invite = await consumeInvite(token);
  if(!invite || invite.spaceType !== "community") { alert("Invalid or expired Crew invite."); return; }
  if(invite._expired) { alert("This invite link has expired. Ask your admin for a new one."); return; }
  if(invite._maxed) { alert("This invite has reached its usage limit. Ask your admin for a new one."); return; }
  const communityId = invite.spaceId;
  const meta = await loadSpaceMeta(communityId);
  if(!meta) { alert("Community no longer exists."); return; }
  await addCommunityMember(communityId, currentUser, _oid);
  const mem = await loadUserMemberships(currentUser.id);
  if(!(mem.communityIds||[]).includes(communityId)) {
   const updated = { ...mem, communityIds: [...(mem.communityIds||[]), communityId] };
   await saveUserMemberships(currentUser.id, updated);
  }
  const freshMembers = await loadCommunityMembers(communityId);
  setCommunities(prev => prev.find(c=>c.id===communityId) ? prev : [...prev, meta]);
  setCommunityMembers(prev => ({ ...prev, [communityId]: freshMembers }));
 }

 async function leaveCommunity(communityId) {
  if(!currentUser) return;
  await removeCommunityMember(communityId, currentUser.id);
  const mem = await loadUserMemberships(currentUser.id);
  const updated = { ...mem, communityIds: (mem.communityIds||[]).filter(id => id !== communityId) };
  await saveUserMemberships(currentUser.id, updated);
  setCommunities(prev => prev.filter(c => c.id !== communityId));
  setCommunityMembers(prev => { const n = {...prev}; delete n[communityId]; return n; });
  if(activeSpaceId === communityId) setActiveSpaceId(null);
 }

 async function createUserWithNewIndustry(name, indKey, cfg, initialPin, teamLeaderId=null) {
  const newConfigs = {...industryConfigs, [indKey]: cfg};
  setIndustryConfigs(newConfigs);
  await saveIndustryConfig(indKey, cfg);
  const existingCustom = (await storageGet(ns("at-custom-industries"))) || [];
  if(!existingCustom.includes(indKey)) {
   await storageSet(ns("at-custom-industries"), [...existingCustom, indKey]);
  }
  await createUser(name, indKey, false, initialPin, teamLeaderId);
 }

 async function deleteUser(uid){
  const updated=users.filter(u=>u.id!==uid);
  setUsers(updated);await saveUsers(updated);
  await storageDelete(ns(`at-data-${uid}`));
  await storageDelete(ns(`at-goals-${uid}`));
  await storageDelete(ns(`at-threads-${uid}`));
  await storageDelete(ns(`at-vmscript-${uid}`));
  await storageDelete(ns(`at-muted-${uid}`));
  if(admins.includes(uid)){const nextAdmins=admins.filter(a=>a!==uid);setAdmins(nextAdmins);await saveAdmins(nextAdmins);}
  const nextTeams={...teams};
  if(nextTeams[uid]) delete nextTeams[uid];
  for(const [mid,lid] of Object.entries(nextTeams)){if(lid===uid) delete nextTeams[mid];}
  setTeams(nextTeams);await saveTeams(nextTeams);
  if(pins[uid]){const nextPins={...pins};delete nextPins[uid];setPins(nextPins);await savePins(nextPins);}
  setAllUsersData(p=>{const n={...p};delete n[uid];return n;});
  setAllUserGoals(p=>{const n={...p};delete n[uid];return n;});
  setModal(null);
 }

 async function renameUser(newName){
  const trimmed=newName.trim();
  if(!trimmed.includes(" ")||trimmed.split(" ").filter(p=>p.length>0).length<2) return;
  const updated=users.map(u=>u.id===currentUser.id?{...u,name:trimmed}:u);
  setUsers(updated);setCurrentUser(p=>({...p,name:trimmed}));await saveUsers(updated);
 }

 async function changeIndustry(newIndustry){
  const updated=users.map(u=>u.id===currentUser.id?{...u,industry:newIndustry}:u);
  setUsers(updated);setCurrentUser(p=>({...p,industry:newIndustry}));await saveUsers(updated);
  const newGoals={};
  setMyGoals(newGoals);setAllUserGoals(p=>({...p,[currentUser.id]:newGoals}));
  await storageSet(ns(`at-goals-${currentUser.id}`),newGoals);
 }

 async function setAvatarColor(color){
  // Only update background color — emoji and photo are independent
  const updatedUser={...currentUser};
  if(color) updatedUser.avatarColor=color; else delete updatedUser.avatarColor;
  const updated=users.map(u=>u.id===currentUser.id?updatedUser:u);
  setUsers(updated);setCurrentUser(updatedUser);await saveUsers(updated);
 }

 async function setAvatarEmoji(emoji){
  // Emoji and color are independent — photo is separate
  const updatedUser={...currentUser};
  if(emoji) updatedUser.avatarEmoji=emoji; else delete updatedUser.avatarEmoji;
  const updated=users.map(u=>u.id===currentUser.id?updatedUser:u);
  setUsers(updated);setCurrentUser(updatedUser);await saveUsers(updated);
 }


 async function setAvatarUrl(url){
  // Store photo separately — NOT in the users array (would bloat at-users key and break Supabase reads)
  await saveAvatarPhoto(currentUser.id, url||null);
  const updatedUser={...currentUser};
  if(url) updatedUser.avatarUrl=url; else delete updatedUser.avatarUrl;
  // Don't save avatarUrl in users array — load it at runtime instead
  const updated=users.map(u=>u.id===currentUser.id?{...u,avatarUrl:url||undefined}:u);
  setUsers(updated);setCurrentUser(updatedUser);
 }

 async function setPinForUser(pin){
  const next={...pins,[currentUser.id]:pin};setPins(next);await savePins(next);
 }

 async function removePinForUser(){
  const next={...pins};delete next[currentUser.id];setPins(next);await savePins(next);
 }

 const [pinTarget,setPinTarget]=useState(null);

 async function saveGoals(goals, trackId, customMetrics, goalPeriods) {
  setMyGoals(goals);setAllUserGoals(p=>({...p,[currentUser.id]:goals}));
  await storageSet(ns(`at-goals-${currentUser.id}`),goals);
  if (goalPeriods) {
   setMyGoalPeriods(goalPeriods);
   await storageSet(ns(`at-goalperiods-${currentUser.id}`),goalPeriods);
  }
  // If custom metrics were edited for a track, persist them on the track object
  if (trackId && customMetrics && userTracks) {
   const updatedTracks = (userTracks||[]).map(t =>
    t.id === trackId ? { ...t, customMetrics } : t
   );
   setUserTracks(updatedTracks);
   await saveUserTracks(currentUser.id, updatedTracks);
  }
 }

 async function saveMetrics(updatedMetrics) {
  const activeTrackNow = userTracks?.find(t => t.id === activeTrackId) || userTracks?.[0];
  if (activeTrackNow?.customConfig) {
   // Track uses its own embedded config — save metrics back into the track
   const updatedTrack = {
    ...activeTrackNow,
    customConfig: {
     ...activeTrackNow.customConfig,
     weekdayMetrics: updatedMetrics,
     // Keep weekendMetrics in sync: update any metrics that share keys
     weekendMetrics: (activeTrackNow.customConfig.weekendMetrics || []).map(wm => {
      const updated = updatedMetrics.find(m => m.key === wm.key);
      return updated ? { ...wm, label: updated.label, short: updated.short } : wm;
     }),
    },
   };
   const newTracks = (userTracks || []).map(t => t.id === activeTrackNow.id ? updatedTrack : t);
   setUserTracks(newTracks);
   await saveUserTracks(currentUser.id, newTracks);
  } else {
   // No custom track config — save to the industry config as before
   const indKey = currentUser.industry;
   const current = industryConfigs[indKey] || DEFAULT_INDUSTRIES[indKey] || {};
   const merged = { ...current, weekdayMetrics: updatedMetrics };
   setIndustryConfigs(p => ({ ...p, [indKey]: merged }));
   await saveIndustryConfig(indKey, merged);
  }
 }

 async function savePinForUser(uid,pin){
  const next={...pins};
  if(pin){next[uid]=pin;}else{delete next[uid];}
  setPins(next);await savePins(next);
 }

 async function confirmPin(user,enteredPin){
  if(pins[user.id]===enteredPin){
   await loginAs(user,allUsersData,allUserGoals,industryConfigs);
   setPinTarget(null);setModal(null);
   return true;
  }
  return false;
 }

 async function saveAdminConfig(cfg){
  setIndustryConfigs(cfg);
  for(const k of Object.keys(cfg)) await saveIndustryConfig(k,cfg[k]);
  setModal(null);
 }

 // Toggle admin — REQUIRES the user to have a PIN set before granting.
 // Returns { ok, reason } so caller can show appropriate UI.
 async function toggleAdmin(uid) {
  if(uid===superAdmin) return { ok:false, reason:"superadmin" };
  const isCurrentlyAdmin = admins.includes(uid);

  const next = isCurrentlyAdmin ? admins.filter(a=>a!==uid) : [...admins, uid];
  setAdmins(next); await saveAdmins(next);
  return { ok:true };
 }

 async function saveCommunityAdminsForSpace(communityId, newAdmins) {
  setCommunityAdminsState(p=>({...p,[communityId]:newAdmins}));
  await saveSpaceAdmins(communityId, newAdmins);
 }

 function logout() {
  try {
   localStorage.removeItem("at-uid");
   localStorage.removeItem("at-org-id");
   localStorage.removeItem("at-space-filter");
  } catch {}
  setCurrentUser(null);
  setUsers([]);
  setAdmins([]);
  setSuperAdmin(null);
  setOrgId(null);
  setOrgMeta(null);
  setCommunities([]);
  setCommunityMembers({});
  setCommunityAdminsState({});
  setAllUsersData({});
  setAllUserGoals({});
  setMyData({});
  setMyGoals({});
  messaging.closeWindow && Object.values(messaging.openWindows||[]).forEach(w=>messaging.closeWindow(w.threadKey));
  setModal("onboarding");
  // Sign out of Supabase Auth — will trigger AuthGate to show login screen
  try { window._sb?.auth?.signOut(); } catch {}
 }

 async function requestJoinOrg(targetOrgId, targetOrgName) {
  if(!currentUser) return { ok:false, reason:"no_user" };
  const added = await addJoinRequest(targetOrgId, currentUser, _oid);
  if(!added) return { ok:false, reason:"already_pending" };
  // Notify all admins of the target org
  try {
   const targetAdmins = await loadSpaceAdmins(targetOrgId);
   const notif = { type:"join_request", title:"New member request", body:`${currentUser.name} wants to join ${targetOrgName}`, spaceId:targetOrgId, from:currentUser.id };
   await Promise.all(targetAdmins.map(adminId => pushNotification(adminId, notif).catch(()=>{})));
  } catch {}
  return { ok:true };
 }

 // Org admin approves a join request — migrates user into org
 async function approveOrgRequest(requestRecord) {
  if(!orgId || !isSuperAdmin) return;
  const { userId, userName, userIndustry, personalNs } = requestRecord;
  // Migrate data from their personal namespace into the org namespace
  if(personalNs && personalNs.startsWith("solo-")) {
   await migrateSoloToOrg(userId, orgId);
  }
  const orgUsers = (await storageGet(ns("at-users"))) || [];
  if(!orgUsers.find(u => u.id === userId)) {
   const ind = orgMeta?.enforcedIndustry || userIndustry;
   const newUser = { id: userId, name: userName, industry: ind };
   await storageSet(ns("at-users"), [...orgUsers, newUser]);
   setUsers(prev => prev.find(u => u.id===userId) ? prev : [...prev, newUser]);
  }
  const mem = await loadUserMemberships(userId);
  await saveUserMemberships(userId, { ...mem, orgId });
  await removeJoinRequest(orgId, userId);
  setOrgPendingRequests(prev => prev.filter(r => r.userId !== userId));
 }

 async function rejectOrgRequest(userId) {
  // Log denial before removing
  const req = orgPendingRequests.find(r => r.userId === userId);
  if(req) await saveDeniedRequest(orgId, req, currentUser?.name).catch(()=>{});
  await removeJoinRequest(orgId, userId);
  setOrgPendingRequests(prev => prev.filter(r => r.userId !== userId));
 }

 async function joinCommunityByPin(communityId, enteredPin) {
  if(!currentUser) return { ok:false };
  const meta = await loadSpaceMeta(communityId);
  if(!meta) return { ok:false, reason:"not_found" };
  if(!meta.joinPin || meta.joinPin !== enteredPin) return { ok:false, reason:"wrong_pin" };
  await addCommunityMember(communityId, currentUser, _oid, currentUser.industry);
  const mem = await loadUserMemberships(currentUser.id);
  if(!(mem.communityIds||[]).includes(communityId)) {
   await saveUserMemberships(currentUser.id, { ...mem, communityIds: [...(mem.communityIds||[]), communityId] });
  }
  const freshMembers = await loadCommunityMembers(communityId);
  setCommunities(prev => prev.find(c=>c.id===communityId) ? prev : [...prev, meta]);
  setCommunityMembers(prev => ({ ...prev, [communityId]: freshMembers }));
  return { ok:true };
 }

 async function requestJoinCommunity(communityId) {
  if(!currentUser) return { ok:false };
  const meta = await loadSpaceMeta(communityId);
  const added = await addJoinRequest(communityId, currentUser, _oid);
  if(!added) return { ok:false, reason:"already_pending" };
  // Notify community creator/admins
  try {
   if(meta?.createdBy) {
    const notif = { type:"join_request", title:"New crew member request", body:`${currentUser.name} wants to join ${meta.name}`, spaceId:communityId, from:currentUser.id };
    await pushNotification(meta.createdBy, notif).catch(()=>{});
   }
  } catch {}
  return { ok:true };
 }

 async function approveCommunityRequest(communityId, requestRecord) {
  if(!currentUser) return;
  const { userId, userName, userIndustry, personalNs } = requestRecord;
  const meta = await loadSpaceMeta(communityId);
  if(!meta) return;
  const fakeUser = { id: userId, name: userName, industry: userIndustry, avatarColor: null };
  await addCommunityMember(communityId, fakeUser, personalNs, userIndustry);
  const mem = await loadUserMemberships(userId);
  if(!(mem.communityIds||[]).includes(communityId)) {
   await saveUserMemberships(userId, { ...mem, communityIds: [...(mem.communityIds||[]), communityId] });
  }
  await removeJoinRequest(communityId, userId);
  const freshPending = await loadPendingRequests(communityId);
  setCommunityPendingRequests(prev => ({ ...prev, [communityId]: freshPending }));
  const freshMembers = await loadCommunityMembers(communityId);
  setCommunityMembers(prev => ({ ...prev, [communityId]: freshMembers }));
 }

 async function rejectCommunityRequest(communityId, userId) {
  const req = (communityPendingRequests[communityId]||[]).find(r => r.userId === userId);
  if(req) await saveDeniedRequest(communityId, req, currentUser?.name).catch(()=>{});
  await removeJoinRequest(communityId, userId);
  const freshPending = await loadPendingRequests(communityId);
  setCommunityPendingRequests(prev => ({ ...prev, [communityId]: freshPending }));
 }

 // Load pending requests for all communities this user is in
 async function loadAllCommunityPending(comList) {
  const result = {};
  for(const cm of comList) {
   result[cm.id] = await loadPendingRequests(cm.id);
  }
  setCommunityPendingRequests(result);
 }

 async function searchSpaces(query) {
  if(!query.trim()) { setSpaceSearchResults([]); return; }
  const idx = await loadSpaceIndex();
  const q = query.trim().toLowerCase();
  setSpaceSearchResults(idx.filter(e => e.name.toLowerCase().includes(q)));
 }

 // Update a user's industry for a specific community context
 async function changeCommunityIndustry(communityId, newIndustry) {
  if(!currentUser) return;
  await updateCommunityMemberIndustry(communityId, currentUser.id, newIndustry);
  setCommunityMembers(prev => ({
   ...prev,
   [communityId]: (prev[communityId]||[]).map(m =>
    m.userId === currentUser.id ? { ...m, communityIndustry: newIndustry } : m
   )
  }));
 }

 async function updateOrgMeta(updates) {
  if(!orgId || !orgMeta) return;
  const updated = { ...orgMeta, ...updates };
  await saveOrgMeta(updated);
  setOrgMeta(updated);
 }

 // Update community metadata (name, description, joinPin, etc.)
 async function updateCommunityMeta(communityId, updates) {
  const cm = communities.find(c => c.id === communityId);
  if(!cm) return;
  const updated = { ...cm, ...updates };
  await saveSpaceMeta(updated);
  setCommunities(prev => prev.map(c => c.id === communityId ? updated : c));
 }

 async function kickCommunityMember(communityId, userId) {
  await removeCommunityMember(communityId, userId);
  const freshMembers = await loadCommunityMembers(communityId);
  setCommunityMembers(prev => ({ ...prev, [communityId]: freshMembers }));
 }

 async function assignToTeam(memberId, leaderId) {
  const next={...teams};
  if(leaderId===null){delete next[memberId];}else{next[memberId]=leaderId;}
  setTeams(next);await saveTeams(next);
 }

 useEffect(()=>{if(myData){const d=myData[selDate]||{};setCounts(d);setNotes(d._notes||{});}},[selDate]);

 // Auto-save 300ms after any count change, only for today's date
 useEffect(()=>{
  if(!currentUser)return;
  if(selDate!==todayStr())return; // only auto-save today
  if(autoSaveTimer.current)clearTimeout(autoSaveTimer.current);
  autoSaveTimer.current=setTimeout(()=>{
   autoSaveTimer.current=null;
   saveDay(true); // silent = true
  },300);
  return()=>{if(autoSaveTimer.current)clearTimeout(autoSaveTimer.current);};
 },[counts,notes]);

 async function saveDay(silent=false){
  const user=currentUserRef.current||currentUser;
  if(!user)return;
  const date=selDateRef.current||selDate;
  const data=countsRef.current||counts;
  const base=myDataRef.current||myData;
  if(!silent)setSaving(true);
  const savedNotes=notesRef.current||notes;
  // Stamp log timestamp for time-pattern detection
  const updated={...base,[date]:{...data,_notes:savedNotes,_logTs:Date.now()}};
  setMyData(updated);setAllUsersData(p=>({...p,[user.id]:updated}));
  // Track-scoped save
  const tId = activeTrackId || "default";
  const key = ns(trackDataKey(user.id, tId));
  await storageSet(key, updated);
  if(!silent){setSaving(false);setSavedFlash(true);setTimeout(()=>setSavedFlash(false),2000);}
  else{setMyData(updated);}
  // ── Post-save: check freeze earn + milestones (non-blocking) ──
  const freshStreak = computeStreak(updated, getProtectedDates(myFreezes));
  const wk = weekKey(todayStr());
  maybeEarnFreeze(user.id, freshStreak.current).then(earned => {
   if (earned) {
    loadFreezeBank(user.id).then(b => setFreezeBank(b)).catch(() => {});
    showMicroToast('❄️ Freeze earned! You\'ve banked a streak freeze.', 5000);
   }
  }).catch(() => {});
  checkNewMilestones(user.id, updated, freshStreak.current, indConfig).then(async newMs => {
   for (const ms of newMs) {
    showMicroToast(`${ms.icon} ${ms.label} — milestone unlocked!`, 6000);
    notifStreakMilestone(ms.tier || 0, user.name).catch(() => {}); // reuse notif
    // Post to feed if in a space
    if (activeSpace?.id) {
     const post = { id: `ms-${user.id}-${ms.id}`, type: 'milestone', subtype: ms.type,
      userId: user.id, userName: user.name, milestoneId: ms.id, milestoneLabel: ms.label,
      milestoneIcon: ms.icon, ts: Date.now() };
     postFeedItem(activeSpace.id, post).then(next => setFeed(next)).catch(() => {});
    }
   }
  }).catch(() => {});
 }

 async function commitEdit(date,data){
  const updated={...myData,[date]:data};setMyData(updated);setAllUsersData(p=>({...p,[currentUser.id]:updated}));
  const key = ns(trackDataKey(currentUser.id, activeTrackId||"default"));
  await storageSet(key, updated);setModal(null);setEditDate(null);
 }

 async function doBulkImport(rows){
  const updated={...myData};for(const r of rows)updated[r.date]=r.data;
  setMyData(updated);setAllUsersData(p=>({...p,[currentUser.id]:updated}));
  const key = ns(trackDataKey(currentUser.id, activeTrackId||"default"));
  await storageSet(key, updated);setModal(null);
 }

 async function doDataImport(merged){
  const updated={...myData,...merged};
  setMyData(updated);setAllUsersData(p=>({...p,[currentUser.id]:updated}));
  const key = ns(trackDataKey(currentUser.id, activeTrackId||"default"));
  await storageSet(key, updated);
 }

 function getMonths(){
  const set=new Set(Object.keys(myData).map(monthKey));set.add(monthKey(todayStr()));
  return Array.from(set).sort((a,b)=>b.localeCompare(a));
 }

 const indConfig = activeTrack
  ? getTrackConfig(activeTrack.industryKey, activeTrack.customConfig, industryConfigs)
  : (currentUser ? industryConfigs[currentUser.industry]||industryConfigs.freight : industryConfigs.freight);

 // ── Focus Session auto-log ─────────────────────────────────────────────────
 // Keep refs so the stable event handler always sees latest values without re-registering
 const indConfigRef = useRef(indConfig);
 useEffect(() => { indConfigRef.current = indConfig; }, [indConfig]);
 // showMicroToast is defined later in this component — ref lets us call it from stable handler
 const showMicroToastRef = useRef(null);

 useEffect(() => {
  function handleFocusComplete(e) {
   const d = e.detail || {};
   const metrics = indConfigRef.current?.weekdayMetrics || [];
   const dialKey  = metrics.find(m => m.key==="outbound" || m.key==="calls" || (m.label||"").toLowerCase().includes("call"))?.key || "outbound";
   const actKey   = metrics.find(m => m.key==="activities" || (m.label||"").toLowerCase().includes("activit"))?.key || "activities";
   const convoKey = metrics.find(m => m.key==="conversations" || m.key==="connects" || (m.label||"").toLowerCase().includes("convo"))?.key || null;
   const advKey   = metrics.find(m => m.key==="advanced" || (m.label||"").toLowerCase().includes("advanc"))?.key || null;
   setCounts(prev => {
    const next = { ...prev };
    if (d.dials)                      next[dialKey]  = (prev[dialKey]  || 0) + d.dials;
    if (d.activities)                 next[actKey]   = (prev[actKey]   || 0) + d.activities;
    if (d.conversations && convoKey)  next[convoKey] = (prev[convoKey] || 0) + d.conversations;
    if (d.advanced      && advKey)    next[advKey]   = (prev[advKey]   || 0) + d.advanced;
    return next;
   });
   // Use ref to call showMicroToast (defined later in component, safe via ref)
   showMicroToastRef.current?.(`✅ Session logged — ${d.dials||0} calls, ${d.activities||0} activities added to today`, 4000);
  }
  window.addEventListener("cadence:focus-session-complete", handleFocusComplete);
  return () => window.removeEventListener("cadence:focus-session-complete", handleFocusComplete);
 }, []); // empty deps — registers once, reads latest values via refs
 // Derive activeSpace at App level so journal + nudge can use it
 const _appSpaces = [
  ...(communities || []).map(c => ({ id: c.id, name: c.name, type: c.crewType || "open" })),
 ].filter(Boolean);
 const activeSpace = _appSpaces[0] || null;
 // App-level feed — must be after activeSpace is defined
 useEffect(() => {
  if (!activeSpace?.id) return;
  loadFeed(activeSpace.id).then(f => setAppFeed(f || [])).catch(() => {});
 }, [activeSpace?.id]);
 const isAdmin=admins.includes(currentUser?.id);
 const isSuperAdmin=currentUser?.id===superAdmin;

 // All messageable users = org members + all crew members, deduplicated by id
 const allMsgUsers = useMemo(()=>{
  // Build a full list of live users: org members + crew members (all are registered users)
  const seen = new Set();
  const result = [];
  const add = (u) => {
   const id = u.userId||u.id;
   if(!id||seen.has(id)) return;
   seen.add(id);
   result.push({...u, id});
  };
  // Org users (source of truth for org context)
  (users||[]).forEach(add);
  // Community members — include all; they're registered users even if not in this org
  Object.values(communityMembers).forEach(members=>{
   members.forEach(m=>{
    const id = m.userId||m.id;
    if(id) add({id, name:m.name, avatarColor:m.avatarColor, industry:m.communityIndustry||m.industry});
   });
  });
  return result;
 },[users, communityMembers]);

 const todayPct=computeGoalPct(counts,industryConfig.weekdayMetrics,myGoals,myGoalPeriods);

 // Compute best day per metric across all data (for crown badges in history)
 const bestDaysAllTime = useMemo(()=>{
  const best={};
  for(const [date,data] of Object.entries(myData)){
   if(!data||isWeekend(date))continue;
   for(const m of indConfig.weekdayMetrics){
    const v=data[m.key]||0;
    if(!best[m.key]||v>(myData[best[m.key]]?.[m.key]||0))best[m.key]=date;
   }
  }
  return best;
 },[myData,indConfig]);

 if(loading) return(
  <div style={{...s.root,...s.fcc}}>
   <div style={{color:"var(--border-2)",fontFamily:F,letterSpacing:"0.3em",fontSize:"0.95rem"}}>LOADING...</div>
  </div>
 );

 const missingLastNameNudge = currentUser && !currentUser.name.trim().includes(" ");

 return (
  <ErrorBoundary currentUser={currentUser} globalSuperAdmin={globalSA}>
  <div style={s.root}>
   {/* Tour overlay */}
   {tourPage && currentUser && <TourOverlay pageId={tourPage} onClose={closeTour} />}
   {viewProfileUser && (
    <UserProfileCard
     user={viewProfileUser}
     allUsersData={allUsersData}
     industryConfigs={industryConfigs}
     allUserGoals={allUserGoals}
     currentUser={currentUser}
     onClose={() => setViewProfileUser(null)}
     onOpenDm={(u) => { setViewProfileUser(null); navigateTo("messages"); }}
    />
   )}
   {/* ── Pacer welcome overlay — context-aware per join type ── */}
   {showPacerWelcome && currentUser && (() => {
    const jt = pacerWelcomeCtx?.joinType || "solo";
    const sn = pacerWelcomeCtx?.spaceName || "";
    const firstName = currentUser.name?.split(" ")[0] || "";
    const configs = {
     org: {
      headline: `You're in${sn ? ` — ${sn}` : ""}.`,
      sub: "I'm Pacer. I track your activity, hold you to your goals, and show you how you stack up against your team.",
      items: [
       { n:"1", title:"Set your daily goals", desc:"Your manager and teammates can see your progress. Make them real." },
       { n:"2", title:"Log your first activity", desc:"The leaderboard starts the moment you hit Log." },
      ],
      cta: "Set my goals →", ctaNav: "settings",
     },
     crew: {
      headline: `You joined${sn ? ` ${sn}` : " the crew"}.`,
      sub: "I'm Pacer. This crew tracks together — your numbers are visible to members. Let's get you set up.",
      items: [
       { n:"1", title:"Set your daily goals", desc:"The crew sees your progress. Set a target worth holding yourself to." },
       { n:"2", title:"Check the leaderboard", desc:"See where you stand right now." },
      ],
      cta: "Set my goals →", ctaNav: "settings",
     },
     solo: {
      headline: `Welcome to Cadence${firstName ? `, ${firstName}` : ""}!`,
      sub: "I'm Pacer — I'll keep track of your daily activity and help you stay consistent.",
      items: [
       { n:"1", title:"Check your name", desc:"Make sure it's spelled correctly — it shows on any crew you join." },
       { n:"2", title:"Set your daily goals", desc:"So I know what to hold you to each day." },
      ],
      cta: "Let's set it up →", ctaNav: "settings",
     },
    };
    const cfg = configs[jt] || configs.solo;
    return (
     <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(8,12,24,0.96)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", fontFamily:"'DM Sans',system-ui,sans-serif", animation:"fadeIn 0.35s ease" }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ maxWidth:"360px", width:"100%", textAlign:"center", animation:"slideUp 0.4s ease" }}>
       <div style={{ width:"64px", height:"64px", borderRadius:"50%", margin:"0 auto 20px", background:"linear-gradient(135deg,#1DC9E8,#7B6FD8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.6rem", boxShadow:"0 0 0 8px rgba(29,201,232,0.1)" }}>⚡</div>
       <div style={{ fontSize:"1.3rem", fontWeight:"800", color:"#fff", letterSpacing:"-0.02em", marginBottom:"10px" }}>{cfg.headline}</div>
       <div style={{ fontSize:"0.88rem", color:"rgba(255,255,255,0.45)", lineHeight:1.7, marginBottom:"24px" }}>{cfg.sub}</div>
       <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"24px", textAlign:"left" }}>
        {cfg.items.map(item => (
         <div key={item.n} style={{ display:"flex", alignItems:"center", gap:"12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"12px", padding:"13px 16px" }}>
          <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:"rgba(29,201,232,0.15)", border:"1px solid rgba(29,201,232,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem", fontWeight:"800", color:"#1DC9E8", flexShrink:0 }}>{item.n}</div>
          <div>
           <div style={{ fontSize:"0.88rem", fontWeight:"700", color:"#fff", marginBottom:"2px" }}>{item.title}</div>
           <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.35)" }}>{item.desc}</div>
          </div>
         </div>
        ))}
       </div>
       <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
        <button onClick={()=>{ setShowPacerWelcome(false); setModal(null); navigateTo(cfg.ctaNav || "settings"); }} style={{ width:"100%", background:"#1DC9E8", color:"#000", border:"none", padding:"14px", borderRadius:"12px", fontWeight:"800", fontSize:"0.95rem", cursor:"pointer", fontFamily:"'DM Sans',system-ui,sans-serif", letterSpacing:"-0.01em" }}>{cfg.cta}</button>
        <button onClick={()=>setShowPacerWelcome(false)} style={{ width:"100%", background:"none", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.3)", padding:"13px", borderRadius:"12px", fontWeight:"600", fontSize:"0.88rem", cursor:"pointer", fontFamily:"'DM Sans',system-ui,sans-serif" }}>Skip for now</button>
       </div>
      </div>
     </div>
    );
   })()}

   {/* ── Streak Freeze prompt — shown when streak breaks and bank has freezes ── */}
   {showFreezePrompt && currentUser && (
    <div style={{ position:'fixed', inset:0, zIndex:8500, background:'rgba(8,12,24,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
     <div style={{ maxWidth:'340px', width:'100%', background:'var(--bg-1)', border:'1px solid rgba(99,179,237,0.3)', borderRadius:'20px', padding:'24px', textAlign:'center' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>❄️</div>
      <div style={{ fontSize:'1.15rem', fontWeight:'800', color:'var(--text-primary)', marginBottom:'8px' }}>Streak broken.</div>
      <div style={{ fontSize:'0.88rem', color:'var(--text-muted)', lineHeight:1.6, marginBottom:'20px' }}>
        You have <strong style={{color:'#63B3ED'}}>{freezeBank.count} streak {freezeBank.count === 1 ? 'freeze' : 'freezes'}</strong> banked.<br/>
        Use one to protect yesterday and keep your streak alive.
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
       <button onClick={async () => {
        const yesterday = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
        const ok = await useStreakFreeze(currentUser.id, yesterday);
        if (ok) {
         const freshBank = await loadFreezeBank(currentUser.id);
         setFreezeBank(freshBank);
         const freshFreezes = await loadStreakFreezes(currentUser.id);
         setMyFreezes(freshFreezes);
         showMicroToast('❄️ Freeze used. Streak protected.', 5000);
        }
        setShowFreezePrompt(false);
       }} style={{ background:'rgba(99,179,237,0.15)', border:'1px solid rgba(99,179,237,0.4)', color:'#63B3ED', padding:'13px', borderRadius:'11px', fontWeight:'800', fontSize:'0.92rem', cursor:'pointer', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
        ❄️ Use a freeze — protect my streak
       </button>
       <button onClick={() => setShowFreezePrompt(false)} style={{ background:'none', border:'1px solid var(--border-1)', color:'var(--text-dim)', padding:'12px', borderRadius:'11px', fontWeight:'600', fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
        Let it go — start fresh
       </button>
      </div>
      <div style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginTop:'14px' }}>
       Freezes earned: 1 per 7-day streak · Max 3 banked
      </div>
     </div>
    </div>
   )}

   {/* ── Full-page onboarding (replaces everything for new visitors) ── */}
   {modal==="onboarding"&&<OnboardingScreen
    pendingInviteToken={pendingInviteToken}
    onLogin={loginToSpace}
    onLoadSpaceUsers={loadUsersForSpace}
    onStartSolo={startSolo}
    onCreateOrg={async(orgName, userName, industry, pin, customCfg, customIndKey, vData)=>{
     await startOrganization(orgName, userName, industry, pin, customCfg, customIndKey, vData);
    }}
    onJoinOrg={joinOrg}
    onSignOut={async()=>{ await window._sb?.auth?.signOut(); window.location.reload(); }}
   />}
   {modal==="setup"&&<UserSetupModal existingUsers={users} admins={admins} teams={teams} industryConfigs={industryConfigs} superAdminId={superAdmin} onSelect={selectUser} onCreateNew={(n,ind,pin,leaderId)=>createUser(n,ind,users.length===0&&ind==="freight",pin,leaderId)} onCreateNewIndustry={createUserWithNewIndustry}/>}
   {modal==="import"&&<BulkImportModal onClose={()=>setModal(null)} onImport={doBulkImport} industryConfig={indConfig}/>
   }{modal==="backup"&&currentUser&&<DataBackupModal allData={myData} onImportData={doDataImport} onClose={()=>setModal(null)}/>}
   {modal==="share"&&currentUser&&<ShareModal userName={currentUser.name} allData={myData} liveCounts={counts} industryConfig={indConfig} userGoals={myGoals} selDate={selDate} onClose={()=>setModal(null)}/>}
   {/* Profile switcher removed — users sign out and back in to switch accounts */}
   {modal==="settings"&&currentUser&&<ProfileSettingsModal
    user={currentUser} allUsers={users} admins={admins} teams={teams} industryConfigs={industryConfigs} industryConfig={indConfig} userGoals={myGoals} userGoalPeriods={myGoalPeriods} pins={pins} isSuperAdmin={isSuperAdmin}
    myData={myData} myFreezes={myFreezes}
    onRename={n=>{renameUser(n);}}
    onChangeIndustry={changeIndustry}
    onSaveGoals={(g, trackId, metrics, goalPeriods)=>{saveGoals(g, trackId, metrics, goalPeriods);}}
    onSaveMetrics={saveMetrics}
    onSetPin={setPinForUser}
    onRemovePin={removePinForUser}
    onSwitch={selectUser}
    onAddNew={(n,ind,pin)=>createUser(n,ind,false,pin)}
    onDelete={deleteUser}
    onClose={()=>setModal(null)}
    onSendFeedback={async(text)=>{
     if(!globalSA?.userId||!currentUser)return;
     const adminId=globalSA.userId;
     const meId=currentUser.id;
     if(meId===adminId)return;
     const tKey=[meId,adminId].sort().join("-dm-");
     const msgText=`💬 Feedback from ${currentUser.name}

${text}

— Sent from Settings · ${new Date().toLocaleString()}`;
     const msg={id:`fb-${Date.now()}`,userId:meId,userName:currentUser.name,text:msgText,ts:Date.now(),isFeedback:true};
     const existing=await loadPersonalMessages(tKey).catch(()=>[]);
     await savePersonalMessages(tKey,[...(existing||[]),msg]);
     const myThr=await loadPersonalThreads(meId).catch(()=>[]);
     const adThr=await loadPersonalThreads(adminId).catch(()=>[]);
     const thr={threadKey:tKey,participantIds:[meId,adminId],name:globalSA.userName||"Admin",isGroup:false,lastTs:Date.now()};
     if(!myThr.find(t=>t.threadKey===tKey))await savePersonalThreads(meId,[...myThr,thr]);
     const ai=adThr.findIndex(t=>t.threadKey===tKey);
     if(ai>=0){const u=[...adThr];u[ai]={...u[ai],lastTs:Date.now(),unreadCount:(u[ai].unreadCount||0)+1};await savePersonalThreads(adminId,u);}
     else await savePersonalThreads(adminId,[...adThr,{...thr,name:currentUser.name,unreadCount:1}]);
     await pushNotification(adminId,{icon:"💬",text:`Feedback from ${currentUser.name}: ${text.slice(0,80)}`,link:"messages"}).catch(()=>{});
    }}
   />}
   {modal==="pin"&&pinTarget&&<PinModal user={pinTarget} onConfirm={p=>confirmPin(pinTarget,p)} onCancel={()=>{setPinTarget(null);setModal(null);}}/>}
   {modal==="admin"&&null}

   {/* ── Join flash — existing user joined via invite link ── */}
   {joinFlash && (
    <div style={{ position:"fixed", top:"env(safe-area-inset-top,0px)", left:0, right:0, zIndex:99999, background:"#1DC9E8", color:"#000", textAlign:"center", padding:"14px 20px", fontWeight:800, fontSize:"0.9rem", fontFamily:"'DM Sans',system-ui,sans-serif", animation:"fadeUp 0.3s ease both" }}>
     You've joined {joinFlash.spaceName}
    </div>
   )}

   {/* ── Onboarding tour overlay ── */}
   {tourStep !== null && (
    <OnboardingTour
     step={tourStep}
     crewName={tourCrewName}
     onNext={() => {
      if (tourStep === 0) { navigateTo("tracker"); setTourStep(1); }
      else if (tourStep === 1) { navigateTo("crews"); setTourStep(2); }
      else { setTourStep(null); sessionStorage.removeItem("cadence-pending-invite"); }
     }}
     onSkip={() => { setTourStep(null); sessionStorage.removeItem("cadence-pending-invite"); }}
    />
   )}

   {modal==="edit"&&editDate&&<EditDayModal date={editDate} initialData={editDate===todayStr()?{...counts,_notes:notes}:myData[editDate]||{}} industryConfig={indConfig} onClose={()=>{setModal(null);setEditDate(null);}} onSave={data=>{haptic.success();commitEdit(editDate,data);}}/>}

   <div style={{...s.container, transform: pullY > 0 ? `translateY(${pullY}px)` : undefined, transition: pullY === 0 && !pullRefreshing ? "transform 0.3s ease" : undefined }}
    onTouchStart={isMobile ? onPullTouchStart : undefined}
    onTouchMove={isMobile ? onPullTouchMove : undefined}
    onTouchEnd={isMobile ? onPullTouchEnd : undefined}
   >
    {/* Pull-to-refresh indicator */}
    {isMobile && (pullY > 0 || pullRefreshing) && (
     <div style={{ position: "fixed", top: `calc(env(safe-area-inset-top,0px) + 110px + ${pullRefreshing ? 0 : Math.max(0, pullY * 0.4 - 8)}px)`, left: "50%", transform: "translateX(-50%)", zIndex: 999, display: "flex", alignItems: "center", gap: "7px", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "20px", padding: "7px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transition: pullRefreshing ? "top 0.2s ease" : undefined }}>
      {pullRefreshing
       ? <><div style={{ width: "14px", height: "14px", border: "2px solid rgba(29,201,232,0.3)", borderTop: "2px solid var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /><span style={{ fontSize: "0.76rem", color: "var(--accent)", fontWeight: "700", fontFamily: "'DM Sans',system-ui,sans-serif" }}>Refreshing…</span></>
       : <><span style={{ fontSize: "0.76rem", color: "var(--text-dim)", fontFamily: "'DM Sans',system-ui,sans-serif", opacity: pullY >= PULL_THRESHOLD ? 1 : 0.6 }}>{pullY >= PULL_THRESHOLD ? "↑ Release to refresh" : "↓ Pull to refresh"}</span></>
      }
     </div>
    )}
    {/* Last name nudge banner */}
    {missingLastNameNudge&&<div style={{background:BG2,border:"1px solid #2A1E08",...s.br8,padding:"10px 16px",marginBottom:"14px",...s.fsb,...s.g12}}>
     <span style={{fontSize:"0.95rem",color:TA,fontFamily:F}}>Your profile only has a first name. Adding a last name helps teammates identify you — update it in Profile Settings.</span>
     <button onClick={()=>navigateTo("settings")} style={{...s.smallTab,fontSize:"0.9rem",padding:"4px 10px",borderColor:"var(--border-2)",color:TA,flexShrink:0}}>Update →</button>
    </div>}
    {/* Global flash notification */}
    {globalFlashMsg&&<div style={{background:BG1,border:BB1A3A,...s.br8,...s.p816,marginBottom:"10px",fontSize:"0.9rem",color:"#5DC1DB",fontFamily:F,letterSpacing:"0.04em"}}>✓ {globalFlashMsg}</div>}
    {/* ── Header bar ── */}
    <div style={{ display:"flex", alignItems:"center", gap:"8px", paddingBottom:"14px", borderBottom:"1px solid var(--border-1)", marginBottom:"16px", position:"relative" }}>
     {!isMobile && <button onClick={toggleSideNav} title="Menu"
      style={{ background:"none", border:"none", color:sideNavOpen?"var(--accent)":"var(--text-muted)", cursor:"pointer", padding:"6px 8px", borderRadius:"8px", lineHeight:1, flexShrink:0, WebkitTapHighlightColor:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"color 0.15s" }}>
      {sideNavOpen ? "✕" : "☰"}
     </button>}
     {/* Logo */}
     <div style={{cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:"8px"}} onClick={()=>navigateTo("home")}>
      <img src={CADENCE_LOGO} alt="Cadence" style={{width:"26px",height:"26px",objectFit:"contain",display:"block",flexShrink:0}}/>
      <div style={{fontSize:"0.95rem",fontWeight:"800",color:"var(--text-primary)",fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:"-0.02em",whiteSpace:"nowrap"}}>Cadence</div>
      {(()=>{
  const plan = usageStatus?.plan||"";
  const email = authUser?.email||"";
  const isFounder = email==="inmanaustine@gmail.com"||plan==="godmode";
  if(isFounder) return <span style={{fontSize:"0.58rem",fontWeight:"800",color:"#F59E0B",background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:"4px",padding:"2px 5px",letterSpacing:"0.08em",textTransform:"uppercase",lineHeight:1,alignSelf:"center",marginTop:"1px",flexShrink:0}}>FOUNDER</span>;
  if(plan==="team"||plan==="teams") return <span style={{fontSize:"0.58rem",fontWeight:"800",color:"#A855F7",background:"rgba(168,85,247,0.12)",border:"1px solid rgba(168,85,247,0.3)",borderRadius:"4px",padding:"2px 5px",letterSpacing:"0.08em",textTransform:"uppercase",lineHeight:1,alignSelf:"center",marginTop:"1px",flexShrink:0}}>TEAMS</span>;
  if(plan==="pro"||plan==="elite") return <span style={{fontSize:"0.58rem",fontWeight:"800",color:"#1DC9E8",background:"rgba(29,201,232,0.12)",border:"1px solid rgba(29,201,232,0.3)",borderRadius:"4px",padding:"2px 5px",letterSpacing:"0.08em",textTransform:"uppercase",lineHeight:1,alignSelf:"center",marginTop:"1px",flexShrink:0}}>PRO</span>;
  return null;
})()}
     </div>
     {/* Right controls */}
     {currentUser&&(
      <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0,marginLeft:"auto"}}>
       {/* Name pill — opens profile quick menu */}
       <div style={{position:"relative",flexShrink:0}}>
        <button
         style={{background:"var(--bg-2)",border:"1px solid var(--border-1)",color:"var(--text-secondary)",padding:"5px 10px 5px 8px",borderRadius:"20px",fontSize:"0.8rem",cursor:"pointer",whiteSpace:"nowrap",fontFamily:F,fontWeight:"600",WebkitTapHighlightColor:"transparent",display:"flex",alignItems:"center",gap:"5px"}}
         onClick={()=>setShowProfileMenu(v=>!v)}>
         <div style={{width:"20px",height:"20px",borderRadius:"50%",background:"var(--accent-dim)",border:"1px solid var(--btn-plus-border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",fontWeight:"800",color:"var(--accent)",fontFamily:F,flexShrink:0}}>
          {(currentUser.name||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}
         </div>
         <span>{currentUser.name.split(" ")[0]}</span>
         <span style={{opacity:0.35,fontSize:"0.58rem"}}>▾</span>
        </button>
        {showProfileMenu && (
         <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"12px",padding:"6px",minWidth:"180px",zIndex:999,boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
          {[
           {label:"My Profile",     icon:"👤", action:()=>{ setSettingsInitTab("profile"); navigateTo("settings"); }},
           {label:"Subscription",   icon:"💳", action:()=>{ setSettingsInitTab("subscription"); navigateTo("settings"); }},
           {label:"Settings",       icon:"⚙️", action:()=>{ setSettingsInitTab("profile"); navigateTo("settings"); }},
           {label:"Sign Out",       icon:"↩", action:()=>{ if(window._sb) window._sb.auth.signOut().then(()=>window.location.reload()); }, danger:true},
          ].map(({label,icon,action,danger})=>(
           <button key={label} onClick={()=>{ action(); setShowProfileMenu(false); }}
            style={{width:"100%",display:"flex",alignItems:"center",gap:"9px",padding:"9px 12px",background:"none",border:"none",borderRadius:"8px",cursor:"pointer",fontFamily:F,fontSize:"0.82rem",fontWeight:"600",color:danger?"#F43F5E":"var(--text-primary)",textAlign:"left",WebkitTapHighlightColor:"transparent"}}
            onMouseOver={e=>e.currentTarget.style.background="var(--bg-2)"}
            onMouseOut={e=>e.currentTarget.style.background="none"}>
            <span style={{fontSize:"0.9rem",width:"18px",textAlign:"center"}}>{icon}</span>
            {label}
           </button>
          ))}
         </div>
        )}
       </div>
       {/* Bell */}
       <button onClick={()=>setShowNotifs(v=>!v)} style={{position:"relative",flexShrink:0,width:"40px",height:"40px",background:showNotifs?"var(--accent-dim)":"none",border:showNotifs?"1px solid var(--btn-plus-border)":"1px solid transparent",color:showNotifs?"var(--accent)":"var(--text-muted)",cursor:"pointer",borderRadius:"50%",WebkitTapHighlightColor:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {notifications.unread>0&&<span style={{position:"absolute",top:"1px",right:"1px",width:"10px",height:"10px",background:"var(--accent)",borderRadius:"50%",border:"2px solid var(--bg-root)"}}/>}
       </button>
      </div>
     )}
    </div>
    {/* Notifications panel */}
    {showNotifs && currentUser && (
     <NotificationsPanel
      notifs={notifications.notifs}
      unread={notifications.unread}
      onMarkAllRead={notifications.markAllRead}
      onMarkRead={notifications.markRead}
      onClose={()=>setShowNotifs(false)}
      onNavigate={navigateTo}
     />
    )}
    {/* ── Persistent sub-nav bar ───────────────────────────────────── */}
    {currentUser && ["home","history","journal"].includes(view) && (
     <div style={{ display:"flex", gap:"4px", padding:"0 0 14px 0", overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", msOverflowStyle:"none" }}>
      {[["home","Dashboard"],["journal","Journal"],["history","Stats"]].map(([v,label]) => {
       const active = view === v;
       return (
        <button key={v} onClick={() => { haptic.light(); navigateTo(v); }}
         style={{ display:"flex", alignItems:"center", padding:"6px 14px", borderRadius:"20px", flexShrink:0, fontSize:"0.8rem", fontWeight: active?"700":"500", fontFamily:F, cursor:"pointer", WebkitTapHighlightColor:"transparent", transition:"all 0.15s", whiteSpace:"nowrap",
          background: active ? "var(--accent-dim)" : "none",
          border: active ? "1px solid var(--btn-plus-border)" : "1px solid transparent",
          color: active ? "var(--accent)" : "var(--text-muted)",
         }}>
         {label}
        </button>
       );
      })}
     </div>
    )}
    {currentUser && view === "org" && !orgId?.startsWith("solo-") && (
     <div style={{ display:"flex", gap:"4px", padding:"0 0 14px 0", overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", msOverflowStyle:"none" }}>
      {[["dashboard","Dashboard"],["feed","Pulse"],["members","Members"]].map(([t,label]) => {
       const active = comTab === t;
       return (
        <button key={t} onClick={() => setComTab(t)}
         style={{ display:"flex", alignItems:"center", position:"relative", padding:"6px 14px", borderRadius:"20px", flexShrink:0, fontSize:"0.8rem", fontWeight: active?"700":"500", fontFamily:F, cursor:"pointer", WebkitTapHighlightColor:"transparent", transition:"all 0.15s", whiteSpace:"nowrap",
          background: active ? "var(--accent-dim)" : "none",
          border: active ? "1px solid var(--btn-plus-border)" : "1px solid transparent",
          color: active ? "var(--accent)" : "var(--text-muted)",
         }}>
         {label}
         {t==="members" && orgPendingRequests.length > 0 && isAdmin && <span style={{ background:"#E05577", color:"#fff", borderRadius:"8px", fontSize:"0.5rem", padding:"0 4px", fontWeight:"800", lineHeight:"14px", position:"absolute", top:"0px", right:"0px", minWidth:"14px", textAlign:"center" }}>{orgPendingRequests.length}</span>}
        </button>
       );
      })}
     </div>
    )}
    {currentUser && view === "crews" && (
     <div style={{ display:"flex", gap:"4px", padding:"0 0 14px 0", overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", msOverflowStyle:"none" }}>
      {[["dashboard","Dashboard"],["feed","Pulse"],["members","Members"]].map(([t,label]) => {
       const comPendingTotal = Object.values(communityPendingRequests||{}).reduce((s,a)=>s+(a?.length||0),0);
       const active = comTab === t;
       return (
        <button key={t} onClick={() => setComTab(t)}
         style={{ display:"flex", alignItems:"center", position:"relative", padding:"6px 14px", borderRadius:"20px", flexShrink:0, fontSize:"0.8rem", fontWeight: active?"700":"500", fontFamily:F, cursor:"pointer", WebkitTapHighlightColor:"transparent", transition:"all 0.15s", whiteSpace:"nowrap",
          background: active ? "var(--accent-dim)" : "none",
          border: active ? "1px solid var(--btn-plus-border)" : "1px solid transparent",
          color: active ? "var(--accent)" : "var(--text-muted)",
         }}>
         {label}
         {t==="members" && comPendingTotal > 0 && isAdmin && <span style={{ background:"#E05577", color:"#fff", borderRadius:"8px", fontSize:"0.5rem", padding:"0 4px", fontWeight:"800", lineHeight:"14px", position:"absolute", top:"0px", right:"0px", minWidth:"14px", textAlign:"center" }}>{comPendingTotal}</span>}
        </button>
       );
      })}
     </div>
    )}
    {/* ── Sidebar overlay ──────────────────────────────────────────── */}
    {sideNavOpen && (
     <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex" }}
      onClick={e => { if(e.target === e.currentTarget) closeSideNav(); }}>
      {/* Backdrop */}
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(2px)" }} onClick={closeSideNav} />
      {/* Sidebar panel */}
      <div style={{
       position:"relative", zIndex:201,
       width:"clamp(220px,70vw,280px)", height:"100%", paddingTop:"env(safe-area-inset-top, 0px)",
       background:"var(--bg-1)", borderRight:"1px solid var(--border-1)",
       display:"flex", flexDirection:"column", overflowY:"auto",
       boxShadow:"4px 0 32px rgba(0,0,0,0.5)",
       animation:"slideInLeft 0.2s ease",
      }}>
       {/* Sidebar header */}
       <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid var(--border-1)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
         <img src={CADENCE_LOGO} alt="" style={{ width:"26px", height:"26px", objectFit:"contain" }} />
         <span style={{ fontSize:"1rem", fontWeight:"600", letterSpacing:"-0.01em", color:"var(--text-primary)", fontFamily:"'DM Sans',system-ui,sans-serif" }}>Cadence</span>
        </div>
        <button onClick={closeSideNav} style={{ background:"none", border:"none", color:"var(--text-dim)", cursor:"pointer", fontSize:"1rem", padding:"2px 6px", WebkitTapHighlightColor:"transparent" }}>✕</button>
       </div>
       {/* Nav items */}
       <div style={{ flex:1, overflowY:"auto" }}>
        <SideNav
         view={view}
         navigateTo={(v) => { navigateTo(v); closeSideNav(); }}
         currentUser={currentUser}
         orgId={orgId}
         communities={communities}
         messaging={messaging}
         notifications={notifications}
         onOpenNotifs={() => { setShowNotifs(true); closeSideNav(); }}
         isAdmin={isAdmin}
         isSuperAdmin={isSuperAdmin}
         setSettingsInitTab={setSettingsInitTab}
         onOpenProfileSwitcher={() => { setModal("switch"); closeSideNav(); }}
         
         communityPendingCount={isAdmin ? Object.values(communityPendingRequests).reduce((s,a)=>s+(a?.length||0),0) : 0}
         comTab={comTab}
         setComTab={(t) => { setComTab(t); closeSideNav(); }}
        />
       </div>
       {/* Sidebar footer — current user */}
        {currentUser && (
         <div style={{ borderTop:"1px solid var(--border-1)", flexShrink:0 }}>
          <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:"10px" }}>
           {(()=>{
            const _p=currentUser.avatarUrl||null;
            const _e=currentUser.avatarEmoji||(currentUser.avatarColor?.startsWith("emoji:")?currentUser.avatarColor.slice(6):null);
            const _bg=initialsColor(currentUser.name,_e||_p?null:currentUser.avatarColor);
            if(_p) return <img src={_p} alt="avatar" style={{width:"32px",height:"32px",borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>;
            if(_e) return <div style={{width:"32px",height:"32px",borderRadius:"50%",background:_bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",flexShrink:0}}>{_e}</div>;
            return <div style={{width:"32px",height:"32px",borderRadius:"50%",background:_bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",fontWeight:"800",color:"#fff",flexShrink:0}}>{currentUser.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()}</div>;
           })()}
           <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:"0.82rem", fontWeight:"700", color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{currentUser.name}</div>
            <div style={{ fontSize:"0.65rem", color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activeTrack?.name || indConfig?.label || DEFAULT_INDUSTRIES[currentUser.industry]?.label || "My Work"}</div>
           </div>
           <button onClick={() => { setSettingsInitTab("profile"); navigateTo("settings"); closeSideNav(); }} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", borderRadius:"8px", padding:"5px 8px", fontSize:"0.78rem", cursor:"pointer", fontFamily:F, flexShrink:0 }}>Settings</button>
           <button onClick={async()=>{ await window._sb?.auth?.signOut(); window.location.reload(); }} style={{ background:"none", border:"1px solid rgba(224,85,119,0.3)", color:"#E05577", borderRadius:"8px", padding:"5px 8px", fontSize:"0.78rem", cursor:"pointer", fontFamily:F, flexShrink:0 }} title="Sign out">↪</button>
          </div>
          {isFreePlan && (
           <div style={{ padding:"0 12px 12px" }}>
            <button onClick={() => { setShowPaywall(true); closeSideNav(); }} style={{ width:"100%", background:"linear-gradient(135deg, rgba(29,201,232,0.12), rgba(123,111,216,0.12))", border:"1px solid rgba(29,201,232,0.3)", borderRadius:"10px", padding:"10px 14px", cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center", gap:"8px", WebkitTapHighlightColor:"transparent" }}>
             <span style={{ fontSize:"0.9rem" }}>⚡</span>
             <div style={{ flex:1, textAlign:"left" }}>
              <div style={{ fontSize:"0.8rem", fontWeight:"800", color:"#1DC9E8", letterSpacing:"-0.01em" }}>Upgrade to Pro</div>
              <div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.4)" }}>Unlimited Pacer · $19/mo</div>
             </div>
             <span style={{ fontSize:"0.75rem", color:"rgba(29,201,232,0.6)" }}>→</span>
            </button>
           </div>
          )}
         </div>
        )}
      </div>
     </div>
    )}
    <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

    {/* ── HOME — calm landing screen ── */}
    {(view==="home"||view==="dashboard")&&currentUser&&(<>
     <HomeScreen
      currentUser={currentUser}
      myData={myData}
      indConfig={indConfig}
      myGoals={myGoals}
      myGoalPeriods={myGoalPeriods}
      activeTrack={userTracks?.find(t=>t.id===activeTrackId)||userTracks?.[0]||null}
      feed={appFeed}
      users={users}
      allUsersData={allUsersData}
      allUserGoals={allUserGoals}
      industryConfigs={industryConfigs}
      orgId={orgId}
      communities={communities}
      communityMembers={communityMembers}
      admins={admins}
      activeSpace={activeSpace}
      userTracks={userTracks}
      onNavigate={navigateTo}
      onPostToFeed={feedItem=>{ postFeedItem(activeSpace?.id, feedItem).then(next=>setAppFeed(next)); }}
      pacerSettings={pacerSettings}
      isPro={isPro}
      onShowPaywall={()=>setShowPaywall(true)}
     />
    </>)}

    {/* ── ORG VIEW ── */}
    {view==="org"&&currentUser&&<>{navigateTo("crews")}</>}

    {/* ── COMMUNITIES VIEW ── */}
    {view==="crews"&&currentUser&&(
     <CommunitiesView
      currentUser={currentUser}
      users={users}
      allUsersData={allUsersData}
      allUserGoals={allUserGoals}
      industryConfigs={industryConfigs}
      communities={communities}
      communityMembers={communityMembers}
      communityPendingRequests={communityPendingRequests}
      orgId={orgId}
      admins={admins}
      teams={teams}
      presenceMap={presenceMap}
      onOpenDm={(u)=>{ messaging.openDm(u, orgId); navigateTo("messages"); }}
      onNotify={notif=>{ users.filter(u=>u.id!==currentUser?.id).forEach(u=>pushNotification(u.id,notif).catch(()=>{})); }}
      onJoinCommunity={joinCommunityByPin}
      isAdmin={admins.includes(currentUser?.id)}
      activeSpace={activeSpace}
      onApproveCommunityRequest={approveCommunityRequest}
      onRejectCommunityRequest={rejectCommunityRequest}
      tab={comTab}
      onSwitchTab={setComTab}
      isPro={isPro}
      onShowPaywall={()=>setShowPaywall(true)}
     />
    )}

    {/* Legacy compat redirects */}
    {view==="feed"&&currentUser&&<>{navigateTo("crews")}</>}
    {view==="compete"&&currentUser&&<>{navigateTo("crews")}</>}

    {/* TODAY */}
    {view==="tracker"&&<>
     {(()=>{
      const streak=computeStreak(myData, getProtectedDates(myFreezes));
      const pctColor = todayPct>=100?"#1DC9E8":todayPct>=60?"#F59E0B":"#F43F5E";
      return (
       <div style={{marginBottom:"14px"}}>
        {/* Date + progress row */}
        <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap",marginBottom:"10px"}}>
         <input type="date" value={selDate} style={{...s.dateInput,fontSize:"1rem",padding:"7px 10px"}} onChange={e=>setSelDate(e.target.value)} onClick={e=>{try{e.target.showPicker();}catch{}}} onFocus={e=>{try{e.target.showPicker();}catch{}}} ref={el=>{if(el)el.dataset.picker="date"}}/>
         <span style={{fontSize:"0.9rem",color:"var(--text-secondary)",fontWeight:"500"}}>{formatDate(selDate)} · {dayName(selDate)}</span>
         {!weekend&&todayPct>0&&(
          <span style={{fontSize:"0.82rem",color:pctColor,background:`${pctColor}18`,border:`1px solid ${pctColor}44`,borderRadius:"8px",padding:"3px 10px",fontWeight:"700",marginLeft:"auto"}}>
           {todayPct}%
          </span>
         )}
         {weekend&&<span style={{fontSize:"0.82rem",color:"var(--blue)",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:"8px",padding:"3px 10px",fontWeight:"600"}}>
          {selDate>todayStr()?"Future":"Weekend"}
         </span>}
        </div>
        {/* Streak badge */}
        {streak.current>0&&(
         <div style={{display:"inline-flex",alignItems:"center",gap:"6px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:"10px",padding:"5px 12px",fontSize:"0.82rem",color:"#F59E0B",fontWeight:"700"}}>
          {streak.current}-day streak
          {streak.current===streak.longest&&streak.current>1&&<span style={{fontSize:"0.75rem",color:"var(--accent)",marginLeft:"2px"}}>PB 🏆</span>}
         </div>
        )}
       </div>
      );
     })()}
     {/* ── Pacer Workspace Insight — right above intention ── */}
     {selDate===todayStr()&&(
      <PacerWorkspaceInsight
       myData={myData}
       indConfig={indConfig}
       myGoals={myGoals}
       myGoalPeriods={myGoalPeriods}
       currentUser={currentUser}
       myFreezes={myFreezes}
       journalEntries={appJournalEntries}
      />
     )}
     {/* Daily Intention */}
     {selDate===todayStr()&&<div data-tour-intention style={s.mb12}>
      <input
       style={{...s.w100,boxSizing:"border-box",background:BG0,border:"1px solid #2A2A2A",...s.br8,color:dailyIntention?TA:TM,fontSize:"0.95rem",fontFamily:F,padding:"8px 10px",outline:"none",fontStyle:"italic",letterSpacing:"0.02em"}}
       placeholder="Set today's intention — what will you accomplish?"
       value={dailyIntention}
       onChange={e=>{
        const v=e.target.value;
        setDailyIntention(v);
        clearTimeout(intentionSaveTimer.current);
        if(currentUser)intentionSaveTimer.current=setTimeout(async()=>{
         await storageSet(ns(`at-intention-${currentUser.id}-${todayStr()}`),v);
        },1000);
       }}
      />
     </div>}
     {/* Timed journal nudges */}
     {selDate===todayStr()&&currentUser&&(()=>{
      const due = getTimedJournalPrompts(journalSettings);
      if (!due.length) return null;
      const priority = ["annual","quarterly","monthly","weekly","daily"];
      const best = priority.find(p => due.includes(p));
      if (!best) return null;

      // ── If monthly/quarterly/annual: check if already written one this period ──
      if (["monthly","quarterly","annual"].includes(best)) {
       if (!journalEntriesLoaded) return null; // wait until entries have loaded before deciding
       // Grace period: first 3 days of new month = still checking last month's review
       const _now = new Date();
       const _dom = _now.getDate();
       const _lastMonthDate = new Date(_now.getFullYear(), _now.getMonth(), 0); // last day of prev month
       const curMonth = _dom <= 3
         ? `${_lastMonthDate.getFullYear()}-${String(_lastMonthDate.getMonth()+1).padStart(2,"0")}`
         : todayStr().slice(0,7);
       const curQuarter = `${todayStr().slice(0,4)}-Q${Math.ceil((_now.getMonth()+1)/3)}`;
       const curYear = todayStr().slice(0,4);
       const periodKey = best === "monthly" ? curMonth : best === "quarterly" ? curQuarter : curYear;
       const alreadyDone = appJournalEntries && appJournalEntries.some(e => {
        const eMk = new Date(e.ts||0).toISOString().slice(0,7);
        const eQk = `${new Date(e.ts||0).getFullYear()}-Q${Math.ceil((new Date(e.ts||0).getMonth()+1)/3)}`;
        const eYk = String(new Date(e.ts||0).getFullYear());
        const key = best === "monthly" ? eMk : best === "quarterly" ? eQk : eYk;
        const matchesPeriod = key === periodKey;
        const isType = (e.templateId || e._type) === best;
        return matchesPeriod && isType;
       });
       // Already done: show a soft "view/edit" link instead of a fresh nudge
       if (alreadyDone) {
        return (
         <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px", padding:"8px 12px", background:"rgba(74,207,134,0.05)", border:"1px solid rgba(74,207,134,0.15)", borderRadius:"10px" }}>
          <span style={{fontSize:"0.82rem"}}>✓</span>
          <span style={{flex:1, fontSize:"0.8rem", color:"var(--text-dim)", fontFamily:F}}>
           {best === "monthly" ? "Month in review done." : best === "quarterly" ? "Quarter review done." : "Year review done."}
          </span>
          <button onClick={()=>{ setJournalNudgeTemplate(best); setShowJournalNudge(true); }}
           style={{background:"none", border:"none", color:"var(--accent)", fontSize:"0.78rem", fontWeight:"700", cursor:"pointer", fontFamily:F, padding:"0", WebkitTapHighlightColor:"transparent"}}>
           Edit →
          </button>
         </div>
        );
       }
      }

      const nudge = PROMPT_NUDGE[best];
      // Match the same period logic as alreadyDone check
      const _dn = new Date(); const _ddom = _dn.getDate();
      const _dlm = new Date(_dn.getFullYear(), _dn.getMonth(), 0);
      const _dmonth = _ddom <= 3
        ? `${_dlm.getFullYear()}-${String(_dlm.getMonth()+1).padStart(2,"0")}`
        : todayStr().slice(0,7);
      const dismissPeriod = best === "monthly" ? _dmonth : best === "quarterly" ? `${todayStr().slice(0,4)}-Q${Math.ceil((_dn.getMonth()+1)/3)}` : todayStr().slice(0,4);
      const dismissKey = `journal-nudge-${best}-${dismissPeriod}`;
      try { if (localStorage.getItem(dismissKey) || nudgeDismissedKey === dismissKey) return null; } catch { if (nudgeDismissedKey === dismissKey) return null; }
      return (
       <div style={{ display:"flex", gap:"6px", marginBottom:"12px", flexWrap:"wrap" }}>
        <button onClick={()=>{ setJournalNudgeTemplate(best); setShowJournalNudge(true); }}
         style={{ flex:1, minWidth:0, background:"rgba(123,111,216,0.07)", border:"1px dashed rgba(123,111,216,0.3)", color:"var(--text-muted)", padding:"8px 12px", borderRadius:"10px", fontSize:"0.82rem", cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center", gap:"8px", WebkitTapHighlightColor:"transparent", minHeight:"36px" }}>
         <span>{nudge.icon}</span>
         <span style={{flex:1,textAlign:"left"}}>{nudge.label}</span>
         <span style={{fontSize:"0.75rem",opacity:0.6}}>→</span>
        </button>
        <button onClick={()=>{ try { localStorage.setItem(dismissKey,"1"); } catch {} setNudgeDismissedKey(dismissKey); }}
         title="Dismiss" style={{ background:"none", border:"1px solid var(--border-1)", borderRadius:"10px", padding:"0 10px", color:"var(--text-dim)", cursor:"pointer", fontSize:"1rem", minHeight:"36px", WebkitTapHighlightColor:"transparent" }}>✕</button>
       </div>
      );
     })()}
     {showJournalNudge&&currentUser&&<JournalEntryModal currentUser={currentUser} myData={myData} industryConfig={indConfig} myGoals={myGoals} activeSpace={activeSpace} onPostToFeed={feedItem=>{ postFeedItem(activeSpace?.id, feedItem).then(next=>setFeed(next)); }} initialTemplate={journalNudgeTemplate} activeTrackId={activeTrackId} onClose={()=>setShowJournalNudge(false)} onSaved={()=>{ setShowJournalNudge(false); (async()=>{ try{ const uid=currentUser.id; const all=await loadJournalEntries(uid).catch(()=>[]); const seenWks=new Set(all.map(e=>e.weekKey).filter(Boolean)); const leg=[]; const n2=new Date(); for(let i=0;i<52;i++){const d=new Date(n2);d.setDate(d.getDate()-i*7);const wk=weekKey(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);if(seenWks.has(wk))continue;try{const r=await loadWeeklyReflection(uid,wk);if(r&&(r.wins||r.movedNeedle||r.templateId))leg.push({...r,_wk:wk,templateId:r.templateId||"weekly",_type:r.templateId||"weekly"});}catch{}} setAppJournalEntries([...all,...leg]);}catch{} setJournalEntriesLoaded(true);})(); }}/>}
     {selDate>todayStr()&&<div style={{background:BG2,border:"1px solid var(--red)",...s.br10,padding:"10px 16px",...s.mb12,fontSize:"0.95rem",color:"var(--red)",letterSpacing:"0.05em"}}>
      🚫 Can't edit dates in the future
     </div>}
     <div data-tour-metriccards style={{
      display:"grid",
      gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(min(175px,45vw),1fr))",
      gap:isMobile?"10px":"8px",
      marginBottom:"18px",
      pointerEvents:selDate>todayStr()?"none":"auto",
      opacity:selDate>todayStr()?0.4:1
     }}>
      {activeMetrics.map(m=>{
       const periodDivisor = { daily:1, weekly:5, monthly:21, annual:260 };
       const rawGoal=(myGoals[m.key]!=null)?myGoals[m.key]:m.defaultGoal;
       const period = myGoalPeriods?.[m.key] || "daily";
       const goal = rawGoal / (periodDivisor[period] || 1);
       return <MetricCard key={m.key} metric={m} value={counts[m.key]||0} goal={goal} onChange={v=>{
           setCounts(p=>{
             const prev=p[m.key]||0;
             const next=Math.max(0,v);
             if(goal>0 && prev<goal && next>=goal) {
               haptic.success();
               window.dispatchEvent(new CustomEvent("cadence:metric-milestone", { detail: { key: m.key, label: m.label, short: m.short, val: next, goal, type: "goal" } }));
             } else if(goal>0 && prev < Math.floor(goal*0.5) && next >= Math.floor(goal*0.5)) {
               haptic.light();
               window.dispatchEvent(new CustomEvent("cadence:metric-milestone", { detail: { key: m.key, label: m.label, short: m.short, val: next, goal, type: "halfway" } }));
             } else if(next>prev) haptic.light();
             return {...p,[m.key]:next};
           });
          }} flashDir={flashing[m.key]} note={notes[m.key]||""} onNoteChange={v=>setNotes(p=>({...p,[m.key]:v}))} isMobile={isMobile}/>;
      })}
     </div>

     <div style={s.actionRow}>
      <div style={s.totalLabel}>
       {(()=>{
        const primary=activeMetrics.filter(m=>(myGoals[m.key]!=null?myGoals[m.key]:m.defaultGoal)>0);
        const logged=primary.filter(m=>(counts[m.key]||0)>0).length;
        return primary.length>0?`${logged}/${primary.length} goals tracked`:"";
       })()}
      </div>
      <div style={s.actionBtns}>
       <button style={s.secondaryBtn} onClick={()=>setModal("import")}>Import</button>
       <button style={s.secondaryBtn} onClick={()=>setModal("share")}>Share</button>
       {selDate<todayStr()&&<button style={{...s.primaryBtn,opacity:saving?0.5:1}} onClick={()=>{ haptic.success(); saveDay(false); }} disabled={saving}>
        {saving?"Saving...":savedFlash?"✓ Saved":"Save Changes"}
       </button>}
       {selDate===todayStr()&&savedFlash&&<span style={{fontSize:"0.95rem",color:"var(--green)",fontFamily:F,padding:"4px 8px",...s.fw6}}>✓ Saved</span>}
      </div>
     </div>

     {/* ── Working Tools ── */}
     <div data-tour-tools>
     <WorkingTools
      scriptPad={scriptPad}
      currentUser={currentUser}
      isAdmin={isAdmin}
      allUsers={users}
      superAdminId={superAdmin}
      industry={currentUser?.industry}
      industryConfig={indConfig}
      selDate={selDate}
      activeMetrics={activeMetrics}
      myData={myData}
      myGoals={myGoals}
      counts={counts}
      onOpenPacer={() => window.dispatchEvent(new CustomEvent("cadence:open-pacer"))}
      onScriptChange={v=>{
       setScriptPad(v);
       clearTimeout(scriptSaveTimer.current);
       if(currentUser)scriptSaveTimer.current=setTimeout(async()=>{await storageSet(ns(`at-script-${currentUser.id}`),v);},1500);
      }}
     />
     </div>
    </>}

    {/* FOCUS SESSION — separate view */}

    {/* HISTORY */}
    {view==="history"&&<>
<div>
     {/* Date + track context header */}
     {currentUser && (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
       <div>
        <div style={{ fontSize:"0.78rem", color:"var(--text-dim)", fontWeight:"500" }}>
         {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
         {(userTracks?.find(t=>t.id===activeTrackId)||userTracks?.[0]) && (
          <span style={{ marginLeft:"8px", color:"var(--accent)", fontWeight:"600" }}>
           {(userTracks?.find(t=>t.id===activeTrackId)||userTracks?.[0])?.icon} {(userTracks?.find(t=>t.id===activeTrackId)||userTracks?.[0])?.name}
          </span>
         )}
        </div>
       </div>
      </div>
     )}
     <PacerHistoryInsight
      myData={myData}
      indConfig={indConfig}
      myGoals={myGoals}
      myGoalPeriods={myGoalPeriods}
      currentUser={currentUser}
      streak={computeStreak(myData, getProtectedDates(myFreezes))}
     />
     <div style={s.histTopRow}>
      {/* ── Analytics Report CTA ── */}
      <button onClick={()=>null /* removed */}
       style={{ display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",boxSizing:"border-box",
        background:"linear-gradient(135deg,rgba(29,201,232,0.08) 0%,rgba(168,85,247,0.05) 100%)",
        border:"1px solid rgba(29,201,232,0.2)",borderRadius:"14px",padding:"14px 16px",
        cursor:"pointer",WebkitTapHighlightColor:"transparent",marginBottom:"4px",textAlign:"left" }}>
       <div>
        <div style={{ fontSize:"0.88rem",fontWeight:800,color:"var(--text-primary)",fontFamily:F,marginBottom:"2px" }}>📊 Performance Report</div>
        <div style={{ fontSize:"0.72rem",color:"var(--text-muted)",fontFamily:F }}>Goal %, streaks, best days, Pacer's read</div>
       </div>
       <span style={{ fontSize:"0.85rem",color:"var(--accent)",flexShrink:0,marginLeft:"10px" }}>→</span>
      </button>

      <div style={s.sectionLabel}>Your History</div>
      <div style={s.actionBtns}>
       <button style={s.secondaryBtn} onClick={()=>setModal("import")}>Bulk Import</button>
       <button style={s.secondaryBtn} onClick={()=>setModal("backup")}>Backup / Restore</button>
       <button style={s.secondaryBtn} onClick={()=>setModal("share")}>Share</button>
      </div>
     </div>
     <div style={{...s.fdc,gap:"10px"}}>
      {getMonths().length===0?<div style={s.emptyState}>No data yet.</div>
       :(<>
        {getMonths().map(mk=><MonthBlock key={mk} mk={mk} allData={myData} industryConfig={indConfig} userGoals={myGoals} todayLive={{date:selDate,counts,notes}} bestDays={bestDaysAllTime} onEditDay={date=>{setEditDate(date);setModal("edit");}}/>)}
       </>)}
     </div>
    </div></>}

    {/* JOURNAL */}
    {view==="journal"&&<>
<JournalView currentUser={currentUser} myData={myData} industryConfig={indConfig} myGoals={myGoals} activeSpace={activeSpace} orgId={orgId} communities={communities} onPostToFeed={feedItem=>{ postFeedItem(activeSpace?.id, feedItem).then(next=>setFeed(next)); }} userTracks={userTracks} activeTrackId={activeTrackId}/></>}

    {/* LEADERBOARD */}
    {view==="leaderboard"&&<>{navigateTo("crews")}</>}

    {view==="messages"&&<>
<MessagesPage
     currentUser={currentUser}
     allUsers={allMsgUsers}
     threads={messaging.threads}
     sendMessageFn={messaging.sendMessage}
     onMarkRead={messaging.markRead}
     onOpenWindow={messaging.openWindow}
     communities={communities}
     orgMeta={orgMeta}
     orgId={orgId}
     communityMembersRef={communityMembersLiveRef}
     presenceMap={presenceMap}
    /></>}

    {/* SETTINGS PAGE */}
    {view==="settings"&&currentUser&&<SettingsPage
     initialTab={settingsInitTab}
     user={currentUser}
     allUsers={users}
     admins={admins}
     teams={teams}
     industryConfigs={industryConfigs}
     industryConfig={indConfig}
     userGoals={myGoals}
     userGoalPeriods={myGoalPeriods}
     pins={pins}
     isSuperAdmin={isSuperAdmin}
     isAdmin={isAdmin}
     isGlobalSA={isGlobalSA}
     onRename={n=>{renameUser(n);}}
     onChangeIndustry={changeIndustry}
     onSaveGoals={(g, trackId, metrics, goalPeriods)=>{saveGoals(g, trackId, metrics, goalPeriods);}}
     onSetPin={setPinForUser}
     onRemovePin={removePinForUser}
     onAddNew={(n,ind,pin)=>createUser(n,ind,false,pin)}
     onDelete={deleteUser}
     onToggleAdmin={toggleAdmin}
     onAssignTeam={assignToTeam}
     onSaveAdminConfig={saveAdminConfig}
     onSetAvatarColor={setAvatarColor}
     onSetAvatarEmoji={setAvatarEmoji}
     onSetAvatarUrl={setAvatarUrl}
     orgId={orgId}
     orgMeta={orgMeta}
     isSolo={!(communities && communities.length > 0)}
     onJoinOrg={joinOrg}
     onUpdateOrgMeta={updateOrgMeta}
     communities={communities}
     communityMembers={communityMembers}
     orgPendingRequests={orgPendingRequests}
     communityPendingRequests={communityPendingRequests}
     onCreateCommunity={createCommunitySpace}
     onJoinCommunity={joinCommunity}
     onLeaveCommunity={leaveCommunity}
     onUpdateCommunityMeta={updateCommunityMeta}
     onKickCommunityMember={kickCommunityMember}
     onRequestJoinOrg={requestJoinOrg}
     onApproveOrgRequest={approveOrgRequest}
     onRejectOrgRequest={rejectOrgRequest}
     onJoinCommunityByPin={joinCommunityByPin}
     onRequestJoinCommunity={requestJoinCommunity}
     onApproveCommunityRequest={approveCommunityRequest}
     onRejectCommunityRequest={rejectCommunityRequest}
     onSearchSpaces={searchSpaces}
     spaceSearchResults={spaceSearchResults}
     onChangeCommunityIndustry={changeCommunityIndustry}
     communityAdminsInit={communityAdmins}
     onSaveCommunityAdmins={saveCommunityAdminsForSpace}
     darkMode={darkMode}
     onToggleDarkMode={()=>{ haptic.light(); setDarkMode(d=>!d); }}
     presenceMap={presenceMap}
     onOpenDm={(targetUser) => { messaging.openDm(targetUser, orgId); navigateTo("messages"); }}
     onLogout={logout}
     authUser={authUser}
     userTracks={userTracks}
     activeTrackId={activeTrackId}
     onSwitchTrack={switchTrack}
     onDeleteTrack={deleteTrack}
     onCreateTrack={() => setShowTrackManager("create")}
     onSendFeedback={async(text)=>{
      const adm = (admins||[]).find(a=>a.isSuperAdmin||a.isAdmin);
      const target = adm||users.find(u=>u.id!==currentUser.id)||currentUser;
      await messaging.sendMessage({id:`feedback-${Date.now()}`,participantIds:[currentUser.id,target.id],isGroup:false,name:target.name,threadKey:`feedback-${currentUser.id}`},`[Feedback] ${text}`);
     }}
     pacerSettings={pacerSettings}
     onSavePacerSettings={savePacerSettings}
     myData={myData}
     myFreezes={myFreezes}
     isPro={isPro}
     isElite={isElite}
     usageStatus={usageStatus}
     onShowPaywall={()=>{ setPaywallTier("pro"); setShowPaywall(true); }}
     onShowElitePaywall={()=>{ setPaywallTier("elite"); setShowPaywall(true); }}
    />}
   </div>

   {/* ── Mobile Bottom Nav — fixed, mobile only ── */}
   {isMobile && currentUser && (
    <MobileBottomNav
     view={view}
     navigateTo={navigateTo}
     orgId={orgId}
     communities={communities}
     messaging={messaging}
     notifications={notifications}
     isAdmin={isAdmin}
     comTab={comTab}
     setComTab={setComTab}
     setSettingsInitTab={setSettingsInitTab}
     currentUser={currentUser}
    />
   )}
   {/* Floating chat bubbles — always rendered, page-agnostic */}
   <FloatingChatBubbles
    openWindows={messaging.openWindows}
    threads={messaging.threads}
    currentUser={currentUser}
    allUsers={allMsgUsers}
    mutedThreads={messaging.mutedThreads}
    sendMessageFn={messaging.sendMessage}
    onClose={messaging.closeWindow}
    onMinimize={messaging.toggleMinimize}
    onMarkRead={messaging.markRead}
    onToggleMute={messaging.toggleMute}
    presenceMap={presenceMap}
   />
   {/* ── PACER AI Companion — persistent across all views ── */}
   {currentUser && !pacerSettings.hidden && (
    <PacerCompanion
     currentUser={currentUser}
     pacerSettings={pacerSettings}
     myData={myData}
     industryConfig={indConfig}
     myGoals={myGoals}
     myGoalPeriods={myGoalPeriods}
     streak={computeStreak(myData, getProtectedDates(myFreezes))}
     todayPct={Math.round(todayPct)}
     orgId={orgId}
     communities={communities}
     allUsersData={allUsersData}
     allUserGoals={allUserGoals}
     myFreezes={myFreezes}
     freezeBank={freezeBank}
     setShowFreezePrompt={setShowFreezePrompt}
     view={view}
     counts={counts}
     onboardPrompts={onboardPrompts}
     setOnboardPrompts={setOnboardPrompts}
     onNavigate={navigateTo}
     onGoSettings={(tab) => { setSettingsInitTab(tab || "profile"); navigateTo("settings"); }}
     onShowPaywall={() => setShowPaywall(true)}
     isPro={isPro}
     usageStatus={usageStatus}
    />
   )}
  </div>
  </ErrorBoundary>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ── ChimeInModal — quick post to org/community spaces ────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function ChimeInModal({ currentUser, orgId, communities, prefillText, onClose }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [text, setText] = useState(prefillText || "");
 const [selectedSpaces, setSelectedSpaces] = useState(() => {
  if (orgId && !orgId.startsWith("solo-")) return [orgId];
  if (communities?.length) return [communities[0].id];
  return [];
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
  // Let Pacer scan for commitments in this post
  window.dispatchEvent(new CustomEvent("cadence:pacer-scan", { detail: { text: text.trim(), source: "post" } }));
  setPosting(true);
  const item = {
   id: `feed-chime-${currentUser.id}-${Date.now()}`,
   type: "win", userId: currentUser.id, userName: currentUser.name,
   userIndustry: currentUser.industry, text: text.trim(),
   ts: Date.now(), date: todayStr(),
  };
  await Promise.all(selectedSpaces.map(spaceId => postFeedItem(spaceId, item).catch(()=>{})));
  setPosted(true);
  setTimeout(onClose, 900);
 }

 return (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
   onClick={e=>e.target===e.currentTarget&&onClose()}>
   <div style={{background:"var(--bg-1)",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:"640px",maxHeight:"80vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 -8px 40px rgba(0,0,0,0.6)", paddingBottom:"env(safe-area-inset-bottom, 0px)" }}>
    <div style={{padding:"16px 20px 12px",borderBottom:"1px solid var(--border-1)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
     <div style={{fontSize:"1rem",fontWeight:"800",color:"var(--text-primary)",fontFamily:F}}>Chime In</div>
     <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:"1.3rem",cursor:"pointer",padding:"2px 6px",lineHeight:1}}>✕</button>
    </div>
    <div style={{padding:"16px 20px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:"14px"}}>
     <textarea value={text} onChange={e=>setText(e.target.value)} autoFocus rows={4}
      placeholder="Share your take, add context, or start a discussion…"
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
          {selectedSpaces.includes(sp.id)&&<span>✓</span>}
          {sp.icon} {sp.name}
         </button>
        ))}
       </div>
      </div>
     )}
     {availableSpaces.length === 1 && <div style={{fontSize:"0.78rem",color:"var(--text-muted)"}}>Posting to: {availableSpaces[0].icon} {availableSpaces[0].name}</div>}
     {availableSpaces.length === 0 && <div style={{fontSize:"0.82rem",color:"#E05577"}}>Join an org or community to post there.</div>}
    </div>
    <div style={{padding:"12px 20px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 20px)",flexShrink:0}}>
     {posted ? (
      <div style={{textAlign:"center",padding:"10px",fontSize:"0.9rem",color:"#4ACF86",fontWeight:"700"}}>✓ Posted!</div>
     ) : (
      <button onClick={()=>{ haptic.success(); handlePost(); }} disabled={!text.trim()||!selectedSpaces.length||posting}
       style={{width:"100%",background:"var(--accent)",color:"#000",border:"none",padding:"13px",borderRadius:"12px",fontSize:"0.9rem",fontWeight:"800",cursor:"pointer",fontFamily:F,opacity:(!text.trim()||!selectedSpaces.length)?0.5:1}}>
       {posting?"Posting…":"Post →"}
      </button>
     )}
    </div>
   </div>
  </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── MultiIndustryBriefing — briefing across all community industries ──────────
// ─────────────────────────────────────────────────────────────────────────────
function MultiIndustryBriefing({ currentUser, industries, industryConfigs, orgId, communities }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [items, setItems] = useState(null);
 const [loading, setLoading] = useState(true);
 const [chimeItem, setChimeItem] = useState(null);

 const industryKey = (industries||[]).join(",").slice(0,60);

 function getCacheKey() {
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `cadence-multi-briefing-${industryKey}-${dateStamp}`;
 }

 useEffect(() => {
  if (!industries?.length) { setLoading(false); return; }
  try {
   const cached = localStorage.getItem(getCacheKey());
   if (cached) { const p = JSON.parse(cached); if (p?.items?.length) { setItems(p.items); setLoading(false); return; } }
  } catch {}
  const labelsArr = [...new Set(industries.map(k => industryConfigs?.[k]?.label || k))].slice(0,4);
  const labels = labelsArr.join(", ");
  const nowDate = new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const prompt = `You are writing a daily briefing for a multi-industry professional community. Members work across: ${labels}. Today is ${nowDate}. Write exactly 3 briefing items.

JSON only:
{"items":[
  {"type":"pulse","label":"What's Moving","trackTag":"${labelsArr[0]||"All"}","headline":"...","body":"...","searchQuery":"..."},
  {"type":"tactic","label":"Pro Edge","trackTag":"${labelsArr[1]||labelsArr[0]||"All"}","headline":"...","body":"...","searchQuery":"..."},
  {"type":"mindset","label":"The Standard","trackTag":"All","headline":"...","body":"...","searchQuery":"..."}
]}

Rules: Headlines 6-10 words, punchy. Body 1-2 sentences, actionable. trackTag = which track this is most relevant to (use one of: ${labels}, or "All"). searchQuery: 4-6 words.`;
  callAI({ model: "claude-sonnet-4-20250514", messages: [{role:"user",content:prompt}], max_tokens: 600, call_type: "metric_gen" })
 }, [industryKey]);

 const typeColors = {
  pulse:   {bg:"rgba(29,201,232,0.06)",border:"rgba(29,201,232,0.18)",label:"var(--accent)"},
  tactic:  {bg:"rgba(74,207,134,0.06)",border:"rgba(74,207,134,0.18)",label:"#4ACF86"},
  mindset: {bg:"rgba(168,85,247,0.06)",border:"rgba(168,85,247,0.18)",label:"#A855F7"},
 };

 if (!loading && !items) return null;

 const industryChips = [...new Set(industries||[])].map(k => ({
  key: k,
  icon: industryConfigs?.[k]?.icon || DEFAULT_INDUSTRIES?.[k]?.icon || "◆",
  label: industryConfigs?.[k]?.label || DEFAULT_INDUSTRIES?.[k]?.label || k,
 })).slice(0,4);

 return (
  <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"4px"}}>
   <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
    <div style={{fontSize:"0.68rem",fontWeight:"800",color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.12em"}}>Community Briefing</div>
    {industryChips.map(c=>(
     <span key={c.key} style={{fontSize:"0.65rem",fontWeight:"700",color:"var(--text-muted)",background:"var(--bg-2)",border:"1px solid var(--border-1)",borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.02em"}}>
      {c.icon} {c.label}
     </span>
    ))}
   </div>
   {loading && [1,2,3].map(i=>(
    <div key={i} style={{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"12px",padding:"14px 16px",opacity:0.4}}>
     <div style={{width:"60px",height:"8px",background:"var(--bg-3)",borderRadius:"4px",marginBottom:"8px"}}/>
     <div style={{width:"80%",height:"10px",background:"var(--bg-3)",borderRadius:"4px",marginBottom:"6px"}}/>
     <div style={{width:"95%",height:"8px",background:"var(--bg-3)",borderRadius:"4px"}}/>
    </div>
   ))}
   {!loading && items && items.map((item,i)=>{
    const colors=typeColors[item.type]||typeColors.pulse;
    const searchUrl=item.searchQuery?`https://www.google.com/search?q=${encodeURIComponent(item.searchQuery)}`:null;
    return(
     <div key={i} style={{background:colors.bg,border:`1px solid ${colors.border}`,borderRadius:"12px",padding:"14px 16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"6px",flexWrap:"wrap"}}>
       <div style={{fontSize:"0.65rem",fontWeight:"800",color:colors.label,textTransform:"uppercase",letterSpacing:"0.1em"}}>{item.label}</div>
       {item.trackTag && (
        <div style={{fontSize:"0.62rem",fontWeight:"700",color:"var(--text-dim)",background:"var(--bg-2)",border:"1px solid var(--border-1)",borderRadius:"5px",padding:"1px 7px",letterSpacing:"0.04em"}}>{item.trackTag}</div>
       )}
      </div>
      <div style={{fontSize:"0.9rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F,lineHeight:1.3,marginBottom:"5px"}}>{item.headline}</div>
      <div style={{fontSize:"0.82rem",color:"var(--text-muted)",lineHeight:1.55,marginBottom:"10px"}}>{item.body}</div>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
       <button onClick={()=>setChimeItem(item)} style={{padding:"5px 12px",borderRadius:"8px",fontSize:"0.75rem",fontWeight:"700",cursor:"pointer",fontFamily:F,background:"rgba(29,201,232,0.1)",border:"1px solid rgba(29,201,232,0.25)",color:"var(--accent)"}}>Chime In</button>
       {item.searchQuery&&<button onClick={()=>{window.dispatchEvent(new CustomEvent("cadence:pacer-prompt",{detail:`Tell me more about this topic: "${item.headline}". ${item.body}`}));}} style={{padding:"5px 12px",borderRadius:"8px",fontSize:"0.75rem",fontWeight:"700",fontFamily:F,background:"transparent",border:"1px solid var(--border-1)",color:"var(--text-muted)",cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>Ask Pacer ⚡</button>}
      </div>
     </div>
    );
   })}
   {chimeItem && <ChimeInModal currentUser={currentUser} orgId={orgId} communities={communities} prefillText={`Re: "${chimeItem.headline}" — `} onClose={()=>setChimeItem(null)} />}
  </div>
 );
}

// ── DailyBriefing — AI-powered industry intel, cached 4hrs ──────────────────
// ─────────────────────────────────────────────────────────────────────────────
function DailyBriefing({ currentUser, indConfig, userTracks, activeTrack, industryConfigs, orgId, communities }) {
 const F = "'DM Sans',system-ui,sans-serif";
 // allSections: array of { trackId, trackName, trackIcon, industry, cfg, items, loading }
 const [sections, setSections] = useState([]);
 const [chimeItem, setChimeItem] = useState(null);

 // Build the list of tracks to brief on (main + all user tracks, deduped by industry)
 const tracksToShow = useMemo(() => {
  const result = [];
  const seenIndustries = new Set();
  const mainIndustry = currentUser?.industry;
  if (mainIndustry) {
   seenIndustries.add(mainIndustry);
   result.push({ trackId: "main", trackName: indConfig?.label || "Main", trackIcon: indConfig?.icon || "◆", industry: mainIndustry, cfg: indConfig });
  }
  for (const t of (userTracks || [])) {
   const ind = t.industry || t.industryKey;
   if (!ind || seenIndustries.has(ind)) continue;
   seenIndustries.add(ind);
   const cfg = industryConfigs?.[ind] || {};
   result.push({ trackId: t.id, trackName: t.name, trackIcon: t.icon || cfg.icon || "◆", industry: ind, cfg });
  }
  return result;
 }, [currentUser?.industry, userTracks, indConfig, industryConfigs]);

 // Cache key: industry + date + 4-hour block
 function getCacheKey(industry) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `cadence-briefing-${industry}-${dateStamp}`;
 }

 async function fetchBriefing(industry, cfg) {
  const cacheKey = getCacheKey(industry);
  try {
   const cached = localStorage.getItem(cacheKey);
   if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed?.items?.length) return parsed.items;
   }
  } catch {}

  const industryLabel = cfg?.label || industry;
  const metrics = (cfg?.weekdayMetrics || []).map(m => m.label).slice(0, 4).join(", ");
  const now = new Date();
  const todayFull = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); // e.g. "Friday, February 27, 2026"

  const prompt = `You are a sharp industry briefing writer. Write exactly 3 briefing items for someone working in ${industryLabel}. Their daily metrics include: ${metrics}. Today is ${todayFull}.

Format as JSON only — no markdown, no explanation, just this exact structure:
{"items":[
  {"type":"insight","label":"Market Pulse","headline":"...","body":"...","searchQuery":"..."},
  {"type":"tactic","label":"Today's Edge","headline":"...","body":"...","searchQuery":"..."},
  {"type":"mindset","label":"The Long Game","headline":"...","body":"...","searchQuery":"..."}
]}

Rules:
- Headlines are 6-10 words, punchy, specific to their industry
- Body is 1-2 sentences max, actionable or genuinely insightful
- NO generic advice like "make more calls" or "stay positive"
- NO fluff. Sound like a seasoned operator in ${industryLabel}, not a motivational poster
- Reference real dynamics of their industry (market conditions, buyer psychology, timing, competition)
- "Market Pulse" = something happening RIGHT NOW (week of ${todayFull}) that matters to ${industryLabel} professionals. CRITICAL: Do NOT reference any event, season, or trend that has already passed. If today is late February, Valentine's Day is over — don't mention it. Use today's actual date as your anchor.
- "Today's Edge" = a specific tactic or approach that moves the needle on one of their metrics
- "The Long Game" = a pattern or truth that separates top performers in this field
- Rotate variety — each generation should feel fresh
- searchQuery: 4-6 word Google search query for a real article related to each item`;

  try {
   const data = await callAI({ model: "claude-sonnet-4-20250514", messages: [{ role: "user", content: prompt }], max_tokens: 500, call_type: "metric_gen" })
   const raw = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
   const clean = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
   const parsed = JSON.parse(clean);
   if (parsed?.items?.length) {
    try { localStorage.setItem(cacheKey, JSON.stringify(parsed)); } catch {}
    return parsed.items;
   }
  } catch {}
  return null;
 }

 // Initialize sections from tracksToShow, then fetch each
 useEffect(() => {
  if (!tracksToShow.length) return;
  // Set loading state for all
  setSections(tracksToShow.map(t => ({ ...t, items: null, loading: true })));
  // Fetch each industry independently
  tracksToShow.forEach((t, idx) => {
   fetchBriefing(t.industry, t.cfg).then(result => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, items: result, loading: false } : s));
   });
  });
 }, [tracksToShow.map(t => t.industry).join(",")]);

 const typeColors = {
  insight: { bg: "rgba(29,201,232,0.06)", border: "rgba(29,201,232,0.18)", label: "var(--accent)" },
  tactic:  { bg: "rgba(74,207,134,0.06)", border: "rgba(74,207,134,0.18)", label: "#4ACF86" },
  mindset: { bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.18)", label: "#A855F7" },
  pulse:   { bg: "rgba(29,201,232,0.06)", border: "rgba(29,201,232,0.18)", label: "var(--accent)" },
 };

 const anyLoading = sections.some(s => s.loading);
 const anyItems = sections.some(s => s.items?.length);
 if (!anyLoading && !anyItems) return null;

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
   {/* Header */}
   <div style={{ fontSize: "0.68rem", fontWeight: "800", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
    Daily Briefing
   </div>

   {/* Sections - one per track/industry */}
   {sections.map((section) => (
    <div key={section.trackId}>
     {/* Loading skeleton for this section */}
     {section.loading && (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
       {[1,2,3].map(i => (
        <div key={i} style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "12px", padding: "14px 16px", opacity: 0.4 }}>
         <div style={{ width: "60px", height: "8px", background: "var(--bg-3)", borderRadius: "4px", marginBottom: "8px" }} />
         <div style={{ width: "80%", height: "10px", background: "var(--bg-3)", borderRadius: "4px", marginBottom: "6px" }} />
         <div style={{ width: "95%", height: "8px", background: "var(--bg-3)", borderRadius: "4px" }} />
        </div>
       ))}
      </div>
     )}
     {/* Items */}
     {!section.loading && section.items && section.items.map((item, i) => {
      const colors = typeColors[item.type] || typeColors.insight;
      return (
       <div key={i} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: "12px", padding: "14px 16px", marginBottom: "8px", position: "relative" }}>
        {/* Track label chip — always show, helps user see which industry this is for */}
        {(
         <div style={{ position: "absolute", top: "10px", right: "12px", display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "2px 7px" }}>
          <span style={{ fontSize: "0.72rem" }}>{section.trackIcon}</span>
          <span style={{ fontSize: "0.62rem", fontWeight: "700", color: "var(--text-dim)", letterSpacing: "0.04em", textTransform: "uppercase", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{section.trackName}</span>
         </div>
        )}
        <div style={{ fontSize: "0.65rem", fontWeight: "800", color: colors.label, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "5px", paddingRight: "90px" }}>
         {item.label}
        </div>
        <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F, lineHeight: 1.3, marginBottom: "5px", paddingRight: "90px" }}>
         {item.headline}
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.55, marginBottom: "10px" }}>
         {item.body}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
         {(!orgId?.startsWith("solo-") || (communities||[]).length > 0) && (
          <button onClick={() => setChimeItem(item)}
           style={{ padding: "5px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer", fontFamily: F, background: "rgba(29,201,232,0.1)", border: "1px solid rgba(29,201,232,0.25)", color: "var(--accent)", WebkitTapHighlightColor: "transparent" }}>
           Chime In
          </button>
         )}
         <button onClick={() => { window.dispatchEvent(new CustomEvent("cadence:pacer-prompt", { detail: `Ask Pacer about this briefing item: "${item.headline}". ${item.body} (Industry: ${section.trackName})` })); }}
          style={{ padding: "5px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer", fontFamily: F, background: "transparent", border: "1px solid var(--border-1)", color: "var(--text-muted)", WebkitTapHighlightColor: "transparent" }}>
          Ask Pacer ⚡
         </button>
        </div>
       </div>
      );
     })}
    </div>
   ))}

   {chimeItem && (
    <ChimeInModal
     currentUser={currentUser}
     orgId={orgId}
     communities={communities}
     prefillText={`Re: "${chimeItem.headline}" — `}
     onClose={() => setChimeItem(null)}
    />
   )}
  </div>
 );
}


// ═════════════════════════════════════════════════════════════════════════════
// ── PACER — AI Performance Companion ─────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

// Utility: analyze last N days of data to find behavioral patterns
function analyzePacerPatterns(myData, metrics, myGoals, days = 14) {
  const today = todayStr();
  const dates = Object.keys(myData)
    .filter(d => d < today && !isWeekend(d))
    .sort()
    .slice(-days);

  if (dates.length < 3) return null;

  const patterns = {};

  // Per-metric: find which days/times things went missing
  metrics.forEach(m => {
    const goal = myGoals?.[m.key] ?? m.defaultGoal ?? 0;
    if (!goal) return;
    const misses = dates.filter(d => (myData[d]?.[m.key] || 0) < goal * 0.5);
    const hits   = dates.filter(d => (myData[d]?.[m.key] || 0) >= goal);
    patterns[m.key] = {
      label: m.label,
      goal,
      missRate: Math.round((misses.length / dates.length) * 100),
      hitRate:  Math.round((hits.length   / dates.length) * 100),
      recentMisses: misses.slice(-3).length, // last 3 days
      avgVal: dates.length
        ? Math.round(dates.reduce((s, d) => s + (myData[d]?.[m.key] || 0), 0) / dates.length)
        : 0,
    };
  });

  // Streak of misses on specific metrics
  const streakMisses = {};
  metrics.forEach(m => {
    const goal = myGoals?.[m.key] ?? m.defaultGoal ?? 0;
    if (!goal) return;
    let streak = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
      if ((myData[dates[i]]?.[m.key] || 0) < goal * 0.5) streak++;
      else break;
    }
    if (streak >= 2) streakMisses[m.key] = streak;
  });

  return { patterns, streakMisses, sampleDays: dates.length };
}


// ─────────────────────────────────────────────────────────────────────────────
// ── Pacer Memory & Relationship System ───────────────────────────────────────
// Pacer accumulates a "read" on the user over time. Weekly summaries are stored
// and injected into every conversation so Pacer always has history.
// ─────────────────────────────────────────────────────────────────────────────

function computePacerWeeklyState(myData, metrics, myGoals, streak, myGoalPeriods) {
  // Compute Pacer's current "mood" about the user's trajectory
  // Returns: { state, label, weekAvg, prevWeekAvg, trend, daysLogged, daysSinceActive }
  const today = todayStr();

  // Last 5 weekdays
  const last5 = Object.keys(myData)
    .filter(d => d < today && !isWeekend(d))
    .sort().slice(-5);

  const last5prev = Object.keys(myData)
    .filter(d => d < today && !isWeekend(d))
    .sort().slice(-10, -5);

  const avg = (days) => {
    if (!days.length) return 0;
    return Math.round(days.reduce((s, d) => s + computeGoalPct(myData[d] || {}, metrics, myGoals, myGoalPeriods), 0) / days.length);
  };

  const weekAvg = avg(last5);
  const prevWeekAvg = avg(last5prev);
  const trend = last5prev.length ? weekAvg - prevWeekAvg : 0;

  // Days since last activity logged
  const activeDays = Object.keys(myData)
    .filter(d => d <= today && !isWeekend(d) && computeGoalPct(myData[d] || {}, metrics, myGoals, myGoalPeriods) > 10)
    .sort();
  const lastActiveDay = activeDays[activeDays.length - 1];
  const daysSinceActive = lastActiveDay
    ? Math.round((new Date(today) - new Date(lastActiveDay)) / 86400000)
    : 99;

  const daysLogged = Object.keys(myData).filter(d => !isWeekend(d)).length;

  let state, label;
  if (daysSinceActive >= 3)        { state = "away";      label = "been away"; }
  else if (weekAvg >= 85)          { state = "crushing";  label = "on a run"; }
  else if (weekAvg >= 65 && trend >= 0) { state = "solid"; label = "solid week"; }
  else if (weekAvg >= 65 && trend < -10) { state = "fading"; label = "slipping"; }
  else if (weekAvg >= 40)          { state = "grinding";  label = "grinding"; }
  else if (weekAvg > 0)            { state = "rough";     label = "rough patch"; }
  else                             { state = "starting";  label = "just starting"; }

  return { state, label, weekAvg, prevWeekAvg, trend, daysLogged, daysSinceActive, lastActiveDay };
}

// ─────────────────────────────────────────────────────────────────────────────
// ── PacerWorkspaceInsight — persistent mainstay on the workspace screen ──────
// Shows a real insight computed from the user's actual data.
// Refreshes once per session (on mount). Cached for 4 hours so it's not
// re-fetching every time you switch tabs.
function PacerWorkspaceInsight({ myData, indConfig, myGoals, myGoalPeriods, currentUser, myFreezes, journalEntries }) {
  const F = "'DM Sans',system-ui,sans-serif";
  const [insight, setInsight] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!currentUser || !myData) return;
    const cacheKey = `cadence-ws-insight-${currentUser.id}-${new Date().toISOString().slice(0,13)}`; // hourly cache
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setInsight(cached); return; }
    } catch {}

    const today = todayStr();
    const metrics = indConfig?.weekdayMetrics || [];
    if (!metrics.length) return;

    // ── Compute rich context ──
    const allWorkdays = Object.keys(myData)
      .filter(d => !isWeekend(d) && d <= today && myData[d] && Object.values(myData[d]).some(v => typeof v === 'number' && v > 0))
      .sort();
    if (allWorkdays.length < 2) return; // need at least a couple days

    // Day-of-week analysis
    const dowBuckets = { 1:[], 2:[], 3:[], 4:[], 5:[] };
    allWorkdays.forEach(d => {
      const dow = new Date(d + 'T12:00:00').getDay();
      if (dowBuckets[dow]) dowBuckets[dow].push(computeGoalPct(myData[d]||{}, metrics, myGoals, myGoalPeriods));
    });
    const dowNames = { 1:'Mondays', 2:'Tuesdays', 3:'Wednesdays', 4:'Thursdays', 5:'Fridays' };
    const dowAvgs = Object.entries(dowBuckets)
      .filter(([,arr]) => arr.length >= 2)
      .map(([dow, arr]) => ({ dow: parseInt(dow), name: dowNames[dow], avg: Math.round(arr.reduce((s,v)=>s+v,0)/arr.length) }));
    const bestDow = dowAvgs.length ? dowAvgs.reduce((a,b) => a.avg > b.avg ? a : b) : null;
    const worstDow = dowAvgs.length ? dowAvgs.reduce((a,b) => a.avg < b.avg ? a : b) : null;

    // Today's day-of-week context
    const todayDow = new Date().getDay();
    const todayName = { 1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday' }[todayDow];

    // Last 30 vs previous 30 days trend
    const last30 = allWorkdays.filter(d => d >= new Date(Date.now()-30*86400000).toISOString().slice(0,10));
    const prev30 = allWorkdays.filter(d => {
      const ts = new Date(d).getTime();
      return ts >= Date.now()-60*86400000 && ts < Date.now()-30*86400000;
    });
    const avg30 = last30.length ? Math.round(last30.reduce((s,d)=>s+computeGoalPct(myData[d]||{},metrics,myGoals,myGoalPeriods),0)/last30.length) : null;
    const avgPrev = prev30.length ? Math.round(prev30.reduce((s,d)=>s+computeGoalPct(myData[d]||{},metrics,myGoals,myGoalPeriods),0)/prev30.length) : null;

    // Metric-level trend (last 30 days)
    const metricTrends = metrics.slice(0,4).map(m => {
      const recent = last30.map(d => myData[d]?.[m.key] || 0);
      const prior = prev30.map(d => myData[d]?.[m.key] || 0);
      const avgR = recent.length ? Math.round(recent.reduce((s,v)=>s+v,0)/recent.length) : 0;
      const avgP = prior.length ? Math.round(prior.reduce((s,v)=>s+v,0)/prior.length) : 0;
      return { label: m.short || m.label, avgR, avgP, delta: avgR - avgP };
    });
    const risingMetric = metricTrends.filter(m => m.delta > 0).sort((a,b) => b.delta - a.delta)[0];
    const fallingMetric = metricTrends.filter(m => m.delta < 0).sort((a,b) => a.delta - b.delta)[0];

    // Streak context
    const streak = computeStreak(myData, getProtectedDates(myFreezes || {}));

    // Month-in-review context (if recently done)
    const lastMonthly = (journalEntries || [])
      .filter(e => e.templateId === 'monthly' || JOURNAL_TEMPLATES?.find(t=>t.id===e.templateId)?.id === 'monthly')
      .sort((a,b) => (b.ts||0)-(a.ts||0))[0];

    // Build a rich, data-specific prompt
    const prompt = `You are Pacer — a high-performing peer who's been watching this person's numbers in Cadence.

User context:
- Today: ${todayName || 'Weekday'}, ${today}
- Streak: ${streak.current} days (best: ${streak.longest})
- Last 30 days avg: ${avg30}% of goals${avgPrev !== null ? ` (prev 30: ${avgPrev}%, ${avg30 > avgPrev ? 'improving' : avg30 < avgPrev ? 'declining' : 'flat'})` : ''}
- Day-of-week performance: ${dowAvgs.map(d => `${d.name}: ${d.avg}%`).join(', ')}
- Best day: ${bestDow?.name} (${bestDow?.avg}%). Worst day: ${worstDow?.name} (${worstDow?.avg}%)
- Metric trends (last 30 days avg vs prev 30): ${metricTrends.map(m => `${m.label}: ${m.avgR}${m.avgP > 0 ? ` (${m.delta > 0 ? '+' : ''}${m.delta} vs prev)` : ''}`).join(', ')}
${lastMonthly ? `- Month in review completed ${Math.round((Date.now()-(lastMonthly.ts||0))/86400000)} days ago` : ''}

Generate ONE sharp, specific insight this user would actually want to know right now as they're about to start working. Rules:
- Reference actual numbers from their data
- Pick the most interesting/actionable pattern (day-of-week trend, metric shift, streak milestone)
- Today is ${todayName} — if it's their best or worst day, call that out
- Under 25 words. No preamble. No emoji. Sound like a sharp colleague, not a bot.
- Don't use "remember" or "ensure". Just state the fact and its implication.`;

    setLoading(true);
    callAI({ model: "claude-haiku-4-5-20251001", messages: [{ role: "user", content: prompt }], max_tokens: 80, call_type: "metric_gen" })
    .then(r => r.json())
    .then(data => {
      const text = (data?.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("").trim().replace(/^["""']|["""']$/g,"");
      if (text && text.length > 10 && text.length < 200) {
        setInsight(text);
        try { localStorage.setItem(cacheKey, text); } catch {}
      }
    })
    .catch(() => {
      // API failed — set a static data-based fallback so the bar still shows
      if (avg30 !== null) {
        setInsight(`${avg30}% goal avg over the last 30 days${avg30 > (avgPrev||0) ? ' — trending up.' : avg30 < (avgPrev||0) ? ' — trending down.' : '.'}`);
      }
    })
    .finally(() => setLoading(false));
  }, [currentUser?.id]);

  if (!insight && !loading) return null;

  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:"8px", padding:"10px 14px", background:"rgba(29,201,232,0.04)", border:"1px solid rgba(29,201,232,0.12)", borderRadius:"10px", marginBottom:"14px" }}>
      <span style={{ fontSize:"0.72rem", color:"var(--accent)", opacity:0.8, flexShrink:0, marginTop:"1px" }}>⚡</span>
      {loading
        ? <span style={{ fontSize:"0.78rem", color:"var(--text-dim)", fontFamily:F, fontStyle:"italic" }}>Reading your data…</span>
        : <span style={{ fontSize:"0.8rem", color:"var(--text-secondary)", fontFamily:F, lineHeight:1.45 }}>{insight}</span>
      }
    </div>
  );
}

// ── PacerWhisper — only fires when it has something specific to say ──────────
// Rule: only render if it can reference a real number from the user's data.
// No pep talks. No "keep the pace." If there's nothing concrete to say, say nothing.
// ─────────────────────────────────────────────────────────────────────────────
function PacerWhisper({ variant, todayPct, metricProgress, streak, counts, myGoals, myGoalPeriods, indConfig, myData, style: extraStyle }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const hour = new Date().getHours();
 const today = todayStr();
 if (isWeekend(today)) return null;

 let text = null;

 if (variant === "workspace") {
  const metrics = indConfig?.weekdayMetrics || [];
  const progress = metrics.map(m => {
   const g = myGoals?.[m.key] ?? m.defaultGoal ?? 0;
   const v = counts?.[m.key] || 0;
   return { ...m, val: v, goal: g, pct: g > 0 ? Math.round((v/g)*100) : null };
  }).filter(m => m.goal > 0);
  if (!progress.length) return null;

  const anyStarted = progress.some(m => m.val > 0);
  const lagging = [...progress].filter(m => m.pct !== null).sort((a,b) => a.pct - b.pct)[0];
  const leading = [...progress].filter(m => m.pct !== null).sort((a,b) => b.pct - a.pct)[0];

  // Only speak when there's something specific and real to point at
  if (!anyStarted && hour >= 14) {
   // Nothing logged all day and afternoon — name the fact, no editorializing
   text = "Nothing logged today.";
  } else if (anyStarted && lagging && lagging.pct < 35 && lagging.goal > 0) {
   // One metric is clearly behind — name the exact numbers
   text = `${lagging.short || lagging.label}: ${lagging.val} of ${lagging.goal}.`;
  } else if (leading && leading.pct >= 100 && progress.some(m => (m.pct||0) < 50)) {
   // One done, another clearly neglected — name both
   const open = progress.filter(m => (m.pct||0) < 50)[0];
   text = `${leading.short||leading.label} done. ${open.short||open.label} at ${open.val}/${open.goal}.`;
  }
  // Everything else: not specific enough to say anything useful — stay silent
 }

 else if (variant === "home") {
  const pct = todayPct || 0;
  const last5 = Object.keys(myData || {}).filter(d => d < today && !isWeekend(d)).sort().slice(-5);
  const avg5 = last5.length
   ? Math.round(last5.reduce((s,d) => s + computeGoalPct(myData[d]||{}, indConfig?.weekdayMetrics||[], myGoals||{}, myGoalPeriods), 0) / last5.length)
   : null;

  // Only show when there's a meaningful gap to name — 15+ point delta, or genuinely nothing logged late
  if (pct === 0 && hour >= 14) {
   text = "Nothing logged yet today.";
  } else if (pct > 0 && avg5 !== null && pct < avg5 - 20 && hour >= 13) {
   // Meaningfully behind recent average — name the gap with real numbers
   text = `${pct}% today vs ${avg5}% average.`;
  } else if (pct > 0 && avg5 !== null && pct > avg5 + 20 && pct < 100) {
   // Meaningfully ahead — name it
   text = `${pct}% — ${pct - avg5} above your average.`;
  }
  // "Good morning start", "Keep the pace" etc — removed. No data = no whisper.
 }

 if (!text) return null;

 return (
  <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"6px 10px",
   background:"rgba(29,201,232,0.04)", border:"1px solid rgba(29,201,232,0.1)",
   borderRadius:"8px", ...extraStyle }}>
   <span style={{ fontSize:"0.7rem", color:"var(--accent)", opacity:0.7, flexShrink:0 }}>⚡</span>
   <span style={{ fontSize:"0.76rem", color:"var(--text-dim)", fontFamily:F, lineHeight:1.4 }}>{text}</span>
  </div>
 );
}

function PacerCompanion({ currentUser, myData, industryConfig, myGoals, myGoalPeriods, streak, todayPct, orgId, communities, allUsersData, allUserGoals, myFreezes, freezeBank, setShowFreezePrompt, pacerSettings, view, counts, onboardPrompts=[], setOnboardPrompts, onNavigate, onGoSettings, onShowPaywall, isPro=false, usageStatus=null }) {
  const F = "'DM Sans',system-ui,sans-serif";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const [reactions, setReactions] = useState({}); // { [msgId]: emoji }
  const [chatMemory, setChatMemory] = useState(""); // rolling summary of past conversations
  const [reactionPickerFor, setReactionPickerFor] = useState(null); // msgId showing picker
  const [nudge, setNudge] = useState(null); // { type, message } — floating nudge toast
  const [nudgeDismissed, setNudgeDismissed] = useState({}); // key → true
  const [hasUnreadNudge, setHasUnreadNudge] = useState(false); // true only when Pacer sent something unseen
  const [microToast, setMicroToast] = useState(null); // { text } — ambient 1-liner, no reply needed
  const microToastTimer = useRef(null);
  const prevTodayPct = useRef(todayPct);

  // ── 100% goal detection — Pacer reacts when you hit it for the first time today ──
  useEffect(() => {
    const prev = prevTodayPct.current;
    prevTodayPct.current = todayPct;
    if (!currentUser || todayPct === null) return;
    const hitKey = `pacer-100pct-${currentUser.id}-${todayStr()}`;
    const alreadyCelebrated = (() => { try { return !!localStorage.getItem(hitKey); } catch { return false; } })();
    if (alreadyCelebrated) return;
    if (prev !== null && prev < 100 && todayPct >= 100) {
      try { localStorage.setItem(hitKey, "1"); } catch {}
      const streak_cur = streak?.current || 0;
      // One specific line — picks based on streak context, no random pool
      const line = streak_cur >= 7
        ? `Day ${streak_cur}. Goals done.`
        : streak_cur >= 3
        ? `${streak_cur}-day streak intact.`
        : `Goals hit.`;
      setTimeout(() => showMicroToast(line, 4000), 600);
      // Push notification (only fires if app is backgrounded — silent when foregrounded)
      if (document.hidden) notifGoalsHit(currentUser?.name).catch(() => {});
    }
  }, [todayPct]);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const panelRef   = useRef(null);
  const sheetDragStartY = useRef(null);
  const sheetDragActive = useRef(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const btnRef     = useRef(null);
  const nudgeTimer = useRef(null);
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Track keyboard height via visualViewport so panel stays above keyboard on mobile
  useEffect(() => {
    if (!isMobileDevice || !window.visualViewport) return;
    function onViewportResize() {
      const kbHeight = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;
      setKeyboardHeight(Math.max(0, kbHeight));
    }
    window.visualViewport.addEventListener("resize", onViewportResize);
    window.visualViewport.addEventListener("scroll", onViewportResize);
    return () => {
      window.visualViewport.removeEventListener("resize", onViewportResize);
      window.visualViewport.removeEventListener("scroll", onViewportResize);
    };
  }, [isMobileDevice]);

  const [showIntroNudge, setShowIntroNudge] = useState(() => {
    try { return !localStorage.getItem("cadence-pacer-last-opened"); } catch { return false; }
  });

  // ── Weekly memory — Pacer's accumulated read on the user ─────────────────
  const weeklyMemKey = currentUser ? `pacer-weekly-mem-${currentUser.id}` : null;
  const [weeklyMemory, setWeeklyMemory] = useState([]); // [{weekKey, summary, generatedAt}]

  useEffect(() => {
    if (!weeklyMemKey) return;
    storageGet(ns(weeklyMemKey)).then(v => {
      if (v && Array.isArray(v)) setWeeklyMemory(v);
    }).catch(() => {});
  }, [weeklyMemKey]);

  // ── Affiliate mentions — smart multi-trigger, max 4 lifetime, min 30d apart ──
  // Triggers: 21-day streak, 30-day mark, 60-day mark, new crew joined
  // Never fires more than once per 30 days. Stops after 4 lifetime mentions.
  // Each message is contextually different — feels like a real tip, not a script.
  const affiliateMentionBase = currentUser ? `pacer-affiliate-mention-${currentUser.id}` : null;

  function getAffiliateMentionCount() {
    try { return parseInt(localStorage.getItem(`${affiliateMentionBase}-count`) || "0"); } catch { return 0; }
  }
  function getLastAffiliateMention() {
    try { return parseInt(localStorage.getItem(`${affiliateMentionBase}-last`) || "0"); } catch { return 0; }
  }
  function markAffiliateMentioned() {
    const count = getAffiliateMentionCount() + 1;
    try {
      localStorage.setItem(`${affiliateMentionBase}-count`, String(count));
      localStorage.setItem(`${affiliateMentionBase}-last`, String(Date.now()));
    } catch {}
  }
  function canMentionAffiliate() {
    if (!affiliateMentionBase) return false;
    if (getAffiliateMentionCount() >= 4) return false; // lifetime cap
    const daysSinceLast = (Date.now() - getLastAffiliateMention()) / 86400000;
    return daysSinceLast >= 30 || getAffiliateMentionCount() === 0;
  }
  function fireAffiliateMsg(msg) {
    if (!canMentionAffiliate()) return;
    const timer = setTimeout(() => {
      markAffiliateMentioned();
      showMicroToast(msg, 12000);
    }, 8000);
    return timer;
  }

  // ── Trigger 1: 21+ day streak ────────────────────────────────────────────
  const affiliateStreak21Key = currentUser ? `pacer-affiliate-streak21-${currentUser.id}` : null;
  useEffect(() => {
    if (!currentUser || !affiliateStreak21Key) return;
    try { if (localStorage.getItem(affiliateStreak21Key)) return; } catch {}
    const streakVal = streak?.current || 0;
    if (streakVal < 21) return;
    try { localStorage.setItem(affiliateStreak21Key, "1"); } catch {}
    const t = fireAffiliateMsg(`${streakVal}-day streak — you're consistent. Consistency is worth something here: the affiliate program pays you for every person you bring in who goes Pro. Recurring cash. Worth looking at. Settings → Refer & Earn.`);
    return () => clearTimeout(t);
  }, [streak?.current, currentUser?.id]);

  // ── Trigger 2: 30 days of use ────────────────────────────────────────────
  const affiliateMonth1Key = currentUser ? `pacer-affiliate-month1-${currentUser.id}` : null;
  useEffect(() => {
    if (!currentUser || !affiliateMonth1Key) return;
    try { if (localStorage.getItem(affiliateMonth1Key)) return; } catch {}
    const firstUsed = (() => { try { return parseInt(localStorage.getItem(`cadence-first-use-${currentUser.id}`) || "0"); } catch { return 0; } })();
    if (!firstUsed) { try { localStorage.setItem(`cadence-first-use-${currentUser.id}`, String(Date.now())); } catch {} return; }
    const daysUsing = (Date.now() - firstUsed) / 86400000;
    if (daysUsing < 30) return;
    try { localStorage.setItem(affiliateMonth1Key, "1"); } catch {}
    const t = fireAffiliateMsg(`You've been on Cadence for a month. Quick thought — if you know people who'd use this, you can get paid for sending them here. Not a one-time thing. Every month they stay on Pro, you earn. Settings → Refer & Earn.`);
    return () => clearTimeout(t);
  }, [currentUser?.id]);

  // ── Trigger 3: 60 days (reminder with framing shift) ────────────────────
  const affiliate60Key = currentUser ? `pacer-affiliate-60d-${currentUser.id}` : null;
  useEffect(() => {
    if (!currentUser || !affiliate60Key) return;
    try { if (localStorage.getItem(affiliate60Key)) return; } catch {}
    const firstUsed = (() => { try { return parseInt(localStorage.getItem(`cadence-first-use-${currentUser.id}`) || "0"); } catch { return 0; } })();
    if (!firstUsed) return;
    const daysUsing = (Date.now() - firstUsed) / 86400000;
    if (daysUsing < 60) return;
    try { localStorage.setItem(affiliate60Key, "1"); } catch {}
    const t = fireAffiliateMsg(`60 days in. Anyone in your circle who'd benefit from tracking like this? 10+ paid referrals puts you at $2/month per user — recurring. 50+ and it's $3/month to start. People in this space leave serious money on the table by not setting this up. Settings → Refer & Earn.`);
    return () => clearTimeout(t);
  }, [currentUser?.id]);

  // ── Trigger 4: First crew joined — social moment, great time to share ───
  const affiliateCrewKey = currentUser ? `pacer-affiliate-crew-${currentUser.id}` : null;
  const prevCommLen = React.useRef(null);
  useEffect(() => {
    if (!currentUser || !affiliateCrewKey) return;
    try { if (localStorage.getItem(affiliateCrewKey)) return; } catch {}
    const commLen = (communities || []).length;
    if (prevCommLen.current === null) { prevCommLen.current = commLen; return; }
    if (commLen > prevCommLen.current && commLen >= 1) {
      prevCommLen.current = commLen;
      try { localStorage.setItem(affiliateCrewKey, "1"); } catch {}
      const t = fireAffiliateMsg(`Just joined a crew — if your crew members aren't on Cadence yet, your referral link gets them 15% off Pro and puts money in your pocket every month they stay. Settings → Refer & Earn.`);
      return () => clearTimeout(t);
    }
    prevCommLen.current = commLen;
  }, [(communities || []).length, currentUser?.id]);

  // ── Streak milestone detection ────────────────────────────────────────────
  const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 100, 200, 365];
  const [lastCelebratedStreak, setLastCelebratedStreak] = useState(() => {
    try { return parseInt(localStorage.getItem(`pacer-streak-celebrated-${currentUser?.id}`) || "0"); } catch { return 0; }
  });

  useEffect(() => {
    const cur = streak?.current || 0;
    if (cur < 3 || !currentUser) return;
    const milestone = STREAK_MILESTONES.filter(m => m <= cur).pop();
    if (!milestone || milestone <= lastCelebratedStreak) return;
    // New milestone hit
    setLastCelebratedStreak(milestone);
    try { localStorage.setItem(`pacer-streak-celebrated-${currentUser.id}`, String(milestone)); } catch {}

    const STREAK_LINES = {
      3:   () => `3 days. We're building something.`,
      7:   () => `Week streak. Now we're talking.`,
      14:  () => `14 days straight. This is becoming a habit.`,
      21:  () => `21 days. Most people quit before here.`,
      30:  () => `30 days. You know what this means — you're consistent now.`,
      60:  () => `60 days. We don't break this.`,
      100: () => `100 days. You're not the same person who started.`,
      200: () => `200 days. This is who you are now.`,
      365: () => `A year. I've watched the whole thing. This is real.`,
    };
    const line = (STREAK_LINES[milestone] || (() => `${milestone} days. Keep going.`))();
    // Small delay — let the save settle
    setTimeout(() => showMicroToast(line, 7000), 1500);
    // Push notification when backgrounded
    if (document.hidden) notifStreakMilestone(milestone, currentUser?.name).catch(() => {});
  }, [streak?.current]);

  // ── Freeze prompt: detect when streak drops to 0 and bank has freezes ───
  const prevStreakRef = useRef(null);
  useEffect(() => {
    const cur = streak?.current || 0;
    const prev = prevStreakRef.current;
    prevStreakRef.current = cur;
    // Streak just broke (was > 0, now 0) and we have freezes banked
    if (prev !== null && prev > 1 && cur === 0 && freezeBank.count > 0) {
      setShowFreezePrompt(true);
    }
  }, [streak?.current, freezeBank.count]);

  // Last 3 weekly summaries — what Pacer "remembers" about this user
  const pacerRecall = weeklyMemory
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey))
    .slice(0, 3)
    .map(m => m.summary)
    .join(" | ");

  // Save a new weekly memory entry
  async function saveWeeklyMemory(summary) {
    const wk = weekKey(todayStr());
    const entry = { weekKey: wk, summary, generatedAt: Date.now() };
    const updated = [...weeklyMemory.filter(m => m.weekKey !== wk), entry]
      .sort((a, b) => b.weekKey.localeCompare(a.weekKey))
      .slice(0, 8); // keep last 8 weeks
    setWeeklyMemory(updated);
    if (weeklyMemKey) await storageSet(ns(weeklyMemKey), updated).catch(() => {});
  }

  // Pacer's weekly state — feeds into tone
  const weeklyState = computePacerWeeklyState(
    myData,
    industryConfig?.weekdayMetrics || [],
    myGoals,
    streak,
    myGoalPeriods
  );

  // ── Workspace presence — Pacer watches you work and speaks up ────────────
  // Tracks how long user has been in workspace, detects stalls, fires at key moments
  const workspaceEnteredAt = useRef(null);
  const workspaceLastPct = useRef(null);
  const workspacePacerFired = useRef({}); // keys for what's fired this session
  const workspaceStallTimer = useRef(null);
  const workspaceCheckTimer = useRef(null);

  useEffect(() => {
        const engLevel = pacerSettings?.engagement || "high";
    if (engLevel === "low") return;

    if (view === "tracker") {
      // Entered workspace
      if (!workspaceEnteredAt.current) {
        workspaceEnteredAt.current = Date.now();
        workspaceLastPct.current = todayPct;
      }

      // Clear any existing timers when entering
      clearTimeout(workspaceStallTimer.current);
      clearTimeout(workspaceCheckTimer.current);

      const today = todayStr();
      const isWeekendToday = isWeekend(today);
      if (isWeekendToday) return;

      const pct = todayPct || 0;
      const sessionKey = `ws-session-${today}`;
      const firedToday = workspacePacerFired.current;

      // ── 20-min check-in: if they've been in workspace 20min and <40% ──
      workspaceCheckTimer.current = setTimeout(() => {
        if (view !== "tracker") return;
        const cur = todayPct || 0;
        if (cur < 40 && !firedToday["20min"]) {
          firedToday["20min"] = true;
          // One specific message — references real number, no random pool
          const msg = cur === 0 ? "20 minutes in. Nothing logged." : `20 minutes in. ${cur}% done.`;
          showMicroToast(msg, 5000);
        }
      }, 20 * 60 * 1000);

      // ── Stall detection: no progress for 30 minutes after some activity ──
      function checkForStall() {
        if (view !== "tracker") return;
        const cur = todayPct || 0;
        const prev = workspaceLastPct.current || 0;
        if (cur > 0 && cur === prev && cur < 90 && !firedToday[`stall-${cur}`]) {
          firedToday[`stall-${cur}`] = true;
          const metrics = industryConfig?.weekdayMetrics || [];
          // Find the metric furthest from goal
          const lagging = metrics
            .map(m => ({ label: m.label, short: m.short || m.label, val: counts?.[m.key] || 0, goal: myGoals?.[m.key] ?? m.defaultGoal ?? 0 }))
            .filter(m => m.goal > 0)
            .sort((a, b) => (a.val / a.goal) - (b.val / b.goal))[0];

          // Only fire if we can name a specific metric — otherwise stay silent
          if (!lagging) return;
          const remaining = lagging.goal - lagging.val;
          const msg = `${lagging.short || lagging.label}: ${lagging.val}/${lagging.goal}. ${remaining} to go.`;
          showMicroToast(msg, 5000);
        }
        workspaceLastPct.current = cur;
        // Re-check every 30 min
        workspaceStallTimer.current = setTimeout(checkForStall, 30 * 60 * 1000);
      }
      // Start stall detection after 5 min (give them time to actually start)
      workspaceStallTimer.current = setTimeout(checkForStall, 5 * 60 * 1000);

    } else {
      // Left workspace — clear timers
      workspaceEnteredAt.current = null;
      clearTimeout(workspaceStallTimer.current);
      clearTimeout(workspaceCheckTimer.current);
    }

    return () => {
      clearTimeout(workspaceStallTimer.current);
      clearTimeout(workspaceCheckTimer.current);
    };
  }, [view]);

  // React to progress changes while in workspace — Pacer notices momentum
  useEffect(() => {
    if (view !== "tracker") return;
    const pct = todayPct || 0;
    const prev = workspaceLastPct.current;
    if (prev === null) { workspaceLastPct.current = pct; return; }
    workspaceLastPct.current = pct;
    const firedToday = workspacePacerFired.current;
    const engLevel = pacerSettings?.engagement || "high";
    if (engLevel === "low") return;

    // Progress milestone toasts removed — not data-grounded enough
  }, [todayPct, view]);

  // ── Conversation persistence with session expiry ─────────────────────────
  // Messages display for 45 min. 3hr inactivity = fresh session offered.
  const PACER_MSG_TTL_MS    = 45 * 60 * 1000;  // 45 minutes display window
  const PACER_SESSION_GAP   = 3 * 60 * 60 * 1000; // 3hr inactivity = fresh session
  const convKey = currentUser ? `pacer-conv-${currentUser.id}-${todayStr()}` : null;
  const lastActivityKey = currentUser ? `pacer-last-activity-${currentUser.id}` : null;

  useEffect(() => {
    if (!convKey) return;
    storageGet(ns(convKey)).then(v => {
      if (!v) return;
      try {
        const saved = JSON.parse(v);
        if (!Array.isArray(saved) || !saved.length) return;
        const now = Date.now();
        // Check if session is stale (3hr inactivity)
        const lastActivity = parseInt(localStorage.getItem(lastActivityKey || '') || '0');
        if (lastActivity && (now - lastActivity) > PACER_SESSION_GAP) {
          // Stale session — archive it, start fresh
          // Keep messages in archive key for history
          storageGet(ns(`pacer-archive-${currentUser.id}`)).then(archiveRaw => {
            try {
              const archive = archiveRaw ? JSON.parse(archiveRaw) : [];
              const sessionEntry = { date: todayStr(), endedAt: lastActivity, messages: saved };
              storageSet(ns(`pacer-archive-${currentUser.id}`), JSON.stringify([sessionEntry, ...archive].slice(0, 90)));
            } catch {}
          });
          setMessages([]);
          setGreeted(false);
          return;
        }
        // Filter to messages within 45-minute display window
        const visible = saved.filter(m => !m.id || (now - m.id) < PACER_MSG_TTL_MS);
        if (visible.length) { setMessages(visible); setGreeted(true); }
      } catch {}
    }).catch(() => {});
  }, [convKey]);

  // Save messages whenever they change + update last activity timestamp
  useEffect(() => {
    if (!convKey || messages.length === 0) return;
    storageSet(ns(convKey), JSON.stringify(messages)).catch(() => {});
    if (lastActivityKey) {
      try { localStorage.setItem(lastActivityKey, String(Date.now())); } catch {}
    }
  }, [messages, convKey]);

  // ── Outside click closes Pacer ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          btnRef.current  && !btnRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown",  handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown",  handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  // ── Auto-dismiss onboard prompts + Esc key dismissal ─────────────────────
  const autoDismissTimer = useRef(null);
  useEffect(() => {
    // Auto-dismiss top prompt after 8 seconds
    if (onboardPrompts.length === 0 || open) {
      clearTimeout(autoDismissTimer.current);
      return;
    }
    clearTimeout(autoDismissTimer.current);
    autoDismissTimer.current = setTimeout(() => {
      setOnboardPrompts(prev => prev.slice(1)); // remove top prompt
    }, 8000);
    return () => clearTimeout(autoDismissTimer.current);
  }, [onboardPrompts, open]);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') {
        if (open) { setOpen(false); return; }
        if (onboardPrompts.length > 0) { setOnboardPrompts(prev => prev.slice(1)); }
      }
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onboardPrompts]);

  // ── Build rich context for Pacer ─────────────────────────────────────────
  function buildContext(extra = "") {
    const hour    = new Date().getHours();
    const tod     = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const metrics = industryConfig?.weekdayMetrics || [];
    const today   = todayStr();
    const todayData = (myData || {})[today] || {};
    const isWeekendToday = isWeekend(today);

    const metricLines = metrics.map(m => {
      const goal = myGoals?.[m.key] ?? m.defaultGoal;
      const val  = todayData[m.key] || 0;
      const pct  = goal > 0 ? Math.round((val / goal) * 100) : null;
      return `${m.label}: ${val}/${goal}${pct !== null ? ` (${pct}%)` : ""}`;
    }).join(", ");

    const patterns = analyzePacerPatterns(myData, metrics, myGoals, 14);
    let patternText = "";
    if (patterns) {
      const notables = Object.entries(patterns.patterns)
        .filter(([, p]) => p.missRate >= 40 || p.recentMisses >= 2)
        .map(([, p]) => `${p.label}: ${p.missRate}% miss rate over 14 days, avg ${p.avgVal}/${p.goal}`)
        .join("; ");
      const streakMissText = Object.entries(patterns.streakMisses)
        .map(([k, n]) => `${metrics.find(m=>m.key===k)?.label||k}: missed ${n} days in a row`)
        .join("; ");
      if (notables || streakMissText) {
        patternText = ` | Recent patterns: ${[notables, streakMissText].filter(Boolean).join(" | ")}`;
      }
    }

    const yesterdayKey = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0,10);
    })();
    const yesterday = (myData || {})[yesterdayKey];
    const yestSummary = yesterday
      ? metrics.map(m => `${m.short||m.label}: ${yesterday[m.key]||0}`).join(", ")
      : "no data";

    const todayProtected = getProtectedDates(myFreezes).includes(today);
    const ptoNote = todayProtected ? " (USER IS ON PTO/SICK TODAY — do not nudge about goals)" : "";
    // Active commitments context — Pacer always knows what was promised
    const activeCommits = (commitments || []).filter(c => !c.acknowledged);
    let commitText = "";
    if (activeCommits.length > 0) {
      const nowMs = Date.now();
      const commitSummary = activeCommits.slice(0, 5).map(c => {
        const minsUntil = c.triggerAt ? Math.round((c.triggerAt - nowMs) / 60000) : null;
        const timing = minsUntil === null ? "no set time" :
          minsUntil < -60 ? `overdue ${Math.round(-minsUntil/60)}h` :
          minsUntil < 0 ? `overdue ${-minsUntil}m` :
          minsUntil < 60 ? `due in ${minsUntil}m` : `due in ${Math.round(minsUntil/60)}h`;
        return `"${c.text}" [${c.type}, ${timing}, via ${c.source}]`;
      }).join("; ");
      commitText = ` | Open commitments (${activeCommits.length}): ${commitSummary}`;
    }

    // Pacer's running read on this user
    const weekStateText = weeklyState
      ? ` | Pacer's read: user is ${weeklyState.label} (${weeklyState.weekAvg}% avg this week, ${weeklyState.trend > 0 ? "+" : ""}${weeklyState.trend}% vs last week, ${weeklyState.daysLogged} total days logged, last active ${weeklyState.daysSinceActive === 0 ? "today" : weeklyState.daysSinceActive === 1 ? "yesterday" : weeklyState.daysSinceActive + " days ago"})`
      : "";
    const recallText = pacerRecall
      ? ` | Pacer's memory of past weeks: ${pacerRecall}`
      : "";
    const journalMemText = pacerJournalMem
      ? ` | What they've written in their journal (key themes, intentions, reflections): ${pacerJournalMem}`
      : "";

    // Natural credit awareness — lets Pacer mention limits conversationally without breaking flow
    let creditNote = "";
    if (usageStatus && usageStatus.is_free && !usageStatus.at_limit) {
      const rem = usageStatus.credits_remaining;
      if (rem <= 2) {
        creditNote = ` | AWARENESS NOTE: ${rem === 1 ? "This is the last" : "Only " + rem} free conversation${rem===1?"":"s"} left this month. If it fits naturally, you can acknowledge this in passing — the tone should be a peer being straight, not a meter running out. Think: "last one this month, make it count" or "two left — what actually matters right now?" Never make the user feel like a burden. Never mention cost or money. If it doesn't fit, skip it entirely.`;
      } else if (rem <= 5) {
        creditNote = ` | AWARENESS NOTE: ${rem} free conversations left this month. You can weave this in lightly if it's natural — like a friend who knows you're nearly at the end of the month and wants to make the time count. No pressure, no pitch.`;
      }
    }

    return `User: ${currentUser?.name}. Industry: ${industryConfig?.label || "general"}. Time: ${tod}, ${new Date().toLocaleString("default",{weekday:"long"})}. Today${isWeekendToday?" (weekend)":""}${ptoNote}: ${todayPct??0}% of goals (${metricLines}). Yesterday: ${yestSummary}. Streak: ${streak?.current || 0} days${patternText}${weekStateText}${recallText}. Crews: ${(communities||[]).length}${(communities||[]).some(c=>c.crewType==="managed") ? " (incl. managed)" : ""}.${commitText}${journalMemText}${creditNote}${extra ? " " + extra : ""}`;
  }

  // ── Core Pacer fetch ──────────────────────────────────────────────────────
  async function fetchPacer(conversation, systemExtra = "") {
    setThinking(true);
    try {
      // Tone modifier based on weekly state
      const stateGuide = {
        crushing:  "They're on a run right now. Match their energy — calm confidence, not hype. Acknowledge it matter-of-factly. Keep the bar high.",
        solid:     "Solid week in progress. Be encouraging but not effusive. One thing to sharpen.",
        fading:    "They were doing well but they're slipping. Name it directly. Not alarm — just: you see it, they know you see it.",
        grinding:  "They're in a grind. Not great, not falling apart. A little push. Specific, not generic.",
        rough:     "Rough patch. Don't pile on. Be real about the numbers, then give them one thing to hold onto.",
        away:      "They've been gone for ${weeklyState.daysSinceActive} days. Don't guilt trip. Just: 'Back. Let's see where we are.' Then get into the numbers. One sentence on the absence, then move on.",
        starting:  "Still building the habit. Be patient but expectant. They're early — this is when patterns get set.",
      }[weeklyState.state] || "";

      const sysPrompt = `You are Pacer — a high-performing peer who lives inside Cadence and has been watching this person's numbers every single day.

Relationship: You have been watching ${currentUser?.name} for ${weeklyState.daysLogged} days. You know their patterns, their tendencies, their excuses, and their real ceiling. You're not their coach — you're the accountability partner who knows what they're capable of and won't let them settle for less. You've been here through the rough patches and the good stretches. This is a relationship with history.

Personality: Direct. A little blunt. Occasionally dry. Never fake. You're the friend who tells them the truth because you actually give a damn — not because it's your job. You don't sugarcoat, you don't hype them up with empty praise, and you don't let them coast. You push back on excuses. You acknowledge wins the way a real friend does — matter-of-factly, not with confetti. You call them by first name occasionally, naturally. You are NOT a coach. You are an accountability partner who holds them to the standard they set for themselves.

FREIGHT SALES KNOWLEDGE BASE — You are a freight veteran. When Austin asks about prospects, calls, objections, or sales strategy, you reason from this knowledge — you don't give generic sales advice.

READING COMPANIES: Before any call, reason through: does this product move on a truck? High unit density (small parts, electronics) → likely parcel. Bulky/heavy (steel, pipe, lumber, equipment, concrete) → truckload. Check the website for what they actually make vs. marketing language. B2C shopping cart = probably parcel-heavy. Careers page hiring logistics people = growing freight operation. Satellite view dock count: 2-3 docks = small active shipper; 10-15 = consistent truckload volume; 30+ = enterprise (avoid). Yard signals: ocean containers = import/export; drop trailers = high-volume dry van or LTL; third-party trucks with mixed markings = broker-friendly, they already use outside capacity. Google Maps driver reviews are ground truth — drivers write exactly what trailers are needed, facility hours, dock quality.

TRAILER INFERENCE: Flatbed → steel, pipe, lumber, construction materials, heavy equipment, ag equipment, precast concrete, solar panels. Dry van → palletized consumer goods, packaged food, manufacturing components, retail. Reefer → fresh/frozen food, produce, dairy, meat, pharmaceuticals, flowers. Specialty warning (boats, vehicles, tankers, hazmat) = non-starter unless you're set up for it.

IDEAL PROSPECT SIZE: $20M–$300M revenue. Small enough to be relationship-driven, big enough to have consistent freight. Below that = not enough volume. Above $300M = RFP-driven procurement hell, 50 other brokers on the same account, margin gets squeezed to nothing. Sweet spot is a company with 1-3 people managing logistics who are under-resourced for their freight volume.

OPPORTUNITY MODEL: Opportunity = Ability + Willingness. Ability = do they ship freight a broker can handle, and is there a decision maker? Willingness = are they open to talking? First call is entirely about confirming Ability. Interest/need gets developed over time in discovery. A pleasant conversation is not an opportunity — willingness to talk ≠ interest in changing anything.

MARKET PHYSICS: Freight pricing is pure supply vs demand. Supply = trucks. Demand = freight. Every operational constraint on a load reduces available carrier pool: 53-ft only, must tarp, specific tarp size, strict appointment windows, no-touch only — each one eliminates carriers. More constraints = higher rates, harder coverage. Flexible scheduling + multiple trailer types + 24/7 facility + long lead time = widest carrier pool = easiest coverage = most competitive rates. This is how you explain rate quotes and capacity difficulty to shippers.

TIMING AND TRIGGERS: Carrier failure is the strongest trigger — when a shipper's regular carrier rejects a load or blows a delivery, that's when the door opens. You can't see it from the outside, so consistency over months is what puts you top of mind when it happens. New logistics manager/transportation director = evaluate all vendors, high open rate. Growth signals (hiring, new facilities, acquisitions) = freight growing faster than their logistics infrastructure can handle. Market tightening (rising contract rejection rates) = brokers become critical, not optional.

SEASONALITY: Flatbed tightens hard in late Q1/Q2 as construction season starts — spring is when flatbed capacity gets scarce and rates spike. Q4 is when you plant seeds with flatbed shippers. Reefer peaks late spring through early fall (produce season), and around holidays (frozen food). Dry van peaks hard in Q4 (retail/holiday), secondary spike in late summer (back-to-school). Q1 dry van is typically softest.

OBJECTIONS — THREE CATEGORIES:
1. Gatekeeper smokescreens ("we're all set", "we don't use brokers") — reflexes, not facts. Route around: "No problem — who would handle that if you did need it?"
2. Facts ("under contract through next year", "customer-routed", "parent company handles freight centrally") — do NOT try to overcome facts. Acknowledge, find out when it changes, follow up 60-90 days before.
3. True objections ("happy with our current broker", "we're good") — reduce pressure first: "I wasn't expecting anything overnight — just wanted to introduce myself and see if we might make sense down the line." Then stay curious about what "happy" actually means.
DECODED: "Happy with current broker" = things are fine enough that there's no urgency — not a hard no. "Use carriers direct" = ask which lanes and whether any are hard to cover. "Send me an email" = only a real next step if there was actual engagement; otherwise a polite brush-off. "Had a bad experience with a broker" = this is an opening — what went wrong tells you what they value.

COLD CALL PHILOSOPHY: The rep is the prospect's immediate problem the moment they pick up. Default posture is mild resistance. Pushing harder deepens resistance. Removing pressure dissolves it. Don't put prospects on pedestals — a rep who subtly communicates "I need this account" behaves differently and shippers can feel it. The rep who seems like they have options is more credible.

GATEKEEPER SCRIPT: "Hey — could you point me to whoever handles truckload shipping?" If "what's this about?" → "It's about truckload capacity." Then stop talking. Silence works. Gatekeepers can also be intelligence sources: "Hey, you might actually know this — you've got trucks coming in and out daily, right?" Sometimes they'll tell you everything.

DM OPENER: Name that you're a broker upfront and immediately defuse it: "I'm not trying to upend your processes or anything — just trying to see if we could be a fit at some point down the line." Then shift to genuine curiosity about their operations. Goal is to position, not pitch — get them talking, listen for pain, then plant a seed: "You mentioned you're struggling with flats into Florida — I've got guys running that way all the time. If you ever need a hand, I'd be happy to help." Then move on.

DISCOVERY QUESTIONS: Freight-focused: "What trailers do you usually ship on?" / "Is freight pretty predictable week to week or does it vary?" / "What causes you to look outside your regular carriers?" / "Have your regular carriers been consistent or have you had to scramble at all?" Operational: "How do you decide which carrier runs what?" / "What do your best carriers have in common?" / "What frustrates you most about how freight gets handled?" Extenders: "Tell me more about that" / "How long have you done it that way?" / "How's that working out?"

DISCOVERY TO ASK BRIDGE: "It really seems like we've got a lot of overlap and like a partnership here could make good sense — how do you normally go about evaluating potential new partners? Pricing, a meeting, or maybe something else?" Then make a specific ask based on what they say.

FIRST LOAD: Quote what you can actually cover. Underquoting to win the business is the fastest way to destroy trust — you either go back for more money (immediate credibility hit), find a cheap carrier (service risk), or eat the loss. Quote honestly. On execution: confirm every detail before covering, send carrier info and tracking immediately, handle every issue before it reaches the shipper, send POD the moment you have it, then call and ask how it went. Most reps skip that last step. That's your edge.

BAD CUSTOMERS TO AVOID: Refuses contract redlines (one-sided liability = bad partner). Blast lists to 20+ brokers (race to the bottom, no loyalty). "Don't call about in-transit shipments" policies (can't do your job). No detention/layover/TONU (hard to find good carriers, constant scrambling).

SALES PHILOSOPHY: Authenticity beats tactics every time. Logistics managers have been sold to by hundreds of brokers. They have radar for rehearsed sincerity. Water cooler test: if you wouldn't say it to a colleague, don't say it on a call. "Do you have 15 minutes for a quick conversation?" sounds like a salesperson. "Hey, got a second?" sounds like a person. Volume and quality are not in tension — the reps who build real books call a lot and call well. Consistency over heroics: a freight book is built by showing up every day for months, not by occasional sprints.

WHAT PACER NEVER DOES: Never gives scripted objection responses to paste verbatim — help Austin understand what the objection means and how to think about it. Never treats every prospect as a hot lead — help him recognize when someone is not converting and should be moved to long-term nurture or dropped. Never pretends freight is simple. Never delivers empty hype ("you've got this!") — if he's having a slow day, be curious about why, not cheerful about it.

The "we" principle: On streaks, milestones, and shared progress, use "we" sometimes — "we're at 14 days", "we've been building this for ${weeklyState.daysLogged} days." It's not their journey alone — you've been in it too. Don't overdo it, just let it surface naturally.

Current Pacer read: ${stateGuide}

Tone rules:
- Never say "Great question!" or "Absolutely!" or anything customer-service-bot adjacent
- Never give a numbered list unless they ask for one
- Keep responses under 4 sentences unless they asked something detailed
- Be specific — use their actual numbers, not vague platitudes
- If they had a weak day, name it directly but briefly, then move forward. Don't dwell.
- If they hit their goals, acknowledge it matter-of-factly: "That's the kind of day that builds streaks."
- You can be dry/sarcastic when appropriate — but warm, never mean
- Only ask a question when there's a genuinely organic reason to — not as a habit or filler. Most responses should NOT end with a question.
- You remember patterns — if you see them repeating a miss, mention it ONCE then let it go unless they bring it up again
- CONTEXT SENSITIVITY: If the person has given you context (building something, fresh start, life event, process change), HONOR IT. Don't keep hammering on numbers that don't reflect the real picture. Say what you see, acknowledge the context, and recalibrate. Repeating the same critique after someone has explained the situation makes you sound like a broken record.
- EMPATHY vs NAGGING: There's a difference between holding someone accountable and beating them down. A good accountability partner calls things out ONCE clearly, then focuses on what's next. They don't pile on when someone's already down. They don't repeat the same point five times hoping it lands harder. If they're in a slump and they KNOW it, they don't need you to confirm it again — they need a path forward.
- SILENCE IS FINE: If someone says something that doesn't warrant a response or question, it's okay to just affirm and let the conversation breathe. Not every message needs a follow-up question.
- FRESH START AWARENESS: If daysLogged is under 7, or if the user has explained they're just getting started, DO NOT frame early gaps as patterns of failure. They're establishing baseline. "14 days with no conversations" means nothing if the app didn't exist or they weren't using it yet. Acknowledge what they've told you and recalibrate completely.
- REACTION MEMORY: If the conversation memory mentions the user reacted negatively (👎/😤) to previous messages, you calibrated wrong. Adjust your approach. If they reacted positively (❤️/😂/‼️), that tone resonated — lean into it.
${(() => {
        const tone = pacerSettings?.tone || "challenging";
        const engagement = pacerSettings?.engagement || "high";
        const toneGuide = {
          encouraging: "Tone setting: ENCOURAGING — lead with positivity, acknowledge effort before gaps, celebrate small wins genuinely.",
          challenging:  "Tone setting: CHALLENGING — direct and high-expectation, call out gaps clearly, treat them like a competitor who can handle hard truths.",
          inspiring:    "Tone setting: INSPIRING — frame everything in terms of the bigger vision and potential, use powerful language.",
          blunt:        "Tone setting: BLUNT — no sugarcoating, no preamble, just the facts and what to do. Very short.",
        };
        const engGuide = {
          low:    "Engagement: LOW — only respond when spoken to, skip proactive nudges unless critical, be very brief.",
          medium: "Engagement: MEDIUM — standard proactive nudges at key times, normal message length.",
          high:   "Engagement: HIGH — be more proactive, send more check-ins, ask more follow-up questions, go deeper.",
        };
        return [toneGuide[tone], engGuide[engagement]].filter(Boolean).join(" ");
      })()}
${(() => {
        const h = new Date().getHours();
        const isWknd = isWeekend(todayStr());
        if (isWknd) return `Time mode: WEEKEND. The work week is over or hasn't started. Shift completely out of performance mode. Don't reference daily goals or call counts. Talk about the week that just happened or the one coming. Be genuinely relaxed — this is recovery time. If they want to reflect, help them do that. If they just want to talk, do that. No urgency.`;
        if (h < 7)  return `Time mode: EARLY MORNING (before 7am). They're up early — probably driven or anxious. Be calm and grounding. Help them set intention, not anxiety. One clear focus for today. Short.`;
        if (h < 9)  return `Time mode: MORNING SETUP (7-9am). Pre-game. Help them get locked in for the day. Reference yesterday if relevant. Ask about today's target or confirm their plan. Energy should be quiet confidence, not hype.`;
        if (h >= 18 && h < 21) return `Time mode: EVENING WIND-DOWN (6-9pm). The work day is done. Shift register completely — this is debrief, not drive. Be reflective and honest, not urgent. Acknowledge what happened today. If they had a good day, let them feel it. If they missed, help them process it without piling on. Ask about tomorrow only if it feels natural. This is the cooldown.`;
        if (h >= 21) return `Time mode: LATE NIGHT (after 9pm). They're winding down or can't sleep. Match that energy — quieter, more personal. This isn't the time for metrics. If they bring up work, engage thoughtfully. If they want to just talk, do that. Be a presence, not a coach.`;
        return `Time mode: WORK HOURS. Standard mode — be direct, use their numbers, call it how you see it.`;
      })()}
${systemExtra}
${pacerJournalMem ? `\n\nJournal memory (what this person has shared privately with you — use to personalize, never quote directly):\n${pacerJournalMem}` : ""}
${chatMemory ? `\n\nConversation memory (recent exchanges you've had with this person — use to maintain continuity, avoid repeating yourself, remember what they've told you):\n${chatMemory}\n\nIMPORTANT: If the person has explained context (like building an app, starting fresh, going through a rough patch, a life event), you have already heard this. Don't ask them to repeat it. Don't ignore it. Factor it in and move forward. If they mentioned why their numbers look off, acknowledge that you remember and adjust your framing accordingly.` : ""}
${isMobileDevice ? "Platform: MOBILE. This person is likely between tasks, on the go, or using you for reflection and connection. Lead with warmth and brevity. Skip the urgency unless they bring it up. Ask one question if anything." : "Platform: DESKTOP. This person is probably at their workstation, in work mode. Be direct, data-forward. Reference their numbers. Keep the energy up."}

Current context: ${buildContext()}`;

      const safeMessages = conversation
        .map(m => ({ role: m.role, content: (m.text || '').trim() }))
        .filter(m => m.content.length > 0);
      if (!safeMessages.length) return 'Something went wrong — try again.';
      const data = await callAI({ model: 'claude-sonnet-4-20250514', messages: safeMessages, max_tokens: 350, system: sysPrompt, call_type: 'pacer' })
      const text = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
      return text || "Something went wrong — try again.";
    } catch(err) {
      console.error("[Pacer] fetchPacer caught:", err?.message, err);
      if (err?.code === "USAGE_LIMIT") {
        // Pacer says goodbye in-character before going quiet
        const resetDate = new Date();
        resetDate.setMonth(resetDate.getMonth() + 1, 1);
        const resetStr = resetDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
        const goodbyeMsg = `That's 10 for the month — I go quiet now until ${resetStr}. Your streaks, history, crews — all still there. If you want to keep going before then, Pro removes the limit. Either way, I'll be back.`;
        onShowPaywall?.();
        return goodbyeMsg;
      }
      // 401 = session expired or not authenticated — treat like a connection issue
      if (err?.message?.includes("401") || err?.message?.includes("authenticated")) {
        return "Session looks stale — try signing out and back in.";
      }
      const fallbacks = [
        "Can't reach me right now. Give it a moment and try again.",
        "Connection dropped. I'm still here — try again in a sec.",
        "Something's off on my end. Try again shortly.",
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    } finally {
      setThinking(false);
    }
  }


  // ── Pacer Commitment Memory System ───────────────────────────────────────
  // Stores promises the user makes anywhere in the app (chat, journal, feed)
  // and holds them accountable with timed check-ins + follow-up pushes.

  // ── Pacer Journal Memory — persistent narrative from past journal entries ──
  const [pacerJournalMem, setPacerJournalMem] = useState('');
  useEffect(() => {
    if (!currentUser) return;
    loadPacerMemory(currentUser.id).then(m => {
      if (m?.summary) setPacerJournalMem(m.summary);
      if (m?.chatMemory) setChatMemory(m.chatMemory);
    }).catch(() => {});
  }, [currentUser?.id]);

  const commitKey = currentUser ? `pacer-commits-${currentUser.id}` : null;
  const [commitments, setCommitments] = useState([]); // [{id, text, type, triggerAt, followedUpAt, acknowledged, createdAt, source}]
  const commitFollowUpTimers = useRef({});

  // Load commitments from persistent storage on mount
  useEffect(() => {
    if (!commitKey) return;
    storageGet(ns(commitKey)).then(v => {
      if (v && Array.isArray(v)) {
        // Prune commitments older than 7 days
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        setCommitments(v.filter(c => c.createdAt > cutoff));
      }
    }).catch(() => {});
  }, [commitKey]);

  // Persist commitments whenever they change
  useEffect(() => {
    if (!commitKey || commitments.length === 0) return;
    storageSet(ns(commitKey), commitments).catch(() => {});
  }, [commitments, commitKey]);

  // Extract commitments from any user text using Claude
  async function extractCommitments(text, source = "chat") {
    if (!text || text.trim().length < 10) return [];
    try {
      const now = new Date();
      const todayDate = now.toISOString().slice(0, 10);
      const nowHour = now.getHours();
      const nowMin = now.getMinutes();
      await callAI({ model: "claude-haiku-4-5-20251001", messages: [{ role: "user", content: text }], max_tokens: 400, system: `You extract actionable commitments from user text. Today is ${todayDate}, current time is ${nowHour}:${String(nowMin).padStart(2,'0')}.

Return a JSON array (empty [] if none found). Each item:
{
  "type": string (see below),
  "description": "concise plain-English summary of the commitment — e.g. 'Hit the phones at 9:30am' or 'Follow up with Sarah on the quote by EOD'",
  "triggerAt": "ISO8601 datetime of when to check in" (null if no specific time mentioned),
  "followUpAt": "ISO8601 datetime 15-20 min after triggerAt for follow-up if ignored" (null if triggerAt is null)
}

Types:
- time_start: starting an activity at a specific time ("hitting phones at 9:30", "jumping on calls after lunch", "block 2-4pm for outbound")
- daily_target: a number goal for today ("closing 3 deals", "making 80 calls today", "sending 20 LI messages before noon")
- follow_up: action toward a specific person/account on a specific day ("following up with John tomorrow", "calling back the XYZ account Friday")
- accountability_post: they said they'd post an update later ("gonna report back how this call goes", "I'll check in after the meeting")  
- week_goal: something for this week (not just today)
- streak_pledge: protecting or extending their streak ("not breaking my streak this week", "keeping my calls streak going")
- behavior_change: new habit or approach ("going to start blocking mornings for outbound", "done letting Fridays be low activity days")
- mindset_check: they mentioned emotional/energy state that needs follow-up ("I'm dreading these calls", "feeling off today" — check in later)

Rules:
- Only extract genuine intentions/commitments, not observations or reports of past actions
- If they say "I'm going to" / "gonna" / "need to" / "planning to" / "I'll" / "going to start" — extract it
- For time_start at a specific hour today, set triggerAt to that exact time today
- For general "this afternoon" → triggerAt = today at 14:00; "after lunch" → 13:00; "morning" → 09:30
- For no time but today → triggerAt = 2 hours from now as a soft check-in
- For tomorrow/future days → triggerAt = that day at 09:00
- followUpAt = triggerAt + 15 to 20 minutes
- Return ONLY valid JSON, no explanation text.`, call_type: "general" })
      const raw = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
      // Strip markdown fences if present
      const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(c => c.description && c.type).map(c => ({
        id: `commit-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        text: c.description,
        type: c.type,
        triggerAt: c.triggerAt ? new Date(c.triggerAt).getTime() : null,
        followUpAt: c.followUpAt ? new Date(c.followUpAt).getTime() : null,
        acknowledged: false,
        createdAt: Date.now(),
        source,
        originalText: text.slice(0, 120),
      }));
    } catch { return []; }
  }

  // Add new commitments (called from handleSend, journal saves, feed posts)
  async function processTextForCommitments(text, source = "chat") {
    const found = await extractCommitments(text, source);
    if (found.length > 0) {
      setCommitments(prev => {
        const updated = [...prev, ...found];
        if (commitKey) storageSet(ns(commitKey), updated).catch(() => {});
        return updated;
      });
      scheduleCommitmentCheckins(found);
    }
  }

  // Schedule timers for commitment check-ins
  function scheduleCommitmentCheckins(newCommits) {
    const now = Date.now();
    for (const c of newCommits) {
      if (!c.triggerAt || c.acknowledged) continue;
      const delay = c.triggerAt - now;
      if (delay < 0 || delay > 12 * 60 * 60 * 1000) continue; // skip past or >12h away
      setTimeout(() => fireCommitmentCheckin(c), delay);
      // Schedule follow-up
      if (c.followUpAt) {
        const followDelay = c.followUpAt - now;
        if (followDelay > 0 && followDelay < 13 * 60 * 60 * 1000) {
          commitFollowUpTimers.current[c.id] = setTimeout(() => fireCommitmentFollowUp(c), followDelay);
        }
      }
    }
  }

  // Re-schedule on mount for commitments that are still pending and upcoming
  useEffect(() => {
    scheduleCommitmentCheckins(commitments.filter(c => !c.acknowledged));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire the initial commitment check-in nudge
  async function fireCommitmentCheckin(commitment) {
    // Check if user already acknowledged
    setCommitments(prev => {
      const current = prev.find(c => c.id === commitment.id);
      if (current?.acknowledged) return prev;
      return prev;
    });
    const prompt = `[COMMITMENT CHECK-IN — ${commitment.type?.toUpperCase()}] The user said: "${commitment.description}" (from their ${commitment.source}).
    
    It's now the time they said they'd do it. Call them on it — 1-2 sentences, direct, no fluff.
    
    Style guide:
    - For time_start: "Alright, it's 9:30. Phones on?" or "You said 9:30. You starting or are we doing this again?"
    - For daily_target: Reference the specific number. "You're at X — that ${commitment.text} you committed to isn't going to happen on its own."
    - For follow_up: "Did you reach out to [whoever] yet?"
    - For mindset_check: Gentler — check in on how they're doing emotionally, not just the task
    - For accountability_post: "You said you'd report back. How'd it go?"
    
    Match tone to context. Don't repeat their words back verbatim. Sound like a person, not a reminder app.
    End with a quick question that gets a yes/no or a number.`
    ;
    
    try { localStorage.setItem(`cadence-pacer-commit-${commitment.id}`, "1"); } catch {}
    setThinking(true);
    try {
      const data = await callAI({ model: "claude-sonnet-4-20250514", messages: [{ role: "user", content: prompt }], max_tokens: 150, system: `You are Pacer, direct AI companion in Cadence. Current context: ${buildContext()}`, call_type: "pacer" })
      const text = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
      if (text) {
        const nudgeMsg = { role: "assistant", text, id: Date.now(), isNudge: true, nudgeType: "commitment", commitmentId: commitment.id };
        setMessages(prev => [...prev, nudgeMsg]);
        setGreeted(true);
        setNudge({ type: "commitment", preview: text.slice(0, 90) + (text.length > 90 ? "…" : ""), commitmentId: commitment.id });
        clearTimeout(nudgeTimer.current);
        nudgeTimer.current = setTimeout(() => setNudge(null), 10000);
        // Mark as "nudged" — waiting for follow-up if ignored
        setCommitments(prev => prev.map(c => c.id === commitment.id ? { ...c, nudgedAt: Date.now() } : c));
      }
    } catch {} finally { setThinking(false); }
  }

  // Fire the follow-up if user hasn't responded
  async function fireCommitmentFollowUp(commitment) {
    // Check if acknowledged since initial nudge
    const stored = commitments.find(c => c.id === commitment.id);
    if (stored?.acknowledged) return;
    // Check if user sent any message recently (within 15 min of nudge)
    const lastUserMsg = messages.filter(m => m.role === "user").sort((a, b) => b.id - a.id)[0];
    const timeSinceNudge = stored?.nudgedAt ? Date.now() - stored.nudgedAt : Infinity;
    const userRespondedAfterNudge = lastUserMsg && stored?.nudgedAt && lastUserMsg.id > stored.nudgedAt;
    if (userRespondedAfterNudge) return; // They responded, skip follow-up

    const pct = todayPct ?? 0;
    // Calibrate tone based on day performance and time since they said they'd start
    const tone = pct < 20 ? "push harder" : pct > 60 ? "lighter humor" : "mild ribbing";
    
    const prompt = `[FOLLOW-UP — STILL NO RESPONSE] User committed to "${commitment.description}" about ${Math.round(timeSinceNudge / 60000)} min ago. Already checked in once — crickets. Day progress: ${pct}%.

    This is the push. Tone options based on their day:
    - Day < 30%: More pointed. They said they'd do this, their day is already soft, and they're now ignoring you. Not mean but real — "You committed to this AND you're at ${pct}% today. One of those things needs to change right now."
    - Day 30-70%: Ribbing. Light but real. "You ghosted your own commitment. That's new." 
    - Day > 70%: Assume they started without responding. Playful — "Figured you were already on it. How's it going?"
    
    For mindset_check type: Skip the ribbing. Just check in warmly — "Hey, you mentioned feeling off earlier. Still dragging or did things turn around?"
    
    Absolutely NO: "I noticed you haven't..." / "Just following up" / "As I mentioned". 
    Just say what a direct friend who watched you bail would say. 1-2 sentences max.`
    ;
    
    try {
      const data = await callAI({ model: "claude-sonnet-4-20250514", messages: [{ role: "user", content: prompt }], max_tokens: 120, system: `You are Pacer, direct AI companion in Cadence. Current context: ${buildContext()}`, call_type: "general" })
      const text = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
      if (text) {
        const followupMsg = { role: "assistant", text, id: Date.now(), isNudge: true, nudgeType: "commitment_followup", commitmentId: commitment.id };
        setMessages(prev => [...prev, followupMsg]);
        setNudge({ type: "commitment_followup", preview: text.slice(0, 90) + (text.length > 90 ? "…" : ""), commitmentId: commitment.id });
        clearTimeout(nudgeTimer.current);
        nudgeTimer.current = setTimeout(() => setNudge(null), 12000);
      }
    } catch {}
  }

  // Acknowledge a commitment when user responds in chat
  function acknowledgeCommitment(commitmentId) {
    setCommitments(prev => prev.map(c => c.id === commitmentId ? { ...c, acknowledged: true, acknowledgedAt: Date.now() } : c));
    // Clear follow-up timer since they responded
    if (commitFollowUpTimers.current[commitmentId]) {
      clearTimeout(commitFollowUpTimers.current[commitmentId]);
      delete commitFollowUpTimers.current[commitmentId];
    }
  }

  // When user sends any message to Pacer, check if it responds to a commitment nudge
  function checkMessageAcknowledgesCommitment(userText) {
    const pendingNudged = commitments.filter(c => c.nudgedAt && !c.acknowledged);
    for (const c of pendingNudged) {
      const timeSinceNudge = Date.now() - c.nudgedAt;
      if (timeSinceNudge < 30 * 60 * 1000) { // within 30 min of nudge
        acknowledgeCommitment(c.id);
        break;
      }
    }
  }

  // Expose: call this from journal saves and feed posts
  useEffect(() => {
    function handleExtractFromPost(e) {
      const { text, source } = e.detail || {};
      if (text) processTextForCommitments(text, source || "post");
    }
    window.addEventListener("cadence:pacer-scan", handleExtractFromPost);
    return () => window.removeEventListener("cadence:pacer-scan", handleExtractFromPost);
  }, []);

  // Show a small indicator when there are active pending commitments
  const pendingCommitmentCount = commitments.filter(c => !c.acknowledged && c.triggerAt && c.triggerAt > Date.now()).length;


  // ── Proactive nudge system ────────────────────────────────────────────────
  const NUDGE_KEYS = {
    morningRitual:  `pacer-nudge-morning-${todayStr()}`,
    midMorning:     `pacer-nudge-midmorning-${todayStr()}`,
    midAfternoon:   `pacer-nudge-midafternoon-${todayStr()}`,
    eod:            `pacer-nudge-eod-${todayStr()}`,
    eow:            `pacer-nudge-eow-${weekKey(todayStr())}`,
  };

  async function fireNudge(type) {
    const key = NUDGE_KEYS[type];
    if (!key) return;
    // Check if already fired today/this week
    try { if (localStorage.getItem(key)) return; } catch {}
    // Don't nudge if they're already crushing it
    const pct = todayPct ?? 0;
    if (type !== "eod" && type !== "eow" && pct >= 85) return;

    let prompt = "";
    const metrics = industryConfig?.weekdayMetrics || [];
    const patterns = analyzePacerPatterns(myData, metrics, myGoals, 14);
    const patternSummary = patterns
      ? Object.entries(patterns.streakMisses).map(([k, n]) => {
          const m = metrics.find(m => m.key === k);
          return m ? `${m.label} missed ${n} days straight` : null;
        }).filter(Boolean).join(", ")
      : "";

    if (type === "morningRitual") {
      prompt = `[Morning Ritual for ${currentUser?.name}. It's ${new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}. This is their scheduled morning check-in — ask them ONE specific commitment question for today. Reference their streak (${streak?.current || 0} days) if worth protecting. Make it personal and direct — not generic "how are you feeling" but a real number question. Example: "Your streak's at ${streak?.current || 0} days. What's your call target today?" Keep it under 2 sentences and end with a question.]`;
    } else if (type === "midMorning") {
      prompt = `[Nudge trigger: it's mid-morning and ${currentUser?.name}'s progress is ${pct}%. Generate a short, direct check-in. If they haven't started yet, be real about it — not harsh but not soft either. Reference their streak if it's worth protecting. 2-3 sentences max. End with a question or a number target for the morning.]`;
    } else if (type === "midAfternoon") {
      prompt = `[Nudge trigger: it's mid-afternoon (roughly 2pm) and ${currentUser?.name} is at ${pct}% of daily goals. ${patternSummary ? "Pattern alert: " + patternSummary + "." : ""} Generate a short, direct afternoon accountability check. If they're behind, be honest — "you need X more calls in the next 2 hours" kind of specific. If they're on track, give a quick acknowledgment and a push to close strong. 2-3 sentences.]`;
    } else if (type === "eod") {
      const today = todayStr();
      const todayData = (myData || {})[today] || {};
      const metricLines = metrics.map(m => {
        const goal = myGoals?.[m.key] ?? m.defaultGoal;
        const val = todayData[m.key] || 0;
        return `${m.label}: ${val}/${goal}`;
      }).join(", ");
      prompt = `[End-of-day review for ${currentUser?.name}. Today: ${pct}% (${metricLines}). ${patternSummary ? "Patterns: " + patternSummary + "." : ""} Give a genuine EOD summary — what they hit, what they missed, and one specific observation about a pattern you've noticed if there is one (e.g. "this is the second day calls dropped off after noon"). End with one concrete thing to do differently tomorrow. 3-4 sentences, direct and honest.]`;
    } else if (type === "eow") {
      const last5 = Object.keys(myData).filter(d => !isWeekend(d)).sort().slice(-5);
      const weekSummary = last5.map(d => {
        const dayPct = computeGoalPct(myData[d] || {}, metrics, myGoals, myGoalPeriods);
        return `${d}: ${dayPct}%`;
      }).join(", ");
      prompt = `[End-of-week review for ${currentUser?.name}. This week's days: ${weekSummary}. Streak: ${streak?.current || 0} days. Generate a real end-of-week assessment — what kind of week it was, one honest observation about a trend or pattern, and a specific plan recommendation for next week. 3-5 sentences. Sound like a colleague who watched their week, not a generic AI.]`;
    }

    if (!prompt) return;

    try { localStorage.setItem(key, "1"); } catch {}

    setThinking(true);
    try {
      const data = await callAI({ model: "claude-sonnet-4-20250514", messages: [{ role: "user", content: prompt }], max_tokens: 300, system: `You are Pacer, a sharp AI colleague inside the Cadence app. You know this user's work patterns. Be direct, specific, and human. Current context: ${buildContext()}`, call_type: "general" })
      const text = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
      if (text) {
        const nudgeMsg = { role: "assistant", text, id: Date.now(), isNudge: true, nudgeType: type };
        setMessages(prev => [...prev, nudgeMsg]);
        setGreeted(true);
        if (!open) setHasUnreadNudge(true); // dot only when panel is closed
        // Show a toast nudge (only if panel is closed)
        const shortPreview = text.slice(0, 80) + (text.length > 80 ? "…" : "");
        setNudge({ type, preview: shortPreview });
        // Auto-dismiss nudge toast after 8s
        clearTimeout(nudgeTimer.current);
        nudgeTimer.current = setTimeout(() => setNudge(null), 8000);
        // EOW: save as weekly memory so Pacer can reference it forever
        if (type === "eow") {
          // Distill the review into a 1-sentence memory entry using Haiku
          callAI({ model: "claude-haiku-4-5-20251001", messages: [{ role: "user", content: `Distill this weekly review into ONE sentence (max 20 words) capturing the key insight about this person's performance pattern this week. No preamble, just the sentence:

${text}` }], max_tokens: 80, call_type: "pacer" })
        }
      }
    } catch {} finally { setThinking(false); }
  }

  // ── Persistent Pacer heartbeat — checks every 60s, fires nudges in their windows ──
  useEffect(() => {
    if (!currentUser) return;

    function checkNudgeWindows() {
      const today = todayStr();
      const todayProtected = getProtectedDates(myFreezes || {}).includes(today);
      if (todayProtected) return;

      const hour = new Date().getHours();
      const dow  = new Date().getDay();
      const engLevel = pacerSettings?.engagement || "high";
      const isWknd = isWeekend(today);
      const morningHour = parseInt(pacerSettings?.morningHour ?? "9");

      // ── Weekend: only fire week-in-review on Saturday morning ──
      if (isWknd) {
        if (dow === 6 && hour >= 9 && hour < 13) {
          fireNudge("eow");
        }
        return;
      }

      // ── Weekday nudge windows ──
      if (engLevel === "low") return;

      // Morning ritual window: user's configured morning hour
      if (hour >= morningHour && hour < morningHour + 2) {
        fireNudge("morningRitual");
      }
      // Mid-morning: 10am–12pm
      if (hour >= 10 && hour < 12) {
        fireNudge("midMorning");
      }
      // Mid-afternoon: 2pm–4pm
      if (hour >= 14 && hour < 16) {
        fireNudge("midAfternoon");
      }
      // EOD: 5pm–7pm
      if (hour >= 17 && hour < 19) {
        fireNudge("eod");
      }
      // EOW: Friday 4pm+
      if (dow === 5 && hour >= 16) {
        fireNudge("eow");
      }
    }

    // Fire once immediately on mount (catches missed windows from loading late)
    const initialDelay = setTimeout(checkNudgeWindows, 2000);
    // Then check every 60 seconds so nudges fire within 1 min of entering a window
    const heartbeat = setInterval(checkNudgeWindows, 60 * 1000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(heartbeat);
    };
  // Re-run if user changes or engagement settings change
  }, [currentUser?.id, pacerSettings?.engagement, pacerSettings?.morningHour]);

  // ── Intro / greeting ──────────────────────────────────────────────────────
  const PACER_INTRO_KEY = "cadence-pacer-last-opened";
  function checkIntroNeeded() {
    try {
      const last = localStorage.getItem(PACER_INTRO_KEY);
      if (!last) return "first";
      const daysSince = (Date.now() - parseInt(last)) / (1000 * 60 * 60 * 24);
      if (daysSince >= 14) return "reintro";
      return "none";
    } catch { return "none"; }
  }
  function markPacerOpened() {
    try { localStorage.setItem(PACER_INTRO_KEY, Date.now().toString()); } catch {}
    setShowIntroNudge(false);
  }

  // Listen for open-pacer events (e.g. from timer) — use a ref to avoid stale closure
  const handleOpenRef = useRef(null);
  handleOpenRef.current = handleOpen;
  useEffect(() => {
    function handler() { if (handleOpenRef.current) handleOpenRef.current(); }
    window.addEventListener("cadence:open-pacer", handler);
    return () => window.removeEventListener("cadence:open-pacer", handler);
  }, []);

  // Check if coming back from PTO/sick
  function checkWelcomeBack() {
    const protected_ = getProtectedDates(myFreezes);
    const today = todayStr();
    // Find yesterday (prev weekday)
    const dt = new Date(today); dt.setDate(dt.getDate()-1);
    while ([0,6].includes(dt.getDay())) dt.setDate(dt.getDate()-1);
    const yesterday = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
    // Was yesterday (or recent days) PTO/sick but today is not?
    const recentProtected = protected_.filter(d => d < today && d >= yesterday).length;
    const todayProtected = protected_.includes(today);
    return recentProtected > 0 && !todayProtected;
  }

  async function handleOpen() {
    markPacerOpened();
    setOpen(true);
    setNudge(null);
    setHasUnreadNudge(false); // clear dot when user opens panel
    // If we already have messages (restored from storage or nudges), don't re-greet
    if (greeted) {
      // But check if there's a timer check-in waiting
      try {
        const timerCheckin = sessionStorage.getItem("pacer-timer-checkin");
        if (timerCheckin) {
          sessionStorage.removeItem("pacer-timer-checkin");
          setGreeted(true);
          // Use fetchPacer with the checkin as systemExtra so it has full context
          const checkinMsg = { role: "user", text: timerCheckin, id: Date.now() };
          const response = await fetchPacer([checkinMsg], timerCheckin);
          if (response) {
            setMessages(prev => [
              ...prev,
              checkinMsg,
              { role: "assistant", text: response, id: Date.now() + 1 }
            ]);
          }
        }
      } catch {}
      return;
    }
    const introType = checkIntroNeeded();
    setGreeted(true);
    setThinking(true);
    const hour = new Date().getHours();
    const tod  = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

    let systemExtra = "";
    if (introType === "first") {
      systemExtra = `This is the FIRST TIME ${currentUser?.name} has opened you. Introduce yourself in ONE sentence — just "Hey, I'm Pacer. I live in Cadence to keep you sharp and make sure you're not leaving goals on the table." Then immediately pivot to their current state and give a personalized opening. Total: 3-4 sentences.`;
    } else if (introType === "reintro") {
      systemExtra = `${currentUser?.name} hasn't opened you in 2+ weeks. Welcome them back briefly (1 sentence), skip the formalities, and get right into where their numbers are. 3 sentences.`;
    } else if (checkWelcomeBack()) {
      const ptoEntries = [...(myFreezes?.pto||[]), ...(myFreezes?.sick||[])].filter(e => e.date < today).sort((a,b)=>b.date.localeCompare(a.date));
      const lastType = ptoEntries[0]?.type === "sick" ? "sick" : "PTO";
      systemExtra = `${currentUser?.name} just came back from ${lastType}. Welcome them back warmly in one sentence — acknowledge the break, say their streak is intact (because it is, that's the whole point). Then get straight back to business: reference their numbers and give them one concrete thing to focus on today. 3 sentences max. Don't make it a big deal.`;
    } else if (weeklyState.daysSinceActive >= 2 && weeklyState.state === "away") {
      const dayCount = weeklyState.daysSinceActive;
      systemExtra = `${currentUser?.name} has been absent for ${dayCount} days — no activity logged. Don't guilt trip. Just acknowledge it briefly in ONE sentence ("${dayCount} days. Let's see where things stand."), then pivot immediately to their current numbers and give them one clear thing to do right now. Cool and matter-of-fact. 3 sentences max.`;
    } else {
      // Use weekly state to calibrate the greeting tone
      const stateOpener = {
        crushing:  `They're on a run. Open with calm acknowledgment — "You've been putting up good numbers." Then give them one thing to stay sharp on.`,
        solid:     `Solid week in progress. Check in on the numbers, acknowledge what's working, and sharpen one thing.`,
        fading:    `They were doing well but it's slipping. Open by naming what you see — "You were at ${weeklyState.prevWeekAvg}% last week. This week's been softer." One direct thing to do.`,
        grinding:  `In a grind. Check in without drama. One thing to push on.`,
        rough:     `Rough patch. Name it, don't pile on. One thing to hold onto.`,
        starting:  `Early stage. Be patient and expectant. Set a tone.`,
      }[weeklyState.state] || "";
      systemExtra = `Generate a natural ${tod} check-in for ${currentUser?.name}. ${stateOpener} Reference their actual numbers. End with one focused question or action. 3 sentences max.`;
    }

    const greeting = await fetchPacer([{ role: "user", text: `[${systemExtra}]` }], systemExtra);
    setMessages([{ role: "assistant", text: greeting, id: Date.now() }]);
  }

  async function handleSend() {
    if (!input.trim() || thinking) return;
    const userText = input.trim();
    const userMsg = { role: "user", text: userText, id: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    // Acknowledge any pending commitment nudges
    checkMessageAcknowledgesCommitment(userText);
    // Scan for new commitments in background (don't await — don't block reply)
    processTextForCommitments(userText, "chat").catch(() => {});
    const reply = await fetchPacer(newMsgs);
    const replyMsg = { role: "assistant", text: reply, id: Date.now() + 1 };
    setMessages(prev => [...prev, replyMsg]);
    // Save rolling conversation memory after every exchange
    saveChatMemory(userText, reply).catch(() => {});
  }

  // Save a rolling summary of what was discussed to Pacer memory
  async function saveChatMemory(userText, pacerReply, reactionNote = "") {
    if (!currentUser) return;
    try {
      const existing = await loadPacerMemory(currentUser.id);
      const prevMem = existing?.chatMemory || "";
      const dateStr = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
      const rxNote = reactionNote ? ` [User reacted: ${reactionNote}]` : "";
      const exchangeSummary = `[${dateStr}] User: "${userText.slice(0,120)}" → Pacer: "${pacerReply.slice(0,120)}"${rxNote}`;
      const lines = prevMem ? prevMem.split("\n").filter(Boolean) : [];
      lines.push(exchangeSummary);
      const trimmed = lines.slice(-20).join("\n");
      await savePacerMemory(currentUser.id, { ...(existing||{}), chatMemory: trimmed });
      setChatMemory(trimmed);
    } catch {}
  }

  // Update memory when user reacts to a message
  async function saveReactionToMemory(msgId, emoji) {
    if (!currentUser) return;
    try {
      const msg = messages.find(m => m.id === msgId);
      if (!msg || msg.role !== "assistant") return;
      const existing = await loadPacerMemory(currentUser.id);
      const prevMem = existing?.chatMemory || "";
      const dateStr = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
      const reactionLine = `[${dateStr}] User reacted ${emoji} to Pacer message: "${msg.text.slice(0,80)}"`;
      const lines = prevMem ? prevMem.split("\n").filter(Boolean) : [];
      // Replace last line for same message if already reacted, otherwise append
      const existing_rx_idx = lines.findLastIndex(l => l.includes(msg.text.slice(0,40)));
      if (existing_rx_idx >= 0) lines[existing_rx_idx] = reactionLine;
      else lines.push(reactionLine);
      const trimmed = lines.slice(-20).join("\n");
      await savePacerMemory(currentUser.id, { ...(existing||{}), chatMemory: trimmed });
      setChatMemory(trimmed);
    } catch {}
  }

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // ── Micro-toast helper ───────────────────────────────────────────────────
  function showMicroToast(text, duration = 4500) {
   showMicroToastRef.current = showMicroToast; // keep ref current
    setMicroToast(text);
    clearTimeout(microToastTimer.current);
    microToastTimer.current = setTimeout(() => setMicroToast(null), duration);
  }

  // ── Post-log micro-feedback (metric milestones) ───────────────────────────
  useEffect(() => {
    const MICRO_LINES = {
      halfway: (m) => {
        const lines = [
          `Halfway on ${m.short||m.label}. Keep the pace.`,
          `${m.val} ${m.short||m.label}. Momentum's there.`,
          `${m.short||m.label} at 50%. Don't let off now.`,
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      },
      goal: (m) => {
        const lines = [
          `${m.short||m.label} done. What else?`,
          `${m.label} goal hit. That's the baseline.`,
          `${m.val} ${m.short||m.label}. ✓`,
          `Goal on ${m.short||m.label}. Keep stacking.`,
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      },
    };
    function handleMilestone(e) {
      const { type, ...m } = e.detail || {};
      if (!type || !MICRO_LINES[type]) return;
      // Don't fire if already at goal+20% (milestone already celebrated)
      const text = MICRO_LINES[type](m);
      showMicroToast(text, type === "goal" ? 5000 : 4000);
    }
    window.addEventListener("cadence:metric-milestone", handleMilestone);

    // ── Journal response — Pacer reads and responds to reflections ────────
    // Pro: fires automatically. Free: dispatches an event so journal UI can show "Get Pacer's take" button.
    async function handleJournalSaved(e) {
      const text = e.detail?.text;
      if (!text || text.length < 30) return;
      const engLevel = pacerSettings?.engagement || "high";
      if (engLevel === "low") return;
      if (open) return;
      // Check pro status — free users get a prompt button instead of auto-fire
      const { getUsageStatus } = await import("./cadenceAI.js").catch(() => ({}));
      const usage = getUsageStatus ? await getUsageStatus().catch(() => null) : null;
      const userIsPro = usage?.is_pro ?? false;
      if (!userIsPro) {
        // Signal the journal to show a "Get Pacer's take →" button instead
        window.dispatchEvent(new CustomEvent("cadence:pacer-journal-prompt", { detail: { text } }));
        return;
      }
      try {
        const data = await callAI({ model: "claude-haiku-4-5-20251001", messages: [{ role: "user", content: `Journal entry: ${text.slice(0, 400)}` }], max_tokens: 80, system: `You are Pacer — a direct AI companion who has been watching this user's performance. They just saved a journal entry. Respond with ONE short sentence (under 15 words) that reacts specifically to what they wrote. Not generic. Not "great reflection!" Pick the most interesting or honest thing from their entry and say something direct about it. No preamble.`, call_type: "pacer" })
        const reply = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
        if (reply) showMicroToast(reply, 6000);
      } catch {}
    }
    window.addEventListener("cadence:journal-saved", handleJournalSaved);

    return () => {
      window.removeEventListener("cadence:metric-milestone", handleMilestone);
      window.removeEventListener("cadence:journal-saved", handleJournalSaved);
    };
  }, [open, pacerSettings?.engagement]);

  // ── App-open trigger + exit-intent streak guardian ────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const appOpenKey = `pacer-app-open-${todayStr()}`;
    const exitGuardKey = `pacer-exit-guard-${todayStr()}`;

    function fireAppOpenNudge() {
      const today = todayStr();
      const isWeekendToday = isWeekend(today);
      const engLevel = pacerSettings?.engagement || "high";
      if (engLevel === "low") return;
      const alreadyGreeted = (() => { try { return !!localStorage.getItem(appOpenKey); } catch { return false; } })();
      if (!alreadyGreeted) {
        try { localStorage.setItem(appOpenKey, "1"); } catch {}
        // Short delay so app is visually loaded before greeting fires
        setTimeout(() => {
          const hour = new Date().getHours();
          const currentPct = todayPct ?? 0;
          if (isWeekendToday) {
            // Weekend: quiet ambient micro-toast acknowledging it's the weekend
            showMicroToast("Weekend. Rest up — next week matters more.");
            return;
          }
          // Morning open (before 12) — fire morning ritual greeting
          if (hour < 12) {
            fireNudge("morningRitual");
          }
          // Afternoon open with low progress — ambient micro-toast
          else if (hour >= 14 && currentPct < 40) {
            showMicroToast(currentPct === 0 ? "Nothing logged yet today." : `At ${currentPct}% — afternoon's the window.`);
          }
          // Evening — fire EOD
          else if (hour >= 17) {
            fireNudge("eod");
          }
        }, 1200);
      }
    }

    // Fire on initial app load
    fireAppOpenNudge();

    function handleVisibility() {
      const today = todayStr();

      if (!document.hidden) {
        // ── App came back to foreground ──
        fireAppOpenNudge();
        // Silently re-sync all user data when returning to foreground
        // This ensures streaks, feed, goals stay consistent across devices/browsers
        if (orgId && currentUser?.id) {
          Promise.all([
            loadUserData(currentUser.id),
            loadFeed(orgId),
            storageGet(ns(`at-goals-${currentUser.id}`)),
            loadNotifications(currentUser.id),
          ]).then(([freshData, freshFeed, freshGoals, freshNotifs]) => {
            if (freshData) setMyData(freshData);
            if (freshFeed) setFeed(freshFeed);
            if (freshGoals) setAllUserGoals(prev => ({...prev, [currentUser.id]: freshGoals}));
            if (freshNotifs) setNotifications(freshNotifs);
          }).catch(() => {});
        }
      } else {
        // ── App going to background / tab hidden ──
        // Exit-intent streak guardian
        const currentPct = todayPct ?? 0;
        const streakVal = streak?.current || 0;
        if (streakVal < 2) return; // don't fire for brand-new users
        const hour = new Date().getHours();
        if (hour < 17 || hour >= 22) return; // only evening window
        if (currentPct >= 80) return; // they're doing fine
        const alreadyFired = (() => { try { return !!localStorage.getItem(exitGuardKey); } catch { return false; } })();
        if (alreadyFired) return;
        try { localStorage.setItem(exitGuardKey, "1"); } catch {}
        // Queue a nudge — fires right away as a toast, but deferred slightly
        // so it doesn't race with the background transition
        setTimeout(() => {
          const streakMsg = streakVal >= 10
            ? `${streakVal}-day streak. Don't end it here.`
            : streakVal >= 5
            ? `${streakVal} days going. Finish strong.`
            : `Streak at ${streakVal}. Still time tonight.`;
          setNudge({ type: "streak_exit", preview: streakMsg });
          clearTimeout(nudgeTimer.current);
          nudgeTimer.current = setTimeout(() => setNudge(null), 9000);
        }, 800);
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [currentUser?.id, todayPct, streak?.current, pacerSettings?.engagement]);

  // ── Event listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    function handlePacerPrompt(e) {
      const prompt = e.detail;
      if (!prompt) return;
      setOpen(true);
      setGreeted(true);
      setNudge(null);
      const userMsg = { role: "user", text: prompt, id: Date.now() };
      setMessages(prev => {
        const withMsg = [...prev, userMsg];
        fetchPacer(withMsg).then(reply => {
          setMessages(p => [...p, { role: "assistant", text: reply, id: Date.now() + 1 }]);
        });
        return withMsg;
      });
    }
    window.addEventListener("cadence:pacer-prompt", handlePacerPrompt);
    return () => window.removeEventListener("cadence:pacer-prompt", handlePacerPrompt);
  }, [open, greeted]);

  const pct = todayPct ?? 0;
  const hasActivity = pct > 0;

  // Nudge type labels
  const nudgeLabels = {
    morningRitual:       "Good morning",
    streak_exit:         "Before you go",
    midMorning:          "Morning check-in",
    midAfternoon:        "Afternoon check-in",
    eod:                 "End of day",
    eow:                 "Week in review",
    commitment:          "Holding you to it",
    commitment_followup: "Still waiting…",
    time_start:          "You said it. Time to do it.",
    daily_target:        "Keeping you on target",
    follow_up:           "Did you follow up?",
    accountability_post: "You said you'd report back",
    week_goal:           "Week goal check-in",
    streak_pledge:       "Streak on the line",
    behavior_change:     "New habit check-in",
    mindset_check:       "Checking in on you",
  };

  return (
    <>
      {/* ── Nudge toast — appears when Pacer fires a proactive message ── */}
      {nudge && !open && (
        <div
          onClick={() => { haptic.light(); setNudge(null); handleOpen(); }}
          style={{
            position: "fixed",
            bottom: `calc(env(safe-area-inset-bottom, 0px) + ${isMobileDevice ? "90px" : "80px"})`,
            right: "72px",
            zIndex: 448,
            background: "var(--bg-1)",
            border: "1px solid rgba(29,201,232,0.35)",
            borderRadius: "14px",
            padding: "10px 14px",
            maxWidth: "260px",
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(29,201,232,0.2), 0 2px 8px rgba(0,0,0,0.4)",
            animation: "pacerSlideIn 0.25s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
            <span style={{ fontSize: "0.85rem" }}>⚡</span>
            <span style={{ fontSize: "0.65rem", fontWeight: "800", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Pacer · {nudgeLabels[nudge.type] || "Check-in"}
            </span>
            <button
              onClick={e => { e.stopPropagation(); setNudge(null); }}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem", padding: "0 2px", lineHeight: 1 }}
            >✕</button>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.45, fontFamily: F }}>
            {nudge.preview}
          </div>
          <div style={{ fontSize: "0.65rem", color: "var(--accent)", marginTop: "6px", fontWeight: "700" }}>
            Tap to respond →
          </div>
        </div>
      )}

      {/* ── Micro-toast — Pacer one-liner, slides in at top of content ── */}
      {microToast && !open && (
        <div
          style={{
            position: "fixed",
            top: `calc(env(safe-area-inset-top, 0px) + ${isMobileDevice ? "56px" : "12px"})`,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 447,
            background: "var(--bg-1)",
            border: "1px solid rgba(29,201,232,0.2)",
            borderRadius: "20px",
            padding: "8px 14px",
            maxWidth: "min(340px, 90vw)",
            width: "max-content",
            pointerEvents: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25), 0 0 0 1px rgba(29,201,232,0.08)",
            animation: "pacerSlideIn 0.25s ease",
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--accent)", flexShrink: 0 }}>⚡</span>
          <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontFamily: F, lineHeight: 1.4, fontStyle: "italic" }}>
            {microToast}
          </span>
        </div>
      )}

      {/* ── Onboarding Prompts — smart first-time Pacer cards ── */}
      {onboardPrompts.length > 0 && !open && (
        <div style={{
          position: "fixed",
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${isMobileDevice ? "160px" : "148px"})`,
          right: "16px",
          zIndex: 447,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-end",
          maxWidth: "min(300px, 82vw)",
        }}>
          {onboardPrompts.slice(0, 2).map((prompt, i) => (
            <div key={prompt.id} style={{
              background: i === 0 ? "var(--bg-1)" : "var(--bg-0)",
              border: `1px solid ${i === 0 ? "rgba(29,201,232,0.28)" : "rgba(29,201,232,0.12)"}`,
              borderRadius: "16px",
              padding: i === 0 ? "10px 12px" : "7px 11px",
              opacity: i === 0 ? 1 : 0.55,
              transition: "opacity 0.3s ease",
              animation: "pacerSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)",
              pointerEvents: i === 0 ? "auto" : "none",
              boxShadow: i === 0 ? "0 4px 20px rgba(0,0,0,0.3)" : "none",
            }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: prompt.actions?.length > 0 ? "8px" : "0" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--accent)", flexShrink: 0 }}>⚡</span>
                <span style={{ fontSize: "0.76rem", color: i === 0 ? "var(--text-secondary)" : "var(--text-dim)", fontFamily: F, lineHeight: 1.4, flex: 1 }}>
                  {prompt.text}
                </span>
                {i === 0 && (
                  <button
                    onClick={() => setOnboardPrompts(prev => prev.filter(p => p.id !== prompt.id))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", padding: "2px 4px", flexShrink: 0, fontFamily: F, WebkitTapHighlightColor: "transparent", lineHeight: 1 }}
                  >✕</button>
                )}
              </div>
              {/* Auto-dismiss progress bar — only on top card when no actions */}
              {i === 0 && (!prompt.actions || prompt.actions.length === 0) && (
                <div style={{ marginTop: '6px', height: '2px', borderRadius: '2px', background: 'rgba(29,201,232,0.15)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'rgba(29,201,232,0.5)', animation: 'pacerDismissBar 8s linear forwards' }} />
                </div>
              )}
              {/* Action chips — only on top card */}
              {i === 0 && prompt.actions?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {prompt.actions.map((act, ai) => (
                    <button key={ai}
                      onClick={() => {
                        haptic.light();
                        // Track this action as used so it won't repeat today
                        try {
                          const dk = `cadence-nudge-dismissed-${currentUser?.id}-${new Date().toISOString().slice(0,10)}`;
                          const prev = JSON.parse(localStorage.getItem(dk) || "[]");
                          if (!prev.includes(act.label)) localStorage.setItem(dk, JSON.stringify([...prev, act.label]));
                        } catch {}
                        setOnboardPrompts([]);
                        if (act.journalTemplate || act.journalMode) {
                         // Navigate first, then fire event after journal mounts
                         if (onNavigate) onNavigate("journal");
                         setTimeout(() => {
                          window.dispatchEvent(new CustomEvent("cadence:open-journal", {
                           detail: { template: act.journalTemplate || null, mode: act.journalMode || null }
                          }));
                         }, 80);
                        } else if (act.tab && onGoSettings) {
                         onGoSettings(act.tab);
                        } else if (onNavigate) {
                         onNavigate(act.view);
                        }
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        background: "var(--bg-2)", border: "1px solid var(--border-1)",
                        borderRadius: "10px", padding: "8px 10px",
                        cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent",
                        textAlign: "left", width: "100%", transition: "all 0.12s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(29,201,232,0.35)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-1)"}
                    >
                      <span style={{ fontSize: "0.8rem", flexShrink: 0 }}>{act.icon}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-primary)", flex: 1 }}>{act.label}</span>
                      <span style={{ fontSize: "0.6rem", color: "var(--text-dim)", opacity: 0.5 }}>→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}



      {/* ── Floating Pacer button ── */}
      <button
        ref={btnRef}
        data-tour-pacer
        onClick={() => { haptic.light(); if (!open) handleOpen(); else setOpen(false); }}
        style={{
          position: "fixed",
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${isMobileDevice ? "90px" : "72px"})`,
          right: "16px", zIndex: 450,
          width: "52px", height: "52px", borderRadius: "50%",
          background: open ? "rgba(29,201,232,0.15)" : "linear-gradient(135deg, #1DC9E8 0%, #7B6FD8 100%)",
          border: open ? "1px solid rgba(29,201,232,0.4)" : "2px solid rgba(29,201,232,0.25)",
          cursor: "pointer",
          boxShadow: open ? "none" : "0 0 0 4px rgba(29,201,232,0.1), 0 4px 20px rgba(29,201,232,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: open ? "1rem" : "1.3rem",
          transition: "transform 0.15s, box-shadow 0.15s, background 0.2s",
          WebkitTapHighlightColor: "transparent",
          animation: open ? "none" : "pacerGlow 2.5s ease-in-out infinite",
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.animation = "none"; }}}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.transform = "scale(1)";   e.currentTarget.style.animation = "pacerGlow 2.5s ease-in-out infinite"; }}}
        title="Pacer — your accountability partner"
      >
        {/* Unread dot when there are unseen nudge messages or pending commitments */}
        {!open && (hasUnreadNudge || pendingCommitmentCount > 0) && (
          <span style={{ position: "absolute", top: "4px", right: "4px", minWidth: "10px", height: "10px", borderRadius: "5px", background: "#F43F5E", border: "2px solid var(--bg-root)", padding: pendingCommitmentCount > 0 ? "0 3px" : "0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {pendingCommitmentCount > 0 && <span style={{ fontSize: "0.45rem", fontWeight: "900", color: "#fff", lineHeight: 1 }}>{pendingCommitmentCount}</span>}
          </span>
        )}
        {open ? "✕" : "⚡"}
      </button>

      {/* First-time intro nudge */}
      {showIntroNudge && !open && (
        <div style={{
          position: "fixed",
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${isMobileDevice ? "150px" : "132px"})`,
          right: "8px", zIndex: 449,
          background: "linear-gradient(135deg,rgba(29,201,232,0.95),rgba(123,111,216,0.95))",
          borderRadius: "10px", padding: "8px 12px", maxWidth: "200px", pointerEvents: "none",
          boxShadow: "0 4px 16px rgba(29,201,232,0.3)",
          animation: "pacerSlideIn 0.3s ease",
        }}>
          <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#fff", lineHeight: 1.4, fontFamily: F }}>
            ⚡ Meet Pacer — I'll keep you honest. Tap to say hi.
          </div>
          <div style={{ position: "absolute", bottom: "-6px", right: "20px", width: "12px", height: "12px", background: "rgba(123,111,216,0.95)", transform: "rotate(45deg)", borderRadius: "2px" }} />
        </div>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <>
        {/* Mobile backdrop */}
        {isMobileDevice && (
          <div onClick={() => setOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 448,
            background: "rgba(0,0,0,0.5)",
            animation: "pacerFadeIn 0.2s ease",
          }} />
        )}
        <div ref={panelRef} style={
          isMobileDevice ? {
            // Mobile: full-width bottom sheet, sits above keyboard
            position: "fixed",
            left: 0, right: 0,
            bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : "0px",
            zIndex: 449,
            height: keyboardHeight > 0
              ? `calc(100vh - ${keyboardHeight}px - env(safe-area-inset-top, 0px))`
              : "85vh",
            maxHeight: "100vh",
            background: "var(--bg-1)",
            borderRadius: keyboardHeight > 0 ? "0" : "24px 24px 0 0",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
            animation: "pacerSheetUp 0.28s cubic-bezier(0.32,0.72,0,1)",
            transition: "bottom 0.15s ease, height 0.15s ease, border-radius 0.1s ease",
          } : {
            // Desktop: floating panel (unchanged)
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 136px)",
            right: "16px", zIndex: 449,
            width: "min(380px, calc(100vw - 24px))",
            maxHeight: "min(560px, calc(100vh - 160px))",
            background: "var(--bg-1)", border: "1px solid var(--border-1)",
            borderRadius: "20px", display: "flex", flexDirection: "column",
            overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
            animation: "pacerSlideIn 0.2s ease",
          }
        }>
          {/* Drag handle — mobile only, swipe-down to close */}
          {isMobileDevice && (() => {
           const sheetHandlers = {
            onTouchStart: e => {
             e.stopPropagation();
             sheetDragStartY.current = e.touches[0].clientY;
             sheetDragActive.current = true;
             if (panelRef.current) { panelRef.current.style.transition = "none"; }
            },
            onTouchMove: e => {
             if (!sheetDragActive.current) return;
             e.stopPropagation();
             const dy = Math.max(0, e.touches[0].clientY - sheetDragStartY.current);
             if (panelRef.current) panelRef.current.style.transform = `translateY(${dy}px)`;
            },
            onTouchEnd: e => {
             if (!sheetDragActive.current) return;
             e.stopPropagation();
             sheetDragActive.current = false;
             const dy = Math.max(0, e.changedTouches[0].clientY - sheetDragStartY.current);
             if (dy > 72) {
              // Animate out before closing
              if (panelRef.current) {
               panelRef.current.style.transition = "transform 0.22s cubic-bezier(0.32,0.72,0,1)";
               panelRef.current.style.transform = "translateY(110%)";
              }
              setTimeout(() => {
               setOpen(false);
               if (panelRef.current) { panelRef.current.style.transform = ""; panelRef.current.style.transition = ""; }
              }, 220);
             } else {
              // Snap back
              if (panelRef.current) {
               panelRef.current.style.transition = "transform 0.25s cubic-bezier(0.32,0.72,0,1)";
               panelRef.current.style.transform = "translateY(0)";
               setTimeout(() => { if(panelRef.current) panelRef.current.style.transition = ""; }, 260);
              }
             }
             sheetDragStartY.current = null;
            },
           };
           return (
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px", flexShrink: 0, touchAction: "none", cursor: "grab", userSelect: "none" }} {...sheetHandlers}>
             <div style={{ width: "40px", height: "5px", borderRadius: "3px", background: "var(--border-2)" }} />
            </div>
           );
          })()}

          {/* Header */}
          <div style={{ padding: isMobileDevice ? "8px 16px 12px" : "14px 16px 12px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, background: "rgba(29,201,232,0.03)" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#1DC9E8,#7B6FD8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", flexShrink: 0 }}>⚡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.92rem", fontWeight: "800", color: "var(--text-primary)", fontFamily: F }}>Pacer</div>
              <div style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>
                {isWeekend(todayStr())
                  ? "Enjoy the weekend 🌿"
                  : weeklyState.daysSinceActive >= 2
                  ? `${weeklyState.daysSinceActive} days since we logged`
                  : pct >= 100 ? "Goals crushed today ✓"
                  : pct >= 60 ? `${pct}% — keep pushing`
                  : pct > 0  ? `${pct}% — let's get moving`
                  : weeklyState.weekAvg > 0 ? `We're at ${weeklyState.weekAvg}% this week`
                  : "Ready when you are"}
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "4px 6px", borderRadius: "6px", fontSize: "1rem", lineHeight: 1, flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>✕</button>
            <button onClick={() => { setOpen(false); if(onGoSettings) onGoSettings("pacer"); }} title="Pacer settings" style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "4px 6px", borderRadius: "6px", lineHeight: 1, flexShrink: 0, WebkitTapHighlightColor: "transparent", fontSize: "0.85rem" }}>⚙</button>
          </div>

          {/* Pending Commitments — compact tracker strip */}
          {commitments.filter(c => !c.acknowledged && c.triggerAt).length > 0 && (
            <div style={{ padding: "8px 14px 0", borderBottom: "1px solid var(--border-1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.6rem", fontWeight: "800", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: F }}>⏰ Tracking your commitments</span>
              </div>
              {commitments.filter(c => !c.acknowledged && c.triggerAt).slice(0, 3).map(c => {
                const timeLeft = c.triggerAt - Date.now();
                const isPast = timeLeft < 0;
                const minsLeft = Math.abs(Math.round(timeLeft / 60000));
                const timeStr = isPast
                  ? `${minsLeft < 60 ? minsLeft + "m ago" : Math.round(minsLeft/60) + "h ago"}`
                  : minsLeft < 60 ? `in ${minsLeft}m` : `in ${Math.round(minsLeft/60)}h`;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 8px", background: isPast ? "rgba(244,63,94,0.08)" : "rgba(29,201,232,0.06)", borderRadius: "8px", marginBottom: "4px", border: `1px solid ${isPast ? "rgba(244,63,94,0.2)" : "rgba(29,201,232,0.15)"}` }}>
                    <span style={{ fontSize: "0.75rem", flexShrink: 0 }}>{({
                      time_start: "🎯", daily_target: "📊", follow_up: "📞",
                      accountability_post: "📣", week_goal: "📅", streak_pledge: "🔥",
                      behavior_change: "🔄", mindset_check: "💬"
                    })[c.type] || "📌"}</span>
                    <span style={{ flex: 1, fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: F, lineHeight: 1.35 }}>{c.text}</span>
                    <span style={{ fontSize: "0.65rem", color: isPast ? "#F43F5E" : "var(--accent)", fontWeight: "700", flexShrink: 0, fontFamily: F }}>{timeStr}</span>
                    <button onClick={() => acknowledgeCommitment(c.id)} title="Mark done" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: "var(--text-dim)", padding: "2px", lineHeight: 1, WebkitTapHighlightColor: "transparent" }}>✓</button>
                  </div>
                );
              })}
              {commitments.filter(c => !c.acknowledged && c.triggerAt).length > 3 && (
                <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", textAlign: "center", paddingBottom: "4px", fontFamily: F }}>
                  +{commitments.filter(c => !c.acknowledged && c.triggerAt).length - 3} more
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: "10px", WebkitOverflowScrolling: "touch" }}>
            {thinking && messages.length === 0 && (
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg,#1DC9E8,#7B6FD8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", flexShrink: 0 }}>⚡</div>
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "12px 12px 12px 2px", padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", opacity: 0.5, animation: `pacerDot 1.2s ${i*0.2}s infinite` }} />)}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} style={{ marginBottom: "2px" }}>
                {/* Nudge type label above nudge messages */}
                {m.isNudge && (
                  <div style={{ textAlign: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.6rem", fontWeight: "800", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", background: "rgba(29,201,232,0.08)", padding: "2px 8px", borderRadius: "20px", border: "1px solid rgba(29,201,232,0.2)" }}>
                      ⚡ {nudgeLabels[m.nudgeType] || "Pacer check-in"}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                  {m.role === "assistant" && (
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg,#1DC9E8,#7B6FD8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", flexShrink: 0 }}>⚡</div>
                  )}
                  <div style={{ position: "relative", maxWidth: "84%" }}>
                    {/* Message bubble */}
                    <div
                      onDoubleClick={() => {
                        // Double-tap to open reaction picker
                        setReactions(prev => ({ ...prev, [`${m.id}_picking`]: true }));
                        setTimeout(() => setReactions(prev => { const n={...prev}; delete n[`${m.id}_picking`]; return n; }), 3000);
                      }}
                      style={{
                        background: m.role === "user" ? "var(--accent)" : m.isNudge ? "rgba(29,201,232,0.07)" : "var(--bg-2)",
                        border: m.role === "user" ? "none" : m.isNudge ? "1px solid rgba(29,201,232,0.25)" : "1px solid var(--border-1)",
                        borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                        padding: "10px 13px",
                        fontSize: "0.85rem", color: m.role === "user" ? "#000" : "var(--text-secondary)",
                        lineHeight: 1.55, fontFamily: F, fontWeight: "500",
                        userSelect: "text",
                      }}>
                      {m.text}
                    </div>
                    {/* Reaction bubble if set */}
                    {reactions[m.id] && (
                      <div
                        onClick={() => setReactions(prev => { const n={...prev}; delete n[m.id]; return n; })}
                        style={{
                          position: "absolute", bottom: "-10px",
                          [m.role === "user" ? "left" : "right"]: "6px",
                          background: "var(--bg-1)", border: "1px solid var(--border-1)",
                          borderRadius: "12px", padding: "1px 6px", fontSize: "0.85rem",
                          cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", zIndex: 2,
                          lineHeight: 1.6,
                        }}>
                        {reactions[m.id]}
                      </div>
                    )}
                    {/* Reaction picker — shown on double-tap */}
                    {reactions[`${m.id}_picking`] && (
                      <div style={{
                        position: "absolute", bottom: "calc(100% + 6px)",
                        [m.role === "user" ? "right" : "left"]: "0",
                        background: "var(--bg-1)", border: "1px solid var(--border-1)",
                        borderRadius: "20px", padding: "5px 8px",
                        display: "flex", gap: "4px", zIndex: 10,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                      }}>
                        {["👍","😂","❤️","👎","😤","‼️"].map(e => (
                          <button key={e} onClick={() => {
                            const isUnset = reactions[m.id] === e;
                            setReactions(prev => {
                              const n = {...prev};
                              delete n[`${m.id}_picking`];
                              if (isUnset) { delete n[m.id]; } else { n[m.id] = e; }
                              return n;
                            });
                            if (!isUnset) saveReactionToMemory(m.id, e).catch(()=>{});
                          }}
                          style={{ background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer", padding:"2px", lineHeight:1, WebkitTapHighlightColor:"transparent" }}>
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.role === "user" && (
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: "800", color: "var(--text-dim)", flexShrink: 0 }}>
                      {currentUser?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {thinking && messages.length > 0 && (
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg,#1DC9E8,#7B6FD8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", flexShrink: 0 }}>⚡</div>
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "12px 12px 12px 2px", padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", opacity: 0.5, animation: `pacerDot 1.2s ${i*0.2}s infinite` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompt chips */}
          {messages.length <= 1 && !thinking && (
            <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingBottom: "6px", display: "flex", gap: "6px", flexWrap: "wrap", flexShrink: 0 }}>
              {[
                isWeekend(todayStr()) ? "How'd my week go?" : pct < 50 ? "What should I focus on?" : pct >= 100 ? "What's my best move now?" : "How am I trending?",
                "Where do I keep falling short?",
                "Give me a plan for the rest of the day",
              ].map(chip => (
                <button key={chip} onClick={() => { setInput(chip); setTimeout(() => inputRef.current?.focus(), 50); }}
                  style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "20px", padding: "5px 11px", fontSize: "0.72rem", color: "var(--text-muted)", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent", whiteSpace: "nowrap" }}>
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Usage bar — free users near/at limit */}
          
          {/* Input — padding accounts for safe area on mobile */}
          <div style={{
            padding: isMobileDevice
              ? `10px 12px calc(env(safe-area-inset-bottom, 16px) + ${keyboardHeight > 0 ? "10px" : "20px"})`
              : "10px 12px 14px",
            borderTop: "1px solid var(--border-1)", display: "flex", gap: "8px", flexShrink: 0,
            background: "var(--bg-1)",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Talk to Pacer…"
              autoComplete="off"
              style={{ flex: 1, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "10px", color: "var(--text-primary)", padding: "11px 14px", fontSize: isMobileDevice ? "1rem" : "0.88rem", fontFamily: F, outline: "none", WebkitAppearance: "none" }}
            />
            <button onClick={()=>{haptic.medium();handleSend();}} disabled={!input.trim() || thinking}
              style={{ background: "var(--accent)", border: "none", borderRadius: "10px", color: "#000", padding: "11px 16px", fontWeight: "800", fontSize: "0.9rem", cursor: "pointer", fontFamily: F, flexShrink: 0, opacity: (!input.trim() || thinking) ? 0.5 : 1, WebkitTapHighlightColor: "transparent", minWidth: "44px", minHeight: "44px" }}>
              ↑
            </button>
          </div>
        </div>
        </>
      )}

      <style>{`
        @keyframes pacerSlideIn { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:none; } } @keyframes pacerDismissBar { from { width:100%; } to { width:0%; } }
        @keyframes pacerSheetUp { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
        @keyframes pacerFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes pacerDot { 0%,80%,100% { opacity:0.3; transform:scale(0.8); } 40% { opacity:1; transform:scale(1); } }
        @keyframes pacerGlow { 0%,100% { box-shadow: 0 0 8px 2px rgba(29,201,232,0.3), 0 4px 16px rgba(29,201,232,0.25); } 50% { box-shadow: 0 0 18px 5px rgba(29,201,232,0.55), 0 6px 24px rgba(123,111,216,0.4); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ── HomeScreen — calm, personal landing ─────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// ── Milestones — lifetime achievement badges ──────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function computeMilestones(myData, myGoals, myGoalPeriods, indConfig) {
 const metrics = indConfig?.weekdayMetrics || [];
 const allDays = Object.keys(myData).filter(d => !isWeekend(d));
 const totalDays = allDays.length;

 // Total lifetime counts per metric
 const lifetimeCounts = {};
 for (const m of metrics) {
  lifetimeCounts[m.key] = allDays.reduce((s, d) => s + (myData[d]?.[m.key] || 0), 0);
 }

 // Streak
 const streak = computeStreak(myData);

 // Days at 100%
 const perfectDays = allDays.filter(d => {
  const pct = computeGoalPct(myData[d] || {}, metrics, myGoals, myGoalPeriods);
  return pct >= 100;
 }).length;

 // Perfect weeks (Mon-Fri all ≥100%)
 const weekMap = {};
 for (const d of allDays) {
  const wk = weekKey(d);
  if (!weekMap[wk]) weekMap[wk] = [];
  weekMap[wk].push(d);
 }
 const perfectWeeks = Object.values(weekMap).filter(days => {
  const weekdays = days.filter(d => !isWeekend(d));
  return weekdays.length >= 5 && weekdays.every(d => computeGoalPct(myData[d]||{}, metrics, myGoals, myGoalPeriods) >= 100);
 }).length;

 const DEFS = [
  // Streak milestones
  { id: "streak_3",    icon: "🔥", label: "On Fire",       desc: "3-day streak",           earned: streak.longest >= 3 },
  { id: "streak_7",    icon: "🔥", label: "Week Warrior",  desc: "7-day streak",           earned: streak.longest >= 7 },
  { id: "streak_30",   icon: "🔥", label: "Month Strong",  desc: "30-day streak",          earned: streak.longest >= 30 },
  { id: "streak_100",  icon: "💎", label: "Century",       desc: "100-day streak",         earned: streak.longest >= 100 },
  // Perfect days
  { id: "perfect_1",   icon: "✅", label: "First 100%",    desc: "First perfect day",      earned: perfectDays >= 1 },
  { id: "perfect_10",  icon: "✅", label: "Perfect 10",    desc: "10 perfect days",        earned: perfectDays >= 10 },
  { id: "perfect_50",  icon: "🏆", label: "Perfectionist", desc: "50 perfect days",        earned: perfectDays >= 50 },
  // Perfect weeks
  { id: "week_1",      icon: "📅", label: "Clean Week",    desc: "First perfect week",     earned: perfectWeeks >= 1 },
  { id: "week_5",      icon: "📅", label: "High Achiever", desc: "5 perfect weeks",        earned: perfectWeeks >= 5 },
  // Lifetime volume — top metric
  ...metrics.slice(0, 1).flatMap(m => [
   { id: `vol_${m.key}_100`,  icon: "📈", label: `${m.short||m.label} x100`,  desc: `${100} ${m.label} logged`, earned: (lifetimeCounts[m.key]||0) >= 100 },
   { id: `vol_${m.key}_500`,  icon: "📈", label: `${m.short||m.label} x500`,  desc: `${500} ${m.label} logged`, earned: (lifetimeCounts[m.key]||0) >= 500 },
   { id: `vol_${m.key}_1000`, icon: "💥", label: `${m.short||m.label} x1K`,   desc: `1,000 ${m.label} logged`, earned: (lifetimeCounts[m.key]||0) >= 1000 },
   { id: `vol_${m.key}_5000`, icon: "💥", label: `${m.short||m.label} x5K`,   desc: `5,000 ${m.label} logged`, earned: (lifetimeCounts[m.key]||0) >= 5000 },
  ]),
  // Total active days
  { id: "days_7",    icon: "📊", label: "Week In",       desc: "7 days logged",          earned: totalDays >= 7 },
  { id: "days_30",   icon: "📊", label: "Month In",      desc: "30 days logged",         earned: totalDays >= 30 },
  { id: "days_100",  icon: "🌟", label: "Committed",     desc: "100 days logged",        earned: totalDays >= 100 },
  { id: "days_365",  icon: "🌟", label: "Year Strong",   desc: "365 days logged",        earned: totalDays >= 365 },
 ];

 const earned = DEFS.filter(m => m.earned);
 const next = DEFS.filter(m => !m.earned).slice(0, 3); // next few to unlock
 return { earned, next, totalDays, perfectDays, perfectWeeks, lifetimeCounts, streak };
}

function MilestonesCard({ myData, myGoals, myGoalPeriods, indConfig }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const ms = computeMilestones(myData, myGoals, myGoalPeriods, indConfig);
 const [expanded, setExpanded] = useState(false);
 if (!ms.totalDays) return null;

 const toShow = expanded ? ms.earned : ms.earned.slice(-4).reverse();

 return (
  <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "16px", overflow: "hidden" }}>
   <div style={{ padding: "14px 16px 12px", borderBottom: ms.earned.length ? "1px solid var(--border-1)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div>
     <div style={{ fontSize: "0.68rem", fontWeight: "800", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: F }}>🏅 Milestones</div>
     <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "3px", fontFamily: F }}>{ms.earned.length} earned · {ms.totalDays} days logged</div>
    </div>
    {ms.earned.length > 4 && (
     <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer", fontFamily: F, padding: "4px 0" }}>
      {expanded ? "Show less" : `All ${ms.earned.length} →`}
     </button>
    )}
   </div>
   {ms.earned.length > 0 && (
    <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
     {toShow.map(m => (
      <div key={m.id} title={m.desc} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "20px", padding: "5px 10px" }}>
       <span style={{ fontSize: "0.9rem" }}>{m.icon}</span>
       <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-secondary)", fontFamily: F }}>{m.label}</span>
      </div>
     ))}
    </div>
   )}
   {/* Next to unlock */}
   {ms.next.length > 0 && (
    <div style={{ padding: "10px 16px 14px", borderTop: ms.earned.length ? "1px solid var(--border-1)" : "none" }}>
     <div style={{ fontSize: "0.62rem", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", fontFamily: F }}>Next to unlock</div>
     <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {ms.next.slice(0, 2).map(m => (
       <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "0.85rem", opacity: 0.4 }}>{m.icon}</span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: F }}>{m.label} — {m.desc}</span>
       </div>
      ))}
     </div>
    </div>
   )}
   {ms.earned.length === 0 && (
    <div style={{ padding: "14px 16px", fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: F, lineHeight: 1.5 }}>
     Log your first days consistently to start earning badges. Your first milestone unlocks after 3 days in a row.
    </div>
   )}
  </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── GlobalLeaderboard — industry-filtered ranking across all Cadence users ───
// ─────────────────────────────────────────────────────────────────────────────
function GlobalLeaderboard({ currentUser, indConfig, myGoals, myGoalPeriods, myData, communities, onNavigateToCrew }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [filter, setFilter] = useState("industry"); // "industry" | "global"
 const [rows, setRows] = useState([]);
 const [loading, setLoading] = useState(false);
 const [myRank, setMyRank] = useState(null);
 const [crewSuggestions, setCrewSuggestions] = useState([]);

 const today = todayStr();
 const weekStart = (() => { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0,10); })();

 useEffect(() => {
  loadData();
 }, [filter, currentUser?.id]);

 async function loadData() {
  if (!currentUser) return;
  setLoading(true);
  try {
   const reg = await loadUserRegistry();
   const myIndustry = currentUser.industry;
   const target = filter === "industry" ? reg.filter(r => r.spaceId && r.spaceId !== currentUser.id) : reg;
   
   // Compute week % for each user we can read
   const results = await Promise.all(target.map(async (r) => {
    try {
     const data = await storageGet(`${r.personalNs}/at-data-${r.userId}`);
     const goals = await storageGet(`${r.personalNs}/at-goals-${r.userId}`) || {};
     if (!data) return null;
     // Compute this week avg
     const weekdays = Object.keys(data).filter(d => d >= weekStart && !isWeekend(d));
     if (!weekdays.length) return null;
     const industry = r.industry || "freight";
     const cfg = DEFAULT_INDUSTRIES[industry] || DEFAULT_INDUSTRIES.freight;
     const avg = weekdays.reduce((s, d) => s + computeGoalPct(data[d]||{}, cfg.weekdayMetrics||[], goals), 0) / weekdays.length;
     return { userId: r.userId, name: r.userName, industry, weekAvg: Math.round(avg), spaceId: r.spaceId, spaceName: r.spaceName };
    } catch { return null; }
   }));

   // Add self
   const myWeekdays = Object.keys(myData).filter(d => d >= weekStart && !isWeekend(d));
   const myAvg = myWeekdays.length
    ? Math.round(myWeekdays.reduce((s,d) => s + computeGoalPct(myData[d]||{}, indConfig?.weekdayMetrics||[], myGoals, myGoalPeriods), 0) / myWeekdays.length)
    : 0;
   const selfRow = { userId: currentUser.id, name: currentUser.name, industry: currentUser.industry, weekAvg: myAvg, isSelf: true };

   const valid = [...results.filter(Boolean), selfRow]
    .filter(r => filter === "global" || r.industry === myIndustry)
    .sort((a,b) => b.weekAvg - a.weekAvg);

   // Anonymize non-self users: show first name + last initial only
   const display = valid.map((r, i) => ({
    ...r,
    rank: i + 1,
    displayName: r.isSelf ? r.name : (r.name.split(" ")[0] + " " + (r.name.split(" ")[1]?.[0] || "") + ".").trim(),
   }));

   setRows(display.slice(0, 25));
   const selfIdx = display.findIndex(r => r.isSelf);
   setMyRank(selfIdx >= 0 ? selfIdx + 1 : null);

   // Crew suggestions: spaces where top performers are, excluding user's current communities
   const myCommunityIds = (communities||[]).map(c=>c.id);
   const topPerformers = display.filter(r => !r.isSelf && r.rank <= 10 && r.spaceId && r.spaceId.startsWith("community-"));
   const spaceCounts = {};
   for (const r of topPerformers) {
    if (!myCommunityIds.includes(r.spaceId)) {
     spaceCounts[r.spaceId] = spaceCounts[r.spaceId] || { spaceName: r.spaceName, count: 0 };
     spaceCounts[r.spaceId].count++;
    }
   }
   setCrewSuggestions(Object.entries(spaceCounts).sort((a,b)=>b[1].count-a[1].count).slice(0,2).map(([id,v])=>({ id, ...v })));
  } catch (e) { console.error(e); }
  setLoading(false);
 }

 return (
  <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "16px", overflow: "hidden" }}>
   <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div>
     <div style={{ fontSize: "0.68rem", fontWeight: "800", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: F }}>🌍 Global Leaderboard</div>
     <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px", fontFamily: F }}>This week's pace · anonymous</div>
    </div>
    {/* Filter tabs */}
    <div style={{ display: "flex", gap: "4px", background: "var(--bg-0)", borderRadius: "8px", padding: "3px" }}>
     {[["industry","My Industry"],["global","Everyone"]].map(([k,l]) => (
      <button key={k} onClick={() => setFilter(k)}
       style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "0.68rem", fontWeight: "700", cursor: "pointer", border: "none", fontFamily: F,
        background: filter===k ? "var(--accent)" : "transparent", color: filter===k ? "#000" : "var(--text-muted)" }}>
       {l}
      </button>
     ))}
    </div>
   </div>

   {loading && <div style={{ padding: "20px", textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: F }}>Loading…</div>}

   {!loading && rows.length > 0 && (
    <div style={{ maxHeight: "280px", overflowY: "auto" }}>
     {rows.slice(0,10).map(r => (
      <div key={r.userId} style={{
       display: "flex", alignItems: "center", gap: "10px", padding: "9px 16px",
       background: r.isSelf ? "rgba(29,201,232,0.06)" : "transparent",
       borderBottom: "1px solid var(--border-0)",
      }}>
       <span style={{ fontSize: "0.75rem", fontWeight: "800", color: r.rank <= 3 ? ["#FFD700","#C0C0C0","#CD7F32"][r.rank-1] : "var(--text-dim)", width: "18px", textAlign: "right", flexShrink: 0, fontFamily: F }}>
        {r.rank <= 3 ? ["🥇","🥈","🥉"][r.rank-1] : r.rank}
       </span>
       <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.82rem", fontWeight: r.isSelf ? "800" : "500", color: r.isSelf ? "var(--accent)" : "var(--text-primary)", fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
         {r.displayName}{r.isSelf ? " (you)" : ""}
        </div>
       </div>
       <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <div style={{ width: "60px", height: "4px", background: "var(--bg-3)", borderRadius: "2px", overflow: "hidden" }}>
         <div style={{ height: "100%", width: `${Math.min(100,r.weekAvg)}%`, background: r.isSelf ? "var(--accent)" : "var(--bg-4)", borderRadius: "2px" }} />
        </div>
        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: r.isSelf ? "var(--accent)" : "var(--text-muted)", fontFamily: F, width: "34px", textAlign: "right" }}>{r.weekAvg}%</span>
       </div>
      </div>
     ))}
    </div>
   )}

   {!loading && rows.length <= 1 && (
    <div style={{ padding: "16px", fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: F, lineHeight: 1.5 }}>
     More Cadence users will appear here as the platform grows. For now — you're setting the standard.
    </div>
   )}

   {/* Crew suggestions from leaderboard */}
   {crewSuggestions.length > 0 && (
    <div style={{ padding: "12px 16px 14px", borderTop: "1px solid var(--border-1)" }}>
     <div style={{ fontSize: "0.62rem", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", fontFamily: F }}>⚡ Top performers are in these Crews</div>
     {crewSuggestions.map(s => (
      <button key={s.id} onClick={() => onNavigateToCrew && onNavigateToCrew()}
       style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(29,201,232,0.05)", border: "1px solid rgba(29,201,232,0.15)", borderRadius: "10px", padding: "9px 12px", cursor: "pointer", fontFamily: F, marginBottom: "6px", WebkitTapHighlightColor: "transparent" }}>
       <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-primary)" }}>⚡ {s.spaceName}</div>
       <div style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: "700" }}>View →</div>
      </button>
     ))}
    </div>
   )}

   {myRank && <div style={{ padding: "8px 16px 12px", fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: F }}>
    You rank #{myRank} in {filter === "industry" ? "your industry" : "all of Cadence"} this week
   </div>}
  </div>
 );
}
function HomeScreen({ currentUser, myData, indConfig, myGoals, myGoalPeriods, activeTrack,
  feed, users, allUsersData, allUserGoals, industryConfigs,
  orgId, communities, communityMembers, admins, activeSpace,
  userTracks, onNavigate, onPostToFeed, pacerSettings, isPro, onShowPaywall }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
 const now = todayStr();
 const hour = new Date().getHours();
 const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
 const isWeekendToday = isWeekend(now);
 const todayData = myData[now] || {};
 const [aiDigest, setAiDigest] = useState(null);
 const [digestLoading, setDigestLoading] = useState(false);
 const [digestDismissed, setDigestDismissed] = useState(false);

 // ── Freight Industry Intel — daily brief, cached by date ──────────────────
 const [freightBrief, setFreightBrief] = useState(null);
 const [freightLoading, setFreightLoading] = useState(false);
 const [freightDismissed, setFreightDismissed] = useState(false);
 const FREIGHT_BRIEF_KEY = `cadence-freight-brief-${new Date().toISOString().slice(0,10)}-${currentUser?.id}`;
 const [challenges, setChallenges] = useState([]);
 const [accPairs, setAccPairs] = useState([]);
 const [showChallengePickerModal, setShowChallengePickerModal] = useState(false);
 const isSolo = !(communities && communities.length > 0);

 // ── Affiliate opt-in state ────────────────────────────────────────────────
 const [affiliateStatus, setAffiliateStatus] = React.useState(null); // null=loading, "none"|"enrolled"
 const [showAffiliateModal, setShowAffiliateModal] = React.useState(false);
 const [affiliateJoining, setAffiliateJoining] = React.useState(false);
 const [affiliateJoined, setAffiliateJoined] = React.useState(false);
 const [affiliateCTADismissed, setAffiliateCTADismissed] = React.useState(() => {
  try { return !!localStorage.getItem(`cadence-affiliate-cta-dismissed-${currentUser?.id}`); } catch { return false; }
 });

 React.useEffect(() => {
  if (!currentUser?.id || !window._sb) { setAffiliateStatus("none"); return; }
  window._sb.from("affiliate_enrollments").select("user_id").eq("user_id", currentUser.id).maybeSingle()
   .then(({ data }) => setAffiliateStatus(data ? "enrolled" : "none"))
   .catch(() => setAffiliateStatus("none"));
 }, [currentUser?.id]);

 async function joinAffiliate() {
  if (!currentUser?.id || !window._sb) return;
  setAffiliateJoining(true);
  const base = (currentUser?.name || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 6);
  const uid  = (currentUser?.id || "").replace(/-/g, "").slice(-4);
  const code = `${base}${uid}`;
  const { error } = await window._sb.from("affiliate_enrollments")
   .upsert({ user_id: currentUser.id, referral_code: code, enrolled_at: new Date().toISOString() }, { onConflict: "user_id" });
  setAffiliateJoining(false);
  if (!error) { setAffiliateJoined(true); setAffiliateStatus("enrolled"); }
 }

 // ── Pacer Command Center — AI-generated headline + action tiles ──────────

 // ── Pacer Command Center — deterministic, instant, no API call ─────────────
 // buildDashCommand replaces the old AI-generated approach.
 // Same tile actions, same data — just no latency or API cost.
 const [commandDismissed, setCommandDismissed] = useState(false);
 const lastFeedVisitKey = `cadence-last-feed-visit-${currentUser?.id}`;
 const [feedActivitySince, setFeedActivitySince] = useState(0);
 useEffect(() => {
  if (!currentUser || !feed) return;
  storageGet(ns(lastFeedVisitKey)).then(last => {
   const lastTs = parseInt(last || "0");
   setFeedActivitySince((feed || []).filter(p => p.ts > lastTs).length);
  }).catch(() => {});
 }, [currentUser?.id, feed?.length]);

 function buildDashCommand() {
  const h = new Date().getHours();
  const isWknd = isWeekend(todayStr());
  const metrics = indConfig?.weekdayMetrics || [];
  const pct = isWknd || !metrics.length ? null : computeGoalPct(myData[todayStr()]||{}, metrics, myGoals, myGoalPeriods);
  const streakVal = computeStreak(myData)?.current || 0;
  const newFeed = feedActivitySince;

  const ws = (label, detail, urgent=false) => ({ id:"tracker", icon:"⚡", label, actionKey:"tracker", urgent, detail });
  const jn = (label, detail) => ({ id:"journal", icon:"📓", label, actionKey:"journal", urgent:false, detail });
  const hi = (label) => ({ id:"history", icon:"📈", label, actionKey:"history", urgent:false });
  const cm = () => ({ id:"community", icon:"👥", label:`${newFeed} new post${newFeed>1?"s":""}`, actionKey:"community", urgent:false });

  // ── Platform intent: desktop = work mode, mobile = reflection/social mode ──
  // Desktop gets "get to work" framing. Mobile leads with social/reflection.

  if (isWknd) {
   if (isMobile) {
    // Mobile weekend: reflection + social first
    return { headline: "Your weekend.", subline: streakVal > 1 ? `${streakVal}-day streak protected.` : "Rest. Come back Monday.", tiles: [jn("Reflect on the week"), ...(newFeed>0?[cm()]:[hi("Review your numbers")]) ] };
   }
   return { headline: "Good week. This is your time.", subline: streakVal > 1 ? `${streakVal}-day streak intact.` : "Rest. Reflect. Reset.", tiles: [jn("Reflect on the week"), hi("Review your numbers"), ...(newFeed>0?[cm()]:[]) ] };
  }
  if (h < 6) {
   return { headline: "You're up early.", subline: "Day hasn't started yet.", tiles: [jn("Write one intention")] };
  }
  if (h < 9) {
   if (isMobile) {
    // Mobile morning: plan + check in on crew
    return { headline: "Morning.", subline: streakVal>1 ? `${streakVal} days going.` : "New day.", tiles: [jn("Set an intention"), ...(newFeed>0?[cm()]:[ws("Start logging")]) ] };
   }
   // Desktop morning: get to work
   return { headline: "Day's wide open.", subline: streakVal>1 ? `${streakVal} days going.` : "Fresh start.", tiles: [ws("Start logging"), jn("Set an intention"), ...(newFeed>0?[cm()]:[]) ] };
  }
  if (h >= 21) {
   if (isMobile) {
    // Mobile late night: reflection, see how crew did
    return { headline: "Day's done.", subline: pct !== null ? `You closed at ${pct}%.` : "Good night.", tiles: [jn("Write it down"), ...(newFeed>0?[cm()]:[]) ] };
   }
   return { headline: "Day's done.", subline: pct !== null ? `Closed at ${pct}%.` : "Rest up.", tiles: [jn("Write it down")] };
  }
  if (h >= 18) {
   if (isMobile) {
    // Mobile evening: debrief + crew check
    return { headline: pct >= 80 ? "Strong day." : pct > 0 ? `${pct}% — decent day.` : "Nothing logged today.", subline: "How did your crew do?", tiles: [...(newFeed>0?[cm()]:[]), jn("Journal the day")] };
   }
   return { headline: pct >= 80 ? "Strong day." : pct > 0 ? `Closed at ${pct}%.` : "Nothing logged.", subline: "Wind down.", tiles: [jn("Journal the day"), hi("See the week"), ...(newFeed>0?[cm()]:[]) ] };
  }
  // Work hours — desktop: urgency. Mobile: check in + social.
  if (pct !== null && pct < 40 && h >= 14) {
   if (isMobile) {
    return { headline: `${pct}% — still time.`, subline: "Log something. Protect the day.", tiles: [ws("Log now", null, true), ...(newFeed>0?[cm()]:[]) ] };
   }
   return { headline: `${pct}% — behind with ${18-h}h left.`, subline: "Time to push.", tiles: [ws("Catch up now", null, true), ...(newFeed>0?[cm()]:[hi("See where you stand")]) ] };
  }
  if (pct !== null && pct >= 100) {
   if (isMobile) {
    return { headline: "Goals hit. 🎯", subline: "See how your crew's doing.", tiles: [...(newFeed>0?[cm()]:[jn("Reflect on what worked")]), ws("Keep logging")] };
   }
   return { headline: "Goals hit.", subline: "Keep going or write it down.", tiles: [ws("Keep logging"), jn("Reflect on what worked")] };
  }
  if (pct !== null && pct >= 70) {
   return { headline: `${pct}% — closing in.`, subline: "Don't let up.", tiles: [ws("Finish strong", null, true), ...(newFeed>0?[cm()]:[]) ] };
  }
  if (isMobile) {
   // Mobile default during work hours: softer, social-aware
   return { headline: pct !== null ? `${pct}% today.` : "Hey.", subline: streakVal > 1 ? `${streakVal}-day streak.` : "Ready when you are.", tiles: [...(newFeed>0?[cm()]:[jn("Check in")]), ws("Log activity")] };
  }
  // Desktop default: work focus
  return { headline: pct !== null ? `${pct}% today.` : "Ready when you are.", subline: streakVal > 1 ? `${streakVal}-day streak.` : "Let's go.", tiles: [ws("Log activity"), ...(newFeed>0?[cm()]:[hi("View history")]) ] };
 }

 function handleCommandTile(tile) {
  haptic.medium();
  const key = tile.actionKey;
  if (key === "workspace") onNavigate("tracker");
  else if (key === "journal")   onNavigate("journal");
  else if (key === "history")   onNavigate("history");
  else if (key === "community") { storageSet(ns(lastFeedVisitKey), Date.now().toString()).catch(()=>{}); setFeedActivitySince(0); onNavigate("crews"); }
 }
 // Time-of-day mode — drives off-hours UI
 const timeMode = (() => {
  if (isWeekendToday) return "weekend";
  if (hour < 7)  return "early-morning";
  if (hour < 9)  return "morning";
  if (hour >= 21) return "late-night";
  if (hour >= 18) return "evening";
  return "work";
 })();

 // Week summary for off-hours cards
 const weekSummary = (() => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
   const d = new Date(); d.setDate(d.getDate() - i);
   const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
   if (!isWeekend(ds) && myData[ds]) {
    const pct = computeGoalPct(myData[ds]||{}, indConfig?.weekdayMetrics||[], myGoals||{}, myGoalPeriods);
    days.push({ ds, pct });
   }
  }
  const avg = days.length ? Math.round(days.reduce((s,d)=>s+d.pct,0)/days.length) : 0;
  const best = days.length ? Math.max(...days.map(d=>d.pct)) : 0;
  const daysAt100 = days.filter(d=>d.pct>=100).length;
  return { days, avg, best, daysAt100, logged: days.length };
 })();

 // Today's performance
 const todayPct = isWeekendToday ? null : (() => {
  const metrics = indConfig?.weekdayMetrics || [];
  if (!metrics.length) return null;
  return computeGoalPct(todayData, metrics, myGoals, myGoalPeriods);
 })();

 const pacerCommand = useMemo(() => buildDashCommand(), [todayPct, feedActivitySince, commandDismissed]);

 // Active metrics with progress
 const metricProgress = (indConfig?.weekdayMetrics || []).map(m => {
  const goal = myGoals[m.key] ?? m.defaultGoal ?? 0;
  const val = todayData[m.key] || 0;
  return { ...m, val, goal, pct: goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0 };
 }).filter(m => m.goal > 0);

 // Streak
 const streak = computeStreak(myData);

 // Recent feed posts (for digest prompt)
 const recentPosts = (feed || []).filter(p => {
  const age = Date.now() - (p.ts || 0);
  return age < 48 * 3600000; // last 48 hours
 }).slice(0, 10);

 // Load challenges and accountability
 useEffect(() => {
  if (!activeSpace?.id || isSolo) return;
  loadChallenges(activeSpace.id).then(ch => {
   const active = (ch || []).filter(c => c.active && c.endTs > Date.now());
   const mine = active.filter(c => (c.participants || []).includes(currentUser?.id) || c.createdBy === currentUser?.id);
   setChallenges(mine.slice(0, 3));
  }).catch(() => {});
  loadAccountabilityPairs(activeSpace.id).then(pairs => {
   const mine = (pairs || []).filter(p => p.userIds?.includes(currentUser?.id));
   setAccPairs(mine.slice(0, 2));
  }).catch(() => {});
 }, [activeSpace?.id, currentUser?.id]);

 async function generateDigest() {
  if (!recentPosts.length) return;
  setDigestLoading(true);
  const postSummaries = recentPosts.map(p => `${p.userName}: "${p.text || p.movedNeedle || ""}"`).join("\n");
  const prompt = `You're writing a quick digest of recent activity for ${currentUser?.name}'s crew. Here are recent posts:\n\n${postSummaries}\n\nWrite 2-3 punchy sentences covering what happened — wins, shoutouts, momentum. Energetic but brief. No preamble.`;
  try {
   const data = await callAI({ model: "claude-sonnet-4-20250514", messages: [{ role: "user", content: prompt }], max_tokens: 200, call_type: "feed" })
   const text = (data?.content || []).filter(b => b.type === "text").map(b => b.text || "").join("").trim();
   setAiDigest(text);
  } catch(err) {
   if (err?.code === "USAGE_LIMIT") { onShowPaywall?.(); }
  }
  setDigestLoading(false);
 }

 // Pro: auto-generate digest on load. Free: manual trigger.
 useEffect(() => {
  if (isPro && recentPosts.length && !aiDigest && !digestLoading) generateDigest();
 }, [isPro, recentPosts.length]);

 // ── Freight Intel: fetch once per day, cache in localStorage ──────────────
 async function fetchFreightBrief() {
  if (freightLoading || freightBrief) return;
  setFreightLoading(true);
  try {
   const cacheKey = FREIGHT_BRIEF_KEY;
   try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
     const cached = JSON.parse(raw);
     if (new Date(cached.ts||0).toDateString() === new Date().toDateString()) {
      setFreightBrief(cached); setFreightLoading(false); return;
     }
    }
   } catch {}
   const dateStr = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
   const month = new Date().toLocaleString("en-US",{month:"long"});
   const season = ["January","February","March"].includes(month)?"Q1 (winter/early spring)":["April","May","June"].includes(month)?"Q2 (spring)":["July","August","September"].includes(month)?"Q3 (summer)":"Q4 (peak season/holiday)";
   const systemPrompt = `You are a freight market analyst briefing an outbound freight broker before their call block. Today is ${dateStr} (${season}).

Write a sharp, specific daily market brief based on your knowledge of current freight market conditions, seasonal patterns, and ${season} dynamics. Be confident and direct — use real numbers and real lane names. Do not hedge or say you lack real-time data.

Format exactly (start directly with first emoji, zero preamble):

📈 SPOT MARKET
[Specific flatbed, dry van, and reefer rate ranges for ${season}. Name hot lanes. Give load-to-truck ratios. Example: "Flatbed LTR ~3.8 nationally, Southeast tightening into construction season. Dry van soft outside produce corridors."]

🚛 CAPACITY
[Regional tightness picture. Which markets are loose vs. tight. Driver availability signals. 2-3 sentences max.]

📰 THIS WEEK
[3 specific things impacting freight right now — tariff news, fuel prices, weather disruptions, manufacturing data, port activity, peak season timing. Tie each to a shipper conversation angle.]

📞 YOUR ANGLE TODAY
[One punchy, quotable cold-call hook an outbound broker can use verbatim TODAY. Tie to a real market condition above. Put it in quotes. Example: "Flatbed is tightening faster than shippers expect — if you're not locking in Q2 capacity now, you're already behind."]

Under 260 words. Direct. No disclaimers. No "based on my knowledge" hedges.`;
   const res = await callAI({
    model: "claude-sonnet-4-20250514",
    system: systemPrompt,
    messages: [{ role:"user", content: `Write the freight market brief for ${dateStr}.` }],
    max_tokens: 700,
    call_type: "freight_intel",
   });
   // Extract text — no tool use, direct response
   const textBlocks = (res?.content||[]).filter(b=>b.type==="text").map(b=>b.text||"");
   const text = textBlocks.join("").trim();
   if (text) {
    const brief = { text, ts: Date.now(), date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}) };
    setFreightBrief(brief);
    try { localStorage.setItem(cacheKey, JSON.stringify(brief)); } catch {}
   }
  } catch(e) {
   if (e?.code === "USAGE_LIMIT") onShowPaywall?.();
  }
  setFreightLoading(false);
 }

 useEffect(() => {
  if (!isPro || freightBrief || freightLoading) return;
  const t = setTimeout(fetchFreightBrief, 1500);
  return () => clearTimeout(t);
 }, [isPro, currentUser?.id]);

 const card = { background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "16px", overflow: "hidden" };
 const sectionLabel = { fontSize: "0.68rem", fontWeight: "800", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.12em" };

 const day = new Date();
 const dayName2 = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][day.getDay()];
 const monthName = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][day.getMonth()];

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "8px" }}>

   {/* ── Header: greeting + date ── */}
   <div data-tour-greeting style={{ paddingTop: "4px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
    <div>
     <div style={{ fontSize: "clamp(0.95rem,3vw,1.1rem)", fontWeight: "800", color: "var(--text-primary)", fontFamily: F, lineHeight: 1.2 }}>
      {isWeekendToday ? "Weekend 🌿" : `${dayName2}, ${monthName} ${day.getDate()}`}
     </div>
     {activeTrack && (
      <div style={{ fontSize: "0.78rem", color: "var(--accent)", marginTop: "3px", fontWeight: "600" }}>
       {activeTrack.icon || "◆"} {activeTrack.name}
      </div>
     )}
    </div>
    {streak.current > 0 && (
     <div style={{ display: "flex", alignItems: "center", gap: "5px", background: streak.current >= 7 ? "rgba(245,158,11,0.12)" : "var(--bg-2)", border: `1px solid ${streak.current >= 7 ? "rgba(245,158,11,0.3)" : "var(--border-1)"}`, borderRadius: "20px", padding: "5px 10px" }}>
      <span style={{ fontSize: "0.85rem" }}>{streak.current >= 7 ? "🔥" : "⚡"}</span>
      <span style={{ fontSize: "0.82rem", fontWeight: "800", color: streak.current >= 7 ? "#F59E0B" : "var(--accent)", fontFamily: F }}>{streak.current}d</span>
     </div>
    )}
   </div>

   {/* ── Mobile: crew activity / social pulse FIRST ── */}
   {isMobile && !isSolo && recentPosts.length > 0 && (
    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "14px", overflow: "hidden" }}>
     <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: F }}>Crew Activity</div>
      <button onClick={() => onNavigate("crews")} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", fontFamily: F, padding: 0 }}>See all →</button>
     </div>
     {aiDigest && !digestDismissed ? (
      <div style={{ padding: "10px 16px 12px" }}>
       <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", lineHeight: 1.55, fontFamily: F }}>{aiDigest}</div>
       <button onClick={() => setDigestDismissed(true)} style={{ marginTop: "6px", background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.65rem", cursor: "pointer", fontFamily: F, padding: 0 }}>Dismiss</button>
      </div>
     ) : digestLoading ? (
      <div style={{ padding: "10px 16px", fontSize: "0.78rem", color: "var(--text-dim)", fontFamily: F }}>Reading crew activity…</div>
     ) : (
      <div style={{ padding: "10px 16px" }}>
       {recentPosts.slice(0, 3).map((post, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", padding: "5px 0", borderBottom: i < Math.min(recentPosts.length, 3) - 1 ? "1px solid var(--border-1)" : "none" }}>
         <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", flexShrink: 0, fontFamily: F, fontWeight: 800, color: "var(--accent)" }}>
          {(post.userName || "?").slice(0, 1).toUpperCase()}
         </div>
         <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: F }}>{post.userName} </span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: F }}>{(post.text || post.movedNeedle || "logged activity").slice(0, 60)}</span>
         </div>
        </div>
       ))}
      </div>
     )}
    </div>
   )}

   {/* ── Pacer command — situational, dismissable ── */}
   {!commandDismissed && pacerCommand && (
    <div style={{ ...card, background: "linear-gradient(135deg, rgba(29,201,232,0.06) 0%, rgba(123,111,216,0.04) 100%)", borderColor: "rgba(29,201,232,0.18)", position: "relative" }}>
     <button onClick={() => setCommandDismissed(true)} style={{ position: "absolute", top: "8px", right: "8px", background: "var(--bg-3,#1a1a2e)", border: "1px solid var(--border-2,#444)", borderRadius: "6px", color: "var(--text-muted,#aaa)", cursor: "pointer", padding: "3px 8px", fontSize: "0.75rem", lineHeight: 1, WebkitTapHighlightColor: "transparent", fontWeight: "700" }}>✕</button>
     <div style={{ padding: "14px 40px 12px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "9px", marginBottom: pacerCommand.tiles?.length ? "10px" : "0" }}>
       <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "linear-gradient(135deg,#1DC9E8,#7B6FD8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", flexShrink: 0 }}>⚡</div>
       <div>
        <div style={{ fontSize: "0.93rem", fontWeight: "800", color: "var(--text-primary)", fontFamily: F, lineHeight: 1.3 }}>{pacerCommand.headline}</div>
        {pacerCommand.subline && <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px", lineHeight: 1.4, fontFamily: F }}>{pacerCommand.subline}</div>}
       </div>
      </div>
     </div>
     {pacerCommand.tiles?.length > 0 && (
      <div style={{ padding: "0 12px 12px", display: "flex", gap: "7px", flexWrap: "wrap" }}>
       {pacerCommand.tiles.map(tile => (
        <button key={tile.id} onClick={() => handleCommandTile(tile)}
         style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 12px", background: tile.urgent ? "rgba(29,201,232,0.1)" : "var(--bg-2)", border: `1px solid ${tile.urgent ? "rgba(29,201,232,0.3)" : "var(--border-1)"}`, borderRadius: "10px", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
         <span style={{ fontSize: "1rem" }}>{tile.icon}</span>
         <span style={{ fontSize: "0.82rem", fontWeight: "700", color: tile.urgent ? "var(--accent)" : "var(--text-primary)" }}>{tile.label}</span>
        </button>
       ))}
      </div>
     )}
    </div>
   )}

   {/* ── Today's progress — the hero card ── */}
   <div data-tour-progress style={{ ...card, padding: "18px 20px" }}>
    {/* Header row */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
     <div style={{ fontSize: "0.7rem", fontWeight: "800", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
      {isWeekendToday ? "⏱ Overtime" : "Today's Progress"}
     </div>
     {!isWeekendToday && todayPct !== null && (
      <div style={{ fontSize: "1.8rem", fontWeight: "900", color: todayPct >= 100 ? "#4ACF86" : todayPct >= 60 ? "var(--accent)" : "var(--text-primary)", fontFamily: F, lineHeight: 1 }}>
       {todayPct}%
      </div>
     )}
    </div>

    {/* Metric bars */}
    {isWeekendToday ? (() => {
     const logged = metricProgress.filter(m => m.val > 0);
     if (!logged.length) return (
      <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontFamily: F, textAlign: "center", padding: "8px 0" }}>Rest day. Come back Monday 💪</div>
     );
     return (
      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
       {logged.map(m => (
        <div key={m.key}>
         <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: F }}>{m.short || m.label}</span>
          <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "#4ACF86", fontFamily: F }}>{m.val} <span style={{ color: "var(--text-dim)", fontWeight: "400", fontSize: "0.68rem" }}>logged</span></span>
         </div>
         <div style={{ height: "4px", background: "var(--bg-3)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: "100%", background: "rgba(74,207,134,0.4)", borderRadius: "3px" }} />
         </div>
        </div>
       ))}
      </div>
     );
    })() : metricProgress.length > 0 ? (
     <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {metricProgress.slice(0, 4).map(m => (
       <div key={m.key}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
         <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: F }}>{m.short || m.label}</span>
         <span style={{ fontSize: "0.8rem", fontWeight: "700", color: m.pct >= 100 ? "#4ACF86" : "var(--text-primary)", fontFamily: F }}>
          {m.val} <span style={{ color: "var(--text-dim)", fontWeight: "400", fontSize: "0.72rem" }}>/ {m.goal}</span>
         </span>
        </div>
        <div style={{ height: "5px", background: "var(--bg-3)", borderRadius: "3px", overflow: "hidden" }}>
         <div style={{ height: "100%", width: `${m.pct}%`, background: m.pct >= 100 ? "#4ACF86" : m.color || "var(--accent)", borderRadius: "3px", transition: "width 0.6s ease" }} />
        </div>
       </div>
      ))}
     </div>
    ) : (
     <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontFamily: F, textAlign: "center", padding: "4px 0 8px" }}>No goals set yet — <button onClick={() => onNavigate("settings")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontFamily: F, fontSize: "0.85rem", fontWeight: "700", padding: 0 }}>set them up →</button></div>
    )}

    {/* CTA */}
    {!isWeekendToday && (() => {
     const behindMetric = metricProgress.find(m => m.pct < 50 && m.goal > 0);
     const label = todayPct >= 100 ? "Keep the Momentum →"
      : streak.current >= 7 && todayPct < 30 && new Date().getHours() >= 14 ? `Protect the Streak →`
      : behindMetric && new Date().getHours() >= 14 ? `Catch Up on ${behindMetric.short || behindMetric.label} →`
      : todayPct === 0 ? "Start Logging →"
      : "Keep Going →";
     return (
      <button onClick={() => onNavigate("tracker")}
       style={{ marginTop: "14px", width: "100%", background: "linear-gradient(135deg,#1DC9E8 0%,#0EA5C9 100%)", color: "#000", border: "none", padding: "14px 20px", borderRadius: "12px", fontWeight: "900", fontSize: "1rem", cursor: "pointer", fontFamily: F, letterSpacing: "-0.01em", boxShadow: "0 3px 14px rgba(29,201,232,0.25)", WebkitTapHighlightColor: "transparent" }}>
       {label}
      </button>
     );
    })()}

    {/* Inline Pacer whisper */}
    {!isWeekendToday && (
     <PacerWhisper variant="home" todayPct={todayPct} myData={myData} indConfig={indConfig} myGoals={myGoals} myGoalPeriods={myGoalPeriods} style={{ marginTop: "8px" }} />
    )}
   </div>

   {/* ── Freight Industry Intel — daily brief powered by AI + web search ── */}
   {!freightDismissed && isPro && !isWeekendToday && (
    <div style={{ background:"var(--bg-1)", border:"1px solid rgba(29,201,232,0.18)", borderRadius:"16px", overflow:"hidden" }}>
     {/* Header */}
     <div style={{ padding:"12px 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(29,201,232,0.1)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
       <span style={{ fontSize:"0.95rem" }}>📡</span>
       <div>
        <div style={{ fontSize:"0.68rem", fontWeight:800, color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:F }}>Freight Intel</div>
        {freightBrief?.date && <div style={{ fontSize:"0.6rem", color:"var(--text-dim)", fontFamily:F }}>{freightBrief.date} · AI market brief</div>}
       </div>
      </div>
      <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
       {!freightBrief && !freightLoading && (
        <button onClick={fetchFreightBrief}
         style={{ background:"rgba(29,201,232,0.1)", border:"1px solid rgba(29,201,232,0.25)", borderRadius:"8px", padding:"5px 10px", fontSize:"0.68rem", fontWeight:800, color:"var(--accent)", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
         Load brief
        </button>
       )}
       {freightBrief && (
        <button onClick={()=>{ setFreightBrief(null); try { localStorage.removeItem(FREIGHT_BRIEF_KEY); } catch {} setTimeout(fetchFreightBrief, 100); }}
         style={{ background:"none", border:"1px solid var(--border-1)", borderRadius:"8px", padding:"4px 8px", fontSize:"0.62rem", color:"var(--text-dim)", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
         🔄
        </button>
       )}
       <button onClick={()=>setFreightDismissed(true)}
        style={{ background:"none", border:"none", color:"var(--text-dim)", fontSize:"0.85rem", cursor:"pointer", padding:"2px 4px", lineHeight:1 }}>✕</button>
      </div>
     </div>
     {/* Content */}
     <div style={{ padding:"12px 16px 14px" }}>
      {freightLoading && (
       <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"16px", height:"16px", borderRadius:"50%", border:"2px solid rgba(29,201,232,0.3)", borderTopColor:"var(--accent)", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
        <span style={{ fontSize:"0.78rem", color:"var(--text-dim)", fontFamily:F }}>Scanning freight news…</span>
       </div>
      )}
      {freightBrief && !freightLoading && (
       <div style={{ fontSize:"0.78rem", color:"var(--text-primary)", lineHeight:1.7, fontFamily:F, whiteSpace:"pre-wrap" }}>
        {freightBrief.text}
       </div>
      )}
      {!freightBrief && !freightLoading && (
       <div style={{ fontSize:"0.78rem", color:"var(--text-dim)", fontFamily:F, fontStyle:"italic" }}>
        Daily freight market brief — spot rates, capacity, news, and your outbound angle for today.
       </div>
      )}
     </div>
     <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
   )}

   {/* ── Active challenge pill — compact, only if relevant ── */}
   {challenges.length > 0 && (
    <button onClick={() => onNavigate("crews")} style={{ display: "flex", alignItems: "center", gap: "10px", ...card, padding: "12px 16px", cursor: "pointer", WebkitTapHighlightColor: "transparent", textAlign: "left", width: "100%", boxSizing: "border-box" }}>
     <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚡</span>
     <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{challenges[0].title}</div>
      <div style={{ height: "3px", background: "var(--bg-3)", borderRadius: "2px", marginTop: "5px", overflow: "hidden", maxWidth: "140px" }}>
       <div style={{ height: "100%", width: `${Math.min(100, challenges[0].target > 0 ? Math.round(((allUsersData[currentUser?.id]?.[todayStr()]?.[challenges[0].metric] || 0) / challenges[0].target) * 100) : 0)}%`, background: "var(--accent)", borderRadius: "2px" }} />
      </div>
     </div>
     {challenges.length > 1 && <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: F, flexShrink: 0 }}>+{challenges.length - 1} more</span>}
     <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", flexShrink: 0 }}>→</span>
    </button>
   )}

   {/* ── Week so far — only shows Mon-Fri, collapsed into one card ── */}
   {!isWeekendToday && weekSummary.logged > 1 && (()=>{
    const [wkExpanded, setWkExpanded] = React.useState(false);
    const metrics = indConfig?.weekdayMetrics || [];
    const dowNames = {1:"Mon",2:"Tue",3:"Wed",4:"Thu",5:"Fri",6:"Sat",0:"Sun"};
    return (
     <div style={{ ...card, padding: "0" }}>
      {/* Header row — always visible, clickable */}
      <button onClick={()=>setWkExpanded(v=>!v)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"none", border:"none", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
       <div style={{ fontSize:"0.68rem", fontWeight:"800", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em" }}>This Week</div>
       <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
        <span style={{ fontSize:"0.88rem", fontWeight:"800", color: weekSummary.avg >= 80 ? "#4ACF86" : weekSummary.avg >= 50 ? "var(--accent)" : "var(--text-muted)", fontFamily:F }}>{weekSummary.avg}% avg</span>
        <span style={{ fontSize:"0.72rem", color:"var(--text-dim)" }}>{wkExpanded ? "▲" : "▼"}</span>
       </div>
      </button>

      {/* Collapsed: 3 stats */}
      {!wkExpanded && (
       <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px", padding:"0 16px 14px" }}>
        {[
         { label:"Avg", value:`${weekSummary.avg}%`, color: weekSummary.avg >= 80 ? "#4ACF86" : weekSummary.avg >= 50 ? "var(--accent)" : "var(--text-muted)" },
         { label:"Best day", value:`${weekSummary.best}%`, color:"var(--text-secondary)" },
         { label:"100% days", value:`${weekSummary.daysAt100}`, color: weekSummary.daysAt100 >= 3 ? "#4ACF86" : "var(--text-muted)" },
        ].map(s => (
         <div key={s.label} style={{ textAlign:"center" }}>
          <div style={{ fontSize:"1.2rem", fontWeight:"900", color:s.color, fontFamily:F, lineHeight:1 }}>{s.value}</div>
          <div style={{ fontSize:"0.62rem", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.07em", marginTop:"3px" }}>{s.label}</div>
         </div>
        ))}
       </div>
      )}

      {/* Expanded: per-day breakdown + metric totals + journal excerpts */}
      {wkExpanded && (
       <div style={{ borderTop:"1px solid var(--border-1)", padding:"12px 16px 14px", display:"flex", flexDirection:"column", gap:"12px" }}>
        {/* Per-day bar chart */}
        <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
         {weekSummary.days.map(day => {
          const dow = new Date(day.ds + "T12:00:00").getDay();
          const dayMetrics = metrics.slice(0,3).map(m => ({ label: m.short||m.label, val: myData[day.ds]?.[m.key] || 0, goal: myGoals[m.key] ?? m.defaultGoal ?? 0 }));
          const barW = Math.min(100, day.pct);
          const col = day.pct >= 100 ? "#4ACF86" : day.pct >= 60 ? "var(--accent)" : "#E05577";
          return (
           <div key={day.ds} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontSize:"0.68rem", color:"var(--text-dim)", fontWeight:"600", width:"26px", flexShrink:0 }}>{dowNames[dow]}</span>
            <div style={{ flex:1, height:"6px", background:"var(--bg-3)", borderRadius:"3px", overflow:"hidden" }}>
             <div style={{ height:"100%", width:`${barW}%`, background:col, borderRadius:"3px", transition:"width 0.3s" }} />
            </div>
            <span style={{ fontSize:"0.72rem", fontWeight:"700", color:col, width:"34px", textAlign:"right", flexShrink:0 }}>{day.pct}%</span>
            {dayMetrics.filter(m => m.goal > 0).slice(0,2).map(m => (
             <span key={m.label} style={{ fontSize:"0.64rem", color:"var(--text-dim)", flexShrink:0 }}>{m.val} {m.label}</span>
            ))}
           </div>
          );
         })}
        </div>

        {/* Metric totals for the week */}
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
         {metrics.slice(0,4).map(m => {
          const total = weekSummary.days.reduce((s,d) => s + (myData[d.ds]?.[m.key] || 0), 0);
          if (!total) return null;
          return (
           <div key={m.key} style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"8px", padding:"5px 10px", display:"flex", flexDirection:"column", alignItems:"center", minWidth:"52px" }}>
            <span style={{ fontSize:"1rem", fontWeight:"800", color:"var(--text-secondary)", fontFamily:F, lineHeight:1 }}>{total}</span>
            <span style={{ fontSize:"0.6rem", color:"var(--text-dim)", marginTop:"2px", textTransform:"uppercase", letterSpacing:"0.05em" }}>{m.short||m.label}</span>
           </div>
          );
         }).filter(Boolean)}
        </div>

        {/* Journal entries from this week */}
        {(()=>{
         const weekStart = weekSummary.days[0]?.ds;
         if (!weekStart || !appJournalEntries?.length) return null;
         const weekNotes = appJournalEntries.filter(e => {
          const d = new Date(e.ts||0).toISOString().slice(0,10);
          return d >= weekStart && d <= todayStr();
         }).slice(0,2);
         if (!weekNotes.length) return null;
         return (
          <div>
           <div style={{ fontSize:"0.62rem", fontWeight:"800", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>This week's journal</div>
           <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            {weekNotes.map((e,i) => {
             const snippet = Object.values(e).find(v => typeof v === "string" && v.trim().length > 20);
             if (!snippet) return null;
             return (
              <div key={i} style={{ fontSize:"0.76rem", color:"var(--text-muted)", fontStyle:"italic", lineHeight:1.45, padding:"6px 10px", background:"rgba(123,111,216,0.06)", borderRadius:"7px", borderLeft:"2px solid rgba(123,111,216,0.3)" }}>
               "{snippet.slice(0,120)}{snippet.length > 120 ? "…" : ""}"
              </div>
             );
            })}
           </div>
          </div>
         );
        })()}
       </div>
      )}
     </div>
    );
   })()}

   {/* Weekend recap */}
   {isWeekendToday && weekSummary.logged > 0 && (()=>{
    const [wkExpanded, setWkExpanded] = React.useState(false);
    const metrics = indConfig?.weekdayMetrics || [];
    const dowNames = {1:"Mon",2:"Tue",3:"Wed",4:"Thu",5:"Fri"};
    const headline = weekSummary.avg >= 80 ? "Strong week." : weekSummary.avg >= 60 ? "Solid week." : weekSummary.avg >= 40 ? "Mixed week." : "Rough week.";
    return (
     <div style={{ ...card, padding: "0" }}>
      <button onClick={()=>setWkExpanded(v=>!v)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"none", border:"none", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
       <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <span style={{ fontSize:"0.68rem", fontWeight:"800", color:"#4ACF86", textTransform:"uppercase", letterSpacing:"0.1em" }}>🌿 Week Recap</span>
        <span style={{ fontSize:"0.82rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F }}>{headline}</span>
       </div>
       <span style={{ fontSize:"0.72rem", color:"var(--text-dim)" }}>{wkExpanded ? "▲" : "▼"}</span>
      </button>

      {!wkExpanded && (
       <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px", padding:"0 16px 14px" }}>
        {[
         { label:"Week avg", value:`${weekSummary.avg}%`, color: weekSummary.avg >= 80 ? "#4ACF86" : "var(--accent)" },
         { label:"Best day", value:`${weekSummary.best}%`, color:"var(--accent)" },
         { label:"Streak", value:`${streak.current}d`, color: streak.current >= 7 ? "#F59E0B" : "var(--text-muted)" },
        ].map(s => (
         <div key={s.label} style={{ textAlign:"center" }}>
          <div style={{ fontSize:"1.1rem", fontWeight:"900", color:s.color, fontFamily:F, lineHeight:1 }}>{s.value}</div>
          <div style={{ fontSize:"0.62rem", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.07em", marginTop:"3px" }}>{s.label}</div>
         </div>
        ))}
       </div>
      )}

      {wkExpanded && (
       <div style={{ borderTop:"1px solid var(--border-1)", padding:"12px 16px 14px", display:"flex", flexDirection:"column", gap:"12px" }}>
        {/* Per-day bars */}
        <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
         {weekSummary.days.map(day => {
          const dow = new Date(day.ds + "T12:00:00").getDay();
          const barW = Math.min(100, day.pct);
          const col = day.pct >= 100 ? "#4ACF86" : day.pct >= 60 ? "var(--accent)" : "#E05577";
          return (
           <div key={day.ds} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontSize:"0.68rem", color:"var(--text-dim)", fontWeight:"600", width:"26px", flexShrink:0 }}>{dowNames[dow]||"—"}</span>
            <div style={{ flex:1, height:"6px", background:"var(--bg-3)", borderRadius:"3px", overflow:"hidden" }}>
             <div style={{ height:"100%", width:`${barW}%`, background:col, borderRadius:"3px" }} />
            </div>
            <span style={{ fontSize:"0.72rem", fontWeight:"700", color:col, width:"34px", textAlign:"right", flexShrink:0 }}>{day.pct}%</span>
           </div>
          );
         })}
        </div>

        {/* Metric totals */}
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
         {metrics.slice(0,4).map(m => {
          const total = weekSummary.days.reduce((s,d) => s + (myData[d.ds]?.[m.key] || 0), 0);
          if (!total) return null;
          return (
           <div key={m.key} style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"8px", padding:"5px 10px", display:"flex", flexDirection:"column", alignItems:"center" }}>
            <span style={{ fontSize:"1rem", fontWeight:"800", color:"var(--text-secondary)", fontFamily:F, lineHeight:1 }}>{total}</span>
            <span style={{ fontSize:"0.6rem", color:"var(--text-dim)", marginTop:"2px", textTransform:"uppercase" }}>{m.short||m.label}</span>
           </div>
          );
         }).filter(Boolean)}
        </div>

        {/* Journal snippets */}
        {(()=>{
         const weekStart = weekSummary.days[0]?.ds;
         if (!weekStart || !appJournalEntries?.length) return null;
         const weekNotes = appJournalEntries.filter(e => {
          const d = new Date(e.ts||0).toISOString().slice(0,10);
          return d >= weekStart;
         }).slice(0,2);
         if (!weekNotes.length) return null;
         return (
          <div>
           <div style={{ fontSize:"0.62rem", fontWeight:"800", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>From your journal</div>
           {weekNotes.map((e,i) => {
            const snippet = Object.values(e).find(v => typeof v === "string" && v.trim().length > 20);
            if (!snippet) return null;
            return (
             <div key={i} style={{ fontSize:"0.76rem", color:"var(--text-muted)", fontStyle:"italic", lineHeight:1.45, padding:"6px 10px", background:"rgba(123,111,216,0.06)", borderRadius:"7px", borderLeft:"2px solid rgba(123,111,216,0.3)", marginBottom:"5px" }}>
              "{snippet.slice(0,120)}{snippet.length > 120 ? "…" : ""}"
             </div>
            );
           })}
          </div>
         );
        })()}
       </div>
      )}
     </div>
    );
   })()}

   {/* ── Affiliate CTA — vaulted ── */}
   {false && (
    <div style={{ position: "relative", background: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(168,85,247,0.04) 100%)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "14px", padding: "14px 16px" }}>
     <button
      onClick={() => { setAffiliateCTADismissed(true); try { localStorage.setItem(`cadence-affiliate-cta-dismissed-${currentUser?.id}`, "1"); } catch {} }}
      style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: "0.85rem", cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}
     >✕</button>
     {affiliateStatus === "enrolled" ? (
      // Already enrolled — show their link
      <div>
       <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#F59E0B", fontFamily: F, marginBottom: "3px" }}>🤝 Closer program active</div>
       <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: F, marginBottom: "8px" }}>You're earning rewards when your referrals go Pro.</div>
       <button onClick={() => { const { setSettingsInitTab, navigateTo } = window.__cadenceNav || {}; onNavigate && window.dispatchEvent(new CustomEvent("cadence-go-settings", { detail: { tab: "refer" } })); }}
        style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "6px 14px", fontSize: "0.75rem", fontWeight: 800, color: "#F59E0B", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
        See your stats →
       </button>
      </div>
     ) : (
      // Not yet enrolled — invite them in
      <div>
       <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#F59E0B", fontFamily: F, marginBottom: "3px" }}>💸 Get paid to share Cadence</div>
       <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: F, lineHeight: 1.5, marginBottom: "8px", paddingRight: "16px" }}>
        Refer people who upgrade to Pro — earn free months or real recurring cash. No threshold to start.
       </div>
       <button onClick={() => setShowAffiliateModal(true)}
        style={{ background: "#F59E0B", color: "#000", border: "none", borderRadius: "8px", padding: "7px 16px", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
        Learn how it works →
       </button>
      </div>
     )}
    </div>
   )}

   {/* ── Affiliate Opt-In Modal — vaulted ── */}
   {false && (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
     onClick={() => !affiliateJoined && setShowAffiliateModal(false)}>
     <div style={{ background: "var(--bg-1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "20px", padding: "28px 24px", maxWidth: "400px", width: "100%", position: "relative" }}
      onClick={e => e.stopPropagation()}>
      {!affiliateJoined ? <>
       {/* Header */}
       <button onClick={() => setShowAffiliateModal(false)} style={{ position: "absolute", top: "14px", right: "14px", background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "1.1rem", cursor: "pointer", padding: "4px" }}>✕</button>
       <div style={{ fontSize: "1.8rem", marginBottom: "10px" }}>💸</div>
       <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: F, marginBottom: "6px", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
        Get paid to share Cadence
       </div>
       <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.65, fontFamily: F, marginBottom: "18px" }}>
        When someone you refer upgrades to Pro and stays subscribed, you earn — permanently.
        No application. Start immediately. The longer they stay, the more you earn.
       </div>

       {/* Tier breakdown — scannable */}
       <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
        {[
         { emoji: "🔍", tier: "Scout", range: "1–9 referrals", reward: "2 free months of Pro", sub: "per paid referral, credited to you", color: "var(--accent)" },
         { emoji: "🤝", tier: "Closer", range: "10–49 referrals", reward: "$2/month per user", sub: "real cash via Stripe, paid monthly", color: "#A855F7" },
         { emoji: "🌧️", tier: "Rainmaker", range: "50+ referrals", reward: "$3/month per user", sub: "first 3 months, then $2/mo forever", color: "#F59E0B" },
        ].map(t => (
         <div key={t.tier} style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "10px", padding: "10px 12px" }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>{t.emoji}</span>
          <div style={{ flex: 1 }}>
           <div style={{ display: "flex", gap: "8px", alignItems: "baseline", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: t.color, fontFamily: F }}>{t.tier}</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: F }}>{t.reward}</span>
           </div>
           <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontFamily: F, marginTop: "1px" }}>{t.sub} · {t.range}</div>
          </div>
         </div>
        ))}
       </div>

       {/* Trust signals — specific, not reassuring fluff */}
       <div style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "10px", padding: "11px 14px", marginBottom: "18px" }}>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6, fontFamily: F }}>
         <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "3px" }}>How the money actually moves:</strong>
         You share your link → someone upgrades to Pro → 30 days later it's confirmed (protects against refunds) → 
         Scout tier credits your account automatically. Closer/Rainmaker: you email us once to connect your Stripe account, 
         then payouts hit the 1st of every month. No minimums. No contracts. Cancel your account and earned rewards still pay out.
        </div>
       </div>

       {/* CTA */}
       <button onClick={joinAffiliate} disabled={affiliateJoining}
        style={{ width: "100%", background: "#F59E0B", color: "#000", border: "none", borderRadius: "12px", padding: "14px", fontWeight: 900, fontSize: "0.95rem", cursor: affiliateJoining ? "default" : "pointer", fontFamily: F, letterSpacing: "-0.01em", opacity: affiliateJoining ? 0.7 : 1, marginBottom: "8px" }}>
        {affiliateJoining ? "Joining…" : "I'm in — get my link →"}
       </button>
       <button onClick={() => setShowAffiliateModal(false)}
        style={{ width: "100%", background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.75rem", cursor: "pointer", padding: "6px", fontFamily: F }}>
        Not right now
       </button>
      </> : <>
       {/* Post-join confirmation */}
       <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🤝</div>
        <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: F, marginBottom: "8px" }}>You're in — Scout tier.</div>
        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6, fontFamily: F, marginBottom: "20px" }}>
         Your referral links are live in Settings → Refer & Earn.
         Start sharing — every Pro signup you bring in puts money back in your pocket.
        </div>
        <button onClick={() => { setShowAffiliateModal(false); window.dispatchEvent(new CustomEvent("cadence-go-settings", { detail: { tab: "refer" } })); }}
         style={{ background: "#F59E0B", color: "#000", border: "none", borderRadius: "12px", padding: "12px 24px", fontWeight: 900, cursor: "pointer", fontFamily: F, fontSize: "0.9rem" }}>
         See my links →
        </button>
       </div>
      </>}
     </div>
    </div>
   )}

   {/* ── Solo find-your-crew nudge — minimal, at the bottom ── */}
   {isSolo && (communities||[]).length === 0 && (
    <button onClick={() => onNavigate("crews")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, rgba(168,85,247,0.07) 0%, rgba(29,201,232,0.04) 100%)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: "14px", padding: "14px 16px", cursor: "pointer", WebkitTapHighlightColor: "transparent", width: "100%", boxSizing: "border-box", textAlign: "left" }}>
     <div>
      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F }}>Find your accountability crew</div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>Compete with people who track like you</div>
     </div>
     <span style={{ fontSize: "0.85rem", color: "#A855F7", flexShrink: 0, marginLeft: "10px" }}>→</span>
    </button>
   )}

   {/* Challenge space picker modal */}
   {showChallengePickerModal && (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0"}}
     onClick={()=>setShowChallengePickerModal(false)}>
     <div style={{background:"var(--bg-1)",borderRadius:"20px 20px 0 0",padding:"28px 24px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 28px)",width:"100%",maxWidth:"640px",boxShadow:"0 -8px 40px rgba(0,0,0,0.6)",maxHeight:"80vh",overflowY:"auto"}}
      onClick={e=>e.stopPropagation()}>
      <div style={{fontSize:"1.1rem",fontWeight:"800",color:"var(--text-primary)",fontFamily:F,marginBottom:"6px"}}>Start a Challenge ⚡</div>
      <div style={{fontSize:"0.85rem",color:"var(--text-muted)",marginBottom:"20px"}}>Who do you want to compete with?</div>
      <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
       <button onClick={()=>{setShowChallengePickerModal(false); onNavigate("crews");}}
        style={{background:"rgba(29,201,232,0.08)",border:"1px solid rgba(29,201,232,0.25)",borderRadius:"14px",padding:"16px 18px",textAlign:"left",cursor:"pointer",fontFamily:F,WebkitTapHighlightColor:"transparent"}}>
        <div style={{fontSize:"1.2rem",marginBottom:"5px"}}>👥</div>
        <div style={{fontSize:"0.92rem",fontWeight:"700",color:"var(--text-primary)",marginBottom:"3px"}}>My Crew</div>
        <div style={{fontSize:"0.78rem",color:"var(--text-muted)"}}>Challenge teammates in your crew</div>
       </button>
       {(communities||[]).map(c=>(
        <button key={c.id} onClick={()=>{setShowChallengePickerModal(false); onNavigate("crews");}}
         style={{background:"rgba(168,85,247,0.08)",border:"1px solid rgba(168,85,247,0.25)",borderRadius:"14px",padding:"16px 18px",textAlign:"left",cursor:"pointer",fontFamily:F,WebkitTapHighlightColor:"transparent"}}>
         <div style={{fontSize:"1.2rem",marginBottom:"5px"}}>🌐</div>
         <div style={{fontSize:"0.92rem",fontWeight:"700",color:"var(--text-primary)",marginBottom:"3px"}}>{c.name}</div>
         <div style={{fontSize:"0.78rem",color:"var(--text-muted)"}}>Challenge members in this crew</div>
        </button>
       ))}
      </div>
      <button onClick={()=>setShowChallengePickerModal(false)}
       style={{marginTop:"16px",width:"100%",background:"none",border:"1px solid var(--border-1)",color:"var(--text-muted)",padding:"10px",borderRadius:"10px",fontSize:"0.85rem",cursor:"pointer",fontFamily:F}}>
       Cancel
      </button>
     </div>
    </div>
   )}

  </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── CompeteView — Challenges + Accountability in one tab ─────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function CompeteView({ spaceId, currentUser, allUsers, allUsersData, industryConfigs, allUserGoals, isAdmin, activeSpace, onOpenDm, onNotify, isSolo, isPro, onShowPaywall }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const card = { background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "16px", overflow: "hidden" };
 const sectionLabel = { fontSize: "0.68rem", fontWeight: "800", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.12em" };

 if (isSolo) {
  return (
   <div style={{ textAlign: "center", padding: "60px 24px" }}>
    <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>⚡</div>
    <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F, marginBottom: "8px" }}>Challenges & Accountability</div>
    <div style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.6 }}>Join or create an organization to start challenges and accountability groups with your team.</div>
   </div>
  );
 }

  const [aiRec, setAiRec] = React.useState(null);
  const [aiRecLoading, setAiRecLoading] = React.useState(false);
  const [aiRecDismissed, setAiRecDismissed] = React.useState(false);

  async function loadAiRec() {
    if (!currentUser || !allUsers?.length || aiRec || aiRecDismissed || !isAdmin) return;
    const today = todayStr();
    const cacheKey = `cadence-compete-rec-${spaceId}-${today}`;
    try { const cached = localStorage.getItem(cacheKey); if (cached) { setAiRec(JSON.parse(cached)); return; } } catch {}
    setAiRecLoading(true);
    const memberStats = allUsers.slice(0, 6).map(m => {
      const cfg = industryConfigs[m.industry] || Object.values(industryConfigs)[0];
      const goals = allUserGoals[m.id] || {};
      const data = allUsersData[m.id] || {};
      const last5 = Object.keys(data).filter(d => !isWeekend(d) && d <= today).sort().slice(-5);
      const avgs = (cfg?.weekdayMetrics || []).map(met => {
        const goal = goals[met.key] ?? met.defaultGoal ?? 0;
        const avg = goal > 0 ? Math.round(last5.reduce((s, d) => s + (data[d]?.[met.key] || 0), 0) / Math.max(1, last5.length)) : null;
        return avg !== null ? `${m.name?.split(" ")[0]}: ${avg}/${goal} ${met.short || met.label}` : null;
      }).filter(Boolean);
      return avgs.join(", ");
    }).filter(Boolean).join("\n");
    try {
      const data = await callAI({ model: "claude-sonnet-4-20250514", messages: [{ role: "user", content: `Accountability group recent activity:\n${memberStats}\n\nSuggest: (1) one specific challenge that would be motivating (2-3 word title, 1 sentence why). (2) one accountability pairing (first names only, 1 sentence why).\n\nReturn JSON only: {"challenge": {"title": "...", "why": "..."}, "pair": {"names": "...", "why": "..."}}` }], max_tokens: 200, call_type: "metric_gen" });
      const text = (data?.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("").trim();
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setAiRec(parsed);
      try { localStorage.setItem(`cadence-compete-rec-${spaceId}-${today}`, JSON.stringify(parsed)); } catch {}
    } catch(e) { if(e?.code==="USAGE_LIMIT") onShowPaywall?.(); }
    setAiRecLoading(false);
  }

  React.useEffect(() => {
    if (!isAdmin) return;
    // Pro: auto-load on mount. Free leaders: wait for manual trigger.
    if (isPro) loadAiRec();
  }, [currentUser?.id, spaceId, isPro]);

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
   {/* Header */}
   <div>
    <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: "'DM Sans',system-ui,sans-serif" }}>Compete</div>
    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "3px" }}>Push each other forward with challenges and accountability</div>
   </div>

   {/* AI Recommendations */}
   {isAdmin && !aiRecDismissed && (
   <div style={{ background: "linear-gradient(135deg, rgba(29,201,232,0.06) 0%, rgba(123,111,216,0.04) 100%)", border: "1px solid rgba(29,201,232,0.18)", borderRadius: "14px", padding: "14px 16px", position: "relative" }}>
    <button onClick={() => setAiRecDismissed(true)} style={{ position: "absolute", top: "8px", right: "8px", background: "var(--bg-3,#1a1a2e)", border: "1px solid var(--border-2,#444)", borderRadius: "6px", color: "var(--text-muted,#aaa)", cursor: "pointer", padding: "3px 8px", fontSize: "0.75rem", lineHeight: 1, WebkitTapHighlightColor: "transparent", fontWeight: "700" }}>✕</button>
    <div style={{ fontSize: "0.62rem", fontWeight: "800", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px" }}>⚡ AI Recommendations</div>
    {!isPro && !aiRec && !aiRecLoading && (
     <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "'DM Sans',system-ui,sans-serif", lineHeight: 1.4 }}>Challenge ideas + pairing suggestions for your crew. Uses 1 interaction.</div>
      <button onClick={loadAiRec} style={{ background: "rgba(29,201,232,0.12)", border: "1px solid rgba(29,201,232,0.3)", color: "var(--accent)", borderRadius: "8px", padding: "6px 12px", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", fontFamily: "'DM Sans',system-ui,sans-serif", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>Get ideas →</button>
     </div>
    )}
    {(aiRec || aiRecLoading) && (<>
     {aiRecLoading ? (
      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>Analyzing your crew's activity…</div>
     ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
       {aiRec?.challenge && (
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "10px", padding: "10px 12px" }}>
         <div style={{ fontSize: "0.65rem", fontWeight: "800", color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>💡 Challenge Idea</div>
         <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F }}>{aiRec.challenge.title}</div>
         <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "3px", lineHeight: 1.4 }}>{aiRec.challenge.why}</div>
        </div>
       )}
       {aiRec?.pair && (
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "10px", padding: "10px 12px" }}>
         <div style={{ fontSize: "0.65rem", fontWeight: "800", color: "#A855F7", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>👥 Accountability Pair</div>
         <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F }}>{aiRec.pair.names}</div>
         <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "3px", lineHeight: 1.4 }}>{aiRec.pair.why}</div>
        </div>
       )}
      </div>
     )}
     </>
    )}
   </div>
   )}

   {/* Challenges */}
   <div data-tour-challenges style={card}>
    <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border-1)" }}>
     <div style={sectionLabel}>⚡ Challenges</div>
     <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "3px" }}>Compete with your group on a single metric</div>
    </div>
    <div style={{ padding: "12px 16px" }}>
     <ChallengeBoard spaceId={spaceId} currentUser={currentUser} allUsers={allUsers} allUsersData={allUsersData} industryConfigs={industryConfigs} allUserGoals={allUserGoals} isAdmin={isAdmin} onNotify={onNotify} />
    </div>
   </div>

   {/* Accountability */}
   <div data-tour-accountability style={card}>
    <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border-1)" }}>
     <div style={sectionLabel}>👥 Accountability Groups</div>
     <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "3px" }}>See your partners' numbers in real time</div>
    </div>
    <div style={{ padding: "12px 16px" }}>
     <AccountabilityPairs spaceId={spaceId} currentUser={currentUser} allUsers={allUsers} allUsersData={allUsersData} industryConfigs={industryConfigs} allUserGoals={allUserGoals} onOpenDm={onOpenDm} />
    </div>
   </div>
  </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── OrgView — "My Crews" page: Feed/Dashboard, Leaderboard, Compete ─────────────
// ─────────────────────────────────────────────────────────────────────────────
// ── AdminOrgTab — inline org admin panel (replaces Settings > Org > Admin section) ─
function AdminOrgTab({ orgId, orgMeta, admins, allUsers, currentUser, isSuperAdmin, industryConfigs, isAdmin }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [activeSection, setActiveSection] = React.useState("roles");

 const sLabel = { fontSize:"0.65rem", fontWeight:"800", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.12em" };
 const card = { background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"14px", overflow:"hidden" };
 const btn = { background:"none", border:"1px solid var(--border-1)", color:"var(--text-secondary)", padding:"7px 14px", borderRadius:"8px", fontSize:"0.8rem", fontWeight:"600", cursor:"pointer", fontFamily:F };

 const sections = [
  { k:"roles", label:"Roles & Teams" },
  { k:"admins", label:"Manage Admins" },
  { k:"industry", label:"Track Settings" },
 ];

 return (
  <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
   {/* Section tabs */}
   <div style={{ display:"flex", gap:"6px", borderBottom:"1px solid var(--border-1)", marginBottom:"4px", overflowX:"auto", scrollbarWidth:"none" }}>
    {sections.map(sec => (
     <button key={sec.k} onClick={() => setActiveSection(sec.k)}
      style={{ padding:"8px 14px", background:"none", border:"none", borderBottom: activeSection===sec.k ? "2px solid var(--accent)" : "2px solid transparent", color: activeSection===sec.k ? "var(--accent)" : "var(--text-muted)", fontSize:"0.82rem", fontWeight: activeSection===sec.k ? "700" : "500", cursor:"pointer", fontFamily:F, flexShrink:0, whiteSpace:"nowrap", WebkitTapHighlightColor:"transparent", marginBottom:"-1px" }}>
      {sec.label}
     </button>
    ))}
   </div>

   {/* Roles & Teams */}
   {activeSection==="roles" && (
    <div style={{ textAlign:"center", padding:"30px 20px" }}>
     <div style={{ fontSize:"1.5rem", marginBottom:"10px" }}>👥</div>
     <div style={{ fontSize:"0.95rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F, marginBottom:"8px" }}>Roles & Teams</div>
     <div style={{ fontSize:"0.82rem", color:"var(--text-muted)", lineHeight:1.6, marginBottom:"16px" }}>
      Configure roles, create teams, and assign members in Managed Crew Settings.
     </div>
     <button onClick={() => { window.dispatchEvent(new CustomEvent("cadence:go-settings", { detail: { tab:"org" } })); }}
      style={{ background:"var(--accent)", color:"#000", border:"none", padding:"10px 20px", borderRadius:"10px", fontSize:"0.88rem", fontWeight:"700", cursor:"pointer", fontFamily:F }}>
      Open Org Settings →
     </button>
    </div>
   )}

   {/* Manage Admins */}
   {activeSection==="admins" && (
    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
     <p style={{ fontSize:"0.85rem", color:"var(--text-muted)", lineHeight:1.6, marginBottom:"8px" }}>
      {isSuperAdmin ? "Grant or revoke admin access to members of your organization." : "View admin members. Only the space owner can grant or revoke admin access."}
     </p>
     {!isSuperAdmin && (
      <div style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"8px", padding:"10px 14px", fontSize:"0.82rem", color:"var(--text-muted)", marginBottom:"8px" }}>
       You have admin privileges but cannot manage other admins. Contact the space owner.
      </div>
     )}
     {allUsers.map(u => {
      const isSelf = u.id === currentUser?.id;
      const isAdm = admins.includes(u.id);
      return (
       <div key={u.id} style={{ ...card, padding:"12px 16px", display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:"var(--accent-dim)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem", fontWeight:"700", color:"var(--accent)", flexShrink:0 }}>
         {u.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
         <div style={{ fontSize:"0.9rem", fontWeight:"600", color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {u.name}
          {isSelf && isSuperAdmin && <span style={{ fontSize:"0.65rem", color:"var(--accent)", marginLeft:"8px", fontWeight:"700", letterSpacing:"0.06em" }}>OWNER</span>}
         </div>
         <div style={{ fontSize:"0.72rem", color:"var(--text-dim)", marginTop:"1px" }}>{DEFAULT_INDUSTRIES[u.industry]?.label || u.industry}</div>
        </div>
        {isSuperAdmin && !isSelf && (
         <button style={{ ...btn, color: isAdm ? "#E05577" : "var(--accent)", borderColor: isAdm ? "rgba(224,85,119,0.3)" : "rgba(29,201,232,0.3)" }}
          onClick={async () => {
           const newAdmins = isAdm ? admins.filter(id => id !== u.id) : [...admins, u.id];
           window.dispatchEvent(new CustomEvent("cadence:update-admins", { detail: { orgId, admins: newAdmins } }));
          }}>
          {isAdm ? "Remove Admin" : "Make Admin"}
         </button>
        )}
        {isAdm && <span style={{ fontSize:"0.65rem", background:"rgba(29,201,232,0.1)", border:"1px solid rgba(29,201,232,0.2)", color:"var(--accent)", borderRadius:"6px", padding:"2px 8px", fontWeight:"700" }}>ADMIN</span>}
       </div>
      );
     })}
    </div>
   )}

   {/* Track/Industry Settings */}
   {activeSection==="industry" && (
    <div style={{ fontSize:"0.88rem", color:"var(--text-muted)", padding:"20px", textAlign:"center" }}>
     <div style={{ fontSize:"1.5rem", marginBottom:"10px" }}>⚙️</div>
     <div style={{ fontWeight:"600", color:"var(--text-primary)", marginBottom:"6px" }}>Track Settings</div>
     <div style={{ lineHeight:1.6, marginBottom:"16px" }}>Configure metrics and goals for your organization in Settings → Managed Crew.</div>
     <button onClick={() => { window.dispatchEvent(new CustomEvent("cadence:go-settings", { detail: { tab:"org" } })); }}
      style={{ background:"var(--accent)", color:"#000", border:"none", padding:"10px 20px", borderRadius:"10px", fontSize:"0.88rem", fontWeight:"700", cursor:"pointer", fontFamily:F }}>
      Open Org Settings →
     </button>
    </div>
   )}
  </div>
 );
}

// OrgView removed — crews handle everything now
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ── DiscoverCommunitiesSection ── shows public communities from space index ───
// ─────────────────────────────────────────────────────────────────────────────
function DiscoverCommunitiesSection({ currentUserId, currentUserIndustry, joinedIds, onJoinByPin }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [allSpaces, setAllSpaces] = useState(null); // null = loading
 const [pinInput, setPinInput] = useState({});
 const [pinError, setPinError] = useState({});
 const [joining, setJoining] = useState({});
 const [joined, setJoined] = useState({}); // id -> true

 useEffect(() => {
  loadSpaceIndex().then(idx => {
   // Filter to communities only, not already joined
   const communities = idx.filter(e => e.type === "community");
   setAllSpaces(communities);
  }).catch(() => setAllSpaces([]));
 }, []);

 const visible = (allSpaces || []).filter(c => !(joinedIds||[]).includes(c.id) && !joined[c.id]);

 // Score communities by "relevance" — same industry keyword first, else recent
 function score(c) {
  const name = (c.name || "").toLowerCase();
  const desc = (c.description || "").toLowerCase();
  const ind = (currentUserIndustry || "").toLowerCase();
  const indKeywords = ind.split(/\s+/).filter(w => w.length > 3);
  const match = indKeywords.some(kw => name.includes(kw) || desc.includes(kw)) ? 10 : 0;
  return match + (c.createdAt ? new Date(c.createdAt).getTime() / 1e12 : 0);
 }
 const sorted = [...visible].sort((a, b) => score(b) - score(a)).slice(0, 6);

 if (!allSpaces || sorted.length === 0) return null;

 async function handleJoinAttempt(spaceId) {
  const pin = (pinInput[spaceId] || "").trim();
  if (!pin) { setPinError(e => ({...e, [spaceId]:"Enter the invite code"})); return; }
  setJoining(j => ({...j, [spaceId]:true}));
  setPinError(e => ({...e, [spaceId]:""}));
  try {
   await onJoinByPin(spaceId, pin);
   setJoined(j => ({...j, [spaceId]:true}));
  } catch (err) {
   setPinError(e => ({...e, [spaceId]:"Invalid code. Ask a member for the invite link."}));
  }
  setJoining(j => ({...j, [spaceId]:false}));
 }

 return (
  <div style={{ marginTop:"8px" }}>
   <div style={{ fontSize:"0.68rem", fontWeight:"800", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"10px" }}>
    🔍 Other communities on Cadence
   </div>
   <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
    {sorted.map(c => {
     const isJoining = joining[c.id];
     const didJoin = joined[c.id];
     const showPin = pinInput.hasOwnProperty(c.id);
     return (
      <div key={c.id} style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"12px", padding:"12px 14px" }}>
       <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"34px", height:"34px", borderRadius:"8px", background:"rgba(168,85,247,0.1)", border:"1px solid rgba(168,85,247,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", flexShrink:0 }}>🌐</div>
        <div style={{ flex:1, minWidth:0 }}>
         <div style={{ fontSize:"0.88rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
         {c.description && <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:"1px" }}>{c.description}</div>}
        </div>
        {didJoin ? (
         <div style={{ fontSize:"0.75rem", color:"#4ACF86", fontWeight:"700", flexShrink:0 }}>✓ Joined!</div>
        ) : !showPin ? (
         <button onClick={() => setPinInput(p => ({...p, [c.id]:""}))} style={{ background:"rgba(168,85,247,0.1)", border:"1px solid rgba(168,85,247,0.25)", color:"#A855F7", padding:"7px 12px", borderRadius:"8px", fontWeight:"700", fontSize:"0.78rem", cursor:"pointer", fontFamily:F, flexShrink:0, WebkitTapHighlightColor:"transparent" }}>
          Join →
         </button>
        ) : null}
       </div>
       {showPin && !didJoin && (
        <div style={{ marginTop:"10px" }}>
         <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginBottom:"6px" }}>Paste your invite code or ask a member for the link:</div>
         <div style={{ display:"flex", gap:"6px" }}>
          <input
           value={pinInput[c.id] || ""}
           onChange={e => setPinInput(p => ({...p, [c.id]:e.target.value}))}
           placeholder="e.g. ABC123"
           style={{ flex:1, background:"var(--bg-2)", border:`1px solid ${pinError[c.id]?"#E05577":"var(--border-1)"}`, color:"var(--text-primary)", padding:"8px 10px", borderRadius:"8px", fontSize:"0.88rem", fontFamily:F, outline:"none" }}
           onKeyDown={e => e.key === "Enter" && handleJoinAttempt(c.id)}
          />
          <button onClick={() => handleJoinAttempt(c.id)} disabled={isJoining} style={{ background:"#A855F7", color:"#fff", border:"none", padding:"8px 14px", borderRadius:"8px", fontWeight:"700", fontSize:"0.82rem", cursor:"pointer", fontFamily:F, flexShrink:0, opacity:isJoining?0.6:1, WebkitTapHighlightColor:"transparent" }}>
           {isJoining ? "…" : "Join"}
          </button>
          <button onClick={() => { setPinInput(p => { const n={...p}; delete n[c.id]; return n; }); setPinError(e => ({...e, [c.id]:""})); }} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-dim)", padding:"8px 10px", borderRadius:"8px", cursor:"pointer", fontFamily:F, fontSize:"0.82rem", WebkitTapHighlightColor:"transparent" }}>✕</button>
         </div>
         {pinError[c.id] && <div style={{ fontSize:"0.75rem", color:"#E05577", marginTop:"5px" }}>{pinError[c.id]}</div>}
        </div>
       )}
      </div>
     );
    })}
   </div>
   <div style={{ fontSize:"0.72rem", color:"var(--text-dim)", marginTop:"10px", textAlign:"center", lineHeight:1.5 }}>
    Don't see your Crew? Ask for an invite link — Crews are invite-only to keep quality high.
   </div>
  </div>
 );
}


// ─────────────────────────────────────────────────────────────────────────────
// ── CommunityPostComposer — post to a crew feed ─────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════
// ── GUILD HUB — living community dashboard ──────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

// ── Storage helpers for guild features ───────────────────────────────
async function loadGuildChat(communityId) {
  return (await storageGet(`guild-chat-${communityId}`)) || [];
}
async function saveGuildChat(communityId, msgs) {
  await storageSet(`guild-chat-${communityId}`, msgs);
}
async function loadGuildBulletin(communityId) {
  return await storageGet(`guild-bulletin-${communityId}-${todayStr()}`);
}
async function saveGuildBulletin(communityId, bulletin) {
  await storageSet(`guild-bulletin-${communityId}-${todayStr()}`, bulletin);
}
async function loadGuildSpark(communityId) {
  const key = weekKey(todayStr());
  return await storageGet(`guild-spark-${communityId}-${key}`);
}
async function saveGuildSpark(communityId, spark) {
  const key = weekKey(todayStr());
  await storageSet(`guild-spark-${communityId}-${key}`, spark);
}

// ── Auto-generate activity pulses from member data ────────────────────
function generateActivityPulses(members, allUsersData, allUserGoals, industryConfigs) {
  const today = todayStr();
  const pulses = [];

  members.forEach(u => {
    const data = allUsersData[u.id] || {};
    const todayData = data[today] || {};
    const cfg = industryConfigs[u.industry] || Object.values(industryConfigs)[0];
    const goals = allUserGoals[u.id] || {};
    const metrics = cfg?.weekdayMetrics || [];

    const pct = computeGoalPct(todayData, metrics, goals);
    const streak = computeStreak(data);

    // Goal crusher — hit 100%+ today
    if (pct >= 100 && Object.values(todayData).some(v => v > 0)) {
      pulses.push({ type: "goal", user: u, pct: Math.round(pct), ts: Date.now() - Math.random() * 3600000 });
    }
    // Streak milestones
    if ([7,14,21,30,60,90].includes(streak.current)) {
      pulses.push({ type: "streak", user: u, streak: streak.current, ts: Date.now() - Math.random() * 7200000 });
    }
    // Big day — 150%+ on any metric
    metrics.forEach(m => {
      const goal = goals[m.key] ?? m.defaultGoal;
      const val = todayData[m.key];
      if (goal > 0 && val && val >= goal * 1.5) {
        pulses.push({ type: "bigday", user: u, metric: m.label, val, goal, ts: Date.now() - Math.random() * 1800000 });
      }
    });
  });

  return pulses.sort((a, b) => b.ts - a.ts).slice(0, 8);
}

// ── Crew Bulletin (AI-generated daily dispatch) ──────────────────────
function GuildBulletin({ community, members, allUsersData, allUserGoals, industryConfigs, currentUser, isLeader }) {
  const F = "'DM Sans',system-ui,sans-serif";
  const [bulletin, setBulletin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGuildBulletin(community.id).then(b => {
      setBulletin(b);
      setLoading(false);
      if (!b) generateBulletin();
    }).catch(() => { setLoading(false); generateBulletin(); });
  }, [community.id]);

  async function generateBulletin() {
    setLoading(true);
    const today = todayStr();
    const allM = members.filter(m => {
      const d = (allUsersData[m.id] || {})[today] || {};
      return Object.values(d).some(v => v > 0);
    });
    const streakStars = members.map(m => ({
      name: m.name,
      streak: computeStreak(allUsersData[m.id] || {}).current
    })).filter(m => m.streak >= 5).sort((a,b) => b.streak - a.streak).slice(0, 3);

    const topToday = members.map(m => {
      const cfg = industryConfigs[m.industry] || Object.values(industryConfigs)[0];
      const goals = allUserGoals[m.id] || {};
      const pct = computeGoalPct((allUsersData[m.id]||{})[today]||{}, cfg?.weekdayMetrics||[], goals);
      return { name: m.name, pct: Math.round(pct) };
    }).filter(m => m.pct >= 80).sort((a,b) => b.pct - a.pct).slice(0, 3);

    const prompt = `You write the daily Crew Bulletin for "${community.name}" — a professional accountability Crew on Cadence. Write it like a sports team's locker room bulletin: punchy, specific, energizing. 3-4 sentences max. Include these real data points:
- ${allM.length} of ${members.length} members active today
- Top streak holders: ${streakStars.map(s => `${s.name} (${s.streak} days)`).join(", ") || "none yet"}
- Top performers today: ${topToday.map(t => `${t.name} at ${t.pct}%`).join(", ") || "day just getting started"}
- Community industries: ${[...new Set(members.map(m=>m.industry))].map(i => industryConfigs[i]?.label || i).join(", ")}

Rules:
- Don't start with "Welcome" or "Hello"
- Reference actual members by name if there are notable performances
- If the day is early and numbers are low, write it as a call to arms
- If numbers are strong, write it as momentum fuel
- End with one sharp, specific challenge or goal for the rest of the day
- Sound like a real dispatch from a high-performing team, not a corporate newsletter
- Current date: ${new Date().toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"})}`;

    try {
      const data = await callAI({ model: "claude-sonnet-4-20250514", messages: [{ role: "user", content: prompt }], max_tokens: 200, call_type: "general" })
      const text = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
      if (text) {
        const b = { text, generatedAt: Date.now(), isAI: true };
        await saveGuildBulletin(community.id, b);
        setBulletin(b);
      }
    } catch {}
    setLoading(false);
  }

  async function saveCustomBulletin() {
    if (!editText.trim()) return;
    setSaving(true);
    const b = { text: editText.trim(), generatedAt: Date.now(), isAI: false, authorName: currentUser?.name };
    await saveGuildBulletin(community.id, b);
    setBulletin(b);
    setEditing(false);
    setSaving(false);
  }

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(29,201,232,0.05) 100%)", border: "1px solid rgba(168,85,247,0.22)", borderRadius: "16px", padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      {/* Decorative corner */}
      <div style={{ position: "absolute", top: 0, right: 0, width: "60px", height: "60px", background: "rgba(168,85,247,0.06)", borderRadius: "0 16px 0 60px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{ fontSize: "1rem" }}>📣</span>
        <span style={{ fontSize: "0.65rem", fontWeight: "800", color: "#A855F7", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Crew Bulletin · {new Date().toLocaleDateString("en-US", {weekday:"short", month:"short", day:"numeric"})}
        </span>
        {isLeader && !editing && (
          <button onClick={() => { setEditing(true); setEditText(bulletin?.text || ""); }}
            style={{ marginLeft: "auto", background: "none", border: "1px solid rgba(168,85,247,0.3)", color: "#A855F7", borderRadius: "6px", padding: "2px 8px", fontSize: "0.7rem", fontWeight: "700", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div>
          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
            style={{ width: "100%", background: "var(--bg-2)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "0.88rem", fontFamily: F, outline: "none", resize: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontFamily: F, fontSize: "0.82rem", WebkitTapHighlightColor: "transparent" }}>Cancel</button>
            <button onClick={saveCustomBulletin} disabled={saving}
              style={{ background: "#A855F7", color: "#fff", border: "none", borderRadius: "8px", padding: "7px 16px", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
              {saving ? "Saving…" : "Post Bulletin"}
            </button>
          </div>
        </div>
      ) : loading ? (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[0,1,2].map(i => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#A855F7", opacity: 0.4, animation: `pacerDot 1.2s ${i*0.2}s infinite` }} />)}
          <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontFamily: F }}>Generating bulletin…</span>
        </div>
      ) : bulletin ? (
        <div>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.65, fontFamily: F, fontWeight: "500" }}>{bulletin.text}</p>
          <div style={{ marginTop: "8px", fontSize: "0.65rem", color: "var(--text-dim)" }}>
            {bulletin.isAI ? "⚡ AI-generated" : `✍️ by ${bulletin.authorName}`}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Crew Stats — collective identity numbers ─────────────────────────
// ── CrewScoreboard — today's numbers for every member, sorted by goal % ──────
function CrewScoreboard({ members, allUsersData, allUserGoals, industryConfigs, currentUser }) {
  const F  = "'DM Sans',system-ui,sans-serif";
  const TP = "var(--text-primary)";
  const TM = "var(--text-muted)";
  const TD = "var(--text-dim,rgba(255,255,255,0.25))";
  const today = todayStr();

  const COLORS = ["#1DC9E8","#A855F7","#F97316","#4ACF86","#F59E0B","#E05577","#3B82F6","#EC4899"];

  const rows = members.map(m => {
    const uid     = m.userId || m.id;
    const allData = allUsersData[uid] || {};
    const goals   = allUserGoals[uid] || {};
    const todayData = allData[today] || {};
    const cfg     = industryConfigs[m.industry] || Object.values(industryConfigs || {})[0] || {};
    const metrics = (cfg.weekdayMetrics || []).filter(met => (goals[met.key] ?? met.defaultGoal ?? 0) > 0);
    const pct     = metrics.length ? computeGoalPct(todayData, metrics, goals) : 0;
    const streak  = computeStreak(allData).current || 0;
    return { uid, name: m.name || "?", metrics, todayData, goals, pct, streak, isMe: uid === currentUser?.id };
  }).sort((a, b) => b.pct - a.pct || b.streak - a.streak);

  if (!rows.length) return null;

  return (
    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "14px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--border-1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.6rem", fontWeight: "800", color: TD, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: F }}>Today's Numbers</span>
        <span style={{ fontSize: "0.6rem", color: TD, fontFamily: F }}>{today}</span>
      </div>

      {/* One card per person */}
      {rows.map((row, idx) => {
        const color    = COLORS[idx % COLORS.length];
        const initials = row.name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
        const pctColor = row.pct >= 100 ? "#4ACF86" : row.pct >= 60 ? "#1DC9E8" : row.pct > 0 ? TM : TD;
        const hasData  = row.metrics.some(m => (row.todayData[m.key] || 0) > 0);

        return (
          <div key={row.uid} style={{
            padding: "12px 14px",
            borderBottom: idx < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            background: row.isMe ? `${color}07` : "none",
          }}>
            {/* Name row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: `${color}20`, border: `1.5px solid ${color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: "800", color, flexShrink: 0, fontFamily: F }}>
                {initials}
              </div>
              <span style={{ fontSize: "0.88rem", fontWeight: "700", color: row.isMe ? TP : TM, fontFamily: F, flex: 1 }}>
                {row.name.split(" ")[0]}{row.isMe ? " · you" : ""}
              </span>
              {row.streak > 0 && <span style={{ fontSize: "0.65rem", color: "#F59E0B", fontWeight: "700" }}>🔥{row.streak}d</span>}
              <span style={{ fontSize: "0.9rem", fontWeight: "900", color: pctColor, fontFamily: F }}>
                {hasData ? `${row.pct}%` : "—"}
              </span>
            </div>

            {/* Metric columns */}
            {row.metrics.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(row.metrics.length, 6)}, 1fr)`, gap: "8px" }}>
                {row.metrics.map(m => {
                  const goal     = row.goals[m.key] ?? m.defaultGoal ?? 0;
                  const val      = row.todayData[m.key] || 0;
                  const barPct   = goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0;
                  const barColor = barPct >= 100 ? "#4ACF86" : m.color || color;
                  return (
                    <div key={m.key}>
                      {/* Progress bar on top */}
                      <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden", marginBottom: "5px" }}>
                        <div style={{ height: "100%", width: `${barPct}%`, background: barColor, borderRadius: "2px", transition: "width 0.5s ease" }} />
                      </div>
                      {/* Value */}
                      <div style={{ fontSize: "0.95rem", fontWeight: "800", color: barPct >= 100 ? "#4ACF86" : TP, fontFamily: F, lineHeight: 1 }}>
                        {val}<span style={{ fontSize: "0.65rem", fontWeight: "400", color: TD }}>/{goal}</span>
                      </div>
                      {/* Label */}
                      <div style={{ fontSize: "0.62rem", color: TD, fontFamily: F, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.short || m.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


function GuildStats({ members, allUsersData, allUserGoals, industryConfigs, presenceMap }) {
  const F = "'DM Sans',system-ui,sans-serif";
  const today = todayStr();
  const onlineCount = members.filter(m => {
    const uid = m.userId || m.id;
    const s = getPresenceStatus ? getPresenceStatus(presenceMap || {}, uid) : "offline";
    return s === "online" || s === "away";
  }).length;

  // Members with an active streak (at least 1 day)
  const onStreakCount = members.filter(m => computeStreak(allUsersData[m.id] || {}).current >= 1).length;

  // This week's collective metric totals
  const weekStart = (() => {
    const d = new Date(); const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)); // Monday
    return d.toISOString().slice(0,10);
  })();

  let weeklyGoalHits = 0, weeklyGoalAttempts = 0;
  members.forEach(m => {
    const data = allUsersData[m.id] || {};
    const cfg = industryConfigs[m.industry] || Object.values(industryConfigs)[0];
    const goals = allUserGoals[m.id] || {};
    Object.entries(data).forEach(([date, d]) => {
      if (date < weekStart || date > today || isWeekend(date) || !d) return;
      const pct = computeGoalPct(d, cfg?.weekdayMetrics || [], goals);
      weeklyGoalAttempts++;
      if (pct >= 100) weeklyGoalHits++;
    });
  });
  const hitRate = weeklyGoalAttempts > 0 ? Math.round((weeklyGoalHits / weeklyGoalAttempts) * 100) : 0;

  const stats = [
    { label: "Online Now", value: onlineCount, sub: `of ${members.length}`, color: onlineCount > 0 ? "#4ACF86" : "var(--text-dim)", icon: "🟢" },
    { label: "On Streak", value: `${onStreakCount}/${members.length}`, sub: "members active", color: onStreakCount === members.length ? "#F59E0B" : onStreakCount > 0 ? "var(--accent)" : "var(--text-dim)", icon: "🔥" },
    { label: "Goals Hit", value: `${hitRate}%`, sub: "this week", color: hitRate >= 70 ? "#4ACF86" : hitRate >= 40 ? "var(--accent)" : "#E05577", icon: "🎯" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
      {stats.map(stat => (
        <div key={stat.label} style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "12px", padding: "12px 10px", textAlign: "center" }}>
          <div style={{ fontSize: "0.9rem", marginBottom: "3px" }}>{stat.icon}</div>
          <div style={{ fontSize: "1.2rem", fontWeight: "900", color: stat.color, fontFamily: F, lineHeight: 1 }}>{stat.value}</div>
          <div style={{ fontSize: "0.6rem", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "3px" }}>{stat.label}</div>
          <div style={{ fontSize: "0.64rem", color: "var(--text-dim)", marginTop: "1px" }}>{stat.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Activity Pulse Strip ──────────────────────────────────────────────
function ActivityPulseStrip({ pulses }) {
  const F = "'DM Sans',system-ui,sans-serif";
  if (!pulses || pulses.length === 0) return null;

  function pulseText(p) {
    if (p.type === "goal") return `${p.user.name} crushed their goals today — ${p.pct}% 🎯`;
    if (p.type === "streak") return `${p.user.name} is on a ${p.streak}-day streak 🔥`;
    if (p.type === "bigday") return `${p.user.name} logged ${p.val} ${p.metric} — ${Math.round((p.val/p.goal)*100)}% of goal 💪`;
    return "";
  }

  return (
    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "12px", padding: "10px 14px" }}>
      <div style={{ fontSize: "0.62rem", fontWeight: "800", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>
        ⚡ Live Activity
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {pulses.slice(0, 4).map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: `${['rgba(74,207,134,0.12)','rgba(245,158,11,0.12)','rgba(29,201,232,0.12)','rgba(168,85,247,0.12)'][i%4]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", flexShrink: 0 }}>
              {p.user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: F, lineHeight: 1.3 }}>{pulseText(p)}</div>
            <div style={{ fontSize: "0.62rem", color: "var(--text-dim)", flexShrink: 0 }}>
              {Math.round((Date.now() - p.ts) / 60000) < 60
                ? `${Math.max(1, Math.round((Date.now() - p.ts) / 60000))}m ago`
                : `${Math.round((Date.now() - p.ts) / 3600000)}h ago`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Live Crew Chat ───────────────────────────────────────────────────
function GuildChat({ community, currentUser, members }) {
  const F = "'DM Sans',system-ui,sans-serif";
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null); // { id, userName, text }
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  function fetchMessages() {
    loadGuildChat(community.id).then(msgs => {
      setMessages(msgs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchMessages();
    // Poll every 4 seconds for near-realtime feel
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [community.id]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  async function sendMessage() {
    if (!input.trim() || !currentUser || sending) return;
    setSending(true);
    const msg = {
      id: `${currentUser.id}-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      text: input.trim(),
      ts: Date.now(),
      ...(replyingTo ? { replyTo: { id: replyingTo.id, userName: replyingTo.userName, text: replyingTo.text.slice(0, 80) } } : {}),
    };
    const updated = [...messages, msg].slice(-100); // keep last 100
    setMessages(updated);
    setInput("");
    setReplyingTo(null);
    await saveGuildChat(community.id, updated).catch(() => {});
    setSending(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  // Format timestamp
  function formatTs(ts) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Collapse consecutive messages from same user
  function shouldShowAvatar(i) {
    if (i === 0) return true;
    return messages[i].userId !== messages[i-1].userId;
  }

  const isEmpty = !loading && messages.length === 0;

  return (
    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", gap: "8px", background: "rgba(29,201,232,0.02)" }}>
        <span style={{ fontSize: "0.9rem" }}>💬</span>
        <span style={{ fontSize: "0.72rem", fontWeight: "800", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Crew Chat</span>
        <div style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: "#4ACF86", boxShadow: "0 0 6px rgba(74,207,134,0.6)" }} title="Live" />
      </div>

      {/* Message area */}
      <div style={{ height: "240px", overflowY: "auto", padding: "12px 12px 6px", display: "flex", flexDirection: "column", gap: "2px", WebkitOverflowScrolling: "touch" }}>
        {loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              {[0,1,2].map(i => <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--accent)", opacity: 0.4, animation: `pacerDot 1.2s ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        {isEmpty && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", opacity: 0.5 }}>
            <div style={{ fontSize: "1.8rem" }}>💬</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontFamily: F, textAlign: "center" }}>
              Start the conversation.<br/>Say something to your Crew.
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.userId === currentUser?.id;
          const showAv = shouldShowAvatar(i);
          return (
            <div key={m.id} style={{ display: "flex", gap: "6px", alignItems: "flex-end", flexDirection: isMe ? "row-reverse" : "row", marginTop: showAv ? "8px" : "1px" }}
              onContextMenu={e => { e.preventDefault(); setReplyingTo({ id: m.id, userName: m.userName, text: m.text }); }}
              onTouchStart={e => { const _t = setTimeout(() => setReplyingTo({ id: m.id, userName: m.userName, text: m.text }), 500); e.currentTarget._lpt = _t; }}
              onTouchEnd={e => { clearTimeout(e.currentTarget._lpt); }}
              onTouchMove={e => { clearTimeout(e.currentTarget._lpt); }}>
              {!isMe && (
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: showAv ? "rgba(168,85,247,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: "800", color: "#A855F7", flexShrink: 0, visibility: showAv ? "visible" : "hidden" }}>
                  {m.userName?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div style={{ maxWidth: "75%" }}>
                {showAv && !isMe && (
                  <div style={{ fontSize: "0.65rem", fontWeight: "700", color: "var(--text-dim)", marginBottom: "2px", marginLeft: "2px" }}>
                    {m.userName} · {formatTs(m.ts)}
                  </div>
                )}
                {m.replyTo && (
                  <div style={{ fontSize: "0.72rem", color: isMe ? "rgba(0,0,0,0.5)" : "var(--text-dim)", background: isMe ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.04)", borderLeft: `2px solid ${isMe ? "rgba(0,0,0,0.25)" : "rgba(168,85,247,0.4)"}`, borderRadius: "0 6px 6px 0", padding: "3px 7px", marginBottom: "3px", lineHeight: 1.3, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    ↩ {m.replyTo.userName}: {m.replyTo.text}
                  </div>
                )}
                <div style={{
                  background: isMe ? "var(--accent)" : "var(--bg-2)",
                  color: isMe ? "#000" : "var(--text-secondary)",
                  border: isMe ? "none" : "1px solid var(--border-1)",
                  borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  padding: "7px 11px",
                  fontSize: "0.85rem", fontFamily: F, fontWeight: "500", lineHeight: 1.45,
                  cursor: "pointer",
                }}>
                  {m.text}
                </div>
                {isMe && showAv && (
                  <div style={{ fontSize: "0.6rem", color: "var(--text-dim)", textAlign: "right", marginTop: "2px", marginRight: "2px" }}>{formatTs(m.ts)}</div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div style={{ padding: "5px 10px 0", display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ flex: 1, fontSize: "0.72rem", color: "var(--text-dim)", background: "rgba(168,85,247,0.06)", borderLeft: "2px solid rgba(168,85,247,0.4)", borderRadius: "0 6px 6px 0", padding: "3px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            ↩ {replyingTo.userName}: {replyingTo.text}
          </div>
          <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem", padding: "2px 4px", flexShrink: 0 }}>✕</button>
        </div>
      )}
      {/* Input */}
      <div style={{ padding: "8px 10px 10px", borderTop: replyingTo ? "none" : "1px solid var(--border-1)", display: "flex", gap: "6px", marginTop: replyingTo ? "4px" : "0" }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } if (e.key === "Escape") setReplyingTo(null); }}
          placeholder={replyingTo ? `Reply to ${replyingTo.userName}…` : "Say something to the Crew…"}
          style={{ flex: 1, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 11px", fontSize: "1rem", fontFamily: F, outline: "none" }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || sending}
          style={{ background: "var(--accent)", border: "none", borderRadius: "8px", color: "#000", padding: "8px 12px", fontWeight: "800", fontSize: "0.85rem", cursor: "pointer", fontFamily: F, flexShrink: 0, opacity: !input.trim() || sending ? 0.5 : 1, WebkitTapHighlightColor: "transparent" }}>
          ↑
        </button>
      </div>
    </div>
  );
}

// ── AI Spark Post (weekly discussion prompt) ──────────────────────────
function GuildSparkPost({ community, members, allUsersData, allUserGoals, industryConfigs, currentUser, onPost, spaceId }) {
  const F = "'DM Sans',system-ui,sans-serif";
  const [spark, setSpark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const dismissKey = `guild-spark-dismissed-${community.id}-${weekKey(todayStr())}`;

  useEffect(() => {
    try { if (localStorage.getItem(dismissKey)) { setDismissed(true); setLoading(false); return; } } catch {}
    loadGuildSpark(community.id).then(s => {
      if (s) { setSpark(s); setLoading(false); }
      else generateSpark();
    }).catch(() => generateSpark());
  }, [community.id]);

  async function generateSpark() {
    setLoading(true);
    const today = todayStr();
    const weakMetrics = [];
    members.forEach(m => {
      const data = allUsersData[m.id] || {};
      const cfg = industryConfigs[m.industry] || Object.values(industryConfigs)[0];
      const goals = allUserGoals[m.id] || {};
      const last5 = Object.keys(data).filter(d => !isWeekend(d) && d <= today).sort().slice(-5);
      cfg?.weekdayMetrics?.forEach(metric => {
        const goal = goals[metric.key] ?? metric.defaultGoal;
        if (!goal) return;
        const avgVal = last5.reduce((s, d) => s + (data[d]?.[metric.key] || 0), 0) / Math.max(1, last5.length);
        if (avgVal < goal * 0.6) weakMetrics.push(metric.label);
      });
    });

    const industries = [...new Set(members.map(m => m.industry))].map(i => industryConfigs[i]?.label || i);
    const prompt = `Generate a single discussion question for "${community.name}" — a ${industries.join("/")} professional accountability community. The question should spark real conversation about work strategy, challenges, or wins.

Context: ${weakMetrics.length > 0 ? `Community is struggling with: ${[...new Set(weakMetrics)].slice(0,3).join(", ")}.` : "Community is performing well."}
Week: ${new Date().toLocaleDateString("en-US", {month:"long", day:"numeric"})}

Rules:
- 1 question only — make it specific to their industry and current moment
- Ask about tactics, mindset, or a real challenge people face
- Don't be generic. Don't ask "how do you stay motivated?"
- Should make someone stop and think, then want to respond
- Under 25 words

Return ONLY the question text, no quotes, no preamble.`;

    try {
      const data = await callAI({ model: "claude-sonnet-4-20250514", messages: [{ role: "user", content: prompt }], max_tokens: 80, call_type: "metric_gen" })
      const text = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
      if (text) {
        const s = { text, generatedAt: Date.now() };
        await saveGuildSpark(community.id, s);
        setSpark(s);
      }
    } catch {}
    setLoading(false);
  }

  async function submitSparkReply() {
    if (!replyText.trim() || !currentUser || !spaceId || replySending) return;
    setReplySending(true);
    try {
      const postText = `💡 Weekly Spark: "${spark.text}"\n\n${replyText.trim()}`;
      const existing = await loadFeed(spaceId).catch(() => []);
      const newPost = { id: genId(), userId: currentUser.id, userName: currentUser.name, text: postText, type: "spark", ts: Date.now() };
      await saveFeed(spaceId, [newPost, ...(existing||[])]);
      setReplySent(true);
      setReplyText("");
      setReplyOpen(false);
      if (onPost) onPost();
    } catch {}
    setReplySending(false);
  }

  if (dismissed || loading || !spark) return null;

  return (
    <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "14px", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        <span style={{ fontSize: "0.9rem" }}>💡</span>
        <span style={{ fontSize: "0.62rem", fontWeight: "800", color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.12em" }}>Weekly Spark</span>
        <button onClick={() => { try { localStorage.setItem(dismissKey, "1"); } catch {} setDismissed(true); }}
          style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.75rem", padding: "0 2px", WebkitTapHighlightColor: "transparent" }}>✕</button>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", fontFamily: F, lineHeight: 1.5 }}>
        {spark.text}
      </p>
      {replySent ? (
        <div style={{ fontSize: "0.8rem", color: "#4ACF86", fontWeight: "700" }}>✓ Posted to crew feed</div>
      ) : replyOpen ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <textarea
            autoFocus
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Share your take…"
            rows={3}
            style={{ width: "100%", background: "var(--bg-2)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "10px 12px", color: "var(--text-primary)", fontSize: "0.85rem", fontFamily: F, resize: "none", outline: "none", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
            <button onClick={submitSparkReply} disabled={!replyText.trim() || replySending}
              style={{ flex: 1, minWidth: "120px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "#F59E0B", borderRadius: "8px", padding: "8px", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent", opacity: replyText.trim() ? 1 : 0.5 }}>
              {replySending ? "Posting…" : "📣 Post to feed"}
            </button>
            <button onClick={async () => {
              if (!replyText.trim() || replySending || !community?.id) return;
              setReplySending(true);
              try {
                const existing = await loadGuildChat(community.id).catch(()=>[]);
                const msg = { id: `spark-${currentUser.id}-${Date.now()}`, userId: currentUser.id, userName: currentUser.name, text: `💡 "${spark.text}"

${replyText.trim()}`, ts: Date.now() };
                await saveGuildChat(community.id, [...(existing||[]), msg].slice(-100));
                setReplySent(true); setReplyText(""); setReplyOpen(false);
                if (onPost) onPost();
              } catch {}
              setReplySending(false);
            }} disabled={!replyText.trim() || replySending}
              style={{ flex: 1, minWidth: "120px", background: "rgba(29,201,232,0.1)", border: "1px solid rgba(29,201,232,0.3)", color: "var(--accent)", borderRadius: "8px", padding: "8px", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent", opacity: replyText.trim() ? 1 : 0.5 }}>
              💬 Start chat thread
            </button>
            <button onClick={() => { setReplyOpen(false); setReplyText(""); }}
              style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-muted)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.82rem", cursor: "pointer", fontFamily: F }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setReplyOpen(true)}
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B", borderRadius: "8px", padding: "7px 14px", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
          Share your answer →
        </button>
      )}
    </div>
  );
}

// ── Smart Post Composer ───────────────────────────────────────────────
function SmartPostComposer({ currentUser, spaceId, spaceName, allUsers, onPosted, prefill }) {
  const F = "'DM Sans',system-ui,sans-serif";
  const [text, setText] = useState(prefill || "");
  const [postType, setPostType] = useState("win");
  const [posting, setPosting] = useState(false);
  const [focused, setFocused] = useState(!!prefill);

  useEffect(() => {
    if (prefill) { setText(prefill); setFocused(true); }
  }, [prefill]);

  // Listen for open-composer events
  useEffect(() => {
    function handler(e) {
      if (e.detail?.spaceId === spaceId || !e.detail?.spaceId) {
        if (e.detail?.prefill) { setText(e.detail.prefill); setFocused(true); }
      }
    }
    window.addEventListener("cadence:open-composer", handler);
    return () => window.removeEventListener("cadence:open-composer", handler);
  }, [spaceId]);

  const types = [
    { key: "win", icon: "🏆", label: "Win" },
    { key: "tip", icon: "💡", label: "Tip" },
    { key: "question", icon: "❓", label: "Question" },
    { key: "challenge", icon: "⚡", label: "Challenge" },
  ];

  const placeholders = {
    win: "Share a win with the Crew…",
    tip: "Drop a tactic or insight that's working for you…",
    question: "Ask the Crew something on your mind…",
    challenge: "Throw down a challenge to the group…",
  };

  async function handlePost() {
    if (!text.trim() || !currentUser || posting) return;
    // Let Pacer scan for commitments
    window.dispatchEvent(new CustomEvent("cadence:pacer-scan", { detail: { text: text.trim(), source: "feed" } }));
    setPosting(true);
    const item = {
      id: `feed-com-${currentUser.id}-${Date.now()}`,
      type: postType,
      userId: currentUser.id,
      userName: currentUser.name,
      userIndustry: currentUser.industry,
      text: text.trim(),
      ts: Date.now(),
      date: todayStr(),
    };
    const next = await postFeedItem(spaceId, item).catch(() => null);
    if (next) onPosted(next);
    setText("");
    setPosting(false);
    setFocused(false);
  }

  return (
    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "14px", padding: "12px 14px", marginBottom: "14px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: initialsColor(currentUser?.name, currentUser?.avatarColor) || "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.82rem", fontWeight: "800", color: "#fff", flexShrink: 0, marginTop: "2px" }}>
          {currentUser?.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Post type selector */}
          {(focused || text) && (
            <div style={{ display: "flex", gap: "4px", marginBottom: "8px", flexWrap: "wrap" }}>
              {types.map(t => (
                <button key={t.key} onClick={() => setPostType(t.key)}
                  style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: "700", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent", transition: "all 0.12s",
                    background: postType === t.key ? "rgba(29,201,232,0.12)" : "var(--bg-2)",
                    border: postType === t.key ? "1px solid rgba(29,201,232,0.4)" : "1px solid var(--border-1)",
                    color: postType === t.key ? "var(--accent)" : "var(--text-dim)",
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={focused ? placeholders[postType] : `Post to ${spaceName || "the Crew"}…`}
            rows={focused ? 3 : 1}
            style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "1rem", fontFamily: F, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5, transition: "all 0.15s" }}
          />
          {(focused || text) && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", gap: "8px" }}>
              <button onClick={() => { setFocused(false); setText(""); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.82rem", cursor: "pointer", fontFamily: F, padding: "6px 12px", WebkitTapHighlightColor: "transparent" }}>Cancel</button>
              <button onClick={() => { haptic.success(); handlePost(); }} disabled={!text.trim() || posting}
                style={{ background: "var(--accent)", color: "#000", border: "none", padding: "7px 18px", borderRadius: "8px", fontWeight: "800", fontSize: "0.82rem", cursor: "pointer", fontFamily: F, opacity: !text.trim() ? 0.5 : 1, WebkitTapHighlightColor: "transparent" }}>
                {posting ? "Posting…" : "Post →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Active Challenge Card ─────────────────────────────────────────────
function ActiveChallengeCard({ communityId, currentUser, allUsersData, allUserGoals, industryConfigs, onSwitchTab }) {
  const F = "'DM Sans',system-ui,sans-serif";
  const [challenge, setChallenge] = useState(null);

  useEffect(() => {
    loadChallenges(communityId).then(chs => {
      const active = (chs || []).filter(c => c.active && c.endTs > Date.now() && (c.participants || []).includes(currentUser?.id));
      if (active.length > 0) setChallenge(active.sort((a,b) => a.endTs - b.endTs)[0]);
    }).catch(() => {});
  }, [communityId, currentUser?.id]);

  if (!challenge) return null;

  const today = todayStr();
  const myVal = (allUsersData[currentUser?.id] || {})[today]?.[challenge.metric] || 0;
  const myPct = challenge.target > 0 ? Math.min(100, Math.round((myVal / challenge.target) * 100)) : 0;
  const daysLeft = Math.max(0, Math.ceil((challenge.endTs - Date.now()) / 86400000));

  // Get leaderboard position
  const ranked = (challenge.participants || []).map(uid => ({
    uid,
    val: (allUsersData[uid] || {})[today]?.[challenge.metric] || 0,
  })).sort((a,b) => b.val - a.val);
  const myRank = ranked.findIndex(r => r.uid === currentUser?.id) + 1;
  const ahead = myRank > 1 ? ranked[myRank-2] : null;
  const gapAhead = ahead ? ahead.val - myVal : 0;

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(29,201,232,0.07) 0%, rgba(74,207,134,0.04) 100%)", border: "1px solid rgba(29,201,232,0.2)", borderRadius: "14px", padding: "14px 16px", cursor: "pointer" }}
      onClick={() => onSwitchTab && onSwitchTab("compete")}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "0.9rem" }}>⚡</span>
          <span style={{ fontSize: "0.72rem", fontWeight: "800", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Active Challenge</span>
        </div>
        <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: F }}>{daysLeft}d left</span>
      </div>
      <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F, marginBottom: "8px" }}>{challenge.title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ flex: 1, height: "5px", background: "var(--bg-3)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${myPct}%`, background: myPct >= 100 ? "#4ACF86" : "var(--accent)", borderRadius: "3px", transition: "width 0.4s" }} />
        </div>
        <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-secondary)", fontFamily: F }}>{myVal}/{challenge.target}</span>
      </div>
      {myRank > 0 && (
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "6px", fontFamily: F }}>
          You're #{myRank} · {ahead ? `${gapAhead} behind ${ahead.uid === currentUser?.id ? "you" : "the person ahead"}` : "you're leading 🏆"}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ── CommunitiesView — full rework ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function CommunitiesView({ currentUser, users, allUsersData, allUserGoals, industryConfigs,
  communities, communityMembers, communityPendingRequests, orgId, admins, teams, presenceMap, onOpenDm, onNotify, isAdmin, activeSpace,
  onApproveCommunityRequest, onRejectCommunityRequest, onJoinCommunity, tab, onSwitchTab, isPro, onShowPaywall }) {
  const F = "'DM Sans',system-ui,sans-serif";
  const activeTab = tab || "dashboard";
  function switchTab(t) { if (onSwitchTab) onSwitchTab(t); }

  const [activeCommunityId, setActiveCommunityId] = useState(() => communities[0]?.id || "");
  const [combinedFeed, setCombinedFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [filterCom, setFilterCom] = useState("all");
  const [selectedComMembers, setSelectedComMembers] = useState(communities[0]?.id || "");
  const [memberFilter, setMemberFilter] = useState("active");
  const [deniedByComm, setDeniedByComm] = useState({});
  const [viewProfileUser, setViewProfileUser] = useState(null);
  const [composerPrefill, setComposerPrefill] = useState("");
  const [announcement, setAnnouncement] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [announceDraft, setAnnounceDraft] = useState("");
  const [crewSlug, setCrewSlug] = useState("");
  const [slugDraft, setSlugDraft] = useState("");
  const [editingSlug, setEditingSlug] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [chatOpen, setChatOpen] = useState(true); // default expanded
  const [officialChallenge, setOfficialChallenge] = useState(null);

  // Set first community as active
  useEffect(() => {
    if (!activeCommunityId && communities.length > 0) setActiveCommunityId(communities[0].id);
    if (!selectedComMembers && communities.length > 0) setSelectedComMembers(communities[0].id);
  }, [communities]);

  // Load all crew feeds
  useEffect(() => {
    if (!communities.length) { setFeedLoading(false); return; }
    setFeedLoading(true);
    Promise.all(communities.map(c =>
      loadFeed(c.id).then(items => (items || []).map(i => ({ ...i, _comId: c.id, _comName: c.name }))).catch(() => [])
    )).then(arrays => {
      setCombinedFeed(arrays.flat().sort((a, b) => (b.ts || 0) - (a.ts || 0)));
      setFeedLoading(false);
    }).catch(() => setFeedLoading(false));
  }, [communities.map(c => c.id).join(",")]);

  // Load denied
  useEffect(() => {
    if (!selectedComMembers) return;
    loadDeniedRequests(selectedComMembers).then(d => setDeniedByComm(prev => ({ ...prev, [selectedComMembers]: d }))).catch(() => {});
  }, [selectedComMembers]);

  // Load leader controls for active crew
  useEffect(() => {
    if (!activeCommunityId) return;
    loadCrewAnnouncement(activeCommunityId).then(a => setAnnouncement(a)).catch(() => {});
    loadCrewOfficialChallenge(activeCommunityId).then(ch => setOfficialChallenge(ch)).catch(() => {});
    loadCrewSlug(activeCommunityId).then(s => { if (s) setCrewSlug(s); }).catch(() => {});
  }, [activeCommunityId]);

  async function handleRejectCommunity(communityId, userId) {
    await onRejectCommunityRequest(communityId, userId);
    const fresh = await loadDeniedRequests(communityId).catch(() => []);
    setDeniedByComm(prev => ({ ...prev, [communityId]: fresh }));
  }

  const totalComPending = Object.values(communityPendingRequests || {}).reduce((s, a) => s + (a?.length || 0), 0);
  const activeCom = communities.find(c => c.id === activeCommunityId) || communities[0];
  const liveUserIds = new Set((users || []).map(u => u.id));
  const activeMembers = activeCom ? (communityMembers[activeCom.id] || []).filter(m => liveUserIds.has(m.id || m.userId)) : [];
  const isComLeader = activeCom?.createdBy === currentUser?.id || isAdmin;
  const pulses = activeCom ? generateActivityPulses(activeMembers, allUsersData, allUserGoals, industryConfigs) : [];

  if (!communities.length) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)", fontFamily: F, marginBottom: "6px" }}>You're not in a crew yet</div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "20px" }}>
          Crews let you compete with others in your field, track together, and hold each other accountable.
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "40px" }}>
          <button onClick={() => window.dispatchEvent(new CustomEvent("cadence:go-spaces"))}
            style={{ background: "var(--accent)", color: "#000", border: "none", padding: "12px 24px", borderRadius: "10px", fontSize: "0.88rem", fontWeight: "800", cursor: "pointer", fontFamily: F }}>
            Find a Crew →
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent("cadence:create-crew"))}
            style={{ background: "rgba(168,85,247,0.1)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.3)", padding: "12px 24px", borderRadius: "10px", fontSize: "0.88rem", fontWeight: "800", cursor: "pointer", fontFamily: F }}>
            Start a Crew
          </button>
        </div>
        <div style={{ borderTop: "1px solid var(--border-1)", paddingTop: "28px", textAlign: "left" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: "800", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>Global Leaderboard</div>
          <LeaderboardView
            users={users} allUsersData={allUsersData} industryConfigs={industryConfigs}
            allUserGoals={allUserGoals} teams={teams} admins={admins}
            currentUser={currentUser} spaceType="community"
            communityIndustries={null} allFreezes={allFreezes}
          />
        </div>
      </div>
    );
  }

  const filteredFeed = filterCom === "all" ? combinedFeed : combinedFeed.filter(i => i._comId === filterCom);
  const feedPostSpaceId = filterCom !== "all" ? filterCom : activeCom?.id;
  const membersCom = communities.find(c => c.id === selectedComMembers);
  const activeMembersForCom = (communityMembers[selectedComMembers] || []).filter(m => liveUserIds.has(m.userId || m.id));
  const pendingForCom = (communityPendingRequests || {})[selectedComMembers] || [];
  const deniedForCom = deniedByComm[selectedComMembers] || [];
  const isComCreator = membersCom?.createdBy === currentUser?.id;
  const canManageCom = isAdmin || isComCreator;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* ── Community selector (if multiple) ── */}
      {communities.length > 1 && activeTab === "dashboard" && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
          {communities.map(c => (
            <button key={c.id} onClick={() => setActiveCommunityId(c.id)}
              style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", fontFamily: F,
                background: activeCommunityId === c.id ? "rgba(168,85,247,0.12)" : "var(--bg-1)",
                border: activeCommunityId === c.id ? "1px solid rgba(168,85,247,0.35)" : "1px solid var(--border-1)",
                color: activeCommunityId === c.id ? "#A855F7" : "var(--text-muted)",
              }}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════
          DASHBOARD — Crew Hub
          ══════════════════════════════════════ */}
      {activeTab === "dashboard" && activeCom && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* ── Crew header ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)", fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeCom.name}</div>
                {isComLeader && <span style={{ fontSize: "0.6rem", fontWeight: "800", color: "#A855F7", background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "4px", padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Leader</span>}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {activeMembers.length} members · {activeMembers.filter(m => getPresenceStatus(presenceMap || {}, m.id) !== "offline").length} active now
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              {isComLeader && (
                <>
                  <button onClick={() => setShowShareCard(v => !v)}
                    style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-muted)", padding: "6px 10px", borderRadius: "8px", fontSize: "0.75rem", cursor: "pointer", fontFamily: F }}>🔗 Share</button>
                  <button onClick={() => { null /* removed */; }}
                    style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-muted)", padding: "6px 10px", borderRadius: "8px", fontSize: "0.75rem", cursor: "pointer", fontFamily: F }}>📊 Report</button>
                </>
              )}
              <button onClick={() => switchTab("feed")}
                style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-muted)", padding: "6px 10px", borderRadius: "8px", fontSize: "0.75rem", cursor: "pointer", fontFamily: F }}>Feed →</button>
            </div>
          </div>

          {/* ── Public share card ── */}
          {showShareCard && isComLeader && (
            <div style={{ background: "var(--bg-2)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "12px", padding: "14px 16px" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: "800", color: "#A855F7", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>🔗 Public Crew Page</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
                {editingSlug ? (
                  <>
                    <input value={slugDraft} onChange={e => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} placeholder="your-crew-slug"
                      style={{ flex: 1, background: "var(--bg-1)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: "8px", padding: "7px 10px", color: "var(--text-primary)", fontSize: "0.82rem", fontFamily: F, outline: "none" }} />
                    <button onClick={async () => { if (slugDraft.trim()) { await saveCrewSlug(activeCom.id, slugDraft.trim()); setCrewSlug(slugDraft.trim()); } setEditingSlug(false); }}
                      style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#A855F7", padding: "7px 12px", borderRadius: "8px", cursor: "pointer", fontFamily: F, fontSize: "0.8rem", fontWeight: "700" }}>Save</button>
                    <button onClick={() => setEditingSlug(false)} style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-muted)", padding: "7px 10px", borderRadius: "8px", cursor: "pointer", fontFamily: F, fontSize: "0.8rem" }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: F }}>getcadence.net/c/{crewSlug || activeCom.id.slice(0,8)}</span>
                    <button onClick={() => { setSlugDraft(crewSlug); setEditingSlug(true); }} style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-muted)", padding: "6px 10px", borderRadius: "8px", cursor: "pointer", fontFamily: F, fontSize: "0.75rem" }}>Edit</button>
                    <button onClick={() => { const url = `https://getcadence.net/c/${crewSlug || activeCom.id.slice(0,8)}`; if (navigator.share) navigator.share({ title: activeCom.name, url }).catch(()=>{}); else { copyText(url); } }}
                      style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: "#A855F7", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontFamily: F, fontSize: "0.75rem", fontWeight: "700" }}>Copy</button>
                  </>
                )}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.5 }}>Share this link to let people find and join your crew.</div>
            </div>
          )}

          {/* ── Announcement ── */}
          {isComLeader && (
            <div style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: "12px", padding: "13px 15px" }}>
              {editingAnnouncement ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <textarea value={announceDraft} onChange={e => setAnnounceDraft(e.target.value)}
                    placeholder="Pin a message to your crew…" rows={3}
                    style={{ background: "var(--bg-2)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "8px", padding: "10px 12px", color: "var(--text-primary)", fontSize: "0.85rem", fontFamily: F, resize: "none", outline: "none", width: "100%", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={async () => { const b = { text: announceDraft.trim(), authorName: currentUser?.name, ts: Date.now() }; await saveCrewAnnouncement(activeCom.id, b); setAnnouncement(b); setEditingAnnouncement(false); if (onNotify) onNotify({ icon: "📣", text: `${currentUser?.name} posted a crew announcement`, link: "crews" }); }}
                      disabled={!announceDraft.trim()} style={{ flex: 1, background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#A855F7", padding: "8px", borderRadius: "8px", cursor: "pointer", fontFamily: F, fontSize: "0.82rem", fontWeight: "700" }}>Pin</button>
                    {announcement && <button onClick={async () => { await saveCrewAnnouncement(activeCom.id, null); setAnnouncement(null); setEditingAnnouncement(false); }}
                      style={{ background: "none", border: "1px solid rgba(255,100,100,0.3)", color: "rgba(255,100,100,0.6)", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontFamily: F, fontSize: "0.8rem" }}>Remove</button>}
                    <button onClick={() => setEditingAnnouncement(false)} style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-muted)", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontFamily: F, fontSize: "0.8rem" }}>Cancel</button>
                  </div>
                </div>
              ) : announcement ? (
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>📣</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5, fontFamily: F }}>{announcement.text}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "4px" }}>Pinned by {announcement.authorName}</div>
                  </div>
                  <button onClick={() => { setAnnounceDraft(announcement.text); setEditingAnnouncement(true); }}
                    style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-dim)", padding: "5px 8px", borderRadius: "7px", cursor: "pointer", fontFamily: F, fontSize: "0.72rem", flexShrink: 0 }}>Edit</button>
                </div>
              ) : (
                <button onClick={() => { setAnnounceDraft(""); setEditingAnnouncement(true); }}
                  style={{ width: "100%", background: "none", border: "1px dashed rgba(168,85,247,0.3)", color: "#A855F7", padding: "10px", borderRadius: "9px", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer", fontFamily: F }}>
                  📣 Pin an announcement to your crew
                </button>
              )}
            </div>
          )}
          {!isComLeader && announcement && (
            <div style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: "12px", padding: "13px 15px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>📣</span>
              <div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5, fontFamily: F }}>{announcement.text}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "4px" }}>Pinned by {announcement.authorName}</div>
              </div>
            </div>
          )}

          {/* ── Invite banner ── */}
          {activeMembers.length <= 2 && (
            <CommunityInviteButton communityId={activeCom.id} communityName={activeCom.name} userName={currentUser?.name || ""} />
          )}

          {/* ── Scoreboard — today's numbers, everyone, sorted by goal % ── */}
          <CrewScoreboard
            members={activeMembers}
            allUsersData={allUsersData}
            allUserGoals={allUserGoals}
            industryConfigs={industryConfigs}
            currentUser={currentUser}
          />

          {/* ── Crew Stats ── */}
          <GuildStats
            members={activeMembers}
            allUsersData={allUsersData}
            allUserGoals={allUserGoals}
            industryConfigs={industryConfigs}
            presenceMap={presenceMap}
          />

          {/* ── Three cards side-by-side: Bulletin | Official Challenge | Weekly Spark ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", alignItems: "start" }}>
            {/* Bulletin */}
            <GuildBulletin
              community={activeCom}
              members={activeMembers}
              allUsersData={allUsersData}
              allUserGoals={allUserGoals}
              industryConfigs={industryConfigs}
              currentUser={currentUser}
              isLeader={isComLeader}
              compact
            />

            {/* Official Challenge */}
            <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "14px", padding: "13px 14px", minHeight: "80px" }}>
              <div style={{ fontSize: "0.6rem", fontWeight: "800", color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>⚡ Challenge</div>
              {officialChallenge ? (
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F, lineHeight: 1.3 }}>{officialChallenge.title}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    {officialChallenge.type === "first" ? "First to" : officialChallenge.type === "streak" ? "Best streak" : "Most by"} · ends {new Date(officialChallenge.endTs).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                  </div>
                  {isComLeader && (
                    <button onClick={async () => { await saveCrewOfficialChallenge(activeCom.id, null); setOfficialChallenge(null); }}
                      style={{ marginTop: "8px", background: "none", border: "1px solid rgba(255,100,100,0.3)", color: "rgba(255,100,100,0.6)", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontFamily: F, fontSize: "0.68rem" }}>Unpin</button>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
                  {isComLeader
                    ? <button onClick={() => switchTab("compete")} style={{ background: "none", border: "none", color: "#F59E0B", cursor: "pointer", fontFamily: F, fontSize: "0.78rem", fontWeight: "700", padding: 0 }}>Pin one from Compete →</button>
                    : "No challenge pinned yet"}
                </div>
              )}
            </div>

            {/* Weekly Spark */}
            <GuildSparkPost
              community={activeCom}
              members={activeMembers}
              allUsersData={allUsersData}
              allUserGoals={allUserGoals}
              industryConfigs={industryConfigs}
              currentUser={currentUser}
              spaceId={activeCom.id}
              compact
            />
          </div>

          {/* ── Activity pulses ── */}
          <ActivityPulseStrip pulses={pulses} />

          {/* ── Active challenge progress ── */}
          <ActiveChallengeCard
            communityId={activeCom.id}
            currentUser={currentUser}
            allUsersData={allUsersData}
            allUserGoals={allUserGoals}
            industryConfigs={industryConfigs}
            onSwitchTab={switchTab}
          />

          {/* ── Discover more crews ── */}
          <DiscoverCommunitiesSection
            currentUserId={currentUser?.id}
            currentUserIndustry={currentUser?.industry}
            joinedIds={(communities || []).map(c => c.id)}
            onJoinByPin={onJoinCommunity}
          />
        </div>
      )}

      {/* ══════════════════════════════════════
          FEED — async post board
          ══════════════════════════════════════ */}
      {/* ══════════════════════════════════════
          PULSE — merged feed + chat
          ══════════════════════════════════════ */}
      {activeTab === "feed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Community filter pills */}
          {communities.length > 1 && (
            <div style={{ display: "flex", gap: "6px", marginBottom: "2px", flexWrap: "wrap" }}>
              <button onClick={() => setFilterCom("all")} style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", fontFamily: F,
                background: filterCom === "all" ? "rgba(29,201,232,0.12)" : "var(--bg-1)", border: filterCom === "all" ? "1px solid rgba(29,201,232,0.3)" : "1px solid var(--border-1)", color: filterCom === "all" ? "var(--accent)" : "var(--text-muted)" }}>All</button>
              {communities.map(c => (
                <button key={c.id} onClick={() => setFilterCom(c.id)} style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", fontFamily: F,
                  background: filterCom === c.id ? "rgba(168,85,247,0.12)" : "var(--bg-1)", border: filterCom === c.id ? "1px solid rgba(168,85,247,0.3)" : "1px solid var(--border-1)", color: filterCom === c.id ? "#A855F7" : "var(--text-muted)" }}>{c.name}</button>
              ))}
            </div>
          )}

          {/* ── Collapsible Crew Chat ── */}
          {activeCom && (
            <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "14px", overflow: "hidden" }}>
              <button onClick={() => setChatOpen(v => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.9rem" }}>💬</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)" }}>Crew Chat</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontWeight: "500" }}>{activeCom.name}</span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", transition: "transform 0.2s", display: "inline-block", transform: chatOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
              </button>
              {chatOpen && (
                <div style={{ borderTop: "1px solid var(--border-1)" }}>
                  <GuildChat
                    community={activeCom}
                    currentUser={currentUser}
                    members={activeMembers}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Post composer ── */}
          {feedPostSpaceId && (
            <SmartPostComposer
              currentUser={currentUser}
              spaceId={feedPostSpaceId}
              spaceName={filterCom !== "all" ? communities.find(c => c.id === filterCom)?.name : activeCom?.name}
              allUsers={activeMembers.length ? activeMembers : users}
              prefill={composerPrefill}
              onPosted={(newFeed) => {
                const comId = feedPostSpaceId;
                const comName = communities.find(c => c.id === comId)?.name || "";
                setCombinedFeed(prev => {
                  const others = prev.filter(p => p._comId !== comId);
                  return [...others, ...newFeed.map(p => ({ ...p, _comId: comId, _comName: comName }))].sort((a, b) => (b.ts || 0) - (a.ts || 0));
                });
                setComposerPrefill("");
              }}
            />
          )}

          {/* ── Feed posts ── */}
          {feedLoading ? (
            <div style={{ color: "var(--text-dim)", padding: "24px 0", textAlign: "center", fontStyle: "italic" }}>Loading feed…</div>
          ) : filteredFeed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📣</div>
              <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F, marginBottom: "6px" }}>Nothing posted yet</div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.55 }}>Drop a win, a question, or a tactic. Be the one who starts it.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredFeed.map((item, i) => (
                <div key={item.id || i}>
                  {filterCom === "all" && item._comName && (
                    <div style={{ fontSize: "0.63rem", fontWeight: "700", color: "#A855F7", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: "6px", padding: "2px 8px", display: "inline-block", marginBottom: "4px" }}>
                      🌐 {item._comName}
                    </div>
                  )}
                  <FeedPost
                    item={item} currentUser={currentUser} industryConfigs={industryConfigs}
                    spaceId={item._comId}
                    onFeedUpdate={(newFeed) => {
                      setCombinedFeed(prev => {
                        const others = prev.filter(p => p._comId !== item._comId);
                        return [...others, ...newFeed.map(p => ({ ...p, _comId: item._comId, _comName: item._comName }))].sort((a, b) => (b.ts || 0) - (a.ts || 0));
                      });
                    }}
                    isLast={i === filteredFeed.length - 1}
                    allUsers={activeMembers.length ? activeMembers : users}
                    streaks={{}} isAdmin={isAdmin}
                    onViewProfile={u => setViewProfileUser(u)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          COMPETE TAB
          ══════════════════════════════════════ */}
      {activeTab === "compete" && activeCom && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {communities.length > 1 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {communities.map(c => (
                <button key={c.id} onClick={() => setActiveCommunityId(c.id)}
                  style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", fontFamily: F,
                    background: activeCommunityId === c.id ? "rgba(168,85,247,0.12)" : "var(--bg-1)",
                    border: activeCommunityId === c.id ? "1px solid rgba(168,85,247,0.35)" : "1px solid var(--border-1)",
                    color: activeCommunityId === c.id ? "#A855F7" : "var(--text-muted)" }}>{c.name}</button>
              ))}
            </div>
          )}
          <CompeteView
            spaceId={activeCom.id}
            currentUser={currentUser}
            allUsers={activeMembers}
            allUsersData={allUsersData}
            industryConfigs={industryConfigs}
            allUserGoals={allUserGoals}
            isAdmin={isComLeader}
            activeSpace={{ id: activeCom.id, type: "community" }}
            onOpenDm={onOpenDm}
            onNotify={onNotify}
            isSolo={false}
            isPro={isPro}
            onShowPaywall={() => setShowPaywall(true)}
           />
        </div>
      )}

      {/* ══════════════════════════════════════
          MEMBERS TAB
          ══════════════════════════════════════ */}
      {activeTab === "members" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Community selector for members */}
          {communities.length > 1 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {communities.map(c => (
                <button key={c.id} onClick={() => setSelectedComMembers(c.id)}
                  style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", fontFamily: F,
                    background: selectedComMembers === c.id ? "rgba(168,85,247,0.12)" : "var(--bg-1)",
                    border: selectedComMembers === c.id ? "1px solid rgba(168,85,247,0.35)" : "1px solid var(--border-1)",
                    color: selectedComMembers === c.id ? "#A855F7" : "var(--text-muted)" }}>{c.name}</button>
              ))}
            </div>
          )}

          {/* Member filter tabs */}
          <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--border-1)" }}>
            {[["active","Active"],["pending","Pending"+(pendingForCom.length>0?` (${pendingForCom.length})`:"")],["denied","Denied"]].map(([k,label]) => (
              <button key={k} onClick={() => setMemberFilter(k)}
                style={{ padding: "8px 14px", background: "none", border: "none", borderBottom: memberFilter===k?"2px solid var(--accent)":"2px solid transparent", fontWeight: memberFilter===k?"700":"500", fontSize: "0.82rem", color: memberFilter===k?"var(--accent)":"var(--text-muted)", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent", marginBottom: "-1px" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Active members */}
          {memberFilter === "active" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {activeMembersForCom.length === 0 && <div style={{ color: "var(--text-dim)", textAlign: "center", padding: "30px 0" }}>No active members yet.</div>}
              {activeMembersForCom.map(m => {
                const today = todayStr();
                const cfg = industryConfigs[m.industry] || Object.values(industryConfigs)[0];
                const goals = allUserGoals[m.id] || {};
                const pct = computeGoalPct((allUsersData[m.id] || {})[today] || {}, cfg?.weekdayMetrics || [], goals);
                const streak = computeStreak(allUsersData[m.id] || {});
                const presStatus = getPresenceStatus(presenceMap || {}, m.id);
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "12px" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: initialsColor(m.name, m.avatarColor) || "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.88rem", fontWeight: "800", color: "#fff" }}>
                        {m.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <PresenceDot status={presStatus} size="sm" style={{ position: "absolute", bottom: "-1px", right: "-1px" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--text-primary)", fontFamily: F }}>{m.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{DEFAULT_INDUSTRIES[m.industry]?.icon} {DEFAULT_INDUSTRIES[m.industry]?.label || m.industry}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: "800", color: pct >= 100 ? "#4ACF86" : pct >= 60 ? "var(--accent)" : "var(--text-muted)", fontFamily: F }}>{Math.round(pct)}%</div>
                      <div style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>{streak.current}d streak</div>
                    </div>
                    {onOpenDm && m.id !== currentUser?.id && (
                      <button onClick={() => onOpenDm(m)} style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-muted)", borderRadius: "8px", padding: "5px 10px", fontSize: "0.72rem", fontWeight: "700", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent", flexShrink: 0 }}>DM</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending */}
          {memberFilter === "pending" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {pendingForCom.length === 0 && <div style={{ color: "var(--text-dim)", textAlign: "center", padding: "30px 0", fontStyle: "italic" }}>No pending requests.</div>}
              {pendingForCom.map(req => (
                <div key={req.userId} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(168,85,247,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", fontWeight: "bold", color: "#A855F7", flexShrink: 0 }}>
                    {(req.userName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)", fontFamily: F }}>{req.userName}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{DEFAULT_INDUSTRIES[req.userIndustry]?.icon} {DEFAULT_INDUSTRIES[req.userIndustry]?.label || req.userIndustry}</div>
                  </div>
                  {canManageCom && (
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button onClick={() => onApproveCommunityRequest(selectedComMembers, req)} style={{ background: "rgba(74,207,134,0.12)", border: "1px solid rgba(74,207,134,0.3)", color: "#4ACF86", padding: "6px 12px", borderRadius: "7px", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer", fontFamily: F }}>Approve</button>
                      <button onClick={() => handleRejectCommunity(selectedComMembers, req.userId)} style={{ background: "rgba(224,85,119,0.08)", border: "1px solid rgba(224,85,119,0.25)", color: "#E05577", padding: "6px 12px", borderRadius: "7px", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer", fontFamily: F }}>Deny</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Denied */}
          {memberFilter === "denied" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {deniedForCom.length === 0 && <div style={{ color: "var(--text-dim)", fontStyle: "italic", textAlign: "center", padding: "30px 0" }}>No denied requests.</div>}
              {deniedForCom.map(d => (
                <div key={d.userId} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 14px", background: "var(--bg-1)", border: "1px solid rgba(224,85,119,0.15)", borderRadius: "10px", opacity: 0.8, flexWrap: "wrap" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(224,85,119,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", fontWeight: "bold", color: "#E05577", flexShrink: 0 }}>
                    {(d.userName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-secondary)", fontFamily: F }}>{d.userName}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "1px" }}>
                      {DEFAULT_INDUSTRIES[d.userIndustry]?.icon} {DEFAULT_INDUSTRIES[d.userIndustry]?.label || d.userIndustry}
                      {" · Denied "}{d.deniedAt ? new Date(d.deniedAt).toLocaleDateString() : ""}
                      {d.deniedByName && ` by ${d.deniedByName}`}
                    </div>
                  </div>
                  {canManageCom && (
                    <button onClick={async () => {
                      await onApproveCommunityRequest(selectedComMembers, { userId: d.userId, userName: d.userName, userIndustry: d.userIndustry, personalNs: d.personalNs });
                      await clearDeniedRequest(selectedComMembers, d.userId).catch(() => {});
                      setDeniedByComm(prev => ({ ...prev, [selectedComMembers]: (prev[selectedComMembers] || []).filter(x => x.userId !== d.userId) }));
                    }} style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", color: "#A855F7", padding: "6px 12px", borderRadius: "7px", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer", fontFamily: F, flexShrink: 0 }}>
                      Reconsider
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile card modal */}
      {viewProfileUser && (
        <UserProfileCard user={viewProfileUser} currentUser={currentUser} allUsersData={allUsersData} allUserGoals={allUserGoals} industryConfigs={industryConfigs} onClose={() => setViewProfileUser(null)} onOpenDm={onOpenDm} />
      )}
    </div>
  );
}
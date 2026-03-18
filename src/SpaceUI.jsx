import React,{useState,useEffect,useRef,useCallback} from 'react';
import {AVATAR_COLOR_PRESETS,loadGlobalSuperAdmin,loadStreakFreezes,saveStreakFreezes,getProtectedDates,canLogPTO,canLogSick,computeStreak,computeGoalPct,getMilestoneDefinitions,computeMilestoneTotals,checkNewMilestones,isWeekend,todayStr,BB1,BB18,BB1A30,BB1A3A,BB2A10,BB2A28,BBA,BD1,BDIR,BG0,BG1,BG2,BG3,BP,BR,DEFAULT_INDUSTRIES,F,METRIC_COLORS,TA,TD,TM,TP,TS,TX,copyText,createInviteToken,getInviteURL,getUserAvatarColor,initialsColor,loadCommunityMembers,loadInvite,loadSpaceIndex,loadSpaceInvites,loadUserRegistry,nsKey,revokeInvite,s,storageGet,saDeleteSpace,saDeleteUserFromRegistry,saGetAllSpaceDetails,saGetSpaceUsers,saRemoveUserFromSpace,saRenameSpace,saUpdateSpaceMeta,saWipeUserData,removeFromSpaceIndex,loadJournalSettings,saveJournalSettings,loadOrgRoles,saveOrgRoles,loadCommunityRoles,saveCommunityRoles,loadOrgTeams,saveOrgTeams,loadMemberAssignments,setMemberAssignment,defaultOrgRoles,defaultCommunityRoles,ROLE_PERMISSIONS,canPerform,getTeamSubtree,approveOrg,rejectOrg,loadPendingOrgs,loadSpaceMeta,saveSpaceMeta,genId,loadDeniedRequests,saveDeniedRequest,clearDeniedRequest,haptic} from './shared.js';

export function SuperAdminPanel({ onClose }) {
 const [tab, setTab] = useState("spaces");
 const [spaceIdx, setSpaceIdx] = useState([]);
 const [userReg, setUserReg] = useState([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState("");
 const [typeFilter, setTypeFilter] = useState("all");
 const [expandedId, setExpandedId] = useState(null);
 const [spaceDetails, setSpaceDetails] = useState({});
 const [editingSpace, setEditingSpace] = useState(null);
 const [confirmDel, setConfirmDel] = useState(null);
 const [toast, setToast] = useState("");
 const [saving, setSaving] = useState(false);
 const [superAdminId, setSuperAdminId] = useState(null);

 useEffect(() => { loadGlobalSuperAdmin().then(sa => sa?.userId && setSuperAdminId(sa.userId)).catch(()=>{}); }, []);

 function isSuperAdminUser(userId) { return superAdminId && userId === superAdminId; }

 function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2800); }

 async function reload() {
  setLoading(true);
  const [idx, reg] = await Promise.all([loadSpaceIndex(), loadUserRegistry()]);
  setSpaceIdx(idx || []);
  setUserReg(reg || []);
  setLoading(false);
 }
 useEffect(() => { reload(); }, []);

 async function assignLicense(userId, plan, days) {
  setSaving(true);
  try {
   const expiresAt = days === 0 ? null : new Date(Date.now() + days * 86400000).toISOString();
   await window._sb?.from("user_subscriptions").upsert(
    { user_id: userId, plan, plan_expires_at: expiresAt, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
   );
   flash(days === 0 ? `${plan.toUpperCase()} — indefinite` : `${plan.toUpperCase()} — ${days}d`);
   setLicenseModal(null);
  } catch { flash("Failed"); }
  setSaving(false);
 }

 async function toggleExpand(space) {
  if (expandedId === space.id) { setExpandedId(null); return; }
  setExpandedId(space.id);
  if (spaceDetails[space.id]) return;
  const details = await saGetAllSpaceDetails(space.id, space.type);
  setSpaceDetails(p => ({ ...p, [space.id]: details }));
 }

 async function commitRenameSpace() {
  if (!editingSpace || !editingSpace.name.trim()) return;
  setSaving(true);
  await saUpdateSpaceMeta(editingSpace.id, { name: editingSpace.name.trim(), description: editingSpace.description || "" });
  setSpaceIdx(prev => prev.map(s => s.id === editingSpace.id ? { ...s, name: editingSpace.name.trim() } : s));
  setSpaceDetails(p => {
   if (!p[editingSpace.id]) return p;
   return { ...p, [editingSpace.id]: { ...p[editingSpace.id], meta: { ...p[editingSpace.id].meta, name: editingSpace.name.trim(), description: editingSpace.description || "" } } };
  });
  setSaving(false);
  setEditingSpace(null);
  flash("Space updated");
 }

 async function doDeleteSpace(spaceId) {
  setSaving(true);
  await saDeleteSpace(spaceId);
  setSpaceIdx(prev => prev.filter(s => s.id !== spaceId));
  setSpaceDetails(p => { const n = { ...p }; delete n[spaceId]; return n; });
  if (expandedId === spaceId) setExpandedId(null);
  setConfirmDel(null);
  setSaving(false);
  flash("Space deleted");
 }

 async function doRemoveUserFromSpace(spaceId, spaceType, userId) {
  setSaving(true);
  await saRemoveUserFromSpace(spaceId, spaceType, userId);
  setSpaceDetails(p => {
   if (!p[spaceId]) return p;
   return { ...p, [spaceId]: { ...p[spaceId], users: p[spaceId].users.filter(u => u.id !== userId) } };
  });
  setConfirmDel(null);
  setSaving(false);
  flash("User removed from space");
 }

 async function doWipeUserData(spaceId, userId, userName) {
  setSaving(true);
  await saWipeUserData(spaceId, userId);
  setConfirmDel(null);
  setSaving(false);
  flash(`Wiped data for ${userName}`);
 }

 async function doDeleteUserFromRegistry(userId) {
  setSaving(true);
  await saDeleteUserFromRegistry(userId);
  setUserReg(prev => prev.filter(r => r.userId !== userId));
  setConfirmDel(null);
  setSaving(false);
  flash("User removed from registry");
 }

 const q = filter.toLowerCase();
 const filteredSpaces = spaceIdx.filter(e =>
  (typeFilter === "all" || e.type === typeFilter) &&
  (!q || e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
 );
 const filteredUsers = userReg.filter(r =>
  !q || r.userName?.toLowerCase().includes(q) || r.spaceName?.toLowerCase().includes(q) || r.userId?.toLowerCase().includes(q)
 );
 const counts = {
  total: spaceIdx.length,
  org: spaceIdx.filter(e => e.type === "org").length,
  community: spaceIdx.filter(e => e.type === "community").length,
  solo: spaceIdx.filter(e => e.type === "solo").length,
  users: userReg.length,
 };
 const typeColor = { org: TA, community: "#A855F7", solo: TS };
 const typeIcon  = { org: "🏢", community: "🌐", solo: "👤" };
 const typeBg    = { org: "rgba(29,201,232,0.07)", community: "rgba(168,85,247,0.07)", solo: "rgba(255,255,255,0.03)" };

 const pill = (active) => ({
  background: active ? "var(--accent-dim)" : "rgba(255,255,255,0.04)",
  border: active ? "1px solid var(--btn-plus-border)" : "1px solid var(--glass-border)",
  color: active ? "var(--accent)" : "var(--text-muted)",
  padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem",
  fontWeight: "600", cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.12s"
 });
 const dangerBtn = {
  background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)",
  color: "var(--red)", padding: "3px 9px", borderRadius: "6px",
  fontSize: "0.75rem", fontWeight: "600", cursor: "pointer", flexShrink: 0
 };
 const ghostBtn = {
  background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)",
  color: "var(--text-secondary)", padding: "3px 9px", borderRadius: "6px",
  fontSize: "0.75rem", fontWeight: "500", cursor: "pointer", flexShrink: 0
 };
 const accentBtn = {
  background: "var(--accent-dim)", border: "1px solid var(--btn-plus-border)",
  color: "var(--accent)", padding: "3px 9px", borderRadius: "6px",
  fontSize: "0.75rem", fontWeight: "600", cursor: "pointer", flexShrink: 0
 };
 const tabBtn = (active) => ({
  background: active ? "var(--accent-dim)" : "none",
  border: "none",
  color: active ? "var(--accent)" : "var(--text-muted)",
  padding: "7px 16px", borderRadius: "8px", cursor: "pointer",
  fontFamily: F, fontWeight: "600", fontSize: "0.85rem", letterSpacing: "0.03em",
  transition: "all 0.12s"
 });

 return (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
   {toast && (
    <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "var(--bg-2)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "10px 20px", borderRadius: "10px", fontSize: "0.875rem", fontFamily: F, fontWeight: "600", zIndex: 99999, pointerEvents: "none", boxShadow: "0 4px 20px rgba(29,201,232,0.25)", whiteSpace: "nowrap" }}>
     ✓ {toast}
    </div>
   )}
   {confirmDel && (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
     <div style={{ background: "var(--bg-1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "14px", padding: "24px", maxWidth: "min(400px,92vw)", width: "100%", fontFamily: F }}>
      <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--red)", marginBottom: "8px", fontFamily: "'Syne','DM Sans',sans-serif" }}>⚠ Confirm Action</div>
      <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "20px" }}>{confirmDel.message}</div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
       <button style={ghostBtn} onClick={() => setConfirmDel(null)}>Cancel</button>
       <button style={{ ...dangerBtn, padding: "6px 16px", fontSize: "0.875rem" }} disabled={saving}
        onClick={() => {
         if (confirmDel.type === "space") doDeleteSpace(confirmDel.spaceId);
         else if (confirmDel.type === "spaceuser") doRemoveUserFromSpace(confirmDel.spaceId, confirmDel.spaceType, confirmDel.userId);
         else if (confirmDel.type === "wipe") doWipeUserData(confirmDel.spaceId, confirmDel.userId, confirmDel.userName);
         else if (confirmDel.type === "registry") doDeleteUserFromRegistry(confirmDel.userId);
        }}>
        {saving ? "Working…" : "Confirm"}
       </button>
      </div>
     </div>
    </div>
   )}
   <div style={{ background: "var(--bg-0)", border: "1px solid var(--border-1)", borderRadius: "16px", width: "100%", maxWidth: "820px", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <div style={{ padding: "16px 20px 0", borderBottom: "1px solid var(--glass-border)", flexShrink: 0 }}>
     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
      <div>
       <div style={{ fontSize: "0.85rem", color: "var(--accent)", letterSpacing: "0.12em", fontFamily: F, fontWeight: "700" }}>👑 SUPER ADMIN — GOD MODE</div>
       <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>Full control over every space and user across the entire app</div>
      </div>
      <button style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1rem", cursor: "pointer", padding: "4px" }} onClick={onClose}>✕</button>
     </div>
     {!loading && (
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
       {[["All Spaces", counts.total, "all"], ["Orgs", counts.org, "org"], ["Crews", counts.community, "community"], ["Solo", counts.solo, "solo"]].map(([label, val, type]) => (
        <button key={type} style={pill(tab === "spaces" && typeFilter === type)} onClick={() => { setTab("spaces"); setTypeFilter(type); setFilter(""); }}>
         <span style={{ fontSize: "1rem", fontWeight: "700", marginRight: "4px" }}>{val}</span> {label}
        </button>
       ))}
       <button style={pill(tab === "users")} onClick={() => { setTab("users"); setFilter(""); }}>
        <span style={{ fontSize: "1rem", fontWeight: "700", marginRight: "4px" }}>{counts.users}</span> Users
       </button>
      </div>
     )}
     <div style={{ display: "flex", gap: "2px", marginBottom: "-1px" }}>
      {[["spaces", "🏗 Spaces"], ["users", "👥 Users"]].map(([id, label]) => (
       <button key={id} style={tabBtn(tab === id)} onClick={() => setTab(id)}>{label}</button>
      ))}
     </div>
    </div>
    <div style={{ overflow: "auto", padding: "16px 20px", flex: 1 }}>
     {loading ? (
      <div style={{ color: "var(--text-dim)", fontSize: "0.875rem", fontStyle: "italic", padding: "20px 0" }}>Loading registry…</div>
     ) : tab === "spaces" ? (
      <>
       <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search spaces by name or ID…"
         style={{ ...s.inpBase, flex: 1, minWidth: "200px", padding: "8px 12px", fontSize: "0.875rem" }} />
        <div style={{ display: "flex", gap: "4px" }}>
         {["all", "org", "community", "solo"].map(t => (
          <button key={t} style={pill(typeFilter === t)} onClick={() => setTypeFilter(t)}>{t}</button>
         ))}
        </div>
       </div>
       {filteredSpaces.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: "0.875rem", fontStyle: "italic" }}>No spaces found.</div>}
       {filteredSpaces.map(space => {
        const isExp = expandedId === space.id;
        const details = spaceDetails[space.id];
        const isEditing = editingSpace?.id === space.id;
        return (
         <div key={space.id} style={{ background: typeBg[space.type] || "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "10px", marginBottom: "6px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px" }}>
           <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{typeIcon[space.type] || "◆"}</span>
           <div style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
             <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              <input value={editingSpace.name} onChange={e => setEditingSpace(p => ({ ...p, name: e.target.value }))}
               style={{ ...s.inpBase, padding: "4px 8px", fontSize: "0.875rem", width: "160px" }} autoFocus
               onKeyDown={e => { if (e.key === "Enter") commitRenameSpace(); if (e.key === "Escape") setEditingSpace(null); }} />
              <input value={editingSpace.description || ""} onChange={e => setEditingSpace(p => ({ ...p, description: e.target.value }))}
               placeholder="Description (optional)"
               style={{ ...s.inpBase, padding: "4px 8px", fontSize: "0.8rem", width: "180px" }} />
              <button style={accentBtn} onClick={commitRenameSpace} disabled={saving}>Save</button>
              <button style={ghostBtn} onClick={() => setEditingSpace(null)}>Cancel</button>
             </div>
            ) : (
             <>
              <div style={{ fontSize: "0.925rem", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{space.name}</div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
               <span style={{ fontSize: "0.7rem", color: typeColor[space.type] || "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "700" }}>{space.type}</span>
               <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontFamily: "monospace" }}>{space.id}</span>
              </div>
             </>
            )}
           </div>
           <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", flexShrink: 0 }}>{new Date(space.createdAt).toLocaleDateString()}</div>
           {!isEditing && <>
            <button style={ghostBtn} onClick={() => setEditingSpace({ id: space.id, name: space.name, description: space.description || "" })}>✏ Edit</button>
            <button style={accentBtn} onClick={() => toggleExpand(space)}>{isExp ? "▲ Hide" : "▾ Expand"}</button>
            <button style={dangerBtn} onClick={() => setConfirmDel({ type: "space", spaceId: space.id, message: `Permanently delete "${space.name}" and all its data? This cannot be undone.` })}>🗑 Delete</button>
           </>}
          </div>
          {isExp && (
           <div style={{ borderTop: "1px solid var(--glass-border)", padding: "12px 14px" }}>
            {!details ? (
             <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontStyle: "italic" }}>Loading…</div>
            ) : (<>
             {details.meta?.description && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "10px", fontStyle: "italic" }}>{details.meta.description}</div>
             )}
             <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "700", marginBottom: "8px" }}>
              Members ({details.users.length})
              {details.admins?.length > 0 && <span style={{ marginLeft: "8px", color: "var(--accent)", fontWeight: "600" }}> · {details.admins.length} admin{details.admins.length > 1 ? "s" : ""}</span>}
             </div>
             {details.users.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontStyle: "italic", marginBottom: "10px" }}>No members</div>
             ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
               {details.users.map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                 <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: u.avatarColor || "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-primary)", flexShrink: 0 }}>
                  {(u.name || "?").split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)}
                 </div>
                 <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                   {u.name}
                   {details.admins?.includes(u.id) && <span style={{ fontSize: "0.65rem", background: "var(--accent-dim)", color: "var(--accent)", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>ADMIN</span>}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }}>{u.id}</div>
                 </div>
                 {u.industry && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0 }}>{u.industry}</span>}
                 {!isSuperAdminUser(u.id) && <button style={ghostBtn} onClick={() => setConfirmDel({ type: "wipe", spaceId: space.id, userId: u.id, userName: u.name, message: `Wipe all activity data for "${u.name}" in "${space.name}"? Their account stays but all logs are deleted.` })}>🧹 Wipe Data</button>}
                 {!isSuperAdminUser(u.id) && <button style={dangerBtn} onClick={() => setConfirmDel({ type: "spaceuser", spaceId: space.id, spaceType: space.type, userId: u.id, message: `Remove "${u.name}" from "${space.name}"? Their data in this space will also be deleted.` })}>🗑 Delete User</button>}
                 {isSuperAdminUser(u.id) && <span style={{ fontSize:"0.7rem", color:"var(--accent)", padding:"4px 8px", background:"rgba(29,201,232,0.1)", borderRadius:"6px", flexShrink:0 }}>🛡 Protected</span>}
                </div>
               ))}
              </div>
             )}
             {details.pending?.length > 0 && (
              <div>
               <div style={{ fontSize: "0.75rem", color: "var(--orange)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "700", marginBottom: "6px" }}>Pending Requests ({details.pending.length})</div>
               {details.pending.map(req => (
                <div key={req.requestId} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 10px", background: "rgba(245,158,11,0.06)", borderRadius: "8px", marginBottom: "4px", border: "1px solid rgba(245,158,11,0.15)" }}>
                 <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--text-secondary)" }}>{req.userName}</span>
                 <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{new Date(req.requestedAt).toLocaleDateString()}</span>
                </div>
               ))}
              </div>
             )}
            </>)}
           </div>
          )}
         </div>
        );
       })}
      </>
     ) : (
      <>
       <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search users by name, ID, or space…"
        style={{ ...s.inpBase, width: "100%", padding: "8px 12px", fontSize: "0.875rem", marginBottom: "12px", boxSizing: "border-box" }} />
       <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "10px" }}>{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} in registry</div>
       {filteredUsers.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: "0.875rem", fontStyle: "italic" }}>No users found.</div>}
       {filteredUsers.map(r => (
        <div key={r.userId} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "10px", marginBottom: "5px" }}>
         <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700", color: "var(--accent)", flexShrink: 0 }}>
          {(r.userName || "?").split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)}
         </div>
         <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)" }}>{r.userName || "(unnamed)"}</div>
          <div style={{ display: "flex", gap: "8px", marginTop: "2px", flexWrap: "wrap" }}>
           <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }}>{r.userId}</span>
           {r.spaceName && <span style={{ fontSize: "0.72rem", color: typeColor[r.spaceType] || "var(--text-muted)" }}>{typeIcon[r.spaceType]} {r.spaceName}</span>}
           {r.registeredAt && <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{new Date(r.registeredAt).toLocaleDateString()}</span>}
          </div>
         </div>
         <button style={dangerBtn} onClick={() => setConfirmDel({ type: "registry", userId: r.userId, message: `Fully delete "${r.userName}"? Wipes all data: activity, goals, messages, registry. They can re-onboard fresh.` })}>✕ Remove</button>
        </div>
       ))}
      </>
     )}
    </div>
    <div style={{ padding: "10px 20px", borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
     <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{spaceIdx.length} spaces · {userReg.length} registered users</div>
     <button style={ghostBtn} onClick={reload}>↻ Refresh</button>
    </div>
   </div>
  </div>
 );
}
// Org invite — admin-only, copies org invite link
export function OrgInviteButton({ orgId, orgName, userName }) {
 const [copied, setCopied] = useState(false);
 const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
 async function handle() {
  const token = await createInviteToken(orgId, orgName, userName, "org");
  const url = getInviteURL(token);
  if (isMobile && navigator.share) {
   try {
    await navigator.share({ title: `${orgName} — join us on Cadence`, text: `You're invited to join ${orgName} — a high-performance team on Cadence. Show up every day.`, url });
    setCopied(true); setTimeout(() => setCopied(false), 2500);
    return;
   } catch {}
  }
  try { navigator.clipboard.writeText(url); } catch { copyText(url); }
  setCopied(true); setTimeout(() => setCopied(false), 2500);
 }
 return (
  <button style={{background:copied?BP:BG0,border:`1px solid ${copied?BD1:"var(--border-2)"}`,color:copied?"#5DC1DB":TS,...s.btn9,...s.Fc}} onClick={handle}>
   {copied ? "✓ Copied" : (isMobile && navigator.share) ? "Invite →" : "Invite →"}
  </button>
 );
}

// Small helper — generates/copies a Crew invite link inline
export function CommunityInviteButton({ communityId, communityName, userName, compact = false }) {
 const [copied, setCopied] = useState(false);
 const [url, setUrl] = useState(null);
 const [showPanel, setShowPanel] = useState(false);
 const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
 const F = "'DM Sans',system-ui,sans-serif";

 async function generateLink() {
  const token = await createInviteToken(communityId, communityName, userName, "community");
  const u = getInviteURL(token);
  setUrl(u);
  return u;
 }

 async function handleShare() {
  const u = url || await generateLink();
  if (isMobile && navigator.share) {
   try {
    await navigator.share({ title: `${communityName} — join the Crew`, text: `${userName} invited you to ${communityName} on Cadence — where driven people track, compete, and hold each other accountable.`, url: u });
    setCopied(true); setTimeout(() => setCopied(false), 2500);
    return;
   } catch {}
  }
  try { navigator.clipboard.writeText(u); } catch { copyText(u); }
  setCopied(true); setTimeout(() => setCopied(false), 3000);
 }

 async function handleShowPanel() {
  if (!url) await generateLink();
  setShowPanel(true);
 }

 if (compact) {
  return (
   <button style={{ background: copied ? "rgba(29,201,232,0.15)" : "rgba(29,201,232,0.08)", border: "1px solid rgba(29,201,232,0.3)", color: "var(--accent)", borderRadius: "8px", padding: "7px 14px", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent", display: "flex", alignItems: "center", gap: "5px" }} onClick={handleShare}>
    {copied ? "✓ Copied!" : isMobile && navigator.share ? "💬 Invite" : "📋 Invite"}
   </button>
  );
 }

 return (
  <>
   {/* Invite banner — prominent card */}
   <div style={{ background: "linear-gradient(135deg, rgba(29,201,232,0.08) 0%, rgba(123,111,216,0.08) 100%)", border: "1px solid rgba(29,201,232,0.2)", borderRadius: "14px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
    <div style={{ flex: 1, minWidth: "180px" }}>
     <div style={{ fontSize: "0.82rem", fontWeight: "800", color: "var(--text-primary)", fontFamily: F, marginBottom: "2px" }}>Invite people to {communityName}</div>
     <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>Share a link — anyone with it can join this Crew</div>
    </div>
    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
     {isMobile && navigator.share ? (
      <button onClick={handleShare} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: "9px", padding: "9px 18px", fontSize: "0.82rem", fontWeight: "800", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent", display: "flex", alignItems: "center", gap: "6px" }}>
       {copied ? "✓ Shared!" : "💬 Share Invite"}
      </button>
     ) : (
      <>
       <button onClick={handleShowPanel} style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", color: "var(--text-secondary)", borderRadius: "9px", padding: "9px 14px", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
        🔗 Get Link
       </button>
       <button onClick={handleShare} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: "9px", padding: "9px 18px", fontSize: "0.82rem", fontWeight: "800", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}>
        {copied ? "✓ Copied!" : "📋 Copy Link"}
       </button>
      </>
     )}
    </div>
   </div>

   {/* Link panel modal */}
   {showPanel && url && (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setShowPanel(false)}>
     <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "16px", padding: "24px", maxWidth: "440px", width: "100%", fontFamily: F }} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: "1rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>Invite to {communityName}</div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "16px" }}>Anyone with this link can request to join your Crew.</div>
      <div style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "10px", padding: "10px 14px", fontSize: "0.78rem", color: "var(--text-secondary)", fontFamily: "monospace", wordBreak: "break-all", marginBottom: "14px", lineHeight: 1.5 }}>{url}</div>
      <div style={{ display: "flex", gap: "8px" }}>
       <button onClick={handleShare} style={{ flex: 1, background: "var(--accent)", color: "#000", border: "none", borderRadius: "9px", padding: "10px", fontSize: "0.85rem", fontWeight: "800", cursor: "pointer", fontFamily: F }}>
        {copied ? "✓ Copied!" : "Copy Link"}
       </button>
       <button onClick={() => setShowPanel(false)} style={{ background: "none", border: "1px solid var(--border-1)", color: "var(--text-muted)", borderRadius: "9px", padding: "10px 16px", fontSize: "0.85rem", cursor: "pointer", fontFamily: F }}>Close</button>
      </div>
     </div>
    </div>
   )}
  </>
 );
}

// Dropdown chip next to user name showing current space context; lets you
// switch between Solo / Org / Community views and create/invite from here.

export function SpaceSwitcher({
 user, orgId, orgMeta, isSolo, communities, isSuperAdmin,
 activeSpaceFilter, onSetSpaceFilter,
 onCreateCommunity, onFlashSaved
}) {
 const [open, setOpen] = useState(false);
 const [showCreate, setShowCreate] = useState(false);
 const [newName, setNewName] = useState("");
 const [newDesc, setNewDesc] = useState("");
 const [newPin, setNewPin] = useState("");
 const [creating, setCreating] = useState(false);
 const [createdToken, setCreatedToken] = useState(null);
 const [inviteCopied, setInviteCopied] = useState(null);
 const ref = useRef(null);
 const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 600;

 useEffect(() => {
  if (!open) return;
  function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
  document.addEventListener("mousedown", handle);
  document.addEventListener("touchstart", handle);
  return () => { document.removeEventListener("mousedown", handle); document.removeEventListener("touchstart", handle); };
 }, [open]);

 const hasOrg = orgId && !isSolo;
 const hasCommunities = communities && communities.length > 0;

 function currentLabel() {
  if (!activeSpaceFilter || activeSpaceFilter === "solo") return "Solo";
  if (activeSpaceFilter === orgId) return orgMeta?.name || "Org";
  const cm = (communities || []).find(c => c.id === activeSpaceFilter);
  if (cm) return cm.name;
  return "Solo";
 }

 async function shareInvite(spaceId, spaceName, spaceType) {
  const token = await createInviteToken(spaceId, spaceName, user.name, spaceType);
  const url = getInviteURL(token);
  if (isMob && navigator.share) {
   try { await navigator.share({ title: `${userName} invited you to ${spaceName}`, text: `${userName} is building something on Cadence. Join them — track daily, compete, stay accountable.`, url }); setInviteCopied(spaceId); setTimeout(() => setInviteCopied(null), 2500); return; } catch {}
  }
  try { navigator.clipboard.writeText(url); } catch {
   copyText(url);
  }
  setInviteCopied(spaceId); setTimeout(() => setInviteCopied(null), 2500);
  onFlashSaved && onFlashSaved("✓ Invite link copied to clipboard");
 }

 async function handleCreate() {
  if (!newName.trim()) return;
  setCreating(true);
  try {
   const meta = await onCreateCommunity(newName.trim(), newDesc.trim(), newPin.trim());
   if (meta) {
    const token = await createInviteToken(meta.id, meta.name, user.name, "community");
    setCreatedToken({ token, name: meta.name, id: meta.id });
    onSetSpaceFilter(meta.id);
   }
   onFlashSaved("Crew created! 🎶");
   setNewName(""); setNewDesc(""); setNewPin(""); setShowCreate(false);
  } catch(e) { console.error(e); }
  setCreating(false);
 }

 const chipColor = (() => {
  if (!activeSpaceFilter || activeSpaceFilter === "solo") return { bg: BG0, border: "var(--bg-4)", text: TM };
  if (activeSpaceFilter === orgId) return { bg: BG1, border: "#2A1E00", text: TA };
  return { bg: BP, border: "var(--btn-plus-border)", text: "#5DC1DB" };
 })();

 const spaceIcon = (() => {
  if (!activeSpaceFilter || activeSpaceFilter === "solo") return "◎";
  if (activeSpaceFilter === orgId) return "🏢";
  return "🌐";
 })();

 return (
  <div ref={ref} style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
   {inviteCopied && (
    <div style={{position:"fixed",bottom:"24px",left:"50%",transform:"translateX(-50%)",background:"var(--bg-2)",border:"1px solid var(--accent)",color:"var(--accent)",padding:"10px 20px",borderRadius:"10px",fontSize:"0.9rem",fontFamily:F,fontWeight:"600",zIndex:99999,pointerEvents:"none",boxShadow:"0 4px 20px rgba(29,201,232,0.25)",whiteSpace:"nowrap"}}>
     ✓ Invite link copied to clipboard
    </div>
   )}
   {/* Trigger chip */}
   <button
    onClick={() => setOpen(p => !p)}
    style={{
     background: chipColor.bg, border: `1px solid ${chipColor.border}`, color: chipColor.text,
     padding: "9px 11px", borderRadius: "8px", fontSize: "0.95rem", fontFamily: F,
     letterSpacing: "0.05em", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
     minHeight: "38px", WebkitTapHighlightColor: "transparent", whiteSpace: "nowrap"
    }}
   >
    <span style={{ fontSize: "0.9rem" }}>{spaceIcon}</span>
    {!isMob && <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentLabel()}</span>}
    <span style={{ fontSize: "0.9rem", opacity: 0.6 }}>{open ? "▲" : "▾"}</span>
   </button>

   {/* Dropdown */}
   {open && (
    <>
    <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,0.5)"}}/>
    <div style={{
     position: "fixed", bottom: 0, left: 0, right: 0,
     zIndex: 9999, background:"var(--bg-1)", border: "1px solid #252525",
     borderRadius: "20px 20px 0 0",
     boxShadow: "0 -8px 32px rgba(0,0,0,0.7)", width: "100%",
     maxHeight: "75dvh", overflowY: "auto",
     fontFamily: F, paddingBottom:"env(safe-area-inset-bottom,16px)"
    }}>
    <div style={{width:"40px",height:"4px",background:"rgba(255,255,255,0.15)",borderRadius:"2px",margin:"10px auto 4px",flexShrink:0}}/>
     {/* Section: Solo */}
     <div style={{ padding: "6px 8px", borderBottom: BB18 }}>
      <div style={s.x13}>View</div>
      <button
       onClick={() => { onSetSpaceFilter("solo"); setOpen(false); }}
       style={{
        width: "100%", textAlign: "left", background: (!activeSpaceFilter || activeSpaceFilter === "solo") ? "var(--bg-4)" : "none",
        border: "none", borderRadius: "8px", color: (!activeSpaceFilter || activeSpaceFilter === "solo") ? "#C8C0B8" : TM,
        padding: "8px 10px", fontSize: "0.95rem", fontFamily: F, cursor: "pointer",
        ...s.fg8ac
       }}
      >
       <span>◎</span>
       <div>
        <div>Solo</div>
        <div style={{ fontSize: "0.9rem", color: TD, marginTop: "1px" }}>Your personal view</div>
       </div>
       {(!activeSpaceFilter || activeSpaceFilter === "solo") && <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#5DC1DB" }}>✓</span>}
      </button>
     </div>

     {/* Section: Organization */}
     {hasOrg && (
      <div style={{ padding: "6px 8px", borderBottom: BB18 }}>
       <div style={s.x13}>Organization</div>
       <div
        style={{
         background: activeSpaceFilter === orgId ? BG2 : "none",
         border: activeSpaceFilter === orgId ? "1px solid #2A1E00" : "1px solid transparent",
         borderRadius: "8px", padding: "8px 10px", ...s.fg8ac
        }}
       >
        <button
         onClick={() => { onSetSpaceFilter(orgId); setOpen(false); }}
         style={{
          flex: 1, textAlign: "left", background: "none", border: "none",
          color: activeSpaceFilter === orgId ? TA : TS,
          fontSize: "0.95rem", fontFamily: F, cursor: "pointer", padding: 0,
          ...s.fg8ac
         }}
        >
         <span>🏢</span>
         <div>
          <div style={{ fontWeight: "bold" }}>{orgMeta?.name || "Organization"}</div>
          {isSuperAdmin && <div style={{ fontSize: "0.9rem", color: "#23CDED88", marginTop: "1px" }}>Admin</div>}
         </div>
         {activeSpaceFilter === orgId && <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#5DC1DB" }}>✓</span>}
        </button>
        {isSuperAdmin && (
         <button
          onClick={() => shareInvite(orgId, orgMeta?.name || "Organization", "org")}
          style={{
           background: inviteCopied === orgId ? BP : BG1,
           border: `1px solid ${inviteCopied === orgId ? BD1 : "#2A1E00"}`,
           color: inviteCopied === orgId ? "#5DC1DB" : TA,
           padding: "4px 9px", borderRadius: "6px", fontSize: "0.9rem",
           fontFamily: F, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap"
          }}
         >
          {inviteCopied === orgId ? "✓" : isMob && navigator.share ? "💬" : "Invite"}
         </button>
        )}
       </div>
      </div>
     )}

     {/* Section: Crews */}
     <div style={{ padding: "6px 8px" }}>
      <div style={s.x13}>
       Communities {hasCommunities && <span style={{ color: TX }}>({communities.length})</span>}
      </div>

      {hasCommunities ? communities.map(cm => (
       <div key={cm.id} style={{
        background: activeSpaceFilter === cm.id ? BP : "none",
        border: activeSpaceFilter === cm.id ? BB1A3A : "1px solid transparent",
        borderRadius: "8px", padding: "7px 10px", marginBottom: "3px",
        ...s.fg8ac
       }}>
        <button
         onClick={() => { onSetSpaceFilter(cm.id); setOpen(false); }}
         style={{
          flex: 1, textAlign: "left", background: "none", border: "none",
          color: activeSpaceFilter === cm.id ? "#5DC1DB" : TS,
          fontSize: "0.95rem", fontFamily: F, cursor: "pointer", padding: 0,
          ...s.fg8ac
         }}
        >
         <span>🌐</span>
         <div style={{ minWidth: 0 }}>
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cm.name}</div>
         </div>
         {activeSpaceFilter === cm.id && <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#5DC1DB", flexShrink: 0 }}>✓</span>}
        </button>
        <button
         onClick={() => shareInvite(cm.id, cm.name, "community")}
         style={{
          background: inviteCopied === cm.id ? BP : BP,
          border: `1px solid ${inviteCopied === cm.id ? BD1 : "var(--btn-plus-border)"}`,
          color: inviteCopied === cm.id ? "#5DC1DB" : "var(--green)",
          padding: "4px 9px", borderRadius: "6px", fontSize: "0.9rem",
          fontFamily: F, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap"
         }}
        >
         {inviteCopied === cm.id ? "✓" : isMob && navigator.share ? "💬" : "Invite"}
        </button>
       </div>
      )) : (
       <div style={{ fontSize: "0.95rem", color: TD, padding: "6px 10px", fontStyle: "italic" }}>No communities yet</div>
      )}

      {/* Create community */}
      {!showCreate ? (
       <button
        onClick={() => setShowCreate(true)}
        style={{
         width: "100%", textAlign: "left", background: "none", border: "1px dashed #1A1A2A",
         color: "#4A4A7A", padding: "7px 10px", borderRadius: "8px", fontSize: "0.8rem",
         fontFamily: F, cursor: "pointer", marginTop: "4px", letterSpacing: "0.05em"
        }}
       >
        + Create Crew
       </button>
      ) : (
       <div style={{ background: BG0, border: BB1A30, borderRadius: "8px", padding: "10px", marginTop: "4px" }}>
        <div style={{ fontSize: "0.9rem", color: "#7B6FD8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>New Community</div>
        <input
         autoFocus
         placeholder="Name (e.g. Knoxville Closers)"
         value={newName}
         onChange={e => setNewName(e.target.value)}
         onKeyDown={e => e.key === "Enter" && handleCreate()}
         style={{ width: "100%", boxSizing: "border-box", background: BG0, border: "1px solid #1A1A2A", color: TP, padding: "7px 9px", borderRadius: "8px", fontSize: "0.95rem", fontFamily: F, marginBottom: "5px", outline: "none" }}
        />
        <input
         placeholder="Description (optional)"
         value={newDesc}
         onChange={e => setNewDesc(e.target.value)}
         style={{ width: "100%", boxSizing: "border-box", background: BG0, border: "1px solid #1A1A2A", color: TP, padding: "7px 9px", borderRadius: "8px", fontSize: "0.95rem", fontFamily: F, marginBottom: "5px", outline: "none" }}
        />
        <input
         placeholder="Password for instant join (optional)"
         value={newPin}
         onChange={e => setNewPin(e.target.value)}
         style={{ width: "100%", boxSizing: "border-box", background: BG0, border: "1px solid #1A1A2A", color: TP, padding: "7px 9px", borderRadius: "8px", fontSize: "0.95rem", fontFamily: F, marginBottom: "8px", outline: "none" }}
        />
        <div style={{ display: "flex", gap: "6px" }}>
         <button
          onClick={handleCreate}
          disabled={!newName.trim() || creating}
          style={{ flex: 1, background: newName.trim() && !creating ? "#7B6FD8" : BD1, border: "none", color: newName.trim() && !creating ? BR : TD, padding: "7px", borderRadius: "6px", fontSize: "0.8rem", fontFamily: F, fontWeight: "bold", cursor: "pointer" }}
         >
          {creating ? "Creating…" : "Create →"}
         </button>
         <button onClick={() => { setShowCreate(false); setNewName(""); setNewDesc(""); setNewPin(""); }}
          style={{ background: "none", border: BB1, color: TM, padding: "7px 10px", borderRadius: "6px", fontSize: "0.8rem", fontFamily: F, cursor: "pointer" }}>
          Cancel
         </button>
        </div>
       </div>
      )}

      {/* Post-create invite flash */}
      {createdToken && (
       <div style={{ background: BP, border: "1px solid #1A2A1A", borderRadius: "8px", padding: "8px 10px", marginTop: "6px" }}>
        <div style={{ fontSize: "0.8rem", color: "#5DC1DB", marginBottom: "5px" }}>✓ Created! Share invite:</div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
         <div style={{ flex: 1, fontSize: "0.9rem", color: TM, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getInviteURL(createdToken.token)}</div>
         <button
          onClick={() => shareInvite(createdToken.id, createdToken.name, "community")}
          style={{ background: inviteCopied === createdToken.id ? BP : BP, border: `1px solid ${inviteCopied === createdToken.id ? BD1 : "var(--btn-plus-border)"}`, color: inviteCopied === createdToken.id ? "#5DC1DB" : "var(--green)", padding: "4px 9px", borderRadius: "6px", fontSize: "0.9rem", fontFamily: F, cursor: "pointer", flexShrink: 0 }}>
          {inviteCopied === createdToken.id ? "✓" : isMob && navigator.share ? "💬 Share" : "Copy Invite"}
         </button>
        </div>
        <button onClick={() => setCreatedToken(null)} style={{ background: "none", border: "none", color: TX, fontSize: "0.9rem", fontFamily: F, cursor: "pointer", marginTop: "4px" }}>Dismiss</button>
       </div>
      )}
     </div>
    </div>
    </>
   )}
  </div>
 );
}

export function SpacesSettingsTab({
 user, orgId, orgMeta, isSolo, isSuperAdmin,
 communities, communityMembers,
 orgPendingRequests, communityPendingRequests,
 onJoinOrg, onCreateCommunity, onJoinCommunity, onLeaveCommunity,
 onRequestJoinOrg, onApproveOrgRequest, onRejectOrgRequest,
 onJoinCommunityByPin, onRequestJoinCommunity,
 onApproveCommunityRequest, onRejectCommunityRequest,
 onSearchSpaces, spaceSearchResults,
 onChangeCommunityIndustry, industryConfigs,
 onFlashSaved
}) {
 const [copied, setCopied] = useState(null);
 const [invites, setInvites] = useState([]);
 const [loadingInvites, setLoadingInvites] = useState(false);
 const [showJoinOrgForm, setShowJoinOrgForm] = useState(false);
 const [joinOrgToken, setJoinOrgToken] = useState("");
 const [joinOrgInfo, setJoinOrgInfo] = useState(null);
 const [joinOrgErr, setJoinOrgErr] = useState("");
 const [joiningOrg, setJoiningOrg] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 const [searchType, setSearchType] = useState("all");
 const [selectedResult, setSelectedResult] = useState(null);
 const [requestSent, setRequestSent] = useState({});
 const [joinPinInput, setJoinPinInput] = useState("");
 const [joinPinErr, setJoinPinErr] = useState("");
 const [showCreateCom, setShowCreateCom] = useState(false);
 const [newComName, setNewComName] = useState("");
 const [newComDesc, setNewComDesc] = useState("");
 const [newComPin, setNewComPin] = useState("");
 const [creatingCom, setCreatingCom] = useState(false);
 const [createdComToken, setCreatedComToken] = useState(null);
 const [showJoinCom, setShowJoinCom] = useState(false);
 const [joinComToken, setJoinComToken] = useState("");
 const [joinComInfo, setJoinComInfo] = useState(null);
 const [joinComErr, setJoinComErr] = useState("");
 const [joiningCom, setJoiningCom] = useState(false);
 const [editingComInd, setEditingComInd] = useState(null);

 useEffect(() => {
  if(!orgId||isSolo||!isSuperAdmin) return;
  setLoadingInvites(true);
  loadSpaceInvites(orgId).then(l=>{setInvites(l);setLoadingInvites(false);});
 }, [orgId,isSolo,isSuperAdmin]);

 useEffect(() => {
  const t = setTimeout(()=>{ if(onSearchSpaces) onSearchSpaces(searchQuery); },300);
  return ()=>clearTimeout(t);
 }, [searchQuery,onSearchSpaces]);

 useEffect(() => {
  if(!joinOrgToken.trim()){setJoinOrgInfo(null);setJoinOrgErr("");return;}
  const t = setTimeout(async()=>{
   const m=joinOrgToken.match(/\/invite\/([a-z0-9]+)/i);
   const tok=m?m[1]:joinOrgToken.trim();
   const inv=await loadInvite(tok);
   if(inv&&inv.spaceType!=="community"){setJoinOrgInfo({...inv,cleanToken:tok});setJoinOrgErr("");}
   else{setJoinOrgInfo(null);setJoinOrgErr(inv?.spaceType==="community"?"That's a Crew invite.":"Invite not found or expired.");}
  },400);
  return ()=>clearTimeout(t);
 },[joinOrgToken]);

 useEffect(() => {
  if(!joinComToken.trim()){setJoinComInfo(null);setJoinComErr("");return;}
  const t = setTimeout(async()=>{
   const m=joinComToken.match(/\/invite\/([a-z0-9]+)/i);
   const tok=m?m[1]:joinComToken.trim();
   const inv=await loadInvite(tok);
   if(inv&&inv.spaceType==="community"){setJoinComInfo({...inv,cleanToken:tok});setJoinComErr("");}
   else{setJoinComInfo(null);setJoinComErr(inv&&inv.spaceType!=="community"?"That's an org invite.":"Invite not found or expired.");}
  },400);
  return ()=>clearTimeout(t);
 },[joinComToken]);

 function copyText(text){
  try{navigator.clipboard.writeText(text);}catch{
   copyText(text);
  }
 }

 async function generateOrgInvite(){
  if(!orgId||!orgMeta) return;
  const token=await createInviteToken(orgId,orgMeta.name,user.name,"org");
  setInvites(await loadSpaceInvites(orgId));
  const url=getInviteURL(token);
  const isMob=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if(isMob&&navigator.share){
   try{await navigator.share({title:`${orgMeta.name} — you're invited`,text:`${currentUser?.name || userName || "Someone"} invited you to their team on Cadence. Daily accountability, live leaderboards, real results.`,url});setCopied(token);setTimeout(()=>setCopied(null),3000);return;}catch{}
  }
  copyText(url);
  setCopied(token);setTimeout(()=>setCopied(null),3000);
 }

 async function handleRevokeOrgInvite(token){
  await revokeInvite(orgId,token);
  setInvites(await loadSpaceInvites(orgId));
 }

 async function handleJoinOrg(){
  if(!joinOrgInfo) return;
  setJoiningOrg(true);
  try{await onJoinOrg(joinOrgInfo.cleanToken,user.name,user.industry,null);onFlashSaved("Joined organization!");}
  catch(e){setJoinOrgErr("Failed: "+e.message);}
  setJoiningOrg(false);
 }

 async function handleCreateCommunity(){
  if(!newComName.trim()) return;
  setCreatingCom(true);
  try{
   const meta=await onCreateCommunity(newComName.trim(),newComDesc.trim(),newComPin.trim());
   if(meta){const token=await createInviteToken(meta.id,meta.name,user.name,"community");setCreatedComToken(token);}
   onFlashSaved("Crew created! 🎶");
   setNewComName("");setNewComDesc("");setNewComPin("");setShowCreateCom(false);
  }catch(e){
   if(e?.message==="CREW_LIMIT"){
    // Paywall already opened by createCommunitySpace — just close the create form
    setShowCreateCom(false);
   } else {
    console.error(e);
   }
  }
  setCreatingCom(false);
 }

 async function handleJoinCommunity(){
  if(!joinComInfo) return;
  setJoiningCom(true);
  try{await onJoinCommunity(joinComInfo.cleanToken);onFlashSaved("Joined community!");setShowJoinCom(false);setJoinComToken("");setJoinComInfo(null);}
  catch(e){setJoinComErr("Failed: "+e.message);}
  setJoiningCom(false);
 }

 async function handleJoinByPin(spaceId){
  setJoinPinErr("");
  const r=await onJoinCommunityByPin(spaceId,joinPinInput);
  if(r?.ok){onFlashSaved("Joined community!");setSelectedResult(null);setJoinPinInput("");}
  else setJoinPinErr(r?.reason==="wrong_pin"?"Incorrect password.":"Could not join.");
 }

 async function handleRequestJoin(space){
  const fn=space.type==="org"?onRequestJoinOrg:onRequestJoinCommunity;
  const r=await fn(space.id,space.name);
  if(r?.ok||r?.reason==="already_pending"){setRequestSent(p=>({...p,[space.id]:true}));onFlashSaved("Request sent!");}
 }

 const filteredResults=(spaceSearchResults||[]).filter(r=>searchType==="all"||r.type===searchType);
 const sLabel={fontSize:"0.8rem",color:TM,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:"10px"};
 const sCard={background:BG0,...s.bd1,borderRadius:"12px",padding:"clamp(14px,1.5vw,20px)",...s.mb12,boxShadow:"var(--shadow-card)"};
 const sInput={...s.inpBase,padding:"10px 12px",...s.br8,fontSize:"1rem",fontFamily:F,...s.w100,boxSizing:"border-box",outline:"none"};
 const sPendingRow={background:BG0,border:BB2A28,...s.br8,padding:"9px 12px",marginBottom:"6px",...s.fac,gap:"10px"};

 return (
  <div style={{maxWidth:"min(560px,100%)",...s.fdc,gap:"28px"}}>
   <div style={{fontSize:"0.9rem",color:TA,letterSpacing:"0.1em",marginBottom:"-12px"}}>Spaces & Memberships</div>

   {/* ── SEARCH ── */}
   <div>
    <div style={sLabel}>Discover Spaces</div>
    <div style={{display:"flex",gap:"6px",marginBottom:"8px",flexWrap:"wrap"}}>
     {[["all","All"],["org","Orgs"],["community","Crews"]].map(([t,label])=>(
      <button key={t} style={{background:searchType===t?BG2:"none",border:`1px solid ${searchType===t?"var(--border-2)":"var(--bg-4)"}`,color:searchType===t?TA:TM,...s.btn8s,...s.Fc}} onClick={()=>setSearchType(t)}>{label}</button>
     ))}
    </div>
    <input style={s.x11} placeholder="Search by name..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
    {searchQuery.trim()&&filteredResults.length===0&&<div style={{fontSize:"0.9rem",color:TD,fontStyle:"italic"}}>No spaces found for "{searchQuery}"</div>}
    {filteredResults.map(space=>{
     const alreadyIn=(space.type==="org"&&!isSolo)||(space.type==="community"&&communities.some(c=>c.id===space.id));
     const isSelected=selectedResult?.id===space.id;
     return (
      <div key={space.id} style={{...sCard,...s.cp}} onClick={()=>setSelectedResult(isSelected?null:space)}>
       <div style={{...s.fac,gap:"10px"}}>
        <span style={{fontSize:"1.06rem"}}>{space.type==="org"?"🏢":"🌐"}</span>
        <div style={s.f1}>
         <div style={s.pri95F}>{space.name}</div>
         {space.description&&<div style={s.mut95mt2}>{space.description}</div>}
        </div>
        <span style={{fontSize:"0.9rem",color:space.type==="org"?TA:"#7B6FD8",background:BG0,border:`1px solid ${space.type==="org"?"rgba(35,205,237,0.2)":"#7E8EC833"}`,...s.br10,padding:"2px 8px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{space.type}</span>
        {alreadyIn&&<span style={s.x7}>✓ Member</span>}
       </div>
       {isSelected&&!alreadyIn&&(
        <div style={s.divTop} onClick={e=>e.stopPropagation()}>
         {space.type==="org"?(
          <div>
           <div style={{fontSize:"0.95rem",color:TS,marginBottom:"10px"}}>Organizations require admin approval to join.</div>
           {requestSent[space.id]
            ?<div style={s.grn9}>✓ Request sent — an admin will review it.</div>
            :<button style={{background:BG0,border:"1px solid #23CDED55",color:TA,padding:"9px 16px",...s.br8,fontSize:"0.9rem",...s.Fc}} onClick={()=>handleRequestJoin(space)}>Request to Join →</button>
           }
          </div>
         ):(
          <div style={s.fdc8}>
           <div style={s.sec95}>Enter the community password for instant access, or send a request for approval by any member.</div>
           <div style={s.fg6}>
            <input style={{...sInput,flex:1,borderColor:joinPinErr?"#3A1A1A":"var(--bg-4)"}} placeholder="Crew password..." type="password" value={joinPinInput} onChange={e=>{setJoinPinInput(e.target.value);setJoinPinErr("");}}/>
            <button style={{background:BG1,border:BB1A3A,color:"#5DC1DB",...s.p1014,...s.br8,fontSize:"0.95rem",...s.Fc,flexShrink:0}} onClick={()=>handleJoinByPin(space.id)}>Enter</button>
           </div>
           {joinPinErr&&<div style={s.red95}>{joinPinErr}</div>}
           <div style={{textAlign:"center",fontSize:"0.8rem",color:TX}}>— or —</div>
           {requestSent[space.id]
            ?<div style={s.grn9}>✓ Request sent — a member will review it.</div>
            :<button style={{background:BG0,border:"1px solid #7E8EC855",color:"#7B6FD8",padding:"9px 16px",...s.br8,fontSize:"0.9rem",...s.Fc}} onClick={()=>handleRequestJoin(space)}>Request to Join →</button>
           }
          </div>
         )}
        </div>
       )}
      </div>
     );
    })}
   </div>

   {/* ── ORGANIZATION ── */}
   <div>
    <div style={sLabel}>Organization <span style={{color:TX,fontSize:"0.9rem"}}>(max 1)</span></div>
    {!isSolo&&orgMeta?(
     <div>
      <div style={{...sCard,...s.fac,gap:"14px",marginBottom:"14px"}}>
       <div style={{width:"44px",height:"44px",borderRadius:"6px",background:BG3,border:"1px solid #2A2A2A",...s.fcc,fontSize:"1.25rem",flexShrink:0}}>🏢</div>
       <div style={s.f1}>
        <div style={{fontSize:"0.95rem",color:TP,fontWeight:"bold",fontFamily:F}}>{orgMeta.name}</div>
        <div style={s.mut95mt3}>Member since {new Date(orgMeta.createdAt).toLocaleDateString()}</div>
        {orgMeta.enforcedIndustry&&<div style={{fontSize:"0.8rem",color:"#23CDED66",marginTop:"2px"}}>Industry: {orgMeta.enforcedIndustry}</div>}
        {isSuperAdmin&&<div style={{fontSize:"0.8rem",color:TA,marginTop:"2px",letterSpacing:"0.06em"}}>⚙ You are the Admin</div>}
       </div>
      </div>

      {/* Pending join requests (org admin sees) */}
      {isSuperAdmin&&(orgPendingRequests||[]).length>0&&(
       <div style={{marginBottom:"14px"}}>
        <div style={{...sLabel,color:"#23CDED88"}}>Pending Requests ({orgPendingRequests.length})</div>
        {orgPendingRequests.map(req=>(
         <div key={req.requestId||req.userId} style={sPendingRow}>
          <div style={s.f1}>
           <div style={s.x14}>{req.userName}</div>
           <div style={s.mut8}>{req.userIndustry} · {new Date(req.requestedAt).toLocaleDateString()}</div>
          </div>
          <button style={{background:BP,border:BB1A3A,color:"#5DC1DB",...s.btn8,...s.Fc}} onClick={()=>onApproveOrgRequest(req)}>Approve</button>
          <button style={s.x4} onClick={()=>onRejectOrgRequest(req.userId)}>Decline</button>
         </div>
        ))}
       </div>
      )}

      {/* Active invite links */}
      {isSuperAdmin&&(
       <div>
        <div style={{...s.fsb,marginBottom:"8px"}}>
         <div style={{...sLabel,marginBottom:0}}>Active Invite Links</div>
         <button style={{background:BG0,border:BBA,color:TA,...s.btn8,...s.Fc}} onClick={generateOrgInvite}>+ Generate</button>
        </div>
        {loadingInvites&&<div style={s.xdim95i}>Loading...</div>}
        {invites.map(inv=>(
         <div key={inv.token} style={{...s.fac,gap:"8px",padding:"7px 10px",...s.bgBd8,borderRadius:"6px",marginBottom:"5px"}}>
          <div style={{flex:1,fontSize:"0.8rem",color:TS,fontFamily:"monospace",...s.oh,...s.toe,...s.wsn}}>{getInviteURL(inv.token)}</div>
          <span style={s.x8}>{inv.uses||0}×</span>
          <button style={{background:copied===inv.token?BP:BG0,border:"1px solid #1A2A1A",color:copied===inv.token?"#5DC1DB":TM,padding:"4px 10px",borderRadius:"6px",fontSize:"0.9rem",...s.Fc,flexShrink:0}} onClick={async()=>{const url=getInviteURL(inv.token);const isMob=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);if(isMob&&navigator.share){try{await navigator.share({title:`You're invited to join ${orgMeta?.name||"the team"}`,text:`Join ${orgMeta?.name||"our team"} on Cadence — where your daily output becomes your competitive edge.`,url});setCopied(inv.token);setTimeout(()=>setCopied(null),3000);return;}catch{}}copyText(url);setCopied(inv.token);setTimeout(()=>setCopied(null),3000);}}>{copied===inv.token?"✓ Shared":/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)&&navigator.share?"💬 Share":"Copy"}</button>
          <button style={{background:"none",border:BB2A10,color:"#E05577",padding:"4px 8px",borderRadius:"6px",fontSize:"0.9rem",...s.Fc,flexShrink:0}} onClick={()=>handleRevokeOrgInvite(inv.token)}>Revoke</button>
         </div>
        ))}
        {!loadingInvites&&invites.length===0&&<div style={{fontSize:"0.95rem",color:TD,fontStyle:"italic"}}>No active invite links.</div>}
       </div>
      )}
     </div>
    ):(
     <div style={{...sCard}}>
      <div style={{fontSize:"0.9rem",color:TM,...s.mb12}}>You're using Cadence individually. Search above to find and request to join an organization, or paste an invite link below.</div>
      {!showJoinOrgForm?(
       <button style={{background:BG0,border:BBA,color:TA,padding:"9px 14px",...s.br8,fontSize:"0.95rem",...s.Fc}} onClick={()=>setShowJoinOrgForm(true)}>Join via Invite Link →</button>
      ):(
       <div style={s.fdc8}>
        <input style={{...sInput,borderColor:joinOrgErr?"#3A1A1A":joinOrgInfo?BD1:"var(--bg-4)"}} placeholder="Paste org invite link or code..." value={joinOrgToken} autoFocus onChange={e=>setJoinOrgToken(e.target.value)}/>
        {joinOrgErr&&<div style={s.red95}>{joinOrgErr}</div>}
        {joinOrgInfo&&<div style={s.grn95}>✓ Found: {joinOrgInfo.spaceName}</div>}
        <div style={s.fg8}>
         <button style={{flex:1,background:joinOrgInfo&&!joiningOrg?TA:BG0,color:joinOrgInfo&&!joiningOrg?BR:TM,border:"none",padding:"10px",...s.br8,fontSize:"0.9rem",fontFamily:F,fontWeight:"bold",cursor:joinOrgInfo&&!joiningOrg?"pointer":"default"}} disabled={!joinOrgInfo||joiningOrg} onClick={handleJoinOrg}>{joiningOrg?"Joining...":"Join Organization →"}</button>
         <button style={{background:"none",...s.bd1,color:TM,padding:"9px 14px",...s.br8,fontSize:"0.95rem",...s.Fc}} onClick={()=>{setShowJoinOrgForm(false);setJoinOrgToken("");setJoinOrgInfo(null);setJoinOrgErr("");}}>Cancel</button>
        </div>
       </div>
      )}
     </div>
    )}
   </div>

   {/* ── COMMUNITIES ── */}
   <div>
    <div style={sLabel}>Communities <span style={{color:TX,fontSize:"0.9rem"}}>(unlimited)</span></div>
    <p style={{fontSize:"0.9rem",color:TM,lineHeight:1.5,marginBottom:"14px",marginTop:"-4px"}}>Open cross-industry groups. Your activity data stays private — only totals show on the community leaderboard. Each community can have its own industry view.</p>

    {communities.map(cm=>{
     const members=communityMembers[cm.id]||[];
     const mySlot=members.find(m=>m.userId===user.id);
     const myComInd=mySlot?.communityIndustry||user.industry;
     const pending=(communityPendingRequests||{})[cm.id]||[];
     const isEditInd=editingComInd===cm.id;
     return (
      <div key={cm.id} style={sCard}>
       <div style={{display:"flex",alignItems:"flex-start",...s.g12}}>
        <div style={{width:"40px",height:"40px",borderRadius:"6px",background:BDIR,border:BB1A30,...s.fcc,fontSize:"1.12rem",flexShrink:0}}>🌐</div>
        <div style={s.f1}>
         <div style={{fontSize:"0.9rem",color:"#C0B8C8",fontWeight:"bold",fontFamily:F}}>{cm.name}</div>
         {cm.description&&<div style={s.mut95mt2}>{cm.description}</div>}
         <div style={{fontSize:"0.8rem",color:TD,marginTop:"4px"}}>{members.length} member{members.length!==1?"s":""}</div>
         <div style={{display:"flex",flexWrap:"wrap",...s.g4,marginTop:"6px"}}>
          {members.slice(0,6).map(m=>(
           <span key={m.userId} style={{fontSize:"0.9rem",color:TM,background:BG2,...s.bd1,...s.br10,padding:"2px 7px"}}>{m.name}</span>
          ))}
          {members.length>6&&<span style={{fontSize:"0.9rem",color:TD,padding:"2px 4px"}}>+{members.length-6} more</span>}
         </div>

         {/* Community industry switcher */}
         <div style={{marginTop:"10px",paddingTop:"10px",...s.btBd}}>
          <div style={{fontSize:"0.9rem",color:TD,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"6px"}}>My industry in this community</div>
          {isEditInd?(
           <div style={s.x12}>
            {Object.entries(industryConfigs||{}).map(([key,cfg])=>(
             <button key={key} style={{background:myComInd===key?BG2:"none",border:`1px solid ${myComInd===key?"var(--border-2)":"var(--bg-4)"}`,color:myComInd===key?TA:TM,...s.btn8s,...s.Fc}}
              onClick={()=>{onChangeCommunityIndustry(cm.id,key);setEditingComInd(null);onFlashSaved("Community industry updated");}}>
              {cfg.icon} {cfg.label}
             </button>
            ))}
            <button style={{background:"none",...s.bd1,color:TD,padding:"4px 8px",borderRadius:"6px",fontSize:"0.8rem",...s.cp}} onClick={()=>setEditingComInd(null)}>Cancel</button>
           </div>
          ):(
           <button style={{background:"none",border:"none",padding:0,color:TS,fontSize:"0.95rem",...s.cp,fontFamily:F}} onClick={()=>setEditingComInd(cm.id)}>
            {(industryConfigs?.[myComInd]||{icon:"◆",label:myComInd}).icon} {(industryConfigs?.[myComInd]||{label:myComInd}).label} <span style={{color:TD,fontSize:"0.8rem"}}>· change</span>
           </button>
          )}
         </div>
        </div>
        <div style={{...s.fdc,gap:"6px",flexShrink:0}}>
         <CommunityInviteButton communityId={cm.id} communityName={cm.name} userName={user.name}/>
         <button style={{background:"none",border:BB2A10,color:"#E05577",...s.btn9,...s.Fc}} onClick={()=>onLeaveCommunity(cm.id)}>Leave</button>
        </div>
       </div>

       {/* Pending requests — any member can approve */}
       {pending.length>0&&(
        <div style={s.divTop}>
         <div style={{fontSize:"0.9rem",color:"#7E8EC888",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"8px"}}>Pending Requests ({pending.length})</div>
         {pending.map(req=>(
          <div key={req.requestId||req.userId} style={{...sPendingRow,background:BG0,border:"1px solid #1A1A2A"}}>
           <div style={s.f1}>
            <div style={{fontSize:"0.9rem",color:"#C0B8C8"}}>{req.userName}</div>
            <div style={s.mut8}>{req.userIndustry} · {new Date(req.requestedAt).toLocaleDateString()}</div>
           </div>
           <button style={{background:BG0,border:"1px solid #1A1A3A",color:"#7B6FD8",...s.btn8,...s.Fc}} onClick={()=>onApproveCommunityRequest(cm.id,req)}>Approve</button>
           <button style={s.x4} onClick={()=>onRejectCommunityRequest(cm.id,req.userId)}>Decline</button>
          </div>
         ))}
        </div>
       )}
      </div>
     );
    })}

    {communities.length===0&&<div style={{fontSize:"0.9rem",color:TD,fontStyle:"italic",marginBottom:"14px"}}>You're not in any communities yet. Search above or create one below.</div>}

    <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"4px"}}>
     <button style={{background:BDIR,border:BB1A30,color:"#7B6FD8",padding:"9px 14px",...s.br8,fontSize:"0.95rem",...s.Fc}} onClick={()=>{setShowCreateCom(p=>!p);setShowJoinCom(false);}}>{showCreateCom?"Cancel":"+ Create Crew"}</button>
     <button style={{background:BG0,border:"1px solid #1A2A1A",color:"#5DC1DB",padding:"9px 14px",...s.br8,fontSize:"0.95rem",...s.Fc}} onClick={()=>{setShowJoinCom(p=>!p);setShowCreateCom(false);}}>{showJoinCom?"Cancel":"Join via Invite →"}</button>
    </div>

    {showCreateCom&&(
     <div style={{...sCard,marginTop:"12px"}}>
      <div style={{fontSize:"0.8rem",color:"#7B6FD8",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"10px"}}>New Community</div>
      <div style={s.fdc8}>
       <input style={sInput} placeholder="Name (e.g. Knoxville Closers, The Grind...)" value={newComName} autoFocus onChange={e=>setNewComName(e.target.value)}/>
       <input style={sInput} placeholder="Description (optional)" value={newComDesc} onChange={e=>setNewComDesc(e.target.value)}/>
       <input style={sInput} placeholder="Password for instant join (optional — leave blank for approval-only)" value={newComPin} onChange={e=>setNewComPin(e.target.value)}/>
       <div style={s.dim8}>{newComPin.trim()?"🔑 Anyone with the password can join instantly":"🔒 No password — new members need approval from any member"}</div>
       <button style={{background:"#7B6FD8",color:BR,border:"none",padding:"10px",...s.br8,fontSize:"0.9rem",fontFamily:F,fontWeight:"bold",...s.cp,opacity:newComName.trim()&&!creatingCom?1:0.4}} disabled={!newComName.trim()||creatingCom} onClick={handleCreateCommunity}>{creatingCom?"Creating...":"Create Crew →"}</button>
      </div>
     </div>
    )}

    {createdComToken&&(
     <div style={{...sCard,...s.mt8,...s.bgBdA30}}>
      <div style={{fontSize:"0.95rem",color:"#7B6FD8",marginBottom:"6px"}}>✓ Community created! Share this invite link:</div>
      <div style={s.x15}>
       <div style={{flex:1,fontSize:"0.8rem",color:TS,fontFamily:"monospace",...s.oh,...s.toe,...s.wsn}}>{getInviteURL(createdComToken)}</div>
       <button style={{background:BDIR,border:BB1A30,color:"#7B6FD8",...s.btn9,...s.Fc}} onClick={async()=>{const url=getInviteURL(createdComToken);const isMob=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);if(isMob&&navigator.share){try{await navigator.share({title:`You're invited — join on Cadence`,text:"You've been invited to a Cadence community — daily tracking, peer accountability, shared leaderboards.",url});setCopied(createdComToken);setTimeout(()=>setCopied(null),2500);return;}catch{}}copyText(url);setCopied(createdComToken);setTimeout(()=>setCopied(null),2500);}}>{copied===createdComToken?"✓ Shared":/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)&&navigator.share?"💬 Share":"Copy"}</button>
      </div>
      <button style={{background:"none",border:"none",color:TX,...s.cp,fontSize:"0.8rem",marginTop:"6px"}} onClick={()=>setCreatedComToken(null)}>Dismiss</button>
     </div>
    )}

    {showJoinCom&&(
     <div style={{...sCard,marginTop:"12px"}}>
      <div style={{...s.grn8,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"10px"}}>Join via Invite Link</div>
      <div style={s.fdc8}>
       <input style={{...sInput,borderColor:joinComErr?"#3A1A1A":joinComInfo?BD1:"var(--bg-4)"}} placeholder="Paste Crew invite link or code..." value={joinComToken} autoFocus onChange={e=>setJoinComToken(e.target.value)}/>
       {joinComErr&&<div style={s.red95}>{joinComErr}</div>}
       {joinComInfo&&<div style={s.grn95}>✓ Found: {joinComInfo.spaceName}</div>}
       <button style={{background:BG1,border:BB1A3A,color:"#5DC1DB",padding:"10px",...s.br8,fontSize:"0.9rem",fontFamily:F,fontWeight:"bold",...s.cp,opacity:joinComInfo&&!joiningCom?1:0.4}} disabled={!joinComInfo||joiningCom} onClick={handleJoinCommunity}>{joiningCom?"Joining...":"Join Community →"}</button>
      </div>
     </div>
    )}
   </div>
  </div>
 );
}


// ── MyGoalsTab — edit daily targets and add/remove custom metrics ─────────────
function MyGoalsTab({ metrics, goals, setGoals, onSaveGoals, flashSaved, TA, F, s, BG1, BG2, BG3, BB1, TS, TD }) {
 const [localMetrics, setLocalMetrics] = useState(() => metrics.map(m => ({ ...m })));
 const [localGoals, setLocalGoals] = useState(() => ({ ...goals }));
 const [adding, setAdding] = useState(false);
 const [newLabel, setNewLabel] = useState("");
 const [newDefault, setNewDefault] = useState(10);
 const [editingKey, setEditingKey] = useState(null);
 const [editLabel, setEditLabel] = useState("");

 function slugify(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") + "_custom";
 }

 function handleAddMetric() {
  if (!newLabel.trim()) return;
  const key = slugify(newLabel) + "_" + Date.now();
  const m = { key, label: newLabel.trim(), defaultGoal: newDefault, custom: true };
  setLocalMetrics(p => [...p, m]);
  setLocalGoals(p => ({ ...p, [key]: newDefault }));
  setNewLabel(""); setNewDefault(10); setAdding(false);
 }

 function handleRemoveMetric(key) {
  setLocalMetrics(p => p.filter(m => m.key !== key));
  setLocalGoals(p => { const n = { ...p }; delete n[key]; return n; });
 }

 function handleSaveLabel(key) {
  if (!editLabel.trim()) { setEditingKey(null); return; }
  setLocalMetrics(p => p.map(m => m.key === key ? { ...m, label: editLabel.trim() } : m));
  setEditingKey(null);
 }

 function handleSave() {
  // Persist updated metric definitions + goals
  // Goals saved via onSaveGoals; metric label changes require industryConfig update
  // For now save goals with current local values
  const merged = {};
  localMetrics.forEach(m => { merged[m.key] = localGoals[m.key] ?? m.defaultGoal; });
  setGoals(merged);
  onSaveGoals(merged, null, localMetrics);
  flashSaved("Goals saved");
 }

 const inputStyle = { background: BG2, border: `1px solid var(--border-1)`, borderRadius: "8px", padding: "7px 10px", color: TS, fontSize: "0.85rem", fontFamily: F, outline: "none", width: "100%", boxSizing: "border-box" };
 const numStyle = { ...inputStyle, width: "80px", textAlign: "center" };

 return (
  <div style={{ maxWidth: "min(520px,100%)" }}>
   <div style={s.x1}>My Goals</div>
   <p style={{ ...s.mHint, marginBottom: "24px" }}>Your daily targets. These drive goal % on your dashboard, leaderboard, and Pacer AI coaching. Set to 0 to skip a metric.</p>

   {/* Metric rows */}
   <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
    {localMetrics.map(m => (
     <div key={m.key} style={{ display: "flex", alignItems: "center", gap: "10px", background: BG2, border: `1px solid var(--border-1)`, borderRadius: "10px", padding: "10px 14px" }}>
      {/* Label — click to edit */}
      <div style={{ flex: 1, minWidth: 0 }}>
       {editingKey === m.key ? (
        <input
         autoFocus
         value={editLabel}
         onChange={e => setEditLabel(e.target.value)}
         onBlur={() => handleSaveLabel(m.key)}
         onKeyDown={e => { if (e.key === "Enter") handleSaveLabel(m.key); if (e.key === "Escape") setEditingKey(null); }}
         style={{ ...inputStyle, padding: "4px 8px", fontSize: "0.85rem" }}
        />
       ) : (
        <div
         onClick={() => { setEditingKey(m.key); setEditLabel(m.label); }}
         style={{ fontSize: "0.9rem", fontWeight: 600, color: TS, fontFamily: F, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
         {m.label}
         <span style={{ fontSize: "0.65rem", color: TD, fontWeight: 400 }}>✎</span>
         {m.custom && <span style={{ fontSize: "0.6rem", color: TA, background: `${TA}18`, border: `1px solid ${TA}30`, borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>custom</span>}
        </div>
       )}
      </div>

      {/* Goal number input */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
       <input
        type="number" min="0" value={localGoals[m.key] ?? m.defaultGoal}
        onChange={e => { const n = parseInt(e.target.value); setLocalGoals(p => ({ ...p, [m.key]: isNaN(n) ? 0 : Math.max(0, n) })); }}
        style={numStyle}
       />
       <span style={{ fontSize: "0.75rem", color: TD, fontFamily: F, whiteSpace: "nowrap" }}>/day</span>
      </div>

      {/* Remove button (custom metrics only) */}
      {m.custom && (
       <button
        onClick={() => handleRemoveMetric(m.key)}
        style={{ background: "none", border: "none", color: "#F43F5E", fontSize: "1rem", cursor: "pointer", padding: "2px 4px", flexShrink: 0, lineHeight: 1 }}
        title="Remove metric"
       >✕</button>
      )}
     </div>
    ))}
   </div>

   {/* Add metric */}
   {adding ? (
    <div style={{ background: BG2, border: `1px solid ${TA}40`, borderRadius: "10px", padding: "14px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
     <div style={{ fontSize: "0.75rem", fontWeight: 800, color: TA, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.08em" }}>New Metric</div>
     <input placeholder="Metric name (e.g. Proposals Sent)" value={newLabel} onChange={e => setNewLabel(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter") handleAddMetric(); if (e.key === "Escape") setAdding(false); }}
      style={inputStyle} autoFocus />
     <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "0.8rem", color: TD, fontFamily: F }}>Daily goal:</span>
      <input type="number" min="1" value={newDefault} onChange={e => setNewDefault(parseInt(e.target.value)||1)} style={{ ...numStyle, width: "70px" }} />
     </div>
     <div style={{ display: "flex", gap: "8px" }}>
      <button onClick={() => setAdding(false)} style={{ flex: 1, background: "none", border: `1px solid var(--border-1)`, borderRadius: "8px", padding: "8px", fontSize: "0.8rem", color: TD, cursor: "pointer", fontFamily: F }}>Cancel</button>
      <button onClick={handleAddMetric} disabled={!newLabel.trim()} style={{ flex: 2, background: `linear-gradient(135deg,${TA},#0EA5C9)`, border: "none", borderRadius: "8px", padding: "8px", fontSize: "0.8rem", fontWeight: 800, color: "#000", cursor: "pointer", fontFamily: F, opacity: newLabel.trim() ? 1 : 0.5 }}>Add Metric</button>
     </div>
    </div>
   ) : (
    <button onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: "7px", background: "none", border: `1px dashed ${TA}50`, borderRadius: "10px", padding: "10px 14px", fontSize: "0.82rem", color: TA, cursor: "pointer", fontFamily: F, marginBottom: "16px", width: "100%" }}>
     <span style={{ fontSize: "1rem" }}>+</span> Add custom metric
    </button>
   )}

   <button style={{ ...s.primaryBtn }} onClick={handleSave}>Save Goals</button>
   <p style={{ ...s.mHint, marginTop: "12px" }}>Click a metric name to rename it. Remove custom metrics with ✕. Built-in metrics can't be removed.</p>
  </div>
 );
}

// ── SecurityTab ───────────────────────────────────────────────────────
// ── JournalTab — journal prompt preferences (embedded in Goals tab) ──
const JOURNAL_PROMPT_OPTIONS = [
 { key: "showDailyPrompt",     label: "Daily check-in",      when: "Every day — a quick end-of-day debrief",              icon: "🌙" },
 { key: "showWeeklyPrompt",    label: "Week in review",       when: "Fri, Sat & Sun — reflect on the week",                icon: "📅" },
 { key: "showMonthlyPrompt",   label: "Month in review",      when: "Last 3 days of each month",                           icon: "📆" },
 { key: "showQuarterlyPrompt", label: "Quarter in review",    when: "Last 3 days of Mar, Jun, Sep & Dec",                  icon: "📊" },
 { key: "showAnnualPrompt",    label: "Year in review",       when: "Last 3 days of December",                             icon: "🎯" },
];

const DEFAULT_WEEKLY_QUESTIONS = [
 { key:"wins",   label:"Results & Wins",             placeholder:"Key results, milestones, wins big or small…" },
 { key:"needle", label:"What moved the needle?",     placeholder:"What actually moved the needle — or held you back?" },
 { key:"learn",  label:"What did you learn?",        placeholder:"A lesson, an insight, something you'd do differently…" },
 { key:"next",   label:"Focus for next week",        placeholder:"One thing. Be specific." },
];

function JournalTab({ user }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [settings, setSettings] = React.useState(null);
 const [saving, setSaving] = React.useState(false);
 const [saved, setSaved] = React.useState(false);
 const [editingQ, setEditingQ] = React.useState(null);
 const [questions, setQuestions] = React.useState(DEFAULT_WEEKLY_QUESTIONS);

 React.useEffect(() => {
  if (!user?.id) return;
  loadJournalSettings(user.id).then(s => {
   setSettings(s);
   if (s.customQuestions) setQuestions(s.customQuestions);
  }).catch(() => setSettings({ showDailyPrompt: true, showWeeklyPrompt: true, showMonthlyPrompt: true, showQuarterlyPrompt: true, showAnnualPrompt: true }));
 }, [user?.id]);

 async function save(patch) {
  const next = { ...settings, ...patch, customQuestions: questions };
  setSettings(next);
  setSaving(true);
  await saveJournalSettings(user.id, next).catch(() => {});
  setSaving(false);
  setSaved(true);
  setTimeout(() => setSaved(false), 2000);
 }

 function updateQ(i, field, val) {
  setQuestions(prev => prev.map((q, qi) => qi === i ? { ...q, [field]: val } : q));
 }
 function addQ() { setQuestions(prev => [...prev, { key:`custom_${Date.now()}`, label:"", placeholder:"" }]); }
 function removeQ(i) { setQuestions(prev => prev.filter((_, qi) => qi !== i)); }
 function resetQ() { setQuestions(DEFAULT_WEEKLY_QUESTIONS); }

 if (!settings) return null;

 const switchTrack = (on) => ({
  width:"40px", height:"22px", borderRadius:"11px", background:on?"#1DC9E8":"rgba(255,255,255,0.12)",
  border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0, padding:0,
 });
 const switchKnob = (on) => ({
  position:"absolute", top:"3px", left:on?"21px":"3px", width:"16px", height:"16px",
  borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)",
 });

 return (
  <div style={{ display:"flex", flexDirection:"column", gap:"0" }}>

   {/* Prompt toggles */}
   <div style={{ display:"flex", flexDirection:"column", gap:"2px", marginBottom:"20px" }}>
    {JOURNAL_PROMPT_OPTIONS.map(opt => {
     const on = settings[opt.key] !== false;
     return (
      <div key={opt.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.06)", gap:"12px" }}>
       <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
        <span style={{ fontSize:"1rem", flexShrink:0 }}>{opt.icon}</span>
        <div style={{ minWidth:0 }}>
         <div style={{ fontSize:"0.88rem", fontWeight:"600", color:"#ddd", fontFamily:F }}>{opt.label}</div>
         <div style={{ fontSize:"0.72rem", color:"#666", marginTop:"1px" }}>{opt.when}</div>
        </div>
       </div>
       <button style={switchTrack(on)} onClick={() => save({ [opt.key]: !on })}>
        <div style={switchKnob(on)} />
       </button>
      </div>
     );
    })}
   </div>

   {/* Weekly review custom questions */}
   <div>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
     <div>
      <div style={{ fontSize:"0.82rem", fontWeight:"700", color:"#bbb", fontFamily:F }}>Customize "Week in Review" questions</div>
     </div>
     <div style={{ display:"flex", gap:"6px" }}>
      <button onClick={resetQ} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", color:"#888", padding:"4px 8px", borderRadius:"6px", fontSize:"0.72rem", cursor:"pointer", fontFamily:F }}>Reset</button>
     </div>
    </div>

    <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
     {questions.map((q, i) => (
      <div key={q.key} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"8px", padding:"10px 12px" }}>
       {editingQ === i ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
         <input value={q.label} onChange={e => updateQ(i, "label", e.target.value)} placeholder="Question label"
          style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"6px", padding:"7px 10px", fontSize:"0.85rem", fontFamily:F, outline:"none", color:"#eee", boxSizing:"border-box" }} />
         <input value={q.placeholder} onChange={e => updateQ(i, "placeholder", e.target.value)} placeholder="Hint text (optional)"
          style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"6px", padding:"7px 10px", fontSize:"0.8rem", color:"#999", fontFamily:F, outline:"none", boxSizing:"border-box" }} />
         <div style={{ display:"flex", gap:"6px" }}>
          <button onClick={() => { setEditingQ(null); save({}); }} style={{ background:"#1DC9E8", color:"#000", border:"none", padding:"5px 12px", borderRadius:"6px", fontSize:"0.78rem", fontWeight:"700", cursor:"pointer", fontFamily:F }}>Done</button>
          <button onClick={() => { removeQ(i); setEditingQ(null); }} style={{ background:"none", border:"1px solid rgba(224,85,119,0.4)", color:"#e05577", padding:"5px 10px", borderRadius:"6px", fontSize:"0.78rem", cursor:"pointer", fontFamily:F }}>Remove</button>
         </div>
        </div>
       ) : (
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
         <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:"0.85rem", fontWeight:"600", color:"#ccc", fontFamily:F }}>{q.label || <span style={{ color:"#555", fontStyle:"italic" }}>Untitled</span>}</div>
          {q.placeholder && <div style={{ fontSize:"0.72rem", color:"#555", marginTop:"1px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{q.placeholder}</div>}
         </div>
         <button onClick={() => setEditingQ(i)} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", color:"#888", padding:"4px 8px", borderRadius:"6px", fontSize:"0.72rem", cursor:"pointer", fontFamily:F }}>Edit</button>
        </div>
       )}
      </div>
     ))}
    </div>

    <button onClick={addQ} style={{ marginTop:"8px", width:"100%", background:"none", border:"1px dashed rgba(255,255,255,0.1)", color:"#666", padding:"8px", borderRadius:"8px", fontSize:"0.82rem", cursor:"pointer", fontFamily:F }}>+ Add question</button>

    {(editingQ === null) && (
     <button onClick={() => save({})} disabled={saving}
      style={{ marginTop:"12px", background:"#1DC9E8", color:"#000", border:"none", padding:"10px 20px", borderRadius:"8px", fontWeight:"800", fontSize:"0.85rem", cursor:"pointer", fontFamily:F, minHeight:"40px" }}>
      {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
     </button>
    )}
   </div>
  </div>
 );
}


function SecurityTab({ authUser, user, hasPin, pinMode, setPinMode, pinStep, setPinStep,
  pin1, setPin1, pin2, setPin2, currentPin, setCurrentPin,
  pinError, setPinError, handlePinSave, fieldLabel, s }) {

 const [authLoading, setAuthLoading] = useState(null);
 const [authMsg, setAuthMsg]         = useState({ type: "", text: "" });
 // Clear any stale OAuth error on mount (from failed redirect)
 useEffect(() => { setAuthMsg({ type: "", text: "" }); }, []);
 const [newEmail, setNewEmail]       = useState("");
 const [newPw, setNewPw]             = useState("");
 const [confirmPw, setConfirmPw]     = useState("");
 const [section, setSection]         = useState(null); // "email" | "password" | null

 const sb = window._sb;
 const F = "'DM Sans',system-ui,sans-serif";

 const row = { padding: "16px 0", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: "10px" };
 const inputSty = { width: "100%", border: "1px solid rgba(0,0,0,0.15)", borderRadius: "8px", padding: "11px 14px", fontSize: "1rem", fontFamily: F, outline: "none", boxSizing: "border-box", background: "#fff", minHeight: "44px" };
 const btnPrimary = { background: "#23CDED", color: "#000", border: "none", padding: "11px 20px", borderRadius: "8px", fontWeight: "700", fontSize: "0.88rem", cursor: "pointer", fontFamily: F, minHeight: "44px", WebkitTapHighlightColor: "transparent" };
 const btnSecondary = { background: "none", border: "1px solid rgba(0,0,0,0.15)", color: "#444", padding: "11px 16px", borderRadius: "8px", fontSize: "0.88rem", cursor: "pointer", fontFamily: F, minHeight: "44px", WebkitTapHighlightColor: "transparent" };
 const btnLink = { background: "none", border: "none", color: "#23CDED", fontWeight: "700", fontSize: "0.88rem", cursor: "pointer", fontFamily: F, padding: "8px 4px", minHeight: "44px", WebkitTapHighlightColor: "transparent", textDecoration: "underline" };

 function msg(type, text) { setAuthMsg({ type, text }); setTimeout(() => setAuthMsg({ type: "", text: "" }), 5000); }

 async function handleEmailChange() {
  if (!newEmail.trim()) return;
  setAuthLoading("email");
  const { error } = await sb.auth.updateUser({ email: newEmail.trim() });
  setAuthLoading(null);
  if (error) msg("err", error.message);
  else { msg("ok", "Confirmation sent to both addresses — check your email."); setNewEmail(""); setSection(null); }
 }

 async function handlePasswordChange() {
  if (newPw !== confirmPw) { msg("err", "Passwords don't match"); return; }
  if (newPw.length < 8) { msg("err", "At least 8 characters"); return; }
  setAuthLoading("password");
  const { error } = await sb.auth.updateUser({ password: newPw });
  setAuthLoading(null);
  if (error) msg("err", error.message);
  else { msg("ok", "Password updated."); setNewPw(""); setConfirmPw(""); setSection(null); }
 }

 async function handleConnectGoogle() {
  setAuthLoading("google");
  const { error } = await sb.auth.linkIdentity({ provider: "google", options: { redirectTo: window.location.origin } });
  if (error) { msg("err", error.message); setAuthLoading(null); }
  // on success it redirects
 }

 const googleLinked = authUser?.identities?.some(i => i.provider === "google");

 return (
  <div style={{ maxWidth: "min(460px,100%)", display: "flex", flexDirection: "column", gap: "4px" }}>
   <div style={{ fontSize: "1rem", fontWeight: "800", color: "#111", marginBottom: "8px" }}>Security</div>

   {authMsg.text && (
    <div style={{ padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "12px",
      background: authMsg.type === "ok" ? "rgba(74,207,134,0.1)" : "rgba(224,85,119,0.1)",
      border: `1px solid ${authMsg.type === "ok" ? "rgba(74,207,134,0.4)" : "rgba(224,85,119,0.4)"}`,
      color: authMsg.type === "ok" ? "#1a7a4a" : "#c0304f" }}>
     {authMsg.text}
    </div>
   )}

   {/* Email */}
   <div style={row}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
     <div>
      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#333" }}>Email address</div>
      <div style={{ fontSize: "0.82rem", color: "#888", marginTop: "2px" }}>{authUser?.email || "—"}</div>
     </div>
     <button style={btnLink} onClick={() => setSection(section === "email" ? null : "email")}>
      {section === "email" ? "Cancel" : "Change"}
     </button>
    </div>
    {section === "email" && (
     <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <input style={inputSty} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
        placeholder="New email address" autoComplete="email" />
      <button style={btnPrimary} onClick={handleEmailChange} disabled={!!authLoading}>
       {authLoading === "email" ? "Sending…" : "Send confirmation"}
      </button>
     </div>
    )}
   </div>

   {/* Password */}
   <div style={row}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
     <div>
      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#333" }}>Password</div>
      <div style={{ fontSize: "0.82rem", color: "#888", marginTop: "2px" }}>
       {googleLinked && !authUser?.identities?.some(i => i.provider === "email") ? "Set a password to enable email login" : "Change your password"}
      </div>
     </div>
     <button style={btnLink} onClick={() => setSection(section === "password" ? null : "password")}>
      {section === "password" ? "Cancel" : "Change"}
     </button>
    </div>
    {section === "password" && (
     <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <input style={inputSty} type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
        placeholder="New password (8+ characters)" autoComplete="new-password" />
      <input style={inputSty} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
        placeholder="Confirm new password" autoComplete="new-password" />
      <button style={btnPrimary} onClick={handlePasswordChange} disabled={!!authLoading}>
       {authLoading === "password" ? "Saving…" : "Update password"}
      </button>
     </div>
    )}
   </div>

   {/* Google */}
   <div style={row}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
     <div>
      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#333" }}>Google account</div>
      <div style={{ fontSize: "0.82rem", color: "#888", marginTop: "2px" }}>
       {googleLinked ? "✓ Connected — you can sign in with Google" : "Link your Google account for one-tap sign-in"}
      </div>
     </div>
     {!googleLinked && (
      <button style={btnLink} onClick={handleConnectGoogle} disabled={!!authLoading}>
       {authLoading === "google" ? "Redirecting…" : "Connect"}
      </button>
     )}
    </div>
    {!googleLinked && (
     <div style={{ fontSize: "0.78rem", color: "#aaa", lineHeight: 1.5, marginTop: "2px" }}>
      Requires Google OAuth credentials in Supabase → Authentication → Providers → Google.
     </div>
    )}
   </div>

   {/* Sign out all sessions */}
   <div style={{ ...row, borderBottom: "none" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
     <div>
      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#333" }}>Sessions</div>
      <div style={{ fontSize: "0.82rem", color: "#888", marginTop: "2px" }}>
       Sign out of all devices and browsers at once.
      </div>
     </div>
     <button
      style={{ ...btnLink, color: "#E05577", textDecoration: "none", fontWeight: "700" }}
      disabled={authLoading === "signout_all"}
      onClick={async () => {
       if (!window.confirm("Sign out of all sessions on all devices?")) return;
       setAuthLoading("signout_all");
       try {
        await sb.auth.signOut({ scope: "global" });
       } catch (e) {
        msg("err", e.message);
        setAuthLoading(null);
       }
       // auth state change will handle redirect
      }}>
      {authLoading === "signout_all" ? "Signing out…" : "Sign out all"}
     </button>
    </div>
   </div>

   {/* Divider */}
   <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", marginTop: "8px", paddingTop: "20px" }}>
    <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>Device PIN</div>
    <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "12px", lineHeight: 1.5 }}>A 4-digit PIN prevents others from accidentally switching to your profile on shared devices.</p>
    {!pinMode
     ? <div style={{ display: "flex", gap: "8px" }}>
        <button style={btnSecondary} onClick={() => { setPinMode(hasPin ? "change" : "set"); setPinStep("enter"); setPinError(""); }}>
         {hasPin ? "Change PIN" : "Set PIN"}
        </button>
        {hasPin && <button style={{ ...btnSecondary, color: "#E05577", borderColor: "#E05577" }} onClick={() => { setPinMode("remove"); setPinError(""); }}>Remove</button>}
       </div>
     : <div style={{ maxWidth: "200px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontSize: "0.88rem", color: "#555" }}>
         {pinMode === "remove" ? "Enter current PIN to remove" : pinStep === "enter" ? `Enter ${hasPin ? "new " : ""}4-digit PIN` : "Confirm PIN"}
        </div>
        {(pinMode === "change" && pinStep === "enter" || pinMode === "remove") && (
         <input style={{ ...inputSty, letterSpacing: "0.2em" }} type="password" inputMode="numeric" maxLength={4} placeholder="Current PIN" value={currentPin} autoFocus onChange={e => { if (/^[0-9]{0,4}$/.test(e.target.value)) setCurrentPin(e.target.value); }} />
        )}
        {pinMode !== "remove" && (
         <input style={{ ...inputSty, letterSpacing: "0.2em" }} type="password" inputMode="numeric" maxLength={4} placeholder={pinStep === "enter" ? "New PIN" : "Confirm PIN"} value={pinStep === "enter" ? pin1 : pin2} autoFocus={!(pinMode === "change" && pinStep === "enter")} onChange={e => { if (/^[0-9]{0,4}$/.test(e.target.value)) { if (pinStep === "enter") setPin1(e.target.value); else setPin2(e.target.value); } }} />
        )}
        {pinError && <div style={{ fontSize: "0.85rem", color: "#E05577" }}>{pinError}</div>}
        <div style={{ display: "flex", gap: "8px" }}>
         <button style={btnSecondary} onClick={() => { setPinMode(null); setPinStep("enter"); setPin1(""); setPin2(""); setCurrentPin(""); setPinError(""); }}>Cancel</button>
         <button style={btnPrimary} onClick={handlePinSave}>{pinMode === "remove" ? "Remove" : pinStep === "enter" && pinMode !== "remove" ? "Next" : "Save"}</button>
        </div>
       </div>
    }
   </div>
  </div>
 );
}


// ── PTOManager — Time Off tracking for streak protection ─────────────────────
function PTOManager({ user }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [freezes, setFreezes] = useState({ count:0, usedDates:[], pto:[], sick:[] });
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [msg, setMsg] = useState("");
 const [msgErr, setMsgErr] = useState(false);
 const [open, setOpen] = useState(false);
 const [tab, setTab] = useState("pto"); // "pto" | "sick"

 const year = new Date().getFullYear().toString();
 const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
 const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();

 useEffect(() => {
  if (!user?.id) return;
  loadStreakFreezes(user.id).then(f => { setFreezes(f || { count:0, usedDates:[], pto:[], sick:[] }); setLoading(false); }).catch(() => setLoading(false));
 }, [user?.id]);

 function flash(text, err=false) { setMsg(text); setMsgErr(err); setTimeout(() => setMsg(""), 3000); }

 const ptoThisYear  = (freezes.pto  || []).filter(e => e.date.startsWith(year));
 const sickThisYear = (freezes.sick || []).filter(e => e.date.startsWith(year));
 const ptoRemaining  = 15 - ptoThisYear.length;
 const sickRemaining =  5 - sickThisYear.length;

 // Mini calendar state
 const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

 function calCells(y, m) {
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
  return cells;
 }
 function fmtMonthYear(y, m) { return new Date(y, m, 1).toLocaleDateString("en-US", { month:"long", year:"numeric" }); }
 function prevMonth() { setCalMonth(({y,m}) => m === 0 ? {y:y-1,m:11} : {y,m:m-1}); }
 function nextMonth() { setCalMonth(({y,m}) => m === 11 ? {y:y+1,m:0} : {y,m:m+1}); }

 async function logDay(date, type) {
  if (!user?.id) return;
  const check = type === "pto" ? canLogPTO(freezes, date) : canLogSick(freezes, date);
  if (!check.ok) { flash(check.reason, true); return; }
  setSaving(true);
  const updated = { ...freezes };
  if (type === "pto")  updated.pto  = [...(updated.pto  || []), { date, type:"pto",  loggedAt: today }];
  if (type === "sick") updated.sick = [...(updated.sick || []), { date, type:"sick", loggedAt: today }];
  await saveStreakFreezes(user.id, updated);
  setFreezes(updated);
  setSaving(false);
  flash(`${type === "pto" ? "🏖 PTO" : "🤒 Sick day"} logged for ${date}`);
 }

 async function removeDay(date, type) {
  if (!user?.id) return;
  setSaving(true);
  const updated = { ...freezes };
  if (type === "pto")  updated.pto  = (updated.pto  || []).filter(e => e.date !== date);
  if (type === "sick") updated.sick = (updated.sick || []).filter(e => e.date !== date);
  await saveStreakFreezes(user.id, updated);
  setFreezes(updated);
  setSaving(false);
  flash("Removed");
 }

 function isLogged(date, type) {
  if (type === "pto")  return (freezes.pto  || []).some(e => e.date === date);
  if (type === "sick") return (freezes.sick || []).some(e => e.date === date);
  return false;
 }

 function dayLabel(ds) {
  const d = new Date(ds + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
 }

 const allProtected = [...(freezes.pto||[]), ...(freezes.sick||[])].sort((a,b)=>a.date.localeCompare(b.date));
 const upcoming = allProtected.filter(e => e.date >= today);
 const past     = allProtected.filter(e => e.date <  today).slice(-5).reverse();

 return (
  <div style={{ borderTop:"1px solid var(--border-1)", paddingTop:"20px", marginTop:"4px" }}>
   <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
    <div>
     <div style={{ fontSize:"0.9rem", fontWeight:"600", color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"2px", fontFamily:F }}>Time Off</div>
     <div style={{ fontSize:"0.78rem", color:"var(--text-muted)" }}>
      🏖 {ptoRemaining} PTO days left · 🤒 {sickRemaining} sick days left
      {upcoming.length > 0 && <span style={{ color:"var(--accent)", marginLeft:"8px" }}>· {upcoming.length} upcoming</span>}
     </div>
    </div>
    <button onClick={() => setOpen(o=>!o)} style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 8px", color:"var(--text-dim)", fontSize:"0.8rem", lineHeight:1, WebkitTapHighlightColor:"transparent", transform:open?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▼</button>
   </div>

   {open && (
    <div style={{ marginTop:"14px" }}>
     {msg && (
      <div style={{ padding:"8px 12px", borderRadius:"8px", marginBottom:"10px", fontSize:"0.82rem", fontWeight:"600", fontFamily:F,
       background: msgErr ? "rgba(244,63,94,0.1)" : "rgba(29,201,232,0.08)",
       border: `1px solid ${msgErr ? "rgba(244,63,94,0.3)" : "rgba(29,201,232,0.25)"}`,
       color: msgErr ? "var(--red)" : "var(--accent)" }}>
       {msg}
      </div>
     )}

     {/* Tab toggle */}
     <div style={{ display:"flex", gap:"0", marginBottom:"14px", borderBottom:"1px solid var(--border-1)" }}>
      {[["pto","🏖 PTO","15/yr · same-day or future only"],["sick","🤒 Sick Day","5/yr · today or yesterday"]].map(([t,label,hint])=>(
       <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 14px", background:"none", border:"none", borderBottom:tab===t?"2px solid var(--accent)":"2px solid transparent", fontWeight:tab===t?"700":"500", fontSize:"0.82rem", color:tab===t?"var(--accent)":"var(--text-muted)", cursor:"pointer", fontFamily:F, flexShrink:0, WebkitTapHighlightColor:"transparent", transition:"all 0.12s", marginBottom:"-1px" }}>
        {label}
       </button>
      ))}
     </div>

     {/* Policy reminder */}
     <div style={{ fontSize:"0.74rem", color:"var(--text-dim)", marginBottom:"12px", background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"8px", padding:"8px 12px", lineHeight:1.5 }}>
      {tab==="pto"
       ? `🏖 PTO protects your streak and silences Pacer. You have ${ptoRemaining} of 15 days left this year. Can only be logged for today or future dates — no retroactive PTO.`
       : `🤒 Sick days can be logged for today or yesterday (because you don't plan to be sick). You have ${sickRemaining} of 5 days left this year.`
      }
     </div>

     {/* PTO Calendar / Sick day selector */}
     <div style={{ marginBottom:"14px" }}>
      <div style={{ fontSize:"0.7rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"10px" }}>
       {tab==="pto" ? "Select PTO days" : "Log sick day"}
      </div>
      {tab==="pto" ? (
       <div style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"12px", padding:"12px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
         <button onClick={prevMonth} style={{ background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", fontSize:"1.1rem", padding:"2px 8px", borderRadius:"6px", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>‹</button>
         <span style={{ fontSize:"0.82rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F }}>{fmtMonthYear(calMonth.y, calMonth.m)}</span>
         <button onClick={nextMonth} style={{ background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", fontSize:"1.1rem", padding:"2px 8px", borderRadius:"6px", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>›</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"2px", marginBottom:"4px" }}>
         {["S","M","T","W","T","F","S"].map((d,i) => (
          <div key={i} style={{ textAlign:"center", fontSize:"0.65rem", fontWeight:"700", color:"var(--text-dim)", padding:"2px 0" }}>{d}</div>
         ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"3px" }}>
         {calCells(calMonth.y, calMonth.m).map((date, i) => {
          if (!date) return <div key={"e"+i} />;
          const dow = new Date(date+"T12:00:00").getDay();
          const isWknd = dow === 0 || dow === 6;
          const isPast = date < today;
          const logged = isLogged(date, "pto");
          const canCheck = canLogPTO(freezes, date);
          const isToday = date === today;
          const disabled = saving || isWknd || (isPast && !logged);
          return (
           <button key={date}
            onClick={() => { if (!disabled) { haptic.medium(); logged ? removeDay(date, "pto") : logDay(date, "pto"); } }}
            disabled={disabled}
            title={!canCheck.ok && !logged ? canCheck.reason : ""}
            style={{ aspectRatio:"1", borderRadius:"6px", border:"none", cursor: disabled ? "default" : "pointer",
             fontFamily:F, fontSize:"0.75rem", fontWeight: isToday ? "800" : "500",
             background: logged ? "var(--accent)" : isToday ? "rgba(29,201,232,0.15)" : "transparent",
             color: logged ? "#000" : isWknd || isPast ? "var(--text-dim)" : isToday ? "var(--accent)" : "var(--text-secondary)",
             opacity: disabled && !logged ? 0.35 : 1,
             outline: isToday && !logged ? "1px solid rgba(29,201,232,0.4)" : "none",
             transition:"all 0.1s", WebkitTapHighlightColor:"transparent" }}>
            {new Date(date+"T12:00:00").getDate()}
           </button>
          );
         })}
        </div>
        <div style={{ fontSize:"0.68rem", color:"var(--text-dim)", marginTop:"8px", textAlign:"center" }}>Tap a day to toggle · Weekends excluded automatically</div>
       </div>
      ) : (
       <div style={{ display:"flex", gap:"8px" }}>
        {[today, (() => { const d=new Date(today); d.setDate(d.getDate()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()].map(date => {
         const logged = isLogged(date, "sick");
         const canCheck = canLogSick(freezes, date);
         return (
          <button key={date} onClick={() => { haptic.medium(); logged ? removeDay(date, "sick") : logDay(date, "sick"); }}
           disabled={saving || (!logged && !canCheck.ok)}
           title={!canCheck.ok && !logged ? canCheck.reason : ""}
           style={{ flex:1, padding:"10px 12px", borderRadius:"10px", fontSize:"0.82rem", fontWeight:"700", cursor: saving||(!logged&&!canCheck.ok)?"not-allowed":"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent", transition:"all 0.12s", textAlign:"center",
            background: logged ? "rgba(29,201,232,0.12)" : "var(--bg-2)",
            border: logged ? "1px solid rgba(29,201,232,0.4)" : "1px solid var(--border-1)",
            color: logged ? "var(--accent)" : (!canCheck.ok&&!logged) ? "var(--text-dim)" : "var(--text-secondary)",
            opacity: (!logged&&!canCheck.ok) ? 0.5 : 1 }}>
           {logged ? "✓ " : ""}{date===today ? "Today" : "Yesterday"}
          </button>
         );
        })}
       </div>
      )}
     </div>

     {/* Upcoming protected days */}
     {upcoming.length > 0 && (
      <div style={{ marginBottom:"12px" }}>
       <div style={{ fontSize:"0.7rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>Upcoming time off</div>
       <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
        {upcoming.map(e => (
         <div key={e.date+e.type} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 10px", background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"8px" }}>
          <div>
           <span style={{ fontSize:"0.78rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F }}>{e.type==="pto"?"🏖":"🤒"} {dayLabel(e.date)}</span>
           <span style={{ fontSize:"0.68rem", color:"var(--text-dim)", marginLeft:"8px" }}>{e.type==="pto"?"PTO":"Sick Day"}</span>
          </div>
          <button onClick={()=>{ haptic.light(); removeDay(e.date, e.type); }} style={{ background:"none", border:"none", color:"var(--text-dim)", cursor:"pointer", fontSize:"0.78rem", padding:"2px 6px", borderRadius:"4px", fontFamily:F }}>Remove</button>
         </div>
        ))}
       </div>
      </div>
     )}

     {/* Recent past protected days */}
     {past.length > 0 && (
      <div>
       <div style={{ fontSize:"0.7rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>Recent</div>
       <div style={{ display:"flex", flexWrap:"wrap", gap:"5px" }}>
        {past.map(e => (
         <span key={e.date+e.type} style={{ padding:"3px 8px", borderRadius:"6px", fontSize:"0.72rem", background:"var(--bg-3)", color:"var(--text-dim)", border:"1px solid var(--border-1)" }}>
          {e.type==="pto"?"🏖":"🤒"} {dayLabel(e.date)}
         </span>
        ))}
       </div>
      </div>
     )}
    </div>
   )}
  </div>
 );
}

// ── UserAvatar — reusable avatar that handles initials/emoji/photo ────────────
function UserAvatar({ user, size=32, fontSize=null }) {
 const sz = size+"px";
 const fs = fontSize || (size <= 28 ? "0.75rem" : size <= 36 ? "0.85rem" : "1rem");
 const bg = initialsColor(user?.name, user?.avatarColor?.startsWith("emoji:") || user?.avatarColor?.startsWith("data:") || user?.avatarColor?.startsWith("http") ? null : user?.avatarColor);
 const emoji = user?.avatarColor?.startsWith("emoji:") ? user.avatarColor.slice(6) : null;
 const photo = user?.avatarUrl || null;
 const initials = (user?.name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
 if (photo) return <img src={photo} alt="avatar" style={{width:sz,height:sz,borderRadius:"50%",objectFit:"cover",flexShrink:0,display:"block"}}/>;
 if (emoji) return <div style={{width:sz,height:sz,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size<=28?"1rem":"1.3rem",flexShrink:0}}>{emoji}</div>;
 return <div style={{width:sz,height:sz,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:fs,fontWeight:"800",color:"#fff",flexShrink:0}}>{initials}</div>;
}

// ── DailyReportTab ────────────────────────────────────────────────────────────
function DailyReportTab({ user, industryConfig }) {
  const F  = "'DM Sans',system-ui,sans-serif";
  const TA = "var(--accent,#1DC9E8)";
  const TM = "var(--text-muted)";
  const TD = "var(--text-dim,rgba(255,255,255,0.25))";
  const B1 = "var(--border-1)";
  const BG1 = "var(--bg-1)";
  const BG2 = "var(--bg-2)";
  const [recipients, setRecipients] = React.useState([]);
  const [newEmail, setNewEmail]     = React.useState("");
  const [saving, setSaving]         = React.useState(false);
  const [loading, setLoading]       = React.useState(true);
  const [testSending, setTestSending] = React.useState(false);
  const [testResult, setTestResult]   = React.useState(null);
  const [reportMetrics, setReportMetrics] = React.useState(null); // null = all; array = selected keys
  const reportKey     = `${user?.orgId||"solo-"+user?.id}::at-report-recipients`;
  const metricsKey    = user ? `${user?.orgId||"solo-"+user?.id}::at-report-metrics-${user.id}` : null;

  const allMetrics = industryConfig?.weekdayMetrics || [];

  React.useEffect(() => {
    if (!window._sb || !user) return;
    Promise.all([
      window._sb.from("kv_store").select("value").eq("key", reportKey).maybeSingle(),
      metricsKey ? window._sb.from("kv_store").select("value").eq("key", metricsKey).maybeSingle() : Promise.resolve({data:null}),
    ]).then(([{data: rd}, {data: md}]) => {
      setRecipients(Array.isArray(rd?.value) ? rd.value : []);
      setReportMetrics(Array.isArray(md?.value) ? md.value : null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id]);

  const isValidEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  async function addRecipient() {
    const email = newEmail.trim().toLowerCase();
    if (!isValidEmail(email) || recipients.includes(email)) { setNewEmail(""); return; }
    const updated = [...recipients, email];
    setSaving(true);
    try { await window._sb.from("kv_store").upsert({key:reportKey,value:updated,updated_at:new Date().toISOString()},{onConflict:"key"}); } catch(e) {}
    setRecipients(updated); setNewEmail(""); setSaving(false);
  }

  async function removeRecipient(email) {
    const updated = recipients.filter(e => e !== email);
    try { await window._sb.from("kv_store").upsert({key:reportKey,value:updated,updated_at:new Date().toISOString()},{onConflict:"key"}); } catch(e) {}
    setRecipients(updated);
  }

  async function toggleMetric(key) {
    if (!metricsKey) return;
    const current = reportMetrics ?? allMetrics.map(m => m.key);
    const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
    // null means "all" — if they've re-selected everything, store null
    const toStore = next.length === allMetrics.length ? null : next;
    setReportMetrics(toStore);
    try {
      if (toStore === null) {
        await window._sb.from("kv_store").delete().eq("key", metricsKey);
      } else {
        await window._sb.from("kv_store").upsert({key:metricsKey,value:toStore,updated_at:new Date().toISOString()},{onConflict:"key"});
      }
    } catch(e) {}
  }

  async function sendTest() {
    setTestSending(true); setTestResult(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ test: true }),
      });
      setTestResult(res.ok ? "success" : "error");
    } catch { setTestResult("error"); }
    setTestSending(false);
  }

  const activeKeys = reportMetrics ?? allMetrics.map(m => m.key);

  return (
    <div style={{maxWidth:"480px",display:"flex",flexDirection:"column",gap:"20px"}}>
      <div>
        <div style={{fontSize:"1.05rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F,marginBottom:"4px"}}>Daily Report</div>
        <div style={{fontSize:"0.85rem",color:TM,lineHeight:1.6}}>Email at 5pm ET every weekday with your group's numbers. Everyone in this list gets the same summary.</div>
      </div>
      <div>
        <div style={{fontSize:"0.7rem",fontWeight:"800",color:TD,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"10px"}}>Recipients</div>
        {loading && <div style={{fontSize:"0.82rem",color:TD}}>Loading…</div>}
        {!loading && recipients.length === 0 && <div style={{fontSize:"0.82rem",color:TD,fontStyle:"italic"}}>No recipients yet.</div>}
        {recipients.map(email => (
          <div key={email} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:BG1,border:`1px solid ${B1}`,borderRadius:"10px",marginBottom:"6px"}}>
            <span style={{fontSize:"0.88rem",fontWeight:"600",color:"var(--text-primary)",fontFamily:F}}>{email}</span>
            <button onClick={()=>removeRecipient(email)} style={{background:"none",border:"none",color:"rgba(248,113,113,0.7)",cursor:"pointer",fontSize:"0.8rem",fontWeight:"700",padding:"2px 6px",fontFamily:F}}>Remove</button>
          </div>
        ))}
      </div>
      <div>
        <div style={{fontSize:"0.7rem",fontWeight:"800",color:TD,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"8px"}}>Add recipient</div>
        <div style={{display:"flex",gap:"8px"}}>
          <input type="email" placeholder="austin@inmangroup.net" value={newEmail}
            onChange={e=>setNewEmail(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addRecipient()}
            style={{flex:1,background:BG2,border:`1px solid ${B1}`,borderRadius:"10px",padding:"10px 14px",color:"var(--text-primary)",fontSize:"0.88rem",fontFamily:F,outline:"none"}}
          />
          <button onClick={addRecipient} disabled={saving||!isValidEmail(newEmail)}
            style={{background:TA,color:"#000",border:"none",borderRadius:"10px",padding:"10px 16px",fontWeight:"800",fontSize:"0.85rem",cursor:"pointer",fontFamily:F,opacity:(!isValidEmail(newEmail)||saving)?0.4:1}}>
            {saving?"…":"Add"}
          </button>
        </div>
      </div>

      {/* Metric toggles */}
      {allMetrics.length > 0 && (
        <div>
          <div style={{fontSize:"0.7rem",fontWeight:"800",color:TD,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"10px"}}>Include in report</div>
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {allMetrics.map(m => {
              const on = activeKeys.includes(m.key);
              return (
                <button key={m.key} onClick={()=>toggleMetric(m.key)}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:on?"rgba(29,201,232,0.05)":BG1,border:`1px solid ${on?"rgba(29,201,232,0.3)":B1}`,borderRadius:"10px",cursor:"pointer",fontFamily:F,WebkitTapHighlightColor:"transparent"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <div style={{width:"8px",height:"8px",borderRadius:"50%",background:m.color||TA,flexShrink:0}}/>
                    <span style={{fontSize:"0.88rem",fontWeight:"600",color:on?"var(--text-primary)":"var(--text-muted)"}}>{m.label}</span>
                  </div>
                  <div style={{width:"36px",height:"22px",borderRadius:"11px",background:on?TA:"var(--bg-3)",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                    <div style={{position:"absolute",top:"3px",left:on?"17px":"3px",width:"16px",height:"16px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{background:BG1,border:`1px solid ${B1}`,borderRadius:"12px",padding:"14px 16px"}}>
        <div style={{fontSize:"0.68rem",fontWeight:"800",color:TD,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"4px"}}>Subject</div>
        <div style={{fontSize:"0.82rem",color:TM,fontFamily:"monospace",marginBottom:"12px"}}>Cadence · Tue 3/18</div>
        <div style={{fontSize:"0.68rem",fontWeight:"800",color:TD,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"4px"}}>Body</div>
        <pre style={{fontSize:"0.82rem",color:TM,fontFamily:"monospace",lineHeight:1.6,margin:0,whiteSpace:"pre-wrap"}}>{"Austin: 34/50 dials · 4 connects 🔥3d\nJake: 28/50 dials · 2 connects\n\n16 dials left in the tank. Finish strong."}</pre>
      </div>
      <button onClick={sendTest} disabled={testSending}
        style={{background:"rgba(29,201,232,0.08)",border:"1px solid rgba(29,201,232,0.25)",borderRadius:"12px",padding:"13px",fontWeight:"700",fontSize:"0.88rem",color:TA,cursor:"pointer",fontFamily:F,opacity:testSending?0.6:1}}>
        {testSending ? "Sending test…" : "Send test report now →"}
      </button>
      {testResult === "success" && <div style={{fontSize:"0.8rem",color:"#4ACF86",fontWeight:"600"}}>✓ Sent — check your inbox.</div>}
      {testResult === "error" && <div style={{fontSize:"0.8rem",color:"#F87171",fontWeight:"600"}}>Failed — check that RESEND_API_KEY is set in Supabase secrets.</div>}
    </div>
  );
}

export function SettingsPage({user, allUsers, admins, teams, industryConfigs, industryConfig, userGoals, pins, isSuperAdmin, isAdmin,
 onRename, onChangeIndustry, onSaveGoals, onSetPin, onRemovePin,
 onAddNew, onDelete, onToggleAdmin, onAssignTeam, onSaveAdminConfig, onSetAvatarColor, onSetAvatarEmoji, onSetAvatarUrl, initialTab="profile",
 orgId, orgMeta, onJoinOrg, onUpdateOrgMeta, isSolo, communities, communityMembers, onCreateCommunity, onJoinCommunity, onLeaveCommunity,
 onUpdateCommunityMeta, onKickCommunityMember,
 orgPendingRequests, communityPendingRequests,
 onRequestJoinOrg, onApproveOrgRequest, onRejectOrgRequest,
 onJoinCommunityByPin, onRequestJoinCommunity, onApproveCommunityRequest, onRejectCommunityRequest,
 onSearchSpaces, spaceSearchResults, onChangeCommunityIndustry,
 communityAdminsInit={}, onSaveCommunityAdmins,
 isGlobalSA,
 darkMode, onToggleDarkMode, onLogout, authUser,
 presenceMap, onOpenDm,
 userTracks, activeTrackId, onSwitchTrack, onCreateTrack, onDeleteTrack,
 onSendFeedback,
 pacerSettings={}, onSavePacerSettings,
 freezeBank={}, unlockedMilestones=[],
 myData={}, myFreezes={},
 isPro=false, onShowPaywall}) {

 const [tab, setTab] = useState(initialTab);
 const [savedMsg, setSavedMsg] = useState("");
 const [communityAdmins, setCommunityAdmins] = useState(()=>communityAdminsInit||{});
 const [feedbackText, setFeedbackText] = useState("");
 const [feedbackSent, setFeedbackSent] = useState(false);
 const [feedbackSending, setFeedbackSending] = useState(false);
 const [profileCopied, setProfileCopied] = useState(false);
 // Local avatar state — updates immediately without waiting for prop round-trip
 // Separate local state for color, emoji, photo — all update instantly
 const [localAvatarColor, setLocalAvatarColor] = useState(user?.avatarColor || null);
 const [localAvatarEmoji, setLocalAvatarEmoji] = useState(user?.avatarEmoji || null);
 const [localAvatarUrl, setLocalAvatarUrl] = useState(user?.avatarUrl || null);
 const [avatarMode, setAvatarMode] = useState(null); // null = panel closed
 const [avatarUploading, setAvatarUploading] = useState(false);
 const fileInputRef = React.useRef(null);
 function flashSaved(msg){ setSavedMsg(msg); setTimeout(()=>setSavedMsg(""), 2500); }

 const EMOJI_AVATARS = ["🦁","🐯","🦊","🐺","🦅","🦆","🐬","🦈","🐙","🦑","🌵","🌋","⚡","🔥","🌊","🏔️","🚀","🛸","🎯","🏆","💎","⚔️","🧠","👁️","🎭","🎪","🌀","🔮","🦄","🐉"];

 // Presence helpers
 const PMAP = presenceMap || {};
 const PCOLORS = { online: "#4ACF86", away: "#F59E0B", offline: "#555" };
 const PLABELS = { online: "Online", away: "Away", offline: "Offline" };
 function presStatus(userId) {
  const ts = PMAP[userId];
  if (!ts) return "offline";
  const age = Date.now() - ts;
  if (age < 90000) return "online";
  if (age < 600000) return "away";
  return "offline";
 }
 function PresenceDot({ uid, style={} }) {
  const st = uid === user.id ? "online" : presStatus(uid);
  return <div title={PLABELS[st]} style={{ width:"8px", height:"8px", borderRadius:"50%", background:PCOLORS[st], border:"2px solid var(--bg-1,#0C0C0C)", flexShrink:0, ...style }} />;
 }

 const adminsNeedingPin = admins.filter(id => !pins[id]);
 const myAdminNeedsPin = isAdmin && !pins[user.id];

 const [firstName, setFirstName] = useState(()=>user.name.trim().includes(" ")?user.name.trim().split(" ")[0]:user.name.trim());
 const [lastName, setLastName] = useState(()=>{const p=user.name.trim().split(" ");return p.length>1?p.slice(1).join(" "):"";});
 const fullName = (firstName.trim()+" "+lastName.trim()).trim();
 const [industry, setIndustry] = useState(user.industry);
 const nameChanged = fullName.trim()&&fullName.trim()!==user.name&&firstName.trim().length>0&&lastName.trim().length>0;
 const indChanged = industry !== user.industry;
 const [industryWarnStep, setIndustryWarnStep] = useState(-1); // 0=closed 1=why 2=consequences 3=final

 const metrics = industryConfig.weekdayMetrics;
 const [goals, setGoals] = useState(()=>{
  const g={};
  for(const m of metrics) g[m.key]=(userGoals&&userGoals[m.key]!=null)?userGoals[m.key]:m.defaultGoal;
  return g;
 });

 const hasPin = !!pins[user.id];
 const [pinMode, setPinMode] = useState(null);
 const [pinStep, setPinStep] = useState("enter");
 const [pin1, setPin1] = useState("");
 const [pin2, setPin2] = useState("");
 const [currentPin, setCurrentPin] = useState("");
 const [pinError, setPinError] = useState("");
 function handlePinSave(){
  if(pinMode==="remove"){
   if(currentPin!==pins[user.id]){setPinError("Current PIN incorrect");return;}
   onRemovePin();setPinMode(null);setPinError("");setCurrentPin("");flashSaved("PIN removed");return;
  }
  if(pinStep==="enter"){if(pin1.length!==4){setPinError("PIN must be 4 digits");return;}setPinStep("confirm");setPinError("");return;}
  if(pin1!==pin2){setPinError("PINs don't match — try again");setPin2("");return;}
  if(pinMode==="change"&&currentPin!==pins[user.id]){setPinError("Current PIN incorrect");return;}
  onSetPin(pin1);setPinMode(null);setPinStep("enter");setPin1("");setPin2("");setCurrentPin("");setPinError("");flashSaved("PIN updated");
 }

 const industryKeys = Object.keys(industryConfigs).filter(k=>k!=="admins");
 const [adminIndTab, setAdminIndTab] = useState(industryKeys[0]||"freight");
 const [adminSubTab, setAdminSubTab] = useState("fields");
 const [adminCfg, setAdminCfg] = useState(()=>{
  const out={};
  for(const k of industryKeys){
   const v=industryConfigs[k];
   out[k]={...v,weekdayMetrics:[...(v.weekdayMetrics||[])],weekendMetrics:[...(v.weekendMetrics||[])]};
  }
  return out;
 });
 function updateMetric(ind,type,idx,field,val){
  setAdminCfg(prev=>{
   const next={...prev,[ind]:{...prev[ind]}};
   const arr=[...next[ind][type]];
   arr[idx]={...arr[idx],[field]:val};
   next[ind][type]=arr;
   return next;
  });
 }
 function addMetric(ind,type){
  const newKey=`custom_${Date.now()}`;
  const existing=adminCfg[ind][type];
  const newMet={key:newKey,label:"New Field",short:"New",color:METRIC_COLORS[existing.length%METRIC_COLORS.length],keyBind:String(existing.length+1),defaultGoal:0};
  setAdminCfg(prev=>({...prev,[ind]:{...prev[ind],[type]:[...prev[ind][type],newMet]}}));
 }
 function removeMetric(ind,type,idx){
  setAdminCfg(prev=>({...prev,[ind]:{...prev[ind],[type]:prev[ind][type].filter((_,i)=>i!==idx)}}));
 }

 const [editingOrg, setEditingOrg] = useState(false);
 const [orgNameEdit, setOrgNameEdit] = useState(orgMeta?.name||"");
 const [orgPinEdit, setOrgPinEdit] = useState(orgMeta?.joinPin||"");
 const [orgInvites, setOrgInvites] = useState([]);
 const [orgInvitesLoaded, setOrgInvitesLoaded] = useState(false);
 const [orgInviteCopied, setOrgInviteCopied] = useState(null);
 const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

 useEffect(()=>{
  if(tab==="org" && orgId && !isSolo && isSuperAdmin && !orgInvitesLoaded){
   setOrgInvitesLoaded(true);
   loadSpaceInvites(orgId).then(l=>setOrgInvites(l));
  }
 },[tab, orgId, isSolo, isSuperAdmin, orgInvitesLoaded]);

 async function genOrgInvite(){
  if(!orgId||!orgMeta) return;
  const token=await createInviteToken(orgId,orgMeta.name,user.name,"org");
  const all=await loadSpaceInvites(orgId); setOrgInvites(all);
  const url=getInviteURL(token);
  if(isMob&&navigator.share){try{await navigator.share({title:`${orgMeta.name} — you're invited`,text:`Join ${orgMeta?.name||"our team"} on Cadence — where your daily output becomes your competitive edge.`,url});setOrgInviteCopied(token);setTimeout(()=>setOrgInviteCopied(null),2500);return;}catch{}}
  try{navigator.clipboard.writeText(url);}catch{copyText(url);}
  setOrgInviteCopied(token);setTimeout(()=>setOrgInviteCopied(null),2500);
 }

 async function copyInviteUrl(spaceId, spaceName, spaceType, setCopiedFn){
  const token=await createInviteToken(spaceId,spaceName,user.name,spaceType);
  const all=await loadSpaceInvites(spaceId);
  if(spaceType==="org") setOrgInvites(all);
  const url=getInviteURL(token);
  if(isMob&&navigator.share){try{await navigator.share({title:`${spaceName} — Cadence`,text:`You've been invited to join ${spaceName} on Cadence — daily tracking, leaderboards, real accountability.`,url});setCopiedFn(token);setTimeout(()=>setCopiedFn(null),2500);return;}catch{}}
  try{navigator.clipboard.writeText(url);}catch{copyText(url);}
  setCopiedFn(token);setTimeout(()=>setCopiedFn(null),2500);
 }

 const [selectedComId, setSelectedComId] = useState(null);
 const [comNameEdit, setComNameEdit] = useState("");
 const [comDescEdit, setComDescEdit] = useState("");
 const [comPinEdit, setComPinEdit] = useState("");
 const [comEditMode, setComEditMode] = useState(false);
 const [comInviteCopied, setComInviteCopied] = useState(null);
 const [showJoinCom, setShowJoinCom] = useState(false);
 const [joinComToken, setJoinComToken] = useState("");
 const [joinComInfo, setJoinComInfo] = useState(null);
 const [joinComErr, setJoinComErr] = useState("");
 const [joiningCom, setJoiningCom] = useState(false);
 const [showCreateCom, setShowCreateCom] = useState(false);
 const [newComName, setNewComName] = useState("");
 const [newComDesc, setNewComDesc] = useState("");
 const [newComPin, setNewComPin] = useState("");
 const [creatingCom, setCreatingCom] = useState(false);
 const [createdComToken, setCreatedComToken] = useState(null);
 const [showJoinOrgForm, setShowJoinOrgForm] = useState(false);
 const [joinOrgToken, setJoinOrgToken] = useState("");
 const [joinOrgInfo, setJoinOrgInfo] = useState(null);
 const [joinOrgErr, setJoinOrgErr] = useState("");
 const [joiningOrg, setJoiningOrg] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 const [searchType, setSearchType] = useState("all");
 const [selectedResult, setSelectedResult] = useState(null);
 const [requestSent, setRequestSent] = useState({});
 const [joinPinInput, setJoinPinInput] = useState("");
 const [joinPinErr, setJoinPinErr] = useState("");

 useEffect(()=>{
  const t=setTimeout(()=>{if(onSearchSpaces)onSearchSpaces(searchQuery);},300);
  return()=>clearTimeout(t);
 },[searchQuery,onSearchSpaces]);

 useEffect(()=>{
  if(!joinOrgToken.trim()){setJoinOrgInfo(null);setJoinOrgErr("");return;}
  const t=setTimeout(async()=>{
   const m=joinOrgToken.match(/\/invite\/([a-z0-9]+)/i);
   const tok=m?m[1]:joinOrgToken.trim();
   const inv=await loadInvite(tok);
   if(inv&&inv.spaceType!=="community"){setJoinOrgInfo({...inv,cleanToken:tok});setJoinOrgErr("");}
   else{setJoinOrgInfo(null);setJoinOrgErr(inv?.spaceType==="community"?"That's a Crew invite.":"Invite not found or expired.");}
  },400);
  return()=>clearTimeout(t);
 },[joinOrgToken]);

 useEffect(()=>{
  if(!joinComToken.trim()){setJoinComInfo(null);setJoinComErr("");return;}
  const t=setTimeout(async()=>{
   const m=joinComToken.match(/\/invite\/([a-z0-9]+)/i);
   const tok=m?m[1]:joinComToken.trim();
   const inv=await loadInvite(tok);
   if(inv&&inv.spaceType==="community"){setJoinComInfo({...inv,cleanToken:tok});setJoinComErr("");}
   else{setJoinComInfo(null);setJoinComErr(inv&&inv.spaceType!=="community"?"That's an org invite.":"Invite not found or expired.");}
  },400);
  return()=>clearTimeout(t);
 },[joinComToken]);

 async function handleJoinOrg(){
  if(!joinOrgInfo) return;
  setJoiningOrg(true);
  try{await onJoinOrg(joinOrgInfo.cleanToken,user.name,user.industry,null);flashSaved("Joined organization!");}
  catch(e){setJoinOrgErr("Failed: "+e.message);}
  setJoiningOrg(false);
 }

 async function handleJoinCommunity(){
  if(!joinComInfo) return;
  setJoiningCom(true);
  try{await onJoinCommunity(joinComInfo.cleanToken);flashSaved("Joined community!");setShowJoinCom(false);setJoinComToken("");setJoinComInfo(null);}
  catch(e){setJoinComErr("Failed: "+e.message);}
  setJoiningCom(false);
 }

 async function handleCreateCommunity(){
  if(!newComName.trim()) return;
  setCreatingCom(true);
  try{
   const meta=await onCreateCommunity(newComName.trim(),newComDesc.trim(),newComPin.trim());
   if(meta){const token=await createInviteToken(meta.id,meta.name,user.name,"community");setCreatedComToken(token);setSelectedComId(meta.id);}
   flashSaved("Crew created! 🎶");
   setNewComName("");setNewComDesc("");setNewComPin("");setShowCreateCom(false);
  }catch(e){
   if(e?.message==="CREW_LIMIT"){
    setShowCreateCom(false);
   } else {
    console.error(e);
   }
  }
  setCreatingCom(false);
 }

 async function handleJoinByPin(spaceId){
  setJoinPinErr("");
  const r=await onJoinCommunityByPin(spaceId,joinPinInput);
  if(r?.ok){flashSaved("Joined community!");setSelectedResult(null);setJoinPinInput("");}
  else setJoinPinErr(r?.reason==="wrong_pin"?"Incorrect password.":"Could not join.");
 }

 async function handleRequestJoin(space){
  const fn=space.type==="org"?onRequestJoinOrg:onRequestJoinCommunity;
  const r=await fn(space.id,space.name);
  if(r?.ok||r?.reason==="already_pending"){setRequestSent(p=>({...p,[space.id]:true}));flashSaved("Request sent!");}
 }

 const sInput={...s.inpBase,padding:"10px 12px",...s.br8,fontSize:"1rem",fontFamily:F,...s.w100,boxSizing:"border-box",outline:"none"};
 const sCard={background:BG0,...s.bd1,borderRadius:"12px",padding:"clamp(12px,1.3vw,18px)",marginBottom:"10px",boxShadow:"var(--shadow-card)"};
 const sectionLabel = {fontSize:"0.8rem",color:TM,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:"10px"};
 const fieldLabel = {fontSize:"0.95rem",color:TS,letterSpacing:"0.08em",marginBottom:"6px"};
 const sPendingRow={background:BG0,border:BB2A28,...s.br8,padding:"9px 12px",marginBottom:"6px",...s.fac,gap:"10px"};

 const orgPendingCount = (orgPendingRequests||[]).length;
 const communityPendingCount = Object.values(communityPendingRequests||{}).reduce((s,a)=>s+(a?.length||0),0);

 const NAV_GROUPS = [
  {
   label: "Personal",
   items: [
    {k:"profile",      label:"My Profile"},
    {k:"goals",        label:"My Goals"},
    {k:"journal",      label:"My Journal"},
    {k:"pacer",        label:"Pacer AI"},
    {k:"report",       label:"Daily Report"},
    {k:"share",   label:"Share Profile"},
    // {k:"refer", label:"Refer & Earn 💸"}, // vaulted
    {k:"feedback",label:"Feedback"},
    // Organization nav removed — returns as Teams workspace section
    {k:"crews",   label:"Crews", badge: isAdmin && communityPendingCount > 0 ? communityPendingCount : 0},
   ]
  },
  ...(isGlobalSA ? [{
   label: "Super Admin",
   items: [
    {k:"godmode", label:"👑 God Mode"},
   ]
  }] : []),
 ];
 const allNavItems = NAV_GROUPS.flatMap(g=>g.items);

 return (
  <div style={{display:"flex",flexDirection:"column",gap:"0",minHeight:"70vh",maxWidth:"1100px"}}>
   {/* ── Mobile: scrollable pill nav (consistent with rest of app) ── */}
   {isMob && (
    <div style={{marginBottom:"16px",borderBottom:BB1,paddingBottom:"12px"}}>
     <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none",display:"flex",gap:"6px",paddingBottom:"2px"}}>
      {NAV_GROUPS.flatMap(g=>g.items).map(({k,label,badge})=>{
       const active = tab===k;
       return (
        <button key={k} onClick={()=>setTab(k)} style={{
         flexShrink:0, padding:"7px 14px", borderRadius:"8px 8px 0 0", border:"none",
         fontFamily:F, fontSize:"0.82rem", fontWeight:"700", cursor:"pointer",
         background:active?"rgba(29,201,232,0.15)":"var(--bg-1)",
         color:active?"var(--accent)":"var(--text-muted)",
         borderBottom:active?"2px solid var(--accent)":"2px solid transparent",
         position:"relative", whiteSpace:"nowrap",
         WebkitTapHighlightColor:"transparent",
        }}>
         {label}
         {badge > 0 && (
          <span style={{marginLeft:"4px",background:"#E05577",color:"#fff",borderRadius:"8px",padding:"1px 5px",fontSize:"0.65rem",fontWeight:"800"}}>{badge}</span>
         )}
        </button>
       );
      })}
      <button onClick={onLogout} style={{
       flexShrink:0, padding:"7px 14px", borderRadius:"8px 8px 0 0", border:"none",
       fontFamily:F, fontSize:"0.82rem", fontWeight:"700", cursor:"pointer",
       background:"var(--bg-1)", color:"var(--text-dim)",
       borderBottom:"2px solid transparent", whiteSpace:"nowrap",
       WebkitTapHighlightColor:"transparent",
      }}>↩ Sign Out</button>
     </div>
    </div>
   )}

   <div style={{display:"flex",gap:"0",flex:1}}>
    {/* ── Left nav (desktop only) ── */}
    {!isMob && (
     <div style={{width:"clamp(180px,18vw,220px)",flexShrink:0,borderRight:BB1,paddingRight:"0",paddingTop:"8px"}}>
      {NAV_GROUPS.map(group=>(
       <div key={group.label} style={s.mb8}>
        <div style={{fontSize:"0.72rem",color:TD,textTransform:"uppercase",letterSpacing:"0.12em",padding:"10px 18px 5px",...s.fw7}}>{group.label}</div>
        {group.items.map(({k,label,badge})=>(
         <button key={k} onClick={()=>setTab(k)} style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",...s.w100,textAlign:"left",
          background: tab===k?BG3:"none",
          border:"none",
          borderLeft: tab===k?"3px solid var(--accent)":"3px solid transparent",
          color: tab===k?TA:TS,
          padding:"10px 16px",fontSize:"0.95rem",fontFamily:F,
          fontWeight: tab===k?"600":"400",
          ...s.cp,
         }}>
          <span>{label}</span>
          {badge > 0 && <span style={{background:"#E05577",color:"#fff",borderRadius:"10px",fontSize:"0.6rem",padding:"1px 6px",fontWeight:"800",lineHeight:"16px",flexShrink:0}}>{badge}</span>}
         </button>
        ))}
       </div>
      ))}

      <button onClick={onLogout} style={{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",borderLeft:"3px solid transparent",color:"#E05577",padding:"10px 16px 10px 19px",fontSize:"0.9rem",cursor:"pointer",fontFamily:"'DM Sans',system-ui,sans-serif",fontWeight:"500",marginTop:"8px",borderTop:"1px solid var(--bg-3)",paddingTop:"12px",WebkitTapHighlightColor:"transparent"}}>
       ↩ Sign Out
      </button>
     </div>
    )}

   {/* ── Right content ── */}
   <div style={{flex:1,paddingLeft:isMob?"0":"clamp(20px,3vw,40px)",paddingTop:"8px",minWidth:0,overflow:"hidden"}}>

    {savedMsg&&<div style={{background:BG1,...s.bd1,...s.br10,padding:"10px 16px",marginBottom:"20px",fontSize:"0.9rem",color:"var(--green)",...s.fac,gap:"8px",fontWeight:"500"}}>✓ {savedMsg}</div>}


    {/* ──────────────── MY PROFILE ──────────────── */}
    {tab==="profile"&&<div style={{maxWidth:"min(460px,100%)",...s.fdc,gap:"20px"}}>
     <div style={s.x1}>My Profile</div>

     {/* ── Avatar editor — click pencil on avatar to reveal pickers ── */}
     <div style={{...s.fdc,gap:"14px"}}>
      {/* Preview */}
      <div style={{...s.fac,gap:"16px"}}>
       <div style={{flexShrink:0,position:"relative"}}>
        {localAvatarUrl ? (
         <img src={localAvatarUrl} alt="avatar" style={{width:"72px",height:"72px",borderRadius:"50%",objectFit:"cover",display:"block"}}/>
        ) : (
         <div style={{width:"72px",height:"72px",borderRadius:"50%",background:initialsColor(user.name,localAvatarColor),...s.fcc,fontSize:localAvatarEmoji?"2.4rem":"1.8rem",fontWeight:localAvatarEmoji?"400":"800",color:BR,flexShrink:0,fontFamily:F}}>
          {localAvatarEmoji || (user.name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()}
         </div>
        )}
        {/* Pencil — click to toggle editor */}
        <button onClick={()=>setAvatarMode(m=>m?null:"emoji")}
         style={{position:"absolute",bottom:"0px",right:"0px",width:"22px",height:"22px",borderRadius:"50%",background:"var(--accent)",border:"2px solid var(--bg-1)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0,lineHeight:1,WebkitTapHighlightColor:"transparent",flexShrink:0,boxSizing:"border-box",minHeight:"unset"}}>
         <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M7 1L9 3L3.5 8.5H1.5V6.5L7 1Z" fill="#000" stroke="#000" strokeWidth="0.5" strokeLinejoin="round"/>
         </svg>
        </button>
       </div>
       <div>
        <div style={s.x14}>{user.name}</div>
        {authUser?.email && <div style={{fontSize:"0.75rem",color:"var(--text-dim)",marginTop:"3px",fontFamily:F}}>{authUser.email}</div>}
        {avatarMode && (
         <div style={{marginTop:"8px",display:"flex",gap:"6px",flexWrap:"wrap"}}>
          {["emoji","color","photo"].map(mode=>(
           <button key={mode} onClick={()=>setAvatarMode(mode)} style={{fontSize:"0.72rem",padding:"3px 10px",borderRadius:"20px",fontFamily:F,fontWeight:"600",cursor:"pointer",
            border:`1px solid ${avatarMode===mode?"var(--accent)":"var(--border-1)"}`,
            background:avatarMode===mode?"rgba(29,201,232,0.1)":"var(--bg-2)",
            color:avatarMode===mode?"var(--accent)":"var(--text-muted)"}}>
            {mode==="color"?"Color":mode.charAt(0).toUpperCase()+mode.slice(1)}
           </button>
          ))}
         </div>
        )}
       </div>
      </div>

      {/* Emoji/Color/Photo pickers — only visible after pencil click */}
      {avatarMode==="emoji"&&(
       <div>
        <div style={{fontSize:"0.72rem",fontWeight:"700",color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"8px"}}>Avatar Icon</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
         {EMOJI_AVATARS.map(em=>{
          const isActive = localAvatarEmoji===em;
          return (
           <button key={em} onClick={()=>{
            const next = isActive ? null : em;
            setLocalAvatarEmoji(next);
            if(onSetAvatarEmoji) onSetAvatarEmoji(next);
            flashSaved(next ? "Emoji set" : "Emoji removed");
           }} style={{width:"38px",height:"38px",borderRadius:"8px",fontSize:"1.4rem",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.1s",
            border:`2px solid ${isActive?"var(--accent)":"var(--border-1)"}`,
            background:isActive?"rgba(29,201,232,0.1)":"var(--bg-2)",
            transform:isActive?"scale(1.12)":"scale(1)"}}>
            {em}
           </button>
          );
         })}
        </div>
        <div style={{fontSize:"0.72rem",color:"var(--text-dim)",marginTop:"8px"}}>Tap again to remove. Pick a background color below.</div>
        {/* Inline color picker for emoji background */}
        <div style={{marginTop:"10px"}}>
         <div style={{fontSize:"0.72rem",fontWeight:"700",color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"6px"}}>Background Color</div>
         <div style={{display:"flex",gap:"7px",flexWrap:"wrap",alignItems:"center"}}>
          {["#1DC9E8","#7B6FD8","#E05577","#6DBF87","#E09C55","#C87EC8","#7EC8C8","#5DC1DB","#A8A8A8","#C8C87E"].map(col=>{
           const isActive = localAvatarColor===col;
           return (
            <button key={col} onClick={()=>{
             setLocalAvatarColor(col);
             if(onSetAvatarColor) onSetAvatarColor(col);
            }} style={{width:"26px",height:"26px",borderRadius:"50%",background:col,cursor:"pointer",flexShrink:0,transition:"all 0.1s",
             border:`3px solid ${isActive?"#FFF":"transparent"}`,
             outline:isActive?"2px solid var(--accent)":"none",
             transform:isActive?"scale(1.15)":"scale(1)"}}/>
           );
          })}
         </div>
        </div>
       </div>
      )}

      {/* Color: background color picker */}
      {avatarMode==="color"&&(
       <div>
        <div style={{fontSize:"0.72rem",fontWeight:"700",color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"8px"}}>Background Color</div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
         {[TA,"#5DC1DB","#7B6FD8","#E05577","#C8C87E","#7EC8C8","#C87EC8","#A8A8A8","#6DBF87","#E09C55"].map(col=>{
          const isActive = localAvatarColor===col;
          return (
           <button key={col} onClick={()=>{
            setLocalAvatarColor(col);
            if(onSetAvatarColor) onSetAvatarColor(col);
            flashSaved("Color updated");
           }} style={{width:"28px",height:"28px",borderRadius:"50%",background:col,cursor:"pointer",flexShrink:0,transition:"all 0.1s",
            border:`3px solid ${isActive?"#FFF":"transparent"}`,
            outline:isActive?"2px solid var(--accent)":"none",
            transform:isActive?"scale(1.15)":"scale(1)"}}/>
          );
         })}
        </div>
       </div>
      )}

      {/* Photo: file upload — overrides emoji + color */}
      {avatarMode==="photo"&&(
       <div>
        <div style={{fontSize:"0.72rem",fontWeight:"700",color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"8px"}}>Profile Photo</div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}} onChange={e=>{
         const file = e.target.files?.[0]; if(!file) return;
         if(file.size > 2*1024*1024){ flashSaved("File too large (max 2MB)"); return; }
         setAvatarUploading(true);
         const reader = new FileReader();
         reader.onload = async ev => {
          const dataUrl = ev.target.result;
          setLocalAvatarUrl(dataUrl);
          if(onSetAvatarUrl) await onSetAvatarUrl(dataUrl);
          setAvatarUploading(false);
          flashSaved("Photo saved");
          if(fileInputRef.current) fileInputRef.current.value = "";
         };
         reader.readAsDataURL(file);
        }}/>
        <button onClick={()=>fileInputRef.current?.click()}
         style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 16px",background:"var(--bg-2)",border:"1px dashed var(--border-2)",borderRadius:"10px",cursor:"pointer",fontFamily:F,width:"100%",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
         <span style={{fontSize:"1.4rem"}}>📷</span>
         <div>
          <div style={{fontSize:"0.85rem",fontWeight:"600",color:"var(--text-secondary)"}}>
           {avatarUploading?"Uploading…":localAvatarUrl?"Change photo":"Choose a photo"}
          </div>
          <div style={{fontSize:"0.72rem",color:"var(--text-dim)"}}>JPG or PNG, under 2MB</div>
         </div>
        </button>
        {localAvatarUrl&&(
         <button onClick={()=>{
          setLocalAvatarUrl(null); setAvatarMode("emoji");
          if(onSetAvatarUrl) onSetAvatarUrl(null);
          flashSaved("Photo removed");
         }} style={{marginTop:"8px",fontSize:"0.78rem",color:"#E05577",background:"none",border:"none",cursor:"pointer",fontFamily:F,padding:"2px 0"}}>
          Remove photo
         </button>
        )}
       </div>
      )}
     </div>

     {/* Name */}
     <div style={{...s.btBd,paddingTop:"16px"}}>
      <div style={fieldLabel}>Name</div>
      <div style={{display:"flex",gap:"8px",...s.mb4,flexWrap:"wrap"}}>
       <input style={{...s.nameInput,flex:"1 1 120px"}} placeholder="First" value={firstName} onChange={e=>setFirstName(e.target.value)}/>
       <input style={{...s.nameInput,flex:"1 1 120px"}} placeholder="Last" value={lastName} onChange={e=>setLastName(e.target.value)}/>
      </div>
      {firstName.trim().length === 1 && <div style={{fontSize:"0.82rem",color:"#F59E0B",marginBottom:"8px",display:"flex",alignItems:"center",gap:"6px"}}>⚠ That looks like just an initial — is your full name spelled correctly?</div>}
      {firstName.trim()&&!lastName.trim()&&<div style={{fontSize:"0.82rem",color:TA,...s.mb4}}>Add a last name so teammates can find you.</div>}
     </div>

     <button style={{...s.primaryBtn,opacity:nameChanged?1:0.4}} disabled={!nameChanged}
      onClick={()=>{if(nameChanged)onRename(fullName.trim());flashSaved("Profile saved");}}>
      Save Profile
     </button>

     {/* ── Industry — shown as read-only, change locked behind Danger Zone ── */}
     <div style={{...s.btBd,paddingTop:"20px",marginTop:"4px"}}>
      <div style={{...fieldLabel,marginBottom:"6px",fontSize:"0.9rem",color:TS,...s.fw6,textTransform:"uppercase",letterSpacing:"0.1em"}}>Industry</div>
      <div style={{display:"flex",alignItems:"center",gap:"10px",background:"var(--bg-2)",border:"1px solid var(--border-1)",borderRadius:"10px",padding:"10px 14px"}}>
       <span style={{fontSize:"1.3rem"}}>{DEFAULT_INDUSTRIES?.[user?.industry]?.icon || "◆"}</span>
       <span style={{fontSize:"0.88rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F}}>{DEFAULT_INDUSTRIES?.[user?.industry]?.label || user?.industry || "Not set"}</span>
      </div>
     </div>

     {/* Multi-step industry change confirmation modal */}
     {industryWarnStep >= 0 && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
       <div style={{background:"var(--bg-1)",border:"1px solid rgba(244,63,94,0.2)",borderRadius:"18px",padding:"26px 22px",maxWidth:"360px",width:"100%",boxShadow:"0 24px 60px rgba(0,0,0,0.5)"}}>
        {industryWarnStep === 0 && (<>
         <div style={{fontSize:"0.62rem",fontWeight:"800",color:"rgba(244,63,94,0.7)",textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:F,marginBottom:"10px"}}>Select new industry</div>
         <div style={{fontSize:"0.82rem",fontWeight:"700",color:"var(--text-muted)",fontFamily:F,marginBottom:"14px"}}>Currently: <span style={{color:"var(--text-primary)"}}>{DEFAULT_INDUSTRIES?.[user?.industry]?.label || user?.industry}</span></div>
         <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"14px"}}>
          {Object.entries(DEFAULT_INDUSTRIES).filter(([key])=>key!==user?.industry).map(([key,ind])=>(
           <button key={key} onClick={()=>{setIndustry(key);setIndustryWarnStep(1);}}
            style={{background:industry===key?"rgba(29,201,232,0.1)":"var(--bg-2)",border:`1px solid ${industry===key?"rgba(29,201,232,0.35)":"var(--border-1)"}`,borderRadius:"8px",padding:"9px 10px",cursor:"pointer",textAlign:"left",fontFamily:F}}>
            <div style={{fontSize:"0.75rem",fontWeight:"700",color:industry===key?"var(--accent)":"var(--text-primary)"}}>{ind.label}</div>
           </button>
          ))}
         </div>
         <button style={{width:"100%",background:"none",border:"none",color:"var(--text-dim)",cursor:"pointer",fontFamily:F,fontSize:"0.82rem",padding:"4px"}} onClick={()=>setIndustryWarnStep(-1)}>Cancel</button>
        </>)}
        {industryWarnStep === 1 && (<>
         <div style={{fontSize:"0.62rem",fontWeight:"800",color:"rgba(244,63,94,0.7)",textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:F,marginBottom:"10px"}}>Changing industry</div>
         <div style={{fontSize:"1rem",fontWeight:"800",color:"var(--text-primary)",fontFamily:F,marginBottom:"8px"}}>Why are you switching?</div>
         <div style={{fontSize:"0.78rem",color:"var(--text-muted)",lineHeight:1.6,marginBottom:"16px"}}>Helps us make sure this is intentional.</div>
         <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"14px"}}>
          {["Changed jobs / career pivot","Moving to a different vertical","Made a mistake, correcting it","Testing the app"].map(reason => (
           <button key={reason} onClick={()=>setIndustryWarnStep(2)}
            style={{background:"var(--bg-2)",border:"1px solid var(--border-1)",borderRadius:"10px",padding:"11px 14px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:F,fontWeight:"600",fontSize:"0.85rem",textAlign:"left"}}>
            {reason}
           </button>
          ))}
         </div>
         <button style={{width:"100%",background:"none",border:"none",color:"var(--text-dim)",cursor:"pointer",fontFamily:F,fontSize:"0.82rem",padding:"4px"}} onClick={()=>setIndustryWarnStep(-1)}>Cancel</button>
        </>)}
        {industryWarnStep === 2 && (<>
         <div style={{fontSize:"0.62rem",fontWeight:"800",color:"rgba(244,63,94,0.7)",textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:F,marginBottom:"10px"}}>What changes</div>
         <div style={{fontSize:"1rem",fontWeight:"800",color:"var(--text-primary)",fontFamily:F,marginBottom:"10px"}}>Review carefully</div>
         <div style={{background:"rgba(224,85,119,0.07)",border:"1px solid rgba(224,85,119,0.2)",borderRadius:"10px",padding:"12px 14px",marginBottom:"10px"}}>
          <div style={{fontSize:"0.78rem",fontWeight:"800",color:"#E05577",marginBottom:"4px"}}>❌ You'll lose</div>
          <div style={{fontSize:"0.74rem",color:"var(--text-muted)",lineHeight:1.5}}>Workspace membership + workspace leads and pipeline in your current industry.</div>
         </div>
         <div style={{background:"rgba(74,207,134,0.07)",border:"1px solid rgba(74,207,134,0.2)",borderRadius:"10px",padding:"12px 14px",marginBottom:"16px"}}>
          <div style={{fontSize:"0.78rem",fontWeight:"800",color:"#4ACF86",marginBottom:"4px"}}>✓ You'll keep</div>
          <div style={{fontSize:"0.74rem",color:"var(--text-muted)",lineHeight:1.5}}>Streak, all stats, journal entries, crew memberships, social history. Everything personal stays.</div>
         </div>
         <div style={{display:"flex",gap:"8px"}}>
          <button style={{flex:1,background:"none",border:"1px solid var(--border-1)",borderRadius:"10px",padding:"11px",color:"var(--text-muted)",cursor:"pointer",fontFamily:F,fontWeight:"600",fontSize:"0.85rem"}} onClick={()=>setIndustryWarnStep(-1)}>Cancel</button>
          <button style={{flex:1,background:"rgba(244,63,94,0.1)",border:"1px solid rgba(244,63,94,0.3)",borderRadius:"10px",padding:"11px",color:"#F43F5E",fontWeight:"800",cursor:"pointer",fontFamily:F,fontSize:"0.85rem"}} onClick={()=>setIndustryWarnStep(3)}>I understand, continue →</button>
         </div>
        </>)}
        {industryWarnStep === 3 && (<>
         <div style={{fontSize:"0.62rem",fontWeight:"800",color:"rgba(244,63,94,0.7)",textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:F,marginBottom:"10px"}}>Final confirmation</div>
         <div style={{fontSize:"1rem",fontWeight:"800",color:"var(--text-primary)",fontFamily:F,marginBottom:"8px"}}>This cannot be undone.</div>
         <div style={{fontSize:"0.82rem",color:"var(--text-muted)",lineHeight:1.6,marginBottom:"14px"}}>
          Switch from <strong style={{color:"var(--text-secondary)"}}>{DEFAULT_INDUSTRIES?.[user?.industry]?.label||user?.industry}</strong> to <strong style={{color:"#F59E0B"}}>{DEFAULT_INDUSTRIES?.[industry]?.label||industry}</strong>? Permanent, cannot be undone.
         </div>
         <div style={{display:"flex",gap:"8px"}}>
          <button style={{flex:1,background:"none",border:"1px solid var(--border-1)",borderRadius:"10px",padding:"12px",color:"var(--text-muted)",cursor:"pointer",fontFamily:F,fontWeight:"600",fontSize:"0.85rem"}} onClick={()=>setIndustryWarnStep(-1)}>No, cancel</button>
          <button style={{flex:2,background:"#E05577",color:"#fff",border:"none",borderRadius:"10px",padding:"12px",fontWeight:"800",cursor:"pointer",fontFamily:F,fontSize:"0.88rem"}} onClick={()=>{onChangeIndustry&&onChangeIndustry(industry);setIndustryWarnStep(-1);flashSaved("Industry updated");}}>Yes — change it</button>
         </div>
        </>)}
       </div>
      </div>
     )}

      {/* ── Appearance + Sign Out ── */}
     <div style={{...s.btBd,paddingTop:"20px",marginTop:"4px"}}>
      <div style={{...fieldLabel,marginBottom:"14px",fontSize:"0.9rem",color:TS,...s.fw6,textTransform:"uppercase",letterSpacing:"0.1em"}}>Appearance</div>
      <div style={{...s.fsb,padding:"14px 16px",background:BG1,...s.bd1,borderRadius:"12px",boxShadow:"var(--shadow-card)",marginBottom:"10px"}}>
       <div>
        <div style={{fontSize:"0.95rem",color:TP,fontWeight:"500",marginBottom:"2px"}}>{darkMode?"Dark Mode":"Light Mode"}</div>
        <div style={s.mut95}>{darkMode?"Classic dark — easier on the eyes":"Bright — great for well-lit environments"}</div>
       </div>
       <button onClick={()=>{ haptic.light(); onToggleDarkMode(); }} style={{
        width:"52px",height:"28px",borderRadius:"14px",border:"none",...s.cp,padding:"2px",
        background:"var(--border-2)",flexShrink:0,...s.fac,justifyContent:darkMode?"flex-end":"flex-start",
       }}>
        <div style={{width:"24px",height:"24px",borderRadius:"50%",background:darkMode?TA:"#FFF",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",...s.fcc,fontSize:"0.95rem"}}>
         {darkMode?"🌙":"☀️"}
        </div>
       </button>
      </div>

     </div>

     {/* ── Time Off (PTO & Sick Days) ── */}
     <PTOManager user={user} />

     {/* ── Change Industry — Danger Zone ── */}
     <div style={{marginTop:"32px",paddingTop:"20px",borderTop:"1px solid rgba(244,63,94,0.15)"}}>
      <div style={{fontSize:"0.68rem",fontWeight:"800",color:"rgba(244,63,94,0.6)",textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:F,marginBottom:"8px"}}>Account Changes</div>
      <div style={{background:"rgba(244,63,94,0.04)",border:"1px solid rgba(244,63,94,0.15)",borderRadius:"12px",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
       <div>
        <div style={{fontSize:"0.82rem",fontWeight:"700",color:"var(--text-muted)",fontFamily:F,marginBottom:"2px"}}>Change Industry</div>
        <div style={{fontSize:"0.72rem",color:"var(--text-dim)",fontFamily:F,lineHeight:1.4}}>Destructive. Removes you from your current workspace and its leads.</div>
       </div>
       <button onClick={()=>setIndustryWarnStep(0)}
        style={{background:"rgba(244,63,94,0.08)",border:"1px solid rgba(244,63,94,0.25)",borderRadius:"8px",padding:"8px 14px",color:"#F43F5E",fontWeight:"700",fontSize:"0.75rem",cursor:"pointer",fontFamily:F,flexShrink:0,whiteSpace:"nowrap"}}>
        Change →
       </button>
      </div>
     </div>

    </div>}

    {/* ──────────────── MY GOALS ──────────────── */}
    {tab==="goals"&&<MyGoalsTab metrics={metrics} goals={goals} setGoals={setGoals} onSaveGoals={onSaveGoals} flashSaved={flashSaved} TA={TA} F={F} s={s} BG1={BG1} BG2={BG2} BG3={BG3} BB1={BB1} TS={TS} TD={TD} />}

    {/* ──────────────── ORGANIZATION ──────────────── */}
    {tab==="org"&&<div style={{maxWidth:"min(620px,100%)"}}>
     <div style={s.x1}>Organization</div>
     {!isSolo ? (
      <div>
       {isSuperAdmin&&(orgPendingRequests||[]).length>0&&(
        <div style={{marginBottom:"20px"}}>
         <div style={sectionLabel}>Pending Requests ({orgPendingRequests.length})</div>
         {orgPendingRequests.map(req=>(
          <div key={req.requestId||req.userId} style={sPendingRow}>
           <div style={s.f1}>
            <div style={s.x14}>{req.userName}</div>
            <div style={s.mut8}>{req.userIndustry} · {new Date(req.requestedAt).toLocaleDateString()}</div>
           </div>
           <button style={{background:BP,border:BB1A3A,color:"#5DC1DB",...s.btn8,...s.Fc}} onClick={()=>onApproveOrgRequest(req)}>Approve</button>
           <button style={s.x4} onClick={()=>onRejectOrgRequest(req.userId)}>Decline</button>
          </div>
         ))}
        </div>
       )}
       {isSuperAdmin&&(
        <div style={{marginBottom:"20px"}}>
         <div style={{...s.fsb,marginBottom:"8px"}}>
          <div style={sectionLabel}>Invite Links</div>
          <button style={{background:BG0,border:BBA,color:TA,padding:"4px 12px",borderRadius:"6px",fontSize:"0.8rem",...s.Fc}} onClick={genOrgInvite}>+ Generate</button>
         </div>
         {orgInvites.map(inv=>(
          <div key={inv.token} style={{...s.fac,gap:"8px",padding:"7px 10px",...s.bgBd8,borderRadius:"6px",...s.mb4}}>
           <div style={{flex:1,fontSize:"0.8rem",color:TM,fontFamily:"monospace",...s.oh,...s.toe,...s.wsn}}>{getInviteURL(inv.token)}</div>
           <span style={s.x8}>{inv.uses||0}×</span>
           <button style={{background:orgInviteCopied===inv.token?BP:BG0,border:"1px solid #1A2A1A",color:orgInviteCopied===inv.token?"#5DC1DB":TM,padding:"3px 9px",borderRadius:"6px",fontSize:"0.9rem",...s.Fc,flexShrink:0}}
            onClick={async()=>{const url=getInviteURL(inv.token);if(isMob&&navigator.share){try{await navigator.share({title:`${orgMeta.name} — you're invited`,text:`Join ${orgMeta?.name||"our team"} on Cadence`,url});setOrgInviteCopied(inv.token);setTimeout(()=>setOrgInviteCopied(null),2500);return;}catch{}}try{navigator.clipboard.writeText(url);}catch{copyText(url);}setOrgInviteCopied(inv.token);setTimeout(()=>setOrgInviteCopied(null),2500);}}>
            {orgInviteCopied===inv.token?"✓":isMob&&navigator.share?"💬":"Copy"}
           </button>
           <button style={{background:"none",border:BB2A10,color:"#E05577",padding:"3px 7px",borderRadius:"6px",fontSize:"0.9rem",...s.Fc,flexShrink:0}} onClick={async()=>{await revokeInvite(orgId,inv.token);const all=await loadSpaceInvites(orgId);setOrgInvites(all);}}>✕</button>
          </div>
         ))}
         {orgInvites.length===0&&<div style={s.xdim95i}>No active invite links.</div>}
        </div>
       )}
       {isSuperAdmin&&(
        <div>
         <div style={sectionLabel}>Teams</div>
         <p style={{...s.mHint,...s.mb12}}>Assign non-admin members to admin-led teams for grouped leaderboard views.</p>
         {allUsers.filter(u=>admins.includes(u.id)&&u.id!==user.id||u.id===user.id).map(leader=>{
          const members=allUsers.filter(u=>teams[u.id]===leader.id);
          const eligible=allUsers.filter(u=>!admins.includes(u.id)&&u.industry===leader.industry&&(!teams[u.id]||teams[u.id]===leader.id));
          if(!admins.includes(leader.id)) return null;
          return (
           <div key={leader.id} style={{...sCard,marginBottom:"8px"}}>
            <div style={{fontSize:"0.9rem",color:TA,marginBottom:"8px"}}>👑 {leader.name}'s Team</div>
            {members.length===0&&<div style={{fontSize:"0.95rem",color:TX,fontStyle:"italic",marginBottom:"8px"}}>No members yet.</div>}
            {members.map(m=>(
             <div key={m.id} style={{...s.fac,gap:"8px",padding:"5px 8px",background:BR,borderRadius:"6px",marginBottom:"3px"}}>
              <span style={{flex:1,fontSize:"0.95rem",color:TS}}>{m.name}</span>
              <button style={{...s.smallTab,fontSize:"0.9rem",padding:"2px 8px",color:"#E05577",borderColor:BD1}} onClick={()=>onAssignTeam(m.id,null)}>Remove</button>
             </div>
            ))}
            {eligible.filter(u=>!teams[u.id]).length>0&&(
             <div style={s.mt8}>
              <div style={{fontSize:"0.9rem",color:TD,...s.mb4,letterSpacing:"0.06em"}}>Add to this team:</div>
              <div style={{display:"flex",flexWrap:"wrap",...s.g4}}>
               {eligible.filter(u=>!teams[u.id]).map(u=>(
                <button key={u.id} style={{...s.smallTab,fontSize:"0.8rem",padding:"3px 9px"}} onClick={()=>onAssignTeam(u.id,leader.id)}>{u.name}</button>
               ))}
              </div>
             </div>
            )}
           </div>
          );
         })}
        </div>
       )}
      </div>
     ) : (
      <div>
       <p style={{fontSize:"0.9rem",color:TM,...s.mb16}}>You're using Cadence individually. Join an organization to share a leaderboard with your team.</p>
       {!showJoinOrgForm?(
        <button style={{background:BG0,border:BBA,color:TA,padding:"9px 14px",...s.br8,fontSize:"0.95rem",...s.Fc}} onClick={()=>setShowJoinOrgForm(true)}>Join via Invite Link →</button>
       ):(
        <div style={{maxWidth:"min(400px,100%)",...s.fdc,gap:"8px"}}>
         <input style={{...sInput,borderColor:joinOrgErr?"#3A1A1A":joinOrgInfo?BD1:"var(--bg-4)"}} placeholder="Paste org invite link or code..." value={joinOrgToken} autoFocus onChange={e=>setJoinOrgToken(e.target.value)}/>
         {joinOrgErr&&<div style={s.red95}>{joinOrgErr}</div>}
         {joinOrgInfo&&<div style={s.grn95}>✓ Found: {joinOrgInfo.spaceName}</div>}
         <div style={s.fg8}>
          <button style={{flex:1,background:joinOrgInfo&&!joiningOrg?TA:BG0,color:joinOrgInfo&&!joiningOrg?BR:TM,border:"none",padding:"10px",...s.br8,fontSize:"0.9rem",fontFamily:F,fontWeight:"bold",cursor:joinOrgInfo&&!joiningOrg?"pointer":"default"}} disabled={!joinOrgInfo||joiningOrg} onClick={handleJoinOrg}>{joiningOrg?"Joining...":"Join Organization →"}</button>
          <button style={s.secondaryBtn} onClick={()=>{setShowJoinOrgForm(false);setJoinOrgToken("");setJoinOrgInfo(null);setJoinOrgErr("");}}>Cancel</button>
         </div>
        </div>
       )}
      </div>
     )}
     {isAdmin && !isSolo && (
      <div style={{marginTop:"24px",paddingTop:"20px",borderTop:"1px solid var(--border-1)"}}>
       <div style={{fontSize:"0.7rem",fontWeight:"800",color:TD,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:"12px"}}>Admin Tools</div>
       <div style={{background:"rgba(29,201,232,0.05)",border:"1px solid rgba(29,201,232,0.2)",borderRadius:"12px",padding:"16px 20px",display:"flex",alignItems:"flex-start",gap:"14px"}}>
        <div style={{fontSize:"1.3rem",flexShrink:0}}>⚙️</div>
        <div style={{flex:1,minWidth:0}}>
         <div style={{fontSize:"0.92rem",fontWeight:"700",color:TP,marginBottom:"4px"}}>Admin Settings & Roles</div>
         <div style={{fontSize:"0.8rem",color:TM,lineHeight:1.6,marginBottom:"12px"}}>
          Manage roles, teams, member assignments, metrics, and admin access from the My Org section.
         </div>
         <button onClick={() => { window.dispatchEvent(new CustomEvent("cadence:go-admin-tab")); }}
          style={{background:"var(--accent)",color:"#000",border:"none",padding:"8px 16px",borderRadius:"8px",fontSize:"0.82rem",fontWeight:"700",cursor:"pointer",fontFamily:F}}>
          Go to Admin Panel →
         </button>
        </div>
       </div>
      </div>
     )}
    </div>}

    {/* ──────────────── COMMUNITIES ──────────────── */}
    {tab==="crews"&&<div style={{maxWidth:"min(680px,100%)"}}>
     <div style={s.x1}>Crews</div>
     <p style={{fontSize:"0.95rem",color:TM,lineHeight:1.5,...s.mb16}}>Open cross-industry groups. Your activity data stays private — only totals show on the community leaderboard.</p>

     {/* Community list */}
     {communities.length===0&&!showCreateCom&&<div style={{fontSize:"0.9rem",color:TD,fontStyle:"italic",...s.mb16}}>You're not in any communities yet.</div>}

     {communities.map(cm=>{
      const members=(communityMembers[cm.id]||[]);
      const pending=(communityPendingRequests[cm.id]||[]);
      const myMember=members.find(m=>m.userId===user.id);
      const myComInd=myMember?.communityIndustry||user.industry;
      const isSelected=selectedComId===cm.id;
      const isCreator=cm.createdBy===user.id;

      return (
       <div key={cm.id} style={{background:BG0,border:`1px solid ${isSelected?"#2A2A3A":"var(--bg-4)"}`,...s.br8,marginBottom:"8px",...s.oh}}>
        {/* Community row header */}
        <div style={{...s.fac,gap:"10px",padding:"12px 14px",...s.cp}} onClick={()=>setSelectedComId(isSelected?null:cm.id)}>
         <div style={{width:"36px",height:"36px",borderRadius:"50%",background:BDIR,border:BB1A30,...s.fcc,fontSize:"1rem",flexShrink:0}}>🌐</div>
         <div style={s.f1}>
          <div style={{fontSize:"0.95rem",color:"#C0B8C8",fontFamily:F}}>{cm.name}</div>
          <div style={{fontSize:"0.8rem",color:TD,marginTop:"2px"}}>{members.length} member{members.length!==1?"s":""}{pending.length>0&&<span style={{color:TA,marginLeft:"8px"}}>· {pending.length} pending</span>}</div>
         </div>
         <span style={s.dim8}>{isSelected?"▲":"▾"}</span>
        </div>

        {isSelected&&(
         <div style={{...s.btBd,padding:"14px",...s.fdc,...s.g16}}>

          {/* Edit name/desc/pin */}
          {(isCreator||isSuperAdmin)&&(
           <div>
            <div style={sectionLabel}>Community Settings</div>
            {comEditMode&&selectedComId===cm.id?(
             <div style={{...s.fdc,gap:"8px",maxWidth:"min(400px,100%)"}}>
              <input style={sInput} value={comNameEdit} onChange={e=>setComNameEdit(e.target.value)} placeholder="Crew name"/>
              <input style={sInput} value={comDescEdit} onChange={e=>setComDescEdit(e.target.value)} placeholder="Description (optional)"/>
              <input style={sInput} value={comPinEdit} onChange={e=>setComPinEdit(e.target.value)} placeholder="Password for instant join (blank = approval-only)"/>
              <div style={s.dim8}>{comPinEdit.trim()?"🔑 Anyone with the password can join instantly":"🔒 No password — approval required"}</div>
              <div style={s.fg8}>
               <button style={s.primaryBtn} onClick={async()=>{await onUpdateCommunityMeta(cm.id,{name:comNameEdit.trim()||cm.name,description:comDescEdit.trim(),joinPin:comPinEdit.trim()});flashSaved("Community updated");setComEditMode(false);}}>Save</button>
               <button style={s.secondaryBtn} onClick={()=>setComEditMode(false)}>Cancel</button>
              </div>
             </div>
            ):(
             <div style={{...s.fac,...s.g12}}>
              <div style={{flex:1}}>
               {cm.description&&<div style={{fontSize:"0.95rem",color:TM,...s.mb4}}>{cm.description}</div>}
               <div style={s.dim8}>{cm.joinPin?"🔑 Password join enabled":"🔒 Approval required to join"}</div>
              </div>
              <button style={{...s.smallTab,fontSize:"0.9rem",padding:"3px 10px"}} onClick={()=>{setComEditMode(true);setComNameEdit(cm.name);setComDescEdit(cm.description||"");setComPinEdit(cm.joinPin||"");}}>Edit</button>
             </div>
            )}
           </div>
          )}

          {/* My industry in this community */}
          <div>
           <div style={sectionLabel}>My Industry in This Community</div>
           <div style={s.x12}>
            {Object.entries(industryConfigs||{}).map(([key,cfg])=>(
             <button key={key} style={{background:myComInd===key?BG2:"none",border:`1px solid ${myComInd===key?"var(--border-2)":"var(--bg-4)"}`,color:myComInd===key?TA:TM,...s.btn8s,...s.Fc}}
              onClick={()=>{onChangeCommunityIndustry(cm.id,key);flashSaved("Community industry updated");}}>
              {cfg.icon} {cfg.label}
             </button>
            ))}
           </div>
          </div>

          {/* Members */}
          <div>
           <div style={sectionLabel}>Members ({members.length})</div>
           <div style={{...s.fdc,gap:"3px",maxHeight:"min(300px,50vh)",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            {members.map(m=>{
             const isSelf=m.userId===user.id;
             const isCmAdmin=(communityAdmins[cm.id]||[]).includes(m.userId);
             const canManage=(isCreator||isSuperAdmin||isCmAdmin)&&!isSelf;
             return (
              <div key={m.userId} style={{...s.fac,gap:"8px",padding:"8px 10px",background:BR,borderRadius:"6px"}}>
               <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:"30px",height:"30px",borderRadius:"50%",background:m.avatarColor||"var(--bg-4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",fontWeight:"bold",color:"#fff"}}>
                 {(m.name||"?").charAt(0).toUpperCase()}
                </div>
                <PresenceDot uid={m.userId} style={{position:"absolute",bottom:"-1px",right:"-1px"}} />
               </div>
               <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"0.9rem",color:isSelf?TA:TS,...s.fac,gap:"5px",flexWrap:"wrap"}}>
                 {m.name}
                 {isSelf&&<span style={{fontSize:"0.75rem",color:TM}}>(you)</span>}
                 {isCmAdmin&&<span style={{fontSize:"0.68rem",color:TA,background:"var(--accent-dim)",border:"1px solid var(--btn-plus-border)",borderRadius:"4px",padding:"0 5px",...s.fw6}}>ADMIN</span>}
                 {isCreator&&m.userId===cm.createdBy&&<span style={{fontSize:"0.68rem",color:"#7B6FD8",background:"rgba(123,111,216,0.12)",border:"1px solid rgba(123,111,216,0.3)",borderRadius:"4px",padding:"0 5px",...s.fw6}}>OWNER</span>}
                </div>
                <div style={s.dim8}>{(industryConfigs?.[m.communityIndustry]||DEFAULT_INDUSTRIES[m.communityIndustry]||{icon:"◆"}).icon}</div>
               </div>
               <div style={{...s.fac,gap:"4px",flexShrink:0}}>
                {!isSelf&&onOpenDm&&(
                 <button
                  onClick={()=>onOpenDm({id:m.userId,name:m.name,avatarColor:m.avatarColor,industry:m.communityIndustry})}
                  style={{...s.smallTab,fontSize:"0.78rem",padding:"2px 8px",color:"#5DC1DB",borderColor:BP,minHeight:"26px"}}>💬</button>
                )}
                {(isCreator||isSuperAdmin)&&!isSelf&&(
                 <>
                  <button
                   style={{...s.smallTab,fontSize:"0.75rem",padding:"2px 8px",color:isCmAdmin?"#E05577":"#5DC1DB",borderColor:isCmAdmin?BD1:BP,minHeight:"26px"}}
                   onClick={async()=>{
                    const cur=communityAdmins[cm.id]||[];
                    const next=isCmAdmin?cur.filter(id=>id!==m.userId):[...cur,m.userId];
                    setCommunityAdmins(p=>({...p,[cm.id]:next}));
                    if(onSaveCommunityAdmins) await onSaveCommunityAdmins(cm.id,next);
                    flashSaved(isCmAdmin?"Admin revoked":"Admin granted ✓");
                   }}
                  >
                   {isCmAdmin?"Revoke":"Admin"}
                  </button>
                  <button style={{...s.smallTab,fontSize:"0.8rem",padding:"2px 6px",color:"#E05577",borderColor:BD1,minHeight:"26px"}} onClick={async()=>{await onKickCommunityMember(cm.id,m.userId);flashSaved("Member removed");}}>✕</button>
                 </>
                )}
               </div>
              </div>
             );
            })}
           </div>
          </div>

          {/* Pending requests */}
          {pending.length>0&&(
           <div>
            <div style={sectionLabel}>Pending Requests ({pending.length})</div>
            {pending.map(req=>(
             <div key={req.requestId||req.userId} style={{...sPendingRow,background:BG0,border:"1px solid #1A1A2A"}}>
              <div style={s.f1}>
               <div style={{fontSize:"0.9rem",color:"#C0B8C8"}}>{req.userName}</div>
               <div style={s.mut8}>{req.userIndustry} · {new Date(req.requestedAt).toLocaleDateString()}</div>
              </div>
              <button style={{background:BG0,border:"1px solid #1A1A3A",color:"#7B6FD8",...s.btn8,...s.Fc}} onClick={()=>onApproveCommunityRequest(cm.id,req)}>Approve</button>
              <button style={s.x4} onClick={()=>onRejectCommunityRequest(cm.id,req.userId)}>Decline</button>
             </div>
            ))}
           </div>
          )}

          {/* Invite + Leave */}
          <div style={{display:"flex",gap:"8px",paddingTop:"8px",...s.btBd}}>
           <CommunityInviteButton communityId={cm.id} communityName={cm.name} userName={user.name}/>
           <button style={{background:"none",border:BB2A10,color:"#E05577",...s.btn9,...s.Fc}} onClick={()=>{onLeaveCommunity(cm.id);setSelectedComId(null);}}>Leave</button>
          </div>

         </div>
        )}
       </div>
      );
     })}

     {/* Create / Join */}
     <div style={{display:"flex",gap:"8px",flexWrap:"wrap",...s.mt8,marginBottom:"8px"}}>
      <button style={{background:BDIR,border:BB1A30,color:"#7B6FD8",padding:"9px 14px",...s.br8,fontSize:"0.95rem",...s.Fc}} onClick={()=>{setShowCreateCom(p=>!p);setShowJoinCom(false);}}>{showCreateCom?"Cancel":"+ Create Crew"}</button>
      <button style={{background:BG0,border:"1px solid #1A2A1A",color:"#5DC1DB",padding:"9px 14px",...s.br8,fontSize:"0.95rem",...s.Fc}} onClick={()=>{setShowJoinCom(p=>!p);setShowCreateCom(false);}}>{showJoinCom?"Cancel":"Join via Invite →"}</button>
     </div>

     {showCreateCom&&(
      <div style={{...sCard,borderColor:BDIR}}>
       <div style={{fontSize:"0.8rem",color:"#7B6FD8",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"10px"}}>New Community</div>
       <div style={s.fdc8}>
        <input style={sInput} placeholder="Name (e.g. Knoxville Closers, The Grind...)" value={newComName} autoFocus onChange={e=>setNewComName(e.target.value)}/>
        <input style={sInput} placeholder="Description (optional)" value={newComDesc} onChange={e=>setNewComDesc(e.target.value)}/>
        <input style={sInput} placeholder="Password for instant join (optional)" value={newComPin} onChange={e=>setNewComPin(e.target.value)}/>
        <div style={s.dim8}>{newComPin.trim()?"🔑 Anyone with the password can join instantly":"🔒 No password — approval required"}</div>
        <button style={{background:"#7B6FD8",color:BR,border:"none",padding:"10px",...s.br8,fontSize:"0.9rem",fontFamily:F,fontWeight:"bold",...s.cp,opacity:newComName.trim()&&!creatingCom?1:0.4}} disabled={!newComName.trim()||creatingCom} onClick={handleCreateCommunity}>{creatingCom?"Creating...":"Create Crew →"}</button>
       </div>
      </div>
     )}

     {createdComToken&&(
      <div style={{...sCard,background:BG0,borderColor:BDIR,marginTop:"4px"}}>
       <div style={{fontSize:"0.95rem",color:"#7B6FD8",marginBottom:"6px"}}>✓ Community created! Share this invite link:</div>
       <div style={s.x15}>
        <div style={{flex:1,fontSize:"0.8rem",color:TM,fontFamily:"monospace",...s.oh,...s.toe,...s.wsn}}>{getInviteURL(createdComToken)}</div>
        <button style={{background:BDIR,border:BB1A30,color:"#7B6FD8",...s.btn9,...s.Fc}}
         onClick={async()=>{const url=getInviteURL(createdComToken);if(isMob&&navigator.share){try{await navigator.share({title:"You're Invited — Cadence",text:"Join me on Cadence — where driven people track daily, compete, and hold each other accountable.",url});return;}catch{}}try{navigator.clipboard.writeText(url);}catch{copyText(url);}flashSaved("Link copied!");}}>
         {isMob&&navigator.share?"💬 Share":"Copy"}
        </button>
       </div>
       <button style={{background:"none",border:"none",color:TX,...s.cp,fontSize:"0.8rem",marginTop:"6px"}} onClick={()=>setCreatedComToken(null)}>Dismiss</button>
      </div>
     )}

     {showJoinCom&&(
      <div style={{...sCard,borderColor:"#1A2A1A",marginTop:"4px"}}>
       <div style={{...s.grn8,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"10px"}}>Join via Invite Link</div>
       <div style={s.fdc8}>
        <input style={{...sInput,borderColor:joinComErr?"#3A1A1A":joinComInfo?BD1:"var(--bg-4)"}} placeholder="Paste Crew invite link or code..." value={joinComToken} autoFocus onChange={e=>setJoinComToken(e.target.value)}/>
        {joinComErr&&<div style={s.red95}>{joinComErr}</div>}
        {joinComInfo&&<div style={s.grn95}>✓ Found: {joinComInfo.spaceName}</div>}
        <button style={{background:BG1,border:BB1A3A,color:"#5DC1DB",padding:"10px",...s.br8,fontSize:"0.9rem",fontFamily:F,fontWeight:"bold",...s.cp,opacity:joinComInfo&&!joiningCom?1:0.4}} disabled={!joinComInfo||joiningCom} onClick={handleJoinCommunity}>{joiningCom?"Joining...":"Join Community →"}</button>
       </div>
      </div>
     )}

     {/* Search for spaces to join */}
     <div style={{marginTop:"20px",paddingTop:"20px",...s.btBd}}>
      <div style={sectionLabel}>Discover Spaces</div>
      <div style={{display:"flex",gap:"6px",marginBottom:"8px",flexWrap:"wrap"}}>
       {[["all","All"],["org","Orgs"],["community","Crews"]].map(([t,label])=>(
        <button key={t} style={{background:searchType===t?BG2:"none",border:`1px solid ${searchType===t?"var(--border-2)":"var(--bg-4)"}`,color:searchType===t?TA:TM,...s.btn8s,...s.Fc}} onClick={()=>setSearchType(t)}>{label}</button>
       ))}
      </div>
      <input style={s.x11} placeholder="Search by name..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
      {searchQuery.trim()&&(spaceSearchResults||[]).filter(r=>searchType==="all"||r.type===searchType).length===0&&<div style={{fontSize:"0.9rem",color:TD,fontStyle:"italic"}}>No results for "{searchQuery}"</div>}
      {(spaceSearchResults||[]).filter(r=>searchType==="all"||r.type===searchType).map(space=>{
       const alreadyIn=(space.type==="org"&&!isSolo)||(space.type==="community"&&communities.some(c=>c.id===space.id));
       const isSelected=selectedResult?.id===space.id;
       return (
        <div key={space.id} style={{...sCard,...s.cp}} onClick={()=>setSelectedResult(isSelected?null:space)}>
         <div style={{...s.fac,gap:"10px"}}>
          <span style={{fontSize:"1.06rem"}}>{space.type==="org"?"🏢":"🌐"}</span>
          <div style={s.f1}>
           <div style={s.pri95F}>{space.name}</div>
           {space.description&&<div style={s.mut95mt2}>{space.description}</div>}
          </div>
          <span style={{fontSize:"0.9rem",color:space.type==="org"?TA:"#7B6FD8",background:BG0,border:`1px solid ${space.type==="org"?"rgba(35,205,237,0.2)":"#7E8EC833"}`,...s.br10,padding:"2px 8px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{space.type}</span>
          {alreadyIn&&<span style={s.x7}>✓</span>}
         </div>
         {isSelected&&!alreadyIn&&(
          <div style={s.divTop} onClick={e=>e.stopPropagation()}>
           {space.type==="org"?(
            <div>
             <div style={{fontSize:"0.95rem",color:TS,marginBottom:"10px"}}>Organizations require admin approval to join.</div>
             {requestSent[space.id]?<div style={s.grn9}>✓ Request sent.</div>
              :<button style={{background:BG0,border:"1px solid #23CDED55",color:TA,padding:"9px 16px",...s.br8,fontSize:"0.9rem",...s.Fc}} onClick={()=>handleRequestJoin(space)}>Request to Join →</button>}
            </div>
           ):(
            <div style={s.fdc8}>
             <div style={s.sec95}>Enter the community password for instant access, or request approval.</div>
             <div style={s.fg6}>
              <input style={{...sInput,flex:1,borderColor:joinPinErr?"#3A1A1A":"var(--bg-4)"}} placeholder="Crew password..." type="password" value={joinPinInput} onChange={e=>{setJoinPinInput(e.target.value);setJoinPinErr("");}}/>
              <button style={{background:BG1,border:BB1A3A,color:"#5DC1DB",...s.p1014,...s.br8,fontSize:"0.95rem",...s.Fc,flexShrink:0}} onClick={()=>handleJoinByPin(space.id)}>Enter</button>
             </div>
             {joinPinErr&&<div style={s.red95}>{joinPinErr}</div>}
             <div style={{textAlign:"center",fontSize:"0.8rem",color:TX}}>— or —</div>
             {requestSent[space.id]?<div style={s.grn9}>✓ Request sent.</div>
              :<button style={{background:BG0,border:"1px solid #7E8EC855",color:"#7B6FD8",padding:"9px 16px",...s.br8,fontSize:"0.9rem",...s.Fc}} onClick={()=>handleRequestJoin(space)}>Request to Join →</button>}
            </div>
           )}
          </div>
         )}
        </div>
       );
      })}
     </div>
    </div>}



    {/* ──────────────── MANAGE MEMBERS ──────────────── */}

    {/* ──────────────── MY TRACKS ──────────────── */}
    {false&&tab==="tracks"&&<TracksSettingsTab
     user={user}
     userTracks={userTracks}
     activeTrackId={activeTrackId}
     onSwitchTrack={onSwitchTrack}
     onDeleteTrack={onDeleteTrack}
     onCreateTrack={onCreateTrack}
     onSaveGoals={onSaveGoals}
     userGoals={userGoals}
     industryConfigs={industryConfigs}
     flashSaved={flashSaved}
    />}

    {/* ──────────────── MY JOURNAL ──────────────── */}
    {tab==="journal"&&<JournalSettingsTab user={user} />}

    {/* ──────────────── PACER AI ──────────────── */}
    {tab==="pacer"&&(
     <div style={{maxWidth:"540px",display:"flex",flexDirection:"column",gap:"24px"}}>
      <div>
       <div style={{fontSize:"1.05rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F,marginBottom:"4px"}}>⚡ Pacer AI Settings</div>
       <div style={{fontSize:"0.85rem",color:TM,lineHeight:1.6}}>Customize how Pacer shows up for you — how proactive it is, and how it talks to you.</div>
      </div>

      {/* Pro upsell banner — free users only */}
      {!isPro&&(
       <div style={{background:"linear-gradient(135deg,rgba(29,201,232,0.08) 0%,rgba(123,111,216,0.08) 100%)",border:"1px solid rgba(29,201,232,0.25)",borderRadius:"14px",padding:"16px 18px",display:"flex",gap:"14px",alignItems:"flex-start"}}>
        <div style={{fontSize:"1.5rem",flexShrink:0}}>⚡</div>
        <div style={{flex:1}}>
         <div style={{fontSize:"0.9rem",fontWeight:"800",color:"var(--text-primary)",fontFamily:F,marginBottom:"4px"}}>Unlock full Pacer AI with Pro</div>
         <div style={{fontSize:"0.75rem",color:TM,lineHeight:1.55,marginBottom:"12px"}}>Free gives you 10 credits/month. Pro gives you unlimited Pacer sessions, AI debriefs after every session, proactive check-ins, and memory across conversations.</div>
         <button onClick={()=>onShowPaywall&&onShowPaywall()} style={{background:"var(--accent)",color:"#000",border:"none",padding:"9px 18px",borderRadius:"9px",fontSize:"0.8rem",fontWeight:"800",cursor:"pointer",fontFamily:F}}>Upgrade to Pro →</button>
        </div>
       </div>
      )}

      {/* Engagement level */}
      <div>
       <div style={{fontSize:"0.78rem",fontWeight:"800",color:TD,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"10px",fontFamily:F}}>Engagement Level</div>
       <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {[
         ["low",     "Low",    "Only responds when you message first. No proactive nudges."],
         ["medium",  "Medium", "Morning ritual + mid-day and end-of-day check-ins on weak days."],
         ["high",    "High",   "More frequent check-ins, deeper follow-ups, proactive on commitments."],
        ].map(([k,label,desc])=>(
         <button key={k}
          onClick={()=>{ onSavePacerSettings({engagement:k}); flashSaved("Saved"); }}
          style={{display:"flex",alignItems:"flex-start",gap:"12px",padding:"12px 14px",borderRadius:"12px",cursor:"pointer",fontFamily:F,textAlign:"left",WebkitTapHighlightColor:"transparent",border:`1px solid ${(pacerSettings?.engagement||"high")===k?"rgba(29,201,232,0.5)":"var(--border-1)"}`,background:(pacerSettings?.engagement||"high")===k?"rgba(29,201,232,0.07)":"var(--bg-2)"}}>
          <div style={{width:"18px",height:"18px",borderRadius:"50%",border:`2px solid ${(pacerSettings?.engagement||"high")===k?"var(--accent)":"var(--border-2)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"1px"}}>
           {(pacerSettings?.engagement||"high")===k&&<div style={{width:"8px",height:"8px",borderRadius:"50%",background:"var(--accent)"}}/>}
          </div>
          <div>
           <div style={{fontSize:"0.88rem",fontWeight:"700",color:"var(--text-primary)",marginBottom:"2px"}}>{label}</div>
           <div style={{fontSize:"0.75rem",color:TM,lineHeight:1.45}}>{desc}</div>
          </div>
         </button>
        ))}
       </div>
      </div>

      {/* Tone */}
      <div>
       <div style={{fontSize:"0.78rem",fontWeight:"800",color:TD,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"10px",fontFamily:F}}>Tone</div>
       <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
        {[
         ["encouraging","🌱","Encouraging","Leads with positivity, celebrates effort"],
         ["challenging","⚡","Challenging","High-expectation, calls out gaps directly"],
         ["inspiring",  "🔥","Inspiring",  "Big picture vision and potential-focused"],
         ["blunt",      "🎯","Blunt",       "No preamble. Just facts and next step."],
        ].map(([k,icon,label,desc])=>(
         <button key={k}
          onClick={()=>{ onSavePacerSettings({tone:k}); flashSaved("Saved"); }}
          style={{padding:"12px",borderRadius:"12px",cursor:"pointer",fontFamily:F,textAlign:"left",WebkitTapHighlightColor:"transparent",border:`1px solid ${(pacerSettings?.tone||"challenging")===k?"rgba(29,201,232,0.5)":"var(--border-1)"}`,background:(pacerSettings?.tone||"challenging")===k?"rgba(29,201,232,0.07)":"var(--bg-2)"}}>
          <div style={{fontSize:"1.2rem",marginBottom:"5px"}}>{icon}</div>
          <div style={{fontSize:"0.82rem",fontWeight:"700",color:(pacerSettings?.tone||"challenging")===k?"var(--accent)":"var(--text-primary)",marginBottom:"3px"}}>{label}</div>
          <div style={{fontSize:"0.7rem",color:TM,lineHeight:1.4}}>{desc}</div>
         </button>
        ))}
       </div>
      </div>


      {/* Visibility */}
      <div style={{borderTop:"1px solid var(--border-1)",paddingTop:"20px"}}>
       <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px"}}>
        <div>
         <div style={{fontSize:"0.88rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F,marginBottom:"2px"}}>Show Pacer button</div>
         <div style={{fontSize:"0.75rem",color:TM,lineHeight:1.45}}>Hide the floating Pacer button if you prefer less clutter.</div>
        </div>
        <button
         onClick={()=>{ onSavePacerSettings({hidden:!(pacerSettings?.hidden)}); flashSaved("Saved"); }}
         style={{flexShrink:0,width:"44px",height:"26px",borderRadius:"13px",border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",background:pacerSettings?.hidden?"var(--bg-3)":"var(--accent)",WebkitTapHighlightColor:"transparent"}}
        >
         <div style={{position:"absolute",top:"3px",left:pacerSettings?.hidden?"3px":"21px",width:"20px",height:"20px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
        </button>
       </div>
      </div>

      {savedMsg && <div style={{color:"var(--accent)",fontSize:"0.82rem",fontWeight:"700",fontFamily:F}}>✓ {savedMsg}</div>}
     </div>
    )}

    {/* ──────────────── SUBSCRIPTION ──────────────── */}

    {/* ──────────────── FEEDBACK ──────────────── */}
    {/* ──────────────── MILESTONES ──────────────── */}
    {tab==="milestones"&&(()=>{
      const metrics = industryConfig?.weekdayMetrics || [];
      const streak = computeStreak(myData || {}, getProtectedDates(myFreezes || {}));
      const mileDefs = getMilestoneDefinitions ? getMilestoneDefinitions(industryConfig) : [];
      const totals = computeMilestoneTotals ? computeMilestoneTotals(myData || {}, metrics) : {};
      const allDays = Object.keys(myData || {}).filter(d => !isWeekend(d) && Object.values((myData||{})[d]||{}).some(v=>typeof v==='number'&&v>0));
      const winDays = allDays.filter(d => computeGoalPct((myData||{})[d]||{}, metrics, userGoals) >= 100);
      const winRate = allDays.length ? Math.round((winDays.length/allDays.length)*100) : 0;

      const earnedIds = new Set(unlockedMilestones || []);
      const earned = mileDefs.filter(m => {
        if (earnedIds.has(m.id)) return true;
        if (m.type === 'streak' && streak.current >= m.threshold) return true;
        if (m.type === 'days' && allDays.length >= m.threshold) return true;
        if (m.type === 'winrate' && winRate >= m.threshold && allDays.length >= 10) return true;
        if (m.type === 'metric' && totals[m.metricKey] >= m.threshold) return true;
        return false;
      });
      const locked = mileDefs.filter(m => !earned.find(e => e.id === m.id));

      return (
        <div style={{maxWidth:'540px', display:'flex', flexDirection:'column', gap:'20px'}}>
          <div>
            <div style={{fontSize:'1.05rem', fontWeight:'700', color:'var(--text-primary)', fontFamily:F, marginBottom:'4px'}}>🏆 Milestones</div>
            <div style={{fontSize:'0.85rem', color:TM, lineHeight:1.6}}>Badges earned through consistent effort. These don't reset.</div>
          </div>

          {earned.length > 0 && (
            <div>
              <div style={{fontSize:'0.7rem', fontWeight:'800', color:TA, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'10px', fontFamily:F}}>Earned — {earned.length}</div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'8px'}}>
                {earned.map(m => (
                  <div key={m.id} style={{background:'rgba(29,201,232,0.07)', border:'1px solid rgba(29,201,232,0.2)', borderRadius:'12px', padding:'12px', textAlign:'center'}}>
                    <div style={{fontSize:'1.6rem', marginBottom:'5px'}}>{m.icon}</div>
                    <div style={{fontSize:'0.8rem', fontWeight:'700', color:'var(--text-primary)', fontFamily:F, marginBottom:'2px'}}>{m.label}</div>
                    <div style={{fontSize:'0.68rem', color:TM, lineHeight:1.35}}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {locked.length > 0 && (
            <div>
              <div style={{fontSize:'0.7rem', fontWeight:'800', color:TD, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'10px', fontFamily:F}}>Locked — {locked.length}</div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'8px'}}>
                {locked.slice(0,8).map(m => (
                  <div key={m.id} style={{background:'var(--bg-2)', border:'1px solid var(--border-1)', borderRadius:'12px', padding:'12px', textAlign:'center', opacity:0.5}}>
                    <div style={{fontSize:'1.6rem', marginBottom:'5px', filter:'grayscale(1)'}}>{m.icon}</div>
                    <div style={{fontSize:'0.8rem', fontWeight:'700', color:'var(--text-secondary, rgba(255,255,255,0.6))', fontFamily:F, marginBottom:'2px'}}>{m.label}</div>
                    <div style={{fontSize:'0.68rem', color:TD, lineHeight:1.35}}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mileDefs.length === 0 && (
            <div style={{color:'var(--text-secondary, rgba(255,255,255,0.65))', fontSize:'0.85rem', lineHeight:1.6}}>
              Keep logging daily to unlock milestone badges. They reflect consistency, win rates, and volume targets.
            </div>
          )}
        </div>
      );
    })()}

    {/* ──────────────── INTEGRATIONS ──────────────── */}
    {tab==="report"&&<DailyReportTab user={user} industryConfig={industryConfig} />}


    {/* ──────────────── SHARE PROFILE ──────────────── */}
    {tab==="share"&&(()=>{
      const metrics = industryConfig?.weekdayMetrics || [];
      const allDays = Object.keys(myData || {}).filter(d => !isWeekend(d) && Object.values((myData||{})[d]||{}).some(v=>typeof v==='number'&&v>0));
      const streak = computeStreak(myData || {}, getProtectedDates(myFreezes || {}));
      const winDays = allDays.filter(d => computeGoalPct((myData||{})[d]||{}, metrics, userGoals) >= 100);
      const winRate = allDays.length ? Math.round((winDays.length/allDays.length)*100) : 0;
      const copied = profileCopied;
      const setCopied = setProfileCopied;

      // Best week avg
      const weekPcts = [];
      const seenWks = new Set();
      allDays.forEach(d => {
        const wk = d.slice(0,7);
        if (seenWks.has(wk)) return;
        seenWks.add(wk);
        const wkDays = allDays.filter(x => x.slice(0,7) === wk);
        const wkAvg = wkDays.reduce((s,x) => s + computeGoalPct((myData||{})[x]||{}, metrics, userGoals), 0) / Math.max(1, wkDays.length);
        weekPcts.push(Math.round(wkAvg));
      });
      const bestWeek = weekPcts.length ? Math.max(...weekPcts) : 0;

      // All-time metric totals
      const metricTotals = metrics.slice(0,3).map(m => {
        const total = allDays.reduce((s,d) => s + ((myData||{})[d]?.[m.key] || 0), 0);
        return { label: m.short || m.label, total };
      }).filter(m => m.total > 0);

      function shareLink() {
        const url = `https://getcadence.net/u/${encodeURIComponent(user.id)}`;
        if (navigator.share) {
          navigator.share({ title: `${user.name} on Cadence`, text: `${streak.current > 0 ? `${streak.current}-day streak. ` : ''}${allDays.length} days logged.`, url }).catch(()=>{});
        } else {
          navigator.clipboard?.writeText(url).catch(()=>{});
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      }

      return (
        <div style={{maxWidth:'460px', display:'flex', flexDirection:'column', gap:'20px'}}>
          <div>
            <div style={{fontSize:'1.05rem', fontWeight:'700', color:'var(--text-primary)', fontFamily:F, marginBottom:'4px'}}>↗ Share Profile</div>
            <div style={{fontSize:'0.85rem', color:TM, lineHeight:1.6}}>Your public profile page. Share your stats with anyone.</div>
          </div>

          {/* Stats card */}
          <div style={{background:'linear-gradient(135deg, rgba(29,201,232,0.07) 0%, rgba(123,111,216,0.05) 100%)', border:'1px solid rgba(29,201,232,0.2)', borderRadius:'16px', padding:'18px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'14px', marginBottom:'16px'}}>
              <div style={{width:'48px', height:'48px', borderRadius:'50%', background:'rgba(29,201,232,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', fontWeight:'900', color:TA, fontFamily:F, flexShrink:0}}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:'1rem', fontWeight:'800', color:'var(--text-primary)', fontFamily:F}}>{user.name}</div>
                <div style={{fontSize:'0.75rem', color:TM}}>{industryConfig?.label || user.industry}{streak.current >= 3 && <span style={{marginLeft:'8px', color:'#F59E0B'}}>🔥 {streak.current}d streak</span>}</div>
              </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:metricTotals.length ? '12px' : '0'}}>
              {[
                {label:'Streak', value: streak.current > 0 ? `${streak.current}d` : '—', sub: streak.current > 0 ? `Best: ${streak.longest}d` : 'Start logging', color:'#F59E0B'},
                {label:'Win Rate', value: `${winRate}%`, sub:'last 30 days', color: winRate >= 80 ? '#4ACF86' : winRate >= 50 ? TA : TM},
                {label:'Best Week', value: bestWeek > 0 ? `${bestWeek}%` : '—', sub:'avg goal %', color:'#A855F7'},
                {label:'Days Logged', value: allDays.length || '—', sub:'all time', color:TA},
              ].map(stat => (
                <div key={stat.label} style={{background:'rgba(0,0,0,0.2)', borderRadius:'10px', padding:'10px 12px'}}>
                  <div style={{fontSize:'1.15rem', fontWeight:'900', color:stat.color, fontFamily:F, lineHeight:1}}>{stat.value}</div>
                  <div style={{fontSize:'0.6rem', fontWeight:'700', color:TD, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:'3px'}}>{stat.label}</div>
                  <div style={{fontSize:'0.62rem', color:TD, marginTop:'1px'}}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {metricTotals.length > 0 && (
              <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                {metricTotals.map(m => (
                  <div key={m.label} style={{background:'rgba(29,201,232,0.08)', border:'1px solid rgba(29,201,232,0.15)', borderRadius:'8px', padding:'4px 10px', fontSize:'0.72rem', color:TA}}>
                    {m.total.toLocaleString()} {m.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={shareLink} style={{width:'100%', background:'none', border:'1px solid rgba(29,201,232,0.35)', color:TA, padding:'12px', borderRadius:'11px', fontWeight:'700', fontSize:'0.88rem', cursor:'pointer', fontFamily:F, WebkitTapHighlightColor:'transparent'}}>
            {copied ? '✓ Link copied' : '↗ Share my profile'}
          </button>
        </div>
      );
    })()}

    {/* ──────────────── FEEDBACK ──────────────── */}
    {tab==="feedback"&&(
     <div style={{maxWidth:"540px",display:"flex",flexDirection:"column",gap:"16px"}}>
      <div>
       <div style={{fontSize:"1.05rem",fontWeight:"700",color:"var(--text-primary)",fontFamily:F,marginBottom:"6px"}}>Send Feedback</div>
       <div style={{fontSize:"0.85rem",color:TM,lineHeight:1.6}}>Spotted a bug? Have a feature idea? Something you love? Your message goes directly to the Cadence team.</div>
      </div>
      <textarea
       value={feedbackText}
       onChange={e=>setFeedbackText(e.target.value)}
       placeholder={"What's on your mind? Bugs, feature requests, compliments — we read every message."}
       rows={6}
       style={{width:"100%",background:"var(--bg-2)",border:"1px solid var(--border-1)",color:TP,padding:"12px 14px",borderRadius:"10px",fontSize:"0.9rem",fontFamily:F,outline:"none",resize:"vertical",lineHeight:1.55,boxSizing:"border-box"}}
      />
      {feedbackSent ? (
       <div style={{background:"rgba(74,207,134,0.1)",border:"1px solid rgba(74,207,134,0.25)",borderRadius:"10px",padding:"14px",textAlign:"center",fontSize:"0.88rem",color:"#4ACF86",fontWeight:"700"}}>
        Feedback sent — thank you!
       </div>
      ) : (
       <button
        disabled={!feedbackText.trim()||feedbackSending}
        onClick={async()=>{
         if(!feedbackText.trim()) return;
         setFeedbackSending(true);
         if(onSendFeedback) await onSendFeedback(feedbackText.trim());
         setFeedbackSent(true); setFeedbackSending(false); setFeedbackText("");
         setTimeout(()=>setFeedbackSent(false), 4000);
        }}
        style={{width:"100%",background:"var(--accent)",color:"#000",border:"none",padding:"13px",borderRadius:"12px",fontWeight:"800",fontSize:"0.9rem",cursor:"pointer",fontFamily:F,opacity:feedbackText.trim()&&!feedbackSending?1:0.45,transition:"opacity 0.15s"}}>
        {feedbackSending?"Sending…":"Send Feedback"}
       </button>
      )}
     </div>
    )}

    {/* ──────────────── REFER & EARN ──────────────── */}
    {tab==="refer"&&<AffiliateTab user={user} isPro={isPro} onShowPaywall={onShowPaywall} />}

    {/* ──────────────── GOD MODE ──────────────── */}
    {tab==="godmode"&&isGlobalSA&&<GodModeTab
     allUsers={allUsers}
     admins={admins}
     onToggleAdmin={onToggleAdmin}
     onDelete={onDelete}
     flashSaved={flashSaved}
     user={user}
     isSuperAdmin={isSuperAdmin}
    />}

   </div>{/* end right content */}
   </div>{/* end flex row */}
  </div>
 );
}

export function AddUserInline({onAdd, allUsers, industryConfigs, flashSaved}) {
 const [adding, setAdding] = useState(false);
 const [newName, setNewName] = useState("");
 const [newInd, setNewInd] = useState("freight");
 const [newPin, setNewPin] = useState("");
 const isDupe = adding && allUsers.some(u=>u.name.trim().toLowerCase()===newName.trim().toLowerCase());
 const invalidPin = newPin.length>0 && newPin.length!==4;
 if(!adding) return <button style={{...s.secondaryBtn,fontSize:"0.95rem",padding:"6px 12px"}} onClick={()=>setAdding(true)}>+ Add Member</button>;
 return (
  <div style={{...s.fdc,gap:"7px",maxWidth:"min(340px,100%)"}}>
   <input style={{...s.inpBase,padding:"8px 10px",...s.br8,fontSize:"1rem",...s.Fno}} placeholder="Full name" value={newName} autoFocus onChange={e=>setNewName(e.target.value)}/>
   {isDupe&&<div style={s.red8}>Name already exists.</div>}
   <div style={{display:"flex",...s.g4,flexWrap:"wrap"}}>
    {Object.entries(industryConfigs).map(([k,v])=>(
     <button key={k} style={{...s.smallTab,fontSize:"0.9rem",padding:"3px 7px",borderColor:newInd===k?v.accentColor:BD1,color:newInd===k?v.accentColor:TD}} onClick={()=>setNewInd(k)}>{v.icon}</button>
    ))}
   </div>
   <input style={{...s.inpBase,padding:"8px 10px",...s.br8,fontSize:"1rem",fontFamily:F,letterSpacing:"0.2em",outline:"none"}} type="password" inputMode="numeric" maxLength={4} placeholder="PIN (optional)" value={newPin} onChange={e=>{if(/^[0-9]{0,4}$/.test(e.target.value))setNewPin(e.target.value);}}/>
   {invalidPin&&<div style={s.red8}>PIN = 4 digits.</div>}
   <div style={s.fg4}>
    <button style={{...s.secondaryBtn,fontSize:"0.8rem",padding:"5px 10px"}} onClick={()=>{setAdding(false);setNewName("");setNewPin("");}}>✕ Cancel</button>
    <button style={{...s.primaryBtn,fontSize:"0.8rem",padding:"5px 12px",opacity:newName.trim()&&!isDupe&&!invalidPin?1:0.4}} disabled={!newName.trim()||isDupe||invalidPin}
     onClick={()=>{onAdd(newName.trim(),newInd,newPin||null);setAdding(false);setNewName("");setNewPin("");flashSaved("Member added");}}>Create</button>
   </div>
  </div>
 );
}

const PRELOADED_DATA = {}; // Cleared — was seeded with real user data
// ─────────────────────────────────────────────────────────────────────────────
// ── TracksSettingsTab — full tracks management page ───────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function TracksSettingsTab({ user, userTracks, activeTrackId, onSwitchTrack, onDeleteTrack, onCreateTrack, onSaveGoals, userGoals, industryConfigs, flashSaved }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [expandedTrack, setExpandedTrack] = useState(null);
 const [trackGoals, setTrackGoals] = useState({});
 const [trackMetrics, setTrackMetrics] = useState({}); // {[trackId]: [...metrics]} — editable copy
 const [confirmDel, setConfirmDel] = useState(null);
 const METRIC_COLORS_LOCAL = ["#1DC9E8","#7B6FD8","#4ACF86","#F59E0B","#E05577","#F97316","#A78BFA","#34D399"];

 // Build per-track goals and local metric copies
 useEffect(() => {
  const g = {}, m = {};
  (userTracks||[]).forEach(t => {
   const cfg = industryConfigs[t.industryKey] || {};
   const metrics = t.customMetrics || cfg.weekdayMetrics || [];
   g[t.id] = {};
   metrics.forEach(met => {
    g[t.id][met.key] = userGoals?.[met.key] ?? met.defaultGoal ?? 0;
   });
   m[t.id] = metrics.map(met => ({ ...met }));
  });
  setTrackGoals(g);
  setTrackMetrics(m);
 }, [userTracks, userGoals]);

 function updateMetricField(trackId, idx, field, val) {
  setTrackMetrics(prev => {
   const arr = [...(prev[trackId] || [])];
   arr[idx] = { ...arr[idx], [field]: val };
   return { ...prev, [trackId]: arr };
  });
 }

 function addMetricToTrack(trackId) {
  const existing = trackMetrics[trackId] || [];
  const newKey = `custom_${Date.now()}`;
  const newMet = {
   key: newKey,
   label: "New Metric",
   short: "New",
   color: METRIC_COLORS_LOCAL[existing.length % METRIC_COLORS_LOCAL.length],
   keyBind: String(existing.length + 1),
   defaultGoal: 10,
  };
  setTrackMetrics(prev => ({ ...prev, [trackId]: [...(prev[trackId] || []), newMet] }));
  setTrackGoals(prev => ({ ...prev, [trackId]: { ...(prev[trackId] || {}), [newKey]: 10 } }));
 }

 function removeMetricFromTrack(trackId, idx) {
  const removedKey = (trackMetrics[trackId] || [])[idx]?.key;
  setTrackMetrics(prev => ({ ...prev, [trackId]: prev[trackId].filter((_, i) => i !== idx) }));
  if (removedKey) {
   setTrackGoals(prev => {
    const g = { ...prev[trackId] };
    delete g[removedKey];
    return { ...prev, [trackId]: g };
   });
  }
 }

 function saveTrack(t) {
  const metrics = trackMetrics[t.id] || [];
  const goals = trackGoals[t.id] || {};
  // Rebuild goals to match current metric keys
  const finalGoals = {};
  metrics.forEach(m => { finalGoals[m.key] = goals[m.key] ?? m.defaultGoal ?? 0; });
  if (onSaveGoals) onSaveGoals(finalGoals, t.id, metrics);
  flashSaved("Track saved");
 }

 const tracks = userTracks || [];
 const card = { background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"14px", overflow:"hidden", marginBottom:"10px" };

 return (
  <div style={{ maxWidth:"600px", display:"flex", flexDirection:"column" }}>
   <div style={{ fontSize:"1rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F, marginBottom:"6px" }}>My Tracks</div>
   <p style={{ fontSize:"0.85rem", color:"var(--text-muted)", marginBottom:"24px", lineHeight:1.6 }}>
    Each Track has its own metrics and daily goals. Add, rename, or remove metrics for any track. Your active track drives what shows on your dashboard.
   </p>

   {tracks.length === 0 && (
    <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--text-dim)", background:"var(--bg-1)", borderRadius:"14px", border:"1px solid var(--border-1)" }}>
     <div style={{ fontSize:"2rem", marginBottom:"12px" }}>◆</div>
     <div style={{ fontSize:"0.95rem", marginBottom:"16px" }}>No tracks yet. Add your first track to get started.</div>
    </div>
   )}

   {tracks.map(t => {
    const isActive = t.id === activeTrackId;
    const isExpanded = expandedTrack === t.id;
    const cfg = industryConfigs[t.industryKey] || {};
    const metrics = trackMetrics[t.id] || [];
    const tGoals = trackGoals[t.id] || {};
    return (
     <div key={t.id} style={card}>
      {/* Track header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 16px", cursor:"pointer" }} onClick={() => setExpandedTrack(isExpanded ? null : t.id)}>
       <span style={{ fontSize:"1.6rem", flexShrink:0 }}>{t.icon || "◆"}</span>
       <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:"1rem", fontWeight:"800", color:"var(--text-primary)", fontFamily:F }}>{t.name}</div>
        <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:"2px" }}>
         {cfg.label || t.industryKey} · {metrics.length} metric{metrics.length !== 1 ? "s" : ""}
        </div>
       </div>
       {isActive
        ? <span style={{ fontSize:"0.68rem", fontWeight:"800", color:"#1DC9E8", background:"rgba(29,201,232,0.12)", border:"1px solid rgba(29,201,232,0.25)", borderRadius:"6px", padding:"3px 9px", flexShrink:0 }}>ACTIVE</span>
        : <button onClick={e => { e.stopPropagation(); onSwitchTrack && onSwitchTrack(t.id); flashSaved(`Switched to ${t.name}`); }}
           style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-secondary)", padding:"5px 14px", borderRadius:"8px", fontSize:"0.78rem", fontWeight:"600", cursor:"pointer", fontFamily:"inherit", flexShrink:0, WebkitTapHighlightColor:"transparent" }}>
           Switch →
          </button>
       }
       <span style={{ color:"var(--text-dim)", fontSize:"0.8rem", flexShrink:0, transform:isExpanded?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▼</span>
      </div>

      {/* Expanded: full metric editor */}
      {isExpanded && (
       <div style={{ borderTop:"1px solid var(--border-1)", padding:"16px 16px 20px" }}>

        {/* Section label */}
        <div style={{ fontSize:"0.7rem", fontWeight:"800", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"14px" }}>
         Metrics & Daily Goals
        </div>

        {/* Column headers */}
        {metrics.length > 0 && (
         <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 90px 68px 54px 28px", gap:"6px", alignItems:"center", marginBottom:"6px", paddingBottom:"6px", borderBottom:"1px solid var(--border-1)" }}>
          <div />
          <div style={{ fontSize:"0.65rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Label</div>
          <div style={{ fontSize:"0.65rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Short</div>
          <div style={{ fontSize:"0.65rem", fontWeight:"700", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"center" }}>Goal/day</div>
          <div />
          <div />
         </div>
        )}

        {/* Metric rows */}
        {metrics.map((m, idx) => (
         <div key={m.key} style={{ display:"grid", gridTemplateColumns:"28px 1fr 90px 68px 54px 28px", gap:"6px", alignItems:"center", marginBottom:"8px" }}>
          {/* Color dot */}
          <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:m.color||"var(--accent)", flexShrink:0, margin:"0 auto" }} />
          {/* Label */}
          <input
           value={m.label}
           onChange={e => updateMetricField(t.id, idx, "label", e.target.value)}
           placeholder="Metric name"
           style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"7px", padding:"6px 8px", fontSize:"0.82rem", color:"var(--text-primary)", fontFamily:F, outline:"none", width:"100%" }}
          />
          {/* Short label */}
          <input
           value={m.short || ""}
           onChange={e => updateMetricField(t.id, idx, "short", e.target.value.slice(0, 10))}
           placeholder="Short"
           style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"7px", padding:"6px 8px", fontSize:"0.82rem", color:"var(--text-primary)", fontFamily:F, outline:"none", width:"100%" }}
          />
          {/* Goal */}
          <input
           type="number" min="0"
           value={tGoals[m.key] ?? m.defaultGoal ?? 0}
           onChange={e => {
            const n = parseInt(e.target.value);
            setTrackGoals(prev => ({ ...prev, [t.id]: { ...prev[t.id], [m.key]: isNaN(n) ? 0 : Math.max(0, n) } }));
           }}
           style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"7px", padding:"6px 8px", fontSize:"0.9rem", color:"var(--text-primary)", fontFamily:F, outline:"none", textAlign:"center", width:"100%" }}
          />
          <span style={{ fontSize:"0.72rem", color:"var(--text-dim)", textAlign:"center" }}>/day</span>
          {/* Remove */}
          <button
           onClick={() => removeMetricFromTrack(t.id, idx)}
           title="Remove metric"
           style={{ background:"none", border:"none", color:"rgba(224,85,119,0.5)", cursor:"pointer", fontSize:"1rem", padding:"2px", lineHeight:1, WebkitTapHighlightColor:"transparent" }}>
           ✕
          </button>
         </div>
        ))}

        {/* Add metric */}
        <button
         onClick={() => addMetricToTrack(t.id)}
         style={{ display:"flex", alignItems:"center", gap:"6px", background:"rgba(29,201,232,0.06)", border:"1px dashed rgba(29,201,232,0.3)", color:"var(--accent)", borderRadius:"8px", padding:"7px 14px", fontSize:"0.8rem", fontWeight:"700", cursor:"pointer", fontFamily:F, marginTop:"4px", WebkitTapHighlightColor:"transparent" }}>
         + Add Metric
        </button>

        {/* Actions */}
        <div style={{ display:"flex", gap:"8px", marginTop:"16px", paddingTop:"14px", borderTop:"1px solid var(--border-1)" }}>
         <button
          onClick={() => saveTrack(t)}
          style={{ background:"var(--accent)", color:"#000", border:"none", padding:"9px 22px", borderRadius:"9px", fontSize:"0.85rem", fontWeight:"800", cursor:"pointer", fontFamily:F, WebkitTapHighlightColor:"transparent" }}>
          Save Track
         </button>
         {tracks.length > 1 && (
          <button
           onClick={() => setConfirmDel(t)}
           style={{ background:"none", border:"1px solid rgba(224,85,119,0.3)", color:"rgba(224,85,119,0.7)", padding:"9px 14px", borderRadius:"9px", fontSize:"0.82rem", cursor:"pointer", fontFamily:"inherit", WebkitTapHighlightColor:"transparent" }}>
           Remove Track
          </button>
         )}
        </div>
       </div>
      )}
     </div>
    );
   })}

   <button onClick={() => onCreateTrack && onCreateTrack()}
    style={{ width:"100%", background:"none", border:"2px dashed rgba(29,201,232,0.3)", color:"var(--accent)", padding:"14px", borderRadius:"14px", fontSize:"0.9rem", fontWeight:"700", cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", marginTop:"4px", WebkitTapHighlightColor:"transparent" }}>
    + Add New Track
   </button>

   {/* Confirm delete modal */}
   {confirmDel && (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:8000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
     <div style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"16px", padding:"24px", maxWidth:"380px", width:"100%", fontFamily:F }}>
      <div style={{ fontSize:"1.1rem", fontWeight:"800", color:"var(--text-primary)", marginBottom:"8px" }}>Remove "{confirmDel.name}"?</div>
      <div style={{ fontSize:"0.85rem", color:"var(--text-muted)", lineHeight:1.6, marginBottom:"20px" }}>
       Your logged data for this track is preserved. You can always add it back later.
      </div>
      <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
       <button onClick={() => setConfirmDel(null)} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"9px 18px", borderRadius:"9px", fontSize:"0.85rem", cursor:"pointer" }}>Cancel</button>
       <button onClick={() => { onDeleteTrack && onDeleteTrack(confirmDel.id); setConfirmDel(null); flashSaved("Track removed"); }}
        style={{ background:"rgba(224,85,119,0.12)", border:"1px solid rgba(224,85,119,0.4)", color:"#E05577", padding:"9px 18px", borderRadius:"9px", fontSize:"0.85rem", fontWeight:"700", cursor:"pointer" }}>
        Remove
       </button>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── JournalSettingsTab — redesigned with modal per-prompt question editor ────
// ─────────────────────────────────────────────────────────────────────────────
const JOURNAL_PROMPTS_CFG = [
 { key: "showDailyPrompt",     label: "Daily Check-In",       when: "Every day — quick end-of-day debrief",              icon: "🌙" },
 { key: "showWeeklyPrompt",    label: "Week in Review",        when: "Fri, Sat & Sun — reflect on the week",             icon: "📅" },
 { key: "showMonthlyPrompt",   label: "Month in Review",       when: "Last 3 days of each month",                        icon: "📆" },
 { key: "showQuarterlyPrompt", label: "Last 90 Days",     when: "Last 3 days of Mar, Jun, Sep & Dec",               icon: "📊" },
 { key: "showAnnualPrompt",    label: "Year in Review",        when: "Last 3 days of December",                          icon: "🎯" },
];
const DEFAULT_QUESTIONS_BY_KEY = {
 showDailyPrompt: [
  { key:"highlight", label:"Today's highlight", placeholder:"Best moment or win from today…" },
  { key:"struggle",  label:"Biggest challenge",  placeholder:"What felt hard or frustrating today?" },
  { key:"tomorrow",  label:"Priority tomorrow",  placeholder:"One thing to focus on first thing…" },
 ],
 showWeeklyPrompt: [
  { key:"wins",   label:"Results & Wins",         placeholder:"Key results, milestones, wins big or small…" },
  { key:"needle", label:"What moved the needle?", placeholder:"What actually moved the needle?" },
  { key:"learn",  label:"What did you learn?",    placeholder:"A lesson, an insight, something you'd do differently…" },
  { key:"next",   label:"Focus for next week",    placeholder:"One thing. Be specific." },
 ],
 showMonthlyPrompt: [
  { key:"wins",    label:"Month's biggest wins",  placeholder:"What are you most proud of this month?" },
  { key:"gaps",    label:"Gaps & missed targets", placeholder:"Where did you fall short? Why?" },
  { key:"pattern", label:"Pattern you noticed",   placeholder:"Something that keeps showing up (good or bad)…" },
  { key:"next",    label:"Next month's focus",    placeholder:"The one thing that would make next month a success…" },
 ],
 showQuarterlyPrompt: [
  { key:"wins",    label:"Last 90 days — wins",        placeholder:"What actually made a difference?" },
  { key:"metrics", label:"Numbers vs goals",      placeholder:"Where did numbers land vs targets?" },
  { key:"learn",   label:"Biggest lesson",        placeholder:"What would you tell your Q-start self?" },
  { key:"q_focus", label:"Next 90 days — one theme",  placeholder:"One word or phrase that defines the next quarter…" },
 ],
 showAnnualPrompt: [
  { key:"wins",    label:"Year's biggest wins",   placeholder:"The moments that defined the year…" },
  { key:"proud",   label:"What you're most proud of", placeholder:"Personal or professional…" },
  { key:"learn",   label:"Hardest lesson",        placeholder:"What changed how you think or operate?" },
  { key:"next",    label:"Year ahead intention",  placeholder:"What does a great year look like?" },
 ],
};

function JournalSettingsTab({ user }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [settings, setSettings] = useState(null);
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);
 const [editingPrompt, setEditingPrompt] = useState(null);
 const [questionsByKey, setQuestionsByKey] = useState({});

 useEffect(() => {
  if (!user?.id) return;
  loadJournalSettings(user.id).then(s => {
   setSettings(s);
   const qbk = {};
   Object.keys(DEFAULT_QUESTIONS_BY_KEY).forEach(k => {
    qbk[k] = (s.questionsByKey?.[k]) || DEFAULT_QUESTIONS_BY_KEY[k];
   });
   setQuestionsByKey(qbk);
  }).catch(() => setSettings({ showDailyPrompt:true, showWeeklyPrompt:true, showMonthlyPrompt:true, showQuarterlyPrompt:true, showAnnualPrompt:true }));
 }, [user?.id]);

 const activeQuestions = editingPrompt ? (questionsByKey[editingPrompt] || DEFAULT_QUESTIONS_BY_KEY[editingPrompt] || []) : [];

 async function save(patch) {
  const next = { ...settings, ...patch, questionsByKey };
  setSettings(next); setSaving(true);
  await saveJournalSettings(user.id, next).catch(() => {});
  setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
 }

 function updateQ(i, field, val) {
  setQuestionsByKey(prev => ({
   ...prev,
   [editingPrompt]: prev[editingPrompt].map((q, qi) => qi === i ? { ...q, [field]: val } : q)
  }));
 }
 function addQ() {
  setQuestionsByKey(prev => ({
   ...prev,
   [editingPrompt]: [...(prev[editingPrompt] || []), { key:`custom_${Date.now()}`, label:"", placeholder:"" }]
  }));
 }
 function removeQ(i) {
  setQuestionsByKey(prev => ({
   ...prev,
   [editingPrompt]: (prev[editingPrompt] || []).filter((_, qi) => qi !== i)
  }));
 }
 function resetQ() {
  setQuestionsByKey(prev => ({ ...prev, [editingPrompt]: DEFAULT_QUESTIONS_BY_KEY[editingPrompt] || [] }));
 }

 if (!settings) return null;

 const toggle = (on) => ({
  width:"36px", height:"20px", borderRadius:"10px",
  background: on ? "#1DC9E8" : "rgba(100,116,139,0.35)",
  border:"none", cursor:"pointer", position:"relative",
  transition:"background 0.2s", flexShrink:0, padding:0,
 });
 const knob = (on) => ({
  position:"absolute", top:"3px", left: on ? "19px" : "3px",
  width:"14px", height:"14px", borderRadius:"50%",
  background:"#fff", transition:"left 0.2s",
  boxShadow:"0 1px 3px rgba(0,0,0,0.3)",
 });

 return (
  <div style={{ maxWidth:"560px" }}>
   <div style={{ fontSize:"1rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:"'DM Sans',system-ui,sans-serif", marginBottom:"6px" }}>My Journal</div>
   <p style={{ fontSize:"0.85rem", color:"var(--text-muted)", marginBottom:"24px", lineHeight:1.6 }}>
    Choose which review prompts appear and customize the questions for each one.
   </p>

   {/* Prompt list */}
   <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
    {JOURNAL_PROMPTS_CFG.map(opt => {
     const on = settings[opt.key] !== false;
     return (
      <div key={opt.key} style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"12px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"14px" }}>
       <span style={{ fontSize:"1.4rem", flexShrink:0 }}>{opt.icon}</span>
       <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:"0.95rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F }}>{opt.label}</div>
        <div style={{ fontSize:"0.75rem", color:"var(--text-dim)", marginTop:"2px" }}>{opt.when}</div>
       </div>
       {/* Edit questions button — for all prompts */}
       <button onClick={() => setEditingPrompt(opt.key)}
        style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-secondary)", padding:"4px 10px", borderRadius:"7px", fontSize:"0.72rem", fontWeight:"600", cursor:"pointer", fontFamily:F, flexShrink:0, WebkitTapHighlightColor:"transparent", whiteSpace:"nowrap" }}>
        Edit
       </button>
       <button style={toggle(on)} onClick={() => save({ [opt.key]: !on })}>
        <div style={knob(on)} />
       </button>
      </div>
     );
    })}
   </div>

   {/* Questions editor modal */}
   {editingPrompt && (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:8000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
     <div style={{ background:"var(--bg-0)", border:"1px solid var(--border-1)", borderRadius:"18px", width:"100%", maxWidth:"520px", maxHeight:"85vh", display:"flex", flexDirection:"column", fontFamily:F }}>
      {/* Modal header */}
      <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid var(--border-1)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
       <div>
        <div style={{ fontSize:"1rem", fontWeight:"800", color:"var(--text-primary)" }}>Edit Questions</div>
        <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginTop:"2px" }}>{editingPrompt ? (JOURNAL_PROMPTS_CFG.find(p=>p.key===editingPrompt)?.label||"") : ""}</div>
       </div>
       <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
        <button onClick={resetQ} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-dim)", padding:"5px 10px", borderRadius:"7px", fontSize:"0.75rem", cursor:"pointer", fontFamily:F }}>Reset to defaults</button>
        <button onClick={() => setEditingPrompt(null)} style={{ background:"none", border:"none", color:"var(--text-dim)", fontSize:"1.1rem", cursor:"pointer", padding:"4px", lineHeight:1 }}>✕</button>
       </div>
      </div>

      {/* Questions list */}
      <div style={{ overflowY:"auto", padding:"14px 20px", flex:1, WebkitOverflowScrolling:"touch" }}>
       <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"12px" }}>
        {activeQuestions.map((q, i) => (
         <div key={q.key} style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"10px", padding:"12px 14px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:"10px" }}>
           <span style={{ fontSize:"0.75rem", fontWeight:"700", color:"var(--text-dim)", paddingTop:"2px", flexShrink:0, minWidth:"16px" }}>{i+1}.</span>
           <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"6px" }}>
            <input value={q.label} onChange={e => updateQ(i, "label", e.target.value)} placeholder="Question label"
             style={{ width:"100%", background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"7px", padding:"8px 10px", fontSize:"0.88rem", fontFamily:F, outline:"none", color:"var(--text-primary)", boxSizing:"border-box" }} />
            <input value={q.placeholder} onChange={e => updateQ(i, "placeholder", e.target.value)} placeholder="Hint text shown in field (optional)"
             style={{ width:"100%", background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"7px", padding:"7px 10px", fontSize:"0.8rem", color:"var(--text-muted)", fontFamily:F, outline:"none", boxSizing:"border-box" }} />
           </div>
           <button onClick={() => removeQ(i)} style={{ background:"none", border:"none", color:"rgba(224,85,119,0.5)", cursor:"pointer", padding:"4px", fontSize:"1rem", lineHeight:1, flexShrink:0 }}>✕</button>
          </div>
         </div>
        ))}
       </div>
       <button onClick={addQ} style={{ width:"100%", background:"none", border:"1px dashed rgba(255,255,255,0.1)", color:"var(--text-dim)", padding:"10px", borderRadius:"9px", fontSize:"0.85rem", cursor:"pointer", fontFamily:F }}>+ Add question</button>
      </div>

      {/* Modal footer */}
      <div style={{ padding:"14px 20px", borderTop:"1px solid var(--border-1)", display:"flex", gap:"8px", justifyContent:"flex-end", flexShrink:0 }}>
       <button onClick={() => setEditingPrompt(null)} style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"9px 18px", borderRadius:"9px", fontSize:"0.85rem", cursor:"pointer" }}>Cancel</button>
       <button onClick={() => { save({}); setEditingPrompt(null); }} disabled={saving}
        style={{ background:"var(--accent)", color:"#000", border:"none", padding:"9px 22px", borderRadius:"9px", fontSize:"0.85rem", fontWeight:"800", cursor:"pointer", fontFamily:F }}>
        {saving ? "Saving…" : "Save Changes"}
       </button>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── GodModeTab — inline full-page super admin control ─────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ── RolesTeamsTab — Manage roles + org team hierarchy from Settings ───────────
// ─────────────────────────────────────────────────────────────────────────────
function RolesTeamsTab({ orgId, communityId, spaceType, allUsers, currentUser, flashSaved }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const isOrg = spaceType === "org";
 const spaceId = orgId || communityId;

 const [roles, setRoles] = useState([]);
 const [teams, setTeams] = useState([]);
 const [assignments, setAssignments] = useState({});
 const [loading, setLoading] = useState(true);
 const [activeSection, setActiveSection] = useState("roles"); // "roles" | "teams" | "members"
 const [editingRole, setEditingRole] = useState(null); // role being edited or null
 const [newRoleName, setNewRoleName] = useState("");
 const [newRoleIcon, setNewRoleIcon] = useState("👤");
 const [newRoleColor, setNewRoleColor] = useState("#64748B");
 const [newRolePerms, setNewRolePerms] = useState({});
 const [newTeamName, setNewTeamName] = useState("");
 const [newTeamParent, setNewTeamParent] = useState("");
 const [confirmDelete, setConfirmDelete] = useState(null);
 const [assignTarget, setAssignTarget] = useState(null); // userId being assigned
 const [assignRole, setAssignRole] = useState("");
 const [assignTeam, setAssignTeam] = useState("");

 async function reload() {
  setLoading(true);
  try {
   const [r, t, a] = await Promise.all([
    isOrg ? loadOrgRoles(spaceId) : loadCommunityRoles(spaceId),
    isOrg ? loadOrgTeams(spaceId) : Promise.resolve([]),
    loadMemberAssignments(spaceId),
   ]);
   setRoles(r); setTeams(t); setAssignments(a);
  } catch {}
  setLoading(false);
 }
 useEffect(() => { if (spaceId) reload(); }, [spaceId]);

 async function saveRoles(next) {
  setRoles(next);
  if (isOrg) await saveOrgRoles(spaceId, next);
  else await saveCommunityRoles(spaceId, next);
  flashSaved("Roles saved");
 }

 async function saveTeamsData(next) {
  setTeams(next);
  await saveOrgTeams(spaceId, next);
  flashSaved("Teams saved");
 }

 async function commitAssignment(userId, roleId, teamId) {
  await setMemberAssignment(spaceId, userId, roleId, teamId);
  setAssignments(prev => ({ ...prev, [userId]: { roleId, teamId } }));
  flashSaved("Assignment saved");
  setAssignTarget(null);
 }

 function addRole() {
  if (!newRoleName.trim()) return;
  const newRole = {
   id: `role-${genId()}`,
   name: newRoleName.trim(),
   rank: roles.length + 1,
   color: newRoleColor,
   icon: newRoleIcon,
   protected: false,
   permissions: { ...newRolePerms },
   scope: "subtree",
  };
  saveRoles([...roles, newRole]);
  setNewRoleName(""); setNewRoleIcon("👤"); setNewRoleColor("#64748B"); setNewRolePerms({});
 }

 function deleteRole(id) {
  saveRoles(roles.filter(r => r.id !== id));
  setConfirmDelete(null);
 }

 function addTeam() {
  if (!newTeamName.trim()) return;
  const t = { id: `team-${genId()}`, name: newTeamName.trim(), parentId: newTeamParent || null, createdAt: new Date().toISOString() };
  saveTeamsData([...teams, t]);
  setNewTeamName(""); setNewTeamParent("");
 }

 function deleteTeam(id) {
  // Reparent children to parent of deleted
  const deleted = teams.find(t => t.id === id);
  const next = teams.filter(t => t.id !== id).map(t =>
   t.parentId === id ? { ...t, parentId: deleted?.parentId || null } : t
  );
  saveTeamsData(next);
  setConfirmDelete(null);
 }

 // Render tree of teams
 function TeamTree({ parentId = null, depth = 0 }) {
  const children = teams.filter(t => (t.parentId || null) === parentId);
  if (!children.length) return null;
  return (
   <div style={{ marginLeft: depth * 16 }}>
    {children.map(t => {
     const leader = assignments && Object.entries(assignments).find(([uid, a]) => a.teamId === t.id && roles.find(r => r.id === a.roleId && r.rank <= 2));
     const leaderName = leader ? allUsers.find(u => u.id === leader[0])?.name : null;
     return (
      <div key={t.id}>
       <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 12px", background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"8px", marginBottom:"4px" }}>
        <span style={{ fontSize:"0.9rem", color:"var(--text-muted)" }}>{"→".repeat(depth) || "📁"}</span>
        <div style={{ flex:1 }}>
         <div style={{ fontSize:"0.88rem", fontWeight:"600", color:"var(--text-primary)", fontFamily:F }}>{t.name}</div>
         {leaderName && <div style={{ fontSize:"0.72rem", color:"var(--text-dim)" }}>Lead: {leaderName}</div>}
        </div>
        <button onClick={() => setConfirmDelete({ type:"team", id:t.id, name:t.name })}
         style={{ background:"none", border:"none", color:"var(--text-dim)", cursor:"pointer", fontSize:"0.8rem", padding:"2px 6px" }}>✕</button>
       </div>
       <TeamTree parentId={t.id} depth={depth + 1} />
      </div>
     );
    })}
   </div>
  );
 }

 const sectionBtn = (id, label, icon) => (
  <button onClick={() => setActiveSection(id)} style={{
   display:"flex", alignItems:"center", gap:"6px", padding:"8px 14px", borderRadius:"8px",
   background: activeSection===id ? "rgba(29,201,232,0.1)" : "none",
   border: activeSection===id ? "1px solid rgba(29,201,232,0.25)" : "1px solid transparent",
   color: activeSection===id ? "var(--accent)" : "var(--text-muted)",
   fontWeight: activeSection===id ? "700" : "500",
   fontSize:"0.82rem", fontFamily:F, cursor:"pointer",
  }}>
   <span>{icon}</span><span>{label}</span>
  </button>
 );

 if (loading) return <div style={{ color:"var(--text-dim)", padding:"20px 0", fontStyle:"italic" }}>Loading…</div>;

 return (
  <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
   <div>
    <div style={{ fontSize:"clamp(0.9rem,2vw,1rem)", fontWeight:"700", color:"var(--text-primary)", fontFamily:"'DM Sans',system-ui,sans-serif" }}>Roles & {isOrg ? "Teams" : "Roles"}</div>
    <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", marginTop:"3px" }}>
     {isOrg ? "Define roles, build your team hierarchy, and assign members" : "Define roles for this community"}
    </div>
   </div>

   {/* Section nav */}
   <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
    {sectionBtn("roles", "Roles", "🎭")}
    {isOrg && sectionBtn("teams", "Teams", "🏗️")}
    {sectionBtn("members", "Assignments", "👥")}
   </div>

   {/* ── ROLES section ── */}
   {activeSection === "roles" && (
    <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
     {/* Existing roles */}
     {roles.sort((a,b) => a.rank - b.rank).map(role => (
      <div key={role.id} style={{ background:"var(--bg-1)", border:`1px solid ${role.color}44`, borderRadius:"12px", overflow:"hidden" }}>
       <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:"12px" }}>
        <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:`${role.color}22`, border:`2px solid ${role.color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", flexShrink:0 }}>
         {role.icon}
        </div>
        <div style={{ flex:1 }}>
         <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <span style={{ fontSize:"0.95rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F }}>{role.name}</span>
          {role.protected && <span style={{ fontSize:"0.6rem", fontWeight:"800", color:role.color, background:`${role.color}18`, borderRadius:"4px", padding:"1px 6px", letterSpacing:"0.06em" }}>BUILT-IN</span>}
          <span style={{ fontSize:"0.7rem", color:"var(--text-dim)" }}>rank {role.rank}</span>
         </div>
         <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginTop:"5px" }}>
          {ROLE_PERMISSIONS.filter(p => role.permissions?.[p.key]).map(p => (
           <span key={p.key} style={{ fontSize:"0.65rem", fontWeight:"600", color:"var(--text-muted)", background:"var(--bg-2)", borderRadius:"4px", padding:"1px 6px" }}>{p.label}</span>
          ))}
          {!Object.values(role.permissions||{}).some(Boolean) && <span style={{ fontSize:"0.72rem", color:"var(--text-dim)", fontStyle:"italic" }}>No permissions</span>}
         </div>
        </div>
        {!role.protected && (
         <button onClick={() => setEditingRole(editingRole?.id === role.id ? null : role)}
          style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"5px 10px", borderRadius:"6px", fontSize:"0.78rem", cursor:"pointer", fontFamily:F, flexShrink:0 }}>
          {editingRole?.id === role.id ? "Close" : "Edit"}
         </button>
        )}
       </div>

       {/* Inline editor for non-protected roles */}
       {editingRole?.id === role.id && (
        <div style={{ padding:"0 16px 16px", borderTop:"1px solid var(--border-1)" }}>
         <div style={{ marginTop:"12px", display:"flex", flexDirection:"column", gap:"10px" }}>
          <div style={{ display:"flex", gap:"8px" }}>
           <input value={editingRole.name} onChange={e => setEditingRole(r => ({...r, name:e.target.value}))}
            style={{ flex:1, background:"var(--bg-0)", border:"1px solid var(--border-1)", borderRadius:"6px", padding:"8px 12px", color:"var(--text-primary)", fontSize:"0.88rem", fontFamily:F }} />
           <input value={editingRole.icon} onChange={e => setEditingRole(r => ({...r, icon:e.target.value}))}
            style={{ width:"52px", background:"var(--bg-0)", border:"1px solid var(--border-1)", borderRadius:"6px", padding:"8px", color:"var(--text-primary)", fontSize:"1.2rem", textAlign:"center" }} />
           <input type="color" value={editingRole.color} onChange={e => setEditingRole(r => ({...r, color:e.target.value}))}
            style={{ width:"44px", height:"36px", border:"none", borderRadius:"6px", cursor:"pointer", background:"none" }} />
          </div>
          <div>
           <div style={{ fontSize:"0.75rem", fontWeight:"700", color:"var(--text-dim)", marginBottom:"6px", textTransform:"uppercase", letterSpacing:"0.08em" }}>Permissions</div>
           <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
            {ROLE_PERMISSIONS.map(p => (
             <label key={p.key} style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", padding:"4px 0" }}>
              <input type="checkbox" checked={!!editingRole.permissions?.[p.key]}
               onChange={e => setEditingRole(r => ({...r, permissions:{...r.permissions, [p.key]:e.target.checked}}))}
               style={{ cursor:"pointer" }} />
              <span style={{ fontSize:"0.82rem", color:"var(--text-secondary)", fontFamily:F }}>{p.label}</span>
             </label>
            ))}
           </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
           <span style={{ fontSize:"0.78rem", color:"var(--text-muted)", fontFamily:F }}>Scope:</span>
           {[["subtree","Team subtree only"],["org","Entire org"]].map(([v,l]) => (
            <button key={v} onClick={() => setEditingRole(r => ({...r, scope:v}))}
             style={{ padding:"4px 10px", borderRadius:"6px", fontSize:"0.75rem", fontWeight:"600", cursor:"pointer", fontFamily:F,
              background: editingRole.scope===v ? "rgba(29,201,232,0.1)" : "var(--bg-0)",
              border: editingRole.scope===v ? "1px solid rgba(29,201,232,0.3)" : "1px solid var(--border-1)",
              color: editingRole.scope===v ? "var(--accent)" : "var(--text-muted)" }}>
             {l}
            </button>
           ))}
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
           <button onClick={async () => { await saveRoles(roles.map(r => r.id === editingRole.id ? editingRole : r)); setEditingRole(null); }}
            style={{ background:"var(--accent)", color:"#000", border:"none", padding:"8px 20px", borderRadius:"8px", fontSize:"0.82rem", fontWeight:"800", cursor:"pointer", fontFamily:F }}>
            Save Role
           </button>
           <button onClick={() => setConfirmDelete({ type:"role", id:role.id, name:role.name })}
            style={{ background:"none", border:"1px solid rgba(224,85,119,0.3)", color:"#E05577", padding:"8px 16px", borderRadius:"8px", fontSize:"0.82rem", cursor:"pointer", fontFamily:F }}>
            Delete
           </button>
          </div>
         </div>
        </div>
       )}
      </div>
     ))}

     {/* Add new role */}
     <div style={{ background:"var(--bg-1)", border:"1px dashed var(--border-1)", borderRadius:"12px", padding:"16px" }}>
      <div style={{ fontSize:"0.8rem", fontWeight:"700", color:"var(--text-muted)", marginBottom:"10px", textTransform:"uppercase", letterSpacing:"0.08em" }}>New Role</div>
      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
       <div style={{ display:"flex", gap:"8px" }}>
        <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Role name (e.g. Team Lead)"
         style={{ flex:1, background:"var(--bg-0)", border:"1px solid var(--border-1)", borderRadius:"6px", padding:"8px 12px", color:"var(--text-primary)", fontSize:"0.88rem", fontFamily:F }} />
        <input value={newRoleIcon} onChange={e => setNewRoleIcon(e.target.value)} maxLength={2}
         style={{ width:"52px", background:"var(--bg-0)", border:"1px solid var(--border-1)", borderRadius:"6px", padding:"8px", color:"var(--text-primary)", fontSize:"1.2rem", textAlign:"center" }} />
        <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)}
         style={{ width:"44px", height:"36px", border:"none", borderRadius:"6px", cursor:"pointer", background:"none" }} />
       </div>
       <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
        {ROLE_PERMISSIONS.map(p => (
         <label key={p.key} style={{ display:"flex", alignItems:"center", gap:"4px", cursor:"pointer", padding:"4px 8px", borderRadius:"6px", border:"1px solid var(--border-1)", background: newRolePerms[p.key] ? "rgba(29,201,232,0.08)" : "none" }}>
          <input type="checkbox" checked={!!newRolePerms[p.key]} onChange={e => setNewRolePerms(p2 => ({...p2, [p.key]:e.target.checked}))} style={{ cursor:"pointer" }} />
          <span style={{ fontSize:"0.72rem", color:"var(--text-secondary)", fontFamily:F }}>{p.label}</span>
         </label>
        ))}
       </div>
       <button onClick={addRole} disabled={!newRoleName.trim()}
        style={{ background:"var(--accent)", color:"#000", border:"none", padding:"9px 20px", borderRadius:"8px", fontSize:"0.82rem", fontWeight:"800", cursor:"pointer", fontFamily:F, opacity:newRoleName.trim()?1:0.4, alignSelf:"flex-start" }}>
        + Add Role
       </button>
      </div>
     </div>
    </div>
   )}

   {/* ── TEAMS section (org only) ── */}
   {activeSection === "teams" && isOrg && (
    <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
     <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", lineHeight:1.5 }}>
      Build your org tree. Teams can be nested to any depth. Use Assignments to put people in their teams.
     </div>

     {teams.length === 0 ? (
      <div style={{ textAlign:"center", padding:"30px", color:"var(--text-dim)", fontStyle:"italic" }}>No teams yet. Add your first one below.</div>
     ) : (
      <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
       <TeamTree parentId={null} depth={0} />
      </div>
     )}

     {/* Add team */}
     <div style={{ background:"var(--bg-1)", border:"1px dashed var(--border-1)", borderRadius:"12px", padding:"16px" }}>
      <div style={{ fontSize:"0.8rem", fontWeight:"700", color:"var(--text-muted)", marginBottom:"10px", textTransform:"uppercase", letterSpacing:"0.08em" }}>New Team</div>
      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
       <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Team name (e.g. East Region, NYC Office)"
        style={{ background:"var(--bg-0)", border:"1px solid var(--border-1)", borderRadius:"6px", padding:"8px 12px", color:"var(--text-primary)", fontSize:"0.88rem", fontFamily:F }} />
       <div>
        <div style={{ fontSize:"0.75rem", color:"var(--text-dim)", marginBottom:"4px" }}>Parent team (optional — leave blank for top-level)</div>
        <select value={newTeamParent} onChange={e => setNewTeamParent(e.target.value)}
         style={{ background:"var(--bg-0)", border:"1px solid var(--border-1)", borderRadius:"6px", padding:"8px 12px", color:"var(--text-primary)", fontSize:"0.88rem", fontFamily:F, width:"100%" }}>
         <option value="">— Top level —</option>
         {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
       </div>
       <button onClick={addTeam} disabled={!newTeamName.trim()}
        style={{ background:"var(--accent)", color:"#000", border:"none", padding:"9px 20px", borderRadius:"8px", fontSize:"0.82rem", fontWeight:"800", cursor:"pointer", fontFamily:F, opacity:newTeamName.trim()?1:0.4, alignSelf:"flex-start" }}>
        + Add Team
       </button>
      </div>
     </div>
    </div>
   )}

   {/* ── ASSIGNMENTS section ── */}
   {activeSection === "members" && (
    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
     <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", lineHeight:1.5 }}>
      Assign roles and teams to each member. Only affects permissions within this space.
     </div>
     {allUsers.map(u => {
      const asgn = assignments[u.id] || {};
      const role = roles.find(r => r.id === asgn.roleId);
      const team = teams.find(t => t.id === asgn.teamId);
      const isEditing = assignTarget === u.id;
      return (
       <div key={u.id} style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"10px", overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:"12px" }}>
         <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:`${role?.color || "#64748B"}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.9rem", flexShrink:0 }}>
          {role?.icon || "👤"}
         </div>
         <div style={{ flex:1 }}>
          <div style={{ fontSize:"0.88rem", fontWeight:"600", color:"var(--text-primary)", fontFamily:F }}>{u.name}</div>
          <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:"1px" }}>
           {role ? <span style={{ color:role.color, fontWeight:"600" }}>{role.name}</span> : <span style={{ fontStyle:"italic" }}>No role</span>}
           {team && <span style={{ color:"var(--text-dim)" }}> · {team.name}</span>}
          </div>
         </div>
         <button onClick={() => { setAssignTarget(isEditing ? null : u.id); setAssignRole(asgn.roleId||""); setAssignTeam(asgn.teamId||""); }}
          style={{ background:"none", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"5px 10px", borderRadius:"6px", fontSize:"0.78rem", cursor:"pointer", fontFamily:F }}>
          {isEditing ? "Cancel" : "Assign"}
         </button>
        </div>
        {isEditing && (
         <div style={{ padding:"0 14px 14px", borderTop:"1px solid var(--border-1)", display:"flex", flexDirection:"column", gap:"8px", marginTop:"0" }}>
          <div style={{ marginTop:"12px" }}>
           <div style={{ fontSize:"0.75rem", color:"var(--text-dim)", marginBottom:"4px" }}>Role</div>
           <select value={assignRole} onChange={e => setAssignRole(e.target.value)}
            style={{ background:"var(--bg-0)", border:"1px solid var(--border-1)", borderRadius:"6px", padding:"8px 12px", color:"var(--text-primary)", fontSize:"0.88rem", fontFamily:F, width:"100%" }}>
            <option value="">— No role —</option>
            {roles.sort((a,b) => a.rank-b.rank).map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
           </select>
          </div>
          {isOrg && (
           <div>
            <div style={{ fontSize:"0.75rem", color:"var(--text-dim)", marginBottom:"4px" }}>Team</div>
            <select value={assignTeam} onChange={e => setAssignTeam(e.target.value)}
             style={{ background:"var(--bg-0)", border:"1px solid var(--border-1)", borderRadius:"6px", padding:"8px 12px", color:"var(--text-primary)", fontSize:"0.88rem", fontFamily:F, width:"100%" }}>
             <option value="">— No team —</option>
             {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
           </div>
          )}
          <button onClick={() => commitAssignment(u.id, assignRole, isOrg ? assignTeam : null)}
           style={{ background:"var(--accent)", color:"#000", border:"none", padding:"8px 20px", borderRadius:"8px", fontSize:"0.82rem", fontWeight:"800", cursor:"pointer", fontFamily:F, alignSelf:"flex-start" }}>
           Save Assignment
          </button>
         </div>
        )}
       </div>
      );
     })}
    </div>
   )}

   {/* Confirm delete dialog */}
   {confirmDelete && (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
     <div style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"16px", padding:"24px", maxWidth:"360px", width:"100%", fontFamily:F }}>
      <div style={{ fontSize:"1rem", fontWeight:"700", color:"var(--text-primary)", marginBottom:"8px" }}>
       Delete {confirmDelete.type === "role" ? "Role" : "Team"}?
      </div>
      <div style={{ fontSize:"0.88rem", color:"var(--text-muted)", marginBottom:"20px", lineHeight:1.5 }}>
       "{confirmDelete.name}" will be permanently deleted.
       {confirmDelete.type === "team" && " Child teams will be moved up one level."}
      </div>
      <div style={{ display:"flex", gap:"10px" }}>
       <button onClick={() => confirmDelete.type === "role" ? deleteRole(confirmDelete.id) : deleteTeam(confirmDelete.id)}
        style={{ flex:1, background:"#E05577", color:"#fff", border:"none", padding:"10px", borderRadius:"8px", fontSize:"0.88rem", fontWeight:"700", cursor:"pointer" }}>
        Delete
       </button>
       <button onClick={() => setConfirmDelete(null)}
        style={{ flex:1, background:"var(--bg-0)", border:"1px solid var(--border-1)", color:"var(--text-muted)", padding:"10px", borderRadius:"8px", fontSize:"0.88rem", cursor:"pointer" }}>
        Cancel
       </button>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

function GodModeTab({ allUsers, admins, onToggleAdmin, onDelete, flashSaved, user, isSuperAdmin }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const [spaceIdx, setSpaceIdx] = useState([]);
 const [userReg, setUserReg] = useState([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState("");
 const [gmTab, setGmTab] = useState("overview");
 const [expandedId, setExpandedId] = useState(null);
 const [spaceDetails, setSpaceDetails] = useState({});
 const [editingSpace, setEditingSpace] = useState(null);
 const [confirmAction, setConfirmAction] = useState(null);
 const [toast, setToast] = useState("");
 const [saving, setSaving] = useState(false);
 const [suspendedIds, setSuspendedIds] = useState(() => { try { return JSON.parse(localStorage.getItem("cadence-suspended")||"[]"); } catch { return []; } });
 const [bannedIds, setBannedIds] = useState(() => { try { return JSON.parse(localStorage.getItem("cadence-banned")||"[]"); } catch { return []; } });
 const [pendingOrgs, setPendingOrgs] = useState([]);
  const [licenseModal, setLicenseModal] = useState(null);
  const [licTier, setLicTier] = useState("pro");
  const [licDuration, setLicDuration] = useState("30");

 function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2800); }
 function persistSuspended(ids) { setSuspendedIds(ids); try { localStorage.setItem("cadence-suspended", JSON.stringify(ids)); } catch {} }
 function persistBanned(ids) { setBannedIds(ids); try { localStorage.setItem("cadence-banned", JSON.stringify(ids)); } catch {} }

 async function assignLicense(userId, plan, days) {
  setSaving(true);
  try {
   const expiresAt = days === 0 ? null : new Date(Date.now() + days * 86400000).toISOString();
   await window._sb?.from("user_subscriptions").upsert(
    { user_id: userId, plan, plan_expires_at: expiresAt, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
   );
   flash(days === 0 ? `${plan.toUpperCase()} — indefinite` : `${plan.toUpperCase()} — ${days}d`);
   setLicenseModal(null);
  } catch { flash("Failed"); }
  setSaving(false);
 }

 async function reload() {
  setLoading(true);
  try {
   const [idx, reg, pending] = await Promise.all([loadSpaceIndex(), loadUserRegistry(), loadPendingOrgs()]);
   setSpaceIdx(idx || []);
   setUserReg(reg || []);
   setPendingOrgs(pending || []);
  } catch {}
  setLoading(false);
 }
 useEffect(() => { reload(); }, []);

 async function doDeleteSpace(spaceId) {
  setSaving(true);
  await saDeleteSpace(spaceId);
  setSpaceIdx(prev => prev.filter(s => s.id !== spaceId));
  setConfirmAction(null); setSaving(false); flash("Space deleted");
 }

 async function doRemoveUser(spaceId, spaceType, userId, userName) {
  setSaving(true);
  await saRemoveUserFromSpace(spaceId, spaceType, userId);
  setSpaceDetails(p => {
   if (!p[spaceId]) return p;
   return { ...p, [spaceId]: { ...p[spaceId], users: p[spaceId].users.filter(u => u.id !== userId) } };
  });
  setConfirmAction(null); setSaving(false); flash(`Removed ${userName}`);
 }

 async function doWipeData(spaceId, userId, userName) {
  setSaving(true);
  await saWipeUserData(spaceId, userId);
  setConfirmAction(null); setSaving(false); flash(`Wiped data for ${userName}`);
 }

 async function doDeleteFromRegistry(userId) {
  setSaving(true);
  await saDeleteUserFromRegistry(userId);
  setUserReg(prev => prev.filter(r => r.userId !== userId));
  setConfirmAction(null); setSaving(false); flash("User deleted from registry");
 }

 async function toggleExpand(space) {
  if (expandedId === space.id) { setExpandedId(null); return; }
  setExpandedId(space.id);
  if (spaceDetails[space.id]) return;
  const details = await saGetAllSpaceDetails(space.id, space.type);
  setSpaceDetails(p => ({ ...p, [space.id]: details }));
 }

 async function commitRename() {
  if (!editingSpace?.name?.trim()) return;
  setSaving(true);
  await saUpdateSpaceMeta(editingSpace.id, { name: editingSpace.name.trim(), description: editingSpace.description || "" });
  setSpaceIdx(prev => prev.map(s => s.id === editingSpace.id ? { ...s, name: editingSpace.name.trim() } : s));
  setSaving(false); setEditingSpace(null); flash("Space renamed");
 }

 const q = filter.toLowerCase();
 const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
 const dormantSpaces = spaceIdx.filter(s => s.type !== "solo" && s.createdAt && (Date.now() - s.createdAt) > NINETY_DAYS);
 const filteredSpaces = spaceIdx.filter(s =>
  !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
 );
 const filteredUsers = userReg.filter(r =>
  !q || r.userName?.toLowerCase().includes(q) || r.spaceName?.toLowerCase().includes(q) || r.userId?.toLowerCase().includes(q)
 );
 const counts = {
  total: spaceIdx.length, org: spaceIdx.filter(s=>s.type==="org").length,
  community: spaceIdx.filter(s=>s.type==="community").length, solo: spaceIdx.filter(s=>s.type==="solo").length,
  users: userReg.length, dormant: dormantSpaces.length,
 };

 const typeColor = { org:"#1DC9E8", community:"#A855F7", solo:"#888" };
 const typeIcon  = { org:"🏢", community:"🌐", solo:"👤" };

 const btn = (c) => ({ background:"none", border:`1px solid ${c}40`, color:c, padding:"3px 9px", borderRadius:"6px", fontSize:"0.75rem", fontWeight:"600", cursor:"pointer", fontFamily:F });
 const tabBtn = (active) => ({
  background: active ? "rgba(29,201,232,0.12)" : "none",
  border: "none",
  color: active ? "#1DC9E8" : "#888",
  padding:"8px 16px", borderRadius:"8px", cursor:"pointer", fontFamily:F,
  fontWeight: active ? "700" : "500", fontSize:"0.88rem",
  transition:"all 0.12s", WebkitTapHighlightColor:"transparent",
 });

 return (<>
  <div style={{ maxWidth:"900px" }}>
   {/* Toast */}
   {toast && (
    <div style={{ position:"fixed", bottom:"24px", left:"50%", transform:"translateX(-50%)", background:"var(--bg-2)", border:"1px solid var(--accent)", color:"var(--accent)", padding:"10px 20px", borderRadius:"10px", fontSize:"0.875rem", fontFamily:F, fontWeight:"600", zIndex:9000, pointerEvents:"none", whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(29,201,232,0.25)" }}>
     ✓ {toast}
    </div>
   )}

   {/* Confirm dialog */}
   {confirmAction && (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:9001, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
     <div style={{ background:"var(--bg-1)", border:"1px solid rgba(244,63,94,0.3)", borderRadius:"14px", padding:"24px", maxWidth:"380px", width:"100%", fontFamily:F }}>
      <div style={{ fontSize:"1rem", fontWeight:"800", color:"#E05577", marginBottom:"8px" }}>⚠ Confirm</div>
      <div style={{ fontSize:"0.88rem", color:"var(--text-secondary)", lineHeight:1.6, marginBottom:"20px" }}>{confirmAction.message}</div>
      <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
       <button onClick={() => setConfirmAction(null)} style={{ ...btn("var(--text-dim)"), padding:"7px 16px" }}>Cancel</button>
       <button disabled={saving} onClick={() => {
        if (confirmAction.type === "deletespace") doDeleteSpace(confirmAction.spaceId);
        else if (confirmAction.type === "removeuser") doRemoveUser(confirmAction.spaceId, confirmAction.spaceType, confirmAction.userId, confirmAction.name);
        else if (confirmAction.type === "wipe") doWipeData(confirmAction.spaceId, confirmAction.userId, confirmAction.name);
        else if (confirmAction.type === "delreg") doDeleteFromRegistry(confirmAction.userId);
        else if (confirmAction.type === "rejectOrg") { rejectOrg(confirmAction.orgId).then(() => { setPendingOrgs(prev => prev.filter(o => o.id !== confirmAction.orgId)); flash(`"${confirmAction.orgName}" rejected`); setConfirmAction(null); }); }
       }} style={{ ...btn("#E05577"), padding:"7px 16px", fontSize:"0.85rem", background:"rgba(224,85,119,0.1)" }}>
        {saving ? "Working…" : "Confirm"}
       </button>
      </div>
     </div>
    </div>
   )}

   <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px" }}>
    <div style={{ fontSize:"1.1rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:"'DM Sans',system-ui,sans-serif" }}>👑 God Mode</div>
    <span style={{ fontSize:"0.68rem", fontWeight:"800", color:"#1DC9E8", background:"rgba(29,201,232,0.1)", border:"1px solid rgba(29,201,232,0.25)", borderRadius:"6px", padding:"3px 9px" }}>SUPER ADMIN</span>
   </div>

   {/* Sub-tabs */}
   <div style={{ display:"flex", gap:"4px", marginBottom:"20px", background:"var(--bg-1)", borderRadius:"10px", padding:"4px", border:"1px solid var(--border-1)" }}>
    {[["overview","📊 Overview"],["pending",`⏳ Pending${pendingOrgs.length ? ` (${pendingOrgs.length})` : ""}`],["spaces","🏗 Spaces"],["users","👥 Users"],["dormant","💤 Dormant"],["subs","💳 Subscriptions"]].map(([id,label]) => (
     <button key={id} style={tabBtn(gmTab===id)} onClick={() => setGmTab(id)}>{label}</button>
    ))}
   </div>

   {/* Search bar */}
   {gmTab !== "overview" && (
    <input value={filter} onChange={e => setFilter(e.target.value)}
     placeholder={gmTab === "users" ? "Search users by name, ID, or space…" : "Search spaces by name or ID…"}
     style={{ width:"100%", background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"9px", padding:"10px 14px", fontSize:"0.9rem", fontFamily:F, outline:"none", color:"var(--text-primary)", boxSizing:"border-box", marginBottom:"14px" }}
    />
   )}

   {loading ? (
    <div style={{ color:"var(--text-dim)", fontSize:"0.875rem", fontStyle:"italic", padding:"20px 0" }}>Loading registry…</div>
   ) : gmTab === "overview" ? (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px,1fr))", gap:"10px" }}>
     {[
      ["🏢 Orgs", counts.org],
      ["⚡ Crews", counts.community],
      ["👤 Solo Users", counts.solo],
      ["📋 Total Spaces", counts.total],
      ["👥 Registry Entries", counts.users],
      ["💤 Dormant Spaces", counts.dormant],
     ].map(([label, val]) => (
      <div key={label} style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"12px", padding:"16px 14px", textAlign:"center" }}>
       <div style={{ fontSize:"1.6rem", fontWeight:"900", color:"var(--accent)", fontFamily:"'DM Sans',sans-serif", lineHeight:1 }}>{val}</div>
       <div style={{ fontSize:"0.72rem", color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.08em", marginTop:"5px", fontWeight:"600" }}>{label}</div>
      </div>
     ))}
    </div>
   ) : gmTab === "pending" ? (
    <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
     <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", lineHeight:1.6, padding:"10px 14px", background:"rgba(29,201,232,0.04)", border:"1px solid rgba(29,201,232,0.1)", borderRadius:"8px" }}>
      <strong style={{ color:"var(--text-primary)" }}>Small business?</strong> You can manually approve any org regardless of what verification they submitted — use your judgment. Orgs that submitted a LinkedIn URL or work email appear here. Orgs with no proof at all don't appear publicly until you manually approve them.
     </div>
     {pendingOrgs.length === 0 ? (
      <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--text-dim)", fontStyle:"italic" }}>
       No orgs pending verification. 🎉
      </div>
     ) : pendingOrgs.map(org => {
      const submittedDaysAgo = org.createdAt ? Math.floor((Date.now() - new Date(org.createdAt).getTime()) / 86400000) : 0;
      const canPing = submittedDaysAgo >= 2;
      const pingKey = `cadence-ping-sent-${org.id}`;
      const lastPing = (() => { try { return localStorage.getItem(pingKey); } catch { return null; } })();
      const pingDaysAgo = lastPing ? Math.floor((Date.now() - new Date(lastPing).getTime()) / 86400000) : null;
      const canPingAgain = !lastPing || pingDaysAgo >= 3;

      return (
       <div key={org.id} style={{ background:"var(--bg-1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"12px", padding:"16px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"12px" }}>
         <span style={{ fontSize:"1.4rem" }}>🏢</span>
         <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
           <div style={{ fontSize:"1rem", fontWeight:"700", color:"var(--text-primary)", fontFamily:F }}>{org.name}</div>
           {submittedDaysAgo >= 2 && (
            <span style={{ fontSize:"0.62rem", fontWeight:"700", color:"#F59E0B", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"4px", padding:"1px 6px" }}>
             {submittedDaysAgo}d waiting
            </span>
           )}
          </div>
          <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginTop:"2px" }}>
           Created {new Date(org.createdAt).toLocaleDateString()} · ID: {org.id}
          </div>
          {/* Verification proof */}
          {org.verificationMethod ? (
           <div style={{ marginTop:"8px", padding:"8px 12px", background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:"8px" }}>
            <div style={{ fontSize:"0.72rem", fontWeight:"700", color:"#F59E0B", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"4px" }}>
             Submitted: {org.verificationMethod === "email" ? "💼 Work Email" : "🔗 LinkedIn URL"}
            </div>
            <div style={{ fontSize:"0.85rem", color:"var(--text-primary)", fontFamily:"monospace", wordBreak:"break-all" }}>
             {org.verificationValue || "No value provided"}
            </div>
           </div>
          ) : (
           <div style={{ marginTop:"8px", padding:"8px 12px", background:"rgba(100,116,139,0.08)", border:"1px solid rgba(100,116,139,0.2)", borderRadius:"8px", fontSize:"0.78rem", color:"var(--text-dim)", fontStyle:"italic" }}>
            No proof submitted — small business or personal brand. Manual approval only.
           </div>
          )}
          {/* Ping status */}
          {canPing && (
           <div style={{ marginTop:"8px", display:"flex", alignItems:"center", gap:"8px" }}>
            <button
             onClick={() => {
              try { localStorage.setItem(pingKey, new Date().toISOString()); } catch {}
              flash(`Ping sent to ${org.name} founder`);
              // In production this would DM the org creator
             }}
             disabled={!canPingAgain}
             style={{ fontSize:"0.72rem", fontWeight:"700", padding:"4px 10px", borderRadius:"6px", cursor:canPingAgain?"pointer":"default", fontFamily:F,
              background: canPingAgain ? "rgba(29,201,232,0.08)" : "rgba(100,116,139,0.06)",
              border: canPingAgain ? "1px solid rgba(29,201,232,0.25)" : "1px solid var(--border-1)",
              color: canPingAgain ? "var(--accent)" : "var(--text-dim)", opacity:canPingAgain?1:0.6 }}>
             {canPingAgain ? "📨 Ping founder" : `Pinged ${pingDaysAgo}d ago`}
            </button>
            {lastPing && <span style={{ fontSize:"0.7rem", color:"var(--text-dim)" }}>Last: {new Date(lastPing).toLocaleDateString()}</span>}
           </div>
          )}
         </div>
        </div>
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
         <button onClick={async () => {
          await approveOrg(org.id);
          setPendingOrgs(prev => prev.filter(o => o.id !== org.id));
          flash(`✓ "${org.name}" approved`);
         }} style={{ flex:1, minWidth:"120px", background:"rgba(74,207,134,0.12)", border:"1px solid rgba(74,207,134,0.3)", color:"#4ACF86", padding:"9px", borderRadius:"8px", fontSize:"0.82rem", fontWeight:"700", cursor:"pointer", fontFamily:F }}>
          ✓ Approve
         </button>
         <button onClick={async () => {
          // Manual verify — no proof needed, you're vouching for them
          await approveOrg(org.id);
          setPendingOrgs(prev => prev.filter(o => o.id !== org.id));
          flash(`✓ "${org.name}" manually verified`);
         }} style={{ flex:1, minWidth:"120px", background:"rgba(168,85,247,0.08)", border:"1px solid rgba(168,85,247,0.25)", color:"#A855F7", padding:"9px", borderRadius:"8px", fontSize:"0.82rem", fontWeight:"700", cursor:"pointer", fontFamily:F }}>
          🛡️ Manual Verify
         </button>
         <button onClick={() => setConfirmAction({ type:"rejectOrg", orgId:org.id, orgName:org.name, message:`Reject "${org.name}"? The org will remain but won't appear in public search. The owner will see a rejection notice.` })}
          style={{ flex:1, minWidth:"100px", background:"rgba(224,85,119,0.08)", border:"1px solid rgba(224,85,119,0.25)", color:"#E05577", padding:"9px", borderRadius:"8px", fontSize:"0.82rem", fontWeight:"700", cursor:"pointer", fontFamily:F }}>
          ✕ Reject
         </button>
        </div>
       </div>
      );
     })}
    </div>
   ) : gmTab === "users" ? (
    <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
     {filteredUsers.length === 0 && <div style={{ color:"var(--text-dim)", fontStyle:"italic" }}>No users found.</div>}
     {filteredUsers.map(r => {
      const isSuspended = suspendedIds.includes(r.userId);
      const isBanned = bannedIds.includes(r.userId);
      return (
       <div key={r.userId + r.spaceName} style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"10px", padding:"12px 14px", display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:"var(--accent-dim)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem", fontWeight:"700", color:"var(--accent)", flexShrink:0, fontFamily:F }}>
         {(r.userName||"?").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
         <div style={{ fontSize:"0.9rem", fontWeight:"600", color:"var(--text-primary)", display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
          {r.userName}
          {isSuspended && <span style={{ fontSize:"0.62rem", background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)", color:"#F59E0B", padding:"1px 6px", borderRadius:"4px", fontWeight:"700" }}>SUSPENDED</span>}
          {isBanned && <span style={{ fontSize:"0.62rem", background:"rgba(224,85,119,0.12)", border:"1px solid rgba(224,85,119,0.3)", color:"#E05577", padding:"1px 6px", borderRadius:"4px", fontWeight:"700" }}>BANNED</span>}
         </div>
         <div style={{ fontSize:"0.72rem", color:"var(--text-dim)", marginTop:"1px" }}>{r.spaceName} · {r.spaceType}</div>
        </div>
        <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", justifyContent:"flex-end" }}>
         <button onClick={() => { setLicTier("pro"); setLicDuration("30"); setLicenseModal({ userId:r.userId, userName:r.userName }); }}
          style={{ background:"rgba(29,201,232,0.1)", border:"1px solid rgba(29,201,232,0.3)", color:"var(--accent)", padding:"4px 10px", borderRadius:"6px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>
          🎟 License
         </button>
         {!(r.userId === user?.id && isSuperAdmin) && <button onClick={() => {
          if (isSuspended) persistSuspended(suspendedIds.filter(id => id !== r.userId));
          else persistSuspended([...suspendedIds, r.userId]);
          flash(isSuspended ? "Suspension lifted" : "User suspended");
         }} style={btn(isSuspended ? "#4ACF86" : "#F59E0B")}>
          {isSuspended ? "Unsuspend" : "Suspend"}
         </button>}
         {!(r.userId === user?.id && isSuperAdmin) && <button onClick={() => {
          if (isBanned) persistBanned(bannedIds.filter(id => id !== r.userId));
          else persistBanned([...bannedIds, r.userId]);
          flash(isBanned ? "Ban lifted" : "User banned");
         }} style={btn(isBanned ? "#4ACF86" : "#E05577")}>
          {isBanned ? "Unban" : "Ban"}
         </button>}
         {!(r.userId === user?.id && isSuperAdmin) && <button onClick={() => setConfirmAction({ type:"wipe", spaceId:r.spaceId, userId:r.userId, name:r.userName, message:`Wipe all activity data for "${r.userName}" in "${r.spaceName}"? Their account remains but all logs are erased.` })} style={btn("#888")}>
          Wipe Data
         </button>}
         {!(r.userId === user?.id && isSuperAdmin) && <button onClick={() => setConfirmAction({ type:"delreg", userId:r.userId, message:`Fully delete "${r.userName}"? Permanently wipes all data: activity, goals, messages, identity. They can sign up fresh.` })} style={{ ...btn("#E05577"), background:"rgba(224,85,119,0.08)" }}>
          Delete
         </button>}
         {(r.userId === user?.id && isSuperAdmin) && <span style={{ fontSize:"0.72rem", color:"var(--accent)", padding:"3px 8px", background:"rgba(29,201,232,0.1)", borderRadius:"6px" }}>🛡 Super Admin</span>}
        </div>
       </div>
      );
     })}
    </div>
   ) : gmTab === "dormant" ? (
    <div>
     <p style={{ fontSize:"0.85rem", color:"var(--text-muted)", marginBottom:"16px", lineHeight:1.6 }}>
      Spaces that haven't had any recorded activity for 90+ days. Consider reaching out or archiving.
     </p>
     {dormantSpaces.length === 0 && <div style={{ color:"var(--text-dim)", fontStyle:"italic" }}>No dormant spaces found.</div>}
     {dormantSpaces.map(space => (
      <div key={space.id} style={{ background:"var(--bg-1)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:"10px", padding:"12px 14px", marginBottom:"6px", display:"flex", alignItems:"center", gap:"10px" }}>
       <span style={{ fontSize:"1.1rem" }}>{typeIcon[space.type] || "◆"}</span>
       <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:"0.9rem", fontWeight:"600", color:"var(--text-primary)" }}>{space.name}</div>
        <div style={{ fontSize:"0.72rem", color:"var(--text-dim)", marginTop:"1px" }}>Created {new Date(space.createdAt).toLocaleDateString()} · {space.type}</div>
       </div>
       <button onClick={() => setConfirmAction({ type:"deletespace", spaceId:space.id, message:`Permanently delete "${space.name}" and all its data?` })} style={{ ...btn("#E05577"), background:"rgba(224,85,119,0.08)" }}>
        Delete
       </button>
      </div>
     ))}
    </div>
   ) : gmTab === "subs" ? (
    <SubscriptionsTab flash={flash} />
   ) : (
    /* Spaces tab */
    <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
     {filteredSpaces.length === 0 && <div style={{ color:"var(--text-dim)", fontStyle:"italic" }}>No spaces found.</div>}
     {filteredSpaces.map(space => {
      const isExp = expandedId === space.id;
      const details = spaceDetails[space.id];
      const isEditing = editingSpace?.id === space.id;
      return (
       <div key={space.id} style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"10px", overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"11px 14px" }}>
         <span style={{ fontSize:"1.1rem", flexShrink:0 }}>{typeIcon[space.type] || "◆"}</span>
         <div style={{ flex:1, minWidth:0 }}>
          {isEditing ? (
           <div style={{ display:"flex", gap:"6px", alignItems:"center", flexWrap:"wrap" }}>
            <input value={editingSpace.name} onChange={e => setEditingSpace(p => ({ ...p, name:e.target.value }))}
             style={{ background:"var(--bg-2)", border:"1px solid var(--border-1)", borderRadius:"6px", padding:"4px 8px", fontSize:"0.875rem", color:"var(--text-primary)", fontFamily:F, outline:"none", width:"160px" }} autoFocus
             onKeyDown={e => { if(e.key==="Enter") commitRename(); if(e.key==="Escape") setEditingSpace(null); }} />
            <button onClick={commitRename} disabled={saving} style={{ ...btn("#1DC9E8"), padding:"4px 10px" }}>Save</button>
            <button onClick={() => setEditingSpace(null)} style={{ ...btn("#888"), padding:"4px 10px" }}>Cancel</button>
           </div>
          ) : (
           <>
            <div style={{ fontSize:"0.925rem", fontWeight:"600", color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{space.name}</div>
            <div style={{ display:"flex", gap:"6px", alignItems:"center", marginTop:"1px" }}>
             <span style={{ fontSize:"0.68rem", color:typeColor[space.type]||"#888", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.1em" }}>{space.type}</span>
             <span style={{ fontSize:"0.65rem", color:"var(--text-dim)", fontFamily:"monospace" }}>{space.id}</span>
            </div>
           </>
          )}
         </div>
         {!isEditing && <>
          <button onClick={() => setEditingSpace({ id:space.id, name:space.name, description:space.description||"" })} style={btn("#888")}>✏ Edit</button>
          <button onClick={() => toggleExpand(space)} style={btn("#1DC9E8")}>{isExp ? "▲ Hide" : "▾ Members"}</button>
          <button onClick={() => setConfirmAction({ type:"deletespace", spaceId:space.id, message:`Permanently delete "${space.name}" and all its data? This cannot be undone.` })} style={{ ...btn("#E05577"), background:"rgba(224,85,119,0.08)" }}>🗑</button>
         </>}
        </div>
        {isExp && (
         <div style={{ borderTop:"1px solid var(--border-1)", padding:"12px 14px" }}>
          {!details ? <div style={{ color:"var(--text-dim)", fontSize:"0.8rem", fontStyle:"italic" }}>Loading…</div> : (
           <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
            <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:"700", marginBottom:"4px" }}>Members ({details.users.length})</div>
            {details.users.map(u => (
             <div key={u.id} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"7px 10px", background:"var(--bg-2)", borderRadius:"8px" }}>
              <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:"var(--accent-dim)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.72rem", fontWeight:"700", color:"var(--accent)", flexShrink:0 }}>
               {(u.name||"?").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
               <div style={{ fontSize:"0.85rem", color:"var(--text-primary)", fontWeight:"500" }}>
                {u.name}
                {details.admins?.includes(u.id) && <span style={{ marginLeft:"6px", fontSize:"0.62rem", background:"rgba(29,201,232,0.1)", color:"#1DC9E8", padding:"1px 6px", borderRadius:"4px", fontWeight:"700" }}>ADMIN</span>}
               </div>
              </div>
              {!(u.id === user?.id && isSuperAdmin) && <button onClick={() => setConfirmAction({ type:"wipe", spaceId:space.id, userId:u.id, name:u.name, message:`Wipe all data for "${u.name}" in "${space.name}"?` })} style={{ ...btn("#888"), padding:"2px 7px" }}>Wipe</button>}
              {!(u.id === user?.id && isSuperAdmin) && <button onClick={() => setConfirmAction({ type:"removeuser", spaceId:space.id, spaceType:space.type, userId:u.id, name:u.name, message:`Remove "${u.name}" from "${space.name}"?` })} style={{ ...btn("#E05577"), padding:"2px 7px" }}>✕</button>}
             </div>
            ))}
           </div>
          )}
         </div>
        )}
       </div>
      );
     })}
    </div>
   )}
  </div>

   {/* ── LICENSE MODAL ── */}
   {licenseModal && (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
     <div style={{ background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"16px", padding:"24px", width:"100%", maxWidth:"360px" }}>
      <div style={{ fontSize:"1rem", fontWeight:800, color:"var(--text-primary)", marginBottom:"4px" }}>🎟 Assign License</div>
      <div style={{ fontSize:"0.75rem", fontFamily:"monospace", color:"var(--text-muted)", marginBottom:"20px", wordBreak:"break-all" }}>{licenseModal.userName}</div>
      <div style={{ marginBottom:"14px" }}>
       <div style={{ fontSize:"0.62rem", fontWeight:800, color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Tier</div>
       <div style={{ display:"flex", gap:"6px" }}>
        {[["free","Free"],["pro","Pro"],["team","Teams"]].map(([v,lbl]) => (
         <button key={v} onClick={()=>setLicTier(v)}
          style={{ flex:1, background:licTier===v?"rgba(29,201,232,0.12)":"none", border:`1px solid ${licTier===v?"var(--accent)":"var(--border-1)"}`, borderRadius:"8px", padding:"8px", fontSize:"0.78rem", fontWeight:licTier===v?800:500, color:licTier===v?"var(--accent)":"var(--text-muted)", cursor:"pointer" }}>
          {lbl}
         </button>
        ))}
       </div>
      </div>
      <div style={{ marginBottom:"20px" }}>
       <div style={{ fontSize:"0.62rem", fontWeight:800, color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Duration</div>
       <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
        {[["7","7 days"],["30","30 days"],["90","90 days"],["365","1 year"],["0","Indefinite ∞"]].map(([v,lbl]) => (
         <button key={v} onClick={()=>setLicDuration(v)}
          style={{ background:licDuration===v?"rgba(29,201,232,0.12)":"none", border:`1px solid ${licDuration===v?"var(--accent)":"var(--border-1)"}`, borderRadius:"8px", padding:"6px 12px", fontSize:"0.75rem", fontWeight:licDuration===v?800:500, color:licDuration===v?"var(--accent)":"var(--text-muted)", cursor:"pointer" }}>
          {lbl}
         </button>
        ))}
       </div>
      </div>
      <div style={{ display:"flex", gap:"8px" }}>
       <button onClick={()=>setLicenseModal(null)}
        style={{ flex:1, background:"none", border:"1px solid var(--border-1)", borderRadius:"8px", padding:"10px", fontSize:"0.78rem", color:"var(--text-muted)", cursor:"pointer" }}>
        Cancel
       </button>
       <button onClick={()=>assignLicense(licenseModal.userId, licTier, parseInt(licDuration))} disabled={!!saving}
        style={{ flex:2, background:"linear-gradient(135deg,var(--accent),#0EA5C9)", border:"none", borderRadius:"8px", padding:"10px", fontSize:"0.78rem", fontWeight:800, color:"#000", cursor:"pointer" }}>
        {saving ? "Saving…" : `Assign ${licTier.toUpperCase()}`}
       </button>
      </div>
     </div>
    </div>
   )}

 </>);
}

// ── SubscriptionsTab — founder tool to manage user plans ────────────────────
function SubscriptionsTab({ flash }) {
 const F = "'DM Sans',system-ui,sans-serif";
 const TA = "var(--accent)";
 const TM = "var(--text-muted)";
 const TP = "var(--text-primary)";
 const [rows, setRows] = useState([]);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(null);
 const [search, setSearch] = useState("");
 const [grantModal, setGrantModal] = useState(null); // { userId, currentPlan }

 async function load() {
  setLoading(true);
  try {
   const { data } = await window._sb
    .from("user_subscriptions")
    .select("user_id, plan, plan_expires_at, credits_used, credits_override, stripe_customer_id, updated_at")
    .order("updated_at", { ascending: false });
   setRows(data || []);
  } catch (e) { flash("Failed to load subscriptions"); }
  setLoading(false);
 }

 useEffect(() => { load(); }, []);

 async function setPlan(userId, plan) {
  setSaving(userId);
  try {
   const { error } = await window._sb
    .from("user_subscriptions")
    .upsert({ user_id: userId, plan, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
   if (error) throw error;
   setRows(prev => prev.map(r => r.user_id === userId ? { ...r, plan } : r));
   flash(`Plan set to ${plan}`);
  } catch (e) { flash("Failed to update plan"); }
  setSaving(null);
 }

 async function setCreditsOverride(userId, val) {
  setSaving(userId + "_credits");
  try {
   const override = val === "" ? null : parseInt(val);
   await window._sb
    .from("user_subscriptions")
    .upsert({ user_id: userId, credits_override: override, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
   setRows(prev => prev.map(r => r.user_id === userId ? { ...r, credits_override: override } : r));
   flash("Credits override saved");
  } catch { flash("Failed to save"); }
  setSaving(null);
 }

 async function resetCredits(userId) {
  setSaving(userId + "_reset");
  try {
   await window._sb
    .from("user_subscriptions")
    .upsert({ user_id: userId, credits_used: 0, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
   setRows(prev => prev.map(r => r.user_id === userId ? { ...r, credits_used: 0 } : r));
   flash("Credits reset to 0");
  } catch { flash("Failed to reset"); }
  setSaving(null);
 }


 async function grantPro(userId, days) {
  setSaving(userId + "_grant");
  try {
   const expiresAt = days === null ? null : new Date(Date.now() + days * 86400000).toISOString();
   const { error } = await window._sb
    .from("user_subscriptions")
    .upsert({ user_id: userId, plan: "pro", plan_expires_at: expiresAt, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
   if (error) throw error;
   setRows(prev => prev.map(r => r.user_id === userId ? { ...r, plan: "pro", plan_expires_at: expiresAt } : r));
   flash(days === null ? "Pro granted — indefinite" : `Pro granted — expires in ${days} days`);
   setGrantModal(null);
  } catch (e) { flash("Failed to grant pro"); }
  setSaving(null);
 }

 async function revokePro(userId) {
  setSaving(userId + "_revoke");
  try {
   await window._sb
    .from("user_subscriptions")
    .upsert({ user_id: userId, plan: "free", plan_expires_at: null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
   setRows(prev => prev.map(r => r.user_id === userId ? { ...r, plan: "free", plan_expires_at: null } : r));
   flash("Reverted to free");
  } catch { flash("Failed to revoke"); }
  setSaving(null);
 }

 const filtered = rows.filter(r =>
  !search || r.user_id?.toLowerCase().includes(search.toLowerCase())
 );

 const planColor = { free: TM, pro: TA, team: "#A855F7", godmode: "#F59E0B" };
 const planBg = { free: "rgba(255,255,255,0.04)", pro: "rgba(29,201,232,0.08)", team: "rgba(168,85,247,0.08)", godmode: "rgba(245,158,11,0.08)" };

 return (
  <div>
   <div style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
    <input value={search} onChange={e => setSearch(e.target.value)}
     placeholder="Filter by user ID…"
     style={{ flex: 1, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "8px 12px", color: TP, fontFamily: F, fontSize: "0.85rem", outline: "none" }} />
    <button onClick={load} style={{ background: "none", border: "1px solid var(--border-1)", color: TM, padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: F, fontSize: "0.8rem" }}>
     Refresh
    </button>
   </div>

   {loading ? (
    <div style={{ color: TM, fontStyle: "italic", fontSize: "0.85rem" }}>Loading…</div>
   ) : filtered.length === 0 ? (
    <div style={{ color: TM, fontStyle: "italic", fontSize: "0.85rem" }}>No subscriptions found.</div>
   ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
     {filtered.map(row => {
      const expires = row.plan_expires_at ? new Date(row.plan_expires_at) : null;
      const isExpired = expires && expires < new Date();
      const daysLeft = expires && !isExpired ? Math.ceil((expires - new Date()) / 86400000) : null;
      return (
       <div key={row.user_id} style={{ background: planBg[row.plan] || "var(--bg-1)", border: `1px solid ${isExpired ? "#E05577" : planColor[row.plan] || "var(--border-1)"}33`, borderRadius: "10px", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
         <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.78rem", fontFamily: "monospace", color: TM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.user_id}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "2px" }}>
           Credits used: {row.credits_used ?? 0}
           {expires && <span style={{ marginLeft: "8px", color: isExpired ? "#E05577" : daysLeft <= 7 ? "#F59E0B" : "var(--text-dim)" }}>
            · {isExpired ? "⚠ Expired " + expires.toLocaleDateString() : `Expires in ${daysLeft}d (${expires.toLocaleDateString()})`}
           </span>}
           {!expires && row.plan === "pro" && <span style={{ marginLeft: "8px", color: TA }}>· Indefinite</span>}
           {row.stripe_customer_id && <span style={{ marginLeft: "8px", color: "var(--text-dim)" }}>· Stripe ✓</span>}
          </div>
         </div>
         <span style={{ fontSize: "0.7rem", fontWeight: "800", color: isExpired ? "#E05577" : planColor[row.plan] || TM, background: planBg[row.plan] || "var(--bg-2)", border: `1px solid ${isExpired ? "#E05577" : planColor[row.plan] || "var(--border-1)"}44`, borderRadius: "4px", padding: "2px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {isExpired ? "expired" : row.plan || "free"}
         </span>
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
         {/* Grant Pro with duration */}
         <button onClick={() => setGrantModal({ userId: row.user_id, currentPlan: row.plan })}
          style={{ background: "rgba(29,201,232,0.08)", border: "1px solid rgba(29,201,232,0.3)", color: TA, padding: "4px 12px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer", fontFamily: F }}>
          ⚡ Grant Pro
         </button>
         {row.plan !== "free" && (
          <button onClick={() => revokePro(row.user_id)}
           disabled={saving === row.user_id + "_revoke"}
           style={{ background: "none", border: "1px solid rgba(224,85,119,0.3)", color: "#E05577", padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer", fontFamily: F }}>
           Revoke
          </button>
         )}
         <div style={{ display: "flex", gap: "4px", alignItems: "center", marginLeft: "8px" }}>
          <span style={{ fontSize: "0.72rem", color: TM }}>Credits cap:</span>
          <input type="number" placeholder="default"
           defaultValue={row.credits_override ?? ""}
           onBlur={e => setCreditsOverride(row.user_id, e.target.value)}
           style={{ width: "72px", background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "6px", padding: "3px 8px", color: TP, fontFamily: F, fontSize: "0.78rem", outline: "none" }} />
         </div>
         <button onClick={() => resetCredits(row.user_id)}
          disabled={saving === row.user_id + "_reset"}
          style={{ background: "none", border: "1px solid var(--border-1)", color: TM, padding: "4px 10px", borderRadius: "6px", fontSize: "0.72rem", cursor: "pointer", fontFamily: F }}>
          Reset credits
         </button>
        </div>
       </div>
      );
     })}
    </div>
   )}

   {/* Grant Pro modal */}
    {grantModal && (
     <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={() => setGrantModal(null)}>
      <div style={{ background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "16px", padding: "24px", maxWidth: "340px", width: "100%" }} onClick={e => e.stopPropagation()}>
       <div style={{ fontSize: "1rem", fontWeight: "800", color: TP, fontFamily: F, marginBottom: "6px" }}>⚡ Grant Pro Access</div>
       <div style={{ fontSize: "0.78rem", fontFamily: "monospace", color: TM, marginBottom: "20px", wordBreak: "break-all" }}>{grantModal.userId}</div>
       <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {[
         { label: "30 days", days: 30 },
         { label: "90 days", days: 90 },
         { label: "180 days", days: 180 },
         { label: "365 days", days: 365 },
         { label: "Indefinite ∞", days: null },
        ].map(({ label, days }) => (
         <button key={label} onClick={() => grantPro(grantModal.userId, days)}
          disabled={!!saving}
          style={{ background: days === null ? "rgba(29,201,232,0.1)" : "var(--bg-2)", border: `1px solid ${days === null ? "rgba(29,201,232,0.4)" : "var(--border-1)"}`, color: days === null ? TA : TP, padding: "12px 16px", borderRadius: "10px", fontSize: "0.9rem", fontWeight: "700", cursor: "pointer", fontFamily: F, textAlign: "left", opacity: saving ? 0.6 : 1 }}>
          {label}
          {days && <span style={{ float: "right", fontSize: "0.75rem", color: TM, fontWeight: "400" }}>until {new Date(Date.now() + days * 86400000).toLocaleDateString()}</span>}
         </button>
        ))}
       </div>
       <button onClick={() => setGrantModal(null)} style={{ marginTop: "14px", width: "100%", background: "none", border: "1px solid var(--border-1)", color: TM, padding: "10px", borderRadius: "8px", cursor: "pointer", fontFamily: F, fontSize: "0.85rem" }}>
        Cancel
       </button>
      </div>
     </div>
    )}
  </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// IntegrationsTab — connect API keys and OAuth services
// Free: bring your own keys. Pro: Cadence-hosted Exa.
// ─────────────────────────────────────────────────────────────────────────────
function IntegrationsTab({ user, isPro, authUser }) {
  const F2 = "'DM Sans',system-ui,sans-serif";
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [keys, setKeys] = useState({ apollo: "", exa: "", twilio_sid: "", twilio_token: "", twilio_phone: "", hubspot: "" });
  const [showKeys, setShowKeys] = useState({ apollo: false, exa: false, twilio: false, hubspot: false });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load saved integration keys from supabase user_integrations table
    async function loadKeys() {
      if (!window._sb || !user?.id) return;
      const effectiveUid = authUser?.id || user.id;
      try {
        const { data } = await window._sb.from("user_integrations")
          .select("service, credentials")
          .eq("user_id", effectiveUid);
        if (data) {
          const next = { ...keys };
          data.forEach(row => {
            if (row.service === "apollo")  next.apollo = row.credentials?.api_key || "";
            if (row.service === "exa")     next.exa    = row.credentials?.api_key || "";
            if (row.service === "twilio") {
              next.twilio_sid   = row.credentials?.account_sid || "";
              next.twilio_token = row.credentials?.auth_token  || "";
              next.twilio_phone = row.credentials?.phone       || "";
            }
            if (row.service === "hubspot") next.hubspot = row.credentials?.access_token || "";
          });
          setKeys(next);
        }
      } catch(e) { console.error("Error loading integrations:", e); }
      setLoaded(true);
    }
    loadKeys();
  }, [user?.id, authUser?.id]);

  async function saveKey(service, credentials) {
    if (!window._sb || !user?.id) return;
    const effectiveUid = authUser?.id || user.id;
    setSaving(p => ({...p, [service]: true}));
    try {
      await window._sb.from("user_integrations").upsert({
        user_id: effectiveUid,
        service,
        credentials,
        is_active: true,
        connected_at: new Date().toISOString(),
      }, { onConflict: "user_id,service" });
      setSaved(p => ({...p, [service]: true}));
      setTimeout(() => setSaved(p => ({...p, [service]: false})), 2500);
    } catch(e) { console.error("Error saving integration:", e); }
    setSaving(p => ({...p, [service]: false}));
  }

  const sectionStyle = { background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: "14px", padding: "16px 18px", marginBottom: "12px" };
  const labelStyle   = { fontSize: "0.68rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: F2, marginBottom: "6px" };
  const inputStyle   = { width: "100%", background: "var(--bg-0)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "9px 12px", color: "var(--text-primary)", fontSize: "0.82rem", fontFamily: F2, outline: "none", boxSizing: "border-box" };
  const saveBtn = (svc) => ({
    background: saved[svc] ? "rgba(34,197,94,0.15)" : "rgba(29,201,232,0.12)",
    border: "1px solid " + (saved[svc] ? "rgba(34,197,94,0.3)" : "rgba(29,201,232,0.25)"),
    color: saved[svc] ? "#22C55E" : "var(--accent)",
    borderRadius: "8px", padding: "8px 16px", fontSize: "0.78rem", fontWeight: 800,
    cursor: saving[svc] ? "default" : "pointer", fontFamily: F2, flexShrink: 0,
  });

  if (!loaded) return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)", fontFamily: F2 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: "520px" }}>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: F2, marginBottom: "4px" }}>Integrations</div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: F2, lineHeight: 1.5 }}>
          All integrations are free. Bring your own API keys — your data goes directly from the service to your app, Cadence never stores credentials in plaintext.
        </div>
      </div>

      {/* Apollo */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: F2 }}>🔍 Apollo.io</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: F2, marginTop: "2px" }}>Contact search and enrichment</div>
          </div>
        </div>
        <>
          <div style={labelStyle}>API Key</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input type={showKeys.apollo ? "text" : "password"} placeholder="ak1_..." value={keys.apollo}
                onChange={e => setKeys(p => ({...p, apollo: e.target.value}))} style={{...inputStyle, paddingRight: "36px"}} />
              <button onClick={() => setShowKeys(p=>({...p, apollo:!p.apollo}))} tabIndex={-1}
                style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-dim)", fontSize:"0.75rem", padding:0 }}>
                {showKeys.apollo ? "hide" : "show"}
              </button>
            </div>
            <button onClick={() => saveKey("apollo", { api_key: keys.apollo })} disabled={saving.apollo || !keys.apollo.trim()} style={saveBtn("apollo")}>
              {saving.apollo ? "Saving…" : saved.apollo ? "✓ Saved" : "Save"}
            </button>
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontFamily: F2, marginTop: "6px" }}>
            Get your key at <span style={{ color: "var(--accent)" }}>apollo.io → Settings → Integrations → API</span>
          </div>
        </>
      </div>

      {/* Exa */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: F2 }}>⚡ Exa.ai</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: F2, marginTop: "2px" }}>Live company news before every dial</div>
          </div>
          {isPro && <span style={{ fontSize: "0.62rem", background: "rgba(29,201,232,0.12)", border: "1px solid rgba(29,201,232,0.25)", color: "var(--accent)", borderRadius: "6px", padding: "2px 8px", fontWeight: 800, fontFamily: F2 }}>Pro — hosted</span>}
        </div>
        {isPro ? (
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: F2 }}>
            You're on Pro — Cadence covers your Exa usage. No key needed.
          </div>
        ) : (
          <>
            <div style={labelStyle}>API Key (optional)</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input type={showKeys.exa ? "text" : "password"} placeholder="exa-..." value={keys.exa}
                  onChange={e => setKeys(p => ({...p, exa: e.target.value}))} style={{...inputStyle, paddingRight: "36px"}} />
                <button onClick={() => setShowKeys(p=>({...p, exa:!p.exa}))} tabIndex={-1}
                  style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-dim)", fontSize:"0.75rem", padding:0 }}>
                  {showKeys.exa ? "hide" : "show"}
                </button>
              </div>
              <button onClick={() => saveKey("exa", { api_key: keys.exa })} disabled={saving.exa || !keys.exa.trim()} style={saveBtn("exa")}>
                {saving.exa ? "Saving…" : saved.exa ? "✓ Saved" : "Save"}
              </button>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontFamily: F2, marginTop: "6px" }}>
              Bring your own key at <span style={{ color: "var(--accent)" }}>exa.ai</span>, or upgrade to Pro and we cover it.
            </div>
          </>
        )}
      </div>

      {/* Twilio */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: F2 }}>📞 Twilio</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: F2, marginTop: "2px" }}>Click-to-dial from Cadence</div>
          </div>
        </div>
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div>
                <div style={labelStyle}>Account SID</div>
                <input type="text" placeholder="ACxxxxxxxx..." value={keys.twilio_sid}
                  onChange={e => setKeys(p => ({...p, twilio_sid: e.target.value}))} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Auth Token</div>
                <div style={{ position: "relative" }}>
                  <input type={showKeys.twilio ? "text" : "password"} placeholder="Auth token..." value={keys.twilio_token}
                    onChange={e => setKeys(p => ({...p, twilio_token: e.target.value}))} style={{...inputStyle, paddingRight: "36px"}} />
                  <button onClick={() => setShowKeys(p=>({...p, twilio:!p.twilio}))} tabIndex={-1}
                    style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-dim)", fontSize:"0.75rem", padding:0 }}>
                    {showKeys.twilio ? "hide" : "show"}
                  </button>
                </div>
              </div>
              <div>
                <div style={labelStyle}>Phone Number</div>
                <input type="text" placeholder="+1..." value={keys.twilio_phone}
                  onChange={e => setKeys(p => ({...p, twilio_phone: e.target.value}))} style={inputStyle} />
              </div>
              <button onClick={() => saveKey("twilio", { account_sid: keys.twilio_sid, auth_token: keys.twilio_token, phone: keys.twilio_phone })}
                disabled={saving.twilio || !keys.twilio_sid.trim() || !keys.twilio_token.trim()} style={{...saveBtn("twilio"), alignSelf: "flex-start"}}>
                {saving.twilio ? "Saving…" : saved.twilio ? "✓ Saved" : "Save Twilio"}
              </button>
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontFamily: F2, marginTop: "8px" }}>
            Get your credentials at <span style={{ color: "var(--accent)" }}>console.twilio.com</span>
          </div>
        </>
      </div>

      {/* Email OAuth — coming in S4 */}
      <div style={{ ...sectionStyle, opacity: 0.5 }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: F2, marginBottom: "4px" }}>✉️ Gmail / Outlook</div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: F2 }}>Email integration — coming in the next update.</div>
      </div>

      {/* HubSpot */}
      <div style={{ ...sectionStyle, border: keys.hubspot ? "1px solid rgba(255,122,0,0.4)" : "1px solid var(--border-1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: F2 }}>🟠 HubSpot</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: F2, marginTop: "2px" }}>Dupe check on lead import</div>
          </div>
          {keys.hubspot && <span style={{ fontSize: "0.62rem", background: "rgba(74,207,134,0.12)", border: "1px solid rgba(74,207,134,0.25)", color: "#4ACF86", borderRadius: "6px", padding: "2px 8px", fontWeight: 800, fontFamily: F2 }}>Connected</span>}
        </div>
        <div style={labelStyle}>Personal Access Key</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input type={showKeys.hubspot ? "text" : "password"} placeholder="pat-na1-xxxxxxxx-..." value={keys.hubspot}
              onChange={e => setKeys(p => ({...p, hubspot: e.target.value}))} style={{...inputStyle, paddingRight: "36px"}} />
            <button onClick={() => setShowKeys(p=>({...p, hubspot:!p.hubspot}))} tabIndex={-1}
              style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-dim)", fontSize:"0.75rem", padding:0 }}>
              {showKeys.hubspot ? "hide" : "show"}
            </button>
          </div>
          <button onClick={() => saveKey("hubspot", { access_token: keys.hubspot })} disabled={saving.hubspot || !keys.hubspot.trim()} style={saveBtn("hubspot")}>
            {saving.hubspot ? "Saving…" : saved.hubspot ? "✓ Saved" : "Save"}
          </button>
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontFamily: F2, marginTop: "6px", lineHeight: 1.5 }}>
          In HubSpot: your name → Account Settings → Integrations → Private Apps → Personal Access Key<br/>
          Required scopes: crm.objects.companies.read · crm.objects.contacts.read · crm.objects.deals.read
        </div>
      </div>
    </div>

  );
}

// AffiliateTab — Refer & Earn
// Two-tier commissions, sub-affiliate network view, weighted tier progression.
// Direct referrals = 1pt, sub-affiliate referrals = 0.5pt toward tier.
// $1/month per active sub-affiliate's paid user — stops at 2 levels deep.
// Only paid Pro subscriptions generate earnings. Cancelled = no pay.
// ─────────────────────────────────────────────────────────────────────────────
function AffiliateTab({ user }) {
  const F  = "'DM Sans',system-ui,sans-serif";
  const TP = "var(--text-primary)";
  const TM = "var(--text-muted)";
  const TD = "var(--text-dim,rgba(255,255,255,0.2))";
  const TA = "var(--accent,#1DC9E8)";
  const B1 = "var(--border-1)";
  const BG1 = "var(--bg-1)";
  const BG2 = "var(--bg-2)";

  const [copied, setCopied]             = React.useState(null);
  const [stats, setStats]               = React.useState(null);
  const [activity, setActivity]         = React.useState([]);
  const [subAffiliates, setSubAffs]     = React.useState([]); // people you referred who are also affiliates
  const [loadingStats, setLoading]      = React.useState(true);
  const [networkExpanded, setNetworkEx] = React.useState(false);

  // ── Referral code ──────────────────────────────────────────────────────────
  const referralCode = React.useMemo(() => {
    const base = (user?.name || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 6);
    const uid  = (user?.id   || "").replace(/-/g, "").slice(-4);
    return `${base}${uid}`;
  }, [user?.id, user?.name]);

  const personalLink = `https://getcadence.app/join?ref=${referralCode}`;
  const crewLink     = `https://getcadence.app/join?ref=${referralCode}&crew=true`;

  // ── Load stats: direct referrals + sub-affiliate network + earnings ─────────
  React.useEffect(() => {
    if (!user?.id || !window._sb) { setLoading(false); return; }

    Promise.all([
      // My direct referrals
      window._sb
        .from("referrals")
        .select("id, referred_user_id, status, created_at, converted_at, churned_at, payout_eligible, fraud_flag, referral_depth")
        .eq("referrer_id", user.id)
        .eq("referral_depth", 1)
        .order("created_at", { ascending: false }),

      // Sub-affiliate referrals: people I referred who then referred others
      // referral_depth=2 rows where the chain started with me
      window._sb
        .from("referrals")
        .select("id, referred_user_id, referrer_id, status, payout_eligible, fraud_flag, converted_at, referral_depth")
        .eq("root_referrer_id", user.id)
        .eq("referral_depth", 2)
        .order("converted_at", { ascending: false }),

      // My affiliate network: direct referrals who are also enrolled affiliates
      window._sb
        .from("referrals")
        .select("referred_user_id, status, payout_eligible")
        .eq("referrer_id", user.id)
        .eq("referral_depth", 1)
        .eq("status", "active"),

      // Earnings history
      window._sb
        .from("affiliate_earnings")
        .select("amount_cents, period_month, paid_at, status, earning_type")
        .eq("referrer_id", user.id)
        .order("period_month", { ascending: false })
        .limit(12),
    ]).then(([{ data: directRefs }, { data: subRefs }, { data: activeDirects }, { data: earnings }]) => {
      const direct   = directRefs || [];
      const sub      = subRefs    || [];
      const earns    = earnings   || [];

      const directActive  = direct.filter(r => r.status === "active" && r.payout_eligible && !r.fraud_flag);
      const directPending = direct.filter(r => r.status === "pending");
      const directChurned = direct.filter(r => r.status === "churned");
      const subActive     = sub.filter(r => r.status === "active" && r.payout_eligible && !r.fraud_flag);

      // Weighted count: direct = 1pt, sub = 0.5pt (2:1 ratio favors direct but credits sub work)
      const weightedCount = directActive.length + (subActive.length * 0.5);

      // Lifetime and this-month earnings split by type
      const totalEarnedCents = earns.filter(e => e.status === "paid").reduce((s, e) => s + (e.amount_cents || 0), 0);
      const now = new Date();
      const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
      const thisMonthCents = earns.filter(e => e.period_month === thisMonthKey).reduce((s, e) => s + (e.amount_cents || 0), 0);
      const directEarnsCents = earns.filter(e => e.status === "paid" && e.earning_type !== "sub_affiliate").reduce((s, e) => s + (e.amount_cents || 0), 0);
      const subEarnsCents    = earns.filter(e => e.status === "paid" && e.earning_type === "sub_affiliate").reduce((s, e) => s + (e.amount_cents || 0), 0);

      // Build sub-affiliate network display
      // For each active direct referral, check if they're an enrolled affiliate
      // and count how many active sub-referrals they have
      const subAffList = (activeDirects || [])
        .filter(r => r.payout_eligible)
        .map(r => {
          const theirSubs = subActive.filter(s => s.referrer_id === r.referred_user_id);
          return {
            userId: r.referred_user_id,
            subActiveCount: theirSubs.length,
            yourEarningsFromThem: theirSubs.length, // $1/mo per sub-active user
          };
        })
        .filter(r => r.subActiveCount > 0)
        .sort((a, b) => b.subActiveCount - a.subActiveCount);

      // Activity feed
      const feed = [
        ...directActive.slice(0, 4).map(r => ({
          icon: "💸", text: "Direct paid referral active",
          sub: r.converted_at ? `converted ${Math.floor((Date.now() - new Date(r.converted_at)) / 86400000)}d ago` : "active",
          color: "#4ACF86",
        })),
        ...subActive.slice(0, 3).map(r => ({
          icon: "🔗", text: "Sub-affiliate brought in a paid user",
          sub: r.converted_at ? `${Math.floor((Date.now() - new Date(r.converted_at)) / 86400000)}d ago` : "active",
          color: "#A855F7",
        })),
        ...directPending.slice(0, 3).map(r => ({
          icon: "⏳", text: "Signed up — awaiting Pro upgrade",
          sub: `${Math.floor((Date.now() - new Date(r.created_at)) / 86400000)}d ago`,
          color: "#F59E0B",
        })),
        ...directChurned.slice(0, 2).map(r => ({
          icon: "↩️", text: "Referral cancelled — no longer earning",
          sub: r.churned_at ? `churned ${Math.floor((Date.now() - new Date(r.churned_at)) / 86400000)}d ago` : "",
          color: TD,
        })),
      ].filter(Boolean).slice(0, 8);

      setStats({
        directActive:   directActive.length,
        directPending:  directPending.length,
        directChurned:  directChurned.length,
        subActive:       subActive.length,
        weightedCount,
        totalEarnedDollars: (totalEarnedCents / 100).toFixed(2),
        thisMonthCents,
        directEarnsCents,
        subEarnsCents,
        earnings: earns,
      });
      setSubAffs(subAffList);
      setActivity(feed);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id]);

  // ── Tier: based on WEIGHTED count (direct=1, sub=0.5) ─────────────────────
  const weighted  = stats?.weightedCount || 0;
  const tier      = weighted >= 50 ? 3 : weighted >= 10 ? 2 : 1;
  const nextTierAt = tier === 1 ? 10 : tier === 2 ? 50 : null;
  const toNextTier = nextTierAt ? Math.max(0, Math.ceil(nextTierAt - weighted)) : 0;
  const pctToNext  = nextTierAt ? Math.min(100, Math.round((weighted / nextTierAt) * 100)) : 100;

  const TIERS = [
    {
      n: 1, name: "Scout", emoji: "🔍",
      range: "1–9 weighted referrals",
      reward: "2 free months of Pro",
      detail: "per paid direct referral, credited after 30-day hold",
      color: TA,
      bg: "rgba(29,201,232,0.06)", border: "rgba(29,201,232,0.2)",
    },
    {
      n: 2, name: "Closer", emoji: "🤝",
      range: "10–49 weighted referrals",
      reward: "$2/user/month (direct)  +  $1/user/month (sub)",
      detail: "real cash via Stripe for every month your referrals stay subscribed",
      color: "#A855F7",
      bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.2)",
    },
    {
      n: 3, name: "Rainmaker", emoji: "🌧️",
      range: "50+ weighted referrals",
      reward: "$3→$2/month (direct)  +  $1/month (sub)",
      detail: "$3/mo per direct for first 3 months, $2/mo after. $1/mo for every active sub-affiliate referral, forever.",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)",
    },
  ];

  const currentTier = TIERS[tier - 1];

  // Monthly income estimate
  const directM = tier === 3 ? (stats?.directActive || 0) * 3 : tier === 2 ? (stats?.directActive || 0) * 2 : 0;
  const subM    = tier >= 2 ? (stats?.subActive || 0) * 1 : 0;
  const monthlyEstimate = directM + subM;

  const card = { background: BG1, border: `1px solid ${B1}`, borderRadius: "14px", overflow: "hidden" };

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div style={{ maxWidth: "560px", display: "flex", flexDirection: "column", gap: "22px" }}>

      {/* ── Header with tier badge ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: TP, fontFamily: F }}>Refer & Earn</div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", background: currentTier.bg, border: `1px solid ${currentTier.border}`, borderRadius: "20px", padding: "3px 10px" }}>
            <span style={{ fontSize: "0.85rem" }}>{currentTier.emoji}</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: currentTier.color, fontFamily: F, letterSpacing: "0.04em" }}>{currentTier.name.toUpperCase()}</span>
          </div>
        </div>
        <div style={{ fontSize: "0.82rem", color: TM, lineHeight: 1.65, fontFamily: F }}>
          No application. No threshold. You earn when your referrals pay — and when
          your sub-affiliates' referrals pay. Two levels deep, permanently.
        </div>
      </div>

      {/* ── Stats panel ── */}
      {loadingStats ? (
        <div style={{ ...card, padding: "20px 18px" }}>
          <div style={{ fontSize: "0.82rem", color: TD, fontFamily: F }}>Loading your stats…</div>
        </div>
      ) : (
        <div style={card}>
          <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${B1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: TD, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: F }}>Your numbers</div>
            {parseFloat(stats?.totalEarnedDollars) > 0 && (
              <div style={{ fontSize: "0.72rem", color: "#4ACF86", fontWeight: 700, fontFamily: F }}>
                ${stats.totalEarnedDollars} earned lifetime
              </div>
            )}
          </div>

          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Direct vs Sub stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {/* Direct referrals box */}
              <div style={{ background: BG2, border: `1px solid ${B1}`, borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "0.6rem", fontWeight: 800, color: TD, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: F, marginBottom: "8px" }}>Direct referrals</div>
                <div style={{ display: "flex", gap: "12px" }}>
                  {[
                    { label: "Active", value: stats?.directActive ?? 0, color: "#4ACF86" },
                    { label: "Pending", value: stats?.directPending ?? 0, color: "#F59E0B" },
                    { label: "Churned", value: stats?.directChurned ?? 0, color: TD },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.4rem", fontWeight: 900, color, fontFamily: F, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: "0.6rem", color: TM, fontFamily: F, marginTop: "2px" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-affiliate box */}
              <div style={{ background: BG2, border: `1px solid rgba(168,85,247,0.2)`, borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "rgba(168,85,247,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: F, marginBottom: "8px" }}>Sub-affiliate</div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#A855F7", fontFamily: F, lineHeight: 1 }}>{stats?.subActive ?? 0}</div>
                    <div style={{ fontSize: "0.6rem", color: TM, fontFamily: F, marginTop: "2px" }}>Paying users</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#A855F7", fontFamily: F, lineHeight: 1 }}>{subAffiliates.length}</div>
                    <div style={{ fontSize: "0.6rem", color: TM, fontFamily: F, marginTop: "2px" }}>Active affiliates</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weighted tier score */}
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "0.7rem", color: TM, fontFamily: F }}>
                Tier score: <span style={{ color: currentTier.color, fontWeight: 700 }}>{weighted.toFixed(1)}</span>
                <span style={{ color: TD }}> ({stats?.directActive ?? 0} direct × 1 + {stats?.subActive ?? 0} sub × 0.5)</span>
              </div>
            </div>

            {/* Monthly income (Tier 2+) */}
            {tier >= 2 && (
              <div style={{ background: "rgba(29,201,232,0.04)", border: `1px solid rgba(29,201,232,0.15)`, borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 800, color: TM, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.08em" }}>Monthly income</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: TA, fontFamily: F, lineHeight: 1.1, marginTop: "2px" }}>
                      ~${monthlyEstimate}<span style={{ fontSize: "0.8rem", fontWeight: 500, color: TM }}>/mo</span>
                    </div>
                    {subM > 0 && (
                      <div style={{ fontSize: "0.65rem", color: TD, fontFamily: F, marginTop: "3px" }}>
                        ${directM}/mo direct + ${subM}/mo from sub-affiliates
                      </div>
                    )}
                  </div>
                  {stats?.thisMonthCents > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.65rem", color: TD, fontFamily: F }}>This month</div>
                      <div style={{ fontSize: "1rem", fontWeight: 800, color: "#4ACF86", fontFamily: F }}>${(stats.thisMonthCents / 100).toFixed(2)}</div>
                    </div>
                  )}
                </div>
                {stats?.subEarnsCents > 0 && (
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${B1}`, display: "flex", gap: "16px" }}>
                    <div style={{ fontSize: "0.68rem", color: TD, fontFamily: F }}>
                      Lifetime: <span style={{ color: "#4ACF86", fontWeight: 700 }}>${(stats.directEarnsCents / 100).toFixed(2)}</span> direct  +  <span style={{ color: "#A855F7", fontWeight: 700 }}>${(stats.subEarnsCents / 100).toFixed(2)}</span> sub-affiliate
                    </div>
                  </div>
                )}
                <div style={{ fontSize: "0.67rem", color: TD, marginTop: "6px", fontFamily: F }}>
                  Paid 1st of each month via Stripe. Email hello@getcadence.app to connect payout.
                </div>
              </div>
            )}

            {/* Progress to next tier */}
            {nextTierAt && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: TM, fontFamily: F }}>
                    {toNextTier.toFixed(1)} more to unlock{" "}
                    <span style={{ color: TIERS[tier].color }}>{TIERS[tier].name}</span>
                    <span style={{ marginLeft: "4px" }}>{TIERS[tier].emoji}</span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: TD, fontFamily: F }}>{weighted.toFixed(1)} / {nextTierAt}</div>
                </div>
                <div style={{ height: "5px", background: "rgba(255,255,255,0.07)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pctToNext}%`, background: `linear-gradient(90deg, ${currentTier.color}, ${TIERS[tier].color})`, borderRadius: "99px", transition: "width 0.6s ease" }} />
                </div>
                <div style={{ fontSize: "0.67rem", color: TD, fontFamily: F, marginTop: "4px" }}>
                  Next: {TIERS[tier].reward}
                  {" · "}Sub-affiliates count at 0.5x toward tier progression
                </div>
              </div>
            )}
            {!nextTierAt && (
              <div style={{ fontSize: "0.78rem", color: "#F59E0B", fontWeight: 700, fontFamily: F }}>
                🌧️ Rainmaker — you're at the top. Keep growing.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sub-affiliate network panel ── */}
      {subAffiliates.length > 0 && (
        <div style={card}>
          <button
            onClick={() => setNetworkEx(v => !v)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: F, WebkitTapHighlightColor: "transparent" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, color: TD, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: F }}>Your affiliate network</div>
              <div style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "12px", padding: "2px 8px", fontSize: "0.62rem", fontWeight: 800, color: "#A855F7", fontFamily: F }}>
                {subAffiliates.length} active
              </div>
            </div>
            <span style={{ fontSize: "0.72rem", color: TD }}>{networkExpanded ? "▲" : "▼"}</span>
          </button>

          {networkExpanded && (
            <div style={{ borderTop: `1px solid ${B1}`, padding: "4px 0 8px" }}>
              <div style={{ padding: "6px 18px 10px", fontSize: "0.72rem", color: TM, fontFamily: F, lineHeight: 1.5 }}>
                People you referred who became active affiliates. You earn <strong style={{ color: "#A855F7" }}>$1/month</strong> for every paid user they bring in.
              </div>
              {subAffiliates.map((sa, i) => (
                <div key={sa.userId} style={{ display: "flex", alignItems: "center", padding: "9px 18px", borderBottom: i < subAffiliates.length - 1 ? `1px solid ${B1}` : "none", gap: "12px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, color: "#A855F7", fontFamily: F, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: TP, fontFamily: F }}>Sub-affiliate #{i + 1}</div>
                    <div style={{ fontSize: "0.68rem", color: TM, fontFamily: F }}>
                      {sa.subActiveCount} active paid referral{sa.subActiveCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#A855F7", fontFamily: F }}>${sa.yourEarningsFromThem}/mo</div>
                    <div style={{ fontSize: "0.62rem", color: TD, fontFamily: F }}>to you</div>
                  </div>
                </div>
              ))}
              <div style={{ padding: "10px 18px 6px" }}>
                <div style={{ fontSize: "0.68rem", color: TD, lineHeight: 1.5, fontFamily: F }}>
                  Share your crew link with your direct referrals — if they enroll and bring in paid users, you earn $1/month per their active subscriber. Encourage them to activate.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Activity feed ── */}
      {activity.length > 0 && (
        <div style={card}>
          <div style={{ padding: "13px 18px 11px", borderBottom: `1px solid ${B1}` }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: TD, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: F }}>Recent activity</div>
          </div>
          <div style={{ padding: "4px 0" }}>
            {activity.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 18px", borderBottom: i < activity.length - 1 ? `1px solid ${B1}` : "none" }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.77rem", fontWeight: 700, color: item.color, fontFamily: F }}>{item.text}</div>
                  <div style={{ fontSize: "0.67rem", color: TD, fontFamily: F, marginTop: "1px" }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Your links ── */}
      <div style={card}>
        <div style={{ padding: "13px 18px 11px", borderBottom: `1px solid ${B1}` }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: TD, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: F }}>Your links</div>
        </div>
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {[
            { key: "personal", label: "Personal link", link: personalLink, note: "You earn when anyone you send here upgrades to Pro and stays subscribed.", badge: null },
            { key: "crew", label: "Crew discount link", link: crewLink, note: "Your crew members get 15% off Pro while in your crew. You earn the standard rate.", badge: { text: "15% off for your crew", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" } },
          ].map(({ key, label, link, note, badge }) => (
            <div key={key}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: TP, fontFamily: F }}>{label}</div>
                {badge && <div style={{ background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: "5px", padding: "2px 7px", fontSize: "0.6rem", fontWeight: 800, color: badge.color, fontFamily: F }}>{badge.text}</div>}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ flex: 1, background: BG2, border: `1px solid ${B1}`, borderRadius: "8px", padding: "9px 12px", fontSize: "0.75rem", color: TM, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {link}
                </div>
                <button onClick={() => copy(link, key)}
                  style={{ background: copied === key ? "rgba(74,207,134,0.12)" : "rgba(29,201,232,0.1)", border: `1px solid ${copied === key ? "rgba(74,207,134,0.3)" : "rgba(29,201,232,0.25)"}`, color: copied === key ? "#4ACF86" : TA, borderRadius: "8px", padding: "8px 14px", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", fontFamily: F, flexShrink: 0, WebkitTapHighlightColor: "transparent", transition: "all 0.15s" }}>
                  {copied === key ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <div style={{ fontSize: "0.67rem", color: TD, marginTop: "4px", fontFamily: F }}>{note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tier cards ── */}
      <div>
        <div style={{ fontSize: "0.65rem", fontWeight: 800, color: TD, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: F, marginBottom: "10px" }}>
          Reward tiers — no catch, no expiry
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {TIERS.map(t => {
            const isCurrent  = t.n === tier;
            const isUnlocked = t.n <= tier;
            return (
              <div key={t.n} style={{ background: isCurrent ? t.bg : BG1, border: `1px solid ${isCurrent ? t.border : B1}`, borderRadius: "12px", padding: "12px 16px", display: "flex", gap: "14px", alignItems: "flex-start", opacity: isUnlocked ? 1 : 0.4, transition: "opacity 0.2s" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: isCurrent ? t.bg : BG2, border: `1px solid ${isCurrent ? t.border : B1}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>
                  {t.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "2px" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: isCurrent ? t.color : TP, fontFamily: F }}>{t.name}</div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: isCurrent ? t.color : TM, fontFamily: F }}>{t.reward}</div>
                    {isCurrent && <div style={{ fontSize: "0.57rem", fontWeight: 800, color: t.color, background: t.bg, border: `1px solid ${t.border}`, borderRadius: "4px", padding: "2px 6px", fontFamily: F, letterSpacing: "0.06em", textTransform: "uppercase" }}>Your tier</div>}
                    {isUnlocked && !isCurrent && <div style={{ fontSize: "0.57rem", fontWeight: 800, color: "#4ACF86", background: "rgba(74,207,134,0.1)", border: "1px solid rgba(74,207,134,0.25)", borderRadius: "4px", padding: "2px 6px", fontFamily: F, letterSpacing: "0.06em", textTransform: "uppercase" }}>Unlocked ✓</div>}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: TM, fontFamily: F, lineHeight: 1.45 }}>{t.detail}</div>
                  <div style={{ fontSize: "0.65rem", color: TD, fontFamily: F, marginTop: "3px" }}>{t.range}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Fine print ── */}
      <div style={{ fontSize: "0.72rem", color: TD, lineHeight: 1.7, fontFamily: F, padding: "14px 16px", background: BG2, borderRadius: "10px", border: `1px solid ${B1}` }}>
        <strong style={{ color: TM, display: "block", marginBottom: "6px" }}>The full rules</strong>
        You only earn while your referral stays on a paid Pro plan. Cancel = no more pay. Two-tier rewards stop at 2 levels — no deeper chains.
        Sub-affiliate referrals count at 0.5x toward tier progression (2 sub-referrals = 1 direct for tier purposes).
        30-day hold after Pro conversion before rewards activate. 90-day sub age before cash payouts begin.
        Self-referrals and fraud-flagged accounts are ineligible.
        Tier 2+ cash payouts via Stripe Connect, processed monthly.
        Email <span style={{ color: TA }}>hello@getcadence.app</span> when you hit 10 active referrals to set up payout.
      </div>

    </div>
  );
}
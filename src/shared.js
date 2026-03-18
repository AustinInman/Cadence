import { callAI } from './cadenceAI.js';
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
// CSS var aliases
export const TA="var(--accent)";
export const TM="var(--text-muted)";
export const TS="var(--text-secondary)";
export const TD="var(--text-dim)";
export const TP="var(--text-primary)";
export const TX="var(--text-xdim)";
export const BR="var(--bg-root)";
export const BG0="var(--bg-0)";
export const BG1="var(--bg-1)";
export const BG2="var(--bg-2)";
export const BG3="var(--bg-3)";
export const BD1="var(--border-1)";
export const BP="var(--btn-plus-bg)";
export const BDIR="var(--btn-direct-bg)";
export function copyText(v){const ta=document.createElement("textarea");ta.value=v;ta.style.cssText="position:fixed;opacity:0";document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}
export const BB1="1px solid var(--border-1)";
export const BB18="1px solid #111828";
export const BB1A30="1px solid #2A1A48";
export const BB1A3A="1px solid #1A3A48";
export const BB2A10="1px solid #2A0820";
export const BBA="1px solid var(--accent)";
export const BB2A28="1px solid #2A3548";
export const AKEY="anthropic-dangerous-direct-browser-access";

export const CADENCE_LOGO = "/cadence-logo.webp";

export const F = "'DM Sans',system-ui,-apple-system,BlinkMacSystemFont,sans-serif";
export const FD = "'Syne','DM Sans',system-ui,sans-serif"; // display font for headings

export function injectThemeVars() {
 const id = "cadence-theme";
 const existing = document.getElementById(id);
 if(existing) existing.remove();
 const el = document.createElement("style");
 el.id = id;
 el.textContent = `:root{
  /* ── Dark mode — deep navy, clear card elevation, restrained ── */
  --bg-root:#080C18;
  --bg-0:#080C18;
  --bg-1:#0F1524;
  --bg-2:#161E30;
  --bg-3:#1C273A;
  --bg-4:#232F44;
  --bg-5:#2A3850;
  --border-1:#1F2D42;
  --border-2:#283A54;
  /* Text — true white primary, clear hierarchy */
  --text-primary:#F8FAFF;
  --text-secondary:#8899BB;
  --text-muted:#4E6080;
  --text-dim:#2C3C54;
  --text-xdim:#1A2638;
  /* Accent */
  --accent:#1DC9E8;
  --accent-2:#A855F7;
  --accent-dim:rgba(29,201,232,0.12);
  --accent-glow:rgba(29,201,232,0.06);
  --green:#10B981;
  --blue:#6366F1;
  --red:#F43F5E;
  --orange:#F59E0B;
  /* Interactive */
  --btn-plus-bg:rgba(29,201,232,0.08);
  --btn-plus-border:rgba(29,201,232,0.18);
  --btn-direct-bg:rgba(168,85,247,0.08);
  --btn-direct-border:rgba(168,85,247,0.18);
  /* Glass */
  --glass-bg:rgba(15,21,36,0.85);
  --glass-border:rgba(255,255,255,0.05);
  /* Shadows — stronger separation */
  --shadow-card:0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.5);
  --shadow-glow:0 0 24px rgba(29,201,232,0.1);
}
body.light-mode{
  /* ── Light mode — refined blue-tinted white, professional ── */
  --bg-root:#EEF2FA;
  --bg-0:#FFFFFF;
  --bg-1:#F6F8FE;
  --bg-2:#EEF2FA;
  --bg-3:#E5EAF5;
  --bg-4:#D8DFEF;
  --bg-5:#C8D1E5;
  --border-1:#D4DCF0;
  --border-2:#B8C4DE;
  /* Text — near-black primary, proper hierarchy */
  --text-primary:#0D1526;
  --text-secondary:#384870;
  --text-muted:#6070A0;
  --text-dim:#8898C0;
  --text-xdim:#AAB8D8;
  /* Accent — slightly richer cyan for light bg contrast */
  --accent:#0BA8C8;
  --accent-2:#8B2FC9;
  --accent-dim:rgba(11,168,200,0.1);
  --accent-glow:rgba(11,168,200,0.05);
  --green:#059669;
  --blue:#4F46E5;
  --red:#DC2626;
  --orange:#D97706;
  --btn-plus-bg:rgba(11,168,200,0.08);
  --btn-plus-border:rgba(11,168,200,0.22);
  --btn-direct-bg:rgba(139,47,201,0.07);
  --btn-direct-border:rgba(139,47,201,0.2);
  --glass-bg:rgba(255,255,255,0.85);
  --glass-border:rgba(0,0,0,0.05);
  /* Shadows — crisp card lift */
  --shadow-card:0 1px 3px rgba(13,21,38,0.06), 0 4px 16px rgba(13,21,38,0.08);
  --shadow-glow:none;
}
body.light-mode{background:var(--bg-root);color:var(--text-primary);}
body.light-mode input[type="date"]{color-scheme:light;}
body.light-mode input,body.light-mode textarea,body.light-mode select{color-scheme:light;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}
::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.2);}
body.light-mode ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px;}
:root,body{transition:background-color 0.2s ease,color 0.15s ease;}
*,*::before,*::after{transition:background-color 0.15s ease,border-color 0.15s ease,color 0.1s ease,box-shadow 0.15s ease;}
button,input,textarea{transition:background-color 0.1s ease,border-color 0.1s ease,color 0.1s ease;}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 var(--accent-dim)}50%{box-shadow:0 0 16px 2px var(--accent-dim)}}
`;
 document.head.appendChild(el);
}
injectThemeVars();

const _s={
 root:{minHeight:"100vh",width:"100%",background:BR,fontFamily:F,color:TP,overflowX:"hidden",WebkitFontSmoothing:"antialiased"},
 container:{width:"100%",maxWidth:"100%",padding:"16px clamp(16px,3vw,48px) calc(80px + env(safe-area-inset-bottom,0px))",boxSizing:"border-box",overflowX:"hidden",paddingLeft:"max(clamp(16px,3vw,48px),env(safe-area-inset-left,0px))",paddingRight:"max(clamp(16px,3vw,48px),env(safe-area-inset-right,0px))"},

 tabActive:{background:"var(--accent-dim)",color:"var(--accent)",boxShadow:"0 0 0 1px var(--btn-plus-border)"},
 smallTabActive:{background:"var(--accent-dim)",color:"var(--accent)",borderColor:"var(--btn-plus-border)"},

 dateLabel:{color:TS,fontSize:"1rem"},

 metricsGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(155px,45vw),1fr))",gap:"8px",marginBottom:"18px"},
 goalBarLabel:{fontSize:"0.68rem",color:"var(--text-muted)",marginBottom:"6px",fontWeight:"500",letterSpacing:"0.04em"},
 metricBtns:{display:"flex",gap:"3px"},

 totalLabel:{fontSize:"0.95rem",color:"var(--text-secondary)",fontWeight:"500"},
 actionBtns:{display:"flex",gap:"10px"},

 monthMeta:{fontSize:"0.85rem",color:TM},
 monthChip:{fontSize:"0.85rem",color:TM},
 chevron:{fontSize:"0.75rem",color:TM},
 summaryCell:{padding:"10px clamp(8px,2vw,14px)",borderRight:BB1,display:"flex",gap:"6px",alignItems:"flex-start",minWidth:0},
 summaryDot:{width:"8px",height:"8px",borderRadius:"50%",marginTop:"5px",flexShrink:0},
 summaryCellNumbers:{display:"flex",alignItems:"baseline",gap:"6px"},
 summaryAvg:{fontSize:"0.78rem",color:TM,fontWeight:"500"},
 drEmpty:{opacity:0.5},drFuture:{opacity:0.25},drWeekend:{opacity:0.7},
 colMet:{flex:1,textAlign:"center"},colAct:{flex:"0 0 40px",textAlign:"right"},
 dailyDate:{fontSize:"0.85rem",color:TS,fontWeight:"500"},

 lbRank:{fontSize:"1.15rem",width:"30px",textAlign:"center"},
 lbStats:{display:"flex",gap:"clamp(8px,2.2vw,20px)",flexShrink:0},
 lbSG:{textAlign:"center",minWidth:"50px"},

 overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",padding:"0",paddingBottom:"env(safe-area-inset-bottom,0px)"},
 mHint:{fontSize:"0.875rem",color:"var(--text-muted)",lineHeight:1.6,margin:0},
 mActions:{display:"flex",justifyContent:"flex-end",gap:"10px",marginTop:"4px"},
 orDivider:{fontSize:"0.82rem",color:TD,textAlign:"center",letterSpacing:"0.1em"},

 importErr:{fontSize:"0.85rem",color:"var(--red)",background:"rgba(244,63,94,0.08)",padding:"8px 12px",borderRadius:"8px",border:"1px solid rgba(244,63,94,0.2)"},
 prevDate:{fontSize:"0.85rem",color:TS,minWidth:"120px",fontWeight:"500"},
 prevStats:{fontSize:"0.85rem",color:TM},
 editDot:{width:"9px",height:"9px",borderRadius:"50%",flexShrink:0},
 editLabel:{flex:1,fontSize:"0.95rem",color:TS},
 emptyState:{fontSize:"0.95rem",color:TM,textAlign:"center",padding:"clamp(40px,7vh,80px) 0",letterSpacing:"0.02em"},
 noteDot:{fontSize:"7px",color:TA,marginLeft:"3px",verticalAlign:"middle",cursor:"default"},
 settingsTabActive:{color:TA,borderBottomColor:TA},
 xdim95i:{fontSize:"0.95rem",color:TX,fontStyle:"italic"},
 mut95mt2:{fontSize:"0.95rem",color:TM,marginTop:"2px"},
 grn95:{fontSize:"0.95rem",color:"#5DC1DB"},
 x0:{fontSize:"0.95rem",color:TS,letterSpacing:"0.08em",marginBottom:"8px"},
 x8:{fontSize:"0.8rem",color:TD,flexShrink:0},
 x9:{fontSize:"0.95rem",color:TA},
 x11:{background:"var(--bg-0)",border:"1px solid var(--border-1)",color:"var(--text-primary)",marginBottom:"8px"},
 x12:{display:"flex",gap:"5px",flexWrap:"wrap"},
 x13:{ fontSize: "0.9rem", color: TD, letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 6px 2px" },
 x14:{fontSize:"0.9rem",color:TP},
 x15:{display:"flex",gap:"8px",alignItems:"center"},
 // Flex utilities
 fcc:{display:"flex",alignItems:"center",justifyContent:"center"},
 fac:{display:"flex",alignItems:"center"},
 fjsb:{display:"flex",alignItems:"center",justifyContent:"space-between"},
 fsb:{display:"flex",alignItems:"center",justifyContent:"space-between"},
 fdc:{display:"flex",flexDirection:"column"},
 fffe:{display:"flex",alignItems:"center",justifyContent:"flex-end"},
 fjsb2:{display:"flex",justifyContent:"space-between"},
 // Border/radius
 bd1:{border:"1px solid var(--border-1)"},
 br8:{borderRadius:"8px"},
 br10:{borderRadius:"10px"},
 btBd:{borderTop:"1px solid var(--border-1)"},
 bbBd:{borderBottom:"1px solid var(--border-1)"},
 // Font weight
 fw6:{fontWeight:"600"},
 fw7:{fontWeight:"700"},
 fw8:{fontWeight:"800"},
 // Spacing
 g4:{gap:"4px"},
 g8:{gap:"8px"},
 g12:{gap:"12px"},
 g16:{gap:"16px"},
 mb4:{marginBottom:"4px"},
 mb8:{marginBottom:"8px"},
 mb12:{marginBottom:"12px"},
 mb16:{marginBottom:"16px"},
 mt8:{marginTop:"8px"},
 mt16:{marginTop:"16px"},
 p8:{padding:"8px"},
 p12:{padding:"12px"},
 p816:{padding:"8px 16px"},
 // Misc
 cp:{cursor:"pointer"},
 noTap:{WebkitTapHighlightColor:"transparent"},
 oh:{overflow:"hidden"},
 wsn:{whiteSpace:"nowrap"},
 toe:{textOverflow:"ellipsis"},
 w100:{width:"100%"},
 op5:{opacity:0.5},
 // Font/color
 priF:{color:"var(--text-primary)",fontFamily:"'Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif"},
 Fc:{fontFamily:"'Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif",cursor:"pointer"},
 Fno:{fontFamily:"'Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif",outline:"none"},
 ptr85:{cursor:"pointer",fontSize:"0.85rem"},
 ptr9:{cursor:"pointer",fontSize:"0.9rem"},
 grn8:{fontSize:"0.8rem",color:"#5DC1DB"},
 // Input base
 inpBase:{background:"rgba(255,255,255,0.04)",border:"1px solid var(--border-1)",color:"var(--text-primary)",padding:"0.6rem 0.85rem",borderRadius:"10px",fontSize:"1rem",fontFamily:"'DM Sans',system-ui,sans-serif",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.15s ease,box-shadow 0.15s ease"},


 bgBd:{background:"var(--bg-0)",border:"1px solid var(--border-1)"},
 bgBd8:{background:"rgba(255,255,255,0.03)",border:"1px solid var(--glass-border)"},
 bgBdA30:{background:"rgba(168,85,247,0.06)",border:"1px solid rgba(168,85,247,0.2)"},
 bgBdA3A:{background:"rgba(29,201,232,0.06)",border:"1px solid rgba(29,201,232,0.2)"},
 bld3:{fontFamily:"'Syne','DM Sans',sans-serif",fontWeight:"700",fontSize:"1rem",color:"var(--text-primary)"},
 btBd8:{borderTop:"1px solid var(--border-1)",paddingTop:"8px",marginTop:"8px"},
 btn8:{padding:"5px 12px",borderRadius:"6px",fontSize:"0.8rem",cursor:"pointer"},
 btn8s:{padding:"4px 10px",borderRadius:"6px",fontSize:"0.8rem",cursor:"pointer"},
 btn9:{padding:"5px 10px",borderRadius:"6px",fontSize:"0.9rem",cursor:"pointer"},
 colAct:{flex:"0 0 40px",textAlign:"right"},
 cxd:{color:"var(--text-xdim)"},
 dim8:{fontSize:"0.8rem",color:"var(--text-dim)"},
 dim8fs:{fontSize:"0.8rem",color:"var(--text-dim)",flexShrink:0},
 divTop:{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid var(--border-1)"},
 drFuture:{opacity:0.25},
 drWeekend:{opacity:0.7},
 editNumInput:{background:"var(--bg-0)",border:"1px solid var(--border-1)",color:"var(--text-primary)",width:"80px",textAlign:"center",fontSize:"1.2rem",fontWeight:"700",borderRadius:"10px",padding:"0.5rem 4px"},
 f1:{flex:1,minWidth:0},
 fac12:{display:"flex",alignItems:"center",gap:"12px"},
 fac16:{display:"flex",alignItems:"center",gap:"16px"},
 fac6:{display:"flex",alignItems:"center",gap:"6px"},
 fdc12:{display:"flex",flexDirection:"column",gap:"12px"},
 fdc16:{display:"flex",flexDirection:"column",gap:"16px"},
 fdc4:{display:"flex",flexDirection:"column",gap:"4px"},
 fdc8:{display:"flex",flexDirection:"column",gap:"8px"},
 ffe:{display:"flex",alignItems:"center",justifyContent:"flex-end"},
 ffw5:{display:"flex",gap:"5px",flexWrap:"wrap"},
 fg4:{display:"flex",gap:"4px"},
 fg6:{display:"flex",gap:"6px"},
 fg8:{display:"flex",gap:"8px"},
 fg8ac:{display:"flex",gap:"8px",alignItems:"center"},
 fs112:{fontSize:"1.12rem"},
 grn9:{fontSize:"0.9rem",color:"#5DC1DB"},
 h1s:{fontSize:"1.1rem",color:"var(--text-primary)",fontWeight:"700",marginBottom:"8px"},
 mut8:{fontSize:"0.8rem",color:"var(--text-muted)"},
 mut95:{fontSize:"0.95rem",color:"var(--text-muted)"},
 mut95mt3:{fontSize:"0.95rem",color:"var(--text-muted)",marginTop:"3px"},
 nameInput:{background:"rgba(255,255,255,0.04)",border:"1px solid var(--border-1)",color:"var(--text-primary)",borderRadius:"10px",padding:"0.65rem 0.9rem",fontSize:"1rem",fontFamily:"'DM Sans',system-ui,sans-serif",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.15s ease,box-shadow 0.15s ease"},
 p1014:{padding:"10px 14px"},
 p1216:{padding:"12px 16px"},
 p16:{padding:"16px"},
 red8:{fontSize:"0.8rem",color:"#E05577"},
 red95:{fontSize:"0.95rem",color:"#E05577"},
 sInput:{background:"var(--bg-0)",border:"1px solid var(--border-1)",color:"var(--text-primary)",borderRadius:"10px",outline:"none",fontFamily:"'Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif"},
 sec95:{fontSize:"0.95rem",color:"var(--text-secondary)"},
 sec95ls:{fontSize:"0.95rem",color:"var(--text-secondary)",letterSpacing:"0.08em",marginBottom:"2px"},
};
export const s={
 ..._s,
 header:{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:"12px",borderBottom:"1px solid var(--border-1)",marginBottom:"16px",flexWrap:"wrap",gap:"8px"},
 headerRight:{..._s.fac,..._s.g12,flexWrap:"wrap"},
 brand:{fontSize:"clamp(18px,1.6vw,24px)",..._s.fw8,letterSpacing:"0.2em",color:TA},
 userChip:{background:"rgba(255,255,255,0.04)",border:"1px solid var(--glass-border)",color:"var(--text-secondary)",padding:"0.3rem 0.85rem",borderRadius:"7px",fontSize:"0.83rem",fontFamily:"'DM Sans',system-ui,sans-serif",fontWeight:"500",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.12s ease"},
 navTabs:{display:"flex",background:"rgba(255,255,255,0.03)",border:"1px solid var(--glass-border)",borderRadius:"9px",padding:"2px",gap:"1px",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"},
 tab:{background:"none",border:"none",color:"var(--text-muted)",padding:"0.45rem 0.75rem",cursor:"pointer",fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:"0.01em",fontWeight:"500",borderRadius:"7px",fontSize:"0.85rem",whiteSpace:"nowrap",minHeight:"36px",transition:"all 0.12s ease",display:"flex",alignItems:"center",justifyContent:"center",flex:1},
 smallTab:{background:"rgba(255,255,255,0.04)",border:"1px solid var(--glass-border)",color:"var(--text-secondary)",padding:"0.4rem 0.75rem",minHeight:"36px",borderRadius:"7px",fontSize:"0.8rem",fontFamily:F,fontWeight:"500",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
 dateRow:{..._s.fac,gap:"14px",flexWrap:"wrap"},
 dateInput:{background:BG2,..._s.bd1,color:TP,padding:"0.55rem 0.85rem",borderRadius:"9px",fontSize:"1rem",fontFamily:F,fontWeight:"500"},
 weekendBadge:{fontSize:"0.85rem",color:"var(--blue)",background:BG2,..._s.bd1,..._s.br8,padding:"0.3rem 0.75rem",fontWeight:"500"},
 metricCard:{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"14px",padding:"clamp(12px,2.5vw,16px) clamp(12px,2.5vw,16px) 10px",position:"relative",..._s.oh,minWidth:0,boxShadow:"var(--shadow-card)"},
 metricTop:{..._s.fjsb,alignItems:"flex-start",marginBottom:"4px"},
 metricLabel:{fontSize:"0.7rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:"600"},
 keyBind:{fontSize:"0.62rem",color:"var(--text-dim)",background:"rgba(255,255,255,0.05)",border:"1px solid var(--glass-border)",borderRadius:"4px",width:"18px",height:"18px",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",flexShrink:0,fontWeight:"700"},
 keyBindShift:{fontSize:"0.68rem",color:TD,background:BG3,..._s.bd1,borderRadius:"4px",width:"20px",height:"20px",..._s.fcc,flexShrink:0},
 metricValue:{fontSize:"clamp(1.6rem,5vw,2rem)",fontFamily:"'Syne','DM Sans',sans-serif",fontWeight:"800",lineHeight:1,marginBottom:"4px",cursor:"pointer",userSelect:"none",letterSpacing:"-0.03em",color:"var(--text-primary)"},
 metricInput:{fontSize:"clamp(28px,4.5vw,46px)",fontFamily:"'Syne','DM Sans',sans-serif",fontWeight:"700",color:"var(--text-primary)",background:"rgba(255,255,255,0.03)",border:"1px solid var(--border-2)",borderRadius:"10px",width:"100%",marginBottom:"8px",padding:"4px 12px",boxSizing:"border-box"},
 btnMinus:{background:"rgba(255,255,255,0.04)",border:"1px solid var(--glass-border)",color:"var(--text-secondary)",width:"28px",height:"28px",borderRadius:"6px",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"300",transition:"all 0.1s ease",flexShrink:0},
 btnPlus:{background:"var(--btn-plus-bg)",border:"1px solid var(--btn-plus-border)",color:"var(--accent)",width:"28px",height:"28px",borderRadius:"6px",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"600",transition:"all 0.1s ease",flexShrink:0},
 btnDirect:{background:"var(--btn-direct-bg)",border:"1px solid var(--btn-direct-border)",color:"var(--accent-2)",width:"28px",height:"28px",borderRadius:"6px",cursor:"pointer",fontSize:"0.7rem",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700",transition:"all 0.1s ease",flexShrink:0},
 actionRow:{..._s.fjsb,alignItems:"center",paddingTop:"clamp(16px,1.6vw,24px)",..._s.btBd,flexWrap:"wrap",..._s.g12},
 primaryBtn:{background:"var(--accent)",color:"#000",border:"none",borderRadius:"12px",padding:"0.75rem 1.5rem",minHeight:"46px",fontFamily:"'DM Sans',system-ui,sans-serif",fontWeight:"800",fontSize:"0.9rem",cursor:"pointer",letterSpacing:"-0.01em",transition:"all 0.15s ease",boxShadow:"0 2px 16px rgba(29,201,232,0.3)"},
 secondaryBtn:{background:"var(--bg-2)",color:"var(--text-secondary)",border:"1px solid var(--border-1)",borderRadius:"12px",padding:"0.7rem 1.2rem",minHeight:"46px",fontFamily:"'DM Sans',system-ui,sans-serif",fontWeight:"600",fontSize:"0.875rem",cursor:"pointer",transition:"all 0.15s ease"},
 histTopRow:{..._s.fjsb,alignItems:"center",marginBottom:"clamp(14px,1.6vw,24px)",flexWrap:"wrap",..._s.g12},
 sectionLabel:{fontSize:"0.72rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.12em",..._s.fw7},
 pctBadge:{fontSize:"0.82rem",background:BG3,..._s.bd1,..._s.br8,padding:"0.25rem 0.65rem",..._s.fw6,color:TS},
 monthBlock:{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"16px",..._s.oh,boxShadow:"var(--shadow-card)",marginBottom:"14px"},
 monthHeader:{padding:"clamp(12px,1.4vw,20px) clamp(16px,1.8vw,24px)",background:BG2,..._s.bbBd,..._s.fjsb,alignItems:"center",..._s.cp,userSelect:"none"},
 monthTitleGroup:{..._s.fac,gap:"14px",flexWrap:"wrap"},
 monthName:{fontSize:"1rem",letterSpacing:"0.08em",color:TA,textTransform:"uppercase",..._s.fw8},
 monthHeaderRight:{..._s.fac,..._s.g12},
 summaryLabel:{fontSize:"0.75rem",color:TM,textTransform:"uppercase",letterSpacing:"0.1em",padding:"8px 16px 5px",background:BG2,..._s.btBd,..._s.fw7},
 summaryGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(140px,28vw),1fr))",..._s.bbBd},
 summaryCellLabel:{fontSize:"0.68rem",color:TM,textTransform:"uppercase",letterSpacing:"0.05em",..._s.mb4,..._s.fw7,wordBreak:"break-word"},
 summaryTotal:{fontSize:"1.05rem",color:TP,..._s.fw8},
 dailyTH:{..._s.fac,..._s.p816,background:BG2,..._s.bbBd},
 dailyRow:{..._s.fac,..._s.p816,borderBottom:"1px solid var(--bg-3)",minWidth:"460px"},
 dailyNum:{fontSize:"1rem",..._s.fw7},
 lowBadge:{fontSize:"0.68rem",color:"var(--red)",background:BG2,..._s.bd1,borderRadius:"5px",padding:"2px 6px",..._s.fw6},
 editBtn:{background:"none",..._s.bd1,color:TM,fontSize:"0.8rem",padding:"4px 10px",borderRadius:"7px",..._s.cp,fontFamily:F,fontWeight:"500"},
 lbPeriodRow:{display:"inline-flex",background:BG2,..._s.bd1,borderRadius:"12px",marginBottom:"14px",padding:"3px",gap:"2px"},
 lbSubtitle:{fontSize:"0.85rem",color:TS,letterSpacing:"0.06em",textTransform:"uppercase",..._s.mb16,..._s.fw6},
 lbRow:{..._s.fac,padding:"clamp(12px,1.6vw,22px) clamp(14px,2vw,20px)",background:"var(--bg-1)",border:"1px solid var(--border-1)",borderRadius:"14px",marginBottom:"6px",gap:"clamp(10px,2vw,18px)",boxShadow:"var(--shadow-card)"},
 lbName:{fontSize:"1rem",color:TP,..._s.fw6},
 lbBig:{fontSize:"clamp(20px,2.4vw,30px)",color:TP,..._s.fw8,lineHeight:1,letterSpacing:"-0.02em"},
 lbSL:{fontSize:"0.68rem",color:TM,textTransform:"uppercase",letterSpacing:"0.07em",marginTop:"3px",..._s.fw7},
 wwSection:{marginTop:"clamp(28px,3.5vw,48px)",paddingTop:"clamp(20px,2.8vw,36px)",..._s.btBd},
 wwTitle:{fontSize:"0.85rem",color:"var(--blue)",letterSpacing:"0.1em",textTransform:"uppercase",..._s.mb12,..._s.fw7},
 modal:{background:"var(--bg-1)",border:"1px solid var(--border-1)",borderTopLeftRadius:"24px",borderTopRightRadius:"24px",borderBottomLeftRadius:0,borderBottomRightRadius:0,width:"100%",maxWidth:"560px",maxHeight:"92dvh",overflowY:"auto",WebkitOverflowScrolling:"touch",boxShadow:"0 -12px 48px rgba(0,0,0,0.55)",paddingBottom:"env(safe-area-inset-bottom,0px)"},
 mHead:{padding:"14px 16px 12px",borderBottom:"1px solid var(--glass-border)",display:"flex",alignItems:"center",justifyContent:"space-between"},
 mTitle:{fontSize:"1.15rem",fontFamily:"'Syne','DM Sans',sans-serif",fontWeight:"700",color:"var(--text-primary)",letterSpacing:"0.01em"},
 mClose:{background:"none",border:"none",color:TD,..._s.cp,fontSize:"1.2rem",padding:"0 6px",fontWeight:"300"},
 mBody:{padding:"16px 16px 32px",display:"flex",flexDirection:"column",gap:"14px"},
 code:{background:BG3,padding:"3px 8px",borderRadius:"5px",fontSize:"0.85rem",color:"var(--blue)",fontFamily:"monospace",..._s.fw6},
 userBtn:{background:BG3,..._s.bd1,color:TP,padding:"0.75rem 1rem",borderRadius:"12px",..._s.cp,fontSize:"0.95rem",fontFamily:F,textAlign:"left",..._s.w100},
 adminInput:{..._s.inpBase,padding:"0.45rem 0.7rem",..._s.br8,fontSize:"1rem",fontFamily:F,boxSizing:"border-box"},
 bulkTA:{..._s.inpBase,..._s.br10,padding:"1rem",fontSize:"1rem",fontFamily:"monospace",resize:"vertical",lineHeight:1.6,..._s.w100,boxSizing:"border-box"},
 prevHead:{fontSize:"0.82rem",color:TM,letterSpacing:"0.08em",textTransform:"uppercase",..._s.fw7},
 prevList:{background:BG0,..._s.bd1,..._s.br10,padding:"4px 0",maxHeight:"200px",overflow:"auto"},
 prevRow:{display:"flex",..._s.g16,..._s.p816,borderBottom:"1px solid var(--bg-3)",flexWrap:"wrap"},
 prevMore:{fontSize:"0.82rem",color:TD,..._s.p816,textAlign:"center"},
 editRow:{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",background:"rgba(255,255,255,0.02)",borderRadius:"10px",border:"1px solid var(--glass-border)"},
 editCtrl:{..._s.fac,gap:"10px"},
 shareText:{background:BG0,..._s.bd1,..._s.br10,padding:"1.1rem",fontSize:"0.85rem",color:TM,lineHeight:1.8,whiteSpace:"pre-wrap",fontFamily:"monospace",maxHeight:"300px",overflow:"auto"},
 streakBadge:{fontSize:"0.85rem",color:TA,background:BG2,..._s.bd1,..._s.br10,padding:"0.35rem 0.85rem",..._s.fac,gap:"5px",..._s.wsn,..._s.fw6},
 noteArea:{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.03)",border:"1px solid var(--border-1)",borderRadius:"10px",color:"var(--text-primary)",fontSize:"0.9rem",fontFamily:F,padding:"0.6rem 0.85rem",resize:"none",lineHeight:1.6,marginTop:"8px",outline:"none",transition:"border-color 0.15s ease"},
 noteIconBtn:{background:"none",border:"none",cursor:"pointer",fontSize:"0.75rem",padding:"2px 5px",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,WebkitTapHighlightColor:"transparent",opacity:0.6},
 pinDigit:{width:"clamp(52px,14vw,66px)",height:"clamp(60px,16vw,72px)",textAlign:"center",fontSize:"1.7rem",..._s.fw7,background:BG0,border:"2px solid var(--border-1)",borderRadius:"12px",..._s.priF,outline:"none"},
 settingsTab:{background:"none",border:"none",borderBottom:"2px solid transparent",color:"var(--text-muted)",padding:"0.65rem 1.1rem",cursor:"pointer",fontFamily:F,letterSpacing:"0.04em",textTransform:"uppercase",fontSize:"0.78rem",fontWeight:"600",transition:"all 0.15s ease"},
 divTop:{marginTop:"12px",paddingTop:"12px",..._s.btBd},
 pri95F:{fontSize:"0.95rem",..._s.priF},
 x1:{fontSize:"1.1rem",color:TP,..._s.fw7,marginBottom:"8px",letterSpacing:"0"},
 x2:{..._s.editDot},
 x3:{background:"var(--bg-0)",border:"1px solid var(--border-1)",color:"var(--text-primary)",padding:"0.75rem 1rem",borderRadius:"10px",fontSize:"1rem",fontFamily:F,width:"100%",boxSizing:"border-box",outline:"none",letterSpacing:"0.3em",fontSize:"1.25rem",maxWidth:"140px"},
 x4:{background:"none",border:BB2A10,color:"#E05577",padding:"5px 10px",borderRadius:"6px",fontSize:"0.8rem",..._s.Fc},
 x5:{background:"var(--bg-0)",border:"1px solid var(--border-1)",color:"var(--text-primary)",width:"80px",textAlign:"center",fontSize:"1.2rem",fontFamily:F,fontWeight:"700",borderRadius:"10px",padding:"0.5rem 4px",width:"70px"},
 x6:{flex:"0 0 90px",display:"flex",alignItems:"center",gap:"5px",flex:"0 0 80px"},
 x7:{..._s.grn8},
 x10:{fontSize:"1.25rem",..._s.mb4},
};


export const DEFAULT_INDUSTRIES = {
  freight: {
    label: "Freight Brokerage",
    icon: "🚛",
    accentColor: TA,
    weekdayMetrics: [
      { key: "outbound",      label: "Outbound Calls",   short: "Calls",  color: TA,        keyBind: "1", defaultGoal: 50 },
      { key: "activities",    label: "Sales Activities", short: "Activ",  color: "#84D4E8", keyBind: "2", defaultGoal: 30 },
      { key: "conversations", label: "Conversations",    short: "Convos", color: "#5DC1DB", keyBind: "3", defaultGoal: 8  },
      { key: "freshleads",    label: "Fresh Leads Hit",  short: "Leads",  color: "#B07EC8", keyBind: "4", defaultGoal: 10 },
      { key: "advancing",     label: "Advanced",         short: "Adv",    color: "#C8B97E", keyBind: "5", defaultGoal: 3  },
      { key: "loads",         label: "# Loads",          short: "Loads",  color: "#7EC8C8", keyBind: "6", defaultGoal: 1  },
    ],
    weekendMetrics: [
      { key: "activities", label: "Sales Activities", short: "Activ", color: "#84D4E8", keyBind: "1", defaultGoal: 0 },
      { key: "loads",      label: "# Loads",          short: "Loads", color: "#7EC8C8", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["outbound", "activities", "advancing", "loads"],
  },
  realestate: {
    label: "Real Estate",
    icon: "🏠",
    accentColor: "#5DC1DB",
    weekdayMetrics: [
      { key: "outbound",    label: "Outbounds",         short: "Calls",    color: TA,        keyBind: "1", defaultGoal: 50 },
      { key: "convos",      label: "Conversations",     short: "Convos",   color: "#84D4E8", keyBind: "2", defaultGoal: 5  },
      { key: "apptset",     label: "Appointments Set",  short: "Appt Set", color: "#B07EC8", keyBind: "3", defaultGoal: 2  },
      { key: "apptheld",    label: "Appointments Held", short: "Appt Held",color: "#C8B97E", keyBind: "4", defaultGoal: 1  },
      { key: "showings",    label: "Showings",          short: "Show",     color: "#E05577", keyBind: "5", defaultGoal: 2  },
      { key: "agreements",  label: "Agreements Signed", short: "Agree",    color: "#7EC8C8", keyBind: "6", defaultGoal: 0  },
      { key: "closings",    label: "Closings",          short: "Close",    color: "#A5D4A5", keyBind: "7", defaultGoal: 0  },
    ],
    weekendMetrics: [
      { key: "showings",  label: "Showings",          short: "Show",  color: "#E05577", keyBind: "1", defaultGoal: 0 },
      { key: "apptheld",  label: "Appointments Held", short: "Appt",  color: "#C8B97E", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["outbound", "apptset", "apptheld", "closings"],
  },
  insurance: {
    label: "Insurance Sales",
    icon: "🛡️",
    accentColor: "#5B8FD4",
    weekdayMetrics: [
      { key: "outbound",   label: "Outbound Calls",   short: "Calls",   color: "#5B8FD4", keyBind: "1", defaultGoal: 60 },
      { key: "convos",     label: "Conversations",    short: "Convos",  color: "#84D4E8", keyBind: "2", defaultGoal: 8  },
      { key: "quotes",     label: "Quotes Sent",      short: "Quotes",  color: "#B07EC8", keyBind: "3", defaultGoal: 5  },
      { key: "apptset",    label: "Appointments Set", short: "Appts",   color: "#C8B97E", keyBind: "4", defaultGoal: 2  },
      { key: "policies",   label: "Policies Written", short: "Policy",  color: "#A5D4A5", keyBind: "5", defaultGoal: 0  },
      { key: "referrals",  label: "Referrals Asked",  short: "Refs",    color: "#7EC8C8", keyBind: "6", defaultGoal: 3  },
    ],
    weekendMetrics: [
      { key: "convos",   label: "Conversations",    short: "Convos", color: "#84D4E8", keyBind: "1", defaultGoal: 0 },
      { key: "policies", label: "Policies Written", short: "Policy", color: "#A5D4A5", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["outbound", "quotes", "apptset", "policies"],
  },
  solar: {
    label: "Solar Sales",
    icon: "☀️",
    accentColor: "#F5C842",
    weekdayMetrics: [
      { key: "doors",     label: "Doors Knocked",     short: "Doors",   color: "#F5C842", keyBind: "1", defaultGoal: 40 },
      { key: "convos",    label: "Conversations",     short: "Convos",  color: "#84D4E8", keyBind: "2", defaultGoal: 10 },
      { key: "sits",      label: "Sits / Demos",      short: "Sits",    color: "#B07EC8", keyBind: "3", defaultGoal: 3  },
      { key: "proposals", label: "Proposals Out",     short: "Props",   color: "#C8B97E", keyBind: "4", defaultGoal: 2  },
      { key: "closes",    label: "Closes / Contracts",short: "Closes",  color: "#A5D4A5", keyBind: "5", defaultGoal: 0  },
      { key: "referrals", label: "Referrals Collected",short: "Refs",   color: "#7EC8C8", keyBind: "6", defaultGoal: 1  },
    ],
    weekendMetrics: [
      { key: "doors",  label: "Doors Knocked", short: "Doors", color: "#F5C842", keyBind: "1", defaultGoal: 0 },
      { key: "convos", label: "Conversations", short: "Convos",color: "#84D4E8", keyBind: "2", defaultGoal: 0 },
      { key: "sits",   label: "Sits / Demos",  short: "Sits",  color: "#B07EC8", keyBind: "3", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["doors", "convos", "sits", "closes"],
  },
  saas: {
    label: "SaaS / Tech Sales",
    icon: "💻",
    accentColor: "#7B6FD8",
    weekdayMetrics: [
      { key: "outbound",  label: "Outbound Calls",  short: "Calls",   color: "#7B6FD8", keyBind: "1", defaultGoal: 40 },
      { key: "emails",    label: "Emails Sent",     short: "Emails",  color: "#84D4E8", keyBind: "2", defaultGoal: 30 },
      { key: "convos",    label: "Conversations",   short: "Convos",  color: "#5DC1DB", keyBind: "3", defaultGoal: 6  },
      { key: "demos",     label: "Demos Booked",    short: "Demos",   color: "#B07EC8", keyBind: "4", defaultGoal: 2  },
      { key: "proposals", label: "Proposals Sent",  short: "Props",   color: "#C8B97E", keyBind: "5", defaultGoal: 1  },
      { key: "closes",    label: "Deals Closed",    short: "Closed",  color: "#A5D4A5", keyBind: "6", defaultGoal: 0  },
    ],
    weekendMetrics: [
      { key: "emails", label: "Emails Sent",  short: "Emails", color: "#84D4E8", keyBind: "1", defaultGoal: 0 },
      { key: "convos", label: "Conversations",short: "Convos", color: "#5DC1DB", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["outbound", "convos", "demos", "closes"],
  },
  mortgage: {
    label: "Mortgage / Lending",
    icon: "🏦",
    accentColor: "#4DA8DA",
    weekdayMetrics: [
      { key: "outbound",    label: "Outbound Calls",      short: "Calls",   color: "#4DA8DA", keyBind: "1", defaultGoal: 50 },
      { key: "convos",      label: "Conversations",       short: "Convos",  color: "#84D4E8", keyBind: "2", defaultGoal: 8  },
      { key: "apps",        label: "Applications Started",short: "Apps",    color: "#B07EC8", keyBind: "3", defaultGoal: 2  },
      { key: "preapprovals",label: "Pre-Approvals",       short: "Pre-App", color: "#C8B97E", keyBind: "4", defaultGoal: 1  },
      { key: "fundings",    label: "Loan Fundings",       short: "Funded",  color: "#A5D4A5", keyBind: "5", defaultGoal: 0  },
      { key: "referrals",   label: "Referral Requests",   short: "Refs",    color: "#7EC8C8", keyBind: "6", defaultGoal: 3  },
    ],
    weekendMetrics: [
      { key: "convos",   label: "Conversations", short: "Convos", color: "#84D4E8", keyBind: "1", defaultGoal: 0 },
      { key: "referrals",label: "Referral Requests",short: "Refs",color: "#7EC8C8", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["outbound", "apps", "preapprovals", "fundings"],
  },
  recruiting: {
    label: "Recruiting / Staffing",
    icon: "🤝",
    accentColor: "#6BC5A8",
    weekdayMetrics: [
      { key: "outbound",     label: "Outbound Calls",     short: "Calls",  color: "#6BC5A8", keyBind: "1", defaultGoal: 60 },
      { key: "convos",       label: "Conversations",      short: "Convos", color: "#84D4E8", keyBind: "2", defaultGoal: 10 },
      { key: "submittals",   label: "Submittals Sent",    short: "Subs",   color: "#B07EC8", keyBind: "3", defaultGoal: 3  },
      { key: "interviews",   label: "Interviews Scheduled",short: "Intv",  color: "#C8B97E", keyBind: "4", defaultGoal: 2  },
      { key: "placements",   label: "Placements Made",    short: "Placed", color: "#A5D4A5", keyBind: "5", defaultGoal: 0  },
      { key: "bdcalls",      label: "BD Calls (Clients)", short: "BD",     color: "#7EC8C8", keyBind: "6", defaultGoal: 10 },
    ],
    weekendMetrics: [
      { key: "convos", label: "Conversations", short: "Convos", color: "#84D4E8", keyBind: "1", defaultGoal: 0 },
      { key: "bdcalls", label: "BD Calls",     short: "BD",     color: "#7EC8C8", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["outbound", "submittals", "interviews", "placements"],
  },
  meddevice: {
    label: "Medical Device / Pharma",
    icon: "⚕️",
    accentColor: "#E05577",
    weekdayMetrics: [
      { key: "calls",      label: "HCP Calls",          short: "Calls",  color: "#E05577", keyBind: "1", defaultGoal: 15 },
      { key: "contacts",   label: "New Contacts Made",  short: "Ctcts",  color: "#84D4E8", keyBind: "2", defaultGoal: 5  },
      { key: "demos",      label: "Product Demos",      short: "Demos",  color: "#B07EC8", keyBind: "3", defaultGoal: 2  },
      { key: "sampledrops",label: "Samples Dropped",   short: "Samps",  color: "#C8B97E", keyBind: "4", defaultGoal: 3  },
      { key: "trialstarts",label: "Trial Units Placed", short: "Trials", color: "#7EC8C8", keyBind: "5", defaultGoal: 0  },
      { key: "orders",     label: "Orders Placed",      short: "Orders", color: "#A5D4A5", keyBind: "6", defaultGoal: 0  },
    ],
    weekendMetrics: [
      { key: "calls",   label: "HCP Calls",     short: "Calls",  color: "#E05577", keyBind: "1", defaultGoal: 0 },
      { key: "contacts",label: "New Contacts",  short: "Ctcts",  color: "#84D4E8", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["calls", "demos", "trialstarts", "orders"],
  },
  financial: {
    label: "Financial Advisor",
    icon: "📈",
    accentColor: "#4CAF7D",
    weekdayMetrics: [
      { key: "outbound",   label: "Outbound Calls",   short: "Calls",   color: "#4CAF7D", keyBind: "1", defaultGoal: 40 },
      { key: "convos",     label: "Meaningful Convos", short: "Convos", color: "#84D4E8", keyBind: "2", defaultGoal: 6  },
      { key: "apptset",    label: "Appointments Set",  short: "Appts",  color: "#B07EC8", keyBind: "3", defaultGoal: 2  },
      { key: "reviews",    label: "Reviews Completed", short: "Rvws",   color: "#C8B97E", keyBind: "4", defaultGoal: 1  },
      { key: "plans",      label: "Plans Presented",   short: "Plans",  color: "#7EC8C8", keyBind: "5", defaultGoal: 0  },
      { key: "newaccounts",label: "New Accounts Opened",short: "Accts", color: "#A5D4A5", keyBind: "6", defaultGoal: 0  },
    ],
    weekendMetrics: [
      { key: "outbound", label: "Outbound Calls", short: "Calls",  color: "#4CAF7D", keyBind: "1", defaultGoal: 0 },
      { key: "convos",   label: "Conversations",  short: "Convos", color: "#84D4E8", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["outbound", "apptset", "reviews", "newaccounts"],
  },
  homeservices: {
    label: "Home Services",
    icon: "🔧",
    accentColor: "#D4874A",
    weekdayMetrics: [
      { key: "calls",     label: "Inbound / Outbound Calls",short: "Calls",   color: "#D4874A", keyBind: "1", defaultGoal: 30 },
      { key: "estimates", label: "Estimates Sent",           short: "Ests",    color: "#84D4E8", keyBind: "2", defaultGoal: 5  },
      { key: "booked",    label: "Jobs Booked",              short: "Booked",  color: "#B07EC8", keyBind: "3", defaultGoal: 3  },
      { key: "completed", label: "Jobs Completed",           short: "Compl",   color: "#A5D4A5", keyBind: "4", defaultGoal: 2  },
      { key: "upsells",   label: "Upsells Made",             short: "Ups",     color: "#C8B97E", keyBind: "5", defaultGoal: 1  },
      { key: "reviews",   label: "Reviews Requested",        short: "Revs",    color: "#7EC8C8", keyBind: "6", defaultGoal: 2  },
    ],
    weekendMetrics: [
      { key: "calls",     label: "Calls",          short: "Calls",  color: "#D4874A", keyBind: "1", defaultGoal: 0 },
      { key: "completed", label: "Jobs Completed", short: "Compl",  color: "#A5D4A5", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["estimates", "booked", "completed", "reviews"],
  },
  automotive: {
    label: "Auto Sales",
    icon: "🚗",
    accentColor: "#C8455A",
    weekdayMetrics: [
      { key: "ups",       label: "Ups (Floor Traffic)",  short: "Ups",    color: "#C8455A", keyBind: "1", defaultGoal: 8  },
      { key: "demos",     label: "Demo Drives",          short: "Demos",  color: "#84D4E8", keyBind: "2", defaultGoal: 4  },
      { key: "pencils",   label: "Pencils / Desk Deals", short: "Pencil", color: "#B07EC8", keyBind: "3", defaultGoal: 3  },
      { key: "sold",      label: "Units Sold",           short: "Sold",   color: "#A5D4A5", keyBind: "4", defaultGoal: 1  },
      { key: "outbound",  label: "Outbound Calls",       short: "Calls",  color: "#C8B97E", keyBind: "5", defaultGoal: 20 },
      { key: "reviews",   label: "Reviews Requested",    short: "Revs",   color: "#7EC8C8", keyBind: "6", defaultGoal: 2  },
    ],
    weekendMetrics: [
      { key: "ups",    label: "Ups",         short: "Ups",    color: "#C8455A", keyBind: "1", defaultGoal: 0 },
      { key: "demos",  label: "Demo Drives", short: "Demos",  color: "#84D4E8", keyBind: "2", defaultGoal: 0 },
      { key: "sold",   label: "Units Sold",  short: "Sold",   color: "#A5D4A5", keyBind: "3", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["ups", "demos", "sold", "outbound"],
  },
  b2b_general: {
    label: "B2B Sales",
    icon: "💼",
    accentColor: "#6BADE0",
    weekdayMetrics: [
      { key: "outbound",  label: "Outbound Calls",  short: "Calls",   color: "#6BADE0", keyBind: "1", defaultGoal: 50 },
      { key: "emails",    label: "Emails Sent",     short: "Emails",  color: "#84D4E8", keyBind: "2", defaultGoal: 25 },
      { key: "convos",    label: "Conversations",   short: "Convos",  color: "#5DC1DB", keyBind: "3", defaultGoal: 8  },
      { key: "meetings",  label: "Meetings Booked", short: "Meetings",color: "#B07EC8", keyBind: "4", defaultGoal: 2  },
      { key: "proposals", label: "Proposals Sent",  short: "Props",   color: "#C8B97E", keyBind: "5", defaultGoal: 1  },
      { key: "closes",    label: "Deals Closed",    short: "Closed",  color: "#A5D4A5", keyBind: "6", defaultGoal: 0  },
    ],
    weekendMetrics: [
      { key: "emails", label: "Emails Sent",  short: "Emails", color: "#84D4E8", keyBind: "1", defaultGoal: 0 },
      { key: "convos", label: "Conversations",short: "Convos", color: "#5DC1DB", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["outbound", "convos", "meetings", "closes"],
  },
  roofing: {
    label: "Roofing / Exteriors",
    icon: "🏗️",
    accentColor: "#A0784A",
    weekdayMetrics: [
      { key: "doors",     label: "Doors Knocked",    short: "Doors",  color: "#A0784A", keyBind: "1", defaultGoal: 30 },
      { key: "convos",    label: "Conversations",    short: "Convos", color: "#84D4E8", keyBind: "2", defaultGoal: 8  },
      { key: "inspects",  label: "Inspections Set",  short: "Insp",   color: "#B07EC8", keyBind: "3", defaultGoal: 3  },
      { key: "estimates", label: "Estimates Sent",   short: "Ests",   color: "#C8B97E", keyBind: "4", defaultGoal: 2  },
      { key: "signed",    label: "Contracts Signed", short: "Signed", color: "#A5D4A5", keyBind: "5", defaultGoal: 0  },
      { key: "referrals", label: "Referrals Asked",  short: "Refs",   color: "#7EC8C8", keyBind: "6", defaultGoal: 1  },
    ],
    weekendMetrics: [
      { key: "doors",    label: "Doors Knocked",  short: "Doors",  color: "#A0784A", keyBind: "1", defaultGoal: 0 },
      { key: "inspects", label: "Inspections Set", short: "Insp",  color: "#B07EC8", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["doors", "inspects", "estimates", "signed"],
  },
  smb_retail: {
    label: "Retail / SMB Sales",
    icon: "🛍️",
    accentColor: "#E08E4A",
    weekdayMetrics: [
      { key: "customers",  label: "Customers Helped",   short: "Cust",  color: "#E08E4A", keyBind: "1", defaultGoal: 20 },
      { key: "outbound",   label: "Outbound Calls",     short: "Calls", color: "#84D4E8", keyBind: "2", defaultGoal: 15 },
      { key: "demos",      label: "Product Demos",      short: "Demos", color: "#B07EC8", keyBind: "3", defaultGoal: 5  },
      { key: "sales",      label: "Sales Made",         short: "Sales", color: "#A5D4A5", keyBind: "4", defaultGoal: 8  },
      { key: "upsells",    label: "Upsells / Add-ons",  short: "Ups",   color: "#C8B97E", keyBind: "5", defaultGoal: 3  },
      { key: "reviews",    label: "Reviews Requested",  short: "Revs",  color: "#7EC8C8", keyBind: "6", defaultGoal: 2  },
    ],
    weekendMetrics: [
      { key: "customers", label: "Customers Helped", short: "Cust",  color: "#E08E4A", keyBind: "1", defaultGoal: 0 },
      { key: "sales",     label: "Sales Made",       short: "Sales", color: "#A5D4A5", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["customers", "sales", "upsells", "reviews"],
  },
  custom: {
    label: "Custom / Other",
    icon: "✦",
    accentColor: "#7B6FD8",
    weekdayMetrics: [
      { key: "calls",      label: "Calls Made",       short: "Calls",   color: "#7B6FD8", keyBind: "1", defaultGoal: 30 },
      { key: "convos",     label: "Conversations",    short: "Convos",  color: "#84D4E8", keyBind: "2", defaultGoal: 8  },
      { key: "meetings",   label: "Meetings / Demos", short: "Meetings",color: "#B07EC8", keyBind: "3", defaultGoal: 2  },
      { key: "proposals",  label: "Proposals Sent",   short: "Props",   color: "#C8B97E", keyBind: "4", defaultGoal: 1  },
      { key: "closes",     label: "Closes / Won",     short: "Won",     color: "#A5D4A5", keyBind: "5", defaultGoal: 0  },
    ],
    weekendMetrics: [
      { key: "calls",  label: "Calls Made",    short: "Calls",  color: "#7B6FD8", keyBind: "1", defaultGoal: 0 },
      { key: "convos", label: "Conversations", short: "Convos", color: "#84D4E8", keyBind: "2", defaultGoal: 0 },
    ],
    primaryGoalMetrics: ["calls", "convos", "meetings", "closes"],
  },
};

export const MONTH_NAMES = ["January","February","March","April","May","June",
          "July","August","September","October","November","December"];
export const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const METRIC_COLORS = [TA,"#84D4E8","#5DC1DB","#B07EC8","#E05577",TA,"#7EC8C8","#D4A5D4","#A5D4A5","#D4C5A5"];

export function getDow(d) { const [y,m,dd]=d.split("-").map(Number); return new Date(y,m-1,dd).getDay(); }
export function isWeekend(d) { const w=getDow(d); return w===0||w===6; }
export function todayStr() {
 const d = new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
export function monthKey(d) { return d.slice(0,7); }
export function weekKey(ds) {
 const [y,m,d]=ds.split("-").map(Number),dt=new Date(y,m-1,d),mon=new Date(dt);
 mon.setDate(dt.getDate()-(dt.getDay()===0?6:dt.getDay()-1));
 return `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,"0")}-${String(mon.getDate()).padStart(2,"0")}`;
}
export function lastWeekendSat(ds) {
 const [y,m,d]=ds.split("-").map(Number),dt=new Date(y,m-1,d),sat=new Date(dt),dow=dt.getDay();
 if(dow===0)sat.setDate(dt.getDate()-1);else if(dow!==6)sat.setDate(dt.getDate()-dow-1);
 return `${sat.getFullYear()}-${String(sat.getMonth()+1).padStart(2,"0")}-${String(sat.getDate()).padStart(2,"0")}`;
}
export function formatDate(ds) { const [y,m,d]=ds.split("-"); return `${SHORT_MONTHS[parseInt(m)-1]} ${parseInt(d)}, ${y}`; }
export function formatShort(ds) { const [,m,d]=ds.split("-"); return `${SHORT_MONTHS[parseInt(m)-1]} ${parseInt(d)}`; }
export function dayName(ds) { return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][getDow(ds)]; }
export function allDaysInMonth(ym) {
 const [y,m]=ym.split("-").map(Number),days=[],dim=new Date(y,m,0).getDate();
 for(let d=1;d<=dim;d++) days.push(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
 return days;
}

export function computeGoalPct(data, metrics, userGoals) {
 const primary = metrics.filter(m => m.defaultGoal > 0);
 if (!primary.length) return 0;
 let total = 0, hit = 0;
 for (const m of primary) {
  const goal = (userGoals && userGoals[m.key] != null) ? userGoals[m.key] : m.defaultGoal;
  if (goal <= 0) continue;
  total++;
  hit += (data[m.key] || 0) / goal; // no cap — allows >100%
 }
 return total > 0 ? Math.round((hit / total) * 100) : 0;
}

export function computeStreak(allData, protectedDates = []) {
 // Returns {current, longest} counting consecutive logged weekdays up to today
 // protectedDates: array of date strings that count as "active" even with no data (PTO/sick)
 const today = todayStr();
 const protectedSet = new Set(protectedDates || []);
 const logged = new Set(
  Object.entries(allData)
   .filter(([d,v])=>!isWeekend(d)&&v&&Object.values(v).some(x=>typeof x==="number"&&x>0))
   .map(([d])=>d)
 );
 // Merge protected dates into logged set (skip weekends)
 for (const d of protectedSet) { if (!isWeekend(d)) logged.add(d); }
 function prevWeekday(ds){
  const [y,m,d]=ds.split("-").map(Number);
  const dt=new Date(y,m-1,d);
  do{dt.setDate(dt.getDate()-1);}while(isWeekend(dt.toISOString().split("T")[0]));
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
 }
 // current streak: consecutive days ending at today (or yesterday if today not yet logged)
 let cur=0,d=today;
 if(!logged.has(d))d=prevWeekday(d); // allow today to not be logged yet
 while(logged.has(d)&&cur<500){cur++;d=prevWeekday(d);}
 const sorted=[...logged].sort();
 let best=0,run=0,prev=null;
 for(const ds of sorted){
  if(!prev){run=1;}
  else{
   let nxt=prev;
   do{const [y,m,dd]=nxt.split("-").map(Number);const dt=new Date(y,m-1,dd);dt.setDate(dt.getDate()+1);nxt=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;}while(isWeekend(nxt));
   run=nxt===ds?run+1:1;
  }
  if(run>best)best=run;
  prev=ds;
 }
 return{current:cur,longest:Math.max(best,cur)};
}

export async function storageGet(k) {
 try {
  const { data } = await window._sb.from("kv_store").select("value").eq("key", k).maybeSingle();
  return data ? data.value : null;
 } catch { return null; }
}

export async function storageSet(k, v) {
 try {
  await window._sb.from("kv_store").upsert(
   { key: k, value: v, updated_at: new Date().toISOString() },
   { onConflict: "key" }
  );
 } catch {}
}

export async function storageDelete(k) {
 try { await window._sb.from("kv_store").delete().eq("key", k); } catch {}
}

// orgId = "org-{id}" for org members, "solo-{userId}" for individual users
// This ensures different orgs (and solo users) never see each other's data.
// _oid is set by the App on init so all storage functions below pick it up.
let _oid = null;
export function setNs(id) { _oid = id; }
export function getNs() { return _oid; }
export function nsKey(orgId, k) { return `${orgId}::${k}`; }
export function ns(k) { return nsKey(_oid||"legacy", k); }

export async function loadUsers() { return (await storageGet(ns("at-users"))) || []; }
export async function saveUsers(u) {
 // Strip avatarUrl before saving — photos are stored separately via saveAvatarPhoto
 const clean = u.map(usr => { const {avatarUrl,...rest}=usr; return rest; });
 await storageSet(ns("at-users"), clean);
}

// Avatar photos stored separately (not in at-users) to avoid bloating the users array
// with large base64 strings that break Supabase reads
export async function loadAvatarPhoto(userId) { return await storageGet(ns(`at-avatar-photo-${userId}`)); }
export async function saveAvatarPhoto(userId, dataUrl) {
 if (dataUrl) { await storageSet(ns(`at-avatar-photo-${userId}`), dataUrl); }
 else { await storageDelete(ns(`at-avatar-photo-${userId}`)); }
}
export async function loadUserData(id) { return (await storageGet(ns(`at-data-${id}`))) || {}; }
export async function saveUserData(id, d) { await storageSet(ns(`at-data-${id}`), d); }
export async function loadIndustryConfig(ind) { return (await storageGet(ns(`at-cfg-${ind}`))) || DEFAULT_INDUSTRIES[ind]; }
export async function saveIndustryConfig(ind, cfg) { await storageSet(ns(`at-cfg-${ind}`), cfg); }
export async function loadAdmins() { return (await storageGet(ns("at-admins"))) || []; }
export async function saveAdmins(a) { await storageSet(ns("at-admins"), a); }
export async function loadSuperAdmin() { return (await storageGet(ns("at-superadmin"))) || null; }
export async function saveSuperAdmin(id) { await storageSet(ns("at-superadmin"), id); }
export async function loadPins() { return (await storageGet(ns("at-pins"))) || {}; }
export async function savePins(p) { await storageSet(ns("at-pins"), p); }
export async function loadTeams() { return (await storageGet(ns("at-teams"))) || {}; }
export async function saveTeams(t) { await storageSet(ns("at-teams"), t); }
export async function loadThreads(uid) { return (await storageGet(ns(`at-threads-${uid}`))) || []; }
export async function saveThreads(uid, threads) { await storageSet(ns(`at-threads-${uid}`), threads); }
export async function loadMessages(threadKey) { return (await storageGet(ns(`at-msgs-${threadKey}`))) || []; }
export async function saveMessages(threadKey, msgs) { await storageSet(ns(`at-msgs-${threadKey}`), msgs); }

export function genId(prefix="") { return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`; }

// Global SuperAdmin (not namespace-scoped — one per entire app instance)
export async function loadGlobalSuperAdmin() {
 return await storageGet("GLOBAL_SA");
}
export async function saveGlobalSuperAdmin(userId, userName, personalNs) {
 await storageSet("GLOBAL_SA", { userId, userName, personalNs, setAt: new Date().toISOString() });
}

// Global space index — lets superadmin (and search) find all spaces
export async function loadSpaceIndex() {
 return (await storageGet("SPACE_INDEX")) || [];
}
async function addToSpaceIndex(meta) {
 const idx = await loadSpaceIndex();
 if(idx.find(e => e.id === meta.id)) return;
 await storageSet("SPACE_INDEX", [...idx, { id: meta.id, type: meta.type, name: meta.name, createdAt: meta.createdAt, description: meta.description||"" }]);
}
export async function removeFromSpaceIndex(spaceId) {
 const idx = await loadSpaceIndex();
 await storageSet("SPACE_INDEX", idx.filter(e => e.id !== spaceId));
}

// Global user registry — lets superadmin see all users across all spaces
// Stores: { userId, userName, personalNs, spaceId, spaceType, spaceName, registeredAt }
export async function loadUserRegistry() {
 return (await storageGet("USER_REGISTRY")) || [];
}
export async function registerUserGlobally(userId, userName, personalNs, spaceId, spaceType, spaceName) {
 const reg = await loadUserRegistry();
 const exists = reg.find(r => r.userId === userId);
 if(exists) {
  await storageSet("USER_REGISTRY", reg.map(r => r.userId === userId ? { ...r, personalNs, spaceId, spaceType, spaceName } : r));
 } else {
  await storageSet("USER_REGISTRY", [...reg, { userId, userName, personalNs, spaceId, spaceType, spaceName, registeredAt: new Date().toISOString() }]);
 }
}

async function createSpaceMeta(type, name, creatorId, extra={}) {
 const id = `${type}-${genId()}`;
 const meta = { id, type, name: name.trim(), createdAt: new Date().toISOString(), createdBy: creatorId, ...extra };
 await storageSet(`spacemeta-${id}`, meta);
 await addToSpaceIndex(meta);
 return meta;
}

export async function loadSpaceMeta(spaceId) {
 return await storageGet(`spacemeta-${spaceId}`);
}

export async function saveSpaceMeta(meta) {
 await storageSet(`spacemeta-${meta.id}`, meta);
 const idx = await loadSpaceIndex();
 if(idx.find(e => e.id === meta.id)) {
  await storageSet("SPACE_INDEX", idx.map(e => e.id === meta.id ? { ...e, name: meta.name, description: meta.description||"" } : e));
 }
}

export async function createOrganization(name, creatorUserId, verificationData=null) {
 // verificationData: { method: "email"|"linkedin", value: string } — null = no verification submitted yet
 const verified = false; // always starts unverified
 const pendingApproval = !!verificationData; // pending if data submitted, waiting for SA review
 const meta = await createSpaceMeta("org", name, creatorUserId, {
  verified, pendingApproval,
  verificationMethod: verificationData?.method || null,
  verificationValue: verificationData?.value || null,
 });
 // Seed default roles
 await saveOrgRoles(meta.id, defaultOrgRoles());
 return { orgId: meta.id, orgMeta: meta };
}
export async function loadOrgMeta(orgId) { return await loadSpaceMeta(orgId); }
export async function saveOrgMeta(m) { return await saveSpaceMeta(m); }

export async function createCommunity(name, creatorUserId, description="", joinPin="") {
 // joinPin: optional password for instant join (empty = approval required)
 return await createSpaceMeta("community", name, creatorUserId, { description, joinPin: joinPin||"" });
}

// Each entry: { userId, name, industry, communityIndustry?, joinedAt, personalNs, avatarColor? }
export async function loadCommunityMembers(communityId) {
 return (await storageGet(`commembers-${communityId}`)) || [];
}
async function saveCommunityMembers(communityId, members) {
 await storageSet(`commembers-${communityId}`, members);
}
export async function addCommunityMember(communityId, user, personalNs, communityIndustry) {
 const members = await loadCommunityMembers(communityId);
 if(members.find(m => m.userId === user.id)) return;
 await saveCommunityMembers(communityId, [...members, {
  userId: user.id, name: user.name,
  industry: user.industry,
  communityIndustry: communityIndustry || user.industry,
  avatarColor: user.avatarColor,
  joinedAt: new Date().toISOString(), personalNs
 }]);
}
export async function updateCommunityMemberIndustry(communityId, userId, newIndustry) {
 const members = await loadCommunityMembers(communityId);
 await saveCommunityMembers(communityId, members.map(m =>
  m.userId === userId ? { ...m, communityIndustry: newIndustry } : m
 ));
}
export async function removeCommunityMember(communityId, userId) {
 const members = await loadCommunityMembers(communityId);
 await saveCommunityMembers(communityId, members.filter(m => m.userId !== userId));
}

// pendingRequests stored per space: [{requestId, userId, userName, userIndustry, personalNs, requestedAt, type}]
export async function loadPendingRequests(spaceId) {
 return (await storageGet(`pending-${spaceId}`)) || [];
}
async function savePendingRequests(spaceId, reqs) {
 await storageSet(`pending-${spaceId}`, reqs);
}
export async function addJoinRequest(spaceId, user, personalNs) {
 const reqs = await loadPendingRequests(spaceId);
 if(reqs.find(r => r.userId === user.id)) return false; // already pending
 const req = { requestId: genId("req"), userId: user.id, userName: user.name,
        userIndustry: user.industry, personalNs, requestedAt: new Date().toISOString(), type:"request" };
 await savePendingRequests(spaceId, [...reqs, req]);
 return true;
}
export async function removeJoinRequest(spaceId, userId) {
 const reqs = await loadPendingRequests(spaceId);
 await savePendingRequests(spaceId, reqs.filter(r => r.userId !== userId));
}

// Invite shape: { token, spaceId, spaceType, spaceName, createdByName, createdAt, uses, targetUserId? }

export async function createInviteToken(spaceId, spaceName, createdByName, spaceType="org", targetUserId=null) {
 const token = genId("inv");
 const invite = { token, spaceId, spaceType, spaceName, createdByName,
         createdAt: new Date().toISOString(), uses: 0, maxUses: 100,
         expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
         ...(targetUserId ? { targetUserId } : {}) };
 await storageSet(`invite-${token}`, invite);
 const existing = (await storageGet(`invite-list-${spaceId}`)) || [];
 await storageSet(`invite-list-${spaceId}`, [...existing, token]);
 return token;
}

export async function loadInvite(token) {
 return await storageGet(`invite-${token}`);
}

export async function consumeInvite(token) {
 const invite = await loadInvite(token);
 if(!invite) return null;
 // Check expiry
 if(invite.expiresAt && new Date(invite.expiresAt) < new Date()) return { ...invite, _expired: true };
 // Check max uses
 if(invite.maxUses && invite.uses >= invite.maxUses) return { ...invite, _maxed: true };
 await storageSet(`invite-${token}`, { ...invite, uses: (invite.uses||0)+1 });
 return invite;
}

export async function loadSpaceInvites(spaceId) {
 const tokens = (await storageGet(`invite-list-${spaceId}`)) || [];
 const invites = await Promise.all(tokens.map(t => loadInvite(t)));
 return invites.filter(Boolean);
}

async function loadOrgInvites(orgId) { return loadSpaceInvites(orgId); }

export async function revokeInvite(spaceId, token) {
 await storageDelete(`invite-${token}`);
 const existing = (await storageGet(`invite-list-${spaceId}`)) || [];
 await storageSet(`invite-list-${spaceId}`, existing.filter(t => t !== token));
}

export function soloNs(userId) { return `solo-${userId}`; }

export async function migrateSoloToOrg(userId, orgId) {
 const soloNsId = soloNs(userId);
 const keysToMigrate = [
  `at-data-${userId}`, `at-goals-${userId}`, `at-script-${userId}`,
  `at-vmscript-${userId}`, `at-muted-${userId}`, `at-threads-${userId}`
 ];
 for(const k of keysToMigrate) {
  const val = await storageGet(nsKey(soloNsId, k));
  if(val !== null) await storageSet(nsKey(orgId, k), val);
 }
 const orgUsers = (await storageGet(nsKey(orgId,"at-users"))) || [];
 const soloUsers = (await storageGet(nsKey(soloNsId,"at-users"))) || [];
 const me = soloUsers.find(u => u.id === userId);
 if(me && !orgUsers.find(u => u.id === userId)) {
  await storageSet(nsKey(orgId,"at-users"), [...orgUsers, me]);
 }
}

export async function loadUserMemberships(userId) {
 return (await storageGet(`usermem-${userId}`)) || { orgId: null, communityIds: [] };
}
export async function saveUserMemberships(userId, mem) {
 await storageSet(`usermem-${userId}`, mem);
}

export function getInviteTokenFromURL() {
 const m = window.location.pathname.match(/^\/invite\/([a-z0-9]+)$/i);
 return m ? m[1] : null;
}

export function getInviteURL(token) {
 return `${window.location.origin}/invite/${token}`;
}

export function useFlash() {
 const [flashing,setFlashing]=useState({});
 const flash=useCallback((key,dir)=>{
  setFlashing(f=>({...f,[key]:dir}));
  setTimeout(()=>setFlashing(f=>({...f,[key]:null})),200);
 },[]);
 return [flashing,flash];
}

// ── Avatar helpers (used by both ActivityTracker and SpaceUI) ──────────────
export const AVATAR_COLOR_PRESETS = [
 "#23CDED","#84D4E8","#5DC1DB","#B07EC8","#E05577","#7EC8C8","#C8C87E","#D4A5D4",
 "#E8A87E","#88D4A8","#A8B4E8","#E8A8D4","#A8E8D4","#D4B888","#88C0D4","#C4A888"
];

export function initialsColor(name, overrideColor) {
 // Don't return photo URLs as background colors
 if (overrideColor && !overrideColor.startsWith("data:") && !overrideColor.startsWith("http")) return overrideColor;
 const colors = ["#23CDED","#84D4E8","#5DC1DB","#B07EC8","#E05577","#7EC8C8","#C8C87E","#D4A5D4"];
 let h = 0;
 for(let i=0;i<(name||"").length;i++) h = (h*31+name.charCodeAt(i))>>>0;
 return colors[h % colors.length];
}

// Returns initials string from a name (up to 2 chars)
export function getInitials(name) {
 return (name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
}

// Get emoji from avatarColor if set, or null
export function getAvatarEmoji(avatarColor) {
 return avatarColor?.startsWith("emoji:") ? avatarColor.slice(6) : null;
}

export function getUserAvatarColor(name, allUsers) {
 const user = allUsers?.find(u=>u.name===name);
 return initialsColor(name, user?.avatarColor);
}

export async function saDeleteSpace(spaceId) {
 const keys = ['at-users','at-admins','at-superadmin','at-pins','at-teams','at-cfg-freight','at-cfg-realestate','at-orgmeta','at-custom-industries','at-feed','at-goals-scratch'];
 for(const k of keys) { try { await storageDelete(nsKey(spaceId, k)); } catch {} }
 try {
  const users = (await storageGet(nsKey(spaceId,'at-users'))) || [];
  for(const u of users) {
   await storageDelete(nsKey(spaceId,`at-data-${u.id}`));
   await storageDelete(nsKey(spaceId,`at-goals-${u.id}`));
   await storageDelete(nsKey(spaceId,`at-threads-${u.id}`));
   await storageDelete(nsKey(spaceId,`at-vmscript-${u.id}`));
   await storageDelete(nsKey(spaceId,`at-muted-${u.id}`));
  }
 } catch {}
 try { await storageDelete(`spacemeta-${spaceId}`); } catch {}
 try { await storageDelete(`commembers-${spaceId}`); } catch {}
 try { await storageDelete(`pending-${spaceId}`); } catch {}
 await removeFromSpaceIndex(spaceId);
}
export async function saDeleteUserFromRegistry(userId) {
 // Get the registry entry first — we need their personalNs and all space associations
 const reg = await loadUserRegistry();
 const entry = reg.find(r => r.userId === userId);
 const personalNs = entry?.personalNs;
 const spaceId = entry?.spaceId;
 const spaceType = entry?.spaceType;

 // 1. Remove from global registry
 await storageSet('USER_REGISTRY', reg.filter(r => r.userId !== userId));

 // 2. Wipe user memberships record
 await storageDelete(`usermem-${userId}`).catch(() => {});

 // 3. Wipe all per-user keys in their personal namespace (solo space)
 if (personalNs) {
  const perUserKeys = [
   `at-data-${userId}`, `at-goals-${userId}`, `at-script-${userId}`,
   `at-vmscript-${userId}`, `at-muted-${userId}`, `at-threads-${userId}`,
   `at-tracks-${userId}`, `at-active-track-${userId}`,
  ];
  for (const k of perUserKeys) {
   await storageDelete(nsKey(personalNs, k)).catch(() => {});
  }
  // Wipe personal messages threads (stored by userId pairs)
  await storageDelete(`pthreads-${userId}`).catch(() => {});
  await storageDelete(`pmuted-${userId}`).catch(() => {});
  // Wipe notifications
  await storageDelete(`notifs-${userId}`).catch(() => {});
  // Wipe presence
  await storageDelete(`presence-${userId}`).catch(() => {});
 }

 // 4. Remove from org/community space's user list + wipe their data there
 if (spaceId && spaceType) {
  await saRemoveUserFromSpace(spaceId, spaceType, userId).catch(() => {});
 }

 // 5. If they were a solo user, wipe their solo space users list too
 const soloNsId = `solo-${userId}`;
 await storageDelete(nsKey(soloNsId, 'at-users')).catch(() => {});
}
export async function saRenameSpace(spaceId, newName) {
 const meta = await loadSpaceMeta(spaceId);
 if(!meta) return;
 await saveSpaceMeta({ ...meta, name: newName.trim() });
}
export async function saGetSpaceUsers(spaceId, spaceType) {
 if(spaceType === 'community') {
  const members = await loadCommunityMembers(spaceId);
  return members.map(m => ({ id: m.userId, name: m.name, industry: m.industry || m.communityIndustry, avatarColor: m.avatarColor, joinedAt: m.joinedAt }));
 }
 return (await storageGet(nsKey(spaceId,'at-users'))) || [];
}
export async function saRemoveUserFromSpace(spaceId, spaceType, userId) {
 if(spaceType === 'community') { await removeCommunityMember(spaceId, userId); }
 else {
  const users = (await storageGet(nsKey(spaceId,'at-users'))) || [];
  await storageSet(nsKey(spaceId,'at-users'), users.filter(u => u.id !== userId));
 }
 await storageDelete(nsKey(spaceId,`at-data-${userId}`));
 await storageDelete(nsKey(spaceId,`at-goals-${userId}`));
}
export async function saUpdateSpaceMeta(spaceId, updates) {
 const meta = await loadSpaceMeta(spaceId);
 if(!meta) return null;
 const updated = { ...meta, ...updates };
 await saveSpaceMeta(updated);
 return updated;
}
export async function saWipeUserData(spaceId, userId) {
 await storageDelete(nsKey(spaceId,`at-data-${userId}`));
 await storageDelete(nsKey(spaceId,`at-goals-${userId}`));
}
export async function saGetAllSpaceDetails(spaceId, spaceType) {
 const [meta, users, pending] = await Promise.all([loadSpaceMeta(spaceId), saGetSpaceUsers(spaceId, spaceType), loadPendingRequests(spaceId)]);
 const admins = (await storageGet(nsKey(spaceId,'at-admins'))) || [];
 return { meta, users, pending, admins };
}

// ── Personal (cross-space) thread storage — keyed by userId, not org-scoped ──
// Threads stored here survive space switches and work across all orgs/communities.
// Key pattern: "pthreads-{userId}"
export async function loadPersonalThreads(userId) {
  return (await storageGet(`pthreads-${userId}`)) || [];
}
export async function savePersonalThreads(userId, threads) {
  await storageSet(`pthreads-${userId}`, threads);
}
export async function loadPersonalMessages(threadKey) {
  return (await storageGet(`pmsgs-${threadKey}`)) || [];
}
export async function savePersonalMessages(threadKey, msgs) {
  await storageSet(`pmsgs-${threadKey}`, msgs);
}
export async function loadPersonalMuted(userId) {
  return (await storageGet(`pmuted-${userId}`)) || {};
}
export async function savePersonalMuted(userId, muted) {
  await storageSet(`pmuted-${userId}`, muted);
}

// Space-scoped admin lists: "at-admins-{spaceId}"
export async function loadSpaceAdmins(spaceId) {
  return (await storageGet(`at-admins-${spaceId}`)) || [];
}
export async function saveSpaceAdmins(spaceId, admins) {
  await storageSet(`at-admins-${spaceId}`, admins);
}

// ── Presence (online/offline) ─────────────────────────────────────────
// Each user writes their timestamp to a shared space-scoped key every 30s.
// Anyone whose heartbeat is < 90s old is considered "online".
export async function writePresence(spaceId, userId) {
  const key = `presence-${spaceId}`;
  const all = (await storageGet(key)) || {};
  all[userId] = Date.now();
  await storageSet(key, all);
}
export async function loadPresence(spaceId) {
  return (await storageGet(`presence-${spaceId}`)) || {};
}
export function isOnline(presenceMap, userId) {
  const ts = presenceMap[userId];
  return ts && (Date.now() - ts) < 90000; // kept for compatibility
}
// "online" < 90s | "away" 90s–10min | "offline" > 10min
export function getPresenceStatus(presenceMap, userId) {
  const ts = presenceMap[userId];
  if (!ts) return "offline";
  const age = Date.now() - ts;
  if (age < 90000) return "online";
  if (age < 600000) return "away";
  return "offline";
}

// ── Notifications ────────────────────────────────────────────────────
// Personal notifications stored per-user (not namespaced to org)
export async function loadNotifications(userId) {
  return (await storageGet(`notifs-${userId}`)) || [];
}
export async function saveNotifications(userId, notifs) {
  await storageSet(`notifs-${userId}`, notifs.slice(0, 200));
}
export async function pushNotification(userId, notif) {
  const existing = await loadNotifications(userId);
  const next = [{ ...notif, id: `n-${Date.now()}-${Math.random().toString(36).slice(2)}`, ts: Date.now(), read: false }, ...existing].slice(0, 200);
  await saveNotifications(userId, next);
}

// ── Challenges ───────────────────────────────────────────────────────
export async function loadChallenges(spaceId) {
  return (await storageGet(nsKey(spaceId, "at-challenges"))) || [];
}
export async function saveChallenges(spaceId, challenges) {
  await storageSet(nsKey(spaceId, "at-challenges"), challenges.slice(0, 50));
}

// ── Weekly recap ─────────────────────────────────────────────────────
export async function loadWeeklyRecap(spaceId, weekKey2) {
  return (await storageGet(nsKey(spaceId, `at-recap-${weekKey2}`))) || null;
}
export async function saveWeeklyRecap(spaceId, weekKey2, recap) {
  await storageSet(nsKey(spaceId, `at-recap-${weekKey2}`), recap);
}

// ── MVP votes ────────────────────────────────────────────────────────
export async function loadMvpVotes(spaceId, weekKey2) {
  return (await storageGet(nsKey(spaceId, `at-mvp-${weekKey2}`))) || {};
}
export async function saveMvpVotes(spaceId, weekKey2, votes) {
  await storageSet(nsKey(spaceId, `at-mvp-${weekKey2}`), votes);
}

// ── Weekly Reflection ────────────────────────────────────────────────
export async function loadWeeklyReflection(userId, weekKey2) {
  return (await storageGet(nsKey(`user-${userId}`, `at-reflect-${weekKey2}`))) || null;
}
export async function saveWeeklyReflection(userId, weekKey2, reflection) {
  await storageSet(nsKey(`user-${userId}`, `at-reflect-${weekKey2}`), reflection);
}

export async function loadStreakFreezes(userId) {
 const data = await storageGet(`at-streak-freezes-${userId}`);
 if (!data) return { count: 0, usedDates: [], pto: [], sick: [] };
 // Migrate legacy shape
 if (!data.pto) data.pto = [];
 if (!data.sick) data.sick = [];
 return data;
}

// Returns all PTO+sick dates as a flat array of date strings
export function getProtectedDates(freezes) {
 const pto  = (freezes?.pto  || []).map(e => e.date);
 const sick = (freezes?.sick || []).map(e => e.date);
 return [...pto, ...sick];
}

// PTO rules: 15/yr, same-day or future only (no retroactive)
// Sick rules: 5/yr, retroactive allowed (yesterday or today)
export function canLogPTO(freezes, date) {
 const year = new Date().getFullYear().toString();
 const used = (freezes?.pto || []).filter(e => e.date.startsWith(year)).length;
 if (used >= 15) return { ok: false, reason: "Annual PTO limit reached (15 days)" };
 const today = todayStr();
 if (date < today) return { ok: false, reason: "PTO can only be logged for today or future dates" };
 if (isWeekend(date)) return { ok: false, reason: "Weekends don't count against PTO" };
 const already = (freezes?.pto || []).some(e => e.date === date);
 if (already) return { ok: false, reason: "Already logged PTO for this date" };
 return { ok: true };
}

export function canLogSick(freezes, date) {
 const year = new Date().getFullYear().toString();
 const used = (freezes?.sick || []).filter(e => e.date.startsWith(year)).length;
 if (used >= 5) return { ok: false, reason: "Annual sick day limit reached (5 days)" };
 const today = todayStr();
 // Get yesterday (prev weekday)
 const dt = new Date(today); dt.setDate(dt.getDate() - 1);
 while (isWeekend(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`)) {
  dt.setDate(dt.getDate() - 1);
 }
 const yesterday = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
 if (date < yesterday) return { ok: false, reason: "Sick days can only be logged for today or yesterday" };
 if (isWeekend(date)) return { ok: false, reason: "Weekends don't count against sick days" };
 const already = (freezes?.sick || []).some(e => e.date === date);
 if (already) return { ok: false, reason: "Already logged sick day for this date" };
 return { ok: true };
}

export async function saveStreakFreezes(userId, freezes) {
 await storageSet(`at-streak-freezes-${userId}`, freezes);
}

export async function loadAccountabilityPairs(spaceId) {
 return (await storageGet(nsKey(spaceId, "at-acc-pairs"))) || [];
}

export async function saveAccountabilityPairs(spaceId, pairs) {
 await storageSet(nsKey(spaceId, "at-acc-pairs"), pairs.slice(0, 100));
}
export async function loadAllReflections(userId) {
  // Load last 12 weeks of reflections for profile history
  const results = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const wk = `${d.getFullYear()}-W${String(Math.ceil((d.getDate()) / 7)).padStart(2,'0')}`;
    const r = await storageGet(nsKey(`user-${userId}`, `at-reflect-${wk}`));
    if (r) results.push({ weekKey: wk, ...r });
  }
  return results;
}

// ── Journal entries (freeform, template-based) ────────────────────────
export async function saveJournalEntry(userId, entry) {
 const all = await loadJournalEntries(userId);
 const next = [entry, ...all].slice(0, 200);
 await storageSet(nsKey(`user-${userId}`, "at-journal"), next);
}

export async function loadJournalEntries(userId) {
 return (await storageGet(nsKey(`user-${userId}`, "at-journal"))) || [];
}

// ── Journal settings (prompt toggle + custom questions) ───────────────
export async function loadJournalSettings(userId) {
 return (await storageGet(nsKey(`user-${userId}`, "at-journal-settings"))) || {
  showWeeklyPrompt: true,
  customQuestions: null, // null = use defaults
 };
}

export async function saveJournalSettings(userId, settings) {
 await storageSet(nsKey(`user-${userId}`, "at-journal-settings"), settings);
}

// ── Tracks — per-user multi-area tracking ────────────────────────────
// Each track: { id, name, industryKey, customConfig?, createdAt, color? }
// activeTrackId stored separately so switching is one write
export async function loadUserTracks(userId) {
 return (await storageGet(nsKey(`user-${userId}`, "at-tracks"))) || null;
}
export async function saveUserTracks(userId, tracks) {
 await storageSet(nsKey(`user-${userId}`, "at-tracks"), tracks);
}
export async function loadActiveTrackId(userId) {
 return (await storageGet(nsKey(`user-${userId}`, "at-active-track"))) || null;
}
export async function saveActiveTrackId(userId, trackId) {
 await storageSet(nsKey(`user-${userId}`, "at-active-track"), trackId);
}
// Track-scoped user data — falls back to legacy key for the "default" track
export function trackDataKey(userId, trackId) {
 if (!trackId || trackId === "default") return `at-data-${userId}`;
 return `at-data-${userId}-${trackId}`;
}
export function trackGoalKey(userId, trackId) {
 if (!trackId || trackId === "default") return `at-goals-${userId}`;
 return `at-goals-${userId}-${trackId}`;
}

// ── Feed helpers (shared between ActivityTracker + AppViews) ─────────────────
export async function loadFeed(spaceId) {
 return (await storageGet(nsKey(spaceId, "at-feed"))) || [];
}
export async function saveFeed(spaceId, items) {
 await storageSet(nsKey(spaceId, "at-feed"), items.slice(0, 100));
}
export async function postFeedItem(spaceId, item) {
 const feed = await loadFeed(spaceId);
 const next = [item, ...feed].slice(0, 100);
 await saveFeed(spaceId, next);
 return next;
}
export async function updateFeedItem(spaceId, updatedItem) {
 const feed = await loadFeed(spaceId);
 const next = feed.map(it => it.id === updatedItem.id ? updatedItem : it);
 await saveFeed(spaceId, next);
 return next;
}
export async function deleteFeedItem(spaceId, itemId) {
 const feed = await loadFeed(spaceId);
 const next = feed.filter(it => it.id !== itemId);
 await saveFeed(spaceId, next);
 return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── RBAC — Roles, Teams, Permissions ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS = [
 { key: "pinPosts",       label: "Pin posts to feed" },
 { key: "manageFeed",     label: "Delete / hide any post" },
 { key: "createChallenges",label: "Create challenges" },
 { key: "inviteMembers",  label: "Invite new members" },
 { key: "manageMembers",  label: "Remove / suspend members" },
 { key: "manageTeams",    label: "Create and edit teams" },
 { key: "manageRoles",    label: "Assign roles to others" },
 { key: "viewAnalytics",  label: "View analytics dashboard" },
 { key: "manageSettings", label: "Edit org settings" },
];

// Default roles seeded when a new org is created
export function defaultOrgRoles() {
 return [
  {
   id: "role-owner", name: "Owner", rank: 0, color: "#F59E0B", icon: "👑",
   protected: true,  // can never be deleted or demoted
   permissions: Object.fromEntries(ROLE_PERMISSIONS.map(p => [p.key, true])),
   scope: "org",     // owner powers are always org-wide
  },
  {
   id: "role-admin", name: "Admin", rank: 1, color: "#1DC9E8", icon: "⚙️",
   protected: true,
   permissions: Object.fromEntries(ROLE_PERMISSIONS.map(p => [p.key, true])),
   scope: "org",
  },
  {
   id: "role-member", name: "Member", rank: 99, color: "#64748B", icon: "👤",
   protected: true,
   permissions: { inviteMembers: true },
   scope: "subtree",
  },
 ];
}

export function defaultCommunityRoles() {
 return [
  {
   id: "role-founder", name: "Founder", rank: 0, color: "#A855F7", icon: "👑",
   protected: true,
   permissions: Object.fromEntries(ROLE_PERMISSIONS.map(p => [p.key, true])),
  },
  {
   id: "role-mod", name: "Moderator", rank: 1, color: "#1DC9E8", icon: "🛡️",
   protected: false,
   permissions: { pinPosts: true, manageFeed: true, inviteMembers: true, manageMembers: true },
  },
  {
   id: "role-member", name: "Member", rank: 99, color: "#64748B", icon: "👤",
   protected: true,
   permissions: { inviteMembers: true },
  },
 ];
}

// Org roles
export async function loadOrgRoles(orgId) {
 const stored = await storageGet(`org-roles-${orgId}`);
 return stored || defaultOrgRoles();
}
export async function saveOrgRoles(orgId, roles) {
 await storageSet(`org-roles-${orgId}`, roles);
}

// Community roles
export async function loadCommunityRoles(communityId) {
 const stored = await storageGet(`com-roles-${communityId}`);
 return stored || defaultCommunityRoles();
}
export async function saveCommunityRoles(communityId, roles) {
 await storageSet(`com-roles-${communityId}`, roles);
}

// Teams — stored as flat list of nodes with parentId for tree structure
// Each node: { id, name, parentId, leaderId?, createdAt }
export async function loadOrgTeams(orgId) {
 return (await storageGet(`org-teams-${orgId}`)) || [];
}
export async function saveOrgTeams(orgId, teams) {
 await storageSet(`org-teams-${orgId}`, teams);
}

// Member assignments — per-space record of each member's roleId and teamId
// { [userId]: { roleId, teamId } }
export async function loadMemberAssignments(spaceId) {
 return (await storageGet(`member-assignments-${spaceId}`)) || {};
}
export async function saveMemberAssignments(spaceId, assignments) {
 await storageSet(`member-assignments-${spaceId}`, assignments);
}
export async function setMemberAssignment(spaceId, userId, roleId, teamId) {
 const all = await loadMemberAssignments(spaceId);
 await saveMemberAssignments(spaceId, { ...all, [userId]: { roleId, teamId } });
}

// Build a set of all team IDs in a subtree rooted at teamId
export function getTeamSubtree(teams, teamId) {
 const result = new Set([teamId]);
 function walk(tid) {
  teams.filter(t => t.parentId === tid).forEach(child => {
   result.add(child.id);
   walk(child.id);
  });
 }
 walk(teamId);
 return result;
}

// Permission check:
// Can `actorId` perform `action` on `targetId` in `spaceId`?
// Pass teams + assignments + roles for performance (avoid double-loads)
export function canPerform(actorId, action, targetId, roles, teams, assignments) {
 const actorAssign = assignments[actorId] || {};
 const targetAssign = assignments[targetId] || {};
 const actorRole = roles.find(r => r.id === actorAssign.roleId) || roles.find(r => r.rank === 99) || null;
 if (!actorRole) return false;
 if (!actorRole.permissions?.[action]) return false;

 // Owner/Admin (scope: "org") can act on anyone
 if (actorRole.scope === "org") return true;

 // Subtree-scoped: actor can only act on members within their team subtree
 const actorTeamId = actorAssign.teamId;
 if (!actorTeamId) return false; // no team assigned = no subtree power
 const subtree = getTeamSubtree(teams, actorTeamId);
 const targetTeamId = targetAssign.teamId;
 return targetTeamId ? subtree.has(targetTeamId) : false;
}

// Org verification — approve or reject a pending org
export async function approveOrg(orgId) {
 const meta = await loadSpaceMeta(orgId);
 if (!meta) return;
 await saveSpaceMeta({ ...meta, verified: true, pendingApproval: false });
}
export async function rejectOrg(orgId, reason="") {
 const meta = await loadSpaceMeta(orgId);
 if (!meta) return;
 await saveSpaceMeta({ ...meta, verified: false, pendingApproval: false, rejected: true, rejectionReason: reason });
}

// Load all pending orgs (for God Mode queue)
export async function loadPendingOrgs() {
 const idx = await loadSpaceIndex();
 const orgs = idx.filter(e => e.type === "org");
 const metas = await Promise.all(orgs.map(e => loadSpaceMeta(e.id)));
 return metas.filter(m => m && m.pendingApproval && !m.verified);
}

// ── Denied/rejected requests — tracked per space so admins can review ─────────
// Each entry: { userId, userName, userIndustry, deniedAt, deniedByName }
export async function loadDeniedRequests(spaceId) {
  return (await storageGet(`denied-${spaceId}`)) || [];
}
export async function saveDeniedRequest(spaceId, req, deniedByName) {
  const existing = await loadDeniedRequests(spaceId);
  if (existing.find(d => d.userId === req.userId)) return; // already logged
  await storageSet(`denied-${spaceId}`, [
    ...existing,
    { ...req, deniedAt: new Date().toISOString(), deniedByName: deniedByName || "Admin" }
  ].slice(0, 100));
}
export async function clearDeniedRequest(spaceId, userId) {
  const existing = await loadDeniedRequests(spaceId);
  await storageSet(`denied-${spaceId}`, existing.filter(d => d.userId !== userId));
}

// ── Haptic feedback utility ───────────────────────────────────────────────────
// Uses navigator.vibrate (supported on Android Chrome; no-op on iOS/desktop)
// iOS has no JS haptic API — we use CSS active state pulse as visual substitute
export const haptic = {
 light:     () => { try { navigator.vibrate?.(10);  } catch {} },
 medium:    () => { try { navigator.vibrate?.(25);  } catch {} },
 heavy:     () => { try { navigator.vibrate?.(50);  } catch {} },
 success:   () => { try { navigator.vibrate?.([15, 30, 15]); } catch {} },
 error:     () => { try { navigator.vibrate?.([50, 30, 80]); } catch {} },
 milestone: () => { try { navigator.vibrate?.([30, 20, 30, 20, 80]); } catch {} },
 double:    () => { try { navigator.vibrate?.([20, 40, 20]); } catch {} },
};

// ── Push Notification System ──────────────────────────────────────────────────
// Registers service worker, requests permission, and fires contextual notifications.
// All notification types are opt-in via permission dialog.

const SW_URL = '/sw.js';
let _swReg = null; // cached registration

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    _swReg = await navigator.serviceWorker.register(SW_URL);
    return _swReg;
  } catch { return null; }
}

export async function getSwReg() {
  if (_swReg) return _swReg;
  if (!('serviceWorker' in navigator)) return null;
  try { _swReg = await navigator.serviceWorker.ready; return _swReg; } catch { return null; }
}

// Returns: 'granted' | 'denied' | 'default' | 'unsupported'
export function notifPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// Asks for permission. Call this at a meaningful moment (not on page load).
export async function requestNotifPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

// Fire a local (non-push) notification via the service worker or Notification API
export async function fireNotif({ title, body, tag, icon, url, data }) {
  if (notifPermission() !== 'granted') return;
  const reg = await getSwReg();
  const opts = {
    body,
    icon: icon || '/cadence-icon-192.png',
    badge: '/cadence-icon-72.png',
    tag: tag || 'cadence',
    renotify: true,
    data: { url: url || '/', ...data },
    vibrate: [80, 40, 80],
  };
  if (reg?.showNotification) {
    await reg.showNotification(title, opts);
  } else if ('Notification' in window) {
    new Notification(title, opts);
  }
}

// ── Specific notification types ───────────────────────────────────────────────

// Fired around 3pm if user hasn't logged anything yet
export async function notifStreakAtRisk(streakDays, userName) {
  if (notifPermission() !== 'granted') return;
  const first = userName?.split(' ')[0] || 'Hey';
  await fireNotif({
    title: streakDays > 1 ? `${streakDays}-day streak at risk ⚠️` : 'Nothing logged yet today',
    body: streakDays > 1
      ? `${first}, you haven't logged anything. ${streakDays} days on the line.`
      : `${first}, get a few entries in before the day ends.`,
    tag: 'cadence-streak-risk',
    url: '/?view=workspace',
  });
}

// Fired when user hits 100% of daily goals
export async function notifGoalsHit(userName) {
  if (notifPermission() !== 'granted') return;
  await fireNotif({
    title: 'Goals hit. 🎯',
    body: `${userName?.split(' ')[0] || 'You'} closed out today's targets. Keep going or write it down.`,
    tag: 'cadence-goals-hit',
    url: '/?view=journal',
  });
}

// Fired when a DM arrives
export async function notifNewDM(senderName, preview) {
  if (notifPermission() !== 'granted') return;
  await fireNotif({
    title: `${senderName}`,
    body: preview ? preview.slice(0, 80) : 'Sent you a message',
    tag: `cadence-dm-${senderName}`,
    url: '/?view=messages',
  });
}

// Fired when someone reacts to or comments on a feed post
export async function notifFeedReaction(actorName, type, preview) {
  if (notifPermission() !== 'granted') return;
  const verb = type === 'comment' ? 'commented on' : 'reacted to';
  await fireNotif({
    title: `${actorName} ${verb} your post`,
    body: preview ? preview.slice(0, 80) : '',
    tag: 'cadence-feed-reaction',
    url: '/?view=feed',
  });
}

// Fired Sunday evening — weekly digest reminder
export async function notifWeeklyDigest(userName, weekAvgPct, streakDays) {
  if (notifPermission() !== 'granted') return;
  const first = userName?.split(' ')[0] || 'Hey';
  await fireNotif({
    title: "Week's done. How'd it go?",
    body: weekAvgPct
      ? `${first}, you averaged ${weekAvgPct}% this week. ${streakDays > 1 ? `${streakDays}-day streak.` : ''} Worth writing down.`
      : `${first}, reflect on the week before Monday arrives.`,
    tag: 'cadence-weekly-digest',
    url: '/?view=journal',
  });
}

// Fired when a streak milestone is hit (7, 14, 30, 50, 100...)
export async function notifStreakMilestone(streakDays, userName) {
  if (notifPermission() !== 'granted') return;
  await fireNotif({
    title: `${streakDays}-day streak. 🔥`,
    body: `${userName?.split(' ')[0] || 'You'} hit ${streakDays} days in a row. That's not nothing.`,
    tag: 'cadence-streak-milestone',
    url: '/?view=home',
  });
}

// ── Streak-at-risk scheduler ──────────────────────────────────────────────────
// Call once on login. Sets a daily alarm at 3pm if nothing logged.
let _streakCheckTimer = null;
export function scheduleStreakCheck(getCurrentStreak, hasLoggedToday, userName) {
  if (_streakCheckTimer) clearTimeout(_streakCheckTimer);
  const now = new Date();
  const target = new Date();
  target.setHours(15, 0, 0, 0); // 3pm
  if (target <= now) target.setDate(target.getDate() + 1); // already past — next day
  const ms = target - now;
  _streakCheckTimer = setTimeout(async () => {
    const logged = await hasLoggedToday();
    if (!logged) {
      const streak = await getCurrentStreak();
      await notifStreakAtRisk(streak, userName);
    }
    // Reschedule for tomorrow
    scheduleStreakCheck(getCurrentStreak, hasLoggedToday, userName);
  }, ms);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PACER JOURNAL MEMORY ────────────────────────────────────────────────────
// Persistent narrative memory distilled from journal entries.
// Pacer reads this on every conversation so it "remembers" what you wrote.
// ═══════════════════════════════════════════════════════════════════════════════

export async function loadPacerJournalMemory(userId) {
  return (await storageGet(`pacer-journal-mem-${userId}`)) || { summary: '', updatedAt: 0, entryCount: 0 };
}

export async function savePacerJournalMemory(userId, memory) {
  await storageSet(`pacer-journal-mem-${userId}`, memory);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── STREAK FREEZE BANK ──────────────────────────────────────────────────────
// Earned: 1 freeze per 7-day streak completion. Max 3 banked.
// Used: converts a missed day into a protected date so streak survives.
// ═══════════════════════════════════════════════════════════════════════════════

export async function loadFreezeBank(userId) {
  return (await storageGet(`at-freeze-bank-${userId}`)) || { count: 0, lastEarnedWeek: '', usedDates: [] };
}

export async function saveFreezeBank(userId, bank) {
  await storageSet(`at-freeze-bank-${userId}`, bank);
}

// Check if user earned a freeze this week (call after logging)
// Returns true if a new freeze was awarded
export async function checkAndAwardFreeze(userId, streak, weekKeyStr) {
  if (streak < 7 || streak % 7 !== 0) return false; // only on 7-day multiples
  const bank = await loadFreezeBank(userId);
  if (bank.lastEarnedWeek === weekKeyStr) return false; // already awarded this week
  if (bank.count >= 3) return false; // maxed out
  await saveFreezeBank(userId, { ...bank, count: bank.count + 1, lastEarnedWeek: weekKeyStr });
  return true;
}

// Use a freeze on a specific date (typically yesterday when streak breaks)
export async function useStreakFreeze(userId, dateStr) {
  const bank = await loadFreezeBank(userId);
  if (bank.count <= 0) return false;
  if (bank.usedDates.includes(dateStr)) return false;
  await saveFreezeBank(userId, {
    ...bank,
    count: bank.count - 1,
    usedDates: [...bank.usedDates, dateStr],
  });
  // Also add to the streak freezes protected dates
  const freezes = await storageGet(`at-streak-freezes-${userId}`) || { count: 0, usedDates: [], pto: [], sick: [] };
  await storageSet(`at-streak-freezes-${userId}`, {
    ...freezes,
    usedDates: [...(freezes.usedDates || []), dateStr],
  });
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── WEEKLY DIGEST EMAIL ─────────────────────────────────────────────────────
// Sends via Resend API. Requires VITE_RESEND_KEY env var.
// Call on Sunday evenings or when user requests it.
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendWeeklyDigestEmail({ toEmail, userName, weekAvgPct, streakDays, topMetrics, journalCount, bestDay }) {
  const key = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_RESEND_KEY : null;
  if (!key) { console.warn('VITE_RESEND_KEY not set — digest email skipped'); return false; }

  const first = userName?.split(' ')[0] || 'there';
  const streakLine = streakDays > 1 ? `<strong>${streakDays}-day streak</strong> still alive.` : '';
  const avgLine = weekAvgPct ? `You averaged <strong>${weekAvgPct}% of your goals</strong> this week.` : '';
  const metricsHtml = (topMetrics || []).map(m =>
    `<tr><td style="padding:6px 0;color:#888;font-size:13px">${m.label}</td><td style="padding:6px 0;font-weight:700;text-align:right">${m.val} <span style="color:#888;font-weight:400">/ ${m.goal} goal</span></td></tr>`
  ).join('');
  const bestDayLine = bestDay ? `Best day: <strong>${bestDay}</strong>.` : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#0A0E1A;font-family:'DM Sans',system-ui,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:32px 24px">
  <div style="text-align:center;margin-bottom:28px">
    <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#1DC9E8,#7B6FD8);font-size:22px;margin-bottom:12px">⚡</div>
    <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#1DC9E8">Cadence Weekly Digest</div>
  </div>
  <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:8px">Week's done, ${first}.</div>
  <div style="font-size:15px;color:#888;line-height:1.6;margin-bottom:24px">${avgLine} ${streakLine} ${bestDayLine}</div>
  ${metricsHtml ? `<table style="width:100%;border-collapse:collapse;margin-bottom:24px">${metricsHtml}</table>` : ''}
  ${journalCount ? `<div style="font-size:13px;color:#666;margin-bottom:24px">${journalCount} journal ${journalCount === 1 ? 'entry' : 'entries'} this week.</div>` : ''}
  <a href="https://getcadence.net" style="display:block;background:#1DC9E8;color:#000;text-align:center;padding:14px;border-radius:10px;font-weight:800;font-size:15px;text-decoration:none;margin-bottom:20px">Open Cadence →</a>
  <div style="font-size:11px;color:#444;text-align:center">Sent by Pacer · <a href="https://getcadence.net" style="color:#444">getcadence.net</a></div>
</div></body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Pacer <hello@getcadence.net>',
        to: [toEmail],
        subject: weekAvgPct
          ? `${weekAvgPct}% week. ${streakDays > 1 ? `${streakDays}-day streak.` : 'Here\'s your week.'}`
          : `${first}, here's your week on Cadence`,
        html,
      }),
    });
    return res.ok;
  } catch { return false; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── USER LOG TIME PATTERN ──────────────────────────────────────────────────
// Detects when a user typically logs (e.g. 4-5pm). Used to schedule
// time-blocked nudges at their natural logging window.
// ═══════════════════════════════════════════════════════════════════════════════

export function detectLogTimePattern(allData) {
  // Pull timestamps of all log events from the past 30 days
  const cutoff = Date.now() - 30 * 86400000;
  const hours = [];
  for (const [, dayData] of Object.entries(allData || {})) {
    if (dayData?._logTs && dayData._logTs > cutoff) {
      hours.push(new Date(dayData._logTs).getHours());
    }
  }
  if (hours.length < 5) return null; // not enough data
  // Find the modal hour (most common logging hour)
  const freq = {};
  hours.forEach(h => { freq[h] = (freq[h] || 0) + 1; });
  const peak = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  if (!peak || peak[1] < 3) return null; // no clear pattern
  return { hour: Number(peak[0]), confidence: peak[1] / hours.length };
}

// Schedule a time-blocked logging nudge (fires at user's typical logging hour)
let _logTimeTimer = null;
export function scheduleLogTimeNudge(logTimePattern, hasLoggedToday, userName, onNudge) {
  if (_logTimeTimer) clearTimeout(_logTimeTimer);
  if (!logTimePattern) return;
  const { hour } = logTimePattern;
  const now = new Date();
  const target = new Date();
  target.setHours(hour, 15, 0, 0); // 15 min into their window
  if (target <= now) target.setDate(target.getDate() + 1);
  const ms = target - now;
  _logTimeTimer = setTimeout(async () => {
    const logged = await hasLoggedToday();
    if (!logged) {
      const first = userName?.split(' ')[0] || 'Hey';
      await fireNotif({
        title: `${first}, you usually log around now`,
        body: `It's ${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'} — your typical logging time. Don't break the pattern.`,
        tag: 'cadence-log-time',
        url: '/?view=workspace',
      });
      if (onNudge) onNudge();
    }
    scheduleLogTimeNudge(logTimePattern, hasLoggedToday, userName, onNudge);
  }, ms);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MILESTONE ENGINE ────────────────────────────────────────────────────────
// Industry-aware milestones beyond just streaks.
// Call checkMilestones after every log save.
// ═══════════════════════════════════════════════════════════════════════════════

const VOLUME_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const CONSISTENCY_MILESTONES = [
  { days: 5,   label: 'First full week',      emoji: '📅' },
  { days: 20,  label: '20 days logged',       emoji: '🔑' },
  { days: 50,  label: '50 days in',           emoji: '💪' },
  { days: 100, label: '100 days logged',      emoji: '🏅' },
  { days: 250, label: '250 days in',          emoji: '🏆' },
  { days: 365, label: 'Full year',            emoji: '🌟' },
];

export async function checkMilestones({ userId, userName, allData, metrics, goals, spaceId, postToFeed }) {
  if (!userId || !metrics?.length) return [];
  const fired = [];

  // ── Volume milestones per metric ──
  for (const m of metrics) {
    const total = Object.values(allData || {}).reduce((s, d) => s + (d?.[m.key] || 0), 0);
    for (const threshold of VOLUME_MILESTONES) {
      if (total < threshold) continue;
      const key = `ms-vol-${userId}-${m.key}-${threshold}`;
      try {
        const already = await storageGet(key);
        if (already) continue;
        await storageSet(key, '1');
        const post = {
          id: `feed-ms-${Date.now()}-${m.key}-${threshold}`,
          type: 'milestone', subtype: 'volume',
          userId, userName,
          text: `🎯 ${threshold.toLocaleString()} ${m.label} logged — all time.`,
          milestoneMetric: m.label, milestoneValue: threshold,
          ts: Date.now(),
        };
        if (postToFeed) await postToFeed(post);
        await fireNotif({ title: `${threshold.toLocaleString()} ${m.label}. 🎯`, body: `${userName?.split(' ')[0]}, you just crossed a milestone — ${threshold.toLocaleString()} ${m.label} all time.`, tag: `cadence-ms-vol-${m.key}`, url: '/?view=workspace' });
        fired.push({ type: 'volume', metric: m.label, threshold });
      } catch {}
    }
  }

  // ── Consistency milestones (total logged weekdays) ──
  const loggedDays = Object.keys(allData || {}).filter(d => !isWeekend(d) && Object.values(allData[d] || {}).some(v => typeof v === 'number' && v > 0)).length;
  for (const ms of CONSISTENCY_MILESTONES) {
    if (loggedDays < ms.days) continue;
    const key = `ms-cons-${userId}-${ms.days}`;
    try {
      const already = await storageGet(key);
      if (already) continue;
      await storageSet(key, '1');
      const post = {
        id: `feed-ms-${Date.now()}-cons-${ms.days}`,
        type: 'milestone', subtype: 'consistency',
        userId, userName,
        text: `${ms.emoji} ${ms.label} — ${ms.days} days logged on Cadence.`,
        ts: Date.now(),
      };
      if (postToFeed) await postToFeed(post);
      await fireNotif({ title: `${ms.emoji} ${ms.label}`, body: `${ms.days} days in. That's the kind of consistency that compounds.`, tag: `cadence-ms-cons-${ms.days}`, url: '/?view=home' });
      fired.push({ type: 'consistency', ...ms });
    } catch {}
  }

  return fired;
}


// ── PACER MEMORY (Journal-derived) ───────────────────────────────────────────
export async function loadPacerMemory(userId) {
  return (await storageGet(`at-pacer-memory-${userId}`)) || null;
}
export async function savePacerMemory(userId, memory) {
  await storageSet(`at-pacer-memory-${userId}`, memory);
}
export async function updatePacerMemoryFromJournal(userId, userName, entryText, industryLabel, apiKey) {
  if (!entryText?.trim() || !apiKey) return;
  try {
    const res = await callAI({ model: "claude-haiku-4-5-20251001", messages: [{ role: 'user', content: `Distill this journal entry into a 1-2 sentence third-person memory about ${userName} (${industryLabel} professional). Focus on goals, mindset, challenges mentioned. Be specific but brief. Do not quote directly.\n\nEntry:\n${entryText.slice(0, 1500)}` }], max_tokens: 300, call_type: "pacer" })
    const memory = data?.content?.[0]?.text?.trim();
    if (memory && memory.length > 20) await savePacerMemory(userId, memory);
  } catch {}
}

// ── STREAK FREEZE — maybeEarnFreeze (alias for AT compatibility) ──────────────
export async function maybeEarnFreeze(userId, currentStreak) {
  if (!currentStreak || currentStreak < 7) return false;
  const weekKeyStr = weekKey(new Date());
  return checkAndAwardFreeze(userId, currentStreak, weekKeyStr);
}

// ── MILESTONE ENGINE v2 — named exports used by ActivityTracker ───────────────
export async function loadUnlockedMilestones(userId) {
  return (await storageGet(`at-milestones-${userId}`)) || [];
}
export async function saveUnlockedMilestones(userId, milestones) {
  await storageSet(`at-milestones-${userId}`, milestones);
}

export function getMilestoneDefinitions(industryConfig) {
  const metrics = industryConfig?.metrics || [];
  const streakDefs = [3,7,14,30,60,100,365].map(n => ({
    id: `streak-${n}`, type: 'streak', n, emoji: n >= 100 ? '🔥' : n >= 30 ? '⚡' : '🎯',
    label: `${n}-Day Streak`, check: (streak) => streak >= n,
  }));
  const consistencyDefs = [10,50,100,250].map(n => ({
    id: `logged-${n}`, type: 'consistency', n, emoji: n >= 100 ? '🏆' : '📅',
    label: `${n} Days Logged`, check: (_, loggedCount) => loggedCount >= n,
  }));
  const volumeDefs = metrics.flatMap(m =>
    [10,50,100,250,500,1000,2500,5000].map(n => ({
      id: `vol-${m.key}-${n}`, type: 'volume', metric: m.key, metricLabel: m.label, n,
      emoji: n >= 1000 ? '💎' : n >= 500 ? '🏅' : '🎯',
      label: `${n.toLocaleString()} ${m.label}`,
      check: (_, __, totals) => (totals?.[m.key] || 0) >= n,
    }))
  );
  return [...streakDefs, ...consistencyDefs, ...volumeDefs];
}

export function computeMilestoneTotals(allData, metrics) {
  const totals = {};
  for (const m of (metrics || [])) {
    totals[m.key] = Object.values(allData || {}).reduce((s, d) => s + (Number(d?.[m.key]) || 0), 0);
  }
  return totals;
}

export async function checkNewMilestones(userId, allData, currentStreak, industryConfig) {
  if (!userId) return [];
  const existing = await loadUnlockedMilestones(userId);
  const existingIds = new Set(existing.map(m => m.id));
  const metrics = industryConfig?.metrics || [];
  const defs = getMilestoneDefinitions(industryConfig);
  const totals = computeMilestoneTotals(allData, metrics);
  const loggedDays = Object.keys(allData || {}).filter(d =>
    Object.values(allData[d] || {}).some(v => typeof v === 'number' && v > 0)
  ).length;

  const newlyUnlocked = [];
  for (const def of defs) {
    if (existingIds.has(def.id)) continue;
    const earned = def.type === 'streak'
      ? def.check(currentStreak || 0)
      : def.type === 'consistency'
        ? def.check(null, loggedDays)
        : def.check(null, null, totals);
    if (earned) {
      newlyUnlocked.push({ ...def, unlockedAt: Date.now() });
    }
  }

  if (newlyUnlocked.length > 0) {
    await saveUnlockedMilestones(userId, [...existing, ...newlyUnlocked]);
  }
  return newlyUnlocked;
}

// ── Crew Leader Controls ──────────────────────────────────────────────────────

// Pinned announcement: leader message shown at top of crew dashboard
export async function loadCrewAnnouncement(crewId) {
  return (await storageGet(`crew-announce-${crewId}`)) || null;
}
export async function saveCrewAnnouncement(crewId, announcement) {
  // announcement: { text, authorName, ts, pinned: true } | null to clear
  if (!announcement) { await storageDelete(`crew-announce-${crewId}`); return; }
  await storageSet(`crew-announce-${crewId}`, { ...announcement, ts: announcement.ts || Date.now() });
}

// Official challenge: the one challenge the leader pins for all members
export async function loadCrewOfficialChallenge(crewId) {
  return (await storageGet(`crew-challenge-${crewId}`)) || null;
}
export async function saveCrewOfficialChallenge(crewId, challenge) {
  if (!challenge) { await storageDelete(`crew-challenge-${crewId}`); return; }
  await storageSet(`crew-challenge-${crewId}`, challenge);
}

// Crew slug — short URL-friendly name set by leader
export async function loadCrewSlug(crewId) {
  return (await storageGet(`crew-slug-${crewId}`)) || null;
}
export async function saveCrewSlug(crewId, slug) {
  await storageSet(`crew-slug-${crewId}`, slug?.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 32) || null);
  // Also save reverse lookup
  if (slug) await storageSet(`crew-slug-reverse-${slug}`, crewId);
}
export async function resolveCrewSlug(slug) {
  return (await storageGet(`crew-slug-reverse-${slug}`)) || null;
}

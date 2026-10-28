// App chrome: bottom tab bar and the progress "hero" card on the list tab.

export const NAV_H = 60; // bottom bar height (px), excluding the safe-area inset

export function BottomNav({ T, items, active, onChange }) {
  return (
    <nav role="tablist" style={{position:"fixed",left:0,right:0,bottom:0,zIndex:900,background:T.cardBgAlt,borderTop:`1px solid ${T.headerBorder}`,
      paddingBottom:"env(safe-area-inset-bottom)",boxShadow:"0 -6px 20px rgba(0,0,0,.25)"}}>
      <div style={{display:"flex",maxWidth:560,margin:"0 auto",height:NAV_H}}>
        {items.map(it => {
          const on = it.key === active;
          return (
            <button key={it.key} role="tab" aria-selected={on} onClick={()=>onChange(it.key)}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",color:on?T.accentText:T.mutedText,position:"relative"}}>
              <span style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:56,height:30,borderRadius:15,
                background:on?T.btnBgActive:"transparent",boxShadow:on?`inset 0 0 0 1px ${T.btnBorderActive}`:"none",transition:"background .25s ease",fontSize:18,
                transform:on?"translateY(-1px)":"none"}}>
                {it.icon}
                {it.badge?<span style={{position:"absolute",top:-3,right:8,minWidth:16,height:16,padding:"0 4px",borderRadius:8,background:"#e0703a",color:"#fff",fontSize:10,lineHeight:"16px",fontWeight:700}}>{it.badge}</span>:null}
              </span>
              <span style={{fontSize:11,fontWeight:on?600:400}}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Circular progress + quick stats. Tapping opens the Awards tab.
export function ProgressHero({ T, tx, shown, total, progress, hint, stats, onOpen }) {
  const R = 44, C = 2 * Math.PI * R;
  return (
    <button onClick={onOpen} className="np-press" aria-label={tx.awardsTab}
      style={{display:"flex",alignItems:"center",gap:16,width:"100%",padding:"16px",borderRadius:18,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
        background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,boxShadow:"0 6px 22px rgba(0,0,0,.25)"}}>
      <div style={{position:"relative",width:108,height:108,flexShrink:0}}>
        <svg viewBox="0 0 108 108" width="108" height="108" style={{transform:"rotate(-90deg)"}}>
          <defs>
            <linearGradient id="np-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={T.pinVisited}/><stop offset="1" stopColor={T.accentText}/>
            </linearGradient>
          </defs>
          <circle cx="54" cy="54" r={R} fill="none" stroke={T.progressTrack} strokeWidth="9"/>
          <circle cx="54" cy="54" r={R} fill="none" stroke="url(#np-ring)" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - progress/100)} style={{transition:"stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:30,fontWeight:300,color:T.accentText,lineHeight:1}}>{shown}</div>
          <div style={{fontSize:12,color:T.mutedText,marginTop:2}}>/ {total}</div>
        </div>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,color:T.textSecondary}}>{tx.visited} · <span style={{color:T.accentText,fontWeight:600}}>{progress}%</span></div>
        <div style={{fontSize:14,color:T.textPrimary,marginTop:4,lineHeight:1.4}}>{hint}</div>
        <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
          {stats.map(s=>(
            <span key={s.label} style={{fontSize:12,color:T.textSecondary,background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:10,padding:"3px 8px",whiteSpace:"nowrap"}}>
              {s.icon} {s.value} <span style={{color:T.mutedText}}>{s.label}</span>
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

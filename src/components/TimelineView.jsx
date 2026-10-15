import { useMemo } from "../react.js";

// ── Timeline View (chronological visit history) ────────────────────
export function TimelineView({ parks, visits, isJa, themeColors, onParkClick }) {
  const T = themeColors;

  // Flatten all visits across all parks into one sorted list
  const timeline = useMemo(() => {
    const entries = [];
    parks.forEach(park => {
      (visits[park.id] || []).forEach(v => {
        entries.push({ park, date: v.date, note: v.note });
      });
    });
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [parks, visits]);

  // Group by year
  const byYear = useMemo(() => {
    const groups = {};
    timeline.forEach(entry => {
      const year = entry.date.slice(0, 4);
      if (!groups[year]) groups[year] = [];
      groups[year].push(entry);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [timeline]);

  function fmtFull(iso) {
    const d = new Date(iso + "T12:00:00");
    return isJa
      ? `${d.getMonth()+1}月${d.getDate()}日`
      : d.toLocaleDateString("en-US", { month:"long", day:"numeric" });
  }

  if (timeline.length === 0) {
    return (
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:40,color:T.mutedText,fontSize:14,textAlign:"center",whiteSpace:"pre-line"}}>
        {isJa ? "まだ訪問記録がありません。\nチェックを入れて旅の記録を始めましょう。" : "No visits logged yet.\nCheck off a park to start your journey timeline."}
      </div>
    );
  }

  return (
    <div style={{flex:1,padding:"16px 20px 80px",maxWidth:600,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
      {byYear.map(([year, entries]) => (
        <div key={year} style={{marginBottom:28}}>
          <div style={{fontSize:20,color:T.accentText,fontWeight:600,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
            <span>{year}</span>
            <div style={{flex:1,height:1,background:T.cardBorder}}/>
            <span style={{fontSize:11,color:T.mutedText,fontWeight:400}}>{entries.length} {isJa?"件":entries.length===1?"visit":"visits"}</span>
          </div>
          <div style={{position:"relative",paddingLeft:20}}>
            {/* Vertical line */}
            <div style={{position:"absolute",left:5,top:6,bottom:6,width:2,background:T.cardBorder}}/>
            {entries.map((entry, i) => (
              <div key={`${entry.park.id}-${entry.date}`} onClick={()=>onParkClick(entry.park)}
                style={{position:"relative",marginBottom:16,cursor:"pointer"}}>
                {/* Dot */}
                <div style={{position:"absolute",left:-20,top:4,width:10,height:10,borderRadius:"50%",background:T.pinVisited,border:`2px solid ${T.bg}`,boxShadow:`0 0 0 2px ${T.pinVisitedBorder}`}}/>
                <div style={{background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:8,padding:"10px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
                    <span style={{fontSize:14,color:T.textPrimary,fontWeight:500}}>{entry.park.emoji} {isJa?entry.park.ja:entry.park.name}</span>
                    <span style={{fontSize:11,color:T.mutedText,whiteSpace:"nowrap"}}>{fmtFull(entry.date)}</span>
                  </div>
                  <div style={{fontSize:10,color:T.mutedText,marginTop:2}}>{isJa?entry.park.stateJa:entry.park.state}</div>
                  {entry.note&&<div style={{fontSize:12,color:T.textSecondary,marginTop:6,fontStyle:"italic"}}>💬 {entry.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

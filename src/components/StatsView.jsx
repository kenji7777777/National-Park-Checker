import { useMemo } from "../react.js";

import { computeTripStreaks } from "../data/achievements";
import { REGION_ORDER } from "../data/parks";

// ── Stats View: streaks, mini map silhouette, state progress ───────
export function StatsView({ parks, visits, checked, isJa, themeColors, tx, onParkClick }) {
  const T = themeColors;

  const { trips, longest } = useMemo(() => computeTripStreaks(visits), [visits]);

  const visitedStates = useMemo(() => {
    const set = new Set();
    parks.forEach(p => { if (checked[p.id]) p.state.split(" / ").forEach(s=>set.add(s.trim())); });
    return set;
  }, [checked]);
  const totalStates = useMemo(() => {
    const set = new Set();
    parks.forEach(p => p.state.split(" / ").forEach(s=>set.add(s.trim())));
    return set;
  }, []);

  function fmtRange(startIso, endIso) {
    const s = new Date(startIso+"T12:00:00"), e = new Date(endIso+"T12:00:00");
    const fmt = (d) => isJa ? `${d.getMonth()+1}/${d.getDate()}` : d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    return startIso === endIso ? fmt(s) : `${fmt(s)} – ${fmt(e)}`;
  }

  const multiTrips = trips.filter(t => t.count >= 2).sort((a,b)=>b.startDate.localeCompare(a.startDate)).slice(0,10);
  const regionRows = REGION_ORDER.map(key => {
    const all = parks.filter(p => p.region === key);
    return { key, label: isJa ? all[0].regionJa : key, total: all.length, done: all.filter(p => checked[p.id]).length };
  });

  return (
    <div style={{flex:1,padding:"4px 16px 24px",maxWidth:700,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>

      {/* ── Streak highlight card ── */}
      <div style={{background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:14,padding:"20px",marginBottom:20,textAlign:"center"}}>
        <div style={{fontSize:12,color:T.mutedText,marginBottom:6,letterSpacing:"0.1em"}}>🔥 {tx.longestStreak}</div>
        {longest ? (
          <>
            <div style={{fontSize:40,fontWeight:700,color:T.accentText,lineHeight:1}}>{longest.count}</div>
            <div style={{fontSize:13,color:T.textPrimary,marginTop:4}}>{tx.parksInOneTrip(longest.count)}</div>
            <div style={{fontSize:12,color:T.mutedText,marginTop:6}}>{longest.startDate.slice(0,4)}{isJa?"年 ":" · "}{fmtRange(longest.startDate, longest.endDate)}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginTop:12}}>
              {longest.parkIds.map(pid => {
                const p = parks.find(pp=>pp.id===pid);
                if (!p) return null;
                return (
                  <div key={pid} onClick={()=>onParkClick&&onParkClick(p)} style={{
                    padding:"6px 12px",borderRadius:16,fontSize:12,cursor:"pointer",
                    background:T.chipBgActive,border:`1px solid ${T.chipBorderActive}`,color:T.chipTextActive,
                  }}>{p.emoji} {isJa?p.ja:p.name}</div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{fontSize:13,color:T.mutedText,padding:"12px 0"}}>{tx.noStreak}</div>
        )}
      </div>

      {/* ── Trips with 2+ parks, newest first ── */}
      {multiTrips.length > 0 && (
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,color:T.mutedText,marginBottom:8,letterSpacing:"0.05em"}}>🚗 {isJa?"旅の記録（2公園以上）":"Trips (2+ parks)"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {multiTrips.map(trip => (
              <div key={trip.startDate} style={{padding:"12px 14px",background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
                  <span style={{fontSize:14,color:T.textPrimary}}>{trip.startDate.slice(0,4)}{isJa?"年 ":" · "}{fmtRange(trip.startDate, trip.endDate)}</span>
                  <span style={{fontSize:13,color:T.accentText,whiteSpace:"nowrap"}}>{trip.count>=4?"🔥 ":""}{isJa?`${trip.count}公園`:`${trip.count} parks`}</span>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                  {trip.parkIds.map(pid => {
                    const p = parks.find(pp=>pp.id===pid);
                    if (!p) return null;
                    return <button key={pid} onClick={()=>onParkClick&&onParkClick(p)} className="np-press" style={{minHeight:32,padding:"3px 10px",borderRadius:16,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:T.inputBg,border:`1px solid ${T.cardBorder}`,color:T.textSecondary}}>{p.emoji} {isJa?p.ja:p.name}</button>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Region progress ── */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:12,color:T.mutedText,marginBottom:8,letterSpacing:"0.05em"}}>🧭 {isJa?"地域別の達成率":"Progress by region"}</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,padding:"14px",background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:12}}>
          {regionRows.map(r => (
            <div key={r.key}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                <span style={{color:r.done===r.total?T.accentText:T.textPrimary}}>{r.done===r.total?"✓ ":""}{r.label}</span>
                <span style={{color:T.mutedText}}>{r.done}/{r.total}</span>
              </div>
              <div style={{height:6,background:T.progressTrack,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(r.done/r.total)*100}%`,background:T.progressFill,borderRadius:3,transition:"width .5s ease"}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── State progress ── */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
          <span style={{fontSize:12,color:T.mutedText,letterSpacing:"0.05em"}}>🏳️ {isJa?"訪問した州":"States Visited"}</span>
          <span style={{fontSize:14,color:T.accentText,fontWeight:600}}>{visitedStates.size} / {totalStates.size}</span>
        </div>
        <div style={{height:6,background:T.progressTrack,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(visitedStates.size/totalStates.size)*100}%`,background:T.progressFill,borderRadius:3}}/>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from "../react.js";

import { computeTripStreaks } from "../data/achievements";
import { MAP_H, MAP_W, US_OUTLINE, project } from "./mapData";

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

  const sortedTrips = [...trips].sort((a,b)=>b.count-a.count).slice(0,5);

  return (
    <div style={{flex:1,padding:"16px 20px 80px",maxWidth:700,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>

      {/* ── Streak highlight card ── */}
      <div style={{background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:14,padding:"20px",marginBottom:20,textAlign:"center"}}>
        <div style={{fontSize:12,color:T.mutedText,marginBottom:6,letterSpacing:"0.1em"}}>🔥 {tx.longestStreak}</div>
        {longest ? (
          <>
            <div style={{fontSize:40,fontWeight:700,color:T.accentText,lineHeight:1}}>{longest.count}</div>
            <div style={{fontSize:13,color:T.textPrimary,marginTop:4}}>{tx.parksInOneTrip(longest.count)}</div>
            <div style={{fontSize:11,color:T.mutedText,marginTop:6}}>{fmtRange(longest.startDate, longest.endDate)}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginTop:12}}>
              {longest.parkIds.map(pid => {
                const p = parks.find(pp=>pp.id===pid);
                if (!p) return null;
                return (
                  <div key={pid} onClick={()=>onParkClick&&onParkClick(p)} style={{
                    padding:"4px 10px",borderRadius:12,fontSize:11,cursor:"pointer",
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

      {/* ── Mini map silhouette with visited pins ── */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:12,color:T.mutedText,marginBottom:8,letterSpacing:"0.05em"}}>🗺 {isJa?"訪問地図":"Visited Map"}</div>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{width:"100%",background:T.mapBg,borderRadius:10,border:`1px solid ${T.mapBorder}`,display:"block"}}>
          <path d={US_OUTLINE} fill={T.mapLand} stroke={T.mapLandBorder} strokeWidth="1.5" strokeLinejoin="round"/>
          {parks.filter(p=>!["Alaska","Hawaii","American Samoa","U.S. Virgin Islands"].includes(p.state)).map(park => {
            const {x,y} = project(park.lat, park.lng);
            if (x<0||x>MAP_W||y<0||y>MAP_H) return null;
            const isChk = checked[park.id];
            if (!isChk) return <circle key={park.id} cx={x} cy={y} r={2.5} fill={T.pinUnvisited} opacity={0.3}/>;
            return (
              <g key={park.id}>
                <circle cx={x} cy={y} r={7} fill={T.pinVisited} opacity={0.25}/>
                <circle cx={x} cy={y} r={4} fill={T.pinVisited} stroke={T.pinVisitedBorder} strokeWidth="1"/>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Trip history (top 5 longest) ── */}
      {sortedTrips.length > 0 && (
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,color:T.mutedText,marginBottom:8,letterSpacing:"0.05em"}}>📋 {isJa?"旅の記録":"Trip History"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {sortedTrips.map((trip,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:8}}>
                <div>
                  <div style={{fontSize:12,color:T.textPrimary}}>{tx.parksInOneTrip(trip.count)}</div>
                  <div style={{fontSize:10,color:T.mutedText,marginTop:2}}>{fmtRange(trip.startDate, trip.endDate)}</div>
                </div>
                <div style={{fontSize:18,color:T.accentText}}>{trip.count===1?"🏕️":trip.count<4?"🚗":"🔥"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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

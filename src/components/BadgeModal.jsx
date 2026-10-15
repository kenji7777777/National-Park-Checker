import { useState } from "../react.js";
import { parks } from "../data/parks";
import { BADGES, TAG_BADGES } from "../data/achievements";

// ── Badge Modal ──────────────────────────────────────────────────
export function BadgeModal({ earnedIds, earnedTagIds, questProgress, isJa, tx, themeColors, checked, onParkClick, onClose }) {
  const T = themeColors;
  const [innerTab, setInnerTab] = useState("badges"); // badges | quests

  const allBadgeCount = BADGES.length + TAG_BADGES.length;
  const allEarnedCount = earnedIds.length + earnedTagIds.length;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:2000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.cardBgAlt,border:`1px solid ${T.headerBorder}`,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:500,padding:"20px 20px 32px",maxHeight:"82vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:T.cardBorder,borderRadius:2,margin:"0 auto 16px"}}/>

        {/* Inner tab switcher */}
        <div style={{display:"flex",gap:6,marginBottom:16,justifyContent:"center"}}>
          <button onClick={()=>setInnerTab("badges")} style={{
            padding:"6px 16px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"inherit",
            background:innerTab==="badges"?T.btnBgActive:"transparent",
            border:`1px solid ${innerTab==="badges"?T.btnBorderActive:T.cardBorder}`,
            color:innerTab==="badges"?T.accentText:T.mutedText,
          }}>🏅 {tx.badges} ({allEarnedCount}/{allBadgeCount})</button>
          <button onClick={()=>setInnerTab("quests")} style={{
            padding:"6px 16px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"inherit",
            background:innerTab==="quests"?T.btnBgActive:"transparent",
            border:`1px solid ${innerTab==="quests"?T.btnBorderActive:T.cardBorder}`,
            color:innerTab==="quests"?T.accentText:T.mutedText,
          }}>🗺 {tx.quests} ({questProgress.filter(q=>q.complete).length}/{questProgress.length})</button>
        </div>

        {innerTab==="badges" && (
          <>
            <div style={{fontSize:11,color:T.mutedText,marginBottom:10,fontWeight:600}}>🏆 {isJa?"達成バッジ":"Achievement Badges"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              {BADGES.map(b => {
                const earned = earnedIds.includes(b.id);
                return (
                  <div key={b.id} style={{
                    padding:"14px 12px",borderRadius:10,textAlign:"center",
                    background:earned?T.cardBg:T.cardBgAlt,
                    border:`1px solid ${earned?T.cardBorderActive:T.cardBorder}`,
                    opacity:earned?1:0.45,
                  }}>
                    <div style={{fontSize:32,marginBottom:6,filter:earned?"none":"grayscale(1)"}}>{b.icon}</div>
                    <div style={{fontSize:12,color:earned?T.textPrimary:T.mutedText,fontWeight:600,marginBottom:3}}>{isJa?b.nameJa:b.name}</div>
                    <div style={{fontSize:10,color:T.mutedText,lineHeight:1.3}}>{isJa?b.descJa:b.desc}</div>
                    {earned&&<div style={{fontSize:10,color:T.accentText,marginTop:6}}>✓ {tx.badgeEarned}</div>}
                  </div>
                );
              })}
            </div>

            <div style={{fontSize:11,color:T.mutedText,marginBottom:10,fontWeight:600}}>💬 {isJa?"体験バッジ（訪問メモから自動判定）":"Experience Badges (auto-detected from your notes)"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {TAG_BADGES.map(b => {
                const earned = earnedTagIds.includes(b.id);
                return (
                  <div key={b.id} style={{
                    padding:"14px 12px",borderRadius:10,textAlign:"center",
                    background:earned?T.cardBg:T.cardBgAlt,
                    border:`1px solid ${earned?T.cardBorderActive:T.cardBorder}`,
                    opacity:earned?1:0.45,
                  }}>
                    <div style={{fontSize:32,marginBottom:6,filter:earned?"none":"grayscale(1)"}}>{b.icon}</div>
                    <div style={{fontSize:12,color:earned?T.textPrimary:T.mutedText,fontWeight:600,marginBottom:3}}>{isJa?b.nameJa:b.name}</div>
                    <div style={{fontSize:10,color:T.mutedText,lineHeight:1.3}}>{isJa?b.descJa:b.desc}</div>
                    {earned&&<div style={{fontSize:10,color:T.accentText,marginTop:6}}>✓ {tx.badgeEarned}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {innerTab==="quests" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {questProgress.map(q => (
              <div key={q.id} style={{
                padding:"14px 16px",borderRadius:10,
                background:q.complete?T.cardBg:T.cardBgAlt,
                border:`1px solid ${q.complete?T.cardBorderActive:T.cardBorder}`,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <span style={{fontSize:26,filter:q.complete?"none":"grayscale(0.6)",opacity:q.complete?1:0.6}}>{q.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:q.complete?T.textPrimary:T.textPrimary,fontWeight:600}}>{isJa?q.nameJa:q.name}</div>
                    <div style={{fontSize:10,color:T.mutedText,marginTop:1}}>{isJa?q.descJa:q.desc}</div>
                  </div>
                  {q.complete&&<span style={{fontSize:11,color:T.accentText,fontWeight:600,whiteSpace:"nowrap"}}>✓ {tx.questComplete}</span>}
                </div>
                {/* Progress bar */}
                <div style={{height:6,background:T.progressTrack,borderRadius:3,overflow:"hidden",marginBottom:8}}>
                  <div style={{height:"100%",width:`${(q.done/q.total)*100}%`,background:q.complete?T.progressFill:T.progressFill,borderRadius:3,transition:"width .3s ease"}}/>
                </div>
                <div style={{fontSize:10,color:T.mutedText,marginBottom:8}}>{tx.questProgress}: {q.done}/{q.total}</div>
                {/* Park chips */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {q.parkIds.map(pid => {
                    const p = parks.find(pp=>pp.id===pid);
                    if (!p) return null;
                    const done = !!checked[pid];
                    return (
                      <div key={pid} onClick={()=>onParkClick&&onParkClick(p)} style={{
                        display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:12,fontSize:10,cursor:"pointer",
                        background:done?T.chipBgActive:T.inputBg,
                        border:`1px solid ${done?T.chipBorderActive:T.cardBorder}`,
                        color:done?T.chipTextActive:T.mutedText,
                      }}>
                        {p.emoji} {isJa?p.ja:p.name} {done&&"✓"}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

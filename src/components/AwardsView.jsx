import { useState } from "../react.js";
import { parks } from "../data/parks";
import { BADGES, TAG_BADGES } from "../data/achievements";
import { StatsView } from "./StatsView";
import { SectionTitle } from "./Sheet";

// "Awards" tab: badges and quests up top, then trip streaks and state stats.
export function AwardsView({ T, tx, isJa, visits, checked, earnedIds, earnedTagIds, questProgress, onParkClick }) {
  const [inner, setInner] = useState("badges"); // badges | quests
  const badgeTotal = BADGES.length + TAG_BADGES.length;
  const badgeEarned = earnedIds.length + earnedTagIds.length;
  const questDone = questProgress.filter(q=>q.complete).length;

  const seg = (active) => ({flex:1,minHeight:40,borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,
    background:active?T.btnBgActive:"transparent",color:active?T.accentText:T.mutedText,boxShadow:active?`inset 0 0 0 1px ${T.btnBorderActive}`:"none"});

  const badgeCard = (b, earned) => (
    <div key={b.id} style={{padding:"14px 10px 12px",borderRadius:14,textAlign:"center",background:earned?T.cardBg:"transparent",
      border:`1px ${earned?"solid":"dashed"} ${earned?T.cardBorderActive:T.cardBorder}`}}>
      <div style={{fontSize:34,lineHeight:1.1,marginBottom:6,filter:earned?"none":"grayscale(1)",opacity:earned?1:0.4,animation:earned?"np-glow 3s ease-in-out infinite":"none"}}>{b.icon}</div>
      <div style={{fontSize:13,color:earned?T.textPrimary:T.mutedText,fontWeight:600,marginBottom:3}}>{isJa?b.nameJa:b.name}</div>
      <div style={{fontSize:11,color:T.mutedText,lineHeight:1.4}}>{earned?`✓ ${tx.badgeEarned}`:(isJa?b.descJa:b.desc)}</div>
    </div>
  );

  return (
    <div style={{maxWidth:700,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
      <div style={{padding:"14px 16px 0"}}>
        <div role="tablist" style={{display:"flex",gap:4,padding:4,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:12}}>
          <button role="tab" aria-selected={inner==="badges"} onClick={()=>setInner("badges")} style={seg(inner==="badges")}>🏅 {tx.badges} <span style={{opacity:.7,fontSize:12}}>{badgeEarned}/{badgeTotal}</span></button>
          <button role="tab" aria-selected={inner==="quests"} onClick={()=>setInner("quests")} style={seg(inner==="quests")}>🗺 {tx.quests} <span style={{opacity:.7,fontSize:12}}>{questDone}/{questProgress.length}</span></button>
        </div>

        {inner==="badges" ? (
          <div key="badges" className="np-tab">
            <SectionTitle T={T}>🏆 {isJa?"達成バッジ":"Achievement badges"}</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {BADGES.map(b=>badgeCard(b, earnedIds.includes(b.id)))}
            </div>
            <SectionTitle T={T}>💬 {isJa?"体験バッジ（メモから自動判定）":"Experience badges (from your notes)"}</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {TAG_BADGES.map(b=>badgeCard(b, earnedTagIds.includes(b.id)))}
            </div>
          </div>
        ) : (
          <div key="quests" className="np-tab" style={{display:"flex",flexDirection:"column",gap:10,marginTop:14}}>
            {[...questProgress].sort((a,b)=>(b.complete-a.complete)||(b.done/b.total-a.done/a.total)).map(q => (
              <div key={q.id} style={{padding:"14px 14px 12px",borderRadius:14,background:q.complete?T.cardBg:T.cardBgAlt,border:`1px solid ${q.complete?T.cardBorderActive:T.cardBorder}`}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                  <span style={{fontSize:30,filter:q.complete?"none":"grayscale(0.6)",opacity:q.complete?1:0.7}}>{q.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,color:T.textPrimary,fontWeight:600}}>{isJa?q.nameJa:q.name}</div>
                    <div style={{fontSize:12,color:T.mutedText,marginTop:2,lineHeight:1.4}}>{isJa?q.descJa:q.desc}</div>
                  </div>
                  <span style={{fontSize:13,color:q.complete?T.accentText:T.mutedText,fontWeight:600,whiteSpace:"nowrap"}}>{q.complete?`✓ ${tx.questComplete}`:`${q.done}/${q.total}`}</span>
                </div>
                <div style={{height:6,background:T.progressTrack,borderRadius:3,overflow:"hidden",marginBottom:10}}>
                  <div style={{height:"100%",width:`${(q.done/q.total)*100}%`,background:T.progressFill,borderRadius:3,transition:"width .5s ease"}}/>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {q.parkIds.map(pid => {
                    const p = parks.find(pp=>pp.id===pid);
                    if (!p) return null;
                    const done = !!checked[pid];
                    return (
                      <button key={pid} onClick={()=>onParkClick(p)} className="np-press" style={{minHeight:34,display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:17,fontSize:12,cursor:"pointer",fontFamily:"inherit",
                        background:done?T.chipBgActive:T.inputBg,border:`1px solid ${done?T.chipBorderActive:T.cardBorder}`,color:done?T.chipTextActive:T.mutedText}}>
                        {p.emoji} {isJa?p.ja:p.name}{done&&" ✓"}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SectionTitleBlock T={T} label={isJa?"📊 旅のデータ":"📊 Travel stats"}/>
      <StatsView parks={parks} visits={visits} checked={checked} isJa={isJa} themeColors={T} tx={tx} onParkClick={onParkClick}/>
    </div>
  );
}

function SectionTitleBlock({ T, label }) {
  return <div style={{padding:"0 16px"}}><SectionTitle T={T}>{label}</SectionTitle></div>;
}

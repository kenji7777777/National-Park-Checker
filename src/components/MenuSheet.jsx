import { useState, useRef } from "../react.js";
import { parks } from "../data/parks";
import { THEMES } from "../data/themes";
import { Sheet, SectionTitle } from "./Sheet";

// One place for profiles, appearance, help and data (backup / restore / reset).
export function MenuSheet({ T, tx, isJa, profiles, activeId, siteTheme, lang,
  onSwitch, onCreate, onRename, onDelete, onTheme, onLang, onHelp, onExport, onImport, onReset, onClose }) {
  const [newName,   setNewName]   = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName,  setEditName]  = useState("");
  const fileInputRef = useRef(null);

  const input = {flex:1,minWidth:0,padding:"10px 12px",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,color:T.textPrimary,fontSize:16,outline:"none",fontFamily:"inherit"};
  const btn = (active) => ({minHeight:44,borderRadius:10,fontSize:14,cursor:"pointer",fontFamily:"inherit",
    background:active?T.btnBgActive:"transparent",border:`1px solid ${active?T.btnBorderActive:T.cardBorder}`,color:active?T.accentText:T.textPrimary});
  const row = {display:"flex",alignItems:"center",gap:12,width:"100%",minHeight:52,padding:"8px 14px",background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:12,cursor:"pointer",fontFamily:"inherit",fontSize:15,color:T.textPrimary,textAlign:"left"};
  const create = () => { if (newName.trim()) { onCreate(newName.trim()); setNewName(""); } };
  const rename = (id) => { if (editName.trim()) onRename(id, editName.trim()); setEditingId(null); };

  return (
    <Sheet T={T} onClose={onClose} label={tx.menu}>
      <div style={{fontSize:18,color:T.accentText,margin:"0 2px"}}>{tx.menu}</div>

      {/* Profiles */}
      <SectionTitle T={T}>👤 {tx.profiles}</SectionTitle>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {profiles.map(p => {
          const active = p.id === activeId;
          const count = Object.values(p.visits).filter(v=>v.length>0).length;
          return (
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 8px 8px 14px",minHeight:56,background:active?T.chipBgActive:T.cardBg,border:`1px solid ${active?T.chipBorderActive:T.cardBorder}`,borderRadius:12}}>
              {editingId===p.id ? (
                <>
                  <input value={editName} onChange={e=>setEditName(e.target.value)} autoFocus aria-label={tx.editName}
                    onKeyDown={e=>{if(e.key==="Enter")rename(p.id);}} style={input}/>
                  <button onClick={()=>rename(p.id)} aria-label={tx.save} style={{...btn(true),minWidth:44}}>✓</button>
                  <button onClick={()=>setEditingId(null)} aria-label={tx.cancel} style={{...btn(false),minWidth:44,border:"none",color:T.mutedText}}>✕</button>
                </>
              ) : (
                <>
                  <button onClick={()=>{ if(!active){ onSwitch(p.id); onClose(); } }} style={{flex:1,minWidth:0,background:"transparent",border:"none",padding:0,textAlign:"left",cursor:active?"default":"pointer",fontFamily:"inherit"}}>
                    <div style={{fontSize:15,color:active?T.chipTextActive:T.textPrimary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{active?"✓ ":""}{p.name}</div>
                    <div style={{fontSize:12,color:active?T.chipTextActive:T.mutedText,opacity:active?0.8:1,marginTop:2}}>
                      {tx.parksCount(count, parks.length)}{!active?` · ${tx.switchProfile}`:""}
                    </div>
                  </button>
                  <button onClick={()=>{setEditingId(p.id);setEditName(p.name);}} aria-label={tx.editName}
                    style={{width:40,height:40,background:"transparent",border:"none",fontSize:15,cursor:"pointer",color:active?T.chipTextActive:T.mutedText}}>✏️</button>
                  {profiles.length>1&&(
                    <button onClick={()=>onDelete(p.id)} aria-label={tx.deleteProfile}
                      style={{width:40,height:40,background:"transparent",border:"none",fontSize:15,cursor:"pointer"}}>🗑</button>
                  )}
                </>
              )}
            </div>
          );
        })}
        <div style={{display:"flex",gap:8}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder={tx.profilePlaceholder} aria-label={tx.newProfile}
            onKeyDown={e=>{if(e.key==="Enter")create();}} style={input}/>
          <button onClick={create} style={{...btn(true),padding:"0 16px",whiteSpace:"nowrap"}}>+ {tx.createProfile}</button>
        </div>
      </div>

      {/* Appearance */}
      <SectionTitle T={T}>🎨 {tx.display}</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {Object.entries(THEMES).map(([key,theme])=>(
          <button key={key} onClick={()=>onTheme(key)} aria-pressed={siteTheme===key} className="np-press"
            style={{...btn(siteTheme===key),minHeight:64,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"6px 4px"}}>
            <span style={{display:"flex",gap:3}}>
              {[theme.bg,theme.pinVisited,theme.accentText].map((c,i)=><span key={i} style={{width:12,height:12,borderRadius:6,background:c,border:"1px solid rgba(128,128,128,.4)"}}/>)}
            </span>
            <span style={{fontSize:13}}>{isJa?theme.nameJa:theme.name}</span>
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
        {[["ja","日本語"],["en","English"]].map(([key,label])=>(
          <button key={key} onClick={()=>onLang(key)} aria-pressed={lang===key} className="np-press" style={btn(lang===key)}>{label}</button>
        ))}
      </div>

      {/* Help */}
      <SectionTitle T={T}>❓ {tx.helpTitle}</SectionTitle>
      <button onClick={onHelp} className="np-press" style={row}><span style={{fontSize:18}}>📖</span><span style={{flex:1}}>{tx.openGuide}</span><span style={{color:T.mutedText}}>›</span></button>

      {/* Data */}
      <SectionTitle T={T}>💾 {tx.backup}</SectionTitle>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <button onClick={onExport} className="np-press" style={row}><span style={{fontSize:18}}>⬇</span><span style={{flex:1}}>{tx.exportData}</span><span style={{color:T.mutedText}}>›</span></button>
        <button onClick={()=>fileInputRef.current?.click()} className="np-press" style={row}><span style={{fontSize:18}}>⬆</span><span style={{flex:1}}>{tx.importData}</span><span style={{color:T.mutedText}}>›</span></button>
        <input ref={fileInputRef} type="file" accept="application/json" style={{display:"none"}}
          onChange={e=>{ const f=e.target.files?.[0]; if(f) onImport(f); e.target.value=""; }}/>
        <div style={{fontSize:12,color:T.mutedText,lineHeight:1.6,padding:"0 2px"}}>{tx.backupNote}</div>
        {onReset&&(
          <button onClick={onReset} style={{...row,justifyContent:"center",background:"transparent",border:"1px solid #a0503a",color:"#b0503a",fontSize:14,marginTop:6}}>🗑 {tx.resetAll}</button>
        )}
      </div>
    </Sheet>
  );
}

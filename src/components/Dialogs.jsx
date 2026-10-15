import { useState, useRef } from "../react.js";
import { parks } from "../data/parks";
import { formatDate, today } from "../utils";

// ── Confirm Dialog ────────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel, tx, T }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000,padding:20}}>
      <div style={{background:T.cardBgAlt,border:`1px solid ${T.headerBorder}`,borderRadius:14,padding:"24px 20px",maxWidth:320,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:14,color:T.textPrimary,marginBottom:20,lineHeight:1.5}}>{message}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"10px",background:"transparent",border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{tx.cancel}</button>
          <button onClick={onConfirm} style={{flex:1,padding:"10px",background:"#3a1a1a",border:"1px solid #6a3a3a",borderRadius:8,color:"#cc6a6a",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{tx.confirm}</button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Manager Modal ─────────────────────────────────────────
export function ProfileModal({ T, onReset, profiles, activeId, onSwitch, onCreate, onRename, onDelete, onClose, tx, isJa, onExport, onImport }) {
  const [newName,   setNewName]   = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName,  setEditName]  = useState("");
  const fileInputRef = useRef(null);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:2000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.cardBgAlt,border:`1px solid ${T.headerBorder}`,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:500,padding:"20px 20px calc(32px + env(safe-area-inset-bottom))"}}>
        <div style={{width:36,height:4,background:T.headerBorder,borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{fontSize:16,color:T.accentText,marginBottom:16}}>👤 {tx.profiles}</div>

        {/* Profile list */}
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16,maxHeight:260,overflowY:"auto"}}>
          {profiles.map(p => (
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:p.id===activeId?T.chipBgActive:T.cardBg,border:`1px solid ${p.id===activeId?T.chipBorderActive:T.cardBorder}`,borderRadius:8}}>
              {editingId===p.id ? (
                <>
                  <input value={editName} onChange={e=>setEditName(e.target.value)}
                    autoFocus onKeyDown={e=>{if(e.key==="Enter"&&editName.trim()){onRename(p.id,editName.trim());setEditingId(null);}}}
                    style={{flex:1,padding:"4px 8px",background:T.inputBg,border:`1px solid ${T.headerBorder}`,borderRadius:6,color:T.textPrimary,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
                  <button onClick={()=>{if(editName.trim())onRename(p.id,editName.trim());setEditingId(null);}}
                    style={{padding:"4px 10px",background:T.btnBgActive,border:"none",borderRadius:6,color:T.chipTextActive,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✓</button>
                  <button onClick={()=>setEditingId(null)}
                    style={{padding:"4px 8px",background:"transparent",border:"none",color:T.mutedText,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                </>
              ) : (
                <>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,color:p.id===activeId?T.chipTextActive:T.textPrimary}}>{p.name}</div>
                    <div style={{fontSize:11,color:p.id===activeId?T.chipTextActive:T.mutedText,opacity:p.id===activeId?0.75:1,marginTop:2}}>
                      {tx.parksCount(Object.values(p.visits).filter(v=>v.length>0).length, parks.length)}
                    </div>
                  </div>
                  {p.id!==activeId && (
                    <button onClick={()=>{onSwitch(p.id);onClose();}}
                      style={{padding:"4px 10px",background:T.cardBorder,border:`1px solid ${T.headerBorder}`,borderRadius:6,color:T.accentText,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                      {tx.switchProfile}
                    </button>
                  )}
                  <button onClick={()=>{setEditingId(p.id);setEditName(p.name);}}
                    style={{padding:"4px 8px",background:"transparent",border:"none",color:T.mutedText,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✏️</button>
                  {profiles.length>1&&(
                    <button onClick={()=>onDelete(p.id)}
                      style={{padding:"4px 8px",background:"transparent",border:"none",color:"#6a4a4a",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>🗑</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Create new */}
        <div style={{display:"flex",gap:8}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)}
            placeholder={tx.profilePlaceholder}
            onKeyDown={e=>{if(e.key==="Enter"&&newName.trim()){onCreate(newName.trim());setNewName("");}}}
            style={{flex:1,padding:"10px 12px",background:T.cardBg,border:`1px solid ${T.headerBorder}`,borderRadius:8,color:T.textPrimary,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
          <button onClick={()=>{if(newName.trim()){onCreate(newName.trim());setNewName("");}}}
            style={{padding:"10px 16px",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,borderRadius:8,color:T.chipTextActive,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            + {tx.createProfile}
          </button>
        </div>

        {/* Backup section */}
        <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${T.cardBorder}`}}>
          <div style={{fontSize:11,color:T.mutedText,marginBottom:10}}>💾 {tx.backup}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onExport} style={{flex:1,padding:"9px 0",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:8,color:T.accentText,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              ⬇ {tx.exportData}
            </button>
            <button onClick={()=>fileInputRef.current?.click()} style={{flex:1,padding:"9px 0",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:8,color:T.accentText,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              ⬆ {tx.importData}
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" style={{display:"none"}}
              onChange={e=>{ const f=e.target.files?.[0]; if(f) onImport(f); e.target.value=""; }}/>
          </div>
        </div>

        {/* Danger zone: clear this profile's visits */}
        {onReset&&(
          <button onClick={onReset} style={{marginTop:16,width:"100%",minHeight:44,background:"transparent",border:"1px solid #a0503a",borderRadius:8,color:"#b0503a",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            🗑 {tx.resetAll}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Date Modal ────────────────────────────────────────────────────
export function DateModal({ T, park, dates, isJa, tx, onClose, onAdd, onDelete, onUpdateNote }) {
  const [picking, setPicking]     = useState(false);
  const [inputDate, setInputDate] = useState(today());
  const [inputNote, setInputNote] = useState("");
  const [editingDate, setEditingDate] = useState(null); // date currently being note-edited
  const [editNoteVal, setEditNoteVal] = useState("");

  const sorted = [...dates].sort((a,b)=>b.date.localeCompare(a.date));

  const startEditNote = (v) => { setEditingDate(v.date); setEditNoteVal(v.note || ""); };
  const saveEditNote = () => { onUpdateNote(editingDate, editNoteVal); setEditingDate(null); };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:2000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.cardBgAlt,border:`1px solid ${T.headerBorder}`,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:500,padding:"20px 20px calc(32px + env(safe-area-inset-bottom))",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:T.headerBorder,borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{fontSize:17,color:T.textPrimary,marginBottom:2}}>{park.emoji} {isJa?park.ja:park.name}</div>
        <div style={{fontSize:11,color:T.mutedText,marginBottom:14}}>{isJa?park.stateJa:park.state}</div>
        {sorted.length>0&&(
          <div style={{display:"flex",gap:16,marginBottom:14,padding:"10px 14px",background:T.cardBg,borderRadius:8,border:`1px solid ${T.cardBorder}`}}>
            <div style={{flex:1}}><div style={{fontSize:10,color:T.mutedText,marginBottom:2}}>{tx.firstVisit}</div><div style={{fontSize:12,color:T.accentText}}>{formatDate(sorted[sorted.length-1].date,isJa)}</div></div>
            {sorted.length>1&&<div style={{flex:1}}><div style={{fontSize:10,color:T.mutedText,marginBottom:2}}>{tx.latestVisit}</div><div style={{fontSize:12,color:T.accentText}}>{formatDate(sorted[0].date,isJa)}</div></div>}
            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:T.mutedText}}>&nbsp;</div><div style={{fontSize:13,color:T.pinVisited,fontWeight:500}}>✓ {tx.visits(sorted.length)}</div></div>
          </div>
        )}
        <div style={{fontSize:11,color:T.mutedText,marginBottom:8}}>{tx.visitDates}</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
          {sorted.length===0?<div style={{fontSize:12,color:T.mutedText,padding:"10px 0"}}>{tx.noDate}</div>
            :sorted.map((v,i)=>(
              <div key={v.date} style={{padding:"9px 10px",background:T.cardBg,borderRadius:6,border:`1px solid ${T.cardBorder}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,color:T.textPrimary}}>{i===0&&sorted.length>1?"🔁 ":i===sorted.length-1?"🌟 ":"📅 "}{formatDate(v.date,isJa)}</span>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>startEditNote(v)} style={{background:"transparent",border:"none",color:T.mutedText,fontSize:12,cursor:"pointer"}}>{v.note?"✏️":"💬"}</button>
                    <button onClick={()=>onDelete(v.date)} style={{background:"transparent",border:"none",color:"#6a4a4a",fontSize:12,cursor:"pointer"}}>✕</button>
                  </div>
                </div>
                {editingDate===v.date ? (
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <input value={editNoteVal} onChange={e=>setEditNoteVal(e.target.value)} autoFocus
                      placeholder={isJa?"一言メモ...":"Add a note..."}
                      onKeyDown={e=>{if(e.key==="Enter")saveEditNote();}}
                      style={{flex:1,padding:"6px 10px",background:T.inputBg,border:`1px solid ${T.headerBorder}`,borderRadius:6,color:T.textPrimary,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
                    <button onClick={saveEditNote} style={{padding:"6px 10px",background:T.btnBgActive,border:"none",borderRadius:6,color:T.chipTextActive,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✓</button>
                  </div>
                ) : v.note ? (
                  <div style={{fontSize:12,color:T.accentText,marginTop:6,fontStyle:"italic",paddingLeft:2}}>💬 {v.note}</div>
                ) : null}
              </div>
            ))
          }
        </div>
        {picking?(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="date" value={inputDate} max={today()} onChange={e=>setInputDate(e.target.value)}
                style={{flex:1,padding:"9px 12px",background:T.cardBg,border:`1px solid ${T.headerBorder}`,borderRadius:8,color:T.textPrimary,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
            </div>
            <input value={inputNote} onChange={e=>setInputNote(e.target.value)}
              placeholder={isJa?"一言メモ（任意）...":"Add a note (optional)..."}
              style={{padding:"9px 12px",background:T.cardBg,border:`1px solid ${T.headerBorder}`,borderRadius:8,color:T.textPrimary,fontSize:16,outline:"none",fontFamily:"inherit"}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{onAdd(inputDate,inputNote);setPicking(false);setInputNote("");}} style={{flex:1,padding:"9px 16px",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,borderRadius:8,color:T.chipTextActive,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✓ {isJa?"追加":"Add"}</button>
              <button onClick={()=>{setPicking(false);setInputNote("");}} style={{padding:"9px 16px",background:"transparent",border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
            </div>
          </div>
        ):(
          <button onClick={()=>setPicking(true)} style={{width:"100%",padding:"10px",background:"transparent",border:`1px dashed ${T.headerBorder}`,borderRadius:8,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{tx.addDate}</button>
        )}
      </div>
    </div>
  );
}

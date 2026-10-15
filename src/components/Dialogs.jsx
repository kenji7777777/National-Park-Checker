import { useState, useRef } from "../react.js";
import { parks } from "../data/parks";
import { formatDate, today } from "../utils";

// ── Confirm Dialog ────────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel, tx }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000,padding:20}}>
      <div style={{background:"#111e11",border:"1px solid #3a5a3a",borderRadius:14,padding:"24px 20px",maxWidth:320,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:14,color:"#d4c8b0",marginBottom:20,lineHeight:1.5}}>{message}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"10px",background:"transparent",border:"1px solid #2a3a2a",borderRadius:8,color:"#6a8a6a",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{tx.cancel}</button>
          <button onClick={onConfirm} style={{flex:1,padding:"10px",background:"#3a1a1a",border:"1px solid #6a3a3a",borderRadius:8,color:"#cc6a6a",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{tx.confirm}</button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Manager Modal ─────────────────────────────────────────
export function ProfileModal({ profiles, activeId, onSwitch, onCreate, onRename, onDelete, onClose, tx, isJa, onExport, onImport }) {
  const [newName,   setNewName]   = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName,  setEditName]  = useState("");
  const fileInputRef = useRef(null);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:2000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#111e11",border:"1px solid #2a4a2a",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:500,padding:"20px 20px 32px"}}>
        <div style={{width:36,height:4,background:"#2a4a2a",borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{fontSize:16,color:"#a8d4a8",marginBottom:16}}>👤 {tx.profiles}</div>

        {/* Profile list */}
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16,maxHeight:260,overflowY:"auto"}}>
          {profiles.map(p => (
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:p.id===activeId?"#1a3a1a":"#0d150d",border:`1px solid ${p.id===activeId?"#3a6a3a":"#1a2a1a"}`,borderRadius:8}}>
              {editingId===p.id ? (
                <>
                  <input value={editName} onChange={e=>setEditName(e.target.value)}
                    autoFocus onKeyDown={e=>{if(e.key==="Enter"&&editName.trim()){onRename(p.id,editName.trim());setEditingId(null);}}}
                    style={{flex:1,padding:"4px 8px",background:"#0a1a0a",border:"1px solid #3a5a3a",borderRadius:6,color:"#e8dcc8",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                  <button onClick={()=>{if(editName.trim())onRename(p.id,editName.trim());setEditingId(null);}}
                    style={{padding:"4px 10px",background:"#2a5a2a",border:"none",borderRadius:6,color:"#a8d4a8",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✓</button>
                  <button onClick={()=>setEditingId(null)}
                    style={{padding:"4px 8px",background:"transparent",border:"none",color:"#5a7a5a",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                </>
              ) : (
                <>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,color:p.id===activeId?"#a8d4a8":"#c4b89a"}}>{p.name}</div>
                    <div style={{fontSize:10,color:"#4a6a4a",marginTop:2}}>
                      {Object.values(p.visits).filter(v=>v.length>0).length} / {parks.length} parks
                    </div>
                  </div>
                  {p.id!==activeId && (
                    <button onClick={()=>{onSwitch(p.id);onClose();}}
                      style={{padding:"4px 10px",background:"#1a2a1a",border:"1px solid #2a4a2a",borderRadius:6,color:"#6a9a6a",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                      {tx.switchProfile}
                    </button>
                  )}
                  <button onClick={()=>{setEditingId(p.id);setEditName(p.name);}}
                    style={{padding:"4px 8px",background:"transparent",border:"none",color:"#5a7a5a",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✏️</button>
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
            style={{flex:1,padding:"10px 12px",background:"#0d150d",border:"1px solid #2a4a2a",borderRadius:8,color:"#e8dcc8",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
          <button onClick={()=>{if(newName.trim()){onCreate(newName.trim());setNewName("");}}}
            style={{padding:"10px 16px",background:"#2a5a2a",border:"1px solid #4a8a4a",borderRadius:8,color:"#a8d4a8",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            + {tx.createProfile}
          </button>
        </div>

        {/* Backup section */}
        <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid #1a2a1a"}}>
          <div style={{fontSize:11,color:"#5a7a5a",marginBottom:10}}>💾 {tx.backup}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onExport} style={{flex:1,padding:"9px 0",background:"transparent",border:"1px solid #2a4a2a",borderRadius:8,color:"#6a9a6a",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              ⬇ {tx.exportData}
            </button>
            <button onClick={()=>fileInputRef.current?.click()} style={{flex:1,padding:"9px 0",background:"transparent",border:"1px solid #2a4a2a",borderRadius:8,color:"#6a9a6a",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              ⬆ {tx.importData}
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" style={{display:"none"}}
              onChange={e=>{ const f=e.target.files?.[0]; if(f) onImport(f); e.target.value=""; }}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Date Modal ────────────────────────────────────────────────────
export function DateModal({ park, dates, isJa, tx, onClose, onAdd, onDelete, onUpdateNote }) {
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
      <div onClick={e=>e.stopPropagation()} style={{background:"#111e11",border:"1px solid #2a4a2a",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:500,padding:"20px 20px 32px",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:"#2a4a2a",borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{fontSize:17,color:"#d4c8b0",marginBottom:2}}>{park.emoji} {isJa?park.ja:park.name}</div>
        <div style={{fontSize:11,color:"#4a6a4a",marginBottom:14}}>{isJa?park.stateJa:park.state}</div>
        {sorted.length>0&&(
          <div style={{display:"flex",gap:16,marginBottom:14,padding:"10px 14px",background:"#0d150d",borderRadius:8,border:"1px solid #1a2a1a"}}>
            <div style={{flex:1}}><div style={{fontSize:10,color:"#4a6a4a",marginBottom:2}}>{tx.firstVisit}</div><div style={{fontSize:12,color:"#8aaa8a"}}>{formatDate(sorted[sorted.length-1].date,isJa)}</div></div>
            {sorted.length>1&&<div style={{flex:1}}><div style={{fontSize:10,color:"#4a6a4a",marginBottom:2}}>{tx.latestVisit}</div><div style={{fontSize:12,color:"#8aaa8a"}}>{formatDate(sorted[0].date,isJa)}</div></div>}
            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#4a6a4a"}}>&nbsp;</div><div style={{fontSize:13,color:"#5acc5a",fontWeight:500}}>✓ {tx.visits(sorted.length)}</div></div>
          </div>
        )}
        <div style={{fontSize:11,color:"#6a8a6a",marginBottom:8}}>{tx.visitDates}</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
          {sorted.length===0?<div style={{fontSize:12,color:"#3a5a3a",padding:"10px 0"}}>{tx.noDate}</div>
            :sorted.map((v,i)=>(
              <div key={v.date} style={{padding:"9px 10px",background:"#0d150d",borderRadius:6,border:"1px solid #1a2a1a"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,color:"#c4b89a"}}>{i===0&&sorted.length>1?"🔁 ":i===sorted.length-1?"🌟 ":"📅 "}{formatDate(v.date,isJa)}</span>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>startEditNote(v)} style={{background:"transparent",border:"none",color:"#5a8a6a",fontSize:12,cursor:"pointer"}}>{v.note?"✏️":"💬"}</button>
                    <button onClick={()=>onDelete(v.date)} style={{background:"transparent",border:"none",color:"#6a4a4a",fontSize:12,cursor:"pointer"}}>✕</button>
                  </div>
                </div>
                {editingDate===v.date ? (
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <input value={editNoteVal} onChange={e=>setEditNoteVal(e.target.value)} autoFocus
                      placeholder={isJa?"一言メモ...":"Add a note..."}
                      onKeyDown={e=>{if(e.key==="Enter")saveEditNote();}}
                      style={{flex:1,padding:"6px 10px",background:"#0a1a0a",border:"1px solid #3a5a3a",borderRadius:6,color:"#e8dcc8",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                    <button onClick={saveEditNote} style={{padding:"6px 10px",background:"#2a5a2a",border:"none",borderRadius:6,color:"#a8d4a8",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✓</button>
                  </div>
                ) : v.note ? (
                  <div style={{fontSize:12,color:"#8aaa8a",marginTop:6,fontStyle:"italic",paddingLeft:2}}>💬 {v.note}</div>
                ) : null}
              </div>
            ))
          }
        </div>
        {picking?(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="date" value={inputDate} max={today()} onChange={e=>setInputDate(e.target.value)}
                style={{flex:1,padding:"9px 12px",background:"#0d150d",border:"1px solid #3a5a3a",borderRadius:8,color:"#e8dcc8",fontSize:14,outline:"none",fontFamily:"inherit"}}/>
            </div>
            <input value={inputNote} onChange={e=>setInputNote(e.target.value)}
              placeholder={isJa?"一言メモ（任意）...":"Add a note (optional)..."}
              style={{padding:"9px 12px",background:"#0d150d",border:"1px solid #3a5a3a",borderRadius:8,color:"#e8dcc8",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{onAdd(inputDate,inputNote);setPicking(false);setInputNote("");}} style={{flex:1,padding:"9px 16px",background:"#2a5a2a",border:"1px solid #4a8a4a",borderRadius:8,color:"#a8d4a8",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✓ {isJa?"追加":"Add"}</button>
              <button onClick={()=>{setPicking(false);setInputNote("");}} style={{padding:"9px 16px",background:"transparent",border:"1px solid #2a3a2a",borderRadius:8,color:"#5a7a5a",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
            </div>
          </div>
        ):(
          <button onClick={()=>setPicking(true)} style={{width:"100%",padding:"10px",background:"transparent",border:"1px dashed #3a5a3a",borderRadius:8,color:"#5a8a5a",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{tx.addDate}</button>
        )}
      </div>
    </div>
  );
}

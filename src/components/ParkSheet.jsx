import { useState } from "../react.js";
import { formatDate, gmapUrl, npsUrl, today } from "../utils";
import { Sheet, SectionTitle } from "./Sheet";

// Everything about one park: check-in, links, visit history (date + note editing).
export function ParkSheet({ T, tx, isJa, park, dates, visited, onToggle, onAdd, onDelete, onUpdate, onShowMap, onClose }) {
  const [adding, setAdding]       = useState(false);
  const [newDate, setNewDate]     = useState(today());
  const [newNote, setNewNote]     = useState("");
  const [editing, setEditing]     = useState(null); // original date of the entry being edited
  const [editDate, setEditDate]   = useState("");
  const [editNote, setEditNote]   = useState("");

  const sorted = [...dates].sort((a,b)=>b.date.localeCompare(a.date));
  const name = isJa ? park.ja : park.name, alt = isJa ? park.name : park.ja;
  const input = {width:"100%",padding:"10px 12px",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,color:T.textPrimary,fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};
  const primary = {minHeight:48,borderRadius:12,fontSize:15,cursor:"pointer",fontFamily:"inherit",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,color:T.accentText};
  const ghost = {minHeight:44,borderRadius:10,fontSize:14,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:`1px solid ${T.cardBorder}`,color:T.mutedText};
  const tile = {flex:1,minHeight:64,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,borderRadius:12,background:T.cardBg,border:`1px solid ${T.cardBorder}`,color:T.accentText,fontSize:12,textDecoration:"none",cursor:"pointer",fontFamily:"inherit"};

  const startEdit = (v) => { setEditing(v.date); setEditDate(v.date); setEditNote(v.note || ""); };
  const saveEdit = () => { if (editDate) onUpdate(editing, editDate, editNote); setEditing(null); };

  return (
    <Sheet T={T} onClose={onClose} label={name}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:60,height:60,flexShrink:0,borderRadius:16,background:T.cardBg,border:`1px solid ${visited?T.cardBorderActive:T.cardBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>{park.emoji}</div>
        <div style={{minWidth:0}}>
          <div style={{fontSize:20,color:T.textPrimary,lineHeight:1.25}}>{name}</div>
          <div style={{fontSize:12,color:T.mutedText,marginTop:3}}>{alt} · {isJa?park.stateJa:park.state}</div>
          <div style={{fontSize:12,color:T.mutedText,marginTop:2}}>{isJa?park.regionJa:park.region}</div>
        </div>
      </div>

      {/* Status / check-in */}
      <div style={{marginTop:16}}>
        {visited ? (
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:12,background:T.cardBg,border:`1px solid ${T.cardBorderActive}`}}>
            <span style={{width:30,height:30,borderRadius:15,background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,color:T.accentText,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>✓</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,color:T.accentText}}>{tx.checkedLabel} · {tx.visits(sorted.length)}</div>
              <div style={{fontSize:12,color:T.mutedText,marginTop:2}}>
                {tx.firstVisit}: {formatDate(sorted[sorted.length-1].date,isJa)}{sorted.length>1?` / ${tx.latestVisit}: ${formatDate(sorted[0].date,isJa)}`:""}
              </div>
            </div>
          </div>
        ) : (
          <button onClick={(e)=>onToggle(park,e)} className="np-press" style={{...primary,width:"100%"}}>✓ {tx.markVisited}</button>
        )}
      </div>

      {/* Links */}
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <a href={npsUrl(park)} target="_blank" rel="noopener noreferrer" className="np-press" style={tile}><span style={{fontSize:20}}>🏛</span>{tx.npsLink}</a>
        <a href={gmapUrl(park)} target="_blank" rel="noopener noreferrer" className="np-press" style={tile}><span style={{fontSize:20}}>📍</span>{tx.gmapLink}</a>
        <button onClick={()=>onShowMap(park)} className="np-press" style={tile}><span style={{fontSize:20}}>🗺</span>{tx.showOnMap}</button>
      </div>

      {/* History */}
      <SectionTitle T={T} right={sorted.length?tx.visits(sorted.length):null}>{tx.visitDates}</SectionTitle>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.length===0&&<div style={{fontSize:13,color:T.mutedText,padding:"6px 2px"}}>{tx.noDate}</div>}
        {sorted.map((v,i)=>(
          <div key={v.date} style={{padding:"10px 12px",background:T.cardBg,borderRadius:12,border:`1px solid ${T.cardBorder}`}}>
            {editing===v.date ? (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <input type="date" value={editDate} max={today()} onChange={e=>setEditDate(e.target.value)} aria-label={tx.visitDate} style={input}/>
                <input value={editNote} onChange={e=>setEditNote(e.target.value)} placeholder={tx.notePlaceholder} aria-label={tx.note}
                  onKeyDown={e=>{if(e.key==="Enter")saveEdit();}} style={input}/>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={saveEdit} className="np-press" style={{...primary,flex:1,minHeight:44,fontSize:14}}>✓ {tx.save}</button>
                  <button onClick={()=>setEditing(null)} className="np-press" style={{...ghost,padding:"0 16px"}}>{tx.cancel}</button>
                </div>
                <button onClick={()=>{onDelete(v.date);setEditing(null);}} style={{...ghost,border:"none",color:"#b0503a",minHeight:36,fontSize:13}}>🗑 {tx.deleteVisit}</button>
              </div>
            ) : (
              <button onClick={()=>startEdit(v)} aria-label={`${tx.editVisit}: ${formatDate(v.date,isJa)}`}
                style={{display:"flex",alignItems:"flex-start",gap:10,width:"100%",background:"transparent",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                <span style={{fontSize:16,lineHeight:"22px"}}>{i===sorted.length-1?"🌟":"🔁"}</span>
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:"block",fontSize:15,color:T.textPrimary,lineHeight:"22px"}}>{formatDate(v.date,isJa)}</span>
                  {v.note
                    ? <span style={{display:"block",fontSize:13,color:T.textSecondary,marginTop:2}}>💬 {v.note}</span>
                    : <span style={{display:"block",fontSize:12,color:T.mutedText,marginTop:2}}>{tx.addNoteHint}</span>}
                </span>
                <span style={{fontSize:13,color:T.mutedText,lineHeight:"22px"}}>✏️</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add another visit */}
      <div style={{marginTop:10}}>
        {adding ? (
          <div style={{display:"flex",flexDirection:"column",gap:8,padding:12,borderRadius:12,border:`1px dashed ${T.cardBorderActive}`}}>
            <input type="date" value={newDate} max={today()} onChange={e=>setNewDate(e.target.value)} aria-label={tx.visitDate} style={input}/>
            <input value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder={tx.notePlaceholder} aria-label={tx.note} style={input}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{ if(newDate){ onAdd(newDate,newNote); setAdding(false); setNewNote(""); } }} className="np-press" style={{...primary,flex:1,minHeight:44,fontSize:14}}>✓ {tx.addVisit}</button>
              <button onClick={()=>{setAdding(false);setNewNote("");}} className="np-press" style={{...ghost,padding:"0 16px"}}>{tx.cancel}</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>{setNewDate(today());setAdding(true);}} className="np-press" style={{...ghost,width:"100%",borderStyle:"dashed",color:T.accentText}}>{tx.addDate}</button>
        )}
      </div>

      {visited&&(
        <button onClick={(e)=>{onToggle(park,e);onClose();}} style={{...ghost,width:"100%",marginTop:18,border:"none",fontSize:13}}>{tx.uncheckAll}</button>
      )}
    </Sheet>
  );
}

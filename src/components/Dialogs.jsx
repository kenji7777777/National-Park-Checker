// ── Confirm Dialog ────────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel, tx, T }) {
  return (
    <div className="np-backdrop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000,padding:20}}>
      <div role="alertdialog" aria-modal="true" className="np-tab" style={{background:T.cardBgAlt,border:`1px solid ${T.headerBorder}`,borderRadius:18,padding:"22px 18px 16px",maxWidth:340,width:"100%",textAlign:"center",boxShadow:"0 16px 40px rgba(0,0,0,.5)"}}>
        <div style={{fontSize:15,color:T.textPrimary,marginBottom:18,lineHeight:1.6}}>{message}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,minHeight:46,background:"transparent",border:`1px solid ${T.inputBorder}`,borderRadius:12,color:T.mutedText,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>{tx.cancel}</button>
          <button onClick={onConfirm} autoFocus style={{flex:1,minHeight:46,background:"#3a1a1a",border:"1px solid #6a3a3a",borderRadius:12,color:"#e08a7a",fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>{tx.confirm}</button>
        </div>
      </div>
    </div>
  );
}

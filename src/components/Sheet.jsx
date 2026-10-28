import { useEffect } from "../react.js";

// Bottom sheet used for every modal panel: slides up, dims the page,
// closes on backdrop tap or Escape, and locks page scroll while open.
export function Sheet({ T, onClose, label, children, maxWidth = 520, zIndex = 2000 }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, []);
  return (
    <div className="np-backdrop" onClick={onClose}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.62)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex}}>
      <div role="dialog" aria-modal="true" aria-label={label} className="np-sheet" onClick={e=>e.stopPropagation()}
        style={{background:T.cardBgAlt,border:`1px solid ${T.headerBorder}`,borderBottom:"none",borderRadius:"20px 20px 0 0",width:"100%",maxWidth,
          maxHeight:"90vh",overflowY:"auto",overscrollBehavior:"contain",padding:"10px 18px calc(24px + env(safe-area-inset-bottom))",boxShadow:"0 -12px 40px rgba(0,0,0,.45)"}}>
        <div style={{width:40,height:5,background:T.cardBorder,borderRadius:3,margin:"0 auto 14px"}}/>
        {children}
      </div>
    </div>
  );
}

// Section heading inside sheets and pages
export function SectionTitle({ T, children, right }) {
  return (
    <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",margin:"18px 2px 8px"}}>
      <span style={{fontSize:12,color:T.mutedText,letterSpacing:"0.06em",fontWeight:600}}>{children}</span>
      {right&&<span style={{fontSize:12,color:T.mutedText}}>{right}</span>}
    </div>
  );
}

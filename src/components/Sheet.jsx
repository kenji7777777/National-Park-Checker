import { useEffect, useRef } from "../react.js";

// ── Shared modal behaviour ─────────────────────────────────────────
// Every open modal pushes one history entry, so the phone's Back gesture
// closes the top-most modal instead of leaving the app. One listener and a
// stack keep this correct when modals open and close in the same moment.
const stack = [];   // [{ token, close }]
let skipPops = 0;   // popstate events caused by our own history.back()
let listening = false;
function onPop() {
  if (skipPops > 0) { skipPops--; return; }
  const top = stack.pop();
  if (top) top.close();
}

// Locks page scroll, closes on Escape and on the Back gesture.
export function useModal(onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!listening) { window.addEventListener("popstate", onPop); listening = true; }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const entry = { token: Math.random().toString(36).slice(2), close: () => closeRef.current() };
    stack.push(entry);
    try { history.pushState({ npModal: entry.token }, ""); } catch {}
    const onKey = (e) => { if (e.key === "Escape" && stack[stack.length-1] === entry) closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      const i = stack.indexOf(entry);
      if (i >= 0) {
        // Closed from the UI (not by Back): drop our history entry too.
        stack.splice(i, 1);
        skipPops++;
        try { history.back(); } catch { skipPops--; }
      }
    };
  }, []);
}

// Bottom sheet used for every modal panel: slides up and dims the page.
export function Sheet({ T, onClose, label, children, maxWidth = 520, zIndex = 2000 }) {
  useModal(onClose);
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

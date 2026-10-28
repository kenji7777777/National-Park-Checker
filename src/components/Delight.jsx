import { useState, useEffect, useRef } from "../react.js";

// ── Motion, feedback & onboarding helpers (from rev16) ─────────────
export function prefersReducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}
export function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}

// Smoothly counts a number up/down when its target changes.
export function useCountUp(target, duration = 650) {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    if (prefersReducedMotion() || fromRef.current === target) { fromRef.current = target; setShown(target); return; }
    const from = fromRef.current, start = performance.now();
    let raf;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); fromRef.current = target; };
  }, [target]);
  return shown;
}

export const APP_CSS = `
@keyframes np-rise   { from{opacity:0;transform:translateY(10px)} to{opacity:var(--np-o,1);transform:none} }
@keyframes np-fade   { from{opacity:0} to{opacity:1} }
@keyframes np-pop    { 0%{transform:scale(.55)} 55%{transform:scale(1.28)} 100%{transform:scale(1)} }
@keyframes np-toast  { from{opacity:0;transform:translate(-50%,18px)} to{opacity:1;transform:translate(-50%,0)} }
@keyframes np-banner { 0%{opacity:0;transform:translate(-50%,-150%)} 9%{opacity:1;transform:translate(-50%,0)} 90%{opacity:1;transform:translate(-50%,0)} 100%{opacity:0;transform:translate(-50%,-150%)} }
@keyframes np-flash  { 0%,100%{box-shadow:0 0 0 0 transparent} 35%{box-shadow:0 0 0 2px var(--np-glow),0 0 18px 4px var(--np-glow)} }
@keyframes np-shimmer{ from{transform:translateX(-100%)} to{transform:translateX(100%)} }
@keyframes np-bob    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
.np-tab { animation: np-fade .28s ease both; }
.np-noscroll { scrollbar-width:none; -ms-overflow-style:none; }
.np-noscroll::-webkit-scrollbar { display:none; }
.np-press:active { transform:scale(.97); }
button:focus-visible, [role="checkbox"]:focus-visible, input:focus-visible { outline:2px solid var(--np-glow); outline-offset:2px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; scroll-behavior:auto !important; }
}
`;

// Full-screen, non-interactive confetti burst (canvas). Re-fires whenever `burst.key` changes.
export function ConfettiLayer({ burst, colors }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !burst || prefersReducedMotion()) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = burst.big ? 150 : 56;
    const parts = [];
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * (burst.big ? 2.4 : 1.5);
      const sp = (burst.big ? 11 : 8) + Math.random() * (burst.big ? 11 : 6);
      parts.push({
        x: w / 2, y: h * 0.64, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.35,
        size: 7 + Math.random() * 8, color: colors[(Math.random() * colors.length) | 0], star: Math.random() < 0.35,
      });
    }
    const total = burst.big ? 2700 : 1500;
    let raf, last = performance.now(), life = 0;
    const tick = (now) => {
      const dt = Math.min(2.5, (now - last) / 16.67); last = now; life += dt * 16.67;
      ctx.clearRect(0, 0, w, h);
      const alpha = Math.max(0, Math.min(1, (total - life) / 500));
      parts.forEach(p => {
        p.vy += 0.33 * dt; p.vx *= 0.992; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
        if (p.star) { ctx.font = `${Math.round(p.size * 1.9)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("★", 0, 0); }
        else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });
      if (life < total) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); try { ctx.clearRect(0, 0, w, h); } catch {} };
  }, [burst]);
  return <canvas ref={canvasRef} aria-hidden="true" style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:4000}}/>;
}

// Welcome / how-to sheet (auto-opens once for brand-new users; reopen via ❓)
export function HelpModal({ tx, themeColors: T, firstRun, onClose }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={tx.helpTitle}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.78)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2600,padding:16,animation:"np-fade .2s ease both"}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:16,width:"100%",maxWidth:420,maxHeight:"88vh",overflowY:"auto",padding:"22px 20px 18px",boxShadow:"0 12px 40px rgba(0,0,0,.55)"}}>
        <div style={{textAlign:"center",fontSize:36,marginBottom:4,animation:"np-bob 2.4s ease-in-out infinite"}}>🏔️</div>
        <div style={{textAlign:"center",fontSize:18,color:T.accentText,marginBottom:firstRun?4:14}}>{firstRun?tx.welcomeTitle:tx.helpTitle}</div>
        {firstRun&&<div style={{textAlign:"center",fontSize:13,color:T.mutedText,marginBottom:14,lineHeight:1.5}}>{tx.welcomeBody}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {tx.helpItems.map((it,i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:22,lineHeight:"26px",flexShrink:0}}>{it.icon}</div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:14,color:T.textPrimary,marginBottom:2}}>{it.title}</div>
                <div style={{fontSize:13,color:T.textSecondary,lineHeight:1.6}}>{it.body}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} autoFocus className="np-press"
          style={{marginTop:16,width:"100%",minHeight:44,padding:"12px 0",borderRadius:10,fontSize:14,cursor:"pointer",fontFamily:"inherit",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,color:T.accentText}}>
          {tx.helpClose}
        </button>
      </div>
    </div>
  );
}

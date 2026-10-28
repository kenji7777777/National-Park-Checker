import { useState, useEffect, useRef } from "../react.js";
import { INSETS, MAP_H, MAP_W, STATE_LABELS, US_OUTLINE, project, projectInset } from "./mapData";

const TERRITORIES = ["American Samoa","U.S. Virgin Islands"];
const MIN_ZOOM = 1, MAX_ZOOM = 8;
const TAP_RADIUS_PX = 24;   // a tap selects the nearest pin within this many screen pixels
const DRAG_THRESHOLD_PX = 6; // movement beyond this is a pan, not a tap
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

export function SVGMap({ parks, checked, visits, isJa, onParkClick, hoveredId, setHoveredId, themeColors, selectedId, children }) {
  const T = themeColors;
  const [zoom, setZoom] = useState(1);
  const [pan,  setPan]  = useState({x:0,y:0});
  const [unitPx, setUnitPx] = useState(0.5); // screen px per map unit at zoom 1
  const svgRef = useRef(null);
  const gesture = useRef({ mode:null, moved:false });

  // Every park with its position on this map (contiguous US or an inset).
  const placed = [];
  parks.forEach(park => {
    if (TERRITORIES.includes(park.state)) return;
    const inset = INSETS.find(i => i.states.includes(park.state));
    const pos = inset ? projectInset(inset, park.lat, park.lng) : project(park.lat, park.lng);
    if (pos.x < 0 || pos.x > MAP_W || pos.y < 0 || pos.y > MAP_H) return;
    placed.push({ park, ...pos });
  });
  const territories = parks.filter(p => TERRITORIES.includes(p.state));

  // Track the rendered width so pins and labels can be sized in screen pixels.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => { const w = el.getBoundingClientRect().width; if (w) setUnitPx(w / MAP_W); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const clampPan = (x, y, z) => ({
    x: clamp(x, -(MAP_W*z - MAP_W), 0),
    y: clamp(y, -(MAP_H*z - MAP_H), 0),
  });

  // Zoom so that the map point under screen point (sx, sy) [base units] stays put.
  const zoomAround = (newZoom, sx, sy, fromZoom = zoom, fromPan = pan) => {
    const z = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    const mx = (sx - fromPan.x) / fromZoom, my = (sy - fromPan.y) / fromZoom;
    setZoom(z);
    setPan(clampPan(sx - mx*z, sy - my*z, z));
  };
  const zoomBy = (factor) => zoomAround(zoom*factor, MAP_W/2, MAP_H/2);
  const resetView = () => { setZoom(1); setPan({x:0,y:0}); };

  // Screen coords -> base units (the frame the pan offset lives in)
  const toBase = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { sx: (clientX - rect.left) * MAP_W / rect.width, sy: (clientY - rect.top) * MAP_H / rect.height, rect };
  };

  const pickNearest = (clientX, clientY) => {
    const { sx, sy, rect } = toBase(clientX, clientY);
    const mx = (sx - pan.x) / zoom, my = (sy - pan.y) / zoom;
    const pxPerUnit = rect.width / MAP_W * zoom;
    let best = null, bestD = TAP_RADIUS_PX / pxPerUnit;
    placed.forEach(p => {
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < bestD) { best = p; bestD = d; }
    });
    return best?.park || null;
  };

  // ── Gestures: one finger / mouse pans, two fingers pinch, a still tap selects ──
  const startPan = (clientX, clientY) => {
    gesture.current = { mode:"pan", moved:false, startX:clientX, startY:clientY, panX:pan.x, panY:pan.y };
  };
  const startPinch = (touches) => {
    const [a, b] = touches;
    const mid = toBase((a.clientX+b.clientX)/2, (a.clientY+b.clientY)/2);
    gesture.current = { mode:"pinch", moved:true, startDist:Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY),
      startZoom:zoom, startPan:pan, sx:mid.sx, sy:mid.sy };
  };
  const movePan = (clientX, clientY) => {
    const g = gesture.current;
    const dxPx = clientX - g.startX, dyPx = clientY - g.startY;
    if (!g.moved && Math.hypot(dxPx, dyPx) < DRAG_THRESHOLD_PX) return;
    g.moved = true;
    const rect = svgRef.current.getBoundingClientRect();
    setPan(clampPan(g.panX + dxPx*MAP_W/rect.width, g.panY + dyPx*MAP_H/rect.height, zoom));
  };
  const endGesture = (clientX, clientY) => {
    const g = gesture.current;
    if (g.mode === "pan" && !g.moved && clientX != null) {
      const park = pickNearest(clientX, clientY);
      if (park) onParkClick(park);
    }
    gesture.current = { mode:null, moved:false };
  };

  const onMouseDown = (e) => startPan(e.clientX, e.clientY);
  const onMouseMove = (e) => {
    if (gesture.current.mode === "pan") { movePan(e.clientX, e.clientY); return; }
    const park = pickNearest(e.clientX, e.clientY);
    setHoveredId(park ? park.id : null);
  };
  const onMouseUp = (e) => endGesture(e.clientX, e.clientY);
  const onMouseLeave = () => { gesture.current = { mode:null, moved:false }; setHoveredId(null); };

  const onTouchStart = (e) => {
    if (e.touches.length >= 2) startPinch(e.touches);
    else if (e.touches.length === 1) startPan(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e) => {
    const g = gesture.current;
    if (g.mode === "pinch" && e.touches.length >= 2) {
      const [a, b] = e.touches;
      const scale = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY) / g.startDist;
      zoomAround(g.startZoom*scale, g.sx, g.sy, g.startZoom, g.startPan);
    } else if (g.mode === "pan" && e.touches.length === 1) {
      movePan(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const onTouchEnd = (e) => {
    const g = gesture.current;
    if (g.mode === "pinch") {
      // Lifting one finger of a pinch: continue as a pan with the remaining finger, never as a tap
      if (e.touches.length === 1) { startPan(e.touches[0].clientX, e.touches[0].clientY); gesture.current.moved = true; }
      else gesture.current = { mode:null, moved:false };
      return;
    }
    const t = e.changedTouches[0];
    endGesture(t?.clientX, t?.clientY);
    e.preventDefault(); // suppress the emulated mouse events that follow a tap
  };

  // Wheel zoom (desktop). Attached natively with passive:false because React's
  // onWheel is passive, so preventDefault() there can't stop the page scrolling.
  const onWheel = (e) => {
    e.preventDefault();
    const { sx, sy } = toBase(e.clientX, e.clientY);
    zoomAround(zoom * (e.deltaY < 0 ? 1.2 : 1/1.2), sx, sy);
  };
  const onWheelRef = useRef(onWheel);
  onWheelRef.current = onWheel;
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e) => onWheelRef.current(e);
    el.addEventListener("wheel", handler, { passive:false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const viewBoxStr = `${-pan.x/zoom} ${-pan.y/zoom} ${MAP_W/zoom} ${MAP_H/zoom}`;
  const px = 1 / (unitPx * zoom);           // one screen pixel, in map units
  const pinR = Math.max(6.5/Math.sqrt(zoom), 4.5*px);
  const showAllLabels = zoom >= 2.2;
  const name = (p) => isJa ? p.ja : p.name;

  const renderPin = ({ park, x, y }) => {
    const isChk = !!checked[park.id], cnt = visits[park.id]?.length ?? 0;
    const isSel = selectedId === park.id, isHov = hoveredId === park.id;
    const r = (isSel || isHov) ? pinR*1.35 : pinR;
    return (
      <g key={park.id} style={{pointerEvents:"none"}}>
        {isSel && <circle cx={x} cy={y} r={r+5*px} fill="none" stroke={T.accentText} strokeWidth={2*px}/>}
        {isChk && <circle cx={x} cy={y} r={r+2.5*px} fill="none" stroke={T.pinVisitedRing} strokeWidth={1.5*px} opacity={0.6}/>}
        <circle cx={x+0.8*px} cy={y+0.8*px} r={r} fill="rgba(0,0,0,0.5)"/>
        <circle cx={x} cy={y} r={r} fill={isChk?T.pinVisited:T.pinUnvisited} stroke={isChk?T.pinVisitedBorder:T.pinUnvisitedBorder} strokeWidth={1.5*px}/>
        {isChk
          ? <text x={x} y={y+r*0.38} fontSize={r*1.1} textAnchor="middle" fill={T.pinCheckmark} fontWeight="bold" style={{userSelect:"none"}}>✓</text>
          : <circle cx={x} cy={y} r={r*0.3} fill={T.pinUnvisitedDot}/>}
        {cnt>1 && <text x={x+r+2*px} y={y-r+2*px} fontSize={9*px} fill={T.pinBadge} fontWeight="bold" textAnchor="middle" style={{userSelect:"none"}}>{cnt}</text>}
      </g>
    );
  };

  const renderLabel = ({ park, x, y }) => {
    const isSel = selectedId === park.id, isHov = hoveredId === park.id;
    if (!(showAllLabels || isSel || isHov)) return null;
    const fs = (isSel ? 12 : 10.5) * px;
    return (
      <text key={`l${park.id}`} x={x} y={y - pinR - 4*px} fontSize={fs} textAnchor="middle"
        fill={T.tooltipText} stroke={T.mapBg} strokeWidth={3*px} paintOrder="stroke" fontWeight={isSel?"bold":"normal"}
        style={{userSelect:"none",pointerEvents:"none"}}>{name(park)}</text>
    );
  };

  const btnStyle = {width:40,height:40,borderRadius:8,background:"rgba(10,20,10,0.85)",border:`1px solid ${T.mapBorder}`,color:"#cfe3cf",fontSize:20,cursor:"pointer",lineHeight:1};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 12px 8px"}}>
      <div style={{position:"relative"}}>
        <svg ref={svgRef} viewBox={viewBoxStr} role="img" aria-label={isJa?"国立公園の地図":"Map of national parks"}
          style={{width:"100%",background:T.mapBg,borderRadius:10,border:`1px solid ${T.mapBorder}`,display:"block",touchAction:"none",cursor:hoveredId?"pointer":"grab"}}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <path d={US_OUTLINE} fill={T.mapLand} stroke={T.mapLandBorder} strokeWidth={1.5/zoom} strokeLinejoin="round"/>
          {[0,1,2,3,4,5,6,7].map(i=><line key={`v${i}`} x1={i*100} y1="0" x2={i*100} y2={MAP_H} stroke={T.mapGrid} strokeWidth={0.5/zoom}/>)}
          {[0,1,2,3,4,5].map(i=><line key={`h${i}`} x1="0" y1={i*100} x2={MAP_W} y2={i*100} stroke={T.mapGrid} strokeWidth={0.5/zoom}/>)}
          {STATE_LABELS.map(s=>(
            <text key={s.ab} x={s.x} y={s.y} fontSize={7/zoom} fill={T.mapStateLabel} textAnchor="middle" style={{userSelect:"none",pointerEvents:"none"}}>{s.ab}</text>
          ))}
          {INSETS.map(inset=>(
            <g key={inset.key} style={{pointerEvents:"none"}}>
              <rect x={inset.x} y={inset.y} width={inset.w} height={inset.h} rx={6} fill={T.mapLand} fillOpacity={0.35} stroke={T.mapLandBorder} strokeWidth={1/zoom} strokeDasharray={`${4/zoom} ${3/zoom}`}/>
              <text x={inset.x+6} y={inset.y+12} fontSize={9/zoom} fill={T.mapStateLabel} style={{userSelect:"none"}}>{isJa?inset.labelJa:inset.label}</text>
            </g>
          ))}
          {placed.map(renderPin)}
          {placed.map(renderLabel)}
        </svg>

        {/* Zoom controls */}
        <div style={{position:"absolute",top:8,right:8,display:"flex",flexDirection:"column",gap:6}}>
          <button onClick={()=>zoomBy(1.5)} aria-label={isJa?"拡大":"Zoom in"} style={btnStyle}>+</button>
          <button onClick={()=>zoomBy(1/1.5)} aria-label={isJa?"縮小":"Zoom out"} style={btnStyle}>−</button>
          {zoom>1&&<button onClick={resetView} aria-label={isJa?"表示をリセット":"Reset view"} style={{...btnStyle,fontSize:16}}>⟲</button>}
        </div>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:14,justifyContent:"center",fontSize:12,color:T.mapStateLabel}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{width:12,height:12,borderRadius:"50%",background:T.pinVisited,border:`1px solid ${T.pinVisitedBorder}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,color:T.pinCheckmark}}>✓</span>
          {isJa?"訪問済み":"Visited"}
        </span>
        <span style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{width:12,height:12,borderRadius:"50%",background:T.pinUnvisited,border:`1px solid ${T.pinUnvisitedBorder}`,display:"inline-block"}}/>
          {isJa?"未訪問":"Not yet"}
        </span>
      </div>

      {/* Selected-park card (rendered by the parent) sits right under the map */}
      {children}

      {/* Territories (too far away to draw on the map) */}
      <div style={{background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:8,padding:"6px 12px"}}>
        <div style={{fontSize:11,color:T.mapStateLabel,margin:"4px 0",fontWeight:500}}>{isJa?"海外領土":"Territories"}</div>
        {territories.map(park=>{
          const cnt=visits[park.id]?.length??0;
          return (
            <button key={park.id} onClick={()=>onParkClick(park)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",minHeight:40,padding:"6px 0",background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
              <span style={{width:10,height:10,borderRadius:"50%",flexShrink:0,background:checked[park.id]?T.pinVisited:T.pinUnvisited,border:`1.5px solid ${checked[park.id]?T.pinVisitedBorder:T.pinUnvisitedBorder}`,boxShadow:selectedId===park.id?`0 0 0 2px ${T.accentText}`:"none"}}/>
              <span style={{fontSize:13,color:checked[park.id]?T.accentText:T.textPrimary}}>{park.emoji} {name(park)}</span>
              {cnt>1&&<span style={{fontSize:11,color:T.accentText}}>×{cnt}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "../react.js";
import { MAP_H, MAP_W, STATE_LABELS, US_OUTLINE, project } from "./mapData";

export function SVGMap({ parks, checked, visits, isJa, onParkClick, hoveredId, setHoveredId, themeColors }) {
  const contiguous = parks.filter(p=>!["Alaska","Hawaii","American Samoa","U.S. Virgin Islands"].includes(p.state));
  const outside    = parks.filter(p=> ["Alaska","Hawaii","American Samoa","U.S. Virgin Islands"].includes(p.state));

  const [zoom, setZoom]   = useState(1);
  const [pan,  setPan]    = useState({x:0,y:0});
  const dragRef = useRef({dragging:false, startX:0, startY:0, panX:0, panY:0});
  const pinchRef = useRef({active:false, startDist:0, startZoom:1});
  const svgRef = useRef(null);

  const MIN_ZOOM = 1, MAX_ZOOM = 6;

  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

  const zoomBy = (factor, cx=MAP_W/2, cy=MAP_H/2) => {
    setZoom(prevZoom => {
      const newZoom = clamp(prevZoom * factor, MIN_ZOOM, MAX_ZOOM);
      setPan(prevPan => {
        // Zoom toward the given center point (keeps that point stable)
        const scaleDelta = newZoom / prevZoom;
        const nx = cx - (cx - prevPan.x) * scaleDelta;
        const ny = cy - (cy - prevPan.y) * scaleDelta;
        return clampPan(nx, ny, newZoom);
      });
      return newZoom;
    });
  };

  const clampPan = (x, y, z) => {
    const maxPanX = (MAP_W * z - MAP_W) ;
    const maxPanY = (MAP_H * z - MAP_H) ;
    return { x: clamp(x, -maxPanX, 0), y: clamp(y, -maxPanY, 0) };
  };

  const resetView = () => { setZoom(1); setPan({x:0,y:0}); };

  // Mouse drag pan
  const onPointerDown = (e) => {
    const p = e.touches ? e.touches[0] : e;
    dragRef.current = { dragging:true, startX:p.clientX, startY:p.clientY, panX:pan.x, panY:pan.y };
  };
  const onPointerMove = (e) => {
    if (e.touches && e.touches.length === 2) { handlePinch(e); return; }
    if (!dragRef.current.dragging) return;
    const p = e.touches ? e.touches[0] : e;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = MAP_W / rect.width, scaleY = MAP_H / rect.height;
    const dx = (p.clientX - dragRef.current.startX) * scaleX;
    const dy = (p.clientY - dragRef.current.startY) * scaleY;
    setPan(clampPan(dragRef.current.panX + dx, dragRef.current.panY + dy, zoom));
  };
  const onPointerUp = () => { dragRef.current.dragging = false; pinchRef.current.active = false; };

  // Touch pinch-to-zoom
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = touchDist(e.touches);
      pinchRef.current = { active:true, startDist:dist, startZoom:zoom };
    } else if (e.touches.length === 1) {
      onPointerDown(e);
    }
  };
  const touchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  };
  const handlePinch = (e) => {
    if (!pinchRef.current.active) return;
    const dist = touchDist(e.touches);
    const scale = dist / pinchRef.current.startDist;
    const newZoom = clamp(pinchRef.current.startZoom * scale, MIN_ZOOM, MAX_ZOOM);
    setZoom(newZoom);
    setPan(p => clampPan(p.x, p.y, newZoom));
  };

  // Wheel zoom (desktop). Attached natively with passive:false because React's
  // onWheel is passive, so preventDefault() there can't stop the page scrolling.
  const onWheel = (e) => {
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = MAP_W / rect.width, scaleY = MAP_H / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    zoomBy(e.deltaY < 0 ? 1.2 : 1/1.2, cx, cy);
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

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 12px 8px"}}>
      <div style={{position:"relative"}}>
        <svg ref={svgRef} viewBox={viewBoxStr}
          style={{width:"100%",background:themeColors.mapBg,borderRadius:10,border:`1px solid ${themeColors.mapBorder}`,display:"block",touchAction:"none",cursor:dragRef.current.dragging?"grabbing":"grab"}}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
          onTouchStart={onTouchStart} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}>
          {/* Land mass */}
          <path d={US_OUTLINE} fill={themeColors.mapLand} stroke={themeColors.mapLandBorder} strokeWidth={1.5/zoom} strokeLinejoin="round"/>
          {/* Reference grid */}
          {[0,1,2,3,4,5,6,7].map(i=><line key={`v${i}`} x1={i*100} y1="0" x2={i*100} y2={MAP_H} stroke={themeColors.mapGrid} strokeWidth={0.5/zoom}/>)}
          {[0,1,2,3,4,5].map(i=><line key={`h${i}`} x1="0" y1={i*100} x2={MAP_W} y2={i*100} stroke={themeColors.mapGrid} strokeWidth={0.5/zoom}/>)}
          {/* State abbreviation labels */}
          {STATE_LABELS.map(s=>(
            <text key={s.ab} x={s.x} y={s.y} fontSize={7/zoom} fill={themeColors.mapStateLabel} textAnchor="middle" style={{userSelect:"none",pointerEvents:"none"}}>{s.ab}</text>
          ))}

          {contiguous.map(park=>{
            const {x,y}=project(park.lat,park.lng);
            if(x<0||x>MAP_W||y<0||y>MAP_H) return null;
            const isChk=checked[park.id], cnt=visits[park.id]?.length??0, isHov=hoveredId===park.id;
            const r=(isHov?9:6.5)/Math.sqrt(zoom); // pins shrink slightly on zoom so map doesn't get cluttered, but stay tappable
            return (
              <g key={park.id} style={{cursor:"pointer"}} onClick={()=>onParkClick(park)}
                onMouseEnter={()=>setHoveredId(park.id)} onMouseLeave={()=>setHoveredId(null)}>
                {/* Outer ring: unmistakable visited/unvisited signal */}
                <circle cx={x} cy={y} r={r+2.5/Math.sqrt(zoom)} fill="none" stroke={isChk?themeColors.pinVisitedRing:"none"} strokeWidth={1.5/Math.sqrt(zoom)} opacity={isChk?0.6:0}/>
                <circle cx={x+0.8} cy={y+0.8} r={r} fill="rgba(0,0,0,0.5)"/>
                <circle cx={x} cy={y} r={r} fill={isChk?themeColors.pinVisited:themeColors.pinUnvisited} stroke={isChk?themeColors.pinVisitedBorder:themeColors.pinUnvisitedBorder} strokeWidth={1.5/Math.sqrt(zoom)}/>
                {isChk
                  ? <text x={x} y={y+r*0.35} fontSize={r*1.1} textAnchor="middle" fill={themeColors.pinCheckmark} style={{userSelect:"none",pointerEvents:"none",fontWeight:"bold"}}>✓</text>
                  : <circle cx={x} cy={y} r={r*0.3} fill={themeColors.pinUnvisitedDot}/>
                }
                {cnt>1&&<text x={x+r+2/Math.sqrt(zoom)} y={y-r+2/Math.sqrt(zoom)} fontSize={8/Math.sqrt(zoom)} fill={themeColors.pinBadge} fontWeight="bold" textAnchor="middle" style={{userSelect:"none"}}>{cnt}</text>}
              </g>
            );
          })}
        </svg>

        {/* Zoom controls */}
        <div style={{position:"absolute",top:8,right:8,display:"flex",flexDirection:"column",gap:4}}>
          <button onClick={()=>zoomBy(1.4)} style={{width:28,height:28,borderRadius:6,background:"rgba(10,20,10,0.85)",border:`1px solid ${themeColors.mapBorder}`,color:themeColors.mapStateLabel,fontSize:16,cursor:"pointer",lineHeight:1}}>+</button>
          <button onClick={()=>zoomBy(1/1.4)} style={{width:28,height:28,borderRadius:6,background:"rgba(10,20,10,0.85)",border:`1px solid ${themeColors.mapBorder}`,color:themeColors.mapStateLabel,fontSize:16,cursor:"pointer",lineHeight:1}}>−</button>
          {zoom>1&&<button onClick={resetView} style={{width:28,height:28,borderRadius:6,background:"rgba(10,20,10,0.85)",border:`1px solid ${themeColors.mapBorder}`,color:themeColors.mapStateLabel,fontSize:11,cursor:"pointer",lineHeight:1}}>⟲</button>}
        </div>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:14,justifyContent:"center",fontSize:10,color:themeColors.mapStateLabel}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{width:10,height:10,borderRadius:"50%",background:themeColors.pinVisited,border:`1px solid ${themeColors.pinVisitedBorder}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:7,color:themeColors.pinCheckmark}}>✓</span>
          {isJa?"訪問済み":"Visited"}
        </span>
        <span style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{width:10,height:10,borderRadius:"50%",background:themeColors.pinUnvisited,border:`1px solid ${themeColors.pinUnvisitedBorder}`,display:"inline-block"}}/>
          {isJa?"未訪問":"Not yet"}
        </span>
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[{label:isJa?"アラスカ":"Alaska",fn:p=>p.state==="Alaska"},{label:isJa?"ハワイ":"Hawaii",fn:p=>p.state==="Hawaii"},{label:isJa?"海外領土":"Territories",fn:p=>["American Samoa","U.S. Virgin Islands"].includes(p.state)}].map(({label,fn})=>{
          const sub=outside.filter(fn); if(!sub.length) return null;
          return (
            <div key={label} style={{background:themeColors.cardBg,border:`1px solid ${themeColors.cardBorder}`,borderRadius:8,padding:"8px 12px",flex:1,minWidth:90}}>
              <div style={{fontSize:10,color:themeColors.mapStateLabel,marginBottom:5,fontWeight:500}}>{label}</div>
              {sub.map(park=>{
                const cnt=visits[park.id]?.length??0;
                return (
                  <div key={park.id} onClick={()=>onParkClick(park)} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",cursor:"pointer"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:checked[park.id]?themeColors.pinVisited:themeColors.pinUnvisited,border:`1.5px solid ${checked[park.id]?themeColors.pinVisitedBorder:themeColors.pinUnvisitedBorder}`}}/>
                    <span style={{fontSize:10,color:checked[park.id]?themeColors.accentText:themeColors.mutedText}}>{park.emoji} {isJa?park.ja:park.name}</span>
                    {cnt>1&&<span style={{fontSize:9,color:themeColors.accentText}}>×{cnt}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

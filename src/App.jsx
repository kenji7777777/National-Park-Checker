import { useState, useEffect, useMemo, useRef } from "./react.js";
import { REGION_ORDER, parks } from "./data/parks";
import { THEMES } from "./data/themes";
import { computeEarnedBadges, computeQuestProgress, computeTagBadges } from "./data/achievements";
import { i18n } from "./i18n";
import { formatDate, gmapUrl, npsUrl, today, uid } from "./utils";
import { SVGMap } from "./components/SVGMap";
import { TimelineView } from "./components/TimelineView";
import { BadgeModal } from "./components/BadgeModal";
import { StatsView } from "./components/StatsView";
import { ConfirmDialog, DateModal, ProfileModal } from "./components/Dialogs";
import { ShareCardModal } from "./components/ShareCardModal";
import { LANG_KEY, THEME_KEY, exportStoreToFile, initStore, parseImportedFile, saveData } from "./storage";

// ── Main App ──────────────────────────────────────────────────────
export function App() {
  const [store,         setStore]         = useState(() => initStore());
  const [lang,          setLang]          = useState(() => { try { return localStorage.getItem(LANG_KEY)||"en"; } catch { return "en"; } });
  const [siteTheme,     setSiteTheme]     = useState(() => { try { return localStorage.getItem(THEME_KEY)||"passport"; } catch { return "passport"; } });
  const [tab,           setTab]           = useState("list");
  const [activeRegion,  setActiveRegion]  = useState("all");
  const [search,        setSearch]        = useState("");
  const [sortMode,      setSortMode]      = useState("az"); // az | dateDesc | dateAsc | unvisited
  const [statusFilter,  setStatusFilter]  = useState("all"); // all | unvisited | visited
  const [toast,         setToast]         = useState(null); // { park, date } after a quick check
  const [showSortMenu,  setShowSortMenu]  = useState(false);
  const [showBadges,    setShowBadges]    = useState(false);
  const [selectedPark,  setSelectedPark]  = useState(null);
  const [dateModalPark, setDateModalPark] = useState(null);
  const [hoveredMapId,  setHoveredMapId]  = useState(null);
  const [showProfiles,  setShowProfiles]  = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [confirm,       setConfirm]       = useState(null); // { message, onConfirm }
  const parkRefs = useRef({});

  const isJa = lang === "ja";
  const tx   = i18n[lang] || i18n.en;
  const T    = THEMES[siteTheme] || THEMES.passport;

  useEffect(() => { try { localStorage.setItem(THEME_KEY, siteTheme); } catch {} }, [siteTheme]);

  // Persist
  useEffect(() => { saveData(store); }, [store]);
  useEffect(() => { try { localStorage.setItem(LANG_KEY, lang); } catch {} }, [lang]);

  const activeProfile = store.profiles.find(p=>p.id===store.activeId) || store.profiles[0];
  const visits = activeProfile.visits;

  const setVisits = (updater) => {
    setStore(prev => {
      const prevActive = prev.profiles.find(p=>p.id===prev.activeId) || prev.profiles[0];
      const newVisits = typeof updater === "function" ? updater(prevActive.visits) : updater;
      return {
        ...prev,
        profiles: prev.profiles.map(p => p.id===prevActive.id ? {...p, visits:newVisits} : p),
      };
    });
  };

  const checked = useMemo(() => {
    const o={};
    parks.forEach(p=>{o[p.id]=(visits[p.id]?.length??0)>0;});
    return o;
  }, [visits]);

  const totalChecked = Object.values(checked).filter(Boolean).length;
  const progress     = Math.round((totalChecked/parks.length)*100);

  const earnedBadges = useMemo(() => computeEarnedBadges(visits, checked), [visits, checked]);
  const earnedTagBadges = useMemo(() => computeTagBadges(visits), [visits]);
  const questProgress = useMemo(() => computeQuestProgress(checked), [checked]);

  const regions = useMemo(()=>REGION_ORDER.map(key=>{
    const s=parks.find(p=>p.region===key);
    return {key, label:isJa?s.regionJa:key};
  }),[isJa]);

  const filteredParks = useMemo(()=>{
    const q=search.toLowerCase();
    const getLatestDate = (id) => {
      const arr = visits[id];
      if (!arr || arr.length === 0) return null;
      return [...arr].sort((a,b)=>b.date.localeCompare(a.date))[0].date;
    };
    return parks.filter(p=>{
      const matchRegion=activeRegion==="all"||p.region===activeRegion;
      const matchSearch=!search||p.name.toLowerCase().includes(q)||p.ja.includes(search)||p.state.toLowerCase().includes(q)||p.stateJa.includes(search);
      const matchStatus=statusFilter==="all"||(statusFilter==="visited")===!!checked[p.id];
      return matchRegion&&matchSearch&&matchStatus;
    }).sort((a,b)=>{
      if (sortMode === "az") return a.name.localeCompare(b.name,"en",{sensitivity:"base"});
      if (sortMode === "dateDesc") {
        const da = getLatestDate(a.id), db = getLatestDate(b.id);
        if (!da && !db) return a.name.localeCompare(b.name,"en",{sensitivity:"base"});
        if (!da) return 1; if (!db) return -1;
        return db.localeCompare(da);
      }
      if (sortMode === "dateAsc") {
        const da = getLatestDate(a.id), db = getLatestDate(b.id);
        if (!da && !db) return a.name.localeCompare(b.name,"en",{sensitivity:"base"});
        if (!da) return 1; if (!db) return -1;
        return da.localeCompare(db);
      }
      if (sortMode === "unvisited") {
        const ca = checked[a.id]?1:0, cb = checked[b.id]?1:0;
        if (ca !== cb) return ca - cb;
        return a.name.localeCompare(b.name,"en",{sensitivity:"base"});
      }
      return 0;
    });
  },[activeRegion,search,sortMode,statusFilter,visits,checked]);

  const regionCount=(key)=>parks.filter(p=>p.region===key&&checked[p.id]).length;

  const addVisit=(id,date,note="")=>setVisits(prev=>{
    const ex=prev[id]??[];
    if(ex.some(v=>v.date===date)) return prev;
    return {...prev,[id]:[...ex,{date,note}]};
  });
  const removeVisit=(id,date)=>setVisits(prev=>({...prev,[id]:(prev[id]??[]).filter(v=>v.date!==date)}));
  const updateVisitNote=(id,date,note)=>setVisits(prev=>({...prev,[id]:(prev[id]??[]).map(v=>v.date===date?{...v,note}:v)}));

  const toggleCheck=(park)=>{
    if(!checked[park.id]){
      const date=today();
      addVisit(park.id,date);
      setToast({ park, date, key: Date.now() });
    } else {
      const visitCount = visits[park.id]?.length ?? 0;
      const parkName = isJa ? park.ja : park.name;
      setConfirm({
        message: tx.confirmUncheck(visitCount, parkName),
        onConfirm: () => {
          setVisits(prev=>({...prev,[park.id]:[]}));
          setConfirm(null);
        },
      });
    }
  };

  const resetAll=()=>{
    setConfirm({
      message: `${tx.confirmReset} "${activeProfile.name}"?`,
      onConfirm: ()=>{ setVisits({}); setConfirm(null); },
    });
  };

  // Hide the "recorded" toast after a few seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const undoToast=()=>{ if(toast){ removeVisit(toast.park.id, toast.date); setToast(null); } };

  const scrollToPark=(id)=>{
    setTab("list");setActiveRegion("all");setSearch("");
    setTimeout(()=>parkRefs.current[id]?.scrollIntoView({behavior:"smooth",block:"center"}),100);
  };

  // Profile actions
  const createProfile=(name)=>{
    const id=uid();
    setStore(prev=>({...prev, profiles:[...prev.profiles,{id,name,visits:{}}], activeId:id}));
  };
  const switchProfile=(id)=>setStore(prev=>({...prev,activeId:id}));
  const renameProfile=(id,name)=>setStore(prev=>({...prev,profiles:prev.profiles.map(p=>p.id===id?{...p,name}:p)}));
  const deleteProfile=(id)=>{
    const prof=store.profiles.find(p=>p.id===id);
    setConfirm({
      message:`${tx.confirmDelete} "${prof?.name}"?`,
      onConfirm:()=>{
        setStore(prev=>{
          const newProfiles=prev.profiles.filter(p=>p.id!==id);
          const newActive=prev.activeId===id?newProfiles[0].id:prev.activeId;
          return {...prev,profiles:newProfiles,activeId:newActive};
        });
        setConfirm(null);
      },
    });
  };

  // Backup: export/import handlers
  const handleExport = () => exportStoreToFile(store);
  const handleImport = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseImportedFile(reader.result);
        setConfirm({
          message: tx.importConfirm,
          onConfirm: () => {
            setStore(imported);
            setConfirm(null);
            setShowProfiles(false);
          },
        });
      } catch {
        setConfirm({ message: tx.importError, onConfirm: () => setConfirm(null) });
      }
    };
    reader.readAsText(file);
  };

  const S={
    btn:(active)=>({minHeight:36,padding:"6px 18px",borderRadius:20,fontSize:13,cursor:"pointer",fontFamily:"inherit",background:active?T.btnBgActive:"transparent",border:`1px solid ${active?T.btnBorderActive:T.cardBorder}`,color:active?T.chipTextActive:T.mutedText,transition:"all .2s"}),
    chip:(active)=>({minHeight:32,padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:active?T.chipBgActive:"transparent",border:`1px solid ${active?T.chipBorderActive:T.cardBorder}`,color:active?T.chipTextActive:T.chipText}),
    link:(color,bg,border)=>({flex:1,padding:"7px 0",textAlign:"center",borderRadius:8,fontSize:10,background:bg,border:`1px solid ${border}`,color,textDecoration:"none",display:"block"}),
    rowBtn:(color)=>({flex:1,padding:"11px 0",fontSize:12,cursor:"pointer",color,background:"transparent",border:"none",borderLeft:`1px solid ${T.cardBorder}`,fontFamily:"inherit"}),
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:isJa?"'Hiragino Sans','Noto Sans JP',sans-serif":T.fontBody,color:T.textPrimary,colorScheme:T.scheme,display:"flex",flexDirection:"column",transition:"background .3s ease"}}>

      {/* ── HEADER ── */}
      <div style={{background:T.headerBg,borderBottom:`1px solid ${T.headerBorder}`,padding:"calc(16px + env(safe-area-inset-top)) 16px 14px",textAlign:"center",position:"relative"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(ellipse at 50% 0%,${T.chipBgActive}33,transparent 70%)`,pointerEvents:"none"}}/>

        {/* Top bar: profile on the left, actions on the right */}
        <div style={{position:"absolute",top:"calc(12px + env(safe-area-inset-top))",right:12,left:12,display:"flex",alignItems:"center",gap:6,zIndex:1}}>
          <button onClick={()=>setShowProfiles(true)} aria-label={tx.profiles}
            style={{minHeight:36,minWidth:36,padding:"6px 12px",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:20,color:T.textSecondary,fontSize:13,cursor:"pointer",fontFamily:"inherit",maxWidth:"40%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            👤 {activeProfile.name}
          </button>
          <div style={{flex:1}}/>
          {totalChecked>0&&(
            <button onClick={()=>setShowShareCard(true)} aria-label={isJa?"シェア":"Share"} style={{minHeight:36,minWidth:36,padding:"6px 12px",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:20,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>📤</button>
          )}
          <button onClick={()=>setShowThemePicker(true)} aria-label={isJa?"テーマ":"Theme"} style={{minHeight:36,minWidth:36,padding:"6px 12px",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:20,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            {T.label}
          </button>
          <button onClick={()=>setLang(l=>l==="en"?"ja":"en")} style={{minHeight:36,minWidth:36,padding:"6px 12px",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:20,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            {isJa?"EN":"日本語"}
          </button>
          <button onClick={()=>setShowBadges(true)} aria-label={tx.badges} style={{minHeight:36,minWidth:36,padding:"6px 12px",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:20,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            🏅 {earnedBadges.length + earnedTagBadges.length}
          </button>
        </div>

        <div style={{fontSize:11,letterSpacing:"0.3em",color:T.mutedText,textTransform:"uppercase",marginBottom:4,marginTop:40}}>{tx.country}</div>
        <h1 style={{margin:0,fontSize:"clamp(20px,5vw,28px)",fontWeight:400,color:T.textPrimary,lineHeight:1.2}}>{tx.title}</h1>

        {/* Progress */}
        <div style={{maxWidth:320,margin:"10px auto 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
            <span style={{fontSize:12,color:T.textSecondary}}>{tx.visited} · {progress}%</span>
            <span style={{fontSize:24,fontWeight:300,color:T.accentText}}>{totalChecked}<span style={{fontSize:14,color:T.mutedText}}>/{parks.length}</span></span>
          </div>
          <div style={{height:4,background:T.progressTrack,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${progress}%`,background:T.progressFill,borderRadius:2,transition:"width .5s ease"}}/>
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:12,flexWrap:"wrap",rowGap:6}}>
          <button role="tab" aria-selected={tab==="list"} style={S.btn(tab==="list")} onClick={()=>setTab("list")}>{tx.listTab}</button>
          <button role="tab" aria-selected={tab==="map"} style={S.btn(tab==="map")}  onClick={()=>setTab("map")}>{tx.mapTab}</button>
          <button role="tab" aria-selected={tab==="timeline"} style={S.btn(tab==="timeline")} onClick={()=>setTab("timeline")}>{tx.timelineTab}</button>
          <button role="tab" aria-selected={tab==="stats"} style={S.btn(tab==="stats")} onClick={()=>setTab("stats")}>{tx.statsTab}</button>
        </div>
      </div>

      {/* ── MAP TAB ── */}
      {tab==="map"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"8px 16px 2px",fontSize:11,color:T.mutedText,textAlign:"center"}}>
            {tx.mapHint}
          </div>
          <SVGMap parks={parks} checked={checked} visits={visits} isJa={isJa} selectedId={selectedPark?.id} onParkClick={p=>setSelectedPark(s=>s?.id===p.id?null:p)} hoveredId={hoveredMapId} setHoveredId={setHoveredMapId} themeColors={T}/>
          {selectedPark&&(
            <div style={{margin:"0 12px 12px",background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:10,padding:"16px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                <div>
                  <div style={{fontSize:18,color:T.textPrimary,marginBottom:3,fontWeight:600}}>{selectedPark.emoji} {isJa?selectedPark.ja:selectedPark.name}</div>
                  <div style={{fontSize:12,color:T.mutedText}}>{isJa?selectedPark.name:selectedPark.ja} · {isJa?selectedPark.stateJa:selectedPark.state}</div>
                  {(visits[selectedPark.id]?.length??0)>0&&<div style={{fontSize:11,color:T.pinVisited,marginTop:4}}>✓ {tx.visits(visits[selectedPark.id].length)}</div>}
                </div>
                <button onClick={()=>toggleCheck(selectedPark)} style={{padding:"6px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,background:checked[selectedPark.id]?T.btnBgActive:"transparent",border:`1px solid ${checked[selectedPark.id]?T.btnBorderActive:T.cardBorder}`,color:checked[selectedPark.id]?T.chipTextActive:T.mutedText}}>
                  {checked[selectedPark.id]?"✓ "+tx.checkedLabel:tx.uncheckedLabel}
                </button>
              </div>
              <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>
                <a href={npsUrl(selectedPark)} target="_blank" rel="noopener noreferrer" style={{...S.link(T.accentText,T.cardBg,T.cardBorderActive),fontSize:12,padding:"8px 0"}}>🏛 {tx.npsLink}</a>
                <a href={gmapUrl(selectedPark)} target="_blank" rel="noopener noreferrer" style={{...S.link(T.accentText,T.cardBg,T.cardBorderActive),fontSize:12,padding:"8px 0"}}>📍 {tx.gmapLink}</a>
                <button onClick={()=>{setDateModalPark(selectedPark);setSelectedPark(null);}} style={{flex:1,padding:"8px 0",borderRadius:8,fontSize:12,cursor:"pointer",background:T.cardBg,border:`1px solid ${T.cardBorder}`,color:T.mutedText,fontFamily:"inherit"}}>📅 {isJa?"訪問日":"Dates"}</button>
                <button onClick={()=>{scrollToPark(selectedPark.id);setSelectedPark(null);}} style={{flex:1,padding:"8px 0",borderRadius:8,fontSize:12,cursor:"pointer",background:T.cardBg,border:`1px solid ${T.cardBorder}`,color:T.mutedText,fontFamily:"inherit"}}>≡ {tx.listTab}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TIMELINE TAB ── */}
      {tab==="timeline"&&(
        <TimelineView parks={parks} visits={visits} isJa={isJa} themeColors={T} onParkClick={(park)=>{setTab("map");setSelectedPark(park);}}/>
      )}

      {/* ── STATS TAB ── */}
      {tab==="stats"&&(
        <StatsView parks={parks} visits={visits} checked={checked} isJa={isJa} themeColors={T} tx={tx} onParkClick={(park)=>{setTab("map");setSelectedPark(park);}}/>
      )}

      {/* ── LIST TAB ── */}
      {tab==="list"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"14px 16px 0",maxWidth:700,margin:"0 auto",width:"100%",boxSizing:"border-box",display:"flex",gap:8}}>
            <input type="text" placeholder={tx.search} value={search} onChange={e=>setSearch(e.target.value)}
              style={{flex:1,padding:"10px 14px",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.textPrimary,fontSize:16,outline:"none",boxSizing:"border-box",fontFamily:"inherit",minWidth:0}}/>
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowSortMenu(s=>!s)} style={{height:"100%",padding:"0 14px",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                ⇅ {tx.sortBy}
              </button>
              {showSortMenu&&(
                <div style={{position:"absolute",top:"110%",right:0,background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:8,padding:6,zIndex:10,minWidth:150,boxShadow:"0 4px 16px rgba(0,0,0,.4)"}}>
                  {[["az",tx.sortAZ],["dateDesc",tx.sortDateDesc],["dateAsc",tx.sortDateAsc],["unvisited",tx.sortUnvisited]].map(([key,label])=>(
                    <div key={key} onClick={()=>{setSortMode(key);setShowSortMenu(false);}} style={{
                      padding:"12px 12px",borderRadius:6,fontSize:14,cursor:"pointer",
                      background:sortMode===key?T.btnBgActive:"transparent",
                      color:sortMode===key?T.chipTextActive:T.textPrimary,
                    }}>{sortMode===key?"✓ ":""}{label}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div role="group" aria-label={tx.statusFilter} style={{padding:"10px 16px 0",maxWidth:700,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
            <div style={{display:"flex",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,padding:3,gap:3}}>
              {[["all",tx.filterAll,parks.length],["unvisited",tx.filterUnvisited,parks.length-totalChecked],["visited",tx.filterVisited,totalChecked]].map(([key,label,n])=>(
                <button key={key} onClick={()=>setStatusFilter(key)} aria-pressed={statusFilter===key} style={{
                  flex:1,minHeight:36,borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,
                  background:statusFilter===key?T.btnBgActive:"transparent",color:statusFilter===key?T.chipTextActive:T.mutedText,
                }}>{label} <span style={{opacity:.7,fontSize:11}}>{n}</span></button>
              ))}
            </div>
          </div>
          <div style={{padding:"10px 16px",maxWidth:700,margin:"0 auto",width:"100%",boxSizing:"border-box",display:"flex",gap:6,flexWrap:"wrap"}}>
            {[{key:"all",label:tx.all},...regions].map(r=>{
              const cnt=r.key==="all"?totalChecked:regionCount(r.key);
              const total=r.key==="all"?parks.length:parks.filter(p=>p.region===r.key).length;
              return <button key={r.key} onClick={()=>setActiveRegion(r.key)} style={S.chip(activeRegion===r.key)}>{r.label} <span style={{opacity:.6}}>({cnt}/{total})</span></button>;
            })}
          </div>
          <div style={{maxWidth:700,margin:"0 auto",padding:"0 16px 80px",width:"100%",boxSizing:"border-box"}}>
            {filteredParks.length===0&&<div style={{textAlign:"center",padding:40,color:T.mutedText,fontSize:13}}>{tx.notFound}</div>}
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              {filteredParks.map(park=>{
                const isCheckedP=checked[park.id], visitCount=visits[park.id]?.length??0;
                const latestVisit=visitCount>0?[...(visits[park.id])].sort((a,b)=>b.date.localeCompare(a.date))[0]:null;
                const latestDate=latestVisit?.date;
                return (
                  <div key={park.id} ref={el=>parkRefs.current[park.id]=el}
                    style={{background:isCheckedP?T.cardBgAlt:T.cardBg,borderLeft:`3px solid ${isCheckedP?T.cardBorderActive:T.cardBorder}`,borderRadius:2,opacity:isCheckedP?.85:1}}>
                    <div onClick={()=>setDateModalPark(park)} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px 6px 4px",cursor:"pointer"}}>
                      <button onClick={e=>{e.stopPropagation();toggleCheck(park);}} role="checkbox" aria-checked={!!isCheckedP} aria-label={isJa?park.ja:park.name}
                        style={{width:44,height:44,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"transparent",border:"none",cursor:"pointer",padding:0}}>
                        <span style={{width:24,height:24,border:`2px solid ${isCheckedP?T.cardBorderActive:T.mutedText}`,borderRadius:6,background:isCheckedP?T.btnBgActive:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:T.chipTextActive}}>
                          {isCheckedP&&"✓"}
                        </span>
                      </button>
                      <span style={{fontSize:17,flexShrink:0}}>{park.emoji}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:15,color:isCheckedP?T.accentText:T.textPrimary}}>{isJa?park.ja:park.name}</div>
                        <div style={{fontSize:11,color:T.mutedText,marginTop:1}}>{isJa?park.name:park.ja} · {isJa?park.stateJa:park.state}</div>
                        {latestDate&&<div style={{fontSize:11,color:T.mutedText,marginTop:3,display:"flex",alignItems:"center",gap:4}}>
                          <span>📅 {formatDate(latestDate,isJa)}</span>
                          {visitCount>1&&<span style={{color:T.accentText,background:T.cardBg,border:`1px solid ${T.cardBorder}`,borderRadius:8,padding:"0 5px"}}>×{visitCount}</span>}
                        </div>}
                        {latestVisit?.note&&<div style={{fontSize:11,color:T.textSecondary,marginTop:3,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>💬 {latestVisit.note}</div>}
                      </div>
                      {activeRegion==="all"&&<span style={{fontSize:10,color:T.mutedText,background:T.inputBg,border:`1px solid ${T.cardBorder}`,borderRadius:10,padding:"2px 7px",flexShrink:0,whiteSpace:"nowrap"}}>{isJa?park.regionJa:park.region}</span>}
                    </div>
                    <div style={{display:"flex",borderTop:`1px solid ${T.cardBorder}`}}>
                      <a href={npsUrl(park)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{flex:1,padding:"11px 0",textAlign:"center",fontSize:12,color:T.accentText,textDecoration:"none",borderRight:`1px solid ${T.cardBorder}`,whiteSpace:"nowrap"}}>🏛 {tx.npsLink}</a>
                      <a href={gmapUrl(park)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{flex:1,padding:"11px 0",textAlign:"center",fontSize:12,color:T.accentText,textDecoration:"none",borderRight:`1px solid ${T.cardBorder}`,whiteSpace:"nowrap"}}>📍 {tx.gmapLink}</a>
                      <button onClick={e=>{e.stopPropagation();setTab("map");setSelectedPark(park);}} style={{...S.rowBtn(T.mutedText),borderLeft:"none",whiteSpace:"nowrap"}}>🗺 {tx.showOnMap}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating badge */}
      {totalChecked>0&&!toast&&(
        <div style={{position:"fixed",bottom:"calc(16px + env(safe-area-inset-bottom))",right:12,background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:50,padding:"6px 12px",fontSize:11,color:T.accentText,boxShadow:"0 4px 16px rgba(0,0,0,.4)",pointerEvents:"none",opacity:0.9}}>
          {tx.badge(totalChecked)}
        </div>
      )}

      {/* "Recorded" toast with change-date / undo */}
      {toast&&(
        <div key={toast.key} role="status" style={{position:"fixed",left:12,right:12,bottom:"calc(12px + env(safe-area-inset-bottom))",zIndex:1500,maxWidth:500,margin:"0 auto",background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:12,padding:"10px 10px 10px 14px",display:"flex",alignItems:"center",gap:8,boxShadow:"0 6px 24px rgba(0,0,0,.45)"}}>
          <div style={{flex:1,minWidth:0,fontSize:13,color:T.textPrimary,lineHeight:1.35}}>
            ✓ {tx.recorded(isJa?toast.park.ja:toast.park.name, toast.date.slice(5).split("-").map(Number).join("/"))}
          </div>
          <button onClick={()=>{setDateModalPark(toast.park);setToast(null);}} style={{minHeight:36,padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:`1px solid ${T.cardBorderActive}`,color:T.accentText,whiteSpace:"nowrap"}}>📅 {tx.changeDate}</button>
          <button onClick={undoToast} style={{minHeight:36,padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:`1px solid ${T.cardBorder}`,color:T.mutedText,whiteSpace:"nowrap"}}>{tx.undo}</button>
        </div>
      )}

      {/* Modals */}
      {dateModalPark&&<DateModal T={T} park={dateModalPark} dates={visits[dateModalPark.id]??[]} isJa={isJa} tx={tx} onClose={()=>setDateModalPark(null)} onAdd={(date,note)=>addVisit(dateModalPark.id,date,note)} onDelete={date=>removeVisit(dateModalPark.id,date)} onUpdateNote={(date,note)=>updateVisitNote(dateModalPark.id,date,note)}/>}
      {showProfiles&&<ProfileModal T={T} onReset={totalChecked>0?()=>{setShowProfiles(false);resetAll();}:null} profiles={store.profiles} activeId={store.activeId} onSwitch={switchProfile} onCreate={createProfile} onRename={renameProfile} onDelete={deleteProfile} onClose={()=>setShowProfiles(false)} tx={tx} isJa={isJa} onExport={handleExport} onImport={handleImport}/>}
      {showShareCard&&<ShareCardModal T={T} profile={activeProfile} visits={visits} checked={checked} isJa={isJa} tx={tx} earnedBadgeIds={earnedBadges} earnedTagIds={earnedTagBadges} questProgress={questProgress} onClose={()=>setShowShareCard(false)}/>}
      {showBadges&&<BadgeModal earnedIds={earnedBadges} earnedTagIds={earnedTagBadges} questProgress={questProgress} checked={checked} isJa={isJa} tx={tx} themeColors={T} onParkClick={(park)=>{setTab("map");setSelectedPark(park);setShowBadges(false);}} onClose={()=>setShowBadges(false)}/>}
      {showThemePicker&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:2000}} onClick={()=>setShowThemePicker(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.cardBgAlt,border:`1px solid ${T.headerBorder}`,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:500,padding:"20px 20px calc(32px + env(safe-area-inset-bottom))"}}>
            <div style={{width:36,height:4,background:T.cardBorder,borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{fontSize:16,color:T.accentText,marginBottom:16,textAlign:"center"}}>{isJa?"サイトのテーマ":"Site Theme"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {Object.entries(THEMES).map(([key,theme])=>(
                <button key={key} onClick={()=>{setSiteTheme(key);setShowThemePicker(false);}} style={{
                  display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                  background:siteTheme===key?T.btnBgActive:T.cardBg,
                  border:`1px solid ${siteTheme===key?T.btnBorderActive:T.cardBorder}`,
                }}>
                  <span style={{fontSize:22}}>{theme.label}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,color:siteTheme===key?T.chipTextActive:T.textPrimary}}>{isJa?theme.nameJa:theme.name}</div>
                  </div>
                  {siteTheme===key&&<span style={{color:T.chipTextActive,fontSize:16}}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {confirm&&<ConfirmDialog T={T} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} tx={tx}/>}
    </div>
  );
}

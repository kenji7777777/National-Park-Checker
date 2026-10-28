import { useState, useEffect, useMemo, useRef } from "./react.js";
import { REGION_ORDER, parks } from "./data/parks";
import { THEMES } from "./data/themes";
import { BADGES, computeEarnedBadges, computeQuestProgress, computeTagBadges } from "./data/achievements";
import { i18n } from "./i18n";
import { formatDate, gmapUrl, npsUrl, today, uid } from "./utils";
import { SVGMap } from "./components/SVGMap";
import { TimelineView } from "./components/TimelineView";
import { BadgeModal } from "./components/BadgeModal";
import { StatsView } from "./components/StatsView";
import { ConfirmDialog, DateModal, ProfileModal } from "./components/Dialogs";
import { ShareCardModal } from "./components/ShareCardModal";
import { BACKUP_KEY, LANG_KEY, ONBOARD_KEY, SNOOZE_KEY, THEME_KEY, exportStoreToFile, initStore, parseImportedFile, saveData } from "./storage";
import { APP_CSS, ConfettiLayer, HelpModal, useCountUp, vibrate } from "./components/Delight";

const MILESTONES = [5, 10, 15, 20, 30, 40, 50, 63];

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
  const [toast,         setToast]         = useState(null);  // { id, icon, text, actionLabel, onAction, secondaryLabel, onSecondary }
  const [achievements,  setAchievements]  = useState([]);    // queue of { id, icon, title, sub }
  const [burst,         setBurst]         = useState(null);  // { key, big }
  const [flashId,       setFlashId]       = useState(null);
  const [popId,         setPopId]         = useState(null);
  const [showHelp,      setShowHelp]      = useState(false);
  const [firstRunHelp,  setFirstRunHelp]  = useState(false);
  const [showTop,       setShowTop]       = useState(false);
  const [backupTick,    setBackupTick]    = useState(0);
  const toastTimer = useRef(null);
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

  const shownTotal = useCountUp(totalChecked);
  const nextMilestone = MILESTONES.find(m => m > totalChecked);
  const progressHint = totalChecked >= parks.length ? tx.allDone
    : totalChecked === 0 ? tx.startHint
    : tx.nextMilestone(nextMilestone - totalChecked, nextMilestone);

  // First-run welcome sheet (only for brand-new users)
  useEffect(() => {
    let seen = false;
    try { seen = !!localStorage.getItem(ONBOARD_KEY); } catch {}
    if (!seen && totalChecked === 0) { setFirstRunHelp(true); setShowHelp(true); }
  }, []);
  const closeHelp = () => {
    setShowHelp(false); setFirstRunHelp(false);
    try { localStorage.setItem(ONBOARD_KEY, "1"); } catch {}
  };

  // Back-to-top button visibility
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Achievement banners play one after another
  const firstAchId = achievements.length ? achievements[0].id : null;
  useEffect(() => {
    if (!firstAchId) return;
    const t = setTimeout(() => setAchievements(a => a.slice(1)), 3400);
    return () => clearTimeout(t);
  }, [firstAchId]);

  // Gentle backup reminder (records live only in this browser)
  const showBackupNudge = useMemo(() => {
    if (totalChecked < 3) return false;
    try {
      const last = Number(localStorage.getItem(BACKUP_KEY) || 0);
      const snooze = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      const now = Date.now();
      return now > snooze && now - last > 30 * 86400000;
    } catch { return false; }
  }, [totalChecked >= 3, backupTick]);
  const snoozeBackup = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + 14 * 86400000)); } catch {}
    setBackupTick(t => t + 1);
  };

  const showToast = (t, ms = 5500) => {
    clearTimeout(toastTimer.current);
    const id = uid();
    setToast({ id, ...t });
    toastTimer.current = setTimeout(() => setToast(cur => (cur && cur.id === id ? null : cur)), ms);
  };
  const closeToast = () => { clearTimeout(toastTimer.current); setToast(null); };

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

  const restoreVisits=(profileId,parkId,list)=>setStore(prev=>({...prev,profiles:prev.profiles.map(p=>p.id===profileId?{...p,visits:{...p.visits,[parkId]:list}}:p)}));

  const toggleCheck=(park)=>{
    const parkName = isJa ? park.ja : park.name;
    const profileId = store.activeId;
    if(!checked[park.id]){
      // One tap on the checkbox = recorded with today's date; date and undo stay one tap away in the toast.
      const entry = { date: today(), note: "" };
      const newVisits  = { ...visits, [park.id]: [...(visits[park.id] ?? []), entry] };
      const newChecked = { ...checked, [park.id]: true };
      const newTotal   = totalChecked + 1;
      addVisit(park.id, entry.date);

      // What did this check-in unlock?
      const gains = [];
      computeEarnedBadges(newVisits, newChecked).forEach(id => {
        if (!earnedBadges.includes(id)) {
          const b = BADGES.find(x => x.id === id);
          if (b) gains.push({ icon:b.icon, title:tx.newBadgeTitle, sub:isJa?b.nameJa:b.name });
        }
      });
      computeQuestProgress(newChecked).forEach((q, i) => {
        if (q.complete && !questProgress[i]?.complete) gains.push({ icon:q.icon, title:tx.questDoneTitle, sub:isJa?q.nameJa:q.name });
      });
      const rTotal = parks.filter(p => p.region === park.region).length;
      const rDone  = parks.filter(p => p.region === park.region && newChecked[p.id]).length;
      if (rDone === rTotal) gains.push({ icon:"🗺️", title:tx.regionDone(isJa?park.regionJa:park.region), sub:`${rDone}/${rTotal}` });
      if (MILESTONES.includes(newTotal) && !gains.some(g => g.title === tx.newBadgeTitle)) {
        gains.unshift({ icon:newTotal===parks.length?"🏆":"🎉", title:tx.milestoneTitle(newTotal), sub:tx.milestoneSub });
      }

      const big = gains.length > 0;
      setBurst({ key: uid(), big });
      vibrate(big ? [30, 40, 70] : 18);
      if (big) setAchievements(a => [...a, ...gains.map(g => ({ ...g, id: uid() }))]);
      setPopId(park.id);
      setTimeout(() => setPopId(c => (c === park.id ? null : c)), 650);
      showToast({
        icon:"✅", text: tx.recorded(parkName, entry.date.slice(5).split("-").map(Number).join("/"), newTotal, parks.length),
        actionLabel: tx.changeDate, onAction: () => { setDateModalPark(park); closeToast(); },
        secondaryLabel: tx.undo, onSecondary: () => { restoreVisits(profileId, park.id, visits[park.id] ?? []); closeToast(); },
      }, 6500);
    } else {
      // Un-check instantly, but keep an Undo button handy instead of a blocking confirm dialog.
      const prevList = visits[park.id] ?? [];
      setVisits(prev=>({...prev,[park.id]:[]}));
      vibrate(10);
      showToast({
        icon:"↩️", text: tx.unchecked(parkName),
        actionLabel: tx.undo, onAction: () => { restoreVisits(profileId, park.id, prevList); closeToast(); },
      }, 6500);
    }
  };

  const resetAll=()=>{
    setConfirm({
      message: `${tx.confirmReset} "${activeProfile.name}"?`,
      onConfirm: ()=>{ setVisits({}); setConfirm(null); },
    });
  };

  const scrollToPark=(id)=>{
    setTab("list");setActiveRegion("all");setSearch("");setStatusFilter("all");
    setFlashId(id);
    setTimeout(()=>parkRefs.current[id]?.scrollIntoView({behavior:"smooth",block:"center"}),120);
    setTimeout(()=>setFlashId(cur=>cur===id?null:cur),2800);
  };

  // 🎲 Suggest a random park that hasn't been visited yet
  const pickRandom=()=>{
    const pool = parks.filter(p=>!checked[p.id]);
    if (pool.length===0) { showToast({icon:"🏆",text:tx.allDone}); return; }
    const p = pool[Math.floor(Math.random()*pool.length)];
    setBurst(null);
    scrollToPark(p.id);
    showToast({icon:"🎲",text:tx.randomPick(isJa?p.ja:p.name, isJa?p.stateJa:p.state)});
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
  const handleExport = () => {
    exportStoreToFile(store);
    try { localStorage.setItem(BACKUP_KEY, String(Date.now())); } catch {}
    setBackupTick(t => t + 1);
    showToast({ icon:"💾", text: tx.exportSuccess });
  };
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
    btn:(active)=>({minHeight:36,padding:"6px 18px",borderRadius:20,fontSize:13,cursor:"pointer",fontFamily:"inherit",background:active?T.btnBgActive:"transparent",border:`1px solid ${active?T.btnBorderActive:T.cardBorder}`,color:active?T.accentText:T.mutedText,transition:"all .2s"}),
    chip:(active)=>({minHeight:36,padding:"6px 13px",borderRadius:20,fontSize:13,flexShrink:0,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",background:active?T.chipBgActive:"transparent",border:`1px solid ${active?T.chipBorderActive:T.cardBorder}`,color:active?T.chipTextActive:T.chipText}),
    link:(color,bg,border)=>({flex:1,padding:"7px 0",textAlign:"center",borderRadius:8,fontSize:10,background:bg,border:`1px solid ${border}`,color,textDecoration:"none",display:"block"}),
    rowBtn:(color)=>({flex:1,padding:"11px 0",fontSize:12,cursor:"pointer",color,background:"transparent",border:"none",borderLeft:`1px solid ${T.cardBorder}`,fontFamily:"inherit"}),
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:isJa?"'Hiragino Sans','Noto Sans JP',sans-serif":T.fontBody,color:T.textPrimary,colorScheme:T.scheme,display:"flex",flexDirection:"column",transition:"background .3s ease","--np-glow":T.cardBorderActive}}>
      <style>{APP_CSS}</style>

      {/* ── HEADER ── */}
      <div style={{background:T.headerBg,borderBottom:`1px solid ${T.headerBorder}`,padding:"calc(16px + env(safe-area-inset-top)) 16px 14px",textAlign:"center",position:"relative"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(ellipse at 50% 0%,${T.chipBgActive}33,transparent 70%)`,pointerEvents:"none"}}/>

        {/* Top bar: profile on the left, actions on the right */}
        <div style={{position:"absolute",top:"calc(12px + env(safe-area-inset-top))",right:12,left:12,display:"flex",alignItems:"center",gap:6,zIndex:1}}>
          <button onClick={()=>setShowProfiles(true)} aria-label={tx.profiles} className="np-press"
            style={{minHeight:36,padding:"6px 12px",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:20,color:T.textSecondary,fontSize:13,cursor:"pointer",fontFamily:"inherit",minWidth:0,flexShrink:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            👤 {activeProfile.name}
          </button>
          <div style={{flex:1}}/>
          {totalChecked>0&&(
            <button onClick={()=>setShowShareCard(true)} aria-label={isJa?"シェア":"Share"} className="np-press" style={{minHeight:36,minWidth:36,padding:"6px 10px",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:20,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>📤</button>
          )}
          <button onClick={()=>setShowThemePicker(true)} aria-label={isJa?"テーマ":"Theme"} className="np-press" style={{minHeight:36,minWidth:36,padding:"6px 10px",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:20,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
            {T.label}
          </button>
          <button onClick={()=>setLang(l=>l==="en"?"ja":"en")} aria-label="Language" className="np-press" style={{minHeight:36,minWidth:36,padding:"6px 10px",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:20,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
            {isJa?"EN":"日本語"}
          </button>
          <button onClick={()=>setShowBadges(true)} aria-label={tx.badges} className="np-press" style={{minHeight:36,minWidth:36,padding:"6px 10px",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:20,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
            🏅 {earnedBadges.length + earnedTagBadges.length}
          </button>
          <button onClick={()=>setShowHelp(true)} aria-label={tx.helpAria} className="np-press" style={{minHeight:36,minWidth:36,padding:"6px 10px",background:"transparent",border:`1px solid ${T.headerBorder}`,borderRadius:20,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>❓</button>
        </div>

        <div style={{fontSize:11,letterSpacing:"0.3em",color:T.mutedText,textTransform:"uppercase",marginBottom:4,marginTop:40}}>{tx.country}</div>
        <h1 style={{margin:0,fontSize:"clamp(20px,5vw,28px)",fontWeight:400,color:T.textPrimary,lineHeight:1.2}}>{tx.title}</h1>

        {/* Progress */}
        <div style={{maxWidth:320,margin:"10px auto 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
            <span style={{fontSize:12,color:T.textSecondary}}>{tx.visited}</span>
            <span style={{fontSize:24,fontWeight:300,color:T.accentText}}>{shownTotal}<span style={{fontSize:14,color:T.mutedText}}>/{parks.length}</span></span>
          </div>
          <div style={{height:6,background:T.progressTrack,borderRadius:3,overflow:"hidden"}}>
            <div style={{position:"relative",overflow:"hidden",height:"100%",width:`${progress}%`,background:T.progressFill,borderRadius:3,transition:"width .7s cubic-bezier(.2,.8,.2,1)",boxShadow:progress>=100?"0 0 12px 2px #f5c542":"none"}}>
              {progress>0&&progress<100&&<div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent)",animation:"np-shimmer 2.6s ease-in-out infinite"}}/>}
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginTop:5,fontSize:11,color:T.mutedText}}>
            <span style={{color:T.textSecondary,textAlign:"left"}}>{progressHint}</span><span>{progress}%</span>
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
        <div className="np-tab" style={{flex:1,display:"flex",flexDirection:"column"}}>
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
                <button onClick={()=>toggleCheck(selectedPark)} style={{padding:"6px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,background:checked[selectedPark.id]?T.btnBgActive:"transparent",border:`1px solid ${checked[selectedPark.id]?T.btnBorderActive:T.cardBorder}`,color:checked[selectedPark.id]?T.accentText:T.mutedText}}>
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
        <div className="np-tab"><TimelineView parks={parks} visits={visits} isJa={isJa} themeColors={T} onParkClick={(park)=>{setTab("map");setSelectedPark(park);}}/></div>
      )}

      {/* ── STATS TAB ── */}
      {tab==="stats"&&(
        <div className="np-tab"><StatsView parks={parks} visits={visits} checked={checked} isJa={isJa} themeColors={T} tx={tx} onParkClick={(park)=>{setTab("map");setSelectedPark(park);}}/></div>
      )}

      {/* ── LIST TAB ── */}
      {tab==="list"&&(
        <div className="np-tab" style={{flex:1,display:"flex",flexDirection:"column"}}>
          {/* Sticky search + filters so they stay reachable while scrolling the long list */}
          <div style={{position:"sticky",top:0,zIndex:5,background:T.bg,borderBottom:`1px solid ${T.cardBorder}`,boxShadow:"0 8px 14px -12px rgba(0,0,0,.7)",paddingTop:"env(safe-area-inset-top)"}}>
            <div style={{padding:"10px 16px 0",maxWidth:700,margin:"0 auto",width:"100%",boxSizing:"border-box",display:"flex",gap:8}}>
              <div style={{position:"relative",flex:1,minWidth:0}}>
                <input type="text" enterKeyHint="search" aria-label={tx.search} placeholder={`🔍 ${tx.search}`} value={search} onChange={e=>setSearch(e.target.value)}
                  style={{width:"100%",padding:"10px 36px 10px 12px",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.textPrimary,fontSize:16,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                {search&&(
                  <button onClick={()=>setSearch("")} aria-label={tx.clearSearch}
                    style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",width:32,height:32,borderRadius:16,border:"none",background:T.cardBg,color:T.mutedText,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                )}
              </div>
              <button onClick={pickRandom} aria-label={tx.randomBtn} title={tx.randomBtn} className="np-press"
                style={{minWidth:44,padding:"0 10px",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.accentText,fontSize:18,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>🎲</button>
              <div style={{position:"relative",flexShrink:0}}>
                <button onClick={()=>setShowSortMenu(s=>!s)} aria-label={tx.sortBy} className="np-press" style={{height:"100%",minWidth:44,padding:"0 10px",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.mutedText,fontSize:13,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                  ⇅ {tx.sortBy}
                </button>
                {showSortMenu&&(
                  <div style={{position:"absolute",top:"110%",right:0,background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:8,padding:6,zIndex:10,minWidth:170,boxShadow:"0 4px 16px rgba(0,0,0,.4)"}}>
                    {[["az",tx.sortAZ],["dateDesc",tx.sortDateDesc],["dateAsc",tx.sortDateAsc],["unvisited",tx.sortUnvisited]].map(([key,label])=>(
                      <div key={key} onClick={()=>{setSortMode(key);setShowSortMenu(false);}} style={{
                        padding:"12px 12px",borderRadius:6,fontSize:14,cursor:"pointer",
                        background:sortMode===key?T.btnBgActive:"transparent",
                        color:sortMode===key?T.accentText:T.textPrimary,
                      }}>{sortMode===key?"✓ ":""}{label}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="np-noscroll" role="group" aria-label={tx.statusFilter} style={{padding:"9px 16px 10px",maxWidth:700,margin:"0 auto",width:"100%",boxSizing:"border-box",display:"flex",gap:6,overflowX:"auto",flexWrap:"nowrap",alignItems:"center"}}>
              {[["all",tx.filterAll,parks.length],["unvisited",tx.filterUnvisited,parks.length-totalChecked],["visited",tx.filterVisited,totalChecked]].map(([key,label,cnt])=>(
                <button key={key} onClick={()=>setStatusFilter(key)} aria-pressed={statusFilter===key} className="np-press" style={S.chip(statusFilter===key)}>{label} <span style={{opacity:.6}}>({cnt})</span></button>
              ))}
              <span aria-hidden="true" style={{width:1,alignSelf:"stretch",background:T.cardBorder,flexShrink:0,margin:"3px 3px"}}/>
              {[{key:"all",label:tx.allRegions},...regions].map(r=>{
                const cnt=r.key==="all"?totalChecked:regionCount(r.key);
                const total=r.key==="all"?parks.length:parks.filter(p=>p.region===r.key).length;
                return <button key={r.key} onClick={()=>setActiveRegion(r.key)} aria-pressed={activeRegion===r.key} className="np-press" style={S.chip(activeRegion===r.key)}>{r.label} <span style={{opacity:.6}}>({cnt}/{total})</span></button>;
              })}
            </div>
          </div>

          {/* Friendly first-run empty state */}
          {totalChecked===0&&(
            <div style={{maxWidth:700,margin:"14px auto 0",padding:"0 16px",width:"100%",boxSizing:"border-box"}}>
              <div style={{background:T.cardBgAlt,border:`1px dashed ${T.cardBorderActive}`,borderRadius:12,padding:"16px 16px 14px",textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:4,animation:"np-bob 2.4s ease-in-out infinite"}}>🌲</div>
                <div style={{fontSize:15,color:T.accentText,marginBottom:4}}>{tx.welcomeTitleList}</div>
                <div style={{fontSize:13,color:T.textSecondary,lineHeight:1.6,marginBottom:10}}>{tx.welcomeListBody}</div>
                <button onClick={pickRandom} className="np-press" style={{minHeight:40,padding:"9px 18px",borderRadius:20,fontSize:13,cursor:"pointer",fontFamily:"inherit",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,color:T.accentText}}>🎲 {tx.randomBtn}</button>
              </div>
            </div>
          )}

          {/* Backup reminder */}
          {showBackupNudge&&(
            <div style={{maxWidth:700,margin:"12px auto 0",padding:"0 16px",width:"100%",boxSizing:"border-box"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:10,padding:"10px 12px"}}>
                <span style={{fontSize:18}}>💾</span>
                <span style={{flex:1,minWidth:160,fontSize:13,color:T.textSecondary,lineHeight:1.5}}>{tx.backupNudge}</span>
                <button onClick={handleExport} className="np-press" style={{minHeight:36,padding:"8px 14px",borderRadius:16,fontSize:13,cursor:"pointer",fontFamily:"inherit",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,color:T.accentText}}>{tx.backupNow}</button>
                <button onClick={snoozeBackup} className="np-press" style={{minHeight:36,padding:"8px 10px",borderRadius:16,fontSize:13,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:"none",color:T.mutedText}}>{tx.later}</button>
              </div>
            </div>
          )}

          <div style={{maxWidth:700,margin:"0 auto",padding:"0 16px 80px",width:"100%",boxSizing:"border-box"}}>
            {(search||statusFilter!=="all"||activeRegion!=="all")&&filteredParks.length>0&&<div style={{fontSize:12,color:T.mutedText,padding:"10px 2px 6px"}}>{tx.resultCount(filteredParks.length,parks.length)}</div>}
            {filteredParks.length===0&&<div style={{textAlign:"center",padding:"40px 16px",color:T.mutedText,fontSize:14}}>
              <div style={{fontSize:28,marginBottom:6}}>🧭</div>{tx.notFound}
              <div style={{marginTop:12}}><button onClick={()=>{setSearch("");setStatusFilter("all");setActiveRegion("all");}} className="np-press" style={{minHeight:40,padding:"8px 16px",borderRadius:16,fontSize:13,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:`1px solid ${T.cardBorder}`,color:T.accentText}}>{tx.clearSearch} / {tx.all}</button></div>
            </div>}
            <div style={{display:"flex",flexDirection:"column",gap:1,paddingTop:(search||statusFilter!=="all"||activeRegion!=="all")?0:10}}>
              {filteredParks.map((park,idx)=>{
                const isCheckedP=checked[park.id], visitCount=visits[park.id]?.length??0;
                const latestVisit=visitCount>0?[...(visits[park.id])].sort((a,b)=>b.date.localeCompare(a.date))[0]:null;
                const latestDate=latestVisit?.date;
                return (
                  <div key={park.id} ref={el=>parkRefs.current[park.id]=el}
                    style={{position:"relative",background:isCheckedP?T.cardBgAlt:T.cardBg,borderLeft:`3px solid ${isCheckedP?T.cardBorderActive:T.cardBorder}`,borderRadius:2,opacity:isCheckedP?.85:1,"--np-o":isCheckedP?.85:1,animation:`np-rise .38s ease ${Math.min(idx*18,340)}ms backwards`}}>
                    {flashId===park.id&&<div aria-hidden="true" style={{position:"absolute",inset:0,borderRadius:3,pointerEvents:"none",animation:"np-flash 1.2s ease 2"}}/>}
                    <div onClick={()=>setDateModalPark(park)} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px 6px 4px",cursor:"pointer"}}>
                      <button onClick={e=>{e.stopPropagation();toggleCheck(park);}} role="checkbox" aria-checked={!!isCheckedP} aria-label={isJa?park.ja:park.name}
                        style={{width:44,height:44,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"transparent",border:"none",cursor:"pointer",padding:0}}>
                        <span style={{width:24,height:24,border:`2px solid ${isCheckedP?T.cardBorderActive:T.mutedText}`,borderRadius:6,background:isCheckedP?T.btnBgActive:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:T.accentText,animation:popId===park.id?"np-pop .5s ease":"none",transition:"background .2s,border-color .2s"}}>
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

      {/* Back to top */}
      {showTop&&tab==="list"&&!toast&&(
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label={tx.scrollTop} className="np-press"
          style={{position:"fixed",right:12,bottom:"calc(58px + env(safe-area-inset-bottom))",width:44,height:44,borderRadius:22,background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,color:T.accentText,fontSize:18,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,.45)",animation:"np-fade .2s ease both",zIndex:50,fontFamily:"inherit"}}>↑</button>
      )}

      {/* Celebration layers */}
      <ConfettiLayer burst={burst} colors={[T.accentText,T.pinVisited,T.cardBorderActive,"#f5c542","#ff8a5c","#6fd3ff"]}/>
      {achievements.length>0&&(
        <div key={achievements[0].id} role="status" aria-live="polite"
          style={{position:"fixed",top:"calc(12px + env(safe-area-inset-top))",left:"50%",width:"min(92vw,380px)",zIndex:3600,pointerEvents:"none",animation:"np-banner 3.4s ease both"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:14,padding:"12px 16px",boxShadow:`0 10px 30px rgba(0,0,0,.55), 0 0 22px ${T.cardBorderActive}66`}}>
            <span style={{fontSize:34,lineHeight:1}}>{achievements[0].icon}</span>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:15,color:T.accentText,fontWeight:600}}>{achievements[0].title}</div>
              <div style={{fontSize:13,color:T.textPrimary,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{achievements[0].sub}</div>
            </div>
            {achievements.length>1&&<span style={{fontSize:12,color:T.mutedText}}>+{achievements.length-1}</span>}
          </div>
        </div>
      )}

      {/* Toast: "recorded" / "unchecked" / info, with up to two actions */}
      {toast&&(
        <div key={toast.id} role="status" aria-live="polite"
          style={{position:"fixed",left:12,right:12,bottom:"calc(12px + env(safe-area-inset-bottom))",maxWidth:500,margin:"0 auto",zIndex:3500,animation:"np-fade .25s ease both",background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:14,padding:"8px 6px 8px 12px",display:"flex",alignItems:"center",gap:8,boxShadow:"0 8px 28px rgba(0,0,0,.55)",fontSize:13,color:T.textPrimary}}>
          <span style={{fontSize:16,flexShrink:0}}>{toast.icon}</span>
          <span style={{flex:1,minWidth:0,lineHeight:1.4}}>{toast.text}</span>
          {toast.actionLabel&&(
            <button onClick={toast.onAction} className="np-press"
              style={{flexShrink:0,minHeight:36,padding:"6px 10px",borderRadius:10,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,color:T.accentText,whiteSpace:"nowrap"}}>{toast.actionLabel}</button>
          )}
          {toast.secondaryLabel&&(
            <button onClick={toast.onSecondary} className="np-press"
              style={{flexShrink:0,minHeight:36,padding:"6px 10px",borderRadius:10,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:`1px solid ${T.cardBorder}`,color:T.mutedText,whiteSpace:"nowrap"}}>{toast.secondaryLabel}</button>
          )}
          {!toast.secondaryLabel&&(
            <button onClick={closeToast} aria-label={isJa?"閉じる":"Close"}
              style={{flexShrink:0,width:32,height:32,borderRadius:16,border:"none",background:"transparent",color:T.mutedText,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
          )}
        </div>
      )}

      {/* Modals */}
      {showHelp&&<HelpModal tx={tx} themeColors={T} firstRun={firstRunHelp} onClose={closeHelp}/>}
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
                    <div style={{fontSize:14,color:siteTheme===key?T.accentText:T.textPrimary}}>{isJa?theme.nameJa:theme.name}</div>
                  </div>
                  {siteTheme===key&&<span style={{color:T.accentText,fontSize:16}}>✓</span>}
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

import { useState, useEffect, useMemo, useRef } from "./react.js";
import { REGION_ORDER, parks } from "./data/parks";
import { THEMES } from "./data/themes";
import { BADGES, computeEarnedBadges, computeQuestProgress, computeTagBadges } from "./data/achievements";
import { i18n } from "./i18n";
import { formatDate, today, uid } from "./utils";
import { SVGMap } from "./components/SVGMap";
import { TimelineView } from "./components/TimelineView";
import { AwardsView } from "./components/AwardsView";
import { ConfirmDialog } from "./components/Dialogs";
import { ParkSheet } from "./components/ParkSheet";
import { MenuSheet } from "./components/MenuSheet";
import { BottomNav, NAV_H, ProgressHero } from "./components/Chrome";
import { ShareCardModal } from "./components/ShareCardModal";
import { BACKUP_KEY, LANG_KEY, ONBOARD_KEY, SNOOZE_KEY, THEME_KEY, exportStoreToFile, initStore, parseImportedFile, saveData } from "./storage";
import { APP_CSS, ConfettiLayer, HelpModal, useCountUp, vibrate } from "./components/Delight";

const MILESTONES = [5, 10, 15, 20, 30, 40, 50, parks.length];

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
  const [selectedPark,  setSelectedPark]  = useState(null);
  const [sheetPark, setSheetPark] = useState(null);
  const [hoveredMapId,  setHoveredMapId]  = useState(null);
  const [showMenu,  setShowMenu]  = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
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
  const stateCounts = useMemo(() => {
    const all = new Set(), seen = new Set();
    parks.forEach(p => p.state.split(" / ").forEach(st => { all.add(st); if (checked[p.id]) seen.add(st); }));
    return { seen: seen.size, all: all.size };
  }, [checked]);
  const badgeEarnedCount = earnedBadges.length + earnedTagBadges.length;
  const questDoneCount = questProgress.filter(q => q.complete).length;
  const openPark = (park) => setSheetPark(park);
  const showOnMap = (park) => { setSheetPark(null); setTab("map"); setSelectedPark(park); window.scrollTo({top:0}); };
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
  const updateVisit=(id,oldDate,newDate,note)=>setVisits(prev=>{
    const list=prev[id]??[];
    const clash=newDate!==oldDate&&list.some(v=>v.date===newDate);
    return {...prev,[id]:list.map(v=>v.date===oldDate?{...v,date:clash?oldDate:newDate,note}:v)};
  });

  const restoreVisits=(profileId,parkId,list)=>setStore(prev=>({...prev,profiles:prev.profiles.map(p=>p.id===profileId?{...p,visits:{...p.visits,[parkId]:list}}:p)}));

  const toggleCheck=(park, ev)=>{
    const r = ev?.currentTarget?.getBoundingClientRect?.();
    const origin = r ? { x: r.left + r.width/2, y: r.top + r.height/2 } : {};
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
      setBurst({ key: uid(), big, ...origin });
      vibrate(big ? [30, 40, 70] : 18);
      if (big) setAchievements(a => [...a, ...gains.map(g => ({ ...g, id: uid() }))]);
      setPopId(park.id);
      setTimeout(() => setPopId(c => (c === park.id ? null : c)), 650);
      showToast({
        icon:"✅", text: tx.recorded(parkName, entry.date.slice(5).split("-").map(Number).join("/"), newTotal, parks.length),
        actionLabel: tx.changeDate, onAction: () => { setSheetPark(park); closeToast(); },
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
            setShowMenu(false);
          },
        });
      } catch {
        setConfirm({ message: tx.importError, onConfirm: () => setConfirm(null) });
      }
    };
    reader.readAsText(file);
  };

  const changeTab = (key) => { setTab(key); setShowSortMenu(false); window.scrollTo({top:0}); };
  const S={
    chip:(active)=>({minHeight:36,padding:"6px 13px",borderRadius:18,fontSize:13,flexShrink:0,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"inherit",background:active?T.chipBgActive:"transparent",border:`1px solid ${active?T.chipBorderActive:T.cardBorder}`,color:active?T.chipTextActive:T.chipText}),
    icon:{width:42,height:42,borderRadius:21,display:"flex",alignItems:"center",justifyContent:"center",background:"transparent",border:`1px solid ${T.headerBorder}`,color:T.textSecondary,fontSize:18,cursor:"pointer",fontFamily:"inherit",flexShrink:0},
    page:{maxWidth:700,margin:"0 auto",width:"100%",boxSizing:"border-box"},
  };
  const filtering = search||statusFilter!=="all"||activeRegion!=="all";
  const navBottom = (extra) => `calc(${NAV_H + extra}px + env(safe-area-inset-bottom))`;

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:isJa?"'Hiragino Sans','Noto Sans JP',sans-serif":T.fontBody,color:T.textPrimary,colorScheme:T.scheme,display:"flex",flexDirection:"column",
      paddingBottom:navBottom(16),transition:"background .3s ease","--np-glow":T.cardBorderActive,"--np-press":T.inputBg}}>
      <style>{APP_CSS}</style>

      {/* ── APP BAR ── */}
      <header style={{background:T.headerBg,borderBottom:`1px solid ${T.headerBorder}`,padding:"calc(10px + env(safe-area-inset-top)) 16px 12px"}}>
        <div style={{...S.page,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,letterSpacing:"0.28em",color:T.mutedText,textTransform:"uppercase"}}>{tx.country}</div>
            <h1 style={{margin:"2px 0 0",fontSize:20,fontWeight:400,color:T.textPrimary,lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.title}</h1>
            <button onClick={()=>setShowMenu(true)} style={{marginTop:2,padding:0,background:"transparent",border:"none",color:T.textSecondary,fontSize:12,cursor:"pointer",fontFamily:"inherit",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>👤 {activeProfile.name} ▾</button>
          </div>
          {totalChecked>0&&<button onClick={()=>setShowShareCard(true)} aria-label={isJa?"シェア":"Share"} className="np-press" style={S.icon}>📤</button>}
          <button onClick={()=>setShowMenu(true)} aria-label={tx.menu} className="np-press" style={{...S.icon,fontSize:20,color:T.accentText}}>☰</button>
        </div>
      </header>

      {/* ── LIST TAB ── */}
      {tab==="list"&&(
        <main className="np-tab" style={{flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{...S.page,padding:"14px 16px 4px"}}>
            <ProgressHero T={T} tx={tx} shown={shownTotal} total={parks.length} progress={progress} hint={progressHint}
              stats={[{icon:"🏳️",value:`${stateCounts.seen}/${stateCounts.all}`,label:tx.statesShort},{icon:"🏅",value:badgeEarnedCount,label:tx.badgesShort},{icon:"🗺",value:questDoneCount,label:tx.questsShort}]}
              onOpen={()=>changeTab("awards")}/>
          </div>

          {/* Sticky search + filters */}
          <div style={{position:"sticky",top:0,zIndex:5,background:T.bg,paddingTop:"env(safe-area-inset-top)",borderBottom:`1px solid ${T.cardBorder}`,boxShadow:"0 8px 14px -12px rgba(0,0,0,.6)"}}>
            <div style={{...S.page,padding:"10px 16px 0",display:"flex",gap:8}}>
              <div style={{position:"relative",flex:1,minWidth:0}}>
                <input type="text" enterKeyHint="search" aria-label={tx.search} placeholder={`🔍 ${tx.search}`} value={search} onChange={e=>setSearch(e.target.value)}
                  style={{width:"100%",height:44,padding:"0 38px 0 14px",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:12,color:T.textPrimary,fontSize:16,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                {search&&(
                  <button onClick={()=>setSearch("")} aria-label={tx.clearSearch}
                    style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",width:32,height:32,borderRadius:16,border:"none",background:T.cardBg,color:T.mutedText,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                )}
              </div>
              <button onClick={pickRandom} aria-label={tx.randomBtn} title={tx.randomBtn} className="np-press"
                style={{width:44,height:44,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:12,fontSize:20,cursor:"pointer",flexShrink:0}}>🎲</button>
              <div style={{position:"relative",flexShrink:0}}>
                <button onClick={()=>setShowSortMenu(s=>!s)} aria-label={tx.sortBy} aria-expanded={showSortMenu} className="np-press"
                  style={{width:44,height:44,background:sortMode!=="az"?T.btnBgActive:T.inputBg,border:`1px solid ${sortMode!=="az"?T.btnBorderActive:T.inputBorder}`,borderRadius:12,color:sortMode!=="az"?T.accentText:T.mutedText,fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>⇅</button>
                {showSortMenu&&(
                  <div className="np-tab" style={{position:"absolute",top:"110%",right:0,background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:12,padding:6,zIndex:10,minWidth:190,boxShadow:"0 8px 24px rgba(0,0,0,.45)"}}>
                    <div style={{fontSize:11,color:T.mutedText,padding:"6px 10px 4px"}}>{tx.sortBy}</div>
                    {[["az",tx.sortAZ],["dateDesc",tx.sortDateDesc],["dateAsc",tx.sortDateAsc],["unvisited",tx.sortUnvisited]].map(([key,label])=>(
                      <button key={key} onClick={()=>{setSortMode(key);setShowSortMenu(false);}} style={{display:"block",width:"100%",textAlign:"left",border:"none",
                        padding:"12px 12px",borderRadius:8,fontSize:15,cursor:"pointer",fontFamily:"inherit",
                        background:sortMode===key?T.btnBgActive:"transparent",color:sortMode===key?T.accentText:T.textPrimary}}>{sortMode===key?"✓ ":""}{label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="np-noscroll" role="group" aria-label={tx.statusFilter} style={{...S.page,padding:"10px 16px",display:"flex",gap:6,overflowX:"auto",flexWrap:"nowrap",alignItems:"center"}}>
              {[["all",tx.filterAll,parks.length],["unvisited",tx.filterUnvisited,parks.length-totalChecked],["visited",tx.filterVisited,totalChecked]].map(([key,label,cnt])=>(
                <button key={key} onClick={()=>setStatusFilter(key)} aria-pressed={statusFilter===key} className="np-press" style={S.chip(statusFilter===key)}>{label} <span style={{opacity:.65}}>{cnt}</span></button>
              ))}
              <span aria-hidden="true" style={{width:1,alignSelf:"stretch",background:T.cardBorder,flexShrink:0,margin:"4px 2px"}}/>
              {[{key:"all",label:tx.allRegions},...regions].map(r=>{
                const cnt=r.key==="all"?totalChecked:regionCount(r.key);
                const total=r.key==="all"?parks.length:parks.filter(p=>p.region===r.key).length;
                return <button key={r.key} onClick={()=>setActiveRegion(r.key)} aria-pressed={activeRegion===r.key} className="np-press" style={S.chip(activeRegion===r.key)}>{r.label} <span style={{opacity:.65}}>{cnt}/{total}</span></button>;
              })}
            </div>
          </div>

          {/* First-run nudge */}
          {totalChecked===0&&(
            <div style={{...S.page,padding:"12px 16px 0"}}>
              <div style={{background:T.cardBgAlt,border:`1px dashed ${T.cardBorderActive}`,borderRadius:14,padding:"16px",textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:4,animation:"np-bob 2.4s ease-in-out infinite"}}>🌲</div>
                <div style={{fontSize:16,color:T.accentText,marginBottom:4}}>{tx.welcomeTitleList}</div>
                <div style={{fontSize:13,color:T.textSecondary,lineHeight:1.6,marginBottom:10}}>{tx.welcomeListBody}</div>
                <button onClick={pickRandom} className="np-press" style={{minHeight:44,padding:"10px 20px",borderRadius:22,fontSize:14,cursor:"pointer",fontFamily:"inherit",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,color:T.accentText}}>🎲 {tx.randomBtn}</button>
              </div>
            </div>
          )}

          {/* Backup reminder */}
          {showBackupNudge&&(
            <div style={{...S.page,padding:"12px 16px 0"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:14,padding:"12px 14px"}}>
                <span style={{fontSize:20}}>💾</span>
                <span style={{flex:1,minWidth:170,fontSize:13,color:T.textSecondary,lineHeight:1.5}}>{tx.backupNudge}</span>
                <button onClick={handleExport} className="np-press" style={{minHeight:40,padding:"8px 14px",borderRadius:20,fontSize:13,cursor:"pointer",fontFamily:"inherit",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,color:T.accentText}}>{tx.backupNow}</button>
                <button onClick={snoozeBackup} style={{minHeight:40,padding:"8px 10px",borderRadius:20,fontSize:13,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:"none",color:T.mutedText}}>{tx.later}</button>
              </div>
            </div>
          )}

          {/* Park list */}
          <div style={{...S.page,padding:"6px 12px 8px"}}>
            {filtering&&filteredParks.length>0&&<div style={{fontSize:12,color:T.mutedText,padding:"6px 6px 2px"}}>{tx.resultCount(filteredParks.length,parks.length)}</div>}
            {filteredParks.length===0&&(
              <div style={{textAlign:"center",padding:"40px 16px",color:T.mutedText,fontSize:14}}>
                <div style={{fontSize:30,marginBottom:6}}>🧭</div>{tx.notFound}
                <div style={{marginTop:12}}><button onClick={()=>{setSearch("");setStatusFilter("all");setActiveRegion("all");}} className="np-press" style={{minHeight:44,padding:"8px 18px",borderRadius:22,fontSize:14,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:`1px solid ${T.cardBorder}`,color:T.accentText}}>{tx.clearSearch} / {tx.all}</button></div>
              </div>
            )}
            <div key={`${statusFilter}|${activeRegion}|${sortMode}`} className="np-tab" role="list" style={{display:"flex",flexDirection:"column",gap:6,paddingTop:6}}>
              {filteredParks.map(park=>{
                const isCheckedP=!!checked[park.id], visitCount=visits[park.id]?.length??0;
                const latestVisit=visitCount>0?[...(visits[park.id])].sort((a,b)=>b.date.localeCompare(a.date))[0]:null;
                return (
                  <div key={park.id} role="listitem" ref={el=>parkRefs.current[park.id]=el} className="np-row" onClick={()=>openPark(park)}
                    style={{position:"relative",display:"flex",alignItems:"center",gap:6,padding:"4px 10px 4px 2px",minHeight:64,cursor:"pointer",borderRadius:14,
                      background:isCheckedP?T.cardBgAlt:T.cardBg,border:`1px solid ${isCheckedP?T.cardBorderActive:T.cardBorder}`}}>
                    {flashId===park.id&&<div aria-hidden="true" style={{position:"absolute",inset:0,borderRadius:14,pointerEvents:"none",animation:"np-flash 1.2s ease 2"}}/>}
                    <button onClick={e=>{e.stopPropagation();toggleCheck(park,e);}} role="checkbox" aria-checked={isCheckedP} aria-label={isJa?park.ja:park.name}
                      style={{width:48,height:52,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"transparent",border:"none",cursor:"pointer",padding:0}}>
                      <span style={{width:26,height:26,border:`2px solid ${isCheckedP?T.btnBorderActive:T.mutedText}`,borderRadius:8,background:isCheckedP?T.btnBgActive:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:T.accentText,
                        animation:popId===park.id?"np-pop .5s ease":"none",transition:"background .2s,border-color .2s"}}>{isCheckedP&&"✓"}</span>
                    </button>
                    <span style={{fontSize:24,flexShrink:0,width:30,textAlign:"center"}}>{park.emoji}</span>
                    <div style={{flex:1,minWidth:0,paddingLeft:4}}>
                      <div style={{fontSize:16,color:isCheckedP?T.accentText:T.textPrimary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{isJa?park.ja:park.name}</div>
                      <div style={{fontSize:12,color:T.mutedText,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {latestVisit
                          ? <>📅 {formatDate(latestVisit.date,isJa)}{visitCount>1&&<span style={{color:T.accentText}}> ×{visitCount}</span>} · {isJa?park.stateJa:park.state}</>
                          : <>{isJa?park.name:park.ja} · {isJa?park.stateJa:park.state}</>}
                      </div>
                      {latestVisit?.note&&<div style={{fontSize:12,color:T.textSecondary,marginTop:2,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>💬 {latestVisit.note}</div>}
                    </div>
                    <span aria-hidden="true" style={{fontSize:20,color:T.mutedText,flexShrink:0}}>›</span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* ── MAP TAB ── */}
      {tab==="map"&&(
        <main className="np-tab" style={{flex:1,display:"flex",flexDirection:"column",paddingTop:10}}>
          <div style={{padding:"0 16px 6px",fontSize:12,color:T.mutedText,textAlign:"center"}}>{tx.mapHint}</div>
          <SVGMap parks={parks} checked={checked} visits={visits} isJa={isJa} selectedId={selectedPark?.id} onParkClick={p=>setSelectedPark(s=>s?.id===p.id?null:p)} hoveredId={hoveredMapId} setHoveredId={setHoveredMapId} themeColors={T}>
          {selectedPark&&(
            <div key={selectedPark.id} className="np-tab" style={{margin:"0",background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:16,padding:"14px 14px 12px",boxShadow:"0 6px 20px rgba(0,0,0,.3)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:30}}>{selectedPark.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:17,color:T.textPrimary}}>{isJa?selectedPark.ja:selectedPark.name}</div>
                  <div style={{fontSize:12,color:T.mutedText,marginTop:2}}>{isJa?selectedPark.stateJa:selectedPark.state}{checked[selectedPark.id]&&<span style={{color:T.accentText}}> · ✓ {tx.visits(visits[selectedPark.id].length)}</span>}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:12}}>
                {!checked[selectedPark.id]&&(
                  <button onClick={(e)=>toggleCheck(selectedPark,e)} className="np-press" style={{flex:1,minHeight:44,borderRadius:12,fontSize:14,cursor:"pointer",fontFamily:"inherit",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,color:T.accentText}}>✓ {tx.checkIn}</button>
                )}
                <button onClick={()=>openPark(selectedPark)} className="np-press" style={{flex:1,minHeight:44,borderRadius:12,fontSize:14,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:`1px solid ${T.cardBorderActive}`,color:T.accentText}}>{tx.details} ›</button>
              </div>
            </div>
          )}
          </SVGMap>
        </main>
      )}

      {/* ── JOURNAL TAB ── */}
      {tab==="timeline"&&(
        <main className="np-tab"><TimelineView parks={parks} visits={visits} isJa={isJa} themeColors={T} onParkClick={openPark}/></main>
      )}

      {/* ── AWARDS TAB ── */}
      {tab==="awards"&&(
        <main className="np-tab">
          <AwardsView T={T} tx={tx} isJa={isJa} visits={visits} checked={checked} earnedIds={earnedBadges} earnedTagIds={earnedTagBadges} questProgress={questProgress} onParkClick={openPark}/>
        </main>
      )}

      {/* Back to top */}
      {showTop&&tab==="list"&&!toast&&(
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label={tx.scrollTop} className="np-press"
          style={{position:"fixed",right:14,bottom:navBottom(14),width:46,height:46,borderRadius:23,background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,color:T.accentText,fontSize:18,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,.45)",animation:"np-fade .2s ease both",zIndex:50,fontFamily:"inherit"}}>↑</button>
      )}

      {/* Celebration layers */}
      <ConfettiLayer burst={burst} colors={[T.accentText,T.pinVisited,T.cardBorderActive,"#f5c542","#ff8a5c","#6fd3ff"]}/>
      {achievements.length>0&&(
        <div key={achievements[0].id} role="status" aria-live="polite"
          style={{position:"fixed",top:"calc(12px + env(safe-area-inset-top))",left:"50%",width:"min(92vw,380px)",zIndex:3600,pointerEvents:"none",animation:"np-banner 3.4s ease both"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:16,padding:"12px 16px",boxShadow:`0 10px 30px rgba(0,0,0,.55), 0 0 22px ${T.cardBorderActive}66`}}>
            <span style={{fontSize:36,lineHeight:1,animation:"np-pop .6s ease"}}>{achievements[0].icon}</span>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:15,color:T.accentText,fontWeight:600}}>{achievements[0].title}</div>
              <div style={{fontSize:13,color:T.textPrimary,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{achievements[0].sub}</div>
            </div>
            {achievements.length>1&&<span style={{fontSize:12,color:T.mutedText}}>+{achievements.length-1}</span>}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast&&(
        <div key={toast.id} role="status" aria-live="polite"
          style={{position:"fixed",left:12,right:12,bottom:navBottom(10),maxWidth:520,margin:"0 auto",zIndex:1000,animation:"np-pagein .25s ease both",background:T.cardBgAlt,border:`1px solid ${T.cardBorderActive}`,borderRadius:16,padding:"8px 6px 8px 12px",display:"flex",alignItems:"center",gap:8,boxShadow:"0 8px 28px rgba(0,0,0,.55)",fontSize:13,color:T.textPrimary}}>
          <span style={{fontSize:16,flexShrink:0}}>{toast.icon}</span>
          <span style={{flex:1,minWidth:0,lineHeight:1.4}}>{toast.text}</span>
          {toast.actionLabel&&(
            <button onClick={toast.onAction} className="np-press"
              style={{flexShrink:0,minHeight:38,padding:"6px 10px",borderRadius:12,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,color:T.accentText,whiteSpace:"nowrap"}}>{toast.actionLabel}</button>
          )}
          {toast.secondaryLabel&&(
            <button onClick={toast.onSecondary} className="np-press"
              style={{flexShrink:0,minHeight:38,padding:"6px 10px",borderRadius:12,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:"transparent",border:`1px solid ${T.cardBorder}`,color:T.mutedText,whiteSpace:"nowrap"}}>{toast.secondaryLabel}</button>
          )}
          {!toast.secondaryLabel&&(
            <button onClick={closeToast} aria-label={isJa?"閉じる":"Close"}
              style={{flexShrink:0,width:36,height:36,borderRadius:18,border:"none",background:"transparent",color:T.mutedText,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
          )}
        </div>
      )}

      {/* Bottom navigation */}
      <BottomNav T={T} active={tab} onChange={changeTab} items={[
        {key:"list",icon:"📋",label:tx.listTab},
        {key:"map",icon:"🗺",label:tx.mapTab},
        {key:"timeline",icon:"📖",label:tx.timelineTab},
        {key:"awards",icon:"🏅",label:tx.awardsTab},
      ]}/>

      {/* Sheets & dialogs */}
      {showHelp&&<HelpModal tx={tx} themeColors={T} firstRun={firstRunHelp} onClose={closeHelp}/>}
      {sheetPark&&<ParkSheet key={sheetPark.id} T={T} tx={tx} isJa={isJa} park={sheetPark} dates={visits[sheetPark.id]??[]} visited={!!checked[sheetPark.id]}
        onToggle={toggleCheck} onAdd={(date,note)=>addVisit(sheetPark.id,date,note)} onDelete={date=>removeVisit(sheetPark.id,date)}
        onUpdate={(oldDate,newDate,note)=>updateVisit(sheetPark.id,oldDate,newDate,note)} onShowMap={showOnMap} onClose={()=>setSheetPark(null)}/>}
      {showMenu&&<MenuSheet T={T} tx={tx} isJa={isJa} profiles={store.profiles} activeId={store.activeId} siteTheme={siteTheme} lang={lang}
        onSwitch={switchProfile} onCreate={createProfile} onRename={renameProfile} onDelete={deleteProfile}
        onTheme={setSiteTheme} onLang={setLang} onHelp={()=>{setShowMenu(false);setShowHelp(true);}}
        onExport={handleExport} onImport={handleImport} onReset={totalChecked>0?()=>{setShowMenu(false);resetAll();}:null} onClose={()=>setShowMenu(false)}/>}
      {showShareCard&&<ShareCardModal T={T} profile={activeProfile} visits={visits} checked={checked} isJa={isJa} tx={tx} earnedBadgeIds={earnedBadges} earnedTagIds={earnedTagBadges} questProgress={questProgress} onClose={()=>setShowShareCard(false)}/>}
      {confirm&&<ConfirmDialog T={T} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} tx={tx}/>}
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from "../react.js";
import { REGION_ORDER, parks } from "../data/parks";
import { BADGES, TAG_BADGES, computeTripStreaks } from "../data/achievements";
import { today } from "../utils";
import { MAP_H, MAP_W, US_OUTLINE, project } from "./mapData";

// ── Share Card (Canvas-generated shareable image) ──────────────────
export function ShareCardModal({ T, profile, visits, checked, isJa, tx, onClose, earnedBadgeIds=[], earnedTagIds=[], questProgress=[] }) {
  const canvasRef = useRef(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [theme, setTheme] = useState("passport"); // passport | topo | retro

  const totalChecked = Object.values(checked).filter(Boolean).length;

  // Recent 4 visited parks by latest visit date (for 2×2 grid)
  const recentParks = useMemo(() => {
    const withDates = parks
      .filter(p => (visits[p.id]?.length ?? 0) > 0)
      .map(p => ({ park: p, latest: [...visits[p.id]].map(v=>v.date).sort().reverse()[0] }))
      .sort((a, b) => b.latest.localeCompare(a.latest));
    return withDates.slice(0, 4);
  }, [visits]);

  // Region-by-region stats
  const regionStats = useMemo(() => {
    return REGION_ORDER.map(key => {
      const total = parks.filter(p => p.region === key).length;
      const done  = parks.filter(p => p.region === key && checked[p.id]).length;
      const sample = parks.find(p => p.region === key);
      return { key, label: isJa ? sample.regionJa : key, done, total };
    });
  }, [checked, isJa]);

  // Longest trip streak (for streak badge on share card)
  const longestStreak = useMemo(() => computeTripStreaks(visits).longest, [visits]);

  // Earned badge icons (all badges + tag badges combined, capped for display)
  const earnedBadgeIcons = useMemo(() => {
    const fromBadges = BADGES.filter(b => earnedBadgeIds.includes(b.id)).map(b => b.icon);
    const fromTags   = TAG_BADGES.filter(b => earnedTagIds.includes(b.id)).map(b => b.icon);
    return [...fromBadges, ...fromTags];
  }, [earnedBadgeIds, earnedTagIds]);
  const totalBadgeCount = BADGES.length + TAG_BADGES.length;
  const completedQuestCount = questProgress.filter(q => q.complete).length;

  // Randomly pick 2–3 earned badge/quest titles to show as "earned titles" —
  // gives the card a game-like sense of accomplishment beyond just icons.
  const titleBadges = useMemo(() => {
    const fromBadges = BADGES.filter(b => earnedBadgeIds.includes(b.id)).map(b => ({ icon: b.icon, name: isJa ? b.nameJa : b.name }));
    const fromTags   = TAG_BADGES.filter(b => earnedTagIds.includes(b.id)).map(b => ({ icon: b.icon, name: isJa ? b.nameJa : b.name }));
    const fromQuests = questProgress.filter(q => q.complete).map(q => ({ icon: q.icon, name: isJa ? q.nameJa : q.name }));
    const pool = [...fromBadges, ...fromTags, ...fromQuests];
    if (pool.length === 0) return [];
    // shuffle (Fisher–Yates) then take up to 3
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(3, shuffled.length));
  }, [earnedBadgeIds, earnedTagIds, questProgress, isJa]);

  // Next goal hint: the closest not-yet-complete quest, or (if none in progress)
  // the next visit-count milestone badge — fills the empty space below the
  // badge/quest showcase with something actionable to chase next.
  const nextGoal = useMemo(() => {
    const inProgress = questProgress.filter(q => !q.complete && q.done > 0)
      .sort((a,b) => (b.done/b.total) - (a.done/a.total));
    if (inProgress.length > 0) {
      const q = inProgress[0];
      return { icon: q.icon, name: isJa ? q.nameJa : q.name, done: q.done, total: q.total };
    }
    const notStarted = questProgress.find(q => !q.complete);
    if (notStarted) {
      return { icon: notStarted.icon, name: isJa ? notStarted.nameJa : notStarted.name, done: notStarted.done, total: notStarted.total };
    }
    const milestones = [
      { id: "five_parks", threshold: 5 },
      { id: "fifteen_parks", threshold: 15 },
      { id: "thirty_parks", threshold: 30 },
      { id: "all_parks", threshold: 63 },
    ];
    const nextMilestone = milestones.find(m => totalChecked < m.threshold && !earnedBadgeIds.includes(m.id));
    if (nextMilestone) {
      const badge = BADGES.find(b => b.id === nextMilestone.id);
      return { icon: badge.icon, name: isJa ? badge.nameJa : badge.name, done: totalChecked, total: nextMilestone.threshold };
    }
    return null;
  }, [questProgress, totalChecked, earnedBadgeIds, isJa]);

  // Catchphrase pools, tiered by achievement level — random pick per generation
  const catchphrases = useMemo(() => {
    const n = totalChecked;
    let pool;
    if (n === 0) {
      pool = isJa
        ? ["まだ旅は始まっていない", "次の一歩を待っている", "白紙の地図、無限の可能性"]
        : ["The adventure awaits", "Blank map, endless possibility", "Not yet begun"];
    } else if (n < 5) {
      pool = isJa
        ? ["旅の始まり", "駆け出しの探検家", "最初の一歩を刻んだ", "小さな冒険家"]
        : ["Just getting started", "Rookie explorer", "First steps taken", "Trail beginner"];
    } else if (n < 15) {
      pool = isJa
        ? ["駆け出しのパークレンジャー", "冒険心に火がついた", "地図を塗り始めた旅人", "週末ワンダラー"]
        : ["Weekend Wanderer", "Trail Blazer in training", "Getting the itch", "Map filling in"];
    } else if (n < 30) {
      pool = isJa
        ? ["本格派アウトドア派", "国立公園ハンター", "自然に呼ばれる者", "旅の中盤戦"]
        : ["Seasoned Trailhead Hunter", "Park Chaser", "Called by the wild", "Halfway there"];
    } else if (n < 45) {
      pool = isJa
        ? ["ベテラン国立公園マスター", "地図の大半を制覇", "自然と共に生きる者", "本物の探検家"]
        : ["Park Veteran", "Nature's Regular", "Seasoned Adventurer", "Trail Master"];
    } else if (n < 63) {
      pool = isJa
        ? ["伝説のパークマスター", "残すはあと少し", "国立公園の生き字引", "頂点を目指す者"]
        : ["Legendary Park Master", "So close to it all", "Almost Everywhere", "Elite Explorer"];
    } else {
      pool = isJa
        ? ["全63公園制覇！殿堂入り", "アメリカ国立公園グランドマスター", "伝説となった旅人"]
        : ["ALL 63 PARKS — Hall of Fame", "National Parks Grand Master", "The Complete Journey"];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }, [totalChecked, isJa]);

  // ── Shared helper: rounded rect ──
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  function fmtDate(iso) {
    const d = new Date(iso + "T12:00:00");
    return isJa
      ? `${d.getMonth()+1}/${d.getDate()}`
      : d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  }

  // ── Shared: generation timestamp (clear pill, bottom of card) ──
  const generatedAt = useMemo(() => new Date(), []);
  function drawTimestamp(ctx, cx, y, borderColor, bgColor, textColor, fontFamily) {
    const stamp = isJa
      ? `📅 ${tx.generatedOn}: ${generatedAt.getFullYear()}/${generatedAt.getMonth()+1}/${generatedAt.getDate()} ${String(generatedAt.getHours()).padStart(2,"0")}:${String(generatedAt.getMinutes()).padStart(2,"0")}`
      : `📅 ${tx.generatedOn}: ${generatedAt.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})} ${String(generatedAt.getHours()).padStart(2,"0")}:${String(generatedAt.getMinutes()).padStart(2,"0")}`;
    ctx.textAlign = "center";
    ctx.font = `600 18px ${fontFamily}`;
    const w = ctx.measureText(stamp).width + 40, h = 36;
    const x = cx - w/2;
    ctx.fillStyle = bgColor; ctx.strokeStyle = borderColor; ctx.lineWidth = 1.2;
    roundRect(ctx, x, y, w, h, h/2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(stamp, cx, y + h*0.68);
    return h;
  }

  // ══════════════════════════════════════════════════════
  // THEME 1: National Park Passport (deep green, elegant serif)
  // ══════════════════════════════════════════════════════
  function drawPassport(ctx, W, H) {
    const cx = W / 2;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#152816"); grad.addColorStop(1, "#0a1410");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    const rGrad = ctx.createRadialGradient(cx, H*0.1, 0, cx, H*0.1, H*0.6);
    rGrad.addColorStop(0, "rgba(90,150,90,0.18)"); rGrad.addColorStop(1, "rgba(90,150,90,0)");
    ctx.fillStyle = rGrad; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#3a6a4a"; ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W-48, H-48);
    ctx.strokeStyle = "#2a4a3a"; ctx.lineWidth = 1;
    ctx.strokeRect(38, 38, W-76, H-76);

    ctx.textAlign = "center";
    ctx.fillStyle = "#7aae7a"; ctx.font = "500 24px Georgia, serif"; ctx.letterSpacing = "5px";
    ctx.fillText(isJa ? "アメリカ国立公園" : "U.S. NATIONAL PARKS", cx, 100);
    ctx.letterSpacing = "0px";

    // Star field drawn FIRST as a dimmed hero backdrop, then the big number is
    // stamped on top of it so the progress count visually "sits within" the stars.
    const starFieldY = 138;
    const starFieldH = drawStarField(ctx, cx, starFieldY, "#5acc5a", "#4a8a5a", "#3a6a4a");

    ctx.fillStyle = "#e8f0e0"; ctx.font = "700 180px Georgia, serif";
    ctx.fillText(String(totalChecked), cx, starFieldY + starFieldH*0.56 + 60);

    ctx.fillStyle = "#c8e8c0"; ctx.font = "400 30px Georgia, serif";
    ctx.fillText(isJa ? `／ ${parks.length} 公園 訪問済み` : `of ${parks.length} parks visited`, cx, starFieldY + starFieldH*0.56 + 100);

    const afterStarY = starFieldY + starFieldH + 30;
    const titleRowH = drawTitleRow(ctx, cx, afterStarY, "rgba(90,160,100,0.15)", "#5a9a6a", "#c8e8c8", "600 17px Georgia, serif");

    const pillY = afterStarY + titleRowH + (titleRowH ? 4 : 0);
    drawPill(ctx, cx, pillY, "🎖️ " + catchphrases, "#5a9a6a", "rgba(90,160,100,0.18)", "#c8e8c8", "italic 700 34px Georgia, serif");
    const streakOffset = drawStreakBadge(ctx, cx, pillY + 72, "#5a9a6a", "rgba(90,160,100,0.1)", "#8ad49a", "600 20px Georgia, serif");

    line(ctx, cx, pillY + 92 + streakOffset);
    ctx.fillStyle = "#6a9a6a"; ctx.font = "500 22px Georgia, serif";
    ctx.fillText(isJa ? "地域別 達成率" : "PROGRESS BY REGION", cx, pillY + 130 + streakOffset);

    drawRegionGrid(ctx, cx, pillY + 160 + streakOffset, "#a8c8a8", "#7aae7a", "#1a2e1a", "#5acc5a");

    const dividerY = pillY + 160 + streakOffset + Math.ceil(regionStats.length/2) * 56 + 14;
    line(ctx, cx, dividerY);
    ctx.fillStyle = "#6a9a6a"; ctx.font = "500 22px Georgia, serif";
    ctx.fillText(isJa ? "直近訪れた公園" : "RECENTLY VISITED", cx, dividerY + 36);

    drawRecentGrid(ctx, cx, dividerY + 60, "#1a2e18", "#2a4a2a", "#eef4e8", "#6a9a6a", false, "#5acc5a");

    const badgeShowcaseY = dividerY + 60 + 338 + 24;
    const showcaseResult = drawBadgeShowcase(ctx, cx, badgeShowcaseY, "#111e11", "#2a4a3a", "#8aaa8a", "#0a1a0a", "#5acc5a");

    let curY = showcaseResult.nextY + 24;
    const nextGoalH = drawNextGoalHint(ctx, cx, curY, "#111e11", "#2a4a3a", "#7aae7a", "#c8e8c8", "#1a2e1a", "#5acc5a", "Georgia, serif");
    if (nextGoalH) curY += nextGoalH + 24;
    const miniMapH = drawMiniMap(ctx, cx, curY, "#0f1f0f", "#2a4a3a", "#7aae7a", "#1a2e1a", "#3a6a4a", "#5acc5a", "#4a6a4a", "Georgia, serif");
    curY += miniMapH + 40;

    const nameBadgeY = Math.max(H - 120, curY);

    drawNameBadge(ctx, cx, nameBadgeY, "👤", "#0f1f0f", "#3a6a4a", "#a8d4a8", "Georgia, serif");
    drawTimestamp(ctx, cx, nameBadgeY + 78, "#3a6a4a", "#0f1f0f", "#8ad4a0", "Georgia, serif");

    function line(ctx, cx, y) {
      ctx.strokeStyle = "#3a6a4a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx-200, y); ctx.lineTo(cx+200, y); ctx.stroke();
    }
    return Math.ceil(nameBadgeY + 78 + 36 + 40);
  }

  // ══════════════════════════════════════════════════════
  // THEME 2: Topographic Map (contour lines, outdoorsy)
  // ══════════════════════════════════════════════════════
  function drawTopo(ctx, W, H) {
    const cx = W / 2;
    ctx.fillStyle = "#0d1712"; ctx.fillRect(0, 0, W, H);

    // Contour line rings (decorative, radiating from top-center)
    ctx.strokeStyle = "rgba(120,160,120,0.10)"; ctx.lineWidth = 1.5;
    for (let r = 60; r < 1300; r += 55) {
      ctx.beginPath();
      ctx.ellipse(cx, 140, r, r*0.85, 0, 0, Math.PI*2);
      ctx.stroke();
    }
    // Grid overlay (map-like)
    ctx.strokeStyle = "rgba(120,160,120,0.06)"; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    ctx.strokeStyle = "#4a7a5a"; ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, W-40, H-40);
    // Corner ticks
    [[20,20],[W-20,20],[20,H-20],[W-20,H-20]].forEach(([x,y])=>{
      ctx.fillStyle = "#5a9a6a";
      ctx.fillRect(x-3,y-3,6,6);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#6adc8a"; ctx.font = "600 22px 'Courier New', monospace"; ctx.letterSpacing = "6px";
    ctx.fillText(isJa ? "アメリカ国立公園 · 記録" : "U.S. NATIONAL PARKS · LOG", cx, 100);
    ctx.letterSpacing = "0px";

    // Star field drawn FIRST as a dimmed hero backdrop, then the elevation-style
    // number is stamped on top of it.
    const starFieldY = 130;
    const starFieldH = drawStarField(ctx, cx, starFieldY, "#3adc5a", "#4a9a5a", "#3a7a4a");

    ctx.fillStyle = "#eafbea"; ctx.font = "800 180px 'Courier New', monospace";
    ctx.fillText(String(totalChecked), cx, starFieldY + starFieldH*0.56 + 60);
    ctx.fillStyle = "#5adc7a"; ctx.font = "600 26px 'Courier New', monospace";
    ctx.fillText(isJa ? `PARKS 訪問 / ${parks.length}` : `PARKS VISITED / ${parks.length}`, cx, starFieldY + starFieldH*0.56 + 98);

    const afterStarY = starFieldY + starFieldH + 30;
    const titleRowH = drawTitleRow(ctx, cx, afterStarY, "rgba(60,180,90,0.12)", "#4adc6a", "#8af0a0", "600 16px 'Courier New', monospace");

    const pillY = afterStarY + titleRowH + (titleRowH ? 4 : 0);
    drawPill(ctx, cx, pillY, "◆ " + catchphrases.toUpperCase(), "#4adc6a", "rgba(60,180,90,0.16)", "#8af0a0", "700 30px 'Courier New', monospace");
    const streakOffset = drawStreakBadge(ctx, cx, pillY + 72, "#3a8a4a", "rgba(60,180,90,0.08)", "#6adc8a", "600 18px 'Courier New', monospace");

    dashLine(cx, pillY + 90 + streakOffset);
    ctx.fillStyle = "#5adc7a"; ctx.font = "600 20px 'Courier New', monospace"; ctx.letterSpacing="2px";
    ctx.fillText(isJa ? "地域別 達成率" : "PROGRESS BY REGION", cx, pillY + 128 + streakOffset);
    ctx.letterSpacing = "0px";

    drawRegionGrid(ctx, cx, pillY + 158 + streakOffset, "#c0e8c8", "#4adc6a", "#152a18", "#3adc5a");

    const dividerY = pillY + 158 + streakOffset + Math.ceil(regionStats.length/2) * 56 + 14;
    dashLine(cx, dividerY);
    ctx.fillStyle = "#5adc7a"; ctx.font = "600 20px 'Courier New', monospace"; ctx.letterSpacing="2px";
    ctx.fillText(isJa ? "直近訪れた公園" : "RECENTLY VISITED", cx, dividerY + 36);
    ctx.letterSpacing = "0px";

    drawRecentGrid(ctx, cx, dividerY + 60, "#0f1f14", "#2a5a3a", "#eafbea", "#4adc6a", true, "#3adc5a");

    const badgeShowcaseY = dividerY + 60 + 338 + 24;
    const showcaseResult = drawBadgeShowcase(ctx, cx, badgeShowcaseY, "#0d1a10", "#2a5a3a", "#5adc7a", "#0a1510", "#4adc6a");

    let curY = showcaseResult.nextY + 24;
    const nextGoalH = drawNextGoalHint(ctx, cx, curY, "#0d1a10", "#2a5a3a", "#4adc6a", "#8af0a0", "#152a18", "#3adc5a", "'Courier New', monospace");
    if (nextGoalH) curY += nextGoalH + 24;
    const miniMapH = drawMiniMap(ctx, cx, curY, "#0a1510", "#2a5a3a", "#4adc6a", "#152a18", "#3a7a4a", "#3adc5a", "#3a7a4a", "'Courier New', monospace");
    curY += miniMapH + 40;

    const nameBadgeY = Math.max(H - 120, curY);

    drawNameBadge(ctx, cx, nameBadgeY, "◉", "#0f1f14", "#3a7a4a", "#5adc7a", "'Courier New', monospace");
    drawTimestamp(ctx, cx, nameBadgeY + 78, "#3a7a4a", "#0f1f14", "#6adc8a", "'Courier New', monospace");

    function dashLine(cx, y) {
      ctx.strokeStyle = "#3a7a4a"; ctx.lineWidth = 1.5; ctx.setLineDash([6,5]);
      ctx.beginPath(); ctx.moveTo(cx-200, y); ctx.lineTo(cx+200, y); ctx.stroke();
      ctx.setLineDash([]);
    }
    return Math.ceil(nameBadgeY + 78 + 36 + 40);
  }

  // ══════════════════════════════════════════════════════
  // THEME 3: Retro WPA Poster (warm mustard/brick, flat bold)
  // ══════════════════════════════════════════════════════
  function drawRetro(ctx, W, H) {
    const cx = W / 2;
    ctx.fillStyle = "#e8d5a8"; ctx.fillRect(0, 0, W, H);

    // Sun-ray burst behind number (retro poster motif)
    ctx.save();
    ctx.translate(cx, 240);
    for (let i = 0; i < 16; i++) {
      ctx.rotate(Math.PI / 8);
      ctx.fillStyle = i % 2 === 0 ? "rgba(196,90,50,0.10)" : "rgba(196,90,50,0.05)";
      ctx.beginPath();
      ctx.moveTo(0,0); ctx.arc(0,0,560,0,Math.PI/8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // Thick border frame
    ctx.strokeStyle = "#8a3a2a"; ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, W-60, H-60);
    ctx.strokeStyle = "#c8a04a"; ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, W-96, H-96);

    // Decorative corner stars
    function star(cx, cy, size, color) {
      ctx.fillStyle = color;
      ctx.save(); ctx.translate(cx, cy);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.rotate(Math.PI / 5);
        ctx.lineTo(0, size);
        ctx.rotate(Math.PI / 5);
        ctx.lineTo(0, size * 0.4);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    [[80,80],[W-80,80],[80,H-80],[W-80,H-80]].forEach(([x,y]) => star(x, y, 12, "#c8a04a"));

    ctx.textAlign = "center";
    ctx.fillStyle = "#8a3a2a"; ctx.font = "800 26px Georgia, serif"; ctx.letterSpacing = "6px";
    ctx.fillText(isJa ? "アメリカ国立公園" : "U.S. NATIONAL PARKS", cx, 105);
    ctx.letterSpacing = "0px";

    // Double underline accent below title
    ctx.strokeStyle = "#c8a04a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx-140, 122); ctx.lineTo(cx+140, 122); ctx.stroke();
    ctx.strokeStyle = "#8a3a2a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx-100, 128); ctx.lineTo(cx+100, 128); ctx.stroke();

    // Star field drawn FIRST as a dimmed hero backdrop, then the big number is
    // stamped on top of it.
    const starFieldY = 144;
    const starFieldH = drawStarField(ctx, cx, starFieldY, "#c85a30", "#a86840", "#8a3a2a");

    ctx.fillStyle = "#8a3a2a"; ctx.font = "900 190px Georgia, serif";
    ctx.fillText(String(totalChecked), cx, starFieldY + starFieldH*0.56 + 60);
    ctx.fillStyle = "#5a3a2a"; ctx.font = "700 30px Georgia, serif";
    ctx.fillText(isJa ? `／ ${parks.length} 公園 訪問済み` : `of ${parks.length} parks visited`, cx, starFieldY + starFieldH*0.56 + 100);

    const afterStarY = starFieldY + starFieldH + 30;
    const titleRowH = drawTitleRow(ctx, cx, afterStarY, "rgba(138,58,42,0.12)", "#8a3a2a", "#5a3a2a", "600 17px Georgia, serif");

    const pillY = afterStarY + titleRowH + (titleRowH ? 4 : 0);
    drawPill(ctx, cx, pillY, "★ " + catchphrases, "#8a3a2a", "rgba(138,58,42,0.16)", "#8a3a2a", "italic 700 34px Georgia, serif");
    const streakOffset = drawStreakBadge(ctx, cx, pillY + 72, "#8a3a2a", "rgba(196,90,50,0.1)", "#8a3a2a", "700 18px Georgia, serif");

    thickLine(cx, pillY + 92 + streakOffset);
    ctx.fillStyle = "#5a3a2a"; ctx.font = "700 22px Georgia, serif"; ctx.letterSpacing="2px";
    ctx.fillText(isJa ? "地域別 達成率" : "PROGRESS BY REGION", cx, pillY + 130 + streakOffset);
    ctx.letterSpacing = "0px";

    drawRegionGrid(ctx, cx, pillY + 160 + streakOffset, "#5a3a2a", "#8a3a2a", "#d8c090", "#c85a30");

    const dividerY = pillY + 160 + streakOffset + Math.ceil(regionStats.length/2) * 56 + 14;
    thickLine(cx, dividerY);
    ctx.fillStyle = "#5a3a2a"; ctx.font = "700 22px Georgia, serif"; ctx.letterSpacing="2px";
    ctx.fillText(isJa ? "直近訪れた公園" : "RECENTLY VISITED", cx, dividerY + 36);
    ctx.letterSpacing = "0px";

    drawRecentGrid(ctx, cx, dividerY + 60, "#dcc898", "#8a3a2a", "#4a2a1a", "#8a3a2a", false, "#c85a30");

    const badgeShowcaseY = dividerY + 60 + 338 + 24;
    const showcaseResult = drawBadgeShowcase(ctx, cx, badgeShowcaseY, "#e8d5a8", "#8a3a2a", "#5a3a2a", "#dcc898", "#c85a30");

    let curY = showcaseResult.nextY + 24;
    const nextGoalH = drawNextGoalHint(ctx, cx, curY, "#e8d5a8", "#8a3a2a", "#8a3a2a", "#5a3a2a", "#d8c090", "#c85a30", "Georgia, serif");
    if (nextGoalH) curY += nextGoalH + 24;
    const miniMapH = drawMiniMap(ctx, cx, curY, "#dcc898", "#8a3a2a", "#8a3a2a", "#d4bc84", "#8a3a2a", "#c85a30", "#9a8858", "Georgia, serif");
    curY += miniMapH + 40;

    const nameBadgeY = Math.max(H - 120, curY);

    drawNameBadge(ctx, cx, nameBadgeY, "★", "#dcc898", "#8a3a2a", "#8a3a2a", "Georgia, serif");
    drawTimestamp(ctx, cx, nameBadgeY + 78, "#8a3a2a", "#dcc898", "#5a3a2a", "Georgia, serif");

    function thickLine(cx, y) {
      ctx.strokeStyle = "#8a3a2a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx-200, y); ctx.lineTo(cx+200, y); ctx.stroke();
    }
    return Math.ceil(nameBadgeY + 78 + 36 + 40);
  }

  // ── Shared: catchphrase pill ──
  function drawPill(ctx, cx, y, text, borderColor, bgColor, textColor, font) {
    ctx.font = font;
    const w = ctx.measureText(text).width + 56, h = 50;
    const x = cx - w/2;
    ctx.fillStyle = bgColor; ctx.strokeStyle = borderColor; ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, h/2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(text, cx, y + h*0.66);
  }

  // ── Shared: earned-title chips row (2–3 random badge/quest names as "titles") ──
  // Wraps onto a second row automatically if the chips are too wide to fit on one line.
  function drawTitleRow(ctx, cx, y, bgColor, borderColor, textColor, font) {
    if (titleBadges.length === 0) return 0;
    ctx.font = font;
    const gap = 10, padX = 16, h = 34, maxRowW = 920;
    const chips = titleBadges.map(t => ({ text: `${t.icon} ${t.name}`, w: ctx.measureText(`${t.icon} ${t.name}`).width + padX*2 }));

    // Greedily lay chips into rows that don't exceed maxRowW
    const rows = [];
    let row = [], rowW = 0;
    chips.forEach(c => {
      const addW = row.length ? c.w + gap : c.w;
      if (row.length && rowW + addW > maxRowW) {
        rows.push(row); row = [c]; rowW = c.w;
      } else {
        row.push(c); rowW += addW;
      }
    });
    if (row.length) rows.push(row);

    rows.forEach((r, ri) => {
      const totalW = r.reduce((a,c)=>a+c.w,0) + gap * (r.length - 1);
      let x = cx - totalW/2;
      const ry = y + ri * (h + 10);
      r.forEach(c => {
        ctx.fillStyle = bgColor; ctx.strokeStyle = borderColor; ctx.lineWidth = 1.2;
        roundRect(ctx, x, ry, c.w, h, h/2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = textColor; ctx.textAlign = "center";
        ctx.fillText(c.text, x + c.w/2, ry + h*0.66);
        x += c.w + gap;
      });
    });
    ctx.textAlign = "center";
    return rows.length * (h + 10) + 4;
  }

  // ── Shared: streak badge (only rendered when a trip streak exists) ──
  function drawStreakBadge(ctx, cx, y, borderColor, bgColor, textColor, font) {
    if (!longestStreak || longestStreak.count < 2) return 0; // no badge, no extra space used
    const text = `🔥 ${tx.parksInOneTrip(longestStreak.count)}`;
    ctx.font = font;
    const w = ctx.measureText(text).width + 44, h = 38;
    const x = cx - w/2;
    ctx.fillStyle = bgColor; ctx.strokeStyle = borderColor; ctx.lineWidth = 1.2;
    roundRect(ctx, x, y, w, h, h/2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(text, cx, y + h*0.66);
    return h + 14; // space consumed, so caller can shift subsequent content down
  }

  // ── Shared: badge showcase strip (earned badge icons + quest count) ──
  function drawBadgeShowcase(ctx, cx, y, cardBg, cardBorder, labelColor, iconBg, accentColor) {
    if (earnedBadgeIcons.length === 0 && completedQuestCount === 0) return { height: 0, nextY: y };

    const boxW = 980, headerH = 46;
    const maxIcons = 10;
    const iconsToShow = earnedBadgeIcons.slice(0, maxIcons);
    const extra = earnedBadgeIcons.length - iconsToShow.length;
    const chipSize = 76, chipGap = 16;
    const rowCount = Math.ceil((iconsToShow.length + (extra>0?1:0)) / 5);
    const iconRowsH = rowCount * (chipSize + 20);
    const boxH = headerH + iconRowsH + 24;

    const x = cx - boxW/2;
    // Card with subtle gradient fill
    const grad = ctx.createLinearGradient(x, y, x, y + boxH);
    grad.addColorStop(0, cardBg);
    grad.addColorStop(1, cardBg);
    ctx.fillStyle = grad; ctx.strokeStyle = accentColor; ctx.lineWidth = 2;
    roundRect(ctx, x, y, boxW, boxH, 16); ctx.fill(); ctx.stroke();

    // Header row with accent-colored labels
    ctx.textAlign = "left";
    ctx.font = "700 26px Georgia, serif";
    ctx.fillStyle = accentColor;
    const badgeLabel = isJa ? `🏅 バッジ ${earnedBadgeIcons.length}/${totalBadgeCount}` : `🏅 Badges ${earnedBadgeIcons.length}/${totalBadgeCount}`;
    ctx.fillText(badgeLabel, x + 28, y + 36);

    ctx.textAlign = "right";
    const questLabel = isJa ? `🗺 クエスト ${completedQuestCount}/${questProgress.length}` : `🗺 Quests ${completedQuestCount}/${questProgress.length}`;
    ctx.fillText(questLabel, x + boxW - 28, y + 36);

    // Icon grid: large glowing chips, 5 per row
    ctx.textAlign = "center";
    const perRow = 5;
    let idx = 0;
    const allChips = [...iconsToShow.map(ic=>({icon:ic})), ...(extra>0?[{extra}]:[])];
    allChips.forEach((chip) => {
      const row = Math.floor(idx / perRow);
      const col = idx % perRow;
      const rowItems = Math.min(perRow, allChips.length - row*perRow);
      const rowStartX = cx - (rowItems*chipSize + (rowItems-1)*chipGap)/2 + chipSize/2;
      const chipX = rowStartX + col * (chipSize + chipGap);
      const chipY = y + headerH + 30 + row * (chipSize + 20) + chipSize/2;

      // Glow ring behind chip
      ctx.fillStyle = accentColor; ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.arc(chipX, chipY, chipSize/2 + 6, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;

      // Chip circle
      ctx.fillStyle = iconBg; ctx.strokeStyle = accentColor; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(chipX, chipY, chipSize/2, 0, Math.PI*2); ctx.fill(); ctx.stroke();

      if (chip.extra) {
        ctx.font = "700 26px Georgia, serif";
        ctx.fillStyle = accentColor;
        ctx.fillText(`+${chip.extra}`, chipX, chipY + 9);
      } else {
        ctx.font = "42px sans-serif";
        ctx.fillStyle = "#000";
        ctx.fillText(chip.icon, chipX, chipY + 14);
      }
      idx++;
    });

    return { height: boxH, nextY: y + boxH };
  }

  // ── Shared: large profile-name badge (footer) ──
  function drawNameBadge(ctx, cx, y, icon, bgColor, borderColor, textColor, fontFamily) {
    ctx.textAlign = "center";
    ctx.font = `700 32px ${fontFamily}`;
    const text = `${icon}  ${profile.name}`;
    const w = ctx.measureText(text).width + 64, h = 60;
    const x = cx - w/2;
    ctx.fillStyle = bgColor; ctx.strokeStyle = borderColor; ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, h/2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(text, cx, y + h*0.66);
  }

  // ── Shared: 5-point star primitive ──
  // filled=true  → solid star in fillColor
  // filled=false → HOLLOW/outline star only (transparent inside, stroke only) so
  //                unvisited parks read clearly as "not yet" rather than a dim fill
  function drawStar(ctx, cx, cy, r, filled, fillColor, emptyColor, strokeColor) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a1 = -Math.PI/2 + i * 2*Math.PI/5;
      const a2 = a1 + Math.PI/5;
      ctx.lineTo(cx + r*Math.cos(a1), cy + r*Math.sin(a1));
      ctx.lineTo(cx + r*0.42*Math.cos(a2), cy + r*0.42*Math.sin(a2));
    }
    ctx.closePath();
    ctx.strokeStyle = filled ? strokeColor : emptyColor;
    ctx.lineWidth = filled ? 1.5 : 2.5;
    if (filled) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  }

  // ── Shared: big star field as a HERO BACKGROUND (large, dimmed stars spanning
  // near-full width; the big number is drawn on top of this by the caller) ──
  function drawStarField(ctx, cx, y, fillColor, emptyColor, strokeColor) {
    const total = parks.length, visitedCount = totalChecked;
    const cols = 9, rows = Math.ceil(total / cols);
    const starR = 24, cellW = 108, cellH = 70;
    const gridW = cols * cellW;
    const startX = cx - gridW/2 + cellW/2;
    for (let i = 0; i < total; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * cellW;
      const sy = y + row * cellH;
      const filled = i < visitedCount;
      ctx.globalAlpha = filled ? 0.55 : 0.5;
      drawStar(ctx, x, sy, starR, filled, fillColor, emptyColor, strokeColor);
      ctx.globalAlpha = 1;
    }
    return rows * cellH;
  }

  // ── Shared: "next goal" hint card (closest incomplete quest, or next milestone badge) ──
  function drawNextGoalHint(ctx, cx, y, bgColor, borderColor, labelColor, textColor, trackColor, fillColor, font) {
    if (!nextGoal) return 0;
    const boxW = 900, boxH = 96;
    const x = cx - boxW/2;
    ctx.fillStyle = bgColor; ctx.strokeStyle = borderColor; ctx.lineWidth = 2;
    roundRect(ctx, x, y, boxW, boxH, 16); ctx.fill(); ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = `700 18px ${font}`;
    ctx.fillStyle = labelColor;
    ctx.fillText(isJa ? "🎯 次の目標" : "🎯 NEXT GOAL", x + 28, y + 32);

    ctx.font = `600 22px ${font}`;
    ctx.fillStyle = textColor;
    ctx.fillText(`${nextGoal.icon} ${nextGoal.name}`, x + 28, y + 64);

    ctx.textAlign = "right";
    ctx.font = `700 20px ${font}`;
    ctx.fillStyle = textColor;
    ctx.fillText(`${nextGoal.done}/${nextGoal.total}`, x + boxW - 28, y + 64);

    const barX = x + 28, barY = y + 76, barW = boxW - 56, barH = 8;
    const pct = nextGoal.total > 0 ? nextGoal.done / nextGoal.total : 0;
    ctx.fillStyle = trackColor;
    roundRect(ctx, barX, barY, barW, barH, 4); ctx.fill();
    if (pct > 0) {
      ctx.fillStyle = fillColor;
      roundRect(ctx, barX, barY, barW * pct, barH, 4); ctx.fill();
    }
    ctx.textAlign = "center";
    return boxH;
  }

  // ── Shared: mini US map with a pin per park (reuses the app's own projection) ──
  function drawMiniMap(ctx, cx, y, bgColor, borderColor, labelColor, landColor, landBorderColor, pinVisitedColor, pinUnvisitedColor, font) {
    const boxW = 900, boxH = 340, padTop = 46;
    const x = cx - boxW/2;
    ctx.fillStyle = bgColor; ctx.strokeStyle = borderColor; ctx.lineWidth = 2;
    roundRect(ctx, x, y, boxW, boxH, 16); ctx.fill(); ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = `700 18px ${font}`;
    ctx.fillStyle = labelColor;
    ctx.fillText(isJa ? "🗺 訪問済みマップ" : "🗺 PARKS VISITED MAP", x + 28, y + 32);

    const mapAreaW = boxW - 56, mapAreaH = boxH - padTop - 20;
    const scale = Math.min(mapAreaW / MAP_W, mapAreaH / MAP_H);
    const offX = x + (boxW - MAP_W * scale) / 2;
    const offY = y + padTop + (mapAreaH - MAP_H * scale) / 2;

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    const path = new Path2D(US_OUTLINE);
    ctx.fillStyle = landColor; ctx.strokeStyle = landBorderColor; ctx.lineWidth = 2.5 / scale;
    ctx.fill(path); ctx.stroke(path);

    parks.forEach(p => {
      if (p.lat < 20 || p.lng < -130) return; // lower-48 only, keeps this compact map legible
      const { x: px, y: py } = project(p.lat, p.lng);
      const visited = checked[p.id];
      if (visited) {
        ctx.fillStyle = pinVisitedColor;
        ctx.beginPath(); ctx.arc(px, py, 5.5 / scale, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = pinUnvisitedColor;
        ctx.beginPath(); ctx.arc(px, py, 2.5 / scale, 0, Math.PI*2); ctx.fill();
      }
    });
    ctx.restore();
    ctx.textAlign = "center";
    return boxH;
  }

  // ── Shared: region progress 2-col grid ──
  function drawRegionGrid(ctx, cx, startY, labelColor, valueColor, trackColor, fillColor) {
    const barAreaX = 90, barAreaW = 1080 - 180;
    const colGap = 16, colW = (barAreaW - colGap) / 2;
    regionStats.forEach((r, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = barAreaX + col * (colW + colGap);
      const by = startY + row * 56;
      const pct = r.total > 0 ? r.done / r.total : 0;

      ctx.textAlign = "left";
      ctx.fillStyle = labelColor; ctx.font = "500 19px Georgia, serif";
      ctx.fillText(r.label, bx, by);
      ctx.textAlign = "right";
      ctx.fillStyle = valueColor; ctx.font = "500 17px Georgia, serif";
      ctx.fillText(`${r.done}/${r.total}`, bx + colW, by);

      const barY = by + 9, barH = 9;
      ctx.fillStyle = trackColor;
      roundRect(ctx, bx, barY, colW, barH, 4); ctx.fill();
      if (pct > 0) {
        ctx.fillStyle = fillColor;
        roundRect(ctx, bx, barY, colW * pct, barH, 4); ctx.fill();
      }
    });
    ctx.textAlign = "center";
  }

  // ── Shared: recent visits 2×2 grid ──
  function drawRecentGrid(ctx, cx, startY, cardBg, cardBorder, textColor, dateColor, mono, accentColor) {
    const gridW = 940, gridGap = 22;
    const cardW = (gridW - gridGap) / 2, cardH = 158;
    const startX = cx - gridW/2;
    const fontFamily = mono ? "'Courier New', monospace" : "Georgia, serif";
    const accent = accentColor || textColor;

    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = startX + col * (cardW + gridGap);
      const y = startY + row * (cardH + gridGap);

      // Card background with subtle depth
      ctx.fillStyle = cardBg; ctx.strokeStyle = cardBorder; ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, cardW, cardH, 12); ctx.fill(); ctx.stroke();

      // Decorative corner accent (top-left notch)
      ctx.fillStyle = accent; ctx.globalAlpha = 0.12;
      roundRect(ctx, x, y, cardW, 5, 2); ctx.fill();
      ctx.globalAlpha = 1;

      const entry = recentParks[i];
      ctx.textAlign = "center";
      if (entry) {
        const name = isJa ? entry.park.ja : entry.park.name;
        // Emoji circle badge
        ctx.fillStyle = accent; ctx.globalAlpha = 0.13;
        ctx.beginPath(); ctx.arc(x + cardW/2, y + 44, 30, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = textColor; ctx.font = `38px ${fontFamily}`;
        ctx.fillText(entry.park.emoji, x + cardW/2, y + 56);

        // Park name — bigger, bolder
        let displayName = name;
        ctx.font = `700 28px ${fontFamily}`;
        while (ctx.measureText(displayName).width > cardW - 28 && displayName.length > 3) {
          displayName = displayName.slice(0, -2) + "…";
        }
        ctx.fillStyle = textColor;
        ctx.fillText(displayName, x + cardW/2, y + 104);

        // Date pill
        ctx.font = `600 20px ${fontFamily}`;
        const dateText = fmtDate(entry.latest);
        const dw = ctx.measureText(dateText).width + 24;
        ctx.fillStyle = accent; ctx.globalAlpha = 0.15;
        roundRect(ctx, x + cardW/2 - dw/2, y + 122, dw, 28, 14); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = dateColor;
        ctx.fillText(dateText, x + cardW/2, y + 141);
      } else {
        ctx.fillStyle = dateColor; ctx.font = `italic 20px ${fontFamily}`;
        ctx.globalAlpha = 0.5;
        ctx.fillText("—", x + cardW/2, y + cardH/2 + 6);
        ctx.globalAlpha = 1;
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 1080, H = 2900; // tall enough for star hero field + earned titles + 2x2 grid + stats + streak + full badge showcase (up to 4 rows) + next-goal hint + mini map + name badge + timestamp, all dynamically positioned
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    if (theme === "passport") drawPassport(ctx, W, H);
    else if (theme === "topo") drawTopo(ctx, W, H);
    else drawRetro(ctx, W, H);

    setImgUrl(canvas.toDataURL("image/png"));
  }, [theme, totalChecked, recentParks, regionStats, catchphrases, isJa, profile.name]);

  const handleDownload = () => {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = `national-parks-${profile.name}-${theme}-${today()}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!imgUrl || typeof navigator==="undefined" || !navigator.share) { handleDownload(); return; }
    try {
      const blob = await (await fetch(imgUrl)).blob();
      const file = new File([blob], "national-parks.png", { type: "image/png" });
      await navigator.share({ files: [file], title: isJa ? "国立公園チェックリスト" : "National Parks Checklist" });
    } catch { handleDownload(); }
  };

  const themeLabels = {
    passport: isJa ? "🏔 パスポート" : "🏔 Passport",
    topo:     isJa ? "🗺 地形図" : "🗺 Topo Map",
    retro:    isJa ? "🎨 レトロ" : "🎨 Retro",
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2500,padding:16,overflowY:"auto"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,border:`1px solid ${T.headerBorder}`,borderRadius:16,padding:16,maxWidth:420,width:"100%",margin:"auto"}}>

        {/* Theme selector */}
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {Object.entries(themeLabels).map(([key,label]) => (
            <button key={key} onClick={()=>setTheme(key)} style={{
              flex:1, padding:"7px 4px", borderRadius:8, fontSize:11, cursor:"pointer", fontFamily:"inherit",
              background: theme===key?T.btnBgActive:"transparent",
              border:`1px solid ${theme===key?T.btnBorderActive:T.inputBorder}`,
              color: theme===key?T.accentText:T.mutedText,
            }}>{label}</button>
          ))}
        </div>

        <canvas ref={canvasRef} style={{width:"100%",borderRadius:10,display:"block"}} />
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button onClick={handleShare} style={{flex:1,padding:"12px",background:T.btnBgActive,border:`1px solid ${T.btnBorderActive}`,borderRadius:8,color:T.accentText,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
            {(typeof navigator!=="undefined"&&navigator.share) ? (isJa?"📤 共有":"📤 Share") : (isJa?"⬇ 保存":"⬇ Save")}
          </button>
          <button onClick={onClose} style={{padding:"12px 20px",background:"transparent",border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.mutedText,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
            {tx.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

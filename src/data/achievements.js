import { REGION_ORDER, parks } from "./parks";

// ── Badge / Achievement definitions ─────────────────────────────────
// check(ctx) receives { totalChecked, regionCounts, visits, checked, parks } and returns true/false
export const BADGES = [
  { id:"first_steps", icon:"🥾", name:"First Steps", nameJa:"最初の一歩",
    desc:"Visit your first park", descJa:"最初の1公園を訪問する",
    check: ({totalChecked}) => totalChecked >= 1 },
  { id:"five_parks", icon:"🏕️", name:"Weekend Wanderer", nameJa:"週末ワンダラー",
    desc:"Visit 5 parks", descJa:"5公園を訪問する",
    check: ({totalChecked}) => totalChecked >= 5 },
  { id:"fifteen_parks", icon:"🎒", name:"Trail Hunter", nameJa:"トレイルハンター",
    desc:"Visit 15 parks", descJa:"15公園を訪問する",
    check: ({totalChecked}) => totalChecked >= 15 },
  { id:"thirty_parks", icon:"⛰️", name:"Park Veteran", nameJa:"パークベテラン",
    desc:"Visit 30 parks", descJa:"30公園を訪問する",
    check: ({totalChecked}) => totalChecked >= 30 },
  { id:"all_parks", icon:"👑", name:"Grand Master", nameJa:"グランドマスター",
    desc:"Visit all 63 parks", descJa:"全63公園を訪問する",
    check: ({totalChecked}) => totalChecked >= 63 },
  { id:"west_coast", icon:"🌊", name:"West Coast Complete", nameJa:"西海岸コンプリート",
    desc:"Visit every West Coast park", descJa:"西海岸の全公園を訪問する",
    check: ({regionCounts}) => regionCounts["West Coast"]?.done >= regionCounts["West Coast"]?.total },
  { id:"southwest", icon:"🌵", name:"Southwest Complete", nameJa:"南西部コンプリート",
    desc:"Visit every Southwest park", descJa:"南西部の全公園を訪問する",
    check: ({regionCounts}) => regionCounts["Southwest"]?.done >= regionCounts["Southwest"]?.total },
  { id:"northeast", icon:"🍁", name:"Northeast Complete", nameJa:"北東部コンプリート",
    desc:"Visit every Northeast park", descJa:"北東部の全公園を訪問する",
    check: ({regionCounts}) => regionCounts["Northeast"]?.done >= regionCounts["Northeast"]?.total },
  { id:"rocky_mountains", icon:"🏔️", name:"Rocky Mountains Complete", nameJa:"ロッキー山脈コンプリート",
    desc:"Visit every Rocky Mountains park", descJa:"ロッキー山脈の全公園を訪問する",
    check: ({regionCounts}) => regionCounts["Rocky Mountains"]?.done >= regionCounts["Rocky Mountains"]?.total },
  { id:"alaska_adventurer", icon:"🐻", name:"Alaska Adventurer", nameJa:"アラスカ探検家",
    desc:"Visit 3 parks in Alaska", descJa:"アラスカの公園を3つ訪問する",
    check: ({checked}) => parks.filter(p=>p.state==="Alaska"&&checked[p.id]).length >= 3 },
  { id:"repeat_visitor", icon:"🔁", name:"Repeat Visitor", nameJa:"リピーター",
    desc:"Visit the same park twice", descJa:"同じ公園に2回以上訪問する",
    check: ({visits}) => Object.values(visits).some(v => v.length >= 2) },
  { id:"same_month", icon:"📅", name:"Road Trip", nameJa:"ロードトリップ",
    desc:"Visit 3+ parks in the same month", descJa:"同じ月に3公園以上訪問する",
    check: ({visits}) => {
      const months = {};
      Object.values(visits).forEach(arr => arr.forEach(v => {
        const m = v.date.slice(0,7);
        months[m] = (months[m]||0) + 1;
      }));
      return Object.values(months).some(c => c >= 3);
    } },
];

export function computeEarnedBadges(visits, checked) {
  const totalChecked = Object.values(checked).filter(Boolean).length;
  const regionCounts = {};
  REGION_ORDER.forEach(key => {
    const total = parks.filter(p => p.region === key).length;
    const done  = parks.filter(p => p.region === key && checked[p.id]).length;
    regionCounts[key] = { done, total };
  });
  const ctx = { totalChecked, regionCounts, visits, checked, parks };
  return BADGES.filter(b => { try { return b.check(ctx); } catch { return false; } }).map(b => b.id);
}

// ── Quests: themed multi-park routes ────────────────────────────────
export const QUESTS = [
  { id:"appalachian", icon:"🍂", name:"Appalachian Trailblazer", nameJa:"アパラチアン・トレイルブレイザー",
    desc:"Explore the green valleys and gorges of the eastern woodlands", descJa:"東部の緑豊かな渓谷と森林地帯を巡る",
    parkIds:[15,45,54,13] },
  { id:"desert_frontier", icon:"🏜️", name:"Desert Frontiers", nameJa:"デザート・フロンティア",
    desc:"Cross the vast desert borderlands from Texas to New Mexico", descJa:"テキサスからニューメキシコへ広がる砂漠の国境地帯を制覇する",
    parkIds:[5,58] },
  { id:"giant_forest", icon:"🌳", name:"Giants of the Forest", nameJa:"ジャイアント・フォレスト",
    desc:"Stand among California's tallest trees and deepest canyons", descJa:"カリフォルニアの巨木と深い渓谷を巡る",
    parkIds:[53,38] },
  { id:"ring_of_fire", icon:"🌋", name:"Ring of Fire", nameJa:"リング・オブ・ファイア",
    desc:"Visit parks shaped by volcanic activity", descJa:"火山活動によって形成された公園を巡る",
    parkIds:[41,31,61,23] },
  { id:"underground", icon:"🕳️", name:"Underground Explorer", nameJa:"アンダーグラウンド・エクスプローラー",
    desc:"Descend into America's greatest cave systems", descJa:"アメリカ最大級の洞窟群を探検する",
    parkIds:[11,42,59] },
  { id:"last_frontier", icon:"🐻", name:"The Last Frontier", nameJa:"ラスト・フロンティア",
    desc:"Conquer all 8 national parks of Alaska", descJa:"アラスカの全8国立公園を制覇する",
    parkIds:[17,20,23,36,37,39,40,60] },
  { id:"golden_state", icon:"☀️", name:"Golden State Circuit", nameJa:"ゴールデンステート・サーキット",
    desc:"Tour every national park within California", descJa:"カリフォルニア州内の全公園を巡る",
    parkIds:[12,16,35,38,41,49,50,53] },
  { id:"canyon_country", icon:"🏛️", name:"Canyon Country", nameJa:"キャニオン・カントリー",
    desc:"Explore Utah's legendary red rock canyons", descJa:"ユタ州の伝説的な赤い岩の渓谷を巡る",
    parkIds:[3,8,9,10,63] },
  { id:"island_hopper", icon:"🏝️", name:"Island Hopper", nameJa:"アイランド・ホッパー",
    desc:"Reach the parks scattered across the Pacific and Caribbean", descJa:"太平洋とカリブ海に散らばる島の公園を訪れる",
    parkIds:[2,30,31,56] },
];

export function computeQuestProgress(checked) {
  return QUESTS.map(q => {
    const done = q.parkIds.filter(id => checked[id]).length;
    const total = q.parkIds.length;
    return { ...q, done, total, complete: done === total };
  });
}

// ── Tag-based badges: loose keyword detection in visit notes ────────
export const TAG_BADGES = [
  { id:"stargazer", icon:"✨", name:"Stargazer", nameJa:"スターゲイザー",
    desc:"Log a visit mentioning stars or night sky", descJa:"星や夜空について記録する",
    keywords:{en:["star","stars","night sky","milky way"], ja:["星","夜空","天の川"]} },
  { id:"backcountry", icon:"⛺", name:"Backcountry Master", nameJa:"バックカントリー・マスター",
    desc:"Log a visit mentioning camping", descJa:"キャンプ・テント泊について記録する",
    keywords:{en:["camp","camping","tent"], ja:["キャンプ","テント","野営"]} },
  { id:"bark_ranger", icon:"🐾", name:"Bark Ranger", nameJa:"バーク・レンジャー",
    desc:"Log a visit mentioning your dog", descJa:"犬との訪問について記録する",
    keywords:{en:["dog","puppy"], ja:["犬","わんこ","ワンコ"]} },
  { id:"waterway", icon:"🛶", name:"Waterway Voyager", nameJa:"ウォーターウェイ・ボイジャー",
    desc:"Log a visit mentioning water, lake, or river", descJa:"湖や川など水にまつわる訪問を記録する",
    keywords:{en:["lake","river","canoe","kayak","water","boat"], ja:["湖","川","カヌー","カヤック","水","ボート"]} },
  { id:"summit", icon:"⛰️", name:"Summit Seeker", nameJa:"サミット・シーカー",
    desc:"Log a visit mentioning a hike or summit", descJa:"登山・サミットについて記録する",
    keywords:{en:["hike","hiking","summit","peak","trail"], ja:["登山","ハイキング","山頂","トレイル"]} },
  { id:"wildlife", icon:"🦌", name:"Wildlife Spotter", nameJa:"ワイルドライフ・スポッター",
    desc:"Log a visit mentioning wildlife", descJa:"野生動物について記録する",
    keywords:{en:["bear","elk","moose","wildlife","animal"], ja:["クマ","熊","動物","野生"]} },
];

export function computeTagBadges(visits) {
  const allNotes = Object.values(visits).flat().map(v => (v.note || "").toLowerCase());
  if (allNotes.length === 0) return [];
  return TAG_BADGES.filter(tb => {
    const allKeywords = [...tb.keywords.en, ...tb.keywords.ja].map(k => k.toLowerCase());
    return allNotes.some(note => allKeywords.some(kw => note.includes(kw)));
  }).map(tb => tb.id);
}

// ── National Park Streak: longest run of parks visited on one trip ──
// Visits within TRIP_GAP_DAYS of each other are grouped into the same "trip".
export const TRIP_GAP_DAYS = 7;

export function computeTripStreaks(visits) {
  // Flatten all visits into { parkId, date } entries, sorted chronologically
  const entries = [];
  Object.entries(visits).forEach(([parkId, arr]) => {
    (arr || []).forEach(v => entries.push({ parkId: Number(parkId), date: v.date }));
  });
  entries.sort((a, b) => a.date.localeCompare(b.date));
  if (entries.length === 0) return { trips: [], longest: null };

  const dayMs = 24 * 60 * 60 * 1000;
  const trips = [];
  let current = [entries[0]];

  for (let i = 1; i < entries.length; i++) {
    const prevDate = new Date(current[current.length-1].date + "T12:00:00");
    const currDate = new Date(entries[i].date + "T12:00:00");
    const gapDays = Math.round((currDate - prevDate) / dayMs);
    if (gapDays <= TRIP_GAP_DAYS) {
      current.push(entries[i]);
    } else {
      trips.push(current);
      current = [entries[i]];
    }
  }
  trips.push(current);

  // Dedupe park IDs within each trip (a park visited twice in the same trip counts once)
  const tripSummaries = trips.map(trip => {
    const uniqueParkIds = [...new Set(trip.map(e => e.parkId))];
    return {
      parkIds: uniqueParkIds,
      startDate: trip[0].date,
      endDate: trip[trip.length-1].date,
      count: uniqueParkIds.length,
    };
  });

  const longest = tripSummaries.reduce((best, t) => (!best || t.count > best.count) ? t : best, null);
  return { trips: tripSummaries, longest };
}

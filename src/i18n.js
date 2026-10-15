
export const i18n = {
  en: {
    country:"United States", title:"National Parks Checklist", subtitle:"All 63 Parks",
    visited:"Visited", search:"🔍  Search by name or state...", all:"All",
    notFound:"No parks found", badge:(n)=>`🏕️ ${n} park${n===1?"":"s"} visited`,
    langBtn:"日本語", mapTab:"Map", listTab:"List", timelineTab:"Timeline",
    npsLink:"NPS", gmapLink:"Google Maps",
    checkedLabel:"Visited", uncheckedLabel:"Not yet", mapHint:"Tap a pin for details",
    addDate:"+ Add visit date", visitDates:"Visit history",
    noDate:"No dates logged yet", visits:(n)=>n===1?"1 visit":`${n} visits`,
    firstVisit:"First visit", latestVisit:"Latest",
    // Profile
    profiles:"Profiles", newProfile:"New Profile", profileName:"Name",
    createProfile:"Create", deleteProfile:"Delete", switchProfile:"Switch",
    confirmReset:"Reset all checks for", confirmDelete:"Delete profile",
    resetAll:"Reset this profile", cancel:"Cancel", confirm:"Confirm",
    profilePlaceholder:"e.g. Kenji, Family...",
    editName:"Edit name",
    // Backup
    backup:"Backup", exportData:"Export Data", importData:"Import Data",
    exportSuccess:"Data exported!", importSuccess:"Data imported successfully",
    importError:"Invalid file — couldn't import", importConfirm:"This will replace all current data with the imported file. Continue?",
    // Sort
    sortBy:"Sort", sortAZ:"A–Z", sortDateDesc:"Recent first", sortDateAsc:"Oldest first", sortUnvisited:"Unvisited first",
    // Badges
    badges:"Badges", badgeEarned:"Earned", badgeLocked:"Locked", newBadge:"New Badge!",
    // Share timestamp
    generatedOn:"Generated",
    // Quests
    quests:"Quests", questsTab:"Quests", questComplete:"Complete!", questProgress:"Progress",
    // Streak
    streak:"Park Streak", longestStreak:"Longest Streak", tripDates:"Trip Dates",
    noStreak:"No trips logged yet", parksInOneTrip:(n)=>`${n} park${n===1?"":"s"} in one trip`,
    statsTab:"Stats",
    statusFilter:"Filter by status", filterAll:"All", filterUnvisited:"Not yet", filterVisited:"Visited",
    recorded:(park,date)=>`${park} logged (${date})`, changeDate:"Change date", undo:"Undo",
    showOnMap:"Map", parksCount:(n,total)=>`${n} / ${total} parks`,
    confirmUncheck:(n,park)=>`This will delete ${n} visit${n===1?"":"s"} and any notes for ${park}. This can't be undone.`,
  },
  ja: {
    country:"アメリカ合衆国", title:"国立公園 チェックリスト", subtitle:"全63公園",
    visited:"訪問済み", search:"🔍  公園名・州名で検索...", all:"全て",
    notFound:"見つかりませんでした", badge:(n)=>`🏕️ ${n} パーク訪問済み`,
    langBtn:"English", mapTab:"地図", listTab:"リスト", timelineTab:"年表",
    npsLink:"NPS公式", gmapLink:"Googleマップ",
    checkedLabel:"訪問済み", uncheckedLabel:"未訪問", mapHint:"ピンをタップして詳細表示",
    addDate:"+ 訪問日を追加", visitDates:"訪問履歴",
    noDate:"まだ記録がありません", visits:(n)=>`${n}回訪問`,
    firstVisit:"初回訪問", latestVisit:"最終訪問",
    // Profile
    profiles:"プロフィール", newProfile:"新規作成", profileName:"名前",
    createProfile:"作成", deleteProfile:"削除", switchProfile:"切替",
    confirmReset:"チェックをリセット", confirmDelete:"プロフィールを削除",
    resetAll:"このプロフィールの記録を全て消去", cancel:"キャンセル", confirm:"実行",
    profilePlaceholder:"例: Kenji, 家族...",
    editName:"名前を編集",
    // Backup
    backup:"バックアップ", exportData:"データを書き出す", importData:"データを読み込む",
    exportSuccess:"データを書き出しました！", importSuccess:"データを読み込みました",
    importError:"ファイルが無効です — 読み込めませんでした", importConfirm:"現在のデータは読み込むファイルの内容に置き換わります。続けますか？",
    // Sort
    sortBy:"並び替え", sortAZ:"A–Z順", sortDateDesc:"新しい訪問順", sortDateAsc:"古い訪問順", sortUnvisited:"未訪問を上に",
    // Badges
    badges:"バッジ", badgeEarned:"獲得済み", badgeLocked:"未獲得", newBadge:"新しいバッジ！",
    // Share timestamp
    generatedOn:"作成日時",
    // Quests
    quests:"クエスト", questsTab:"クエスト", questComplete:"達成！", questProgress:"進捗",
    // Streak
    streak:"パークストリーク", longestStreak:"最長ストリーク", tripDates:"旅の日程",
    noStreak:"まだ記録がありません", parksInOneTrip:(n)=>`1回の旅で${n}公園`,
    statsTab:"統計",
    statusFilter:"訪問状況で絞り込み", filterAll:"すべて", filterUnvisited:"未訪問", filterVisited:"訪問済み",
    recorded:(park,date)=>`${park}を記録（${date}）`, changeDate:"日付を変更", undo:"元に戻す",
    showOnMap:"地図で見る", parksCount:(n,total)=>`${n} / ${total} 公園`,
    confirmUncheck:(n,park)=>`${park}の訪問記録（${n}件）とメモが削除されます。この操作は取り消せません。`,
  },
};

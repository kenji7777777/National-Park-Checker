import { today, uid } from "./utils";

// Storage: profiles saved as { [profileId]: { name, visits } }
export const STORAGE_KEY = "np_profiles_v1";
export const LANG_KEY    = "np_lang_v1";
export const THEME_KEY   = "np_theme_v1";

// ── Helpers ───────────────────────────────────────────────────────
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
export function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Normalize a visits object so every entry is {date, note} — migrates the old
// string[] format and drops anything malformed instead of crashing on it.
export function migrateVisits(visits) {
  const out = {};
  if (!visits || typeof visits !== "object") return out;
  Object.entries(visits).forEach(([pid, arr]) => {
    if (!Array.isArray(arr)) return;
    out[pid] = arr
      .map(v => typeof v === "string" ? { date: v, note: "" } : v)
      .filter(v => v && typeof v.date === "string" && DATE_RE.test(v.date))
      .map(v => ({ ...v, note: typeof v.note === "string" ? v.note : "" }));
  });
  return out;
}
// Make one stored profile safe to use (id, name, visits, wishlist)
function cleanProfile(p) {
  return {
    ...p,
    id: String(p.id ?? uid()),
    name: String(p.name ?? "Me"),
    visits: migrateVisits(p.visits),
    wish: Array.isArray(p.wish) ? p.wish.filter(n => Number.isInteger(n)) : [],
  };
}
export function initStore() {
  const existing = loadData();
  const list = Array.isArray(existing?.profiles) ? existing.profiles.filter(p => p && typeof p === "object") : [];
  if (list.length > 0) {
    const profiles = list.map(cleanProfile);
    const activeId = profiles.some(p => p.id === existing.activeId) ? existing.activeId : profiles[0].id;
    return { ...existing, activeId, profiles };
  }
  // Migrate old single-profile data (pre-profiles version)
  const oldKey = "np_checklist_v1";
  let oldVisits = {};
  try { const r = localStorage.getItem(oldKey); if (r) oldVisits = JSON.parse(r); } catch {}
  const id = uid();
  return { activeId: id, profiles: [{ id, name: "Me", visits: migrateVisits(oldVisits), wish: [] }] };
}

// ── Backup: export/import ──
// On phones, hand the file to the share sheet ("Save to Files", AirDrop, mail…);
// elsewhere download it. Resolves to "shared", "downloaded" or "cancelled".
export async function exportStoreToFile(store) {
  const payload = { app: "national-parks-checklist", version: 1, exportedAt: new Date().toISOString(), data: store };
  const name = `national-parks-backup-${today()}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  try {
    const file = new File([blob], name, { type: "application/json" });
    const touch = window.matchMedia?.("(pointer: coarse)").matches;
    if (touch && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelled";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking right away can cancel the download in Safari; give it time.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "downloaded";
}
export function parseImportedFile(text) {
  const parsed = JSON.parse(text);
  const data = parsed?.data ?? parsed; // tolerate raw store or wrapped payload
  if (!Array.isArray(data?.profiles) || data.profiles.length === 0) throw new Error("invalid shape");
  const profiles = data.profiles.map(p => {
    if (!p || typeof p !== "object") throw new Error("invalid profile");
    // Reject files whose visits are not in the expected shape rather than silently dropping them
    Object.values(p.visits || {}).forEach(arr => {
      if (!Array.isArray(arr)) throw new Error("invalid visits");
      arr.forEach(v => {
        const date = typeof v === "string" ? v : v?.date;
        if (typeof date !== "string" || !DATE_RE.test(date)) throw new Error("invalid visit");
      });
    });
    return cleanProfile(p);
  });
  const activeId = profiles.some(p => p.id === data.activeId) ? data.activeId : profiles[0].id;
  return { ...data, activeId, profiles };
}

// rev16: onboarding and backup-reminder bookkeeping
export const ONBOARD_KEY = "np_onboarded_v1";
export const BACKUP_KEY  = "np_last_backup_v1";
export const SNOOZE_KEY  = "np_backup_snooze_v1";

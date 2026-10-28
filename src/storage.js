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
// Normalize a visits object so every entry is {date, note} — migrates old string[] format
export function migrateVisits(visits) {
  const out = {};
  Object.entries(visits || {}).forEach(([pid, arr]) => {
    out[pid] = (arr || []).map(v => typeof v === "string" ? { date: v, note: "" } : v);
  });
  return out;
}
export function initStore() {
  const existing = loadData();
  if (existing?.profiles) {
    return { ...existing, profiles: existing.profiles.map(p => ({ ...p, visits: migrateVisits(p.visits) })) };
  }
  // Migrate old single-profile data (pre-profiles version)
  const oldKey = "np_checklist_v1";
  let oldVisits = {};
  try { const r = localStorage.getItem(oldKey); if (r) oldVisits = JSON.parse(r); } catch {}
  const id = uid();
  return { activeId: id, profiles: [{ id, name: "Me", visits: migrateVisits(oldVisits) }] };
}

// ── Backup: export/import ──
export function exportStoreToFile(store) {
  const payload = { app: "national-parks-checklist", version: 1, exportedAt: new Date().toISOString(), data: store };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `national-parks-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
export function parseImportedFile(text) {
  const parsed = JSON.parse(text);
  const data = parsed?.data ?? parsed; // tolerate raw store or wrapped payload
  if (!Array.isArray(data?.profiles) || data.profiles.length === 0) throw new Error("invalid shape");
  const profiles = data.profiles.map(p => {
    if (!p || typeof p !== "object") throw new Error("invalid profile");
    const visits = migrateVisits(p.visits);
    Object.values(visits).forEach(arr => arr.forEach(v => {
      if (!v || typeof v.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) throw new Error("invalid visit");
    }));
    return { ...p, id: String(p.id ?? uid()), name: String(p.name ?? "Me"), visits };
  });
  const activeId = profiles.some(p => p.id === data.activeId) ? data.activeId : profiles[0].id;
  return { ...data, activeId, profiles };
}

// rev16: onboarding and backup-reminder bookkeeping
export const ONBOARD_KEY = "np_onboarded_v1";
export const BACKUP_KEY  = "np_last_backup_v1";
export const SNOOZE_KEY  = "np_backup_snooze_v1";

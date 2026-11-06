export function formatDate(iso, isJa) {
  const d = new Date(iso + "T12:00:00");
  if (isJa) return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  return d.toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" });
}
// Local calendar date (YYYY-MM-DD). toISOString() would give the UTC date,
// which is "yesterday" for e.g. Japan before 9am.
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
export function uid()   { return Math.random().toString(36).slice(2,9); }
export const npsUrl  = (p) => `https://www.nps.gov/${p.nps}/index.htm`;
export const gmapUrl = (p) => `https://www.google.com/maps/search/${encodeURIComponent(p.name+" National Park")}`;

// Loose matching for search: case, accents (ā, ʻ), hiragana/katakana and
// separators (・, spaces, hyphens) are all ignored.
export function normalizeSearch(s) {
  return String(s || "")
    .normalize("NFKD").replace(/[̀-ͯʻʼ'’]/g, "")
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[\s・·\-–—/]/g, "");
}

// Great-circle distance in km
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1*rad) * Math.cos(lat2*rad) * Math.sin(dLng/2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

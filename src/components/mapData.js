// ── SVG Map (simple linear lat/lng projection — no distortion) ────
export const MAP_W = 800, MAP_H = 500;
export const MAP_BOUNDS = { minLng:-125, maxLng:-66, minLat:24, maxLat:50 };

export function project(lat, lng) {
  const x = (lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng) * MAP_W;
  const y = (MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat) * MAP_H;
  return { x, y };
}

// Simplified continental US coastline/border outline (traced from real coordinates)
export const US_OUTLINE = "M 27.1 19.2 L 108.5 19.2 L 406.8 19.2 L 481.4 19.2 L 549.2 38.5 L 549.2 67.3 L 562.7 96.2 L 576.3 125.0 L 576.3 144.2 L 569.5 153.8 L 583.1 163.5 L 616.9 153.8 L 623.7 125.0 L 657.6 115.4 L 684.7 96.2 L 725.4 96.2 L 745.8 105.8 L 772.9 115.4 L 786.4 96.2 L 786.4 105.8 L 745.8 125.0 L 739.0 153.8 L 745.8 163.5 L 718.6 173.1 L 691.5 182.7 L 684.7 201.9 L 678.0 221.2 L 664.4 250.0 L 664.4 259.6 L 657.6 298.1 L 630.5 317.3 L 603.4 346.2 L 589.8 365.4 L 589.8 375.0 L 596.6 403.8 L 610.2 442.3 L 607.5 471.2 L 603.4 476.9 L 589.8 465.4 L 583.1 451.9 L 576.3 432.7 L 573.6 423.1 L 569.5 403.8 L 549.2 390.4 L 535.6 386.5 L 508.5 384.6 L 501.7 378.8 L 481.4 394.2 L 474.6 403.8 L 454.2 398.1 L 427.1 394.2 L 420.3 390.4 L 406.8 403.8 L 376.9 426.9 L 376.9 461.5 L 372.9 463.5 L 352.5 461.5 L 339.0 432.7 L 318.6 403.8 L 298.3 394.2 L 284.7 388.5 L 275.3 378.8 L 257.6 365.4 L 250.8 350.0 L 227.8 359.6 L 189.8 359.6 L 138.3 359.6 L 139.7 336.5 L 105.8 332.7 L 101.7 317.3 L 71.9 307.7 L 61.0 298.1 L 54.2 278.8 L 42.0 259.6 L 35.3 250.0 L 28.5 230.8 L 17.6 213.5 L 12.2 192.3 L 10.8 163.5 L 10.8 153.8 L 12.2 134.6 L 13.6 105.8 L 13.6 86.5 L 13.6 73.1 L 9.5 57.7 L 4.1 38.5 L 4.1 30.8 L 27.1 32.7 L 27.1 19.2 Z";

// Rough state border lines (internal only, for visual reference — not exact)
// Approximate state centroids (continental US) — used to place 2-letter labels
export const STATE_LABELS = [
  {ab:"WA",x:61,y:50},{ab:"OR",x:61,y:115},{ab:"CA",x:72,y:246},
  {ab:"NV",x:114,y:206},{ab:"ID",x:141,y:108},{ab:"MT",x:209,y:58},
  {ab:"WY",x:236,y:135},{ab:"UT",x:180,y:206},{ab:"CO",x:264,y:212},
  {ab:"AZ",x:180,y:304},{ab:"NM",x:256,y:298},{ab:"ND",x:332,y:48},
  {ab:"SD",x:336,y:108},{ab:"NE",x:342,y:164},{ab:"KS",x:361,y:221},
  {ab:"OK",x:373,y:279},{ab:"TX",x:349,y:356},{ab:"MN",x:412,y:77},
  {ab:"IA",x:427,y:154},{ab:"MO",x:441,y:223},{ab:"AR",x:442,y:290},
  {ab:"LA",x:448,y:365},{ab:"WI",x:476,y:104},{ab:"IL",x:485,y:192},
  {ab:"MI",x:534,y:110},{ab:"IN",x:525,y:192},{ab:"OH",x:572,y:187},
  {ab:"KY",x:538,y:240},{ab:"TN",x:523,y:273},{ab:"MS",x:479,y:333},
  {ab:"AL",x:518,y:333},{ab:"GA",x:564,y:335},{ab:"FL",x:583,y:423},
  {ab:"SC",x:598,y:310},{ab:"NC",x:618,y:279},{ab:"VA",x:631,y:240},
  {ab:"WV",x:603,y:214},{ab:"PA",x:641,y:175},{ab:"NY",x:671,y:137},
  {ab:"MD",x:655,y:212},{ab:"NJ",x:682,y:190},{ab:"MA",x:721,y:148},
  {ab:"VT",x:709,y:115},{ab:"NH",x:724,y:121},{ab:"ME",x:757,y:89},
  {ab:"CT",x:709,y:162},{ab:"RI",x:725,y:160},{ab:"DE",x:671,y:212},
];

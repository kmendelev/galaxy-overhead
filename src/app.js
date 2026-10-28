(() => {
'use strict';
const DEG = Math.PI / 180, RAD = 180 / Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const $ = id => document.getElementById(id);
const AE = typeof Astronomy !== 'undefined' ? Astronomy : null;
const store = {
  get(k, d) { try { const v = localStorage.getItem('go.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('go.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
};

/* ================= vector math ================= */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mv = (M, v) => [dot(M[0], v), dot(M[1], v), dot(M[2], v)];
const mtv = (M, v) => [M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2], M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2], M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2]];
const mm = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const tr = A => [0, 1, 2].map(i => [A[0][i], A[1][i], A[2][i]]);
function vRD(ra, dec) { ra *= DEG; dec *= DEG; const c = Math.cos(dec); return [c * Math.cos(ra), c * Math.sin(ra), Math.sin(dec)]; }
// J2000 equatorial -> galactic (IAU / Hipparcos)
const TG = [[-0.0548755604, -0.8734370902, -0.4838350155], [0.4941094279, -0.4448296300, 0.7469822445], [-0.8676661490, -0.1980763734, 0.4559837762]];
const galVec = (l, b) => mtv(TG, vRD(l, b));
function toGal(v) { const g = mv(TG, v); return [((Math.atan2(g[1], g[0]) * RAD) % 360 + 360) % 360, Math.asin(clamp(g[2], -1, 1)) * RAD]; }

/* ================= time & sky orientation ================= */
const jd = t => t / 86400000 + 2440587.5;
function gmst(t) { const d = jd(t) - 2451545.0, T = d / 36525; return ((280.46061837 + 360.98564736629 * d + 0.000387933 * T * T) % 360 + 360) % 360; }
// rows: East, North, Up (unit vectors in J2000 equatorial coordinates)
function horMatrix(t, lat, lon) {
  const th = (gmst(t) + lon) * DEG, ph = lat * DEG;
  const st = Math.sin(th), ct = Math.cos(th), sp = Math.sin(ph), cp = Math.cos(ph);
  return [[-st, ct, 0], [-sp * ct, -sp * st, cp], [cp * ct, cp * st, sp]];
}
// low-precision Sun (about 0.01 deg), used for night scans and as a fallback
function sunVec(t) {
  const n = jd(t) - 2451545.0, g = (357.528 + 0.9856003 * n) * DEG;
  const lam = (280.460 + 0.9856474 * n + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG, eps = (23.439 - 0.0000004 * n) * DEG;
  return [Math.cos(lam), Math.cos(eps) * Math.sin(lam), Math.sin(eps) * Math.sin(lam)];
}
const altOf = (H, v) => Math.asin(clamp(dot(H[2], v), -1, 1)) * RAD;
const azOf = (H, v) => ((Math.atan2(dot(H[0], v), dot(H[1], v)) * RAD) % 360 + 360) % 360;
const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compass = az => POINTS[Math.round(az / 22.5) % 16];

/* ---- time zones ---- */
const fmtCache = {};
function tzFmt(tz, opts, key) {
  const k = tz + key;
  if (!fmtCache[k]) { try { fmtCache[k] = new Intl.DateTimeFormat(undefined, { timeZone: tz, ...opts }); } catch (e) { fmtCache[k] = new Intl.DateTimeFormat(undefined, opts); } }
  return fmtCache[k];
}
function tzParts(t, tz) {
  const f = tzFmt(tz, { hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }, 'parts');
  const o = {}; for (const p of f.formatToParts(new Date(t))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
}
function tzOffset(t, tz) { const p = tzParts(t, tz); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(t / 1000) * 1000; }
function zoned(y, m, d, h, mi, tz) { const g = Date.UTC(y, m - 1, d, h, mi); const t = g - tzOffset(g, tz); return g - tzOffset(t, tz); }
const hhmm = t => tzFmt(S.loc.tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, 'hm').format(new Date(t));
const dayLabel = t => tzFmt(S.loc.tz, { weekday: 'short', day: 'numeric', month: 'short' }, 'day').format(new Date(t));
function nightDateFor(t) {
  const p = tzParts(t, S.loc.tz);
  if (p.h >= 12) return { y: p.y, m: p.m, d: p.d };
  const q = new Date(Date.UTC(p.y, p.m - 1, p.d - 1));
  return { y: q.getUTCFullYear(), m: q.getUTCMonth() + 1, d: q.getUTCDate() };
}
const nightStart = nd => zoned(nd.y, nd.m, nd.d, 12, 0, S.loc.tz);

/* ================= static sky data ================= */
const STARS = DATA.stars, NS = STARS.length;
const SV = new Float32Array(NS * 3);
STARS.forEach((s, i) => { const v = vRD(s[0], s[1]); SV[i * 3] = v[0]; SV[i * 3 + 1] = v[1]; SV[i * 3 + 2] = v[2]; });
function bvColor(bv) {
  const st = [[-0.3, [160, 182, 255]], [0, [204, 218, 255]], [0.3, [246, 246, 255]], [0.6, [255, 242, 228]], [0.9, [255, 226, 196]], [1.2, [255, 208, 160]], [1.6, [255, 184, 122]], [2.2, [255, 160, 96]]];
  bv = clamp(bv, -0.3, 2.2);
  for (let i = 1; i < st.length; i++) if (bv <= st[i][0]) {
    const t = (bv - st[i - 1][0]) / (st[i][0] - st[i - 1][0]), a = st[i - 1][1], b = st[i][1];
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  }
  return 'rgb(255,160,96)';
}
const STAR_COL = STARS.map(s => bvColor(s[3]));
const NAMED = new Map(DATA.starNames.map(([i, n, c, d]) => [i, { n, c, d }]));
function subdivide(pts, maxDeg) {
  const out = [];
  for (const v of pts) {
    if (out.length) {
      const a = out[out.length - 1], ang = Math.acos(clamp(dot(a, v), -1, 1)), n = Math.ceil(ang / (maxDeg * DEG));
      for (let k = 1; k < n; k++) out.push(norm(lerp(a, v, k / n)));
    }
    out.push(v);
  }
  return out;
}
const CLINES = DATA.lines.map(f => { const p = []; for (let i = 0; i < f.length; i += 2) p.push(vRD(f[i], f[i + 1])); return subdivide(p, 3); });
const CONS = DATA.cons.map(([n, ra, dec, rank]) => ({ n, v: vRD(ra, dec), rank }));
const GEQ = []; for (let l = 0; l < 360; l += 1) GEQ.push(galVec(l, 0));
const GLAT = [10, -10].map(b => { const a = []; for (let l = 0; l < 360; l += 2) a.push(galVec(l, b)); return a; });
const GMER = []; for (let l = 0; l < 360; l += 30) { const a = []; for (let b = -84; b <= 84; b += 3) a.push(galVec(l, b)); GMER.push({ l, pts: a }); }
const OBJS = DATA.objs.map(o => ({ ...o, v: vRD(o.ra, o.dec) }))
  .concat(EXTRA_OBJS.map(o => { const v = vRD(o.ra, o.dec), [l, b] = toGal(v); return { ...o, v, l, b }; }));
const OBJ = Object.fromEntries(OBJS.map(o => [o.id, o]));
const GCV = OBJ.gc.v, ACV = OBJ.anti.v;
const LANDMARK = new Set(['core', 'dir', 'pole']);
const KIND = { core: 'Galactic landmark', dir: 'Galactic direction', pole: 'Galactic pole', neb: 'Nebula', clus: 'Star cluster', glob: 'Globular cluster', gal: 'Galaxy', dust: 'Dust and dark clouds', hist: 'Historic object' };
const BODIES = [
  { id: 'Sun', col: '#ffd27a' }, { id: 'Moon', col: '#ebe7dc' }, { id: 'Mercury', col: '#cfc6ba' }, { id: 'Venus', col: '#fff4d8' },
  { id: 'Mars', col: '#ff9c6e' }, { id: 'Jupiter', col: '#f4e2bd' }, { id: 'Saturn', col: '#ecd291' }
];
const BODY_TEXT = {
  Sun: 'Our star. While it is up, or less than 18° below the horizon, the sky is too bright to see the Milky Way.',
  Moon: 'Moonlight washes out the faint glow of the Milky Way, more so the fuller the Moon. The best views come when it is down or a thin crescent.',
  Mercury: 'The innermost planet. It never strays far from the Sun, so you only catch it low in twilight.',
  Venus: 'The brightest planet. It is often mistaken for a plane or a very bright star.',
  Mars: 'The red planet. Its brightness changes a lot from year to year as Earth catches up with it.',
  Jupiter: 'The largest planet. Binoculars show its four big moons as tiny points in a line.',
  Saturn: 'The ringed planet. A small telescope shows the rings.'
};

/* ---- regions along the galactic plane ---- */
const REGIONS = [
  { a: 345, b: 15, n: 'Galactic core', d: 'Toward the center, about 26,000 light-years away. You look through the Sagittarius and Scutum–Centaurus arms; dust hides the core itself, so you see star clouds in front of it.' },
  { a: 15, b: 60, n: 'Inner disk, first quadrant', d: 'Looking along the Scutum and Sagittarius arms where they curve away from us. The Great Rift’s dust splits the glow here.' },
  { a: 60, b: 105, n: 'Along our Local Arm', d: 'The direction we orbit toward. You look lengthwise down our own Local Arm, so its stars and nebulae pile up in Cygnus.' },
  { a: 105, b: 165, n: 'Out to the Perseus Arm', d: 'Looking outward across the gap to the Perseus Arm, the next arm out, about 6,000–8,000 light-years away.' },
  { a: 165, b: 200, n: 'Galactic anticenter', d: 'Straight out toward the edge of the disk. There are fewer stars this way, so the Milky Way is faint.' },
  { a: 200, b: 255, n: 'Outer disk, behind us', d: 'Outward and behind us in our orbit. The outer disk is faint; most of what you see here belongs to our Local Arm.' },
  { a: 255, b: 300, n: 'Vela and Carina', d: 'Behind us in our orbit. You look along the Carina Arm, the far end of the Sagittarius Arm, one of the richest stretches of the Milky Way.' },
  { a: 300, b: 345, n: 'Inner disk, fourth quadrant', d: 'Looking inward past the Coalsack toward the Centaurus and Norma arms as they curve in toward the core.' }
];
const inRegion = (r, l) => (r.a < r.b ? l >= r.a && l < r.b : l >= r.a || l < r.b);
const regionOf = l => REGIONS.find(r => inRegion(r, l));
for (const r of REGIONS) {
  r.cons = []; const span = (r.b - r.a + 360) % 360;
  for (let k = 0; k < span; k += 5) { const c = DATA.plane[((r.a + k) % 360) / 5]; if (c && !r.cons.includes(c)) r.cons.push(c); }
}
const planeCon = l => DATA.plane[Math.round(((l % 360) + 360) % 360 / 5) % 72];
function lookDesc(b) {
  const a = Math.abs(b), side = b >= 0 ? 'north' : 'south';
  if (a >= 60) return `straight out of the disk, toward the ${side} galactic pole and open intergalactic space`;
  if (a >= 30) return `steeply out of the disk on its ${side} side, past nearby stars into the halo`;
  if (a >= 10) return `at a shallow angle through the disk, ${side} of the plane`;
  return 'right along the disk, through the thick of the Milky Way';
}

/* ================= state ================= */
const S = {
  loc: null, live: true, t: Date.now(),
  view: { mode: store.get('mode', 'dome') === 'dome' ? 'dome' : 'horizon', yaw: 180, pitch: 90, k: 1, ox: 0, oy: 0, fov: 100, hpitch: 30, pfov: 70 },
  layers: Object.assign({ lines: true, cnames: true, snames: true, grid: false, dso: true, planets: true, tech: false }, store.get('layers', {})),
  sel: null, red: store.get('red', false), expanded: false
};

/* ---- locations ---- */
const CA_P = { '01': 'AB', '02': 'BC', '03': 'MB', '04': 'NB', '05': 'NL', '07': 'NS', '08': 'ON', '09': 'PE', '10': 'QC', '11': 'SK', '12': 'YT', '13': 'NT', '14': 'NU' };
const AU_S = { '01': 'ACT', '02': 'NSW', '03': 'NT', '04': 'QLD', '05': 'SA', '06': 'TAS', '07': 'VIC', '08': 'WA' };
function cityRegion(c) {
  const [cc, a1] = c[1].split('-'), country = DATA.countries[cc] || cc;
  if (!a1) return country;
  const st = cc === 'CA' ? CA_P[a1] : cc === 'AU' ? AU_S[a1] : a1;
  return st ? `${st}, ${country}` : country;
}
const fixTz = tz => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz; } catch (e) { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } };
const cityLoc = (c, approx) => ({ name: c[0], region: cityRegion(c), lat: c[2], lon: c[3], tz: fixTz(DATA.tzs[c[4]]), approx: !!approx });
function nearestCity(lat, lon) {
  let best = null, bd = 1e9;
  for (const c of DATA.cities) {
    const dl = (c[2] - lat) * DEG, dn = (c[3] - lon) * DEG;
    const h = Math.sin(dl / 2) ** 2 + Math.cos(lat * DEG) * Math.cos(c[2] * DEG) * Math.sin(dn / 2) ** 2;
    if (h < bd) { bd = h; best = c; }
  }
  return { c: best, km: 2 * 6371 * Math.asin(Math.sqrt(bd)) };
}
function defaultLoc() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const c = DATA.cities.find(c => DATA.tzs[c[4]] === tz);
  if (c) return cityLoc(c, true);
  const z = DATA.zones[tz];
  if (z) return { name: tz.split('/').pop().replace(/_/g, ' '), region: '', lat: z[0], lon: z[1], tz: fixTz(tz), approx: true };
  return { name: 'Greenwich', region: 'United Kingdom', lat: 51.48, lon: 0, tz: fixTz('Europe/London'), approx: true };
}
S.loc = store.get('loc', null) || defaultLoc();
S.loc.tz = fixTz(S.loc.tz);
S.view.yaw = S.loc.lat >= 0 ? 180 : 0;

/* ================= ephemeris (per time/location) ================= */
const E = { key: '' };
function ephem() {
  const key = S.t + '|' + S.loc.lat + '|' + S.loc.lon;
  if (E.key === key) return E;
  E.key = key;
  E.H = horMatrix(S.t, S.loc.lat, S.loc.lon);
  E.G = mm(TG, tr(E.H));                          // galactic <- horizon
  E.bodies = [];
  if (AE) {
    try {
      const d = new Date(S.t), obs = new AE.Observer(S.loc.lat, S.loc.lon, 0);
      for (const b of BODIES) {
        const eq = AE.Equator(b.id, d, obs, false, true);
        const o = { ...b, v: vRD(eq.ra * 15, eq.dec), mag: null, frac: null };
        try { const il = AE.Illumination(b.id, d); o.mag = il.mag; o.frac = il.phase_fraction; } catch (e) { /* Sun has no phase */ }
        E.bodies.push(o);
      }
      E.moonPhase = AE.MoonPhase(d);
    } catch (e) { E.bodies = []; }
  }
  if (!E.bodies.length) E.bodies.push({ ...BODIES[0], v: sunVec(S.t) });
  const sun = E.bodies.find(b => b.id === 'Sun'), moon = E.bodies.find(b => b.id === 'Moon');
  E.sunAlt = altOf(E.H, sun.v);
  E.moonAlt = moon ? altOf(E.H, moon.v) : null;
  E.moonFrac = moon ? moon.frac : null;
  E.planeAlt = GEQ.map(v => altOf(E.H, v));
  E.zen = toGal(E.H[2]);
  return E;
}

/* night scan: Sun, galactic core and Moon altitudes from local noon to next noon */
const N = { key: '' };
function nightScan() {
  const nd = nightDateFor(S.t), t0 = nightStart(nd);
  const key = t0 + '|' + S.loc.lat + '|' + S.loc.lon;
  if (N.key === key) return N;
  Object.assign(N, { key, t0, step: 600000, sun: [], gc: [], moon: [] });
  const obs = AE ? new AE.Observer(S.loc.lat, S.loc.lon, 0) : null;
  for (let i = 0; i <= 144; i++) {
    const t = t0 + i * N.step, H = horMatrix(t, S.loc.lat, S.loc.lon);
    N.sun.push(altOf(H, sunVec(t)));
    N.gc.push(altOf(H, GCV));
    if (obs) { try { const eq = AE.Equator('Moon', new Date(t), obs, false, true); N.moon.push(altOf(H, vRD(eq.ra * 15, eq.dec))); } catch (e) { N.moon.push(null); } }
  }
  if (AE) { try { N.moonFrac = AE.Illumination('Moon', new Date(t0 + 12 * 3600000)).phase_fraction; } catch (e) { N.moonFrac = null; } }
  return N;
}
function spans(arr, test) {
  const out = []; let start = null;
  for (let i = 0; i < arr.length; i++) {
    const ok = arr[i] != null && test(arr[i]);
    if (ok && start == null) start = i === 0 ? N.t0 : crossT(arr, i - 1, test);
    if (!ok && start != null) { out.push([start, crossT(arr, i - 1, test)]); start = null; }
  }
  if (start != null) out.push([start, N.t0 + (arr.length - 1) * N.step]);
  return out;
}
// threshold crossing between samples i and i+1, linearly interpolated
function crossT(arr, i, test) {
  const a = arr[i], b = arr[i + 1];
  let lo = 0, hi = 1; const okA = test(a);
  for (let k = 0; k < 12; k++) { const m = (lo + hi) / 2; if (test(a + (b - a) * m) === okA) lo = m; else hi = m; }
  return N.t0 + (i + (lo + hi) / 2) * N.step;
}
const spanText = sp => sp.map(([a, b]) => (a <= N.t0 ? 'until ' + hhmm(b) : b >= N.t0 + 144 * N.step - 1 ? 'from ' + hhmm(a) : hhmm(a) + '–' + hhmm(b))).join(', ');

/* rise/set within the next 24 h for a fixed direction */
function nextRiseSet(v, isMoon) {
  const obs = isMoon && AE ? new AE.Observer(S.loc.lat, S.loc.lon, 0) : null;
  const alt = t => {
    const H = horMatrix(t, S.loc.lat, S.loc.lon);
    if (obs) { const eq = AE.Equator('Moon', new Date(t), obs, false, true); return altOf(H, vRD(eq.ra * 15, eq.dec)); }
    return altOf(H, v);
  };
  let prev = alt(S.t), res = { up: prev > 0, rise: null, set: null };
  for (let i = 1; i <= 144; i++) {
    const t = S.t + i * 600000, a = alt(t);
    if (prev <= 0 && a > 0 && !res.rise) res.rise = t - 600000 * a / (a - prev);
    if (prev > 0 && a <= 0 && !res.set) res.set = t - 600000 * a / (a - prev);
    prev = a;
  }
  return res;
}

/* ================= human-made objects ================= */
const TECH_BY = Object.fromEntries(TECH.map(t => [t.id, t]));
const yearOf = t => 2000 + (t - 946728000000) / 31557600000;      // Julian years from J2000
function probeGeo(p, t) {          // straight-line escape from the Sun, seen from Earth
  const d = p.d0 + p.au * (yearOf(t) - p.y0), u = vRD(p.ra, p.dec), s = sunVec(t);
  return { v: norm([u[0] * d + s[0], u[1] * d + s[1], u[2] * d + s[2]]), d };
}
const SAT = { lib: null, state: 'idle', recs: {}, pass: {} };
const SAT_ITEMS = TECH.filter(t => t.t === 'sat');
const SAT_MAX_AGE = 5 * 86400000;   // an orbit fit older than this can't place a low satellite usefully
function ensureSats() {
  if (SAT.state !== 'idle') return;
  SAT.state = 'loading';
  const el = document.createElement('script');
  el.src = 'https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/dist/satellite.min.js';
  el.onload = () => { SAT.lib = window.satellite; loadTLEs(); };
  el.onerror = () => { SAT.state = 'failed'; satFail(); };
  document.head.appendChild(el);
}
async function getTLE(id) {
  const key = 'tle' + id, cached = store.get(key, null);
  if (cached && Date.now() - cached.at < 12 * 3600000) return cached;
  const sources = [
    async () => {
      const r = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=TLE`); if (!r.ok) throw new Error(r.status);
      const L = (await r.text()).split(/\r?\n/).map(x => x.trim()), i = L.findIndex(x => x.startsWith('1 '));
      if (i < 0 || !(L[i + 1] || '').startsWith('2 ')) throw new Error('no TLE'); return [L[i], L[i + 1]];
    },
    async () => {
      const r = await fetch(`https://tle.ivanstanojevic.me/api/tle/${id}`); if (!r.ok) throw new Error(r.status);
      const j = await r.json(); if (!j.line1 || !j.line2) throw new Error('no TLE'); return [j.line1, j.line2];
    }
  ];
  for (const src of sources) {
    try { const [l1, l2] = await src(), v = { at: Date.now(), l1, l2 }; store.set(key, v); return v; } catch (e) { /* try the next source */ }
  }
  return cached;    // older data beats none; satLook checks it against the orbit's epoch
}
function tleEpoch(l1) { const yy = +l1.slice(18, 20), doy = +l1.slice(20, 32); return Date.UTC(yy < 57 ? 2000 + yy : 1900 + yy, 0, 1) + (doy - 1) * 86400000; }
async function loadTLEs() {
  const got = await Promise.all(SAT_ITEMS.map(t => getTLE(t.norad)));
  got.forEach((g, i) => {
    if (!g) return;
    try { SAT.recs[SAT_ITEMS[i].id] = { rec: SAT.lib.twoline2satrec(g.l1, g.l2), epoch: tleEpoch(g.l1) }; } catch (e) { /* unreadable orbit data */ }
  });
  SAT.state = Object.keys(SAT.recs).length ? 'ready' : 'failed';
  if (SAT.state === 'failed') satFail();
  T.key = ''; req();
}
function satFail() { if (S.layers.tech) toast('Live satellite orbits couldn’t be loaded here, so space stations aren’t shown. Spacecraft beyond Earth orbit still are.'); }
function satLook(id, t) {
  const r = SAT.recs[id]; if (!r || Math.abs(t - r.epoch) > SAT_MAX_AGE) return null;
  const L = SAT.lib, d = new Date(t), pv = L.propagate(r.rec, d);
  if (!pv || !pv.position) return null;
  const g = L.gstime(d), p = pv.position;
  const la = L.ecfToLookAngles({ longitude: S.loc.lon * DEG, latitude: S.loc.lat * DEG, height: 0.05 }, L.eciToEcf(p, g));
  const s = sunVec(t), along = p.x * s[0] + p.y * s[1] + p.z * s[2];
  const perp = Math.hypot(p.x - along * s[0], p.y - along * s[1], p.z - along * s[2]);
  const ce = Math.cos(la.elevation);
  return { h: [ce * Math.sin(la.azimuth), ce * Math.cos(la.azimuth), Math.sin(la.elevation)], el: la.elevation * RAD,
    height: L.eciToGeodetic(p, g).height, lit: !(along < 0 && perp < 6371) };     // cylindrical Earth shadow
}
const azH = h => ((Math.atan2(h[0], h[1]) * RAD) % 360 + 360) % 360;
// first pass above 10° in the next 24 h, and the first one you can actually see (sunlit craft, sky dark)
function nextPass(id) {
  const key = [id, S.loc.lat, S.loc.lon, Math.floor(S.t / 300000)].join('|');
  if (SAT.pass[id] && SAT.pass[id].key === key) return SAT.pass[id].res;
  let cur = null, first = null, vis = null;
  for (let t = S.t; t < S.t + 86400000 && !vis; t += 20000) {
    const s = satLook(id, t); if (!s) break;
    if (s.el > 10) {
      if (!cur) cur = { start: t, max: s.el, az0: azH(s.h), vis: false };
      if (s.el > cur.max) cur.max = s.el;
      cur.end = t; cur.az1 = azH(s.h);
      if (s.lit && altOf(horMatrix(t, S.loc.lat, S.loc.lon), sunVec(t)) < -6) cur.vis = true;
    } else if (cur) { first = first || cur; if (cur.vis) vis = cur; cur = null; }
  }
  const res = { vis, any: first || cur };
  SAT.pass[id] = { key, res };
  return res;
}
const T = { key: '', items: [] };
function techItems() {
  if (T.key === E.key) return T.items;
  T.key = E.key; T.items = [];
  for (const it of TECH) {
    let o = null;
    if (it.t === 'probe') o = probeGeo(it, S.t);
    else if (it.t === 'l2') { const s = sunVec(S.t); o = { v: [-s[0], -s[1], -s[2]] }; }
    else if (it.t === 'at') { const b = E.bodies.find(b => b.id === it.body); if (b) o = { v: b.v }; }
    else if (it.t === 'signal') o = { v: vRD(it.ra, it.dec) };
    else if (SAT.state === 'ready') { const st = satLook(it.id, S.t); if (st) o = { ...st, v: mtv(E.H, st.h) }; }
    if (o) T.items.push({ it, ...o });
  }
  return T.items;
}

/* ================= rendering: WebGL sky ================= */
const sky = $('sky'), glc = $('gl'), ov = $('ov'), octx = ov.getContext('2d');
let gl = null, glp = null, U = {};
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `precision highp float;
uniform vec2 uC;uniform float uS;uniform mat3 uCam;uniform mat3 uGal;uniform sampler2D uTex;
uniform float uDay;uniform float uVis;
void main(){
  vec2 p=(gl_FragCoord.xy-uC)/uS; float r2=dot(p,p);
  vec3 c=vec3(2.0*p,1.0-r2)/(1.0+r2);
  vec3 h=uCam*c;
  if(h.z<0.0){
    float d=clamp(-h.z*5.0,0.0,1.0);
    gl_FragColor=vec4(mix(vec3(0.085,0.075,0.07),vec3(0.028,0.028,0.033),d),1.0);return;
  }
  vec3 g=h*uGal;
  float l=atan(g.y,g.x); float b=asin(clamp(g.z,-1.0,1.0));
  float mw=texture2D(uTex,vec2(l/6.2831853,b/3.1415927+0.5)).r;
  float hz=pow(1.0-h.z,4.0);
  vec3 night=mix(vec3(0.010,0.016,0.036),vec3(0.055,0.07,0.115),hz);
  vec3 day=mix(vec3(0.06,0.14,0.30),vec3(0.20,0.30,0.46),pow(1.0-h.z,3.0));
  vec3 sky=mix(night,day,uDay);
  float core=exp(-(l*l)/0.18)*exp(-(b*b)/0.05);
  vec3 tint=mix(vec3(0.60,0.68,0.88),vec3(1.0,0.84,0.62),clamp(core*1.4,0.0,1.0));
  float ext=smoothstep(0.0,0.30,h.z);
  gl_FragColor=vec4(sky+tint*mw*0.95*uVis*(0.35+0.65*ext),1.0);
}`;
function initGL() {
  try {
    gl = glc.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    glp = gl.createProgram();
    gl.attachShader(glp, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(glp, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(glp); gl.useProgram(glp);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(glp, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uC', 'uS', 'uCam', 'uGal', 'uTex', 'uDay', 'uVis']) U[n] = gl.getUniformLocation(glp, n);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array([0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const img = new Image();
    img.onload = () => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img); req(); };
    img.src = MW_PNG;
    gl.uniform1i(U.uTex, 0);
  } catch (e) { console.warn('WebGL unavailable', e); gl = null; }
}
const flat = M => new Float32Array([M[0][0], M[0][1], M[0][2], M[1][0], M[1][1], M[1][2], M[2][0], M[2][1], M[2][2]]);

/* ================= motion sensors (Point mode) ================= */
const DEV = { f: null, u: null, got: false, absSeen: false, iosOff: null, timer: 0, on: false, hdg: store.get('hdgOff', 0) };
const rotZ = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]]; };
// device axes in East/North/Up for R = Rz(alpha)·Rx(beta)·Ry(gamma) (W3C DeviceOrientation)
function deviceAxes(alpha, beta, gamma) {
  const a = alpha * DEG, b = beta * DEG, g = gamma * DEG;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  return {
    X: [ca * cg - sa * sb * sg, sa * cg + ca * sb * sg, -cb * sg],
    Y: [-sa * cb, ca * cb, sb],
    Z: [ca * sg + sa * sb * cg, sa * sg - ca * sb * cg, cb * cg]
  };
}
const screenAngle = () => (screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : typeof window.orientation === 'number' ? window.orientation : 0);
function onOrient(e) {
  if (e.alpha == null || e.beta == null || e.gamma == null) return;
  if (e.type === 'deviceorientationabsolute') DEV.absSeen = true;
  else if (DEV.absSeen) return;
  let alpha = e.alpha;
  if (e.type === 'deviceorientation' && !e.absolute && typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0) {
    // iOS: alpha has an arbitrary zero; track a smoothed offset to the compass instead of trusting each heading
    const off = (360 - e.webkitCompassHeading - e.alpha) * DEG, v = [Math.cos(off), Math.sin(off)];
    DEV.iosOff = DEV.iosOff ? [DEV.iosOff[0] * 0.92 + v[0] * 0.08, DEV.iosOff[1] * 0.92 + v[1] * 0.08] : v;
    alpha += Math.atan2(DEV.iosOff[1], DEV.iosOff[0]) * RAD;
  }
  const { X, Y, Z } = deviceAxes(alpha, e.beta, e.gamma), th = screenAngle() * DEG, c = Math.cos(th), sn = Math.sin(th);
  const f = [-Z[0], -Z[1], -Z[2]];                         // back camera looks along device -z
  const u = [sn * X[0] + c * Y[0], sn * X[1] + c * Y[1], sn * X[2] + c * Y[2]];   // screen up, after screen rotation
  if (!DEV.f) { DEV.f = f; DEV.u = u; } else { DEV.f = norm(lerp(DEV.f, f, 0.3)); DEV.u = norm(lerp(DEV.u, u, 0.3)); }
  DEV.got = true;
  if (S.view.mode === 'point') reqSoon();
}
function devBasis() {
  const h = -DEV.hdg * DEG, f = rotZ(DEV.f, h), r = norm(cross(f, rotZ(DEV.u, h)));
  return [r, cross(r, f), f];
}
const ORIENT_EVENTS = ['deviceorientationabsolute', 'deviceorientation'];
function stopPoint() {
  if (DEV.on) for (const t of ORIENT_EVENTS) window.removeEventListener(t, onOrient);
  DEV.on = false; clearTimeout(DEV.timer);
}
function pointFail(declined) {
  stopPoint();
  if (S.view.mode === 'point') setMode('horizon');
  toast(declined ? 'Motion access wasn’t allowed, so Point mode can’t follow your phone. Reload the page to be asked again. Showing the horizon view instead.'
    : 'Point mode needs your phone’s motion sensors, and this page can’t reach them here. Showing the horizon view instead.');
}
async function startPoint() {
  if (S.view.mode === 'point') return;
  const DOE = window.DeviceOrientationEvent;
  if (!DOE) return pointFail(false);
  if (typeof DOE.requestPermission === 'function') {       // iOS: must be called from the tap itself
    try { if (await DOE.requestPermission() === 'denied') return pointFail(true); } catch (e) { return pointFail(false); }
  }
  Object.assign(DEV, { f: null, u: null, got: false, absSeen: false, iosOff: null, on: true });
  for (const t of ORIENT_EVENTS) window.addEventListener(t, onOrient);
  setMode('point');
  clearTimeout(DEV.timer);
  DEV.timer = setTimeout(() => { if (!DEV.got && S.view.mode === 'point') pointFail(false); }, 1500);
}
let toastTimer = 0;
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 7000);
}

/* ================= view / projection ================= */
const F = {};   // per-frame projection state
let reserve = 132;
function camBasis() {
  if (S.view.mode === 'point' && DEV.f) return devBasis();
  const y = S.view.yaw * DEG, p = (S.view.mode === 'dome' ? 90 : S.view.hpitch) * DEG;
  const f = [Math.cos(p) * Math.sin(y), Math.cos(p) * Math.cos(y), Math.sin(p)];
  const r = [Math.cos(y), -Math.sin(y), 0];
  return [r, cross(r, f), f];
}
function setupView() {
  const W = sky.clientWidth, Hh = sky.clientHeight, wide = W >= 760;    // wide: panel docks on the right
  const visW = wide ? W - 452 : W, visH = Math.max(160, wide ? Hh - 10 : Hh - reserve);
  F.W = W; F.H = Hh;
  F.R0 = Math.max(70, Math.min(visW, visH - 60) / 2 - 24);
  if (S.view.mode === 'dome') {
    F.bcx = visW / 2; F.bcy = (visH - 52) / 2 + 16;
    F.s = F.R0 * S.view.k; F.cx = F.bcx + S.view.ox; F.cy = F.bcy + S.view.oy;
  } else if (S.view.mode === 'point') {     // screen center = where the back of the phone points
    F.s = (visW / 2) / Math.tan(S.view.pfov / 4 * DEG); F.cx = visW / 2; F.cy = Hh / 2;
    F.bcx = F.cx; F.bcy = F.cy;
  } else {
    F.s = (visW / 2) / Math.tan(S.view.fov / 4 * DEG); F.cx = visW / 2; F.cy = visH * 0.44;
    F.bcx = F.cx; F.bcy = F.cy;
  }
  F.zf = F.s / F.R0;
  F.C = camBasis();
  F.P = mm(F.C, E.H);         // camera <- equatorial
}
function proj(v) {
  const P = F.P;
  const z = P[2][0] * v[0] + P[2][1] * v[1] + P[2][2] * v[2];
  if (z < -0.6) return null;
  const q = F.s / (1 + z);
  return [F.cx + (P[0][0] * v[0] + P[0][1] * v[1] + P[0][2] * v[2]) * q, F.cy - (P[1][0] * v[0] + P[1][1] * v[1] + P[1][2] * v[2]) * q];
}
function unproj(x, y) {
  const px = (x - F.cx) / F.s, py = -(y - F.cy) / F.s, r2 = px * px + py * py;
  const c = [2 * px / (1 + r2), 2 * py / (1 + r2), (1 - r2) / (1 + r2)];
  const h = [0, 1, 2].map(i => c[0] * F.C[0][i] + c[1] * F.C[1][i] + c[2] * F.C[2][i]);
  return mtv(E.H, h);
}
const onScreen = (p, m = 30) => p && p[0] > -m && p[0] < F.W + m && p[1] > -m && p[1] < F.H + m;

/* ================= rendering: overlay ================= */
let dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = sky.clientWidth, h = sky.clientHeight;
  for (const c of [glc, ov]) { const W = Math.round(w * dpr), H = Math.round(h * dpr); if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } }
}
function drawGL() {
  if (!gl) return;
  gl.viewport(0, 0, glc.width, glc.height);
  gl.uniform2f(U.uC, F.cx * dpr, (F.H - F.cy) * dpr);
  gl.uniform1f(U.uS, F.s * dpr);
  gl.uniformMatrix3fv(U.uCam, false, flat(F.C));
  gl.uniformMatrix3fv(U.uGal, false, flat(E.G));
  const day = Math.pow(clamp((E.sunAlt + 16) / 16, 0, 1), 1.4);
  let vis = 1;
  if (E.moonAlt != null && E.moonAlt > 0) vis *= 1 - 0.3 * (E.moonFrac || 0) * clamp(E.moonAlt / 12, 0, 1);
  gl.uniform1f(U.uDay, day);
  gl.uniform1f(U.uVis, vis * (1 - day) + 0.4 * day);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

const FONT = {
  label: '600 12px "Instrument Sans", system-ui, sans-serif',
  small: '500 11px "Instrument Sans", system-ui, sans-serif',
  big: '600 13.5px "Instrument Sans", system-ui, sans-serif',
  atlas: 'italic 500 13px Newsreader, Georgia, serif',
  atlasS: 'italic 400 12px Newsreader, Georgia, serif',
  card: '600 14px "Instrument Sans", system-ui, sans-serif',
  mono: '500 10.5px "IBM Plex Mono", ui-monospace, monospace'
};
const COL = { hist: '#f3dfb0', tech: '#5fe0cc', amber: '#f2b35e', amberA: a => `rgba(242,179,94,${a})`, rose: '#ff92a5', ice: '#a9c6ff', violet: '#b8a8ff', muted: '#8f99ae', fg: '#e8ecf5', halo: 'rgba(4,6,12,0.85)' };
let hits = [], labels = [];

function strokeSky(pts, closed, above, below) {
  const ctx = octx, n = pts.length, m = closed ? n : n - 1, maxJump = Math.max(F.W, F.H) * 0.6;
  const pa = new Path2D(), pb = below ? new Path2D() : null;
  const st = { a: null, b: null };
  const add = (path, key, v1, v2) => {
    const p = proj(v1), q = proj(v2);
    if (!p || !q || Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) > maxJump) { st[key] = null; return; }
    const last = st[key];
    if (!last || Math.abs(last[0] - p[0]) > 0.5 || Math.abs(last[1] - p[1]) > 0.5) path.moveTo(p[0], p[1]);
    path.lineTo(q[0], q[1]); st[key] = q;
  };
  const U = E.H[2];
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], za = dot(U, a), zb = dot(U, b);
    if (za >= 0 && zb >= 0) add(pa, 'a', a, b);
    else if (za < 0 && zb < 0) { if (pb) add(pb, 'b', a, b); }
    else {
      const c = norm(lerp(a, b, za / (za - zb)));
      if (za >= 0) { add(pa, 'a', a, c); if (pb) add(pb, 'b', c, b); } else { if (pb) add(pb, 'b', a, c); add(pa, 'a', c, b); }
    }
  }
  const apply = (path, s) => { ctx.save(); ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.setLineDash(s.dash || []); if (s.glow) { ctx.shadowColor = s.glow; ctx.shadowBlur = 8; } ctx.stroke(path); ctx.restore(); };
  apply(pa, above); if (pb) apply(pb, below);
}
function label(x, y, text, o) { labels.push({ x, y, text, r: 4, pri: 0, font: FONT.label, color: COL.fg, ...o }); }
function placeLabels() {
  const ctx = octx; labels.sort((a, b) => b.pri - a.pri);
  const boxes = labels.filter(l => l.block).map(l => [l.x - l.r, l.y - l.r, l.x + l.r, l.y + l.r]);
  for (const L of labels) {
    if (L.block && !L.text) continue;
    ctx.font = L.font;
    const w = ctx.measureText(L.text).width, h = L.size || 13, g = L.r + 4;
    const cands = L.center ? [[L.x - w / 2, L.y - h / 2]] : [[L.x + g, L.y - h / 2], [L.x - g - w, L.y - h / 2], [L.x - w / 2, L.y - g - h], [L.x - w / 2, L.y + g]];
    for (const [x, y] of cands) {
      const b = [x - 2, y - 1, x + w + 2, y + h + 1];
      if (b[0] < 2 || b[2] > F.W - 2 || b[1] < 2 || b[3] > F.H - 2) continue;
      if (!L.force && boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) continue;
      boxes.push(b);
      ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
      ctx.globalAlpha = L.alpha ?? 1;
      ctx.strokeStyle = COL.halo; ctx.lineWidth = 3.5; ctx.strokeText(L.text, x, y + 0.5);
      ctx.fillStyle = L.color; ctx.fillText(L.text, x, y + 0.5);
      ctx.globalAlpha = 1;
      break;
    }
  }
}
function marker(kind, x, y, dim) {
  const ctx = octx; ctx.save(); ctx.globalAlpha = dim ? 0.45 : 1; ctx.lineWidth = 1.5;
  switch (kind) {
    case 'core':
      ctx.strokeStyle = COL.amber; ctx.shadowColor = COL.amber; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(x + dx * 12, y + dy * 12); ctx.lineTo(x + dx * 17, y + dy * 17); } ctx.stroke();
      ctx.fillStyle = COL.amber; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); break;
    case 'dir':
      ctx.fillStyle = COL.amber; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.fill(); break;
    case 'pole':
      ctx.strokeStyle = COL.amber; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9); ctx.stroke(); break;
    case 'neb':
      ctx.strokeStyle = COL.rose; ctx.strokeRect(x - 4.5, y - 4.5, 9, 9); break;
    case 'clus':
      ctx.strokeStyle = COL.ice; ctx.setLineDash([1.6, 2.4]); ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke(); break;
    case 'glob':
      ctx.strokeStyle = COL.ice; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 7); ctx.moveTo(x - 5.5, y); ctx.lineTo(x + 5.5, y); ctx.moveTo(x, y - 5.5); ctx.lineTo(x, y + 5.5); ctx.stroke(); break;
    case 'gal':
      ctx.strokeStyle = COL.violet; ctx.beginPath(); ctx.ellipse(x, y, 8, 3.6, -0.5, 0, 7); ctx.stroke(); break;
    case 'dust':
      ctx.strokeStyle = 'rgba(160,170,195,.75)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.stroke(); break;
    case 'hist':      // four-point sparkle
      ctx.fillStyle = COL.hist; ctx.beginPath();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? 1.8 : 6.5; ctx.lineTo(x + Math.sin(a) * r, y - Math.cos(a) * r); }
      ctx.closePath(); ctx.fill(); break;
  }
  ctx.restore();
}
function drawMoon(x, y, r, phase, col) {
  const ctx = octx; ctx.save();
  ctx.fillStyle = 'rgba(40,40,46,.95)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  const k = Math.cos(phase * DEG);           // 1 new, -1 full
  const waxing = phase < 180;
  ctx.fillStyle = col; ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
  ctx.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, (k > 0) === waxing);
  ctx.fill(); ctx.restore();
}

function drawOverlay() {
  const ctx = octx; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, F.W, F.H);
  hits = []; labels = [];
  const Hm = E.H, Up = Hm[2], zf = F.zf, dome = S.view.mode === 'dome';
  if (!gl) {   // fallback background
    ctx.fillStyle = '#0b0b0e'; ctx.fillRect(0, 0, F.W, F.H);
    if (dome) { ctx.fillStyle = '#060b18'; ctx.beginPath(); ctx.arc(F.cx, F.cy, F.s, 0, 7); ctx.fill(); }
    strokeSky(GEQ, true, { c: 'rgba(200,210,240,.10)', w: 40 * zf });
  }
  // galactic grid
  if (S.layers.grid) {
    for (const m of GMER) strokeSky(m.pts, false, { c: COL.amberA(0.16), w: 1, dash: [2, 5] });
    for (const g of GLAT) strokeSky(g, true, { c: COL.amberA(0.32), w: 1, dash: [6, 5] });
  }
  // constellation lines
  if (S.layers.lines) for (const L of CLINES) strokeSky(L, false, { c: 'rgba(150,175,225,.30)', w: 1 });
  // galactic equator
  strokeSky(GEQ, true, { c: COL.amberA(0.85), w: 1.6, glow: COL.amberA(0.6) }, { c: COL.amberA(0.35), w: 1.2, dash: [4, 6] });
  // equator longitude ticks
  for (let l = 0; l < 360; l += 30) {
    const v = GEQ[l], p = proj(v); if (!onScreen(p, 0) || dot(Up, v) < 0) continue;
    if ([0, 90, 180, 270].includes(l)) continue;
    ctx.fillStyle = COL.amberA(0.9); ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, 7); ctx.fill();
    if (S.layers.grid || zf > 1.6) label(p[0], p[1], `l ${l}°`, { font: FONT.mono, color: COL.amberA(0.85), pri: 35, r: 3, size: 12 });
  }
  // horizon line + cardinal points
  const hz = []; for (let a = 0; a <= 360; a += 2) hz.push(mtv(Hm, [Math.sin(a * DEG), Math.cos(a * DEG), 0]));
  strokeSky(hz, false, { c: 'rgba(200,210,230,.45)', w: 1.2 });
  for (let a = 0; a < 360; a += 45) {
    const main = a % 90 === 0, h = [Math.sin(a * DEG), Math.cos(a * DEG), dome ? -0.075 : -0.05];
    const p = proj(mtv(Hm, norm(h))); if (!onScreen(p, -4)) continue;
    label(p[0], p[1], POINTS[a / 22.5], { center: true, font: main ? FONT.big : FONT.small, color: main ? COL.fg : COL.muted, pri: 95, size: 14 });
  }
  if (dome) { ctx.strokeStyle = 'rgba(200,210,230,.35)'; ctx.lineWidth = 1; ctx.beginPath(); const z = proj(Up); if (z) { ctx.moveTo(z[0] - 5, z[1]); ctx.lineTo(z[0] + 5, z[1]); ctx.moveTo(z[0], z[1] - 5); ctx.lineTo(z[0], z[1] + 5); ctx.stroke(); } }

  // stars
  const P = F.P, sizeK = Math.min(1.9, Math.pow(zf, 0.3)), nameLim = 2.0 + 1.6 * Math.log2(Math.max(1, zf));
  const dayDim = clamp((E.sunAlt + 6) / 10, 0, 0.6);
  for (let i = 0; i < NS; i++) {
    const x = SV[i * 3], y = SV[i * 3 + 1], z = SV[i * 3 + 2];
    if (Up[0] * x + Up[1] * y + Up[2] * z < 0) continue;
    const cz = P[2][0] * x + P[2][1] * y + P[2][2] * z; if (cz < -0.6) continue;
    const q = F.s / (1 + cz), sx = F.cx + (P[0][0] * x + P[0][1] * y + P[0][2] * z) * q, sy = F.cy - (P[1][0] * x + P[1][1] * y + P[1][2] * z) * q;
    if (sx < -5 || sx > F.W + 5 || sy < -5 || sy > F.H + 5) continue;
    const mag = STARS[i][2], r = clamp((5.6 - mag) * 0.43, 0.45, 3.4) * sizeK;
    ctx.globalAlpha = clamp(1.25 - mag * 0.14, 0.3, 1) * (1 - dayDim);
    ctx.fillStyle = STAR_COL[i];
    if (r < 1.1) ctx.fillRect(sx - r, sy - r, r * 2, r * 2); else { ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); }
    const nm = NAMED.get(i);
    if (nm) {
      if (S.layers.snames && mag <= nameLim) label(sx, sy, nm.n, { font: FONT.small, color: 'rgba(222,230,245,.88)', pri: 60 - mag * 6, r: r + 1 });
      hits.push({ x: sx, y: sy, pri: 1 + (3 - mag) * 0.3, sel: { type: 'star', i } });
    } else if (mag < 3.5) hits.push({ x: sx, y: sy, pri: 0.5, sel: { type: 'star', i } });
  }
  ctx.globalAlpha = 1;

  // constellation names
  if (S.layers.cnames) {
    const rk = zf >= 3 ? 3 : zf >= 1.5 ? 2 : 1;
    for (const c of CONS) {
      if (c.rank > rk || dot(Up, c.v) < 0.05) continue;
      const p = proj(c.v); if (!onScreen(p, 0)) continue;
      label(p[0], p[1], c.n, { center: true, font: FONT.atlas, color: 'rgba(155,178,225,.75)', pri: 20 - c.rank, size: 14 });
    }
  }

  // deep-sky and galactic landmarks
  for (const o of OBJS) {
    const land = LANDMARK.has(o.k);
    if (!land && !S.layers.dso) continue;
    const alt = dot(Up, o.v); if (alt < 0 && !land) continue;
    const p = proj(o.v); if (!onScreen(p, 10)) continue;
    const below = alt < 0;
    marker(o.k, p[0], p[1], below);
    const isCore = o.k === 'core';
    label(p[0], p[1], o.n + (below ? ' (below horizon)' : ''), {
      font: isCore ? FONT.big : o.k === 'dust' ? FONT.atlasS : FONT.label,
      color: land ? COL.amber : o.k === 'neb' ? COL.rose : o.k === 'gal' ? COL.violet : o.k === 'dust' ? '#b3bccd' : o.k === 'hist' ? COL.hist : COL.ice,
      pri: isCore ? 100 : land ? 88 : 70, r: isCore ? 13 : 7, alpha: below ? 0.5 : 1, block: true
    });
    hits.push({ x: p[0], y: p[1], pri: land ? 3 : 2.5, sel: { type: 'obj', id: o.id } });
  }

  // Sun, Moon, planets
  if (S.layers.planets) for (const b of E.bodies) {
    const alt = dot(Up, b.v), major = b.id === 'Sun' || b.id === 'Moon';
    if (alt < 0 && !major) continue;
    const p = proj(b.v); if (!onScreen(p, 10)) continue;
    const below = alt < 0;
    ctx.save(); ctx.globalAlpha = below ? 0.45 : 1;
    if (b.id === 'Moon') drawMoon(p[0], p[1], 7.5, E.moonPhase ?? 180, b.col);
    else if (b.id === 'Sun') { ctx.fillStyle = b.col; ctx.shadowColor = b.col; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = b.col; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p[0], p[1], 3.6, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    label(p[0], p[1], b.id + (below ? ' (below horizon)' : ''), { font: FONT.label, color: b.col, pri: 90, r: 9, alpha: below ? 0.6 : 1, block: true });
    hits.push({ x: p[0], y: p[1], pri: 2.8, sel: { type: 'body', id: b.id } });
  }

  if (S.layers.tech) drawTech(Up);

  // point mode: aim marker and what it points at
  if (S.view.mode === 'point') {
    const x = F.cx, y = F.cy, h = F.C[2], v = mtv(E.H, h), [l, b] = toGal(v), reg = regionOf(l);
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, 11, 0, 7);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(x + dx * 15, y + dy * 15); ctx.lineTo(x + dx * 24, y + dy * 24); }
    ctx.stroke(); ctx.restore();
    const alt = Math.asin(clamp(h[2], -1, 1)) * RAD, az = ((Math.atan2(h[0], h[1]) * RAD) % 360 + 360) % 360;
    label(x, y + 40, `${Math.round(alt)}° ${alt >= 0 ? 'up' : 'down'} · ${compass(az)} · l ${Math.round(l) % 360}° b ${b >= 0.5 ? '+' : b <= -0.5 ? '−' : ''}${Math.abs(Math.round(b))}°`, { center: true, font: FONT.mono, color: COL.fg, pri: 200, size: 12, force: true });
    label(x, y + 56, Math.abs(b) < 20 && reg ? reg.n : Math.abs(b) >= 60 ? 'Out of the disk, toward a galactic pole' : 'Above or below the galactic plane', { center: true, font: FONT.label, color: COL.amber, pri: 199, size: 13, force: true });
  }
  // selection
  if (S.sel) {
    const v = selVec(S.sel), p = v && proj(v);
    if (onScreen(p)) {
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.shadowColor = COL.amber; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p[0], p[1], 15, 0, 7); ctx.stroke();
      if (S.sel.type === 'pt') { ctx.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(p[0] + dx * 6, p[1] + dy * 6); ctx.lineTo(p[0] + dx * 22, p[1] + dy * 22); } ctx.stroke(); }
      ctx.restore();
    }
  }
  placeLabels();
}
function drawTech(Up) {
  const ctx = octx, dark = E.sunAlt < -6;
  for (const x of techItems()) {
    const it = x.it, alt = dot(Up, x.v);
    if (it.t === 'sat' && alt < 0) continue;
    const below = alt < 0, p = proj(x.v); if (!onScreen(p, 10)) continue;
    if (it.t === 'sat') {          // dotted track: two minutes back, five ahead
      const tr = []; for (let k = -6; k <= 15; k++) { const st = satLook(it.id, S.t + k * 20000); if (st) tr.push(mtv(E.H, st.h)); }
      strokeSky(tr, false, { c: 'rgba(95,224,204,.55)', w: 1.2, dash: [2, 4] });
    }
    let mx = p[0], my = p[1];
    ctx.save(); ctx.globalAlpha = below ? 0.45 : 1; ctx.strokeStyle = COL.tech; ctx.fillStyle = COL.tech; ctx.lineWidth = 1.5;
    if (it.t === 'at' || it.t === 'signal') {     // shares a spot with a planet or cluster: offset, with a leader line
      mx += 17; my -= 17; ctx.beginPath(); ctx.moveTo(p[0] + 7, p[1] - 7); ctx.lineTo(mx - 5, my + 5); ctx.stroke();
    }
    if (it.t === 'sat') {
      const lit = x.lit && dark;
      if (lit) { ctx.shadowColor = COL.tech; ctx.shadowBlur = 10; }
      ctx.beginPath(); ctx.arc(mx, my, 3.2, 0, 7); if (lit) ctx.fill(); else ctx.stroke();
      ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(mx - 10, my); ctx.lineTo(mx - 5, my); ctx.moveTo(mx + 5, my); ctx.lineTo(mx + 10, my); ctx.stroke();
    } else if (it.t === 'probe') {
      ctx.beginPath(); ctx.moveTo(mx, my - 6); ctx.lineTo(mx + 5, my + 4); ctx.lineTo(mx - 5, my + 4); ctx.closePath(); ctx.stroke();
    } else if (it.t === 'l2') {
      ctx.beginPath(); ctx.moveTo(mx, my - 5); ctx.lineTo(mx + 5, my); ctx.lineTo(mx, my + 5); ctx.lineTo(mx - 5, my); ctx.closePath(); ctx.stroke();
    } else if (it.t === 'signal') {
      ctx.beginPath(); ctx.arc(mx - 3, my + 3, 1.8, 0, 7); ctx.fill();
      for (const r of [5.5, 9.5]) { ctx.beginPath(); ctx.arc(mx - 3, my + 3, r, -Math.PI / 2, 0); ctx.stroke(); }
    } else { ctx.beginPath(); ctx.arc(mx, my, 4.5, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(mx, my, 1.5, 0, 7); ctx.fill(); }
    ctx.restore();
    label(mx, my, it.n + (below ? ' (below horizon)' : ''), { font: FONT.label, color: COL.tech, pri: it.t === 'sat' ? 93 : 74, r: 9, alpha: below ? 0.55 : 1, block: true });
    hits.push({ x: mx, y: my, pri: 2.9, sel: { type: 'tech', id: it.id } });
  }
}
function selVec(sel) {
  if (sel.type === 'tech') { const x = techItems().find(x => x.it.id === sel.id); return x && x.v; }
  if (sel.type === 'star') return [SV[sel.i * 3], SV[sel.i * 3 + 1], SV[sel.i * 3 + 2]];
  if (sel.type === 'obj') return OBJ[sel.id].v;
  if (sel.type === 'body') { const b = E.bodies.find(b => b.id === sel.id); return b && b.v; }
  return sel.v;
}

/* ================= galaxy map ================= */
const R0 = 8.15, LY_PER_KPC = 3261.56;
// arm fits after Reid et al. 2019: ln(R/Rk) = -(beta - bk) tan(psi); beta = Galactocentric azimuth, 0 toward the Sun
const ARMS = [
  { n: 'Norma–Outer', Rk: 4.46, bk: 18, pl: -1.0, pg: 19.5, r: [-5, 54], lb: 40 },
  { n: 'Scutum–Centaurus', Rk: 4.91, bk: 23, pl: 14.1, pg: 12.1, r: [0, 104], lb: -100 },
  { n: 'Sagittarius–Carina', Rk: 6.04, bk: 24, pl: 17.1, pg: 1.0, r: [-51, 97], lb: -72 },
  { n: 'Local Arm', Rk: 8.26, bk: 9, pl: 11.4, pg: 11.4, r: [-8, 34], lb: 32, noExt: true },
  { n: 'Perseus', Rk: 8.87, bk: 40, pl: 10.3, pg: 8.7, r: [-23, 115], lb: 62 },
  { n: 'Outer', Rk: 12.24, bk: 18, pl: 3.0, pg: 9.4, r: [-16, 71], lb: -20 }
];
const armXY = (R, b) => [-R * Math.sin(b * DEG), -R * Math.cos(b * DEG)];
for (const a of ARMS) {
  const R = b => a.Rk * Math.exp(-(b - a.bk) * DEG * Math.tan((b < a.bk ? a.pl : a.pg) * DEG));
  a.core = []; for (let b = a.r[0]; b <= a.r[1]; b += 1) a.core.push(armXY(R(b), b));
  a.ext = [];
  if (!a.noExt) for (const [start, dir, psi] of [[a.r[0], -1, Math.abs(a.pl) < 5 ? 12 : a.pl], [a.r[1], 1, Math.abs(a.pg) < 5 ? 12 : a.pg]]) {
    const seg = [armXY(R(start), start)]; let Rc = R(start);
    for (let k = 1; k < 240; k++) { Rc *= Math.exp(-dir * DEG * Math.tan(psi * DEG)); if (Rc > 15.5 || Rc < 3.4) break; seg.push(armXY(Rc, start + dir * k)); }
    a.ext.push(seg);
  }
  a.lab = armXY(R(a.lb), a.lb);
}
const dirL = l => [-Math.sin(l * DEG), Math.cos(l * DEG)];
function planeSpans() {     // longitude spans of the galactic plane above the horizon
  const up = E.planeAlt.map(a => a > 0), out = [];
  if (up.every(Boolean)) return [[0, 360]];
  let i0 = up.findIndex(u => !u);
  for (let k = 1; k <= 360; k++) {
    const i = (i0 + k) % 360;
    if (up[i] && !up[(i + 359) % 360]) out.push([i, null]);
    if (!up[i] && up[(i + 359) % 360]) { const o = out[out.length - 1]; if (o) o[1] = i; }
  }
  return out.map(([a, b]) => [a, b < a ? b + 360 : b]);
}
function prepCanvas(cv) {
  const w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height, r = Math.min(window.devicePixelRatio || 1, 2.5);
  if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); }
  const ctx = cv.getContext('2d'); ctx.setTransform(r, 0, 0, r, 0, 0); ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}
function drawGalaxy(cv, o) {
  const { ctx, w, h } = prepCanvas(cv), detail = !!o.detail;
  const fc = o.focus ? o.focus.c : [0, 0], sc = Math.min(w, h) / 2 / (o.focus ? o.focus.r : detail ? 16.8 : 16.2);
  const cx = w / 2 - fc[0] * sc, cy = h / 2 + fc[1] * sc;
  const X = p => cx + p[0] * sc, Y = p => cy - p[1] * sc;
  const sun = [0, -R0];
  // disk glow
  let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 15.5 * sc);
  g.addColorStop(0, 'rgba(255,224,170,.55)'); g.addColorStop(0.12, 'rgba(236,206,160,.26)'); g.addColorStop(0.45, 'rgba(140,160,215,.11)'); g.addColorStop(1, 'rgba(120,140,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 15.5 * sc, 0, 7); ctx.fill();
  // arms
  const path = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p))); };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const a of ARMS) {
    const wid = Math.max(1.4, (a.noExt ? 0.45 : 0.75) * sc);
    for (const e of a.ext) { path(e); ctx.strokeStyle = 'rgba(175,195,240,.10)'; ctx.lineWidth = wid; ctx.stroke(); }
    path(a.core); ctx.strokeStyle = 'rgba(175,195,240,.26)'; ctx.lineWidth = wid; ctx.stroke();
    ctx.strokeStyle = 'rgba(210,222,255,.55)'; ctx.lineWidth = Math.max(0.8, wid * 0.22); ctx.stroke();
  }
  // bar
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(27 * DEG);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 4.6 * sc); g.addColorStop(0, 'rgba(255,226,175,.75)'); g.addColorStop(1, 'rgba(255,215,160,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 1.2 * sc, 4.6 * sc, 0, 0, 7); ctx.fill(); ctx.restore();
  // far side veil
  g = ctx.createLinearGradient(0, Y([0, 0.5]), 0, Y([0, 15]));
  g.addColorStop(0, 'rgba(7,10,18,0)'); g.addColorStop(1, 'rgba(7,10,18,.62)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, Y([0, 0.5]));
  // visible wedge
  const Sx = X(sun), Sy = Y(sun), Rw = 15 * sc;
  for (const [a, b] of (o.spans || [])) {
    ctx.beginPath(); ctx.moveTo(Sx, Sy);
    for (let l = a; l <= b; l += 2) { const d = dirL(l); ctx.lineTo(Sx + d[0] * Rw, Sy - d[1] * Rw); }
    const d = dirL(b); ctx.lineTo(Sx + d[0] * Rw, Sy - d[1] * Rw); ctx.closePath();
    g = ctx.createRadialGradient(Sx, Sy, 0, Sx, Sy, Rw); g.addColorStop(0, 'rgba(242,179,94,.62)'); g.addColorStop(0.35, 'rgba(242,179,94,.26)'); g.addColorStop(1, 'rgba(242,179,94,.04)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(242,179,94,.55)'; ctx.lineWidth = 1;
    for (const l of [a, b]) { if (b - a >= 360) break; const d2 = dirL(l); ctx.beginPath(); ctx.moveTo(Sx, Sy); ctx.lineTo(Sx + d2[0] * Rw * 0.55, Sy - d2[1] * Rw * 0.55); ctx.stroke(); }
  }
  // rays: zenith (ice) and selection (white)
  const ray = (l, b, col, len) => {
    const k = Math.cos(b * DEG), d = dirL(l), L = len * sc * Math.max(0.12, k);
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(Sx, Sy); ctx.lineTo(Sx + d[0] * L, Sy - d[1] * L); ctx.stroke(); ctx.setLineDash([]);
  };
  if (o.zen) ray(o.zen[0], o.zen[1], 'rgba(169,198,255,.9)', 9);
  if (o.ray) ray(o.ray[0], o.ray[1], 'rgba(255,255,255,.9)', 12);
  // labels and furniture
  const boxes = [];
  const put = (t, x, y, align = 'center') => {      // label with simple collision avoidance
    const tw = ctx.measureText(t).width, x0 = align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2;
    for (const dy of [0, -12, 12, -22, 22]) {
      const b = [x0 - 2, y + dy - 7, x0 + tw + 2, y + dy + 7];
      if (boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) continue;
      boxes.push(b); halo(ctx, t, x, y + dy, align); return;
    }
  };
  if (detail) {
    ctx.font = '600 11.5px "Instrument Sans", system-ui, sans-serif'; ctx.fillStyle = '#fff3c4'; put('You are here', Sx, Sy + 15);
    ctx.font = 'italic 500 12.5px Newsreader, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const a of ARMS) { ctx.fillStyle = 'rgba(205,218,250,.85)'; put(a.n, X(a.lab), Y(a.lab)); }
    ctx.font = '600 11.5px "Instrument Sans", system-ui, sans-serif';
    ctx.fillStyle = '#ffe2b0'; put('Galactic Center', cx, cy - 13);
    ctx.font = '500 10.5px "Instrument Sans", system-ui, sans-serif'; ctx.fillStyle = '#7d879b';
    put('Far side: poorly mapped, hidden behind the core', cx, Y([0, 10.2]));
    // naked-eye bubble
    ctx.strokeStyle = 'rgba(169,198,255,.55)'; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(Sx, Sy, Math.max(3, 0.92 * sc), 0, 7); ctx.stroke(); ctx.setLineDash([]);
    // sight lines from the Sun, labelled where they leave the disk
    ctx.font = '600 10.5px "Instrument Sans", system-ui, sans-serif';
    for (const [l, n] of [[0, 'Sagittarius'], [90, 'Cygnus'], [180, 'Auriga'], [270, 'Vela']]) {
      const d = dirL(l), Rr = 15.4, t = R0 * d[1] + Math.sqrt(R0 * R0 * d[1] * d[1] - R0 * R0 + Rr * Rr);
      const ex = Sx + d[0] * t * sc, ey = Sy - d[1] * t * sc;
      ctx.strokeStyle = 'rgba(242,179,94,.32)'; ctx.setLineDash([1, 4]); ctx.beginPath(); ctx.moveTo(Sx, Sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COL.amber;
      const txt = `${l}° ${n}`;
      if (l === 90) put(txt, 4, ey - 9, 'left');
      else if (l === 270) put(txt, w - 4, ey - 9, 'right');
      else put(txt, ex, l === 0 ? ey + 8 : ey - 8, 'center');
    }
    // rotation arrow
    ctx.strokeStyle = 'rgba(232,236,245,.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, 11.2 * sc, Math.PI / 2 + 0.22, Math.PI / 2 + 0.62); ctx.stroke();
    const ang = Math.PI / 2 + 0.62, ax = cx + Math.cos(ang) * 11.2 * sc, ay = cy + Math.sin(ang) * 11.2 * sc;
    ctx.fillStyle = 'rgba(232,236,245,.6)'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 7 * Math.cos(ang - 2.4), ay + 7 * Math.sin(ang - 2.4)); ctx.lineTo(ax + 7 * Math.cos(ang + 2.9), ay + 7 * Math.sin(ang + 2.9)); ctx.fill();
    ctx.fillStyle = '#8f99ae'; put('rotation', cx + Math.cos(ang + 0.15) * 12.6 * sc, cy + Math.sin(ang + 0.15) * 12.6 * sc);
    // scale bar: 10,000 ly
    const L = 10000 / LY_PER_KPC * sc, bx = 12, by = h - 14;
    ctx.strokeStyle = 'rgba(232,236,245,.6)'; ctx.beginPath(); ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by); ctx.lineTo(bx + L, by); ctx.lineTo(bx + L, by - 4); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#8f99ae'; ctx.fillText('10,000 light-years', bx, by - 11);
  }
  // object position
  if (o.mark) {
    const m = o.mark, d = dirL(m.l);
    if (m.d && m.d < 70000) {
      const k = m.d / LY_PER_KPC * Math.cos(m.b * DEG), px = Sx + d[0] * k * sc, py = Sy - d[1] * k * sc;
      ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Sx, Sy); ctx.lineTo(px, py); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(px, py, detail ? 4 : 3.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    } else {
      const L = 14.5 * sc, ex = Sx + d[0] * L * Math.max(0.15, Math.cos(m.b * DEG)), ey = Sy - d[1] * L * Math.max(0.15, Math.cos(m.b * DEG));
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(Sx, Sy); ctx.lineTo(ex, ey); ctx.stroke();
      const a = Math.atan2(ey - Sy, ex - Sx); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 7 * Math.cos(a - 0.45), ey - 7 * Math.sin(a - 0.45)); ctx.lineTo(ex - 7 * Math.cos(a + 0.45), ey - 7 * Math.sin(a + 0.45)); ctx.fill();
    }
  }
  // the Sun
  ctx.fillStyle = '#fff3c4'; ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(Sx, Sy, detail ? 3.8 : 2.8, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
}
function halo(ctx, t, x, y, align) {
  if (align) ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const f = ctx.fillStyle; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(7,10,18,.85)'; ctx.lineWidth = 3.2; ctx.strokeText(t, x, y); ctx.fillStyle = f; ctx.fillText(t, x, y);
}
function drawSide(cv, rays) {
  const { ctx, w, h } = prepCanvas(cv), y0 = h * 0.5, x0 = w * 0.3, R = h * 0.42;
  const g = ctx.createLinearGradient(0, y0 - 12, 0, y0 + 12);
  g.addColorStop(0, 'rgba(160,180,230,0)'); g.addColorStop(0.5, 'rgba(200,212,245,.38)'); g.addColorStop(1, 'rgba(160,180,230,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y0 - 12, w, 24);
  ctx.font = '500 11px "Instrument Sans", system-ui, sans-serif'; ctx.fillStyle = '#8f99ae'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText('north of the disk', 4, 9); ctx.fillText('south of the disk', 4, h - 9);
  halo(ctx, 'disk ~1,000 ly thick', 4, y0 - 20, 'left');
  for (const r of rays) {
    const a = r.b * DEG, ex = x0 + Math.cos(a) * R, ey = y0 - Math.sin(a) * R;
    ctx.strokeStyle = r.col; ctx.lineWidth = 1.8; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x0, y0, 20 + rays.indexOf(r) * 7, 0, -a, a > 0); ctx.stroke();
    ctx.fillStyle = r.col; ctx.font = '600 11.5px "Instrument Sans", system-ui, sans-serif';
    halo(ctx, `${r.name} ${r.b >= 0 ? '+' : '−'}${Math.abs(r.b).toFixed(0)}°`, ex + 6, clamp(ey + (rays.length > 1 && rays.indexOf(r) ? 12 : 0) * Math.sign(r.b - rays[0].b || 1), 10, h - 10), 'left');
  }
  ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(x0, y0, 3.6, 0, 7); ctx.fill();
  ctx.font = '500 11px "Instrument Sans", system-ui, sans-serif'; ctx.fillStyle = '#fff3c4'; halo(ctx, 'You', x0 - 10, y0 + 14, 'right');
}

/* ================= panel, card, header ================= */
const fmtL = x => x.toFixed(1) + '°';
const fmtB = x => (Math.abs(x) < 0.05 ? '' : x > 0 ? '+' : '−') + Math.abs(x).toFixed(1) + '°';
const fmtLy = d => d >= 1e6 ? (d / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' million ly' : Math.round(d).toLocaleString() + ' ly';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function altText(v) { const a = altOf(E.H, v), z = compass(azOf(E.H, v)); return a >= 0 ? `${Math.round(a)}° up · ${z}` : `Below the horizon (${Math.round(a)}°) · ${z}`; }

function refreshInfo() {
  ephem(); nightScan();
  const gcAlt = altOf(E.H, GCV), gcAz = compass(azOf(E.H, GCV)), acAlt = altOf(E.H, ACV), [lz, bz] = E.zen;
  const spans = planeSpans(), main = spans.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
  let head;
  if (gcAlt > 3) head = `The galaxy’s core is up, ${Math.round(gcAlt)}° high in the ${gcAz}.`;
  else if (gcAlt > -3) head = `The galaxy’s core is right on your ${gcAz} horizon.`;
  else if (acAlt > 3) head = 'You’re facing out of the galaxy. Its core is below your horizon.';
  else head = 'The Milky Way lies low around your horizon.';
  let span = '';
  if (main && main[1] - main[0] >= 360) span = 'The whole galactic plane is above your horizon.';
  else if (main) span = `Plane in view: ${planeCon(main[0] + 3)} to ${planeCon(main[1] - 3)}.`;
  $('sumHead').textContent = head;
  const ov = Math.abs(bz) >= 60 ? 'straight out of the disk' : Math.abs(bz) >= 30 ? 'steeply out of the disk' : Math.abs(bz) >= 10 ? 'at a slant through the disk' : 'along the disk';
  $('sumSub').textContent = `${span} Overhead: ${ov} (b ${fmtB(bz)}).`;
  drawGalaxy($('mini'), { spans, zen: E.zen });
  if (S.expanded) renderDetails(spans);
  if (S.sel) renderCard();
  renderStatus();
  renderHeader();
}
function renderDetails(spans) {
  spans = spans || planeSpans();
  const [lz, bz] = E.zen;
  $('dIntro').textContent = `This is the Milky Way seen from above its north pole, with the Sun about 26,000 light-years from the center. The amber wedge is the part of the galactic plane above your horizon from ${S.loc.name} at ${hhmm(S.t)}. Straight overhead you are looking ${lookDesc(bz)}. In visible light, dust limits how far you see along the plane to a few thousand light-years in most directions; the dashed circle around the Sun marks the few-thousand-light-year bubble that holds nearly every star you can see individually. The soft glow of the Milky Way is the combined light of stars much farther away.`;
  const ray = S.sel ? selGal() : null;
  drawGalaxy($('bigmap'), { spans, zen: E.zen, detail: true, ray: ray && S.sel.type === 'pt' ? ray : null, mark: ray && S.sel.type !== 'pt' ? markFor() : null });
  const rays = [{ name: 'Overhead', b: bz, col: '#a9c6ff' }];
  if (ray) rays.push({ name: selName(), b: ray[1], col: '#ffffff' });
  drawSide($('side'), rays);
  const ul = $('regions'); ul.innerHTML = '';
  for (const r of REGIONS) {
    let best = -90, bl = r.a; const span = (r.b - r.a + 360) % 360;
    for (let k = 0; k < span; k++) { const l = (r.a + k) % 360; if (E.planeAlt[l] > best) { best = E.planeAlt[l]; bl = l; } }
    const cls = best > 15 ? 'up' : best > 0 ? 'low' : '', txt = best > 15 ? `Up ${Math.round(best)}°` : best > 0 ? `Low ${Math.round(best)}°` : 'Below';
    const li = document.createElement('li');
    li.innerHTML = `<button><span class="rn">${esc(r.n)}</span><span class="badge ${cls}">${txt}</span><span class="rc">l ${r.a}°–${r.b}° · ${esc(r.cons.join(', '))}</span><span class="rd">${esc(r.d)}</span></button>`;
    li.firstChild.addEventListener('click', () => faceDir(GEQ[bl], true));
    ul.appendChild(li);
  }
}
function selGal() { const v = selVec(S.sel); return v ? toGal(v) : null; }
function selName() {
  const s = S.sel;
  if (s.type === 'obj') return OBJ[s.id].n.replace(/ \(.*\)/, '');
  if (s.type === 'star') return NAMED.get(s.i)?.n || 'Star';
  if (s.type === 'body') return s.id;
  if (s.type === 'tech') return TECH_BY[s.id].n;
  return 'Tapped point';
}
function markFor() {
  const s = S.sel, g = selGal(); if (!g) return null;
  if (s.type === 'obj') { const o = OBJ[s.id]; return o.d ? { l: g[0], b: g[1], d: o.d } : null; }
  if (s.type === 'star') { const nm = NAMED.get(s.i); const d = nm && nm.d ? parseFloat(nm.d.replace(/[~,]/g, '')) : null; return d ? { l: g[0], b: g[1], d } : null; }
  return null;
}
function renderCard() {
  const s = S.sel, v = selVec(s); if (!v) return;
  const [l, b] = toGal(v), reg = regionOf(l);
  let eyebrow = '', name = '', facts = [], text = '', where = '', story = null;
  const tech = s.type === 'tech' ? TECH_BY[s.id] : null;
  const rs = s.type === 'pt' || (tech && tech.t === 'sat') ? null : nextRiseSet(v, (s.type === 'body' && s.id === 'Moon') || (tech && tech.body === 'Moon'));
  const rsText = rs ? (rs.up ? (rs.set ? `Sets ${hhmm(rs.set)}` : 'Up all night') : (rs.rise ? `Rises ${hhmm(rs.rise)}` : 'Doesn’t rise today')) : null;
  if (s.type === 'obj') {
    const o = OBJ[s.id]; eyebrow = (o.kl || KIND[o.k]) + (o.c ? ' · ' + o.c : ''); name = o.n; text = o.t; story = STORIES[o.id];
    if (o.d) facts.push(`<b>${fmtLy(o.d)}</b> away`);
    if (o.k === 'gal' || o.k === 'pole' || o.id === 'apex') where = o.k === 'gal' ? 'Far outside the Milky Way; the arrow shows its direction from the Sun.' : 'This direction points out of the disk, so it barely shows on a top-down map.';
    else if (o.d) where = o.d < 1500 ? `Zoomed in around the Sun. At ${fmtLy(o.d)}, it sits almost on top of the Sun’s dot: our own small corner of the galaxy.` : o.d < 20000 ? `Zoomed in around the Sun: the dot is ${fmtLy(o.d)} away, among the nearby spiral arms.` : `Plotted on the map, ${fmtLy(o.d)} from the Sun.`;
    else where = 'The dashed line shows this direction from the Sun.';
  } else if (s.type === 'star') {
    const nm = NAMED.get(s.i), st = STARS[s.i];
    name = nm ? nm.n : `Star of magnitude ${st[2].toFixed(1)}`; eyebrow = 'Star' + (nm && nm.c ? ' · ' + nm.c : ''); story = nm && STORIES[nm.n];
    facts.push(`Magnitude <b>${st[2].toFixed(1)}</b>`);
    if (nm && nm.d) facts.push(`<b>${nm.d} ly</b> away`);
    const hue = st[3] < 0 ? 'blue-white' : st[3] < 0.3 ? 'white' : st[3] < 0.8 ? 'yellowish' : st[3] < 1.3 ? 'orange' : 'deep orange';
    text = `${hue === 'orange' ? 'An' : 'A'} ${hue} star. Like every star you can pick out by eye, it lies in our own small neighborhood of the galaxy, within a few thousand light-years.`;
    where = nm && nm.d ? `Zoomed in around the Sun. Even at ${nm.d} light-years, it sits deep inside our own corner of the galaxy.` : 'The dashed line shows its direction from the Sun.';
  } else if (s.type === 'body') {
    const bd = E.bodies.find(x => x.id === s.id); name = s.id; eyebrow = s.id === 'Sun' ? 'Star' : s.id === 'Moon' ? 'Moon' : 'Planet';
    if (s.id === 'Moon' && bd.frac != null) facts.push(`<b>${Math.round(bd.frac * 100)}%</b> lit`);
    if (bd.mag != null && s.id !== 'Sun') facts.push(`Magnitude <b>${bd.mag.toFixed(1)}</b>`);
    text = BODY_TEXT[s.id]; story = STORIES[s.id]; where = 'Solar System objects sit at the Sun’s dot on this scale. The line shows where they appear against the galaxy.';
  } else if (tech) {
    const x = techItems().find(x => x.it.id === s.id);
    eyebrow = tech.kl + (tech.c ? ' · ' + tech.c : ''); name = tech.full || tech.n; text = tech.d; story = tech.s;
    where = 'Everything we have launched is still inside the Sun’s dot on this map. The line shows the direction you look to see it.';
    if (tech.t === 'sat') {
      facts.push(`Height <b>${Math.round(x.height)} km</b>`, x.lit ? (E.sunAlt < -6 ? '<b>Sunlit: visible now</b>' : 'Sunlit, but the sky is too bright') : 'In Earth’s shadow');
      const np = nextPass(s.id), ps = np.vis;
      facts.push(ps ? `Next visible pass <b>${ps.start <= S.t ? 'now' : hhmm(ps.start)}</b>, up to ${Math.round(ps.max)}°, ${compass(ps.az0)} → ${compass(ps.az1)}`
        : np.any ? `No visible pass in 24 h; next one overhead ${hhmm(np.any.start)}, in daylight or Earth’s shadow` : 'Doesn’t rise above 10° from here in the next 24 h');
    } else if (tech.t === 'probe') {
      facts.push(`<b>${Math.round(x.d)} AU</b> from the Sun`, `Light takes <b>${(x.d * 499 / 3600).toFixed(1)} h</b> to reach it`, 'Approximate position');
      where = `About ${Math.round(x.d)} AU from the Sun, roughly 1/${Math.round(63241 / x.d)} of a light-year. On this map it is still inside the Sun’s dot; the line shows which way it is heading.`;
    } else if (tech.t === 'l2') facts.push('<b>1.5 million km</b> away');
    else if (tech.t === 'signal') {
      const ly = yearOf(S.t) - 1974.875;
      facts.push('Sent <b>16 Nov 1974</b>', `<b>${Math.round(ly)} light-years</b> out`);
      where = `The line points toward M13, 22,000 light-years away. The message has covered ${(ly / 220).toFixed(2)}% of the trip.`;
    }
  } else {
    eyebrow = 'Sky point'; name = reg && Math.abs(b) < 20 ? reg.n : Math.abs(b) >= 60 ? (b > 0 ? 'Toward the north galactic pole' : 'Toward the south galactic pole') : 'Out of the galactic plane';
    text = `Here you are looking ${lookDesc(b)}.` + (reg && Math.abs(b) < 20 ? ' ' + reg.d : '');
    const c = planeCon(l); if (Math.abs(b) < 12 && c) eyebrow += ' · near ' + c;
    where = 'The dashed line on the map is this direction from the Sun.';
  }
  facts.unshift(`<b>${esc(altText(v))}</b>`);
  if (rsText) facts.push(esc(rsText));
  facts.push(`Galactic <b>l ${fmtL(l)} b ${fmtB(b)}</b>`);
  $('card').innerHTML = `<div class="top"><div><div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(name)}</h2></div><button class="close" id="cardClose" aria-label="Close details"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="facts">${facts.map(f => `<span class="fact">${f}</span>`).join('')}</div>
    <p>${esc(text)}</p>
    ${story ? `<div class="story"><div class="eyebrow">Story</div>${story.map(p => `<p>${esc(p)}</p>`).join('')}</div>` : ''}
    <div class="where"><canvas id="cardMap" width="112" height="112"></canvas><p>${esc(where)}</p></div>`;
  $('cardClose').onclick = () => select(null);
  const m = markFor();
  let focus = null;
  if (m && m.d < 20000) {
    const dk = m.d / LY_PER_KPC * Math.cos(m.b * DEG), d2 = dirL(m.l);
    focus = { c: [d2[0] * dk / 2, -R0 + d2[1] * dk / 2], r: Math.max(2.4, dk / 2 + 1.4) };
  }
  drawGalaxy($('cardMap'), { spans: planeSpans(), focus, mark: m || (s.type === 'obj' && OBJ[s.id].k === 'gal' ? { l, b, d: OBJ[s.id].d } : null), ray: m ? null : [l, b] });
}
function renderStatus() {
  const st = $('status'); nightScan();
  const dark = spans(N.sun, a => a < -18), now = S.t;
  let cls, txt;
  if (E.sunAlt < -18) { cls = 'dark'; const sp = dark.find(([a, b]) => now >= a - 1 && now <= b + 1); txt = `<b>Dark sky</b>${sp && sp[1] < N.t0 + 144 * N.step - 1 ? ' until ' + hhmm(sp[1]) : ''}`; }
  else {
    const next = dark.find(([a]) => a > now);
    cls = E.sunAlt < -0.8 ? 'twi' : 'day';
    txt = `<b>${cls === 'twi' ? 'Twilight' : 'Daylight'}</b> · ${next ? 'dark at ' + hhmm(next[0]) : dark.length ? 'dark sky over for tonight' : 'no full darkness tonight'}`;
  }
  let moon = '';
  if (E.moonAlt != null) moon = `<span class="pill"><b>Moon</b> ${Math.round((E.moonFrac || 0) * 100)}% · ${E.moonAlt > 0 ? 'up' : 'down'}</span>`;
  const hint = S.view.mode === 'point' ? '<span class="pill">Drag sideways to line up with a star you know</span>'
    : hintShown ? '' : '<span class="pill" id="hint">Drag to turn · pinch to zoom · tap anything</span>';
  st.innerHTML = `<span class="pill ${cls}"><i></i>${txt}</span>${moon}${hint}`;
}
function renderHeader() {
  $('locName').textContent = S.loc.name;
  const ns = (S.loc.lat >= 0 ? 'N' : 'S'), ew = (S.loc.lon >= 0 ? 'E' : 'W');
  $('locSub').textContent = `${Math.abs(S.loc.lat).toFixed(1)}°${ns} ${Math.abs(S.loc.lon).toFixed(1)}°${ew}` + ''; if (S.loc.approx) $('locSub').textContent = 'From your time zone';
  $('timeMain').textContent = hhmm(S.t);
  $('timeSub').textContent = S.live ? 'Now' : dayLabel(S.t);
}

/* ================= interaction ================= */
let raf = 0, hintShown = store.get('hinted', false);
function req() { if (!raf) raf = requestAnimationFrame(frame); }
let lastFrame = 0, soonTimer = 0;
function reqSoon() {          // sensor events arrive at ~60 Hz; redraw at most every 25 ms
  if (raf || soonTimer) return;
  const dt = performance.now() - lastFrame;
  if (dt >= 25) req(); else soonTimer = setTimeout(() => { soonTimer = 0; req(); }, 25 - dt);
}
function frame() { raf = 0; lastFrame = performance.now(); resize(); ephem(); setupView(); drawGL(); drawOverlay(); }
let infoRaf = 0;
function info() { if (!infoRaf) infoRaf = requestAnimationFrame(() => { infoRaf = 0; refreshInfo(); }); }

function select(sel) {
  S.sel = sel;
  $('card').hidden = !sel; $('summary').hidden = !!sel;
  if (sel) { setExpanded(false); renderCard(); $('pscroll').scrollTop = 0; }
  if (S.expanded) renderDetails();
  req();
}
function setExpanded(x) {
  S.expanded = x; $('app').classList.toggle('expanded', x); $('details').hidden = !x;
  if (x) { if (S.sel) { $('card').hidden = true; } $('summary').hidden = false; requestAnimationFrame(() => renderDetails()); }
  else if (S.sel) { $('card').hidden = false; $('summary').hidden = true; }
}
function setMode(m) {
  if (m !== 'point') stopPoint();
  S.view.mode = m; store.set('mode', m);
  $('vDome').setAttribute('aria-pressed', m === 'dome'); $('vHor').setAttribute('aria-pressed', m === 'horizon'); $('vPoint').setAttribute('aria-pressed', m === 'point');
  $('faceSeg').hidden = m === 'point';
  S.view.k = 1; S.view.ox = S.view.oy = 0; req(); syncFace(); if (E.key) renderStatus();
}
function syncFace() {
  for (const b of document.querySelectorAll('[data-face]')) {
    const d = Math.abs(((S.view.yaw - +b.dataset.face) % 360 + 540) % 360 - 180);
    b.setAttribute('aria-pressed', d < 1);
  }
}
function faceDir(v, collapse) {
  ephem();
  if (S.view.mode === 'point') { if (collapse) setExpanded(false); return; }
  S.view.yaw = azOf(E.H, v);
  if (S.view.mode === 'horizon') S.view.hpitch = clamp(altOf(E.H, v), 5, 70);
  else { S.view.k = 1; S.view.ox = S.view.oy = 0; }
  if (collapse) setExpanded(false);
  syncFace(); req();
}
function onTime() { ephem(); info(); req(); }
function setLoc(loc) {
  S.loc = loc; store.set('loc', loc); E.key = ''; N.key = ''; closeSheet(); onTime();
}

/* gestures */
const ptrs = new Map(); let G = null, lastTap = 0;
const local = e => { const r = sky.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
sky.addEventListener('pointerdown', e => {
  if (e.target.closest('.viewctl')) return;
  sky.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, local(e));
  if (!hintShown) { hintShown = true; store.set('hinted', true); const h = $('hint'); if (h) h.remove(); }
  if (ptrs.size === 1) { const [x, y] = local(e); G = { one: true, x0: x, y0: y, lx: x, ly: y, t0: performance.now(), moved: false }; }
  else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    G = { one: false, d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], k0: S.view.k, ox0: S.view.ox, oy0: S.view.oy, fov0: S.view.fov, pfov0: S.view.pfov, moved: true };
  }
});
sky.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId) || !G) return;
  ptrs.set(e.pointerId, local(e));
  const v = S.view;
  if (G.one && ptrs.size === 1) {
    const [x, y] = local(e), dx = x - G.lx, dy = y - G.ly;
    if (Math.hypot(x - G.x0, y - G.y0) > 7) G.moved = true;
    if (!G.moved) return;
    if (v.mode === 'dome' && v.k <= 1.02) {
      const r0 = Math.hypot(G.lx - F.cx, G.ly - F.cy);
      if (r0 > 28) v.yaw += (Math.atan2(y - F.cy, x - F.cx) - Math.atan2(G.ly - F.cy, G.lx - F.cx)) * RAD;
      else v.yaw += dx * 0.4;
      v.yaw = (v.yaw % 360 + 360) % 360;
    } else if (v.mode === 'dome') {
      v.ox = clamp(v.ox + dx, -F.s, F.s); v.oy = clamp(v.oy + dy, -F.s, F.s);
    } else if (v.mode === 'point') {
      DEV.hdg = ((DEV.hdg - dx * 2 / F.s * RAD) % 360 + 540) % 360 - 180;    // compass / declination trim
    } else {
      v.yaw = ((v.yaw - dx * 2 / F.s * RAD) % 360 + 360) % 360; v.hpitch = clamp(v.hpitch + dy * 2 / F.s * RAD, -15, 90);
    }
    G.lx = x; G.ly = y; syncFace(); req();
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), ratio = d / G.d0, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (v.mode === 'dome') {
      const k = clamp(G.k0 * ratio, 1, 9), s0 = F.R0 * G.k0, s1 = F.R0 * k;
      const X = (G.m0[0] - F.bcx - G.ox0) / s0, Y = (G.m0[1] - F.bcy - G.oy0) / s0;
      v.k = k; v.ox = m[0] - F.bcx - s1 * X; v.oy = m[1] - F.bcy - s1 * Y;
      if (k < 1.03) { v.k = 1; v.ox = v.oy = 0; }
      v.ox = clamp(v.ox, -F.R0 * k, F.R0 * k); v.oy = clamp(v.oy, -F.R0 * k, F.R0 * k);
    } else if (v.mode === 'point') v.pfov = clamp(G.pfov0 / ratio, 18, 140);
    else v.fov = clamp(G.fov0 / ratio, 18, 160);
    req();
  }
});
const endPtr = e => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (G && G.one && !G.moved && e.type === 'pointerup' && performance.now() - G.t0 < 600) {
    const now = performance.now();
    if (now - lastTap < 320) { resetZoom(); lastTap = 0; } else { lastTap = now; tap(G.x0, G.y0); }
  }
  if (ptrs.size === 0) { G = null; if (S.view.mode === 'point') store.set('hdgOff', DEV.hdg); }
  else if (ptrs.size === 1) { const [p] = [...ptrs.values()]; G = { one: true, x0: p[0], y0: p[1], lx: p[0], ly: p[1], t0: 0, moved: true }; }
};
sky.addEventListener('pointerup', endPtr); sky.addEventListener('pointercancel', endPtr);
sky.addEventListener('wheel', e => {
  e.preventDefault(); const v = S.view, f = Math.exp(-e.deltaY * 0.0015);
  if (v.mode === 'dome') {
    const [mx, my] = local(e), k = clamp(v.k * f, 1, 9), s0 = F.R0 * v.k, X = (mx - F.bcx - v.ox) / s0, Y = (my - F.bcy - v.oy) / s0;
    v.ox = mx - F.bcx - F.R0 * k * X; v.oy = my - F.bcy - F.R0 * k * Y; v.k = k;
    if (k < 1.03) { v.k = 1; v.ox = v.oy = 0; }
  } else if (v.mode === 'point') v.pfov = clamp(v.pfov / f, 18, 140);
  else v.fov = clamp(v.fov / f, 18, 160);
  req();
}, { passive: false });
function resetZoom() { S.view.k = 1; S.view.ox = S.view.oy = 0; S.view.fov = 100; S.view.pfov = 70; req(); }
function tap(x, y) {
  let best = null, bs = 1e9;
  for (const h of hits) { const d = Math.hypot(h.x - x, h.y - y); if (d < 26) { const s = d - h.pri * 6; if (s < bs) { bs = s; best = h; } } }
  if (best) return select(best.sel);
  const v = norm(unproj(x, y));
  if (S.view.mode === 'dome' && dot(E.H[2], v) < -0.2) return select(null);
  select({ type: 'pt', v });
}

/* sheets */
let openSheetEl = null;
function openSheet(id) { closeSheet(); openSheetEl = $(id); openSheetEl.hidden = false; $('scrim').hidden = false; }
function closeSheet() { if (openSheetEl) openSheetEl.hidden = true; openSheetEl = null; $('scrim').hidden = true; }
$('scrim').addEventListener('click', closeSheet);
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (openSheetEl) closeSheet(); else if (S.expanded) setExpanded(false); else if (S.sel) select(null); } });

// location sheet
const nrm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CITY_N = DATA.cities.map(c => nrm(c[0]));
function searchCities(q) {
  const [name, rest] = nrm(q).split(',').map(s => (s || '').trim());
  if (!name || name.length < 2) return [];
  const pre = [], sub = [];
  for (let i = 0; i < CITY_N.length && pre.length < 8; i++) {
    const n = CITY_N[i];
    if (!(n.startsWith(name) || n.includes(name))) continue;
    if (rest && !nrm(cityRegion(DATA.cities[i]) + ' ' + DATA.cities[i][1]).includes(rest)) continue;
    (n.startsWith(name) ? pre : sub).push(i);
  }
  return pre.concat(sub).slice(0, 8);
}
function renderResults() {
  const q = $('citySearch').value, ul = $('cityResults'); ul.innerHTML = '';
  const m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (m) {
    const li = document.createElement('li'); li.innerHTML = `<button><b>Use ${esc(m[1])}, ${esc(m[2])}</b><small>Coordinates as typed (latitude, longitude)</small></button>`;
    li.firstChild.onclick = () => setCoords(+m[1], +m[2]); ul.appendChild(li); return;
  }
  for (const i of searchCities(q)) {
    const c = DATA.cities[i], li = document.createElement('li');
    li.innerHTML = `<button><b>${esc(c[0])}</b><small>${esc(cityRegion(c))} · ${Math.abs(c[2]).toFixed(1)}°${c[2] >= 0 ? 'N' : 'S'} ${Math.abs(c[3]).toFixed(1)}°${c[3] >= 0 ? 'E' : 'W'}</small></button>`;
    li.firstChild.onclick = () => setLoc(cityLoc(c, false)); ul.appendChild(li);
  }
  if (q.trim().length >= 2 && !ul.children.length) ul.innerHTML = '<li class="note" style="padding:10px 2px">No large city by that name. Try a nearby bigger city, or enter coordinates below.</li>';
}
const coordName = (lat, lon) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
function useGPS(auto) {
  const err = $('gpsErr'), btn = $('gpsBtn');
  const done = () => { btn.disabled = false; btn.textContent = 'Use my location'; };
  const fail = msg => { done(); if (!auto) { err.hidden = false; err.textContent = msg; } };
  if (!navigator.geolocation) return fail('Location isn’t available here. Pick a city instead.');
  if (!auto) { err.hidden = true; btn.disabled = true; btn.textContent = 'Finding you…'; }
  navigator.geolocation.getCurrentPosition(p => {
    done();
    const lat = p.coords.latitude, lon = p.coords.longitude, { c, km } = nearestCity(lat, lon);
    setLoc({ name: km < 150 ? 'Near ' + c[0] : coordName(lat, lon), region: '', lat: +lat.toFixed(3), lon: +lon.toFixed(3), tz: fixTz(DATA.tzs[c[4]]), approx: false, gps: true });
  }, e => fail(e.code === 1 ? 'Location isn’t available here (access is blocked). Pick a city instead.' : 'Couldn’t get your location right now. Pick a city instead.'),
  { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
}
function setCoords(lat, lon) {
  const err = $('coordErr');
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { err.hidden = false; err.textContent = 'Latitude must be between −90 and 90, and longitude between −180 and 180.'; return; }
  err.hidden = true;
  const { c, km } = nearestCity(lat, lon);
  setLoc({ name: coordName(lat, lon), region: km < 150 ? 'near ' + c[0] : '', lat, lon, tz: fixTz(DATA.tzs[c[4]]), approx: false });
}
$('citySearch').addEventListener('input', renderResults);
$('coordSet').addEventListener('click', () => setCoords(parseFloat($('latIn').value), parseFloat($('lonIn').value)));
$('gpsBtn').addEventListener('click', () => useGPS(false));
$('locBtn').addEventListener('click', () => { $('gpsErr').hidden = true; openSheet('sheetLoc'); $('citySearch').value = ''; renderResults(); $('latIn').value = S.loc.lat; $('lonIn').value = S.loc.lon; });

// time sheet
function syncTimeSheet() {
  const nd = nightDateFor(S.t), t0 = nightStart(nd);
  $('tRange').value = Math.round((S.t - t0) / 60000);
  $('tDate').value = `${nd.y}-${String(nd.m).padStart(2, '0')}-${String(nd.d).padStart(2, '0')}`;
  $('tBig').innerHTML = `${hhmm(S.t)}<small>${esc(dayLabel(S.t))}${S.live ? ' · now' : ''}</small>`;
  nightScan();
  const dark = spans(N.sun, a => a < -18), astro = spans(N.sun, a => a < -12);
  const core = spans(N.gc, a => a > 10);
  const best = []; for (const [a, b] of dark) for (const [c, d] of core) { const s = Math.max(a, c), e = Math.min(b, d); if (e - s > 600000) best.push([s, e]); }
  const rows = [
    ['Full darkness', dark.length ? spanText(dark) : astro.length ? 'none; twilight all night' : 'none tonight'],
    ['Galactic core above 10°', core.length ? spanText(core) : 'not tonight from here'],
    ['Best core viewing (dark + up)', best.length ? spanText(best) : '—']
  ];
  if (N.moon.length) {
    const up = spans(N.moon, a => a > 0);
    rows.push(['Moon above horizon', up.length ? spanText(up) : 'down all night'], ['Moon lit', N.moonFrac != null ? Math.round(N.moonFrac * 100) + '%' : '—']);
  }
  $('nightInfo').innerHTML = rows.map(([a, b]) => `<div class="nrow"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('');
}
function setT(t, live) { S.t = t; S.live = live; onTime(); syncTimeSheet(); }
$('timeBtn').addEventListener('click', () => { openSheet('sheetTime'); syncTimeSheet(); });
$('tRange').addEventListener('input', e => setT(nightStart(nightDateFor(S.t)) + e.target.value * 60000, false));
$('tNow').addEventListener('click', () => setT(Date.now(), true));
$('tMinus').addEventListener('click', () => setT(S.t - 3600000, false));
$('tPlus').addEventListener('click', () => setT(S.t + 3600000, false));
$('tDate').addEventListener('change', e => {
  const m = e.target.value.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return;
  const off = S.t - nightStart(nightDateFor(S.t));
  setT(nightStart({ y: +m[1], m: +m[2], d: +m[3] }) + off, false);
});

// layers sheet
const LAYERS = [
  ['lines', 'Constellation lines', ''], ['cnames', 'Constellation names', ''], ['snames', 'Star names', 'More names appear as you zoom in'],
  ['dso', 'Nebulae, clusters and galaxies', 'Galactic landmarks always stay on'], ['planets', 'Sun, Moon and planets', AE ? '' : 'Unavailable: the ephemeris library did not load'],
  ['grid', 'Galactic grid', 'Galactic latitude ±10° and longitude every 30°'],
  ['tech', 'Human-made objects', 'Space stations, Hubble, deep-space probes, landers and the Arecibo message']
];
$('toggles').innerHTML = LAYERS.map(([k, t, s]) => `<label><span>${esc(t)}${s ? `<small>${esc(s)}</small>` : ''}</span><input type="checkbox" id="ly_${k}" ${S.layers[k] ? 'checked' : ''}></label>`).join('');
for (const [k] of LAYERS) $('ly_' + k).addEventListener('change', e => {
  S.layers[k] = e.target.checked; store.set('layers', S.layers);
  if (k === 'tech' && S.layers.tech) { ensureSats(); if (SAT.state === 'failed') satFail(); }
  req();
});
$('layersBtn').addEventListener('click', () => openSheet('sheetLayers'));

// red mode, view controls, panel
function setRed(x) { S.red = x; store.set('red', x); $('red').hidden = !x; $('redBtn').setAttribute('aria-pressed', x); }
$('redBtn').addEventListener('click', () => setRed(!S.red));
$('vDome').addEventListener('click', () => setMode('dome'));
$('vHor').addEventListener('click', () => setMode('horizon'));
$('vPoint').addEventListener('click', () => startPoint());
for (const b of document.querySelectorAll('[data-face]')) b.addEventListener('click', () => {
  S.view.yaw = +b.dataset.face; if (S.view.mode === 'dome') resetZoom(); syncFace(); req();
});
$('summary').addEventListener('click', () => setExpanded(true));
$('grab').addEventListener('click', () => { if (S.sel && !S.expanded) select(null); else setExpanded(!S.expanded); });

/* layout */
new ResizeObserver(() => {
  const h = $('summary').offsetHeight + 30;
  if (h > 60 && !S.expanded && !S.sel && Math.abs(h - reserve) > 2) { reserve = h; $('app').style.setProperty('--reserve', h + 'px'); }
  req();
}).observe(sky);
new ResizeObserver(() => {
  if (S.expanded || S.sel) return;
  const h = $('panel').offsetHeight;
  if (h > 60 && Math.abs(h - reserve) > 2) { reserve = h; $('app').style.setProperty('--reserve', h + 'px'); req(); }
}).observe($('panel'));
window.addEventListener('resize', () => { req(); if (S.expanded) renderDetails(); });

/* boot */
if (navigator.permissions && navigator.geolocation && (S.loc.approx || S.loc.gps)) {
  navigator.permissions.query({ name: 'geolocation' }).then(r => { if (r.state === 'granted') useGPS(true); }).catch(() => {});
}
initGL();
if (S.layers.tech) ensureSats();
setRed(S.red);
setMode(S.view.mode);
refreshInfo(); req();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { req(); info(); });
setInterval(() => { if (S.live) { S.t = Date.now(); onTime(); if (openSheetEl && openSheetEl.id === 'sheetTime') syncTimeSheet(); } }, 30000);
setInterval(() => {         // satellites cross the sky in minutes: keep them moving while the layer is on
  if (!S.live || !S.layers.tech || SAT.state !== 'ready' || document.hidden) return;
  S.t = Date.now(); req();
  if (S.sel && S.sel.type === 'tech' && TECH_BY[S.sel.id].t === 'sat' && !S.expanded) renderCard();
}, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.live) { S.t = Date.now(); onTime(); } });
})();

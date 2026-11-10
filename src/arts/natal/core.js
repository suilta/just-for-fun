/**
 * 西方占星本命盘：出生地时区换算（含历史夏令时）→ 恒星时 → 上升、天顶 → 分宫 → 行星黄经 → 相位 → 元素与模式统计。
 * 行星位置用 astronomy-engine（VSOP87 / ELP 截断，视位置，误差约 1 角分以内）；宫位与交点按标准公式自算。
 * 只排盘，不解盘；每一步的中间结果写进 steps，供页面做分阶段动画。
 */
import * as A from 'astronomy-engine';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const mod = (x, n = 360) => ((x % n) + n) % n;
const sind = (x) => Math.sin(x * D2R), cosd = (x) => Math.cos(x * D2R), tand = (x) => Math.tan(x * D2R);
const atan2d = (y, x) => Math.atan2(y, x) * R2D, asind = (x) => Math.asin(Math.max(-1, Math.min(1, x))) * R2D;
/** 有向角差，范围 (-180, 180] */
export const angDiff = (a, b) => { const d = mod(a - b); return d > 180 ? d - 360 : d; };

export const SIGNS = [
  { zh: '白羊', en: 'Aries', el: '火', mod: '基本' }, { zh: '金牛', en: 'Taurus', el: '土', mod: '固定' }, { zh: '双子', en: 'Gemini', el: '风', mod: '变动' },
  { zh: '巨蟹', en: 'Cancer', el: '水', mod: '基本' }, { zh: '狮子', en: 'Leo', el: '火', mod: '固定' }, { zh: '处女', en: 'Virgo', el: '土', mod: '变动' },
  { zh: '天秤', en: 'Libra', el: '风', mod: '基本' }, { zh: '天蝎', en: 'Scorpio', el: '水', mod: '固定' }, { zh: '射手', en: 'Sagittarius', el: '火', mod: '变动' },
  { zh: '摩羯', en: 'Capricorn', el: '土', mod: '基本' }, { zh: '水瓶', en: 'Aquarius', el: '风', mod: '固定' }, { zh: '双鱼', en: 'Pisces', el: '水', mod: '变动' },
];

export const PLANETS = [
  { key: 'sun', zh: '太阳', s: '日', en: 'Sun', body: 'Sun' },
  { key: 'moon', zh: '月亮', s: '月', en: 'Moon', body: 'Moon' },
  { key: 'mercury', zh: '水星', s: '水', en: 'Mercury', body: 'Mercury' },
  { key: 'venus', zh: '金星', s: '金', en: 'Venus', body: 'Venus' },
  { key: 'mars', zh: '火星', s: '火', en: 'Mars', body: 'Mars' },
  { key: 'jupiter', zh: '木星', s: '木', en: 'Jupiter', body: 'Jupiter' },
  { key: 'saturn', zh: '土星', s: '土', en: 'Saturn', body: 'Saturn' },
  { key: 'uranus', zh: '天王星', s: '天', en: 'Uranus', body: 'Uranus' },
  { key: 'neptune', zh: '海王星', s: '海', en: 'Neptune', body: 'Neptune' },
  { key: 'pluto', zh: '冥王星', s: '冥', en: 'Pluto', body: 'Pluto' },
];
export const POINTS = {
  node: { key: 'node', zh: '北交点', s: '北', en: 'North Node' },
  snode: { key: 'snode', zh: '南交点', s: '南', en: 'South Node' },
  lilith: { key: 'lilith', zh: '莉莉丝', s: '莉', en: 'Black Moon Lilith (mean)' },
  pof: { key: 'pof', zh: '福点', s: '福', en: 'Part of Fortune' },
  asc: { key: 'asc', zh: '上升', s: '升', en: 'Ascendant' },
  mc: { key: 'mc', zh: '天顶', s: '顶', en: 'Midheaven' },
};

// 守护星：现代（天蝎冥王、水瓶天王、双鱼海王）与古典
const RULER_MODERN = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'pluto', 'jupiter', 'saturn', 'uranus', 'neptune'];
const RULER_TRAD = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];

export const ASPECTS = [
  { a: 0, zh: '合相', en: 'Conjunction', major: true, tone: 'conj' },
  { a: 60, zh: '六分相', en: 'Sextile', major: true, tone: 'soft' },
  { a: 90, zh: '四分相', en: 'Square', major: true, tone: 'hard' },
  { a: 120, zh: '三分相', en: 'Trine', major: true, tone: 'soft' },
  { a: 180, zh: '对分相', en: 'Opposition', major: true, tone: 'hard' },
  { a: 30, zh: '十二分相', en: 'Semi-sextile', tone: 'minor' },
  { a: 45, zh: '八分相', en: 'Semi-square', tone: 'minor' },
  { a: 135, zh: '八分之三相', en: 'Sesquiquadrate', tone: 'minor' },
  { a: 150, zh: '梅花相', en: 'Quincunx', tone: 'minor' },
  { a: 72, zh: '五分相', en: 'Quintile', tone: 'minor' },
  { a: 144, zh: '倍五分相', en: 'Biquintile', tone: 'minor' },
];
// 容许度：[合/冲, 刑/拱, 六合, 次要相位]，日月另加
export const ORBS = {
  standard: { main: [8, 7, 5, 2], lum: 2 },
  tight: { main: [6, 5, 4, 1.5], lum: 1 },
  wide: { main: [10, 8, 6, 3], lum: 2 },
};

export const HOUSE_NAMES = { P: 'Placidus', K: 'Koch', R: 'Regiomontanus', C: 'Campanus', O: 'Porphyry', E: '等宫制 Equal', W: '整宫制 Whole Sign' };
export const DEFAULT_OPTS = { house: 'P', zodiac: 'tropical', node: 'true', orbs: 'standard', minor: false, extra: false, rulers: 'modern', pofSect: true };

// ── 时区：钟表时间 → UTC（用浏览器自带的 IANA 时区库，含各地历史夏令时）──
const fmtCache = {};
function zoneOffsetSec(ms, tz) {
  const m = /^UTC([+-])(\d{1,2})(?::(\d\d))?$/.exec(tz);
  if (m) return (m[1] === '-' ? -1 : 1) * (+m[2] * 3600 + (+m[3] || 0) * 60);
  const f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }));
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const d = new Date(0); d.setUTCFullYear(+p.year, +p.month - 1, +p.day); d.setUTCHours(+p.hour % 24, +p.minute, +p.second, 0);
  return Math.round((d.getTime() - Math.floor(ms / 1000) * 1000) / 1000);
}
const wallMs = (y, m, d, h, mi) => { const t = new Date(0); t.setUTCFullYear(y, m - 1, d); t.setUTCHours(h, mi, 0, 0); return t.getTime(); };

/** 返回 { utcMs, offset(秒), dst, gap, ambiguous } */
export function localToUtc(y, m, d, h, mi, tz) {
  const L = wallMs(y, m, d, h, mi);
  const cands = new Set();
  for (const probe of [-14, -3, 0, 3, 14]) { const off = zoneOffsetSec(L + probe * 3600e3, tz); if (zoneOffsetSec(L - off * 1000, tz) === off) cands.add(off); }
  let offs = [...cands].sort((a, b) => b - a); // 偏移大的先（夏令时那一次）
  let gap = false;
  // 空档（拨快的那一小时）：按拨快前的偏移换算，即顺延到拨快后的对应时刻
  if (!offs.length) { gap = true; offs = [zoneOffsetSec(L - zoneOffsetSec(L, tz) * 1000 - 6 * 3600e3, tz)]; }
  const offset = offs[0], utcMs = L - offset * 1000;
  const yr = new Date(utcMs).getUTCFullYear();
  const std = Math.min(zoneOffsetSec(wallMs(yr, 1, 15, 12, 0), tz), zoneOffsetSec(wallMs(yr, 7, 15, 12, 0), tz));
  return { utcMs, offset, dst: offset > std, gap, ambiguous: offs.length > 1, std };
}
export const fmtOffset = (s) => { const a = Math.abs(s), h = Math.floor(a / 3600), mi = Math.floor((a % 3600) / 60), se = a % 60;
  return `UTC${s < 0 ? '−' : '+'}${h}${mi || se ? ':' + String(mi).padStart(2, '0') : ''}${se ? ':' + String(se).padStart(2, '0') : ''}`; };

// ── 天文量 ──
const lonOf = (body, t) => { const e = A.Ecliptic(A.GeoVector(body, t, true)); return { lon: mod(e.elon), lat: e.elat }; };
const T = (t) => t.tt / 36525;
function meanNode(t) { const c = T(t); return mod(125.0445479 - 1934.1362891 * c + 0.0020754 * c * c + c * c * c / 467441 - c ** 4 / 60616000 + A.e_tilt(t).dpsi / 3600); }
/** 真交点：月球瞬时（密切）轨道与黄道的升交点，由月球的位置、速度矢量求出 */
function trueNode(t) {
  const s = A.RotateState(A.Rotation_EQJ_ECT(t), A.GeoMoonState(t));
  const hx = s.y * s.vz - s.z * s.vy, hy = s.z * s.vx - s.x * s.vz;
  return mod(atan2d(hx, -hy));
}
function meanLilith(t) { const c = T(t); return mod(83.3532465 + 4069.0137287 * c - 0.01032 * c * c - c ** 3 / 80053 + c ** 4 / 18999000 + 180 + A.e_tilt(t).dpsi / 3600); }

// 恒星黄道：岁差改正（ayanamsa）。起点数值同 Swiss Ephemeris，向前后用 IAU 1976 一般岁差推算
const precLon = (jdTT) => { const c = (jdTT - 2451545) / 36525; return (5029.0966 * c + 1.11113 * c * c - 0.000006 * c ** 3) / 3600; };
export const AYANAMSA = {
  lahiri: { zh: '拉希里（印度官方）', t0: 2435553.5, v0: 23.245524743 },
  fagan: { zh: '费根-布拉德利（西方恒星派）', t0: 2433282.42346, v0: 24.042044444 },
};
export function ayanamsa(kind, t) { const a = AYANAMSA[kind]; return a.v0 + precLon(t.tt + 2451545) - precLon(a.t0); }

// ── 宫位 ──
/** 在“极高”为 P 的圈上、斜升为 R+90 的黄道点；P 取当地纬度时就是上升点 */
const ascOf = (R, P, eps) => mod(atan2d(cosd(R), -(sind(R) * cosd(eps) + tand(P) * sind(eps))));
const mcOf = (R, eps) => mod(atan2d(sind(R), cosd(R) * cosd(eps)));
const raToLon = (ra, eps) => mod(atan2d(sind(ra), cosd(ra) * cosd(eps)));
const decOf = (lon, eps) => asind(sind(eps) * sind(lon));
/** 昼半弧（度）；极圈内不升或不落时返回 null */
const dsa = (dec, phi) => { const x = tand(phi) * tand(dec); return Math.abs(x) > 1 ? null : 90 + asind(x); };

export function houseCusps(sys, ramc, phi, eps) {
  const asc = ascOf(ramc, phi, eps), mc = mcOf(ramc, eps);
  const c = new Array(13);
  c[1] = asc; c[10] = mc;
  const polar = Math.abs(phi) >= 90 - eps;
  let used = sys, note = '';
  if ((sys === 'P' || sys === 'K') && polar) { used = 'O'; note = `出生地纬度 ${Math.abs(phi).toFixed(2)}° 在极圈内，${HOUSE_NAMES[sys]} 宫制无法成立，已改用 Porphyry。`; }
  if (used === 'E' || used === 'W') {
    const base = used === 'E' ? asc : Math.floor(asc / 30) * 30;
    for (let i = 1; i <= 12; i++) c[i] = mod(base + (i - 1) * 30);
    return { cusps: c, asc, mc, used, note };
  }
  if (used === 'O') {
    const q1 = mod(asc - mc), q2 = mod(mc + 180 - asc); // 10→1 与 1→4 的黄经跨度
    c[11] = mod(mc + q1 / 3); c[12] = mod(mc + 2 * q1 / 3); c[2] = mod(asc + q2 / 3); c[3] = mod(asc + 2 * q2 / 3);
  } else if (used === 'P') {
    // 普拉西度：按各点自身的昼（夜）半弧三等分时间
    const solve = (house, f) => {
      let lon = mod(mc + (house === 11 ? 30 : house === 12 ? 60 : house === 2 ? 120 : 150));
      for (let it = 0; it < 60; it++) {
        const D = dsa(decOf(lon, eps), phi); if (D == null) return null;
        const ra = house > 6 ? ramc + f * D : ramc + D + f * (180 - D);
        const nl = raToLon(ra, eps);
        if (Math.abs(angDiff(nl, lon)) < 1e-9) { lon = nl; break; }
        lon = nl;
      }
      return lon;
    };
    c[11] = solve(11, 1 / 3); c[12] = solve(12, 2 / 3); c[2] = solve(2, 1 / 3); c[3] = solve(3, 2 / 3);
  } else if (used === 'K') {
    // 科赫：把天顶度数从升起到中天的时间三等分，各时刻的上升点即宫头
    const D = dsa(decOf(mc, eps), phi);
    c[11] = ascOf(ramc - 2 * D / 3, phi, eps); c[12] = ascOf(ramc - D / 3, phi, eps);
    c[2] = ascOf(ramc + D / 3, phi, eps); c[3] = ascOf(ramc + 2 * D / 3, phi, eps);
  } else if (used === 'R') {
    // 雷格蒙塔努斯：天赤道从天顶起每 30° 一分，过南北点投到黄道
    const cusp = (H) => ascOf(ramc + H - 90, atan2d(tand(phi) * sind(H), 1), eps);
    c[11] = cusp(30); c[12] = cusp(60); c[2] = cusp(120); c[3] = cusp(150);
  } else if (used === 'C') {
    // 坎帕努斯：卯酉圈（东西向的地平高度圈）每 30° 一分
    const cusp = (H) => { const A0 = mod(atan2d(sind(H) * cosd(phi), cosd(H))); return ascOf(ramc + A0 - 90, asind(sind(phi) * sind(H)), eps); };
    c[11] = cusp(30); c[12] = cusp(60); c[2] = cusp(120); c[3] = cusp(150);
  }
  if ([11, 12, 2, 3].some((i) => c[i] == null)) { return houseCusps('O', ramc, phi, eps); }
  for (let i = 4; i <= 9; i++) c[i] = mod(c[i <= 6 ? i + 6 : i - 6] + 180);
  return { cusps: c, asc, mc, used, note };
}

export function houseOf(lon, cusps) {
  for (let i = 1; i <= 12; i++) {
    const a = cusps[i], b = cusps[i === 12 ? 1 : i + 1];
    if (mod(lon - a) < mod(b - a)) return i;
  }
  return 1;
}

export const signOf = (lon) => Math.floor(mod(lon) / 30);
/** 黄经写成“星座 度°分′” */
export function fmtLon(lon, withEn = false) {
  const L = mod(lon); let s = Math.floor(L / 30), x = L - s * 30, dd = Math.floor(x), mm = Math.round((x - dd) * 60);
  if (mm === 60) { mm = 0; dd += 1; if (dd === 30) { dd = 0; s = (s + 1) % 12; } }
  return `${SIGNS[s].zh}${withEn ? ' ' + SIGNS[s].en : ''} ${dd}°${String(mm).padStart(2, '0')}′`;
}
const fmtDeg = (x) => { const dd = Math.floor(x), mm = Math.round((x - dd) * 60); return mm === 60 ? `${dd + 1}°00′` : `${dd}°${String(mm).padStart(2, '0')}′`; };
const pad = (n) => String(n).padStart(2, '0');
const fmtUtc = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const fmtHours = (h) => { const s = Math.round(mod(h, 24) * 3600) % 86400; return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };

/**
 * 起盘。place = { lat, lon, tz, name }；timeKnown=false 时按当地正午排，不排宫位与上升。
 * 也可用 utcMs 直接指定 UTC 时刻（测试用）。
 */
export function cast(y, m, d, h, mi, opts, place) {
  const o = Object.assign({}, DEFAULT_OPTS, opts || {});
  const P = Object.assign({ lat: 39.9, lon: 116.4, tz: 'Asia/Shanghai', name: '' }, place || {});
  const known = P.timeKnown !== false;
  const steps = {};

  // ① 时间与地点
  const z = P.utcMs != null ? { utcMs: P.utcMs, offset: 0, dst: false, gap: false, ambiguous: false } : localToUtc(y, m, d, known ? h : 12, known ? mi : 0, P.tz);
  const t = A.MakeTime(new Date(z.utcMs));
  const tilt = A.e_tilt(t), eps = tilt.tobl;
  const gast = A.SiderealTime(t);
  const lst = mod(gast + P.lon / 15, 24), ramc = lst * 15;
  steps.time = { ...z, utcText: fmtUtc(z.utcMs), deltaT: (t.tt - t.ut) * 86400, gast: fmtHours(gast), lst: fmtHours(lst), ramc, eps, known };

  // ② 行星（回归黄道视位置；恒星黄道时再减岁差）
  // 恒星黄道按惯例以平春分点为准：减岁差，并去掉章动
  const ay = o.zodiac === 'tropical' ? 0 : ayanamsa(o.zodiac, t) + tilt.dpsi / 3600;
  const sid = (lon) => mod(lon - ay);
  const bodies = PLANETS.map((p) => {
    const now = lonOf(p.body, t), a = lonOf(p.body, t.AddDays(-0.5)), b = lonOf(p.body, t.AddDays(0.5));
    return { ...p, lon: sid(now.lon), lat: now.lat, speed: angDiff(b.lon, a.lon) };
  });
  const nodeFn = o.node === 'mean' ? meanNode : trueNode;
  const nd = nodeFn(t), ndSpeed = angDiff(nodeFn(t.AddDays(0.5)), nodeFn(t.AddDays(-0.5)));
  const points = [{ ...POINTS.node, lon: sid(nd), speed: ndSpeed }, { ...POINTS.snode, lon: sid(nd + 180), speed: ndSpeed }];
  if (o.extra) { const ll = meanLilith(t); points.push({ ...POINTS.lilith, lon: sid(ll), speed: angDiff(meanLilith(t.AddDays(0.5)), meanLilith(t.AddDays(-0.5))) }); }
  steps.zodiac = { kind: o.zodiac, ayanamsa: o.zodiac === 'tropical' ? 0 : ayanamsa(o.zodiac, t) };

  // ③ 上升、天顶与宫位
  let H = null;
  if (known) {
    H = houseCusps(o.house, ramc, P.lat, eps);
    H.cusps = H.cusps.map((v) => (v == null ? v : sid(v)));
    H.asc = sid(H.asc); H.mc = sid(H.mc);
    if (o.house === 'W' && ay) { const base = Math.floor(H.asc / 30) * 30; for (let i = 1; i <= 12; i++) H.cusps[i] = mod(base + (i - 1) * 30); }
    if (o.house === 'E' && ay) { for (let i = 1; i <= 12; i++) H.cusps[i] = mod(H.asc + (i - 1) * 30); }
    for (const b of [...bodies, ...points]) b.house = houseOf(b.lon, H.cusps);
    if (o.extra) {
      const sun = bodies[0], moon = bodies[1];
      const day = houseOf(sun.lon, H.cusps) >= 7; // 太阳在地平线以上（7–12 宫）为日生
      const pof = o.pofSect && !day ? H.asc + sun.lon - moon.lon : H.asc + moon.lon - sun.lon;
      points.push({ ...POINTS.pof, lon: mod(pof), speed: 0, house: houseOf(mod(pof), H.cusps), day });
    }
  }
  steps.angles = H && { asc: H.asc, mc: H.mc, dsc: mod(H.asc + 180), ic: mod(H.mc + 180) };
  steps.houses = H && { sys: o.house, used: H.used, note: H.note, cusps: H.cusps };

  // 时间不详：月亮当天的可能范围
  if (!known) {
    const r0 = localToUtc(y, m, d, 0, 0, P.tz), r1 = localToUtc(y, m, d, 23, 59, P.tz);
    steps.moonRange = [sid(lonOf('Moon', A.MakeTime(new Date(r0.utcMs))).lon), sid(lonOf('Moon', A.MakeTime(new Date(r1.utcMs))).lon)];
  }

  // ④ 相位
  const orbT = ORBS[o.orbs] || ORBS.standard;
  const orbFor = (asp, p, q) => {
    const idx = asp.major ? ({ 0: 0, 180: 0, 90: 1, 120: 1, 60: 2 })[asp.a] : 3;
    let orb = orbT.main[idx];
    const lum = [p, q].some((x) => x.key === 'sun' || x.key === 'moon');
    if (lum) orb += asp.major ? orbT.lum : orbT.lum / 2;
    if ([p, q].some((x) => x.key === 'node' || x.key === 'asc' || x.key === 'mc')) orb = Math.min(orb, asp.major ? 5 : 1.5);
    return orb;
  };
  const aspectables = [...bodies, points[0]];
  if (H) aspectables.push({ ...POINTS.asc, lon: H.asc, speed: 0, angle: true }, { ...POINTS.mc, lon: H.mc, speed: 0, angle: true });
  const useAsp = ASPECTS.filter((a) => a.major || o.minor);
  const aspects = [];
  for (let i = 0; i < aspectables.length; i++) for (let j = i + 1; j < aspectables.length; j++) {
    const p = aspectables[i], q = aspectables[j];
    if ((p.angle && q.angle) || (p.key === 'node' && q.angle) || (q.key === 'node' && p.angle)) continue;
    const sep = Math.abs(angDiff(p.lon, q.lon));
    let best = null;
    for (const asp of useAsp) {
      if (!asp.major && (p.key === 'node' || q.key === 'node' || p.angle || q.angle)) continue;
      const orb = Math.abs(sep - asp.a), lim = orbFor(asp, p, q);
      if (orb <= lim && (!best || orb < best.orb)) best = { ...asp, orb, lim };
    }
    if (!best) continue;
    let applying = null;
    if (!p.angle && !q.angle) {
      const dt = 0.01, sep2 = Math.abs(angDiff(p.lon + p.speed * dt, q.lon + q.speed * dt));
      applying = Math.abs(sep2 - best.a) < best.orb;
    }
    aspects.push({ p: p.key, q: q.key, pz: p.zh, qz: q.zh, ...best, applying, exact: best.orb < 1 / 6 });
  }
  aspects.sort((a, b) => a.orb - b.orb);

  // ⑤ 元素、模式与命主星
  const el = { 火: [], 土: [], 风: [], 水: [] }, md = { 基本: [], 固定: [], 变动: [] };
  for (const b of bodies) { const s = SIGNS[signOf(b.lon)]; el[s.el].push(b.zh); md[s.mod].push(b.zh); }
  const bySign = {}, byHouse = {};
  for (const b of bodies) { (bySign[signOf(b.lon)] ||= []).push(b.zh); if (b.house) (byHouse[b.house] ||= []).push(b.zh); }
  const stellia = [
    ...Object.entries(bySign).filter(([, v]) => v.length >= 3).map(([k, v]) => `${SIGNS[k].zh}座 ${v.join('、')}`),
    ...Object.entries(byHouse).filter(([, v]) => v.length >= 3).map(([k, v]) => `第 ${k} 宫 ${v.join('、')}`),
  ];
  let ruler = null;
  if (H) {
    const rk = (o.rulers === 'trad' ? RULER_TRAD : RULER_MODERN)[signOf(H.asc)];
    const rb = bodies.find((b) => b.key === rk);
    ruler = { key: rk, zh: rb.zh, lon: rb.lon, house: rb.house };
  }
  const hemi = H ? { above: bodies.filter((b) => b.house >= 7).length, east: bodies.filter((b) => b.house >= 10 || b.house <= 3).length } : null;
  steps.stats = { el, md, stellia, ruler, hemi };

  return {
    input: { y, m, d, h, mi, text: `${y}-${pad(m)}-${pad(d)} ${known ? pad(h) + ':' + pad(mi) : '时间不详'}` },
    opts: o, place: P, known, bodies, points, aspects, steps,
  };
}

const retro = (b) => (b.speed < 0 && !['node', 'snode', 'lilith'].includes(b.key) ? ' 逆行(R)' : '');

export function toText(C, question) {
  const o = C.opts, S = C.steps, P = C.place, L = [];
  const zodiac = o.zodiac === 'tropical' ? '回归黄道' : `恒星黄道（${AYANAMSA[o.zodiac].zh}，岁差 ${fmtDeg(S.zodiac.ayanamsa)}）`;
  L.push(`【西方占星 · 本命盘】${zodiac} · ${C.known ? (S.houses.used === o.house ? HOUSE_NAMES[o.house] : HOUSE_NAMES[S.houses.used]) + ' 宫制' : '不排宫位'}`);
  if (question) L.push(`所问：${question}`);
  const tm = S.time;
  const zoneTxt = /^UTC/.test(P.tz) ? P.tz.replace('-', '−') : `${P.tz}，${fmtOffset(tm.offset)}${tm.dst ? '，夏令时' : ''}`;
  L.push(`出生：${C.input.text}（当地钟表时间；${zoneTxt}）${C.known ? '' : '，按当地正午 12:00 排'}`);
  if (tm.gap) L.push('注意：这个钟表时间正好落在夏令时拨快的空档里（当地并不存在这一刻），已按拨快前的偏移换算（相当于拨快后晚一小时的钟点）。');
  if (tm.ambiguous) L.push('注意：这个钟表时间在夏令时结束拨回时出现过两次，已按第一次（夏令时）换算。');
  L.push(`地点：${P.name ? P.name + ' ' : ''}${Math.abs(P.lat).toFixed(2)}°${P.lat >= 0 ? 'N' : 'S'} ${Math.abs(P.lon).toFixed(2)}°${P.lon >= 0 ? 'E' : 'W'}`);
  L.push(`世界时 UTC ${tm.utcText}；地方恒星时 ${tm.lst}`);
  if (C.known) {
    L.push(`上升 ASC：${fmtLon(S.angles.asc, true)}；天顶 MC：${fmtLon(S.angles.mc, true)}`);
    if (S.houses.note) L.push(S.houses.note);
  } else {
    L.push(`出生时间不详：未排上升、天顶与宫位。月亮当天在 ${fmtLon(S.moonRange[0])} 到 ${fmtLon(S.moonRange[1])} 之间，以下取正午位置。`);
  }
  L.push('');
  L.push('行星与点：');
  for (const b of [...C.bodies, ...C.points]) {
    L.push(`  ${b.zh} ${b.en}：${fmtLon(b.lon, true)}${b.house ? ` · 第 ${b.house} 宫` : ''}${retro(b)}${b.key === 'pof' ? `（${b.day ? '日生' : '夜生'}${o.pofSect && !b.day ? '，夜生公式 ASC+日−月' : '，ASC+月−日'}）` : ''}`);
  }
  if (C.known) {
    L.push('');
    L.push(`宫头（${HOUSE_NAMES[S.houses.used]}）：`);
    const cs = S.houses.cusps;
    for (let i = 1; i <= 12; i += 3) L.push('  ' + [i, i + 1, i + 2].map((k) => `${k} 宫 ${fmtLon(cs[k])}`).join('；'));
  }
  L.push('');
  L.push(`相位（${o.orbs === 'tight' ? '严格' : o.orbs === 'wide' ? '宽松' : '标准'}容许度${o.minor ? '，含次要相位' : '，仅主要相位'}）：`);
  if (!C.aspects.length) L.push('  （无）');
  for (const a of C.aspects) L.push(`  ${a.pz} ${a.zh} ${a.qz}（${a.en}）容许度 ${fmtDeg(a.orb)}${a.applying == null ? '' : a.applying ? '，入相' : '，出相'}`);
  L.push('');
  const st = S.stats;
  L.push(`元素（十大行星）：${Object.entries(st.el).map(([k, v]) => `${k} ${v.length}${v.length ? '（' + v.join('、') + '）' : ''}`).join('；')}`);
  L.push(`模式：${Object.entries(st.md).map(([k, v]) => `${k} ${v.length}`).join('；')}`);
  if (st.hemi) L.push(`半球：地平线以上 ${st.hemi.above} 颗、以下 ${10 - st.hemi.above} 颗；东半球 ${st.hemi.east} 颗、西半球 ${10 - st.hemi.east} 颗`);
  if (st.stellia.length) L.push(`星群（三星及以上同座或同宫）：${st.stellia.join('；')}`);
  if (st.ruler) L.push(`命主星（上升守护，${o.rulers === 'trad' ? '古典' : '现代'}守护）：${st.ruler.zh}，在${fmtLon(st.ruler.lon)} 第 ${st.ruler.house} 宫`);
  L.push('');
  L.push('（只排盘，不解盘。行星位置为地心视位置，用 astronomy-engine 计算；宫位、交点按标准公式计算，已与 Swiss Ephemeris 对照。）');
  return L.join('\n');
}

export { fmtDeg };

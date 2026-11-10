/**
 * 农历：以合朔（定朔）定初一，以中气定月序，冬至所在月为十一月；
 * 两个十一月之间有十三个月时，第一个不含中气的月为闰月（无中置闰）。
 * 合朔用 Meeus《天文算法》第 49 章的真朔公式，误差约一分钟；日界按北京时间。
 */
import { solveTerm, jdFromBeijing, beijingFromJd, mod, deltaT } from './astro.js';
import { ZHI, ganzhi } from './calendar.js';

const RAD = Math.PI / 180;

/** 第 k 次朔（k=0 为 2000-01-06 附近），返回力学时儒略日 */
function newMoonJde(k) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * RAD;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * RAD;
  const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD;
  jde += -0.40720 * Math.sin(Mp) + 0.17241 * E * Math.sin(M) + 0.01608 * Math.sin(2 * Mp) + 0.01039 * Math.sin(2 * F)
    + 0.00739 * E * Math.sin(Mp - M) - 0.00514 * E * Math.sin(Mp + M) + 0.00208 * E * E * Math.sin(2 * M)
    - 0.00111 * Math.sin(Mp - 2 * F) - 0.00057 * Math.sin(Mp + 2 * F) + 0.00056 * E * Math.sin(2 * Mp + M)
    - 0.00042 * Math.sin(3 * Mp) + 0.00042 * E * Math.sin(M + 2 * F) + 0.00038 * E * Math.sin(M - 2 * F)
    - 0.00024 * E * Math.sin(2 * Mp - M) - 0.00017 * Math.sin(Om) - 0.00007 * Math.sin(Mp + 2 * M)
    + 0.00004 * Math.sin(2 * Mp - 2 * F) + 0.00004 * Math.sin(3 * M) + 0.00003 * Math.sin(Mp + M - 2 * F)
    + 0.00003 * Math.sin(2 * Mp + 2 * F) - 0.00003 * Math.sin(Mp + M + 2 * F) + 0.00003 * Math.sin(Mp - M + 2 * F)
    - 0.00002 * Math.sin(Mp - M - 2 * F) - 0.00002 * Math.sin(3 * Mp + M) + 0.00002 * Math.sin(4 * Mp);
  // 行星摄动
  const A = [299.77 + 0.107408 * k - 0.009173 * T2, 251.88 + 0.016321 * k, 251.83 + 26.651886 * k, 349.42 + 36.412478 * k,
    84.66 + 18.206239 * k, 141.74 + 53.303771 * k, 207.14 + 2.453732 * k, 154.84 + 7.306860 * k, 34.52 + 27.261239 * k,
    207.19 + 0.121824 * k, 291.34 + 1.844379 * k, 161.72 + 24.198154 * k, 239.56 + 25.513099 * k, 331.55 + 3.592518 * k];
  const C = [325, 165, 164, 126, 110, 62, 60, 56, 47, 42, 40, 37, 35, 23];
  for (let i = 0; i < 14; i++) jde += C[i] * 1e-6 * Math.sin(A[i] * RAD);
  return jde;
}
/** 朔的北京时间所在日的儒略日数（日界在北京时间 0 点） */
function newMoonDay(k) {
  const jde = newMoonJde(k);
  const y = 2000 + k / 12.3685;
  const jdUT = jde - deltaT(y) / 86400;
  const bj = beijingFromJd(jdUT);
  return { day: dayNum(bj.y, bj.m, bj.d), jd: jdUT };
}
const dayNum = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 86400e3 + 2440587.5 + 0.5);
/** 某日（北京时间日界）所在中气的序号 */
function zhongqiDay(deg, guessJd) {
  const jd = solveTerm(deg, guessJd);
  const bj = beijingFromJd(jd);
  return dayNum(bj.y, bj.m, bj.d);
}

/** 从某年冬至起的一年农历月表（覆盖到下一个冬至之后） */
function monthsAround(dongzhiYear) {
  const dz1 = zhongqiDay(270, jdFromBeijing(dongzhiYear - 1, 12, 22));
  const dz2 = zhongqiDay(270, jdFromBeijing(dongzhiYear, 12, 22));
  // 找冬至所在月的朔：不晚于冬至日的最近一次朔
  let k = Math.floor((dz1 - 2451550.1) / 29.530588861);
  while (newMoonDay(k + 1).day <= dz1) k++;
  while (newMoonDay(k).day > dz1) k--;
  const starts = [];
  for (let i = 0; i < 15; i++) starts.push(newMoonDay(k + i).day);
  // 下一个冬至所在月
  let n = 0; while (starts[n + 1] <= dz2) n++;
  // 中气（30° 的倍数）落在各月的情况
  const hasZhongqi = [];
  let guess = jdFromBeijing(dongzhiYear - 1, 12, 22);
  const zq = [];
  for (let j = 0; j < 14; j++) { const deg = (270 + 30 * j) % 360; const dd = zhongqiDay(deg, guess + 30.44 * j); zq.push(dd); }
  for (let i = 0; i < 14; i++) hasZhongqi.push(zq.some((z) => z >= starts[i] && z < starts[i + 1]));
  const leapYear = n === 13;
  const months = [];
  let num = 11, leapUsed = false;
  for (let i = 0; i < n; i++) {
    let leap = false;
    if (i > 0) {
      if (leapYear && !leapUsed && !hasZhongqi[i]) { leap = true; leapUsed = true; }
      else num = num % 12 + 1;
    }
    months.push({ start: starts[i], end: starts[i + 1], num, leap });
  }
  return months;
}

/**
 * 公历（北京时间的日期）→ 农历
 * 返回 { year: 农历年（以正月初一换年）, month, day, leap, yearGz, monthName, dayName }
 */
export function toLunar(y, m, d) {
  const dn = dayNum(y, m, d);
  for (const dzY of [y, y - 1, y + 1]) {
    const ms = monthsAround(dzY);
    const hit = ms.find((x) => dn >= x.start && dn < x.end);
    if (!hit) continue;
    // 农历年以正月初一换年：表中正月之前的十一、十二月属上一年
    const idxFirst = ms.findIndex((x) => x.num === 1);
    const ly = idxFirst >= 0 && ms.indexOf(hit) >= idxFirst ? dzY : dzY - 1;
    const day = dn - hit.start + 1;
    return {
      year: ly, month: hit.num, day, leap: hit.leap, yearGz: ganzhi(mod(ly - 4, 60)), yearZhi: ZHI[mod(ly - 4, 12)],
      monthName: (hit.leap ? '闰' : '') + MONTH_NAMES[hit.num - 1] + '月', dayName: DAY_NAMES[day - 1],
      monthDays: hit.end - hit.start,
    };
  }
  return null;
}

const MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const DAY_NAMES = Array.from({ length: 30 }, (_, i) => {
  const n = i + 1, d = '一二三四五六七八九十';
  if (n <= 10) return '初' + d[n - 1];
  if (n < 20) return '十' + d[n - 11];
  if (n === 20) return '二十';
  if (n < 30) return '廿' + d[n - 21];
  return '三十';
});

/** 新月时刻（北京时间）序列，供动画显示 */
export function moonPhaseAt(y, m, d) {
  const dn = dayNum(y, m, d);
  let k = Math.floor((dn - 2451550.1) / 29.530588861);
  while (newMoonDay(k + 1).day <= dn) k++;
  while (newMoonDay(k).day > dn) k--;
  const a = newMoonDay(k), b = newMoonDay(k + 1);
  return { age: dn - a.day, length: b.day - a.day, newMoonJd: a.jd };
}


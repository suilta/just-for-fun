/**
 * 干支与四柱：年柱以立春换年、月柱以节换月（按真实时刻），日柱、时柱按钟点（可选真太阳时），23 点或 0 点换日。
 */
import { sunLonAtJd, jdFromBeijing, equationOfTime, civilJdn, mod } from './astro.js';

// ───────────────────────── 基础表 ─────────────────────────
const GAN = '甲乙丙丁戊己庚辛壬癸'.split('');
const ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');
const ganzhi = (i) => GAN[((i % 10) + 10) % 10] + ZHI[((i % 12) + 12) % 12];

// 24 节气，以视黄经 0°（春分）为起点，每 15° 一个
const JIEQI = ['春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
  '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰'];


export function sixtyIndex(g, z) { for (let i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i; return -1; }

// ───────────────────────── 四柱 ─────────────────────────
// 年、月柱按真实时刻（节气）定；日、时柱按“钟点”定，钟点可选真太阳时
export function fourPillars(y, m, d, h, mi, opts) {
  const o = Object.assign({ dayChange: 23, solar: false, lon: 120 }, opts || {});
  const jd = jdFromBeijing(y, m, d, h, mi);
  const lon = sunLonAtJd(jd);

  // 年柱：立春（315°）换年
  let yy = y;
  if (m <= 2 && lon >= 240 && lon < 315) yy = y - 1;
  const yearIdx = mod(yy - 4, 60);

  // 月柱：节换月；寅月从 315° 起，每 30° 一月
  const mOrder = Math.floor(mod(lon - 315, 360) / 30); // 0 = 寅月
  const monthGan = mod((yearIdx % 10 % 5) * 2 + 2 + mOrder, 10);
  const monthZhi = mod(2 + mOrder, 12);
  const monthIdx = sixtyIndex(monthGan, monthZhi);

  // 钟点：北京时间，或经度与均时差修正后的真太阳时
  let offsetMin = 0, eot = 0;
  if (o.solar) { eot = equationOfTime(y, m, d, h); offsetMin = (o.lon - 120) * 4 + eot; }
  const ck = new Date(Date.UTC(y, m - 1, d, h, mi) + Math.round(offsetMin * 60e3));
  const clock = { y: ck.getUTCFullYear(), m: ck.getUTCMonth() + 1, d: ck.getUTCDate(), h: ck.getUTCHours(), mi: ck.getUTCMinutes() };

  // 日柱：子初（23 点）或子正（0 点）换日
  const dayShift = o.dayChange === 23 && clock.h >= 23 ? 1 : 0;
  const dayNum = civilJdn(clock.y, clock.m, clock.d) + dayShift;
  const dayIdx = mod(dayNum + 49, 60);

  // 时柱：五鼠遁
  const hourZhi = Math.floor((clock.h + 1) / 2) % 12;
  // 时柱：五鼠遁。0 点换日时，23 点后的“夜子时”日柱仍用当天，时干按次日子时起（甲己日夜子为丙子）
  const nightZi = o.dayChange !== 23 && clock.h >= 23 ? 1 : 0;
  const hourGan = mod(((dayIdx + nightZi) % 10 % 5) * 2 + hourZhi, 10);
  const hourIdx = sixtyIndex(hourGan, hourZhi);

  return { jd, lon, yearIdx, monthIdx, dayIdx, hourIdx, dayShift, nightZi, dayNum, clock, offsetMin, eot };
}


export { GAN, ZHI, ganzhi, JIEQI };

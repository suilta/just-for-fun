/**
 * 农历日历用的数据：每日的农历、干支、节气（精确时刻）、月相（精确时刻）与节日。
 * 日期一律按北京时间；节气用本项目的太阳视黄经，月相用 astronomy-engine。
 */
import * as A from 'astronomy-engine';
import { toLunar } from './lunar.js';
import { fourPillars, ganzhi, JIEQI } from './calendar.js';
import { solveTerm, beijingFromJd, jdFromBeijing, mod } from './astro.js';

const pad = (n) => String(n).padStart(2, '0');
export const SHENGXIAO = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' };
export const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

// 公历节日（国家法定与常见纪念日）
const SOLAR_FEST = { '1-1': '元旦', '2-14': '情人节', '3-8': '妇女节', '3-12': '植树节', '5-1': '劳动节', '5-4': '青年节', '6-1': '儿童节', '7-1': '建党节', '8-1': '建军节', '9-10': '教师节', '10-1': '国庆节', '12-25': '圣诞节' };
// 农历节日（闰月不过节）；除夕另算（腊月最后一天）
const LUNAR_FEST = { '1-1': '春节', '1-15': '元宵节', '2-2': '龙抬头', '5-5': '端午节', '7-7': '七夕', '7-15': '中元节', '8-15': '中秋节', '9-9': '重阳节', '12-8': '腊八节', '12-23': '小年' };

const dateKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const fmtTime = (b) => `${pad(b.h)}:${pad(b.mi)}`;

// ── 节气：一年 24 个，按北京时间日期索引 ──
const termCache = new Map();
/** 公历 y 年内的 24 个节气（小寒到冬至），每项 { name, deg, jd, date, time } */
export function termsOfYear(y) {
  if (termCache.has(y)) return termCache.get(y);
  const out = [];
  // 小寒 285° 在一月初，此后每 15° 一个
  let guess = jdFromBeijing(y, 1, 6, 0, 0);
  for (let i = 0; i < 24; i++) {
    const deg = mod(285 + i * 15, 360);
    const jd = solveTerm(deg, guess);
    const b = beijingFromJd(jd);
    out.push({ name: JIEQI[Math.round(deg / 15) % 24], deg, jd, date: dateKey(b.y, b.m, b.d), time: fmtTime(b) });
    guess = jd + 15.2;
  }
  termCache.set(y, out);
  return out;
}

// ── 月相：朔、上弦、望、下弦 ──
const PHASES = ['朔', '上弦', '望', '下弦'];
const phaseCache = new Map();
/** 公历 y 年 m 月（北京时间）内的月相，每项 { name, date, time } */
export function phasesOfMonth(y, m) {
  const key = y + '-' + m;
  if (phaseCache.has(key)) return phaseCache.get(key);
  const start = Date.UTC(y, m - 1, 1) - 8 * 3600e3, end = Date.UTC(y, m, 1) - 8 * 3600e3;
  const out = [];
  let q = A.SearchMoonQuarter(new Date(start - 864e5 * 8));
  for (let i = 0; i < 12; i++) {
    const ms = q.time.date.getTime();
    if (ms >= end) break;
    if (ms >= start) {
      const b = new Date(ms + 8 * 3600e3 + 30e3); // 北京时间，四舍五入到分
      out.push({ name: PHASES[q.quarter], date: dateKey(b.getUTCFullYear(), b.getUTCMonth() + 1, b.getUTCDate()), time: `${pad(b.getUTCHours())}:${pad(b.getUTCMinutes())}` });
    }
    q = A.NextMoonQuarter(q);
  }
  phaseCache.set(key, out);
  return out;
}

/** 某日的完整信息 */
export function dayInfo(y, m, d) {
  const L = toLunar(y, m, d);
  const key = dateKey(y, m, d);
  const fest = [];
  if (SOLAR_FEST[`${m}-${d}`]) fest.push(SOLAR_FEST[`${m}-${d}`]);
  if (L && !L.leap && LUNAR_FEST[`${L.month}-${L.day}`]) fest.push(LUNAR_FEST[`${L.month}-${L.day}`]);
  if (L && !L.leap && L.month === 12 && L.day === L.monthDays) fest.push('除夕');
  // 母亲节（五月第二个星期日）、父亲节（六月第三个星期日）
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (wd === 0 && m === 5 && d > 7 && d <= 14) fest.push('母亲节');
  if (wd === 0 && m === 6 && d > 14 && d <= 21) fest.push('父亲节');
  const term = termsOfYear(y).find((t) => t.date === key) || null;
  const phase = phasesOfMonth(y, m).find((p) => p.date === key) || null;
  // 干支：按当天正午；交节当天在交节时刻换月（立春换年）
  const P = fourPillars(y, m, d, 12, 0, { dayChange: 0, solar: false });
  const P0 = fourPillars(y, m, d, 0, 0, { dayChange: 0, solar: false });
  const P1 = fourPillars(y, m, d, 23, 59, { dayChange: 0, solar: false });
  return {
    y, m, d, key, weekday: wd, week: '星期' + WEEK[wd],
    lunar: L, shengxiao: L ? SHENGXIAO[L.yearZhi] : '',
    pillars: { year: ganzhi(P.yearIdx), month: ganzhi(P.monthIdx), day: ganzhi(P.dayIdx) },
    monthChange: P0.monthIdx !== P1.monthIdx ? { from: ganzhi(P0.monthIdx), to: ganzhi(P1.monthIdx) } : null,
    yearChange: P0.yearIdx !== P1.yearIdx ? { from: ganzhi(P0.yearIdx), to: ganzhi(P1.yearIdx) } : null,
    fest, term, phase,
  };
}

/** 格子里显示的那一行小字与类别：节日 > 节气 > 初一显示月名 > 农历日 */
export function cellLabel(info) {
  if (info.fest.length) {
    // 公历的“洋节”让位给节气和农历节日
    const main = info.fest.find((f) => !['情人节', '圣诞节', '母亲节', '父亲节', '植树节'].includes(f));
    if (main) return { text: main, kind: 'fest' };
  }
  if (info.term) return { text: info.term.name, kind: 'term' };
  if (info.fest.length) return { text: info.fest[0], kind: 'fest' };
  if (info.lunar && info.lunar.day === 1) return { text: info.lunar.monthName + (info.lunar.monthDays === 30 ? '大' : '小'), kind: 'month' };
  return { text: info.lunar ? info.lunar.dayName : '', kind: 'day' };
}

/** 月历：周一开头的 6 行 × 7 列 */
export function monthGrid(y, m) {
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const t = new Date(Date.UTC(y, m - 1, 1 - lead + i));
    const cy = t.getUTCFullYear(), cm = t.getUTCMonth() + 1, cd = t.getUTCDate();
    const info = dayInfo(cy, cm, cd);
    cells.push({ ...info, inMonth: cm === m, label: cellLabel(info) });
  }
  // 末行整行都是下个月就去掉
  return cells.slice(35).every((c) => !c.inMonth) ? cells.slice(0, 35) : cells;
}

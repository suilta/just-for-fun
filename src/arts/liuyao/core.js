/**
 * 六爻（京房纳甲）：摇钱或时间起卦，八宫世应，纳甲，六亲，六神，伏神，变卦，月建日辰旬空。
 * 摇钱：背记三、字记二，三钱之和 6 老阴（动）、7 少阳、8 少阴、9 老阳（动）。
 */
import { GAN, ZHI, ganzhi, fourPillars } from '../../core/calendar.js';
import { toLunar } from '../../core/lunar.js';
import { fmtDT, mod } from '../../core/astro.js';
import { TRIGRAMS, hexagram } from '../meihua/core.js';

const WX_ZHI = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const trigramOf = (lines) => +Object.keys(TRIGRAMS).find((k) => TRIGRAMS[k].lines.join() === lines.join());

// 纳甲：先天数 → [内卦三爻, 外卦三爻]，自下而上
const NAJIA = {
  1: ['甲子 甲寅 甲辰', '壬午 壬申 壬戌'], 8: ['乙未 乙巳 乙卯', '癸丑 癸亥 癸酉'],
  4: ['庚子 庚寅 庚辰', '庚午 庚申 庚戌'], 5: ['辛丑 辛亥 辛酉', '辛未 辛巳 辛卯'],
  6: ['戊寅 戊辰 戊午', '戊申 戊戌 戊子'], 3: ['己卯 己丑 己亥', '己酉 己未 己巳'],
  7: ['丙辰 丙午 丙申', '丙戌 丙子 丙寅'], 2: ['丁巳 丁卯 丁丑', '丁亥 丁酉 丁未'],
};
function najia(lines) {
  const low = trigramOf(lines.slice(0, 3)), up = trigramOf(lines.slice(3));
  return [...NAJIA[low][0].split(' '), ...NAJIA[up][1].split(' ')];
}

// 八宫：从纯卦起，依次变初、二、三、四、五爻为一至五世，再变四爻为游魂，内卦复原为归魂
const PALACE_ORDER = [1, 2, 3, 4, 5, 6, 7, 8];
const GEN_NAMES = ['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂'];
const SHI = [6, 1, 2, 3, 4, 5, 4, 3];
const PALACE = {};
for (const p of PALACE_ORDER) {
  const pure = [...TRIGRAMS[p].lines, ...TRIGRAMS[p].lines];
  const seq = [pure.slice()];
  let cur = pure.slice();
  for (let i = 0; i < 5; i++) { cur = cur.slice(); cur[i] = 1 - cur[i]; seq.push(cur); }
  const you = cur.slice(); you[3] = 1 - you[3]; seq.push(you);
  const gui = you.slice(); for (let i = 0; i < 3; i++) gui[i] = pure[i]; seq.push(gui);
  seq.forEach((ls, g) => { PALACE[ls.join('')] = { palace: p, gen: g }; });
}

function liuqin(me, wx) {
  if (wx === me) return '兄弟';
  if (SHENG[wx] === me) return '父母';
  if (SHENG[me] === wx) return '子孙';
  if (KE[wx] === me) return '官鬼';
  return '妻财';
}
const SIX_GODS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
const GOD_START = { 甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 };
const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
const TOSS_NAME = { 6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳' };

function randInt(n) {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) { const b = new Uint32Array(1); const lim = Math.floor(0x100000000 / n) * n; do { c.getRandomValues(b); } while (b[0] >= lim); return b[0] % n; }
  return Math.floor(Math.random() * n);
}
/** 摇一次：三枚钱，1 为背（记三），0 为字（记二） */
function tossCoins() { const coins = [randInt(2), randInt(2), randInt(2)]; return { coins, value: coins.reduce((a, c) => a + (c ? 3 : 2), 0) }; }

const DEFAULT_OPTS = { method: 'coins', dayChange: 23, solar: false, lon: 120 };
const OPT_TEXT = { method: { coins: '摇钱起卦', time: '时间起卦' } };

function cast(y, m, d, h, mi, opts) {
  const o = Object.assign({}, DEFAULT_OPTS, opts || {});
  const P = fourPillars(y, m, d, h, mi, o);
  const C = {
    input: { y, m, d, h, mi, text: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` },
    opts: o, tosses: [], dayGz: ganzhi(P.dayIdx), monthZhi: ZHI[P.monthIdx % 12], dayIdx: P.dayIdx, clock: fmtDT(P.clock),
    pillars: [ganzhi(P.yearIdx), ganzhi(P.monthIdx), ganzhi(P.dayIdx), ganzhi(P.hourIdx)],
  };
  if (o.method === 'time') {
    // 时间起卦：同梅花易数取数（农历年支数 + 月 + 日 → 上卦；再加时数 → 下卦与动爻），只有一个动爻
    const base = new Date(Date.UTC(P.clock.y, P.clock.m - 1, P.clock.d + P.dayShift));
    const L = toLunar(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
    const yn = ZHI.indexOf(L.yearZhi) + 1, hn = (P.hourIdx % 12) + 1;
    const s1 = yn + L.month + L.day, s2 = s1 + hn;
    const up = mod(s1, 8) || 8, low = mod(s2, 8) || 8, mv = mod(s2, 6) || 6;
    const lines = [...TRIGRAMS[low].lines, ...TRIGRAMS[up].lines];
    C.tosses = lines.map((l, i) => ({ value: i + 1 === mv ? (l ? 9 : 6) : (l ? 7 : 8), coins: null }));
    C.timeCalc = { lunar: L, yn, hn, s1, s2, up, low, mv };
  }
  return C;
}

/** 补齐未摇的爻（跳过动画时） */
function autoToss(C) {
  if (C.tosses.length < 6) C.autoFilled = true;
  while (C.tosses.length < 6) C.tosses.push(tossCoins());
}

/** 由六次结果推出整卦（要求已摇满六次） */
function analyze(C) {
  const vals = C.tosses.map((t) => t.value);
  const lines = vals.map((v) => (v === 7 || v === 9 ? 1 : 0));
  const moving = vals.map((v) => v === 6 || v === 9);
  const changed = lines.map((l, i) => (moving[i] ? 1 - l : l));
  const benHx = hexagram(trigramOf(lines.slice(3)), trigramOf(lines.slice(0, 3)));
  const bianHx = hexagram(trigramOf(changed.slice(3)), trigramOf(changed.slice(0, 3)));
  const pal = PALACE[lines.join('')];
  const palWx = TRIGRAMS[pal.palace].wx;
  const shi = SHI[pal.gen], ying = mod(shi + 2, 6) + 1;
  const nj = najia(lines), njB = najia(changed);
  const dayGan = C.dayGz[0];
  const godStart = GOD_START[dayGan];
  const kongStart = mod(C.dayIdx - (C.dayIdx % 10), 12);
  const kong = [ZHI[mod(kongStart + 10, 12)], ZHI[mod(kongStart + 11, 12)]];
  const yaos = lines.map((l, i) => {
    const gz = nj[i], wx = WX_ZHI[ZHI.indexOf(gz[1])];
    return {
      i, name: YAO_NAMES[i], yang: !!l, value: vals[i], toss: TOSS_NAME[vals[i]], moving: moving[i],
      gz, wx, qin: liuqin(palWx, wx), god: SIX_GODS[mod(godStart + i, 6)],
      shi: i + 1 === shi, ying: i + 1 === ying, kong: kong.includes(gz[1]),
      bian: moving[i] ? { yang: !!changed[i], gz: njB[i], wx: WX_ZHI[ZHI.indexOf(njB[i][1])], qin: liuqin(palWx, WX_ZHI[ZHI.indexOf(njB[i][1])]) } : null,
    };
  });
  // 伏神：本卦六亲不全时，取本宫纯卦同位之爻
  const pure = [...TRIGRAMS[pal.palace].lines, ...TRIGRAMS[pal.palace].lines];
  const njPure = najia(pure);
  const have = new Set(yaos.map((y) => y.qin));
  const missing = ['父母', '兄弟', '子孙', '妻财', '官鬼'].filter((q) => !have.has(q));
  const fu = [];
  njPure.forEach((gz, i) => { const wx = WX_ZHI[ZHI.indexOf(gz[1])], q = liuqin(palWx, wx); if (missing.includes(q)) fu.push({ i, gz, wx, qin: q }); });
  for (const f of fu) yaos[f.i].fu = f;
  return {
    ben: benHx, bian: bianHx, hasMoving: moving.some(Boolean), palace: pal.palace, palName: TRIGRAMS[pal.palace].name, palWx,
    gen: GEN_NAMES[pal.gen], shi, ying, yaos, kong, missing, dayGan,
  };
}

function toText(C, question) {
  if (C.tosses.length < 6) return '（起卦尚未完成）';
  const A = analyze(C), o = C.opts, L = [];
  L.push(`【六爻】${OPT_TEXT.method[o.method]} · 京房纳甲 · 八宫世应`);
  L.push(`起卦时间：${C.input.text}（北京时间${o.solar ? `；真太阳时 ${C.clock}` : ''}）；四柱 ${C.pillars.join(' ')}`);
  L.push(`月建：${C.monthZhi}　日辰：${C.dayGz}　旬空：${A.kong.join('')}`);
  if (o.method === 'coins') L.push(`摇钱结果（自初爻起）：${C.tosses.map((t) => `${t.value}${TOSS_NAME[t.value]}`).join('，')}${C.autoFilled ? '（部分为程序随机补齐）' : ''}`);
  else L.push(`时间取数：农历${C.timeCalc.lunar.yearGz}年${C.timeCalc.lunar.monthName}${C.timeCalc.lunar.dayName}，上卦 ${C.timeCalc.s1}÷8，下卦 ${C.timeCalc.s2}÷8，动爻 ${C.timeCalc.s2}÷6 → ${YAO_NAMES[C.timeCalc.mv - 1]}`);
  L.push('');
  L.push(`本卦：${A.ben.name}（${A.palName}宫${A.gen}，宫属${A.palWx}）${A.hasMoving ? `　变卦：${A.bian.name}` : '　六爻安静，无变卦'}`);
  L.push(`世爻：${YAO_NAMES[A.shi - 1]}　应爻：${YAO_NAMES[A.ying - 1]}`);
  L.push('');
  L.push('爻位（自上而下）：');
  for (const y of [...A.yaos].reverse()) {
    const mark = [y.shi && '世', y.ying && '应', y.kong && '空'].filter(Boolean).join('');
    L.push(`- ${y.name} ${y.god}｜${y.qin}${y.gz}${y.wx}｜${y.yang ? '阳' : '阴'}${y.moving ? (y.yang ? '（老阳动）' : '（老阴动）') : ''}${mark ? '｜' + mark : ''}${y.bian ? `｜变 ${y.bian.qin}${y.bian.gz}${y.bian.wx}` : ''}${y.fu ? `｜伏 ${y.fu.qin}${y.fu.gz}${y.fu.wx}` : ''}`);
  }
  if (A.missing.length) L.push(`本卦缺${A.missing.join('、')}，伏神取自本宫${A.palName}为${TRIGRAMS[A.palace].xiang}。`);
  L.push('');
  L.push('请你作为熟悉六爻（京房纳甲）的解读者，基于以上卦象：');
  L.push('1. 按所问之事选取用神，说明用神的旺衰（月建、日辰、动变、旬空、伏藏）；');
  L.push('2. 分析世应关系与动爻对用神的生克冲合；');
  L.push('3. 给出判断、建议与应期参考；');
  L.push('4. 说明这些结论的不确定性。');
  L.push(`所问之事：${question && question.trim() ? question.trim() : '（未填写，请先给出整体解读）'}`);
  return L.join('\n');
}

export { cast, analyze, autoToss, tossCoins, toText, DEFAULT_OPTS, OPT_TEXT, YAO_NAMES, TOSS_NAME, PALACE, najia, SIX_GODS };

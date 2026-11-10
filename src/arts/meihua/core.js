/**
 * 梅花易数：时间起卦（农历年支数 + 月数 + 日数，加时支数）与数字起卦；
 * 先天八卦数取卦，除六取动爻，求互卦、变卦，按动爻分体用，论体用生克与卦气旺衰。
 */
import { ZHI, fourPillars } from '../../core/calendar.js';
import { toLunar } from '../../core/lunar.js';
import { fmtDT, mod } from '../../core/astro.js';

// 先天八卦数：乾一 兑二 离三 震四 巽五 坎六 艮七 坤八；爻自下而上，1 阳 0 阴
const TRIGRAMS = {
  1: { name: '乾', xiang: '天', wx: '金', lines: [1, 1, 1], sym: '☰' },
  2: { name: '兑', xiang: '泽', wx: '金', lines: [1, 1, 0], sym: '☱' },
  3: { name: '离', xiang: '火', wx: '火', lines: [1, 0, 1], sym: '☲' },
  4: { name: '震', xiang: '雷', wx: '木', lines: [1, 0, 0], sym: '☳' },
  5: { name: '巽', xiang: '风', wx: '木', lines: [0, 1, 1], sym: '☴' },
  6: { name: '坎', xiang: '水', wx: '水', lines: [0, 1, 0], sym: '☵' },
  7: { name: '艮', xiang: '山', wx: '土', lines: [0, 0, 1], sym: '☶' },
  8: { name: '坤', xiang: '地', wx: '土', lines: [0, 0, 0], sym: '☷' },
};
const trigramOf = (lines) => +Object.keys(TRIGRAMS).find((k) => TRIGRAMS[k].lines.join() === lines.join());

// 六十四卦短名：上卦 × 下卦（先天数）
const SHORT = {
  1: ['乾', '履', '同人', '无妄', '姤', '讼', '遁', '否'],
  2: ['夬', '兑', '革', '随', '大过', '困', '咸', '萃'],
  3: ['大有', '睽', '离', '噬嗑', '鼎', '未济', '旅', '晋'],
  4: ['大壮', '归妹', '丰', '震', '恒', '解', '小过', '豫'],
  5: ['小畜', '中孚', '家人', '益', '巽', '涣', '渐', '观'],
  6: ['需', '节', '既济', '屯', '井', '坎', '蹇', '比'],
  7: ['大畜', '损', '贲', '颐', '蛊', '蒙', '艮', '剥'],
  8: ['泰', '临', '明夷', '复', '升', '师', '谦', '坤'],
};
function hexagram(up, low) {
  const U = TRIGRAMS[up], D = TRIGRAMS[low];
  const short = SHORT[up][low - 1];
  return {
    up, low, short, lines: [...D.lines, ...U.lines],
    name: up === low ? `${U.name}为${U.xiang}` : `${U.xiang}${D.xiang}${short}`,
  };
}
const fromLines = (lines) => hexagram(trigramOf(lines.slice(3)), trigramOf(lines.slice(0, 3)));

const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
function relation(ti, yong) {
  if (ti === yong) return '比和';
  if (SHENG[yong] === ti) return '用生体';
  if (SHENG[ti] === yong) return '体生用';
  if (KE[ti] === yong) return '体克用';
  return '用克体';
}
/** 其他卦对体卦：生体、克体、体生之（泄体）、体克之、比和 */
function relTo(ti, wx) {
  if (wx === ti) return '比和';
  if (SHENG[wx] === ti) return '生体';
  if (SHENG[ti] === wx) return '泄体';
  if (KE[ti] === wx) return '体克之';
  return '克体';
}
// 月令五行：寅卯木，巳午火，申酉金，亥子水，辰未戌丑土
const SEASON_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
function wangshuai(wx, ling) {
  if (wx === ling) return '旺';
  if (SHENG[ling] === wx) return '相';
  if (SHENG[wx] === ling) return '休';
  if (KE[wx] === ling) return '囚';
  return '死';
}

const DEFAULT_OPTS = { method: 'time', dayChange: 23, solar: false, lon: 120 };
const OPT_TEXT = { method: { time: '时间起卦', two: '两数起卦', three: '三数起卦' } };
const r8 = (n) => mod(n, 8) || 8;
const r6 = (n) => mod(n, 6) || 6;

function cast(y, m, d, h, mi, opts) {
  const o = Object.assign({}, DEFAULT_OPTS, opts || {});
  const P = fourPillars(y, m, d, h, mi, o);
  const hourNum = (P.hourIdx % 12) + 1;
  const steps = {};
  // 时间起卦所用的农历日期：23 点换日时，23 点后算次日
  const base = new Date(Date.UTC(P.clock.y, P.clock.m - 1, P.clock.d + P.dayShift));
  const lunar = toLunar(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
  steps.calendar = { lunar, clock: fmtDT(P.clock), hourZhi: ZHI[P.hourIdx % 12], hourNum, monthZhi: ZHI[P.monthIdx % 12] };

  let upSum, lowSum, moveSum, nums;
  if (o.method === 'two' || o.method === 'three') {
    const a = Math.max(1, Math.floor(+o.n1 || 0)), b = Math.max(1, Math.floor(+o.n2 || 0)), c = Math.max(1, Math.floor(+o.n3 || 0));
    if (o.method === 'two') {
      nums = [{ k: '第一数', v: a }, { k: '第二数', v: b }, { k: '时数', v: hourNum, note: steps.calendar.hourZhi + '时' }];
      upSum = a; lowSum = b; moveSum = a + b + hourNum;
    } else {
      nums = [{ k: '第一数', v: a }, { k: '第二数', v: b }, { k: '第三数', v: c }];
      upSum = a; lowSum = b; moveSum = a + b + c;
    }
  } else {
    const yn = ZHI.indexOf(lunar.yearZhi) + 1;
    nums = [{ k: '年数', v: yn, note: lunar.yearZhi + '年' }, { k: '月数', v: lunar.month, note: lunar.monthName }, { k: '日数', v: lunar.day, note: lunar.dayName }, { k: '时数', v: hourNum, note: steps.calendar.hourZhi + '时' }];
    upSum = yn + lunar.month + lunar.day; lowSum = upSum + hourNum; moveSum = lowSum;
  }
  const up = r8(upSum), low = r8(lowSum), moving = r6(moveSum);
  steps.nums = { list: nums, upSum, lowSum, moveSum, up, low, moving };

  const ben = hexagram(up, low);
  const huLines = [ben.lines[1], ben.lines[2], ben.lines[3], ben.lines[2], ben.lines[3], ben.lines[4]];
  const hu = fromLines(huLines);
  const bianLines = ben.lines.slice(); bianLines[moving - 1] = 1 - bianLines[moving - 1];
  const bian = fromLines(bianLines);
  // 动爻在下卦则下卦为用、上卦为体；反之亦然
  const yongIsLow = moving <= 3;
  const ti = yongIsLow ? up : low, yong = yongIsLow ? low : up;
  const ling = SEASON_WX[P.monthIdx % 12];
  const tiWx = TRIGRAMS[ti].wx, yongWx = TRIGRAMS[yong].wx;
  steps.tiyong = {
    ti, yong, yongIsLow, tiWx, yongWx, rel: relation(tiWx, yongWx), ling, monthZhi: ZHI[P.monthIdx % 12],
    tiWs: wangshuai(tiWx, ling), yongWs: wangshuai(yongWx, ling),
    huRel: [relTo(tiWx, TRIGRAMS[hu.up].wx), relTo(tiWx, TRIGRAMS[hu.low].wx)],
    bianRel: relTo(tiWx, TRIGRAMS[yongIsLow ? bian.low : bian.up].wx),
  };
  return {
    input: { y, m, d, h, mi, text: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` },
    opts: o, steps, ben, hu, bian, moving,
  };
}

const LINE_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
const tg = (k) => `${TRIGRAMS[k].name}${TRIGRAMS[k].sym}（象${TRIGRAMS[k].xiang}，五行${TRIGRAMS[k].wx}）`;
function toText(c, question) {
  const S = c.steps, N = S.nums, T = S.tiyong, o = c.opts, L = [];
  L.push(`【梅花易数】${OPT_TEXT.method[o.method]} · 先天八卦数`);
  L.push(`起卦时间：${c.input.text}（北京时间${o.solar ? `；真太阳时 ${S.calendar.clock}` : ''}）；农历${S.calendar.lunar.yearGz}年${S.calendar.lunar.monthName}${S.calendar.lunar.dayName}，${S.calendar.hourZhi}时`);
  L.push(`取数：${N.list.map((x) => `${x.k} ${x.v}${x.note ? '（' + x.note + '）' : ''}`).join('，')}`);
  L.push(`上卦：${N.upSum} ÷ 8 余 ${N.up % 8} → ${tg(N.up)}；下卦：${N.lowSum} ÷ 8 余 ${N.low % 8} → ${tg(N.low)}；动爻：${N.moveSum} ÷ 6 余 ${N.moving % 6} → ${LINE_NAMES[c.moving - 1]}动`);
  L.push('');
  L.push(`本卦：${c.ben.name}（上${TRIGRAMS[c.ben.up].name}下${TRIGRAMS[c.ben.low].name}），${LINE_NAMES[c.moving - 1]}动`);
  L.push(`互卦：${c.hu.name}（上${TRIGRAMS[c.hu.up].name}下${TRIGRAMS[c.hu.low].name}）`);
  L.push(`变卦：${c.bian.name}（上${TRIGRAMS[c.bian.up].name}下${TRIGRAMS[c.bian.low].name}）`);
  L.push('');
  L.push(`体卦：${tg(T.ti)}，${T.yongIsLow ? '上卦' : '下卦'}；用卦：${tg(T.yong)}，${T.yongIsLow ? '下卦' : '上卦'}（动爻所在为用）`);
  L.push(`体用关系：${T.rel}`);
  L.push(`卦气：${T.monthZhi}月${T.ling}当令，体卦${T.tiWx}${T.tiWs}，用卦${T.yongWx}${T.yongWs}`);
  L.push(`互卦对体：上卦${TRIGRAMS[c.hu.up].name}${T.huRel[0]}，下卦${TRIGRAMS[c.hu.low].name}${T.huRel[1]}；变卦用位${TRIGRAMS[T.yongIsLow ? c.bian.low : c.bian.up].name}${T.bianRel}`);
  L.push('');
  L.push('请你作为熟悉梅花易数的解读者，基于以上卦象：');
  L.push('1. 以体用生克为主，结合卦气旺衰，判断所问之事的吉凶倾向；');
  L.push('2. 互卦看事情发展的过程，变卦看结果，说明它们对体卦的影响；');
  L.push('3. 结合本卦、变卦的卦义与动爻爻辞，给出具体建议与应期参考；');
  L.push('4. 说明这些结论的不确定性。');
  L.push(`所问之事：${question && question.trim() ? question.trim() : '（未填写，请先给出整体解读）'}`);
  return L.join('\n');
}

export { cast, toText, DEFAULT_OPTS, OPT_TEXT, TRIGRAMS, hexagram, LINE_NAMES, relation, relTo };

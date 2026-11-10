/**
 * 小六壬（掐指速断）：大安、留连、速喜、赤口、小吉、空亡六位。
 * 时间起课：从大安起正月数到月位，月位起初一数到日位，日位起子时数到时位；起数之位都算一。
 * 数字起课：报三个数，依次代替月、日、时。
 */
import { ZHI, fourPillars } from '../../core/calendar.js';
import { toLunar } from '../../core/lunar.js';
import { fmtDT, mod } from '../../core/astro.js';

// 六位：名称、六神（通行对应）、五行（常见说法）、吉凶倾向、简短提示（本项目自撰）
const SIX = [
  { name: '大安', god: '青龙', wx: '木', luck: '吉', hint: '平稳安定，宜守不宜动，事情慢而稳' },
  { name: '留连', god: '玄武', wx: '水', luck: '凶', hint: '拖延反复，事情一时难有结果' },
  { name: '速喜', god: '朱雀', wx: '火', luck: '吉', hint: '喜讯来得快，宜趁早行动' },
  { name: '赤口', god: '白虎', wx: '金', luck: '凶', hint: '口舌争执，防冲突与是非' },
  { name: '小吉', god: '六合', wx: '木', luck: '吉', hint: '小有收获，和合顺利' },
  { name: '空亡', god: '勾陈', wx: '土', luck: '凶', hint: '落空不实，所求难成' },
];

const DEFAULT_OPTS = { method: 'time', dayChange: 23, solar: false, lon: 120 };
const OPT_TEXT = { method: { time: '时间起课', num: '报数起课' } };

function cast(y, m, d, h, mi, opts) {
  const o = Object.assign({}, DEFAULT_OPTS, opts || {});
  const P = fourPillars(y, m, d, h, mi, o);
  const hourNum = (P.hourIdx % 12) + 1;
  const base = new Date(Date.UTC(P.clock.y, P.clock.m - 1, P.clock.d + P.dayShift));
  const lunar = toLunar(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
  let counts;
  if (o.method === 'num') {
    const n = [o.n1, o.n2, o.n3].map((v) => Math.max(1, Math.floor(+v || 0)));
    counts = [{ k: '第一数', v: n[0] }, { k: '第二数', v: n[1] }, { k: '第三数', v: n[2] }];
  } else {
    counts = [{ k: '月', v: lunar.month, note: lunar.monthName }, { k: '日', v: lunar.day, note: lunar.dayName }, { k: '时', v: hourNum, note: ZHI[P.hourIdx % 12] + '时' }];
  }
  // 逐段掐数：每段从上一段落点起数，起点算一
  let pos = 0;
  const segs = counts.map((c) => {
    const from = pos;
    const to = mod(from + c.v - 1, 6);
    const path = Array.from({ length: c.v }, (_, i) => mod(from + i, 6));
    pos = to;
    return { ...c, from, to, path };
  });
  return {
    input: { y, m, d, h, mi, text: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` },
    opts: o, lunar, clock: fmtDT(P.clock), hourZhi: ZHI[P.hourIdx % 12], segs, result: SIX[pos], resultIdx: pos,
  };
}

function toText(c, question) {
  const L = [], o = c.opts;
  L.push(`【小六壬】${OPT_TEXT.method[o.method]} · 起于大安，起数之位算一`);
  L.push(`起课时间：${c.input.text}（北京时间${o.solar ? `；真太阳时 ${c.clock}` : ''}）；农历${c.lunar.yearGz}年${c.lunar.monthName}${c.lunar.dayName}，${c.hourZhi}时`);
  L.push('');
  const label = o.method === 'num' ? ['第一数', '第二数', '第三数'] : ['月位', '日位', '时位'];
  c.segs.forEach((s, i) => {
    const r = SIX[s.to];
    L.push(`${label[i]}：从${SIX[s.from].name}起数 ${s.v}${s.note ? '（' + s.note + '）' : ''}，落${r.name}（${r.god}，${r.wx}，${r.luck}）`);
  });
  L.push('');
  L.push(`结果：${c.result.name}（${c.result.god}，五行${c.result.wx}，${c.result.luck}）——${c.result.hint}`);
  L.push('六神与五行为通行说法，提示为简短概括。');
  L.push('');
  L.push('请你作为熟悉小六壬的解读者：');
  L.push(`1. 以${label[2]}${c.result.name}为主断，结合${label[0]}、${label[1]}看事情的大势和过程；`);
  L.push('2. 结合所问之事，给出判断、方位与时机方面的参考建议；');
  L.push('3. 说明小六壬是速断之法，结论只作参考。');
  L.push(`所问之事：${question && question.trim() ? question.trim() : '（未填写，请给出整体提示）'}`);
  return L.join('\n');
}

export { cast, toText, SIX, DEFAULT_OPTS, OPT_TEXT };

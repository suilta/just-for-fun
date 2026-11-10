/**
 * 塔罗：洗牌（加密级随机数，Fisher–Yates）、正逆位、按牌阵抽牌。
 * 牌由用户在扇形牌堆里亲手点选；未选完时（例如跳过动画）由程序随机补齐。
 */
import { DECK, SPREADS } from './cards.js';

const DEFAULT_OPTS = { spread: 'three', reversed: true };

function randInt(n) {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) {
    // 拒绝采样，避免取模偏差
    const lim = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    do { c.getRandomValues(buf); } while (buf[0] >= lim);
    return buf[0] % n;
  }
  return Math.floor(Math.random() * n);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function cast(y, m, d, h, mi, opts) {
  const o = Object.assign({}, DEFAULT_OPTS, opts || {});
  const spread = SPREADS[o.spread] || SPREADS.three;
  // 牌堆顺序与每张牌的正逆在洗牌时确定
  const deck = shuffle(DECK.map((c) => c.id)).map((id) => ({ card: DECK[id], reversed: o.reversed ? randInt(2) === 1 : false }));
  // 切牌：分三叠，按随机顺序叠回
  const cut = [randInt(78 - 20) + 10];
  cut.push(cut[0] + randInt(78 - cut[0] - 10) + 5);
  const piles = [deck.slice(0, cut[0]), deck.slice(cut[0], cut[1]), deck.slice(cut[1])];
  const order = shuffle([0, 1, 2]);
  const cutDeck = order.flatMap((i) => piles[i]);
  const at = new Date();
  return {
    input: { y, m, d, h, mi, text: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` },
    opts: o, spread, spreadKey: o.spread, deck: cutDeck, cut, cutOrder: order, picks: [], at,
  };
}

/** 扇形牌堆中第 i 张被点选 */
function pick(C, i) {
  if (C.picks.length >= C.spread.positions.length || C.picks.includes(i)) return false;
  C.picks.push(i);
  return true;
}
/** 补齐未抽的牌 */
function autoPick(C) {
  if (C.picks.length < C.spread.positions.length) C.autoFilled = true;
  while (C.picks.length < C.spread.positions.length) {
    const i = randInt(C.deck.length);
    if (!C.picks.includes(i)) C.picks.push(i);
  }
}
const drawn = (C) => C.picks.map((i, k) => ({ pos: C.spread.positions[k], no: k + 1, ...C.deck[i], fanIndex: i }));

function toText(C, question) {
  // 只读：抽牌未完成时不生成，也不替用户补牌
  if (C.picks.length < C.spread.positions.length) return '（抽牌尚未完成）';
  const L = [];
  L.push(`【塔罗】${C.spread.name} · ${C.opts.reversed ? '含逆位' : '不含逆位'} · 牌序韦特体系`);
  L.push(`抽牌时间：${C.input.text}（洗牌用加密级随机数，牌由提问者在扇形牌堆中亲手抽出${C.autoFilled ? '；部分为程序随机补齐' : ''}）`);
  L.push('');
  for (const d of drawn(C)) {
    const c = d.card;
    const kind = c.arcana === 'major' ? `大阿尔卡那 ${c.num}` : `${c.suitName}（${c.el}元素，${c.theme}）`;
    L.push(`${d.no}. ${d.pos.name}（${d.pos.means}）：${c.name}（${c.en}）${d.reversed ? '逆位' : '正位'}｜${kind}｜关键词：${d.reversed ? c.rev : c.up}`);
  }
  const majors = drawn(C).filter((d) => d.card.arcana === 'major').length;
  const suits = {};
  for (const d of drawn(C)) if (d.card.arcana === 'minor') suits[d.card.suitName] = (suits[d.card.suitName] || 0) + 1;
  L.push('');
  L.push(`牌面统计：大阿尔卡那 ${majors} 张${Object.keys(suits).length ? '；' + Object.entries(suits).map(([k, v]) => `${k} ${v} 张`).join('，') : ''}；逆位 ${drawn(C).filter((d) => d.reversed).length} 张`);
  L.push('');
  L.push('请你作为熟悉韦特体系的塔罗解读者，基于以上牌阵：');
  L.push('1. 结合每张牌所在的位置含义，逐张解读（关键词只是提示，请按牌的完整含义和正逆位解释）；');
  L.push('2. 看牌与牌之间的联系，例如大阿尔卡那的比例、花色分布、前后呼应；');
  L.push('3. 针对所问之事给出整体结论和可行的建议；');
  L.push('4. 说明塔罗反映的是当下的状态与可能，不是定数。');
  L.push(`所问之事：${question && question.trim() ? question.trim() : '（未填写，请给出整体指引）'}`);
  return L.join('\n');
}

export { cast, pick, autoPick, drawn, toText, shuffle, DEFAULT_OPTS, SPREADS };

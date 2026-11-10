/**
 * 塔罗：外壳所需的说明与设置项。塔罗不按时间起盘，起始页不显示时间。
 */
import { cast, toText, DEFAULT_OPTS, SPREADS } from './core.js';
import { DECK } from './cards.js';
import * as board from './board.js';

const summary = (o) => `${SPREADS[o.spread]?.name || ''} · ${o.reversed ? '含逆位' : '不含逆位'}`;

function wheel() {
  let h = '<circle r="94" stroke-width=".4"/><circle r="70" stroke-width=".4"/>';
  const names = ['愚人', '魔术师', '女祭司', '皇后', '皇帝', '教皇', '恋人', '战车', '力量', '隐士', '命运之轮', '正义', '倒吊人', '死神', '节制', '恶魔', '高塔', '星星', '月亮', '太阳', '审判', '世界'];
  names.forEach((n, i) => {
    const a = (-90 + i * 360 / 22) * Math.PI / 180;
    h += `<text x="${(Math.cos(a) * 82).toFixed(2)}" y="${(Math.sin(a) * 82 + 2.5).toFixed(2)}" text-anchor="middle" font-size="6">${n}</text>`;
  });
  return h;
}

export default {
  id: 'tarot',
  name: '塔罗',
  title: '塔罗抽牌',
  storageKey: 'tarot-opts-v1',
  noTime: true,
  sub: (o) => SPREADS[o.spread]?.name || '',
  wheel,
  timeLabel: '',
  placeholder: '心中默念所问，写在这里。例如：这段关系接下来会怎样',
  castWord: '抽牌',
  textName: '牌阵原文',
  processName: '抽牌过程',
  settingsLabel: '牌阵设置',
  againLabel: '重新抽牌',
  stages: board.STAGES,
  board,
  defaults: DEFAULT_OPTS,
  parseOpts: (o) => ({ ...o, reversed: !!o.reversed }),
  optSummary: summary,
  fields: [
    { type: 'select', key: 'spread', label: '牌阵', options: [
      { value: 'one', label: '单张指引', desc: '抽一张，看当下最需要留意的事。适合每日一问，或问题很简单时。' },
      { value: 'three', label: '三张：过去 · 现在 · 未来（默认）', desc: '三张牌依次代表事情的来由、眼下的状态和发展趋势。最常用，适合大多数问题。' },
      { value: 'celtic', label: '凯尔特十字', desc: '十张牌，从核心、阻碍、根基、过去、目标、近期，到自我、环境、希望与担忧、结果，适合复杂的问题。' },
    ] },
    { type: 'check', key: 'reversed', label: '逆位', text: '包含逆位',
      what: '开启时每张牌有一半机会倒置（逆位），牌意通常表示受阻、不足或内在化；关闭则全部按正位解读。多数解读者会开启。' },
    { type: 'note', key: 'scope', text: '洗牌使用浏览器的加密级随机数；牌由你在扇形牌堆中亲手抽出，跳过动画时由程序随机补齐。牌面为本站自绘，牌序按韦特体系。' },
  ],
  cast: (a, o) => cast(...a, o),
  // 起盘记录：牌序、正逆、切牌与所抽的牌
  snapshot: (C) => ({ deck: C.deck.map((d) => [d.card.id, d.reversed ? 1 : 0]), cut: C.cut, cutOrder: C.cutOrder, picks: C.picks, autoFilled: !!C.autoFilled, at: +C.at }),
  restore: (C, s) => Object.assign(C, { deck: s.deck.map(([id, r]) => ({ card: DECK[id], reversed: !!r })), cut: s.cut, cutOrder: s.cutOrder, picks: [...s.picks], autoFilled: s.autoFilled, at: new Date(s.at) }),
  text: toText,
  footer: (C) => `本次设置：${summary(C.opts)}。洗牌使用加密级随机数（Fisher–Yates），切牌位置与叠回顺序也随机。${C.autoFilled ? '部分牌为跳过动画后程序随机补齐。' : '所有牌均由你亲手抽出。'}关键词为简短提示，不是完整释义。`,
  impacts: () => ({}),
};

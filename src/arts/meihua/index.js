/**
 * 梅花易数：外壳所需的说明、设置项与影响提示。
 */
import { cast, toText, DEFAULT_OPTS, OPT_TEXT, TRIGRAMS } from './core.js';
import * as board from './board.js';
import { DAY_CHANGE_FIELD, solarFields, solarImpact } from '../common.js';

const summary = (o) => `${OPT_TEXT.method[o.method]} · ${o.dayChange} 点换日 · ${o.solar ? '真太阳时 ' + o.lon + '°' : '北京时间'}`;

function wheel() {
  // 先天八卦方位：乾南坤北，离东坎西
  const order = [1, 5, 6, 7, 8, 4, 3, 2];
  let h = '<circle r="94" stroke-width=".4"/><circle r="70" stroke-width=".4"/>';
  order.forEach((k, i) => {
    const a = (-90 + i * 45) * Math.PI / 180, t = TRIGRAMS[k];
    h += `<text x="${(Math.cos(a) * 82).toFixed(2)}" y="${(Math.sin(a) * 82 + 4).toFixed(2)}" text-anchor="middle" font-size="12">${t.sym}</text>`;
    h += `<text x="${(Math.cos(a) * 61).toFixed(2)}" y="${(Math.sin(a) * 61 + 3).toFixed(2)}" text-anchor="middle" font-size="7">${t.name}${k}</text>`;
  });
  return h;
}

export default {
  id: 'meihua',
  name: '梅花易数',
  title: '梅花易数起卦演示',
  storageKey: 'meihua-opts-v1',
  sub: (o) => '先天八卦数 · ' + OPT_TEXT.method[o.method],
  wheel,
  timeLabel: '起卦时间（北京时间）',
  placeholder: '心中默念所问，写在这里。例如：明天的面谈能否顺利',
  castWord: '起卦',
  textName: '卦象原文',
  processName: '起卦过程',
  settingsLabel: '起卦设置',
  againLabel: '重新起卦',
  stages: board.STAGES,
  board,
  defaults: DEFAULT_OPTS,
  parseOpts: (o) => ({ ...o, dayChange: +o.dayChange, lon: +o.lon, solar: !!o.solar }),
  optSummary: summary,
  extras: {
    label: '所报之数',
    note: '心中想着所问之事，随口报出数字（正整数）。两数起卦只用前两个。',
    showIf: (o) => o.method !== 'time',
    fields: [
      { key: 'n1', type: 'number', min: 1, placeholder: '第一个数', aria: '第一个数' },
      { key: 'n2', type: 'number', min: 1, placeholder: '第二个数', aria: '第二个数' },
      { key: 'n3', type: 'number', min: 1, placeholder: '第三个数（三数起卦）', aria: '第三个数' },
    ],
  },
  fields: [
    { type: 'select', key: 'method', label: '起卦方法', options: [
      { value: 'time', label: '时间起卦（默认）', desc: '用农历的年支数、月数、日数相加取上卦，再加时支数取下卦和动爻。只看起卦那一刻。' },
      { value: 'two', label: '两数起卦', desc: '心中想着所问，报两个数：第一个数取上卦，第二个数取下卦，两数加时数取动爻。' },
      { value: 'three', label: '三数起卦', desc: '报三个数：第一个取上卦，第二个取下卦，三数之和取动爻。与时间无关。' },
    ] },
    DAY_CHANGE_FIELD('梅花时间起卦的农历日也随之换到次日。'),
    ...solarFields('用真太阳时定时辰', '起卦地东经', '时辰一变，下卦和动爻都会变。'),
    { type: 'note', key: 'scope', text: '只起卦，不断吉凶。农历按天文合朔与中气推算；体用按动爻所在分，卦气按月令五行论旺相休囚死。' },
  ],
  cast: (a, o, x) => cast(...a, { ...o, n1: x.n1, n2: x.n2, n3: x.n3 }),
  text: toText,
  footer: (C) => `本卦设置：${summary(C.opts)}。农历以天文算法定朔、以中气置闰，近年春节与闰月均与官方历书一致。`,
  impacts(a, o) {
    const ch = (extra) => cast(...a, Object.assign({}, o, extra));
    const d23 = ch({ dayChange: 23 }), d0 = ch({ dayChange: 0 });
    const same = d23.ben.name === d0.ben.name && d23.moving === d0.moving;
    return {
      dayChange: { same, html: same ? '按你填的时间：<b>两种换日起出的卦相同。</b>' : `按你填的时间：正好在 23 点后，<b>卦会不同</b>（23 点换日为${d23.ben.name}，0 点换日为${d0.ben.name}）。` },
      solar: solarImpact(o, ch, {
        same: (s1, s0) => s1.ben.name === s0.ben.name && s1.moving === s0.moving,
        yes: () => '起出的卦相同。',
        no: (s0, s1) => `卦会从${s0.ben.name}变成${s1.ben.name}。`,
      }),
    };
  },
};

/**
 * 小六壬：外壳所需的说明、设置项与影响提示。
 */
import { cast, toText, DEFAULT_OPTS, OPT_TEXT, SIX } from './core.js';
import * as board from './board.js';
import { DAY_CHANGE_FIELD, solarFields, solarImpact } from '../common.js';

const summary = (o) => `${OPT_TEXT.method[o.method]} · ${o.dayChange} 点换日 · ${o.solar ? '真太阳时 ' + o.lon + '°' : '北京时间'}`;
function wheel() {
  let h = '<circle r="94" stroke-width=".4"/><circle r="66" stroke-width=".4"/>';
  SIX.forEach((s, i) => {
    const a = (-90 + i * 60) * Math.PI / 180;
    h += `<text x="${(Math.cos(a) * 80).toFixed(2)}" y="${(Math.sin(a) * 80 + 4).toFixed(2)}" text-anchor="middle" font-size="11">${s.name}</text>`;
    h += `<text x="${(Math.cos(a) * 56).toFixed(2)}" y="${(Math.sin(a) * 56 + 2.5).toFixed(2)}" text-anchor="middle" font-size="6.5">${s.god}</text>`;
  });
  return h;
}

export default {
  id: 'xiaoliuren',
  name: '小六壬',
  title: '小六壬掐指演示',
  storageKey: 'xiaoliuren-opts-v1',
  sub: (o) => '掐指速断 · ' + OPT_TEXT.method[o.method],
  wheel,
  timeLabel: '起课时间（北京时间）',
  placeholder: '心中默念所问，写在这里。例如：丢的钥匙能不能找到',
  castWord: '起课',
  textName: '课式原文',
  processName: '掐指过程',
  settingsLabel: '起课设置',
  againLabel: '重新起课',
  stages: board.STAGES,
  board,
  defaults: DEFAULT_OPTS,
  parseOpts: (o) => ({ ...o, dayChange: +o.dayChange, lon: +o.lon, solar: !!o.solar }),
  optSummary: summary,
  extras: {
    label: '所报之数',
    note: '心中想着所问之事，随口报三个正整数，依次代替月、日、时。',
    showIf: (o) => o.method === 'num',
    fields: [
      { key: 'n1', type: 'number', min: 1, placeholder: '第一个数', aria: '第一个数' },
      { key: 'n2', type: 'number', min: 1, placeholder: '第二个数', aria: '第二个数' },
      { key: 'n3', type: 'number', min: 1, placeholder: '第三个数', aria: '第三个数' },
    ],
  },
  fields: [
    { type: 'select', key: 'method', label: '起课方法', options: [
      { value: 'time', label: '时间起课（默认）', desc: '从大安起正月数到农历月份，再从月位起初一数到日，再从日位起子时数到时辰，最后落点为结果。' },
      { value: 'num', label: '报数起课', desc: '报三个数，依次代替月、日、时，掐法相同。与时间无关。' },
    ] },
    DAY_CHANGE_FIELD('农历日也随之换到次日。'),
    ...solarFields('用真太阳时定时辰', '起课地东经', '时辰一变，结果可能不同。'),
    { type: 'note', key: 'scope', text: '只排课，不断吉凶。六神、五行为通行说法，各家偶有出入。' },
  ],
  cast: (a, o, x) => cast(...a, { ...o, n1: x.n1, n2: x.n2, n3: x.n3 }),
  text: toText,
  footer: (C) => `本课设置：${summary(C.opts)}。农历以天文算法定朔、以中气置闰。`,
  impacts(a, o) {
    const ch = (extra) => cast(...a, Object.assign({}, o, extra));
    const d23 = ch({ dayChange: 23 }), d0 = ch({ dayChange: 0 });
    const same = d23.resultIdx === d0.resultIdx && d23.segs[1].to === d0.segs[1].to;
    return {
      dayChange: { same, html: same ? '按你填的时间：<b>两种换日结果相同。</b>' : `按你填的时间：正好在 23 点后，<b>结果会不同</b>（23 点换日落${d23.result.name}，0 点换日落${d0.result.name}）。` },
      solar: solarImpact(o, ch, { same: (s1, s0) => s1.resultIdx === s0.resultIdx, yes: (s0) => `仍落${s0.result.name}，结果相同。`, no: (s0, s1) => `会从${s0.result.name}变成${s1.result.name}。` }),
    };
  },
};

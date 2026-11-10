/**
 * 八字：外壳所需的说明、设置项与影响提示。
 */
import { cast, toText, DEFAULT_OPTS, OPT_TEXT } from './core.js';
import * as board from './board.js';
import { solarFields, solarImpact } from '../common.js';

const summary = (o) => `${o.dayChange === 23 ? '23 点换日' : '0 点换日（分早晚子）'} · ${o.solar ? '真太阳时 ' + o.lon + '°' : '北京时间'}`;

function wheel() {
  const gan = '甲乙丙丁戊己庚辛壬癸', zhi = '子丑寅卯辰巳午未申酉戌亥';
  let h = '<circle r="94" stroke-width=".4"/><circle r="72" stroke-width=".4"/><circle r="50" stroke-width=".4"/>';
  zhi.split('').forEach((z, i) => {
    const a = (90 + i * 30) * Math.PI / 180;
    h += `<text x="${(Math.cos(a) * 83).toFixed(2)}" y="${(Math.sin(a) * 83 + 4).toFixed(2)}" text-anchor="middle" font-size="11">${z}</text>`;
  });
  gan.split('').forEach((g, i) => {
    const a = (90 + i * 36) * Math.PI / 180;
    h += `<text x="${(Math.cos(a) * 61).toFixed(2)}" y="${(Math.sin(a) * 61 + 3).toFixed(2)}" text-anchor="middle" font-size="8">${g}</text>`;
  });
  return h;
}

export default {
  id: 'bazi',
  name: '八字',
  title: '八字排盘演示',
  storageKey: 'bazi-opts-v1',
  sub: () => '四柱 · 十神 · 大运',
  wheel,
  timeLabel: '出生时间（北京时间）',
  placeholder: '想了解哪方面，写在这里。例如：这几年的事业方向',
  castWord: '排盘',
  birth: true, // 出生盘：从记录再排时沿用原来的时间
  textName: '命盘原文',
  processName: '排盘过程',
  settingsLabel: '排盘设置',
  againLabel: '重新排盘',
  stages: board.STAGES,
  board,
  defaults: DEFAULT_OPTS,
  parseOpts: (o) => ({ ...o, dayChange: +o.dayChange, lon: +o.lon, solar: !!o.solar }),
  optSummary: summary,
  extras: {
    label: '性别',
    note: '大运的顺排、逆排由出生年的阴阳和性别共同决定：阳年男、阴年女顺排，阴年男、阳年女逆排。',
    fields: [
      { key: 'gd', type: 'select', initial: 'm', options: [
        { value: 'm', label: '男（乾造）', desc: '阳年生顺排大运，阴年生逆排。' },
        { value: 'f', label: '女（坤造）', desc: '阴年生顺排大运，阳年生逆排。' },
      ] },
    ],
  },
  fields: [
    { type: 'select', key: 'dayChange', label: '子时换日', number: true, options: [
      { value: 23, label: '23 点换日（默认）', desc: '晚上 23 点（子时开始）就算第二天，日柱、时柱都按次日排。不区分早子时、晚子时。' },
      { value: 0, label: '0 点换日（分早晚子时）', desc: '23 点到 0 点为“夜子时”：日柱仍按当天，时柱用次日的子时。0 点到 1 点为“早子时”，按次日排。' },
    ] },
    ...solarFields('用真太阳时定日柱、时柱', '出生地东经', '只影响日柱和时柱；年、月柱和起运时间按真实时刻计算。'),
    { type: 'note', key: 'scope', text: '只排盘，不断吉凶。起运按出生到相邻节气的精确时刻计算，三天折一年；长生十二宫按阳干顺行、阴干逆行。' },
  ],
  cast: (a, o, x) => cast(...a, { ...o, gender: x.gd }),
  text: toText,
  footer: (C) => `本盘设置：${summary(C.opts)}。节气用截断 VSOP87 自行计算，误差在 1 分钟以内；起运时间精确到天。`,
  impacts(a, o) {
    const ch = (extra) => cast(...a, Object.assign({ gender: 'm' }, o, extra));
    const d23 = ch({ dayChange: 23 }), d0 = ch({ dayChange: 0 });
    const n23 = d23.steps.pillars.names, n0 = d0.steps.pillars.names;
    const same = n23[2] === n0[2] && n23[3] === n0[3];
    const when = o.solar ? `按你填的时间换算成真太阳时 ${d23.steps.pillars.clock.slice(11)}` : '按你填的时间';
    return {
      dayChange: { same, html: same ? `${when}：不在 23 点到 0 点之间，<b>两种换日结果相同。</b>` : `${when}：正好在夜子时，<b>日柱、时柱会不同</b>（23 点换日为 ${n23[2]}日${n23[3]}时，0 点换日为 ${n0[2]}日${n0[3]}时）。` },
      solar: solarImpact(o, ch, {
        same: (s1, s0) => s1.steps.pillars.names.join() === s0.steps.pillars.names.join(),
        yes: (s0) => `四柱仍是 ${s0.steps.pillars.names.join(' ')}，结果相同。`,
        no: (s0, s1) => `时柱会从${s0.steps.pillars.names[3]}变成${s1.steps.pillars.names[3]}${s0.steps.pillars.names[2] !== s1.steps.pillars.names[2] ? '，日柱也会变' : ''}。`,
      }),
    };
  },
};

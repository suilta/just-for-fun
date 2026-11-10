/**
 * 六爻：外壳所需的说明、设置项与影响提示。
 */
import { cast, toText, DEFAULT_OPTS, OPT_TEXT } from './core.js';
import * as board from './board.js';
import { DAY_CHANGE_FIELD, solarFields } from '../common.js';

const summary = (o) => `${OPT_TEXT.method[o.method]} · ${o.dayChange} 点换日 · ${o.solar ? '真太阳时 ' + o.lon + '°' : '北京时间'}`;
function wheel() {
  // 六十四卦外圈只示意：八宫之首
  const pal = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'], sym = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];
  let h = '<circle r="94" stroke-width=".4"/><circle r="70" stroke-width=".4"/>';
  pal.forEach((p, i) => {
    const a = (-90 + i * 45) * Math.PI / 180;
    h += `<text x="${(Math.cos(a) * 82).toFixed(2)}" y="${(Math.sin(a) * 82 + 4).toFixed(2)}" text-anchor="middle" font-size="12">${sym[i]}</text>`;
    h += `<text x="${(Math.cos(a) * 61).toFixed(2)}" y="${(Math.sin(a) * 61 + 3).toFixed(2)}" text-anchor="middle" font-size="7">${p}宫</text>`;
  });
  return h;
}

export default {
  id: 'liuyao',
  name: '六爻',
  title: '六爻起卦演示',
  storageKey: 'liuyao-opts-v1',
  sub: (o) => '京房纳甲 · ' + OPT_TEXT.method[o.method],
  wheel,
  timeLabel: '起卦时间（北京时间）',
  placeholder: '心中默念所问，写在这里。例如：这次投的简历会不会有回音',
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
  fields: [
    { type: 'select', key: 'method', label: '起卦方法', options: [
      { value: 'coins', label: '摇钱起卦（默认）', desc: '心里想着所问之事，亲手摇六次三枚铜钱，自下而上成卦，可能有多个动爻。' },
      { value: 'time', label: '时间起卦', desc: '用起卦时刻的农历年月日时取数成卦（与梅花易数相同），只有一个动爻。' },
    ] },
    { ...DAY_CHANGE_FIELD(), what: '影响日辰，因而影响六神、旬空和用神旺衰。' },
    ...solarFields('用真太阳时定日辰和时辰', '起卦地东经', ''),
    { type: 'note', key: 'scope', text: '京房纳甲体系：八宫世应、纳甲、六亲、六神、伏神、变卦、月建日辰旬空。只起卦，不断吉凶；卦身、进退神、反吟伏吟等不排。' },
  ],
  cast: (a, o) => cast(...a, o),
  // 起盘记录：六次摇钱的结果
  snapshot: (C) => ({ tosses: C.tosses, autoFilled: !!C.autoFilled }),
  restore: (C, s) => Object.assign(C, { tosses: s.tosses.map((t) => ({ ...t })), autoFilled: s.autoFilled }),
  text: toText,
  footer: (C) => `本卦设置：${summary(C.opts)}。${C.opts.method === 'coins' ? (C.autoFilled ? '部分爻为跳过动画后程序随机补齐。' : '六次均由你亲手摇出。') : ''}摇钱使用加密级随机数。`,
  impacts(a, o) {
    const ch = (extra) => cast(...a, Object.assign({}, o, extra));
    const d23 = ch({ dayChange: 23 }), d0 = ch({ dayChange: 0 });
    const same = d23.dayGz === d0.dayGz;
    return { dayChange: { same, html: same ? '按你填的时间：<b>两种换日的日辰相同。</b>' : `按你填的时间：正好在 23 点后，<b>日辰会不同</b>（23 点换日为${d23.dayGz}，0 点换日为${d0.dayGz}），六神和旬空随之改变。` } };
  },
};

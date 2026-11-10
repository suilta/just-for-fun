/**
 * 西方占星本命盘：外壳所需的说明、出生地、设置项与影响提示。
 */
import { cast, toText, DEFAULT_OPTS, HOUSE_NAMES, SIGNS } from './core.js';
import * as board from './board.js';
import { CITY_ROWS, ZONE_ZH, ZONES, ll, placeOf } from './places.js';
import { natalImpacts } from './impacts.js';

const zodiacShort = (o) => (o.zodiac === 'tropical' ? '回归黄道' : o.zodiac === 'lahiri' ? '恒星黄道·拉希里' : '恒星黄道·费根');
const houseShort = (o) => (HOUSE_NAMES[o.house] || '').replace(/ .*/, '');
const summary = (o) => `${houseShort(o)} · ${zodiacShort(o)} · ${o.orbs === 'tight' ? '严格' : o.orbs === 'wide' ? '宽松' : '标准'}容许度${o.minor ? ' · 含次要相位' : ''}`;

function wheel() {
  let h = '<circle r="94" stroke-width=".4"/><circle r="74" stroke-width=".4"/><circle r="40" stroke-width=".3"/>';
  SIGNS.forEach((s, i) => {
    const a = (180 + i * 30 + 15) * Math.PI / 180, b = (180 + i * 30) * Math.PI / 180;
    h += `<line x1="${(Math.cos(b) * 74).toFixed(2)}" y1="${(-Math.sin(b) * 74).toFixed(2)}" x2="${(Math.cos(b) * 94).toFixed(2)}" y2="${(-Math.sin(b) * 94).toFixed(2)}" stroke-width=".4"/>`;
    h += `<text x="${(Math.cos(a) * 84).toFixed(2)}" y="${(-Math.sin(a) * 84 + 3).toFixed(2)}" text-anchor="middle" font-size="8">${s.zh}</text>`;
  });
  [[0, 40], [60, 40], [120, 40]].forEach(([a]) => {
    const p = (d) => [(Math.cos(d * Math.PI / 180) * 40).toFixed(2), (-Math.sin(d * Math.PI / 180) * 40).toFixed(2)];
    const [x1, y1] = p(a + 20), [x2, y2] = p(a + 140);
    h += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width=".3"/>`;
  });
  return h;
}

export default {
  id: 'natal',
  name: '本命盘',
  title: '西方占星本命盘演示',
  storageKey: 'natal-opts-v1',
  sub: (o) => `${zodiacShort(o)} · ${houseShort(o)} 宫制`,
  wheel,
  timeLabel: '出生时间（出生地当时的钟表时间）',
  placeholder: '想了解哪方面，写在这里。例如：适合的工作方式',
  castWord: '排盘',
  textName: '星盘原文',
  processName: '排盘过程',
  settingsLabel: '排盘设置',
  againLabel: '重新排盘',
  stages: board.STAGES,
  board,
  defaults: DEFAULT_OPTS,
  parseOpts: (o) => ({ ...o, minor: !!o.minor, extra: !!o.extra, pofSect: o.pofSect !== false }),
  optSummary: summary,
  extras: {
    label: '出生地与时间',
    note: '上升点每两小时左右换一个星座，出生时间和地点越准越好。时区按出生地当时的规则换算，自动处理夏令时（例如中国 1986–1991 年夏季拨快一小时）。',
    fields: [
      { key: 'city', type: 'select', initial: 'beijing', label: '出生地', options: [
        ...CITY_ROWS.map(([v, name, lat, lon, tz = 'Asia/Shanghai']) => ({ value: v, label: name, desc: `${ll(lat, lon)} · ${ZONE_ZH[tz]}` })),
        { value: 'custom', label: '其他地点（自己填经纬度）', desc: '在下方填出生地的纬度、经度，并选时区。' },
      ] },
      { key: 'tk', type: 'select', initial: 'yes', label: '出生时间', options: [
        { value: 'yes', label: '时间准确', desc: '排出上升、天顶和十二宫。' },
        { value: 'no', label: '时间不详', desc: '按当天正午排行星，不排上升与宫位；月亮会注明当天的可能范围。' },
      ] },
      { key: 'lat', type: 'number', initial: '', label: '纬度', placeholder: '北纬为正，如 31.23', aria: '纬度', min: -89.9, max: 89.9, step: 'any', inputmode: null, showIf: (x) => x.city === 'custom' },
      { key: 'lon', type: 'number', initial: '', label: '经度', placeholder: '东经为正，如 121.47', aria: '经度', min: -180, max: 180, step: 'any', inputmode: null, showIf: (x) => x.city === 'custom' },
      { key: 'tz', type: 'select', initial: 'Asia/Shanghai', label: '时区', wide: true, options: ZONES, showIf: (x) => x.city === 'custom' },
    ],
  },
  fields: [
    { type: 'select', key: 'house', label: '宫制', options: [
      { value: 'P', label: 'Placidus 普拉西度（默认）', desc: '按时间三等分每个象限。现代最常用，大多数软件默认。高纬度（66° 以上）无法成立，会自动改用 Porphyry。' },
      { value: 'W', label: '整宫制 Whole Sign', desc: '上升所在星座整个是第 1 宫，之后一宫一个星座。希腊化时期与印度占星使用，近年复兴。' },
      { value: 'K', label: 'Koch 科赫', desc: '以天顶度数的升起时间三等分。德语区常用，高纬度同样失效。' },
      { value: 'E', label: '等宫制 Equal', desc: '从上升点起每 30° 一宫。天顶不一定在第 10 宫头。' },
      { value: 'O', label: 'Porphyry 波菲利', desc: '在黄道上把每个象限三等分，最简单的象限宫制。' },
      { value: 'R', label: 'Regiomontanus 雷格蒙塔努斯', desc: '等分天赤道再投到黄道。卜卦占星（时辰占）常用。' },
      { value: 'C', label: 'Campanus 坎帕努斯', desc: '等分卯酉圈再投到黄道。' },
    ] },
    { type: 'select', key: 'zodiac', label: '黄道', options: [
      { value: 'tropical', label: '回归黄道（默认）', desc: '白羊座 0° 定在春分点。西方占星的通行做法。' },
      { value: 'lahiri', label: '恒星黄道 · 拉希里', desc: `按实际恒星背景划分星座，比回归黄道约晚 24°。印度占星（吠陀占星）官方标准。` },
      { value: 'fagan', label: '恒星黄道 · 费根-布拉德利', desc: '西方恒星派常用的岁差值，比拉希里多约 0.9°。' },
    ], what: `两千年来春分点沿黄道后退了约 24°（岁差）。回归黄道跟着春分点走，恒星黄道跟着星星走，所以同一时刻两者的星座可能差一个。` },
    { type: 'select', key: 'node', label: '月交点', options: [
      { value: 'true', label: '真交点（默认）', desc: '月球当时实际轨道与黄道的交点，会来回摆动，偶尔顺行。' },
      { value: 'mean', label: '平均交点', desc: '把摆动平均掉后的位置，一直逆行。老一些的书和软件常用。' },
    ] },
    { type: 'select', key: 'orbs', label: '相位容许度', options: [
      { value: 'standard', label: '标准（默认）', desc: '合、冲 8°，刑、拱 7°，六合 5°，次要相位 2°；涉及日月再加 2°。' },
      { value: 'tight', label: '严格', desc: '合、冲 6°，刑、拱 5°，六合 4°，次要 1.5°；日月加 1°。只留下最紧的相位。' },
      { value: 'wide', label: '宽松', desc: '合、冲 10°，刑、拱 8°，六合 6°，次要 3°；日月加 2°。' },
    ], what: '容许度是相位允许偏离精确角度的范围，各派没有统一标准。交点、上升、天顶参与的相位最多 5°。' },
    { type: 'check', key: 'minor', label: '次要相位', text: '包括十二分、八分、八分之三、梅花、五分与倍五分相', what: '次要相位只在行星之间计算，容许度较小。' },
    { type: 'check', key: 'extra', label: '其他点', text: '加上莉莉丝（平均月球远地点）与福点', what: '莉莉丝用 Meeus 平均远地点公式，与 Swiss Ephemeris 的修正值可差约 0.1°。福点需要准确的出生时间。' },
    { type: 'check', key: 'pofSect', label: '福点昼夜', text: '夜生时福点改用 上升 + 太阳 − 月亮', what: '古典做法区分昼夜：太阳在地平线以上为日生，用 上升 + 月亮 − 太阳；夜生倒过来。不勾选则一律用日生公式。', showIf: (o) => o.extra },
    { type: 'select', key: 'rulers', label: '守护星', options: [
      { value: 'modern', label: '现代守护（默认）', desc: '天蝎归冥王星，水瓶归天王星，双鱼归海王星。' },
      { value: 'trad', label: '古典守护', desc: '只用七颗肉眼可见的星：天蝎归火星，水瓶归土星，双鱼归木星。' },
    ], what: '只影响“命主星”（上升星座的守护星）。' },
    { type: 'note', key: 'scope', text: '只排盘，不解盘。行星位置为地心视位置，误差约 1 角分以内；宫位、交点与岁差已与 Swiss Ephemeris 逐项对照（50 组出生数据，差别都在 20 角秒以内）。' },
  ],
  cast: (a, o, x) => cast(...a, o, placeOf(x)),
  text: toText,
  footer: (C) => `本盘设置：${summary(C.opts)}；出生地 ${C.place.name || ll(C.place.lat, C.place.lon)}${C.place.fallback ? '（经纬度填写有误，已按北京排）' : ''}。`,
  impacts: natalImpacts,
};

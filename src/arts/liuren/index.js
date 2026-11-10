/**
 * 大六壬：外壳所需的说明、设置项与影响提示。
 */
import { cast, toText, DEFAULT_OPTS, OPT_TEXT, ZHI, JIANG_NAME } from './core.js';
import * as board from './board.js';
import { DAY_CHANGE_FIELD, dayChangeImpact, solarImpact } from '../common.js';

const ORDER = '伏吟/返吟 → 贼克 → 比用 → 涉害（《六壬大全》数深浅）→ 八专 → 遥克 → 别责 → 昴星';
const summary = (o) => `${OPT_TEXT.dayChange[o.dayChange]} · ${o.dayNight === 'sun' ? '日出日落分昼夜' : '卯申分昼夜'} · ${o.solar ? '真太阳时' : '北京时间'}${o.solar || o.dayNight === 'sun' ? `（${o.lat}°N ${o.lon}°E）` : ''}`;
const hm = (x) => `${String(Math.floor(x)).padStart(2, '0')}:${String(Math.round((x % 1) * 60) % 60).padStart(2, '0')}`;

function wheel() {
  let h = '<circle r="94" stroke-width=".4"/><circle r="72" stroke-width=".4"/>';
  JIANG_NAME.forEach((n, i) => {
    const a = (90 + i * 30) * Math.PI / 180;
    h += `<text x="${(Math.cos(a) * 83).toFixed(2)}" y="${(Math.sin(a) * 83 + 4).toFixed(2)}" text-anchor="middle" font-size="11">${ZHI[i]}</text>`;
    h += `<text x="${(Math.cos(a) * 62).toFixed(2)}" y="${(Math.sin(a) * 62 + 2.5).toFixed(2)}" text-anchor="middle" font-size="6">${n}</text>`;
  });
  return h;
}

export default {
  id: 'liuren',
  name: '大六壬',
  title: '大六壬起课演示',
  storageKey: 'liuren-opts-v1',
  sub: () => '月将加时 · 九宗门',
  wheel,
  timeLabel: '占时（北京时间）',
  placeholder: '心中默念所问，写在这里。例如：这次合作能否谈成',
  castWord: '起课',
  textName: '课式原文',
  processName: '起课过程',
  settingsLabel: '起课设置',
  againLabel: '重新起课',
  stages: board.STAGES,
  board,
  defaults: DEFAULT_OPTS,
  parseOpts: (o) => ({ ...o, dayChange: +o.dayChange, lat: +o.lat, lon: +o.lon, solar: !!o.solar }),
  optSummary: summary,
  extras: {
    label: '本命与行年（选填）',
    note: '出生年按立春换年：立春前出生的，请填上一年。填了会在盘上标出本命和行年所在，并写进课式原文。',
    fields: [
      { key: 'by', type: 'number', min: 1900, max: 2100, placeholder: '出生年，如 1990', aria: '出生年' },
      { key: 'gd', type: 'select', initial: '', options: [
        { value: '', label: '不填', desc: '不填则不排本命、行年。' },
        { value: 'm', label: '男命', desc: '行年一岁起丙寅，每年顺行一位。' },
        { value: 'f', label: '女命', desc: '行年一岁起壬申，每年逆行一位。' },
      ] },
    ],
  },
  fields: [
    DAY_CHANGE_FIELD(),
    { type: 'select', key: 'dayNight', label: '昼夜贵人分界', options: [
      { value: 'maoshen', label: '卯至申为昼（默认）', desc: '占时在卯、辰、巳、午、未、申时用昼贵人，酉时到寅时用夜贵人。' },
      { value: 'sun', label: '按当地日出日落', desc: '按当地经纬度算出当天的日出日落，太阳在地平线上用昼贵人，否则用夜贵人。冬夏昼长不同，清晨和傍晚可能与上一项结果不同。' },
    ] },
    { type: 'check', key: 'solar', label: '真太阳时', text: '用真太阳时定日柱和占时',
      what: '钟表上的北京时间是按东经 120° 定的。真太阳时按当地经度和当天太阳位置校正，西部地区常差一小时左右，可能换一个时辰，占时一变，天盘、四课、三传都会变。月将始终按真实时刻换将，不受此项影响。' },
    { type: 'numbers', key: 'geo', label: '当地位置（用于真太阳时和日出日落）', showIf: (o) => o.dayNight === 'sun' || o.solar,
      items: [{ key: 'lat', label: '北纬', min: 0, max: 60, step: 0.01 }, { key: 'lon', label: '东经', min: 70, max: 140, step: 0.01 }],
      note: '例如北京 39.90°N 116.40°E、上海 31.23°N 121.47°E、成都 30.57°N 104.07°E、广州 23.13°N 113.26°E。' },
    { type: 'note', key: 'order', text: '取传口径固定为：' + ORDER + '。' },
  ],
  cast: (a, o, x) => { const by = parseInt(x.by, 10); return cast(...a, { ...o, birthYear: Number.isFinite(by) ? by : null, gender: x.gd }); },
  text: toText,
  footer: (C) => `本课设置：${summary(C.opts)}。月将在中气交接的精确时刻换将，节气用截断 VSOP87 自行计算，误差在 1 分钟以内。取传口径：伏吟/返吟 → 贼克 → 比用 → 涉害（《六壬大全》数深浅：起点与本家不计，等深取临孟、临仲，再平阳日干上、阴日支上）→ 八专 → 遥克 → 别责 → 昴星。`,
  impacts(a, o) {
    const ch = (extra) => cast(...a, Object.assign({}, o, extra));
    const c1 = ch({ dayNight: 'maoshen' }), c2 = ch({ dayNight: 'sun' });
    const s2 = c1.steps.gen.isDay === c2.steps.gen.isDay, sun = c2.steps.gen.sun;
    return {
      dayChange: dayChangeImpact(o, ch, () => true, '四课三传都可能不同'),
      dayNight: { same: s2, html: `按你填的时间：卯申分界为${c1.steps.gen.isDay ? '昼' : '夜'}；北纬 ${o.lat}°、东经 ${o.lon}° 当天日出 ${hm(sun.rise)}、日落 ${hm(sun.set)}（真太阳时），为${c2.steps.gen.isDay ? '昼' : '夜'}。` + (s2 ? '<b>两种分法结果相同。</b>' : '<b>两种分法结果不同，贵人和十二天将会变。</b>') },
      solar: solarImpact(o, ch, {
        same: (t1, t0) => t1.steps.pillars.hour === t0.steps.pillars.hour && t1.steps.pillars.day === t0.steps.pillars.day,
        yes: (t0) => `占时仍是${t0.steps.pillars.hour[1]}时，结果相同。`,
        no: (t0, t1) => `占时会从${t0.steps.pillars.hour[1]}时变成${t1.steps.pillars.hour[1]}时，天盘、四课、三传都会不同。`,
      }),
    };
  },
};

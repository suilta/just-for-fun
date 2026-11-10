/**
 * 太乙神数：外壳所需的说明、设置项与影响提示。
 */
import { cast, toText, DEFAULT_OPTS, OPT_TEXT, RING16, GOD16, GONG } from './core.js';
import * as board from './board.js';
import { DAY_CHANGE_FIELD } from '../common.js';

const summary = (o) => `${OPT_TEXT.ji[o.ji]} · ${OPT_TEXT.dayChange[o.dayChange]} · ${o.solar ? '真太阳时 ' + o.lon + '°' : '北京时间'}`;
const juOf = (c) => `${c.steps.ju.dun}${c.steps.ju.kook}局，太乙在${GONG[c.board.taiyi].name}${c.board.taiyi}宫`;

function wheel() {
  let h = '<circle r="94" stroke-width=".4"/><circle r="70" stroke-width=".4"/><rect x="-30" y="-30" width="60" height="60" stroke-width=".4"/>';
  RING16.forEach((ch, i) => {
    const a = (90 + i * 22.5) * Math.PI / 180;
    h += `<text x="${(Math.cos(a) * 83).toFixed(2)}" y="${(Math.sin(a) * 83 + 4).toFixed(2)}" text-anchor="middle" font-size="10">${ch}</text>`;
    h += `<text x="${(Math.cos(a) * 61).toFixed(2)}" y="${(Math.sin(a) * 61 + 2.5).toFixed(2)}" text-anchor="middle" font-size="5.5">${GOD16[i]}</text>`;
  });
  return h;
}

export default {
  id: 'taiyi',
  name: '太乙神数',
  title: '太乙神数起式演示',
  storageKey: 'taiyi-opts-v1',
  sub: (o) => '太乙统宗宝鉴 · ' + OPT_TEXT.ji[o.ji],
  wheel,
  timeLabel: '起式时间（北京时间）',
  placeholder: '心中默念所问，写在这里。例如：这次竞争谁占上风',
  castWord: '起式',
  textName: '式盘原文',
  processName: '起式过程',
  settingsLabel: '起式设置',
  againLabel: '重新起式',
  stages: board.STAGES,
  board,
  defaults: DEFAULT_OPTS,
  parseOpts: (o) => ({ ...o, dayChange: +o.dayChange, lon: +o.lon, solar: !!o.solar }),
  optSummary: summary,
  fields: [
    { type: 'select', key: 'ji', label: '计式', options: [
      { value: 'shi', label: '时计（默认）', desc: '按起式那个时辰排盘，每个时辰换一局，太乙三个时辰移一宫。冬至后阳遁、夏至后阴遁。看眼前一件事用它。' },
      { value: 'sui', label: '岁计', desc: '按年份排盘，一年一局，太乙三年移一宫，始终阳遁。看一整年的大势，年份按立春换年。' },
    ] },
    { ...DAY_CHANGE_FIELD(), what: '太乙的积时按时辰连续计数，不受换日影响；这一项只改变显示的日柱。' },
    { type: 'check', key: 'solar', label: '真太阳时', text: '用真太阳时定时辰',
      what: '钟表上的北京时间是按东经 120° 定的。真太阳时按当地经度校正，西部地区常差一小时左右，可能换一个时辰，时计就会换一局。冬至、夏至的阴阳遁切换始终按真实时刻。' },
    { type: 'numbers', key: 'lon', label: '起式地东经', items: [{ key: 'lon', label: '东经', min: 70, max: 140, step: 0.01 }], unit: '度',
      note: '例如北京 116.40、成都 104.07。', disabledIf: (o) => !o.solar },
    { type: 'note', key: 'scope', text: '主派《太乙统宗宝鉴》。定算、四神、天乙、地乙、直符、飞符、四郭固杜、月计、日计各家未统一，暂不排。' },
  ],
  cast: (a, o) => cast(...a, o),
  text: toText,
  footer: (C) => `本式设置：${summary(C.opts)}。主派《太乙统宗宝鉴》，以《太乙金镜式经》校勘；七十二局主客算表与《统宗》卷四、卷五局例对校一致。时计积日基准取自 kintaiyi v0.2.4（兼容对照，非原书常数）。定算、四神、天乙、地乙、直符、飞符、四郭固杜、月计、日计暂不排。`,
  impacts(a, o) {
    const ch = (extra) => cast(...a, Object.assign({}, o, extra));
    const s1 = ch({ ji: 'shi' }), s2 = ch({ ji: 'sui' });
    const t1 = ch({ solar: true }), t0 = ch({ solar: false });
    const same = t1.steps.ju.kook === t0.steps.ju.kook && t1.steps.ju.yang === t0.steps.ju.yang;
    return {
      ji: { same: false, html: `按你填的时间：时计为${juOf(s1)}；岁计为${juOf(s2)}。<b>两者看的范围不同，结果一般不同。</b>` },
      solar: { same: o.ji === 'sui' || same, html: `东经 ${o.lon}° 的真太阳时为 ${t1.steps.pillars.clock.slice(11)}。` + (o.ji === 'sui' ? '<b>岁计按年份起局，不受影响。</b>' : same ? '<b>仍在同一时辰，局数相同。</b>' : `<b>时辰会变，局数从${t0.steps.ju.kook}局变成${t1.steps.ju.kook}局。</b>`) },
    };
  },
};

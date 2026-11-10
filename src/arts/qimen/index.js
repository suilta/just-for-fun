/**
 * 奇门遁甲：外壳所需的说明、设置项与影响提示。
 */
import { chart, toText, DEFAULT_OPTS, OPT_TEXT } from './core.js';
import * as board from './board.js';
import { DAY_CHANGE_FIELD, solarFields, dayChangeImpact, solarImpact } from '../common.js';

const juName = (c) => `${c.steps.ju.dun}${'〇一二三四五六七八九'[c.steps.ju.ju]}局`;
const summary = (o) => [OPT_TEXT.yuan[o.yuan], o.ji === 'kun' ? '寄坤' : '阳艮阴坤', o.gods === 'huxuan' ? '虎玄' : '勾朱', o.dayChange + ' 点换日', o.solar ? '真太阳时 ' + o.lon + '°' : '北京时间'].join(' · ');

function wheel() {
  const names = ['离', '坤', '兑', '乾', '坎', '艮', '震', '巽'];
  const syms = ['☲', '☷', '☱', '☰', '☵', '☶', '☳', '☴'];
  let h = '<circle r="94" stroke-width=".4"/><circle r="70" stroke-width=".4"/>';
  names.forEach((n, i) => {
    const a = (i * 45 - 90) * Math.PI / 180;
    h += `<text x="${(Math.cos(a) * 82).toFixed(2)}" y="${(Math.sin(a) * 82 + 4).toFixed(2)}" text-anchor="middle" font-size="12">${syms[i]}</text>`;
    h += `<text x="${(Math.cos(a) * 61).toFixed(2)}" y="${(Math.sin(a) * 61 + 3).toFixed(2)}" text-anchor="middle" font-size="7">${n}</text>`;
  });
  return h;
}

export default {
  id: 'qimen',
  name: '奇门遁甲',
  title: '奇门遁甲排盘演示',
  storageKey: 'qimen-opts-v1',
  sub: (o) => '时家转盘 · ' + OPT_TEXT.yuan[o.yuan],
  wheel,
  timeLabel: '起局时间（北京时间）',
  placeholder: '心中默念所问，写在这里。例如：下个月换工作是否顺利',
  castWord: '起局',
  textName: '盘面原文',
  processName: '排盘过程',
  settingsLabel: '排盘设置',
  againLabel: '重新起局',
  stages: board.STAGES,
  board,
  defaults: DEFAULT_OPTS,
  parseOpts: (o) => ({ ...o, dayChange: +o.dayChange, lon: +o.lon, solar: !!o.solar }),
  optSummary: summary,
  fields: [
    { type: 'select', key: 'yuan', label: '定局法', options: [
      { value: 'chaibu', label: '拆补法（默认）', desc: '看起局时所在的节气，再按日柱离最近的甲日或己日几天，分上、中、下元。规则直接，局数不会跨到别的节气，多数排盘软件采用。' },
      { value: 'zhirun', label: '置闰法', desc: '古法。每 15 天一轮，和节气不一定同步：这一轮先到叫“超神”，节气先到叫“接气”；差距超过 9 天时，在芒种或大雪后把一个节气重复一次，叫“置闰”。交节前后几天的局数可能和拆补法不同。' },
      { value: 'maoshan', label: '茅山法', desc: '从交节那一刻算起，每 5 天一元：第 1–5 天上元，第 6–10 天中元，第 11–15 天下元，不看日柱干支。' },
    ] },
    { type: 'select', key: 'ji', label: '中五寄宫', options: [
      { value: 'kun', label: '一律寄坤二宫（默认）', desc: '中五宫没有对应的卦，里面的天禽星和地盘干要寄到别的宫。这一项无论阴阳遁都寄坤二宫，是最常见的做法。' },
      { value: 'genkun', label: '阳遁寄艮八、阴遁寄坤二', desc: '阳遁时寄艮八宫，阴遁时寄坤二宫。只有在阳遁、并且盘面牵涉中五宫时，结果才和上一项不同。' },
    ] },
    { type: 'select', key: 'gods', label: '八神第五、六位', options: [
      { value: 'huxuan', label: '白虎、玄武（默认）', desc: '八神第五、六位的名称用白虎、玄武。' },
      { value: 'gouque', label: '勾陈、朱雀', desc: '同样两个位置改叫勾陈、朱雀。盘面位置完全不变，只是名称不同。' },
    ] },
    { type: 'check', key: 'keying', label: '古籍克应', text: '逐宫列出十干克应、八门克应、门宫关系、九星旺衰与八神性质',
      what: '按《奇门遁甲秘笈大全》《奇门遁甲统宗》《御定奇门宝鉴》《烟波钓叟歌》查表录出原文，并列各书异说，注明出处。只录条文，不替你下结论。关掉后原文和动画里都不出现。' },
    { type: 'check', key: 'overlay', label: '值符真甲', text: '旬首不是甲子时，旬首六仪按“值符”再查一次', showIf: (o) => o.keying,
      what: '常例只把甲子戊当作“甲”。《烟波钓叟歌》《御定奇门宝鉴》认为当旬旬首所遁的仪就是真甲（值符），所以如本旬甲遁于癸，丙加癸除了“华盖孛师”，还叠加“飞鸟跌穴”。只影响青龙返首、飞鸟跌穴、值符飞宫、天乙伏宫四种。' },
    { type: 'select', key: 'starState', label: '九星旺衰', showIf: (o) => o.keying, options: [
      { value: 'month', label: '按月令（默认）', desc: '古籍原意：以起局月的月支五行定九星旺相休囚废（《烟波钓叟歌》《御定奇门宝鉴》）。' },
      { value: 'palace', label: '按落宫', desc: '近人用法：以九星所落之宫的五行来定。' },
    ], what: '九星与八门不同，用“我生为旺、同行为相、我克为休、生我为废、克我为囚”。' },
    DAY_CHANGE_FIELD('传统时家奇门多用这种。'),
    ...solarFields('用真太阳时定日柱、时柱', '起局地东经', '只影响日柱和时柱。'),
  ],
  cast: (a, o) => chart(...a, o),
  text: toText,
  footer: (C) => `本盘设置：${summary(C.opts)}。节气用截断 VSOP87 自行计算，误差在 1 分钟以内；真太阳时的均时差用近似式，误差约半分钟。各门派在定局、寄宫、格局判定上有差异，以上设置可在起局页调整。`,
  impacts(a, o) {
    const ch = (extra) => chart(...a, Object.assign({}, o, extra));
    const r = ['chaibu', 'zhirun', 'maoshan'].map((y) => [OPT_TEXT.yuan[y], juName(ch({ yuan: y }))]);
    const allSame = r.every((x) => x[1] === r[0][1]);
    const k1 = JSON.stringify(ch({ ji: 'kun' }).palaces), k2 = JSON.stringify(ch({ ji: 'genkun' }).palaces);
    const yang = ch({}).steps.ju.yang;
    return {
      yuan: { same: allSame, html: `按你填的时间：${r.map((x) => `${x[0]} ${x[1]}`).join('，')}。` + (allSame ? '<b>三种方法结果相同，选哪个都一样。</b>' : '<b>结果不同，整张盘会不一样。</b>') },
      ji: { same: k1 === k2, html: k1 === k2 ? `按你填的时间：${yang ? '虽是阳遁，但' : '这是阴遁，两种寄法都寄坤二，'}<b>两种寄法排出的盘完全一样。</b>` : '按你填的时间：这是阳遁，<b>两种寄法排出的盘不同</b>（天禽和寄宫相关的星、门位置会变）。' },
      gods: { same: true, html: '<b>只影响两个名字，盘面位置不变。</b>' },
      keying: { same: true, html: '<b>只影响原文里的克应段落和第 9 步动画，盘面不变。</b>' },
      overlay: (() => {
        const c = ch({ keying: true, overlay: true }); const n = c.keying.palaces.reduce((a, k) => a + k.overlay.length, 0);
        return { same: n === 0, html: c.steps.xun.xunYi === '戊' ? '按你填的时间：本旬是甲子旬，真甲就是戊，<b>勾选与否结果相同。</b>' : n ? `按你填的时间：本旬甲遁于${c.steps.xun.xunYi}，<b>会多出 ${n} 条叠加</b>（${c.keying.palaces.flatMap((k) => k.overlay.map((v) => v.name.replace(/（.*/, ''))).join('、')}）。` : `按你填的时间：本旬甲遁于${c.steps.xun.xunYi}，但盘上没有这四种组合，<b>勾选与否结果相同。</b>` };
      })(),
      starState: (() => {
        const a1 = ch({ keying: true, starState: 'month' }).keying, a2 = ch({ keying: true, starState: 'palace' }).keying;
        const diff = a1.palaces.flatMap((k, i) => k.stars.map((s0, j) => [s0, a2.palaces[i].stars[j]])).filter(([x, y]) => x.state !== y.state);
        return { same: !diff.length, html: diff.length ? `按你填的时间：<b>${diff.length} 颗星的旺衰会变</b>（${diff.slice(0, 4).map(([x, y]) => `${x.star.slice(1)} ${x.state}→${y.state}`).join('，')}${diff.length > 4 ? '……' : ''}）。` : '按你填的时间：<b>两种算法结果相同。</b>' };
      })(),
      dayChange: dayChangeImpact(o, ch, (a23, a0) => juName(a23) === juName(a0), '局和盘也可能不同'),
      solar: solarImpact(o, ch, {
        same: (s1, s0) => s1.steps.pillars.hour === s0.steps.pillars.hour && s1.steps.pillars.day === s0.steps.pillars.day,
        yes: (s0) => `时辰仍是${s0.steps.pillars.hour}时，结果相同。`,
        no: (s0, s1) => `时辰会从${s0.steps.pillars.hour}时变成${s1.steps.pillars.hour}时，整张盘会不同。`,
      }),
    };
  },
};

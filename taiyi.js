/*
 * 太乙神数 —— 起式算法核心（依赖 qimen.js 提供的节气、四柱与时间换算）
 * 主派《太乙统宗宝鉴》，以《太乙金镜式经》校勘。时计为主，岁计可选。
 * 浏览器中挂到 window.TY；Node 中 module.exports。
 *
 * 只实现口径已闭合的部分：积数、局数、太乙、文昌、计神、合神、始击、主客算与大将参将、
 * 以及定义明确的格局（掩、囚、关、对、格、击、迫，提挟仅作“疑似”）。
 * 定算、四神、天乙、地乙、直符、飞符、四郭固杜、月计、日计暂不排。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./qimen.js'));
  else root.TY = factory(root.QM);
})(typeof self !== 'undefined' ? self : this, function (QM) {
  'use strict';

  const ZHI = QM.ZHI;
  const mod = (a, n) => ((a % n) + n) % n;
  const cyc = (x, n) => mod(x, n) || n; // 取余，余 0 取 n（“算外”一基）

  // 十六神环（0 起）：子 丑 艮 寅 卯 辰 巽 巳 午 未 坤 申 酉 戌 乾 亥
  const RING16 = '子丑艮寅卯辰巽巳午未坤申酉戌乾亥'.split('');
  const GOD16 = ['地主', '阳德', '和德', '吕申', '高丛', '太阳', '太炅', '大神', '大威', '天道', '大武', '武德', '太簇', '阴主', '阴德', '大义'];
  const r16 = (ch) => RING16.indexOf(ch);

  // 太乙九宫（与洛书数不同）
  const GONG = {
    1: { name: '乾', dir: '西北' }, 2: { name: '离', dir: '正南' }, 3: { name: '艮', dir: '东北' }, 4: { name: '震', dir: '正东' },
    5: { name: '中', dir: '中央' }, 6: { name: '兑', dir: '正西' }, 7: { name: '坤', dir: '西南' }, 8: { name: '坎', dir: '正北' }, 9: { name: '巽', dir: '东南' },
  };
  // 十六神所属之宫
  const GONG_OF16 = { 子: 8, 丑: 3, 艮: 3, 寅: 3, 卯: 4, 辰: 9, 巽: 9, 巳: 9, 午: 2, 未: 7, 坤: 7, 申: 7, 酉: 6, 戌: 1, 乾: 1, 亥: 1 };
  // 八宫按方位环行（用于相邻、对冲）：乾 坎 艮 震 巽 离 坤 兑
  const COMPASS = [1, 8, 3, 4, 9, 2, 7, 6];
  // 八宫正位（四维或四正）
  const ZHENG = { 1: '乾', 2: '午', 3: '艮', 4: '卯', 6: '酉', 7: '坤', 8: '子', 9: '巽' };
  const opposite = (g) => COMPASS[(COMPASS.indexOf(g) + 4) % 8];
  const adjacent = (a, b) => { const i = COMPASS.indexOf(a), j = COMPASS.indexOf(b); return i >= 0 && j >= 0 && (mod(i - j, 8) === 1 || mod(j - i, 8) === 1); };

  const SEQ_YANG = [1, 2, 3, 4, 6, 7, 8, 9];
  const SEQ_YIN = [9, 8, 7, 6, 4, 3, 2, 1];
  // 文昌十八位（遇阴德、大武或太炅、和德重留一算）
  const WC_YANG = '申酉戌乾乾亥子丑艮寅卯辰巽巳午未坤坤'.split('');
  const WC_YIN = '寅卯辰巽巽巳午未坤申酉戌乾亥子丑艮艮'.split('');
  // 计神：阳遁起寅、阴遁起申，皆逆行十二辰
  const JS_YANG = '寅丑子亥戌酉申未午巳辰卯'.split('');
  const JS_YIN = '申未午巳辰卯寅丑子亥戌酉'.split('');
  const LIUHE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };

  // 七十二局主、客、定算（定算为实验字段，不进入正式盘）。与《统宗》卷四、卷五局例对校一致。
  const CAL_YANG = [[7,13,13],[6,1,1],[1,40,32],[25,17,10],[25,14,1],[25,10,12],[8,25,9],[1,22,3],[3,15,33],[1,12,25],[4,4,13],[37,1,4],[18,19,19],[10,9,9],[9,7,6],[1,33,26],[7,27,16],[7,26,11],[8,32,14],[7,26,2],[2,17,33],[16,30,1],[16,23,32],[16,17,23],[39,40,40],[32,31,31],[31,28,24],[14,9,38],[13,39,26],[10,32,17],[33,10,34],[25,8,24],[24,3,15],[26,4,11],[25,28,1],[25,27,36],[1,7,7],[6,35,35],[35,34,26],[27,19,12],[27,16,3],[27,12,34],[8,17,1],[23,14,32],[32,7,25],[5,16,29],[4,8,17],[1,5,8],[24,25,25],[16,15,15],[15,13,6],[39,31,24],[38,25,14],[38,24,9],[16,3,22],[15,34,10],[10,25,10],[12,26,27],[12,19,28],[12,13,19],[33,34,34],[26,25,25],[25,22,18],[16,11,7],[15,1,28],[12,34,19],[25,2,26],[17,8,16],[16,32,7],[30,4,15],[29,32,5],[29,31,9]];
  const CAL_YIN = [[5,29,7],[4,17,1],[1,16,30],[25,33,2],[25,30,1],[17,26,10],[2,3,3],[1,7,7],[7,33,27],[1,24,25],[6,26,19],[35,23,8],[12,37,12],[12,27,11],[11,25,4],[1,15,24],[3,9,16],[3,8,9],[14,16,16],[13,10,10],[10,1,39],[24,14,1],[24,7,40],[16,1,29],[31,16,32],[30,7,29],[29,4,26],[8,25,32],[7,15,26],[2,8,15],[27,28,28],[27,26,26],[26,18,15],[26,22,9],[25,10,1],[25,9,34],[1,25,3],[4,13,37],[27,12,26],[33,1,10],[33,38,9],[25,34,38],[2,1,1],[39,38,38],[38,31,25],[7,1,31],[6,32,25],[1,29,14],[16,1,17],[16,31,15],[15,29,4],[33,7,16],[32,1,8],[32,8,1],[16,18,18],[15,12,12],[12,3,1],[18,8,35],[18,1,34],[10,35,25],[27,22,28],[26,3,25],[25,4,12],[16,33,3],[15,23,34],[10,16,23],[25,26,26],[25,24,24],[24,16,13],[32,28,15],[31,16,7],[31,15,1]];

  // 大将：算去十取零；整十取十位（十→一、二十→二……）。参将：大将三因去十。
  const general = (s) => (s % 10 === 0 ? s / 10 : s % 10);
  const vgen = (g) => (g * 3) % 10 || 5;

  // 算数性质（《统宗》常用名目：三才、无天无地等）
  function calTraits(s) {
    const t = [];
    if (s < 10) t.push('无天'); // 无十位
    if (s % 10 === 0) t.push('无地'); // 无个位
    if (s >= 10 && s % 10 !== 0) t.push('三才数足');
    if (s < 10 && s % 10 !== 0) t.push('单数');
    return t;
  }

  const DEFAULT_OPTS = { ji: 'shi', dayChange: 23, solar: false, lon: 120 };
  const OPT_TEXT = { ji: { shi: '时计', sui: '岁计' }, dayChange: { 23: '23 点换日', 0: '0 点换日' } };
  const C_SHI = 708011105; // 时计积日基准（与 kintaiyi v0.2.4 对照用，非《统宗》原文常数）
  const JDN_1900_12_21 = 2415375;
  const civilJdn = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 86400e3 + 2440587.5 + 0.5);
  const fmtBig = (n) => n.toLocaleString('en-US');

  function cast(y, m, d, h, mi, opts) {
    const o = Object.assign({}, DEFAULT_OPTS, opts || {});
    const P = QM.fourPillars(y, m, d, h, mi, { dayChange: o.dayChange, solar: o.solar, lon: o.lon });
    const steps = {};
    steps.pillars = {
      year: QM.ganzhi(P.yearIdx), month: QM.ganzhi(P.monthIdx), day: QM.ganzhi(P.dayIdx), hour: QM.ganzhi(P.hourIdx),
      sunLon: P.lon, clock: QM.fmtDT(P.clock), eot: P.eot, dayShift: P.dayShift,
    };

    // ① 积数、阴阳遁、局
    let acc, kook, yang, accName, unit, accDetail;
    if (o.ji === 'sui') {
      const yy = (m <= 2 && P.lon >= 240 && P.lon < 315) ? y - 1 : y; // 立春换年
      const N = 10153916 + yy, L = N + 1;
      acc = N; kook = cyc(L, 72); yang = true; accName = '积年'; unit = '年';
      const zhou = cyc(L, 360);
      accDetail = { year: yy, N, L, zhou, jiNo: Math.ceil(zhou / 60), ruJi: cyc(zhou, 60), yuan: Math.ceil(zhou / 72) };
    } else {
      const D = civilJdn(P.clock.y, P.clock.m, P.clock.d) - JDN_1900_12_21;
      const hi = Math.floor((P.clock.h + 1) / 2); // 0..12，23 点后为 12（即次日子时）
      const H = (C_SHI + D - 1) * 12 + hi + 1;
      acc = H; kook = cyc(H, 72); accName = '积时'; unit = '时';
      // 冬至至夏至阳遁，夏至至冬至阴遁（按精确时刻）
      yang = P.lon >= 270 || P.lon < 90;
      accDetail = { D, hi, H };
    }
    const dun = yang ? '阳遁' : '阴遁';
    const li = ['理人', '理天', '理地'][kook % 3];
    steps.ju = { ji: o.ji, accName, unit, acc, accText: fmtBig(acc), kook, yang, dun, li, ...accDetail };

    // ② 太乙行宫：小周二十四，三约为宫，不入中五
    const r = cyc(kook, 24);
    const step = Math.floor((r - 1) / 3);
    const seq = yang ? SEQ_YANG : SEQ_YIN;
    const taiyi = seq[step];
    steps.taiyi = { r, step, seq, gong: taiyi, inGong: mod(r - 1, 3) + 1 };

    // ③ 文昌：十八位
    const wcN = cyc(kook, 18);
    const wcSeq = yang ? WC_YANG : WC_YIN;
    const wc = wcSeq[wcN - 1];
    steps.wc = { n: wcN, seq: wcSeq, pos: wc };

    // ④ 计神、合神
    const jsN = cyc(kook, 12);
    const jsSeq = yang ? JS_YANG : JS_YIN;
    const js = jsSeq[jsN - 1];
    const taisui = o.ji === 'sui' ? ZHI[P.yearIdx % 12] : ZHI[P.hourIdx % 12];
    const he = LIUHE[taisui];
    steps.js = { n: jsN, seq: jsSeq, pos: js, taisui, he };

    // ⑤ 始击 = 文昌 − 计神 + 和德（十六神环上计位）
    const sf = RING16[mod(r16(wc) - r16(js) + r16('艮'), 16)];
    steps.sf = { pos: sf, delta: mod(r16(wc) - r16(js), 16) };

    // ⑥ 主客算与将
    const [home, away] = (yang ? CAL_YANG : CAL_YIN)[kook - 1];
    const hg = general(home), hv = vgen(hg), ag = general(away), av = vgen(ag);
    steps.cal = { home, away, hg, hv, ag, av, homeTraits: calTraits(home), awayTraits: calTraits(away) };

    // ⑦ 格局（只判定义明确者）
    const pats = [];
    const add = (name, why, sure = true) => pats.push({ name, why, sure });
    const gOf = (p) => GONG_OF16[p];
    const tyG = taiyi;
    const zheng = ZHENG[tyG], ringD = mod(r16(sf) - r16(zheng), 16);
    if (sf === zheng) add('掩', `始击${sf}临太乙所在${GONG[tyG].name}宫正位`);
    if (gOf(wc) === tyG) add('囚', `文昌${wc}与太乙同在${GONG[tyG].name}宫`);
    [['主大将', hg], ['主参将', hv], ['客大将', ag], ['客参将', av]].forEach(([n, g]) => { if (g === tyG) add('囚', `${n}与太乙同在${GONG[tyG].name}宫`); });
    [['主大将', hg], ['主参将', hv]].forEach(([n1, g1]) => [['客大将', ag], ['客参将', av]].forEach(([n2, g2]) => { if (g1 === g2 && g1 !== 5) add('关', `${n1}与${n2}同在${GONG[g1].name}宫`); }));
    if (gOf(wc) === opposite(tyG)) add('对', `文昌${wc}在太乙对宫${GONG[opposite(tyG)].name}`);
    if (gOf(sf) === opposite(tyG)) add('格', `始击${sf}在太乙对宫${GONG[opposite(tyG)].name}`);
    [['客大将', ag], ['客参将', av]].forEach(([n, g]) => { if (g === opposite(tyG)) add('格', `${n}在太乙对宫${GONG[g].name}`); });
    if (ringD === 1 || ringD === 15) add('击', `始击${sf}在太乙${GONG[tyG].name}宫正位相邻之辰（辰击）`);
    else if (adjacent(gOf(sf), tyG)) add('击', `始击${sf}在太乙邻宫${GONG[gOf(sf)].name}（宫击）`);
    const pressers = [['主大将', hg], ['主参将', hv], ['客大将', ag], ['客参将', av]].filter(([, g]) => adjacent(g, tyG));
    pressers.forEach(([n, g]) => add('迫', `${n}在太乙邻宫${GONG[g].name}`));
    const sides = new Set([gOf(sf), hg, hv, ag, av].filter((g) => adjacent(g, tyG)));
    if (sides.size >= 2) add('提挟（疑似）', `太乙${GONG[tyG].name}宫两侧邻宫皆有将神`, false);
    steps.pats = pats;

    return {
      input: { y, m, d, h, mi, text: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` },
      opts: o, steps,
      board: { taiyi, wc, js, he, sf, hg, hv, ag, av },
    };
  }

  function toText(c, question) {
    const S = c.steps, o = c.opts, J = S.ju, L = [];
    const g = (n) => `${n}宫${GONG[n].name}`;
    const p16 = (p) => `${p}（${GOD16[r16(p)]}）`;
    L.push(`【太乙神数】${OPT_TEXT.ji[o.ji]} · 《太乙统宗宝鉴》 · ${OPT_TEXT.dayChange[o.dayChange]} · ${o.solar ? '真太阳时' : '北京时间'}`);
    if (o.solar) L.push(`起式时间：${c.input.text}（北京时间）；真太阳时 ${S.pillars.clock}（东经 ${o.lon}°）`);
    else L.push(`起式时间：${c.input.text}（北京时间，未做真太阳时校正）`);
    L.push(`四柱：${S.pillars.year}年 ${S.pillars.month}月 ${S.pillars.day}日 ${S.pillars.hour}时`);
    if (o.ji === 'sui') L.push(`积年：${fmtBig(J.N)}（${J.year} 年，立春换年），第${J.jiNo}纪入纪第 ${J.ruJi} 年，第${J.yuan}元`);
    else L.push(`积时：${J.accText}（时计以冬至、夏至精确时刻分阴阳遁）`);
    L.push(`局：${J.dun}${J.kook}局（${J.li}）`);
    L.push(`太乙：${g(S.taiyi.gong)}，入宫第 ${S.taiyi.inGong} ${J.unit}（每宫三${J.unit}，不入中五）`);
    L.push(`文昌（天目）：${p16(S.wc.pos)}；计神：${p16(S.js.pos)}；合神：${S.js.he}（${o.ji === 'sui' ? '年' : '时'}支${S.js.taisui}之合）`);
    L.push(`始击（地目）：${p16(S.sf.pos)}，属${g(GONG_OF16[S.sf.pos])}`);
    const C = S.cal;
    L.push(`主算 ${C.home}（${C.homeTraits.join('、')}）：主大将${g(C.hg)}，主参将${g(C.hv)}`);
    L.push(`客算 ${C.away}（${C.awayTraits.join('、')}）：客大将${g(C.ag)}，客参将${g(C.av)}`);
    L.push('');
    L.push('格局（程序按明确定义判定；提挟仅作疑似；四郭固、四郭杜、定算等未排）：');
    if (S.pats.length) for (const p of S.pats) L.push(`- ${p.name}：${p.why}`);
    else L.push('- 未见掩、囚、关、对、格、击、迫');
    L.push('');
    L.push('请你作为熟悉太乙神数的解读者，基于以上式盘：');
    L.push('1. 说明局数、太乙所在宫及入宫远近的含义；');
    L.push('2. 分析文昌、始击与太乙的关系，以及主客算数（长短、三才、无天无地）与主客大将参将的落宫；');
    L.push('3. 结合格局，按主客胜负的思路给出判断与建议；');
    L.push('4. 说明这些结论的不确定性。');
    L.push(`所问之事：${question && question.trim() ? question.trim() : '（未填写，请先给出整体解读）'}`);
    return L.join('\n');
  }

  return { cast, toText, DEFAULT_OPTS, OPT_TEXT, RING16, GOD16, GONG, GONG_OF16, SEQ_YANG, SEQ_YIN, CAL_YANG, CAL_YIN, general, vgen };
});

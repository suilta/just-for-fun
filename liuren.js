/*
 * 大六壬 —— 起课算法核心（依赖 qimen.js 提供的节气与四柱）
 * 浏览器中挂到 window.LR；Node 中 module.exports。
 *
 * 流程：四柱、月将 → 天地盘 → 四课 → 三传（九宗门）→ 十二天将 → 遁干、六亲、旬空
 * 每一步的中间过程写进 steps，供页面做分阶段动画。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./qimen.js'));
  else root.LR = factory(root.QM);
})(typeof self !== 'undefined' ? self : this, function (QM) {
  'use strict';

  const GAN = QM.GAN, ZHI = QM.ZHI;
  const mod = (a, n) => ((a % n) + n) % n;
  const zi = (ch) => ZHI.indexOf(ch);

  const ZHI_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
  const GAN_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const ke = (a, b) => KE[a] === b; // 五行 a 克 b

  // 十干寄宫
  const JIGONG = [2, 4, 5, 7, 5, 7, 8, 10, 11, 1]; // 甲寅 乙辰 丙巳 丁未 戊巳 己未 庚申 辛戌 壬亥 癸丑
  // 月将名
  const JIANG_NAME = ['神后', '大吉', '功曹', '太冲', '天罡', '太乙', '胜光', '小吉', '传送', '从魁', '河魁', '登明'];
  // 十二天将
  const GENERALS = ['贵人', '腾蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];
  // 贵人：日干 → [昼贵, 夜贵]（甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎）
  // 甲戊庚丑昼未夜，乙己子昼申夜，丙丁亥昼酉夜，壬癸巳昼卯夜，辛午昼寅夜（庚不归马虎）
  const GUIREN = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 8: [5, 3], 9: [5, 3], 7: [6, 2] };
  // 刑
  const XING = { 0: 3, 3: 0, 2: 5, 5: 8, 8: 2, 1: 10, 10: 7, 7: 1, 4: 4, 6: 6, 9: 9, 11: 11 };
  // 驿马（按三合局）
  const MA = (z) => [2, 11, 8, 5][z % 4];
  // 三合局：申子辰 亥卯未 寅午戌 巳酉丑，取“前一辰”
  const SANHE_NEXT = (z) => mod(z + 4, 12);
  const GANHE = [5, 6, 7, 8, 9, 0, 1, 2, 3, 4]; // 甲己 乙庚 丙辛 丁壬 戊癸
  const MENG = [2, 5, 8, 11], ZHONG = [0, 3, 6, 9];

  function liuqin(dayWx, wx) {
    if (wx === dayWx) return '兄弟';
    if (SHENG[wx] === dayWx) return '父母';
    if (SHENG[dayWx] === wx) return '子孙';
    if (KE[wx] === dayWx) return '官鬼';
    return '妻财';
  }

  // 排盘选项：默认口径锁定为 23 点换日、卯至申为昼
  const DEFAULT_OPTS = { dayChange: 23, dayNight: 'maoshen', lat: 39.9, lon: 116.4 };
  const OPT_TEXT = {
    dayChange: { 23: '23 点换日', 0: '0 点换日' },
    dayNight: { maoshen: '卯至申为昼', sun: '按当地日出日落分昼夜' },
  };
  // 当地是否白天：真太阳时与日出日落时角比较
  function sunUp(y, m, d, h, mi, lonSun, lat, lonDeg) {
    const eps = 23.4393 * Math.PI / 180, lam = lonSun * Math.PI / 180, phi = lat * Math.PI / 180;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    const c = (Math.sin(-0.833 * Math.PI / 180) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    const half = c <= -1 ? 12 : c >= 1 ? 0 : Math.acos(c) * 180 / Math.PI / 15; // 半昼长（小时）
    const solar = h + mi / 60 + ((lonDeg - 120) * 4 + QM.equationOfTime(y, m, d, h)) / 60;
    return { day: Math.abs(solar - 12) < half, rise: 12 - half, set: 12 + half, solar };
  }

  function cast(y, m, d, h, mi, opts) {
    const o = Object.assign({}, DEFAULT_OPTS, opts || {});
    const P = QM.fourPillars(y, m, d, h, mi, { dayChange: o.dayChange });
    const steps = {};
    const dayGan = P.dayIdx % 10, dayZhi = P.dayIdx % 12, hourZhi = P.hourIdx % 12;
    const yangDay = dayGan % 2 === 0;
    const dayWx = GAN_WX[dayGan];

    // ① 四柱、月将（以中气换将：雨水后登明亥，春分后河魁戌……）
    const lon = P.lon;
    const k = Math.floor(mod(lon - 330, 360) / 30);
    const jiang = mod(11 - k, 12);
    const zhongqi = ['雨水', '春分', '谷雨', '小满', '夏至', '大暑', '处暑', '秋分', '霜降', '小雪', '冬至', '大寒'][k];
    steps.pillars = {
      year: QM.ganzhi(P.yearIdx), month: QM.ganzhi(P.monthIdx), day: QM.ganzhi(P.dayIdx), hour: QM.ganzhi(P.hourIdx),
      sunLon: lon, dayShift: P.dayShift,
      jiang, jiangName: JIANG_NAME[jiang], zhongqi, hourZhi,
    };

    // ② 天地盘：月将加占时，天盘整体旋转
    const shift = mod(jiang - hourZhi, 12); // 地盘 d 上的天盘支 = d + shift
    const tian = (dpos) => mod(dpos + shift, 12);
    const seat = (tz) => mod(tz - shift, 12); // 天盘支 tz 所临的地盘
    const fuyin = shift === 0, fanyin = shift === 6;
    steps.plate = { shift, rot: mod(hourZhi - jiang, 12), fuyin, fanyin };

    // ③ 四课
    const jg = JIGONG[dayGan];
    const k1u = tian(jg), k2u = tian(k1u), k3u = tian(dayZhi), k4u = tian(k3u);
    const ke4 = [
      { no: 1, down: GAN[dayGan], downWx: dayWx, downPos: jg, up: k1u },
      { no: 2, down: ZHI[k1u], downWx: ZHI_WX[k1u], downPos: k1u, up: k2u },
      { no: 3, down: ZHI[dayZhi], downWx: ZHI_WX[dayZhi], downPos: dayZhi, up: k3u },
      { no: 4, down: ZHI[k3u], downWx: ZHI_WX[k3u], downPos: k3u, up: k4u },
    ];
    for (const c of ke4) {
      c.upCh = ZHI[c.up]; c.upWx = ZHI_WX[c.up];
      c.zei = ke(c.downWx, c.upWx); // 下贼上
      c.ke = ke(c.upWx, c.downWx);  // 上克下
    }
    const distinct = new Set(ke4.map((c) => c.down + c.upCh)).size;
    steps.ke = { list: ke4, jigong: jg, distinct };

    // ④ 三传（九宗门）
    const why = [];
    let method = '', chu = null, zhong = null, mo = null;
    const sameYY = (z) => (z % 2 === 0) === yangDay;
    const uniqUp = (arr) => { const seen = new Set(); return arr.filter((c) => (seen.has(c.up) ? false : seen.add(c.up))); };

    function sheHai(cands) {
      const scored = cands.map((c) => {
        const from = seat(c.up); let n = 0; const hits = [];
        for (let i = 1; i < 12; i++) { // 起点（所临地盘）与本家都不计
          const p = mod(from + i, 12);
          if (p === c.up) break;
          if (ke(ZHI_WX[p], c.upWx)) { n++; hits.push(ZHI[p]); }
          for (let g = 0; g < 10; g++) if (JIGONG[g] === p && ke(GAN_WX[g], c.upWx)) { n++; hits.push(GAN[g]); }
        }
        return { c, n, hits, from };
      });
      const max = Math.max(...scored.map((s) => s.n));
      let top = scored.filter((s) => s.n === max);
      why.push('涉害：' + scored.map((s) => `${s.c.upCh}从地盘${ZHI[s.from]}归本家，受克 ${s.n} 次${s.hits.length ? '（' + s.hits.join('') + '）' : ''}`).join('；'));
      if (top.length === 1) return { up: top[0].c.up, sub: '涉害' };
      const m1 = top.filter((s) => MENG.includes(s.from));
      if (m1.length === 1) { why.push('涉害等深，取临孟神者'); return { up: m1[0].c.up, sub: '见机' }; }
      const m2 = m1.length ? [] : top.filter((s) => ZHONG.includes(s.from));
      if (m2.length === 1) { why.push('涉害等深，无临孟者，取临仲神者'); return { up: m2[0].c.up, sub: '察微' }; }
      why.push(`涉害等深且孟仲不能分，${yangDay ? '阳日取干上神' : '阴日取支上神'}`);
      return { up: yangDay ? k1u : k3u, sub: '缀瑕' };
    }

    function zeiKe(label) {
      const zei = uniqUp(ke4.filter((c) => c.zei));
      const keL = uniqUp(ke4.filter((c) => c.ke));
      const cands = zei.length ? zei : keL;
      const kind = zei.length ? '下贼上' : '上克下';
      why.push(`四课中${kind}者：${cands.map((c) => `第${c.no}课 ${c.down}${c.upCh}`).join('、')}`);
      if (cands.length === 1) { method = (label || '') + (zei.length ? '重审' : '元首'); return cands[0].up; }
      const bi = cands.filter((c) => sameYY(c.up));
      why.push(`比用：与日干同为${yangDay ? '阳' : '阴'}者 ${bi.length ? bi.map((c) => c.upCh).join('、') : '无'}`);
      if (bi.length === 1) { method = (label || '') + '比用（知一）'; return bi[0].up; }
      const r = sheHai(bi.length ? bi : cands);
      method = (label || '') + r.sub; return r.up;
    }

    const hasKe = ke4.some((c) => c.zei || c.ke);
    const ganShang = k1u, zhiShang = k3u;
    if (fuyin) {
      if (hasKe) { chu = zeiKe('伏吟 · '); }
      else { chu = yangDay ? ganShang : zhiShang; method = '伏吟（' + (yangDay ? '阳日取干上' : '阴日取支上') + '）'; why.push('天地盘不动，无克，' + (yangDay ? '阳日以干上神为初传' : '阴日以支上神为初传')); }
      if (XING[chu] === chu) { zhong = yangDay ? zhiShang : ganShang; why.push(`初传${ZHI[chu]}自刑，中传取${yangDay ? '支上神' : '干上神'}`); }
      else { zhong = XING[chu]; why.push(`中传取初传所刑：${ZHI[chu]}刑${ZHI[zhong]}`); }
      if (XING[zhong] === zhong) { mo = mod(zhong + 6, 12); why.push(`中传${ZHI[zhong]}自刑，末传取其冲`); }
      else { mo = XING[zhong]; why.push(`末传取中传所刑：${ZHI[zhong]}刑${ZHI[mo]}`); }
    } else if (fanyin && !hasKe) {
      chu = MA(dayZhi); zhong = zhiShang; mo = ganShang; method = '返吟（无亲）';
      why.push(`天盘与地盘对冲且四课无克，初传取日支驿马${ZHI[chu]}，中传支上神，末传干上神`);
    } else if (hasKe) {
      chu = zeiKe(fanyin ? '返吟 · ' : '');
    } else if (jg === dayZhi) {
      chu = yangDay ? mod(ganShang + 2, 12) : mod(k4u - 2, 12);
      zhong = ganShang; mo = ganShang; method = '八专';
      why.push(`干支同位且无克，${yangDay ? '阳日从干上神顺数三位' : '阴日从第四课上神逆数三位'}为初传，中末皆取干上神`);
    } else {
      const ups = uniqUp(ke4.slice(1));
      let cands = ups.filter((c) => ke(c.upWx, dayWx)); let sub = '蒿矢';
      if (cands.length) why.push(`四课无克，取遥克：神克日者 ${cands.map((c) => c.upCh).join('、')}`);
      else { cands = ups.filter((c) => ke(dayWx, c.upWx)); sub = '弹射'; if (cands.length) why.push(`四课无克，取遥克：日克神者 ${cands.map((c) => c.upCh).join('、')}`); }
      if (cands.length) {
        if (cands.length > 1) { const bi = cands.filter((c) => sameYY(c.up)); if (bi.length) cands = bi; why.push(`多神遥克，比用取 ${cands[0].upCh}`); }
        chu = cands[0].up; method = '遥克（' + sub + '）';
      } else if (distinct === 4) {
        method = '昴星';
        if (yangDay) { chu = tian(9); zhong = zhiShang; mo = ganShang; why.push('无克无遥克，四课俱全，阳日取地盘酉上神为初传，中传支上神，末传干上神'); }
        else { chu = seat(9); zhong = ganShang; mo = zhiShang; why.push('无克无遥克，四课俱全，阴日取天盘酉所临地盘为初传，中传干上神，末传支上神'); }
      } else {
        method = '别责';
        chu = yangDay ? tian(JIGONG[GANHE[dayGan]]) : SANHE_NEXT(dayZhi);
        zhong = ganShang; mo = ganShang;
        why.push(`四课不全且无克，${yangDay ? `阳日取干合（${GAN[GANHE[dayGan]]}）寄宫上神` : '阴日取日支三合前一辰'}为初传，中末皆取干上神`);
      }
    }
    if (zhong === null) { zhong = tian(chu); mo = tian(zhong); why.push(`中传为初传${ZHI[chu]}上神${ZHI[zhong]}，末传为中传上神${ZHI[mo]}`); }
    steps.chuan = { method, why, list: [chu, zhong, mo] };

    // ⑤ 十二天将
    let isDay, sun = null;
    if (o.dayNight === 'sun') { sun = sunUp(y, m, d, h, mi, P.lon, o.lat, o.lon); isDay = sun.day; }
    else isDay = hourZhi >= 3 && hourZhi <= 8;
    const gui = GUIREN[dayGan][isDay ? 0 : 1];
    const guiSeat = seat(gui);
    const shun = [11, 0, 1, 2, 3, 4].includes(guiSeat);
    const generalAt = {}; // 地盘位置 -> 天将
    for (let i = 0; i < 12; i++) generalAt[mod(guiSeat + (shun ? i : -i), 12)] = GENERALS[i];
    const generalOfTian = (tz) => generalAt[seat(tz)];
    steps.gen = { isDay, gui, guiSeat, shun, sun };

    // ⑥ 遁干、六亲、旬空
    const xunStart = mod(P.dayIdx - (P.dayIdx % 10), 12);
    const dunGan = (z) => { const n = mod(z - xunStart, 12); return n < 10 ? GAN[n] : ''; };
    const kong = [mod(xunStart + 10, 12), mod(xunStart + 11, 12)];
    const chuan = [chu, zhong, mo].map((z, i) => ({
      pos: ['初传', '中传', '末传'][i], zhi: ZHI[z], z, dun: dunGan(z), general: generalOfTian(z),
      qin: liuqin(dayWx, ZHI_WX[z]), kong: kong.includes(z),
    }));
    for (const c of ke4) { c.general = generalOfTian(c.up); }
    steps.extra = { xun: QM.ganzhi(P.dayIdx - (P.dayIdx % 10)), kong, dayMa: MA(dayZhi) };

    const plate = [];
    for (let dpos = 0; dpos < 12; dpos++) {
      const t = tian(dpos);
      plate.push({ di: ZHI[dpos], tian: ZHI[t], t, general: generalAt[dpos], kong: kong.includes(t), dun: dunGan(t) });
    }

    return {
      input: { y, m, d, h, mi, text: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` },
      opts: o, dayGan: GAN[dayGan], dayZhi: ZHI[dayZhi], yangDay, dayWx,
      steps, plate, ke4, chuan,
    };
  }

  function toText(c, question) {
    const S = c.steps, L = [];
    const o = c.opts;
    L.push(`【大六壬课式】月将加占时 · 九宗门取三传 · ${OPT_TEXT.dayChange[o.dayChange]} · ${OPT_TEXT.dayNight[o.dayNight]}`);
    L.push('取传口径：伏吟/返吟 → 贼克 → 比用 → 涉害（《六壬大全》数深浅，起点与本家不计；等深取临孟、临仲，再平阳日干上、阴日支上）→ 八专 → 遥克 → 别责 → 昴星');
    L.push(`占时：${c.input.text}（北京时间，未做真太阳时校正）`);
    L.push(`四柱：${S.pillars.year}年 ${S.pillars.month}月 ${S.pillars.day}日 ${S.pillars.hour}时`);
    L.push(`月将：${ZHI[S.pillars.jiang]}（${S.pillars.jiangName}，${S.pillars.zhongqi}后），占时：${ZHI[S.pillars.hourZhi]}`);
    L.push(`旬：${S.extra.xun}旬，旬空：${S.extra.kong.map((z) => ZHI[z]).join('')}；日马：${ZHI[S.extra.dayMa]}`);
    const hm = (x) => `${String(Math.floor(x)).padStart(2, '0')}:${String(Math.round((x % 1) * 60) % 60).padStart(2, '0')}`;
    L.push(`贵人：${S.gen.isDay ? '昼' : '夜'}贵在${ZHI[S.gen.gui]}，临地盘${ZHI[S.gen.guiSeat]}，${S.gen.shun ? '顺行' : '逆行'}${S.gen.sun ? `（北纬 ${o.lat}°、东经 ${o.lon}°，真太阳时 ${hm(S.gen.sun.solar)}，日出 ${hm(S.gen.sun.rise)}、日落 ${hm(S.gen.sun.set)}）` : '（卯至申为昼）'}`);
    if (S.plate.fuyin) L.push('天地盘：伏吟'); else if (S.plate.fanyin) L.push('天地盘：返吟');
    L.push('');
    L.push('天地盘（地盘 → 天盘 · 天将）：');
    L.push(c.plate.map((p) => `${p.di}→${p.tian}${p.general ? '·' + p.general : ''}${p.kong ? '(空)' : ''}`).join('  '));
    L.push('');
    L.push('四课（自右向左为一至四课，此处按序列出 下神/上神）：');
    for (const k of c.ke4) L.push(`- 第${k.no}课：${k.down} 上 ${k.upCh}（${k.general}）${k.zei ? '，下贼上' : k.ke ? '，上克下' : ''}`);
    L.push('');
    L.push(`三传（${S.chuan.method}）：`);
    for (const t of c.chuan) L.push(`- ${t.pos}：${t.dun || '　'}${t.zhi} ${t.general} ${t.qin}${t.kong ? '（旬空）' : ''}`);
    L.push(`取传依据：${S.chuan.why.join('；')}`);
    L.push('');
    L.push('请你作为熟悉大六壬的解读者，基于以上课式：');
    L.push('1. 说明课体（取传之法）的含义，以及日辰（干上、支上）所代表的人我关系；');
    L.push('2. 依初传为事之起、中传为事之变、末传为事之归，逐一分析三传的天将、六亲、遁干、旬空；');
    L.push('3. 结合所问之事给出判断、建议与应期参考；');
    L.push('4. 说明这些结论的不确定性。');
    L.push(`所问之事：${question && question.trim() ? question.trim() : '（未填写，请先给出整体解读）'}`);
    return L.join('\n');
  }

  return { cast, toText, DEFAULT_OPTS, OPT_TEXT, ZHI, GAN, GENERALS, JIANG_NAME, JIGONG, ZHI_WX };
});

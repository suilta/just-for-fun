/*
 * 规则测试：npm test
 * 每条规则用独立写的检查逻辑，对大量随机时刻逐一核对，不复用被测代码里的取传函数。
 */
import * as astro from '../src/core/astro.js';
import * as cal from '../src/core/calendar.js';
import * as qimen from '../src/arts/qimen/core.js';
import * as LR from '../src/arts/liuren/core.js';
import * as TY from '../src/arts/taiyi/core.js';
import * as BZ from '../src/arts/bazi/core.js';
import * as TR from '../src/arts/tarot/core.js';
import { DECK } from '../src/arts/tarot/cards.js';
import { toLunar } from '../src/core/lunar.js';
import * as MH from '../src/arts/meihua/core.js';
import * as XL from '../src/arts/xiaoliuren/core.js';
import * as LY from '../src/arts/liuyao/core.js';
import * as NA from '../src/arts/natal/core.js';
import { placeOf, CITIES } from '../src/arts/natal/places.js';
import { natalImpacts } from '../src/arts/natal/impacts.js';
import * as Astro from 'astronomy-engine';
import { readFileSync } from 'node:fs';
import * as AL from '../src/core/almanac.js';
import { plain } from '../src/ui/history.js';
const QM = { ...astro, ...cal, ...qimen };

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) pass++;
  else { fail++; if (failures.length < 30) failures.push(`✗ ${name}${detail ? '：' + detail : ''}`); }
}
const Z = '子丑寅卯辰巳午未申酉戌亥';
const zi = (c) => Z.indexOf(c);
const mod = (a, n) => ((a % n) + n) % n;
const WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const GWX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const ke = (a, b) => KE[a] === b;
const JI = { 甲: '寅', 乙: '辰', 丙: '巳', 丁: '未', 戊: '巳', 己: '未', 庚: '申', 辛: '戌', 壬: '亥', 癸: '丑' };

// ── 天文与奇门 ──
const f = (deg, y, m, d) => QM.fmtDT(QM.beijingFromJd(QM.solveTerm(deg, QM.jdFromBeijing(y, m, d))));
check('2024 冬至 17:20', f(270, 2024, 12, 21) === '2024-12-21 17:20', f(270, 2024, 12, 21));
check('2025 立春 22:10', f(315, 2025, 2, 3) === '2025-02-03 22:10', f(315, 2025, 2, 3));
check('2026 立春 04:02', f(315, 2026, 2, 4) === '2026-02-04 04:02', f(315, 2026, 2, 4));
check('2025 夏至 10:42', f(90, 2025, 6, 21) === '2025-06-21 10:42', f(90, 2025, 6, 21));
const p2000 = QM.chart(2000, 1, 1, 12, 0).steps.pillars;
check('2000-01-01 四柱 己卯 丙子 戊午 戊午', [p2000.year, p2000.month, p2000.day, p2000.hour].join(' ') === '己卯 丙子 戊午 戊午');
check('23 点换日', QM.chart(2026, 11, 10, 23, 10).steps.pillars.day === '己丑' && QM.chart(2026, 11, 10, 23, 10, { dayChange: 0 }).steps.pillars.day === '戊子');
const zr = (y, m, d) => QM.chart(y, m, d, 12, 0, { yuan: 'zhirun' }).steps.ju;
check('2024-12-11 起闰大雪', zr(2024, 12, 11).leap && zr(2024, 12, 11).juTerm === '大雪' && zr(2024, 12, 11).yuan === '上元');
check('2024-12-26 甲子入冬至', !zr(2024, 12, 26).leap && zr(2024, 12, 26).juTerm === '冬至' && zr(2024, 12, 26).yuan === '上元');

// ── 大六壬：随机课例逐条核对 ──
const N = 20000;
const seen = {};
let seed = 20261110;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let i = 0; i < N; i++) {
  const t = new Date(Date.UTC(1950, 0, 1) + rnd() * 100 * 365.25 * 864e5);
  const a = [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes()];
  const c = LR.cast(...a);
  const S = c.steps, tag = a.join('-') + ' ' + S.pillars.day + S.pillars.hour;
  const method = S.chuan.method;
  seen[method.replace(/（.*/, '')] = (seen[method.replace(/（.*/, '')] || 0) + 1;
  const dayG = c.dayGan, dayZ = c.dayZhi, yang = '甲丙戊庚壬'.includes(dayG);
  const shift = S.plate.shift, tian = (d) => mod(d + shift, 12), seat = (u) => mod(u - shift, 12);
  const hz = S.pillars.hourZhi;

  // 月将：中气后逆行（雨水亥、春分戌……）
  const k = Math.floor(mod(S.pillars.sunLon - 330, 360) / 30);
  check('月将', S.pillars.jiang === mod(11 - k, 12), tag);
  // 天盘：月将加占时
  check('月将加时', tian(hz) === S.pillars.jiang, tag);
  // 四课
  const k1 = tian(zi(JI[dayG])), k2 = tian(k1), k3 = tian(zi(dayZ)), k4 = tian(k3);
  check('四课', c.ke4.map((x) => x.up).join() === [k1, k2, k3, k4].join(), tag);
  // 贵人表与顺逆
  const G = { 甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申', 丙: '亥酉', 丁: '亥酉', 壬: '巳卯', 癸: '巳卯', 辛: '午寅' }[dayG];
  const day = hz >= 3 && hz <= 8;
  check('贵人', Z[S.gen.gui] === G[day ? 0 : 1], tag + ` ${dayG}日${day ? '昼' : '夜'}`);
  check('贵人顺逆', S.gen.shun === '亥子丑寅卯辰'.includes(Z[seat(S.gen.gui)]), tag);
  // 中末传（非特殊课体时）
  const [c1, c2, c3] = S.chuan.list;
  const special = /伏吟|返吟（无亲）|八专|别责|昴星/.test(method);
  if (!special) check('中末传', c2 === tian(c1) && c3 === tian(c2), tag + ' ' + method);

  // 判断顺序与各法细则
  const K = [
    { down: dayG, dw: GWX[dayG], up: k1 }, { down: Z[k1], dw: WX[Z[k1]], up: k2 },
    { down: dayZ, dw: WX[dayZ], up: k3 }, { down: Z[k3], dw: WX[Z[k3]], up: k4 },
  ].map((x) => ({ ...x, uw: WX[Z[x.up]], zei: ke(x.dw, WX[Z[x.up]]), ke: ke(WX[Z[x.up]], x.dw) }));
  const hasKe = K.some((x) => x.zei || x.ke);
  if (shift === 0) {
    // 伏吟：有克取克，无克阳干上阴支上；中取初所刑，初自刑取另一侧；末取中所刑，中自刑取其冲
    const XING = { 0: 3, 3: 0, 2: 5, 5: 8, 8: 2, 1: 10, 10: 7, 7: 1, 4: 4, 6: 6, 9: 9, 11: 11 };
    const kz = K.filter((x) => x.zei), kk = K.filter((x) => x.ke);
    const first = kz.length ? kz : kk;
    const e1 = first.length ? c1 : (yang ? k1 : k3); // 有克时初传由贼克规则决定，此处只核中末
    if (first.length === 1) check('伏吟有克初传', c1 === first[0].up, tag);
    const e2 = XING[e1] === e1 ? (yang ? k3 : k1) : XING[e1];
    const e3 = XING[e2] === e2 ? mod(e2 + 6, 12) : XING[e2];
    check('伏吟', /伏吟/.test(method) && c1 === e1 && c2 === e2 && c3 === e3, tag + ' ' + method);
    continue;
  }
  if (shift === 6 && !hasKe) {
    const ma = [2, 11, 8, 5][zi(dayZ) % 4];
    check('返吟无亲', c1 === ma && c2 === k3 && c3 === k1, tag);
    continue;
  }
  if (hasKe) {
    const zei = [...new Set(K.filter((x) => x.zei).map((x) => x.up))];
    const keL = [...new Set(K.filter((x) => x.ke).map((x) => x.up))];
    const cands = zei.length ? zei : keL;
    if (cands.length === 1) { check('贼克唯一', c1 === cands[0] && /重审|元首/.test(method), tag + ' ' + method); continue; }
    const bi = cands.filter((u) => (u % 2 === 0) === yang);
    if (bi.length === 1) { check('比用', c1 === bi[0] && /比用/.test(method), tag + ' ' + method); continue; }
    // 涉害：起点、本家不计，数地支与寄干之克
    const pool = bi.length ? bi : cands;
    const depth = (u) => {
      let n = 0;
      for (let s = 1; s < 12; s++) {
        const p = mod(seat(u) + s, 12); if (p === u) break;
        if (ke(WX[Z[p]], WX[Z[u]])) n++;
        for (const g of '甲乙丙丁戊己庚辛壬癸') if (zi(JI[g]) === p && ke(GWX[g], WX[Z[u]])) n++;
      }
      return n;
    };
    const max = Math.max(...pool.map(depth));
    const top = pool.filter((u) => depth(u) === max);
    let expect;
    if (top.length === 1) expect = top[0];
    else {
      const meng = top.filter((u) => [2, 5, 8, 11].includes(seat(u)));
      const zhong = top.filter((u) => [0, 3, 6, 9].includes(seat(u)));
      if (meng.length === 1) expect = meng[0];
      else if (!meng.length && zhong.length === 1) expect = zhong[0];
      else expect = yang ? k1 : k3;
    }
    check('涉害', c1 === expect && /涉害|见机|察微|缀瑕/.test(method), tag + ` ${method} 期望${Z[expect]} 得${Z[c1]}`);
    continue;
  }
  if (JI[dayG] === dayZ) {
    check('八专先于遥克', /八专/.test(method), tag + ' ' + method);
    check('八专', c1 === (yang ? mod(k1 + 2, 12) : mod(k4 - 2, 12)) && c2 === k1 && c3 === k1, tag);
    continue;
  }
  const ups = [...new Set([k2, k3, k4])];
  const shenKe = ups.filter((u) => ke(WX[Z[u]], GWX[dayG]));
  const riKe = ups.filter((u) => ke(GWX[dayG], WX[Z[u]]));
  if (shenKe.length || riKe.length) {
    let cs = shenKe.length ? shenKe : riKe;
    if (cs.length > 1) { const bi = cs.filter((u) => (u % 2 === 0) === yang); if (bi.length) cs = bi; }
    check('遥克', /遥克/.test(method) && c1 === cs[0], tag + ' ' + method);
    continue;
  }
  const distinct = new Set(K.map((x) => x.down + x.up)).size;
  if (distinct < 4) {
    const he = { 甲: '己', 乙: '庚', 丙: '辛', 丁: '壬', 戊: '癸', 己: '甲', 庚: '乙', 辛: '丙', 壬: '丁', 癸: '戊' }[dayG];
    const exp = yang ? tian(zi(JI[he])) : mod(zi(dayZ) + 4, 12);
    check('别责', /别责/.test(method) && c1 === exp && c2 === k1 && c3 === k1, tag);
  } else {
    const exp = yang ? [tian(9), k3, k1] : [seat(9), k1, k3];
    check('昴星', /昴星/.test(method) && [c1, c2, c3].join() === exp.join(), tag);
  }
}
// ── 外部对照用例：与成熟排盘软件逐项核对过的真实课例 ──
// 2002-05-31 04:00，己亥日寅时，月将申。元亨利贞网六壬排盘与另一款六壬软件结果一致。
(function () {
  const c = LR.cast(2002, 5, 31, 4, 0);
  const S = c.steps;
  const p = S.pillars;
  check('对照1 四柱', [p.year, p.month, p.day, p.hour].join(' ') === '壬午 乙巳 己亥 丙寅');
  check('对照1 月将', Z[p.jiang] === '申');
  check('对照1 返吟', S.plate.fanyin && /返吟/.test(S.chuan.method));
  check('对照1 四课', c.ke4.map((k) => k.down + k.upCh).join(' ') === '己丑 丑未 亥巳 巳亥');
  check('对照1 四课天将', c.ke4.map((k) => k.general).join(' ') === '青龙 天后 玄武 六合');
  check('对照1 三传', c.chuan.map((t) => t.dun + t.zhi + t.general + t.qin + (t.kong ? '空' : '')).join(' ') === '巳玄武父母空 己亥六合妻财 巳玄武父母空', c.chuan.map((t) => t.dun + t.zhi + t.general + t.qin).join(' '));
  check('对照1 贵人', Z[S.gen.gui] === '申' && Z[S.gen.guiSeat] === '寅' && S.gen.shun && !S.gen.isDay);
  const plate = c.plate.map((x) => x.di + x.tian + x.general).join(' ');
  check('对照1 天地盘', plate === '子午太阴 丑未天后 寅申贵人 卯酉腾蛇 辰戌朱雀 巳亥六合 午子勾陈 未丑青龙 申寅天空 酉卯白虎 戌辰太常 亥巳玄武', plate);
  // 同一软件给出的本命行年：壬午年生男命行年寅，庚午年生女命行年申，本命皆午
  const m = LR.cast(2002, 5, 31, 4, 0, { birthYear: 2002, gender: 'm' }).steps.person;
  const f = LR.cast(2002, 5, 31, 4, 0, { birthYear: 1990, gender: 'f' }).steps.person;
  check('对照1 男命本命行年', m.benming === '壬午' && Z[m.bm] === '午' && Z[m.xn] === '寅', JSON.stringify(m));
  check('对照1 女命本命行年', f.benming === '庚午' && Z[f.bm] === '午' && Z[f.xn] === '申', JSON.stringify(f));
  check('对照1 旬空', S.extra.kong.map((z) => Z[z]).join('') === '辰巳');
})();

// 别责阴日例：酉取丑、丑取巳、未取亥
check('三合次序', [9, 1, 7].map((z) => Z[mod(z + 4, 12)]).join('') === '丑巳亥');

// ── 太乙神数：《太乙统宗宝鉴》卷四、卷五岁计局例 ──
// [公元年（天文纪年）, 原书标注, 局, 太乙宫, 文昌, 主算, 始击, 客算, 原书所列格局（本页已实现者）]
// 秦代两例：
// - 原书“秦始皇六年庚申……六十九局”：史事属前 241 年，但 69 局数值只与下一个庚申年（前 121 年）吻合，属原书内部冲突，按前 121 年回归。
// - 原书“秦始皇三十年辛卯”：三十年为前 217 年甲申，当为“三十七年”（前 210 年辛卯）漏“七”，更正后全部吻合。
const TY_CASES = [
  [630, '唐贞观四年庚寅', 27, 1, '艮', 31, '卯', 28, ['囚']],
  [830, '唐太和四年庚戌', 11, 4, '卯', 4, '丑', 4, ['关', '囚']],
  [213, '汉建安十八年癸巳', 42, 7, '亥', 27, '辰', 12, ['迫', '提挟（疑似）']],
  [877, '唐乾符四年丁酉', 58, 4, '乾', 12, '未', 26, []],
  [918, '梁贞明四年戊寅', 27, 1, '艮', 31, '卯', 28, ['囚']],
  [-120, '庚申前121年（原书标秦始皇六年，原书内部冲突）', 69, 8, '午', 16, '艮', 32, ['击', '格']],
  [385, '晋宁康十年乙酉', 70, 9, '未', 30, '卯', 4, ['迫', '提挟（疑似）']],
  [-118, '汉元狩四年壬戌', 71, 9, '坤', 29, '巳', null, ['击', '囚']],
  [-209, '秦始皇三十七年辛卯（原书作三十年）', 52, 2, '未', 39, null, null, ['迫']],
  [-73, '汉元平元年丁未', 44, 8, '丑', null, null, null, ['迫']],
];
for (const [yr, label, kook, gong, wc, home, sf, away, pats] of TY_CASES) {
  const c = TY.cast(yr, 6, 1, 12, 0, { ji: 'sui' });
  const b = c.board, got = new Set(c.steps.pats.map((p) => p.name));
  const tag = `${label}：得 ${c.steps.ju.kook}局 ${b.taiyi}宫 文昌${b.wc} 主${c.steps.cal.home} 始击${b.sf} 客${c.steps.cal.away}`;
  check('太乙局', c.steps.ju.kook === kook && c.steps.ju.yang, tag);
  check('太乙宫', b.taiyi === gong, tag);
  check('太乙文昌', b.wc === wc, tag);
  if (home !== null) check('太乙主算', c.steps.cal.home === home, tag);
  if (sf !== null) check('太乙始击', b.sf === sf, tag);
  if (away !== null) check('太乙客算', c.steps.cal.away === away, tag);
  for (const p of pats) check('太乙格局 ' + p, got.has(p), tag + ' 格局' + [...got].join(''));
}
// 掩与击的边界（原书课例）：同神位为掩，前后一位为辰击，前后二位为宫击
{
  const why = (y) => TY.cast(y, 6, 1, 12, 0, { ji: 'sui' }).steps.pats.map((p) => p.name + (p.why.match(/（(.+?)）/) || ['', ''])[1]).join(',');
  check('太乙外辰击：汉元狩四年', /击外辰击/.test(why(-118)), why(-118));
  check('太乙外宫击：庚申前121年', /击外宫击/.test(why(-120)), why(-120));
  check('太乙内宫击：后唐同光元年', /击内宫击/.test(why(923)), why(923));
  // 原书“秦二世二年甲午岁……五十五局……为掩”：二世二年为前 208 年癸巳，甲午为前 207 年；按干支取前 207 年，数据全合。
  check('太乙掩：秦二世“二年”甲午（前207年）', /掩/.test(why(-206)) && !/击/.test(why(-206)), why(-206));
  // 原文异例（待扫描复核）：晋太和五年庚午同为五十五局，盘面与上一例完全相同，原书却作“为击”；暂不据此孤例改规则。
  check('太乙异例记录：晋太和五年仍按规则判掩', /掩/.test(why(370)), why(370));
}

// 2026-11-10 14:30 调研演算
{
  const s = TY.cast(2026, 11, 10, 14, 30, { ji: 'sui' }), b = s.board, C2 = s.steps.cal;
  check('太乙2026岁计', s.steps.ju.kook === 55 && b.taiyi === 3 && b.wc === '申' && b.js === '申' && b.he === '未' && b.sf === '艮' && C2.home === 16 && C2.hg === 6 && C2.hv === 8 && C2.away === 3 && C2.ag === 3 && C2.av === 9);
  const t = TY.cast(2026, 11, 10, 14, 30), bt = t.board, Ct = t.steps.cal;
  check('太乙2026时计', t.steps.ju.acc === 8496685016 && t.steps.ju.kook === 8 && !t.steps.ju.yang && bt.taiyi === 7 && bt.wc === '未' && bt.js === '丑' && bt.he === '午' && bt.sf === '坤' && Ct.home === 1 && Ct.hg === 1 && Ct.hv === 3 && Ct.away === 7 && Ct.ag === 7 && Ct.av === 1);
  check('太乙大将整十', TY.general(30) === 3 && TY.general(40) === 4 && TY.general(16) === 6 && TY.vgen(6) === 8);
}

// ── 八字 ──
{
  // 公开资料：毛泽东 1893-12-26 辰时，癸巳 甲子 丁酉 甲辰，阴年男命逆排，八岁起运，首运癸亥
  const c = BZ.cast(1893, 12, 26, 8, 0, { gender: 'm' });
  check('八字四柱', c.steps.pillars.names.join(' ') === '癸巳 甲子 丁酉 甲辰', c.steps.pillars.names.join(' '));
  check('八字大运逆排', !c.steps.dayun.forward && c.steps.dayun.list.slice(0, 3).map((r) => r.gz).join() === '癸亥,壬戌,辛酉');
  check('八字起运虚岁8', c.steps.dayun.startAge === 8, String(c.steps.dayun.startAge));
  check('八字十神', c.pillars.map((p) => p.shishen).join() === '七杀,正印,日主,正印');
  check('八字藏干', c.pillars[3].cang.map((x) => x.gan + x.shishen).join() === '戊伤官,乙偏印,癸七杀');
  check('八字纳音', c.pillars.map((p) => p.nayin).join() === '长流水,海中金,山下火,覆灯火');
  check('八字长生', c.pillars.map((p) => p.cs).join() === '帝旺,绝,长生,衰', c.pillars.map((p) => p.cs).join());
  check('八字空亡胎元', c.steps.extra.dayKong.join('') === '辰巳' && c.steps.extra.taiyuan === '乙卯');
  // 阳年女命逆排、阴年女命顺排
  check('八字阴年女顺排', BZ.cast(2000, 1, 1, 12, 0, { gender: 'f' }).steps.dayun.forward);
  check('八字阳年女逆排', !BZ.cast(2026, 11, 10, 12, 0, { gender: 'f' }).steps.dayun.forward);
  // 夜子时：0 点换日时，23:30 日柱仍为当天，时柱取次日子时；23 点换日则日柱进一日
  const n0 = BZ.cast(2026, 11, 10, 23, 30, { dayChange: 0 }).steps.pillars.names, n23 = BZ.cast(2026, 11, 10, 23, 30).steps.pillars.names;
  check('八字夜子时', n0[2] === '戊子' && n0[3] === '甲子' && n23[2] === '己丑' && n23[3] === '甲子', n0.join(' ') + ' / ' + n23.join(' '));
  // 十神与长生全表抽查
  check('十神全表', '甲乙丙丁戊己庚辛壬癸'.split('').map((g, i) => BZ.shishen(0, i)).join('') === '比肩劫财食神伤官偏财正财七杀正官偏印正印');
  check('长生阳顺阴逆', BZ.changsheng(0, 11) === '长生' && BZ.changsheng(0, 3) === '帝旺' && BZ.changsheng(1, 6) === '长生' && BZ.changsheng(1, 2) === '帝旺');
}

// ── 塔罗 ──
{
  check('塔罗 78 张', DECK.length === 78 && new Set(DECK.map((c) => c.name)).size === 78 && DECK.filter((c) => c.arcana === 'major').length === 22);
  check('塔罗牌序', DECK[8].name === '力量' && DECK[11].name === '正义' && DECK[22].name === '权杖王牌' && DECK[77].name === '星币国王');
  check('塔罗关键词齐全', DECK.every((c) => c.up && c.rev));
  check('牌阵张数', TR.SPREADS.one.positions.length === 1 && TR.SPREADS.three.positions.length === 3 && TR.SPREADS.celtic.positions.length === 10);
  const c = TR.cast(2026, 11, 10, 12, 0, { spread: 'celtic' });
  check('洗牌为完整排列', c.deck.length === 78 && new Set(c.deck.map((d) => d.card.id)).size === 78);
  check('原文不替用户抽牌', TR.toText(c, '') === '（抽牌尚未完成）' && c.picks.length === 0);
  TR.pick(c, 5); TR.pick(c, 5); TR.pick(c, 70);
  check('抽牌不重复', c.picks.length === 2);
  TR.autoPick(c);
  check('补齐到牌阵张数且标记', c.picks.length === 10 && new Set(c.picks).size === 10 && c.autoFilled);
  check('原文列出十张', TR.toText(c, '').split('\n').filter((l) => /^\d+\. .+｜关键词：/.test(l)).length === 10);
  const noRev = TR.cast(2026, 11, 10, 12, 0, { spread: 'three', reversed: false });
  check('关闭逆位', noRev.deck.every((d) => !d.reversed));
  // 均匀性：愚人落在各位置的次数，卡方检验（自由度 77，取 0.1% 临界值约 122）
  const T = 78 * 300, cnt = new Array(78).fill(0);
  for (let i = 0; i < T; i++) { const order = TR.shuffle(DECK.map((x) => x.id)); cnt[order.indexOf(0)]++; }
  const e = T / 78, chi = cnt.reduce((a, o) => a + (o - e) ** 2 / e, 0);
  check('洗牌均匀', chi < 122, 'chi2=' + chi.toFixed(1));
}

// ── 农历：近年春节、闰月与 2033 年难例（与官方历书对照）──
{
  const L = (y, m, d) => { const r = toLunar(y, m, d); return `${r.yearGz}${r.monthName}${r.dayName}`; };
  const cases = [[2024, 2, 10, '甲辰正月初一'], [2025, 1, 29, '乙巳正月初一'], [2026, 2, 17, '丙午正月初一'], [2023, 3, 22, '癸卯闰二月初一'],
    [2025, 7, 25, '乙巳闰六月初一'], [2020, 5, 23, '庚子闰四月初一'], [2017, 7, 23, '丁酉闰六月初一'], [2033, 12, 22, '癸丑闰冬月初一'],
    [2034, 2, 19, '甲寅正月初一'], [1900, 1, 31, '庚子正月初一'], [1893, 12, 26, '癸巳冬月十九'], [2026, 11, 10, '丙午十月初二']];
  for (const [y, m, d, want] of cases) check('农历 ' + want, L(y, m, d) === want, `${y}-${m}-${d} 得 ${L(y, m, d)}`);
}
// ── 梅花易数：《梅花易数》观梅占——上兑下离泽火革，初爻动，互天风姤，变泽山咸 ──
{
  // 原书：辰年(5)十二月(12)十七日(17)申时(9)；上卦 34÷8 余 2 兑，下卦 43÷8 余 3 离，动爻 43÷6 余 1
  const c = MH.cast(2026, 11, 10, 14, 30, { method: 'three', n1: 34, n2: 43, n3: 2 });
  check('观梅占本卦', c.ben.name === '泽火革', c.ben.name);
  check('观梅占动爻', c.moving === 1);
  check('观梅占互卦', c.hu.name === '天风姤', c.hu.name);
  check('观梅占变卦', c.bian.name === '泽山咸', c.bian.name);
  check('观梅占体用', c.steps.tiyong.ti === 2 && c.steps.tiyong.yong === 3 && c.steps.tiyong.rel === '用克体');
  // 六十四卦齐全且不重复
  const names = new Set(); for (let u = 1; u <= 8; u++) for (let d = 1; d <= 8; d++) names.add(MH.hexagram(u, d).name);
  check('六十四卦', names.size === 64);
  // 时间起卦取数：2026-11-10 14:30 为农历丙午年十月初二未时
  const t = MH.cast(2026, 11, 10, 14, 30);
  check('时间起卦取数', t.steps.nums.list.map((x) => x.v).join() === '7,10,2,8' && t.ben.name === '离为火' && t.moving === 3);
}

// ── 小六壬：逐段掐数与速算公式（月 + 日 + 时 − 2）÷ 6 一致 ──
{
  const c = XL.cast(2026, 11, 10, 14, 30);
  check('小六壬 2026-11-10 未时', c.segs.map((g) => XL.SIX[g.to].name).join() === '赤口,小吉,空亡', c.segs.map((g) => XL.SIX[g.to].name).join());
  let ok = true;
  for (let i = 0; i < 3000; i++) {
    const t = new Date(Date.UTC(1990, 0, 1) + rnd() * 50 * 365.25 * 864e5);
    const r = XL.cast(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes());
    const [mm, dd, hh] = r.segs.map((g) => g.v);
    if (r.resultIdx !== mod(mm + dd + hh - 3, 6)) { ok = false; break; }
  }
  check('小六壬速算公式', ok);
  const n = XL.cast(2026, 11, 10, 14, 30, { method: 'num', n1: 1, n2: 1, n3: 1 });
  check('小六壬报数 1 1 1 落大安', n.result.name === '大安');
}

// ── 六爻：八宫、世应、纳甲、六亲、伏神（与经典卦例对照）──
{
  const fix = (vals) => { const c = LY.cast(2026, 11, 10, 14, 30); c.tosses = vals.map((v) => ({ value: v })); return LY.analyze(c); };
  const L = (s) => s.split('').map((x) => (x === '1' ? 7 : 8)); // 自初爻起
  check('八宫六十四卦', Object.keys(LY.PALACE).length === 64);
  const gou = fix(L('011111'));
  check('姤：乾宫一世，世初应四', gou.palName === '乾' && gou.gen === '一世' && gou.shi === 1 && gou.ying === 4);
  check('姤：纳甲六亲', gou.yaos.map((y) => y.qin + y.gz).join(' ') === '父母辛丑 子孙辛亥 兄弟辛酉 官鬼壬午 兄弟壬申 父母壬戌');
  check('姤：妻财伏二爻甲寅', gou.yaos[1].fu && gou.yaos[1].fu.qin === '妻财' && gou.yaos[1].fu.gz === '甲寅');
  const fu = fix(L('100000'));
  check('复：坤宫一世，父母伏二爻乙巳', fu.palName === '坤' && fu.gen === '一世' && fu.yaos[1].fu?.gz === '乙巳');
  check('大有：乾宫归魂世三', (() => { const a = fix(L('111101')); return a.palName === '乾' && a.gen === '归魂' && a.shi === 3; })());
  check('晋：乾宫游魂世四', (() => { const a = fix(L('000101')); return a.palName === '乾' && a.gen === '游魂' && a.shi === 4 && a.yaos[0].fu?.gz === '甲子'; })());
  const huan = fix(L('010011'));
  check('涣：离宫五世，官鬼伏三爻、妻财伏四爻', huan.palName === '离' && huan.gen === '五世' && huan.yaos[2].fu?.gz === '己亥' && huan.yaos[3].fu?.gz === '己酉');
  // 动变：地水师三爻老阴动，变地风升，变爻父母辛酉
  const shi = fix([8, 7, 6, 8, 8, 8]);
  check('师之升', shi.ben.name === '地水师' && shi.bian.name === '地风升' && shi.yaos[2].bian?.gz === '辛酉' && shi.yaos[2].bian?.qin === '父母');
  // 六神：戊日起勾陈，甲日起青龙
  check('六神戊日起勾陈', shi.yaos.map((y) => y.god).join('') === '勾陈螣蛇白虎玄武青龙朱雀');
  // 摇钱只产生 6、7、8、9，且四种都会出现
  const seenV = new Set(); for (let i = 0; i < 400; i++) seenV.add(LY.tossCoins().value);
  check('摇钱取值', [...seenV].sort().join() === '6,7,8,9');
  const pending = LY.cast(2026, 11, 10, 14, 30);
  check('未摇满不生成原文', LY.toText(pending, '') === '（起卦尚未完成）' && pending.tosses.length === 0);
}

// ── 西方占星本命盘 ──
{
  const sec = (a, b) => Math.abs(NA.angDiff(a, b)) * 3600;
  // 1. 与 Swiss Ephemeris（Moshier）逐项对照：50 组出生数据
  const F = JSON.parse(readFileSync(new URL('./fixtures/natal-swe.json', import.meta.url)));
  const LIM = { sun: 5, moon: 20, mercury: 15, venus: 15, mars: 15, jupiter: 20, saturn: 20, uranus: 20, neptune: 25, pluto: 15 };
  for (const c of F.cases) {
    const [y, m, d, h, mi] = c.utc, utcMs = Date.UTC(y, m - 1, d, h, mi), pl = { lat: c.lat, lon: c.lon, utcMs };
    const C = NA.cast(y, m, d, h, mi, { extra: true }, pl);
    const tag = c.utc.join('-') + ` ${c.lat},${c.lon}`;
    for (const b of C.bodies) check(`本命盘 ${b.zh} ${tag}`, sec(b.lon, c.pos[b.key]) < LIM[b.key], `${(sec(b.lon, c.pos[b.key])).toFixed(1)}″`);
    for (const b of C.bodies) check(`逆行方向 ${b.zh} ${tag}`, Math.sign(b.speed) === Math.sign(c.speed[b.key]) || Math.abs(c.speed[b.key]) < 0.002);
    check(`真交点 ${tag}`, sec(C.points[0].lon, c.pos.trueNode) < 60);
    check(`南北交点相对 ${tag}`, Math.abs(Math.abs(NA.angDiff(C.points[0].lon, C.points[1].lon)) - 180) < 1e-9);
    check(`莉莉丝 ${tag}`, sec(C.points[2].lon, c.pos.lilith) < 600);
    check(`平均交点 ${tag}`, sec(NA.cast(y, m, d, h, mi, { node: 'mean' }, pl).points[0].lon, c.pos.meanNode) < 3);
    check(`上升 ${tag}`, sec(C.steps.angles.asc, c.asc) < 25, `${sec(C.steps.angles.asc, c.asc).toFixed(1)}″`);
    check(`天顶 ${tag}`, sec(C.steps.angles.mc, c.mc) < 25);
    for (const hs of ['P', 'K', 'O', 'R', 'C', 'E', 'W']) {
      const H = NA.cast(y, m, d, h, mi, { house: hs }, pl).steps.houses;
      const worst = Math.max(...c.houses[hs].map((v, i) => sec(H.cusps[i + 1], v)));
      check(`宫制 ${hs} ${tag}`, H.used === hs && worst < 30, `${worst.toFixed(1)}″`);
    }
    for (const k of ['lahiri', 'fagan']) {
      const S = NA.cast(y, m, d, h, mi, { zodiac: k }, pl);
      check(`恒星黄道 ${k} ${tag}`, sec(S.bodies[0].lon, c.sid[k].sun) < 6 && Math.abs(S.steps.zodiac.ayanamsa - c.sid[k].ayan) * 3600 < 2);
    }
    // 宫位归属：每颗星都落在自己宫头与下一宫头之间
    const cs = C.steps.houses.cusps;
    for (const b of C.bodies) check(`宫位归属 ${b.zh} ${tag}`, NA.mod(b.lon - cs[b.house]) < NA.mod(cs[b.house % 12 + 1] - cs[b.house]));
  }
  // 2. Meeus《天文算法》例题：例 47.a 月亮视黄经 133.167265°，例 33.a 金星视黄经 313.08102°（均为力学时 0 时）
  const tt = (y, m, d) => Astro.AstroTime.FromTerrestrialTime(Astro.MakeTime(new Date(Date.UTC(y, m - 1, d))).ut);
  const moon = Astro.Ecliptic(Astro.GeoVector('Moon', tt(1992, 4, 12), true)).elon;
  const venus = Astro.Ecliptic(Astro.GeoVector('Venus', tt(1992, 12, 20), true)).elon;
  check('Meeus 47.a 月亮', sec(moon, 133.167265) < 5, `${sec(moon, 133.167265).toFixed(1)}″`);
  check('Meeus 33.a 金星', sec(venus, 313.08102) < 5, `${sec(venus, 313.08102).toFixed(1)}″`);
  // 与本项目自算的太阳黄经互相印证
  for (let i = 0; i < 200; i++) {
    const ms = Date.UTC(1950, 0, 1) + Math.floor(((i * 7919) % 1000) / 1000 * 100 * 365.25 * 864e5);
    const C = NA.cast(2000, 1, 1, 0, 0, {}, { lat: 30, lon: 120, utcMs: ms });
    check('太阳黄经与节气算法一致', sec(C.bodies[0].lon, astro.sunApparentLon(astro.jdFromBeijing(...(() => { const d = new Date(ms + 8 * 3600e3); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()]; })()))) < 30);
  }
  // 3. 时区与夏令时
  const z = (a, tz) => NA.localToUtc(...a, tz);
  const iso = (r) => new Date(r.utcMs).toISOString().slice(0, 16);
  check('中国 1988 夏令时', iso(z([1988, 7, 1, 12, 0], 'Asia/Shanghai')) === '1988-07-01T03:00' && z([1988, 7, 1, 12, 0], 'Asia/Shanghai').dst);
  check('中国 1988 冬季', iso(z([1988, 1, 1, 12, 0], 'Asia/Shanghai')) === '1988-01-01T04:00' && !z([1988, 1, 1, 12, 0], 'Asia/Shanghai').dst);
  check('中国 1992 无夏令时', !z([1992, 7, 1, 12, 0], 'Asia/Shanghai').dst);
  check('纽约拨快空档', z([2021, 3, 14, 2, 30], 'America/New_York').gap && iso(z([2021, 3, 14, 2, 30], 'America/New_York')) === '2021-03-14T07:30');
  check('纽约拨回重叠', z([2021, 11, 7, 1, 30], 'America/New_York').ambiguous && iso(z([2021, 11, 7, 1, 30], 'America/New_York')) === '2021-11-07T05:30');
  check('悉尼夏令时（南半球一月）', z([2024, 1, 15, 12, 0], 'Australia/Sydney').offset === 11 * 3600);
  check('固定偏移', iso(z([2000, 1, 1, 0, 0], 'UTC+5:30')) === '1999-12-31T18:30' && iso(z([2000, 1, 1, 0, 0], 'UTC-8')) === '2000-01-01T08:00');
  // 4. 相位：对称、容许度内、最紧在前；时间不详不排宫位
  const C0 = NA.cast(1990, 6, 15, 12, 30, { minor: true }, { lat: 39.9, lon: 116.4, tz: 'Asia/Shanghai' });
  check('相位在容许度内', C0.aspects.every((a) => a.orb <= a.lim + 1e-9));
  check('相位按容许度排序', C0.aspects.every((a, i) => i === 0 || C0.aspects[i - 1].orb <= a.orb));
  check('相位每对只出现一次', new Set(C0.aspects.map((a) => [a.p, a.q].sort().join())).size === C0.aspects.length);
  const lonK = (k) => [...C0.bodies, ...C0.points].find((b) => b.key === k)?.lon ?? (k === 'asc' ? C0.steps.angles.asc : C0.steps.angles.mc);
  check('相位角度核对', C0.aspects.every((a) => Math.abs(Math.abs(Math.abs(NA.angDiff(lonK(a.p), lonK(a.q))) - a.a) - a.orb) < 1e-9));
  const U = NA.cast(1990, 6, 15, 12, 30, {}, { lat: 39.9, lon: 116.4, tz: 'Asia/Shanghai', timeKnown: false });
  check('时间不详不排宫位', !U.steps.houses && !U.steps.angles && U.bodies.every((b) => !b.house) && U.aspects.every((a) => a.p !== 'asc' && a.q !== 'mc'));
  check('时间不详注明月亮范围', /月亮当天在/.test(NA.toText(U, '')));
  check('北京 1990 年 6 月是夏令时', /UTC\+9，夏令时/.test(NA.toText(C0, '')));
  // 5. 极圈内 Placidus 退回 Porphyry
  const polar = NA.cast(2000, 6, 21, 12, 0, { house: 'P' }, { lat: 69.65, lon: 18.96, tz: 'Europe/Oslo' });
  check('极圈改用 Porphyry', polar.steps.houses.used === 'O' && /极圈/.test(polar.steps.houses.note));
  // 6. 恒星黄道整宫制：宫头为星座起点
  const ws = NA.cast(1990, 6, 15, 12, 30, { house: 'W', zodiac: 'lahiri' }, { lat: 39.9, lon: 116.4, tz: 'Asia/Shanghai' });
  check('恒星整宫制', ws.steps.houses.cusps.slice(1).every((v) => Math.abs(v % 30) < 1e-9 || Math.abs(v % 30 - 30) < 1e-9) && NA.signOf(ws.steps.houses.cusps[1]) === NA.signOf(ws.steps.angles.asc));
  // 7. 福点昼夜公式
  const night = NA.cast(1990, 6, 15, 23, 0, { extra: true, pofSect: true }, { lat: 39.9, lon: 116.4, tz: 'Asia/Shanghai' });
  const pof = night.points.find((p) => p.key === 'pof');
  check('夜生福点', !pof.day && Math.abs(NA.angDiff(pof.lon, night.steps.angles.asc + night.bodies[0].lon - night.bodies[1].lon)) < 1e-9);
  // 8. 外壳接口：城市、自定义地点、各设置的影响说明
  check('城市表', Object.keys(CITIES).length > 50 && placeOf({ city: 'london' }).tz === 'Europe/London');
  check('自定义地点', placeOf({ city: 'custom', lat: '-33.87', lon: '151.21', tz: 'Australia/Sydney' }).lat === -33.87);
  check('自定义地点填错退回北京', placeOf({ city: 'custom', lat: 'abc', lon: '' }).fallback === true);
  for (const x of [{ city: 'beijing', tk: 'yes' }, { city: 'beijing', tk: 'no' }, { city: 'custom', lat: '70', lon: '20', tz: 'UTC+1' }]) {
    const im = natalImpacts([1990, 6, 15, 12, 30], { ...NA.DEFAULT_OPTS, extra: true }, x);
    check('影响说明 ' + JSON.stringify(x), im.zodiac && im.node && im.orbs && (x.tk === 'no' || im.house));
  }
}

// ── 农历日历 ──
{
  // 节日与公布的日期对照
  const F = { '2024-02-10': '春节', '2025-01-29': '春节', '2026-02-17': '春节', '2027-02-06': '春节',
    '2024-09-17': '中秋节', '2025-10-06': '中秋节', '2026-09-25': '中秋节', '2025-05-31': '端午节', '2026-06-19': '端午节',
    '2025-01-28': '除夕', '2026-02-16': '除夕', '2024-02-09': '除夕', '2026-03-03': '元宵节', '2025-08-29': '七夕',
    '2026-05-10': '母亲节', '2026-06-21': '父亲节', '2026-10-01': '国庆节', '2026-10-18': '重阳节' };
  for (const [k, f] of Object.entries(F)) { const [y, m, d] = k.split('-').map(Number); check(`节日 ${k} ${f}`, AL.dayInfo(y, m, d).fest.includes(f), AL.dayInfo(y, m, d).fest.join()); }
  // 闰六月不过七月节：2025 闰六月十五不是中元节
  check('闰月不过节', !AL.dayInfo(2025, 8, 8).fest.includes('中元节') && AL.dayInfo(2025, 8, 8).lunar.leap);
  // 节气时刻（北京时间，与紫金山天文台公布值一致到分钟）
  const T = { 立春: ['2026-02-04', '04:02'], 清明: ['2026-04-05', '02:39'], 夏至: ['2026-06-21', '16:24'], 冬至: ['2026-12-22', '04:50'] };
  for (const [n, [d, t]] of Object.entries(T)) { const x = AL.termsOfYear(2026).find((e) => e.name === n); check(`节气 ${n}`, x.date === d && x.time === t, `${x.date} ${x.time}`); }
  check('每年 24 节气按序', [2000, 2033, 2050].every((y) => { const ts = AL.termsOfYear(y); return ts.length === 24 && ts.every((t, i) => i === 0 || t.jd > ts[i - 1].jd) && ts[0].name === '小寒' && ts[23].name === '冬至'; }));
  // 月相：每月 3–5 次，四相依次轮转
  for (let m = 1; m <= 12; m++) { const ps = AL.phasesOfMonth(2026, m); check(`月相 2026-${m}`, ps.length >= 3 && ps.length <= 5); }
  const nov = AL.phasesOfMonth(2026, 11);
  check('2026-11 朔', nov.some((p) => p.name === '朔' && p.date === '2026-11-09'));
  // 朔日即农历初一
  for (let m = 1; m <= 12; m++) for (const p of AL.phasesOfMonth(2027, m).filter((x) => x.name === '朔')) {
    const [y, mm, d] = p.date.split('-').map(Number); check(`朔日为初一 ${p.date}`, AL.dayInfo(y, mm, d).lunar.day === 1);
  }
  // 月历格子
  for (let y = 2024; y <= 2027; y++) for (let m = 1; m <= 12; m++) {
    const g = AL.monthGrid(y, m), inM = g.filter((c) => c.inMonth);
    check(`月历 ${y}-${m}`, (g.length === 35 || g.length === 42) && g[0].weekday === 1 && inM.length === new Date(Date.UTC(y, m, 0)).getUTCDate() && inM[0].d === 1);
  }
  // 立春当天年柱换年
  const lc = AL.dayInfo(2026, 2, 4);
  check('立春换年柱', lc.yearChange && lc.yearChange.from === '乙巳' && lc.yearChange.to === '丙午');
  check('摘要转纯文字', plain('<span>甲 <b>乙</b></span>&amp;') === '甲 乙 &');
}

console.log(`课体分布（${N} 课）：`, seen);
console.log(failures.join('\n'));
console.log(`\n通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);

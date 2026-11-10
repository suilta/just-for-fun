/*
 * 规则测试：node tests.js
 * 每条规则用独立写的检查逻辑，对大量随机时刻逐一核对，不复用被测代码里的取传函数。
 */
'use strict';
const QM = require('./qimen.js');
const LR = require('./liuren.js');

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
  check('对照1 旬空', S.extra.kong.map((z) => Z[z]).join('') === '辰巳');
})();

// 别责阴日例：酉取丑、丑取巳、未取亥
check('三合次序', [9, 1, 7].map((z) => Z[mod(z + 4, 12)]).join('') === '丑巳亥');

console.log(`课体分布（${N} 课）：`, seen);
console.log(failures.join('\n'));
console.log(`\n通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);

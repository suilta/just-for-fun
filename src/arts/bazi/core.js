/**
 * 八字（四柱命理）：四柱、十神、藏干、纳音、十二长生、空亡、胎元、大运（精确起运）、流年。
 * 只排盘，不断吉凶；每一步的中间过程写进 steps，供页面做分阶段动画。
 */
import { GAN, ZHI, ganzhi, JIEQI, fourPillars } from '../../core/calendar.js';
import { solveTerm, beijingFromJd, jdFromBeijing, fmtDT, mod } from '../../core/astro.js';

const GAN_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
const ZHI_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const gi = (g) => GAN.indexOf(g);

// 地支藏干（本气在前）
const CANG = { 子: '癸', 丑: '己癸辛', 寅: '甲丙戊', 卯: '乙', 辰: '戊乙癸', 巳: '丙庚戊', 午: '丁己', 未: '己丁乙', 申: '庚壬戊', 酉: '辛', 戌: '戊辛丁', 亥: '壬甲' };

// 六十甲子纳音
const NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水',
  '沙中金', '山下火', '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
const nayin = (idx) => NAYIN[Math.floor(mod(idx, 60) / 2)];

// 十二长生：阳干顺行、阴干逆行（阳生阴死）
const CHANGSHENG = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const CS_START = { 0: 11, 1: 6, 2: 2, 3: 9, 4: 2, 5: 9, 6: 5, 7: 0, 8: 8, 9: 3 }; // 甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯
const changsheng = (g, z) => CHANGSHENG[mod((g % 2 === 0 ? 1 : -1) * (z - CS_START[g]), 12)];

/** 十神：以日干为“我” */
function shishen(me, g) {
  const a = GAN_WX[me], b = GAN_WX[g], same = (me % 2) === (g % 2);
  if (a === b) return same ? '比肩' : '劫财';
  if (SHENG[a] === b) return same ? '食神' : '伤官';
  if (KE[a] === b) return same ? '偏财' : '正财';
  if (KE[b] === a) return same ? '七杀' : '正官';
  return same ? '偏印' : '正印'; // 生我
}

const DEFAULT_OPTS = { dayChange: 23, solar: false, lon: 120 };
const OPT_TEXT = { dayChange: { 23: '23 点换日（早晚子时不分）', 0: '0 点换日（分早晚子时）' } };
const PILLAR_NAMES = ['年柱', '月柱', '日柱', '时柱'];

function cast(y, m, d, h, mi, opts) {
  const o = Object.assign({}, DEFAULT_OPTS, opts || {});
  const gender = o.gender === 'f' ? 'f' : 'm';
  const P = fourPillars(y, m, d, h, mi, o);
  const idxs = [P.yearIdx, P.monthIdx, P.dayIdx, P.hourIdx];
  const me = P.dayIdx % 10;
  const steps = {};

  // ① 节气与年、月柱：立春换年，节换月（真实时刻）
  const jieDeg = mod(Math.floor((P.lon - 15) / 30) * 30 + 15, 360); // 本月节
  const prevJd = solveTerm(jieDeg, P.jd - mod(P.lon - jieDeg, 360) / 360 * 365.2422);
  const nextJd = solveTerm(mod(jieDeg + 30, 360), prevJd + 30.4);
  const termName = (deg) => JIEQI[Math.round(mod(deg, 360) / 15) % 24];
  steps.pillars = {
    names: idxs.map((i) => ganzhi(i)), sunLon: P.lon,
    prevJie: termName(jieDeg), prevJieTime: fmtDT(beijingFromJd(prevJd)),
    nextJie: termName(jieDeg + 30), nextJieTime: fmtDT(beijingFromJd(nextJd)),
    clock: fmtDT(P.clock), eot: P.eot, dayShift: P.dayShift, nightZi: P.nightZi, dayNum: P.dayNum, dayIdx: P.dayIdx,
  };

  // ② 四柱明细：十神、藏干、纳音、长生
  const pillars = idxs.map((idx, k) => {
    const g = idx % 10, z = idx % 12;
    return {
      name: PILLAR_NAMES[k], idx, gz: ganzhi(idx), gan: GAN[g], zhi: ZHI[z], ganWx: GAN_WX[g], zhiWx: ZHI_WX[z],
      shishen: k === 2 ? '日主' : shishen(me, g),
      cang: CANG[ZHI[z]].split('').map((c) => ({ gan: c, shishen: shishen(me, gi(c)) })),
      nayin: nayin(idx), cs: changsheng(me, z), selfCs: changsheng(g, z),
    };
  });

  // ③ 空亡（以日柱、年柱之旬）、胎元
  const kongOf = (idx) => { const s = mod(idx - (idx % 10), 12); return [ZHI[mod(s + 10, 12)], ZHI[mod(s + 11, 12)]]; };
  const taiyuan = ganzhi(sixty(mod(P.monthIdx % 10 + 1, 10), mod(P.monthIdx % 12 + 3, 12))); // 月干进一、月支进三
  steps.extra = { dayKong: kongOf(P.dayIdx), yearKong: kongOf(P.yearIdx), taiyuan };

  // ④ 大运：阳年男、阴年女顺排，反之逆排；起运按出生到下一节（顺）或上一节（逆）的天数，三天折一年
  const yangYear = (P.yearIdx % 10) % 2 === 0;
  const forward = (yangYear && gender === 'm') || (!yangYear && gender === 'f');
  const targetJd = forward ? nextJd : prevJd;
  const diffDays = Math.abs(targetJd - P.jd);
  const totalDays = diffDays * 120; // 一天折四个月，一个月按三十天计：一时辰折十天
  const qy = { years: Math.floor(totalDays / 360), months: Math.floor(mod(totalDays, 360) / 30), days: Math.round(mod(totalDays, 30)) };
  if (qy.days === 30) { qy.days = 0; qy.months += 1; }
  if (qy.months === 12) { qy.months = 0; qy.years += 1; }
  const start = new Date(Date.UTC(y + qy.years, m - 1 + qy.months, d + qy.days, h, mi));
  const startText = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;
  const startYear = start.getUTCFullYear();
  const dayun = Array.from({ length: 10 }, (_, i) => {
    const idx = mod(P.monthIdx + (forward ? i + 1 : -(i + 1)), 60);
    const fromYear = startYear + i * 10;
    return {
      gz: ganzhi(idx), idx, shishen: shishen(me, idx % 10), cs: changsheng(me, idx % 12), nayin: nayin(idx),
      fromYear, toYear: fromYear + 9, fromAge: fromYear - y + 1, toAge: fromYear - y + 10,
    };
  });
  steps.dayun = {
    yangYear, forward, gender, targetTerm: forward ? steps.pillars.nextJie : steps.pillars.prevJie,
    targetTime: fmtDT(beijingFromJd(targetJd)), diffDays, qy, startText, startYear, startAge: startYear - y + 1, list: dayun,
  };

  // ⑤ 流年：出生年起若干年的干支与十神
  const liunian = (from, n) => Array.from({ length: n }, (_, i) => {
    const yr = from + i, idx = mod(yr - 4, 60);
    return { year: yr, age: yr - y + 1, gz: ganzhi(idx), shishen: shishen(me, idx % 10) };
  });

  // ⑥ 五行计数（天干与地支本气）
  const wx = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of pillars) { wx[p.ganWx]++; wx[p.zhiWx]++; }

  return {
    input: { y, m, d, h, mi, text: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` },
    opts: { ...o, gender }, me: GAN[me], meWx: GAN_WX[me], steps, pillars, wx, liunian,
  };
}
function sixty(g, z) { for (let i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i; return 0; }

function toText(c, question) {
  const S = c.steps, o = c.opts, D = S.dayun, L = [];
  L.push(`【八字命盘】${o.gender === 'm' ? '男命（乾造）' : '女命（坤造）'} · ${OPT_TEXT.dayChange[o.dayChange]} · ${o.solar ? '真太阳时' : '北京时间'}`);
  if (o.solar) L.push(`出生时间：${c.input.text}（北京时间）；真太阳时 ${S.pillars.clock}（东经 ${o.lon}°）`);
  else L.push(`出生时间：${c.input.text}（北京时间，未做真太阳时校正）`);
  L.push(`四柱：${S.pillars.names.join(' ')}（日主 ${c.me}${c.meWx}）`);
  L.push(`节气：生于${S.pillars.prevJie}（${S.pillars.prevJieTime}）之后、${S.pillars.nextJie}（${S.pillars.nextJieTime}）之前`);
  L.push('');
  for (const p of c.pillars) {
    L.push(`- ${p.name} ${p.gz}：天干${p.gan}（${p.shishen}）｜地支${p.zhi}，藏干 ${p.cang.map((x) => x.gan + x.shishen).join('、')}｜纳音 ${p.nayin}｜日主临${p.cs}`);
  }
  L.push(`五行（干支本气）：${Object.entries(c.wx).map(([k, v]) => k + v).join(' ')}`);
  L.push(`空亡：日柱旬空 ${S.extra.dayKong.join('')}，年柱旬空 ${S.extra.yearKong.join('')}；胎元 ${S.extra.taiyuan}`);
  L.push('');
  L.push(`大运：${D.yangYear ? '阳' : '阴'}年${o.gender === 'm' ? '男' : '女'}命，${D.forward ? '顺排' : '逆排'}。出生距${D.forward ? '下一' : '上一'}节${D.targetTerm}（${D.targetTime}）${D.diffDays.toFixed(2)} 天，三天折一年，${D.qy.years} 年 ${D.qy.months} 个月 ${D.qy.days} 天后起运，约 ${D.startText}（虚岁 ${D.startAge}）交运。`);
  for (const r of D.list.slice(0, 8)) L.push(`- ${r.fromYear}–${r.toYear}（虚岁 ${r.fromAge}–${r.toAge}）：${r.gz}，天干${r.shishen}，日主临${r.cs}`);
  L.push('');
  const now = new Date().getUTCFullYear();
  if (now - c.input.y < 110) L.push(`近年流年：${c.liunian(now - 1, 4).map((n) => `${n.year} ${n.gz}（${n.shishen}，虚岁 ${n.age}）`).join('；')}`);
  L.push('');
  L.push('请你作为熟悉子平命理的解读者，基于以上命盘：');
  L.push('1. 先判断日主强弱与格局，说明依据（月令、通根、透干、生克）；');
  L.push('2. 找出用神、喜忌，并说明理由；');
  L.push('3. 结合大运与近年流年，分析事业、财运、感情、健康等方面的走势；');
  L.push('4. 给出具体可行的建议，并说明这些结论的不确定性。');
  L.push(`想了解的方面：${question && question.trim() ? question.trim() : '（未填写，请先做整体分析）'}`);
  return L.join('\n');
}

export { cast, toText, DEFAULT_OPTS, OPT_TEXT, shishen, changsheng, nayin, CANG, GAN_WX, ZHI_WX };

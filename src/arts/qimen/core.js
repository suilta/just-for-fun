/**
 * 奇门遁甲 · 时家转盘：定局（拆补、置闰、茅山）、地盘、旬首、值符值使、天盘九星、人盘八门、神盘八神、空亡、驿马、格局。
 * 每一步的中间过程写进 steps，供页面做分阶段动画。
 */
import { GAN, ZHI, ganzhi, JIEQI, fourPillars } from '../../core/calendar.js';
import { solveTerm, beijingFromJd, jdFromBeijing, fmtDT, civilJdn, mod, pad } from '../../core/astro.js';

// 局数表：节气 → [阴/阳, 上元, 中元, 下元]
const JU_TABLE = {
  冬至: ['阳', 1, 7, 4], 惊蛰: ['阳', 1, 7, 4], 小寒: ['阳', 2, 8, 5], 大寒: ['阳', 3, 9, 6], 春分: ['阳', 3, 9, 6],
  立春: ['阳', 8, 5, 2], 雨水: ['阳', 9, 6, 3], 清明: ['阳', 4, 1, 7], 立夏: ['阳', 4, 1, 7], 谷雨: ['阳', 5, 2, 8],
  小满: ['阳', 5, 2, 8], 芒种: ['阳', 6, 3, 9],
  夏至: ['阴', 9, 3, 6], 白露: ['阴', 9, 3, 6], 小暑: ['阴', 8, 2, 5], 大暑: ['阴', 7, 1, 4], 秋分: ['阴', 7, 1, 4],
  立秋: ['阴', 2, 5, 8], 处暑: ['阴', 1, 4, 7], 寒露: ['阴', 6, 9, 3], 立冬: ['阴', 6, 9, 3], 霜降: ['阴', 5, 8, 2],
  小雪: ['阴', 5, 8, 2], 大雪: ['阴', 4, 7, 1],
};

// 九宫信息（洛书数）
const PALACE = {
  1: { gua: '坎', dir: '正北', wx: '水' }, 2: { gua: '坤', dir: '西南', wx: '土' }, 3: { gua: '震', dir: '正东', wx: '木' },
  4: { gua: '巽', dir: '东南', wx: '木' }, 5: { gua: '中', dir: '中宫', wx: '土' }, 6: { gua: '乾', dir: '西北', wx: '金' },
  7: { gua: '兑', dir: '正西', wx: '金' }, 8: { gua: '艮', dir: '东北', wx: '土' }, 9: { gua: '离', dir: '正南', wx: '火' },
};
// 八宫顺时针环（坎→艮→震→巽→离→坤→兑→乾）
const RING = [1, 8, 3, 4, 9, 2, 7, 6];
const ringIdx = (p) => RING.indexOf(p);

const SANQI_LIUYI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
const XUN_YI = ['戊', '己', '庚', '辛', '壬', '癸']; // 甲子戊 甲戌己 甲申庚 甲午辛 甲辰壬 甲寅癸

const STAR_HOME = { 1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽', 6: '天心', 7: '天柱', 8: '天任', 9: '天英' };
const STAR_WX = { 天蓬: '水', 天芮: '土', 天冲: '木', 天辅: '木', 天禽: '土', 天心: '金', 天柱: '金', 天任: '土', 天英: '火' };
const DOOR_HOME = { 1: '休门', 2: '死门', 3: '伤门', 4: '杜门', 6: '开门', 7: '惊门', 8: '生门', 9: '景门' };
const DOOR_WX = { 休门: '水', 死门: '土', 伤门: '木', 杜门: '木', 开门: '金', 惊门: '金', 生门: '土', 景门: '火' };
const GODS = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }; // A 克 KE[A]
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const ZHI_PALACE = { 子: 1, 丑: 8, 寅: 8, 卯: 3, 辰: 4, 巳: 4, 午: 9, 未: 2, 申: 2, 酉: 7, 戌: 6, 亥: 6 };

import { keying, keyingText } from './keying.js';

// ───────────────────────── 排盘选项 ─────────────────────────
const DEFAULT_OPTS = {
  yuan: 'chaibu',   // 定局：chaibu 拆补法 / zhirun 置闰法 / maoshan 茅山法
  ji: 'kun',        // 中五寄宫：kun 恒寄坤二 / genkun 阳遁寄艮八、阴遁寄坤二
  gods: 'huxuan',   // 八神：huxuan 白虎玄武 / gouque 勾陈朱雀
  dayChange: 23,    // 换日：23 子初换日 / 0 子正换日
  solar: false,     // 是否用真太阳时定日柱、时柱
  lon: 120,         // 出生地或起局地经度（东经，度）
  keying: true,     // 列出古籍克应条文
  overlay: true,    // 值符真甲叠加（《烟波》《宝鉴》）
  starState: 'month', // 九星旺衰：month 按月令 / palace 按落宫
};
const OPT_TEXT = {
  yuan: { chaibu: '拆补法', zhirun: '置闰法', maoshan: '茅山法' },
  ji: { kun: '中五寄坤二', genkun: '中五阳遁寄艮八、阴遁寄坤二' },
  gods: { huxuan: '八神用白虎玄武', gouque: '八神用勾陈朱雀' },
  dayChange: { 23: '23 点换日', 0: '0 点换日' },
};
const withDefaults = (o) => Object.assign({}, DEFAULT_OPTS, o || {});

// ───────────────────────── 置闰法 ─────────────────────────
// 每 15 天一个符头（甲子、己卯、甲午、己酉日）开一个节气的上元。
// 符头早于节气为超神，晚于节气为接气；芒种、大雪之后超神超过 9 天，则重复该节气三元（置闰）。
const SHANGYUAN_HEAD = [0, 15, 30, 45];
function termDayNum(idx, guessJd, o) {
  const jd = solveTerm(idx * 15, guessJd);
  const t = beijingFromJd(jd);
  return { jd, day: civilJdn(t.y, t.m, t.d) + (o.dayChange === 23 && t.h >= 23 ? 1 : 0) };
}
function zhirun(dayNum, o) {
  // 从约三年前的冬至起，逐个符头往后推
  const approxYear = new Date((dayNum - 2440587.5) * 864e5).getUTCFullYear();
  let tIdx = 18; // 冬至
  let term = termDayNum(18, jdFromBeijing(approxYear - 3, 12, 21), o);
  let S = term.day;
  for (let k = -7; k <= 7; k++) if (SHANGYUAN_HEAD.includes(mod(term.day + k + 49, 60))) { S = term.day + k; break; } // 15 天内恰有一个上元符头
  let leap = false;
  let guard = 0;
  while (S + 15 <= dayNum && guard++ < 400) {
    const nIdx = (tIdx + 1) % 24;
    const next = termDayNum(nIdx, term.jd + 15.2, o);
    const overshoot = next.day - (S + 15); // 下一个符头相对下一个节气提前的天数（超神）
    if ((JIEQI[tIdx] === '芒种' || JIEQI[tIdx] === '大雪') && overshoot > 9 && !leap) {
      leap = true; // 重复本节气三元
    } else {
      tIdx = nIdx; term = next; leap = false;
    }
    S += 15;
  }
  const offset = term.day - S; // >0 超神（符头先到），<0 接气（节气先到），0 正授
  return {
    term: JIEQI[tIdx], termJd: term.jd, leap, offset, headDay: S,
    yuanNo: Math.min(2, Math.floor((dayNum - S) / 5)),
    status: leap ? '置闰' : offset > 0 ? '超神' : offset < 0 ? '接气' : '正授',
  };
}


// ───────────────────────── 排盘主函数 ─────────────────────────
function chart(y, m, d, h, mi, opts) {
  const o = withDefaults(opts);
  const P = fourPillars(y, m, d, h, mi, o);
  const GODS_USED = o.gods === 'gouque' ? ['值符', '腾蛇', '太阴', '六合', '勾陈', '朱雀', '九地', '九天'] : GODS;
  const steps = {};

  // ① 四柱与节气
  const termIdx = Math.floor(P.lon / 15);
  const termName = JIEQI[termIdx];
  const termJd = solveTerm(termIdx * 15, P.jd - mod(P.lon - termIdx * 15, 360) / 360 * 365.2422);
  const nextIdx = (termIdx + 1) % 24;
  const nextJd = solveTerm(nextIdx * 15, termJd + 15.2);
  steps.pillars = {
    year: ganzhi(P.yearIdx), month: ganzhi(P.monthIdx), day: ganzhi(P.dayIdx), hour: ganzhi(P.hourIdx),
    dayShift: P.dayShift, sunLon: P.lon, clock: fmtDT(P.clock), offsetMin: P.offsetMin, eot: P.eot,
    term: termName, termTime: fmtDT(beijingFromJd(termJd)),
    nextTerm: JIEQI[nextIdx], nextTermTime: fmtDT(beijingFromJd(nextJd)),
  };

  // ② 阴阳遁、三元（拆补法：找符头）、局数
  const dayGan = P.dayIdx % 10;
  const back = dayGan % 5; // 往前几天到甲/己日
  const futouIdx = mod(P.dayIdx - back, 60);
  const futouZhi = futouIdx % 12;
  let yuanNo, juTerm = termName, extra = {};
  if (o.yuan === 'zhirun') {
    const z = zhirun(P.dayNum, o);
    yuanNo = z.yuanNo; juTerm = z.term;
    extra = { status: z.status, offset: z.offset, leap: z.leap, head: ganzhi(mod(z.headDay + 49, 60)), headDate: fmtDT(beijingFromJd(z.headDay)).slice(0, 10) };
  } else if (o.yuan === 'maoshan') {
    const days = P.jd - termJd;
    yuanNo = Math.min(2, Math.floor(days / 5));
    extra = { days };
  } else {
    yuanNo = [0, 2, 1][futouZhi % 3]; // 子午卯酉→上(0) 寅申巳亥→中(1) 辰戌丑未→下(2)
  }
  const yuanName = ['上元', '中元', '下元'][yuanNo];
  const [yy, ...nums] = JU_TABLE[juTerm];
  const yang = yy === '阳';
  const ju = nums[yuanNo];
  const JI = o.ji === 'genkun' && yang ? 8 : 2; // 中五寄宫
  steps.ju = { yang, dun: yang ? '阳遁' : '阴遁', yuan: yuanName, ju, futou: ganzhi(futouIdx), back, tableRow: nums, method: o.yuan, juTerm, ji: JI, ...extra };

  // ③ 地盘：三奇六仪从局数宫起，阳顺阴逆飞布九宫
  const di = {}; const diOrder = [];
  for (let i = 0; i < 9; i++) {
    const p = yang ? mod(ju - 1 + i, 9) + 1 : mod(ju - 1 - i, 9) + 1;
    di[p] = SANQI_LIUYI[i]; diOrder.push({ palace: p, stem: SANQI_LIUYI[i] });
  }
  const stemPalace = (s) => +Object.keys(di).find((k) => di[k] === s);
  steps.di = { order: diOrder };

  // ④ 旬首、值符、值使
  const xun = Math.floor(P.hourIdx / 10);
  const xunName = ganzhi(xun * 10);
  const xunYi = XUN_YI[xun];
  const xunPalace = stemPalace(xunYi);
  const zhifuStar = STAR_HOME[xunPalace]; // 落中五则为天禽
  const zhishiDoor = DOOR_HOME[xunPalace === 5 ? JI : xunPalace];
  const kongZhi = [ZHI[mod(xun * 10 + 10, 12)], ZHI[mod(xun * 10 + 11, 12)]];
  steps.xun = { xunName, xunYi, xunPalace, zhifuStar, zhishiDoor, kong: kongZhi };

  // ⑤ 天盘：值符随时干，九星沿环整体转动
  const hourGanCh = GAN[P.hourIdx % 10];
  const leadStem = hourGanCh === '甲' ? xunYi : hourGanCh;
  let target = stemPalace(leadStem);
  const targetRaw = target;
  if (target === 5) target = JI;
  const startP = xunPalace === 5 ? JI : xunPalace;
  const shift = mod(ringIdx(target) - ringIdx(startP), 8);
  const tian = {}; // palace -> { stars:[], stems:[] }
  for (let k = 0; k < 8; k++) {
    const from = RING[k], to = RING[(k + shift) % 8];
    tian[to] = { stars: [STAR_HOME[from]], stems: [di[from]], from };
    if (from === JI) { tian[to].stars.push('天禽'); tian[to].stems.push(di[5]); }
  }
  steps.tian = { hourGan: hourGanCh, leadStem, target, targetRaw, startP, shift, ji: JI };

  // ⑥ 人盘：值使从旬首宫按时辰数飞宫，八门沿环转动
  const stepsN = mod(P.hourIdx % 12 - (xun * 10) % 12, 12);
  const path = [xunPalace];
  for (let i = 1; i <= stepsN; i++) path.push(yang ? mod(xunPalace - 1 + i, 9) + 1 : mod(xunPalace - 1 - i, 9) + 1);
  let doorTarget = path[path.length - 1];
  const doorTargetRaw = doorTarget;
  if (doorTarget === 5) doorTarget = JI;
  const doorStart = xunPalace === 5 ? JI : xunPalace;
  const doorShift = mod(ringIdx(doorTarget) - ringIdx(doorStart), 8);
  const door = {};
  for (let k = 0; k < 8; k++) door[RING[(k + doorShift) % 8]] = DOOR_HOME[RING[k]];
  steps.door = { path, stepsN, doorTarget, doorTargetRaw, doorStart, doorShift };

  // ⑦ 神盘：值符（神）随值符星落宫，阳顺阴逆
  const god = {};
  const gi = ringIdx(target);
  for (let k = 0; k < 8; k++) god[RING[mod(gi + (yang ? k : -k), 8)]] = GODS_USED[k];
  steps.god = { start: target, clockwise: yang, names: GODS_USED };

  // ⑧ 空亡、驿马、格局
  const hourZhiCh = ZHI[P.hourIdx % 12];
  const maZhi = { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' }[hourZhiCh];
  const kongPalaces = [...new Set(kongZhi.map((z) => ZHI_PALACE[z]))];
  const maPalace = ZHI_PALACE[maZhi];

  const palaces = {};
  for (let p = 1; p <= 9; p++) {
    palaces[p] = {
      num: p, ...PALACE[p], di: di[p],
      tianStems: p === 5 ? [] : tian[p].stems, stars: p === 5 ? [] : tian[p].stars,
      door: door[p] || '', god: god[p] || '',
      kong: kongPalaces.includes(p), ma: p === maPalace, notes: [],
    };
  }

  const patterns = [];
  const add = (p, name, kind, why) => { patterns.push({ palace: p, name, kind, why }); if (p) palaces[p].notes.push(name); };
  if (shift === 0) add(0, '星伏吟', '凶', '九星都在本宫未动');
  if (shift === 4) add(0, '星反吟', '凶', '九星落在本宫的对冲宫');
  if (doorShift === 0) add(0, '门伏吟', '凶', '八门都在本宫未动');
  if (doorShift === 4) add(0, '门反吟', '凶', '八门落在本宫的对冲宫');
  const XING = { 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 };
  const MU = { 乙: 2, 丙: 6, 丁: 6, 戊: 6, 己: 6, 庚: 8, 辛: 8, 壬: 4, 癸: 4 };
  for (let p = 1; p <= 9; p++) {
    if (p === 5) continue;
    const P_ = palaces[p];
    for (const s of P_.tianStems) {
      if (XING[s] === p) add(p, `六仪击刑（${s}）`, '凶', `天盘${s}落${P_.gua}${p}宫，与宫支相刑`);
      if (MU[s] === p) add(p, `${'乙丙丁'.includes(s) ? '奇' : '仪'}入墓（${s}）`, '凶', `天盘${s}落${P_.gua}${p}宫，为其五行墓库`);
      if (s === '戊' && P_.di === '丙') add(p, '青龙返首', '吉', '天盘戊加地盘丙');
      if (s === '丙' && P_.di === '戊') add(p, '飞鸟跌穴', '吉', '天盘丙加地盘戊');
      if (s === '乙' && P_.di === '辛') add(p, '青龙逃走', '凶', '天盘乙加地盘辛');
      if (s === '辛' && P_.di === '乙') add(p, '白虎猖狂', '凶', '天盘辛加地盘乙');
      if (s === '丁' && P_.di === '癸') add(p, '朱雀投江', '凶', '天盘丁加地盘癸');
      if (s === '癸' && P_.di === '丁') add(p, '螣蛇夭矫', '凶', '天盘癸加地盘丁');
      if (s === '庚' && P_.di === '丙') add(p, '太白入荧', '凶', '天盘庚加地盘丙');
      if (s === '丙' && P_.di === '庚') add(p, '荧入太白', '凶', '天盘丙加地盘庚');
    }
    if (P_.door) {
      const dw = DOOR_WX[P_.door];
      if (KE[dw] === P_.wx) add(p, `门迫（${P_.door}）`, '凶', `${P_.door}属${dw}，克${P_.gua}宫${P_.wx}`);
      if (KE[P_.wx] === dw) add(p, `门受制（${P_.door}）`, '平', `${P_.gua}宫${P_.wx}克${P_.door}${dw}`);
    }
    if (P_.door === DOOR_HOME[p] && doorShift !== 0) add(p, `${P_.door}伏吟`, '平', '此门回到本宫');
  }

  const result = {
    input: { y, m, d, h, mi, text: `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(mi)}` },
    opts: o, steps, palaces, patterns,
    summary: {
      zhifuStar, zhishiDoor, zhifuPalace: target, zhishiPalace: doorTarget,
      ma: maZhi, maPalace, kong: kongZhi, kongPalaces,
    },
  };
  result.keying = o.keying ? keying(result, o) : null;
  return result;
}

// ───────────────────────── 生成给 AI 的文字 ─────────────────────────
const ORDER_TEXT = [4, 9, 2, 3, 5, 7, 8, 1, 6];
function toText(c, question) {
  const S = c.steps, sm = c.summary, o = c.opts;
  const L = [];
  L.push(`【奇门遁甲排盘】时家奇门 · 转盘 · ${OPT_TEXT.yuan[o.yuan]} · ${OPT_TEXT.ji[o.ji]} · ${OPT_TEXT.gods[o.gods]} · ${OPT_TEXT.dayChange[o.dayChange]}`);
  if (o.solar) L.push(`起局时间：${c.input.text}（北京时间）；真太阳时 ${S.pillars.clock}（东经 ${o.lon}°，经度差 ${((o.lon - 120) * 4).toFixed(1)} 分，均时差 ${S.pillars.eot.toFixed(1)} 分），日柱、时柱按真太阳时`);
  else L.push(`起局时间：${c.input.text}（北京时间，未做真太阳时校正）`);
  L.push(`四柱：${S.pillars.year}年 ${S.pillars.month}月 ${S.pillars.day}日 ${S.pillars.hour}时`);
  L.push(`节气：${S.pillars.term}（交节 ${S.pillars.termTime}），下一节气 ${S.pillars.nextTerm}（${S.pillars.nextTermTime}）`);
  if (o.yuan === 'zhirun') L.push(`定局：${S.ju.dun}${'〇一二三四五六七八九'[S.ju.ju]}局，${S.ju.juTerm}${S.ju.yuan}（置闰法，${S.ju.status}${S.ju.offset && !S.ju.leap ? ' ' + Math.abs(S.ju.offset) + ' 天' : ''}，上元符头 ${S.ju.head} 日 ${S.ju.headDate}）`);
  else if (o.yuan === 'maoshan') L.push(`定局：${S.ju.dun}${'〇一二三四五六七八九'[S.ju.ju]}局，${S.ju.yuan}（茅山法，交节后第 ${Math.floor(S.ju.days) + 1} 天）`);
  else L.push(`定局：${S.ju.dun}${'〇一二三四五六七八九'[S.ju.ju]}局，${S.ju.yuan}（拆补法，符头 ${S.ju.futou}）`);
  L.push(`旬首：${S.xun.xunName}（遁于${S.xun.xunYi}），旬空：${sm.kong.join('')}（落${sm.kongPalaces.map((p) => PALACE[p].gua + p + '宫').join('、')}）`);
  L.push(`值符：${sm.zhifuStar}，加时干${S.tian.hourGan === '甲' ? '（甲时用' + S.tian.leadStem + '）' : S.tian.hourGan}落${PALACE[sm.zhifuPalace].gua}${sm.zhifuPalace}宫`);
  L.push(`值使：${sm.zhishiDoor}，行${S.door.stepsN}步落${PALACE[sm.zhishiPalace].gua}${sm.zhishiPalace}宫`);
  L.push(`驿马：${sm.ma}（${PALACE[sm.maPalace].gua}${sm.maPalace}宫）`);
  L.push('');
  L.push('九宫盘面（按 上南下北、左东右西 的洛书方位，自左上至右下）：');
  for (const p of ORDER_TEXT) {
    const q = c.palaces[p];
    if (p === 5) { L.push(`- 中五宫（土）：地盘 ${q.di}（寄${PALACE[S.ju.ji].gua}${S.ju.ji}宫）`); continue; }
    const marks = [q.kong && '旬空', q.ma && '驿马'].filter(Boolean);
    L.push(`- ${q.gua}${p}宫（${q.dir}，${q.wx}）：八神 ${q.god}｜九星 ${q.stars.join('+')}｜天盘 ${q.tianStems.join('')}｜八门 ${q.door}｜地盘 ${q.di}${marks.length ? '｜' + marks.join('、') : ''}`);
  }
  L.push('');
  if (c.patterns.length) {
    L.push('格局提示（程序按规则识别，仅供参考）：');
    for (const pt of c.patterns) L.push(`- ${pt.name}【${pt.kind}】${pt.palace ? PALACE[pt.palace].gua + pt.palace + '宫：' : '全局：'}${pt.why}`);
  } else L.push('格局提示：未识别到常见特殊格局。');
  L.push('');
  if (c.keying) { L.push(keyingText(c.keying)); L.push(''); }
  L.push('请你作为熟悉奇门遁甲的解读者，基于以上盘面：');
  L.push('1. 先确定用神（按所问之事选取，如求财看生门与戊、谋事看值符与时干、出行看开门等），说明用神落宫的星、门、神、奇仪及旺衰；');
  L.push('2. 分析用神宫与日干、时干所落宫的生克关系；');
  L.push('3. 结合格局、旬空、驿马给出判断，再给出具体可行的建议与应期参考；');
  L.push('4. 说明这些结论的不确定性。');
  L.push(`所问之事：${question && question.trim() ? question.trim() : '（未填写，请先给出整体时运解读）'}`);
  return L.join('\n');
}


export { chart, toText, DEFAULT_OPTS, OPT_TEXT, PALACE, RING, STAR_HOME, DOOR_HOME, GODS };

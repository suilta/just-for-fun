/**
 * 奇门流年与应期（时家转盘，保守口径）。依调研资料：四书无统一应期公式，
 * 故只做三件事：① 太岁宫与各宫地支的原始干支关系；② 年命落宫；③ 原文有明文规定的占类应期（行人、捕盗之六庚格，疾病之天芮废月）。
 * 不按旺衰、宫数推算日期。“引动”非四书术语，默认不标。
 */
import { GAN, ZHI, ganzhi } from '../../core/calendar.js';

const XUN_YI = ['戊', '己', '庚', '辛', '壬', '癸'];
/** 地盘各宫所辖地支（后天八卦方位） */
export const PALACE_ZHI = { 1: ['子'], 8: ['丑', '寅'], 3: ['卯'], 4: ['辰', '巳'], 9: ['午'], 2: ['未', '申'], 7: ['酉'], 6: ['戌', '亥'] };
export const ZHI_PALACE = { 子: 1, 丑: 8, 寅: 8, 卯: 3, 辰: 4, 巳: 4, 午: 9, 未: 2, 申: 2, 酉: 7, 戌: 6, 亥: 6 };
const zi = (z) => ZHI.indexOf(z);

/** 两个地支的关系（原始关系，不作吉凶） */
export function zhiRelations(a, b) {
  const x = zi(a), y = zi(b), r = [];
  if (x === y) r.push('同支');
  if ((x - y + 12) % 12 === 6) r.push('六冲');
  if ((x + y) % 12 === 1) r.push('六合');
  if ((x + y) % 12 === 7) r.push('六害');
  if (x !== y && x % 4 === y % 4) r.push('三合');
  const XING = [['子', '卯'], ['寅', '巳'], ['巳', '申'], ['申', '寅'], ['丑', '戌'], ['戌', '未'], ['未', '丑']];
  if (XING.some(([p, q]) => (p === a && q === b) || (p === b && q === a))) r.push('相刑');
  if (x === y && ['辰', '午', '酉', '亥'].includes(a)) r.push('自刑');
  return r;
}

/** 某年（以立春为界的干支年）的干支 */
export const yearGz = (y) => ganzhi(((y - 4) % 60 + 60) % 60);
/** 天干在盘上的代表：甲取其旬所遁之仪 */
function panStem(gz) {
  for (let i = 0; i < 60; i++) if (ganzhi(i) === gz) return GAN[i % 10] === '甲' ? XUN_YI[Math.floor(i / 10)] : GAN[i % 10];
  return gz[0];
}
const skyPalaces = (C, s) => [4, 9, 2, 3, 7, 8, 1, 6].filter((p) => C.palaces[p].tianStems.includes(s));
function earthPalaces(C, s) {
  const out = [];
  for (const p of [4, 9, 2, 3, 7, 8, 1, 6]) if (C.palaces[p].di === s) out.push(p);
  if (C.palaces[5].di === s) out.push(C.steps.ju.ji); // 中五寄宫
  return out;
}

export const LIUNIAN_DEFAULTS = { taisui: 'zhi', modern: false };
export const TOPICS = { general: '通用', xingren: '行人', budao: '捕盗', jibing: '疾病' };

/**
 * x：{ year 流年, birth 出生年（可空）, mingLayer 'di'|'tian', topic }
 */
export function liunian(C, x, opts) {
  const o = Object.assign({}, LIUNIAN_DEFAULTS, opts || {});
  const year = +x.year || C.input.y;
  const gz = yearGz(year), zhi = gz[1], stem = panStem(gz);
  const kong = C.summary.kong;
  // ① 太岁宫
  const taisui = { year, gz, mode: o.taisui };
  if (o.taisui === 'gan') { taisui.stem = stem; taisui.palaces = skyPalaces(C, stem); }
  else taisui.palaces = [ZHI_PALACE[zhi]];
  // 与各宫地支的原始关系
  taisui.rel = [4, 9, 2, 3, 7, 8, 1, 6].map((p) => ({
    p, items: PALACE_ZHI[p].map((b) => ({ zhi: b, rels: zhiRelations(zhi, b) })).filter((it) => it.rels.length),
    same: taisui.palaces.includes(p),
  }));
  taisui.kongFill = kong.includes(zhi);
  taisui.kongClash = kong.filter((k) => zhiRelations(zhi, k).includes('六冲'));
  if (o.modern) {
    taisui.marked = taisui.rel.filter((r) => r.same || r.items.some((it) => it.rels.includes('六冲'))).map((r) => r.p);
  }
  // ② 年命
  let ming = null;
  if (+x.birth) {
    const bgz = yearGz(+x.birth), bs = panStem(bgz), layer = x.mingLayer === 'tian' ? 'tian' : 'di';
    ming = { birth: +x.birth, gz: bgz, stem: bs, layer, palaces: layer === 'tian' ? skyPalaces(C, bs) : earthPalaces(C, bs) };
  }
  // ③ 占类应期
  const topic = { key: x.topic || 'general', name: TOPICS[x.topic] || '通用', items: [] };
  if (topic.key === 'xingren' || topic.key === 'budao') topic.items = gengGe(C, topic.key);
  if (topic.key === 'jibing') topic.items = tianRui(C);
  return { taisui, ming, topic, opts: o };
}

/** 六庚格（《秘笈》卷九）：阳日取庚下临之干，阴日取庚上乘之干；为年月日时干则年月日时应 */
function gengGe(C, key) {
  const S = C.steps, P = S.pillars;
  const yang = GAN.indexOf(P.day[0]) % 2 === 0;
  const ps = {}; for (const k of ['year', 'month', 'day', 'hour']) ps[k] = panStem(P[k]);
  const NAME = { year: '年', month: '月', day: '日', hour: '时' };
  const out = [];
  const cands = [];
  if (yang) for (const p of skyPalaces(C, '庚')) {
    const earth = [C.palaces[p].di]; if (p === S.ju.ji) earth.push(C.palaces[5].di);
    earth.forEach((s, i) => cands.push({ p, s, how: `阳日，天盘庚临${C.palaces[p].gua}${p}宫，下临地盘${s}${i > 0 ? '（寄）' : ''}` }));
  } else for (const p of earthPalaces(C, '庚')) {
    C.palaces[p].tianStems.forEach((s, i) => cands.push({ p, s, how: `阴日，地盘庚在${C.palaces[p].gua}${p}宫，上乘天盘${s}${i > 0 ? '（寄）' : ''}` }));
  }
  for (const c of cands) {
    if (c.s === '庚') continue;
    if (c.s === '乙') { out.push({ ...c, verdict: '乙庚为合，不为格', note: '《秘笈》卷九：“乙庚为合不为格。”' }); continue; }
    if (C.palaces[c.p].kong) { out.push({ ...c, verdict: '庚临空亡，不为格', note: '《秘笈》卷九：“庚金入墓或临空亡，不为格。”' }); continue; }
    const hits = Object.keys(ps).filter((k) => ps[k] === c.s);
    out.push({ ...c, verdict: hits.length ? hits.map((k) => `${NAME[k]}格，${NAME[k]}应`).join('；') : '不格，不应', hits });
  }
  if (!out.length) out.push({ how: yang ? '天盘无庚' : '地盘无庚', verdict: '无庚格可取' });
  const notes = ['《秘笈》卷九：“法以行人年命专责庚格，阳日以庚下临之干主之，阴日以庚上乘之干定之。年格年来，月格月来，日格日来，时格时来，不格不来。”',
    '“庚入墓”不为格的宫位，四书无统一表，程序未判；同盘多个庚格全部列出，原书未定先后。'];
  if (key === 'xingren') {
    const names = C.patterns.map((x) => x.name);
    const extra = [];
    if (names.includes('星伏吟') || names.includes('门伏吟')) extra.push('伏吟：不来');
    if (names.includes('星反吟') || names.includes('门反吟')) extra.push('反吟：来');
    if (names.includes('伏干格')) extra.push('庚加日干：行人即至');
    if (names.includes('飞干格')) extra.push('日干加庚：行人不来');
    if (extra.length) out.push({ how: '《元灵经》卷十五（补充资料，非四书）', verdict: extra.join('；'), note: '《元灵经》：“伏吟不来，返吟为来。”“庚加日干，行人即至；日干加庚，行人不来。”' });
  }
  return out.map((x) => ({ ...x, notes }));
}

/** 疾病：天芮废没之月为愈（《元灵经》卷十二）；天芮属土，生我者火，故废于巳、午月 */
function tianRui(C) {
  const p = [4, 9, 2, 3, 7, 8, 1, 6].find((k) => C.palaces[k].stars.includes('天芮'));
  return [{ how: `天芮落${C.palaces[p].gua}${p}宫`, verdict: '候选：天芮废于巳、午月（土以火为父母，生我者废）', note: '《元灵经》卷十二：“再以天芮废没之月为愈。”（补充资料，非四书；只给月份条件，不推具体日期）' }];
}

const PN = (C, p) => `${C.palaces[p].gua}${p}宫`;
export function liunianText(C, L) {
  const T = L.taisui, out = [];
  out.push(`流年与应期（保守口径：四书无统一应期公式，只列原文有明文的部分）：`);
  out.push(`- 流年 ${T.year}（${T.gz}年）：太岁${T.mode === 'gan' ? `按岁干落宫，天盘${T.stem}在${T.palaces.map((p) => PN(C, p)).join('、') || '（盘上未见）'}` : `按《统宗》“地盘岁支之宫”，${T.gz[1]}在${PN(C, T.palaces[0])}`}`);
  const rels = T.rel.filter((r) => r.items.length).map((r) => `${PN(C, r.p)}（${r.items.map((it) => `${it.zhi}：${it.rels.join('、')}`).join('；')}）`);
  out.push(`  太岁${T.gz[1]}与各宫地支的关系：${rels.join('，') || '无'}`);
  if (T.kongFill) out.push(`  流年地支${T.gz[1]}为本盘旬空，现代通行称“填实”`);
  if (T.kongClash.length) out.push(`  流年地支${T.gz[1]}冲本盘旬空${T.kongClash.join('')}，现代通行称“冲空”`);
  if (T.marked) out.push(`  现代流年标记法（非古法）：候选触发 ${T.marked.map((p) => PN(C, p)).join('、') || '无'}`);
  if (L.ming) out.push(`- 年命：${L.ming.birth} 年生（${L.ming.gz}），年干${L.ming.stem}，按${L.ming.layer === 'tian' ? '天' : '地'}盘落${L.ming.palaces.map((p) => PN(C, p)).join('、') || '（盘上未见）'}`);
  out.push(`- 占类：${L.topic.name}${L.topic.key === 'general' ? '（未指定占类，不输出应期）' : ''}`);
  for (const it of L.topic.items) out.push(`  ${it.how}：${it.verdict}`);
  if (L.topic.items[0]?.notes) for (const n of L.topic.items[0].notes) out.push(`  注：${n}`);
  return out.join('\n');
}

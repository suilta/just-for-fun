/**
 * 奇门克应：在排好的转盘上逐宫查表，列出十干克应、八门克应、门宫关系、九星旺衰与星宫生克、八神性质。
 * 只查条文、标出处，不做综合判断。
 */
import { GAN_KEYING, ZHIFU_OVERLAY, DOOR_KEYING, DOOR_PALACE, STAR_LUCK, STAR_PALACE, GOD_NATURE } from './keying-data.js';

const STAR_WX = { 天蓬: '水', 天芮: '土', 天冲: '木', 天辅: '木', 天禽: '土', 天心: '金', 天柱: '金', 天任: '土', 天英: '火' };
const DOOR_WX = { 休门: '水', 死门: '土', 伤门: '木', 杜门: '木', 开门: '金', 惊门: '金', 生门: '土', 景门: '火' };
const DOOR_HOME = { 1: '休门', 2: '死门', 3: '伤门', 4: '杜门', 6: '开门', 7: '惊门', 8: '生门', 9: '景门' };
const ZHI_WX = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** 以星（我）对参照五行：我生旺、同行相、我克休、生我废、克我囚 */
export function starState(starWx, refWx) {
  if (starWx === refWx) return '相';
  if (SHENG[starWx] === refWx) return '旺';
  if (KE[starWx] === refWx) return '休';
  if (SHENG[refWx] === starWx) return '废';
  return '囚';
}
/** 门对宫：门克宫迫、宫克门制、门生宫和、宫生门义、同五行比和 */
export function doorPalace(dw, pw) {
  if (dw === pw) return '比和';
  if (KE[dw] === pw) return '迫';
  if (KE[pw] === dw) return '制';
  if (SHENG[dw] === pw) return '和';
  return '义';
}
function starPalace(sw, pw) {
  if (sw === pw) return '比和';
  if (SHENG[sw] === pw) return '星生宫';
  if (SHENG[pw] === sw) return '宫生星';
  if (KE[sw] === pw) return '星克宫';
  return '宫克星';
}

export const KEYING_DEFAULTS = { keying: true, overlay: true, starState: 'month' };

/** C 为 chart() 的结果；返回按宫排列的克应 */
export function keying(C, opts) {
  const o = Object.assign({}, KEYING_DEFAULTS, opts || {});
  const S = C.steps, JI = S.ju.ji;
  const monthZhi = S.pillars.month[1];
  const xunYi = S.xun.xunYi;
  const out = [];
  for (const p of [4, 9, 2, 3, 7, 8, 1, 6]) {
    const P = C.palaces[p];
    const earth = [{ s: P.di, ji: false }]; if (p === JI) earth.push({ s: C.palaces[5].di, ji: true });
    const sky = P.tianStems.map((s, i) => ({ s, ji: i > 0 })); // 第二个天盘干是随天禽寄来的中五干
    const gan = [];
    for (const a of sky) for (const b of earth) {
      const e = GAN_KEYING[a.s + b.s];
      if (e) gan.push({ sky: a.s, earth: b.s, skyJi: a.ji, earthJi: b.ji, ...e });
    }
    const overlay = [];
    if (o.overlay && xunYi !== '戊') {
      for (const a of sky) for (const b of earth) for (const r of ZHIFU_OVERLAY.rules) {
        const sk = r.sky === 'Z' ? xunYi : r.sky, ea = r.earth === 'Z' ? xunYi : r.earth;
        if (a.s === sk && b.s === ea) overlay.push({ sky: a.s, earth: b.s, name: r.name, skyJi: a.ji, earthJi: b.ji });
      }
    }
    let door = null;
    if (P.door) {
      const home = DOOR_HOME[p];
      const e = DOOR_KEYING[P.door[0] + home[0]];
      const rel = doorPalace(DOOR_WX[P.door], P.wx);
      door = { door: P.door, home, rel, relDef: DOOR_PALACE[rel].def, ji: ['开门', '休门', '生门'].includes(P.door), ...e };
    }
    const stars = P.stars.map((st) => {
      const sw = STAR_WX[st];
      const ref = o.starState === 'palace' ? P.wx : ZHI_WX[monthZhi];
      const sp = starPalace(sw, P.wx);
      return { star: st, wx: sw, luck: STAR_LUCK[st], state: starState(sw, ref), stateBy: o.starState === 'palace' ? `落${P.gua}宫${P.wx}` : `${monthZhi}月${ZHI_WX[monthZhi]}`, rel: sp, relText: STAR_PALACE[sp] };
    });
    const god = P.god ? { name: P.god, ...GOD_NATURE[P.god] } : null;
    out.push({ p, gua: P.gua, wx: P.wx, gan, overlay, door, stars, god });
  }
  return { palaces: out, monthZhi, xunYi, opts: o };
}

const ji = (x) => (x ? '（寄）' : '');
/** 生成原文里的克应段落 */
export function keyingText(K) {
  const L = [];
  L.push('克应条文（逐宫查古籍条文录出，不作综合判断；“寄”指随中五寄宫而来的干）：');
  for (const k of K.palaces) {
    L.push(`- ${k.gua}${k.p}宫：`);
    for (const g of k.gan) L.push(`  十干：天盘${g.sky}${ji(g.skyJi)}加地盘${g.earth}${ji(g.earthJi)}「${g.name}」${g.text}${g.bj ? `〔宝鉴：${g.bj}〕` : ''}`);
    for (const v of k.overlay) L.push(`  值符真甲：本旬旬首遁于${K.xunYi}，天盘${v.sky}${ji(v.skyJi)}加地盘${v.earth}${ji(v.earthJi)}，叠加「${v.name}」`);
    if (k.door) {
      const d = k.door;
      L.push(`  八门：${d.door}加${d.home}（${k.gua}宫本位）${d.text ? d.text : '【缺文】' + d.missing}〔宝鉴：${d.gua}卦〕；门宫：${d.rel === '比和' ? '比和' : '门' + d.rel}（${d.relDef}）`);
    }
    for (const s of k.stars) L.push(`  九星：${s.star}（${s.wx}，${s.luck}）按${s.stateBy}为${s.state}；星宫：${s.rel}，${s.relText}`);
    if (k.god) L.push(`  八神：${k.god.name}（${k.god.luck}）`);
  }
  L.push('出处：十干克应据《秘笈》卷二、《统宗》卷四，异名据《宝鉴》；八门克应据《秘笈》卷四卷五《八门静应》、《统宗》卷四，卦名据《宝鉴》卷三；门迫制和义据《烟波钓叟歌》及古注；九星旺衰据《烟波钓叟歌》《宝鉴》卷一；星宫生克据《统宗》卷七；八神据《秘笈》卷六。');
  return L.join('\n');
}

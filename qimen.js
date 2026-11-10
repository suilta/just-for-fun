/*
 * 奇门遁甲 · 时家转盘 · 拆补法 —— 纯算法核心（无依赖）
 * 浏览器中挂到 window.QM；Node 中 module.exports。
 *
 * 包含：
 *   - 太阳视黄经（截断 VSOP87 + 章动 + 光行差，精度约数角秒 ≈ 1 分钟内）
 *   - 节气时刻求解、四柱干支（立春换年、节换月、23 点换日）
 *   - 起局：阴阳遁、三元（拆补法）、局数
 *   - 地盘、旬首、值符值使、天盘九星、人盘八门、神盘八神、空亡、驿马、格局
 * 每一步都把中间过程写进 steps，供页面做分阶段动画。
 */
(function (root, factory) {
  const QM = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = QM;
  else root.QM = QM;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ───────────────────────── 基础表 ─────────────────────────
  const GAN = '甲乙丙丁戊己庚辛壬癸'.split('');
  const ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');
  const ganzhi = (i) => GAN[((i % 10) + 10) % 10] + ZHI[((i % 12) + 12) % 12];
  const mod = (a, n) => ((a % n) + n) % n;

  // 24 节气，以视黄经 0°（春分）为起点，每 15° 一个
  const JIEQI = ['春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
    '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰'];

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

  // ───────────────────────── 天文 ─────────────────────────
  // VSOP87D 地球日心黄经 L0..L5（截断，A×1e-8, B, C）
  const VL = [
    [[175347046, 0, 0], [3341656, 4.6692568, 6283.07585], [34894, 4.6261, 12566.1517], [3497, 2.7441, 5753.3849],
      [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715], [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097],
      [1324, 0.7425, 11506.7698], [1273, 2.0371, 529.691], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927],
      [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694], [753, 2.533, 5507.553],
      [505, 4.583, 18849.228], [492, 4.205, 775.523], [357, 2.92, 0.067], [317, 5.849, 11790.629],
      [284, 1.899, 796.298], [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314],
      [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299], [132, 3.411, 2942.463],
      [126, 1.083, 20.775], [115, 0.645, 0.98], [103, 0.636, 4694.003], [102, 0.976, 15720.839],
      [102, 4.267, 7.114], [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69], [85, 1.3, 6275.96],
      [85, 3.67, 71430.7], [80, 1.81, 17260.15], [79, 3.04, 12036.46], [75, 1.76, 5088.63], [74, 3.5, 3154.69],
      [74, 4.68, 801.82], [70, 0.83, 9437.76], [62, 3.98, 8827.39], [61, 1.82, 7084.9], [57, 2.78, 6286.6],
      [56, 4.39, 14143.5], [56, 3.47, 6279.55], [52, 0.19, 12139.55], [52, 1.33, 1748.02], [51, 0.28, 5856.48],
      [49, 0.49, 1194.45], [41, 5.37, 8429.24], [41, 2.4, 19651.05], [39, 6.17, 10447.39], [37, 6.04, 10213.29],
      [37, 2.57, 1059.38], [36, 1.71, 2352.87], [36, 1.78, 6812.77], [33, 0.59, 17789.85], [30, 0.44, 83996.85],
      [30, 2.74, 1349.87], [25, 3.16, 4690.48]],
    [[628331966747, 0, 0], [206059, 2.678235, 6283.07585], [4303, 2.6351, 12566.1517], [425, 1.59, 3.523],
      [119, 5.796, 26.298], [109, 2.966, 1577.344], [93, 2.59, 18849.23], [72, 1.14, 529.69], [68, 1.87, 398.15],
      [67, 4.41, 5507.55], [59, 2.89, 5223.69], [56, 2.17, 155.42], [45, 0.4, 796.3], [36, 0.47, 775.52],
      [29, 2.65, 7.11], [21, 5.34, 0.98], [19, 1.85, 5486.78], [19, 4.97, 213.3], [17, 2.99, 6275.96],
      [16, 0.03, 2544.31], [16, 1.43, 2146.17], [15, 1.21, 10977.08], [12, 2.83, 1748.02], [12, 3.26, 5088.63],
      [12, 5.27, 1194.45], [12, 2.08, 4694], [11, 0.77, 553.57], [10, 1.3, 6286.6], [10, 4.24, 1349.87],
      [9, 2.7, 242.73], [9, 5.64, 951.72], [8, 5.3, 2352.87], [6, 2.65, 9437.76], [6, 4.67, 4690.48]],
    [[52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152], [27, 0.05, 3.52], [16, 5.19, 26.3],
      [16, 3.68, 155.42], [10, 0.76, 18849.23], [9, 2.06, 77713.77], [7, 0.83, 775.52], [5, 4.66, 1577.34],
      [4, 1.03, 7.11], [4, 3.44, 5573.14], [3, 5.14, 796.3], [3, 6.05, 5507.55], [3, 1.19, 242.73],
      [3, 6.12, 529.69], [3, 0.31, 398.15], [3, 2.28, 553.57], [2, 4.38, 5223.69], [2, 3.75, 0.98]],
    [[289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15], [3, 5.2, 155.42], [1, 4.72, 3.52],
      [1, 5.3, 18849.23], [1, 5.97, 242.73]],
    [[114, 3.142, 0], [8, 4.13, 6283.08], [1, 3.84, 12566.15]],
    [[1, 3.14, 0]],
  ];
  // 日地距离 R0..R1（光行差只需粗略值）
  const VR = [
    [[100013989, 0, 0], [1670700, 3.0984635, 6283.07585], [13956, 3.05525, 12566.1517], [3084, 5.1985, 77713.7715],
      [1628, 1.1739, 5753.3849], [1576, 2.8469, 7860.4194], [925, 5.453, 11506.77], [542, 4.564, 3930.21]],
    [[103019, 1.10749, 6283.07585], [1721, 1.0644, 12566.1517]],
  ];
  const sumSeries = (S, t) => {
    let r = 0, tp = 1;
    for (const terms of S) {
      let s = 0;
      for (const [a, b, c] of terms) s += a * Math.cos(b + c * t);
      r += s * tp; tp *= t;
    }
    return r / 1e8;
  };

  // ΔT（秒），Espenak & Meeus 多项式
  function deltaT(y) {
    if (y < 1900) { const t = (y - 1820) / 100; return -20 + 32 * t * t; }
    if (y < 1920) { const t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
    if (y < 1941) { const t = y - 1920; return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3; }
    if (y < 1961) { const t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
    if (y < 1986) { const t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
    if (y < 2005) { const t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
    if (y < 2050) { const t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (y < 2150) return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
    const u = (y - 1820) / 100; return -20 + 32 * u * u;
  }

  // 太阳视黄经（度），参数为力学时儒略日 JDE
  function sunApparentLon(jde) {
    const t = (jde - 2451545) / 365250;
    const L = sumSeries(VL, t);
    const R = sumSeries(VR, t);
    let lon = L * 180 / Math.PI + 180; // 地心
    const T = t * 10;
    lon += -0.09033 / 3600; // FK5
    const om = (125.04452 - 1934.136261 * T) * Math.PI / 180;
    const Ls = (280.4665 + 36000.7698 * T) * Math.PI / 180;
    const Lm = (218.3165 + 481267.8813 * T) * Math.PI / 180;
    const dpsi = -17.2 * Math.sin(om) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * om);
    lon += dpsi / 3600;
    lon += -20.4898 / 3600 / R; // 光行差
    return mod(lon, 360);
  }

  // 公历（北京时间）↔ 儒略日（UT）
  function jdFromBeijing(y, m, d, h = 0, mi = 0, s = 0) {
    const ms = Date.UTC(y, m - 1, d, h, mi, s) - 8 * 3600e3;
    return ms / 86400e3 + 2440587.5;
  }
  function beijingFromJd(jd) {
    const dt = new Date(Math.round((jd - 2440587.5) * 86400e3 + 8 * 3600e3));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes(), s: dt.getUTCSeconds() };
  }
  const jdeOf = (jd) => { const y = beijingFromJd(jd).y; return jd + deltaT(y) / 86400; };
  const sunLonAtJd = (jd) => sunApparentLon(jdeOf(jd));

  // 求太阳到达 target 度的时刻（UT 儒略日），从 guess 附近迭代
  function solveTerm(target, guess) {
    let jd = guess;
    for (let i = 0; i < 20; i++) {
      const diff = mod(target - sunLonAtJd(jd) + 180, 360) - 180;
      jd += diff / 360 * 365.2422;
      if (Math.abs(diff) < 1e-7) break;
    }
    return jd;
  }

  const pad = (n) => String(n).padStart(2, '0');
  const fmtDT = (o) => `${o.y}-${pad(o.m)}-${pad(o.d)} ${pad(o.h)}:${pad(o.mi)}`;

  // ───────────────────────── 四柱 ─────────────────────────
  function fourPillars(y, m, d, h, mi) {
    const jd = jdFromBeijing(y, m, d, h, mi);
    const lon = sunLonAtJd(jd);

    // 年柱：立春（315°）换年
    let yy = y;
    if (m <= 2 && lon >= 240 && lon < 315) yy = y - 1;
    const yearIdx = mod(yy - 4, 60);

    // 月柱：节换月；寅月从 315° 起，每 30° 一月
    const mOrder = Math.floor(mod(lon - 315, 360) / 30); // 0 = 寅月
    const monthGan = mod((yearIdx % 10 % 5) * 2 + 2 + mOrder, 10);
    const monthZhi = mod(2 + mOrder, 12);
    const monthIdx = sixtyIndex(monthGan, monthZhi);

    // 日柱：23 点后算次日（早晚子时不分）
    const civilNoonJdn = Math.floor(Date.UTC(y, m - 1, d) / 86400e3 + 2440587.5 + 0.5);
    const dayShift = h >= 23 ? 1 : 0;
    const dayIdx = mod(civilNoonJdn + dayShift + 49, 60);

    // 时柱：五鼠遁
    const hourZhi = Math.floor((h + 1) / 2) % 12;
    const hourGan = mod((dayIdx % 10 % 5) * 2 + hourZhi, 10);
    const hourIdx = sixtyIndex(hourGan, hourZhi);

    return { jd, lon, yearIdx, monthIdx, dayIdx, hourIdx, dayShift };
  }
  function sixtyIndex(g, z) { for (let i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i; return -1; }

  // ───────────────────────── 排盘主函数 ─────────────────────────
  function chart(y, m, d, h, mi) {
    const P = fourPillars(y, m, d, h, mi);
    const steps = {};

    // ① 四柱与节气
    const termIdx = Math.floor(P.lon / 15);
    const termName = JIEQI[termIdx];
    const termJd = solveTerm(termIdx * 15, P.jd - mod(P.lon - termIdx * 15, 360) / 360 * 365.2422);
    const nextIdx = (termIdx + 1) % 24;
    const nextJd = solveTerm(nextIdx * 15, termJd + 15.2);
    steps.pillars = {
      year: ganzhi(P.yearIdx), month: ganzhi(P.monthIdx), day: ganzhi(P.dayIdx), hour: ganzhi(P.hourIdx),
      dayShift: P.dayShift, sunLon: P.lon,
      term: termName, termTime: fmtDT(beijingFromJd(termJd)),
      nextTerm: JIEQI[nextIdx], nextTermTime: fmtDT(beijingFromJd(nextJd)),
    };

    // ② 阴阳遁、三元（拆补法：找符头）、局数
    const dayGan = P.dayIdx % 10;
    const back = dayGan % 5; // 往前几天到甲/己日
    const futouIdx = mod(P.dayIdx - back, 60);
    const futouZhi = futouIdx % 12;
    const yuanNo = [0, 2, 1][futouZhi % 3]; // 子午卯酉→上(0) 寅申巳亥→中(1) 辰戌丑未→下(2)
    const yuanName = ['上元', '中元', '下元'][yuanNo];
    const [yy, ...nums] = JU_TABLE[termName];
    const yang = yy === '阳';
    const ju = nums[yuanNo];
    steps.ju = { yang, dun: yang ? '阳遁' : '阴遁', yuan: yuanName, ju, futou: ganzhi(futouIdx), back, tableRow: nums };

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
    const zhishiDoor = DOOR_HOME[xunPalace === 5 ? 2 : xunPalace];
    const kongZhi = [ZHI[mod(xun * 10 + 10, 12)], ZHI[mod(xun * 10 + 11, 12)]];
    steps.xun = { xunName, xunYi, xunPalace, zhifuStar, zhishiDoor, kong: kongZhi };

    // ⑤ 天盘：值符随时干，九星沿环整体转动
    const hourGanCh = GAN[P.hourIdx % 10];
    const leadStem = hourGanCh === '甲' ? xunYi : hourGanCh;
    let target = stemPalace(leadStem);
    const targetRaw = target;
    if (target === 5) target = 2;
    const startP = xunPalace === 5 ? 2 : xunPalace;
    const shift = mod(ringIdx(target) - ringIdx(startP), 8);
    const tian = {}; // palace -> { stars:[], stems:[] }
    for (let k = 0; k < 8; k++) {
      const from = RING[k], to = RING[(k + shift) % 8];
      tian[to] = { stars: [STAR_HOME[from]], stems: [di[from]], from };
      if (from === 2) { tian[to].stars.push('天禽'); if (di[5] !== di[2]) tian[to].stems.push(di[5]); }
    }
    steps.tian = { hourGan: hourGanCh, leadStem, target, targetRaw, startP, shift };

    // ⑥ 人盘：值使从旬首宫按时辰数飞宫，八门沿环转动
    const stepsN = mod(P.hourIdx % 12 - (xun * 10) % 12, 12);
    const path = [xunPalace];
    for (let i = 1; i <= stepsN; i++) path.push(yang ? mod(xunPalace - 1 + i, 9) + 1 : mod(xunPalace - 1 - i, 9) + 1);
    let doorTarget = path[path.length - 1];
    const doorTargetRaw = doorTarget;
    if (doorTarget === 5) doorTarget = 2;
    const doorStart = xunPalace === 5 ? 2 : xunPalace;
    const doorShift = mod(ringIdx(doorTarget) - ringIdx(doorStart), 8);
    const door = {};
    for (let k = 0; k < 8; k++) door[RING[(k + doorShift) % 8]] = DOOR_HOME[RING[k]];
    steps.door = { path, stepsN, doorTarget, doorTargetRaw, doorStart, doorShift };

    // ⑦ 神盘：值符（神）随值符星落宫，阳顺阴逆
    const god = {};
    const gi = ringIdx(target);
    for (let k = 0; k < 8; k++) god[RING[mod(gi + (yang ? k : -k), 8)]] = GODS[k];
    steps.god = { start: target, clockwise: yang };

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

    return {
      input: { y, m, d, h, mi, text: `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(mi)}` },
      steps, palaces, patterns,
      summary: {
        zhifuStar, zhishiDoor, zhifuPalace: target, zhishiPalace: doorTarget,
        ma: maZhi, maPalace, kong: kongZhi, kongPalaces,
      },
    };
  }

  // ───────────────────────── 生成给 AI 的文字 ─────────────────────────
  const ORDER_TEXT = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  function toText(c, question) {
    const S = c.steps, sm = c.summary;
    const L = [];
    L.push('【奇门遁甲排盘】时家奇门 · 转盘 · 拆补法 · 中五寄坤二');
    L.push(`起局时间：${c.input.text}（北京时间，未做真太阳时校正）`);
    L.push(`四柱：${S.pillars.year}年 ${S.pillars.month}月 ${S.pillars.day}日 ${S.pillars.hour}时`);
    L.push(`节气：${S.pillars.term}（交节 ${S.pillars.termTime}），下一节气 ${S.pillars.nextTerm}（${S.pillars.nextTermTime}）`);
    L.push(`定局：${S.ju.dun}${'〇一二三四五六七八九'[S.ju.ju]}局，${S.ju.yuan}（符头 ${S.ju.futou}）`);
    L.push(`旬首：${S.xun.xunName}（遁于${S.xun.xunYi}），旬空：${sm.kong.join('')}（落${sm.kongPalaces.map((p) => PALACE[p].gua + p + '宫').join('、')}）`);
    L.push(`值符：${sm.zhifuStar}，加时干${S.tian.hourGan === '甲' ? '（甲时用' + S.tian.leadStem + '）' : S.tian.hourGan}落${PALACE[sm.zhifuPalace].gua}${sm.zhifuPalace}宫`);
    L.push(`值使：${sm.zhishiDoor}，行${S.door.stepsN}步落${PALACE[sm.zhishiPalace].gua}${sm.zhishiPalace}宫`);
    L.push(`驿马：${sm.ma}（${PALACE[sm.maPalace].gua}${sm.maPalace}宫）`);
    L.push('');
    L.push('九宫盘面（按 上南下北、左东右西 的洛书方位，自左上至右下）：');
    for (const p of ORDER_TEXT) {
      const q = c.palaces[p];
      if (p === 5) { L.push(`- 中五宫（土）：地盘 ${q.di}（寄坤二宫）`); continue; }
      const marks = [q.kong && '旬空', q.ma && '驿马'].filter(Boolean);
      L.push(`- ${q.gua}${p}宫（${q.dir}，${q.wx}）：八神 ${q.god}｜九星 ${q.stars.join('+')}｜天盘 ${q.tianStems.join('')}｜八门 ${q.door}｜地盘 ${q.di}${marks.length ? '｜' + marks.join('、') : ''}`);
    }
    L.push('');
    if (c.patterns.length) {
      L.push('格局提示（程序按规则识别，仅供参考）：');
      for (const pt of c.patterns) L.push(`- ${pt.name}【${pt.kind}】${pt.palace ? PALACE[pt.palace].gua + pt.palace + '宫：' : '全局：'}${pt.why}`);
    } else L.push('格局提示：未识别到常见特殊格局。');
    L.push('');
    L.push('请你作为熟悉奇门遁甲的解读者，基于以上盘面：');
    L.push('1. 先确定用神（按所问之事选取，如求财看生门与戊、谋事看值符与时干、出行看开门等），说明用神落宫的星、门、神、奇仪及旺衰；');
    L.push('2. 分析用神宫与日干、时干所落宫的生克关系；');
    L.push('3. 结合格局、旬空、驿马给出判断，再给出具体可行的建议与应期参考；');
    L.push('4. 说明这些结论的不确定性。');
    L.push(`所问之事：${question && question.trim() ? question.trim() : '（未填写，请先给出整体时运解读）'}`);
    return L.join('\n');
  }

  return {
    GAN, ZHI, JIEQI, PALACE, RING, STAR_HOME, DOOR_HOME, GODS, GAN_WX,
    chart, toText, sunApparentLon, solveTerm, jdFromBeijing, beijingFromJd, fmtDT, deltaT, fourPillars, ganzhi,
  };
});

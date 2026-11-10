/**
 * 太乙式盘：外圈十六神、内圈太乙九宫；各阶段动画脚本与旁白讲解。
 * mount() 在宿主元素里建盘，返回 staticState(k)、animate(k, done)、seal(on) 供外壳调度。
 */
import * as TY from './core.js';
import { esc } from '../../ui/anim.js';
import './board.css';

const mod = (a, n) => ((a % n) + n) % n;
const RING = TY.RING16, GOD = TY.GOD16, GONG = TY.GONG;

export const STAGES = ['积数定局', '十六神九宫', '太乙行宫', '文昌', '计神合神', '始击', '主客算将', '格局'];
export const moveMs = 300;
const OUT = { 子: [2, 4], 丑: [1, 4], 艮: [0, 4], 寅: [0, 3], 卯: [0, 2], 辰: [0, 1], 巽: [0, 0], 巳: [1, 0], 午: [2, 0], 未: [3, 0], 坤: [4, 0], 申: [4, 1], 酉: [4, 2], 戌: [4, 3], 乾: [4, 4], 亥: [3, 4] };
// 内圈太乙九宫
const IN = { 9: [1, 1], 2: [2, 1], 7: [3, 1], 4: [1, 2], 5: [2, 2], 6: [3, 2], 3: [1, 3], 8: [2, 3], 1: [3, 3] };
const SLOT_OUT = { wc: [.3, .66], sf: [.7, .66], js: [.3, .86], he: [.7, .86] };
const SLOT_IN = { ty: [.5, .5], hg: [.27, .74], hv: [.27, .9], ag: [.73, .74], av: [.73, .9] };
const TOK = { ty: '太乙', wc: '文昌', js: '计神', he: '合神', sf: '始击', hg: '主大', hv: '主参', ag: '客大', av: '客参' };

export const legend = '<span><i style="background:var(--accent)">太乙</i></span><span><i style="background:var(--gold)">文昌</i></span><span><i style="background:var(--cinnabar)">始击</i></span><span><i style="background:var(--indigo)">主将</i></span><span><i style="background:var(--plum)">客将</i></span>';

export function mount(host, C, sched) {
  host.innerHTML = `<div class="ty"><div class="board" id="board"><div class="grid" id="grid"></div><div class="chips" id="chips"></div><div class="counter off" id="counter"><span class="k" id="cK"></span><span class="n" id="cN"></span><span class="op" id="cOp"></span><span class="res" id="cRes"></span></div><div class="seal off" id="seal" aria-hidden="true">式成</div></div></div>`;
  const $ = (id) => host.querySelector('#' + id);
  const { later, tween, setMove, setEase, easeInOut, reduce } = sched;
  const chips = {};

  // ── 盘格 ──
  const grid = $('grid');
  for (const ch of RING) {
    const [c, r] = OUT[ch]; const d = document.createElement('div');
    d.className = 'cell'; d.id = 'o-' + ch; d.style.gridColumn = c + 1; d.style.gridRow = r + 1;
    d.innerHTML = `<span class="nm">${GOD[RING.indexOf(ch)]}</span><span class="ch">${ch}</span>`;
    grid.appendChild(d);
  }
  for (let g = 1; g <= 9; g++) {
    const [c, r] = IN[g]; const d = document.createElement('div');
    d.className = 'cell inner'; d.id = 'g-' + g; d.style.gridColumn = c + 1; d.style.gridRow = r + 1;
    d.innerHTML = g === 5 ? '<span class="ch">中五</span><span class="cal off" id="calBox"><span class="h">主算<b id="calHomeV"></b></span><span class="a">客算<b id="calAwayV"></b></span></span>' : `<span class="ch">${GONG[g].name}${g}</span>`;
    grid.appendChild(d);
  }
  const cellsAll = () => [...grid.querySelectorAll('.cell')];
  const cellOf = (key) => (typeof key === 'number' ? $('g-' + key) : $('o-' + key));

  function xyOut(ch, slot) { const [c, r] = OUT[ch]; const [sx, sy] = SLOT_OUT[slot]; return [(c + sx) / 5 * 100, (r + sy) / 5 * 100]; }
  function xyIn(g, slot) { const [c, r] = IN[g]; const [sx, sy] = SLOT_IN[slot]; return [(c + sx) / 5 * 100, (r + sy) / 5 * 100]; }
  function mkChip(key) { const el = document.createElement('div'); el.className = 'chip off ' + key; el.textContent = TOK[key]; $('chips').appendChild(el); chips[key] = el; return el; }
  function placeAt(el, [x, y], show = true) { el.style.left = x + '%'; el.style.top = y + '%'; el.classList.toggle('off', !show); }
  const putOut = (key, ch, show = true) => placeAt(chips[key], xyOut(ch, key), show);
  const putIn = (key, g, show = true) => placeAt(chips[key], xyIn(g, key), show);

  function build() {
    $('chips').innerHTML = ''; for (const k in chips) delete chips[k];
    Object.keys(TOK).forEach(mkChip);
  }
  const S = () => C.steps, B = () => C.board;

  function clearMarks() {
    $('board').classList.remove('done');
    cellsAll().forEach((c) => c.classList.remove('hl', 'hot', 'pulse', 'dim'));
    $('counter').classList.add('off');
    $('calBox').classList.add('off');
  }
  const hl = (key, cls = 'hl') => cellOf(key).classList.add(cls);
  function showCells(outer, inner) {
    for (const ch of RING) cellOf(ch).classList.toggle('dim', !outer);
    for (let g = 1; g <= 9; g++) cellOf(g).classList.toggle('dim', !inner);
  }

  // ── 第 k 幕完成后的静态盘面 ──
  function staticState(k) {
    clearMarks();
    const b = B();
    showCells(k >= 1, k >= 1);
    putIn('ty', b.taiyi, k >= 2);
    putOut('wc', b.wc, k >= 3);
    putOut('js', b.js, k >= 4); putOut('he', b.he, k >= 4);
    putOut('sf', b.sf, k >= 5);
    putIn('hg', b.hg, k >= 6); putIn('hv', b.hv, k >= 6); putIn('ag', b.ag, k >= 6); putIn('av', b.av, k >= 6);
    if (k >= 6) showCal(true);
    if (k === 0) { showCounter(S().ju.acc, true); }
    if (k === 2) hl(b.taiyi);
    if (k === 3) hl(b.wc);
    if (k === 4) { hl(b.js); hl(b.he); }
    if (k === 5) hl(b.sf);
    if (k === 7) { $('board').classList.add('done'); markPatterns(); }
  }
  function showCal(on) {
    $('calHomeV').textContent = S().cal.home; $('calAwayV').textContent = S().cal.away;
    $('calBox').classList.toggle('off', !on);
  }
  function showCounter(val, done) {
    const J = S().ju;
    $('counter').classList.remove('off');
    $('cK').textContent = J.accName;
    $('cN').textContent = Math.round(val).toLocaleString('en-US');
    $('cOp').textContent = done ? `÷ 72 余 ${J.kook}` : '';
    $('cRes').textContent = done ? `${J.dun}${J.kook}局` : '';
  }
  function markPatterns() {
    const b = B(), P = S().pats;
    const gOf = (p) => TY.GONG_OF16[p];
    if (P.length) hl(b.taiyi, 'hot');
    for (const p of P) {
      if (/始击/.test(p.why)) hl(b.sf, 'hot');
      if (/文昌/.test(p.why)) hl(b.wc, 'hot');
      for (const [k, n] of [['hg', '主大将'], ['hv', '主参将'], ['ag', '客大将'], ['av', '客参将']]) if (p.why.includes(n)) hl(b[k], 'hot');
    }
    void gOf;
  }

  // ── 各幕动画 ──
  function walkOut(key, path, stepMs, onEach) {
    // 沿十六神格子逐格行进
    setMove(stepMs); setEase('linear');
    path.forEach((ch, i) => later(stepMs * i, () => { putOut(key, ch, true); onEach && onEach(ch, i); }));
    return stepMs * path.length;
  }
  function ringPath(fromCh, toCh) {
    const a = RING.indexOf(fromCh), n = mod(RING.indexOf(toCh) - a, 16);
    return Array.from({ length: n + 1 }, (_, i) => RING[(a + i) % 16]);
  }
  function animate(k, done) {
    const Sx = S(), b = B();
    if (k === 0) {
      const J = Sx.ju, target = J.acc, from = Math.floor(target * 0.97);
      $('counter').classList.remove('off'); showCells(false, false);
      tween(2000, (t) => showCounter(from + (target - from) * (1 - Math.pow(1 - t, 3)), false), () => {
        later(300, () => { $('cOp').textContent = `÷ 72 余 ${J.kook}`; });
        later(900, () => { $('cRes').textContent = `${J.dun}${J.kook}局`; });
        later(2200, done);
      });
      return;
    }
    if (k === 1) {
      showCells(false, false);
      RING.forEach((ch, i) => later(90 * i + 100, () => cellOf(ch).classList.remove('dim')));
      [1, 2, 3, 4, 6, 7, 8, 9, 5].forEach((g, i) => later(90 * 16 + 120 * i + 200, () => cellOf(g).classList.remove('dim')));
      later(90 * 16 + 120 * 9 + 600, done); return;
    }
    if (k === 2) {
      const T = Sx.taiyi, hops = T.seq.slice(0, T.step + 1);
      setMove(380); setEase('ease-in-out');
      hops.forEach((g, i) => later(520 * i + 200, () => { cellsAll().forEach((c) => c.classList.remove('hl')); hl(g); putIn('ty', g, true); }));
      later(520 * hops.length + 300, () => cellOf(T.gong).classList.add('pulse'));
      later(520 * hops.length + 1100, done); return;
    }
    if (k === 3) {
      const W = Sx.wc, path = W.seq.slice(0, W.n);
      const t = walkOut('wc', path, 230, (ch, i) => { cellsAll().forEach((c) => c.classList.remove('hl')); hl(ch); if (i > 0 && path[i - 1] === ch) cellOf(ch).classList.add('pulse'); });
      later(t + 700, () => { setEase('ease-in-out'); done(); }); return;
    }
    if (k === 4) {
      const J = Sx.js, path = J.seq.slice(0, J.n);
      const t = walkOut('js', path, 230, (ch) => { cellsAll().forEach((c) => c.classList.remove('hl')); hl(ch); });
      later(t + 300, () => { setEase('ease-in-out'); putOut('he', b.he, true); hl(b.he); cellOf(b.he).classList.add('pulse'); });
      later(t + 1500, done); return;
    }
    if (k === 5) {
      // 始击 = 文昌 − 计神 + 和德：从和德出发，走“文昌距计神”的格数
      hl(b.wc); hl(b.js);
      later(600, () => { cellsAll().forEach((c) => c.classList.remove('hl')); hl('艮'); cellOf('艮').classList.add('pulse'); putOut('sf', '艮', true); });
      const path = ringPath('艮', b.sf);
      later(1400, () => {
        const t = walkOut('sf', path, 200, (ch) => { cellsAll().forEach((c) => c.classList.remove('hl')); hl(ch); });
        later(t + 700, () => { setEase('ease-in-out'); done(); });
      });
      return;
    }
    if (k === 6) {
      setMove(450); setEase('ease-in-out');
      later(200, () => { $('calHomeV').textContent = Sx.cal.home; $('calAwayV').textContent = ''; $('calBox').classList.remove('off'); hl(5); });
      later(900, () => { putIn('hg', b.hg, true); hl(b.hg); });
      later(1400, () => { putIn('hv', b.hv, true); });
      later(2000, () => { $('calAwayV').textContent = Sx.cal.away; });
      later(2700, () => { putIn('ag', b.ag, true); hl(b.ag); });
      later(3200, () => { putIn('av', b.av, true); });
      later(4000, done); return;
    }
    if (k === 7) {
      $('board').classList.add('done');
      later(300, markPatterns);
      later(1200, done); return;
    }
  }

  function blank() { clearMarks(); showCells(false, false); for (const c of Object.values(chips)) c.classList.add('off'); }
  build();
  return { staticState: (k) => (k < 0 ? blank() : staticState(k)), animate, seal: (on) => $('seal').classList.toggle('off', !on) };
}

function texts(C) {
  const S = () => C.steps, B = () => C.board;
  // ── 文字 ──
  const gname = (g) => `${GONG[g].name}${g}宫`;
  const p16 = (ch) => `${ch}·${GOD[RING.indexOf(ch)]}`;
  function caption(k, question) {
    const Sx = S(), b = B(), J = Sx.ju;
    const step = k >= 0 ? `<span class="step">${k + 1} / 8 · ${STAGES[k]}</span>` : '<span class="step">起式</span>';
    const pats = [...new Set(Sx.pats.map((p) => p.name))];
    const t = [
      `${J.accName} ${J.accText}，七十二局一周，得 <b>${J.dun}${J.kook}局</b>`,
      '外列十六神，内布太乙九宫',
      `太乙每宫三${J.unit}，不入中五，今在 <b>${gname(b.taiyi)}</b>`,
      `文昌十八位一周，${J.dun}起${Sx.wc.seq[0]}，今临 <b>${p16(b.wc)}</b>`,
      `计神${J.yang ? '起寅' : '起申'}逆行，今在${b.js}；${Sx.js.taisui}之合神在${b.he}`,
      `始击 = 文昌 − 计神 + 和德，落 <b>${p16(b.sf)}</b>`,
      `主算 ${Sx.cal.home}、客算 ${Sx.cal.away}，主将${gname(b.hg)}，客将${gname(b.ag)}`,
      pats.length ? `见 <b>${pats.join('、')}</b>` : '未见掩囚关格',
    ];
    return step + `<span>${k >= 0 ? t[k] : esc(C.input.text) + (question ? '　问：' + esc(question) : '')}</span>`;
  }
  function explain(k) {
    const Sx = S(), b = B(), J = Sx.ju, h = (no, t) => `<h2><span class="no">${no + 1}/8</span>${t}</h2>`;
    let x = '';
    if (k === 0) x = h(0, '积数与定局') + (J.ji === 'sui'
      ? `<p>岁计以《统宗》大德七年癸卯积年 10,155,219 推得：积年 = 10,153,916 + 年份。${J.year} 年（立春换年）积年 <span class="mono">${J.N.toLocaleString('en-US')}</span>，加一为算外 <span class="mono">${J.L.toLocaleString('en-US')}</span>。</p><p>以 360 去之余 ${J.zhou}，为第${J.jiNo}纪入纪第 ${J.ruJi} 年；以 72 去之余 <b>${J.kook}</b>，为${J.dun}${J.kook}局（${J.li}）。岁计始终阳遁。</p>`
      : `<p>时计积时 = （基准积日 + 距 1900-12-21 的日数 − 1）× 12 + 时辰序 + 1。今距基准 ${J.D.toLocaleString('en-US')} 日，时辰序 ${J.hi}，积时 <span class="mono">${J.accText}</span>。</p><p>以 72 去之余 <b>${J.kook}</b>。太阳视黄经 ${Sx.pillars.sunLon.toFixed(2)}°，${J.yang ? '冬至后、夏至前，阳遁' : '夏至后、冬至前，阴遁'}，得${J.dun}${J.kook}局（${J.li}）。</p><p class="rule">基准积日 708,011,105 取自 kintaiyi v0.2.4，用于兼容对照，不是《统宗》原文常数。</p>`);
    if (k === 1) x = h(1, '十六神与太乙九宫') + '<p>外圈十六神：子地主、丑阳德、艮和德、寅吕申、卯高丛、辰太阳、巽太炅、巳大神、午大威、未天道、坤大武、申武德、酉太簇、戌阴主、乾阴德、亥大义。</p><p>内圈太乙九宫与洛书不同：一乾、二离、三艮、四震、五中、六兑、七坤、八坎、九巽。</p>';
    if (k === 2) x = h(2, '太乙行宫') + `<p>局数以小周二十四去之余 ${Sx.taiyi.r}，三约之，得第 ${Sx.taiyi.step + 1} 宫、入宫第 ${Sx.taiyi.inGong} ${J.unit}。${J.yang ? '阳遁宫序一二三四六七八九' : '阴遁宫序九八七六四三二一'}，不入中五，太乙在 <b>${gname(b.taiyi)}</b>。</p>`;
    if (k === 3) x = h(3, '文昌（天目）') + `<p>局数以十八去之余 ${Sx.wc.n}。${J.yang ? '阳遁起申（武德）' : '阴遁起寅（吕申）'}顺行十六神，${J.yang ? '遇阴德、大武' : '遇太炅、和德'}重留一算，文昌临 <b>${p16(b.wc)}</b>。</p>`;
    if (k === 4) x = h(4, '计神与合神') + `<p>局数以十二去之余 ${Sx.js.n}。计神${J.yang ? '阳遁起寅' : '阴遁起申'}，逆行十二辰，在 <b>${b.js}</b>。合神为${J.ji === 'sui' ? '年' : '时'}支${Sx.js.taisui}的六合，在 <b>${b.he}</b>。</p>`;
    if (k === 5) x = h(5, '始击（地目）') + `<p>始击 = 文昌 − 计神 + 和德：文昌${b.wc}距计神${b.js}顺数 ${Sx.sf.delta} 位，从和德（艮）顺行 ${Sx.sf.delta} 位，落 <b>${p16(b.sf)}</b>，属${gname(TY.GONG_OF16[b.sf])}。</p>`;
    if (k === 6) x = h(6, '主客算与大将参将') + `<ul><li>主算 <b>${Sx.cal.home}</b>（${Sx.cal.homeTraits.join('、')}）：主大将${gname(Sx.cal.hg)}，主参将${gname(Sx.cal.hv)}</li><li>客算 <b>${Sx.cal.away}</b>（${Sx.cal.awayTraits.join('、')}）：客大将${gname(Sx.cal.ag)}，客参将${gname(Sx.cal.av)}</li></ul><p class="rule">主算从文昌起、客算从始击起，依宫数算至太乙前一宫而止；本页按《统宗》局例校过的七十二局表取数。大将：算去十取零，整十取十位；参将：大将三因去十。</p>`;
    if (k === 7) x = h(7, '格局') + (Sx.pats.length ? `<ul>${Sx.pats.map((p) => `<li><b>${p.name}</b>：${p.why}</li>`).join('')}</ul>` : '<p>未见掩、囚、关、对、格、击、迫。</p>') + '<p class="rule">掩：始击临太乙宫正位。击：始击在太乙正位相邻之辰或相邻之宫。囚：文昌或主客将与太乙同宫。关：主将与客将同宫。对：文昌在太乙对宫。格：始击或客将在太乙对宫。迫：主客将在太乙邻宫。提挟只作疑似；四郭固、四郭杜未排。</p>';
    return x;
  }
  function meta(k) {
    const Sx = S(), J = Sx.ju, parts = [];
    parts.push(`<span><b>${Sx.pillars.year} ${Sx.pillars.month} ${Sx.pillars.day} ${Sx.pillars.hour}</b></span>`);
    parts.push(`<span>${TY.OPT_TEXT.ji[J.ji]}${k >= 0 ? ` · <b>${J.dun}${J.kook}局</b>` : ''}</span>`);
    if (k >= 2) parts.push(`<span>太乙 <b>${gname(B().taiyi)}</b></span>`);
    return parts.join('');
  }

  return { caption, explain, meta };
}
export const caption = (C, k, question) => texts(C).caption(k, question);
export const explain = (C, k) => texts(C).explain(k);
export const meta = (C, k) => texts(C).meta(k);

/**
 * 本命盘盘面：黄道带转到上升点 → 画地平线与子午线 → 分宫 → 行星落位 → 相位连线 → 元素统计。
 * 上升点固定在左侧（九点钟方向），黄经逆时针增加，与常见占星软件一致。
 * mount() 在宿主元素里建盘，返回 staticState(k)、animate(k, done)、seal(on) 供外壳调度。
 */
import { SIGNS, HOUSE_NAMES, AYANAMSA, fmtLon, fmtDeg, fmtOffset, mod, angDiff, signOf } from './core.js';
import { esc } from '../../ui/anim.js';
import './board.css';

export const STAGES = ['时刻与地点', '上升与天顶', '分宫', '行星落位', '相位', '元素与模式'];
export const moveMs = 400;
export const legend = '<span><i class="lg conj"></i>合相</span><span><i class="lg hard"></i>四分 · 对分</span><span><i class="lg soft"></i>三分 · 六分</span><span><i class="lg minor"></i>次要相位</span><span>R 逆行</span>';

const R = { out: 190, zin: 160, hin: 141, pl: 122, deg: 105, asp: 92 };
const EL_CLASS = { 火: 'fire', 土: 'earth', 风: 'air', 水: 'water' };
const NS = 'http://www.w3.org/2000/svg';

/** 行星符号在盘上互相错开，至少隔 gap 度；返回显示用的黄经 */
function spread(items, gap = 7.5) {
  const n = items.length; if (!n) return [];
  const idx = items.map((b, i) => i).sort((a, b) => items[a].lon - items[b].lon);
  // 从最大空隙处断开，变成一条直线上的排布
  let cut = 0, best = -1;
  for (let i = 0; i < n; i++) { const a = items[idx[i]].lon, b = items[idx[(i + 1) % n]].lon; const g = mod(b - a) || 360; if (g > best) { best = g; cut = (i + 1) % n; } }
  const ord = [...idx.slice(cut), ...idx.slice(0, cut)];
  const base = items[ord[0]].lon;
  let pos = ord.map((i) => base + mod(items[i].lon - base));
  const want = [...pos];
  for (let it = 0; it < 200; it++) {
    let moved = false;
    for (let i = 1; i < n; i++) if (pos[i] - pos[i - 1] < gap) { const push = (gap - (pos[i] - pos[i - 1])) / 2; pos[i] += push; pos[i - 1] -= push; moved = true; }
    // 拉回原位，避免整体漂移
    for (let i = 0; i < n; i++) pos[i] += (want[i] - pos[i]) * 0.02;
    if (!moved) break;
  }
  const out = new Array(n);
  ord.forEach((i, k) => { out[i] = mod(pos[k]); });
  return out;
}

export function mount(host, C, sched) {
  const { later, tween } = sched;
  const S = C.steps, known = C.known;
  const asc = known ? S.angles.asc : 0;
  let rot = asc; // 当前转角：黄经 λ 画在屏幕角 180 + λ − rot（逆时针）
  const pt = (lon, r) => { const a = (180 + lon - rot) * Math.PI / 180; return [Math.cos(a) * r, -Math.sin(a) * r]; };
  const f = (n) => n.toFixed(2);

  const items = [...C.bodies, ...C.points];
  const shown = spread(items);

  host.innerHTML = `<div class="na"><div class="board" id="board">
    <svg class="chart" id="wh" viewBox="-212 -212 424 424" role="img" aria-label="本命盘">
      <g id="zod"></g><g id="hs" class="hs"></g><g id="ax" class="ax"></g><g id="asp" class="asp"></g><g id="pl" class="pl"></g>
    </svg>
    <div class="seal off" id="seal" aria-hidden="true">盘成</div></div>
    <div class="center pend" id="ctr"></div></div>`;
  const $ = (id) => host.querySelector('#' + id);
  const mk = (tag, attrs, parent) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); if (parent) parent.appendChild(el); return el; };

  // ── 黄道带 ──
  const zod = $('zod');
  const sectors = [], signTexts = [], ticks = [];
  mk('circle', { r: R.out, class: 'ring' }, zod); mk('circle', { r: R.zin, class: 'ring' }, zod); mk('circle', { r: R.hin, class: 'ring thin' }, zod); mk('circle', { r: R.asp, class: 'ring thin' }, zod);
  for (let s = 0; s < 12; s++) {
    sectors.push(mk('path', { class: 'sec ' + EL_CLASS[SIGNS[s].el] }, zod));
    signTexts.push(mk('text', { class: 'sg', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, zod));
    signTexts[s].textContent = SIGNS[s].zh;
  }
  for (let d = 0; d < 360; d += 5) ticks.push([d, mk('line', { class: d % 30 === 0 ? 'tk big' : d % 10 === 0 ? 'tk mid' : 'tk' }, zod)]);
  const arc = (l0, l1, r0, r1) => {
    const [x0, y0] = pt(l0, r1), [x1, y1] = pt(l1, r1), [x2, y2] = pt(l1, r0), [x3, y3] = pt(l0, r0);
    return `M${f(x0)} ${f(y0)}A${r1} ${r1} 0 0 0 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${r0} ${r0} 0 0 1 ${f(x3)} ${f(y3)}Z`;
  };
  function drawZod() {
    for (let s = 0; s < 12; s++) {
      sectors[s].setAttribute('d', arc(s * 30, s * 30 + 30, R.zin, R.out));
      const [x, y] = pt(s * 30 + 15, (R.out + R.zin) / 2); signTexts[s].setAttribute('x', f(x)); signTexts[s].setAttribute('y', f(y));
    }
    for (const [d, el] of ticks) {
      const len = d % 30 === 0 ? 0 : d % 10 === 0 ? 7 : 4;
      const [x0, y0] = pt(d, R.zin), [x1, y1] = pt(d, d % 30 === 0 ? R.out : R.zin + len);
      el.setAttribute('x1', f(x0)); el.setAttribute('y1', f(y0)); el.setAttribute('x2', f(x1)); el.setAttribute('y2', f(y1));
    }
  }

  // ── 地平线与子午线 ──
  const ax = $('ax'), axEls = [];
  if (known) {
    for (const [k, lon, lab] of [['asc', S.angles.asc, 'ASC'], ['dsc', S.angles.dsc, 'DSC'], ['mc', S.angles.mc, 'MC'], ['ic', S.angles.ic, 'IC']]) {
      const line = mk('line', { class: 'axl ' + k }, ax);
      const txt = mk('text', { class: 'axt', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, ax); txt.textContent = lab;
      axEls.push({ k, lon, line, txt });
    }
  }
  function drawAx(p = 1) {
    for (const a of axEls) {
      const [x0, y0] = pt(a.lon, R.asp), [x1, y1] = pt(a.lon, R.asp + (R.out + 2 - R.asp) * p);
      a.line.setAttribute('x1', f(x0)); a.line.setAttribute('y1', f(y0)); a.line.setAttribute('x2', f(x1)); a.line.setAttribute('y2', f(y1));
      // 标签放在外圈之外，按方向左右对齐，免得压住星座名
      const [tx, ty] = pt(a.lon, R.out + 6);
      a.txt.setAttribute('x', f(tx)); a.txt.setAttribute('y', f(ty)); a.txt.style.opacity = p;
      a.txt.setAttribute('text-anchor', tx < -60 ? 'end' : tx > 60 ? 'start' : 'middle');
    }
  }

  // ── 宫位 ──
  const hs = $('hs'), cuspEls = [];
  if (known) {
    const cs = S.houses.cusps;
    for (let i = 1; i <= 12; i++) {
      const line = mk('line', { class: 'cusp' + ([1, 4, 7, 10].includes(i) ? ' ang' : '') }, hs);
      const num = mk('text', { class: 'hn', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, hs); num.textContent = i;
      const mid = cs[i] + mod(cs[i === 12 ? 1 : i + 1] - cs[i]) / 2;
      cuspEls.push({ i, lon: cs[i], mid, line, num });
    }
  }
  function drawCusps() {
    for (const c of cuspEls) {
      const [x0, y0] = pt(c.lon, R.asp), [x1, y1] = pt(c.lon, R.zin);
      c.line.setAttribute('x1', f(x0)); c.line.setAttribute('y1', f(y0)); c.line.setAttribute('x2', f(x1)); c.line.setAttribute('y2', f(y1));
      const [tx, ty] = pt(c.mid, (R.zin + R.hin) / 2); c.num.setAttribute('x', f(tx)); c.num.setAttribute('y', f(ty));
    }
  }

  // ── 行星 ──
  const pl = $('pl');
  const plEls = items.map((b, i) => {
    const g = mk('g', { class: 'p ' + b.key + ' pend' }, pl);
    const tick = mk('line', { class: 'ptk' }, g);
    const dot = mk('circle', { class: 'pdot', r: 1.8 }, g);
    const t = mk('text', { class: 'pg', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g); t.textContent = b.s;
    const dg = mk('text', { class: 'pd', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
    const inSign = mod(b.lon) - signOf(b.lon) * 30; dg.textContent = Math.floor(inSign) + '°' + (b.speed < 0 && !['node', 'snode', 'lilith'].includes(b.key) ? 'R' : '');
    return { b, g, tick, dot, t, dg, show: shown[i], drop: 0 };
  });
  function drawPl() {
    for (const p of plEls) {
      const rr = R.pl + p.drop * 60;
      const [x0, y0] = pt(p.b.lon, R.zin), [x1, y1] = pt(p.b.lon, R.zin - 6);
      p.tick.setAttribute('x1', f(x0)); p.tick.setAttribute('y1', f(y0)); p.tick.setAttribute('x2', f(x1)); p.tick.setAttribute('y2', f(y1));
      const [dx, dy] = pt(p.b.lon, R.zin - 2); p.dot.setAttribute('cx', f(dx)); p.dot.setAttribute('cy', f(dy));
      const [x, y] = pt(p.show, rr); p.t.setAttribute('x', f(x)); p.t.setAttribute('y', f(y));
      const [u, v] = pt(p.show, R.deg + p.drop * 60); p.dg.setAttribute('x', f(u)); p.dg.setAttribute('y', f(v));
    }
  }

  // ── 相位 ──
  const aspG = $('asp');
  const lonOfKey = (k) => (k === 'asc' ? S.angles.asc : k === 'mc' ? S.angles.mc : items.find((b) => b.key === k).lon);
  const aspEls = C.aspects.map((a) => {
    const line = mk('line', { class: 'al ' + a.tone + (a.orb < 1 ? ' tight' : '') }, aspG);
    return { a, line, l1: lonOfKey(a.p), l2: lonOfKey(a.q) };
  });
  function drawAsp() {
    for (const e of aspEls) {
      const [x0, y0] = pt(e.l1, R.asp), [x1, y1] = pt(e.l2, R.asp);
      e.line.setAttribute('x1', f(x0)); e.line.setAttribute('y1', f(y0)); e.line.setAttribute('x2', f(x1)); e.line.setAttribute('y2', f(y1));
      const len = Math.hypot(x1 - x0, y1 - y0); e.line.style.strokeDasharray = `${f(len)} ${f(len)}`; e.len = len;
    }
  }
  const drawAll = () => { drawZod(); drawAx(1); drawCusps(); drawPl(); drawAsp(); };

  // ── 中心：元素与模式 ──
  const st = S.stats;
  $('ctr').innerHTML = `<div class="els">${Object.entries(st.el).map(([k, v]) => `<span class="${EL_CLASS[k]}"><b>${v.length}</b>${k}</span>`).join('')}</div>
    <div class="mds">${Object.entries(st.md).map(([k, v]) => `<span>${k} <b>${v.length}</b></span>`).join('')}</div>${st.ruler ? `<div class="rl">命主星 <b>${st.ruler.zh}</b></div>` : ''}`;

  const setVis = (els, on) => els.forEach((el) => el.classList.toggle('pend', !on));
  const axShow = (on) => setVis(axEls.flatMap((a) => [a.line, a.txt]), on);
  const csShow = (on, n = 12) => cuspEls.forEach((c) => { c.line.classList.toggle('pend', !on || c.i > n); c.num.classList.toggle('pend', !on || c.i > n); });
  const plShow = (on) => plEls.forEach((p) => { p.g.classList.toggle('pend', !on); p.drop = 0; });
  const aspShow = (on) => aspEls.forEach((e) => { e.line.classList.toggle('pend', !on); e.line.style.strokeDashoffset = 0; });
  const ctrShow = (on) => { $('ctr').classList.toggle('pend', !on); $('board').classList.toggle('done', on); plEls.forEach((p) => p.g.classList.toggle('ruler', on && st.ruler && p.b.key === st.ruler.key)); };

  function staticState(k) {
    rot = k >= 0 ? asc : (known ? asc - 90 : 0);
    plEls.forEach((p) => { p.drop = 0; });
    drawAll();
    axShow(k >= 1); csShow(k >= 2); plShow(k >= 3); aspShow(k >= 4); ctrShow(k >= 5);
    $('wh').classList.toggle('dim', k < 0);
  }

  function animate(k, done) {
    if (k === 0) {
      // 黄道带转一圈多，停在出生时刻的上升点
      $('wh').classList.remove('dim');
      const from = asc - 360 - 90;
      tween(2200, (t) => { rot = from + (asc - from) * sched.easeInOut(t); drawZod(); }, () => { rot = asc; drawAll(); later(300, done); });
    } else if (k === 1) {
      if (!known) { later(600, done); return; }
      axShow(true);
      tween(900, (t) => drawAx(sched.easeInOut(t)), () => later(400, done));
    } else if (k === 2) {
      if (!known) { later(600, done); return; }
      csShow(false);
      const order = [1, 10, 7, 4, 2, 3, 5, 6, 8, 9, 11, 12];
      order.forEach((i, n) => later(n * 150, () => { const c = cuspEls[i - 1]; c.line.classList.remove('pend'); c.num.classList.remove('pend'); }));
      later(order.length * 150 + 500, done);
    } else if (k === 3) {
      plEls.forEach((p) => { p.drop = 1; });
      drawPl();
      plEls.forEach((p, n) => later(n * 230, () => {
        p.g.classList.remove('pend');
        tween(520, (t) => { p.drop = 1 - sched.easeInOut(t); drawPl(); });
      }));
      later(plEls.length * 230 + 700, done);
    } else if (k === 4) {
      aspEls.forEach((e) => { e.line.style.strokeDashoffset = e.len; e.line.classList.remove('pend'); });
      const n = aspEls.length, step = Math.min(160, 2600 / Math.max(1, n));
      aspEls.forEach((e, i) => later(i * step, () => tween(420, (t) => { e.line.style.strokeDashoffset = e.len * (1 - t); })));
      later(n * step + 600, done);
    } else if (k === 5) {
      ctrShow(true);
      later(1100, done);
    } else done();
  }

  return { staticState, animate, seal: (on) => $('seal').classList.toggle('off', !on) };
}

const fmtPlace = (P) => `${P.name ? P.name + ' ' : ''}${Math.abs(P.lat).toFixed(2)}°${P.lat >= 0 ? 'N' : 'S'} ${Math.abs(P.lon).toFixed(2)}°${P.lon >= 0 ? 'E' : 'W'}`;

export function caption(C, k, q) {
  const S = C.steps, tm = S.time;
  const qq = q ? `<span class="q">所问：${esc(q)}</span>` : '';
  if (k < 0) return `<b>${esc(C.input.text)}</b> · ${esc(fmtPlace(C.place))}${qq}`;
  if (k === 0) return `钟表时间 ${esc(C.input.text.slice(11) || '')}（${fmtOffset(tm.offset)}${tm.dst ? '，夏令时' : ''}）→ 世界时 <b>${tm.utcText.slice(11)}</b> → 地方恒星时 <b>${tm.lst}</b>`;
  if (k === 1) return C.known ? `东方地平线升起的是 <b>${fmtLon(S.angles.asc)}</b>，头顶正南方中天的是 <b>${fmtLon(S.angles.mc)}</b>` : '出生时间不详，无法确定上升与天顶，这一步跳过';
  if (k === 2) return C.known ? `按 <b>${HOUSE_NAMES[S.houses.used]}</b> 分出十二宫${S.houses.note ? '（' + esc(S.houses.note) + '）' : ''}` : '没有上升点就没有宫位，这一步跳过';
  if (k === 3) { const sun = C.bodies[0], moon = C.bodies[1]; return `太阳在 <b>${fmtLon(sun.lon)}</b>，月亮在 <b>${fmtLon(moon.lon)}</b>${C.known ? `，上升 <b>${SIGNS[signOf(S.angles.asc)].zh}</b>` : ''}`; }
  if (k === 4) { const n = C.aspects.length, t = C.aspects[0]; return `共 <b>${n}</b> 组相位${t ? `，最紧的是 ${t.pz}${t.zh}${t.qz}（差 ${fmtDeg(t.orb)}）` : ''}`; }
  const st = S.stats; const top = Object.entries(st.el).sort((a, b) => b[1].length - a[1].length)[0];
  return `${top[0]}象星座最多（${top[1].length} 颗）${st.ruler ? `；命主星 <b>${st.ruler.zh}</b>，在第 ${st.ruler.house} 宫` : ''}`;
}

export function explain(C, k) {
  const S = C.steps, tm = S.time, o = C.opts, P = C.place;
  if (k === 0) {
    return `<p>出生证明上的钟点是当地“钟表时间”。先按出生地时区换成世界时：${/^UTC/.test(P.tz) ? `固定偏移 ${fmtOffset(tm.offset)}` : `时区 ${esc(P.tz)}，这一天的偏移是 ${fmtOffset(tm.offset)}${tm.dst ? '，<b>当时在实行夏令时</b>（中国 1986–1991 年夏季、许多欧美国家每年都有）' : ''}`}，得到 UTC ${tm.utcText}。</p>
      <p>再用世界时求格林尼治视恒星时 ${tm.gast}，加上出生地经度（每 15° 一小时）得到地方恒星时 <b>${tm.lst}</b>，即此刻正在天顶的赤经 ${tm.ramc.toFixed(2)}°。动画里黄道带转动，就是在找这一刻天球的朝向。</p>
      ${o.zodiac === 'tropical' ? '<p>用回归黄道：白羊座 0° 定在春分点。</p>' : `<p>用恒星黄道（${AYANAMSA[o.zodiac].zh}）：所有黄经减去岁差 ${fmtDeg(S.zodiac.ayanamsa)}，让星座对回实际的恒星背景。</p>`}`;
  }
  if (k === 1) {
    if (!C.known) return '<p>上升点由出生时刻和地点共同决定，大约每两小时换一个星座。时间不详时不排上升、天顶和宫位。</p>';
    return `<p><b>上升（ASC）</b>是出生时东方地平线与黄道的交点：${fmtLon(S.angles.asc, true)}。它对面是下降（DSC）${fmtLon(S.angles.dsc)}。</p>
      <p><b>天顶（MC）</b>是子午线与黄道的交点：${fmtLon(S.angles.mc, true)}，对面是天底（IC）${fmtLon(S.angles.ic)}。黄赤交角取 ${tm.eps.toFixed(4)}°（含章动）。</p>`;
  }
  if (k === 2) {
    if (!C.known) return '<p>宫位从上升点起算，时间不详时不排。行星只看星座。</p>';
    const cs = S.houses.cusps;
    return `<p>${HOUSE_NAMES[S.houses.used]}：${esc(HOUSE_DESC[S.houses.used])}</p>${S.houses.note ? `<p>${esc(S.houses.note)}</p>` : ''}
      <p>${Array.from({ length: 12 }, (_, i) => `${i + 1} 宫 ${fmtLon(cs[i + 1])}`).join('；')}</p>`;
  }
  if (k === 3) {
    const rows = [...C.bodies, ...C.points].map((b) => `${b.zh} ${fmtLon(b.lon)}${b.house ? ` · ${b.house} 宫` : ''}${b.speed < 0 && !['node', 'snode', 'lilith'].includes(b.key) ? ' · 逆行' : ''}`);
    return `<p>行星位置是从地球看出去的视黄经（已含光行时、光行差与章动），用 astronomy-engine 计算。逆行是地球与行星相对运动造成的视运动倒退。</p>
      <p>${rows.join('<br>')}</p>${C.known ? '' : `<p>月亮一天走约 13°，时间不详时它在 ${fmtLon(S.moonRange[0])} 到 ${fmtLon(S.moonRange[1])} 之间。</p>`}
      <p>北交点取${o.node === 'mean' ? '平均交点（平滑后的位置）' : '真交点（月球当时轨道与黄道的升交点）'}。</p>`;
  }
  if (k === 4) {
    if (!C.aspects.length) return '<p>在当前容许度下没有形成相位。</p>';
    return `<p>两颗星的黄经差接近 0°、60°、90°、120°、180°${o.minor ? ' 或次要角度' : ''}时成相位，允许的偏差叫容许度。“入相”是还在靠近，“出相”是已经离开。</p>
      <p>${C.aspects.map((a) => `${a.pz} ${a.zh} ${a.qz} · ${fmtDeg(a.orb)}${a.applying == null ? '' : a.applying ? ' 入' : ' 出'}`).join('<br>')}</p>`;
  }
  const st = S.stats;
  return `<p>按十大行星所在星座统计：${Object.entries(st.el).map(([k2, v]) => `${k2} ${v.length}`).join('、')}；${Object.entries(st.md).map(([k2, v]) => `${k2} ${v.length}`).join('、')}。</p>
    ${st.stellia.length ? `<p>星群：${st.stellia.join('；')}。</p>` : ''}
    ${st.ruler ? `<p>上升星座的守护星称命主星：${st.ruler.zh}（${o.rulers === 'trad' ? '古典' : '现代'}守护）。</p>` : ''}`;
}

const HOUSE_DESC = {
  P: '按每个度数自己从升起到中天（或落下）的时间三等分。现代最常用，大多数软件默认。',
  K: '把天顶度数从升起到中天的时间三等分，各时刻的上升点作为宫头。',
  R: '把天赤道从天顶起每 30° 一分，再投影到黄道上。',
  C: '把东西向的卯酉圈每 30° 一分，再投影到黄道上。',
  O: '在黄道上把上升到天顶、天顶到下降之间的弧各三等分。',
  E: '从上升点起每 30° 一宫，天顶不一定落在第 10 宫头。',
  W: '上升所在星座整个算第 1 宫，之后每个星座一宫。最古老的分宫法。',
};

export function meta(C, k) {
  const sun = C.bodies[0], moon = C.bodies[1];
  const parts = [`<b>${esc(C.input.text)}</b>`, esc(fmtPlace(C.place))];
  if (k >= 1 && C.known) parts.push(`上升 <b>${SIGNS[signOf(C.steps.angles.asc)].zh}</b>`);
  if (k >= 3) parts.push(`太阳 <b>${SIGNS[signOf(sun.lon)].zh}</b>`, `月亮 <b>${SIGNS[signOf(moon.lon)].zh}</b>`);
  return parts.map((p) => `<span>${p}</span>`).join('');
}

export { angDiff };

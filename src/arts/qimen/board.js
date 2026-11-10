/**
 * 奇门九宫盘：盘面结构与各阶段动画脚本、旁白与讲解文字。
 * mount() 在宿主元素里建盘，返回 staticState(k)、animate(k, done)、seal(on) 供外壳调度。
 */
import { PALACE, RING, STAR_HOME, DOOR_HOME, GODS } from './core.js';
import { ZHI, JIEQI } from '../../core/calendar.js';
import { esc } from '../../ui/anim.js';
import './board.css';

const QM = { PALACE, RING, STAR_HOME, DOOR_HOME, GODS, ZHI, JIEQI };
export const STAGES = ['四柱节气', '阴阳定局', '布地盘', '旬首值符', '转天盘', '转人盘', '排八神', '空马格局', '古籍克应'];
const KY_ORDER = [4, 9, 2, 3, 7, 8, 1, 6];
export const moveMs = 380;
const POS = { 4: [0, 0], 9: [1, 0], 2: [2, 0], 3: [0, 1], 5: [1, 1], 7: [2, 1], 8: [0, 2], 1: [1, 2], 6: [2, 2] };
const SLOT = { god: [.2, .17], tian: [.8, .17], tian2: [.6, .17], star: [.5, .43], qin: [.5, .62], door: [.22, .8], di: [.8, .8], badge: [.5, .17], badge2: [.5, .3], diCenter: [.5, .5], ky: [.5, .93] };
const P = (p) => `${QM.PALACE[p].gua}${p}宫`;
const cn = (n) => '〇一二三四五六七八九'[n];

export const legend = '<span><b style="color:var(--cinnabar)">红</b> 八神</span><span><b style="color:var(--gold)">金</b> 九星</span><span><b style="color:var(--ink)">黑</b> 天盘干</span><span><b style="color:var(--accent)">蓝</b> 八门</span><span><b style="color:var(--muted)">灰</b> 地盘干</span>';

export function mount(host, C, sched) {
  host.innerHTML = `<div class="qm">
    <div class="compass"><span>东南 巽</span><span>南 · 离</span><span>坤 西南</span></div>
    <div class="board" id="board"><div class="grid" id="grid"></div><svg class="paths" id="paths" viewBox="0 0 300 300" preserveAspectRatio="none"></svg><div class="chips" id="chips"></div><div class="seal off" id="seal" aria-hidden="true">盘成</div></div>
    <div class="compass"><span>东北 艮</span><span>北 · 坎</span><span>乾 西北</span></div></div>`;
  const $ = (id) => host.querySelector('#' + id);
  const { later, tween, setMove, setEase, easeInOut } = sched;
  const chips = {};

  // ── 盘格 ──
  const grid = $('grid');
  for (const p of [4, 9, 2, 3, 5, 7, 8, 1, 6]) {
    const d = document.createElement('div');
    d.className = 'cell'; d.id = 'cell' + p;
    const info = QM.PALACE[p];
    d.innerHTML = `<div class="gua">${info.gua}</div><div class="pname">${p === 5 ? '中五宫' : info.gua + p + ' · ' + info.dir}</div>`;
    grid.appendChild(d);
  }
  const cellsAll = () => [...grid.children];

  function xy(p, slot) { const [c, r] = POS[p]; const [sx, sy] = SLOT[slot]; return [(c + sx) / 3 * 100, (r + sy) / 3 * 100]; }
  function mkChip(key, cls, text) {
    const el = document.createElement('div');
    el.className = 'chip off ' + cls; el.textContent = text;
    $('chips').appendChild(el); chips[key] = el; return el;
  }
  function place(el, p, slot, show = true) { const [x, y] = xy(p, slot); el.style.left = x + '%'; el.style.top = y + '%'; el.classList.toggle('off', !show); }
  function build() {
    $('chips').innerHTML = ''; for (const k in chips) delete chips[k];
    for (let p = 1; p <= 9; p++) mkChip('di' + p, 'di', C.palaces[p].di);
    for (const p of RING) {
      mkChip('star' + p, 'star', QM.STAR_HOME[p].slice(1));
      mkChip('tian' + p, 'tian', C.palaces[p].di); // 天盘干 = 原宫地盘干，随星转
      mkChip('door' + p, 'door', QM.DOOR_HOME[p]);
    }
    mkChip('qin', 'qin', '禽'); chips.star5 = chips.qin;
    mkChip('tian5', 'tian', C.palaces[5].di);
    C.steps.god.names.forEach((g, i) => mkChip('god' + i, 'god', g));
    mkChip('stamp', 'stamp', cn(C.steps.ju.ju) + '局');
    if (C.keying) for (const k of C.keying.palaces) mkChip('ky' + k.p, 'ky', k.gan[0] ? k.gan[0].name : '');
    mkChip('kong', 'badge', '空'); mkChip('kong2', 'badge', '空'); mkChip('ma', 'badge ma', '马');
    for (let p = 1; p <= 9; p++) place(chips['di' + p], p, p === 5 ? 'diCenter' : 'di', false);
    for (const p of RING) { place(chips['star' + p], p, 'star', false); place(chips['tian' + p], p, 'tian', false); place(chips['door' + p], p, 'door', false); }
    place(chips.qin, 5, 'star', false); place(chips.tian5, 5, 'tian', false);
    QM.GODS.forEach((g, i) => place(chips['god' + i], C.steps.god.start, 'god', false));
    place(chips.kong, 1, 'badge', false); place(chips.kong2, 1, 'badge', false); place(chips.ma, 1, 'badge2', false);
    place(chips.stamp, C.steps.ju.ju, 'star', false);
  }

  const ringAt = (home, s) => RING[((RING.indexOf(home) + s) % 8 + 8) % 8];
    function setStars(s, show) {
    for (const p of RING) { const to = ringAt(p, s); place(chips['star' + p], to, 'star', show); place(chips['tian' + p], to, 'tian', show); }
    const qTo = ringAt(C.steps.ju.ji, s); place(chips.qin, qTo, 'qin', show); place(chips.tian5, qTo, 'tian2', show);
  }
  function setDoors(s, show) { for (const p of RING) place(chips['door' + p], ringAt(p, s), 'door', show); }
  function setGods(show, count = 8) {
    const S = C.steps.god; const gi = RING.indexOf(S.start);
    QM.GODS.forEach((g, i) => {
      const p = RING[((gi + (S.clockwise ? i : -i)) % 8 + 8) % 8];
      place(chips['god' + i], show && i < count ? p : S.start, 'god', show && i < count);
    });
  }
  function clearMarks() {
    $('board').classList.remove('dial', 'done');
    cellsAll().forEach((c) => c.classList.remove('hl', 'hot', 'pulse'));
    Object.values(chips).forEach((c) => c.classList.remove('key'));
    $('paths').innerHTML = '';
  }
  const hl = (p, cls = 'hl') => $('cell' + p).classList.add(cls);
  const clearHl = () => cellsAll().forEach((c) => c.classList.remove('hl'));

  // 第 k 幕完成后的静态盘面
  function staticState(k) {
    clearMarks();
    const S = C.steps;
    for (let p = 1; p <= 9; p++) place(chips['di' + p], p, p === 5 ? 'diCenter' : 'di', k >= 2);
    if (k === 3) { setStars(0, true); place(chips.qin, 5, 'star', true); for (const p of RING) chips['tian' + p].classList.add('off'); chips.tian5.classList.add('off'); }
    else setStars(k >= 4 ? S.tian.shift : 0, k >= 4);
    setDoors(k >= 5 ? S.door.doorShift : 0, k >= 3);
    setGods(k >= 6);
    const kp = C.summary.kongPalaces;
    place(chips.kong, kp[0], 'badge', k >= 7);
    place(chips.kong2, kp[1] || kp[0], 'badge', k >= 7 && kp.length > 1);
    place(chips.ma, C.summary.maPalace, 'badge2', k >= 7);
    place(chips.stamp, S.ju.ju, 'star', k === 1);
    if (k === 0) drawDial(C.steps.pillars.sunLon);
    if (k === 1) hl(S.ju.ju);
    if (k >= 7) $('board').classList.add('done');
    $('board').classList.toggle('keying', k >= 8 && !!C.keying);
    if (C.keying) for (const kp of C.keying.palaces) place(chips['ky' + kp.p], kp.p, 'ky', k >= 8);
    $('board').classList.toggle('filled', k >= 3);
    if (k === 3) { const xp = S.xun.xunPalace; hl(xp); chips['star' + xp].classList.add('key'); chips['door' + (xp === 5 ? C.steps.ju.ji : xp)].classList.add('key'); }
    if (k === 4) hl(S.tian.target);
    if (k === 5) hl(S.door.doorTarget);
    if (k === 6) hl(S.god.start);
    if (k === 7) C.patterns.forEach((pt) => pt.palace && hl(pt.palace, 'hot'));
  }

  // 黄道盘：上南下北、左东右西，春分在东（左），夏至在南（上）
  const JQ_ALL = QM.JIEQI;
  const dialPt = (lon, r) => { const a = lon * Math.PI / 180; return [150 - r * Math.cos(a), 150 - r * Math.sin(a)]; };
  function drawDial(lon, from) {
    $('board').classList.add('dial');
    let h = '<g class="dialg"><circle class="ring" cx="150" cy="150" r="118"/>';
    for (let i = 0; i < 24; i++) {
      const L = i * 15, [x1, y1] = dialPt(L, 112), [x2, y2] = dialPt(L, 124), [tx, ty] = dialPt(L, 136);
      h += `<line class="tick" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
      h += `<text x="${tx.toFixed(1)}" y="${(ty + 2.5).toFixed(1)}" text-anchor="middle">${JQ_ALL[i]}</text>`;
    }
    h += '<path class="arc" id="darc" d=""/><circle class="sunglow" id="dglow" r="11"/><circle class="sun" id="dsun" r="6"/>';
    h += `<text class="now" x="150" y="146" text-anchor="middle">${C.steps.pillars.term}</text>`;
    h += '<text x="150" y="160" text-anchor="middle" id="dlon"></text></g>';
    $('paths').innerHTML = h;
    setSun(lon, from == null ? lon : from);
  }
  // 只更新太阳、弧线和读数（黄经增大在屏幕上是顺时针，SVG sweep-flag = 1）
  function setSun(lon, from) {
    const [sx, sy] = dialPt(lon, 118);
    for (const id of ['dsun', 'dglow']) { const c = $(id); c.setAttribute('cx', sx.toFixed(2)); c.setAttribute('cy', sy.toFixed(2)); }
    const sweep = ((lon - from) % 360 + 360) % 360;
    const [ax, ay] = dialPt(from, 118);
    $('darc').setAttribute('d', sweep > 0.2 ? `M${ax.toFixed(2)},${ay.toFixed(2)} A118,118 0 ${sweep > 180 ? 1 : 0} 1 ${sx.toFixed(2)},${sy.toFixed(2)}` : '');
    $('dlon').textContent = `太阳黄经 ${(((lon % 360) + 360) % 360).toFixed(1)}°`;
  }

  const center = (p) => { const [c, r] = POS[p]; return [c * 100 + 50, r * 100 + 50]; };
  function drawPath(list, upto, labels) {
    const pts = list.slice(0, upto + 1).map(center);
    let h = `<polyline points="${pts.map((q) => q.join(',')).join(' ')}"/>`;
    pts.forEach((q, i) => {
      h += `<circle cx="${q[0]}" cy="${q[1]}" r="${i === upto ? 4 : 2.5}"/>`;
      if (labels) h += `<text x="${q[0] + 6}" y="${q[1] - 6}">${labels[i]}</text>`;
    });
    $('paths').innerHTML = h;
  }

  // 各幕动画：从上一幕的静态盘面出发，完成后调用 done
  function animate(k, done) {
    const S = C.steps;
    if (k === 0) {
      const lon = S.pillars.sunLon, from = lon - 105;
      drawDial(from, from);
      tween(2200, (t) => setSun(from + (lon - from) * easeInOut(t), from), () => later(1200, done));
      return;
    }
    if (k === 1) {
      $('paths').innerHTML = ''; $('board').classList.remove('dial');
      later(400, () => { hl(S.ju.ju); $('cell' + S.ju.ju).classList.add('pulse'); });
      later(900, () => place(chips.stamp, S.ju.ju, 'star', true));
      later(2400, done); return;
    }
    if (k === 2) {
      const order = S.di.order;
      order.forEach((o, i) => later(450 * i + 300, () => {
        place(chips['di' + o.palace], o.palace, o.palace === 5 ? 'diCenter' : 'di', true);
        cellsAll().forEach((c) => c.classList.remove('hl')); hl(o.palace);
        drawPath(order.map((x) => x.palace), i);
      }));
      later(450 * order.length + 700, done); return;
    }
    if (k === 3) {
      $('board').classList.add('filled');
      setStars(0, true); place(chips.qin, 5, 'star', true); for (const p of RING) chips['tian' + p].classList.add('off'); chips.tian5.classList.add('off');
      setDoors(0, true);
      later(700, () => { hl(S.xun.xunPalace); $('cell' + S.xun.xunPalace).classList.add('pulse'); });
      later(1400, () => { const xp = S.xun.xunPalace; chips['star' + xp].classList.add('key'); chips['door' + (xp === 5 ? C.steps.ju.ji : xp)].classList.add('key'); });
      later(2000, done); return;
    }
    if (k === 4) {
      // 天盘干从地盘干处浮起；天禽先到寄宫；然后整盘顺时针转
      setMove(0);
      for (const p of RING) place(chips['tian' + p], p, 'di', true);
      place(chips.tian5, 5, 'diCenter', true); place(chips.qin, 5, 'star', true);
      void $('chips').offsetWidth; setMove(500);
      later(200, () => { for (const p of RING) place(chips['tian' + p], p, 'tian', true); });
      later(900, () => { const J = C.steps.ju.ji; hl(J); place(chips.qin, J, 'qin', true); place(chips.tian5, J, 'tian2', true); });
      later(1900, () => { cellsAll().forEach((c) => c.classList.remove('hl')); hl(S.tian.target); $('cell' + S.tian.target).classList.add('pulse'); setMove(360); setEase('linear'); });
      const n = S.tian.shift;
      for (let i = 1; i <= n; i++) later(2300 + 360 * (i - 1), () => setStars(i, true));
      later(2300 + 360 * n + 500, () => { setEase('ease-in-out'); done(); }); return;
    }
    if (k === 5) {
      const path = S.door.path;
      const zi = QM.ZHI.indexOf(S.xun.xunName[1]);
      const labels = path.map((_, i) => QM.ZHI[(zi + i) % 12]);
      path.forEach((_, i) => later(480 * i + 300, () => { drawPath(path, i, labels); cellsAll().forEach((c) => c.classList.remove('hl')); hl(path[i]); }));
      const t0 = 480 * path.length + 500;
      const n = S.door.doorShift;
      later(t0 - 100, () => { cellsAll().forEach((c) => c.classList.remove('hl')); hl(S.door.doorTarget); });
      later(t0, () => { setMove(360); setEase('linear'); });
      for (let i = 1; i <= n; i++) later(t0 + 360 * (i - 1) + 20, () => setDoors(i, true));
      later(t0 + 360 * n + 500, () => { setEase('ease-in-out'); done(); }); return;
    }
    if (k === 6) {
      hl(S.god.start);
      for (let i = 1; i <= 8; i++) later(300 * i, () => setGods(true, i));
      later(300 * 9 + 400, done); return;
    }
    if (k === 7) {
      const kp = C.summary.kongPalaces;
      later(300, () => place(chips.kong, kp[0], 'badge', true));
      later(600, () => kp[1] && place(chips.kong2, kp[1], 'badge', true));
      later(900, () => place(chips.ma, C.summary.maPalace, 'badge2', true));
      C.patterns.filter((p) => p.palace).forEach((pt, i) => later(1200 + 280 * i, () => hl(pt.palace, 'hot')));
      later(1500 + 280 * C.patterns.length, done); return;
    }
    if (k === 8) {
      // 逐宫查克应：依洛书方位走一遍，亮起该宫并写上十干格名
      if (!C.keying) { later(500, done); return; }
      $('board').classList.add('keying');
      KY_ORDER.forEach((p, i) => later(200 + 420 * i, () => {
        clearHl(); hl(p); place(chips['ky' + p], p, 'ky', true);
      }));
      later(200 + 420 * KY_ORDER.length + 300, () => { clearHl(); done(); });
      return;
    }
  }


  build();
  return { staticState, animate, seal: (on) => $('seal').classList.toggle('off', !on) };
}

  // ── 旁白 ──
  function yuanExplain(C) {
    const S = C.steps, J = S.ju;
    if (J.method === 'zhirun') {
      const st = { 超神: `符头比节气早到 ${J.offset} 天，为<b>超神</b>，提前用${J.juTerm}的局`, 接气: `节气比符头早到 ${-J.offset} 天，为<b>接气</b>，符头到后才换${J.juTerm}的局`, 正授: '符头与节气同日，为<b>正授</b>', 置闰: `芒种、大雪之后超神超过九天，<b>置闰</b>，重复${J.juTerm}三元` }[J.status];
      return `置闰法：本元上元符头为 ${J.head} 日（${J.headDate}），${st}。今日距符头第 ${['一至五', '六至十', '十一至十五'][['上元', '中元', '下元'].indexOf(J.yuan)]} 天，为<b>${J.yuan}</b>。`;
    }
    if (J.method === 'maoshan') return `茅山法：${S.pillars.term}交节后第 ${Math.floor(J.days) + 1} 天，每五天一元，为<b>${J.yuan}</b>。`;
    return `拆补法：日柱 ${S.pillars.day} 往前 ${J.back} 天到最近的甲/己日，符头为 <b>${J.futou}</b>，地支“${J.futou[1]}”属${{ 上元: '子午卯酉', 中元: '寅申巳亥', 下元: '辰戌丑未' }[J.yuan]}，所以是<b>${J.yuan}</b>。`;
  }

export function explain(C, k) {
    const S = C.steps, sm = C.summary;
    const h = (no, t) => `<h2><span class="no">${no + 1}/${STAGES.length}</span>${t}</h2>`;
    let html = '';
    if (k === 0) html = h(0, '四柱与节气') + `
      <div class="kv"><div><span>年柱</span><b>${S.pillars.year}</b></div><div><span>月柱</span><b>${S.pillars.month}</b></div><div><span>日柱</span><b>${S.pillars.day}</b></div><div><span>时柱</span><b>${S.pillars.hour}</b></div></div>
      <p>太阳视黄经 <span class="mono">${S.pillars.sunLon.toFixed(3)}°</span>，正处在<b>${S.pillars.term}</b>（<span class="mono">${S.pillars.termTime}</span> 交节），下一个节气是${S.pillars.nextTerm}（<span class="mono">${S.pillars.nextTermTime}</span>）。</p>
      ${C.opts.solar ? `<p>真太阳时 <span class="mono">${S.pillars.clock}</span>：东经 ${C.opts.lon}° 经度差 ${((C.opts.lon - 120) * 4).toFixed(1)} 分，均时差 ${S.pillars.eot.toFixed(1)} 分。日柱、时柱按真太阳时取。</p>` : ''}
      <p class="rule">年柱以立春换，月柱以“节”换（每 30° 黄经一个月），日柱由儒略日数对 60 取余（${C.opts.dayChange === 23 ? '23 点换日' : '0 点换日'}${S.pillars.dayShift ? '，本时刻已过 23 点，日柱算作次日' : ''}），时柱用五鼠遁从日干推出。</p>`;
    if (k === 1) html = h(1, '阴阳遁与局数') + `
      <p>${yuanExplain(C)}</p>
      <p>用局节气${S.ju.juTerm}在${S.ju.yang ? '冬至之后、夏至之前，用<b>阳遁</b>' : '夏至之后、冬至之前，用<b>阴遁</b>'}。</p>
      <div class="yuan">${['上元', '中元', '下元'].map((y, i) => `<span class="${y === S.ju.yuan ? 'on' : ''}">${y} ${S.ju.tableRow[i]}局</span>`).join('')}</div>
      <p>查${S.ju.juTerm}一行得 <b>${S.ju.dun}${cn(S.ju.ju)}局</b>，地盘从${P(S.ju.ju)}起。</p>`;
    if (k === 2) html = h(2, '布地盘三奇六仪') + `
      <p>按“戊己庚辛壬癸丁丙乙”的顺序，从${P(S.ju.ju)}放第一个“戊”，${S.ju.yang ? '阳遁按宫数 1→9 顺飞' : '阴遁按宫数 9→1 逆飞'}，九个干填满九宫。</p>
      <p class="mono">${S.di.order.map((o) => o.palace + o.stem).join(' → ')}</p>
      <p class="rule">六仪是六个旬首“甲”的藏身之处：甲子戊、甲戌己、甲申庚、甲午辛、甲辰壬、甲寅癸。乙丙丁是三奇。</p>`;
    if (k === 3) html = h(3, '旬首、值符、值使') + `
      <p>时柱 ${S.pillars.hour} 在 <b>${S.xun.xunName}</b> 旬，甲遁于六仪“${S.xun.xunYi}”。地盘上“${S.xun.xunYi}”在${P(S.xun.xunPalace)}。</p>
      <p>该宫原本的星是<b>值符 · ${S.xun.zhifuStar}</b>，原本的门是<b>值使 · ${S.xun.zhishiDoor}</b>（加下划线的两个）。${S.xun.xunPalace === 5 ? `旬首落中五宫，值符取天禽，值使取寄宫${P(S.ju.ji)}的${S.xun.zhishiDoor}。` : ''}</p>
      <p class="rule">此刻九星、八门都在本宫：蓬1 芮2 冲3 辅4 禽5 心6 柱7 任8 英9；休1 死2 伤3 杜4 开6 惊7 生8 景9。</p>`;
    if (k === 4) html = h(4, '转天盘') + `
      <p>时干是“${S.tian.hourGan}”${S.tian.hourGan === '甲' ? `，甲不入盘，用旬首六仪“${S.tian.leadStem}”代替` : ''}，它在地盘${P(S.tian.targetRaw)}${S.tian.targetRaw === 5 ? '，中五寄' + P(S.ju.ji) : ''}。值符${S.xun.zhifuStar}随之转到<b>${P(S.tian.target)}</b>。</p>
      <p>九星沿外圈顺时针整体转动 <b>${S.tian.shift}</b> 格，每颗星带着原宫的地盘干同行，这就是天盘干。天禽寄${P(S.ju.ji)}，随${QM.STAR_HOME[S.ju.ji]}同行。</p>
      ${S.tian.shift === 0 ? '<p><b>九星未动，是伏吟盘。</b></p>' : S.tian.shift === 4 ? '<p><b>九星转到对宫，是反吟盘。</b></p>' : ''}`;
    if (k === 5) html = h(5, '转人盘') + `
      <p>值使${S.xun.zhishiDoor}从${P(S.xun.xunPalace)}出发，由旬首地支“${S.xun.xunName[1]}”数到时支“${S.pillars.hour[1]}”共 <b>${S.door.stepsN}</b> 步，${S.ju.yang ? '阳遁顺' : '阴遁逆'}宫而行：</p>
      <p class="mono">${S.door.path.join(' → ')}${S.door.doorTargetRaw === 5 ? '（中五寄' + P(S.ju.ji) + '）' : ''}</p>
      <p>值使落<b>${P(S.door.doorTarget)}</b>，其余七门随之转动。</p>`;
    if (k === 6) html = h(6, '排八神') + `
      <p>八神之首“值符”跟随值符星落${P(S.god.start)}，然后${S.god.clockwise ? '阳遁顺时针' : '阴遁逆时针'}依次排：${S.god.names.join('、')}。</p>`;
    if (k === 7) html = h(7, '空亡、驿马与格局') + `
      <p>旬空 ${sm.kong.join('、')}，落${sm.kongPalaces.map(P).join('、')}；驿马在${sm.ma}，落${P(sm.maPalace)}。</p>
      ${C.patterns.length ? `<ul class="pat">${C.patterns.map((pt) => `<li><span class="tag ${pt.kind}">${pt.kind}</span><span><b>${pt.name}</b> ${pt.palace ? P(pt.palace) + '：' : ''}${pt.why}</span></li>`).join('')}</ul>` : '<p>未识别到常见特殊格局。</p>'}`;
    if (k === 8) html = h(8, '古籍克应') + keyingHtml(C);
    return html;
  }

function keyingHtml(C) {
  const K = C.keying;
  if (!K) return '<p>古籍克应已在排盘设置中关闭。</p>';
  const ji = (x) => (x ? '<small>（寄）</small>' : '');
  const blocks = K.palaces.map((k) => {
    const rows = [];
    for (const g of k.gan) rows.push(`<li><span class="tag">十干</span><span>天盘${g.sky}${ji(g.skyJi)}加地盘${g.earth}${ji(g.earthJi)} <b>${g.name}</b>${g.aka ? `<small>（${esc(g.aka)}）</small>` : ''}：${esc(g.text)}<br><small>原书结语：${esc(g.verdict)}${g.bj ? `；宝鉴：${esc(g.bj)}` : ''}</small>${g.alt ? `<br><small>${esc(g.alt)}</small>` : ''}</span></li>`);
    for (const v of k.overlay) rows.push(`<li><span class="tag">真甲</span><span>本旬甲遁于${K.xunYi}，为值符真甲：天盘${v.sky}加地盘${v.earth}，叠加 <b>${v.name}</b></span></li>`);
    if (k.door) { const d = k.door; rows.push(`<li><span class="tag">八门</span><span>${d.door}加${d.home} ${d.text ? esc(d.text) : `<b>缺文</b> <small>${esc(d.missing)}</small>`}<br><small>宝鉴：${d.gua}卦；门宫：${d.rel === '比和' ? '比和' : '门' + d.rel}（${d.relDef}）${d.rel === '迫' ? (d.ji ? '，吉门被迫' : '，凶门被迫') : ''}</small></span></li>`); }
    for (const st of k.stars) rows.push(`<li><span class="tag">九星</span><span>${st.star}（${st.wx}，${st.luck}）按${st.stateBy}为<b>${st.state}</b>；${st.rel}，${st.relText}</span></li>`);
    if (k.god) rows.push(`<li><span class="tag">八神</span><span>${k.god.name}（${k.god.luck}）<small>${esc(k.god.text || '')}</small></span></li>`);
    return `<h3>${QM.PALACE[k.p].gua}${k.p}宫</h3><ul class="pat ky">${rows.join('')}</ul>`;
  });
  return `<p>按宫查表，只录古籍条文与出处，不作综合判断。各书说法不同的地方并列给出。</p>${blocks.join('')}
    <p class="rule">出处：十干克应据《奇门遁甲秘笈大全》卷二、《奇门遁甲统宗》卷四，异名据《御定奇门宝鉴》；八门克应据《秘笈》卷四、卷五《八门静应》与《统宗》卷四，卦名据《宝鉴》卷三；门迫、制、和、义据《烟波钓叟歌》及古注；九星旺衰据《烟波钓叟歌》与《宝鉴》卷一《释气应》（${K.opts.starState === 'palace' ? '本盘按落宫，是近人用法' : '本盘按月令'}）；星宫生克据《统宗》卷七《主客论》；八神据《秘笈》卷六。</p>`;
}

export function caption(C, k, question) {
    const S = C.steps, sm = C.summary;
    const step = k >= 0 ? `<span class="step">${k + 1} / ${STAGES.length} · ${STAGES[k]}</span>` : '<span class="step">起局</span>';
    const t = [
      `四柱 <b>${S.pillars.year} ${S.pillars.month} ${S.pillars.day} ${S.pillars.hour}</b>，太阳行至${S.pillars.term}`,
      `${S.ju.method === 'zhirun' ? S.ju.juTerm + '（' + S.ju.status + '）' : S.ju.method === 'maoshan' ? '交节第 ' + (Math.floor(S.ju.days) + 1) + ' 天' : '符头' + S.ju.futou}为${S.ju.yuan}，得 <b>${S.ju.dun}${cn(S.ju.ju)}局</b>`,
      `三奇六仪自${P(S.ju.ju)}起，${S.ju.yang ? '顺' : '逆'}布九宫`,
      `时在${S.xun.xunName}旬，甲遁于${S.xun.xunYi}：值符 <b>${S.xun.zhifuStar}</b>，值使 <b>${S.xun.zhishiDoor}</b>`,
      `天盘干浮起，天禽寄${QM.PALACE[S.ju.ji].gua}；值符随时干${S.tian.hourGan === '甲' ? S.tian.leadStem : S.tian.hourGan}转至 <b>${P(S.tian.target)}</b>`,
      `值使${S.xun.zhishiDoor}行 ${S.door.stepsN} 步，落 <b>${P(S.door.doorTarget)}</b>，八门随转`,
      `八神随值符，自${P(S.god.start)}${S.god.clockwise ? '顺' : '逆'}排八宫`,
      `旬空${sm.kong.join('')}，驿马在${sm.ma}${C.patterns.length ? `，见${C.patterns.length}处格局` : ''}`,
      C.keying ? `逐宫查十干、八门克应：${C.keying.palaces.slice(0, 3).map((x) => x.gan[0] ? `${QM.PALACE[x.p].gua}宫<b>${x.gan[0].name}</b>` : '').filter(Boolean).join('、')}……` : '古籍克应已在设置中关闭',
    ];
    return step + `<span>${k >= 0 ? t[k] : esc(C.input.text) + (question ? '　问：' + esc(question) : '')}</span>`;
  }

export function meta(C, k) {
    const S = C.steps; const parts = [];
    if (k >= 0) parts.push(`<span><b>${S.pillars.year} ${S.pillars.month} ${S.pillars.day} ${S.pillars.hour}</b></span>`);
    if (k >= 1) parts.push(`<span>${S.pillars.term} · <b>${S.ju.dun}${cn(S.ju.ju)}局</b> ${S.ju.yuan}</span>`);
    if (k >= 3) parts.push(`<span>值符 <b>${S.xun.zhifuStar}</b> · 值使 <b>${S.xun.zhishiDoor}</b></span>`);
    return parts.join('');
  }

/**
 * 塔罗牌桌：洗牌、切牌、展成扇形、亲手抽牌、布阵、翻牌。
 * mount() 在宿主元素里建牌桌，返回 staticState(k)、animate(k, done)、seal(on) 供外壳调度。
 */
import { faceSvg, backSvg } from './art.js';
import { pick, autoPick, drawn } from './core.js';
import { esc } from '../../ui/anim.js';
import './board.css';

export const STAGES = ['洗牌', '切牌', '展牌', '抽牌', '布阵', '翻牌'];
export const moveMs = 450;
export const legend = '<span>牌面为本站自绘；正位朝上，逆位倒置</span>';

const N = 78;
// 牌阵位置：x, y（牌中心，百分比），旋转角度
const LAYOUT = {
  one: { w: 26, pos: [[50, 46, 0]] },
  three: { w: 23, pos: [[20, 46, 0], [50, 46, 0], [80, 46, 0]] },
  celtic: { w: 12.6, pos: [[30, 50, 0], [30, 50, 90], [30, 80, 0], [11, 50, 0], [30, 20, 0], [49, 50, 0], [80, 86, 0], [80, 62, 0], [80, 38, 0], [80, 14, 0]] },
};
const FAN_W = 9; // 扇形中单张牌宽（%）

export function mount(host, C, sched) {
  const { later, setMove, setEase } = sched;
  const L = LAYOUT[C.spreadKey] || LAYOUT.three;
  const need = C.spread.positions.length;
  const cards = C.deck.map((d, i) => `<div class="tc" id="tc${i}" data-i="${i}" role="button" tabindex="-1" aria-label="第 ${i + 1} 张牌">
      <div class="inner"><div class="face back">${backSvg()}</div><div class="face front${d.reversed ? ' rev' : ''}">${faceSvg(d.card)}</div></div></div>`).join('');
  const labels = C.spread.positions.map((p, k) => `<div class="lbl off" id="lb${k}"><b>${k + 1}</b><span class="pn"> ${p.name}</span><span class="cn"></span></div>`).join('');
  host.innerHTML = `<div class="tarot sp-${C.spreadKey}"><div class="board" id="board">
      <div class="felt"></div><div class="deck" id="deck">${cards}</div>${labels}
      <div class="count off" id="count"></div>
      <div class="seal off" id="seal" aria-hidden="true">牌成</div></div></div>`;
  const $ = (id) => host.querySelector('#' + id);
  const el = (i) => $('tc' + i);
  const W = (w) => `${w}%`;
  function put(i, x, y, rot = 0, w = FAN_W, z = 0) {
    const e = el(i); e.style.left = x + '%'; e.style.top = y + '%'; e.style.width = W(w);
    e.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`; e.style.zIndex = z;
  }
  const stackPos = (i) => [50 + (i - N / 2) * 0.02, 46 - i * 0.12];
  function stack(hidden = false) { for (let i = 0; i < N; i++) { const [x, y] = stackPos(i); put(i, x, y, 0, 13, i); el(i).classList.toggle('gone', hidden); } }
  // 扇形：78 张沿圆弧铺开
  const SPAN = 40 * Math.PI / 180;
  const fanPos = (i) => { const a = (i / (N - 1) - 0.5) * 2 * SPAN; return [50 + 43 * Math.sin(a) / Math.sin(SPAN), 60 + 20 * (1 - Math.cos(a)) / (1 - Math.cos(SPAN)), a * 180 / Math.PI * 0.9]; };
  function fan() { for (let i = 0; i < N; i++) { const [x, y, r] = fanPos(i); put(i, x, y, r, FAN_W, i); el(i).classList.remove('gone', 'up', 'picked'); } }
  function markPicked() {
    C.picks.forEach((i) => { const [x, y, r] = fanPos(i); el(i).classList.add('picked'); put(i, x, y - 9, r, FAN_W, 200); });
    const c = $('count'); c.textContent = `已抽 ${C.picks.length} / ${need} 张`;
  }
  function layout(faceUp) {
    const picked = new Set(C.picks);
    for (let i = 0; i < N; i++) if (!picked.has(i)) { const [x, y, r] = fanPos(i); put(i, x, y + 40, r, FAN_W, i); el(i).classList.add('gone'); }
    C.picks.forEach((i, k) => { const [x, y, r] = L.pos[k]; put(i, x, y, r, L.w, 300 + k); el(i).classList.remove('gone', 'picked'); el(i).classList.toggle('up', !!faceUp); });
  }
  function placeLabel(k) {
    const lb = $('lb' + k); const [x, y, r] = L.pos[k]; const w = L.w, h = L.w / 0.6;
    if (C.spreadKey === 'celtic') {
      lb.style.left = (r ? x + h / 2 - 1.5 : x - w / 2 + 1.5) + '%';
      lb.style.top = (r ? y - w / 2 - 1 : y - h / 2 - 1) + '%';
    } else { lb.style.left = x + '%'; lb.style.top = (y + h / 2 + 2) + '%'; }
    return lb;
  }
  function labelsOn(on) {
    drawn(C).forEach((d, k) => {
      const lb = placeLabel(k);
      lb.querySelector('.cn').textContent = on ? `${d.card.name}${d.reversed ? '（逆）' : ''}` : '';
      lb.classList.toggle('off', !on);
    });
  }
  function setPickMode(on) { $('board').classList.toggle('picking', on); $('count').classList.toggle('off', !on); }

  function staticState(k) {
    setPickMode(false);
    for (let i = 0; i < N; i++) el(i).classList.remove('up', 'picked');
    C.spread.positions.forEach((_, j) => $('lb' + j).classList.add('off'));
    if (k < 0) { stack(true); return; }
    if (k <= 1) { stack(false); return; }
    if (k === 2) { fan(); return; }
    if (k === 3) { fan(); markPicked(); return; }
    if (k >= 4 && C.picks.length < need) { C.autoFilled = true; autoPick(C); }
    if (k === 4) { layout(false); labelsOn(false); return; }
    layout(true); labelsOn(true);
    $('board').classList.add('done');
  }

  function animate(k, done) {
    if (k === 0) {
      stack(false); setMove(260); setEase('ease-in-out');
      const rounds = 4;
      for (let r = 0; r < rounds; r++) {
        later(400 + r * 700, () => { for (let i = 0; i < N; i++) { const side = (i + r) % 2 ? 1 : -1; put(i, 50 + side * (8 + (i * 37 % 13)), 46 + ((i * 53 % 17) - 8) * 0.6, side * ((i * 29 % 23) - 11), 13, (i * 7 + r * 13) % N); } });
        later(400 + r * 700 + 350, () => stack(false));
      }
      later(400 + rounds * 700 + 400, done); return;
    }
    if (k === 1) {
      setMove(420);
      const [a, b] = C.cut, xs = [24, 50, 76];
      later(300, () => { for (let i = 0; i < N; i++) { const p = i < a ? 0 : i < b ? 1 : 2; put(i, xs[p], 46 - (i % 26) * 0.12, 0, 13, i); } });
      later(1400, () => { // 按切牌顺序叠回
        C.cutOrder.forEach((p, n) => later(n * 450, () => { for (let i = 0; i < N; i++) { const q = i < a ? 0 : i < b ? 1 : 2; if (q === p) { const [x, y] = stackPos(i); put(i, x, y, 0, 13, 100 * n + i); } } }));
      });
      later(1400 + 450 * 3 + 600, () => { stack(false); done(); }); return;
    }
    if (k === 2) {
      setMove(380); setEase('ease-out');
      for (let i = 0; i < N; i++) later(i * 18, () => { const [x, y, r] = fanPos(i); put(i, x, y, r, FAN_W, i); });
      later(N * 18 + 600, () => { setEase('ease-in-out'); done(); }); return;
    }
    if (k === 3) {
      fan(); setPickMode(true); markPicked(); setMove(260);
      if (C.picks.length >= need) { later(900, () => { setPickMode(false); done(); }); return; }
      const deck = $('deck');
      const onPick = (e) => {
        const t = e.target.closest('.tc'); if (!t) return;
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (pick(C, +t.dataset.i)) markPicked();
        if (C.picks.length >= need) { deck.removeEventListener('click', onPick); deck.removeEventListener('keydown', onPick); later(700, () => { setPickMode(false); done(); }); }
      };
      deck.addEventListener('click', onPick); deck.addEventListener('keydown', onPick);
      for (let i = 0; i < N; i++) el(i).tabIndex = 0;
      return;
    }
    if (k === 4) {
      setMove(650);
      if (C.picks.length < need) { C.autoFilled = true; autoPick(C); }
      const picked = new Set(C.picks);
      later(200, () => { for (let i = 0; i < N; i++) if (!picked.has(i)) { const [x, y, r] = fanPos(i); put(i, x, y + 40, r, FAN_W, i); el(i).classList.add('gone'); } });
      C.picks.forEach((i, k2) => later(700 + 420 * k2, () => { const [x, y, r] = L.pos[k2]; put(i, x, y, r, L.w, 300 + k2); el(i).classList.remove('picked'); }));
      later(700 + 420 * need + 700, done); return;
    }
    if (k === 5) {
      C.picks.forEach((i, k2) => later(300 + 700 * k2, () => { el(i).classList.add('up'); later(450, () => { const d = drawn(C)[k2]; const lb = placeLabel(k2); lb.querySelector('.cn').textContent = `${d.card.name}${d.reversed ? '（逆）' : ''}`; lb.classList.remove('off'); }); }));
      later(300 + 700 * need + 700, () => { $('board').classList.add('done'); done(); }); return;
    }
  }

  return { staticState: (k) => { $('board').classList.remove('done'); staticState(k); }, animate, seal: (on) => $('seal').classList.toggle('off', !on) };
}

export function caption(C, k, question) {
  const need = C.spread.positions.length;
  const step = k >= 0 ? `<span class="step">${k + 1} / 6 · ${STAGES[k]}</span>` : '<span class="step">抽牌</span>';
  const t = [
    '洗牌：七十八张牌充分打乱，正逆位也在此时确定',
    '切牌：分成三叠，再按随机顺序叠回',
    '牌背朝上，展成扇形',
    `心里想着所问之事，凭直觉点选 <b>${need}</b> 张牌`,
    `按「${C.spread.name}」依次摆放`,
    '依次翻开',
  ];
  return step + `<span>${k >= 0 ? t[k] : (question ? '问：' + esc(question) : '心中默念所问之事')}</span>`;
}

export function explain(C, k) {
  const h = (no, t) => `<h2><span class="no">${no + 1}/6</span>${t}</h2>`;
  if (k === 0) return h(0, '洗牌') + '<p>七十八张牌用浏览器的加密级随机数做 Fisher–Yates 洗牌，每种排列出现的机会均等；开启逆位时，每张牌正逆各占一半。</p>';
  if (k === 1) return h(1, '切牌') + `<p>牌堆在第 ${C.cut[0]} 张和第 ${C.cut[1]} 张处分成三叠，再以 ${C.cutOrder.map((i) => '左中右'[i]).join('、')} 的顺序叠回。</p>`;
  if (k === 2) return h(2, '展牌') + '<p>牌背朝上铺成扇形，七十八张都可以选。</p>';
  if (k === 3) return h(3, '抽牌') + `<p>凭直觉点选 ${C.spread.positions.length} 张。${C.autoFilled ? '这次有部分牌是跳过后由程序随机补齐的。' : ''}</p>`;
  if (k === 4) return h(4, '布阵') + `<p>「${C.spread.name}」：</p><ul>${C.spread.positions.map((p, i) => `<li>${i + 1}. ${p.name}：${p.means}</li>`).join('')}</ul>`;
  if (k === 5) return h(5, '翻牌') + `<ul>${drawn(C).map((d) => `<li><b>${d.no}. ${d.pos.name}</b>：${d.card.name}${d.reversed ? '（逆位）' : '（正位）'}，${d.reversed ? d.card.rev : d.card.up}</li>`).join('')}</ul><p class="rule">关键词只是提示，不是完整释义。</p>`;
  return '';
}

export function meta(C, k) {
  return `<span><b>${C.spread.name}</b></span><span>${C.opts.reversed ? '含逆位' : '不含逆位'}</span>${k >= 3 ? `<span>已抽 <b>${Math.min(C.picks.length, C.spread.positions.length)}</b> / ${C.spread.positions.length}</span>` : ''}`;
}

/**
 * 小六壬掐指盘：食指、中指、无名指六个指节，拇指逐节掐数。
 * mount() 在宿主元素里建盘，返回 staticState(k)、animate(k, done)、seal(on) 供外壳调度。
 */
import { SIX } from './core.js';
import { esc } from '../../ui/anim.js';
import './board.css';

export const STAGES = ['农历', '起月', '起日', '起时', '断课'];
export const moveMs = 140;
export const legend = '<span>大安 → 留连 → 速喜 → 赤口 → 小吉 → 空亡，顺时针循环</span>';

// 六个指节的位置（百分比）：大安食指根、留连食指尖、速喜中指尖、赤口无名指尖、小吉无名指根、空亡中指根
const JOINT = [[34, 62], [34, 30], [50, 23], [66, 30], [66, 62], [50, 66]];

function handSvg() {
  const finger = (x, top) => `<rect x="${x - 21}" y="${top}" width="42" height="${222 - top}" rx="21" class="fg"/>`;
  return `<svg viewBox="0 0 300 300" class="hand" aria-hidden="true">
    <path d="M60 205 Q60 300 150 300 Q240 300 240 205 Z" class="palm"/>
    ${finger(102, 52)}${finger(150, 30)}${finger(198, 52)}
    <path d="M60 230 Q24 210 30 168 Q34 150 52 160 Q66 168 70 200" class="fg thumb"/>
    <path d="M84 135 L120 135 M132 125 L168 125 M180 135 L216 135" class="crease"/>
    <text x="102" y="292" text-anchor="middle" class="fn">食指</text><text x="150" y="292" text-anchor="middle" class="fn">中指</text><text x="198" y="292" text-anchor="middle" class="fn">无名指</text>
  </svg>`;
}

export function mount(host, C, sched) {
  const { later, setMove } = sched;
  const joints = SIX.map((s, i) => `<div class="jt" id="jt${i}" style="left:${JOINT[i][0]}%;top:${JOINT[i][1]}%"><b>${s.name}</b><span>${s.god}</span></div>`).join('');
  const marks = C.segs.map((s, i) => `<div class="mk off" id="mk${i}">${['月', '日', '时'][i]}</div>`).join('');
  host.innerHTML = `<div class="xl"><div class="board" id="board">
      ${handSvg()}${joints}${marks}
      <div class="tip off" id="tip"><span id="tipN">1</span></div>
      <div class="cal off" id="cal"><span>农历</span><b>${C.lunar.yearGz}年 ${C.lunar.monthName}${C.lunar.dayName}</b><span>${C.hourZhi}时</span></div>
      <div class="res off" id="res"><b>${C.result.name}</b><span>${C.result.god} · ${C.result.wx} · ${C.result.luck}</span><em>${C.result.hint}</em></div>
      <div class="seal off" id="seal" aria-hidden="true">课成</div></div></div>`;
  const $ = (id) => host.querySelector('#' + id);
  const at = (el, i, dy = 0) => { el.style.left = JOINT[i][0] + '%'; el.style.top = (JOINT[i][1] + dy) + '%'; };
  const markPos = (k) => { const m = $('mk' + k); at(m, C.segs[k].to, 0); m.style.transform = `translate(${-50 + (k - 1) * 70}%, 120%)`; };
  const hl = (i, on = true) => $('jt' + i).classList.toggle('hl', on);

  function staticState(k) {
    $('board').classList.remove('done');
    host.querySelectorAll('.jt').forEach((j) => j.classList.remove('hl', 'win'));
    $('cal').classList.toggle('off', k !== 0);
    $('tip').classList.add('off');
    C.segs.forEach((s, i) => { markPos(i); $('mk' + i).classList.toggle('off', !(k >= i + 1)); });
    $('res').classList.toggle('off', k < 4);
    if (k >= 4) { $('jt' + C.resultIdx).classList.add('win'); $('board').classList.add('done'); }
  }

  function count(seg, done) {
    const tip = $('tip');
    setMove(0); at(tip, seg.from, -9); $('tipN').textContent = 1; void tip.offsetWidth;
    tip.classList.remove('off'); hl(seg.from);
    const step = Math.max(120, Math.min(420, 4200 / seg.v));
    setMove(step * 0.8);
    seg.path.forEach((p, n) => {
      if (n === 0) return;
      later(step * n, () => { host.querySelectorAll('.jt').forEach((j) => j.classList.remove('hl')); hl(p); at(tip, p, -9); $('tipN').textContent = n + 1; });
    });
    later(step * seg.v + 300, done);
  }

  function animate(k, done) {
    if (k === 0) { later(200, () => $('cal').classList.remove('off')); later(2400, done); return; }
    if (k >= 1 && k <= 3) {
      $('cal').classList.add('off');
      const seg = C.segs[k - 1];
      later(300, () => count(seg, () => { markPos(k - 1); $('mk' + (k - 1)).classList.remove('off'); later(500, done); }));
      return;
    }
    if (k === 4) {
      $('tip').classList.add('off');
      later(300, () => $('jt' + C.resultIdx).classList.add('win'));
      later(900, () => $('res').classList.remove('off'));
      later(1800, () => { $('board').classList.add('done'); done(); });
    }
  }
  return { staticState: (k) => staticState(Math.max(-1, k)), animate, seal: (on) => $('seal').classList.toggle('off', !on) };
}

export function caption(C, k, question) {
  const step = k >= 0 ? `<span class="step">${k + 1} / 5 · ${STAGES[k]}</span>` : '<span class="step">起课</span>';
  const s = C.segs, num = C.opts.method === 'num';
  const t = [
    `农历 <b>${C.lunar.yearGz}年${C.lunar.monthName}${C.lunar.dayName}</b>，${C.hourZhi}时`,
    `从大安起，${num ? '数第一数' : '数月'} ${s[0].v}，落 <b>${SIX[s[0].to].name}</b>`,
    `从${SIX[s[1].from].name}起，${num ? '数第二数' : '数日'} ${s[1].v}，落 <b>${SIX[s[1].to].name}</b>`,
    `从${SIX[s[2].from].name}起，${num ? '数第三数' : '数时'} ${s[2].v}，落 <b>${SIX[s[2].to].name}</b>`,
    `课成：<b>${C.result.name}</b>（${C.result.luck}）`,
  ];
  return step + `<span>${k >= 0 ? t[k] : esc(C.input.text) + (question ? '　问：' + esc(question) : '')}</span>`;
}

export function explain(C, k) {
  const h = (no, t) => `<h2><span class="no">${no + 1}/5</span>${t}</h2>`;
  const s = C.segs, num = C.opts.method === 'num';
  if (k === 0) return h(0, '农历') + `<p>小六壬用农历月、日和时辰：${C.input.text} 为农历 <b>${C.lunar.yearGz}年${C.lunar.monthName}${C.lunar.dayName}</b>，${C.hourZhi}时（子时为一，亥时为十二）。${C.opts.dayChange === 23 ? '23 点后按次日计。' : ''}</p>`;
  if (k >= 1 && k <= 3) {
    const g = s[k - 1];
    return h(k, STAGES[k]) + `<p>从${SIX[g.from].name}起数，起点算一，${num ? '数到第' : '数到'}${g.v}${g.note ? '（' + g.note + '）' : ''}，落在 <b>${SIX[g.to].name}</b>。</p><p class="mono">${g.path.map((p) => SIX[p].name).join(' → ')}</p>`;
  }
  if (k === 4) return h(4, '断课') + `<p>最后落在 <b>${C.result.name}</b>：六神${C.result.god}，五行${C.result.wx}，${C.result.luck}。${C.result.hint}。</p><ul>${SIX.map((x) => `<li>${x.name}（${x.god}）：${x.hint}</li>`).join('')}</ul><p class="rule">六神、五行为通行说法；提示为本站自撰的简短概括。</p>`;
  return '';
}

export function meta(C, k) {
  const p = [`<span>${C.opts.method === 'num' ? '报数起课' : '时间起课'}</span>`];
  C.segs.forEach((s, i) => { if (k >= i + 1) p.push(`<span>${['月', '日', '时'][i]}位 <b>${SIX[s.to].name}</b></span>`); });
  return p.join('');
}

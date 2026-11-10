/**
 * 梅花易数卦盘：上方取数，中央本卦，左右互卦、变卦；各阶段动画与讲解。
 * mount() 在宿主元素里建盘，返回 staticState(k)、animate(k, done)、seal(on) 供外壳调度。
 */
import { TRIGRAMS, LINE_NAMES } from './core.js';
import { esc } from '../../ui/anim.js';
import './board.css';

export const STAGES = ['农历', '取数', '上卦', '下卦', '动爻', '互卦', '变卦', '体用'];
export const moveMs = 300;
export const legend = '<span>— 阳爻　- - 阴爻　● 动爻</span><span>先天八卦数：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8</span>';

const hexHtml = (id, hx, cls = '') => `<div class="hex ${cls}" id="${id}">${[5, 4, 3, 2, 1, 0].map((i) => `<div class="ln ${hx.lines[i] ? 'yang' : 'yin'} pend" data-i="${i}"><i></i><i></i></div>`).join('')}</div>`;
const moonSvg = (age, len) => {
  // 月相：以亮面比例近似
  const f = age / len, lit = 1 - Math.abs(f - 0.5) * 2; const waxing = f < 0.5;
  const rx = Math.abs(1 - 2 * lit) * 20;
  const sweepOuter = waxing ? 1 : 0, sweepInner = lit > 0.5 ? (waxing ? 1 : 0) : (waxing ? 0 : 1);
  return `<svg viewBox="-24 -24 48 48" class="moon"><circle r="20" class="dark"/><path class="lit" d="M0 -20 A20 20 0 0 ${sweepOuter} 0 20 A${rx.toFixed(2)} 20 0 0 ${sweepInner} 0 -20 Z"/></svg>`;
};

export function mount(host, C, sched) {
  const { later } = sched;
  const N = C.steps.nums, T = C.steps.tiyong, Lu = C.steps.calendar.lunar;
  const tiles = N.list.map((x, i) => `<div class="tile pend" id="tile${i}"><span class="k">${x.k}</span><b>${x.v}</b><span class="n">${x.note || ''}</span></div>`).join('');
  const age = C.steps.calendar.lunar.day - 1;
  host.innerHTML = `<div class="mh"><div class="board" id="board">
    <div class="top"><div class="tiles" id="tiles">${tiles}</div><div class="calc" id="calc"></div></div>
    <div class="cal pend" id="cal">${moonSvg(age, Lu.monthDays)}<div class="t"><span>农历</span><b>${Lu.yearGz}年 ${Lu.monthName}${Lu.dayName}</b><span>${C.steps.calendar.hourZhi}时</span></div></div>
    <div class="main"><div class="hxside pend" id="huBox"><span class="cap">互卦</span>${hexHtml('hx-hu', C.hu, 'small')}<span class="nm">${C.hu.name}</span></div>
      <div class="center"><span class="cap">本卦</span><div class="benwrap">${hexHtml('hx-ben', C.ben)}<span class="tag up pend" id="tagUp"></span><span class="tag low pend" id="tagLow"></span><span class="tri up pend" id="triUp">${TRIGRAMS[C.ben.up].sym} ${TRIGRAMS[C.ben.up].name}</span><span class="tri low pend" id="triLow">${TRIGRAMS[C.ben.low].sym} ${TRIGRAMS[C.ben.low].name}</span></div><span class="nm pend" id="benName">${C.ben.name}</span></div>
      <div class="hxside pend" id="bianBox"><span class="cap">变卦</span>${hexHtml('hx-bian', C.bian, 'small')}<span class="nm">${C.bian.name}</span></div></div>
    <div class="rel pend" id="rel"></div>
    <div class="seal off" id="seal" aria-hidden="true">卦成</div></div></div>`;
  const $ = (id) => host.querySelector('#' + id);
  const show = (el, on = true) => { if (typeof el === 'string') el = $(el); el.classList.toggle('pend', !on); };
  const lines = (hid) => [...$(hid).querySelectorAll('.ln')];
  const line = (hid, i) => $(hid).querySelector(`.ln[data-i="${i}"]`);
  const calc = (html) => { $('calc').innerHTML = html; };
  const tagText = () => { $('tagUp').textContent = T.yongIsLow ? '体' : '用'; $('tagLow').textContent = T.yongIsLow ? '用' : '体'; };

  function staticState(k) {
    $('board').classList.remove('done');
    host.querySelectorAll('.ln').forEach((l) => l.classList.remove('hot', 'mv'));
    show('cal', k === 0);
    N.list.forEach((_, i) => show('tile' + i, k >= 1));
    calc(k >= 1 && k <= 4 ? calcHtml(Math.min(k, 4)) : '');
    lines('hx-ben').forEach((l) => show(l, (+l.dataset.i >= 3 && k >= 2) || (+l.dataset.i < 3 && k >= 3)));
    show('triUp', k >= 2); show('triLow', k >= 3); show('benName', k >= 3);
    if (k >= 4) line('hx-ben', C.moving - 1).classList.add('mv');
    show('huBox', k >= 5); lines('hx-hu').forEach((l) => show(l, k >= 5));
    show('bianBox', k >= 6); lines('hx-bian').forEach((l) => show(l, k >= 6));
    if (k >= 6) line('hx-bian', C.moving - 1).classList.add('mv');
    tagText(); show('tagUp', k >= 7); show('tagLow', k >= 7);
    $('rel').innerHTML = relHtml(); show('rel', k >= 7);
    if (k === 7) $('board').classList.add('done');
  }
  function calcHtml(k) {
    if (k === 1) return `<span>${N.list.map((x) => x.v).join(' + ')}</span>`;
    if (k === 2) return `上卦：<b>${N.upSum}</b> ÷ 8 余 ${N.up % 8} → <b>${TRIGRAMS[N.up].name}</b>`;
    if (k === 3) return `下卦：<b>${N.lowSum}</b> ÷ 8 余 ${N.low % 8} → <b>${TRIGRAMS[N.low].name}</b>`;
    return `动爻：<b>${N.moveSum}</b> ÷ 6 余 ${N.moving % 6} → <b>${LINE_NAMES[C.moving - 1]}</b>`;
  }
  function relHtml() {
    return `体 ${TRIGRAMS[T.ti].name}${T.tiWx}（${T.tiWs}）　用 ${TRIGRAMS[T.yong].name}${T.yongWx}（${T.yongWs}）　<b>${T.rel}</b>`;
  }

  function animate(k, done) {
    if (k === 0) { later(200, () => show('cal')); later(2400, done); return; }
    if (k === 1) {
      show('cal', false);
      N.list.forEach((_, i) => later(300 + 420 * i, () => show('tile' + i)));
      later(300 + 420 * N.list.length + 200, () => calc(calcHtml(1)));
      later(300 + 420 * N.list.length + 1200, done); return;
    }
    if (k === 2) {
      calc(calcHtml(2));
      [3, 4, 5].forEach((i, n) => later(700 + 380 * n, () => show(line('hx-ben', i))));
      later(700 + 380 * 3 + 200, () => show('triUp'));
      later(700 + 380 * 3 + 900, done); return;
    }
    if (k === 3) {
      calc(calcHtml(3));
      [0, 1, 2].forEach((i, n) => later(700 + 380 * n, () => show(line('hx-ben', i))));
      later(700 + 380 * 3 + 200, () => { show('triLow'); show('benName'); });
      later(700 + 380 * 3 + 1000, done); return;
    }
    if (k === 4) {
      calc(calcHtml(4));
      // 从初爻数到动爻
      for (let i = 0; i < C.moving; i++) later(500 + 300 * i, () => { lines('hx-ben').forEach((l) => l.classList.remove('hot')); line('hx-ben', i).classList.add('hot'); });
      later(500 + 300 * C.moving + 200, () => { line('hx-ben', C.moving - 1).classList.remove('hot'); line('hx-ben', C.moving - 1).classList.add('mv'); });
      later(500 + 300 * C.moving + 1200, done); return;
    }
    if (k === 5) {
      calc('');
      later(200, () => [1, 2, 3].forEach((i) => line('hx-ben', i).classList.add('hot')));
      later(900, () => { show('huBox'); [0, 1, 2].forEach((i, n) => later(250 * n, () => show(line('hx-hu', i)))); });
      later(1900, () => { [1, 2, 3].forEach((i) => line('hx-ben', i).classList.remove('hot')); [2, 3, 4].forEach((i) => line('hx-ben', i).classList.add('hot')); });
      later(2500, () => [3, 4, 5].forEach((i, n) => later(250 * n, () => show(line('hx-hu', i)))));
      later(3500, () => { [2, 3, 4].forEach((i) => line('hx-ben', i).classList.remove('hot')); done(); }); return;
    }
    if (k === 6) {
      later(200, () => { show('bianBox'); lines('hx-bian').forEach((l) => { if (+l.dataset.i !== C.moving - 1) show(l); }); });
      later(1000, () => { const l = line('hx-bian', C.moving - 1); show(l); l.classList.add('mv', 'flip'); });
      later(2200, done); return;
    }
    if (k === 7) {
      tagText();
      later(200, () => show(T.yongIsLow ? 'tagUp' : 'tagLow'));
      later(700, () => show(T.yongIsLow ? 'tagLow' : 'tagUp'));
      later(1300, () => show('rel'));
      later(2200, () => { $('board').classList.add('done'); done(); }); return;
    }
  }
  return { staticState: (k) => staticState(Math.max(-1, k)), animate, seal: (on) => $('seal').classList.toggle('off', !on) };
}

export function caption(C, k, question) {
  const N = C.steps.nums, T = C.steps.tiyong, Lu = C.steps.calendar.lunar, time = C.opts.method === 'time';
  const step = k >= 0 ? `<span class="step">${k + 1} / 8 · ${STAGES[k]}</span>` : '<span class="step">起卦</span>';
  const t = [
    time ? `换算农历：<b>${Lu.yearGz}年${Lu.monthName}${Lu.dayName}</b>，${C.steps.calendar.hourZhi}时` : `农历 ${Lu.yearGz}年${Lu.monthName}${Lu.dayName}，${C.steps.calendar.hourZhi}时`,
    `取数：${N.list.map((x) => x.k + ' ' + x.v).join('，')}`,
    `${N.upSum} 除以 8，余数得上卦 <b>${TRIGRAMS[N.up].name}</b>`,
    `${N.lowSum} 除以 8，余数得下卦 <b>${TRIGRAMS[N.low].name}</b>，本卦 <b>${C.ben.name}</b>`,
    `${N.moveSum} 除以 6，<b>${LINE_NAMES[C.moving - 1]}</b>动`,
    `取二至四爻、三至五爻，得互卦 <b>${C.hu.name}</b>`,
    `动爻阴阳互变，得变卦 <b>${C.bian.name}</b>`,
    `动爻所在为用，另一卦为体：<b>${T.rel}</b>`,
  ];
  return step + `<span>${k >= 0 ? t[k] : esc(C.input.text) + (question ? '　问：' + esc(question) : '')}</span>`;
}

export function explain(C, k) {
  const N = C.steps.nums, T = C.steps.tiyong, Lu = C.steps.calendar.lunar, o = C.opts;
  const h = (no, t) => `<h2><span class="no">${no + 1}/8</span>${t}</h2>`;
  if (k === 0) return h(0, '农历') + `<p>梅花易数的时间起卦用农历：${C.input.text} 为农历 <b>${Lu.yearGz}年${Lu.monthName}${Lu.dayName}</b>，${C.steps.calendar.hourZhi}时。${o.dayChange === 23 ? '23 点后按次日计。' : ''}</p><p class="rule">农历按天文合朔定初一，冬至所在月为十一月，无中气之月置闰。</p>`;
  if (k === 1) return h(1, '取数') + (o.method === 'time' ? `<p>年取年支之数（子一……亥十二），月取农历月数，日取农历日数，时取时支之数：</p>` : `<p>${o.method === 'two' ? '两数起卦：第一数为上卦，第二数为下卦，两数加时数取动爻。' : '三数起卦：第一数为上卦，第二数为下卦，三数之和取动爻。'}</p>`) + `<ul>${N.list.map((x) => `<li>${x.k}：${x.v}${x.note ? '（' + x.note + '）' : ''}</li>`).join('')}</ul>`;
  if (k === 2) return h(2, '上卦') + `<p>${o.method === 'time' ? '年数、月数、日数相加' : '第一数'}得 ${N.upSum}，除以 8 余 ${N.up % 8}${N.up === 8 ? '（余 0 作 8）' : ''}，按先天数得 <b>${TRIGRAMS[N.up].name}${TRIGRAMS[N.up].sym}</b>。</p><p class="rule">先天八卦数：乾一、兑二、离三、震四、巽五、坎六、艮七、坤八。</p>`;
  if (k === 3) return h(3, '下卦') + `<p>${o.method === 'time' ? '再加时数' : '第二数'}得 ${N.lowSum}，除以 8 余 ${N.low % 8}${N.low === 8 ? '（余 0 作 8）' : ''}，得 <b>${TRIGRAMS[N.low].name}${TRIGRAMS[N.low].sym}</b>。上下相合，本卦为 <b>${C.ben.name}</b>。</p>`;
  if (k === 4) return h(4, '动爻') + `<p>${N.moveSum} 除以 6 余 ${N.moving % 6}${N.moving === 6 ? '（余 0 作 6）' : ''}，从初爻往上数，<b>${LINE_NAMES[C.moving - 1]}</b>为动爻。</p>`;
  if (k === 5) return h(5, '互卦') + `<p>本卦去掉初爻和上爻：二、三、四爻为下卦（${TRIGRAMS[C.hu.low].name}），三、四、五爻为上卦（${TRIGRAMS[C.hu.up].name}），得互卦 <b>${C.hu.name}</b>，看事情的发展过程。</p>`;
  if (k === 6) return h(6, '变卦') + `<p>${LINE_NAMES[C.moving - 1]}阳变阴、阴变阳，得变卦 <b>${C.bian.name}</b>，看事情的结果。</p>`;
  if (k === 7) return h(7, '体用') + `<p>动爻在${T.yongIsLow ? '下卦，下卦为用、上卦为体' : '上卦，上卦为用、下卦为体'}。体卦 ${TRIGRAMS[T.ti].name}（${T.tiWx}），用卦 ${TRIGRAMS[T.yong].name}（${T.yongWx}），<b>${T.rel}</b>。</p><p>${T.monthZhi}月${T.ling}当令：体卦${T.tiWs}，用卦${T.yongWs}。互卦上${TRIGRAMS[C.hu.up].name}${T.huRel[0]}、下${TRIGRAMS[C.hu.low].name}${T.huRel[1]}；变卦用位${T.bianRel}。</p><p class="rule">传统以用生体、体克用、比和为顺，体生用为泄，用克体为逆；旺相休囚死按月令五行。</p>`;
  return '';
}

export function meta(C, k) {
  const parts = [`<span>${C.opts.method === 'time' ? '时间起卦' : C.opts.method === 'two' ? '两数起卦' : '三数起卦'}</span>`];
  if (k >= 3) parts.push(`<span>本卦 <b>${C.ben.name}</b></span>`);
  if (k >= 4) parts.push(`<span>${LINE_NAMES[C.moving - 1]}动</span>`);
  if (k >= 6) parts.push(`<span>变 <b>${C.bian.name}</b></span>`);
  return parts.join('');
}

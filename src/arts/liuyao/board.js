/**
 * 六爻卦盘：上方三枚铜钱（亲手摇六次），下方六爻自下而上成卦，逐步标出世应、纳甲、六亲、六神、变卦、伏神与旬空。
 * mount() 在宿主元素里建盘，返回 staticState(k)、animate(k, done)、seal(on) 供外壳调度。
 */
import { analyze, autoToss, tossCoins, YAO_NAMES, TOSS_NAME } from './core.js';
import { TRIGRAMS } from '../meihua/core.js';
import { esc } from '../../ui/anim.js';
import './board.css';

export const STAGES = ['摇卦', '八宫世应', '纳甲', '六亲', '六神', '变卦伏神', '月建日辰'];
export const moveMs = 300;
export const legend = '<span>○ 老阳动　× 老阴动　背记三、字记二</span><span>六神按日干起于初爻</span>';

const coin = (i) => `<div class="coin" id="coin${i}"><div class="cin"><div class="cf zi"><svg viewBox="-20 -20 40 40"><circle r="18"/><rect x="-5" y="-5" width="10" height="10"/><text y="-9" text-anchor="middle">开</text><text y="15" text-anchor="middle">元</text><text x="-11.5" y="3" text-anchor="middle">宝</text><text x="11.5" y="3" text-anchor="middle">通</text></svg></div><div class="cf bei"><svg viewBox="-20 -20 40 40"><circle r="18"/><rect x="-5" y="-5" width="10" height="10"/><path d="M-9 -10 A12 12 0 0 0 -9 10"/></svg></div></div><span class="cl" id="cl${i}"></span></div>`;

export function mount(host, C, sched) {
  const { later } = sched;
  const rows = [5, 4, 3, 2, 1, 0].map((i) => `<div class="row" id="row${i}">
      <span class="god pend" id="god${i}"></span><span class="fu pend" id="fu${i}"></span>
      <span class="qin pend" id="qin${i}"></span><span class="gz pend" id="gz${i}"></span>
      <span class="bar pend" id="bar${i}"><i></i><i></i></span><span class="sy pend" id="sy${i}"></span><span class="mv pend" id="mv${i}"></span>
      <span class="bian pend" id="bian${i}"><span class="bq"></span><span class="bar"><i></i><i></i></span></span>
      <span class="yn">${YAO_NAMES[i]}</span></div>`).join('');
  host.innerHTML = `<div class="ly"><div class="board" id="board">
      <div class="tosser" id="tosser">${[0, 1, 2].map(coin).join('')}<button type="button" class="shake" id="shake">摇卦</button><span class="tv" id="tv"></span></div>
      <div class="head pend" id="head"><b id="hName"></b><span id="hPal"></span><span id="hBian"></span></div>
      <div class="rows" id="rows">${rows}</div>
      <div class="foot pend" id="foot"></div>
      <div class="seal off" id="seal" aria-hidden="true">卦成</div></div></div>`;
  const $ = (id) => host.querySelector('#' + id);
  const show = (id, on = true) => { const el = typeof id === 'string' ? $(id) : id; if (el) el.classList.toggle('pend', !on); };
  let A = null;

  function drawLine(i) {
    const t = C.tosses[i]; if (!t) return;
    const yang = t.value === 7 || t.value === 9;
    const bar = $('bar' + i); bar.classList.toggle('yang', yang); bar.classList.toggle('yin', !yang); show(bar);
    const mv = $('mv' + i); mv.textContent = t.value === 9 ? '○' : t.value === 6 ? '×' : ''; show(mv, t.value === 6 || t.value === 9);
    $('row' + i).classList.toggle('moving', t.value === 6 || t.value === 9);
  }
  function setCoins(t) {
    [0, 1, 2].forEach((i) => { const c = $('coin' + i); c.classList.toggle('back', t ? !!t.coins?.[i] : false); $('cl' + i).textContent = t && t.coins ? (t.coins[i] ? '背' : '字') : ''; });
    $('tv').textContent = t ? `${t.value} · ${TOSS_NAME[t.value]}` : '';
  }
  function fill() {
    A = analyze(C);
    $('hName').textContent = A.ben.name;
    $('hPal').textContent = `${A.palName}宫 · ${A.gen} · 宫属${A.palWx}`;
    $('hBian').textContent = A.hasMoving ? `之 ${A.bian.name}` : '六爻安静';
    for (const y of A.yaos) {
      $('god' + y.i).textContent = y.god;
      $('qin' + y.i).textContent = y.qin;
      $('gz' + y.i).textContent = y.gz + y.wx;
      $('sy' + y.i).textContent = y.shi ? '世' : y.ying ? '应' : '';
      $('fu' + y.i).textContent = y.fu ? `伏 ${y.fu.qin}${y.fu.gz}` : '';
      const b = $('bian' + y.i);
      if (y.bian) { b.querySelector('.bq').textContent = y.bian.qin + y.bian.gz + y.bian.wx; const bb = b.querySelector('.bar'); bb.classList.toggle('yang', y.bian.yang); bb.classList.toggle('yin', !y.bian.yang); }
      $('gz' + y.i).classList.toggle('kong', y.kong);
    }
    $('foot').innerHTML = `月建 <b>${C.monthZhi}</b>　日辰 <b>${C.dayGz}</b>　旬空 <b>${A.kong.join('')}</b>`;
  }
  function setTosser(mode) { // mode: 'wait' 可点摇 | 'hide' 收起 | 'show' 只显示
    $('tosser').classList.toggle('gone', mode === 'hide');
    $('shake').hidden = mode !== 'wait';
  }

  function staticState(k) {
    $('board').classList.remove('done');
    host.querySelectorAll('.row').forEach((r) => r.classList.remove('hot'));
    if (k < 0) { setTosser('show'); setCoins(null); for (let i = 0; i < 6; i++) { show('bar' + i, false); show('mv' + i, false); } ['god', 'qin', 'gz', 'sy', 'fu', 'bian'].forEach((p) => { for (let i = 0; i < 6; i++) show(p + i, false); }); show('head', false); show('foot', false); return; }
    if (k >= 1 && C.tosses.length < 6) autoToss(C);
    for (let i = 0; i < 6; i++) { if (i < C.tosses.length) drawLine(i); else show('bar' + i, false); }
    setTosser(k >= 1 ? 'hide' : 'show');
    if (C.tosses.length === 6) fill();
    show('head', k >= 1);
    for (let i = 0; i < 6; i++) {
      show('sy' + i, k >= 1 && !!(A && (A.yaos[i].shi || A.yaos[i].ying)));
      show('gz' + i, k >= 2); show('qin' + i, k >= 3); show('god' + i, k >= 4);
      show('bian' + i, k >= 5 && !!(A && A.yaos[i].bian)); show('fu' + i, k >= 5 && !!(A && A.yaos[i].fu));
      $('gz' + i).classList.toggle('kongon', k >= 6);
    }
    show('foot', k >= 6);
    if (k >= 6) $('board').classList.add('done');
  }

  function animate(k, done) {
    if (k === 0) {
      setCoins(null);
      if (C.opts.method === 'time') {
        setTosser('show');
        $('tv').textContent = `上卦 ${C.timeCalc.s1}÷8 → ${TRIGRAMS[C.timeCalc.up].name}　下卦 ${C.timeCalc.s2}÷8 → ${TRIGRAMS[C.timeCalc.low].name}　动爻 ${C.timeCalc.s2}÷6 → ${YAO_NAMES[C.timeCalc.mv - 1]}`;
        for (let i = 0; i < 6; i++) later(500 + 420 * i, () => drawLine(i));
        later(500 + 420 * 6 + 800, done); return;
      }
      setTosser(C.tosses.length < 6 ? 'wait' : 'show');
      for (let i = 0; i < C.tosses.length; i++) drawLine(i);
      if (C.tosses.length >= 6) { later(800, done); return; }
      const btn = $('shake');
      const label = () => { btn.textContent = `摇卦（第 ${C.tosses.length + 1} 次 / 共 6 次）`; };
      label();
      let busy = false;
      const onShake = () => {
        if (busy || C.tosses.length >= 6) return;
        busy = true; btn.disabled = true;
        const t = tossCoins();
        host.querySelectorAll('.coin').forEach((c) => { c.classList.remove('spin'); void c.offsetWidth; c.classList.add('spin'); });
        $('tv').textContent = '';
        later(750, () => {
          C.tosses.push(t); setCoins(t); drawLine(C.tosses.length - 1);
          busy = false; btn.disabled = false;
          if (C.tosses.length >= 6) { btn.removeEventListener('click', onShake); setTosser('show'); later(900, done); } else label();
        });
      };
      btn.addEventListener('click', onShake);
      btn.focus({ preventScroll: true });
      return;
    }
    if (C.tosses.length < 6) autoToss(C);
    if (!A) fill();
    const each = (fn, gap = 220) => [0, 1, 2, 3, 4, 5].forEach((i, n) => later(300 + gap * n, () => fn(i)));
    if (k === 1) { setTosser('hide'); show('head'); later(700, () => { for (let i = 0; i < 6; i++) show('sy' + i, A.yaos[i].shi || A.yaos[i].ying); }); later(1700, done); return; }
    if (k === 2) { each((i) => { $('row' + i).classList.add('hot'); show('gz' + i); later(200, () => $('row' + i).classList.remove('hot')); }); later(300 + 220 * 6 + 600, done); return; }
    if (k === 3) { each((i) => show('qin' + i)); later(300 + 220 * 6 + 600, done); return; }
    if (k === 4) { each((i) => show('god' + i)); later(300 + 220 * 6 + 600, done); return; }
    if (k === 5) {
      let t = 300;
      A.yaos.forEach((y) => { if (y.bian) { later(t, () => { show('bian' + y.i); $('row' + y.i).classList.add('hot'); }); t += 500; } });
      A.yaos.forEach((y) => { if (y.fu) { later(t, () => show('fu' + y.i)); t += 400; } });
      later(t + 600, () => { host.querySelectorAll('.row').forEach((r) => r.classList.remove('hot')); done(); }); return;
    }
    if (k === 6) { later(300, () => show('foot')); later(900, () => { for (let i = 0; i < 6; i++) $('gz' + i).classList.add('kongon'); }); later(1800, () => { $('board').classList.add('done'); done(); }); }
  }
  return { staticState: (k) => staticState(Math.max(-1, k)), animate, seal: (on) => $('seal').classList.toggle('off', !on) };
}

export function caption(C, k, question) {
  const step = k >= 0 ? `<span class="step">${k + 1} / 7 · ${STAGES[k]}</span>` : '<span class="step">起卦</span>';
  if (k < 0) return step + `<span>${esc(C.input.text)}${question ? '　问：' + esc(question) : ''}</span>`;
  if (k === 0) return step + `<span>${C.opts.method === 'time' ? '以起卦时刻取数成卦' : '心里想着所问之事，摇六次铜钱，<b>自下而上</b>成卦'}</span>`;
  const A = C.tosses.length === 6 ? analyze(C) : null;
  const t = A ? [
    '',
    `<b>${A.ben.name}</b>，属${A.palName}宫${A.gen}，世在${YAO_NAMES[A.shi - 1]}，应在${YAO_NAMES[A.ying - 1]}`,
    '按京房纳甲，为六爻配上干支',
    `以${A.palName}宫五行${A.palWx}为我，定六亲`,
    `${A.dayGan}日起${A.yaos[0].god}，自初爻往上排六神`,
    A.hasMoving ? `动爻变出 <b>${A.bian.name}</b>${A.missing.length ? `；缺${A.missing.join('、')}，取伏神` : ''}` : `六爻安静${A.missing.length ? `；缺${A.missing.join('、')}，取伏神` : ''}`,
    `月建${C.monthZhi}，日辰${C.dayGz}，旬空 <b>${A.kong.join('')}</b>`,
  ] : [];
  return step + `<span>${t[k] || ''}</span>`;
}

export function explain(C, k) {
  const h = (no, t) => `<h2><span class="no">${no + 1}/7</span>${t}</h2>`;
  if (k === 0) return h(0, '摇卦') + (C.opts.method === 'time'
    ? `<p>时间起卦：农历${C.timeCalc.lunar.yearGz}年${C.timeCalc.lunar.monthName}${C.timeCalc.lunar.dayName}，年支数 ${C.timeCalc.yn} + 月 ${C.timeCalc.lunar.month} + 日 ${C.timeCalc.lunar.day} = ${C.timeCalc.s1}，除 8 得上卦；再加时数 ${C.timeCalc.hn} 得 ${C.timeCalc.s2}，除 8 得下卦、除 6 得动爻。</p>`
    : `<p>三枚铜钱，背记三、字记二，三钱相加：6 为老阴（×，动），7 为少阳，8 为少阴，9 为老阳（○，动）。共摇六次，第一次为初爻，自下而上。随机数用浏览器的加密级随机源。${C.autoFilled ? '这次有部分爻是跳过后由程序随机补齐的。' : ''}</p>`);
  if (C.tosses.length < 6) return '';
  const A = analyze(C);
  if (k === 1) return h(1, '八宫世应') + `<p>本卦 <b>${A.ben.name}</b>，属${A.palName}宫的${A.gen}卦。八宫从纯卦起，依次变初、二、三、四、五爻为一至五世，再变四爻为游魂、内卦复原为归魂；世爻随之，应爻与世爻隔两位。世在${YAO_NAMES[A.shi - 1]}，应在${YAO_NAMES[A.ying - 1]}。</p>`;
  if (k === 2) return h(2, '纳甲') + `<p>内卦取下卦的内三爻，外卦取上卦的外三爻：</p><ul>${[...A.yaos].reverse().map((y) => `<li>${y.name}：${y.gz}（${y.wx}）</li>`).join('')}</ul><p class="rule">乾内甲子外壬午、坤内乙未外癸丑、震庚子庚午、巽辛丑辛未、坎戊寅戊申、离己卯己酉、艮丙辰丙戌、兑丁巳丁亥。</p>`;
  if (k === 3) return h(3, '六亲') + `<p>以卦宫五行（${A.palName}宫属${A.palWx}）为我：生我者父母，我生者子孙，克我者官鬼，我克者妻财，同我者兄弟。</p>`;
  if (k === 4) return h(4, '六神') + `<p>${A.dayGan}日从${A.yaos[0].god}起于初爻，依次青龙、朱雀、勾陈、螣蛇、白虎、玄武。</p><p class="rule">甲乙起青龙，丙丁起朱雀，戊起勾陈，己起螣蛇，庚辛起白虎，壬癸起玄武。</p>`;
  if (k === 5) return h(5, '变卦与伏神') + `<p>${A.hasMoving ? `动爻阴阳互变，得变卦 <b>${A.bian.name}</b>；变爻的六亲仍以本卦宫五行论。` : '六爻皆静，没有变卦。'}</p><p>${A.missing.length ? `本卦缺${A.missing.join('、')}，从本宫纯卦${TRIGRAMS[A.palace].name}为${TRIGRAMS[A.palace].xiang}的同位爻中取出伏神：${A.yaos.filter((y) => y.fu).map((y) => `${y.name}下伏${y.fu.qin}${y.fu.gz}`).join('，')}。` : '五类六亲俱全，没有伏神。'}</p>`;
  if (k === 6) return h(6, '月建、日辰、旬空') + `<p>月建 ${C.monthZhi}，日辰 ${C.dayGz}，旬空 ${A.kong.join('、')}${A.yaos.some((y) => y.kong) ? `，${A.yaos.filter((y) => y.kong).map((y) => y.name + y.gz).join('、')}逢空` : ''}。用神旺衰看月建、日辰的生克冲合。</p>`;
  return '';
}

export function meta(C, k) {
  const p = [`<span>${C.opts.method === 'time' ? '时间起卦' : '摇钱起卦'}</span>`, `<span>日辰 <b>${C.dayGz}</b></span>`];
  if (k >= 1 && C.tosses.length === 6) { const A = analyze(C); p.push(`<span><b>${A.ben.name}</b>${A.hasMoving && k >= 5 ? ' 之 ' + A.bian.name : ''}</span>`); }
  return p.join('');
}

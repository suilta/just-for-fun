/**
 * 八字命盘：四柱四列（十神、天干、地支、藏干、纳音、日主长生）与下方大运条；各阶段动画脚本与旁白讲解。
 * mount() 在宿主元素里建盘，返回 staticState(k)、animate(k, done)、seal(on) 供外壳调度。
 */
import { JIEQI } from '../../core/calendar.js';
import { esc } from '../../ui/anim.js';
import './board.css';

export const STAGES = ['节气', '年柱月柱', '日柱', '时柱', '十神', '藏干', '纳音长生', '大运'];
export const moveMs = 300;
export const legend = '<span><b class="wx-木">木</b></span><span><b class="wx-火">火</b></span><span><b class="wx-土">土</b></span><span><b class="wx-金">金</b></span><span><b class="wx-水">水</b></span><span>天干上方为十神，地支下方为藏干</span>';

const dialPt = (lon, r) => { const a = lon * Math.PI / 180; return [150 - r * Math.cos(a), 150 - r * Math.sin(a)]; };

export function mount(host, C, sched) {
  const { later, tween, easeInOut } = sched;
  const cols = C.pillars.map((p, k) => `
    <div class="col" id="col${k}">
      <div class="ph">${p.name}</div>
      <div class="ss pend" id="ss${k}">${p.shishen}</div>
      <div class="tg pend wx-${p.ganWx}" id="tg${k}">${p.gan}</div>
      <div class="dz pend wx-${p.zhiWx}" id="dz${k}">${p.zhi}<span class="kong" id="kg${k}" hidden>空</span></div>
      <div class="cg" id="cg${k}">${p.cang.map((x, i) => `<span class="pend" id="cg${k}-${i}"><b class="wx-${gwx(x.gan)}">${x.gan}</b>${x.shishen}</span>`).join('')}</div>
      <div class="ny pend" id="ny${k}">${p.nayin}</div>
      <div class="cs pend" id="cs${k}">${p.cs}</div>
    </div>`).join('');
  const D = C.steps.dayun;
  const yun = D.list.slice(0, 8).map((r, i) => `<div class="yu pend" id="yu${i}"><span class="a">${r.fromAge}岁</span><b>${r.gz}</b><span class="s">${r.shishen}</span><span class="y">${r.fromYear}</span></div>`).join('');
  host.innerHTML = `<div class="bz">
    <div class="board" id="board">
      <div class="cols" id="cols">${cols}</div>
      <svg class="paths" id="paths" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet"></svg>
      <div class="ov" id="ov"></div>
      <div class="seal off" id="seal" aria-hidden="true">盘成</div>
    </div>
    <div class="yun" id="yunbox">
      <div class="qy"><span class="t">起运</span><div class="bar"><span class="fill" id="qyFill"></span></div><span class="v" id="qyText"></span></div>
      <div class="yunlist" id="yunlist">${yun}</div>
    </div>
  </div>`;
  const $ = (id) => host.querySelector('#' + id);
  const all = (sel) => [...host.querySelectorAll(sel)];
  const show = (id, on = true) => { const el = $(id); if (el) el.classList.toggle('pend', !on); };
  const hl = (k, on = true) => $('col' + k).classList.toggle('hl', on);
  const kongIdx = () => C.pillars.map((p, k) => (C.steps.extra.dayKong.includes(p.zhi) && k !== 2 ? k : -1)).filter((k) => k >= 0);

  function setQy(t) {
    $('qyFill').style.width = (t * 100).toFixed(1) + '%';
    const days = D.diffDays * t;
    $('qyText').textContent = t < 1 ? `${days.toFixed(1)} 天` : `${D.diffDays.toFixed(1)} 天 ÷ 3 = ${D.qy.years} 年 ${D.qy.months} 月 ${D.qy.days} 天`;
  }

  function staticState(k) {
    all('.col').forEach((c) => c.classList.remove('hl', 'me'));
    $('board').classList.toggle('dial', k === 0);
    $('paths').innerHTML = ''; $('ov').innerHTML = '';
    if (k === 0) drawDial(C.steps.pillars.sunLon);
    for (let j = 0; j < 4; j++) {
      const at = [1, 1, 2, 3][j];
      show('tg' + j, k >= at); show('dz' + j, k >= at);
      show('ss' + j, k >= 4 || (j === 2 && k >= 2));
      C.pillars[j].cang.forEach((_, i) => show(`cg${j}-${i}`, k >= 5));
      show('ny' + j, k >= 6); show('cs' + j, k >= 6);
      $('kg' + j).hidden = !(k >= 6 && kongIdx().includes(j));
    }
    if (k >= 2) $('col2').classList.add('me');
    $('yunbox').classList.toggle('pend', k < 7);
    D.list.slice(0, 8).forEach((_, i) => show('yu' + i, k >= 7));
    setQy(k >= 7 ? 1 : 0);
    if (k === 7) $('board').classList.add('done'); else $('board').classList.remove('done');
  }

  function drawDial(lon, from) {
    let h = '<g class="dialg"><circle class="ring" cx="150" cy="150" r="118"/>';
    for (let i = 0; i < 24; i++) {
      const L = i * 15, [x1, y1] = dialPt(L, i % 2 ? 114 : 108), [x2, y2] = dialPt(L, 124), [tx, ty] = dialPt(L, 136);
      h += `<line class="tick${i % 2 ? '' : ' jie'}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
      h += `<text x="${tx.toFixed(1)}" y="${(ty + 2.5).toFixed(1)}" text-anchor="middle">${JIEQI[i]}</text>`;
    }
    h += '<path class="arc" id="darc" d=""/><circle class="sunglow" id="dglow" r="11"/><circle class="sun" id="dsun" r="6"/>';
    h += `<text class="now" x="150" y="146" text-anchor="middle">生于${C.steps.pillars.prevJie}后</text><text x="150" y="160" text-anchor="middle" id="dlon"></text></g>`;
    $('paths').innerHTML = h;
    setSun(lon, from == null ? lon : from);
  }
  function setSun(lon, from) {
    const [sx, sy] = dialPt(lon, 118);
    for (const id of ['dsun', 'dglow']) { const c = $(id); c.setAttribute('cx', sx.toFixed(2)); c.setAttribute('cy', sy.toFixed(2)); }
    const sweep = ((lon - from) % 360 + 360) % 360;
    const [ax, ay] = dialPt(from, 118);
    $('darc').setAttribute('d', sweep > 0.2 ? `M${ax.toFixed(2)},${ay.toFixed(2)} A118,118 0 ${sweep > 180 ? 1 : 0} 1 ${sx.toFixed(2)},${sy.toFixed(2)}` : '');
    $('dlon').textContent = `太阳黄经 ${(((lon % 360) + 360) % 360).toFixed(1)}°`;
  }
  const overlay = (html) => { $('ov').innerHTML = html; };

  function animate(k, done) {
    const P = C.steps.pillars;
    if (k === 0) {
      $('board').classList.add('dial');
      const lon = P.sunLon, from = lon - 100;
      drawDial(from, from);
      tween(2200, (t) => setSun(from + (lon - from) * easeInOut(t), from), () => later(1100, done));
      return;
    }
    if (k === 1) {
      $('board').classList.remove('dial'); $('paths').innerHTML = '';
      later(300, () => { hl(0); show('tg0'); });
      later(800, () => show('dz0'));
      later(1600, () => { hl(0, false); hl(1); show('tg1'); });
      later(2100, () => show('dz1'));
      later(2900, () => { hl(1, false); done(); }); return;
    }
    if (k === 2) {
      overlay(`<div class="calc"><span>儒略日数</span><b class="mono">${P.dayNum.toLocaleString('en-US')}</b><span class="mono">+ 49，÷ 60 余 ${P.dayIdx}</span><b>${P.names[2]}</b></div>`);
      later(1800, () => { overlay(''); hl(2); show('tg2'); show('ss2'); $('col2').classList.add('me'); });
      later(2300, () => show('dz2'));
      later(3100, () => { hl(2, false); done(); }); return;
    }
    if (k === 3) {
      later(300, () => { hl(3); show('tg3'); });
      later(800, () => show('dz3'));
      later(1600, () => { hl(3, false); done(); }); return;
    }
    if (k === 4) {
      [0, 1, 3].forEach((j, i) => later(400 + 450 * i, () => { all('.col').forEach((c) => c.classList.remove('hl')); hl(j); show('ss' + j); }));
      later(400 + 450 * 3 + 500, () => { all('.col').forEach((c) => c.classList.remove('hl')); done(); }); return;
    }
    if (k === 5) {
      let t = 300;
      C.pillars.forEach((p, j) => p.cang.forEach((_, i) => { later(t, () => show(`cg${j}-${i}`)); t += 220; }));
      later(t + 500, done); return;
    }
    if (k === 6) {
      [0, 1, 2, 3].forEach((j) => later(200 + 250 * j, () => show('ny' + j)));
      [0, 1, 2, 3].forEach((j) => later(1300 + 250 * j, () => show('cs' + j)));
      later(2500, () => kongIdx().forEach((j) => { $('kg' + j).hidden = false; }));
      later(3100, done); return;
    }
    if (k === 7) {
      $('yunbox').classList.remove('pend');
      tween(1800, (t) => setQy(easeInOut(t)), () => {
        D.list.slice(0, 8).forEach((_, i) => later(220 * i + 200, () => show('yu' + i)));
        later(220 * 8 + 700, () => { $('board').classList.add('done'); done(); });
      });
    }
  }

  return { staticState: (k) => staticState(Math.max(k, -1)), animate, seal: (on) => $('seal').classList.toggle('off', !on) };
}

const GWX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
function gwx(g) { return GWX[g]; }

export function caption(C, k, question) {
  const P = C.steps.pillars, D = C.steps.dayun;
  const step = k >= 0 ? `<span class="step">${k + 1} / 8 · ${STAGES[k]}</span>` : '<span class="step">排盘</span>';
  const t = [
    `太阳行至黄经 ${P.sunLon.toFixed(1)}°，生于${P.prevJie}之后`,
    `立春换年、节气换月：<b>${P.names[0]}</b>年 <b>${P.names[1]}</b>月`,
    `日柱由儒略日数推出：<b>${P.names[2]}</b>，日主 ${C.me}${C.meWx}`,
    `五鼠遁起时：<b>${P.names[3]}</b>时`,
    `以日主${C.me}为我，定其余天干的十神`,
    '地支所藏天干，各有十神',
    `纳音五行与日主${C.me}在各支的长生十二宫；日柱旬空 ${C.steps.extra.dayKong.join('')}`,
    `${D.forward ? '顺' : '逆'}排大运，${D.qy.years} 年 ${D.qy.months} 月后起运，虚岁 <b>${D.startAge}</b> 交运`,
  ];
  return step + `<span>${k >= 0 ? t[k] : esc(C.input.text) + (question ? '　问：' + esc(question) : '')}</span>`;
}

export function explain(C, k) {
  const P = C.steps.pillars, D = C.steps.dayun, o = C.opts;
  const h = (no, t) => `<h2><span class="no">${no + 1}/8</span>${t}</h2>`;
  if (k === 0) return h(0, '节气') + `<p>出生时太阳视黄经 <span class="mono">${P.sunLon.toFixed(3)}°</span>，在${P.prevJie}（<span class="mono">${P.prevJieTime}</span>）之后、${P.nextJie}（<span class="mono">${P.nextJieTime}</span>）之前。八字的年、月以节气为界，不看农历初一。</p>`;
  if (k === 1) return h(1, '年柱与月柱') + `<p>年柱以立春的精确时刻换年，得 <b>${P.names[0]}</b>；月柱以“节”换月（立春、惊蛰、清明……），月干用五虎遁从年干推出，得 <b>${P.names[1]}</b>。</p>`;
  if (k === 2) return h(2, '日柱') + `<p>日柱六十天一循环，与历法无关：儒略日数 <span class="mono">${P.dayNum.toLocaleString('en-US')}</span> 加 49 后除以 60，余数 ${P.dayIdx}，即 <b>${P.names[2]}</b>。日干${C.me}是“日主”，代表命主自己。</p><p class="rule">${o.dayChange === 23 ? '23 点换日：23 点后出生算次日' + (P.dayShift ? '，本例已算作次日。' : '。') : '0 点换日：23 点至 0 点为夜子时，日柱仍用当天，时柱用次日子时' + (P.nightZi ? '，本例正属夜子时。' : '。')}${o.solar ? `已按东经 ${o.lon}° 换算真太阳时 ${P.clock}。` : ''}</p>`;
  if (k === 3) return h(3, '时柱') + `<p>时支按出生时辰取，时干用五鼠遁从日干推出（甲己还加甲、乙庚丙作初……），得 <b>${P.names[3]}</b>。</p>`;
  if (k === 4) return h(4, '十神') + `<p>以日主${C.me}（${C.meWx}）为我：同我者比肩、劫财；我生者食神、伤官；我克者偏财、正财；克我者七杀、正官；生我者偏印、正印。阴阳相同为“偏”，不同为“正”。</p><ul>${C.pillars.filter((_, j) => j !== 2).map((p) => `<li>${p.name}天干${p.gan}：${p.shishen}</li>`).join('')}</ul>`;
  if (k === 5) return h(5, '藏干') + `<ul>${C.pillars.map((p) => `<li>${p.zhi}藏 ${p.cang.map((x) => x.gan + '（' + x.shishen + '）').join('、')}</li>`).join('')}</ul><p class="rule">藏干第一个为本气，其后为中气、余气。</p>`;
  if (k === 6) return h(6, '纳音、长生、空亡') + `<ul>${C.pillars.map((p) => `<li>${p.name} ${p.gz}：纳音${p.nayin}，日主临${p.cs}</li>`).join('')}</ul><p>日柱旬空 ${C.steps.extra.dayKong.join('')}，年柱旬空 ${C.steps.extra.yearKong.join('')}；胎元 ${C.steps.extra.taiyuan}。</p><p class="rule">长生十二宫按阳干顺行、阴干逆行（阳生阴死）计算。</p>`;
  if (k === 7) return h(7, '大运') + `<p>${D.yangYear ? '阳' : '阴'}年${D.gender === 'm' ? '男' : '女'}命，${D.forward ? '顺排' : '逆排'}：从出生数到${D.forward ? '下一' : '上一'}个节${D.targetTerm}（<span class="mono">${D.targetTime}</span>）共 ${D.diffDays.toFixed(2)} 天。三天折一年、一天折四个月、一个时辰折十天，得 ${D.qy.years} 年 ${D.qy.months} 个月 ${D.qy.days} 天后起运，约 ${D.startText}（虚岁 ${D.startAge}）交运。</p><p>大运从月柱${P.names[1]}起，${D.forward ? '顺推' : '逆推'}，每步十年：${D.list.slice(0, 8).map((r) => r.gz).join('、')}。</p>`;
  return '';
}

export function meta(C, k) {
  const P = C.steps.pillars, parts = [];
  if (k >= 1) parts.push(`<span><b>${P.names.slice(0, k >= 3 ? 4 : k >= 2 ? 3 : 2).join(' ')}</b></span>`);
  parts.push(`<span>${C.opts.gender === 'm' ? '乾造' : '坤造'}${k >= 2 ? ` · 日主 <b>${C.me}${C.meWx}</b>` : ''}</span>`);
  if (k >= 7) parts.push(`<span>虚岁 <b>${C.steps.dayun.startAge}</b> 起运</span>`);
  return parts.join('');
}

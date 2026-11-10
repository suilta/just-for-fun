/**
 * 大六壬十二宫天地盘：外圈十二宫，中央四课三传；各阶段动画脚本与旁白讲解。
 * mount() 在宿主元素里建盘，返回 staticState(k)、animate(k, done)、seal(on) 供外壳调度。
 */
import * as LR from './core.js';
import { esc } from '../../ui/anim.js';
import './board.css';

const ZHI = LR.ZHI;
const mod = (a, n) => ((a % n) + n) % n;

export const STAGES = ['月将', '地盘', '天盘', '四课', '三传', '天将', '遁干六亲', '课成'];
export const moveMs = 300;
const POS = { 5: [0, 0], 6: [1, 0], 7: [2, 0], 8: [3, 0], 9: [3, 1], 10: [3, 2], 11: [3, 3], 0: [2, 3], 1: [1, 3], 2: [0, 3], 3: [0, 2], 4: [0, 1] };
const SLOT = { gen: [.5, .2], tian: [.5, .52], di: [.8, .82], badge: [.84, .18], dun: [.2, .52], me: [.18, .82] };

export const legend = '<span><b style="color:var(--accent)">紫</b> 天盘</span><span><b style="color:var(--muted)">灰</b> 地盘</span><span><b style="color:var(--gold)">金</b> 天将</span><span><b style="color:var(--cinnabar)">红</b> 克 · 空</span>';

export function mount(host, C, sched) {
  host.innerHTML = `<div class="lr"><div class="board" id="board"><div class="grid" id="grid"><div class="center" id="center"><div class="ke4" id="ke4"></div><div class="method" id="method"></div><div class="chuan" id="chuan"></div></div></div><svg class="paths" id="paths" viewBox="0 0 400 400" preserveAspectRatio="none"></svg><div class="chips" id="chips"></div><div class="seal off" id="seal" aria-hidden="true">课成</div></div></div>`;
  const $ = (id) => host.querySelector('#' + id);
  const { later, tween, setMove, setEase, easeInOut, reduce } = sched;
  const chips = {};

  // ── 盘格 ──
  const grid = $('grid');
  for (let z = 0; z < 12; z++) {
    const d = document.createElement('div');
    d.className = 'cell'; d.id = 'cell' + z;
    const [c, r] = POS[z]; d.style.gridColumn = c + 1; d.style.gridRow = r + 1;
    grid.appendChild(d);
  }
  const cellsAll = () => [...grid.querySelectorAll('.cell')];

  function xy(z, slot) { const [c, r] = POS[z]; const [sx, sy] = SLOT[slot]; return [(c + sx) / 4 * 100, (r + sy) / 4 * 100]; }
  function mkChip(key, cls, text) { const el = document.createElement('div'); el.className = 'chip off ' + cls; el.textContent = text; $('chips').appendChild(el); chips[key] = el; return el; }
  function place(el, z, slot, show = true) { const [x, y] = xy(z, slot); el.style.left = x + '%'; el.style.top = y + '%'; el.classList.toggle('off', !show); }

  function build() {
    $('chips').innerHTML = ''; for (const k in chips) delete chips[k];
    for (let z = 0; z < 12; z++) {
      mkChip('di' + z, 'di', ZHI[z]);
      mkChip('tian' + z, 'tian', ZHI[z]);   // 天盘支 z，起初在本位
      mkChip('gen' + z, 'gen', '');         // 地盘 z 上的天将
      mkChip('dun' + z, 'dun', '');
      mkChip('kong' + z, 'badge', '空');
      mkChip('me' + z, 'badge me', '');
    }
    for (let z = 0; z < 12; z++) {
      place(chips['di' + z], z, 'di', false); place(chips['tian' + z], z, 'tian', false);
      place(chips['gen' + z], z, 'gen', false); place(chips['dun' + z], z, 'dun', false); place(chips['kong' + z], z, 'badge', false); place(chips['me' + z], z, 'me', false);
      chips['gen' + z].textContent = C.plate[z].general || '';
      chips['dun' + z].textContent = C.plate[z].dun || '';
      chips['me' + z].textContent = C.steps.person ? (z === C.steps.person.bm ? '命' : '') + (z === C.steps.person.xn ? '年' : '') : '';
    }
    buildCenter();
  }

  const S = () => C.steps;
  const seatOf = (tz, rot) => mod(tz + rot, 12); // 天盘支 tz 转动 rot 格后所在地盘
  function setTian(rot, show) { for (let z = 0; z < 12; z++) place(chips['tian' + z], seatOf(z, rot), 'tian', show); }
  function setGens(count, show) {
    const g = S().gen;
    for (let i = 0; i < 12; i++) {
      const pos = mod(g.guiSeat + (g.shun ? i : -i), 12);
      place(chips['gen' + pos], pos, 'gen', show && i < count);
    }
  }
  function clearMarks() {
    $('board').classList.remove('dial', 'done');
    cellsAll().forEach((c) => { c.classList.remove('hl', 'hot', 'pulse'); const t = c.querySelector('.tag'); if (t) t.remove(); });
    Object.values(chips).forEach((c) => c.classList.remove('key'));
    $('paths').innerHTML = '';
  }
  const hl = (z, cls = 'hl') => $('cell' + z).classList.add(cls);
  function tag(z, text) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = text; $('cell' + z).appendChild(t); }

  // ── 中央：四课与三传 ──
  // 四课、三传的元素只建一次；之后只改文字和显隐，已显示的部分不会重新淡入
  function buildCenter() {
    $('ke4').innerHTML = C.ke4.map((k) => `<div class="ke pend" id="kecol${k.no}"><span class="g"></span><span class="u">${k.upCh}</span><span class="d">${k.down}</span><span class="x"></span><span class="n">${'一二三四'[k.no - 1]}课</span></div>`).join('');
    $('chuan').innerHTML = C.chuan.map((t, i) => `<div class="pend" id="ch${i}"><span class="p">${t.pos}</span><span class="dg"></span><span class="z">${t.zhi}</span><span class="gn"></span><span class="q"></span></div>`).join('');
    $('method').textContent = S().chuan.method; $('method').classList.add('pend');
  }
  const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  function renderCenter(opt) {
    const { keN = 0, marks = false, chuanN = 0, gens = false, dun = false, method = false } = opt;
    C.ke4.forEach((k, i) => {
      const el = $('kecol' + k.no);
      el.classList.toggle('pend', i >= keN);
      setText(el.querySelector('.g'), gens ? k.general : '');
      setText(el.querySelector('.x'), marks ? (k.zei ? '贼' : k.ke ? '克' : '') : '');
    });
    $('method').classList.toggle('pend', !method);
    C.chuan.forEach((t, i) => {
      const el = $('ch' + i);
      el.classList.toggle('pend', i >= chuanN);
      setText(el.querySelector('.dg'), dun ? t.dun : '');
      setText(el.querySelector('.gn'), gens ? t.general : '');
      const q = el.querySelector('.q');
      setText(q, dun ? t.qin + (t.kong ? '空' : '') : '');
      q.classList.toggle('k', !!(t.kong && dun));
    });
  }
  const CENTER = [
    {}, {}, {}, { keN: 4 }, { keN: 4, marks: true, chuanN: 3, method: true },
    { keN: 4, marks: true, chuanN: 3, method: true, gens: true },
    { keN: 4, marks: true, chuanN: 3, method: true, gens: true, dun: true },
    { keN: 4, marks: true, chuanN: 3, method: true, gens: true, dun: true },
  ];

  // ── 黄道盘（月将）：上南下北，左东右西 ──
  const dialPt = (lon, r) => { const a = lon * Math.PI / 180; return [200 - r * Math.cos(a), 200 - r * Math.sin(a)]; };
  const ZQ = ['春分', '谷雨', '小满', '夏至', '大暑', '处暑', '秋分', '霜降', '小雪', '冬至', '大寒', '雨水'];
  function drawDial(lon, from) {
    $('board').classList.add('dial');
    let h = '<g class="dialg"><circle class="ring" cx="200" cy="200" r="150"/>';
    for (let i = 0; i < 24; i++) {
      const L = i * 15, major = i % 2 === 0, [x1, y1] = dialPt(L, major ? 140 : 145), [x2, y2] = dialPt(L, 158);
      h += `<line class="tick ${major ? 'major' : ''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }
    // 十二中气之间的宫位，标出对应的月将
    for (let i = 0; i < 12; i++) {
      const L = i * 30 + 15, [tx, ty] = dialPt(L, 172), [jx, jy] = dialPt(L, 124);
      const zq = ZQ[i]; const jiang = mod(11 - mod(i * 30 - 330, 360) / 30, 12);
      h += `<text x="${tx.toFixed(1)}" y="${(ty + 3).toFixed(1)}" text-anchor="middle">${zq}后</text>`;
      h += `<text class="jiang" x="${jx.toFixed(1)}" y="${(jy + 4).toFixed(1)}" text-anchor="middle">${ZHI[jiang]}</text>`;
    }
    h += '<path class="arc" id="darc" d=""/><circle class="sunglow" id="dglow" r="13"/><circle class="sun" id="dsun" r="7"/>';
    h += `<text class="now" x="200" y="194" text-anchor="middle" id="dnow"></text><text x="200" y="214" text-anchor="middle" id="dlon"></text></g>`;
    $('paths').innerHTML = h;
    setSun(lon, from == null ? lon : from);
  }
  function setSun(lon, from) {
    const [sx, sy] = dialPt(lon, 150);
    for (const id of ['dsun', 'dglow']) { const c = $(id); c.setAttribute('cx', sx.toFixed(2)); c.setAttribute('cy', sy.toFixed(2)); }
    const sweep = mod(lon - from, 360);
    const [ax, ay] = dialPt(from, 150);
    $('darc').setAttribute('d', sweep > 0.2 ? `M${ax.toFixed(2)},${ay.toFixed(2)} A150,150 0 ${sweep > 180 ? 1 : 0} 1 ${sx.toFixed(2)},${sy.toFixed(2)}` : '');
    const k = Math.floor(mod(lon - 330, 360) / 30), j = mod(11 - k, 12);
    $('dnow').textContent = `月将 ${ZHI[j]} · ${LR.JIANG_NAME[j]}`;
    $('dlon').textContent = `太阳黄经 ${mod(lon, 360).toFixed(1)}°`;
  }

  function arrow(fromZ, toZ) {
    const c = (z) => { const [cc, r] = POS[z]; return [cc * 100 + 50, r * 100 + 50]; };
    const [x1, y1] = c(fromZ), [x2, y2] = c(toZ);
    const mx = (x1 + x2) / 2 + (200 - (x1 + x2) / 2) * .35, my = (y1 + y2) / 2 + (200 - (y1 + y2) / 2) * .35;
    return `<path class="arrow" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"/>`;
  }
  const DEFS = '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>';
  function chuanArrows(n) {
    const L = S().chuan.list;
    let h = DEFS;
    for (let i = 1; i < n; i++) if (L[i] !== L[i - 1]) h += arrow(L[i - 1], L[i]);
    $('paths').innerHTML = h;
  }
  // 三传中某支在盘上的位置：以天盘支所在宫格表示
  const tianSeat = (tz) => seatOf(tz, S().plate.rot);

  // ── 第 k 幕完成后的静态盘面 ──
  function staticState(k) {
    clearMarks();
    const P = S();
    for (let z = 0; z < 12; z++) place(chips['di' + z], z, 'di', k >= 1);
    setTian(k >= 2 ? P.plate.rot : 0, k >= 2);
    setGens(12, k >= 5);
    for (let z = 0; z < 12; z++) {
      place(chips['dun' + z], z, 'dun', k >= 6 && !!C.plate[z].dun);
      place(chips['kong' + z], z, 'badge', k >= 6 && C.plate[z].kong);
      place(chips['me' + z], z, 'me', k >= 6 && !!chips['me' + z].textContent);
    }
    renderCenter(CENTER[k] || {});
    if (k === 0) drawDial(P.pillars.sunLon);
    if (k === 2) { hl(P.pillars.hourZhi); tag(P.pillars.hourZhi, '占时'); chips['tian' + P.pillars.jiang].classList.add('key'); }
    if (k === 3) { tag(P.ke.jigong, C.dayGan + '寄'); tag(LR.ZHI.indexOf(C.dayZhi), '日支'); }
    if (k === 4) { chuanArrows(3); C.chuan.forEach((t) => hl(tianSeat(t.z))); }
    if (k === 5) { hl(P.gen.guiSeat); }
    if (k === 7) $('board').classList.add('done');
  }

  // ── 各幕动画 ──
  function animate(k, done) {
    const P = S();
    if (k === 0) {
      const lon = P.pillars.sunLon, from = lon - 100;
      drawDial(from, from);
      tween(2200, (t) => setSun(from + (lon - from) * easeInOut(t), from), () => later(1300, done));
      return;
    }
    if (k === 1) {
      for (let i = 0; i < 12; i++) later(110 * i + 200, () => place(chips['di' + i], i, 'di', true));
      later(110 * 12 + 600, done); return;
    }
    if (k === 2) {
      const hz = P.pillars.hourZhi, j = P.pillars.jiang;
      setMove(0); setTian(0, true); void $('chips').offsetWidth;
      later(300, () => { hl(hz); tag(hz, '占时'); $('cell' + hz).classList.add('pulse'); });
      later(900, () => { chips['tian' + j].classList.add('key'); hl(j); });
      const n = P.plate.rot;
      later(1700, () => { $('cell' + j).classList.remove('hl'); setMove(260); setEase('linear'); });
      for (let i = 1; i <= n; i++) later(1700 + 260 * (i - 1) + 20, () => setTian(i, true));
      later(1700 + 260 * n + 600, () => { setEase('ease-in-out'); done(); }); return;
    }
    if (k === 3) {
      const K = C.ke4;
      K.forEach((kk, i) => {
        const t = 300 + 1000 * i;
        later(t, () => {
          cellsAll().forEach((c) => c.classList.remove('hl'));
          hl(kk.downPos);
          if (i === 0) tag(P.ke.jigong, C.dayGan + '寄');
          if (i === 2) tag(LR.ZHI.indexOf(C.dayZhi), '日支');
          Object.values(chips).forEach((c) => c.classList.remove('key'));
          chips['tian' + kk.up].classList.add('key');
        });
        later(t + 500, () => renderCenter({ keN: i + 1 }));
      });
      later(300 + 1000 * 4 + 300, () => { cellsAll().forEach((c) => c.classList.remove('hl')); Object.values(chips).forEach((c) => c.classList.remove('key')); done(); });
      return;
    }
    if (k === 4) {
      renderCenter({ keN: 4 });
      later(300, () => renderCenter({ keN: 4, marks: true }));
      later(1100, () => renderCenter({ keN: 4, marks: true, method: true }));
      C.chuan.forEach((t, i) => later(1900 + 900 * i, () => {
        hl(tianSeat(t.z)); $('cell' + tianSeat(t.z)).classList.add('pulse');
        chuanArrows(i + 1);
        renderCenter({ keN: 4, marks: true, method: true, chuanN: i + 1 });
      }));
      later(1900 + 900 * 3 + 300, done); return;
    }
    if (k === 5) {
      const g = P.gen;
      hl(g.guiSeat); $('cell' + g.guiSeat).classList.add('pulse');
      for (let i = 1; i <= 12; i++) later(250 + 170 * i, () => setGens(i, true));
      later(250 + 170 * 13 + 200, () => renderCenter({ keN: 4, marks: true, method: true, chuanN: 3, gens: true }));
      later(250 + 170 * 13 + 700, done); return;
    }
    if (k === 6) {
      for (let z = 0; z < 12; z++) later(60 * z + 200, () => place(chips['dun' + z], z, 'dun', !!C.plate[z].dun));
      later(1200, () => { for (let z = 0; z < 12; z++) if (C.plate[z].kong) { place(chips['kong' + z], z, 'badge', true); hl(z, 'hot'); } });
      later(1700, () => renderCenter(CENTER[6]));
      if (P.person) {
        later(2100, () => { place(chips['me' + P.person.bm], P.person.bm, 'me', true); $('cell' + P.person.bm).classList.add('pulse'); });
        later(2600, () => { place(chips['me' + P.person.xn], P.person.xn, 'me', true); $('cell' + P.person.xn).classList.add('pulse'); });
        later(3300, done); return;
      }
      later(2400, done); return;
    }
    if (k === 7) { $('board').classList.add('done'); later(300, done); return; }
  }

  function blank() { clearMarks(); renderCenter({}); for (const c of Object.values(chips)) c.classList.add('off'); }
  build();
  return { staticState: (k) => (k < 0 ? blank() : staticState(k)), animate, seal: (on) => $('seal').classList.toggle('off', !on) };
}

function texts(C) {
  const S = () => C.steps;
  // ── 文字 ──
  const zn = (z) => ZHI[z];
  function caption(k, question) {
    const P = S(); const step = k >= 0 ? `<span class="step">${k + 1} / 8 · ${STAGES[k]}</span>` : '<span class="step">起课</span>';
    const ch = C.chuan.map((t) => t.zhi).join(' ');
    const t = [
      `太阳过${P.pillars.zhongqi}，月将为 <b>${zn(P.pillars.jiang)} · ${P.pillars.jiangName}</b>`,
      '十二地盘，子午卯酉定四正',
      `${zn(P.pillars.jiang)}将加${zn(P.pillars.hourZhi)}时，天盘${P.plate.fuyin ? '不动（伏吟）' : P.plate.fanyin ? '对冲（返吟）' : '随之转动'}`,
      `日干${C.dayGan}寄${zn(P.ke.jigong)}，日支${C.dayZhi}，起出四课`,
      `${P.chuan.method}发用，三传 <b>${ch}</b>`,
      `${P.gen.isDay ? '昼' : '夜'}贵在${zn(P.gen.gui)}，临${zn(P.gen.guiSeat)}${P.gen.shun ? '顺' : '逆'}布十二天将`,
      `${P.extra.xun}旬遁干，旬空 <b>${P.extra.kong.map(zn).join('')}</b>${P.person ? `；本命${zn(P.person.bm)}，行年${zn(P.person.xn)}` : ''}`,
      '课成',
    ];
    return step + `<span>${k >= 0 ? t[k] : esc(C.input.text) + (question ? '　问：' + esc(question) : '')}</span>`;
  }
  function explain(k) {
    const P = S(); const h = (no, t) => `<h2><span class="no">${no + 1}/8</span>${t}</h2>`;
    let x = '';
    if (k === 0) x = h(0, '四柱与月将') + `<p>四柱 <b>${P.pillars.year} ${P.pillars.month} ${P.pillars.day} ${P.pillars.hour}</b>。太阳视黄经 ${P.pillars.sunLon.toFixed(2)}°，已过${P.pillars.zhongqi}，月将为<b>${zn(P.pillars.jiang)}（${P.pillars.jiangName}）</b>。</p>${C.opts.solar ? `<p>真太阳时 ${P.pillars.clock}（东经 ${C.opts.lon}°），日柱和占时按真太阳时取。</p>` : ''}<p class="rule">月将即太阳所在的宫次，以中气换将：雨水后亥、春分后戌……冬至后丑、大寒后子。</p>`;
    if (k === 1) x = h(1, '地盘') + '<p>地盘十二支固定不动：上南下北，巳午未申在上，亥子丑寅在下。</p>';
    if (k === 2) x = h(2, '天盘') + `<p>以月将${zn(P.pillars.jiang)}加在占时${zn(P.pillars.hourZhi)}上，十二支随之顺时针转动 ${P.plate.rot} 格，形成天盘。</p>${P.plate.fuyin ? '<p><b>月将与占时相同，天地盘重合，是伏吟课。</b></p>' : P.plate.fanyin ? '<p><b>天盘与地盘处处对冲，是返吟课。</b></p>' : ''}`;
    if (k === 3) x = h(3, '四课') + `<ul>${C.ke4.map((c) => `<li>第${'一二三四'[c.no - 1]}课：${c.no === 1 ? `日干${c.down}寄${zn(P.ke.jigong)}，` : c.no === 3 ? `日支${c.down}，` : `以上一课上神${c.down}为下，`}其上天盘为 <b>${c.upCh}</b></li>`).join('')}</ul><p class="rule">十干寄宫：甲寅 乙辰 丙戊巳 丁己未 庚申 辛戌 壬亥 癸丑。</p>`;
    if (k === 4) x = h(4, '发三传') + `<p>课体：<b>${P.chuan.method}</b></p><ul>${P.chuan.why.map((w) => `<li>${w}</li>`).join('')}</ul><p>三传：${C.chuan.map((t) => `${t.pos} <b>${t.zhi}</b>`).join('，')}。</p>`;
    if (k === 5) x = h(5, '十二天将') + `<p>${C.dayGan}日${P.gen.isDay ? '昼' : '夜'}占（${C.opts.dayNight === 'sun' ? '按当地日出日落' : '卯至申为昼'}），贵人在${zn(P.gen.gui)}。天盘${zn(P.gen.gui)}临地盘${zn(P.gen.guiSeat)}，${P.gen.shun ? '在亥至辰之间，顺行' : '在巳至戌之间，逆行'}，依次排贵人、腾蛇、朱雀、六合、勾陈、青龙、天空、白虎、太常、玄武、太阴、天后。</p>`;
    if (k === 6) x = h(6, '遁干、六亲、旬空') + `<p>${C.input.text.slice(0, 10)}为${P.pillars.day}日，在${P.extra.xun}旬，按旬遁出各支天干；旬空${P.extra.kong.map(zn).join('、')}。</p><ul>${C.chuan.map((t) => `<li>${t.pos} ${t.dun}${t.zhi}：${t.general}，${t.qin}${t.kong ? '，旬空' : ''}</li>`).join('')}</ul><p class="rule">六亲以日干${C.dayGan}（${C.dayWx}）为我：生我父母，我生子孙，克我官鬼，我克妻财，同我兄弟。</p>${P.person ? `<p>${P.person.gender === 'm' ? '男' : '女'}命 ${P.person.birthYear} 年生，本命${zn(P.person.bm)}（${P.person.benming}）；虚岁 ${P.person.age}，行年${P.person.xingnian}。盘上以“命”“年”标出。</p><p class="rule">行年：男命一岁起丙寅顺行，女命一岁起壬申逆行，每年一位。</p>` : ''}`;
    if (k === 7) x = h(7, '课成') + `<p>${P.pillars.day}日${zn(P.pillars.hourZhi)}时，${zn(P.pillars.jiang)}将，${P.chuan.method}课，三传 ${C.chuan.map((t) => t.zhi).join(' ')}。</p>`;
    return x;
  }
  function meta(k) {
    const P = S(); const parts = [];
    if (k >= 0) parts.push(`<span><b>${P.pillars.year} ${P.pillars.month} ${P.pillars.day} ${P.pillars.hour}</b></span>`);
    if (k >= 0) parts.push(`<span>月将 <b>${zn(P.pillars.jiang)}</b>　占时 <b>${zn(P.pillars.hourZhi)}</b></span>`);
    if (k >= 4) parts.push(`<span>${P.chuan.method}</span>`);
    return parts.join('');
  }

  return { caption, explain, meta };
}
export const caption = (C, k, question) => texts(C).caption(k, question);
export const explain = (C, k) => texts(C).explain(k);
export const meta = (C, k) => texts(C).meta(k);

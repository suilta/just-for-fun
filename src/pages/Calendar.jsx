import { createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { monthGrid, dayInfo, termsOfYear, phasesOfMonth, WEEK } from '../core/almanac.js';
import { beijingNow } from '../ui/anim.js';
import { ARTS } from '../arts/index.js';
import './pages.css';

const pad = (n) => String(n).padStart(2, '0');
const PHASE_ICON = { 朔: '●', 上弦: '◐', 望: '○', 下弦: '◑' };

/** 农历日历：月历格子 + 选中日的详情（农历、干支、节气、月相、节日），可用这一天去起盘 */
export default function Calendar(props) {
  const now = beijingNow(); // YYYY-MM-DDTHH:mm（北京时间）
  const today = now.slice(0, 10);
  const init = /^\d{4}-\d{2}$/.test(props.ym || '') ? props.ym.split('-').map(Number) : [+now.slice(0, 4), +now.slice(5, 7)];
  const [ym, setYm] = createSignal(init);
  const [sel, setSel] = createSignal(props.ym ? `${props.ym}-01` : today);
  onMount(() => { document.title = '农历日历 · 观象'; });

  const grid = createMemo(() => monthGrid(...ym()));
  const info = createMemo(() => { const [y, m, d] = sel().split('-').map(Number); return dayInfo(y, m, d); });
  const monthTerms = createMemo(() => { const [y, m] = ym(); return termsOfYear(y).filter((t) => +t.date.slice(5, 7) === m); });
  const monthPhases = createMemo(() => phasesOfMonth(...ym()));
  const lunarYears = createMemo(() => {
    const g = grid().filter((c) => c.inMonth && c.lunar);
    const ys = [...new Set(g.map((c) => `${c.lunar.yearGz}年（${c.shengxiao}）`))];
    return ys.join(' / ');
  });

  function go(dm) {
    let [y, m] = ym(); m += dm;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    setYm([y, m]); setSel(`${y}-${pad(m)}-01`);
    history.replaceState(null, '', `#calendar?ym=${y}-${pad(m)}`);
  }
  function goToday() { setYm([+today.slice(0, 4), +today.slice(5, 7)]); setSel(today); history.replaceState(null, '', '#calendar'); }
  function jumpTo(v) { if (!/^\d{4}-\d{2}$/.test(v)) return; const [y, m] = v.split('-').map(Number); if (y < 1900 || y > 2100) return; setYm([y, m]); setSel(`${v}-01`); history.replaceState(null, '', `#calendar?ym=${v}`); }
  function onKey(e) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const [y, m, d] = sel().split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + step));
    const k = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
    if (t.getUTCMonth() + 1 !== ym()[1]) setYm([t.getUTCFullYear(), t.getUTCMonth() + 1]);
    setSel(k);
    queueMicrotask(() => document.querySelector(`.cal-grid [data-k="${k}"]`)?.focus());
  }
  // 用选中的日子去起盘：时刻沿用现在的钟点
  const castHref = (a) => `#${a.id}?dt=${sel()}T${now.slice(11, 16)}`;
  const castArts = ARTS.filter((a) => !a.noTime);

  return (
    <main class="page fade-in">
      <header class="top"><a class="brand" href="#">观象 · 农历日历</a><nav class="toplinks"><a href="#history">记录</a><a href="#">首页</a></nav></header>
      <section class="cal">
        <div class="cal-main">
          <div class="cal-nav">
            <button type="button" onClick={() => go(-1)} aria-label="上个月">‹</button>
            <h1>{ym()[0]} 年 {ym()[1]} 月</h1>
            <button type="button" onClick={() => go(1)} aria-label="下个月">›</button>
            <span class="cal-ly">{lunarYears()}</span>
            <span class="cal-tools">
              <input type="month" aria-label="跳到年月" min="1900-01" max="2100-12" value={`${ym()[0]}-${pad(ym()[1])}`} onChange={(e) => jumpTo(e.currentTarget.value)} />
              <button type="button" onClick={goToday}>今天</button>
            </span>
          </div>
          <div class="cal-grid" role="grid" aria-label="月历" onKeyDown={onKey}>
            <For each={['一', '二', '三', '四', '五', '六', '日']}>{(w, i) => <div class={'cal-wd' + (i() >= 5 ? ' we' : '')} role="columnheader">{w}</div>}</For>
            <For each={grid()}>{(c) => (
              <button type="button" role="gridcell" data-k={c.key} tabindex={c.key === sel() ? 0 : -1}
                class={'cal-d' + (c.inMonth ? '' : ' out') + (c.key === today ? ' today' : '') + (c.weekday % 6 === 0 ? ' we' : '') + ' ' + c.label.kind}
                aria-selected={c.key === sel()} aria-label={`${c.m}月${c.d}日 ${c.lunar?.monthName || ''}${c.lunar?.dayName || ''} ${c.fest.join(' ')} ${c.term?.name || ''}`}
                onClick={() => { if (!c.inMonth) setYm([c.y, c.m]); setSel(c.key); }}>
                <span class="n">{c.d}</span>
                <span class="l">{c.label.text}</span>
                <Show when={c.phase && (c.phase.name === '朔' || c.phase.name === '望')}><span class="ph" title={c.phase.name}>{PHASE_ICON[c.phase.name]}</span></Show>
              </button>
            )}</For>
          </div>
          <div class="cal-month">
            <p><b>本月节气</b>{monthTerms().map((t) => ` ${t.name} ${+t.date.slice(8)}日 ${t.time}`).join('，')}</p>
            <p><b>本月月相</b>{monthPhases().map((p) => ` ${PHASE_ICON[p.name]} ${p.name} ${+p.date.slice(8)}日 ${p.time}`).join('，')}</p>
          </div>
        </div>
        <aside class="cal-side" aria-live="polite">
          {(() => {
            const I = info;
            return (
              <>
                <div class="cd-date"><b>{I().m} 月 {I().d} 日</b><span>{I().y} 年 · {I().week}</span></div>
                <Show when={I().lunar}>
                  <div class="cd-lunar">农历{I().lunar.monthName}{I().lunar.dayName}</div>
                  <div class="cd-ly">{I().lunar.yearGz}年 · 属{I().shengxiao}（农历年以正月初一为界）</div>
                </Show>
                <dl class="cd-list">
                  <dt>干支</dt>
                  <dd>{I().pillars.year}年 {I().pillars.month}月 {I().pillars.day}日
                    <Show when={I().yearChange}><br /><small>今天{I().term?.time}立春，年柱由{I().yearChange.from}换为{I().yearChange.to}</small></Show>
                    <Show when={I().monthChange}><br /><small>今天{I().term?.time}交节，月柱由{I().monthChange.from}换为{I().monthChange.to}</small></Show>
                    <br /><small>年柱以立春为界、月柱以节为界，按当天正午；日柱 0 点换日。</small>
                  </dd>
                  <Show when={I().term}><dt>节气</dt><dd><b>{I().term.name}</b> {I().term.time}（北京时间）</dd></Show>
                  <Show when={I().phase}><dt>月相</dt><dd>{PHASE_ICON[I().phase.name]} {I().phase.name} {I().phase.time}</dd></Show>
                  <Show when={I().fest.length}><dt>节日</dt><dd>{I().fest.join('、')}</dd></Show>
                </dl>
                <div class="cd-cast">
                  <span class="small">用这一天起盘（时刻取现在的 {now.slice(11, 16)}，可再改）：</span>
                  <div class="cd-links"><For each={castArts}>{(a) => <a href={castHref(a)}>{a.name}</a>}</For></div>
                </div>
              </>
            );
          })()}
        </aside>
      </section>
    </main>
  );
}

export { WEEK };

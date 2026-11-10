import { createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { loadHistory, removeRecord, clearHistory, MAX } from '../ui/history.js';
import { ARTS } from '../arts/index.js';
import './home.css';
import './pages.css';

const TONE = { qimen: 'qm', liuren: 'lr', taiyi: 'ty', bazi: 'bz', meihua: 'mh', liuyao: 'lyo', xiaoliuren: 'xl', tarot: 'tr', natal: 'na' };
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
function dayLabel(key) {
  const today = dayKey(Date.now()), yest = dayKey(Date.now() - 864e5);
  return key === today ? '今天' : key === yest ? '昨天' : key;
}

/** 起盘记录：按存入的日期分组，可打开、再起一次、复制原文、删除 */
export default function History() {
  const [list, setList] = createSignal(loadHistory());
  const [filter, setFilter] = createSignal('');
  const [confirmId, setConfirmId] = createSignal(null);
  const [copied, setCopied] = createSignal(null);
  onMount(() => { document.title = '起盘记录 · 观象'; });

  const arts = createMemo(() => ARTS.filter((a) => list().some((r) => r.art === a.id)));
  const shown = createMemo(() => list().filter((r) => !filter() || r.art === filter()));
  const groups = createMemo(() => {
    const g = [];
    for (const r of shown()) { const k = dayKey(r.at); if (!g.length || g[g.length - 1].k !== k) g.push({ k, items: [] }); g[g.length - 1].items.push(r); }
    return g;
  });
  const artOf = (id) => ARTS.find((a) => a.id === id);
  function del(id) {
    if (confirmId() !== id) { setConfirmId(id); return; }
    removeRecord(id); setConfirmId(null); setList(loadHistory());
  }
  function clearAll() {
    if (!confirm(`删除全部 ${list().length} 条起盘记录？删除后无法恢复。`)) return;
    clearHistory(); setList([]); setFilter('');
  }
  async function copy(r) {
    try { await navigator.clipboard.writeText(r.text); setCopied(r.id); setTimeout(() => setCopied(null), 1500); } catch (e) { setCopied('fail'); }
  }

  return (
    <main class="page fade-in">
      <header class="top"><a class="brand" href="#">观象 · 起盘记录</a><nav class="toplinks"><a href="#calendar">日历</a><a href="#">首页</a></nav></header>
      <section class="page-head">
        <h1>起盘记录</h1>
        <p>每次排完盘会自动记在这里，可以回看盘面和动画，或用同样的资料再起一次。记录只存在这台设备的浏览器里，最多 {MAX} 条，换设备或清除浏览器数据后不会保留。</p>
      </section>
      <Show when={list().length} fallback={<p class="empty">还没有记录。<a href="#">去起一盘</a></p>}>
        <div class="filters" role="group" aria-label="按类别筛选">
          <button type="button" aria-pressed={!filter()} onClick={() => setFilter('')}>全部 {list().length}</button>
          <For each={arts()}>{(a) => (
            <button type="button" aria-pressed={filter() === a.id} onClick={() => setFilter(a.id)}>{a.name} {list().filter((r) => r.art === a.id).length}</button>
          )}</For>
          <button type="button" class="danger" onClick={clearAll}>全部删除</button>
        </div>
        <For each={groups()}>{(g) => (
          <section class="hgroup">
            <h2>{dayLabel(g.k)}</h2>
            <For each={g.items}>{(r) => {
              const a = artOf(r.art);
              const t = new Date(r.at);
              return (
                <article class={'card hrec ' + (TONE[r.art] || '')}>
                  <div class="hr-top">
                    <span class="name">{r.name || a?.name || r.art}</span>
                    <span class="when">{a?.noTime ? '' : (a?.birth ? '出生 ' : '起盘 ') + r.dt.replace('T', ' ')}</span>
                    <span class="at">{pad(t.getHours())}:{pad(t.getMinutes())} 存</span>
                  </div>
                  <Show when={r.q}><p class="hq">问：{r.q}</p></Show>
                  <p class="hm">{r.meta}</p>
                  <div class="hr-act">
                    <Show when={a} fallback={<span class="small">这一类已不再提供</span>}>
                      <a class="btn primary" href={`#${r.art}/r/${r.id}`}>打开</a>
                      <a class="btn" href={`#${r.art}/p/${r.id}`}>{a?.birth ? '用这份资料再排' : '再起一次'}</a>
                    </Show>
                    <button type="button" onClick={() => copy(r)}>{copied() === r.id ? '已复制' : '复制原文'}</button>
                    <button type="button" class={confirmId() === r.id ? 'danger' : ''} onClick={() => del(r.id)} onBlur={() => setConfirmId(null)}>
                      {confirmId() === r.id ? '确认删除' : '删除'}
                    </button>
                  </div>
                </article>
              );
            }}</For>
          </section>
        )}</For>
      </Show>
    </main>
  );
}

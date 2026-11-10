import { createSignal, createMemo, onCleanup, Switch, Match } from 'solid-js';
import Home from './pages/Home.jsx';
import History from './pages/History.jsx';
import Calendar from './pages/Calendar.jsx';
import Shell from './ui/Shell.jsx';
import { ARTS } from './arts/index.js';

/**
 * 以地址里的 # 切换页面：
 *   #qimen                    起盘页
 *   #qimen/r/<记录id>         打开一条起盘记录（直接到结果）
 *   #qimen/p/<记录id>         用一条记录的资料重新起盘
 *   #qimen?dt=2026-11-10T12:00 预填时间（从农历日历跳来）
 *   #history  #calendar       起盘记录、农历日历
 */
export function parseRoute(hash) {
  const raw = hash.replace(/^#/, '');
  const [path, query = ''] = raw.split('?');
  const [page, mode, id] = path.split('/');
  const q = Object.fromEntries(query.split('&').filter(Boolean).map((kv) => kv.split('=').map(decodeURIComponent)));
  return { raw, page, mode, id, dt: q.dt, ym: q.ym };
}

export default function App() {
  const [h, setH] = createSignal(location.hash);
  const onHash = () => { setH(location.hash); window.scrollTo({ top: 0 }); };
  window.addEventListener('hashchange', onHash);
  onCleanup(() => window.removeEventListener('hashchange', onHash));
  const r = createMemo(() => parseRoute(h()));
  const art = createMemo(() => ARTS.find((a) => a.id === r().page));
  // 每次地址变化都重建外壳，保证打开记录、预填时间都从干净状态开始
  const shellKey = createMemo(() => (art() ? r().raw : null));
  return (
    <Switch fallback={<Home />}>
      <Match when={shellKey()} keyed>{(_k) => <Shell art={art()} route={r()} />}</Match>
      <Match when={r().page === 'history'}><History /></Match>
      <Match when={r().page === 'calendar'}><Calendar ym={r().ym} /></Match>
    </Switch>
  );
}

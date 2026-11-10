import { createSignal, onCleanup, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import Home from './pages/Home.jsx';
import Shell from './ui/Shell.jsx';
import { ARTS } from './arts/index.js';

// 以地址里的 #名字 切换页面（#qimen、#liuren、#taiyi），空为首页
const route = () => location.hash.replace(/^#/, '');

export default function App() {
  const [r, setR] = createSignal(route());
  const onHash = () => { setR(route()); window.scrollTo({ top: 0 }); };
  window.addEventListener('hashchange', onHash);
  onCleanup(() => window.removeEventListener('hashchange', onHash));
  const art = () => ARTS.find((a) => a.id === r());
  return (
    <Show when={art()} fallback={<Home />} keyed>
      {(a) => <Dynamic component={Shell} art={a} />}
    </Show>
  );
}

import { createSignal, For, onCleanup, onMount } from 'solid-js';
import './fancy-select.css';

/**
 * 带说明的下拉：每个选项上面是名字，下面是解释。
 * props: id, value, onChange(value), options: [{ value, label, desc }], labelId
 */
export default function FancySelect(props) {
  const [open, setOpen] = createSignal(false);
  const [active, setActive] = createSignal(0);
  let wrap, btn;
  const items = [];
  const cur = () => props.options.find((o) => String(o.value) === String(props.value)) || props.options[0];
  const indexOfValue = () => Math.max(0, props.options.findIndex((o) => String(o.value) === String(props.value)));

  const focusActive = (i) => {
    const n = props.options.length;
    const k = ((i % n) + n) % n;
    setActive(k);
    queueMicrotask(() => { const el = items[k]; if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); } });
  };
  const show = () => { setOpen(true); focusActive(indexOfValue()); };
  const hide = (focusBtn) => { if (!open()) return; setOpen(false); if (focusBtn) btn.focus(); };
  const choose = (v) => { const changed = String(v) !== String(props.value); hide(true); if (changed) props.onChange(v); };

  const onDoc = (e) => { if (wrap && !wrap.contains(e.target)) hide(false); };
  onMount(() => document.addEventListener('pointerdown', onDoc));
  onCleanup(() => document.removeEventListener('pointerdown', onDoc));

  const onListKey = (e) => {
    const n = props.options.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); focusActive(active() + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusActive(active() - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusActive(0); }
    else if (e.key === 'End') { e.preventDefault(); focusActive(n - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(props.options[active()].value); }
    else if (e.key === 'Escape') { e.preventDefault(); hide(true); }
    else if (e.key === 'Tab') hide(false);
  };

  return (
    <div class="fs" classList={{ open: open() }} ref={wrap}>
      <button type="button" class="fs-btn" id={props.id} ref={btn} aria-haspopup="listbox" aria-expanded={open()} aria-controls={props.id + '-list'}
        onClick={() => (open() ? hide(true) : show())}
        onKeyDown={(e) => { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); } }}>
        <span class="fs-cur">{cur()?.label}</span><span class="fs-chev" aria-hidden="true" />
      </button>
      <ul class="fs-list" role="listbox" id={props.id + '-list'} aria-labelledby={props.labelId} hidden={!open()} onKeyDown={onListKey}>
        <For each={props.options}>{(o, i) => (
          <li class="fs-opt" role="option" tabindex="-1" ref={(el) => (items[i()] = el)}
            classList={{ active: active() === i() }} aria-selected={String(o.value) === String(props.value)}
            onClick={() => choose(o.value)} onMouseMove={() => setActive(i())}>
            <span class="fs-dot" aria-hidden="true" /><span class="fs-name">{o.label}</span><span class="fs-desc">{o.desc}</span>
          </li>
        )}</For>
      </ul>
    </div>
  );
}

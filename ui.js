/*
 * 带说明的下拉选择：每个选项上面是名字，下面是解释。
 * 用法：<select data-fancy> 里的 <option> 写名字，data-desc 写解释；
 *       页面加载后调用 FancySelect.enhanceAll()。原生 select 保留为数据源，
 *       选中后会触发它的 change 事件；用代码改了 select.value 后调用 FancySelect.refreshAll()。
 * 颜色取页面已有的 --cell --line --ink --muted --accent --hl --surface。
 */
(function (root) {
  'use strict';
  const CSS = `
.fs { position: relative; }
.fs-native { position: absolute !important; width: 1px !important; height: 1px !important; opacity: 0 !important; pointer-events: none !important; overflow: hidden; }
.fs-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: left; font: inherit;
  color: var(--ink); background: var(--cell); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; cursor: pointer; }
.fs-btn:hover { border-color: var(--accent); }
.fs-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.fs-btn .fs-cur { min-width: 0; }
.fs-btn .fs-chev { flex: none; width: 8px; height: 8px; border-right: 2px solid var(--muted); border-bottom: 2px solid var(--muted); transform: rotate(45deg) translateY(-2px); transition: transform .2s; }
.fs.open .fs-chev { transform: rotate(-135deg) translateY(-2px); }
.fs-list { position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 20; margin: 0; padding: 4px; list-style: none;
  background: var(--surface); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, .14); max-height: 60vh; overflow: auto; }
.fs-opt { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 2px 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; outline: none; }
.fs-opt + .fs-opt { margin-top: 2px; }
.fs-opt:hover, .fs-opt.active { background: var(--hl); }
.fs-opt .fs-dot { grid-row: 1 / 3; align-self: start; margin-top: 4px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--line); }
.fs-opt[aria-selected="true"] .fs-dot { border-color: var(--accent); background: radial-gradient(var(--accent) 45%, transparent 50%); }
.fs-opt .fs-name { font-weight: 700; color: var(--ink); line-height: 1.4; }
.fs-opt .fs-desc { font-size: 12.5px; color: var(--muted); line-height: 1.6; }
@media (prefers-reduced-motion: reduce) { .fs-btn .fs-chev { transition: none; } }
`;
  const instances = [];
  let styled = false;
  function addStyle() {
    if (styled) return; styled = true;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  }

  function enhance(sel) {
    if (sel._fs) return sel._fs;
    addStyle();
    const wrap = document.createElement('div'); wrap.className = 'fs';
    sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel);
    sel.classList.add('fs-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');

    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'fs-btn'; btn.id = sel.id + '-fs';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="fs-cur"></span><span class="fs-chev" aria-hidden="true"></span>';
    const list = document.createElement('ul');
    list.className = 'fs-list'; list.setAttribute('role', 'listbox'); list.id = sel.id + '-fs-list'; list.hidden = true;
    btn.setAttribute('aria-controls', list.id);
    wrap.appendChild(btn); wrap.appendChild(list);
    // 原来指向 select 的 label 改指向按钮
    document.querySelectorAll(`label[for="${sel.id}"]`).forEach((l) => { l.htmlFor = btn.id; list.setAttribute('aria-labelledby', l.id || (l.id = sel.id + '-lbl')); });

    const opts = [...sel.options].map((o, i) => {
      const li = document.createElement('li');
      li.className = 'fs-opt'; li.setAttribute('role', 'option'); li.tabIndex = -1; li.dataset.value = o.value; li.id = `${sel.id}-fs-${i}`;
      li.innerHTML = '<span class="fs-dot" aria-hidden="true"></span><span class="fs-name"></span><span class="fs-desc"></span>';
      li.querySelector('.fs-name').textContent = o.textContent;
      li.querySelector('.fs-desc').textContent = o.dataset.desc || '';
      li.addEventListener('click', () => choose(o.value));
      li.addEventListener('mousemove', () => setActive(i));
      list.appendChild(li); return li;
    });
    let active = 0;

    function refresh() {
      const o = sel.options[sel.selectedIndex];
      btn.querySelector('.fs-cur').textContent = o ? o.textContent : '';
      opts.forEach((li) => li.setAttribute('aria-selected', String(li.dataset.value === sel.value)));
      btn.disabled = sel.disabled;
    }
    function setActive(i) {
      active = (i + opts.length) % opts.length;
      opts.forEach((li, j) => li.classList.toggle('active', j === active));
      list.setAttribute('aria-activedescendant', opts[active].id);
      opts[active].focus({ preventScroll: true });
      opts[active].scrollIntoView({ block: 'nearest' });
    }
    function open() {
      instances.forEach((x) => x !== api && x.close());
      list.hidden = false; wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
      setActive(Math.max(0, sel.selectedIndex));
    }
    function close(focusBtn) {
      if (list.hidden) return;
      list.hidden = true; wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
      if (focusBtn) btn.focus();
    }
    function choose(v) {
      const changed = sel.value !== v;
      sel.value = v; refresh(); close(true);
      if (changed) sel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    btn.addEventListener('click', () => (list.hidden ? open() : close(true)));
    btn.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); }
    });
    list.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(opts.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(opts[active].dataset.value); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') close(false);
    });
    document.addEventListener('pointerdown', (e) => { if (!wrap.contains(e.target)) close(false); });
    sel.addEventListener('change', refresh);

    const api = { refresh, close, open, sel };
    sel._fs = api; instances.push(api); refresh();
    return api;
  }

  root.FancySelect = {
    enhance,
    enhanceAll(scope) { (scope || document).querySelectorAll('select[data-fancy]').forEach(enhance); },
    refreshAll() { instances.forEach((x) => x.refresh()); },
  };
})(typeof self !== 'undefined' ? self : this);

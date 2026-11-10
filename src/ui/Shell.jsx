import { createSignal, createMemo, createEffect, For, Show, Switch, Match, onCleanup, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import FancySelect from './FancySelect.jsx';
import { createScheduler, beijingNow, parseDt, esc } from './anim.js';

/**
 * 三式共用的外壳：起式页（时间、所问、设置）→ 自动播放各阶段动画（可跳过）→ 结果（原文 / 过程）。
 * 每一式只提供算法、设置项说明和盘面动画脚本（art.board）。
 */
export default function Shell(props) {
  const art = props.art;
  const sched = createScheduler();

  // ── 设置（记在本机浏览器里）──
  const load = () => {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(art.storageKey) || 'null'); } catch (e) { o = null; }
    return art.parseOpts(Object.assign({}, art.defaults, o || {}));
  };
  const [opts, setOpts] = createStore(load());
  const setOpt = (k, v) => {
    setOpts(k, v);
    try { localStorage.setItem(art.storageKey, JSON.stringify({ ...opts })); } catch (e) { /* 无痕模式等 */ }
  };
  const [extras, setExtras] = createStore(Object.fromEntries((art.extras?.fields || []).map((f) => [f.key, f.initial ?? ''])));

  const [dt, setDt] = createSignal(beijingNow());
  const [question, setQuestion] = createSignal('');
  const [phase, setPhase] = createSignal('intro');
  const [stage, setStage] = createSignal(-1);
  const [tab, setTab] = createSignal('raw');
  const [caption, setCaption] = createSignal('');
  const [explain, setExplain] = createSignal('');
  const [meta, setMeta] = createSignal('');
  const [out, setOut] = createSignal('');
  const [foot, setFoot] = createSignal('');
  const [copyLabel, setCopyLabel] = createSignal('复制文本');
  const [sealOn, setSealOn] = createSignal(false);

  const impacts = createMemo(() => {
    const a = parseDt(dt());
    if (!a) return {};
    try { return art.impacts(a, { ...opts }) || {}; } catch (e) { return {}; }
  });

  let host, ctrl = null, C = null, runToken = 0, q = '';

  const show = (k) => {
    setCaption(art.board.caption(C, k, q));
    setExplain(k >= 0 ? art.board.explain(C, k) : '');
    setMeta(art.board.meta(C, k));
  };
  function jump(k) {
    sched.clear(); sched.setMove(0); sched.setEase('ease-in-out');
    setStage(k); ctrl.staticState(k); show(k);
    requestAnimationFrame(() => sched.setMove(art.board.moveMs));
  }
  function playStage(k) {
    return new Promise((res) => {
      sched.clear(); sched.setMove(0); sched.setEase('ease-in-out');
      ctrl.staticState(k - 1);
      setStage(k); show(k);
      requestAnimationFrame(() => { sched.setMove(art.board.moveMs); ctrl.animate(k, res); });
    });
  }
  async function ritual() {
    const my = ++runToken;
    setSealOn(false); setPhase('ritual'); window.scrollTo({ top: 0, behavior: sched.reduce ? 'auto' : 'smooth' });
    jump(-1);
    await sched.wait(500); if (my !== runToken) return;
    for (let k = 0; k < art.stages.length; k++) { await playStage(k); if (my !== runToken) return; }
    setSealOn(true);
    await sched.wait(1800); if (my !== runToken) return;
    finish();
  }
  function finish() {
    runToken++; sched.clear(); jump(art.stages.length - 1); setSealOn(false);
    // 有交互的步骤（如塔罗抽牌）会在过程中改变结果，结束时重新生成文字
    setOut(art.text(C, q)); setFoot(art.footer(C));
    setPhase('result'); setTab('raw');
  }
  function again() { runToken++; sched.clear(); setPhase('intro'); setDt(beijingNow()); window.scrollTo({ top: 0 }); }

  function onSubmit(e) {
    e.preventDefault();
    const a = parseDt(art.noTime ? beijingNow() : dt()); if (!a) return;
    q = question().trim();
    C = art.cast(a, { ...opts }, { ...extras });
    setOut(art.text(C, q));
    setFoot(art.footer(C));
    ctrl = art.board.mount(host, C, sched);
    ritual();
  }
  async function copy() {
    const ok = () => { setCopyLabel('已复制'); setTimeout(() => setCopyLabel('复制文本'), 1600); };
    try { await navigator.clipboard.writeText(out()); ok(); } catch (e) {
      const el = document.querySelector('pre.out'); const r = document.createRange(); r.selectNodeContents(el);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); setCopyLabel('已选中，按 Ctrl+C 复制');
    }
  }

  createEffect(() => { const on = sealOn(); if (ctrl) ctrl.seal(on); });

  onMount(() => { document.documentElement.dataset.art = art.id; document.title = art.title; });
  onCleanup(() => { runToken++; sched.clear(); delete document.documentElement.dataset.art; });

  const numVal = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : v; };
  const visible = (f) => !f.showIf || f.showIf(opts);

  return (
    <>
      <header class="top">
        <a class="brand" href="#">三式{phase() !== 'intro' ? ' · ' + art.name : ''}</a>
        <Show when={phase() === 'ritual'}><button type="button" class="skip" onClick={finish}>跳过 ›</button></Show>
      </header>

      {/* 第一幕：起式 */}
      <section class="intro" hidden={phase() !== 'intro'}>
        <div class="altar fade-in">
          <div class="wheel" aria-hidden="true"><svg viewBox="-100 -100 200 200" innerHTML={art.wheel()} /></div>
          <h1>{art.name}</h1>
          <div class="sub">{art.sub(opts)}</div>
          <form onSubmit={onSubmit}>
            <div class="field" hidden={!!art.noTime}>
              <label class="label" for="dt">{art.timeLabel}</label>
              <input id="dt" type="datetime-local" required={!art.noTime} value={dt()} onInput={(e) => setDt(e.currentTarget.value)} />
            </div>
            <div class="field">
              <label class="label" for="q">所问之事</label>
              <textarea id="q" rows="2" placeholder={art.placeholder} value={question()} onInput={(e) => setQuestion(e.currentTarget.value)} />
            </div>
            <Show when={art.extras && (!art.extras.showIf || art.extras.showIf(opts))}>
              <div class="field">
                <span class="label">{art.extras.label}</span>
                <div class="pair">
                  <For each={art.extras.fields}>{(f) => (
                    <Switch>
                      <Match when={f.type === 'number'}>
                        <input id={'x-' + f.key} type="number" inputmode="numeric" min={f.min} max={f.max} placeholder={f.placeholder} aria-label={f.aria}
                          value={extras[f.key]} onInput={(e) => setExtras(f.key, e.currentTarget.value)} />
                      </Match>
                      <Match when={f.type === 'select'}>
                        <FancySelect id={'x-' + f.key} value={extras[f.key]} options={f.options} onChange={(v) => setExtras(f.key, v)} />
                      </Match>
                    </Switch>
                  )}</For>
                  <p class="full">{art.extras.note}</p>
                </div>
              </div>
            </Show>
            <details class="settings">
              <summary><span>{art.settingsLabel}</span><span class="sum">{art.optSummary(opts)}</span></summary>
              <div class="opts">
                <For each={art.fields}>{(f) => (
                  <Show when={visible(f)}>
                    <div class="opt">
                      <Switch>
                        <Match when={f.type === 'select'}>
                          <label class="label" id={'l-' + f.key} for={'o-' + f.key}>{f.label}</label>
                          <FancySelect id={'o-' + f.key} labelId={'l-' + f.key} value={opts[f.key]} options={f.options}
                            onChange={(v) => setOpt(f.key, f.number ? +v : v)} />
                        </Match>
                        <Match when={f.type === 'check'}>
                          <span class="label">{f.label}</span>
                          <label class="chk"><input type="checkbox" checked={!!opts[f.key]} onChange={(e) => setOpt(f.key, e.currentTarget.checked)} /> {f.text}</label>
                        </Match>
                        <Match when={f.type === 'numbers'}>
                          <span class="label">{f.label}</span>
                          <div class="inline">
                            <For each={f.items}>{(it) => (
                              <>
                                <label class="note" for={'o-' + it.key}>{it.label}</label>
                                <input type="number" id={'o-' + it.key} min={it.min} max={it.max} step={it.step} value={opts[it.key]}
                                  disabled={f.disabledIf ? f.disabledIf(opts) : false}
                                  onInput={(e) => { const n = numVal(e.currentTarget.value); if (typeof n === 'number') setOpt(it.key, n); }} />
                              </>
                            )}</For>
                            <Show when={f.unit}><span class="note">{f.unit}</span></Show>
                          </div>
                        </Match>
                        <Match when={f.type === 'note'}>
                          <p class="note">{f.text}</p>
                        </Match>
                      </Switch>
                      <Show when={f.what}><p class="what">{f.what}</p></Show>
                      <Show when={f.note && f.type !== 'note'}><p class="note">{f.note}</p></Show>
                      <Show when={impacts()[f.key]}>
                        {(im) => <p class={'impact ' + (im().same ? 'same' : 'diff')} innerHTML={im().html} />}
                      </Show>
                    </div>
                  </Show>
                )}</For>
              </div>
            </details>
            <button type="submit" class="primary go"><span>{art.castWord}</span></button>
          </form>
          <p class="hint">所问之事会写进{art.textName}，{art.castWord}完成后可以复制给 AI 解读。</p>
        </div>
      </section>

      {/* 第二、三幕 */}
      <section class="theater fade-in" classList={{ solo: phase() === 'ritual' }} hidden={phase() === 'intro'}>
        <div class="boardbox">
          <div class="meta" innerHTML={meta()} />
          <div class="boardhost" ref={host} />
          <div class="caption" aria-live="polite" hidden={phase() !== 'ritual'} innerHTML={caption()} />
          <div class="legend" innerHTML={art.board.legend} />
        </div>
        <aside class="side">
          <div class="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab() === 'raw'} onClick={() => { setTab('raw'); jump(art.stages.length - 1); }}>{art.textName}</button>
            <button type="button" role="tab" aria-selected={tab() === 'process'} onClick={() => { setTab('process'); jump(art.stages.length - 1); }}>{art.processName}</button>
          </div>
          <div class="pane" hidden={tab() !== 'raw'}>
            <div class="row"><button type="button" onClick={copy}>{copyLabel()}</button><span class="small">可以粘贴给任何 AI 解读。</span></div>
            <pre class="out">{out()}</pre>
            <p class="small">{foot()}</p>
          </div>
          <div class="pane" hidden={tab() !== 'process'}>
            <ol class="stages">
              <For each={art.stages}>{(name, i) => (
                <li><button type="button" aria-current={stage() === i() ? 'step' : undefined} onClick={() => playStage(i())}>{i() + 1} {name}</button></li>
              )}</For>
            </ol>
            <div class="explain" innerHTML={explain()} />
          </div>
          <div class="row"><button type="button" onClick={again}>{art.againLabel}</button></div>
        </aside>
      </section>
    </>
  );
}

export { esc };

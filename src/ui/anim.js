/**
 * 动画时间轴：统一管理定时器与逐帧补间，便于“跳过”“回看”时一次取消。
 * 各式的盘面脚本只通过这里排时间，不直接调用 setTimeout。
 */
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createScheduler() {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timers = [];
  let rafs = [];
  const later = (ms, fn) => { timers.push(setTimeout(fn, reduce ? 20 : ms)); };
  const clear = () => { timers.forEach(clearTimeout); timers = []; rafs.forEach(cancelAnimationFrame); rafs = []; };
  // 逐帧补间：fn(进度 0..1)
  const tween = (ms, fn, done) => {
    if (reduce) { fn(1); if (done) done(); return; }
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      fn(t);
      if (t < 1) rafs.push(requestAnimationFrame(tick)); else if (done) done();
    };
    rafs.push(requestAnimationFrame(tick));
  };
  const setMove = (ms) => document.documentElement.style.setProperty('--mv', (reduce ? 0 : ms / 1000) + 's');
  const setEase = (e) => document.documentElement.style.setProperty('--ease', e);
  const wait = (ms) => new Promise((r) => later(ms, r));
  return { reduce, later, clear, tween, setMove, setEase, wait, easeInOut };
}

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
export function beijingNow() {
  const d = new Date(Date.now() + 8 * 3600e3);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
export function parseDt(v) {
  if (!v) return null;
  const [ds, ts] = v.split('T');
  if (!ds || !ts) return null;
  const [y, m, d] = ds.split('-').map(Number);
  const [hh, mm] = ts.split(':').map(Number);
  if ([y, m, d, hh, mm].some((x) => !Number.isFinite(x))) return null;
  return [y, m, d, hh, mm];
}

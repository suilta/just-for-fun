/**
 * 起盘记录：存在本机浏览器（localStorage）里，最多 MAX 条，新的在前。
 * 每条记下所用的时间、所问、设置、附加输入，以及有随机或手动步骤的盘（塔罗、六爻）的快照，
 * 打开时据此原样重排，不必存盘面本身。
 */
const KEY = 'guanxiang-history-v1';
export const MAX = 200;

export function loadHistory() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
function store(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); return true; } catch (e) { return false; }
}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** 存一条，返回 id；存不进去（无痕模式、空间满）返回 null */
export function saveRecord(rec) {
  const r = { id: newId(), at: Date.now(), ...rec };
  const list = loadHistory();
  list.unshift(r);
  // 空间不够时丢掉最旧的再试
  while (list.length) { if (store(list)) return r.id; list.pop(); if (!list.length) return null; }
  return null;
}
export const getRecord = (id) => loadHistory().find((r) => r.id === id) || null;
export function removeRecord(id) { store(loadHistory().filter((r) => r.id !== id)); }
export function clearHistory() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }

/** 盘面摘要里的 HTML 转成纯文字 */
export const plain = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

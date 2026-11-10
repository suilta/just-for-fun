/**
 * 盘面截图：把当前盘面连同标题、时间、所问与摘要排成一张卡片，渲染为 PNG。
 * 用 html-to-image 把 DOM 画进图片，并内联所有计算样式，生成的图片不依赖页面。
 */
import { toPng } from 'html-to-image';
import { esc } from './anim.js';
import './share.css';

const SVG_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'opacity',
  'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'color'];

export async function renderShareCard({ host, art, C, question, meta }) {
  const card = document.createElement('div');
  card.className = 'share-card';
  const bg = getComputedStyle(document.body).backgroundColor;
  card.style.background = bg;
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  card.innerHTML = `
    <div class="sc-head"><span class="sc-brand">${esc(art.name)}</span><span class="sc-time">${esc(art.noTime ? '' : C.input.text)}</span></div>
    ${question ? `<div class="sc-q">问：${esc(question)}</div>` : ''}
    <div class="sc-meta">${meta}</div>
    <div class="sc-board"></div>
    <div class="sc-foot">三式排盘 · ${stamp} · 只排盘不断吉凶</div>`;
  const clone = host.cloneNode(true);
  // 截图用的盘面去掉三维翻转（部分浏览器无法把它画进图片），并盖上印章
  clone.classList.add('snap');
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  clone.querySelectorAll('.seal').forEach((el) => el.classList.remove('off'));
  card.querySelector('.sc-board').appendChild(clone);
  document.body.appendChild(card);
  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    // SVG 的填色来自样式表变量，html-to-image 未必带得过去；在克隆上写死成内联样式
    clone.querySelectorAll('svg *').forEach((el) => {
      const cs = getComputedStyle(el);
      for (const p of SVG_PROPS) el.style.setProperty(p, cs.getPropertyValue(p));
    });
    // 克隆会带上离屏定位，渲染时改回原位，否则图片只有底色
    return await toPng(card, { pixelRatio: 2, backgroundColor: bg, cacheBust: true,
      style: { position: 'static', left: '0', top: '0', margin: '0' } });
  } finally {
    card.remove();
  }
}

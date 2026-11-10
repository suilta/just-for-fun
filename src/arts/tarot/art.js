/**
 * 自绘牌面：大阿尔卡那用几何图案，小阿尔卡那按数字排列花色点，宫廷牌为大花色加称谓。
 * 全部是本项目自行设计的 SVG，不使用任何既有牌组的画面。坐标系 60 × 100。
 */
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

const S = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor"';
const star = (cx, cy, r, n = 5, inner = 0.45) => {
  const p = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * inner : r;
    p.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return p.join(' ');
};
const rays = (cx, cy, r1, r2, n) => Array.from({ length: n }, (_, i) => {
  const a = i * 2 * Math.PI / n;
  return `M${(cx + r1 * Math.cos(a)).toFixed(1)} ${(cy + r1 * Math.sin(a)).toFixed(1)}L${(cx + r2 * Math.cos(a)).toFixed(1)} ${(cy + r2 * Math.sin(a)).toFixed(1)}`;
}).join('');

// 二十二张大阿尔卡那的图案（中心约在 30,50）
const MAJOR_ICON = [
  `<circle cx="40" cy="34" r="5" ${S}/><path d="M10 72 L34 72 L42 82" ${S}/><circle cx="26" cy="56" r="3.5" ${S}/><path d="M26 60 L26 68 M22 64 L31 62" ${S}/>`,
  `<path d="M18 50 C18 42 28 42 30 50 C32 58 42 58 42 50 C42 42 32 42 30 50 C28 58 18 58 18 50 Z" ${S}/><path d="M30 64 L30 80 M24 80 L36 80" ${S}/>`,
  `<path d="M16 34 L16 74 M44 34 L44 74" ${S}/><path d="M34 46 A9 9 0 1 1 34 62 A6.5 6.5 0 1 0 34 46 Z" ${F}/>`,
  `<circle cx="30" cy="46" r="10" ${S}/><path d="M30 56 L30 72 M23 65 L37 65" ${S}/><polygon points="${star(30, 30, 4, 5)}" ${F}/>`,
  `<rect x="18" y="44" width="24" height="24" ${S}/><path d="M18 44 L22 34 L26 40 L30 30 L34 40 L38 34 L42 44" ${S}/>`,
  `<path d="M30 30 L30 78 M22 40 L38 40 M20 50 L40 50 M18 60 L42 60" ${S}/>`,
  `<circle cx="24" cy="52" r="10" ${S}/><circle cx="36" cy="52" r="10" ${S}/><polygon points="${star(30, 32, 4, 5)}" ${F}/>`,
  `<rect x="16" y="40" width="28" height="20" ${S}/><circle cx="20" cy="66" r="5" ${S}/><circle cx="40" cy="66" r="5" ${S}/><path d="M30 40 L30 32" ${S}/><polygon points="${star(30, 30, 3, 5)}" ${F}/>`,
  `<path d="M20 34 C20 28 26 28 30 34 C34 40 40 40 40 34 C40 28 34 28 30 34 C26 40 20 40 20 34 Z" ${S}/><circle cx="30" cy="60" r="12" ${S}/><path d="M24 58 L28 62 L36 54" ${S}/>`,
  `<path d="M30 30 L30 80" ${S}/><path d="M22 52 L38 52 L35 66 L25 66 Z" ${S}/><polygon points="${star(30, 59, 3.5, 6)}" ${F}/>`,
  `<circle cx="30" cy="54" r="15" ${S}/><circle cx="30" cy="54" r="4" ${S}/><path d="${rays(30, 54, 4, 15, 8)}" ${S}/>`,
  `<path d="M30 30 L30 80 M14 42 L46 42" ${S}/><path d="M14 42 L9 56 L19 56 Z M46 42 L41 56 L51 56 Z" ${S}/><path d="M24 80 L36 80" ${S}/>`,
  `<path d="M16 30 L44 30 M30 30 L30 58" ${S}/><circle cx="30" cy="64" r="5" ${S}/><path d="M30 58 L22 48 M30 58 L38 48" ${S}/>`,
  `<path d="M10 66 L50 66" ${S}/><path d="M18 66 A12 12 0 0 1 42 66" ${S}/><path d="${rays(30, 66, 15, 21, 12).split('M').filter((x, i) => i > 0 && i <= 7).map((x) => 'M' + x).join('')}" ${S}/>`,
  `<path d="M12 44 L22 44 L20 56 L14 56 Z M38 54 L48 54 L46 66 L40 66 Z" ${S}/><path d="M21 48 C30 46 32 58 39 58" ${S}/><polygon points="${star(30, 32, 3.5, 4)}" ${F}/>`,
  `<path d="M18 36 C18 46 24 48 30 48 C36 48 42 46 42 36" ${S}/><circle cx="30" cy="58" r="8" ${S}/><path d="M26 66 L22 80 M34 66 L38 80" ${S}/>`,
  `<rect x="22" y="38" width="16" height="42" ${S}/><path d="M20 38 L22 32 L26 36 L30 30 L34 36 L38 32 L40 38" ${S}/><path d="M42 24 L34 40 L40 40 L32 56" ${S}/>`,
  `<polygon points="${star(30, 44, 13, 8, 0.4)}" ${F}/><polygon points="${star(16, 70, 3, 8, 0.45)}" ${F}/><polygon points="${star(44, 70, 3, 8, 0.45)}" ${F}/><path d="M20 80 L40 80" ${S}/>`,
  `<path d="M38 36 A14 14 0 1 1 38 64 A10 10 0 1 0 38 36 Z" ${F}/><path d="M12 76 L48 76 M18 82 L42 82" ${S}/>`,
  `<circle cx="30" cy="50" r="9" ${F}/><path d="${rays(30, 50, 12, 19, 12)}" ${S}/>`,
  `<path d="M18 40 L36 34 L36 52 L18 46 Z" ${S}/><path d="M36 38 L44 32 M36 48 L44 54" ${S}/><path d="M14 72 L46 72 M22 72 L22 64 L38 64 L38 72" ${S}/>`,
  `<ellipse cx="30" cy="54" rx="13" ry="20" ${S}/><ellipse cx="30" cy="54" rx="9" ry="15" ${S}/><polygon points="${star(30, 54, 4, 5)}" ${F}/>`,
];

// 花色符号（以 0,0 为中心，约 12 单位高）
const SUIT_ICON = {
  wands: `<path d="M0 -7 L0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M0 -3 C3 -5 4 -3 0 -1 M0 1 C-3 -1 -4 1 0 3" fill="none" stroke="currentColor" stroke-width="1.2"/>`,
  cups: `<path d="M-5 -6 L5 -6 L4 0 C3 3 -3 3 -4 0 Z" fill="currentColor"/><path d="M0 3 L0 6 M-3.5 6.5 L3.5 6.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  swords: `<path d="M0 -8 L1.6 -5 L1.6 3 L-1.6 3 L-1.6 -5 Z" fill="currentColor"/><path d="M-4 3.5 L4 3.5 M0 3.5 L0 7.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  pentacles: `<circle r="6.5" fill="none" stroke="currentColor" stroke-width="1.3"/><polygon points="${star(0, 0, 5, 5, 0.4)}" fill="currentColor"/>`,
};
const PIPS = {
  1: [[30, 52]], 2: [[30, 34], [30, 70]], 3: [[30, 30], [30, 52], [30, 74]], 4: [[20, 34], [40, 34], [20, 70], [40, 70]],
  5: [[20, 34], [40, 34], [30, 52], [20, 70], [40, 70]], 6: [[20, 30], [40, 30], [20, 52], [40, 52], [20, 74], [40, 74]],
  7: [[20, 30], [40, 30], [30, 41], [20, 52], [40, 52], [20, 74], [40, 74]],
  8: [[20, 30], [40, 30], [30, 41], [20, 52], [40, 52], [30, 63], [20, 74], [40, 74]],
  9: [[20, 28], [40, 28], [20, 44], [40, 44], [30, 52], [20, 60], [40, 60], [20, 76], [40, 76]],
  10: [[20, 28], [40, 28], [30, 36], [20, 44], [40, 44], [20, 60], [40, 60], [30, 68], [20, 76], [40, 76]],
};
const COURT = ['侍', '骑', '后', '王'];
const RANK_LABEL = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', '侍从', '骑士', '王后', '国王'];

export function faceSvg(card) {
  let body, top, cls;
  if (card.arcana === 'major') {
    cls = 'major';
    top = ROMAN[card.num];
    body = MAJOR_ICON[card.num];
  } else {
    cls = card.suit;
    top = RANK_LABEL[card.rank - 1];
    const icon = SUIT_ICON[card.suit];
    if (card.rank <= 10) {
      const big = card.rank === 1 ? 2.6 : 1;
      body = PIPS[card.rank].map(([x, y]) => `<g transform="translate(${x} ${y}) scale(${big})">${icon}</g>`).join('');
    } else {
      body = `<g transform="translate(30 46) scale(2.1)">${icon}</g><circle cx="30" cy="72" r="7" fill="none" stroke="currentColor" stroke-width="1.2"/><text x="30" y="75.5" text-anchor="middle" font-size="9" fill="currentColor">${COURT[card.rank - 11]}</text>`;
    }
  }
  return `<svg class="art ${cls}" viewBox="0 0 60 100" aria-hidden="true"><rect x="2.5" y="2.5" width="55" height="95" rx="4" class="frame"/><rect x="5.5" y="5.5" width="49" height="89" rx="2.5" class="frame2"/><text x="30" y="16" text-anchor="middle" class="top">${top}</text><g class="ico">${body}</g><text x="30" y="91" text-anchor="middle" class="nm">${card.name}</text></svg>`;
}

export function backSvg() {
  return `<svg class="art back" viewBox="0 0 60 100" aria-hidden="true"><rect x="2.5" y="2.5" width="55" height="95" rx="4" class="frame"/><rect x="7" y="7" width="46" height="86" rx="2" class="frame2"/><circle cx="30" cy="50" r="14" class="ring"/><polygon points="${star(30, 50, 12, 8, 0.42)}" class="st"/><circle cx="30" cy="50" r="3" class="dot"/><path d="M30 14 L30 24 M30 76 L30 86 M11 50 L16 50 M44 50 L49 50" class="ln"/></svg>`;
}

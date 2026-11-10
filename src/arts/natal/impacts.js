/**
 * 本命盘各设置项对当前出生数据的影响说明（与盘面脚本分开，便于测试）。
 */
import { cast, HOUSE_NAMES, AYANAMSA, SIGNS, signOf, fmtDeg, angDiff } from './core.js';
import { placeOf } from './places.js';

export function natalImpacts(a, o, x) {
  const P = placeOf(x || {});
  const ch = (extra) => cast(...a, Object.assign({}, o, extra), P);
  const cur = ch({});
  const sg = (lon) => SIGNS[signOf(lon)].zh;
  const out = {};
  if (cur.known) {
    const alt = o.house === 'P' ? 'W' : 'P', other = ch({ house: alt });
    const moved = cur.bodies.map((b, i) => (b.house !== other.bodies[i].house ? `${b.zh} ${b.house}→${other.bodies[i].house}` : null)).filter(Boolean);
    out.house = { same: !moved.length, html: `与 ${HOUSE_NAMES[alt]} 相比：${moved.length ? `<b>有 ${moved.length} 颗星换宫</b>（${moved.join('，')}）。` : '<b>十颗行星所在的宫都相同。</b>'}` };
  }
  const tro = o.zodiac === 'tropical' ? cur : ch({ zodiac: 'tropical' }), sid = ch({ zodiac: o.zodiac === 'tropical' ? 'lahiri' : o.zodiac });
  const keyLine = (C) => `太阳${sg(C.bodies[0].lon)}、月亮${sg(C.bodies[1].lon)}${C.known ? `、上升${sg(C.steps.angles.asc)}` : ''}`;
  const sameZ = keyLine(tro) === keyLine(sid);
  out.zodiac = { same: sameZ, html: `回归黄道：${keyLine(tro)}；${o.zodiac === 'tropical' ? '拉希里' : AYANAMSA[o.zodiac].zh.replace(/（.*/, '')}：${keyLine(sid)}。${sameZ ? '<b>这三项星座相同。</b>' : '<b>星座会变。</b>'}` };
  const tn = ch({ node: 'true' }).points[0].lon, mn = ch({ node: 'mean' }).points[0].lon;
  out.node = { same: sg(tn) === sg(mn), html: `真交点与平均交点相差 ${fmtDeg(Math.abs(angDiff(tn, mn)))}；${sg(tn) === sg(mn) ? `<b>都在${sg(tn)}座。</b>` : `<b>星座不同：真交点在${sg(tn)}，平均交点在${sg(mn)}。</b>`}` };
  const cnt = (k) => ch({ orbs: k }).aspects.length;
  const n = { tight: cnt('tight'), standard: cnt('standard'), wide: cnt('wide') };
  out.orbs = { same: n.tight === n.wide, html: `按你填的时间：严格 ${n.tight} 组、标准 ${n.standard} 组、宽松 ${n.wide} 组相位。` };
  const minorN = ch({ minor: true }).aspects.filter((p) => !p.major).length;
  out.minor = { same: minorN === 0, html: `勾选后会多出 <b>${minorN}</b> 组次要相位。` };
  if (cur.known) {
    const r1 = ch({ rulers: 'modern' }).steps.stats.ruler, r2 = ch({ rulers: 'trad' }).steps.stats.ruler;
    out.rulers = { same: r1.key === r2.key, html: r1.key === r2.key ? `上升${sg(cur.steps.angles.asc)}，<b>两种守护的命主星都是${r1.zh}。</b>` : `上升${sg(cur.steps.angles.asc)}：现代守护为<b>${r1.zh}</b>，古典守护为<b>${r2.zh}</b>。` };
    if (o.extra) { const pf = cur.points.find((p) => p.key === 'pof'); out.pofSect = { same: pf.day, html: pf.day ? '这一时刻是<b>日生</b>，两种公式结果相同。' : '这一时刻是<b>夜生</b>，两种公式的福点不同。' }; }
  }
  return out;
}

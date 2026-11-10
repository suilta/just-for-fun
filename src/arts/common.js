/**
 * 三式共用的设置项（换日、真太阳时）及其“对当前时间的影响”说明。
 */
export const DAY_CHANGE_FIELD = (extra = '') => ({
  type: 'select', key: 'dayChange', label: '换日', number: true, options: [
    { value: 23, label: '23 点换日（默认）', desc: '晚上 23 点（子时开始）就算第二天，日柱换成次日。' + extra },
    { value: 0, label: '0 点换日', desc: '到半夜 0 点才换日，23 点到 0 点之间日柱仍算当天。' },
  ],
});

export const solarFields = (text, lonLabel, extraWhat = '') => [
  { type: 'check', key: 'solar', label: '真太阳时', text, what: '钟表上的北京时间是按东经 120° 定的。真太阳时按当地经度和当天的太阳位置校正，离东经 120° 越远差得越多，西部地区常差一小时左右，可能换一个时辰。' + extraWhat },
  { type: 'numbers', key: 'lon', label: lonLabel, items: [{ key: 'lon', label: '东经', min: 70, max: 140, step: 0.01 }], unit: '度',
    note: '例如北京 116.40、上海 121.47、成都 104.07、广州 113.26。', disabledIf: (o) => !o.solar },
];

/** ch(extra) 用当前设置加 extra 起一次盘；same23(a23, a0) 判断除日柱外的结果是否也相同 */
export function dayChangeImpact(o, ch, same23, tail) {
  const d23 = ch({ dayChange: 23 }), d0 = ch({ dayChange: 0 });
  const same = d23.steps.pillars.day === d0.steps.pillars.day && same23(d23, d0);
  const when = o.solar ? `按你填的时间换算成真太阳时 ${d23.steps.pillars.clock.slice(11)}` : '按你填的时间';
  return { same, html: same ? `${when}：不在 23 点到 0 点之间，<b>两种换日结果相同。</b>` : `${when}：正好在 23 点后，<b>日柱会不同</b>（23 点换日为 ${d23.steps.pillars.day}，0 点换日为 ${d0.steps.pillars.day}），${tail}。` };
}

/** 比较开、关真太阳时：same(s1, s0) 判断结果是否相同，yes(s0) / no(s0, s1) 生成结论 */
export function solarImpact(o, ch, { same, yes, no }) {
  const s1 = ch({ solar: true }), s0 = ch({ solar: false });
  const off = (o.lon - 120) * 4 + s1.steps.pillars.eot;
  const ok = same(s1, s0);
  return { same: ok, html: `东经 ${o.lon}° 的真太阳时为 ${s1.steps.pillars.clock.slice(11)}（与北京时间差 ${off >= 0 ? '+' : ''}${off.toFixed(0)} 分钟）。` + (ok ? `<b>${yes(s0)}</b>` : `<b>${no(s0, s1)}</b>`) };
}

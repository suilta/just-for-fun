/**
 * 本命盘的出生地：常用城市（经纬度与 IANA 时区）、时区选项，以及把输入换成 place。
 */
const CN = '北京时间（含 1986–1991 年夏令时）';
// [值, 名称, 纬度, 经度, 时区]
export const CITY_ROWS = [
  ['beijing', '北京', 39.90, 116.40], ['shanghai', '上海', 31.23, 121.47], ['guangzhou', '广州', 23.13, 113.26], ['shenzhen', '深圳', 22.54, 114.06],
  ['chengdu', '成都', 30.57, 104.07], ['chongqing', '重庆', 29.56, 106.55], ['wuhan', '武汉', 30.59, 114.31], ['xian', '西安', 34.34, 108.94],
  ['hangzhou', '杭州', 30.27, 120.16], ['nanjing', '南京', 32.06, 118.80], ['tianjin', '天津', 39.13, 117.20], ['shenyang', '沈阳', 41.81, 123.43],
  ['harbin', '哈尔滨', 45.80, 126.53], ['changchun', '长春', 43.82, 125.32], ['dalian', '大连', 38.91, 121.61], ['jinan', '济南', 36.65, 117.12],
  ['qingdao', '青岛', 36.07, 120.38], ['zhengzhou', '郑州', 34.75, 113.62], ['changsha', '长沙', 28.23, 112.94], ['nanchang', '南昌', 28.68, 115.86],
  ['fuzhou', '福州', 26.07, 119.30], ['xiamen', '厦门', 24.48, 118.09], ['hefei', '合肥', 31.82, 117.23], ['taiyuan', '太原', 37.87, 112.55],
  ['shijiazhuang', '石家庄', 38.04, 114.51], ['kunming', '昆明', 25.04, 102.71], ['guiyang', '贵阳', 26.65, 106.63], ['nanning', '南宁', 22.82, 108.37],
  ['haikou', '海口', 20.04, 110.20], ['lanzhou', '兰州', 36.06, 103.83], ['xining', '西宁', 36.62, 101.78], ['yinchuan', '银川', 38.49, 106.23],
  ['hohhot', '呼和浩特', 40.84, 111.75], ['urumqi', '乌鲁木齐', 43.83, 87.62], ['lhasa', '拉萨', 29.65, 91.14],
  ['hongkong', '香港', 22.32, 114.17, 'Asia/Hong_Kong'], ['macau', '澳门', 22.20, 113.54, 'Asia/Macau'], ['taipei', '台北', 25.03, 121.57, 'Asia/Taipei'],
  ['tokyo', '东京', 35.68, 139.69, 'Asia/Tokyo'], ['seoul', '首尔', 37.57, 126.98, 'Asia/Seoul'], ['singapore', '新加坡', 1.35, 103.82, 'Asia/Singapore'],
  ['kualalumpur', '吉隆坡', 3.14, 101.69, 'Asia/Kuala_Lumpur'], ['bangkok', '曼谷', 13.76, 100.50, 'Asia/Bangkok'],
  ['london', '伦敦', 51.51, -0.13, 'Europe/London'], ['paris', '巴黎', 48.86, 2.35, 'Europe/Paris'], ['berlin', '柏林', 52.52, 13.40, 'Europe/Berlin'],
  ['moscow', '莫斯科', 55.76, 37.62, 'Europe/Moscow'], ['newyork', '纽约', 40.71, -74.01, 'America/New_York'], ['chicago', '芝加哥', 41.88, -87.63, 'America/Chicago'],
  ['losangeles', '洛杉矶', 34.05, -118.24, 'America/Los_Angeles'], ['sanfrancisco', '旧金山', 37.77, -122.42, 'America/Los_Angeles'],
  ['seattle', '西雅图', 47.61, -122.33, 'America/Los_Angeles'], ['toronto', '多伦多', 43.65, -79.38, 'America/Toronto'],
  ['vancouver', '温哥华', 49.28, -123.12, 'America/Vancouver'], ['sydney', '悉尼', -33.87, 151.21, 'Australia/Sydney'],
  ['melbourne', '墨尔本', -37.81, 144.96, 'Australia/Melbourne'], ['auckland', '奥克兰', -36.85, 174.76, 'Pacific/Auckland'],
];
export const ZONE_ZH = { 'Asia/Shanghai': CN, 'Asia/Hong_Kong': '香港时间（含历史夏令时）', 'Asia/Macau': '澳门时间（含历史夏令时）', 'Asia/Taipei': '台湾时间（含历史夏令时）',
  'Asia/Tokyo': '日本时间', 'Asia/Seoul': '韩国时间', 'Asia/Singapore': '新加坡时间', 'Asia/Kuala_Lumpur': '马来西亚时间', 'Asia/Bangkok': '泰国时间',
  'Europe/London': '英国时间（含夏令时）', 'Europe/Paris': '法国时间（含夏令时）', 'Europe/Berlin': '德国时间（含夏令时）', 'Europe/Moscow': '莫斯科时间（含历史变更）',
  'America/New_York': '美东时间（含夏令时）', 'America/Chicago': '美中时间（含夏令时）', 'America/Los_Angeles': '美西时间（含夏令时）', 'America/Toronto': '加东时间（含夏令时）',
  'America/Vancouver': '加西时间（含夏令时）', 'Australia/Sydney': '悉尼时间（含夏令时）', 'Australia/Melbourne': '墨尔本时间（含夏令时）', 'Pacific/Auckland': '新西兰时间（含夏令时）' };
export const ll = (lat, lon) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
export const CITIES = Object.fromEntries(CITY_ROWS.map(([v, name, lat, lon, tz = 'Asia/Shanghai']) => [v, { name, lat, lon, tz }]));

export const ZONES = [...Object.keys(ZONE_ZH).map((z) => ({ value: z, label: ZONE_ZH[z], desc: z + '：按当地历史时区规则自动判断夏令时。' })),
  ...Array.from({ length: 27 }, (_, i) => i - 12).map((h) => ({ value: `UTC${h < 0 ? '-' : '+'}${Math.abs(h)}`, label: `固定 UTC${h < 0 ? '−' : '+'}${Math.abs(h)}`, desc: '不考虑夏令时，按固定偏移换算。' })),
  { value: 'UTC+5:30', label: '固定 UTC+5:30', desc: '印度标准时间。' }];

/** 由出生地输入得到 place；自定义经纬度不合法时退回北京 */
export function placeOf(x) {
  const known = x.tk !== 'no';
  if (x.city && x.city !== 'custom' && CITIES[x.city]) return { ...CITIES[x.city], timeKnown: known };
  const lat = parseFloat(x.lat), lon = parseFloat(x.lon);
  const ok = Number.isFinite(lat) && Math.abs(lat) <= 89.9 && Number.isFinite(lon) && Math.abs(lon) <= 180;
  return ok ? { name: '', lat, lon, tz: x.tz || 'Asia/Shanghai', timeKnown: known } : { ...CITIES.beijing, timeKnown: known, fallback: true };
}


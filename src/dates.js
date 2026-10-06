export function todayStr(d = new Date()) {
  return formatYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function formatYMD(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function ymdToUTC(s) {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// 用 UTC 计算，避免夏令时导致少一天或多一天
export function addDays(s, n) {
  const t = new Date(ymdToUTC(s) + n * 86400000);
  return formatYMD(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

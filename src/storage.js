export const STORAGE_KEY = 'ketVocab.v1';
export const SCREEN_OPTIONS = [30, 50, 100];
export const TIMER_OPTIONS = [0, 5, 8, 12];
const REC_STATUSES = ['known', 'forgotten', 'recovered'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function defaultState() {
  return {
    version: 1,
    settings: { dailyScreen: 50, timerSec: 8, spelling: true },
    words: {},
    today: null,
    stats: { stars: 0, streakDays: 0, lastCheckin: null, history: {} },
  };
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isStringArray(v) {
  return Array.isArray(v) && v.every(x => typeof x === 'string');
}

export function validateState(s) {
  if (!isPlainObject(s) || s.version !== 1) return false;
  const st = s.settings;
  if (!isPlainObject(st) || !SCREEN_OPTIONS.includes(st.dailyScreen) || !TIMER_OPTIONS.includes(st.timerSec) || typeof st.spelling !== 'boolean') return false;
  if (!isPlainObject(s.words)) return false;
  for (const r of Object.values(s.words)) {
    if (!isPlainObject(r) || !REC_STATUSES.includes(r.status) || !Number.isInteger(r.streak) || !DATE_RE.test(r.due)) return false;
  }
  if (s.today !== null) {
    const t = s.today;
    if (!isPlainObject(t) || !DATE_RE.test(t.date)) return false;
    if (![t.reviewIds, t.screenIds, t.reviewDone, t.screenDone].every(isStringArray)) return false;
    if (typeof t.reviewStarred !== 'boolean' || typeof t.screenStarred !== 'boolean') return false;
  }
  const x = s.stats;
  if (!isPlainObject(x) || typeof x.stars !== 'number' || !Number.isInteger(x.streakDays)) return false;
  if (!(x.lastCheckin === null || DATE_RE.test(x.lastCheckin)) || !isPlainObject(x.history)) return false;
  return true;
}

export function getStorage() {
  try {
    const ls = window.localStorage;
    const probe = STORAGE_KEY + '.probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export function loadState(storage) {
  if (!storage) return { state: defaultState(), warning: 'unavailable' };
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: defaultState(), warning: 'unavailable' };
  }
  if (raw === null) return { state: defaultState(), warning: null };
  try {
    const parsed = JSON.parse(raw);
    if (validateState(parsed)) return { state: parsed, warning: null };
  } catch {
    // 落到下面按损坏处理
  }
  try {
    storage.setItem(STORAGE_KEY + '.broken', raw);
  } catch {
    // 另存失败也继续启动
  }
  return { state: defaultState(), warning: 'corrupt' };
}

export function saveState(storage, state) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportJSON(state) {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('文件不是有效的备份');
  }
  if (!validateState(parsed)) throw new Error('文件不是有效的备份');
  return parsed;
}

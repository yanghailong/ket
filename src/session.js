import { screenResult, reviewResult, checkResult } from './srs.js';
import { isComplete } from './daily.js';
import { applyCheckin, TASK_STARS } from './rewards.js';

export function emptyHistoryDay() {
  return { screenRight: 0, screenTotal: 0, reviewRight: 0, reviewTotal: 0, checked: false };
}

export function recordAnswer(state, id, kind, ok) {
  const date = state.today.date;
  const doneKey = kind === 'screen' ? 'screenDone' : 'reviewDone';
  if (state.today[doneKey].includes(id)) return state;
  let rec;
  if (kind === 'screen') rec = screenResult(ok, date);
  else if (kind === 'review') rec = reviewResult(state.words[id], ok, date);
  else rec = checkResult(state.words[id], ok, date);
  const day = { ...emptyHistoryDay(), ...state.stats.history[date] };
  if (kind === 'screen') {
    day.screenTotal++;
    if (ok) day.screenRight++;
  } else {
    day.reviewTotal++;
    if (ok) day.reviewRight++;
  }
  return {
    ...state,
    words: { ...state.words, [id]: rec },
    today: { ...state.today, [doneKey]: [...state.today[doneKey], id] },
    stats: { ...state.stats, history: { ...state.stats.history, [date]: day } },
  };
}

export function settle(state) {
  const date = state.today.date;
  const today = { ...state.today };
  let stats = state.stats;
  const events = [];
  for (const task of ['review', 'screen']) {
    const list = today[`${task}Ids`];
    const flag = `${task}Starred`;
    if (list.length > 0 && !today[flag] && isComplete(list, today[`${task}Done`])) {
      today[flag] = true;
      stats = { ...stats, stars: stats.stars + TASK_STARS };
      events.push({ type: 'task', task, stars: TASK_STARS });
    }
  }
  const day = { ...emptyHistoryDay(), ...stats.history[date] };
  if (!day.checked && isComplete(today.reviewIds, today.reviewDone) && isComplete(today.screenIds, today.screenDone)) {
    const r = applyCheckin(stats, date);
    stats = { ...r.stats, history: { ...r.stats.history, [date]: { ...day, checked: true } } };
    events.push({ type: 'checkin', stars: r.gained, streakDays: stats.streakDays });
  }
  return { state: { ...state, today, stats }, events };
}

export function normalizeSpelling(s) {
  return s.trim().toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/\s+/g, ' ');
}

export function isSpellingCorrect(input, en) {
  return normalizeSpelling(input) !== '' && normalizeSpelling(input) === normalizeSpelling(en);
}

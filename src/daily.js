export const REVIEW_CAP = 40;

export function buildToday(words, progress, settings, today) {
  const order = new Map(words.map((w, i) => [w.id, i]));
  const reviewIds = Object.keys(progress)
    .filter(id => order.has(id) && progress[id].due <= today)
    .sort((a, b) => {
      const da = progress[a].due, db = progress[b].due;
      if (da !== db) return da < db ? -1 : 1;
      return order.get(a) - order.get(b);
    })
    .slice(0, REVIEW_CAP);
  const screenIds = words.filter(w => !progress[w.id]).slice(0, settings.dailyScreen).map(w => w.id);
  return { date: today, reviewIds, screenIds, reviewDone: [], screenDone: [], reviewStarred: false, screenStarred: false };
}

export function ensureToday(state, words, today) {
  if (!state.today || state.today.date !== today) {
    return { ...state, today: buildToday(words, state.words, state.settings, today) };
  }
  const valid = new Set(words.map(w => w.id));
  const t = state.today;
  if (t.reviewIds.every(id => valid.has(id)) && t.screenIds.every(id => valid.has(id))) return state;
  return {
    ...state,
    today: { ...t, reviewIds: t.reviewIds.filter(id => valid.has(id)), screenIds: t.screenIds.filter(id => valid.has(id)) },
  };
}

export function remaining(list, done) {
  const doneSet = new Set(done);
  return list.filter(id => !doneSet.has(id));
}

export function isComplete(list, done) {
  return remaining(list, done).length === 0;
}

export function countByStatus(words, progress) {
  const counts = { new: 0, known: 0, forgotten: 0, recovered: 0 };
  for (const w of words) counts[progress[w.id] ? progress[w.id].status : 'new']++;
  return counts;
}

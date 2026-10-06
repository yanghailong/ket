function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickDistractors(word, words, field = 'zh', rng = Math.random) {
  const usedLabels = new Set([word[field]]);
  const picked = [];
  const tiers = [
    w => w.topic === word.topic && w.pos === word.pos,
    w => w.pos === word.pos,
    () => true,
  ];
  for (const tier of tiers) {
    const pool = shuffleInPlace(words.filter(w => w.id !== word.id && tier(w)), rng);
    for (const w of pool) {
      if (picked.length === 3) return picked;
      if (usedLabels.has(w[field])) continue;
      usedLabels.add(w[field]);
      picked.push(w);
    }
  }
  return picked;
}

export function buildChoices(word, words, field = 'zh', rng = Math.random) {
  return shuffleInPlace([word, ...pickDistractors(word, words, field, rng)], rng)
    .map(w => ({ id: w.id, label: w[field], correct: w.id === word.id }));
}

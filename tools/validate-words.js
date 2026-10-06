export const POS_LIST = ['n.', 'v.', 'adj.', 'adv.', 'prep.', 'pron.', 'conj.', 'det.', 'num.', 'excl.', 'phr.'];
const FIELDS = ['id', 'en', 'ipa', 'pos', 'zh', 'topic', 'ex', 'exZh'];
const EN_RE = /^[A-Za-z][A-Za-z' .\-]*$/;

export function validateWords(words, topics) {
  const errors = [];
  const topicKeys = new Set(topics.map(t => t.key));
  const seen = new Set();
  for (const w of words) {
    const tag = typeof w.en === 'string' ? w.en : JSON.stringify(w);
    const missing = FIELDS.filter(f => typeof w[f] !== 'string' || w[f].trim() === '');
    if (missing.length) { errors.push(`${tag}: 缺少 ${missing.join(', ')}`); continue; }
    const key = w.en.toLowerCase();
    if (seen.has(key)) { errors.push(`${tag}: 重复`); continue; }
    seen.add(key);
    if (!EN_RE.test(w.en) || w.en !== w.en.trim()) errors.push(`${tag}: 英文含非法字符`);
    else if (!POS_LIST.includes(w.pos)) errors.push(`${tag}: 词性不合法 ${w.pos}`);
    else if (!topicKeys.has(w.topic)) errors.push(`${tag}: 话题不合法 ${w.topic}`);
    else if (!/^\/.+\/$/.test(w.ipa)) errors.push(`${tag}: 音标需用 / / 包起来`);
  }
  return errors;
}

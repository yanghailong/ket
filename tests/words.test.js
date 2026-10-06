import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, WORD_BY_ID } from '../src/words/index.js';
import { TOPICS } from '../src/words/topics.js';
import { validateWords } from '../tools/validate-words.js';

test('词库结构全部合法', () => {
  assert.deepEqual(validateWords(WORDS, TOPICS), []);
});

test('已填写的话题，词数接近目标', () => {
  for (const t of TOPICS) {
    const n = WORDS.filter(w => w.topic === t.key).length;
    if (n === 0) continue;
    assert.ok(n >= t.target - 10 && n <= t.target + 20, `${t.key}: ${n} 词，目标 ${t.target}`);
  }
});

test('WORD_BY_ID 与 WORDS 一一对应，id 等于英文', () => {
  assert.equal(WORD_BY_ID.size, WORDS.length);
  assert.ok(WORDS.every(w => w.id === w.en && WORD_BY_ID.get(w.id) === w));
});

test('validateWords 能发现常见错误', () => {
  const ok = { id: 'cat', en: 'cat', ipa: '/kæt/', pos: 'n.', zh: '猫', topic: 'animals', ex: 'I have a cat.', exZh: '我有一只猫。' };
  const errs = validateWords([
    ok,
    { ...ok, id: 'Cat', en: 'Cat' },                         // 重复（不区分大小写）
    { ...ok, id: 'dog', en: 'dog', pos: 'noun' },            // 词性不合法
    { ...ok, id: 'pig', en: 'pig', ipa: 'pɪɡ' },             // 音标没有用 / / 包起来
    { ...ok, id: 'cow', en: 'cow', topic: 'zoo' },           // 话题不合法
    { ...ok, id: 'hen', en: 'hen', exZh: '' },               // 缺字段
    { ...ok, id: 'o’clock', en: 'o’clock' },                 // 弯引号等非法字符
  ], TOPICS);
  assert.equal(errs.length, 6);
});

test('词库总数在 1400–1600 之间', () => {
  assert.ok(WORDS.length >= 1400 && WORDS.length <= 1600, `当前 ${WORDS.length} 词`);
});

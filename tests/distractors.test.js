import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickDistractors, buildChoices } from '../src/distractors.js';

function seeded(seed = 1) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const W = (id, zh, topic, pos) => ({ id, en: id, zh, topic, pos });
const words = [
  W('cat', '猫', 'animals', 'n.'), W('dog', '狗', 'animals', 'n.'), W('bird', '鸟', 'animals', 'n.'),
  W('fish', '鱼', 'animals', 'n.'), W('kitty', '猫', 'animals', 'n.'), W('horse', '马', 'animals', 'n.'),
  W('run', '跑', 'verbs', 'v.'), W('big', '大的', 'describe', 'adj.'),
  W('apple', '苹果', 'food', 'n.'), W('bread', '面包', 'food', 'n.'),
];

test('3 个干扰项：不含正确词、不含同中文的词、彼此中文不同', () => {
  for (let seed = 1; seed < 30; seed++) {
    const d = pickDistractors(words[0], words, 'zh', seeded(seed));
    assert.equal(d.length, 3);
    const zhs = d.map(w => w.zh);
    assert.ok(!zhs.includes('猫'));
    assert.equal(new Set(zhs).size, 3);
  }
});

test('同话题同词性的候选足够时，全部从里面挑', () => {
  const d = pickDistractors(words[0], words, 'zh', seeded(7));
  assert.ok(d.every(w => w.topic === 'animals' && w.pos === 'n.'));
});

test('同话题不够时，用同词性的词补足', () => {
  const d = pickDistractors(words[8], words, 'zh', seeded(3)); // apple：同话题只有 bread
  assert.equal(d.length, 3);
  assert.ok(d.some(w => w.id === 'bread'));
  assert.ok(d.every(w => w.pos === 'n.'));
});

test('buildChoices：4 个选项，只有 1 个正确；field=en 时显示英文', () => {
  const c = buildChoices(words[0], words, 'zh', seeded(5));
  assert.equal(c.length, 4);
  assert.equal(c.filter(x => x.correct).length, 1);
  assert.equal(c.find(x => x.correct).label, '猫');
  const e = buildChoices(words[0], words, 'en', seeded(5));
  assert.equal(e.find(x => x.correct).label, 'cat');
});

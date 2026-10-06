import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildToday, ensureToday, remaining, isComplete, countByStatus, REVIEW_CAP } from '../src/daily.js';

const D = '2026-10-06';
const words = Array.from({ length: 120 }, (_, i) => ({ id: `w${i}`, en: `w${i}`, zh: `词${i}`, pos: 'n.', topic: i < 60 ? 'a' : 'b' }));
const settings = { dailyScreen: 50, timerSec: 8, spelling: true };
const rec = (status, due) => ({ status, streak: 0, due, lastSeen: '2026-10-01' });

test('复习只取已到期的词，按到期日从早到晚排', () => {
  const progress = {
    w5: rec('forgotten', '2026-10-06'),
    w2: rec('forgotten', '2026-10-03'),
    w9: rec('known', '2026-10-05'),
    w7: rec('forgotten', '2026-10-07'), // 今天新标记的遗忘词，明天才到期
  };
  const t = buildToday(words, progress, settings, D);
  assert.deepEqual(t.reviewIds, ['w2', 'w9', 'w5']);
});

test('复习最多 40 个，最早到期的优先，其余顺延', () => {
  const progress = {};
  for (let i = 0; i < 50; i++) progress[`w${i}`] = rec('forgotten', i < 10 ? '2026-10-01' : '2026-10-05');
  const t = buildToday(words, progress, settings, D);
  assert.equal(t.reviewIds.length, REVIEW_CAP);
  assert.deepEqual(t.reviewIds.slice(0, 10), Array.from({ length: 10 }, (_, i) => `w${i}`));
});

test('筛查按词库顺序取未筛查的词，数量按设置', () => {
  const progress = { w0: rec('known', '2026-11-01'), w1: rec('forgotten', '2026-10-07') };
  const t = buildToday(words, progress, { ...settings, dailyScreen: 30 }, D);
  assert.equal(t.screenIds.length, 30);
  assert.equal(t.screenIds[0], 'w2');
  assert.equal(t.screenIds[29], 'w31');
});

test('未筛查的词不足时全部取出；没有就为空', () => {
  const progress = {};
  for (let i = 0; i < 100; i++) progress[`w${i}`] = rec('known', '2026-11-01');
  assert.equal(buildToday(words, progress, settings, D).screenIds.length, 20);
  for (let i = 100; i < 120; i++) progress[`w${i}`] = rec('known', '2026-11-01');
  assert.deepEqual(buildToday(words, progress, settings, D).screenIds, []);
});

test('新的一天任务初始状态', () => {
  const t = buildToday(words, {}, settings, D);
  assert.equal(t.date, D);
  assert.deepEqual([t.reviewDone, t.screenDone, t.reviewStarred, t.screenStarred], [[], [], false, false]);
});

test('进度里已从词库删除的词不会进入复习（Review Focus 4）', () => {
  const progress = { gone: rec('forgotten', '2026-10-01'), w3: rec('forgotten', '2026-10-01') };
  assert.deepEqual(buildToday(words, progress, settings, D).reviewIds, ['w3']);
});

test('ensureToday：同一天返回同一个对象，跨天重建', () => {
  const state = { settings, words: {}, today: buildToday(words, {}, settings, D) };
  assert.equal(ensureToday(state, words, D), state);
  const next = ensureToday(state, words, '2026-10-07');
  assert.notEqual(next, state);
  assert.equal(next.today.date, '2026-10-07');
  assert.equal(ensureToday({ settings, words: {}, today: null }, words, D).today.date, D);
});

test('ensureToday：同一天时去掉失效的 id（Review Focus 4）', () => {
  const today = { ...buildToday(words, {}, settings, D), reviewIds: ['gone', 'w1'], screenIds: ['w2', 'gone2'] };
  const next = ensureToday({ settings, words: {}, today }, words, D);
  assert.deepEqual(next.today.reviewIds, ['w1']);
  assert.deepEqual(next.today.screenIds, ['w2']);
});

test('remaining / isComplete', () => {
  assert.deepEqual(remaining(['a', 'b', 'c'], ['b']), ['a', 'c']);
  assert.equal(isComplete(['a'], ['a']), true);
  assert.equal(isComplete([], []), true);
  assert.equal(isComplete(['a', 'b'], ['a']), false);
});

test('countByStatus 只统计词库里存在的词', () => {
  const c = countByStatus(words, { w0: rec('known', D), w1: rec('forgotten', D), w2: rec('recovered', D), gone: rec('known', D) });
  assert.deepEqual(c, { new: 117, known: 1, forgotten: 1, recovered: 1 });
});

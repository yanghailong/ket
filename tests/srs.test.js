import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenResult, reviewResult, checkResult, isCheckItem } from '../src/srs.js';

const D = '2026-10-06';

test('筛查答对 → 已掌握，30 天后抽查', () => {
  assert.deepEqual(screenResult(true, D), { status: 'known', streak: 0, due: '2026-11-05', lastSeen: D });
});

test('筛查答错 → 遗忘，明天复习', () => {
  assert.deepEqual(screenResult(false, D), { status: 'forgotten', streak: 0, due: '2026-10-07', lastSeen: D });
});

test('按时复习：第 1、3、7 天，第 3 次通过后变成已捡回', () => {
  let r = screenResult(false, '2026-10-06');
  assert.equal(r.due, '2026-10-07');
  r = reviewResult(r, true, '2026-10-07');
  assert.deepEqual(r, { status: 'forgotten', streak: 1, due: '2026-10-09', lastSeen: '2026-10-07' });
  r = reviewResult(r, true, '2026-10-09');
  assert.deepEqual(r, { status: 'forgotten', streak: 2, due: '2026-10-13', lastSeen: '2026-10-09' });
  r = reviewResult(r, true, '2026-10-13');
  assert.deepEqual(r, { status: 'recovered', streak: 0, due: '2026-11-12', lastSeen: '2026-10-13' });
});

test('复习失败 → streak 归零，明天再复习', () => {
  const r = reviewResult({ status: 'forgotten', streak: 2, due: D, lastSeen: '2026-10-02' }, false, D);
  assert.deepEqual(r, { status: 'forgotten', streak: 0, due: '2026-10-07', lastSeen: D });
});

test('抽查答对：状态不变，再过 30 天抽查', () => {
  const r = checkResult({ status: 'recovered', streak: 0, due: D, lastSeen: '2026-09-06' }, true, D);
  assert.deepEqual(r, { status: 'recovered', streak: 0, due: '2026-11-05', lastSeen: D });
});

test('抽查答错 → 遗忘，明天复习', () => {
  const r = checkResult({ status: 'known', streak: 0, due: D, lastSeen: '2026-09-06' }, false, D);
  assert.deepEqual(r, { status: 'forgotten', streak: 0, due: '2026-10-07', lastSeen: D });
});

test('isCheckItem', () => {
  assert.equal(isCheckItem({ status: 'known' }), true);
  assert.equal(isCheckItem({ status: 'recovered' }), true);
  assert.equal(isCheckItem({ status: 'forgotten' }), false);
});

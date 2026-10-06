import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCheckin, displayStreak, streakBonus } from '../src/rewards.js';

const base = { stars: 0, streakDays: 0, lastCheckin: null, history: {} };

test('第一次打卡：连续 1 天，+5', () => {
  const r = applyCheckin(base, '2026-10-06');
  assert.equal(r.gained, 5);
  assert.deepEqual(r.stats, { ...base, stars: 5, streakDays: 1, lastCheckin: '2026-10-06' });
});

test('昨天打过卡 → 连续天数 +1；断了一天 → 重新从 1 算，星星不扣', () => {
  const s = { ...base, stars: 40, streakDays: 3, lastCheckin: '2026-10-05' };
  assert.equal(applyCheckin(s, '2026-10-06').stats.streakDays, 4);
  const broken = applyCheckin({ ...s, lastCheckin: '2026-10-04' }, '2026-10-06').stats;
  assert.equal(broken.streakDays, 1);
  assert.equal(broken.stars, 45);
});

test('连续 7 天 +20，30 天 +100，210 天两者都有', () => {
  assert.equal(streakBonus(6), 0);
  assert.equal(streakBonus(7), 20);
  assert.equal(streakBonus(14), 20);
  assert.equal(streakBonus(30), 100);
  assert.equal(streakBonus(210), 120);
  const r = applyCheckin({ ...base, streakDays: 6, lastCheckin: '2026-10-05' }, '2026-10-06');
  assert.equal(r.gained, 25);
});

test('displayStreak：今天或昨天打过卡才显示，否则显示 0', () => {
  const s = { ...base, streakDays: 5, lastCheckin: '2026-10-05' };
  assert.equal(displayStreak(s, '2026-10-05'), 5);
  assert.equal(displayStreak(s, '2026-10-06'), 5);
  assert.equal(displayStreak(s, '2026-10-07'), 0);
  assert.equal(displayStreak(base, '2026-10-07'), 0);
});

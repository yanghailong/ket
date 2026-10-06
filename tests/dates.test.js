import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayStr, addDays } from '../src/dates.js';

test('todayStr 用本地日期并补零', () => {
  assert.equal(todayStr(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(todayStr(new Date(2026, 9, 6, 0, 0)), '2026-10-06');
});

test('addDays 跨月、跨年、闰年', () => {
  assert.equal(addDays('2026-10-06', 1), '2026-10-07');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-10-06', 30), '2026-11-05');
});

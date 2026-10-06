import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, validateState, loadState, saveState, exportJSON, importJSON, STORAGE_KEY } from '../src/storage.js';

class FakeStorage {
  constructor(init = {}) { this.map = new Map(Object.entries(init)); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}
class BrokenStorage {
  getItem() { throw new Error('denied'); }
  setItem() { throw new Error('quota'); }
}

function sampleState() {
  const s = defaultState();
  s.words.cat = { status: 'forgotten', streak: 1, due: '2026-10-08', lastSeen: '2026-10-06' };
  s.today = { date: '2026-10-06', reviewIds: ['cat'], screenIds: ['dog'], reviewDone: [], screenDone: ['dog'], reviewStarred: false, screenStarred: true };
  s.stats.stars = 15;
  return s;
}

test('defaultState 合法，默认设置正确', () => {
  const s = defaultState();
  assert.equal(validateState(s), true);
  assert.deepEqual(s.settings, { dailyScreen: 50, timerSec: 8, spelling: true });
});

test('没有存储可用 → unavailable', () => {
  assert.equal(loadState(null).warning, 'unavailable');
  assert.equal(loadState(new BrokenStorage()).warning, 'unavailable');
  assert.equal(saveState(new BrokenStorage(), defaultState()), false);
  assert.equal(saveState(null, defaultState()), false);
});

test('空存储 → 默认状态，没有警告', () => {
  const r = loadState(new FakeStorage());
  assert.deepEqual(r, { state: defaultState(), warning: null });
});

test('保存后再读取，内容一致', () => {
  const st = new FakeStorage();
  assert.equal(saveState(st, sampleState()), true);
  assert.deepEqual(loadState(st), { state: sampleState(), warning: null });
});

test('损坏的数据：原文另存到 .broken，用默认状态启动（Review Focus 5）', () => {
  const st = new FakeStorage({ [STORAGE_KEY]: '{oops' });
  const r = loadState(st);
  assert.equal(r.warning, 'corrupt');
  assert.deepEqual(r.state, defaultState());
  assert.equal(st.getItem(STORAGE_KEY + '.broken'), '{oops');
  const wrongVersion = new FakeStorage({ [STORAGE_KEY]: JSON.stringify({ ...defaultState(), version: 2 }) });
  assert.equal(loadState(wrongVersion).warning, 'corrupt');
});

test('validateState 拒绝不合法的字段', () => {
  const bad = [
    { ...defaultState(), settings: { dailyScreen: 999, timerSec: 8, spelling: true } },
    { ...sampleState(), words: { cat: { status: 'weird', streak: 0, due: '2026-10-06' } } },
    { ...sampleState(), today: { date: '2026-10-06' } },
    { ...defaultState(), stats: { stars: '5', streakDays: 0, lastCheckin: null, history: {} } },
    [],
    null,
  ];
  for (const b of bad) assert.equal(validateState(b), false, JSON.stringify(b));
});

test('导出再导入，内容一致', () => {
  assert.deepEqual(importJSON(exportJSON(sampleState())), sampleState());
});

test('导入非备份文件被拒绝（Review Focus 5）', () => {
  assert.throws(() => importJSON('not json'), /文件不是有效的备份/);
  assert.throws(() => importJSON('{"hello": 1}'), /文件不是有效的备份/);
  assert.throws(() => importJSON(JSON.stringify({ ...sampleState(), stats: undefined })), /文件不是有效的备份/);
});

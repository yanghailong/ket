import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordAnswer, settle, isSpellingCorrect } from '../src/session.js';

function makeState(today = {}, extra = {}) {
  return {
    version: 1,
    settings: { dailyScreen: 50, timerSec: 8, spelling: true },
    words: {},
    today: { date: '2026-10-06', reviewIds: [], screenIds: [], reviewDone: [], screenDone: [], reviewStarred: false, screenStarred: false, ...today },
    stats: { stars: 0, streakDays: 0, lastCheckin: null, history: {} },
    ...extra,
  };
}

test('筛查答对：记为已掌握、标记完成、记入统计', () => {
  const s = recordAnswer(makeState({ screenIds: ['cat'] }), 'cat', 'screen', true);
  assert.equal(s.words.cat.status, 'known');
  assert.deepEqual(s.today.screenDone, ['cat']);
  assert.deepEqual(s.stats.history['2026-10-06'], { screenRight: 1, screenTotal: 1, reviewRight: 0, reviewTotal: 0, checked: false });
});

test('筛查答错 → 遗忘', () => {
  const s = recordAnswer(makeState({ screenIds: ['cat'] }), 'cat', 'screen', false);
  assert.equal(s.words.cat.status, 'forgotten');
  assert.equal(s.stats.history['2026-10-06'].screenRight, 0);
});

test('复习和抽查记入 reviewDone 和复习统计', () => {
  const start = makeState({ reviewIds: ['a', 'b'] }, {
    words: {
      a: { status: 'forgotten', streak: 0, due: '2026-10-06', lastSeen: '2026-10-05' },
      b: { status: 'known', streak: 0, due: '2026-10-06', lastSeen: '2026-09-06' },
    },
  });
  let s = recordAnswer(start, 'a', 'review', true);
  s = recordAnswer(s, 'b', 'check', false);
  assert.equal(s.words.a.streak, 1);
  assert.equal(s.words.b.status, 'forgotten');
  assert.deepEqual(s.today.reviewDone, ['a', 'b']);
  assert.equal(s.stats.history['2026-10-06'].reviewTotal, 2);
  assert.equal(s.stats.history['2026-10-06'].reviewRight, 1);
});

test('同一题重复提交只记一次（Review Focus 2）', () => {
  const once = recordAnswer(makeState({ screenIds: ['cat'] }), 'cat', 'screen', true);
  const twice = recordAnswer(once, 'cat', 'screen', false);
  assert.equal(twice, once);
});

test('按 today.date 记账，不看系统时间（Review Focus 1）', () => {
  const s = recordAnswer(makeState({ date: '2026-01-01', screenIds: ['cat'] }), 'cat', 'screen', false);
  assert.equal(s.words.cat.due, '2026-01-02');
  assert.ok(s.stats.history['2026-01-01']);
});

test('完成一项任务 +5 星，只发一次', () => {
  let s = makeState({ reviewIds: ['a'], reviewDone: ['a'], screenIds: ['b'] });
  const r1 = settle(s);
  assert.deepEqual(r1.events, [{ type: 'task', task: 'review', stars: 5 }]);
  assert.equal(r1.state.stats.stars, 5);
  assert.equal(r1.state.today.reviewStarred, true);
  assert.deepEqual(settle(r1.state).events, []);
});

test('两项都完成：两次任务奖励 + 打卡奖励，共 15 星', () => {
  const r = settle(makeState({ reviewIds: ['a'], reviewDone: ['a'], screenIds: ['b'], screenDone: ['b'] }));
  assert.deepEqual(r.events, [
    { type: 'task', task: 'review', stars: 5 },
    { type: 'task', task: 'screen', stars: 5 },
    { type: 'checkin', stars: 5, streakDays: 1 },
  ]);
  assert.equal(r.state.stats.stars, 15);
  assert.equal(r.state.stats.history['2026-10-06'].checked, true);
  assert.deepEqual(settle(r.state).events, []);
});

test('数量为 0 的任务视为完成；两项都为 0 时直接打卡', () => {
  const r = settle(makeState({ reviewIds: ['a'], reviewDone: ['a'], screenIds: [] }));
  assert.deepEqual(r.events.map(e => e.type), ['task', 'checkin']);
  const empty = settle(makeState());
  assert.deepEqual(empty.events, [{ type: 'checkin', stars: 5, streakDays: 1 }]);
});

test('拼写判定：忽略大小写、首尾空格、多余空格、弯引号（Review Focus 3）', () => {
  assert.equal(isSpellingCorrect(' Apple ', 'apple'), true);
  assert.equal(isSpellingCorrect('o’clock', "o'clock"), true);
  assert.equal(isSpellingCorrect('ice   cream', 'ice cream'), true);
  assert.equal(isSpellingCorrect('Monday', 'Monday'), true);
  assert.equal(isSpellingCorrect('aple', 'apple'), false);
  assert.equal(isSpellingCorrect('', 'apple'), false);
});

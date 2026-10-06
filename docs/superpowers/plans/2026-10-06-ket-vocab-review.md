# KET 词汇找回 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一个离线单文件网页 `dist/ket-vocab.html`，帮 11 岁孩子先筛出遗忘的 KET 词汇（约 1500 词），再按记忆曲线复习，配合每日打卡和星星激励。

**Architecture:** 源码按职责拆成多个 ES 模块。纯逻辑模块（日期、排期、每日任务、星星、答题记账、干扰项、存储）都不碰 DOM，用 `node --test` 测试；界面模块用原生 DOM 渲染。构建脚本 `build.mjs` 删掉 `import` 行和 `export` 前缀，按固定顺序把所有模块拼成一个 `<script>`，连同 CSS 一起内嵌进单个 HTML。

**Tech Stack:** HTML / CSS / 原生 JavaScript（ES2022），Node 24（只用于测试和构建，不安装任何 npm 包），浏览器 `localStorage`、`speechSynthesis`、Web Audio API。

**Spec:** `docs/superpowers/specs/2026-10-06-ket-vocab-review-design.md`

## Global Constraints

- 不安装任何依赖（不运行 `npm install`），只用 Node 24 内置模块和浏览器原生 API。
- 交付物是单个文件 `dist/ket-vocab.html`，离线可用，HTML 里不能出现任何 `http://` 或 `https://` 外部地址。
- 源码是 ESM；每条 `import` 必须单独占一行，并且写在行首；顶层声明每行只声明一个名字，所有文件之间的顶层名字不能重复（构建时会检查，重名就报错）。
- 日期一律用本地日期字符串，格式 `YYYY-MM-DD`。
- localStorage 存储键：`ketVocab.v1`；数据损坏时把原始内容另存到 `ketVocab.v1.broken`。
- 设置项的可选值：`dailyScreen` 30 / 50 / 100（默认 50）；`timerSec` 0 / 5 / 8 / 12（默认 8，0 表示关闭倒计时）；`spelling` 默认 `true`。
- 排期参数：`INTERVALS = [1, 2, 4]`；连续通过 3 次算"已捡回"；抽查间隔 30 天；每天复习上限 40 个。
- 星星规则：每完成一项任务 5 ⭐；当天两项都完成（打卡）再加 5 ⭐；打卡时连续天数是 7 的倍数加 20 ⭐，是 30 的倍数加 100 ⭐。
- 单词 `id` 就是英文单词本身（`en`），英文单词不区分大小写，不能重复。
- 界面文字用简体中文；单词字号约 40px；按钮最小点击区域 48px；页面最小宽度 360px，内容最大宽度 720px。
- 目录当前**不是 git 仓库**。执行前先问家长要不要 `git init`；如果不初始化，就跳过所有 "Commit" 步骤。

## Review Focus

1. **答题途中跨过午夜**：孩子 23:59 还在答题。这一题应该记在 `state.today.date`（也就是答题开始那天）上，不能看系统时间；下一次渲染页面时自动切换到新的一天。（测试放在 Task 5）
2. **重复点击、连续提交同一题**：网慢或手抖连点两下，同一个词在同一天只能记一次，星星和统计都不能重复加。（测试放在 Task 5）
3. **iPad 输入法**：弯引号 `o’clock`、自动首字母大写 `Apple`、首尾空格、中间多个空格，都应该判为拼写正确。（测试放在 Task 5）
4. **词库更新后进度里有失效的词**：旧进度或当天任务里出现词库已删除的词时，要自动忽略，不能报错，也不能让任务一直完成不了。（测试放在 Task 3）
5. **导入错误文件、存储数据损坏**：
   - 家长导入了别的 JSON 文件或残缺的备份时，要拒绝导入，当前进度不变。
   - localStorage 里的数据损坏时，先把原始数据另存，再重新开始，并给出提示。

   （测试放在 Task 7）

---

## 文件结构

```
package.json                 # type: module；test / build 脚本
build.mjs                    # 合并源码 → dist/ket-vocab.html；导出 bundleSources 供测试
tools/validate-words.js      # 词库校验（构建和测试用，不进 bundle）
src/
  index.html                 # 页面模板，含 /*STYLE*/ 和 /*SCRIPT*/ 占位
  styles.css                 # 全部样式
  dates.js                   # 本地日期工具
  srs.js                     # 单词状态转换（纯函数）
  daily.js                   # 每日任务生成、进度统计（纯函数）
  rewards.js                 # 打卡、连续天数、星星（纯函数）
  session.js                 # 答题记账、结算星星、拼写判定（纯函数）
  distractors.js             # 四选一干扰项（纯函数）
  storage.js                 # localStorage 读写、校验、导入导出
  speech.js                  # 英语发音
  sound.js                   # 对/错提示音
  words/topics.js            # 22 个话题及目标词数
  words/<topic>.js × 22      # 每个话题的单词数据
  words/index.js             # 合并成 WORDS、WORD_BY_ID
  ui/dom.js                  # h()、toast、发音按钮、单词详情等通用组件
  ui/celebrate.js            # 星星提示、打卡庆祝弹层
  ui/home.js                 # 首页
  ui/quiz.js                 # 题目头部、四选一组件
  ui/screen.js               # 筛查页
  ui/review.js               # 复习页（单词卡 + 拼写/听音选词；抽查）
  ui/wordbook.js             # 词本
  ui/parent.js               # 家长页
  app.js                     # 全局状态、路由、计时器管理、启动 boot()
tests/*.test.js              # 单元测试
dist/ket-vocab.html          # 构建产物
```

---

### Task 1: 项目骨架和日期工具

**Files:**
- Create: `package.json`
- Create: `src/dates.js`
- Test: `tests/dates.test.js`

**Interfaces:**
- Consumes: 无
- Produces:
  - `todayStr(d?: Date): string` 返回本地日期 `YYYY-MM-DD`
  - `addDays(dateStr: string, n: number): string`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "ket-vocab",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/*.test.js\"",
    "build": "node build.mjs"
  }
}
```

- [ ] **Step 2: 写失败的测试**

`tests/dates.test.js`：

```js
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
```

- [ ] **Step 3: 运行测试，确认失败**

Run: `node --test tests/dates.test.js`
Expected: FAIL，报错 `Cannot find module` 或 `ERR_MODULE_NOT_FOUND`（`src/dates.js` 还不存在）

- [ ] **Step 4: 实现**

`src/dates.js`：

```js
export function todayStr(d = new Date()) {
  return formatYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function formatYMD(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function ymdToUTC(s) {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// 用 UTC 计算，避免夏令时导致少一天或多一天
export function addDays(s, n) {
  const t = new Date(ymdToUTC(s) + n * 86400000);
  return formatYMD(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `node --test tests/dates.test.js`
Expected: PASS（2 个测试）

- [ ] **Step 6: Commit**

```bash
git add package.json src/dates.js tests/dates.test.js
git commit -m "feat: 项目骨架与本地日期工具"
```

---

### Task 2: 单词状态转换（srs）

**Files:**
- Create: `src/srs.js`
- Test: `tests/srs.test.js`

**Interfaces:**
- Consumes: `addDays`（Task 1）
- Produces:
  - 单词进度记录类型 `Rec = { status: 'known'|'forgotten'|'recovered', streak: number, due: string, lastSeen: string }`
  - `INTERVALS = [1, 2, 4]`，`RECOVER_STREAK = 3`，`CHECK_DAYS = 30`
  - `screenResult(correct: boolean, today: string): Rec`
  - `reviewResult(rec: Rec, passed: boolean, today: string): Rec`（只用于 `forgotten`）
  - `checkResult(rec: Rec, correct: boolean, today: string): Rec`（只用于 `known` / `recovered`）
  - `isCheckItem(rec: Rec): boolean`

- [ ] **Step 1: 写失败的测试**

`tests/srs.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/srs.test.js`
Expected: FAIL，报错 `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 实现**

`src/srs.js`：

```js
import { addDays } from './dates.js';

export const INTERVALS = [1, 2, 4];
export const RECOVER_STREAK = 3;
export const CHECK_DAYS = 30;

function forgottenRecord(today) {
  return { status: 'forgotten', streak: 0, due: addDays(today, INTERVALS[0]), lastSeen: today };
}

function checkLaterRecord(status, today) {
  return { status, streak: 0, due: addDays(today, CHECK_DAYS), lastSeen: today };
}

export function screenResult(correct, today) {
  return correct ? checkLaterRecord('known', today) : forgottenRecord(today);
}

export function reviewResult(rec, passed, today) {
  if (!passed) return forgottenRecord(today);
  const streak = rec.streak + 1;
  if (streak >= RECOVER_STREAK) return checkLaterRecord('recovered', today);
  return { status: 'forgotten', streak, due: addDays(today, INTERVALS[streak]), lastSeen: today };
}

export function checkResult(rec, correct, today) {
  return correct ? checkLaterRecord(rec.status, today) : forgottenRecord(today);
}

export function isCheckItem(rec) {
  return rec.status === 'known' || rec.status === 'recovered';
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/srs.test.js`
Expected: PASS（7 个测试）

- [ ] **Step 5: Commit**

```bash
git add src/srs.js tests/srs.test.js
git commit -m "feat: 单词状态转换与复习间隔"
```

---

### Task 3: 每日任务生成（daily）

**Files:**
- Create: `src/daily.js`
- Test: `tests/daily.test.js`

**Interfaces:**
- Consumes: 进度记录 `Rec`（Task 2）；单词对象 `{ id, en, zh, pos, topic, ... }`
- Produces:
  - 当天任务类型 `Today = { date, reviewIds: string[], screenIds: string[], reviewDone: string[], screenDone: string[], reviewStarred: boolean, screenStarred: boolean }`
  - `REVIEW_CAP = 40`
  - `buildToday(words, progress, settings, today): Today`
  - `ensureToday(state, words, today): state`：跨天时重建当天任务；同一天时过滤掉失效 id，没有变化就返回**同一个对象**
  - `remaining(list: string[], done: string[]): string[]`
  - `isComplete(list, done): boolean`
  - `countByStatus(words, progress): { new, known, forgotten, recovered }`

- [ ] **Step 1: 写失败的测试**

`tests/daily.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/daily.test.js`
Expected: FAIL，报错 `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 实现**

`src/daily.js`：

```js
export const REVIEW_CAP = 40;

export function buildToday(words, progress, settings, today) {
  const order = new Map(words.map((w, i) => [w.id, i]));
  const reviewIds = Object.keys(progress)
    .filter(id => order.has(id) && progress[id].due <= today)
    .sort((a, b) => {
      const da = progress[a].due, db = progress[b].due;
      if (da !== db) return da < db ? -1 : 1;
      return order.get(a) - order.get(b);
    })
    .slice(0, REVIEW_CAP);
  const screenIds = words.filter(w => !progress[w.id]).slice(0, settings.dailyScreen).map(w => w.id);
  return { date: today, reviewIds, screenIds, reviewDone: [], screenDone: [], reviewStarred: false, screenStarred: false };
}

export function ensureToday(state, words, today) {
  if (!state.today || state.today.date !== today) {
    return { ...state, today: buildToday(words, state.words, state.settings, today) };
  }
  const valid = new Set(words.map(w => w.id));
  const t = state.today;
  if (t.reviewIds.every(id => valid.has(id)) && t.screenIds.every(id => valid.has(id))) return state;
  return {
    ...state,
    today: { ...t, reviewIds: t.reviewIds.filter(id => valid.has(id)), screenIds: t.screenIds.filter(id => valid.has(id)) },
  };
}

export function remaining(list, done) {
  const doneSet = new Set(done);
  return list.filter(id => !doneSet.has(id));
}

export function isComplete(list, done) {
  return remaining(list, done).length === 0;
}

export function countByStatus(words, progress) {
  const counts = { new: 0, known: 0, forgotten: 0, recovered: 0 };
  for (const w of words) counts[progress[w.id] ? progress[w.id].status : 'new']++;
  return counts;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/daily.test.js`
Expected: PASS（10 个测试）

- [ ] **Step 5: Commit**

```bash
git add src/daily.js tests/daily.test.js
git commit -m "feat: 每日任务生成与进度统计"
```

---

### Task 4: 打卡与星星（rewards）

**Files:**
- Create: `src/rewards.js`
- Test: `tests/rewards.test.js`

**Interfaces:**
- Consumes: `addDays`（Task 1）
- Produces:
  - 统计类型 `Stats = { stars: number, streakDays: number, lastCheckin: string|null, history: { [date]: Day } }`
  - `TASK_STARS = 5`，`CHECKIN_STARS = 5`
  - `streakBonus(streakDays: number): number`
  - `applyCheckin(stats, today): { stats, gained: number }`（调用前提：今天还没有打卡）
  - `displayStreak(stats, today): number`

- [ ] **Step 1: 写失败的测试**

`tests/rewards.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/rewards.test.js`
Expected: FAIL，报错 `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 实现**

`src/rewards.js`：

```js
import { addDays } from './dates.js';

export const TASK_STARS = 5;
export const CHECKIN_STARS = 5;

export function streakBonus(streakDays) {
  let bonus = 0;
  if (streakDays % 7 === 0) bonus += 20;
  if (streakDays % 30 === 0) bonus += 100;
  return bonus;
}

export function applyCheckin(stats, today) {
  const streakDays = stats.lastCheckin === addDays(today, -1) ? stats.streakDays + 1 : 1;
  const gained = CHECKIN_STARS + streakBonus(streakDays);
  return { stats: { ...stats, streakDays, lastCheckin: today, stars: stats.stars + gained }, gained };
}

export function displayStreak(stats, today) {
  const active = stats.lastCheckin === today || stats.lastCheckin === addDays(today, -1);
  return active ? stats.streakDays : 0;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/rewards.test.js`
Expected: PASS（4 个测试）

- [ ] **Step 5: Commit**

```bash
git add src/rewards.js tests/rewards.test.js
git commit -m "feat: 打卡连续天数与星星奖励"
```

---

### Task 5: 答题记账与结算（session）

**Files:**
- Create: `src/session.js`
- Test: `tests/session.test.js`

**Interfaces:**
- Consumes: `screenResult` / `reviewResult` / `checkResult`（Task 2），`isComplete`（Task 3），`applyCheckin` / `TASK_STARS`（Task 4）
- Produces:
  - 每日统计类型 `Day = { screenRight, screenTotal, reviewRight, reviewTotal, checked }`
  - `emptyHistoryDay(): Day`
  - `recordAnswer(state, id, kind: 'screen'|'review'|'check', ok: boolean): state`：日期用 `state.today.date`；同一个 id 当天已经答过的话，原样返回 state
  - `settle(state): { state, events: Event[] }`，其中 `Event = { type: 'task', task: 'review'|'screen', stars } | { type: 'checkin', stars, streakDays }`
  - `normalizeSpelling(s): string`，`isSpellingCorrect(input, en): boolean`

- [ ] **Step 1: 写失败的测试**

`tests/session.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/session.test.js`
Expected: FAIL，报错 `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 实现**

`src/session.js`：

```js
import { screenResult, reviewResult, checkResult } from './srs.js';
import { isComplete } from './daily.js';
import { applyCheckin, TASK_STARS } from './rewards.js';

export function emptyHistoryDay() {
  return { screenRight: 0, screenTotal: 0, reviewRight: 0, reviewTotal: 0, checked: false };
}

export function recordAnswer(state, id, kind, ok) {
  const date = state.today.date;
  const doneKey = kind === 'screen' ? 'screenDone' : 'reviewDone';
  if (state.today[doneKey].includes(id)) return state;
  let rec;
  if (kind === 'screen') rec = screenResult(ok, date);
  else if (kind === 'review') rec = reviewResult(state.words[id], ok, date);
  else rec = checkResult(state.words[id], ok, date);
  const day = { ...emptyHistoryDay(), ...state.stats.history[date] };
  if (kind === 'screen') {
    day.screenTotal++;
    if (ok) day.screenRight++;
  } else {
    day.reviewTotal++;
    if (ok) day.reviewRight++;
  }
  return {
    ...state,
    words: { ...state.words, [id]: rec },
    today: { ...state.today, [doneKey]: [...state.today[doneKey], id] },
    stats: { ...state.stats, history: { ...state.stats.history, [date]: day } },
  };
}

export function settle(state) {
  const date = state.today.date;
  const today = { ...state.today };
  let stats = state.stats;
  const events = [];
  for (const task of ['review', 'screen']) {
    const list = today[`${task}Ids`];
    const flag = `${task}Starred`;
    if (list.length > 0 && !today[flag] && isComplete(list, today[`${task}Done`])) {
      today[flag] = true;
      stats = { ...stats, stars: stats.stars + TASK_STARS };
      events.push({ type: 'task', task, stars: TASK_STARS });
    }
  }
  const day = { ...emptyHistoryDay(), ...stats.history[date] };
  if (!day.checked && isComplete(today.reviewIds, today.reviewDone) && isComplete(today.screenIds, today.screenDone)) {
    const r = applyCheckin(stats, date);
    stats = { ...r.stats, history: { ...r.stats.history, [date]: { ...day, checked: true } } };
    events.push({ type: 'checkin', stars: r.gained, streakDays: stats.streakDays });
  }
  return { state: { ...state, today, stats }, events };
}

export function normalizeSpelling(s) {
  return s.trim().toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/\s+/g, ' ');
}

export function isSpellingCorrect(input, en) {
  return normalizeSpelling(input) !== '' && normalizeSpelling(input) === normalizeSpelling(en);
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/session.test.js`
Expected: PASS（9 个测试）

- [ ] **Step 5: Commit**

```bash
git add src/session.js tests/session.test.js
git commit -m "feat: 答题记账、星星结算与拼写判定"
```

---

### Task 6: 四选一干扰项（distractors）

**Files:**
- Create: `src/distractors.js`
- Test: `tests/distractors.test.js`

**Interfaces:**
- Consumes: 单词对象 `{ id, en, zh, pos, topic }`
- Produces:
  - `pickDistractors(word, words, field = 'zh', rng = Math.random): Word[]`（最多 3 个）
  - `buildChoices(word, words, field = 'zh', rng = Math.random): { id, label, correct }[]`（共 4 个，顺序随机）

- [ ] **Step 1: 写失败的测试**

`tests/distractors.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/distractors.test.js`
Expected: FAIL，报错 `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 实现**

`src/distractors.js`：

```js
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
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/distractors.test.js`
Expected: PASS（4 个测试）

- [ ] **Step 5: Commit**

```bash
git add src/distractors.js tests/distractors.test.js
git commit -m "feat: 四选一干扰项生成"
```

---

### Task 7: 存储、校验、导入导出（storage）

**Files:**
- Create: `src/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Consumes: `Today`（Task 3）、`Stats`（Task 4）的数据结构
- Produces:
  - 应用状态类型 `State = { version: 1, settings: { dailyScreen, timerSec, spelling }, words: { [id]: Rec }, today: Today|null, stats: Stats }`
  - `STORAGE_KEY = 'ketVocab.v1'`，`SCREEN_OPTIONS = [30, 50, 100]`，`TIMER_OPTIONS = [0, 5, 8, 12]`
  - `defaultState(): State`
  - `validateState(obj): boolean`
  - `getStorage(): Storage|null`（只在浏览器里用）
  - `loadState(storage): { state, warning: null|'unavailable'|'corrupt' }`
  - `saveState(storage, state): boolean`
  - `exportJSON(state): string`
  - `importJSON(text): State`，不合法时抛出 `Error('文件不是有效的备份')`

- [ ] **Step 1: 写失败的测试**

`tests/storage.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/storage.test.js`
Expected: FAIL，报错 `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 实现**

`src/storage.js`：

```js
export const STORAGE_KEY = 'ketVocab.v1';
export const SCREEN_OPTIONS = [30, 50, 100];
export const TIMER_OPTIONS = [0, 5, 8, 12];
const REC_STATUSES = ['known', 'forgotten', 'recovered'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function defaultState() {
  return {
    version: 1,
    settings: { dailyScreen: 50, timerSec: 8, spelling: true },
    words: {},
    today: null,
    stats: { stars: 0, streakDays: 0, lastCheckin: null, history: {} },
  };
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isStringArray(v) {
  return Array.isArray(v) && v.every(x => typeof x === 'string');
}

export function validateState(s) {
  if (!isPlainObject(s) || s.version !== 1) return false;
  const st = s.settings;
  if (!isPlainObject(st) || !SCREEN_OPTIONS.includes(st.dailyScreen) || !TIMER_OPTIONS.includes(st.timerSec) || typeof st.spelling !== 'boolean') return false;
  if (!isPlainObject(s.words)) return false;
  for (const r of Object.values(s.words)) {
    if (!isPlainObject(r) || !REC_STATUSES.includes(r.status) || !Number.isInteger(r.streak) || !DATE_RE.test(r.due)) return false;
  }
  if (s.today !== null) {
    const t = s.today;
    if (!isPlainObject(t) || !DATE_RE.test(t.date)) return false;
    if (![t.reviewIds, t.screenIds, t.reviewDone, t.screenDone].every(isStringArray)) return false;
    if (typeof t.reviewStarred !== 'boolean' || typeof t.screenStarred !== 'boolean') return false;
  }
  const x = s.stats;
  if (!isPlainObject(x) || typeof x.stars !== 'number' || !Number.isInteger(x.streakDays)) return false;
  if (!(x.lastCheckin === null || DATE_RE.test(x.lastCheckin)) || !isPlainObject(x.history)) return false;
  return true;
}

export function getStorage() {
  try {
    const ls = window.localStorage;
    const probe = STORAGE_KEY + '.probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export function loadState(storage) {
  if (!storage) return { state: defaultState(), warning: 'unavailable' };
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: defaultState(), warning: 'unavailable' };
  }
  if (raw === null) return { state: defaultState(), warning: null };
  try {
    const parsed = JSON.parse(raw);
    if (validateState(parsed)) return { state: parsed, warning: null };
  } catch {
    // 落到下面按损坏处理
  }
  try {
    storage.setItem(STORAGE_KEY + '.broken', raw);
  } catch {
    // 另存失败也继续启动
  }
  return { state: defaultState(), warning: 'corrupt' };
}

export function saveState(storage, state) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportJSON(state) {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('文件不是有效的备份');
  }
  if (!validateState(parsed)) throw new Error('文件不是有效的备份');
  return parsed;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/storage.test.js`
Expected: PASS（8 个测试）

- [ ] **Step 5: Commit**

```bash
git add src/storage.js tests/storage.test.js
git commit -m "feat: 进度存储、校验与备份导入导出"
```

---

### Task 8: 词库框架 + 校验 + 第一个话题（家庭与朋友）

**Files:**
- Create: `src/words/topics.js`
- Create: `src/words/index.js`
- Create: `src/words/<key>.js` × 22（`family.js` 写满 50 词，其余 21 个先放空数组）
- Create: `tools/validate-words.js`
- Test: `tests/words.test.js`

**Interfaces:**
- Consumes: 无
- Produces:
  - `TOPICS: { key, zh, target }[]`（22 个，顺序就是筛查顺序）
  - 每个话题文件导出 `W_<KEY 大写>`，内容是数组，每项格式为 `[en, ipa, pos, zh, ex, exZh]`
  - `WORDS: { id, en, ipa, pos, zh, topic, ex, exZh }[]`（`id === en`，按 TOPICS 顺序排列）
  - `WORD_BY_ID: Map<string, Word>`
  - `POS_LIST`，`validateWords(words, topics): string[]`（返回错误列表，空数组表示没有问题）

- [ ] **Step 1: 写失败的测试**

`tests/words.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/words.test.js`
Expected: FAIL，报错 `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 创建话题表**

`src/words/topics.js`：

```js
// 顺序就是筛查顺序；target 是这个话题的目标词数
export const TOPICS = [
  { key: 'family', zh: '家庭与朋友', target: 50 },
  { key: 'school', zh: '学校与学习', target: 70 },
  { key: 'food', zh: '食物与饮料', target: 100 },
  { key: 'home', zh: '房屋与家居', target: 70 },
  { key: 'clothes', zh: '衣服与配饰', target: 40 },
  { key: 'body', zh: '身体与健康', target: 50 },
  { key: 'sport', zh: '运动', target: 50 },
  { key: 'hobbies', zh: '爱好与休闲', target: 60 },
  { key: 'travel', zh: '旅行与交通', target: 70 },
  { key: 'places', zh: '地点与建筑', target: 70 },
  { key: 'weather', zh: '天气', target: 30 },
  { key: 'animals', zh: '动物', target: 50 },
  { key: 'nature', zh: '自然与环境', target: 40 },
  { key: 'shopping', zh: '购物与金钱', target: 50 },
  { key: 'work', zh: '工作与职业', target: 50 },
  { key: 'tech', zh: '科技与通讯', target: 40 },
  { key: 'time', zh: '时间与日期', target: 60 },
  { key: 'numbers', zh: '数字与数量', target: 50 },
  { key: 'feelings', zh: '情感与性格', target: 50 },
  { key: 'verbs', zh: '常用动词', target: 200 },
  { key: 'describe', zh: '常用形容词与副词', target: 150 },
  { key: 'function', zh: '功能词', target: 150 },
];
```

- [ ] **Step 4: 创建校验工具**

`tools/validate-words.js`：

```js
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
```

注意：一个词只报第一条错误，所以测试里 7 个词正好报出 6 条错误（`ok` 没有错误）。

- [ ] **Step 5: 创建 22 个话题数据文件**

每个文件的格式（以 `animals.js` 为例；Task 8 中除 `family.js` 外，其余文件都先写空数组）：

```js
// 动物 · 目标 50 词
// 每项：[英文, 音标(英式), 词性, 中文, 例句, 例句翻译]
export const W_ANIMALS = [
];
```

22 个文件和常量名的对应关系：`family.js → W_FAMILY`、`school.js → W_SCHOOL`、`food.js → W_FOOD`、`home.js → W_HOME`、`clothes.js → W_CLOTHES`、`body.js → W_BODY`、`sport.js → W_SPORT`、`hobbies.js → W_HOBBIES`、`travel.js → W_TRAVEL`、`places.js → W_PLACES`、`weather.js → W_WEATHER`、`animals.js → W_ANIMALS`、`nature.js → W_NATURE`、`shopping.js → W_SHOPPING`、`work.js → W_WORK`、`tech.js → W_TECH`、`time.js → W_TIME`、`numbers.js → W_NUMBERS`、`feelings.js → W_FEELINGS`、`verbs.js → W_VERBS`、`describe.js → W_DESCRIBE`、`function.js → W_FUNCTION`。

**`family.js` 写满 50 个词**，参照下面这几行示例的写法：

```js
// 家庭与朋友 · 目标 50 词
// 每项：[英文, 音标(英式), 词性, 中文, 例句, 例句翻译]
export const W_FAMILY = [
  ['aunt', '/ɑːnt/', 'n.', '阿姨；姑姑', 'My aunt lives in London.', '我的阿姨住在伦敦。'],
  ['brother', '/ˈbrʌð.ər/', 'n.', '兄弟', 'I have one brother.', '我有一个兄弟。'],
  ['cousin', '/ˈkʌz.ən/', 'n.', '堂/表兄弟姐妹', 'My cousin is ten years old.', '我的表哥十岁。'],
  ['friend', '/frend/', 'n.', '朋友', 'Tom is my best friend.', 'Tom 是我最好的朋友。'],
  ['get married', '/ɡet ˈmær.id/', 'phr.', '结婚', 'They got married last year.', '他们去年结婚了。'],
  // ……共 50 个
];
```

**词库编写规则**（后面的词库任务 Task 14–18 也都按这套规则写）：
1. **选词范围**：只选剑桥 A2 Key for Schools 官方词汇表里的词。每个词放进最贴切的一个话题，不同话题之间不能重复（校验会检查）。
2. **英文**：
   - 用英式拼写（colour、centre）。
   - 只有专有名词首字母大写（Monday、January、English）。
   - 可以写短语，词性标 `phr.`（如 `look after`、`get up`）。
   - 字母、空格、连字符、半角撇号以外的字符一律不要用（比如 `o'clock`、`T-shirt` 都可以，但不能用弯引号）。
3. **音标**：英式 IPA，用 `/…/` 包起来。
4. **词性**：只能从 `n. v. adj. adv. prep. pron. conj. det. num. excl. phr.` 里选；一词多性的，标最常用的那个。
5. **中文**：简短，最多 2 个意思，用全角分号"；"分隔。
6. **例句**：
   - A2 难度，不超过 12 个英文单词。
   - 尽量用孩子熟悉的生活或校园场景。
   - 例句里要用到这个词（变形也可以）。
7. **例句翻译**：自然的中文。
8. **字符串引号**：统一用单引号；英文里有撇号时，改用双引号包住整个字符串，例如 `"o'clock"`、`"Don't run!"`。

- [ ] **Step 6: 创建词库入口**

`src/words/index.js`：

```js
import { TOPICS } from './topics.js';
import { W_FAMILY } from './family.js';
import { W_SCHOOL } from './school.js';
import { W_FOOD } from './food.js';
import { W_HOME } from './home.js';
import { W_CLOTHES } from './clothes.js';
import { W_BODY } from './body.js';
import { W_SPORT } from './sport.js';
import { W_HOBBIES } from './hobbies.js';
import { W_TRAVEL } from './travel.js';
import { W_PLACES } from './places.js';
import { W_WEATHER } from './weather.js';
import { W_ANIMALS } from './animals.js';
import { W_NATURE } from './nature.js';
import { W_SHOPPING } from './shopping.js';
import { W_WORK } from './work.js';
import { W_TECH } from './tech.js';
import { W_TIME } from './time.js';
import { W_NUMBERS } from './numbers.js';
import { W_FEELINGS } from './feelings.js';
import { W_VERBS } from './verbs.js';
import { W_DESCRIBE } from './describe.js';
import { W_FUNCTION } from './function.js';

const RAW_WORDS = {
  family: W_FAMILY, school: W_SCHOOL, food: W_FOOD, home: W_HOME, clothes: W_CLOTHES,
  body: W_BODY, sport: W_SPORT, hobbies: W_HOBBIES, travel: W_TRAVEL, places: W_PLACES,
  weather: W_WEATHER, animals: W_ANIMALS, nature: W_NATURE, shopping: W_SHOPPING, work: W_WORK,
  tech: W_TECH, time: W_TIME, numbers: W_NUMBERS, feelings: W_FEELINGS, verbs: W_VERBS,
  describe: W_DESCRIBE, function: W_FUNCTION,
};

export const WORDS = TOPICS.flatMap(t => RAW_WORDS[t.key].map(([en, ipa, pos, zh, ex, exZh]) => ({ id: en, en, ipa, pos, zh, topic: t.key, ex, exZh })));

export const WORD_BY_ID = new Map(WORDS.map(w => [w.id, w]));
```

- [ ] **Step 7: 运行测试，确认通过**

Run: `node --test tests/words.test.js`
Expected: PASS（4 个测试）。如果"结构合法"这条测试失败，按报错信息逐条修正 `family.js`。

- [ ] **Step 8: 运行全部测试**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 9: Commit**

```bash
git add src/words tools tests/words.test.js
git commit -m "feat: 词库框架、校验工具与“家庭与朋友”话题"
```

---

### Task 9: 构建脚本 + 页面骨架 + 首页

**Files:**
- Create: `build.mjs`
- Create: `src/index.html`
- Create: `src/styles.css`
- Create: `src/speech.js`
- Create: `src/sound.js`
- Create: `src/ui/dom.js`
- Create: `src/ui/celebrate.js`
- Create: `src/ui/home.js`
- Create: `src/app.js`
- Test: `tests/build.test.js`

**Interfaces:**
- Consumes: Task 1–8 的全部导出
- Produces:
  - `build.mjs` 导出 `bundleSources(sources: { file, text }[]): string`，遇到顶层名字重复时抛错；直接运行时生成 `dist/ket-vocab.html`
  - `speech.js`：`initSpeech()`、`canSpeak(): boolean`、`speak(text): boolean`
  - `sound.js`：`playTone(ok: boolean)`
  - `ui/dom.js`：
    - `h(tag, attrs, ...children)`
    - `toast(msg)`
    - `speakButton(text, extraClass = '')`
    - `wordDetails(word)`
    - `STATUS_LABEL`
    - `statusOf(state, id)`
  - `ui/celebrate.js`：`showEvents(events)`
  - `ui/home.js`：`renderHome()`
  - `app.js`：
    - `getState()`、`commit(next)`
    - `go(view)`：每次渲染都会先刷新当天任务，并清理上一个视图留下的计时器
    - `later(fn, ms)`、`every(fn, ms): id`
    - `answer(id, kind, ok): events`
    - `nextOrHome(view, events)`
    - `boot()`
    - `VIEWS` 对象（后续任务往里加视图）

- [ ] **Step 1: 写失败的测试**

`tests/build.test.js`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { bundleSources } from '../build.mjs';

test('构建生成单个可解析、无外部地址的 HTML', () => {
  execFileSync(process.execPath, ['build.mjs'], { stdio: 'pipe' });
  const html = readFileSync('dist/ket-vocab.html', 'utf8');
  assert.match(html, /<div id="app"><\/div>/);
  assert.doesNotMatch(html, /https?:\/\//);
  const script = html.split('<script>')[1].split('</script>')[0];
  assert.doesNotMatch(script, /^import\s/m);
  assert.doesNotMatch(script, /^export\s/m);
  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /function renderHome/);
  assert.match(script, /boot\(\);/);
});

test('顶层名字重复时构建失败', () => {
  assert.throws(
    () => bundleSources([{ file: 'a.js', text: 'export function foo() {}' }, { file: 'b.js', text: 'const foo = 1;' }]),
    /顶层名字重复：foo/,
  );
});

test('bundleSources 去掉 import 行和 export 前缀', () => {
  const out = bundleSources([{ file: 'a.js', text: "import { x } from './x.js';\nexport const y = 1;" }]);
  assert.doesNotMatch(out, /import/);
  assert.match(out, /^const y = 1;$/m);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/build.test.js`
Expected: FAIL，报错 `ERR_MODULE_NOT_FOUND`（`build.mjs` 还不存在）

- [ ] **Step 3: 写构建脚本**

`build.mjs`：

```js
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TOPICS } from './src/words/topics.js';
import { WORDS } from './src/words/index.js';
import { validateWords } from './tools/validate-words.js';

// 拼接顺序：被依赖的模块在前；app.js 最后
const ORDER = [
  'src/dates.js',
  'src/words/topics.js',
  ...TOPICS.map(t => `src/words/${t.key}.js`),
  'src/words/index.js',
  'src/srs.js',
  'src/daily.js',
  'src/rewards.js',
  'src/session.js',
  'src/distractors.js',
  'src/storage.js',
  'src/speech.js',
  'src/sound.js',
  'src/ui/dom.js',
  'src/ui/celebrate.js',
  'src/ui/home.js',
  'src/app.js',
];

const DECL_RE = /^(?:export\s+)?(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/;

export function bundleSources(sources) {
  const seen = new Map();
  return sources.map(({ file, text }) => {
    const out = [];
    for (const line of text.split('\n')) {
      if (/^import\s/.test(line)) continue;
      const m = line.match(DECL_RE);
      if (m) {
        if (seen.has(m[1])) throw new Error(`顶层名字重复：${m[1]}（${seen.get(m[1])} 和 ${file}）`);
        seen.set(m[1], file);
      }
      out.push(line.replace(/^export\s+/, ''));
    }
    return `// ---- ${file} ----\n${out.join('\n')}`;
  }).join('\n');
}

function main() {
  const allSrc = readdirSync('src', { recursive: true })
    .filter(f => f.endsWith('.js'))
    .map(f => 'src/' + f.split(sep).join('/'));
  const missing = allSrc.filter(f => !ORDER.includes(f));
  if (missing.length) throw new Error(`build.mjs 的 ORDER 里缺少：${missing.join(', ')}`);

  const errors = validateWords(WORDS, TOPICS);
  if (errors.length) throw new Error(`词库有 ${errors.length} 处问题：\n${errors.join('\n')}`);
  if (WORDS.length < 1400 || WORDS.length > 1600) console.warn(`提示：当前 ${WORDS.length} 词，目标 1400–1600 词`);

  const script = bundleSources(ORDER.map(file => ({ file, text: readFileSync(file, 'utf8') })));
  new Function(script); // 只做语法检查，不执行
  if (script.includes('</script')) throw new Error('脚本里不能出现 </script');

  const html = readFileSync('src/index.html', 'utf8')
    .replace('/*STYLE*/', () => readFileSync('src/styles.css', 'utf8'))
    .replace('/*SCRIPT*/', () => script);
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/ket-vocab.html', html);
  console.log(`已生成 dist/ket-vocab.html（${WORDS.length} 词，${Math.round(html.length / 1024)} KB）`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
```

- [ ] **Step 4: 写页面模板**

`src/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KET 单词找回</title>
<style>
/*STYLE*/
</style>
</head>
<body>
<div id="app"></div>
<script>
/*SCRIPT*/
boot();
</script>
</body>
</html>
```

- [ ] **Step 5: 写样式（一次写全，后面的界面任务直接用）**

`src/styles.css`：

```css
:root {
  --bg: #fff8ef;
  --card: #ffffff;
  --ink: #2d2a32;
  --muted: #8a8494;
  --line: #e9e2ee;
  --primary: #ff8a3d;
  --primary-dark: #e86f1f;
  --primary-soft: #fff0e4;
  --right: #3cb371;
  --right-soft: #e7f7ed;
  --wrong: #e5534b;
  --wrong-soft: #fdecea;
  --s-known: #4caf7a;
  --s-recovered: #4a90e2;
  --s-forgotten: #f2a33a;
  --s-new: #d9d4de;
  --radius: 20px;
  --shadow: 0 4px 14px rgba(80, 60, 30, 0.08);
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
  font-size: 18px; line-height: 1.5; -webkit-tap-highlight-color: transparent;
}
#app { max-width: 720px; margin: 0 auto; padding: 16px 16px 104px; min-height: 100vh; }
h1 { font-size: 28px; margin: 8px 0 16px; }
h2 { font-size: 20px; margin: 0 0 6px; }
h3 { font-size: 17px; margin: 16px 0 8px; }
.muted { color: var(--muted); }
.center { text-align: center; }
.row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.card { background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; margin-bottom: 16px; }

.btn { min-height: 48px; padding: 0 22px; border: none; border-radius: 999px; font-size: 18px; font-weight: 600; cursor: pointer; background: #efe9f3; color: var(--ink); }
.btn.primary { background: var(--primary); color: #fff; }
.btn.primary:active { background: var(--primary-dark); }
.btn.danger { background: var(--wrong); color: #fff; }
.btn.big { width: 100%; font-size: 20px; margin-top: 16px; }
.btn:disabled { opacity: .5; cursor: default; }

.banner { background: #fff3c4; border: 1px solid #f0d36b; border-radius: 12px; padding: 10px 14px; margin-bottom: 12px; font-size: 15px; }

.topbar { display: flex; gap: 10px; justify-content: flex-end; }
.pill { background: var(--card); border-radius: 999px; padding: 6px 14px; box-shadow: var(--shadow); font-weight: 600; }
.task { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.task.done { background: var(--right-soft); }
.check { font-size: 34px; color: var(--right); font-weight: 800; padding: 0 8px; }
.progress { display: flex; height: 18px; border-radius: 999px; overflow: hidden; background: var(--s-new); margin: 12px 0; }
.seg { display: block; height: 100%; }
.s-known { background: var(--s-known); }
.s-recovered { background: var(--s-recovered); }
.s-forgotten { background: var(--s-forgotten); }
.s-new { background: var(--s-new); }
.legend { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 16px; }
.dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; }

.nav { position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; gap: 8px; padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: rgba(255, 255, 255, .96); box-shadow: 0 -2px 10px rgba(0, 0, 0, .06); z-index: 10; }
.nav button { flex: 1; max-width: 200px; min-height: 52px; border: none; background: none; border-radius: 14px; font-size: 16px; cursor: pointer; color: var(--muted); }
.nav button.active { background: var(--primary-soft); color: var(--primary-dark); font-weight: 700; }

.quiz-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.quiz-head .bar { flex: 1; height: 10px; background: var(--line); border-radius: 999px; overflow: hidden; }
.quiz-head .bar span { display: block; height: 100%; background: var(--primary); }
.back { min-height: 48px; border: none; background: none; font-size: 16px; color: var(--muted); cursor: pointer; padding: 0 4px; }
.prompt { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 140px; flex-wrap: wrap; }
.word { font-size: 40px; font-weight: 700; letter-spacing: .5px; word-break: break-word; text-align: center; }
.speak { min-width: 48px; min-height: 48px; border: none; border-radius: 50%; background: var(--primary-soft); font-size: 22px; cursor: pointer; }
.speak.disabled { opacity: .4; }
.speak.huge { width: 96px; height: 96px; font-size: 44px; }
.timer { height: 8px; background: var(--line); border-radius: 999px; overflow: hidden; margin-bottom: 16px; }
.timer-fill { height: 100%; width: 100%; background: var(--s-forgotten); transition: width .1s linear; }
.choices { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 480px) { .choices { grid-template-columns: 1fr; } }
.choice { min-height: 64px; padding: 10px 14px; border: 2px solid var(--line); background: var(--card); border-radius: 16px; font-size: 20px; cursor: pointer; box-shadow: var(--shadow); color: var(--ink); }
.choice:disabled { cursor: default; color: var(--ink); }
.choice.right, .spell-input.right { border-color: var(--right); background: var(--right-soft); }
.choice.wrong, .spell-input.wrong { border-color: var(--wrong); background: var(--wrong-soft); animation: shake .35s; }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }

.wordcard .word { text-align: left; }
.ipa { color: var(--muted); display: flex; align-items: center; gap: 10px; margin: 4px 0 8px; }
.zh { font-size: 24px; font-weight: 600; margin-bottom: 12px; }
.zh.big { font-size: 32px; text-align: center; margin-bottom: 0; }
.example { background: #faf6fb; border-radius: 14px; padding: 12px 14px; }
.example p { margin: 4px 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.spell { display: flex; flex-direction: column; gap: 14px; text-align: center; }
.spell-input { min-height: 56px; font-size: 26px; text-align: center; border: 2px solid var(--line); border-radius: 14px; padding: 0 12px; width: 100%; }
.feedback b { font-size: 26px; color: var(--right); }

.filters { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.filters input { grid-column: 1 / -1; }
select, input[type="text"], input[type="search"] { min-height: 48px; font-size: 17px; border-radius: 12px; border: 1px solid var(--line); padding: 0 12px; background: #fff; color: var(--ink); }
.wb-row { background: var(--card); border-radius: 14px; margin-bottom: 8px; box-shadow: var(--shadow); }
.wb-row summary { display: flex; align-items: center; gap: 10px; padding: 12px 16px; cursor: pointer; list-style: none; min-height: 48px; }
.wb-row summary::-webkit-details-marker { display: none; }
.wb-row summary .muted { flex: 1; }
.wb-row .details { padding: 0 16px 16px; }
.badge { font-size: 13px; padding: 2px 10px; border-radius: 999px; color: #fff; white-space: nowrap; }
.badge.s-new { color: var(--ink); }

.field { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; flex-wrap: wrap; }
.cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.cal-day { border-radius: 12px; background: #f5f0f7; padding: 6px 2px; text-align: center; font-size: 13px; }
.cal-day.ok { background: var(--right-soft); }
.cal-day .mark { font-size: 20px; }
.acc { width: 100%; border-collapse: collapse; font-size: 15px; }
.acc th, .acc td { text-align: left; padding: 6px 4px; border-bottom: 1px solid var(--line); }

.toast { position: fixed; left: 50%; bottom: 110px; transform: translateX(-50%); background: rgba(45, 42, 50, .92); color: #fff; padding: 12px 20px; border-radius: 999px; z-index: 30; font-size: 16px; animation: fadein .2s; max-width: calc(100% - 32px); text-align: center; }
.overlay { position: fixed; inset: 0; background: rgba(45, 42, 50, .45); display: flex; align-items: center; justify-content: center; z-index: 20; overflow: hidden; padding: 16px; }
.celebrate { text-align: center; width: min(360px, 100%); animation: pop .35s ease-out; position: relative; z-index: 1; }
.big-emoji { font-size: 64px; }
.gain { font-size: 36px; font-weight: 800; color: var(--primary-dark); margin: 8px 0; }
.confetti { position: absolute; top: -40px; font-size: 26px; animation: fall 2.6s linear forwards; }
@keyframes fall { to { transform: translateY(110vh) rotate(360deg); } }
@keyframes pop { from { transform: scale(.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
```

- [ ] **Step 6: 写发音和提示音**

`src/speech.js`：

```js
let speechVoice = null;

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  speechVoice =
    voices.find(v => /^en[-_]GB$/i.test(v.lang)) ||
    voices.find(v => /^en[-_]/i.test(v.lang)) ||
    null;
}

export function initSpeech() {
  if (!('speechSynthesis' in window)) return;
  pickVoice();
  window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

export function canSpeak() {
  return speechVoice !== null;
}

export function speak(text) {
  if (!speechVoice) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = speechVoice;
  u.lang = speechVoice.lang;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
  return true;
}
```

`src/sound.js`：

```js
let audioCtx = null;

export function playTone(ok) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = ok ? [880, 1320] : [220, 196];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t0 = audioCtx.currentTime + i * 0.1;
      osc.type = ok ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.15, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.26);
    });
  } catch {
    // 没有声音也不影响练习
  }
}
```

- [ ] **Step 7: 写通用界面组件**

`src/ui/dom.js`：

```js
import { canSpeak, speak } from '../speech.js';

const DOM_PROPS = ['value', 'checked', 'disabled'];

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (DOM_PROPS.includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false || c === '') continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export function toast(msg) {
  const el = h('div', { class: 'toast' }, msg);
  document.body.append(el);
  setTimeout(() => el.remove(), 1800);
}

export function speakButton(text, extraClass = '') {
  const cls = ['speak', extraClass, canSpeak() ? '' : 'disabled'].filter(Boolean).join(' ');
  return h('button', {
    class: cls,
    'aria-label': '发音',
    onclick: e => {
      e.stopPropagation();
      if (!speak(text)) toast('本设备不支持发音');
    },
  }, '🔊');
}

export const STATUS_LABEL = { new: '未筛查', known: '已掌握', forgotten: '遗忘', recovered: '已捡回' };

export function statusOf(state, id) {
  return state.words[id] ? state.words[id].status : 'new';
}

export function wordDetails(word) {
  return h('div', { class: 'details' },
    h('div', { class: 'ipa' }, `${word.ipa}  ${word.pos}`, speakButton(word.en)),
    h('div', { class: 'zh' }, word.zh),
    h('div', { class: 'example' },
      h('p', {}, word.ex, speakButton(word.ex)),
      h('p', { class: 'muted' }, word.exZh)));
}
```

- [ ] **Step 8: 写庆祝提示**

`src/ui/celebrate.js`：

```js
import { h, toast } from './dom.js';
import { playTone } from '../sound.js';

const CONFETTI = ['⭐', '🎈', '✨', '🎊'];

export function showEvents(events) {
  for (const e of events) {
    if (e.type === 'task') toast(`完成${e.task === 'review' ? '复习' : '筛查'}任务 +${e.stars} ⭐`);
  }
  const checkin = events.find(e => e.type === 'checkin');
  if (checkin) showCelebration(checkin);
}

function showCelebration(c) {
  const overlay = h('div', { class: 'overlay' },
    h('div', { class: 'celebrate card' },
      h('div', { class: 'big-emoji' }, '🎉'),
      h('h2', {}, '今日打卡成功！'),
      h('p', { class: 'gain' }, `+${c.stars} ⭐`),
      h('p', {}, `已连续打卡 ${c.streakDays} 天 🔥`),
      h('button', { class: 'btn primary big', onclick: () => overlay.remove() }, '太棒了！')));
  for (let i = 0; i < 24; i++) {
    overlay.append(h('span', {
      class: 'confetti',
      style: `left:${Math.random() * 100}%;animation-delay:${(Math.random() * 1.2).toFixed(2)}s`,
    }, CONFETTI[i % CONFETTI.length]));
  }
  document.body.append(overlay);
  playTone(true);
}
```

- [ ] **Step 9: 写首页**

`src/ui/home.js`：

```js
import { h, STATUS_LABEL } from './dom.js';
import { getState, go } from '../app.js';
import { remaining, countByStatus } from '../daily.js';
import { displayStreak } from '../rewards.js';
import { WORDS } from '../words/index.js';

const PROGRESS_ORDER = ['known', 'recovered', 'forgotten', 'new'];

export function renderHome() {
  const s = getState();
  const t = s.today;
  const counts = countByStatus(WORDS, s.words);
  const total = WORDS.length;
  return h('main', { class: 'view home' },
    h('header', { class: 'topbar' },
      h('div', { class: 'pill' }, `🔥 连续 ${displayStreak(s.stats, t.date)} 天`),
      h('div', { class: 'pill' }, `⭐ ${s.stats.stars}`)),
    h('h1', {}, '今日任务'),
    taskCard('① 复习遗忘词', t.reviewIds, t.reviewDone, 'review', '今天没有要复习的词'),
    taskCard('② 筛查单词', t.screenIds, t.screenDone, 'screen', '全部单词已筛查完 🎉'),
    h('section', { class: 'card' },
      h('h2', {}, `总进度（共 ${total} 词）`),
      h('div', { class: 'progress' }, ...PROGRESS_ORDER.map(k =>
        h('span', { class: `seg s-${k}`, style: `width:${total ? (counts[k] / total) * 100 : 0}%` }))),
      h('ul', { class: 'legend' }, ...PROGRESS_ORDER.map(k =>
        h('li', {}, h('i', { class: `dot s-${k}` }), `${STATUS_LABEL[k]} ${counts[k]}`)))));
}

function taskCard(title, list, done, view, emptyText) {
  const left = remaining(list, done).length;
  const finished = left === 0;
  return h('section', { class: `card task${finished ? ' done' : ''}` },
    h('div', {},
      h('h2', {}, title),
      h('p', { class: 'muted' }, list.length === 0 ? emptyText : `${list.length - left} / ${list.length}`)),
    finished
      ? h('span', { class: 'check' }, '✓')
      : h('button', { class: 'btn primary', onclick: () => go(view) }, left === list.length ? '开始' : '继续'));
}
```

- [ ] **Step 10: 写应用主控**

`src/app.js`：

```js
import { h } from './ui/dom.js';
import { showEvents } from './ui/celebrate.js';
import { renderHome } from './ui/home.js';
import { todayStr } from './dates.js';
import { ensureToday, remaining } from './daily.js';
import { recordAnswer, settle } from './session.js';
import { getStorage, loadState, saveState } from './storage.js';
import { initSpeech } from './speech.js';
import { WORDS } from './words/index.js';

const VIEWS = {
  home: renderHome,
};
const NAV_ITEMS = [['home', '🏠 首页'], ['wordbook', '📒 词本'], ['parent', '👨‍👩‍👧 家长']];
const WARNINGS = {
  unavailable: '⚠️ 浏览器不允许保存进度（可能开了无痕模式），关闭页面后今天的进度会丢失。',
  corrupt: '⚠️ 原来的进度数据损坏了，已经重新开始。损坏的数据已另存，请告诉家长。',
};

let appState = null;
let appStorage = null;
let appWarning = null;
let viewTimers = [];

export function getState() {
  return appState;
}

export function commit(next) {
  appState = next;
  if (!saveState(appStorage, next) && appWarning === null) appWarning = 'unavailable';
}

export function later(fn, ms) {
  viewTimers.push(setTimeout(fn, ms));
}

export function every(fn, ms) {
  const id = setInterval(fn, ms);
  viewTimers.push(id);
  return id;
}

function clearViewTimers() {
  for (const id of viewTimers) {
    clearTimeout(id);
    clearInterval(id);
  }
  viewTimers = [];
}

// 每次渲染前都检查日期：过了午夜就换成新一天的任务
function refreshDay() {
  const r = settle(ensureToday(appState, WORDS, todayStr()));
  commit(r.state);
  return r.events;
}

function navEl(view) {
  if (view === 'screen' || view === 'review') return '';
  return h('nav', { class: 'nav' }, ...NAV_ITEMS
    .filter(([key]) => VIEWS[key])
    .map(([key, label]) => h('button', { class: key === view ? 'active' : '', onclick: () => go(key) }, label)));
}

export function go(view) {
  clearViewTimers();
  const events = refreshDay();
  const banner = appWarning ? h('div', { class: 'banner' }, WARNINGS[appWarning]) : '';
  document.getElementById('app').replaceChildren(banner, VIEWS[view](), navEl(view));
  window.scrollTo(0, 0);
  showEvents(events);
}

export function answer(id, kind, ok) {
  const r = settle(recordAnswer(appState, id, kind, ok));
  commit(r.state);
  return r.events;
}

export function nextOrHome(view, events) {
  const t = appState.today;
  const left = view === 'screen' ? remaining(t.screenIds, t.screenDone) : remaining(t.reviewIds, t.reviewDone);
  if (left.length > 0) {
    go(view);
    return;
  }
  go('home');
  showEvents(events);
}

export function boot() {
  appStorage = getStorage();
  const loaded = loadState(appStorage);
  appWarning = loaded.warning;
  appState = loaded.state;
  initSpeech();
  const start = location.hash.slice(1);
  go(VIEWS[start] ? start : 'home');
}
```

说明：`refreshDay` 在跨天、或者当天任务数为 0 时，会产生星星或打卡事件；`go` 渲染完页面后把这些事件弹出来。`replaceChildren` 收到空字符串 `''` 时只会插入一个空文本节点，不影响页面。`location.hash` 只用于调试和截图（例如 `#screen` 直接打开筛查页）。

- [ ] **Step 11: 运行构建测试，确认通过**

Run: `node --test tests/build.test.js`
Expected: PASS（3 个测试）

- [ ] **Step 12: 用浏览器截图检查首页**

Run:
```bash
npm run build && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --window-size=414,900 --screenshot=/tmp/ket-home.png "file://$PWD/dist/ket-vocab.html" && echo ok
```
Expected: 输出 `ok`。用 Read 工具查看 `/tmp/ket-home.png`，应该能看到：
- 顶部有"🔥 连续 0 天"和"⭐ 0"。
- 两张任务卡："复习遗忘词"显示"今天没有要复习的词"并打勾；"筛查单词"显示 `0 / 50` 和"开始"按钮（此时词库只有 50 个家庭词）。
- 总进度条和图例。
- 底部导航只有"🏠 首页"。

- [ ] **Step 13: 运行全部测试**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 14: Commit**

```bash
git add build.mjs src tests/build.test.js
git commit -m "feat: 构建脚本、页面骨架与首页"
```

---

### Task 10: 筛查页

**Files:**
- Create: `src/ui/quiz.js`
- Create: `src/ui/screen.js`
- Modify: `src/app.js`（`import` 和 `VIEWS`）
- Modify: `build.mjs`（`ORDER`）

**Interfaces:**
- Consumes:
  - `h`、`speakButton`（dom.js）
  - `go`、`every`、`later`、`getState`、`answer`、`nextOrHome`（app.js）
  - `buildChoices`（Task 6）、`remaining`、`WORDS`、`WORD_BY_ID`、`playTone`
- Produces:
  - `quizHeader(title, doneCount, total): Element`
  - `wordPrompt(word): Element`
  - `listenPrompt(word): Element`
  - `choiceQuestion({ word, field, prompt, timerSec, onAnswer(ok) }): Element`
  - `renderScreen(): Element`

- [ ] **Step 1: 写题目组件**

`src/ui/quiz.js`：

```js
import { h, speakButton } from './dom.js';
import { go, every } from '../app.js';
import { buildChoices } from '../distractors.js';
import { WORDS } from '../words/index.js';
import { playTone } from '../sound.js';

export function quizHeader(title, doneCount, total) {
  return h('div', { class: 'quiz-head' },
    h('button', { class: 'back', onclick: () => go('home') }, '← 首页'),
    h('b', {}, title),
    h('div', { class: 'bar' }, h('span', { style: `width:${total ? (doneCount / total) * 100 : 0}%` })),
    h('span', { class: 'muted' }, `${doneCount}/${total}`));
}

export function wordPrompt(word) {
  return h('div', { class: 'prompt' }, h('div', { class: 'word' }, word.en), speakButton(word.en));
}

export function listenPrompt(word) {
  return h('div', { class: 'prompt' }, speakButton(word.en, 'huge'));
}

// timerSec 为 0 表示不限时；超时按答错处理
export function choiceQuestion({ word, field, prompt, timerSec, onAnswer }) {
  const choices = buildChoices(word, WORDS, field);
  let answered = false;
  const fill = h('div', { class: 'timer-fill' });
  const buttons = choices.map(c => h('button', { class: 'choice', onclick: () => finish(c) }, c.label));

  function finish(picked) {
    if (answered) return;
    answered = true;
    const ok = Boolean(picked && picked.correct);
    choices.forEach((c, i) => {
      buttons[i].disabled = true;
      if (c.correct) buttons[i].classList.add('right');
      else if (c === picked) buttons[i].classList.add('wrong');
    });
    playTone(ok);
    onAnswer(ok);
  }

  if (timerSec > 0) {
    const start = Date.now();
    const id = every(() => {
      if (answered) {
        clearInterval(id);
        return;
      }
      const frac = (Date.now() - start) / (timerSec * 1000);
      fill.style.width = `${Math.max(0, 100 - frac * 100)}%`;
      if (frac >= 1) {
        clearInterval(id);
        finish(null);
      }
    }, 100);
  }

  return h('div', { class: 'quiz' },
    prompt,
    timerSec > 0 ? h('div', { class: 'timer' }, fill) : '',
    h('div', { class: 'choices' }, buttons));
}
```

- [ ] **Step 2: 写筛查页**

`src/ui/screen.js`：

```js
import { h } from './dom.js';
import { getState, answer, nextOrHome, later, go } from '../app.js';
import { remaining } from '../daily.js';
import { WORD_BY_ID } from '../words/index.js';
import { quizHeader, wordPrompt, choiceQuestion } from './quiz.js';

export function renderScreen() {
  const s = getState();
  const t = s.today;
  const ids = remaining(t.screenIds, t.screenDone);
  if (ids.length === 0) {
    later(() => go('home'), 0);
    return h('main', { class: 'view' });
  }
  const word = WORD_BY_ID.get(ids[0]);
  return h('main', { class: 'view quiz-view' },
    quizHeader('🔍 筛查', t.screenIds.length - ids.length, t.screenIds.length),
    h('p', { class: 'muted center' }, '选出正确的中文意思'),
    choiceQuestion({
      word,
      field: 'zh',
      prompt: wordPrompt(word),
      timerSec: s.settings.timerSec,
      onAnswer: ok => {
        const events = answer(word.id, 'screen', ok);
        later(() => nextOrHome('screen', events), ok ? 700 : 1500);
      },
    }));
}
```

- [ ] **Step 3: 注册视图**

在 `src/app.js` 中：在 `import { renderHome } from './ui/home.js';` 下面加一行：

```js
import { renderScreen } from './ui/screen.js';
```

把 `VIEWS` 改成：

```js
const VIEWS = {
  home: renderHome,
  screen: renderScreen,
};
```

在 `build.mjs` 的 `ORDER` 中，把 `'src/ui/home.js',` 改成：

```js
  'src/ui/home.js',
  'src/ui/quiz.js',
  'src/ui/screen.js',
```

- [ ] **Step 4: 构建，跑测试**

Run: `npm test && npm run build`
Expected: 全部 PASS，并输出 `已生成 dist/ket-vocab.html`

- [ ] **Step 5: 截图检查筛查页**

Run:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --window-size=414,900 --screenshot=/tmp/ket-screen.png "file://$PWD/dist/ket-vocab.html#screen" && echo ok
```
Expected: 输出 `ok`。查看 `/tmp/ket-screen.png`，应该能看到：
- 顶部有"← 首页"、"🔍 筛查"、进度 `0/50`。
- 一个大号英文单词和 🔊 按钮。
- 倒计时条。
- 4 个中文选项（414px 宽时排成一列）。

- [ ] **Step 6: 手动走一遍**

用 `open dist/ket-vocab.html` 在浏览器里打开，检查以下几点：
1. 点"开始"进入筛查。
2. 答对：选项变绿，约 0.7 秒后进入下一题。
3. 答错：选错的选项抖动变红，正确选项变绿，约 1.5 秒后进入下一题。
4. 不答：8 秒后倒计时条走完，按答错处理。
5. 中途点"← 首页"，首页显示的进度和已答题数一致；点"继续"，从下一题接着做。

- [ ] **Step 7: Commit**

```bash
git add src/ui/quiz.js src/ui/screen.js src/app.js build.mjs
git commit -m "feat: 筛查页（四选一、倒计时）"
```

---

### Task 11: 复习页

**Files:**
- Create: `src/ui/review.js`
- Modify: `src/app.js`（`import` 和 `VIEWS`）
- Modify: `build.mjs`（`ORDER`）

**Interfaces:**
- Consumes:
  - `quizHeader`、`wordPrompt`、`listenPrompt`、`choiceQuestion`（Task 10）
  - `wordDetails`、`speakButton`、`h`（dom.js）
  - `isCheckItem`（Task 2）、`isSpellingCorrect`（Task 5）
  - `getState`、`answer`、`nextOrHome`、`later`、`go`（app.js）
  - `speak`、`playTone`
- Produces: `renderReview(): Element`

- [ ] **Step 1: 写复习页**

`src/ui/review.js`：

```js
import { h, wordDetails, speakButton } from './dom.js';
import { getState, answer, nextOrHome, later, go } from '../app.js';
import { remaining } from '../daily.js';
import { isCheckItem } from '../srs.js';
import { isSpellingCorrect } from '../session.js';
import { WORD_BY_ID } from '../words/index.js';
import { speak } from '../speech.js';
import { playTone } from '../sound.js';
import { quizHeader, wordPrompt, listenPrompt, choiceQuestion } from './quiz.js';

export function renderReview() {
  const s = getState();
  const t = s.today;
  const ids = remaining(t.reviewIds, t.reviewDone);
  if (ids.length === 0) {
    later(() => go('home'), 0);
    return h('main', { class: 'view' });
  }
  const word = WORD_BY_ID.get(ids[0]);
  const header = quizHeader('🔁 复习', t.reviewIds.length - ids.length, t.reviewIds.length);
  let events = [];
  const next = () => nextOrHome('review', events);
  const afterChoice = kind => ok => {
    events = answer(word.id, kind, ok);
    later(next, ok ? 700 : 1500);
  };

  // 已掌握 / 已捡回的词到期抽查：和筛查一样的四选一
  if (isCheckItem(s.words[word.id])) {
    return h('main', { class: 'view quiz-view' }, header,
      h('p', { class: 'muted center' }, '抽查：还记得这个词吗？'),
      choiceQuestion({ word, field: 'zh', prompt: wordPrompt(word), timerSec: s.settings.timerSec, onAnswer: afterChoice('check') }));
  }

  // 遗忘词：第 1 步看单词卡，第 2 步拼写（或听音选词）
  const main = h('main', { class: 'view quiz-view' }, header);
  const showSecondStep = () => {
    if (s.settings.spelling) {
      const q = spellQuestion(word, {
        onResult: ok => {
          events = answer(word.id, 'review', ok);
          if (ok) later(next, 800);
        },
        onNext: next,
      });
      main.replaceChildren(header, q);
      q.querySelector('input').focus(); // 同步聚焦，iPad 才会弹出键盘
    } else {
      main.replaceChildren(header,
        h('p', { class: 'muted center' }, '听发音，选出正确的单词'),
        choiceQuestion({ word, field: 'en', prompt: listenPrompt(word), timerSec: 0, onAnswer: afterChoice('review') }));
    }
    speak(word.en);
  };
  main.append(h('div', { class: 'card wordcard' },
    h('div', { class: 'word' }, word.en),
    wordDetails(word),
    h('button', { class: 'btn primary big', onclick: showSecondStep }, '我记住了 →')));
  later(() => speak(word.en), 300);
  return main;
}

function spellQuestion(word, { onResult, onNext }) {
  const input = h('input', {
    class: 'spell-input', type: 'text', placeholder: '输入英文',
    autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
  });
  const submit = h('button', { class: 'btn primary', onclick: () => check() }, '提交');
  const feedback = h('div', { class: 'feedback' });
  let checked = false;
  const check = () => {
    if (checked || input.value.trim() === '') return;
    checked = true;
    const ok = isSpellingCorrect(input.value, word.en);
    input.disabled = true;
    submit.disabled = true;
    input.classList.add(ok ? 'right' : 'wrong');
    playTone(ok);
    onResult(ok);
    if (ok) {
      feedback.replaceChildren('✅ 拼对了！');
      return;
    }
    const cont = h('button', { class: 'btn primary', onclick: onNext }, '继续 →');
    feedback.replaceChildren(h('p', {}, '正确拼写：', h('b', {}, word.en)), cont);
    cont.focus();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') check();
  });
  return h('div', { class: 'card spell' },
    h('div', { class: 'zh big' }, word.zh),
    h('div', { class: 'row', style: 'justify-content:center' }, speakButton(word.en), h('span', { class: 'muted' }, word.pos)),
    input,
    submit,
    feedback);
}
```

- [ ] **Step 2: 注册视图**

在 `src/app.js` 中，在 `import { renderScreen } from './ui/screen.js';` 下面加一行：

```js
import { renderReview } from './ui/review.js';
```

`VIEWS` 中加一项：`review: renderReview,`

在 `build.mjs` 的 `ORDER` 中，`'src/ui/screen.js',` 后面加一行：`'src/ui/review.js',`

- [ ] **Step 3: 构建，跑测试**

Run: `npm test && npm run build`
Expected: 全部 PASS

- [ ] **Step 4: 手动走一遍复习流程**

1. 打开 `dist/ket-vocab.html`，在筛查中故意答错 3 个词。
2. 在浏览器开发者工具的 Console 中执行下面的代码，把这 3 个遗忘词的复习日期改成今天：

   ```js
   const k='ketVocab.v1', s=JSON.parse(localStorage[k]); for (const r of Object.values(s.words)) if (r.status==='forgotten') r.due=s.today.date; s.today=null; localStorage[k]=JSON.stringify(s); location.reload();
   ```
3. 首页应该显示"复习遗忘词 0 / 3"，点"开始"。
4. 单词卡：显示英文、音标、中文、例句，并自动朗读一次。点"我记住了"。
5. 拼写页：输入框自动获得焦点。
   - 输入正确（可以试试首字母大写），显示"✅ 拼对了"，自动进入下一题。
   - 输入错误，显示正确拼写和"继续"按钮，按回车或点按钮进入下一题。
6. 3 个词都做完后回到首页，弹出"完成复习任务 +5 ⭐"提示。

- [ ] **Step 5: Commit**

```bash
git add src/ui/review.js src/app.js build.mjs
git commit -m "feat: 复习页（单词卡、拼写、听音选词、抽查）"
```

---

### Task 12: 词本

**Files:**
- Create: `src/ui/wordbook.js`
- Modify: `src/app.js`（`import` 和 `VIEWS`）
- Modify: `build.mjs`（`ORDER`）

**Interfaces:**
- Consumes: `h`、`wordDetails`、`statusOf`、`STATUS_LABEL`（dom.js）；`getState`；`WORDS`；`TOPICS`；`speak`
- Produces: `renderWordbook(): Element`

- [ ] **Step 1: 写词本页**

`src/ui/wordbook.js`：

```js
import { h, wordDetails, statusOf, STATUS_LABEL } from './dom.js';
import { getState } from '../app.js';
import { WORDS } from '../words/index.js';
import { TOPICS } from '../words/topics.js';
import { speak } from '../speech.js';

// 记住筛选条件：离开词本再回来时保持不变
let wbTopic = 'all';
let wbStatus = 'all';
let wbQuery = '';

export function renderWordbook() {
  const s = getState();
  const list = h('div', { class: 'wb-list' });
  const draw = () => {
    const q = wbQuery.trim().toLowerCase();
    const rows = WORDS.filter(w =>
      (wbTopic === 'all' || w.topic === wbTopic) &&
      (wbStatus === 'all' || statusOf(s, w.id) === wbStatus) &&
      (q === '' || w.en.toLowerCase().includes(q) || w.zh.includes(q)));
    list.replaceChildren(h('p', { class: 'muted' }, `共 ${rows.length} 个`), ...rows.map(w => wordbookRow(s, w)));
  };
  const topicSel = h('select', { onchange: e => { wbTopic = e.target.value; draw(); } },
    h('option', { value: 'all' }, '全部话题'),
    ...TOPICS.map(t => h('option', { value: t.key }, t.zh)));
  topicSel.value = wbTopic;
  const statusSel = h('select', { onchange: e => { wbStatus = e.target.value; draw(); } },
    h('option', { value: 'all' }, '全部状态'),
    ...Object.entries(STATUS_LABEL).map(([k, label]) => h('option', { value: k }, label)));
  statusSel.value = wbStatus;
  const search = h('input', {
    type: 'search', placeholder: '搜索英文或中文', value: wbQuery,
    oninput: e => { wbQuery = e.target.value; draw(); },
  });
  draw();
  return h('main', { class: 'view' },
    h('h1', {}, '📒 词本'),
    h('div', { class: 'filters' }, topicSel, statusSel, search),
    list);
}

function wordbookRow(s, w) {
  const st = statusOf(s, w.id);
  return h('details', { class: 'wb-row', ontoggle: e => { if (e.target.open) speak(w.en); } },
    h('summary', {},
      h('b', {}, w.en),
      h('span', { class: 'muted' }, w.zh),
      h('span', { class: `badge s-${st}` }, STATUS_LABEL[st])),
    wordDetails(w));
}
```

- [ ] **Step 2: 注册视图**

在 `src/app.js` 中，在 `import { renderReview } from './ui/review.js';` 下面加一行：

```js
import { renderWordbook } from './ui/wordbook.js';
```

`VIEWS` 中加一项：`wordbook: renderWordbook,`

在 `build.mjs` 的 `ORDER` 中，`'src/ui/review.js',` 后面加一行：`'src/ui/wordbook.js',`

- [ ] **Step 3: 构建，跑测试，截图**

Run:
```bash
npm test && npm run build && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --window-size=414,900 --screenshot=/tmp/ket-wordbook.png "file://$PWD/dist/ket-vocab.html#wordbook" && echo ok
```
Expected: 全部 PASS，最后输出 `ok`。查看截图，应该能看到：
- 标题"📒 词本"。
- 两个下拉框和一个搜索框。
- "共 50 个"和单词列表，每行有英文、中文和状态标签。
- 底部导航出现"📒 词本"。

- [ ] **Step 4: 手动检查**

1. 选择话题或状态后，列表随之变化。
2. 搜索 `bro` 或"兄"，能找到 brother。
3. 点开一行，显示音标、例句，并自动朗读。

- [ ] **Step 5: Commit**

```bash
git add src/ui/wordbook.js src/app.js build.mjs
git commit -m "feat: 词本（按话题/状态筛选、搜索）"
```

---

### Task 13: 家长页

**Files:**
- Create: `src/ui/parent.js`
- Modify: `src/app.js`（`import` 和 `VIEWS`）
- Modify: `build.mjs`（`ORDER`）

**Interfaces:**
- Consumes:
  - `h`、`toast`（dom.js）
  - `getState`、`commit`、`go`（app.js）
  - `SCREEN_OPTIONS`、`TIMER_OPTIONS`、`defaultState`、`exportJSON`、`importJSON`（Task 7）
  - `countByStatus`、`ensureToday`（Task 3）
  - `addDays`、`todayStr`（Task 1）
  - `WORDS`
- Produces: `renderParent(): Element`

- [ ] **Step 1: 写家长页**

`src/ui/parent.js`：

```js
import { h, toast } from './dom.js';
import { getState, commit, go } from '../app.js';
import { SCREEN_OPTIONS, TIMER_OPTIONS, defaultState, exportJSON, importJSON } from '../storage.js';
import { countByStatus, ensureToday } from '../daily.js';
import { addDays, todayStr } from '../dates.js';
import { WORDS } from '../words/index.js';

export function renderParent() {
  const s = getState();
  return h('main', { class: 'view' },
    h('h1', {}, '👨‍👩‍👧 家长'),
    settingsCard(s),
    statsCard(s),
    backupCard(),
    resetCard());
}

function updateSettings(patch, msg) {
  const s = getState();
  commit({ ...s, settings: { ...s.settings, ...patch } });
  toast(msg);
}

function selectField(label, value, options, onPick) {
  const sel = h('select', { onchange: e => onPick(e.target.value) },
    ...options.map(([v, text]) => h('option', { value: String(v) }, text)));
  sel.value = String(value);
  return h('label', { class: 'field' }, h('span', {}, label), sel);
}

function settingsCard(s) {
  const st = s.settings;
  return h('section', { class: 'card' },
    h('h2', {}, '设置'),
    selectField('每日筛查数量', st.dailyScreen, SCREEN_OPTIONS.map(n => [n, `${n} 个`]),
      v => updateSettings({ dailyScreen: Number(v) }, '已保存，从明天起生效')),
    selectField('筛查倒计时', st.timerSec, TIMER_OPTIONS.map(n => [n, n === 0 ? '关闭' : `${n} 秒`]),
      v => updateSettings({ timerSec: Number(v) }, '已保存')),
    selectField('复习时拼写', st.spelling, [[true, '开启'], [false, '关闭（改为听音选词）']],
      v => updateSettings({ spelling: v === 'true' }, '已保存')));
}

function formatRate(right, total) {
  return total ? `${right}/${total}（${Math.round((right / total) * 100)}%）` : '—';
}

function statsCard(s) {
  const today = s.today.date;
  const c = countByStatus(WORDS, s.words);
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(addDays(today, -i));
  const history = s.stats.history;
  const rows = days.filter(d => history[d]).reverse().map(d =>
    h('tr', {},
      h('td', {}, d.slice(5)),
      h('td', {}, formatRate(history[d].screenRight, history[d].screenTotal)),
      h('td', {}, formatRate(history[d].reviewRight, history[d].reviewTotal))));
  return h('section', { class: 'card' },
    h('h2', {}, '学习统计'),
    h('p', {}, `已筛查 ${WORDS.length - c.new} / ${WORDS.length} 词：已掌握 ${c.known}，遗忘待复习 ${c.forgotten}，已捡回 ${c.recovered}`),
    h('p', {}, `星星 ⭐ ${s.stats.stars}　当前连续打卡 ${s.stats.lastCheckin ? s.stats.streakDays : 0} 天（最后打卡 ${s.stats.lastCheckin || '—'}）`),
    h('h3', {}, '最近 14 天打卡'),
    h('div', { class: 'cal' }, ...days.map(d => {
      const ok = Boolean(history[d] && history[d].checked);
      return h('div', { class: `cal-day${ok ? ' ok' : ''}` }, h('div', {}, d.slice(5)), h('div', { class: 'mark' }, ok ? '✅' : '·'));
    })),
    h('h3', {}, '每日正确率'),
    rows.length
      ? h('table', { class: 'acc' }, h('tr', {}, h('th', {}, '日期'), h('th', {}, '筛查'), h('th', {}, '复习')), ...rows)
      : h('p', { class: 'muted' }, '还没有记录'));
}

function backupCard() {
  const fileInput = h('input', {
    type: 'file', accept: '.json,application/json', style: 'display:none',
    onchange: e => importFile(e.target.files[0]),
  });
  return h('section', { class: 'card' },
    h('h2', {}, '备份进度'),
    h('p', { class: 'muted' }, '换设备或清理浏览器之前先导出备份，之后可以导入恢复。'),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: exportBackup }, '导出备份'),
      h('button', { class: 'btn', onclick: () => fileInput.click() }, '导入备份'),
      fileInput));
}

function exportBackup() {
  const url = URL.createObjectURL(new Blob([exportJSON(getState())], { type: 'application/json' }));
  const a = h('a', { href: url, download: `ket-vocab-backup-${todayStr()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importFile(file) {
  if (!file) return;
  try {
    const imported = importJSON(await file.text());
    if (!confirm('导入后会覆盖当前进度，确定吗？')) return;
    commit(ensureToday(imported, WORDS, todayStr()));
    toast('导入成功');
    go('parent');
  } catch (err) {
    toast(err.message);
  }
}

function resetCard() {
  const input = h('input', { type: 'text', placeholder: '输入“重置”两个字' });
  const doReset = () => {
    if (input.value.trim() !== '重置') {
      toast('请输入“重置”两个字');
      return;
    }
    commit(ensureToday(defaultState(), WORDS, todayStr()));
    toast('已重置');
    go('home');
  };
  return h('section', { class: 'card' },
    h('h2', {}, '重置进度'),
    h('p', { class: 'muted' }, '清空全部学习记录和星星，无法撤销。建议先导出备份。'),
    h('div', { class: 'row' }, input, h('button', { class: 'btn danger', onclick: doReset }, '重置')));
}
```

- [ ] **Step 2: 注册视图**

在 `src/app.js` 中，在 `import { renderWordbook } from './ui/wordbook.js';` 下面加一行：

```js
import { renderParent } from './ui/parent.js';
```

`VIEWS` 中加一项：`parent: renderParent,`

在 `build.mjs` 的 `ORDER` 中，`'src/ui/wordbook.js',` 后面加一行：`'src/ui/parent.js',`

- [ ] **Step 3: 构建，跑测试，截图**

Run:
```bash
npm test && npm run build && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --window-size=414,1400 --screenshot=/tmp/ket-parent.png "file://$PWD/dist/ket-vocab.html#parent" && echo ok
```
Expected: 全部 PASS，输出 `ok`。截图里应该能看到四张卡片：设置、学习统计（包括 14 天打卡日历）、备份进度、重置进度；底部导航有 3 个按钮。

- [ ] **Step 4: 手动检查**

1. 把倒计时改成"关闭"，进入筛查后不再出现倒计时条。
2. 把拼写改成"关闭"，复习的第 2 步变成听音选词。
3. 点"导出备份"，会下载一个 json 文件。
4. 重置：
   - 不输入任何内容直接点"重置"，提示"请输入“重置”两个字"。
   - 输入"重置"后再点，进度清零，并回到首页。
5. 导入：
   - 导入刚才导出的文件，确认后进度恢复。
   - 导入一个随便的 json 文件，提示"文件不是有效的备份"，进度不变。

- [ ] **Step 5: Commit**

```bash
git add src/ui/parent.js src/app.js build.mjs
git commit -m "feat: 家长页（设置、统计、备份、重置）"
```

---

### Task 14: 词库 · 学校、食物、房屋、衣服、身体

**Files:**
- Modify: `src/words/school.js`（70 词）、`food.js`（100 词）、`home.js`（70 词）、`clothes.js`（40 词）、`body.js`（50 词）

**Interfaces:**
- Consumes: Task 8 的数据格式和词库编写规则
- Produces: 这 5 个话题的数据，共约 330 词

- [ ] **Step 1: 编写 5 个话题的数据**

按 Task 8 Step 5 的"词库编写规则"写。各话题的选词方向：

| 话题 | 文件 | 目标 | 选词方向 |
|---|---|---|---|
| 学校与学习 | `school.js` | 70 | 学科、教室用品、学校场所、课堂动作（如 `homework`、`dictionary`、`rubber`、`timetable`、`spell`） |
| 食物与饮料 | `food.js` | 100 | 水果、蔬菜、主食、零食、饮料、餐具、三餐、味道（如 `breakfast`、`sandwich`、`delicious`、`menu`） |
| 房屋与家居 | `home.js` | 70 | 房间、家具、家电、家务（如 `kitchen`、`sofa`、`fridge`、`tidy`、`stairs`） |
| 衣服与配饰 | `clothes.js` | 40 | 衣物、鞋帽、配饰、穿着动作（如 `jacket`、`trainers`、`umbrella`、`put on`） |
| 身体与健康 | `body.js` | 50 | 身体部位、常见病痛、看病（如 `headache`、`dentist`、`medicine`、`well`） |

- [ ] **Step 2: 运行词库测试**

Run: `node --test tests/words.test.js`
Expected: PASS。如果失败，按报错信息修正（常见问题：与其他话题重复、词性写成 `noun`、音标没加 `/`、用了弯引号）。

- [ ] **Step 3: 运行全部测试并构建**

Run: `npm test && npm run build`
Expected: 全部 PASS，构建输出约 380 词，并提示还没达到 1400–1600 词

- [ ] **Step 4: Commit**

```bash
git add src/words
git commit -m "feat(words): 学校、食物、房屋、衣服、身体话题"
```

---

### Task 15: 词库 · 运动、爱好、旅行、地点、天气、动物、自然

**Files:**
- Modify: `src/words/sport.js`（50）、`hobbies.js`（60）、`travel.js`（70）、`places.js`（70）、`weather.js`（30）、`animals.js`（50）、`nature.js`（40）

**Interfaces:**
- Consumes: Task 8 的数据格式和词库编写规则
- Produces: 这 7 个话题的数据，共约 370 词

- [ ] **Step 1: 编写 7 个话题的数据**

| 话题 | 文件 | 目标 | 选词方向 |
|---|---|---|---|
| 运动 | `sport.js` | 50 | 运动项目、场地器材、比赛（如 `basketball`、`team`、`win`、`swimming pool`） |
| 爱好与休闲 | `hobbies.js` | 60 | 音乐、绘画、阅读、游戏、电影、聚会（如 `guitar`、`camping`、`cartoon`、`hobby`） |
| 旅行与交通 | `travel.js` | 70 | 交通工具、出行、住宿、行李、方向（如 `airport`、`ticket`、`suitcase`、`hotel`、`turn left`） |
| 地点与建筑 | `places.js` | 70 | 城市设施、建筑、国家相关（如 `library`、`museum`、`bridge`、`village`） |
| 天气 | `weather.js` | 30 | 天气现象、温度、季节（如 `cloudy`、`degree`、`storm`、`autumn`） |
| 动物 | `animals.js` | 50 | 宠物、农场动物、野生动物、昆虫（如 `rabbit`、`elephant`、`insect`、`wing`） |
| 自然与环境 | `nature.js` | 40 | 自然地貌、植物、环保（如 `mountain`、`forest`、`flower`、`recycle`） |

- [ ] **Step 2: 运行词库测试**

Run: `node --test tests/words.test.js`
Expected: PASS

- [ ] **Step 3: 运行全部测试并构建**

Run: `npm test && npm run build`
Expected: 全部 PASS，构建输出约 750 词

- [ ] **Step 4: Commit**

```bash
git add src/words
git commit -m "feat(words): 运动、爱好、旅行、地点、天气、动物、自然话题"
```

---

### Task 16: 词库 · 购物、工作、科技、时间、数字、情感

**Files:**
- Modify: `src/words/shopping.js`（50）、`work.js`（50）、`tech.js`（40）、`time.js`（60）、`numbers.js`（50）、`feelings.js`（50）

**Interfaces:**
- Consumes: Task 8 的数据格式和词库编写规则
- Produces: 这 6 个话题的数据，共约 300 词

- [ ] **Step 1: 编写 6 个话题的数据**

| 话题 | 文件 | 目标 | 选词方向 |
|---|---|---|---|
| 购物与金钱 | `shopping.js` | 50 | 商店、价格、付款、尺码（如 `cheap`、`price`、`receipt`、`size`、`pound`） |
| 工作与职业 | `work.js` | 50 | 常见职业、工作场所（如 `doctor`、`farmer`、`office`、`job`） |
| 科技与通讯 | `tech.js` | 40 | 电脑、手机、网络、邮件（如 `email`、`website`、`download`、`password`） |
| 时间与日期 | `time.js` | 60 | 星期、月份、时段、时间表达（如 `Monday`、`January`、`o'clock`、`weekend`、`tonight`） |
| 数字与数量 | `numbers.js` | 50 | 基数词、序数词、数量词（如 `twelve`、`hundred`、`first`、`half`、`dozen`） |
| 情感与性格 | `feelings.js` | 50 | 情绪、性格（如 `happy`、`angry`、`bored`、`friendly`、`shy`） |

- [ ] **Step 2: 运行词库测试**

Run: `node --test tests/words.test.js`
Expected: PASS

- [ ] **Step 3: 运行全部测试并构建**

Run: `npm test && npm run build`
Expected: 全部 PASS，构建输出约 1050 词

- [ ] **Step 4: Commit**

```bash
git add src/words
git commit -m "feat(words): 购物、工作、科技、时间、数字、情感话题"
```

---

### Task 17: 词库 · 常用动词

**Files:**
- Modify: `src/words/verbs.js`（200 词）

**Interfaces:**
- Consumes: Task 8 的数据格式和词库编写规则
- Produces: 常用动词数据，约 200 词

- [ ] **Step 1: 编写常用动词**

选 A2 词表里前面各话题没有收录的通用动词和动词短语，例如 `arrive`、`borrow`、`carry`、`decide`、`explain`、`forget`、`hope`、`invite`、`look for`、`give up`。
- 词性标 `v.`，动词短语标 `phr.`。
- 中文写原形的意思。
- 例句可以用过去式等变形（例如 `I forgot my key.`）。

- [ ] **Step 2: 运行词库测试**

Run: `node --test tests/words.test.js`
Expected: PASS

- [ ] **Step 3: 运行全部测试并构建**

Run: `npm test && npm run build`
Expected: 全部 PASS，构建输出约 1250 词

- [ ] **Step 4: Commit**

```bash
git add src/words/verbs.js
git commit -m "feat(words): 常用动词"
```

---

### Task 18: 词库 · 形容词副词、功能词 + 总词数检查

**Files:**
- Modify: `src/words/describe.js`（150 词）、`src/words/function.js`（150 词）
- Modify: `tests/words.test.js`（加总词数测试）

**Interfaces:**
- Consumes: Task 8 的数据格式和词库编写规则
- Produces: 完整词库（1400–1600 词），以及强制检查总词数的测试

- [ ] **Step 1: 加总词数测试（这时应该失败）**

在 `tests/words.test.js` 末尾追加：

```js
test('词库总数在 1400–1600 之间', () => {
  assert.ok(WORDS.length >= 1400 && WORDS.length <= 1600, `当前 ${WORDS.length} 词`);
});
```

Run: `node --test tests/words.test.js`
Expected: FAIL，报错 `当前 1250 词` 左右

- [ ] **Step 2: 编写两个话题的数据**

| 话题 | 文件 | 目标 | 选词方向 |
|---|---|---|---|
| 常用形容词与副词 | `describe.js` | 150 | 描述大小、形状、颜色、品质、程度、频率（如 `different`、`dangerous`、`quiet`、`usually`、`already`、`quickly`） |
| 功能词 | `function.js` | 150 | 代词、介词、连词、限定词、疑问词、感叹词、常用短语（如 `although`、`between`、`each`、`whose`、`someone`、`excuse me`） |

注意：
- `describe.js` 里的颜色词，如果前面的话题已经收录过，就不要重复（校验会报错）。
- 功能词很难出四选一的中文，中文释义要写得能区分开，例如 `among` 写"在……之中（三者以上）"，`between` 写"在……之间"。

- [ ] **Step 3: 运行词库测试，确认通过**

Run: `node --test tests/words.test.js`
Expected: PASS（5 个测试）

- [ ] **Step 4: 运行全部测试并构建**

Run: `npm test && npm run build`
Expected: 全部 PASS；构建输出 1400–1600 词，没有"提示"行，文件大小约 300–400 KB

- [ ] **Step 5: Commit**

```bash
git add src/words tests/words.test.js
git commit -m "feat(words): 形容词副词、功能词，词库完成"
```

---

### Task 19: 最终验证

**Files:**
- 不新增文件（发现问题时，修改对应模块）

**Interfaces:**
- Consumes: 全部
- Produces: 验证通过的 `dist/ket-vocab.html`

- [ ] **Step 1: 全部测试 + 构建**

Run: `npm test && npm run build`
Expected: 全部 PASS；输出 `已生成 dist/ket-vocab.html（1xxx 词，约 3xx KB）`

- [ ] **Step 2: 检查产物没有外部依赖**

Run: `grep -cE "https?://" dist/ket-vocab.html || true`
Expected: `0`

- [ ] **Step 3: 两种屏幕宽度截图**

Run:
```bash
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; F="file://$PWD/dist/ket-vocab.html"
"$C" --headless=new --disable-gpu --window-size=360,800 --screenshot=/tmp/ket-360.png "$F" && \
"$C" --headless=new --disable-gpu --window-size=1024,768 --screenshot=/tmp/ket-1024.png "$F#screen" && echo ok
```
Expected: 输出 `ok`。查看两张截图：
- 360px 宽时没有横向溢出，任务卡和进度条完整显示。
- 1024px 宽时内容居中，最大宽度约 720px。

- [ ] **Step 4: 完整手动流程（照着 spec 11.2 走一遍）**

在 Chrome 和 Safari 中分别打开 `dist/ket-vocab.html`：
1. 首页 → 筛查 50 个，其中故意答错几个 → 回到首页，弹出"完成筛查任务 +5 ⭐"。复习任务为空，所以同时弹出打卡庆祝画面（显示 +5 ⭐，连续 1 天）。顶部显示 ⭐ 10、🔥 连续 1 天。
2. 词本：状态选"遗忘"，能看到刚才答错的词。
3. 用 Task 11 Step 4 的 Console 代码，把遗忘词改成今天到期 → 完成复习（拼写对、错各试一次）。
4. 家长页：查看统计和日历 → 导出 → 重置 → 导入恢复 → 进度和星星都回来了。
5. 🔊 发音：Chrome 和 Safari 都能读出英音。如果设备没有英语语音，会提示"本设备不支持发音"。
6. 用 Safari 的无痕窗口打开：顶部显示黄色提示"浏览器不允许保存进度"，但仍然可以正常答题。

- [ ] **Step 5: 请家长抽查词库**

把家长需要抽查的地方整理出来：每个话题随机挑 5 个词，列出英文、中文和例句，请家长确认质量。如果有问题，修改后重新执行 Step 1。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: 最终验证通过"
```

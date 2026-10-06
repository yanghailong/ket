import { h } from './ui/dom.js';
import { showEvents } from './ui/celebrate.js';
import { renderHome } from './ui/home.js';
import { renderScreen } from './ui/screen.js';
import { renderReview } from './ui/review.js';
import { renderWordbook } from './ui/wordbook.js';
import { renderParent } from './ui/parent.js';
import { todayStr } from './dates.js';
import { ensureToday, remaining } from './daily.js';
import { recordAnswer, settle } from './session.js';
import { getStorage, loadState, saveState } from './storage.js';
import { initSpeech } from './speech.js';
import { WORDS } from './words/index.js';

const VIEWS = {
  home: renderHome,
  screen: renderScreen,
  review: renderReview,
  wordbook: renderWordbook,
  parent: renderParent,
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
// 已结算但还没展示的奖励事件：不管孩子从哪条路离开题目页，下一次渲染都会弹出来
let pendingEvents = [];

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
  const events = [...pendingEvents, ...refreshDay()];
  pendingEvents = [];
  const banner = appWarning ? h('div', { class: 'banner' }, WARNINGS[appWarning]) : '';
  document.getElementById('app').replaceChildren(banner, VIEWS[view](), navEl(view));
  window.scrollTo(0, 0);
  showEvents(events);
}

export function answer(id, kind, ok) {
  const r = settle(recordAnswer(appState, id, kind, ok));
  commit(r.state);
  pendingEvents.push(...r.events);
}

export function nextOrHome(view) {
  const t = appState.today;
  const left = view === 'screen' ? remaining(t.screenIds, t.screenDone) : remaining(t.reviewIds, t.reviewDone);
  go(left.length > 0 ? view : 'home');
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

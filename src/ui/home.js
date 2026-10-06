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

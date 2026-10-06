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

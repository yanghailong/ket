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

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

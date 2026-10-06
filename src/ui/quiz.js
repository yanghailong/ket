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

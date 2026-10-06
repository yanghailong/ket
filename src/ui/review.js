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

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

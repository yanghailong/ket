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

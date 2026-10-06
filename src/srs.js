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

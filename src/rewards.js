import { addDays } from './dates.js';

export const TASK_STARS = 5;
export const CHECKIN_STARS = 5;

export function streakBonus(streakDays) {
  let bonus = 0;
  if (streakDays % 7 === 0) bonus += 20;
  if (streakDays % 30 === 0) bonus += 100;
  return bonus;
}

export function applyCheckin(stats, today) {
  const streakDays = stats.lastCheckin === addDays(today, -1) ? stats.streakDays + 1 : 1;
  const gained = CHECKIN_STARS + streakBonus(streakDays);
  return { stats: { ...stats, streakDays, lastCheckin: today, stars: stats.stars + gained }, gained };
}

export function displayStreak(stats, today) {
  const active = stats.lastCheckin === today || stats.lastCheckin === addDays(today, -1);
  return active ? stats.streakDays : 0;
}

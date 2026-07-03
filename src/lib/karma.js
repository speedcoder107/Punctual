import { todayStr, addDays, startOfWeek } from './dates';

/* ───────────────────── Karma / productivity engine ───────────────────── */

export const KARMA_LEVELS = [
  { name: 'Beginner', min: 0 },
  { name: 'Novice', min: 500 },
  { name: 'Intermediate', min: 2500 },
  { name: 'Professional', min: 5000 },
  { name: 'Expert', min: 7500 },
  { name: 'Master', min: 10000 },
  { name: 'Grandmaster', min: 20000 },
  { name: 'Enlightened', min: 50000 },
];

export function levelFor(karma) {
  let lvl = KARMA_LEVELS[0];
  for (const l of KARMA_LEVELS) if (karma >= l.min) lvl = l;
  const idx = KARMA_LEVELS.indexOf(lvl);
  const next = KARMA_LEVELS[idx + 1] || null;
  const progress = next ? (karma - lvl.min) / (next.min - lvl.min) : 1;
  return { level: lvl, next, progress: Math.max(0, Math.min(1, progress)), index: idx };
}

// Points awarded when a task is completed
export function pointsForCompletion(task) {
  let pts = 10; // base
  if (task.dueDate && task.dueDate >= todayStr()) pts += 5; // on time / early
  if (task.priority && task.priority < 4) pts += (4 - task.priority) * 2; // priority bonus
  if (task.recurrence) pts += 3;
  if (task.labels && task.labels.length) pts += 2;
  if (task.reminders && task.reminders.length) pts += 1;
  return pts;
}

// Recompute streaks from dailyCompletions map + goal
export function computeStreaks(dailyCompletions, dailyGoal, weeklyGoal, weekStart = 0) {
  const days = Object.keys(dailyCompletions).sort();
  // daily streak: consecutive days up to today meeting goal
  let streakDays = 0;
  let cursor = todayStr();
  // if today not yet met, streak counts from yesterday
  const metToday = (dailyCompletions[cursor] || 0) >= dailyGoal;
  if (!metToday) cursor = addDays(cursor, -1);
  while ((dailyCompletions[cursor] || 0) >= dailyGoal) { streakDays++; cursor = addDays(cursor, -1); }

  // longest daily streak historically
  let longest = 0, run = 0, prev = null;
  for (const d of days) {
    if ((dailyCompletions[d] || 0) >= dailyGoal) {
      if (prev && addDays(prev, 1) === d) run++; else run = 1;
      longest = Math.max(longest, run);
      prev = d;
    } else { run = 0; prev = null; }
  }

  // weekly totals
  const weekTotals = {};
  for (const d of days) { const wk = startOfWeek(d, weekStart); weekTotals[wk] = (weekTotals[wk] || 0) + (dailyCompletions[d] || 0); }
  return { streakDays, longestStreak: Math.max(longest, streakDays), weekTotals };
}

export function last7Days() {
  const out = [];
  for (let i = 6; i >= 0; i--) out.push(addDays(todayStr(), -i));
  return out;
}

export const PRIORITY_META = {
  1: { label: 'Priority 1', short: 'P1', color: '#D6492F' },
  2: { label: 'Priority 2', short: 'P2', color: '#D98E2B' },
  3: { label: 'Priority 3', short: 'P3', color: '#3E7CB8' },
  4: { label: 'Priority 4', short: 'P4', color: '#B9B3A8' },
};

export const HL = { date: '#3F8F6F', priority: '#D6492F', project: '#3E7CB8', label: '#8B5FBF', time: '#C2487A', duration: '#5C6BC0', reminder: '#D98E2B', custom: '#5C6BC0', header: '#9C8059' };

export const REMINDER_PRESET_OFFSETS = [
  { label: 'On time', mins: 0 },
  { label: '10 min before', mins: 10 },
  { label: '30 min before', mins: 30 },
  { label: '1 hour before', mins: 60 },
  { label: '1 day before', mins: 1440 },
];

export function offsetLabel(mins) {
  if (mins === 0) return 'On time';
  if (mins < 60) return `${mins}m before`;
  if (mins < 1440) return `${Math.round(mins / 60)}h before`;
  return `${Math.round(mins / 1440)}d before`;
}

/* Reminder shape: { id, mode: 'due'|'deadline'|'custom', offsetMins?, at? (YYYY-MM-DDTHH:MM) } */
export function reminderLabel(r) {
  if (!r) return '';
  if (r.mode === 'custom') {
    if (!r.at) return 'Custom';
    const d = new Date(r.at);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  const base = offsetLabel(r.offsetMins || 0);
  return r.mode === 'deadline' ? `${base} deadline` : `${base} due`;
}

export function reminderFireTime(r, task) {
  if (r.mode === 'custom') return r.at ? new Date(r.at).getTime() : null;
  if (r.mode === 'deadline') return task.deadline ? new Date(`${task.deadline}T09:00:00`).getTime() - (r.offsetMins || 0) * 60000 : null;
  if (r.mode === 'due') return (task.dueDate && task.dueTime) ? new Date(`${task.dueDate}T${task.dueTime}:00`).getTime() - (r.offsetMins || 0) * 60000 : null;
  return null;
}

export const RECURRENCE_UNITS = [
  { unit: 'day', label: 'Daily' },
  { unit: 'week', label: 'Weekly' },
  { unit: 'month', label: 'Monthly' },
  { unit: 'weekday', label: 'Weekdays' },
];

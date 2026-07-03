/* ───────────────────────── date utils ───────────────────────── */
export const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WD_MINI = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const DOW_MAP = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };
export const MONTH_MAP = { january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11 };

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
export function toDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function todayStr() { return toDateStr(new Date()); }
export function parseDate(s) { return new Date(s + 'T00:00:00'); }
export function addDays(s, n) { const d = parseDate(s || todayStr()); d.setDate(d.getDate() + n); return toDateStr(d); }
export function addMonths(s, n) { const d = parseDate(s || todayStr()); const day = d.getDate(); d.setMonth(d.getMonth() + n); if (d.getDate() < day) d.setDate(0); return toDateStr(d); }
export function diffDays(a, b) { return Math.round((parseDate(a) - parseDate(b)) / 86400000); }
export function startOfWeek(s, weekStart = 0) { const d = parseDate(s); const diff = (d.getDay() - weekStart + 7) % 7; return addDays(s, -diff); }
export function nextBusinessDay(s) { let d = addDays(s, 1); const w = parseDate(d).getDay(); if (w === 6) d = addDays(d, 2); else if (w === 0) d = addDays(d, 1); return d; }
export function upcomingWeekday(t, incl = true) { let diff = (t - new Date().getDay() + 7) % 7; if (diff === 0 && !incl) diff = 7; return addDays(todayStr(), diff); }
export function nextWeekday(t) { const td = new Date().getDay(); let diff = (t - td + 7) % 7; if (diff === 0) diff = 7; if (t > td) diff += 7; return addDays(todayStr(), diff); }

export function formatTime(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${ap}` : `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}
export function formatDuration(mins) {
  if (!mins) return null;
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// "9:00 AM" + 45 -> "9:45 AM" (wraps past midnight but doesn't roll the date — display only)
export function endTime(time, mins) {
  if (!time || !mins) return null;
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + mins) % 1440;
  return formatTime(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
}

// Do [dueTime, dueTime+duration] ranges overlap for two same-day tasks?
export function timeRangesOverlap(aTime, aDur, bTime, bDur) {
  if (!aTime || !bTime) return false;
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const aStart = toMin(aTime), aEnd = aStart + (aDur || 30);
  const bStart = toMin(bTime), bEnd = bStart + (bDur || 30);
  return aStart < bEnd && bStart < aEnd;
}

export function formatDueLabel(s, time) {
  if (!s) return null;
  const t = todayStr();
  let base;
  if (s === t) base = 'Today';
  else if (s === addDays(t, 1)) base = 'Tomorrow';
  else if (s === addDays(t, -1)) base = 'Yesterday';
  else {
    const d = parseDate(s), diff = diffDays(s, t);
    if (diff > 1 && diff < 7) base = WEEKDAYS_FULL[d.getDay()];
    else {
      const sy = d.getFullYear() === new Date().getFullYear();
      base = `${MONTHS[d.getMonth()]} ${d.getDate()}${sy ? '' : ` ${d.getFullYear()}`}`;
    }
  }
  return time ? `${base} ${formatTime(time)}` : base;
}

export function dueColor(s, theme) {
  const t = theme || {};
  if (!s) return t.textLight || '#9C9589';
  const today = todayStr();
  if (s < today) return t.danger || '#D6492F';
  if (s === today) return t.success || '#3F8F6F';
  if (s === addDays(today, 1)) return '#D98E2B';
  return '#8B5FBF';
}
export function isOverdue(task) { return !task.completed && task.dueDate && task.dueDate < todayStr(); }

export function recurrenceLabel(r) {
  if (!r) return null;
  const u = r.unit;
  if (u === 'weekday') return 'every weekday';
  if (u === 'week' && r.dow != null) return `every ${WEEKDAYS_FULL[r.dow]}`;
  if (r.interval === 1) return `every ${u}`;
  return `every ${r.interval} ${u}s`;
}
export function advanceRecurrence(r, base) {
  const b = base || todayStr();
  if (r.unit === 'day') return addDays(b, r.interval);
  if (r.unit === 'week') return addDays(b, 7 * r.interval);
  if (r.unit === 'month') return addMonths(b, r.interval);
  if (r.unit === 'year') return addMonths(b, 12 * r.interval);
  if (r.unit === 'weekday') return nextBusinessDay(b);
  return addDays(b, 1);
}

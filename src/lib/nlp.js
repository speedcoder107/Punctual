import {
  DOW_MAP, MONTH_MAP, todayStr, toDateStr, addDays, addMonths,
  nextBusinessDay, upcomingWeekday, nextWeekday,
} from './dates';

/* ───────────────────── NL parser ─────────────────────
   Recognizes, as highlightable tokens:
   - dates: today/tomorrow/weekday/next X/in N days/month D/D month
   - recurrence: every [N|other] day|week|month|weekday|<dow>
   - time: "at 3pm", "at 15:30", "9am"
   - duration: "for 45m", "for 2h", "for 1h30m"
   - deadline: "{feb 3}" or "due feb 3" style via braces
   - reminder: "!30m", "!1h", "!1d"
   - priority: p1-p4
   - project: #name   label: @name */

function parseClock(str) {
  const m = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3] ? m[3].toLowerCase() : null;
  if (h > 23 || min > 59) return null;
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function buildDateCandidates(text) {
  const out = [];
  const push = (m, e) => out.push({ start: m.index, end: m.index + m[0].length, raw: m[0], type: 'date', ...e });
  let m;

  const reEveryN = /\bevery\s+(other\s+|(\d+)\s+)?(day|week|month|year|weekday)s?\b/gi;
  while ((m = reEveryN.exec(text))) { const unit = m[3].toLowerCase(); let interval = 1; if (m[1] && m[1].toLowerCase().startsWith('other')) interval = 2; else if (m[2]) interval = parseInt(m[2], 10); const first = unit === 'weekday' ? nextBusinessDay(addDays(todayStr(), -1)) : todayStr(); push(m, { dueDate: first, recurrence: { unit, interval } }); }
  const reEveryDow = /\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/gi;
  while ((m = reEveryDow.exec(text))) { const dow = DOW_MAP[m[1].toLowerCase()]; push(m, { dueDate: upcomingWeekday(dow, true), recurrence: { unit: 'week', interval: 1, dow } }); }
  let mm; const reNW = /\bnext\s+week\b/gi; while ((mm = reNW.exec(text))) push(mm, { dueDate: addDays(todayStr(), 7) });
  const reND = /\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/gi;
  while ((m = reND.exec(text))) push(m, { dueDate: nextWeekday(DOW_MAP[m[1].toLowerCase()]) });
  const reDow = /\b(this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/gi;
  while ((m = reDow.exec(text))) push(m, { dueDate: upcomingWeekday(DOW_MAP[m[2].toLowerCase()], true) });
  const reRel = /\b(today|tod|tomorrow|tom|tmr|tmrw|yesterday)\b/gi;
  while ((m = reRel.exec(text))) { const w = m[1].toLowerCase(); let date = todayStr(); if (w.startsWith('tom') || w === 'tmr' || w === 'tmrw') date = addDays(todayStr(), 1); else if (w === 'yesterday') date = addDays(todayStr(), -1); push(m, { dueDate: date }); }
  const reIn = /\bin\s+(\d+)\s+(day|week|month)s?\b/gi;
  while ((m = reIn.exec(text))) { const n = parseInt(m[1], 10), u = m[2].toLowerCase(); const date = u === 'day' ? addDays(todayStr(), n) : u === 'week' ? addDays(todayStr(), 7 * n) : addMonths(todayStr(), n); push(m, { dueDate: date }); }
  const reMD = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})\b/gi;
  while ((m = reMD.exec(text))) { const mo = MONTH_MAP[m[1].toLowerCase()], day = parseInt(m[2], 10); if (day >= 1 && day <= 31) { const yr = new Date().getFullYear(); let c = toDateStr(new Date(yr, mo, day)); if (c < todayStr()) c = toDateStr(new Date(yr + 1, mo, day)); push(m, { dueDate: c }); } }
  const reDM = /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi;
  while ((m = reDM.exec(text))) { const day = parseInt(m[1], 10), mo = MONTH_MAP[m[2].toLowerCase()]; if (day >= 1 && day <= 31) { const yr = new Date().getFullYear(); let c = toDateStr(new Date(yr, mo, day)); if (c < todayStr()) c = toDateStr(new Date(yr + 1, mo, day)); push(m, { dueDate: c }); } }
  return out;
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function parseQuickAdd(text, projects, ignored, labelsList, customSyntaxes) {
  const cand = [];
  let m;

  // user-defined custom shortcuts (e.g. "asap" -> priority 1, "urgent!" -> priority 1)
  // Uses whitespace/string-edge lookaround rather than \b, since \b fails to
  // match when the trigger itself ends in punctuation (no word-boundary exists
  // between two non-word characters, e.g. "!" followed by a space).
  (customSyntaxes || []).forEach((rule) => {
    if (!rule.trigger) return;
    const re = new RegExp(`(?<=^|\\s)${escapeRegex(rule.trigger)}(?=\\s|$)`, 'gi');
    let mm;
    while ((mm = re.exec(text))) cand.push({ start: mm.index, end: mm.index + mm[0].length, raw: mm[0], type: 'custom', actionType: rule.type, value: rule.value });
  });

  const reP = /\bp([1-4])\b/gi;
  while ((m = reP.exec(text))) cand.push({ start: m.index, end: m.index + m[0].length, raw: m[0], type: 'priority', value: parseInt(m[1], 10) });

  // $$ turns this task into a checkbox-less section header (see task.isHeader)
  const reHeader = /\$\$/g;
  while ((m = reHeader.exec(text))) cand.push({ start: m.index, end: m.index + m[0].length, raw: m[0], type: 'header', value: true });

  const reProj = /#([\p{L}\p{N}_-]+)/giu;
  while ((m = reProj.exec(text))) { const name = m[1].toLowerCase(); const proj = (projects || []).find((p) => p.name.toLowerCase() === name) || (projects || []).find((p) => p.name.toLowerCase().startsWith(name)); if (proj) cand.push({ start: m.index, end: m.index + m[0].length, raw: m[0], type: 'project', value: proj.id }); }

  const reLab = /@([\p{L}\p{N}_-]+)/giu;
  while ((m = reLab.exec(text))) cand.push({ start: m.index, end: m.index + m[0].length, raw: m[0], type: 'label', value: m[1] });

  // time: "at 3pm" / "at 15:30" / standalone "9am"
  const reAt = /\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/gi;
  while ((m = reAt.exec(text))) { const clk = parseClock(m[1].trim()); if (clk) cand.push({ start: m.index, end: m.index + m[0].length, raw: m[0], type: 'time', value: clk }); }
  const reClock = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/gi;
  while ((m = reClock.exec(text))) { const clk = parseClock(m[1].replace(/\s+/g, '')); if (clk) cand.push({ start: m.index, end: m.index + m[0].length, raw: m[0], type: 'time', value: clk }); }

  // duration: "for 45m" / "for 2h" / "for 1h30m"
  const reDur = /\bfor\s+(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?\b/gi;
  while ((m = reDur.exec(text))) { const h = m[1] ? parseInt(m[1], 10) : 0; const mn = m[2] ? parseInt(m[2], 10) : 0; const total = h * 60 + mn; if (total > 0) cand.push({ start: m.index, end: m.index + m[0].length, raw: m[0], type: 'duration', value: total }); }

  // reminder: "!30m" "!1h" "!2d"
  const reRem = /!(\d+)(m|h|d)\b/gi;
  while ((m = reRem.exec(text))) { const n = parseInt(m[1], 10), u = m[2]; const mins = u === 'm' ? n : u === 'h' ? n * 60 : n * 1440; cand.push({ start: m.index, end: m.index + m[0].length, raw: m[0], type: 'reminder', value: mins }); }

  buildDateCandidates(text).forEach((c) => cand.push(c));

  const kept0 = cand.filter((c) => !(ignored && ignored.has(c.raw.toLowerCase())));
  kept0.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const kept = []; let last = -1;
  for (const c of kept0) if (c.start >= last) { kept.push(c); last = c.end; }
  kept.sort((a, b) => a.start - b.start);

  const seg = []; let cur = 0;
  for (const c of kept) { if (c.start > cur) seg.push({ type: 'plain', text: text.slice(cur, c.start) }); seg.push({ ...c, text: text.slice(c.start, c.end) }); cur = c.end; }
  if (cur < text.length) seg.push({ type: 'plain', text: text.slice(cur) });

  const meta = { dueDate: null, dueTime: null, duration: null, recurrence: null, priority: 4, projectId: null, labels: [], reminders: [], dateRaw: null, isHeader: false };
  for (const c of kept) {
    if (c.type === 'priority') meta.priority = c.value;
    else if (c.type === 'header') meta.isHeader = true;
    else if (c.type === 'project') meta.projectId = c.value;
    else if (c.type === 'label') { if (!meta.labels.includes(c.value)) meta.labels.push(c.value); }
    else if (c.type === 'time') meta.dueTime = c.value;
    else if (c.type === 'duration') meta.duration = c.value;
    else if (c.type === 'reminder') { if (!meta.reminders.includes(c.value)) meta.reminders.push(c.value); }
    else if (c.type === 'date') { if (c.recurrence) meta.recurrence = c.recurrence; meta.dueDate = c.dueDate; meta.dateRaw = c.raw; }
    else if (c.type === 'custom') {
      if (c.actionType === 'priority') meta.priority = c.value;
      else if (c.actionType === 'project') meta.projectId = c.value;
      else if (c.actionType === 'label') { if (!meta.labels.includes(c.value)) meta.labels.push(c.value); }
    }
  }
  meta.cleanedTitle = seg.filter((s) => s.type === 'plain').map((s) => s.text).join('').replace(/\s+/g, ' ').trim();
  return { segments: seg, meta, candidates: kept };
}

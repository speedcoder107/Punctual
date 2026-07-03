import { todayStr, addDays, isOverdue, parseDate, DOW_MAP } from './dates';

/* ───────────────────── Todoist-style filter query engine ─────────────────────
   Supports:  &  |  !  ( )
   Keywords:  today, overdue, tomorrow, "no date"/no due date, "no label",
              "no priority", recurring, "X days"/"next X days",
              p1-p4, priority 1-4,
              @label, #project, /section,
              search: text, "due before: <date>", "due after: <date>",
              assigned/completed (best-effort)
   Comma separates multiple sub-lists (handled by caller via splitQueries). */

export function splitQueries(query) {
  return query.split(',').map((q) => q.trim()).filter(Boolean);
}

// Tokenize into terms & operators
function tokenize(q) {
  const tokens = [];
  let i = 0;
  const s = q;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ') { i++; continue; }
    if (ch === '&' || ch === '|' || ch === '!' || ch === '(' || ch === ')') { tokens.push({ t: 'op', v: ch }); i++; continue; }
    // read a term until operator/paren
    let j = i; let buf = '';
    // allow "search: foo bar" to capture rest until operator
    while (j < s.length && !'&|()'.includes(s[j])) {
      // stop '!' only if it's a standalone operator (preceded by space) — simpler: treat ! only at boundaries
      buf += s[j]; j++;
    }
    tokens.push({ t: 'term', v: buf.trim() });
    i = j;
  }
  return tokens.filter((t) => !(t.t === 'term' && t.v === ''));
}

// Build a predicate from a single term string
function termPredicate(term, ctx) {
  const raw = term.trim();
  const low = raw.toLowerCase();

  const t = todayStr();
  if (low === 'today') return (task) => task.dueDate === t || isOverdue(task);
  if (low === 'overdue' || low === 'od') return (task) => isOverdue(task);
  if (low === 'tomorrow' || low === 'tom') return (task) => task.dueDate === addDays(t, 1);
  if (low === 'no date' || low === 'no due date' || low === 'nodate') return (task) => !task.dueDate;
  if (low === 'no label' || low === 'no labels') return (task) => !(task.labels && task.labels.length);
  if (low === 'no priority') return (task) => (task.priority || 4) === 4;
  if (low === 'recurring') return (task) => !!task.recurrence;
  if (low === 'no time') return (task) => !task.dueTime;
  if (low === 'no deadline') return (task) => !task.deadline;
  if (low === 'no duration') return (task) => !task.duration;
  if (low === 'no reminder' || low === 'no reminders') return (task) => !(task.reminders && task.reminders.length);
  if (low === 'has reminder' || low === 'has reminders') return (task) => !!(task.reminders && task.reminders.length);
  if (low === 'has attachment') return (task) => !!task.attachment;
  if (low === 'no attachment') return (task) => !task.attachment;
  if (low === 'has location') return (task) => !!task.location;
  if (low === 'no location') return (task) => !task.location;
  if (low === 'has comments' || low === 'has comment') return (task) => !!(task.comments && task.comments.length);
  if (low === 'no comments' || low === 'no comment') return (task) => !(task.comments && task.comments.length);
  if (low === 'no section' || low === 'section: none') return (task) => !task.sectionId;
  if (low === 'is header' || low === 'is section') return (task) => !!task.isHeader;
  if (low === 'deadline today') return (task) => task.deadline === t;
  if (low === 'deadline tomorrow') return (task) => task.deadline === addDays(t, 1);

  let m;
  if ((m = low.match(/^(?:next\s+)?(\d+)\s+days?$/))) { const n = parseInt(m[1], 10); return (task) => task.dueDate && task.dueDate >= t && task.dueDate <= addDays(t, n); }
  if ((m = low.match(/^p([1-4])$/)) || (m = low.match(/^priority\s+([1-4])$/))) { const p = parseInt(m[1], 10); return (task) => (task.priority || 4) === p; }
  if ((m = raw.match(/^@(.+)$/))) { const name = m[1].toLowerCase(); return (task) => (task.labels || []).some((l) => l.toLowerCase() === name); }
  if ((m = raw.match(/^##(.+)$/))) { const name = m[1].toLowerCase(); return (task) => { const proj = ctx.projects.find((p) => p.id === task.projectId); if (!proj) return false; // include sub-projects
    const matchIds = new Set(); const walk = (id) => { matchIds.add(id); ctx.projects.filter((p) => p.parentId === id).forEach((c) => walk(c.id)); };
    const root = ctx.projects.find((p) => p.name.toLowerCase() === name); if (!root) return false; walk(root.id); return matchIds.has(task.projectId); }; }
  if ((m = raw.match(/^#(.+)$/))) { const name = m[1].toLowerCase(); return (task) => { const proj = ctx.projects.find((p) => p.id === task.projectId); return proj && proj.name.toLowerCase() === name; }; }
  if ((m = raw.match(/^\/(.+)$/))) { const name = m[1].toLowerCase(); return (task) => { const sec = ctx.sections.find((s) => s.id === task.sectionId); return sec && sec.name.toLowerCase() === name; }; }
  if ((m = low.match(/^search:\s*(.+)$/)) || (m = raw.match(/^search:\s*(.+)$/i))) { const needle = m[1].toLowerCase(); return (task) => task.content.toLowerCase().includes(needle) || (task.description || '').toLowerCase().includes(needle); }
  if ((m = low.match(/^due:\s*(.+)$/))) { const d = resolveDate(m[1]); return (task) => task.dueDate && d && task.dueDate === d; }
  if ((m = low.match(/^due before:\s*(.+)$/))) { const d = resolveDate(m[1]); return (task) => task.dueDate && d && task.dueDate < d; }
  if ((m = low.match(/^due after:\s*(.+)$/))) { const d = resolveDate(m[1]); return (task) => task.dueDate && d && task.dueDate > d; }
  if ((m = low.match(/^deadline before:\s*(.+)$/))) { const d = resolveDate(m[1]); return (task) => task.deadline && d && task.deadline < d; }
  if ((m = low.match(/^deadline after:\s*(.+)$/))) { const d = resolveDate(m[1]); return (task) => task.deadline && d && task.deadline > d; }
  if ((m = low.match(/^deadline:\s*(.+)$/))) { const d = resolveDate(m[1]); return (task) => task.deadline && d && task.deadline === d; }
  if ((m = low.match(/^duration\s*(>=|<=|>|<|=)\s*(\d+)$/))) {
    const [, op, valStr] = m; const val = parseInt(valStr, 10);
    const ops = { '>': (a, b) => a > b, '<': (a, b) => a < b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '=': (a, b) => a === b };
    return (task) => task.duration != null && ops[op](task.duration, val);
  }
  if ((m = low.match(/^reminder:\s*(\d+)\s*m$/))) { const mins = parseInt(m[1], 10); return (task) => (task.reminders || []).some((r) => r.offsetMins === mins); }
  if ((m = low.match(/^reminder:\s*(due|deadline|custom)$/))) { const mode = m[1]; return (task) => (task.reminders || []).some((r) => r.mode === mode); }
  if (DOW_MAP[low] != null) { const dow = DOW_MAP[low]; return (task) => task.dueDate && parseDate(task.dueDate).getDay() === dow; }

  // fallback: substring match on content
  return (task) => task.content.toLowerCase().includes(low);
}

function resolveDate(str) {
  const s = str.trim().toLowerCase();
  const t = todayStr();
  if (s === 'today') return t;
  if (s === 'tomorrow') return addDays(t, 1);
  if (s === 'yesterday') return addDays(t, -1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

// Recursive-descent: OR > AND > NOT > term/paren
function parseExpr(tokens, ctx) {
  let pos = 0;
  function peek() { return tokens[pos]; }
  function eat() { return tokens[pos++]; }

  function parseOr() {
    let left = parseAnd();
    while (peek() && peek().t === 'op' && peek().v === '|') { eat(); const right = parseAnd(); const l = left, r = right; left = (task) => l(task) || r(task); }
    return left;
  }
  function parseAnd() {
    let left = parseNot();
    while (peek() && ((peek().t === 'op' && peek().v === '&') || peek().t === 'term' || (peek().t === 'op' && (peek().v === '!' || peek().v === '(')))) {
      if (peek().t === 'op' && peek().v === '&') eat();
      else if (peek().t === 'op' && peek().v === '|') break;
      const right = parseNot(); const l = left, r = right; left = (task) => l(task) && r(task);
    }
    return left;
  }
  function parseNot() {
    if (peek() && peek().t === 'op' && peek().v === '!') { eat(); const inner = parseNot(); return (task) => !inner(task); }
    return parseAtom();
  }
  function parseAtom() {
    const tk = peek();
    if (!tk) return () => true;
    if (tk.t === 'op' && tk.v === '(') { eat(); const inner = parseOr(); if (peek() && peek().t === 'op' && peek().v === ')') eat(); return inner; }
    if (tk.t === 'term') { eat(); return termPredicate(tk.v, ctx); }
    eat(); return () => true;
  }
  const fn = parseOr();
  return fn;
}

export function compileFilter(query, ctx) {
  try {
    const tokens = tokenize(query);
    if (!tokens.length) return () => true;
    return parseExpr(tokens, ctx);
  } catch {
    return () => false;
  }
}

// Evaluate a full query (with commas → multiple named sub-lists)
export function evaluateFilter(query, tasks, ctx) {
  const subs = splitQueries(query);
  return subs.map((sub) => {
    const pred = compileFilter(sub, ctx);
    return { query: sub, tasks: tasks.filter((task) => !task.parentId && !task.completed && pred(task)) };
  });
}

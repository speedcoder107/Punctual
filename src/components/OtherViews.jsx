import React, { useMemo, useState } from 'react';
import { Filter, Tag, Plus, Inbox, List, CalendarRange } from 'lucide-react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';
import { TaskList, TaskRow } from './TaskItems';
import { evaluateFilter } from '../lib/filters';
import { sortTasks } from '../lib/sort';
import { todayStr, addDays, formatDueLabel, isOverdue, WEEKDAYS_FULL, parseDate, MONTHS } from '../lib/dates';
import CalendarGrid from './CalendarGrid';

/* ───────────────────────── Upcoming ───────────────────────── */
export function UpcomingView({ handlers }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const [mode, setMode] = useState('list'); // 'list' | 'week'
  const tasks = state.tasks;
  const overdue = sortTasks(tasks.filter((t) => !t.parentId && isOverdue(t)));
  const days = [];
  for (let i = 0; i <= 13; i++) {
    const ds = addDays(todayStr(), i);
    days.push({ date: ds, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : formatDueLabel(ds), sub: `${WEEKDAYS_FULL[parseDate(ds).getDay()]}`, tasks: sortTasks(tasks.filter((t) => !t.parentId && !t.completed && t.dueDate === ds && !isOverdue(t))) });
  }
  const later = sortTasks(tasks.filter((t) => !t.parentId && !t.completed && t.dueDate && t.dueDate > addDays(todayStr(), 13)));

  const ModeSwitcher = (
    <div className="flex items-center gap-1 p-1 rounded-lg mb-4 w-max" style={{ backgroundColor: theme.surface }}>
      {[['list', 'List', <List size={14} />], ['week', 'Week', <CalendarRange size={14} />]].map(([m, l, ic]) => (
        <button key={m} onClick={() => setMode(m)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs" style={{ backgroundColor: mode === m ? theme.bgAlt : 'transparent', color: mode === m ? theme.accent : theme.textMuted }}>{ic}{l}</button>
      ))}
    </div>
  );

  if (mode === 'week') {
    return (
      <div>
        {ModeSwitcher}
        <CalendarGrid days={Array.from({ length: 7 }, (_, i) => addDays(todayStr(), i))} handlers={handlers} onCreateAt={handlers.onCreateAt}
          onDropTask={(taskId, date, time) => dispatch({ type: 'UPDATE_TASK', id: taskId, patch: { dueDate: date, dueTime: time } })} />
      </div>
    );
  }

  return (
    <div>
      {ModeSwitcher}
      {overdue.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: theme.danger }}>Overdue · {overdue.length}</h3>
          {overdue.map((t) => <TaskRow key={t.id} task={t} {...handlers} />)}
        </div>)}
      {days.map((g) => (
        <div key={g.date} className="mb-5 group/day">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold flex items-baseline gap-2" style={{ color: theme.text }}>{g.label}<span className="text-xs font-normal" style={{ color: theme.textLight }}>{g.sub}</span></h3>
            {handlers.onAddForDate && (
              <button onClick={() => handlers.onAddForDate(g.date)} title={`Add task for ${g.label}`} className="opacity-0 group-hover/day:opacity-100 p-1 rounded transition-opacity" style={{ color: theme.textLight }}><Plus size={14} /></button>
            )}
          </div>
          {g.tasks.length === 0 ? <p className="text-xs py-1" style={{ color: theme.textLighter }}>Nothing scheduled</p> : g.tasks.map((t) => <TaskRow key={t.id} task={t} {...handlers} />)}
        </div>))}
      {later.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: theme.textLight }}>Later</h3>
          {later.map((t) => <TaskRow key={t.id} task={t} {...handlers} />)}
        </div>)}
    </div>
  );
}

/* ───────────────────────── Filter view ───────────────────────── */
export function FilterView({ filter, handlers }) {
  const theme = useTheme();
  const { state } = useStore();
  const ctx = { projects: state.projects, sections: state.sections, labels: state.labels };
  const groups = useMemo(() => evaluateFilter(filter.query, state.tasks, ctx), [filter.query, state.tasks]); // eslint-disable-line
  return (
    <div>
      {groups.map((g, i) => (
        <div key={i} className="mb-6">
          {groups.length > 1 && <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: theme.textLight }}>{g.query}</h3>}
          {g.tasks.length === 0 ? <p className="text-sm py-4" style={{ color: theme.textLighter }}>No matching tasks.</p> : sortTasks(g.tasks).map((t) => <TaskRow key={t.id} task={t} {...handlers} />)}
        </div>
      ))}
      <p className="text-xs mt-4" style={{ color: theme.textLighter }}>Query: <code style={{ backgroundColor: theme.surface, padding: '2px 5px', borderRadius: 3 }}>{filter.query}</code></p>
    </div>
  );
}

/* ───────────────────────── Label view ───────────────────────── */
export function LabelView({ label, handlers }) {
  const { state } = useStore();
  const tasks = sortTasks(state.tasks.filter((t) => !t.parentId && !t.completed && (t.labels || []).includes(label.name)));
  return <TaskList tasks={tasks} emptyMsg={`No tasks with @${label.name}.`} {...handlers} />;
}

/* ───────────────────────── Filters & Labels overview ───────────────────────── */
export function FiltersLabelsOverview({ setView }) {
  const theme = useTheme();
  const { state } = useStore();
  const card = { backgroundColor: theme.surface };
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: theme.textLight }}>Filters</h3>
        <div className="grid grid-cols-2 gap-2" style={{ maxWidth: 500 }}>
          {state.filters.map((f) => (
            <button key={f.id} onClick={() => setView(`filter:${f.id}`)} className="flex items-center gap-2 p-3 rounded-lg text-sm text-left" style={card}>
              <Filter size={15} style={{ color: f.color }} /><span style={{ color: theme.text }}>{f.name}</span>
            </button>))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: theme.textLight }}>Labels</h3>
        <div className="grid grid-cols-2 gap-2" style={{ maxWidth: 500 }}>
          {state.labels.map((l) => (
            <button key={l.id} onClick={() => setView(`label:${l.id}`)} className="flex items-center gap-2 p-3 rounded-lg text-sm text-left" style={card}>
              <Tag size={15} style={{ color: l.color }} /><span style={{ color: theme.text }}>{l.name}</span>
            </button>))}
          {state.labels.length === 0 && <p className="text-sm" style={{ color: theme.textLighter }}>No labels yet.</p>}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Completed / Activity ───────────────────────── */
export function CompletedView({ handlers }) {
  const theme = useTheme();
  const { state } = useStore();
  const done = state.tasks.filter((t) => t.completed).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  const groups = {};
  done.forEach((t) => { const d = t.completedAt ? new Date(t.completedAt) : new Date(); const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; (groups[key] = groups[key] || { date: d, tasks: [] }).tasks.push(t); });
  const keys = Object.keys(groups);
  if (!keys.length) return <p className="text-sm py-8" style={{ color: theme.textLighter }}>No completed tasks yet.</p>;
  return (
    <div>
      {keys.map((k) => {
        const g = groups[k]; const d = g.date;
        return (
          <div key={k} className="mb-5">
            <h3 className="text-sm font-semibold mb-1" style={{ color: theme.text }}>{formatDueLabel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`) || `${MONTHS[d.getMonth()]} ${d.getDate()}`}</h3>
            {g.tasks.map((t) => <TaskRow key={t.id} task={t} {...handlers} />)}
          </div>);
      })}
    </div>
  );
}

/* ───────────────────────── Inbox "also show other projects" extras ─────────────────────────
   Kept visually separate from native Inbox tasks: a divider, then one group per
   project, each task still tagged with its project pill so it's never ambiguous
   which list it actually lives in. */
export function InboxExtras({ handlers }) {
  const theme = useTheme();
  const { state } = useStore();
  const otherProjects = state.projects.filter((p) => p.id !== 'inbox');
  const groups = otherProjects
    .map((p) => ({ project: p, tasks: sortTasks(state.tasks.filter((t) => !t.parentId && !t.completed && t.projectId === p.id)) }))
    .filter((g) => g.tasks.length > 0);
  if (!groups.length) return null;
  return (
    <div className="mt-6 pt-4 border-t-2" style={{ borderColor: theme.borderAlt }}>
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: theme.textLight }}><Inbox size={12} />From your projects</h3>
      {groups.map((g) => (
        <div key={g.project.id} className="mb-4">
          <h4 className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: theme.textMuted }}>
            <span className="rounded-full inline-block" style={{ width: 7, height: 7, backgroundColor: g.project.color }} />{g.project.name}
          </h4>
          {g.tasks.map((t) => <TaskRow key={t.id} task={t} showProject={false} {...handlers} />)}
        </div>
      ))}
    </div>
  );
}

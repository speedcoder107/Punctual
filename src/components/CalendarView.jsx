import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';
import {
  MONTHS_FULL, MONTHS, WD_SHORT, todayStr, toDateStr, parseDate, addDays, addMonths,
} from '../lib/dates';
import CalendarGrid from './CalendarGrid';

/* Full Google-Calendar-style view of every task across the whole app —
   Day / Week / Month / Year, all sharing the same underlying task set
   (no project filter). Month & Year modes click through to Day. */
export default function CalendarView({ handlers }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(todayStr());
  const weekStart = state.settings.weekStart || 0;

  const nav = (dir) => {
    if (mode === 'day') setAnchor(addDays(anchor, dir));
    else if (mode === 'week') setAnchor(addDays(anchor, dir * 7));
    else if (mode === 'month') setAnchor(addMonths(anchor, dir));
    else setAnchor(addMonths(anchor, dir * 12));
  };

  const label = {
    day: `${MONTHS_FULL[parseDate(anchor).getMonth()]} ${parseDate(anchor).getDate()}, ${parseDate(anchor).getFullYear()}`,
    week: `${MONTHS_FULL[parseDate(anchor).getMonth()]} ${parseDate(anchor).getFullYear()}`,
    month: `${MONTHS_FULL[parseDate(anchor).getMonth()]} ${parseDate(anchor).getFullYear()}`,
    year: `${parseDate(anchor).getFullYear()}`,
  }[mode];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-lg font-semibold" style={{ color: theme.text, fontFamily: 'Fraunces, serif' }}>{label}</span>
        <button onClick={() => nav(-1)} className="px-2 py-1 rounded" style={{ color: theme.textMuted, backgroundColor: theme.surface }}><ChevronLeft size={15} /></button>
        <button onClick={() => setAnchor(todayStr())} className="px-2 py-1 rounded text-sm" style={{ color: theme.textMuted, backgroundColor: theme.surface }}>Today</button>
        <button onClick={() => nav(1)} className="px-2 py-1 rounded" style={{ color: theme.textMuted, backgroundColor: theme.surface }}><ChevronRight size={15} /></button>
        <div className="ml-auto flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: theme.surface }}>
          {['day', 'week', 'month', 'year'].map((m) => (
            <button key={m} onClick={() => setMode(m)} className="px-2.5 py-1 rounded-md text-xs capitalize" style={{ backgroundColor: mode === m ? theme.bgAlt : 'transparent', color: mode === m ? theme.accent : theme.textMuted }}>{m}</button>
          ))}
        </div>
      </div>

      {(mode === 'day' || mode === 'week') && (
        <CalendarGrid days={mode === 'day' ? [anchor] : weekDays(anchor, weekStart)} handlers={handlers} onCreateAt={handlers.onCreateAt}
          onDropTask={(taskId, date, time) => dispatch({ type: 'UPDATE_TASK', id: taskId, patch: { dueDate: date, dueTime: time } })} />
      )}
      {mode === 'month' && <MonthGrid anchor={anchor} weekStart={weekStart} onPickDay={(d) => { setAnchor(d); setMode('day'); }} />}
      {mode === 'year' && <YearGrid anchor={anchor} onPickDay={(d) => { setAnchor(d); setMode('day'); }} onPickMonth={(d) => { setAnchor(d); setMode('month'); }} />}
    </div>
  );
}

function weekDays(anchor, weekStart) {
  const dow = parseDate(anchor).getDay();
  const start = addDays(anchor, -((dow - weekStart + 7) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/* month mini-grid, reused shape from ProjectViews' CalendarLayout month mode
   but scoped to ALL tasks (no project filter) and clicking a day jumps to Day view */
function MonthGrid({ anchor, weekStart, onPickDay }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const d0 = parseDate(anchor);
  const y = d0.getFullYear(), m = d0.getMonth();
  const first = new Date(y, m, 1);
  const startDow = (first.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toDateStr(new Date(y, m, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  const today = todayStr();
  const wd = [...Array(7)].map((_, i) => WD_SHORT[(i + weekStart) % 7]);
  const tasksOn = (ds) => state.tasks.filter((t) => !t.parentId && !t.completed && t.dueDate === ds);

  return (
    <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: theme.border }}>
      {wd.map((w) => <div key={w} className="text-center text-xs font-semibold py-1.5" style={{ color: theme.textLight, backgroundColor: theme.bgAlt }}>{w}</div>)}
      {cells.map((ds, i) => {
        return (
          <div key={i} onClick={() => ds && onPickDay(ds)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { const id = e.dataTransfer.getData('text/task'); if (id && ds) dispatch({ type: 'UPDATE_TASK', id, patch: { dueDate: ds } }); }}
            className="p-1.5 align-top cursor-pointer" style={{ minHeight: 88, backgroundColor: theme.bgAlt }}>
            {ds && <div className="text-xs mb-1 flex items-center justify-center rounded-full" style={{ width: 20, height: 20, color: ds === today ? theme.accentText : theme.textMuted, backgroundColor: ds === today ? theme.accent : 'transparent', fontWeight: ds === today ? 700 : 400 }}>{parseDate(ds).getDate()}</div>}
            <div className="space-y-1">
              {ds && tasksOn(ds).slice(0, 3).map((t) => (
                <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/task', t.id)} onClick={(e) => e.stopPropagation()}
                  className="text-xs px-1.5 py-1 rounded cursor-grab truncate" style={{ backgroundColor: theme.surface, color: theme.text, borderLeft: `2px solid ${theme.accent}` }}>{t.content}</div>
              ))}
              {ds && tasksOn(ds).length > 3 && <div className="text-xs" style={{ color: theme.textLighter }}>+{tasksOn(ds).length - 3} more</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* year view: 12 mini-months, each date cell dotted if it has tasks */
function YearGrid({ anchor, onPickDay, onPickMonth }) {
  const theme = useTheme();
  const { state } = useStore();
  const year = parseDate(anchor).getFullYear();
  const hasTasks = (ds) => state.tasks.some((t) => !t.parentId && !t.completed && t.dueDate === ds);
  const today = todayStr();

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(year, m, 1);
        const startDow = first.getDay();
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(toDateStr(new Date(year, m, d)));
        return (
          <div key={m} className="p-2 rounded-lg" style={{ backgroundColor: theme.surface }}>
            <button onClick={() => onPickMonth(toDateStr(new Date(year, m, 1)))} className="text-sm font-semibold mb-1.5" style={{ color: theme.text }}>{MONTHS[m]}</button>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((ds, i) => (
                <button key={i} onClick={() => ds && onPickDay(ds)} className="aspect-square rounded flex items-center justify-center relative" style={{ fontSize: 10, color: ds === today ? theme.accent : theme.textMuted, fontWeight: ds === today ? 700 : 400 }}>
                  {ds ? parseDate(ds).getDate() : ''}
                  {ds && hasTasks(ds) && <span style={{ position: 'absolute', bottom: 1, width: 3, height: 3, borderRadius: '50%', backgroundColor: theme.accent }} />}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

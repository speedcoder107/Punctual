import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';
import { todayStr, parseDate, WD_SHORT, formatTime, formatDuration } from '../lib/dates';

const HOUR_H = 48; // px per hour row
const START_HOUR = 0;
const END_HOUR = 24;
const SCROLL_TO_HOUR = 7;

function minutesFromTop(y) {
  const totalMin = (y / HOUR_H) * 60;
  return Math.max(0, Math.min(24 * 60 - 5, Math.round(totalMin / 15) * 15));
}
function minsToTime(mins) { return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`; }
function timeToMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

/* Shared hour-grid used by the project Calendar layout (Week/Day modes),
   the Upcoming week view, and the full sidebar Calendar. Supports:
   - drag-to-reschedule an existing task (move)
   - drag-the-bottom-edge-to-resize (duration)
   - click-and-drag on empty space to CREATE a task, Google-Calendar style
     (a plain click sets just the time; dragging also sets the duration)
   - clicking a day header creates a task for that date with no time/duration */
export default function CalendarGrid({ days, filterFn, handlers, onDropTask, onCreateAt }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const scrollRef = useRef(null);
  const [dragState, setDragState] = useState(null); // {taskId, mode:'move'|'resize', dayIndex}
  const [createState, setCreateState] = useState(null); // {dayIndex, startMin, endMin, moved}

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = SCROLL_TO_HOUR * HOUR_H;
  }, []);

  const allTasks = state.tasks.filter((t) => !t.parentId && !t.completed && (!filterFn || filterFn(t)));
  const untimed = days.map((d) => allTasks.filter((t) => t.dueDate === d && !t.dueTime));
  const timed = days.map((d) => allTasks.filter((t) => t.dueDate === d && t.dueTime));

  const onMove = useCallback((e) => {
    if (!dragState) return;
    const col = document.querySelector(`[data-daycol="${dragState.dayIndex}"]`);
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top + col.scrollTop;
    if (dragState.mode === 'move') {
      const mins = minutesFromTop(y);
      dispatch({ type: 'UPDATE_TASK', id: dragState.taskId, patch: { dueTime: minsToTime(mins), dueDate: days[dragState.dayIndex] } });
    } else {
      const task = state.tasks.find((t) => t.id === dragState.taskId);
      if (!task || !task.dueTime) return;
      const startMins = timeToMins(task.dueTime);
      const endMins = minutesFromTop(y);
      const dur = Math.max(15, endMins - startMins);
      dispatch({ type: 'UPDATE_TASK', id: dragState.taskId, patch: { duration: dur } });
    }
  }, [dragState, dispatch, days, state.tasks]);

  const onUp = useCallback(() => setDragState(null), []);

  useEffect(() => {
    if (!dragState) return;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragState, onMove, onUp]);

  /* ── click-and-drag to create ──
     createRef mirrors createState synchronously so the mouseup handler can
     read the final values directly, instead of reaching into a setState
     updater — calling another component's setState (onCreateAt → setSheet)
     from inside a setState updater trips React's "cannot update a component
     while rendering a different component" guard and silently drops it. */
  const createRef = useRef(null);

  const onCreateMove = useCallback((e) => {
    const cs = createRef.current;
    if (!cs) return;
    const col = document.querySelector(`[data-daycol="${cs.dayIndex}"]`);
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top + col.scrollTop;
    const mins = minutesFromTop(y);
    const moved = Math.abs(mins - cs.startMin) >= 15;
    const next = { ...cs, endMin: Math.max(cs.startMin + 15, mins), moved };
    createRef.current = next;
    setCreateState(next);
  }, []);

  const onCreateUp = useCallback(() => {
    const cs = createRef.current;
    createRef.current = null;
    setCreateState(null);
    if (cs && onCreateAt) {
      const date = days[cs.dayIndex];
      if (cs.moved) onCreateAt(date, minsToTime(cs.startMin), cs.endMin - cs.startMin);
      else onCreateAt(date, minsToTime(cs.startMin), null);
    }
  }, [days, onCreateAt]);

  const isCreating = !!createState;
  useEffect(() => {
    if (!isCreating) return;
    window.addEventListener('mousemove', onCreateMove);
    window.addEventListener('mouseup', onCreateUp);
    return () => { window.removeEventListener('mousemove', onCreateMove); window.removeEventListener('mouseup', onCreateUp); };
  }, [isCreating, onCreateMove, onCreateUp]);

  function startCreate(e, dayIndex) {
    if (!onCreateAt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    const mins = minutesFromTop(y);
    const next = { dayIndex, startMin: mins, endMin: mins + 15, moved: false };
    createRef.current = next;
    setCreateState(next);
  }

  const today = todayStr();

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
      {/* day headers */}
      <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, borderBottom: `1px solid ${theme.border}` }}>
        <div />
        {days.map((d, i) => (
          <button key={d} onClick={() => onCreateAt && onCreateAt(d, null, null)} title={onCreateAt ? 'Add task on this day' : undefined}
            className="text-center py-2" style={{ backgroundColor: d === today ? theme.accentLight : theme.bgAlt, cursor: onCreateAt ? 'pointer' : 'default' }}>
            <div className="text-xs" style={{ color: theme.textLight }}>{WD_SHORT[parseDate(d).getDay()]}</div>
            <div className="text-sm font-semibold" style={{ color: d === today ? theme.accent : theme.text }}>{parseDate(d).getDate()}</div>
          </button>
        ))}
      </div>
      {/* all-day / untimed strip */}
      <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, borderBottom: `1px solid ${theme.border}`, minHeight: 36 }}>
        <div className="text-xs flex items-center justify-end pr-1" style={{ color: theme.textLighter }}>all-day</div>
        {days.map((d, i) => (
          <div key={d} className="p-1 space-y-1" style={{ borderLeft: `1px solid ${theme.border}` }}>
            {untimed[i].slice(0, 3).map((t) => (
              <div key={t.id} onClick={() => handlers.onOpen(t)} className="text-xs px-1.5 py-0.5 rounded cursor-pointer truncate" style={{ backgroundColor: theme.surface, color: theme.text, borderLeft: `2px solid ${theme.accent}` }}>{t.content}</div>
            ))}
          </div>
        ))}
      </div>
      {/* hour grid */}
      <div ref={scrollRef} className="relative overflow-y-auto" style={{ maxHeight: 480 }}>
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div>
            {Array.from({ length: END_HOUR - START_HOUR }, (_, h) => (
              <div key={h} className="text-xs text-right pr-1.5" style={{ height: HOUR_H, color: theme.textLighter, transform: 'translateY(-6px)' }}>{formatTime(`${String(h).padStart(2, '0')}:00`)}</div>
            ))}
          </div>
          {days.map((d, dayIndex) => (
            <div key={d} data-daycol={dayIndex} className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_H, borderLeft: `1px solid ${theme.border}`, cursor: onCreateAt ? 'crosshair' : 'default' }}
              onMouseDown={(e) => startCreate(e, dayIndex)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const id = e.dataTransfer.getData('text/task'); if (id && onDropTask) { const rect = e.currentTarget.getBoundingClientRect(); onDropTask(id, d, minsToTime(minutesFromTop(e.clientY - rect.top))); } }}>
              {Array.from({ length: END_HOUR - START_HOUR }, (_, h) => (
                <div key={h} style={{ position: 'absolute', top: h * HOUR_H, left: 0, right: 0, borderTop: `1px solid ${theme.border}`, height: HOUR_H, pointerEvents: 'none' }} />
              ))}
              {d === today && <div style={{ position: 'absolute', left: 0, right: 0, top: (new Date().getHours() * 60 + new Date().getMinutes()) / 60 * HOUR_H, borderTop: `2px solid ${theme.danger}`, zIndex: 5, pointerEvents: 'none' }} />}
              {createState && createState.dayIndex === dayIndex && (
                <div className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 pointer-events-none" style={{ top: (createState.startMin / 60) * HOUR_H, height: Math.max(16, ((createState.endMin - createState.startMin) / 60) * HOUR_H), backgroundColor: `${theme.accent}33`, border: `1.5px dashed ${theme.accent}`, zIndex: 3 }}>
                  <div className="text-xs font-medium truncate" style={{ color: theme.accent }}>{createState.moved ? `New task · ${formatDuration(createState.endMin - createState.startMin)}` : 'New task'}</div>
                </div>
              )}
              {timed[dayIndex].map((t) => {
                const top = (timeToMins(t.dueTime) / 60) * HOUR_H;
                const height = Math.max(20, ((t.duration || 30) / 60) * HOUR_H);
                return (
                  <div key={t.id}
                    onMouseDown={(e) => { e.stopPropagation(); if (e.target.dataset.resize) return; setDragState({ taskId: t.id, mode: 'move', dayIndex }); }}
                    onClick={(e) => { e.stopPropagation(); if (!dragState) handlers.onOpen(t); }}
                    className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 overflow-hidden cursor-grab"
                    style={{ top, height, backgroundColor: `${theme.accent}22`, borderLeft: `3px solid ${theme.accent}`, zIndex: 2 }}>
                    <div className="text-xs font-medium truncate" style={{ color: theme.text }}>{t.content}</div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, cursor: 'ns-resize' }} data-resize="true"
                      onMouseDown={(e) => { e.stopPropagation(); setDragState({ taskId: t.id, mode: 'resize', dayIndex }); }} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

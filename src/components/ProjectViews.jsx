import React, { useState } from 'react';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';
import { useRequestDelete } from '../state/deleteConfirm';
import { TaskRow } from './TaskItems';
import {
  MONTHS_FULL, WD_SHORT, todayStr, toDateStr, parseDate, addDays,
} from '../lib/dates';
import { sortTasks } from '../lib/sort';
import CalendarGrid from './CalendarGrid';

/* ───────────────────────── sortable task ───────────────────────── */
function SortableTask({ task, handlers }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <TaskRow task={task} {...handlers} dragHandle={{ ...attributes, ...listeners }} />
    </div>
  );
}

/* ───────────────────────── list layout (with sections) ───────────────────────── */
export function ListLayout({ projectId, handlers, sortKey = 'manual' }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const requestDelete = useRequestDelete();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [addingSection, setAddingSection] = useState(false);
  const [sectionName, setSectionName] = useState('');

  const sections = state.sections.filter((s) => s.projectId === projectId).sort((a, b) => (a.order || 0) - (b.order || 0));
  const tasksIn = (sectionId) => sortTasks(state.tasks.filter((t) => t.projectId === projectId && !t.parentId && (t.sectionId || null) === sectionId && !t.completed), sortKey);

  function onDragEnd(e) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const all = state.tasks;
    const activeTask = all.find((t) => t.id === active.id);
    const overTask = all.find((t) => t.id === over.id);
    if (!activeTask || !overTask) return;
    // move within/between sections
    const patchSection = overTask.sectionId ?? null;
    let updated = all.map((t) => t.id === active.id ? { ...t, sectionId: patchSection } : t);
    const siblings = updated.filter((t) => t.projectId === projectId && !t.parentId && (t.sectionId || null) === patchSection).sort((a, b) => (a.order || 0) - (b.order || 0));
    const oldIdx = siblings.findIndex((t) => t.id === active.id);
    const newIdx = siblings.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(siblings, oldIdx, newIdx);
    reordered.forEach((t, i) => { const target = updated.find((x) => x.id === t.id); target.order = i; });
    dispatch({ type: 'REORDER_TASKS', tasks: updated });
  }

  const Section = ({ section }) => {
    const tks = tasksIn(section ? section.id : null);
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div className="mb-4">
        {section && (
          <div className="flex items-center justify-between group/sec border-b pb-1 mb-1" style={{ borderColor: theme.border }}>
            <button onClick={() => setCollapsed((c) => !c)} className="flex items-center gap-1 text-sm font-semibold" style={{ color: theme.text }}>
              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}{section.name}<span className="text-xs font-normal" style={{ color: theme.textLight }}>{tks.length}</span>
            </button>
            <button onClick={() => requestDelete('section', section.id, section.name, tks.length)} className="opacity-0 group-hover/sec:opacity-100 p-1" style={{ color: theme.textLight }}><Trash2 size={13} /></button>
          </div>
        )}
        {!collapsed && (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
            <SortableContext items={tks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {tks.map((t) => <SortableTask key={t.id} task={t} handlers={handlers} />)}
            </SortableContext>
          </DndContext>
        )}
        {!collapsed && (
          <button onClick={() => handlers.onAddInSection(section ? section.id : null)} className="flex items-center gap-2 text-sm mt-1 py-1 opacity-60 hover:opacity-100" style={{ color: theme.accent }}>
            <Plus size={15} /> Add task
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <Section section={null} />
      {sections.map((s) => <Section key={s.id} section={s} />)}
      {addingSection ? (
        <input autoFocus value={sectionName} onChange={(e) => setSectionName(e.target.value)}
          onBlur={() => { if (sectionName.trim()) dispatch({ type: 'ADD_SECTION', payload: { projectId, name: sectionName.trim() } }); setSectionName(''); setAddingSection(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          placeholder="Section name" className="w-full text-sm px-3 py-2 rounded-lg border outline-none mt-2" style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }} />
      ) : (
        <button onClick={() => setAddingSection(true)} className="flex items-center gap-2 text-sm mt-2 opacity-50 hover:opacity-100" style={{ color: theme.textMuted }}>
          <Plus size={14} /> Add section
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── board layout ───────────────────────── */
export function BoardLayout({ projectId, handlers }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const sections = state.sections.filter((s) => s.projectId === projectId).sort((a, b) => (a.order || 0) - (b.order || 0));
  const columns = [{ id: null, name: '(No section)' }, ...sections];
  const tasksIn = (sid) => state.tasks.filter((t) => t.projectId === projectId && !t.parentId && (t.sectionId || null) === sid && !t.completed).sort((a, b) => (a.order || 0) - (b.order || 0));
  const [addingSection, setAddingSection] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(e) {
    const { active, over } = e;
    if (!over) return;
    const overTask = state.tasks.find((t) => t.id === over.id);
    const overCol = overTask ? (overTask.sectionId || null) : (over.id === 'col-null' ? null : over.id.startsWith?.('col-') ? over.id.slice(4) : null);
    dispatch({ type: 'MOVE_TASK', id: active.id, sectionId: overCol });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 200 }}>
        {columns.map((col) => (
          <BoardColumn key={col.id || 'null'} col={col} tasks={tasksIn(col.id)} handlers={handlers} />
        ))}
        <div className="flex-shrink-0" style={{ width: 272 }}>
          {addingSection ? (
            <input autoFocus value={sectionName} onChange={(e) => setSectionName(e.target.value)}
              onBlur={() => { if (sectionName.trim()) dispatch({ type: 'ADD_SECTION', payload: { projectId, name: sectionName.trim() } }); setSectionName(''); setAddingSection(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              placeholder="Section name" className="w-full text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }} />
          ) : (
            <button onClick={() => setAddingSection(true)} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg w-full" style={{ color: theme.textMuted, backgroundColor: theme.surface }}>
              <Plus size={15} /> Add section
            </button>
          )}
        </div>
      </div>
    </DndContext>
  );
}

function BoardColumn({ col, tasks, handlers }) {
  const theme = useTheme();
  const requestDelete = useRequestDelete();
  return (
    <div className="flex-shrink-0 rounded-xl p-2" style={{ width: 272, backgroundColor: theme.surface }}>
      <div className="flex items-center justify-between px-1 py-1 mb-1">
        <span className="text-sm font-semibold" style={{ color: theme.text }}>{col.name} <span className="text-xs font-normal" style={{ color: theme.textLight }}>{tasks.length}</span></span>
        {col.id && <button onClick={() => requestDelete('section', col.id, col.name, tasks.length)} className="p-0.5" style={{ color: theme.textLight }}><Trash2 size={12} /></button>}
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[20px]">
          {tasks.map((t) => <BoardCard key={t.id} task={t} handlers={handlers} />)}
        </div>
      </SortableContext>
      <button onClick={() => handlers.onAddInSection(col.id)} className="flex items-center gap-2 text-sm mt-2 px-1 py-1 opacity-60 hover:opacity-100 w-full" style={{ color: theme.accent }}>
        <Plus size={15} /> Add task
      </button>
    </div>
  );
}

function BoardCard({ task, handlers }) {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={{ ...style }} {...attributes} {...listeners}
      className="rounded-lg p-2.5 cursor-pointer" onClick={() => handlers.onOpen(task)}
      onMouseDown={(e) => e.stopPropagation()}>
      <div className="rounded-lg" style={{ backgroundColor: theme.bgAlt, border: `1px solid ${theme.border}`, padding: 10 }}>
        <TaskRow task={task} showProject={false} {...handlers} />
      </div>
    </div>
  );
}

/* ───────────────────────── calendar layout ───────────────────────── */
export function CalendarLayout({ filterFn, handlers, weekStart = 0, projectId, calendarMode = 'month' }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const [vm, setVm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [anchorDate, setAnchorDate] = useState(todayStr());
  const setMode = (mode) => { if (projectId) dispatch({ type: 'UPDATE_PROJECT', id: projectId, patch: { calendarMode: mode } }); };

  const first = new Date(vm.y, vm.m, 1);
  const startDow = (first.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(vm.y, vm.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toDateStr(new Date(vm.y, vm.m, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  const t = todayStr();
  const tasksOn = (ds) => state.tasks.filter((x) => !x.parentId && !x.completed && x.dueDate === ds && (!filterFn || filterFn(x)));
  const wd = [...Array(7)].map((_, i) => WD_SHORT[(i + weekStart) % 7]);

  const ModeSwitcher = (
    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: theme.surface }}>
      {['month', 'week', 'day'].map((m) => (
        <button key={m} onClick={() => setMode(m)} className="px-2.5 py-1 rounded-md text-xs capitalize" style={{ backgroundColor: calendarMode === m ? theme.bgAlt : 'transparent', color: calendarMode === m ? theme.accent : theme.textMuted }}>{m}</button>
      ))}
    </div>
  );

  if (calendarMode === 'week' || calendarMode === 'day') {
    const n = calendarMode === 'week' ? 7 : 1;
    const anchorDow = parseDate(anchorDate).getDay();
    const rangeStart = calendarMode === 'week' ? addDays(anchorDate, -((anchorDow - weekStart + 7) % 7)) : anchorDate;
    const days = Array.from({ length: n }, (_, i) => addDays(rangeStart, i));
    return (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-lg font-semibold" style={{ color: theme.text, fontFamily: 'Fraunces, serif' }}>{MONTHS_FULL[parseDate(days[0]).getMonth()]} {parseDate(days[0]).getFullYear()}</span>
          <button onClick={() => setAnchorDate(addDays(anchorDate, -n))} className="px-2 py-1 rounded" style={{ color: theme.textMuted, backgroundColor: theme.surface }}>‹</button>
          <button onClick={() => setAnchorDate(todayStr())} className="px-2 py-1 rounded text-sm" style={{ color: theme.textMuted, backgroundColor: theme.surface }}>Today</button>
          <button onClick={() => setAnchorDate(addDays(anchorDate, n))} className="px-2 py-1 rounded" style={{ color: theme.textMuted, backgroundColor: theme.surface }}>›</button>
          <div className="ml-auto">{ModeSwitcher}</div>
        </div>
        <CalendarGrid days={days} filterFn={filterFn} handlers={handlers} onCreateAt={handlers.onCreateAt}
          onDropTask={(taskId, date, time) => dispatch({ type: 'UPDATE_TASK', id: taskId, patch: { dueDate: date, dueTime: time } })} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg font-semibold" style={{ color: theme.text, fontFamily: 'Fraunces, serif' }}>{MONTHS_FULL[vm.m]} {vm.y}</span>
        <button onClick={() => setVm((s) => { const d = new Date(s.y, s.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })} className="px-2 py-1 rounded" style={{ color: theme.textMuted, backgroundColor: theme.surface }}>‹</button>
        <button onClick={() => { const d = new Date(); setVm({ y: d.getFullYear(), m: d.getMonth() }); }} className="px-2 py-1 rounded text-sm" style={{ color: theme.textMuted, backgroundColor: theme.surface }}>Today</button>
        <button onClick={() => setVm((s) => { const d = new Date(s.y, s.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })} className="px-2 py-1 rounded" style={{ color: theme.textMuted, backgroundColor: theme.surface }}>›</button>
        <div className="ml-auto">{ModeSwitcher}</div>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: theme.border }}>
        {wd.map((w) => <div key={w} className="text-center text-xs font-semibold py-1.5" style={{ color: theme.textLight, backgroundColor: theme.bgAlt }}>{w}</div>)}
        {cells.map((ds, i) => (
          <CalendarCell key={i} ds={ds} isToday={ds === t} tasks={ds ? tasksOn(ds) : []} onOpen={handlers.onOpen}
            onDrop={(taskId) => ds && dispatch({ type: 'UPDATE_TASK', id: taskId, patch: { dueDate: ds } })} />
        ))}
      </div>
    </div>
  );
}

function CalendarCell({ ds, isToday, tasks, onOpen, onDrop }) {
  const theme = useTheme();
  const [over, setOver] = useState(false);
  return (
    <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); const id = e.dataTransfer.getData('text/task'); if (id) onDrop(id); }}
      className="p-1.5 align-top" style={{ minHeight: 96, backgroundColor: over ? theme.accentLight : theme.bgAlt }}>
      {ds && <div className="text-xs mb-1 flex items-center justify-center rounded-full" style={{ width: 20, height: 20, color: isToday ? theme.accentText : theme.textMuted, backgroundColor: isToday ? theme.accent : 'transparent', fontWeight: isToday ? 700 : 400 }}>{parseDate(ds).getDate()}</div>}
      <div className="space-y-1">
        {tasks.slice(0, 4).map((t) => (
          <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/task', t.id)} onClick={() => onOpen(t)}
            className="text-xs px-1.5 py-1 rounded cursor-pointer truncate" style={{ backgroundColor: theme.surface, color: theme.text, borderLeft: `2px solid ${theme.accent}` }}>{t.content}</div>
        ))}
        {tasks.length > 4 && <div className="text-xs" style={{ color: theme.textLight }}>+{tasks.length - 4} more</div>}
      </div>
    </div>
  );
}

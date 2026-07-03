import React, { useState } from 'react';
import {
  Check, Calendar, Repeat, Target, Bell, MapPin, Paperclip, Plus, Trash2,
  ChevronDown, ChevronRight, MessageSquare, Play, GripVertical, MoreHorizontal, Layers, ListTodo,
} from 'lucide-react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';
import {
  formatDueLabel, dueColor, isOverdue, recurrenceLabel, formatDuration, endTime,
} from '../lib/dates';
import { PRIORITY_META } from '../lib/constants';
import { Panel } from './shared';

/* ───────────────────────── checkbox ───────────────────────── */
export function TaskCheckbox({ task, onToggle }) {
  const theme = useTheme();
  const p = PRIORITY_META[task.priority] || PRIORITY_META[4];
  return (
    <button onClick={(e) => { e.stopPropagation(); onToggle(e); }} className="mt-0.5 flex-shrink-0 group/cb" aria-label="Complete task">
      <span className={`flex items-center justify-center rounded-full border-2 transition-all ${task.completed ? 'check-bounce' : ''}`}
        style={{ width: 19, height: 19, borderColor: task.completed ? theme.success : p.color, backgroundColor: task.completed ? theme.success : (task.priority < 4 ? `${p.color}18` : 'transparent') }}>
        {task.completed ? <Check size={12} color="#fff" strokeWidth={3} className="check-animate" />
          : <Check size={11} className="opacity-0 group-hover/cb:opacity-100 transition-opacity" style={{ color: p.color }} strokeWidth={3} />}
      </span>
    </button>
  );
}

/* ───────────────────────── metadata row ───────────────────────── */
function TaskMeta({ task, project, showProject }) {
  const theme = useTheme();
  const { state } = useStore();
  const due = formatDueLabel(task.dueDate, task.dueTime);
  const overdue = isOverdue(task);
  const subs = state.tasks.filter((t) => t.parentId === task.id);
  const doneSubs = subs.filter((s) => s.completed).length;
  const labelColor = (name) => (state.labels.find((l) => l.name === name)?.color) || '#8B5FBF';
  const end = endTime(task.dueTime, task.duration);
  return (
    <div className="flex items-center gap-2.5 mt-1 flex-wrap" style={{ fontSize: 12 }}>
      {due && <span className="flex items-center gap-1" style={{ color: overdue ? theme.danger : dueColor(task.dueDate, theme) }}><Calendar size={11} />{due}{end && ` – ${end}`}</span>}
      {task.recurrence && <span className="flex items-center gap-1" style={{ color: theme.textLight }}><Repeat size={11} />{recurrenceLabel(task.recurrence)}</span>}
      {task.duration && !end && <span className="flex items-center gap-1" style={{ color: theme.textLight }}>{formatDuration(task.duration)}</span>}
      {task.deadline && <span className="flex items-center gap-1" style={{ color: theme.danger }}><Target size={11} />{formatDueLabel(task.deadline)}</span>}
      {task.reminders && task.reminders.length > 0 && <span className="flex items-center" style={{ color: theme.textLight }}><Bell size={11} /></span>}
      {task.location && <span className="flex items-center gap-1" style={{ color: theme.textLight }}><MapPin size={11} />{task.location}</span>}
      {task.attachment && <span className="flex items-center" style={{ color: theme.textLight }}><Paperclip size={11} /></span>}
      {task.comments && task.comments.length > 0 && <span className="flex items-center gap-1" style={{ color: theme.textLight }}><MessageSquare size={11} />{task.comments.length}</span>}
      {subs.length > 0 && <span className="flex items-center gap-1" style={{ color: theme.textLight }}><Check size={11} />{doneSubs}/{subs.length}</span>}
      {(task.labels || []).map((l) => <span key={l} className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${labelColor(l)}22`, color: labelColor(l) }}>@{l}</span>)}
      {showProject && project && project.id !== 'inbox' && <span className="flex items-center gap-1 ml-auto" style={{ color: theme.textLight }}><span className="rounded-full inline-block" style={{ width: 8, height: 8, backgroundColor: project.color }} />{project.name}</span>}
    </div>
  );
}

const MAX_VISUAL_DEPTH = 6;

/* ───────────────────────── task row ───────────────────────── */
export function TaskRow({ task, depth = 0, showProject = true, onOpen, onToggle, onAddSubtask, onDelete, onFocus, dragHandle }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const project = state.projects.find((p) => p.id === task.projectId);
  const subs = state.tasks.filter((t) => t.parentId === task.id);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);
  const cappedFurther = depth > MAX_VISUAL_DEPTH;

  return (
    <div className="group/row">
      <div className="flex items-start gap-2.5 py-2 border-b transition-colors hover:bg-opacity-40"
        style={{ borderColor: theme.border, paddingLeft: visualDepth * 26, borderLeft: cappedFurther ? `2px solid ${theme.borderAlt}` : 'none' }}>
        {dragHandle && <span {...dragHandle} className="opacity-0 group-hover/row:opacity-100 cursor-grab mt-1 flex-shrink-0" style={{ color: theme.textLighter, touchAction: 'none' }}><GripVertical size={14} /></span>}
        {!task.isHeader && <TaskCheckbox task={task} onToggle={(e) => onToggle(task, e)} />}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpen(task)}>
          <p className="leading-snug flex items-center gap-1.5" style={{ fontSize: task.isHeader ? 13 : 14, fontWeight: task.isHeader ? 700 : 400, textTransform: task.isHeader ? 'uppercase' : 'none', letterSpacing: task.isHeader ? '.03em' : 'normal', color: task.completed ? theme.textLight : theme.text, textDecoration: task.completed ? 'line-through' : 'none' }}>
            {task.isHeader && <Layers size={12} style={{ color: theme.textLight, flexShrink: 0 }} />}{task.content}
          </p>
          {task.description && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: theme.textLight }}>{task.description}</p>}
          <TaskMeta task={task} project={project} showProject={showProject} />
        </div>
        <div className="opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
          {onFocus && !task.completed && !task.isHeader && <IconBtn title="Focus" onClick={(e) => { e.stopPropagation(); onFocus(task); }}><Play size={14} /></IconBtn>}
          {onAddSubtask && <IconBtn title="Add sub-task" onClick={(e) => { e.stopPropagation(); setExpanded(true); onAddSubtask(task); }}><Plus size={14} /></IconBtn>}
          <div className="relative">
            <IconBtn title="More" onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}><MoreHorizontal size={14} /></IconBtn>
            {menuOpen && (
              <Panel width={190}>
                <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_TASK', id: task.id, patch: { isHeader: !task.isHeader } }); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left" style={{ color: theme.text }}>
                  {task.isHeader ? <ListTodo size={14} /> : <Layers size={14} />}{task.isHeader ? 'Convert to task' : 'Convert to section'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(task); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left" style={{ color: theme.danger }}>
                  <Trash2 size={14} />Delete
                </button>
              </Panel>)}
          </div>
        </div>
      </div>
      {subs.length > 0 && (
        <>
          <button onClick={() => setExpanded((x) => !x)} className="flex items-center gap-1 text-xs py-0.5" style={{ color: theme.textLight, paddingLeft: visualDepth * 26 + 28 }}>
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}{subs.filter((s) => s.completed).length}/{subs.length} sub-tasks
          </button>
          {expanded && subs.sort((a, b) => (a.order || 0) - (b.order || 0)).map((st) => (
            <TaskRow key={st.id} task={st} depth={depth + 1} showProject={false} onOpen={onOpen}
              onToggle={onToggle} onAddSubtask={onAddSubtask} onDelete={onDelete} onFocus={onFocus} />
          ))}
        </>
      )}
    </div>
  );
}

function IconBtn({ children, title, onClick }) {
  const theme = useTheme();
  return <button title={title} onClick={onClick} className="p-1 rounded transition-colors" style={{ color: theme.textLight }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>{children}</button>;
}

/* ───────────────────────── simple list ───────────────────────── */
export function TaskList({ tasks, emptyMsg, ...handlers }) {
  const theme = useTheme();
  if (!tasks.length) return <p className="text-sm py-8" style={{ color: theme.textLighter }}>{emptyMsg}</p>;
  return (
    <div>
      {tasks.map((t, i) => (
        <div key={t.id} className="task-anim" style={{ animationDelay: `${Math.min(i, 8) * 20}ms` }}>
          <TaskRow task={t} {...handlers} />
        </div>
      ))}
    </div>
  );
}

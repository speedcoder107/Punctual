import React, { useState } from 'react';
import {
  X, Calendar, Flag, Tag, Target, Bell, Plus, Trash2, Timer, Send, Inbox, Play, Clock, Layers, ListTodo,
} from 'lucide-react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';
import {
  formatDueLabel, dueColor, recurrenceLabel, formatDuration, todayStr, addDays, upcomingWeekday, endTime, timeRangesOverlap,
} from '../lib/dates';
import { PRIORITY_META, reminderLabel, RECURRENCE_UNITS } from '../lib/constants';
import { TaskCheckbox } from './TaskItems';
import { Panel, MiniCalendar, TimeOfDayPicker, HourMinuteCounter } from './shared';
import { ReminderPanel } from './TaskSheet';

export default function TaskDetail({ taskId, onClose, onToggle, onOpen, onAddSubtask, onFocus }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const task = state.tasks.find((t) => t.id === taskId);
  const [panel, setPanel] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);

  if (!task) return null;
  const project = state.projects.find((p) => p.id === task.projectId);
  const section = state.sections.find((s) => s.id === task.sectionId);
  const subs = state.tasks.filter((t) => t.parentId === task.id).sort((a, b) => (a.order || 0) - (b.order || 0));
  const patch = (p) => dispatch({ type: 'UPDATE_TASK', id: task.id, patch: p });
  const labelColor = (name) => (state.labels.find((l) => l.name === name)?.color) || '#8B5FBF';
  const dueEnd = endTime(task.dueTime, task.duration);
  const overlapping = task.dueTime ? state.tasks.find((t) => t.id !== task.id && !t.completed && t.dueDate === task.dueDate && t.dueTime && timeRangesOverlap(task.dueTime, task.duration, t.dueTime, t.duration)) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onMouseDown={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: theme.overlay, animation: 'fadeIn .2s ease' }} />
      <div className="relative h-full flex flex-col detail-slide" style={{ width: 'min(560px, 94vw)', backgroundColor: theme.bgAlt, borderLeft: `1px solid ${theme.border}` }} onMouseDown={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: theme.textMuted }}>
            {project?.id === 'inbox' ? <Inbox size={13} /> : <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, backgroundColor: project?.color }} />}
            <span className="truncate">{project?.name || 'Inbox'}{section ? ` / ${section.name}` : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <button title={task.isHeader ? 'Convert to task' : 'Convert to section'} onClick={() => patch({ isHeader: !task.isHeader })} className="p-1.5 rounded" style={{ color: theme.textMuted }}>{task.isHeader ? <ListTodo size={16} /> : <Layers size={16} />}</button>
            {!task.completed && onFocus && !task.isHeader && <button title="Focus" onClick={() => onFocus(task)} className="p-1.5 rounded" style={{ color: theme.textMuted }}><Play size={16} /></button>}
            <button onClick={onClose} className="p-1.5 rounded" style={{ color: theme.textMuted }}><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex" style={{ minHeight: '100%' }}>
            {/* main */}
            <div className="flex-1 min-w-0 px-4 py-4">
              <div className="flex items-start gap-3">
                {!task.isHeader && <TaskCheckbox task={task} onToggle={(e) => onToggle(task, e)} />}
                <div className="flex-1 min-w-0">
                  {editingTitle ? (
                    <textarea autoFocus value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={() => { if (titleDraft.trim()) patch({ content: titleDraft.trim() }); setEditingTitle(false); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                      className="w-full resize-none outline-none bg-transparent font-medium" style={{ color: theme.text, fontSize: 18, lineHeight: 1.4 }} rows={1} />
                  ) : (
                    <h2 onClick={() => { setTitleDraft(task.content); setEditingTitle(true); }} className="font-medium cursor-text" style={{ color: task.completed ? theme.textLight : theme.text, fontSize: 18, lineHeight: 1.4, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.content}</h2>
                  )}
                  {/* description */}
                  {editingDesc ? (
                    <textarea autoFocus value={descDraft} onChange={(e) => setDescDraft(e.target.value)}
                      onBlur={() => { patch({ description: descDraft.trim() }); setEditingDesc(false); }}
                      placeholder="Add description…" className="w-full resize-none outline-none bg-transparent text-sm mt-2 p-2 rounded-lg" style={{ color: theme.textMuted, border: `1px solid ${theme.border}`, minHeight: 60 }} />
                  ) : (
                    <p onClick={() => { setDescDraft(task.description || ''); setEditingDesc(true); }} className="text-sm mt-1.5 cursor-text" style={{ color: task.description ? theme.textMuted : theme.textLighter }}>{task.description || 'Add description…'}</p>
                  )}
                </div>
              </div>

              {/* sub-tasks */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textLight }}>Sub-tasks {subs.length > 0 && `· ${subs.filter((s) => s.completed).length}/${subs.length}`}</span>
                  <button onClick={() => onAddSubtask(task)} className="p-1 rounded" style={{ color: theme.textLight }}><Plus size={14} /></button>
                </div>
                {subs.map((st) => {
                  const grandkids = state.tasks.filter((t) => t.parentId === st.id).length;
                  return (
                    <div key={st.id} className="flex items-center gap-2 py-1.5 border-b group/sub" style={{ borderColor: theme.border }}>
                      {!st.isHeader && <TaskCheckbox task={st} onToggle={(e) => onToggle(st, e)} />}
                      <span onClick={() => onOpen(st)} className="flex-1 text-sm cursor-pointer flex items-center gap-1" style={{ color: st.completed ? theme.textLight : theme.text, textDecoration: st.completed ? 'line-through' : 'none', fontWeight: st.isHeader ? 700 : 400 }}>
                        {st.content}{grandkids > 0 && <span className="text-xs" style={{ color: theme.textLighter }}>({grandkids})</span>}
                      </span>
                      <button onClick={() => onAddSubtask(st)} className="opacity-0 group-hover/sub:opacity-100 p-1" style={{ color: theme.textLight }} title="Add sub-task"><Plus size={12} /></button>
                      <button onClick={() => dispatch({ type: 'DELETE_TASK', id: st.id })} className="opacity-0 group-hover/sub:opacity-100 p-1" style={{ color: theme.textLight }}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
                {subs.length === 0 && <p className="text-xs" style={{ color: theme.textLighter }}>No sub-tasks yet.</p>}
              </div>

              {/* comments */}
              <div className="mt-5">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textLight }}>Comments</span>
                <div className="mt-2 space-y-2">
                  {(task.comments || []).map((c) => (
                    <div key={c.id} className="group/cm rounded-lg p-2.5" style={{ backgroundColor: theme.surface }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm" style={{ color: theme.text, whiteSpace: 'pre-wrap' }}>{c.text}</p>
                        <button onClick={() => dispatch({ type: 'DELETE_COMMENT', id: task.id, commentId: c.id })} className="opacity-0 group-hover/cm:opacity-100 p-0.5 flex-shrink-0" style={{ color: theme.textLight }}><Trash2 size={12} /></button>
                      </div>
                      <p className="text-xs mt-1" style={{ color: theme.textLighter }}>{new Date(c.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) { dispatch({ type: 'ADD_COMMENT', id: task.id, text: commentText.trim() }); setCommentText(''); } }} placeholder="Add a comment…" className="flex-1 text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }} />
                  <button onClick={() => { if (commentText.trim()) { dispatch({ type: 'ADD_COMMENT', id: task.id, text: commentText.trim() }); setCommentText(''); } }} className="p-2 rounded-lg" style={{ backgroundColor: theme.accent, color: theme.accentText }}><Send size={15} /></button>
                </div>
              </div>
            </div>

            {/* right sidebar */}
            <div className="w-44 flex-shrink-0 border-l px-3 py-4 space-y-4" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
              <Field label="Due date">
                <div className="relative">
                  <button onClick={() => setPanel(panel === 'date' ? null : 'date')} className="text-sm flex items-center gap-1.5" style={{ color: task.dueDate ? dueColor(task.dueDate, theme) : theme.textLight }}>
                    <Calendar size={14} />{task.dueDate ? (task.recurrence ? recurrenceLabel(task.recurrence) : formatDueLabel(task.dueDate, task.dueTime)) : 'No date'}{dueEnd && ` – ${dueEnd}`}
                  </button>
                  {overlapping && <p className="text-xs mt-1" style={{ color: theme.danger }}>Overlaps with "{overlapping.content}" {overlapping.dueTime}</p>}
                  {panel === 'date' && (
                    <Panel position="bottom" width={260}>
                      <div className="grid grid-cols-2 gap-1.5 mb-2">
                        {[['Today', todayStr()], ['Tomorrow', addDays(todayStr(), 1)], ['Weekend', upcomingWeekday(6, false)], ['Next week', upcomingWeekday(1, false)]].map(([l, d]) => (
                          <button key={l} onClick={() => patch({ dueDate: task.dueDate === d ? null : d })} className="text-xs px-2 py-1.5 rounded-md text-left" style={{ backgroundColor: task.dueDate === d ? theme.accentLight : theme.surface, color: task.dueDate === d ? theme.accent : theme.text }}>{l}</button>))}
                      </div>
                      <MiniCalendar value={task.dueDate} onSelect={(d) => patch({ dueDate: task.dueDate === d ? null : d })} />

                      <div className="mt-3">
                        <span className="text-xs" style={{ color: theme.textLight }}>Time</span>
                        {task.dueTime ? (
                          <div className="flex items-center gap-2 mt-1.5">
                            <Clock size={13} style={{ color: theme.textLight }} />
                            <TimeOfDayPicker value={task.dueTime} onChange={(t) => patch({ dueTime: t })} />
                            <button onClick={() => patch({ dueTime: null })} style={{ color: theme.accent }}><X size={13} /></button>
                          </div>
                        ) : (
                          <button onClick={() => patch({ dueTime: '09:00' })} className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: theme.textLight }}><Clock size={13} />Add time</button>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs" style={{ color: theme.textLight }}>Repeat:</span>
                        {RECURRENCE_UNITS.map(({ unit, label }) => {
                          const active = task.recurrence && task.recurrence.unit === unit && task.recurrence.interval === 1;
                          return <button key={unit} onClick={() => patch({ recurrence: active ? null : { unit, interval: 1 } })} className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: active ? theme.accentLight : theme.surface, color: active ? theme.accent : theme.textMuted }}>{label}</button>;
                        })}
                      </div>

                      {task.dueDate && <button onClick={() => patch({ dueDate: null, dueTime: null, recurrence: null })} className="mt-3 text-sm" style={{ color: theme.accent }}>Remove date</button>}
                    </Panel>)}
                </div>
              </Field>

              <Field label="Priority">
                <div className="relative">
                  <button onClick={() => setPanel(panel === 'prio' ? null : 'prio')} className="text-sm flex items-center gap-1.5" style={{ color: PRIORITY_META[task.priority].color }}>
                    <Flag size={14} fill={task.priority < 4 ? PRIORITY_META[task.priority].color : 'none'} />{PRIORITY_META[task.priority].label}
                  </button>
                  {panel === 'prio' && (
                    <Panel position="bottom" width={170}>
                      {[1, 2, 3, 4].map((p) => (
                        <button key={p} onClick={() => { patch({ priority: task.priority === p ? 4 : p }); setPanel(null); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm" style={{ color: theme.text, backgroundColor: task.priority === p ? theme.hover : 'transparent' }}>
                          <Flag size={14} style={{ color: PRIORITY_META[p].color }} fill={p < 4 ? PRIORITY_META[p].color : 'none'} />{PRIORITY_META[p].label}
                        </button>))}
                      {task.priority !== 4 && <p className="text-xs mt-1 px-2" style={{ color: theme.textLighter }}>Click the selected priority again to clear it.</p>}
                    </Panel>)}
                </div>
              </Field>

              <Field label="Labels">
                <div className="flex flex-wrap gap-1">
                  {(task.labels || []).map((l) => <span key={l} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${labelColor(l)}22`, color: labelColor(l) }}>@{l}</span>)}
                  <div className="relative">
                    <button onClick={() => setPanel(panel === 'labels' ? null : 'labels')} className="text-xs" style={{ color: theme.textLight }}><Tag size={13} /></button>
                    {panel === 'labels' && (
                      <Panel position="bottom" width={180}>
                        {state.labels.length === 0 && <p className="text-xs" style={{ color: theme.textLighter }}>No labels yet.</p>}
                        {state.labels.map((l) => {
                          const on = (task.labels || []).includes(l.name);
                          return <button key={l.id} onClick={() => patch({ labels: on ? task.labels.filter((x) => x !== l.name) : [...(task.labels || []), l.name] })} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm" style={{ color: theme.text, backgroundColor: on ? theme.hover : 'transparent' }}><Tag size={13} style={{ color: l.color }} />{l.name}</button>;
                        })}
                      </Panel>)}
                  </div>
                </div>
              </Field>

              <Field label="Deadline">
                <div className="relative">
                  <button onClick={() => setPanel(panel === 'dl' ? null : 'dl')} className="text-sm flex items-center gap-1.5" style={{ color: task.deadline ? theme.danger : theme.textLight }}>
                    <Target size={14} />{task.deadline ? formatDueLabel(task.deadline) : 'No deadline'}
                  </button>
                  {panel === 'dl' && (
                    <Panel position="bottom" width={250}>
                      <MiniCalendar value={task.deadline} onSelect={(d) => patch({ deadline: task.deadline === d ? null : d })} />
                      {task.deadline && <button onClick={() => { patch({ deadline: null }); setPanel(null); }} className="mt-2 text-sm" style={{ color: theme.accent }}>Remove</button>}
                    </Panel>)}
                </div>
              </Field>

              <Field label="Duration">
                <div className="relative">
                  <button onClick={() => setPanel(panel === 'dur' ? null : 'dur')} className="text-sm flex items-center gap-1.5" style={{ color: task.duration ? theme.text : theme.textLight }}>
                    <Timer size={14} />{task.duration ? formatDuration(task.duration) : 'None'}
                  </button>
                  {panel === 'dur' && (
                    <Panel position="bottom" width={200}>
                      <div className="grid grid-cols-3 gap-1.5">{[15, 30, 45, 60, 90, 120].map((m) => <button key={m} onClick={() => patch({ duration: task.duration === m ? null : m })} className="text-xs px-2 py-1.5 rounded-md" style={{ backgroundColor: task.duration === m ? theme.accentLight : theme.surface, color: task.duration === m ? theme.accent : theme.text }}>{formatDuration(m)}</button>)}</div>
                      <div className="mt-2 flex justify-center">
                        <HourMinuteCounter totalMinutes={task.duration || 0} onChange={(v) => patch({ duration: v })} />
                      </div>
                      {task.duration && <button onClick={() => { patch({ duration: null }); setPanel(null); }} className="mt-2 text-sm" style={{ color: theme.accent }}>Clear</button>}
                    </Panel>)}
                </div>
              </Field>

              <Field label="Reminders">
                <div className="relative">
                  {(task.reminders || []).map((r) => <div key={r.id} className="text-xs flex items-center gap-1 mb-0.5" style={{ color: theme.textMuted }}><Bell size={12} />{reminderLabel(r)}</div>)}
                  <button onClick={() => setPanel(panel === 'rem' ? null : 'rem')} className="text-sm flex items-center gap-1.5" style={{ color: theme.textLight }}><Plus size={13} />Add</button>
                  {panel === 'rem' && (
                    <ReminderPanel reminders={task.reminders || []} hasDue={!!(task.dueDate && task.dueTime)} hasDeadline={!!task.deadline}
                      onAdd={(r) => patch({ reminders: [...(task.reminders || []), r] })}
                      onRemove={(r) => patch({ reminders: (task.reminders || []).filter((x) => x.id !== r.id) })} />)}
                </div>
              </Field>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  const theme = useTheme();
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: theme.textLighter }}>{label}</p>
      {children}
    </div>
  );
}

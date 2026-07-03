import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { uid, todayStr, advanceRecurrence } from '../lib/dates';
import { pointsForCompletion } from '../lib/karma';
import { DEFAULT_STATE, saveState } from '../storage';

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

function nextOrder(items, filterFn) {
  const rel = items.filter(filterFn);
  return rel.length ? Math.max(...rel.map((i) => i.order || 0)) + 1 : 0;
}

function reducer(state, action) {
  switch (action.type) {
    case 'INIT': return action.payload;

    /* ── tasks ── */
    case 'ADD_TASK': {
      const d = action.payload;
      const task = {
        id: uid(), completed: false, completedAt: null, createdAt: Date.now(),
        parentId: d.parentId || null, sectionId: d.sectionId || null,
        content: d.content, description: d.description || '',
        projectId: d.projectId || 'inbox', priority: d.priority || 4,
        dueDate: d.dueDate || null, dueTime: d.dueTime || null, duration: d.duration || null,
        deadline: d.deadline || null, recurrence: d.recurrence || null,
        labels: d.labels || [], reminders: d.reminders || [], comments: [],
        location: d.location || null, attachment: d.attachment || null, assignee: null, isHeader: !!d.isHeader,
        order: nextOrder(state.tasks, (t) => t.projectId === (d.projectId || 'inbox') && t.sectionId === (d.sectionId || null) && t.parentId === (d.parentId || null)),
      };
      return { ...state, tasks: [...state.tasks, task] };
    }
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map((t) => t.id === action.id ? { ...t, ...action.patch } : t) };
    case 'DELETE_TASK': {
      const target = state.tasks.find((t) => t.id === action.id);
      if (action.mode === 'promote' && target) {
        // re-parent direct children to the deleted task's own parent, keep the rest
        const tasks = state.tasks.filter((t) => t.id !== action.id).map((t) => t.parentId === action.id ? { ...t, parentId: target.parentId } : t);
        return { ...state, tasks };
      }
      const toDelete = new Set([action.id]);
      for (let pass = true; pass;) { pass = false; for (const t of state.tasks) { if (t.parentId && toDelete.has(t.parentId) && !toDelete.has(t.id)) { toDelete.add(t.id); pass = true; } } }
      return { ...state, tasks: state.tasks.filter((t) => !toDelete.has(t.id)) };
    }
    case 'TOGGLE_COMPLETE': {
      const task = state.tasks.find((t) => t.id === action.id);
      if (!task) return state;
      if (task.completed) {
        return { ...state, tasks: state.tasks.map((t) => t.id === action.id ? { ...t, completed: false, completedAt: null } : t) };
      }
      // recurring → advance instead of complete
      if (task.recurrence) {
        const nextDue = advanceRecurrence(task.recurrence, task.dueDate);
        const prod = awardKarma(state.productivity, task);
        return { ...state, productivity: prod, tasks: state.tasks.map((t) => t.id === action.id ? { ...t, dueDate: nextDue, lastCompletedAt: Date.now() } : t) };
      }
      const prod = awardKarma(state.productivity, task);
      return {
        ...state, productivity: prod,
        tasks: state.tasks.map((t) => t.id === action.id ? { ...t, completed: true, completedAt: Date.now() } : t),
      };
    }
    case 'REORDER_TASKS':
      return { ...state, tasks: action.tasks };
    case 'MOVE_TASK': {
      const { id, projectId, sectionId } = action;
      return { ...state, tasks: state.tasks.map((t) => t.id === id ? { ...t, projectId: projectId ?? t.projectId, sectionId: sectionId !== undefined ? sectionId : t.sectionId } : t) };
    }
    case 'ADD_COMMENT':
      return { ...state, tasks: state.tasks.map((t) => t.id === action.id ? { ...t, comments: [...(t.comments || []), { id: uid(), text: action.text, createdAt: Date.now() }] } : t) };
    case 'DELETE_COMMENT':
      return { ...state, tasks: state.tasks.map((t) => t.id === action.id ? { ...t, comments: (t.comments || []).filter((c) => c.id !== action.commentId) } : t) };

    /* ── projects ── */
    case 'ADD_PROJECT': {
      const p = action.payload;
      const project = { id: uid(), name: p.name, color: p.color, parentId: p.parentId || null, order: nextOrder(state.projects, (x) => x.parentId === (p.parentId || null)), isFavorite: false, viewType: 'list', collapsed: false, isDefault: false };
      return { ...state, projects: [...state.projects, project] };
    }
    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map((p) => p.id === action.id ? { ...p, ...action.patch } : p) };
    case 'DELETE_PROJECT': {
      const toDeleteProj = new Set([action.id]);
      for (let pass = true; pass;) { pass = false; for (const p of state.projects) { if (p.parentId && toDeleteProj.has(p.parentId) && !toDeleteProj.has(p.id)) { toDeleteProj.add(p.id); pass = true; } } }
      const projects = state.projects.filter((p) => !toDeleteProj.has(p.id));
      const sections = state.sections.filter((s) => !toDeleteProj.has(s.projectId));
      if (action.mode === 'promote') {
        return { ...state, projects, sections, tasks: state.tasks.map((t) => toDeleteProj.has(t.projectId) ? { ...t, projectId: 'inbox', sectionId: null } : t) };
      }
      // delete-all: remove every task that belonged to these projects, subtasks included
      const directIds = state.tasks.filter((t) => toDeleteProj.has(t.projectId)).map((t) => t.id);
      const toDeleteTasks = new Set(directIds);
      for (let pass = true; pass;) { pass = false; for (const t of state.tasks) { if (t.parentId && toDeleteTasks.has(t.parentId) && !toDeleteTasks.has(t.id)) { toDeleteTasks.add(t.id); pass = true; } } }
      return { ...state, projects, sections, tasks: state.tasks.filter((t) => !toDeleteTasks.has(t.id)) };
    }
    case 'REORDER_PROJECTS':
      return { ...state, projects: action.projects };

    /* ── sections ── */
    case 'ADD_SECTION': {
      const s = action.payload;
      const section = { id: uid(), projectId: s.projectId, name: s.name, order: nextOrder(state.sections, (x) => x.projectId === s.projectId), collapsed: false };
      return { ...state, sections: [...state.sections, section] };
    }
    case 'UPDATE_SECTION':
      return { ...state, sections: state.sections.map((s) => s.id === action.id ? { ...s, ...action.patch } : s) };
    case 'DELETE_SECTION': {
      const sections = state.sections.filter((s) => s.id !== action.id);
      if (action.mode === 'promote') {
        return { ...state, sections, tasks: state.tasks.map((t) => t.sectionId === action.id ? { ...t, sectionId: null } : t) };
      }
      // delete-all: remove the section's tasks and their whole subtask trees
      const directIds = state.tasks.filter((t) => t.sectionId === action.id).map((t) => t.id);
      const toDelete = new Set(directIds);
      for (let pass = true; pass;) { pass = false; for (const t of state.tasks) { if (t.parentId && toDelete.has(t.parentId) && !toDelete.has(t.id)) { toDelete.add(t.id); pass = true; } } }
      return { ...state, sections, tasks: state.tasks.filter((t) => !toDelete.has(t.id)) };
    }
    case 'REORDER_SECTIONS':
      return { ...state, sections: action.sections };

    /* ── labels ── */
    case 'ADD_LABEL': {
      if (state.labels.some((l) => l.name.toLowerCase() === action.name.toLowerCase())) return state;
      return { ...state, labels: [...state.labels, { id: uid(), name: action.name, color: action.color || '#8B5FBF', order: state.labels.length, isFavorite: false }] };
    }
    case 'UPDATE_LABEL': {
      const old = state.labels.find((l) => l.id === action.id);
      const labels = state.labels.map((l) => l.id === action.id ? { ...l, ...action.patch } : l);
      // rename across tasks
      let tasks = state.tasks;
      if (old && action.patch.name && action.patch.name !== old.name) {
        tasks = state.tasks.map((t) => ({ ...t, labels: (t.labels || []).map((n) => n === old.name ? action.patch.name : n) }));
      }
      return { ...state, labels, tasks };
    }
    case 'DELETE_LABEL': {
      const lab = state.labels.find((l) => l.id === action.id);
      return { ...state, labels: state.labels.filter((l) => l.id !== action.id), tasks: lab ? state.tasks.map((t) => ({ ...t, labels: (t.labels || []).filter((n) => n !== lab.name) })) : state.tasks };
    }

    /* ── filters ── */
    case 'ADD_FILTER':
      return { ...state, filters: [...state.filters, { id: uid(), name: action.payload.name, query: action.payload.query, color: action.payload.color || '#3E7CB8', order: state.filters.length, isFavorite: false }] };
    case 'UPDATE_FILTER':
      return { ...state, filters: state.filters.map((f) => f.id === action.id ? { ...f, ...action.patch } : f) };
    case 'DELETE_FILTER':
      return { ...state, filters: state.filters.filter((f) => f.id !== action.id) };

    /* ── templates ── */
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, { id: uid(), ...action.payload }] };
    case 'DELETE_TEMPLATE':
      return { ...state, templates: state.templates.filter((t) => t.id !== action.id) };

    /* ── focus ── */
    case 'ADD_FOCUS_SESSION':
      return { ...state, focusSessions: [...state.focusSessions, { id: uid(), ...action.payload }] };

    /* ── productivity / settings ── */
    case 'UPDATE_PRODUCTIVITY':
      return { ...state, productivity: { ...state.productivity, ...action.patch } };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'CLEAR_ALL':
      return { ...DEFAULT_STATE };
    case 'IMPORT':
      return action.payload;

    default: return state;
  }
}

function awardKarma(productivity, task) {
  const pts = pointsForCompletion(task);
  const today = todayStr();
  const dailyCompletions = { ...productivity.dailyCompletions, [today]: (productivity.dailyCompletions[today] || 0) + 1 };
  const activityLog = [{ id: uid(), type: 'completed', taskId: task.id, content: task.content, at: Date.now(), points: pts }, ...(productivity.activityLog || [])].slice(0, 200);
  return { ...productivity, karma: (productivity.karma || 0) + pts, dailyCompletions, activityLog };
}

export function StoreProvider({ initial, children }) {
  const [state, dispatch] = useReducer(reducer, initial || DEFAULT_STATE);
  useEffect(() => { if (state && state !== DEFAULT_STATE) saveState(state); }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

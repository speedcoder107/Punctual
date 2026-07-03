import { uid } from './lib/dates';

const KEY = 'punctual-data';

export const DEFAULT_PROJECTS = [{ id: 'inbox', name: 'Inbox', color: '#9C9589', order: 0, parentId: null, isFavorite: false, viewType: 'list', calendarMode: 'month', sortBy: 'manual', collapsed: false, isDefault: true }];

export const DEFAULT_STATE = {
  version: 2,
  projects: DEFAULT_PROJECTS,
  sections: [],
  tasks: [],
  labels: [],
  filters: [
    { id: uid(), name: 'Priority 1', query: 'p1', color: '#D6492F', order: 0, isFavorite: false },
    { id: uid(), name: 'Overdue', query: 'overdue', color: '#D98E2B', order: 1, isFavorite: false },
  ],
  templates: [],
  productivity: { dailyGoal: 5, weeklyGoal: 25, karma: 0, dailyCompletions: {}, activityLog: [], vacationMode: false },
  focusSessions: [],
  settings: {
    startView: 'today', autoParse: true, soundEnabled: true, sidebarWidth: 'normal', weekStart: 0, themeMode: 'system', accent: 'tomato', showCompleted: false, customSyntaxes: [],
    filterBuilderMode: 'visual', inboxShowsAll: false, deleteBehavior: 'delete-all', viewSort: {},
    shortcuts: {}, customShortcuts: [],
  },
};

function migrate(data) {
  if (!data) return null;
  // v1 shape: { projects, tasks }
  if (!data.version || data.version < 2) {
    const projects = (data.projects && data.projects.length ? data.projects : DEFAULT_PROJECTS).map((p, i) => ({
      parentId: null, order: i, isFavorite: false, viewType: 'list', calendarMode: 'month', sortBy: 'manual', collapsed: false, ...p,
    }));
    if (!projects.some((p) => p.id === 'inbox')) projects.unshift(DEFAULT_PROJECTS[0]);
    const tasks = (data.tasks || []).map((t, i) => ({
      sectionId: null, order: i, dueTime: null, duration: null, deadline: t.deadline || null,
      reminders: t.reminder ? [] : [], comments: [], assignee: null, ...t,
    }));
    // gather labels from tasks
    const labelSet = new Set();
    tasks.forEach((t) => (t.labels || []).forEach((l) => labelSet.add(l)));
    const labels = [...labelSet].map((name, i) => ({ id: uid(), name, color: '#8B5FBF', order: i, isFavorite: false }));
    return {
      ...DEFAULT_STATE,
      projects, tasks, labels,
      settings: { ...DEFAULT_STATE.settings, themeMode: data.themeMode || 'system' },
    };
  }
  // ensure all keys exist (forward-compat)
  return {
    ...DEFAULT_STATE,
    ...data,
    projects: (data.projects && data.projects.length ? data.projects : DEFAULT_PROJECTS).map((p) => ({ calendarMode: 'month', sortBy: 'manual', ...p })),
    tasks: (data.tasks || []).map((t) => ({ isHeader: false, ...t, reminders: normalizeReminders(t.reminders) })),
    productivity: { ...DEFAULT_STATE.productivity, ...(data.productivity || {}) },
    settings: { ...DEFAULT_STATE.settings, ...(data.settings || {}) },
  };
}

// Older builds stored reminders as plain "minutes before due" numbers.
// Normalize to the current { id, mode, offsetMins, at } object shape.
function normalizeReminders(reminders) {
  return (reminders || []).map((r) => (typeof r === 'number' ? { id: uid(), mode: 'due', offsetMins: r } : r));
}

export async function loadState() {
  try {
    const res = await window.storage.get(KEY);
    if (res && res.value) {
      const parsed = JSON.parse(res.value);
      const migrated = migrate(parsed);
      if (migrated) return migrated;
    }
    // legacy theme key
    const themeRes = await window.storage.get('punctual-theme');
    if (themeRes && themeRes.value) {
      return { ...DEFAULT_STATE, settings: { ...DEFAULT_STATE.settings, themeMode: themeRes.value } };
    }
  } catch { /* first run */ }
  return DEFAULT_STATE;
}

let saveTimer = null;
export function saveState(state) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { window.storage.set(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, 250);
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `punctual-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

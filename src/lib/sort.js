export const SORT_OPTIONS = [
  { key: 'smart', label: 'Priority + date (default)' },
  { key: 'manual', label: 'Manual (drag)' },
  { key: 'priority', label: 'Priority' },
  { key: 'dueDate', label: 'Due date' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'alpha', label: 'Alphabetical' },
  { key: 'created', label: 'Date added' },
];

/* Completed tasks always sink to the bottom regardless of sort key.
   'smart' (the default) matches the app's original priority-then-date behavior. */
export function sortTasks(list, key = 'smart') {
  const arr = [...list];
  const byCompleted = (a, b) => (a.completed !== b.completed ? (a.completed ? 1 : -1) : 0);
  const byPriority = (a, b) => (a.priority || 4) - (b.priority || 4);
  const byDueDate = (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
  const cmp = {
    smart: (a, b) => byPriority(a, b) || byDueDate(a, b),
    manual: (a, b) => (a.order || 0) - (b.order || 0),
    priority: byPriority,
    dueDate: byDueDate,
    deadline: (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'),
    alpha: (a, b) => a.content.localeCompare(b.content),
    created: (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
  }[key] || (() => 0);
  return arr.sort((a, b) => byCompleted(a, b) || cmp(a, b));
}

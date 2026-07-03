/* ───────────────────────── keyboard shortcuts registry ─────────────────────────
   Every bindable action lives here with a default key. Users can rebind any of
   them (settings.shortcuts: { actionId: 'key' }) or add their own custom
   navigation shortcuts (settings.customShortcuts: [{id,key,targetType,targetId}])
   that jump straight to a project / filter / label. */

export const SHORTCUT_ACTIONS = [
  // Quick actions
  { id: 'quickAdd', label: 'Add task', category: 'Actions', defaultKey: 'q' },
  { id: 'commandMenu', label: 'Open command menu', category: 'Actions', defaultKey: 'mod+k' },
  { id: 'openSettings', label: 'Open settings', category: 'Actions', defaultKey: '?' },
  { id: 'toggleTheme', label: 'Toggle dark / light theme', category: 'Actions', defaultKey: 'shift+d' },
  { id: 'closeOverlay', label: 'Close panel / dialog', category: 'Actions', defaultKey: 'escape' },
  { id: 'toggleShowCompleted', label: 'Show / hide completed tasks', category: 'Actions', defaultKey: 'shift+h' },

  // Navigation
  { id: 'goToday', label: 'Go to Today', category: 'Navigation', defaultKey: 't' },
  { id: 'goUpcoming', label: 'Go to Upcoming', category: 'Navigation', defaultKey: 'u' },
  { id: 'goInbox', label: 'Go to Inbox', category: 'Navigation', defaultKey: 'i' },
  { id: 'goCalendar', label: 'Go to Calendar', category: 'Navigation', defaultKey: 'c' },
  { id: 'goSearch', label: 'Go to Search', category: 'Navigation', defaultKey: '/' },
  { id: 'goFiltersLabels', label: 'Go to Filters & Labels', category: 'Navigation', defaultKey: 'g' },
  { id: 'goProductivity', label: 'Go to Productivity', category: 'Navigation', defaultKey: 'p' },
  { id: 'goCompleted', label: 'Go to Completed', category: 'Navigation', defaultKey: 'shift+c' },
];

export function defaultShortcutMap() {
  const map = {};
  SHORTCUT_ACTIONS.forEach((a) => { map[a.id] = a.defaultKey; });
  return map;
}

// Normalizes a KeyboardEvent into a comparable combo string, e.g. "mod+k", "shift+d", "t".
// Shift is only encoded for letter keys — for symbol keys (e.g. Shift+/ => "?"),
// e.key already reflects the shifted character, so adding "shift+" too would
// double-count it and never match a plain "?" binding.
export function eventToCombo(e) {
  const parts = [];
  if (e.metaKey || e.ctrlKey) parts.push('mod');
  let key = e.key.toLowerCase();
  if (key === ' ') key = 'space';
  const isLetter = /^[a-z]$/.test(key);
  if (e.shiftKey && isLetter) parts.push('shift');
  if (e.altKey) parts.push('alt');
  if (!['control', 'meta', 'shift', 'alt'].includes(key)) parts.push(key);
  return parts.join('+');
}

export function comboLabel(combo) {
  if (!combo) return '—';
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || '');
  return combo.split('+').map((p) => {
    if (p === 'mod') return isMac ? '⌘' : 'Ctrl';
    if (p === 'shift') return isMac ? '⇧' : 'Shift';
    if (p === 'alt') return isMac ? '⌥' : 'Alt';
    if (p === 'escape') return 'Esc';
    if (p === 'space') return 'Space';
    return p.toUpperCase();
  }).join(isMac ? '' : '+');
}

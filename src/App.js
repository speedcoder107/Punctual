import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, LayoutList, Calendar as CalIcon, CheckCircle } from 'lucide-react';
import { ThemeProvider, buildTheme, useTheme } from './theme';
import { StoreProvider, useStore } from './state/store';
import { DeleteConfirmProvider, useRequestDelete } from './state/deleteConfirm';
import { loadState } from './storage';
import { todayStr, isOverdue } from './lib/dates';
import { reminderFireTime, reminderLabel } from './lib/constants';
import { sortTasks, SORT_OPTIONS } from './lib/sort';
import { defaultShortcutMap, eventToCombo } from './lib/shortcuts';
import Sidebar from './components/Sidebar';
import TaskSheet from './components/TaskSheet';
import TaskDetail from './components/TaskDetail';
import { TaskList } from './components/TaskItems';
import { ListLayout, BoardLayout, CalendarLayout } from './components/ProjectViews';
import { UpcomingView, FilterView, LabelView, FiltersLabelsOverview, CompletedView, InboxExtras } from './components/OtherViews';
import ProductivityView from './components/Productivity';
import CalendarView from './components/CalendarView';
import CommandMenu from './components/CommandMenu';
import SettingsModal from './components/SettingsModal';
import FocusTimer from './components/FocusTimer';
import { ProgressRing } from './components/shared';

const PAGE_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; }
body { margin: 0; }
button { cursor: pointer; }
.no-sb::-webkit-scrollbar{ display:none; } .no-sb{ scrollbar-width:none; }
@keyframes taskIn { from { opacity:0; transform: translateY(3px);} to {opacity:1; transform:none;} }
.task-anim { animation: taskIn .22s ease both; }
@keyframes checkPulse { 0% { transform: scale(.3); opacity:0; } 55% { transform: scale(1.18);} 100% { transform: scale(1); opacity:1; } }
@keyframes checkBounce { 0%,100% { transform: scale(1);} 50% { transform: scale(1.22);} }
.check-animate { animation: checkPulse .4s cubic-bezier(.34,1.56,.64,1) both; }
.check-bounce { animation: checkBounce .5s cubic-bezier(.34,1.56,.64,1); }
@keyframes particle { 0% { opacity:1; transform: translate(0,0) scale(1);} 100% { opacity:0; transform: translate(var(--tx),var(--ty)) scale(0);} }
.particle { position:absolute; pointer-events:none; animation: particle .6s ease-out forwards; }
@keyframes fabPop { 0%{transform:scale(.6);opacity:0;} 60%{transform:scale(1.08);} 100%{transform:scale(1);opacity:1;} }
.fab { animation: fabPop .28s cubic-bezier(.34,1.56,.64,1) both; }
@keyframes modalFadeIn { from { opacity:0; transform: scale(.97);} to { opacity:1; transform:none; } }
.modal-animate { animation: modalFadeIn .22s cubic-bezier(.32,.72,0,1) both; }
@keyframes fadeIn { from { opacity:0;} to { opacity:1;} }
.page-fade { animation: fadeIn .25s ease; }
@keyframes slideIn { from { transform: translateX(24px); opacity:.4; } to { transform:none; opacity:1; } }
.detail-slide { animation: slideIn .24s cubic-bezier(.32,.72,0,1) both; }
button:active { transform: scale(.97); }
input, textarea, select { font-family: inherit; }
.line-clamp-1 { display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
@media (prefers-reduced-motion: reduce){ *{ animation:none !important; } }
`;

function BoardIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="11" rx="1" />
    </svg>
  );
}

function Particles({ x, y }) {
  const parts = Array.from({ length: 8 }, (_, i) => ({ id: i, angle: (i / 8) * Math.PI * 2, dist: 55 + Math.random() * 35 }));
  const colors = ['#D6492F', '#D98E2B', '#3F8F6F', '#3E7CB8', '#8B5FBF'];
  return <>{parts.map((p) => <div key={p.id} className="particle" style={{ left: x, top: y, width: 7, height: 7, borderRadius: '50%', background: colors[p.id % colors.length], '--tx': `${Math.cos(p.angle) * p.dist}px`, '--ty': `${Math.sin(p.angle) * p.dist - 20}px` }} />)}</>;
}

export default function App({ user }) {
  const [initial, setInitial] = useState(null);
  useEffect(() => { loadState().then(setInitial); }, []);
  if (!initial) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5', color: '#9C9589', fontFamily: 'Inter, sans-serif' }}>Loading…</div>;
  return (
    <StoreProvider initial={initial}>
      <DeleteConfirmProvider>
        <ThemedShell user={user} />
      </DeleteConfirmProvider>
    </StoreProvider>
  );
}

function ThemedShell({ user }) {
  const { state } = useStore();
  const mode = state.settings.themeMode;
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', h); return () => mq.removeEventListener('change', h);
  }, []);
  const isDark = mode === 'system' ? systemDark : mode === 'dark';
  const theme = useMemo(() => buildTheme(mode, isDark, state.settings.accent), [mode, isDark, state.settings.accent]);
  useEffect(() => { document.body.style.background = theme.bg; }, [theme]);
  return (
    <ThemeProvider theme={theme}>
      <style>{PAGE_STYLE}</style>
      <AppShell isDark={isDark} user={user} />
    </ThemeProvider>
  );
}

function AppShell({ isDark, user }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 900);
  const [view, setView] = useState(state.settings.startView || 'today');
  const [sheet, setSheet] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommand, setShowCommand] = useState(false);
  const [focusTask, setFocusTask] = useState(null);
  const [celebrations, setCelebrations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    const byProject = {}, byLabel = {};
    state.tasks.forEach((t) => {
      if (t.parentId || t.completed) return;
      byProject[t.projectId] = (byProject[t.projectId] || 0) + 1;
      (t.labels || []).forEach((l) => { byLabel[l] = (byLabel[l] || 0) + 1; });
    });
    const today = state.tasks.filter((t) => !t.parentId && !t.completed && (t.dueDate === todayStr() || isOverdue(t))).length;
    return { byProject, byLabel, today };
  }, [state.tasks]);

  const toggle = useCallback((task, e) => {
    dispatch({ type: 'TOGGLE_COMPLETE', id: task.id });
    if (e && !task.completed) {
      const r = e.currentTarget.getBoundingClientRect();
      const id = Date.now() + Math.random();
      setCelebrations((p) => [...p, { id, x: r.left, y: r.top }]);
      setTimeout(() => setCelebrations((p) => p.filter((c) => c.id !== id)), 650);
      if (state.settings.soundEnabled) beep();
    }
  }, [dispatch, state.settings.soundEnabled]);

  const openQuickAdd = useCallback((opts = {}) => setSheet({
    mode: 'new',
    initialProjectId: opts.projectId || (view.startsWith('project:') ? view.slice(8) : 'inbox'),
    initialSectionId: opts.sectionId || null,
    initialDate: opts.date || (view === 'today' ? todayStr() : undefined),
    initialTime: opts.time || undefined,
    initialDuration: opts.duration || undefined,
  }), [view]);
  const addSubtask = useCallback((task) => setSheet({ mode: 'subtask', parentId: task.id, lockedProjectId: task.projectId }), []);
  const requestDelete = useRequestDelete();
  const deleteTask = useCallback((task) => {
    const countDescendants = (id) => state.tasks.filter((t) => t.parentId === id).reduce((sum, t) => sum + 1 + countDescendants(t.id), 0);
    requestDelete('task', task.id, task.content, countDescendants(task.id));
  }, [state.tasks, requestDelete]);
  const openDetail = useCallback((task) => setDetailId(task.id), []);

  const handlers = { onOpen: openDetail, onToggle: toggle, onAddSubtask: addSubtask, onDelete: deleteTask, onFocus: setFocusTask, onAddInSection: (sectionId) => openQuickAdd({ sectionId }), onAddForDate: (date) => openQuickAdd({ date }), onCreateAt: (date, time, duration) => openQuickAdd({ date, time, duration }) };

  function onSheetSubmit(data) {
    if (sheet.mode === 'edit') dispatch({ type: 'UPDATE_TASK', id: sheet.seed.id, patch: data });
    else if (sheet.mode === 'subtask') dispatch({ type: 'ADD_TASK', payload: { ...data, parentId: sheet.parentId } });
    else dispatch({ type: 'ADD_TASK', payload: data });
    (data.labels || []).forEach((l) => { if (!state.labels.some((x) => x.name === l)) dispatch({ type: 'ADD_LABEL', name: l }); });
  }

  const shortcuts = useMemo(() => ({ ...defaultShortcutMap(), ...(state.settings.shortcuts || {}) }), [state.settings.shortcuts]);
  const themeToggle = useCallback(() => dispatch({ type: 'UPDATE_SETTINGS', patch: { themeMode: isDark ? 'light' : 'dark' } }), [dispatch, isDark]);

  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      const combo = eventToCombo(e);
      if (combo === shortcuts.commandMenu) { e.preventDefault(); setShowCommand((v) => !v); return; }
      if (combo === 'escape' && showSettings) { setShowSettings(false); return; }
      if (typing || sheet || showSettings || showCommand) return;

      if (combo === shortcuts.quickAdd) { e.preventDefault(); openQuickAdd(); return; }
      if (combo === shortcuts.goToday) { setView('today'); return; }
      if (combo === shortcuts.goUpcoming) { setView('upcoming'); return; }
      if (combo === shortcuts.goInbox) { setView('project:inbox'); return; }
      if (combo === shortcuts.goCalendar) { setView('calendar'); return; }
      if (combo === shortcuts.goSearch) { e.preventDefault(); setView('search'); return; }
      if (combo === shortcuts.goFiltersLabels) { setView('filters-labels'); return; }
      if (combo === shortcuts.goProductivity) { setView('productivity'); return; }
      if (combo === shortcuts.goCompleted) { setView('completed'); return; }
      if (combo === shortcuts.openSettings) { setShowSettings(true); return; }
      if (combo === shortcuts.toggleTheme) { themeToggle(); return; }
      if (combo === shortcuts.closeOverlay && detailId) { setDetailId(null); return; }

      const custom = (state.settings.customShortcuts || []).find((c) => c.key === combo);
      if (custom) { setView(`${custom.targetType}:${custom.targetId}`); return; }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, showSettings, showCommand, detailId, openQuickAdd, shortcuts, state.settings.customShortcuts, themeToggle]);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
    const fired = new Set();
    const iv = setInterval(() => {
      if (Notification.permission !== 'granted') return;
      const now = Date.now();
      state.tasks.forEach((t) => {
        if (t.completed || !(t.reminders || []).length) return;
        t.reminders.forEach((r) => {
          const at = reminderFireTime(r, t);
          if (at == null) return;
          const key = `${t.id}-${r.id}`;
          if (!fired.has(key) && now >= at && now < at + 60000) {
            fired.add(key);
            try { new Notification(t.content, { body: reminderLabel(r) }); } catch { /* */ }
          }
        });
      });
    }, 30000);
    return () => clearInterval(iv);
  }, [state.tasks]);

  return (
    <div className="flex h-screen w-full relative" style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: 'Inter, sans-serif' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeView={view} setView={setView} counts={counts}
        onOpenSettings={() => setShowSettings(true)} onQuickAdd={() => openQuickAdd()} />

      <MainContent view={view} setView={setView} handlers={handlers} counts={counts} searchQuery={searchQuery} setSearchQuery={setSearchQuery} weekStart={state.settings.weekStart} />

      {!sheet && (
        <button onClick={() => openQuickAdd()} className="fab fixed flex items-center justify-center rounded-full shadow-lg" style={{ right: 24, bottom: 24, width: 54, height: 54, backgroundColor: theme.accent, color: theme.accentText, boxShadow: `0 6px 20px ${theme.accent}66` }} aria-label="Add task">
          <Plus size={26} />
        </button>)}

      {sheet && <TaskSheet key={sheet.seed?.id || sheet.mode + (sheet.parentId || '')} {...sheet} onSubmit={onSheetSubmit} onClose={() => setSheet(null)} />}
      {detailId && <TaskDetail taskId={detailId} onClose={() => setDetailId(null)} onToggle={toggle} onOpen={openDetail} onAddSubtask={addSubtask} onFocus={setFocusTask} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} user={user} />}
      {showCommand && <CommandMenu onClose={() => setShowCommand(false)} setView={setView} onQuickAdd={() => openQuickAdd()} onOpenSettings={() => setShowSettings(true)} onToggleTheme={themeToggle} />}
      {focusTask && <FocusTimer task={focusTask} onClose={() => setFocusTask(null)} />}

      {celebrations.map((c) => <div key={c.id} style={{ position: 'fixed', pointerEvents: 'none', zIndex: 60 }}><Particles x={c.x} y={c.y} /></div>)}
    </div>
  );
}

function MainContent({ view, setView, handlers, counts, searchQuery, setSearchQuery, weekStart }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const [showCompleted, setShowCompleted] = useState(state.settings.showCompleted);

  let title = '', subtitle = '', body = null, headerRight = null, wide = false;
  const viewSortKey = state.settings.viewSort?.[view] || 'smart';
  const setViewSort = (key) => dispatch({ type: 'UPDATE_SETTINGS', patch: { viewSort: { ...state.settings.viewSort, [view]: key } } });

  if (view === 'today') {
    title = 'Today';
    subtitle = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const flat = sortTasks(state.tasks.filter((t) => !t.parentId && (t.dueDate === todayStr() || isOverdue(t))), viewSortKey);
    const todayAll = state.tasks.filter((t) => !t.parentId && t.dueDate === todayStr());
    headerRight = <div className="flex items-center gap-2"><SortMenu value={viewSortKey} onChange={setViewSort} /><ProgressRing completed={todayAll.filter((t) => t.completed).length} total={todayAll.length} /><span className="text-xs" style={{ color: theme.textMuted }}>{todayAll.filter((t) => t.completed).length}/{todayAll.length}</span></div>;
    body = <TaskList tasks={flat.filter((t) => showCompleted || !t.completed)} emptyMsg="Nothing due today. Enjoy the calm — or add something." {...handlers} />;
  } else if (view === 'upcoming') { title = 'Upcoming'; body = <UpcomingView handlers={handlers} />; }
  else if (view === 'productivity') { title = 'Productivity'; body = <ProductivityView />; }
  else if (view === 'calendar') { title = 'Calendar'; wide = true; body = <CalendarView handlers={handlers} />; }
  else if (view === 'completed') { title = 'Completed'; body = <CompletedView handlers={handlers} />; }
  else if (view === 'filters-labels') { title = 'Filters & Labels'; body = <FiltersLabelsOverview setView={setView} />; }
  else if (view === 'search') {
    title = 'Search';
    const q = searchQuery.trim().toLowerCase();
    const results = q ? sortTasks(state.tasks.filter((t) => !t.parentId && (t.content.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q) || (t.labels || []).some((l) => l.toLowerCase().includes(q)))), viewSortKey) : [];
    body = (
      <div>
        <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks, descriptions, labels…" className="w-full text-sm px-4 py-2.5 rounded-lg border outline-none mb-4" style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }} />
        {q ? <TaskList tasks={results} emptyMsg={`No tasks match "${searchQuery}".`} {...handlers} /> : <p className="text-sm" style={{ color: theme.textLighter }}>Type to search across every task.</p>}
      </div>);
  } else if (view.startsWith('project:')) {
    const pid = view.slice(8);
    const project = state.projects.find((p) => p.id === pid);
    if (!project) { title = 'Not found'; body = <p style={{ color: theme.textLighter }}>Project not found.</p>; }
    else {
      title = project.name;
      const layout = project.viewType || 'list';
      wide = layout === 'board';
      const setProjectSort = (key) => dispatch({ type: 'UPDATE_PROJECT', id: pid, patch: { sortBy: key } });
      headerRight = <div className="flex items-center gap-2">{layout === 'list' && <SortMenu value={project.sortBy || 'manual'} onChange={setProjectSort} />}<LayoutSwitcher project={project} /></div>;
      if (layout === 'board') body = <BoardLayout projectId={pid} handlers={handlers} />;
      else if (layout === 'calendar') body = <CalendarLayout filterFn={(t) => t.projectId === pid} handlers={handlers} weekStart={weekStart} projectId={pid} calendarMode={project.calendarMode || 'month'} />;
      else body = <ListLayout projectId={pid} handlers={handlers} sortKey={project.sortBy || 'manual'} />;
      if (pid === 'inbox' && state.settings.inboxShowsAll) {
        const listBody = body;
        body = <>{listBody}<InboxExtras handlers={handlers} /></>;
      }
    }
  } else if (view.startsWith('filter:')) {
    const f = state.filters.find((x) => x.id === view.slice(7));
    title = f?.name || 'Filter'; body = f ? <FilterView filter={f} handlers={handlers} /> : null;
  } else if (view.startsWith('label:')) {
    const l = state.labels.find((x) => x.id === view.slice(6));
    title = l ? `@${l.name}` : 'Label'; body = l ? <LabelView label={l} handlers={handlers} /> : null;
  }

  const isFlatListView = view === 'today' || view.startsWith('label:');

  return (
    <main className="flex-1 overflow-y-auto page-fade" key={view}>
      <header className="flex items-center justify-between px-8 pt-8 pb-2 sticky top-0 z-10" style={{ backgroundColor: theme.bg }}>
        <div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 27, color: theme.text }}>{title}</h2>
          {subtitle && <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>{subtitle}</p>}
        </div>
        {headerRight}
      </header>
      <div className="px-8 pb-28" style={{ maxWidth: wide ? '100%' : 760 }}>
        {isFlatListView && (
          <button onClick={() => setShowCompleted((s) => !s)} className="text-xs mb-3 flex items-center gap-1" style={{ color: theme.textLight }}>
            <CheckCircle size={13} />{showCompleted ? 'Hide completed' : 'Show completed'}
          </button>)}
        {body}
      </div>
    </main>
  );
}

function SortMenu({ value, onChange }) {
  const theme = useTheme();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} title="Sort by" className="text-xs px-2 py-1.5 rounded-lg border outline-none" style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.textMuted }}>
      {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}

function LayoutSwitcher({ project }) {
  const theme = useTheme();
  const { dispatch } = useStore();
  const opts = [['list', <LayoutList size={16} />], ['board', <BoardIcon size={16} />], ['calendar', <CalIcon size={16} />]];
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: theme.surface }}>
      {opts.map(([v, ic]) => (
        <button key={v} onClick={() => dispatch({ type: 'UPDATE_PROJECT', id: project.id, patch: { viewType: v } })} title={v} className="p-1.5 rounded-md" style={{ backgroundColor: (project.viewType || 'list') === v ? theme.bgAlt : 'transparent', color: (project.viewType || 'list') === v ? theme.accent : theme.textMuted }}>{ic}</button>
      ))}
    </div>
  );
}

// A bright, quick two-note ascending chime (loosely inspired by the crisp
// "confirmation" dings iOS/macOS use for completed purchases — a soft bell
// timbre, not a flat alarm-like beep) played on task completion.
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [
      { freq: 1046.5, start: 0, dur: 0.16 }, // C6
      { freq: 1568.0, start: 0.08, dur: 0.22 }, // G6
    ];
    notes.forEach(({ freq, start, dur }) => {
      const t0 = ctx.currentTime + start;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.09, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      // sine + soft triangle layer for a rounder, bell-like timbre
      const sine = ctx.createOscillator();
      sine.type = 'sine'; sine.frequency.value = freq;
      sine.connect(gain);
      const tri = ctx.createOscillator();
      tri.type = 'triangle'; tri.frequency.value = freq * 2;
      const triGain = ctx.createGain(); triGain.gain.value = 0.18;
      tri.connect(triGain); triGain.connect(gain);
      sine.start(t0); sine.stop(t0 + dur);
      tri.start(t0); tri.stop(t0 + dur);
    });
    setTimeout(() => ctx.close(), 500);
  } catch { /* */ }
}

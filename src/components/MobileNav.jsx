import React from 'react';
import { CalendarDays, CalendarClock, Search, Menu, Plus } from 'lucide-react';
import { useTheme } from '../theme';

/* Todoist-style bottom tab bar for phones (hidden ≥ md). Four destinations plus
   a raised center Add button. "Browse" opens the full nav drawer (the Sidebar),
   which holds everything else: Inbox, Calendar, Filters & Labels, Productivity,
   projects, labels, filters and Settings. */
export default function MobileNav({ view, setView, onQuickAdd, onBrowse }) {
  const theme = useTheme();

  const Tab = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
      style={{ color: active ? theme.accent : theme.textLight }}>
      {icon}
      <span style={{ fontSize: 10, fontWeight: active ? 600 : 500 }}>{label}</span>
    </button>
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
      style={{ height: 58, backgroundColor: theme.bgAlt, borderTop: `1px solid ${theme.border}`, paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: `0 -4px 16px ${theme.shadow}` }}>
      <Tab icon={<CalendarDays size={21} />} label="Today" active={view === 'today'} onClick={() => setView('today')} />
      <Tab icon={<CalendarClock size={21} />} label="Upcoming" active={view === 'upcoming'} onClick={() => setView('upcoming')} />

      <div className="flex-1 flex items-start justify-center">
        <button onClick={onQuickAdd} aria-label="Add task"
          className="flex items-center justify-center rounded-full"
          style={{ width: 52, height: 52, marginTop: -18, backgroundColor: theme.accent, color: theme.accentText, boxShadow: `0 6px 18px ${theme.accent}66`, border: `3px solid ${theme.bgAlt}` }}>
          <Plus size={26} />
        </button>
      </div>

      <Tab icon={<Search size={21} />} label="Search" active={view === 'search'} onClick={() => setView('search')} />
      <Tab icon={<Menu size={21} />} label="Browse" active={false} onClick={onBrowse} />
    </nav>
  );
}

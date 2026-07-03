import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, CalendarDays, CalendarClock, Inbox, Plus, Settings, TrendingUp, Tag, Filter, CheckCircle, Sun, Moon,
} from 'lucide-react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';

export default function CommandMenu({ onClose, setView, onQuickAdd, onOpenSettings, onToggleTheme }) {
  const theme = useTheme();
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 40); }, []);

  const commands = useMemo(() => {
    const base = [
      { id: 'add', label: 'Add task', icon: <Plus size={16} />, kind: 'Action', run: () => { onClose(); onQuickAdd(); } },
      { id: 'today', label: 'Go to Today', icon: <CalendarDays size={16} />, kind: 'Navigate', run: () => { setView('today'); onClose(); } },
      { id: 'upcoming', label: 'Go to Upcoming', icon: <CalendarClock size={16} />, kind: 'Navigate', run: () => { setView('upcoming'); onClose(); } },
      { id: 'inbox', label: 'Go to Inbox', icon: <Inbox size={16} />, kind: 'Navigate', run: () => { setView('project:inbox'); onClose(); } },
      { id: 'completed', label: 'View Completed', icon: <CheckCircle size={16} />, kind: 'Navigate', run: () => { setView('completed'); onClose(); } },
      { id: 'productivity', label: 'Productivity & Karma', icon: <TrendingUp size={16} />, kind: 'Navigate', run: () => { setView('productivity'); onClose(); } },
      { id: 'search', label: 'Search tasks', icon: <Search size={16} />, kind: 'Navigate', run: () => { setView('search'); onClose(); } },
      { id: 'settings', label: 'Open Settings', icon: <Settings size={16} />, kind: 'Action', run: () => { onClose(); onOpenSettings(); } },
      { id: 'theme', label: 'Toggle dark / light', icon: theme.dark ? <Sun size={16} /> : <Moon size={16} />, kind: 'Action', run: () => { onToggleTheme(); onClose(); } },
    ];
    const projs = state.projects.filter((p) => !p.isDefault).map((p) => ({ id: `p-${p.id}`, label: p.name, icon: <span className="rounded-full" style={{ width: 10, height: 10, backgroundColor: p.color }} />, kind: 'Project', run: () => { setView(`project:${p.id}`); onClose(); } }));
    const labs = state.labels.map((l) => ({ id: `l-${l.id}`, label: `@${l.name}`, icon: <Tag size={15} style={{ color: l.color }} />, kind: 'Label', run: () => { setView(`label:${l.id}`); onClose(); } }));
    const fils = state.filters.map((f) => ({ id: `f-${f.id}`, label: f.name, icon: <Filter size={15} style={{ color: f.color }} />, kind: 'Filter', run: () => { setView(`filter:${f.id}`); onClose(); } }));
    return [...base, ...projs, ...labs, ...fils];
  }, [state, theme]); // eslint-disable-line

  const filtered = useMemo(() => {
    if (!q.trim()) return commands;
    const n = q.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(n) || c.kind.toLowerCase().includes(n));
  }, [q, commands]);

  useEffect(() => { setIdx(0); }, [q]);

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[idx]?.run(); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ paddingTop: '14vh' }} onMouseDown={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: theme.overlay, animation: 'fadeIn .15s ease' }} />
      <div className="relative rounded-xl shadow-2xl modal-animate overflow-hidden" style={{ width: '92%', maxWidth: 560, backgroundColor: theme.bgElevated, border: `1px solid ${theme.border}` }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: theme.border }}>
          <Search size={18} style={{ color: theme.textLight }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Type a command or search…" className="flex-1 outline-none bg-transparent text-sm" style={{ color: theme.text }} />
          <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.surface, color: theme.textLight }}>esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.map((c, i) => (
            <button key={c.id} onMouseEnter={() => setIdx(i)} onClick={() => c.run()} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left" style={{ backgroundColor: i === idx ? theme.hover : 'transparent', color: theme.text }}>
              <span style={{ color: theme.textMuted, display: 'flex' }}>{c.icon}</span>
              <span className="flex-1">{c.label}</span>
              <span className="text-xs" style={{ color: theme.textLighter }}>{c.kind}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-sm px-4 py-6 text-center" style={{ color: theme.textLighter }}>No results</p>}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  Search, CalendarDays, CalendarClock, Inbox, Plus, ChevronDown, ChevronRight, ChevronsLeft,
  Menu, Settings, Tag, Filter, Star, Trash2, TrendingUp, CalendarRange,
} from 'lucide-react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';
import { useRequestDelete } from '../state/deleteConfirm';
import { levelFor } from '../lib/karma';
import { ColorPicker, PROJECT_COLORS } from './shared';
import FilterBuilder from './FilterBuilder';

export default function Sidebar({ collapsed: collapsedProp, setCollapsed, activeView, setView, counts, onOpenSettings, onQuickAdd, mobileOpen, onMobileClose }) {
  const theme = useTheme();
  // The mobile drawer always shows the full nav — the desktop icon-rail
  // "collapsed" preference doesn't apply once it's an overlay.
  const collapsed = mobileOpen ? false : collapsedProp;
  const { state, dispatch } = useStore();
  const requestDelete = useRequestDelete();
  const [showAddProject, setShowAddProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [openSections, setOpenSections] = useState({ favorites: true, projects: true, labels: true, filters: true });
  const [addKind, setAddKind] = useState(null); // 'label' | 'filter'
  const [labelName, setLabelName] = useState('');
  const [filterName, setFilterName] = useState(''); const [filterQuery, setFilterQuery] = useState('');

  const topProjects = state.projects.filter((p) => !p.isDefault && !p.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
  const childrenOf = (id) => state.projects.filter((p) => p.parentId === id).sort((a, b) => (a.order || 0) - (b.order || 0));
  const favorites = [
    ...state.projects.filter((p) => p.isFavorite).map((p) => ({ ...p, _kind: 'project' })),
    ...state.labels.filter((l) => l.isFavorite).map((l) => ({ ...l, _kind: 'label' })),
    ...state.filters.filter((f) => f.isFavorite).map((f) => ({ ...f, _kind: 'filter' })),
  ];
  const karma = levelFor(state.productivity.karma || 0);
  // On mobile the sidebar renders as an overlay drawer; any navigation should
  // close it automatically so the user lands on the content, not behind it.
  const goto = (v) => { setView(v); if (window.innerWidth < 768) onMobileClose?.(); };

  function addProject() {
    if (!newName.trim()) return;
    dispatch({ type: 'ADD_PROJECT', payload: { name: newName.trim(), color: newColor } });
    setNewName(''); setNewColor(PROJECT_COLORS[0]); setShowAddProject(false);
  }

  const NavItem = ({ icon, label, view, count, badge }) => {
    const active = activeView === view;
    return (
      <button onClick={() => goto(view)} title={collapsed ? label : undefined} className="w-full flex items-center rounded-lg text-sm transition-colors"
        style={{ padding: '7px 8px', justifyContent: collapsed ? 'center' : 'space-between', backgroundColor: active ? theme.accentLight : 'transparent', color: active ? theme.accent : theme.text }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = theme.hover; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}>
        <span className="flex items-center gap-2.5 min-w-0">{icon}{!collapsed && <span className="truncate">{label}</span>}</span>
        {!collapsed && count > 0 && <span className="text-xs" style={{ color: active ? theme.accent : theme.textLight }}>{count}</span>}
        {!collapsed && badge}
      </button>
    );
  };

  const SectionHeader = ({ id, label, onAdd }) => (
    <div className="flex items-center justify-between pr-2 group/sh" style={{ paddingLeft: 8 }}>
      <button onClick={() => setOpenSections((s) => ({ ...s, [id]: !s[id] }))} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide py-1" style={{ color: theme.textLight }}>
        {openSections[id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}{label}
      </button>
      {onAdd && <button onClick={onAdd} className="opacity-0 group-hover/sh:opacity-100 p-0.5 rounded" style={{ color: theme.textLight }}><Plus size={13} /></button>}
    </div>
  );

  function ProjectRow({ p, depth }) {
    const kids = childrenOf(p.id);
    const active = activeView === `project:${p.id}`;
    const [open, setOpen] = useState(true);
    return (
      <>
        <div onClick={() => goto(`project:${p.id}`)} className="group/pr flex items-center justify-between rounded-lg cursor-pointer transition-colors"
          style={{ padding: '6px 8px', paddingLeft: 8 + depth * 14, backgroundColor: active ? theme.accentLight : 'transparent' }}
          onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = theme.hover; }}
          onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}>
          <span className="flex items-center gap-2 text-sm min-w-0">
            {kids.length > 0 ? <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} style={{ color: theme.textLight }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</button> : <span style={{ width: 12 }} />}
            <span className="flex-shrink-0 rounded-full" style={{ width: 9, height: 9, backgroundColor: p.color }} />
            <span className="truncate" style={{ color: active ? theme.accent : theme.text }}>{p.name}</span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs group-hover/pr:hidden" style={{ color: theme.textLight }}>{counts.byProject[p.id] || ''}</span>
            <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_PROJECT', id: p.id, patch: { isFavorite: !p.isFavorite } }); }} className="hidden group-hover/pr:block p-0.5" style={{ color: p.isFavorite ? theme.accent : theme.textLight }}><Star size={12} fill={p.isFavorite ? theme.accent : 'none'} /></button>
            <button onClick={(e) => { e.stopPropagation(); const count = state.sections.filter((s) => s.projectId === p.id).length + state.tasks.filter((t) => t.projectId === p.id).length; requestDelete('project', p.id, p.name, count); }} className="hidden group-hover/pr:block p-0.5" style={{ color: theme.textLight }}><Trash2 size={12} /></button>
          </span>
        </div>
        {open && kids.map((k) => <ProjectRow key={k.id} p={k} depth={depth + 1} />)}
      </>
    );
  }

  const inputStyle = { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text };

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 md:hidden" style={{ backgroundColor: theme.overlay }} onClick={onMobileClose} />}
      <aside className={`h-full flex flex-col border-r flex-shrink-0 ${mobileOpen ? 'fixed inset-y-0 left-0 z-40 shadow-2xl' : 'hidden md:flex'}`} style={{ width: collapsed ? 60 : 264, borderColor: theme.border, backgroundColor: theme.bgAlt, transition: 'width .18s ease' }}>
      <div className="flex items-center justify-between pt-4 pb-2" style={{ paddingLeft: collapsed ? 0 : 16, paddingRight: 8 }}>
        {!collapsed && <h1 style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 21, color: theme.text }}>Punctual</h1>}
        <button onClick={() => setCollapsed((c) => !c)} className="p-1.5 rounded-lg hidden md:inline-flex" style={{ margin: collapsed ? '0 auto' : 0, color: theme.textMuted }}>{collapsed ? <Menu size={18} /> : <ChevronsLeft size={18} />}</button>
        <button onClick={onMobileClose} className="p-1.5 rounded-lg md:hidden" style={{ color: theme.textMuted }} aria-label="Close menu"><ChevronsLeft size={18} /></button>
      </div>

      <div className="px-2.5 flex flex-col gap-0.5">
        {!collapsed && (
          <button onClick={onQuickAdd} className="w-full flex items-center gap-2 rounded-lg text-sm font-medium mb-1" style={{ padding: '7px 8px', color: theme.accent }}>
            <span className="flex items-center justify-center rounded-full" style={{ width: 20, height: 20, backgroundColor: theme.accent, color: theme.accentText }}><Plus size={15} /></span> Add task
          </button>)}
        <NavItem icon={<Search size={17} />} label="Search" view="search" />
        <NavItem icon={<CalendarDays size={17} />} label="Today" view="today" count={counts.today} />
        <NavItem icon={<CalendarClock size={17} />} label="Upcoming" view="upcoming" />
        <NavItem icon={<CalendarRange size={17} />} label="Calendar" view="calendar" />
        <NavItem icon={<Filter size={17} />} label="Filters & Labels" view="filters-labels" />
        <NavItem icon={<Inbox size={17} />} label="Inbox" view="project:inbox" count={counts.byProject.inbox} />
        <NavItem icon={<TrendingUp size={17} />} label="Productivity" view="productivity" />
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto mt-3 pb-4">
          {/* favorites */}
          {favorites.length > 0 && (
            <div className="px-2.5">
              <SectionHeader id="favorites" label="Favorites" />
              {openSections.favorites && favorites.map((f) => (
                <button key={`${f._kind}-${f.id}`} onClick={() => goto(f._kind === 'project' ? `project:${f.id}` : f._kind === 'label' ? `label:${f.id}` : `filter:${f.id}`)} className="w-full flex items-center gap-2 rounded-lg text-sm" style={{ padding: '6px 8px', color: theme.text }}>
                  {f._kind === 'project' ? <span className="rounded-full" style={{ width: 9, height: 9, backgroundColor: f.color }} /> : f._kind === 'label' ? <Tag size={13} style={{ color: f.color }} /> : <Filter size={13} style={{ color: f.color }} />}
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* projects */}
          <div className="px-2.5 mt-2">
            <SectionHeader id="projects" label="Projects" onAdd={() => setShowAddProject((s) => !s)} />
            {showAddProject && (
              <div className="px-1 pb-2">
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name" onKeyDown={(e) => { if (e.key === 'Enter') addProject(); if (e.key === 'Escape') setShowAddProject(false); }} className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-2" style={inputStyle} />
                <div className="mb-2"><ColorPicker value={newColor} onChange={setNewColor} /></div>
                <div className="flex gap-2"><button onClick={addProject} className="text-xs font-medium px-3 py-1.5 rounded-md" style={{ backgroundColor: theme.accent, color: theme.accentText }}>Add</button><button onClick={() => setShowAddProject(false)} className="text-xs px-3 py-1.5 rounded-md" style={{ color: theme.textMuted }}>Cancel</button></div>
              </div>)}
            {openSections.projects && topProjects.map((p) => <ProjectRow key={p.id} p={p} depth={0} />)}
            {openSections.projects && topProjects.length === 0 && !showAddProject && <p className="text-xs px-2 py-1" style={{ color: theme.textLighter }}>No projects yet.</p>}
          </div>

          {/* labels */}
          <div className="px-2.5 mt-2">
            <SectionHeader id="labels" label="Labels" onAdd={() => setAddKind(addKind === 'label' ? null : 'label')} />
            {addKind === 'label' && (
              <div className="px-1 pb-2 flex gap-1">
                <input autoFocus value={labelName} onChange={(e) => setLabelName(e.target.value)} placeholder="Label name" onKeyDown={(e) => { if (e.key === 'Enter' && labelName.trim()) { dispatch({ type: 'ADD_LABEL', name: labelName.trim() }); setLabelName(''); setAddKind(null); } }} className="flex-1 text-sm px-2 py-1.5 rounded-lg border outline-none" style={inputStyle} />
              </div>)}
            {openSections.labels && state.labels.map((l) => {
              const active = activeView === `label:${l.id}`;
              return (
                <div key={l.id} onClick={() => goto(`label:${l.id}`)} className="group/lb flex items-center justify-between rounded-lg cursor-pointer" style={{ padding: '6px 8px', backgroundColor: active ? theme.accentLight : 'transparent' }}>
                  <span className="flex items-center gap-2 text-sm min-w-0"><Tag size={13} style={{ color: l.color }} /><span className="truncate" style={{ color: active ? theme.accent : theme.text }}>{l.name}</span></span>
                  <span className="flex items-center gap-1"><span className="text-xs group-hover/lb:hidden" style={{ color: theme.textLight }}>{counts.byLabel[l.name] || ''}</span>
                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_LABEL', id: l.id, patch: { isFavorite: !l.isFavorite } }); }} className="hidden group-hover/lb:block p-0.5" style={{ color: l.isFavorite ? theme.accent : theme.textLight }}><Star size={12} fill={l.isFavorite ? theme.accent : 'none'} /></button>
                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_LABEL', id: l.id }); }} className="hidden group-hover/lb:block p-0.5" style={{ color: theme.textLight }}><Trash2 size={12} /></button>
                  </span>
                </div>);
            })}
            {openSections.labels && state.labels.length === 0 && addKind !== 'label' && <p className="text-xs px-2 py-1" style={{ color: theme.textLighter }}>No labels yet.</p>}
          </div>

          {/* filters */}
          <div className="px-2.5 mt-2">
            <SectionHeader id="filters" label="Filters" onAdd={() => setAddKind(addKind === 'filter' ? null : 'filter')} />
            {addKind === 'filter' && (
              <div className="px-1 pb-2 space-y-1.5">
                <input autoFocus value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder="Filter name" className="w-full text-sm px-2 py-1.5 rounded-lg border outline-none" style={inputStyle} />
                {state.settings.filterBuilderMode === 'text' ? (
                  <input value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} placeholder="Query e.g. today & p1" className="w-full text-sm px-2 py-1.5 rounded-lg border outline-none" style={inputStyle} />
                ) : (
                  <FilterBuilder query={filterQuery} onChange={setFilterQuery} />
                )}
                <button onClick={() => { if (filterName.trim() && filterQuery.trim()) { dispatch({ type: 'ADD_FILTER', payload: { name: filterName.trim(), query: filterQuery.trim() } }); setFilterName(''); setFilterQuery(''); setAddKind(null); } }} className="text-xs font-medium px-3 py-1.5 rounded-md" style={{ backgroundColor: theme.accent, color: theme.accentText }}>Save filter</button>
              </div>)}
            {openSections.filters && state.filters.map((f) => {
              const active = activeView === `filter:${f.id}`;
              return (
                <div key={f.id} onClick={() => goto(`filter:${f.id}`)} className="group/ft flex items-center justify-between rounded-lg cursor-pointer" style={{ padding: '6px 8px', backgroundColor: active ? theme.accentLight : 'transparent' }}>
                  <span className="flex items-center gap-2 text-sm min-w-0"><Filter size={13} style={{ color: f.color }} /><span className="truncate" style={{ color: active ? theme.accent : theme.text }}>{f.name}</span></span>
                  <span className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_FILTER', id: f.id, patch: { isFavorite: !f.isFavorite } }); }} className="hidden group-hover/ft:block p-0.5" style={{ color: f.isFavorite ? theme.accent : theme.textLight }}><Star size={12} fill={f.isFavorite ? theme.accent : 'none'} /></button>
                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_FILTER', id: f.id }); }} className="hidden group-hover/ft:block p-0.5" style={{ color: theme.textLight }}><Trash2 size={12} /></button>
                  </span>
                </div>);
            })}
          </div>
        </div>
      )}

      {/* footer */}
      <div className="border-t px-2.5 py-2.5 flex items-center justify-between gap-2" style={{ borderColor: theme.border }}>
        <button onClick={() => { onOpenSettings(); if (window.innerWidth < 768) onMobileClose?.(); }} className="flex items-center gap-2 rounded-lg text-sm" style={{ padding: '6px 8px', color: theme.textMuted }} title="Settings">
          <Settings size={17} />{!collapsed && 'Settings'}
        </button>
        {!collapsed && (
          <button onClick={() => goto('productivity')} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: theme.accentLight, color: theme.accent }} title={`${state.productivity.karma} karma · ${karma.level.name}`}>
            <TrendingUp size={13} />{state.productivity.karma}
          </button>)}
      </div>
    </aside>
    </>
  );
}

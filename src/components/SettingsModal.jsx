import React, { useState, useRef } from 'react';
import { X, Download, Upload, Trash, Palette, SlidersHorizontal, Database, HelpCircle, Zap, Plus, Keyboard, RotateCcw, AlertTriangle, User, LogOut } from 'lucide-react';
import { useTheme, ACCENT_PRESETS } from '../theme';
import { useStore } from '../state/store';
import { exportState } from '../storage';
import { supabase } from '../lib/supabaseClient';
import { uid } from '../lib/dates';
import { PRIORITY_META } from '../lib/constants';
import { SHORTCUT_ACTIONS, defaultShortcutMap, eventToCombo, comboLabel } from '../lib/shortcuts';
import { Modal } from './shared';

export default function SettingsModal({ onClose, user }) {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const s = state.settings;
  const [tab, setTab] = useState('general');
  const fileRef = useRef(null);
  const set = (patch) => dispatch({ type: 'UPDATE_SETTINGS', patch });

  const tabs = [
    { id: 'general', label: 'General', icon: <SlidersHorizontal size={15} /> },
    { id: 'theme', label: 'Theme', icon: <Palette size={15} /> },
    { id: 'quickadd', label: 'Quick Add', icon: <Zap size={15} /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={15} /> },
    { id: 'data', label: 'Data', icon: <Database size={15} /> },
    { id: 'account', label: 'Account', icon: <User size={15} /> },
    { id: 'help', label: 'Help', icon: <HelpCircle size={15} /> },
  ];

  function importFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const data = JSON.parse(r.result); if (data.tasks && data.projects) dispatch({ type: 'IMPORT', payload: { ...data, version: 2 } }); } catch { alert('Invalid backup file'); } };
    r.readAsText(f);
  }

  const rowStyle = 'flex items-center justify-between py-2.5';
  const selStyle = { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text };

  return (
    <Modal onClose={onClose} maxWidth={720}>
      <div className="flex" style={{ height: '70vh' }}>
        <div className="w-44 flex-shrink-0 border-r py-3" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
          <h2 className="text-sm font-semibold px-4 pb-2" style={{ color: theme.text }}>Settings</h2>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left" style={{ backgroundColor: tab === t.id ? theme.accentLight : 'transparent', color: tab === t.id ? theme.accent : theme.text }}>{t.icon}{t.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: theme.bgAlt }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: theme.text, fontFamily: 'Fraunces, serif' }}>{tabs.find((t) => t.id === tab).label}</h3>
            <button onClick={onClose} style={{ color: theme.textLight }}><X size={20} /></button>
          </div>

          {tab === 'general' && (
            <div className="divide-y" style={{ borderColor: theme.border }}>
              <div className={rowStyle}><span className="text-sm" style={{ color: theme.text }}>Start view</span>
                <select value={s.startView} onChange={(e) => set({ startView: e.target.value })} className="text-sm px-3 py-1.5 rounded-lg border outline-none" style={selStyle}>
                  <option value="today">Today</option>
                  <option value="upcoming">Upcoming</option>
                  <optgroup label="Projects">
                    <option value="project:inbox">Inbox</option>
                    {state.projects.filter((p) => !p.isDefault).map((p) => <option key={p.id} value={`project:${p.id}`}>{p.name}</option>)}
                  </optgroup>
                  {state.filters.length > 0 && (
                    <optgroup label="Filters">
                      {state.filters.map((f) => <option key={f.id} value={`filter:${f.id}`}>{f.name}</option>)}
                    </optgroup>
                  )}
                </select></div>
              <div className={rowStyle}><span className="text-sm" style={{ color: theme.text }}>Week starts on</span>
                <select value={s.weekStart} onChange={(e) => set({ weekStart: parseInt(e.target.value, 10) })} className="text-sm px-3 py-1.5 rounded-lg border outline-none" style={selStyle}>
                  <option value={0}>Sunday</option><option value={1}>Monday</option>
                </select></div>
              <Toggle label="Show completed tasks by default" value={s.showCompleted} onChange={(v) => set({ showCompleted: v })} />
              <Toggle label="Sound effects" value={s.soundEnabled} onChange={(v) => set({ soundEnabled: v })} />
              <Toggle label="Show other projects' tasks in Inbox" value={s.inboxShowsAll} onChange={(v) => set({ inboxShowsAll: v })} />
              <div className={rowStyle}><span className="text-sm" style={{ color: theme.text }}>Filter editor</span>
                <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: theme.surface }}>
                  {[['visual', 'Visual'], ['text', 'Text']].map(([k, l]) => (
                    <button key={k} onClick={() => set({ filterBuilderMode: k })} className="text-xs px-3 py-1 rounded-md" style={{ backgroundColor: s.filterBuilderMode === k ? theme.bgAlt : 'transparent', color: s.filterBuilderMode === k ? theme.accent : theme.textMuted }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'theme' && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: theme.text }}>Appearance</p>
                <div className="flex gap-2">
                  {['light', 'dark', 'system'].map((m) => (
                    <button key={m} onClick={() => set({ themeMode: m })} className="flex-1 py-2 rounded-lg border-2 text-sm capitalize" style={{ borderColor: s.themeMode === m ? theme.accent : theme.border, backgroundColor: s.themeMode === m ? theme.accentLight : 'transparent', color: s.themeMode === m ? theme.accent : theme.textMuted }}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: theme.text }}>Accent color</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(ACCENT_PRESETS).map(([k, v]) => (
                    <button key={k} onClick={() => set({ accent: k })} title={v.label} style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: v.accent, outline: s.accent === k ? `2px solid ${theme.text}` : 'none', outlineOffset: 2 }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'quickadd' && (
            <div className="divide-y" style={{ borderColor: theme.border }}>
              <Toggle label="Auto-parse dates, priorities & labels" value={s.autoParse} onChange={(v) => set({ autoParse: v })} />
              <div className="py-3">
                <p className="text-sm font-medium mb-2" style={{ color: theme.text }}>Built-in quick-add syntax</p>
                <div className="space-y-1 text-xs" style={{ color: theme.textMuted }}>
                  {[['tomorrow, next mon, in 3 days', 'dates'], ['at 3pm / 9am', 'time'], ['for 45m / for 2h', 'duration'], ['every monday, every 2 weeks', 'recurring'], ['p1–p4', 'priority'], ['#project', 'project'], ['@label', 'label'], ['!30m / !1d', 'reminder'], ['$$', 'checkbox-less section header']].map(([syn, w]) => (
                    <div key={w} className="flex gap-2"><code style={{ backgroundColor: theme.surface, padding: '1px 5px', borderRadius: 3, minWidth: 160, display: 'inline-block' }}>{syn}</code><span>{w}</span></div>
                  ))}
                </div>
              </div>
              <div className="py-3">
                <CustomSyntaxEditor s={s} set={set} />
              </div>
            </div>
          )}

          {tab === 'data' && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg" style={{ backgroundColor: theme.surface, borderLeft: `4px solid ${theme.accent}` }}>
                <p className="text-sm" style={{ color: theme.text }}><strong>{state.tasks.length}</strong> tasks · <strong>{state.projects.length - 1}</strong> projects · <strong>{state.labels.length}</strong> labels</p>
                <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>{state.tasks.filter((t) => t.completed).length} completed · {state.productivity.karma} karma</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: theme.text }}>When deleting something with children</p>
                <p className="text-xs mb-2" style={{ color: theme.textLighter }}>Applies to tasks with sub-tasks, sections with tasks, and projects with sections/tasks.</p>
                <div className="space-y-1.5">
                  {[['ask', 'Ask me every time'], ['promote', 'Move children up one level automatically'], ['delete-all', 'Delete everything automatically (default)']].map(([k, l]) => (
                    <button key={k} onClick={() => set({ deleteBehavior: k })} className="w-full text-left text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: s.deleteBehavior === k ? theme.accentLight : theme.surface, color: s.deleteBehavior === k ? theme.accent : theme.text }}>{l}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => exportState(state)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium" style={{ backgroundColor: theme.success, color: '#fff' }}><Download size={16} /> Export backup (JSON)</button>
              <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium" style={{ backgroundColor: theme.surface, color: theme.text }}><Upload size={16} /> Import backup</button>
              <input ref={fileRef} type="file" accept="application/json" onChange={importFile} className="hidden" />
              <button onClick={() => { if (window.confirm('Delete ALL data permanently?')) { dispatch({ type: 'CLEAR_ALL' }); onClose(); } }} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium" style={{ backgroundColor: theme.accentLight, color: theme.accent }}><Trash size={16} /> Clear all data</button>
            </div>
          )}

          {tab === 'shortcuts' && <ShortcutsSettings s={s} set={set} theme={theme} state={state} dispatch={dispatch} />}

          {tab === 'account' && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg" style={{ backgroundColor: theme.surface, borderLeft: `4px solid ${theme.accent}` }}>
                <p className="text-sm" style={{ color: theme.text }}>Signed in as</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: theme.text }}>{user?.email}</p>
              </div>
              <p className="text-xs" style={{ color: theme.textLighter }}>Your tasks are synced to your account and available on any device you sign in on.</p>
              <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium" style={{ backgroundColor: theme.accentLight, color: theme.accent }}><LogOut size={16} /> Sign out</button>
            </div>
          )}

          {tab === 'help' && (
            <div className="space-y-4 text-sm" style={{ color: theme.textMuted }}>
              <p>Full list of keyboard shortcuts — and the ability to remap or add your own — lives under the <strong style={{ color: theme.text }}>Shortcuts</strong> tab.</p>
              <p className="text-xs" style={{ color: theme.textLighter }}>Punctual — a Todoist-inspired task manager. Local build (data stored in your browser).</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ───────────────────────── shortcuts settings ─────────────────────────
   Feature-rich keyboard shortcut center: every built-in action listed with
   its current binding (default or custom), re-bindable by pressing a key
   combo, with live conflict detection against every other binding —
   built-in AND custom. Plus a section to create brand-new shortcuts that
   jump straight to any project, filter, or label. */
function ShortcutsSettings({ s, set, theme, state }) {
  const [recording, setRecording] = useState(null); // actionId being recorded, or 'new-custom'
  const [search, setSearch] = useState('');
  const [conflict, setConflict] = useState(null); // {combo, ownerLabel}
  const shortcuts = { ...defaultShortcutMap(), ...(s.shortcuts || {}) };
  const custom = s.customShortcuts || [];

  function allBindings() {
    const list = SHORTCUT_ACTIONS.map((a) => ({ combo: shortcuts[a.id], owner: a.label, kind: 'action', id: a.id }));
    custom.forEach((c) => list.push({ combo: c.key, owner: c.label, kind: 'custom', id: c.id }));
    return list.filter((b) => b.combo);
  }

  function findConflict(combo, excludeId, excludeKind) {
    return allBindings().find((b) => b.combo === combo && !(b.id === excludeId && b.kind === excludeKind));
  }

  React.useEffect(() => {
    if (!recording) return;
    function onKey(e) {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape' && recording !== 'escape-target') { setRecording(null); return; }
      const combo = eventToCombo(e);
      if (!combo) return;
      const excludeId = recording === 'new-custom' ? null : recording;
      const hit = findConflict(combo, excludeId, recording === 'new-custom' ? 'custom' : 'action');
      if (hit) { setConflict({ combo, owner: hit.owner, applyTo: recording }); setRecording(null); return; }
      applyBinding(recording, combo);
      setRecording(null);
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [recording]); // eslint-disable-line

  function applyBinding(target, combo) {
    if (target === 'new-custom') { setPendingCustomKey(combo); return; }
    set({ shortcuts: { ...(s.shortcuts || {}), [target]: combo } });
  }
  const [pendingCustomKey, setPendingCustomKey] = useState(null);

  function resetOne(actionId) {
    const next = { ...(s.shortcuts || {}) };
    delete next[actionId];
    set({ shortcuts: next });
  }
  function resetAll() { set({ shortcuts: {} }); }

  const categories = [...new Set(SHORTCUT_ACTIONS.map((a) => a.category))];
  const filtered = SHORTCUT_ACTIONS.filter((a) => a.label.toLowerCase().includes(search.toLowerCase()));
  const selStyle = { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shortcuts…" className="flex-1 text-sm px-3 py-2 rounded-lg border outline-none" style={selStyle} />
        <button onClick={resetAll} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.surface, color: theme.textMuted }}><RotateCcw size={13} />Reset all</button>
      </div>

      {conflict && (
        <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: theme.accentLight, color: theme.accent }}>
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span className="flex-1">"{comboLabel(conflict.combo)}" is already used by "{conflict.owner}".</span>
          <button onClick={() => { applyBinding(conflict.applyTo, conflict.combo); setConflict(null); }} className="underline flex-shrink-0">Use anyway</button>
          <button onClick={() => setConflict(null)} className="flex-shrink-0">✕</button>
        </div>
      )}

      {categories.map((cat) => {
        const rows = filtered.filter((a) => a.category === cat);
        if (!rows.length) return null;
        return (
          <div key={cat} className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: theme.textLight }}>{cat}</p>
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
              {rows.map((a, i) => {
                const isCustomized = !!(s.shortcuts && s.shortcuts[a.id]);
                return (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: theme.bgAlt, borderBottom: i < rows.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                    <span className="text-sm" style={{ color: theme.text }}>{a.label}</span>
                    <div className="flex items-center gap-1.5">
                      {isCustomized && <button onClick={() => resetOne(a.id)} title="Reset to default" style={{ color: theme.textLighter }}><RotateCcw size={12} /></button>}
                      <button onClick={() => setRecording(a.id)} className="text-xs px-2.5 py-1 rounded-md" style={{ backgroundColor: recording === a.id ? theme.accent : theme.surface, color: recording === a.id ? theme.accentText : theme.text, minWidth: 70, textAlign: 'center' }}>
                        {recording === a.id ? 'Press key…' : comboLabel(shortcuts[a.id])}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mt-5 pt-4 border-t" style={{ borderColor: theme.border }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: theme.textLight }}>Your own navigation shortcuts</p>
        <p className="text-xs mb-2" style={{ color: theme.textLighter }}>Bind any key to jump straight to a project, filter, or label.</p>
        {custom.length > 0 && (
          <div className="rounded-lg overflow-hidden mb-2" style={{ border: `1px solid ${theme.border}` }}>
            {custom.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: theme.bgAlt, borderBottom: i < custom.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                <span className="text-sm" style={{ color: theme.text }}>{c.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs px-2.5 py-1 rounded-md" style={{ backgroundColor: theme.surface, color: theme.text }}>{comboLabel(c.key)}</span>
                  <button onClick={() => set({ customShortcuts: custom.filter((x) => x.id !== c.id) })} style={{ color: theme.textLighter }}><X size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <CustomShortcutForm theme={theme} state={state} recording={recording === 'new-custom'} pendingKey={recording === null ? pendingCustomKey : null}
          onStartRecord={() => { setPendingCustomKey(null); setRecording('new-custom'); }}
          onSave={(label, targetType, targetId) => { set({ customShortcuts: [...custom, { id: uid(), key: pendingCustomKey, label, targetType, targetId }] }); setPendingCustomKey(null); }} />
      </div>
    </div>
  );
}

function CustomShortcutForm({ theme, state, recording, pendingKey, onStartRecord, onSave }) {
  const [label, setLabel] = useState('');
  const [targetType, setTargetType] = useState('project');
  const [targetId, setTargetId] = useState('');
  const selStyle = { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text };
  const options = { project: state.projects, filter: state.filters, label: state.labels }[targetType];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name (e.g. Go to Work)" className="text-xs px-2 py-1.5 rounded-md border outline-none" style={{ ...selStyle, width: 150 }} />
      <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setTargetId(''); }} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="project">Project</option><option value="filter">Filter</option><option value="label">Label</option>
      </select>
      <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={{ ...selStyle, maxWidth: 140 }}>
        <option value="">Choose…</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <button onClick={onStartRecord} className="text-xs px-2.5 py-1.5 rounded-md" style={{ backgroundColor: recording ? theme.accent : theme.surface, color: recording ? theme.accentText : theme.text, minWidth: 70 }}>
        {recording ? 'Press key…' : (pendingKey ? comboLabel(pendingKey) : 'Set key')}
      </button>
      <button disabled={!label.trim() || !targetId || !pendingKey} onClick={() => { onSave(label.trim(), targetType, targetId); setLabel(''); setTargetId(''); }} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md disabled:opacity-40" style={{ backgroundColor: theme.accent, color: theme.accentText }}><Plus size={12} />Add</button>
    </div>
  );
}

function CustomSyntaxEditor({ s, set }) {
  const theme = useTheme();
  const { state } = useStore();
  const rules = s.customSyntaxes || [];
  const [trigger, setTrigger] = useState('');
  const [type, setType] = useState('priority');
  const [value, setValue] = useState('1');
  const selStyle = { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text };

  function addRule() {
    if (!trigger.trim()) return;
    let v = value;
    if (type === 'priority') v = parseInt(value, 10);
    set({ customSyntaxes: [...rules, { id: uid(), trigger: trigger.trim(), type, value: v }] });
    setTrigger('');
  }
  function removeRule(id) { set({ customSyntaxes: rules.filter((r) => r.id !== id) }); }
  function describeAction(r) {
    if (r.type === 'priority') return `→ ${PRIORITY_META[r.value]?.short || 'P?'}`;
    if (r.type === 'label') return `→ @${r.value}`;
    if (r.type === 'project') { const p = state.projects.find((x) => x.id === r.value); return `→ #${p ? p.name : '?'}`; }
    return '';
  }

  return (
    <div>
      <p className="text-sm font-medium mb-1" style={{ color: theme.text }}>Your own quick-add shortcuts</p>
      <p className="text-xs mb-3" style={{ color: theme.textLighter }}>Define a word that, when typed in quick-add, automatically applies a priority, label, or project — like the built-in "p1" or "#project".</p>

      {rules.length > 0 && (
        <div className="space-y-1 mb-3">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: theme.surface }}>
              <span style={{ color: theme.text }}><code style={{ backgroundColor: theme.surfaceAlt, padding: '1px 5px', borderRadius: 3 }}>{r.trigger}</code> <span style={{ color: theme.textLight }}>{describeAction(r)}</span></span>
              <button onClick={() => removeRule(r.id)} style={{ color: theme.textLight }}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <input value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="trigger word (e.g. asap)" className="text-sm px-2.5 py-1.5 rounded-lg border outline-none flex-1" style={{ ...selStyle, minWidth: 140 }} />
        <select value={type} onChange={(e) => { setType(e.target.value); setValue(e.target.value === 'priority' ? '1' : ''); }} className="text-sm px-2.5 py-1.5 rounded-lg border outline-none" style={selStyle}>
          <option value="priority">Set priority</option>
          <option value="label">Add label</option>
          <option value="project">Set project</option>
        </select>
        {type === 'priority' && (
          <select value={value} onChange={(e) => setValue(e.target.value)} className="text-sm px-2.5 py-1.5 rounded-lg border outline-none" style={selStyle}>
            {[1, 2, 3, 4].map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
          </select>
        )}
        {type === 'label' && (
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="label name" className="text-sm px-2.5 py-1.5 rounded-lg border outline-none" style={{ ...selStyle, width: 120 }} />
        )}
        {type === 'project' && (
          <select value={value} onChange={(e) => setValue(e.target.value)} className="text-sm px-2.5 py-1.5 rounded-lg border outline-none" style={selStyle}>
            <option value="">Choose project…</option>
            {state.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <button onClick={addRule} disabled={!trigger.trim() || (type === 'project' && !value)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg disabled:opacity-40" style={{ backgroundColor: theme.accent, color: theme.accentText }}><Plus size={13} />Add</button>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  const theme = useTheme();
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm" style={{ color: theme.text }}>{label}</span>
      <button onClick={() => onChange(!value)} className="rounded-full transition-colors" style={{ width: 40, height: 22, backgroundColor: value ? theme.accent : theme.surfaceAlt, position: 'relative' }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff', transition: 'left .18s ease' }} />
      </button>
    </div>
  );
}

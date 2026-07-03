import React, { useState, useMemo } from 'react';
import { X, Plus, HelpCircle } from 'lucide-react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';
import { todayStr } from '../lib/dates';

const FIELDS = [
  { key: 'date', label: 'Date' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'duration', label: 'Duration' },
  { key: 'priority', label: 'Priority' },
  { key: 'label', label: 'Label' },
  { key: 'project', label: 'Project' },
  { key: 'section', label: 'Section' },
  { key: 'status', label: 'Status' },
  { key: 'text', label: 'Text search' },
  { key: 'attachment', label: 'Attachment' },
  { key: 'location', label: 'Location' },
  { key: 'comments', label: 'Comments' },
];

const STATUS_OPTS = [
  ['overdue', 'Overdue'], ['recurring', 'Recurring'], ['no date', 'No date'],
  ['no priority', 'No priority'], ['no label', 'No label'], ['is header', 'Is a section header'],
];

function newRow() { return { id: Math.random().toString(36).slice(2), field: 'date', value: 'today', connector: 'AND' }; }

/* Generates a query fragment string for one row, given its field+value state. */
function rowToQuery(row) {
  switch (row.field) {
    case 'date': return row.value; // already a raw fragment like "today" or "due: 2026-08-01"
    case 'deadline': return row.value;
    case 'reminder': return row.value;
    case 'duration': return row.value;
    case 'priority': return row.value;
    case 'label': return row.value ? `@${row.value}` : '';
    case 'project': return row.value ? `#${row.value}` : '';
    case 'section': return row.value ? `/${row.value}` : '';
    case 'status': return row.value;
    case 'text': return row.value ? `search: ${row.value}` : '';
    case 'attachment': return row.value;
    case 'location': return row.value;
    case 'comments': return row.value;
    default: return '';
  }
}

export function buildQueryFromRows(rows) {
  const parts = [];
  rows.forEach((row, i) => {
    const frag = rowToQuery(row);
    if (!frag) return;
    if (i > 0 && parts.length) parts.push(row.connector === 'OR' ? '|' : '&');
    parts.push(frag);
  });
  return parts.join(' ');
}

export default function FilterBuilder({ query, onChange }) {
  const theme = useTheme();
  const { state } = useStore();
  const [rows, setRows] = useState(() => [newRow()]);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const generated = useMemo(() => buildQueryFromRows(rows), [rows]);

  React.useEffect(() => { onChange(generated); }, [generated]); // eslint-disable-line

  function updateRow(id, patch) { setRows((rs) => rs.map((r) => r.id === id ? { ...r, ...patch, value: patch.field ? defaultValueFor(patch.field) : (patch.value !== undefined ? patch.value : r.value) } : r)); }
  function removeRow(id) { setRows((rs) => rs.filter((r) => r.id !== id)); }
  function addRow() { setRows((rs) => [...rs, newRow()]); }

  const selStyle = { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text };

  return (
    <div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-1.5 flex-wrap">
            {i > 0 && (
              <select value={row.connector} onChange={(e) => updateRow(row.id, { connector: e.target.value })} className="text-xs px-1.5 py-1 rounded-md border outline-none" style={{ ...selStyle, width: 56 }}>
                <option value="AND">AND</option><option value="OR">OR</option>
              </select>
            )}
            <select value={row.field} onChange={(e) => updateRow(row.id, { field: e.target.value })} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
              {FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <FieldValue row={row} onChange={(v) => updateRow(row.id, { value: v })} state={state} theme={theme} />
            <button onClick={() => removeRow(row.id)} style={{ color: theme.textLight }}><X size={14} /></button>
          </div>
        ))}
      </div>
      <button onClick={addRow} className="flex items-center gap-1 text-xs mt-2 px-2 py-1 rounded-md" style={{ color: theme.accent }}><Plus size={12} />Add condition</button>

      <div className="mt-3 pt-2 border-t flex items-center justify-between" style={{ borderColor: theme.border }}>
        <code className="text-xs" style={{ color: theme.textLight }}>{generated || '(matches everything)'}</code>
        <button onClick={() => setShowCheatSheet((v) => !v)} title="Syntax help" style={{ color: theme.textLighter }}><HelpCircle size={14} /></button>
      </div>
      {showCheatSheet && <CheatSheet theme={theme} />}
    </div>
  );
}

function defaultValueFor(field) {
  return { date: 'today', deadline: 'deadline: today', reminder: 'reminder: 30m', duration: 'duration > 30', priority: 'p1', label: '', project: '', section: '', status: 'overdue', text: '', attachment: 'has attachment', location: 'has location', comments: 'has comments' }[field] || '';
}

function FieldValue({ row, onChange, state, theme }) {
  const selStyle = { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text };
  if (row.field === 'date') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="overdue">Overdue</option>
        <option value="7 days">Next 7 days</option><option value="no date">No date</option>
        <option value={`due: ${todayStr()}`}>On specific date…</option>
      </select>
    );
  }
  if (row.field === 'deadline') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="deadline: today">Today</option><option value="deadline: tomorrow">Tomorrow</option><option value="no deadline">No deadline</option>
      </select>
    );
  }
  if (row.field === 'reminder') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="reminder: 10m">10 min offset</option><option value="reminder: 30m">30 min offset</option>
        <option value="reminder: 60m">1 hour offset</option><option value="reminder: due">Relative to due</option>
        <option value="reminder: deadline">Relative to deadline</option><option value="no reminder">No reminder</option>
      </select>
    );
  }
  if (row.field === 'duration') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="duration > 30">More than 30 min</option><option value="duration > 60">More than 1 hour</option>
        <option value="duration < 30">Less than 30 min</option><option value="no duration">No duration</option>
      </select>
    );
  }
  if (row.field === 'priority') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="p1">Priority 1</option><option value="p2">Priority 2</option><option value="p3">Priority 3</option><option value="p4">Priority 4</option>
      </select>
    );
  }
  if (row.field === 'label') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="">Choose label…</option>
        {state.labels.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
      </select>
    );
  }
  if (row.field === 'project') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="">Choose project…</option>
        {state.projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
      </select>
    );
  }
  if (row.field === 'section') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="">Choose section…</option>
        {state.sections.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
      </select>
    );
  }
  if (row.field === 'status') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    );
  }
  if (row.field === 'text') {
    return <input value={row.value} onChange={(e) => onChange(e.target.value)} placeholder="contains…" className="text-xs px-2 py-1.5 rounded-md border outline-none" style={{ ...selStyle, width: 140 }} />;
  }
  if (row.field === 'attachment') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="has attachment">Has one</option><option value="no attachment">Has none</option>
      </select>
    );
  }
  if (row.field === 'location') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="has location">Has one</option><option value="no location">Has none</option>
      </select>
    );
  }
  if (row.field === 'comments') {
    return (
      <select value={row.value} onChange={(e) => onChange(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border outline-none" style={selStyle}>
        <option value="has comments">Has some</option><option value="no comments">Has none</option>
      </select>
    );
  }
  return null;
}

function CheatSheet({ theme }) {
  const rows = [
    ['today / tomorrow / overdue', 'date shortcuts'], ['7 days', 'due within a week'], ['due: 2026-08-01', 'on an exact date'],
    ['deadline: tomorrow', 'deadline shortcuts'], ['reminder: 45m', 'has a 45-min-offset reminder'],
    ['duration > 30', 'longer than 30 min'], ['p1–p4', 'priority'], ['@label  #project  /section'],
    ['search: text', 'title/description contains'], ['& (AND)  | (OR)  ! (NOT)  ( )', 'combine conditions'],
  ];
  return (
    <div className="mt-2 p-2 rounded-lg text-xs space-y-1" style={{ backgroundColor: theme.surface, color: theme.textMuted }}>
      {rows.map(([syn, desc], i) => <div key={i}><code style={{ color: theme.text }}>{syn}</code>{desc ? ` — ${desc}` : ''}</div>)}
    </div>
  );
}

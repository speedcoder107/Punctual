import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import {
  Calendar, Flag, Tag, ChevronDown, ChevronRight, Check, X, Inbox,
  Bell, MapPin, Paperclip, Target, AlignLeft, Send, MoreHorizontal, Clock, Timer, Plus,
} from 'lucide-react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';
import { parseQuickAdd } from '../lib/nlp';
import {
  todayStr, addDays, upcomingWeekday, formatDueLabel, dueColor, formatDuration, recurrenceLabel, uid,
} from '../lib/dates';
import { PRIORITY_META, HL, REMINDER_PRESET_OFFSETS, reminderLabel, RECURRENCE_UNITS } from '../lib/constants';
import { Panel, MiniCalendar, TimeOfDayPicker, HourMinuteCounter } from './shared';

export default function TaskSheet({ mode = 'new', parentId, lockedProjectId, initialProjectId, initialSectionId, initialDate, initialTime, initialDuration, seed, onSubmit, onClose }) {
  const theme = useTheme();
  const { state } = useStore();
  const projects = state.projects;
  const knownLabels = state.labels.map((l) => l.name);
  const customSyntaxes = useMemo(() => state.settings.customSyntaxes || [], [state.settings.customSyntaxes]);
  const isEdit = mode === 'edit';
  const isSub = mode === 'subtask';
  const continueAfter = !isEdit;

  const [entered, setEntered] = useState(false);
  const [text, setText] = useState(seed?.content || '');
  const [desc, setDesc] = useState(seed?.description || '');
  const [showDesc, setShowDesc] = useState(!!seed?.description);
  const [ignored, setIgnored] = useState(() => new Set());
  const [caret, setCaret] = useState(0);
  const [acIndex, setAcIndex] = useState(0);
  const [panel, setPanel] = useState(null);
  const [dateText, setDateText] = useState('');
  const [showCustomRepeat, setShowCustomRepeat] = useState(false);
  const [customInterval, setCustomInterval] = useState(2);
  const [customUnit, setCustomUnit] = useState('week');
  const [showCustomDuration, setShowCustomDuration] = useState(false);

  const [mDate, setMDate] = useState(seed ? seed.dueDate ?? null : undefined);
  const [mRec, setMRec] = useState(seed ? (seed.recurrence ?? null) : undefined);
  const [mPriority, setMPriority] = useState(seed ? seed.priority : undefined);
  const [mLabels, setMLabels] = useState(seed?.labels || []);
  const [mTime, setMTime] = useState(seed ? (seed.dueTime ?? null) : undefined);
  const [mDuration, setMDuration] = useState(seed ? (seed.duration ?? null) : undefined);
  const [mReminders, setMReminders] = useState(() => (seed?.reminders || []).map((r) => (typeof r === 'number' ? { id: uid(), mode: 'due', offsetMins: r } : r)));
  const [mProject, setMProject] = useState(seed?.projectId ?? lockedProjectId ?? initialProjectId ?? 'inbox');
  const [mIsHeader, setMIsHeader] = useState(seed ? !!seed.isHeader : undefined);
  const [deadline, setDeadline] = useState(seed?.deadline ?? null);
  const [location, setLocation] = useState(seed?.location ?? '');
  const [attachment, setAttachment] = useState(seed?.attachment ?? '');

  const taRef = useRef(null);
  const nameWrapRef = useRef(null);
  const { segments, meta } = useMemo(() => parseQuickAdd(text, projects, ignored, knownLabels, customSyntaxes), [text, projects, ignored, knownLabels, customSyntaxes]);

  // `initialDate` is only a *fallback default* (e.g. "Today" view / Upcoming day "+").
  // A manually-picked date (mDate) or a date parsed from the typed text always wins over it.
  const effDate = mDate !== undefined ? mDate : (meta.dueDate ?? initialDate ?? null);
  const effRec = mRec !== undefined ? mRec : meta.recurrence;
  const effPriority = mPriority !== undefined ? mPriority : meta.priority;
  const effIsHeader = mIsHeader !== undefined ? mIsHeader : meta.isHeader;
  const effTime = mTime !== undefined ? mTime : (meta.dueTime ?? initialTime ?? null);
  const effDuration = mDuration !== undefined ? mDuration : (meta.duration ?? initialDuration ?? null);
  const effProject = mProject ?? meta.projectId ?? 'inbox';
  const effLabels = useMemo(() => { const s = [...mLabels]; meta.labels.forEach((l) => { if (!s.includes(l)) s.push(l); }); return s; }, [mLabels, meta.labels]);
  const effReminders = useMemo(() => {
    const merged = [...mReminders];
    meta.reminders.forEach((mins) => { if (!merged.some((r) => r.mode === 'due' && r.offsetMins === mins)) merged.push({ id: `quick-${mins}`, mode: 'due', offsetMins: mins }); });
    return merged;
  }, [mReminders, meta.reminders]);

  useEffect(() => { requestAnimationFrame(() => setEntered(true)); setTimeout(() => taRef.current?.focus(), 60); }, []);
  // Keep the textarea and its highlighted-text mirror div pixel-identical: both are
  // `absolute inset-0` inside nameWrapRef, so they can never diverge in width/wrapping —
  // the wrapper's own height (which they don't otherwise contribute to, being absolute)
  // is driven from the textarea's measured scrollHeight. useLayoutEffect avoids a
  // one-frame flash at height 0 before the first measurement.
  useLayoutEffect(() => {
    const ta = taRef.current; if (!ta) return;
    ta.style.height = 'auto';
    const h = ta.scrollHeight;
    ta.style.height = `${h}px`;
    if (nameWrapRef.current) nameWrapRef.current.style.height = `${h}px`;
  }, [text]);

  const ac = useMemo(() => {
    const before = text.slice(0, caret); const mm = before.match(/([#@])([\p{L}\p{N}_-]*)$/u);
    if (!mm) return null; const sym = mm[1], q = mm[2].toLowerCase();
    if (sym === '#') { const items = projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6); return items.length ? { sym, start: caret - mm[0].length, items: items.map((p) => ({ key: p.id, label: p.name, color: p.color })) } : null; }
    const items = [...new Set(knownLabels)].filter((l) => l.toLowerCase().includes(q) && l.toLowerCase() !== q).slice(0, 6);
    return items.length ? { sym, start: caret - mm[0].length, items: items.map((l) => ({ key: l, label: l, color: '#8B5FBF' })) } : null;
  }, [text, caret, projects, knownLabels]);
  const acKey = ac ? `${ac.items.length}-${ac.start}` : null;
  useEffect(() => { setAcIndex(0); }, [acKey]);

  function syncCaret() { if (taRef.current) setCaret(taRef.current.selectionStart); }
  function applyAc(item) { if (!ac) return; const ins = ac.sym + item.label + ' '; const next = text.slice(0, ac.start) + ins + text.slice(caret); setText(next); const pos = ac.start + ins.length; requestAnimationFrame(() => { if (taRef.current) { taRef.current.selectionStart = taRef.current.selectionEnd = pos; setCaret(pos); } }); }

  function reset() {
    setText(''); setDesc(''); setShowDesc(false); setIgnored(new Set());
    setMDate(undefined); setMRec(undefined); setMPriority(undefined); setMLabels([]); setMTime(undefined); setMDuration(undefined); setMReminders([]); setMIsHeader(undefined);
    if (!lockedProjectId) setMProject(initialProjectId ?? 'inbox');
    setDeadline(null); setLocation(''); setAttachment(''); setPanel(null); setShowCustomRepeat(false); setShowCustomDuration(false);
    requestAnimationFrame(() => taRef.current?.focus());
  }
  function commit() {
    const title = meta.cleanedTitle || text.trim(); if (!title) return;
    onSubmit({
      content: title, description: desc.trim(), dueDate: effDate ?? null, dueTime: effTime ?? null, duration: effDuration ?? null,
      recurrence: effRec ?? null, priority: effPriority ?? 4, projectId: lockedProjectId ?? effProject,
      sectionId: initialSectionId ?? seed?.sectionId ?? null, labels: effLabels,
      reminders: effReminders.map((r) => ({ id: uid(), mode: r.mode, offsetMins: r.offsetMins, at: r.at })),
      deadline: deadline ?? null, location: location.trim() || null, attachment: attachment.trim() || null,
      isHeader: effIsHeader,
    });
    if (continueAfter) reset(); else requestClose();
  }
  function requestClose() { setEntered(false); setTimeout(onClose, 180); }

  function onKeyDown(e) {
    if (ac && e.key === 'ArrowDown') { e.preventDefault(); setAcIndex((i) => (i + 1) % ac.items.length); return; }
    if (ac && e.key === 'ArrowUp') { e.preventDefault(); setAcIndex((i) => (i - 1 + ac.items.length) % ac.items.length); return; }
    if (ac && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); applyAc(ac.items[acIndex]); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); return; }
    if (e.key === 'Escape') { e.preventDefault(); if (panel) setPanel(null); else requestClose(); return; }
    if (e.key === 'Backspace') { const pos = taRef.current.selectionStart; if (pos === taRef.current.selectionEnd) { const c = parseQuickAdd(text, projects, ignored, knownLabels, customSyntaxes).candidates.find((x) => x.end === pos); if (c) { e.preventDefault(); setIgnored((p) => new Set(p).add(c.raw.toLowerCase())); } } }
  }

  function quickDate(kind) {
    if (kind === 'today') setMDate(todayStr());
    else if (kind === 'tomorrow') setMDate(addDays(todayStr(), 1));
    else if (kind === 'weekend') setMDate(upcomingWeekday(6, false));
    else if (kind === 'nextweek') setMDate(upcomingWeekday(1, false));
    else if (kind === 'none') { setMDate(null); setMRec(null); setMTime(null); }
    if (kind !== 'none') setPanel(null);
  }
  function toggleRecurrence(unit) {
    const isActive = effRec && effRec.unit === unit && effRec.interval === 1;
    setMRec(isActive ? null : { unit, interval: 1 });
    if (!isActive && !effDate) setMDate(todayStr());
    setShowCustomRepeat(false);
  }
  function applyCustomRecurrence() {
    setMRec({ unit: customUnit, interval: Math.max(1, parseInt(customInterval, 10) || 1) });
    if (!effDate) setMDate(todayStr());
    setShowCustomRepeat(false);
  }
  function togglePriority(p) { setMPriority(effPriority === p ? 4 : p); setPanel(null); }
  function removeReminder(r) {
    if (typeof r.id === 'string' && r.id.startsWith('quick-')) {
      const cands = parseQuickAdd(text, projects, ignored, knownLabels, customSyntaxes).candidates.filter((c) => c.type === 'reminder' && c.value === r.offsetMins);
      if (cands.length) setIgnored((ig) => { const next = new Set(ig); cands.forEach((c) => next.add(c.raw.toLowerCase())); return next; });
    } else {
      setMReminders((prev) => prev.filter((x) => x.id !== r.id));
    }
  }

  const sheetText = { font: '500 16px/1.5 Inter, sans-serif', padding: 0, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', border: 'none' };
  const hasMoreValue = !!(deadline || location || attachment || effReminders.length);
  const currentProject = projects.find((p) => p.id === effProject);
  const inputStyle = { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text };
  const customRecurrenceActive = effRec && !(effRec.interval === 1 && ['day', 'week', 'month', 'weekday'].includes(effRec.unit));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[4vh] sm:pt-[12vh]" onMouseDown={requestClose}>
      <div className="absolute inset-0" style={{ opacity: entered ? 1 : 0, transition: 'opacity .2s ease', backgroundColor: theme.overlay }} />
      <div className="relative mx-auto w-full sm:w-[92%] max-w-[620px]" style={{ maxHeight: '92vh', overflow: 'visible', transform: entered ? 'scale(1) translateY(0)' : 'scale(.96) translateY(-16px)', opacity: entered ? 1 : 0, transition: 'transform .24s cubic-bezier(.32,.72,0,1), opacity .2s ease' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="rounded-2xl flex flex-col" style={{ backgroundColor: theme.bgElevated, border: `1px solid ${theme.border}`, boxShadow: theme.glowShadow, maxHeight: '92vh' }}>
          <div className="overflow-y-auto flex-1">
          {/* name */}
          <div className="px-4 sm:px-5 pt-5 relative">
            <div className="relative" ref={nameWrapRef}>
              <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ ...sheetText, color: theme.text }}>
                {segments.map((s, i) => s.type === 'plain'
                  ? <span key={i}>{s.text}</span>
                  : <span key={i} style={{ backgroundColor: `${HL[s.type]}22`, color: HL[s.type], borderRadius: 4, boxShadow: `inset 0 -1px 0 ${HL[s.type]}66`, padding: '0 1px' }}>{s.text}</span>)}
                {!text && (
                  <span style={{ color: theme.textLighter }}>
                    {isSub ? 'Sub-task name' : (
                      <>
                        <span className="hidden sm:inline">Task name — try "Report tomorrow at 3pm for 45m p1 #Work @urgent"</span>
                        <span className="sm:hidden">Task name</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <textarea ref={taRef} rows={1} value={text} spellCheck={false}
                onChange={(e) => { setText(e.target.value); requestAnimationFrame(syncCaret); }}
                onKeyDown={onKeyDown} onKeyUp={syncCaret} onClick={syncCaret} onSelect={syncCaret}
                className="absolute inset-0 w-full resize-none outline-none bg-transparent" style={{ ...sheetText, color: 'transparent', caretColor: theme.accent }} />
            </div>
            {ac && (
              <div className="absolute z-40 mt-1 rounded-lg border shadow-lg py-1" style={{ borderColor: theme.border, backgroundColor: theme.bgElevated, minWidth: 180 }}>
                {ac.items.map((it, i) => (
                  <button key={it.key} onMouseDown={(e) => { e.preventDefault(); applyAc(it); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left" style={{ backgroundColor: i === acIndex ? theme.hover : 'transparent', color: theme.text }}>
                    {ac.sym === '#' ? <span className="rounded-full" style={{ width: 8, height: 8, backgroundColor: it.color }} /> : <Tag size={12} style={{ color: it.color }} />}{it.label}
                  </button>))}
              </div>)}
          </div>

          {showDesc ? (
            <div className="px-4 sm:px-5 pt-2">
              <textarea autoFocus value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={1}
                className="w-full resize-none outline-none text-sm bg-transparent" style={{ color: theme.textMuted, minHeight: 22 }} />
            </div>
          ) : (
            <button onClick={() => setShowDesc(true)} className="flex items-center gap-1.5 text-sm px-4 sm:px-5 pt-2 pb-0.5" style={{ color: theme.textLight }}>
              <AlignLeft size={13} /> Description
            </button>
          )}

          {/* chips */}
          {(deadline || location || attachment || effReminders.length > 0) && (
            <div className="flex flex-wrap gap-1.5 px-4 sm:px-5 pt-2">
              {deadline && <Chip color="#D6492F" icon={<Target size={11} />} onX={() => setDeadline(null)}>Deadline {formatDueLabel(deadline)}</Chip>}
              {effReminders.map((r) => <Chip key={r.id} color="#D98E2B" icon={<Bell size={11} />} onX={() => removeReminder(r)}>{reminderLabel(r)}</Chip>)}
              {location && <Chip color="#3E7CB8" icon={<MapPin size={11} />} onX={() => setLocation('')}>{location}</Chip>}
              {attachment && <Chip color="#5C6BC0" icon={<Paperclip size={11} />} onX={() => setAttachment('')}>{attachment}</Chip>}
            </div>)}

          {/* pills */}
          <div className="relative px-4 sm:px-5 pt-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-sb">
              <PillWrap>
                <PillBtn active={!!effDate} color={dueColor(effDate, theme)} icon={<Calendar size={15} />} onClick={() => setPanel(panel === 'date' ? null : 'date')}
                  label={effDate ? (effRec ? recurrenceLabel(effRec) : formatDueLabel(effDate, effTime)) : 'Date'} />
                {panel === 'date' && (
                  <Panel width={300}>
                    <input autoFocus value={dateText} onChange={(e) => setDateText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const r = parseQuickAdd(dateText + ' ', projects, new Set(), knownLabels, customSyntaxes); if (r.meta.dueDate) { setMDate(r.meta.dueDate); setMRec(r.meta.recurrence ?? null); if (r.meta.dueTime) setMTime(r.meta.dueTime); setPanel(null); setDateText(''); } } }} placeholder="Type a date — e.g. next thu at 5pm" className="w-full text-sm px-2.5 py-1.5 rounded-lg border outline-none mb-2" style={inputStyle} />
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['weekend', 'This weekend'], ['nextweek', 'Next week']].map(([k, l]) => (
                        <button key={k} onClick={() => quickDate(k)} className="text-sm px-2.5 py-1.5 rounded-lg text-left" style={{ backgroundColor: theme.surface, color: theme.text }}>{l}</button>))}
                    </div>
                    <MiniCalendar value={effDate} onSelect={(d) => { setMDate(d); }} />

                    <div className="mt-3">
                      <span className="text-xs" style={{ color: theme.textLight }}>Time</span>
                      {effTime ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <Clock size={13} style={{ color: theme.textLight }} />
                          <TimeOfDayPicker value={effTime} onChange={(t) => setMTime(t)} />
                          <button onClick={() => setMTime(null)} style={{ color: theme.accent }}><X size={13} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setMTime('09:00')} className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: theme.textLight }}><Clock size={13} />Add time</button>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs" style={{ color: theme.textLight }}>Repeat:</span>
                        {RECURRENCE_UNITS.map(({ unit, label }) => {
                          const active = effRec && effRec.unit === unit && effRec.interval === 1;
                          return <button key={unit} onClick={() => toggleRecurrence(unit)} className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: active ? theme.accentLight : theme.surface, color: active ? theme.accent : theme.textMuted }}>{label}</button>;
                        })}
                        <button onClick={() => setShowCustomRepeat((v) => !v)} className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: (showCustomRepeat || customRecurrenceActive) ? theme.accentLight : theme.surface, color: (showCustomRepeat || customRecurrenceActive) ? theme.accent : theme.textMuted }}>Custom</button>
                      </div>
                      {customRecurrenceActive && !showCustomRepeat && (
                        <p className="text-xs mt-1.5" style={{ color: theme.accent }}>Every {effRec.interval} {effRec.unit}(s) <button onClick={() => setMRec(null)} className="underline ml-1" style={{ color: theme.textLight }}>clear</button></p>
                      )}
                      {showCustomRepeat && (
                        <div className="flex items-center gap-2 mt-2">
                          <input type="number" min={1} value={customInterval} onChange={(e) => setCustomInterval(e.target.value)} className="w-14 text-sm px-2 py-1 rounded-md border outline-none" style={inputStyle} />
                          <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} className="text-sm px-2 py-1 rounded-md border outline-none" style={inputStyle}>
                            <option value="day">day(s)</option><option value="week">week(s)</option><option value="month">month(s)</option><option value="year">year(s)</option>
                          </select>
                          <button onClick={applyCustomRecurrence} className="text-xs px-2.5 py-1.5 rounded-md" style={{ backgroundColor: theme.accent, color: theme.accentText }}>Set</button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => quickDate('none')} className="mt-3 text-sm w-full text-left px-2 py-1.5 rounded-lg" style={{ color: theme.accent }}>No date</button>
                  </Panel>)}
              </PillWrap>

              <PillWrap>
                <PillBtn active={effPriority !== 4} color={PRIORITY_META[effPriority].color} icon={<Flag size={15} />} onClick={() => setPanel(panel === 'priority' ? null : 'priority')}
                  label={effPriority !== 4 ? PRIORITY_META[effPriority].short : 'Priority'} />
                {panel === 'priority' && (
                  <Panel width={190}>
                    {[1, 2, 3, 4].map((p) => (
                      <button key={p} onClick={() => togglePriority(p)} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm" style={{ backgroundColor: effPriority === p ? theme.hover : 'transparent', color: theme.text }}>
                        <Flag size={15} style={{ color: PRIORITY_META[p].color }} fill={p < 4 ? PRIORITY_META[p].color : 'none'} />{PRIORITY_META[p].label}
                        {effPriority === p && <Check size={14} className="ml-auto" style={{ color: theme.accent }} />}
                      </button>))}
                    {effPriority !== 4 && <p className="text-xs mt-1 px-2" style={{ color: theme.textLighter }}>Click the selected priority again to clear it.</p>}
                  </Panel>)}
              </PillWrap>

              <PillWrap>
                <PillBtn active={effLabels.length > 0} color="#8B5FBF" icon={<Tag size={15} />} onClick={() => setPanel(panel === 'label' ? null : 'label')}
                  label={effLabels.length ? `${effLabels.length} label${effLabels.length > 1 ? 's' : ''}` : 'Labels'} />
                {panel === 'label' && <LabelPanel knownLabels={knownLabels} selected={effLabels} onToggle={(l) => setMLabels((prev) => { const base = effLabels.includes(l) ? effLabels.filter((x) => x !== l) : [...effLabels, l]; setIgnored((ig) => new Set(ig).add(`@${l}`.toLowerCase())); return base; })} />}
              </PillWrap>

              <PillWrap>
                <PillBtn active={!!effDuration} color="#5C6BC0" icon={<Timer size={15} />} onClick={() => setPanel(panel === 'duration' ? null : 'duration')}
                  label={effDuration ? formatDuration(effDuration) : 'Duration'} />
                {panel === 'duration' && (
                  <Panel width={220}>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[15, 30, 45, 60, 90, 120].map((m) => (
                        <button key={m} onClick={() => { setMDuration(effDuration === m ? null : m); setShowCustomDuration(false); }} className="text-xs px-2 py-1.5 rounded-md" style={{ backgroundColor: effDuration === m ? theme.accentLight : theme.surface, color: effDuration === m ? theme.accent : theme.textMuted }}>{formatDuration(m)}</button>))}
                    </div>
                    <button onClick={() => setShowCustomDuration((v) => !v)} className="text-xs px-2 py-1.5 rounded-md mt-1.5 w-full" style={{ backgroundColor: showCustomDuration ? theme.accentLight : theme.surface, color: showCustomDuration ? theme.accent : theme.textMuted }}>Custom</button>
                    {showCustomDuration && (
                      <div className="mt-2 flex justify-center">
                        <HourMinuteCounter totalMinutes={effDuration || 0} onChange={(v) => setMDuration(v)} />
                      </div>
                    )}
                    {effDuration && <button onClick={() => { setMDuration(null); setShowCustomDuration(false); }} className="mt-2 text-sm w-full text-left" style={{ color: theme.accent }}>Clear</button>}
                  </Panel>)}
              </PillWrap>

              <PillWrap>
                <div className="relative">
                  <PillBtn active={false} icon={<MoreHorizontal size={15} />} onClick={() => setPanel(panel === 'more' ? null : 'more')} />
                  {hasMoreValue && <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', backgroundColor: theme.accent, border: `2px solid ${theme.bgElevated}` }} />}
                </div>
                {panel === 'more' && (
                  <Panel width={230}>
                    <MoreMenuItem icon={<Bell size={15} />} label="Reminders" active={effReminders.length > 0} badge={effReminders.length || null} onClick={() => setPanel('reminder')} />
                    <MoreMenuItem icon={<Target size={15} />} label="Deadline" active={!!deadline} onClick={() => setPanel('deadline')} />
                    <MoreMenuItem icon={<MapPin size={15} />} label="Location" active={!!location} onClick={() => setPanel('location')} />
                    <MoreMenuItem icon={<Paperclip size={15} />} label="Attachment" active={!!attachment} onClick={() => setPanel('attach')} />
                  </Panel>)}
                {panel === 'reminder' && (
                  <ReminderPanel reminders={effReminders} hasDue={!!(effDate && effTime)} hasDeadline={!!deadline}
                    onAdd={(r) => setMReminders((prev) => [...prev, r])}
                    onRemove={removeReminder} />)}
                {panel === 'deadline' && (
                  <Panel>
                    <p className="text-sm font-semibold mb-2" style={{ color: theme.text }}>Deadline</p>
                    <MiniCalendar value={deadline} onSelect={(d) => { setDeadline(deadline === d ? null : d); setPanel(null); }} />
                    {deadline && <button onClick={() => { setDeadline(null); setPanel(null); }} className="mt-2 text-sm" style={{ color: theme.accent }}>Clear deadline</button>}
                  </Panel>)}
                {panel === 'location' && (
                  <Panel><input autoFocus value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setPanel(null); }} placeholder="Add a location" className="w-full text-sm px-2.5 py-1.5 rounded-lg border outline-none" style={inputStyle} /></Panel>)}
                {panel === 'attach' && (
                  <Panel><input autoFocus value={attachment} onChange={(e) => setAttachment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setPanel(null); }} placeholder="Paste a link or note" className="w-full text-sm px-2.5 py-1.5 rounded-lg border outline-none" style={inputStyle} /></Panel>)}
              </PillWrap>
            </div>
          </div>
          </div>

          {/* bottom bar */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 mt-2 border-t flex-shrink-0" style={{ borderColor: theme.border }}>
            <div className="relative">
              <button onClick={() => !isSub && setPanel(panel === 'project' ? null : 'project')} className="flex items-center gap-1.5 text-sm rounded-lg px-2 py-1.5" style={{ color: theme.text, backgroundColor: panel === 'project' ? theme.hover : 'transparent', cursor: isSub ? 'default' : 'pointer' }}>
                {isSub ? <><ChevronRight size={15} style={{ color: theme.textLight }} />Sub-task</> : <>{effProject === 'inbox' ? <Inbox size={15} style={{ color: theme.textMuted }} /> : <span className="rounded-full" style={{ width: 9, height: 9, backgroundColor: currentProject?.color }} />}{currentProject?.name || 'Inbox'}<ChevronDown size={14} style={{ color: theme.textLight }} /></>}
              </button>
              {panel === 'project' && !isSub && (
                <Panel width={240} position="top">
                  {projects.map((p) => (
                    <button key={p.id} onClick={() => { setMProject(p.id); setPanel(null); }} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left" style={{ backgroundColor: effProject === p.id ? theme.hover : 'transparent', color: theme.text, paddingLeft: 8 + (p.parentId ? 16 : 0) }}>
                      {p.id === 'inbox' ? <Inbox size={15} style={{ color: theme.textMuted }} /> : <span className="rounded-full" style={{ width: 9, height: 9, backgroundColor: p.color }} />}{p.name}
                      {effProject === p.id && <Check size={14} className="ml-auto" style={{ color: theme.accent }} />}
                    </button>))}
                </Panel>)}
            </div>
            <button onClick={commit} disabled={!meta.cleanedTitle && !text.trim()} className="flex items-center justify-center rounded-full disabled:opacity-30" style={{ width: 42, height: 42, backgroundColor: theme.accent, color: theme.accentText }} aria-label="Add task">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PillWrap({ children }) { return <div className="relative flex-shrink-0">{children}</div>; }
function PillBtn({ icon, label, active, color, onClick }) {
  const theme = useTheme(); const c = color || theme.accent;
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-sm rounded-lg whitespace-nowrap" style={{ padding: '6px 10px', border: `1px solid ${active ? c : theme.border}`, backgroundColor: active ? `${c}1A` : theme.bgAlt, color: active ? c : theme.textMuted }}>
      {icon}{label && <span>{label}</span>}
    </button>
  );
}
function Chip({ color, icon, children, onX }) {
  return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${color}1A`, color }}>{icon}{children}<button onClick={onX}><X size={11} /></button></span>;
}
function MoreMenuItem({ icon, label, active, badge, onClick }) {
  const theme = useTheme();
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm" style={{ color: active ? theme.accent : theme.text }}>
      <span style={{ color: active ? theme.accent : theme.textMuted }}>{icon}</span>{label}
      {active && <Check size={13} className="ml-auto" style={{ color: theme.accent }} />}
      {badge ? <span className="ml-auto text-xs" style={{ color: theme.accent }}>{badge}</span> : null}
    </button>
  );
}

function LabelPanel({ knownLabels, selected, onToggle }) {
  const theme = useTheme();
  const [q, setQ] = useState('');
  const all = [...new Set([...knownLabels, ...selected])];
  const filtered = all.filter((l) => l.toLowerCase().includes(q.toLowerCase()));
  const canCreate = q.trim() && !all.some((l) => l.toLowerCase() === q.trim().toLowerCase());
  return (
    <Panel>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a label" className="w-full text-sm px-2.5 py-1.5 rounded-lg border outline-none mb-2" style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }} />
      <div className="max-h-44 overflow-y-auto">
        {filtered.map((l) => (
          <button key={l} onClick={() => onToggle(l)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left" style={{ color: theme.text }}>
            <Tag size={14} style={{ color: '#8B5FBF' }} />{l}{selected.includes(l) && <Check size={14} className="ml-auto" style={{ color: theme.accent }} />}
          </button>))}
        {canCreate && <button onClick={() => onToggle(q.trim())} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left" style={{ color: '#8B5FBF' }}>Create "{q.trim()}"</button>}
        {!filtered.length && !canCreate && <p className="text-xs px-2 py-2" style={{ color: theme.textLighter }}>{q ? 'No matches.' : 'Type to create a label.'}</p>}
      </div>
    </Panel>
  );
}

/* ───────────────────────── reminders panel ─────────────────────────
   Supports multiple reminders per task, each either relative to the
   task's own due date+time, relative to its deadline, or an absolute
   custom date & time. Relative modes are gated: you can't attach a
   "before due" reminder until the task actually has a date AND time
   (otherwise there's nothing to count backwards from). */
export function ReminderPanel({ reminders, hasDue, hasDeadline, onAdd, onRemove }) {
  const theme = useTheme();
  const [mode, setMode] = useState(hasDue ? 'due' : hasDeadline ? 'deadline' : 'custom');
  const [customOffset, setCustomOffset] = useState(false);
  const [offN, setOffN] = useState(1);
  const [offUnit, setOffUnit] = useState('h');
  const [customDate, setCustomDate] = useState(todayStr());
  const [customTime, setCustomTime] = useState('09:00');

  const modeDisabled = { due: !hasDue, deadline: !hasDeadline, custom: false };

  function addOffset(mins) {
    onAdd({ id: uid(), mode, offsetMins: mins });
  }
  function addCustomOffset() {
    const mins = offUnit === 'm' ? offN : offUnit === 'h' ? offN * 60 : offN * 1440;
    addOffset(Math.max(1, mins));
    setCustomOffset(false);
  }
  function addCustom() {
    onAdd({ id: uid(), mode: 'custom', at: `${customDate}T${customTime}` });
  }

  return (
    <Panel width={280}>
      <p className="text-xs mb-2" style={{ color: theme.textLight }}>Alerts fire while the app is open (browser notifications).</p>

      {reminders.length > 0 && (
        <div className="mb-2 space-y-1">
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm px-2 py-1 rounded-lg" style={{ backgroundColor: theme.surface, color: theme.text }}>
              <span>{reminderLabel(r)}</span>
              <button onClick={() => onRemove(r)} style={{ color: theme.textLight }}><X size={13} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 p-0.5 rounded-lg mb-2" style={{ backgroundColor: theme.surface }}>
        {[['due', 'Due date'], ['deadline', 'Deadline'], ['custom', 'Custom']].map(([m, l]) => (
          <button key={m} disabled={modeDisabled[m]} onClick={() => setMode(m)} className="flex-1 text-xs py-1.5 rounded-md disabled:opacity-35"
            style={{ backgroundColor: mode === m ? theme.bgElevated : 'transparent', color: mode === m ? theme.accent : theme.textMuted, fontWeight: mode === m ? 600 : 400 }}>{l}</button>
        ))}
      </div>

      {mode !== 'custom' && modeDisabled[mode] === false && (
        <>
          {mode === 'due' && !hasDue && <p className="text-xs mb-2" style={{ color: theme.textLighter }}>Set a due date & time first.</p>}
          {mode === 'deadline' && !hasDeadline && <p className="text-xs mb-2" style={{ color: theme.textLighter }}>Set a deadline first.</p>}
          <div className="grid grid-cols-1 gap-1">
            {REMINDER_PRESET_OFFSETS.map((r) => (
              <button key={r.mins} onClick={() => addOffset(r.mins)} className="w-full text-left text-sm px-2 py-1.5 rounded-lg" style={{ color: theme.text }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>{r.label}</button>))}
          </div>
          <button onClick={() => setCustomOffset((v) => !v)} className="w-full text-left text-sm px-2 py-1.5 rounded-lg mt-1" style={{ color: customOffset ? theme.accent : theme.textMuted, backgroundColor: customOffset ? theme.accentLight : 'transparent' }}>Custom offset…</button>
          {customOffset && (
            <div className="flex items-center gap-2 mt-2 px-2">
              <input type="number" min={1} value={offN} onChange={(e) => setOffN(e.target.value)} className="w-14 text-sm px-2 py-1 rounded-md border outline-none" style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }} />
              <select value={offUnit} onChange={(e) => setOffUnit(e.target.value)} className="text-sm px-2 py-1 rounded-md border outline-none" style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }}>
                <option value="m">min before</option><option value="h">hr before</option><option value="d">day before</option>
              </select>
              <button onClick={addCustomOffset} className="text-xs px-2 py-1.5 rounded-md flex-shrink-0" style={{ backgroundColor: theme.accent, color: theme.accentText }}><Plus size={13} /></button>
            </div>
          )}
        </>
      )}

      {mode === 'custom' && (
        <div>
          <MiniCalendar value={customDate} onSelect={setCustomDate} />
          <div className="flex items-center gap-2 mt-2">
            <Clock size={13} style={{ color: theme.textLight }} />
            <TimeOfDayPicker value={customTime} onChange={setCustomTime} />
          </div>
          <button onClick={addCustom} className="w-full mt-2 text-sm px-2 py-1.5 rounded-lg" style={{ backgroundColor: theme.accent, color: theme.accentText }}>Add reminder</button>
        </div>
      )}
    </Panel>
  );
}

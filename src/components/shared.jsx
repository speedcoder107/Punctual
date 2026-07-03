import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useTheme } from '../theme';
import {
  MONTHS_FULL, WD_MINI, toDateStr, todayStr, parseDate,
} from '../lib/dates';

/* ───────────────────────── progress ring ───────────────────────── */
export function ProgressRing({ completed, total, size = 36 }) {
  const theme = useTheme();
  const pct = total === 0 ? 0 : completed / total;
  const r = size / 2 - 3, c = 2 * Math.PI * r, cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={theme.surfaceAlt} strokeWidth="3" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={theme.success} strokeWidth="3"
        strokeDasharray={`${c} ${c}`} strokeDashoffset={c - c * pct} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} style={{ transition: 'stroke-dashoffset .5s ease' }} />
    </svg>
  );
}

/* ───────────────────────── popover panel ─────────────────────────
   Renders via a portal to document.body, positioned with `fixed`
   coordinates measured from its own anchor (the wrapping element
   the caller already places it in, typically `position: relative`).
   This escapes any ancestor with `overflow` set (e.g. the horizontally
   scrolling pill row) which would otherwise silently clip the dropdown
   to the scroll container's visible strip. */
export function Panel({ children, width = 280, position = 'bottom', style = {} }) {
  const theme = useTheme();
  const markerRef = useRef(null);
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    const measure = () => {
      const anchor = markerRef.current?.parentElement;
      if (anchor) setRect(anchor.getBoundingClientRect());
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, []);

  const w = typeof width === 'number' ? width : 280;
  let left = rect ? Math.min(rect.left, window.innerWidth - w - 8) : -9999;
  left = Math.max(8, left);

  const pos = position === 'top'
    ? { bottom: rect ? window.innerHeight - rect.top + 8 : -9999 }
    : { top: rect ? rect.bottom + 8 : -9999 };

  const content = (
    <div className="fixed z-50 rounded-xl border shadow-xl p-3 modal-animate"
      style={{ ...pos, left, borderColor: theme.border, backgroundColor: theme.bgElevated, color: theme.text, width, maxWidth: '90vw', boxShadow: `0 12px 32px ${theme.shadow}`, ...style }}
      onMouseDown={(e) => e.stopPropagation()}>
      {children}
    </div>
  );

  return (
    <>
      <span ref={markerRef} style={{ display: 'none' }} />
      {rect && createPortal(content, document.body)}
    </>
  );
}

/* ───────────────────────── action pill ───────────────────────── */
export function Pill({ icon, label, active, color, onClick }) {
  const theme = useTheme();
  const c = color || theme.accent;
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-sm rounded-lg whitespace-nowrap flex-shrink-0 transition-colors"
      style={{ padding: '6px 10px', border: `1px solid ${active ? c : theme.border}`, backgroundColor: active ? `${c}1A` : theme.bgAlt, color: active ? c : theme.textMuted }}>
      {icon}{label && <span>{label}</span>}
    </button>
  );
}

/* ───────────────────────── mini calendar ───────────────────────── */
export function MiniCalendar({ value, onSelect, markers = {} }) {
  const theme = useTheme();
  const init = value ? parseDate(value) : new Date();
  const [vm, setVm] = useState({ y: init.getFullYear(), m: init.getMonth() });
  const first = new Date(vm.y, vm.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(vm.y, vm.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const t = todayStr();
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: theme.text }}>{MONTHS_FULL[vm.m]} {vm.y}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setVm((s) => { const d = new Date(s.y, s.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })} className="p-1 rounded" style={{ color: theme.textMuted }}><ChevronLeft size={16} /></button>
          <button onClick={() => setVm((s) => { const d = new Date(s.y, s.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })} className="p-1 rounded" style={{ color: theme.textMuted }}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">{WD_MINI.map((w, i) => <div key={i} className="text-center text-xs" style={{ color: theme.textLighter }}>{w}</div>)}</div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = toDateStr(new Date(vm.y, vm.m, d));
          const isToday = ds === t, isSel = ds === value, mark = markers[ds];
          return (
            <button key={i} onClick={() => onSelect(ds)} className="aspect-square rounded-md text-sm flex items-center justify-center relative"
              style={{ backgroundColor: isSel ? theme.accent : 'transparent', color: isSel ? theme.accentText : isToday ? theme.accent : theme.text, fontWeight: isToday || isSel ? 600 : 400 }}>
              {d}
              {mark && !isSel && <span style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: '50%', backgroundColor: theme.accent }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── modal shell ───────────────────────── */
export function Modal({ children, onClose, maxWidth = 700, align = 'center' }) {
  const theme = useTheme();
  const justify = align === 'top' ? 'flex-start' : 'center';
  return (
    <div className="fixed inset-0 z-50 flex justify-center" style={{ alignItems: justify, paddingTop: align === 'top' ? '10vh' : 0 }} onMouseDown={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: theme.overlay, animation: 'fadeIn .2s ease' }} />
      <div className="relative rounded-2xl shadow-2xl modal-animate" style={{ width: '92%', maxWidth, maxHeight: '88vh', overflow: 'hidden', backgroundColor: theme.bgElevated, border: `1px solid ${theme.border}` }} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────── stepper (small +/- counter box) ───────────────────────── */
function Stepper({ value, onChange, min, max, pad = 2, width = 44 }) {
  const theme = useTheme();
  const wrap = (v) => { const range = max - min + 1; return min + (((v - min) % range) + range) % range; };
  return (
    <div className="flex flex-col items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
      <button type="button" onClick={() => onChange(wrap(value + 1))} className="w-full flex items-center justify-center" style={{ height: 18, color: theme.textMuted, backgroundColor: theme.surface }}><ChevronUp size={12} /></button>
      <input value={String(value).padStart(pad, '0')} onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); if (!isNaN(n)) onChange(wrap(n)); }}
        className="text-center outline-none font-semibold" style={{ width, height: 32, border: 'none', borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.bgElevated, color: theme.text, fontVariantNumeric: 'tabular-nums' }} />
      <button type="button" onClick={() => onChange(wrap(value - 1))} className="w-full flex items-center justify-center" style={{ height: 18, color: theme.textMuted, backgroundColor: theme.surface }}><ChevronDown size={12} /></button>
    </div>
  );
}

/* ───────────────────────── time-of-day picker (HH : MM AM/PM) ───────────────────────── */
export function TimeOfDayPicker({ value, onChange }) {
  const theme = useTheme();
  const [h24, setH24] = useState(() => { const [h] = (value || '09:00').split(':').map(Number); return h; });
  const [m, setM] = useState(() => { const [, mm] = (value || '09:00').split(':').map(Number); return mm; });
  const isPM = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  function commit(nextH24, nextM) {
    onChange(`${String(nextH24).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`);
  }
  function setHour12(v) { const pm = h24 >= 12; const h = (v % 12) + (pm ? 12 : 0); setH24(h); commit(h, m); }
  function setMinute(v) { setM(v); commit(h24, v); }
  function setAmPm(pm) { const base = h12 % 12; const h = base + (pm ? 12 : 0); setH24(h); commit(h, m); }

  return (
    <div className="flex items-center gap-2">
      <Stepper value={h12} onChange={setHour12} min={1} max={12} pad={1} />
      <span className="font-bold" style={{ color: theme.textLight }}>:</span>
      <Stepper value={m} onChange={setMinute} min={0} max={59} pad={2} />
      <div className="flex flex-col rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
        <button type="button" onClick={() => setAmPm(false)} className="px-2 text-xs font-semibold" style={{ height: 24, backgroundColor: !isPM ? theme.accent : theme.surface, color: !isPM ? theme.accentText : theme.textMuted }}>AM</button>
        <button type="button" onClick={() => setAmPm(true)} className="px-2 text-xs font-semibold" style={{ height: 24, backgroundColor: isPM ? theme.accent : theme.surface, color: isPM ? theme.accentText : theme.textMuted }}>PM</button>
      </div>
    </div>
  );
}

/* ───────────────────────── hour + minute duration counter ───────────────────────── */
export function HourMinuteCounter({ totalMinutes, onChange }) {
  const theme = useTheme();
  const h = Math.floor((totalMinutes || 0) / 60);
  const m = (totalMinutes || 0) % 60;
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center">
        <Stepper value={h} onChange={(v) => onChange(v * 60 + m)} min={0} max={23} pad={1} />
        <span className="text-xs mt-1" style={{ color: theme.textLight }}>hr</span>
      </div>
      <span className="font-bold" style={{ color: theme.textLight }}>:</span>
      <div className="flex flex-col items-center">
        <Stepper value={m} onChange={(v) => onChange(h * 60 + v)} min={0} max={59} pad={2} />
        <span className="text-xs mt-1" style={{ color: theme.textLight }}>min</span>
      </div>
    </div>
  );
}

/* ───────────────────────── color swatch picker ───────────────────────── */
export const PROJECT_COLORS = ['#D6492F', '#D98E2B', '#E5C21E', '#3F8F6F', '#3E7CB8', '#5C6BC0', '#8B5FBF', '#C2487A', '#9C8059', '#7A7A7A'];

export function ColorPicker({ value, onChange }) {
  const theme = useTheme();
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PROJECT_COLORS.map((c) => (
        <button key={c} onClick={() => onChange(c)} style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: c, outline: value === c ? `2px solid ${theme.text}` : 'none', outlineOffset: 2 }} />
      ))}
    </div>
  );
}

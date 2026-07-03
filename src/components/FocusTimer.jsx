import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, X, RotateCcw, Check, PictureInPicture2 } from 'lucide-react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';
import { HourMinuteCounter } from './shared';

const PRESETS = [15, 25, 50];
const pipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

export default function FocusTimer({ task, onClose }) {
  const theme = useTheme();
  const { dispatch } = useStore();
  const initialMinutes = task.duration || 25;
  const [minutes, setMinutes] = useState(initialMinutes);
  const [remaining, setRemaining] = useState(initialMinutes * 60);
  const [running, setRunning] = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [customMins, setCustomMins] = useState(initialMinutes);
  const startRef = useRef(Date.now());
  const elapsedRef = useRef(0);

  // draggable position (null until the user first drags — starts anchored bottom-right)
  const [pos, setPos] = useState(null);
  const dragRef = useRef(null);
  const containerRef = useRef(null);

  // picture-in-picture
  const [pipWindow, setPipWindow] = useState(null);

  useEffect(() => { setRemaining(minutes * 60); startRef.current = Date.now(); elapsedRef.current = 0; }, [minutes]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(iv); finish(); return 0; }
        return r - 1;
      });
      elapsedRef.current += 1;
    }, 1000);
    return () => clearInterval(iv);
  }, [running, minutes]); // eslint-disable-line

  function finish() {
    setRunning(false);
    dispatch({ type: 'ADD_FOCUS_SESSION', payload: { taskId: task.id, start: startRef.current, durationSec: elapsedRef.current } });
    try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=').play().catch(() => {}); } catch { /* */ }
  }
  function logAndClose() {
    if (elapsedRef.current > 5) dispatch({ type: 'ADD_FOCUS_SESSION', payload: { taskId: task.id, start: startRef.current, durationSec: elapsedRef.current } });
    if (pipWindow) { try { pipWindow.close(); } catch { /* */ } }
    onClose();
  }
  function applyCustom() { setMinutes(customMins); setRunning(true); setShowCustom(false); }

  /* ── drag handling ── */
  const onDragStart = useCallback((e) => {
    if (pipWindow) return;
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    const rect = containerRef.current.getBoundingClientRect();
    dragRef.current = { startX: point.clientX, startY: point.clientY, origLeft: rect.left, origTop: rect.top };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('touchend', onDragEnd);
  }, [pipWindow]); // eslint-disable-line

  const onDragMove = useCallback((e) => {
    if (!dragRef.current) return;
    e.preventDefault?.();
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - dragRef.current.startX;
    const dy = point.clientY - dragRef.current.startY;
    const w = containerRef.current?.offsetWidth || 240;
    const h = containerRef.current?.offsetHeight || 300;
    let left = dragRef.current.origLeft + dx;
    let top = dragRef.current.origTop + dy;
    left = Math.max(4, Math.min(window.innerWidth - w - 4, left));
    top = Math.max(4, Math.min(window.innerHeight - h - 4, top));
    setPos({ left, top });
  }, []);

  const onDragEnd = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend', onDragEnd);
  }, [onDragMove]);

  useEffect(() => () => {
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend', onDragEnd);
  }, [onDragMove, onDragEnd]);

  /* ── picture-in-picture ── */
  async function enterPiP() {
    if (!pipSupported) return;
    try {
      const win = await window.documentPictureInPicture.requestWindow({ width: 260, height: 380 });
      // Carry over styling (Tailwind CDN + our injected <style>) into the PiP document.
      [...document.styleSheets].forEach((sheet) => {
        try {
          const css = [...sheet.cssRules].map((r) => r.cssText).join('\n');
          const style = win.document.createElement('style');
          style.textContent = css;
          win.document.head.appendChild(style);
        } catch {
          if (sheet.href) {
            const link = win.document.createElement('link');
            link.rel = 'stylesheet'; link.href = sheet.href;
            win.document.head.appendChild(link);
          }
        }
      });
      win.document.body.style.margin = '0';
      win.document.body.style.backgroundColor = theme.bgElevated;
      win.addEventListener('pagehide', () => setPipWindow(null), { once: true });
      setPipWindow(win);
    } catch { /* user cancelled or unsupported */ }
  }
  function exitPiP() { if (pipWindow) { try { pipWindow.close(); } catch { /* */ } } setPipWindow(null); }

  const body = (
    <TimerBody theme={theme} task={task} minutes={minutes} remaining={remaining} running={running}
      showCustom={showCustom} customMins={customMins} setCustomMins={setCustomMins}
      onSetPreset={(p) => { setMinutes(p); setRunning(true); setShowCustom(false); }}
      onToggleCustom={() => setShowCustom((v) => !v)} onApplyCustom={applyCustom}
      onReset={() => { setRemaining(minutes * 60); elapsedRef.current = 0; startRef.current = Date.now(); }}
      onToggleRun={() => setRunning((r) => !r)}
      onComplete={() => { dispatch({ type: 'TOGGLE_COMPLETE', id: task.id }); logAndClose(); }}
      onClose={logAndClose}
      isPip={!!pipWindow} pipSupported={pipSupported} onEnterPip={enterPiP} onExitPip={exitPiP}
      dragHandleProps={pipWindow ? {} : { onMouseDown: onDragStart, onTouchStart: onDragStart }} />
  );

  if (pipWindow) return createPortal(body, pipWindow.document.body);

  const style = pos
    ? { left: pos.left, top: pos.top }
    : { right: 24, bottom: 92 };

  return <div ref={containerRef} className="fixed z-50" style={style}>{body}</div>;
}

function TimerBody({ theme, task, minutes, remaining, running, showCustom, customMins, setCustomMins, onSetPreset, onToggleCustom, onApplyCustom, onReset, onToggleRun, onComplete, onClose, isPip, pipSupported, onEnterPip, onExitPip, dragHandleProps }) {
  const pct = 1 - remaining / (minutes * 60);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const R = 52, C = 2 * Math.PI * R;

  return (
    <div className="rounded-2xl shadow-2xl p-4" style={{ width: 240, backgroundColor: theme.bgElevated, border: `1px solid ${theme.border}`, boxShadow: isPip ? 'none' : `0 16px 40px ${theme.shadow}` }}>
      <div className="flex items-center justify-between mb-2" style={{ cursor: isPip ? 'default' : 'grab', touchAction: 'none', userSelect: 'none' }} {...dragHandleProps}>
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textLight }}>Focus</span>
        <div className="flex items-center gap-1">
          {pipSupported && !isPip && <button onClick={onEnterPip} title="Picture in picture" style={{ color: theme.textLight }}><PictureInPicture2 size={14} /></button>}
          {isPip && <button onClick={onExitPip} title="Exit picture in picture" style={{ color: theme.textLight }}><PictureInPicture2 size={14} /></button>}
          <button onClick={onClose} style={{ color: theme.textLight }}><X size={16} /></button>
        </div>
      </div>
      <p className="text-sm truncate mb-3" style={{ color: theme.text }}>{task.content}</p>
      <div className="flex justify-center mb-3">
        <div className="relative" style={{ width: 130, height: 130 }}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r={R} fill="none" stroke={theme.surfaceAlt} strokeWidth="7" />
            <circle cx="65" cy="65" r={R} fill="none" stroke={theme.accent} strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 65 65)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold" style={{ color: theme.text, fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</div>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mb-2 flex-wrap">
        {PRESETS.map((p) => <button key={p} onClick={() => onSetPreset(p)} className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: minutes === p && !showCustom ? theme.accentLight : theme.surface, color: minutes === p && !showCustom ? theme.accent : theme.textMuted }}>{p}m</button>)}
        <button onClick={onToggleCustom} className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: showCustom ? theme.accentLight : theme.surface, color: showCustom ? theme.accent : theme.textMuted }}>Custom</button>
      </div>
      {showCustom && (
        <div className="flex flex-col items-center gap-2 mb-3">
          <HourMinuteCounter totalMinutes={customMins} onChange={setCustomMins} />
          <button onClick={onApplyCustom} className="text-xs px-3 py-1 rounded-md" style={{ backgroundColor: theme.accent, color: theme.accentText }}>Start</button>
        </div>
      )}
      <div className="flex items-center justify-center gap-2">
        <button onClick={onReset} className="p-2 rounded-lg" style={{ color: theme.textMuted, backgroundColor: theme.surface }}><RotateCcw size={16} /></button>
        <button onClick={onToggleRun} className="p-2.5 rounded-full" style={{ backgroundColor: theme.accent, color: theme.accentText }}>{running ? <Pause size={18} /> : <Play size={18} />}</button>
        <button onClick={onComplete} className="p-2 rounded-lg" style={{ color: theme.success, backgroundColor: theme.surface }}><Check size={16} /></button>
      </div>
    </div>
  );
}

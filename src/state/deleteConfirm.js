import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTheme } from '../theme';
import { useStore } from './store';

const Ctx = createContext(null);
const ACTION_TYPE = { task: 'DELETE_TASK', section: 'DELETE_SECTION', project: 'DELETE_PROJECT' };

/* Centralizes every "delete a thing with children" decision behind the
   settings.deleteBehavior switch: ask each time / promote children up a
   level / delete everything. Callers just describe what they're deleting
   and how many descendants that drags with it. */
export function DeleteConfirmProvider({ children }) {
  const { state, dispatch } = useStore();
  const [pending, setPending] = useState(null); // {kind, id, label, count}

  const request = useCallback((kind, id, label, count = 0) => {
    const behavior = state.settings.deleteBehavior || 'delete-all';
    if (behavior === 'ask' && count > 0) { setPending({ kind, id, label, count }); return; }
    dispatch({ type: ACTION_TYPE[kind], id, mode: behavior === 'promote' ? 'promote' : 'delete-all' });
  }, [state.settings.deleteBehavior, dispatch]);

  function resolve(mode) {
    if (!pending) return;
    dispatch({ type: ACTION_TYPE[pending.kind], id: pending.id, mode });
    setPending(null);
  }

  return (
    <Ctx.Provider value={request}>
      {children}
      {pending && <DeleteConfirmModal pending={pending} onResolve={resolve} onCancel={() => setPending(null)} />}
    </Ctx.Provider>
  );
}

export function useRequestDelete() {
  return useContext(Ctx);
}

const NOUN = { task: 'sub-tasks', section: 'tasks', project: 'sections & tasks' };

function DeleteConfirmModal({ pending, onResolve, onCancel }) {
  const theme = useTheme();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onMouseDown={onCancel}>
      <div className="absolute inset-0" style={{ backgroundColor: theme.overlay, animation: 'fadeIn .2s ease' }} />
      <div className="relative rounded-2xl shadow-2xl modal-animate p-5" style={{ width: '92%', maxWidth: 380, backgroundColor: theme.bgElevated, border: `1px solid ${theme.border}` }} onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-1.5" style={{ color: theme.text, fontFamily: 'Fraunces, serif' }}>Delete "{pending.label}"?</h3>
        <p className="text-sm mb-4" style={{ color: theme.textMuted }}>It has {pending.count} {NOUN[pending.kind]}. What should happen to them?</p>
        <div className="space-y-2">
          <button onClick={() => onResolve('promote')} className="w-full text-left text-sm px-3 py-2.5 rounded-lg" style={{ backgroundColor: theme.surface, color: theme.text }}>
            Move them up one level, delete only this
          </button>
          <button onClick={() => onResolve('delete-all')} className="w-full text-left text-sm px-3 py-2.5 rounded-lg" style={{ backgroundColor: theme.accentLight, color: theme.accent }}>
            Delete everything
          </button>
          <button onClick={onCancel} className="w-full text-center text-sm px-3 py-2 rounded-lg" style={{ color: theme.textLight }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

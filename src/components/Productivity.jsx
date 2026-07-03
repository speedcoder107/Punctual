import React, { useState, useMemo } from 'react';
import { Flame, Award, TrendingUp, Zap } from 'lucide-react';
import { useTheme } from '../theme';
import { useStore } from '../state/store';
import { levelFor, KARMA_LEVELS, computeStreaks } from '../lib/karma';
import { todayStr, addDays, parseDate, WD_MINI } from '../lib/dates';
import { ProgressRing } from './shared';

export default function ProductivityView() {
  const theme = useTheme();
  const { state, dispatch } = useStore();
  const prod = state.productivity;
  const [tab, setTab] = useState('overview');
  const karma = levelFor(prod.karma || 0);
  const completions = useMemo(() => prod.dailyCompletions || {}, [prod.dailyCompletions]);
  const today = todayStr();
  const todayCount = completions[today] || 0;
  const { streakDays, longestStreak, weekTotals } = useMemo(() => computeStreaks(completions, prod.dailyGoal, prod.weeklyGoal, state.settings.weekStart), [completions, prod.dailyGoal, prod.weeklyGoal, state.settings.weekStart]);
  const weekKey = Object.keys(weekTotals).sort().pop();
  const weekCount = weekKey ? weekTotals[weekKey] : 0;

  const last7 = []; for (let i = 6; i >= 0; i--) last7.push(addDays(today, -i));
  const max7 = Math.max(prod.dailyGoal, ...last7.map((d) => completions[d] || 0), 1);

  return (
    <div style={{ maxWidth: 720 }}>
      {/* tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg w-max" style={{ backgroundColor: theme.surface }}>
        {['overview', 'karma', 'activity'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-1.5 rounded-md text-sm capitalize" style={{ backgroundColor: tab === t ? theme.bgAlt : 'transparent', color: tab === t ? theme.accent : theme.textMuted, fontWeight: tab === t ? 600 : 400 }}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          {/* goal cards */}
          <div className="grid grid-cols-2 gap-3">
            <GoalCard title="Daily goal" done={todayCount} goal={prod.dailyGoal} onGoal={(v) => dispatch({ type: 'UPDATE_PRODUCTIVITY', patch: { dailyGoal: v } })} />
            <GoalCard title="Weekly goal" done={weekCount} goal={prod.weeklyGoal} onGoal={(v) => dispatch({ type: 'UPDATE_PRODUCTIVITY', patch: { weeklyGoal: v } })} />
          </div>
          {/* streak + karma */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Flame size={18} />} value={streakDays} label="Day streak" color="#D6492F" />
            <StatCard icon={<Award size={18} />} value={longestStreak} label="Longest streak" color="#D98E2B" />
            <StatCard icon={<Zap size={18} />} value={prod.karma} label={karma.level.name} color={theme.accent} />
          </div>
          {/* last 7 days bar chart */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: theme.surface }}>
            <p className="text-sm font-semibold mb-3" style={{ color: theme.text }}>Last 7 days</p>
            <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
              {last7.map((d) => {
                const c = completions[d] || 0; const h = (c / max7) * 100;
                const met = c >= prod.dailyGoal;
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t flex items-end justify-center relative" style={{ height: 100 }}>
                      <div className="w-full rounded-t transition-all" style={{ height: `${h}%`, backgroundColor: met ? theme.success : theme.accent, opacity: c ? 1 : 0.15, minHeight: c ? 4 : 2 }} title={`${c} tasks`} />
                    </div>
                    <span className="text-xs" style={{ color: theme.textLight }}>{WD_MINI[parseDate(d).getDay()]}</span>
                  </div>);
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'karma' && (
        <div className="space-y-5">
          <div className="p-5 rounded-xl text-center" style={{ backgroundColor: theme.surface }}>
            <div className="text-4xl font-bold" style={{ color: theme.accent, fontFamily: 'Fraunces, serif' }}>{prod.karma}</div>
            <div className="text-sm mt-1" style={{ color: theme.textMuted }}>{karma.level.name}{karma.next && ` · ${karma.next.min - prod.karma} to ${karma.next.name}`}</div>
            <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ backgroundColor: theme.surfaceAlt }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${karma.progress * 100}%`, backgroundColor: theme.accent }} />
            </div>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
            {KARMA_LEVELS.map((l, i) => {
              const reached = prod.karma >= l.min;
              return (
                <div key={l.name} className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: karma.index === i ? theme.accentLight : theme.bgAlt, borderBottom: i < KARMA_LEVELS.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                  <span className="text-sm flex items-center gap-2" style={{ color: reached ? theme.text : theme.textLight, fontWeight: karma.index === i ? 600 : 400 }}>
                    <Award size={15} style={{ color: reached ? theme.accent : theme.textLighter }} />{l.name}
                  </span>
                  <span className="text-xs" style={{ color: theme.textLight }}>{l.min.toLocaleString()} pts</span>
                </div>);
            })}
          </div>
          <p className="text-xs" style={{ color: theme.textLight }}>Earn karma by completing tasks on time, using priorities, labels, recurring dates, and reminders, and by hitting your goals.</p>
        </div>
      )}

      {tab === 'activity' && (
        <div className="space-y-4">
          <Heatmap completions={completions} />
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: theme.text }}>Recent activity</p>
            {(prod.activityLog || []).slice(0, 40).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: theme.border }}>
                <span className="text-sm flex items-center gap-2 min-w-0" style={{ color: theme.textMuted }}><TrendingUp size={13} style={{ color: theme.success }} /><span className="truncate">Completed "{a.content}"</span></span>
                <span className="text-xs flex-shrink-0 ml-2" style={{ color: theme.textLight }}>+{a.points} · {timeAgo(a.at)}</span>
              </div>
            ))}
            {(!prod.activityLog || prod.activityLog.length === 0) && <p className="text-sm" style={{ color: theme.textLighter }}>No activity yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function GoalCard({ title, done, goal, onGoal }) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const pct = Math.min(1, done / goal);
  return (
    <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: theme.surface }}>
      <div className="relative flex items-center justify-center">
        <ProgressRing completed={done} total={goal} size={54} />
        <span className="absolute text-sm font-bold" style={{ color: theme.text }}>{done}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: theme.text }}>{title}</p>
        {editing ? (
          <input autoFocus type="number" defaultValue={goal} onBlur={(e) => { const v = parseInt(e.target.value, 10); if (v > 0) onGoal(v); setEditing(false); }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} className="w-16 text-xs px-1 py-0.5 rounded border outline-none mt-1" style={{ borderColor: theme.border, backgroundColor: theme.bgAlt, color: theme.text }} />
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs mt-0.5" style={{ color: theme.textLight }}>{done} of {goal} · edit</button>
        )}
        {pct >= 1 && <p className="text-xs mt-0.5" style={{ color: theme.success }}>Goal reached! 🎉</p>}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  const theme = useTheme();
  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: theme.surface }}>
      <span style={{ color }}>{icon}</span>
      <div className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{value}</div>
      <div className="text-xs" style={{ color: theme.textLight }}>{label}</div>
    </div>
  );
}

function Heatmap({ completions }) {
  const theme = useTheme();
  // last ~17 weeks
  const weeks = 17;
  const today = parseDate(todayStr());
  const end = new Date(today); end.setDate(end.getDate() + (6 - end.getDay()));
  const cells = [];
  const max = Math.max(1, ...Object.values(completions));
  for (let w = weeks - 1; w >= 0; w--) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(end); date.setDate(end.getDate() - (w * 7) - (6 - d));
      const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const c = completions[ds] || 0;
      col.push({ ds, c, intensity: c === 0 ? 0 : 0.25 + 0.75 * (c / max) });
    }
    cells.push(col);
  }
  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: theme.surface }}>
      <p className="text-sm font-semibold mb-3" style={{ color: theme.text }}>Activity heatmap</p>
      <div className="flex gap-1 overflow-x-auto">
        {cells.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((cell) => (
              <div key={cell.ds} title={`${cell.ds}: ${cell.c}`} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: cell.c === 0 ? theme.surfaceAlt : theme.accent, opacity: cell.c === 0 ? 1 : cell.intensity }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

'use client';
import {useEffect, useMemo, useState} from 'react';
import {habitDay} from '../../../lib/habits';
import {fundingHealth} from '../../../lib/goal-intelligence';
import {goalHref} from '../../../lib/checklist/derive';
import {CHECKLIST_ROUTE} from '../../../lib/af-checklist-keys';
import {W_REMINDERS} from '../../../lib/reminders/w-schema';
import {wallClock} from '../../../lib/zone-time';
import {orbitSummary, type OrbitCandidate, type OrbitPillar, type OrbitSummary} from '../../../lib/orbit-card/summary';
import {useChecklist} from '../../checklist/use-checklist';
import {useReminders} from '../../reminders/use-reminders';
import {useDeviceRecord} from '../../ai/use-device-record';
import {everyHalfMinute} from '../../half-minute';

const zone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
const clockNow = (ms: number) => { try { return wallClock(ms, zone()).clock; } catch { return '00:00'; } };

/**
 * Session AK (owner follow-up 2, N2; lane NA): today's orbit for NOVA's "Today's orbit", "Next three" and "Day at a glance"
 * widgets — the same candidates and the same pure summary (lib/orbit-card/summary.ts) as Today's Daily orbit card
 * (components/orbit-card/orbit-card.tsx): the Checklist's planets first, then today's due habits, then contributions due
 * today. Reads only; ticking happens on the Checklist. `summary` is null until every source has read; `error` says a
 * source could not be read (the widget then says so instead of showing a zero).
 */
export function useOrbitDay(): {summary: OrbitSummary | null; error: boolean} {
  const state = useChecklist(), reminders = useReminders(), w = useDeviceRecord(W_REMINDERS);
  const [now, setNow] = useState<{clock: string; ms: number} | null>(null);
  useEffect(() => { const tick = () => { const ms = Date.now(); setNow({clock: clockNow(ms), ms}); }; tick(); return everyHalfMinute(tick); }, []);
  const ready = state.loaded && reminders.loaded && w.loaded && now !== null;
  const {habits, platform: platformStore} = state.stores;
  const summary = useMemo(() => {
    if (!ready || !state.date) return null;
    const times = reminders.data.habits, candidates: OrbitCandidate[] = [];
    for (const d of state.dots) {
      if (!d.counted || d.missing) continue;
      const ref = d.kind === 'habit' ? d.item.ref?.habitId : undefined, habitId = typeof ref === 'string' ? ref : undefined;
      const pillar: OrbitPillar = d.kind === 'health' ? 'health' : d.kind === 'goal' || d.kind === 'goal-step' ? 'goals' : 'habits';
      const time = habitId ? times[habitId]?.time ?? null : d.input === 'water' ? reminders.data.water?.time ?? null : null;
      candidates.push({key: habitId ? `habit:${habitId}` : `dot:${d.id}`, pillar, label: d.label, time, href: CHECKLIST_ROUTE, done: d.state === 'done'});
    }
    const hDay = habits.today;
    if (!habits.error) for (const h of habits.data.habits) {
      const s = habitDay(h, hDay, hDay).status;
      if (s === 'due' || s === 'partial' || s === 'complete') candidates.push({key: `habit:${h.id}`, pillar: 'habits', label: h.title, time: times[h.id]?.time ?? null, href: '/app/habits', done: s === 'complete'});
    }
    let due = 0;
    const platform = platformStore.error ? null : platformStore.data;
    if (platform) for (const g of platform.goals) {
      if (g.status !== 'active' || !g.plan?.active) continue;
      let owed = 0n;
      try { owed = BigInt(fundingHealth(platform, g.id, now!.ms).dueToday); } catch { continue; }
      if (owed <= 0n) continue;
      due++;
      candidates.push({key: `contribution:${g.id}`, pillar: 'goals', label: `A contribution to ${g.name}`, time: w.data.contributions[g.id]?.time ?? null, href: `${goalHref(g.id)}?contribute=1`, done: false});
    }
    return orbitSummary({checklist: state.summary ? {done: state.summary.done, total: state.summary.total} : null, candidates, now: now!.clock, contributionsDue: due});
  }, [ready, state.date, state.dots, state.summary, habits.data, habits.today, habits.error, platformStore.data, platformStore.error, reminders.data, w.data, now]);
  return {summary, error: !!habits.error && !!platformStore.error};
}

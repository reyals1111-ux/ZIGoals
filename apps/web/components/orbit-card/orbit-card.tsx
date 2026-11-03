'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {habitDay} from '../../lib/habits';
import {fundingHealth} from '../../lib/goal-intelligence';
import {goalHref} from '../../lib/checklist/derive';
import {CHECKLIST_ROUTE} from '../../lib/af-checklist-keys';
import {W_REMINDERS} from '../../lib/reminders/w-schema';
import {wallClock} from '../../lib/zone-time';
import {orbitSummary, type OrbitCandidate, type OrbitItem, type OrbitPillar} from '../../lib/orbit-card/summary';
import {useChecklist} from '../checklist/use-checklist';
import {useReminders} from '../reminders/use-reminders';
import {useDeviceRecord} from '../ai/use-device-record';
import {everyHalfMinute} from '../half-minute';
import {GlassBar} from '../progress/glass-progress';
import {PillarMark} from '../pillars';
import './orbit-card.css';

const zone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
const clockNow = (ms: number) => { try { return wallClock(ms, zone()).clock; } catch { return '00:00'; } };
const WHEN: Record<OrbitItem['when'], (time: string | null) => string> = {next: t => `at ${t}`, later: t => `at ${t}`, earlier: t => `earlier, ${t}`, anytime: () => 'any time today'};

/**
 * Session AK Part 8.2: the Daily orbit card, a Today card kept on this device (`orbit` in `zigoals:today-cards:v1`),
 * separate from the Today hero and from the Checklist's own card: how much of today's orbit is lit, the next three things
 * due across the pillars and the contributions due today, with one door into the Checklist. It reads only; nothing is
 * ticked here. Loaded with Today's device cards after the page, never in Today's first JS.
 */
export default function OrbitCard() {
  const state = useChecklist(), reminders = useReminders(), w = useDeviceRecord(W_REMINDERS);
  const [now, setNow] = useState<{clock: string; ms: number} | null>(null);
  useEffect(() => { const tick = () => { const ms = Date.now(); setNow({clock: clockNow(ms), ms}); }; tick(); return everyHalfMinute(tick); }, []);
  const ready = state.loaded && reminders.loaded && w.loaded && now !== null;
  const {habits, platform: platformStore} = state.stores;
  const summary = useMemo(() => {
    if (!ready || !state.date) return null;
    const times = reminders.data.habits, candidates: OrbitCandidate[] = [];
    // The Checklist's planets first (the person's own order), then today's due habits, then contributions due today.
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

  return <section className="panel orbit-card" aria-labelledby="orbit-card-title">
    <p className="eyebrow">Today, across your pillars</p>
    <h2 id="orbit-card-title">Daily orbit</h2>
    {!summary ? <p className="orbit-card-count" role="status">Reading your day…</p> : summary.source === 'none' && !summary.next.length ? <>
      <p className="orbit-card-count">Your day&rsquo;s orbit fills in as you add a habit or star something for the Checklist.</p>
      <div className="actions"><Link className="primary" href={CHECKLIST_ROUTE}>Open the Checklist</Link><Link className="secondary" href="/app/habits">Open Habits</Link></div>
    </> : <>
      <p className="orbit-card-count">{summary.line}</p>
      {summary.total > 0 && <GlassBar identity="orbit-card" className="orbit-card-bar" value={summary.done / summary.total} role="progressbar" aria-label={summary.source === 'checklist' ? 'Checklist planets lit today' : 'Habits done today'} aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.done} />}
      {summary.next.length > 0 && <ol className="orbit-card-next" aria-label="Next in your day">{summary.next.map(item => <li key={item.key} data-pillar={item.pillar}>
        <PillarMark pillar={item.pillar} size={14} /><Link href={item.href}>{item.label}</Link><small>{WHEN[item.when](item.time)}</small>
      </li>)}</ol>}
      <div className="actions"><Link className="primary" href={CHECKLIST_ROUTE}>Open the Checklist</Link></div>
    </>}
  </section>;
}

'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {habitDay} from '../../lib/habits';
import {addWater, dailyData, removeWater, waterSummary} from '../../lib/health-daily';
import {waterButtons} from '../../lib/health-quick/quick';
import {asleep, nightsIn} from '../../lib/sleep/engine';
import {elapsedMs, formatFast} from '../../lib/fasting/engine';
import type {GoalSummary} from '../../lib/goal-summary';
import {formatGoalAmount} from '../../lib/goal-summary';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {useFasting} from '../health/use-fasting';
import {AppIcon} from '../app-icon';
import {Slot} from '../progress/slot';
import {SectionHeading} from '../ui/section-heading';
import {showToast} from '../ui/undo-toast';

const ozText = (ml: number) => `${Math.round(ml / 29.5735295625 * 10) / 10} US fl oz`;
const waterText = (ml: number, unit: 'ml' | 'fl-oz-us') => unit === 'ml' ? (ml >= 1000 ? `${Math.round(ml / 100) / 10} L` : `${Math.round(ml)} mL`) : ozText(ml);
/** A goal's share as the cards show it: whole percent, rounded down ("45%", never "45.00%"). */
const pct = (value: string) => { const n = Number(value); return Number.isFinite(n) ? `${Math.floor(n)}%` : value; };
const hours = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(Math.round(minutes % 60)).padStart(2, '0')} min`;

/**
 * Today's focus (Session AA-Cloud Part 1): what is due now, in one place right under the hero. The reminder cards that
 * were directly under the hero, the habits still to check in, the next goal step, one-tap water with Undo, and the
 * fasting clock or last night's sleep. Every figure is read from the same stores the rest of Today reads; nothing is
 * stored here. Session AA-Local fills two named places: its habit time-of-day widget (`today:habit-time`) and the
 * Health coach check-in (`today:coach`).
 */
export function TodayFocus({reminders, nextGoal, financial, showHabits, showHealth, healthDate}: {reminders?: ReactNode; nextGoal?: GoalSummary; financial: boolean; showHabits: boolean; showHealth: boolean; healthDate: string}) {
  const habits = useHabits(), health = useHealth(), fasting = useFasting();
  const due = habits.loaded && !habits.error ? habits.data.habits.filter(h => habitDay(h, habits.today, habits.today).scheduled) : [];
  const done = due.filter(h => habitDay(h, habits.today, habits.today).status === 'complete').length;
  const healthReady = health.loaded && !health.error;
  const daily = healthReady ? dailyData(health.data) : undefined;
  const water = healthReady ? waterSummary(health.data, healthDate) : undefined;
  const firstWater = healthReady ? waterButtons(health.data)[0] : undefined;
  const lastNight = healthReady && health.data.sleep ? nightsIn(health.data.sleep, healthDate, 1).at(-1) : undefined;
  const slept = lastNight ? asleep(lastNight) : null;
  async function logWater() {
    if (!firstWater) return;
    const id = crypto.randomUUID(), at = new Date().toISOString();
    try {
      await health.update(latest => addWater(latest, {id, date: healthDate, amountMilli: firstWater.amountMilli, unit: firstWater.unit}, at));
      showToast({message: `Water logged: ${firstWater.label.replace(/^Add /, '')}.`, undo: () => health.update(latest => removeWater(latest, id)), undone: 'Water entry removed.'});
    } catch (e) {
      showToast({message: e instanceof Error && e.message ? e.message : 'Could not log water on this device.'});
    }
  }
  return <section className="today-focus" aria-labelledby="today-focus-title">
    <SectionHeading id="today-focus-title" eyebrow="What is due now" title="Today’s focus" />
    {reminders}
    <div className="today-focus-tiles">
      {showHabits && <article className="focus-tile" data-tone="habits" aria-label="Focus: habits today">
        <span className="focus-label"><AppIcon name="habits" size={20} />Habits</span>
        {!habits.loaded ? <p role="status">Loading habits…</p> : habits.error ? <p role="alert">Habits need attention.</p> : due.length ? <>
          <strong>{due.length - done ? `${due.length - done} left today` : 'All done today'}</strong>
          <p>{done} of {due.length} complete</p>
          <div className="focus-actions"><Link className="text-link" href="/app/habits">Check in →</Link></div>
        </> : <>
          <strong>Nothing due today</strong>
          <div className="focus-actions"><Link className="text-link" href="/app/habits">{habits.data.habits.length ? 'See your habits →' : 'Build your rhythm →'}</Link></div>
        </>}
      </article>}
      {financial && <article className="focus-tile" data-tone="goals" aria-label="Focus: next goal step">
        <span className="focus-label"><AppIcon name="goals" size={20} />Next step</span>
        {nextGoal ? <>
          <strong>{nextGoal.name}</strong>
          <p>{nextGoal.progressBound === 'unavailable' ? 'Progress unknown until valued' : `${nextGoal.progressBound === 'at-least' ? 'At least ' : ''}${pct(nextGoal.progressPct)} of ${nextGoal.target ? formatGoalAmount(nextGoal.target, nextGoal.currency) : 'its target'}`}{nextGoal.nextContributionDate ? ` · next contribution ${nextGoal.nextContributionDate}` : ''}</p>
          <div className="focus-actions"><Link className="text-link" href={nextGoal.href}>Open goal →</Link></div>
        </> : <>
          <strong>No active goal yet</strong>
          <div className="focus-actions"><Link className="text-link" href="/app/goals/new">Plan a goal →</Link></div>
        </>}
      </article>}
      {showHealth && <article className="focus-tile" data-tone="health" aria-label="Focus: water today">
        <span className="focus-label"><AppIcon name="health" size={20} />Water</span>
        {!healthReady || !water || !daily ? <p role="status">{health.error ? 'Health needs attention.' : 'Loading Health…'}</p> : <>
          <strong>{waterText(water.millilitres, daily.preferences.waterUnit)}</strong>
          <p>{water.targetMl ? `of ${waterText(water.targetMl, daily.preferences.waterUnit)} today` : `${water.entries} ${water.entries === 1 ? 'entry' : 'entries'} today`}</p>
          <div className="focus-actions">{firstWater && <button type="button" className="secondary" onClick={() => void logWater()}>{firstWater.label}</button>}<Link className="text-link" href="/app/health?add=entry">Log food →</Link></div>
        </>}
      </article>}
      {showHealth && <article className="focus-tile" data-tone="rest" aria-label={fasting.running ? 'Focus: fasting' : 'Focus: sleep'}>
        <span className="focus-label"><AppIcon name="health" size={20} />{fasting.running ? 'Fasting' : 'Sleep'}</span>
        {fasting.loaded && fasting.running ? (() => {
          const {ms} = elapsedMs(fasting.running, fasting.now), target = fasting.running.targetHours * 3_600_000;
          return <><strong>{ms >= target ? 'Target reached' : formatFast(ms)}</strong><p>of {fasting.running.targetHours} h</p><div className="focus-actions"><Link className="text-link" href="/app/health#fasting">Open fasting →</Link></div></>;
        })() : !healthReady ? <p role="status">{health.error ? 'Health needs attention.' : 'Loading Health…'}</p> : slept ? <>
          <strong>{hours(slept.minutes)}</strong>
          <p>asleep last night{slept.estimated ? ' (estimated from the times you logged)' : ''}</p>
          <div className="focus-actions"><Link className="text-link" href="/app/health?view=sleep">Open sleep →</Link></div>
        </> : <>
          <strong>No night logged</strong>
          <div className="focus-actions"><Link className="text-link" href="/app/health?view=sleep">Log last night →</Link></div>
        </>}
      </article>}
    </div>
    <Slot place="today:habit-time" />
    <Slot place="today:coach" />
  </section>;
}

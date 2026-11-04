'use client';
import Link from 'next/link';
import {useRef, type ReactNode} from 'react';
import {habitDay} from '../../lib/habits';
import {dailyData, waterOn} from '../../lib/health-daily';
import {logWaterWithUndo} from '../health/water-log';
import {waterButtons} from '../../lib/health-quick/quick';
import {asleep, nightsIn} from '../../lib/sleep/engine';
import {elapsedMs, formatFast} from '../../lib/fasting/engine';
import type {GoalSummary} from '../../lib/goal-summary';
import {formatGoalAmount} from '../../lib/goal-summary';
import type {GoalStep} from '../../lib/today/goal-roles';
import {formatUnits} from '@zigoals/chain-config';
import {formatDate, formatProgressPercent} from '../../lib/visual-format';
import {waterText} from '../../lib/health-units';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {useFasting} from '../health/use-fasting';
import {AppIcon} from '../app-icon';
import {Slot} from '../progress/slot';
import {SectionHeading} from '../ui/section-heading';
import {showStatus} from '../ui/undo-toast';
import {plainErrorMessage} from '../../lib/plain-error';
import {newHealthId} from '../../lib/health';

/** A goal's share as the cards show it: the one percent rule (half up, 100 % only when complete; Session AL, PR-023 / NB-252). */
const pct = (value: string) => formatProgressPercent(value);
const hours = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(Math.round(minutes % 60)).padStart(2, '0')} min`;
/** Session AF (L5a, Part 10.10): the top goal's next step in plain words (its progress is on its card). */
export function stepText(step: GoalStep): string {
  const amount = 'amount' in step && step.amount ? `${formatGoalAmount(formatUnits(step.amount.value, step.amount.decimals), step.amount.asset)} ` : '';
  switch (step.kind) {
    case 'review': return 'Next: review its wealth sources';
    case 'overdue': return `Contribution ${amount}due since ${formatDate(step.date)}`;
    case 'milestone': return `Next milestone: ${step.title}`;
    case 'contribution': return `Next contribution ${amount}on ${formatDate(step.date)}`;
    case 'target': return step.days === 0 ? `Its target date is today, ${formatDate(step.date)}` : `${step.days} ${step.days === 1 ? 'day' : 'days'} to its target date, ${formatDate(step.date)}`;
    case 'plan': return 'Next: set a contribution plan';
    case 'open': return 'Open it to plan the next step';
  }
}

/**
 * Today's focus (Session AA-Cloud Part 1): what is due now, in one place right under the hero. The reminder cards that
 * were directly under the hero, the habits still to check in, the next goal step, one-tap water with Undo, and the
 * fasting clock or last night's sleep. Every figure is read from the same stores the rest of Today reads; nothing is
 * stored here. Session AA-Local fills two named places: its habit time-of-day widget (`today:habit-time`) and the
 * Health coach check-in (`today:coach`). Links to a view of a page (`?add=`, `?view=`) are not prefetched: WebKit
 * reports a prefetch cancelled by leaving Today as a page error (ADR-017 S64), and a tap loads them quickly anyway.
 */
export function TodayFocus({reminders, nextGoal, step, financial, showHabits, showHealth, healthDate, habitsWidget = false, goalsReady = true}: {/** Session AH (TO12, B-066): until the goals are read, the tile says so (it had said "No active goal yet"). */ goalsReady?: boolean; reminders?: ReactNode; nextGoal?: GoalSummary; /** Session AF (L5a): the goal's next step (lib/today/goal-roles.ts); without it, its progress as before. */ step?: GoalStep; financial: boolean; showHabits: boolean; showHealth: boolean; healthDate: string; /** Session AB-Design (owner request 12): the habits widget shows the due habits itself, so the tile stands down. */ habitsWidget?: boolean}) {
  const habits = useHabits(), health = useHealth(), fasting = useFasting();
  // Session AH (TR6): the shared count — a skipped (rest) day is not due.
  const due = habits.loaded && !habits.error ? habits.data.habits.filter(h => { const d = habitDay(h, habits.today, habits.today); return d.scheduled && d.status !== 'skipped'; }) : [];
  const done = due.filter(h => habitDay(h, habits.today, habits.today).status === 'complete').length;
  const healthReady = health.loaded && !health.error;
  const daily = healthReady ? dailyData(health.data) : undefined;
  // Session AL (L2 request; P-NB-28 source): the one water reading Health uses (its journal day, mL, `reached` null without a target).
  const water = healthReady ? waterOn(health.data, healthDate) : undefined;
  const firstWater = healthReady ? waterButtons(health.data)[0] : undefined;
  const lastNight = healthReady && health.data.sleep ? nightsIn(health.data.sleep, healthDate, 1).at(-1) : undefined;
  const slept = lastNight ? asleep(lastNight) : null;
  const lastTap = useRef(-Infinity);
  async function logWater(tapAt: number) {
    if (!firstWater) return;
    // Session AL (MO-111, P-MO-97): a second tap within 350 ms (the event's own time) is one tap, as on Health.
    if (tapAt - lastTap.current < 350) return;
    lastTap.current = tapAt;
    // Session AH (HE1; N-105, B-001): the same id and payload as Health's own water button (a bare UUID is refused).
    // Session AL (P-NB-27; NB-081, NB-089; L2 request): Health's one water write. Undo removes exactly THIS entry from the
    // latest Health record (an entry logged since stays), through the app's one toast.
    try {
      await logWaterWithUndo(health.update, {id: newHealthId(), date: healthDate, amountMilli: firstWater.amountMilli, unit: firstWater.unit}, firstWater.label.replace(/^Add /, ''));
    } catch (e) {
      showStatus(plainErrorMessage(e, 'Could not log water on this device.'), {tone: 'error'});
    }
  }
  return <section className="today-focus" aria-labelledby="today-focus-title" data-habits-widget={habitsWidget ? '' : undefined}>
    <SectionHeading id="today-focus-title" eyebrow="What is due now" title="Today’s focus" />
    {reminders}
    <div className="today-focus-tiles">
      {showHabits && !habitsWidget && <article className="focus-tile" data-tone="habits" aria-label="Focus: habits today">
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
          {step ? <p data-step={step.kind}>{stepText(step)}</p> : <p>{nextGoal.progressBound === 'unavailable' ? 'Progress unknown until valued' : `${nextGoal.progressBound === 'at-least' ? 'At least ' : ''}${pct(nextGoal.progressPct)} of ${nextGoal.target ? formatGoalAmount(nextGoal.target, nextGoal.currency) : 'its target'}`}{nextGoal.nextContributionDate ? ` · next contribution ${formatDate(nextGoal.nextContributionDate)}` : ''}</p>}
          <div className="focus-actions"><Link className="text-link" href={nextGoal.href}>Open Goal →</Link></div>
        </> : !goalsReady ? <p className="loading-line" role="status">Reading your goals…</p> : <>
          <strong>No active goal yet</strong>
          <div className="focus-actions"><Link className="text-link" href="/app/goals/new">Plan a goal →</Link></div>
        </>}
      </article>}
      {showHealth && <article className="focus-tile" data-tone="health" aria-label="Focus: water today">
        <span className="focus-label"><AppIcon name="health" size={20} />Water</span>
        {!healthReady || !water || !daily ? <p role="status">{health.error ? 'Health needs attention.' : 'Loading Health…'}</p> : <>
          <strong>{waterText(water.millilitres, daily.preferences.waterUnit)}</strong>
          <p>{water.targetMl ? `of ${waterText(water.targetMl, daily.preferences.waterUnit)} today` : `${water.entries} ${water.entries === 1 ? 'entry' : 'entries'} today`}</p>
          <div className="focus-actions">{firstWater && <button type="button" className="secondary" aria-label={`${firstWater.label} of water`} onClick={e => void logWater(e.timeStamp)}>{firstWater.label}</button>}<Link prefetch={false} className="text-link" href="/app/health?add=entry">Log food →</Link></div>
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
          <div className="focus-actions"><Link prefetch={false} className="text-link" href="/app/health?view=sleep">Open sleep →</Link></div>
        </> : <>
          <strong>No night logged</strong>
          <div className="focus-actions"><Link prefetch={false} className="text-link" href="/app/health?view=sleep">Log last night →</Link></div>
        </>}
      </article>}
    </div>
    <Slot place="today:habit-time" />
    <Slot place="today:coach" />
  </section>;
}

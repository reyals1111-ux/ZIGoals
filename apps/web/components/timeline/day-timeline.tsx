'use client';
import Link from 'next/link';
import {Fragment, useCallback, useMemo, useState} from 'react';
import {PageHeader} from '../page-header';
import {OrbitArt} from '../header-art/orbit-art';
import {RemindersGlyph} from '../header-art/glyphs/reminders';
import {showToast} from '../ui/undo-toast';
import {zigiSignals} from '../zigi/bus';
import {habitCheckIn} from '../habits/use-habits';
import {formatClock, formatDate} from '../../lib/visual-format';
import {logMealPlan} from '../../lib/health-daily';
import {setHabitEntryStatus} from '../../lib/habits';
import {storageMessageOr} from '../../lib/storage-error-copy';
import {BANDS, bandOf, defaultHabitTime, MEAL_TIMES, type TimelineBlock} from '../../lib/timeline/build';
import {clearTime, minutesClock, restoreTime, setTime, type TimeOverride} from '../../lib/timeline/store';
import {entryOn, restoreHabitEntry, type HabitEntry} from '../../lib/timeline/actions';
import {setHabitTime} from '../../lib/habits-extras/store';
import {CHECKLIST_ROUTE} from '../../lib/af-checklist-keys';
import {useDayTimeline} from './use-day-timeline';
import {TimelineBlockRow, clockLabel, type BlockActions} from './timeline-block';
import {ReplanCard} from './replan-card';
import './timeline.css';

/**
 * /app/timeline (Session AF, L5b; P9.2, ADR-028 D2 (a), H76): today as one vertical line, in four parts of the day, with a
 * "now" line; an Anytime shelf for habits with no time; the day's-end Replan. A tap completes through each page's own
 * function (with Undo); a habit or a meal moves by drag, by keyboard or by the time picker, and the moved time is kept on
 * this device only. Viewing writes nothing.
 */
export function DayTimelinePage() {
  const state = useDayTimeline(), {day, loaded, habits, health, record, extras} = state;
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (work: () => Promise<void>) => { setBusy(true); try { await work(); } finally { setBusy(false); } }, []);
  const actions = useMemo<BlockActions>(() => ({
    done: b => void run(async () => {
      if (!b.habitId || !day) return;
      const id = b.habitId, date = day.date; let previous: HabitEntry | undefined, captured = false;
      try {
        await habits.update(d => { if (!captured) { previous = entryOn(d, id, date); captured = true; } return habitCheckIn.smartDone(id, date)(d); });
        try { zigiSignals.emitValidated('habit_completed'); } catch { /* decoration */ }
        showToast({message: `${b.title}: done for today.`, undo: () => habits.update(d => restoreHabitEntry(d, id, date, previous)), undone: `${b.title}: back as it was.`});
      } catch (e) { showToast({message: storageMessageOr(e, 'This check-in could not be saved on this device.')}); }
    }),
    skip: b => void run(async () => {
      if (!b.habitId || !day) return;
      const id = b.habitId, date = day.date; let previous: HabitEntry | undefined, captured = false;
      try {
        await habits.update(d => { if (!captured) { previous = entryOn(d, id, date); captured = true; } return setHabitEntryStatus(d, id, date, 'skipped', ''); });
        showToast({message: `${b.title}: skipped today. A skip never breaks a streak.`, undo: () => habits.update(d => restoreHabitEntry(d, id, date, previous)), undone: `${b.title}: back as it was.`});
      } catch (e) { showToast({message: storageMessageOr(e, 'The skip could not be saved on this device.')}); }
    }),
    log: b => void run(async () => {
      if (!b.mealPlanId) return;
      const plan = b.mealPlanId;
      try {
        await health.update(latest => logMealPlan(latest, plan, new Date().toISOString()));
        try { zigiSignals.emitValidated('health_log_recorded'); } catch { /* decoration */ }
        showToast({message: `${b.title}: logged once in your diary. Remove it on Health if it was a mistake.`});
      } catch (e) { showToast({message: storageMessageOr(e, 'This meal could not be logged on this device.')}); }
    }),
    move: (b, minutes, length) => {
      if (!b.timeKey) return;
      const key = b.timeKey, previous: TimeOverride | undefined = record.data.times[key], time = minutesClock(minutes);
      if (previous?.time === time && (length === undefined || previous.minutes === length)) return;
      try {
        record.update(r => setTime(r, key, time, length));
        showToast({message: `${b.title} moved to ${formatClock(time)} on this device.`, undo: () => record.update(r => restoreTime(r, key, previous)), undone: `${b.title} is back at ${b.start === null ? 'Any time' : clockLabel(b.start)}.`});
      } catch (e) { showToast({message: storageMessageOr(e, 'The new time could not be kept on this device.')}); }
    },
    putBack: b => {
      if (!b.timeKey) return;
      const key = b.timeKey, previous = record.data.times[key];
      try { record.update(r => clearTime(r, key)); showToast({message: `${b.title} is back at its own time.`, undo: () => record.update(r => restoreTime(r, key, previous)), undone: `${b.title} moved again.`}); }
      catch (e) { showToast({message: storageMessageOr(e, 'The time could not be changed on this device.')}); }
    },
    defaultTime: b => b.habitId ? (extras.data.times?.[b.habitId] ?? b.reminder ?? defaultHabitTime(habits.data, b.habitId, null)) : b.slot ? MEAL_TIMES[b.slot] : null,
    // Session AJ (item 35): a habit's time on every device (synced with the habit extras); the device-only move is cleared.
    everyDay: (b, minutes) => {
      if (!b.habitId || !b.timeKey || extras.unreadable) return;
      const id = b.habitId, key = b.timeKey, time = minutesClock(minutes), before = extras.data.times?.[id] ?? null, moved = record.data.times[key];
      try {
        extras.update(r => setHabitTime(r, id, time));
        if (moved) record.update(r => clearTime(r, key));
        showToast({message: `${b.title}: every day at ${formatClock(time)}, on all your devices.`, undo: () => { extras.update(r => setHabitTime(r, id, before)); if (moved) record.update(r => restoreTime(r, key, moved)); }, undone: `${b.title} is back as it was.`});
      } catch (e) { showToast({message: storageMessageOr(e, 'The time could not be kept.')}); }
    },
    clearEveryDay: b => {
      if (!b.habitId || extras.unreadable) return;
      const id = b.habitId, before = extras.data.times?.[id] ?? null;
      if (!before) return;
      try { extras.update(r => setHabitTime(r, id, null)); showToast({message: `${b.title}: its everyday time is removed on all your devices.`, undo: () => extras.update(r => setHabitTime(r, id, before)), undone: `${b.title}: every day at ${formatClock(before)} again.`}); }
      catch (e) { showToast({message: storageMessageOr(e, 'The time could not be changed.')}); }
    },
  }), [run, day, habits, health, record, extras]);

  const bands = useMemo(() => {
    if (!day) return [];
    return BANDS.map(band => ({...band, blocks: day.blocks.filter(b => bandOf(b.start!) === band.band), hasNow: bandOf(day.nowMinute) === band.band}))
      .filter(b => b.blocks.length || b.hasNow);
  }, [day]);

  return <div className="timeline-page" data-timeline={!loaded ? 'loading' : day?.quiet ? 'quiet' : 'ready'}>
    <PageHeader className="page-heading timeline-hero" titleId="timeline-title" eyebrow={`Today${day ? ` · ${formatDate(day.date, {weekday: true})}` : ''}`} title="Your day on one line"
      lede="Habits at their times, meals, sleep, a running fast, timers, reminders and your Checklist’s planets. Tap to complete; drag the arrows, use the arrow keys or change the time to move a habit or a meal."
      actions={<p className="timeline-links"><Link className="text-link" href={CHECKLIST_ROUTE}>Your Checklist →</Link> <Link className="text-link" href="/app/habits">Habits →</Link></p>}
      art={<OrbitArt glyph={RemindersGlyph} spin={14} />} />
    {!loaded || !day ? <div className="timeline-skeleton aa-skeleton" aria-hidden="true"><i /><i /><i /></div> : <>
      {state.failed && <p role="status" className="timeline-note">Some of your records could not be read on this device; the timeline shows what it can.</p>}
      <ReplanCard leftovers={day.leftovers} actions={actions} busy={busy} />
      {day.anytime.length > 0 && <section className="timeline-band timeline-anytime" aria-labelledby="timeline-anytime-title">
        <h2 id="timeline-anytime-title">Anytime</h2>
        <ul className="timeline-list">{day.anytime.map(b => <TimelineBlockRow key={b.id} block={b} actions={actions} busy={busy} />)}</ul>
      </section>}
      {day.quiet ? <section className="panel timeline-quiet" aria-labelledby="timeline-quiet-title">
        <h2 id="timeline-quiet-title">A quiet day</h2>
        <p>Nothing is scheduled yet. Give a habit a time, or plan a meal.</p>
        <p className="timeline-links"><Link className="secondary" href="/app/habits">Open Habits</Link> <Link className="secondary" href="/app/health?view=plan">Plan a meal</Link></p>
      </section> : bands.map(band => <section key={band.band} className="timeline-band" data-band={band.band} aria-labelledby={`timeline-band-${band.band}`}>
        <h2 id={`timeline-band-${band.band}`}>{band.label}<small>{formatClock(minutesClock(band.from))} – {formatClock(minutesClock(Math.min(band.to, 1439)))}</small></h2>
        <ol className="timeline-list">{band.blocks.map((b, i) => <Fragment key={b.id}>
          {band.hasNow && b.start! > day.nowMinute && (i === 0 || band.blocks[i - 1]!.start! <= day.nowMinute) && <NowLine minute={day.nowMinute} />}
          <TimelineBlockRow block={b} actions={actions} busy={busy} />
        </Fragment>)}{band.hasNow && (band.blocks.length === 0 || band.blocks.at(-1)!.start! <= day.nowMinute) && <NowLine minute={day.nowMinute} />}</ol>
      </section>)}
      <p className="fine timeline-fine">Times you move here are kept on this device only; your habits and their reminders stay as they are. A habit time you set with “Every day, on all my devices” goes with your habit to every device. Fasts and running timers keep their own clocks.</p>
    </>}
  </div>;
}
function NowLine({minute}: {minute: number}) {
  return <li className="timeline-now" aria-label={`Now, ${clockLabel(minute)}`} data-now={minutesClock(minute)}><span>Now · {clockLabel(minute)}</span></li>;
}
export default DayTimelinePage;
export type {TimelineBlock};

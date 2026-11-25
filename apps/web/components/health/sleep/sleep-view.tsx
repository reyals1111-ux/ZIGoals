'use client';
import {showToast} from '../../ui/undo-toast';
import {removeWithUndo} from '../../ui/remove-with-undo';
import {announceHealthRemoval} from '../../../lib/health-events';
import Link from 'next/link';
import {Suspense, lazy, useState, type ReactNode} from 'react';
import {LoadBoundary} from '../../load-boundary';
import {asleep, balanceWords, BALANCE_MIN_NIGHTS, clockFromMidnight, clockFromNoon, consistency, dailySeries, deleteNight, inBedMinutes, nightDay, shortNights, sleepBalance, sleepDebt, summary, wakeConsistency} from '../../../lib/sleep/engine';
import {sleepInsights} from '../../../lib/sleep/insights';
import type {SleepNight} from '../../../lib/sleep/schema';
import {formatMinutes} from '../../../lib/zone-time';
import {usualSleep} from '../../../lib/sleep/usual';
import {NebulaFlow} from '../../nebula-flow';
import {HeaderArtCorner, OrbitArt} from '../../header-art/orbit-art';
import {SleepGlyph} from '../../header-art/glyphs/sleep';
import {SleepDurationChart, SleepQualityChart, SleepTimesChart} from './sleep-charts';
import {NightForm, SleepGoalForm} from './sleep-forms';
import {SleepTonight} from './sleep-tonight';
import {useSleep} from './use-sleep';
import {SleepCsvImport} from './sleep-csv-import';
import {WindDownSetting, WindDownSounds} from './wind-down';
import {FocusWindowSetting} from './focus-window-card';
import {SleepScoreCard} from '../sleep-score-card';
import './sleep.css';
import {useHashArrival} from '../../jump/use-arrival';
// Session AK (lane S, item 9): the estimated energy curve, its code loaded when its fold is opened.
import {OnDemandFold} from '../../insights/compare/on-demand-fold';
import {sourceName} from '../../../lib/health-sources';
import {formatClock, formatDate, formatTime} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import {energyCurve} from '../../../lib/energy-curve/curve';
// Session AV lane 2 (bodymind-r2; LEDGER #237, #238): naps in the balance, and a sleep need from your own nights.
import {balanceWithNaps} from '../../../lib/sleep/naps-need';
import {efficiency} from '../../../lib/sleep/night';
/** The energy fold's face: its name, then the focus window and tonight's bedtime it estimates (C-MO-23), or what it needs. */
/**
 * Session AV lane 2 (polish 2, P-22): a tile's explanation of how its figure is worked out, folded behind "What is this?"
 * (the shared fold marker, a 44 px row); the figure and any short fact stay on the tile. Its name says which tile.
 */
function StatHow({of, children}: {of: string; children: ReactNode}) {
  return <dd className="dd-note sleep-stat-how"><details><summary className="fold-summary">What is this?<span className="sr-only"> ({of})</span></summary><small>{children}</small></details></dd>;
}
function energyFace(sleep: Parameters<typeof energyCurve>[0], today: string): string {
  const curve = energyCurve(sleep, today), at = (m: number) => formatClock(clockFromMidnight(Math.round(m)));
  return `Your energy today: an estimate from your sleep · ${curve ? `good focus ${at(curve.focus.from)}–${at(curve.focus.to)} · bedtime tonight ${at(curve.bedtime.from)}–${at(curve.bedtime.to)}` : 'log a night to see it'}`;
}

/** Session AL fourth pass (C-X3-13): the minutes under the goal on the short nights of the last 7 days, nothing netted. */
function shortfall(sleep: Parameters<typeof energyCurve>[0], today: string): number {
  const goal = sleep.goal?.minutes;
  return goal ? dailySeries(sleep, today, 7).reduce((t, p) => t + (p.asleep !== null && p.asleep < goal ? goal - p.asleep : 0), 0) : 0;
}

const EnergyCurve = lazy(() => import('../../sleep/energy-curve'));
// Session AV (owner follow-up 1, F-SLEEP-LONG): 90 days and a year, averaged; loaded when chosen.
const SleepLongChart = lazy(() => import('./sleep-long-chart'));
// Session AV lane 2 (body; LEDGER #123, #124): your week beside your usual, time to fall asleep, quality by week or month.
const SleepUsual = lazy(() => import('./sleep-usual'));
// Session AV lane 2 (body; LEDGER #83): the evening plan with its "Ready for bed" bar, its own chunk.
const EveningPlan = lazy(() => import('./evening-plan'));
const SleepLatencyChart = lazy(() => import('./sleep-usual').then(m => ({default: m.SleepLatencyChart})));
const SleepNeed = lazy(() => import('./sleep-need'));
// Session AV lane 2 (bodymind-r2; LEDGER #236): morning steps from the wake time, and a reminder at each chosen step.
const MorningSteps = lazy(() => import('./morning-steps'));
const SleepQualityTrend = lazy(() => import('./sleep-usual').then(m => ({default: m.SleepQualityTrend})));
// Session AV lane 2 (r3-notes; LEDGER #278, Stoic): "Write down a dream" on the latest night, and each night's dreams.
const NightDreams = lazy(() => import('./night-dreams'));
// Session AV lane 2, round 4 (health; Pillow, LEDGER #333, #335): your timing on free days, and the nap timer.
const HealthR4 = lazy(() => import('../r4/health-r4'));
// Session AV lane 2, round 6 (r6-body; AutoSleep, LEDGER #419, #423): tonight's bedtime, and time asleep of time in bed.
const SleepR6 = lazy(() => import('../r6/sleep-parts'));
// Session AW (X6; Sleep as Android, LEDGER #460, #459): the goal over 14 or 30 days, and renaming or removing a tag.
const SleepX6 = lazy(() => import('../x6/sleep-x6'));

const nightLine = (n: SleepNight) => {
  const a = asleep(n)!;
  return `${formatTime(n.start, {timeZone: n.timeZone})} → ${formatTime(n.end!, {timeZone: n.timeZone})} · ${formatMinutes(a.minutes)} asleep${a.estimated ? ' (estimated)' : ''} · in bed ${formatMinutes(inBedMinutes(n))}`;
};

/**
 * Sleep, the full view (Session W Part 4; /app/health?view=sleep, a view of Health so its document and camera rule stay).
 * Tonight's one-tap night, your week against your own goal, the sleep score (transparent, its formula on the card), the
 * charts, patterns from your own log, logging and editing nights and naps, and the goal. No medical claim; a missing
 * night is never counted as zero. (Session AV lane 2: this line said "No score" after the score card came; corrected.)
 */
export default function SleepView() {
  // Session AV lane 2 (fr-layout, FR-S-9): Today's "Enter the times →" (#log-night) lands on the night form once Tonight's lazy
  // parts above it have drawn, with the cursor in its first field.
  useHashArrival(id => id === 'log-night' ? {ready: el => el.querySelector<HTMLElement>('input, select')?.focus({preventScroll: true})} : null);
  const store = useSleep(), [note, setNote] = useState(''), [saves, setSaves] = useState(0), [range, setRange] = useState<7 | 30 | 90 | 365>(7), [editing, setEditing] = useState<string | null>(null), [confirm, setConfirm] = useState<string | null>(null), [allNights, setAllNights] = useState(false);
  if (!store.loaded) return <section className="panel"><h1>Sleep</h1><p>Opening your sleep log…</p></section>;
  if (store.error) return <section className="panel"><h1>Sleep</h1><p role="alert">Sleep lives in your Health journal, which could not be read. Nothing was changed.</p><Link className="text-link" href="/app/health">Back to Health</Link></section>;
  const {sleep, today} = store, points = dailySeries(sleep, today, range), week = summary(dailySeries(sleep, today, 7));
  const debt = sleepDebt(sleep, today), steady = consistency(sleep, today), steadyWake = wakeConsistency(sleep, today), patterns = sleepInsights(sleep, today), balance = sleepBalance(sleep, today);
  const nights = sleep.nights.filter(n => n.end !== null).sort((a, b) => b.end!.localeCompare(a.end!)).slice(0, 14);
  const latestNight = nights.find(n => n.kind !== 'nap')?.id ?? null; // Session AV lane 2 (r3-notes; LEDGER #278): the morning's night
  // Each save starts the log form afresh (its key), so the next night begins from the defaults.
  // Session AH (HE3; N-006, D-120): a save also says so in the app's toast, where it is seen, not only at the top.
  const done = (text: string) => { setNote(text); setEditing(null); setSaves(n => n + 1); showToast({message: text, clearOf: '.sleep-week .sleep-stats' /* Session AV (S-12): off the averages the save just moved */}); };
  async function remove(id: string) {
    // Session AH Part 3 (DS3, L-009/L-010): a nap is called a nap.
    const held = store.sleep.nights.find(n => n.id === id), kind = held?.kind, day = held ? nightDay(held) : null;
    // Session AL (P-MO-56, MO-114/MO-136): a deleted night or nap gets the app's labelled Undo, as food, water and weight
    // do; Undo puts that exact record back in the latest sleep log.
    const said = kind === 'nap' ? 'The nap is deleted.' : 'The night is deleted.';
    try { await removeWithUndo(store.update, s => deleteNight(s, id), said, kind === 'nap' ? 'The nap is back.' : 'The night is back.'); setConfirm(null); setNote(said); if (day) announceHealthRemoval({measures: ['sleepMinutes'], dates: [day]}); } catch (error) { setNote(plainErrorMessage(error, 'Could not delete.')); }
  }
  return <div className="sleep-view">
    <div className="page-heading header-art-host"><div>
      <p><Link className="text-link sleep-back" href="/app/health">← Health</Link></p>
      <p className="eyebrow page-eyebrow"><NebulaFlow identity="sleep-eyebrow">HEALTH · SLEEP</NebulaFlow></p>
      <h1><NebulaFlow identity="sleep-title">Your sleep, your rhythm.</NebulaFlow></h1>
      <p className="page-lede">Nights and naps you log or bring in. Private to your Health journal; it syncs only with Health, under the same consent.</p>
    </div><HeaderArtCorner><OrbitArt glyph={SleepGlyph} tone="health" spin={6}/></HeaderArtCorner></div>
    {note && <p className="sleep-note">{note}</p>}
    <section className="panel sleep-tonight-panel" aria-labelledby="sleep-tonight-title"><h2 id="sleep-tonight-title">Tonight</h2><SleepTonight store={store} onDone={setNote}/><LoadBoundary quiet><Suspense fallback={null}><SleepR6 part="bedtime" sleep={store.sleep} today={store.today} zone={store.zone}/></Suspense></LoadBoundary><LoadBoundary quiet><Suspense fallback={null}><EveningPlan zone={store.zone} now={store.now}/></Suspense></LoadBoundary><LoadBoundary quiet><Suspense fallback={null}><MorningSteps sleep={store.sleep} today={store.today}/></Suspense></LoadBoundary><WindDownSounds/><WindDownSetting/><FocusWindowSetting/></section>
    {/* Session AH (HE3, D-199): the log form sits near the top, full width, not squeezed beside the goal at the bottom. */}
    <section className="panel sleep-log" id="log-night" aria-labelledby="sleep-log-title"><h2 id="sleep-log-title">Log a night or a nap</h2><LoadBoundary quiet><Suspense fallback={null}><HealthR4 part="nap-timer" store={store}/></Suspense></LoadBoundary><NightForm key={`new-${saves}`} store={store} onDone={done}/>{/* Session AL third pass (GAP-071, GAP-072): nights from a Sleep Cycle, Oura or start/end CSV. */}<SleepCsvImport store={store}/></section>
    {shortNights(sleep, today) && <section className="panel sleep-gentle" aria-label="A gentle word"><p>Your recent nights have been short. That happens, and small steps count. If sleeping stays hard for a while, a doctor or another health professional can help.</p></section>}
    <section className="panel sleep-week" aria-labelledby="sleep-week-title">
      <h2 id="sleep-week-title">Your last 7 days</h2>
      {week ? <dl className="sleep-stats">
        <div><dt>Asleep, on average</dt><dd>{formatMinutes(week.asleep)}{week.estimated ? ' (estimated)' : ''}</dd><dd className="dd-note"><small>{week.nights} {week.nights === 1 ? 'night' : 'nights'} logged</small></dd></div>
        <div><dt>In bed, on average</dt><dd>{formatMinutes(week.inBed)}</dd></div>
        <div><dt>Bedtime · wake time</dt><dd>{formatClock(clockFromNoon(week.bed))} · {formatClock(clockFromMidnight(week.wake))}</dd><dd className="dd-note"><small>averages</small></dd></div>
        <div><dt>Your quality rating</dt><dd>{week.quality !== null ? `${week.quality} of 5` : 'Not rated'}</dd></div>
        <div className="sleep-stat-wide"><dt>Sleep debt</dt><dd>{debt ? debt.minutes > 0 ? formatMinutes(debt.minutes) : `${formatMinutes(-debt.minutes)} ahead` : 'Set a goal'}</dd>{!debt && <dd className="dd-note"><small>Needs your own sleep goal (below).</small></dd>}{/* Session AL fourth pass (C-X3-13): the same nights counted the other way, short nights only (a long night does not cancel one) */}{debt && <dd className="dd-note"><small>Short nights only: {formatMinutes(shortfall(sleep, today))} under your goal (long nights not netted against them).</small></dd>}{debt && <StatHow of="Sleep debt">Your goal ({formatMinutes(debt.goal)}) minus time asleep, added up over the {debt.nights} {debt.nights === 1 ? 'night' : 'nights'} you logged in the last 7 days: a long night makes up for a short one. Nights only: naps are counted in the balance below, marked as naps.</StatHow>}</div>
        {/* Session AJ (item 26): the 14-night balance against the person's own goal, in kind words. */}
        <div className="sleep-stat-wide"><dt>Sleep balance, last 14 days</dt><dd>{balance ? balanceWords(balance, formatMinutes) : sleep.goal ? 'Not yet' : 'Set a goal'}</dd>{!balance && <dd className="dd-note"><small>{sleep.goal ? `Needs at least ${BALANCE_MIN_NIGHTS} logged nights in the last 14 days.` : 'Needs your own sleep goal (below).'}</small></dd>}{(() => { const n = balanceWithNaps(sleep, today); return n ? <dd className="dd-note sleep-balance-naps"><small>With your {n.naps === 1 ? 'nap' : `${n.naps} naps`} counted ({formatMinutes(n.napMinutes)}, each on the day it ended, marked as {n.naps === 1 ? 'a nap' : 'naps'}): {balanceWords(n, formatMinutes).toLowerCase()}.</small></dd> : null; })()}{balance && <StatHow of="Sleep balance">Your time asleep against your goal ({formatMinutes(balance.goal)}), on average over the {balance.nights} nights you logged. Every night is a fresh start.</StatHow>}</div>
        <div className="sleep-stat-wide"><dt>Bedtime consistency</dt><dd>{steady ? `± ${formatMinutes(steady.minutes)}` : 'Not yet'}</dd>{steady ? <StatHow of="Bedtime consistency">How much your bedtimes vary: the standard deviation of {steady.nights} bedtimes in the last 14 days.</StatHow> : <dd className="dd-note"><small>Needs at least 4 logged nights in 14 days.</small></dd>}</div>
        {/* Session AK (4.9): wake-time consistency beside the bedtime one; a steady wake time is the usual first step. */}
        <div className="sleep-stat-wide"><dt>Wake-time consistency</dt><dd>{steadyWake ? `± ${formatMinutes(steadyWake.minutes)}` : 'Not yet'}</dd>{steadyWake ? <StatHow of="Wake-time consistency">How much your wake times vary: the standard deviation of {steadyWake.nights} wake times in the last 14 days.</StatHow> : <dd className="dd-note"><small>Needs at least 4 logged nights in 14 days.</small></dd>}</div>
      </dl> : <p>No night logged in the last 7 days yet.</p>}
      {week && <LoadBoundary quiet><Suspense fallback={null}><SleepR6 part="week-efficiency" sleep={sleep} today={today}/></Suspense></LoadBoundary>}
    </section>
    <SleepScoreCard sleep={sleep} today={today}/>
    <LoadBoundary quiet><Suspense fallback={null}><SleepUsual sleep={sleep} today={today}/></Suspense></LoadBoundary>
    <LoadBoundary quiet><Suspense fallback={null}><HealthR4 part="sleep-timing" sleep={sleep} today={today}/></Suspense></LoadBoundary>
    {/* Session AL fourth pass (MO-022): the fold says its answer on its face (the focus window), not only its name. */}<OnDemandFold className="energy-curve-fold" summary={energyFace(sleep, today)} label="The energy curve"><EnergyCurve sleep={sleep} today={today} now={store.now} zone={store.zone}/></OnDemandFold>
    <section className="panel sleep-charts" aria-labelledby="sleep-charts-title">
      <div className="sleep-charts-head"><h2 id="sleep-charts-title">Over time</h2>
        <div className="sleep-range" role="group" aria-label="Range">{([7, 30, 90, 365] as const).map(r => <button key={r} type="button" className="secondary" aria-pressed={range === r} onClick={() => setRange(r)}>{r === 365 ? '1 year' : `${r} days`}</button>)}</div>
      </div>
      {/* Session AV (owner follow-up 1, F-SLEEP-LONG): 90 days by week and a year by month, as averages (its own chunk). */}
      {range > 30 ? <LoadBoundary quiet><Suspense fallback={<p className="fine" role="status">Opening the longer view…</p>}><SleepLongChart points={points} goal={sleep.goal?.minutes ?? null} by={range === 365 ? 'month' : 'week'}/>
        <SleepQualityTrend points={points} by={range === 365 ? 'month' : 'week'}/><SleepLatencyChart sleep={sleep} today={today} days={range}/></Suspense></LoadBoundary> : <>
      <SleepDurationChart points={points} goal={sleep.goal?.minutes ?? null} usual={usualSleep(sleep, today)?.asleep ?? null}/>
      <SleepTimesChart points={points} window={sleep.goal?.bedFrom && sleep.goal.bedTo ? {from: sleep.goal.bedFrom, to: sleep.goal.bedTo} : null}/>
      <SleepQualityChart points={points}/>
      <LoadBoundary quiet><Suspense fallback={null}><SleepLatencyChart sleep={sleep} today={today} days={range}/></Suspense></LoadBoundary></>}
    </section>
    <section className="panel sleep-patterns" aria-labelledby="sleep-patterns-title">
      <h2 id="sleep-patterns-title">Patterns in your log</h2>
      {patterns.length ? <ul>{patterns.map(p => <li key={p.id}><p>{p.sentence}</p><details><summary>How this is worked out</summary><p className="fine">Average time asleep on the {p.withTag.nights} logged nights with the tag and the {p.without.nights} without it, from {formatDate(p.window.start)} to {formatDate(p.window.end)}. Shown only with at least 14 logged nights and 5 on each side.</p></details></li>)}</ul>
        : <p className="fine">Patterns appear once you have logged at least 14 nights in 60 days, with a tag on at least 5 of them and missing from at least 5 others. They describe your log; they do not explain it.</p>}
    </section>
    <section className="panel" aria-labelledby="sleep-goal-title"><h2 id="sleep-goal-title">Your sleep goal</h2><LoadBoundary quiet><Suspense fallback={null}><SleepX6 part="goal-period" store={store}/></Suspense></LoadBoundary><LoadBoundary quiet><Suspense fallback={null}><SleepNeed store={store} onDone={done}/></Suspense></LoadBoundary><SleepGoalForm key={`goal-${sleep.goal?.updatedAt ?? 'none'}`} store={store} onDone={done}/></section>
    <section className="panel sleep-recent" aria-labelledby="sleep-recent-title">
      <h2 id="sleep-recent-title">Recent nights and naps</h2>
      {/* Session AV lane 2 (P-22): the latest five, then "Show all" (the page was 13,800 px at 390) */}{nights.length ? <ul className="sleep-nights" id="sleep-nights-list">{(allNights ? nights : nights.slice(0, 5)).map(n => <li key={n.id}>
        {editing === n.id ? <NightForm store={store} night={n} onDone={done} onCancel={() => setEditing(null)}/> : <>
          <div><strong>{n.kind === 'nap' ? 'Nap' : 'Night'} ending {formatDate(nightDay(n)!)}</strong><span>{nightLine(n)}</span>{(() => { const e = efficiency(n); return e ? <span className="fine">Asleep {formatMinutes(e.asleep)} of {formatMinutes(e.inBed)} in bed ({e.percent} %){e.estimated ? ', an estimate' : ''}</span> : null; })()}{(n.quality || n.tags?.length) && <span className="fine">{n.quality ? `Quality ${n.quality}/5` : ''}{n.quality && n.tags?.length ? ' · ' : ''}{n.tags?.join(', ')}</span>}{n.source !== 'manual' && n.source !== 'timer' && <span className="fine">From {sourceName(n.source)}</span>}{n.kind !== 'nap' && <LoadBoundary quiet><Suspense fallback={null}><NightDreams night={nightDay(n)!} latest={n.id === latestNight}/></Suspense></LoadBoundary>}</div>
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setEditing(n.id)} aria-label={`Edit the ${n.kind} ending ${formatDate(nightDay(n)!)}`}>Edit</button>
            {confirm === n.id ? <><button type="button" className="secondary" onClick={() => void remove(n.id)}>Delete it</button><button type="button" className="quiet" onClick={() => setConfirm(null)}>Keep it</button></>
              : <button type="button" className="quiet" onClick={() => setConfirm(n.id)} aria-label={`Delete the ${n.kind} ending ${formatDate(nightDay(n)!)}`}>Delete</button>}
          </div>
        </>}
      </li>)}</ul> : <p>No nights yet. Log one above, or tap “I’m going to bed” tonight.</p>}
      {nights.length > 5 && <button type="button" className="text-link sleep-nights-all" aria-controls="sleep-nights-list" aria-expanded={allNights} onClick={() => setAllNights(!allNights)}>{allNights ? 'Show the latest five' : `Show all ${nights.length}`}</button>}
    </section>
    {sleep.nights.some(n => n.tags?.length) && <OnDemandFold className="x6-tags-fold" summary="Rename or remove a sleep tag" label="your sleep tags"><SleepX6 part="tags" store={store}/></OnDemandFold>}
    <p className="fine sleep-privacy">Nothing here is medical advice. Imported nights keep the source they came from.</p>
  </div>;
}

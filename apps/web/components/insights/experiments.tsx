'use client';
import Link from 'next/link';
import {useEffect, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import type {HealthData} from '../../lib/health';
import {OUTCOME_LABELS, factorOptions, outcomeOptions, outcomeText, type CompareSources, type Lag, type OutcomeId} from '../../lib/compare/engine';
import {LABEL_WORDS} from '../../lib/insights/cross-pillar';
import {ENERGY} from '../../lib/energy/schema';
import {JOURNAL} from '../../lib/journal/schema';
import {WORKOUTS} from '../../lib/workouts/schema';
import {readFasting} from '../../lib/fasting/store';
import {wordsOf} from '../../lib/mood-words/schema';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {formatDate} from '../../lib/visual-format';
import {EXPERIMENTS, type Experiment} from '../../lib/experiments/store';
import {DEFAULT_LENGTH, EXPERIMENT_FACTOR_KINDS, EXPERIMENT_LENGTHS, endExperiment, experimentResult, noteExperiment, removeExperiment, startExperiment, type ExperimentResult} from '../../lib/experiments/engine';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHabits} from '../habits/use-habits';
import {EmptyState} from '../ui/empty-state';
import {LazyPillarArt} from '../illustrations/lazy-pillar-art';
import {ShowcaseTag} from '../ui/showcase-tag';
import {SecretGuard} from '../secret-guard/secret-guard';
import './compare/compare.css';
import './experiments.css';

/**
 * Session AK (BUILD list 2 #8, lane B2a): Health → Insights → Experiments, on top of Compare. Pick one change to try (a
 * habit, a sleep or journal tag, workout or fasting days), one outcome and 14, 21 or 28 days; the same number of days
 * just before is the comparison. The card shows the counts first, then — only with Compare's 14 days a side and a clear
 * difference — what happened together, Compare's label, one thing that could explain it and the "Why?". Experiments are
 * kept in zigoals:experiments:v1, written only on the person's taps; results are worked out here each time.
 */
export default function Experiments({health, today}: {health: HealthData; today: string}) {
  const habits = useHabits(), energy = useDeviceRecord(ENERGY), journal = useDeviceRecord(JOURNAL), workouts = useDeviceRecord(WORKOUTS), store = useDeviceRecord(EXPERIMENTS);
  const [fasting, setFasting] = useState<CompareSources['fasting']>(null), [note, setNote] = useState('');
  useEffect(() => { queueMicrotask(() => { try { const r = readFasting(getAppStorage()); setFasting(r.unreadable ? null : r.data); } catch { setFasting(null); } }); }, []);
  const ok = <T,>(r: {loaded: boolean; unreadable: boolean; data: T}) => r.loaded && !r.unreadable ? r.data : null;
  const src: CompareSources = useMemo(() => ({habits: habits.loaded && !habits.error ? habits.data : null, health, energy: ok(energy) ? {days: ok(energy)!.days, words: wordsOf(ok(energy))} : null, journal: ok(journal), workouts: ok(workouts), fasting}),
    [habits.loaded, habits.error, habits.data, health, energy, journal, workouts, fasting]);
  const factors = useMemo(() => factorOptions(src, today).filter(f => EXPERIMENT_FACTOR_KINDS.includes(f.kind)), [src, today]);
  const outcomes = useMemo(() => outcomeOptions(src), [src]);
  const results = useMemo(() => [...store.data.items].reverse().map(x => experimentResult(src, x, today)), [store.data.items, src, today]);
  const write = (change: Parameters<typeof store.update>[0], said: string) => { try { store.update(change); setNote(said); } catch (error) { setNote(error instanceof Error && /At most/.test(error.message) ? error.message : 'This could not be kept on this device. Nothing was changed.'); } };
  if (!habits.loaded || !energy.loaded || !store.loaded) return <p className="fine">Reading your records…</p>;
  const showcase = isShowcase();
  return <div className="experiments">
    {showcase && <p className="fine"><ShowcaseTag/> A fictional example experiment on fictional records.</p>}
    <p>Pick one change, try it for a few weeks, and see what happened alongside it. The same number of days just before is the comparison.</p>
    {results.length > 0 && <ol className="experiments-list" aria-label="Your experiments">{results.map(r => <li key={r.experiment.id}>
      <ExperimentCard result={r} today={today} onEnd={() => write(c => endExperiment(c, r.experiment.id, today), 'Ended today. Its result uses the days so far.')}
        onRemove={() => write(c => removeExperiment(c, r.experiment.id), 'Experiment removed. Your records are unchanged.')}
        onNote={text => write(c => noteExperiment(c, r.experiment.id, text), 'Note kept with the experiment.')}/>
    </li>)}</ol>}
    {!factors.length || !outcomes.length ? <div className="pillar-art-host"><EmptyState title="Nothing to try yet" level={3} action={<Link className="secondary" href="/app/habits">Open Habits</Link>}>
      {!factors.length ? 'Add a habit, or tag your journal entries or nights. ' : ''}{!outcomes.length ? 'Rate your mood or energy, or log sleep or steps. ' : ''}Then try one change here for 14 days and see how your mood, energy or sleep went alongside it, for example “On the days you tried it, your energy averaged 3.8 of 5; on the days before, without it, 3.1 of 5.”
    </EmptyState><LazyPillarArt pillar="health"/></div> : <NewExperiment factors={factors} outcomes={outcomes} today={today} onStart={(input, title) => write(c => startExperiment(c, {...input, id: crypto.randomUUID().replace(/-/g, '').slice(0, 24), start: today}, today), `“${title}” starts today.`)}/>}
    {note && <p className="fine" role="status">{note}</p>}
    <p className="fine">From your own records on this device. What happened together over these weeks, never a cause and not advice.</p>
  </div>;
}

function NewExperiment({factors, outcomes, today, onStart}: {factors: ReturnType<typeof factorOptions>; outcomes: ReturnType<typeof outcomeOptions>; today: string; onStart: (input: {title: string; factor: string; outcome: OutcomeId; lag: Lag; days: number}, title: string) => void}) {
  const id = useId();
  const [factor, setFactor] = useState(factors[0]!.id), [outcome, setOutcome] = useState<OutcomeId>(outcomes[0]!.id), [days, setDays] = useState<number>(DEFAULT_LENGTH), [lag, setLag] = useState<Lag>('same'), [title, setTitle] = useState('');
  const chosen = factors.find(f => f.id === factor) ?? factors[0]!;
  const submit = (event: FormEvent) => { event.preventDefault(); const name = (title.trim() || chosen.label).slice(0, 80); onStart({title: name, factor: chosen.id, outcome, lag, days}, name); setTitle(''); };
  const groups = [...new Set(factors.map(f => f.group))];
  return <form className="experiments-new" onSubmit={submit} aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Start an experiment</h3>
    <div className="compare-form">
      <label className="field"><span>The change to try</span>
        <select value={chosen.id} onChange={e => setFactor(e.target.value)}>
          {groups.map(g => <optgroup key={g} label={g}>{factors.filter(f => f.group === g).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</optgroup>)}
        </select>
      </label>
      <label className="field"><span>What to look at</span>
        <select value={outcome} onChange={e => setOutcome(e.target.value as OutcomeId)}>{outcomes.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
      </label>
      <label className="field"><span>A name — optional</span><input value={title} maxLength={80} placeholder={chosen.label} onChange={e => setTitle(e.target.value)}/></label>
      <div className="compare-lag" role="group" aria-labelledby={`${id}-days`}><span id={`${id}-days`} className="compare-lag-label">For</span>
        {EXPERIMENT_LENGTHS.map(n => <button key={n} type="button" className="secondary" aria-pressed={days === n} onClick={() => setDays(n)}>{n} days</button>)}
      </div>
      <div className="compare-lag" role="group" aria-labelledby={`${id}-lag`}><span id={`${id}-lag`} className="compare-lag-label">Measured</span>
        {(['same', 'next'] as const).map(l => <button key={l} type="button" className="secondary" aria-pressed={lag === l} onClick={() => setLag(l)}>{l === 'same' ? 'The same day' : 'The next day'}</button>)}
      </div>
    </div>
    <p className="fine">Starts today, {formatDate(today)}, and compares with the {days} days before. A result needs 14 days with the change and 14 without, each with {OUTCOME_LABELS[outcome].toLowerCase()} recorded; skipped days simply leave the count.</p>
    <div className="actions"><button type="submit" className="primary">Start the experiment</button></div>
  </form>;
}

function scaleOf(r: ExperimentResult): number {
  if (r.outcome === 'mood' || r.outcome === 'energy') return 5;
  if (r.outcome === 'habits' || r.outcome === 'feeling') return 1;
  return Math.max(r.withValue ?? 0, r.withoutValue ?? 0) * 1.1 || 1;
}
function ExperimentCard({result: r, today, onEnd, onRemove, onNote}: {result: ExperimentResult; today: string; onEnd: () => void; onRemove: () => void; onNote: (text: string) => void}) {
  const x: Experiment = r.experiment, d = r.dates, [text, setText] = useState(x.note ?? ''), [sure, setSure] = useState(false), back = useRef(false);
  const status = d.phase === 'upcoming' ? `Starts ${formatDate(x.start)}` : d.phase === 'running' ? `Day ${d.day} of ${x.days}` : d.endedEarly ? `Ended early, ${formatDate(d.end)}` : `Finished ${formatDate(d.plannedEnd)}`;
  return <article className="compare-card experiment-card" aria-labelledby={`experiment-${x.id}`}>
    <p className="eyebrow">{status}</p>
    <h3 id={`experiment-${x.id}`}>{x.title}</h3>
    <p className="fine">{r.factor?.label ?? 'A change no longer in your records'} · {r.outcome ? OUTCOME_LABELS[r.outcome] : 'an outcome this version does not know'}{x.lag === 'next' ? ' · the next day' : ''} · the {x.days} days before, {formatDate(d.baselineStart)} to {formatDate(d.baselineEnd)}</p>
    {r.state === 'gone' ? <p>{r.why}</p> : <>
      <p className="compare-counts"><strong>{r.withDays}</strong> {r.withDays === 1 ? 'day' : 'days'} with · <strong>{r.withoutDays}</strong> without</p>
      {r.state === 'pending' && <p>{d.phase === 'finished' ? 'Not enough to say.' : 'Not enough days yet.'} A result shows once each side has {r.need} days ({Math.min(r.withDays, r.need)} of {r.need} with, {Math.min(r.withoutDays, r.need)} of {r.need} without).</p>}
      {r.state !== 'pending' && r.outcome && r.withValue !== null && r.withoutValue !== null && <dl className="compare-bars">
        {([['With', r.withValue, r.withDays], ['Before, without', r.withoutValue, r.withoutDays]] as const).map(([side, v, n]) => <div key={side} className="compare-bar-row" data-side={side === 'With' ? 'with' : 'without'}>
          <dt>{side} <span className="fine">({n} days)</span></dt>
          <dd><span className="compare-bar" aria-hidden="true"><i style={{width: `${Math.max(2, Math.min(100, v / scaleOf(r) * 100))}%`}}/></span><span className="compare-bar-value">{outcomeText(r.outcome!, v)}</span></dd>
        </div>)}
      </dl>}
      {r.state === 'unclear' && <p><strong>No clear difference.</strong> Each side has {r.need} days or more, but the two are close: not a finding.</p>}
      {r.state === 'ready' && <>
        <p className="compare-sentence">{r.sentence}</p>
        <p><span className={`compare-label is-${r.label}`}>{LABEL_WORDS[r.label!].label}</span> <span className="fine">{LABEL_WORDS[r.label!].line}</span></p>
      </>}
      {r.confounder && <p className="compare-confounder">Something else could explain it: {r.confounder}.</p>}
      <details className="compare-why"><summary>Why?</summary><p className="fine">{r.why}</p></details>
    </>}
    <details className="experiment-note"><summary>{x.note ? 'Your note' : 'Add a note'}</summary>
      <label className="field"><span>Your note — kept on this device</span><textarea rows={2} maxLength={500} value={text} onChange={e => setText(e.target.value)}/></label>
      <SecretGuard text={text} onRemove={() => setText('')}/>
      <div className="actions"><button type="button" className="secondary" disabled={text.trim() === (x.note ?? '')} onClick={() => onNote(text)}>Keep the note</button></div>
    </details>
    <div className="actions">
      {d.phase === 'running' && today >= x.start && <button type="button" className="secondary" onClick={onEnd}>End it today</button>}
      {/* Session AK (F8, WCAG 2.4.3): the button pressed is replaced, so focus moves to its replacement (the confirm, or
          Remove again after "Keep it") instead of falling to the page. */}
      {sure ? <><button type="button" className="secondary" autoFocus onClick={onRemove}>Remove “{x.title}”</button><button type="button" className="text-link" onClick={() => { back.current = true; setSure(false); }}>Keep it</button></>
        : <button type="button" className="text-link" ref={el => { if (el && back.current) { back.current = false; el.focus(); } }} onClick={() => setSure(true)}>Remove</button>}
    </div>
  </article>;
}

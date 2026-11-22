'use client';
import {useId, useMemo, useState} from 'react';
import {useHabits} from '../../../habits/use-habits';
import {compare, factorOptions, outcomeText, spendOutcomes, type CompareSources, type Lag, type OutcomeId} from '../../../../lib/compare/engine';
import {LABEL_WORDS} from '../../../../lib/insights/cross-pillar';
import type {InsightProps} from './spending-insights';
import '../../../insights/compare/compare.css';

/**
 * Session AV lane 2, round 3 (money; PocketGuard's Financial Wellness, LEDGER #296): Wealth → Spending → "Your money over
 * time" → "Beside your habits": a done habit set beside what was spent that day or the next (all spending, or one
 * category), under Compare's own rules unchanged (lib/compare/engine.ts: the last 90 days, 14 days a side before any
 * number, a clear difference before a finding, never a cause, always one thing that could explain it). Here only habits
 * are factors, so it needs no Health records; Health → Insights → Compare offers the same spending outcomes beside sleep,
 * workouts and the rest, under the Health gate. The choice is not stored here. Its own chunk.
 */
export default function SpendCompareView({entries, today}: InsightProps) {
  const id = useId(), habits = useHabits();
  const src: CompareSources = useMemo(() => ({habits: habits.loaded && !habits.error ? habits.data : null, money: {entries}}), [habits.loaded, habits.error, habits.data, entries]);
  const factors = useMemo(() => factorOptions(src, today).filter(f => f.kind === 'habit'), [src, today]), outcomes = useMemo(() => spendOutcomes(src), [src]);
  const [factor, setFactor] = useState<string | null>(null), [outcome, setOutcome] = useState<string | null>(null), [lag, setLag] = useState<Lag>('same');
  const factorId = factors.find(f => f.id === factor)?.id ?? factors[0]?.id ?? null, outcomeId = (outcomes.find(o => o.id === outcome)?.id ?? outcomes[0]?.id ?? null) as OutcomeId | null;
  const r = useMemo(() => factorId && outcomeId ? compare(src, factorId, outcomeId, lag, today) : null, [src, factorId, outcomeId, lag, today]);
  if (!habits.loaded) return <p className="fine" aria-busy="true">Reading your records…</p>;
  if (!factors.length || !outcomes.length) return <p className="fine">{!factors.length ? 'Add a habit and tick it for a few weeks' : 'Log your spending for a few weeks'}; then this sets the days you did a habit beside what you spent, for example “On days you completed “Walk”, you spent €12.40 that day on average; on other days, €18.10.”</p>;
  return <section className="money-insights-currency compare-explorer" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Beside your habits</h4>
    <div className="compare-form">
      <label className="field"><span>On days with…</span><select value={factorId ?? ''} onChange={e => setFactor(e.target.value)}>{factors.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
      <label className="field"><span>…what was</span><select value={outcomeId ?? ''} onChange={e => setOutcome(e.target.value)}>{outcomes.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      <div className="compare-lag" role="group" aria-labelledby={`${id}-lag`}><span id={`${id}-lag`} className="compare-lag-label">Measured</span>
        {(['same', 'next'] as const).map(l => <button key={l} type="button" className="secondary" aria-pressed={lag === l} onClick={() => setLag(l)}>{l === 'same' ? 'The same day' : 'The next day'}</button>)}
      </div>
    </div>
    {r ? <article className="compare-card" aria-live="polite">
      <p className="compare-counts"><strong>{r.withDays}</strong> {r.withDays === 1 ? 'day' : 'days'} with · <strong>{r.withoutDays}</strong> without</p>
      {r.state === 'pending' && <p>Not enough days yet. A comparison shows once each side has {r.need} days ({Math.min(r.withDays, r.need)} of {r.need} with, {Math.min(r.withoutDays, r.need)} of {r.need} without).</p>}
      {r.state !== 'pending' && r.withValue !== null && r.withoutValue !== null && <p>With: {outcomeText(r.outcome, r.withValue)} · Without: {outcomeText(r.outcome, r.withoutValue)}</p>}
      {r.state === 'unclear' && <p><strong>No clear difference so far.</strong> Each side has {r.need} days or more, but the two are close: not a finding.</p>}
      {r.state === 'ready' && <><p className="compare-sentence">{r.sentence}</p><p><span className={`compare-label is-${r.label}`}>{LABEL_WORDS[r.label!].label}</span> <span className="fine">{LABEL_WORDS[r.label!].line}</span></p></>}
      <p className="compare-confounder">Something else could explain it: {r.confounder}.</p>
      <details className="compare-why"><summary>Why?</summary><p className="fine">{r.why}</p></details>
    </article> : <p className="fine">This choice is no longer in your records. Pick another above.</p>}
    <p className="fine">The last 90 days of your own records; a day with nothing in your money log is left out, never counted as zero. What happened together, never a cause and not advice.</p>
  </section>;
}

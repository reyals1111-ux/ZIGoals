'use client';
import {useEffect, useId, useMemo, useState} from 'react';
import type {HealthData} from '../../../lib/health';
import {COMPARE_PAIR} from '../../../lib/compare/schema';
import {OUTCOMES, compare, factorOptions, outcomeOptions, outcomeText, spendBasis, type CompareResult, type CompareSources, type Lag, type OutcomeId} from '../../../lib/compare/engine';
import {LABEL_WORDS} from '../../../lib/insights/cross-pillar';
import {ENERGY} from '../../../lib/energy/schema';
import {JOURNAL} from '../../../lib/journal/schema';
import {WORKOUTS} from '../../../lib/workouts/schema';
import {MONEY_LOG} from '../../../lib/money-log/schema';
import {readFasting} from '../../../lib/fasting/store';
import {getAppStorage, isShowcase} from '../../../lib/showcase-storage';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useHabits} from '../../habits/use-habits';
import {EmptyState} from '../../ui/empty-state';
import {ShowcaseTag} from '../../ui/showcase-tag';
import './compare.css';
import {wordsOf} from '../../../lib/mood-words/schema';

/**
 * Session AK (lane S, item 2): Health → Insights → Compare. The person picks a factor and an outcome, same day or next
 * day; the page shows the counts first ("12 days with, 31 without"), then — only with 14 days a side and a clear
 * difference — what happened together, its confidence label, one thing that could explain it, and the "Why?". Only the
 * last chosen pair is stored (zigoals:compare-pair:v1), and only when the person changes it.
 */
export default function CompareExplorer({health, today}: {health: HealthData; today: string}) {
  const habits = useHabits(), energy = useDeviceRecord(ENERGY), journal = useDeviceRecord(JOURNAL), workouts = useDeviceRecord(WORKOUTS), money = useDeviceRecord(MONEY_LOG), pair = useDeviceRecord(COMPARE_PAIR);
  const [fasting, setFasting] = useState<CompareSources['fasting']>(null), [note, setNote] = useState(''), id = useId();
  useEffect(() => { queueMicrotask(() => { try { const r = readFasting(getAppStorage()); setFasting(r.unreadable ? null : r.data); } catch { setFasting(null); } }); }, []);
  const ok = <T,>(r: {loaded: boolean; unreadable: boolean; data: T}) => r.loaded && !r.unreadable ? r.data : null;
  const src: CompareSources = useMemo(() => ({habits: habits.loaded && !habits.error ? habits.data : null, health, energy: ok(energy) ? {days: ok(energy)!.days, words: wordsOf(ok(energy))} : null, journal: ok(journal), workouts: ok(workouts), money: ok(money), fasting}),
    [habits.loaded, habits.error, habits.data, health, energy, journal, workouts, money, fasting]);
  const factors = useMemo(() => factorOptions(src, today), [src, today]), outcomes = useMemo(() => outcomeOptions(src), [src]);
  const basis = useMemo(() => spendBasis(src, today), [src, today]);
  const saved = pair.data;
  const factorId = factors.find(f => f.id === saved.factor)?.id ?? factors[0]?.id ?? null;
  const outcomeId = (outcomes.find(o => o.id === saved.outcome)?.id ?? outcomes[0]?.id ?? null) as OutcomeId | null;
  const lag: Lag = saved.lag ?? 'same';
  const [amountText, setAmountText] = useState<string | null>(null);
  const amount = saved.amount ?? basis?.usual;
  const result = useMemo(() => factorId && outcomeId ? compare(src, factorId, outcomeId, lag, today, amount) : null, [src, factorId, outcomeId, lag, today, amount]);
  const choose = (change: Partial<{factor: string; outcome: string; lag: Lag; amount: number}>) => {
    try { pair.update(c => ({...c, factor: factorId ?? undefined, outcome: outcomeId ?? undefined, lag, ...change})); setNote(''); }
    catch { setNote('This choice could not be kept on this device; the comparison still shows.'); }
  };
  if (!habits.loaded || !energy.loaded || !pair.loaded) return <p className="fine">Reading your records…</p>;
  if (!factors.length || !outcomes.length) return <EmptyState title="Nothing to compare yet" level={3}>
    {!factors.length ? 'Add a habit, tag a night or a journal entry, or log a workout, a fast or spending. ' : ''}{!outcomes.length ? 'Rate your mood or energy, or log sleep or steps. ' : ''}After a few weeks, Compare shows what happened on days with one and without it, for example “On days you completed “Walk”, your mood that day averaged 3.9 of 5; on other days, 3.2 of 5.”
  </EmptyState>;
  const groups = [...new Set(factors.map(f => f.group))];
  return <div className="compare-explorer">
    {isShowcase() && <p className="fine"><ShowcaseTag/> Fictional example records.</p>}
    <div className="compare-form">
      <label className="field"><span>On days with…</span>
        <select value={factorId ?? ''} onChange={e => choose({factor: e.target.value})}>
          {groups.map(g => <optgroup key={g} label={g}>{factors.filter(f => f.group === g).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</optgroup>)}
        </select>
      </label>
      {factorId === 'spend' && basis && <label className="field"><span>Spending above ({basis.currency})</span>
        <input inputMode="decimal" value={amountText ?? String(amount ?? '')} onChange={e => setAmountText(e.target.value)} onBlur={() => { const v = Number((amountText ?? '').replace(',', '.')); if (amountText !== null && Number.isFinite(v) && v >= 0) choose({amount: Math.round(v * 100) / 100}); setAmountText(null); }}/>
        <small className="fine">Your usual day: {basis.usual} {basis.currency}. Days with nothing in your money log are left out.</small>
      </label>}
      <label className="field"><span>…what was</span>
        <select value={outcomeId ?? ''} onChange={e => { const v = e.target.value; if ((OUTCOMES as readonly string[]).includes(v)) choose({outcome: v}); }}>
          {outcomes.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </label>
      <div className="compare-lag" role="group" aria-labelledby={`${id}-lag`}><span id={`${id}-lag`} className="compare-lag-label">Measured</span>
        {(['same', 'next'] as const).map(l => <button key={l} type="button" className="secondary" aria-pressed={lag === l} onClick={() => choose({lag: l})}>{l === 'same' ? 'The same day' : 'The next day'}</button>)}
      </div>
    </div>
    {note && <p role="status" className="fine">{note}</p>}
    {result ? <CompareCard result={result}/> : <p className="fine">This choice is no longer in your records. Pick another above.</p>}
    <p className="fine">From your own records on this device, the last 90 days. What happened together, never a cause and not advice.</p>
  </div>;
}

function scaleOf(r: CompareResult): number {
  if (r.outcome === 'mood' || r.outcome === 'energy') return 5;
  if (r.outcome === 'habits' || r.outcome === 'feeling') return 1;
  return Math.max(r.withValue ?? 0, r.withoutValue ?? 0) * 1.1 || 1;
}
function CompareCard({result: r}: {result: CompareResult}) {
  const scale = scaleOf(r);
  return <article className="compare-card" aria-live="polite">
    <p className="compare-counts"><strong>{r.withDays}</strong> {r.withDays === 1 ? 'day' : 'days'} with · <strong>{r.withoutDays}</strong> without</p>
    {r.state === 'pending' && <p>Not enough days yet. A comparison shows once each side has {r.need} days ({Math.min(r.withDays, r.need)} of {r.need} with, {Math.min(r.withoutDays, r.need)} of {r.need} without).</p>}
    {r.state !== 'pending' && r.withValue !== null && r.withoutValue !== null && <dl className="compare-bars">
      {([['With', r.withValue, r.withDays], ['Without', r.withoutValue, r.withoutDays]] as const).map(([side, v, n]) => <div key={side} className="compare-bar-row" data-side={side.toLowerCase()}>
        <dt>{side} <span className="fine">({n} days)</span></dt>
        <dd><span className="compare-bar" aria-hidden="true"><i style={{width: `${Math.max(2, Math.min(100, v / scale * 100))}%`}}/></span><span className="compare-bar-value">{outcomeText(r.outcome, v)}</span></dd>
      </div>)}
    </dl>}
    {r.state === 'unclear' && <p><strong>No clear difference so far.</strong> Each side has {r.need} days or more, but the two are close: not a finding.</p>}
    {r.state === 'ready' && <>
      <p className="compare-sentence">{r.sentence}</p>
      <p><span className={`compare-label is-${r.label}`}>{LABEL_WORDS[r.label!].label}</span> <span className="fine">{LABEL_WORDS[r.label!].line}</span></p>
    </>}
    <p className="compare-confounder">Something else could explain it: {r.confounder}.</p>
    <details className="compare-why"><summary>Why?</summary><p className="fine">{r.why}</p></details>
  </article>;
}

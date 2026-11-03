'use client';
import {useId, useMemo, useState} from 'react';
import type {ForecastPoint} from '../../lib/goal-forecast';
import {PROJECTION_LABEL, pace30, paceSentence, whatIf, whatIfSentence, type ContributionEvery} from '../../lib/goals/what-if';
import {formatDate, formatMoney, formatNumber, isMoneyCurrency} from '../../lib/visual-format';
import './what-if.css';

/** A slider and a number field for the same value, each with its own label (WCAG: both operable, both named). */
function RangeField({label, value, max, step, unit, onChange}: {label: string; value: number; max: number; step: number; unit: string; onChange: (value: number) => void}) {
  const id = useId();
  const set = (raw: string) => { const n = Number(raw); onChange(Number.isFinite(n) && n >= 0 ? Math.min(n, 1_000_000_000) : 0); };
  return <div className="what-if-field">
    <label htmlFor={`${id}-range`}>{label}</label>
    <div className="what-if-inputs">
      <input id={`${id}-range`} type="range" min={0} max={Math.max(max, value)} step={step} value={value} onChange={e => set(e.target.value)} aria-valuetext={`${formatNumber(value)} ${unit}`}/>
      <label className="sr-only" htmlFor={`${id}-number`}>{label}, as a number</label>
      <input id={`${id}-number`} type="number" inputMode="decimal" min={0} step={step} value={value} onChange={e => set(e.target.value)}/>
      <span className="what-if-unit">{unit}</span>
    </div>
  </div>;
}
/** A rounded step for a slider that covers about a twelfth of the target a month. */
export function sliderMax(target: number): {max: number; step: number} {
  const raw = Math.max(1, target / 12), magnitude = 10 ** Math.floor(Math.log10(raw)), max = Math.ceil(raw / magnitude) * magnitude;
  return {max, step: max >= 100 ? Math.max(1, magnitude / 10) : max >= 10 ? 1 : 0.1};
}
/**
 * Session AK (6.2 / Q14): the goal's 30-day pace and the person's own what-ifs, worked out on the page and never stored.
 * Every result is labelled a projection. Lazy-loaded by the lead (components/goals/lazy.tsx).
 */
export function WhatIfPanel({goalName, current, target, points, today, currency, unit = '', targetDate}: {
  goalName: string; current: number; target: number; points: readonly ForecastPoint[]; today: string;
  /** A money goal's currency (amounts then read "€50"); otherwise `unit` follows the number. */
  currency?: string; unit?: string; targetDate?: string;
}) {
  const id = useId();
  const [extra, setExtra] = useState(0), [regularOn, setRegularOn] = useState(false), [regular, setRegular] = useState(0), [every, setEvery] = useState<ContributionEvery>('month');
  const [habitOn, setHabitOn] = useState(false), [perTime, setPerTime] = useState(0), [times, setTimes] = useState(3), [date, setDate] = useState(targetDate ?? '');
  const amount = (n: number) => currency && isMoneyCurrency(currency) ? formatMoney(String(Math.round(n * 100) / 100), currency) : `${formatNumber(n, {maximumFractionDigits: 2})}${unit ? ` ${unit}` : ''}`;
  const unitWord = currency ?? unit;
  const pace = useMemo(() => pace30(points, current, target, today), [points, current, target, today]);
  const result = whatIf({current, target, today, pace}, {extraPerMonth: extra, regular: regularOn ? {amount: regular, every} : null, habit: habitOn ? {perTime, timesPerWeek: times} : null, targetDate: date && date > today ? date : null});
  const {max, step} = sliderMax(target);
  const format = (day: string) => formatDate(day);
  const changed = extra > 0 || (regularOn && regular > 0) || (habitOn && perTime > 0 && times > 0);
  return <section className="what-if" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">What if</p>
    <h3 id={`${id}-title`}>{goalName}</h3>
    <p className="what-if-pace">{paceSentence(pace, format)}{pace.state === 'estimate' || pace.state === 'no-pace' ? ` About ${amount(pace.perMonth ?? 0)} a month lately.` : ''}</p>
    <form className="what-if-form" onSubmit={e => e.preventDefault()}>
      <RangeField label="Extra every month" value={extra} max={max} step={step} unit={unitWord} onChange={setExtra}/>
      <fieldset><legend>A regular amount instead of your recent pace</legend>
        <label className="what-if-check"><input type="checkbox" checked={regularOn} onChange={e => setRegularOn(e.target.checked)}/>Use a regular amount</label>
        {regularOn && <><RangeField label="Amount each time" value={regular} max={max} step={step} unit={unitWord} onChange={setRegular}/>
          <label className="what-if-select">How often<select value={every} onChange={e => setEvery(e.target.value as ContributionEvery)}><option value="week">Every week</option><option value="two-weeks">Every two weeks</option><option value="month">Every month</option></select></label></>}
      </fieldset>
      <fieldset><legend>A habit that adds to it</legend>
        <label className="what-if-check"><input type="checkbox" checked={habitOn} onChange={e => setHabitOn(e.target.checked)}/>Add a habit</label>
        {habitOn && <><RangeField label="What one time adds" value={perTime} max={Math.max(1, max / 4)} step={step} unit={unitWord} onChange={setPerTime}/>
          <RangeField label="Times a week" value={times} max={7} step={1} unit="times" onChange={v => setTimes(Math.min(7, Math.round(v)))}/></>}
      </fieldset>
      <label className="what-if-select">A target date<input type="date" min={today} value={date} onChange={e => setDate(e.target.value)}/></label>
    </form>
    <div className="what-if-result" aria-live="polite">
      {changed ? <p className="what-if-headline">{whatIfSentence(result, format)}</p> : <p className="what-if-headline">Move a slider to see what changes.</p>}
      {result.basis === 'additions-only' && changed && <p className="fine">Your recorded pace is not counted: there is not enough history yet.</p>}
      {result.required && <p>To reach it by {format(date)}: about {amount(result.required.perMonth)} a month ({amount(result.required.perWeek)} a week){result.meetsTargetDate ? '. These changes get you there.' : '.'}</p>}
      <p className="what-if-label">{PROJECTION_LABEL}</p>
    </div>
  </section>;
}
export default WhatIfPanel;

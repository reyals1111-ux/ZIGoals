'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {bmiOf, markCelebrated, milestoneView, reachMilestones, setHeight, toCelebrate, turnOffMilestones, turnOnMilestones} from '../../lib/body-extras/body';
import {BODY_EXTRAS, type Milestones} from '../../lib/body-extras/schema';
import {weightText, type WeightUnit} from '../../lib/health-units';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';
import './body-figures.css';

/**
 * Session AV lane 2 (body; LEDGER #205 Yazio's milestones, #210 its BMI): Health → Weight → "BMI and milestones".
 * - A height the person types gives a BMI figure from the latest reading — the number only: no category word, no ideal
 *   weight, nothing said about health (the no-medical-advice rule).
 * - Opt-in milestones on the way to the Health weight goal (every 2 kg or every 10 % of the way from the latest reading):
 *   each step reached is listed with its day and celebrated once ("Thanks" keeps it). Off until turned on.
 * Every figure carries `data-body-figure`, so "Hide calorie and weight figures" hides it. Kept on this device
 * (zigoals:body-extras:v1). Its own chunk.
 */
export default function BodyFigures({latestGrams, latestDate, goalGrams, unit}: {latestGrams: number | null; latestDate: string | null; goalGrams: number | null; unit: WeightUnit}) {
  const record = useDeviceRecord(BODY_EXTRAS), id = useId(), [note, setNote] = useState('');
  const [height, setHeightText] = useState(''), [step, setStep] = useState<Milestones['step']>('2kg');
  const change = (fn: Parameters<typeof record.update>[0], said?: string) => { try { record.update(fn); if (said) setNote(said); return true; } catch (e) { setNote(plainErrorMessage(e, 'That could not be saved on this device.')); return false; } };
  // What the latest reading has reached, shown at once; it is kept (with its day) when the person says Thanks.
  const preview = useMemo(() => latestGrams !== null && latestDate ? reachMilestones(record.data, latestGrams, latestDate) : record.data, [record.data, latestGrams, latestDate]);
  if (!record.loaded) return null;
  const h = record.data.heightCm, bmi = h && latestGrams !== null ? bmiOf(h, latestGrams) : null, view = milestoneView(preview), cheer = toCelebrate(preview);
  return <section className="panel body-figures" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>BMI and milestones</h2>
    {note && <p className="fine" role="status">{note}</p>}
    {record.unreadable && <p className="notice" role="alert">The height and milestones on this device could not be read. Their bytes are kept; saving writes a new record.</p>}
    <div className="body-figures-bmi">
      <h3>BMI</h3>
      {h ? <>{bmi !== null ? <p className="body-figures-big" data-body-figure=""><strong>{formatNumber(bmi, {maximumFractionDigits: 1})}</strong> <span>from {weightText(latestGrams!, unit)} on {formatDate(latestDate!, {year: false})} and {formatNumber(h, {maximumFractionDigits: 1})} cm</span></p> : <p className="fine">Log a weight and your BMI shows here.</p>}
        <p className="fine">Your weight in kilograms divided by your height in metres, squared. A number only: it says nothing on its own about one person&rsquo;s health, and no range is given here.</p>
        <button type="button" className="quiet" onClick={() => change(r => setHeight(r, null), 'Your height is removed from this device.')}>Remove my height</button></>
      : <form className="body-figures-form" onSubmit={e => { e.preventDefault(); const cm = Number(height.replace(',', '.')); if (change(r => setHeight(r, cm), 'Your height is kept on this device.')) setHeightText(''); }}>
        <label className="field"><span>Your height (cm), for a BMI figure</span><input inputMode="decimal" value={height} onChange={e => setHeightText(e.target.value)} placeholder="175"/></label>
        <button type="submit" className="secondary">Save my height</button>
      </form>}
    </div>
    <div className="body-figures-steps">
      <h3>Milestones on the way to your goal</h3>
      {goalGrams === null ? <p className="fine">Set a weight goal (Health → Targets) and milestones can mark the way: every 2 kg, or every tenth of it.</p>
        : !view ? (latestGrams === null ? <p className="fine">Log a weight first: the way starts at your latest reading.</p> : <form className="body-figures-form" onSubmit={e => { e.preventDefault(); change(r => turnOnMilestones(r, {step, startGrams: latestGrams, goalGrams, today: latestDate ?? new Date().toISOString().slice(0, 10)}), 'Milestones are on. Each step you reach is marked once.'); }}>
          <fieldset><legend>Mark a step</legend>
            <label className="body-figures-radio"><input type="radio" name={`${id}-step`} checked={step === '2kg'} onChange={() => setStep('2kg')}/>Every {weightText(2000, unit)}</label>
            <label className="body-figures-radio"><input type="radio" name={`${id}-step`} checked={step === '10pct'} onChange={() => setStep('10pct')}/>Every 10 % of the way</label>
          </fieldset>
          <p className="fine" data-body-figure="">From {weightText(latestGrams, unit)} to your goal of {weightText(goalGrams, unit)}. Off until you turn them on; a step back is never a second celebration.</p>
          <button type="submit" className="secondary">Turn on milestones</button>
        </form>)
        : <>
          {cheer.length > 0 && <p className="body-figures-cheer" role="status"><span aria-hidden="true">★ </span>{cheer.length === 1 ? 'A milestone reached' : `${cheer.length} milestones reached`}: {cheer.map(c => view.marks.find(k => k.index === c.index)).filter(Boolean).map(k => <span key={k!.index} data-body-figure="">{weightText(k!.grams, unit)} </span>)}. Step by step.
            {' '}<button type="button" className="text-link" onClick={() => change(r => markCelebrated(latestGrams !== null && latestDate ? reachMilestones(r, latestGrams, latestDate) : r, new Date()))}>Thanks</button></p>}
          <p className="fine">{view.done} of {view.total} steps reached{view.next ? '' : ': the goal itself'}.</p>
          <ol className="body-figures-marks">{view.marks.map(k => <li key={k.index} data-reached={k.reached ? '' : undefined}><span data-body-figure="">{weightText(k.grams, unit)}</span> <small>{k.reached ? `reached ${formatDate(k.reached, {year: false})}` : k === view.next ? 'next' : ''}</small></li>)}</ol>
          <button type="button" className="quiet" onClick={() => change(turnOffMilestones, 'Milestones are off. Turn them on again any time.')}>Turn milestones off</button>
        </>}
    </div>
  </section>;
}

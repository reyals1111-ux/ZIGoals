'use client';
import {useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {energyEstimate, suggestedTarget, ENERGY_MIN_LOGGED_DAYS, ENERGY_MIN_WEIGHTS} from '../../lib/health-aa/energy';
import {setHealthTargets, type HealthData} from '../../lib/health';
import {weightChangeText, type WeightUnit} from '../../lib/health-units';
import type {HealthPerform} from './aa-types';
import './health-aa.css';

/**
 * N1: the adaptive energy estimate (MacroFactor-style): expenditure from logged intake and the trend weight over a
 * rolling 28 days, with a band; "needs about two weeks of logs" until then; an optional calorie-target adjustment that
 * writes only after the person confirms. Always "an estimate, not medical advice".
 */
export function EnergyCard({data, today, unit, perform}: {data: HealthData; today: string; unit: WeightUnit; perform: HealthPerform}) {
  const e = energyEstimate(data, today), [pace, setPace] = useState<'-0.5' | '-0.25' | '0' | '0.25'>('0'), [confirm, setConfirm] = useState(false);
  const kcal = suggestedTarget(e, Number(pace));
  return <section id="health-energy" className="panel health-aa-card" aria-labelledby="energy-title">
    <p className="eyebrow">Adaptive</p><h2 id="energy-title"><NebulaFlow identity="energy-title">Energy estimate</NebulaFlow></h2>
    {!e.ready ? <><p className="health-empty-inline">Needs about two weeks of logs: {e.loggedDays} of {ENERGY_MIN_LOGGED_DAYS} logged days and {e.weights} of {ENERGY_MIN_WEIGHTS} weight readings in the last {e.windowDays} days so far.</p><span className="health-estimate-tag">an estimate, not medical advice</span></> : <>
      <p className="health-big">{e.expenditure}<small>kcal a day, about {e.low}–{e.high}</small></p>
      <dl className="health-aa-facts"><div><dt>Logged intake</dt><dd>{e.meanIntake} kcal/day</dd></div><div><dt>Trend change</dt><dd>{weightChangeText(Math.round((e.weeklyChangeGrams ?? 0) / 100) * 100, unit)}/week</dd></div><div><dt>Read</dt><dd>{e.loggedDays} days · {e.weights} weights</dd></div></dl>
      <span className="health-estimate-tag">an estimate, not medical advice</span>
      <details><summary className="fine" style={{cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center'}}>Adjust my calorie target from this estimate</summary>
        <div className="health-aa-card" style={{padding: 12}}><label className="field"><span>Pace</span><select value={pace} onChange={ev => { setPace(ev.target.value as typeof pace); setConfirm(false); }}><option value="-0.5">Lose about 0.5 kg a week</option><option value="-0.25">Lose about 0.25 kg a week</option><option value="0">Hold my weight</option><option value="0.25">Gain about 0.25 kg a week</option></select></label>
          {kcal !== null && <p>Suggested target: <strong>{kcal} kcal</strong> a day{data.targets.kcal !== null ? ` (now ${data.targets.kcal})` : ''}.</p>}
          {!confirm ? <div className="actions"><button type="button" className="secondary" disabled={kcal === null} onClick={() => setConfirm(true)}>Use this target…</button></div> : <div className="actions"><button type="button" className="primary" onClick={() => { void perform(latest => setHealthTargets(latest, {...latest.targets, kcal}), `Calorie target set to ${kcal} kcal a day from the estimate.`); setConfirm(false); }}>Confirm {kcal} kcal</button><button type="button" className="quiet" onClick={() => setConfirm(false)}>Cancel</button></div>}
          <p className="fine">Nothing changes until you confirm; your other targets stay as they are.</p></div></details>
    </>}
    <p className="fine">Expenditure ≈ your logged intake minus what the trend weight change accounts for (7,700 kcal per kg), over the last {e.windowDays} days.</p>
  </section>;
}

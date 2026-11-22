'use client';
import {useState} from 'react';
import {formatNumber} from '../../lib/visual-format';
import {NebulaFlow} from '../nebula-flow';
import {energyEstimate, scaledTargets, suggestedTarget} from '../../lib/health-aa/energy';
import {energyProgress} from '../../lib/health-aa/energy-progress';
import {setHealthTargets, type HealthData} from '../../lib/health';
import {weightChangeText, type WeightUnit} from '../../lib/health-units';
import type {HealthPerform} from './aa-types';
import './health-aa.css';
import {ArtNote} from '../illustrations/art-note';
import {useDeviceRecord} from '../ai/use-device-record';
import {FOOD_PLUS, foodPlusSchema} from '../../lib/food-plus/schema';

/**
 * N1: the adaptive energy estimate (MacroFactor-style): expenditure from logged intake and the trend weight over a
 * rolling 28 days, with a band; "needs about two weeks of logs" until then; an optional calorie-target adjustment that
 * writes only after the person confirms. Always "an estimate, not medical advice".
 */
export function EnergyCard({data, today, unit, perform}: {data: HealthData; today: string; unit: WeightUnit; perform: HealthPerform}) {
  // Session AV lane 2 (food, LEDGER #106, #107): the chosen pace is kept on this device, so the weekly coach and the goal
  // date use it; days marked "partly logged" in the Diary are left out of the estimate.
  const plus = useDeviceRecord(FOOD_PLUS), stored = plus.loaded && !plus.unreadable ? plus.data : null;
  const partial = new Set(stored?.checkIn?.partial ?? []), e = energyEstimate(data, today, partial), [chosenPace, setPace] = useState<'-0.5' | '-0.25' | '0' | '0.25' | null>(null), [confirm, setConfirm] = useState(false);
  const pace = chosenPace ?? ((['-0.5', '-0.25', '0', '0.25'] as const).find(p => Number(p) === stored?.pace) ?? '0');
  const keepPace = (value: typeof pace) => { setPace(value); setConfirm(false); try { plus.update(r => foodPlusSchema.parse({...r, pace: Number(value)})); } catch { /* the choice still shows; only the coach's copy is not kept */ } };
  const kcal = suggestedTarget(e, Number(pace)), waiting = energyProgress(e);
  return <section id="health-energy" className="panel health-aa-card" aria-labelledby="energy-title">
    <p className="eyebrow">Adaptive</p><h2 id="energy-title"><NebulaFlow identity="energy-title">Maintenance estimate</NebulaFlow>{/* Session AL (P-DV-120, DV-280): not "Energy", which the Journal uses for how you feel */}</h2>
    {e.implausible ? <><p className="health-empty-inline">Your logs for the last {e.windowDays} days look incomplete (an average intake under 800 or over 6,000 kcal, or a weight trend faster than 1.5 kg a week), so no estimate is shown. Check the diary and weights.</p><span className="health-estimate-tag">an estimate, not medical advice</span></> : !e.ready ? <><ArtNote pillar="health"><p className="health-empty-inline">{/* Session AL (P-PR-23, PR-020/PR-097): the same count as the coach and the highlight tile ("27 of 14 logged days" read as missing days) */}Needs about two weeks of logs: {waiting.figure} so far, {waiting.note}.</p></ArtNote><span className="health-estimate-tag">an estimate, not medical advice</span></> : <>
      <p className="health-big" data-body-figure="">{e.expenditure}<small>kcal a day, about {e.low}–{e.high}</small></p>
      <dl className="health-aa-facts"><div><dt>Logged intake</dt><dd data-body-figure="">{e.meanIntake === null ? null : formatNumber(e.meanIntake)} kcal/day</dd></div><div><dt>Trend change</dt><dd data-body-figure="">{weightChangeText(Math.round((e.weeklyChangeGrams ?? 0) / 100) * 100, unit)}/week</dd></div><div><dt>Read</dt><dd>{e.loggedDays} days · {e.weights} weights</dd></div></dl>
      <span className="health-estimate-tag">an estimate, not medical advice</span>
      <details><summary className="fine" style={{cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center'}}>Adjust my calorie target from this estimate</summary>
        <div className="health-aa-card" style={{padding: 12}}><label className="field"><span>Pace</span><select value={pace} onChange={ev => keepPace(ev.target.value as typeof pace)}><option value="-0.5">Lose about 0.5 kg a week</option><option value="-0.25">Lose about 0.25 kg a week</option><option value="0">Hold my weight</option><option value="0.25">Gain about 0.25 kg a week</option></select></label>
          {kcal !== null && <p data-body-figure="">Suggested target: <strong>{formatNumber(kcal)} kcal</strong> a day{data.targets.kcal !== null ? ` (now ${data.targets.kcal})` : ''}.</p>}
          {!confirm ? <div className="actions"><button type="button" className="secondary" disabled={kcal === null} onClick={() => setConfirm(true)}>Use this target…</button></div> : <div className="actions"><button type="button" className="primary" onClick={() => { void perform(latest => setHealthTargets(latest, scaledTargets(latest.targets, kcal!)), `Calorie target set to ${kcal} kcal a day from the estimate.`); setConfirm(false); }}>Confirm {kcal} kcal</button><button type="button" className="quiet" onClick={() => setConfirm(false)}>Cancel</button></div>}
          <p className="fine">Nothing changes until you confirm; your other targets stay as they are.</p></div></details>
    </>}
    {(() => { const first = new Date(Date.parse(`${today}T12:00:00Z`) - (e.windowDays - 1) * 86_400_000).toISOString().slice(0, 10), n = [...partial].filter(d => d >= first && d <= today).length; return n ? <p className="fine">{n} {n === 1 ? 'day' : 'days'} marked partly logged in the Diary {n === 1 ? 'is' : 'are'} left out of this estimate.</p> : null; })()}
    <p className="fine">Expenditure ≈ your logged intake minus what the trend weight change accounts for <span data-body-figure="">(7,700 kcal per kg)</span>, over the last {e.windowDays} days.</p>
  </section>;
}

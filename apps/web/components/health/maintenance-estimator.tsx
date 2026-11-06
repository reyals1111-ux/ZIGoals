'use client';
import {useState} from 'react';
import {ACTIVITY_LEVELS, maintenanceEstimate, maintenanceIssue, type ActivityLevel, type Sex} from '../../lib/health-maintenance';
import {parseNumberInput} from '../../lib/numbers/parse';
import {formatNumber} from '../../lib/visual-format';
import type {WeightUnit} from '../../lib/health-units';

/**
 * Session AL fourth pass (C-MO-04, C-DVG-42): Targets → "Estimate my maintenance calories". Nothing is kept: the inputs
 * live in this fold only, and "Use … as my calorie target" (the person's own choice) is the one write.
 */
export function MaintenanceEstimator({latestGrams, weightUnit, onUse}: {latestGrams: number | null; weightUnit: WeightUnit; onUse: (kcal: number) => void}) {
  const shownWeight = latestGrams === null ? '' : String(Math.round((weightUnit === 'lb' ? latestGrams / 453.59237 : latestGrams / 1000) * 10) / 10);
  const [sex, setSex] = useState<Sex>('unsaid'), [age, setAge] = useState(''), [height, setHeight] = useState(''), [heightUnit, setHeightUnit] = useState<'cm' | 'in'>(weightUnit === 'lb' ? 'in' : 'cm'), [weight, setWeight] = useState(shownWeight), [activity, setActivity] = useState<ActivityLevel>('light');
  const [result, setResult] = useState<{kcal: number; resting: number} | null>(null), [issue, setIssue] = useState('');
  const read = (text: string) => { const p = parseNumberInput(text); return p.ok ? p.value : NaN; };
  function estimate() {
    const input = {sex, ageYears: read(age), heightCm: read(height) * (heightUnit === 'in' ? 2.54 : 1), weightKg: read(weight) * (weightUnit === 'lb' ? 0.45359237 : 1), activity};
    const why = maintenanceIssue(input);
    if (why) { setIssue(why); setResult(null); return; }
    setIssue(''); setResult(maintenanceEstimate(input));
  }
  return <form className="health-form health-maintenance" aria-label="Estimate my maintenance calories" noValidate onSubmit={e => { e.preventDefault(); estimate(); }}>
    <p className="fine">An estimate from a common equation (Mifflin–St Jeor) and how active you are. It is not a recommendation, and nothing here is kept unless you choose to use the figure as your target.</p>
    <div className="health-form-grid">
      <label className="field"><span>Sex for the equation</span><select value={sex} onChange={e => setSex(e.target.value as Sex)}><option value="unsaid">Rather not say (midpoint)</option><option value="female">Female</option><option value="male">Male</option></select></label>
      <label className="field"><span>Age (years)</span><input type="text" inputMode="numeric" autoComplete="off" value={age} onChange={e => setAge(e.target.value)} /></label>
      <label className="field"><span>Height ({heightUnit})</span><input type="text" inputMode="decimal" autoComplete="off" value={height} onChange={e => setHeight(e.target.value)} /></label>
      <label className="field"><span>Height unit</span><select value={heightUnit} onChange={e => setHeightUnit(e.target.value as 'cm' | 'in')}><option value="cm">cm</option><option value="in">in</option></select></label>
      <label className="field"><span>Weight ({weightUnit})</span><input type="text" inputMode="decimal" autoComplete="off" value={weight} onChange={e => setWeight(e.target.value)} /></label>
      <label className="field"><span>How active you are</span><select value={activity} onChange={e => setActivity(e.target.value as ActivityLevel)}>{ACTIVITY_LEVELS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
    </div>
    {issue && <p className="field-error" role="alert">{issue}</p>}
    <div className="actions"><button type="submit" className="secondary">Estimate</button></div>
    {result && <div role="status"><p><strong>About {formatNumber(result.kcal)} kcal a day</strong> keeps your weight about steady <span className="health-estimate-tag">an estimate</span> (resting about {formatNumber(result.resting)} kcal). Your own logs refine it in the Weight view’s Maintenance estimate. Information, not advice.</p>
      <button type="button" className="quiet" onClick={() => onUse(result.kcal)}>Use {formatNumber(result.kcal)} kcal as my calorie target</button></div>}
  </form>;
}

'use client';
import {useId, useMemo, useState} from 'react';
import {formatHealthGrams, newHealthId, type HealthData} from '../../../lib/health';
import {applyFitPlan, fitCandidates, fitPlans} from '../../../lib/food-plus/fit-plan';
import {useDayTargets} from './use-day-targets';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {ArtNote} from '../../illustrations/art-note';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #89; MyFitnessPal's Meal Planner): Health → Planner → "Plan a day that fits my
 * targets": breakfast, lunch and dinner from your own recipes, at ½ to 2 servings, chosen together to come closest to
 * the day's calorie target and the macro targets you set (a weekday's own targets count). "Another plan" shows the next
 * best; "Plan this day" writes ordinary plans (logged only when eaten), so the grocery list follows. Never advice.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
const g = (mg: number | null) => mg === null ? '?' : formatNumber(Math.round(mg / 1000));
export default function FitPlan({data, date, perform}: {data: HealthData; date: string; perform: Perform}) {
  const id = useId(), [day, setDay] = useState(date), [shown, setShown] = useState(0);
  const {targets} = useDayTargets(data.targets, day);
  const plans = useMemo(() => fitPlans(data, targets), [data, targets.kcal, targets.proteinMg, targets.carbsMg, targets.fatMg]); // eslint-disable-line react-hooks/exhaustive-deps -- the targets object is new each render; its four values are what count
  const candidates = fitCandidates(data).length;
  if (!targets.kcal) return <ArtNote pillar="health"><p className="health-empty-inline">Set a calorie target in Targets first (or one for this weekday); the plan is chosen to come close to it.</p></ArtNote>;
  if (candidates < 3) return <ArtNote pillar="health"><p className="health-empty-inline">Save at least three recipes whose calories are known ({candidates} so far). Foods &amp; recipes → “Recipes to start from” has twenty to begin with.</p></ArtNote>;
  const plan = plans[shown % Math.max(1, plans.length)]!;
  const off = plan.kcal - targets.kcal;
  return <div className="food-plus-card">
    <div className="food-plus-row">
      <label className="field"><span>Day to plan</span><input type="date" value={day} onChange={e => { if (e.target.value) { setDay(e.target.value); setShown(0); } }}/></label>
    </div>
    <p className="fine">From {candidates} of your recipes with known calories. Your targets for {formatDate(day)}: {formatNumber(targets.kcal)} kcal{targets.proteinMg ? ` · protein ${g(targets.proteinMg)} g` : ''}{targets.carbsMg ? ` · carbs ${g(targets.carbsMg)} g` : ''}{targets.fatMg ? ` · fat ${g(targets.fatMg)} g` : ''}.</p>
    <div className="food-plus-table-frame" tabIndex={0} role="region" aria-label={`Plan ${(shown % plans.length) + 1} of ${plans.length} for ${formatDate(day)}`}>
      <table className="food-plus-table"><caption className="sr-only">A day that fits your targets, plan {(shown % plans.length) + 1} of {plans.length}</caption>
        <thead><tr><th scope="col">Meal</th><th scope="col">Recipe</th><th scope="col">Servings</th><th scope="col">kcal</th><th scope="col">P / C / F (g)</th></tr></thead>
        <tbody>{plan.picks.map(p => <tr key={p.meal}><th scope="row">{p.meal}</th><td>{p.recipe.name}</td><td>{formatHealthGrams(p.portionsMilli)}</td><td data-body-figure="">{formatNumber(p.kcal)}</td><td data-body-figure="">{g(p.proteinMg)} / {g(p.carbsMg)} / {g(p.fatMg)}</td></tr>)}
          <tr><th scope="row">Day</th><td colSpan={2}>{Math.abs(off) <= targets.kcal * 0.05 ? 'Within 5 % of your target' : off > 0 ? `${formatNumber(off)} kcal over your target` : `${formatNumber(-off)} kcal under your target`}</td><td data-body-figure="">{formatNumber(plan.kcal)}</td><td data-body-figure="">{g(plan.proteinMg)} / {g(plan.carbsMg)} / {g(plan.fatMg)}</td></tr></tbody>
      </table>
    </div>
    <div className="food-plus-row">
      <button type="button" className="primary" aria-describedby={`${id}-note`} onClick={() => void perform(latest => applyFitPlan(latest, plan, day, new Date().toISOString(), newHealthId), `${formatDate(day)} planned: ${plan.picks.map(p => p.recipe.name).join(', ')}. Log each when you eat it.`)}>Plan this day</button>
      {plans.length > 1 && <button type="button" className="secondary" onClick={() => setShown(n => n + 1)}>Another plan</button>}
    </div>
    <p className="fine" id={`${id}-note`}>Plans are separate from your diary and show in the week above and its grocery list. Your own targets and recipes; never advice.</p>
  </div>;
}

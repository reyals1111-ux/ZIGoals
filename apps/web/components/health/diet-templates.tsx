'use client';
import {useId, useMemo, useState} from 'react';
import {showToast} from '../ui/undo-toast';
import {formatDate, formatWeekday} from '../../lib/visual-format';
import type {HealthData} from '../../lib/health';
import {DIET_TEMPLATES, TEMPLATE_FOODS, type DietTemplate, type FoodKey} from '../../lib/diet-templates/templates';
import {applyTemplate, dayKcal, resolveTemplateFoods, templatePreview, undoTemplate, type Added, type GenericFood} from '../../lib/diet-templates/apply';
import type {HealthPerform} from './aa-types';
import './diet-templates.css';

/**
 * Session AK (COMPETITORS.md N6, item 20): fill a planner week from a diet-style template (Mediterranean, high-protein,
 * vegetarian): plain authored meals of generic foods from the offline library. The person chooses and reviews the week
 * first; nothing is written until "Add to this week". The plans carry a "template" label, the grocery list follows from
 * them as always, and Undo takes back exactly what was added. Loaded when the planner's fold opens.
 */
type Loaded = {foods: Partial<Record<FoodKey, GenericFood>>; missing: FoodKey[]};
export default function DietTemplates({data, anyDay, perform}: {data: HealthData; anyDay: string; perform: HealthPerform}) {
  const id = useId(), [choice, setChoice] = useState<DietTemplate['id']>('mediterranean'), [loaded, setLoaded] = useState<Loaded | null>(null);
  const [state, setState] = useState<{kind: 'idle'} | {kind: 'busy'; line: string} | {kind: 'problem'; line: string}>({kind: 'idle'});
  const template = DIET_TEMPLATES.find(t => t.id === choice)!;
  const preview = useMemo(() => templatePreview(template, anyDay), [template, anyDay]);
  const weekWords = `${formatDate(`${preview.weekStart}T12:00:00Z`, {weekday: true, timeZone: 'UTC'})} to ${formatDate(`${preview.days[6]!.date}T12:00:00Z`, {weekday: true, timeZone: 'UTC'})}`;
  const day = (date: string) => formatWeekday(`${date}T12:00:00Z`, {timeZone: 'UTC'});
  async function foods(): Promise<Loaded> {
    if (loaded) return loaded;
    setState({kind: 'busy', line: 'Opening the food library on this device…'});
    const {loadGenericLibrary} = await import('../../lib/food-generic/load');
    const {sources} = await loadGenericLibrary();
    const out = resolveTemplateFoods(Object.keys(TEMPLATE_FOODS) as FoodKey[], sources);
    setLoaded(out);
    return out;
  }
  async function add() {
    try {
      const lib = await foods();
      const need = preview.foods.filter(k => !lib.foods[k]);
      if (need.length) { setState({kind: 'problem', line: 'The food library could not be opened completely on this device, so nothing was added. Check your connection and try again.'}); return; }
      setState({kind: 'busy', line: 'Adding the week to your planner…'});
      let added: Added | null = null;
      const said = `${template.name} template added to the week of ${weekWords}. Nothing is logged as eaten until you tap Log.`;
      await perform(latest => { const r = applyTemplate(latest, template, anyDay, lib.foods, new Date().toISOString()); added = r.added; return r.data; }, said, () => {
        const what = added!;
        showToast({message: said, undoLabel: `Undo the ${template.name} template`, undone: 'The template’s plans are removed; anything already logged stays.', undo: () => perform(latest => undoTemplate(latest, what).data, 'The template’s plans are removed.')});
      });
      setState({kind: 'idle'});
    } catch (e) { setState({kind: 'problem', line: e instanceof Error && e.message ? e.message : 'The template could not be added. Nothing was changed.'}); }
  }
  const busy = state.kind === 'busy', inLibrary = (key: FoodKey) => { const f = loaded?.foods[key]; return !!f && data.foods.some(x => x.name === f.name.slice(0, 120) && x.brand === f.sourceName.slice(0, 80)); };
  return <section className="diet-templates" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Fill the week from a template</h3>
    <fieldset className="diet-templates-choice"><legend className="fine">Choose a style</legend>
      {DIET_TEMPLATES.map(t => <label key={t.id} className="diet-templates-option"><input type="radio" name={`${id}-t`} value={t.id} checked={choice === t.id} onChange={() => setChoice(t.id)}/><span><strong>{t.name}</strong> <small className="fine">{t.about}</small></span></label>)}
    </fieldset>
    <p className="fine">The week of {weekWords}: breakfast, lunch, dinner and a snack each day, {preview.foods.length} plain foods from the offline food library (Ciqual, ANSES). Portions are a starting point to change; this is information, not advice.</p>
    <details className="diet-templates-review" open><summary>Review the week</summary>
      <ol className="diet-templates-days">{preview.days.map(d => { const kcal = loaded ? dayKcal(d.slots.map(s => s.dish), loaded.foods) : null; return <li key={d.date}>
        <strong>{day(d.date)}</strong>{kcal !== null && <small className="fine"> · about {kcal} kcal (typical values, an estimate)</small>}
        <ul>{d.slots.map(s => <li key={s.meal}><span className="fine">{s.meal}:</span> {s.dish.name} <small className="fine">({s.dish.items.map(([, g]) => g).reduce((a, b) => a + b, 0)} g in all)</small></li>)}</ul>
      </li>; })}</ol>
      {loaded && <p className="fine">{preview.foods.filter(k => !inLibrary(k)).length} of these foods are new to your library and will be added to it. Each meal is saved with “· {template.name} template” in its name.</p>}
    </details>
    <div className="actions"><button type="button" className="primary" disabled={busy} onClick={() => void add()}>Add to this week</button>
      {!loaded && <button type="button" className="quiet" disabled={busy} onClick={() => { void foods().then(() => setState({kind: 'idle'}), () => setState({kind: 'problem', line: 'The food library could not be opened on this device. Check your connection and try again.'})); }}>Show amounts</button>}</div>
    <div aria-live="polite">{state.kind === 'busy' && <p className="fine">{state.line}</p>}{state.kind === 'problem' && <p role="alert">{state.line}</p>}</div>
    <p className="fine">Nothing is written until you add it. You can undo right after, and remove any single plan in the week above.</p>
  </section>;
}

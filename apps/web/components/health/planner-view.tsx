'use client';
import {useEffect, useRef, useState} from 'react';
import {entranceAllowed} from '../use-entrance';
import {NebulaFlow} from '../nebula-flow';
import {GlassBar} from '../progress/glass-progress';
import {useDeviceRecord} from '../ai/use-device-record';
import {planFromFood, planFromRecipe, weekPlan, type Meal} from '../../lib/health-aa/planner';
import {AISLES, AISLES_RECORD, groupByAisle, setAisle} from '../../lib/health-aa/aisles';
import {groceryList, logMealPlan, removeMealPlan, saveGroceryEdit} from '../../lib/health-daily';
import {HEALTH_MEALS, formatNutrient, type HealthData} from '../../lib/health';
import {addLocalDays} from '../../lib/local-date';
import {formatDate} from '../../lib/visual-format';
import {zigiSignals} from '../zigi/bus';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import type {HealthPerform} from './aa-types';
import './health-aa.css';

/**
 * N5: the meal planner as a week grid (Monday first) with a slot per meal: plan a recipe or a food into it, log it in one
 * tap, remove it; and the grocery list built from the week's plans, grouped by aisle (a keyword default the person can
 * change, on this device), with check-off. All through the existing plan, grocery-edit and log mutators.
 */
export function PlannerView({data, date, today, perform}: {data: HealthData; date: string; today: string; perform: HealthPerform}) {
  const [anchor, setAnchor] = useState(date), week = weekPlan(data, anchor), [slot, setSlot] = useState<{date: string; meal: Meal} | null>(null);
  const [kind, setKind] = useState<'recipe' | 'food'>(data.recipes.length ? 'recipe' : 'food'), [source, setSource] = useState(''), [servings, setServings] = useState('1');
  const aisles = useDeviceRecord(AISLES_RECORD), aisleRecord = aisles.loaded && !aisles.unreadable ? aisles.data : {version: 1 as const};
  const from = week.days[0]!, to = week.days[6]!;
  let groceries: ReturnType<typeof groceryList> = []; try { groceries = groceryList(data, from, to); } catch { /* an invalid range has no list */ }
  const grouped = groupByAisle(groceries, aisleRecord), bought = groceries.filter(g => g.checked).length;
  const now = () => new Date().toISOString();
  function plan() {
    if (!slot || !source) return;
    const q = Math.round(Number(servings.replace(',', '.')) * 1000); if (!Number.isFinite(q) || q <= 0) return;
    void perform(latest => kind === 'recipe' ? planFromRecipe(latest, source, slot.date, slot.meal, now()) : planFromFood(latest, source, q, slot.date, slot.meal, now()), 'Meal planned; nothing logged as eaten.', () => { setSlot(null); setSource(''); });
  }
  const dayLabel = (d: string) => `${formatDate(`${d}T12:00:00`, {weekday: 'short'})} ${Number(d.slice(-2))}`;
  // Phase 2, Part 5 (owner request 33): on a phone the week is a day swiper — one day per screen, snapping — with a row of
  // day chips to jump; it opens on today (or the week's first day). Computers keep the seven-column grid.
  const weekRef = useRef<HTMLDivElement>(null);
  const show = (d: string, smooth = true) => { const row = weekRef.current, day = row?.querySelector<HTMLElement>(`[data-day="${d}"]`); if (!day || !row) return; const left = row.scrollLeft + day.getBoundingClientRect().left - row.getBoundingClientRect().left - parseFloat(getComputedStyle(row).paddingLeft || '0'); row.scrollTo({left, behavior: smooth && entranceAllowed() ? 'smooth' : 'auto'}); };
  useEffect(() => { if (typeof matchMedia === 'function' && matchMedia('(max-width: 767.98px)').matches) show(week.days.includes(today) ? today : week.days[0]!, false); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);
  return <div className="health-planner">
    <section className="panel health-aa-card" aria-labelledby="planner-title">
      <div className="habit-section-heading"><div><p className="eyebrow">A little preparation</p><h2 id="planner-title"><NebulaFlow identity="planner-title">Meal planner</NebulaFlow></h2></div><div className="habit-year-nav"><button type="button" className="quiet" aria-label="Previous week" onClick={() => setAnchor(addLocalDays(anchor, -7))}>←</button><strong>{dayLabel(from)} – {dayLabel(to)}</strong><button type="button" className="quiet" aria-label="Next week" onClick={() => setAnchor(addLocalDays(anchor, 7))}>→</button></div></div>
      <div className="health-planner-days" role="group" aria-label="Jump to a day">{week.days.map(d => <button key={d} type="button" className="quiet" aria-current={d === today ? 'date' : undefined} onClick={() => show(d)}>{dayLabel(d)}</button>)}</div>
      <div className="health-planner-week" ref={weekRef}>{week.days.map(d => <div key={d} className="health-planner-day" data-day={d} data-today={d === today || undefined}><h4><span>{dayLabel(d)}</span>{d === today && <span>today</span>}</h4>{HEALTH_MEALS.map(meal => { const plans = week.slots.find(s => s.date === d && s.meal === meal)!.plans; return <div key={meal} className="health-planner-slot">
        <small>{meal}</small>
        {plans.map(p => <div key={p.id}><strong>{p.name}{p.loggedAt ? ' · logged' : ''}</strong><div className="actions">{!p.loggedAt && <button type="button" className="secondary" aria-label={`Log ${p.name} for ${meal} on ${dayLabel(d)}`} onClick={() => void perform(latest => logMealPlan(latest, p.id, now()), `${p.name} logged as eaten.`, () => { try { zigiSignals.emitValidated('health_log_recorded'); } catch { /* decoration */ } })}>Log</button>}<button type="button" className="quiet" aria-label={`Remove ${p.name} from ${meal} on ${dayLabel(d)}`} onClick={() => void perform(latest => removeMealPlan(latest, p.id), 'Plan removed.')}>Remove</button></div></div>)}
        {slot?.date === d && slot.meal === meal ? <form className="health-planner-form" aria-label={`Plan ${meal} on ${dayLabel(d)}`} onSubmit={e => { e.preventDefault(); plan(); }}><label className="field"><span>From</span><select value={kind} onChange={e => { setKind(e.target.value as 'recipe' | 'food'); setSource(''); }}><option value="recipe">A recipe</option><option value="food">A food</option></select></label><label className="field"><span>{kind === 'recipe' ? 'Recipe' : 'Food'}</span><select value={source} required onChange={e => setSource(e.target.value)}><option value="">Choose</option>{(kind === 'recipe' ? data.recipes : data.foods).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>{kind === 'food' && <label className="field"><span>Servings</span><input type="text" inputMode="decimal" value={servings} onChange={e => setServings(e.target.value)} /></label>}<div className="actions"><button type="submit" className="secondary">Plan</button><button type="button" className="quiet" onClick={() => setSlot(null)}>Cancel</button></div></form>
          : <button type="button" className="quiet health-planner-add" aria-label={`Plan ${meal} on ${dayLabel(d)}`} onClick={() => setSlot({date: d, meal})}>+ Plan</button>}
      </div>; })}</div>)}</div>
      <p className="fine">Plans are separate from your diary: a plan is logged only when you tap Log. {data.recipes.length === 0 && data.foods.length === 0 ? 'Add a food or a recipe first.' : ''}</p>
    </section>
    <section className="panel health-aa-card" aria-labelledby="grocery-title">
      <p className="eyebrow">From this week’s plans</p><h2 id="grocery-title"><NebulaFlow identity="grocery-title">Grocery list</NebulaFlow></h2>
      {groceries.length ? <><GlassBar identity="grocery-progress" className="health-grocery-progress" role="progressbar" aria-label={`${bought} of ${groceries.length} items bought`} aria-valuenow={bought} aria-valuemin={0} aria-valuemax={groceries.length} value={bought / groceries.length} /><p className="fine">{bought} of {groceries.length} bought</p>
        <div className="health-grocery-aisles">{grouped.map(g => <div key={g.aisle} className="health-grocery-aisle"><h3>{g.aisle} <small>{g.rows.length}</small></h3><ul>{g.rows.map(row => <li key={row.key} data-checked={row.checked || undefined}><label><input type="checkbox" checked={row.checked} aria-label={`Bought ${row.name}`} onChange={e => { const checked = e.target.checked; /* read now: the write runs later and React has put the controlled box back by then */ void perform(latest => saveGroceryEdit(latest, from, to, row.key, row.planIds, {name: row.name, quantityMilli: row.manual?.quantityMilli ?? null, unit: row.manual?.unit ?? (row.millilitres !== null ? 'ml' : 'g'), checked}), checked ? 'Marked as bought.' : 'Unmarked.'); }} /><span><strong>{row.name}</strong> <small>{row.grams !== null ? `${formatNutrient(row.grams)} g` : row.millilitres !== null ? `${formatNutrient(row.millilitres)} mL` : 'quantity unknown'}</small></span></label><select aria-label={`Aisle for ${row.name}`} value={g.aisle} onChange={e => { try { aisles.update(r => setAisle(r, row.name, e.target.value as (typeof AISLES)[number])); } catch (cause) { void perform(l => l, `Aisle not kept on this device. ${deviceSettingFailureMessage(cause)}`); } }}>{AISLES.map(a => <option key={a} value={a}>{a}</option>)}</select></li>)}</ul></div>)}</div></>
        : <p className="health-empty-inline">Plan a meal above and its ingredients appear here, by aisle.</p>}
    </section>
  </div>;
}

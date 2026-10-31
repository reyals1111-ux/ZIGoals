'use client';
import {useEffect, useRef, useState} from 'react';
import {entranceAllowed} from '../use-entrance';
import {NebulaFlow} from '../nebula-flow';
import {GlassBar} from '../progress/glass-progress';
import {useDeviceRecord} from '../ai/use-device-record';
import {planFromFood, planFromRecipe, weekPlan, type Meal} from '../../lib/health-aa/planner';
import {AISLES, AISLES_RECORD, groupByAisle, setAisle} from '../../lib/health-aa/aisles';
import {groceryList, logMealPlan, removeMealPlan} from '../../lib/health-daily';
import {GROCERY_RECORD, addGroceryItem, removeGroceryItem, setPantry, setTick, type GroceryRecord} from '../../lib/grocery/schema';
import {frequentItems, groceryCsv, groceryItems, groceryPrintHtml, groceryText, quantityText, type GroceryGroup, type GroceryItem} from '../../lib/grocery/list';
import {HEALTH_MEALS, type HealthData} from '../../lib/health';
import {addLocalDays} from '../../lib/local-date';
import {formatWeekday} from '../../lib/visual-format';
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
  // Session AK (task 4.6): one item per name and measure (amounts added, g/kg, ml/l, pieces), ticks kept by item key on
  // this device so they survive a re-plan, "I have this" (the pantry, every week), added and often-logged items, and
  // share/export (text, CSV, a print page).
  const grocery = useDeviceRecord(GROCERY_RECORD), gRecord: GroceryRecord = grocery.loaded && !grocery.unreadable ? grocery.data : {version: 1};
  const {items, pantry} = groceryItems(groceries, gRecord, from);
  const grouped = groupByAisle(items, aisleRecord), bought = items.filter(g => g.checked).length;
  const [adding, setAdding] = useState(''), [shareNote, setShareNote] = useState('');
  const often = gRecord.showFrequent ? frequentItems(data, today, items.map(i => i.name), gRecord) : [];
  const keep = (change: (r: GroceryRecord) => GroceryRecord, done?: string) => { try { grocery.update(change); if (done) setShareNote(done); } catch (cause) { void perform(l => l, `Not kept on this device. ${deviceSettingFailureMessage(cause)}`); } };
  const exportGroups: GroceryGroup[] = grouped.map(g => ({aisle: g.aisle, items: g.rows}));
  const titleOf = () => `Groceries · ${formatWeekday(from)} ${Number(from.slice(8))} – ${formatWeekday(to)} ${Number(to.slice(8))}`;
  const save = (text: string, type: string, name: string) => { const url = URL.createObjectURL(new Blob([text], {type})); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  async function share() {
    const text = groceryText(titleOf(), exportGroups), title = titleOf();
    try { if (typeof navigator.share === 'function') { await navigator.share({title, text}); setShareNote('Shared.'); return; } await navigator.clipboard.writeText(text); setShareNote('Copied as plain text.'); }
    catch (e) { if (e instanceof Error && e.name === 'AbortError') return; save(text, 'text/plain;charset=utf-8', `groceries-${from}.txt`); setShareNote('Saved as a text file (groceries-' + from + '.txt).'); }
  }
  function printView() { const url = URL.createObjectURL(new Blob([groceryPrintHtml(titleOf(), exportGroups)], {type: 'text/html;charset=utf-8'})); const opened = window.open(url, '_blank'); if (opened) opened.opener = null; /* our own page, no script; 'noopener' would hide whether it opened */ setTimeout(() => URL.revokeObjectURL(url), 60_000); if (!opened) { save(groceryPrintHtml(titleOf(), exportGroups), 'text/html;charset=utf-8', `groceries-${from}.html`); setShareNote('Saved as a page to print (groceries-' + from + '.html).'); } else setShareNote('The print view opened in a new tab. Use your browser’s Print there.'); }
  const now = () => new Date().toISOString();
  function plan() {
    if (!slot || !source) return;
    const q = Math.round(Number(servings.replace(',', '.')) * 1000); if (!Number.isFinite(q) || q <= 0) return;
    void perform(latest => kind === 'recipe' ? planFromRecipe(latest, source, slot.date, slot.meal, now()) : planFromFood(latest, source, q, slot.date, slot.meal, now()), 'Meal planned; nothing logged as eaten.', () => { setSlot(null); setSource(''); });
  }
  // A compact week tile, weekday and day number ("Wed 7"), as the week strip has always read.
const dayLabel = (d: string) => `${formatWeekday(d)} ${Number(d.slice(8))}`;
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
      {items.length ? <><GlassBar identity="grocery-progress" className="health-grocery-progress" role="progressbar" aria-label={`${bought} of ${items.length} items bought`} aria-valuenow={bought} aria-valuemin={0} aria-valuemax={items.length} value={bought / items.length} /><p className="fine">{bought} of {items.length} bought</p>
        <div className="health-grocery-aisles">{grouped.map(g => <div key={g.aisle} className="health-grocery-aisle"><h3>{g.aisle} <small>{g.rows.length}</small></h3><ul>{g.rows.map(row => <GroceryRow key={row.key} row={row} aisle={g.aisle} onTick={checked => keep(r => setTick(r, from, row.key, checked, now()))} onHave={() => keep(r => setPantry(r, row.name, true, now()), `${row.name} is at home: off the list until you put it back.`)} onRemove={row.added ? () => keep(r => removeGroceryItem(r, from, row.key)) : undefined} onAisle={a => { try { aisles.update(r => setAisle(r, row.name, a)); } catch (cause) { void perform(l => l, `Aisle not kept on this device. ${deviceSettingFailureMessage(cause)}`); } }} />)}</ul></div>)}</div></>
        : <p className="health-empty-inline">Plan a meal above and its ingredients appear here, by aisle.</p>}
      <form className="health-micro-edit" onSubmit={e => { e.preventDefault(); if (adding.trim()) keep(r => addGroceryItem(r, from, adding, now()), `${adding.trim()} added to this week’s list.`); setAdding(''); }}><label className="field"><span>Add an item</span><input type="text" maxLength={120} value={adding} onChange={e => setAdding(e.target.value)} placeholder="Coffee, soap…" /></label><button type="submit" className="secondary" disabled={!adding.trim()}>Add</button></form>
      <div className="actions"><button type="button" className="quiet" aria-pressed={gRecord.showFrequent === true} onClick={() => keep(r => ({...r, showFrequent: !r.showFrequent}))}>Suggest foods I log often</button></div>
      {gRecord.showFrequent && (often.length ? <ul className="health-micro-list" aria-label="Often logged">{often.map(f => <li key={f.name}><div><strong>{f.name}</strong> <small>logged {f.count}× in 4 weeks</small></div><div><button type="button" className="secondary" aria-label={`Add ${f.name} to the list`} onClick={() => keep(r => addGroceryItem(r, from, f.name, now()), `${f.name} added to this week’s list.`)}>Add</button></div></li>)}</ul> : <p className="fine">No food logged three or more times in the last four weeks is missing from the list.</p>)}
      {pantry.length > 0 && <details><summary className="fine" style={{minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer'}}>Already at home ({pantry.length})</summary><ul className="health-micro-list">{pantry.map(p => <li key={p.key}><div><strong>{p.name}</strong> <small>{quantityText(p)}</small></div><div><button type="button" className="quiet" aria-label={`Put ${p.name} back on the list`} onClick={() => keep(r => setPantry(r, p.name, false, now()))}>Put back</button></div></li>)}</ul></details>}
      {items.length > 0 && <div className="actions"><button type="button" className="secondary" onClick={() => void share()}>Share or copy</button><button type="button" className="secondary" onClick={() => { save(groceryCsv(exportGroups), 'text/csv;charset=utf-8', `groceries-${from}.csv`); setShareNote(`Saved as groceries-${from}.csv.`); }}>Download CSV</button><button type="button" className="secondary" onClick={printView}>Print view</button></div>}
      {shareNote && <p className="fine" aria-live="polite">{shareNote}</p>}
    </section>
  </div>;
}
/** Session AK (task 4.6): one grocery item: the tick (by item key, on this device), its amount in g/kg, ml/l or pieces,
 *  "I have this" (to the pantry) and its aisle; an added item can be removed. */
function GroceryRow({row, aisle, onTick, onHave, onRemove, onAisle}: {row: GroceryItem; aisle: (typeof AISLES)[number]; onTick: (checked: boolean) => void; onHave: () => void; onRemove?: () => void; onAisle: (a: (typeof AISLES)[number]) => void}) {
  return <li data-checked={row.checked || undefined}><label><input type="checkbox" checked={row.checked} aria-label={`Bought ${row.name}`} onChange={e => onTick(e.target.checked)} /><span><strong>{row.name}</strong> <small>{quantityText(row)}{row.added ? ' · added' : ''}</small></span></label>
    <span className="actions" style={{margin: 0}}><button type="button" className="quiet" aria-label={`I have ${row.name}`} onClick={onHave}>I have this</button>{onRemove && <button type="button" className="quiet" aria-label={`Remove ${row.name} from the list`} onClick={onRemove}>Remove</button>}<select style={{minHeight: 44}} aria-label={`Aisle for ${row.name}`} value={aisle} onChange={e => onAisle(e.target.value as (typeof AISLES)[number])}>{AISLES.map(a => <option key={a} value={a}>{a}</option>)}</select></span></li>;
}

'use client';
import Link from 'next/link';
import {useId, useRef, useState, type FormEvent} from 'react';
import {newHealthId, type HealthData} from '../../../lib/health';
import {addWater, dailyData, undoWaterLog, waterSummary} from '../../../lib/health-daily';
import {DRINK_TYPES, drinkWord, healthExtrasSchema, OWN_DRINKS_MAX, setDrink, type HealthExtras, type OwnDrink} from '../../../lib/health-extras';
import {drinkEnergyDay, moveOwnDrink, OWN_DRINK_COLOURS, OWN_DRINK_SYMBOL_NAMES, OWN_DRINK_SYMBOLS, ownDrinks, removeOwnDrink, saveOwnDrink, tapNote, type DrinkFormInput, type DrinkIssue} from '../../../lib/own-drinks';
import {waterTipOf} from '../../../lib/water-tips';
import {DEFAULT_SPREAD, SPREAD_EVERY, spreadSlotsToday, withWaterSpread, type WaterSpread} from '../../../lib/water-spread';
import {NOTIFY_PREFS, typeOn} from '../../../lib/notify/prefs';
import {REMINDERS_PLAN, quietHours} from '../../../lib/reminders-plan/schema';
import {inQuiet} from '../../../lib/notify/zone';
import {waterText} from '../../../lib/health-units';
import {formatClock, formatNumber} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import {useDeviceRecord} from '../../ai/use-device-record';
import {showUndo} from '../../ui/undo-toast';
import {zigiSignals} from '../../zigi/bus';
import {useHealth} from '../use-health';
import {useHealthExtras} from '../meal-names';
import './health-r3.css';

type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
const now = () => new Date().toISOString();
const BLANK: DrinkFormInput = {name: '', type: 'juice', sizeMl: '250', symbol: OWN_DRINK_SYMBOLS[4], colour: 'orange', caffeine: '', kcal: '', sugar: ''};
const formOf = (d: OwnDrink): DrinkFormInput => ({name: d.name, type: d.type, sizeMl: String(d.sizeMl), symbol: d.symbol ?? OWN_DRINK_SYMBOLS[0], colour: d.colour ?? 'blue', caffeine: d.caffeineMg === undefined ? '' : String(d.caffeineMg), kcal: d.kcal === undefined ? '' : String(d.kcal), sugar: d.sugarG === undefined ? '' : String(d.sugarG)});
/** A drink's facts; its calories in a span "Hide calories and weight" hides, as Health's other calorie figures (review B3B-4). */
export const facts = (d: OwnDrink) => <>{[`${formatNumber(d.sizeMl)} mL`, d.caffeineMg !== undefined ? `${d.caffeineMg} mg caffeine` : null].filter(Boolean).join(' · ')}{d.kcal !== undefined && <> · <span data-body-figure="">{d.kcal} kcal</span></>}{d.sugarG !== undefined ? ` · ${formatNumber(d.sugarG, {maximumFractionDigits: 1})} g sugar` : ''}</>;

/**
 * Session AV lane 2 (health r3; LEDGER #280–#283, Waterllama), under the Water card's one-tap row: your own drinks as
 * one-tap buttons (each a water entry with its drink), the energy and sugar of today's drinks as typed, a tip a day (off
 * unless chosen), "Your drinks" to make up to 30, and "Reminders through the day". Its own chunk.
 */
export default function WaterMore({data, date, perform}: {data: HealthData; date: string; perform: Perform}) {
  const {extras, update, unreadable} = useHealthExtras(), store = useHealth(), [said, setSaid] = useState('');
  const drinks = ownDrinks(extras), lastTap = useRef(Number.NEGATIVE_INFINITY), energy = drinkEnergyDay(extras, dailyData(data).water, date);
  const [tipStep, setTipStep] = useState(0), [tipLang, setTipLang] = useState<'en' | 'nl'>('en'), tip = waterTipOf(date, tipStep);
  function tap(d: OwnDrink, at: number) {
    if (at - lastTap.current < 350) return; lastTap.current = at;
    const id = newHealthId(), note = tapNote(d);
    void perform(latest => addWater(latest, {id, date, amountMilli: d.sizeMl * 1000, unit: 'ml'}, now()), `${d.name} recorded.`, () => {
      try { update(r => setDrink(r, id, note.type, note.caffeineMg, note.more)); } catch { /* the entry is saved; only the drink note could not be kept */ }
      zigiSignals.emitValidated('health_log_recorded');
      showUndo({message: `${d.name} logged: ${formatNumber(d.sizeMl)} mL.`, undone: 'Water entry removed.', restore: () => store.update(undoWaterLog(id))});
    });
  }
  const setTips = (on: boolean) => { try { update(r => healthExtrasSchema.parse({...r, waterTips: on || undefined})); setSaid(on ? 'A water tip shows here each day.' : 'Water tips are off.'); } catch (e) { setSaid(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); } };
  return <div className="r3-water">
    {extras?.waterTips && <section className="r3-tip" aria-labelledby={`r3-water-tip-${date}`}>
      <h3 id={`r3-water-tip-${date}`} lang={tipLang}>{tipLang === 'en' ? 'A water tip' : 'Een watertip'}</h3>
      <p lang={tipLang} aria-live="polite">{tip[tipLang]}</p>
      <div className="actions"><button type="button" className="quiet" lang={tipLang} onClick={() => setTipStep(n => n + 1)}>{tipLang === 'en' ? 'Another tip' : 'Nog een tip'}</button><button type="button" className="quiet" lang={tipLang === 'en' ? 'nl' : 'en'} onClick={() => setTipLang(tipLang === 'en' ? 'nl' : 'en')}>{tipLang === 'en' ? 'In het Nederlands' : 'In English'}</button></div>
    </section>}
    {drinks.length > 0 && <div className="actions r3-own-drinks" role="group" aria-label="Your drinks, one tap each">{drinks.map(d => <button type="button" className="secondary" key={d.id} data-drink-colour={d.colour ?? 'blue'} aria-label={`Log ${d.name}, ${formatNumber(d.sizeMl)} mL`} onClick={e => tap(d, e.timeStamp)}><span aria-hidden="true" className="r3-drink-symbol">{d.symbol ?? '💧'}</span> {d.name} <small>{formatNumber(d.sizeMl)} mL</small></button>)}</div>}
    <DrinkDayEnergy energy={energy}/>
    <details className="r3-fold"><summary>Your drinks{drinks.length ? ` (${drinks.length} of ${OWN_DRINKS_MAX})` : ''}</summary>
      {unreadable ? <p className="fine" role="alert">Your drinks on this device could not be read, so they cannot be changed here now.</p> : <DrinksEditor extras={extras} drinks={drinks} update={update}/>}
    </details>
    <details className="r3-fold"><summary>Reminders through the day</summary><SpreadCard data={data}/></details>
    <div className="r3-toggle"><button type="button" className="quiet" aria-pressed={!!extras?.waterTips} aria-describedby={`r3-tip-note-${date}`} disabled={!extras} onClick={() => setTips(!extras?.waterTips)}>Show a water tip each day</button><span className="fine" id={`r3-tip-note-${date}`}>Small habits that make a glass easier to reach for. Off unless you choose it.</span></div>
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}

/** The card's line of today's drink energy and sugar as typed; hidden by "Hide calories and weight" (review B3B-4). */
export function DrinkDayEnergy({energy}: {energy: ReturnType<typeof drinkEnergyDay>}) {
  if (energy.kcal === null && energy.sugarG === null) return null;
  return <p className="fine" data-body-figure="">From today’s drinks, as you typed them: {[energy.kcal !== null ? `${formatNumber(energy.kcal)} kcal` : null, energy.sugarG !== null ? `${formatNumber(energy.sugarG, {maximumFractionDigits: 1})} g sugar` : null].filter(Boolean).join(' · ')}. It shows beside the day’s food too.</p>;
}

function DrinksEditor({extras, drinks, update}: {extras: HealthExtras | null; drinks: readonly OwnDrink[]; update: (change: (current: HealthExtras) => HealthExtras) => unknown}) {
  const id = useId(), [form, setForm] = useState<DrinkFormInput>(BLANK), [editing, setEditing] = useState<string | null>(null), [issue, setIssue] = useState<DrinkIssue | null>(null), [said, setSaid] = useState('');
  const set = (key: keyof DrinkFormInput, value: string) => { setForm(f => ({...f, [key]: value})); setIssue(null); };
  const keep = (change: (current: HealthExtras) => HealthExtras, text: string) => { try { update(change); setSaid(text); } catch (e) { setSaid(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); } };
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!extras) return;
    const checked = saveOwnDrink(extras, form, editing ?? undefined);
    if (!checked.ok) { setIssue(checked.issue); document.getElementById(`${id}-${checked.issue.field}`)?.focus(); return; }
    try { update(current => { const r = saveOwnDrink(current, form, editing ?? undefined); if (!r.ok) throw new Error(r.issue.message); return r.value; }); }
    catch (cause) { setSaid(`Not kept on this device. ${deviceSettingFailureMessage(cause)}`); return; }
    setSaid(editing ? `${checked.drink.name} saved.` : `${checked.drink.name} added: one tap logs it above.`);
    setForm(BLANK); setEditing(null);
  }
  const text = (key: keyof DrinkFormInput, label: string, mode?: 'numeric' | 'decimal') => <div><label className="field"><span>{label}</span><input id={`${id}-${key}`} type="text" inputMode={mode} autoComplete="off" value={form[key]} maxLength={key === 'name' ? 24 : 8} aria-invalid={issue?.field === key ? true : undefined} aria-describedby={issue?.field === key ? `${id}-${key}-issue` : undefined} onChange={e => set(key, e.target.value)}/></label>{issue?.field === key && <p className="field-error" id={`${id}-${key}-issue`} role="alert">{issue.message}</p>}</div>;
  return <div className="r3-drinks-editor">
    {drinks.length ? <ul className="r3-list">{drinks.map((d, i) => <li key={d.id} data-drink-colour={d.colour ?? 'blue'}><span><span aria-hidden="true" className="r3-drink-symbol">{d.symbol ?? '💧'}</span> <strong>{d.name}</strong> <small className="fine">{drinkWord(d.type)} · {facts(d)}</small></span>
      <span className="r3-row-actions"><button type="button" className="quiet" aria-label={`Edit ${d.name}`} onClick={() => { setEditing(d.id); setForm(formOf(d)); setIssue(null); requestAnimationFrame(() => document.getElementById(`${id}-name`)?.focus()); }}>Edit</button>
        <button type="button" className="quiet" aria-label={`Move ${d.name} earlier`} disabled={i === 0} onClick={() => keep(r => moveOwnDrink(r, d.id, -1), `${d.name} moved earlier.`)}>↑</button>
        <button type="button" className="quiet" aria-label={`Move ${d.name} later`} disabled={i === drinks.length - 1} onClick={() => keep(r => moveOwnDrink(r, d.id, 1), `${d.name} moved later.`)}>↓</button>
        <button type="button" className="quiet" aria-label={`Remove ${d.name}`} onClick={() => keep(r => removeOwnDrink(r, d.id), `${d.name} removed. Drinks you logged with it keep their amounts.`)}>Remove</button></span></li>)}</ul>
      : <p className="fine">Make a drink you have often — an oat latte, a glass of juice — and log it with one tap. Its energy and sugar count only as you type them here; nothing is looked up or guessed. Every drink still counts as water as logged.</p>}
    <form className="health-form" aria-label={editing ? 'Edit your drink' : 'Make a drink'} noValidate onSubmit={submit}>
      <div className="health-form-grid">
        {text('name', 'Name')}
        <label className="field"><span>Counts as</span><select id={`${id}-type`} value={form.type} onChange={e => set('type', e.target.value)}>{DRINK_TYPES.map(t => <option key={t} value={t}>{drinkWord(t)}</option>)}</select></label>
        {text('sizeMl', 'Usual size (mL)', 'numeric')}
        {text('caffeine', 'Caffeine (mg, optional)', 'numeric')}
        {text('kcal', 'Energy (kcal, optional)', 'numeric')}
        {text('sugar', 'Sugar (g, optional)', 'decimal')}
      </div>
      <fieldset className="r3-choices"><legend>Symbol</legend>{OWN_DRINK_SYMBOLS.map(s => <label key={s} className="r3-choice"><input type="radio" name={`${id}-symbol`} value={s} checked={form.symbol === s} onChange={() => set('symbol', s)}/><span aria-hidden="true">{s}</span><span className="sr-only">{OWN_DRINK_SYMBOL_NAMES[s]}</span></label>)}</fieldset>
      <fieldset className="r3-choices"><legend>Colour</legend>{OWN_DRINK_COLOURS.map(c => <label key={c} className="r3-choice" data-drink-colour={c}><input type="radio" name={`${id}-colour`} value={c} checked={form.colour === c} onChange={() => set('colour', c)}/><span aria-hidden="true" className="r3-swatch"/><span>{c[0]!.toUpperCase() + c.slice(1)}</span></label>)}</fieldset>
      <div className="actions"><button type="submit" className="primary">{editing ? 'Save drink' : 'Add drink'}</button>{editing && <button type="button" className="quiet" onClick={() => { setEditing(null); setForm(BLANK); setIssue(null); }}>Cancel</button>}</div>
    </form>
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}

/** Health → Water → "Reminders through the day" (LEDGER #280): from, to, every; today's times and which are skipped. */
function SpreadCard({data}: {data: HealthData}) {
  const prefs = useDeviceRecord(NOTIFY_PREFS), plan = useDeviceRecord(REMINDERS_PLAN), id = useId(), [said, setSaid] = useState('');
  const saved: WaterSpread = prefs.data.waterSpread ?? {...DEFAULT_SPREAD, on: false};
  const [draft, setDraft] = useState<WaterSpread | null>(null), s = draft ?? saved;
  if (!prefs.loaded) return null;
  // Review B3B-8: today's reminders, from the Health journal's today, whatever day the Diary shows.
  const today = spreadSlotsToday(s, data), water = {...waterSummary(data, today.day), millilitres: today.millilitres}, unit = dailyData(data).preferences.waterUnit, quiet = quietHours(plan.data), slots = today.slots;
  const save = (next: WaterSpread) => { try { prefs.update(p => withWaterSpread(p, next)); setDraft(null); setSaid(next.on ? `Water reminders on, ${next.every === 60 ? 'every hour' : `every ${next.every / 60} hours`} from ${formatClock(next.from)} to ${formatClock(next.to)}.` : 'Water reminders through the day are off. Your choices are kept.'); } catch (e) { setSaid(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); } };
  const valid = /^\d\d:\d\d$/.test(s.from) && /^\d\d:\d\d$/.test(s.to) && s.to > s.from;
  return <div className="r3-spread">
    <p className="fine">Reminders every one, two or three hours between a start and an end time. Each one is skipped when today is on pace for your target — halfway through the day, half your target — and the first once you have logged a drink. Quiet hours are kept.</p>
    <label className="r3-check"><input type="checkbox" checked={s.on} onChange={e => save({...s, on: e.target.checked})} disabled={!valid && !s.on}/><span>Remind me through the day</span></label>
    <div className="health-form-grid">
      <label className="field"><span>From</span><input type="time" value={s.from} onChange={e => setDraft({...s, from: e.target.value})}/></label>
      <label className="field"><span>To</span><input type="time" value={s.to} aria-invalid={!valid ? true : undefined} aria-describedby={!valid ? `${id}-to` : undefined} onChange={e => setDraft({...s, to: e.target.value})}/></label>
      <label className="field"><span>Every</span><select value={s.every} onChange={e => setDraft({...s, every: Number(e.target.value) as WaterSpread['every']})}>{SPREAD_EVERY.map(m => <option key={m} value={m}>{m / 60} {plural(m / 60, 'hour')}</option>)}</select></label>
    </div>
    {!valid && <p className="field-error" id={`${id}-to`} role="alert">The end time comes after the start time, on the same day.</p>}
    {draft && <div className="actions"><button type="button" className="secondary" disabled={!valid} onClick={() => save(s)}>Save these times</button><button type="button" className="quiet" onClick={() => setDraft(null)}>Cancel</button></div>}
    {valid && <><h4 className="r3-sub">Today</h4><ul className="r3-list r3-slots">{slots.map(slot => <li key={slot.time}><time>{formatClock(slot.time)}</time> <span>{inQuiet(slot.time, quiet) ? 'inside your quiet hours, not sent' : slot.onPace ? 'skipped: you are on pace' : slot.due !== null && slot.due > water.millilitres ? `${waterText(slot.due - water.millilitres, unit)} to be on pace` : 'a reminder'}</span></li>)}</ul></>}
    {!water.targetMl && <p className="fine">With no water target there is no pace, so every reminder comes. Set a target in Journal settings to skip the ones you are ahead of.</p>}
    {s.on && prefs.data.here !== true && <p className="fine">Notifications are off on this device, so these cannot reach you yet. Turn them on in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    {s.on && prefs.data.here === true && !typeOn(prefs.data, 'water') && <p className="fine">&ldquo;Water&rdquo; is switched off in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    {s.on && <p className="fine">While these are on, they stand in for your one water reminder time in notifications; the Today card keeps that time.</p>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}

'use client';
import {useId, useState, type FormEvent} from 'react';
import type {HealthData} from '../../../lib/health';
import {dailyData} from '../../../lib/health-daily';
import {HEALTH_EXTRAS, RETURN_NOTE_MAX} from '../../../lib/health-extras';
import {closeReturnNote, returnNoteDue, setReturnNote} from '../../../lib/food-log/return-note';
import {MORE_GOALS, type MoreGoals} from '../../../lib/health-goals/more';
import {bandDays, clearWeightBand, setWeightBand} from '../../../lib/health-goals/band';
import {CALORIE_WEEK, clearFreeDay, freeDayShares, MAX_FREE_EXTRA, MIN_FREE_EXTRA, planFreeDay} from '../../../lib/health-aa/calorie-week';
import {weekDays} from '../../../lib/health-aa/planner';
import {KCAL_FLOOR} from '../../../lib/health-aa/energy';
import {GRAMS_PER_LB, weightText} from '../../../lib/health-units';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import {useDeviceRecord, type DeviceRecordState} from '../../ai/use-device-record';
import {showUndo} from '../../ui/undo-toast';
import '../r3/health-r3.css';
import './health-r4.css';

/**
 * Session AV lane 2, round 4 (health; Noom, LEDGER #328, #329, #331): a weight band you keep (Goals → Health goals, shaded
 * on the weight trend), a planned free day in the weekly calorie budget, and a note for a harder week (written in the
 * Diary, shown on the food day when you come back). Each in this lazy chunk. No calorie expenditure is estimated; nothing
 * is suggested; a return never says how many days were missed.
 */
const errorText = (e: unknown) => e instanceof Error && !/storage|quota/i.test(e.message) ? e.message : `Not kept on this device. ${deviceSettingFailureMessage(e)}`;
const inUnit = (g: number, unit: 'kg' | 'lb') => String(Math.round((unit === 'lb' ? g / GRAMS_PER_LB : g / 1000) * 10) / 10);

/** "Keep my weight between …" (LEDGER #331): the band, its days inside in the last 30, Remove with Undo. */
export function WeightBandEditor({health, today}: {health: HealthData; today: string}) {
  const rec = useDeviceRecord(MORE_GOALS);
  return rec.loaded ? <BandForm rec={rec} health={health} today={today}/> : null;
}
function BandForm({rec, health, today}: {rec: DeviceRecordState<MoreGoals>; health: HealthData; today: string}) {
  const unit = dailyData(health).preferences.weightUnit, id = useId(), band = !rec.unreadable ? rec.data.weightBand : undefined;
  const [low, setLow] = useState(band ? inUnit(band.lowGrams, unit) : ''), [high, setHigh] = useState(band ? inUnit(band.highGrams, unit) : ''), [issue, setIssue] = useState<{field: 'low' | 'high'; message: string} | null>(null), [said, setSaid] = useState('');
  if (rec.unreadable) return <p className="fine" role="alert">Your goals on this device could not be read, so the band cannot be changed here now.</p>;
  const days = band ? bandDays(health, band, today) : null;
  const submit = (e: FormEvent) => { e.preventDefault(); const out = setWeightBand(rec.data, low, high, unit, new Date().toISOString()); if (!out.ok) { setIssue(out); document.getElementById(`${id}-${out.field}`)?.focus(); return; } setIssue(null); try { rec.update(() => out.value); setSaid(`Your band: ${weightText(out.band.lowGrams, unit)} to ${weightText(out.band.highGrams, unit)}, shaded on the weight trend.`); } catch (err) { setSaid(errorText(err)); } };
  const field = (f: 'low' | 'high', label: string, value: string, set: (v: string) => void) => <div><label className="field"><span>{label}</span><input id={`${id}-${f}`} type="text" inputMode="decimal" value={value} aria-invalid={issue?.field === f ? true : undefined} aria-describedby={issue?.field === f ? `${id}-${f}-issue` : undefined} onChange={e => { set(e.target.value); setIssue(null); }}/></label>{issue?.field === f && <p className="field-error" id={`${id}-${f}-issue`} role="alert">{issue.message}</p>}</div>;
  return <section className="r4-band" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Keep my weight between …</h4>
    {band && days ? <p data-body-figure="">{weightText(band.lowGrams, unit)} to {weightText(band.highGrams, unit)}. {days.days ? `In the last 30 days the trend was inside your band on ${days.inside} of ${days.days} ${days.days === 1 ? 'day' : 'days'}.` : 'The trend starts with your first weight reading.'}</p>
      : <p className="health-empty-inline">A band instead of a target line: for keeping your weight where it is. Choose the lower and upper weight; the trend shades it, and counts the days inside it.</p>}
    <form className="health-form" aria-label="Your weight band" noValidate onSubmit={submit}>
      <div className="health-form-grid">{field('low', `From (${unit})`, low, setLow)}{field('high', `To (${unit})`, high, setHigh)}</div>
      <div className="actions"><button type="submit" className="secondary">{band ? 'Save the band' : 'Keep this band'}</button>
        {band && <button type="button" className="quiet" onClick={() => { const was = band; try { rec.update(clearWeightBand); setSaid('The band is removed.'); showUndo({message: 'The weight band is removed.', undone: 'The weight band is back.', restore: () => rec.update(r => ({...r, weightBand: was}))}); } catch (err) { setSaid(errorText(err)); } }}>Remove the band</button>}</div>
    </form>
    <p className="fine">Your own band; nothing is suggested. <span className="health-estimate-tag">the trend is an estimate, not medical advice</span></p>
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </section>;
}

/** A planned free day (LEDGER #328): one day with the extra you choose, taken evenly from that week's other days. */
export function FreeDayPlanner({data, today}: {data: HealthData; today: string}) {
  const rec = useDeviceRecord(CALORIE_WEEK), base = data.targets.kcal, id = useId();
  const [date, setDate] = useState(today), [extra, setExtra] = useState('400'), [said, setSaid] = useState(''), [issue, setIssue] = useState('');
  if (!rec.loaded || !base) return null;
  const f = rec.loaded && !rec.unreadable ? rec.data.freeDay : undefined, live = f && f.date >= weekDays(today)[0]! ? f : undefined;
  const shares = live ? freeDayShares(rec.data, base, weekDays(live.date)) : null;
  const plan = (e: FormEvent) => { e.preventDefault(); const kcal = Math.round(Number(extra.replace(',', '.'))); try { rec.update(r => planFreeDay(r, base, date, kcal, today)); setIssue(''); setSaid(`A free day on ${formatDate(date, {weekday: true, year: false})}: ${formatNumber(kcal)} kcal more that day, taken evenly from that week’s other days. The weekly total is the same.`); } catch (err) { setIssue(errorText(err)); document.getElementById(`${id}-extra`)?.focus(); } };
  return <section className="r4-free-day" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>A planned free day</h4>
    {live && shares ? <p data-body-figure="">{formatDate(live.date, {weekday: true, year: false})}: {formatNumber(shares.extra)} kcal more{shares.extra < shares.chosen ? ` (of the ${formatNumber(shares.chosen)} you chose: the other days cannot give more above ${formatNumber(KCAL_FLOOR)})` : ''}, taken evenly from {Object.keys(shares.gives).length} other {Object.keys(shares.gives).length === 1 ? 'day' : 'days'} of that week. It shows on that day only and is gone the week after.</p>
      : <p className="health-empty-inline">A birthday dinner or a day out? Plan one day with more, and the rest of that week gives a little each, never below {formatNumber(KCAL_FLOOR)} kcal. No points, nothing to earn.</p>}
    <form className="health-form-grid" aria-label="Plan a free day" noValidate onSubmit={plan}>
      <label className="field"><span>Day</span><input type="date" min={today} value={date} onChange={e => setDate(e.target.value)}/></label>
      <div><label className="field"><span>Extra that day (kcal, {MIN_FREE_EXTRA}–{formatNumber(MAX_FREE_EXTRA)})</span><input id={`${id}-extra`} type="text" inputMode="numeric" value={extra} aria-invalid={issue ? true : undefined} aria-describedby={issue ? `${id}-issue` : undefined} onChange={e => { setExtra(e.target.value); setIssue(''); }}/></label>{issue && <p className="field-error" id={`${id}-issue`} role="alert">{issue}</p>}</div>
      <div className="actions"><button type="submit" className="secondary">{live ? 'Plan this day instead' : 'Plan the free day'}</button>{live && <button type="button" className="quiet" onClick={() => { const was = live; try { rec.update(clearFreeDay); setSaid('The free day is cancelled. Every day has its own budget again.'); showUndo({message: 'The free day is cancelled.', undone: 'The free day is back.', restore: () => rec.update(r => ({...r, freeDay: was}))}); } catch (err) { setSaid(errorText(err)); } }}>Cancel the free day</button>}</div>
    </form>
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </section>;
}

/** The food day's lines (LEDGER #328, #329): a free day planned for this date, and the note for a harder week on a return. */
export function FoodDayNotes({data, date, today}: {data: HealthData; date: string; today: string}) {
  const week = useDeviceRecord(CALORIE_WEEK), extras = useDeviceRecord(HEALTH_EXTRAS), id = useId(), [closed, setClosed] = useState(false);
  const shares = week.loaded && !week.unreadable && data.targets.kcal ? freeDayShares(week.data, data.targets.kcal, weekDays(date)) : null;
  const due = date === today && extras.loaded && !extras.unreadable && !closed ? returnNoteDue(data, extras.data, today) : null;
  return <>
    {shares && shares.date === date && shares.extra > 0 && <p className="fine r4-free-line" data-body-figure="">A planned free day: {formatNumber(shares.extra)} kcal more today, taken evenly from this week’s other days.</p>}
    {due && <section className="r4-note" aria-labelledby={`${id}-note`}>
      <h3 id={`${id}-note`}>Your note for a harder week</h3>
      <p>{due.text}</p>
      <div className="actions"><button type="button" className="quiet" onClick={() => { try { extras.update(r => closeReturnNote(r, due.lastLogged)); } catch { /* it closes for this visit */ } setClosed(true); requestAnimationFrame(() => document.querySelector<HTMLElement>('.health-summary-main button')?.focus()); }}>Thanks, close it</button></div>
    </section>}
  </>;
}

/** "A note for a harder week" (LEDGER #329): the words, written ahead, kept on this device. */
export function ReturnNoteEditor() {
  const rec = useDeviceRecord(HEALTH_EXTRAS), id = useId(), [text, setText] = useState<string | null>(null), [said, setSaid] = useState(''), [issue, setIssue] = useState('');
  if (!rec.loaded) return null;
  if (rec.unreadable) return <p className="fine" role="alert">Your Health choices on this device could not be read, so the note cannot be changed here now.</p>;
  const value = text ?? rec.data.returnNote?.text ?? '';
  const save = (e: FormEvent) => { e.preventDefault(); const out = setReturnNote(rec.data, value); if (!out.ok) { setIssue(out.message); document.getElementById(`${id}-text`)?.focus(); return; } try { rec.update(() => out.value); setText(null); setIssue(''); setSaid(value.trim() ? 'Your note is kept. It shows on your food day when you come back after a few days away.' : 'The note is removed.'); } catch (err) { setSaid(errorText(err)); } };
  return <form className="health-form r4-return-note" aria-label="A note for a harder week" noValidate onSubmit={save}>
    <p className="fine">A few lines to yourself for when logging slips: why it matters to you, and one small thing to do. They show on your food day when you come back after three or more days without a food log, until you close them.</p>
    <label className="field"><span>Your note</span><textarea id={`${id}-text`} rows={4} maxLength={RETURN_NOTE_MAX} value={value} placeholder="Why: I want to feel steady. One small thing: log breakfast." aria-invalid={issue ? true : undefined} aria-describedby={`${id}-count${issue ? ` ${id}-issue` : ''}`} onChange={e => { setText(e.target.value); setIssue(''); }}/></label>
    <p className="fine" id={`${id}-count`}>{value.length} of {RETURN_NOTE_MAX} characters</p>
    {issue && <p className="field-error" id={`${id}-issue`} role="alert">{issue}</p>}
    <div className="actions"><button type="submit" className="secondary">Keep the note</button></div>
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </form>;
}

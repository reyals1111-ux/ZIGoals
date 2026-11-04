'use client';
import {LoggingFor, useLinkedDay} from '../health-day';
import {showUndo} from '../../ui/undo-toast';
import {useState, type FormEvent} from 'react';
import {SLEEP_TAGS, type SleepNight} from '../../../lib/sleep/schema';
import {nightDay, saveNight, setSleepGoal} from '../../../lib/sleep/engine';
import {formatTime} from '../../../lib/visual-format';
import {formatMinutes, instantAt, wallClock} from '../../../lib/zone-time';
import {defaultNightTimes, nightLabels, nightTimeIssues, optionalWhole, type NightField} from '../../../lib/health-sleep-form';
import {FieldError, useFormErrors} from '../../primitives/field-error';
import type {SleepStore} from './use-sleep';
import {zigiSignals} from '../../zigi/bus';

const QUALITY = [[1, 'Poor'], [2, 'Fair'], [3, 'OK'], [4, 'Good'], [5, 'Great']] as const;
const message = (error: unknown) => error instanceof Error && error.message && !error.message.startsWith('[') ? error.message : 'Check the times and try again.';

/**
 * Log a night or a nap, or edit one (Session W Part 4). Times are typed in the zone the night was lived in (shown); an
 * empty optional field stays unknown, never zero, and makes "asleep" an estimate. Saving writes once; nothing is saved
 * while typing.
 * Session AL (P-NB-44, P-PR-10, P-MO-45; NB-139, NB-196, PR-064, MO-021, MO-023, MO-113, BUG-023, BUG-079): before 07:00
 * the wake time starts at the current minute, so the untouched form saves; each wrong time is said under its own field
 * (never "Check the times"); a nap's times read "Nap started / Nap ended"; switching between night and nap clears the
 * messages; the success line is cleared on every new try.
 */
export function NightForm({store, night, onDone, onCancel}: {store: SleepStore; night?: SleepNight; onDone: (text: string) => void; onCancel?: () => void}) {
  const zone = night?.timeZone ?? store.zone;
  const start = night ? wallClock(Date.parse(night.start), zone) : null, end = night?.end ? wallClock(Date.parse(night.end), zone) : null;
  const errors = useFormErrors(), [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<'night' | 'nap'>(night?.kind ?? 'night');
  const [tags, setTags] = useState<string[]>(night?.tags?.filter(t => (SLEEP_TAGS as readonly string[]).includes(t)) ?? []);
  const others = night?.tags?.filter(t => !(SLEEP_TAGS as readonly string[]).includes(t)).join(', ') ?? '';
  const labels = nightLabels(kind);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); errors.clear();
    const form = new FormData(e.currentTarget), get = (name: string) => String(form.get(name) ?? '');
    const times = {bedDate: get('bedDate'), bedTime: get('bedTime'), wakeDate: get('wakeDate'), wakeTime: get('wakeTime')}, nowMs = Date.now();
    const latency = optionalWhole(get('latency'), 720, 'minutes'), awake = optionalWhole(get('awake'), 1440, 'minutes'), awakenings = optionalWhole(get('awakenings'), 100, 'count');
    const custom = get('otherTags').split(',').map(t => t.trim()).filter(Boolean);
    const issues = {...nightTimeIssues(times, kind, nowMs, zone, ms => formatTime(new Date(ms).toISOString(), {timeZone: zone})),
      latency: latency.issue, awake: awake.issue, awakenings: awakenings.issue, otherTags: custom.some(t => t.length > 24) ? 'Keep each of your own tags to 24 characters.' : undefined};
    // In the page's order, so the first message is the one announced and focused.
    if (errors.fail({bedDate: issues.bedDate, bedTime: issues.bedTime, wakeDate: issues.wakeDate, wakeTime: issues.wakeTime, latency: issues.latency, awake: issues.awake, awakenings: issues.awakenings, otherTags: issues.otherTags})) return;
    const quality = get('quality') ? Number(get('quality')) : undefined;
    const input: Parameters<typeof saveNight>[1] = {id: night?.id, kind, start: instantAt(times.bedDate, times.bedTime, zone), end: instantAt(times.wakeDate, times.wakeTime, zone), timeZone: zone,
      latencyMin: latency.value, awakeMin: awake.value, awakenings: awakenings.value, quality, tags: [...tags, ...custom], note: get('note')};
    setBusy(true);
    try {
      // Session X-Local Part 4 (D5): the first night logged for its wake day is a moment ZIGi may celebrate; another
      // night, a nap or an edit is a small success. Decided on the stored nights before the write, never on words.
      const first = !night && input.kind === 'night' && !store.sleep.nights.some(n => n.end !== null && wallClock(Date.parse(n.end), zone).date === times.wakeDate);
      await store.update(s => saveNight(s, input, new Date()));
      if (!night) zigiSignals.emitValidated(first ? 'first_sleep_logged' : 'health_log_recorded');
      // Session AH Part 3 (DS3, L-009): a nap is called a nap when it is edited too.
      onDone(night ? (input.kind === 'nap' ? 'Nap updated.' : 'Night updated.') : input.kind === 'nap' ? 'Nap saved.' : 'Night saved.');
    }
    // The store's own refusals (an overlap with another night) are about the whole entry: said beside Save.
    catch (err) { errors.failForm(message(err)); }
    finally { setBusy(false); }
  }
  // Session AH Part 17: a new night defaults to the Health journal's linked day (`?date=`), never a future one.
  const today = store.today, day = useLinkedDay(store.today);
  const first = start && end ? null : defaultNightTimes(day, store.now, zone);
  // Session AH Part 3 (DS3, L-062): the new-night form says when last night is already logged, instead of offering the
  // same 23:00–07:00 again (saving it would be refused as an overlap).
  const logged = night ? undefined : store.sleep.nights.find(n => n.kind === 'night' && n.end !== null && nightDay(n) === day);
  const time = (name: NightField, type: 'date' | 'time', value: string) => <div className="sleep-field"><label className="field">{labels[name]}<input type={type} name={name} required defaultValue={value} {...errors.field(name)}/></label><FieldError {...errors.message(name)}/></div>;
  const optional = (name: 'latency' | 'awake' | 'awakenings', label: string, value: number | undefined) => <div className="sleep-field"><label className="field">{label}<input type="text" inputMode="numeric" name={name} autoComplete="off" defaultValue={value ?? ''} {...errors.field(name)}/></label><FieldError {...errors.message(name)}/></div>;
  return <form className="sleep-form" onSubmit={submit} aria-label={night ? (night.kind === 'nap' ? 'Edit this nap' : 'Edit this night') : 'Log a night or a nap'} noValidate>{!night && <LoggingFor date={day} today={today}/>}
    {logged && <p className="fine" role="note">Last night is already logged, {formatTime(logged.start, {timeZone: logged.timeZone})}–{formatTime(logged.end!, {timeZone: logged.timeZone})}. Edit it from the list below, or log a nap or another night here.</p>}
    <fieldset className="sleep-kind"><legend>What are you logging?</legend>
      {(['night', 'nap'] as const).map(k => <label key={k}><input type="radio" name="kind" value={k} checked={kind === k} onChange={() => { setKind(k); errors.clear(); }}/><span>{k === 'night' ? 'A night' : 'A nap'}</span></label>)}
    </fieldset>
    <div className="sleep-form-row">
      {time('bedDate', 'date', start?.date ?? first!.bedDate)}
      {time('bedTime', 'time', start?.clock ?? first!.bedTime)}
    </div>
    <div className="sleep-form-row">
      {time('wakeDate', 'date', end?.date ?? first!.wakeDate)}
      {time('wakeTime', 'time', end?.clock ?? first!.wakeTime)}
    </div>
    <p className="fine">Times in {zone}.</p>
    <div className="sleep-form-row">
      {optional('latency', 'Time to fall asleep (minutes, optional)', night?.latencyMin)}
      {optional('awake', 'Time awake in the night (minutes, optional)', night?.awakeMin)}
      {optional('awakenings', 'Times you woke up (a count, optional)', night?.awakenings)}
    </div>
    <fieldset className="sleep-quality"><legend>How did it feel? (optional)</legend>
      <label><input type="radio" name="quality" value="" defaultChecked={night?.quality === undefined}/><span>Not rated</span></label>
      {QUALITY.map(([q, label]) => <label key={q}><input type="radio" name="quality" value={q} defaultChecked={night?.quality === q}/><span>{q} · {label}</span></label>)}
    </fieldset>
    <fieldset className="sleep-tags"><legend>Tags (optional)</legend>
      {SLEEP_TAGS.map(tag => <label key={tag}><input type="checkbox" checked={tags.includes(tag)} onChange={() => setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])}/><span>{tag}</span></label>)}
      <div className="sleep-field sleep-other-tags"><label className="field">Your own tags, separated by commas<input type="text" name="otherTags" maxLength={200} autoComplete="off" defaultValue={others} {...errors.field('otherTags')}/></label><FieldError {...errors.message('otherTags')}/></div>
    </fieldset>
    <label className="field">Note (optional)<textarea name="note" maxLength={1000} rows={2} defaultValue={night?.note ?? ''}/></label>
    <div className="actions"><button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : night ? 'Save changes' : 'Save'}</button>{onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}</div>
    {errors.formError && <p className="field-error" role="alert">{errors.formError}</p>}
  </form>;
}

const GOAL_STEPS = Array.from({length: 25}, (_, i) => 300 + i * 15);
/** The person's own sleep goal: how long, and optionally a bedtime window. */
export function SleepGoalForm({store, onDone}: {store: SleepStore; onDone: (text: string) => void}) {
  const goal = store.sleep.goal, [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const form = new FormData(e.currentTarget), from = String(form.get('bedFrom') ?? ''), to = String(form.get('bedTo') ?? '');
    if (Boolean(from) !== Boolean(to)) { setError('Choose both ends of the bedtime window, or neither.'); return; }
    setBusy(true);
    try { await store.update(s => setSleepGoal(s, {minutes: Number(form.get('minutes')), ...(from && to ? {bedFrom: from, bedTo: to} : {})}, new Date())); onDone('Your sleep goal is saved.'); }
    catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError('');
    // Session AH Part 3 (DS5): removing the goal gives a labelled Undo that sets the same goal again.
    const previous = store.sleep.goal;
    try { await store.update(s => setSleepGoal(s, null, new Date())); onDone('Your sleep goal is removed.'); if (previous) { const {updatedAt: _at, ...goal} = previous; void _at; showUndo({message: 'Your sleep goal is removed.', undone: 'Your sleep goal is back.', restore: () => store.update(s => s.goal ? s : setSleepGoal(s, goal, new Date()))}); } }
    catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  return <form className="sleep-form sleep-goal-form" onSubmit={submit} aria-label="Your sleep goal">
    <label className="field">Time asleep I aim for<select name="minutes" defaultValue={goal?.minutes ?? 480}>{GOAL_STEPS.map(m => <option key={m} value={m}>{formatMinutes(m)}</option>)}</select></label>
    <div className="sleep-form-row">
      <label className="field">In bed from (optional)<input type="time" name="bedFrom" defaultValue={goal?.bedFrom ?? ''}/></label>
      <label className="field">Until (optional)<input type="time" name="bedTo" defaultValue={goal?.bedTo ?? ''}/></label>
    </div>
    <p className="fine">Your own goal: ZIGoals suggests none. It is used for your sleep debt and the bedtime band.</p>
    {error && <p role="alert">{error}</p>}
    <div className="actions"><button type="submit" className="primary" disabled={busy}>Save goal</button>{goal && <button type="button" className="text-link" onClick={() => void remove()} disabled={busy}>Remove the goal</button>}</div>
  </form>;
}

'use client';
import {useState, type FormEvent} from 'react';
import {SLEEP_TAGS, type SleepNight} from '../../../lib/sleep/schema';
import {saveNight, setSleepGoal} from '../../../lib/sleep/engine';
import {addDays, formatMinutes, instantAt, wallClock} from '../../../lib/zone-time';
import type {SleepStore} from './use-sleep';

const QUALITY = [[1, 'Poor'], [2, 'Fair'], [3, 'OK'], [4, 'Good'], [5, 'Great']] as const;
/** A whole number of minutes, or undefined when left blank; anything else is refused with the field's name. */
function optionalMinutes(raw: FormDataEntryValue | null, label: string, max: number): number | undefined {
  const text = String(raw ?? '').trim();
  if (!text) return undefined;
  if (!/^\d{1,4}$/.test(text) || Number(text) > max) throw Error(`${label}: enter whole minutes from 0 to ${max}, or leave it empty.`);
  return Number(text);
}
const message = (error: unknown) => error instanceof Error && error.message && !error.message.startsWith('[') ? error.message : 'Check the times and try again.';

/**
 * Log a night or a nap, or edit one (Session W Part 4). Times are typed in the zone the night was lived in (shown); an
 * empty optional field stays unknown, never zero, and makes "asleep" an estimate. Saving writes once; nothing is saved
 * while typing.
 */
export function NightForm({store, night, onDone, onCancel}: {store: SleepStore; night?: SleepNight; onDone: (text: string) => void; onCancel?: () => void}) {
  const zone = night?.timeZone ?? store.zone;
  const start = night ? wallClock(Date.parse(night.start), zone) : null, end = night?.end ? wallClock(Date.parse(night.end), zone) : null;
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [tags, setTags] = useState<string[]>(night?.tags?.filter(t => (SLEEP_TAGS as readonly string[]).includes(t)) ?? []);
  const others = night?.tags?.filter(t => !(SLEEP_TAGS as readonly string[]).includes(t)).join(', ') ?? '';
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const form = new FormData(e.currentTarget);
    let input: Parameters<typeof saveNight>[1];
    try {
      const get = (name: string) => String(form.get(name) ?? '');
      if (!get('bedDate') || !get('bedTime') || !get('wakeDate') || !get('wakeTime')) throw Error('Enter when you went to bed and when you woke up.');
      const quality = get('quality') ? Number(get('quality')) : undefined;
      const custom = get('otherTags').split(',').map(t => t.trim()).filter(Boolean);
      if (custom.some(t => t.length > 24)) throw Error('Keep each of your own tags to 24 characters.');
      input = {id: night?.id, kind: get('kind') === 'nap' ? 'nap' : 'night', start: instantAt(get('bedDate'), get('bedTime'), zone), end: instantAt(get('wakeDate'), get('wakeTime'), zone), timeZone: zone,
        latencyMin: optionalMinutes(form.get('latency'), 'Time to fall asleep', 720), awakeMin: optionalMinutes(form.get('awake'), 'Time awake in the night', 1440),
        awakenings: optionalMinutes(form.get('awakenings'), 'Times you woke up', 100), quality, tags: [...tags, ...custom], note: get('note')};
    } catch (err) { setError(message(err)); return; }
    setBusy(true);
    try { await store.update(s => saveNight(s, input, new Date())); onDone(night ? 'Night updated.' : input.kind === 'nap' ? 'Nap saved.' : 'Night saved.'); }
    catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  const today = store.today;
  return <form className="sleep-form" onSubmit={submit} aria-label={night ? 'Edit this night' : 'Log a night or a nap'} noValidate>
    <fieldset className="sleep-kind"><legend>What are you logging?</legend>
      {(['night', 'nap'] as const).map(kind => <label key={kind}><input type="radio" name="kind" value={kind} defaultChecked={(night?.kind ?? 'night') === kind}/><span>{kind === 'night' ? 'A night' : 'A nap'}</span></label>)}
    </fieldset>
    <div className="sleep-form-row">
      <label className="field">Went to bed (date)<input type="date" name="bedDate" required defaultValue={start?.date ?? addDays(today, -1)}/></label>
      <label className="field">Went to bed (time)<input type="time" name="bedTime" required defaultValue={start?.clock ?? '23:00'}/></label>
    </div>
    <div className="sleep-form-row">
      <label className="field">Woke up (date)<input type="date" name="wakeDate" required defaultValue={end?.date ?? today}/></label>
      <label className="field">Woke up (time)<input type="time" name="wakeTime" required defaultValue={end?.clock ?? '07:00'}/></label>
    </div>
    <p className="fine">Times in {zone}.</p>
    <div className="sleep-form-row">
      <label className="field">Time to fall asleep (minutes, optional)<input type="text" inputMode="numeric" name="latency" autoComplete="off" defaultValue={night?.latencyMin ?? ''}/></label>
      <label className="field">Time awake in the night (minutes, optional)<input type="text" inputMode="numeric" name="awake" autoComplete="off" defaultValue={night?.awakeMin ?? ''}/></label>
      <label className="field">Times you woke up (optional)<input type="text" inputMode="numeric" name="awakenings" autoComplete="off" defaultValue={night?.awakenings ?? ''}/></label>
    </div>
    <fieldset className="sleep-quality"><legend>How did it feel? (optional)</legend>
      <label><input type="radio" name="quality" value="" defaultChecked={night?.quality === undefined}/><span>Not rated</span></label>
      {QUALITY.map(([q, label]) => <label key={q}><input type="radio" name="quality" value={q} defaultChecked={night?.quality === q}/><span>{q} · {label}</span></label>)}
    </fieldset>
    <fieldset className="sleep-tags"><legend>Tags (optional)</legend>
      {SLEEP_TAGS.map(tag => <label key={tag}><input type="checkbox" checked={tags.includes(tag)} onChange={() => setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])}/><span>{tag}</span></label>)}
      <label className="field sleep-other-tags">Your own tags, separated by commas<input type="text" name="otherTags" maxLength={200} autoComplete="off" defaultValue={others}/></label>
    </fieldset>
    <label className="field">Note (optional)<textarea name="note" maxLength={1000} rows={2} defaultValue={night?.note ?? ''}/></label>
    {error && <p role="alert">{error}</p>}
    <div className="actions"><button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : night ? 'Save changes' : 'Save'}</button>{onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}</div>
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
    try { await store.update(s => setSleepGoal(s, null, new Date())); onDone('Your sleep goal is removed.'); }
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

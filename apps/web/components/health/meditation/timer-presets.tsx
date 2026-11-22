'use client';
import {useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {EVERY_CHOICES, intervalText, MAX_INTERVALS, MAX_PRESETS, NAME_MAX, planSummary, presetIssue, RING_SOUNDS, secondsText, soundWord, timerPresetsNow, WARMUP_CHOICES, type BellSound, type IntervalBell, type TimerPlan, type TimerPreset} from '../../../lib/meditation/presets';
import {BELL_SOUNDS} from '../../../lib/meditation/schema';
import {MAX_MINUTES, MIN_MINUTES} from '../../../lib/meditation/timer';
import {ring} from '../../../lib/meditation/bells';
import {showUndo} from '../../ui/undo-toast';
import {FieldError, useFormErrors} from '../../primitives/field-error';
import './timer-presets.css';

/**
 * Session AV lane 2 (habits pillar; LEDGER #184, Insight Timer's meditation timer): "Your timer presets" on Health →
 * Meditation, loaded when its fold opens. A preset keeps a name, a length or no set length, a settling-in time, a start
 * and an end bell, one volume and up to five bells along the way (each repeating every so often, a number of times or
 * until the end, from the start or back from the end). Begin offers each preset as one choice. Kept with the habit extras
 * on this device (lib/meditation/presets.ts); a delete has the app's Undo.
 */
const LENGTHS = [5, 10, 15, 20, 30, 45, 60] as const;
const TIMES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50, 99] as const;
const BLANK: TimerPlan = {minutes: 20, warmup: 15, start: 'bowl', end: 'bowl', volume: 60, intervals: []};
const message = (error: unknown) => error instanceof Error && error.message ? error.message : 'This device could not keep the preset. Nothing changed.';

export default function TimerPresets({onChange}: {onChange: () => void}) {
  const [presets, setPresets] = useState<TimerPreset[]>([]), [editing, setEditing] = useState<string | 'new' | null>(null), [note, setNote] = useState('');
  const newButton = useRef<HTMLButtonElement>(null), focusAfter = useRef<string | null>(null);
  useEffect(() => { setPresets(timerPresetsNow()); }, []);
  // After a save, a cancel or a delete the focus goes to the preset's own Edit button, or to "New preset".
  useEffect(() => {
    const target = focusAfter.current; if (target === null || editing) return;
    focusAfter.current = null;
    (target ? document.getElementById(`timer-preset-edit-${target}`) : newButton.current)?.focus();
  }, [editing, presets]);
  const refresh = () => { setPresets(timerPresetsNow()); onChange(); };
  async function remove(p: TimerPreset) {
    try {
      const {deletePreset} = await import('../../../lib/meditation/presets-write');
      const undo = deletePreset(p.id);
      focusAfter.current = ''; refresh(); setNote(`The preset “${p.name}” is deleted.`);
      showUndo({message: `The preset “${p.name}” is deleted.`, undone: `The preset “${p.name}” is back.`, restore: () => { undo(); refresh(); }});
    } catch (error) { setNote(message(error)); }
  }
  const editingPreset = editing && editing !== 'new' ? presets.find(p => p.id === editing) : undefined;
  return <div className="timer-presets">
    <p className="fine">A preset keeps a length (or no set length), a moment to settle in before the first bell, a start bell and an end bell, and bells along the way, so one choice under Begin starts it. Kept on this device with your habit extras, and synced with them.</p>
    {presets.length ? <ul className="timer-preset-list" aria-label="Your timer presets">{presets.map(p => <li key={p.id}>
      <div><strong>{p.name}</strong><span>{planSummary(p)}</span>{p.intervals.map((i, n) => <small key={n}>{intervalText(i)}</small>)}</div>
      {editing !== p.id && <div className="actions"><button type="button" className="secondary" id={`timer-preset-edit-${p.id}`} onClick={() => setEditing(p.id)} aria-label={`Edit the preset ${p.name}`}>Edit</button><button type="button" className="quiet" onClick={() => void remove(p)} aria-label={`Delete the preset ${p.name}`}>Delete</button></div>}
    </li>)}</ul> : <p className="timer-preset-empty">No presets yet. Make one for the sitting you come back to, such as “Morning, 20 minutes, a bowl every 5 minutes”, and it appears under Begin.</p>}
    {editing ? <PresetForm key={editing} preset={editingPreset} others={presets} onCancel={() => { focusAfter.current = editingPreset?.id ?? ''; setEditing(null); }}
      onSaved={(name, id) => { focusAfter.current = id ?? ''; setEditing(null); refresh(); setNote(`Saved: the preset “${name}”. It is under Begin.`); }}/>
      : presets.length < MAX_PRESETS ? <button type="button" className="secondary" ref={newButton} onClick={() => { setNote(''); setEditing('new'); }}>New preset</button>
      : <p className="fine">You keep {MAX_PRESETS} presets, the most there can be. Delete one to add another.</p>}
    <p className="fine" role="status" aria-live="polite">{note}</p>
  </div>;
}

function PresetForm({preset, others, onSaved, onCancel}: {preset?: TimerPreset; others: readonly TimerPreset[]; onSaved: (name: string, id?: string) => void; onCancel: () => void}) {
  const start = preset ?? BLANK, form = useFormErrors(), uid = useId(), nameField = useRef<HTMLInputElement>(null), addButton = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState(preset?.name ?? ''), [length, setLength] = useState<number | 'own' | 'open'>(start.minutes === null ? 'open' : (LENGTHS as readonly number[]).includes(start.minutes) ? start.minutes : 'own');
  const [own, setOwn] = useState(start.minutes !== null && !(LENGTHS as readonly number[]).includes(start.minutes) ? String(start.minutes) : '');
  const [warmup, setWarmup] = useState(start.warmup), [startSound, setStartSound] = useState<BellSound>(start.start), [endSound, setEndSound] = useState<BellSound>(start.end), [volume, setVolume] = useState(start.volume);
  const [intervals, setIntervals] = useState<IntervalBell[]>(start.intervals), [busy, setBusy] = useState(false), [tried, setTried] = useState('');
  useEffect(() => { nameField.current?.focus(); }, []);
  const open = length === 'open';
  const change = (n: number, patch: Partial<IntervalBell>) => { setIntervals(list => list.map((i, k) => k === n ? {...i, ...patch} : i)); form.clear('interval'); };
  async function tryBell(s: BellSound) { setTried((await ring(s, volume)) ? '' : 'This browser could not play the bell. Sessions still work, silently.'); }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); form.clear();
    if (length === 'own' && !/^\d{1,3}$/.test(own.trim())) { form.fail({minutes: `Enter whole minutes from ${MIN_MINUTES} to ${MAX_MINUTES}, or choose No set length.`}); return; }
    const plan: TimerPlan = {minutes: open ? null : length === 'own' ? Number(own.trim()) : length, warmup, start: startSound, end: endSound, volume, intervals: open ? intervals.map(i => ({...i, from: 'start' as const})) : intervals};
    const issue = presetIssue({name, plan}, others, preset?.id);
    if (issue) { form.fail({[issue.field]: issue.message}); return; }
    setBusy(true);
    try { const {savePreset} = await import('../../../lib/meditation/presets-write'); savePreset({name, plan}, preset?.id); onSaved(name.trim(), preset?.id); }
    catch (error) { form.failForm(message(error)); }
    finally { setBusy(false); }
  }
  const soundSelect = (label: string, value: BellSound, set: (s: BellSound) => void) => <div className="timer-preset-sound">
    <label className="field">{label}<select value={value} onChange={e => set(e.target.value as BellSound)}>{BELL_SOUNDS.map(s => <option key={s} value={s}>{soundWord(s)}</option>)}</select></label>
    <button type="button" className="secondary" disabled={value === 'silent' || volume === 0} onClick={() => void tryBell(value)} aria-label={`Try the ${label.toLowerCase()}`}>Try</button>
  </div>;
  return <form className="meditation-form timer-preset-form" onSubmit={submit} aria-label={preset ? `Edit the preset ${preset.name}` : 'New timer preset'} noValidate>
    <label className="field">Name<input {...form.field('name')} ref={nameField} type="text" maxLength={NAME_MAX} autoComplete="off" value={name} onChange={e => { setName(e.target.value); form.clear('name'); }}/></label>
    <FieldError {...form.message('name')}/>
    <fieldset className="meditation-segment"><legend>How long?</legend>
      {LENGTHS.map(m => <label key={m}><input type="radio" name={`${uid}-length`} checked={length === m} onChange={() => { setLength(m); form.clear('minutes'); }}/><span>{m} min</span></label>)}
      <label><input type="radio" name={`${uid}-length`} checked={length === 'own'} onChange={() => setLength('own')}/><span>Your own</span></label>
      <label><input type="radio" name={`${uid}-length`} checked={open} onChange={() => { setLength('open'); form.clear('minutes'); }}/><span>No set length</span></label>
    </fieldset>
    {length === 'own' && <><label className="field meditation-custom">Minutes ({MIN_MINUTES}–{MAX_MINUTES})<input {...form.field('minutes')} type="text" inputMode="numeric" autoComplete="off" value={own} onChange={e => { setOwn(e.target.value); form.clear('minutes'); }}/></label><FieldError {...form.message('minutes')}/></>}
    {open && <p className="fine">The clock counts up and the session goes on until you end it (at most {MAX_MINUTES / 60} hours). The end bell rings when you end it.</p>}
    <label className="field">Settle in before the first bell<select value={warmup} onChange={e => setWarmup(Number(e.target.value))}>{[...new Set([...WARMUP_CHOICES, warmup])].sort((a, b) => a - b).map(s => <option key={s} value={s}>{s ? secondsText(s) : 'No settling-in time'}</option>)}</select></label>
    <div className="timer-preset-sounds">{soundSelect('Start bell', startSound, setStartSound)}{soundSelect('End bell', endSound, setEndSound)}</div>
    <label className="field">Volume · {volume}<input type="range" min={0} max={100} step={5} value={volume} onChange={e => setVolume(Number(e.target.value))}/></label>
    <fieldset className="timer-preset-intervals"><legend>Bells along the way</legend>
      {!intervals.length && <p className="fine">None: only the start and the end bell. A bell along the way can mark every few minutes, or the last minutes before the end.</p>}
      {intervals.map((i, n) => <fieldset key={n} className="timer-preset-interval"><legend>Bell {n + 1} along the way</legend>
        <label className="field">Sound<select value={i.sound} onChange={e => change(n, {sound: e.target.value as IntervalBell['sound']})}>{RING_SOUNDS.map(s => <option key={s} value={s}>{soundWord(s)}</option>)}</select></label>
        <label className="field">Every<select value={i.every} onChange={e => change(n, {every: Number(e.target.value)})}>{[...new Set([...EVERY_CHOICES, i.every])].sort((a, b) => a - b).map(s => <option key={s} value={s}>{secondsText(s)}</option>)}</select></label>
        <label className="field">How many times<select value={i.times ?? 0} onChange={e => change(n, {times: Number(e.target.value) || null})}><option value={0}>Until the end</option>{[...new Set([...TIMES, ...(i.times ? [i.times] : [])])].sort((a, b) => a - b).map(t => <option key={t} value={t}>{t === 1 ? 'Once' : `${t} times`}</option>)}</select></label>
        <label className="field">Counted<select value={open ? 'start' : i.from} disabled={open} onChange={e => change(n, {from: e.target.value === 'end' ? 'end' : 'start'})}><option value="start">From the start</option><option value="end">Back from the end</option></select></label>
        <div className="actions"><button type="button" className="secondary" onClick={() => void tryBell(i.sound)} aria-label={`Try bell ${n + 1} along the way`}>Try</button><button type="button" className="quiet" onClick={() => { setIntervals(list => list.filter((_, k) => k !== n)); form.clear('interval'); addButton.current?.focus(); }} aria-label={`Remove bell ${n + 1} along the way`}>Remove</button></div>
      </fieldset>)}
      {open && intervals.length > 0 && <p className="fine">With no set length, bells along the way count from the start.</p>}
      <button type="button" className="secondary" ref={addButton} {...form.field('interval')} disabled={intervals.length >= MAX_INTERVALS} onClick={() => { setIntervals(list => [...list, {sound: 'chime', every: 300, times: null, from: 'start'}]); form.clear('interval'); }}>{intervals.length >= MAX_INTERVALS ? `${MAX_INTERVALS} bells along the way, the most` : 'Add a bell along the way'}</button>
      <FieldError {...form.message('interval')}/>
    </fieldset>
    {tried && <p className="fine" role="status">{tried}</p>}
    {form.formError && <p role="alert">{form.formError}</p>}
    <div className="actions"><button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : preset ? 'Save changes' : 'Save preset'}</button><button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</button></div>
  </form>;
}

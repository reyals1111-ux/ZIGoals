'use client';
import {useState, type FormEvent} from 'react';
import {ENERGY} from '../../lib/energy/schema';
import {MOOD_TAGS, MAX_TAGS_PER_ENTRY} from '../../lib/mood-tags/schema';
import {addTag, removeTag, tagsOn} from '../../lib/mood-tags/tags';
import {ACTIVITY_SYMBOLS, MAX_ACTIVITY_CHARS, MAX_GROUP_CHARS, activityGroups, addActivity, readActivities, removeActivity} from '../../lib/daylio/rule';
import {plainErrorMessage} from '../../lib/plain-error';
import {useDeviceRecord} from '../ai/use-device-record';
import './mood-look.css';

/**
 * Session AV lane 2 (habits; LEDGER #179, Daylio's activities with icons and groups): your saved activities, in your own
 * groups, each with a symbol, tapped on the day's mood check-in. A tap adds (or takes off) the activity as that day's
 * mood tag, so Insights and "Each tag, month by month" read it like any tag. The list itself is kept in the energy
 * record's `checkin.activities` on this device. Private like Health: ZIGi and NOVA do not read tags or activities.
 * Loaded by the mood tags once the day has a mood.
 */
export default function Activities({day}: {day: string}) {
  const energy = useDeviceRecord(ENERGY), tags = useDeviceRecord(MOOD_TAGS), [note, setNote] = useState(''), [error, setError] = useState('');
  const [name, setName] = useState(''), [symbol, setSymbol] = useState<string>(ACTIVITY_SYMBOLS[0]), [group, setGroup] = useState('');
  if (!energy.loaded || !tags.loaded || tags.unreadable) return null;
  const list = readActivities(energy.data), on = new Set(tagsOn(tags.data, day).map(t => t.toLocaleLowerCase())), full = on.size >= MAX_TAGS_PER_ENTRY;
  const groups = activityGroups(list), groupNames = groups.map(g => g.group);
  const fail = (e: unknown, fallback: string) => { setError(plainErrorMessage(e, fallback)); setNote(''); };
  function tap(activity: string, isOn: boolean) {
    try { tags.update(r => isOn ? removeTag(r, day, tagsOn(r, day).find(t => t.toLocaleLowerCase() === activity.toLocaleLowerCase()) ?? activity) : addTag(r, day, activity)); setError(''); setNote(isOn ? `“${activity}” taken off this day.` : `“${activity}” added to this day.`); }
    catch (e) { fail(e, 'Not saved. Nothing was changed.'); }
  }
  function add(e: FormEvent) {
    e.preventDefault();
    try { energy.update(r => addActivity(r, {name, symbol, group})); setError(''); setNote(`“${name.trim()}” is in your activities.`); setName(''); }
    catch (err) { fail(err, 'The activity was not saved.'); }
  }
  return <div className="mood-activities">
    {list.length ? groups.map(g => <div key={g.group} className="mood-activity-group" role="group" aria-label={g.group}>
      <h4>{g.group}</h4>
      <ul className="ap-chips">{g.items.map(a => { const isOn = on.has(a.name.toLocaleLowerCase()); return <li key={a.id}><button type="button" className={isOn ? 'secondary' : 'quiet'} aria-pressed={isOn} disabled={!isOn && full} onClick={() => tap(a.name, isOn)}><span aria-hidden="true">{a.symbol} </span>{a.name}</button></li>; })}</ul>
    </div>) : <p className="fine">Save the things your days often hold (a walk, friends, work, coffee) as activities in your own groups; then one tap adds one to a day.</p>}
    <details className="mood-activities-edit"><summary>Edit your activities</summary>
      {list.length > 0 && <ul className="mood-activity-list" aria-label="Your activities">{list.map(a => <li key={a.id}><span><span aria-hidden="true">{a.symbol} </span>{a.name} <small>· {a.group}</small></span><button type="button" className="quiet" aria-label={`Remove ${a.name} from your activities`} onClick={() => { try { energy.update(r => removeActivity(r, a.id)); setNote(`“${a.name}” removed from your activities; days that had it keep it.`); } catch (e) { fail(e, 'Not removed.'); } }}>Remove</button></li>)}</ul>}
      <form className="mood-activity-form" aria-label="Add an activity" onSubmit={add}>
        <label className="field"><span>Activity, up to {MAX_ACTIVITY_CHARS} characters</span><input type="text" maxLength={MAX_ACTIVITY_CHARS} autoComplete="off" value={name} onChange={e => setName(e.target.value)} required/></label>
        <label className="field"><span>Group (optional)</span><input type="text" maxLength={MAX_GROUP_CHARS} autoComplete="off" list={`groups-${day}`} placeholder="Other" value={group} onChange={e => setGroup(e.target.value)}/></label>
        <datalist id={`groups-${day}`}>{groupNames.map(g => <option key={g} value={g}/>)}</datalist>
        <fieldset className="mood-symbols"><legend>Symbol</legend>{ACTIVITY_SYMBOLS.map(s => <label key={s} className="mood-symbol"><input type="radio" name={`activity-symbol-${day}`} checked={symbol === s} onChange={() => setSymbol(s)}/><span aria-hidden="true">{s}</span><span className="sr-only">Symbol {s}</span></label>)}</fieldset>
        <button type="submit" className="secondary">Add activity</button>
      </form>
    </details>
    {error && <p role="alert">{error}</p>}
    <p className="fine" role="status" aria-live="polite">{note}</p>
  </div>;
}

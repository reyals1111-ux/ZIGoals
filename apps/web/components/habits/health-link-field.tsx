'use client';
import {useState} from 'react';
import {formNumberText, readFormNumber} from '../../lib/decimal-input';
import {healthLinkV4Issue, type HabitHealthLinkV4 as HabitHealthLink, type HealthMeasureV4 as HealthMeasure} from '../../lib/habit-health-links/schema';
import type {ExerciseCounter} from '../../lib/health-counters';
import {SYNC_WRITES} from '../../lib/vault/sync-writes';

const FL_OZ = 29.5735295625;
/** The editor's view of a link: a measure (or none), a counter for the exercise measure, a rule and a typed target in the Health water unit. */
export type HealthLinkDraft = {measure: HealthMeasure | ''; exerciseId: string; rule: 'at-least' | 'recorded' | 'by'; target: string};
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export function healthLinkDraft(link: HabitHealthLink | null | undefined, waterUnit: 'ml' | 'fl-oz-us'): HealthLinkDraft {
  if (!link) return {measure: '', exerciseId: '', rule: 'at-least', target: ''};
  // Session W Part 4: a sleep target is typed in hours, a bedtime as a clock time.
  if (link.measure === 'bedtimeBy') return {measure: 'bedtimeBy', exerciseId: '', rule: 'by', target: link.target === undefined ? '' : clock(link.target)};
  if (link.measure === 'sleepMinutes') return {measure: 'sleepMinutes', exerciseId: '', rule: link.rule, target: link.target === undefined ? '' : formNumberText(Math.round(link.target / 60 * 100) / 100)};
  const target = link.target === undefined ? '' : formNumberText(link.measure === 'water' && waterUnit === 'fl-oz-us' ? Math.round(link.target / FL_OZ * 10) / 10 : link.target);
  return {measure: link.measure, exerciseId: link.exerciseId ?? '', rule: link.rule, target};
}
/** The link a draft describes (water targets stored in millilitres), null for none. Throws the field's own message when it cannot be saved. */
export function healthLinkFromDraft(draft: HealthLinkDraft, waterUnit: 'ml' | 'fl-oz-us', now = new Date()): HabitHealthLink | null {
  if (!draft.measure) return null;
  const rule = draft.measure === 'weight' ? 'recorded' : draft.measure === 'bedtimeBy' ? 'by' : draft.rule === 'by' ? 'at-least' : draft.rule;
  let target: number | undefined;
  if (draft.measure === 'bedtimeBy') {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(draft.target.trim());
    if (!match) throw Error('Choose the time to be in bed by.');
    target = Number(match[1]) * 60 + Number(match[2]);
  } else if (draft.measure === 'sleepMinutes' && rule === 'at-least') {
    let hours: number;
    try { hours = readFormNumber(draft.target, {min: 0, max: 24}); } catch { throw Error('Enter the hours of sleep, for example 7.5.'); }
    target = Math.round(hours * 60);
  } else if (rule === 'at-least') {
    try { target = readFormNumber(draft.target, {min: 0, max: 1_000_000_000, whole: draft.measure === 'steps' || draft.measure === 'exercise'}); } catch { throw Error('Enter a target above zero.'); }
    if (draft.measure === 'water' && waterUnit === 'fl-oz-us') target = Math.round(target * FL_OZ * 1000) / 1000;
  }
  const link: HabitHealthLink = {version: 1, measure: draft.measure, rule, ...(target === undefined ? {} : {target}), ...(draft.measure === 'exercise' && draft.exerciseId ? {exerciseId: draft.exerciseId} : {}), updatedAt: now.toISOString()};
  const issue = healthLinkV4Issue(link);
  if (issue) throw Error(issue);
  return link;
}
const UNITS: Record<Exclude<HealthMeasure, 'weight' | 'bedtimeBy'>, (waterUnit: 'ml' | 'fl-oz-us') => string> = {water: u => u === 'fl-oz-us' ? 'US fl oz' : 'mL', steps: () => 'steps', activeMinutes: () => 'minutes', exercise: () => 'reps', sleepMinutes: () => 'hours asleep', meditationMinutes: () => 'minutes'};
/**
 * "Done automatically from Health" (H7): the editor section for a build habit. The link is this device's own
 * (lib/habit-health-links) and is saved apart from the habit, like the reminder time.
 */
export function HealthLinkField({draft, onChange, counters, waterUnit, unreadable, onStartOver}: {draft: HealthLinkDraft; onChange: (draft: HealthLinkDraft) => void; counters: readonly ExerciseCounter[]; waterUnit: 'ml' | 'fl-oz-us'; unreadable?: boolean; onStartOver?: () => void}) {
  const [confirming, setConfirming] = useState(false);
  const selected = draft.measure === 'exercise' ? `exercise:${draft.exerciseId}` : draft.measure;
  const choose = (value: string) => {
    if (value.startsWith('exercise:')) onChange({...draft, measure: 'exercise', exerciseId: value.slice('exercise:'.length)});
    else onChange({...draft, measure: value as HealthMeasure | '', exerciseId: '', rule: value === 'weight' ? 'recorded' : value === 'bedtimeBy' ? 'by' : draft.rule === 'by' ? 'at-least' : draft.rule, ...(value === 'bedtimeBy' || draft.measure === 'bedtimeBy' ? {target: value === 'bedtimeBy' ? '23:00' : ''} : {})});
  };
  return <fieldset className="habit-health-link" aria-label="Done automatically from Health">
    <legend><span className="eyebrow">From your Health journal</span></legend>
    {unreadable ? <div className="notice" role="alert"><p>Your saved Health links on this device could not be read. They were not changed.</p>
      {onStartOver && (confirming ? <div className="actions"><p className="fine">Start over keeps the old bytes as a recovery copy and continues with no links.</p><button type="button" className="secondary" onClick={() => { setConfirming(false); onStartOver(); }}>Start over</button><button type="button" className="quiet" onClick={() => setConfirming(false)}>Keep them</button></div> : <button type="button" className="quiet" onClick={() => setConfirming(true)}>Start over…</button>)}</div> : <>
      <label className="field">Done automatically when<select value={selected} onChange={event => choose(event.target.value)}>
        <option value="">Nothing · I tick it off myself</option><option value="water">Water</option><option value="steps">Steps</option><option value="activeMinutes">Active minutes</option><option value="weight">A weight reading</option>
        {counters.map(counter => <option key={counter.id} value={`exercise:${counter.id}`}>Exercise counter: {counter.name}</option>)}
        {SYNC_WRITES && <><option value="sleepMinutes">Time asleep</option><option value="bedtimeBy">In bed by a time</option></>}
      </select></label>
      {draft.measure === 'weight' && <p className="fine">When a weight reading is recorded that day.</p>}
      {draft.measure === 'bedtimeBy' && <label className="field habit-health-link-time">In bed by<input type="time" value={draft.target} onChange={event => onChange({...draft, target: event.target.value})} /></label>}
      {(draft.measure === 'sleepMinutes' || draft.measure === 'bedtimeBy') && <p className="fine">Counts the night that ended that day, from your sleep log (Health → Sleep).</p>}
      {draft.measure && draft.measure !== 'weight' && draft.measure !== 'bedtimeBy' && <div className="habit-health-link-rule" role="radiogroup" aria-label="Rule">
        <label><input type="radio" name="health-link-rule" value="at-least" checked={draft.rule === 'at-least'} onChange={() => onChange({...draft, rule: 'at-least'})} /><span>the day reaches at least</span>
          <input type="text" inputMode="decimal" autoComplete="off" aria-label="Target" disabled={draft.rule !== 'at-least'} value={draft.target} onChange={event => onChange({...draft, target: event.target.value})} /><span>{UNITS[draft.measure](waterUnit)}</span></label>
        <label><input type="radio" name="health-link-rule" value="recorded" checked={draft.rule === 'recorded'} onChange={() => onChange({...draft, rule: 'recorded'})} /><span>{draft.measure === 'sleepMinutes' ? 'a night is logged' : 'anything is recorded'}</span></label>
      </div>}
      {draft.measure && <p className="fine">ZIGoals checks your Health journal when you open Today, Habits or Health, and ticks this habit off once per day. A tap always wins; Undo keeps it off for that day. {SYNC_WRITES ? 'Kept with your Health records.' : 'Kept on this device.'}</p>}
    </>}
  </fieldset>;
}

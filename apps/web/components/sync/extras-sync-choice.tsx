'use client';
import {useEffect, useId, useState} from 'react';
import {getAppStorage} from '../../lib/showcase-storage';
import {EXTRAS_CHOICE_KEY, EXTRAS_CHOICE_SECTIONS, EXTRAS_CHOICE_SECTIONS_FIELD, type ExtrasChoiceSectionName} from '../../lib/vault/extras-keys';
import type {ExtrasStatus} from '../vault-context';

/** On unless turned off on this device (owner decision, ADR-023); read without loading the sync code (also by Settings → Sync's section rows). */
export function readExtrasChoiceNow(): {enabled: boolean; explained: boolean} {
  try { const raw = getAppStorage().getItem(EXTRAS_CHOICE_KEY); if (raw === null) return {enabled: true, explained: false}; const v = JSON.parse(raw); return {enabled: v?.enabled !== false, explained: v?.explained === true}; } catch { return {enabled: true, explained: false}; }
}
// Session AM (ADR-038 D18): the Checklist's and NOVA's sections are named too (a section without a name here read as an empty place in the line).
// Session AV lane 2 (sync): and the three sections chosen one by one.
const SECTION_DONE: Record<string, string> = {goals: 'goal extras', life: 'calculator, Life review, Today and reminders', habits: 'habit extras', health: 'Health extras', checklist: 'Checklist items', nova: 'NOVA requests, pinned widgets and layout', journal: 'journal', money: 'money records', workouts: 'workout log'};
/** Session AV lane 2 (sync): which of the three this device chose; off unless chosen (read without loading the sync code). */
export function readSectionsChoiceNow(): Record<ExtrasChoiceSectionName, boolean> {
  let sections: Record<string, unknown> = {};
  try { const raw = getAppStorage().getItem(EXTRAS_CHOICE_KEY); const v = raw === null ? null : JSON.parse(raw); const field = v && typeof v === 'object' ? v[EXTRAS_CHOICE_SECTIONS_FIELD] : null; if (field && typeof field === 'object') sections = field; } catch { /* none chosen */ }
  return Object.fromEntries(EXTRAS_CHOICE_SECTIONS.map(name => [name, sections[name] === true])) as Record<ExtrasChoiceSectionName, boolean>;
}
/** The three choices in plain words: what travels and what stays. */
export const SECTION_CHOICES: readonly {name: ExtrasChoiceSectionName; label: string; note: string; removeLabel: string}[] = [
  {name: 'journal', label: 'Also sync my journal', removeLabel: 'Remove my journal from the cloud', note: 'Entries, your journals, templates and prompt packs. Photos and voice notes stay on the device where you added them; earlier versions, the reminder to write, ZIGi’s permission and what Today shows stay on each device.'},
  {name: 'money', label: 'Also sync my money records', removeLabel: 'Remove my money records from the cloud', note: 'The spending log, budgets and pay periods, bills, rules, tags and what you marked as reviewed.'},
  {name: 'workouts', label: 'Also sync my workout log', removeLabel: 'Remove my workout log from the cloud', note: 'Workouts, routines, your own exercises and run splits. This is Health data, so it travels only while Health sync is on.'},
];
export const EXTRAS_EXPLAINED = 'Your goal plans and life areas, sub-goals, stories and card art, average goals, calculator scenarios, the Life review focus, Today’s cards, the reminders plan, habit extras, routines and the game now travel with your encrypted sync, so your other devices show them too. Health extras (the coach’s answers, micronutrient and vitamin targets, how macros are shown, aisles and custom measurements) travel only while Health sync is on. Photos, recent searches and the welcome’s setup stay on this device.';

/** Focus never drops to the page when a confirmation closes: it goes to the element that is there afterwards. */
const refocus = (target: string) => { setTimeout(() => document.getElementById(target)?.focus(), 0); };

function line(status: ExtrasStatus | null, health: boolean): string | null {
  if (!status) return null;
  if (status.state === 'off') return 'Extras stay on this device.';
  if (status.state === 'removed') return 'The extras’ encrypted copy was deleted. Your extras on this device were not changed.';
  if (status.state === 'deleted-elsewhere') return 'The extras’ encrypted copy was deleted on another device, so extras sync is off here. Tick it again to upload this device’s extras.';
  if (status.state === 'error') return status.message;
  const problems = status.outcomes.filter(o => o.state === 'error' || o.state === 'unreadable');
  if (problems.length) return problems.map(o => o.message).join(' ');
  const skipped = status.outcomes.some(o => o.state === 'skipped');
  const pulled = status.outcomes.filter(o => o.state === 'pulled' || o.state === 'merged').map(o => SECTION_DONE[o.section]);
  // Gate B (security read, findings 2 and 6): a section waiting after a key change, or Health held after a cloud deletion, says so.
  // Session AV lane 2 (sync): and a chosen section removed from the cloud on another device says so too.
  const notes = status.outcomes.filter(o => (o.state === 'waiting' || o.state === 'skipped' || o.state === 'deleted') && o.message).map(o => o.message);
  return `Extras synced at ${status.at}.${pulled.length ? ` Updated from your other devices: ${pulled.join(', ')}.` : ''}${skipped && !health ? ` Health extras${status.outcomes.some(o => o.section === 'workouts' && o.state === 'skipped' && !o.message) ? ' and your workout log' : ''} stay on this device until Health sync is on.` : ''}${notes.length ? ` ${notes.join(' ')}` : ''}`;
}

/**
 * Session AB-Cloud Part 2 (ADR-023 C1–C5): "Also sync my extras", beside the Portfolio's choice in Settings → Sync. On by
 * default for an account that syncs (owner decision 2026-10-13) with a one-time note of what that means; turning it off
 * stops transfers on this device and keeps the copy; "Remove from the cloud" deletes the copy and every device stops.
 * Minimal and in the panel's existing style; AB-Design may restyle it.
 */
export function ExtrasSyncChoice({opened, busy, health, status, onEnable, onRemove}: {opened: boolean; busy: boolean; health: boolean; status: ExtrasStatus | null; onEnable: (on: boolean) => Promise<void>; onRemove: (section?: ExtrasChoiceSectionName) => Promise<void>}) {
  const id = useId();
  const [choice, setChoice] = useState(readExtrasChoiceNow), [confirming, setConfirming] = useState(false), [note, setNote] = useState('');
  // Session AV lane 2 (sync; LEDGER #41, #134, #209): the journal, the money records and the workout log, each chosen here.
  const [sections, setSections] = useState(readSectionsChoiceNow), [removing, setRemoving] = useState<ExtrasChoiceSectionName | null>(null);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) { setChoice(readExtrasChoiceNow()); setSections(readSectionsChoiceNow()); } }); return () => { active = false; }; }, [status]);
  async function chooseSection(name: ExtrasChoiceSectionName, on: boolean) {
    setNote('');
    try {
      const {writeExtrasSectionChoice} = await import('../../lib/vault/extras-sync');
      writeExtrasSectionChoice(getAppStorage(), name, on); setSections(readSectionsChoiceNow());
      // Chosen: it travels with a sync now. Not chosen: it stops travelling from this device; its copy is kept.
      if (on) await onEnable(true);
    } catch { setNote('This choice could not be saved on this device. Nothing was synced.'); }
  }
  async function choose(enabled: boolean) {
    setNote('');
    try { await onEnable(enabled); setChoice({enabled, explained: true}); }
    catch { setNote('This choice could not be saved on this device. Nothing was synced.'); }
  }
  async function understood() {
    try { const {writeExtrasChoice} = await import('../../lib/vault/extras-sync'); writeExtrasChoice(getAppStorage(), {enabled: choice.enabled, explained: true}); setChoice({...choice, explained: true}); }
    catch { setNote('This could not be saved on this device.'); }
  }
  // Session AV lane 2 (fixb2): while a sync runs the boxes say they are unavailable (aria-disabled) and take no change, but
  // stay focusable: a ticked box that turned `disabled` as the sync it started ran dropped the keyboard's focus to the page.
  const said = line(status, health);
  return <div className="extras-sync-choice" data-region="extras-sync">
    <label className="checkbox" htmlFor={id + 'extras'}><input id={id + 'extras'} type="checkbox" checked={choice.enabled} aria-disabled={busy || undefined} aria-describedby={id + 'extras-note'} onChange={e => { if (!busy) void choose(e.target.checked); }} />Also sync my extras</label>
    <p className="fine" id={id + 'extras-note'}>Encrypted like your account records, in their own sections that older versions of ZIGoals leave alone. Turning this off stops extras transfers on this device; it does not delete the copy.</p>
    {!choice.explained && <div className="notice" role="note" aria-labelledby={id + 'extras-new'}>
      <p id={id + 'extras-new'}><strong>New:</strong> {EXTRAS_EXPLAINED}</p>
      <div className="actions"><button type="button" className="secondary" onClick={() => void understood()}>Got it</button></div>
    </div>}
    {/* A polite live line, not a second role="status": the panel's own status line stays the one status of Encrypted account sync. */}
    {said && <p className="fine" aria-live="polite">{said}</p>}
    {choice.enabled && <div className="extras-sync-sections" role="group" aria-labelledby={id + 'sections'}>
      <p id={id + 'sections'}><strong>Also, if you choose</strong> — these stayed on this device until now, so each travels only once you tick it here:</p>
      {SECTION_CHOICES.map(c => <div key={c.name} className="extras-sync-section">
        <label className="checkbox" htmlFor={id + c.name}><input id={id + c.name} type="checkbox" checked={sections[c.name]} aria-disabled={busy || undefined} aria-describedby={id + c.name + '-note'} onChange={e => { if (!busy) void chooseSection(c.name, e.target.checked); }} />{c.label}</label>
        <p className="fine" id={id + c.name + '-note'}>{c.note}{c.name === 'workouts' && sections.workouts && !health ? ' Health sync is off in this tab, so it waits on this device.' : ''}</p>
        {opened && sections[c.name] && (removing === c.name
          ? <div className="actions"><p className="fine">Every device then stops syncing it, and each keeps its own.</p><button type="button" className="secondary" disabled={busy} onClick={() => { setRemoving(null); refocus(id + c.name); void onRemove(c.name); }}>{c.removeLabel}</button><button type="button" className="quiet" onClick={() => { setRemoving(null); refocus(id + c.name + '-remove'); }}>Keep it</button></div>
          : <button type="button" id={id + c.name + '-remove'} className="quiet" disabled={busy} onClick={() => setRemoving(c.name)}>{c.removeLabel}…</button>)}
      </div>)}
    </div>}
    {opened && choice.enabled && (confirming ? <div className="actions"><p className="fine">Every device then stops syncing its extras, and each keeps its own.</p><button type="button" className="secondary" disabled={busy} onClick={() => { setConfirming(false); void onRemove(); }}>Remove the extras from the cloud</button><button type="button" className="quiet" onClick={() => setConfirming(false)}>Keep them</button></div>
      : <button type="button" className="quiet" disabled={busy} onClick={() => setConfirming(true)}>Remove the extras from the cloud…</button>)}
    {note && <p role="alert">{note}</p>}
  </div>;
}

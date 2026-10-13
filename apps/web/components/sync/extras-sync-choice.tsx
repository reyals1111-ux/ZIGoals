'use client';
import {useEffect, useId, useState} from 'react';
import {getAppStorage} from '../../lib/showcase-storage';
import {EXTRAS_CHOICE_KEY} from '../../lib/vault/extras-keys';
import type {ExtrasStatus} from '../vault-sync-controls';

/** On unless turned off on this device (owner decision, ADR-023); read without loading the sync code. */
function readChoice(): {enabled: boolean; explained: boolean} {
  try { const raw = getAppStorage().getItem(EXTRAS_CHOICE_KEY); if (raw === null) return {enabled: true, explained: false}; const v = JSON.parse(raw); return {enabled: v?.enabled !== false, explained: v?.explained === true}; } catch { return {enabled: true, explained: false}; }
}
const SECTION_DONE: Record<string, string> = {goals: 'goal extras', life: 'calculator, Life review, Today and reminders', habits: 'habit extras', health: 'Health extras'};
export const EXTRAS_EXPLAINED = 'Your goal plans and life areas, sub-goals, stories and card art, average goals, calculator scenarios, the Life review focus, Today’s cards, the reminders plan, habit extras, routines and the game now travel with your encrypted sync, so your other devices show them too. Health extras (the coach’s answers, micronutrient and vitamin targets, how macros are shown, aisles and custom measurements) travel only while Health sync is on. Photos, recent searches and the welcome’s setup stay on this device.';

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
  return `Extras synced at ${status.at}.${pulled.length ? ` Updated from your other devices: ${pulled.join(', ')}.` : ''}${skipped && !health ? ' Health extras stay on this device until Health sync is on.' : ''}`;
}

/**
 * Session AB-Cloud Part 2 (ADR-023 C1–C5): "Also sync my extras", beside the Portfolio's choice in Settings → Sync. On by
 * default for an account that syncs (owner decision 2026-10-13) with a one-time note of what that means; turning it off
 * stops transfers on this device and keeps the copy; "Remove from the cloud" deletes the copy and every device stops.
 * Minimal and in the panel's existing style; AB-Design may restyle it.
 */
export function ExtrasSyncChoice({opened, busy, health, status, onEnable, onRemove}: {opened: boolean; busy: boolean; health: boolean; status: ExtrasStatus | null; onEnable: (on: boolean) => Promise<void>; onRemove: () => Promise<void>}) {
  const id = useId();
  const [choice, setChoice] = useState(readChoice), [confirming, setConfirming] = useState(false), [note, setNote] = useState('');
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) setChoice(readChoice()); }); return () => { active = false; }; }, [status]);
  async function choose(enabled: boolean) {
    setNote('');
    try { await onEnable(enabled); setChoice({enabled, explained: true}); }
    catch { setNote('This choice could not be saved on this device. Nothing was synced.'); }
  }
  async function understood() {
    try { const {writeExtrasChoice} = await import('../../lib/vault/extras-sync'); writeExtrasChoice(getAppStorage(), {enabled: choice.enabled, explained: true}); setChoice({...choice, explained: true}); }
    catch { setNote('This could not be saved on this device.'); }
  }
  const said = line(status, health);
  return <div className="extras-sync-choice" data-region="extras-sync">
    <label className="checkbox" htmlFor={id + 'extras'}><input id={id + 'extras'} type="checkbox" checked={choice.enabled} disabled={busy} aria-describedby={id + 'extras-note'} onChange={e => void choose(e.target.checked)} />Also sync my extras</label>
    <p className="fine" id={id + 'extras-note'}>Encrypted like your account records, in their own sections that older versions of ZIGoals leave alone. Turning this off stops extras transfers on this device; it does not delete the copy.</p>
    {!choice.explained && <div className="notice" role="note" aria-labelledby={id + 'extras-new'}>
      <p id={id + 'extras-new'}><strong>New:</strong> {EXTRAS_EXPLAINED}</p>
      <div className="actions"><button type="button" className="secondary" onClick={() => void understood()}>Got it</button></div>
    </div>}
    {said && <p className="fine" role="status">{said}</p>}
    {opened && choice.enabled && (confirming ? <div className="actions"><p className="fine">Every device then stops syncing its extras, and each keeps its own.</p><button type="button" className="secondary" disabled={busy} onClick={() => { setConfirming(false); void onRemove(); }}>Remove the extras from the cloud</button><button type="button" className="quiet" onClick={() => setConfirming(false)}>Keep them</button></div>
      : <button type="button" className="quiet" disabled={busy} onClick={() => setConfirming(true)}>Remove the extras from the cloud…</button>)}
    {note && <p role="alert">{note}</p>}
  </div>;
}

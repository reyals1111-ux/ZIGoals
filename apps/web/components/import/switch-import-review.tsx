'use client';
import {useMemo, useState} from 'react';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {wallClock, formatMinutes} from '../../lib/zone-time';
import {asleep} from '../../lib/sleep/engine';
import {scheduleLabel, type HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import {GROUP_LIMIT_WORDS, GROUP_LIMITS, previewImport, sinceDay, sizeCheck, windowThatFits, type ImportItems, type ImportPlan} from '../../lib/import/switch/apply';
import {previewHabits, type HabitsPlan} from '../../lib/import/switch/loop';
import {GROUPS, n, bytesText} from './switch-import-text';

/**
 * Switch to ZIGoals' preview and undo code (Session X Part 5): the two previews moved unchanged from switch-import.tsx, and
 * the plan, apply and undo functions they and the import's confirm and undo use. Settings loads this file together with
 * the reader when a person chooses an export, or when "Undo this import" is pressed, instead of with the page.
 */
export {batchFor, undoImport, undoPlan} from '../../lib/import/switch/apply';
export {undoHabits, undoHabitsPlan} from '../../lib/import/switch/loop';
export {previewImport, sizeCheck, previewHabits};

export function HealthPreview({plan, health, limit, zone, onConfirm, onCancel}: {plan: ImportPlan; health: HealthData; limit: number; zone: string; onConfirm: (items: ImportItems, plan: ImportPlan) => Promise<void>; onCancel: () => void}) {
  const [agreed, setAgreed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [from, setFrom] = useState<string | null>(null);
  // A preview that cannot be made (a record the journal refuses) is said plainly instead of breaking the page.
  const whole = useMemo(() => { try { const full = previewImport(health, plan.items), fullSize = sizeCheck(full.next, limit); return {full, fullSize, fitFrom: fullSize.comfortable ? null : windowThatFits(health, plan.items, limit)}; } catch (cause) { return cause instanceof Error && cause.message ? cause.message : 'This export could not be prepared.'; } }, [health, plan, limit]);
  const items = useMemo(() => from ? sinceDay(plan.items, from) : plan.items, [from, plan.items]);
  const part = useMemo(() => { if (typeof whole === 'string' || !from) return null; try { const chosen = previewImport(health, items); return {chosen, size: sizeCheck(chosen.next, limit)}; } catch (cause) { return cause instanceof Error && cause.message ? cause.message : 'This export could not be prepared.'; } }, [whole, from, health, items, limit]);
  if (typeof whole === 'string' || typeof part === 'string') return <div className="switch-preview"><p role="alert">{typeof whole === 'string' ? whole : part as string} Nothing was changed.</p><div className="actions"><button type="button" className="secondary" onClick={onCancel}>Start over</button></div></div>;
  const {fullSize, fitFrom} = whole, chosen = part?.chosen ?? whole.full, size = part?.size ?? fullSize;
  const adding = GROUPS.reduce((t, [g]) => t + chosen.preview[g].added, 0);
  const sample = [...plan.items.sleep].filter(night => !from || (night.end ?? night.start).slice(0, 10) >= from).slice(-3).reverse();
  const range = chosen.preview.range;
  return <div className="switch-preview">
    <h3>Check what comes in</h3>
    <p className="import-summary">{plan.label} export{range ? ` · ${formatDate(`${range.from}T12:00:00Z`, {timeZone: 'UTC'})} – ${formatDate(`${range.to}T12:00:00Z`, {timeZone: 'UTC'})}` : ''}</p>
    <div className="import-preview"><table>
      <caption className="sr-only">What this import would add to your Health journal</caption>
      <thead><tr><th scope="col">Records</th><th scope="col">To add</th><th scope="col">Already here</th><th scope="col">Stays out</th></tr></thead>
      <tbody>{GROUPS.map(([g, label]) => { const o = chosen.preview[g]; return <tr key={g}><th scope="row">{label}</th><td className="num">{n(o.added)}</td><td className="num">{n(o.duplicates)}</td><td className="num">{n(o.kept + o.full)}</td></tr>; })}</tbody>
    </table></div>
    <p className="fine">“Already here” means the same record from this export (imported before, or on another device). “Stays out” means your journal already has that night, or that day’s steps or weight: one source per day, never two added together.</p>
    {GROUPS.filter(([g]) => chosen.preview[g].full > 0).map(([g]) => <p key={g} className="notice">{n(chosen.preview[g].full)} older {GROUP_LIMIT_WORDS[g]} stay out: your Health journal keeps at most {n(GROUP_LIMITS[g])}. The newest are imported.</p>)}
    {sample.length > 0 && <div className="switch-sample"><h4>A few nights to check against what you remember</h4><ul className="import-preview-lines">{sample.map(night => {
      const bed = wallClock(Date.parse(night.start), night.timeZone), up = night.end ? wallClock(Date.parse(night.end), night.timeZone) : null, a = asleep(night);
      return <li key={night.id}>{night.kind === 'nap' ? 'Nap' : 'Night'} ending {up?.date ?? bed.date}: in bed {bed.clock} → up {up?.clock ?? '—'}{night.timeZone !== zone ? ` (${night.timeZone})` : ''}{a ? ` · ${formatMinutes(a.minutes)} asleep${a.estimated ? ' (estimated)' : ''}` : ''}</li>;
    })}</ul></div>}
    {plan.summarised.length > 0 && <div className="switch-summarised"><h4>Kept as summaries</h4><ul>{plan.summarised.map(s => <li key={s}>{s}</li>)}</ul></div>}
    {plan.warnings.length > 0 && <details className="import-warnings"><summary>{n(plan.warnings.length)} {plan.warnings.length === 1 ? 'note' : 'notes'} about this export</summary><ul>{plan.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    <div className="switch-size">
      <p>Your Health journal after this import: {bytesText(size.bytes)} of {bytesText(size.limit)} ({formatNumber(Math.min(999, size.bytes / size.limit * 100), {maximumFractionDigits: 0})} %).</p>
      {!fullSize.comfortable && <>
        <p className="notice">The whole export would fill more than three quarters of what {limit > 2_000_000 ? 'your account' : 'this browser'} keeps for Health.{fitFrom ? ' You can bring in a shorter window instead.' : ' Even its last day would not fit comfortably here.'}{limit <= 2_000_000 ? ' With an account open, Health can hold up to 32 MB.' : ''}</p>
        {fitFrom && <fieldset className="switch-window"><legend>What to bring in</legend>
          <label className="checkbox"><input type="radio" name="switch-window" checked={from === fitFrom} onChange={() => setFrom(fitFrom)} />From {formatDate(`${fitFrom}T12:00:00Z`, {timeZone: 'UTC'})} on (the most that fits comfortably)</label>
          <label className="checkbox"><input type="radio" name="switch-window" checked={from === null} disabled={!fullSize.fits} onChange={() => setFrom(null)} />Everything{fullSize.fits ? '' : ' (does not fit)'}</label>
        </fieldset>}
      </>}
    </div>
    <label className="checkbox switch-agree"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} /><span>I understand this adds health records (sleep, heart rate, activity, weight, meditation) to my Health journal on this device. With an account and Health sync on, they sync like the rest of Health.</span></label>
    {error && <p role="alert">{error}</p>}
    <div className="actions import-actions">
      <button type="button" className="primary" disabled={!agreed || busy || adding === 0 || !size.fits} onClick={() => { setBusy(true); setError(''); onConfirm(items, plan).catch(cause => { setError(cause instanceof Error && cause.message ? cause.message : 'The import did not go through. Nothing was changed.'); setBusy(false); }); }}>{busy ? 'Importing…' : adding ? `Import ${n(adding)} ${adding === 1 ? 'record' : 'records'}` : 'Nothing new to import'}</button>
      <button type="button" className="quiet" disabled={busy} onClick={onCancel}>Start over</button>
    </div>
  </div>;
}

export function HabitsPreview({plan, data, onConfirm, onCancel}: {plan: HabitsPlan; data: HabitData; onConfirm: (plan: HabitsPlan) => Promise<void>; onCancel: () => void}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const preview = useMemo(() => { try { return previewHabits(data, plan.habits); } catch (cause) { return cause instanceof Error ? cause.message : 'This export cannot be imported.'; } }, [data, plan]);
  if (typeof preview === 'string') return <div className="switch-preview"><p role="alert">{preview}</p><div className="actions"><button type="button" className="secondary" onClick={onCancel}>Start over</button></div></div>;
  const checkIns = plan.habits.filter(h => preview.created.includes(h.id)).reduce((t, h) => t + h.entries.length, 0) + preview.entries.length;
  return <div className="switch-preview">
    <h3>Check what comes in</h3>
    <p className="import-summary">{plan.label}: {n(preview.created.length)} new {preview.created.length === 1 ? 'habit' : 'habits'}, {n(checkIns)} {checkIns === 1 ? 'check-in' : 'check-ins'}{preview.duplicates ? ` · ${n(preview.duplicates)} days already here` : ''}</p>
    <div className="import-preview"><table>
      <caption className="sr-only">The habits in this export</caption>
      <thead><tr><th scope="col">Habit</th><th scope="col">Schedule</th><th scope="col">Check-ins</th><th scope="col">Status</th></tr></thead>
      <tbody>{plan.habits.map(h => { const rule = h.rules[0]!; return <tr key={h.id}><th scope="row">{h.title}</th><td>{scheduleLabel(rule.schedule)}{rule.measurement.kind === 'quantity' ? ` · ${rule.type === 'limit' ? 'at most' : 'at least'} ${formatNumber(rule.target)} ${rule.measurement.unit}` : ''}</td><td className="num">{n(h.entries.length)}</td><td>{preview.created.includes(h.id) ? (rule.state === 'archived' ? 'New · archived' : 'New') : 'Already here'}</td></tr>; })}</tbody>
    </table></div>
    {plan.summarised.map(s => <p key={s} className="fine">{s}</p>)}
    {plan.warnings.length > 0 && <details className="import-warnings"><summary>{n(plan.warnings.length)} {plan.warnings.length === 1 ? 'note' : 'notes'} about this export</summary><ul>{plan.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    {error && <p role="alert">{error}</p>}
    <div className="actions import-actions">
      <button type="button" className="primary" disabled={busy || (preview.created.length === 0 && preview.entries.length === 0)} onClick={() => { setBusy(true); setError(''); onConfirm(plan).catch(cause => { setError(cause instanceof Error && cause.message ? cause.message : 'The import did not go through. Nothing was changed.'); setBusy(false); }); }}>{busy ? 'Importing…' : preview.created.length || preview.entries.length ? `Import ${n(preview.created.length)} ${preview.created.length === 1 ? 'habit' : 'habits'}${preview.entries.length ? ` and ${n(preview.entries.length)} new days` : ''}` : 'Nothing new to import'}</button>
      <button type="button" className="quiet" disabled={busy} onClick={onCancel}>Start over</button>
    </div>
  </div>;
}

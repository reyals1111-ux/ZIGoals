'use client';
import {useMemo, useRef, useState} from 'react';
import {useHealth} from '../health/use-health';
import {useHabits} from '../habits/use-habits';
import {useDeviceRecord} from '../ai/use-device-record';
import {useJournalZone} from '../use-journal-zone';
import {useDeviceZone} from '../use-device-zone';
import {dailyData} from '../../lib/health-daily';
import {isShowcase} from '../../lib/showcase-storage';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {wallClock, formatMinutes} from '../../lib/zone-time';
import {asleep} from '../../lib/sleep/engine';
import {scheduleLabel, type HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import {IMPORT_BATCHES, MAX_IMPORT_BATCHES, type ImportBatch, type ImportFormat} from '../../lib/import/batches-schema';
import {batchFor, GROUP_LIMIT_WORDS, GROUP_LIMITS, previewImport, sinceDay, sizeCheck, undoImport, undoPlan, windowThatFits, type ImportItems, type ImportPlan, type Preview} from '../../lib/import/switch/apply';
import {previewHabits, undoHabits, undoHabitsPlan, type HabitsPlan} from '../../lib/import/switch/loop';
import {FORMATS, formatInfo} from '../../lib/import/switch/formats';
import {STOPPED} from '../../lib/import/switch/common';
import type {ReadOutcome} from '../../lib/import/switch/read';
import './import.css';

/**
 * Settings → Data → "Switch to ZIGoals" (Session W Part 7): bring history from another app. The export is read on this
 * device, in a Web Worker, into a plan; the preview says exactly what would be added, what is already here, what stays
 * out and how full Health would be; nothing is written until the person confirms (Health records only with the Health
 * box ticked). Each import is remembered on this device (`zigoals:import-batches:v1`) so "Undo this import" removes what
 * it added and nothing else. Showcase never imports: it holds fictional records only.
 */
const GROUPS: [keyof ImportItems, string][] = [['sleep', 'Nights and naps'], ['meditation', 'Meditation sessions'], ['activity', 'Steps and workouts'], ['weights', 'Weights'], ['vitals', 'Days of heart rate and energy']];
const COUNT_LABELS: Record<string, [string, string]> = {sleep: ['night or nap', 'nights and naps'], meditation: ['meditation session', 'meditation sessions'], activity: ['activity line', 'activity lines'], weights: ['weight', 'weights'], vitals: ['day of vitals', 'days of vitals'], habits: ['habit', 'habits'], entries: ['new day', 'new days']};
const n = (value: number) => formatNumber(value);
export function bytesText(bytes: number): string {
  if (bytes >= 1e9) return `${formatNumber(bytes / 1e9, {maximumFractionDigits: 1})} GB`;
  if (bytes >= 1e6) return `${formatNumber(bytes / 1e6, {maximumFractionDigits: 1})} MB`;
  return `${formatNumber(Math.max(1, Math.round(bytes / 1e3)))} KB`;
}
type Stage =
  | {step: 'choose'}
  | {step: 'reading'; format: ImportFormat | null; done: number; total: number}
  | {step: 'refused'; message: string; meals: boolean}
  | {step: 'health'; plan: ImportPlan}
  | {step: 'habits'; plan: HabitsPlan}
  | {step: 'done'; message: string; notes: string[]};

export function SwitchImport() {
  const health = useHealth(), habits = useHabits(), batches = useDeviceRecord(IMPORT_BATCHES);
  const journal = useJournalZone().zone, device = useDeviceZone();
  const zone = dailyData(health.data).preferences.timezone ?? journal ?? device ?? 'UTC';
  const [stage, setStage] = useState<Stage>({step: 'choose'}), [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  async function read(list: FileList | null) {
    setError('');
    const files = list ? [...list] : [];
    if (!files.length) return;
    if (isShowcase()) { setStage({step: 'refused', message: 'Showcase holds fictional records only, so imports are off here. Leave Showcase to bring in your own export.', meals: false}); return; }
    const controller = new AbortController(); abort.current = controller;
    setStage({step: 'reading', format: null, done: 0, total: files.reduce((t, f) => t + f.size, 0)});
    try {
      const {readExport} = await import('../../lib/import/switch/run');
      const outcome: ReadOutcome = await readExport(files, {zone, now: Date.now()}, {signal: controller.signal,
        onDetected: (format, total) => setStage(s => s.step === 'reading' ? {...s, format, total: total || s.total} : s),
        onProgress: done => setStage(s => s.step === 'reading' ? {...s, done} : s)});
      if (outcome.kind === 'refused') setStage({step: 'refused', message: outcome.message, meals: !!outcome.meals});
      else if (outcome.kind === 'health') setStage({step: 'health', plan: outcome.plan});
      else setStage({step: 'habits', plan: outcome.plan});
    } catch (cause) {
      const message = cause instanceof Error && cause.message ? cause.message : 'The export could not be read. Nothing was changed.';
      if (message === STOPPED) setStage({step: 'choose'}); else { setStage({step: 'choose'}); setError(`${message} Nothing was changed.`); }
    } finally { abort.current = null; }
  }
  function remember(batch: ImportBatch): string {
    try { batches.update(current => ({...current, batches: [...current.batches, batch].slice(-MAX_IMPORT_BATCHES)})); return ''; }
    catch { return 'The import went through, but its undo note could not be saved on this device, so it cannot be undone from here.'; }
  }
  return <section className="panel switch-import" id="switch-import" aria-labelledby="switch-import-title">
    <p className="eyebrow">SWITCH TO ZIGOALS</p>
    <h2 id="switch-import-title">Bring your history with you.</h2>
    <p>Import an export from another app: sleep, steps, workouts, heart rate, weight and meditation from your health apps, or your habits from Loop. It is read on this device; nothing is uploaded.</p>
    {stage.step === 'choose' && <ChooseStep onFiles={read} disabled={!health.loaded || !habits.loaded} />}
    {stage.step === 'reading' && <div className="switch-reading" role="status" aria-live="polite">
      <p>{stage.format ? `Reading your ${formatInfo(stage.format).label} export…` : 'Looking at your export…'}</p>
      {stage.total > 0 && <progress max={stage.total} value={Math.min(stage.done, stage.total)} aria-label="Reading the export" />}
      <p className="fine">{bytesText(stage.done)}{stage.total ? ` of ${bytesText(stage.total)}` : ''} read. A large Apple Health export can take a few minutes; you can keep using ZIGoals in another tab.</p>
      <div className="actions"><button type="button" className="secondary" onClick={() => abort.current?.abort()}>Stop</button></div>
    </div>}
    {stage.step === 'refused' && <div className="switch-refused">
      <p role="alert">{stage.message}</p>
      {stage.meals && <p><a className="text-link" href="/app/health?import=meals">Open Health → Import meals</a></p>}
      <div className="actions"><button type="button" className="secondary" onClick={() => setStage({step: 'choose'})}>Choose another export</button></div>
    </div>}
    {stage.step === 'health' && <HealthPreview plan={stage.plan} health={health.data} limit={health.importLimit} zone={zone} onCancel={() => setStage({step: 'choose'})}
      onConfirm={async (items, plan) => {
        const id = crypto.randomUUID();
        let added: ReturnType<typeof previewImport>['addedIds'] | null = null, preview: Preview | null = null;
        await health.update(latest => { const result = previewImport(latest, items); added = result.addedIds; preview = result.preview; if (!sizeCheck(result.next, health.importLimit).fits) throw Error('This import no longer fits in your Health storage. Nothing was imported.'); return result.next; });
        const batch = batchFor(plan, added!, {id, at: new Date()}), note = remember(batch);
        setStage({step: 'done', message: `Imported from ${plan.label}: ${countsText(batch.counts) || 'nothing new'}.`, notes: [...(note ? [note] : []), ...keptNotes(preview!)]});
      }} />}
    {stage.step === 'habits' && <HabitsPreview plan={stage.plan} data={habits.data} onCancel={() => setStage({step: 'choose'})}
      onConfirm={async plan => {
        let created: string[] = [], entries: [string, string][] = [];
        await habits.update(latest => { const result = previewHabits(latest, plan.habits); created = result.created; entries = result.entries; return result.next; });
        const batch: ImportBatch = {id: crypto.randomUUID(), format: 'loop', label: plan.label, at: new Date().toISOString(), counts: {...(created.length ? {habits: created.length} : {}), ...(entries.length ? {entries: entries.length} : {})}, refs: {habits: {habitIds: created, entries}}};
        const note = remember(batch), checkIns = plan.habits.filter(h => created.includes(h.id)).reduce((t, h) => t + h.entries.length, 0) + entries.length;
        setStage({step: 'done', message: `Imported from ${plan.label}: ${n(created.length)} ${created.length === 1 ? 'habit' : 'habits'} with ${n(checkIns)} ${checkIns === 1 ? 'check-in' : 'check-ins'}.`, notes: note ? [note] : []});
      }} />}
    {stage.step === 'done' && <div className="switch-done">
      <p role="status">{stage.message}</p>
      {stage.notes.map(note => <p key={note} className="notice">{note}</p>)}
      <div className="actions"><button type="button" className="secondary" onClick={() => setStage({step: 'choose'})}>Import another export</button></div>
    </div>}
    {error && <p role="alert">{error}</p>}
    {health.error && <p className="notice">{health.error}</p>}
    <RecentImports batches={batches.data.batches} unreadable={batches.unreadable} health={health} habits={habits} onChange={change => batches.update(change)} />
    <details className="switch-formats"><summary>Which apps, and how to export from each</summary>
      <ul>{FORMATS.map(f => <li key={f.id}><strong>{f.label}</strong>{f.state === 'off' ? <span className="switch-off"> · not read yet</span> : f.state === 'meals' ? <span> · in Health → Import meals</span> : null}
        <p>{f.steps}</p><p className="fine">{f.state === 'off' ? f.offReason : `Reads: ${f.reads}`} {f.basis}</p></li>)}</ul>
      <p className="fine">ZIGoals reads only what each app documents about its export (sources in docs/product/IMPORT_FORMATS.md). Fitbit&apos;s older JSON files, Garmin and Streaks are not read.</p>
    </details>
  </section>;
}

function ChooseStep({onFiles, disabled}: {onFiles: (files: FileList | null) => void; disabled: boolean}) {
  const folder = {webkitdirectory: '', directory: ''} as Record<string, string>;
  return <div className="switch-choose">
    <label className="field import-file"><span>Choose the export (a ZIP, an XML or CSV file; several ZIPs from Google Takeout together)</span>
      <input type="file" multiple disabled={disabled} accept=".zip,.xml,.csv,application/zip,application/xml,text/xml,text/csv" onChange={event => { const files = event.target.files; onFiles(files); event.target.value = ''; }} /></label>
    <label className="field import-file"><span>Or choose a folder (Samsung Health saves one)</span>
      <input type="file" disabled={disabled} {...folder} onChange={event => { const files = event.target.files; onFiles(files); event.target.value = ''; }} /></label>
  </div>;
}

function countsText(counts: Record<string, number>): string {
  return Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => `${n(v)} ${COUNT_LABELS[k]?.[v === 1 ? 0 : 1] ?? k}`).join(', ');
}
function keptNotes(preview: Preview): string[] {
  const kept = GROUPS.reduce((t, [g]) => t + preview[g].kept, 0), full = GROUPS.reduce((t, [g]) => t + preview[g].full, 0);
  return [...(kept ? [`${n(kept)} ${kept === 1 ? 'record' : 'records'} stayed out because the journal already had that night or that day’s steps or weight (one source per day).`] : []), ...(full ? [`${n(full)} older ${full === 1 ? 'record' : 'records'} stayed out because the journal was full.`] : [])];
}

function HealthPreview({plan, health, limit, zone, onConfirm, onCancel}: {plan: ImportPlan; health: HealthData; limit: number; zone: string; onConfirm: (items: ImportItems, plan: ImportPlan) => Promise<void>; onCancel: () => void}) {
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

function HabitsPreview({plan, data, onConfirm, onCancel}: {plan: HabitsPlan; data: HabitData; onConfirm: (plan: HabitsPlan) => Promise<void>; onCancel: () => void}) {
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

type Store<T> = {data: T; loaded: boolean; update: (fn: (latest: T) => T) => Promise<unknown>};
function RecentImports({batches, unreadable, health, habits, onChange}: {batches: readonly ImportBatch[]; unreadable: boolean; health: Store<HealthData>; habits: Store<HabitData>; onChange: (change: (current: {version: 1; batches: ImportBatch[]}) => {version: 1; batches: ImportBatch[]}) => unknown}) {
  const [asking, setAsking] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState('');
  const live = batches.filter(b => !b.undoneAt).slice(-10).reverse();
  if (unreadable) return <p className="fine">Your earlier imports on this device could not be read, so they cannot be undone from here. Their records stay in Health and Habits.</p>;
  if (!live.length && !status) return null;
  const planFor = (b: ImportBatch) => b.format === 'loop' ? undoHabitsPlan(habits.data, b) : undoPlan(health.data, b);
  async function undo(b: ImportBatch) {
    setBusy(true); setError('');
    try {
      if (b.format === 'loop') await habits.update(latest => undoHabits(latest, b)); else await health.update(latest => undoImport(latest, b));
      onChange(current => ({...current, batches: current.batches.map(x => x.id === b.id ? {...x, undoneAt: new Date().toISOString()} : x)}));
      setStatus(`The ${b.label} import from ${formatDate(b.at)} was undone.`); setAsking(null);
    } catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : 'The import was not undone. Nothing was changed.'); }
    finally { setBusy(false); }
  }
  return <section className="import-recent switch-recent" aria-label="Your imports">
    <h4>Your imports on this device</h4>
    {status && <p role="status">{status}</p>}
    <ul>{live.map(b => {
      const p = asking === b.id ? planFor(b) : null;
      return <li key={b.id}><span>{b.label} · {formatDate(b.at)} · {countsText(b.counts) || 'nothing new'}</span>
        {asking !== b.id ? <button type="button" className="quiet" disabled={busy || !health.loaded || !habits.loaded} onClick={() => { setAsking(b.id); setStatus(''); }}>Undo this import</button>
          : <div className="switch-undo">
            <p>{p!.remove ? `This removes the ${n(p!.remove)} ${p!.remove === 1 ? 'record' : 'records'} it added that are still here.` : 'Nothing it added is still here.'}</p>
            {p!.edited.length > 0 && <p className="notice">Changed since the import, and removed too: {p!.edited.slice(0, 5).join(', ')}{p!.edited.length > 5 ? ` and ${n(p!.edited.length - 5)} more` : ''}.</p>}
            <div className="actions"><button type="button" className="secondary" disabled={busy} onClick={() => void undo(b)}>{busy ? 'Undoing…' : 'Undo the import'}</button><button type="button" className="quiet" disabled={busy} onClick={() => setAsking(null)}>Keep it</button></div>
          </div>}
      </li>;
    })}</ul>
    {error && <p role="alert">{error}</p>}
  </section>;
}

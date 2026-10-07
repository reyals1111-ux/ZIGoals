'use client';
import {useEffect, useRef, useState} from 'react';
import {useHealth} from '../health/use-health';
import {useHabits} from '../habits/use-habits';
import {useDeviceRecord} from '../ai/use-device-record';
import {useJournalZone} from '../use-journal-zone';
import {useDeviceZone} from '../use-device-zone';
import {dailyData} from '../../lib/health-daily';
import {isShowcase} from '../../lib/showcase-storage';
import {formatDate} from '../../lib/visual-format';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import {IMPORT_BATCHES, MAX_IMPORT_BATCHES, type ImportBatch, type ImportFormat} from '../../lib/import/batches-schema';
import type {ImportPlan, Preview} from '../../lib/import/switch/apply';
import type {HabitsPlan} from '../../lib/import/switch/loop';
import {FORMATS, formatInfo} from '../../lib/import/switch/formats';
import type {ReadOutcome} from '../../lib/import/switch/read';
import {n, bytesText, countsText, keptNotes} from './switch-import-text';
import './import.css';

/**
 * Settings → Data → "Switch to ZIGoals" (Session W Part 7): bring history from another app. The export is read on this
 * device, in a Web Worker, into a plan; the preview says exactly what would be added, what is already here, what stays
 * out and how full Health would be; nothing is written until the person confirms (Health records only with the Health
 * box ticked). Each import is remembered on this device (`zigoals:import-batches:v1`) so "Undo this import" removes what
 * it added and nothing else. Showcase never imports: it holds fictional records only.
 */
type Stage =
  | {step: 'choose'}
  | {step: 'reading'; format: ImportFormat | null; done: number; total: number}
  | {step: 'refused'; message: string; meals: boolean}
  | {step: 'health'; plan: ImportPlan}
  | {step: 'habits'; plan: HabitsPlan}
  | {step: 'done'; message: string; notes: string[]};

// The preview, apply and undo code (and the export parsers behind it) loads with the reader or with "Undo this import",
// not with Settings (Session X Part 5); a module loads once, so later imports reuse it.
type Review = typeof import('./switch-import-review');
const loadReview = () => import('./switch-import-review');

export function SwitchImport() {
  const health = useHealth(), habits = useHabits(), batches = useDeviceRecord(IMPORT_BATCHES);
  const journal = useJournalZone().zone, device = useDeviceZone();
  const zone = dailyData(health.data).preferences.timezone ?? journal ?? device ?? 'UTC';
  const [stage, setStage] = useState<Stage>({step: 'choose'}), [error, setError] = useState(''), [review, setReview] = useState<Review | null>(null);
  const abort = useRef<AbortController | null>(null);
  async function read(list: FileList | null) {
    setError('');
    const files = list ? [...list] : [];
    if (!files.length) return;
    if (isShowcase()) { setStage({step: 'refused', message: 'Showcase holds fictional records only, so imports are off here. Leave Showcase to bring in your own export.', meals: false}); return; }
    const controller = new AbortController(); abort.current = controller;
    setStage({step: 'reading', format: null, done: 0, total: files.reduce((t, f) => t + f.size, 0)});
    let stopped: string | undefined;
    try {
      const [{readExport, STOPPED}, loaded] = await Promise.all([import('../../lib/import/switch/run'), loadReview()]);
      stopped = STOPPED; setReview(loaded);
      const outcome: ReadOutcome = await readExport(files, {zone, now: Date.now()}, {signal: controller.signal,
        onDetected: (format, total) => setStage(s => s.step === 'reading' ? {...s, format, total: total || s.total} : s),
        onProgress: done => setStage(s => s.step === 'reading' ? {...s, done} : s)});
      if (outcome.kind === 'refused') setStage({step: 'refused', message: outcome.message, meals: !!outcome.meals});
      else if (outcome.kind === 'health') setStage({step: 'health', plan: outcome.plan});
      else setStage({step: 'habits', plan: outcome.plan});
    } catch (cause) {
      const message = cause instanceof Error && cause.message ? cause.message : 'The export could not be read. Nothing was changed.';
      if (message === stopped) setStage({step: 'choose'}); else { setStage({step: 'choose'}); setError(`${message} Nothing was changed.`); }
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
    {stage.step === 'health' && review && <review.HealthPreview plan={stage.plan} health={health.data} limit={health.importLimit} zone={zone} onCancel={() => setStage({step: 'choose'})}
      onConfirm={async (items, plan) => {
        const {previewImport, sizeCheck, batchFor} = review, id = crypto.randomUUID();
        let added: ReturnType<typeof previewImport>['addedIds'] | null = null, preview: Preview | null = null;
        await health.update(latest => { const result = previewImport(latest, items); added = result.addedIds; preview = result.preview; if (!sizeCheck(result.next, health.importLimit).fits) throw Error('This import no longer fits in your Health storage. Nothing was imported.'); return result.next; });
        const batch = batchFor(plan, added!, {id, at: new Date()}), note = remember(batch);
        setStage({step: 'done', message: `Imported from ${plan.label}: ${countsText(batch.counts) || 'nothing new'}.`, notes: [...(note ? [note] : []), ...keptNotes(preview!)]});
      }} />}
    {stage.step === 'habits' && review && <review.HabitsPreview plan={stage.plan} data={habits.data} onCancel={() => setStage({step: 'choose'})}
      onConfirm={async plan => {
        const {previewHabits} = review;
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


type Store<T> = {data: T; loaded: boolean; update: (fn: (latest: T) => T) => Promise<unknown>};
function RecentImports({batches, unreadable, health, habits, onChange}: {batches: readonly ImportBatch[]; unreadable: boolean; health: Store<HealthData>; habits: Store<HabitData>; onChange: (change: (current: {version: 1; batches: ImportBatch[]}) => {version: 1; batches: ImportBatch[]}) => unknown}) {
  const [asking, setAsking] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState(''), [kit, setKit] = useState<Review | null>(null);
  const live = batches.filter(b => !b.undoneAt).slice(-10).reverse(), hasLive = live.length > 0;
  // With imports to undo, their undo code is fetched ahead, so "Undo this import" answers at once.
  useEffect(() => { if (hasLive) loadReview().catch(() => {}); }, [hasLive]);
  if (unreadable) return <p className="fine">Your earlier imports on this device could not be read, so they cannot be undone from here. Their records stay in Health and Habits.</p>;
  if (!live.length && !status) return null;
  const planFor = (k: Review, b: ImportBatch) => b.format === 'loop' ? k.undoHabitsPlan(habits.data, b) : k.undoPlan(health.data, b);
  async function undo(b: ImportBatch) {
    setBusy(true); setError('');
    try {
      const {undoHabits, undoImport} = kit ?? await loadReview();
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
      const p = asking === b.id && kit ? planFor(kit, b) : null;
      return <li key={b.id}><span>{b.label} · {formatDate(b.at)} · {countsText(b.counts) || 'nothing new'}</span>
        {asking !== b.id ? <button type="button" className="quiet" disabled={busy || !health.loaded || !habits.loaded} onClick={() => { setStatus(''); loadReview().then(k => { setKit(k); setAsking(b.id); }, () => setError('The undo could not be prepared. Nothing was changed.')); }}>Undo this import</button>
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

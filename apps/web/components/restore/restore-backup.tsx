'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import type {PartSummary, PlannedPart, RestoreGroup, RestoreMode} from '../../lib/restore/plan';
import type {OpenedBackup} from '../../lib/restore/read-backup';
import type {RestoreOutcome} from '../../lib/restore/apply';
import {useVaultControls} from '../vault-sync-controls';
import {formatDate} from '../../lib/visual-format';
import './restore-backup.css';

/**
 * Session AB-Cloud Part 5 ([TIER 3] (data formats), ADR-023 C22): Settings → Your data → "Restore from a backup". The
 * person picks an Export everything ZIP, sees each part it holds beside what this device holds now, chooses per part to
 * leave it, merge (add only what is missing) or replace it, confirms, and can undo the whole restore. Nothing changes
 * before the confirmation; the restore code loads only when a file is picked.
 *
 * Session AD item 11 (ADR-026): a restore can be stopped between two parts; parts saved by an earlier ZIGoals say so,
 * and Replace is not offered over a newer copy on this device; photos too large to restore are counted; Undo also
 * works after a reload (lib/restore/apply.ts) until the person changes those records or chooses "Keep the restore".
 */
type Row = PlannedPart & {current: PartSummary | null; currentUnreadable: boolean; replaceBlocked: string | null};
type Preview = {opened: OpenedBackup; rows: Row[]; groups: RestoreGroup[]; visionCount: number; progressCount: number};
/** `note`: for a restore made before this page loaded (another visit or a reload), when it ran and until when it can be undone. */
type UndoInfo = {afterReload: boolean; note: string | null};
const MODE_LABEL: Record<RestoreMode, string> = {leave: 'Leave as it is', merge: 'Merge: add what is missing', replace: 'Replace with the backup'};
const summaryText = (s: PartSummary | null) => !s ? 'Nothing here yet' : `${s.counts}${s.from ? ` · ${s.from === s.through ? formatDate(s.from) : `${formatDate(s.from)} to ${formatDate(s.through!)}`}` : ''}`;
/** Photos in the file above the restore's size limit (Session AD item 11). */
export const oversizedPhotosNote = (n: number) => `${n} ${n === 1 ? 'photo in this file is' : 'photos in this file are'} larger than ZIGoals restores, so ${n === 1 ? 'it is' : 'they are'} left out.`;
const lib = () => Promise.all([import('../../lib/restore/read-backup'), import('../../lib/restore/plan'), import('../../lib/restore/apply')]);

export function RestoreBackup({showcase}: {showcase: boolean}) {
  const id = useId(), vault = useVaultControls();
  const [preview, setPreview] = useState<Preview | null>(null), [modes, setModes] = useState<Record<string, RestoreMode>>({});
  const [photos, setPhotos] = useState({vision: false, progress: false}), [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [outcome, setOutcome] = useState<RestoreOutcome | null>(null), [undone, setUndone] = useState('');
  const [undo, setUndo] = useState<UndoInfo | null>(null), [fileKey, setFileKey] = useState(0), [notes, setNotes] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false), stop = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    const check = () => void import('../../lib/restore/apply').then(async m => { const s = await m.restoreUndoStatus(); if (!active) return; const days = s.at ? m.undoDays(s.at) : null; setUndo(s.available ? {afterReload: s.afterReload, note: days ? m.RESTORE_NOTES.stored(formatDate(days.at), formatDate(days.until)) : null} : null); }).catch(() => {});
    // An account change forgets this tab's in-memory Undo; a stored one stays with its own account and shows again there.
    const reset = () => { setPreview(null); setModes({}); setPhotos({vision: false, progress: false}); setConfirm(false); setOutcome(null); setNotes([]); setUndo(null); setError(''); setUndone(''); setFileKey(k => k + 1); void import('../../lib/restore/apply').then(m => { m.forgetRestoreUndo(); check(); }); };
    window.addEventListener(ACCOUNT_CHANGE, reset);
    check();
    return () => { active = false; window.removeEventListener(ACCOUNT_CHANGE, reset); };
  }, []);
  if (showcase) return <p className="notice">You are in the Showcase. Return to your own data to restore a backup.</p>;

  async function run(work: () => Promise<void>) { if (busy) return; setBusy(true); setError(''); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'The backup could not be read. Nothing was changed.'); } finally { setBusy(false); } }
  const open = (file: File | undefined) => run(async () => {
    setPreview(null); setOutcome(null); setNotes([]); setUndone(''); setConfirm(false); setModes({});
    if (!file) return;
    if (isShowcase()) throw Error('You are in the Showcase. Return to your own data to restore a backup.');
    const [{openBackup}, {planParts, replaceRefused, summarizePart, RESTORE_GROUPS, OLDER_THAN_DEVICE_MESSAGE}, {currentValue}] = await lib();
    const opened = await openBackup(file), storage = getAppStorage(), rows: Row[] = [];
    for (const part of planParts(opened.json)) {
      let current: PartSummary | null = null, currentUnreadable = false, replaceBlocked: string | null = null;
      try { const value = await currentValue(storage, part); current = value === undefined ? null : summarizePart(part, value); if (replaceRefused(part, value)) replaceBlocked = OLDER_THAN_DEVICE_MESSAGE; } catch { currentUnreadable = true; }
      rows.push({...part, current, currentUnreadable, replaceBlocked});
    }
    const progressCount = Array.isArray((opened.json.device.progressPhotos as {photos?: unknown[]} | undefined)?.photos) ? opened.photos.length : 0;
    setPreview({opened, rows, groups: RESTORE_GROUPS.filter(g => g !== 'Photos' && rows.some(r => r.group === g)), visionCount: opened.vision.length, progressCount});
    setModes(Object.fromEntries(rows.map(r => [r.id, 'leave' as RestoreMode])));
    setPhotos({vision: false, progress: false});
  });
  const chosen = preview ? preview.rows.filter(r => !r.problem && modes[r.id] && modes[r.id] !== 'leave') : [];
  const anything = chosen.length > 0 || photos.vision || photos.progress;
  const restore = () => run(async () => {
    if (!preview || !confirm || !anything) return;
    const [, , {applyRestore, restoreNotes}] = await lib();
    const controller = new AbortController(); stop.current = controller; setRestoring(true);
    try {
      const result = await applyRestore(preview.opened, chosen.map(r => ({part: r, mode: modes[r.id] as Exclude<RestoreMode, 'leave'>})), photos, {signal: controller.signal});
      setOutcome(result); setNotes(restoreNotes(result, {account: !!vault?.account, healthSync: !!vault?.health}));
      setUndo(result.undoable ? {afterReload: result.undoAfterReload, note: null} : null);
      setPreview(null); setConfirm(false); setFileKey(k => k + 1);
    } finally { stop.current = null; setRestoring(false); }
  });
  const undoNow = () => run(async () => {
    const {undoRestore, RESTORE_NOTES} = await import('../../lib/restore/apply');
    const {failed, kept, missing} = await undoRestore();
    setUndo(null); setOutcome(null); setNotes([]);
    const said = [kept.length ? `Changed since the restore, so left as they are now: ${kept.join(', ')}.` : '', missing.length ? RESTORE_NOTES.missing(missing) : '', failed.length ? `Not undone: ${failed.join(', ')}; their earlier copy is kept as a recovery copy in this browser.` : ''].filter(Boolean);
    setUndone(said.length ? `The restore is undone, except where noted. ${said.join(' ')}` : 'The restore is undone: this device holds exactly what it held before.');
  });
  const keep = () => run(async () => {
    const {dismissRestoreUndo} = await import('../../lib/restore/apply');
    dismissRestoreUndo(); setUndo(null); setOutcome(null); setNotes([]); setUndone('The restore is kept. Undo is no longer offered for it.'); // one status line, as after Undo
  });
  const mergeAll = () => preview && setModes(Object.fromEntries(preview.rows.map(r => [r.id, r.problem ? 'leave' : 'merge'])));

  return <div className="restore-backup">
    <p className="fine">Choose a ZIP made by &ldquo;Export everything&rdquo;. You see what it holds before anything changes; keys and secrets are never in it and never restored.</p>
    <label className="rb-file">Export everything ZIP<input key={fileKey} type="file" accept=".zip,application/zip" disabled={busy} onChange={e => void open(e.target.files?.[0])} /></label>
    {busy && <p className="fine" aria-live="polite">{restoring ? 'Restoring… You can stop between two parts.' : 'Working…'}</p>}
    {restoring && <div className="dh-actions"><button type="button" className="secondary" onClick={() => stop.current?.abort()}>Stop restoring</button></div>}
    {preview && <div className="rb-preview" role="group" aria-label="What this backup holds">
      <p>Exported {formatDate(preview.opened.json.exportedAt)}{preview.opened.json.app?.version ? ` by ZIGoals ${preview.opened.json.app.version}` : ''}. Choose what to do with each part; anything left as it is stays untouched.</p>
      {preview.opened.demo && <p className="alert" role="alert">This file holds the Showcase&rsquo;s fictional examples. Restoring them puts made-up records among your own.</p>}
      {!preview.rows.length && !preview.visionCount && !preview.progressCount && <p>This export holds nothing this version can restore.</p>}
      {preview.rows.length > 0 && <div className="dh-actions"><button type="button" className="secondary" onClick={mergeAll}>Merge every part</button></div>}
      {preview.groups.map(group => <fieldset key={group} className="rb-group"><legend>{group}</legend>
        <ul className="rb-rows">{preview.rows.filter(r => r.group === group).map(r => <li key={r.id}>
          <span className="rb-what"><strong>{r.label}</strong><small>Backup: {r.problem ? 'not restorable' : summaryText(r.summary)}</small><small>This device: {r.currentUnreadable ? 'does not read (Replace keeps it as a recovery copy)' : summaryText(r.current)}</small>{r.note && <small>{r.note}</small>}{r.replaceBlocked && !r.problem && <small>{r.replaceBlocked}</small>}</span>
          {r.problem ? <span className="rb-problem">{r.problem}</span> : <label className="rb-mode"><span className="sr-only">{r.label}: what to do</span><select value={modes[r.id] ?? 'leave'} onChange={e => { setModes({...modes, [r.id]: e.target.value as RestoreMode}); setConfirm(false); }}>{(['leave', 'merge', 'replace'] as const).filter(m => (m !== 'merge' || !r.currentUnreadable) && (m !== 'replace' || !r.replaceBlocked)).map(m => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select></label>}
        </li>)}</ul>
        {group === 'Health' && <p className="fine">Restoring Health here never turns on Health sync: it stays as you set it on this device.</p>}
      </fieldset>)}
      {(preview.visionCount > 0 || preview.progressCount > 0 || preview.opened.oversized > 0) && <fieldset className="rb-group"><legend>Photos</legend>
        <p className="fine">Photos come back to this device only; they never sync. A photo this device already has is left as it is.</p>
        {preview.visionCount > 0 && <label className="checkbox"><input type="checkbox" checked={photos.vision} onChange={e => { setPhotos({...photos, vision: e.target.checked}); setConfirm(false); }} />Add the missing vision photos ({preview.visionCount} in the file)</label>}
        {preview.progressCount > 0 && <label className="checkbox"><input type="checkbox" checked={photos.progress} onChange={e => { setPhotos({...photos, progress: e.target.checked}); setConfirm(false); }} />Add the missing progress photos ({preview.progressCount} in the file)</label>}
        {preview.opened.oversized > 0 && <p className="fine">{oversizedPhotosNote(preview.opened.oversized)}</p>}
      </fieldset>}
      <p className="fine">Merge adds what the backup has and this device does not; nothing this device holds is changed. Replace puts the backup&rsquo;s copy in place of this device&rsquo;s, which is kept as a recovery copy for the four main records. Never restored: notifications, ZIGi&rsquo;s settings, notes and conversations, an import&rsquo;s undo, a timer or routine in progress, the welcome&rsquo;s setup, display choices, recent searches and Point &amp; tell notes.</p>
      <label className="checkbox"><input id={`${id}-confirm`} type="checkbox" checked={confirm} disabled={!anything} onChange={e => setConfirm(e.target.checked)} />I checked my choices. Restore them on this device; I can undo it afterwards.</label>
      <div className="dh-actions">
        <button type="button" className="primary" disabled={busy || !confirm || !anything} onClick={() => void restore()}>Restore the chosen parts</button>
        <button type="button" className="secondary" disabled={busy} onClick={() => { setPreview(null); setConfirm(false); setFileKey(k => k + 1); }}>Cancel</button>
      </div>
    </div>}
    {outcome && <div className="rb-result">
      <p role="status">{outcome.restored.length ? `Restored: ${outcome.restored.join(', ')}.` : 'No record was restored.'}{outcome.photos.added ? ` Photos added: ${outcome.photos.added}.` : ''}{outcome.photos.skipped ? ` Photos left out (already here, too large or unreadable): ${outcome.photos.skipped}.` : ''}</p>
      {outcome.failed.length > 0 && <ul className="rb-failed" role="alert">{outcome.failed.map(f => <li key={f.label}><strong>{f.label}</strong>: {f.error}</li>)}</ul>}
      {notes.map(note => <p key={note} className="fine">{note}</p>)}
    </div>}
    {undo?.note && !outcome && <p className="fine">{undo.note}</p>}
    {undo && <div className="dh-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void undoNow()}>Undo this restore</button><button type="button" className="quiet" disabled={busy} onClick={() => void keep()}>Keep the restore</button></div>}
    {undone && <p role="status">{undone}</p>}
    {error && <p role="alert" className="alert">{error}</p>}
  </div>;
}

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
import {plainErrorMessage} from '../../lib/plain-error';
import {CHECKLIST_RESTORE_NOTE} from '../../lib/restore/checklist-note';
import type {EraseArea, EraseRow} from '../../lib/restore/erase-area';

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
/** `never` (Session AK, J6-2): lib/restore/plan.ts NEVER_RESTORED, shown as it is instead of a shorter hand-made list. */
type Preview = {opened: OpenedBackup; rows: Row[]; groups: RestoreGroup[]; visionCount: number; progressCount: number; never: string};
/** `note`: for a restore made before this page loaded (another visit or a reload), when it ran and until when it can be undone. */
type UndoInfo = {afterReload: boolean; note: string | null; kind?: 'restore' | 'erase'};
/**
 * Session AL (security delta review B, SB-1): what an erase keeps, and for how long, in plain words. While its Undo lasts
 * this device keeps a copy of what was erased (that is what Undo puts back); the copy goes when the Undo ends.
 */
const ERASE_COPY_NOTE = 'Until then this device keeps a copy of what was erased, only for that Undo. The copy is removed when you choose Undo or “Keep the erase”, when a later restore or erase replaces the Undo, or once the 7 days are over (the next time this page opens).';
const ERASE_KEPT_NOTE = 'You can undo it below for 7 days. Until then this device keeps a copy of what was erased, only for that Undo; it is removed when you choose Undo or “Keep the erase”, or once the 7 days are over.';
const ERASE_TAB_NOTE = 'You can undo it below until you reload or close this tab. No copy of what was erased is kept on this device.';
/** Session AL (GAP-176): the four areas "Erase one area" offers (lib/restore/erase-area.ts ERASE_AREAS). */
const AREAS: readonly EraseArea[] = ['Goals and Wealth', 'Habits', 'Today and Life', 'Health'];
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
  // Session AL (GAP-176, C-BN-28): erase one area, with the restore's Undo.
  const [area, setArea] = useState<EraseArea>('Goals and Wealth'), [eraseRows, setEraseRows] = useState<EraseRow[] | null>(null), [eraseConfirm, setEraseConfirm] = useState(false), [erased, setErased] = useState<{labels: string[]; failed: {label: string; error: string}[]; afterReload: boolean} | null>(null);
  useEffect(() => {
    let active = true;
    const check = () => void import('../../lib/restore/apply').then(async m => { const s = await m.restoreUndoStatus(); if (!active) return; const days = s.at ? m.undoDays(s.at) : null; setUndo(s.available ? {afterReload: s.afterReload, note: days ? m.RESTORE_NOTES.stored(formatDate(days.at), formatDate(days.until)) : null} : null); }).catch(() => {});
    // An account change forgets this tab's in-memory Undo; a stored one stays with its own account and shows again there.
    const reset = () => { setEraseRows(null); setEraseConfirm(false); setErased(null); setPreview(null); setModes({}); setPhotos({vision: false, progress: false}); setConfirm(false); setOutcome(null); setNotes([]); setUndo(null); setError(''); setUndone(''); setFileKey(k => k + 1); void import('../../lib/restore/apply').then(m => { m.forgetRestoreUndo(); check(); }); };
    window.addEventListener(ACCOUNT_CHANGE, reset);
    check();
    return () => { active = false; window.removeEventListener(ACCOUNT_CHANGE, reset); };
  }, []);
  if (showcase) return <p className="notice">You are in the Showcase. Return to your own data to restore a backup.</p>;

  async function run(work: () => Promise<void>) { if (busy) return; setBusy(true); setError(''); try { await work(); } catch (e) { setError(plainErrorMessage(e, 'The backup could not be read. Nothing was changed.')); } finally { setBusy(false); } }
  const open = (file: File | undefined) => run(async () => {
    setPreview(null); setOutcome(null); setNotes([]); setUndone(''); setConfirm(false); setModes({});
    if (!file) return;
    if (isShowcase()) throw Error('You are in the Showcase. Return to your own data to restore a backup.');
    const [{openBackup}, {planParts, replaceRefused, summarizePart, RESTORE_GROUPS, OLDER_THAN_DEVICE_MESSAGE, NEVER_RESTORED}, {currentValue}] = await lib();
    const opened = await openBackup(file), storage = getAppStorage(), rows: Row[] = [];
    for (const part of planParts(opened.json)) {
      let current: PartSummary | null = null, currentUnreadable = false, replaceBlocked: string | null = null;
      try { const value = await currentValue(storage, part); current = value === undefined ? null : summarizePart(part, value); if (replaceRefused(part, value)) replaceBlocked = OLDER_THAN_DEVICE_MESSAGE; } catch { currentUnreadable = true; }
      rows.push({...part, current, currentUnreadable, replaceBlocked});
    }
    const progressCount = Array.isArray((opened.json.device.progressPhotos as {photos?: unknown[]} | undefined)?.photos) ? opened.photos.length : 0;
    setPreview({opened, rows, groups: RESTORE_GROUPS.filter(g => g !== 'Photos' && rows.some(r => r.group === g)), visionCount: opened.vision.length, progressCount, never: NEVER_RESTORED});
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
  const showErase = () => run(async () => {
    setErased(null); setEraseConfirm(false); setUndone('');
    if (isShowcase()) throw Error('You are in the Showcase. Return to your own data to erase one area.');
    const {eraseInventory} = await import('../../lib/restore/erase-area');
    setEraseRows(await eraseInventory(getAppStorage(), area));
  });
  const eraseNow = () => run(async () => {
    if (!eraseRows || !eraseConfirm) return;
    const {eraseArea} = await import('../../lib/restore/erase-area');
    const result = await eraseArea(eraseRows);
    setOutcome(null); setNotes([]); setErased({labels: result.restored, failed: result.failed, afterReload: result.undoAfterReload});
    setUndo(result.undoable ? {afterReload: result.undoAfterReload, note: null, kind: 'erase'} : null);
    setEraseRows(null); setEraseConfirm(false);
  });
  const undoNow = () => run(async () => {
    const {undoRestore, RESTORE_NOTES} = await import('../../lib/restore/apply');
    const {failed, kept, missing} = await undoRestore();
    const what = undo?.kind === 'erase' ? 'erase' : 'restore';
    setUndo(null); setOutcome(null); setNotes([]); setErased(null);
    const said = [kept.length ? `Changed since the ${what}, so left as they are now: ${kept.join(', ')}.` : '', missing.length ? RESTORE_NOTES.missing(missing) : '', failed.length ? `Not undone: ${failed.join(', ')}; their earlier copy is kept as a recovery copy in this browser.` : ''].filter(Boolean);
    setUndone(said.length ? `The ${what} is undone, except where noted. ${said.join(' ')}` : `The ${what} is undone: this device holds exactly what it held before.`);
  });
  const keep = () => run(async () => {
    const {dismissRestoreUndo} = await import('../../lib/restore/apply');
    const what = undo?.kind === 'erase' ? 'erase' : 'restore';
    await dismissRestoreUndo(); setUndo(null); setOutcome(null); setNotes([]); setErased(null); setUndone(`The ${what} is kept. Undo is no longer offered for it.`); // one status line, as after Undo
  });
  const mergeAll = () => preview && setModes(Object.fromEntries(preview.rows.map(r => [r.id, r.problem ? 'leave' : 'merge'])));

  return <div className="restore-backup">
    <p className="fine">Choose a ZIP made by &ldquo;Export everything&rdquo;. You see what it holds before anything changes; keys and secrets are never in it and never restored. {CHECKLIST_RESTORE_NOTE}</p>
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
      <p className="fine">Merge adds what the backup has and this device does not; nothing this device holds is changed. Replace puts the backup&rsquo;s copy in place of this device&rsquo;s, which is kept as a recovery copy for the four main records. {preview.never}</p>
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
    {erased && <div className="rb-result">
      <p role="status">{erased.labels.length ? `Erased on this device: ${erased.labels.join(', ')}. ${erased.afterReload ? ERASE_KEPT_NOTE : ERASE_TAB_NOTE}` : 'Nothing was erased.'}</p>
      {erased.failed.length > 0 && <ul className="rb-failed" role="alert">{erased.failed.map(f => <li key={f.label}><strong>{f.label}</strong>: {f.error}</li>)}</ul>}
    </div>}
    {undo && <div className="dh-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void undoNow()}>{undo.kind === 'erase' ? 'Undo this erase' : 'Undo this restore'}</button><button type="button" className="quiet" disabled={busy} onClick={() => void keep()}>{undo.kind === 'erase' ? 'Keep the erase' : 'Keep the restore'}</button></div>}
    <details className="rb-erase"><summary>Erase one area instead</summary>
      <p className="fine">Clears one area on this device and keeps the rest. You see what goes before anything changes, and you can undo it for 7 days (a later restore or erase replaces that Undo). {ERASE_COPY_NOTE} Today’s layout, photos, keys and anything a restore never writes are not touched; with sync on, your other devices follow.</p>
      <label className="rb-mode">Area<select value={area} disabled={busy} onChange={e => { setArea(e.target.value as EraseArea); setEraseRows(null); setEraseConfirm(false); }}>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select></label>
      <div className="dh-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void showErase()}>Show what would be erased</button></div>
      {eraseRows && (eraseRows.length === 0 ? <p role="status">This device holds nothing in {area} to erase.</p> : <div className="rb-preview" role="group" aria-label={`What erasing ${area} removes`}>
        <ul className="rb-rows">{eraseRows.map(r => <li key={r.part.id}><span className="rb-what"><strong>{r.part.label}</strong><small>This device: {r.unreadable ? 'does not read (Undo can put it back for 7 days, like the rest)' : summaryText(r.held)}</small>{r.problem && <small>{r.problem}</small>}</span></li>)}</ul>
        <label className="checkbox"><input type="checkbox" checked={eraseConfirm} onChange={e => setEraseConfirm(e.target.checked)} />Erase these from this device. I can undo it for 7 days.</label>
        <div className="dh-actions"><button type="button" className="primary" disabled={busy || !eraseConfirm || eraseRows.every(r => r.problem)} onClick={() => void eraseNow()}>Erase {area}</button><button type="button" className="secondary" disabled={busy} onClick={() => { setEraseRows(null); setEraseConfirm(false); }}>Cancel</button></div>
      </div>)}
    </details>
    {undone && <p role="status">{undone}</p>}
    {error && <p role="alert" className="alert">{error}</p>}
  </div>;
}

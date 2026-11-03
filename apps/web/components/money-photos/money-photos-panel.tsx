'use client';
import {Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import type {DeviceRecordState} from '../ai/use-device-record';
import {ConfirmInline} from '../ui/confirm-inline';
import type {MoneyEntry, MoneyLog} from '../../lib/money-log/schema';
import {compressImage, photoScope} from '../../lib/health-aa/photos';
import {shrinkToLimit} from '../../lib/meal-estimates/photos';
import {MAX_MONEY_PHOTOS, deleteMoneyPhoto, deleteMoneyPhotos, getMoneyPhoto, moneyPhotoIds, orphanPhotoIds, putMoneyPhoto} from '../../lib/money-photos/store';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {formatDate} from '../../lib/visual-format';
import {money} from '../wealth/money-tools/format';
import './money-photos.css';

/**
 * Session AK (BUILD list 2 #10): Money tools → Receipt photos. Opt-in, one entry at a time: "Add a photo" keeps a
 * shrunk copy (at most 200 kB, at most 500) in this browser only (IndexedDB `zigoals-money-photos-v1`), never uploaded,
 * never synced, in Export everything as files, gone with Erase everything. Each can be viewed, replaced or deleted; a
 * photo whose entry was removed is named and deleted only when the person says so. "Draft an entry from a receipt" (the
 * person's own AI) is its own chunk, loaded on its button.
 */
const ReceiptDraft = lazy(() => import('./receipt-draft'));
const SHOWN = 40;
export default function MoneyPhotosPanel({log}: {log: DeviceRecordState<MoneyLog>}) {
  const id = useId(), [kept, setKept] = useState<string[] | null>(null), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<'all' | 'orphans' | null>(null), [drafting, setDrafting] = useState(false), [onlyKept, setOnlyKept] = useState(false);
  const refresh = useCallback(() => { void moneyPhotoIds(photoScope()).then(setKept, () => { setKept([]); setNote('This browser cannot keep photos here.'); }); }, []);
  useEffect(() => {
    queueMicrotask(refresh);
    window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => window.removeEventListener(ACCOUNT_CHANGE, refresh);
  }, [refresh]);
  const entries = useMemo(() => [...log.data.entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [log.data.entries]);
  const has = useMemo(() => new Set(kept ?? []), [kept]);
  const orphans = useMemo(() => kept ? orphanPhotoIds(kept, entries.map(e => e.id)) : [], [kept, entries]);
  const shown = (onlyKept ? entries.filter(e => has.has(e.id)) : entries).slice(0, SHOWN);
  async function add(entry: MoneyEntry, file: File) {
    setBusy(true); setNote('Preparing the photo on this device…');
    try {
      const out = await shrinkToLimit(step => compressImage(file, step.edge, step.quality));
      await putMoneyPhoto(photoScope(), {entryId: entry.id, blob: out.blob, type: out.type, bytes: out.blob.size, takenAt: new Date().toISOString()});
      setNote(`Photo kept on this device for ${entry.note || entry.category} (${Math.round(out.blob.size / 1000)} kB).`); refresh();
    } catch (e) { setNote(e instanceof Error ? e.message : 'The photo was not kept.'); } finally { setBusy(false); }
  }
  async function remove(entry: MoneyEntry) { try { await deleteMoneyPhoto(photoScope(), entry.id); setNote('Photo deleted from this device.'); refresh(); } catch { setNote('The photo could not be deleted. Try again.'); } }
  async function removeMany(which: 'all' | 'orphans') {
    setConfirming(null);
    try { const n = await deleteMoneyPhotos(photoScope(), which === 'all' ? undefined : orphans); setNote(n ? `${n} ${n === 1 ? 'photo' : 'photos'} deleted from this device.` : 'No photos were kept.'); refresh(); }
    catch { setNote('The photos could not be deleted. Try again.'); }
  }
  if (!log.loaded) return <p className="fine">Loading…</p>;
  return <section className="money-panel money-photos" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Receipt photos</h4>
    <p className="fine">Optional. A photo you add to an entry is shrunk to at most 200 kB and kept in this browser only (at most {MAX_MONEY_PHOTOS}). It is never uploaded or synced, it is in Export everything as a file, and Erase everything removes it.</p>
    <div className="actions">
      <button type="button" className="secondary" aria-expanded={drafting} onClick={() => setDrafting(v => !v)}>Draft an entry from a receipt</button>
      {(kept?.length ?? 0) > 0 && <button type="button" className="quiet" aria-pressed={onlyKept} onClick={() => setOnlyKept(v => !v)}>Only entries with a photo</button>}
    </div>
    {drafting && <Suspense fallback={<p className="fine" aria-busy="true">Loading…</p>}><ReceiptDraft/></Suspense>}
    {kept === null ? <p className="fine" aria-busy="true">Reading this device&rsquo;s photos…</p>
      : !entries.length ? <p className="fine">No entries yet. Log what you spend above (or import a bank file); then you can keep a receipt photo with any entry here.</p>
      : <>
        <ul className="money-list money-photos-list" aria-label="Your entries, newest first">{shown.map(e => <PhotoRow key={e.id} entry={e} has={has.has(e.id)} busy={busy} onAdd={file => void add(e, file)} onRemove={() => void remove(e)}/>)}</ul>
        {(onlyKept ? entries.filter(e => has.has(e.id)) : entries).length > SHOWN && <p className="fine">The newest {SHOWN} are shown.</p>}
      </>}
    {orphans.length > 0 && (confirming === 'orphans'
      ? <ConfirmInline title={`Delete ${orphans.length} ${orphans.length === 1 ? 'photo' : 'photos'} of removed entries?`} confirmLabel="Delete them" onConfirm={() => void removeMany('orphans')} onCancel={() => setConfirming(null)}><p>Their entries are no longer in your money log. This cannot be undone.</p></ConfirmInline>
      : <p className="fine">{orphans.length} {orphans.length === 1 ? 'photo belongs to an entry' : 'photos belong to entries'} no longer in your money log (kept in case you put the entry back). <button type="button" className="text-link" onClick={() => setConfirming('orphans')}>Delete {orphans.length === 1 ? 'it' : 'them'}…</button></p>)}
    {(kept?.length ?? 0) > 0 && (confirming === 'all'
      ? <ConfirmInline title={`Delete all ${kept!.length} money photos from this device?`} confirmLabel="Delete all money photos" onConfirm={() => void removeMany('all')} onCancel={() => setConfirming(null)}><p>The entries stay. This cannot be undone.</p></ConfirmInline>
      : <div className="actions"><button type="button" className="quiet" onClick={() => setConfirming('all')}>Delete all money photos…</button></div>)}
    {note && <p className="fine money-status" aria-live="polite">{note}</p>}
  </section>;
}

function PhotoRow({entry, has, busy, onAdd, onRemove}: {entry: MoneyEntry; has: boolean; busy: boolean; onAdd: (file: File) => void; onRemove: () => void}) {
  const [url, setUrl] = useState<string | null>(null), input = useRef<HTMLInputElement>(null), name = entry.note || entry.category;
  useEffect(() => {
    let made: string | null = null, live = true;
    if (has) void getMoneyPhoto(photoScope(), entry.id).then(p => { if (live && p) { made = URL.createObjectURL(p.blob); setUrl(made); } }, () => undefined);
    else queueMicrotask(() => { if (live) setUrl(null); });
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [has, entry.id]);
  return <li className="money-photos-row">
    <span className="money-photos-what"><strong>{name}</strong><span className="fine"> · {formatDate(entry.date)} · {entry.kind === 'income' ? '+' : '−'}{money(entry.amount, entry.currency)}</span></span>
    {has && url && <a className="money-photos-thumb" href={url} target="_blank" rel="noreferrer" aria-label={`Open the photo of ${name} on ${formatDate(entry.date)}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo: next/image has nothing to optimise */}
      <img src={url} alt="" width={56} height={56}/>
    </a>}
    <span className="money-row-actions">
      <input ref={input} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={e => { const f = e.target.files?.[0]; if (f) onAdd(f); e.target.value = ''; }}/>
      <button type="button" className="secondary" disabled={busy} aria-label={`${has ? 'Replace the photo of' : 'Add a photo to'} ${name} on ${formatDate(entry.date)}`} onClick={() => input.current?.click()}>{has ? 'Replace photo' : 'Add a photo'}</button>
      {has && <button type="button" className="quiet" aria-label={`Delete the photo of ${name} on ${formatDate(entry.date)}`} onClick={onRemove}>Delete photo</button>}
    </span>
  </li>;
}

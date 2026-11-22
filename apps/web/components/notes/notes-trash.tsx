'use client';
import {useRouter} from 'next/navigation';
import {useRef, useState} from 'react';
import {ConfirmInline} from '../ui/confirm-inline';
import {formatDate} from '../../lib/visual-format';
import {type Notes} from '../../lib/notes/schema';
import {daysLeft, purgeTrash, restoreFromTrash, trashName, trashOf} from '../../lib/notes/trash';
import {noteHref} from '../../lib/notes/links';
import {deleteNotePhoto} from '../../lib/notes/photos';
import {photoScope} from '../../lib/health-aa/photos';
import type {Change} from './note-editor';

/**
 * Session AV lane 2 (r5-notes; LEDGER #360, Logseq's recycled pages): Notes → Notes → Recently deleted (lazy, loaded when
 * its fold opens). Each deleted note with the day it was deleted and the days left; Restore puts it back in one tap;
 * Delete now and Empty now remove them for good (a confirmation first), with their photos. A locked note shows only its
 * name, as in every list.
 */
export default function NotesTrash({record, change}: {record: Notes; change: Change}) {
  const router = useRouter(), list = trashOf(record), [now] = useState(() => Date.now());
  const [confirm, setConfirm] = useState<string | 'all' | null>(null), [said, setSaid] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const focusBox = () => requestAnimationFrame(() => box.current?.querySelector<HTMLElement>('button')?.focus() ?? box.current?.focus());
  const restore = (id: string) => {
    let into = '', words = '';
    if (change(r => { const out = restoreFromTrash(r, id, new Date().toISOString()); into = out.into; words = out.said; return out.record; }, '')) { setSaid(words); if (into) router.push(noteHref(into)); }
  };
  const purge = (ids?: string[]) => {
    setConfirm(null);
    let photos: string[] = [], n = 0;
    const ok = change(r => { const out = purgeTrash(r, ids ? {ids} : {}); photos = out.photos; n = out.gone.length; return out.record; }, ids ? 'Deleted for good.' : 'Recently deleted is empty.');
    if (ok) { for (const p of photos) void deleteNotePhoto(photoScope(), p).catch(() => undefined); setSaid(n === 1 ? '1 note was deleted for good, with its photos and earlier versions.' : `${n} notes were deleted for good, with their photos and earlier versions.`); focusBox(); }
  };
  return <div className="notes-trash" ref={box} tabIndex={-1}>
    {list.length ? <>
      <p className="fine">A deleted note waits here 30 days, with its photos and earlier versions, then leaves this device. It is out of Search, the Graph, NOVA and the exports of your notes while it is here.</p>
      <ul className="note-list note-trash-list">{list.map(n => { const left = daysLeft(n, now), name = trashName(n); return <li key={n.id}>
        <strong>{n.kind === 'daily' && n.day ? formatDate(n.day, {weekday: true}) : name}</strong>{n.kind === 'daily' && <span className="fine"> · daily note</span>}{n.locked && <span className="fine"> · locked</span>}
        <p className="fine">Deleted {formatDate(n.deletedAt.slice(0, 10))} · {left === 0 ? 'leaves today' : `${left} ${left === 1 ? 'day' : 'days'} left`}</p>
        <div className="note-actions">
          <button type="button" className="secondary" aria-label={`Restore “${name}”`} onClick={() => restore(n.id)}>Restore</button>
          <button type="button" className="quiet" aria-label={`Delete “${name}” now`} onClick={() => setConfirm(n.id)}>Delete now…</button>
        </div>
        {confirm === n.id && <ConfirmInline title={`Delete “${name}” for good?`} confirmLabel="Delete for good" onConfirm={() => purge([n.id])} onCancel={() => setConfirm(null)}><p>Its words, photos and earlier versions leave this device. This cannot be undone.</p></ConfirmInline>}
      </li>; })}</ul>
      <div className="note-actions"><button type="button" className="quiet" onClick={() => setConfirm('all')}>Empty now…</button></div>
      {confirm === 'all' && <ConfirmInline title={`Delete ${list.length === 1 ? 'this note' : `all ${list.length} notes`} for good?`} confirmLabel="Empty now" onConfirm={() => purge()} onCancel={() => setConfirm(null)}><p>Their words, photos and earlier versions leave this device. This cannot be undone.</p></ConfirmInline>}
    </> : <p className="fine">Nothing here. A note you delete waits here for 30 days, with its photos, so you can restore it in one tap.</p>}
    {said && <p className="fine" role="status">{said}</p>}
  </div>;
}

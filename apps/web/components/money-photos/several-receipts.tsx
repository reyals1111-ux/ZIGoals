'use client';
import {useId, useState} from 'react';
import type {MoneyEntry} from '../../lib/money-log/schema';
import {fileDay, receiptMatches} from '../../lib/money-photos/match';
import {parseNumberInput} from '../../lib/numbers/parse';
import {formatDate} from '../../lib/visual-format';
import {money} from '../wealth/money-tools/format';

/**
 * Session AV lane 2 (money; Monarch: several receipts at once, each matched to an imported entry by amount and date):
 * Money tools → Receipt photos → "Add several receipts". Each chosen photo gets the entries it can belong to — a week
 * either side of its day (the photo's own date until the person changes it), the same amount first once they type the
 * receipt's amount — and the person picks one (or none). Nothing is kept until "Keep these photos". Lazy.
 */
type Row = {key: string; file: File; day: string; amount: string; entryId: string};
const MAX_FILES = 20;
const cents = (raw: string) => { if (!raw.trim()) return null; const r = parseNumberInput(raw), n = Number(r.ok ? r.text : NaN); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null; };
export default function SeveralReceipts({entries, withPhoto, onKeep, onDone}: {entries: readonly MoneyEntry[]; withPhoto: ReadonlySet<string>; onKeep: (entry: MoneyEntry, file: File) => Promise<void>; onDone: (words: string) => void}) {
  const id = useId(), [rows, setRows] = useState<Row[]>([]), [busy, setBusy] = useState(false), [note, setNote] = useState('');
  const choose = (files: FileList | null) => {
    const list = [...(files ?? [])].filter(f => f.type.startsWith('image/')).slice(0, MAX_FILES);
    setNote(files && files.length > MAX_FILES ? `The first ${MAX_FILES} photos are taken; add the rest after these.` : '');
    setRows(list.map((file, i) => { const day = fileDay(file.lastModified), best = receiptMatches(entries, {date: day}, withPhoto)[0]; return {key: `${i}-${file.name}`, file, day, amount: '', entryId: best && !withPhoto.has(best.entry.id) ? best.entry.id : ''}; }));
  };
  const patch = (key: string, p: Partial<Row>) => setRows(rs => rs.map(r => {
    if (r.key !== key) return r;
    const next = {...r, ...p};
    // A typed amount picks the entry with that amount, when there is one.
    if (p.amount !== undefined || p.day !== undefined) { const same = receiptMatches(entries, {date: next.day, cents: cents(next.amount)}, withPhoto).find(m => m.sameAmount); if (same) next.entryId = same.entry.id; }
    return next;
  }));
  const chosen = rows.filter(r => r.entryId);
  const keep = async () => {
    setBusy(true); let kept = 0;
    for (const r of chosen) { const e = entries.find(x => x.id === r.entryId); if (!e) continue; try { await onKeep(e, r.file); kept++; } catch { /* named below */ } }
    setBusy(false); setRows([]);
    onDone(kept === chosen.length ? `${kept} ${kept === 1 ? 'photo' : 'photos'} kept on this device with ${kept === 1 ? 'its entry' : 'their entries'}.` : `${kept} of ${chosen.length} photos kept; the others could not be kept on this device.`);
  };
  return <div className="money-receipts" role="group" aria-labelledby={`${id}-title`}>
    <h5 id={`${id}-title`}>Add several receipts</h5>
    <p className="fine">Choose up to {MAX_FILES} photos. Each is offered the entries within a week of its day; type the amount on the receipt to find the one with the same amount.</p>
    <label className="field"><span>Receipt photos</span><input type="file" accept="image/*" multiple onChange={e => { choose(e.target.files); e.target.value = ''; }}/></label>
    {note && <p className="fine">{note}</p>}
    {rows.length > 0 && <ul className="money-list money-receipts-list" aria-label="Chosen receipt photos">{rows.map(r => {
      const matches = receiptMatches(entries, {date: r.day, cents: cents(r.amount)}, withPhoto);
      return <li key={r.key} className="money-receipts-row">
        <strong className="money-receipts-name">{r.file.name.slice(0, 60)}</strong>
        <label className="field"><span>Receipt day</span><input type="date" value={r.day} onChange={e => patch(r.key, {day: e.target.value})}/></label>
        <label className="field"><span>Amount on the receipt — optional</span><input inputMode="decimal" autoComplete="off" value={r.amount} placeholder="12.50" onChange={e => patch(r.key, {amount: e.target.value})}/></label>
        <label className="field money-receipts-entry"><span>Keep with</span><select value={r.entryId} onChange={e => patch(r.key, {entryId: e.target.value})}>
          <option value="">{matches.length ? 'Not now' : 'No entry within a week of this day'}</option>
          {matches.map(m => <option key={m.entry.id} value={m.entry.id}>{(m.entry.note ?? m.entry.category).split(' · ')[0]!.slice(0, 40)} · {formatDate(m.entry.date)} · {money(m.entry.amount, m.entry.currency)}{m.sameAmount ? ' · same amount' : ''}{withPhoto.has(m.entry.id) ? ' · has a photo (replaced)' : ''}</option>)}
        </select></label>
      </li>; })}</ul>}
    {rows.length > 0 && <div className="actions"><button type="button" className="primary" disabled={busy || !chosen.length} onClick={() => void keep()}>{busy ? 'Keeping…' : `Keep ${chosen.length} ${chosen.length === 1 ? 'photo' : 'photos'}`}</button><button type="button" className="quiet" onClick={() => setRows([])}>Cancel</button></div>}
  </div>;
}

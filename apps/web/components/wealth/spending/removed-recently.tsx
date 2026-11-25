'use client';
import {useId, useMemo, useRef, useState} from 'react';
import {useDeviceRecord, type DeviceRecordState} from '../../ai/use-device-record';
import {addToDeviceRecord} from '../../../lib/device-record';
import {getAppStorage} from '../../../lib/showcase-storage';
import {ZIGI_STORE_EVENT} from '../../../lib/ai/store/keys';
import {KEEP_DAYS, MONEY_REMOVED, daysLeft, emptyRemoved, goneOn, keepRemoved, putBack, recentlyRemoved, withoutItems, type PutBack, type Space} from '../../../lib/money-log/removed';
import type {MoneyEntry, MoneyLog} from '../../../lib/money-log/schema';
import {categoryPath} from '../../../lib/money-more/quick';
import {formatDate} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';
import {ShowcaseTag} from '../../ui/showcase-tag';
import './aw-x7.css';

/**
 * Session AW, round 7 X7 (money; Cashew's "Recently deleted", LEDGER #461): Wealth → Spending → "Removed recently", its own
 * chunk, loaded when its fold opens (on a phone inside "More about your money"). An entry removed with Remove stays here
 * for 30 days on this device (lib/money-log/removed.ts), in its own space: "Put back" restores it with its split parts,
 * its refund links and its transfer twin; "Empty now" clears the list after one more tap. Removed entries count nowhere
 * and are not in Export everything.
 */
/** Called by Spending's Remove (before the log changes): keeps the entry here. Refuses quietly when the list cannot be read. */
export function keepInRemoved(space: Space, entry: MoneyEntry, log: MoneyLog): void {
  try {
    const kept = addToDeviceRecord(getAppStorage(), MONEY_REMOVED, bin => keepRemoved(bin, space, entry, log, new Date()));
    if (kept) window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: MONEY_REMOVED.key}));
  } catch { /* storage refused: the removal goes on as before, with the toast's Undo */ }
}
const money = (amount: string, currency: string) => moneyCents(Math.round(Number(amount) * 100), currency);
export default function RemovedRecently({space, log, showcase = false, onSaid}: {space: Space; log: DeviceRecordState<MoneyLog>; showcase?: boolean; onSaid: (words: string) => void}) {
  const id = useId(), bin = useDeviceRecord(MONEY_REMOVED), [now] = useState(() => new Date());
  const [confirming, setConfirming] = useState(false), [problem, setProblem] = useState(''), head = useRef<HTMLHeadingElement>(null);
  const items = useMemo(() => recentlyRemoved(bin.data, space, log.data, now), [bin.data, space, log.data, now]);
  if (!bin.loaded) return <p className="fine" aria-busy="true">Opening…</p>;
  const back = (entryId: string) => {
    setProblem('');
    try {
      let made: PutBack | null = null;
      log.update(current => { made = putBack(current, bin.data, space, entryId, new Date()); return made.log; });
      const done = made as PutBack | null;
      if (!done) return;
      bin.update(current => withoutItems(current, space, done.entries.map(e => e.id)));
      const e = done.entries[0]!;
      onSaid(`Put back: ${categoryPath(e)} ${money(e.amount, e.currency)} on ${formatDate(e.date)}${done.entries.length > 1 ? ', with the other side of its transfer' : ''}.`);
      requestAnimationFrame(() => head.current?.focus());
    } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'This could not be put back on this device. Nothing was changed.'); }
  };
  const empty = () => {
    setProblem('');
    try { const n = items.length; bin.update(current => emptyRemoved(current, space)); setConfirming(false); onSaid(`Removed recently is empty: ${n} ${n === 1 ? 'entry' : 'entries'} gone for good.`); requestAnimationFrame(() => head.current?.focus()); }
    catch { setProblem('This could not be emptied on this device. Nothing was changed.'); }
  };
  return <div className="money-removed" role="group" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`} ref={head} tabIndex={-1} className="money-removed-title">Removed in the last {KEEP_DAYS} days{items.length ? ` (${items.length})` : ''}</h4>
    {showcase && <p className="fine"><ShowcaseTag/> Fictional Showcase entries; Put back and Empty now are not kept in the Showcase.</p>}
    {bin.unreadable && <p role="alert">This device’s list of removed entries could not be read; nothing was changed.</p>}
    {items.length ? <ul className="money-removed-list">{items.map(i => <li key={i.entry.id}>
      <span className="money-removed-what"><strong>{categoryPath(i.entry)}</strong>{i.entry.note && <span className="fine"> · {i.entry.note}</span>}<span className="fine"> · <time dateTime={i.entry.date}>{formatDate(i.entry.date, {weekday: true, year: false})}</time></span>
        <span className="fine money-removed-when">Removed {formatDate(i.removedAt.slice(0, 10))} · kept {daysLeft(i, now)} more {daysLeft(i, now) === 1 ? 'day' : 'days'}, until {formatDate(goneOn(i))}{i.entry.parts?.length ? ` · split in ${i.entry.parts.length}` : ''}{i.entry.transfer ? ' · a transfer' : ''}{i.entry.refund ? ' · a refund' : ''}</span></span>
      <span className={`spending-amount${i.entry.kind === 'income' ? ' spending-in' : ''}`} data-private-amount="">{i.entry.kind === 'income' ? '+' : '−'}{money(i.entry.amount, i.entry.currency)}</span>
      <button type="button" className="secondary" disabled={showcase || !log.loaded || log.unreadable} aria-label={`Put back ${i.entry.category} ${i.entry.amount} ${i.entry.currency} on ${i.entry.date}`} onClick={() => back(i.entry.id)}>Put back</button>
    </li>)}</ul> : <p className="fine">Nothing removed in the last {KEEP_DAYS} days. When you remove an entry, it stays here for {KEEP_DAYS} days so you can put it back — with its split, its refund link and the other side of a transfer.</p>}
    {items.length > 0 && !showcase && (confirming
      ? <p className="money-removed-confirm" role="group" aria-label="Empty Removed recently"><span>Remove {items.length === 1 ? 'this entry' : `these ${items.length} entries`} for good? This cannot be undone.</span>
        <button type="button" className="secondary" onClick={empty}>Empty now</button><button type="button" className="quiet" onClick={() => setConfirming(false)}>Keep them</button></p>
      : <p className="money-removed-actions"><button type="button" className="quiet" onClick={() => setConfirming(true)}>Empty now…</button></p>)}
    {problem && <p role="alert">{problem}</p>}
    <p className="fine">Kept on this device only. Removed entries count in no total, budget or search, and are not in Export everything.</p>
  </div>;
}

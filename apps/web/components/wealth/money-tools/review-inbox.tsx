'use client';
import {useId, useMemo, useState} from 'react';
import type {DeviceRecordState} from '../../ai/use-device-record';
import {formatDate} from '../../../lib/visual-format';
import {EXPENSE_CATEGORIES, INCOME_CATEGORIES, type MoneyEntry, type MoneyLog} from '../../../lib/money-log/schema';
import {acceptReview, pruneReview, toReview, type MoneyReview} from '../../../lib/money-review/review';
import {plainErrorMessage} from '../../../lib/plain-error';
import {money} from './format';

/**
 * Session AK (lane M, item 10): "To review", the entries an import added that the person has not looked at yet. ✓
 * accepts one (or all), the category can be changed in place, and "Make a rule" opens the rules with this payee filled
 * in. The entries already count in every total; reviewing never changes an amount. Lazy-loaded by Money tools.
 */
export default function ReviewInbox({log, review, onMakeRule}: {log: DeviceRecordState<MoneyLog>; review: DeviceRecordState<MoneyReview>; onMakeRule: (entry: MoneyEntry) => void}) {
  const id = useId(), [status, setStatus] = useState(''), [error, setError] = useState('');
  const pending = useMemo(() => toReview(review.data, log.data.entries), [review.data, log.data.entries]);
  const accept = (ids: string[], words: string) => {
    setError('');
    try { review.update(r => acceptReview(pruneReview(r, log.data.entries), ids)); setStatus(words); }
    catch (cause) { setError(plainErrorMessage(cause, 'This could not be saved on this device.')); }
  };
  const recategorise = (entry: MoneyEntry, category: string) => {
    setError('');
    try { log.update(current => ({...current, entries: current.entries.map(e => e.id === entry.id ? {...e, category} : e)})); setStatus(`Category changed to ${category}.`); }
    catch (cause) { setError(plainErrorMessage(cause, 'The category could not be changed on this device.')); }
  };
  if (!review.loaded || !log.loaded) return <p className="fine">Loading…</p>;
  if (review.unreadable) return <p role="alert">This device&rsquo;s review list could not be read. Your entries are unchanged.</p>;
  return <section className="money-panel" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>To review ({pending.length})</h4>
    {pending.length ? <>
      <p className="fine">Entries from your last imports, as their category was set. They already count in your totals.</p>
      <ul className="money-list">{pending.slice(0, 100).map(e => <li key={e.id} className="money-review-row">
        <span className="money-review-what"><strong>{e.note || e.category}</strong><span className="fine"> · {formatDate(e.date)}</span></span>
        <span className={`spending-amount${e.kind === 'income' ? ' spending-in' : ''}`}>{e.kind === 'income' ? '+' : '−'}{money(e.amount, e.currency)}</span>
        <label className="field money-review-cat"><span>Category</span>
          <select value={e.category} onChange={ev => recategorise(e, ev.target.value)}>{[...new Set([e.category, ...(e.kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)])].map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <span className="money-row-actions">
          <button type="button" className="secondary" onClick={() => accept([e.id], 'Marked as reviewed.')} aria-label={`Mark ${e.note || e.category} on ${formatDate(e.date)} as reviewed`}>✓ Looks right</button>
          <button type="button" className="quiet" onClick={() => onMakeRule(e)}>Make a rule</button>
        </span>
      </li>)}</ul>
      {pending.length > 100 && <p className="fine">The first 100 are shown.</p>}
      <button type="button" className="secondary" onClick={() => accept(pending.map(e => e.id), `${pending.length} marked as reviewed.`)}>Mark all {pending.length} as reviewed</button>
    </> : <p className="fine">Nothing to review. Entries you import from a bank file or a CSV land here first, so you can check their categories.</p>}
    <p className="money-status" role="status" aria-live="polite">{status}</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}

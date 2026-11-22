'use client';
import {Suspense, lazy, useId, useMemo, useState} from 'react';
import type {DeviceRecordState} from '../../ai/use-device-record';
import {formatDate} from '../../../lib/visual-format';
import type {MoneyEntry, MoneyLog} from '../../../lib/money-log/schema';
// Session AV lane 2 (money; YNAB and Copilot suggest on imports): the category this payee had before, own categories, history.
import {categoryChoices, withChange} from '../../../lib/money-log/counted';
import {pastCategory} from '../../../lib/money-log/suggest';
import {setTransfer, transferPairs} from '../../../lib/bankfiles/reimport';
import {acceptReview, pruneReview, toReview, type MoneyReview} from '../../../lib/money-review/review';
import {plainErrorMessage} from '../../../lib/plain-error';
import {money} from './format';
// Session AK (BUILD list 2 #9): "One at a time", its own chunk, loaded when the person turns it on.
const ReviewCardMode = lazy(() => import('../../review-cards/review-card-mode'));

/**
 * Session AK (lane M, item 10): "To review", the entries an import added that the person has not looked at yet. ✓
 * accepts one (or all), the category can be changed in place, and "Make a rule" opens the rules with this payee filled
 * in. The entries already count in every total; reviewing never changes an amount. Lazy-loaded by Money tools.
 */
export default function ReviewInbox({log, review, onMakeRule}: {log: DeviceRecordState<MoneyLog>; review: DeviceRecordState<MoneyReview>; onMakeRule: (entry: MoneyEntry) => void}) {
  const id = useId(), [status, setStatus] = useState(''), [error, setError] = useState(''), [cards, setCards] = useState(false);
  const pending = useMemo(() => toReview(review.data, log.data.entries), [review.data, log.data.entries]);
  // Only entries already looked at teach a suggestion (an import never suggests from itself).
  const suggestions = useMemo(() => { const waiting = new Set(pending.map(e => e.id)), known = log.data.entries.filter(e => !waiting.has(e.id)); return new Map(pending.slice(0, 100).map(e => [e.id, e.note ? pastCategory(known, e.kind, e.note) : null])); }, [pending, log.data.entries]);
  // Session AV lane 2 (money; YNAB's credit-card payment match): an amount leaving one imported account and arriving in another.
  const pairs = useMemo(() => transferPairs(log.data.entries, new Set(pending.map(e => e.id))), [log.data.entries, pending]);
  const markTransfer = (outId: string, inId: string, words: string) => { setError(''); try { log.update(current => setTransfer(current, outId, inId, true, new Date().toISOString())); setStatus(words); } catch (cause) { setError(plainErrorMessage(cause, 'This could not be saved on this device.')); } };
  const accept = (ids: string[], words: string) => {
    setError('');
    try { review.update(r => acceptReview(pruneReview(r, log.data.entries), ids)); setStatus(words); return true; }
    catch (cause) { setError(plainErrorMessage(cause, 'This could not be saved on this device.')); return false; }
  };
  const recategorise = (entry: MoneyEntry, category: string) => {
    setError('');
    const at = new Date().toISOString();
    try { log.update(current => ({...current, entries: current.entries.map(e => e.id === entry.id && e.category !== category ? withChange({...e, category}, {by: 'you', field: 'category', from: e.category, to: category}, at) : e)})); setStatus(`Category changed to ${category}.`); }
    catch (cause) { setError(plainErrorMessage(cause, 'The category could not be changed on this device.')); }
  };
  if (!review.loaded || !log.loaded) return <p className="fine">Loading…</p>;
  if (review.unreadable) return <p role="alert">This device&rsquo;s review list could not be read. Your entries are unchanged.</p>;
  return <section className="money-panel" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>To review ({pending.length})</h4>
    {(pending.length > 0 || cards) && <p className="money-review-mode"><button type="button" className="secondary" aria-pressed={cards} onClick={() => setCards(v => !v)}>One at a time</button></p>}
    {pairs.length > 0 && !cards && <section className="money-transfers" aria-labelledby={`${id}-pairs`}>
      <h5 id={`${id}-pairs`}>Card payments and moves between your accounts ({pairs.length})</h5>
      <p className="fine">The same amount left one account and arrived in another within a few days. Marked as a transfer, both stay in your log but count as neither spending nor income.</p>
      <ul className="money-list">{pairs.slice(0, 20).map(p => { const words = `${money(p.out.amount, p.out.currency)}: ${p.out.account} → ${p.in.account}`; return <li key={`${p.out.id}-${p.in.id}`} className="money-review-row">
        <span className="money-review-what"><strong>{words}</strong><span className="fine"> · out {formatDate(p.out.date)} ({(p.out.note ?? p.out.category).split(' · ')[0]}), in {formatDate(p.in.date)} ({(p.in.note ?? p.in.category).split(' · ')[0]})</span></span>
        <span className="money-row-actions"><button type="button" className="secondary" aria-label={`Mark ${words} as a transfer`} onClick={() => { markTransfer(p.out.id, p.in.id, `${words} marked as a transfer; both are left out of spending and income.`); accept([p.out.id, p.in.id], `${words} marked as a transfer and reviewed.`); }}>Mark as a transfer</button></span>
      </li>; })}</ul>
    </section>}
    {cards ? <Suspense fallback={<p className="fine" aria-busy="true">Loading…</p>}><ReviewCardMode log={log} review={review} pending={pending} accept={accept} recategorise={recategorise} onMakeRule={onMakeRule} onExit={() => setCards(false)}/></Suspense>
    : pending.length ? <>
      <p className="fine">Entries from your last imports, as their category was set. They already count in your totals.</p>
      <ul className="money-list">{pending.slice(0, 100).map(e => <li key={e.id} className="money-review-row">
        <span className="money-review-what"><strong>{e.note || e.category}</strong><span className="fine"> · {formatDate(e.date)}</span></span>
        <span className={`spending-amount${e.kind === 'income' ? ' spending-in' : ''}`}>{e.kind === 'income' ? '+' : '−'}{money(e.amount, e.currency)}</span>
        <label className="field money-review-cat"><span>Category</span>
          <select value={e.category} onChange={ev => recategorise(e, ev.target.value)}>{[...new Set([e.category, ...categoryChoices(log.data, e.kind)])].map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        {(() => { const s = suggestions.get(e.id); return s && s.category !== e.category ? <p className="fine money-review-suggest">Before, “{s.payee ?? (e.note ?? '').split(' · ')[0]}” was {s.category}{s.times > 1 ? ` (${s.times} times)` : ''}. <button type="button" className="text-link" aria-label={`Use ${s.category} for ${e.note || e.category} on ${formatDate(e.date)}`} onClick={() => recategorise(e, s.category)}>Use {s.category}</button></p> : null; })()}
        <span className="money-row-actions">
          <button type="button" className="secondary" onClick={() => accept([e.id], 'Marked as reviewed.')} aria-label={`Mark ${e.note || e.category} on ${formatDate(e.date)} as reviewed`}>✓ Looks right</button>
          <button type="button" className="quiet" onClick={() => onMakeRule(e)}>Make a rule</button>
        </span>
      </li>)}</ul>
      {pending.length > 100 && <p className="fine">The first 100 are shown.</p>}
      {[...suggestions.values()].some((s, i) => s && s.category !== pending[i]?.category) && <button type="button" className="secondary" onClick={() => { const at = new Date().toISOString(); try { let n = 0; log.update(current => ({...current, entries: current.entries.map(x => { const s = suggestions.get(x.id); if (!s || s.category === x.category) return x; n++; return withChange({...x, category: s.category}, {by: 'you', field: 'category', from: x.category, to: s.category}, at); })})); setStatus(`${n} ${n === 1 ? 'category' : 'categories'} set from your past choices. Check them, then mark them reviewed.`); } catch (cause) { setError(plainErrorMessage(cause, 'This could not be saved on this device.')); } }}>Use every suggestion</button>}
      <button type="button" className="secondary" onClick={() => accept(pending.map(e => e.id), `${pending.length} marked as reviewed.`)}>Mark all {pending.length} as reviewed</button>
    </> : <p className="fine">Nothing to review. Entries you import from a bank file or a CSV land here first, so you can check their categories.</p>}
    <p className="money-status" role="status" aria-live="polite">{status}</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}

'use client';
import {useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent} from 'react';
import type {DeviceRecordState} from '../ai/use-device-record';
import {SWIPE_EDGE_PX, SWIPE_LOCK_PX} from '../swipe/use-swipe-actions';
import {EXPENSE_CATEGORIES, INCOME_CATEGORIES, type MoneyEntry, type MoneyLog} from '../../lib/money-log/schema';
import {markForReview, type MoneyReview} from '../../lib/money-review/review';
import {cardQueue, keyAction, progressWords, swipeAction, type CardAction} from '../../lib/review-cards/queue';
import {categoriesRecentFirst} from '../../lib/recent-categories/recent';
import {localDate} from '../../lib/local-date';
import {formatDate} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';
import {money} from '../wealth/money-tools/format';
import './review-cards.css';

/**
 * Session AK (BUILD list 2 #9): the review inbox "One at a time". One large card: the payee, the amount, the date and
 * the category as big chips (the entry's own first, then the person's most used). Accept (A) marks it reviewed, with
 * Undo (Z); Skip (S) moves on and keeps it in To review; Make a rule (R) opens the rules with the payee filled in.
 * On a touch screen a swipe right accepts and a swipe left skips (the swipe rows' thresholds); buttons and keys always
 * work too. No fling: the next card simply takes the place (Motion Off and reduced motion drop even the drag easing).
 * Nothing new is stored: the skips last for this sitting only. Loaded only when the person turns it on.
 */
type Props = {
  log: DeviceRecordState<MoneyLog>; review: DeviceRecordState<MoneyReview>; pending: readonly MoneyEntry[];
  accept: (ids: string[], words: string) => boolean; recategorise: (entry: MoneyEntry, category: string) => void;
  onMakeRule: (entry: MoneyEntry) => void; onExit: () => void;
};
export default function ReviewCardMode({log, review, pending, accept, recategorise, onMakeRule, onExit}: Props) {
  const id = useId(), card = useRef<HTMLElement>(null), drag = useRef<{id: number; x: number; y: number; locked: 'x' | 'y' | null; width: number} | null>(null);
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(() => new Set()), [reviewed, setReviewed] = useState(0), [last, setLast] = useState<MoneyEntry | null>(null);
  const [offset, setOffset] = useState(0), [note, setNote] = useState('');
  const queue = useMemo(() => cardQueue(pending, skipped), [pending, skipped]), current = queue[0] ?? null, today = localDate();
  const chips = useMemo(() => {
    if (!current) return [];
    const fixed = current.kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const ranked = categoriesRecentFirst(log.data.entries, current.kind, fixed, today).chips.filter(c => c !== current.category);
    return [current.category, ...ranked].slice(0, 6);
  }, [current, log.data.entries, today]);
  useEffect(() => { card.current?.focus({preventScroll: true}); }, [current?.id]);

  const act = (action: CardAction) => {
    if (action === 'undo') {
      if (!last) return;
      try { review.update(r => markForReview(r, [last.id])); setSkipped(s => { const next = new Set(s); next.delete(last.id); return next; }); setReviewed(n => Math.max(0, n - 1)); setNote(`${last.note || last.category} is back to review.`); setLast(null); }
      catch (cause) { setNote(plainErrorMessage(cause, 'This could not be undone on this device.')); }
      return;
    }
    if (!current) return;
    if (action === 'accept') { if (accept([current.id], `${current.note || current.category}: marked as reviewed.`)) { setLast(current); setReviewed(n => n + 1); setNote(''); } }
    else if (action === 'skip') { setSkipped(s => new Set(s).add(current.id)); setNote(`Skipped ${current.note || current.category}. It stays in To review.`); }
    else onMakeRule(current);
  };
  const keys = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).closest('input, select, textarea')) return;
    const action = keyAction(event); if (!action) return;
    event.preventDefault(); act(action);
  };
  const down = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'touch' || e.clientX < SWIPE_EDGE_PX || (e.target as HTMLElement).closest('button, a, input, select')) return;
    drag.current = {id: e.pointerId, x: e.clientX, y: e.clientY, locked: null, width: e.currentTarget.getBoundingClientRect().width};
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.locked) { if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return; d.locked = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y'; if (d.locked === 'x') { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine */ } } }
    if (d.locked === 'x') setOffset(Math.max(-d.width, Math.min(d.width, dx)));
  };
  const up = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return; drag.current = null;
    const action = d.locked === 'x' ? swipeAction(e.clientX - d.x, d.width) : null;
    setOffset(0);
    if (action) act(action);
  };

  return <div className="review-cards" onKeyDown={keys}>
    <p className="fine review-cards-progress" aria-live="polite">{progressWords(queue.length, skipped.size, reviewed)}</p>
    {current ? <article ref={card} tabIndex={-1} className={`review-card${offset > 0 ? ' leaning-accept' : offset < 0 ? ' leaning-skip' : ''}`} style={{'--card-x': `${offset}px`} as React.CSSProperties}
      aria-labelledby={`${id}-payee`} aria-describedby={`${id}-keys`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <p className="eyebrow">{current.kind === 'income' ? 'RECEIVED' : 'SPENT'} · {formatDate(current.date)}</p>
      <h5 id={`${id}-payee`} className="review-card-payee">{current.note || current.category}</h5>
      <p className={`review-card-amount${current.kind === 'income' ? ' spending-in' : ''}`}>{current.kind === 'income' ? '+' : '−'}{money(current.amount, current.currency)}</p>
      <fieldset className="review-card-chips"><legend>Category</legend>
        {chips.map(c => <button key={c} type="button" className="review-card-chip" aria-pressed={c === current.category} onClick={() => c !== current.category && recategorise(current, c)}>{c}</button>)}
      </fieldset>
      <div className="review-card-actions">
        <button type="button" className="primary" aria-keyshortcuts="A" onClick={() => act('accept')}>Accept</button>
        <button type="button" className="secondary" aria-keyshortcuts="S" onClick={() => act('skip')}>Skip</button>
        <button type="button" className="quiet" aria-keyshortcuts="R" onClick={() => act('rule')}>Make a rule</button>
      </div>
      <p id={`${id}-keys`} className="fine">Keys: A accept, S skip, R make a rule{last ? ', Z undo' : ''}. On a phone, swipe right to accept or left to skip.</p>
    </article> : <div className="review-cards-done">
      {skipped.size > 0 && <button type="button" className="secondary" onClick={() => { setSkipped(new Set()); setNote(''); }}>Go through the skipped ones</button>}
      <button type="button" className="quiet" onClick={onExit}>Back to the list</button>
    </div>}
    {(note || last) && <p className="fine review-cards-note" aria-live="polite">{note}{last && <> <button type="button" className="text-link" aria-keyshortcuts="Z" onClick={() => act('undo')}>Undo</button></>}</p>}
  </div>;
}

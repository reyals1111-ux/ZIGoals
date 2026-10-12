'use client';
import {useState, type ReactNode} from 'react';
import {useSwipeActions} from './use-swipe-actions';
import './swipe.css';

export type SwipeAction = {label: string; run: () => void; danger?: boolean; confirm?: string};
/**
 * S5: a row with swipe actions on phones. Right completes through `onComplete` (when given) with the nebula indicator;
 * left reveals the action buttons, never acts; a danger action asks for a confirmation tap first (the page's own
 * Undo stays the page's). On computers and for keyboards the row is plain: the actions it carries are the card's own
 * buttons, which stay where they are. The row's content stays the host's own direct children (B49: a row's layout
 * rules and `firstElementChild` keep meaning what they meant); the indicator and the action row come after it.
 */
export function SwipeRow({children, className = '', id, label, onComplete, completeLabel = 'Done', actions = [], as: Tag = 'div', attrs = {}, nameRow = true}: {children: ReactNode; className?: string; id?: string; label: string; onComplete?: () => void; completeLabel?: string; actions?: SwipeAction[]; as?: 'div' | 'li' | 'article'; attrs?: Record<string, unknown>; nameRow?: boolean}) {
  const swipe = useSwipeActions({onComplete}), [confirming, setConfirming] = useState<string | null>(null);
  return <Tag {...(attrs as object)} id={id} className={`swipe-host ${className}`.trim()} data-swipe={swipe.state} style={swipe.style} {...swipe.handlers} aria-label={nameRow ? label : undefined} role={Tag === 'div' && nameRow ? 'group' : undefined}>
    {children}
    {onComplete && <div className="swipe-indicator" aria-hidden="true"><i>✓</i>{completeLabel}</div>}
    {actions.length > 0 && swipe.state !== 'rest' && <div className="swipe-actions" aria-label={`Actions for ${label}`} role="group">{actions.map(a => <button type="button" key={a.label} className={a.danger ? 'swipe-delete' : ''} tabIndex={swipe.state === 'revealed' ? 0 : -1} onClick={() => { if (a.danger && confirming !== a.label) { setConfirming(a.label); return; } setConfirming(null); swipe.close(); a.run(); }}>{a.danger && confirming === a.label ? (a.confirm ?? 'Sure?') : a.label}</button>)}</div>}
  </Tag>;
}

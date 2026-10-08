'use client';
import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {hashId} from '../../lib/hash-id';
import {AppIcon} from '../app-icon';
import {usePhoneActive} from '../phone/use-phone-layout';
import './for-you.css';

export type ForYouCard = {id: string; priority: number; node: ReactNode};
/** Cards open at once: one on a phone (Today stays short), two elsewhere; the rest wait behind "Show more". */
export const FOR_YOU_OPEN = {phone: 1, wide: 2} as const;
/**
 * Today's "For you" area (Session P): every new Today card in one calm place, one open on a phone and two elsewhere,
 * the rest behind one "Show more" row on every size (the folded-section pattern of components/phone/phone-fold.tsx). Nothing here is
 * written on view; a card writes only its own key when dismissed or finished.
 */
/** `note` (Session W Part 13): one line under the eyebrow, such as the intention written at last night's wrap-up. */
export function ForYou({cards, status = '', note = null}: {cards: ForYouCard[]; status?: string; note?: ReactNode}) {
  const [open, setOpen] = useState(false), id = useId(), limit = usePhoneActive() ? FOR_YOU_OPEN.phone : FOR_YOU_OPEN.wide;
  const ordered = [...cards].sort((a, b) => a.priority - b.priority), shown = ordered.slice(0, limit), folded = ordered.slice(limit);
  // Session X P2.6: a link to one card (#for-you-<id>, such as the Guide's "Open the review") opens the "Show more" fold
  // when the card waits behind it, and scrolls to the card once it is there; once per link.
  const foldedIds = folded.map(card => card.id).join(' '), followed = useRef<string | null>(null);
  useEffect(() => {
    const follow = () => {
      const target = hashId(location.hash);
      if (!target?.startsWith('for-you-') || target === followed.current) return;
      const card = target.slice('for-you-'.length);
      if (foldedIds.split(' ').includes(card)) setOpen(true);
      else if (!document.getElementById(target)) return;
      followed.current = target;
      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({block: 'start'})));
    };
    follow();
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, [foldedIds]);
  if (!ordered.length && !status && !note) return null;
  return <section className="for-you" aria-label="For you">
    <p className="eyebrow for-you-eyebrow">For you</p>
    {note}
    {status && <p role="status" className="fine for-you-status">{status}</p>}
    {shown.map(card => <div key={card.id} id={`for-you-${card.id}`} className="for-you-slot" data-card={card.id}>{card.node}</div>)}
    {folded.length > 0 && <div className="phone-fold for-you-fold" data-open={open || undefined}>
      <button type="button" className="phone-fold-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span>{open ? 'Hide' : `Show more (${folded.length})`}</span><span className="phone-fold-hint" aria-hidden="true">{open ? 'Hide' : 'Show'}<AppIcon name="chevron" size={18} /></span>
      </button>
      {open && <div id={id} className="phone-fold-body">{folded.map(card => <div key={card.id} id={`for-you-${card.id}`} className="for-you-slot" data-card={card.id}>{card.node}</div>)}</div>}
    </div>}
  </section>;
}

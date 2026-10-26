'use client';
import {useEffect, useState} from 'react';
import './length-counter.css';

/**
 * Session AH Part 5 (VA4; D-043, D-202, D-207, B-138, N-052, T-062, T-064, T-078, T-123, M-011, D-054, B-157, B-149): every
 * text field with a length limit shows its count while it has the focus ("72 / 80"), so a name never stops at a limit
 * nobody could see. One small badge, fixed beside the focused field (nothing in the page moves); near the limit it
 * says how many characters are left, politely, to screen readers too. Each field keeps its own record's limit (raising or
 * lowering one would change what older builds read, ADR-033 M23).
 */
type Shown = {used: number; max: number; top: number; left: number};
const counted = (el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement =>
  (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && ['text', 'search', ''].includes(el.type))) && el.maxLength > 0 && el.maxLength <= 5000 && !el.readOnly && !el.disabled;
export function LengthCounterHost() {
  const [shown, setShown] = useState<Shown | null>(null);
  useEffect(() => {
    let field: HTMLInputElement | HTMLTextAreaElement | null = null;
    const place = () => { if (!field) return setShown(null); const r = field.getBoundingClientRect(); setShown({used: field.value.length, max: field.maxLength, top: r.bottom + 4, left: Math.max(8, r.right - 96)}); };
    const focus = (e: FocusEvent) => { field = counted(e.target) ? e.target : null; place(); };
    const input = (e: Event) => { if (e.target === field) place(); };
    const blur = (e: FocusEvent) => { if (e.target === field) { field = null; setShown(null); } };
    document.addEventListener('focusin', focus); document.addEventListener('input', input, true); document.addEventListener('focusout', blur);
    window.addEventListener('scroll', place, true); window.addEventListener('resize', place);
    return () => { document.removeEventListener('focusin', focus); document.removeEventListener('input', input, true); document.removeEventListener('focusout', blur); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, []);
  if (!shown) return null;
  const left = shown.max - shown.used, near = left <= Math.max(5, Math.ceil(shown.max * 0.1));
  return <span className="length-counter" data-near={near || undefined} style={{top: shown.top, left: shown.left}} aria-live={near ? 'polite' : 'off'}>
    {near ? `${left} ${left === 1 ? 'character' : 'characters'} left` : `${shown.used} / ${shown.max}`}
  </span>;
}

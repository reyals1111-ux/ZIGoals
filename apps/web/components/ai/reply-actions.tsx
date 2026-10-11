'use client';
import {useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref} from 'react';

/**
 * Session Z-Cloud panel polish round 2 (the owner's rule: no chrome wraps in ZIGi's panel): one compact row under each
 * reply. The time on the left, then icon buttons (copy, read aloud, regenerate, useful, not useful) and "⋯" for the rare
 * ones (Copy as Markdown, Think deeper, Continue in my AI, the token count). Every button keeps a 44 px target, an
 * accessible name and a tooltip; no row of text links. The latest reply shows its buttons; an earlier one shows them on
 * hover, on focus, or after a tap on it (phones).
 */
export type ReplyGlyph = 'copy' | 'copied' | 'speak' | 'stop' | 'regenerate' | 'up' | 'down' | 'more' | 'edit' | 'ask' | 'pin' | 'delete';
const PATHS: Record<Exclude<ReplyGlyph, 'more'>, string> = {
  copy: 'M9 9h10v10H9zM5 15V5h10',
  copied: 'M5 12.5l4.5 4.5L19 7',
  speak: 'M4 9.5v5h3.5L12 18V6L7.5 9.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
  stop: 'M7.5 7.5h9v9h-9z',
  regenerate: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4',
  up: 'M7.5 11v8.5H4.5V11zM7.5 11l3.6-6.3a1.8 1.8 0 0 1 3.3 1.3l-.8 4h5a1.8 1.8 0 0 1 1.8 2.1l-1.1 5.9a1.8 1.8 0 0 1-1.8 1.5H7.5',
  down: 'M16.5 13V4.5h3V13zM16.5 13l-3.6 6.3a1.8 1.8 0 0 1-3.3-1.3l.8-4h-5a1.8 1.8 0 0 1-1.8-2.1l1.1-5.9A1.8 1.8 0 0 1 6.5 4.5h10',
  edit: 'M4.5 19.5h3.8L18.6 9.2l-3.8-3.8L4.5 15.7zM13.4 6.8l3.8 3.8',
  ask: 'M5 12h13M12.5 6.5L18 12l-5.5 5.5',
  pin: 'M9 4h6l-1 6 3 3v2H7v-2l3-3zM12 15v5',
  delete: 'M4.5 7h15M10 7V4.5h4V7M6.5 7l1 12.5h9l1-12.5M10.5 11v5M13.5 11v5',
};
export function ReplyGlyphIcon({glyph}: {glyph: ReplyGlyph}) {
  return <svg className="ai-reply-glyph" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    {glyph === 'more' ? <g fill="currentColor"><circle cx="5.5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18.5" cy="12" r="1.8"/></g>
      : <path d={PATHS[glyph]} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>}
  </svg>;
}
type IconProps = {glyph: ReplyGlyph; label: string; tip?: string; onClick: () => void; pressed?: boolean; expanded?: boolean; controls?: string; className?: string; buttonRef?: Ref<HTMLButtonElement>};
export function ReplyIcon({glyph, label, tip, onClick, pressed, expanded, controls, className = '', buttonRef}: IconProps) {
  return <button ref={buttonRef} type="button" className={`ai-reply-icon ${className}`.trim()} aria-label={label} data-tip={tip ?? label} aria-pressed={pressed} aria-expanded={expanded} aria-controls={controls} onClick={onClick}><ReplyGlyphIcon glyph={glyph}/></button>;
}
export type ReplyMoreItem = {key: string; label: string; done?: string; title?: string; keepOpen?: boolean; onSelect: () => void};
/**
 * "⋯" for one reply: the rare actions as plain buttons that keep their own names, and short lines of information (the
 * token count, the provider's usage page). Arrow keys move, Escape closes and gives the focus back.
 */
export function ReplyMore({items, info}: {items: readonly ReplyMoreItem[]; info?: ReactNode}) {
  const [open, setOpen] = useState(false), [done, setDone] = useState<string | null>(null), listId = useId(), trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null);
  const close = useCallback((focus = true) => { setOpen(false); setDone(null); if (focus) trigger.current?.focus({preventScroll: true}); }, []);
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>('button, a')?.focus({preventScroll: true});
    const doc = trigger.current?.ownerDocument ?? document;
    const away = (event: PointerEvent) => { const t = event.target as Node | null; if (t && !list.current?.contains(t) && !trigger.current?.contains(t)) { setOpen(false); setDone(null); } };
    doc.addEventListener('pointerdown', away, true);
    return () => doc.removeEventListener('pointerdown', away, true);
  }, [open]);
  const onKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const entries = [...(list.current?.querySelectorAll<HTMLElement>('button, a') ?? [])], at = entries.indexOf(event.target as HTMLElement);
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === 'Tab') { setOpen(false); return; }
    const move = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!move || at < 0) return;
    event.preventDefault(); entries[(at + move + entries.length) % entries.length]?.focus();
  };
  if (!items.length && !info) return null;
  return <span className="ai-reply-more">
    <ReplyIcon buttonRef={trigger} glyph="more" label="More for this reply" tip="More" expanded={open} controls={listId} onClick={() => { setOpen(o => !o); setDone(null); }}/>
    <div id={listId} ref={list} className="ai-reply-more-list" role="group" aria-label="More for this reply" hidden={!open} onKeyDown={onKey}>
      {info && <div className="ai-reply-more-info">{info}</div>}
      {items.map(item => <button key={item.key} type="button" className="ai-more-item" title={item.title} onClick={() => { item.onSelect(); if (item.keepOpen) setDone(item.key); else close(false); }}>{done === item.key && item.done ? item.done : item.label}</button>)}
    </div>
  </span>;
}

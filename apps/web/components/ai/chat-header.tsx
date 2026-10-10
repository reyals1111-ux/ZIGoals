'use client';
import Link from 'next/link';
import {useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref} from 'react';
import {ZigiTitle} from './zigi-title';

/**
 * ZIGi's panel header (Session Z-Cloud Part 2, ADR-019): one row at every width. ZIGi's figure, the title with a small
 * status line, then glyph buttons in the nebula style of the launcher's chevron: a new chat, expand or shrink and pop out
 * (computers only), "⋯" for the rest, and close. Every button keeps a 44 px target, an accessible name and a tooltip. The
 * "⋯" list (which also holds "Change model" when an AI is connected) is a disclosure (a button and the buttons and links it shows), so each entry keeps its role and name; arrow
 * keys move between entries, Escape closes it and gives the focus back.
 */
export {ZIGI_TITLE} from './zigi-title';
export type Glyph = 'plus' | 'expand' | 'shrink' | 'popout' | 'back' | 'more' | 'close';
const PATHS: Record<Exclude<Glyph, 'more'>, string> = {
  plus: 'M12 5v14M5 12h14',
  expand: 'M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7',
  shrink: 'M4 14h6v6M10 14l-6 6M20 10h-6V4M14 10l6-6',
  popout: 'M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  back: 'M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5M20 4l-8 8M11 6v6h6',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
};
/** The gradient every glyph strokes with, defined once per panel (the mini window carries its own copy with the panel). */
export function GlyphGradient({id}: {id: string}) {
  return <svg className="ai-glyph-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><linearGradient id={id} x1="0" x2="1" y1="0" y2="1"><stop offset="0"/><stop offset=".5"/><stop offset="1"/></linearGradient></defs></svg>;
}
export function GlyphIcon({glyph, gradient}: {glyph: Glyph; gradient: string}) {
  return <svg className="ai-glyph" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
    {glyph === 'more' ? <g fill={`url(#${gradient})`}><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></g>
      : <path d={PATHS[glyph]} fill="none" stroke={`url(#${gradient})`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>}
  </svg>;
}
type IconButtonProps = {glyph: Glyph; label: string; tip: string; gradient: string; onClick: () => void; pressed?: boolean; className?: string; expanded?: boolean; controls?: string; buttonRef?: Ref<HTMLButtonElement>};
export function IconButton({glyph, label, tip, gradient, onClick, pressed, className = '', expanded, controls, buttonRef}: IconButtonProps) {
  return <button ref={buttonRef} type="button" className={`ai-icon-button ${className}`.trim()} aria-label={label} data-tip={tip} onClick={onClick}
    aria-pressed={pressed} aria-expanded={expanded} aria-controls={controls}><GlyphIcon glyph={glyph} gradient={gradient}/></button>;
}
export type MoreItem = {key: string; label: string; name?: string; onSelect?: () => void; href?: string; pressed?: boolean};
/** "⋯": History, Customize, Settings, Meet ZIGi, Help and Music, as plain buttons and links that keep their own names. */
export function MoreMenu({items, gradient, extra}: {items: readonly MoreItem[]; gradient: string; extra?: ReactNode}) {
  const [open, setOpen] = useState(false), listId = useId(), trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null);
  const close = useCallback((focus = true) => { setOpen(false); if (focus) trigger.current?.focus({preventScroll: true}); }, []);
  useEffect(() => {
    if (!open) return;
    const first = list.current?.querySelector<HTMLElement>('a, button, summary'); first?.focus({preventScroll: true});
    const doc = trigger.current?.ownerDocument ?? document;
    const away = (event: PointerEvent) => { const t = event.target as Node | null; if (t && !list.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false); };
    doc.addEventListener('pointerdown', away, true);
    return () => doc.removeEventListener('pointerdown', away, true);
  }, [open]);
  const onKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const entries = [...(list.current?.querySelectorAll<HTMLElement>('a, button, summary') ?? [])].filter(el => el.offsetParent !== null), at = entries.indexOf(event.target as HTMLElement);
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === 'Tab') { setOpen(false); return; }
    const move = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : event.key === 'Home' ? -at : event.key === 'End' ? entries.length - 1 - at : 0;
    if (!move || at < 0) return;
    event.preventDefault(); entries[(at + move + entries.length) % entries.length]?.focus();
  };
  return <div className="ai-more">
    <IconButton buttonRef={trigger} glyph="more" label="More: history, customize, settings and help" tip="More" gradient={gradient} expanded={open} controls={listId} onClick={() => setOpen(o => !o)}/>
    <div id={listId} ref={list} className="ai-more-list" role="group" aria-label="More" hidden={!open} onKeyDown={onKey}>
      {extra}
      {items.map(item => item.href
        ? <Link key={item.key} className="ai-more-item" href={item.href} aria-label={item.name} onClick={() => { setOpen(false); item.onSelect?.(); }}>{item.label}</Link>
        : <button key={item.key} type="button" className="ai-more-item" aria-label={item.name} aria-pressed={item.pressed} onClick={() => { close(false); item.onSelect?.(); }}>{item.label}</button>)}
    </div>
  </div>;
}
export type ChatHeaderProps = {
  titleId: string; figure: ReactNode; status: ReactNode; premium: string | null;
  phone: boolean; miniWindow: boolean; miniSupported: boolean; expanded: boolean;
  onNew: () => void; onExpand: () => void; onPopOut: () => void; onBackToTab: () => void; onClose: () => void; more: readonly MoreItem[];
  /** An entry of its own at the top of "⋯" (the model list when an AI is connected). */
  extra?: ReactNode;
};
export function ChatHeader({titleId, figure, status, premium, phone, miniWindow, miniSupported, expanded, onNew, onExpand, onPopOut, onBackToTab, onClose, more, extra}: ChatHeaderProps) {
  const gradient = `zigi-glyph-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return <header className="ai-chat-head">
    <GlyphGradient id={gradient}/>
    {figure}
    <div className="ai-chat-identity">
      <ZigiTitle id={titleId}/>
      <div className="ai-chat-via">{status}{premium && <span className="ai-chat-premium">{premium}</span>}</div>
    </div>
    <div className="ai-chat-tools" role="toolbar" aria-label="Chat tools">
      <IconButton glyph="plus" label="New chat" tip="New chat" gradient={gradient} onClick={onNew}/>
      {miniWindow ? <IconButton glyph="back" label="Back to the tab" tip="Back to the tab" gradient={gradient} onClick={onBackToTab}/>
        : !phone && <IconButton glyph={expanded ? 'shrink' : 'expand'} label={expanded ? 'Shrink the chat' : 'Expand the chat'} tip={expanded ? 'Shrink' : 'Expand'} gradient={gradient} pressed={expanded} onClick={onExpand}/>}
      {!phone && !miniWindow && miniSupported && <IconButton glyph="popout" label="Pop out ZIGi into a mini window" tip="Pop out" gradient={gradient} onClick={onPopOut}/>}
      <MoreMenu items={more} gradient={gradient} extra={extra}/>
      <IconButton glyph="close" label="Close ZIGi" tip="Close" gradient={gradient} className="ai-chat-close" onClick={onClose}/>
    </div>
  </header>;
}

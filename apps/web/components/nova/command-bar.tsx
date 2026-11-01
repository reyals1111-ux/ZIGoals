'use client';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {MAX_INPUT_CHARS} from '../../lib/ai/chats';
import {askZigi as askZigiHere} from '../ai/ask';
import {NOVA_PATH, sendToNova} from '../../lib/nova/bridge';
import './command-bar.css';

/**
 * NOVA's command bar (Session AK, owner follow-up 2 N8): ⌘/Ctrl + J from any page opens a small glass bar. Enter sends the
 * words to NOVA (NOVA's page opens and asks them as typed; nothing else is sent), "Open NOVA" just goes there, and "Ask
 * ZIGi here" puts the words in ZIGi's box on this page (nothing is sent before Send there). Escape or a press outside closes
 * it and the focus goes back where it was. The shell mounts it (lazily) and binds the key with lib/nova/command-key.ts.
 */
export type NovaCommandBarProps = {open: boolean; onClose: () => void; persona?: string};
export function NovaCommandBar({open, onClose, persona = 'NOVA'}: NovaCommandBarProps) {
  const dialog = useRef<HTMLDialogElement>(null), input = useRef<HTMLInputElement>(null), back = useRef<HTMLElement | null>(null);
  const [text, setText] = useState(''), titleId = useId(), hintId = useId();
  const router = useRouter(), pathname = usePathname() ?? '';
  useEffect(() => {
    const d = dialog.current; if (!d) return;
    if (open && !d.open) { back.current = document.activeElement as HTMLElement | null; d.showModal(); requestAnimationFrame(() => input.current?.focus()); }
    else if (!open && d.open) { d.close(); }
  }, [open]);
  const close = () => { onClose(); setText(''); const to = back.current; back.current = null; requestAnimationFrame(() => to?.focus?.({preventScroll: true})); };
  const send = (event?: FormEvent) => {
    event?.preventDefault();
    if (!sendToNova(text)) return;
    close();
    if (pathname.replace(/\/+$/, '') !== NOVA_PATH) router.push(NOVA_PATH);
  };
  const onNova = pathname.replace(/\/+$/, '') === NOVA_PATH;
  return <dialog ref={dialog} className="nova-bar" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <form className="nova-bar-body" onSubmit={send}>
      <h2 id={titleId} className="nova-bar-title">Ask {persona}</h2>
      <div className="nova-bar-row">
        <svg className="nova-bar-star" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" fill="currentColor"/></svg>
        <input ref={input} value={text} onChange={e => setText(e.target.value.slice(0, MAX_INPUT_CHARS))} placeholder={`What’s on your mind?`} aria-label={`Message ${persona}`} aria-describedby={hintId} autoComplete="off" enterKeyHint="send" maxLength={MAX_INPUT_CHARS}/>
        <button type="submit" className="primary" disabled={!text.trim()}>Send</button>
      </div>
      <p id={hintId} className="nova-bar-hint">Enter sends to {persona} · Esc closes · your words stay on this device until you send them</p>
      <div className="nova-bar-actions">
        {!onNova && <Link className="secondary" href={NOVA_PATH} onClick={() => close()}>Open {persona}</Link>}
        <button type="button" className="secondary" disabled={!text.trim()} onClick={() => { const t = text.trim(); if (!t) return; close(); askZigiHere(t); }}>Ask ZIGi here</button>
      </div>
    </form>
  </dialog>;
}
export default NovaCommandBar;

'use client';
import './unkept-chat.css';

/**
 * Session AK (G1 #20, "A chat that isn't kept", COMPETITORS_2.md item 20): the words for a conversation the person chose
 * not to keep, shared by ZIGi's panel and NOVA's chat (one engine: components/ai/use-chat-session.ts `kept`/`setKept`).
 * - `UnkeptOffer`: the empty start teaches the switch once, in one line, before anything is asked.
 * - `UnkeptBanner`: while it is on, the chat says so plainly at its top, with "Keep this chat" to change one's mind.
 * Nothing here reads or writes storage.
 */
export const DONT_KEEP_LABEL = 'Don’t keep this chat';
/** `list`: where kept chats are listed on this surface (ZIGi: History; NOVA: Conversations). `closing`: what closes it. */
export function unkeptWords(list: string, closing: string): string {
  return `Nothing of it is saved on this device: it is not in ${list}, nothing from it is remembered, and no card outcome or suggestion is kept. It is gone when you ${closing} or start a new chat. Your privacy mode and every other setting still apply.`;
}
export function UnkeptBanner({list, closing, onKeep}: {list: string; closing: string; onKeep: () => void}) {
  return <div className="ai-unkept" role="note" aria-label="This chat is not kept" data-testid="ai-unkept">
    <p><strong>This chat is not kept.</strong> {unkeptWords(list, closing)}</p>
    <button type="button" className="secondary" onClick={onKeep}>Keep this chat</button>
  </div>;
}
export function UnkeptOffer({onDontKeep}: {onDontKeep: () => void}) {
  return <p className="ai-note ai-unkept-offer">A chat you’d rather not keep? <button type="button" className="text-link" aria-pressed={false} onClick={onDontKeep}>{DONT_KEEP_LABEL}</button> before you ask: nothing of it is saved.</p>;
}

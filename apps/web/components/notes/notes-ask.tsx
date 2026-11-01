'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useId, useRef, useState, type FormEvent} from 'react';
import {chatMode} from '../ai/chat-mode';
import {useAiSettings} from '../ai/use-ai-settings';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOTES_ASK_SHOWCASE, NOVA_PERMISSIONS_HREF, notesAskState, notesPrivacyLine, notesQuestion} from '../../lib/notes/ask';
import {NOVA_PATH, sendToNova} from '../../lib/nova/bridge';
import {scopesOf} from '../../lib/nova/scopes';
import {NOVA_SETUP} from '../../lib/nova/setup';
import {NOVA_STORE, personaOf} from '../../lib/nova/store';
import {SecretGuard} from '../secret-guard/secret-guard';

/**
 * "Ask about my notes" (Session AK WA, owner follow-up 2 B5): the Notes page's door to NOVA's chat about the notes
 * (lib/notes/ask.ts). The question goes to NOVA's own chat on ZIGi's engine (`sendToNova`, as ⌘/Ctrl + J does), which reads
 * the notes only under NOVA → Permissions → Notes (off by default; this page only points there) and the person's privacy
 * mode, with their own model. Loaded on use below the Notes views; nothing is sent before the person presses Ask.
 */
export default function NotesAsk({notes, showcase = false}: {notes: number; showcase?: boolean}) {
  const id = useId(), router = useRouter(), settings = useAiSettings(), setup = useDeviceRecord(NOVA_SETUP), nova = useDeviceRecord(NOVA_STORE);
  const [text, setText] = useState(''), [note, setNote] = useState(''), pasted = useRef(false);
  const persona = personaOf(nova.data).name;
  if (!settings.loaded || !setup.loaded) return null;
  // An unreadable setup record reads as the defaults: Notes off, Strict (lib/nova/setup.ts readPrivacyMode).
  const scopeOn = !setup.unreadable && scopesOf(setup.data).notes, mode = setup.unreadable ? 'strict' : setup.data.privacyMode ?? null;
  const state = notesAskState({notes, scopeOn, connected: chatMode(false, settings.data).connected});
  const ask = (event: FormEvent) => {
    event.preventDefault();
    const question = notesQuestion(text);
    if (!question || !sendToNova(question, {pasted: pasted.current})) { setNote('Write a question first.'); return; }
    setText(''); pasted.current = false;
    router.push(NOVA_PATH);
  };
  return <section className="panel note-ask" aria-labelledby={`${id}-t`}>
    <h2 id={`${id}-t`}>Ask about my notes</h2>
    {state === 'empty' && <p className="fine">Once you have notes, ask {persona} about them here, for example “What did I decide about the trip?”. {persona} reads them only if you allow Notes in {persona} → Permissions.</p>}
    {state === 'permission' && <>
      <p className="fine">{persona} reads your notes only when Notes is on in {persona} → Permissions. It is off until you turn it on there.</p>
      <p className="note-ask-actions"><Link className="secondary" href={NOVA_PERMISSIONS_HREF} prefetch={false}>Open {persona} → Permissions</Link></p>
    </>}
    {state === 'brain' && <>
      <p className="fine">{persona} answers questions about your notes with a model of your own: a free local model on your computer (private, recommended) or your own key. Until then, Search in the Notes view finds words in your notes on this device.</p>
      <p className="note-ask-actions"><Link className="secondary" href="/app/nova/setup" prefetch={false}>Build {persona}’s brain</Link></p>
    </>}
    {state === 'ready' && <form className="note-ask-form" onSubmit={ask}>
      <label className="field"><span>Your question</span><input value={text} maxLength={2000} onChange={e => { setText(e.target.value); if (!e.target.value) pasted.current = false; setNote(''); }} onPaste={() => { pasted.current = true; }} placeholder="What did I plan for the weekend?" autoComplete="off"/></label>
      <button type="submit" className="primary" disabled={!text.trim()}>Ask {persona}</button>
      {/* As in NOVA's composer: a question that looks like recovery words or a key is never sent (the engine refuses it too). */}
      <SecretGuard text={text} onRemove={() => setText('')} chat/>
      <p className="fine note-ask-privacy">{notesPrivacyLine(mode, persona)} The answer and your question stay in one history with ZIGi, on this device.</p>
      {note && <p className="fine" role="status">{note}</p>}
    </form>}
    {showcase && <div className="note-ask-example" role="note" aria-label="Showcase example">
      <p className="fine">{NOTES_ASK_SHOWCASE.label}</p>
      <p><strong>You</strong> {NOTES_ASK_SHOWCASE.question}</p>
      <p><strong>{persona}</strong> {NOTES_ASK_SHOWCASE.answer}</p>
    </div>}
  </section>;
}

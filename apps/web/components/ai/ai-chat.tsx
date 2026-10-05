'use client';
import Link from 'next/link';
import {useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent} from 'react';
import {hasOpenFence, parseReply} from '../../lib/ai/actions/parse';
import {bridgePrompt, subscriptionApp} from '../../lib/ai/bridge';
import type {ChatSummary, ChatTurn} from '../../lib/ai/chats';
import {usageLine} from '../../lib/ai/context/budget';
import {AREA_LABELS} from '../../lib/ai/context/pages';
import {ANSWER_LABEL, SPECIALISTS} from '../../lib/ai/context/specialists';
import {readKey} from '../../lib/ai/keys';
import {listModels} from '../../lib/ai/models';
import {PROVIDERS} from '../../lib/ai/providers';
import {parseBlocks, plainText} from '../../lib/ai/safe-render';
import type {ModelInfo} from '../../lib/ai/types';
import {entitlement} from '../../lib/entitlements';
import {NebulaFlow} from '../nebula-flow';
import './ai.css';
import {useVisualViewportInsets} from '../phone/use-visual-viewport';
import {useZigiState} from '../zigi/events';
import {ZigiAvatar} from '../zigi/zigi-avatar';
import {ProposalList} from './proposal-list';
import {SafeText} from './safe-text';
import {useAiContext} from './use-ai-context';
import {useAiSettings, type AiSettingsStore} from './use-ai-settings';
import {currentAiScope} from '../../lib/ai/scope';
import type {AiSettings} from '../../lib/ai/settings';
import {useChatSession, type ChatSession} from './use-chat-session';
import {useProposals} from './use-proposals';
import {useReadAloud, useVoice} from './use-voice';
import {ASK_EVENT, takePendingAsk} from './ask';
import {speechLanguage} from '../../lib/ai/voice';

/**
 * The chat panel (ADR-012, Part 6): a non-modal panel bottom-right on desktop and tablet (Expand for a large centred
 * view), a full-height modal sheet on phones. Esc closes, Tab stays inside, focus returns to the launcher. Replies are
 * rendered from a parsed tree; proposals become cards; every reply says whose answer it is. The pending state is
 * announced once; streaming is batched per animation frame and never announced token by token.
 */
type Props = {open: boolean; onClose: () => void; sensitive: boolean; phone: boolean};
const SETTINGS_HREF = '/app/settings#your-ai';
const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';
export default function AiChat({open, onClose, sensitive, phone}: Props) {
  const settings = useAiSettings(), scope = currentAiScope();
  const data = settings.data, provider = data.provider ? PROVIDERS[data.provider] : null;
  const providerName = data.provider === 'local' ? (data.localServer === 'ollama' ? 'Ollama' : 'your local server') : provider?.name ?? 'your AI';
  const connected = data.enabled && data.mode !== 'subscription' && !!data.provider && !!data.model, bridge = data.enabled && data.mode === 'subscription';
  const context = useAiContext(data, providerName, sensitive), session = useChatSession({settings: data, scope, context}), runner = useProposals(), zigi = useZigiState();
  const dialog = useRef<HTMLDialogElement>(null), composer = useRef<HTMLTextAreaElement>(null), log = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false), [view, setView] = useState<'chat' | 'history'>('chat'), [attach, setAttach] = useState(true), [note, setNote] = useState(''), titleId = useId();
  const reader = useReadAloud(speechLanguage(data.voice.language, typeof navigator === 'undefined' ? undefined : navigator.language));
  useVisualViewportInsets(phone && open);
  // The page behind a phone sheet does not scroll (iOS scrolls the document behind a modal dialog otherwise).
  useEffect(() => { if (!(phone && open)) return; document.documentElement.dataset.aiSheet = ''; return () => { delete document.documentElement.dataset.aiSheet; }; }, [phone, open]);
  useEffect(() => {
    const d = dialog.current; if (!d) return;
    if (open && !d.open) { if (phone) d.showModal(); else d.show(); requestAnimationFrame(() => composer.current?.focus({preventScroll: true})); }
    else if (!open && d.open) d.close();
  }, [open, phone]);
  // Announced once per reply: when the wait starts, and when the reply has arrived.
  const replies = session.chat.turns.filter(t => t.role === 'assistant').length, lastStatus = useRef(session.status), lastReplies = useRef(replies);
  useEffect(() => { if (session.status === 'pending' && lastStatus.current === 'idle') setNote('Waiting for your AI to reply…'); lastStatus.current = session.status; }, [session.status]);
  useEffect(() => {
    if (replies > lastReplies.current) { setNote('Your AI replied.'); if (data.voice.readAloud && open) { const last = [...session.chat.turns].reverse().find(t => t.role === 'assistant'); if (last) reader.speak(plainText(parseBlocks((session.parsed.get(last.id) ?? parseReply(last.text)).text))); } }
    lastReplies.current = replies;
  }, [replies, data.voice.readAloud, open, reader, session.chat.turns, session.parsed]);
  useEffect(() => { if (!open) reader.stop(); }, [open, reader]);
  useEffect(() => { const el = log.current; if (!el) return; if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight; }, [session.chat.turns.length, session.draft]);
  const trapTab = useCallback((event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape' && !phone) { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null || el === document.activeElement);
    const first = items[0], last = items[items.length - 1]; if (!first || !last) return;
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  }, [onClose, phone]);
  const shownDraft = useMemo(() => { if (!session.draft) return ''; if (hasOpenFence(session.draft)) { const at = session.draft.search(/(```+|~~~+)[^\S\n]*(?:json[^\S\n]+)?zigoals/i); return at >= 0 ? session.draft.slice(0, at) : session.draft; } return parseReply(session.draft).text; }, [session.draft]);
  const busy = session.status !== 'idle', area = context.area, lastAssistant = [...session.chat.turns].reverse().find(t => t.role === 'assistant');
  return <dialog ref={dialog} data-ai-dialog="" className={`ai-chat${expanded && !phone ? ' ai-chat-expanded' : ''}${phone ? ' ai-chat-phone' : ''}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={trapTab} onClick={event => { if (phone && event.target === event.currentTarget) onClose(); }}>
    <header className="ai-chat-head">
      <ZigiAvatar state={zigi} size={40} decorative/>
      <div className="ai-chat-identity">
        <h2 id={titleId} className="ai-chat-title"><NebulaFlow identity="ai-chat-title">ZIGi · your AI</NebulaFlow></h2>
        <p className="ai-chat-via"><span className="ai-chat-via-text">{connected ? `via ${providerName} · ${data.model}` : bridge ? `with your ${subscriptionApp(data.subscriptionApp)?.name ?? 'subscription'} subscription` : 'not connected yet'}</span><span className="ai-chat-premium">{entitlement('your-ai').label}</span></p>
      </div>
      <button type="button" className="quiet ai-chat-close" onClick={onClose} aria-label="Close ZIGi">×</button>
      <div className="ai-chat-tools" role="toolbar" aria-label="Chat tools">
        {connected && <ModelSwitcher settings={settings} scope={scope}/>}
        <button type="button" className="quiet" onClick={() => { session.startNew(); setView('chat'); composer.current?.focus(); }} aria-label="New chat" title="New chat">New</button>
        <button type="button" className="quiet" aria-pressed={view === 'history'} onClick={() => setView(v => v === 'history' ? 'chat' : 'history')} aria-label="Chat history" title="History">History</button>
        <Link className="quiet" href={SETTINGS_HREF} onClick={onClose} aria-label="ZIGi settings" title="Settings">Settings</Link>
        {!phone && <button type="button" className="quiet" onClick={() => setExpanded(e => !e)} aria-pressed={expanded} aria-label={expanded ? 'Shrink the chat' : 'Expand the chat'} title={expanded ? 'Shrink' : 'Expand'}>{expanded ? 'Shrink' : 'Expand'}</button>}
      </div>
    </header>
    {view === 'history' ? <HistoryView session={session} onOpen={() => setView('chat')}/> : <>
      <div ref={log} className="ai-chat-log" role="log" aria-label="Conversation">
        {!data.enabled && <NotConnected onClose={onClose}/>}
        {bridge && <BridgeView settings={settings} context={context} attach={attach} sensitive={sensitive}/>}
        {connected && session.chat.turns.length === 0 && !busy && <Greeting area={area} onChip={chip => void session.send(chip, {withContext: attach})}/>}
        {connected && session.chat.turns.map(turn => <TurnView key={turn.id} turn={turn} session={session} runner={runner} providerName={providerName} usageUrl={provider?.usageUrl ?? null} isLast={turn === lastAssistant && !busy} onNavigate={onClose} reader={reader}/>)}
        {session.status === 'pending' && <div className="ai-pending" aria-hidden="true"><ZigiAvatar state="thinking" size={28} decorative/><span className="ai-pending-dots"><i/><i/><i/></span><span className="ai-pending-text">Waiting for {providerName}…</span></div>}
        {session.status === 'streaming' && <article className="ai-turn ai-turn-assistant ai-turn-live" aria-hidden="true"><ZigiAvatar state="speaking" size={28} decorative/><div className="ai-turn-body"><SafeText text={shownDraft}/></div></article>}
        {session.confirmation && <div className="ai-confirm" role="group" aria-label="This page's data is larger than your budget">
          <p>This page’s data is about {session.confirmation.fit.estimated.context.toLocaleString('en-US')} tokens; with the conversation that is {session.confirmation.fit.estimated.total.toLocaleString('en-US')}, above your budget of {session.confirmation.budget.toLocaleString('en-US')} (Settings → ZIGi · your AI → Context budget).</p>
          <div className="ai-card-actions"><button type="button" className="primary" onClick={() => void session.send(session.confirmation!.text, {confirmed: true, reuse: session.confirmation!.reuse})}>Send anyway</button><button type="button" className="secondary" onClick={() => void session.send(session.confirmation!.text, {confirmed: true, withContext: false, reuse: session.confirmation!.reuse})}>Send without page data</button><button type="button" className="text-link" onClick={session.cancelConfirmation}>Cancel</button></div>
        </div>}
        {session.failure && <div className="ai-failure" role="alert"><p className="ai-failure-title">{session.failure.title}</p>{session.failure.steps.length > 0 && <ul>{session.failure.steps.map((step, i) => <li key={i}>{step}</li>)}</ul>}<div className="ai-card-actions">{['bad-key', 'missing-key', 'not-connected', 'model-missing', 'local-unreachable', 'cors'].includes(session.failure.kind) && <Link className="secondary" href={SETTINGS_HREF} onClick={onClose}>Open Settings</Link>}<button type="button" className="text-link" onClick={session.dismissFailure}>Dismiss</button></div></div>}
        {session.saveNote && <p className="ai-note" role="status">{session.saveNote}</p>}
      </div>
      {connected && <ContextBar context={context} attach={attach} onAttach={setAttach} sensitive={sensitive} total={conversationTokens(session.chat.turns)}/>}
      {connected && <Composer ref={composer} session={session} attach={attach} phone={phone} settings={data} scope={scope} placeholder={phone ? `Ask, or say what to log…` : `Ask about ${AREA_LABELS[area]}, or say what to log…`}/>}
    </>}
    <p className="ai-sr-only" role="status" aria-live="polite">{note}</p>
  </dialog>;
}
function Greeting({area, onChip}: {area: keyof typeof SPECIALISTS; onChip: (chip: string) => void}) {
  return <div className="ai-greeting"><ZigiAvatar state="greeting" size={72} decorative/><div><p className="ai-greeting-text">Hi, I’m ZIGi. I read this page with your permission and answer with your own AI. Nothing is written unless you add a card.</p><div className="ai-chips" aria-label="Suggestions">{SPECIALISTS[area].chips.map(chip => <button key={chip} type="button" className="ai-chip" onClick={() => onChip(chip)}>{chip}</button>)}</div></div></div>;
}
function NotConnected({onClose}: {onClose: () => void}) {
  return <div className="ai-greeting ai-not-connected"><ZigiAvatar state="attention" size={72} decorative/><div><p className="ai-greeting-text">Connect your own AI to start: an API key, a local model on this computer, or the subscription bridge. Prompts, replies and keys travel from this browser straight to your provider; ZIGoals never sees them.</p><Link className="primary" href={SETTINGS_HREF} onClick={onClose}>Set up in Settings</Link></div></div>;
}
function TurnView({turn, session, runner, providerName, usageUrl, isLast, onNavigate, reader}: {turn: ChatTurn; session: ChatSession; runner: ReturnType<typeof useProposals>; providerName: string; usageUrl: string | null; isLast: boolean; onNavigate: () => void; reader: ReturnType<typeof useReadAloud>}) {
  const [copied, setCopied] = useState(false);
  if (turn.role === 'user') return <article className="ai-turn ai-turn-user" aria-label="You"><div className="ai-turn-body"><p>{turn.text}</p></div></article>;
  const parsed = session.parsed.get(turn.id) ?? parseReply(turn.text), usage = usageLine(turn.usage ?? null);
  const copy = () => { navigator.clipboard?.writeText(plainText(parseBlocks(parsed.text))).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => undefined); };
  return <article className="ai-turn ai-turn-assistant" aria-label="Reply">
    <ZigiAvatar state="idle" size={28} decorative/>
    <div className="ai-turn-body">
      {parsed.text && <SafeText text={parsed.text}/>}
      {(parsed.proposals.length > 0 || parsed.rejected.length > 0) && <ProposalList proposals={parsed.proposals} rejected={parsed.rejected} handles={session.handlesFor(turn.id)} runner={runner} onNavigate={onNavigate}/>}
      <footer className="ai-turn-meta">
        <span className="ai-turn-label">{ANSWER_LABEL(turn.provider && turn.provider !== 'local' ? PROVIDERS[turn.provider].name : providerName)}</span>
        {usage && <span className="ai-turn-usage">{usage}{usageUrl && <> · <a href={usageUrl} target="_blank" rel="noopener noreferrer">usage at {providerName} ↗</a></>}</span>}
        {turn.stopped && <span className="ai-turn-stopped">{turn.stopped}</span>}
        <span className="ai-turn-actions"><button type="button" className="text-link" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>{reader.supported && (reader.speaking ? <button type="button" className="text-link" onClick={reader.stop}>Stop reading</button> : <button type="button" className="text-link" onClick={() => reader.speak(plainText(parseBlocks(parsed.text)))}>Read aloud</button>)}{isLast && <button type="button" className="text-link" onClick={() => void session.regenerate()}>Regenerate</button>}</span>
      </footer>
    </div>
  </article>;
}
/** The conversation's running token total from the provider's own counts (tokens only, never money); null until a provider reported any. */
export function conversationTokens(turns: readonly ChatTurn[]): {input: number; output: number} | null {
  let input = 0, output = 0, any = false;
  for (const turn of turns) { if (turn.role !== 'assistant' || !turn.usage) continue; if (turn.usage.input !== null) { input += turn.usage.input; any = true; } if (turn.usage.output !== null) { output += turn.usage.output; any = true; } }
  return any ? {input, output} : null;
}
function ContextBar({context, attach, onAttach, sensitive, total}: {context: ReturnType<typeof useAiContext>; attach: boolean; onAttach: (value: boolean) => void; sensitive: boolean; total: {input: number; output: number} | null}) {
  const label = AREA_LABELS[context.area];
  const totalLine = total ? <span className="ai-context-total" aria-label="Tokens so far in this conversation">{total.input.toLocaleString('en-US')} in · {total.output.toLocaleString('en-US')} out tokens so far</span> : null;
  if (!context.attaches) return <div className="ai-context-bar"><span>No page data is read on Settings.</span>{totalLine}</div>;
  if (sensitive) return <div className="ai-context-bar"><span>Paused on this private screen: nothing is read from the page.</span>{totalLine}</div>;
  if (!context.consent.page) return <div className="ai-context-bar"><span>Not sharing {label} data. {context.consent.reasons[0] ?? ''}</span>{totalLine}</div>;
  return <div className="ai-context-bar">
    <label className="ai-context-switch"><input type="checkbox" checked={attach} onChange={e => onAttach(e.target.checked)}/> Share this page’s data{context.preview ? ` · ${label}${context.consent.health && context.area !== 'health' ? ' + Health' : ''} · about ${context.preview.estimatedTokens.toLocaleString('en-US')} tokens` : ''}</label>
    {attach && context.preview && <details className="ai-context-preview"><summary>What your AI sees</summary><p>{context.preview.summary}</p>{context.preview.omitted.length > 0 && <p className="ai-note">Not included: {context.preview.omitted.join(', ')}.</p>}<pre>{context.preview.text}</pre></details>}
    {attach && !context.preview && context.ready && <span className="ai-note">Nothing to share on this page yet.</span>}
    {totalLine}
  </div>;
}
import {forwardRef} from 'react';
const Composer = forwardRef<HTMLTextAreaElement, {session: ChatSession; attach: boolean; phone: boolean; settings: AiSettings; scope: string; placeholder: string}>(function Composer({session, attach, phone, settings, scope, placeholder}, ref) {
  const [text, setText] = useState(''), [disclosed, setDisclosed] = useState(false);
  useEffect(() => { const pending = takePendingAsk(); if (pending) setText(pending); const onAsk = (event: Event) => { const text = (event as CustomEvent<{text: string}>).detail?.text; if (text) { takePendingAsk(); setText(text); } }; window.addEventListener(ASK_EVENT, onAsk); return () => window.removeEventListener(ASK_EVENT, onAsk); }, []);
  const voice = useVoice({settings, scope, onText: useCallback((words: string) => setText(current => `${current.trim()}${current.trim() ? ' ' : ''}${words}`), [])});
  const busy = session.status !== 'idle', talking = voice.state !== 'idle';
  const submit = (event?: FormEvent) => { event?.preventDefault(); const value = text.trim(); if (!value || busy) return; setText(''); void session.send(value, {withContext: attach}); };
  const micLabel = voice.state === 'listening' ? 'Stop listening' : voice.state === 'recording' ? `Stop recording${voice.secondsLeft !== null ? ` (${voice.secondsLeft} s left)` : ''}` : voice.state === 'transcribing' ? 'Transcribing…' : voice.mode === 'browser' ? 'Speak (browser speech recognition)' : 'Speak (recorded, transcribed by your provider)';
  const toggleMic = () => { setDisclosed(true); if (talking) voice.stop(); else void voice.start(); };
  // Phones: hold to talk and release to stop, or tap once to start and once to stop (a press shorter than 300 ms is a tap).
  const pressStart = useRef<number | null>(null), tapped = useRef(false);
  const onMicDown = () => { setDisclosed(true); pressStart.current = Date.now(); if (talking && tapped.current) { tapped.current = false; voice.stop(); pressStart.current = null; return; } if (!talking) { tapped.current = false; void voice.start(); } };
  const onMicUp = () => { const started = pressStart.current; pressStart.current = null; if (started === null) return; if (Date.now() - started < 300) { tapped.current = true; return; } if (talking) voice.stop(); };
  return <form className="ai-composer-wrap" onSubmit={submit}>
    {voice.disclosure && (disclosed || talking) && <p className="ai-note ai-voice-disclosure" role="status">{voice.disclosure}</p>}
    {(voice.interim || voice.state === 'transcribing') && <p className="ai-note ai-voice-interim" aria-live="polite">{voice.state === 'transcribing' ? 'Transcribing…' : voice.interim}</p>}
    {voice.error && <p className="ai-card-error" role="alert">{voice.error}</p>}
    <div className="ai-composer">
      <textarea ref={ref} value={text} onChange={e => setText(e.target.value)} rows={1} maxLength={20_000} placeholder={placeholder} aria-label="Message to your AI" autoComplete="off" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !phone) { e.preventDefault(); submit(); } }}/>
      {voice.mode !== 'off' && <button type="button" className={`secondary ai-mic${talking ? ' ai-mic-on' : ''}`} aria-label={micLabel} title={micLabel} aria-pressed={talking} disabled={!voice.available || voice.state === 'transcribing'} onClick={!phone ? toggleMic : undefined}
        onPointerDown={phone ? onMicDown : undefined} onPointerUp={phone ? onMicUp : undefined} onPointerCancel={phone ? () => { pressStart.current = null; voice.cancel(); } : undefined} onKeyDown={phone ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMic(); } } : undefined}>
        <span aria-hidden="true">{talking ? '■' : '🎙'}</span></button>}
      {busy ? <button type="button" className="secondary" onClick={session.stop}>Stop</button> : <button type="submit" className="primary" disabled={!text.trim()}>Send</button>}
    </div>
    {phone && voice.mode !== 'off' && voice.available && <p className="ai-note">Hold the microphone to talk and release to stop, or tap once to start and once to stop.</p>}
  </form>;
});
function BridgeView({settings, context, attach, sensitive}: {settings: AiSettingsStore; context: ReturnType<typeof useAiContext>; attach: boolean; sensitive: boolean}) {
  const [question, setQuestion] = useState(''), [status, setStatus] = useState(''), app = subscriptionApp(settings.data.subscriptionApp);
  const prompt = useMemo(() => bridgePrompt({context: attach && !sensitive ? context.context : null, question: question || '(your question)', customInstructions: settings.data.customInstructions}), [attach, sensitive, context.context, question, settings.data.customInstructions]);
  const copy = () => { navigator.clipboard?.writeText(prompt).then(() => setStatus(`Copied. Paste it into ${app?.name ?? 'your AI'}.`)).catch(() => setStatus('Copying was not allowed here; select the text below and copy it yourself.')); };
  return <div className="ai-bridge">
    <p className="ai-greeting-text">A {app?.name ?? 'consumer'} subscription has no connection a browser app may use, so ZIGoals writes the prompt for you: copy it, open {app?.name ?? 'your AI'}, paste. Nothing is sent from here.</p>
    <label className="field">Your question<textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3} maxLength={5000}/></label>
    <div className="ai-card-actions"><button type="button" className="primary" onClick={copy} disabled={!question.trim()}>Copy for my AI</button>{app && <a className="secondary" href={app.url} target="_blank" rel="noopener noreferrer">Open {app.name} ↗</a>}</div>
    {status && <p className="ai-note" role="status">{status}</p>}
    <details className="ai-context-preview"><summary>What will be copied</summary><pre>{prompt}</pre></details>
  </div>;
}
function ModelSwitcher({settings, scope}: {settings: AiSettingsStore; scope: string}) {
  const [models, setModels] = useState<ModelInfo[] | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState(''), [query, setQuery] = useState(''), details = useRef<HTMLDetailsElement>(null);
  const provider = settings.data.provider!;
  const load = async () => {
    if (models || loading) return; setLoading(true); setError('');
    try { const key = await readKey(scope, provider); const list = await listModels({provider, key, baseUrl: settings.data.baseUrl ?? undefined, localServer: settings.data.localServer ?? undefined}); setModels(list.filter(m => m.kind === 'chat')); }
    catch (e) { setError(e instanceof Error ? e.message : 'The model list could not be loaded.'); }
    finally { setLoading(false); }
  };
  const shown = (models ?? []).filter(m => !query || m.id.toLowerCase().includes(query.toLowerCase()) || m.label.toLowerCase().includes(query.toLowerCase()));
  return <details ref={details} className="ai-model-switcher" onToggle={event => { if (event.currentTarget.open) void load(); }}>
    <summary aria-label={`Model: ${settings.data.model}. Change model`}>Model</summary>
    <div className="ai-model-list">
      {(models?.length ?? 0) > 8 && <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search models" aria-label="Search models"/>}
      {loading && <p className="ai-note" role="status">Loading your provider’s models…</p>}
      {error && <p className="ai-card-error" role="alert">{error}</p>}
      <ul role="listbox" aria-label="Models">{shown.slice(0, 200).map(m => <li key={m.id}><button type="button" role="option" aria-selected={m.id === settings.data.model} onClick={() => { settings.update(s => ({...s, model: m.id})); if (details.current) details.current.open = false; }}>{m.label}{m.label !== m.id && <small> {m.id}</small>}</button></li>)}</ul>
      {models && !shown.length && !loading && <p className="ai-note">No chat model matches.</p>}
    </div>
  </details>;
}
function HistoryView({session, onOpen}: {session: ChatSession; onOpen: () => void}) {
  const [items, setItems] = useState<ChatSummary[] | null>(null), [query, setQuery] = useState(''), [renaming, setRenaming] = useState<{id: string; title: string} | null>(null), [confirmClear, setConfirmClear] = useState(false), [error, setError] = useState('');
  const {list, search} = session;
  const refresh = useCallback(async () => { try { setItems(query.trim() ? await search(query.trim()) : await list()); setError(''); } catch { setError('Your chats could not be read on this device.'); } }, [list, search, query]);
  // The search waits for a short pause in typing; the list itself loads at once.
  useEffect(() => { if (!query.trim()) { void refresh(); return; } const t = window.setTimeout(() => void refresh(), 180); return () => window.clearTimeout(t); }, [refresh, query]);
  return <div className="ai-history" aria-label="Chat history">
    <div className="ai-history-tools"><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your chats" aria-label="Search your chats"/>{items && items.length > 0 && (confirmClear ? <span className="ai-card-actions"><button type="button" className="secondary" onClick={() => void session.removeAll().then(refresh)}>Delete all chats</button><button type="button" className="text-link" onClick={() => setConfirmClear(false)}>Keep them</button></span> : <button type="button" className="text-link" onClick={() => setConfirmClear(true)}>Clear all</button>)}</div>
    {error && <p className="ai-card-error" role="alert">{error}</p>}
    {items && items.length === 0 && <p className="ai-note">No saved chats on this device{query ? ' match' : ''}.</p>}
    <ul className="ai-history-list">{(items ?? []).map(item => <li key={item.id} className={item.id === session.chat.id ? 'ai-history-current' : undefined}>
      {renaming?.id === item.id ? <form className="ai-history-rename" onSubmit={e => { e.preventDefault(); void session.rename(item.id, renaming.title).then(() => { setRenaming(null); return refresh(); }); }}><input value={renaming.title} onChange={e => setRenaming({id: item.id, title: e.target.value})} maxLength={120} aria-label="Chat title" autoFocus/><button type="submit" className="secondary">Save</button><button type="button" className="text-link" onClick={() => setRenaming(null)}>Cancel</button></form>
        : <><button type="button" className="ai-history-open" onClick={() => void session.open(item.id).then(onOpen)}><strong>{item.title}</strong><small>{new Date(item.updatedAt).toLocaleString()} · {item.turnCount} turns{item.model ? ` · ${item.model}` : ''}</small></button>
        <span className="ai-history-actions"><button type="button" className="text-link" onClick={() => setRenaming({id: item.id, title: item.title})}>Rename</button><button type="button" className="text-link" onClick={() => void session.remove(item.id).then(refresh)}>Delete</button></span></>}
    </li>)}</ul>
  </div>;
}

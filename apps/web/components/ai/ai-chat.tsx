'use client';
import Link from 'next/link';
import {Suspense, lazy, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {hasOpenFence, parseReply} from '../../lib/ai/actions/parse';
import {bridgePrompt, subscriptionApp} from '../../lib/ai/bridge';
import type {ChatTurn} from '../../lib/ai/chats';
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
import {useZigiState, zigiSignals} from '../zigi/bus';
import {useZigiMachine} from '../zigi/events';
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
import {examplesFor} from '../../lib/ai/local-answers/examples';
import {LOCAL_LABEL} from '../../lib/ai/local-answers/words';
import {toolEnv} from '../../lib/ai/tools/env';
import {runTool, toolText} from '../../lib/ai/tools/registry';
import type {ToolResult} from '../../lib/ai/tools/types';
import {questionContext, type QuestionContext} from '../../lib/ai/context/question';
import {localAnswer} from '../../lib/ai/local-answers/engine';
import {dataMode, dataModeLine, toolListTokens} from '../../lib/ai/capabilities';
import {toolsFor} from '../../lib/ai/tool-loop';
import {AI_OPTIONS, type AiOptions} from '../../lib/ai/store/records';
import {useDeviceRecord} from './use-device-record';
import {BriefBlock, InsightsView, ProactiveChips, ProactiveEntries, ReviewView, type ProactiveView} from './proactive';
import type {AskAbout} from './ask';
import type {ToolCallRecord} from '../../lib/ai/local-answers/engine';
import {photoAllowance, preparePhoto, type Photo, type PhotoAllowance} from '../../lib/ai/photo';
import type {ChatImage} from '../../lib/ai/types';
import {useRouter} from 'next/navigation';
import {actionSchema} from '../../lib/ai/actions/schema';
import {turnMarkdown} from '../../lib/ai/continue';
import {stripHint} from '../../lib/ai/emotion-hint';
import {lastQuestion} from '../../lib/ai/session';
import {helpText, parseSlash, type SlashCommand, type SlashName} from '../../lib/ai/slash';
import {ContinueView} from './continue-view';
import {DataViz} from './data-viz';
import {FirstRunTips} from './first-run-tips';
import {HistoryView} from './history-view';
import {ShortcutsSheet} from './shortcuts-sheet';
import {openSideBySide} from './side-by-side';
import {SlashMenu, useSlashMenu} from './slash-menu';
import {CopyMarkdown, FeedbackButtons, FollowupChips, TurnTime} from './turn-extras';
import {CareNote} from './care-note';
import {KnockOffer} from './knock-offer';
import {AgentProposals} from './agent-proposals';
import {useHosted} from './use-hosted';
import {HOSTED_LABEL, hostedSettings} from '../../lib/ai/hosted';
import {useAgentBatches} from './agent-inbox';
import {localDate} from '../../lib/local-date';
import {carefulNote, detectRisk} from '../../lib/ai/safety';
import {copyText, nextFrame} from '../../lib/ai/chat-window';
import {useMiniWindow} from './use-mini-window';
import './pip.css';
import {ON_DEVICE_LABEL} from '../../lib/ai/on-device';

/**
 * The chat panel (ADR-012, Part 6): a non-modal panel bottom-right on desktop and tablet (Expand for a large centred
 * view), a full-height modal sheet on phones. Esc closes, Tab stays inside, focus returns to the launcher. Replies are
 * rendered from a parsed tree; proposals become cards; every reply says whose answer it is. The pending state is
 * announced once; streaming is batched per animation frame and never announced token by token. Session V Part 14: on a
 * computer whose browser has Document Picture-in-Picture, "Pop out" moves the same chat into ZIGi's mini window, an
 * always-on-top window of this tab; "Back to tab" (or ZIGi's button) brings it back. A private screen in the tab pauses
 * the mini window behind a blur.
 */
type Props = {open: boolean; onClose: () => void; onOpen?: () => void; sensitive: boolean; phone: boolean};
/** Session V Part 12: Customize ZIGi, loaded when the person opens it. */
const ZigiCustomize = lazy(() => import('./zigi-customize'));
/** Session V Part 15: "Which setup fits me?", loaded when the person opens it. */
const SetupChooser = lazy(() => import('./setup-chooser'));
const SETTINGS_HREF = '/app/settings#your-ai';
const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';
export default function AiChat({open, onClose, onOpen, sensitive, phone}: Props) {
  const settings = useAiSettings(), scope = currentAiScope(), hostedState = useHosted(), hosted = hostedState.active;
  // Session V Part 17: with ZIGoals hosted in use, it stands in for the person's own AI; the page switches still decide
  // what goes, and Health needs the hosted consent's own box on top of the three-part gate.
  const data = useMemo(() => hosted ? hostedSettings(settings.data, {version: 1, hostedConsent: {at: '', health: hostedState.health}}) : settings.data, [settings.data, hosted, hostedState.health]);
  const provider = !hosted && data.provider ? PROVIDERS[data.provider] : null;
  const providerName = hosted ? `${hosted.provider} via ZIGoals hosted` : data.provider === 'local' ? (data.localServer === 'ollama' ? 'Ollama' : 'your local server') : provider?.name ?? 'your AI';
  const connected = !!hosted || (data.enabled && data.mode !== 'subscription' && !!data.provider && !!data.model), bridge = !hosted && data.enabled && data.mode === 'subscription';
  // Session V Part 3: with no AI connected, ZIGi still answers lookups from the records on this device.
  const localOnly = !connected && !bridge;
  const context = useAiContext(data, providerName, sensitive), session = useChatSession({settings: data, scope, context, hosted}), runner = useProposals(), zigi = useZigiState();
  // ZIGi's state machine runs here, once the chat chunk is on the page (Session V Part 12); the launcher shows its state.
  useZigiMachine();
  const aiOptions = useDeviceRecord(AI_OPTIONS).data, deepModel = data.provider ? aiOptions.deepModel?.[data.provider] ?? null : null;
  const dialog = useRef<HTMLDialogElement>(null), composer = useRef<HTMLTextAreaElement>(null), log = useRef<HTMLDivElement>(null);
  // Session V Part 14: the mini window; "Back to tab" opens the panel here again.
  const mini = useMiniWindow(() => onOpen?.());
  const [expanded, setExpanded] = useState(false), [view, setView] = useState<'chat' | 'history' | 'continue' | 'customize' | 'chooser' | ProactiveView>('chat'), [attach, setAttach] = useState(true), [note, setNote] = useState(''), titleId = useId();
  const tool = session.toolState(data.model), lastMode = session.lastMode;
  // Session V Part 7: a meal photo needs a model that reads photos (its metadata, or the person's word) and Health shared.
  const declaredVision = data.provider && data.model ? aiOptions.visionDeclared?.[`${data.provider}:${data.model}`] : undefined;
  const photo = useMemo(() => connected && !sensitive ? photoAllowance({capability: tool.capability, declared: declaredVision, healthOpen: context.gates.health}) : undefined, [connected, sensitive, tool.capability, declaredVision, context.gates.health]);
  const dataLine = useMemo(() => connected ? modeLine(aiOptions, {capability: tool.capability, fellBack: tool.fellBack}, attach, context) : null, [connected, aiOptions, tool.capability, tool.fellBack, attach, context, lastMode]); // eslint-disable-line react-hooks/exhaustive-deps -- lastMode marks what the session learned
  // Session V Part 4: the records chosen from the question being typed, as removable chips; the same text goes with it.
  const [draft, setDraft] = useState(''), [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set());
  // Session V Part 9: "Ask ZIGi about this" on a number's card attaches its records as one more removable chip.
  const [pinned, setPinned] = useState<ToolCallRecord[]>([]);
  const onAbout = useCallback((about: AskAbout | undefined) => setPinned(about ? [about] : []), []);
  // An ask from the page lands in the chat, whichever view is open.
  useEffect(() => { const toChat = () => setView('chat'); window.addEventListener(ASK_EVENT, toChat); return () => window.removeEventListener(ASK_EVENT, toChat); }, []);
  const question = useMemo(() => connected && !sensitive ? questionContext(draft, context.toolSources(), context.gates, context.context?.handles ?? [], removed, pinned) : null, [connected, sensitive, draft, context, removed, pinned]);
  const sendQuestion = useCallback((value: string, extra: ComposerExtra = {}) => {
    const chosen = connected && !sensitive ? questionContext(value, context.toolSources(), context.gates, context.context?.handles ?? [], removed, pinned) : null;
    setRemoved(new Set()); setDraft(''); setPinned([]);
    void session.ask(value, {withContext: attach, ...(chosen?.text ? {extra: {text: chosen.text, handles: chosen.handles}} : {}), ...extra});
  }, [attach, connected, context, removed, pinned, sensitive, session]);
  // Session V Part 10: the shortcuts sheet, the last question being edited, and whether the conversation is scrolled up.
  const [shortcuts, setShortcuts] = useState(false), [editing, setEditing] = useState<Editing | null>(null), [away, setAway] = useState(false), router = useRouter();
  // While "Jump to the latest message" scrolls (smoothly unless motion is reduced), the button stays away.
  const jumping = useRef(false);
  useEffect(() => setEditing(null), [session.chat.id]);
  const startEdit = useCallback((turn: ChatTurn) => { setEditing({id: turn.id, text: turn.text, seq: Date.now()}); setView('chat'); nextFrame(() => composer.current?.focus()); }, []);
  const ask = useCallback((question: string) => { if (connected) sendQuestion(question); else void session.ask(question); }, [connected, sendQuestion, session]);
  /** Slash commands that open a view, a page or a local card (Session V Part 10); /log, /ask and /plan go on as messages. */
  const onCommand = useCallback((name: SlashName, rest: string, typed: string): boolean => {
    switch (name) {
      case '/help': session.say(typed, helpText()); return true;
      case '/review': setView('review'); return true;
      case '/insights': setView('insights'); return true;
      case '/pack': onClose(); if (/^\/app\/settings\/?$/.test(window.location.pathname)) window.location.hash = 'zigi-pack'; else router.push('/app/settings#zigi-pack'); return true;
      case '/remember': session.say(typed, rememberReply(rest)); return true;
      default: if (connected) return false; session.say(typed, NEEDS_AI); return true;
    }
  }, [connected, onClose, router, session]);
  const reader = useReadAloud(speechLanguage(data.voice.language, typeof navigator === 'undefined' ? undefined : navigator.language));
  useVisualViewportInsets(phone && open);
  // The page behind a phone sheet does not scroll (iOS scrolls the document behind a modal dialog otherwise).
  useEffect(() => { if (!(phone && open)) return; document.documentElement.dataset.aiSheet = ''; return () => { delete document.documentElement.dataset.aiSheet; }; }, [phone, open]);
  useEffect(() => {
    const d = dialog.current; if (!d) return;
    const inTab = open && !mini.win;
    if (inTab && !d.open) { if (phone) d.showModal(); else d.show(); nextFrame(() => composer.current?.focus({preventScroll: true})); }
    else if (!inTab && d.open) d.close();
  }, [open, phone, mini.win]);
  // ZIGi's button while the chat is in the mini window: back to the tab. The composer takes the focus where the chat is.
  useEffect(() => { if (open && mini.win) mini.backToTab(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- only a new open asks for the chat back
  useEffect(() => { if (mini.win) return nextFrame(() => composer.current?.focus({preventScroll: true})); }, [mini.win]);
  const popOut = async () => { if (await mini.popOut()) onClose(); else setNote('The mini window could not open here.'); };
  // Announced once per reply: when the wait starts, and when the reply has arrived.
  const replies = session.chat.turns.filter(t => t.role === 'assistant').length, lastStatus = useRef(session.status), lastReplies = useRef(replies);
  useEffect(() => { if (session.status === 'pending' && lastStatus.current === 'idle') setNote('Waiting for your AI to reply…'); lastStatus.current = session.status; }, [session.status]);
  // Session V Part 16: a browser AI agent's proposals arrive as cards in the chat view, announced once.
  const agentBatches = useAgentBatches(), announcedAgent = useRef(new Set<string>());
  useEffect(() => {
    const fresh = agentBatches.filter(b => !announcedAgent.current.has(b.id)); if (!fresh.length) return;
    for (const b of fresh) announcedAgent.current.add(b.id);
    const n = fresh.reduce((sum, b) => sum + b.proposals.length, 0);
    setView('chat'); setNote(`A browser AI agent proposed ${n === 1 ? 'one change' : `${n} changes`}. Nothing is written until you add a card.`);
  }, [agentBatches]);
  useEffect(() => {
    if (replies > lastReplies.current) { setNote('Your AI replied.'); if (data.voice.readAloud && open) { const last = [...session.chat.turns].reverse().find(t => t.role === 'assistant'); if (last) reader.speak(plainText(parseBlocks((session.parsed.get(last.id) ?? parseReply(last.text)).text))); } }
    lastReplies.current = replies;
  }, [replies, data.voice.readAloud, open, reader, session.chat.turns, session.parsed]);
  useEffect(() => { if (!open) reader.stop(); }, [open, reader]);
  useEffect(() => { const el = log.current; if (!el) return; if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight; }, [session.chat.turns.length, session.draft]);
  const trapTab = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if ((event.target as Element).closest?.('.ai-shortcuts')) return;
    if (event.key === '?' && !(event.target as Element).closest?.('textarea, input, select, [contenteditable="true"]')) { event.preventDefault(); setShortcuts(true); return; }
    // In the mini window Escape closes nothing: the window has its own close button.
    if (event.key === 'Escape' && !phone && !mini.win) { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const active = event.currentTarget.ownerDocument.activeElement;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null || el === active);
    const first = items[0], last = items[items.length - 1]; if (!first || !last) return;
    if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    else if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
  }, [onClose, phone, mini.win]);
  const shownDraft = useMemo(() => { if (!session.draft) return ''; const draft = stripHint(session.draft); if (hasOpenFence(draft)) { const at = draft.search(/(```+|~~~+)[^\S\n]*(?:json[^\S\n]+)?zigoals/i); return at >= 0 ? draft.slice(0, at) : draft; } return parseReply(draft).text; }, [session.draft]);
  const busy = session.status !== 'idle', area = context.area, lastAssistant = [...session.chat.turns].reverse().find(t => t.role === 'assistant'), lastAsked = lastQuestion(session.chat);
  const body = <>
    <header className="ai-chat-head">
      <ZigiAvatar state={zigi} size={40} decorative live/>
      <div className="ai-chat-identity">
        <h2 id={titleId} className="ai-chat-title"><NebulaFlow identity="ai-chat-title">ZIGi · your AI</NebulaFlow></h2>
        <p className="ai-chat-via"><span className="ai-chat-via-text">{hosted ? `${hosted.provider} · ${hosted.model} via ZIGoals hosted` : connected ? `via ${providerName} · ${data.model}` : bridge ? `with your ${subscriptionApp(data.subscriptionApp)?.name ?? 'subscription'} subscription` : 'not connected yet'}</span><span className="ai-chat-premium">{entitlement(hosted ? 'hosted' : 'your-ai').label}</span></p>
      </div>
      <button type="button" className="quiet ai-chat-close" onClick={mini.win ? mini.close : onClose} aria-label="Close ZIGi">×</button>
      <div className="ai-chat-tools" role="toolbar" aria-label="Chat tools">
        {connected && <ModelSwitcher settings={settings} scope={scope}/>}
        <button type="button" className="quiet" onClick={() => { session.startNew(); setView('chat'); composer.current?.focus(); }} aria-label="New chat" title="New chat">New</button>
        <button type="button" className="quiet" aria-pressed={view === 'history'} onClick={() => setView(v => v === 'history' ? 'chat' : 'history')} aria-label="Chat history" title="History">History</button>
        <button type="button" className="quiet" aria-pressed={view === 'customize'} onClick={() => setView(v => v === 'customize' ? 'chat' : 'customize')} aria-label="Customize ZIGi" title="Customize">Customize</button>
        <Link className="quiet" href={SETTINGS_HREF} onClick={onClose} aria-label="ZIGi settings" title="Settings">Settings</Link>
        {mini.win ? <button type="button" className="quiet" onClick={mini.backToTab} aria-label="Back to the tab" title="Back to tab">Back to tab</button>
          : !phone && <button type="button" className="quiet" onClick={() => setExpanded(e => !e)} aria-pressed={expanded} aria-label={expanded ? 'Shrink the chat' : 'Expand the chat'} title={expanded ? 'Shrink' : 'Expand'}>{expanded ? 'Shrink' : 'Expand'}</button>}
        {!phone && !mini.win && mini.supported && <button type="button" className="quiet" onClick={() => void popOut()} aria-label="Pop out ZIGi into a mini window" title="Pop out">Pop out</button>}
      </div>
    </header>
    {view === 'history' ? <HistoryView session={session} onOpen={() => setView('chat')}/>
      : view === 'continue' ? <ContinueView settings={data} session={session} context={context} attach={attach} sensitive={sensitive} phone={phone} onBack={() => setView('chat')}/>
      : view === 'chooser' ? <div className="ai-chat-log"><section className="ai-proactive-view" aria-label="Which setup fits me?"><header className="ai-proactive-head"><h3>Which setup fits me?</h3><button type="button" className="text-link" onClick={() => setView('chat')}>Back to the chat</button></header><Suspense fallback={<p className="ai-note" role="status">Loading…</p>}><SetupChooser/></Suspense></section></div>
      : view === 'customize' ? <div className="ai-chat-log"><section className="ai-proactive-view" aria-label="Customize ZIGi"><header className="ai-proactive-head"><h3>Customize ZIGi</h3><button type="button" className="text-link" onClick={() => setView('chat')}>Back to the chat</button></header><Suspense fallback={<p className="ai-note" role="status">Loading…</p>}><ZigiCustomize onNavigate={onClose}/></Suspense></section></div>
      : view === 'review' ? <div className="ai-chat-log"><ReviewView context={context} connected={connected} session={session} onBack={() => setView('chat')}/></div>
      : view === 'insights' ? <div className="ai-chat-log"><InsightsView context={context} connected={connected} session={session} onBack={() => setView('chat')}/></div> : <>
      <div ref={log} className="ai-chat-log" role="log" aria-label="Conversation" onScroll={event => { const el = event.currentTarget, far = el.scrollHeight - el.scrollTop - el.clientHeight > 160; if (!far) jumping.current = false; setAway(far && !jumping.current); }}>
        {!data.enabled && <NotConnected onClose={onClose} onChooser={() => setView('chooser')}/>}
        {localOnly && session.chat.turns.length === 0 && !sensitive && <LocalIntro context={context} session={session} onAsk={question => void session.ask(question)} onView={setView}/>}
        {bridge && <BridgeView settings={settings} context={context} attach={attach} sensitive={sensitive} phone={phone}/>}
        {connected && session.chat.turns.length === 0 && !busy && <Greeting context={context} session={session} sensitive={sensitive} onChip={sendQuestion} onView={setView}/>}
        {(connected || localOnly) && session.chat.turns.map((turn, i) => turn.role === 'assistant' && (turn.source === 'local' || turn.source === 'on-device')
          ? <LocalTurn key={turn.id} turn={turn} asked={session.chat.turns[i - 1]?.role === 'user' ? session.chat.turns[i - 1]!.text : ''} session={session} context={context} connected={connected} attach={attach} isLast={turn === lastAssistant && !busy} runner={runner} onNavigate={onClose} onAsk={ask}/>
          : <TurnView key={turn.id} turn={turn} session={session} runner={runner} providerName={providerName} usageUrl={provider?.usageUrl ?? null} isLast={turn === lastAssistant && !busy} onNavigate={onClose} reader={reader} context={context} deepModel={connected ? deepModel : null} fromPhoto={turn.role === 'assistant' && !!session.chat.turns[i - 1]?.attachments?.length} replaced={turn.role === 'assistant' && revisedAfter(session, i)}
            asked={session.chat.turns[i - 1]?.role === 'user' ? session.chat.turns[i - 1]!.text : ''} onAsk={ask} onContinue={() => setView('continue')} onEdit={turn.role === 'user' && !busy && turn === lastAsked ? () => startEdit(turn) : undefined}/>)}
        {!busy && <KnockOffer connected={data.enabled} sensitive={sensitive} chatEnded={session.chat.turns.some(t => t.role === 'assistant' && t.source !== 'local' && t.source !== 'on-device')} today={localDate()} connectedOn={data.connectedOn ?? null}/>}
        {!sensitive && <AgentProposals runner={runner} onNavigate={onClose}/>}
        {session.status === 'pending' && <div className="ai-pending" aria-hidden="true"><ZigiAvatar state="thinking" size={28} decorative/><span className="ai-pending-dots"><i/><i/><i/></span><span className="ai-pending-text">{!connected ? 'Asking Chrome’s on-device model…' : session.looking.length ? `ZIGi looked at ${session.looking.join(', ')}; waiting for ${providerName}…` : `Waiting for ${providerName}…`}</span></div>}
        {session.status === 'streaming' && session.looking.length > 0 && <p className="ai-note ai-looking" aria-hidden="true">ZIGi looked at {session.looking.join(', ')}</p>}
        {session.status === 'streaming' && <article className="ai-turn ai-turn-assistant ai-turn-live" aria-hidden="true"><ZigiAvatar state="speaking" size={28} decorative/><div className="ai-turn-body"><SafeText text={shownDraft}/></div></article>}
        {session.confirmation && <div className="ai-confirm" role="group" aria-label="This page's data is larger than your budget">
          <p>This page’s data is about {session.confirmation.fit.estimated.context.toLocaleString('en-US')} tokens; with the conversation that is {session.confirmation.fit.estimated.total.toLocaleString('en-US')}, above your budget of {session.confirmation.budget.toLocaleString('en-US')} (Settings → ZIGi · your AI → Context budget).</p>
          <div className="ai-card-actions"><button type="button" className="primary" onClick={() => void session.send(session.confirmation!.text, {...session.confirmation!.options, confirmed: true, spendConfirmed: true})}>Send anyway</button><button type="button" className="secondary" onClick={() => void session.send(session.confirmation!.text, {...session.confirmation!.options, confirmed: true, withContext: false, spendConfirmed: true})}>Send without page data</button><button type="button" className="text-link" onClick={session.cancelConfirmation}>Cancel</button></div>
        </div>}
        {session.spendCheck && <div className="ai-confirm" role="group" aria-label="Your monthly cap is reached">
          <p>{session.spendCheck.note} You asked ZIGi to check with you first (Settings → ZIGi · your AI → Usage).</p>
          <div className="ai-card-actions"><button type="button" className="primary" onClick={session.confirmSpend}>Send anyway</button><button type="button" className="text-link" onClick={session.cancelSpend}>Not now</button></div>
        </div>}
        {session.usageNote && <p className="ai-note ai-usage-note" role="status">{session.usageNote}</p>}
        {session.failure && <div className="ai-failure" role="alert"><p className="ai-failure-title">{session.failure.title}</p>{session.failure.steps.length > 0 && <ul>{session.failure.steps.map((step, i) => <li key={i}>{step}</li>)}</ul>}<div className="ai-card-actions">{['bad-key', 'missing-key', 'not-connected', 'model-missing', 'local-unreachable', 'cors'].includes(session.failure.kind) && <Link className="secondary" href={SETTINGS_HREF} onClick={onClose}>Open Settings</Link>}<button type="button" className="text-link" onClick={session.dismissFailure}>Dismiss</button></div></div>}
        {session.saveNote && <p className="ai-note" role="status">{session.saveNote}</p>}
      </div>
      {away && session.chat.turns.length > 0 && <div className="ai-jump-holder"><button type="button" className="ai-jump-latest" onClick={() => { const el = log.current; jumping.current = true; if (el) el.scrollTop = el.scrollHeight; setAway(false); composer.current?.focus({preventScroll: true}); }}>Jump to the latest message</button></div>}
      {connected && <ContextBar context={context} attach={attach} onAttach={setAttach} sensitive={sensitive} total={conversationTokens(session.chat.turns)} question={question} onRemove={id => setRemoved(current => new Set([...current, id]))} modeLine={dataLine}/>}
      {/* One composer for both modes, so a starting sentence ("Ask ZIGi about this") survives the settings loading. */}
      {(connected || (localOnly && !sensitive)) && <Composer ref={composer} session={session} attach={connected && attach} phone={phone} settings={data} scope={scope} local={!connected} onDraft={connected ? setDraft : undefined} onSend={connected ? sendQuestion : undefined} onAbout={connected ? onAbout : undefined} photo={photo} providerName={providerName} onCommand={onCommand} editing={editing} onEditing={setEditing} placeholder={!connected ? 'Ask about your records: answered here, no AI' : phone ? `Ask, or say what to log…` : `Ask about ${AREA_LABELS[area]}, or say what to log…`}/>}
    </>}
    <p className="ai-sr-only" role="status" aria-live="polite">{note}</p>
    <ShortcutsSheet open={shortcuts} onClose={() => setShortcuts(false)}/>
  </>;
  return <>
    <dialog ref={dialog} data-ai-dialog="" className={`ai-chat${expanded && !phone ? ' ai-chat-expanded' : ''}${phone ? ' ai-chat-phone' : ''}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (event.target === event.currentTarget) onClose(); }} onKeyDown={trapTab} onClick={event => { if (phone && event.target === event.currentTarget) onClose(); }}>
      {!mini.win && body}
    </dialog>
    {mini.win && createPortal(<>
      <section className="ai-chat ai-chat-pip" aria-labelledby={titleId} onKeyDown={trapTab} inert={sensitive}>{body}</section>
      {sensitive && <div className="ai-pip-paused" role="status"><p>Paused while a private screen is open in the tab. ZIGi shows and reads nothing until you leave it.</p></div>}
    </>, mini.win.document.body)}
  </>;
}
function Greeting({context, session, sensitive, onChip, onView}: {context: ReturnType<typeof useAiContext>; session: ChatSession; sensitive: boolean; onChip: (chip: string) => void; onView: (view: ProactiveView) => void}) {
  return <div className="ai-greeting"><ZigiAvatar state="greeting" size={72} decorative/><div className="ai-greeting-body"><p className="ai-greeting-text">Hi, I’m ZIGi. I read this page with your permission and answer with your own AI. Nothing is written unless you add a card.</p>
    {!sensitive && <BriefBlock context={context} connected session={session}/>}
    {sensitive ? <div className="ai-chips" role="group" aria-label="Suggestions">{SPECIALISTS[context.area].chips.map(chip => <button key={chip} type="button" className="ai-chip" onClick={() => onChip(chip)}>{chip}</button>)}</div> : <ProactiveChips context={context} connected onChip={onChip} onView={onView}/>}
    {!sensitive && <ProactiveEntries onView={onView}/>}
    <FirstRunTips/>
  </div></div>;
}
function NotConnected({onClose, onChooser}: {onClose: () => void; onChooser: () => void}) {
  return <div className="ai-greeting ai-not-connected"><ZigiAvatar state="attention" size={72} decorative/><div><p className="ai-greeting-text">Connect your own AI to start: an API key, a local model on this computer, or the subscription bridge. Prompts, replies and keys travel from this browser straight to your provider; ZIGoals never sees them.</p><div className="ai-card-actions"><Link className="primary" href={SETTINGS_HREF} onClick={onClose}>Set up in Settings</Link><button type="button" className="secondary" onClick={onChooser}>Which setup fits me?</button></div></div></div>;
}
/** Before any AI is connected: what ZIGi answers here from the records, as examples to tap (Session V Part 3). */
function LocalIntro({context, session, onAsk, onView}: {context: ReturnType<typeof useAiContext>; session: ChatSession; onAsk: (question: string) => void; onView: (view: ProactiveView) => void}) {
  const examples = useMemo(() => { const sources = context.toolSources(); return examplesFor(sources ? toolEnv(sources, context.gates, 'local') : null, 4); }, [context]);
  return <div className="ai-local-intro"><BriefBlock context={context} connected={false} session={session}/><p className="ai-greeting-text">Meanwhile, ZIGi answers questions about your own records right here, on this device, with no AI: nothing is sent anywhere.</p><div className="ai-chips" role="group" aria-label="Questions ZIGi answers here">{examples.map(e => <button key={e} type="button" className="ai-chip" onClick={() => onAsk(e)}>{e}</button>)}</div><ProactiveEntries onView={onView}/><FirstRunTips/></div>;
}
/** The records behind a local answer, recomputed now from this device's records and shown exactly. */
function RecordsUsed({calls, context}: {calls: readonly {tool: string; args?: Record<string, unknown>; label: string}[]; context: ReturnType<typeof useAiContext>}) {
  const [results, setResults] = useState<ToolResult[] | null>(null);
  const load = () => { const sources = context.toolSources(); if (!sources) { setResults([]); return; } const env = toolEnv(sources, context.gates, 'local'); setResults(calls.map(c => runTool(c.tool, c.args ?? {}, env))); };
  return <details className="ai-context-preview ai-records" onToggle={event => { if (event.currentTarget.open) load(); }}>
    <summary>Records used</summary>
    {results && results.length === 0 && <p className="ai-note">Nothing is read on this screen.</p>}
    {results?.map((r, i) => <div key={i} className="ai-record"><p className="ai-record-source">{r.ok ? r.provenance : r.label}</p><pre>{r.ok ? JSON.stringify(r.data, null, 1).slice(0, 4000) : r.refusal}</pre></div>)}
    {results && results.length > 0 && <p className="ai-note">Recomputed now from the records on this device.</p>}
  </details>;
}
function LocalTurn({turn, asked, session, context, connected, attach, isLast, runner, onNavigate, onAsk}: {turn: ChatTurn; asked: string; session: ChatSession; context: ReturnType<typeof useAiContext>; connected: boolean; attach: boolean; isLast: boolean; runner: ReturnType<typeof useProposals>; onNavigate: () => void; onAsk: (question: string) => void}) {
  const [copied, setCopied] = useState(false), [preview, setPreview] = useState<string | null>(null);
  // Session V Part 10: a /remember card rides in the turn's own text, read by the same whitelist parser as a reply.
  const parsed = session.parsed.get(turn.id), shown = parsed?.text ?? turn.text;
  const info = session.localFor(turn.id), calls = useMemo(() => (turn.tools ?? []).map(c => ({tool: c.tool, args: c.args ?? {}, label: c.label})), [turn.tools]), question = info?.question ?? asked;
  const reply = info?.reply;
  const chips = isLast && reply ? reply.kind === 'choices' ? reply.choices.map(c => ({label: c.label, run: () => session.choose(question, c)}))
    : reply.kind === 'refusal' && reply.choices ? reply.choices.map(c => ({label: c.label, run: () => session.choose(question, c)}))
    : reply.kind === 'examples' ? reply.examples.map(e => ({label: e, run: () => void session.ask(e)})) : [] : [];
  // Session V Part 15: an answer made with Chrome's on-device model says so; it stays on this device like a lookup.
  const label = turn.source === 'on-device' ? ON_DEVICE_LABEL : LOCAL_LABEL;
  const copy = () => { copyText(`${shown}\n\n${label}`).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => undefined); };
  return <article className="ai-turn ai-turn-assistant ai-turn-local" aria-label={turn.source === 'on-device' ? 'Answer from Chrome’s on-device model, on this device' : 'Answer from ZIGi, made on this device'}>
    <ZigiAvatar state="idle" size={28} decorative/>
    <div className="ai-turn-body">
      <SafeText className="ai-local-answer" text={shown}/>
      {parsed && parsed.proposals.length > 0 && <ProposalList proposals={parsed.proposals} rejected={parsed.rejected} handles={[]} runner={runner} onNavigate={onNavigate}/>}
      <DataViz results={info?.results}/>
      {chips.length > 0 && <div className="ai-chips" role="group" aria-label={reply?.kind === 'examples' ? 'Questions ZIGi answers here' : 'Which one?'}>{chips.map(c => <button key={c.label} type="button" className="ai-chip" onClick={c.run}>{c.label}</button>)}</div>}
      {calls.length > 0 && <RecordsUsed calls={calls} context={context}/>}
      {connected && calls.length > 0 && question && <details className="ai-context-preview" onToggle={event => { if (event.currentTarget.open) setPreview(session.moreText(calls)?.text ?? null); }}>
        <summary>What your AI sees if you ask for more</summary>
        <p className="ai-note">Your question, these records{attach ? ' and this page’s data' : ''}, sent to your AI only when you choose “Ask my AI for more”.</p>
        {preview && <pre>{preview}</pre>}
      </details>}
      {isLast && calls.length > 0 && <FollowupChips calls={calls} asked={question} onAsk={onAsk}/>}
      <footer className="ai-turn-meta">
        <span className="ai-turn-label">{label}</span>
        <TurnTime at={turn.at}/>
        <span className="ai-turn-actions"><button type="button" className="text-link" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>{connected && calls.length > 0 && question && <button type="button" className="text-link" onClick={() => void session.askMore(question, calls, {withContext: attach})}>Ask my AI for more</button>}</span>
      </footer>
    </div>
  </article>;
}
/** Session V Part 6: which way the data travels with the next message, for the context bar; null when nothing would. */
function modeLine(options: AiOptions, tool: {capability: Parameters<typeof dataMode>[1]; fellBack: boolean}, attach: boolean, context: ReturnType<typeof useAiContext>): string | null {
  if (!attach || !context.attaches || !Object.values(context.gates.areas).some(Boolean)) return null;
  const mode = dataMode(options.toolMode, tool.capability, tool.fellBack);
  if (mode !== 'tools') return dataModeLine(mode, tool.fellBack);
  const sources = context.toolSources();
  return dataModeLine(mode, false, sources ? toolListTokens(toolsFor(toolEnv(sources, context.gates, 'provider'))) : undefined);
}
/** "ZIGi looked at": each lookup the person's AI asked for in this reply, and the exact text it got back. */
function LookedAt({turn, session, context}: {turn: ChatTurn; session: ChatSession; context: ReturnType<typeof useAiContext>}) {
  const [shown, setShown] = useState<{label: string; text: string}[] | null>(null), [recomputed, setRecomputed] = useState(false);
  const calls = turn.tools ?? [];
  if (!calls.length) return null;
  const load = () => {
    const kept = session.lookupsFor(turn.id);
    if (kept) { setShown(kept.map(l => ({label: l.label, text: l.text}))); setRecomputed(false); return; }
    // After a reload the results are not kept: they are made again now, under the gate that applies now.
    const sources = context.toolSources();
    if (!sources) { setShown([]); setRecomputed(true); return; }
    const env = toolEnv(sources, context.gates, 'provider');
    setShown(calls.map(c => ({label: c.label, text: toolText(runTool(c.tool, c.args ?? {}, env), env)}))); setRecomputed(true);
  };
  return <div className="ai-looked" role="group" aria-label="ZIGi looked at">
    <span className="ai-question-label">ZIGi looked at:</span>
    {calls.map((c, i) => <span key={i} className="ai-source-chip ai-looked-chip">{c.label}</span>)}
    <details className="ai-context-preview" onToggle={event => { if (event.currentTarget.open) load(); }}>
      <summary>What ZIGi sent to your AI</summary>
      {shown && shown.length === 0 && <p className="ai-note">Nothing is read on this screen.</p>}
      {shown?.map((l, i) => <div key={i} className="ai-record"><p className="ai-record-source">{l.label}</p><pre>{l.text}</pre></div>)}
      {shown && shown.length > 0 && recomputed && <p className="ai-note">Made again now from the records on this device, under your current settings; the reply itself is unchanged.</p>}
    </details>
  </div>;
}
/** Session X-Local Part 5a: whether the assistant reply after turn `i` is a correction ("revise": true) of this one. */
function revisedAfter(session: ChatSession, i: number): boolean {
  const next = session.chat.turns.slice(i + 1).find(t => t.role === 'assistant');
  return !!next && (session.parsed.get(next.id)?.revise ?? parseReply(next.text).revise ?? false);
}
function TurnView({turn, session, runner, providerName, usageUrl, isLast, onNavigate, reader, context, deepModel, fromPhoto = false, replaced = false, asked, onAsk, onContinue, onEdit}: {turn: ChatTurn; session: ChatSession; runner: ReturnType<typeof useProposals>; providerName: string; usageUrl: string | null; isLast: boolean; onNavigate: () => void; reader: ReturnType<typeof useReadAloud>; context: ReturnType<typeof useAiContext>; deepModel: string | null; fromPhoto?: boolean; replaced?: boolean; asked: string; onAsk: (question: string) => void; onContinue: () => void; onEdit?: () => void}) {
  const [copied, setCopied] = useState(false);
  // "Edit" sits just after the message, not inside it: the message stays only the person's own words.
  if (turn.role === 'user') return <><article className="ai-turn ai-turn-user" aria-label="You"><div className="ai-turn-body"><p>{turn.text}</p><CareNote text={turn.text}/>{turn.attachments?.some(a => a.kind === 'photo') && <p className="ai-note ai-turn-attachment">📷 A meal photo went with this message to your AI; ZIGoals did not keep it.</p>}</div></article>
    {onEdit && <p className="ai-turn-extras ai-turn-edit"><button type="button" className="text-link" aria-label="Edit your last message" onClick={onEdit}>Edit</button></p>}</>;
  const parsed = session.parsed.get(turn.id) ?? parseReply(turn.text), usage = usageLine(turn.usage ?? null);
  const copy = () => { copyText(plainText(parseBlocks(parsed.text))).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => undefined); };
  const label = turn.source === 'hosted' ? HOSTED_LABEL(providerName.replace(/ via ZIGoals hosted$/, '').replace(/^your AI$/, 'the provider ZIGoals uses')) : ANSWER_LABEL(turn.provider && turn.provider !== 'local' ? PROVIDERS[turn.provider].name : providerName);
  return <article className="ai-turn ai-turn-assistant" aria-label="Reply">
    <ZigiAvatar state="idle" size={28} decorative/>
    <div className="ai-turn-body">
      {parsed.text && <SafeText text={parsed.text}/>}
      <LookedAt turn={turn} session={session} context={context}/>
      <DataViz results={session.lookupsFor(turn.id)?.map(l => l.result)}/>
      {(parsed.proposals.length > 0 || parsed.rejected.length > 0) && <ProposalList proposals={parsed.proposals} rejected={parsed.rejected} handles={session.handlesFor(turn.id)} runner={runner} onNavigate={onNavigate} fromPhoto={fromPhoto} replaced={replaced}/>}
      {isLast && turn.tools && turn.tools.length > 0 && <FollowupChips calls={turn.tools} asked={asked} onAsk={onAsk}/>}
      <footer className="ai-turn-meta">
        <span className="ai-turn-label">{label}</span>
        <TurnTime at={turn.at}/>
        {usage && <span className="ai-turn-usage">{usage}{usageUrl && <> · <a href={usageUrl} target="_blank" rel="noopener noreferrer">usage at {providerName} ↗</a></>}</span>}
        {turn.mode === 'deep' && <span className="ai-turn-deep">Thought deeper with {turn.model}</span>}
        {turn.stopped && <span className="ai-turn-stopped">{turn.stopped}</span>}
        <span className="ai-turn-actions"><button type="button" className="text-link" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>{reader.supported && (reader.speaking ? <button type="button" className="text-link" onClick={reader.stop}>Stop reading</button> : <button type="button" className="text-link" onClick={() => reader.speak(plainText(parseBlocks(parsed.text)))}>Read aloud</button>)}{isLast && <button type="button" className="text-link" onClick={() => void session.regenerate()}>Regenerate</button>}{isLast && deepModel && deepModel !== turn.model && <button type="button" className="text-link" onClick={() => void session.thinkDeeper()} title={`Ask again with ${deepModel} and more of your records`}>Think deeper</button>}</span>
      </footer>
      <div className="ai-turn-extras">
        <FeedbackButtons value={turn.feedback} onChange={value => session.setFeedback(turn.id, value)}/>
        <CopyMarkdown text={turnMarkdown({...turn, text: parsed.text}, label)}/>
        {isLast && <button type="button" className="text-link" onClick={onContinue}>Continue in my AI</button>}
      </div>
    </div>
  </article>;
}
/** The conversation's running token total from the provider's own counts (tokens only, never money); null until a provider reported any. */
export function conversationTokens(turns: readonly ChatTurn[]): {input: number; output: number} | null {
  let input = 0, output = 0, any = false;
  for (const turn of turns) { if (turn.role !== 'assistant' || !turn.usage) continue; if (turn.usage.input !== null) { input += turn.usage.input; any = true; } if (turn.usage.output !== null) { output += turn.usage.output; any = true; } }
  return any ? {input, output} : null;
}
function QuestionSources({question, onRemove}: {question: QuestionContext | null; onRemove: (id: string) => void}) {
  if (!question || (!question.sources.length && !question.withheld.length)) return null;
  return <div className="ai-question-sources" role="group" aria-label="Records ZIGi chose for this question">
    {question.sources.length > 0 && <span className="ai-question-label">For this question:</span>}
    {question.sources.map(s => <span key={s.id} className="ai-source-chip">{s.label}<button type="button" onClick={() => onRemove(s.id)} aria-label={`Leave out ${s.label}`} title="Leave out">×</button></span>)}
    {question.withheld.map(w => <span key={w} className="ai-note ai-question-withheld">Not included: {w}</span>)}
  </div>;
}
function ContextBar({context, attach, onAttach, sensitive, total, question, onRemove, modeLine}: {context: ReturnType<typeof useAiContext>; attach: boolean; onAttach: (value: boolean) => void; sensitive: boolean; total: {input: number; output: number} | null; question: QuestionContext | null; onRemove: (id: string) => void; modeLine: string | null}) {
  const label = AREA_LABELS[context.area], barId = useId();
  const totalLine = total ? <span className="ai-context-total" role="note" aria-label="Tokens so far in this conversation">{total.input.toLocaleString('en-US')} in · {total.output.toLocaleString('en-US')} out tokens so far</span> : null;
  if (!context.attaches) return <div className="ai-context-bar"><span>No page data is read on Settings.</span>{totalLine}</div>;
  if (sensitive) return <div className="ai-context-bar"><span>Paused on this private screen: nothing is read from the page.</span>{totalLine}</div>;
  const questionPreview = question?.text ? <><p className="ai-note">And the records ZIGi chose for this question:</p><pre>{question.text}</pre></> : null;
  if (!context.consent.page) return <div className="ai-context-bar"><span>Not sharing {label} data. {context.consent.reasons[0] ?? ''}</span>{modeLine && <span className="ai-note ai-data-mode">{modeLine}</span>}<QuestionSources question={question} onRemove={onRemove}/>{questionPreview && <details className="ai-context-preview"><summary>What your AI sees</summary>{questionPreview}</details>}{totalLine}</div>;
  return <div className="ai-context-bar">
    {/* Session V Part 16: a stable name for the switch; the area and its size are its description. */}
    <label className="ai-context-switch"><input type="checkbox" checked={attach} onChange={e => onAttach(e.target.checked)} aria-labelledby={`${barId}-name`} aria-describedby={context.preview ? `${barId}-size` : undefined}/><span><span id={`${barId}-name`}>Share this page’s data</span>{context.preview && <> · <span id={`${barId}-size`}>{`${label}${context.consent.health && context.area !== 'health' ? ' + Health' : ''} · about ${context.preview.estimatedTokens.toLocaleString('en-US')} tokens`}</span></>}</span></label>
    {modeLine && <span className="ai-note ai-data-mode">{modeLine}</span>}
    <QuestionSources question={question} onRemove={onRemove}/>
    {((attach && context.preview) || questionPreview) && <details className="ai-context-preview"><summary>What your AI sees</summary>{attach && context.preview && <><p>{context.preview.summary}</p>{context.preview.omitted.length > 0 && <p className="ai-note">Not included: {context.preview.omitted.join(', ')}.</p>}<pre>{context.preview.text}</pre></>}{questionPreview}</details>}
    {attach && !context.preview && context.ready && <span className="ai-note">Nothing to share on this page yet.</span>}
    {totalLine}
  </div>;
}
import {forwardRef} from 'react';
/**
 * What the composer sends besides the words (Session V Part 7): a meal photo for this message, and "talk to log";
 * Part 10: /ask (no on-device answer), /plan (plan cards), and the last question being edited (`replace`).
 */
export type ComposerExtra = {images?: readonly ChatImage[]; log?: boolean; direct?: boolean; plan?: boolean; replace?: string};
/** The last question put back in the composer to be edited (Session V Part 10); `seq` tells two edits of one turn apart. */
type Editing = {id: string; text: string; seq: number};
const NEEDS_AI = 'This command needs your own AI connected (Settings → ZIGi · your AI). Here, ZIGi answers questions about your records on this device, with no AI.';
/** /remember: the person's words as a "Remember this?" card, in the same action block an AI reply would use (Session V Part 10). */
function rememberReply(rest: string): string {
  if (!rest) return 'Type what ZIGi should remember after /remember, for example: /remember I train before work.';
  const parsed = actionSchema.safeParse({kind: 'remember', text: rest});
  if (!parsed.success) return 'That is too long to keep as one note: 500 characters at most.';
  // Backticks are escaped inside the block (JSON's \u0060), so the words can never close it early.
  const json = JSON.stringify(parsed.data).replace(/`/g, '\\u0060');
  return `Here is your note as a card: nothing is kept until you add it.\n\n\`\`\`zigoals-action\n${json}\n\`\`\``;
}
const Composer = forwardRef<HTMLTextAreaElement, {session: ChatSession; attach: boolean; phone: boolean; settings: AiSettings; scope: string; placeholder: string; local: boolean; onDraft?: (text: string) => void; onSend?: (text: string, extra: ComposerExtra) => void; onAbout?: (about: AskAbout | undefined) => void; photo?: PhotoAllowance; providerName?: string;
  onCommand: (name: SlashName, rest: string, typed: string) => boolean; editing: Editing | null; onEditing: (editing: Editing | null) => void}>(function Composer({session, attach, phone, settings, scope, placeholder, local, onDraft, onSend, onAbout, photo, providerName = 'your AI', onCommand, editing, onEditing}, ref) {
  const [text, setText] = useState(''), [disclosed, setDisclosed] = useState(false), listId = useId();
  // Session V Part 10: an edit puts the last question back in the box; the "/" list helps with the commands.
  const editSeq = editing?.seq;
  useEffect(() => { if (editing) setText(editing.text); }, [editSeq]); // eslint-disable-line react-hooks/exhaustive-deps -- a new edit, not every render
  const slash = useSlashMenu(text, (command: SlashCommand) => setText(command.takesText ? `${command.name} ` : command.name));
  // A page's ask fills the composer; the records behind a number (Part 9) go to the panel as a removable chip.
  const aboutRef = useRef(onAbout); useEffect(() => { aboutRef.current = onAbout; });
  useEffect(() => { const pending = takePendingAsk(); if (pending) { setText(pending.text); aboutRef.current?.(pending.about); } const onAsk = (event: Event) => { const detail = (event as CustomEvent<{text: string; about?: AskAbout}>).detail; if (detail?.text) { takePendingAsk(); setText(detail.text); aboutRef.current?.(detail.about); } }; window.addEventListener(ASK_EVENT, onAsk); return () => window.removeEventListener(ASK_EVENT, onAsk); }, []);
  const voice = useVoice({settings, scope, onText: useCallback((words: string) => setText(current => `${current.trim()}${current.trim() ? ' ' : ''}${words}`), [])});
  const busy = session.status !== 'idle', talking = voice.state !== 'idle';
  // Session V Part 7: one meal photo per message (only with a model that reads photos and Health shared), and log mode.
  const [attached, setAttached] = useState<Photo | null>(null), [photoNote, setPhotoNote] = useState(''), [logMode, setLogMode] = useState(false), file = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => attached ? URL.createObjectURL(attached.preview) : null, [attached]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const photosAllowed = !local && photo?.allowed === true;
  useEffect(() => { if (!photosAllowed) setAttached(null); }, [photosAllowed]);
  const takePhoto = useCallback(async (blob: Blob | null | undefined) => {
    if (!blob || !photosAllowed) return;
    setPhotoNote('Preparing the photo…');
    try { setAttached(await preparePhoto(blob)); setPhotoNote(''); } catch (error) { setAttached(null); setPhotoNote(error instanceof Error ? error.message : 'This photo could not be read here.'); }
  }, [photosAllowed]);
  // The question's records follow the words after a short pause in typing (Session V Part 4).
  useEffect(() => { if (!onDraft) return; const t = window.setTimeout(() => onDraft(text), 300); return () => window.clearTimeout(t); }, [text, onDraft]);
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    let value = text.trim(), log = logMode, direct = false, plan = false;
    // Slash commands (Session V Part 10): some open a view or make a local card; /log, /ask and /plan shape the message.
    const command = parseSlash(value);
    if (command && onCommand(command.command.name, command.rest, value)) { setText(''); onEditing(null); return; }
    if (command?.command.name === '/log') { log = true; value = command.rest; }
    else if (command?.command.name === '/ask') { direct = true; value = command.rest; }
    else if (command?.command.name === '/plan') { plan = true; value = command.rest; }
    if (!value && !attached) return;
    if (!value) value = 'Log this meal from the photo.';
    const extra: ComposerExtra = {...(attached ? {images: [{mime: attached.mime, data: attached.data}]} : {}), ...(log ? {log: true} : {}), ...(direct ? {direct: true} : {}), ...(plan ? {plan: true} : {}), ...(editing ? {replace: editing.id} : {})};
    setText(''); setAttached(null); setPhotoNote(''); onEditing(null);
    if (onSend) onSend(value, extra); else void session.ask(value, {withContext: attach, ...extra});
  };
  const mic = voice.mode !== 'off' && !local;
  const micLabel = voice.state === 'listening' ? 'Stop listening' : voice.state === 'recording' ? `Stop recording${voice.secondsLeft !== null ? ` (${voice.secondsLeft} s left)` : ''}` : voice.state === 'transcribing' ? 'Transcribing…' : voice.mode === 'browser' ? 'Speak (browser speech recognition)' : 'Speak (recorded, transcribed by your provider)';
  const toggleMic = () => { setDisclosed(true); if (talking) voice.stop(); else void voice.start(); };
  // Phones: hold to talk and release to stop, or tap once to start and once to stop (a press shorter than 300 ms is a tap).
  const pressStart = useRef<number | null>(null), tapped = useRef(false);
  const onMicDown = () => { setDisclosed(true); pressStart.current = Date.now(); if (talking && tapped.current) { tapped.current = false; voice.stop(); pressStart.current = null; return; } if (!talking) { tapped.current = false; void voice.start(); } };
  const onMicUp = () => { const started = pressStart.current; pressStart.current = null; if (started === null) return; if (Date.now() - started < 300) { tapped.current = true; return; } if (talking) voice.stop(); };
  return <form className="ai-composer-wrap" onSubmit={submit}
    onDragOver={photosAllowed && !phone ? e => { if ([...e.dataTransfer.items].some(i => i.kind === 'file' && i.type.startsWith('image/'))) e.preventDefault(); } : undefined}
    onDrop={photosAllowed && !phone ? e => { const image = [...e.dataTransfer.files].find(f => f.type.startsWith('image/')); if (image) { e.preventDefault(); void takePhoto(image); } } : undefined}>
    {voice.disclosure && (disclosed || talking) && <p className="ai-note ai-voice-disclosure" role="status">{voice.disclosure}</p>}
    {(voice.interim || voice.state === 'transcribing') && <p className="ai-note ai-voice-interim" aria-live="polite">{voice.state === 'transcribing' ? 'Transcribing…' : voice.interim}</p>}
    {voice.error && <p className="ai-card-error" role="alert">{voice.error}</p>}
    {!local && <div className="ai-composer-modes">
      <button type="button" className={`ai-chip ai-log-mode${logMode ? ' ai-log-mode-on' : ''}`} aria-pressed={logMode} onClick={() => setLogMode(on => !on)} title="Say or type what you ate, drank or did; ZIGi answers with cards to confirm">Log mode</button>
      {logMode && <span className="ai-note">Log mode: say or type what you ate, drank or did. Your words stay editable; ZIGi answers with cards, nothing is written until you add them.</span>}
    </div>}
    {attached && previewUrl && <div className="ai-photo-chip" role="group" aria-label="Meal photo attached">
      {/* A local blob preview of the downscaled photo: next/image has nothing to optimise here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewUrl} alt="Your meal photo, as it will be sent" width={48} height={Math.round(48 * attached.height / attached.width)}/>
      <span className="ai-note">Sent with this message to {providerName} only, then forgotten; ZIGoals does not keep it. {attached.width}×{attached.height}</span>
      <button type="button" className="text-link" onClick={() => setAttached(null)}>Remove the photo</button>
    </div>}
    {photoNote && <p className="ai-note" role="status">{photoNote}</p>}
    {editing && <p className="ai-editing">Editing your last message: sending it replaces the question and its answer. <button type="button" className="text-link" onClick={() => { setText(''); onEditing(null); }}>Cancel editing</button></p>}
    {slash.open && <SlashMenu id={listId} suggestions={slash.suggestions} active={slash.active} onPick={command => { slash.pick(command); (ref as {current: HTMLTextAreaElement | null} | null)?.current?.focus(); }}/>}
    <div className="ai-composer">
      <textarea ref={ref} value={text} onChange={e => setText(e.target.value)} onFocus={() => zigiSignals.emit('user_typing_started')} onBlur={() => zigiSignals.emit('user_typing_stopped')} rows={1} maxLength={20_000} placeholder={logMode ? 'What did you eat, drink or do?' : placeholder} aria-label={local ? 'Ask ZIGi about your records' : 'Message to your AI'} autoComplete="off"
        aria-autocomplete="list" aria-controls={slash.open ? listId : undefined} aria-activedescendant={slash.open ? `${listId}-${slash.active}` : undefined}
        onKeyDown={e => {
          if (slash.onKeyDown(e)) return;
          // ↑ in an empty box: the last question, to edit and send again (Session V Part 10).
          if (e.key === 'ArrowUp' && !text && !busy) { const last = lastQuestion(session.chat); if (last) { e.preventDefault(); onEditing({id: last.id, text: last.text, seq: Date.now()}); } return; }
          if (e.key === 'Escape' && editing) { e.preventDefault(); e.stopPropagation(); setText(''); onEditing(null); return; }
          if (e.key === 'Enter' && !e.shiftKey && !phone) { e.preventDefault(); submit(); }
        }}
        onPaste={photosAllowed ? e => { const image = [...e.clipboardData.files].find(f => f.type.startsWith('image/')); if (image) { e.preventDefault(); void takePhoto(image); } } : undefined}/>
      {photosAllowed && <>
        <input ref={file} type="file" accept="image/*" capture={phone ? 'environment' : undefined} hidden tabIndex={-1} aria-hidden="true" onChange={e => { void takePhoto(e.target.files?.[0]); e.target.value = ''; }}/>
        <button type="button" className="secondary ai-photo" aria-label="Add a meal photo" title="Add a meal photo (sent only to your AI, not kept)" onClick={() => file.current?.click()}><span aria-hidden="true">📷</span></button>
      </>}
      {mic && <button type="button" className={`secondary ai-mic${talking ? ' ai-mic-on' : ''}`} aria-label={micLabel} title={micLabel} aria-pressed={talking} disabled={!voice.available || voice.state === 'transcribing'} onClick={!phone ? toggleMic : undefined}
        onPointerDown={phone ? onMicDown : undefined} onPointerUp={phone ? onMicUp : undefined} onPointerCancel={phone ? () => { pressStart.current = null; voice.cancel(); } : undefined} onKeyDown={phone ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMic(); } } : undefined}>
        <span aria-hidden="true">{talking ? '■' : '🎙'}</span></button>}
      {busy ? <button type="button" className="secondary" onClick={session.stop}>Stop</button> : <button type="submit" className="primary" disabled={!text.trim() && !attached}>{logMode ? 'Log' : 'Send'}</button>}
    </div>
    {phone && mic && voice.available && <p className="ai-note">Hold the microphone to talk and release to stop, or tap once to start and once to stop.</p>}
  </form>;
});
/** Session V Part 11: careful mode travels in the copied prompt too, as its own paragraph. */
const careFor = (question: string) => { const risk = detectRisk(question); return risk ? carefulNote(risk) : ''; };
function BridgeView({settings, context, attach, sensitive, phone}: {settings: AiSettingsStore; context: ReturnType<typeof useAiContext>; attach: boolean; sensitive: boolean; phone: boolean}) {
  const [question, setQuestion] = useState(''), [status, setStatus] = useState(''), [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set()), app = subscriptionApp(settings.data.subscriptionApp);
  const typed = useDeferredValue(question);
  // The records chosen from the question (removable), and, for a lookup, the answer made here with no AI at all.
  const chosen = useMemo(() => sensitive ? null : questionContext(typed, context.toolSources(), context.gates, context.context?.handles ?? [], removed), [typed, sensitive, context, removed]);
  const local = useMemo(() => { const sources = sensitive || typed.trim().length < 3 ? null : context.toolSources(); if (!sources) return null; const reply = localAnswer(typed, toolEnv(sources, context.gates, 'local')); return reply.kind === 'answer' ? reply : null; }, [typed, sensitive, context]);
  const prompt = useMemo(() => bridgePrompt({context: attach && !sensitive ? context.context : null, question: typed || '(your question)', customInstructions: settings.data.customInstructions, questionData: chosen?.text ?? '', careful: careFor(typed)}), [attach, sensitive, context.context, typed, settings.data.customInstructions, chosen]);
  // Built again at the click from the words as they stand, with the chips the person kept: exactly what is copied.
  const copy = () => { const fresh = sensitive ? null : questionContext(question, context.toolSources(), context.gates, context.context?.handles ?? [], removed); copyText(bridgePrompt({context: attach && !sensitive ? context.context : null, question: question || '(your question)', customInstructions: settings.data.customInstructions, questionData: fresh?.text ?? '', careful: careFor(question)})).then(() => setStatus(`Copied. Paste it into ${app?.name ?? 'your AI'}.`)).catch(() => setStatus('Copying was not allowed here; select the text below and copy it yourself.')); };
  return <div className="ai-bridge">
    <p className="ai-greeting-text">A {app?.name ?? 'consumer'} subscription has no connection a browser app may use, so ZIGoals writes the prompt for you: copy it, open {app?.name ?? 'your AI'}, paste. Nothing is sent from here.</p>
    <label className="field">Your question<textarea value={question} onChange={e => { setQuestion(e.target.value); setRemoved(new Set()); }} rows={3} maxLength={5000}/></label>
    <CareNote text={typed}/>
    <QuestionSources question={chosen} onRemove={id => setRemoved(current => new Set([...current, id]))}/>
    {local && <div className="ai-bridge-local"><SafeText className="ai-local-answer" text={local.text}/><p className="ai-turn-meta"><span className="ai-turn-label">{LOCAL_LABEL}</span></p></div>}
    <div className="ai-card-actions"><button type="button" className="primary" onClick={copy} disabled={!question.trim()}>Copy for my AI</button>{app && <a className="secondary" href={app.url} target="_blank" rel="noopener noreferrer">Open {app.name} ↗</a>}{app && !phone && <button type="button" className="secondary" onClick={() => openSideBySide(app.url)}>Open {app.name} side by side</button>}</div>
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

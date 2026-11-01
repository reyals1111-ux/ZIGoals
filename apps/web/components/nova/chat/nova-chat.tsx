'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent} from 'react';
import {hasOpenFence, parseReply} from '../../../lib/ai/actions/parse';
import {AREA_LABELS} from '../../../lib/ai/context/pages';
import {stripHint} from '../../../lib/ai/emotion-hint';
import {inQuietHours} from '../../../lib/ai/knock/rules';
import {examplesFor} from '../../../lib/ai/local-answers/examples';
import {questionLanguage} from '../../../lib/ai/local-answers/no-model';
import {BRIEF_LABEL, briefChatText} from '../../../lib/ai/proactive/brief';
import {PROVIDERS} from '../../../lib/ai/providers';
import {parseBlocks, plainText} from '../../../lib/ai/safe-render';
import {currentAiScope, currentChatStore} from '../../../lib/ai/scope';
import {lastQuestion} from '../../../lib/ai/session';
import type {PageArea} from '../../../lib/ai/settings';
import {helpText, parseSlash} from '../../../lib/ai/slash';
import {ZIGI_STORE_EVENT} from '../../../lib/ai/store/keys';
import {briefPrefs, ZIGI, zigiPrefs} from '../../../lib/ai/store/records';
import {readDeviceRecord} from '../../../lib/device-record';
import {askZigi, DUO_IDLE, type NovaAgentId, duoState, markDelegated, NOVA_BRIDGE, NOVA_BRIDGE_KEY, NOVA_CHAT_PARAM, NOVA_HANDOFF_EVENT, rememberNovaChat, setDuo, setSpeechInput, speechInputOn, takeNovaHandoff, type ZigiPage} from '../../../lib/nova/bridge';
import {pagePack, taskToolEnv} from '../../../lib/nova/bridge-pack';
import {readNovaScopes, scopesOf} from '../../../lib/nova/scopes';
import {NOVA_SETUP} from '../../../lib/nova/setup';
import {novaLocalEnv} from '../../../lib/nova/local-env';
import {novaAndZigi} from '../../../lib/nova/one-line';
import {instructionsOf, NOVA_STORE, personaOf} from '../../../lib/nova/store';
import {quickLogContext} from '../../../lib/quick-log/context';
import {quickLogReply} from '../../../lib/quick-log/multi';
import {getAppStorage} from '../../../lib/showcase-storage';
import {formatClock} from '../../../lib/visual-format';
import {resolveVoiceLanguage} from '../../../lib/zigi-voice-lang';
import {voicePrefs, ZIGI_VOICE} from '../../../lib/zigi-voice';
import {chatMode} from '../../ai/chat-mode';
import {SafeText} from '../../ai/safe-text';
import {useAiContext} from '../../ai/use-ai-context';
import {useAiSettings} from '../../ai/use-ai-settings';
import {useAutoAccept} from '../../ai/use-auto-accept';
import {useChatSession, type NovaSurface, type SendOptions} from '../../ai/use-chat-session';
import {buildNovaPack, DEFAULT_NOVA_SCOPES, whatNovaCanSee} from '../../../lib/ai/context-pack/nova';
import {hermesAgent, novaPackInput} from '../../../lib/nova/bridge-pack';
import {NOVA_HERMES} from '../../../lib/nova/hermes-record';
import {useChainChoice} from '../../chain/use-chain-choice';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useProposals} from '../../ai/use-proposals';
import {useSensitiveScreen} from '../../ai/use-sensitive-screen';
import {useReadAloud} from '../../ai/use-voice';
import {ZigiAvatar} from '../../zigi/zigi-avatar';
import {NovaComposer, type Editing} from './nova-composer';
import {downloadChat, NovaConversations} from './nova-conversations';
import {AgentGlyph, PersonaFigure} from './nova-figure';
import {NovaReplyTurn, NovaUserTurn, type TurnCommon} from './nova-turns';
import '../../ai/ai.css';
import '../../ai/chat-polish.css';
import '../../ai/safe-text.css';
import './nova-chat.css';

/**
 * NOVA's chat (Session AK, owner follow-up 2 N1/N2, ADR-036 Q28): ZIGi's engine on NOVA's surface. The same chat store
 * (one history with ZIGi), the same keys, memory, tools, confirm cards with Undo, local answers, budgets and privacy paths
 * (components/ai/use-chat-session.ts with a `nova` surface: Today's records and specialist, under the person's name for
 * NOVA). NOVA never uses ZIGoals hosted: it answers with the person's own model or key, or on the device.
 * - With no model connected it answers on the device (lookups and cards, labelled "On-device answers · no AI used") and
 *   invites building its brain with the setup guide (/app/nova/setup).
 * - Streaming answers, safe Markdown with code blocks, tool chips, Stop, Retry, Edit last message (↑), conversations with
 *   search and pins, a Markdown file of a chat, read aloud, and speech input once the person turned it on.
 * - ZIGi: a page task handed to ZIGi runs on this same engine with that page's records (lib/nova/bridge-pack.ts) and reads
 *   as two voices; "Open ZIGi on <page>" opens ZIGi there with the words (nothing is sent before Send there).
 * Layout: 'panel' (a large glass panel over NOVA's dashboard) or 'sheet' (a phone's bottom sheet); the slot places it.
 * `onOrbState` tells NOVA's orb whether it is idle, listening, thinking or speaking.
 */
export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';
/**
 * `layout` (owner follow-up 3 N12): 'panel' above NOVA's command field, 'side' beside the orb on wide screens, 'sheet' on
 * phones. `collapsed` (NOVA's page decides): the chat folds back into the command field and stays mounted, so a reply keeps
 * streaming and the conversation is there when it opens again; `onCollapse` adds the fold button. `hermes`: the person's
 * own Hermes Agent comes from lane NC's connection record, for "Ask my Hermes".
 */
export type NovaChatProps = {layout: 'panel' | 'side' | 'sheet'; onOrbState?: (state: OrbState) => void; onClose?: () => void; collapsed?: boolean; onCollapse?: () => void};
export const NOVA_SETUP_HREF = '/app/nova/setup';
const SETTINGS_HREF = '/app/settings#your-ai';
/** NOVA's own messages read the day: Today's records and specialist. */
const NOVA_AREA: PageArea = 'today';
const NOVA_INSTRUCTIONS_MAX = 2000;
type Delegation = {before: ReadonlySet<string>; area: PageArea; chatId: string; done: boolean; agent: NovaAgentId};
export function NovaChat({layout, onOrbState, onClose, collapsed = false, onCollapse}: NovaChatProps) {
  const settings = useAiSettings(), scope = currentAiScope(), sensitive = useSensitiveScreen(), router = useRouter();
  const novaRecord = useDeviceRecord(NOVA_STORE), persona = personaOf(novaRecord.data), instructions = instructionsOf(novaRecord.data);
  // NOVA's own standing instructions join the person's ZIGi instructions for NOVA's messages (inside the same data marks).
  const data = useMemo(() => instructions ? {...settings.data, customInstructions: [settings.data.customInstructions.trim(), `For ${persona.name}: ${instructions.slice(0, NOVA_INSTRUCTIONS_MAX)}`].filter(Boolean).join('\n\n')} : settings.data, [settings.data, instructions, persona.name]);
  const providerName = data.provider === 'local' ? (data.localServer === 'ollama' ? 'Ollama' : 'your local server') : data.provider ? PROVIDERS[data.provider].name : 'your AI';
  const {connected} = chatMode(false, data);
  const context = useAiContext(data, providerName, sensitive);
  // The person's own Hermes Agent (lane NC's connection record and the key in the device's key store), and the chain choice.
  const hermesRecord = useDeviceRecord(NOVA_HERMES), hermes = useMemo(() => hermesAgent(hermesRecord.data, scope), [hermesRecord.data, scope]);
  const chainChosen = useChainChoice().chosen;
  const contextRef = useRef(context), hermesRef = useRef(hermes), dataRef = useRef(data), chainRef = useRef(chainChosen);
  useEffect(() => { contextRef.current = context; dataRef.current = data; chainRef.current = chainChosen; }, [context, data, chainChosen]);
  useEffect(() => { hermesRef.current = hermes; }, [hermes]);
  /** NOVA's pack input at this moment (lane NE): the same input for the send and for "What NOVA can see". */
  const packInput = useCallback(() => { const c = contextRef.current, d = dataRef.current; return novaPackInput({sources: c.toolSources(), gates: c.gates, storage: getAppStorage(), target: {provider: d.provider, model: d.model, baseUrl: d.baseUrl}, chainChosen: chainRef.current}); }, []);
  const nova = useMemo<NovaSurface>(() => ({
    persona: persona.name,
    // Built at the moment of each send, from the records of that moment, under this page's gates and NOVA's scopes.
    novaPack: () => { const input = packInput(); return input ? buildNovaPack(input) : null; },
    // Security review Z1A-4: a task for ZIGi or Hermes meets NOVA → Permissions too (Health off by default), read at the send.
    pack: area => pagePack({area, sources: contextRef.current.toolSources(), gates: contextRef.current.gates, nova: {scopes: readNovaScopes(getAppStorage()), chainChosen: chainRef.current}}),
    taskEnv: handles => taskToolEnv({sources: contextRef.current.toolSources(), gates: contextRef.current.gates, nova: {scopes: readNovaScopes(getAppStorage()), chainChosen: chainRef.current}, handles}),
    // Release review 2 (R2-2): NOVA's on-device answers read under NOVA → Permissions too, and say so in NOVA's words.
    localEnv: () => novaLocalEnv({sources: contextRef.current.toolSources(), gates: contextRef.current.gates, scopes: readNovaScopes(getAppStorage()), chainChosen: chainRef.current}),
    remember: chatId => { rememberNovaChat(getAppStorage(), chatId); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: NOVA_BRIDGE_KEY})); },
    agent: name => name === 'hermes' ? hermesRef.current : null,
  }), [persona.name, packInput]);
  /** R2-2: NOVA's on-device environment from this render's records (the welcome's questions, /brief and /log). */
  const setupRec = useDeviceRecord(NOVA_SETUP), scopesNow = useMemo(() => setupRec.unreadable ? {...DEFAULT_NOVA_SCOPES} : scopesOf(setupRec.data), [setupRec.unreadable, setupRec.data]);
  const localEnvNow = useCallback(() => novaLocalEnv({sources: context.toolSources(), gates: context.gates, scopes: scopesNow, chainChosen}), [context, scopesNow, chainChosen]);
  const session = useChatSession({settings: data, scope, context, nova}), runner = useProposals({surface: 'nova', healthShared: context.gates.health}), autoAccept = useAutoAccept(context.gates.health);
  const bridge = useDeviceRecord(NOVA_BRIDGE), marks = useMemo(() => bridge.data.delegated ?? {}, [bridge.data.delegated]), speechOn = speechInputOn(bridge.data);
  const [deleg, setDeleg] = useState<{area: PageArea; agent: NovaAgentId} | null>(null), [view, setView] = useState<'chat' | 'list'>('chat'), [editing, setEditing] = useState<Editing | null>(null), [note, setNote] = useState(''), [listening, setListening] = useState(false), [tick, setTick] = useState(0);
  const composer = useRef<HTMLTextAreaElement>(null), log = useRef<HTMLDivElement>(null), titleId = useId(), delegation = useRef<Delegation | null>(null), duoTimer = useRef<number | null>(null), spokenAsked = useRef(false);
  const reader = useReadAloud(resolveVoiceLanguage(data.voice.language, typeof navigator === 'undefined' ? undefined : navigator.language));
  const voiceRec = useDeviceRecord(ZIGI_VOICE), vprefs = voicePrefs(voiceRec.data), zigiRec = useDeviceRecord(ZIGI);
  const busy = session.status !== 'idle', delegating = deleg !== null;
  useEffect(() => setEditing(null), [session.chat.id]);

  // ---- Sending ----
  const ask = useCallback((text: string, options: SendOptions = {}) => { void session.ask(text, {area: NOVA_AREA, ...options}); }, [session]);
  const [seeing, setSeeing] = useState<string | null>(null);
  const say = session.say;
  /** The commands NOVA takes as ZIGi does; the views that live in ZIGi's panel are named there. */
  const command = useCallback((typed: string): boolean => {
    const parsed = parseSlash(typed); if (!parsed) return false;
    const {command: {name}, rest} = parsed;
    const env = () => sensitive ? null : localEnvNow(); // R2-2: NOVA → Permissions apply to /brief and /log too
    switch (name) {
      case '/help': say(typed, helpText()); return true;
      case '/ask': if (!rest) return true; ask(rest, {direct: true}); return true;
      case '/plan': if (!rest) return true; ask(rest, {plan: true}); return true;
      case '/log': {
        if (connected) { if (rest) ask(rest, {log: true}); return true; }
        const e = env(), lang = questionLanguage(rest) === 'nl' ? 'nl' : 'en', reply = e && rest.trim() ? quickLogReply(rest, quickLogContext(e), lang) : null;
        say(typed, reply?.text ?? 'Type what you did, ate or drank after /log, for example: /log 2 glasses of water, read 20 minutes.');
        return true;
      }
      case '/brief': case '/recap': {
        let prefs = briefPrefs({version: 1}); try { prefs = briefPrefs(readDeviceRecord(getAppStorage(), ZIGI).data); } catch { /* the defaults */ }
        const text = briefChatText(env(), name === '/recap' ? 'evening' : 'morning', {snapshot: sensitive ? undefined : context.toolSources()?.earn, earning: prefs.earning});
        say(typed, text);
        if (prefs.readAloud && !vprefs.muted) reader.speak(text.replace(BRIEF_LABEL, ''));
        return true;
      }
      default: say(typed, `${name} opens a view in ZIGi’s panel: press ⌘/Ctrl + K there. Everything else works here.`); return true;
    }
  }, [ask, connected, context, localEnvNow, reader, say, sensitive, vprefs.muted]);
  const runDelegation = useCallback(async (text: string, area: PageArea, replace?: string, agent: NovaAgentId = 'zigi', pasted = false) => {
    if (session.status !== 'idle' || delegation.current) return;
    delegation.current = {before: new Set(session.chat.turns.map(t => t.id)), area, chatId: session.chat.id, done: false, agent}; setDeleg({area, agent});
    setDuo({active: true, area, step: 'handed', task: text, looked: [], ...(agent === 'hermes' ? {agent} : {})});
    setNote(agent === 'hermes' ? `${persona.name} asked your Hermes Agent.` : `${persona.name} handed this to ZIGi on ${AREA_LABELS[area]}.`);
    // ZIGi first meets its on-device answers, as on its own page; the person's Hermes always answers itself (a direct send).
    if (agent === 'hermes') await session.send(text, {area, zigi: true, agent: 'hermes', ...(replace ? {replace} : {})});
    else await session.ask(text, {area, zigi: true, ...(replace ? {replace} : {}), ...(pasted ? {pasted: true} : {})}); // Z1A-2
    if (delegation.current) { delegation.current.done = true; setTick(t => t + 1); }
  }, [persona.name, session]);
  const sendText = useCallback((text: string, replace?: string, pasted = false) => {
    // Editing a task that was ZIGi's keeps it ZIGi's, on the same page.
    const mark = replace ? marks[replace] : undefined;
    if (mark?.role === 'task') { void runDelegation(text, mark.area, replace, mark.agent ?? 'zigi'); return; }
    if (!replace && command(text)) return;
    ask(text, {...(replace ? {replace} : {}), ...(pasted ? {pasted: true} : {})});
  }, [ask, command, marks, runDelegation]);
  const retry = useCallback(() => {
    if (busy) return;
    const last = lastQuestion(session.chat), mark = last ? marks[last.id] : undefined;
    if (mark?.role === 'task') {
      const agent = mark.agent ?? 'zigi';
      delegation.current = {before: new Set(session.chat.turns.map(t => t.id)), area: mark.area, chatId: session.chat.id, done: false, agent}; setDeleg({area: mark.area, agent});
      setDuo({active: true, area: mark.area, step: 'handed', task: last!.text, looked: [], ...(agent === 'hermes' ? {agent} : {})});
      void session.regenerate().then(() => { if (delegation.current) { delegation.current.done = true; setTick(t => t + 1); } });
      return;
    }
    void session.regenerate();
  }, [busy, marks, session]);
  const openZigi = useCallback((text: string, area: ZigiPage) => {
    setNote(`Opening ZIGi on ${AREA_LABELS[area]} with your words. Nothing is sent until you press Send there.`);
    void askZigi(text, area, href => router.push(href));
  }, [router]);

  // ---- A task handed to ZIGi: each step, then its turns marked as ZIGi's ----
  useEffect(() => {
    const d = delegation.current; if (!d || d.done) return;
    const step = session.status === 'streaming' ? 'answering' : session.status === 'pending' ? (session.looking.length ? 'reading' : 'handed') : null;
    if (step) setDuo({...duoState(), step, looked: session.looking});
  }, [session.status, session.looking]);
  useEffect(() => {
    const d = delegation.current; if (!d?.done || session.status !== 'idle') return;
    delegation.current = null; setDeleg(null);
    const fresh = session.chat.id === d.chatId ? session.chat.turns.filter(t => !d.before.has(t.id)) : [];
    const task = fresh.find(t => t.role === 'user')?.id ?? null, replies = fresh.filter(t => t.role === 'assistant').map(t => t.id);
    try { markDelegated(getAppStorage(), d.chatId, d.area, {task, replies}, d.agent); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: NOVA_BRIDGE_KEY})); } catch { /* the two voices are a convenience; the answer stands */ }
    setDuo({...duoState(), step: replies.length ? 'reported' : 'stopped'});
    const who = d.agent === 'hermes' ? 'your Hermes Agent' : 'ZIGi';
    setNote(replies.length ? (d.agent === 'hermes' ? 'Your Hermes Agent reported back.' : `ZIGi reported back from ${AREA_LABELS[d.area]}.`) : `The task for ${who} stopped.`);
    if (duoTimer.current !== null) window.clearTimeout(duoTimer.current);
    duoTimer.current = window.setTimeout(() => { duoTimer.current = null; if (!delegation.current) setDuo(DUO_IDLE); }, 12_000);
  }, [tick, session.status, session.chat]);
  useEffect(() => () => { if (duoTimer.current !== null) window.clearTimeout(duoTimer.current); setDuo(DUO_IDLE); }, []);

  // ---- Hand-offs: "Continue in NOVA", the command bar, a task from elsewhere in NOVA ----
  const openChat = useCallback(async (chatId: string) => {
    let found = null; try { found = await currentChatStore().read(chatId); } catch { found = null; }
    if (!found) { setNote('That conversation is not on this device.'); return; }
    await session.open(chatId); setView('chat'); setNote(`Continuing “${found.title}”.`);
  }, [session]);
  const handoff = useRef<() => void>(() => undefined);
  handoff.current = () => {
    const taken = takeNovaHandoff(); if (!taken) return;
    try { const url = new URL(window.location.href); if (url.searchParams.has(NOVA_CHAT_PARAM)) { url.searchParams.delete(NOVA_CHAT_PARAM); window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`); } } catch { /* the address keeps it; harmless */ }
    if (taken.kind === 'open') void openChat(taken.chatId);
    else if (taken.kind === 'ask') { setView('chat'); sendText(taken.text, undefined, !!taken.pasted); }
    else { setView('chat'); void runDelegation(taken.text, taken.area, undefined, taken.agent ?? 'zigi'); }
  };
  const ready = settings.loaded && context.ready && novaRecord.loaded && bridge.loaded;
  useEffect(() => {
    if (!ready) return;
    handoff.current();
    const on = () => handoff.current();
    window.addEventListener(NOVA_HANDOFF_EVENT, on);
    return () => window.removeEventListener(NOVA_HANDOFF_EVENT, on);
  }, [ready]);

  // ---- The orb, the announcements, reading aloud ----
  const orb: OrbState = listening ? 'listening' : reader.speaking || session.status === 'streaming' ? 'speaking' : session.status === 'pending' ? 'thinking' : 'idle';
  useEffect(() => { onOrbState?.(orb); }, [orb, onOrbState]);
  useEffect(() => () => onOrbState?.('idle'), [onOrbState]);
  const replies = session.chat.turns.filter(t => t.role === 'assistant').length, lastReplies = useRef(replies), lastStatus = useRef(session.status);
  useEffect(() => { if (session.status === 'pending' && lastStatus.current === 'idle') setNote(delegating ? `${deleg?.agent === 'hermes' ? 'Your Hermes Agent' : 'ZIGi'} is working on it…` : `Waiting for ${connected ? providerName : 'the on-device answer'}…`); lastStatus.current = session.status; }, [session.status, delegating, deleg?.agent, connected, providerName]);
  useEffect(() => {
    if (replies > lastReplies.current) {
      const spoken = spokenAsked.current; spokenAsked.current = false;
      const last = [...session.chat.turns].reverse().find(t => t.role === 'assistant');
      const who = last?.source === 'local' ? 'Answered on this device.' : last?.source === 'on-device' ? 'Chrome’s on-device model replied.' : 'Your AI replied.';
      const knock = zigiPrefs(zigiRec.data).knock, clock = new Date(), quiet = inQuietHours(`${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`, knock.quietFrom, knock.quietTo);
      setNote(spoken && quiet && !vprefs.muted ? `${who} Not read aloud between ${formatClock(knock.quietFrom)} and ${formatClock(knock.quietTo)}.` : who);
      if (!vprefs.muted && last && (data.voice.readAloud || (spoken && vprefs.readSpoken && !quiet))) reader.speak(plainText(parseBlocks((session.parsed.get(last.id) ?? parseReply(last.text)).text)));
    }
    lastReplies.current = replies;
  }, [replies, session.chat.turns, session.parsed, data.voice.readAloud, reader, vprefs.muted, vprefs.readSpoken, zigiRec.data]);
  useEffect(() => { const el = log.current; if (!el) return; if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) toLatest(el); }, [session.chat.turns.length, session.draft]);

  const shownDraft = useMemo(() => { if (!session.draft) return ''; const draft = stripHint(session.draft); if (hasOpenFence(draft)) { const at = draft.search(/(```+|~~~+)[^\S\n]*(?:json[^\S\n]+)?zigoals/i); return at >= 0 ? draft.slice(0, at) : draft; } return parseReply(draft).text; }, [session.draft]);
  const lastAssistant = [...session.chat.turns].reverse().find(t => t.role === 'assistant'), lastAsked = lastQuestion(session.chat);
  const latestCards = useMemo(() => [...session.chat.turns].reverse().find(t => t.role === 'assistant' && (session.parsed.get(t.id) ?? parseReply(t.text)).proposals.length > 0)?.id ?? null, [session.chat.turns, session.parsed]);
  // R2-2: the questions NOVA answers on this device first (under NOVA → Permissions), each one answered when tapped.
  const examples = useMemo(() => examplesFor(sensitive ? null : localEnvNow(), 3), [localEnvNow, sensitive]);
  const common: TurnCommon = {session, runner, autoAccept, persona, providerName, reader, connected, onNavigate: () => onClose?.(), onAsk: question => ask(question)};
  const startNew = () => { session.startNew(); setView('chat'); setEditing(null); setDuo(DUO_IDLE); composer.current?.focus(); };
  const status = connected ? `via ${providerName} · ${data.model ?? ''}` : 'On-device answers';
  const failureRetry = session.failure && !['blocked', 'full', 'not-connected', 'missing-key'].includes(session.failure.kind) && session.chat.turns.at(-1)?.role === 'user';
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => { const leave = onCollapse ?? onClose; if (event.key === 'Escape' && leave && !event.defaultPrevented) { event.preventDefault(); leave(); } };

  return <section className={`nova-chat nova-chat-${layout}`} aria-labelledby={titleId} hidden={collapsed} data-collapsed={collapsed ? '' : undefined} onKeyDown={onKeyDown} onPointerDown={() => { if (reader.speaking) reader.stop(); }}>
    <header className="nova-chat-head">
      <PersonaFigure persona={persona} size={layout === 'sheet' ? 34 : 44} state={orb}/>
      <div className="nova-chat-identity">
        <p className="nova-eyebrow" aria-hidden="true">Your private intelligence</p>
        <h2 id={titleId} className="nova-chat-title">{persona.name}</h2>
        <p className="nova-chat-status"><span className="nova-dot" data-on={connected ? '' : undefined} aria-hidden="true"/>{status}{sensitive ? ' · paused on a private screen' : ''}</p>
      </div>
      <div className="nova-chat-tools" role="toolbar" aria-label="Chat tools">
        <button type="button" className="secondary nova-tool" onClick={startNew}>New chat</button>
        <button type="button" className="secondary nova-tool" aria-pressed={view === 'list'} onClick={() => setView(v => v === 'list' ? 'chat' : 'list')}>Conversations</button>
        <button type="button" className="secondary nova-tool" disabled={!session.chat.turns.length} onClick={() => void downloadChat(session.chat.id, persona.name).then(ok => setNote(ok ? 'Saved this conversation as a Markdown file on this device.' : 'This conversation is not saved yet.'))}>Save as Markdown</button>
        {onCollapse && <button type="button" className="nova-close" aria-label={`Fold ${persona.name}’s chat into the command field`} title="Fold into the command field" onClick={onCollapse}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
        {onClose && <button type="button" className="nova-close" aria-label={`Close ${persona.name}’s chat`} title="Close" onClick={onClose}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg></button>}
      </div>
    </header>
    {view === 'list' ? <NovaConversations session={session} persona={persona.name} onOpen={() => { setView('chat'); composer.current?.focus(); }}/> : <>
      <div ref={log} className="nova-chat-log" role="log" aria-label="Conversation">
        {session.chat.turns.length === 0 && <div className="nova-welcome">
          <p className="nova-eyebrow">Your private intelligence</p>
          <p className="nova-welcome-title">Think out loud.</p>
          <p className="nova-welcome-sub">One conversation, your whole constellation: goals, habits, health and wealth, on this device. {novaAndZigi(persona.name)} They share this history.</p>
          {examples.length > 0 && !busy && <div className="ai-chips" role="group" aria-label="Questions to start with">{examples.map(e => <button key={e} type="button" className="ai-chip" title={e} onClick={() => ask(e)}>{e}</button>)}</div>}
        </div>}
        {!connected && session.chat.turns.length === 0 && <div className="nova-invite" role="note" aria-label={`Build ${persona.name}’s brain`}>
          <p><strong>{persona.name} answers on this device for now</strong>: questions about your records, and cards you confirm. Nothing goes to an AI.</p>
          <p>When you are ready, give {persona.name} a brain: a free local model on your own computer (private, recommended) or your own key.</p>
          <Link className="secondary" href={NOVA_SETUP_HREF}>Build {persona.name}’s brain</Link>
        </div>}
        {session.chat.turns.map((turn, i) => {
          const prev = session.chat.turns[i - 1];
          if (turn.role === 'user') return <NovaUserTurn key={turn.id} turn={turn} mark={marks[turn.id]} persona={persona} onEdit={!busy && turn === lastAsked ? () => { setEditing({id: turn.id, text: turn.text, seq: Date.now()}); requestAnimationFrame(() => composer.current?.focus()); } : undefined}/>;
          return <NovaReplyTurn key={turn.id} turn={turn} asked={prev?.role === 'user' ? prev.text : ''} mark={marks[turn.id]} isLast={turn === lastAssistant} earlier={turn.id !== latestCards} busy={busy} common={common} onRetry={retry}/>;
        })}
        {deleg && busy && (deleg.agent === 'hermes' ? <ol className="nova-steps" aria-label="Your Hermes Agent’s steps">
          <li data-done="">{persona.name} asked your Hermes Agent, with {AREA_LABELS[deleg.area]}’s records</li>
          <li data-done={session.status === 'streaming' ? '' : undefined}>Hermes answers, on your own computer</li>
          <li>Back to {persona.name}: any change comes as a card</li>
        </ol> : <ol className="nova-steps" aria-label="ZIGi’s steps">
          <li data-done="">{persona.name} handed it to ZIGi on {AREA_LABELS[deleg.area]}</li>
          <li data-done={session.looking.length || session.status === 'streaming' ? '' : undefined}>ZIGi reads {AREA_LABELS[deleg.area]}’s records{session.looking.length ? `: ${session.looking.join(', ')}` : ''}</li>
          <li data-done={session.status === 'streaming' ? '' : undefined}>ZIGi answers</li>
          <li>Back to {persona.name}</li>
        </ol>)}
        {session.status === 'pending' && <div className="nova-pending" aria-hidden="true">{deleg?.agent === 'hermes' ? <AgentGlyph size={28}/> : delegating ? <ZigiAvatar state="thinking" size={28} decorative/> : <PersonaFigure persona={persona} size={28} state="thinking"/>}<span className="ai-pending-dots"><i/><i/><i/></span><span>{deleg?.agent === 'hermes' ? 'Waiting for your Hermes Agent…' : !connected ? 'Asking Chrome’s on-device model…' : session.looking.length ? `Looked at ${session.looking.join(', ')}; waiting for ${providerName}…` : `Waiting for ${providerName}…`}</span></div>}
        {session.status === 'streaming' && <article className={`nova-turn nova-turn-assistant nova-turn-live${deleg?.agent === 'hermes' ? ' nova-turn-hermes' : delegating ? ' nova-turn-zigi' : ''}`} aria-hidden="true"><span className="nova-turn-figure">{deleg?.agent === 'hermes' ? <AgentGlyph size={28}/> : delegating ? <ZigiAvatar state="speaking" size={28} decorative/> : <PersonaFigure persona={persona} size={28} state="speaking"/>}</span><div className="nova-turn-body"><p className="nova-turn-who">{deleg?.agent === 'hermes' ? 'Hermes · your agent' : deleg ? `ZIGi · ${AREA_LABELS[deleg.area]} page` : persona.name}</p><SafeText text={shownDraft}/></div></article>}
        {session.confirmation && <div className="ai-confirm" role="group" aria-label="These records are larger than your budget">
          <p>These records are about {session.confirmation.fit.estimated.context.toLocaleString('en-US')} tokens; with the conversation that is {session.confirmation.fit.estimated.total.toLocaleString('en-US')}, above your budget of {session.confirmation.budget.toLocaleString('en-US')} (Settings → ZIGi · Your Personal AI Companion → Context budget).</p>
          <div className="ai-card-actions"><button type="button" className="primary" onClick={() => void session.send(session.confirmation!.text, {...session.confirmation!.options, confirmed: true, spendConfirmed: true})}>Send anyway</button><button type="button" className="secondary" onClick={() => void session.send(session.confirmation!.text, {...session.confirmation!.options, confirmed: true, withContext: false, extra: undefined, spendConfirmed: true})}>Send without the records</button><button type="button" className="text-link" onClick={session.cancelConfirmation}>Cancel</button></div>
        </div>}
        {session.spendCheck && <div className="ai-confirm" role="group" aria-label="Your monthly cap is reached">
          <p>{session.spendCheck.note} You asked to be checked with first (Settings → ZIGi · Your Personal AI Companion → Usage).</p>
          <div className="ai-card-actions"><button type="button" className="primary" onClick={session.confirmSpend}>Send anyway</button><button type="button" className="text-link" onClick={session.cancelSpend}>Not now</button></div>
        </div>}
        {session.usageNote && <p className="ai-note" role="status">{session.usageNote}</p>}
        {reader.notice && <p className="ai-note" role="status">{reader.notice}</p>}
        {session.failure && <div className="ai-failure" role="alert">
          <p className="ai-failure-title">{session.failure.title}</p>
          {session.failure.steps.length > 0 && <ul>{session.failure.steps.map((step, i) => <li key={i}>{step}</li>)}</ul>}
          <div className="ai-card-actions">
            {failureRetry && <button type="button" className="secondary" onClick={() => { session.dismissFailure(); retry(); }}>Retry</button>}
            {['bad-key', 'missing-key', 'not-connected', 'model-missing', 'local-unreachable', 'cors'].includes(session.failure.kind) && <><Link className="secondary" href={NOVA_SETUP_HREF}>Open the setup guide</Link><Link className="text-link" href={SETTINGS_HREF}>ZIGi settings</Link></>}
            <button type="button" className="text-link" onClick={session.dismissFailure}>Dismiss</button>
          </div>
        </div>}
        {session.saveNote && <p className="ai-note" role="status">{session.saveNote}</p>}
      </div>
      {sensitive && <p className="ai-note nova-paused">Paused on this private screen: nothing is read from your records.</p>}
      <NovaComposer ref={composer} session={session} persona={persona.name} settings={data} sensitive={sensitive} editing={editing} onEditing={setEditing}
        onSend={sendText} onDelegate={(text, area, replace, pasted) => void runDelegation(text, area, replace, 'zigi', !!pasted)} onOpenZigi={openZigi} onHermes={hermes ? (text, area) => void runDelegation(text, area, undefined, 'hermes') : undefined}
        speechOn={speechOn} onSpeech={on => { try { setSpeechInput(getAppStorage(), on); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: NOVA_BRIDGE_KEY})); } catch { setNote('This choice could not be saved on this device.'); } }}
        onListening={setListening} onSpoken={() => { spokenAsked.current = true; }}/>
      {connected && <details className="ai-context-preview nova-see" onToggle={event => { if (event.currentTarget.open) { const input = packInput(); setSeeing(input ? whatNovaCanSee(input) : ''); } }}>
        <summary>What {persona.name} can see</summary>
        <p className="ai-note">Exactly the records that go with your next message, after your privacy mode. Change what {persona.name} may read in NOVA → Permissions.</p>
        {seeing === '' ? <p className="ai-note">Nothing is read right now (a private screen, or the records are still loading).</p> : seeing && <pre tabIndex={0}>{seeing}</pre>}
      </details>}
      <p className="nova-chat-foot">Your conversation stays on this device, in one history with ZIGi, whichever model answers.</p>
    </>}
    <p className="ai-sr-only" role="status" aria-live="polite">{note}</p>
  </section>;
}
export default NovaChat;
/** The log glides to the latest message only where motion is allowed (the device's setting and the app's Motion Off). */
function toLatest(el: HTMLElement) {
  const glide = document.documentElement.dataset.appMotion !== 'off' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollTo({top: el.scrollHeight, behavior: glide ? 'smooth' : 'auto'});
}

'use client';
import {useRouter} from 'next/navigation';
import {Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {LoadBoundary} from '../load-boundary';
import {useShowcase} from '../showcase-controls';
import {useChainChoice} from '../chain/use-chain-choice';
import {usePagesView} from '../pages/use-pages-view';
import {askZigi, launcherShown} from '../ai/ask';
import {openMusicPlayer} from '../music/music-events';
import {openSearch} from '../search/search-trigger';
import {showUndo} from '../ui/undo-toast';
import {isShown} from '../../lib/pages/visibility';
import {plainErrorMessage} from '../../lib/plain-error';
import {DUO_IDLE, duoState, NOVA_CHAT_PARAM, NOVA_HANDOFF_EVENT, novaHandoffPending, subscribeDuo} from '../../lib/nova/bridge';
import {dockEntries, dockForKey, type DockEntry} from '../../lib/nova/dock';
import {greetingFor, openingSkippedNote, type NovaOrbState} from '../../lib/nova/orb';
import {loopRuns} from '../../lib/motion-loops/loops'; // Session AK (FU): Full / Calm / Off
import {accentOf, addWidget, foldSection, layoutOf, markOpeningSeen, nextLeft, nudgeWidget, panelsOf, personaOf, placeWidget, resizeWidget, restoreWidgets, swapWidgets, routingOf, setLayout, setLeftPanel, setRightPanel, setRouting, setWake, shortcutsOn, wakeOn, widgetsFor, yourNameOf, type NovaRecord, type WidgetSize} from '../../lib/nova/store';
import {gallery, widgetAvailable, widgetSpec, type WidgetContext} from '../../lib/nova/widgets/catalog';
import {HUD_PRESET_LABEL, HUD_PRESET_PLAN, presetShown, presetWidgets, setHudLook, setHudPreset, type HudLook, type HudPreset} from '../../lib/nova/layout';
import {BURST_MS, isTextEntry, shortcutKind, typedLetter} from '../../lib/nova/holo/keys';
import {useHudRecord} from './holo/hud-record';
import {useHudMotion} from './holo/use-hud-motion';
import {PresetPicker} from './holo/presets';
import './holo/holo.css';
import type {NovaPanelId} from './panels/nova-panels';
import {CommandField, RoutingMenu, ViewControls} from './nova-command';
import {NovaLeft} from './nova-left';
import {NovaSheet} from './nova-sheet';
import {NovaSetupBanner, NovaStage} from './nova-stage';
import {NovaTop, QuickTile} from './nova-top';
import {StatusChips, useBrain} from './status-chips';
import {useNovaCounts} from './use-counts';
import {useClock, useNova, useNovaMotionLevel} from './use-nova';
import {useOpening} from './use-opening';
import {useWakePhrase} from './use-wake';
import {WidgetGrid, type GridActions} from './widget-grid';
import {OneTap, StageAnswerLine, StageDock} from './stage/stage-parts';
import {useStage, type StageGates} from './stage/use-stage';
import type {StageAnswer, StageBridge} from './stage/use-summoner';
import type {StarBeam} from './core/star-system';
import {useResting} from './core/use-resting';
import {sendToNova} from '../../lib/nova/bridge';
import {STAGE_AGAIN_EVENT} from '../../lib/nova/stage/events';
import {daysUntil, gentleCard} from '../../lib/nova/stage/proactive';
import {gentleShown, noteGentle, proactiveOn} from '../../lib/nova/stage/record';
import {localDate} from '../../lib/local-date';
import {NovaIcon} from './icons';
import {openPipWindow, pipHost} from '../../lib/ai/pip';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOVA_HERMES, hermesStatus} from '../../lib/nova/hermes-record';
import {openedOnNova} from './nova-entry';
import './nova.css';

const NovaChat = lazy(() => import('./chat/nova-chat'));
const NovaRight = lazy(() => import('./nova-right'));
const MakeItYours = lazy(() => import('./make-it-yours'));
const NovaPanels = lazy(() => import('./panels/nova-panels').then(m => ({default: m.NovaPanels})));
const NovaBriefs = lazy(() => import('./panels/nova-briefs'));
const Starfield = lazy(() => import('./starfield'));
const NovaMiniWindow = lazy(() => import('./mini-window'));
/** N1's Duo (lane NB's view): NOVA and ZIGi (or the person's Hermes) side by side while a task uses both; loaded only then. */
const NovaDuo = lazy(() => import('./chat/nova-duo'));
/** Session AK lane P1 (M3): "Running now", NOVA's live activity chips (components/nova/live/live-chips.tsx; its own chunk). */
const NovaLive = lazy(() => import('./live/live-chips'));
/** Session AL Part 11 (lane L8): the Holo core around the orb and a panel's quick actions, each its own chunk. */
const HoloCore = lazy(() => import('./holo/holo-core'));
const QuickActions = lazy(() => import('./holo/quick-actions'));
const ShortcutList = lazy(() => import('./holo/shortcut-list'));
/** Session AM (ADR-038 D10): the centre node's WebGL star system, its own chunk, loaded after first paint. */
const StarSystem = lazy(() => import('./core/star-system'));

type Sheet = {kind: 'day'} | {kind: 'panels'; id: NovaPanelId} | {kind: 'yours'} | {kind: 'quick'} | {kind: 'actions'; id: string} | {kind: 'keys'};
const PANEL_HASH = /^#nova-(memory|permissions|activity|workflows|cost|models)$/;
// Session AL second pass (lane L8; P-TK-41): any field, anything editable, or an element with a text-box role (lib/nova/holo/keys.ts).
const typing = (t: EventTarget | null) => t instanceof HTMLElement && isTextEntry({tagName: t.tagName, isContentEditable: t.isContentEditable, role: t.getAttribute('role')});
/** Session AK lane EXF (EX-2): a key from inside the conversation (its composer, its buttons, its sheet) is never a shortcut. */
const inChat = (t: EventTarget | null) => t instanceof Element && !!t.closest('.nova-talk, .nova-chat, .nova-sheet');
function useHeight(): number {
  const [height, setHeight] = useState(() => typeof window === 'undefined' ? 900 : window.innerHeight);
  useEffect(() => { const read = () => setHeight(window.innerHeight); window.addEventListener('resize', read); return () => window.removeEventListener('resize', read); }, []);
  return height;
}
function useWidth(): number {
  const [width, setWidth] = useState(() => typeof window === 'undefined' ? 1440 : window.innerWidth);
  useEffect(() => { const read = () => setWidth(window.innerWidth); window.addEventListener('resize', read); return () => window.removeEventListener('resize', read); }, []);
  return width;
}
const Reading = ({label}: {label: string}) => <p className="nova-reading" role="status">{label}</p>;

/**
 * Session AK (owner follow-up 2 N2, follow-up 3 N12; lane NA): NOVA, the person's private command center. The whole window
 * (the page client hides the app's chrome), a starfield and nebula drifting very slowly, the left panel in place of the
 * app's sidebar, the star in the centre with the widgets floating on its orbit rings, the top bar with the time and the
 * quick-access grid, the command field and its menus at the foot, NB's chat as a large panel, and "Behind the
 * intelligence" on the right. Phones get the minimal NOVA: the orb, the command field and the chat, quick access in a
 * sheet. Everything reads the person's own records on this device; nothing here needs a server.
 */
export default function NovaDashboard() {
  const nova = useNova(), r = nova.data, router = useRouter();
  const motionLevel = useNovaMotionLevel(), motion = loopRuns(motionLevel), now = useClock(), width = useWidth(), height = useHeight(), phone = width <= 640;
  const persona = personaOf(r), you = yourNameOf(r), layout = layoutOf(r), accent = accentOf(r), shortcuts = shortcutsOn(r);
  const hermesRecord = useDeviceRecord(NOVA_HERMES), hermes = hermesRecord.loaded && !hermesRecord.unreadable ? hermesStatus(hermesRecord.data) : null;
  const showcase = useShowcase(), chain = useChainChoice(), pagesView = usePagesView(), {brain} = useBrain(), counts = useNovaCounts();
  const [orb, setOrb] = useState<NovaOrbState>('idle'), [chatOpen, setChatOpen] = useState(false), [sheet, setSheet] = useState<Sheet | null>(null);
  const [editing, setEditing] = useState(false), [status, setStatus] = useState(''), [fullscreen, setFullscreen] = useState(false), [fullscreenOk, setFullscreenOk] = useState(false);
  const [pip, setPip] = useState<Window | null>(null), [pipOk, setPipOk] = useState(false);
  const root = useRef<HTMLDivElement>(null), command = useRef<HTMLInputElement>(null), fsLeftAt = useRef(0);
  // Session AL second pass (lane L8; DV-070, TK-074): the command field's words (they outlast the field while the
  // conversation is open) and a dock key waiting to see whether it is a shortcut or the start of typed words.
  const [draft, setDraft] = useState(''), pendingKey = useRef<{text: string; timer: number} | null>(null);
  // Session AK WA (N1): the duo state NOVA's chat writes while it hands a task to ZIGi or Hermes (lib/nova/bridge.ts).
  const duo = useSyncExternalStore(subscribeDuo, duoState, () => DUO_IDLE);
  // Session AL Part 11 (lane L8): the look (Holo by default, Classic on choice) and the HUD's motion state (O5).
  const {hud, look} = useHudRecord(), holo = look === 'holo', hudMove = useHudMotion(phone);
  // Session AM (D10, A7): whether the star system draws (else the SVG orb shows: no WebGL, Save-Data, a low battery).
  // Session AM (D11): at rest (the window not focused, or a minute without a key, tap or request) the scripted loops stop.
  const resting = useResting();
  const [starDraws, setStarDraws] = useState(false), onStarRender = (render: 'running' | 'still' | 'orb') => setStarDraws(render !== 'orb');

  const novaUpdate = nova.update;
  const save = useCallback((change: (r: NovaRecord) => NovaRecord, done?: string): boolean => {
    try { novaUpdate(change); if (done) setStatus(done); return true; } catch (e) { setStatus(plainErrorMessage(e, 'This change could not be saved on this device.')); return false; }
  }, [novaUpdate, setStatus]);
  const opening = useOpening({ready: nova.loaded, seen: !!r.openingSeen, motion, markSeen: () => { save(markOpeningSeen); }}), finishOpening = opening.finish;

  const ctx: WidgetContext = useMemo(() => ({markets: isShown(pagesView, 'markets'), notes: true, briefs: true}), [pagesView]);
  const widgets = useMemo(() => widgetsFor(r, id => widgetAvailable(id, ctx)), [r, ctx]);
  const available = useMemo(() => gallery(ctx, widgets.map(w => w.id)), [ctx, widgets]);
  const canShow = useCallback((id: string) => widgetAvailable(id, ctx), [ctx]);
  // Session AM (ADR-038 D1–D7): the live stage — the pinned widgets above and the widgets NOVA makes on request, one list.
  const stage = useStage({nova: r, save, canShow, announce: setStatus, arranging: editing});
  const [answer, setAnswer] = useState<StageAnswer | null>(null), [beam, setBeam] = useState<StarBeam | null>(null), inPlace = useRef(false);
  const entries = useMemo(() => dockEntries(r, {pageShown: page => isShown(pagesView, page), earn: chain.earnShown}), [r, pagesView, chain.earnShown]);
  const panels = panelsOf(r, width), left = phone ? 'hidden' : panels.left, right = phone ? 'hidden' : panels.right;

  const hour = now ? now.getHours() : 12, base = greetingFor(hour, persona.name, brain.kind !== 'none'); // Session AK P4 (FR-12)
  const greeting = you ? base.replace(/^([^.?]+)([.?])/, `$1, ${you}$2`) : base;

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    let landed = true;
    try { const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined; landed = !nav || new URL(nav.name).pathname.replace(/\/+$/, '') === '/app/nova'; } catch { landed = true; }
    // Session AK lane WB (N8): "Open ZIGoals on NOVA" replaced Today with NOVA, so NOVA is where this visit landed: Exit goes
    // to Today, never Back to whatever the tab showed before the app (tests/wiring-2-nova-start.spec.ts).
    if (openedOnNova()) landed = true;
    // Session AM (A3): in NOVA's own window, Exit closes that window (the app's own tab is still where it was).
    if (window.name === 'zigoals-nova' && window.opener === null && window.history.length <= 2) { window.close(); if (window.closed) return; }
    if (!landed && window.history.length > 1) router.back(); else router.push('/app/today');
  }, [router]);
  const openChat = useCallback(() => { setChatOpen(true); }, [setChatOpen]);
  const closeChat = useCallback(() => { setChatOpen(false); setOrb('idle'); requestAnimationFrame(() => command.current?.focus({preventScroll: true})); }, [setChatOpen, setOrb]);
  const act = useCallback((e: DockEntry) => {
    if (e.action === 'zigi') { if (launcherShown()) askZigi(''); else router.push('/app/zigi'); return; }
    if (e.action === 'music') { if (isShown(pagesView, 'music')) openMusicPlayer(); else router.push('/app/music'); return; }
    if (e.action === 'quick-add') { document.querySelector<HTMLButtonElement>('.nova-frame .nova-quickadd')?.click(); return; }
    if (e.href) router.push(e.href);
  }, [router, pagesView]);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen?.().catch(() => setStatus('This browser did not allow fullscreen.'));
  }, [setStatus]);
  const cycleLeft = useCallback(() => save(rr => setLeftPanel(rr, nextLeft(panelsOf(rr, window.innerWidth).left)), undefined), [save]);
  const toggleRight = useCallback(() => save(rr => setRightPanel(rr, panelsOf(rr, window.innerWidth).right === 'open' ? 'hidden' : 'open')), [save]);

  // Fullscreen: whether it exists here, and when it ends (an Esc that leaves fullscreen does not also leave NOVA).
  useEffect(() => {
    setFullscreenOk(!!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false);
    const change = () => { const on = !!document.fullscreenElement; setFullscreen(on); if (!on) fsLeftAt.current = Date.now(); };
    document.addEventListener('fullscreenchange', change);
    return () => { document.removeEventListener('fullscreenchange', change); if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); };
  }, []);
  // The mini window exists where the browser offers Document Picture-in-Picture (computers; lib/ai/pip.ts).
  useEffect(() => { setPipOk(!!pipHost()); }, []);
  const openMini = useCallback(async () => {
    const host = pipHost(); if (!host) return;
    try {
      const win = await openPipWindow(host);
      win.document.title = 'NOVA · mini window';
      win.addEventListener('pagehide', () => setPip(null), {once: true});
      setPip(win);
    } catch { setStatus('The mini window could not open in this browser.'); }
  }, [setPip, setStatus]);
  useEffect(() => () => { pip?.close(); }, [pip]);
  // A question handed over from ⌘/Ctrl + J or "Continue in NOVA" (NB's bridge) opens the conversation.
  useEffect(() => {
    if (novaHandoffPending() || new URLSearchParams(window.location.search).has(NOVA_CHAT_PARAM)) setChatOpen(true);
    // Session AM (D7): words from the stage's own command field are answered in place; a hand-off from elsewhere opens the conversation.
    const handoff = () => { if (inPlace.current) { inPlace.current = false; return; } setChatOpen(true); };
    window.addEventListener(NOVA_HANDOFF_EVENT, handoff);
    return () => window.removeEventListener(NOVA_HANDOFF_EVENT, handoff);
  }, []);
  // `/app/nova#briefs` opens Your day; `#nova-<panel>` opens ND's panels on that panel (their mount contract).
  useEffect(() => {
    const read = () => { const h = window.location.hash, m = h.match(PANEL_HASH); if (h === '#briefs') setSheet({kind: 'day'}); else if (m) setSheet({kind: 'panels', id: m[1] as NovaPanelId}); };
    read(); window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const closeSheet = useCallback(() => { setSheet(null); if (window.location.hash) window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`); }, [setSheet]);

  // Keys: Esc leaves fullscreen, then closes what is open, then leaves NOVA; ⌘/Ctrl + K goes to the command field; with
  // single-key shortcuts on (and not typing), a letter opens its quick-access entry and [ ] fold the side panels.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      // Session AK lane EXF (EX-6): a key pressed while the opening plays skips it, and a letter does nothing else (the
      // opening's own listener does that first; this covers a key that arrives before that listener is in place).
      // Session AL (DV-070): a letter typed into a field while the opening plays is a word: it stays in the field.
      if (root.current?.dataset.opening === 'play') { finishOpening(); if (e.key.length === 1 && !typing(e.target)) { e.preventDefault(); return; } }
      if (e.key === 'Escape') {
        if (document.fullscreenElement) { e.preventDefault(); void document.exitFullscreen().catch(() => undefined); return; }
        if (Date.now() - fsLeftAt.current < 600 || document.querySelector('dialog[open]')) return;
        const t = e.target;
        // Lane EXF (EX-3): focus left on the page's <main> (around NOVA, after a route change) counts as the page, like <body>.
        if (t instanceof Node && t !== document.body && !root.current?.contains(t) && !(root.current && t.contains(root.current))) return;
        if (editing) { setEditing(false); setStatus('Done arranging.'); return; }
        if (chatOpen) { closeChat(); return; }
        exit(); return;
      }
      // Lane EXF (EX-2): never while the conversation is open or the key comes from a text field or the chat.
      // Session AL second pass (P-TK-41): nor with any modifier, Shift on a letter, an input method composing, a held key.
      if (!shortcuts || chatOpen || typing(e.target) || inChat(e.target) || document.querySelector('dialog[open]')) return;
      const kind = shortcutKind(e), waiting = pendingKey.current;
      // A second letter soon after a first: the person is typing words, not choosing a shortcut. Both go to the command field.
      if (waiting && typedLetter(e)) {
        window.clearTimeout(waiting.timer); pendingKey.current = null; e.preventDefault();
        setDraft(d => `${d}${waiting.text}${e.key}`);
        command.current?.focus({preventScroll: true});
        requestAnimationFrame(() => { const f = command.current; if (f) f.setSelectionRange(f.value.length, f.value.length); });
        return;
      }
      if (kind === 'none') return;
      if (kind === 'help') { e.preventDefault(); setSheet({kind: 'keys'}); return; }
      if (kind === 'panel') { if (phone) return; e.preventDefault(); if (e.key === '[') cycleLeft(); else toggleRight(); return; }
      const entry = dockForKey(entries, e);
      if (!entry && !typedLetter(e)) return;
      if (entry) e.preventDefault();
      // A dock key opens its entry after a short wait, unless another letter follows (then it was a word).
      const text = e.key;
      pendingKey.current = {text, timer: window.setTimeout(() => { pendingKey.current = null; if (entry) act(entry); }, BURST_MS)};
    };
    // ⌘/Ctrl + K is ZIGi's everywhere else; on NOVA it goes to NOVA's own field first (ZIGi's launcher skips a handled key).
    const commandKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'k' || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      if (chatOpen) root.current?.querySelector<HTMLTextAreaElement>('.nova-talk textarea')?.focus(); else command.current?.focus();
    };
    window.addEventListener('keydown', key); window.addEventListener('keydown', commandKey, true);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('keydown', commandKey, true); if (pendingKey.current) { window.clearTimeout(pendingKey.current.timer); pendingKey.current = null; } };
  }, [editing, chatOpen, shortcuts, phone, entries, act, exit, closeChat, cycleLeft, toggleRight, finishOpening]);

  const wake = useWakePhrase({on: wakeOn(r) && !phone, persona: persona.name, paused: chatOpen, onWake: () => { setChatOpen(true); setStatus(`${persona.name} heard you.`); }});

  const title = (id: string) => widgetSpec(id)?.title ?? 'The widget';
  const actions: GridActions = {
    // Session AM (D3): arranging a widget NOVA made keeps it (it is pinned first, then moved).
    move: (id, to) => { stage.pin(id); save(rr => placeWidget(rr, id, to), `${title(id)} moved.`); },
    nudge: (id, by) => { stage.pin(id); save(rr => nudgeWidget(rr, id, by), `${title(id)} moved ${by < 0 ? 'earlier' : 'later'}.`); requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-widget="${id}"] .nova-grip`)?.focus()); },
    resize: (id, size: WidgetSize) => { stage.resize(id, size); save(rr => resizeWidget(rr, id, size), `${title(id)} is ${size === 'S' ? 'small' : size === 'M' ? 'medium' : 'large'} now.`); },
    // Session AM (D3): closing is the stage's (a pinned widget leaves NOVA's own record, a made one the stage record), with Undo.
    remove: id => stage.close(id),
    quick: id => setSheet({kind: 'actions', id}),
    // Review m9 (lane L8d): Left/Right on a grip trade places with the panel level with it in the other column; the grid
    // then says where the panel is now.
    swap: (a, b) => { stage.pin(a); stage.pin(b); save(rr => swapWidgets(rr, a, b), `${title(a)} changed columns.`); requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-widget="${a}"] .nova-grip`)?.focus()); },
    announce: words => setStatus(words),
  };
  // Session AL Part 11 (lane L8): a preset replaces the layout and the widgets in one step, with Undo putting both back.
  const applyPreset = (preset: HudPreset) => {
    const before = {layout, widgets: widgetsFor(r)}, plan = HUD_PRESET_PLAN[preset];
    if (!save(rr => restoreWidgets(setLayout(rr, plan.layout), presetWidgets(preset, canShow)))) return;
    // Second review p1 (lane L8f): the preset's hero opens at the top of the stage, never half-scrolled under the deck.
    root.current?.querySelector('.nova-stage-area')?.scrollTo({top: 0, behavior: 'instant'});
    try { hud.update(h => setHudPreset(h, preset)); } catch { /* the stage changed; remembering the preset's name is a nicety */ }
    showUndo({message: `${HUD_PRESET_LABEL[preset]} preset on the stage.`, undone: 'Your previous arrangement is back.', restore: () => { if (!save(rr => restoreWidgets(setLayout(rr, before.layout), before.widgets))) throw Error('This could not be put back on this device.'); }});
  };
  const setLook = (next: HudLook) => { try { hud.update(h => setHudLook(h, next)); setStatus(next === 'holo' ? 'Holo look: a holographic HUD.' : 'Classic look: the glass cards.'); } catch (e) { setStatus(plainErrorMessage(e, 'This choice could not be saved on this device.')); } };
  const shownPreset = presetShown(layout, widgets, canShow);
  const toggleWidget = (id: string, on: boolean) => { if (on) { if (save(rr => addWidget(rr, id, stage.shown.find(w => w.id === id)?.size ?? widgetSpec(id)?.size ?? 'M'), `${title(id)} is on the stage.`)) stage.show(id); } else actions.remove(id); };
  // Session AM (D6, D7): what NOVA's chat engine tells the stage. On a phone NOVA is a chat agent: a request is kept with
  // the widgets it would make (the computer shows it under Requests), and nothing is projected.
  // One bridge object for the whole visit; each call reads this render's stage through a ref (the chat engine keeps a stable handle).
  const bridgeLive = useRef({phone, canShow, stage, applyPreset}); bridgeLive.current = {phone, canShow, stage, applyPreset};
  const gatesKey = useRef('');
  const [bridge] = useState<StageBridge>(() => ({
    get device() { return bridgeLive.current.phone ? 'phone' as const : 'computer' as const; },
    available: id => bridgeLive.current.canShow(id),
    make: (requests, ask) => { const {phone: onPhone, stage: st} = bridgeLive.current; if (onPhone) { if (ask) st.noteAsk(ask, requests); return false; } return st.make(requests, ask); },
    command: c => bridgeLive.current.stage.command(c), arrangement: preset => bridgeLive.current.applyPreset(preset), noteAsk: (ask, made) => bridgeLive.current.stage.noteAsk(ask, made),
    setGates: (g: StageGates | null) => { const key = JSON.stringify(g); if (key !== gatesKey.current) { gatesKey.current = key; bridgeLive.current.stage.setGates(g); } },
    answer: a => { setAnswer(a); if (a?.decision) setChatOpen(true); },
    attention: () => setChatOpen(true),
  }));
  const askInPlace = (text: string) => { inPlace.current = !phone; if (!sendToNova(text)) inPlace.current = false; else if (phone) setChatOpen(true); };
  // "Show again" from the Requests widget or the right bar: that request's widgets are made again (D19).
  useEffect(() => {
    const again = (e: Event) => { const id = (e as CustomEvent<string>).detail, ask = bridgeLive.current.stage.asks.find(x => x.id === id); if (ask) bridgeLive.current.stage.again(ask); };
    window.addEventListener(STAGE_AGAIN_EVENT, again);
    return () => window.removeEventListener(STAGE_AGAIN_EVENT, again);
  }, []);
  // A5: the gentle cards (opt-in, off by default). While NOVA is open and nothing else is going on, at most one widget is
  // put on the stage for something the person's own records say is worth a glance, with one line under the star. Each
  // card once a day; rarer under Calm; nothing while the tab is hidden; never a notification.
  const gentleOn = stage.loaded && proactiveOn(stage.record.data), gentleQuiet = !phone && !chatOpen && !editing && !answer && !draft && stage.fresh.size === 0 && hudMove.state !== 'paused';
  const billDue = counts.nextBill?.due ?? null, gentleGates = stage.gates;
  useEffect(() => {
    if (!gentleOn || !gentleQuiet || !gentleGates) return;
    const timer = window.setTimeout(() => {
      const st = bridgeLive.current.stage, day = localDate(), clock = new Date();
      const card = gentleCard({hour: clock.getHours(), tasksDue: counts.tasksDue, habitsLeft: counts.habitsLeft, billInDays: daysUntil(day, billDue)},
        {calm: hudMove.state === 'calm', shown: gentleShown(st.record.data, day), gate: g => gentleGates[g], available: id => bridgeLive.current.canShow(id) && !st.shown.some(w => w.id === id)});
      if (!card || !st.make([{id: card.id}])) return;
      try { st.record.update(r => noteGentle(r, day, card.id)); } catch { /* the card shows; it may show once more today */ }
      setAnswer({id: `gentle-${day}-${card.id}`, question: '', text: card.why, by: 'device', decision: false});
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [gentleOn, gentleQuiet, gentleGates, counts.tasksDue, counts.habitsLeft, billDue, hudMove.state]);
  // A3: NOVA in a window of its own (a separate window the person can keep beside their work; no install needed).
  const [ownWindow, setOwnWindow] = useState(false);
  useEffect(() => { setOwnWindow(window.name === 'zigoals-nova' || window.matchMedia?.('(display-mode: standalone)').matches === true); }, []);
  const openOwnWindow = () => { const w = window.open('/app/nova', 'zigoals-nova', 'popup=yes,width=1360,height=860'); if (!w) setStatus('This browser did not open a new window. Allow pop-ups for ZIGoals, or install ZIGoals and open NOVA from its shortcut.'); else setStatus('NOVA opened in its own window.'); };
  // The star's beam toward a widget that was just made (decoration; the direction is read from where the widget landed).
  const freshKey = [...stage.fresh].join(' ');
  useEffect(() => {
    if (!freshKey) return;
    const frame = requestAnimationFrame(() => {
      const first = freshKey.split(' ')[0], el = first ? root.current?.querySelector<HTMLElement>(`[data-widget="${first}"]`) : null, orbEl = root.current?.querySelector<HTMLElement>('.nova-orb-button');
      if (!el || !orbEl) return;
      const a = el.getBoundingClientRect(), b = orbEl.getBoundingClientRect();
      setBeam({angle: Math.atan2(-((a.top + a.height / 2) - (b.top + b.height / 2)), (a.left + a.width / 2) - (b.left + b.width / 2)), key: Date.now()});
    });
    return () => cancelAnimationFrame(frame);
  }, [freshKey]);

  // Session AL second pass (lane L8; BN-051): while a model on this computer (or the Hermes Agent) is working on a reply, the
  // HUD holds its ornaments still and the sky draws no motes, so the page leaves the computer's power to the model.
  const modelBusy = (orb === 'thinking' || orb === 'speaking') && (brain.kind === 'local' || brain.kind === 'hermes' || brain.kind === 'device');
  const hudState = holo ? (modelBusy && (hudMove.state === 'full' || hudMove.state === 'calm') ? 'paused' : hudMove.state) : undefined;
  if (!nova.loaded) return <div className="nova-frame" data-accent="violet" data-opening="waiting"><Reading label={`${persona.name} is starting…`}/></div>;
  const core = holo ? {rings: <LoadBoundary quiet><Suspense fallback={null}><HoloCore part="rings"/></Suspense></LoadBoundary>, readout: <LoadBoundary quiet><Suspense fallback={null}><HoloCore part="readout"/></Suspense></LoadBoundary>} : undefined;
  // The star's box: as large as the window's height allows (its disc is about half as tall as it is wide).
  // On the calm stage it is the hero; beside widgets it steps back so the centre column keeps room for NOVA's words.
  const starSize = phone ? 320 : Math.round(Math.max(320, Math.min(stage.shown.length ? (width >= 1280 ? 440 : 380) : (width >= 1280 ? 560 : 460), (height - 360) * 1.02)));
  const star = <LoadBoundary quiet><Suspense fallback={null}><StarSystem state={orb} hud={hudMove.state} accent={accent} phone={phone} size={starSize} beam={beam} onRender={onStarRender}/></Suspense></LoadBoundary>;
  const answerLine = answer && !chatOpen ? <StageAnswerLine answer={answer} persona={persona.name} onOpen={openChat} onDismiss={() => setAnswer(null)}/> : undefined;
  const stageNode = <NovaStage persona={persona} orb={orb} greeting={greeting} typingFrom={opening.phase === 'play' ? opening.startedAt : null} counts={counts} showcase={showcase && phone} onTalk={openChat} talkOpen={chatOpen} core={core} star={star} starOn={starDraws} starBox={Math.round(starSize * 0.42)} answer={answerLine}/>;
  const duoView = duo.active ? <LoadBoundary quiet><Suspense fallback={null}><NovaDuo persona={persona}/></Suspense></LoadBoundary> : null;
  const chat = <LoadBoundary label="The conversation"><Suspense fallback={<Reading label="Opening the conversation…"/>}><NovaChat layout={phone ? 'sheet' : 'panel'} onOrbState={setOrb} onClose={closeChat} focusOnOpen={chatOpen} collapsed={!phone && !chatOpen} stage={bridge}/></Suspense></LoadBoundary>;
  return <div ref={root} className="nova-frame" data-accent={accent} data-layout={layout} data-opening={opening.phase} data-phone={phone || undefined} data-look={look} data-hud-motion={hudState}
    data-left={left} data-right={right} data-stage={stage.shown.length ? 'set' : 'calm'} data-chat={chatOpen || undefined} data-editing={editing || undefined} data-fullscreen={fullscreen || undefined}>
    {/* Second review m8 (lane L8f): the first stop, past the left panel and the top bar (43 stops) to the HUD itself. */}
    <a className="nova-skip" href="#nova-hud" onClick={e => { e.preventDefault(); root.current?.querySelector<HTMLElement>('#nova-hud')?.focus({preventScroll: true}); }}>Skip to the HUD</a>
    <div className="nova-sky zg-aurora" aria-hidden="true"><LoadBoundary quiet><Suspense fallback={null}><Starfield motion={motion && !resting} accent={accent}/></Suspense></LoadBoundary></div>
    {/* Session AL Part 11 (lane L8): the HUD's depth layers — a far grid plane and a near glow at the edges (decoration). */}
    {holo && <div className="holo-depth" aria-hidden="true"><div className="holo-plane"/><div className="holo-glow"/></div>}
    {left !== 'hidden' && <NovaLeft state={left} onCycle={cycleLeft} you={you} brain={brain} counts={counts} pages={p => isShown(pagesView, p)} earn={chain.earnShown} chess={isShown(pagesView, 'chess')} governance={chain.earn.governanceShown === true} chain={chain.chosen}
      persona={persona.name} onNova={openChat} onZigi={() => { if (launcherShown()) askZigi(''); else router.push('/app/zigi'); }} zigiStatus={brain.kind === 'none' ? 'calm' : 'on'} hermes={hermes}/>}
    <div className="nova-centre">
      <NovaTop now={now} persona={persona.name} entries={entries} shortcuts={shortcuts} fullscreen={fullscreen} fullscreenOk={fullscreenOk && !phone}
        handlers={{act, customize: () => setSheet({kind: 'yours'}), fullscreen: toggleFullscreen}} onExit={exit} onDay={() => setSheet({kind: 'day'})} onSearch={() => openSearch()}
        onWorkflows={() => setSheet({kind: 'panels', id: 'workflows'})} onMini={pipOk && !phone ? () => { if (pip) pip.close(); else void openMini(); } : undefined} miniOpen={!!pip} onOwnWindow={!phone && !ownWindow ? openOwnWindow : undefined} leftHidden={left === 'hidden'} onShowLeft={() => save(rr => setLeftPanel(rr, 'open'))}
        rightOpen={right === 'open'} onToggleRight={toggleRight} compact={phone} onQuick={() => setSheet({kind: 'quick'})}/>
      {/* Review fix (lane L8d, NOVA_HUD_REVIEW B2): the status chips, what is running now and the setup invitation share one
          deck that wraps (two slim rows at most on a computer, where they took three and pushed the HUD below the fold). */}
      <div className="nova-deck">
        {!phone && <StatusChips brain={brain} showcase={showcase}/>}
        <LoadBoundary quiet><Suspense fallback={null}><NovaLive/></Suspense></LoadBoundary>
        {/* Session AK P3 (ND-23): the setup invitation, one slim line under the chips (it left the star's stack). */}
        {/* Session AM: the invitation shows on the calm stage; once widgets or an answer are up it steps aside (the guide stays one tap away in the left bar and Behind the intelligence). */}
        {!chatOpen && stage.shown.length === 0 && !answer && <NovaSetupBanner persona={persona.name} brain={brain}/>}
      </div>
      {wake === 'listening' && <p className="nova-wake" role="status"><span className="nova-on-dot" aria-hidden="true"/>Listening for “Hey {persona.name}” on this device</p>}
      <div className="nova-stage-area" id="nova-hud" tabIndex={-1}>{phone && !holo ? stageNode : <WidgetGrid layout={layout} widgets={stage.shown} live={stage} stage={stageNode} editing={editing && !phone} opening={opening.phase === 'play'} actions={actions} look={look} phone={phone} motes={holo && hudMove.motes && !modelBusy && !resting}/>}</div>
      {duoView && !phone && <div className="nova-duo-slot">{duoView}</div>}
      {editing && <div className="nova-editbar" role="region" aria-label="Arranging widgets"><p>Drag a widget by its grip, or use its buttons or the arrow keys on the grip. Esc when done.</p><button type="button" className="nova-btn nova-btn-primary" onClick={() => setEditing(false)}>Done</button></div>}
      <div className="nova-foot">
        {/* Session AM (D7): the conversation stays mounted on a computer (folded while the stage answers in place), so a reply keeps streaming and is there when it opens. */}
        {!phone && <div id="nova-talk" className="nova-talk" role="region" aria-label={`Conversation with ${persona.name}`} hidden={!chatOpen}>{chat}</div>}
        {!chatOpen && !editing && <div className="ns-strip"><OneTap available={canShow} onAsk={askInPlace}/>{!phone && <StageDock docked={stage.docked} onShow={stage.show}/>}</div>}
        {!chatOpen && <div className="nova-foot-row">
          {!phone && <ViewControls layout={layout} widgets={widgets} available={available} editing={editing} onLayout={l => save(rr => setLayout(rr, l), `${l[0]!.toUpperCase()}${l.slice(1)} layout.`)} onToggle={toggleWidget}
            onSize={actions.resize} onArrange={() => setEditing(v => !v)} extra={<PresetPicker compact shown={shownPreset} onApply={applyPreset}/>}/>}
          {/* Session AL second pass (P-TK-41): the shortcuts are discoverable — the field's "?" button and the "?" key open their list. */}
          <CommandField you={you} persona={persona.name} inputRef={command} onOpen={sent => { if (!sent) inPlace.current = false; if (phone || !sent) openChat(); }} onBeforeSend={() => { inPlace.current = !phone; }} onMic={() => { openChat(); window.setTimeout(() => root.current?.querySelector<HTMLElement>('.nova-talk .nova-mic, .nova-sheet .nova-mic')?.focus(), 350); }} value={draft} onValue={setDraft} onKeys={phone ? undefined : () => setSheet({kind: 'keys'})} keysOn={shortcuts}/>
          {/* Release review 2 (R2-3): model routing appears once a brain is connected (with none, there is nothing to route). */}
          {!phone && brain.kind !== 'none' && <RoutingMenu brain={brain} routing={routingOf(r)} onRouting={rt => save(rr => setRouting(rr, rt), rt === 'auto' ? 'Automatic: your connected brain answers.' : undefined)} openModels={() => setSheet({kind: 'panels', id: 'models'})}/>}
        </div>}
      </div>
    </div>
    {right === 'open' && <LoadBoundary label="Behind the intelligence"><Suspense fallback={<aside role="region" className="nova-right" aria-label="Behind the intelligence" aria-busy="true"><Reading label="Reading…"/></aside>}>
      <NovaRight folded={panels.folded} onFold={(id, f) => save(rr => foldSection(rr, id, f))} onHide={() => save(rr => setRightPanel(rr, 'hidden'))} persona={persona.name} brain={brain} counts={counts} hermes={hermes}
        onTalk={openChat} wake={wakeOn(r)} onWake={on => save(rr => setWake(rr, on), on ? `${persona.name} listens for its name on this device.` : 'Wake phrase off.')} openPanel={id => setSheet({kind: 'panels', id})} stage={stage}/>
    </Suspense></LoadBoundary>}
    {chatOpen && phone && <NovaSheet title={persona.name} eyebrow="Your conversation" place="bottom" onClose={closeChat}>{duoView}{chat}</NovaSheet>}
    {sheet?.kind === 'day' && <NovaSheet title="Your day" eyebrow="Morning brief and evening recap" place="right" onClose={closeSheet}><LoadBoundary label="Your day"><Suspense fallback={<Reading label="Reading your day…"/>}><NovaBriefs/></Suspense></LoadBoundary></NovaSheet>}
    {sheet?.kind === 'panels' && <NovaSheet title={`${persona.name}’s panels`} eyebrow="Memory, permissions, activity, workflows, cost, models" place="right" wide onClose={closeSheet}><LoadBoundary label="The panels"><Suspense fallback={<Reading label="Opening…"/>}><NovaPanels initial={sheet.id}/></Suspense></LoadBoundary></NovaSheet>}
    {sheet?.kind === 'yours' && <NovaSheet title={`Make ${persona.name} yours`} eyebrow="On this device" place="right" wide onClose={closeSheet}><LoadBoundary label="Make it yours"><Suspense fallback={<Reading label="Opening…"/>}>
      <MakeItYours record={r} save={save} entries={entries} status={status} hud={{look, onLook: setLook, preset: shownPreset, onPreset: applyPreset}} onReplay={() => { closeSheet(); requestAnimationFrame(() => { if (!opening.replay()) setStatus(openingSkippedNote(motionLevel)); }); }}/>
    </Suspense></LoadBoundary></NovaSheet>}
    {sheet?.kind === 'quick' && <NovaSheet title="Quick access" place="bottom" onClose={closeSheet}>{/* Session AL (P-LA-29, landmark-unique): its own name, apart from the top bar's grid. */}<nav aria-label="Every entry"><ul className="nova-quick-sheet">
      {entries.filter(e => !e.hidden).map(e => <li key={e.id}><QuickTile entry={e} shortcuts={false} labelled act={entry => { closeSheet(); act(entry); }}/></li>)}
      <li><button type="button" className="nova-tile nova-tile-labelled" onClick={() => setSheet({kind: 'yours'})}><span className="nova-tile-planet" aria-hidden="true"><NovaIcon name="yours" size={20}/></span><span className="nova-tile-label">Customize</span></button></li>
    </ul></nav></NovaSheet>}
    {sheet?.kind === 'actions' && <NovaSheet title={`Quick actions · ${title(sheet.id)}`} eyebrow="Saves to your records · Undo" place={phone ? 'bottom' : 'right'} onClose={closeSheet}>
      <LoadBoundary label="Quick actions"><Suspense fallback={<Reading label="Opening…"/>}><QuickActions widget={sheet.id}/></Suspense></LoadBoundary>
      {widgetSpec(sheet.id) && <p className="nova-row-actions"><a className="nova-btn" href={widgetSpec(sheet.id)!.href} onClick={e => { if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); const href = widgetSpec(sheet.id)!.href; closeSheet(); router.push(href); }}>{widgetSpec(sheet.id)!.open}</a></p>}
    </NovaSheet>}
    {sheet?.kind === 'keys' && <NovaSheet title="Keyboard shortcuts" eyebrow={`While ${persona.name} is open`} place="right" onClose={closeSheet}><LoadBoundary label="Keyboard shortcuts"><Suspense fallback={<Reading label="Opening…"/>}>
      <ShortcutList entries={entries} on={shortcuts} panels={!phone} persona={persona.name} onCustomize={() => setSheet({kind: 'yours'})}/>
    </Suspense></LoadBoundary></NovaSheet>}
    {pip && <LoadBoundary quiet><Suspense fallback={null}><NovaMiniWindow win={pip} persona={persona.name} orb={orb} accent={accent}/></Suspense></LoadBoundary>}
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
  </div>;
}

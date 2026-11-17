'use client';
import {useRouter} from 'next/navigation';
import {Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type UIEvent} from 'react';
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
import {starPlan} from '../../lib/nova/compose';
import {STAR_NO_CODE_TEXT, STAR_WAIT_MS} from '../../lib/nova/core/no-code';
import {HUD_PRESET_LABEL, HUD_PRESET_PLAN, phoneColumn, presetShown, presetWidgets, setHudLook, setHudPreset, type HudLook, type HudPreset} from '../../lib/nova/layout';
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
import {useMinuteClock, useNova, useNovaMotionLevel} from './use-nova';
import {useOpening} from './use-opening';
import {useWakePhrase} from './use-wake';
import {WidgetGrid, type GridActions} from './widget-grid';
import {OneTap, StageAnswerLine, StageDock} from './stage/stage-parts';
import {useStage, type StageGates} from './stage/use-stage';
import {usePhoneFirst} from './stage/use-phone-first';
import type {StageAnswer, StageBridge} from './stage/use-summoner';
import type {StarBeam} from './core/star-system';
import {useResting} from './core/use-resting';
import type {StarReport} from './core/star-system';
import {starDebug} from '../../lib/nova/core/star-debug';
import {StageDepth, StageHud} from './stage/command-centre';
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
// Security review AM-S12: the made widgets' gates while the conversation is not mounted (a phone with its sheet closed).
const StageGatesWatch = lazy(() => import('./stage/stage-gates'));
/** Session AM-3 (round 6): a phone's stage — the star's bezel with the four pillar arcs and the strip of instrument cards (its own chunk; only a phone loads it). */
const PhoneStage = lazy(() => import('./stage/phone-stage'));

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
/** Session AM (design review AM-D5, AM-D6): the stage's own size (the room left under the top bar and the deck, above the
 *  command bar, between the bars), so the star is sized by what is really there. The stage's size never depends on the star's. */
function useHudSize(frame: {current: HTMLElement | null}, ready: boolean): {height: number; width: number} | null {
  const [hud, setHud] = useState<{height: number; width: number} | null>(null);
  useEffect(() => {
    const el = frame.current?.querySelector<HTMLElement>('#nova-hud');
    if (!el || typeof ResizeObserver === 'undefined') return;
    const read = () => setHud(was => was && was.height === el.clientHeight && was.width === el.clientWidth ? was : {height: el.clientHeight, width: el.clientWidth});
    read();
    const observer = new ResizeObserver(read); observer.observe(el);
    return () => observer.disconnect();
  }, [frame, ready]);
  return hud;
}
/**
 * Round 7 (critic B: "the star's ring and arms are cut by the panels; column widths differ"): the width of the star's own
 * column as it is drawn. A wing that holds a wide panel takes more of the row (holo.css `data-wide`), so the column is
 * measured, not assumed; null until the three-column stage is there.
 */
function useStarColumn(frame: {current: HTMLElement | null}, on: boolean): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = on ? frame.current?.querySelector<HTMLElement>('.nova-orbit-centre') : null;
    if (!el || typeof ResizeObserver === 'undefined') { setWidth(null); return; }
    const read = () => setWidth(was => was === el.clientWidth ? was : el.clientWidth);
    read();
    const observer = new ResizeObserver(read); observer.observe(el);
    return () => observer.disconnect();
  }, [frame, on]);
  return width;
}
/**
 * Session AM-2 (conversation console): how wide the stage's right wing is, measured from its inner edge to the centre's
 * right edge, while the console stands over it. The console takes exactly that wing's place, so the left wing and the
 * star keep their boxes and nothing is cut by the console's edge. Null while there is no wing to read.
 */
function useWingWidth(frame: {current: HTMLElement | null}, on: boolean): number | null {
  const [wing, setWing] = useState<number | null>(null);
  useLayoutEffect(() => { // before the paint, so the console opens at its measured width
    const centre = frame.current?.querySelector<HTMLElement>('.nova-centre'), main = frame.current?.querySelector<HTMLElement>('.nova-orbit-main');
    if (!on || !centre || !main || typeof ResizeObserver === 'undefined') { setWing(null); return; }
    const read = () => {
      const side = main.querySelector<HTMLElement>(':scope > .nova-orbit-side[data-side=right]'), star = main.querySelector<HTMLElement>(':scope > .nova-orbit-centre');
      if (!side || !star) { setWing(null); return; }
      // From the middle of the gap between the star's column and the wing to the centre's right edge.
      const starRight = star.getBoundingClientRect().right, wingLeft = side.getBoundingClientRect().left;
      if (wingLeft < starRight) { setWing(null); return; } // the wing is not beside the star (one column): the console keeps its own width
      const from = (starRight + wingLeft) / 2, next = Math.round(centre.getBoundingClientRect().right - from);
      setWing(was => was === next ? was : next);
    };
    read();
    const observer = new ResizeObserver(read); observer.observe(main); observer.observe(centre);
    return () => observer.disconnect();
  }, [frame, on]);
  return wing;
}
/** The console's width in the wing's place: the wing's own width, never narrower than a conversation needs or wider than it reads well. */
const CONSOLE_MIN = 400, CONSOLE_MAX = 680;
/**
 * Session AM (design review AM-D7): under 1600 px of window only one side bar is open at a time (with both open at 1440 the
 * stage was 815 px and a made widget landed under the fold). Opening one folds the other (the left to its rail, the right
 * away), and that is saved as the person's choice; a record that still says both are open shows the left bar as its rail.
 */
const ONE_BAR_BELOW = 1600;
/** Session AM-2 (conversation console): from this window width the open conversation is the docked console. */
const CONSOLE_FROM = 1280;
function barsAt(r: NovaRecord, width: number) {
  const p = panelsOf(r, width);
  return {...p, left: p.left === 'open' && p.right === 'open' && width < ONE_BAR_BELOW ? 'rail' as const : p.left};
}

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
  const motionLevel = useNovaMotionLevel(), motion = loopRuns(motionLevel), now = useMinuteClock(), width = useWidth(), height = useHeight(), phone = width <= 640;
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
  const hudSize = useHudSize(root, nova.loaded);
  // Session AM-3 (round 6; the phone's stage): what the window leaves for a phone's first screen (stage/use-phone-first.ts).
  const phoneFirst = usePhoneFirst(root, phone && holo && nova.loaded);
  // Session AM-2 (ADR-038 "AM-2", E3, E4): what stands in the centre (the star, its still picture, or the SVG orb) and the honest line under it.
  const [starReport, setStarReport] = useState<StarReport | null>(null), starDraws = !!starReport && starReport.shows !== 'orb';
  const onStarReport = useCallback((report: StarReport) => setStarReport(report), []);
  // Session AR (ADR-038 Q12, round 7: "the band's heading and lower row are sliced by the strips above and below with no
  // fade"): while the stage is scrolled its top and bottom edges fade (stage/command-centre.css). The mark is written on
  // the element itself when it changes (no render, nothing per frame); at rest, unscrolled, there is no mask at all.
  const markScrolled = useCallback((event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget, on = el.scrollTop > 8;
    if ((el.dataset.scrolled !== undefined) !== on) { if (on) el.dataset.scrolled = ''; else delete el.dataset.scrolled; }
  }, []);
  // Session AR (ADR-041 P4; ADR-038 Q12, carried): while the star starts, its stand-in is the star's own bezel with a dim
  // core (it was the small SVG orb, a different object). A star whose code fails to load, or has not arrived after
  // STAR_WAIT_MS, is the galaxy's still picture with its honest line; if it arrives after all, the star takes over.
  const [starMounted, setStarMounted] = useState(false), [starFailed, setStarFailed] = useState(false), [starWaited, setStarWaited] = useState(false);
  const onStarMount = useCallback(() => setStarMounted(true), []), onStarFail = useCallback(() => setStarFailed(true), []);
  useEffect(() => {
    if (starMounted || starFailed) return;
    const timer = window.setTimeout(() => setStarWaited(true), STAR_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [starMounted, starFailed]);
  const starLost = !starReport && (starFailed || (starWaited && !starMounted)), starStandIn = starReport ? undefined : starLost ? 'picture' as const : 'starting' as const;
  const [starHold] = useState(() => starDebug().hold);

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
  const measuredColumn = useStarColumn(root, nova.loaded && stage.shown.length > 0);
  const [answer, setAnswer] = useState<StageAnswer | null>(null), [beam, setBeam] = useState<StarBeam | null>(null), inPlace = useRef(false);
  const [beamLine, setBeamLine] = useState<{x: number; y: number; length: number; turn: number; key: number} | null>(null), beamTimer = useRef(0), beamRuns = useRef(false), [stageOrb, setStageOrb] = useState<NovaOrbState | null>(null), [lastMade, setLastMade] = useState<string | null>(null);
  // Design review AM-D30: an answer that speaks for widgets is gone once none of them is on the stage (closed, cleared, expired).
  const answerNow = answer && answer.widgets?.length && !answer.widgets.some(id => stage.shown.some(w => w.id === id) || stage.docked.some(w => w.id === id)) ? null : answer;
  const entries = useMemo(() => dockEntries(r, {pageShown: page => isShown(pagesView, page), earn: chain.earnShown}), [r, pagesView, chain.earnShown]);
  // Design review AM-D17: from 1100 px the open conversation is a column docked on the right, in the right bar's place; under
  // 1600 px the left bar shows as its rail while it is open (one open bar at a time; the stored choice is untouched).
  // Session AM-2 (conversation console, deliberate): the docked conversation is a console from 1280 px of window (it was a
  // 420 px column from 1100 px that squeezed the stage's three columns). On the orbit with widgets it stands OVER the
  // stage in the right wing's place (`over`): the left wing and the star keep their boxes, the wing under it rests. On
  // every other stage (calm, Bento, Focus, Minimal) the stage steps aside for it (`beside`).
  const panels = barsAt(r, width), chatDocked = chatOpen && !phone && width >= CONSOLE_FROM;
  const consoleOver = chatDocked && layout === 'orbit' && stage.shown.length > 0 && !editing, wing = useWingWidth(root, consoleOver);
  const consoleMode = !chatDocked ? undefined : consoleOver ? 'over' : 'beside';
  const consoleStyle = consoleMode === 'over' && wing !== null ? {'--ncx-w': `${Math.max(CONSOLE_MIN, Math.min(CONSOLE_MAX, wing!))}px`} as CSSProperties : undefined;
  const left = phone ? 'hidden' : chatDocked && width < ONE_BAR_BELOW && panels.left === 'open' ? 'rail' : panels.left, right = phone ? 'hidden' : panels.right;

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
  // Design review AM-D7: one open side bar at a time under 1600 px (see barsAt).
  const showLeft = useCallback((rr: NovaRecord, next: ReturnType<typeof nextLeft>) => { const w = window.innerWidth, moved = setLeftPanel(rr, next); return next === 'open' && w < ONE_BAR_BELOW && panelsOf(rr, w).right === 'open' ? setRightPanel(moved, 'hidden') : moved; }, []);
  const cycleLeft = useCallback(() => save(rr => showLeft(rr, nextLeft(barsAt(rr, window.innerWidth).left)), undefined), [save, showLeft]);
  const toggleRight = useCallback(() => save(rr => {
    const w = window.innerWidth, p = barsAt(rr, w);
    if (p.right === 'open') return setRightPanel(rr, 'hidden');
    const opened = setRightPanel(rr, 'open');
    return w < ONE_BAR_BELOW && p.left === 'open' ? setLeftPanel(opened, 'rail') : opened;
  }), [save]);

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
        // Design review AM-D35: Esc closes what is open first — NOVA's answer under the star, then words waiting in the
        // command field; it leaves NOVA only from a stage with nothing open (one stray key no longer closes a busy stage).
        if (answer) { setAnswer(null); setStatus('Answer closed.'); return; }
        if (draft) { setDraft(''); return; }
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
  }, [editing, chatOpen, answer, draft, shortcuts, phone, entries, act, exit, closeChat, cycleLeft, toggleRight, finishOpening]);

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
  // Session AM-2 (found by both widget passes: made widgets said "Reading…" for ten seconds and more): on a computer the
  // gates were published by the conversation alone, and its large chunk mounts seconds after the stage. The small gate
  // watcher (stage/stage-gates.tsx: the same rule from the same settings, permissions and records; AM-S2, AM-S12) now
  // publishes them on a computer too until the conversation has published its own. "Not known yet" (null) never
  // replaces known gates on a computer (there the conversation stays mounted and answers every later change with real
  // gates); a phone keeps the old order, where its sheet unmounts and the watcher takes over.
  const [chatHasGates, setChatHasGates] = useState(false);
  const publishGates = useRef((g: StageGates | null) => { void g; });
  publishGates.current = (g: StageGates | null) => {
    if (g === null && !bridgeLive.current.phone && gatesKey.current && gatesKey.current !== 'null') return;
    const key = JSON.stringify(g); if (key !== gatesKey.current) { gatesKey.current = key; bridgeLive.current.stage.setGates(g); }
  };
  const watchGates = useCallback((g: StageGates | null) => publishGates.current(g), []);
  const [bridge] = useState<StageBridge>(() => ({
    get device() { return bridgeLive.current.phone ? 'phone' as const : 'computer' as const; },
    available: id => bridgeLive.current.canShow(id),
    make: (requests, ask) => { const {phone: onPhone, stage: st} = bridgeLive.current; if (onPhone) { if (ask) st.noteAsk(ask, requests); return false; } return st.make(requests, ask); },
    command: c => bridgeLive.current.phone ? false : bridgeLive.current.stage.command(c), // a phone has no stage (AM-S6)
    gateOpen: id => { const g = widgetSpec(id)?.gate, gates = bridgeLive.current.stage.gates; return !g || (!!gates && gates[g]); },
    arrangement: preset => bridgeLive.current.applyPreset(preset), noteAsk: (ask, made) => bridgeLive.current.stage.noteAsk(ask, made),
    setGates: (g: StageGates | null) => { if (g) setChatHasGates(true); publishGates.current(g); },
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
  const gentleOn = stage.loaded && proactiveOn(stage.record.data), gentleQuiet = !phone && !chatOpen && !editing && !answerNow && !draft && stage.fresh.size === 0 && hudMove.state !== 'paused';
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
      if (freshKey.split(' ')[0]) setLastMade(freshKey.split(' ')[0]!);
      const first = freshKey.split(' ')[0], el = first ? root.current?.querySelector<HTMLElement>(`[data-widget="${first}"]`) : null, orbEl = root.current?.querySelector<HTMLElement>('.nova-orb-button');
      if (!el || !orbEl) return;
      const a = el.getBoundingClientRect(), b = orbEl.getBoundingClientRect();
      const sx = b.left + b.width / 2, sy = b.top + b.height / 2, tx = a.left + a.width / 2, ty = a.top + a.height / 2, key = Date.now();
      setBeam({angle: Math.atan2(-(ty - sy), tx - sx), key});
      // Design review AM-D15: the beam is seen all the way, from the star's core to the edge of the widget it made (a
      // hairline over the stage, decoration only; none in Calm's slower stage, with motion off or reduced, or on a phone).
      if (!beamRuns.current) return;
      const dx = tx - sx, dy = ty - sy, reach = Math.min(dx ? (a.width / 2) / Math.abs(dx) : Infinity, dy ? (a.height / 2) / Math.abs(dy) : Infinity);
      const length = Math.hypot(dx, dy) * Math.max(0, 1 - Math.min(1, reach));
      if (length < 40) return;
      setBeamLine({x: sx, y: sy, length, turn: Math.atan2(dy, dx), key});
      window.clearTimeout(beamTimer.current);
      beamTimer.current = window.setTimeout(() => setBeamLine(null), 1100);
    });
    return () => cancelAnimationFrame(frame);
  }, [freshKey]);
  useEffect(() => () => window.clearTimeout(beamTimer.current), []);
  // Design review AM-D15: the star shows what NOVA is doing for a typed or tapped request too. A request the stage answers
  // itself has no model at work, so the stage holds "thinking" for a moment and "speaking" while the answer is new; the
  // conversation's own state (a model listening, thinking, speaking) always leads.
  beamRuns.current = hudMove.state === 'full' && !phone;
  // Session AR (ADR-041 S2): the star's change of size when the stage fills or empties is one short motion — the canvas
  // takes its new size at once and the star's button eases from the old scale to the new (a transform; nothing else is
  // animated). Motion Off, reduced motion, a resting or hidden HUD and a window resize are instant.
  const starNow = useRef<{size: number; count: number; move: boolean} | null>(null), starWas = useRef<{size: number; count: number} | null>(null);
  useLayoutEffect(() => {
    const now = starNow.current, was = starWas.current;
    if (!now) return;
    starWas.current = {size: now.size, count: now.count};
    if (!was || !now.move || was.size === now.size || was.count === now.count) return;
    const el = root.current?.querySelector<HTMLElement>('.nova-orb-button[data-star]');
    if (!el || typeof el.animate !== 'function') return;
    el.animate([{transform: `scale(${(was.size / now.size).toFixed(4)})`}, {transform: 'none'}], {duration: 620, easing: 'cubic-bezier(.2, .7, .2, 1)'});
  });
  const answerKey = answerNow && !chatOpen ? answerNow.id : '';
  useEffect(() => {
    if (!freshKey && !answerKey) return;
    const timers = [window.setTimeout(() => setStageOrb('thinking'), 0), window.setTimeout(() => setStageOrb('speaking'), 340), window.setTimeout(() => setStageOrb(null), 2400)];
    return () => { for (const t of timers) window.clearTimeout(t); };
  }, [freshKey, answerKey]);
  const shownOrb: NovaOrbState = starHold ?? (orb !== 'idle' ? orb : stageOrb ?? 'idle');

  // Session AL second pass (lane L8; BN-051): while a model on this computer (or the Hermes Agent) is working on a reply, the
  // HUD holds its ornaments still and the sky draws no motes, so the page leaves the computer's power to the model.
  const modelBusy = (orb === 'thinking' || orb === 'speaking') && (brain.kind === 'local' || brain.kind === 'hermes' || brain.kind === 'device');
  // Session AM-2 (ADR-038 "AM-2", J1; owner addition B2): at rest (the window not focused, or 30 s without a key, tap or
  // request) the HUD's ambient loops hold too, so an idle NOVA costs next to nothing; the star keeps its slow resting pace.
  // `soft`: the browser draws without graphics hardware — every animated frame is the processor's work, so the ambient
  // layer stays light there (no sheen, no pings, a still sky, flat wings; stage/command-centre.css). The star still runs.
  const soft = !!starReport?.software;
  const hudState = holo ? ((modelBusy || resting) && (hudMove.state === 'full' || hudMove.state === 'calm') ? 'paused' : hudMove.state) : undefined;
  if (!nova.loaded) return <div className="nova-frame nova-waiting" data-accent="violet" data-opening="waiting"><span className="nova-waiting-star" aria-hidden="true"/><Reading label={`${persona.name} is starting…`}/></div>;
  const core = holo ? {rings: <LoadBoundary quiet><Suspense fallback={null}>{phone ? <PhoneStage part="bezel" state={shownOrb}/> : <HoloCore part="rings"/>}</Suspense></LoadBoundary>, readout: <LoadBoundary quiet><Suspense fallback={null}><HoloCore part="readout"/></Suspense></LoadBoundary>} : undefined;
  // The star's box: as large as the window's height allows (its disc is about half as tall as it is wide).
  // On the calm stage it is the hero; beside widgets it steps back so the centre column keeps room for NOVA's words.
  // Design review AM-D5, AM-D6, AM-D14: the star gives way first. Its disc (0.46 of its box since round 7; it was 0.42) gets what the stage's height
  // leaves after the slot kept for NOVA's words under it (nova.css `--ns-slot`, by the same three steps) and the name
  // above it, down to 240 px; a tablet's stage with widgets keeps a 300 px star above its two columns.
  // The star's box in the stack is the calm stage's at every moment (the nebula inside it steps back beside widgets), so
  // NOVA's name and state do not move when the first widget is made.
  // Beside widgets the nebula keeps to the star's own column (about a third of the stage), so it never lies over a widget.
  const hudRoom = (hudSize?.height ?? height - 300) - 26, hudWide = hudSize?.width ?? width - 300, starSlot = hudRoom <= 520 ? 204 : hudRoom >= 640 ? 252 : 228, starRoom = (hudRoom - starSlot - 124) / 0.46;
  // Session AM-2 (ADR-038 "AM-2", G3): the star is larger — the hero of a calm stage (up to 940 px on a wide window) and
  // still large beside widgets, where its light now lies behind the widgets' glass instead of stopping at its column.
  // Round 7 (both critics: "the calm star fills a quarter of the width; at 1024 it is a thumbnail"): the calm star is a fifth larger, and a narrow stage's star may be 440 px (it was 360).
  const starCalm = width >= 2200 ? 1120 : width >= 1700 ? 900 : width >= 1280 ? 680 : 480, starCapWide = hudWide >= 1100 ? starCalm : hudWide >= 960 ? 440 : 340;
  // Beside widgets the star keeps to its own column (the widest of the three: holo.css), a little over its width, so the
  // galaxy's arms and its bezel are whole between the wings (the second critique: "the rings are cut by the frames").
  // Session AM-2 (N3a, the third critique: "the star is ~550 px of 2560 with empty bands above and below"): from 1700 px
  // of stage the star's column is the widest by half (holo.css: 1fr 1.5fr 1fr), and beside widgets the star may be as
  // large as on the calm stage wherever that column holds it.
  const starColumn = measuredColumn && measuredColumn > 120 && hudWide > 900 ? measuredColumn : hudWide >= 1700 ? (hudWide - 56) * 1.5 / 3.5 : hudWide > 900 ? (hudWide - 40) * 1.1 / 3.1 : hudWide;
  // Round 7 ("at 1440 the star shrinks to an ornament"): below 1700 px of stage the star may be wider than its column by
  // almost half; its arms dissolve toward the wings (the shader's uEdge) and its bezel stays inside the column.
  const starCap = stage.shown.length ? Math.min(starCapWide, Math.max(300, Math.round(starColumn * (hudWide >= 1700 ? 1.15 : hudWide >= 1100 ? 1.45 : 1.15)))) : starCalm;
  // Session AM-2 (conversation console): beside the console the star keeps to its own column (the console is not glass:
  // nothing of the star may lie behind it), so its ellipse is whole beside the console.
  const starCapNow = consoleMode === 'over' ? Math.min(starCap, Math.max(300, Math.round(starColumn * 1.06))) : starCap;
  // Session AR (ADR-041 S1, S2, "the star makes room"): on the composed stage (the Holo orbit on a computer, three columns
  // with room for a hero: lib/nova/compose.ts) the star's column and size follow how full the stage is. With one or two
  // widgets it is the large star (its bezel at least 45 % of the stage where the wings keep their least width); from three
  // widgets it steps down, and from six it is exactly the size and column it had before this session (`floor`). The
  // column always holds the whole bezel, so no widget covers it and the star lies over no widget's content.
  const stageInner = Math.min(hudWide - 40, hudWide - 40 >= 1700 ? 2320 : 1560), composedStage = holo && !phone && layout === 'orbit' && !editing && stage.shown.length > 0 && stageInner > 1040;
  const floorColumn = stageInner >= 1700 ? (stageInner - 56) * 1.5 / 3.5 : (stageInner - 40) * 1.1 / 3.1;
  const floorSize = Math.round(Math.max(240, Math.min(Math.min(starCapWide, Math.max(300, Math.round(floorColumn * (stageInner >= 1700 ? 1.15 : 1.45)))), starRoom)));
  // The large star gets the room the name's row really takes (88 px, not the 124 px kept beside a full stage).
  const starRoomLarge = (hudRoom - starSlot - 88) / 0.46;
  const plan = composedStage ? starPlan({count: consoleMode === 'over' ? 99 : stage.shown.length, floorSize, floorColumn, room: starRoomLarge, stage: stageInner, gap: stageInner >= 1700 ? 28 : 20}) : null;
  // Session AM-3 (round 6; the phone's stage, deliberate): on a phone the star is the hero inside its own bezel (the tick
  // ring and the four pillar arcs, stage/phone-stage.tsx), as wide as the phone allows (four fifths of its width, up to
  // 320 px) and as tall as the first screen leaves after NOVA's words and the strip of instrument cards under it; the
  // first screen is measured (stage/use-phone-first.ts), so nothing is left empty between the words and the keys.
  const phoneIds = new Set(phone && holo ? phoneColumn(layout, stage.shown).map(w => w.id) : []), phoneWidgets = stage.shown.filter(w => phoneIds.has(w.id)), phoneSays = !!answerNow && !chatOpen;
  // Round 7 (hud-motion, "reduced motion: the HUD is fully still (phone)"): a still star always says why (Motion Off, reduced
  // motion), so its line's room is kept from the first render; the star's own report used to shrink the star a moment after
  // its still frame was drawn, and the frame was drawn again.
  const phoneUnder = (phoneSays ? 197 : width < 360 ? 99 : 75) + (showcase ? 38 : 0) + (hudMove.state === 'still' || (starReport && (starReport.why || starReport.always)) ? 22 : 0) + (phoneWidgets.length ? 102 : 0) + 6;
  const phoneD = Math.round(Math.max(150, Math.min(width * .8, 320, (phoneFirst ?? height - (height >= 740 ? 290 : 205)) - phoneUnder)));
  // Session AR (S2): the calm stage's star is the large star too (the same room), so the first widget made beside it does not make it jump.
  const calmSize = Math.round(Math.max(240, Math.min(starCalm, holo && !phone && layout === 'orbit' && hudWide - 40 > 1040 ? starRoomLarge : starRoom)));
  const starSize = phone ? (holo ? Math.min(340, Math.round(phoneD * 1.12)) : 300) : plan ? plan.size : stage.shown.length ? Math.round(Math.max(240, Math.min(starCapNow, starRoom))) : calmSize, starBox = phone ? (holo ? phoneD : 126) : plan ? Math.round(plan.size * 0.46) : Math.round(Math.max(240, Math.min(hudWide > 900 ? (stage.shown.length ? starCalm : calmSize) : starCap, stage.shown.length ? starRoom : calmSize)) * 0.46); // round 7: 0.46 of the star (it was 0.42), so the words under it clear the bezel
  starNow.current = {size: starSize, count: stage.shown.length, move: !phone && !!plan && hudMove.state === 'full'};
  const star = <LoadBoundary quiet onFail={onStarFail}><Suspense fallback={null}><StarSystem state={shownOrb} hud={hudMove.state} accent={accent} phone={phone} size={starSize} column={plan ? plan.column : stage.shown.length && !phone && hudWide > 900 ? Math.round(starColumn) : undefined} beam={beam} onReport={onStarReport} onMount={onStarMount}/></Suspense></LoadBoundary>;
  const starWhy = starLost ? {kind: 'picture', text: STAR_NO_CODE_TEXT} : starReport && (starReport.why || starReport.always) ? {kind: starReport.why?.kind ?? 'running', text: starReport.why?.text ?? 'The star is running', details: starReport.details, open: starReport.always} : null;
  // Design review AM-D18: from the answer, one keypress to the widget it made (the newest one that is still on the stage).
  const answerWidget = lastMade && stage.shown.some(w => w.id === lastMade) ? {id: lastMade, title: widgetSpec(lastMade)?.title ?? 'the widget'} : null;
  const goToWidget = (id: string) => { const el = root.current?.querySelector<HTMLElement>(`article[data-widget="${id}"]`); if (el) { el.scrollIntoView({block: 'nearest'}); el.focus({preventScroll: true}); } };
  const answerLine = answerNow && !chatOpen ? <StageAnswerLine answer={answerNow} persona={persona.name} onOpen={openChat} onDismiss={() => setAnswer(null)} widget={answerWidget} onGoTo={goToWidget}/> : undefined;
  const stageNode = <NovaStage persona={persona} orb={shownOrb} greeting={greeting} typingFrom={opening.phase === 'play' ? opening.startedAt : null} counts={counts} showcase={showcase && phone} onTalk={openChat} talkOpen={chatOpen} core={core} star={star} starOn={starDraws} starStandIn={starStandIn} accent={accent} starBox={starBox} starSize={starSize} starColumn={plan ? plan.column : stage.shown.length && !phone && hudWide > 900 ? Math.round(starColumn) : undefined} starWhy={starWhy} answer={answerLine}/>;
  // Session AM-3 (round 6): a phone's first screen is the star with its words and, under them, the widgets on the stage as
  // one strip of instrument cards that swipes sideways; the full panels follow under the fold, as before.
  const phoneStage = phone && holo ? <div className="ps-first">{stageNode}<LoadBoundary quiet><Suspense fallback={null}><PhoneStage part="strip" widgets={phoneWidgets} gateOpen={stage.gateOpen} counts={counts}/></Suspense></LoadBoundary></div> : stageNode;
  const frameStyle = phone && holo ? {'--ps-d': `${phoneD}px`, ...(phoneFirst !== null ? {'--ps-first': `${phoneFirst}px`} : {})} as CSSProperties : consoleStyle;
  const duoView = duo.active ? <LoadBoundary quiet><Suspense fallback={null}><NovaDuo persona={persona}/></Suspense></LoadBoundary> : null;
  const chat = <LoadBoundary label="The conversation"><Suspense fallback={<Reading label="Opening the conversation…"/>}><NovaChat layout={phone ? 'sheet' : 'panel'} onOrbState={setOrb} onClose={closeChat} focusOnOpen={chatOpen} collapsed={!phone && !chatOpen} stage={bridge}
    requests={<OneTap available={canShow} onAsk={askInPlace}/>}/></Suspense></LoadBoundary>;
  return <div ref={root} className="nova-frame" data-accent={accent} data-layout={layout} data-opening={opening.phase} data-phone={phone || undefined} data-look={look} data-hud-motion={hudState}
    data-left={left} data-right={right} data-stage={stage.shown.length ? 'set' : 'calm'} data-fill={composedStage && stage.shown.length > 2 ? 'full' : undefined} data-chat={chatOpen || undefined} data-console={consoleMode} style={frameStyle} data-editing={editing || undefined} data-fullscreen={fullscreen || undefined} data-soft={soft || undefined}>
    {/* Second review m8 (lane L8f): the first stop, past the left panel and the top bar (43 stops) to the HUD itself. */}
    <a className="nova-skip" href="#nova-hud" onClick={e => { e.preventDefault(); root.current?.querySelector<HTMLElement>('#nova-hud')?.focus({preventScroll: true}); }}>Skip to the HUD</a>
    <div className="nova-sky zg-aurora" aria-hidden="true"><LoadBoundary quiet><Suspense fallback={null}><Starfield motion={motion && !resting && !soft} accent={accent}/></Suspense></LoadBoundary></div>
    {/* Session AL Part 11 (lane L8): the HUD's depth layers — a far grid plane and a near glow at the edges (decoration). */}
    {holo && <div className="holo-depth" aria-hidden="true"><StageDepth/><div className="holo-plane"/><div className="holo-glow"/></div>}
    {left !== 'hidden' && <NovaLeft state={left} onCycle={cycleLeft} you={you} brain={brain} counts={counts} pages={p => isShown(pagesView, p)} earn={chain.earnShown} chess={isShown(pagesView, 'chess')} governance={chain.earn.governanceShown === true} chain={chain.chosen}
      persona={persona.name} onNova={openChat} onZigi={() => { if (launcherShown()) askZigi(''); else router.push('/app/zigi'); }} zigiStatus={brain.kind === 'none' ? 'calm' : 'on'} hermes={hermes}/>}
    <div className="nova-centre">
      <NovaTop now={now} persona={persona.name} entries={entries} shortcuts={shortcuts} fullscreen={fullscreen} fullscreenOk={fullscreenOk && !phone}
        handlers={{act, customize: () => setSheet({kind: 'yours'}), fullscreen: toggleFullscreen}} onExit={exit} onDay={() => setSheet({kind: 'day'})} onSearch={() => openSearch()}
        onWorkflows={() => setSheet({kind: 'panels', id: 'workflows'})} onMini={pipOk && !phone ? () => { if (pip) pip.close(); else void openMini(); } : undefined} miniOpen={!!pip} onOwnWindow={!phone && !ownWindow ? openOwnWindow : undefined} leftHidden={left === 'hidden'} onShowLeft={() => save(rr => showLeft(rr, 'open'))}
        rightOpen={right === 'open'} onToggleRight={toggleRight} compact={phone} onQuick={() => setSheet({kind: 'quick'})}/>
      {/* Review fix (lane L8d, NOVA_HUD_REVIEW B2): the status chips, what is running now and the setup invitation share one
          deck that wraps (two slim rows at most on a computer, where they took three and pushed the HUD below the fold). */}
      <div className="nova-deck">
        {!phone && <StatusChips brain={brain} showcase={showcase}/>}
        <LoadBoundary quiet><Suspense fallback={null}><NovaLive/></Suspense></LoadBoundary>
        {/* Session AK P3 (ND-23): the setup invitation, one slim line under the chips (it left the star's stack). */}
        {/* Session AM: the invitation shows on the calm stage; once widgets or an answer are up it steps aside (the guide stays one tap away in the left bar and Behind the intelligence). */}
        {!chatOpen && stage.shown.length === 0 && !answerNow && <NovaSetupBanner persona={persona.name} brain={brain}/>}
      </div>
      {wake === 'listening' && <p className="nova-wake" role="status"><span className="nova-on-dot" aria-hidden="true"/>Listening for “Hey {persona.name}” on this device</p>}
      <div className="nova-stage-area" id="nova-hud" tabIndex={-1} onScroll={markScrolled}>{holo && !phone && <StageHud widgets={stage.shown.length} motion={hudMove.state} layout={layout} showcase={showcase}/>}{phone && !holo ? stageNode : <WidgetGrid layout={layout} widgets={stage.shown} live={stage} stage={phoneStage} editing={editing && !phone} opening={opening.phase === 'play'} actions={actions} look={look} phone={phone} motes={holo && hudMove.motes && !modelBusy && !resting && !soft} starColumn={plan?.column}/>}</div>
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
    {(phone ? !chatOpen : !chatHasGates) && stage.shown.length + stage.docked.length > 0 && <LoadBoundary quiet><Suspense fallback={null}><StageGatesWatch setGates={watchGates}/></Suspense></LoadBoundary>}
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
    {beamLine && <span key={beamLine.key} className="ns-beam" aria-hidden="true" style={{left: beamLine.x, top: beamLine.y, width: beamLine.length, transform: `rotate(${beamLine.turn}rad)`}}/>}
    {pip && <LoadBoundary quiet><Suspense fallback={null}><NovaMiniWindow win={pip} persona={persona.name} orb={orb} accent={accent}/></Suspense></LoadBoundary>}
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
  </div>;
}

'use client';
import {useRouter} from 'next/navigation';
import {Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {LoadBoundary} from '../load-boundary';
import {useShowcase} from '../showcase-controls';
import {useChainChoice} from '../chain/use-chain-choice';
import {usePagesView} from '../pages/use-pages-view';
import {askZigi, launcherShown} from '../ai/ask';
import {openMusicPlayer} from '../music/music-events';
import {openSearch} from '../search/search-trigger';
import {showToast} from '../ui/undo-toast';
import {isShown} from '../../lib/pages/visibility';
import {plainErrorMessage} from '../../lib/plain-error';
import {NOVA_CHAT_PARAM, NOVA_HANDOFF_EVENT, novaHandoffPending} from '../../lib/nova/bridge';
import {dockEntries, dockForKey, type DockEntry} from '../../lib/nova/dock';
import {greetingFor, openingSkippedNote, typedLength, type NovaOrbState} from '../../lib/nova/orb';
import {loopRuns} from '../../lib/motion-loops/loops'; // Session AK (FU): Full / Calm / Off
import {accentOf, addWidget, foldSection, layoutOf, markOpeningSeen, nextLeft, nudgeWidget, panelsOf, personaOf, placeWidget, removeWidget, resizeWidget, restoreWidgets, routingOf, setLayout, setLeftPanel, setRightPanel, setRouting, setWake, shortcutsOn, wakeOn, widgetsFor, yourNameOf, type NovaRecord, type WidgetSize} from '../../lib/nova/store';
import {gallery, widgetAvailable, widgetSpec, type WidgetContext} from '../../lib/nova/widgets/catalog';
import type {NovaPanelId} from './panels/nova-panels';
import {CommandField, RoutingMenu, ViewControls} from './nova-command';
import {NovaLeft} from './nova-left';
import {NovaSheet} from './nova-sheet';
import {NovaStage} from './nova-stage';
import {NovaTop, QuickTile} from './nova-top';
import {StatusChips, useBrain} from './status-chips';
import {useNovaCounts} from './use-counts';
import {useClock, useNova, useNovaMotionLevel} from './use-nova';
import {useOpening} from './use-opening';
import {useWakePhrase} from './use-wake';
import {WidgetGrid, type GridActions} from './widget-grid';
import {NovaIcon} from './icons';
import {openPipWindow, pipHost} from '../../lib/ai/pip';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOVA_HERMES, hermesStatus} from '../../lib/nova/hermes-record';
import './nova.css';

const NovaChat = lazy(() => import('./chat/nova-chat'));
const NovaRight = lazy(() => import('./nova-right'));
const MakeItYours = lazy(() => import('./make-it-yours'));
const NovaPanels = lazy(() => import('./panels/nova-panels').then(m => ({default: m.NovaPanels})));
const NovaBriefs = lazy(() => import('./panels/nova-briefs'));
const Starfield = lazy(() => import('./starfield'));
const NovaMiniWindow = lazy(() => import('./mini-window'));

type Sheet = {kind: 'day'} | {kind: 'panels'; id: NovaPanelId} | {kind: 'yours'} | {kind: 'quick'};
const PANEL_HASH = /^#nova-(memory|permissions|activity|workflows|cost|models)$/;
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
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
  const motionLevel = useNovaMotionLevel(), motion = loopRuns(motionLevel), now = useClock(), width = useWidth(), phone = width <= 640;
  const persona = personaOf(r), you = yourNameOf(r), layout = layoutOf(r), accent = accentOf(r), shortcuts = shortcutsOn(r);
  const hermesRecord = useDeviceRecord(NOVA_HERMES), hermes = hermesRecord.loaded && !hermesRecord.unreadable ? hermesStatus(hermesRecord.data) : null;
  const showcase = useShowcase(), chain = useChainChoice(), pagesView = usePagesView(), {brain} = useBrain(), counts = useNovaCounts();
  const [orb, setOrb] = useState<NovaOrbState>('idle'), [chatOpen, setChatOpen] = useState(false), [sheet, setSheet] = useState<Sheet | null>(null);
  const [editing, setEditing] = useState(false), [status, setStatus] = useState(''), [fullscreen, setFullscreen] = useState(false), [fullscreenOk, setFullscreenOk] = useState(false);
  const [pip, setPip] = useState<Window | null>(null), [pipOk, setPipOk] = useState(false);
  const root = useRef<HTMLDivElement>(null), command = useRef<HTMLInputElement>(null), fsLeftAt = useRef(0);

  const novaUpdate = nova.update;
  const save = useCallback((change: (r: NovaRecord) => NovaRecord, done?: string): boolean => {
    try { novaUpdate(change); if (done) setStatus(done); return true; } catch (e) { setStatus(plainErrorMessage(e, 'This change could not be saved on this device.')); return false; }
  }, [novaUpdate, setStatus]);
  const opening = useOpening({ready: nova.loaded, seen: !!r.openingSeen, motion, markSeen: () => { save(markOpeningSeen); }});

  const ctx: WidgetContext = useMemo(() => ({markets: isShown(pagesView, 'markets'), notes: true, briefs: true}), [pagesView]);
  const widgets = useMemo(() => widgetsFor(r, id => widgetAvailable(id, ctx)), [r, ctx]);
  const available = useMemo(() => gallery(ctx, widgets.map(w => w.id)), [ctx, widgets]);
  const entries = useMemo(() => dockEntries(r, {pageShown: page => isShown(pagesView, page), earn: chain.earnShown}), [r, pagesView, chain.earnShown]);
  const panels = panelsOf(r, width), left = phone ? 'hidden' : panels.left, right = phone ? 'hidden' : panels.right;

  const hour = now ? now.getHours() : 12, base = greetingFor(hour, persona.name);
  const greeting = you ? base.replace(/^([^.?]+)([.?])/, `$1, ${you}$2`) : base;
  const typed = opening.phase === 'play' ? typedLength(greeting, opening.elapsed) : greeting.length;

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    let landed = true;
    try { const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined; landed = !nav || new URL(nav.name).pathname.replace(/\/+$/, '') === '/app/nova'; } catch { landed = true; }
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
    const handoff = () => setChatOpen(true);
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
      if (e.key === 'Escape') {
        if (document.fullscreenElement) { e.preventDefault(); void document.exitFullscreen().catch(() => undefined); return; }
        if (Date.now() - fsLeftAt.current < 600 || document.querySelector('dialog[open]')) return;
        const t = e.target;
        if (t instanceof Node && t !== document.body && !root.current?.contains(t)) return;
        if (editing) { setEditing(false); setStatus('Done arranging.'); return; }
        if (chatOpen) { closeChat(); return; }
        exit(); return;
      }
      if (!shortcuts || typing(e.target) || document.querySelector('dialog[open]') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (!phone && e.key === '[') { e.preventDefault(); cycleLeft(); return; }
      if (!phone && e.key === ']') { e.preventDefault(); toggleRight(); return; }
      const entry = dockForKey(entries, e);
      if (entry) { e.preventDefault(); act(entry); }
    };
    // ⌘/Ctrl + K is ZIGi's everywhere else; on NOVA it goes to NOVA's own field first (ZIGi's launcher skips a handled key).
    const commandKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'k' || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      if (chatOpen) root.current?.querySelector<HTMLTextAreaElement>('.nova-talk textarea')?.focus(); else command.current?.focus();
    };
    window.addEventListener('keydown', key); window.addEventListener('keydown', commandKey, true);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('keydown', commandKey, true); };
  }, [editing, chatOpen, shortcuts, phone, entries, act, exit, closeChat, cycleLeft, toggleRight]);

  const wake = useWakePhrase({on: wakeOn(r) && !phone, persona: persona.name, paused: chatOpen, onWake: () => { setChatOpen(true); setStatus(`${persona.name} heard you.`); }});

  const title = (id: string) => widgetSpec(id)?.title ?? 'The widget';
  const actions: GridActions = {
    move: (id, to) => { save(rr => placeWidget(rr, id, to), `${title(id)} moved.`); },
    nudge: (id, by) => { save(rr => nudgeWidget(rr, id, by), `${title(id)} moved ${by < 0 ? 'earlier' : 'later'}.`); requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-widget="${id}"] .nova-grip`)?.focus()); },
    resize: (id, size: WidgetSize) => { save(rr => resizeWidget(rr, id, size), `${title(id)} is ${size === 'S' ? 'small' : size === 'M' ? 'medium' : 'large'} now.`); },
    remove: id => {
      const before = widgetsFor(r);
      if (save(rr => removeWidget(rr, id))) showToast({message: `${title(id)} left the stage.`, undone: `${title(id)} is back.`, undo: () => save(rr => restoreWidgets(rr, before))});
    },
  };
  const toggleWidget = (id: string, on: boolean) => { if (on) save(rr => addWidget(rr, id, widgetSpec(id)?.size ?? 'M'), `${title(id)} is on the stage.`); else actions.remove(id); };

  if (!nova.loaded) return <div className="nova-frame" data-accent="violet" data-opening="waiting"><Reading label={`${persona.name} is starting…`}/></div>;
  const stage = <NovaStage persona={persona} orb={orb} greeting={greeting} typed={typed} brain={brain} showcase={showcase} onTalk={openChat} talkOpen={chatOpen}/>;
  const chat = <LoadBoundary label="The conversation"><Suspense fallback={<Reading label="Opening the conversation…"/>}><NovaChat layout={phone ? 'sheet' : 'panel'} onOrbState={setOrb} onClose={closeChat}/></Suspense></LoadBoundary>;
  return <div ref={root} className="nova-frame" data-accent={accent} data-layout={layout} data-opening={opening.phase} data-phone={phone || undefined}
    data-left={left} data-right={right} data-chat={chatOpen || undefined} data-editing={editing || undefined} data-fullscreen={fullscreen || undefined}>
    <div className="nova-sky" aria-hidden="true"><LoadBoundary quiet><Suspense fallback={null}><Starfield motion={motion} accent={accent}/></Suspense></LoadBoundary></div>
    {left !== 'hidden' && <NovaLeft state={left} onCycle={cycleLeft} you={you} brain={brain} counts={counts} pages={p => isShown(pagesView, p)} earn={chain.earnShown} chess={isShown(pagesView, 'chess')}
      persona={persona.name} onNova={openChat} onZigi={() => { if (launcherShown()) askZigi(''); else router.push('/app/zigi'); }} zigiStatus={brain.kind === 'none' ? 'calm' : 'on'} hermes={hermes}/>}
    <div className="nova-centre">
      <NovaTop now={now} persona={persona.name} entries={entries} shortcuts={shortcuts} fullscreen={fullscreen} fullscreenOk={fullscreenOk && !phone}
        handlers={{act, customize: () => setSheet({kind: 'yours'}), fullscreen: toggleFullscreen}} onExit={exit} onDay={() => setSheet({kind: 'day'})} onSearch={() => openSearch()}
        onWorkflows={() => setSheet({kind: 'panels', id: 'workflows'})} onMini={pipOk && !phone ? () => { if (pip) pip.close(); else void openMini(); } : undefined} miniOpen={!!pip} onSettings={() => setSheet({kind: 'yours'})} leftHidden={left === 'hidden'} onShowLeft={() => save(rr => setLeftPanel(rr, 'open'))}
        rightOpen={right === 'open'} onToggleRight={toggleRight} compact={phone} onQuick={() => setSheet({kind: 'quick'})}/>
      {!phone && <StatusChips brain={brain}/>}
      {wake === 'listening' && <p className="nova-wake" role="status"><span className="nova-live-dot" aria-hidden="true"/>Listening for “Hey {persona.name}” on this device</p>}
      <div className="nova-stage-area">{phone ? stage : <WidgetGrid layout={layout} widgets={widgets} stage={stage} editing={editing} opening={opening.phase === 'play'} actions={actions}/>}</div>
      {editing && <div className="nova-editbar" role="region" aria-label="Arranging widgets"><p>Drag a widget by its grip, or use its buttons or the arrow keys on the grip. Esc when done.</p><button type="button" className="nova-btn nova-btn-primary" onClick={() => setEditing(false)}>Done</button></div>}
      <div className="nova-foot">
        {chatOpen && !phone && <div id="nova-talk" className="nova-talk" role="region" aria-label={`Conversation with ${persona.name}`}>{chat}</div>}
        {!chatOpen && <div className="nova-foot-row">
          {!phone && <ViewControls layout={layout} widgets={widgets} available={available} editing={editing} onLayout={l => save(rr => setLayout(rr, l), `${l[0]!.toUpperCase()}${l.slice(1)} layout.`)} onToggle={toggleWidget}
            onSize={actions.resize} onArrange={() => setEditing(v => !v)}/>}
          <CommandField you={you} persona={persona.name} inputRef={command} onOpen={openChat}/>
          {/* Release review 2 (R2-3): model routing appears once a brain is connected (with none, there is nothing to route). */}
          {!phone && brain.kind !== 'none' && <RoutingMenu brain={brain} routing={routingOf(r)} onRouting={rt => save(rr => setRouting(rr, rt), rt === 'auto' ? 'Automatic: your connected brain answers.' : undefined)} openModels={() => setSheet({kind: 'panels', id: 'models'})}/>}
        </div>}
      </div>
    </div>
    {right === 'open' && <LoadBoundary label="Behind the intelligence"><Suspense fallback={<aside className="nova-right" aria-label="Behind the intelligence" aria-busy="true"><Reading label="Reading…"/></aside>}>
      <NovaRight folded={panels.folded} onFold={(id, f) => save(rr => foldSection(rr, id, f))} onHide={() => save(rr => setRightPanel(rr, 'hidden'))} persona={persona.name} brain={brain} counts={counts} hermes={hermes}
        onTalk={openChat} wake={wakeOn(r)} onWake={on => save(rr => setWake(rr, on), on ? `${persona.name} listens for its name on this device.` : 'Wake phrase off.')} openPanel={id => setSheet({kind: 'panels', id})}/>
    </Suspense></LoadBoundary>}
    {chatOpen && phone && <NovaSheet title={persona.name} eyebrow="Your conversation" place="bottom" onClose={closeChat}>{chat}</NovaSheet>}
    {sheet?.kind === 'day' && <NovaSheet title="Your day" eyebrow="Morning brief and evening recap" place="right" onClose={closeSheet}><LoadBoundary label="Your day"><Suspense fallback={<Reading label="Reading your day…"/>}><NovaBriefs/></Suspense></LoadBoundary></NovaSheet>}
    {sheet?.kind === 'panels' && <NovaSheet title={`${persona.name}’s panels`} eyebrow="Memory, permissions, activity, workflows, cost, models" place="right" wide onClose={closeSheet}><LoadBoundary label="The panels"><Suspense fallback={<Reading label="Opening…"/>}><NovaPanels initial={sheet.id}/></Suspense></LoadBoundary></NovaSheet>}
    {sheet?.kind === 'yours' && <NovaSheet title={`Make ${persona.name} yours`} eyebrow="On this device" place="right" wide onClose={closeSheet}><LoadBoundary label="Make it yours"><Suspense fallback={<Reading label="Opening…"/>}>
      <MakeItYours record={r} save={save} entries={entries} status={status} onReplay={() => { closeSheet(); requestAnimationFrame(() => { if (!opening.replay()) setStatus(openingSkippedNote(motionLevel)); }); }}/>
    </Suspense></LoadBoundary></NovaSheet>}
    {sheet?.kind === 'quick' && <NovaSheet title="Quick access" place="bottom" onClose={closeSheet}><nav aria-label="Quick access"><ul className="nova-quick-sheet">
      {entries.filter(e => !e.hidden).map(e => <li key={e.id}><QuickTile entry={e} shortcuts={false} labelled act={entry => { closeSheet(); act(entry); }}/></li>)}
      <li><button type="button" className="nova-tile nova-tile-labelled" onClick={() => setSheet({kind: 'yours'})}><span className="nova-tile-planet" aria-hidden="true"><NovaIcon name="yours" size={20}/></span><span className="nova-tile-label">Customize</span></button></li>
    </ul></nav></NovaSheet>}
    {pip && <LoadBoundary quiet><Suspense fallback={null}><NovaMiniWindow win={pip} persona={persona.name} orb={orb} accent={accent}/></Suspense></LoadBoundary>}
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
  </div>;
}

'use client';
import Link from 'next/link';
import {Suspense, lazy, useCallback, useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {hermesPanel, type HermesStatus} from '../../lib/nova/hermes-record';
import {LoadBoundary} from '../load-boundary';
import {useAiSettings} from '../ai/use-ai-settings';
import {useDeviceRecord} from '../ai/use-device-record';
import {AI_ACTIONS, AI_MEMORY, AI_USAGE} from '../../lib/ai/store/records';
import {dayKey, isFreeRoute} from '../../lib/ai/usage';
import {PROVIDERS, isProviderId} from '../../lib/ai/providers';
import {ZIGI_VOICE, voicePrefs} from '../../lib/zigi-voice';
import {LOCAL_SERVERS, probeServer, scanLocalServers, scanLine, scanStatus, type LocalServer, type ScanResult} from '../../lib/nova/local-servers';
import {deviceFacts, factLines, loadedLine, ollamaLoaded, wakeSupport, type LoadedModel, type WakeSupport} from '../../lib/nova/widgets/telemetry';
import {waterAmount} from '../../lib/nova/widgets/words';
import {factTiles, notRunningLine} from '../../lib/nova/right-facts';
import type {RightSection} from '../../lib/nova/store';
import {formatDate, formatDateTime, formatNumber} from '../../lib/visual-format';
import type {NovaPanelId} from './panels/nova-panels';
import {NovaIcon} from './icons';
import type {Brain} from './status-chips';
import type {NovaCounts} from './use-counts';

/**
 * Session AK (owner follow-up 3, N12; lane NA): "Behind the intelligence", NOVA's right panel. Six numbered sections, each
 * folding on its own and remembered per device: 01 Brains (the connected brain; local servers online or offline with the
 * models they report, and Ollama's loaded models and their memory from its own /api/ps; a cloud provider configured; the
 * device facts the browser really gives), 02 Voice, 03 Your pages and tools, 04 Models and usage, 05 Memory and scopes,
 * 06 Activity. Every value comes from what answered; unknown is said as unknown. A local server is asked only when the
 * person connected it or presses "Look for local servers" (the browser may ask once to let this site reach this computer).
 */
/** NC's Hermes card (lane NC, components/nova/hermes): the guide's progress or the gateway's status; loaded with this panel. */
const HermesCard = lazy(() => import('./hermes/hermes-card').then(m => ({default: m.NovaHermesCard})));
const TITLES: Record<RightSection, string> = {brains: 'Brains', voice: 'Voice', tools: 'Your pages and tools', usage: 'Models and usage', memory: 'Memory and scopes', activity: 'Activity'};
type Probe = {state: 'idle' | 'asking' | 'done'; results: ScanResult[]; loaded: Record<string, LoadedModel[] | null>; at: Date | null};
export default function NovaRight({folded, onFold, onHide, persona, brain, counts, hermes, onTalk, wake, onWake, openPanel}: {
  folded: readonly RightSection[]; onFold: (id: RightSection, folded: boolean) => void; onHide: () => void; persona: string; brain: Brain; counts: NovaCounts; hermes: HermesStatus | null;
  onTalk: () => void; wake: boolean; onWake: (on: boolean) => void; openPanel: (id: NovaPanelId) => void;
}) {
  const settings = useAiSettings(), voice = useDeviceRecord(ZIGI_VOICE), usage = useDeviceRecord(AI_USAGE), memory = useDeviceRecord(AI_MEMORY), actions = useDeviceRecord(AI_ACTIONS);
  const [probe, setProbe] = useState<Probe>({state: 'idle', results: [], loaded: {}, at: null});
  const [battery, setBattery] = useState<{level: number; charging: boolean} | null>(null), [support, setSupport] = useState<WakeSupport | null>(null), [refreshed, setRefreshed] = useState(0);
  // Session AK lane EXF (EX-4): the browser is asked about on-device speech recognition only when the person asks (the
  // button below), never as the panel opens: `SpeechRecognition.available()` is new, and one browser build crashed the tab
  // on it. With the wake phrase already on, use-wake.ts asks (the person turned it on).
  const [checkingWake, setCheckingWake] = useState(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const checkWake = useCallback(() => {
    setCheckingWake(true);
    void wakeSupport(window).then(r => { if (mounted.current) { setSupport(r); setCheckingWake(false); } });
  }, []);
  const s = settings.data, connectedLocal: LocalServer | null = settings.loaded && s.enabled && s.mode === 'local' && s.baseUrl && brain.kind !== 'hermes' ? {id: s.localServer === 'ollama' ? 'ollama' : 'lmstudio', name: s.localServer === 'ollama' ? 'Ollama' : 'Your local server', baseUrl: s.baseUrl, wire: s.localServer === 'ollama' ? 'ollama' : 'openai-compatible'} : null;
  const ask = useCallback(async (servers: readonly LocalServer[]) => {
    setProbe(p => ({...p, state: 'asking'}));
    const results = servers.length === 1 ? [await probeServer(servers[0]!)] : await scanLocalServers({servers});
    const loaded: Probe['loaded'] = {};
    for (const r of results) if (r.found && r.server.wire === 'ollama') loaded[r.server.baseUrl] = await ollamaLoaded(r.server.baseUrl);
    setProbe({state: 'done', results, loaded, at: new Date()});
  }, []);
  // The connected local server is asked when the panel opens and on Refresh; nothing else is asked unless the person asks.
  useEffect(() => { if (connectedLocal) void ask([connectedLocal]); }, [connectedLocal?.baseUrl, refreshed]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let live = true;
    const nav = navigator as Navigator & {getBattery?: () => Promise<{level: number; charging: boolean}>};
    nav.getBattery?.().then(b => { if (live) setBattery({level: b.level, charging: b.charging}); }).catch(() => undefined);
    return () => { live = false; };
  }, [refreshed]);
  const known = deviceFacts(typeof navigator === 'undefined' ? undefined : navigator, battery), facts = factLines(known), tiles = factTiles(known);
  const silent = notRunningLine(probe.results);
  const vprefs = voicePrefs(voice.data), speech = !vprefs.muted;
  const today = dayKey(new Date()), day = usage.loaded && !usage.unreadable ? usage.data.days?.[today] ?? {} : null;
  const actionsList = actions.loaded && !actions.unreadable ? [...(actions.data.actions ?? [])].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3) : null;
  const notes = memory.loaded && !memory.unreadable ? memory.data.notes?.length ?? 0 : null;
  const section = (id: RightSection, n: number, body: ReactNode) => <Section key={id} id={id} n={n} title={TITLES[id]} folded={folded.includes(id)} onFold={onFold}>{body}</Section>;
  return <aside className="nova-right" aria-label="Behind the intelligence">
    <header className="nova-right-head">
      <div><p className="nova-eyebrow"><span className="nova-on-dot" aria-hidden="true"/>Live, on this device</p><h2>Behind the intelligence</h2></div>
      <button type="button" className="nova-icon-btn" onClick={onHide} aria-label="Hide the right panel"><NovaIcon name="close"/></button>
    </header>
    <div className="nova-right-scroll">
      {section('brains', 1, <>
        <p className="nova-row"><span className="nova-chip-dot" data-kind={brain.kind} aria-hidden="true"/><span><strong>{persona}’s brain:</strong> {brain.words}</span></p>
        {/* Session AK P3 (ND-13): this device at a glance, always shown; each unknown says so. */}
        <dl className="nova-fact-tiles" aria-label="This device">{tiles.map(t => <div key={t.label} title={t.title}><dt>{t.label}</dt><dd data-unknown={t.value === 'unknown' || undefined}>{t.value}</dd></div>)}</dl>
        {settings.loaded && s.enabled && s.mode === 'api' && s.provider && isProviderId(s.provider) && <p className="nova-row"><span className="nova-chip-dot" data-kind="cloud" aria-hidden="true"/><span>{PROVIDERS[s.provider].name}: configured, the key kept on this device{s.model ? ` · ${s.model}` : ''}</span></p>}
        <ul className="nova-right-list" aria-live="polite">
          {probe.state === 'asking' && <li role="status">Asking this computer…</li>}
          {/* EX3 left-over 2: a server that answered but refused, wanted a key or sent an unreadable list is running. */}
          {probe.results.filter(r => r.found || r.reason !== 'unreachable').map(r => { const st = scanStatus(r); return <li key={r.server.id + r.server.baseUrl}>
            <span className="nova-status" data-on={st.on || undefined}>{st.word}</span> {scanLine(r)}
            {r.found && r.server.wire === 'ollama' && <ul className="nova-right-sub">{probe.loaded[r.server.baseUrl] === null ? <li>Loaded models: unknown (Ollama did not say)</li>
              : (probe.loaded[r.server.baseUrl] ?? []).length ? (probe.loaded[r.server.baseUrl] ?? []).map(m => <li key={m.name}>{loadedLine(m)}</li>) : <li>No model loaded right now (Ollama loads one on the first question).</li>}</ul>}
          </li>; })}
          {silent && <li title={silent.detail}><span className="nova-status">Offline</span> {silent.line}</li>}
        </ul>
        {/* EX3 left-over 1: the same words as the guide's check (a refused key was reached). */}
        {hermes?.connected && (() => { const p = hermesPanel(hermes); return <p className="nova-row"><span className="nova-status" data-on={p.on || undefined}>{p.pill}</span><span>{p.line}{hermes.model ? ` · ${hermes.model}` : ''}{hermes.lastMs !== undefined ? ` · answered in ${formatNumber(hermes.lastMs)} ms` : ''}{hermes.checkedAt ? ` · ${formatDateTime(hermes.checkedAt)}` : ''}</span></p>; })()}
        <div className="nova-right-actions"><Link className="nova-btn" href="/app/nova/setup" prefetch={false}>Brain setup</Link></div>
        {/* Release review 2 (R2-3): the technical rows wait behind this disclosure (local servers, Hermes, this device). */}
        <Tech label="Technical details: local servers, Hermes Agent, this device">
          <div className="nova-right-actions"><button type="button" className="nova-btn" disabled={probe.state === 'asking'} onClick={() => void ask(LOCAL_SERVERS)}>Look for local servers</button></div>
          <LoadBoundary quiet><Suspense fallback={null}><HermesCard/></Suspense></LoadBoundary>
          <p className="nova-fine">Only this computer is asked (localhost). Your browser may ask once to let this site reach apps on this computer.</p>
          <h4 className="nova-right-sub-title">This device</h4>
          <dl className="nova-facts nova-facts-compact">{facts.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>
        </Tech>
      </>)}
      {section('voice', 2, <>
        <div className="nova-switch-row"><span id="nova-speech-label">Speech output</span>
          <button type="button" role="switch" aria-checked={speech} aria-labelledby="nova-speech-label" className="nova-switch" disabled={!voice.loaded}
            onClick={() => { try { voice.update(r => ({...r, muted: speech})); } catch { /* storage refused: the switch stays */ } }}><span aria-hidden="true"/></button></div>
        <p className="nova-fine">{speech ? `${persona} may read answers aloud on this device (your voice choices in ZIGi apply).` : `Muted: nothing is read aloud.`}</p>
        {/* ND-13: a status row, not a pill inside the sentence; Talk is secondary here (the orb is the page's talk control). */}
        <p className="nova-row nova-status-row"><span className="nova-chip-dot" data-kind="off" aria-hidden="true"/><span><strong>Microphone off</strong> until you press Talk. {persona} never opens it by itself.</span></p>
        <button type="button" className="nova-btn" onClick={onTalk}><NovaIcon name="star" size={18}/>Talk to {persona}</button>
        {support === null && !wake ? <><button type="button" className="nova-btn" onClick={checkWake} disabled={checkingWake}>{checkingWake ? 'Checking…' : `Check “Hey ${persona}” on this device`}</button>
            <p className="nova-fine" role="status">{checkingWake ? 'Checking for on-device speech recognition…' : 'Nothing is checked until you ask.'}</p></>
          : wake || support?.ok ? <><div className="nova-switch-row"><span id="nova-wake-label">Listen for “Hey {persona}”</span>
              <button type="button" role="switch" aria-checked={wake} aria-labelledby="nova-wake-label" className="nova-switch" onClick={() => onWake(!wake)}><span aria-hidden="true"/></button></div>
            <p className="nova-fine">Recognised on this device; nothing is sent. {persona} listens only while this page is open and in front, and stops when you leave.</p></>
          : <p className="nova-fine">“Hey {persona}” is not offered: {support?.reason}</p>}
      </>)}
      {section('tools', 3, <ul className="nova-tools">
        <ToolRow href="/app/habits" icon="habits" label="Habits left today" value={counts.habitsLeft}/>
        <ToolRow href="/app/health#water" icon="health" label="Water to go" text={counts.waterToGoMl === null ? 'no target set' : counts.waterToGoMl === 0 ? 'target reached' : waterAmount(counts.waterToGoMl, counts.waterUnit)}/>
        <ToolRow href="/app/wealth?view=bills" icon="wealth" label="Next bill" text={counts.nextBill ? `${counts.nextBill.title} · ${formatDate(counts.nextBill.due, {year: false})}` : counts.billsRead ? 'none in two months' : 'could not be read'} amount={counts.nextBill?.amount}/>
        <ToolRow href="/app/nova#briefs" icon="star" label="Unread briefs" value={counts.briefsUnread}/>
        <ToolRow href="/app/notes" icon="notes" label="Notes in the inbox" value={counts.notesInbox}/>
        <ToolRow href="/app/agenda" icon="tasks" label="Tasks due" value={counts.tasksDue}/>
      </ul>)}
      {section('usage', 4, <>
        {day === null ? <p className="nova-fine">Usage could not be read on this device.</p> : !Object.keys(day).length ? <p className="nova-fine">No model was asked today.</p>
          : <ul className="nova-right-list">{Object.entries(day).map(([route, used]) => <li key={route}><strong>{route === 'local' ? 'Your local model' : route === 'on-device' ? 'On this device' : isProviderId(route) ? PROVIDERS[route].name : route}</strong>: {formatNumber(used.requests)} {used.requests === 1 ? 'request' : 'requests'}, about {formatNumber(used.input + used.output)} tokens{isFreeRoute(route) ? ' · free, on your device' : ''}</li>)}</ul>}
        <Tech label="Cost meter and models per task"><div className="nova-right-actions"><button type="button" className="nova-btn" onClick={() => openPanel('cost')}>Cost meter and daily cap</button><button type="button" className="nova-btn" onClick={() => openPanel('models')}>Models per task</button></div></Tech>
      </>)}
      {section('memory', 5, <>
        <p className="nova-row">{notes === null ? 'Memory could not be read on this device.' : notes ? `${persona} and ZIGi share ${notes} ${notes === 1 ? 'note' : 'notes'} you kept.` : 'Nothing remembered yet. You choose every note.'}</p>
        <div className="nova-right-actions"><button type="button" className="nova-btn" onClick={() => openPanel('memory')}>Memory</button><button type="button" className="nova-btn" onClick={() => openPanel('permissions')}>What {persona} can see</button></div>
      </>)}
      {section('activity', 6, <>
        {actionsList === null ? <p className="nova-fine">Activity could not be read on this device.</p> : actionsList.length ? <ul className="nova-right-list">{actionsList.map(a => <li key={a.activityId}>{a.title}<small> · {formatDateTime(a.at)}</small></li>)}</ul> : <p className="nova-fine">No action yet. Every change {persona} or ZIGi makes waits for your confirm, and can be undone.</p>}
        <div className="nova-right-actions"><button type="button" className="nova-btn" onClick={() => openPanel('activity')}>Open Activity</button></div>
      </>)}
    </div>
    <footer className="nova-right-foot"><span>{probe.at ? `Read ${formatDateTime(probe.at)}` : 'Read on this device'}</span><button type="button" className="nova-btn" onClick={() => setRefreshed(n => n + 1)}>Refresh</button></footer>
  </aside>;
}
function Section({id, n, title, folded, onFold, children}: {id: RightSection; n: number; title: string; folded: boolean; onFold: (id: RightSection, folded: boolean) => void; children: ReactNode}) {
  const body = useId();
  return <section className="nova-right-section" data-folded={folded || undefined} aria-labelledby={`${body}-h`}>
    <h3 id={`${body}-h`}><button type="button" aria-expanded={!folded} aria-controls={body} onClick={() => onFold(id, !folded)}><span className="nova-num" aria-hidden="true">{String(n).padStart(2, '0')}</span>{title}<NovaIcon name={folded ? 'down' : 'up'} size={18}/></button></h3>
    <div id={body} className="nova-right-body" hidden={folded}>{children}</div>
  </section>;
}
/** A section's technical rows, folded until the person opens them (a native disclosure: keyboard and screen readers know it). */
function Tech({label, children}: {label: string; children: ReactNode}) {
  // ND-13: the disclosure shows its own chevron (a summary laid out with flex loses the browser's triangle).
  return <details className="nova-tech"><summary><span>{label}</span><span className="nova-tech-chevron" aria-hidden="true"><NovaIcon name="down" size={18}/></span></summary><div className="nova-tech-body">{children}</div></details>;
}
function ToolRow({href, icon, label, value, text, amount}: {href: string; icon: string; label: string; value?: number | null; text?: string; amount?: string}) {
  const shown = text ?? (value === null || value === undefined ? 'unknown' : formatNumber(value));
  return <li><Link href={href} prefetch={false} className="nova-tool"><NovaIcon name={icon} size={18}/><span>{label}</span><strong>{shown}{amount ? <> · <span data-private-amount="">{amount}</span></> : null}</strong></Link></li>;
}

'use client';
import Link from 'next/link';
import {lazy, Suspense, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
import {readKey} from '../../../../lib/ai/keys';
import {onDeviceAvailability} from '../../../../lib/ai/on-device';
import {PROVIDERS} from '../../../../lib/ai/providers';
import {currentAiScope} from '../../../../lib/ai/scope';
import {AI_OPTIONS} from '../../../../lib/ai/store/records';
import {browserKind, loopbackNote, loopbackPermission, scanLine, scanLocalServers, type LoopbackState, type ScanResult} from '../../../../lib/nova/local-servers';
import {privacyMode} from '../../../../lib/nova/privacy-mode';
import {brainWayTag, keyRefused, NOVA_PHONE_QUERY} from '../../../../lib/nova/phone-path';
import {setPrivacyMode} from '../../../../lib/nova/setup';
import {localDate} from '../../../../lib/local-date';
import {checkBrain} from '../../../../lib/nova/setup-checks';
import {brainNowLine, CONTEXT_NOTE, CPU_NOTE, defaultBudget, detectOs, HERMES_WAY, KEY_NOTES, llamaCppSteps, lmStudioSteps, MAX_PARAMS, MODEL_PICKS, MODEL_RULE, OLLAMA_STRICT_NOTE, ollamaSteps, OPENROUTER_NOTE, OS_LABELS, pickFor, SERVER_LABELS, SPENDING_ADVICE, SUBSCRIPTION_DETAILS, SUBSCRIPTION_NOTE, type GuideStep, type KeyProvider, type MemoryBudget, type Os, type ServerId} from '../../../../lib/nova/setup-guide';
import {readDeviceRecord} from '../../../../lib/device-record';
import {getAppStorage} from '../../../../lib/showcase-storage';
import {AiSetup} from '../../../ai/ai-setup';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {NOVA_STORE, personaOf} from '../../../../lib/nova/store';
import {useAiSettings} from '../../../ai/use-ai-settings';
import {useBrain} from '../../status-chips';
import {CheckRow} from '../check-row';
import {CommandBlock} from '../command-block';
import type {SetupState} from '../use-setup';

const OnDevicePanel = lazy(() => import('../../../ai/on-device-panel'));
type Way = 'local' | 'key' | 'openrouter' | 'browser';
// Session AK P4 (FR-5): on a phone, "A model on this computer" needs a computer and is not the recommendation.
const waysFor = (phone: boolean): {id: Way; label: string; tag?: string}[] => ([['local', 'A model on this computer'], ['key', 'My own API key'], ['openrouter', 'OpenRouter sign-in'], ['browser', 'In the browser']] as const).map(([id, label]) => ({id, label, ...(brainWayTag(id, phone) ? {tag: brainWayTag(id, phone)} : {})}));
const KEY_PROVIDERS: KeyProvider[] = ['anthropic', 'openai', 'gemini', 'xai'];
const subscribeNothing = () => () => undefined;
const PHONE = NOVA_PHONE_QUERY;
/** Steps as an ordered list; each command alone in its block. */
export function GuideSteps({steps, after}: {steps: readonly GuideStep[]; after?: Partial<Record<number, ReactNode>>}) {
  // Session AK P3 (ND-8): `after` puts a step's own secondary action right under its command (e.g. "Make a key here").
  return <ol className="nova-steps">{steps.map((s, i) => <li key={i}><span className="nova-step-n" aria-hidden="true">{i + 1}</span><div><p>{s.text}</p>{s.command && <CommandBlock command={s.command} shell={s.shell}/>}{after?.[i]}</div></li>)}</ol>;
}
/** Buttons that behave as one choice (aria-pressed), for the OS and the server. */
/** Session AK P3 (ND-8): equal-width options; a recommended one wears a small tag (its name says it too), not a gradient. */
export function Choice<T extends string>({label, value, options, onChange}: {label: string; value: T; options: readonly {id: T; label: string; tag?: string}[]; onChange: (v: T) => void}) {
  return <div className="nova-choice ai-card-actions" role="group" aria-label={label}>{options.map(o => <button key={o.id} type="button" className={o.id === value ? 'primary' : 'secondary'} aria-pressed={o.id === value} aria-label={o.tag ? `${o.label} (${o.tag.toLowerCase()})` : undefined} onClick={() => onChange(o.id)}><span>{o.label}</span>{o.tag && <span className="nova-tag nova-tag-recommended" aria-hidden="true">{o.tag}</span>}</button>)}</div>;
}
/**
 * Planet 3: the brain, local first. (a) A local model: Ollama, LM Studio or llama.cpp on macOS, Windows or Linux, with
 * the origin setting for this site, the browser's permission explained, a model by memory and a scan of this computer;
 * (b) an own API key; (c) OpenRouter's sign-in; (d) Chrome's on-device model. The connection itself is ZIGi's own setup
 * (components/ai/ai-setup.tsx: one engine, one key store); the check is a live connection test naming the model found.
 */
export default function BrainStep({setup}: {setup: SetupState}) {
  const settings = useAiSettings(), id = useId(), persona = personaOf(useDeviceRecord(NOVA_STORE).data);
  // Session AM: what answers right now, in the words of NOVA's Brain chip (one source: status-chips' useBrain).
  const now = useBrain();
  const ua = useSyncExternalStore(subscribeNothing, () => navigator.userAgent, () => '');
  const phone = useSyncExternalStore(subscribeNothing, () => !!window.matchMedia?.(PHONE).matches, () => false);
  const origin = useSyncExternalStore(subscribeNothing, () => window.location.origin, () => 'https://alpha.zigoals.app');
  const [way, setWay] = useState<Way>(phone ? 'key' : 'local'), [os, setOs] = useState<Os | null>(null), [server, setServer] = useState<ServerId>('ollama');
  const [budget, setBudget] = useState<MemoryBudget>('ram16'), [scan, setScan] = useState<ScanResult[] | null>(null), [scanning, setScanning] = useState(false), [permission, setPermission] = useState<LoopbackState>('unknown');
  const shownOs = os ?? detectOs(ua), pick = pickFor(budget);
  // Session AL (BN-034): the memory choice starts from this computer's own hints, once, after the first paint.
  const budgetTouched = useRef(false);
  useEffect(() => { if (!budgetTouched.current) setBudget(defaultBudget(navigator as Navigator & {deviceMemory?: number})); }, []);
  useEffect(() => { let live = true; void loopbackPermission().then(p => { if (live) setPermission(p); }); return () => { live = false; }; }, [scan]);
  const findServers = async () => { setScanning(true); try { setScan(await scanLocalServers({verify: true})); } finally { setScanning(false); } };
  const run = async () => {
    const data = settings.data, scope = currentAiScope();
    let key: string | null = null; if (data.provider) { try { key = await readKey(scope, data.provider); } catch { key = null; } }
    let onDeviceOn = false; try { onDeviceOn = readDeviceRecord(getAppStorage(), AI_OPTIONS).data.onDevice === true; } catch { onDeviceOn = false; }
    return checkBrain({settings: data, mode: privacyMode(), key, onDevice: await onDeviceAvailability(), onDeviceOn});
  };
  const steps = server === 'ollama' ? ollamaSteps(shownOs, origin, pick.ollama) : server === 'lmstudio' ? lmStudioSteps(shownOs) : llamaCppSteps(shownOs, origin, pick.gguf);
  return <>
    {/* Session AK P4 (FR-14): the choice comes first; the subscription note is folded into its own disclosure. */}
    {now.loaded && <p className="nova-note" data-brain-now={now.brain.kind}>{brainNowLine(now.brain.kind, now.brain.words)}</p>}
    <Choice label="Choose NOVA’s brain" value={way} options={waysFor(phone)} onChange={setWay}/>
    {/* Session AM: the person's own Hermes Agent is a path beside the four (a link: it has its own guide and its own checks). */}
    <div className="ai-card-actions" role="group" aria-label="Or your own agent"><Link className="secondary" href={HERMES_WAY.href}>{HERMES_WAY.label}</Link><span className="fine">{HERMES_WAY.note}</span></div>
    <details className="nova-more"><summary>Have a ChatGPT, Claude, Gemini or Grok subscription?</summary><p className="nova-honest">{SUBSCRIPTION_NOTE}</p><ul>{SUBSCRIPTION_DETAILS.map(d => <li key={d}>{d}</li>)}</ul></details>
    {way === 'local' && <section className="nova-way" aria-labelledby={`${id}-local`}>
      <h3 id={`${id}-local`}>A model on this computer</h3>
      <p>Free, private and offline once set up: nothing leaves your computer. It needs a computer (not a phone) and Chrome, Edge or Firefox.</p>
      <p className="nova-note" role="note">{loopbackNote(browserKind(ua), phone)}{permission === 'denied' && <b> This site is blocked from apps on this device now: allow it in the site settings, then reload.</b>}</p>
      <label className="field">How much memory does this computer have?<select value={budget} onChange={e => { budgetTouched.current = true; setBudget(e.target.value as MemoryBudget); }} aria-describedby={`${id}-mem`}>{MODEL_PICKS.map(p => <option key={p.budget} value={p.budget}>{p.label}</option>)}</select></label>
      <p className="fine" id={`${id}-mem`}>{pick.hint}.</p>
      <p className="nova-pick"><b>Model: {pick.ollama}</b> ({pick.size}; {pick.licence}). Also good: {pick.also}. <span className="fine">{MODEL_RULE}</span></p>
      <p className="fine">{CPU_NOTE} {CONTEXT_NOTE}</p>
      <Choice label="Your computer" value={shownOs} options={(['mac', 'windows', 'linux'] as const).map(o => ({id: o, label: OS_LABELS[o]}))} onChange={setOs}/>
      <Choice label="The program that runs the model" value={server} options={(['ollama', 'lmstudio', 'llamacpp'] as const).map(s => ({id: s, label: SERVER_LABELS[s]}))} onChange={setServer}/>
      <GuideSteps steps={steps}/>
      {server === 'ollama' && <details className="nova-more"><summary>For Strict privacy (optional)</summary><p>{OLLAMA_STRICT_NOTE}</p></details>}
      <div className="ai-card-actions"><button type="button" className="secondary" onClick={() => void findServers()} disabled={scanning}>{scanning ? 'Looking on this computer…' : 'Find models on this computer'}</button></div>
      {scan && <ul className="nova-scan" aria-live="polite">{scan.map(r => <li key={r.server.id} data-found={r.found}>{scanLine(r)}</li>)}</ul>}
      <p className="fine">Then connect it below: choose “I run a model on this computer”, the preset for your program{server === 'llamacpp' ? ' (llama.cpp: http://127.0.0.1:9931)' : ''}, Test connection, and pick the model.</p>
    </section>}
    {way === 'key' && <section className="nova-way" aria-labelledby={`${id}-key`}>
      <h3 id={`${id}-key`}>Your own API key</h3>
      <p>A key from a provider you choose; it stays sealed on this device and goes only to that provider, with each request. {SPENDING_ADVICE}</p>
      <ul className="nova-keys">{KEY_PROVIDERS.map(p => <li key={p}><b>{PROVIDERS[p].name}</b>: get a key at <a className="text-link" href={PROVIDERS[p].keysUrl!} target="_blank" rel="noopener noreferrer">{PROVIDERS[p].keysUrl!.replace(/^https:\/\//, '')}</a>.{/* Session AK P4 (FR-14): each provider's fine print folds under its name */}<details className="nova-more"><summary>{PROVIDERS[p].name}: free tier and terms</summary><p className="fine">{KEY_NOTES[p].free}</p></details></li>)}</ul>
      <p className="fine">Then connect it below: “I have an API key”, paste it, Test connection, pick a model.</p>
      {/* Session AK P4 (FR-5): where Strict would refuse the key, one tap turns on Guarded (a redacted copy goes to the provider). */}
      {keyRefused(setup.record.data.privacyMode ?? null) ? <p className="nova-note" role="note">In Strict, a cloud key is refused. Guarded lets the provider you choose answer with a redacted copy. <button type="button" className="secondary" onClick={() => { try { setup.record.update(r => setPrivacyMode(r, 'guarded', localDate())); } catch { /* step 2 still offers it */ } }}>Switch to Guarded</button></p>
        : <p className="fine">Your privacy mode is {setup.record.data.privacyMode === 'guarded' ? 'Guarded: the provider gets a redacted copy' : setup.record.data.privacyMode === 'relaxed' ? 'Relaxed: the provider gets what you share as it is' : 'not chosen yet (step 2)'}.</p>}
    </section>}
    {way === 'openrouter' && <section className="nova-way" aria-labelledby={`${id}-or`}>
      <h3 id={`${id}-or`}>OpenRouter sign-in</h3>
      <p>{OPENROUTER_NOTE}</p>
      <p className="fine">Below: “I have an API key”, choose OpenRouter, then “Sign in with OpenRouter instead”. You come back to Settings with the key sealed on this device.</p>
    </section>}
    {way === 'browser' && <section className="nova-way" aria-labelledby={`${id}-dev`}>
      <h3 id={`${id}-dev`}>In the browser</h3>
      <p>Chrome on a computer can run a small model of its own: free, nothing sent, short answers only. Where your browser offers none, NOVA still answers questions about your records on this device.</p>
      <Suspense fallback={<p className="ai-note">Asking Chrome…</p>}><OnDevicePanel/></Suspense>
    </section>}
    {way !== 'browser' && settings.loaded && <section className="nova-connect" aria-label="Connect">
      <AiSetup settings={settings} scope={currentAiScope()} assistant={persona.name} suggest={{prefer: [pick.ollama, pick.gguf.split('/').pop()!.replace(/-GGUF$/i, '')], maxParams: MAX_PARAMS[budget]}}/>
    </section>}
    <CheckRow id="brain" setup={setup} run={run} label="Test the connection"/>
  </>;
}

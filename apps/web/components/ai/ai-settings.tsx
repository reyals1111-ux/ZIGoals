'use client';
import Link from 'next/link';
import {Suspense, lazy, useCallback, useEffect, useRef, useState} from 'react';
import {forgetChats} from '../../lib/ai/chats';
import {AiError, errorSteps} from '../../lib/ai/errors';
import {dropMemoryKeys, forgetAiKeys, forgetKey, hasRememberedKey, holdKey, readKey, rememberKey, SHOWCASE_SCOPE} from '../../lib/ai/keys';
import {listModels} from '../../lib/ai/models';
import {cleanedCallbackUrl, exchangeOpenRouterCode, readOpenRouterCallback} from '../../lib/ai/openrouter-auth';
import {PROVIDERS, SUBSCRIPTION_APPS} from '../../lib/ai/providers';
import {currentAiScope} from '../../lib/ai/scope';
import {CONTEXT_BUDGET, OUTPUT_CAP, PAGE_AREAS, type AiSettings as AiSettingsData, type PageArea} from '../../lib/ai/settings';
import type {ModelInfo} from '../../lib/ai/types';
import {browserSpeechDisclosure, detectBrowser, speechLanguage, TRANSCRIPTION_MODELS} from '../../lib/ai/voice';
import {AREA_LABELS} from '../../lib/ai/context/pages';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, visibleDomains} from '../../lib/dashboard-settings';
import {ZigiAvatar} from '../zigi/zigi-avatar';
import {usePrivateStore} from '../use-private-store';
import {AiSetup, type SetupSeed} from './ai-setup';
import {ModelPicker} from './model-picker';
import {AiDataUsage} from './ai-data-usage';
import {Switch} from './ai-switch';
import {useAiSettings} from './use-ai-settings';
import {useHealthConsent} from './use-health-consent';
import './ai.css';

/**
 * Settings → ZIGi · your AI (ADR-012, Part 8; id="your-ai"): the connection (setup, change model, disconnect), what
 * each page shares, Include Health, the key on this device, the output cap and context budget, voice, your own
 * instructions, the launcher, what your AI sees, and "Turn off ZIGi" with "Also delete all chats". Everything here is
 * a device setting; keys live in the encrypted key store and are never shown back.
 */
const PAGE_NOTES: Record<PageArea, string> = {
  today: 'what is due today and what you did: open habits, today\'s water, steps and meals as counts, goals with their next dates',
  goals: 'each goal\'s name, target, progress and next planned date; never account, wallet or chain details',
  habits: 'each habit\'s title, schedule, target, today\'s state and streak',
  health: 'today\'s diary as names and counts, water, weight, steps, measurements, fasting; only with Include Health',
  wealth: 'tracked holdings by name and class with your recorded values, one total per currency; Portfolio as Real or Hypothetical; prices only as the page shows them',
  help: 'the Help notes about how ZIGoals works; no records',
};
/**
 * Session V Part 8: "What ZIGi knows about me", the person's notes, loaded only when its card opens (a link to
 * #zigi-notes opens it: the "Remember this?" cards and Activity point here).
 */
const NotesPanel = lazy(() => import('./ai-notes'));
const NOTES_ANCHOR = 'zigi-notes';
function NotesCard() {
  const [open, setOpen] = useState(false), card = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const follow = () => { if (window.location.hash !== `#${NOTES_ANCHOR}`) return; setOpen(true); requestAnimationFrame(() => card.current?.scrollIntoView({block: 'start'})); };
    follow(); window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);
  return <details ref={card} id={NOTES_ANCHOR} className="ai-notes-card" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="ai-pack-summary">What ZIGi knows about me</summary>
    <p className="ai-note">Your own notes for ZIGi: goals, preferences, constraints, diet style, schedule. ZIGi keeps only what you write here or confirm on a &ldquo;Remember this?&rdquo; card; it never guesses about you.</p>
    {open && <Suspense fallback={<p className="ai-note" role="status">Loading…</p>}><NotesPanel/></Suspense>}
  </details>;
}
/** Session V Part 5: the context pack, loaded only when the person opens its card. */
const ContextPackPanel = lazy(() => import('./context-pack'));
function ContextPackCard() {
  const [open, setOpen] = useState(false);
  return <details className="ai-pack" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="ai-pack-summary">Context pack for my AI</summary>
    <p className="ai-note">A file of your records to add to your AI&rsquo;s project knowledge (Claude Projects, ChatGPT Projects, Gemini Gems or similar), so it knows your goals, habits and wealth between chats. Made on this device; nothing is sent from here.</p>
    {open && <Suspense fallback={<p className="ai-note" role="status">Loading…</p>}><ContextPackPanel/></Suspense>}
  </details>;
}
function useOpenRouterCallback(): {seed: SetupSeed; error: string | null} {
  const [state, setState] = useState<{seed: SetupSeed; error: string | null}>({seed: null, error: null});
  useEffect(() => {
    const code = readOpenRouterCallback(window.location.href); if (!code) return;
    window.history.replaceState(window.history.state, '', cleanedCallbackUrl(window.location.href));
    let active = true;
    exchangeOpenRouterCode({code, storage: window.sessionStorage}).then(({key, remember}) => { if (active) setState({seed: {provider: 'openrouter', key, remember}, error: null}); })
      .catch(error => { if (active) setState({seed: null, error: error instanceof Error ? error.message : 'The OpenRouter sign-in did not finish.'}); });
    return () => { active = false; };
  }, []);
  return state;
}
export default function AiSettings() {
  const settings = useAiSettings(), data = settings.data, scope = currentAiScope(), showcase = scope === SHOWCASE_SCOPE, callback = useOpenRouterCallback();
  const dashboard = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings), healthConsent = useHealthConsent();
  const [remembered, setRemembered] = useState<boolean | null>(null), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null), [models, setModels] = useState<ModelInfo[] | null>(null), [modelsBusy, setModelsBusy] = useState(false), [turningOff, setTurningOff] = useState(false), [alsoChats, setAlsoChats] = useState(false), [keyDraft, setKeyDraft] = useState('');
  const provider = data.provider ? PROVIDERS[data.provider] : null, connected = data.enabled && data.mode !== 'subscription' && !!data.provider && !!data.model;
  const layoutHasHealth = dashboard.loaded && !dashboard.error && visibleDomains(dashboard.data).includes('health');
  useEffect(() => { let active = true; if (!data.provider) { setRemembered(null); return; } hasRememberedKey(scope, data.provider).then(v => { if (active) setRemembered(v); }).catch(() => { if (active) setRemembered(false); }); return () => { active = false; }; }, [scope, data.provider, data.enabled, data.rememberKey]);
  const save = useCallback((change: (s: AiSettingsData) => AiSettingsData, text?: string) => { try { settings.update(change); if (text) setMessage({text}); } catch (error) { setMessage({text: `The setting was not saved on this device. ${error instanceof Error ? error.message : ''}`.trim(), failed: true}); } }, [settings]);
  const loadModels = async () => {
    if (!data.provider) return; setModelsBusy(true); setMessage(null);
    try { const key = await readKey(scope, data.provider); const list = await listModels({provider: data.provider, key, baseUrl: data.baseUrl ?? undefined, localServer: data.localServer ?? undefined}); setModels(list.filter(m => m.kind === 'chat')); }
    catch (error) { setMessage({text: error instanceof AiError ? `${error.message} ${errorSteps(error, {providerName: provider?.name ?? 'your provider', hostedPage: true, keysUrl: provider?.keysUrl ?? null}).join(' ')}` : 'The model list could not be loaded.', failed: true}); }
    finally { setModelsBusy(false); }
  };
  const disconnect = async () => {
    try { if (data.provider) await forgetKey(scope, data.provider); } catch { /* the store may be gone already */ }
    dropMemoryKeys();
    save(s => ({...s, enabled: false, mode: null, provider: null, model: null, localServer: null, baseUrl: null, subscriptionApp: null, connectedOn: undefined}), 'Disconnected. The key was removed from this device; your switches and instructions are kept.');
    setModels(null);
  };
  const turnOff = async () => {
    try { await forgetAiKeys(scope); } catch { /* nothing remembered */ }
    dropMemoryKeys();
    let chatsNote = '';
    if (alsoChats) { try { await forgetChats(scope); chatsNote = ' All chats on this device were deleted.'; } catch { chatsNote = ' The chats could not be deleted; try again from here.'; } }
    try { settings.turnOff(); setMessage({text: `ZIGi is off. Keys were removed from this device.${chatsNote}`}); } catch (error) { setMessage({text: `ZIGi could not be turned off on this device. ${error instanceof Error ? error.message : ''}`.trim(), failed: true}); }
    setTurningOff(false); setAlsoChats(false); setModels(null);
  };
  const toggleRemember = async (next: boolean) => {
    if (!data.provider) { save(s => ({...s, rememberKey: next})); return; }
    try {
      if (next) { const key = await readKey(scope, data.provider); if (key && !showcase) await rememberKey(scope, data.provider, key); else if (!key) { setMessage({text: 'Enter the key below first; it is then sealed on this device.'}); } }
      else await forgetKey(scope, data.provider);
      save(s => ({...s, rememberKey: next && !showcase}), next ? 'The key is sealed on this device.' : 'The key is kept for this page only now.');
    } catch (error) { setMessage({text: error instanceof Error ? error.message : 'The key store could not be changed.', failed: true}); }
  };
  const replaceKey = async () => {
    const secret = keyDraft.trim(); if (!secret || !data.provider) return;
    try { holdKey(scope, data.provider, secret); if (data.rememberKey && !showcase) await rememberKey(scope, data.provider, secret); setKeyDraft(''); setMessage({text: data.rememberKey && !showcase ? 'The new key is sealed on this device.' : 'The new key is kept for this page.'}); }
    catch (error) { setMessage({text: error instanceof Error ? error.message : 'The key could not be stored.', failed: true}); }
  };
  const browser = typeof navigator === 'undefined' ? 'other' : detectBrowser(navigator.userAgent), language = speechLanguage(data.voice.language, typeof navigator === 'undefined' ? undefined : navigator.language);
  return <div className="ai-settings-body">
    {settings.unreadable && <p role="alert">This device&rsquo;s ZIGi settings could not be read; they count as off until you save a choice here.</p>}
    {callback.error && <p role="alert">{callback.error}</p>}
    {!data.enabled && settings.loaded && <AiSetup settings={settings} scope={scope} seed={callback.seed} onDone={() => setMessage({text: 'Connected. ZIGi now answers with your own AI on every page where sharing is on; open it from the button at the bottom right or with ⌘K / Ctrl+K. Health stays off until you turn on “Include Health”.'})}/>}
    {data.enabled && <div className="ai-connection">
      <ZigiAvatar state="idle" size={44} decorative/>
      <div className="ai-connection-copy">
        <strong>{data.mode === 'subscription' ? `Subscription bridge · ${SUBSCRIPTION_APPS.find(a => a.id === data.subscriptionApp)?.name ?? 'your app'}` : `${provider?.name ?? 'Your AI'} · ${data.model}`}</strong>
        <small>{data.mode === 'local' ? `${data.localServer === 'ollama' ? 'Ollama' : 'OpenAI-compatible server'} at ${data.baseUrl}` : data.mode === 'subscription' ? 'ZIGi writes the prompt; you paste it into the app. Nothing is sent from here.' : remembered === null ? 'Checking the key on this device…' : remembered ? 'Key sealed on this device.' : showcase ? 'Key kept for this session (Showcase).' : 'Key kept in this page’s memory only (gone after a reload).'}{data.connectedOn ? ` · since ${data.connectedOn}` : ''}</small>
      </div>
      <div className="ai-card-actions">
        {connected && <button type="button" className="secondary" disabled={modelsBusy} onClick={() => models ? setModels(null) : void loadModels()}>{modelsBusy ? 'Loading models…' : models ? 'Hide models' : 'Change model'}</button>}
        <button type="button" className="secondary" onClick={() => void disconnect()}>Disconnect</button>
      </div>
    </div>}
    {models && <div className="ai-setup-form"><ModelPicker models={models} value={data.model} onChange={id => { save(s => ({...s, model: id}), `Model changed to ${id}.`); setModels(null); }}/></div>}
    {data.enabled && data.mode !== 'subscription' && data.provider && !showcase && <div className="ai-setup-form ai-key-replace">
      <Switch checked={data.rememberKey} onChange={next => void toggleRemember(next)} label="Remember the key on this device" note="Encrypted at rest with a key that never leaves this browser. Protects against casual reading of the disk or a backup, not against malware on this device. Off: the key lives in this page’s memory and is forgotten on reload or when the tab closes."/>
      <label className="field">Replace the key<input type="password" value={keyDraft} onChange={e => setKeyDraft(e.target.value)} autoComplete="off" spellCheck={false} autoCapitalize="off" placeholder="Paste a new key"/></label>
      <div className="ai-card-actions"><button type="button" className="secondary" disabled={!keyDraft.trim()} onClick={() => void replaceKey()}>Use this key</button></div>
    </div>}
    {data.enabled && <>
      <h3>What each page may share</h3>
      <p className="ai-note">On by default except Health. Off means ZIGi answers without that page&rsquo;s data. Identifiers, wallet addresses, chain details, account and sync metadata are never sent.</p>
      <div className="ai-switch-list">{PAGE_AREAS.map(area => <Switch key={area} checked={data.pageShare[area]} onChange={next => save(s => ({...s, pageShare: {...s.pageShare, [area]: next}}))} label={`${AREA_LABELS[area]} page data`} note={PAGE_NOTES[area]}/>)}</div>
      <Switch checked={data.includeHealth} onChange={next => save(s => ({...s, includeHealth: next}))} label="Include Health" disabled={!layoutHasHealth} note={!layoutHasHealth ? 'Health is not part of your Today layout on this device, so nothing from Health can be shared. Add Health to Today first.' : healthConsent.accountActive && !healthConsent.accountHealthPermitted ? 'With your account open, Health is shared only when the account\'s Health permission is on for this device (Settings → Account & sync). It is not, so Health stays out.' : 'Health goes to your AI only with this switch, the Health page switch above and, with an account, its Health permission. Off by default.'}/>
      {data.mode !== 'subscription' && <AiDataUsage settings={data} scope={scope}/>}
      <h3>Spend protection</h3>
      <div className="ai-fields">
        <label className="field">Output cap per reply (tokens)<input type="number" min={OUTPUT_CAP.min} max={OUTPUT_CAP.max} step={64} value={data.maxOutputTokens} onChange={e => { const v = Number(e.target.value); if (v >= OUTPUT_CAP.min && v <= OUTPUT_CAP.max) save(s => ({...s, maxOutputTokens: Math.round(v)})); }}/><small>Sent as the provider&rsquo;s maximum; a longer reply is cut off and says so. Default {OUTPUT_CAP.default}.</small></label>
        <label className="field">Context budget (tokens)<input type="number" min={CONTEXT_BUDGET.min} max={CONTEXT_BUDGET.max} step={500} value={data.contextBudgetTokens} onChange={e => { const v = Number(e.target.value); if (v >= CONTEXT_BUDGET.min && v <= CONTEXT_BUDGET.max) save(s => ({...s, contextBudgetTokens: Math.round(v)})); }}/><small>Page data plus the last messages, estimated at four characters a token; above it ZIGi asks before sending. Default {CONTEXT_BUDGET.default}.</small></label>
      </div>
      <h3>Voice</h3>
      <div className="ai-fields">
        <label className="field">Speaking to ZIGi<select value={data.voice.transcription} onChange={e => save(s => ({...s, voice: {...s.voice, transcription: e.target.value as AiSettingsData['voice']['transcription'], transcriptionModel: e.target.value === 'provider' ? s.voice.transcriptionModel ?? TRANSCRIPTION_MODELS[0] : s.voice.transcriptionModel}}))}><option value="off">Off (type)</option><option value="browser">Browser speech recognition</option>{data.provider && PROVIDERS[data.provider].transcription && <option value="provider">Recorded, transcribed by {PROVIDERS[data.provider].name}</option>}</select><small>{data.voice.transcription === 'browser' ? browserSpeechDisclosure(browser, false) : data.voice.transcription === 'provider' ? `Recordings of up to a minute go from this browser to ${provider?.name ?? 'your provider'} with your key; nothing through ZIGoals.` : 'The microphone is not used.'}</small></label>
        {data.voice.transcription === 'provider' && <label className="field">Transcription model<select value={data.voice.transcriptionModel ?? TRANSCRIPTION_MODELS[0]} onChange={e => save(s => ({...s, voice: {...s.voice, transcriptionModel: e.target.value}}))}>{TRANSCRIPTION_MODELS.map(m => <option key={m} value={m}>{m}</option>)}</select></label>}
        <label className="field">Language<input value={data.voice.language ?? ''} onChange={e => save(s => ({...s, voice: {...s.voice, language: e.target.value.trim() || null}}))} placeholder={language} maxLength={35} autoComplete="off" spellCheck={false}/><small>A language tag such as en-US, de-DE or pt-BR; empty follows this device ({language}).</small></label>
      </div>
      <Switch checked={data.voice.readAloud} onChange={next => save(s => ({...s, voice: {...s.voice, readAloud: next}}))} label="Read replies aloud" note="Uses the browser's own voices on this device. Off by default; every reply also has its own Read aloud button."/>
      <h3>Your own instructions</h3>
      <label className="field">Sent with every message (up to 2,000 characters)<textarea value={data.customInstructions} maxLength={2000} rows={3} onChange={e => save(s => ({...s, customInstructions: e.target.value}))} placeholder="For example: answer in Spanish; keep it under five sentences; I prefer kilograms."/></label>
      <h3>The launcher</h3>
      <Switch checked={!data.launcherHidden} onChange={next => save(s => ({...s, launcherHidden: !next}))} label="Show the ZIGi button" note="Bottom right on a computer, above the tabs on a phone. ⌘K / Ctrl+K opens the chat as well."/>
      <h3>What your AI sees</h3>
      <p className="ai-note">Only this page&rsquo;s data, as plain text between data marks, after the instruction that it is records and not commands. Open ZIGi on any page and expand &ldquo;What your AI sees&rdquo; for the exact text that would go with your next message. Chats are kept on this device per account and are part of &ldquo;Export everything&rdquo;; keys never are.</p>
      <h3>Turn off</h3>
      {!turningOff ? <div className="ai-card-actions"><button type="button" className="secondary" onClick={() => setTurningOff(true)}>Turn off ZIGi</button><span className="ai-note">Removes the keys from this device and resets the switches. Chats stay unless you choose below.</span></div>
        : <div className="ai-confirm" role="group" aria-label="Turn off ZIGi"><p>ZIGi goes off on this device: the connection and its keys are removed, every switch goes back to the start.</p><label className="ai-check"><input type="checkbox" checked={alsoChats} onChange={e => setAlsoChats(e.target.checked)}/> Also delete all chats on this device</label><div className="ai-card-actions"><button type="button" className="primary" onClick={() => void turnOff()}>Turn off ZIGi</button><button type="button" className="text-link" onClick={() => { setTurningOff(false); setAlsoChats(false); }}>Keep it on</button></div></div>}
    </>}
    {settings.loaded && <NotesCard/>}
    {settings.loaded && <ContextPackCard/>}
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
    <p className="fine">Costs are between you and your provider; ZIGoals bills nothing. It counts the tokens your provider reports and, only with prices you enter, shows an estimate. Not for medical or financial advice. <Link className="text-link" href="/app/help#your-ai">How ZIGi works, in Help →</Link></p>
  </div>;
}

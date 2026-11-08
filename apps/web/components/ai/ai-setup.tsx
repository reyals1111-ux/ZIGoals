'use client';
import {useCallback, useEffect, useState} from 'react';
import {AiError, errorSteps} from '../../lib/ai/errors';
import {forgetKey, holdKey, rememberKey, SHOWCASE_SCOPE} from '../../lib/ai/keys';
import {LIVE_PRIVACY_PROBES} from '../../lib/ai/privacy-probes';
import {detectLocalServer, testConnection} from '../../lib/ai/models';
import {beginOpenRouterSignIn} from '../../lib/ai/openrouter-auth';
import {LOCAL_SERVER_DEFAULTS, normalizeLocalBaseUrl, PROVIDERS, SUBSCRIPTION_APPS, type ProviderId, type SubscriptionAppId} from '../../lib/ai/providers';
import type {AiSettings} from '../../lib/ai/settings';
import type {ModelInfo} from '../../lib/ai/types';
import {localDate} from '../../lib/local-date';
import {usePhoneActive} from '../phone/use-phone-layout';
import {ZigiAvatar} from '../zigi/zigi-avatar';
import {ModelPicker} from './model-picker';
import {suggestModel} from '../../lib/ai/suggest-model';
import type {AiSettingsStore} from './use-ai-settings';

/**
 * Connecting your own AI (ADR-012, Part 8), three honest paths: an API key, a local model on this computer, or the
 * subscription bridge. The connection test is the provider's model list, fetched from this browser with the key; the
 * person then picks a model from that list. The key stays in memory for this page, or sealed on this device when
 * "Remember on this device" is on (default on in the installed app, off in a tab; never in Showcase). Nothing here
 * talks to ZIGoals' servers.
 */
export type SetupSeed = {provider: 'openrouter'; key: string; remember: boolean} | null;
type Path = 'api' | 'local' | 'subscription';
type Failure = {title: string; steps: string[]};
const API_PROVIDERS: ProviderId[] = ['openai', 'anthropic', 'gemini', 'xai', 'openrouter'];
const hostedPage = () => typeof window !== 'undefined' && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
/** This page's origin, for the server settings above (the hosted Alpha's when there is no window). */
const origin = () => typeof window === 'undefined' ? 'https://alpha.zigoals.app' : window.location.origin;
/** llama.cpp's llama-server default address since its port moved to 9931 (lib/nova/local-servers.ts LLAMA_CPP_DEFAULT). */
const LLAMA_CPP_DEFAULT = 'http://127.0.0.1:9931';
function failureOf(error: unknown, providerName: string, local?: {server: 'ollama' | 'openai-compatible' | null; baseUrl: string}, keysUrl: string | null = null): Failure {
  if (error instanceof AiError) return {title: error.message, steps: errorSteps(error, {providerName, local, hostedPage: hostedPage(), keysUrl})};
  return {title: error instanceof Error ? error.message : 'Something went wrong.', steps: []};
}
/**
 * Session AK P4 (FIRST_RUN_REVIEW FR-10, FR-11): `assistant` is whose setup this is (NOVA's guide says NOVA, not ZIGi);
 * `suggest` is the guide's pick and the memory it chose, so a found local model is chosen already (lib/ai/suggest-model.ts).
 */
/** The program the person runs, as far as its answer and port say (MO-061: never "Ollama" for LM Studio's port). */
function serverName(server: 'ollama' | 'openai-compatible', baseUrl: string): string {
  if (server === 'ollama') return 'Ollama';
  const port = (() => { try { return new URL(baseUrl).port; } catch { return ''; } })();
  return port === '1234' ? 'LM Studio (an OpenAI-compatible server)' : port === '9931' || port === '8080' ? 'llama.cpp (an OpenAI-compatible server)' : 'an OpenAI-compatible server';
}
export function AiSetup({settings, scope, seed = null, onDone, assistant = 'ZIGi', suggest}: {settings: AiSettingsStore; scope: string; seed?: SetupSeed; onDone?: () => void; assistant?: string; suggest?: {prefer?: readonly string[]; maxParams?: number | null}}) {
  const showcase = scope === SHOWCASE_SCOPE, phone = usePhoneActive();
  const [path, setPath] = useState<Path | null>(seed ? 'api' : null), [provider, setProvider] = useState<ProviderId>(seed?.provider ?? 'openai'), [key, setKey] = useState(seed?.key ?? '');
  const [remember, setRemember] = useState(seed ? seed.remember : settings.installed && !showcase);
  const [baseUrl, setBaseUrl] = useState<string>(() => settings.data.provider === 'local' && settings.data.baseUrl ? settings.data.baseUrl : LOCAL_SERVER_DEFAULTS.ollama), /* Session AL (BN-049, P-BN-05): the address in use stays in the form */ [localServer, setLocalServer] = useState<'ollama' | 'openai-compatible' | null>(null), [token, setToken] = useState('');
  const [app, setApp] = useState<SubscriptionAppId>('chatgpt');
  const [models, setModels] = useState<ModelInfo[] | null>(null), [model, setModel] = useState<string | null>(null), [suggested, setSuggested] = useState<string | null>(null), [busy, setBusy] = useState<'test' | 'connect' | 'signin' | null>(null), [failure, setFailure] = useState<Failure | null>(null), [done, setDone] = useState(false);
  useEffect(() => { setRemember(settings.installed && !showcase); }, [settings.installed, showcase]);
  const reset = () => { setModels(null); setModel(null); setFailure(null); };
  const test = useCallback(async () => {
    // Session AL second pass (Moscow MO-061, P-MO-16): a new test starts from a clean status, never an earlier "Found …".
    setBusy('test'); setFailure(null); setModels(null); setModel(null); setLocalServer(null);
    try {
      if (path === 'api') {
        const list = await testConnection({provider, key: key.trim() || null});
        setModels(list.filter(m => m.kind === 'chat'));
      } else if (path === 'local') {
        const normalised = normalizeLocalBaseUrl(baseUrl), auth = token.trim() || null;
        const server = await detectLocalServer({baseUrl: normalised, key: auth});
        // Security delta A (SA-7, 8 Nov): the same "is it really Ollama" check NOVA's scan runs (BN-035): a server that only
        // looks like Ollama never gets "Found Ollama", a model list or Connect. Loaded with the test, not with the page.
        if (server === 'ollama') {
          const {verifyOllama} = await import('../../lib/nova/local-servers');
          const real = await verifyOllama(normalised);
          if (!real.ok) { setBaseUrl(normalised); setFailure({title: real.message, steps: []}); return; }
        }
        setLocalServer(server); setBaseUrl(normalised);
        const list = await testConnection({provider: 'local', key: auth, baseUrl: normalised, localServer: server});
        const chat = list.filter(m => m.kind === 'chat'), pick = suggestModel(chat, suggest ?? {});
        setModels(chat); setModel(pick); setSuggested(pick);
      }
    } catch (error) {
      setFailure(path === 'local' ? failureOf(error, 'your local server', {server: localServer, baseUrl}) : failureOf(error, PROVIDERS[provider].name, undefined, PROVIDERS[provider].keysUrl));
    } finally { setBusy(null); }
  }, [baseUrl, key, localServer, path, provider, token, suggest]);
  const connect = useCallback(async () => {
    setBusy('connect'); setFailure(null);
    try {
      const today = localDate();
      if (path === 'subscription') {
        settings.update(s => ({...s, enabled: true, mode: 'subscription', provider: null, model: null, localServer: null, baseUrl: null, subscriptionApp: app, connectedOn: today}));
      } else if (path === 'api') {
        if (!model) throw Error('Choose a model first.');
        const secret = key.trim(); if (!secret) throw Error('Enter the key first.');
        holdKey(scope, provider, secret);
        if (remember && !showcase) await rememberKey(scope, provider, secret);
        settings.update(s => ({...s, enabled: true, mode: 'api', provider, model, localServer: null, baseUrl: null, subscriptionApp: null, rememberKey: remember && !showcase, connectedOn: today}));
      } else if (path === 'local') {
        if (!model || !localServer) throw Error('Test the connection and choose a model first.');
        const secret = token.trim();
        if (secret) { holdKey(scope, 'local', secret); if (remember && !showcase) await rememberKey(scope, 'local', secret); }
        // Session AL Part 14 (security review Z1A-I4): a server connected without a token never gets the key an earlier
        // local server had (such as the Hermes key "Use Hermes as NOVA's brain" put in this slot).
        else await forgetKey(scope, 'local');
        settings.update(s => ({...s, enabled: true, mode: 'local', provider: 'local', model, localServer, baseUrl: normalizeLocalBaseUrl(baseUrl), subscriptionApp: null, rememberKey: remember && !showcase, connectedOn: today}));
        // Z1A-6 (AL Part 14): a server whose /health says it is Hermes Agent is noted as the person's Hermes (treated as such by the privacy mode).
        if (localServer === 'openai-compatible') void LIVE_PRIVACY_PROBES.hermes?.(normalizeLocalBaseUrl(baseUrl)).catch(() => undefined);
      }
      setKey(''); setToken(''); setDone(true); onDone?.();
    } catch (error) { setFailure({title: error instanceof Error ? error.message : 'The connection could not be saved.', steps: []}); }
    finally { setBusy(null); }
  }, [app, baseUrl, key, localServer, model, onDone, path, provider, remember, scope, settings, showcase, token]);
  const signInOpenRouter = useCallback(async () => {
    setBusy('signin'); setFailure(null);
    try { const url = await beginOpenRouterSignIn({origin: window.location.origin, remember: remember && !showcase, storage: window.sessionStorage}); window.location.assign(url); }
    catch (error) { setFailure({title: error instanceof Error ? error.message : 'The sign-in could not start.', steps: ['Paste an OpenRouter key instead.']}); setBusy(null); }
  }, [remember, showcase]);
  const nova = assistant !== 'ZIGi';
  if (done) return <div className="ai-setup-done"><ZigiAvatar state="celebrate" size={64} decorative/><div><p><strong>Connected.</strong> {nova ? `${assistant} now answers with your own model.` : 'ZIGi now answers with your own AI on every page where sharing is on.'} Health stays off until you turn on &ldquo;Include Health&rdquo;{nova ? ' in planet 5' : ' below'}.</p><p className="ai-note">{nova ? `Ask it on ${assistant}.` : 'Open ZIGi from the button at the bottom right, with ⌘/Ctrl+Shift+Z, or from the command menu (⌘/Ctrl+K).'}</p></div></div>;
  return <div className="ai-setup" data-testid="ai-setup">
    {path === null && <div className="ai-setup-paths" role="group" aria-label="How do you want to connect your AI?">
      <button type="button" className="ai-path" onClick={() => setPath('api')}><strong>I have an API key</strong><span>OpenAI, Anthropic, Google Gemini, xAI or OpenRouter. Pay-as-you-go, billed by them.</span></button>
      <button type="button" className="ai-path" onClick={() => setPath('local')}><strong>I run a model on this computer</strong><span>Ollama, LM Studio or any OpenAI-compatible server on localhost. Free, private, needs this computer.</span></button>
      <button type="button" className="ai-path" onClick={() => setPath('subscription')}><strong>I only have a subscription</strong><span>ChatGPT, Claude, Grok or Gemini apps. Not available inside a browser app: ZIGoals writes the prompt and you paste it there.</span></button>
    </div>}
    {path !== null && <button type="button" className="text-link ai-setup-back" onClick={() => { setPath(null); reset(); }}>← Other ways to connect</button>}
    {path === 'api' && <div className="ai-setup-form">
      <label className="field">Provider<select value={provider} onChange={e => { setProvider(e.target.value as ProviderId); reset(); }}>{API_PROVIDERS.map(id => <option key={id} value={id}>{PROVIDERS[id].name}</option>)}</select></label>
      <p className="ai-note">Create or copy a key at <a href={PROVIDERS[provider].keysUrl!} target="_blank" rel="noopener noreferrer">{PROVIDERS[provider].keysUrl}</a>. It is sent only to {PROVIDERS[provider].name}, in a header, from this browser.</p>
      {provider === 'openrouter' && <div className="ai-card-actions"><button type="button" className="secondary" disabled={busy !== null} onClick={() => void signInOpenRouter()}>{busy === 'signin' ? 'Opening OpenRouter…' : 'Sign in with OpenRouter instead'}</button><span className="ai-note">OpenRouter&rsquo;s own sign-in (PKCE) gives ZIGoals a key you can see and revoke there.</span></div>}
      <label className="field">API key<input type="password" value={key} onChange={e => { setKey(e.target.value); reset(); }} autoComplete="off" spellCheck={false} autoCapitalize="off" inputMode="text" placeholder="Paste the key" aria-describedby="ai-key-note"/></label>
      <label className="ai-check"><input type="checkbox" checked={remember && !showcase} disabled={showcase} onChange={e => setRemember(e.target.checked)}/> Remember on this device {showcase ? <small>(Showcase keeps keys for this session only)</small> : <small>(encrypted at rest; protects against casual reading of the disk or a backup, not against malware on this device)</small>}</label>
      <p className="ai-note" id="ai-key-note">{remember && !showcase ? 'Sealed with a key that never leaves this browser. Disconnect or “Turn off ZIGi” removes it.' : 'Kept in this page’s memory only: a reload or closing the tab forgets it, and you paste it again.'}</p>
      <div className="ai-card-actions"><button type="button" className="secondary" disabled={!key.trim() || busy !== null} onClick={() => void test()}>{busy === 'test' ? 'Testing…' : 'Test connection'}</button></div>
    </div>}
    {path === 'local' && <div className="ai-setup-form">
      <div className="ai-card-actions" role="group" aria-label="Server presets"><button type="button" className="secondary" onClick={() => { setBaseUrl(LOCAL_SERVER_DEFAULTS.ollama); reset(); }}>Ollama (11434)</button><button type="button" className="secondary" onClick={() => { setBaseUrl(LOCAL_SERVER_DEFAULTS['openai-compatible']); reset(); }}>LM Studio (1234)</button><button type="button" className="secondary" onClick={() => { setBaseUrl(LLAMA_CPP_DEFAULT); reset(); }}>llama.cpp (9931)</button></div>
      <label className="field">Server address<input type="url" value={baseUrl} onChange={e => { setBaseUrl(e.target.value); reset(); }} autoComplete="off" spellCheck={false} inputMode="url" placeholder="http://127.0.0.1:11434"/></label>
      <label className="field">Server token (only if your server asks for one)<input type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" spellCheck={false}/></label>
      {token.trim() && <label className="ai-check"><input type="checkbox" checked={remember && !showcase} disabled={showcase} onChange={e => setRemember(e.target.checked)}/> Remember the token on this device</label>}
      <details className="ai-setup-notes"><summary>Before you test: what the server needs</summary><ul>
        {/* Session AK (owner follow-up 2, lane NC): docs/research/session-ak/NOVA.md §2, read 1 Nov 2026. */}
        {hostedPage() ? <li><strong>Ollama</strong> must allow this site, then restart. macOS: <code>launchctl setenv OLLAMA_ORIGINS &quot;{origin()}&quot;</code>, then quit Ollama from the menu bar and open it again (this lasts until the Mac restarts). Windows: <code>setx OLLAMA_ORIGINS &quot;{origin()}&quot;</code>, then quit Ollama from the taskbar and start it again. Linux: <code>sudo systemctl edit ollama.service</code>, add <code>Environment=&quot;OLLAMA_ORIGINS={origin()}&quot;</code> under <code>[Service]</code>, then <code>sudo systemctl daemon-reload</code> and <code>sudo systemctl restart ollama</code>.</li> : <li><strong>Ollama</strong> allows pages on localhost and 127.0.0.1 by default.</li>}
        <li><strong>LM Studio:</strong> Developer → Server Settings → turn <strong>Enable CORS</strong> on, then start the server. LM Studio recommends <strong>Require Authentication</strong> too: paste its token above.</li>
        <li><strong>llama.cpp:</strong> <code>llama-server</code> listens on port 9931 by default now (older guides say 8080){hostedPage() ? <>; start it with <code>--cors-origins {origin()}</code></> : null}.</li>
        {hostedPage() && <li><strong>Chrome and Edge</strong> ask once whether this site may &ldquo;Access other apps and services on this device&rdquo;; <strong>Firefox</strong> asks too: allow it. <strong>Safari</strong> cannot reach a model on this computer from this site: use Chrome, Edge or Firefox here.</li>}
        {phone && <li><strong>A phone cannot reach a computer&rsquo;s localhost.</strong> Use a cloud provider here, or ZIGoals on the computer.</li>}
      </ul></details>
      <div className="ai-card-actions"><button type="button" className="secondary" disabled={!baseUrl.trim() || busy !== null} onClick={() => void test()}>{busy === 'test' ? 'Testing…' : 'Test connection'}</button>{localServer && models !== null && !failure && busy === null && <span className="ai-note" role="status">Found {serverName(localServer, baseUrl)} at {baseUrl}.</span>}</div>
    </div>}
    {path === 'subscription' && <div className="ai-setup-form">
      <p>A subscription to a chat app gives no connection a browser app may use, and ZIGoals never asks for your password or reads your cookies. Instead, ZIGi writes the question with your page data; you copy it, open the app, and paste.</p>
      <div className="ai-card-actions" role="group" aria-label="Which app do you use?">{SUBSCRIPTION_APPS.map(a => <button key={a.id} type="button" className={a.id === app ? 'primary' : 'secondary'} aria-pressed={a.id === app} onClick={() => setApp(a.id)}>{a.name}</button>)}</div>
      <div className="ai-card-actions"><button type="button" className="primary" disabled={busy !== null} onClick={() => void connect()}>{busy === 'connect' ? 'Saving…' : `Use my ${SUBSCRIPTION_APPS.find(a => a.id === app)?.name} subscription`}</button></div>
    </div>}
    {failure && <div className="ai-failure" role="alert"><p className="ai-failure-title">{failure.title}</p>{failure.steps.length > 0 && <ul>{failure.steps.map((step, i) => <li key={i}>{step}</li>)}</ul>}</div>}
    {models && path !== 'subscription' && <div className="ai-setup-form">
      <ModelPicker models={models} value={model} onChange={setModel} suggested={suggested}/>
      <div className="ai-card-actions"><button type="button" className="primary" disabled={!model || busy !== null} onClick={() => void connect()}>{busy === 'connect' ? 'Connecting…' : 'Connect'}</button></div>
    </div>}
    <p className="ai-note">Sharing starts on for Today, Goals, Habits, Wealth and Help, off for Health; you change every switch below. Nothing is written to your records unless you add a proposal card.</p>
  </div>;
}
export type {AiSettings};

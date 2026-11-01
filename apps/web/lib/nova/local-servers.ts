import {AiError} from '../ai/errors';
import {listModels} from '../ai/models';
import {isOllamaCloudModel} from '../ai/privacy-mode';

/**
 * Session AK, owner follow-up 2 (N3 step 3, lane NC): the three local servers NOVA's guide knows, found through ZIGi's own
 * model listing (lib/ai/models.ts `listModels`, the connection test the setup has always used). Facts from
 * docs/research/session-ak/NOVA.md §2 (read 1 Nov 2026): Ollama listens on 127.0.0.1:11434 and lists models at /api/tags
 * (cloud models carry `remote_host`); LM Studio's server is http://localhost:1234 with OpenAI-compatible /v1/models;
 * llama.cpp's llama-server now defaults to 127.0.0.1:9931 (older guides and many setups use 8080). The content security
 * policy already allows http://localhost:* and http://127.0.0.1:* (egress-policy.json `localModelSources`); nothing here
 * reaches any other host. A probe runs only from the person's click (Chrome asks its loopback permission then).
 */
export type LocalServerId = 'ollama' | 'lmstudio' | 'llamacpp' | 'llamacpp-8080';
export type LocalServer = {id: LocalServerId; name: string; baseUrl: string; wire: 'ollama' | 'openai-compatible'};
export const LOCAL_SERVERS: readonly LocalServer[] = [
  {id: 'ollama', name: 'Ollama', baseUrl: 'http://127.0.0.1:11434', wire: 'ollama'},
  {id: 'lmstudio', name: 'LM Studio', baseUrl: 'http://localhost:1234', wire: 'openai-compatible'},
  {id: 'llamacpp', name: 'llama.cpp', baseUrl: 'http://127.0.0.1:9931', wire: 'openai-compatible'},
  {id: 'llamacpp-8080', name: 'llama.cpp (port 8080)', baseUrl: 'http://127.0.0.1:8080', wire: 'openai-compatible'},
];
/** llama.cpp's current default address, for the setup's preset (lib/ai/providers.ts LOCAL_SERVER_DEFAULTS has Ollama and LM Studio). */
export const LLAMA_CPP_DEFAULT = 'http://127.0.0.1:9931';
export type ScanModel = {id: string; cloud: boolean};
export type ScanResult =
  | {server: LocalServer; found: true; models: ScanModel[]}
  | {server: LocalServer; found: false; reason: 'unreachable' | 'refused' | 'unreadable'; message: string};
export const PROBE_MS = 3000;
function timed(signal: AbortSignal | undefined, ms: number): {signal: AbortSignal; done: () => void} {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), ms);
  const stop = () => controller.abort(); signal?.addEventListener('abort', stop, {once: true});
  return {signal: controller.signal, done: () => { clearTimeout(timer); signal?.removeEventListener('abort', stop); }};
}
/** Ollama's /api/tags names its cloud models with `remote_host` (or `remote_model`); those run on ollama.com. */
export function ollamaCloudNames(tags: unknown): Set<string> {
  const out = new Set<string>(), models = (tags as {models?: unknown} | null)?.models;
  if (Array.isArray(models)) for (const m of models) { const e = (m ?? {}) as Record<string, unknown>, name = typeof e.name === 'string' ? e.name : typeof e.model === 'string' ? e.model : null; if (name && (e.remote_host || e.remote_model)) out.add(name); }
  return out;
}
/** One server: its chat models through ZIGi's own listing, each marked cloud when Ollama runs it on ollama.com. */
export async function probeServer(server: LocalServer, {fetcher, signal, ms = PROBE_MS, key = null}: {fetcher?: typeof fetch; signal?: AbortSignal; ms?: number; key?: string | null} = {}): Promise<ScanResult> {
  const t = timed(signal, ms);
  try {
    const list = await listModels({provider: 'local', baseUrl: server.baseUrl, localServer: server.wire, key, signal: t.signal, fetcher});
    let cloud = new Set<string>();
    if (server.wire === 'ollama') {
      try { const f = fetcher ?? ((i: RequestInfo | URL, init?: RequestInit) => fetch(i, init)); const r = await f(`${server.baseUrl}/api/tags`, {signal: t.signal, cache: 'no-store', credentials: 'omit', mode: 'cors'}); if (r.ok) cloud = ollamaCloudNames(await r.json()); } catch { /* the names alone then */ }
    }
    return {server, found: true, models: list.filter(m => m.kind === 'chat').map(m => ({id: m.id, cloud: m.cloud === true || cloud.has(m.id) || isOllamaCloudModel(m.id)}))};
  } catch (error) {
    const kind = error instanceof AiError ? error.kind : 'local-unreachable';
    if (kind === 'bad-key' || kind === 'cors' || kind === 'blocked') return {server, found: false, reason: 'refused', message: error instanceof Error ? error.message : 'The server refused.'};
    if (kind === 'unreadable') return {server, found: false, reason: 'unreadable', message: 'A server answered, but its model list could not be read.'};
    // A server that refuses this site's origin looks the same to a page as no server at all (the browser hides the answer).
    return {server, found: false, reason: 'unreachable', message: 'Nothing answered, or the server does not allow this site yet.'};
  } finally { t.done(); }
}
/** Every known server, side by side; never more than one request in flight per server. */
export async function scanLocalServers(options: {fetcher?: typeof fetch; signal?: AbortSignal; ms?: number; servers?: readonly LocalServer[]} = {}): Promise<ScanResult[]> {
  return Promise.all((options.servers ?? LOCAL_SERVERS).map(server => probeServer(server, options)));
}
/** One plain line per scan: "Ollama: 3 models (1 runs on ollama.com)" or "LM Studio: not running". */
export function scanLine(result: ScanResult): string {
  if (!result.found) return `${result.server.name}: ${result.reason === 'unreachable' ? `nothing answered at ${result.server.baseUrl} (not running, or not allowing this site yet)` : result.message}`;
  const cloud = result.models.filter(m => m.cloud).length, n = result.models.length;
  if (!n) return `${result.server.name}: running, but no chat model is downloaded yet`;
  return `${result.server.name}: ${n} model${n === 1 ? '' : 's'} (${result.models.slice(0, 3).map(m => m.id).join(', ')}${n > 3 ? ', …' : ''})${cloud ? `; ${cloud} run${cloud === 1 ? 's' : ''} on ollama.com, not on this computer` : ''}`;
}

/**
 * Chrome 145+ asks once before a site reaches this computer's own apps ("Access other apps and services on this device";
 * permission `loopback-network`, older name `local-network-access`). Reading the state never asks; older Chrome can throw
 * on the old name, so each read is wrapped. 'unknown' where the browser has no such permission (Firefox asks its own way;
 * Safari blocks http://localhost from https pages altogether).
 */
export type LoopbackState = 'granted' | 'prompt' | 'denied' | 'unknown';
export async function loopbackPermission(permissions: Pick<Permissions, 'query'> | undefined = typeof navigator === 'undefined' ? undefined : navigator.permissions): Promise<LoopbackState> {
  if (!permissions) return 'unknown';
  for (const name of ['loopback-network', 'local-network-access']) {
    try { const status = await permissions.query({name} as unknown as PermissionDescriptor); if (status.state === 'granted' || status.state === 'prompt' || status.state === 'denied') return status.state; } catch { /* the next name */ }
  }
  return 'unknown';
}
export type BrowserKind = 'chromium' | 'firefox' | 'safari' | 'other';
export function browserKind(userAgent: string): BrowserKind {
  const ua = userAgent.toLowerCase();
  if (ua.includes('firefox/') || ua.includes('fxios/')) return 'firefox';
  if (ua.includes('edg/') || ua.includes('chrome/') || ua.includes('chromium/') || ua.includes('crios/')) return 'chromium';
  if (ua.includes('safari/') && ua.includes('applewebkit/')) return 'safari';
  return 'other';
}
/** What this browser does when a secure page reaches http://localhost, in plain words (NOVA.md §2.1). */
export function loopbackNote(kind: BrowserKind, phone: boolean): string {
  if (phone) return 'A phone cannot reach a computer’s own apps: its “localhost” is the phone itself. On a phone, NOVA uses on-device answers or a cloud key.';
  switch (kind) {
    case 'chromium': return 'Chrome and Edge ask once whether this site may “Access other apps and services on this device”. Choose Allow. If you blocked it: click the icon left of the address, turn on “Apps on device”, then reload.';
    case 'firefox': return 'Firefox asks once whether this site may connect to apps and services on your device. Choose Allow.';
    case 'safari': return 'Safari does not let a secure site reach a model on this computer (a known WebKit limit). Use Chrome, Edge or Firefox on this computer for a local model.';
    default: return 'Your browser may ask once whether this site may reach apps on this computer. Choose Allow.';
  }
}

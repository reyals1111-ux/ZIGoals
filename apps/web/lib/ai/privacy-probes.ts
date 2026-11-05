import {canonicalLocalBase, isHermesHealth, NOVA_HERMES, withSeenHermes} from '../nova/hermes-record';
import {rememberOllamaCloud} from '../nova/cloud-models';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import type {PrivacyProbes} from './privacy-mode';

/**
 * Session AL Part 14 (lane P14-B; security review Z1A-6 and Z1A-7's alternative): the privacy hook's live checks for a model
 * on this computer, each asked once per address (and model) in this page and kept for the visit:
 * - `/health` with `platform: hermes-agent`: the server is Hermes Agent, whatever address spelling or setup path led to it;
 *   the address is also noted in `zigoals:nova-hermes:v1` → `seenBases` so later visits know it without asking;
 * - Ollama's `/api/show` for a model it never listed: `remote_host`/`remote_model` mark one of its cloud models; the name is
 *   noted in `zigoals:nova-setup:v1` → `cloudModels` like a listing's.
 * Only this computer is asked (the address the person chose), nothing of the message goes with it, and a check that fails
 * or times out changes nothing.
 */
const WAIT_MS = 1500;
type Fetch = typeof fetch;
const json = async (r: Response) => { try { return await r.json() as unknown; } catch { return null; } };
const hermesAsked = new Map<string, Promise<boolean>>(), showAsked = new Map<string, Promise<boolean | null>>();
export async function hermesAt(baseUrl: string, fetcher: Fetch = (i, init) => fetch(i, init)): Promise<boolean> {
  const base = canonicalLocalBase(baseUrl); if (!base) return false;
  try { const r = await fetcher(`${base}/health`, {cache: 'no-store', credentials: 'omit', mode: 'cors', signal: AbortSignal.timeout(WAIT_MS)}); return r.ok && isHermesHealth(await json(r)); } catch { return false; }
}
export async function ollamaShowsCloud(baseUrl: string, model: string, fetcher: Fetch = (i, init) => fetch(i, init)): Promise<boolean | null> {
  try {
    const r = await fetcher(`${baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')}/api/show`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({model}), cache: 'no-store', credentials: 'omit', mode: 'cors', signal: AbortSignal.timeout(WAIT_MS)});
    if (!r.ok) return null;
    const body = await json(r) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return null;
    return !!(body.remote_host || body.remote_model);
  } catch { return null; }
}
function noteHermes(baseUrl: string): void {
  try { const store = getAppStorage(); if (readDeviceRecord(store, NOVA_HERMES).unreadable) return; updateDeviceRecord(store, NOVA_HERMES, r => withSeenHermes(r, baseUrl)); } catch { /* known for this visit only */ }
}
/** The probes the chat and NOVA's briefs pass to `guardRequest` (cached per address and model for this page). */
export const LIVE_PRIVACY_PROBES: PrivacyProbes = {
  hermes: baseUrl => {
    const key = canonicalLocalBase(baseUrl) ?? baseUrl;
    let asked = hermesAsked.get(key);
    if (!asked) { asked = hermesAt(baseUrl).then(found => { if (found) noteHermes(baseUrl); return found; }); hermesAsked.set(key, asked); }
    return asked;
  },
  ollamaCloud: (baseUrl, model) => {
    const key = `${canonicalLocalBase(baseUrl) ?? baseUrl}|${model}`;
    let asked = showAsked.get(key);
    if (!asked) { asked = ollamaShowsCloud(baseUrl, model).then(cloud => { if (cloud === true) rememberOllamaCloud([model]); return cloud; }); showAsked.set(key, asked); }
    return asked;
  },
};
/** Tests only: forget what this page asked. */
export const forgetPrivacyProbes = (): void => { hermesAsked.clear(); showAsked.clear(); };

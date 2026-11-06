import * as z from 'zod';
import {normalizeLocalBaseUrl} from '../ai/providers';
import type {KeySlot} from '../ai/keys';
import {readDeviceRecord, type DeviceRecordSpec} from '../device-record';
import {setupStepSchema, type PrivacyMode} from './setup';

/**
 * Session AK, owner follow-up 3 (N11; lane NC): the Hermes Agent device record and its pure rules, small enough for the
 * engine's privacy hook to read (lib/ai/privacy-mode.ts); the live test, delegation and the summary are in ./hermes.ts.
 * `zigoals:nova-hermes:v1`: the guide's progress (the same per-step shape as the NOVA guide), the gateway address, whether
 * the person confirmed a local model, and the last live check. No key here: keys live sealed in lib/ai/keys.ts.
 */
export const NOVA_HERMES_KEY = 'zigoals:nova-hermes:v1';
export const HERMES_STEPS = ['what', 'install', 'model', 'api', 'gateway', 'browser', 'connect', 'privacy', 'first-run', 'further'] as const;
export type HermesStepId = (typeof HERMES_STEPS)[number];
/** Hermes's API server default (its docs: API_SERVER_HOST 127.0.0.1, API_SERVER_PORT 8642), without the /v1 the wire adds. */
export const HERMES_DEFAULT_BASE = 'http://127.0.0.1:8642';
export const HERMES_DEFAULT_PORT = 8642;
/** The key store slot for the Hermes key: lib/ai/keys.ts's own sealed store; its slots are named by provider. */
export const HERMES_KEY_SLOT = 'hermes' satisfies KeySlot;
const iso = z.iso.datetime();
const stepShape = Object.fromEntries(HERMES_STEPS.map(id => [id, setupStepSchema.optional()])) as Record<HermesStepId, z.ZodOptional<typeof setupStepSchema>>;
export const hermesCheckSchema = z.looseObject({at: iso, reachable: z.boolean(), model: z.string().max(200).optional(), ms: z.number().int().min(0).max(600_000).optional(), problem: z.string().max(40).optional(),
  /** Session AL Part 14 (Z1A-I5): the version /health reported at this check, when it said one. */
  version: z.string().max(40).optional()});
export const novaHermesSchema = z.looseObject({
  version: z.literal(1),
  steps: z.looseObject(stepShape).optional(),
  /** The gateway's base address (http://127.0.0.1:8642), localhost only. */
  baseUrl: z.string().max(200).optional(),
  /** The model name /v1/models reported (usually "hermes-agent"). */
  model: z.string().max(200).optional(),
  /** The person confirmed in the guide that their Hermes runs a local model (only then is it Strict-safe). */
  localModelConfirmed: z.boolean().optional(),
  confirmedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /**
   * Session AL Part 14 (security review Z1A-I5): the gateway (one spelling, `canonicalLocalBase`) and the Hermes version
   * the confirmation was given for. A Hermes at another address or on another version is asked about again
   * (`localModelStillConfirmed`). Absent on a confirmation from before: that one stands as it was.
   */
  confirmedBase: z.string().max(200).optional(),
  confirmedVersion: z.string().max(40).optional(),
  /**
   * Session AL Part 14 (security review Z1A-6, its last line): other addresses on this computer whose /health said
   * `platform: hermes-agent` when a local server was connected (one spelling each, at most 8): a Hermes reached that way is
   * treated as Hermes too.
   */
  seenBases: z.array(z.string().max(200)).max(8).optional(),
  /** The last live check, for NOVA's panels. */
  lastCheck: hermesCheckSchema.optional(),
  finishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cardHidden: z.boolean().optional(),
});
export type NovaHermes = z.infer<typeof novaHermesSchema>;
export const NOVA_HERMES: DeviceRecordSpec<NovaHermes> = {key: NOVA_HERMES_KEY, schema: novaHermesSchema, empty: () => ({version: 1})};

/** "http://127.0.0.1:8642/v1", "localhost:8642/", "http://localhost:8642" → the base without /v1; localhost only, plain http. */
export function normalizeHermesBase(input: string): string {
  const raw = input.trim() || `${HERMES_DEFAULT_BASE}/v1`;
  const withScheme = /^[a-z]+:\/\//i.test(raw) ? raw : `http://${raw}`;
  return normalizeLocalBaseUrl(withScheme).replace(/\/v1$/, '');
}
const portOf = (url: string | null | undefined) => { try { const u = new URL(url ?? ''); return Number(u.port || (u.protocol === 'https:' ? 443 : 80)); } catch { return null; } };
/**
 * Security review Z1A-6 (lane ZF): one spelling for an address on this computer, so `localhost`, `127.0.0.1` and `[::1]`,
 * an upper-case host, a default port written out, trailing slashes and the wire's /v1 all name the same gateway.
 * "http://LOCALHOST:8650/v1/" → "http://127.0.0.1:8650". Not a URL: null.
 */
export function canonicalLocalBase(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const u = new URL(input.trim());
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, ''), loopback = host === 'localhost' || host === '::1' || /^127(?:\.\d{1,3}){3}$/.test(host);
    const port = u.port || (u.protocol === 'https:' ? '443' : '80'), path = u.pathname.replace(/\/+$/, '').replace(/\/v1$/i, '').replace(/\/+$/, '');
    return `${u.protocol}//${loopback ? '127.0.0.1' : host}:${port}${path}`;
  } catch { return null; }
}
/** A request goes to the person's Hermes: its saved gateway address (in any spelling of this computer), or the default port 8642 on this computer. */
export function isHermesBase(baseUrl: string | null | undefined, record: Pick<NovaHermes, 'baseUrl' | 'seenBases'> | null): boolean {
  if (!baseUrl) return false;
  const clean = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
  const asked = canonicalLocalBase(baseUrl), saved = canonicalLocalBase(record?.baseUrl);
  // Z1A-6 (AL Part 14): or an address whose /health said it is Hermes when it was connected.
  const seen = !!asked && Array.isArray(record?.seenBases) && record.seenBases.includes(asked);
  return (!!record?.baseUrl && (clean === record.baseUrl || (!!asked && asked === saved))) || seen || portOf(clean) === HERMES_DEFAULT_PORT;
}
/** Z1A-6: the record with this address noted as a Hermes (its /health said so); the same object when already noted or not an address. */
export function withSeenHermes(record: NovaHermes, baseUrl: string): NovaHermes {
  const at = canonicalLocalBase(baseUrl);
  if (!at || (record.seenBases ?? []).includes(at)) return record;
  return {...record, version: 1, seenBases: [at, ...(record.seenBases ?? [])].slice(0, 8)};
}
/** Z1A-6: whether a /health answer is Hermes Agent's own ({"status":"ok","platform":"hermes-agent",…}). */
export const isHermesHealth = (body: unknown): boolean => !!body && typeof body === 'object' && (body as {platform?: unknown}).platform === 'hermes-agent';
/**
 * Z1A-I5: the person's "my Hermes runs a local model" still holds: given, and for this gateway and this Hermes version
 * (when both were known at the confirmation). A new address or a new version since asks again; until then Strict and
 * Guarded redact what goes to it. A confirmation from before AL (no address or version kept) stands.
 */
export function localModelStillConfirmed(record: Pick<NovaHermes, 'localModelConfirmed' | 'confirmedBase' | 'confirmedVersion' | 'baseUrl' | 'lastCheck'>): boolean {
  if (record.localModelConfirmed !== true) return false;
  if (record.confirmedBase && canonicalLocalBase(record.baseUrl) !== record.confirmedBase) return false;
  const now = record.lastCheck?.version;
  return !(record.confirmedVersion && typeof now === 'string' && now !== record.confirmedVersion);
}
/** Z1A-I5: confirmed once, but Hermes moved or was updated since: the line that asks again. Null when nothing lapsed. */
export function confirmationLapsedLine(record: Pick<NovaHermes, 'localModelConfirmed' | 'confirmedBase' | 'confirmedVersion' | 'baseUrl' | 'lastCheck'>): string | null {
  return record.localModelConfirmed === true && !localModelStillConfirmed(record) ? 'Your Hermes changed since you confirmed it runs a local model (a new address or version). Confirm it again in NOVA → Connect your Hermes Agent, planet 8; until then NOVA treats it as Guarded.' : null;
}
/** The engine's rule (lib/ai/privacy-mode.ts): a Hermes brain whose local model is not confirmed is redacted in Strict and Guarded. */
export function hermesNeedsRedaction(mode: PrivacyMode | null, confirmedLocal: boolean): boolean {
  return (mode === 'strict' || mode === 'guarded') && !confirmedLocal;
}
export function readHermes(storage: Pick<Storage, 'getItem'>): {data: NovaHermes; unreadable: boolean} {
  try { return readDeviceRecord(storage, NOVA_HERMES); } catch { return {data: {version: 1}, unreadable: true}; }
}
/** What NOVA's panels show (lane NA): connected (a gateway is saved), reachable at the last check, the model, the time. */
export type HermesStatus = {connected: boolean; reachable: boolean; model?: string; lastMs?: number; checkedAt?: string; localModelConfirmed: boolean; problem?: string};
export function hermesStatus(record: NovaHermes = {version: 1}): HermesStatus {
  const last = record.lastCheck;
  const model = last?.model ?? record.model;
  return {connected: !!record.baseUrl, reachable: !!last?.reachable, ...(model ? {model} : {}), ...(last?.ms !== undefined ? {lastMs: last.ms} : {}), ...(last?.at ? {checkedAt: last.at} : {}), localModelConfirmed: localModelStillConfirmed(record), ...(!last?.reachable && last?.problem ? {problem: last.problem} : {})};
}
/**
 * Session AL Part 14 (lane P14-B; EXPLORATORY_ROUND3 left-overs 1 and 3): the words for a Hermes that answered but refused
 * or wanted its key, shared by the guide's test (hermes.ts HERMES_FIXES), NOVA's panels and the chat's failure.
 */
export const HERMES_KEY_WORDS = {
  'needs-key': {title: 'Hermes is running and asks for its key: none is on this device yet.', steps: ['Paste the key you put in API_SERVER_KEY (show it with “hermes config get API_SERVER_KEY --raw”), then test again.']},
  'wrong-key': {title: 'Hermes refused the key.', steps: ['Show it with “hermes config get API_SERVER_KEY --raw” and paste it here again.', 'Restart the gateway after changing the key.']},
} as const;
/**
 * EX3 left-over 3: a chat message to the person's Hermes (as NOVA's brain or through "Ask my Hermes") that came back 401 or
 * 403 says what Hermes needs, in the guide's words and where to paste the key, never ZIGi's generic "key not accepted".
 * Null for any other failure.
 */
export function hermesKeyFailure(kind: string, hadKey: boolean): {title: string; steps: string[]} | null {
  if (kind !== 'bad-key') return null;
  const show = 'Show it with “hermes config get API_SERVER_KEY --raw”', where = 'NOVA → Connect your Hermes Agent (planet 7)';
  return hadKey
    ? {title: HERMES_KEY_WORDS['wrong-key'].title, steps: [`${show} and paste it again in ${where}.`, 'Restart the gateway after changing the key.']}
    : {title: HERMES_KEY_WORDS['needs-key'].title, steps: [`In ${where}, paste the key you put in API_SERVER_KEY (${show.charAt(0).toLowerCase()}${show.slice(1)}), then test again.`]};
}
/**
 * EX3 left-over 1: NOVA's left and right panels say what the last check found, as the guide does (`hermesCheckLine`): a
 * gateway that answered but refused or wanted the key, or that does not allow this site yet, was reached, so it is never
 * "not reachable". `pill` is the short status, `line` the sentence, `on` whether the gateway answered at all.
 */
export function hermesPanel(status: HermesStatus): {pill: string; line: string; on: boolean} {
  if (status.reachable) return {pill: 'Reachable', line: 'Hermes gateway reachable at the last check', on: true};
  if (status.problem === 'wrong-key') return {pill: 'Key refused', line: 'Hermes gateway answered at the last check, but refused the key', on: true};
  if (status.problem === 'needs-key') return {pill: 'Key needed', line: 'Hermes gateway answered at the last check and asks for its key', on: true};
  if (status.problem === 'cors') return {pill: 'Site not allowed', line: 'Hermes gateway running at the last check, but this site is not allowed yet', on: true};
  if (status.problem === 'busy') return {pill: 'Busy', line: 'Hermes gateway answered at the last check, but was busy or restarting', on: true};
  return {pill: 'Not reachable', line: 'Hermes gateway not reachable at the last check', on: false};
}
/**
 * Session AK lane P7 (EX3-5): the gateway's last check in one line, for the guide and NOVA's card. A gateway that answered
 * but refused (or wanted) the key was reached: it is not "not reachable".
 */
export function hermesCheckLine(status: HermesStatus, {msWord = ''}: {msWord?: string} = {}): string {
  if (status.reachable) return `Gateway reachable${status.model ? ` · ${status.model}` : ''}${status.lastMs !== undefined ? ` · ${msWord}${status.lastMs} ms` : ''}`;
  if (status.problem === 'wrong-key') return 'Gateway answered at the last check, but refused the key';
  if (status.problem === 'needs-key') return 'Gateway answered at the last check and asks for its key';
  if (status.problem === 'cors') return 'Gateway running at the last check, but this site is not allowed yet';
  return 'Gateway not reachable at the last check';
}

// ── The guide's progress (the same rules as the NOVA guide: a passing check marks a step done on that day) ─────────
const CHECK_NOTE_MAX = 200;
type HermesStep = NonNullable<NonNullable<NovaHermes['steps']>[HermesStepId]>;
const stepOf = (record: NovaHermes, id: HermesStepId): HermesStep => (record.steps?.[id] as HermesStep | undefined) ?? {};
export const hermesStepDone = (record: NovaHermes, id: HermesStepId) => !!stepOf(record, id).doneOn;
export const hermesStepCheck = (record: NovaHermes, id: HermesStepId) => stepOf(record, id).check ?? null;
export function recordHermesCheck(record: NovaHermes, id: HermesStepId, check: {ok: boolean; note?: string}, now: Date, today: string): NovaHermes {
  const step = stepOf(record, id), note = check.note?.replace(/\s+/g, ' ').trim().slice(0, CHECK_NOTE_MAX);
  const steps = {...(record.steps ?? {}), [id]: {...step, check: {ok: check.ok, at: now.toISOString(), ...(note ? {note} : {})}, ...(check.ok && !step.doneOn ? {doneOn: today} : {})}};
  const next: NovaHermes = {...record, version: 1, steps};
  return HERMES_STEPS.every(s => hermesStepDone(next, s)) && !next.finishedOn ? {...next, finishedOn: today} : next;
}
export function unmarkHermesStep(record: NovaHermes, id: HermesStepId): NovaHermes {
  const {doneOn: _d, ...rest} = stepOf(record, id); void _d;
  const {finishedOn: _f, ...kept} = {...record, steps: {...(record.steps ?? {}), [id]: rest}}; void _f;
  return kept;
}
export function hermesProgress(record: NovaHermes): {done: number; total: number; next: HermesStepId | null; finished: boolean} {
  const done = HERMES_STEPS.filter(id => hermesStepDone(record, id)).length;
  return {done, total: HERMES_STEPS.length, next: HERMES_STEPS.find(id => !hermesStepDone(record, id)) ?? null, finished: done === HERMES_STEPS.length};
}
// Z1A-I5 (AL Part 14): a confirmation keeps the gateway and the Hermes version it was given for.
export const confirmLocalModel = (record: NovaHermes, confirmed: boolean, today: string): NovaHermes => {
  const base = canonicalLocalBase(record.baseUrl), version = record.lastCheck?.version;
  const {confirmedBase: _b, confirmedVersion: _v, ...rest} = record; void _b; void _v;
  return {...rest, version: 1, localModelConfirmed: confirmed, ...(confirmed ? {confirmedOn: today, ...(base ? {confirmedBase: base} : {}), ...(version ? {confirmedVersion: version} : {})} : {})};
};
/** `hermes --version` as pasted by the person ("Hermes Agent v0.22.5 (…)"): the version, or null when it is not that output. */
export function hermesVersionIn(text: string): string | null {
  const m = /hermes[^\n\d]{0,40}?v?(\d+\.\d+(?:\.\d+)?(?:[-+.][0-9A-Za-z.-]+)?)/i.exec(text.slice(0, 2000));
  return m ? m[1]! : null;
}
/** The last answer's time (a first run, a delegation), for NOVA's panels: reachable, with the time it took. */
export function withCheckTime(record: NovaHermes, ms: number, at: Date): NovaHermes {
  const model = record.lastCheck?.model ?? record.model;
  return novaHermesSchema.parse({...record, version: 1, lastCheck: {at: at.toISOString(), reachable: true, ms: Math.max(0, Math.min(600_000, Math.round(ms))), ...(model ? {model} : {}), ...(record.lastCheck?.version ? {version: record.lastCheck.version} : {})}});
}

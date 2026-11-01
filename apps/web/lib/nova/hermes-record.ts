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
export const hermesCheckSchema = z.looseObject({at: iso, reachable: z.boolean(), model: z.string().max(200).optional(), ms: z.number().int().min(0).max(600_000).optional(), problem: z.string().max(40).optional()});
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
/** A request goes to the person's Hermes: its saved gateway address, or the default port 8642 on this computer. */
export function isHermesBase(baseUrl: string | null | undefined, record: Pick<NovaHermes, 'baseUrl'> | null): boolean {
  if (!baseUrl) return false;
  const clean = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
  return (!!record?.baseUrl && clean === record.baseUrl) || portOf(clean) === HERMES_DEFAULT_PORT;
}
/** The engine's rule (lib/ai/privacy-mode.ts): a Hermes brain whose local model is not confirmed is redacted in Strict and Guarded. */
export function hermesNeedsRedaction(mode: PrivacyMode | null, confirmedLocal: boolean): boolean {
  return (mode === 'strict' || mode === 'guarded') && !confirmedLocal;
}
export function readHermes(storage: Pick<Storage, 'getItem'>): {data: NovaHermes; unreadable: boolean} {
  try { return readDeviceRecord(storage, NOVA_HERMES); } catch { return {data: {version: 1}, unreadable: true}; }
}
/** What NOVA's panels show (lane NA): connected (a gateway is saved), reachable at the last check, the model, the time. */
export type HermesStatus = {connected: boolean; reachable: boolean; model?: string; lastMs?: number; checkedAt?: string; localModelConfirmed: boolean};
export function hermesStatus(record: NovaHermes = {version: 1}): HermesStatus {
  const last = record.lastCheck;
  const model = last?.model ?? record.model;
  return {connected: !!record.baseUrl, reachable: !!last?.reachable, ...(model ? {model} : {}), ...(last?.ms !== undefined ? {lastMs: last.ms} : {}), ...(last?.at ? {checkedAt: last.at} : {}), localModelConfirmed: record.localModelConfirmed === true};
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
export const confirmLocalModel = (record: NovaHermes, confirmed: boolean, today: string): NovaHermes => ({...record, version: 1, localModelConfirmed: confirmed, ...(confirmed ? {confirmedOn: today} : {})});
/** `hermes --version` as pasted by the person ("Hermes Agent v0.22.5 (…)"): the version, or null when it is not that output. */
export function hermesVersionIn(text: string): string | null {
  const m = /hermes[^\n\d]{0,40}?v?(\d+\.\d+(?:\.\d+)?(?:[-+.][0-9A-Za-z.-]+)?)/i.exec(text.slice(0, 2000));
  return m ? m[1]! : null;
}
/** The last answer's time (a first run, a delegation), for NOVA's panels: reachable, with the time it took. */
export function withCheckTime(record: NovaHermes, ms: number, at: Date): NovaHermes {
  const model = record.lastCheck?.model ?? record.model;
  return novaHermesSchema.parse({...record, version: 1, lastCheck: {at: at.toISOString(), reachable: true, ms: Math.max(0, Math.min(600_000, Math.round(ms))), ...(model ? {model} : {})}});
}

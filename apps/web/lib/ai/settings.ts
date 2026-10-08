import * as z from 'zod';
import {PROVIDER_IDS, SUBSCRIPTION_APPS, normalizeLocalBaseUrl} from './providers';

/**
 * ZIGi's device key, `zigoals:ai:v1` (ADR-012): the connection choice and every switch, through getAppStorage() like
 * the other device keys (per account; the tab's session storage in Showcase). It holds no secret: keys live in the
 * separate key store (keys.ts) or in memory. Zod-validated and read-tolerant: unreadable bytes read as off and are
 * never rewritten by anything but the person's next choice. Never synced. Listed as personal in onboarding.ts.
 */
export {AI_SETTINGS_KEY} from './launcher-record';
import {AI_SETTINGS_KEY} from './launcher-record';
import {resetOnTurnOff} from './store/records';
/** Showcase conversations live in the tab's session storage under this app-storage key (chats.ts). */
export const AI_CHATS_SESSION_KEY = 'zigoals:ai-chats:v1';
export const PAGE_AREAS = ['today', 'goals', 'habits', 'health', 'wealth', 'help'] as const;
export type PageArea = typeof PAGE_AREAS[number];
export const CONTEXT_BUDGET = {min: 1000, max: 200_000, default: 6000} as const;
export const OUTPUT_CAP = {min: 64, max: 32_000, default: 1024} as const;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const aiSettingsSchema = z.strictObject({
  version: z.literal(1),
  /** Connected and on. False after "Turn off ZIGi" and before the setup finishes. */
  enabled: z.boolean(),
  mode: z.enum(['api', 'local', 'subscription']).nullable(),
  provider: z.enum(PROVIDER_IDS).nullable(),
  model: z.string().min(1).max(200).nullable(),
  localServer: z.enum(['ollama', 'openai-compatible']).nullable(),
  baseUrl: z.string().max(200).nullable(),
  subscriptionApp: z.enum(SUBSCRIPTION_APPS.map(app => app.id) as [string, ...string[]]).nullable(),
  /** Whether a key may be kept in the encrypted key store on this device (on in the installed app, off in a tab). */
  rememberKey: z.boolean(),
  pageShare: z.strictObject({today: z.boolean(), goals: z.boolean(), habits: z.boolean(), health: z.boolean(), wealth: z.boolean(), help: z.boolean()}),
  includeHealth: z.boolean(),
  customInstructions: z.string().max(2000),
  contextBudgetTokens: z.number().int().min(CONTEXT_BUDGET.min).max(CONTEXT_BUDGET.max),
  maxOutputTokens: z.number().int().min(OUTPUT_CAP.min).max(OUTPUT_CAP.max),
  launcherHidden: z.boolean(),
  voice: z.strictObject({transcription: z.enum(['provider', 'browser', 'off']), transcriptionModel: z.string().min(1).max(200).nullable(), language: z.string().min(2).max(35).nullable(), readAloud: z.boolean()}),
  connectedOn: day.optional(),
});
export type AiSettings = z.infer<typeof aiSettingsSchema>;
/** The starting values. The key-remember default follows ADR-008: on in the installed app, off in a browser tab. */
export const defaultAiSettings = (installed = false): AiSettings => ({
  version: 1, enabled: false, mode: null, provider: null, model: null, localServer: null, baseUrl: null, subscriptionApp: null, rememberKey: installed,
  pageShare: {today: true, goals: true, habits: true, health: false, wealth: true, help: true}, includeHealth: false, customInstructions: '',
  contextBudgetTokens: CONTEXT_BUDGET.default, maxOutputTokens: OUTPUT_CAP.default, launcherHidden: false,
  voice: {transcription: 'off', transcriptionModel: null, language: null, readAloud: false},
});
type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
/** What this device holds: unreadable or invalid bytes read as off (`unreadable` says so) and are never touched until the next explicit choice. */
export function readAiSettings(storage: Read, installed = false): {data: AiSettings; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(AI_SETTINGS_KEY); } catch { return {data: defaultAiSettings(installed), unreadable: true}; }
  if (raw === null) return {data: defaultAiSettings(installed), unreadable: false};
  try { const parsed = aiSettingsSchema.safeParse(JSON.parse(raw)); return parsed.success ? {data: parsed.data, unreadable: false} : {data: defaultAiSettings(installed), unreadable: true}; } catch { return {data: defaultAiSettings(installed), unreadable: true}; }
}
/** Applies a change and writes the result; a local address is normalised first. Throws, with nothing written, when the result is invalid or storage refuses. */
export function updateAiSettings(storage: ReadWrite, change: (current: AiSettings) => AiSettings, installed = false): AiSettings {
  const next = change(readAiSettings(storage, installed).data);
  const valid = aiSettingsSchema.parse({...next, baseUrl: next.baseUrl === null ? null : normalizeLocalBaseUrl(next.baseUrl)});
  storage.setItem(AI_SETTINGS_KEY, JSON.stringify(valid));
  return valid;
}
/**
 * "Turn off ZIGi": the connection and every page switch go back to the start; the launcher stays as the person left it.
 * Keys are the key store's business. Session V's options go back to the start too and knocking stops (store/records.ts).
 */
export function turnOffAi(storage: ReadWrite, installed = false): AiSettings {
  const next = updateAiSettings(storage, current => ({...defaultAiSettings(installed), launcherHidden: current.launcherHidden, rememberKey: current.rememberKey}), installed);
  resetOnTurnOff(storage);
  return next;
}
/** The connection's one-line label for headers and labels: "via OpenAI · gpt-…", "via a local model · llama…", or null. */
export function connectionLabel(settings: AiSettings, providerName: (id: NonNullable<AiSettings['provider']>) => string): string | null {
  if (!settings.enabled || !settings.provider || !settings.model) return null;
  return `via ${providerName(settings.provider)} · ${settings.model}`;
}

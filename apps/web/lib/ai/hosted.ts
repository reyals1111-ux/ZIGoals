import * as z from 'zod';
import {streamOpenAiCompatible} from './adapters/openai-compatible';
import {AiError} from './errors';
import type {AiOptions} from './store/records';
import type {ChatEvent, ChatRequest} from './types';

/**
 * ZIGoals hosted, in the app (Session V Part 17, ADR-014; owner decision D2: off by default). An AI run by ZIGoals for
 * invited accounts, reached only through the app's own `/api/zigi` (lib/server/zigi-route.ts), so the browser's
 * connect-src never changes. It exists only in a build made with NEXT_PUBLIC_ZIGI_HOSTED=on (no build has it so far;
 * turning it on is a reviewed deploy change) and then only for an account the relay says is invited and within today's
 * budget. Before first use the person reads exactly what passes through ZIGoals and agrees (ai-options hostedConsent);
 * Health goes only with that consent's own Health choice on top of the usual three-part gate. Replies say "Answer from
 * <provider> via ZIGoals hosted". `zigoals:ai:v1` never holds it (ADR-014 S3): the route lives in ai-options.
 */
export const HOSTED_BUILD = process.env.NEXT_PUBLIC_ZIGI_HOSTED === 'on';
export const HOSTED_PATH = '/api/zigi';
export type HostedEntitlement =
  | {entitled: true; provider: string; model: string; remaining: {requests: number; tokens: number}}
  | {entitled: false; reason: 'not-in-build' | 'signed-out' | 'not-invited' | 'paused' | 'unavailable'};
const count = z.number().int().min(0);
const answerSchema = z.union([
  z.object({entitled: z.literal(true), provider: z.string().min(1).max(40), model: z.string().min(1).max(100), remaining: z.object({requests: count, tokens: count})}),
  z.object({entitled: z.literal(false), reason: z.enum(['not-invited', 'paused'])}),
]);
/** What the relay says about this account today; nothing is fetched outside a hosted build or without an account. */
export async function hostedEntitlement(account: string | null, {build = HOSTED_BUILD, fetcher = fetch}: {build?: boolean; fetcher?: typeof fetch} = {}): Promise<HostedEntitlement> {
  if (!build) return {entitled: false, reason: 'not-in-build'};
  if (!account) return {entitled: false, reason: 'signed-out'};
  try {
    const response = await fetcher(HOSTED_PATH, {headers: {'X-Zigoals-Account': account}, cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(15000)});
    if (response.status === 401) return {entitled: false, reason: 'signed-out'};
    if (!response.ok) return {entitled: false, reason: 'unavailable'};
    const parsed = answerSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : {entitled: false, reason: 'unavailable'};
  } catch { return {entitled: false, reason: 'unavailable'}; }
}
/** The route is in use: chosen, agreed to, and entitled today. */
export const hostedActive = (options: AiOptions, entitlement: HostedEntitlement | null): entitlement is Extract<HostedEntitlement, {entitled: true}> =>
  options.route === 'hosted' && !!options.hostedConsent && !!entitlement?.entitled;
/** Health may go to the hosted route only with its own choice in the consent (and still only through the three-part gate). */
export const hostedHealth = (options: AiOptions): boolean => options.hostedConsent?.health === true;
/**
 * The settings ZIGi reads while ZIGoals hosted is in use: it stands in for the person's own AI (so the page switches
 * decide what goes), and "Include Health" counts only when the hosted consent ticked Health too.
 */
export function hostedSettings<T extends {enabled: boolean; includeHealth: boolean}>(settings: T, options: AiOptions): T {
  return {...settings, enabled: true, includeHealth: settings.includeHealth && hostedHealth(options)};
}
export const HOSTED_LABEL = (provider: string) => `Answer from ${provider} via ZIGoals hosted`;
/** The first-use disclosure, line by line, as the person reads it before agreeing. */
export const HOSTED_DISCLOSURE = (provider: string, model: string): string[] => [
  `Your messages, the page's records ZIGi attaches and the results of its lookups pass through ZIGoals' server to ${provider} (${model}), which writes the reply. ZIGoals pays ${provider}; there is no charge to you during the Alpha.`,
  'ZIGoals stores none of it and logs none of it: the server keeps only counts (requests and tokens per day) to hold the daily limit. Cloudflare, which runs that server, processes the connection itself.',
  `${provider} handles what it receives under its own terms for API use.`,
  'Health goes only if you tick its box below and the Health gate in these settings is open, as for your own AI.',
  'You can stop using it at any time here; your own AI, if you connect one, stays separate.',
];
const MESSAGES: Record<string, [AiError['kind'], string]> = {
  SIGN_IN_REQUIRED: ['blocked', 'Sign in again to use ZIGoals hosted.'],
  ACCOUNT_CHANGED: ['blocked', 'The account changed. Open ZIGi again to go on.'],
  NOT_INVITED: ['blocked', 'ZIGoals hosted is invite-only, and this account is not on the list.'],
  HOSTED_PAUSED: ['blocked', 'ZIGoals hosted is paused right now. Your records are fine; try again later.'],
  ACCOUNT_DAILY_REQUESTS: ['rate-limit', 'You reached today\'s number of ZIGoals hosted messages. It starts again tomorrow (UTC).'],
  ACCOUNT_DAILY_TOKENS: ['rate-limit', 'You reached today\'s ZIGoals hosted allowance. It starts again tomorrow (UTC).'],
  GLOBAL_DAILY_TOKENS: ['rate-limit', 'ZIGoals hosted reached its own limit for today. It starts again tomorrow (UTC).'],
  UPSTREAM_PAUSED: ['overloaded', 'The AI behind ZIGoals hosted is not answering well; ZIGoals paused it for a moment. Try again shortly.'],
  UPSTREAM_BUSY: ['overloaded', 'The AI behind ZIGoals hosted is busy. Try again in a moment.'],
  REQUEST_TOO_LARGE: ['request', 'This message and its records are too long for ZIGoals hosted. Start a new chat or attach less.'],
};
/** One reply through ZIGoals hosted: the same Chat Completions body and stream as the app's OpenAI wire, sent to /api/zigi. */
export function streamHosted(request: Omit<ChatRequest, 'provider' | 'key'>, account: string, fetcher: typeof fetch = fetch): AsyncGenerator<ChatEvent> {
  const hostedFetch: typeof fetch = async (_url, init) => {
    const response = await fetcher(HOSTED_PATH, {...init, headers: {...(init?.headers as Record<string, string>), 'X-Zigoals-Account': account}, credentials: 'same-origin', mode: 'same-origin'});
    if (response.ok) return response;
    let code = '', retry: number | null = null;
    try { const body = await response.json() as {error?: unknown; retryAfterSeconds?: unknown}; code = typeof body.error === 'string' ? body.error : ''; retry = typeof body.retryAfterSeconds === 'number' ? body.retryAfterSeconds : null; } catch { /* no body */ }
    const [kind, message] = MESSAGES[code] ?? ['server', 'ZIGoals hosted could not answer right now. Try again later.'];
    throw new AiError(kind, message, {status: response.status, retryAfterSeconds: retry});
  };
  return streamOpenAiCompatible({...request, provider: 'openai', key: null, fetcher: hostedFetch}, 'openai', '');
}

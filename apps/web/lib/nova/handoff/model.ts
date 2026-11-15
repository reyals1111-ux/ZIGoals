import * as z from 'zod';
import {HANDOFF_KINDS, MAX_ADDRESS, MAX_BODY, MAX_SUBJECT, MAX_TITLE, MAX_TO, MAX_URL, buildCalendar, buildCopy, buildEmail, buildLink, buildShare, trimLink, URL_IN_TEXT, type Built, type Handoff, type HandoffLang} from './handoff';
import {HEALTH_CLOSED_WORDS} from './words';

/**
 * Session AM-2 (owner's step 4b; TIER 3 (AI safety)): what a connected model may ask for with the one closed tool
 * `hand_off` (lib/ai/tools/hand-off.ts), and how that request becomes a card. The arguments are a kind and a few small
 * plain fields, strictly checked: bounded lengths, no unknown field, no markup, no control or direction-changing
 * character. A model's request never does anything: it is turned into the same confirm card the person's own words make
 * (the same builders, the same secret checks), and only the person's press on the card's button hands anything over.
 * - At most one card per reply (`handoffFromCalls` takes the first request that ran and builds; the rest are dropped).
 * - A link a model names is marked as not the person's own unless that exact address stands in words the person typed
 *   themselves in this conversation (pasted text does not count).
 * - Q14, Q16: when the conversation read Health records and Health is not open for NOVA now, a model's hand-off is not made.
 */
const HIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/;
/** Markup: a tag, a comment or a character reference has no place in a mail body, a calendar note, a share or a title. */
const MARKUP = /<\s*\/?\s*[a-zA-Z!?][^>]*>|<!--|&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]{1,30});/i;
const line = (max: number) => z.string().max(max).refine(s => !HIDDEN.test(s) && !/[\r\n\t]/.test(s), 'One plain line.').refine(s => !MARKUP.test(s), 'Plain text, no markup.');
const lines = (max: number) => z.string().max(max).refine(s => !HIDDEN.test(s), 'Plain text.').refine(s => !MARKUP.test(s), 'Plain text, no markup.');
export const handOffArgs = z.object({
  kind: z.enum(HANDOFF_KINDS),
  /** email: the addresses, separated by commas (at most five). */
  to: line(MAX_TO * (MAX_ADDRESS + 2)).optional(),
  /** email: the subject. */
  subject: line(MAX_SUBJECT).optional(),
  /** email: the body; calendar: a note; share and copy: the text. */
  text: lines(MAX_BODY).optional(),
  /** calendar: the event's name; share: a title. */
  title: line(MAX_TITLE).optional(),
  /** link and share: an http(s) address. */
  url: z.string().max(MAX_URL).refine(s => !HIDDEN.test(s) && !/\s/.test(s), 'One address.').optional(),
  /** calendar: the day and, optionally, the local clock time and the length. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  minutes: z.number().int().min(5).max(24 * 60).optional(),
}).strict();
export type HandOffArgs = z.infer<typeof handOffArgs>;
export type ModelContext = {
  now: Date; lang?: HandoffLang;
  /** The words the person typed themselves in this conversation (never pasted text): a link found there is theirs. */
  typed?: readonly string[];
  /** This conversation read Health records (a Health lookup ran, in this reply or an earlier one). */
  healthRead?: boolean;
  /** Health may go into a hand-off: NOVA's Health permission and this device's Health gate are both on. */
  healthOpen?: boolean;
};
const typedLinks = (typed: readonly string[] | undefined): Set<string> => {
  const out = new Set<string>();
  for (const text of typed ?? []) for (const m of text.matchAll(URL_IN_TEXT)) { const raw = trimLink(m[0]); try { out.add(new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).href); } catch { /* not a link */ } }
  return out;
};
/** A model's request as a card's content, or the plain reason it is not made. The arguments must already fit `handOffArgs`. */
export function handoffFromArgs(args: HandOffArgs, ctx: ModelContext): Built {
  const lang = ctx.lang ?? 'en';
  if (ctx.healthRead && !ctx.healthOpen) return {ok: false, reason: 'empty', words: HEALTH_CLOSED_WORDS[lang]};
  const mine = (url: string): 'person' | 'other' => { try { return typedLinks(ctx.typed).has(new URL(url).href) ? 'person' : 'other'; } catch { return 'other'; } };
  switch (args.kind) {
    case 'email': return buildEmail({to: (args.to ?? '').split(/[,;]/).map(a => a.trim()).filter(Boolean), subject: args.subject, body: args.text}, lang);
    case 'calendar': return buildCalendar({title: args.title ?? '', date: args.date ?? '', time: args.time, minutes: args.minutes, note: args.text}, ctx.now, lang);
    case 'share': return buildShare({title: args.title, text: args.text, url: args.url, source: args.url ? mine(args.url) : 'other'}, lang);
    case 'link': return buildLink({url: args.url ?? '', source: mine(args.url ?? '')}, lang);
    case 'copy': return buildCopy({text: args.text ?? ''}, lang);
  }
}
export const HAND_OFF_TOOL = 'hand_off';
export const MAX_MODEL_HANDOFFS = 1;
/**
 * The one card a reply's lookups ask for: the first `hand_off` call that ran (a call the registry refused is never
 * applied, AM-S6) and whose arguments fit and build; every later one is dropped. `refused`: the plain reason the first
 * such request was not made (said in the conversation), when none built.
 */
export function handoffFromCalls(calls: readonly {tool: string; args?: Record<string, unknown> | null; ok?: boolean}[], ctx: ModelContext): {handoff: Handoff | null; refused: string | null; dropped: number} {
  const asked = calls.filter(c => c.tool === HAND_OFF_TOOL && c.ok !== false);
  let refused: string | null = null;
  for (const [i, call] of asked.entries()) {
    const parsed = handOffArgs.safeParse(call.args ?? {});
    if (!parsed.success) continue;
    const built = handoffFromArgs(parsed.data, ctx);
    if (built.ok) return {handoff: built.handoff, refused: null, dropped: asked.length - i - 1};
    refused ??= built.words;
  }
  return {handoff: null, refused, dropped: 0};
}

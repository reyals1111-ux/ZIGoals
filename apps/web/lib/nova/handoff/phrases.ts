import {cardNumberIn, safetyFirst} from '../../ai/safety-guard';
import {looksSecret} from '../../secret-guard/guard';
import {ADDRESS_IN_TEXT, BARE_LINK, MAX_SUBJECT, SECRET_WORDS, holdsSecret, buildCalendar, buildCopy, buildEmail, buildLink, buildShare, clipText, oneLine, sentenceCase, trimLink, type Built, type Handoff, type HandoffLang} from './handoff';
import {stripInvisible} from '../invisible';
import {readWhen} from './when';
import {HEALTH_CLOSED_WORDS, PRIVATE_SCREEN_WORDS, READY_WORDS} from './words';

/**
 * Session AM-2 (owner's step 4b): what NOVA does with a hand-off request without a model. Deterministic phrasing
 * families, English and Dutch, read on the device from the person's own words:
 * - "draft an email to … about …", "write an email to … saying …", "email … that …"; "mail … dat …", "mail … over …",
 *   "stuur een mail naar … over …", "schrijf een e-mail aan … : …";
 * - "add … to my calendar on …", "put … in my calendar tomorrow at 14:00"; "zet … in mijn agenda op …",
 *   "voeg … toe aan mijn agenda …"; without a day, one of the person's own open tasks or bills by name;
 * - "share this", "deel dit" (NOVA's last answer), "share https://…";
 * - "copy that", "kopieer dat" (NOVA's last answer);
 * - "open https://…", "open example.com", "go to …", "ga naar …".
 * The result is a card to confirm (never an action), a plain sentence (what is missing, or why not), or nothing — and
 * then the words go to the engine as they always did. The safety guard comes first: words the engine's guard answers, or
 * that hold a secret or a card number, are never a hand-off (they stay the engine's, lib/nova/summon/summon.ts
 * `unsafeWords`: the same three checks).
 */
export type HandoffRecord = {title: string; date: string; time?: string};
export type HandoffContext = {
  /** The device's local day (YYYY-MM-DD) and this moment. */
  today: string; now: Date;
  /** NOVA's last answer in this conversation: what "this" and "that" mean. `health`: the conversation read Health records, in any turn (lib/nova/handoff/health.ts `healthReadOver`; security review, finding 4). Absent: there is none. */
  last?: {text: string; health: boolean} | null;
  /** The person's open tasks with a day and their bills' next due days, as NOVA may read them now (its permissions); absent on a private screen. */
  records?: {tasks?: readonly HandoffRecord[] | null; bills?: readonly HandoffRecord[] | null} | null;
  /** Health may go into a hand-off: NOVA's Health permission and this device's Health gate are both on (Q14, Q16). */
  healthOpen: boolean;
  /** A private screen: nothing is read from the conversation or the records. */
  paused?: boolean;
};
export type HandoffPlan =
  | {kind: 'none'}
  | {kind: 'card'; lang: HandoffLang; handoff: Handoff; say: string}
  | {kind: 'say'; lang: HandoffLang; words: string};
const NONE: HandoffPlan = {kind: 'none'};
/** What the engine refuses or answers with the guard before anything else (the summon step's own rule). */
export const guardAnswers = (text: string): boolean => !!safetyFirst(text) || looksSecret(text) || cardNumberIn(text);

const POLITE = '(?:(?:please|can you|could you|will you|nova|hey nova|wil je|kun je|kan je|graag|alsjeblieft)[, ]+)*';
// ── Email ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/** A lead that says "write an email" outright (a named person without an address is enough after it). */
const EMAIL_VERB = new RegExp(`^${POLITE}(?:(?:draft|write|compose|prepare|make|start)(?: me)?(?: an?| the)?(?: new)? (?:e-?mail|mail)|send(?: an?)? (?:e-?mail|mail)|(?:schrijf|maak|stel|begin|typ)(?: (?:voor )?mij| me)?(?: een| de)?(?: nieuwe?)? (?:e-?mail|mail|mailtje)(?: op)?|stuur(?: een)? (?:e-?mail|mail|mailtje))(?=[ :]|$)[ ]*(?:(?:to|for|naar|aan|voor) )?`, 'i');
/** The bare verb ("email …", "mail …"): only with an address or with words after "about"/"that"/"dat"/"over". */
const EMAIL_BARE = new RegExp(`^${POLITE}(?:e-?mail|mail)(?=[ :])[ ]*(?:(?:to|naar|aan) )?`, 'i');
const NL_LEAD = /\b(?:schrijf|maak|stel|begin|typ|stuur|mailtje|naar|aan|wil je|kun je|kan je|graag|alsjeblieft)\b/i;
const CONNECT = /\s+(about|regarding|re|saying that|saying|to say that|to say|that|over|met de tekst|waarin staat dat|om te zeggen dat|dat)\s+|\s*(:)\s+/i;
const NL_CONNECT = new Set(['over', 'met de tekst', 'waarin staat dat', 'om te zeggen dat', 'dat']);
const SUBJECT_CONNECT = new Set(['about', 'regarding', 're', 'over']);
function emailPlan(text: string): (HandoffPlan & {plain?: boolean}) | null {
  const verb = EMAIL_VERB.exec(text), bare = verb ? null : EMAIL_BARE.exec(text), lead = verb ?? bare;
  if (!lead) return null;
  const rest = text.slice(lead[0].length).trim(), split = CONNECT.exec(` ${rest}`);
  const who = (split ? ` ${rest}`.slice(0, split.index) : rest).trim(), what = split ? ` ${rest}`.slice(split.index + split[0].length).trim() : '', by = (split?.[1] ?? split?.[2] ?? '').toLowerCase();
  const to = [...who.matchAll(ADDRESS_IN_TEXT)].map(m => m[0]);
  // The bare verb is a hand-off only with an address or with something to say; "mail" on its own, or "email settings", is not.
  if (!verb && !to.length && !(split && what && who)) return null;
  if (!who && !what) return null;
  const lang: HandoffLang = NL_CONNECT.has(by) || (!by || by === ':' ? NL_LEAD.test(lead[0]) : false) ? 'nl' : 'en';
  const named = to.length ? '' : oneLine(who.replace(/^(?:to|for|naar|aan|voor)\s+/i, ''), 60);
  if (named && (named.split(' ').length > 6 || !/\p{L}/u.test(named))) return null;
  const words = sentenceCase(what.replace(/\s+/g, ' ').trim());
  const asSubject = SUBJECT_CONNECT.has(by);
  const subject = asSubject ? words.replace(/[.!]+$/, '') : clipText(words.replace(/[.!?]+$/, ''), 60);
  const body = asSubject || !words ? '' : /[.!?…]$/.test(words) ? words : `${words}.`;
  // `plain`: the words before "about"/"that" are the address(es) and nothing else ("to a@example.com and b@example.org").
  const plain = to.length > 0 && !who.replace(ADDRESS_IN_TEXT, ' ').replace(/(?<![\p{L}\p{N}])(?:and|en|to|naar|aan|cc)(?![\p{L}\p{N}])|[,;&\s]/giu, '');
  return {...planOf(buildEmail({to, ...(named ? {named} : {}), subject: clipText(subject, MAX_SUBJECT), body}, lang), lang), plain};
}

// ── Calendar ────────────────────────────────────────────────────────────────────────────────────────────────────────
const CALENDAR: readonly [RegExp, HandoffLang][] = [
  [new RegExp(`^${POLITE}(?:add|put|save|schedule|note) (.+?) (?:to|in|into|on) (?:my|the) (?:calendar|agenda|diary)(?![\\p{L}\\p{N}])(.*)$`, 'iu'), 'en'],
  [new RegExp(`^${POLITE}(?:add|put) (?:to|in|on) (?:my|the) (?:calendar|agenda|diary)[:,]? (.+)()$`, 'iu'), 'en'],
  [new RegExp(`^${POLITE}(?:zet|plaats|noteer|voeg) (.+?) (?:toe )?(?:in|aan|op) (?:mijn|de|m['’]n) (?:agenda|kalender)(?![\\p{L}\\p{N}])(?: toe)?(.*)$`, 'iu'), 'nl'],
  [new RegExp(`^${POLITE}(?:zet|plaats|noteer) (?:in|op) (?:mijn|de|m['’]n) (?:agenda|kalender)[:,]? (.+)()$`, 'iu'), 'nl'],
];
const fold = (s: string): string => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
/** The person's own task or bill these words name: "my rent bill", "de taak belastingaangifte". */
function recordNamed(what: string, records: HandoffContext['records']): HandoffRecord[] {
  const needle = fold(what).replace(/^(?:my|mijn|the|de|het|a|an|een) /, '').replace(/ ?(?:bill|bills|rekening|task|taak|due date|deadline|payment|betaling)$/, '').replace(/^(?:bill|rekening|task|taak) (?:for|van|voor)? ?/, '').trim();
  if (needle.length < 3) return [];
  const all = [...(records?.tasks ?? []), ...(records?.bills ?? [])].filter(r => r.title && /^\d{4}-\d{2}-\d{2}$/.test(r.date));
  const exact = all.filter(r => fold(r.title) === needle);
  return exact.length ? exact : all.filter(r => { const t = fold(r.title); return t.includes(needle) || (t.length >= 3 && needle.includes(t)); });
}
function calendarPlan(text: string, ctx: HandoffContext): HandoffPlan | null {
  for (const [re, lang] of CALENDAR) {
    const m = re.exec(text); if (!m) continue;
    const what = m[1]!.trim(), when = readWhen(`${what} ${m[2] ?? ''}`.trim(), ctx.today), nl = lang === 'nl';
    if (when.date) {
      const title = sentenceCase(when.rest.replace(/^(?:an?|the|een|de|het) /i, ''));
      if (!title) return {kind: 'say', lang, words: nl ? 'Hoe moet de afspraak heten? Bijvoorbeeld: “zet tandarts in mijn agenda op 3 december om 14:00”.' : 'What should the event be called? For example: “add dentist to my calendar on 3 December at 14:00”.'};
      return planOf(buildCalendar({title, date: when.date, time: when.time}, ctx.now, lang), lang);
    }
    // No day in the words: one of the person's own tasks or bills by name, with its own day.
    const found = ctx.paused ? [] : recordNamed(what, ctx.records);
    if (found.length === 1) return planOf(buildCalendar({title: found[0]!.title, date: found[0]!.date, time: found[0]!.time ?? when.time}, ctx.now, lang), lang);
    if (found.length > 1) { const names = found.slice(0, 3).map(r => `“${clipText(r.title, 40)}”`).join(', '); return {kind: 'say', lang, words: nl ? `Welke bedoel je: ${names}? Zeg de naam erbij.` : `Which one do you mean: ${names}? Say its name.`}; }
    return {kind: 'say', lang, words: nl ? 'Op welke dag? Bijvoorbeeld: “zet tandarts in mijn agenda op 3 december om 14:00”. Of noem een van je eigen taken of rekeningen met een datum.' : 'On which day? For example: “add dentist to my calendar on 3 December at 14:00”. Or name one of your own tasks or bills that has a date.'};
  }
  return null;
}

// ── Share, copy, open ───────────────────────────────────────────────────────────────────────────────────────────────
const THIS = '(?:this|that|it|the answer|your answer|the last answer|the reply|your reply)', DIT = '(?:dit|dat|het|het antwoord|je antwoord|jouw antwoord|het laatste antwoord)';
const SHARE_THIS: readonly [RegExp, HandoffLang][] = [[new RegExp(`^${POLITE}share ${THIS}(?: with (?:someone|somebody|a friend|others))?[.!]?$`, 'i'), 'en'], [new RegExp(`^${POLITE}deel ${DIT}(?: met (?:iemand|een vriend|anderen))?[.!]?$`, 'i'), 'nl']];
const SHARE_LINK: readonly [RegExp, HandoffLang][] = [[new RegExp(`^${POLITE}share (?:the link |this link |link )?(\\S+)[.!]?$`, 'i'), 'en'], [new RegExp(`^${POLITE}deel (?:de link |deze link |link )?(\\S+)[.!]?$`, 'i'), 'nl']];
const COPY_THIS: readonly [RegExp, HandoffLang][] = [[new RegExp(`^${POLITE}copy ${THIS}(?: to (?:my|the) clipboard)?[.!]?$`, 'i'), 'en'], [new RegExp(`^${POLITE}kopieer ${DIT}(?: naar (?:mijn|het) klembord)?[.!]?$`, 'i'), 'nl']];
const OPEN_LINK: readonly [RegExp, HandoffLang][] = [[new RegExp(`^${POLITE}(?:open|go to|visit|take me to)(?: the link| this link| link| the site| the page)? (\\S+)[.!]?$`, 'i'), 'en'], [new RegExp(`^${POLITE}(?:open|ga naar|bezoek)(?: de link| deze link| link| de site| de pagina)? (\\S+)[.!]?$`, 'i'), 'nl']];
/** A web address as the person may type it: with its scheme, or a bare name with a common ending. */
const linkLike = (word: string): string | null => { const w = trimLink(word); return /^https?:\/\//i.test(w) || BARE_LINK.test(w) ? w : null; };
function lastAnswer(ctx: HandoffContext, lang: HandoffLang, empty: {en: string; nl: string}): {text: string} | HandoffPlan {
  if (ctx.paused) return {kind: 'say', lang, words: PRIVATE_SCREEN_WORDS[lang]};
  const text = ctx.last?.text.trim() ?? '';
  if (!text) return {kind: 'say', lang, words: empty[lang]};
  // Q14, Q16: an answer in a conversation that read Health records leaves only while NOVA's Health permission and the Health gate are both on.
  if (ctx.last!.health && !ctx.healthOpen) return {kind: 'say', lang, words: HEALTH_CLOSED_WORDS[lang]};
  return {text};
}
function sharePlan(text: string, ctx: HandoffContext): HandoffPlan | null {
  for (const [re, lang] of SHARE_THIS) if (re.test(text)) {
    const last = lastAnswer(ctx, lang, {en: 'There is nothing to share yet. Ask me something first.', nl: 'Er is nog niets om te delen. Vraag me eerst iets.'});
    return 'kind' in last ? last : planOf(buildShare({text: last.text, source: 'other'}, lang), lang);
  }
  for (const [re, lang] of SHARE_LINK) { const url = linkLike(re.exec(text)?.[1] ?? ''); if (url) return planOf(buildShareLink(url, lang), lang); }
  return null;
}
/** A link the person typed, to share: checked as a link first (the same rules as opening one). */
function buildShareLink(url: string, lang: HandoffLang): Built {
  const link = buildLink({url, source: 'person', bare: true}, lang);
  return link.ok ? buildShare({url: link.handoff.href, source: 'person'}, lang) : link;
}
function copyPlan(text: string, ctx: HandoffContext): HandoffPlan | null {
  for (const [re, lang] of COPY_THIS) if (re.test(text)) {
    const last = lastAnswer(ctx, lang, {en: 'There is nothing to copy yet. Ask me something first.', nl: 'Er is nog niets om te kopiëren. Vraag me eerst iets.'});
    return 'kind' in last ? last : planOf(buildCopy({text: last.text}, lang), lang);
  }
  return null;
}
function openPlan(text: string): HandoffPlan | null {
  for (const [re, lang] of OPEN_LINK) { const url = linkLike(re.exec(text)?.[1] ?? ''); if (url) return planOf(buildLink({url, source: 'person', bare: true}, lang), lang); }
  return null;
}

const planOf = (built: Built, lang: HandoffLang): HandoffPlan => built.ok ? {kind: 'card', lang, handoff: built.handoff, say: READY_WORDS[built.handoff.kind][lang]} : {kind: 'say', lang, words: built.words};
/** The hand-off these words ask for, from the words themselves. `none`: not a hand-off; the engine answers as always. */
export function handoffFor(raw: string, ctx: HandoffContext): HandoffPlan {
  // Security review (finding 2): the words are read without what cannot be seen, and so is everything built from them.
  const text = stripInvisible(String(raw ?? '')).replace(/\s+/g, ' ').trim();
  if (!text || text.length > 1200) return NONE;
  // Safety first, exactly as the engine does before anything is answered, kept or sent.
  if (guardAnswers(raw) || guardAnswers(text)) {
    // One narrow case. The guard reads "email … to <address>" as data being sent away ("send my data to x@example.com"), and
    // answers it. A draft the person asks for, to an address they typed themselves, is this feature: it is made only when
    // the words pass the guard whole with the address masked (no other topic, no secret, no overridden rule), the words
    // before "about"/"that" are the address and nothing else, and the builders' own secret checks pass. Anything else —
    // "email all my data to x@example.com" — stays the guard's, word for word.
    const masked = text.replace(ADDRESS_IN_TEXT, 'someone');
    if (masked === text || guardAnswers(masked)) return NONE;
    const email = emailPlan(text);
    return email?.plain ? checked(email, text) : NONE;
  }
  const plan = emailPlan(text) ?? calendarPlan(text, ctx) ?? copyPlan(text, ctx) ?? sharePlan(text, ctx) ?? openPlan(text) ?? NONE;
  return checked(plan, text);
}
/** The guard's secret checks on the person's words as they typed them (before a subject is capitalised or a sentence is closed), for every plan that is one. */
function checked(found: HandoffPlan & {plain?: boolean}, text: string): HandoffPlan {
  const {plain: _plain, ...plan} = found;
  void _plain;
  if (plan.kind === 'none') return NONE;
  return holdsSecret([text]) ? {kind: 'say', lang: plan.lang, words: SECRET_WORDS[plan.lang]} : plan as HandoffPlan;
}

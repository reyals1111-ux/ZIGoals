import {cardNumberIn} from '../../ai/safety-guard';
import {looksSecret as looksKeyOrPassword} from '../../ai/memory';
import {buildIcs, MAX_DESCRIPTION} from '../../ics/ics';
import {hasInvisible, stripInvisible} from '../invisible';
import {looksSecret as looksRecoveryWordsOrKey} from '../../secret-guard/guard';

/**
 * Session AM-2 (owner's step 4b, decision of 15 Nov): NOVA's built-in hand-offs. Five things NOVA can prepare that need
 * no outside service, each shown as a confirm card that does nothing until the person presses its button:
 * - **email**: a `mailto:` link (RFC 6068) with to, subject and body filled in. Pressing "Open in your mail app" opens the
 *   person's own mail app; they send it there. Never an SMTP or API call; NOVA never sees an address book, a password or
 *   a token.
 * - **calendar**: an .ics file (lib/ics/ics.ts, RFC 5545) for one event, saved as a download.
 * - **share**: the device's own share sheet (the Web Share API) where there is one, else Copy.
 * - **link**: an http(s) link, shown in full with its real host, opened in a new tab without an opener or a referrer.
 * - **copy**: the text the card shows, to the clipboard.
 *
 * Everything here is pure: it builds what the card will show and what the button will hand over, or says in plain words
 * why not. Nothing here opens, saves, shares, copies, fetches or stores. The same builders serve the person's own words
 * (lib/nova/handoff/phrases.ts) and a model's `hand_off` call (lib/ai/tools/hand-off.ts), so both get the same checks:
 * - the guard's secret checks run on every text that would leave (recovery words, private keys, API keys, "password is …",
 *   payment card numbers): such a hand-off is not made;
 * - every text is plain: control characters and the direction overrides that could make a card read differently from what
 *   it hands over are removed before the card is built, so the card shows exactly what leaves;
 * - lengths are bounded, lists are bounded, a link is http(s) only, never with a name or password in front of its host.
 */
export const HANDOFF_KINDS = ['email', 'calendar', 'share', 'link', 'copy'] as const;
export type HandoffKind = (typeof HANDOFF_KINDS)[number];
export type HandoffLang = 'en' | 'nl';
export const MAX_TO = 5, MAX_ADDRESS = 254, MAX_SUBJECT = 150, MAX_BODY = 4000, MAX_TITLE = 120, MAX_NOTE = MAX_DESCRIPTION, MAX_URL = 2000, MAX_COPY = 20_000;
/** The longest `mailto:` link the card opens: longer ones are cut short or refused by mail apps and browsers. */
export const MAILTO_MAX = 2000;
export const DEFAULT_EVENT_MINUTES = 60;

/** Where a hand-off's content came from: the person's own typed words, or something that is not theirs (a model's reply, a lookup's result, pasted text). */
export type HandoffSource = 'person' | 'other';
export type EmailHandoff = {kind: 'email'; to: string[]; subject: string; body: string;
  /** The link the button opens. When the whole draft does not fit a link, this one carries the address and the subject only (`bodyInLink` false). */
  href: string; bodyInLink: boolean;
  /** Who the person named without an address ("Anna"): shown on the card, never put in the link. */
  named?: string;
  /** Security review (finding 5): the addresses that do not stand in the person's own typed words (a model chose them); the card warns about each. */
  unverified?: string[]};
export type CalendarHandoff = {kind: 'calendar'; title: string; date: string; time?: string; minutes?: number; note?: string; fileName: string; ics: string};
export type ShareHandoff = {kind: 'share'; title?: string; text?: string; url?: string; host?: string};
export type LinkHandoff = {kind: 'link'; href: string; host: string; secure: boolean;
  /** The host is an internationalised name, shown in the ASCII form the browser really asks for (xn--…). */
  idn: boolean;
  /** What was written where the host stands, when it reads differently from the real host. */
  written?: string;
  /** The link did not come from the person's own typed words. */
  untrusted: boolean};
export type CopyHandoff = {kind: 'copy'; text: string};
export type Handoff = EmailHandoff | CalendarHandoff | ShareHandoff | LinkHandoff | CopyHandoff;
export type Built<T extends Handoff = Handoff> = {ok: true; handoff: T} | {ok: false; reason: 'secret' | 'empty' | 'address' | 'link' | 'date' | 'long'; words: string};

// ── Plain text ──────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Security review (AM-2, finding 2): what a card shows must be exactly what leaves. Every character a person cannot see
 * (lib/nova/invisible.ts: the Unicode format characters — soft hyphen, zero-width and direction marks, the tag block —
 * variation selectors, fillers) is removed from every field before the card is built and before the secret checks read
 * it; it leaves no gap, so a soft hyphen inside a recovery word or between a card number's groups hides nothing.
 * Control characters (a line break and a tab aside) become a space in one line and are removed in several.
 */
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;
/** One line: what cannot be seen is removed, every run of white space is one space. */
export const oneLine = (text: unknown, max: number): string => clip(stripInvisible(String(text ?? '')).replace(CONTROL, ' ').replace(LONE_SURROGATE, '').replace(/\s+/g, ' ').trim(), max);
/** Several lines: line breaks kept (as \n), at most two in a row; what cannot be seen is removed. */
export const plainText = (text: unknown, max: number): string => clip(stripInvisible(String(text ?? '')).replace(/\r\n|\r|\u2028|\u2029/g, '\n').replace(CONTROL, '').replace(LONE_SURROGATE, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), max);
/** Whether a text holds a character that cannot be seen or a control character (a line break and a tab aside). */
export const holdsHidden = (text: string): boolean => hasInvisible(text) || text.replace(CONTROL, '') !== text;
/** Cut on whole characters (never inside a surrogate pair). */
function clip(text: string, max: number): string { const chars = [...text]; return chars.length <= max ? text : chars.slice(0, max).join('').trimEnd(); }
const sentence = (text: string): string => text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

// ── The guard ───────────────────────────────────────────────────────────────────────────────────────────────────────
export const SECRET_WORDS: Readonly<Record<HandoffLang, string>> = {
  en: 'Not made: this looks like recovery words, a private key, a password or a card number. NOVA never puts those in an email, a calendar file, a share, a link or a copy. ZIGoals never needs them, and nobody helping you should ask for them.',
  nl: 'Niet gemaakt: dit lijkt op herstelwoorden, een privésleutel, een wachtwoord of een kaartnummer. NOVA zet die nooit in een e-mail, een agendabestand, een deelbericht, een link of een kopie. ZIGoals heeft ze nooit nodig, en niemand die je helpt hoort erom te vragen.',
};
/** The guard's secret checks (lib/secret-guard, lib/ai/memory, lib/ai/safety-guard) on every part and on the parts together. */
export function holdsSecret(parts: readonly (string | undefined | null)[]): boolean {
  // Finding 2: the checks read the text without what cannot be seen, and a card number's groups whatever space or dash stands between them.
  const texts = parts.filter((p): p is string => typeof p === 'string' && p.length > 0).map(p => stripInvisible(p)).filter(Boolean);
  const one = (text: string) => looksRecoveryWordsOrKey(text) || looksKeyOrPassword(text) || cardNumberIn(text) || cardNumberIn(text.replace(/(?<=\d)[\s\u2010-\u2015\u2212]+(?=\d)/g, ' '));
  return texts.some(one) || (texts.length > 1 && one(texts.join('\n')));
}
const refused = (lang: HandoffLang): Built<never> => ({ok: false, reason: 'secret', words: SECRET_WORDS[lang]});
const no = (reason: Exclude<Extract<Built, {ok: false}>['reason'], 'secret'>, en: string, nl: string, lang: HandoffLang): Built<never> => ({ok: false, reason, words: lang === 'nl' ? nl : en});

// ── Email (RFC 6068) ────────────────────────────────────────────────────────────────────────────────────────────────
/** An address as a mail link may carry it: an ASCII local part and a DNS name; no display name, no comment, no route. */
const ADDRESS = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
export const ADDRESS_IN_TEXT = /[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}/g;
export const isAddress = (text: string): boolean => text.length <= MAX_ADDRESS && text.indexOf('@') <= 64 && ADDRESS.test(text);
/**
 * RFC 6068 percent-encoding of one value: everything except the unreserved characters is encoded as UTF-8 octets (so a
 * "&", "?", "=", "#", "%" or a line break inside a subject or a body can never start a header field of its own); a line
 * break travels as CRLF (%0D%0A); a space as %20, never "+".
 */
export const mailtoEncode = (value: string): string => encodeURIComponent(value.replace(LONE_SURROGATE, '').replace(/\r\n|\r|\n/g, '\r\n')).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
/** The link: `mailto:<addresses>?subject=…&body=…`. Only these two header fields are ever written. */
export function mailtoLink(to: readonly string[], subject: string, body: string): string {
  const who = to.map(address => { const at = address.lastIndexOf('@'); return `${mailtoEncode(address.slice(0, at))}@${address.slice(at + 1).toLowerCase()}`; }).join(',');
  const fields = [subject ? `subject=${mailtoEncode(subject)}` : '', body ? `body=${mailtoEncode(body)}` : ''].filter(Boolean).join('&');
  return `mailto:${who}${fields ? `?${fields}` : ''}`;
}
export type EmailInput = {to?: readonly string[]; named?: string; subject?: string; body?: string;
  /** For a draft the person did not word themselves: whether an address stands in their own typed words. Absent: the addresses are the person's own. */
  typedAddress?: (address: string) => boolean};
export function buildEmail(input: EmailInput, lang: HandoffLang = 'en'): Built<EmailHandoff> {
  const asked = (input.to ?? []).map(a => oneLine(a, MAX_ADDRESS + 1)).filter(Boolean);
  if (asked.length > MAX_TO) return no('address', `An email draft takes at most ${MAX_TO} addresses; add the others in your mail app.`, `Een e-mailconcept neemt hooguit ${MAX_TO} adressen; voeg de andere toe in je mailapp.`, lang);
  const bad = asked.find(a => !isAddress(a));
  if (bad !== undefined) return no('address', `“${clip(bad, 80)}” is not an email address I can put in a mail link. Use a plain address such as name@example.com.`, `“${clip(bad, 80)}” is geen e-mailadres dat in een maillink kan. Gebruik een gewoon adres zoals naam@voorbeeld.nl.`, lang);
  const to = [...new Set(asked.map(a => { const at = a.lastIndexOf('@'); return `${a.slice(0, at)}@${a.slice(at + 1).toLowerCase()}`; }))];
  const subject = oneLine(input.subject, MAX_SUBJECT), body = plainText(input.body, MAX_BODY), named = oneLine(input.named, 60);
  if (!to.length && !subject && !body && !named) return no('empty', 'Say who the email is for, or what it is about.', 'Zeg voor wie de e-mail is, of waarover hij gaat.', lang);
  if (holdsSecret([subject, body, named, ...to])) return refused(lang);
  const whole = mailtoLink(to, subject, body), bodyInLink = whole.length <= MAILTO_MAX;
  const href = bodyInLink ? whole : mailtoLink(to, subject, '');
  if (href.length > MAILTO_MAX) return no('long', 'This subject is too long for a mail link. Make it shorter.', 'Dit onderwerp is te lang voor een maillink. Maak het korter.', lang);
  const unverified = input.typedAddress ? to.filter(a => !input.typedAddress!(a)) : [];
  return {ok: true, handoff: {kind: 'email', to, subject, body, href, bodyInLink, ...(named && !to.length ? {named} : {}), ...(unverified.length ? {unverified} : {})}};
}

// ── A link ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const BARE_HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{1,5})?(?:[/?#][^\s]*)?$/i;
/** A bare name the person may type for a site ("example.com/page"): only with a common ending, so "notes.txt" is not a link. */
export const BARE_LINK = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|io|app|dev|nl|be|de|fr|uk|eu|co|info|me|ai|gov|edu)(?::\d{1,5})?(?:[/?#]\S*)?$/i;
const TRAILING = new Set([...'.,;:!?)]}\'"»”’']), LEADING = new Set([...'([{<\'"`«“‘']);
/** A word without the sentence punctuation after it (read from the end, one character at a time). */
export function trimLink(found: string): string { let end = found.length; while (end > 0 && TRAILING.has(found[end - 1]!)) end--; return found.slice(0, end); }
const bare = (word: string): string => { let start = 0; while (start < word.length && LEADING.has(word[start]!)) start++; return trimLink(word.slice(start)); };
/**
 * Security review (finding 12): the links and the mail addresses in running text, read in one pass. The text is split on
 * white space and each word is read once, from its start (no pattern searches the whole text, so a long run such as
 * "a.a.a.…" costs its length, not its square). A word longer than a link or an address may be is not read at all.
 */
export const TYPED_READ_CHARS = 4000, TYPED_READ_MESSAGES = 20;
export function linksIn(text: string): string[] {
  const out: string[] = [];
  for (const word of text.split(/\s+/)) { if (word.length < 4 || word.length > MAX_URL) continue; const w = bare(word); if (/^https?:\/\/[^/?#]/i.test(w) || BARE_LINK.test(w)) out.push(w); }
  return out;
}
export function addressesIn(text: string): string[] {
  const out: string[] = [];
  for (const word of text.split(/[\s,;<>()[\]"']+/)) { if (word.length < 6 || word.length > MAX_ADDRESS + 2) continue; const w = trimLink(word.replace(/^mailto:/i, '')); if (isAddress(w)) out.push(w.toLowerCase()); }
  return out;
}
/** The part of the person's typed words that is read for links and addresses: the newest messages, the end of each. */
export const recentTyped = (typed: readonly string[] | undefined | null): string[] => (typed ?? []).slice(-TYPED_READ_MESSAGES).map(text => String(text).slice(-TYPED_READ_CHARS));
export type LinkInput = {url: string; source: HandoffSource; /** A name without a scheme ("example.com") reads as https. Only for the person's own words. */ bare?: boolean};
/**
 * A link the card may open: http or https only, parsed by the browser's own URL parser, so the host on the card is the
 * host the browser will ask. Refused: any other scheme (javascript:, data:, file:, mailto:, blob:, intent:, …), a name or
 * a password before the host ("https://bank.example@evil.example" reads like one site and opens another), a backslash,
 * white space, a hidden or direction-changing character, and anything too long to show in full.
 */
export function buildLink(input: LinkInput, lang: HandoffLang = 'en'): Built<LinkHandoff> {
  const raw = String(input.url ?? '').trim();
  const not = (en: string, nl: string) => no('link', en, nl, lang);
  if (!raw) return not('Which link? Give its whole address, such as https://example.com.', 'Welke link? Geef het hele adres, zoals https://voorbeeld.nl.');
  if (raw.length > MAX_URL) return not('This link is too long to show in full on a card, so I will not open it.', 'Deze link is te lang om volledig op een kaart te tonen, dus open ik hem niet.');
  if (/[\s\\]/.test(raw) || holdsHidden(raw) || raw.replace(LONE_SURROGATE, '') !== raw) return not('This link holds a space, a backslash or a hidden character. I only open plain web links.', 'Deze link bevat een spatie, een backslash of een verborgen teken. Ik open alleen gewone weblinks.');
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : input.bare && BARE_HOST.test(raw) ? `https://${raw}` : raw;
  if (!/^https?:\/\/[^/?#]/i.test(withScheme)) return not('I only open web links that start with https:// or http://.', 'Ik open alleen weblinks die met https:// of http:// beginnen.');
  let url: URL;
  try { url = new URL(withScheme); } catch { return not('This is not a web address I can read.', 'Dit is geen webadres dat ik kan lezen.'); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return not('I only open web links that start with https:// or http://.', 'Ik open alleen weblinks die met https:// of http:// beginnen.');
  if (url.username || url.password || /^https?:\/\/[^/?#]*@/i.test(withScheme)) return not('This link has a name or a password in front of its site, which can make it look like another site. I will not open it.', 'Deze link heeft een naam of wachtwoord vóór de site staan, waardoor hij op een andere site kan lijken. Ik open hem niet.');
  if (!url.hostname) return not('This is not a web address I can read.', 'Dit is geen webadres dat ik kan lezen.');
  if (holdsSecret([url.href])) return refused(lang);
  // What was written where the host stands, against the host the browser will really ask.
  const typed = (/^https?:\/\/([^/?#]*)/i.exec(withScheme)?.[1] ?? '').replace(/:\d*$/, '').toLowerCase(), real = url.hostname.toLowerCase();
  const idn = real.split('.').some(label => label.startsWith('xn--'));
  return {ok: true, handoff: {kind: 'link', href: url.href, host: url.host, secure: url.protocol === 'https:', idn, ...(typed && typed !== real && typed !== real.replace(/\.$/, '') ? {written: clip(typed, 120)} : {}), untrusted: input.source !== 'person'}};
}

// ── A calendar file ─────────────────────────────────────────────────────────────────────────────────────────────────
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/, CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function realDay(date: string): boolean {
  const m = DAY.exec(date); if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number(m[1]) >= 1970 && Number(m[1]) <= 2200 && d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}
const slug = (text: string): string => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '') || 'event';
export type CalendarInput = {title: string; date: string; time?: string | null; minutes?: number | null; note?: string};
/** One event as an .ics file (RFC 5545 through lib/ics/ics.ts: escaped text, folded lines, a stable UID so adding it twice updates the same event). */
export function buildCalendar(input: CalendarInput, now: Date, lang: HandoffLang = 'en'): Built<CalendarHandoff> {
  const title = oneLine(input.title, MAX_TITLE), note = plainText(input.note, MAX_NOTE), date = String(input.date ?? '').trim(), time = input.time ? String(input.time).trim() : '';
  if (!title) return no('empty', 'What should the event be called?', 'Hoe moet de afspraak heten?', lang);
  if (!realDay(date)) return no('date', 'I need a day for the calendar file, such as “on 3 December” or “tomorrow”.', 'Ik heb een dag nodig voor het agendabestand, zoals “op 3 december” of “morgen”.', lang);
  if (time && !CLOCK.test(time)) return no('date', 'I could not read that time. Use a clock time such as 14:30.', 'Ik kon die tijd niet lezen. Gebruik een kloktijd zoals 14:30.', lang);
  if (holdsSecret([title, note])) return refused(lang);
  const minutes = time ? Math.max(5, Math.min(24 * 60, Math.round(Number.isFinite(input.minutes) && input.minutes ? Number(input.minutes) : DEFAULT_EVENT_MINUTES))) : undefined;
  let ics: string;
  try { ics = buildIcs([{id: `nova-handoff:${date}:${time}:${title}`, date, time: time || null, ...(minutes ? {minutes} : {}), summary: title, ...(note ? {description: note} : {})}], {stamp: now, name: 'From NOVA'}); }
  catch { return no('date', 'The calendar file could not be made on this device.', 'Het agendabestand kon op dit apparaat niet worden gemaakt.', lang); }
  return {ok: true, handoff: {kind: 'calendar', title, date, ...(time ? {time, minutes} : {}), ...(note ? {note} : {}), fileName: `nova-${slug(title)}-${date}.ics`, ics}};
}

// ── Share and copy ──────────────────────────────────────────────────────────────────────────────────────────────────
export type ShareInput = {title?: string; text?: string; url?: string; source: HandoffSource};
export function buildShare(input: ShareInput, lang: HandoffLang = 'en'): Built<ShareHandoff> {
  const title = oneLine(input.title, MAX_TITLE), text = plainText(input.text, MAX_BODY);
  let url: string | undefined, host: string | undefined;
  if (input.url && String(input.url).trim()) {
    const link = buildLink({url: String(input.url), source: input.source}, lang);
    if (!link.ok) return link;
    url = link.handoff.href; host = link.handoff.host;
  }
  if (!text && !url) return no('empty', 'There is nothing to share yet. Ask me something first, or say what to share.', 'Er is nog niets om te delen. Vraag me eerst iets, of zeg wat ik moet delen.', lang);
  if (holdsSecret([title, text, url])) return refused(lang);
  return {ok: true, handoff: {kind: 'share', ...(title ? {title} : {}), ...(text ? {text} : {}), ...(url ? {url, host} : {})}};
}
export function buildCopy(input: {text: string}, lang: HandoffLang = 'en'): Built<CopyHandoff> {
  const text = plainText(input.text, MAX_COPY + 1);
  if (!text) return no('empty', 'There is nothing to copy yet. Ask me something first, or say what to copy.', 'Er is nog niets om te kopiëren. Vraag me eerst iets, of zeg wat ik moet kopiëren.', lang);
  if ([...text].length > MAX_COPY) return no('long', 'That is too long to copy from a card. Select the text in the conversation instead.', 'Dat is te lang om vanaf een kaart te kopiëren. Selecteer de tekst in het gesprek.', lang);
  if (holdsSecret([text])) return refused(lang);
  return {ok: true, handoff: {kind: 'copy', text}};
}

// ── What the card and the history say ───────────────────────────────────────────────────────────────────────────────
/** The history's "what" for each kind (lib/nova/outbox/record.ts): a few fixed words, never the content. */
export const HANDOFF_WHAT: Readonly<Record<HandoffKind, string>> = {email: 'Email draft', calendar: 'Calendar file', share: 'Share', link: 'Link', copy: 'Copy'};
/** The history's "target": the address or the host the card showed. Never a subject, a body, a note, a title, a path or a query. */
export function handoffTarget(h: Handoff): string {
  switch (h.kind) {
    case 'email': return h.to.length ? h.to.join(', ') : 'Your mail app (no address)';
    case 'calendar': return 'A calendar file on this device';
    case 'share': return h.host ? `Share sheet · ${h.host}` : 'Share sheet';
    case 'link': return h.host;
    case 'copy': return 'Clipboard';
  }
}
/** The texts of a hand-off that would leave the device (for the Health rule and the tests). */
export function handoffTexts(h: Handoff): string[] {
  switch (h.kind) {
    case 'email': return [h.subject, h.body].filter(Boolean);
    case 'calendar': return [h.title, h.note ?? ''].filter(Boolean);
    case 'share': return [h.title ?? '', h.text ?? '', h.url ?? ''].filter(Boolean);
    case 'link': return [h.href];
    case 'copy': return [h.text];
  }
}
export {sentence as sentenceCase, clip as clipText};

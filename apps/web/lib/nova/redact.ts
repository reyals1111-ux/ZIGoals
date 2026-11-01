import {secretKinds} from '../emergency-sheet/secrets';

/**
 * Session AK, owner follow-up 2 (N3 step 2, N9; lane NC): Guarded mode's redaction. Before anything goes to a cloud
 * model, the text loses what identifies the person or their money, on this device, with plain pattern matching:
 * - secrets: recovery words and private keys, through the emergency sheet's own detector (lib/emergency-sheet/secrets.ts,
 *   the same one lib/secret-guard uses), replaced per word, then per line, then per run of lines;
 * - account numbers: IBANs (checksum-verified, or labelled "IBAN"), card numbers (Luhn-verified), long runs of digits
 *   that are not dates; wallet addresses (0x… and bech32 such as zig1…); e-mail addresses; phone numbers;
 * - addresses: a house number with a street word ("12 Abbey Road", "Kerkstraat 5", "16 rue de la Loi"), a postcode that
 *   follows one, UK postcodes and US "City, ST 12345";
 * - exact amounts: a number with a currency (a symbol or a code, before or after it) becomes "about" a rounded number
 *   ("€1,234.56" → "about €1,200"), so the size is kept and the exact figure is not;
 * - names: names the person has told NOVA (from their notes, passed in as `knownNames`), and names after a clear cue: a
 *   title ("Dr Patel"), a relation ("my sister Anna"), a verb about a person ("call Tom", "met Sarah", "with Lena"), a
 *   greeting ("Dear Anna"), "Anna's birthday", "Anna is my sister". A capital letter alone is never enough: goal and
 *   habit titles ("Emergency Fund", "Morning Run"), brands, places and the app's own words stay as they are.
 * Placeholders are plain words in brackets ("[name]", "[address]"), so the model can still follow the sentence. Nothing
 * here is stored or sent; the original text never leaves the caller.
 */
export const REDACTION_KINDS = ['secret', 'iban', 'card', 'account', 'wallet', 'email', 'phone', 'address', 'amount', 'name'] as const;
export type RedactionKind = (typeof REDACTION_KINDS)[number];
export type RedactionCounts = Partial<Record<RedactionKind, number>>;
export type Redacted = {text: string; found: RedactionCounts};
export type RedactOptions = {knownNames?: readonly string[]};
export const PLACEHOLDERS: Readonly<Record<Exclude<RedactionKind, 'amount'>, string>> = {
  secret: '[secret removed]', iban: '[IBAN]', card: '[card number]', account: '[account number]', wallet: '[wallet address]',
  email: '[email]', phone: '[phone]', address: '[address]', name: '[name]',
};
export const REDACTION_LABELS: Readonly<Record<RedactionKind, string>> = {
  secret: 'secrets', iban: 'IBANs', card: 'card numbers', account: 'account numbers', wallet: 'wallet addresses', email: 'e-mail addresses',
  phone: 'phone numbers', address: 'addresses', amount: 'exact amounts (rounded)', name: 'names',
};
/** The longest text redacted in one piece; longer text is cut first (a system prompt is far below this). */
export const REDACT_MAX_CHARS = 400_000;
/** At most this many known names are matched (the person's notes hold at most a hundred). */
export const KNOWN_NAMES_MAX = 200;

const L = '\\p{L}', N = '\\p{N}';
/** Not inside a word on either side (JavaScript's \b knows only ASCII). */
const START = `(?<![${L}${N}_])`, END = `(?![${L}${N}_])`;
/** Each letter in both cases, for cue words that may start a sentence ("Call Tom", "call Tom"). */
const anyCase = (word: string) => [...word].map(c => /[a-z]/i.test(c) ? `[${c.toLowerCase()}${c.toUpperCase()}]` : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
const words = (list: readonly string[]) => list.map(anyCase).join('|');

type Pass = (text: string, count: (kind: RedactionKind, n?: number) => void) => string;

// ── Secrets ────────────────────────────────────────────────────────────────────────────────────────────────────────
const PEM_BLOCK = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g;
const BYTE_LIST = /\[[\d\s,]{40,1200}\]/g;
const flagged = (text: string) => secretKinds(text).length > 0;
/** A line of a written word list: an optional number, then one to four short lower-case words. */
const WORD_LINE = /^\s*(?:#?\(?\d{1,2}[.):]?\s*)?(?:\p{Ll}{3,8}[\s,]*){1,4}$/u;
const secrets: Pass = (text, count) => {
  if (!flagged(text)) return text;
  const mark = () => { count('secret'); return PLACEHOLDERS.secret; };
  let out = text.replace(PEM_BLOCK, mark).replace(BYTE_LIST, m => flagged(m) ? mark() : m);
  // One long token at a time (a hex key, an xprv, a WIF, nsec1…, AGE-SECRET-KEY-1…).
  out = out.replace(/\S{16,}/g, token => flagged(token) ? mark() : token);
  if (!flagged(out)) return out;
  // Then line by line (recovery words written on one line, a key in groups).
  let lines = out.split('\n').map(line => flagged(line) ? mark() : line);
  out = lines.join('\n');
  if (!flagged(out)) return out;
  // Words written one per line ("1. abandon" …): the shortest run of lines that holds them, again until none is left.
  lines = out.split('\n');
  if (lines.length > 600) { count('secret'); return PLACEHOLDERS.secret; }
  for (let guard = 0; guard < 50 && flagged(lines.join('\n')); guard++) {
    let found: [number, number] | null = null;
    for (let end = 0; end < lines.length && !found; end++) {
      if (!flagged(lines.slice(0, end + 1).join('\n'))) continue;
      let start = end; while (start > 0 && !flagged(lines.slice(start, end + 1).join('\n'))) start--;
      found = [start, end];
    }
    if (!found) break;
    // The rest of the same list goes too ("11. access", "12. accident" after the twelfth word that tripped the detector).
    while (found[1] + 1 < lines.length && WORD_LINE.test(lines[found[1] + 1]!)) found[1]++;
    while (found[0] > 0 && WORD_LINE.test(lines[found[0] - 1]!)) found[0]--;
    lines.splice(found[0], found[1] - found[0] + 1, mark());
  }
  out = lines.join('\n');
  if (flagged(out)) { count('secret'); return PLACEHOLDERS.secret; }
  return out;
};

// ── E-mail, wallets ────────────────────────────────────────────────────────────────────────────────────────────────
const EMAIL = new RegExp(`${START}[\\p{L}\\p{N}._%+-]+@[\\p{L}\\p{N}-]+(?:\\.[\\p{L}\\p{N}-]+)*\\.\\p{L}{2,}${END}`, 'gu');
const emails: Pass = (text, count) => text.replace(EMAIL, () => { count('email'); return PLACEHOLDERS.email; });
const EVM = /(?<![0-9a-zA-Z])0x[0-9a-fA-F]{40}(?![0-9a-zA-Z])/g;
/** Bech32 addresses (zig1…, cosmos1…, osmo1…, bc1…): a short lowercase prefix, "1", then 38 or more data characters. */
const BECH32 = /(?<![0-9a-z])[a-z]{2,12}1[02-9ac-hj-np-z]{38,90}(?![0-9a-z])/g;
const wallets: Pass = (text, count) => text.replace(EVM, () => { count('wallet'); return PLACEHOLDERS.wallet; }).replace(BECH32, () => { count('wallet'); return PLACEHOLDERS.wallet; });

// ── IBANs, cards, account numbers, phones ─────────────────────────────────────────────────────────────────────────
/** ISO 13616: move the first four characters to the end, letters to numbers (A = 10), the remainder by 97 is 1. */
export function ibanValid(raw: string): boolean {
  const iban = raw.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  let rest = 0;
  for (const c of iban.slice(4) + iban.slice(0, 4)) { const v = c >= 'A' ? String(c.charCodeAt(0) - 55) : c; for (const d of v) rest = (rest * 10 + Number(d)) % 97; }
  return rest === 1;
}
const IBAN = /(?<![A-Za-z0-9])([A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]{2,4}){3,8})(?![A-Za-z0-9])/g;
const IBAN_LABELLED = /(\b[Ii][Bb][Aa][Nn]\b[:\s]*)([A-Za-z]{2}\d{2}[A-Za-z0-9 -]{8,40}[A-Za-z0-9])/g;
const ibans: Pass = (text, count) => text
  .replace(IBAN_LABELLED, (_m, label: string) => { count('iban'); return `${label}${PLACEHOLDERS.iban}`; })
  .replace(IBAN, (m: string) => ibanValid(m) ? (count('iban'), PLACEHOLDERS.iban) : m);
export function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) { let d = Number(digits[digits.length - 1 - i]); if (i % 2) { d *= 2; if (d > 9) d -= 9; } sum += d; }
  return sum % 10 === 0;
}
const CARD = /(?<![\d.,])\d(?:[ -]?\d){12,18}(?![\d.,])/g;
const cards: Pass = (text, count) => text.replace(CARD, m => luhnValid(m.replace(/\D/g, '')) ? (count('card'), PLACEHOLDERS.card) : m);
/** International (+32 470 12 34 56, 0032…) or national with a leading 0 (0470 12 34 56, (020) 7946 0958): 9–15 digits. */
const PHONE = /(?<![\w+])(?:\+|00)[1-9](?:[ ().\/-]{0,2}\d){7,14}(?!\d)|(?<![\w.,\/-])\(?0\d{1,4}\)?(?:[ .\/-]?\d{2,4}){2,4}(?![\d.,\/-])/g;
const DATE_LIKE = /^(?:\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./]\d{1,2}[-./]\d{2,4})$/;
const phones: Pass = (text, count) => text.replace(PHONE, m => {
  const digits = m.replace(/\D/g, '').length;
  if (DATE_LIKE.test(m.trim()) || digits < 9 || digits > 15) return m;
  count('phone'); return PLACEHOLDERS.phone;
});
/** Eight or more digits in a row (or in groups joined by single spaces or hyphens) that are not a date. */
const DIGIT_RUN = /(?<![\d.,\p{L}])\d(?:[ -]?\d){7,}(?![\d.,\p{L}])/gu;
const accounts: Pass = (text, count) => text.replace(DIGIT_RUN, m => DATE_LIKE.test(m) || /^\d{4}-\d{2}-\d{2}/.test(m) ? m : (count('account'), PLACEHOLDERS.account));

// ── Amounts ────────────────────────────────────────────────────────────────────────────────────────────────────────
const SYMBOLS = '€$£¥₹₩₺₽₪₫₱฿';
const CODES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'TRY', 'INR', 'CNY', 'HKD', 'SGD', 'ZAR', 'BRL', 'MXN', 'KRW', 'AED', 'SAR', 'ILS', 'THB',
  'BTC', 'ETH', 'ZIG', 'USDC', 'USDT', 'SOL', 'ATOM', 'stZIG'];
const WORDS = ['euros?', 'dollars?', 'pounds?', 'francs?', 'yen'];
/** A written number: 1234, 1234.56, 1,234.56, 1.234,56, 1 234,56, 1'234.56. */
const NUM = "\\d{1,3}(?:[,.' \\u00a0\\u202f]\\d{3})+(?:[.,]\\d{1,8})?|\\d+(?:[.,]\\d{1,8})?";
const CODE = `(?:${CODES.join('|')})`;
const AMOUNT = new RegExp([
  `(?<pre>[${SYMBOLS}]|${START}${CODE}[ \\u00a0]?)(?<num1>-?(?:${NUM}))`,
  `(?<num2>-?(?:${NUM}))(?<post>[ \\u00a0]?(?:[${SYMBOLS}]|${CODE}${END}|(?:${WORDS.join('|')})${END}))`,
].map(p => `(?:${p})`).join('|'), 'gu');
/** The written number as a value: the last of "," or "." is the decimal mark when 1–2 (or 4+) digits follow it once. */
export function parseAmount(text: string): number | null {
  const raw = text.replace(/[\s  ']/g, '');
  const negative = raw.startsWith('-'), body = negative ? raw.slice(1) : raw;
  const last = Math.max(body.lastIndexOf(','), body.lastIndexOf('.'));
  let value: number;
  if (last < 0) value = Number(body);
  else {
    const tail = body.slice(last + 1), marks = body.match(/[.,]/g)!.length, mixed = /,/.test(body) && /\./.test(body);
    const decimal = mixed || (marks === 1 && tail.length !== 3) || (marks === 1 && body[last] === '.' && !/,/.test(body));
    value = decimal ? Number(`${body.slice(0, last).replace(/[.,]/g, '')}.${tail}`) : Number(body.replace(/[.,]/g, ''));
  }
  return Number.isFinite(value) ? (negative ? -value : value) : null;
}
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/**
 * Rounded so the size is kept and the exact figure is not: under 1 → "less than 1"; under 10 → whole units; under 100 →
 * the nearest ten; from 100 → two significant figures (847 → 850, 1,234.56 → 1,200, 98,765 → 99,000).
 */
export function roundAmount(value: number): string {
  const sign = value < 0 ? '-' : '', v = Math.abs(value);
  if (v < 1) return v === 0 ? '0' : `${sign}less than 1`;
  if (v < 10) return `${sign}${Math.round(v)}`;
  if (v < 100) return `${sign}${Math.round(v / 10) * 10}`;
  const step = 10 ** (Math.floor(Math.log10(v)) - 1);
  return `${sign}${group(Math.round(v / step) * step)}`;
}
const amounts: Pass = (text, count) => text.replace(AMOUNT, (match: string, ...args: unknown[]) => {
  const offset = args[args.length - 3] as number, whole = args[args.length - 2] as string, g = args[args.length - 1] as Record<string, string | undefined>;
  const num = g.num1 ?? g.num2 ?? '', value = parseAmount(num);
  if (value === null) return match;
  // A figure already written "about …" (an earlier pass, or the person's own words) is rounded without a second "about".
  const about = /(?:about|~)\s*$/i.test(whole.slice(Math.max(0, offset - 7), offset)) ? '' : 'about ';
  const rounded = roundAmount(value);
  if (!about && rounded === num.replace(/^-/, value < 0 ? '-' : '')) return match;
  count('amount');
  return g.num1 !== undefined ? `${about}${g.pre}${rounded}` : `${about}${rounded}${g.post}`;
});

// ── Addresses ──────────────────────────────────────────────────────────────────────────────────────────────────────
const CAP = `\\p{Lu}[\\p{L}'’.-]*`;
const EN_STREET = ['Street', 'St', 'Road', 'Rd', 'Avenue', 'Ave', 'Lane', 'Ln', 'Drive', 'Boulevard', 'Blvd', 'Way', 'Court', 'Ct', 'Place', 'Square', 'Sq', 'Terrace', 'Close', 'Crescent', 'Gardens', 'Grove', 'Mews', 'Parade', 'Highway', 'Hwy'];
/** Dutch and German street words written onto the name ("Kerkstraat", "Hauptstraße"); never a short ending that ordinary words share ("ring": "Spring 2026"). */
const NL_DE_SUFFIX = ['straat', 'laan', 'weg', 'plein', 'dreef', 'steenweg', 'gracht', 'kade', 'singel', 'dijk', 'str\\.', 'straße', 'strasse', 'gasse', 'platz', 'allee', 'damm'];
/** Street words that come first, written with a capital ("Rue de la Loi 16", "Via Roma 5"; never "via email 2"). */
const ROMANCE_FIRST = ['Rue', 'Avenue', 'Av.', 'Boulevard', 'Bd', 'Chaussée', 'Place', 'Quai', 'Allée', 'Impasse', 'Chemin', 'Via', 'Viale', 'Piazza', 'Corso', 'Calle', 'Carrer', 'Rua', 'Avenida', 'Plaza'];
/** After a house number, in either case ("16 rue de la Loi"). */
const ROMANCE_AFTER_NUMBER = ['rue', 'avenue', 'boulevard', 'bd', 'chaussée', 'quai', 'allée', 'impasse', 'chemin', 'place'];
const literal = (list: readonly string[]) => list.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
/** ", 1000 Brussels", ", B-1000 Brussel", ", 75008 Paris", ", 1011 AB Amsterdam" after a street. */
const TOWN = `(?:,?[ \\u00a0]+(?:[A-Z]{1,2}-)?\\d{4,5}(?:[ \\u00a0]?[A-Z]{2})?[ \\u00a0]+${CAP}(?:[ \\u00a0-]${CAP})?)?`;
const ADDRESS = new RegExp([
  // 12 Abbey Road, 221B Baker Street, 1600 Pennsylvania Avenue NW
  `${START}\\d{1,5}[A-Za-z]?,?[ \\u00a0]+(?:${CAP}[ \\u00a0]+){1,3}(?:${EN_STREET.join('|')})\\.?${END}(?:[ \\u00a0]+(?:NW|NE|SW|SE|N|S|E|W)${END})?`,
  // Kerkstraat 12, Hauptstraße 5a, Grote Markt 1 bus 3
  `${START}(?:${CAP}[ \\u00a0-])?\\p{Lu}[\\p{Ll}-]*(?:${NL_DE_SUFFIX.join('|')})[ \\u00a0]+\\d{1,4}[a-zA-Z]?(?:[ \\u00a0]?(?:bus|bte|box)[ \\u00a0]?\\d{1,4})?${END}`,
  // Rue de la Loi 16, Avenue Louise 54
  `${START}(?:${literal(ROMANCE_FIRST)})[ \\u00a0]+(?:[\\p{L}'’-]+[ \\u00a0]+){0,4}?${CAP},?[ \\u00a0]+\\d{1,4}[a-z]?${END}`,
  // 16 rue de la Loi, 10 avenue des Champs-Élysées
  `${START}\\d{1,4}(?:bis|ter)?,?[ \\u00a0]+(?:${words(ROMANCE_AFTER_NUMBER)})[ \\u00a0]+(?:(?:de|du|des|la|le|les|l'|d')[ \\u00a0]*){0,3}${CAP}(?:[ \\u00a0-]${CAP})*`,
].map(p => `(?:${p})${TOWN}`).join('|'), 'gu');
const UK_POSTCODE = /(?<![A-Za-z0-9])(?:[A-Z]{1,2}\d[A-Z\d]?|GIR)[  ]?\d[ABD-HJLNP-UW-Z]{2}(?![A-Za-z0-9])/g;
const US_STATES = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC';
const US_TOWN = new RegExp(`${START}\\p{Lu}[\\p{L}.-]+(?:[ \\u00a0]\\p{Lu}[\\p{L}.-]+)?,[ \\u00a0](?:${US_STATES})[ \\u00a0]\\d{5}(?:-\\d{4})?${END}`, 'gu');
const addresses: Pass = (text, count) => {
  const mark = () => { count('address'); return PLACEHOLDERS.address; };
  return text.replace(ADDRESS, mark).replace(US_TOWN, mark).replace(UK_POSTCODE, mark);
};

// ── Names ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Capitalised words that follow a cue but are not people (lower case here): the app's own words, weekdays and months,
 * holidays, languages, brands and services people name in a note, relation words themselves ("call Mom") and the
 * small words that start a phrase ("with The team").
 */
export const NOT_NAMES: ReadonlySet<string> = new Set([
  'today', 'tomorrow', 'yesterday', 'tonight', 'goals', 'goal', 'habits', 'habit', 'health', 'wealth', 'earn', 'insights', 'review', 'settings', 'help', 'journal', 'agenda', 'notes', 'note', 'tasks', 'task', 'focus', 'checklist', 'music', 'chess', 'markets', 'staking', 'portfolio', 'nova', 'zigi', 'zigoals', 'showcase', 'weekly', 'daily', 'monthly',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'christmas', 'easter', 'ramadan', 'eid', 'diwali', 'hanukkah', 'thanksgiving', 'halloween', 'new', 'year', 'years', 'eve', 'god', 'english', 'dutch', 'french', 'german', 'spanish', 'italian', 'portuguese', 'chinese', 'japanese', 'arabic',
  'apple', 'google', 'microsoft', 'amazon', 'netflix', 'spotify', 'strava', 'garmin', 'fitbit', 'oura', 'whoop', 'withings', 'peloton', 'zwift', 'duolingo', 'headspace', 'calm', 'notion', 'obsidian', 'slack', 'discord', 'teams', 'zoom', 'telegram', 'signal', 'messenger', 'instagram', 'facebook', 'twitter', 'reddit', 'youtube', 'tiktok', 'linkedin', 'uber', 'lyft', 'airbnb', 'booking', 'revolut', 'wise', 'paypal', 'kraken', 'coinbase', 'binance', 'keplr', 'ledger', 'trezor', 'metamask', 'ollama', 'claude', 'gemini', 'grok', 'mistral', 'llama', 'qwen', 'gemma', 'openai', 'anthropic', 'chrome', 'safari', 'firefox', 'edge', 'android', 'windows', 'linux', 'mac', 'python', 'excel', 'word', 'outlook', 'gmail', 'visa', 'mastercard', 'amex', 'tesla', 'ikea', 'lidl', 'aldi', 'delhaize', 'colruyt', 'carrefour', 'tesco', 'walmart', 'costco', 'starbucks', 'oroswap', 'valdora', 'openrouter',
  'mom', 'mum', 'mommy', 'mummy', 'mother', 'dad', 'daddy', 'father', 'mama', 'papa', 'grandma', 'grandpa', 'granny', 'nana', 'wife', 'husband', 'partner', 'son', 'daughter', 'brother', 'sister', 'friend', 'friends', 'boss', 'team', 'family', 'kids', 'baby', 'doctor', 'coach',
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'our', 'his', 'her', 'their', 'its', 'it', 'we', 'they', 'you', 'he', 'she', 'me', 'us', 'them', 'all', 'every', 'each', 'no', 'some', 'any', 'one', 'two', 'both', 'everyone', 'someone', 'nobody', 'people', 'him', 'i', 'world', 'there', 'everybody', 'support', 'customer', 'service',
]);
const RELATIONS = ['best friend', 'friend', 'wife', 'husband', 'partner', 'spouse', 'son', 'daughter', 'kid', 'child', 'mum', 'mom', 'mother', 'dad', 'father', 'brother', 'sister', 'sibling', 'boyfriend', 'girlfriend', 'fiancé', 'fiancée', 'fiance', 'fiancee', 'boss', 'manager', 'colleague', 'coworker', 'co-worker', 'neighbour', 'neighbor', 'cousin', 'aunt', 'uncle', 'niece', 'nephew', 'grandma', 'grandmother', 'grandpa', 'grandfather', 'grandson', 'granddaughter', 'doctor', 'dentist', 'therapist', 'coach', 'trainer', 'teacher', 'landlord', 'landlady', 'roommate', 'flatmate', 'baby', 'stepson', 'stepdaughter', 'mother-in-law', 'father-in-law', 'vrouw', 'man', 'vriend', 'vriendin', 'zoon', 'dochter', 'moeder', 'vader', 'broer', 'zus'];
const OWNERS = ['my', 'our', 'his', 'her', 'your', 'their', 'mijn', 'onze'];
const TITLES = ['Mr', 'Mrs', 'Ms', 'Miss', 'Mx', 'Dr', 'Prof', 'Sir', 'Dame', 'Mevrouw', 'Meneer', 'Mevr', 'Dhr', 'Madame', 'Monsieur', 'Mme', 'Herr', 'Frau'];
const VERBS = ['call', 'called', 'calling', 'text', 'texted', 'email', 'emailed', 'phone', 'phoned', 'message', 'messaged', 'meet', 'meeting', 'met', 'ask', 'asked', 'tell', 'told', 'thank', 'thanked', 'invite', 'invited', 'hug', 'hugged', 'remind', 'reminded', 'owe', 'owes', 'lend', 'lent', 'with'];
const GREETINGS = ['dear', 'hi', 'hello', 'hey'];
const AFTER_POSSESSIVE = ['birthday', 'wedding', 'party', 'house', 'place', 'flat', 'mum', 'mom', 'dad', 'school', 'gift', 'present', 'funeral', 'graduation', 'anniversary', 'kids', 'children', 'son', 'daughter', 'wife', 'husband', 'partner', 'appointment', 'number', 'address'];
/** One name word: a capital, then lower-case letters (Anna, O’Brien, Jean-Luc, Zoë); "NOVA" and "ZIGi" are not. */
const NAME_WORD = `\\p{Lu}\\p{Ll}+(?:['’-]\\p{Lu}?\\p{Ll}+)?`;
const PARTICLE = '(?:van|von|de|der|den|du|da|di|le|la|ten|ter|bin|al)';
/** A first name and up to two more name words (a surname, with particles: "Anna van der Berg"). */
const FULL_NAME = `${NAME_WORD}(?:[ \\u00a0](?:${PARTICLE}[ \\u00a0]){0,2}${NAME_WORD}){0,2}`;
const SEP = `[ \\u00a0]+`;
/** A title is a cue of its own ("with Dr. Patel": the title, not the verb, leads to the name). */
const NO_TITLE = `(?!(?:${TITLES.join('|')})\\.?${SEP})`;
const CUED = new RegExp([
  `(?<lead>${START}(?:${words(OWNERS)})${SEP}(?:${words(RELATIONS)}),?${SEP})${NO_TITLE}(?<n1>${FULL_NAME})`,
  `(?<lead2>${START}(?:${TITLES.join('|')})\\.?${SEP})(?<n2>${FULL_NAME})`,
  `(?<lead3>${START}(?:${words(VERBS)})${SEP})${NO_TITLE}(?<n3>${FULL_NAME})`,
  `(?<lead4>${START}(?:${words(GREETINGS)}),?${SEP})${NO_TITLE}(?<n4>${FULL_NAME})(?=[,!.:;\\s])`,
].map(p => `(?:${p})`).join('|'), 'gu');
const POSSESSIVE = new RegExp(`${START}(?<n>${NAME_WORD})['’]s(?<rest>${SEP}(?:${AFTER_POSSESSIVE.join('|')})${END})`, 'gu');
const IS_MY = new RegExp(`${START}(?<n>${FULL_NAME})(?<rest>${SEP}(?:is|was)${SEP}(?:${words(OWNERS)})${SEP}(?:${words(RELATIONS)})${END})`, 'gu');
/** The name words of a match that are not on the list: "Tom Saturday" keeps only "Tom"; "Mom" alone is no name. */
function nameWords(found: string): string | null {
  const parts = found.split(/[  ]+/), kept: string[] = [];
  for (const part of parts) {
    if (/^\p{Ll}+$/u.test(part)) { kept.push(part); continue; }
    if (NOT_NAMES.has(part.toLowerCase())) break;
    kept.push(part);
  }
  while (kept.length && /^\p{Ll}+$/u.test(kept[kept.length - 1]!)) kept.pop();
  return kept.length ? kept.join(' ') : null;
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The names a text gives with a cue ("my sister Anna", "Dr Patel", "Anna is my sister"), each once, in order. */
/**
 * A cued match's lead, the words found and the name kept, or null. A verb cue is weaker than a relation or a title: after
 * "with", or after a verb written with a capital (a heading: "Email Template", "Call Center"), only one name word followed
 * by no other capitalised word counts ("dinner with Anna", never "saving with Emergency Fund").
 */
function cued(g: Record<string, string | undefined>, after: string): {lead: string; found: string; kept: string} | null {
  const lead = g.lead ?? g.lead2 ?? g.lead3 ?? g.lead4 ?? '', found = g.n1 ?? g.n2 ?? g.n3 ?? g.n4 ?? '';
  if (g.lead3 !== undefined && (/^with/i.test(g.lead3) || /^\p{Lu}/u.test(g.lead3)) && /[ \u00a0]/.test(found)) return null;
  // A capitalised verb with one capitalised word after it is a heading ("Email Template", "Call Center") unless the sentence goes on ("Call Tom tomorrow").
  if (g.lead3 !== undefined && /^\p{Lu}/u.test(g.lead3) && !/^[ \u00a0]+\p{Ll}/u.test(after)) return null;
  const kept = nameWords(found);
  return kept ? {lead, found, kept} : null;
}
export function namesIn(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(CUED)) { const c = cued(m.groups ?? {}, text.slice(m.index + m[0].length)); if (c) out.add(c.kept); }
  for (const m of text.matchAll(IS_MY)) { const n = nameWords(m.groups?.n ?? ''); if (n) out.add(n); }
  for (const m of text.matchAll(POSSESSIVE)) { const n = nameWords(m.groups?.n ?? ''); if (n) out.add(n); }
  return [...out];
}
/** Known names for redaction from the person's own texts (their notes for ZIGi and NOVA): bounded, longest first. */
export function knownNamesFrom(texts: readonly string[]): string[] {
  const all = new Set<string>();
  for (const text of texts.slice(0, 500)) for (const name of namesIn(text.slice(0, 5000))) {
    for (const part of [name, ...name.split(' ').filter(p => /^\p{Lu}/u.test(p))]) if (part.length >= 2 && part.length <= 40 && !NOT_NAMES.has(part.toLowerCase())) all.add(part);
    if (all.size >= KNOWN_NAMES_MAX) break;
  }
  return [...all].sort((a, b) => b.length - a.length).slice(0, KNOWN_NAMES_MAX);
}
const names = (known: readonly string[]): Pass => (text, count) => {
  const mark = () => { count('name'); return PLACEHOLDERS.name; };
  let out = text.replace(CUED, (match: string, ...args: unknown[]) => {
    const offset = args[args.length - 3] as number, whole = args[args.length - 2] as string;
    const c = cued(args[args.length - 1] as Record<string, string | undefined>, whole.slice(offset + match.length));
    return c ? `${c.lead}${mark()}${c.found.slice(c.kept.length)}` : match;
  });
  out = out.replace(IS_MY, (match: string, ...args: unknown[]) => { const g = args[args.length - 1] as Record<string, string>; const kept = nameWords(g.n ?? ''); return kept ? `${mark()}${(g.n ?? '').slice(kept.length)}${g.rest}` : match; });
  out = out.replace(POSSESSIVE, (match: string, ...args: unknown[]) => { const g = args[args.length - 1] as Record<string, string>; return nameWords(g.n ?? '') ? `${mark()}’s${g.rest}` : match; });
  const list = known.filter(n => n.length >= 2 && !NOT_NAMES.has(n.toLowerCase())).slice(0, KNOWN_NAMES_MAX);
  if (list.length) {
    const any = new RegExp(`${START}(?:${[...list].sort((a, b) => b.length - a.length).map(escape).join('|')})${END}`, 'gu');
    out = out.replace(any, mark);
  }
  return out;
};

/** ISO dates and instants (2026-11-01, 2026-11-01T19:00:00.000Z) and written dates (01/11/2026, 1.11.2026). */
const DATES = /(?<![\d.,\/-])(?:\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?|\d{1,2}[./]\d{1,2}[./](?:\d{4}|\d{2}))(?![\d.,\/-])/g;
const sentinel = (i: number) => { let s = ''; do { s = String.fromCharCode(97 + (i % 26)) + s; i = Math.floor(i / 26) - 1; } while (i >= 0); return s; };
const unsentinel = (s: string) => [...s].reduce((n, c) => (n + 1) * 26 + c.charCodeAt(0) - 97, -1);
/** The passes in order: secrets first, then what holds digits (so a card is not read as an amount), names last. */
export function redactText(input: string, options: RedactOptions = {}): Redacted {
  const found: RedactionCounts = {};
  const count = (kind: RedactionKind, n = 1) => { found[kind] = (found[kind] ?? 0) + n; };
  let text = input.length > REDACT_MAX_CHARS ? input.slice(0, REDACT_MAX_CHARS) : input;
  text = secrets(text, count);
  // Dates and times are not money, phones or account numbers: they stand aside while the digit passes run.
  const kept: string[] = [];
  text = text.replace(DATES, m => { kept.push(m); return `\u0000${sentinel(kept.length - 1)}\u0000`; });
  for (const pass of [emails, wallets, ibans, cards, phones, amounts, accounts]) text = pass(text, count);
  text = text.replace(/\u0000([a-z]+)\u0000/g, (m, id: string) => kept[unsentinel(id)] ?? m);
  for (const pass of [addresses, names(options.knownNames ?? [])]) text = pass(text, count);
  return {text, found};
}
export const totalRedactions = (found: RedactionCounts): number => Object.values(found).reduce((n, v) => n + (v ?? 0), 0);
export function mergeCounts(...all: RedactionCounts[]): RedactionCounts {
  const out: RedactionCounts = {};
  for (const counts of all) for (const [kind, n] of Object.entries(counts) as [RedactionKind, number][]) out[kind] = (out[kind] ?? 0) + n;
  return out;
}
/** "2 names, 1 address and 3 exact amounts (rounded)", in the kinds' own order; "" when nothing was redacted. */
export function redactionSummary(found: RedactionCounts): string {
  const parts = REDACTION_KINDS.filter(k => found[k]).map(k => `${found[k]} ${found[k] === 1 ? singular(k) : REDACTION_LABELS[k]}`);
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}
const SINGULAR: Readonly<Record<RedactionKind, string>> = {secret: 'secret', iban: 'IBAN', card: 'card number', account: 'account number', wallet: 'wallet address', email: 'e-mail address', phone: 'phone number', address: 'address', amount: 'exact amount (rounded)', name: 'name'};
const singular = (k: RedactionKind) => SINGULAR[k];

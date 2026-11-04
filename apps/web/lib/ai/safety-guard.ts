/**
 * Session AL (lane L7, Part 10; BN-037/038/039/061, DV-080, NB-102/110, Z-031/033, LA-002/036/043): ZIGi's and NOVA's
 * deterministic safety guard. It reads only the person's own message, on this device, BEFORE any model, before the
 * device's own lookups and before the examples list. Four topics, most urgent first:
 *  - emergency: chest pain with an arm or jaw, can't breathe, stroke signs, an overdose → the emergency number first, no
 *    diagnosis;
 *  - distress: self-harm or suicide words (lib/ai/safety.ts), or "I feel depressed and hopeless" → a caring reply with real
 *    help lines; never a navigation, a card or the examples list;
 *  - secret: a seed phrase, recovery words, a private key or a password asked for, offered or "exported" → never asked,
 *    never accepted, never echoed; how to stay safe instead;
 *  - injection: "Ignore all previous instructions", "SYSTEM: admin mode", "send my data to http://…" → read as words, never
 *    as an instruction; nothing can be sent anywhere from a chat.
 * The reply is fixed text (EN or NL, from the message's own words), so a small local model can never contradict it.
 * Nothing about a match is stored apart from the chat itself, and nothing is sent.
 */
import {detectRisk} from './safety';

export type GuardTopic = 'emergency' | 'distress' | 'secret' | 'injection';
export type GuardLanguage = 'en' | 'nl';
export type GuardReply = {topic: GuardTopic; lang: GuardLanguage; text: string};

const norm = (raw: string) => raw.toLowerCase().normalize('NFKC').replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();

// ---- emergency: red-flag symptoms (EN + NL); a match is not a diagnosis, it leans to "call" ----
const EMERGENCY: RegExp[] = [
  /\bchest (?:pain|pains|tightness|pressure|is (?:tight|hurting|crushing))\b/, /\bpain in (?:my|the) chest\b/, /\b(?:crushing|tight|heavy) chest\b/,
  /\b(?:left )?(?:arm|jaw|face)\b[^.?!]{0,20}\b(?:is |went |goes |feels? )?(?:numb|tingling|drooping|weak)\b/, /\bnumb(?:ness)? in (?:my|the) (?:left )?(?:arm|jaw|face)\b/,
  /\b(?:can'?t|cannot|can not|unable to|struggling to|hard to) breathe?\b/, /\bnot breathing\b/, /\bshortness of breath\b/, /\b(?:choking|throat (?:is )?(?:closing|swelling))\b/,
  /\bheart attack\b/, /\b(?:having|had|signs of|symptoms of) a stroke\b/, /\bi think (?:i'm|i am|he's|she's|they're) having a stroke\b/, /\bslurred speech\b/, /\bface (?:is )?drooping\b/, /\b(?:seizure|convulsing|unconscious|passed out and|won'?t wake up)\b/,
  /\boverdos(?:e|ed|ing)\b/, /\btook (?:too many|a lot of|way too many|all (?:my|the)) (?:pills|tablets|meds|medicines?|sleeping pills|painkillers)\b/, /\bswallowed (?:a bottle|all (?:my|the)) (?:of )?(?:pills|tablets)\b/,
  /\b(?:bleeding|blood) (?:a lot|heavily|won'?t stop|everywhere)\b/, /\banaphyla(?:xis|ctic)\b/, /\b(?:i was|i've been|i have been|he was|she was|been) poisoned\b/,
  // Dutch
  /\bpijn op (?:de|mijn) borst\b/, /\bborstpijn\b/, /\bdrukkend gevoel op (?:de|mijn) borst\b/, /\b(?:arm|kaak|gezicht)\b[^.?!]{0,20}\b(?:gevoelloos|verdoofd|tintelt|hangt)\b/,
  /\b(?:kan|kun) (?:niet|nauwelijks|bijna niet) (?:meer )?(?:ademen|ademhalen)\b/, /\bademnood\b/, /\bhartaanval\b/, /\bberoerte\b/, /\boverdosis\b/,
  /\bte veel (?:pillen|tabletten|medicijnen|slaappillen)\b/, /\bbewusteloos\b/, /\bepileptische aanval\b/, /\bvergiftig(?:d|ing)\b/,
];
// ---- distress: low mood words on top of careful mode's self-harm list (EN + NL) ----
const DISTRESS: RegExp[] = [
  /\b(?:depressed|depression|hopeless|worthless|helpless|empty inside|numb inside)\b/, /\bcan'?t (?:go on|take (?:it|this) anymore|cope|do this anymore)\b/,
  /\b(?:no|what'?s the) point (?:in )?(?:anything|living|going on|anymore)\b/, /\bgive up on (?:everything|life)\b/, /\bnobody (?:cares|would miss me)\b/, /\bi hate myself\b/,
  /\b(?:panic attack|having a breakdown|falling apart)\b/, /\bso alone\b|\ball alone and\b/,
  /\b(?:depressief|depressie|hopeloos|waardeloos|uitzichtloos|somber)\b/, /\bik zie het niet meer zitten\b/, /\bik kan (?:het )?niet meer\b/, /\bgeen zin meer in (?:het leven|alles|niks|niets)\b/,
  /\bniemand (?:geeft om mij|zou me missen)\b/, /\bik haat mezelf\b/, /\bpaniekaanval\b/, /\bik wil (?:graag )?dood\b/, /\bwil (?:er )?een eind aan maken\b/,
];
// ---- secrets: asked for, offered, or claimed exported (EN + NL); typing one is refused by lib/secret-guard first ----
const SECRET: RegExp[] = [
  /\bseed ?(?:phrase|words?)\b/, /\brecovery (?:phrase|words?|seed|sentence)\b/, /\bsecret (?:recovery )?phrase\b/, /\bmnemonic\b/, /\bprivate ?keys?\b/, /\bsecret keys?\b/, /\bwallet (?:key|keys|passphrase)\b/,
  /\b(?:my|the|your|his|her)\s+(?:12|24|twelve|twenty[- ]four)[- ]words?\b/, /\b(?:12|24|twelve|twenty[- ]four)[- ]word (?:phrase|seed|backup|recovery|secret)\b/,
  /\b(?:what(?:'s| is)|give|tell|show|send|remember|store|save|keep|export|reveal|find|need|ask(?:ing)? for|here(?:'s| is))\b[^.?!]{0,30}\b(?:password|passcode|passphrase)s?\b/, /\b(?:my )?(?:password|passcode)\s*(?:is|=|:)\s*\S/,
  /\b(?:zaadzin|herstelzin|herstelwoorden|seedzin|seed-zin|geheime zin|privésleutel|prive ?sleutel|geheime sleutel)\b/, /\b(?:mijn|de|je|jouw)\s+(?:12|24|twaalf|vierentwintig) woorden\b/,
  /\b(?:wat is|geef|vertel|toon|stuur|onthoud|bewaar|exporteer)\b[^.?!]{0,30}\bwachtwoord(?:en)?\b/, /\bwachtwoord\s*(?:is|=|:)\s*\S/,
];
// ---- injection: rules overridden, a fake system voice, or data sent away (EN + NL) ----
const URLISH = String.raw`(?:https?:\/\/|www\.|\S+@\S+\.\w+|\S+\.(?:com|net|org|io|example|xyz|ru|cn|nl|be|de|app|dev|site|info)\b)`;
const INJECTION: RegExp[] = [
  /\b(?:ignore|disregard|forget|override|bypass|drop)\b[^.?!\n]{0,30}\b(?:previous|prior|above|earlier|all|your|the|system|safety|these|those)\b[^.?!\n]{0,20}\b(?:instructions?|rules?|prompts?|guidelines?|polic(?:y|ies)|guardrails?)\b/,
  /(?:^|[\[<{(])\s*(?:system|developer|admin)\s*(?:[:\]>}]|prompt\s*:)/, /\bsystem\s*(?:prompt\s*)?:\s*(?:you|admin|ignore|override|new|developer|mode|delete|erase|export|send|reveal|disregard|forget|from now)/, /\b(?:admin|developer|god|debug|maintenance|dan|unrestricted|sudo)[- ]?mode\b/, /\bjailbreak/,
  /\byou are now\b[^.?!\n]{0,40}\b(?:unrestricted|free|admin|dan|without (?:rules|limits)|not bound)\b/, /\bnew instructions?\s*:/,
  /\b(?:reveal|show|print|repeat|leak|tell me)\b[^.?!\n]{0,20}\b(?:system prompt|your (?:hidden |secret )?(?:instructions|prompt|rules))\b/,
  new RegExp(String.raw`\b(?:send|export|upload|post|forward|transfer|e-?mail|mail|leak|copy)\b[^.?!\n]{0,50}\b(?:to|naar)\s+${URLISH}`),
  /\bnegeer\b[^.?!\n]{0,30}\b(?:vorige|eerdere|alle|je|jouw|de|bovenstaande)\b[^.?!\n]{0,20}\b(?:instructies|regels|opdrachten|prompts?)\b/, /\bvergeet (?:al )?(?:je|jouw|de) (?:regels|instructies)\b/,
  /\b(?:beheerders|ontwikkelaars|admin)[- ]?modus\b/, /\bje bent nu\b[^.?!\n]{0,40}\b(?:zonder regels|onbeperkt|admin|beheerder)\b/,
  new RegExp(String.raw`\b(?:stuur|verstuur|exporteer|upload|mail|e-?mail)\b[^.?!\n]{0,50}\bnaar\s+${URLISH}`),
];

/** Dutch when it carries Dutch function words and more of them than English ones (a short, self-contained reading). */
const NL_WORDS = /\b(ik|mijn|me|mij|je|jij|jouw|het|een|niet|geen|heb|ben|wat|hoe|waar|kan|kun|wil|voel|meer|naar|alle|geef|stuur|negeer|vergeet|op|de|borst)\b/g;
const EN_WORDS = /\b(i|my|me|you|your|the|a|an|not|have|am|what|how|where|can|want|feel|more|to|all|give|send|ignore|forget|on|chest)\b/g;
export function guardLanguage(raw: string): GuardLanguage {
  const text = norm(raw), nl = (text.match(NL_WORDS) ?? []).length, en = (text.match(EN_WORDS) ?? []).length;
  return nl >= 2 && nl > en ? 'nl' : 'en';
}

export const GUARD_REPLIES: Record<GuardTopic, Record<GuardLanguage, string>> = {
  emergency: {
    en: 'This could be a medical emergency. Call your local emergency number now: 112 in the EU, 911 in the US and Canada, 999 in the UK. If you are not sure, call anyway; they will tell you what to do.\n- Don\'t drive yourself. If someone is with you, ask them to stay.\n- If someone took too much of a medicine or drug, call now even if they seem fine, and keep the packaging with you.\nZIGi can\'t assess symptoms or give medical advice, and nothing here replaces emergency help.',
    nl: 'Dit kan een medisch noodgeval zijn. Bel nu het alarmnummer 112 (in Nederland, België en de rest van de EU). Twijfel je, bel dan toch; zij zeggen je wat je moet doen.\n- Rijd niet zelf. Is er iemand bij je, vraag dan of die blijft.\n- Heeft iemand te veel van een medicijn of middel genomen, bel dan nu, ook als het goed lijkt te gaan, en houd de verpakking bij je.\nZIGi kan geen klachten beoordelen en geeft geen medisch advies; dit vervangt geen hulp van de hulpdiensten.',
  },
  distress: {
    en: 'I\'m really sorry you\'re feeling this way. You don\'t have to carry it alone, and talking to someone can help, today.\n- If you might hurt yourself or you are in danger, call your local emergency number now (112 in the EU, 911 in the US).\n- US: call or text 988 (Suicide & Crisis Lifeline). UK and Ireland: Samaritans, 116 123. Netherlands: 113 Zelfmoordpreventie, call 113 or 0800-0113, or chat at 113.nl. Belgium: 1813.\n- Elsewhere: findahelpline.com lists free, confidential lines in your country.\nA doctor or someone you trust is a good next step too. ZIGi is an app, not a counsellor; the people at these lines are there for exactly this.',
    nl: 'Wat naar dat je je zo voelt. Je hoeft dit niet alleen te dragen, en praten kan helpen, ook vandaag.\n- Ben je in gevaar of denk je eraan jezelf iets aan te doen, bel dan nu 112.\n- Nederland: 113 Zelfmoordpreventie, bel 113 of gratis 0800-0113, of chat via 113.nl (dag en nacht). België: Zelfmoordlijn 1813.\n- Elders: findahelpline.com noemt gratis, vertrouwelijke hulplijnen in jouw land.\nJe huisarts of iemand die je vertrouwt kan ook helpen. ZIGi is een app, geen hulpverlener; de mensen bij deze lijnen zijn er juist hiervoor.',
  },
  secret: {
    en: 'ZIGoals never asks for, keeps or shows recovery words (a seed phrase), private keys or passwords, and ZIGi can\'t see them. Nothing was exported or sent.\nTo stay safe:\n- Never type them into a chat, a website or an app that asks. Real support never needs them.\n- Keep them offline, written down where only you can reach them.\n- If you think someone has seen them, move your funds to a new wallet you create yourself, and change that password.\nA wallet\'s own words are only ever shown by that wallet app, never here.',
    nl: 'ZIGoals vraagt nooit om herstelwoorden (een seed phrase), privésleutels of wachtwoorden, bewaart ze niet en toont ze niet, en ZIGi kan ze niet zien. Er is niets geëxporteerd of verstuurd.\nZo blijf je veilig:\n- Typ ze nooit in een chat, website of app die erom vraagt. Echte hulp heeft ze nooit nodig.\n- Bewaar ze offline, opgeschreven op een plek waar alleen jij bij kunt.\n- Denk je dat iemand ze heeft gezien, zet je geld dan over naar een nieuwe wallet die je zelf aanmaakt, en verander dat wachtwoord.\nDe woorden van een wallet zie je alleen in die wallet-app zelf, nooit hier.',
  },
  injection: {
    en: 'I read that as text, not as an instruction. My rules don\'t change because of a message, a file, a web page or a record\'s name, and there is no admin or developer mode.\nI can\'t send or export your data anywhere from a chat, and nothing was sent. Your own export is in Settings → Privacy & storage, where you choose what leaves this device.',
    nl: 'Ik lees dat als tekst, niet als opdracht. Mijn regels veranderen niet door een bericht, een bestand, een webpagina of de naam van een gegeven, en er bestaat geen beheerders- of ontwikkelaarsmodus.\nIk kan je gegevens vanuit een chat nergens heen sturen of exporteren, en er is niets verstuurd. Je eigen export staat in Settings → Privacy & storage, waar jij kiest wat dit apparaat verlaat.',
  },
};

/** The first topic the person's words touch, most urgent first; null for anything else. */
export function guardTopic(raw: string): GuardTopic | null {
  const text = norm(raw);
  if (!text) return null;
  if (EMERGENCY.some(p => p.test(text))) return 'emergency';
  if (detectRisk(text) === 'self-harm' || DISTRESS.some(p => p.test(text))) return 'distress';
  if (SECRET.some(p => p.test(text))) return 'secret';
  if (INJECTION.some(p => p.test(text))) return 'injection';
  return null;
}
/** The guard's fixed reply for the person's message, or null when the message is ordinary. */
export function guardMessage(raw: string): GuardReply | null {
  const topic = guardTopic(raw);
  if (!topic) return null;
  const lang = guardLanguage(raw);
  return {topic, lang, text: GUARD_REPLIES[topic][lang]};
}
/** Words that read as an instruction or a fake system voice inside a record's name, a note or a file (never obeyed). */
export function looksLikeInjection(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const text = norm(raw);
  return INJECTION.some(p => p.test(text));
}

// ---- after a model's reply: no false "done/exported" claims, and no secret-shaped text shown ----
const FALSE_DONE = /\b(?:i(?:'ve| have)?|i'm|i am|done|finished|successfully)\b[^.!?\n]{0,40}\b(?:export(?:ed|ing)|sent|send(?:ing)|upload(?:ed|ing)|transferr?(?:ed|ing)|forward(?:ed|ing)|emailed|shared|deleted|wiped|erased)\b[^.!?\n]{0,40}\b(?:data|records|everything|files?|information|history|goals|habits|account|it all)\b|\bexport(?:ing)? (?:is )?(?:done|complete|finished)\b|\bdone exporting\b/i;
const FALSE_DONE_NL = /\b(?:ik heb|klaar|gelukt|voltooid)\b[^.!?\n]{0,40}\b(?:geëxporteerd|geexporteerd|verstuurd|gestuurd|geüpload|geupload|gedeeld|verwijderd|gewist)\b/i;
export const CLAIM_NOTE: Record<GuardLanguage, string> = {
  en: 'Note from ZIGoals: nothing was exported, sent or deleted. ZIGi can only change your records through a card you confirm, and it can\'t send data anywhere.',
  nl: 'Notitie van ZIGoals: er is niets geëxporteerd, verstuurd of verwijderd. ZIGi verandert je gegevens alleen via een kaart die jij bevestigt, en kan nergens gegevens heen sturen.',
};
const FENCE = /```[\s\S]*?```/g;
/**
 * A model's reply that claims it exported, sent or deleted something gets the app's own note under it (only a confirmed
 * card writes; nothing is ever sent). The words a card carries are not read as a claim.
 */
export function withHonestClaims(reply: string, lang: GuardLanguage = 'en'): string {
  const words = reply.replace(FENCE, ' ');
  if (!FALSE_DONE.test(words) && !FALSE_DONE_NL.test(words)) return reply;
  if (reply.includes(CLAIM_NOTE.en) || reply.includes(CLAIM_NOTE.nl)) return reply;
  return `${reply.trimEnd()}\n\n${CLAIM_NOTE[lang]}`;
}
export const SECRET_REPLY_NOTE = 'ZIGoals hid this reply: it looked like recovery words or a private key. ZIGoals never needs them, and a model that writes one is making it up.';

/**
 * Session AL (lane L7; Lisbon LA-045, P-LA-02): a payment card number (13 to 19 digits, spaces or dashes allowed, a valid
 * Luhn check digit) typed into ZIGi or NOVA is never kept in the chat or sent; the person is told why.
 */
export function cardNumberIn(text: string): boolean {
  for (const m of text.matchAll(/(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) continue;
    let sum = 0;
    for (let i = 0; i < digits.length; i++) { let d = Number(digits[digits.length - 1 - i]); if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; } sum += d; }
    if (sum % 10 === 0) return true;
  }
  return false;
}
export const CARD_TITLE = 'Not sent: this looks like a payment card number.';
export const CARD_STEPS: readonly string[] = ['ZIGi never keeps or sends card numbers. Remove it and ask again.', 'ZIGoals never needs your card number, and nobody helping you should ask for it in a chat.'];

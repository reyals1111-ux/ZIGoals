/**
 * Careful mode (Session V Part 11, docs/product/ZIGI_VOICE_AND_SAFETY.md). A few health topics where numbers, plans and
 * targets can hurt: self-harm, eating-disorder signals, very low intake, rapid weight loss and extreme fasting. ZIGi
 * notices them in the person's own words, on the device (never in their records, never sent anywhere), then:
 *  - shows a short supportive note made on the device, under the message;
 *  - adds the careful-mode note to what goes to the person's AI with that message: warm and brief, no numbers, targets
 *    or plans, a doctor, a registered dietitian or someone they trust named, emergency services for any risk to life.
 * The checks are deliberately simple and lean towards care; a match is not a diagnosis and nothing is stored about it.
 * HE6's fasting note (ZIGoals' own) stays as it is; ZIGi's own fasting cards stay within 12 to 18 hours.
 */
export type RiskTopic = 'self-harm' | 'eating-disorder' | 'very-low-intake' | 'rapid-weight-loss' | 'extreme-fasting';
export const RISK_TOPICS: readonly RiskTopic[] = ['self-harm', 'eating-disorder', 'very-low-intake', 'rapid-weight-loss', 'extreme-fasting'];

const SELF_HARM = [
  /\b(kill|hurt|harm|cut|injure)(ing)? myself\b/, /\bend (it all|my life|things)\b/, /\bsuicid(e|al)\b/, /\bself[- ]?harm/, /\b(want|wanting|wish) to die\b/,
  /\bdon'?t want to (live|be alive|be here)\b/, /\bwish i (was|were) dead\b/, /\bno reason to live\b/, /\bbetter off (dead|without me)\b/,
  // Session AL fourth pass (L7-4a; LA-002): the -ing and past forms ("I feel like ending it all").
  /\b(ending|ended) (it all|my life)\b/, /\b(take|taking) my (own )?life\b/,
  /\bmezelf (iets aan(doen| te doen)|van kant maken|ombrengen)\b/, /\ber een eind(e)? aan (maken|willen maken)\b/, /\buit het leven stappen\b/,
  // Session AL fifth pass (L7-5a; LA-002, #270/271, N102/Z102, C-DV-20): the Dutch forms the replay found uncaught, as
  // robust as the English ones above. "Ik wil mezelf pijn doen", "…om er een eind aan te maken", "…en wil er niet meer
  // zijn". "Ik heb mezelf pijn gedaan bij het sporten" (an accident, told afterwards) and "ik wil er niet meer over praten"
  // stay ordinary.
  /\b(mezelf|mijzelf) (expres |opzettelijk |weer |echt )?(pijn (doen|te doen|doe)|snijden|te snijden|verwonden|te verwonden|beschadigen|te beschadigen|krassen|iets aan(doen| te doen| doen))\b/,
  /\bik (doe|deed) (mezelf|mijzelf) ([a-z]+ ){0,2}pijn\b(?! (bij|met|tijdens) )/, /\bik (snij|snijd|sneed|kras|beschadig|verwond) (mezelf|mijzelf)\b/, /\bzelfbeschadiging\b|\bautomutilatie\b/,
  /\ber (maar |gewoon |liever |zelf )?een eind(e)? aan (te )?(maken|willen maken)\b/, /\been eind(e)? (te )?(maken )?aan mijn (eigen )?leven\b/, /\bmijn (eigen )?leven (te )?be[eë]indigen\b/,
  /\b(wil|wilde|zou) (er |hier )?(gewoon |echt |liever |eigenlijk )?niet meer (willen )?(zijn|leven|bestaan)\b(?! (zoals|als|wie|die|dan|zo|met|bij|in|op)\b)/, /\bhet hoeft (voor mij|van mij) niet meer\b/, /\b(ik ben|was ik|ik was|ik zou) liever dood\b/,
  /\bbeter af zonder mij\b|\bbeter zonder mij af\b/, /\bnooit meer wakker (te )?worden\b/, /\bsu[iï]ci(de|daal|dale)\b/, /\bmezelf (ophangen|op te hangen|doodmaken|dood maken|te doden|doden|verdrinken)\b/, /\bvoor (de|een) trein (springen|te springen|spring)\b/,
  // The English forms the same review found missing.
  /\b(hang|hanging|drown|drowning) myself\b/, /\b(shoot|shooting) myself (in the head|dead)\b/, /\bjump(ing)? (off|in front of) (a|the) (bridge|train|building|roof|car)\b/, /\bdon'?t want to (exist|wake up) (anymore|any more|again)\b/,
  // Security delta A (SA-5, 8 Nov): "i wanna die", and "kms" only after a verb that wants it ("I'm gonna kms"); "I ran 5 kms"
  // and "I'm gonna die laughing" stay ordinary.
  /\bi (just |really |kinda |honestly |seriously )?(wanna|want ta) die\b/, /\b(wanna|want to|gonna|going to|about to|might|will|should) kms\b/,
  /\bzelfmoord\b/, /\bdood willen\b/, /\bme suicider\b/, /\benvie de mourir\b/, /\bselbstmord\b/, /\bmich umbringen\b/, /\bsterben wollen\b/, /\bnicht mehr leben\b/, /\bniet meer leven\b/, /\bplus envie de vivre\b/,
];
const EATING_DISORDER = [
  /\banorexi[ac]?\b/, /\bbulimi[ac]?\b/, /\bpurg(e|ed|es|ing)\b/, /\b(throw|throwing|threw) up after (eating|meals?|food|dinner|lunch|breakfast)\b/,
  /\bmake myself (sick|throw up|vomit)\b/, /\bmaking myself (sick|throw up|vomit)\b/, /\bbinge and purge\b/, /\bstarv(e|ing) myself\b/,
  /\blaxatives? to (lose|drop)\b/, /\bpro[- ]?ana\b/, /\beating disorder\b/, /\beetstoornis\b/, /\btrouble(s)? (du comportement )?alimentaire/, /\bessst(ö|oe)rung\b/,
  // Session AL fourth pass (L7-4a; ZP-24, NP-18, N-MO-05): more forms, EN and NL.
  /\b(vomit|vomiting|vomited|be sick|being sick) after (eating|meals?|food|dinner|lunch|breakfast)\b/, /\bthrow(ing)? up (what|everything) i eat\b/,
  /\b(mezelf|me) (laten )?(overgeven|braken|uithongeren)\b/, /\b(overgeven|braken|kotsen) na (het )?(eten|maaltijden?|avondeten)\b/, /\buithongeren\b/, /\blaxeermiddel(en)? (om|voor) (af te vallen|gewicht)\b/,
];
const KCAL = '(?:k?cal(?:ories|orieën|orieen)?|kcals?)';
/** "I eat 600 kcal a day", "500 kcal/day" (Session AL, MO-053), "keep it under 700 calories", "only 500 calories today": a day under 800 kcal. */
function veryLowIntake(text: string): boolean {
  const patterns = [new RegExp(`\\b(\\d{2,4})\\s*${KCAL}\\b[^.?!]{0,30}\\b(a|per|each|every)\\s+day\\b`), new RegExp(`\\b(\\d{2,4})\\s*${KCAL}\\s*(?:(?:a|per)\\s*day\\b|\\/\\s*(?:day|d)\\b|daily\\b|per dag\\b|een dag\\b|p\\.?d\\.?\\b)`),
    new RegExp(`\\b(?:under|below|less than|max(?:imum)?|only|just|limit(?:ing)? (?:myself )?to|stay under|keep (?:it|myself) under|maar|slechts|hooguit|maximaal|minder dan|onder)\\s+(?:(?:eat|eating|ate|have|having|had|eten)\\s+)?(\\d{2,4})\\s*${KCAL}`)];
  return patterns.some(p => { const m = p.exec(text); return !!m && Number(m[1]) > 0 && Number(m[1]) < 800; });
}
const WORD_NUMBERS: Record<string, number> = {a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, een: 1, 'één': 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, tien: 10};
const amount = (v: string) => WORD_NUMBERS[v] ?? Number(v.replace(',', '.'));
/** "lose 10 kg in 2 weeks", "drop 15 pounds in a week": more than about 1 kg (2 lb) a week. */
function rapidWeightLoss(text: string): boolean {
  // Session X-Local Part 6b: "this week", "per week", "a week", "every week" are a one-week span too.
  const m = /\b(?:lose|losing|drop|dropping|shed|shedding|cut)\s+(\d+(?:[.,]\d+)?|a|one|two|three|four|five|six|seven|ten)\s*(kg|kgs|kilos?|kilograms?|lbs?|pounds?|stone)\s+(?:(?:in|within|by)\s+(?:(\d+|a|an|one|two|three|four|five|six|seven|ten)\s+)?(days?|weeks?|months?)|(?:this|per|a|every|each)\s+(week|day|month))\b/.exec(text);
  if (!m) return rapidWeightLossNl(text);
  const lost = amount(m[1]!), unit = m[2]!, count = m[3] ? amount(m[3]) : 1, span = m[4] ?? m[5]!;
  const kg = unit.startsWith('lb') || unit.startsWith('pound') ? lost * 0.4536 : unit === 'stone' ? lost * 6.35 : lost;
  const weeks = span.startsWith('day') ? count / 7 : span.startsWith('month') ? count * 4.35 : count;
  return weeks > 0 && kg / weeks > 1;
}
/** Session AL fourth pass (L7-4a): "10 kilo afvallen in 1 week", "in een week 5 kg kwijt": more than about 1 kg a week, in Dutch. */
const NL_NUM = '(\\d+(?:[.,]\\d+)?|een|één|twee|drie|vier|vijf|zes|zeven|tien)';
function rapidWeightLossNl(text: string): boolean {
  const after = new RegExp(`\\b${NL_NUM}\\s*(?:kg|kilo'?s?)\\s+(?:afvallen|afgevallen|verliezen|kwijtraken|kwijt raken|kwijt|lichter)\\s+(?:in|binnen)\\s+(?:${NL_NUM}\\s+)?(dag|dagen|week|weken|maand|maanden)\\b`).exec(text);
  const before = after ? null : new RegExp(`\\b(?:in|binnen)\\s+(?:${NL_NUM}\\s+)?(dag|dagen|week|weken|maand|maanden)\\s+(?:tijd\\s+)?${NL_NUM}\\s*(?:kg|kilo'?s?)\\s+(?:afvallen|verliezen|kwijtraken|kwijt|lichter)\\b`).exec(text);
  const parts = after ? {lost: after[1]!, count: after[2], span: after[3]!} : before ? {lost: before[3]!, count: before[1], span: before[2]!} : null;
  if (!parts) return false;
  const kg = amount(parts.lost), count = parts.count ? amount(parts.count) : 1;
  const weeks = parts.span.startsWith('dag') ? count / 7 : parts.span.startsWith('maand') ? count * 4.35 : count;
  return weeks > 0 && kg / weeks > 1;
}
/** "I haven't eaten in 3 days", "no food for days", "al 3 dagen niet gegeten": two days or more without food (Session AL fourth pass, LA-036). */
function daysWithoutFood(text: string): boolean {
  const en = /\b(?:haven'?t|have not|hasn'?t|has not|didn'?t|did not|not|barely)\s+(?:eaten|eat|had (?:any )?food|had anything to eat|eaten anything)(?:\s+anything)?\s+(?:in|for)\s+(?:(?:over|more than|almost|nearly|about)\s+)?(?:(\d+|two|three|four|five|six|seven|ten|a few|several|many)\s+(days?|weeks?)|(days|a week|weeks))\b/.exec(text)
    ?? /\b(?:eaten|had|eat|ate)\s+nothing\s+(?:in|for)\s+(?:(\d+|two|three|four|five|six|seven|ten|a few|several|many)\s+(days?|weeks?)|(days|a week|weeks))\b/.exec(text);
  if (en) return !!en[3] || /^(?:a few|several|many)$/.test(en[1]!) || en[2]!.startsWith('week') || amount(en[1]!) >= 2;
  const nl = /\b(?:al\s+)?(\d+|twee|drie|vier|vijf|zes|zeven|tien|een paar|een week|dagen)\s*(dagen|dag|weken|week)?\s+(?:niet|niks|niets)\s+(?:meer\s+)?gegeten\b/.exec(text)
    ?? /\b(?:niet|niks|niets)\s+(?:meer\s+)?gegeten\s+(?:in|sinds|voor)\s+(\d+|twee|drie|vier|vijf|zes|zeven|tien|een paar)\s+(dagen|weken)\b/.exec(text);
  if (!nl) return false;
  if (/^(?:een paar|een week|dagen)$/.test(nl[1]!)) return true;
  return !!nl[2] && (nl[2].startsWith('we') || amount(nl[1]!) >= 2);
}
/** Fasting for 48 hours or more, several days without food, or a dry fast. */
function extremeFasting(text: string): boolean {
  const days = /\b(\d+|two|three|four|five|six|seven|ten)[- ]?(?:days?|day long)\s+(?:water\s+|juice\s+|dry\s+)?fast(?:ing)?\b/.exec(text) ?? /\bfast(?:ing)?\s+for\s+(\d+|two|three|four|five|six|seven|ten)\s+days?\b/.exec(text);
  if (days && amount(days[1]!) >= 2) return true;
  const hours = /\b(\d{2,3})[- ]?(?:h|hr|hrs|hours?)\s+(?:water\s+|dry\s+)?fast(?:ing)?\b/.exec(text) ?? /\bfast(?:ing)?\s+for\s+(\d{2,3})\s*(?:h|hr|hrs|hours?)\b/.exec(text);
  if (hours && Number(hours[1]) >= 48) return true;
  const without = /\b(?:not eat(?:ing)?|no food|without (?:eating|food))\s+for\s+(\d+|two|three|four|five|six|seven|ten|a week)\s*(days?|weeks?)?\b/.exec(text);
  if (without && (without[1] === 'a week' || amount(without[1]!) >= 2 || without[2]?.startsWith('week'))) return true;
  if (daysWithoutFood(text)) return true;
  const nlDays = /\b(\d+|twee|drie|vier|vijf|zes|zeven|tien)[- ]?(?:daagse|dagen)\s+(?:water)?vast(?:en|kuur)\b/.exec(text);
  if (nlDays && amount(nlDays[1]!) >= 2) return true;
  return /\bdry fast(?:ing)?\b|\bdroog vasten\b/.test(text);
}
/** The first topic the words touch, most serious first; null for anything else. */
export function detectRisk(raw: string): RiskTopic | null {
  const text = raw.toLowerCase().replace(/[’‘ʼ`´]/g, "'").replace(/\s+/g, ' ');
  if (SELF_HARM.some(p => p.test(text))) return 'self-harm';
  if (EATING_DISORDER.some(p => p.test(text))) return 'eating-disorder';
  if (veryLowIntake(text)) return 'very-low-intake';
  if (rapidWeightLoss(text)) return 'rapid-weight-loss';
  if (extremeFasting(text)) return 'extreme-fasting';
  return null;
}
/** The supportive note ZIGi shows on the device. Calm, no numbers, no exclamation mark, never a judgement. */
export const CARE_NOTES: Record<RiskTopic, string> = {
  'self-harm': 'It sounds like things are very hard right now, and you deserve support. Please reach out to someone you trust, or to a crisis line in your country. If you might act on these thoughts, contact your local emergency number now.',
  'eating-disorder': 'Thank you for saying this. Worries about eating and your body are heavy to carry alone. A doctor, a registered dietitian or someone you trust can help, and many countries have an eating-disorder helpline. ZIGi will not suggest numbers or targets here.',
  'very-low-intake': 'Eating that little is a big strain on your body. ZIGi does not give targets or plans for this; a doctor or a registered dietitian can help you find a safe way to reach your goal.',
  'rapid-weight-loss': 'Losing weight that fast can be hard on your body. ZIGi does not give targets or plans for this; a doctor or a registered dietitian can help you set a pace that is safe for you.',
  'extreme-fasting': 'Long fasts can be risky. ZIGi does not plan fasts beyond what the app offers; please talk to a doctor before a fast like this, and stop if you feel unwell.',
};
/** The label above the note, so it never reads as an answer from the person's AI. */
export const CARE_LABEL = 'A note from ZIGi, made on this device';
const TOPIC_WORDS: Record<RiskTopic, string> = {
  'self-harm': 'thoughts of self-harm or of not wanting to live', 'eating-disorder': 'possible eating-disorder signals', 'very-low-intake': 'a very low food intake',
  'rapid-weight-loss': 'very fast weight loss', 'extreme-fasting': 'a long or extreme fast',
};
/** What goes with the message to the person's AI in careful mode (added to the system prompt for that one message). */
export function carefulNote(topic: RiskTopic): string {
  return [`Careful mode: the person's message touches ${TOPIC_WORDS[topic]}. Reply warmly and briefly, in plain words.`,
    'Give no numbers, targets, calorie or weight figures, meal or fasting plans, or exercise prescriptions, and propose no cards that set or log a restriction. Do not diagnose and do not judge.',
    'Encourage talking with a doctor, a registered dietitian or someone they trust.',
    topic === 'self-harm' ? 'Take any risk to their life seriously: encourage them to contact their local emergency number or a crisis line now, and to reach out to someone they trust. Stay kind and present.' : 'If anything suggests a risk to their life, encourage them to contact their local emergency number now.'].join(' ');
}

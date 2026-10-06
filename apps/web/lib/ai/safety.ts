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
  /\bzelfmoord\b/, /\bdood willen\b/, /\bme suicider\b/, /\benvie de mourir\b/, /\bselbstmord\b/, /\bmich umbringen\b/, /\bsterben wollen\b/,
];
const EATING_DISORDER = [
  /\banorexi[ac]?\b/, /\bbulimi[ac]?\b/, /\bpurg(e|ed|es|ing)\b/, /\b(throw|throwing|threw) up after (eating|meals?|food|dinner|lunch|breakfast)\b/,
  /\bmake myself (sick|throw up|vomit)\b/, /\bmaking myself (sick|throw up|vomit)\b/, /\bbinge and purge\b/, /\bstarv(e|ing) myself\b/,
  /\blaxatives? to (lose|drop)\b/, /\bpro[- ]?ana\b/, /\beating disorder\b/, /\beetstoornis\b/, /\btrouble(s)? (du comportement )?alimentaire/, /\bessst(ö|oe)rung\b/,
];
const KCAL = '(?:k?cal(?:ories)?|kcals?)';
/** "I eat 600 kcal a day", "keep it under 700 calories", "only 500 calories today": a day under 800 kcal. */
function veryLowIntake(text: string): boolean {
  const patterns = [new RegExp(`\\b(\\d{2,4})\\s*${KCAL}\\b[^.?!]{0,30}\\b(a|per|each|every)\\s+day\\b`), new RegExp(`\\b(\\d{2,4})\\s*${KCAL}\\s*(a|per)\\s*day\\b`),
    new RegExp(`\\b(?:under|below|less than|max(?:imum)?|only|just|limit(?:ing)? (?:myself )?to|stay under|keep (?:it|myself) under)\\s+(?:(?:eat|eating|ate|have|having|had)\\s+)?(\\d{2,4})\\s*${KCAL}`)];
  return patterns.some(p => { const m = p.exec(text); return !!m && Number(m[1]) > 0 && Number(m[1]) < 800; });
}
const WORD_NUMBERS: Record<string, number> = {a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10};
const amount = (v: string) => WORD_NUMBERS[v] ?? Number(v.replace(',', '.'));
/** "lose 10 kg in 2 weeks", "drop 15 pounds in a week": more than about 1 kg (2 lb) a week. */
function rapidWeightLoss(text: string): boolean {
  const m = /\b(?:lose|losing|drop|dropping|shed|shedding|cut)\s+(\d+(?:[.,]\d+)?|a|one|two|three|four|five|six|seven|ten)\s*(kg|kgs|kilos?|kilograms?|lbs?|pounds?|stone)\s+(?:in|within|by)\s+(?:(\d+|a|an|one|two|three|four|five|six|seven|ten)\s+)?(days?|weeks?|months?)\b/.exec(text);
  if (!m) return false;
  const lost = amount(m[1]!), unit = m[2]!, count = m[3] ? amount(m[3]) : 1, span = m[4]!;
  const kg = unit.startsWith('lb') || unit.startsWith('pound') ? lost * 0.4536 : unit === 'stone' ? lost * 6.35 : lost;
  const weeks = span.startsWith('day') ? count / 7 : span.startsWith('month') ? count * 4.35 : count;
  return weeks > 0 && kg / weeks > 1;
}
/** Fasting for 48 hours or more, several days without food, or a dry fast. */
function extremeFasting(text: string): boolean {
  const days = /\b(\d+|two|three|four|five|six|seven|ten)[- ]?(?:days?|day long)\s+(?:water\s+|juice\s+|dry\s+)?fast(?:ing)?\b/.exec(text) ?? /\bfast(?:ing)?\s+for\s+(\d+|two|three|four|five|six|seven|ten)\s+days?\b/.exec(text);
  if (days && amount(days[1]!) >= 2) return true;
  const hours = /\b(\d{2,3})[- ]?(?:h|hr|hrs|hours?)\s+(?:water\s+|dry\s+)?fast(?:ing)?\b/.exec(text) ?? /\bfast(?:ing)?\s+for\s+(\d{2,3})\s*(?:h|hr|hrs|hours?)\b/.exec(text);
  if (hours && Number(hours[1]) >= 48) return true;
  const without = /\b(?:not eat(?:ing)?|no food|without (?:eating|food))\s+for\s+(\d+|two|three|four|five|six|seven|ten|a week)\s*(days?|weeks?)?\b/.exec(text);
  if (without && (without[1] === 'a week' || amount(without[1]!) >= 2 || without[2]?.startsWith('week'))) return true;
  return /\bdry fast(?:ing)?\b/.test(text);
}
/** The first topic the words touch, most serious first; null for anything else. */
export function detectRisk(raw: string): RiskTopic | null {
  const text = raw.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ');
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

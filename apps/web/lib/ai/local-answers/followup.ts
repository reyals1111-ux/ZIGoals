/**
 * Session AI (G4; Grok's BUG-055): a follow-up the device can answer without an AI. "How much water did I drink
 * yesterday?" then "And the day before?" (or "en vorige week?") is the same question for another time: the time words of
 * the previous question are swapped for the new ones, and the device answers that. Only a bare time follow-up is
 * rewritten; anything else stays as typed (with an AI connected the AI has the whole conversation anyway).
 */
const TIME = String.raw`(?:the day before(?: yesterday)?|yesterday|today|this morning|tonight|last night|last week|this week|last month|this month|last year|this year|eergisteren|gisteren|vandaag|vanochtend|vanavond|vannacht|vorige week|deze week|vorige maand|deze maand|vorig jaar|dit jaar)`;
const FOLLOW = new RegExp(String.raw`^(?:and|what about|how about|and what about|en|en wat (?:met|van)|hoe zit het met|wat met)?\s*(?:for\s+|voor\s+)?(${TIME})\s*[?.!]*$`, 'i');
const TIME_IN = new RegExp(String.raw`\b${TIME}\b`, 'i');
const SAME: Record<string, string> = {'the day before': 'the day before yesterday'};
export function followUpQuestion(question: string, previous: string | null): string | null {
  const m = FOLLOW.exec(question.trim());
  if (!m || !previous) return null;
  const when = SAME[m[1]!.toLowerCase()] ?? m[1]!;
  const prev = previous.trim();
  if (!prev || FOLLOW.test(prev)) return null;
  return TIME_IN.test(prev) ? prev.replace(TIME_IN, when) : `${prev.replace(/[?.!]+$/, '')} ${when}?`;
}

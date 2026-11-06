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
/**
 * Session AL second pass (TK-078, P-TK-33, P-LA-18): "and in USD?", "and BTC?", "what about ETH?" after a question about a
 * coin or a currency is that question for the new one: the coin or currency named before is swapped, or the new one is
 * added ("… in USD?"). Only tickers and USD/EUR count, so "and Read?" stays as typed.
 */
const COIN = String.raw`(?:BTC|ETH|SOL|ZIG|USDC|USDT|ATOM|OSMO|DOT|ADA|XRP|BNB|DOGE|AVAX|LINK|MATIC|TIA|INJ)`, MONEY = String.raw`(?:USD|EUR|dollars?|euros?)`;
const FOLLOW_ASSET = new RegExp(String.raw`^(?:and|what about|how about|and what about|en|en wat met)\s+(?:in\s+|for\s+|voor\s+)?(${COIN}|${MONEY})\s*[?.!]*$`, 'i');
const COIN_IN = new RegExp(String.raw`\b${COIN}\b`, 'i'), MONEY_IN = new RegExp(String.raw`\b${MONEY}\b`, 'i');
function assetFollowUp(question: string, prev: string): string | null {
  const m = FOLLOW_ASSET.exec(question.trim()); if (!m) return null;
  const said = m[1]!, money = new RegExp(String.raw`^${MONEY}$`, 'i').test(said), code = money ? (/^(?:usd|dollars?)$/i.test(said) ? 'USD' : 'EUR') : said.toUpperCase();
  if (money) return MONEY_IN.test(prev) ? prev.replace(MONEY_IN, code) : COIN_IN.test(prev) ? `${prev.replace(/[?.!]+$/, '')} in ${code}?` : null;
  return COIN_IN.test(prev) ? prev.replace(COIN_IN, code) : null;
}
export function followUpQuestion(question: string, previous: string | null): string | null {
  if (previous && !FOLLOW_ASSET.test(previous.trim())) { const asset = assetFollowUp(question, previous.trim()); if (asset) return asset; }
  const m = FOLLOW.exec(question.trim());
  if (!m || !previous) return null;
  const when = SAME[m[1]!.toLowerCase()] ?? m[1]!;
  const prev = previous.trim();
  if (!prev || FOLLOW.test(prev)) return null;
  return TIME_IN.test(prev) ? prev.replace(TIME_IN, when) : `${prev.replace(/[?.!]+$/, '')} ${when}?`;
}

/**
 * Session AL fourth pass (lane L7-4b; Tokyo TK #14–#16, TK:Z12, C-TK-35): the question a follow-up refers to is the last one
 * that was not itself a bare follow-up, so "How much ETH do I have?", "and in EUR?", "and BTC?" asks about BTC.
 */
export const isBareFollowUp = (text: string) => FOLLOW.test(text.trim()) || FOLLOW_ASSET.test(text.trim()) || /^(?:and|what about|how about)\s+(?:the\s+)?(?:first|second|third|last|for\s+\S.*)\s*\??$/i.test(text.trim());
export function previousQuestion(asked: readonly string[]): string | null {
  return asked.find(t => !isBareFollowUp(t)) ?? asked[0] ?? null;
}

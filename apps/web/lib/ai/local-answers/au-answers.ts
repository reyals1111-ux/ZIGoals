import {currentDayEnds, dayUnder} from '../../day-boundary-core';
import {localWeekday} from '../../local-date';
import {formatDate} from '../../visual-format';
import {stakeEarnAnswer, stakeSafeAnswer} from '../earn/coach';
import type {ToolEnv} from '../tools/env';
import {priceAnswer} from './ai-session';
import type {LocalReply} from './engine';
import {nlDate, weekdayName} from './exact/period';

/**
 * Session AU (dress rehearsal, docs/review/session-au/REHEARSAL.md): questions five fresh personas asked that are not a
 * lookup of one part of their records, answered on the device before the exact layer could read their words as one:
 * - R-4 "What day is it?": today by the person's own day boundary ("My day ends at", lib/day-boundary.ts): at 01:30 for a
 *   night owl whose day ends at 03:00 it is still the day before, and the answer says why.
 * - R-7 "What is bitcoin worth today?": a coin's price, not the person's net worth or holdings: the last price the app has
 *   read, with its source and time (ai-session.ts `priceAnswer`), or plainly none, with Markets to open. Never a price of its own.
 * - R-8 "What would I earn if I staked 100 ZIG?" and R-10 "Is staking ZIG safe?": the Earn coach's facts (lib/ai/earn/coach.ts),
 *   an estimate only from Earn's measured rate with its source, never advice.
 * Each pattern reads the whole question, so nothing else is claimed.
 */
const LEAD = String.raw`^(?:(?:hey|hi|ok|okay|so|nova|zigi|hoi|hé|dus|en),?\s+)*`;
const DATE_ASK = new RegExp(`${LEAD}(?:what(?:'s|s| is)? (?:the )?(?:day|date)(?: is it| is today| today)?(?: today)?|what day is (?:it|today)(?: today)?|which day is (?:it|today)|what(?:'s|s| is) today(?:'s date|s date)?|what(?:'s|s| is) (?:the )?date(?: today)?|today'?s date|(?:what|which) day of the week is (?:it|today)|welke dag is het(?: vandaag)?|welke datum is het(?: vandaag)?|wat is (?:de datum|het vandaag|vandaag)(?: vandaag)?|wat voor dag is het(?: vandaag)?|de hoeveelste is het(?: vandaag)?|welke dag hebben we(?: vandaag)?)\\s*[?.!]*$`, 'i');
/** "Worth" is read as net worth by the exact layer; "price", "koers" keep the older price answer (ai-session.ts) as they were. */
const PRICE_WORDS = /\b(?:worth|cost|costs|waard|kost)\b/i;
/** "Is it worth buying ETH": a question for advice, which the guard's no-advice line answers. */
const ADVICE = /\b(?:buy|buying|sell|selling|should|invest\w*|a buy|good time|kopen|verkopen|moet ik|zou ik|beleggen)\b/i;
const COIN = /\b(BTC|ETH|ZIG|USDC|USDT|SOL|ATOM|bitcoin|ether(?:eum)?|solana|zignaly)\b/i;
/** "What is my bitcoin worth", "how much is the BTC I hold": the person's own holdings, which their own answers keep. */
const OWN = /\b(?:my|mine|i (?:have|hold|own)|do i|i've|ive|mijn|heb ik|bezit ik|ik heb|houd ik)\b/i;
const isDutch = (q: string) => /\b(?:welke|wat|is het|hoeveel|vandaag|waard|kost|prijs|koers|dag|datum|hebben we|hoeveelste)\b/i.test(q) && !/\b(?:what|which|how|is it|today|worth|price|the)\b/i.test(q);
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function dateAnswer(question: string, env: ToolEnv): LocalReply | null {
  const q = question.trim().replace(/[’`]/g, '\'').replace(/\s+/g, ' ');
  if (!q || q.length > 80 || !DATE_ASK.test(q)) return null;
  const nl = isDutch(q), day = env.habitDay, ends = currentDayEnds().endsAt;
  let calendar = day;
  try { calendar = dayUnder(0, env.now, env.habitZone || null); } catch { calendar = day; }
  const written = formatDate(day, {year: false}), weekday = weekdayName(localWeekday(day), nl ? 'nl' : 'en');
  if (calendar !== day && ends > 0) {
    const now = weekdayName(localWeekday(calendar), nl ? 'nl' : 'en');
    return {kind: 'answer', text: nl ? `Voor jou is het ${weekday} ${nlDate(day, day)}: je dag eindigt om ${clock(ends)} (de kalender zegt al ${now}).` : `It's ${weekday}, ${written} for you: your day ends at ${clock(ends)} (the calendar already says ${now}).`, calls: []};
  }
  return {kind: 'answer', text: nl ? `Het is ${weekday} ${nlDate(day, day)}.` : `It's ${weekday}, ${written}.`, calls: []};
}
export function coinPriceAnswer(question: string, env: ToolEnv): LocalReply | null {
  const q = question.trim().replace(/\s+/g, ' ');
  if (!q || q.length > 120 || !PRICE_WORDS.test(q) || OWN.test(q) || ADVICE.test(q)) return null;
  const coin = COIN.exec(q)?.[1];
  if (!coin) return null;
  const asset = /^solana$/i.test(coin) ? 'SOL' : /^zignaly$/i.test(coin) ? 'ZIG' : coin;
  return priceAnswer(isDutch(q) ? 'nl' : 'en', asset, env, q);
}
export function stakeAnswer(question: string, env: ToolEnv): LocalReply | null {
  const r = stakeEarnAnswer(question, env.earn) ?? stakeSafeAnswer(question, env.earn);
  return r ? {kind: r.kind, text: r.text, calls: /\(source: |\(bron: /.test(r.text) ? [{tool: 'earn_rates', args: {}, label: 'Earn figures'}] : []} : null;
}
/** The rehearsal's own answers, or null: every other question goes on to the exact layer and the layers below, as before. */
export function rehearsalAnswer(question: string, env: ToolEnv): LocalReply | null {
  try { return dateAnswer(question, env) ?? stakeAnswer(question, env) ?? coinPriceAnswer(question, env); } catch { return null; }
}

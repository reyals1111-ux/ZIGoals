import {formatNumber} from '../../../visual-format';
import {levelName} from '../../../game/levels';
import {xpSummary} from '../../../game/xp';
import type {ToolEnv} from '../../tools/env';
import {listWords, t} from './text';
import type {Lang} from './types';

/**
 * Session AT (L7 NB:N11): "what level am I", "how much XP do I have", answered as Journey counts it. XP is never stored:
 * it is derived from the person's own records (lib/game/xp.ts `xpSummary`, the function Journey itself runs), so the
 * reply reads the same records the page reads and nothing else. It answers only when every record Journey counts is
 * open to this reply: habits, Health's logs (water, weight, sleep, meditation, activity and food; never a mood or a
 * symptom, which earn nothing), goals and the weekly review. With one of them closed the level is said to be unknown
 * here, never a smaller figure. The game layer off: there is no level, as on Journey. The Showcase's figures say so.
 */
export type JourneyFacts =
  | {state: 'off'} | {state: 'unknown'}
  | {state: 'closed'; closed: string[]}
  | {state: 'counted'; level: number; name: string; xp: number; into: number; span: number; thisWeek: number; lastWeek: number; today: number};
export function journeyFacts(env: ToolEnv): JourneyFacts {
  const game = env.game;
  if (!game) return {state: 'unknown'};
  if (!game.enabled) return {state: 'off'};
  const closed = [env.areas.habits === false && 'Habits', !env.health && 'Health', env.areas.goals === false && 'Goals', env.areas.today === false && 'Today'].filter((a): a is string => !!a);
  if (closed.length || !env.health) return {state: 'closed', closed};
  const xp = xpSummary({habits: env.habits, health: env.health, platform: env.platform, weekly: env.weekly, earnAcademy: game.earnAcademy, habitExtras: env.ak?.habitExtras ?? null, rebirthFrom: game.rebirthFrom ?? null}, env.habitDay);
  return {state: 'counted', level: xp.level.level, name: xp.level.name, xp: xp.total, into: xp.level.into, span: xp.level.span, thisWeek: xp.thisWeek, lastWeek: xp.lastWeek, today: xp.today};
}
const n = (v: number) => formatNumber(v); // Session AV lane 2 (fr-answers; FR-TJ-4): the answer's number locale
export function journeyAnswer(env: ToolEnv, lang: Lang): {text: string; facts: JourneyFacts} {
  const facts = journeyFacts(env);
  if (facts.state === 'unknown') return {facts, text: t(lang, 'Journey’s switch can’t be read here, so your level is unknown here (not zero); Journey shows it.', 'De schakelaar van Journey is hier niet te lezen, dus je level is hier onbekend (niet nul); Journey toont het.')};
  if (facts.state === 'off') return {facts, text: t(lang, 'The game layer is off on this device, so there is no level or XP: Journey counts them only while it is on (turn it on on Journey).', 'De spellaag staat uit op dit apparaat, dus er is geen level of XP: Journey telt ze alleen als die aan staat (zet hem aan op Journey).')};
  if (facts.state === 'closed') return {facts, text: t(lang,
    `Your level counts your habits, Health logs, goals and weekly reviews, and ${listWords(facts.closed, lang)} ${facts.closed.length === 1 ? 'isn’t' : 'aren’t'} shared with ZIGi here, so I can’t count it in a chat (unknown here, not zero). Journey shows it.`,
    `Je level telt je gewoontes, Health-logs, doelen en weekreviews, en ${listWords(facts.closed, lang)} ${facts.closed.length === 1 ? 'wordt' : 'worden'} hier niet met ZIGi gedeeld, dus in een chat tel ik het niet (hier onbekend, niet nul). Journey toont het.`)};
  const label = env.showcase ? t(lang, 'Showcase example (fictional records): ', 'Showcase-voorbeeld (fictieve gegevens): ') : '';
  const next = `${facts.level + 1} (${levelName(facts.level + 1)})`;
  return {facts, text: label + t(lang,
    `You are level ${facts.level}, ${facts.name}, with ${n(facts.xp)} XP: ${n(facts.into)} of ${n(facts.span)} XP to level ${next}. This week ${n(facts.thisWeek)} XP, last week ${n(facts.lastWeek)} XP, today ${n(facts.today)} XP. Counted on this device from your check-ins, logs, goal steps and reviews, as Journey counts them.`,
    `Je bent level ${facts.level}, ${facts.name}, met ${n(facts.xp)} XP: ${n(facts.into)} van ${n(facts.span)} XP tot level ${next}. Deze week ${n(facts.thisWeek)} XP, vorige week ${n(facts.lastWeek)} XP, vandaag ${n(facts.today)} XP. Op dit apparaat geteld uit je check-ins, logs, doelstappen en reviews, zoals Journey ze telt.`)};
}

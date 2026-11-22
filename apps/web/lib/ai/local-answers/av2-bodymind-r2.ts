import {balanceWords, sleepBalance} from '../../sleep/engine';
import {balanceWithNaps, napsOn, sleepNeed} from '../../sleep/naps-need';
import {asleep} from '../../sleep/night';
import type {Sleep} from '../../sleep/schema';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, hm, isQuestion, MIXED, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (bodymind-r2; round 2: Rise, Reflectly, Moodnotes, Fitbod): NOVA's and ZIGi's on-device answers to the
 * round's sleep, journal, feelings and gym features, in English and Dutch, each read from the feature's own pure function
 * (the same figures the page shows) and only under that part's switch (Health's three-part gate, the Journal's own).
 * Every pattern reads the whole question, so nothing else is claimed; a question with an action in it is left to the
 * model or a card. Wired into engine.ts by the lead, beside `av2BodyAnswer`.
 */
export function av2BodymindR2Answer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f)) return null;
    for (const one of ANSWERS) {
      const r = one(a);
      if (r) return r;
    }
    return null;
  } catch { return null; }
}

const sleepOf = (a: Asked): Sleep => a.env.health?.sleep ?? ({version: 1, nights: []} as unknown as Sleep);
const SLEEP_CALLS = [{tool: 'sleep_summary', args: {}, label: 'Sleep summary'}];

// ── Rise: the sleep need and naps (LEDGER #237, #238) ───────────────────────────────────────────────────────────────

/** "what is my sleep need", "how much sleep do I need", "wat is mijn slaapbehoefte": the estimate from your own nights. */
function needAnswer(a: Asked): LocalReply | null {
  const en = /\b(?:my )?sleep need\b|\bhow much sleep do i (?:really )?need\b|\bhow many hours (?:of sleep )?do i need\b/.test(a.f), nl = /\bslaapbehoefte\b|\bhoeveel slaap heb ik (?:echt )?nodig\b|\bhoeveel uur slaap heb ik nodig\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const s = sleepOf(a), n = sleepNeed(s, a.env.healthDay), lang = a.lang;
  if (!n) return answer(say(lang, 'Not enough nights yet to estimate it. Log at least 10 nights in 30 days (or 4 weekend nights) in Health → Sleep, and an estimate of your own sleep need shows under Your sleep goal.', 'Nog niet genoeg nachten om hem te schatten. Log in Health → Sleep minstens 10 nachten in 30 dagen (of 4 weekendnachten), dan staat er een schatting van je eigen slaapbehoefte bij Your sleep goal.'), SLEEP_CALLS);
  const how = n.from === 'weekends' ? say(lang, `the middle of your ${n.nights} weekend nights in the last 30 days`, `het midden van je ${n.nights} weekendnachten van de afgelopen 30 dagen`) : say(lang, `the middle of your ${n.nights} longer nights in the last 30 days`, `het midden van je ${n.nights} langere nachten van de afgelopen 30 dagen`);
  const goal = n.goal === null ? say(lang, 'You have no sleep goal yet; Health → Sleep → Your sleep goal can use it.', 'Je hebt nog geen slaapdoel; Health → Sleep → Your sleep goal kan hem gebruiken.')
    : n.goal === n.minutes ? say(lang, 'That is your goal already.', 'Dat is al je doel.') : say(lang, `Your goal is ${hm(n.goal)}; Health → Sleep → Your sleep goal can switch it, with Undo.`, `Je doel is ${hm(n.goal)}; Health → Sleep → Your sleep goal kan het aanpassen, met Ongedaan maken.`);
  return answer(say(lang, `About ${hm(n.minutes)} a night, an estimate: ${how}. ${goal} Not a measurement and not medical advice.`, `Ongeveer ${hm(n.minutes)} per nacht, een schatting: ${how}. ${goal} Geen meting en geen medisch advies.`), SLEEP_CALLS);
}
/** "do my naps count", "how did my nap affect my sleep balance", "tellen mijn dutjes mee": the balance with naps. */
function napsAnswer(a: Asked): LocalReply | null {
  const en = /\bnaps?\b/.test(a.f) && /\b(?:count|balance|debt|affect|effect|energy|help)\b/.test(a.f), nl = /\b(?:dutjes?|middagdutjes?|powernaps?)\b/.test(a.f) && /\b(?:tel|tellen|telt|balans|tekort|effect|invloed|energie|helpt|helpen)\b/.test(a.f);
  if (!(en || nl) || !(isQuestion(a) || /^(?:do|does|tellen|telt)\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const s = sleepOf(a), lang = a.lang, today = a.env.healthDay, base = sleepBalance(s, today), with_ = balanceWithNaps(s, today), napToday = napsOn(s, today);
  const words = (m: number) => `${m} min`;
  const todayLine = napToday.length ? say(lang, ` Today's nap (${hm(asleep(napToday.at(-1)!)?.minutes ?? 0)}) gives a small lift on today's energy curve for a few hours, an estimate.`, ` Je dutje van vandaag (${hm(asleep(napToday.at(-1)!)?.minutes ?? 0)}) geeft een kleine opleving op de energiecurve van vandaag, een paar uur lang, een schatting.`) : '';
  if (!s.goal) return answer(say(lang, `Naps are counted in the sleep balance once you have a sleep goal (Health → Sleep → Your sleep goal).${todayLine}`, `Dutjes tellen mee in de slaapbalans zodra je een slaapdoel hebt (Health → Sleep → Your sleep goal).${todayLine}`), SLEEP_CALLS);
  if (!base) return answer(say(lang, `The sleep balance needs at least 5 logged nights in the last 14 days; naps then count on the day they ended.${todayLine}`, `De slaapbalans heeft minstens 5 gelogde nachten in de afgelopen 14 dagen nodig; dutjes tellen dan mee op de dag waarop ze eindigden.${todayLine}`), SLEEP_CALLS);
  if (!with_) return answer(say(lang, `No nap on a logged day in the last 14 days, so the balance is your nights only: ${balanceWords(base, words).toLowerCase()}.${todayLine}`, `Geen dutje op een gelogde dag in de afgelopen 14 dagen, dus de balans is alleen je nachten.${todayLine}`), SLEEP_CALLS);
  const nlWords = (b: {perNight: number}) => Math.abs(b.perNight) < 10 ? 'rond je doel' : b.perNight > 0 ? `ongeveer ${b.perNight} min boven je doel per nacht` : `ongeveer ${-b.perNight} min onder je doel per nacht`;
  return answer(say(lang, `Yes: ${with_.naps === 1 ? '1 nap' : `${with_.naps} naps`} (${hm(with_.napMinutes)}) in the last 14 days count on the day each ended, marked as naps. Nights only: ${balanceWords(base, words).toLowerCase()}; with the naps: ${balanceWords(with_, words).toLowerCase()}.${todayLine}`,
    `Ja: ${with_.naps === 1 ? '1 dutje' : `${with_.naps} dutjes`} (${hm(with_.napMinutes)}) in de afgelopen 14 dagen tellen mee op de dag waarop ze eindigden, gemarkeerd als dutje. Alleen nachten: ${nlWords(base)}; met de dutjes: ${nlWords(with_)}.${todayLine}`), SLEEP_CALLS);
}

const ANSWERS: ((a: Asked) => LocalReply | null)[] = [needAnswer, napsAnswer];

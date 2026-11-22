import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, isQuestion, MIXED, say, type Asked} from './av-words';
import type {LocalReply} from './engine';
import {compare, dayFactorBasis, type CompareSources} from '../../compare/engine';
import type {HealthExtras} from '../../health-extras';
import {healthGroupIn} from '../../vault/w-homes';
import {emptySleep} from '../../sleep/schema';
import {shiftWords, shiftWordsNl, sleepTiming, TIMING_MIN_NIGHTS, TIMING_WORDS, TIMING_WORDS_NL} from '../../sleep/timing';
import {sleepTipOf} from '../../sleep-tips';
import {clockFromMidnight} from '../../sleep/engine';
import {formatClock} from '../../visual-format';
import {missedThisWeek, mondayOf, planStates, type PlannedRecord} from '../../workouts/planned';
import type {Workouts} from '../../workouts/schema';
import {addLocalDays} from '../../local-date';
import {dayIn, list, nlDay, num} from './av-words';
import type {MoreGoals} from '../../health-goals/more';
import {bandDays} from '../../health-goals/band';
import {dailyData} from '../../health-daily';
import {weightText} from '../../health-units';
import {freeDayShares, type CalorieWeek} from '../../health-aa/calorie-week';
import {weekDays} from '../../health-aa/planner';
import {zoneMinutes, zoneSeconds, ZONE_SOURCE, type WorkoutHr} from '../../workouts/hr-zones';
import {distanceWords, gapWords, goalWords, raceYear, timeText, type Races} from '../../workouts/races';
import {finished} from '../../workouts/engine';

/**
 * Session AV lane 2, round 4 (health; Pillow, Runna, Noom): NOVA's and ZIGi's on-device answers to the round's sleep,
 * workout and body features, in English and Dutch, each read from the feature's own pure function (the same figures the
 * page shows), Health's behind its gate. Every pattern reads the whole question; a question with an action in it is left
 * to the model or a card. Never a calorie expenditure, never a medical reading, never a cause. Wired into engine.ts by the
 * lead, beside `av2R3HealthAnswer`.
 *
 * Records not yet in the AK tool sources (the lead's registry step: `plannedWorkouts`, `races`, `workoutHr`,
 * `calorieWeek`) read as "not shared here" until they are.
 */
export function av2R4HealthAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of ANSWERS) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}
export type R4Ak = {healthExtras?: HealthExtras | null; plannedWorkouts?: PlannedRecord | null; workouts?: Workouts | null; healthGoalsMore?: MoreGoals | null; calorieWeek?: CalorieWeek | null; workoutHr?: WorkoutHr | null; races?: Races | null};
export const ak = (a: Asked) => (a.env.ak ?? {}) as R4Ak;
export const HEALTH_CALLS = [{tool: 'health_summary', args: {}, label: 'Health summary'}];
export const notShared = (a: Asked, en: string, nl: string) => answer(say(a.lang, `I can’t read ${en} here yet, so I can’t say. It is in Health on this device.`, `Ik kan ${nl} hier nog niet lezen, dus dat kan ik niet zeggen. Het staat in Health op dit apparaat.`));

/** "does caffeine go with my sleep", "slaap ik anders na cafeïne" (LEDGER #332): Compare's own result, never a cause. */
function caffeineSleep(a: Asked): LocalReply | null {
  const late = /\b(?:late|afternoon|evening|after \d{1,2})\b.*\b(?:coffee|caffeine)\b|\b(?:coffee|caffeine)\b.*\b(?:late|afternoon|evening|after \d{1,2})\b/.test(a.f) || /\b(?:laat|middag|avond|na \d{1,2})\b.*\b(?:koffie|cafeine|cafeïne)\b|\b(?:koffie|cafeine|cafeïne)\b.*\b(?:laat|middag|avond|na \d{1,2})\b/.test(a.f);
  const steps = /\bsteps?\b.*\bsleep\b|\bsleep\b.*\bsteps?\b/.test(a.f) || /\bstappen\b.*\bslaap\b|\bslaap\w*\b.*\bstappen\b/.test(a.f);
  const caffeine = /\b(?:coffee|caffeine)\b.*\bsleep\b|\bsleep\b.*\b(?:coffee|caffeine)\b/.test(a.f) || /\b(?:koffie|cafeine|cafeïne)\b.*\bslaap\w*\b|\bslaap\w*\b.*\b(?:koffie|cafeine|cafeïne)\b/.test(a.f);
  if (!(caffeine || steps)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const extras = ak(a).healthExtras;
  if (!steps && extras === undefined) return notShared(a, 'what your drinks were', 'wat je drankjes waren');
  const today = a.env.healthDay, src: CompareSources = {health: a.env.health, drinks: extras?.drinks ?? null};
  const basis = dayFactorBasis(src, today), factor = steps ? 'steps' : late ? 'caffeine-late' : 'caffeine';
  const r = compare(src, factor, 'sleep', 'same', today);
  const what = say(a.lang, factor === 'steps' ? 'steps' : 'caffeine', factor === 'steps' ? 'stappen' : 'cafeïne');
  if (!r) return answer(say(a.lang, `There is no ${what} in your log to compare with your nights yet. ${factor === 'steps' ? 'Log steps in Health → Activity.' : 'Type the caffeine of a drink in Health → Water.'} Then Health → Insights → Compare sets the days with it beside the days without, night by night.`, `Er staat nog geen ${what} in je log om met je nachten te vergelijken. ${factor === 'steps' ? 'Log stappen in Health → Activity.' : 'Vul de cafeïne van een drankje in bij Health → Water.'} Dan zet Health → Insights → Compare de dagen ermee naast de dagen zonder, nacht voor nacht.`), HEALTH_CALLS);
  const amount = factor === 'steps' ? `${basis.steps ?? 8000}` : factor === 'caffeine' ? `${basis.caffeineMg ?? 200} mg` : `${basis.hour}:00`;
  const nl = factor === 'steps' ? `dagen met meer dan ${amount} stappen` : factor === 'caffeine' ? `dagen met meer dan ${amount} cafeïne` : `dagen met cafeïne na ${amount}`;
  if (r.state === 'pending') return answer(say(a.lang, `Not enough days yet: ${r.counts}, and a comparison needs ${r.need} on each side. Health → Insights → Compare shows it then. It says what happened together, never a cause.`, `Nog niet genoeg dagen: ${r.withDays} met, ${r.withoutDays} zonder (${nl}), en een vergelijking heeft er ${r.need} aan elke kant nodig. Health → Insights → Compare laat het dan zien: wat samen gebeurde, nooit een oorzaak.`), HEALTH_CALLS);
  const h = (m: number) => `${Math.floor(Math.round(m) / 60)} h ${String(Math.round(m) % 60).padStart(2, '0')} min`;
  const nums = say(a.lang, `${h(r.withValue!)} on those nights, ${h(r.withoutValue!)} on the others`, `${h(r.withValue!)} na die dagen, ${h(r.withoutValue!)} na de andere`);
  if (r.state === 'unclear') return answer(say(a.lang, `From your last 90 days (${r.counts}): ${nums}. The two are close, so this is not a finding. It is what happened together, never a cause.`, `Uit je laatste 90 dagen (${r.withDays} met, ${r.withoutDays} zonder; ${nl}): ${nums}. Die liggen dicht bij elkaar, dus dit is geen bevinding. Het is wat samen gebeurde, nooit een oorzaak.`), HEALTH_CALLS);
  return answer(say(a.lang, `${r.sentence} (${r.counts}, your last 90 days.) Something else could explain it: ${r.confounder}. It is what happened together, never a cause.`, `Op ${nl} sliep je die nacht gemiddeld ${h(r.withValue!)}; na andere dagen ${h(r.withoutValue!)} (${r.withDays} met, ${r.withoutDays} zonder, je laatste 90 dagen). Iets anders kan het verklaren, zoals drukke dagen of weekenden. Het is wat samen gebeurde, nooit een oorzaak.`), HEALTH_CALLS);
}

const hm = (m: number) => { const r = Math.round(m), h = Math.floor(r / 60), min = r % 60; return h ? (min ? `${h} h ${min} min` : `${h} h`) : `${min} min`; };
const clock = (lang: 'en' | 'nl', m: number) => { const c = clockFromMidnight(Math.round(m)); return lang === 'nl' ? c : formatClock(c); };
/** "when do I sleep on weekends", "hoe laat slaap ik in het weekend" (LEDGER #333): an estimate from the person's nights. */
function sleepTimingAnswer(a: Asked): LocalReply | null {
  if (!(/\b(?:sleep|bed) ?timing\b|\bsleep\b.*\b(?:on )?weekends?\b|\bweekends?\b.*\bsleep\b|\bchronotype\b|\b(?:early|late|earlier|later) sleeper\b/.test(a.f) || /\bslaap\w*\b.*\bweekend\b|\bweekend\b.*\bslaap\w*\b|\bchronotype\b|\b(?:vroege|late) slaper\b|\bslaapritme\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const t = sleepTiming((a.env.health ? healthGroupIn(a.env.health, 'sleep') : undefined) ?? emptySleep(), a.env.healthDay);
  if (!t) return answer(say(a.lang, `Not enough nights yet: your timing needs ${TIMING_MIN_NIGHTS} weekend nights and ${TIMING_MIN_NIGHTS} weekday nights in the last 30 days. Log your nights in Health → Sleep.`, `Nog niet genoeg nachten: je timing heeft ${TIMING_MIN_NIGHTS} weekendnachten en ${TIMING_MIN_NIGHTS} doordeweekse nachten nodig in de laatste 30 dagen. Log je nachten in Health → Sleep.`), HEALTH_CALLS);
  return answer(say(a.lang, `The middle of your sleep: ${clock('en', t.free.mid)} on weekend nights, ${clock('en', t.work.mid)} on weekday nights. ${shiftWords(t, hm)} That reads as ${TIMING_WORDS[t.word]}: an estimate from your own nights, not a type to change and not medical advice.`, `Het midden van je slaap: ${clock('nl', t.free.mid)} in weekendnachten, ${clock('nl', t.work.mid)} door de week. ${shiftWordsNl(t, hm)} Dat lijkt op ${TIMING_WORDS_NL[t.word]}: een schatting uit je eigen nachten, geen type om te veranderen en geen medisch advies.`), HEALTH_CALLS);
}
/** "what is today's sleep tip", "wat is de slaaptip van vandaag" (LEDGER #334). */
function sleepTip(a: Asked): LocalReply | null {
  if (!(/\bsleep tips?\b|\btips? (?:for|to) (?:better )?sleep\b/.test(a.f) || /\bslaaptips?\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const tip = sleepTipOf(a.env.healthDay);
  return answer(say(a.lang, `Today’s sleep tip: ${tip.en} (Health’s Sleep card shows one a day once you choose “Show a sleep tip each day”.)`, `De slaaptip van vandaag: ${tip.nl} (De slaapkaart in Health laat er elke dag een zien als je “Show a sleep tip each day” kiest.)`));
}

/** "which workouts are planned this week", "welke workouts staan er gepland" (LEDGER #330). */
function plannedAnswer(a: Asked): LocalReply | null {
  if (!(/\b(?:planned|scheduled) (?:workouts?|runs?|training)\b|\b(?:workouts?|runs?|training) (?:are |is )?(?:planned|scheduled)\b|\bmy (?:training|workout) plan\b/.test(a.f) || /\b(?:workouts?|trainingen|training|hardloop\w*) (?:staan |staat )?(?:er )?gepland\b|\bgeplande (?:workouts?|trainingen|runs?)\b|\bmijn trainingsplan\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const rec = ak(a).plannedWorkouts;
  if (rec === undefined) return notShared(a, 'your planned workouts', 'je geplande workouts');
  const today = a.env.healthDay, w = ak(a).workouts ?? null, to = addLocalDays(mondayOf(today), 13);
  const states = rec ? planStates(rec, w, today) : new Map(), ahead = (rec?.items ?? []).filter(i => i.date >= today && i.date <= to && states.get(i.id) === 'planned');
  const missed = rec ? missedThisWeek(rec, w, today) : [];
  if (!ahead.length && !missed.length) return answer(say(a.lang, 'Nothing is planned for this week or next. Health → Workouts → Your plan puts a routine, a circuit or a run on a day; it shows on the Agenda too.', 'Er staat niets gepland voor deze of volgende week. Health → Workouts → Your plan zet een routine, een circuit of een loopje op een dag; het staat dan ook in de agenda.'), HEALTH_CALLS);
  const row = (i: {name: string; date: string; time?: string}, lang: 'en' | 'nl'): string => `${i.name} (${lang === 'nl' ? nlDay(i.date, today) : dayIn('en', i.date, today)}${i.time ? ` ${lang === 'nl' ? i.time : formatClock(i.time)}` : ''})`;
  const en = `${ahead.length ? `Planned: ${list(ahead.map(i => row(i, 'en')), 'en')}.` : 'Nothing more is planned for this week or next.'}${missed.length ? ` Not done this week: ${list(missed.map(i => row(i, 'en')), 'en')}. “I missed some” in Your plan moves them on, in order.` : ''}`;
  const nl = `${ahead.length ? `Gepland: ${list(ahead.map(i => row(i, 'nl')), 'nl')}.` : 'Er staat deze en volgende week niets meer gepland.'}${missed.length ? ` Niet gedaan deze week: ${list(missed.map(i => row(i, 'nl')), 'nl')}. “I missed some” in Your plan schuift ze op, op volgorde.` : ''}`;
  return answer(say(a.lang, en, nl), HEALTH_CALLS);
}

/** "am I inside my weight band", "zit ik binnen mijn gewichtsband" (LEDGER #331): the trend's days inside, as on the card. */
function weightBand(a: Asked): LocalReply | null {
  if (!(/\bweight band\b|\b(?:inside|within|in) my (?:weight )?band\b|\bkeep my weight between\b/.test(a.f) || /\bgewichtsband\b|\bbinnen mijn (?:gewichts)?band\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const rec = ak(a).healthGoalsMore;
  if (rec === undefined) return notShared(a, 'your weight band', 'je gewichtsband');
  const band = rec?.weightBand;
  if (!band) return answer(say(a.lang, 'No weight band is set. Goals → Health goals → “Keep my weight between …” sets one: a lower and an upper weight of your own, shaded on the weight trend.', 'Er staat geen gewichtsband. Goals → Health goals → “Keep my weight between …” zet er een: een eigen onder- en bovengrens, gearceerd op de gewichtstrend.'), HEALTH_CALLS);
  const unit = dailyData(a.env.health!).preferences.weightUnit, d = bandDays(a.env.health!, band, a.env.healthDay), range = `${weightText(band.lowGrams, unit)}–${weightText(band.highGrams, unit)}`;
  if (!d.days) return answer(say(a.lang, `Your band is ${range}. The trend starts with your first weight reading.`, `Je band is ${range}. De trend begint bij je eerste weging.`), HEALTH_CALLS);
  return answer(say(a.lang, `Your band is ${range}. In the last 30 days the trend was inside it on ${num(d.inside)} of ${num(d.days)} days. The trend is an estimate, not medical advice.`, `Je band is ${range}. In de laatste 30 dagen lag de trend er op ${num(d.inside)} van de ${num(d.days)} dagen binnen. De trend is een schatting, geen medisch advies.`), HEALTH_CALLS);
}
/** "when is my free day", "wanneer is mijn vrije dag" (LEDGER #328): the day and its extra, the other days' share. */
function freeDay(a: Asked): LocalReply | null {
  if (!(/\b(?:free|treat|cheat) day\b/.test(a.f) || /\b(?:vrije|cheat|feest)dag\b|\bvrije dag\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const rec = ak(a).calorieWeek;
  if (rec === undefined) return notShared(a, 'your weekly calorie budget', 'je weekbudget voor calorieën');
  const base = a.env.health!.targets.kcal, f = rec?.freeDay, today = a.env.healthDay;
  const shares = f && base && f.date >= weekDays(today)[0]! ? freeDayShares(rec!, base, weekDays(f.date)) : null;
  if (!shares) return answer(say(a.lang, 'No free day is planned. Health → Targets → Weekly calorie budget plans one: a day with the extra you choose, taken evenly from that week’s other days, never below the floor.', 'Er staat geen vrije dag gepland. Health → Targets → Weekly calorie budget plant er een: een dag met de extra die je kiest, gelijk verdeeld over de andere dagen van die week, nooit onder de ondergrens.'), HEALTH_CALLS);
  const n = Object.keys(shares.gives).length;
  return answer(say(a.lang, `Your free day is ${dayIn('en', shares.date, today)}: ${num(shares.extra)} kcal more, taken evenly from ${n} other ${n === 1 ? 'day' : 'days'} of that week. The weekly total is the same.`, `Je vrije dag is ${nlDay(shares.date, today)}: ${num(shares.extra)} kcal extra, gelijk verdeeld over ${n} andere ${n === 1 ? 'dag' : 'dagen'} van die week. Het weektotaal blijft gelijk.`), HEALTH_CALLS);
}

/** "what were my heart-rate zones on my last run", "hoeveel minuten zat ik in zone 2" (LEDGER #336): from the typed maximum. */
function hrZonesAnswer(a: Asked): LocalReply | null {
  if (!(/\b(?:heart ?rate|hr|pulse) zones?\b|\bin zone [1-5]\b|\bzone [1-5]\b.*\b(?:run|minutes)\b/.test(a.f) || /\bhartslagzones?\b|\bin zone [1-5]\b|\bzone [1-5]\b.*\b(?:loop|minuten)\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const rec = ak(a).workoutHr;
  if (rec === undefined) return notShared(a, 'your heart-rate zones', 'je hartslagzones');
  const runs = finished(ak(a).workouts ?? {version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90} as unknown as Workouts).filter(x => rec?.runs[x.id]);
  const last = runs[0];
  if (!rec?.maxHr) return answer(say(a.lang, 'Zones need your maximum heart rate, typed by you (from a test or your watch): open a run in Health → Workouts and type it under its heart-rate zones. ZIGoals never works it out from your age.', 'Zones hebben je maximale hartslag nodig, door jou ingevuld (uit een test of van je horloge): open een loop in Health → Workouts en vul hem in bij de hartslagzones. ZIGoals rekent hem nooit uit je leeftijd.'), HEALTH_CALLS);
  if (!last) return answer(say(a.lang, `Your maximum is ${rec.maxHr} bpm. No imported run has heart-rate points yet: import a GPX or TCX file with heart rate in Health → Workouts.`, `Je maximum is ${rec.maxHr} bpm. Nog geen geïmporteerde loop heeft hartslagpunten: importeer een GPX- of TCX-bestand met hartslag in Health → Workouts.`), HEALTH_CALLS);
  const z = zoneSeconds(rec.runs[last.id]!, rec.maxHr), parts = z.zones.filter(x => x.seconds).map(x => `zone ${x.zone} ${zoneMinutes(x.seconds)}`);
  return answer(say(a.lang, `${last.name} (${dayIn('en', last.date, a.env.healthDay)}): ${list(parts, 'en')}. Zones are 50–100 % of the ${rec.maxHr} bpm you typed, in steps of 10 (${ZONE_SOURCE}): an estimate, not medical advice.`, `${last.name} (${nlDay(last.date, a.env.healthDay)}): ${list(parts.map(p => p.replace('under 1 min', 'minder dan 1 min')), 'nl')}. De zones zijn 50–100 % van de ${rec.maxHr} bpm die je invulde, in stappen van 10 (${ZONE_SOURCE}): een schatting, geen medisch advies.`), HEALTH_CALLS);
}
/** "what races do I have coming up", "welke wedstrijden heb ik" (LEDGER #337). */
function racesAnswer(a: Asked): LocalReply | null {
  if (!(/\b(?:races?|race day|marathon|parkrun)\b.*\b(?:coming|ahead|planned|next|upcoming|have|result)\b|\b(?:next|upcoming|my) races?\b/.test(a.f) || /\b(?:wedstrijd(?:en)?|loopwedstrijd(?:en)?|marathon|races?)\b.*\b(?:komend\w*|gepland|volgende|heb ik|uitslag)\b|\bmijn (?:volgende )?(?:wedstrijd(?:en)?|races?)\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const rec = ak(a).races;
  if (rec === undefined) return notShared(a, 'your races', 'je wedstrijden');
  const today = a.env.healthDay, rows = rec ? raceYear(rec, ak(a).workouts ?? null, today) : [], ahead = rows.filter(r => !r.past), done = rows.filter(r => r.past && r.result).slice(-1);
  if (!ahead.length && !done.length) return answer(say(a.lang, 'No race is saved. Health → Workouts → Races ahead keeps your races, the weeks between them and each result beside your goal.', 'Er staat geen wedstrijd. Health → Workouts → Races ahead bewaart je wedstrijden, de weken ertussen en elke uitslag naast je doel.'), HEALTH_CALLS);
  const en = ahead.map(r => `${r.race.name} (${r.race.priority === 'main' ? 'main' : 'B'}, ${distanceWords(r.race.distanceKm)}, ${dayIn('en', r.race.date, today)}, in ${gapWords(r.daysFromToday)})`);
  const nl = ahead.map(r => `${r.race.name} (${r.race.priority === 'main' ? 'hoofdwedstrijd' : 'B'}, ${distanceWords(r.race.distanceKm).replace('Half marathon', 'halve marathon')}, ${nlDay(r.race.date, today)}, over ${gapWords(r.daysFromToday, 'nl')})`);
  const last = done[0], res = last?.result;
  const enLast = last && res ? ` Last: ${last.race.name}, ${timeText(res.seconds)}${res.vsGoal !== null ? `, ${goalWords(res.vsGoal)}` : ''}.` : '';
  const nlLast = last && res ? ` Laatste: ${last.race.name}, ${timeText(res.seconds)}${res.vsGoal !== null ? `, ${timeText(Math.abs(res.vsGoal))} ${res.vsGoal <= 0 ? 'onder' : 'boven'} je doel` : ''}.` : '';
  return answer(say(a.lang, `${ahead.length ? `Coming up: ${list(en, 'en')}.` : 'No race ahead.'}${enLast}`, `${ahead.length ? `Komend: ${list(nl, 'nl')}.` : 'Geen wedstrijd gepland.'}${nlLast}`), HEALTH_CALLS);
}

const ANSWERS: ((a: Asked) => LocalReply | null)[] = [caffeineSleep, sleepTimingAnswer, sleepTip, plannedAnswer, weightBand, freeDay, hrZonesAnswer, racesAnswer];

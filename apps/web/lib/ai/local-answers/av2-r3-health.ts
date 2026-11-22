import type {ToolEnv} from '../tools/env';
import {answer, asked, clockIn, closed, isQuestion, list, MIXED, num, say, type Asked} from './av-words';
import type {LocalReply} from './engine';
import {dailyData, waterSummary} from '../../health-daily';
import type {HealthExtras} from '../../health-extras';
import {drinkEnergyDay} from '../../own-drinks';
import {waterTipOf} from '../../water-tips';
import {spreadSlots, type WaterSpread} from '../../water-spread';
import type {NotifyPrefs} from '../../notify/prefs';
import {WEEKDAY_BITS, weighInWords, type WeighIn} from '../../weigh-in';
const NL_DAYS: Record<number, string> = {1: 'ma', 2: 'di', 4: 'wo', 8: 'do', 16: 'vr', 32: 'za', 64: 'zo'};
import {habitTrendList} from '../../habits-v2/trend';
import {MEALS, mealReadings} from '../../health-numbers/meals';
import type {HealthNumbers} from '../../health-numbers/store';
import {moreGoalLine, moreGoalProgress, unitOf, type MoreGoals} from '../../health-goals/more';
import {circuitLine, type Circuits} from '../../workouts/circuits';
import {GUIDES} from '../../workouts/routine-library';
import {filterGuides, NO_FILTER} from '../../workouts/library-filter';

/**
 * Session AV lane 2 (health r3; round 3: Waterllama, Way of Life, Carb Manager, Nike Training Club): NOVA's and ZIGi's
 * on-device answers to the round's water, habit, body and gym features, in English and Dutch, each read from the
 * feature's own pure function (the same figures the page shows), Health's behind its gate. Every pattern reads the whole
 * question; a question with an action in it is left to the model or a card. Never a calorie expenditure, never a medical
 * reading of a number. Wired into engine.ts by the lead, beside `av2BodymindR2Answer`.
 *
 * Records not yet in the AK tool sources (the lead's registry step: `healthExtras`, `notifyPrefs`, `healthGoalsMore`,
 * `workoutCircuits`) read as "not shared here" until they are; your numbers come from NOVA's sources.
 */
export function av2R3HealthAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of ANSWERS) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}
type Ak = {healthExtras?: HealthExtras | null; notifyPrefs?: NotifyPrefs | null; healthGoalsMore?: MoreGoals | null; workoutCircuits?: Circuits | null};
const ak = (a: Asked) => (a.env.ak ?? {}) as Ak;
const HEALTH_CALLS = [{tool: 'health_summary', args: {}, label: 'Health summary'}];
const notShared = (a: Asked, en: string, nl: string) => answer(say(a.lang, `I can’t read ${en} here yet, so I can’t say. It is in Health on this device.`, `Ik kan ${nl} hier nog niet lezen, dus dat kan ik niet zeggen. Het staat in Health op dit apparaat.`));

/** "how many calories from drinks today", "hoeveel calorieën uit drankjes vandaag" (LEDGER #282): only as typed. */
function drinkEnergy(a: Asked): LocalReply | null {
  if (!(/\b(?:calories|kcal|sugar|energy)\b.*\b(?:drinks?|drank)\b|\bdrinks?\b.*\b(?:calories|kcal|sugar)\b/.test(a.f) || /\b(?:calorieen|calorieën|kcal|suiker|energie)\b.*\bdrank(?:jes|en)?\b|\bdrank(?:jes|en)?\b.*\b(?:calorieen|calorieën|kcal|suiker)\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const extras = ak(a).healthExtras;
  if (extras === undefined) return notShared(a, 'what your drinks were', 'wat je drankjes waren');
  const day = drinkEnergyDay(extras, dailyData(a.env.health!).water, a.env.healthDay);
  if (day.kcal === null && day.sugarG === null) return answer(say(a.lang, 'No drink today has calories or sugar typed for it, so nothing is counted. Type them in the water form, or make one of your drinks with them in Health → Water → Your drinks. Nothing is guessed.', 'Geen drankje van vandaag heeft calorieën of suiker ingevuld, dus er telt niets. Vul ze in bij water, of maak er een eigen drankje mee in Health → Water → Your drinks. Er wordt niets geschat.'), HEALTH_CALLS);
  const parts = [day.kcal !== null ? `${num(day.kcal)} kcal` : null, day.sugarG !== null ? say(a.lang, `${num(day.sugarG)} g sugar`, `${num(day.sugarG)} g suiker`) : null].filter(Boolean).join(' · ');
  const n = Math.max(day.withKcal, day.withSugar);
  return answer(say(a.lang, `From today’s drinks, as you typed them: ${parts}, from ${n} ${n === 1 ? 'drink' : 'drinks'} (${list(day.lines.map(l => l.name), 'en')}). Nothing is guessed.`, `Uit de drankjes van vandaag, zoals je ze invulde: ${parts}, van ${n} ${n === 1 ? 'drankje' : 'drankjes'} (${list(day.lines.map(l => l.name), 'nl')}). Er wordt niets geschat.`), HEALTH_CALLS);
}
/** "when are my water reminders", "wanneer zijn mijn waterherinneringen" (LEDGER #280): the times and today's pace. */
function waterReminders(a: Asked): LocalReply | null {
  if (!(/\bwater reminders?\b/.test(a.f) || /\bwaterherinnering(?:en)?\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const prefs = ak(a).notifyPrefs;
  if (prefs === undefined) return notShared(a, 'your water reminders', 'je waterherinneringen');
  const s = prefs?.waterSpread as WaterSpread | undefined;
  if (!s?.on) return answer(say(a.lang, 'Reminders through the day are off. Health → Water → Reminders through the day sets them every one, two or three hours between your times, each skipped when you are on pace.', 'Herinneringen door de dag staan uit. Health → Water → Reminders through the day zet ze elke één, twee of drie uur tussen jouw tijden, en slaat er een over als je op schema ligt.'), HEALTH_CALLS);
  const slots = spreadSlots(s, waterSummary(a.env.health!, a.env.healthDay)), ahead = slots.filter(x => x.onPace).length;
  return answer(say(a.lang, `Every ${s.every / 60} ${s.every === 60 ? 'hour' : 'hours'} from ${clockIn('en', s.from)} to ${clockIn('en', s.to)}: ${list(slots.map(x => clockIn('en', x.time)), 'en')}. Today ${ahead} of ${slots.length} ${ahead === 1 ? 'is' : 'are'} skipped because you are on pace.`, `Elke ${s.every / 60} uur van ${s.from} tot ${s.to}: ${list(slots.map(x => x.time), 'nl')}. Vandaag ${ahead === 1 ? 'valt er 1' : `vallen er ${ahead}`} van de ${slots.length} weg omdat je op schema ligt.`), HEALTH_CALLS);
}
/** "what is today's water tip", "wat is de watertip van vandaag" (LEDGER #283). */
function waterTip(a: Asked): LocalReply | null {
  if (!(/\b(?:water|hydration|drinking) tip\b/.test(a.f) || /\bwatertip\b|\bdrinktip\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const tip = waterTipOf(a.env.healthDay);
  return answer(say(a.lang, `Today’s water tip: ${tip.en} (Health → Water shows one a day once you choose “Show a water tip each day”.)`, `De watertip van vandaag: ${tip.nl} (Health → Water laat er elke dag een zien als je “Show a water tip each day” kiest.)`));
}
/** "when is my weigh-in reminder", "wanneer is mijn weegherinnering" (LEDGER #286): never a weight. */
function weighIn(a: Asked): LocalReply | null {
  if (!(/\bweigh[- ]?in reminders?\b|\breminder to weigh\b/.test(a.f) || /\bweegherinnering\b|\bherinnering om te wegen\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const prefs = ak(a).notifyPrefs;
  if (prefs === undefined) return notShared(a, 'your weigh-in reminder', 'je weegherinnering');
  const w = prefs?.weighIn as WeighIn | undefined;
  if (!w) return answer(say(a.lang, 'No weigh-in reminder is set. Health → Weight → Weigh-in reminder sets one every day, on chosen days or once a month; it stays quiet on a day you already weighed in.', 'Er staat geen weegherinnering. Health → Weight → Weigh-in reminder zet er een, elke dag, op gekozen dagen of één keer per maand; hij blijft stil op een dag dat je al woog.'));
  const nl = w.repeat === 'daily' ? `Elke dag om ${w.time}` : w.repeat === 'monthly' ? `Op de ${w.day ?? 1}e van elke maand om ${w.time}` : `${(() => { const d = WEEKDAY_BITS.filter(([, , bit]) => (w.weekdays ?? 0) & bit).map(([, , bit]) => NL_DAYS[bit]!); return d.length === 7 ? 'Elke dag' : d.length > 1 ? `${d.slice(0, -1).join(', ')} en ${d.at(-1)}` : d[0] ?? 'Geen dag'; })()} om ${w.time}`;
  return answer(say(a.lang, `${weighInWords(w, t => clockIn('en', t))}, quiet on a day a weight is already logged.`, `${nl}, stil op een dag dat er al een gewicht is gelogd.`));
}
/** "which habits am I doing more often", "welke gewoontes doe ik vaker" (LEDGER #276). */
function habitTrend(a: Asked): LocalReply | null {
  const en = /\bhabits?\b.*\b(?:more often|less often|trend|trending)\b|\b(?:trend|trends) (?:per|of my|for my) habits?\b/.test(a.f), nl = /\bgewoont(?:e|es|en)\b.*\b(?:vaker|minder vaak|trend)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const t = habitTrendList(a.env.habits.habits, a.env.habitDay), more = t.filter(x => x.word === 'more'), less = t.filter(x => x.word === 'less'), same = t.filter(x => x.word === 'same');
  if (!more.length && !less.length && !same.length) return answer(say(a.lang, 'Not enough days yet to compare: a trend needs at least 5 scheduled days in the last 30 days and in the 30 before.', 'Nog niet genoeg dagen om te vergelijken: een trend heeft minstens 5 geplande dagen nodig in de afgelopen 30 dagen en in de 30 daarvoor.'), [{tool: 'habits_summary', args: {}, label: 'Habits'}]);
  const row = (x: (typeof t)[number]) => `${x.title} (${x.recent.share}% ${say(a.lang, 'now', 'nu')}, ${x.before.share}% ${say(a.lang, 'before', 'eerder')})`;
  const en2 = [more.length ? `More often: ${list(more.map(row), 'en')}.` : '', same.length ? `About the same: ${list(same.map(x => x.title), 'en')}.` : '', less.length ? `Less often: ${list(less.map(row), 'en')}.` : ''].filter(Boolean).join(' ');
  const nl2 = [more.length ? `Vaker: ${list(more.map(row), 'nl')}.` : '', same.length ? `Ongeveer even vaak: ${list(same.map(x => x.title), 'nl')}.` : '', less.length ? `Minder vaak: ${list(less.map(row), 'nl')}.` : ''].filter(Boolean).join(' ');
  return answer(say(a.lang, `The last 30 days beside the 30 before. ${en2}`, `De afgelopen 30 dagen naast de 30 daarvoor. ${nl2}`), [{tool: 'habits_summary', args: {}, label: 'Habits'}]);
}
/** "what readings did I log with meals today", "welke metingen heb ik bij maaltijden" (LEDGER #284): the numbers only. */
function mealReadingsAnswer(a: Asked): LocalReply | null {
  if (!(/\b(?:readings?|glucose|ketones?)\b.*\b(?:meals?|breakfast|lunch|dinner)\b/.test(a.f) || /\b(?:metingen|meting|glucose|ketonen)\b.*\b(?:maaltijd(?:en)?|ontbijt|lunch|avondeten)\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const rec = (a.env.nova as {healthNumbers?: HealthNumbers | null} | null | undefined)?.healthNumbers ?? null, day = a.env.healthDay;
  const MEAL_NL: Record<string, string> = {Breakfast: 'ontbijt', Lunch: 'lunch', Dinner: 'avondeten', Snacks: 'een tussendoortje'};
  const lines = MEALS.flatMap(m => mealReadings(rec, day, m).map(r => a.lang === 'nl' ? `${r.name} ${num(r.value)}${r.unit ? ` ${r.unit}` : ''} ${r.when === 'before' ? 'voor' : 'na'} ${MEAL_NL[m]}` : `${r.name} ${num(r.value)}${r.unit ? ` ${r.unit}` : ''} ${r.when} ${m === 'Snacks' ? 'a snack' : m.toLowerCase()}`));
  if (!lines.length) return answer(say(a.lang, 'No reading is marked with a meal today. In Health → Measurements → Your numbers, choose “With a meal” when you add one, and it shows beside that meal in the Diary.', 'Vandaag is er geen meting bij een maaltijd gemarkeerd. Kies in Health → Measurements → Your numbers “With a meal” als je er een toevoegt, dan staat hij bij die maaltijd in het dagboek.'), HEALTH_CALLS);
  return answer(say(a.lang, `Today, as you typed them: ${list(lines, 'en')}. I only show the numbers; I don’t judge them.`, `Vandaag, zoals je ze invulde: ${list(lines, 'nl')}. Ik laat alleen de getallen zien; ik beoordeel ze niet.`), HEALTH_CALLS);
}
/** "how am I doing on my protein goal", "hoe sta ik ervoor met mijn eiwitdoel" (LEDGER #287). */
function moreGoals(a: Asked): LocalReply | null {
  const m = /\b(protein|fibre|fiber|waist|carbs|sugars?|sodium|nutrient)\b.*\bgoals?\b|\bgoals? on (?:a )?(?:nutrient|measurement|my numbers?)\b/.exec(a.f) ?? /\b(eiwit|vezel|taille|koolhydraat|suiker|natrium)\w*\s?doel\b|\bdoel(?:en)? (?:op|voor) (?:eiwit|vezels|taille|mijn getallen)\b/.exec(a.f);
  if (!m) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const rec = ak(a).healthGoalsMore;
  if (rec === undefined) return notShared(a, 'your goals on nutrients and measurements', 'je doelen op voedingsstoffen en maten');
  const active = (rec?.goals ?? []).filter(g => g.status === 'active');
  if (!active.length) return answer(say(a.lang, 'No goal on a nutrient, a measurement or your own number yet. Goals → Health goals → “Goals on a nutrient, a measurement or your own number” sets one, with your own target.', 'Nog geen doel op een voedingsstof, een maat of een eigen getal. Goals → Health goals → “Goals on a nutrient, a measurement or your own number” zet er een, met je eigen doel.'));
  const numbers = (a.env.nova as {healthNumbers?: HealthNumbers | null} | null | undefined)?.healthNumbers ?? null;
  const lines = active.map(g => { const p = moreGoalProgress(g, a.env.health, numbers, a.env.healthDay); return a.lang === 'nl' ? `${g.name}: ${p.average === null ? 'nog geen waarde in deze periode' : `gemiddeld ${num(Math.round(p.average * 10) / 10)} ${unitOf(g)} over ${p.days} ${p.days === 1 ? 'dag' : 'dagen'}${p.met ? ', gehaald' : ''}`}` : moreGoalLine(g, p, num); });
  return answer(say(a.lang, lines.join(' '), `${lines.join('. ')}.`), HEALTH_CALLS);
}
/** "what circuits do I have", "welke circuits heb ik" (LEDGER #289). */
function circuits(a: Asked): LocalReply | null {
  if (!(/\b(?:timed )?circuits?\b/.test(a.f) || /\bcircuit(?:s|training)?\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const rec = ak(a).workoutCircuits;
  if (rec === undefined) return notShared(a, 'your circuits', 'je circuits');
  const list_ = rec?.circuits ?? [];
  if (!list_.length) return answer(say(a.lang, 'No timed circuit yet. Health → Workouts → Timed circuits makes one from the exercise library: work and rest seconds and rounds, played with a countdown and a chime. No calories are counted.', 'Nog geen circuit met tijden. Health → Workouts → Timed circuits maakt er een uit de oefeningenbibliotheek: seconden werk en rust en rondes, met aftellen en een belletje. Er worden geen calorieën geteld.'));
  return answer(say(a.lang, `Your circuits: ${list(list_.map(c => `${c.name} (${circuitLine(c)})`), 'en')}.`, `Je circuits: ${list(list_.map(c => `${c.name} (${c.moves.length} oefeningen × ${c.rounds} rondes, ${c.workSeconds} s werk, ${c.restSeconds} s rust)`), 'nl')}.`));
}
/** "which routines fit in 30 minutes", "welke routines passen in 30 minuten" (LEDGER #288). */
function shortRoutines(a: Asked): LocalReply | null {
  const m = /\b(?:routines?|workouts?)\b.*\b(?:in|under|within|up to)\s+(\d{2})\s*(?:min|minutes)\b/.exec(a.f) ?? /\broutines?\b.*\b(?:in|binnen|onder|tot)\s+(\d{2})\s*(?:min|minuten)\b/.exec(a.f);
  if (!m) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const minutes = Number(m[1]), fit = filterGuides(GUIDES, {...NO_FILTER, maxMinutes: minutes});
  if (!fit.length) return answer(say(a.lang, `No ready-made routine fits in ${minutes} minutes; the shortest takes ${Math.min(...GUIDES.map(g => g.minutes))}.`, `Geen kant-en-klare routine past in ${minutes} minuten; de kortste duurt ${Math.min(...GUIDES.map(g => g.minutes))}.`));
  return answer(say(a.lang, `Ready-made routines of ${minutes} minutes or less: ${list(fit.map(g => `${g.name.en} (about ${g.minutes} min)`), 'en')}. Health → Workouts → Ready-made routines → Find a routine filters by muscle group and place too.`, `Kant-en-klare routines van ${minutes} minuten of minder: ${list(fit.map(g => `${g.name.nl} (ongeveer ${g.minutes} min)`), 'nl')}. Health → Workouts → Ready-made routines → Find a routine filtert ook op spiergroep en plek.`));
}
const ANSWERS = [drinkEnergy, waterReminders, waterTip, weighIn, habitTrend, mealReadingsAnswer, moreGoals, circuits, shortRoutines];

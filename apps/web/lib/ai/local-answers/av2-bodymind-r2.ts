import {balanceWords, sleepBalance} from '../../sleep/engine';
import {balanceWithNaps, napsOn, sleepNeed} from '../../sleep/naps-need';
import {asleep} from '../../sleep/night';
import type {Sleep} from '../../sleep/schema';
import {morningClock, morningWake, remindedSteps, sortMorning} from '../../evening-plan/morning';
import type {EveningRecord} from '../../evening-plan/schema';
import type {ToolEnv} from '../tools/env';
import {answer, asked, clockIn, closed, hm, isQuestion, journalClosed, MIXED, say, type Asked} from './av-words';
import {challengeDoneToday, challengeOfTheDay} from '../../journal/challenges';
import {feelingsLine, feelingsOn} from '../../mood-words/more';
import {thoughtCheckStats, TRAPS, trapById} from '../../journal/thinking-traps';
import {exerciseIn, logOf} from './av2-body';
import {EXERCISES} from '../../workouts/library';
import {EQUIPMENT_WORDS, needsWords} from '../../workouts/equipment';
import {alternatives} from '../../workouts/replace';
import {suggestWorkout} from '../../workouts/suggest';
import {currentPlace} from '../../workouts/places';
import type {WorkoutPlaces} from '../../workouts/places-schema';
import {addLocalDays} from '../../local-date';
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

// ── Rise: morning steps and step reminders (LEDGER #236) ────────────────────────────────────────────────────────────

/** The evening plan record, once the lead adds it to the AK tool sources (`eveningPlan`); undefined until then. */
const planOf = (a: Asked): EveningRecord | null | undefined => (a.env.ak as {eveningPlan?: EveningRecord | null} | undefined)?.eveningPlan;
const MORNING_NL: Record<string, string> = {'m-water': 'Een glas water', 'm-daylight': 'Daglicht buiten, of bij een licht raam', 'm-move': 'Een paar minuten bewegen', 'm-coffee': 'Eerste koffie of thee, als de sufheid voorbij is', 'm-plan': 'Het plan van vandaag bekijken'};
/** "what are my morning steps", "when should I get daylight", "wat zijn mijn ochtendstappen": the steps at today's times. */
function morningAnswer(a: Asked): LocalReply | null {
  const en = /\bmorning (?:steps?|plan|habits?)\b|\bwhen should i (?:get|have) (?:some )?(?:daylight|sunlight|my (?:first )?coffee)\b/.test(a.f), nl = /\bochtend(?:stappen|plan|gewoontes?)\b|\bwanneer (?:moet|kan) ik (?:daglicht|zonlicht|mijn (?:eerste )?koffie)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const r = planOf(a), lang = a.lang, calls = [{tool: 'evening_plan', args: {}, label: 'Evening plan'}];
  if (r === undefined) return answer(say(lang, 'Your morning steps are in Health → Sleep → Tonight; I can’t read them here yet.', 'Je ochtendstappen staan in Health → Sleep → Tonight; die kan ik hier nog niet lezen.'), calls);
  if (!r?.morning) return answer(say(lang, 'No morning steps yet. In Health → Sleep → Tonight, “Choose morning steps” times a few small steps from your wake time: daylight in the first hour, the first coffee once the grogginess has passed.', 'Nog geen ochtendstappen. In Health → Sleep → Tonight zet “Choose morning steps” een paar kleine stappen op tijd vanaf je wektijd: daglicht in het eerste uur, de eerste koffie als de sufheid voorbij is.'), calls);
  const wake = morningWake(sleepOf(a), a.env.healthDay), reminded = new Set(remindedSteps(r)), ticked = new Set(r.mornings?.[a.env.healthDay] ?? []);
  const when = (m: number) => wake ? clockIn(lang, morningClock(wake.minutes, m)) : say(lang, `${m} min after waking`, `${m} min na het wakker worden`);
  const lines = sortMorning(r.morning.steps).map(s => `• ${when(s.minutesAfter)} ${lang === 'nl' ? MORNING_NL[s.id] ?? s.label : s.label}${ticked.has(s.id) ? say(lang, ' (done)', ' (gedaan)') : ''}${reminded.has(s.id) ? say(lang, ' · reminder on', ' · herinnering aan') : ''}`);
  const head = wake ? wake.from === 'today' ? say(lang, `Timed from your wake time today, ${clockIn(lang, morningClock(wake.minutes, 0))}:`, `Vanaf je wektijd van vandaag, ${clockIn(lang, morningClock(wake.minutes, 0))}:`) : say(lang, `Timed from your usual wake time, ${clockIn(lang, morningClock(wake.minutes, 0))}:`, `Vanaf je gewone wektijd, ${clockIn(lang, morningClock(wake.minutes, 0))}:`) : say(lang, 'Your morning steps:', 'Je ochtendstappen:');
  return answer([head, ...lines].join('\n'), calls);
}

// ── Reflectly: the daily challenge and a page to write and let go (LEDGER #230, #231) ─────────────────────────────

const JOURNAL_CALLS = [{tool: 'journal', args: {}, label: 'Journal'}];
/** "what is today's challenge", "wat is de uitdaging van vandaag": today's small challenge, whether it is on, and Done. */
function challengeAnswer(a: Asked): LocalReply | null {
  const en = /\b(?:todays?|daily|small) challenge\b|\bchallenge (?:for|of) (?:today|the day)\b/.test(a.f), nl = /\buitdaging van (?:vandaag|de dag)\b|\b(?:dagelijkse|kleine) uitdaging\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a) || /\b(?:logging|goal|doel|spending|no spend)\b/.test(a.f)) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const j = a.env.journal!, lang = a.lang, line = challengeOfTheDay(a.today, 0, lang);
  if (j.challenges !== true) return answer(say(lang, `Today's small challenge would be: “${line}” It is off on Today; switch it on in Journal → Privacy → Show a small daily challenge on Today. Nothing is ever counted.`, `De kleine uitdaging van vandaag zou zijn: “${line}” Hij staat uit op Today; zet hem aan in Journal → Privacy → Show a small daily challenge on Today. Er wordt nooit iets geteld.`), JOURNAL_CALLS);
  const done = challengeDoneToday(j, a.today);
  return answer(say(lang, `Today's small challenge: “${line}”${done ? ' You marked it done today.' : ' On Today’s journal card, Done marks it and Another one gives a different one. Nothing is counted.'}`, `De kleine uitdaging van vandaag: “${line}”${done ? ' Je hebt hem vandaag als gedaan gemarkeerd.' : ' Op de dagboekkaart van Today markeert Gedaan hem en geeft Een andere een nieuwe. Er wordt niets geteld.'}`), JOURNAL_CALLS);
}
/** "where can I vent", "waar kan ik mijn hart luchten": the page that is never saved (no data read). */
function ventAnswer(a: Asked): LocalReply | null {
  const en = /\bwhere can i (?:vent|rant|let it out|get (?:something|it|this) off my chest)\b|\b(?:a )?(?:page|place|space) to (?:vent|rant|let go)\b|\bwrite (?:it )?out without (?:saving|keeping)\b/.test(a.f), nl = /\bwaar kan ik (?:mijn hart luchten|stoom afblazen|even razen|het kwijt)\b|\b(?:plek|pagina|ruimte) om (?:te )?(?:razen|stoom af te blazen|los te laten)\b/.test(a.f);
  if (!(en || nl)) return null;
  return answer(say(a.lang, 'In Journal → Write, open “Write it out”: a page that is never saved — no draft, nothing on this device, nothing sent. “Let it go” clears it with a calm line; “Keep as an entry” is the only way it is kept.', 'Open in Journal → Write “Write it out”: een pagina die nooit wordt bewaard — geen concept, niets op dit apparaat, niets verstuurd. “Laat het gaan” wist hem met een rustige zin; alleen “Bewaar als dagboekstuk” bewaart hem.'));
}

// ── Moodnotes: feelings with a strength (LEDGER #232) ──────────────────────────────────────────────────────────────

/** "what feelings did I log today", "welke gevoelens heb ik vandaag": the day's words with their strengths (Health's gate). */
function feelingsAnswer(a: Asked): LocalReply | null {
  const en = /\b(?:what|which) (?:feelings?|feeling words?|emotions?) (?:did i (?:log|pick|choose|note)|have i (?:logged|picked|noted)|do i have)\b|\bmy feeling words?\b/.test(a.f), nl = /\bwelke (?:gevoelens?|gevoelswoorden|emoties?) (?:heb ik|had ik)\b|\bmijn gevoelswoorden\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const energy = a.env.energy ?? {version: 1, days: {}}, lang = a.lang, calls = [{tool: 'energy', args: {}, label: 'Energy and feelings'}];
  const today = feelingsOn(energy, a.today);
  if (today.length) return answer(say(lang, `Today: ${feelingsLine(today, 'en')}.`, `Vandaag: ${feelingsLine(today, 'nl')}.`), calls);
  for (let i = 1; i <= 6; i++) { const day = addLocalDays(a.today, -i), f = feelingsOn(energy, day); if (f.length) return answer(say(lang, `No feeling word today yet. The last one, ${i === 1 ? 'yesterday' : `${i} days ago`}: ${feelingsLine(f, 'en')}.`, `Vandaag nog geen gevoelswoord. Het laatste, ${i === 1 ? 'gisteren' : `${i} dagen geleden`}: ${feelingsLine(f, 'nl')}.`), calls); }
  return answer(say(lang, 'No feeling word in the last 7 days. After today’s energy, “Add a feeling word” lets you pick up to three, each with how strong it feels (a little, quite, very).', 'De afgelopen 7 dagen geen gevoelswoord. Na je energie van vandaag kun je met “Add a feeling word” er tot drie kiezen, elk met hoe sterk het voelt (een beetje, best wel, heel erg).'), calls);
}

// ── Moodnotes: thinking traps and the thought check (LEDGER #233) ───────────────────────────────────────────────────

/** "what are thinking traps", "wat zijn denkvalkuilen": the twelve, and where the exercise is. Self-reflection only. */
function trapsAnswer(a: Asked): LocalReply | null {
  const en = /\b(?:what are|which are|list|show)(?: the| my)? thinking traps\b|\bwhat is a thinking trap\b|\bthought check(?:er)?\b|\bthinking traps? (?:do i|did i)\b/.test(a.f), nl = /\bdenkvalkuil(?:en)?\b|\bgedachtecheck\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const lang = a.lang, names = TRAPS.map(x => x.name[lang]).join(', ');
  const base = say(lang, `Thinking traps are common ways a thought can tilt: ${names}. In Journal → Write, “Check a thought” walks through what happened, the thought, any traps that fit and another way to see it, and saves it as an entry. Self-reflection, not a diagnosis or a treatment.`,
    `Denkvalkuilen zijn gewone manieren waarop een gedachte kan scheeftrekken: ${names}. In Journal → Write loopt “Check a thought” door wat er gebeurde, de gedachte, passende valkuilen en een andere kijk, en bewaart het als dagboekstuk. Zelfreflectie, geen diagnose of behandeling.`);
  if (!a.env.journal || closed(a.env, 'today', 'journal')) return answer(base, JOURNAL_CALLS);
  const st = thoughtCheckStats(a.env.journal.entries);
  if (!st.checks) return answer(base, JOURNAL_CALLS);
  const top = st.traps.slice(0, 3).map(t => `${trapById(t.id)!.name[lang]} (${t.count})`).join(', ');
  return answer(`${base} ${say(lang, `You have done ${st.checks} thought ${st.checks === 1 ? 'check' : 'checks'}${top ? `; the traps you noticed most: ${top}` : ''}.`, `Je deed ${st.checks} ${st.checks === 1 ? 'gedachtecheck' : 'gedachtechecks'}${top ? `; de valkuilen die je het vaakst zag: ${top}` : ''}.`)}`, JOURNAL_CALLS);
}

// ── Fitbod: places and equipment, a workout for today, replace an exercise (LEDGER #239–#241) ───────────────────────

const WORKOUT_CALLS = [{tool: 'workouts', args: {}, label: 'Workouts'}];
/** The places record, once the lead adds it to the AK tool sources (`workoutPlaces`); null until then (any place). */
const placesOf = (a: Asked): WorkoutPlaces | null => (a.env.ak as {workoutPlaces?: WorkoutPlaces | null} | undefined)?.workoutPlaces ?? null;
const MUSCLE_NL: Record<string, string> = {Chest: 'borst', Back: 'rug', Legs: 'benen', Shoulders: 'schouders', Arms: 'armen', Core: 'romp'};
/** "what should I train today", "wat zal ik vandaag trainen": the suggestion from the person's own log (a suggestion, not a plan). */
function todayWorkoutAnswer(a: Asked): LocalReply | null {
  const en = /\bwhat (?:should|shall|could) i (?:train|work out|lift|do at the gym)(?: today)?\b|\b(?:workout|training) (?:for|made for) today\b|\bwhich muscles (?:are fresh|should i train)\b/.test(a.f), nl = /\bwat (?:zal|moet|kan) ik vandaag (?:trainen|doen in de sportschool)\b|\bwat (?:zal|moet|kan) ik trainen\b|\bworkout voor vandaag\b|\bwelke spieren zijn (?:fris|uitgerust)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = logOf(a), lang = a.lang, place = currentPlace(placesOf(a));
  const s = suggestWorkout({w, library: EXERCISES, now: new Date(a.env.now), today: a.env.healthDay, place, minutes: 45});
  if (!s.exercises.length) return answer(say(lang, 'Nothing in the library fits the equipment of your place for now. Add equipment under Health → Workouts → Places and equipment, or choose Any place.', 'Niets in de bibliotheek past bij het materiaal van je huidige plek. Voeg materiaal toe onder Health → Workouts → Places and equipment, of kies Any place.'), WORKOUT_CALLS);
  const groups = s.groups.map(g => lang === 'nl' ? MUSCLE_NL[g.muscle] ?? g.muscle : g.muscle.toLowerCase()).join(', ');
  const list = s.exercises.map(x => `• ${x.name}: ${x.sets.length} × ${x.sets[0]?.weightKg !== undefined ? `${x.sets[0].weightKg} kg × ${x.sets[0].reps}` : x.sets[0]?.reps !== undefined ? `${x.sets[0].reps} ${say(lang, 'reps', 'herhalingen')}` : x.sets[0]?.seconds !== undefined ? `${x.sets[0].seconds} s` : '—'}${x.from === 'new' ? say(lang, ' (new to your log)', ' (nieuw in je logboek)') : ''}`);
  const head = say(lang, `A suggestion for about 45 minutes, for your freshest groups (${groups})${s.place ? ` at ${s.place}` : ''}, from your own last sets:`, `Een voorstel voor ongeveer 45 minuten, voor je frisste spiergroepen (${groups})${s.place ? ` in ${s.place}` : ''}, op basis van je eigen laatste sets:`);
  const tail = say(lang, `${s.tired ? 'Everything is still recovering, so keep it light. ' : ''}Change it or start it in Health → Workouts → Suggest a workout for today. A suggestion, not a programme.`, `${s.tired ? 'Alles is nog aan het herstellen, dus houd het licht. ' : ''}Pas het aan of start het in Health → Workouts → Suggest a workout for today. Een voorstel, geen programma.`);
  return answer([head, ...list, tail].join('\n'), WORKOUT_CALLS);
}
/** "what equipment does the bench press need", "welk materiaal heb ik nodig voor bankdrukken". */
function equipmentAnswer(a: Asked): LocalReply | null {
  const en = /\b(?:what|which) (?:equipment|gear|kit)\b.*\b(?:need|needs|for|use)\b|\bequipment (?:for|of)\b/.test(a.f), nl = /\b(?:welk|wat voor) (?:materiaal|apparatuur|spullen)\b|\bmateriaal (?:voor|bij)\b/.test(a.f);
  if (!(en || nl)) return null;
  const e = exerciseIn(a.f);
  if (!e) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, words = needsWords(e.id, lang), place = currentPlace(placesOf(a));
  if (!words) return null;
  const here = place ? say(lang, ` Your place for now, ${place.name}, has: ${place.equipment.filter(x => x in EQUIPMENT_WORDS).map(x => EQUIPMENT_WORDS[x as keyof typeof EQUIPMENT_WORDS].en).join(', ') || 'body weight only'}.`, ` Je huidige plek, ${place.name}, heeft: ${place.equipment.filter(x => x in EQUIPMENT_WORDS).map(x => EQUIPMENT_WORDS[x as keyof typeof EQUIPMENT_WORDS].nl).join(', ') || 'alleen lichaamsgewicht'}.`) : '';
  return answer(say(lang, `${e.name} needs: ${words}.${here}`, `${e.name} vraagt: ${words}.${here}`), WORKOUT_CALLS);
}
/** "what can I do instead of the bench press", "wat kan ik doen in plaats van bankdrukken": similar exercises. */
function insteadAnswer(a: Asked): LocalReply | null {
  const en = /\binstead of\b|\b(?:replace|swap|substitute|alternative (?:to|for))\b/.test(a.f), nl = /\bin plaats van\b|\b(?:vervangen|vervanger|alternatief voor)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const e = exerciseIn(a.f);
  if (!e) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, place = currentPlace(placesOf(a)), ex = EXERCISES.find(x => x.id === e.id)!;
  const list = alternatives(ex, logOf(a), place ? place.equipment : null, [], 6, false);
  if (!list.length) return answer(say(lang, `No similar built-in exercise fits${place ? ` ${place.name}'s equipment` : ''} for ${e.name}.`, `Geen vergelijkbare oefening past${place ? ` bij het materiaal van ${place.name}` : ''} voor ${e.name}.`), WORKOUT_CALLS);
  return answer(say(lang, `Instead of ${e.name} (the same main muscle${place ? `, with what ${place.name} has` : ''}): ${list.map(x => x.name).join(', ')}. While you train, Replace on the exercise swaps it and keeps your sets.`, `In plaats van ${e.name} (dezelfde hoofdspier${place ? `, met wat ${place.name} heeft` : ''}): ${list.map(x => x.name).join(', ')}. Tijdens het trainen wisselt Replace bij de oefening hem om en houdt je sets.`), WORKOUT_CALLS);
}

const ANSWERS: ((a: Asked) => LocalReply | null)[] = [needAnswer, napsAnswer, morningAnswer, challengeAnswer, ventAnswer, feelingsAnswer, trapsAnswer, todayWorkoutAnswer, equipmentAnswer, insteadAnswer];

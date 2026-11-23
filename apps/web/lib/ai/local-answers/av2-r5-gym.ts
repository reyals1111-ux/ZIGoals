import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, dayIn, isQuestion, list, MIXED, say, type Asked} from './av-words';
import type {LocalReply} from './engine';
import {formatNumber} from '../../visual-format';
import {addLocalDays} from '../../local-date';
import type {PlannedRecord} from '../../workouts/planned';
import {currentStatus, lastEnded, pausesOf, STATUS_WORDS} from '../../workouts/status';
import {bandWords, movementBand} from '../../workouts/movement';
import {favourites} from '../../workouts/journal';
import {keepingRoutines} from '../../workouts/keep-weights';
import {EASIER_WORDS} from '../../workouts/feel';
import {EVERYDAY_MOVES} from '../../health-everyday-moves';
import {emptyWorkouts, type Workouts} from '../../workouts/schema';

/**
 * Session AV lane 2, round 5 (gym; Gentler Streak, Bevel): NOVA's and ZIGi's on-device answers to the round's Workouts
 * features, in English and Dutch, each read from the feature's own pure function (the same figures the page shows),
 * behind Health's gate. Every pattern reads the whole question; a question with an action in it is left alone. Never a
 * calorie figure, never a reading of the body, never advice. Wired into engine.ts by the lead, beside `av2R4HealthAnswer`.
 * The workout log and the plan come from the AK tool sources (`workouts`, `plannedWorkouts`, both wired already).
 */
export function av2R5GymAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of ANSWERS) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}
type Ak = {workouts?: Workouts | null; plannedWorkouts?: PlannedRecord | null};
const ak = (a: Asked) => (a.env.ak ?? {}) as Ak;
const logOf = (a: Asked): Workouts => ak(a).workouts ?? emptyWorkouts();
const CALLS = [{tool: 'health_summary', args: {}, label: 'Health summary'}];
const min = (lang: 'en' | 'nl', n: number) => `${lang === 'nl' ? n.toLocaleString('nl-NL') : formatNumber(n)} min`;
const WORKOUT = /\b(?:workouts?|training|train|gym|exercise)\b/, TRAIN_NL = /\b(?:workouts?|training|trainen|sporten|sportschool|gym)\b/;

/** "what is my workout status", "am I on a break from training", "wat is mijn trainingsstatus" (LEDGER #374). */
function statusAnswer(a: Asked): LocalReply | null {
  const en = /\b(?:workout|training) status\b|\bmy status\b.*\b(?:workouts?|training)\b|\b(?:am i|is my training) (?:on a break|paused)\b|\bon a (?:training )?break from (?:training|workouts?|the gym)\b/.test(a.f);
  const nl = /\btrainingsstatus\b|\bworkoutstatus\b|\bmijn status\b.*\b(?:workouts?|training)\b|\b(?:pauze|even pauze) van (?:trainen|sporten|workouts?)\b|\bsta ik op pauze\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const rec = ak(a).plannedWorkouts, today = a.env.healthDay, open = currentStatus(rec, today), ended = open ? null : lastEnded(rec, today), lang = a.lang;
  if (open) return answer(say(lang, `${STATUS_WORDS[open.kind].en} since ${dayIn('en', open.from, today)}. Until you clear it in Health → Workouts → Your status, its planned workouts are set aside (never missed), those weeks do not break your week streak, and your training load is not compared.`,
    `${STATUS_WORDS[open.kind].nl} sinds ${dayIn('nl', open.from, today)}. Tot je hem wist in Health → Workouts → Your status worden geplande workouts opzijgezet (nooit gemist), breken die weken je weekreeks niet en wordt je trainingsbelasting niet vergeleken.`), CALLS);
  if (ended) return answer(say(lang, `No status is set now. Your last one (${STATUS_WORDS[ended.kind].since}) ended on ${dayIn('en', ended.to!, today)}: back after a break.`, `Er staat nu geen status aan. Je laatste (${STATUS_WORDS[ended.kind].sinceNl}) eindigde op ${dayIn('nl', ended.to!, today)}: terug na een pauze.`), CALLS);
  return answer(say(lang, 'No status is set. When you are ill, injured, on a break or travelling, set one in Health → Workouts → Your status: planned workouts wait and your week streak is kept.', 'Er staat geen status aan. Ben je ziek, geblesseerd, even met pauze of op reis, zet er dan een in Health → Workouts → Your status: geplande workouts wachten en je weekreeks blijft staan.'), CALLS);
}

/** "how much have I moved this week", "what is my movement band", "hoeveel heb ik deze week bewogen" (LEDGER #375). */
function bandAnswer(a: Asked): LocalReply | null {
  const en = /\bmovement band\b|\bactivity range\b|\bhow much (?:have i|did i) (?:move|moved|been moving)\b|\bhow much movement\b|\bmy usual (?:week|range)\b.*\b(?:movement|moving|active)\b/.test(a.f);
  const nl = /\bbewegingsband\b|\bhoeveel (?:heb ik|bewoog ik)\b.*\bbewogen\b|\bhoeveel beweging\b|\bmijn gewone (?:week|bandbreedte)\b.*\bbeweg\w*\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const today = a.env.healthDay, b = movementBand(logOf(a), a.env.health?.activity ?? [], today, pausesOf(ak(a).plannedWorkouts, today)), lang = a.lang;
  const head = say(lang, `This week so far: ${min('en', b.weekTotal)} (${min('en', b.weekWorkouts)} of workouts, ${min('en', b.weekOther)} of other movement).`, `Deze week tot nu toe: ${min('nl', b.weekTotal)} (${min('nl', b.weekWorkouts)} workouts, ${min('nl', b.weekOther)} andere beweging).`);
  const open = today < addLocalDays(b.monday, 6);
  const nlWords = b.word === 'few' ? 'Je gewone bandbreedte heeft drie van je laatste zes weken met beweging nodig; die zijn er nog niet.'
    : b.word === 'inside' ? `Binnen je gewone bandbreedte (${b.low}–${b.high} min per week).` : b.word === 'above' ? `Boven je gewone bandbreedte (${b.low}–${b.high} min per week).` : `Onder je gewone bandbreedte (${b.low}–${b.high} min per week)${open ? ' tot nu toe; de week loopt tot zondag' : ''}.`;
  return answer(`${head} ${say(lang, bandWords(b), nlWords)} ${say(lang, 'From your own workouts and Health activity; never calories. Health → Workouts shows the band and the last 30 days.', 'Uit je eigen workouts en Health-activiteit; nooit calorieën. Health → Workouts toont de band en de laatste 30 dagen.')}`, CALLS);
}

/** "how much everyday movement did I do this week", "hoeveel dagelijkse beweging heb ik deze week gedaan" (LEDGER #376). */
function everydayAnswer(a: Asked): LocalReply | null {
  if (!(/\beveryday (?:movement|activit\w*)\b|\b(?:gardening|housework|chores)\b.*\b(?:this week|minutes?|how much)\b|\bhow much\b.*\b(?:gardening|housework|chores)\b/.test(a.f) || /\bdagelijkse beweging\b|\balledaagse beweging\b|\b(?:tuinieren|huishouden)\b.*\b(?:deze week|minuten|hoeveel)\b|\bhoeveel\b.*\b(?:tuinieren|huishouden)\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const today = a.env.healthDay, from = addLocalDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7)), names = new Map(EVERYDAY_MOVES.flatMap(m => [[m.en.toLowerCase(), m], [m.nl.toLowerCase(), m]] as const)), lang = a.lang;
  const by = new Map<string, number>();
  for (const x of a.env.health?.activity ?? []) { const m = names.get(x.name.trim().toLowerCase()); if (m && x.date >= from && x.date <= today && x.minutes > 0) by.set(lang === 'nl' ? m.nl : m.en, (by.get(lang === 'nl' ? m.nl : m.en) ?? 0) + x.minutes); }
  const total = [...by.values()].reduce((t, n) => t + n, 0);
  if (!total) return answer(say(lang, 'No everyday movement logged this week yet. In Health → Activity, name it — gardening, housework, walking the dog, a wheelchair push, carrying a child, commuting by bike — with its minutes. It counts as active minutes, with no energy figure.', 'Deze week is er nog geen dagelijkse beweging gelogd. Geef het in Health → Activity een naam — tuinieren, huishouden, de hond uitlaten, rolstoel duwen, een kind dragen, op de fiets naar het werk — met de minuten. Het telt als actieve minuten, zonder energiecijfer.'), CALLS);
  const parts = [...by].map(([n, m]) => `${n.toLowerCase()} ${min(lang, m)}`);
  return answer(say(lang, `Everyday movement this week: ${min('en', total)} (${list(parts, 'en')}). It counts with your active minutes; ZIGoals shows no energy figure for it.`, `Dagelijkse beweging deze week: ${min('nl', total)} (${list(parts, 'nl')}). Het telt mee in je actieve minuten; ZIGoals toont er geen energiecijfer bij.`), CALLS);
}

/** "which workouts are my favourites", "welke workouts zijn mijn favorieten" (LEDGER #377). */
function favouritesAnswer(a: Asked): LocalReply | null {
  if (!(/\bfavou?rites?\b.*\bworkouts?\b|\bworkouts?\b.*\bfavou?rites?\b|\bstarred workouts?\b/.test(a.f) || /\bfavoriete? (?:workouts?|trainingen)\b|\b(?:workouts?|trainingen)\b.*\bfavorie\w*\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const favs = favourites(logOf(a)), today = a.env.healthDay, lang = a.lang;
  if (!favs.length) return answer(say(lang, 'No favourite workouts yet. In Health → Workouts → Your workouts, open a workout and choose Favourite; "Favourites" above the list then shows only those.', 'Nog geen favoriete workouts. Open in Health → Workouts → Your workouts een workout en kies Favourite; "Favourites" boven de lijst toont dan alleen die.'), CALLS);
  const items = favs.slice(0, 5).map(x => `${x.name} (${dayIn(lang, x.date, today)}${(x.photos ?? []).length ? `, ${(x.photos ?? []).length} ${say(lang, (x.photos ?? []).length === 1 ? 'photo' : 'photos', (x.photos ?? []).length === 1 ? 'foto' : "foto's")}` : ''})`);
  return answer(say(lang, `Your favourite workouts: ${list(items, 'en')}${favs.length > 5 ? `, and ${favs.length - 5} more` : ''}.`, `Je favoriete workouts: ${list(items, 'nl')}${favs.length > 5 ? `, en nog ${favs.length - 5}` : ''}.`), CALLS);
}

/** "which routines keep my last weights", "welke routines onthouden mijn laatste gewichten" (LEDGER #373). */
function keepAnswer(a: Asked): LocalReply | null {
  const routine = /\broutines?\b/.test(a.f);
  if (!(routine && ((/\b(?:keeps?|remembers?|updates?)\b/.test(a.f) && /\bweights?\b/.test(a.f)) || (/\b(?:onthoud\w*|bewaar\w*|houdt?)\b/.test(a.f) && /\bgewicht\w*\b/.test(a.f))))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const names = keepingRoutines(logOf(a)).map(t => t.name), lang = a.lang;
  if (!names.length) return answer(say(lang, 'None of your routines keeps its last weights yet. In Health → Workouts, choose Edit on a routine and tick "Keep my last weights": finishing a workout from it then writes your weights and reps back into it, with Undo.', 'Nog geen van je routines onthoudt de laatste gewichten. Kies in Health → Workouts bij een routine Edit en vink "Keep my last weights" aan: een workout ermee afronden schrijft je gewichten en herhalingen er dan in terug, met Ongedaan maken.'), CALLS);
  return answer(say(lang, `${list(names, 'en')} ${names.length === 1 ? 'keeps its' : 'keep their'} last weights: finishing a workout from ${names.length === 1 ? 'it' : 'one'} writes the weights and reps you did back into the routine.`, `${list(names, 'nl')} ${names.length === 1 ? 'onthoudt' : 'onthouden'} de laatste gewichten: een workout ermee afronden schrijft je gewichten en herhalingen terug in de routine.`), CALLS);
}

/** "can today's workout be easier when I'm tired", "kan mijn workout lichter als ik moe ben" (LEDGER #372): how it works. */
function feelAnswer(a: Asked): LocalReply | null {
  const en = /\b(?:tired|sore)\b/.test(a.f) && (WORKOUT.test(a.f) || /\bsuggest\w*\b/.test(a.f)) && /\b(?:easier|lighter|shorter|change|adapt|adjust)\b/.test(a.f);
  const nl = /\b(?:moe|stijf)\b/.test(a.f) && (TRAIN_NL.test(a.f) || /\bvoorstel\b/.test(a.f)) && /\b(?:lichter|korter|makkelijker|rustiger|aanpass\w*|anders)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  return answer(say(a.lang, `Yes. In Health → Workouts → "Suggest a workout for today", choose how you feel. Tired: ${EASIER_WORDS.tired.en.replace(/^An easier day: /, '')} Sore: ${EASIER_WORDS.sore.en.replace(/^A lighter day: /, '')} On those days you can start an easy walk instead. Your answer is used for that suggestion only and is not kept.`,
    `Ja. Kies bij het workoutvoorstel van vandaag in Health → Workouts hoe je je voelt. Moe: ${EASIER_WORDS.tired.nl.replace(/^Een rustigere dag: /, '')} Stijf: ${EASIER_WORDS.sore.nl.replace(/^Een lichtere dag: /, '')} Op die dagen kun je in plaats daarvan een rustige wandeling beginnen. Je antwoord geldt alleen voor dat voorstel en wordt niet bewaard.`));
}

/** "how do I count plates on one side", "hoe reken ik schijven aan één kant" (LEDGER #378): how it works, and the kept set-up. */
function oneSideAnswer(a: Asked): LocalReply | null {
  if (!(/\bplates?\b.*\b(?:one side|single[- ]sided|one horn|sled|machine)\b|\b(?:single[- ]sided|one[- ]sided)\b.*\b(?:plates?|machine|sled)\b/.test(a.f) || /\bschijven\b.*\b(?:een kant|één kant|1 kant|slede|machine)\b|\b(?:eenzijdig|enkelzijdig)\b.*\b(?:schijven|machine|slede)\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const p = logOf(a).plates, lang = a.lang;
  const kept = p?.oneSide ? say(lang, ` Your plate set is loaded on one side now, with the machine’s own ${formatNumber(p.start ?? 0)} ${p.unit}.`, ` Je schijvenset staat nu op één kant, met het eigen gewicht van de machine: ${(p.start ?? 0).toLocaleString('nl-NL')} ${p.unit}.`) : '';
  return answer(say(lang, `Under an exercise in a workout, open "Warm-up and plates", then "Your bar and plates", tick "Loaded on one side" and type the machine’s or sled’s own weight. The calculator then lists the plates for that one horn, using both plates of each pair, and the warm-up rounds to it.${kept}`,
    `Open onder een oefening in een workout "Warm-up and plates", dan "Your bar and plates", vink "Loaded on one side" aan en vul het eigen gewicht van de machine of slede in. De rekenhulp geeft dan de schijven voor die ene kant, met beide schijven van elk paar, en de warming-up rondt daarop af.${kept}`), CALLS);
}

const ANSWERS: ((a: Asked) => LocalReply | null)[] = [statusAnswer, bandAnswer, everydayAnswer, favouritesAnswer, keepAnswer, feelAnswer, oneSideAnswer];

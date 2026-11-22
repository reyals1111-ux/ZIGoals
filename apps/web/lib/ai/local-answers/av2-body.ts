import {finished} from '../../workouts/engine';
import {HOW_TOS, howToOf, muscleList, type HowTo} from '../../workouts/howto';
import {allExercises, EXERCISES} from '../../workouts/library';
import {pinnedNoteOf} from '../../workouts/notes';
import {GUIDES} from '../../workouts/routine-library';
import {routineGroups} from '../../workouts/routines';
import {targetFor} from '../../workouts/progression';
import {monthFigures, muscleWeeks, previousMonth} from '../../workouts/analytics';
import {categoryLookup} from '../../workouts/depth';
import {weekStreak, workoutYear} from '../../workouts/calendar';
import {clockFromNoon} from '../../sleep/engine';
import {eveningOf, readiness, sortSteps, stepClock} from '../../evening-plan/plan';
import type {EveningRecord} from '../../evening-plan/schema';
import type {Sleep} from '../../sleep/schema';
import {latencySeries, usualSleep, USUAL_MIN_NIGHTS, weekVsUsual} from '../../sleep/usual';
import {goalProgress, LOAD_WORDS, paceText, runSummary, runWords, trainingLoad} from '../../workouts/runs';
import type {Workouts} from '../../workouts/schema';
import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {answer, asked, clockIn, closed, dayIn, hm, isQuestion, MIXED, monthIn, num, say, type Asked} from './av-words';
import type {LocalReply} from './engine';
import {fold} from './exact/text';

/**
 * Session AV lane 2 (body): NOVA's and ZIGi's on-device answers to the sleep, workouts and body features of lane 2, in
 * English and Dutch, each read from the feature's own pure function (the same figures the page shows) and only under the
 * Health switch (its three-part gate, `closed(env, 'health')`). Every pattern reads the whole question, so nothing else is
 * claimed; a question with an action in it is left to the model or a card. Wired into engine.ts by the lead, beside
 * `avAnswer`.
 */
export function av2BodyAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f)) return null;
    for (const one of BODY_ANSWERS) {
      const r = one(a);
      if (r) return r;
    }
    return null;
  } catch { return null; }
}

const CALLS = [{tool: 'workouts', args: {}, label: 'Workouts'}];
const emptyLog = (): Workouts => ({version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90});
/** The workout log the answer may read (Health's gate first), or an empty one. */
export const logOf = (a: Asked): Workouts => a.env.ak?.workouts ?? emptyLog();

// ── The exercise library (LEDGER #116, #119) ───────────────────────────────────────────────────────────────────────

/** Dutch and casual names for the built-in exercises, folded. */
const EXERCISE_WORDS: Record<string, string> = {
  bankdrukken: 'bench-press', bankdruk: 'bench-press', 'bench press': 'bench-press', bench: 'bench-press', squat: 'squat', squats: 'squat', kniebuiging: 'squat', kniebuigingen: 'squat', 'front squat': 'front-squat',
  deadlift: 'deadlift', deadlifts: 'deadlift', 'romanian deadlift': 'romanian-deadlift', rdl: 'romanian-deadlift', 'overhead press': 'overhead-press', schouderdrukken: 'overhead-press', 'military press': 'overhead-press',
  'barbell row': 'barbell-row', roeien: 'rowing', 'pull up': 'pull-up', 'pull ups': 'pull-up', pullup: 'pull-up', pullups: 'pull-up', optrekken: 'pull-up', 'chin up': 'chin-up', 'chin ups': 'chin-up',
  'push up': 'push-up', 'push ups': 'push-up', pushup: 'push-up', pushups: 'push-up', opdrukken: 'push-up', opdruk: 'push-up', plank: 'plank', planken: 'plank', 'side plank': 'side-plank',
  lunge: 'lunge', lunges: 'lunge', uitvalspas: 'lunge', uitvalspassen: 'lunge', 'hip thrust': 'hip-thrust', 'hip thrusts': 'hip-thrust', 'calf raise': 'calf-raise', kuitheffen: 'calf-raise', 'leg press': 'leg-press', beenpers: 'leg-press',
  'bicep curl': 'bicep-curl', 'biceps curl': 'bicep-curl', bicepscurl: 'bicep-curl', 'kettlebell swing': 'kettlebell-swing', 'kettlebell swings': 'kettlebell-swing', burpee: 'burpee', burpees: 'burpee', dip: 'dip', dips: 'dip',
  'lat pulldown': 'lat-pulldown', 'face pull': 'face-pull', 'face pulls': 'face-pull', 'lateral raise': 'lateral-raise', 'lateral raises': 'lateral-raise', crunch: 'crunch', crunches: 'crunch', 'sit up': 'sit-up', 'sit ups': 'sit-up',
  'wall sit': 'wall-sit', 'hanging leg raise': 'hanging-leg-raise', 'skull crusher': 'skull-crusher', 'triceps pushdown': 'triceps-pushdown', 'hammer curl': 'hammer-curl', 'chest fly': 'chest-fly', 'leg curl': 'leg-curl', 'leg extension': 'leg-extension',
  'power clean': 'clean', clean: 'clean', shrug: 'shrug', shrugs: 'shrug', 'foam rolling': 'foam-rolling', foamrollen: 'foam-rolling', 'jump rope': 'jump-rope', touwtjespringen: 'jump-rope',
};
/** The built-in exercise a question names (the longest name wins: "front squat" over "squat"), or null. */
export function exerciseIn(f: string): {id: string; name: string} | null {
  const names: [string, string][] = [...Object.entries(EXERCISE_WORDS), ...EXERCISES.map(e => [fold(e.name), e.id] as [string, string])];
  const hit = names.filter(([n]) => new RegExp(`(?:^|\\s)${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`).test(f)).sort((x, y) => y[0].length - x[0].length)[0];
  if (!hit) return null;
  const e = EXERCISES.find(x => x.id === hit[1]);
  return e ? {id: e.id, name: e.name} : null;
}
const HOW_EN = /\bhow (?:do|should|can) i (?:do|perform|make|train)\b|\bhow (?:to|do you) (?:do|perform)\b|\bform (?:tips?|cues?)\b|\bproper form\b|\bgood form\b|\btechnique (?:for|of)\b/;
const HOW_NL = /\bhoe (?:doe|moet|kan) ik\b|\bhoe (?:doe|voer) (?:je|ik)\b|\b(?:uitvoering|techniek) (?:van|bij)\b|\bgoede (?:houding|uitvoering|techniek)\b/;
const MUSCLE_EN = /\b(?:what|which) muscles?\b|\bmuscles? (?:does|do|is|are)\b|\bwhat does (?:a |the )?.+ (?:work|train|target)\b/;
const MUSCLE_NL = /\bwelke spier(?:en|groepen)?\b|\bwat traint\b|\bwelke spiergroep\b/;
const howWords = (h: HowTo, lang: 'en' | 'nl') => `${h.steps[lang].map((s, i) => `${i + 1}. ${s}`).join('\n')}\n${say(lang, 'Form tip', 'Tip voor de uitvoering')}: ${h.tip[lang]}`;
/** "how do I do a squat", "hoe doe ik een squat": the written how-to (lib/workouts/howto.ts), with the exercise's pinned note. */
function howTo(a: Asked): LocalReply | null {
  if (!(HOW_EN.test(a.f) || HOW_NL.test(a.f))) return null;
  const e = exerciseIn(a.f);
  if (!e) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const h = howToOf(e.id)!, lang = a.lang, pinned = pinnedNoteOf(logOf(a), e.id);
  const head = say(lang, `${e.name} (works most: ${muscleList(h.primary, 'en')}; you need: ${h.needs.en}):`, `${e.name} (werkt vooral op: ${muscleList(h.primary, 'nl')}; je hebt nodig: ${h.needs.nl}):`);
  const note = pinned ? say(lang, `\nYour pinned note: “${clean(pinned, 200)}”.`, `\nJe vastgezette notitie: “${clean(pinned, 200)}”.`) : '';
  return answer(`${head}\n${howWords(h, lang)}${note}\n${say(lang, 'It is in Health → Workouts → Exercises and how-tos.', 'Het staat in Health → Workouts → Exercises and how-tos.')}`, CALLS);
}
/** "what muscles does the deadlift work", "welke spieren traint de deadlift". */
function musclesOf(a: Asked): LocalReply | null {
  if (!(MUSCLE_EN.test(a.f) || MUSCLE_NL.test(a.f)) || !isQuestion(a)) return null;
  const e = exerciseIn(a.f);
  if (!e) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const h = howToOf(e.id)!, lang = a.lang;
  return answer(say(lang, `${e.name} works most: ${muscleList(h.primary, 'en')}.${h.secondary.length ? ` Also: ${muscleList(h.secondary, 'en')}.` : ''} The steps are in Health → Workouts → Exercises and how-tos.`,
    `${e.name} werkt vooral op: ${muscleList(h.primary, 'nl')}.${h.secondary.length ? ` Ook op: ${muscleList(h.secondary, 'nl')}.` : ''} De stappen staan in Health → Workouts → Exercises and how-tos.`), CALLS);
}
/** "what are my pinned notes", "welke notities heb ik vastgezet": the notes pinned to exercises. */
function pinnedNotes(a: Asked): LocalReply | null {
  if (!/\bpinned (?:exercise )?notes?\b|\bnotes? (?:i |are |is )?pinned\b|\bvastgezette notities?\b|\bnotities?\b.*\bvastgezet\b|\bgepinde notities?\b/.test(a.f) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = logOf(a), notes = Object.entries(w.pinnedNotes ?? {}), lang = a.lang;
  if (!notes.length) return answer(say(lang, 'No note is pinned to an exercise yet. In Health → Workouts → Exercises and how-tos, choose an exercise and pin a note (seat height, grip): it shows every time you do it.', 'Er is nog geen notitie aan een oefening vastgezet. Kies in Health → Workouts → Exercises and how-tos een oefening en zet een notitie vast (zithoogte, grip): die verschijnt elke keer dat je hem doet.'), CALLS);
  const name = (id: string) => EXERCISES.find(e => e.id === id)?.name ?? w.exercises.find(e => e.id === id)?.name ?? finished(w).flatMap(x => x.exercises).find(e => e.exerciseId === id)?.name ?? id;
  return answer([say(lang, `${notes.length} pinned ${notes.length === 1 ? 'note' : 'notes'}:`, `${notes.length} vastgezette ${notes.length === 1 ? 'notitie' : 'notities'}:`), ...notes.slice(0, 12).map(([id, n]) => `• ${clean(name(id), 40)}: “${clean(n, 160)}”`)].join('\n'), CALLS);
}
/** "which exercises work my glutes", "welke oefeningen voor mijn billen": the library's exercises with that muscle first. */
const MUSCLE_ASK: [RegExp, HowTo['primary'][number]][] = [[/\b(?:glutes?|billen|bilspieren)\b/, 'glutes'], [/\b(?:hamstrings?)\b/, 'hamstrings'], [/\b(?:quads?|quadriceps|bovenbenen)\b/, 'quads'], [/\b(?:chest|borst|borstspieren)\b/, 'chest'],
  [/\b(?:back|rug|rugspieren|lats)\b/, 'lats'], [/\b(?:shoulders?|schouders?)\b/, 'side-delts'], [/\b(?:biceps)\b/, 'biceps'], [/\b(?:triceps)\b/, 'triceps'], [/\b(?:abs|core|buik|buikspieren)\b/, 'abs'], [/\b(?:calves|kuiten)\b/, 'calves']];
function exercisesFor(a: Asked): LocalReply | null {
  const en = /\b(?:which|what) exercises?\b.*\b(?:for|work|train|target|hit)\b/.test(a.f), nl = /\bwelke oefening(?:en)?\b.*\b(?:voor|trainen|traint|werken)\b/.test(a.f);
  if (!(en || nl)) return null;
  const m = MUSCLE_ASK.find(([re]) => re.test(a.f))?.[1];
  if (!m) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, back = m === 'lats' ? ['lats', 'upper-back'] : m === 'side-delts' ? ['side-delts', 'front-delts', 'rear-delts'] : [m];
  const list = HOW_TOS.filter(h => h.primary.some(p => back.includes(p))).map(h => EXERCISES.find(e => e.id === h.id)!.name);
  return answer(say(lang, `Exercises that work it most: ${list.slice(0, 10).join(', ')}. Each has written steps in Health → Workouts → Exercises and how-tos.`, `Oefeningen die er vooral op werken: ${list.slice(0, 10).join(', ')}. Elk heeft uitgeschreven stappen in Health → Workouts → Exercises and how-tos.`), CALLS);
}

// ── Routines (LEDGER #112, #115, #119) ─────────────────────────────────────────────────────────────────────────────

/** "what routines do I have", "welke routines heb ik": the own routines by folder, with their notes. */
function myRoutines(a: Asked): LocalReply | null {
  const en = /\b(?:what|which) (?:workout )?routines? (?:do i have|have i (?:saved|got)|are (?:saved|mine))\b|\bmy (?:workout )?routines\b|\broutine folders?\b/.test(a.f), nl = /\bwelke (?:workout ?)?routines? heb ik\b|\bmijn (?:workout ?)?routines\b|\broutinemappen?\b|\bmappen (?:met|van) (?:mijn )?routines\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a) || /\bready|\bkant en klare?\b|\blibrary\b|\bbibliotheek\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = logOf(a), lang = a.lang;
  if (!w.templates.length) return answer(say(lang, 'No routine is saved yet. In Health → Workouts, open “Ready-made routines” to save one, or save a finished workout as a routine.', 'Er is nog geen routine opgeslagen. Open in Health → Workouts “Ready-made routines” om er een te bewaren, of bewaar een afgeronde workout als routine.'), CALLS);
  const lines = routineGroups(w).map(g => `${g.folder ?? say(lang, 'No folder', 'Geen map')}: ${g.routines.map(t => `${clean(t.name, 40)}${t.note ? ` (${say(lang, 'note', 'notitie')}: ${clean(t.note, 80)})` : ''}`).join(', ')}`);
  return answer([say(lang, `${w.templates.length} ${w.templates.length === 1 ? 'routine' : 'routines'}:`, `${w.templates.length} ${w.templates.length === 1 ? 'routine' : 'routines'}:`), ...lines.map(l => `• ${l}`)].join('\n'), CALLS);
}
/** "which ready-made routines are there", "welke kant-en-klare routines zijn er": the written library. */
function readyRoutines(a: Asked): LocalReply | null {
  const en = /\b(?:ready made|readymade|premade|pre made|built in|guided) (?:workout |strength )?(?:routines?|workouts?|plans?)\b|\broutine library\b|\b(?:suggest|recommend) (?:a |me a )?(?:strength )?(?:routine|workout)\b/.test(a.f);
  const nl = /\bkant en klare? (?:routines?|workouts?|trainingen)\b|\broutinebibliotheek\b|\b(?:stel|raad) (?:een |me een )?(?:routine|workout|training) voor\b|\bwelke routines zijn er\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, home = /\b(?:home|thuis|no equipment|zonder spullen|bodyweight|lichaamsgewicht)\b/.test(a.f), short = /\b(?:short|quick|kort|korte|snel|10 min)\b/.test(a.f);
  const list = GUIDES.filter(g => (!home || g.folder.en === 'At home') && (!short || g.minutes <= 25));
  return answer([say(lang, `${list.length} written routines${home ? ' for at home' : short ? ' for a short session' : ''}, in Health → Workouts → Ready-made routines (save one and it is yours to change):`, `${list.length} uitgeschreven routines${home ? ' voor thuis' : short ? ' voor een korte sessie' : ''}, in Health → Workouts → Ready-made routines (bewaar er een en pas hem aan):`),
    ...list.map(g => `• ${g.name[lang]} (${g.folder[lang]}, ${say(lang, 'about', 'ongeveer')} ${g.minutes} min): ${g.about[lang]}`)].join('\n'), CALLS);
}

// ── Progression (LEDGER #109) ──────────────────────────────────────────────────────────────────────────────────────

/** "what is my next target for bench press", "wat is mijn volgende doel voor bankdrukken": the routine's rule, from the last sets. */
function nextTarget(a: Asked): LocalReply | null {
  const en = /\b(?:next|todays|today s) (?:target|goal|weight|session)\b|\bprogression\b|\bhow much should i (?:lift|put on|use)\b/.test(a.f), nl = /\bvolgende (?:doel|gewicht|training)\b|\bopbouw\b|\bprogressie\b|\bhoeveel (?:moet|zal) ik (?:tillen|nemen|doen)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const e = exerciseIn(a.f);
  if (!e && !/\brules?\b|\bregels?\b|\broutines?\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = logOf(a), lang = a.lang, ruled = w.templates.filter(t => t.progression);
  if (!ruled.length) return answer(say(lang, 'No routine has a progression rule yet. In Health → Workouts, Edit a routine and choose one: a rep range (add weight when every set reaches the top) or a step every session.', 'Nog geen routine heeft een opbouwregel. Kies in Health → Workouts bij Edit van een routine een regel: een herhalingsbereik (meer gewicht als elke set de bovenkant haalt) of een stap per training.'), CALLS);
  const rule = (t: (typeof ruled)[number]) => t.progression!.kind === 'double' ? say(lang, `${t.progression!.minReps}–${t.progression!.maxReps} reps, then +${num(t.progression!.stepKg)} kg`, `${t.progression!.minReps}–${t.progression!.maxReps} herhalingen, dan +${num(t.progression!.stepKg)} kg`) : say(lang, `+${num(t.progression!.stepKg)} kg each session`, `+${num(t.progression!.stepKg)} kg per training`);
  const lines = ruled.flatMap(t => t.exercises.filter(x => !e || x.exerciseId === e.id).map(x => {
    const target = targetFor(w, t, x.exerciseId), s = target?.sets[0];
    const what = !target || !s ? say(lang, 'no target yet (the first session sets it)', 'nog geen doel (de eerste training legt het vast)') : s.weightKg !== undefined ? `${num(s.weightKg)} kg × ${target.sets.map(y => y.reps).join('/')}` : s.reps !== undefined ? `${target.sets.map(y => y.reps).join('/')} ${say(lang, 'reps', 'herhalingen')}` : `${s.seconds} s`;
    const why = !target ? '' : target.why === 'up' ? say(lang, `: every set reached its target on ${dayIn('en', target.lastDate, a.today)}`, `: elke set haalde zijn doel op ${dayIn('nl', target.lastDate, a.today)}`) : target.why === 'more-reps' ? say(lang, `: one more rep than on ${dayIn('en', target.lastDate, a.today)}`, `: één herhaling meer dan op ${dayIn('nl', target.lastDate, a.today)}`) : say(lang, `: as on ${dayIn('en', target.lastDate, a.today)}`, `: zoals op ${dayIn('nl', target.lastDate, a.today)}`);
    return `• ${clean(t.name, 40)} (${rule(t)}), ${clean(x.name, 40)}: ${what}${why}`;
  }));
  if (!lines.length) return answer(say(lang, `${e!.name} is in no routine with a progression rule.`, `${e!.name} zit in geen routine met een opbouwregel.`), CALLS);
  return answer([say(lang, 'Next session, from your progression rule and your last sets:', 'Volgende training, volgens je opbouwregel en je laatste sets:'), ...lines.slice(0, 10)].join('\n'), CALLS);
}

// ── Progress analytics (LEDGER #117) ───────────────────────────────────────────────────────────────────────────────

const monthWord = (month: string, lang: 'en' | 'nl') => monthIn(lang, month);
/** "how did my training go this month", "hoe ging mijn training deze maand": the month's report beside the month before. */
function monthReport(a: Asked): LocalReply | null {
  const en = /\b(?:monthly|month s|months) (?:workout|training) report\b|\bhow (?:did|was|is) my training (?:go(?:ing)? )?(?:this|last) month\b|\b(?:compare|how does) my training\b.*\blast month\b|\btraining report\b/.test(a.f);
  const nl = /\bmaandrapport\b.*\btraining\b|\btrainingsrapport\b|\bhoe (?:ging|was|gaat) mijn training (?:deze|vorige) maand\b|\b(?:mijn )?training (?:vergeleken met|tegenover) vorige maand\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = logOf(a), lang = a.lang, last = /\blast month\b|\bvorige maand\b/.test(a.f) && !/\b(?:compare|vergeleken|tegenover|how does)\b/.test(a.f), month = last ? previousMonth(a.today.slice(0, 7)) : a.today.slice(0, 7);
  const lookup = categoryLookup(allExercises(w.exercises)), now = monthFigures(w, month, lookup, a.today), before = monthFigures(w, previousMonth(month), lookup, a.today);
  if (!now.workouts) return answer(say(lang, `No finished workout in ${monthWord(month, 'en')}${before.workouts ? ` (the month before: ${before.workouts})` : ''}.`, `Geen afgeronde workout in ${monthWord(month, 'nl')}${before.workouts ? ` (de maand ervoor: ${before.workouts})` : ''}.`), CALLS);
  const vs = (n: number, b: number) => b === n ? say(lang, 'same as before', 'gelijk') : `${n > b ? '+' : '−'}${num(Math.abs(Math.round((n - b) * 10) / 10))}`;
  const parts = [say(lang, `${now.workouts} workouts on ${now.days} days (${vs(now.workouts, before.workouts)})`, `${now.workouts} workouts op ${now.days} dagen (${vs(now.workouts, before.workouts)})`),
    say(lang, `${num(Math.round(now.minutes / 6) / 10)} h (${vs(Math.round(now.minutes / 6) / 10, Math.round(before.minutes / 6) / 10)} h)`, `${num(Math.round(now.minutes / 6) / 10)} uur (${vs(Math.round(now.minutes / 6) / 10, Math.round(before.minutes / 6) / 10)} uur)`),
    say(lang, `${now.sets} working sets`, `${now.sets} werksets`), ...(now.volumeKg ? [say(lang, `${num(now.volumeKg)} kg lifted (${vs(now.volumeKg, before.volumeKg)} kg)`, `${num(now.volumeKg)} kg getild (${vs(now.volumeKg, before.volumeKg)} kg)`)] : []),
    ...(now.distanceKm ? [say(lang, `${num(now.distanceKm)} km`, `${num(now.distanceKm)} km`)] : []), say(lang, `${now.bests} new personal ${now.bests === 1 ? 'best' : 'bests'}`, `${now.bests} nieuwe persoonlijke ${now.bests === 1 ? 'record' : 'records'}`)];
  const top = now.topMuscle ? say(lang, ` Most trained: ${now.topMuscle.toLowerCase()}${now.topExercise ? `; most sets: ${now.topExercise}` : ''}.`, ` Meest getraind: ${GROUP_NL[now.topMuscle] ?? now.topMuscle}${now.topExercise ? `; meeste sets: ${now.topExercise}` : ''}.`) : '';
  return answer(say(lang, `${monthWord(month, 'en')}${month === a.today.slice(0, 7) ? ' so far' : ''}, beside the month before: ${parts.join(', ')}.${top} Health → Workouts → Progress shows it.`, `${monthWord(month, 'nl')}${month === a.today.slice(0, 7) ? ' tot nu toe' : ''}, naast de maand ervoor: ${parts.join(', ')}.${top} Health → Workouts → Progress toont het.`), CALLS);
}
const GROUP_NL: Record<string, string> = {Chest: 'borst', Back: 'rug', Legs: 'benen', Shoulders: 'schouders', Arms: 'armen', Core: 'romp'};
/** "how many sets per muscle group this week", "hoeveel sets per spiergroep": the last 8 weeks, this week first. */
function setsPerMuscle(a: Asked): LocalReply | null {
  if (!/\bsets? (?:per|for each|by) muscle(?: group)?s?\b|\bmuscle groups? (?:sets|volume)\b|\bsets? per spiergroep\b|\bspiergroepen?\b.*\bsets\b/.test(a.f) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = logOf(a), lang = a.lang, m = muscleWeeks(w, categoryLookup(allExercises(w.exercises)), a.today), k = m.weeks.length - 1;
  const rows = m.rows.filter(r => r.total > 0);
  if (!rows.length) return answer(say(lang, 'No working set of a strength exercise is logged in the last 8 weeks.', 'De afgelopen 8 weken is geen werkset van een krachtoefening gelogd.'), CALLS);
  const name = (g: string) => lang === 'nl' ? GROUP_NL[g] ?? g : g.toLowerCase();
  return answer(say(lang, `Working sets per muscle group, this week / the last 8 weeks: ${rows.map(r => `${name(r.muscle)} ${r.sets[k]} / ${r.total}`).join(', ')}. Warm-ups are left out.`, `Werksets per spiergroep, deze week / de afgelopen 8 weken: ${rows.map(r => `${name(r.muscle)} ${r.sets[k]} / ${r.total}`).join(', ')}. Warming-ups tellen niet mee.`), CALLS);
}

// ── The calendar (LEDGER #118) ─────────────────────────────────────────────────────────────────────────────────────

/** "how many weeks in a row have I trained", "hoeveel weken op rij heb ik getraind": the week streak and the longest. */
function trainingStreak(a: Asked): LocalReply | null {
  const en = /\bweeks? in a row\b.*\b(?:train|trained|workout|worked out|work out|exercis|gym)|\b(?:workout|training|gym) streak\b/.test(a.f), nl = /\bweken op rij\b.*\b(?:getraind|train|workout|gesport|sport)|\b(?:workout|trainings|sport)reeks\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const s = weekStreak(logOf(a), a.env.healthDay), lang = a.lang;
  if (!s.current) return answer(say(lang, `No week in a row yet: a workout this week starts one.${s.best ? ` Your longest run was ${s.best} weeks.` : ''}`, `Nog geen week op rij: een workout deze week begint er een.${s.best ? ` Je langste reeks was ${s.best} weken.` : ''}`), CALLS);
  return answer(say(lang, `${s.current} ${s.current === 1 ? 'week' : 'weeks'} in a row with at least one workout${s.thisWeek ? ', this week included' : ' (this week has none yet, so it still counts)'}; your longest run is ${s.best} weeks. Health → Workouts → Calendar shows the month and the year.`,
    `${s.current} ${s.current === 1 ? 'week' : 'weken'} op rij met minstens één workout${s.thisWeek ? ', deze week meegeteld' : ' (deze week nog geen, dus hij telt nog)'}; je langste reeks is ${s.best} weken. Health → Workouts → Calendar toont de maand en het jaar.`), CALLS);
}
/** "how many days did I train this year", "hoeveel dagen heb ik dit jaar getraind": the year view's count. */
function trainingDaysYear(a: Asked): LocalReply | null {
  const en = /\bhow many days\b.*\b(?:train|trained|work out|worked out|exercised|gym)\b.*\b(?:this|last) year\b/.test(a.f), nl = /\bhoeveel dagen\b.*\b(?:getraind|gesport|workout)\b/.test(a.f) && /\b(?:dit|vorig) jaar\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, year = Number(a.env.healthDay.slice(0, 4)) - (/\blast year\b|\bvorig jaar\b/.test(a.f) ? 1 : 0), y = workoutYear(logOf(a), year, a.env.healthDay);
  return answer(say(lang, `${y.days} ${y.days === 1 ? 'day' : 'days'} with a workout in ${year}${y.sessions > y.days ? ` (${y.sessions} workouts)` : ''}. Health → Workouts → Calendar → Year shows each one.`, `${y.days} ${y.days === 1 ? 'dag' : 'dagen'} met een workout in ${year}${y.sessions > y.days ? ` (${y.sessions} workouts)` : ''}. Health → Workouts → Calendar → Year toont ze.`), CALLS);
}

// ── Runs, distance goals and the training load (LEDGER #110, #111) ─────────────────────────────────────────────────

const SPORT_EN: Record<string, string> = {run: 'running', ride: 'cycling', swim: 'swimming', walk: 'walking', any: 'all sports'}, SPORT_NL: Record<string, string> = {run: 'hardlopen', ride: 'fietsen', swim: 'zwemmen', walk: 'wandelen', any: 'alle sporten'};
const PERIOD_EN: Record<string, string> = {week: 'this week', month: 'this month', year: 'this year'}, PERIOD_NL: Record<string, string> = {week: 'deze week', month: 'deze maand', year: 'dit jaar'};
/** "how is my running goal going", "hoe gaat mijn hardloopdoel": each distance goal, what is left and the pace. */
function distanceGoals(a: Asked): LocalReply | null {
  const en = /\b(?:distance|running|run|cycling|ride|swim(?:ming)?|walking|mileage|km) goals?\b|\bgoal (?:for|of) (?:km|kilometres|kilometers|running|cycling)\b/.test(a.f), nl = /\b(?:afstands|hardloop|loop|fiets|zwem|wandel|kilometer)doel(?:en)?\b|\bdoel (?:voor|van) (?:km|kilometers|hardlopen|fietsen)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = logOf(a), lang = a.lang, goals = w.distanceGoals ?? [];
  if (!goals.length) return answer(say(lang, 'No distance goal is set yet. In Health → Workouts → Distance goals and training load, set one for a week, a month or a year.', 'Er is nog geen afstandsdoel. Stel in Health → Workouts → Distance goals and training load een doel in voor een week, een maand of een jaar.'), CALLS);
  const lines = goals.map(g => { const p = goalProgress(w, g, a.env.healthDay); return lang === 'nl'
    ? `• ${SPORT_NL[g.sport]} ${PERIOD_NL[g.period]}: ${num(p.km)} van ${num(g.km)} km${p.done ? ', gehaald' : `, nog ${num(p.left)} km${p.perDay ? ` (ongeveer ${num(p.perDay)} km per dag)` : ''}, ${p.onPace ? 'op schema' : 'nu achter op schema'}`}`
    : `• ${SPORT_EN[g.sport]} ${PERIOD_EN[g.period]}: ${num(p.km)} of ${num(g.km)} km${p.done ? ', reached' : `, ${num(p.left)} km to go${p.perDay ? ` (about ${num(p.perDay)} km a day)` : ''}, ${p.onPace ? 'on pace' : 'behind pace for now'}`}`; });
  return answer([say(lang, 'Your distance goals, from your own log:', 'Je afstandsdoelen, uit je eigen log:'), ...lines].join('\n'), CALLS);
}
const LOAD_NL: Record<string, string> = {none: 'Nog niets gelogd in de afgelopen vijf weken.', new: 'Dit is je eerste week hier, dus er is nog geen gewone week.', lighter: 'Lichter dan je gewone week.', usual: 'Ongeveer je gewone week.', more: 'Meer dan je gewone week.', 'much-more': 'Ruim boven je gewone week: een flinke stap. Rustig opbouwen is het gewone advies.'};
/** "what is my training load", "wat is mijn trainingsbelasting": the last 7 days beside the usual week (minutes). */
function load(a: Asked): LocalReply | null {
  if (!/\btraining (?:load|volume per week)\b|\bworkload\b.*\b(?:training|workouts?)\b|\btrainingsbelasting\b|\btrainingslast\b|\bbelasting\b.*\btraining\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const t = trainingLoad(logOf(a), a.env.healthDay, /\b(?:km|kilomet|distance|afstand)\w*\b/.test(a.f) ? 'km' : 'minutes'), lang = a.lang, u = (v: number) => t.metric === 'km' ? `${num(v)} km` : `${Math.round(v)} min`;
  return answer(say(lang, `Training load, the last 7 days: ${u(t.last7)}${t.usual !== null ? `; your usual week (the 4 weeks before): ${u(t.usual)}` : ''}. ${LOAD_WORDS[t.words]} Counted from your own ${t.metric === 'km' ? 'distance' : 'minutes'}; never calories.`,
    `Trainingsbelasting, de afgelopen 7 dagen: ${u(t.last7)}${t.usual !== null ? `; je gewone week (de 4 weken ervoor): ${u(t.usual)}` : ''}. ${LOAD_NL[t.words]} Geteld uit je eigen ${t.metric === 'km' ? 'afstand' : 'minuten'}; nooit calorieën.`), CALLS);
}
/** "how did my last run compare", "hoe was mijn laatste loop": the run's summary against the runs before it. */
function lastRun(a: Asked): LocalReply | null {
  const en = /\b(?:last|latest|most recent) run\b/.test(a.f) && /\b(?:compare|compared|how (?:did|was)|summary|go|against)\b/.test(a.f), nl = /\b(?:laatste|vorige) (?:loop|hardloopronde|run|duurloop)\b/.test(a.f) && /\b(?:vergeleken|hoe (?:ging|was)|samenvatting|tegenover)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = logOf(a), lang = a.lang, last = finished(w).find(x => runSummary(w, null, x.id));
  if (!last) return answer(say(lang, 'No run with a distance is logged yet.', 'Er is nog geen loop met een afstand gelogd.'), CALLS);
  const r = runSummary(w, a.env.ak?.splits ?? null, last.id)!;
  if (lang === 'en') return answer(`${clean(last.name, 40)}, ${dayIn('en', last.date, a.today)}: ${runWords(r)}`, CALLS);
  const vs = r.earlier === 0 ? 'Je eerste loop hier: de volgende worden ermee vergeleken.' : `Tegenover je laatste ${r.earlier === 1 ? 'loop' : `${r.earlier} lopen`}: ${r.paceDelta === 0 ? 'hetzelfde tempo' : `${Math.abs(r.paceDelta!)} s per km ${r.paceDelta! < 0 ? 'sneller' : 'langzamer'}`}, ${r.kmDelta === 0 ? 'dezelfde afstand' : `${num(Math.abs(r.kmDelta!))} km ${r.kmDelta! > 0 ? 'langer' : 'korter'}`}.`;
  return answer(`${clean(last.name, 40)}, ${dayIn('nl', last.date, a.today)}: ${num(r.km)} km in ${paceText(r.pace)} per km. ${vs}${r.fastestKm !== null ? ` Snelste kilometer ${paceText(r.fastestKm)}.` : ''}`, CALLS);
}

// ── Sleep: time to fall asleep and your usual (LEDGER #123, #124) ───────────────────────────────────────────────────

const sleepOf = (a: Asked): Sleep => a.env.health!.sleep ?? ({version: 1, nights: []} as unknown as Sleep);
const SLEEP_CALLS = [{tool: 'sleep_summary', args: {}, label: 'Sleep summary'}];
/** "how long do I take to fall asleep", "hoe lang duurt het voor ik in slaap val": the week's and the usual time. */
function fallAsleep(a: Asked): LocalReply | null {
  if (!/\bfall(?:ing)? asleep\b|\bsleep latency\b|\bin slaap (?:te )?(?:val|vallen)\b|\binslapen\b|\binslaaptijd\b/.test(a.f) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const s = sleepOf(a), lang = a.lang, week = latencySeries(s, a.env.healthDay, 7).filter(p => p.latency !== null), all = latencySeries(s, a.env.healthDay, 30).filter(p => p.latency !== null), usual = usualSleep(s, a.env.healthDay)?.latency ?? null;
  if (!all.length) return answer(say(lang, 'No time to fall asleep is logged in the last 30 days. Add it when you log a night in Health → Sleep (or import it) and I can say.', 'De afgelopen 30 dagen is geen inslaaptijd gelogd. Vul hem in als je een nacht logt in Health → Sleep (of importeer hem), dan kan ik het zeggen.'), SLEEP_CALLS);
  const avg = (v: {latency: number | null}[]) => Math.round(v.reduce((t, p) => t + p.latency!, 0) / v.length);
  return answer(say(lang, `Time to fall asleep: ${week.length ? `${avg(week)} min on average over the last 7 days (${week.length} ${week.length === 1 ? 'night' : 'nights'})` : 'none logged in the last 7 days'}; ${avg(all)} min over the last 30 days${usual !== null ? `; your usual ${usual} min (the middle of your own nights before this week)` : ''}. Health → Sleep → Over time draws it.`,
    `Inslaaptijd: ${week.length ? `gemiddeld ${avg(week)} min de afgelopen 7 dagen (${week.length} ${week.length === 1 ? 'nacht' : 'nachten'})` : 'de afgelopen 7 dagen niet gelogd'}; ${avg(all)} min de afgelopen 30 dagen${usual !== null ? `; je gewone ${usual} min (het midden van je eigen nachten vóór deze week)` : ''}. Health → Sleep → Over time tekent hem.`), SLEEP_CALLS);
}
/** "how was my sleep this week compared to usual", "hoe sliep ik deze week vergeleken met normaal": the week beside the usual. */
function sleepVsUsual(a: Asked): LocalReply | null {
  const en = /\b(?:sleep|slept)\b.*\b(?:usual|normal|typical)\b|\b(?:usual|normal|typical) (?:sleep|night|bedtime)\b/.test(a.f), nl = /\b(?:slaap|sliep|geslapen|nachtrust)\b.*\b(?:normaal|gewoonlijk|gewone|meestal)\b|\b(?:gewone|normale) (?:slaap|nacht|bedtijd)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const s = sleepOf(a), lang = a.lang, usual = usualSleep(s, a.env.healthDay), v = weekVsUsual(s, a.env.healthDay);
  if (!usual) return answer(say(lang, `There is no usual yet: it is the middle value of your own nights in the 90 days before this week, and it needs at least ${USUAL_MIN_NIGHTS} of them.`, `Er is nog geen gewone waarde: dat is het midden van je eigen nachten in de 90 dagen vóór deze week, en daarvoor zijn er minstens ${USUAL_MIN_NIGHTS} nodig.`), SLEEP_CALLS);
  const m = (n: number | null) => n === null ? '—' : hm(Math.round(n)), bed = (n: number | null) => n === null ? '—' : clockIn(lang, clockFromNoon(Math.round(n)));
  if (!v) return answer(say(lang, `No night logged in the last 7 days. Your usual: ${m(usual.asleep)} asleep, to bed at ${bed(usual.bed)} (from ${usual.nights} nights).`, `De afgelopen 7 dagen geen nacht gelogd. Je gewone: ${m(usual.asleep)} geslapen, naar bed om ${bed(usual.bed)} (uit ${usual.nights} nachten).`), SLEEP_CALLS);
  return answer(say(lang, `The last 7 days (${v.nights} nights) beside your usual (the middle of your own ${usual.nights} nights before this week): asleep ${m(v.asleep)} (usual ${m(usual.asleep)}), to bed at ${bed(v.bed)} (usual ${bed(usual.bed)})${v.latency !== null && usual.latency !== null ? `, ${v.latency} min to fall asleep (usual ${usual.latency})` : ''}${v.quality !== null && usual.quality !== null ? `, quality ${v.quality} of 5 (usual ${usual.quality})` : ''}. No outside figures: only your own nights.`,
    `De afgelopen 7 dagen (${v.nights} nachten) naast je gewone (het midden van je eigen ${usual.nights} nachten vóór deze week): geslapen ${m(v.asleep)} (gewoonlijk ${m(usual.asleep)}), naar bed om ${bed(v.bed)} (gewoonlijk ${bed(usual.bed)})${v.latency !== null && usual.latency !== null ? `, ${v.latency} min om in slaap te vallen (gewoonlijk ${usual.latency})` : ''}${v.quality !== null && usual.quality !== null ? `, kwaliteit ${v.quality} van 5 (gewoonlijk ${usual.quality})` : ''}. Geen cijfers van buiten: alleen je eigen nachten.`), SLEEP_CALLS);
}

// ── The evening plan (LEDGER #83) ──────────────────────────────────────────────────────────────────────────────────

/** The evening plan record, once the lead adds it to the AK tool sources (`eveningPlan`); undefined until then. */
const eveningOfEnv = (a: Asked): EveningRecord | null | undefined => (a.env.ak as {eveningPlan?: EveningRecord | null} | undefined)?.eveningPlan;
/** "what is my evening plan", "wat is mijn avondplan", "am I ready for bed": tonight's steps and the bar. */
function eveningPlan(a: Asked): LocalReply | null {
  const en = /\bevening (?:plan|routine)\b|\bwind ?down (?:plan|steps)\b|\bready for bed\b|\bbedtime (?:plan|routine)\b/.test(a.f), nl = /\bavond(?:plan|routine)\b|\bklaar (?:om te slapen|voor bed)\b|\bslaapklaar\b|\bbedtijdroutine\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const r = eveningOfEnv(a), lang = a.lang, calls = [{tool: 'evening_plan', args: {}, label: 'Evening plan'}];
  if (r === undefined) return answer(say(lang, 'Your evening plan is in Health → Sleep → Tonight; I can’t read it here yet.', 'Je avondplan staat in Health → Sleep → Tonight; dat kan ik hier nog niet lezen.'), calls);
  if (!r?.plan) return answer(say(lang, 'No evening plan yet. In Health → Sleep → Tonight, “Make an evening plan” asks three questions and suggests a few steps, with a bar that fills as you tick them.', 'Nog geen avondplan. In Health → Sleep → Tonight stelt “Make an evening plan” drie vragen en stelt een paar stappen voor, met een balk die vol loopt als je ze afvinkt.'), calls);
  const evening = eveningOf(a.env.now, a.env.habitZone || 'UTC'), ready = readiness(r, evening)!, ticked = new Set(r.days[evening] ?? []);
  const steps = sortSteps(r.plan.steps).map(s => `• ${clockIn(lang, stepClock(r.plan!.bedtime, s.minutesBefore))} ${clean(s.label, 60)}${ticked.has(s.id) ? say(lang, ' (done)', ' (gedaan)') : ''}`);
  const head = ready.ready ? say(lang, `Ready for bed: all ${ready.total} steps done tonight.`, `Klaar voor bed: alle ${ready.total} stappen gedaan vanavond.`) : say(lang, `Ready for bed: ${ready.done} of ${ready.total} steps tonight; lights out at ${clockIn('en', r.plan.bedtime)}.`, `Klaar voor bed: ${ready.done} van ${ready.total} stappen vanavond; licht uit om ${clockIn('nl', r.plan.bedtime)}.`);
  return answer([head, ...steps].join('\n'), calls);
}

const BODY_ANSWERS: ((a: Asked) => LocalReply | null)[] = [howTo, musclesOf, pinnedNotes, exercisesFor, myRoutines, readyRoutines, nextTarget, monthReport, setsPerMuscle, trainingStreak, trainingDaysYear, distanceGoals, load, lastRun, fallAsleep, sleepVsUsual, eveningPlan];

import {additionalNutrients, formatNutrient, scaleNutrition, type HealthDiaryEntry} from '../../health';
import {emptyMicroTargets, richIn, type MicroKey} from '../../health-aa/micro';
import {nutrientAverages} from '../../health-aa/nutrient-report';
import {sleepScore} from '../../health-aa/sleep-score';
import {dailyData} from '../../health-daily';
import {emptyNutrientExtras} from '../../health-vitamins/extras';
import {emptyHealthVitamins} from '../../health-vitamins/schema';
import {focusOf} from '../../habit-focus';
import {habitDay, latestHabitRule, measurementUnit} from '../../habits';
import {yesterdaysOpen} from '../../habits-yesterday';
import {goodThingsInMonth} from '../../journal/good-things';
import {questionOfTheDay} from '../../journal-prompts/daily';
import {JOURNAL_TEMPLATES} from '../../journal-prompts/templates';
import {addLocalDays} from '../../local-date';
import {dailySeries} from '../../sleep/engine';
import type {Sleep} from '../../sleep/schema';
import {EVERY_DAY} from '../../supplements/schema';
import {exerciseHistory, finished, volumeKg} from '../../workouts/engine';
import {clockOf, runBests} from '../../workouts/run-bests';
import {text as clean} from '../tools/format';
import {answer, clockIn, closed, count, dayIn, hm, isQuestion, journalClosed, list, monthIn, num, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';
import {fold} from './exact/text';

/**
 * Session AV (owner follow-up 2, item 1c; q3 and q4's check 5): the on-device answers to the Health, Journal and Habits
 * features of Session AV, in English and Dutch, each read from the feature's own pure function and only under its own
 * switch (Health through its three-part gate; the journal only where it is shared with this answer). Private records stay
 * private: the factor card and the symptoms log are never read here, and the answer says where they live.
 */
export function avLifeAnswer(a: Asked): LocalReply | null {
  for (const one of [moodFactors, symptoms, savedMeals, mealPlans, lifted, running, exerciseBest, dutchDiary, sleepScoreAnswer, sleepLong, nutrientAverage, highIn, supplementsTaken,
    goodThings, journalTags, journalCount, journalTemplates, journalQuestion, yesterdayOpen, focusHabit, habitsWeek, whyMissed]) {
    const r = one(a);
    if (r) return r;
  }
  return null;
}

const MEAL_NL: Record<string, string> = {Breakfast: 'Ontbijt', Lunch: 'Lunch', Dinner: 'Avondeten', Snacks: 'Tussendoor'};
const meal = (m: string, lang: Lang) => lang === 'nl' ? MEAL_NL[m] ?? m : m;
/** The sleep log, or an empty one (a fresh Health record may hold none yet). */
const sleepOf = (a: Asked): Sleep => a.env.health!.sleep ?? ({version: 1, nights: []} as unknown as Sleep);
const weekStart = (today: string) => addLocalDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));

// ── Health ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** q3 #8: "what affects my mood", "wat beïnvloedt mijn stemming" (never the Governance vote): the factor card is private. */
function moodFactors(a: Asked): LocalReply | null {
  const en = /\bwhat (?:affects|influences|impacts|goes with|drives|changes|helps)\b.*\b(?:mood|sleep|energy)\b|\b(?:mood|sleep|energy) factors?\b/.test(a.f);
  const nl = /\bwat (?:beinvloedt|beinvloed|bepaalt|hangt samen met|gaat samen met|helpt)\b.*\b(?:stemming|humeur|slaap|energie)\b|\b(?:stemming|humeur)\b.*\b(?:invloed|samen met)\b/.test(a.f);
  if (!(en || nl)) return null;
  return answer(say(a.lang, 'What goes with your mood, sleep and energy is worked out in your Life review (“What goes with your mood, sleep and energy”, the last 90 days, every habit, tag, workout and meditation set beside them). It is counted on this device and I don’t read it, so open it there. It says what went together, never what causes what.',
    'Wat samengaat met je stemming, slaap en energie staat in je Life review (“What goes with your mood, sleep and energy”, de afgelopen 90 dagen, elke gewoonte, tag, workout en meditatie ernaast gezet). Het wordt op dit apparaat geteld en ik lees het niet, dus open het daar. Het zegt wat samenging, nooit wat iets veroorzaakt.') + `\n\n\`\`\`zigoals-action\n${JSON.stringify({kind: 'open-page', page: 'review'})}\n\`\`\``);
}
/** q3 #48: "what symptoms did I log this month": the symptoms log stays private (never answered with the tasks). */
function symptoms(a: Asked): LocalReply | null {
  const en = /\bsymptoms?\b/.test(a.f) && /\b(?:my|did i|have i|i (?:logged|noted|had|have))\b/.test(a.f) && !/\bshould|\bwhat (?:are|is) (?:the )?symptoms? of\b/.test(a.f);
  const nl = /\b(?:klachten|symptomen|symptoom)\b/.test(a.f) && /\b(?:mijn|heb ik|had ik|ik)\b/.test(a.f) && !/\bmoet ik\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  return answer(say(a.lang, 'Your symptoms and factors stay private on this device: I don’t read them. They are in Health → Diary → Symptoms and factors, and a report for a visit can include them (Settings → Your data → Make a report).',
    'Je klachten en factoren blijven privé op dit apparaat: ik lees ze niet. Ze staan in Health → Diary → Symptoms and factors, en een rapport voor een afspraak kan ze meenemen (Settings → Your data → Make a report).'));
}
/** q3 #3: "what are my saved meals". */
function savedMeals(a: Asked): LocalReply | null {
  const en = /\bsaved meals?\b|\bmeals? (?:i ve |i have |have i )?saved\b/.test(a.f), nl = /\b(?:opgeslagen|bewaarde) maaltijd(?:en)?\b|\bmaaltijd(?:en)?\b.*\b(?:opgeslagen|bewaard)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, saved = dailyData(a.env.health!).savedMeals;
  if (!saved.length) return answer(say(lang, 'No meal is saved yet. Health → Meals & planning saves a day’s meal to log again in one tap.', 'Er is nog geen maaltijd opgeslagen. Health → Meals & planning bewaart een maaltijd om met één tik opnieuw te loggen.'));
  const kcal = (m: (typeof saved)[number]) => { const n = m.items.reduce((t, i) => t + (scaleNutrition(i.snapshot.nutrients, i.quantityMilli).kcal ?? 0), 0); return n ? `, ${Math.round(n)} kcal` : ''; };
  const rows = saved.slice(0, 10).map(m => `${clean(m.name, 60)} (${count(m.items.length, lang, ['item', 'items'], ['onderdeel', 'onderdelen'])}${kcal(m)})`);
  return answer(say(lang, `${count(saved.length, 'en', ['saved meal', 'saved meals'], ['', ''])}: ${list(rows, 'en')}. Health → Meals & planning logs one in a tap, or plans it into a day.`, `${count(saved.length, 'nl', ['', ''], ['opgeslagen maaltijd', 'opgeslagen maaltijden'])}: ${list(rows, 'nl')}. Health → Meals & planning logt er een met één tik, of plant hem in op een dag.`), [{tool: 'meal_plan', args: {}, label: 'Meal plan'}]);
}
/** q3 #3, #29: "what meals are planned this week", "what are my meal plans". */
function mealPlans(a: Asked): LocalReply | null {
  const en = /\bmeal plans?\b|\bmeals? (?:are |is )?planned\b|\bplanned meals?\b|\bon (?:the |my )?menu\b/.test(a.f), nl = /\bmaaltijdplan(?:nen|ning)?\b|\bgeplande maaltijden\b|\bmaaltijden\b.*\bgepland\b|\bweekmenu\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, today = a.today, next = /\bnext week\b|\bvolgende week\b/.test(a.f), from = next ? addLocalDays(weekStart(today), 7) : /\btomorrow\b|\bmorgen\b/.test(a.f) ? addLocalDays(today, 1) : /\btoday\b|\btonight\b|\bvandaag\b|\bvanavond\b/.test(a.f) ? today : weekStart(today);
  const to = from === weekStart(today) || next ? addLocalDays(from, 6) : from, span = from === to ? dayIn(lang, from, today) : `${dayIn(lang, from, today)} ${say(lang, 'to', 't/m')} ${dayIn(lang, to, today)}`;
  const plans = dailyData(a.env.health!).plans.filter(p => p.date >= from && p.date <= to).sort((x, y) => x.date.localeCompare(y.date) || x.meal.localeCompare(y.meal));
  const calls = [{tool: 'meal_plan', args: {}, label: 'Meal plan'}];
  if (!plans.length) return answer(say(lang, `Nothing is planned for ${span}. Health → Meals & planning plans a saved meal into a day.`, `Er is niets gepland voor ${span}. Health → Meals & planning plant een opgeslagen maaltijd in op een dag.`), calls);
  return answer([say(lang, `${count(plans.length, 'en', ['meal', 'meals'], ['', ''])} planned for ${span}:`, `${count(plans.length, 'nl', ['', ''], ['maaltijd', 'maaltijden'])} gepland voor ${span}:`),
    ...plans.slice(0, 14).map(p => `• ${dayIn(lang, p.date, today)}, ${meal(p.meal, lang)}: ${clean(p.name, 60)}${p.loggedAt ? say(lang, ' (logged)', ' (gelogd)') : ''}`)].join('\n'), calls);
}
/** A period of days a question names (this week by default for the workout answers). */
function weekPeriod(a: Asked): {from: string; to: string; words: string} {
  const t = a.today, ws = weekStart(t), lang = a.lang;
  if (/\blast week\b|\bvorige week\b/.test(a.f)) return {from: addLocalDays(ws, -7), to: addLocalDays(ws, -1), words: say(lang, 'last week', 'vorige week')};
  if (/\bthis month\b|\bdeze maand\b/.test(a.f)) return {from: `${t.slice(0, 7)}-01`, to: t, words: say(lang, 'this month', 'deze maand')};
  if (/\btoday\b|\bvandaag\b/.test(a.f)) return {from: t, to: t, words: say(lang, 'today', 'vandaag')};
  return {from: ws, to: t, words: say(lang, 'this week', 'deze week')};
}
/** q3 #11: "how much weight did I lift this week": the training volume (working sets, weight × reps), never the body weight. */
function lifted(a: Asked): LocalReply | null {
  const en = /\b(?:weight|kilos?|kg)\b.*\blift(?:ed)?\b|\blift(?:ed)?\b.*\b(?:weight|kilos?|kg)\b|\b(?:training|workout|lifting|strength|total) volume\b/.test(a.f);
  const nl = /\b(?:gewicht|kilo|kg)\b.*\bgetild\b|\bgetild\b.*\b(?:gewicht|kilo|kg)\b|\b(?:trainings|totaal )?volume\b.*\b(?:training|getild|krachttraining|deze week|vorige week)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = a.env.ak?.workouts, lang = a.lang, p = weekPeriod(a), calls = [{tool: 'workouts', args: {}, label: 'Workouts'}];
  if (!w) return answer(say(lang, 'No workout is logged yet.', 'Er is nog geen workout gelogd.'), calls);
  const inRange = finished(w).filter(x => x.date >= p.from && x.date <= p.to), kg = Math.round(inRange.reduce((n, x) => n + x.exercises.reduce((m, e) => m + volumeKg(e), 0), 0)), strength = inRange.filter(x => x.exercises.some(e => volumeKg(e) > 0));
  const span = p.from === p.to ? dayIn(lang, p.from, a.today) : `${dayIn(lang, p.from, a.today)} ${say(lang, 'to', 't/m')} ${dayIn(lang, p.to, a.today)}`;
  if (!kg) return answer(say(lang, `Nothing lifted is logged ${p.words} (${span}).`, `Er is ${p.words} niets getild gelogd (${span}).`), calls);
  const names = list(strength.map(x => clean(x.name, 40)), lang);
  return answer(say(lang, `You lifted ${num(kg)} kg ${p.words} (${span}): working sets, weight × reps, warm-ups left out, in ${count(strength.length, 'en', ['workout', 'workouts'], ['', ''])} (${names}). Your body weight is another question.`,
    `Je tilde ${p.words} ${num(kg)} kg (${span}): werksets, gewicht × herhalingen, zonder warming-up, in ${count(strength.length, 'nl', ['', ''], ['workout', 'workouts'])} (${names}). Je lichaamsgewicht is een andere vraag.`), calls);
}
/** q3 #13: "what is my fastest 5k", "what was my longest run" (lib/workouts/run-bests.ts, as Workouts → Running bests shows them). */
function running(a: Asked): LocalReply | null {
  const dist = /\b(1|5|10) ?(?:k|km|kilometers?|kilometres?)\b/.exec(a.f);
  const en = (dist && /\b(?:fastest|quickest|best|pr|personal best|record|time)\b/.test(a.f) && !/\bwalk/.test(a.f)) || /\blongest run\b|\b(?:running|run) (?:bests?|records?|prs?)\b|\bbest (?:run|running) times?\b/.test(a.f);
  const nl = (dist && /\b(?:snelste|beste|record|tijd|pr)\b/.test(a.f)) || /\blangste (?:loop|hardloop\w*|run|duurloop)\b|\b(?:hardloop|loop)(?:records?|prestaties)\b|\bbeste looptijd(?:en)?\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = a.env.ak?.workouts, lang = a.lang, calls = [{tool: 'workouts', args: {}, label: 'Workouts'}];
  if (!w) return answer(say(lang, 'No run is logged yet.', 'Er is nog geen loop gelogd.'), calls);
  const b = runBests(w, a.env.ak?.splits ?? null), at = (x: {name: string; date: string}) => `${clean(x.name, 40)}, ${dayIn(lang, x.date, a.today)}`;
  const timed = b.timed.map(t => `${t.km} km ${clockOf(t.seconds)} (${at(t)})`), wanted = dist ? b.timed.find(t => t.km === Number(dist[1])) : null;
  const longest = b.longest ? say(lang, `Longest run: ${num(b.longest.km)} km (${at(b.longest)}).`, `Langste loop: ${num(b.longest.km)} km (${at(b.longest)}).`) : say(lang, 'No run with a distance is logged yet.', 'Er is nog geen loop met een afstand gelogd.');
  const none = say(lang, 'No run is kept with per-kilometre splits yet (an imported GPX or TCX file keeps them), so there is no timed best.', 'Nog geen loop met tijden per kilometer (een geïmporteerd GPX- of TCX-bestand bewaart ze), dus er is geen snelste tijd.');
  const lead = dist && !wanted && timed.length ? say(lang, `No ${dist[1]} km is timed yet in your runs with splits. `, `Nog geen ${dist[1]} km getimed in je lopen met tussentijden. `) : wanted ? say(lang, `Your fastest ${wanted.km} km: ${clockOf(wanted.seconds)} (${at(wanted)}). `, `Je snelste ${wanted.km} km: ${clockOf(wanted.seconds)} (${at(wanted)}). `) : '';
  return answer(`${lead}${timed.length ? say(lang, `Your running bests, from runs kept with per-kilometre splits: ${list(timed, 'en')}.`, `Je beste looptijden, uit lopen met tijden per kilometer: ${list(timed, 'nl')}.`) : none} ${longest}`, calls);
}
const EXERCISE_NL: Record<string, string> = {bankdrukken: 'bench press', bankdruk: 'bench press', squat: 'squat', squats: 'squat', kniebuigingen: 'squat', deadlift: 'deadlift', doodtrekken: 'deadlift', schouderdrukken: 'overhead press', roeien: 'barbell row', 'biceps curl': 'bicep curl', bicepscurl: 'bicep curl', kuitheffen: 'calf raise'};
/** q3 #40: "what is my bench press best": the exercise's best set and its estimated one-rep max (lib/workouts/engine.ts exerciseHistory). */
function exerciseBest(a: Asked): LocalReply | null {
  if (!/\b(?:best|pr|personal best|record|max|maximum|heaviest|beste|zwaarste|maximaal)\b/.test(a.f) || !isQuestion(a)) return null;
  const w = a.env.ak?.workouts ?? {version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90} as unknown as NonNullable<typeof a.env.ak>['workouts'] & object;
  if (!a.env.health) return null;
  const said = Object.entries(EXERCISE_NL).reduce((s, [nl, en]) => s.replace(new RegExp(`\\b${nl}\\b`, 'g'), en), a.f);
  const names = new Map<string, string>();
  for (const x of finished(w)) for (const e of x.exercises) if (!names.has(e.exerciseId)) names.set(e.exerciseId, e.name);
  const hit = [...names].filter(([, n]) => new RegExp(`\\b${fold(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(said)).sort((x, y) => y[1].length - x[1].length)[0];
  if (!hit) {
    // A lift people ask about by name with nothing logged under it yet: said so, never the examples list.
    const known = /\b(bench press|squat|deadlift|overhead press|barbell row|pull ?ups?|push ?ups?)\b/.exec(said)?.[1];
    return known ? answer(say(a.lang, `No ${known} is logged in Workouts yet, so there is no best.`, `Er staat nog geen ${known} in Workouts, dus er is geen beste.`), [{tool: 'workouts', args: {}, label: 'Workouts'}]) : null;
  }
  const h = exerciseHistory(w, hit[0]);
  if (!h) return null;
  const lang = a.lang, sets = h.sessions.flatMap(s => s.sets.filter(x => x.kind !== 'warmup')), last = h.sessions.map(s => s.date).sort().at(-1)!;
  const heavy = sets.filter(s => s.weightKg !== undefined && s.weightKg === h.bestWeightKg).sort((x, y) => (y.reps ?? 0) - (x.reps ?? 0))[0];
  const what = h.measure === 'weight-reps' && heavy ? say(lang, `your heaviest set is ${num(heavy.weightKg!)} kg × ${heavy.reps ?? 0}${h.bestOneRepMaxKg ? ` (an estimated one-rep max of ${num(Math.round(h.bestOneRepMaxKg))} kg)` : ''}`, `je zwaarste set is ${num(heavy.weightKg!)} kg × ${heavy.reps ?? 0}${h.bestOneRepMaxKg ? ` (een geschatte 1RM van ${num(Math.round(h.bestOneRepMaxKg))} kg)` : ''}`)
    : h.mostReps ? say(lang, `your most reps in a set: ${h.mostReps}`, `je meeste herhalingen in een set: ${h.mostReps}`) : h.farthestKm ? say(lang, `your farthest: ${num(h.farthestKm)} km`, `je verste: ${num(h.farthestKm)} km`) : h.longestSeconds ? say(lang, `your longest: ${clockOf(h.longestSeconds)}`, `je langste: ${clockOf(h.longestSeconds)}`) : say(lang, 'no set with a value yet', 'nog geen set met een waarde');
  return answer(say(lang, `${clean(h.name, 40)}: ${what}, from ${count(h.sessions.length, 'en', ['session', 'sessions'], ['', ''])}; the last on ${dayIn('en', last, a.today)}. Warm-up sets are left out.`, `${clean(h.name, 40)}: ${what}, uit ${count(h.sessions.length, 'nl', ['', ''], ['training', 'trainingen'])}; de laatste op ${dayIn('nl', last, a.today)}. Warming-upsets tellen niet mee.`), [{tool: 'workouts', args: {}, label: 'Workouts'}]);
}
/** q3 #18: "wat heb ik vandaag gegeten": the diary's entries, as the English question gets them. */
function dutchDiary(a: Asked): LocalReply | null {
  if (a.lang !== 'nl' || !/^(?:en |dus )?wat (?:heb ik|at ik|hebben we)(?: (?:vandaag|gisteren|vanochtend|vanmiddag|vanavond))? (?:gegeten|op|gegeten vandaag|gegeten gisteren)$|^wat at ik (?:vandaag|gisteren)$/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const day = /\bgisteren\b/.test(a.f) ? addLocalDays(a.env.healthDay, -1) : a.env.healthDay, word = day === a.env.healthDay ? 'vandaag' : 'gisteren';
  const rows: HealthDiaryEntry[] = a.env.health!.diary.filter(d => d.date === day).sort((x, y) => ['Breakfast', 'Lunch', 'Dinner', 'Snacks'].indexOf(x.meal) - ['Breakfast', 'Lunch', 'Dinner', 'Snacks'].indexOf(y.meal) || x.createdAt.localeCompare(y.createdAt));
  const calls = [{tool: 'diary_entries', args: {}, label: 'Food diary'}];
  if (!rows.length) return answer(`Er staat ${word} niets in je eetdagboek (${dayIn('nl', day, a.today)}).`, calls);
  const line = (d: HealthDiaryEntry) => { const q = d.quantityMilli / 1000, kcal = scaleNutrition(d.snapshot.nutrients, d.quantityMilli).kcal; return `- ${meal(d.meal, 'nl')}: ${clean(d.snapshot.name, 60)} (${num(q)} ${q === 1 ? 'portie' : 'porties'}${kcal !== null && kcal !== undefined ? `, ${Math.round(kcal)} kcal` : ''})`; };
  return answer([`Je logde ${word} ${count(rows.length, 'nl', ['', ''], ['ding', 'dingen'])} (${dayIn('nl', day, a.today)}):`, ...rows.slice(0, 20).map(line)].join('\n'), calls);
}
/** q3 #27: "what is my sleep score": the score Health → Sleep shows, with its parts and its formula. */
function sleepScoreAnswer(a: Asked): LocalReply | null {
  if (!/\bsleep ?score\b|\bslaap ?score\b|\bscore (?:van|voor) (?:mijn )?slaap\b|\bscore (?:of|for) my sleep\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const s = sleepScore(sleepOf(a), a.env.healthDay), lang = a.lang, calls = [{tool: 'sleep_summary', args: {}, label: 'Sleep summary'}];
  if (s.score === null) return answer(say(lang, `There is no sleep score yet: it needs 3 logged nights in the last 7 days (${s.nights} so far).`, `Er is nog geen slaapscore: daarvoor zijn 3 gelogde nachten in de afgelopen 7 dagen nodig (nu ${s.nights}).`), calls);
  // Session AV (q3 #27): a part this week cannot know (`left`) is said as left out, never as 0 points.
  const out = new Set(s.left ?? []), nl = lang === 'nl';
  const part = (key: 'regularity' | 'debt', en: string, du: string, points: number, of: number) => out.has(key) ? (nl ? `${du} onbekend, telt niet mee` : `${en} unknown, left out`) : (nl ? `${du} ${points} van ${of}` : `${en} ${points} of ${of}`);
  const parts = nl ? [`duur ${s.duration.points} van 40`, part('regularity', 'regularity', 'regelmaat', s.consistency.points, 30), part('debt', 'debt', 'tekort', s.debt.points, 15), s.quality.points === null ? null : `kwaliteit ${s.quality.points} van 15`] : [`duration ${s.duration.points} of 40`, part('regularity', 'regularity', 'regelmaat', s.consistency.points, 30), part('debt', 'debt', 'tekort', s.debt.points, 15), s.quality.points === null ? null : `quality ${s.quality.points} of 15`];
  const goal = s.duration.goalSet ? '' : say(lang, ' Duration is set against an 8 h reference until you set your own goal in Health → Sleep.', ' De duur telt tegen 8 uur zolang je geen eigen doel hebt in Health → Sleep.');
  const scaled = s.scaled ? say(lang, ' No night was rated, so quality is left out and the other three count for 100.', ' Geen nacht kreeg een cijfer, dus kwaliteit telt niet mee en de andere drie tellen voor 100.') : '';
  const formula = say(lang, s.formula, 'duur 40 × min(1, geslapen ÷ doel) + regelmaat 30 × (1 − spreiding van bedtijd en opstaan ÷ 90 min) + tekort 15 × (1 − tekort ÷ twee nachten doel) + kwaliteit 15 × (cijfer − 1) ÷ 4');
  return answer(say(lang, `Your sleep score is ${s.score} of 100 (the last 7 days, ${s.nights} nights logged): ${list(parts.filter((p): p is string => !!p), 'en')}.${scaled}${goal} How it is counted: ${formula}.`, `Je slaapscore is ${s.score} van 100 (de afgelopen 7 dagen, ${s.nights} nachten gelogd): ${list(parts.filter((p): p is string => !!p), 'nl')}.${scaled}${goal} Zo wordt hij geteld: ${formula}.`), calls);
}
/** A long period a question names: more than 30 days, a year, or months (null: the older answers keep theirs). */
function longPeriod(a: Asked): {end: string; days: number; words: string} | null {
  const t = a.env.healthDay, lang = a.lang, y = Number(t.slice(0, 4));
  const n = /\b(?:last|past|over (?:the )?(?:last |past )?|afgelopen|laatste)\s*(\d{2,3}) (?:days|dagen)\b/.exec(a.f) ?? /\bover (\d{2,3}) days\b/.exec(a.f);
  if (n && Number(n[1]) > 30 && Number(n[1]) <= 366) return {end: t, days: Number(n[1]), words: say(lang, `the last ${n[1]} days`, `de afgelopen ${n[1]} dagen`)};
  const months = /\b(?:last|past|afgelopen|laatste) (3|three|drie|6|six|zes|12|twelve|twaalf) (?:months|maanden)\b/.exec(a.f);
  if (months) { const k = ({three: 3, drie: 3, six: 6, zes: 6, twelve: 12, twaalf: 12} as Record<string, number>)[months[1]!] ?? Number(months[1]); return {end: t, days: k === 12 ? 365 : k === 6 ? 182 : 91, words: say(lang, `the last ${k} months`, `de afgelopen ${k} maanden`)}; }
  if (/\b(?:this year|dit jaar)\b/.test(a.f)) return {end: t, days: Math.round((Date.parse(`${t}T12:00:00Z`) - Date.parse(`${y}-01-01T12:00:00Z`)) / 86_400_000) + 1, words: say(lang, 'this year', 'dit jaar')};
  if (/\b(?:last year|vorig jaar)\b/.test(a.f)) return {end: `${y - 1}-12-31`, days: (y - 1) % 4 === 0 ? 366 : 365, words: say(lang, 'last year', 'vorig jaar')};
  if (/\b(?:past year|afgelopen jaar)\b/.test(a.f)) return {end: t, days: 365, words: say(lang, 'the past year', 'het afgelopen jaar')};
  return null;
}
/** q3 #46: "how did I sleep the last 90 days", "hoe heb ik dit jaar geslapen": every night of the period, counted (never capped at 31). */
function sleepLong(a: Asked): LocalReply | null {
  if (!/\b(?:sleep|slept|sleeping|geslapen|slaap|sliep|nachtrust)\b/.test(a.f) || /\bscore\b/.test(a.f)) return null;
  const p = longPeriod(a);
  if (!p) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, points = dailySeries(sleepOf(a), p.end, p.days), logged = points.filter(x => x.asleep !== null), first = points[0]!.date;
  const span = `${p.words} (${dayIn(lang, first, a.today)} ${say(lang, 'to', 't/m')} ${dayIn(lang, p.end, a.today)})`, calls = [{tool: 'sleep_summary', args: {}, label: 'Sleep summary'}];
  if (!logged.length) return answer(say(lang, `No night is logged ${span}.`, `Er is ${span} geen nacht gelogd.`), calls);
  const avg = Math.round(logged.reduce((n, x) => n + x.asleep!, 0) / logged.length), short = [...logged].sort((x, y) => x.asleep! - y.asleep!)[0]!, long = [...logged].sort((x, y) => y.asleep! - x.asleep!)[0]!;
  return answer(say(lang, `${count(logged.length, 'en', ['night', 'nights'], ['', ''])} logged ${span}: ${hm(avg)} asleep on average; the shortest ${hm(short.asleep!)} (${dayIn('en', short.date, a.today)}), the longest ${hm(long.asleep!)} (${dayIn('en', long.date, a.today)}). Health → Sleep shows them by week or month.`,
    `${count(logged.length, 'nl', ['', ''], ['nacht', 'nachten'])} gelogd ${span}: gemiddeld ${hm(avg)} geslapen; de kortste ${hm(short.asleep!)} (${dayIn('nl', short.date, a.today)}), de langste ${hm(long.asleep!)} (${dayIn('nl', long.date, a.today)}). Health → Sleep toont ze per week of maand.`), calls);
}
const NUTRIENT_WORD: [RegExp, MicroKey][] = [[/\b(?:iron|ijzer)\b/, 'ironMg'], [/\b(?:fib(?:er|re)s?|vezels?)\b/, 'fiberMg'], [/\bcalcium\b/, 'calciumMg'], [/\b(?:potassium|kalium)\b/, 'potassiumMg'], [/\b(?:sodium|salt|natrium|zout)\b/, 'sodiumMg'], [/\bsaturated fats?\b|\bverzadigd(?:e)? vet\b/, 'saturatedFatMg'], [/\b(?:sugars?|suikers?)\b/, 'sugarMg']];
const nutrientOf = (f: string) => NUTRIENT_WORD.find(([re]) => re.test(f))?.[1] ?? null;
const NUTRIENT_NL: Record<string, string> = {ironMg: 'IJzer', fiberMg: 'Vezels', calciumMg: 'Calcium', potassiumMg: 'Kalium', sodiumMg: 'Natrium', saturatedFatMg: 'Verzadigd vet', sugarMg: 'Suikers'};
const nutrientName = (key: MicroKey, lang: Lang) => lang === 'nl' ? NUTRIENT_NL[key] ?? key : additionalNutrients.find(([k]) => k === key)?.[1] ?? key;
/** q3 #47: "average iron over the last 90 days": the nutrient report's rule — the days with a value, a day without one left out. */
function nutrientAverage(a: Asked): LocalReply | null {
  const key = nutrientOf(a.f);
  if (!key || !/\b(?:average|avg|on average|gemiddeld\w*)\b/.test(a.f)) return null;
  const days = longPeriod(a)?.days ?? (/\bthis month\b|\bdeze maand\b/.test(a.f) ? Number(a.env.healthDay.slice(8, 10)) : /\b(?:last|past|afgelopen|laatste) (\d{1,2}) (?:days|dagen)\b/.exec(a.f) ? Number(/\b(?:last|past|afgelopen|laatste) (\d{1,2}) (?:days|dagen)\b/.exec(a.f)![1]) : null);
  if (!days) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, end = a.env.healthDay, first = addLocalDays(end, -(Math.min(days, 366) - 1));
  const row = nutrientAverages({data: a.env.health!, vitamins: emptyHealthVitamins(), extras: emptyNutrientExtras(), micro: emptyMicroTargets()}, end, Math.min(days, 366)).find(r => r.key === key)!;
  const span = `${dayIn(lang, first, a.today)} ${say(lang, 'to', 't/m')} ${dayIn(lang, end, a.today)}`, name = nutrientName(key, lang), calls = [{tool: 'nutrient_totals', args: {}, label: 'Nutrients'}];
  if (row.average === null) return answer(say(lang, `${name}: no food logged in those ${row.days} days (${span}) carries a value, so the average is unknown (never 0).`, `${name}: geen eten in die ${row.days} dagen (${span}) heeft een waarde, dus het gemiddelde is onbekend (nooit 0).`), calls);
  return answer(say(lang, `${name}: ${formatNutrient(row.average, row.scale)} ${row.unit} a day on average over the ${row.daysWithValue} days with a value in the last ${row.days} days (${span}); ${row.loggedDays} days have food logged. A day with no value is left out, never counted as 0 (the nutrient report’s rule).`,
    `${name}: gemiddeld ${formatNutrient(row.average, row.scale)} ${row.unit} per dag over de ${row.daysWithValue} dagen met een waarde in de afgelopen ${row.days} dagen (${span}); op ${row.loggedDays} dagen is eten gelogd. Een dag zonder waarde telt niet mee, nooit als 0 (de regel van het voedingsrapport).`), calls);
}
/** q3 #28: "which foods are high in iron": the person's own foods (lib/health-aa/micro.ts richIn), and where the library's list is. */
function highIn(a: Asked): LocalReply | null {
  const key = nutrientOf(a.f);
  if (!key) return null;
  const en = /\b(?:high|rich) in\b|\b(?:most|lots of|a lot of)\b.*\bfoods?\b|\bfoods?\b.*\b(?:most|highest)\b/.test(a.f), nl = /\b(?:veel|rijk aan|hoog in|het meeste)\b/.test(a.f) && /\b(?:eten|voedsel|voeding|producten|voedingsmiddelen|welk|welke)\b/.test(a.f);
  if (!(en || nl) || /\b(?:today|vandaag|average|gemiddeld)\b/.test(a.f) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, name = nutrientName(key, lang), def = additionalNutrients.find(([k]) => k === key)!, rich = richIn(a.env.health!, key, 6);
  const where = say(lang, 'The offline food library’s richest foods are beside them: Health → Targets → Micronutrients → “Which of my foods are high in…”. Information from food labels and public tables, not advice.', 'De rijkste voedingsmiddelen uit de offline bibliotheek staan ernaast: Health → Targets → Micronutrients → “Which of my foods are high in…”. Informatie van etiketten en openbare tabellen, geen advies.');
  if (!rich.length) return answer(`${say(lang, `None of your own foods carries a value for ${name.toLowerCase()} yet.`, `Nog geen van je eigen voedingsmiddelen heeft een waarde voor ${name.toLowerCase()}.`)} ${where}`, [{tool: 'search_foods', args: {}, label: 'Your foods'}]);
  const rows = rich.map(f => `${clean(f.name, 50)} ${formatNutrient(f.mgPerServing, def[3])} ${def[2]} ${f.serving === 'per serving' ? say(lang, 'per serving', 'per portie') : `${say(lang, 'per', 'per')} ${f.serving}`}`);
  return answer(`${say(lang, `Your own foods highest in ${name.toLowerCase()}: ${list(rows, 'en')}.`, `Je eigen voedingsmiddelen met het meeste ${name.toLowerCase()}: ${list(rows, 'nl')}.`)} ${where}`, [{tool: 'search_foods', args: {}, label: 'Your foods'}]);
}
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], WEEKDAY_NL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
/** q3 #48: "what supplements do I take": the supplements and medication log's list (never the tasks). */
function supplementsTaken(a: Asked): LocalReply | null {
  const en = /\b(?:which|what) (?:supplements?|vitamins?|medications?|medicines?|meds|pills?)\b.*\b(?:do i|am i|i)\b.*\b(?:take|taking|use|using|on)\b|^(?:what are |show |list )?my (?:supplements?|medications?|meds)$/.test(a.f);
  const nl = /\b(?:welke|wat voor) (?:supplementen|vitamines|medicijnen|medicatie|pillen)\b.*\b(?:neem|gebruik|slik)\b|^(?:wat zijn |toon )?mijn (?:supplementen|medicijnen|medicatie)$/.test(a.f);
  if (!(en || nl) || /\b(?:left|due|still|today|open|not (?:yet )?taken|nog|vandaag)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, items = a.env.ak?.supplements?.items ?? [], calls = [{tool: 'supplements', args: {}, label: 'Supplements and medication'}];
  if (!items.length) return answer(say(lang, 'Nothing is kept in your supplements and medication log yet. It is under Health → Diary → Supplements and medication (optional).', 'Er staat nog niets in je log van supplementen en medicatie. Die staat onder Health → Diary → Supplements and medication (optioneel).'), calls);
  const days = (bits: number) => bits === EVERY_DAY ? say(lang, 'every day', 'elke dag') : list([0, 1, 2, 3, 4, 5, 6].filter(d => bits & (1 << d)).map(d => (lang === 'nl' ? WEEKDAY_NL : WEEKDAY_EN)[d]!), lang);
  const line = (i: (typeof items)[number]) => `${clean(i.name, 60)}${i.kind === 'medication' ? say(lang, ' (medication)', ' (medicatie)') : ''}${i.dose ? `, ${clean(i.dose, 40)}` : ''}, ${i.times.length ? `${say(lang, 'at', 'om')} ${list(i.times.map(t => clockIn(lang, t)), lang)} ${days(i.weekdays ?? EVERY_DAY)}` : say(lang, 'as needed', 'naar behoefte')}`;
  return answer([say(lang, `Your supplements and medication log keeps ${items.length}:`, `Je log van supplementen en medicatie bevat er ${items.length}:`), ...items.slice(0, 16).map(i => `• ${line(i)}`), say(lang, 'Your own list: no advice and no dose checks.', 'Je eigen lijst: geen advies en geen controle van doses.')].join('\n'), calls);
}

// ── Journal ────────────────────────────────────────────────────────────────────────────────────────────────────────

const JOURNAL_CALL = [{tool: 'journal', args: {}, label: 'Journal'}];
const monthAsked = (a: Asked) => /\blast month\b|\bvorige maand\b/.test(a.f) ? `${addLocalDays(`${a.today.slice(0, 7)}-01`, -1).slice(0, 7)}` : a.today.slice(0, 7);
/** q4 #4: "how many good things did I write this month" (lib/journal/good-things.ts, as the Journal counts them). */
function goodThings(a: Asked): LocalReply | null {
  if (!/\bgood things?\b|\b(?:goede|goeie) dingen\b/.test(a.f) || !isQuestion(a)) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const lang = a.lang, month = monthAsked(a), name = month === a.today.slice(0, 7) ? say(lang, 'this month', 'deze maand') : monthIn(lang, month), g = goodThingsInMonth(a.env.journal!.entries, month);
  if (!g.things) return answer(say(lang, `No good things written ${name === 'this month' ? name : `in ${name}`} yet: Journal → Three good things keeps up to three in one entry.`, `Nog geen goede dingen opgeschreven ${name === 'deze maand' ? name : `in ${name}`}: Journal → Three good things bewaart er tot drie in één stuk.`), JOURNAL_CALL);
  return answer(say(lang, `${name === 'this month' ? 'This month' : name}: ${count(g.things, 'en', ['good thing', 'good things'], ['', ''])} on ${count(g.days, 'en', ['day', 'days'], ['', ''])}, in Journal → Three good things.`, `${name === 'deze maand' ? 'Deze maand' : name}: ${count(g.things, 'nl', ['', ''], ['goed ding', 'goede dingen'])} op ${count(g.days, 'nl', ['', ''], ['dag', 'dagen'])}, in Journal → Three good things.`), JOURNAL_CALL);
}
/** q4 #5: "which journal entries are tagged work": the entries with that tag (their days; the words stay on the Journal page). */
function journalTags(a: Asked): LocalReply | null {
  const en = /\b(?:tag|tags|tagged)\b/.test(a.f) && /\b(?:journal|entries|entry|diary)\b/.test(a.f), nl = /\b(?:tag|tags|getagd|label|labels)\b/.test(a.f) && /\b(?:dagboek\w*|stukken|notities)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const lang = a.lang, entries = a.env.journal!.entries, tag = (/\btagged (?:with |as )?([a-z0-9-]{2,24})\b/.exec(a.f) ?? /\b(?:the )?tag ([a-z0-9-]{2,24})\b/.exec(a.f) ?? /\bgetagd (?:met |als )?([a-z0-9-]{2,24})\b/.exec(a.f) ?? /\b(?:tag|label) ([a-z0-9-]{2,24})\b/.exec(a.f))?.[1];
  const all = new Map<string, number>();
  for (const e of entries) for (const t of e.tags ?? []) all.set(t, (all.get(t) ?? 0) + 1);
  const yours = [...all].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 12).map(([t, n]) => `${clean(t, 24)} (${n})`);
  const words = yours.length ? say(lang, ` Your tags: ${list(yours, 'en')}.`, ` Je tags: ${list(yours, 'nl')}.`) : say(lang, ' No entry has a tag yet; the Journal adds them under an entry.', ' Nog geen stuk heeft een tag; het dagboek voegt ze toe onder een stuk.');
  if (!tag || ['in', 'met', 'with', 'as', 'als'].includes(tag)) return answer(say(lang, `Your journal’s tags, with how many entries carry each:${words.replace(/^ Your tags:/, '')}`, `De tags van je dagboek, met hoeveel stukken ze dragen:${words.replace(/^ Je tags:/, '')}`).trim(), JOURNAL_CALL);
  const hits = entries.filter(e => (e.tags ?? []).some(t => fold(t) === tag)).sort((x, y) => x.date.localeCompare(y.date));
  if (!hits.length) return answer(say(lang, `No journal entry is tagged “${tag}”.${words}`, `Geen dagboekstuk heeft de tag “${tag}”.${words}`), JOURNAL_CALL);
  return answer(say(lang, `${count(hits.length, 'en', ['journal entry is', 'journal entries are'], ['', ''])} tagged “${tag}”: ${list(hits.slice(-10).map(e => dayIn('en', e.date, a.today)), 'en')}. Their words stay on the Journal page.`, `${count(hits.length, 'nl', ['', ''], ['dagboekstuk heeft', 'dagboekstukken hebben'])} de tag “${tag}”: ${list(hits.slice(-10).map(e => dayIn('nl', e.date, a.today)), 'nl')}. Hun woorden blijven op de Journal-pagina.`), JOURNAL_CALL);
}
/** q4 #33: "how many journal entries did I write today": the count, not only "written". */
function journalCount(a: Asked): LocalReply | null {
  const en = /\bhow many (?:journal |diary )?entries\b/.test(a.f) && /\b(?:journal|diary)\b/.test(a.f) || /\bhow many times did i (?:journal|write in my journal)\b/.test(a.f);
  const nl = /\bhoeveel (?:dagboek(?:stukken|notities|items)|stukken|keer)\b/.test(a.f) && /\bdagboek\w*\b|\bgeschreven\b/.test(a.f) && !/\bgoede dingen\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const lang = a.lang, t = a.today, p = /\btoday\b|\bvandaag\b/.test(a.f) ? [t, t, say(lang, 'today', 'vandaag')] : /\byesterday\b|\bgisteren\b/.test(a.f) ? [addLocalDays(t, -1), addLocalDays(t, -1), say(lang, 'yesterday', 'gisteren')]
    : /\bthis week\b|\bdeze week\b/.test(a.f) ? [weekStart(t), t, say(lang, 'this week', 'deze week')] : /\blast month\b|\bvorige maand\b/.test(a.f) ? [`${monthAsked(a)}-01`, addLocalDays(`${t.slice(0, 7)}-01`, -1), say(lang, 'last month', 'vorige maand')] : [`${t.slice(0, 7)}-01`, t, say(lang, 'this month', 'deze maand')];
  const hits = a.env.journal!.entries.filter(e => e.date >= p[0]! && e.date <= p[1]!), days = new Set(hits.map(e => e.date)).size;
  return answer(say(lang, `${count(hits.length, 'en', ['journal entry', 'journal entries'], ['', ''])} ${p[2]}${hits.length && days > 1 ? `, on ${count(days, 'en', ['day', 'days'], ['', ''])}` : ''}.`, `${count(hits.length, 'nl', ['', ''], ['dagboekstuk', 'dagboekstukken'])} ${p[2]}${hits.length && days > 1 ? `, op ${count(days, 'nl', ['', ''], ['dag', 'dagen'])}` : ''}.`), JOURNAL_CALL);
}
/** q4 #45: "what journal templates do I have": the built-in prompts and the person's own. */
function journalTemplates(a: Asked): LocalReply | null {
  if (!/\bjournal templates?\b|\btemplates?\b.*\bjournal\b|\bdagboeksjablo(?:on|nen)\b|\bsjablo(?:on|nen)\b.*\bdagboek\b/.test(a.f) || !isQuestion(a)) return null;
  const shut = journalClosed(a); if (shut) return shut;
  const lang = a.lang, own = a.env.journal!.templates ?? [], built = JOURNAL_TEMPLATES.map(x => x.title[lang]);
  const mine = own.length ? say(lang, ` and ${count(own.length, 'en', ['of your own', 'of your own'], ['', ''])}: ${list(own.map(o => clean(o.title, 60)), 'en')}`, ` en ${own.length} eigen: ${list(own.map(o => clean(o.title, 60)), 'nl')}`) : say(lang, '; none of your own yet', '; nog geen eigen');
  return answer(say(lang, `${built.length} built-in templates (${list(built, 'en')})${mine}. Journal → Start from a prompt shows them.`, `${built.length} vaste sjablonen (${list(built, 'nl')})${mine}. Journal → Start from a prompt toont ze.`), JOURNAL_CALL);
}
/** q4 F-PROMPT: "what is today's journal question" (lib/journal-prompts/daily.ts, the same question the Journal shows). */
function journalQuestion(a: Asked): LocalReply | null {
  if (!/\b(?:todays|today s|daily|days) (?:journal |journaling |writing )?(?:question|prompt)\b|\bjournal (?:question|prompt)\b.*\btoday\b|\bquestion of the day\b|\bdagboekvraag\b|\bvraag van (?:de dag|vandaag)\b|\bschrijfvraag\b/.test(a.f)) return null;
  return answer(say(a.lang, `Today’s journal question: “${questionOfTheDay(a.today, 0, 'en')}” Journal → Another question shows the next one.`, `De dagboekvraag van vandaag: “${questionOfTheDay(a.today, 0, 'nl')}” Journal → Another question toont de volgende.`));
}

// ── Habits ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const amount = (n: number, unit: string) => unit ? `${num(n)} ${unit}` : num(n);
/** q4 #19: "which habits did I leave open yesterday": yesterday's daily habits not reached (lib/habits-yesterday.ts). */
function yesterdayOpen(a: Asked): LocalReply | null {
  const en = /\bhabits?\b/.test(a.f) && /\byesterday\b/.test(a.f) && /\b(?:open|left|leave|undone|unfinished|not finished|still to do|didnt finish|did not finish|didnt complete|did not complete)\b/.test(a.f);
  const nl = /\bgewoonte[sn]?\b/.test(a.f) && /\bgisteren\b/.test(a.f) && /\b(?:open|blijven liggen|laten liggen|niet af|niet afgemaakt|niet voltooid)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const lang = a.lang, y = yesterdaysOpen(a.env.habits, a.today), day = dayIn(lang, y.day, a.today);
  if (!y.open.length) return answer(say(lang, `Yesterday (${day}) no daily habit was left open.`, `Gisteren (${day}) bleef geen dagelijkse gewoonte open.`), [{tool: 'habits_due', args: {}, label: 'Open today'}]);
  const unit = (id: string) => { const h = a.env.habits.habits.find(x => x.id === id); return h ? measurementUnit(latestHabitRule(h)) : ''; };
  const rows = y.open.map(o => `${clean(o.title, 60)} (${amount(o.count, '')} ${say(lang, 'of', 'van')} ${amount(o.target, unit(o.id))})`);
  return answer(say(lang, `Yesterday (${day}) ${count(rows.length, 'en', ['habit was', 'habits were'], ['', ''])} left open: ${list(rows, 'en')}. Habits → “Yesterday, still open” ticks them late in one go.`, `Gisteren (${day}) ${count(rows.length, 'nl', ['', ''], ['gewoonte bleef', 'gewoontes bleven'])} open: ${list(rows, 'nl')}. Habits → “Yesterday, still open” vinkt ze in één keer alsnog af.`), [{tool: 'habits_due', args: {}, label: 'Open today'}]);
}
/** q4 #24: "what is my focus habit today" (lib/habit-focus.ts, today's pick only). */
function focusHabit(a: Asked): LocalReply | null {
  if (!/\bfocus habit\b|\bhabit\b.*\bfocus(?:ing|ed)? on\b|\bhabit of the day\b|\bfocusgewoonte\b|\bfocus gewoonte\b|\bgewoonte van (?:de dag|vandaag)\b|\bgewoonte\b.*\bfocus\b(?! ?sessie)/.test(a.f)) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const lang = a.lang, id = focusOf({focus: a.env.ak?.habitFocus}, a.today), habit = id ? a.env.habits.habits.find(h => h.id === id) : undefined;
  if (!habit) return answer(say(lang, 'No focus habit is picked for today. On Habits, “Make it today’s focus” on a habit’s card picks one for the day.', 'Er is voor vandaag geen focusgewoonte gekozen. Op Habits kiest “Make it today’s focus” op de kaart van een gewoonte er een voor vandaag.'));
  const d = habitDay(habit, a.today, a.today), unit = measurementUnit(latestHabitRule(habit)), state = d.status === 'complete' ? say(lang, 'done', 'gedaan') : d.status === 'skipped' ? say(lang, 'skipped', 'overgeslagen') : unit ? say(lang, `still open: ${amount(d.count, '')} of ${amount(d.target, unit)}`, `nog open: ${amount(d.count, '')} van ${amount(d.target, unit)}`) : say(lang, 'still open', 'nog open');
  return answer(say(lang, `Today’s focus habit: ${clean(habit.title, 60)} (${state}).`, `De focusgewoonte van vandaag: ${clean(habit.title, 60)} (${state}).`), [{tool: 'habits_due', args: {}, label: 'Open today'}]);
}
/** q4 #30: "show my habits this week", "laat mijn gewoontes van deze week zien": each habit's days done this week. */
function habitsWeek(a: Asked): LocalReply | null {
  const en = /^(?:please )?(?:show|list)(?: me)? (?:all )?my habits (?:for |of )?this week$|^my habits this week$/.test(a.f);
  const nl = /^(?:laat|toon)(?: me)? (?:mijn|m n) gewoonte[sn]? (?:van |voor )?deze week(?: zien)?$/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const lang = a.lang, from = weekStart(a.today), days: string[] = [];
  for (let d = from; d <= a.today; d = addLocalDays(d, 1)) days.push(d);
  const live = a.env.habits.habits.filter(h => latestHabitRule(h).state === 'active');
  if (!live.length) return answer(say(lang, 'No habit is kept yet: Habits → New habit.', 'Er is nog geen gewoonte: Habits → New habit.'));
  const rows = live.map(h => { const st = days.map(d => habitDay(h, d, a.today)), due = st.filter(s => s.scheduled).length, done = st.filter(s => s.status === 'complete').length; return due ? `${clean(h.title, 50)} ${done} ${say(lang, 'of', 'van')} ${due}` : null; }).filter((r): r is string => !!r);
  const span = `${dayIn(lang, from, a.today)} ${say(lang, 'to', 't/m')} ${dayIn(lang, a.today, a.today)}`;
  return answer([say(lang, `This week (${span}), days done of days due:`, `Deze week (${span}), dagen gedaan van de geplande dagen:`), ...rows.slice(0, 12).map(r => `• ${r}`), say(lang, 'Habits shows the week as a grid.', 'Habits toont de week als raster.')].join('\n'), [{tool: 'habits_due', args: {}, label: 'Open today'}]);
}
const WHY_EN = /^why did(?:nt| not)? i (?:miss|skip|fail(?: at)?|not do|not finish|not complete)\s+(?:my\s+)?(.+?)(?:\s+(yesterday|today|last \w+|on \w+))?$/;
const WHY_NL = /^waarom (?:heb ik|deed ik) (?:mijn |m n )?(.+?)\s+(?:(gisteren|vandaag|eergisteren)\s+)?(?:gemist|overgeslagen|niet gedaan|laten schieten|niet afgemaakt)$/;
/**
 * q4 #32: "why did I miss Exercise yesterday": the reason the person gave that day ("what got in the way", kept as the
 * day's note; lib/habits-yesterday.ts missNote). With no reason kept, the honest "your records do not say why" stays.
 */
function whyMissed(a: Asked): LocalReply | null {
  const m = WHY_EN.exec(a.f) ?? WHY_NL.exec(a.f);
  if (!m) return null;
  const name = m[1]!.replace(/\s+habit$|\s+gewoonte$/, '').trim(), when = m[2] ?? '';
  const habit = a.env.habits.habits.filter(h => { const t = fold(h.title); return t === name || t.startsWith(`${name} `) || (name.length >= 4 && t.includes(name)); }).sort((x, y) => x.title.length - y.title.length)[0];
  if (!habit) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const lang = a.lang, t = a.today, day = /^(?:yesterday|gisteren)$/.test(when) ? addLocalDays(t, -1) : /^(?:today|vandaag)$/.test(when) ? t : when === 'eergisteren' ? addLocalDays(t, -2) : null;
  const entry = habit.entries.filter(e => (day ? e.date === day : e.date >= addLocalDays(t, -14)) && e.disposition !== 'logged' && e.note.trim()).sort((x, y) => y.date.localeCompare(x.date))[0];
  if (!entry) return null;
  const how = entry.disposition === 'failed' ? say(lang, 'marked not done, with what got in the way', 'gemarkeerd als niet gedaan, met wat ertussen kwam') : say(lang, 'skipped, with the reason', 'overgeslagen, met de reden');
  return answer(say(lang, `${clean(habit.title, 60)}, ${dayIn('en', entry.date, t)}: ${how}: “${clean(entry.note, 200)}”. That is what you noted; I add no reason of my own.`, `${clean(habit.title, 60)}, ${dayIn('nl', entry.date, t)}: ${how}: “${clean(entry.note, 200)}”. Dat is wat je zelf noteerde; ik voeg geen eigen reden toe.`), [{tool: 'habit_checkins', args: {habit: habit.title.slice(0, 80)}, label: `Check-ins · ${clean(habit.title, 40)}`}]);
}

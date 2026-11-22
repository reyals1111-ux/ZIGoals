import type {Measure, Progression, WorkoutTemplate} from './schema';
import {EXERCISES} from './library';

/**
 * Session AV lane 2 (body; LEDGER #112 and #115, Strava's coach-designed strength workouts and Hevy's routine library):
 * ready-made routines written for ZIGoals in this repository, in English and Dutch — each with what it is for, its
 * exercises with sets, reps (or seconds), rest and one cue, and a suggested progression rule. Saving one copies it into
 * the person's routines (in a folder), where it is theirs to change; starting it starts a workout from that copy. No
 * weights are suggested: the first session's weights are the person's own. Text only; not a multi-week programme.
 */
export type Lang = 'en' | 'nl';
export type GuideExercise = {exerciseId: string; sets: number; reps?: number; seconds?: number; restSeconds: number; cue: {en: string; nl: string}};
export type Guide = {id: string; name: {en: string; nl: string}; folder: {en: string; nl: string}; level: 'start' | 'steady'; minutes: number; about: {en: string; nl: string}; exercises: GuideExercise[]; progression?: Progression};
const e = (exerciseId: string, sets: number, reps: number | {seconds: number}, restSeconds: number, en: string, nl: string): GuideExercise =>
  ({exerciseId, sets, ...(typeof reps === 'number' ? {reps} : {seconds: reps.seconds}), restSeconds, cue: {en, nl}});
const GYM = {en: 'Gym', nl: 'Sportschool'}, HOME = {en: 'At home', nl: 'Thuis'}, SHORT = {en: 'Short sessions', nl: 'Korte sessies'};
const RIR = ['Stop with about two reps left in the tank.', 'Stop als je nog ongeveer twee herhalingen over hebt.'] as const;

export const GUIDES: readonly Guide[] = [
  {id: 'full-body-a', name: {en: 'Full body A', nl: 'Heel lichaam A'}, folder: GYM, level: 'start', minutes: 45,
    about: {en: 'Three big lifts and a plank: the whole body in one session. Alternate with Full body B, two or three times a week.', nl: 'Drie grote oefeningen en een plank: je hele lichaam in één sessie. Wissel af met Heel lichaam B, twee of drie keer per week.'},
    progression: {kind: 'double', minReps: 8, maxReps: 12, stepKg: 2.5},
    exercises: [e('squat', 3, 8, 120, 'Sit between your heels; depth you can keep with a flat back.', 'Zak tussen je hielen; zo diep als lukt met een rechte rug.'), e('bench-press', 3, 8, 120, RIR[0], RIR[1]),
      e('barbell-row', 3, 8, 90, 'Pull to the lower ribs; the body stays still.', 'Trek naar je onderste ribben; je bovenlijf blijft stil.'), e('plank', 3, {seconds: 30}, 60, 'A straight line matters more than the time.', 'Een rechte lijn telt meer dan de tijd.')]},
  {id: 'full-body-b', name: {en: 'Full body B', nl: 'Heel lichaam B'}, folder: GYM, level: 'start', minutes: 45,
    about: {en: 'A hinge, a press, a pull and a single-leg move. Alternate with Full body A.', nl: 'Een heupbeweging, drukken, trekken en een oefening op één been. Wissel af met Heel lichaam A.'},
    progression: {kind: 'double', minReps: 8, maxReps: 12, stepKg: 2.5},
    exercises: [e('romanian-deadlift', 3, 8, 120, 'Hips back until the backs of the legs stretch.', 'Heupen naar achteren tot je achterkant bovenbeen rekt.'), e('overhead-press', 3, 8, 120, 'Squeeze glutes and abs before every rep.', 'Span billen en buik aan voor elke herhaling.'),
      e('lat-pulldown', 3, 10, 90, 'Elbows down to your sides.', 'Ellebogen omlaag naar je zij.'), e('lunge', 2, 10, 60, 'Ten each leg; hold on for balance if you like.', 'Tien per been; houd je vast voor je evenwicht als je wilt.')]},
  {id: 'ppl-push', name: {en: 'Push day', nl: 'Duwdag'}, folder: {en: 'Push, pull, legs', nl: 'Duwen, trekken, benen'}, level: 'steady', minutes: 55,
    about: {en: 'Chest, shoulders and triceps. With Pull day and Leg day it makes a three-day split.', nl: 'Borst, schouders en triceps. Met Trekdag en Beendag vormt het een driedaagse indeling.'},
    progression: {kind: 'double', minReps: 6, maxReps: 10, stepKg: 2.5},
    exercises: [e('bench-press', 4, 6, 150, RIR[0], RIR[1]), e('incline-db-press', 3, 10, 90, 'Lower slowly to just below the bench.', 'Laat langzaam zakken tot net onder de bank.'), e('overhead-press', 3, 8, 120, 'Bar over the middle of your head at the top.', 'Bovenin de stang boven het midden van je hoofd.'),
      e('lateral-raise', 3, 12, 60, 'Light; lead with the elbows.', 'Licht; til vanuit je ellebogen.'), e('triceps-pushdown', 3, 12, 60, 'Upper arms still.', 'Bovenarmen stil.')]},
  {id: 'ppl-pull', name: {en: 'Pull day', nl: 'Trekdag'}, folder: {en: 'Push, pull, legs', nl: 'Duwen, trekken, benen'}, level: 'steady', minutes: 55,
    about: {en: 'Back and biceps, with the deadlift first while you are fresh.', nl: 'Rug en biceps, met de deadlift als eerste nu je nog fris bent.'},
    progression: {kind: 'double', minReps: 6, maxReps: 10, stepKg: 2.5},
    exercises: [e('deadlift', 3, 5, 180, 'Flat back from start to finish.', 'Rechte rug van begin tot eind.'), e('pull-up', 3, 6, 120, 'Shoulders down first; an assisted machine counts.', 'Eerst je schouders omlaag; een hulpapparaat telt ook.'),
      e('seated-row', 3, 10, 90, 'Squeeze the shoulder blades together.', 'Knijp je schouderbladen samen.'), e('face-pull', 3, 15, 60, 'Pull the rope apart.', 'Trek het touw uit elkaar.'), e('bicep-curl', 3, 12, 60, 'No leaning back.', 'Niet achterover leunen.')]},
  {id: 'ppl-legs', name: {en: 'Leg day', nl: 'Beendag'}, folder: {en: 'Push, pull, legs', nl: 'Duwen, trekken, benen'}, level: 'steady', minutes: 60,
    about: {en: 'Squat, hinge and the smaller leg muscles.', nl: 'Squat, heupbeweging en de kleinere beenspieren.'},
    progression: {kind: 'double', minReps: 6, maxReps: 10, stepKg: 5},
    exercises: [e('squat', 4, 6, 180, 'Safety bars just below your lowest point.', 'Veiligheidssteunen net onder je laagste punt.'), e('romanian-deadlift', 3, 8, 120, 'Knees almost still.', 'Knieën bijna stil.'),
      e('leg-press', 3, 10, 90, 'Lower back stays on the pad.', 'Onderrug blijft tegen het kussen.'), e('leg-curl', 3, 12, 60, 'Slow on the way back.', 'Langzaam terug.'), e('calf-raise', 3, 15, 60, 'Pause at the top and bottom.', 'Pauzeer boven en onder.')]},
  {id: 'upper', name: {en: 'Upper body', nl: 'Bovenlichaam'}, folder: {en: 'Upper and lower', nl: 'Boven en onder'}, level: 'steady', minutes: 55,
    about: {en: 'Presses and pulls in balance. With Lower body: four days a week, or two.', nl: 'Drukken en trekken in balans. Met Onderlichaam: vier dagen per week, of twee.'},
    progression: {kind: 'double', minReps: 6, maxReps: 10, stepKg: 2.5},
    exercises: [e('bench-press', 4, 6, 150, RIR[0], RIR[1]), e('barbell-row', 4, 8, 120, 'Same weight feels lighter with a still body.', 'Hetzelfde gewicht voelt lichter met een stil bovenlijf.'), e('overhead-press', 3, 8, 120, 'Ribs down, glutes tight.', 'Ribben laag, billen aangespannen.'),
      e('chin-up', 3, 6, 120, 'Slow lowering counts.', 'Langzaam zakken telt mee.'), e('hammer-curl', 2, 12, 60, 'Elbows still.', 'Ellebogen stil.')]},
  {id: 'lower', name: {en: 'Lower body', nl: 'Onderlichaam'}, folder: {en: 'Upper and lower', nl: 'Boven en onder'}, level: 'steady', minutes: 55,
    about: {en: 'Legs and glutes, and the abs at the end.', nl: 'Benen en billen, en aan het eind je buik.'},
    progression: {kind: 'double', minReps: 6, maxReps: 10, stepKg: 5},
    exercises: [e('squat', 4, 6, 180, 'Brace before you go down.', 'Zet je romp vast voor je zakt.'), e('romanian-deadlift', 3, 8, 120, 'Bar close to the legs.', 'Stang dicht langs je benen.'), e('hip-thrust', 3, 10, 90, 'Squeeze at the top.', 'Knijp bovenin.'),
      e('lunge', 2, 10, 60, 'Ten each leg.', 'Tien per been.'), e('hanging-leg-raise', 3, 10, 60, 'Bent knees are fine.', 'Gebogen knieën zijn prima.')]},
  {id: 'home-bodyweight', name: {en: 'Body weight at home', nl: 'Lichaamsgewicht thuis'}, folder: HOME, level: 'start', minutes: 30,
    about: {en: 'No equipment: a full session in a living room. Add reps as it gets easier.', nl: 'Zonder spullen: een hele sessie in je woonkamer. Doe meer herhalingen als het makkelijker wordt.'},
    exercises: [e('bodyweight-squat', 3, 15, 60, 'Sit back as if onto a chair.', 'Zak naar achteren alsof je op een stoel gaat zitten.'), e('push-up', 3, 10, 60, 'Hands on a bench or the sofa is fine.', 'Handen op een bank of de bank is prima.'),
      e('lunge', 3, 10, 60, 'Ten each leg.', 'Tien per been.'), e('plank', 3, {seconds: 30}, 45, 'Knees down to start is fine.', 'Op je knieën beginnen is prima.'), e('side-plank', 2, {seconds: 20}, 45, 'Each side.', 'Elke kant.'), e('burpee', 3, 8, 60, 'Step back instead of jumping if you like.', 'Stap naar achteren in plaats van springen als je wilt.')]},
  {id: 'dumbbells', name: {en: 'Dumbbells only', nl: 'Alleen dumbbells'}, folder: HOME, level: 'start', minutes: 40,
    about: {en: 'One pair of dumbbells and a bench or a sturdy chair.', nl: 'Eén paar dumbbells en een bank of een stevige stoel.'},
    progression: {kind: 'double', minReps: 10, maxReps: 15, stepKg: 1},
    exercises: [e('incline-db-press', 3, 10, 90, 'A sofa back or a bench works.', 'Een bank met rugleuning of een fitnessbank werkt.'), e('romanian-deadlift', 3, 10, 90, 'Dumbbells slide down the thighs.', 'Dumbbells glijden langs je bovenbenen.'),
      e('lunge', 3, 10, 60, 'Dumbbells at your sides.', 'Dumbbells naast je.'), e('lateral-raise', 3, 12, 60, 'Light is right.', 'Licht is goed.'), e('hammer-curl', 3, 12, 60, 'Palms facing each other.', 'Handpalmen naar elkaar.')]},
  {id: 'core-ten', name: {en: 'Core in ten minutes', nl: 'Buik in tien minuten'}, folder: SHORT, level: 'start', minutes: 10,
    about: {en: 'A short core session for a busy day.', nl: 'Een korte buiksessie voor een drukke dag.'},
    exercises: [e('plank', 3, {seconds: 30}, 30, 'Breathe calmly.', 'Adem rustig.'), e('crunch', 3, 15, 30, 'Look at the ceiling.', 'Kijk naar het plafond.'), e('side-plank', 2, {seconds: 20}, 30, 'Each side.', 'Elke kant.')]},
  {id: 'runner-strength', name: {en: 'Strength for runners', nl: 'Kracht voor hardlopers'}, folder: SHORT, level: 'start', minutes: 25,
    about: {en: 'Legs, hips and core that carry a run. Once or twice a week, on an easy day.', nl: 'Benen, heupen en romp die een loop dragen. Een of twee keer per week, op een rustige dag.'},
    exercises: [e('lunge', 3, 10, 60, 'Ten each leg, tall upper body.', 'Tien per been, rechtop.'), e('hip-thrust', 3, 12, 60, 'Squeeze at the top.', 'Knijp bovenin.'), e('calf-raise', 3, 15, 45, 'Slow down, quick up.', 'Langzaam omlaag, vlot omhoog.'),
      e('side-plank', 2, {seconds: 30}, 30, 'Each side.', 'Elke kant.'), e('plank', 2, {seconds: 40}, 30, 'Glutes tight.', 'Billen aangespannen.')]},
  {id: 'mobility', name: {en: 'Easy mobility', nl: 'Rustig bewegen'}, folder: SHORT, level: 'start', minutes: 20,
    about: {en: 'Gentle stretching and rolling for a rest day or after a run.', nl: 'Rustig rekken en rollen voor een rustdag of na een loop.'},
    exercises: [e('foam-rolling', 1, {seconds: 300}, 0, 'Firm but bearable.', 'Stevig maar verdraaglijk.'), e('stretching', 1, {seconds: 480}, 0, 'Gentle is enough.', 'Zacht is genoeg.'), e('yoga', 1, {seconds: 420}, 0, 'One movement per breath.', 'Eén beweging per ademhaling.')]},
];
export const guideOf = (id: string | undefined): Guide | null => (id && GUIDES.find(g => g.id === id)) || null;
const measureOf = (id: string): Measure => EXERCISES.find(x => x.id === id)?.measure ?? 'weight-reps';
const nameOf = (id: string) => EXERCISES.find(x => x.id === id)?.name ?? id;
/** The routine a guide becomes, in the chosen language (its name and folder), before it gets an id and a date. */
export function guideRoutine(g: Guide, lang: Lang): Pick<WorkoutTemplate, 'name' | 'type' | 'folder' | 'guideId' | 'progression' | 'exercises'> {
  return {name: g.name[lang], type: g.exercises.every(x => measureOf(x.exerciseId) === 'time') ? 'mobility' : 'strength', folder: g.folder[lang], guideId: g.id, ...(g.progression ? {progression: g.progression} : {}),
    exercises: g.exercises.map(x => { const m = measureOf(x.exerciseId); return {exerciseId: x.exerciseId, name: nameOf(x.exerciseId), measure: m, restSeconds: x.restSeconds,
      sets: Array.from({length: x.sets}, () => ({kind: 'normal' as const, ...(m === 'time' ? {seconds: x.seconds} : {reps: x.reps})}))}; })};
}
/** "3 × 8 · rest 2:00" or "3 × 30 s" for a guide's exercise. */
export const guideLine = (x: GuideExercise, lang: Lang) => `${x.sets} × ${x.reps ?? `${x.seconds! >= 120 ? `${Math.round(x.seconds! / 60)} min` : `${x.seconds} s`}`}${x.restSeconds ? ` · ${lang === 'nl' ? 'rust' : 'rest'} ${Math.floor(x.restSeconds / 60)}:${String(x.restSeconds % 60).padStart(2, '0')}` : ''}`;
/** The language a saved routine was made in (its name), so its cues are shown in the same words. */
export const routineLang = (g: Guide, name: string): Lang => name === g.name.nl && g.name.nl !== g.name.en ? 'nl' : 'en';

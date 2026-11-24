import {questionOfTheDay} from './daily';

/**
 * Session AV lane 2 (journal; LEDGER #38, Day One's Prompt Packs): themed question packs to switch on — sleep, training,
 * gratitude, creativity, work and life, the year — written for ZIGoals in English and Dutch, in the same order (one
 * question a day). Switched-on packs (the journal record's `packs`) take turns with the everyday questions as today's
 * question; "Another question" steps through them; a pack's questions can also be used one by one. Calm words only: no
 * task, no judgement, no advice. Nothing is sent; the choice is kept in the journal record. Pure.
 */
export type PackLang = 'en' | 'nl';
export type PromptPack = {id: string; title: Record<PackLang, string>; blurb: Record<PackLang, string>; questions: Record<PackLang, readonly string[]>};
export const PROMPT_PACKS: readonly PromptPack[] = [
  {id: 'sleep', title: {en: 'Sleep', nl: 'Slaap'}, blurb: {en: 'How you rest, and what helps you wind down.', nl: 'Hoe je rust, en wat helpt om tot rust te komen.'},
    questions: {en: ['How did you sleep last night, in a few words?', 'What helped you wind down this evening?', 'What kept your mind busy at bedtime?', 'What would make tonight’s sleep a little easier?', 'How did your energy follow your sleep today?', 'What does a good evening before bed look like for you?', 'What can you leave for tomorrow, so tonight is lighter?', 'When did you feel most rested this week?'],
      nl: ['Hoe heb je vannacht geslapen, in een paar woorden?', 'Wat hielp je vanavond tot rust te komen?', 'Wat hield je hoofd bezig bij het slapengaan?', 'Wat zou de slaap van vannacht wat makkelijker maken?', 'Hoe volgde je energie vandaag je slaap?', 'Hoe ziet een goede avond voor het slapen er voor jou uit?', 'Wat kun je voor morgen laten liggen, zodat vanavond lichter is?', 'Wanneer voelde je je deze week het meest uitgerust?']}},
  {id: 'training', title: {en: 'Training', nl: 'Training'}, blurb: {en: 'Workouts, runs and how your body felt.', nl: 'Trainingen, hardlopen en hoe je lichaam voelde.'},
    questions: {en: ['How did your body feel during today’s training?', 'What went better than last time?', 'What did you notice on your run or walk today?', 'Which part of training do you enjoy most right now?', 'What made it hard to train, and what helped anyway?', 'How do you want to feel after your next workout?', 'What small progress did you see this week?', 'What does rest look like for you between training days?'],
      nl: ['Hoe voelde je lichaam tijdens de training van vandaag?', 'Wat ging beter dan de vorige keer?', 'Wat viel je op tijdens het hardlopen of wandelen vandaag?', 'Welk deel van trainen vind je nu het leukst?', 'Wat maakte trainen lastig, en wat hielp toch?', 'Hoe wil je je voelen na je volgende training?', 'Welke kleine vooruitgang zag je deze week?', 'Hoe ziet rust er voor jou uit tussen trainingsdagen?']}},
  {id: 'gratitude', title: {en: 'Gratitude', nl: 'Dankbaarheid'}, blurb: {en: 'Small good things and the people around you.', nl: 'Kleine goede dingen en de mensen om je heen.'},
    questions: {en: ['What small thing are you glad about today?', 'Who made your day a bit better, and how?', 'What is something you have now that you once wished for?', 'Which ordinary moment today would you like to keep?', 'What in your home are you thankful for?', 'Who would you like to thank, and for what?', 'What went right today without you noticing at first?', 'What about yourself are you grateful for this week?'],
      nl: ['Over welk klein ding ben je vandaag blij?', 'Wie maakte je dag een beetje beter, en hoe?', 'Wat heb je nu dat je ooit graag wilde hebben?', 'Welk gewoon moment van vandaag wil je bewaren?', 'Waar in je huis ben je dankbaar voor?', 'Wie zou je willen bedanken, en waarvoor?', 'Wat ging vandaag goed zonder dat je het eerst merkte?', 'Waar ben je deze week dankbaar voor aan jezelf?']}},
  {id: 'creativity', title: {en: 'Creativity', nl: 'Creativiteit'}, blurb: {en: 'Ideas, play and things you make.', nl: 'Ideeën, spelen en dingen die je maakt.'},
    questions: {en: ['What idea has been on your mind lately?', 'If you had a free afternoon to make something, what would it be?', 'What did you see today that you would like to draw or describe?', 'What did you enjoy as a child that you could try again?', 'Which song, book or film stayed with you this week, and why?', 'What would you make if nobody would ever see it?', 'What is a small experiment you could try this week?', 'Describe a place you love in five details.'],
      nl: ['Welk idee speelt de laatste tijd door je hoofd?', 'Als je een vrije middag had om iets te maken, wat zou het zijn?', 'Wat zag je vandaag dat je zou willen tekenen of beschrijven?', 'Wat vond je als kind leuk dat je opnieuw zou kunnen proberen?', 'Welk liedje, boek of film bleef deze week bij je, en waarom?', 'Wat zou je maken als niemand het ooit zou zien?', 'Welk klein experiment zou je deze week kunnen proberen?', 'Beschrijf een plek waar je van houdt in vijf details.']}},
  {id: 'work-life', title: {en: 'Work and life', nl: 'Werk en leven'}, blurb: {en: 'Busy days, balance and what matters.', nl: 'Drukke dagen, balans en wat ertoe doet.'},
    questions: {en: ['What part of today’s work felt meaningful?', 'Where did your time go today, and is that how you wanted it?', 'What could you say no to this week?', 'When did you feel focused today, and what helped?', 'What would make your workday calmer tomorrow?', 'What did you finish today, however small?', 'How did you make time for yourself today?', 'What do you want to remember when work feels busy?'],
      nl: ['Welk deel van het werk vandaag voelde zinvol?', 'Waar ging je tijd vandaag naartoe, en wilde je dat zo?', 'Waar zou je deze week nee tegen kunnen zeggen?', 'Wanneer was je vandaag gefocust, en wat hielp?', 'Wat zou je werkdag morgen rustiger maken?', 'Wat heb je vandaag afgerond, hoe klein ook?', 'Hoe maakte je vandaag tijd voor jezelf?', 'Wat wil je onthouden als werk druk voelt?']}},
  {id: 'year', title: {en: 'The year', nl: 'Het jaar'}, blurb: {en: 'Looking back and looking ahead, any time of year.', nl: 'Terugkijken en vooruitkijken, op elk moment van het jaar.'},
    questions: {en: ['What are you proud of from this year so far?', 'What did you learn this year that surprised you?', 'Which moment from this year would you like to keep?', 'What do you want more of in the months ahead?', 'What are you ready to leave behind?', 'Who mattered most to you this year?', 'What would a good next year feel like?', 'Which small habit made the biggest difference this year?'],
      nl: ['Waar ben je tot nu toe trots op van dit jaar?', 'Wat leerde je dit jaar dat je verraste?', 'Welk moment van dit jaar wil je bewaren?', 'Waar wil je de komende maanden meer van?', 'Wat ben je klaar om achter je te laten?', 'Wie was dit jaar het belangrijkst voor je?', 'Hoe zou een goed volgend jaar voelen?', 'Welke kleine gewoonte maakte dit jaar het grootste verschil?']}},
];
export const PACK_IDS = PROMPT_PACKS.map(p => p.id);
export const packById = (id: string) => PROMPT_PACKS.find(p => p.id === id) ?? null;
/** The packs switched on that this build knows (in the packs' own order). */
export const packsOn = (ids: readonly string[] | undefined) => PROMPT_PACKS.filter(p => (ids ?? []).includes(p.id));
/** The journal's pack list with one pack switched on or off (unknown ids another build kept stay as they are). */
export function withPack(ids: readonly string[] | undefined, id: string, on: boolean): string[] {
  const rest = (ids ?? []).filter(x => x !== id);
  return on ? [...rest, id].slice(-20) : rest;
}
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
/**
 * Today's question with packs: the everyday questions and each switched-on pack take turns, day by day (with two packs
 * on: everyday, sleep, training, everyday…); "Another question" (`step`) moves one turn on. With no pack on it is
 * exactly the everyday question (lib/journal-prompts/daily.ts). Says which pack it came from.
 */
export function questionWithPacks(date: string, step: number, lang: PackLang, ids: readonly string[] | undefined): {question: string; pack: PromptPack | null} {
  const on = packsOn(ids);
  if (!on.length) return {question: questionOfTheDay(date, step, lang), pack: null};
  const turn = dayNumber(date) + step, sources = on.length + 1, which = ((turn % sources) + sources) % sources;
  if (which === 0) return {question: questionOfTheDay(date, Math.floor(step / sources), lang), pack: null};
  const pack = on[which - 1]!, list = pack.questions[lang], round = Math.floor(turn / sources), i = ((round % list.length) + list.length) % list.length;
  return {question: list[i]!, pack};
}

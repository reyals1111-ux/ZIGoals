import type {Intent} from './cases';

/**
 * Session AV lane 2 (body): the questions the lane's sleep, workouts and body features raise, in English and Dutch,
 * answered on the device by lib/ai/local-answers/av2-body.ts from each feature's own pure function. The lead adds them
 * to the corpus (cases.ts) and records their expected facts (expected.json). `never`: an answer they must not get.
 */
export const AV2_BODY: readonly Intent[] = [
  {id: 'av2-howto', pillar: 'health', en: ['how do I do a squat', 'what is good form for the deadlift'], nl: ['hoe doe ik een squat', 'wat is een goede uitvoering van de deadlift'], never: ['No squat is logged']},
  {id: 'av2-muscles', pillar: 'health', en: ['what muscles does the deadlift work', 'which muscles does a push-up train'], nl: ['welke spieren traint de deadlift', 'welke spieren train je met opdrukken']},
  {id: 'av2-pinned', pillar: 'health', en: ['what are my pinned notes', 'which exercise notes are pinned'], nl: ['wat zijn mijn vastgezette notities', 'welke notities heb ik vastgezet']},
  {id: 'av2-exercises-for', pillar: 'health', en: ['which exercises work my glutes', 'what exercises are good for my back'], nl: ['welke oefeningen trainen mijn billen', 'welke oefeningen zijn goed voor mijn rug']},
  {id: 'av2-my-routines', pillar: 'health', en: ['what routines do I have', 'show my routine folders'], nl: ['welke routines heb ik', 'laat mijn routinemappen zien']},
  {id: 'av2-next-target', pillar: 'health', en: ['what is my next target for bench press', 'what does my progression rule say for the bench press'], nl: ['wat is mijn volgende doel voor bankdrukken', 'wat zegt mijn opbouw voor bankdrukken'], never: ['examples']},
  {id: 'av2-month-report', pillar: 'health', en: ['how did my training go this month', 'show my monthly workout report'], nl: ['hoe ging mijn training deze maand', 'mijn training vergeleken met vorige maand']},
  {id: 'av2-sets-muscle', pillar: 'health', en: ['how many sets per muscle group did I do', 'show my sets per muscle group'], nl: ['hoeveel sets per spiergroep heb ik gedaan', 'laat mijn sets per spiergroep zien']},
  {id: 'av2-week-streak', pillar: 'health', en: ['how many weeks in a row have I trained', 'what is my workout streak'], nl: ['hoeveel weken op rij heb ik getraind', 'wat is mijn workoutreeks']},
  {id: 'av2-days-year', pillar: 'health', en: ['how many days did I train this year', 'how many days have I worked out this year'], nl: ['hoeveel dagen heb ik dit jaar getraind', 'hoeveel dagen heb ik dit jaar gesport']},
  {id: 'av2-distance-goal', pillar: 'health', en: ['how is my running goal going', 'what are my distance goals'], nl: ['hoe gaat mijn hardloopdoel', 'wat zijn mijn afstandsdoelen']},
  {id: 'av2-training-load', pillar: 'health', en: ['what is my training load', 'how is my training load this week'], nl: ['wat is mijn trainingsbelasting', 'hoe is mijn trainingsbelasting deze week'], never: ['kcal']},
  {id: 'av2-last-run', pillar: 'health', en: ['how did my last run compare', 'how was my last run'], nl: ['hoe was mijn laatste loop', 'mijn laatste loop vergeleken met de vorige']},
  {id: 'av2-ready-routines', pillar: 'health', en: ['which ready-made routines are there', 'suggest a strength routine for at home'], nl: ['welke kant-en-klare routines zijn er', 'stel een routine voor thuis voor']},
];

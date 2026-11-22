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
  {id: 'av2-ready-routines', pillar: 'health', en: ['which ready-made routines are there', 'suggest a strength routine for at home'], nl: ['welke kant-en-klare routines zijn er', 'stel een routine voor thuis voor']},
];

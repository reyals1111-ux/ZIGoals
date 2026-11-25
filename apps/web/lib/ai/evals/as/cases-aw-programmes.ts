import type {Intent} from './cases';

/**
 * Session AW (programmes; owner decision 1d, ADR-046): the questions the written programmes raise, in English and Dutch,
 * answered on the device by lib/ai/local-answers/aw-programmes.ts from the Guided journeys record (the Showcase has
 * "0 to 5 km in 8 weeks" in progress, labelled). The lead adds them to the corpus (cases.ts) and records their expected
 * facts (expected.json). `never`: words the answer must not hold (no advice, no promise, no burn estimate).
 */
export const AW_PROGRAMMES: readonly Intent[] = [
  {id: 'aw-programme-which', pillar: 'health', en: ['which programme am I on', 'what training plan am I following?', 'am I on a programme?'], nl: ['welk programma volg ik', 'met welk programma ben ik bezig?', 'volg ik een programma?'], never: ['you should', 'recommend', 'guarantee', 'kcal', 'je moet', 'aanrad']},
  {id: 'aw-programme-today', pillar: 'health', en: ["what's today's step in my programme", 'what is in my programme for today?', 'what do I do today in my training plan'], nl: ['wat staat er vandaag in mijn programma', 'wat doe ik vandaag in mijn trainingsschema?', 'wat is de stap van vandaag in mijn programma?'], never: ['you should', 'you must', 'guarantee', 'kcal', 'je moet', 'gegarandeerd']},
];

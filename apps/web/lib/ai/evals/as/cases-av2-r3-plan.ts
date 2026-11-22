import type {Intent} from './cases';

/**
 * Session AV lane 2 (r3-plan, LEDGER #256–#263; Structured): the questions round 3's planning features raise, answered on
 * the device by lib/ai/local-answers/av2-r3-plan.ts in English and Dutch. The lead adds them to the corpus (CORPUS,
 * expected.json) once av2R3PlanAnswer is wired into engine.ts. `never`: what an answer to that question must not be.
 */
export const AV2_R3_PLAN: readonly Intent[] = [
  {id: 'av2r3-plan-day-reminder', pillar: 'tasks', en: ['do I get a plan your day reminder', 'when does the plan your day notification come'], nl: ['wanneer krijg ik een herinnering om mijn dag te plannen', 'wanneer komt de melding plan your day'], never: ['"add-task"']},
  {id: 'av2r3-task-symbols', pillar: 'tasks', en: ['which tasks have a symbol', 'what icons do my tasks have'], nl: ['welke taken hebben een symbool', 'welke iconen hebben mijn taken']},
  {id: 'av2r3-timeline-tomorrow', pillar: 'agenda', en: ['what is on my timeline tomorrow', 'what is planned for tomorrow on my timeline'], nl: ['wat staat er morgen op mijn tijdlijn', 'wat is er gepland voor morgen op mijn tijdlijn']},
  {id: 'av2r3-day-energy', pillar: 'tasks', en: ['how much energy does my day take', 'is there room for more energy in my tasks today'], nl: ['hoeveel energie kost mijn dag', 'hoeveel energie vragen mijn taken vandaag']},
  {id: 'av2r3-focus-notes', pillar: 'focus', en: ['what did I note in my focus sessions', 'show my focus session notes'], nl: ['wat heb ik genoteerd in mijn focussessies', 'toon mijn notities van focussessies']},
];

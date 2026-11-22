import type {Intent} from './cases';

/**
 * Session AV lane 2 (rest): the questions the last "built in part" remainders raise, answered on the device by
 * lib/ai/local-answers/av2-rest.ts in English and Dutch. The lead adds them to the corpus (CORPUS, expected.json) once
 * av2RestAnswer is wired into engine.ts. `never`: what an answer to that question must not be.
 */
export const AV2_REST: readonly Intent[] = [
  {id: 'av2-repeating-projects', pillar: 'tasks', en: ['which projects repeat', 'what are my repeating projects'], nl: ['welke projecten herhalen zich', 'wat zijn mijn terugkerende projecten'], never: ['"add-task"']},
];

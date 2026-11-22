import type {Intent} from './cases';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #223–#229): the questions round 2's Tasks features raise, answered on the device by
 * lib/ai/local-answers/av2-tasks-r2.ts in English and Dutch. The lead adds them to the corpus (CORPUS, expected.json) once
 * av2TasksR2Answer is wired into engine.ts. `never`: what an answer to that question must not be.
 */
export const AV2_TASKS_R2: readonly Intent[] = [
  {id: 'av2r2-my-day', pillar: 'tasks', en: ['what is in my day', 'which tasks are in my day today'], nl: ['wat staat er in mijn dag', 'welke taken staan in mijn dag'], never: ['"add-task"']},
];

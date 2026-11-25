import type {Intent} from './cases';

/**
 * Session AW (X2, LEDGER #432–#437, #448; Amazing Marvin): the questions the stuck-task tools raise, answered on the device by
 * lib/ai/local-answers/aw-x2-tasks.ts in English and Dutch. The integrator adds them to the corpus (CORPUS, expected.json)
 * once awX2TasksAnswer is wired into engine.ts (it is, on this branch). `never`: what an answer must not be — a dread mark,
 * a move count and today's progress are facts, never a judgement or "behind".
 */
export const AW_X2: readonly Intent[] = [
  {id: 'awx2-dread', pillar: 'tasks', en: ['what am I dreading', 'which tasks am I dreading'], nl: ['waar zie ik tegenop', 'waar zie ik het meest tegenop'], never: ['lazy', 'lui', 'should have', 'had moeten']},
  {id: 'awx2-moved', pillar: 'tasks', en: ['what have I put off most', 'which tasks have I moved the most'], nl: ['wat heb ik het vaakst uitgesteld', 'welke taken heb ik het meest verschoven'], never: ['procrastinat', 'lazy', 'lui', 'behind', 'achter']},
  {id: 'awx2-long-open', pillar: 'tasks', en: ['which tasks have been open the longest', 'what are my oldest open tasks'], nl: ['welke taken staan het langst open', 'wat zijn mijn oudste open taken']},
  {id: 'awx2-day', pillar: 'tasks', en: ['how far am I with today\'s plan', 'how far through my day am I'], nl: ['hoe ver ben ik met mijn planning van vandaag', 'hoe ver ben ik met mijn taken van vandaag'], never: ['behind', 'achter', 'achterstand']},
  {id: 'awx2-target', pillar: 'tasks', en: ['am I on target for writing this week', 'how are my time targets'], nl: ['ben ik op koers voor schrijven deze week', 'hoe staan mijn tijddoelen ervoor'], never: ['behind', 'achter', 'failed', 'mislukt']},
  {id: 'awx2-stuck', pillar: 'tasks', en: ['how do I get started on a stuck task', 'what can I do when I am stuck on a task'], nl: ['hoe begin ik aan een taak waar ik op vastloop', 'wat kan ik doen als ik vastzit met een taak'], never: ['guarantee', 'garantie']},
];

import type {Intent} from './cases';

/**
 * Session AV lane 2 (r4-plan, LEDGER #300–#305; Motion): the questions round 4's planned week raises, answered on the device
 * by lib/ai/local-answers/av2-r4-plan.ts in English and Dutch. The lead adds them to the corpus (CORPUS, expected.json) once
 * av2R4PlanAnswer is wired into engine.ts. `never`: what an answer to that question must not be (an answer never moves a
 * task, and a deadline at risk is never said as a warning).
 */
export const AV2_R4_PLAN: readonly Intent[] = [
  {id: 'av2r4-plan-week', pillar: 'tasks', en: ['how would you plan my week', 'can you plan my week'], nl: ['hoe zou je mijn week plannen', 'kan ik mijn week plannen'], never: ['"add-task"', 'moved']},
  {id: 'av2r4-working-hours', pillar: 'tasks', en: ['what are my working hours', 'which working hours do my tasks use'], nl: ['wat zijn mijn werkuren', 'welke werktijden heb ik']},
  {id: 'av2r4-deadline-risk', pillar: 'tasks', en: ['can I make my deadlines', 'is there enough time for my deadlines'], nl: ['kan ik mijn deadlines halen', 'is er genoeg tijd voor mijn deadlines'], never: ['danger', 'warning', 'gevaar', 'waarschuwing']},
  {id: 'av2r4-waiting', pillar: 'tasks', en: ['which tasks are waiting for another task', 'what tasks are blocked'], nl: ['welke taken wachten op een andere taak', 'welke taken wachten nog']},
  {id: 'av2r4-pieces', pillar: 'tasks', en: ['how do I split a long task', 'which tasks are in pieces'], nl: ['hoe splits ik een lange taak', 'welke taken zijn in stukken verdeeld']},
  {id: 'av2r4-floating', pillar: 'tasks', en: ['which tasks are once a week', 'what do I do once this week'], nl: ['welke taken zijn een keer per week', 'wat doe ik een keer per week']},
];

import type {Intent} from './cases';

/**
 * Session AV lane 2 (r6-plan, LEDGER #391–#398; OmniFocus, Capacities): the questions round 6's planning rows raise, answered on
 * the device by lib/ai/local-answers/av2-r6-plan.ts in English and Dutch. The lead adds them to the corpus (CORPUS,
 * expected.json) once av2R6PlanAnswer is wired into engine.ts. `never`: what an answer must not be (a repeat's record is never
 * "behind" or a score).
 */
export const AV2_R6_PLAN: readonly Intent[] = [
  {id: 'av2r6-hold', pillar: 'tasks', en: ['which projects are on hold', 'how do I put a project on hold'], nl: ['welke projecten staan in de wacht', 'hoe zet ik een project in de wacht']},
  {id: 'av2r6-order', pillar: 'tasks', en: ['what is next in my projects', 'which tasks are waiting their turn'], nl: ['wat is de volgende taak in mijn project', 'welke taken wachten op hun beurt']},
  {id: 'av2r6-focus', pillar: 'tasks', en: ['what am I focused on', 'how do I focus on one project'], nl: ['waar ben ik op gefocust', 'hoe focus ik op een project']},
  {id: 'av2r6-review', pillar: 'tasks', en: ['which projects need a review', 'which projects should I review'], nl: ['welke projecten moet ik nakijken', 'welke projecten zijn aan de beurt']},
  {id: 'av2r6-record', pillar: 'tasks', en: ['how often did I do my repeating tasks', 'what is my repeating tasks record'], nl: ['hoe vaak heb ik mijn herhalende taken gedaan', 'hoe vaak doe ik mijn herhalende taken'], never: ['behind', 'achter', 'score']},
  {id: 'av2r6-groups', pillar: 'tasks', en: ['what label groups do I have', 'how do label groups work'], nl: ['welke labelgroepen heb ik', 'hoe werken labelgroepen']},
  {id: 'av2r6-bulk', pillar: 'tasks', en: ['how do I change several tasks at once', 'can I label multiple tasks at once'], nl: ['hoe pas ik meerdere taken tegelijk aan', 'kan ik meerdere taken tegelijk een label geven']},
  {id: 'av2r6-fromend', pillar: 'tasks', en: ['can a task repeat on the second to last Friday', 'can I repeat a task on the last workday'], nl: ['kan ik een taak laten herhalen op de voorlaatste vrijdag', 'kan ik een taak op de laatste werkdag laten herhalen']},
];

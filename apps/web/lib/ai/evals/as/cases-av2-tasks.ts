import type {Intent} from './cases';

/**
 * Session AV lane 2 (tasks): the questions lane 2's Tasks features raise, answered on the device by
 * lib/ai/local-answers/av2-tasks.ts in English and Dutch. The lead adds them to the corpus (CORPUS, expected.json) once
 * av2TasksAnswer is wired into engine.ts. `never`: what an answer to that question must not be.
 */
export const AV2_TASKS: readonly Intent[] = [
  {id: 'av2-week-objectives', pillar: 'tasks', en: ['what are my objectives this week', 'what are my weekly objectives'], nl: ['wat zijn mijn weekdoelen', 'welke weekdoelen heb ik'], never: ['"add-task"']},
  {id: 'av2-daily-goal', pillar: 'tasks', en: ['how many tasks did I finish today', 'what is my task streak'], nl: ['hoeveel taken heb ik vandaag afgerond', 'wat is mijn takenreeks'], never: ['habits']},
  {id: 'av2-time-spent', pillar: 'tasks', en: ['how much time did I spend on tasks today', 'how much time did I spend on tasks this week'], nl: ['hoeveel tijd heb ik vandaag aan taken besteed', 'hoeveel tijd heb ik deze week aan taken besteed']},
  {id: 'av2-timers', pillar: 'tasks', en: ['which timers are running', 'are any task timers running'], nl: ['welke timers lopen er', 'lopen er nu timers?']},
  {id: 'av2-day-limit', pillar: 'tasks', en: ['is my day too full', 'am I overcommitted today'], nl: ['is mijn dag te vol', 'is vandaag te vol']},
  {id: 'av2-start-early', pillar: 'tasks', en: ['which tasks start early'], nl: ['welke taken beginnen eerder']},
  {id: 'av2-areas', pillar: 'tasks', en: ['what are my areas', 'which task areas do I have'], nl: ['welke gebieden heb ik', 'wat zijn mijn gebieden']},
  {id: 'av2-templates', pillar: 'tasks', en: ['which task templates do I have', 'what project templates are there'], nl: ['welke sjablonen heb ik voor taken', 'welke sjablonen zijn er voor projecten']},
  {id: 'av2-pay-period', pillar: 'wealth', en: ['how much is left in my budgets this pay period', 'what is left in my budgets until payday'], nl: ['hoeveel heb ik nog over in mijn budgetten deze periode', 'wat is er over in mijn budgetten tot mijn salaris']},
  {id: 'av2-note-reminders', pillar: 'notes', en: ['which reminders are in my notes', 'what reminders did I write in my notes'], nl: ['welke herinneringen staan in mijn notities', 'welke herinneringen heb ik in mijn notities gezet']},
];

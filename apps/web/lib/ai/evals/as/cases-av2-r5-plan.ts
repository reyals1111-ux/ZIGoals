import type {Intent} from './cases';

/**
 * Session AV lane 2 (r5-plan, LEDGER #348–#354, #356, #357; Akiflow, Logseq, Tiimo): the questions round 5's planned day
 * raises, answered on the device by lib/ai/local-answers/av2-r5-plan.ts in English and Dutch. The lead adds them to the
 * corpus (CORPUS, expected.json) once av2R5PlanAnswer is wired into engine.ts. `never`: what an answer must not be (a week
 * that passed is never "missed"; a cancelled task is never called done; travel is never worked out from a route).
 */
export const AV2_R5_PLAN: readonly Intent[] = [
  {id: 'av2r5-doing', pillar: 'tasks', en: ['what am I doing right now', 'which tasks am I doing'], nl: ['waar ben ik nu mee bezig', 'welke taken ben ik aan het doen']},
  {id: 'av2r5-cancelled', pillar: 'tasks', en: ['which tasks did I cancel', 'what did I cancel'], nl: ['welke taken heb ik geannuleerd', 'wat heb ik geannuleerd']},
  {id: 'av2r5-bucket', pillar: 'tasks', en: ['what did I plan for this week without a day', 'which tasks are planned for next month'], nl: ['wat heb ik voor deze maand gepland', 'welke taken zijn gepland voor deze week'], never: ['missed', 'gemist']},
  {id: 'av2r5-blocks', pillar: 'tasks', en: ['what time blocks do I have today', 'how are my time blocks going'], nl: ['welke tijdblokken heb ik vandaag', 'hoe gaan mijn tijdblokken']},
  {id: 'av2r5-leave', pillar: 'tasks', en: ['when do I need to leave', 'what are my travel times today'], nl: ['hoe laat moet ik vertrekken', 'wanneer moet ik weg'], never: ['route says', 'traffic', 'verkeer']},
  {id: 'av2r5-place', pillar: 'tasks', en: ['where do I need to be today', 'where am I going today'], nl: ['waar moet ik vandaag zijn', 'waar moet ik heen']},
  {id: 'av2r5-steps', pillar: 'tasks', en: ['how do I play the steps of a task', 'can I put timers on my steps'], nl: ['hoe speel ik de stappen van een taak af', 'kan ik de stappen een voor een doen met een timer']},
  {id: 'av2r5-earlier', pillar: 'tasks', en: ['how do I change an earlier finish of a repeating task', 'how do I undo a tick from last week'], nl: ['hoe pas ik een eerdere keer van een herhalende taak aan', 'hoe kan ik een afvinking terugdraaien']},
  {id: 'av2r5-link', pillar: 'tasks', en: ['how do I link to a task', 'how do I copy a task link'], nl: ['hoe link ik naar een taak', 'hoe maak ik een link naar een taak']},
  {id: 'av2r5-zone', pillar: 'tasks', en: ['what time is it in my second time zone', 'show my second time zone'], nl: ['hoe laat is het in mijn tweede tijdzone', 'wat is mijn tweede tijdzone']},
];

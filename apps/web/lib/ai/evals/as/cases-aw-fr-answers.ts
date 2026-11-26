import type {Intent} from './cases';

/**
 * Session AW (fr-answers; the fresh-eyes persona walks, FRIEND_READINESS-aw): the questions NOVA and ZIGi answered wrongly
 * on the device, in English and Dutch. The integrator adds them to the corpus (cases.ts) and records their expected facts
 * (expected.json). `never`: words the answer must not hold — the wrong answer each one used to give.
 * - FR-AW-5: an average of calories never counts a day with a meal in words or an entry without calories as complete.
 * - FR-AW-6: tasks due tomorrow or in the week ahead are read (recorded today), never "still ahead".
 * - FR-AW-9: the Health replies without "(the button is there once Health is on your Today page)".
 * - FR-AW-10: a Dutch sleep answer says "(geschat)", never "(estimated)".
 * - FR-AW-17: "am I eating healthy" is the food diary's, never water or weight, with no judgement or advice.
 * - FR-AW-19: "compare this week with last week" is the week beside the one before, never a task card.
 * - FR-AW-22: "do I seem depressed" gets the gentler first lines and the same help lines (the guard, before any lookup).
 */
export const AW_FR_ANSWERS: readonly Intent[] = [
  {id: 'awfr-average-kcal', pillar: 'health', en: ['what was my average calories this week', 'what is my average kcal per day this week?'], nl: ['wat waren mijn gemiddelde calorieën deze week', 'gemiddeld hoeveel kcal per dag deze week?'], never: ['0 kcal', 'nothing logged', 'niets gelogd']},
  {id: 'awfr-due-ahead', pillar: 'tasks', en: ['what is due tomorrow', 'what is due next week?', 'what is due in the week ahead'], nl: ['wat moet er morgen af', 'wat moet er volgende week af?'], never: ['still ahead', 'reads only what is recorded', 'Tik op een voorbeeld', 'For example']},
  {id: 'awfr-health-shared', pillar: 'health', en: ['can you see my health?', 'is my health shared'], nl: ['kun je mijn gezondheid zien?', 'is mijn health gedeeld'], never: ['the button is there once', 'de knop staat er zodra']},
  {id: 'awfr-sleep-nl', pillar: 'health', en: ['how did I sleep last night'], nl: ['hoe heb ik vannacht geslapen', 'hoe sliep ik afgelopen nacht?'], never: ['(geschat) asleep', 'geslapen (estimated)', '(estimated) geslapen']},
  {id: 'awfr-eating-healthy', pillar: 'health', en: ['am I eating healthy?', 'is my diet healthy', 'how healthy is my diet?'], nl: ['eet ik gezond?', 'is mijn eten gezond', 'hoe gezond eet ik?'], never: ['water', 'weight', 'steps', 'you should', 'unhealthy', 'je moet', 'ongezond', 'gewicht', 'stappen', 'zigoals-action']},
  {id: 'awfr-compare-weeks', pillar: 'nova', en: ['compare this week with last week', 'this week vs last week', 'how was my week compared to last week?'], nl: ['vergelijk deze week met vorige week', 'hoe was mijn week vergeleken met vorige week?'], never: ['zigoals-action', 'A task for your list', 'add-task', 'Average steps last week', 'Tik op een voorbeeld']},
  {id: 'awfr-mood-reflective', pillar: 'journal', en: ['do I seem depressed?', 'does my journal sound depressed?'], nl: ['lijk ik depressief?', 'klinkt mijn dagboek somber?'], never: ['zigoals-action', 'you are depressed', 'je bent depressief', 'I\'m really sorry you\'re feeling this way', 'Wat naar dat je je zo voelt']},
];

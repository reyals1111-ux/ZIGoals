import type {Intent} from './cases';

/**
 * Session AV lane 2 (journal and notes): the questions the lane's Journal and Notes features raise, answered on the
 * device from each feature's own pure function (lib/ai/local-answers/av2-journal.ts), in English and Dutch. The lead adds
 * them to the corpus (CORPUS in cases.ts) and records expected.json. `never`: an answer to a different question.
 */
export const AV2_JOURNAL: readonly Intent[] = [
  {id: 'av2-journal-reminder', pillar: 'journal', en: ['when is my journal reminder', 'do i have a reminder to write'], nl: ['wanneer is mijn schrijfherinnering', 'heb ik een herinnering om te schrijven'], never: ['task reminder', 'taakherinnering']},
  {id: 'av2-journal-streak', pillar: 'journal', en: ['what is my writing streak', 'how many days in a row have I written in my journal'], nl: ['wat is mijn schrijfreeks', 'hoeveel dagen op rij heb ik in mijn dagboek geschreven'], never: ['habit']},
];

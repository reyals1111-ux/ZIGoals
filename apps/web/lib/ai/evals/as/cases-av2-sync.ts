import type {Intent} from './cases';

/**
 * Session AV lane 2 (sync and appearance): the questions the lane's sync and appearance features raise, answered on the
 * device from the device's own choices (lib/ai/local-answers/av2-sync.ts), in English and Dutch. The lead adds them to
 * the corpus (CORPUS in cases.ts) and records expected.json. `never`: an answer to a different question.
 */
export const AV2_SYNC: readonly Intent[] = [
  {id: 'av2-sync-sections', pillar: 'journal', en: ['is my journal synced', 'which records sync to my other devices'], nl: ['wordt mijn dagboek gesynchroniseerd', 'welke gegevens worden gesynchroniseerd'], never: ['written on']},
  {id: 'av2-sync-money', pillar: 'wealth', en: ['are my budgets synced', 'is my spending synced to my phone'], nl: ['worden mijn budgetten gesynchroniseerd', 'worden mijn uitgaven gesynchroniseerd']},
  {id: 'av2-look-dark-style', pillar: 'nova', en: ['is high contrast on', 'which theme am I using'], nl: ['staat hoog contrast aan', 'welk thema gebruik ik']},
  {id: 'av2-look-font', pillar: 'nova', en: ['which font am I using', 'can I change the font'], nl: ['welk lettertype gebruik ik', 'kan ik het lettertype veranderen']},
  {id: 'av2-backup-schedule', pillar: 'nova', en: ['when is my next backup', 'do I have automatic backups'], nl: ['wanneer is mijn volgende back-up', 'heb ik een automatische back-up']},
];

import type {Intent} from './cases';

/**
 * Session AV lane 2 (habits pillar): the questions the habits pillar's new features raise, answered on the device from
 * each feature's own pure function (lib/ai/local-answers/av2-habits.ts), in English and Dutch. The lead adds them to the
 * corpus (cases.ts) and records their expected answers. `never`: what the answer must not contain.
 */
export const AV2_HABITS: readonly Intent[] = [
  // Habit options (LEDGER #45, #49, #50, #52, #57)
  {id: 'av2-habits-whenever', pillar: 'habits', en: ['which habits have no schedule', 'which habits can I do whenever'], nl: ['welke gewoontes hebben geen vaste dagen', 'welke gewoontes hebben geen schema']},
  {id: 'av2-habits-never-twice', pillar: 'habits', en: ['which habits have never miss twice on', 'which habits keep my streak through a missed day'], nl: ['bij welke gewoontes staat nooit twee keer missen aan', 'welke gewoontes hebben de tweedagenregel']},
  {id: 'av2-habits-unlogged', pillar: 'habits', en: ['which habits count an unlogged day as skipped', 'which habits count days i dont log as skipped'], nl: ['welke gewoontes tellen een niet gelogde dag als overgeslagen']},
  {id: 'av2-habits-difficulty', pillar: 'habits', en: ['how much xp does a hard habit give', 'what difficulty are my habits'], nl: ['hoeveel xp geeft een zware gewoonte', 'wat is de moeilijkheid van mijn gewoontes'], never: ['Level']},
];

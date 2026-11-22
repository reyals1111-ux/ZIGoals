import type {Intent} from './cases';

/**
 * Session AV lane 2, round 3 (money; PocketGuard, Quicken Simplifi): the questions round 3's money features raise,
 * answered on the device from each feature's own pure function (lib/ai/local-answers/av2-r3-money.ts), in English and
 * Dutch. The lead adds `AV2_R3_MONEY` to the corpus (lib/ai/evals/as/cases.ts) and records expected.json.
 */
export const AV2_R3_MONEY: readonly Intent[] = [
  {id: 'av2r3-money-left-month', pillar: 'wealth', en: ['how much is left this month', 'what is my leftover this month'], nl: ['hoeveel heb ik deze maand over', 'wat blijft er deze maand over']},
  {id: 'av2r3-money-planned', pillar: 'wealth', en: ['which planned costs do I have', 'what one-off costs have I planned'], nl: ['welke geplande kosten heb ik', 'welke eenmalige kosten heb ik gepland']},
  {id: 'av2r3-money-forecast-months', pillar: 'wealth', en: ['what is my lowest cash in the next 6 months', 'how low will my balance get in the next 12 months'], nl: ['wat is mijn laagste saldo de komende 6 maanden', 'hoe laag wordt mijn saldo de komende 12 maanden']},
];

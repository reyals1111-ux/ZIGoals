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
  {id: 'av2r3-money-credit-card', pillar: 'wealth', en: ['how much of my credit card limit have I used', 'when is my credit card due'], nl: ['hoeveel van mijn creditcardlimiet heb ik gebruikt', 'wanneer moet mijn creditcard betaald worden']},
  {id: 'av2r3-money-needs-wants', pillar: 'wealth', en: ['how much went to needs and wants this month', 'what share of my income went to needs and wants'], nl: ['hoeveel ging er deze maand naar nodig en wensen', 'welk deel van mijn inkomen ging naar nodig en wensen']},
  {id: 'av2r3-money-waterfall', pillar: 'wealth', en: ['what changed in my spending since last month', 'show my spending waterfall'], nl: ['wat is er veranderd in mijn uitgaven sinds vorige maand', 'toon de waterval van mijn uitgaven']},
  {id: 'av2r3-money-beside-habits', pillar: 'wealth', en: ['do I spend less on days I do my habits', 'how much do I spend on days I complete a habit'], nl: ['geef ik minder uit op dagen dat ik mijn gewoontes doe', 'hoeveel geef ik uit op dagen met een gewoonte']},
];

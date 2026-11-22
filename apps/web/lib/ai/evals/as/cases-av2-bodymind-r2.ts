import type {Intent} from './cases';

/**
 * Session AV lane 2 (bodymind-r2; round 2: Rise, Reflectly, Moodnotes, Fitbod): the questions the round's features raise,
 * in English and Dutch, answered on the device by lib/ai/local-answers/av2-bodymind-r2.ts. The lead adds them to the
 * corpus (cases.ts) and records their expected facts (expected.json). `never`: words the answer must not hold.
 */
export const AV2_BODYMIND_R2: readonly Intent[] = [
  {id: 'av2r2-sleep-need', pillar: 'health', en: ['what is my sleep need', 'how much sleep do I need'], nl: ['wat is mijn slaapbehoefte', 'hoeveel slaap heb ik nodig'], never: ['average adult', 'population', 'you should']},
  {id: 'av2r2-naps', pillar: 'health', en: ['do my naps count in my sleep balance', 'how do naps affect my energy'], nl: ['tellen mijn dutjes mee in de slaapbalans', 'wat is het effect van dutjes op mijn energie']},
];

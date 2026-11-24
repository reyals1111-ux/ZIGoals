import type {Intent} from './cases';

/**
 * Session AV lane 2 (bodymind-r2; round 2: Rise, Reflectly, Moodnotes, Fitbod): the questions the round's features raise,
 * in English and Dutch, answered on the device by lib/ai/local-answers/av2-bodymind-r2.ts. The lead adds them to the
 * corpus (cases.ts) and records their expected facts (expected.json). `never`: words the answer must not hold.
 */
export const AV2_BODYMIND_R2: readonly Intent[] = [
  {id: 'av2r2-sleep-need', pillar: 'health', en: ['what is my sleep need', 'how much sleep do I need'], nl: ['wat is mijn slaapbehoefte', 'hoeveel slaap heb ik nodig'], never: ['average adult', 'population', 'you should']},
  {id: 'av2r2-naps', pillar: 'health', en: ['do my naps count in my sleep balance', 'how do naps affect my energy'], nl: ['tellen mijn dutjes mee in de slaapbalans', 'wat is het effect van dutjes op mijn energie']},
  {id: 'av2r2-morning-steps', pillar: 'health', en: ['what are my morning steps', 'when should I get daylight'], nl: ['wat zijn mijn ochtendstappen', 'wanneer moet ik daglicht pakken']},
  {id: 'av2r2-challenge', pillar: 'journal', en: ["what is today's challenge", 'what is my daily challenge'], nl: ['wat is de uitdaging van vandaag', 'wat is mijn dagelijkse uitdaging'], never: ['streak', 'reeks']},
  {id: 'av2r2-vent', pillar: 'journal', en: ['where can I vent', 'is there a place to vent'], nl: ['waar kan ik mijn hart luchten', 'is er een plek om stoom af te blazen']},
  {id: 'av2r2-feelings', pillar: 'health', en: ['what feelings did I log today', 'which feeling words do I have'], nl: ['welke gevoelens heb ik vandaag', 'welke gevoelswoorden heb ik'], never: ['diagnos', 'disorder', 'stoornis']},
  {id: 'av2r2-thinking-traps', pillar: 'journal', en: ['what are thinking traps', 'what is a thinking trap'], nl: ['wat zijn denkvalkuilen', 'wat is een denkvalkuil'], never: ['disorder', 'stoornis']},
  {id: 'av2r2-today-workout', pillar: 'health', en: ['what should I train today', 'which muscles are fresh'], nl: ['wat zal ik vandaag trainen', 'welke spieren zijn uitgerust'], never: ['kcal', 'calorie']},
  {id: 'av2r2-equipment', pillar: 'health', en: ['what equipment does the bench press need', 'which equipment do I need for a lat pulldown'], nl: ['welk materiaal heb ik nodig voor bankdrukken', 'welk materiaal is nodig voor de deadlift']},
  {id: 'av2r2-instead', pillar: 'health', en: ['what can I do instead of the bench press', 'what is an alternative to pull-ups'], nl: ['wat kan ik doen in plaats van bankdrukken', 'wat is een alternatief voor optrekken']},
];

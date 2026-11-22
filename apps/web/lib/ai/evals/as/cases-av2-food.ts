import type {Intent} from './cases';

/**
 * Session AV lane 2 (food): the questions the food lane's features raise, answered on the device from each feature's own
 * pure function (lib/ai/local-answers/av2-food.ts), in English and Dutch. The lead adds `AV2_FOOD` to the corpus
 * (cases.ts) and records expected.json. `never`: a wrong answer seen before the feature.
 */
export const AV2_FOOD: readonly Intent[] = [
  {id: 'av2-food-when-eaten', pillar: 'health', en: ['when did I eat today', 'what time did I have lunch today'], nl: ['wanneer heb ik vandaag gegeten', 'hoe laat at ik vandaag mijn lunch'], never: ['examples']},
  {id: 'av2-food-eating-window', pillar: 'health', en: ['what is my eating window today', 'what was my eating window yesterday'], nl: ['wat is mijn eetvenster vandaag', 'wat was mijn eetvenster gisteren']},
  {id: 'av2-food-weekday-targets', pillar: 'health', en: ['what are my targets by weekday', 'what is my calorie target on saturday'], nl: ['wat zijn mijn doelen per weekdag', 'wat is mijn caloriedoel voor zaterdag']},
  {id: 'av2-food-net-carbs', pillar: 'health', en: ['what are my net carbs today', 'how many net carbs did I eat yesterday'], nl: ['hoeveel netto koolhydraten heb ik vandaag', 'wat waren mijn netto koolhydraten gisteren']},
  {id: 'av2-food-timing', pillar: 'health', en: ['how much protein do I eat in the morning', 'when do I eat most of my carbs'], nl: ['hoeveel eiwit eet ik in de ochtend', 'wanneer eet ik de meeste koolhydraten']},
  {id: 'av2-food-oracle-protein', pillar: 'health', en: ['which foods are high in protein', 'what foods are rich in protein'], nl: ['welk eten bevat veel eiwit', 'welke voedingsmiddelen zijn rijk aan eiwit']},
  {id: 'av2-food-oracle-vitamin', pillar: 'health', en: ['which foods are high in vitamin C', 'what is a good source of vitamin B12'], nl: ['welk eten bevat veel vitamine C', 'welke voedingsmiddelen zijn rijk aan vitamine B12']},
];

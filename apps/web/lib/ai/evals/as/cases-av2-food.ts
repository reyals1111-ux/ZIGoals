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
  {id: 'av2-food-meal-reminders', pillar: 'health', en: ['when are my meal reminders', 'which meal reminders do I have'], nl: ['welke maaltijdherinneringen heb ik', 'wanneer zijn mijn maaltijdherinneringen']},
  {id: 'av2-food-challenge', pillar: 'health', en: ['how is my logging challenge going', 'how am I doing on my food logging challenge'], nl: ['hoe gaat mijn logchallenge', 'hoe sta ik ervoor met mijn eetuitdaging']},
  {id: 'av2-food-goal-date', pillar: 'health', en: ['when will I reach my goal weight', 'what is my goal weight date'], nl: ['wanneer bereik ik mijn streefgewicht', 'wanneer haal ik mijn doelgewicht']},
  {id: 'av2-food-check-in', pillar: 'health', en: ['when is my check-in day', 'which days are partly logged'], nl: ['wanneer is mijn weekcheck', 'welke dagen zijn gedeeltelijk gelogd']},
  {id: 'av2-food-pack-photos', pillar: 'health', en: ['where are my package photos', 'can I keep a photo of the package with a food'], nl: ['waar zijn mijn verpakkingsfoto\'s', 'kan ik een foto van de verpakking bewaren']},
  {id: 'av2-food-recipe-ideas', pillar: 'health', en: ['give me some vegan recipe ideas', 'show me some recipes to start from'], nl: ['geef me een paar vegetarische recepten', 'heb je recept ideeen']},
  {id: 'av2-food-fit-plan', pillar: 'health', en: ['plan my meals for tomorrow to fit my targets', 'make a meal plan that fits my macros'], nl: ['plan mijn maaltijden voor morgen', 'plan mijn eten voor morgen']},
  {id: 'av2-food-style-foods', pillar: 'health', en: ['which of my foods are low carb', 'which of my foods are high protein'], nl: ['welke van mijn voedingsmiddelen zijn eiwitrijk', 'welke van mijn voedingsmiddelen zijn koolhydraatarm']},
];

import type {Intent} from './cases';

/**
 * Session AV lane 2 (health r3; round 3: Waterllama, Way of Life, Carb Manager, Nike Training Club): the questions the
 * round's features raise, in English and Dutch, answered on the device by lib/ai/local-answers/av2-r3-health.ts. The lead
 * adds them to the corpus (cases.ts) and records their expected facts (expected.json). `never`: words the answer must not hold.
 */
export const AV2_R3_HEALTH: readonly Intent[] = [
  {id: 'av2r3-drink-energy', pillar: 'health', en: ['how many calories from drinks today', 'how much sugar from my drinks today'], nl: ['hoeveel calorieën uit drankjes vandaag', 'hoeveel suiker uit mijn drankjes vandaag'], never: ['burned', 'verbrand', 'estimate']},
  {id: 'av2r3-water-reminders', pillar: 'health', en: ['when are my water reminders', 'what are my water reminders today'], nl: ['wanneer zijn mijn waterherinneringen', 'welke waterherinneringen heb ik vandaag']},
  {id: 'av2r3-water-tip', pillar: 'health', en: ["what is today's water tip", 'give me a water tip'], nl: ['wat is de watertip van vandaag', 'geef me een watertip voor vandaag'], never: ['healthy', 'detox', 'gezond']},
  {id: 'av2r3-weigh-in', pillar: 'health', en: ['when is my weigh-in reminder', 'do I have a reminder to weigh in'], nl: ['wanneer is mijn weegherinnering', 'heb ik een herinnering om te wegen'], never: ['kg', 'lb']},
  {id: 'av2r3-habit-trend', pillar: 'habits', en: ['which habits am I doing more often', 'what is the trend of my habits'], nl: ['welke gewoontes doe ik vaker', 'welke gewoontes doe ik minder vaak'], never: ['attention', 'aandacht', 'warning']},
  {id: 'av2r3-meal-readings', pillar: 'health', en: ['what readings did I log with meals today', 'what were my glucose readings at lunch'], nl: ['welke metingen heb ik bij maaltijden gelogd', 'wat waren mijn glucose metingen bij de lunch'], never: ['normal', 'too high', 'too low', 'normaal', 'te hoog', 'te laag', 'GKI']},
  {id: 'av2r3-more-goals', pillar: 'health', en: ['how am I doing on my protein goal', 'how is my waist goal going'], nl: ['hoe sta ik ervoor met mijn eiwitdoel', 'hoe gaat het met mijn taille doel'], never: ['you should', 'je moet']},
  {id: 'av2r3-circuits', pillar: 'health', en: ['what circuits do I have', 'which timed circuits are saved'], nl: ['welke circuits heb ik', 'welke circuits staan er'], never: ['kcal', 'calorie']},
  {id: 'av2r3-short-routines', pillar: 'health', en: ['which routines fit in 30 minutes', 'what workouts can I do in 30 minutes'], nl: ['welke routines passen in 30 minuten', 'welke routines kan ik doen binnen 30 minuten']},
];

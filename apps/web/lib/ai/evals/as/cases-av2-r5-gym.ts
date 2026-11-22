import type {Intent} from './cases';

/**
 * Session AV lane 2, round 5 (gym; Gentler Streak, Bevel): the questions the round's Workouts features raise, in English
 * and Dutch, answered on the device by lib/ai/local-answers/av2-r5-gym.ts. The lead adds them to the corpus (cases.ts) and
 * records their expected facts (expected.json). `never`: words the answer must not hold.
 */
export const AV2_R5_GYM: readonly Intent[] = [
  {id: 'av2r5-status', pillar: 'health', en: ['what is my workout status', 'am I on a break from training'], nl: ['wat is mijn trainingsstatus', 'heb ik pauze van trainen'], never: ['you should', 'recover', 'symptom', 'je moet', 'herstel']},
  {id: 'av2r5-band', pillar: 'health', en: ['how much have I moved this week', 'what is my movement band'], nl: ['hoeveel heb ik deze week bewogen', 'wat is mijn bewegingsband'], never: ['kcal', 'burn', 'you must', 'rest day', 'verbrand', 'je moet']},
  {id: 'av2r5-everyday', pillar: 'health', en: ['how much everyday movement did I do this week', 'how much gardening did I do this week'], nl: ['hoeveel dagelijkse beweging heb ik deze week gedaan', 'hoeveel minuten tuinieren heb ik deze week'], never: ['kcal', 'burn', 'verbrand', 'energy used']},
  {id: 'av2r5-favourites', pillar: 'health', en: ['which workouts are my favourites', 'what are my favourite workouts'], nl: ['welke workouts zijn mijn favorieten', 'wat zijn mijn favoriete workouts'], never: ['kcal', 'upload']},
  {id: 'av2r5-keep-weights', pillar: 'health', en: ['which routines keep my last weights', 'does my routine remember my weights'], nl: ['welke routines onthouden mijn laatste gewichten', 'onthoudt mijn routine de gewichten?'], never: ['kcal', 'you should', 'je moet']},
  {id: 'av2r5-feel', pillar: 'health', en: ["can my workout be easier when I'm tired", 'does the suggested workout change when I am sore'], nl: ['kan mijn workout lichter als ik moe ben?', 'wordt de training korter als ik stijf ben?'], never: ['injury', 'pain', 'symptom', 'medical', 'blessure', 'pijn']},
  {id: 'av2r5-one-side', pillar: 'health', en: ['how do I count plates on one side', 'how do plates work on a sled'], nl: ['hoe reken ik schijven aan één kant', 'hoe werken schijven op een slede'], never: ['kcal']},
];

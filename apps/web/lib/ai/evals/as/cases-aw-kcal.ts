import type {Intent} from './cases';

/**
 * Session AW (kcal; owner decision 1a and amendment 4, ADR-046): "how many calories did I burn", in English and Dutch,
 * answered on the device by lib/ai/local-answers/aw-kcal.ts from what the person typed on an activity ("you entered") or a
 * file brought in ("from your file"), or with the honest line that ZIGoals does not work it out. The lead adds them to the
 * corpus (cases.ts) and records their expected facts (expected.json). `never`: words the answer must not hold — an
 * estimate, and the calories eaten that these questions used to get ("Energy today: 1,970 kcal from 4 diary entries").
 */
const NEVER = ['estimate', 'burned about', 'roughly', '≈', 'diary entries', 'schatting', 'ongeveer', 'eten gelogd'] as const;
export const AW_KCAL: readonly Intent[] = [
  {id: 'awkcal-burned-today', pillar: 'health', en: ['how many calories did I burn today', 'calories burned today', 'how many kcal did I burn today?'], nl: ['hoeveel calorieën heb ik verbrand', 'hoeveel calorieën heb ik vandaag verbrand', 'hoeveel kcal heb ik vandaag verbrand?'], never: NEVER},
  {id: 'awkcal-burned-week', pillar: 'health', en: ['how many calories did I burn this week', 'calories burned this week'], nl: ['hoeveel calorieën heb ik deze week verbrand', 'hoeveel kcal verbrandde ik deze week'], never: NEVER},
];

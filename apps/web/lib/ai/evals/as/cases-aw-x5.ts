import type {Intent} from './cases';

/**
 * Session AW (X5, LEDGER #452, #454, #455; Paprika): the questions round 7's kitchen rows raise — what at home should be
 * used soon (the pantry's use-by days), when a recipe was last made (its diary entries and "Made it" in the cooking view,
 * with the person's stars), and the menu for next week (that week's meal plans and the menus kept by name) — answered on
 * the device by lib/ai/local-answers/aw-x5-paprika.ts (awX5Answer, wired in engine.ts) in English and Dutch. The lead adds
 * them to the corpus (CORPUS, expected.json). The Showcase holds a labelled pantry with use-by days, a pea soup made
 * twice with four stars, and one kept menu (lib/food-plus/aw-x5-showcase.ts). `never`: an answer never claims a change,
 * never gives a food-safety rule, and never counts an unknown as 0.
 */
export const AW_X5: readonly Intent[] = [
  {id: 'awx5-use-soon', pillar: 'health', en: ['what\'s in my pantry that I should use soon', 'what should I use up first at home'], nl: ['wat in mijn voorraad moet ik snel opmaken', 'wat moet ik thuis eerst opmaken'], never: ['is safe', 'veilig', 'I set', 'ik heb gezet']},
  {id: 'awx5-last-made', pillar: 'health', en: ['when did I last make pea soup', 'how often have I made the pea soup'], nl: ['wanneer heb ik voor het laatst pea soup gemaakt', 'hoe vaak heb ik de pea soup gemaakt'], never: ['0 times', '0 keer']},
  {id: 'awx5-menu-next-week', pillar: 'health', en: ['what\'s my menu for next week', 'what is on my menu next week'], nl: ['wat is mijn menu voor volgende week', 'wat staat er volgende week op het menu'], never: ['I planned', 'ik heb gepland']},
];

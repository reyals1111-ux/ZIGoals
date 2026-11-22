import type {Intent} from './cases';

/**
 * Session AV lane 2, round 4 (money; Actual Budget, Lunch Money): the questions round 4's money features raise, answered
 * on the device from each feature's own pure function (lib/ai/local-answers/av2-r4-money.ts), in English and Dutch. The
 * lead adds `AV2_R4_MONEY` to the corpus (lib/ai/evals/as/cases.ts) and records expected.json.
 */
export const AV2_R4_MONEY: readonly Intent[] = [
  {id: 'av2r4-money-calendar', pillar: 'wealth', en: ['which day did I spend the most this month', 'show the calendar of my spending'], nl: ['welke dag gaf ik deze maand het meest uit', 'toon de kalender van mijn uitgaven']},
  {id: 'av2r4-money-archived', pillar: 'wealth', en: ['which categories have I archived', 'show my archived categories'], nl: ['welke categorieën heb ik gearchiveerd', 'toon mijn gearchiveerde categorieën']},
  {id: 'av2r4-money-starter-sets', pillar: 'wealth', en: ['what starter category sets are there', 'which category templates can I start from'], nl: ['welke startsets met categorieën zijn er', 'welke categoriesets kan ik gebruiken']},
  {id: 'av2r4-money-groups', pillar: 'wealth', en: ['which groups of entries do I have', 'show my grouped transactions'], nl: ['welke groepen van invoer heb ik', 'toon mijn gegroepeerde uitgaven']},
  {id: 'av2r4-money-places', pillar: 'wealth', en: ['which places have I kept for my payees', 'show my payee places'], nl: ['welke plekken heb ik voor mijn betalingen', 'toon de winkels bij mijn plekken']},
  {id: 'av2r4-money-reconcile', pillar: 'wealth', en: ['when did I last check my entries against my bank', 'how far have I reconciled my account'], nl: ['wanneer heb ik mijn uitgaven voor het laatst gecontroleerd met mijn bank', 'wanneer is mijn rekening voor het laatst afgestemd met de bank']},
  {id: 'av2r4-money-saved-searches', pillar: 'wealth', en: ['what are my saved searches', 'show my saved money searches'], nl: ['wat zijn mijn opgeslagen zoekopdrachten', 'toon mijn bewaarde zoekopdrachten']},
  {id: 'av2r4-money-average', pillar: 'wealth', en: ['how does this month compare to my 6 month average spending', 'what is my 6 month average spending'], nl: ['hoe verhouden mijn uitgaven deze maand zich tot mijn 6 maandsgemiddelde', 'wat is mijn maandgemiddelde aan uitgaven']},
  {id: 'av2r4-money-invest-cover', pillar: 'wealth', en: ['how much of my spending does my investment income cover', 'show my investment income beside spending'], nl: ['welk deel van mijn uitgaven dekken mijn beleggingsinkomsten', 'toon mijn beleggingsinkomsten naast mijn uitgaven']},
];

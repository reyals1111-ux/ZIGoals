import type {Intent} from './cases';

/**
 * Session AV lane 2 (r6-notes, LEDGER #399–#410): the questions round 6's notes and journal features raise, answered on
 * the device by lib/ai/local-answers/av2-r6-notes.ts in English and Dutch. The lead adds them to the corpus (CORPUS,
 * expected.json) once av2R6NotesAnswer is wired into engine.ts.
 */
export const AV2_R6_NOTES: readonly Intent[] = [
  {id: 'av2r6-tag-rename', pillar: 'notes', en: ['how do I rename a tag in my notes', 'can I merge two tags in my notes'], nl: ['hoe hernoem ik een tag in mijn notities', 'kan ik twee tags samenvoegen in mijn notities']},
  {id: 'av2r6-merge-notes', pillar: 'notes', en: ['how do I merge two notes', 'can I combine one note into another note'], nl: ['hoe voeg ik twee notities samen', 'kan ik een notitie met een andere notitie samenvoegen']},
  {id: 'av2r6-read-back', pillar: 'notes', en: ['which daily notes have I not read back yet', 'how do I mark a daily note as read back'], nl: ['welke dagnotities heb ik nog niet teruggelezen', 'hoe markeer ik een dagnotitie als teruggelezen']},
  {id: 'av2r6-prop-sums', pillar: 'notes', en: ['what is the sum of a number property across my notes', 'what is the average of a property over my notes'], nl: ['wat is de som van een eigenschap over mijn notities', 'wat is het gemiddelde van een eigenschap in mijn notities']},
  {id: 'av2r6-prop-many', pillar: 'notes', en: ['how do I set a property on all chosen notes', 'can I give many notes the same property'], nl: ['hoe geef ik gekozen notities dezelfde eigenschap', 'kan ik een eigenschap op veel notities zetten']},
  {id: 'av2r6-word-goal', pillar: 'journal', en: ['what is my daily word goal', 'did I reach my word goal today'], nl: ['wat is mijn woorddoel per dag', 'heb ik mijn woorddoel vandaag gehaald']},
  {id: 'av2r6-people', pillar: 'journal', en: ['who appears most in my journal entries', 'how do I add who was there to a journal entry'], nl: ['wie komt het vaakst voor in mijn dagboek', 'hoe voeg ik toe wie erbij was in een dagboekstuk']},
  {id: 'av2r6-any-day', pillar: 'journal', en: ['how do I see on this day for another date', 'can I see on this day for any day'], nl: ['hoe zie ik op deze dag voor een andere datum', 'kan ik op deze dag zien voor elke dag']},
  {id: 'av2r6-photos', pillar: 'journal', en: ['where are all my journal photos', 'can I see every photo in my journal'], nl: ['waar staan alle fotos van mijn dagboek', 'kan ik een overzicht van de fotos in mijn dagboek zien']},
  {id: 'av2r6-sky', pillar: 'journal', en: ['what time is sunrise today', 'what phase is the moon today'], nl: ['hoe laat is de zonsopkomst vandaag', 'welke fase heeft de maan vandaag']},
  {id: 'av2r6-lock-away', pillar: 'journal', en: ['can ZIGoals lock again after I am away', 'how do I make the lock come back after a few minutes'], nl: ['kan ik ZIGoals opnieuw laten vergrendelen als ik even weg ben', 'hoe laat ik het weer op slot gaan na een paar minuten']},
  {id: 'av2r6-imports', pillar: 'journal', en: ['can I import my Journey journal', 'how do I import journal entries from a csv'], nl: ['kan ik mijn Journey dagboek importeren', 'hoe importeer ik dagboekstukken uit een csv']},
];

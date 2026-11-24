import type {Intent} from './cases';

/**
 * Session AV lane 2 (r4-mind, LEDGER #308–#310, #317, #323–#327): the questions round 4's journal and mind features raise,
 * answered on the device by lib/ai/local-answers/av2-r4-mind.ts in English and Dutch. The lead adds them to the corpus
 * (CORPUS, expected.json) once av2R4MindAnswer is wired into engine.ts. `never`: what an answer must not hold.
 */
export const AV2_R4_MIND: readonly Intent[] = [
  {id: 'av2r4-journal-ticks', pillar: 'journal', en: ['which tick boxes are open in my journal', 'how do I add a checklist to a journal entry'], nl: ['welke vinkjes staan nog open in mijn dagboek', 'hoe zet ik vinkjes in een dagboekstuk']},
  {id: 'av2r4-journal-format', pillar: 'journal', en: ['how do I make words bold in my journal', 'can I use headings in a journal entry'], nl: ['hoe maak ik woorden vet in mijn dagboek', 'kan ik koppen gebruiken in een dagboekstuk']},
  {id: 'av2r4-favourites', pillar: 'journal', en: ['which journal entries are my favourites', 'show my starred journal entries'], nl: ['welke dagboekstukken zijn favoriet', 'toon mijn favoriete dagboekstukken']},
  {id: 'av2r4-throwback', pillar: 'journal', en: ['what did I write a week ago', 'do I have a journal memory from a month ago'], nl: ['wat schreef ik een week geleden', 'heb ik een herinnering van een maand geleden in mijn dagboek'], never: ['(SHOWCASE DATA)']},
  {id: 'av2r4-photos', pillar: 'journal', en: ['how many photos can a journal entry have', 'how many pictures fit in one diary entry'], nl: ['hoeveel foto s kan een dagboekstuk hebben', 'hoeveel foto s passen in een stuk van mijn dagboek']},
  {id: 'av2r4-identity', pillar: 'habits', en: ['show who I am becoming', 'what are my identity lines for my habits'], nl: ['toon wie ik wil worden', 'wat zijn mijn identiteit zinnen bij mijn gewoontes']},
  {id: 'av2r4-step-up', pillar: 'habits', en: ['which habits are ready to step up', 'what is the small version of my habits'], nl: ['welke gewoontes kan ik opschalen', 'wat is de kleine versie van mijn gewoontes']},
  {id: 'av2r4-word-meaning', pillar: 'health', en: ['what does restless mean', 'what does the word on edge mean'], nl: ['wat betekent restless', 'wat betekent het woord homesick']},
  {id: 'av2r4-feeling-choices', pillar: 'health', en: ['what can I do when I feel stressed', 'what helps when I feel lonely'], nl: ['wat kan ik doen als ik me stressed voel', 'wat helpt als ik me lonely voel'], never: ['you should', 'je moet']},
  {id: 'av2r4-where-felt', pillar: 'health', en: ['where do I feel stress in my body', 'where did I feel my feelings in my body'], nl: ['waar voel ik spanning in mijn lichaam', 'waar voel ik mijn gevoelens in mijn lichaam']},
];

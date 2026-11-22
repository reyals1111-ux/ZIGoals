import type {Intent} from './cases';

/**
 * Session AV lane 2 (r4-notes, LEDGER #306, #307, #311–#316, #318–#321): the questions round 4's notes features raise,
 * answered on the device by lib/ai/local-answers/av2-r4-notes.ts in English and Dutch. The lead adds them to the corpus
 * (CORPUS, expected.json) once av2R4NotesAnswer is wired into engine.ts.
 */
export const AV2_R4_NOTES: readonly Intent[] = [
  {id: 'av2r4-tags', pillar: 'notes', en: ['which nested tags do my notes have', 'what is my focus tag in notes'], nl: ['welke geneste tags hebben mijn notities', 'wat is mijn focustag in notities']},
  {id: 'av2r4-note-photos', pillar: 'notes', en: ['which notes have photos', 'how many photos are in my notes'], nl: ['welke notities hebben fotos', 'hoeveel fotos staan in mijn notities']},
  {id: 'av2r4-note-words', pillar: 'notes', en: ['how many words are in my notes', 'how long are my notes in words'], nl: ['hoeveel woorden staan in mijn notities', 'hoeveel woorden hebben mijn notities']},
  {id: 'av2r4-find-replace', pillar: 'notes', en: ['how do I find and replace in a note', 'can I replace words in a note'], nl: ['hoe zoek en vervang ik in een notitie', 'kan ik woorden vervangen in een notitie']},
  {id: 'av2r4-fold', pillar: 'notes', en: ['how do I fold a section in a note', 'can I collapse headings in a note'], nl: ['hoe vouw ik een kop in een notitie in', 'kan ik koppen inklappen in een notitie']},
  {id: 'av2r4-callouts', pillar: 'notes', en: ['how do I add a callout to a note', 'what callouts can a note have'], nl: ['hoe maak ik een callout in een notitie', 'welke kaders kan een notitie hebben']},
  {id: 'av2r4-writing-view', pillar: 'notes', en: ['how do I write in full screen', 'is there a typewriter mode for notes'], nl: ['hoe schrijf ik in volledig scherm', 'kan ik zonder afleiding schrijven']},
  {id: 'av2r4-archive', pillar: 'notes', en: ['which notes are archived', 'how do I archive a note'], nl: ['welke notities zijn gearchiveerd', 'hoe archiveer ik een notitie']},
  {id: 'av2r4-lock', pillar: 'notes', en: ['how do I lock a note', 'can I put a password on a note'], nl: ['hoe vergrendel ik een notitie', 'kan ik een notitie op slot zetten']},
  {id: 'av2r4-save-note', pillar: 'notes', en: ['can I export a note as word', 'how do I save a note as html'], nl: ['kan ik een notitie als word bestand opslaan', 'hoe exporteer ik een notitie als html']},
  {id: 'av2r4-journal-book', pillar: 'journal', en: ['can I export my journal as an ebook', 'can I turn my journal into a word file'], nl: ['kan ik mijn dagboek als e-book exporteren', 'kan ik mijn dagboek als word bestand opslaan']},
  {id: 'av2r4-imports', pillar: 'notes', en: ['can I import my notes from evernote', 'how do I move my notes from bear'], nl: ['kan ik mijn notities uit evernote importeren', 'hoe zet ik mijn notities over uit bear']},
];

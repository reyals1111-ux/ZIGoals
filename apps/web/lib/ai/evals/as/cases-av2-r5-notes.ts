import type {Intent} from './cases';

/**
 * Session AV lane 2 (r5-notes, LEDGER #355, #358–#367): the questions round 5's notes features raise, answered on the
 * device by lib/ai/local-answers/av2-r5-notes.ts in English and Dutch. The lead adds them to the corpus (CORPUS,
 * expected.json) once av2R5NotesAnswer is wired into engine.ts.
 */
export const AV2_R5_NOTES: readonly Intent[] = [
  {id: 'av2r5-trash', pillar: 'notes', en: ['which notes are in recently deleted', 'how do I restore a deleted note'], nl: ['welke notities zijn verwijderd', 'hoe zet ik een verwijderde notitie terug']},
  {id: 'av2r5-several', pillar: 'notes', en: ['how do I tag several notes at once', 'can I archive multiple notes together'], nl: ['hoe tag ik meerdere notities tegelijk', 'kan ik meerdere notities tegelijk archiveren']},
  {id: 'av2r5-unlinked', pillar: 'notes', en: ['which notes mention this note without a link', 'where are the unlinked mentions of a note'], nl: ['welke notities noemen deze notitie zonder link', 'waar zie ik vermeldingen van een notitie zonder link']},
  {id: 'av2r5-embed', pillar: 'notes', en: ['how do I embed a section of another note', 'can I show a heading of another note inside a note'], nl: ['hoe sluit ik een deel van een andere notitie in', 'kan ik een kop van een andere notitie in een notitie tonen']},
  {id: 'av2r5-tag-templates', pillar: 'notes', en: ['which tags have a template', 'how do I set a template for a tag'], nl: ['welke tags hebben een sjabloon', 'hoe maak ik een sjabloon voor een tag']},
  {id: 'av2r5-tables', pillar: 'notes', en: ['how do I sort a table in a note', 'can I add a row to a table in my notes'], nl: ['hoe sorteer ik een tabel in een notitie', 'kan ik een rij toevoegen aan een tabel in mijn notities']},
  {id: 'av2r5-event-note', pillar: 'notes', en: ['how do I make a note for a calendar event', 'can I write notes for an imported meeting in my calendar'], nl: ['hoe maak ik een notitie bij een afspraak', 'kan ik notities maken voor een afspraak in mijn agenda']},
  {id: 'av2r5-daily-range', pillar: 'notes', en: ['how do I export my daily notes for a range of days', 'can I download daily notes from last month'], nl: ['hoe exporteer ik mijn dagnotities van een periode', 'kan ik dagnotities van vorige maand downloaden']},
  {id: 'av2r5-look', pillar: 'notes', en: ['how do I give a note a cover', 'can I change the background colour of a note'], nl: ['hoe geef ik een notitie een omslag', 'kan ik de achtergrondkleur van een notitie veranderen']},
  {id: 'av2r5-cards', pillar: 'notes', en: ['how many flashcards do I have in my notes', 'how do I review cards from my notes'], nl: ['hoeveel flashcards staan in mijn notities', 'hoe herhaal ik leerkaartjes uit mijn notities']},
  {id: 'av2r5-task-files', pillar: 'tasks', en: ['can I attach a pdf to a task', 'where are the files on my tasks'], nl: ['kan ik een pdf aan een taak toevoegen', 'waar staan de bestanden bij mijn taken']},
];

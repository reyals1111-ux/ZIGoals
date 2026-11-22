import type {Intent} from './cases';

/**
 * Session AV lane 2 (r3-notes, LEDGER #264–#273, #277–#279): the questions round 3's notes and journal features raise,
 * answered on the device by lib/ai/local-answers/av2-r3-notes.ts in English and Dutch. The lead adds them to the corpus
 * (CORPUS, expected.json) once av2R3NotesAnswer is wired into engine.ts. `never`: what an answer must not hold.
 */
export const AV2_R3_NOTES: readonly Intent[] = [
  {id: 'av2r3-open-ticks', pillar: 'notes', en: ['which tick boxes are open in my notes', 'what is still to tick in my notes checklists'], nl: ['welke vinkjes staan nog open in mijn notities', 'welke aanvinkvakjes in mijn notities zijn nog open']},
  {id: 'av2r3-highlights', pillar: 'notes', en: ['what did I highlight in my notes', 'show the highlights in my notes'], nl: ['wat heb ik gemarkeerd in mijn notities', 'welke markeringen staan in mijn notities']},
  {id: 'av2r3-print-note', pillar: 'notes', en: ['how do I print a note', 'can I save a note as a pdf'], nl: ['hoe print ik een notitie', 'kan ik een notitie als pdf opslaan']},
  {id: 'av2r3-note-props', pillar: 'notes', en: ['which properties do my notes have', 'what fields do my notes use'], nl: ['welke eigenschappen hebben mijn notities', 'welke velden gebruiken mijn notities']},
  {id: 'av2r3-canvas', pillar: 'notes', en: ['which canvases do I have', 'what is on my canvas'], nl: ['welke canvassen heb ik', 'hoeveel canvassen heb ik in notities']},
  {id: 'av2r3-prompts-written', pillar: 'journal', en: ['which prompts have I written from', 'what templates have I used in my journal'], nl: ['welke prompts heb ik gebruikt', 'welke sjablonen heb ik gebruikt in mijn dagboek']},
  {id: 'av2r3-mandala', pillar: 'journal', en: ['how do I make a mandala in my journal', 'can I write a journal entry as a grid'], nl: ['hoe maak ik een mandala in mijn dagboek', 'kan ik een dagboekstuk als raster schrijven']},
  {id: 'av2r3-periods', pillar: 'journal', en: ['which week or month look backs have I written', 'do I have any year look back'], nl: ['welke terugblikken heb ik geschreven', 'heb ik een terugblik op het jaar']},
  {id: 'av2r3-journal-markdown', pillar: 'journal', en: ['can I export my journal as markdown', 'how do I get my journal into obsidian'], nl: ['kan ik mijn dagboek als markdown exporteren', 'hoe zet ik mijn dagboek in obsidian']},
  {id: 'av2r3-stoic-quote', pillar: 'journal', en: ['what is today s stoic quote', 'give me a quote from marcus aurelius'], nl: ['wat is het citaat van vandaag', 'geef me een stoicijns citaat']},
  {id: 'av2r3-dreams', pillar: 'journal', en: ['which dreams did I write down', 'how many dreams have I written'], nl: ['welke dromen heb ik opgeschreven', 'hoeveel dromen heb ik opgeschreven']},
  {id: 'av2r3-letters', pillar: 'journal', en: ['when does my letter open', 'do I have a letter to open later'], nl: ['wanneer gaat mijn brief open', 'heb ik een brief om later te openen']},
];

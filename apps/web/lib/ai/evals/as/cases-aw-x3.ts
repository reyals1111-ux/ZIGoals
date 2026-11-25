import type {Intent} from './cases';

/**
 * Session AW (x3, LEDGER #441, #442, #444, #445; Evernote and The Five Minute Journal): the questions this group's notes
 * and journal features raise, answered on the device by lib/ai/local-answers/aw-x3.ts in English and Dutch. The lead adds
 * them to the corpus (CORPUS, expected.json); awX3Answer is wired into engine.ts.
 */
export const AW_X3: readonly Intent[] = [
  {id: 'awx3-this-morning', pillar: 'journal', en: ['what did I write this morning', 'what is on my morning page'], nl: ['wat heb ik vanochtend geschreven', 'wat staat er op mijn ochtendpagina'], never: ['0 answers']},
  {id: 'awx3-photo-a-day', pillar: 'journal', en: ['do I have a photo for every day this month', 'how many days this month have a photo of the day'], nl: ['heb ik deze maand elke dag een foto', 'hoeveel dagen hebben deze maand een foto van de dag'], never: ['missed']},
  {id: 'awx3-saved-searches', pillar: 'notes', en: ['my saved searches in notes', 'which searches have I saved in my notes'], nl: ['mijn bewaarde zoekopdrachten in notities', 'welke opgeslagen zoekopdrachten heb ik in mijn notities']},
  {id: 'awx3-voice-faster', pillar: 'journal', en: ['can I play my voice notes faster', 'how do I change the speed of a voice note'], nl: ['kan ik mijn spraakmemos sneller afspelen', 'hoe verander ik de snelheid van een spraakmemo']},
  {id: 'awx3-day-pages', pillar: 'journal', en: ['how do I write a morning and evening page', 'can my journal have a morning page and an evening page'], nl: ['hoe schrijf ik een ochtend en avondpagina', 'kan ik in mijn dagboek een ochtendpagina en een avondpagina schrijven']},
];

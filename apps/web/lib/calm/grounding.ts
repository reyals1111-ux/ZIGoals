/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #414, Moodfit's grounding): "Five, four, three, two, one" under Calm — five
 * things you can see, four you can touch, three you can hear, two you can smell and one you can taste, each answered in a
 * word or skipped, in English and Dutch. A fixed, common grounding exercise with no reading of what the answers mean:
 * nothing is scored, nothing is kept unless the person saves the words as a journal line. Pure.
 */
export type GroundingStep = {count: 5 | 4 | 3 | 2 | 1; sense: 'see' | 'touch' | 'hear' | 'smell' | 'taste'; en: string; nl: string};
export const GROUNDING: readonly GroundingStep[] = [
  {count: 5, sense: 'see', en: 'Five things you can see', nl: 'Vijf dingen die je ziet'},
  {count: 4, sense: 'touch', en: 'Four things you can touch', nl: 'Vier dingen die je kunt aanraken'},
  {count: 3, sense: 'hear', en: 'Three things you can hear', nl: 'Drie dingen die je hoort'},
  {count: 2, sense: 'smell', en: 'Two things you can smell', nl: 'Twee dingen die je ruikt'},
  {count: 1, sense: 'taste', en: 'One thing you can taste', nl: 'Eén ding dat je proeft'},
];
export const GROUNDING_WORDS = {
  en: {title: 'Five, four, three, two, one', about: 'A short grounding exercise: notice what is around you, one sense at a time. A word for each, or skip; nothing is kept unless you save it.', word: 'A word', next: 'Next', skip: 'Skip this one', back: 'Back', done: 'You noticed what is around you, one sense at a time.', save: 'Save these words as a journal line', again: 'Start again', saved: 'Saved as a line in your journal, on this device.', language: 'In het Nederlands', nothing: 'No words were written, so there is nothing to save. That is fine too.'},
  nl: {title: 'Vijf, vier, drie, twee, één', about: 'Een korte oefening om te aarden: merk op wat er om je heen is, één zintuig tegelijk. Een woord voor elk, of sla over; er wordt niets bewaard tenzij je het opslaat.', word: 'Een woord', next: 'Volgende', skip: 'Sla deze over', back: 'Terug', done: 'Je hebt opgemerkt wat er om je heen is, één zintuig tegelijk.', save: 'Bewaar deze woorden als regel in je dagboek', again: 'Opnieuw beginnen', saved: 'Bewaard als regel in je dagboek, op dit apparaat.', language: 'In English', nothing: 'Er zijn geen woorden geschreven, dus er is niets te bewaren. Ook goed.'},
} as const;
export const stepWords = (lang: 'en' | 'nl', i: number) => lang === 'nl' ? `Stap ${i} van 5` : `Step ${i} of 5`;
export const GROUNDING_WORD_MAX = 40;
/** The journal line: each sense with the words given ("See: lamp, window · Hear: rain"); '' when nothing was written. */
export function groundingLine(answers: readonly (readonly string[])[], lang: 'en' | 'nl' = 'en'): string {
  const names = lang === 'nl' ? {see: 'Zien', touch: 'Voelen', hear: 'Horen', smell: 'Ruiken', taste: 'Proeven'} : {see: 'See', touch: 'Touch', hear: 'Hear', smell: 'Smell', taste: 'Taste'};
  const parts = GROUNDING.map((s, i) => { const words = (answers[i] ?? []).map(w => w.replace(/\s+/g, ' ').trim().slice(0, GROUNDING_WORD_MAX)).filter(Boolean).slice(0, s.count); return words.length ? `${names[s.sense]}: ${words.join(', ')}` : ''; }).filter(Boolean);
  return parts.length ? `${GROUNDING_WORDS[lang].title} — ${parts.join(' · ')}` : '';
}

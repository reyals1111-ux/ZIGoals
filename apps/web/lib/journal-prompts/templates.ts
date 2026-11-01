/**
 * Session AK (BUILD list 2 #13, lane G1a): "Start from a prompt" — eight authored journal templates in English and Dutch,
 * free for everyone. Each fills the entry with two to four short headings to write under; the saved entry keeps the
 * template's id (`template`, an optional field on the loose journal entry). Calm words only: no task, no judgement, no
 * advice; "Another way to see it" says plainly that it is a reflection, not therapy. Nothing is stored here.
 */
export type PromptLang = 'en' | 'nl';
export type JournalTemplate = {id: string; title: Record<PromptLang, string>; headings: Record<PromptLang, readonly string[]>; note?: Record<PromptLang, string>};
export const JOURNAL_TEMPLATES: readonly JournalTemplate[] = [
  {id: 'morning-intention', title: {en: 'Morning intention', nl: 'Ochtendintentie'},
    headings: {en: ['What matters most today?', 'One small step I can take:', 'How I want to feel tonight:'], nl: ['Wat is vandaag het belangrijkst?', 'Eén kleine stap die ik kan zetten:', 'Hoe ik me vanavond wil voelen:']}},
  {id: 'three-good-things', title: {en: 'Three good things', nl: 'Drie goede dingen'},
    headings: {en: ['A good thing today:', 'Another good thing:', 'One more:'], nl: ['Iets goeds vandaag:', 'Nog iets goeds:', 'En nog één:']}},
  {id: 'worry-next-step', title: {en: 'Worry, then one next step', nl: 'Zorg, en dan één volgende stap'},
    headings: {en: ['What is on my mind:', 'What I can influence:', 'One next step:'], nl: ['Wat me bezighoudt:', 'Waar ik invloed op heb:', 'Eén volgende stap:']}},
  {id: 'gratitude', title: {en: 'Gratitude', nl: 'Dankbaarheid'},
    headings: {en: ['I am grateful for:', 'Someone I appreciate, and why:'], nl: ['Ik ben dankbaar voor:', 'Iemand die ik waardeer, en waarom:']}},
  {id: 'week-look-back', title: {en: 'Week look-back', nl: 'Terugblik op de week'},
    headings: {en: ['What went well this week:', 'What I learned:', 'What I carry into next week:'], nl: ['Wat ging goed deze week:', 'Wat ik leerde:', 'Wat ik meeneem naar volgende week:']}},
  {id: 'before-hard-talk', title: {en: 'Before a hard talk', nl: 'Voor een moeilijk gesprek'},
    headings: {en: ['What I want to say:', 'What I hope they hear:', 'What I want to understand about them:', 'How I want to come across:'], nl: ['Wat ik wil zeggen:', 'Wat ik hoop dat de ander hoort:', 'Wat ik van de ander wil begrijpen:', 'Hoe ik wil overkomen:']}},
  {id: 'another-view', title: {en: 'Another way to see it', nl: 'Er anders naar kijken'},
    headings: {en: ['The situation:', 'My first thought:', 'Another view:'], nl: ['De situatie:', 'Mijn eerste gedachte:', 'Een andere kijk:']},
    note: {en: 'A reflection, not therapy.', nl: 'Een reflectie, geen therapie.'}},
  {id: 'letter-future-you', title: {en: 'A letter to future you', nl: 'Een brief aan je toekomstige zelf'},
    headings: {en: ['Dear future me,', 'Right now I am…', 'What I hope for you:'], nl: ['Lieve toekomstige ik,', 'Op dit moment ben ik…', 'Wat ik je toewens:']}},
];
export const TEMPLATE_IDS = JOURNAL_TEMPLATES.map(t => t.id);
export const templateById = (id: string | undefined): JournalTemplate | null => JOURNAL_TEMPLATES.find(t => t.id === id) ?? null;
/** The entry text a template starts from: each heading on its own line with a blank line under it to write in. */
export const templateText = (t: JournalTemplate, lang: PromptLang): string => t.headings[lang].map(h => `${h}\n`).join('\n');
/**
 * What the entry becomes when a template is picked: the headings alone when the entry is empty (or holds only another
 * template's untouched headings), else the person's words kept with the headings added after a blank line.
 */
export function startFrom(current: string, t: JournalTemplate, lang: PromptLang): string {
  const untouched = JOURNAL_TEMPLATES.some(x => (['en', 'nl'] as const).some(l => templateText(x, l).trim() === current.trim()));
  if (!current.trim() || untouched) return templateText(t, lang);
  return `${current.replace(/\s+$/, '')}\n\n${templateText(t, lang)}`;
}
/** Whether the entry still holds nothing but a template's headings (nothing written under them yet). */
export const onlyHeadings = (text: string) => !text.trim() || JOURNAL_TEMPLATES.some(x => (['en', 'nl'] as const).some(l => templateText(x, l).trim() === text.trim()));

/**
 * Session AK (BUILD list 2 #13, lane G1a): "Start from a prompt" — eight authored journal templates in English and Dutch,
 * free for everyone. Each fills the entry with two to four short headings to write under; the saved entry keeps the
 * template's id (`template`, an optional field on the loose journal entry). Calm words only: no task, no judgement, no
 * advice; "Another way to see it" says plainly that it is a reflection, not therapy. Nothing is stored here.
 */
export type PromptLang = 'en' | 'nl';
export type JournalTemplate = {id: string; title: Record<PromptLang, string>; headings: Record<PromptLang, readonly string[]>; note?: Record<PromptLang, string>;
  /** Session AV lane 2 (journal; LEDGER #39): a template saved from an entry starts from its whole text and its tags. */
  body?: string; tags?: readonly string[];
  /**
   * Session AV lane 2 (r3-notes; LEDGER #266, Grid Diary's Mandala): written as a 3×3 grid, the first heading the centre
   * and the other eight around it, clockwise from the top left. Still saved as text with headings.
   */
  grid?: 'mandala';
  /** Session AV lane 2 (r3-notes; LEDGER #269): the period a look-back template is written for. */
  period?: 'week' | 'month' | 'year'};
export const JOURNAL_TEMPLATES: readonly JournalTemplate[] = [
  {id: 'morning-intention', title: {en: 'Morning intention', nl: 'Ochtendintentie'},
    headings: {en: ['What matters most today?', 'One small step I can take:', 'How I want to feel tonight:'], nl: ['Wat is vandaag het belangrijkst?', 'Eén kleine stap die ik kan zetten:', 'Hoe ik me vanavond wil voelen:']}},
  {id: 'three-good-things', title: {en: 'Three good things', nl: 'Drie goede dingen'},
    headings: {en: ['A good thing today:', 'Another good thing:', 'One more:'], nl: ['Iets goeds vandaag:', 'Nog iets goeds:', 'En nog één:']}},
  {id: 'worry-next-step', title: {en: 'Worry, then one next step', nl: 'Zorg, en dan één volgende stap'},
    headings: {en: ['What is on my mind:', 'What I can influence:', 'One next step:'], nl: ['Wat me bezighoudt:', 'Waar ik invloed op heb:', 'Eén volgende stap:']}},
  {id: 'gratitude', title: {en: 'Gratitude', nl: 'Dankbaarheid'},
    headings: {en: ['I am grateful for:', 'Someone I appreciate, and why:'], nl: ['Ik ben dankbaar voor:', 'Iemand die ik waardeer, en waarom:']}},
  {id: 'week-look-back', title: {en: 'Week look-back', nl: 'Terugblik op de week'}, period: 'week',
    headings: {en: ['What went well this week:', 'What I learned:', 'What I carry into next week:'], nl: ['Wat ging goed deze week:', 'Wat ik leerde:', 'Wat ik meeneem naar volgende week:']}},
  {id: 'before-hard-talk', title: {en: 'Before a hard talk', nl: 'Voor een moeilijk gesprek'},
    headings: {en: ['What I want to say:', 'What I hope they hear:', 'What I want to understand about them:', 'How I want to come across:'], nl: ['Wat ik wil zeggen:', 'Wat ik hoop dat de ander hoort:', 'Wat ik van de ander wil begrijpen:', 'Hoe ik wil overkomen:']}},
  {id: 'another-view', title: {en: 'Another way to see it', nl: 'Er anders naar kijken'},
    headings: {en: ['The situation:', 'My first thought:', 'Another view:'], nl: ['De situatie:', 'Mijn eerste gedachte:', 'Een andere kijk:']},
    note: {en: 'A reflection, not therapy.', nl: 'Een reflectie, geen therapie.'}},
  {id: 'letter-future-you', title: {en: 'A letter to future you', nl: 'Een brief aan je toekomstige zelf'},
    headings: {en: ['Dear future me,', 'Right now I am…', 'What I hope for you:'], nl: ['Lieve toekomstige ik,', 'Op dit moment ben ik…', 'Wat ik je toewens:']}},
];
/**
 * Session AV lane 2 (r3-notes): three more templates, kept in their own list so the eight above (and every answer that
 * names them) stay as they are; the picker and `templateById` read both lists.
 */
export const MORE_TEMPLATES: readonly JournalTemplate[] = [
  // Session AV lane 2 (r3-notes; LEDGER #266, Grid Diary's Mandala): a theme in the centre and eight parts of life around it.
  {id: 'mandala', title: {en: 'Mandala: one theme, eight sides', nl: 'Mandala: één thema, acht kanten'}, grid: 'mandala',
    headings: {en: ['My theme, in the centre:', 'Body and health:', 'Work and learning:', 'Money:', 'People I love:', 'Rest and fun:', 'Home:', 'Mind and mood:', 'One small step:'],
      nl: ['Mijn thema, in het midden:', 'Lichaam en gezondheid:', 'Werk en leren:', 'Geld:', 'Mensen van wie ik houd:', 'Rust en plezier:', 'Thuis:', 'Hoofd en stemming:', 'Eén kleine stap:']}},
  // Session AV lane 2 (r3-notes; LEDGER #269, Grid Diary's month and year): look-backs written for a month and a year.
  {id: 'month-look-back', title: {en: 'Month look-back', nl: 'Terugblik op de maand'}, period: 'month',
    headings: {en: ['What this month was about:', 'What I am glad about:', 'What was hard, and what helped:', 'What I want more of next month:'], nl: ['Waar deze maand om draaide:', 'Waar ik blij mee ben:', 'Wat zwaar was, en wat hielp:', 'Waar ik volgende maand meer van wil:']}},
  {id: 'year-look-back', title: {en: 'Year look-back', nl: 'Terugblik op het jaar'}, period: 'year',
    headings: {en: ['This year in a few words:', 'Moments I want to keep:', 'What I learned about myself:', 'What I let go of:', 'What I hope for next year:'], nl: ['Dit jaar in een paar woorden:', 'Momenten die ik wil bewaren:', 'Wat ik over mezelf leerde:', 'Wat ik loslaat:', 'Wat ik hoop voor volgend jaar:']}},
];
export const TEMPLATE_IDS = JOURNAL_TEMPLATES.map(t => t.id);
/** Every built-in template: the eight, then the round-3 ones. */
export const ALL_TEMPLATES: readonly JournalTemplate[] = [...JOURNAL_TEMPLATES, ...MORE_TEMPLATES];
export const templateById = (id: string | undefined): JournalTemplate | null => ALL_TEMPLATES.find(t => t.id === id) ?? null;
/** The entry text a template starts from: each heading on its own line with a blank line under it to write in. */
export const templateText = (t: JournalTemplate, lang: PromptLang): string => t.body ? `${t.body.replace(/\s+$/, '')}\n` : t.headings[lang].map(h => `${h}\n`).join('\n');
/**
 * What the entry becomes when a template is picked: the headings alone when the entry is empty (or holds only another
 * template's untouched headings), else the person's words kept with the headings added after a blank line.
 */
export function startFrom(current: string, t: JournalTemplate, lang: PromptLang): string {
  const untouched = ALL_TEMPLATES.some(x => (['en', 'nl'] as const).some(l => templateText(x, l).trim() === current.trim()));
  if (!current.trim() || untouched) return templateText(t, lang);
  return `${current.replace(/\s+$/, '')}\n\n${templateText(t, lang)}`;
}
/** Whether the entry still holds nothing but a template's headings (nothing written under them yet). */
export const onlyHeadings = (text: string) => !text.trim() || ALL_TEMPLATES.some(x => (['en', 'nl'] as const).some(l => templateText(x, l).trim() === text.trim()));

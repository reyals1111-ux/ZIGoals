import type {Energy} from '../energy/schema';
import type {Journal, JournalEntry} from './schema';

/**
 * Session AI (feature 6): ZIGi's journal reflection, made on this device. After an entry, ONE thoughtful follow-up
 * question chosen by rule from what the entry says (never a judgement, never advice); over time, patterns in plain counts
 * ("you wrote about sleep on 5 of your last 14 entries; on those days your energy averaged 2.4"). With the person's own AI
 * and journal sharing on, the AI may word the question instead (the panel's job); the rule question is always there.
 */
type Lang = 'en' | 'nl';
const THEMES: {id: string; words: RegExp; en: string; nl: string}[] = [
  {id: 'sleep', words: /\b(?:tired|exhausted|sleep|slept|insomnia|moe|uitgeput|slaap|geslapen)\b/i, en: 'What helped you rest the last time you slept well?', nl: 'Wat hielp je om uit te rusten, de laatste keer dat je goed sliep?'},
  {id: 'work', words: /\b(?:work|boss|meeting|deadline|job|office|werk|baas|vergadering|deadline|kantoor)\b/i, en: 'Which part of work today would you like more of, and which less?', nl: 'Van welk deel van je werk vandaag wil je meer, en van welk minder?'},
  {id: 'stress', words: /\b(?:stress|stressed|anxious|worried|overwhelmed|gestrest|zorgen|onrustig|overweldigd)\b/i, en: 'What is one small thing within your control tomorrow?', nl: 'Wat is één klein ding dat morgen in jouw handen ligt?'},
  {id: 'gratitude', words: /\b(?:grateful|thankful|lucky|blessed|dankbaar|blij met|geluk)\b/i, en: 'Who or what made that moment possible?', nl: 'Wie of wat maakte dat moment mogelijk?'},
  {id: 'people', words: /\b(?:friends?|family|partners?|mum|mom|dad|kids?|colleagues?|vrienden|vriend|vriendin(?:nen)?|familie|mama|papa|kinderen|collega'?s?)\b/i, en: 'What did that time with them give you today?', nl: 'Wat gaf die tijd met hen je vandaag?'},
  {id: 'money', words: /\b(?:money|spent|budget|bills?|salary|geld|uitgegeven|rekening|salaris)\b/i, en: 'How did that money moment fit what matters most to you?', nl: 'Hoe paste dat geldmoment bij wat jij het belangrijkst vindt?'},
  {id: 'exercise', words: /\b(?:run|ran|gym|workout|walk|walked|training|hardgelopen|sport|gewandeld|getraind)\b/i, en: 'How did your body feel after moving today?', nl: 'Hoe voelde je lichaam zich na het bewegen vandaag?'},
  {id: 'goal', words: /\b(?:goal|progress|proud|achieved|finished|doel|vooruitgang|trots|gehaald|afgerond)\b/i, en: 'What made that progress possible, and can you repeat it?', nl: 'Wat maakte die vooruitgang mogelijk, en kun je dat herhalen?'},
];
const GENERAL = {en: 'What is one thing from today you would like to remember a year from now?', nl: 'Wat is één ding van vandaag dat je over een jaar nog wilt weten?'};
export const themesOf = (text: string): string[] => THEMES.filter(t => t.words.test(text)).map(t => t.id);
/** The follow-up question for one entry: the first theme it touches, else a general one; never the same as the last entry's. */
export function followUpFor(entry: Pick<JournalEntry, 'text'>, previous: readonly JournalEntry[], lang: Lang): string {
  const last = previous.at(-1)?.followUp?.question;
  const theme = THEMES.find(t => t.words.test(entry.text) && t[lang] !== last);
  return theme ? theme[lang] : GENERAL[lang] !== last ? GENERAL[lang] : (lang === 'nl' ? 'Wat wil je morgen anders doen, al is het klein?' : 'What would you like to do differently tomorrow, even something small?');
}
export type Pattern = {theme: string; entries: number; of: number; energy: number | null; energyElse: number | null};
/** The themes of the last `window` entries that came up at least three times, with the average energy on and off them. */
export function patterns(journal: Journal, energy: Energy | null = null, window = 14): Pattern[] {
  const recent = journal.entries.slice(-window), avg = (xs: number[]) => xs.length ? Math.round(10 * xs.reduce((a, b) => a + b, 0) / xs.length) / 10 : null;
  const of = (e: JournalEntry) => energy?.days[e.date]?.energy;
  return THEMES.map(t => {
    const on = recent.filter(e => t.words.test(e.text)), off = recent.filter(e => !t.words.test(e.text));
    return {theme: t.id, entries: on.length, of: recent.length, energy: avg(on.flatMap(e => of(e) ? [of(e)!] : [])), energyElse: avg(off.flatMap(e => of(e) ? [of(e)!] : []))};
  }).filter(p => p.entries >= 3).sort((a, b) => b.entries - a.entries);
}
export const THEME_WORDS: Record<string, {en: string; nl: string}> = {sleep: {en: 'sleep and tiredness', nl: 'slaap en moeheid'}, work: {en: 'work', nl: 'werk'}, stress: {en: 'stress or worry', nl: 'stress of zorgen'}, gratitude: {en: 'gratitude', nl: 'dankbaarheid'}, people: {en: 'the people around you', nl: 'de mensen om je heen'}, money: {en: 'money', nl: 'geld'}, exercise: {en: 'moving and exercise', nl: 'bewegen en sporten'}, goal: {en: 'progress on your goals', nl: 'vooruitgang op je doelen'}};
/** One plain sentence per pattern; counts only, never a diagnosis. */
export function patternLine(p: Pattern, lang: Lang): string {
  const words = THEME_WORDS[p.theme]![lang];
  const energy = p.energy !== null && p.energyElse !== null ? (lang === 'nl' ? ` Je energie op die dagen: gemiddeld ${p.energy} van 5 (andere dagen ${p.energyElse}).` : ` Your energy on those days: ${p.energy} of 5 on average (other days ${p.energyElse}).`) : '';
  return lang === 'nl' ? `Je schreef over ${words} in ${p.entries} van je laatste ${p.of} stukjes.${energy}` : `You wrote about ${words} in ${p.entries} of your last ${p.of} entries.${energy}`;
}

import type {Intent} from './cases';

/**
 * Session AW (Part 5, the Carried answer rows): the questions behind FR-S-13, FR-TJ-16, FR-MAX-6, FR-TJ-17, FR-S-16 and
 * S-10, asked of the Showcase (17 November 2026) and a fresh profile in English and Dutch. The lead adds them to the
 * corpus (CORPUS, expected.json, SAYS below). `never`: what each row's fix took out of the answer, in either language.
 * - awp5-skip-most (FR-MAX-6): the Dutch split verb "sla … over" is the skipped-habits answer, never the open habits.
 * - awp5-goals-dutch (FR-S-13): the goals list in Dutch words and nl-NL figures, never the tool's English units.
 * - awp5-wealth-places (FR-TJ-16): a Dutch money answer names the app's own English screens, never a Dutch screen name.
 * - awp5-agenda-clock (S-10): a Dutch agenda answer writes its times on the 24-hour clock, as it writes its dates.
 * - awp5-gym-streak (FR-TJ-17): with no habit called Gym (the Showcase), "gym streak" stays the workout weeks.
 * FR-S-16 (Health closed) needs Health closed, which the corpus's environments are not: its unit tests hold it
 * (lib/ai/local-answers/aw-p5-answers.test.ts).
 */
export const AW_P5: readonly Intent[] = [
  {id: 'awp5-skip-most', pillar: 'habits', never: ['Habits still open', 'Gewoontes nog open'],
    en: ['which habit do I skip most', 'which habit do I skip most this month'],
    nl: ['welke gewoonte sla ik het vaakst over', 'welke gewoonte sla ik deze maand het vaakst over', 'welke gewoonte sloeg ik het vaakst over']},
  {id: 'awp5-goals-dutch', pillar: 'goals', never: ['van at least', ' h a night van', ' h a day van', 'milestones van'],
    en: ['how are my goals doing'],
    nl: ['hoe gaat het met mijn doelen', 'hoe staan mijn doelen ervoor']},
  {id: 'awp5-wealth-places', pillar: 'wealth', never: ['Vermogen →', 'Markten', 'Instellingen →', 'Wat je schuldig bent', 'Komende rekeningen'],
    en: ['when will I be debt-free', 'What is bitcoin worth today?', 'how much did I spend this month'],
    nl: ['wanneer ben ik schuldenvrij', 'Wat is bitcoin vandaag waard?', 'hoeveel heb ik deze maand uitgegeven']},
  {id: 'awp5-agenda-clock', pillar: 'agenda',
    en: ['what is on my agenda tomorrow'],
    nl: ['wat staat er morgen op mijn agenda', 'wat heb ik morgen op mijn agenda']},
  {id: 'awp5-gym-streak', pillar: 'health',
    en: ['what is my gym streak'],
    nl: ['hoeveel weken op rij heb ik getraind']},
];
/** The facts each phrasing must state (lib/ai/evals/as/says.ts `SAYS`), for the lead to add beside the others. */
export const SAYS_AW_P5: Readonly<Record<string, readonly string[]>> = {
  'awp5-skip-most': [], 'awp5-goals-dutch': ['Emergency fund', '45%'], 'awp5-wealth-places': [], 'awp5-agenda-clock': ['Upper body session'], 'awp5-gym-streak': ['3'],
};

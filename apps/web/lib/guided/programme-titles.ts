/**
 * Session AW (programmes): the written programmes' titles as literals in a module with no imports, so the links from
 * Workouts, Sleep, Meditation and Habits (components/guided/programme-links.tsx) do not load the programmes themselves.
 * lib/guided/programme-titles.test.ts proves each equals its programme's own title in lib/guided/programs.ts.
 */
export const PROGRAMME_TITLES = {
  'strength-start': 'Beginner strength in 4 weeks',
  'run-5k': '0 to 5 km in 8 weeks',
  'sleep-reset': 'A sleep reset',
  'meditation-start': 'A 10-day meditation starter',
  'habit-start': 'A 14-day habit starter',
} as const;
export type ProgrammeId = keyof typeof PROGRAMME_TITLES;
/** The address that opens Guided journeys at one programme (the page scrolls to it and focuses its title). */
export const programmeHref = (id: ProgrammeId) => `/app/guided?programme=${id}` as const;

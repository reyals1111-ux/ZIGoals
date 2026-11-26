/**
 * Session AW (content; LEDGER #82): the collections' titles as literals in a module with no imports, so the folds on
 * Guided journeys and the quiet link from Sleep (components/guided/programme-links.tsx) do not load the collections'
 * text. lib/guided/collections.test.ts proves each equals its collection's own title in lib/guided/collections.ts.
 */
export const COLLECTION_TITLES = {
  'sleep-better': 'Sleep better',
  'calm-down': 'Calm down',
  'move-gently': 'Move gently',
  'start-a-habit': 'Start a habit',
} as const;
/** One line under each fold's title, saying what is in it. */
export const COLLECTION_LINES: Readonly<Record<keyof typeof COLLECTION_TITLES, string>> = {
  'sleep-better': 'Seven short lessons, the sleep reset and quiet practices for the evening.',
  'calm-down': 'Short written practices, a grounding exercise and a calmer week.',
  'move-gently': 'Five stretches, a slow walk and plans that build a little each week.',
  'start-a-habit': 'The 14-day habit starter, ideas to start from and a routine.',
};
export type CollectionId = keyof typeof COLLECTION_TITLES;
export const COLLECTION_IDS = Object.keys(COLLECTION_TITLES) as CollectionId[];
/** The address that opens Guided journeys at one collection (its fold opens, scrolled to and focused). */
export const collectionHref = (id: CollectionId) => `/app/guided?collection=${id}` as const;

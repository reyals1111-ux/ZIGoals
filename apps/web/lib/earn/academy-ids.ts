/**
 * Session AF chunk 2 (P1.27): the Earn Academy's lesson ids in their path order, with no lesson text, so the game layer
 * (lib/game/xp.ts) can count passed lessons without shipping the lessons. lib/earn/academy.ts holds the lessons.
 */
export const ACADEMY_LESSON_IDS = Object.freeze(['staking', 'apr-apy', 'unbonding', 'liquid-staking', 'pools', 'custody', 'scams', 'fees'] as const);
export type AcademyLessonId = (typeof ACADEMY_LESSON_IDS)[number];
/** XP for a passed lesson (all three questions right), once per lesson, only while the game layer is on. */
export const ACADEMY_LESSON_XP = 15;

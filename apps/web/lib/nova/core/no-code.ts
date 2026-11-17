/**
 * Session AR (ADR-041 P4; ADR-038 Q12, carried): the honest line for a star whose own code never arrived (offline after
 * an update, a blocked file), and how long the stage waits for that code before saying so. Kept apart from governor.ts,
 * which loads with the star: the stage needs these two before the star exists.
 */
export const STAR_NO_CODE_TEXT = 'Still picture: the star’s code did not load';
export const STAR_WAIT_MS = 8000;

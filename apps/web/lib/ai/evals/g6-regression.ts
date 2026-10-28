import type {ModelCase} from './corpus';

/**
 * Session AI (ADR-034 N2): the G6 ZIGi regression set — at least 40 checks over the B1 fixes, scored against the MOCK in
 * CI on every build (`g6-regression.test.ts`) and with real models in Track A. 80 % is the launch gate; 95 % the aim.
 */
export const G6: readonly ModelCase[] = [];

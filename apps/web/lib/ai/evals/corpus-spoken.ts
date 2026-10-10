import type {ModelCase} from './corpus';

/**
 * Session Z-Local Part 4: the held-out 30 % of the spoken corpus (English and Dutch asks a person would SAY, rendered by
 * Claude Opus 5.5 through the Batch API from device-made seeds; `scripts/zigi/spoken-corpus-gen.mjs`). GENERATED: do not
 * edit by hand; re-run the generator. Each case's expectation is its seed's, never the model's. Model-scored by the harness
 * with `ZIGI_SET=spoken`; the deterministic spoken rules live in `golden-spoken.ts`. Empty until the generator has run.
 */
export const SPOKEN: readonly ModelCase[] = [];

import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AJ (item 34, D13; TIER 3 (stored format)): loose, versioned, device-only. Guided journeys, a new device key
 * `zigoals:guided-journeys:v1`: which programs (lib/guided/programs.ts) the person started, on which local date, the
 * steps they ticked done themselves, and the date they ended one. Only the person's own taps write it; nothing in it
 * creates a goal, a habit or anything else. At most 20 journeys and 50 done steps each.
 */
export const GUIDED_JOURNEYS_KEY = 'zigoals:guided-journeys:v1';
export const MAX_JOURNEYS = 20, MAX_DONE = 50;
const slug = z.string().regex(/^[a-z0-9-]{1,60}$/);
export const guidedJourneySchema = z.looseObject({
  programId: slug,
  startedOn: z.iso.date(),
  done: z.array(slug).max(MAX_DONE),
  endedOn: z.iso.date().optional(),
});
export const guidedJourneysSchema = z.looseObject({
  version: z.literal(1),
  journeys: z.array(guidedJourneySchema).max(MAX_JOURNEYS),
});
export type GuidedJourney = z.infer<typeof guidedJourneySchema>;
export type GuidedJourneys = z.infer<typeof guidedJourneysSchema>;
export const emptyGuidedJourneys = (): GuidedJourneys => ({version: 1, journeys: []});
export const GUIDED_JOURNEYS: DeviceRecordSpec<GuidedJourneys> = {key: GUIDED_JOURNEYS_KEY, schema: guidedJourneysSchema, empty: emptyGuidedJourneys};

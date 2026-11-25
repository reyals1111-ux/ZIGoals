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
/**
 * Session AW (programmes; TIER 3 (stored formats), additive only): a written programme (lib/guided/programs.ts, a program
 * with `days`) keeps its progress in the same record, so builds #37–#59 read it unchanged:
 * - `done` holds the programme's done DAYS (a day's id is its day-level step id, at most 24 days a programme, so within
 *   the 50 older builds allow); an older build shows those days as its steps and ignores a programme it does not know;
 * - `stepsDone` (optional, new) holds the ticked steps of days not yet done, as "<dayId>/<stepId>"; a day that is done
 *   implies its steps, so their ids leave this list when the day is done. Older builds keep the field as it is (the
 *   record is loose, and their writes spread the journey);
 * - `showcase` (optional, new) is true only on the Showcase's labelled example journey.
 */
export const MAX_STEPS_DONE = 300;
const slug = z.string().regex(/^[a-z0-9-]{1,60}$/);
export const stepKey = z.string().regex(/^[a-z0-9-]{1,60}\/[a-z0-9-]{1,60}$/);
export const guidedJourneySchema = z.looseObject({
  programId: slug,
  startedOn: z.iso.date(),
  done: z.array(slug).max(MAX_DONE),
  endedOn: z.iso.date().optional(),
  // Session AW (review b1 m6): an unreadable list is left out, never the whole journeys record.
  stepsDone: z.array(stepKey).max(MAX_STEPS_DONE).optional().catch(undefined),
  showcase: z.literal(true).optional(),
});
export const guidedJourneysSchema = z.looseObject({
  version: z.literal(1),
  journeys: z.array(guidedJourneySchema).max(MAX_JOURNEYS),
});
export type GuidedJourney = z.infer<typeof guidedJourneySchema>;
export type GuidedJourneys = z.infer<typeof guidedJourneysSchema>;
export const emptyGuidedJourneys = (): GuidedJourneys => ({version: 1, journeys: []});
export const GUIDED_JOURNEYS: DeviceRecordSpec<GuidedJourneys> = {key: GUIDED_JOURNEYS_KEY, schema: guidedJourneysSchema, empty: emptyGuidedJourneys};

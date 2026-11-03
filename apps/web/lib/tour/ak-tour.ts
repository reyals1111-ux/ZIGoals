import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (A19, ADR-036): the "New in ZIGoals" tour, a few calm stops that each name one thing Session AK added and
 * link to it. It is offered by a "Take the 1-minute tour" button in the What's new card and in Help, and opens in place
 * (never a dialog that blocks the page, never during the first-visit intro or the welcome).
 *
 * Its own device key `zigoals:ak-tour:v1` holds no personal content, only a display mark: when this device first opened
 * the tour (`seenAt`) and the stop to continue from (`step`). Loose and versioned, every field but the version optional,
 * written only when the person opens or moves through the tour. Unreadable bytes read as a fresh tour and are never
 * rewritten by a read (lib/device-record.ts).
 */
export const AK_TOUR_KEY = 'zigoals:ak-tour:v1';

export type TourStop = {
  /** A short title for the stop. */
  title: string;
  /** One plain sentence: what it is and where it lives. */
  text: string;
  /** Where "Show me" goes: an app page, with an anchor where the page has one. */
  href: string;
  /** The page's name, for the link's words ("Show me in Wealth"). */
  where: string;
};

/** Seven stops, one per feature group; each sentence is honest about what stays on the device and what is an estimate. */
export const AK_TOUR_STOPS: readonly TourStop[] = [
  {title: 'Install it, and it works offline', text: 'Once installed, the pages you have visited open without a connection, and notifications on this device are being switched on.', href: '/app/settings#install', where: 'Settings'},
  {title: 'Food, scanned and offline', text: 'Health keeps your recent scans, a food library that works offline and a nutrient report made from your own diary.', href: '/app/health', where: 'Health'},
  {title: 'Habits and goals your way', text: 'Put habits in your own order, let a rule tick one off for you, and ask any goal “what if I added a little more?”.', href: '/app/habits', where: 'Habits'},
  {title: 'Money, planned calmly', text: 'Wealth now holds your bills, monthly budgets, a target mix and money rules: information for you, never advice.', href: '/app/wealth#bills', where: 'Wealth'},
  {title: 'Sound for focus and sleep', text: 'Mix up to three sounds made on this device, or open a playlist in your own music app.', href: '/app/music', where: 'Music'},
  {title: 'Your days, in your words', text: 'Pick a feeling word for the day and see a whole year of days, one small square each, in your Journal.', href: '/app/journal', where: 'Journal'},
  {title: 'Your data stays yours', text: 'Test a backup without changing anything, and see honestly which other apps can read what you export.', href: '/app/settings/data', where: 'Your data'},
];
export const AK_TOUR_LENGTH = AK_TOUR_STOPS.length;

export const akTourSchema = z.looseObject({
  version: z.literal(1),
  /** When this device first opened the tour. */
  seenAt: z.iso.datetime({offset: true}).optional(),
  /** The stop to continue from (0-based); left out once the tour was finished. */
  step: z.number().int().min(0).max(AK_TOUR_LENGTH - 1).optional(),
});
export type AkTour = z.infer<typeof akTourSchema>;
export const emptyAkTour = (): AkTour => ({version: 1});
export const AK_TOUR: DeviceRecordSpec<AkTour> = {key: AK_TOUR_KEY, schema: akTourSchema, empty: emptyAkTour};

/** A stop index kept inside the tour (a stored step from a longer future tour reads as the last stop). */
export const clampStep = (step: number | undefined): number => !Number.isFinite(step) || step === undefined || step < 0 ? 0 : Math.min(Math.floor(step), AK_TOUR_LENGTH - 1);
/** Where the tour opens: the saved stop, or the first. */
export const startStep = (tour: Pick<AkTour, 'step'> | null | undefined): number => clampStep(tour?.step);
/** True once this device opened the tour. */
export const tourSeen = (tour: Pick<AkTour, 'seenAt'> | null | undefined): boolean => typeof tour?.seenAt === 'string';

/** The tour opened at `step`: the first opening's time is kept, the stop is remembered. */
export function openedAt(tour: AkTour, at: string, step: number): AkTour {
  return akTourSchema.parse({...tour, version: 1, seenAt: tour.seenAt ?? at, step: clampStep(step)});
}
/** The person moved to `step`. */
export const movedTo = (tour: AkTour, step: number): AkTour => akTourSchema.parse({...tour, version: 1, step: clampStep(step)});
/** "Show me" on `step`: the next opening continues at the stop after it, or from the start after the last. */
export function leftFrom(tour: AkTour, step: number): AkTour {
  const next = clampStep(step) + 1;
  if (next >= AK_TOUR_LENGTH) return finished(tour);
  return akTourSchema.parse({...tour, version: 1, step: next});
}
/** Finished: the next opening starts at the first stop again; when it was first seen is kept. */
export function finished(tour: AkTour): AkTour {
  const {step: _step, ...rest} = tour;
  void _step;
  return akTourSchema.parse({...rest, version: 1});
}

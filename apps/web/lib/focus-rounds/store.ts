import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {BELL_SOUNDS} from '../meditation/schema';

/**
 * Session AK (BUILD list 2 #15, lane G1a): Focus intervals. The rounds themselves (work and break minutes, how many) are
 * Focus Sessions' Pomodoro mode (Session AK T3; its lengths are kept in `zigoals:focus-sessions:v1` → `pomodoro`), so
 * this key keeps only what #15 adds: the soft bell at each change (its sound and volume) and whether the focus sound
 * fades during breaks. A new device-only key, loose and versioned, every field optional; written on the person's choice.
 */
export const FOCUS_ROUNDS_KEY = 'zigoals:focus-rounds:v1';
export const focusRoundsSchema = z.looseObject({
  version: z.literal(1),
  /** The bell at each change ('silent' turns it off). Missing: the singing bowl. */
  bell: z.enum(BELL_SOUNDS).optional().catch(undefined),
  /** 0–100. Missing: 50. */
  volume: z.number().int().min(0).max(100).optional().catch(undefined),
  /** Whether the focus sound fades during breaks. Missing: yes. */
  quietBreaks: z.boolean().optional(),
});
export type FocusRounds = z.infer<typeof focusRoundsSchema>;
export const emptyFocusRounds = (): FocusRounds => ({version: 1});
export const FOCUS_ROUNDS: DeviceRecordSpec<FocusRounds> = {key: FOCUS_ROUNDS_KEY, schema: focusRoundsSchema, empty: emptyFocusRounds};
export const DEFAULT_BELL = 'bowl' as const, DEFAULT_VOLUME = 50;
export const bellOf = (r: FocusRounds) => r.bell ?? DEFAULT_BELL;
export const volumeOf = (r: FocusRounds) => r.volume ?? DEFAULT_VOLUME;
export const quietBreaksOf = (r: FocusRounds) => r.quietBreaks !== false;
/** How far the focus sound fades during a break (a share of its level). */
export const BREAK_SHARE = 0.2;

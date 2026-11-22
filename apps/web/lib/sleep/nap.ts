import {saveNight, SHORTEST_SLEEP_MS} from './engine';
import type {Sleep} from './schema';
import {healthExtrasSchema, type HealthExtras} from '../health-extras';

/**
 * Session AV lane 2, round 4 (health; LEDGER #335, Pillow's power nap, recovery and full-cycle naps): "Start a nap" — 20,
 * 30 or 90 minutes, a soft bell at the end while the page stays open, and the nap logged when it ends as an ordinary
 * night record with `kind: 'nap'` (nothing new is stored). A nap stopped early is logged up to then, unless it lasted less
 * than ten minutes (the sleep timer's own rule, SHORTEST_SLEEP_MS). Ringing with the screen locked or the app closed is
 * native-only and not offered. Pure.
 */
export const NAP_CHOICES = [
  {minutes: 20, en: 'A short nap', nl: 'Een kort dutje'},
  {minutes: 30, en: 'A rest', nl: 'Even rusten'},
  {minutes: 90, en: 'A long nap', nl: 'Een lang dutje'},
] as const;
export type NapRun = {startedAt: number; minutes: number};
/**
 * Review B4E-3: a nap starts on the person's tap, and that tap wakes the audio (browsers such as iOS Safari allow sound only
 * after a gesture), so the bell 20 to 90 minutes later can sound; the meditation timer does the same on its start.
 */
export function beginNap(minutes: number, bell: boolean, now: number, wake: () => unknown): NapRun {
  if (bell) wake();
  return {startedAt: now, minutes};
}
/** Turning the bell on during a nap is a tap too: it wakes the audio. */
export function bellChoice(on: boolean, wake: () => unknown): boolean { if (on) wake(); return on; }
export const napEndsAt = (run: NapRun) => run.startedAt + run.minutes * 60_000;
/** Seconds left, never below zero. */
export const napLeft = (run: NapRun, now: number) => Math.max(0, Math.ceil((napEndsAt(run) - now) / 1000));
/** "12:30" for a countdown; "1:05:00" past an hour. */
export function napClock(seconds: number): string {
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60, two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}
/** The nap as a sleep record from its start to `endMs` (its planned end at most), or null when it was under ten minutes. */
export function logNap(s: Sleep, run: NapRun, endMs: number, zone: string, at: Date): Sleep | null {
  const end = Math.min(endMs, napEndsAt(run));
  if (end - run.startedAt < SHORTEST_SLEEP_MS) return null;
  return saveNight(s, {kind: 'nap', start: run.startedAt, end, timeZone: zone}, at);
}
/**
 * Review B4E-4: the running nap is kept in the health extras (`napRun`), so leaving Health → Sleep or a reload never loses
 * it: on return it shows running, or, when it ended meanwhile, it is logged then (the bell could not ring while Sleep was
 * closed, and the page says so). Removed once the nap is logged or stopped.
 */
export function napRunOf(extras: HealthExtras | null | undefined): NapRun | null {
  const r = extras?.napRun, at = r ? Date.parse(r.startedAt) : NaN;
  return r && Number.isFinite(at) ? {startedAt: at, minutes: r.minutes} : null;
}
export const withNapRun = (extras: HealthExtras, run: NapRun): HealthExtras => healthExtrasSchema.parse({...extras, napRun: {startedAt: new Date(run.startedAt).toISOString(), minutes: run.minutes}});
export const withoutNapRun = (extras: HealthExtras): HealthExtras => { if (!extras.napRun) return extras; const rest: Record<string, unknown> = {...extras}; delete rest.napRun; return healthExtrasSchema.parse(rest); };
/** On return: still running, or ended while away. */
export const napOnReturn = (run: NapRun, now: number): 'running' | 'ended' => now >= napEndsAt(run) ? 'ended' : 'running';


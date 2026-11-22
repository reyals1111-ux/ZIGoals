import {foodPlusSchema, type FoodPlus} from './schema';
import type {CoachOptions} from '../health-aa/coach';
import {readDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {FOOD_PLUS} from './schema';

/**
 * Session AV lane 2 (food, LEDGER #106; MacroFactor's check-in): choosing the weekly check-in day, and marking a day as
 * partly logged so the maintenance estimate leaves it out (a day you know is missing food would read as eating less).
 * Only the last 400 marked days are kept (older ones are outside every window). Pure.
 */
export function setCheckInWeekday(record: FoodPlus, weekday: number): FoodPlus {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error('Choose a day of the week.');
  return foodPlusSchema.parse({...record, checkIn: {...record.checkIn, weekday}});
}
export function setPartialDay(record: FoodPlus, date: string, partial: boolean): FoodPlus {
  const days = new Set(record.checkIn?.partial ?? []);
  if (partial) days.add(date); else days.delete(date);
  const kept = [...days].sort().slice(-400);
  const {partial: _p, ...checkIn} = {...record.checkIn}; void _p;
  const next = kept.length ? {...checkIn, partial: kept} : checkIn;
  const {checkIn: _c, ...rest} = record; void _c;
  return foodPlusSchema.parse(Object.keys(next).length ? {...rest, checkIn: next} : rest);
}
/**
 * The coach's options from this device's record (LEDGER #106, #107): the check-in weekday, the days marked partly logged
 * and the pace chosen on the maintenance-estimate card — the same values Health → Your coach reads (coachPrefsOf). With
 * no record, the coach's defaults (Monday, every day counted, the trend's own pace).
 */
export const coachOptionsOf = (record: FoodPlus | null | undefined): CoachOptions => ({
  checkInWeekday: record?.checkIn?.weekday ?? null,
  partialDays: new Set(record?.checkIn?.partial ?? []),
  paceKg: typeof record?.pace === 'number' ? record.pace : null,
});
/** This device's food-plus record, read when a caller did not pass one (null when unreadable or no storage). */
export function deviceFoodPlus(): FoodPlus | null {
  try { const read = readDeviceRecord(getAppStorage(), FOOD_PLUS); return read.unreadable ? null : read.data; } catch { return null; }
}
/** The record a caller passed (null: none), else this device's. */
export const foodPlusFor = (given: FoodPlus | null | undefined): FoodPlus | null => given !== undefined ? given : deviceFoodPlus();
export const isPartialDay = (record: FoodPlus | null | undefined, date: string) => !!record?.checkIn?.partial?.includes(date);

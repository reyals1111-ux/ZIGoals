import {foodPlusSchema, type FoodPlus} from './schema';

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
export const isPartialDay = (record: FoodPlus | null | undefined, date: string) => !!record?.checkIn?.partial?.includes(date);

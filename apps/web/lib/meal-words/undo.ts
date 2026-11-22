import {healthSchema, type HealthData} from '../health';

/**
 * Session AV (q3 #25, data): Undo of "Log" from meal words takes off only the diary entries and the library foods that
 * this one Log made, by their ids, never the Health record as it was before (a water tap or an entry logged in another
 * tab between Log and Undo stays). A food it made is kept when another entry (or a favourite) has used it since. Pure.
 */
export function undoWordsLog(data: HealthData, made: {entryIds: readonly string[]; foodIds: readonly string[]}): HealthData {
  const entries = new Set(made.entryIds), diary = data.diary.filter(e => !entries.has(e.id));
  const used = new Set([...diary.map(e => e.sourceId), ...(data.daily?.favorites ?? []).map(f => f.sourceId)]), foods = new Set(made.foodIds.filter(id => !used.has(id)));
  return healthSchema.parse({...data, diary, foods: data.foods.filter(f => !foods.has(f.id))});
}

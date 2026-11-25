import * as z from 'zod';
import {HEALTH_MEALS, type HealthData} from '../health';
import {dailyData, saveMealPlan} from '../health-daily';
import {addLocalDays} from '../local-date';
import {foodPlusSchema, MAX_MENUS, type FoodPlus} from './schema';

/**
 * Session AW (X5, LEDGER #454; Paprika's menus): "Keep this week as a menu" — a whole week's planned meals kept by name
 * (up to 12 menus) in the loose food record (`zigoals:food-plus:v1` `menus`), and placed on another week in one step. Each
 * placed meal is an ordinary meal plan made by `saveMealPlan`, logged by a tap as before; the week's grocery list follows
 * the plans as it already does. A menu item is a weekday from Monday (0) to Sunday (6), the meal, and the saved meal it
 * plans. The strict plan record is unchanged. Pure: the day, the instant and the new ids come in.
 */
export const MENU_NAME_MAX = 40, MAX_MENU_ITEMS = 84;
const savedMealId = z.string().regex(/^health_[a-z0-9-]{8,80}$/);
export const menuItemSchema = z.looseObject({day: z.number().int().min(0).max(6), meal: z.enum(HEALTH_MEALS), savedMealId, name: z.string().trim().min(1).max(120)});
export const menuSchema = z.looseObject({
  id: z.string().regex(/^menu-[a-z0-9-]{1,60}$/),
  name: z.string().trim().min(1).max(MENU_NAME_MAX),
  // An item this build cannot read is left out, never the menu.
  items: z.preprocess(v => Array.isArray(v) ? v.filter(i => menuItemSchema.safeParse(i).success).slice(0, MAX_MENU_ITEMS) : [], z.array(menuItemSchema).min(1)),
  keptOn: z.iso.date(),
});
export type Menu = z.infer<typeof menuSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
/** The menus this build can read, in the order kept (a menu it cannot read is skipped on its own). */
export function menusOf(record: FoodPlus | null | undefined): Menu[] {
  return (record?.menus ?? []).flatMap(m => { const read = menuSchema.safeParse(m); return read.success ? [read.data] : []; });
}
/** The week's meals as menu items, Monday first, each meal once. */
export function weekItems(data: HealthData, weekStart: string): MenuItem[] {
  const days = Array.from({length: 7}, (_, i) => addLocalDays(weekStart, i)), seen = new Set<string>(), items: MenuItem[] = [];
  for (const p of dailyData(data).plans) {
    const day = days.indexOf(p.date); if (day < 0) continue;
    const key = `${day}|${p.meal}|${p.savedMealId}`; if (seen.has(key)) continue;
    seen.add(key); items.push({day, meal: p.meal, savedMealId: p.savedMealId, name: p.name});
  }
  return items.sort((a, b) => a.day - b.day || HEALTH_MEALS.indexOf(a.meal) - HEALTH_MEALS.indexOf(b.meal) || a.name.localeCompare(b.name)).slice(0, MAX_MENU_ITEMS);
}
/** What is wrong with a menu's name ('' when it can be kept). */
export function menuNameIssue(name: string): string {
  const n = name.trim();
  if (!n) return 'Give the menu a name, like “Soup week”.';
  return n.length > MENU_NAME_MAX ? `A menu’s name can be at most ${MENU_NAME_MAX} characters (this one has ${n.length}).` : '';
}
const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
/**
 * Keeps the week's planned meals as a menu by name. A menu of the same name is replaced (it keeps its place); a new one
 * is added last. Refused with nothing planned that week, or when twelve menus are kept already.
 */
export function keepWeekAsMenu(record: FoodPlus, data: HealthData, weekStart: string, name: string, {id, today}: {id: string; today: string}): FoodPlus {
  const issue = menuNameIssue(name); if (issue) throw new Error(issue);
  const items = weekItems(data, weekStart);
  if (!items.length) throw new Error('Nothing is planned this week yet. Plan a meal first, then keep the week as a menu.');
  const menus = menusOf(record), old = menus.find(m => sameName(m.name, name));
  if (!old && menus.length >= MAX_MENUS) throw new Error(`At most ${MAX_MENUS} menus. Remove one first.`);
  const menu = menuSchema.parse({id: old?.id ?? id, name: name.trim(), items, keptOn: today});
  return foodPlusSchema.parse({...record, menus: old ? menus.map(m => m.id === old.id ? menu : m) : [...menus, menu]});
}
export function removeMenu(record: FoodPlus, id: string): FoodPlus {
  const menus = menusOf(record).filter(m => m.id !== id), copy = {...record};
  delete copy.menus;
  return foodPlusSchema.parse(menus.length ? {...copy, menus} : copy);
}
export type Placed = {data: HealthData; planIds: string[]; already: number; missing: string[]};
/**
 * Places a menu on the week that starts on `weekStart` (a Monday): one meal plan per item. A meal already planned in that
 * slot is left as it is (counted in `already`); one whose saved meal is gone is named in `missing`, never guessed.
 */
export function placeMenu(data: HealthData, menu: Menu, weekStart: string, at: string, newId: () => string): Placed {
  const daily = dailyData(data), saved = new Set(daily.savedMeals.map(m => m.id));
  const planned = new Set(daily.plans.map(p => `${p.date}|${p.meal}|${p.savedMealId}`));
  let next = data, already = 0;
  const planIds: string[] = [], missing: string[] = [];
  for (const item of menu.items) {
    const date = addLocalDays(weekStart, item.day);
    if (!saved.has(item.savedMealId)) { if (!missing.includes(item.name)) missing.push(item.name); continue; }
    if (planned.has(`${date}|${item.meal}|${item.savedMealId}`)) { already++; continue; }
    const id = newId();
    next = saveMealPlan(next, {id, savedMealId: item.savedMealId, date, meal: item.meal}, at);
    planned.add(`${date}|${item.meal}|${item.savedMealId}`); planIds.push(id);
  }
  return {data: next, planIds, already, missing};
}
/** "7 meals: Mon dinner, …" — a menu's size in words. */
export const menuSize = (menu: Menu) => `${menu.items.length} ${menu.items.length === 1 ? 'meal' : 'meals'} on ${new Set(menu.items.map(i => i.day)).size} ${new Set(menu.items.map(i => i.day)).size === 1 ? 'day' : 'days'}`;

import {CAFFEINE_MAX_MG, DRINK_KCAL_MAX, DRINK_SUGAR_MAX_G, DRINK_TYPES, OWN_DRINK_NAME_MAX, OWN_DRINK_SIZE_MAX_ML, OWN_DRINKS_MAX, drinkOf, healthExtrasSchema, type DrinkType, type HealthExtras, type OwnDrink} from './health-extras';
import type {WaterEntry} from './health';
import {ML_PER_US_FL_OZ} from './health-units';
import {isInvisibleName} from './visible-text';

/**
 * Session AV lane 2 (health r3; LEDGER #281, #282, Waterllama's drink creator and calories from drinks): your own drinks
 * (a name, a symbol, a colour, a usual size, the fixed type it counts as, caffeine, energy and sugar), up to 30, kept in
 * the loose health extras on this device; a tap logs a water entry with that drink. Energy and sugar are only ever what
 * you typed, on the drink or on the entry: nothing is looked up or guessed, and every drink still counts as water as
 * logged. Pure.
 */
export const OWN_DRINK_SYMBOLS = ['💧', '☕', '🍵', '🥛', '🧃', '🥤', '🍋', '🫖', '🧉', '🥥', '🍫', '⭐'] as const;
/** What each symbol shows, for screen readers (the symbol itself is decoration). */
export const OWN_DRINK_SYMBOL_NAMES: Record<(typeof OWN_DRINK_SYMBOLS)[number], string> = {'💧': 'Drop', '☕': 'Hot cup', '🍵': 'Tea bowl', '🥛': 'Glass of milk', '🧃': 'Juice box', '🥤': 'Cup with a straw', '🍋': 'Lemon', '🫖': 'Teapot', '🧉': 'Gourd', '🥥': 'Coconut', '🍫': 'Chocolate', '⭐': 'Star'};
export const OWN_DRINK_COLOURS = ['blue', 'teal', 'green', 'yellow', 'orange', 'red', 'pink', 'violet', 'grey'] as const;
export const ownDrinks = (extras: HealthExtras | null | undefined): readonly OwnDrink[] => extras?.ownDrinks ?? [];
export const ownDrinkOf = (extras: HealthExtras | null | undefined, id: string | undefined): OwnDrink | null => id ? ownDrinks(extras).find(d => d.id === id) ?? null : null;

export type DrinkFormInput = {name: string; type: string; sizeMl: string; symbol: string; colour: string; caffeine: string; kcal: string; sugar: string};
export type DrinkIssue = {field: keyof DrinkFormInput; message: string};
/** Reads a whole number up to `max` (blank is undefined, never zero). */
function whole(raw: string, max: number, unit: string, what: string): {ok: true; value: number | undefined} | {ok: false; message: string} {
  const text = raw.trim().replace(new RegExp(`\\s*${unit}$`, 'i'), '');
  if (!text) return {ok: true, value: undefined};
  if (!/^\d+$/.test(text) || Number(text) > max) return {ok: false, message: `${what} is a whole number from 0 to ${max.toLocaleString('en-GB')} ${unit}, or blank.`};
  return {ok: true, value: Number(text)};
}
/** The energy (kcal, whole) and sugar (grams, one decimal) typed for a drink; blank is unknown, never zero. */
export function readDrinkEnergy(kcalText: string, sugarText: string): {ok: true; kcal?: number; sugarG?: number} | {ok: false; field: 'kcal' | 'sugar'; message: string} {
  const kcal = whole(kcalText, DRINK_KCAL_MAX, 'kcal', 'Energy');
  if (!kcal.ok) return {ok: false, field: 'kcal', message: kcal.message};
  const text = sugarText.trim().replace(/\s*g$/i, '').replace(',', '.');
  let sugarG: number | undefined;
  if (text) {
    if (!/^\d+(?:\.\d)?$/.test(text) || Number(text) > DRINK_SUGAR_MAX_G) return {ok: false, field: 'sugar', message: `Sugar is a number of grams from 0 to ${DRINK_SUGAR_MAX_G}, with at most one decimal (like 21.5), or blank.`};
    sugarG = Number(text);
  }
  return {ok: true, ...(kcal.value !== undefined ? {kcal: kcal.value} : {}), ...(sugarG !== undefined ? {sugarG} : {})};
}
const slug = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'drink';
/** Saves a drink from the form (a new one, or `id`'s), or says which field to fix. */
export function saveOwnDrink(extras: HealthExtras, input: DrinkFormInput, id?: string): {ok: true; value: HealthExtras; drink: OwnDrink} | {ok: false; issue: DrinkIssue} {
  const name = input.name.trim(), list = [...ownDrinks(extras)];
  if (!name || isInvisibleName(name)) return {ok: false, issue: {field: 'name', message: 'Give the drink a name with letters or numbers.'}};
  if (name.length > OWN_DRINK_NAME_MAX) return {ok: false, issue: {field: 'name', message: `Keep the name to ${OWN_DRINK_NAME_MAX} characters or fewer.`}};
  if (list.some(d => d.id !== id && d.name.toLowerCase() === name.toLowerCase())) return {ok: false, issue: {field: 'name', message: `You already have a drink called ${name}.`}};
  if (!(DRINK_TYPES as readonly string[]).includes(input.type)) return {ok: false, issue: {field: 'type', message: 'Choose what it counts as.'}};
  const size = whole(input.sizeMl, OWN_DRINK_SIZE_MAX_ML, 'mL', 'The usual size');
  if (!size.ok || !size.value) return {ok: false, issue: {field: 'sizeMl', message: `The usual size is a whole number of millilitres from 1 to ${OWN_DRINK_SIZE_MAX_ML.toLocaleString('en-GB')}, like 250.`}};
  const caffeine = whole(input.caffeine, CAFFEINE_MAX_MG, 'mg', 'Caffeine');
  if (!caffeine.ok) return {ok: false, issue: {field: 'caffeine', message: caffeine.message}};
  const energy = readDrinkEnergy(input.kcal, input.sugar);
  if (!energy.ok) return {ok: false, issue: {field: energy.field, message: energy.message}};
  if (!id && list.length >= OWN_DRINKS_MAX) return {ok: false, issue: {field: 'name', message: `Up to ${OWN_DRINKS_MAX} drinks of your own: remove one to add another.`}};
  let newId = id;
  if (!newId) { const base = slug(name); newId = base; for (let n = 2; list.some(d => d.id === newId); n++) newId = `${base}-${n}`; }
  const drink: OwnDrink = {id: newId, name, type: input.type as DrinkType, sizeMl: size.value,
    ...((OWN_DRINK_SYMBOLS as readonly string[]).includes(input.symbol) ? {symbol: input.symbol} : {}),
    ...((OWN_DRINK_COLOURS as readonly string[]).includes(input.colour) ? {colour: input.colour} : {}),
    ...(caffeine.value !== undefined ? {caffeineMg: caffeine.value} : {}), ...(energy.kcal !== undefined ? {kcal: energy.kcal} : {}), ...(energy.sugarG !== undefined ? {sugarG: energy.sugarG} : {})};
  const at = list.findIndex(d => d.id === id);
  if (at >= 0) list[at] = drink; else list.push(drink);
  return {ok: true, value: healthExtrasSchema.parse({...extras, ownDrinks: list}), drink};
}
/** Removes one of your drinks; entries logged with it keep their type, caffeine, energy and sugar. */
export function removeOwnDrink(extras: HealthExtras, id: string): HealthExtras {
  const list = ownDrinks(extras).filter(d => d.id !== id);
  return healthExtrasSchema.parse({...extras, ownDrinks: list.length ? list : undefined});
}
/** Moves one of your drinks a place up or down in the row. */
export function moveOwnDrink(extras: HealthExtras, id: string, by: -1 | 1): HealthExtras {
  const list = [...ownDrinks(extras)], i = list.findIndex(d => d.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return extras;
  [list[i], list[j]] = [list[j]!, list[i]!];
  return healthExtrasSchema.parse({...extras, ownDrinks: list});
}
/** What one tap of a drink notes on its water entry: its type, caffeine, energy and sugar, copied from the drink. */
export const tapNote = (d: OwnDrink) => ({type: d.type, caffeineMg: d.caffeineMg, more: {own: d.id, ...(d.kcal !== undefined ? {kcal: d.kcal} : {}), ...(d.sugarG !== undefined ? {sugarG: d.sugarG} : {})}});

export type DrinkEnergyDay = {kcal: number | null; sugarG: number | null; withKcal: number; withSugar: number; drinks: number;
  /** Review B3B-6: the drinks with an energy or a sugar typed, and those (not water) with neither. */
  counted: number; uncounted: number; lines: {name: string; kcal?: number; sugarG?: number; ml: number}[]};
const entryMl = (w: Pick<WaterEntry, 'amountMilli' | 'unit'>) => w.unit === 'ml' ? w.amountMilli / 1000 : w.amountMilli / 1000 * ML_PER_US_FL_OZ;
/**
 * The energy and sugar of a day's drinks, from what was typed (each entry's own value, as logged: a drink's energy is per
 * entry, not per 100 mL). A drink without a typed energy is not counted (said beside the total), never as zero.
 */
export function drinkEnergyDay(extras: HealthExtras | null | undefined, water: readonly WaterEntry[], date: string): DrinkEnergyDay {
  let kcal = 0, sugar = 0, withKcal = 0, withSugar = 0, drinks = 0;
  const lines: DrinkEnergyDay['lines'] = [];
  for (const w of water) {
    if (w.date !== date) continue;
    const d = drinkOf(extras, w.id);
    if (d.type === 'water' && d.kcal === undefined && d.sugarG === undefined) continue;
    drinks++;
    if (d.kcal !== undefined) { kcal += d.kcal; withKcal++; }
    if (d.sugarG !== undefined) { sugar += d.sugarG; withSugar++; }
    if (d.kcal !== undefined || d.sugarG !== undefined) lines.push({name: ownDrinkOf(extras, d.own)?.name ?? (d.type === 'soft drink' ? 'Soft drink' : d.type[0]!.toUpperCase() + d.type.slice(1)), ml: Math.round(entryMl(w)), ...(d.kcal !== undefined ? {kcal: d.kcal} : {}), ...(d.sugarG !== undefined ? {sugarG: d.sugarG} : {})});
  }
  return {kcal: withKcal ? kcal : null, sugarG: withSugar ? Math.round(sugar * 10) / 10 : null, withKcal, withSugar, drinks, counted: lines.length, uncounted: drinks - lines.length, lines};
}

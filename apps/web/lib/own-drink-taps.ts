import type {HealthExtras, OwnDrink} from './health-extras';

/**
 * Session AW Part 2 (speed, attempt 2): what the Water card's one-tap drinks need on Health's first screen
 * (components/health/r3/own-drink-taps.tsx) — the person's drinks and what a tap notes on its water entry — on their own,
 * so the rest of lib/own-drinks.ts (the drink form's checks, the symbols, the energy line) stays in the card's lazy part.
 * lib/own-drinks.ts re-exports both. Pure.
 */
export const ownDrinks = (extras: HealthExtras | null | undefined): readonly OwnDrink[] => extras?.ownDrinks ?? [];
/** What one tap of a drink notes on its water entry: its type, caffeine, energy and sugar, copied from the drink. */
export const tapNote = (d: OwnDrink) => ({type: d.type, caffeineMg: d.caffeineMg, more: {own: d.id, ...(d.kcal !== undefined ? {kcal: d.kcal} : {}), ...(d.sugarG !== undefined ? {sugarG: d.sugarG} : {})}});

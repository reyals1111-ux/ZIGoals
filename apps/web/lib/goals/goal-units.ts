/**
 * Session AL (L4, DV-014/DV-034/DV-035/DV-103/DV-123): a count Goal's own unit. "Read 20 books" counts books, not a coin:
 * its record keeps the word the person typed as `asset` (older builds upper-cased it, so "BOOKS") with `denom`
 * "manual:<word>". This module says when an asset is such a word, writes amounts in it ("20 books", "1 book") and gives
 * the Goal its own tracked source, so funding never asks for "the same asset" the person already named.
 */
import {unitAmountText} from '../plural';
import {positionSchema,type Platform,type Position,type PrivateGoal} from '../positions';

/** Unit words the app knows, singular and plural, lower case (lib/plural.ts SINGULAR_UNITS and its plurals). */
const KNOWN_WORDS = new Set([
 'time','times','minute','minutes','hour','hours','step','steps','page','pages','glass','glasses','session','sessions','rep','reps',
 'serving','servings','cup','cups','check-in','check-ins','day','days','week','weeks','month','months','book','books','chapter',
 'chapters','lesson','lessons','workout','workouts','run','runs','walk','walks','kilometre','kilometres','kilometer','kilometers',
 'mile','miles','item','items','unit','units','word','words','song','songs','course','courses','class','classes','milestone','milestones',
]);

/**
 * True when `asset` is a word for what is counted ("books", "BOOKS", "push-ups", "Gold grams"), not a ticker ("BTC", "ZIG",
 * "USD") or a currency. A known unit word in any case is a word; so is any text with a lower-case letter or a space.
 */
export function isUnitWord(asset: string): boolean {
 const text = asset.trim();
 if (!text) return false;
 if (KNOWN_WORDS.has(text.toLowerCase())) return true;
 return /[a-z]/.test(text) || /\s/.test(text);
}

/** The unit as people read it: a known word in lower case ("BOOKS" → "books"); anything else exactly as typed. */
export function unitWord(asset: string): string {
 const text = asset.replace(/\s+/g, ' ').trim();
 return KNOWN_WORDS.has(text.toLowerCase()) ? text.toLowerCase() : text;
}

/** "20 books", "1 book", "2.5 pages". `value` is the decimal text or a number. */
export function unitAmount(value: string | number, asset: string): string {
 const n = typeof value === 'number' ? value : Number(value), word = unitWord(asset);
 // lib/plural.ts knows most unit words; a Project's "milestones" is added here (DV-019f/DV-040b: "1 milestones").
 if (word === 'milestones' && Math.abs(n) === 1) return unitAmountText(n, 'milestone');
 return unitAmountText(n, word);
}

/** A count Goal of the person's own unit (not a chain asset, a market asset or money). */
export function isOwnUnitGoal(goal: Pick<PrivateGoal, 'type' | 'denom'>): boolean {
 return goal.type === 'QUANTITY' && goal.denom.startsWith('manual:');
}

/** The tracked source that holds this Goal's own unit: same symbol, denom and precision, not archived. */
export function ownUnitPosition(s: Pick<Platform, 'positions'>, goal: Pick<PrivateGoal, 'asset' | 'denom' | 'decimals'>): Position | undefined {
 return s.positions.find(p => !p.archivedAt && p.sourceType === 'MANUAL' && p.asset === goal.asset && p.denom === goal.denom && p.decimals === goal.decimals);
}

/**
 * A new tracked source for the Goal's own unit, holding nothing yet. Funding then adds the typed count to it and counts
 * it toward the Goal; no money value is asked for (a book has no price).
 */
export function newOwnUnitPosition(goal: Pick<PrivateGoal, 'asset' | 'denom' | 'decimals' | 'name'>, id = crypto.randomUUID(), observedAt = new Date().toISOString()): Position {
 return positionSchema.parse({
  id, providerId: `${goal.name}`.slice(0, 250), sourceType: 'MANUAL', network: 'manual', account: 'local',
  asset: goal.asset, denom: goal.denom, quantity: '0', decimals: goal.decimals, assetClass: 'Custom',
  verification: 'MANUAL', sync: 'MANUAL', liquidity: 'UNKNOWN', observedAt,
  provenance: `Your own count for “${goal.name.slice(0, 200)}”`, notes: '',
 });
}

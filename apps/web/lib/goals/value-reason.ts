/**
 * Session AL third pass (L4; MO-145, MO-160, BN-156): why a source adds no value to a money Goal, in words. Kept apart
 * from lib/goals/funding-notes.ts so lib/goal-summary.ts can read it without an import cycle.
 */
import type {Platform, Position, PrivateGoal} from '../positions';
import {isMoneyCurrency} from '../visual-format';

/**
 * Why a source adds no value to a money Goal, in words, or null when it can be valued in the Goal's
 * currency. `quoted` is true when a live price in that currency is loaded for it.
 */
export function valueReason(p: Pick<Position, 'asset' | 'valuation' | 'marketRef' | 'assetClass'>, goalCurrency: string, quoted = false): string | null {
 if (!isMoneyCurrency(goalCurrency) || quoted) return null;
 if (p.assetClass === 'Cash' && p.asset === goalCurrency) return null;
 const own = p.valuation?.currency ?? (isMoneyCurrency(p.asset) ? p.asset : undefined);
 if (own === goalCurrency) return null;
 if (own) return `Valued in ${own}; this goal counts ${goalCurrency}. ZIGoals never converts between currencies, so it adds no value here. Choose a ${goalCurrency} asset, or change the goal’s currency.`;
 if (p.marketRef) return `Its ${goalCurrency} price has not loaded yet, so it adds no value for now.`;
 return `It has no value yet. Add its value on its asset page to count it.`;
}

/** The one reason a Goal shows "no value" when every unvalued source shares it (the card's line), else null. */
export function goalValueReason(s: Platform, g: Pick<PrivateGoal, 'id' | 'type' | 'asset'>, unvaluedIds: readonly string[]): string | null {
 if (g.type !== 'VALUE' || !unvaluedIds.length) return null;
 const currencies = new Set<string>();
 for (const id of unvaluedIds) {
  const p = s.positions.find(x => x.id === id);
  const own = p?.valuation?.currency ?? (p && isMoneyCurrency(p.asset) ? p.asset : undefined);
  if (!p || !own || own === g.asset || p.marketRef) return null;
  currencies.add(own);
 }
 if (currencies.size !== 1) return null;
 const own = [...currencies][0]!;
 return `Funded in ${own}; this goal is in ${g.asset}. ZIGoals does not convert: change the goal’s currency or count a ${g.asset} asset.`;
}


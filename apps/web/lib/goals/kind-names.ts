/**
 * Session AL (L4; DV-007b, DV-008b, DV-013, DV-039a, DV-049c, DV-057b; P-DV-20): one plain name per kind of Goal, the
 * same on the card, the goal page's eyebrow, Today and ZIGi, until the person chose the chain (lib/chain-choice.ts). Once
 * chosen, the chain's own words stand (owner decision: crypto words stay where people chose those modules).
 */
export type GoalKind = 'VALUE' | 'QUANTITY' | 'PROJECT' | 'REWARD';
export const KIND_NAMES: Record<GoalKind, string> = {VALUE: 'Savings goal', QUANTITY: 'Count goal', PROJECT: 'Project', REWARD: 'Rewards goal'};

/** The kind from a summary's type text ("Value Goal", "Quantity Goal", …), or null for a local-simulation category. */
export function kindOfSummaryType(type: string): GoalKind | null {
 const m = /^(Value|Quantity|Project|Reward) Goal$/.exec(type);
 return m ? (m[1]!.toUpperCase() as GoalKind) : null;
}

/** The name to show for a summary's type: the plain name before the chain is chosen, the summary's own words after. */
export function kindLabel(type: string, chain: boolean): string {
 if (chain) return type;
 const kind = kindOfSummaryType(type);
 return kind ? KIND_NAMES[kind] : type;
}

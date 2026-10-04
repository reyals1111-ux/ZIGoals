/** The shape of a Quick-add locale table (A2). */
export type UnitKind = 'glass' | 'ml' | 'l' | 'floz' | 'kg' | 'lb' | 'steps' | 'km' | 'mi' | 'min' | 'h';
export type VerbKind = 'water' | 'weight' | 'walk' | 'run' | 'cycle' | 'swim' | 'sleep';
export type QuickAddLocale = {
  numbers: Record<string, number>;
  units: Record<string, UnitKind>;
  verbs: Record<string, VerbKind>;
  dayWords: Record<string, 'today' | 'yesterday'>;
  stems: Record<string, string>;
  fillers: string[];
  conjunctions: string[];
  examples: [string, string, string];
};
export type QuickAddDay = 'today' | 'yesterday';
export type QuickAddHabit = {id: string; title: string; unit: string; kind: 'boolean' | 'count' | 'duration' | 'quantity' | 'custom'; target: number};
export type QuickAddContext = {habits: QuickAddHabit[]; counters: {id: string; name: string}[]; waterUnit: 'ml' | 'fl-oz-us'; weightUnit: 'kg' | 'lb'};
export type ActivityName = 'Run' | 'Walk' | 'Cycle' | 'Swim';
export type QuickAddKnown =
  | {kind: 'water'; millilitres: number; shown: {amount: number; unit: 'glasses' | 'mL' | 'L' | 'US fl oz'}; day: QuickAddDay}
  | {kind: 'weight'; grams: number; shown: {amount: number; unit: 'kg' | 'lb'}; day: QuickAddDay}
  | {kind: 'steps'; steps: number; minutes?: number; day: QuickAddDay}
  | {kind: 'activity'; name: ActivityName; minutes: number; distanceKm?: number; day: QuickAddDay}
  | {kind: 'sleep'; minutes: number; day: QuickAddDay}
  | {kind: 'exercise'; counterId: string; name: string; count: number; day: QuickAddDay}
  | {kind: 'habit'; habitId: string; title: string; value: number; unit: string; day: QuickAddDay};
export type QuickAddResult = QuickAddKnown | {kind: 'ambiguous'; choices: QuickAddKnown[]} | {kind: 'needs-more'; hint: string} | {kind: 'unknown'; examples: [string, string, string]};

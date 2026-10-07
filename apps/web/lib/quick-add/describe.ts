import {formatNumber} from '../visual-format';
import type {QuickAddKnown} from './types';

/** The preview and saved lines of a Quick-add result (A2): exact amounts, the person's own units, no praise. */
const n = (value: number) => formatNumber(value, {maximumFractionDigits: 3});
const unitWord = (unit: string, value: number) => unit === 'done' ? 'done' : unit === 'times' ? (value === 1 ? 'time' : 'times') : unit;
export function describeQuickAdd(result: QuickAddKnown): string {
  switch (result.kind) {
    case 'water': return result.shown.unit === 'glasses' ? `Water · ${n(result.shown.amount)} ${result.shown.amount === 1 ? 'glass' : 'glasses'} (${n(result.millilitres)} mL)` : result.shown.unit === 'mL' ? `Water · ${n(result.millilitres)} mL` : `Water · ${n(result.shown.amount)} ${result.shown.unit} (${n(result.millilitres)} mL)`;
    case 'weight': return `Weight · ${n(result.shown.amount)} ${result.shown.unit}`;
    case 'steps': return `Walk · ${n(result.steps)} steps${result.minutes ? ` · ${n(result.minutes)} min` : ''}`;
    case 'activity': return `${result.name}${result.distanceKm !== undefined ? ` · ${n(result.distanceKm)} km` : ''} · ${n(result.minutes)} min`;
    case 'sleep': { const hours = Math.floor(result.minutes / 60), minutes = result.minutes - hours * 60; return `Sleep · ${hours} h${minutes ? ` ${n(minutes)} min` : ''}${result.wake ? ` · woke ${result.wake}` : ''}`; }
    case 'exercise': return `${result.name} · +${n(result.count)} reps`;
    case 'habit': return `${result.title} · +${n(result.value)} ${unitWord(result.unit, result.value)}`;
  }
}
/** A short name for a choice button when a line could mean two things. */
export function describeChoice(result: QuickAddKnown): string {
  return result.kind === 'habit' ? `${result.title} (habit)` : result.kind === 'exercise' ? `${result.name} (counter)` : describeQuickAdd(result).split(' · ')[0]! + ` (${result.kind === 'water' ? 'water journal' : result.kind === 'weight' ? 'weight' : result.kind === 'sleep' ? 'a night in Sleep' : 'activity'})`;
}
/** After Save: what was written, in plain words. */
export function savedLine(result: QuickAddKnown, habitTotal?: {value: number; target: number; unit: string}): string {
  if (result.kind === 'habit' && habitTotal) return `Saved: ${result.title} · ${n(habitTotal.value)} of ${n(habitTotal.target)} ${unitWord(habitTotal.unit, habitTotal.target)} ${result.day}`;
  if (result.kind === 'water') return `Saved: Water · ${n(result.millilitres)} mL · ${result.day}`;
  if (result.kind === 'sleep') return `Saved to Sleep: ${describeQuickAdd(result).replace(/^Sleep · /, '')} · ${result.day}`;
  return `Saved: ${describeQuickAdd(result)} · ${result.day}`;
}

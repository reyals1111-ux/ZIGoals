/**
 * Session AV lane 2 (r5-plan, review B5L-1, B5L-3; LEDGER #350): the one rule for what a closed task is. A task with
 * `doneAt` is closed; it is a finish only when it is not cancelled (`state.kind === 'cancelled'`, closed without being done,
 * which keeps `doneAt` so older builds read it as finished). Every place that counts or draws a finish reads these two;
 * "open" stays `!doneAt`. No imports, so any first chunk can use it.
 */
type Closable = {doneAt?: string; state?: {kind?: string} | undefined};
export const isCancelled = (t: Closable): boolean => !!t.doneAt && t.state?.kind === 'cancelled';
export const isFinished = (t: Closable): boolean => !!t.doneAt && t.state?.kind !== 'cancelled';

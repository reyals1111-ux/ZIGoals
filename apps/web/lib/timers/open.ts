/**
 * Session AW (X1, LEDGER #440): the tiny, import-free part of the timers the shell's gate reads before anything else
 * loads — the event that opens the Timers sheet, the record's key, and whether the stored record holds a timer that is
 * running, paused or ended (a cheap text check; the strip itself reads the record properly).
 */
export const TIMERS_OPEN = 'zigoals:timers-open';
export const TIMERS_KEY_LITERAL = 'zigoals:timers:v1';
export const openTimersEvent = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(TIMERS_OPEN)); };
export const mayShowStrip = (raw: string | null) => !!raw && /"(?:endsAt|left)"\s*:/.test(raw);

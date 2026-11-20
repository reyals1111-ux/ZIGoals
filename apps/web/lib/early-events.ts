/**
 * Session AV Part 5 (ADR-045 D-WEIGHT): ZIGi's launcher and the music player load right after the first paint, as their own
 * chunks. A tap made before one is there (the phone's "Apps & extras" → ZIGi, a page's "Ask ZIGi about this", More → the
 * player) is kept here, and the part takes it when it arrives and can act on it; nothing is lost and nothing runs twice.
 */
export const EARLY_EVENTS = ['zigoals:zigi-open', 'zigoals:ai-ask', 'zigoals:music-open', 'zigoals:soundscape-start'] as const;
const kept = new Map<string, Event>(), live = new Set<string>();
/** Starts keeping these events until their part takes them (call once, before the page is interactive). */
export function keepEarlyEvents(win: Window, names: readonly string[] = EARLY_EVENTS): void {
  for (const name of names) win.addEventListener(name, event => { if (!live.has(name)) kept.set(name, event); });
}
/** The part is here and listening: the event it missed, if any (once), and none kept from now on. */
export function takeEarlyEvent(name: string): Event | undefined {
  live.add(name);
  const event = kept.get(name); kept.delete(name);
  return event;
}

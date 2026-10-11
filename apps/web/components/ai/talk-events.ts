/**
 * How ZIGi's launcher asks the panel's composer to talk (Session Z-Cloud Part 3, ADR-019), in a module with no import, so
 * the launcher (on every page) ships three names and nothing else. The composer answers synchronously in the event's own
 * task (`detail.handled`), so a press keeps its gesture; when no composer exists yet the launcher leaves `TALK_PENDING` for
 * it, and the composer lights its microphone with "Tap the mic to talk" as soon as it mounts.
 */
export const TALK_EVENT = 'zigoals:zigi-talk';
export const TALK_STOP_EVENT = 'zigoals:zigi-talk-stop';
export const TALK_PENDING = '__zigiTalkPending';
export type TalkOrigin = 'composer' | 'launcher' | 'shortcut';
export type TalkRequest = {origin: TalkOrigin; handled?: 'started' | 'highlight'};
/** A press at least this long on the launcher is push-to-talk; shorter is a tap. */
export const LAUNCHER_HOLD_MS = 350;

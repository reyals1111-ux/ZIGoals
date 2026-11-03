/**
 * The ring/silent switch (Session AK, owner decision MUSIC). On iPhone and iPad, sound made in the browser follows the
 * switch: on silent, the focus sounds are not heard. Safari 17 and later let a page ask to play anyway through
 * `navigator.audioSession.type = 'playback'`; ZIGoals asks only when the person turned on "Play when the phone is on
 * silent" (off by default), and hands the choice back to the browser ('auto') when they turn it off. Browsers without
 * this (Android, computers) ignore the setting: there the device's own volume and mute decide.
 */
type Session = {type: string};
const session = (): Session | null => { try { return (globalThis.navigator as {audioSession?: Session} | undefined)?.audioSession ?? null; } catch { return null; } };
let asked = false;
/** Whether this browser lets a page choose how its sound treats the silent switch. */
export const silentSwitchChoice = () => !!session();
/** Applies the person's choice before a sound starts. Nothing changes unless they turned it on (or turned it back off). */
export function applyPlayOnSilent(on: boolean): void {
  const s = session();
  if (!s) return;
  try {
    if (on) { if (s.type !== 'playback') s.type = 'playback'; asked = true; }
    else if (asked) { s.type = 'auto'; asked = false; }
  } catch { /* the browser refused: its default stays */ }
}
/** Tests only. */
export function resetAudioSessionForTests(): void { asked = false; }

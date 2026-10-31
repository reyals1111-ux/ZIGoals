/** Opens the music player from anywhere (Today's widget, the phone's More sheet, Settings → Music); no imports, for the shell. */
export const MUSIC_OPEN_EVENT = 'zigoals:music-open';
export const openMusicPlayer = () => window.dispatchEvent(new CustomEvent(MUSIC_OPEN_EVENT));
/**
 * Session AK (owner decision MUSIC): starts a ready-made soundscape ('focus', 'wind-down' or 'sleep'). The music button
 * (components/music/music-launcher.tsx, always in the shell) listens and loads the player on first use. Call it through
 * `startSoundscape` (components/music/soundscape-start.ts) from a tap, which also wakes the audio inside that tap.
 */
export const SOUNDSCAPE_EVENT = 'zigoals:soundscape-start';
/** The answer, on `window`, once the soundscape plays (`detail.ok`) or could not (no Web Audio). */
export const SOUNDSCAPE_RESULT_EVENT = 'zigoals:soundscape-result';

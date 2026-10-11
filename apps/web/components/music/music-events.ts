/** Opens the music player from anywhere (Today's widget, the phone's More sheet, Settings → Music); no imports, for the shell. */
export const MUSIC_OPEN_EVENT = 'zigoals:music-open';
export const openMusicPlayer = () => window.dispatchEvent(new CustomEvent(MUSIC_OPEN_EVENT));

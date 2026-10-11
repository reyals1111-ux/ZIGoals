'use client';
import {AppIcon} from '../app-icon';
import {usePagesView} from '../pages/use-pages-view';
import {isShown} from '../../lib/pages/visibility';
import {openMusicPlayer} from './music-events';

/**
 * The More sheet's row for the music player (Session W Part 20): a button, not a link (the sheet's links stay exactly
 * the navigation), shown while "Music player" shows under Your pages & buttons; it closes the sheet and opens the panel.
 */
export function MusicMoreRow({onNavigate}: {onNavigate: () => void}) {
  if (!isShown(usePagesView(), 'music')) return null;
  return <li data-group-start="music"><button type="button" className="phone-more-row" onClick={() => { onNavigate(); requestAnimationFrame(openMusicPlayer); }}>
    <span className="icon-medallion"><AppIcon name="music" size={22} luminous/></span>
    <span className="phone-more-copy" data-note="Focus sounds, Spotify or Apple Music"><strong>Your soundtrack</strong></span>
  </button></li>;
}

import {SpotifyCallback} from '../../../../components/music/spotify-callback';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: 'Spotify'};
// Session W Part 20: the one redirect address registered with Spotify for this origin (docs/product/MUSIC_ACTIVATION.md).
export default function Page() { return <SpotifyCallback />; }

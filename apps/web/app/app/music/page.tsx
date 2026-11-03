import type {Metadata} from 'next';
import {PageHeader} from '../../../components/page-header';
import {MusicPageClient} from '../../../components/music/music-page-client';
// Session AK (lane U, owner decision MUSIC): the full music page. No sidebar entry: the music player's panel and the
// Music entry link here. Its route stays small: the player loads on the client, on first paint, as its own chunk.
export const metadata: Metadata = {title: 'Music'};
export default function Page() {
  return <div className="dashboard music-route">
    <PageHeader className="page-heading" eyebrow="Your soundtrack" title="Music" lede="Calm sounds made on this device, a mix of up to three, playlists in your music app, and Spotify. Nothing is downloaded or tracked." />
    <MusicPageClient />
  </div>;
}

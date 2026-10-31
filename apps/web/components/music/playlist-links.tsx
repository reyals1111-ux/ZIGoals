'use client';
import {useState} from 'react';
import {MOOD_NAMES, PLAYLISTS, PLAYLIST_MOODS, PLAYLIST_SERVICES, SERVICE_NAMES, type PlaylistMood} from '../../lib/music/playlists';
import './music-mix.css';

/**
 * "Open in Spotify / Apple Music / YouTube Music" (Session AK, owner decision MUSIC): focus, deep-work, sleep and workout
 * playlists from the services' own editors (lib/music/playlists.ts says how each was checked). Plain links in a new tab:
 * no API, no tracking parameters, nothing about the person is sent.
 */
export default function PlaylistLinks() {
  const [mood, setMood] = useState<PlaylistMood>('focus');
  return <div className="music-links">
    <fieldset className="music-links-moods"><legend>Playlists for</legend>
      {PLAYLIST_MOODS.map(m => <button key={m} type="button" className="ambient-chip" aria-pressed={mood === m} onClick={() => setMood(m)}>{MOOD_NAMES[m]}</button>)}
    </fieldset>
    <ul aria-label={`${MOOD_NAMES[mood]} playlists`}>
      {PLAYLIST_SERVICES.map(s => { const link = PLAYLISTS[mood][s]; return <li key={s}>
        <a href={link.href} target="_blank" rel="noopener noreferrer"><strong>{link.title}</strong><span>{SERVICE_NAMES[s]} ↗<span className="sr-only"> (opens in a new tab)</span></span></a>
      </li>; })}
    </ul>
    <p className="music-mix-hint">Each opens in the service’s own app or tab. ZIGoals sends nothing and learns nothing about what you play.</p>
  </div>;
}

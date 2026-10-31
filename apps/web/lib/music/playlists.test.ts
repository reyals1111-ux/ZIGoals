import {expect, test} from 'vitest';
import {PLAYLISTS, PLAYLIST_HOSTS, PLAYLIST_MOODS, PLAYLIST_SERVICES} from './playlists';

// Session AK (owner decision MUSIC): plain https links to the services' own playlists or search, nothing added.
test('focus, deep work, sleep and workout, each in Spotify, Apple Music and YouTube Music', () => {
  expect(PLAYLIST_MOODS).toEqual(['focus', 'deep-work', 'sleep', 'workout']);
  for (const mood of PLAYLIST_MOODS) expect(Object.keys(PLAYLISTS[mood]).sort()).toEqual([...PLAYLIST_SERVICES].sort());
});
test('each link is https on its own service, with no tracking or referral parameter', () => {
  for (const mood of PLAYLIST_MOODS) for (const service of PLAYLIST_SERVICES) {
    const url = new URL(PLAYLISTS[mood][service].href);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe(PLAYLIST_HOSTS[service]);
    expect(url.username + url.password + url.hash).toBe('');
    for (const key of url.searchParams.keys()) expect(service === 'youtube' && key === 'q', `${mood} ${service} ${key}`).toBe(true);
    expect(url.href).not.toMatch(/utm_|si=|ref=|app=|itsct|itscg|fbclid|gclid/);
  }
});

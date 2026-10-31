/**
 * "Open in Spotify / Apple Music / YouTube Music" (Session AK, owner decision MUSIC): plain links to the services' own
 * public editorial playlists, or to their search for the phrase where a playlist could not be checked. No API, no
 * tracking parameters, nothing sent: each opens in a new tab (rel="noopener noreferrer").
 *
 * Checked from the build sandbox on 2026-10-31 by fetching each page once: the Spotify playlists answered 200 with their
 * titles (Deep Focus, Intense Studying, Sleep, Beast Mode; a made-up id answers "Page not found"); the Apple Music
 * playlists answered 200 with their titles and Apple's own curators (Pure Focus and Pure Ambient: Apple Music
 * Electronic; Ambient Sleep: Apple Music Sleep; Pure Workout: Apple Music Fitness), addressed without a country so
 * Apple opens the visitor's own storefront. YouTube Music's pages are drawn by script, so a playlist cannot be checked
 * from outside; its links are its search for the phrase (which answered 200).
 */
export const PLAYLIST_MOODS = ['focus', 'deep-work', 'sleep', 'workout'] as const;
export type PlaylistMood = typeof PLAYLIST_MOODS[number];
export const PLAYLIST_SERVICES = ['spotify', 'apple', 'youtube'] as const;
export type PlaylistService = typeof PLAYLIST_SERVICES[number];
export const SERVICE_NAMES: Record<PlaylistService, string> = {spotify: 'Spotify', apple: 'Apple Music', youtube: 'YouTube Music'};
export const MOOD_NAMES: Record<PlaylistMood, string> = {focus: 'Focus', 'deep-work': 'Deep work', sleep: 'Sleep', workout: 'Workout'};
export type PlaylistLink = {title: string; href: string};
export const PLAYLISTS: Record<PlaylistMood, Record<PlaylistService, PlaylistLink>> = {
  focus: {
    spotify: {title: 'Deep Focus', href: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ'},
    apple: {title: 'Pure Focus', href: 'https://music.apple.com/playlist/pure-focus/pl.dbd712beded846dca273d5d3259d28aa'},
    youtube: {title: 'Search “deep focus”', href: 'https://music.youtube.com/search?q=deep+focus'},
  },
  'deep-work': {
    spotify: {title: 'Intense Studying', href: 'https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6'},
    apple: {title: 'Pure Ambient', href: 'https://music.apple.com/playlist/pure-ambient/pl.a9bd89e7b22e45cbaac40b58c9d3d09b'},
    youtube: {title: 'Search “deep work”', href: 'https://music.youtube.com/search?q=deep+work'},
  },
  sleep: {
    spotify: {title: 'Sleep', href: 'https://open.spotify.com/playlist/37i9dQZF1DWZd79rJ6a7lp'},
    apple: {title: 'Ambient Sleep', href: 'https://music.apple.com/playlist/ambient-sleep/pl.2ce0acb450d048c49d4c4b52b2f4b195'},
    youtube: {title: 'Search “sleep”', href: 'https://music.youtube.com/search?q=sleep'},
  },
  workout: {
    spotify: {title: 'Beast Mode', href: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP'},
    apple: {title: 'Pure Workout', href: 'https://music.apple.com/playlist/pure-workout/pl.ad0ee1557e3e4feba314fd70f7982766'},
    youtube: {title: 'Search “workout”', href: 'https://music.youtube.com/search?q=workout'},
  },
};
/** The only hosts these links may point at. */
export const PLAYLIST_HOSTS: Record<PlaylistService, string> = {spotify: 'open.spotify.com', apple: 'music.apple.com', youtube: 'music.youtube.com'};

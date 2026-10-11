/**
 * What the music player links to and how it credits a service (Session W Part 20). Spotify's design rules ask that its
 * content be shown with Spotify's logo and a link back to Spotify; ZIGoals ships no copy of that logo. The owner adds the
 * official file from Spotify's design guidelines at SPOTIFY_LOGO (docs/product/MUSIC_ACTIVATION.md): until it loads,
 * no track, artist or artwork from Spotify is shown, only "Open Spotify". Apple Music is a plain link: playing it inside
 * ZIGoals needs an Apple Developer membership and a signed developer token, which this build does not have.
 */
export const SPOTIFY_LOGO = '/brand/spotify/logo.svg';
export const SPOTIFY_HOME = 'https://open.spotify.com/';
export const APPLE_MUSIC_HOME = 'https://music.apple.com/';

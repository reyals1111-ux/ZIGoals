# Music "Your soundtrack": what ships, and how the owner turns Spotify on

**Status (2026-10-07):** written with Session W Part 20, before any activation. Nothing here has run against a real
Spotify account: the connection, the token refresh and the player are proven by unit tests and by browser tests whose
Spotify (authorize page, token endpoint, Web API, artwork host) and logo file are MOCKS. ADR-015 S120–S126 record the
decisions.

## What ships, and what stays off
- **The music button** (Settings → Your pages & buttons → "Music player"; off by default for existing people, on in the
  Showcase): a round button at the bottom, opposite ZIGi's side, above the tab bar on phones. It opens the panel; so do
  Today's "Your soundtrack" widget (widget library → Music), the phone's More sheet and Settings → Music. "Mini-bar"
  (this device) swaps the button for a small bar with play or pause.
- **Focus sounds** always work: white, pink and brown noise, rain-like, ocean-like and a soft drone, made on the device
  with Web Audio (Part 6). Nothing is downloaded or recorded.
- **Spotify** is built and **off** until the owner sets one value (step 3 below). Until then the panel and Settings say
  "Spotify isn't set up on this site yet" and offer "Open Spotify" (a plain link to open.spotify.com).
- **Apple Music** is a link only ("Open Apple Music"). Playing it inside ZIGoals (MusicKit on the web) needs an Apple
  Developer Program membership and a developer token signed with the owner's MusicKit key (valid at most six months),
  which this build does not have and does not pretend to have.
- One source at a time: Spotify's content never sits next to another service's.

## How Spotify works here
- **Authorization Code with PKCE from the browser** ([tutorial](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow),
  [refreshing tokens](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens), read
  2026-10-07). No client secret exists anywhere: PKCE needs none. A full-page visit to `accounts.spotify.com/authorize`
  (the app isolates its window, so no popup), back to `<origin>/app/music/spotify`, which checks the one-time state
  (this tab, this account, 10 minutes), cleans the address, exchanges the code and returns to the page the person was on.
- **Scopes:** `user-read-playback-state`, `user-read-currently-playing`, `user-modify-playback-state`. Nothing else is
  asked: no library, no playlists, no profile.
- **What it does:** shows what plays on the person's Spotify (title, artists, artwork, device, progress), and sends
  their taps: play or pause, previous, next, and under More controls the device, shuffle, repeat, volume and position.
  It is a remote control for Spotify's own apps and speakers (Spotify Connect): no music plays in the ZIGoals page (no
  Web Playback SDK).
- **When it asks:** every 10 seconds only while the panel or the mini-bar shows and the page is visible, and 0.7 s after
  a tap. Never in the background.
- **Answers, in words:** a 401 is refreshed once silently, then "Spotify asks you to connect again"; a 403 is "Controlling
  playback needs Spotify Premium, and while ZIGoals is in Spotify's development mode only accounts the owner listed can
  use it"; no active device is "No Spotify device is playing"; a 429 stops every request until Spotify's wait has passed
  (30 s when the browser may not read it), with no automatic retry.
- **What is kept:** the tokens, sealed with AES-GCM under a non-extractable key in IndexedDB `zigoals-link-tokens-v1`
  (Part 8's store): never in localStorage, a URL, a log, an export, a backup or sync. Removed by Disconnect, sign-out
  and erase. Spotify has no endpoint to revoke a PKCE token: Disconnect removes it here, and the person removes
  ZIGoals' access on Spotify's account page → Manage apps (the app says so). Nothing about the music is stored.
- **What leaves the device:** requests from the browser to `accounts.spotify.com` (code exchange, refresh) and
  `api.spotify.com` (the player), and artwork from `i.scdn.co`, only after the person connects. The app's content
  policy allows exactly these on `/app` pages (ADR-015 S125); site pages are unchanged. The Showcase sends none.
- **Spotify's design rules:** Spotify content is shown with Spotify's logo and a link back to Spotify; artwork is never
  cropped or reshaped. ZIGoals ships no copy of the logo (step 4): until the file is there, a connected Spotify shows
  only "Open Spotify". Each item links back to its own `open.spotify.com` page ("Open Spotify ↗").

## What a listener needs
- Spotify Premium to control playback (Spotify's player endpoints refuse other accounts; the app explains the refusal).
- Spotify open on a phone, computer or speaker (an active device), or a device chosen under More controls.
- While the app is in development mode: to be on the owner's user list (step 2).
- On an iPhone, the installed ZIGoals app opens Spotify's sign-in outside the app; connect from Safari instead.

## Turning Spotify on (owner only; your accounts, your decision)
Read the current [Developer Terms](https://developer.spotify.com/terms), [Developer Policy](https://developer.spotify.com/policy)
and [design guidelines](https://developer.spotify.com/documentation/design) first; they change. As read on 2026-10-07:
a new app starts in **development mode** ([quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)):
at most five Spotify users, each added by the owner, and the app owner's own account needs Premium. Extended quota is for
established businesses with a large audience (a ZIGoals Alpha does not qualify). Streaming must stay non-commercial.

1. **Create the app** in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) with the Web API
   selected. Name and description your choice; no logo or brand of Spotify's in the name.
2. **Users:** under User Management, add each person (name and the e-mail of their Spotify account) who may connect
   while in development mode, up to five.
3. **Redirect URIs** ([rules](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)): add each
   origin's address exactly, with no query:
   - `https://<the Alpha origin>/app/music/spotify`
   - `https://<the Alpha Worker>.workers.dev/app/music/spotify` (only if you use that fallback address)
   - the acceptance app's `https://<acceptance origin>/app/music/spotify`
   - for local runs, `http://127.0.0.1:3100/app/music/spotify` (and `:3101` if you use it). Spotify refuses
     `localhost`; plain `http` only for a loopback address.
4. **The client id** (32 hexadecimal characters; public by design) goes to the app Worker as the secret
   **`SPOTIFY_CLIENT_ID`** (a secret, so later deploys keep it). It is read at request time, so no build follows. As at
   Stage 7 ([PUSH_ACTIVATION.md](../run11/PUSH_ACTIVATION.md) §5), `wrangler secret put` uploads to Cloudflare, so it
   belongs to an approved release: first the private acceptance app, typed at the prompt, from the checkout root,
   ```sh
   APP_CONFIG="$PWD/apps/web/wrangler.run11.acctest.owner.jsonc"
   pnpm --filter @zigoals/web exec wrangler secret put SPOTIFY_CLIENT_ID --config "$APP_CONFIG"
   ```
   then the public Alpha through its own release procedure (docs/deployment/MANUAL_ALPHA_WORKFLOW.md). Never set or
   store the client secret anywhere; PKCE does not use it. Locally:
   `SPOTIFY_CLIENT_ID=<id> NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev`. `/api/music-config` then answers the id
   (no-store); a value that is not 32 hexadecimal characters is ignored.
5. **Spotify's logo:** download the official logo from Spotify's design guidelines and add it, in a pull request
   reviewed like any other change, as `apps/web/public/brand/spotify/logo.svg` (green or white on dark, as the
   guidelines allow on ZIGoals' navy). Until it is there, tracks stay in Spotify.
6. **Check** (with an allowlisted Premium account): Settings → Music says "Not connected" and offers Connect; connect,
   return to the page you were on; open the player → Spotify shows what plays with the logo and artwork; pause, next,
   choose another device; Disconnect, then connect again.

## Turning it off, and rolling back
- Remove the secret (`wrangler secret delete SPOTIFY_CLIENT_ID` with the same config): the app says "not set up"
  again at once, makes no Spotify request, and connected people keep only a sealed token that nothing uses (it
  goes with Disconnect, sign-out or erase).
- Hide the player for yourself under Your pages & buttons; every person decides for themselves.
- Rolling the build back past Session W removes the player; the sealed tokens stay unused in IndexedDB until erase.

## Evidence (all local, all MOCK)
- `apps/web/lib/music/spotify/spotify.test.ts`: the PKCE visit, the one-time answer and its refusals, the token
  exchange and refresh (rotation, `invalid_grant`), the player's requests and every answer above, the sealed session.
- `apps/web/tests/music.spec.ts` (desktop and phone): hidden by default and shown from Settings, opposite ZIGi; focus
  sounds; "not set up"; the full MOCK Spotify connection with the sign-in never in storage, the logo rule, the 403 words;
  the mini-bar and the More sheet; the Showcase sending nothing.
- `apps/web/lib/csp-compose.test.ts`, `apps/web/lib/public-safety.test.ts`: the exact `/app` policy with Spotify's
  origins.

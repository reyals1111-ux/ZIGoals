# Chess, the first skill (Session W Part 14)

Chess follows the person's play on chess.com and Lichess by username: ratings and their history, recent games, results
by colour and time control, rating goals, a habit that chess ticks off, and the sites' own daily puzzle and TV. The
page is `/app/chess` (its own chunk; hidden by default for existing people, shown in the Showcase and when picked in the
welcome or under Settings → Your pages & buttons). Everything shown is the sites' own data; nothing is estimated.

## Sources (read 2026-10-07)

| Source | What ZIGoals uses | Documentation |
|---|---|---|
| chess.com Published-Data API | `GET https://api.chess.com/pub/player/{username}/stats` (each time class's `last.rating`/`last.date`), `/games/archives` (monthly archive addresses), the newest `/games/{YYYY}/{MM}` (games: `url`, `uuid`, `end_time`, `time_class`, `rules`, `rated`, `time_control`, `eco`, `white`/`black` `username`/`rating`/`result`) | https://www.chess.com/news/view/published-data-api |
| Lichess API | `GET https://lichess.org/api/user/{username}` (`perfs.*.rating`/`games`; `disabled`/`tosViolation`), `/api/user/{username}/rating-history` (`[year, month from 0, day, rating]`), `/api/games/user/{username}?max=50&moves=false&tags=false&opening=true` as NDJSON (`id`, `variant`, `speed`, `status`, `winner`, `lastMoveAt`, `players`, `opening.name`, `clock`) | https://lichess.org/api and https://github.com/lichess-org/api (OpenAPI files) |
| chess.com daily puzzle | the official page in a frame, `https://www.chess.com/daily_puzzle`, with the visible credit link chess.com requires | Published-Data API, "Daily Puzzle" |
| Lichess embeds | `https://lichess.org/training/frame` (puzzle) and `https://lichess.org/tv/frame` (TV), theme `blue`, background `dark` | https://lichess.org/developers |

Header-only checks from the build machine, 2026-10-07 (no account, no personal data): both APIs answer
`Access-Control-Allow-Origin: *`; chess.com sends a weak `ETag`, `Last-Modified` and `Cache-Control: public, max-age=5`
on stats, and its preflight allows only the `Origin` header, so ZIGoals never sets `If-None-Match` itself: each request
uses `cache: 'no-cache'` and the browser revalidates with the stored ETag on its own (a 304 costs nothing). Lichess
allows `Accept`, which is a CORS-safelisted header anyway. The frame addresses answered 200 without
`X-Frame-Options`; a site may still refuse a frame in a browser (for example without a referrer, which ZIGoals never
sends), so each frame has "Pop out" and a plain link.

## Rules this build follows

- **One request at a time per site** (chess.com: "If you always wait to receive the response to your previous request
  before making your next request, then you should never encounter rate limiting"; Lichess: "Only make one request at a
  time"). A refresh asks chess.com (stats, archives, the newest month) and then Lichess (account, history, games), each
  one after the previous answer.
- **429**: the site is paused for 60 seconds (Lichess: "waiting one minute before retrying will be sufficient"); nothing
  is retried by itself; the page says how long is left.
- **When**: on opening the Chess page when the last answer is older than an hour, on Today's chess card when older than
  six hours, and on Refresh. Never in the background, never in the Showcase (its sample is fictional and asks no site).
- **What leaves the device**: the username, in the address of the site it belongs to; no cookie (`credentials: 'omit'`),
  no referrer (`referrerPolicy: 'no-referrer'`), no other header than `Accept`.
- **Kept**: the usernames, rating goals, the chess habit and its day markers in settings v3 `chess` (synced with
  Today's settings); ratings over time, the newest 200 games and when each site last answered in the device cache
  `zigoals:chess-cache:v1` (public data, never synced). Removing or changing a username forgets what that site said.
- **Standard chess only**; a Lichess rating with no games played (the site's starting value) is not shown; a chess.com
  result is a draw for `agreed`, `repetition`, `stalemate`, `insufficient`, `50move` and `timevsinsufficient`, a win for
  `win`, otherwise a loss; a Lichess game without a winner that finished is a draw; aborted games are left out.
- **Brand**: no chess.com or Lichess board, pieces, colours, sounds or glyphs are copied; the page uses ZIGoals' own
  type and colours, and the sites' content appears only inside their own frames, with credit.
- **Frames** load only on a tap, with `sandbox="allow-scripts allow-same-origin allow-popups
  allow-popups-to-escape-sandbox"` (no top navigation), `allow=""`, a title and `referrerpolicy="no-referrer"`; CSP
  `frame-src` on `/app` documents names exactly `https://www.chess.com/daily_puzzle`, `https://lichess.org/training/frame`,
  `https://lichess.org/tv/` and `https://lichess.org/embed/game/`. chess.com's play pages refuse framing, so "Play"
  opens the site in a window of its own (`noopener,noreferrer`).

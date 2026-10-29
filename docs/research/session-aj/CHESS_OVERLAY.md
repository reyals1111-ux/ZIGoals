# Playable chess in the desktop browser (Session AJ, item 31): research

Research only, written 2026-10-29. No code, dependency or policy changed. "Checked" means a request or file read from
the build sandbox on 2026-10-29. **Unverified** marks claims from secondary sources or from memory that could not be
re-fetched today. Nothing here is legal advice; the licence notes say what the texts say and where the owner has to
decide.

## What exists today

`/app/chess` (`apps/web/app/app/chess/page.tsx` → `components/chess/chess-view.tsx`; product notes in
`docs/product/CHESS.md`) is a **read-only** follow page. It shows:

- ratings, rating history and recent games from the chess.com Published-Data API and the Lichess API, by username
  only, one request at a time per site, with a 60 s pause after a 429 (`lib/skills/chess/api.ts`);
- rating goals and a chess habit;
- the sites' own daily puzzle and TV in sandboxed, tap-to-load frames (`chess-frames.tsx`;
  `frame-src` names exactly `https://www.chess.com/daily_puzzle`, `https://lichess.org/training/frame`,
  `https://lichess.org/tv/` and `https://lichess.org/embed/game/`);
- "Play on chess.com / Play on Lichess" buttons that open the sites in their own window.

There is no board, no move logic, no engine and no account sign-in. Relevant platform facts:

- **Licence:** the repository's `LICENSE` is Apache-2.0.
- **Dependencies:** `apps/web/package.json` has no chess library. Adding one (runtime, dev or Action) needs
  **owner approval** (CLAUDE.md, Hard rules).
- **Headers:** `next.config.ts` sends `Cross-Origin-Opener-Policy: same-origin` but **no**
  `Cross-Origin-Embedder-Policy`, so pages are not cross-origin isolated and `SharedArrayBuffer` is unavailable.
- **CSP:** `lib/csp-compose.mjs` builds `script-src 'self' 'nonce-…' 'strict-dynamic'` (plus `'unsafe-eval'` in
  development only) and `worker-src 'self'`. It has no `'wasm-unsafe-eval'`. In CSP Level 3 browsers, a document whose
  CSP lacks that source (or `'unsafe-eval'`) cannot compile WebAssembly. A same-origin Web Worker may have its own policy
  depending on how its script is served. How Cloudflare serves a static `.js` here (with or without a CSP header) is
  **unverified** and would need a browser test.
- **Egress policy:** `lib/egress-policy.json` already lets `/app` documents connect to `https://lichess.org` and
  `https://api.chess.com`.

## Option A: an in-app board with a WebAssembly engine (Stockfish)

**Package:** `stockfish` on npm, version **19.0.1**, published 2026-10-10, licence `GPL-3.0`, 205 MB unpacked
(checked: <https://registry.npmjs.org/stockfish/latest>). It ships unmodified Stockfish 19 compiled by nmrugg
(<https://github.com/nmrugg/stockfish.js>). The README (checked) lists these builds:

| Build | js + wasm | Threads | Needs cross-origin isolation |
|---|---|---|---|
| Full | ≈94 MB | yes | yes |
| Full, single-threaded | ≈94 MB | no | no |
| Lite | ≈1.6 MB | yes | yes |
| **Lite, single-threaded** | **≈1.7 MB** | no | **no** |
| ASM.js | ≈3 MB | no | no (slow, weak) |

The README recommends "the `lite single-threaded` engine because it is fast and does not require any complicated
setup … still far stronger than any human". The multi-threaded builds need both `COOP: same-origin` and
`COEP: require-corp`. The `.js` expects its `.wasm` next to it, served as `application/wasm`.

**Threads and COOP/COEP.** Turning on `COEP: require-corp` "block[s] loading of resources or iframes which haven't
opted into being loaded by cross-origin documents" (<https://web.dev/articles/coop-coep>, docs). That would break the
existing Lichess and chess.com frames, Spotify artwork (`i.scdn.co`) and any other cross-origin image or frame unless
each one sends CORP. `COEP: credentialless` avoids this, but web.dev's 2022 text says it is Chromium-only. Current
Safari support is **unverified**; it was not supported as of the last check from memory. Conclusion: **avoid threads**.
Use the lite single-threaded build, with no header change.

**Hosting.** Cloudflare Workers static assets allow **25 MiB per file**
(<https://developers.cloudflare.com/workers/platform/limits>, docs). The 94 MB full builds cannot be served as an app
asset at all. The lite build fits easily. Loading it only when the person opens "Play" keeps the route chunk small.

**Licence, GPLv3.** Stockfish is GPLv3, and so is the npm package ("licensed under GPL-3.0 because it contains the
engine"; the non-engine wrapper is MIT).

- **What the FSF says** (from memory, **unverified** today; gnu.org did not answer on 2026-10-29): the GPL FAQ treats
  programs that talk over "pipes, sockets and command-line arguments" as normally separate programs ("mere
  aggregation"), unless they exchange intimate internal data structures. Separately, Apache-2.0 code may be combined
  into a GPLv3 work, but not the other way round under Apache terms.
  (<https://www.gnu.org/licenses/gpl-faq.html#MereAggregation>, <https://www.gnu.org/licenses/license-list.html>.)
- **Practical reading:** ship the **unmodified** engine as its own files, run it in a dedicated Web Worker, and talk to
  it only through UCI text over `postMessage`. That is the same arm's-length, text-protocol pattern as a GUI talking to
  a UCI engine on a desktop, and it is the common way web apps use Stockfish.
- **Obligations when conveying object code** (GPLv3 §6, conveying over a network server is §6(d)): include the GPLv3
  text (`Copying.txt`) and offer the Corresponding Source "from the same place". A link to the exact nmrugg release tag
  plus the files served by ZIGoals is the usual approach, and keeping a copy of the source archive is safer.
- **What this does not change:** ZIGoals' own code stays Apache-2.0. This holds whether the app is open or closed,
  because the GPL attaches to the engine files, not to a separate program that sends them text. If ZIGoals ever
  **modified** or **statically linked** Stockfish into its own code, the combined work would have to be GPLv3. That is
  an owner decision; avoid it.
- **Cost:** €0. **Privacy:** excellent; everything runs on the device and no position leaves it.
- **Dependency:** a new runtime dependency, or a vendored binary, which is the same thing for the rule. It needs
  **owner approval**, plus a CSP change (`'wasm-unsafe-eval'` for the worker's context, tested) and a licence notice
  page (the app already has `/licenses/barcode-scanner.txt` as a precedent).

## Board UI libraries

Sizes were checked from unpkg on 2026-10-29; gzip -9 was run on the published file.

| Library | Version | Licence | Size | Notes |
|---|---|---|---|---|
| **chess.js** (rules, FEN/PGN, legal moves) | 1.4.0 | **BSD-2-Clause** | `dist/esm/chess.js` 107 kB raw / ~24 kB gz (unminified); no dependencies | No UI. Permissive; fine with Apache-2.0 (keep its notice). |
| **@lichess-org/chessground** (Lichess's board) | 10.5.0 | **GPL-3.0-or-later** | `chessground.min.js` 33 kB raw / ~12 kB gz | Best UX, but it is a library linked into the client bundle, so the shipped bundle becomes a GPL combined work. Not compatible with keeping ZIGoals' client Apache-only. **Avoid** unless the owner accepts GPL for the shipped client. |
| **react-chessboard** | 5.12.1 | **MIT** | `dist/index.esm.js` 186 kB raw / ~39 kB gz, plus deps `@dnd-kit/core` and `@dnd-kit/modifiers` | Peers on React; brings two transitive dependencies. |
| **cm-chessboard** | 8.15.4 | MIT | core file ~8 kB raw (SVG sprite and extensions extra) | An SVG board with no dependencies; an alternative. |

Licence sources are each package's registry `latest` record (<https://registry.npmjs.org/>, checked).

**The no-dependency alternative.** A small SVG board written in house (64 squares, click-to-move plus keyboard
support, pieces drawn by ZIGoals and not copied from chess.com or Lichess, as `docs/product/CHESS.md` already
requires) needs no library. Without chess.js the app still needs rules for legal-move highlighting, check, mate and
draws. Those are about 500–800 lines to write and test (an **estimate**). If play goes through Lichess (Option B),
Lichess's server validates every move, and the client only needs to apply moves to draw the position. That is far
less code: castling, en passant and promotion handling only.

## Option B: Lichess Board API with OAuth PKCE from the browser

Checked against Lichess's OpenAPI source (<https://github.com/lichess-org/api>, `doc/specs/lichess-api.yaml`, fetched
2026-10-29) and live headers.

- **OAuth:** "Lichess supports unregistered and public clients (no client authentication, choose any unique client
  id). The only accepted code challenge method is `S256`. Access tokens are long-lived (expect one year), unless they
  are revoked. Refresh tokens are not supported." The authorise URL is `https://lichess.org/oauth` and the token URL is
  `https://lichess.org/api/token`. No client secret and no ZIGoals server are needed. That fits the existing Spotify
  PKCE precedent (`docs/product/MUSIC_ACTIVATION.md`).
- **Scopes:** `board:play` ("Play with the Board API"). `challenge:write` is also needed to create challenges. The
  `POST /api/challenge/ai` (play the Lichess AI, levels 1–8) security block lists `challenge:write`, `bot:play` and
  `board:play`. Whether all of those or any one of them is required should be tested; **unverified**.
- **CORS:** checked. The preflight for `POST /api/board/game/{id}/move/{move}` returns
  `access-control-allow-origin: *` and `access-control-allow-headers: Origin, Authorization, …`, so browser calls with a
  bearer token work.
- **Features:** an event stream (`GET /api/stream/event`), a game stream (`GET /api/board/game/stream/{id}`, NDJSON),
  moves (`POST …/move/{uci}`), seeks (`POST /api/board/seek`), challenges, resign, abort and chat.
- **Restrictions:** "Engine assistance, or any kind of outside help, is forbidden". "Time controls: Rapid, Classical and
  Correspondence only. For direct challenges, games vs AI, and bulk pairing, Blitz is also possible."
- **Rate limits:** "Only make one request at a time … waiting one minute before retrying will be sufficient, but some
  limits may require longer." A Board game inherently keeps two streams open (events and game) and posts moves. That
  is Lichess's documented design, but ZIGoals' existing one-at-a-time queue (`api.ts`) would need a separate path for
  play.
- **Terms:** Lichess ToS (last modified 2026-08-01, <https://lichess.org/terms-of-service>, docs) allows use "for your
  own personal or commercial use, such as in your own applications", "subject to reasonable caps", and lists "abuse of
  our APIs" as a violation.
- **Fair play:** <https://lichess.org/page/fair-play> prohibits "any program or browser extension that assists with
  playing moves" and "any external assistance … whilst a game … is ongoing". Engines are allowed in games against the
  Lichess AI.
- **No-auth extras:** `GET https://lichess.org/api/cloud-eval?fen=…` needs no auth (checked; it returned `depth:70`,
  `pvs:[{"moves":"e7e5 g1f3 …","cp":18}]` for 1.e4). The **opening explorer now requires OAuth**: checked,
  `explorer.lichess.org/lichess` returned **401**, and the spec marks it `OAuth2`. It would also need a new
  `connect-src` entry.
- **Cost:** €0.
- **Privacy:** the token (play rights on the person's account for about a year) must stay on the device only and
  never sync. Offer "Disconnect", which revokes with `DELETE /api/token`. Moves and games are public on Lichess anyway.
  No ZIGoals server is involved.
- **Dependencies:** none needed if the board is written in house and Lichess validates moves. `connect-src` already
  allows `https://lichess.org`. The OAuth redirect needs a callback route, and the authorise page is a top-level
  navigation, not a fetch.

## Option C: chess.com

The Published-Data API is "a read-only REST API". "You cannot send game-moves or other commands to Chess.com from this
system." Serial access is unlimited and parallel requests may get a 429 (<https://www.chess.com/news/view/published-data-api>,
updated 2026-04-22, docs). Chess.com has no public play API. Its User Agreement forbids "automation software (bots),
hacks, modifications (mods) or any other unauthorized third-party software" and accessing the service "by any means
other than through the interface that is provided by Chess.com". Section 4(D) bars using automated or AI tools to
access or scrape the site to "develop or enhance chess engines, training models, educational tools"
(<https://www.chess.com/legal/user-agreement>, docs).

**Conclusion:** chess.com stays read-only (what ZIGoals does today) plus "Play on chess.com" in its own window. Its
play pages refuse framing (`docs/product/CHESS.md`).

## Option D: a browser-extension overlay

**Feasibility.** A Manifest V3 extension with host permissions for `chess.com` and `lichess.org` could read the board
from the page and draw an overlay. Chrome Web Store review takes "a few days, but it can take up to a few weeks", and
can take longer for "broad host permissions or sensitive execution permissions"
(<https://developer.chrome.com/docs/webstore/review-process>, docs). Firefox and Safari each need their own listing.

**Rules.** Any overlay that helps **during a live game** is cheating on both sites: Lichess bans "any program or browser
extension that assists with playing moves", and chess.com bans unauthorised third-party software and mods. Accounts
get closed for this. A ZIGoals-branded extension that could show an engine line on a live board would put people's
accounts at risk, and could get the extension removed. Only a post-game or analysis-only overlay would be defensible,
and even then chess.com's "not modify the Content" and "only through the interface" clauses are a risk.

**Privacy.** An extension with site access sees everything on those pages (the account, messages, history). That is
far more than ZIGoals reads today, which is a public username only.

**Cost:** a developer account (the fee was not checked) and a separate codebase, release process and review. This is
a large new surface for a private-by-design app. **Not recommended.**

## Option E: AI coaching

- **Engine-explained moves (honest).** The engine gives facts: an evaluation in centipawns or mate, a best line, and
  the evaluation drop of the move played. Code can turn those into plain text, for example "This move lost about 1.8
  pawns; the engine preferred Nf3, which keeps the knight defending e5". Every number is measured, not guessed. The
  sources would be local Stockfish lite (Option A) or Lichess cloud-eval for common positions (no auth; only positions
  already in Lichess's cache). Offer this only **after** a game, or in games against the engine, never during a live
  rated game (fair-play rules above).
- **LLM (ZIGi) explanations.** Language models are unreliable at board state:
  - In SPIN-Bench (arXiv 2503.12349, March 2025), even with the legal moves supplied each turn, illegal-move shares
    ranged from about 2–3 % (GPT-4o, Claude 3.5 Haiku) to about 63 % (Mistral).
  - LLM CHESS (arXiv 2512.01992, December 2025) reports models choosing moves absent from a legal-move list they were
    given.
  - A 2025 stability study (arXiv 2512.15033) found models evaluating impossible positions.

  If ZIGi explains anything, it should only **paraphrase engine output given to it as data** (the FEN, the best line
  and the evaluation, all checked by the rules code), say so ("From Stockfish's analysis: …"), and never invent moves
  or evaluations. Any move the model mentions should be validated as legal before it is shown. Cost: whatever the
  person's chosen AI provider charges (ZIGoals' existing bring-your-own-key model). Privacy: the position is sent to
  that provider, so ask first, as other ZIGi features do.

## Recommendation

1. **Now, with no dependency: do nothing new beyond what exists.** The read-only page, the frames and "Play on
   Lichess / chess.com" in a new window are already the safest playable path.
2. **First real step, still no new dependency: "Play on Lichess inside ZIGoals" through the Board API with browser
   PKCE.**
   - No client registration and no ZIGoals server; the token stays on the device only, about a year, with a
     Disconnect button that revokes it.
   - Scopes `board:play` and `challenge:write`. Start with **games against the Lichess AI** (levels 1–8, blitz
     allowed) and direct challenges. Public seeks only for rapid, classical and correspondence.
   - An in-house SVG board, where Lichess validates moves; ZIGoals' own pieces and colours.
   - Streams on a path separate from the follow page's one-at-a-time queue; a 60 s pause on 429.
   - No engine or hints during any game.
3. **Second step, owner approval needed: post-game analysis with Stockfish 19 lite single-threaded (≈1.7 MB).**
   - Vendored unmodified in a dedicated Web Worker, loaded on demand, with the GPLv3 text and a source link on a
     licences page.
   - No COEP change; a tested CSP change for WebAssembly.
   - If the owner also approves a rules library, choose **chess.js (BSD-2-Clause)** over writing rules by hand. Avoid
     **chessground (GPL)**. If a board library is wanted at all, use react-chessboard (MIT, +2 deps) or cm-chessboard
     (MIT, no deps).
4. **Coaching:** engine facts first. ZIGi may only paraphrase engine output given to it, label it as such, and is
   never used during live games.
5. **Do not build:** a browser-extension overlay (fair-play bans, store review, privacy cost), anything that plays on
   chess.com (no API; ToS), multi-threaded or full Stockfish (COEP breakage; 94 MB exceeds the 25 MiB asset limit), or
   the opening explorer without the person's OAuth token.

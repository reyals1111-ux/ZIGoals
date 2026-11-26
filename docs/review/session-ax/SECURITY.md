# Session AX review (a): security and privacy

Reviewer (a), one role: security and privacy. Read-only: nothing in the repository was changed apart from this file.
Branch `feature/session-ax-pro-review` at `88eab635`. The browser runs used the production build served at
http://127.0.0.1:3101 (`NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED`, `x-zigoals-build: 36bd987f…`, which is main;
the branch adds only docs). Every outside request was aborted in the browser and logged, so nothing left the sandbox.
I read first: the shared brief, `docs/review/session-aw/PRIVACY_AUDIT.md`, `docs/security/THREAT_MODEL.md`, and the AW
VERDICTS. Nothing that AW already gave a verdict is repeated here unless it is still broken. AW's B1–B14 are fixed:
the landing page now covers Spotify, Chess, Polkachu and DefiLlama, transcription, Read aloud, recipe files, Supabase and
USDA, and is dated 25 November. B1 (online voices) was fixed by `4509a812`.

Scripts and raw output (scratchpad, not in the repo):
`/tmp/claude-0/-home-user-ZIGoals/36cbfca7-41ba-5a71-8bb6-840d442bd29a/scratchpad/security/`
- `sweep.js` + `common.js`: every route under a condition, with payload injection, DOM scan and request log.
- `flows.js`, `flows3.js`: share target, Help, ZIGi, NOVA, the notes, journal and tasks importers, note export, calculator.
- `vt/proto.test.ts`: payloads and `__proto__` / `constructor` keys through every importer parser and the restore merge.
- `files/`: the hostile files (`evil.zip`, `many.zip`, `payload.md`, `Journal.json`, `trello.json`, `camt.xml`, `run.gpx`).

**How a route is judged.** An init script replaces `alert`, `confirm` and `prompt` with recorders and listens for
`securitypolicyviolation` (CSP and Trusted Types). After each page settles, a scan flags:
- any element with an `on*` attribute;
- any `href`, `src`, `action`, `formaction`, `data` or `xlink:href` that starts with `javascript:`, `vbscript:` or
  `data:text/html`;
- any inline script without the nonce, any script from outside `/_next/` and `/theme-boot.js`;
- any `iframe`, any `img[src=x]`, any `<style>` holding the marker.

The request log flags any URL with the marker `ZXQ` or `onerror`, and any host other than the app's.

**Payloads.** "Poisoned" means that after the profile is loaded, every free-text field in its storage is prefixed with a
payload, then each route is visited. Fields count as free text by key: `text`, `body`, `comment(s)`, `note(s)`,
`description`, `content`, `markdown`, `answer`, `reflection`, `why`, `details`, `summary`; and, in a shorter form,
`title`, `name`, `label`, `what`, `place`, `merchant`, `payee`, `tag`, `category`, `word`, `question`, `goal`, `habit`,
`reason`, `memo`.
- Long payload: `ZXQ <img src=x onerror=alert(1)> <svg onload=alert(2)></svg> [j](javascript:alert(3))
  <a href="javascript:alert(4)">a</a> <style>*{display:none}</style> [d](data:text/html,<script>alert(5)</script>)
  <script>alert(6)</script> <iframe src="javascript:alert(7)"></iframe> javascript:alert(8)`.
- Short payload: `ZXQ<img src=x onerror=alert(1)>`.

## 1. Coverage

Routes: all 47 static routes in the brief, plus the dynamic routes with real ids.
- Showcase: `/app/goals/average/showcase-create` and `/app/wealth/asset/coingecko:coin:bitcoin`, both found from the
  page links.
- Heavy profile: `/app/goals/7001`, `/app/goals/tracked/7002`, `/app/goals/average/hp-avg-sleep`,
  `/app/wealth/asset/hp-btc` and `/app/portfolio/coin/bitcoin?portfolio=hp-portfolio`.

Themes: none of the checks in this role depend on the theme. The CSP, the escaping, the URLs and the requests are the same
in every theme. So the sweeps ran in the default theme (Nebula), and Light, Dark and the other themes were not run
separately.

| Condition | 1440 wide | 390 wide | Result |
|---|---|---|---|
| Empty profile, all routes | checked (48 routes) | checked (48 routes): the same result | 0 injected elements, 0 CSP/TT violations, 0 outside requests, 0 page errors |
| Showcase, poisoned (780 fields), all routes | checked (49 routes) | checked (49 routes): the same result | payload shown as text on 20 routes (e.g. /app/agenda 30×, /app/health 22×, /app/journal 20×); 0 injected elements, 0 violations, 0 outside requests, 0 marker in any URL or console line |
| Heavy profile, poisoned, all routes + 5 dynamic | checked (54 routes, 1,147 fields poisoned, capped at 150 per key to fit the storage quota) | checked (54 routes) | payload shown as text on 18 routes (e.g. /app/agenda 112×, /app/journal 150×, /app/portfolio/coin/bitcoin 23×); 0 injected elements, 0 violations, 0 outside requests, 0 page errors |
| Share target (`/app/share`) with a payload title, text and a `javascript:` / quote-breaking URL | checked | not run (same component) | text only; no link made for either URL; the address bar is cleared (`/app/share`) |
| Help search with a payload | checked | not run | no injection; the query never enters the URL |
| ZIGi and NOVA (local answers) with payload messages | checked in full Chromium | not run | checked in full Chromium_RESULT |
| Notes import: `payload.md` (front matter `__proto__`, callout, table, ticks, `[[javascript:…]]`) | checked | not run | checked_RESULT |
| Notes import: `evil.zip` (`../`, `/abs`, `C:/`, `.hidden`, a symlink entry, a 50 MB bomb) and `many.zip` (2,500 entries) | checked | — | the unsafe names are skipped; the bomb is refused ("1 skipped"); the 2,500-entry ZIP is refused: "This ZIP holds more than 2000 entries. Choose a smaller one."; `({}).polluted` is still undefined |
| Journal import: Day One `Journal.json` with `__proto__` and payload text, tags and place | checked | — | 3 entries' worth of payload shown as text; 0 violations; no pollution |
| Tasks import: Trello JSON with `__proto__`, payload names, descriptions, labels and comments | parser level only (the browser step did not reach the file input in time; a rerun was queued) | — | parser level only (the browser step did not reach the file input in time; a rerun was queued)_RESULT |
| Note export (.html) with the payload, then the file opened | checked | — | checked_RESULT |
| Every importer parser in Node (Day One, Journey, Apple Journal HTML, text, Trello, Asana, Todoist, CAMT.053 incl. a DTD/XXE file, OFX, MT940, HabitBull, GPX, notes front matter, restore `mergeKeep` / `planParts`) | checked (vitest, 10/10) | — | no `Object.prototype` / `Array.prototype` pollution; the DTD file is refused ("declares a document type … Nothing was read"); Apple Journal HTML is reduced to words (`<script>` and `<img>` gone); `safeHref` refuses `javascript:` in any case, ` javascript:`, `data:`, `vbscript:`, `http:`, credentials, and a quote-breaking URL |
| CSP, frame-ancestors, referrer and permissions headers | checked: response headers of `next start` (the same `middleware.ts` and `next.config.ts` the Worker runs); `public/_headers` and `landing/_headers` read | — | see §4 |
| Service worker | read (`public/sw.js`, `public/push-sw.js`) | — | see §4 |
| `pnpm audit --prod` | ran (network allowed) | — | "No known vulnerabilities found" |
| `node scripts/check-secrets.mjs` | ran | — | "Tracked-file credential pattern check passed (0 allowlisted test values)" |

Not checked, and why:
- **The built Worker's headers.** There is no `.open-next/` build in the checkout, and building is the integrator's job.
  `wrangler.run11.local.jsonc` would serve one. The headers were read from `next start`, which runs the same middleware.
  The Worker adds only `lib/static-miss.mjs`, a plain-text 404 for a missing `/_next/static` file.
- **Real AI provider replies.** No key and no network. Instead I read the renderer (`components/ai/safe-text.tsx`, the
  parsed tree from `lib/ai/safe-render.ts`). The repo's mock-stream corpus covers this.
- **Enex, Bear, HabitBull and Tickmate in the browser.** Checked at parser level only.
- **Bank and GPX importers in the browser.** Parser level only. Their output strings are rendered by React as text, and
  the poisoned sweeps cover the pages they write to (Wealth and Health).

## 2. Findings

| Id | Finding | Severity | Evidence | Suggested fix |
|---|---|---|---|---|
| SEC-1 | **Money amounts, goal names and shared or typed words travel to ZIGoals' server in page addresses.** Several in-app links carry personal values in the query string. Next fetches the page data for each one from the server with that same query (`?…&_rsc=`), and a plain `<a>` link loads the whole document. So the values reach the app host and Cloudflare in the request line. The app already fixed this once for the Wealth total ("in the query it went to the server with Next's prefetch and the page request", `components/platform/wealth-view.tsx:201`, CI 1539), but the same thing happens on these links: (a) the calculator's "Turn this into a goal" (`components/calculator/calculator.tsx:163`) puts `name=Grow to $417,098.45&target=417098.45&contribution=200&date=…` in the address. That figure can come straight from the person's real holdings, because Wealth hands its total to the calculator in the hash. (b) The contribution autopilot's "Fill in {amount}" (`lib/allocation/autopilot.ts:27-30`, `components/wealth/allocation/contribution-autopilot.tsx:32`) uses `?contribute=1&amount=<base units>` on a plain `<a>`. (c) ZIGi's "new goal" action (`lib/ai/actions/plan.ts:886`) puts `?from=ask&name=<the goal name from the chat>` in the address. (d) Share → "Make it a goal" (`components/share/share-inbox.tsx:33`) puts `?from=share&name=<shared words>` in the address. The share target itself is a GET by design (ADR-021), but this sends the words a second time. The privacy page says plans stay on the device; a request line is not covered by "nothing of yours". | Major | Production build at 1440, empty profile. In the calculator, enter 123456 as the starting amount, then press "Turn this into a goal". The request log shows two `GET /app/goals/new?from=calculator&name=Grow+to+$417,098.45&target=417098.45&currency=USD&date=2046-11-26&contribution=200&every=monthly&_rsc=…`. From `/app/share?title=ZXQ t`, "Make it a goal" sent `GET /app/goals/new?from=share&name=ZXQ+t&_rsc=…` (flows-log.txt) | Use the app's own pattern from the Wealth fix: put the values in the fragment (`#target=…&name=…`) and read them on the page (as `calculator.tsx` `wealthPrefill` and `goal-intelligence.tsx` `takeAmountParam` already do), or hand them over in sessionStorage. Add the calculator, autopilot, ZIGi and share links to the "leaks nothing" browser check |
| SEC-2 | **Two importers read a whole file into memory before the size check.** (a) Journal → "import and export" reads a ZIP with `f.arrayBuffer()` (`components/journal/journal-files.tsx:36`); the 80 MB cap (`:27`) is checked only inside `readZip`, after the read. A Day One export with photos is often several GB, so a person who picks it gets a long stall or a tab crash on a phone instead of the clear "over 80 MB" line. Notes does this right: it checks `f.size` before reading (`lib/notes/read-files.ts:18`). (b) Portfolio "Import from a file" reads `file.text()`, then checks `text.length > IMPORT_LIMIT` (`components/portfolio/portfolio-view.tsx:230`, `lib/portfolio/store.ts:59`). Every other importer checks `file.size` first (tasks-io:24, calendar-import:28, category-file:33, bank-file-import:41 …). | Minor | Code read | Check `f.size > CAPS.maxArchive` (journal) and `file.size > IMPORT_LIMIT` (portfolio) before reading, with the same plain sentence |
| SEC-3 | **A notes ZIP drops unsafe or hidden entries without saying so.** `../escape.md`, `/abs.md`, `C:/win.md`, `.hidden.md` and `__MACOSX` entries are skipped silently (`lib/notes/zip-read.ts:63-70`, `if (!name …) continue`). The plan reads "2 new notes, 1 skipped" and lists only the bomb. A symlink entry is read as a note whose body is the link text (`/etc/passwd`). That is harmless (no file system), but it is an odd note. | Minor | `evil.zip` at 1440, empty profile: plan "2 new notes, 1 skipped" (flows-log.txt) | Count the refused names in the skipped list ("3 files with a path outside the archive were left out") and skip entries whose external attributes mark a symlink |
| SEC-4 | **Food search words go in a GET query.** Online food search sends `/api/food-lookup?q=<words>&lang=` (`components/health/barcode-food-lookup.tsx:101`; `app/api/food-lookup/route.ts:43`). It is disclosed, and the upstream FSVO API is a GET, but request lines are what CDN logs keep. | Minor | Code read | POST the words to the app's own route (the Worker can keep its GET upstream) |
| SEC-5 | **The security docs describe a Bluetooth policy that no longer exists.** `THREAT_MODEL.md:199` says "`bluetooth=(self)` only on `/app/health` (`bluetooth=()` everywhere else)". The served Permissions-Policy has no `bluetooth` token at all, because it was removed on purpose (`lib/bluetooth/web-bluetooth.ts:7`, AL TK-191). `lib/csp-compose.mjs:89` still says "the camera and Bluetooth only on Health … the rest denied", but only camera, microphone and geolocation are named. The landing page denies more than the app does (it also denies accelerometer, display-capture, gyroscope, magnetometer, payment and usb). | Minor | `curl -D - /app`: `Permissions-Policy: camera=(), microphone=(self), geolocation=()` | Correct the threat-model row and the comment. Optionally deny the unused features on app pages as the landing page does (`payment=(), usb=(), display-capture=()`), leaving `screen-wake-lock`, which Cook, Meditation and Sleep use |

## 3. What holds (with evidence)

- **No HTML sink anywhere.** A grep of `apps/web` for `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`,
  `insertAdjacentHTML`, `DOMParser`, `srcdoc`, `document.write`, `eval(` and `new Function` outside tests finds only
  comments and a test helper. XML is read by `lib/workouts/mini-xml.ts` and `lib/import/xml-scan.ts`, never by
  `DOMParser`.
- **Trusted Types are enforced in production.** `require-trusted-types-for 'script'; trusted-types default`. The default
  policy (`lib/trusted-types.ts`) trusts only script URLs under `/_next/static/`, `/push-sw.js` and `/sw.js?v=`, and never
  an HTML string. So even a future `innerHTML` with a string would throw.
- **Notes, journal, ZIGi and NOVA Markdown come from one parsed tree.** The parser is `lib/ai/safe-render.ts` and the
  renderers are `components/notes/note-render.tsx` and `components/ai/safe-text.tsx`.
  - Links are made only for `https:` URLs with no credentials. `safeHref` was checked against 10 hostile forms (§1).
  - `[[links]]` resolve only to the app's own note, goal and habit pages.
  - A task's place becomes a link only for `^https?://\S+$` (`components/tasks/task-parts.tsx:167`).
  - The share target makes a link only for `^https?://\S+$`.
- **Exports escape everything.**
  - `xml()` escapes `& < > " '` and drops XML-illegal characters and lone surrogates (`lib/notes/note-files.ts:18`). It
    is used by the note HTML and Word exports and the journal e-book and Word file.
  - The grocery print page has its own `escapeHtml`.
  - CSV writers use `csvSafeCell` (THREAT_MODEL row D3).
  - Export everything is a fixed allow-list of keys (`lib/export/everything.ts`). Keys stay sealed in IndexedDB, and the
    Hermes record says "No key here".
- **Blobs never open as pages of this site.**
  - Task files open in the browser's viewer only for PDF, PNG, JPEG, WebP, GIF, AVIF, plain text, audio and video. Any
    other type, SVG and HTML included, is saved as a download (`lib/tasks/attachments.ts:48-55`).
  - Wealth documents are redrawn to a raster, or must be a PDF (`components/wealth/account-sheet.tsx:80`).
  - Journal media types are an enum (`lib/journal/media.ts:15-20`).
- **ZIP and XML limits hold.**
  - Notes, journal and recipe ZIPs: archive size, entry count, per-file and total caps, a compression-ratio cap, a shared
    inflate budget, overlap detection and a CRC check (`lib/notes/zip-read.ts`). In the browser, the 2,500-entry ZIP and
    the 50 MB bomb were both refused.
  - The import and restore streams stop at the declared size and check the CRC (`lib/import/zip-stream.ts`).
  - A ZIP entry name is never used as a file path (there is no file system), so `../` cannot escape anything.
  - A bank file with a DTD is refused.
- **Prototype pollution: none found.**
  - Zod 4.6.6 drops `__proto__` keys from records and loose objects (checked in Node).
  - The front matter blocks `__proto__`, `constructor` and `prototype`, and its data object has no prototype.
  - `mergeKeep` skips `UNSAFE` keys.
  - The only nested dynamic write in the code (`lib/vault/finance-homes.ts:78`) takes keys that a digits-only schema
    already checked (`lib/goals/milestone-dates.ts:12`).
  - Every importer tested in Node and in the browser left `Object.prototype` clean.
- **CSP, read from the live response of `/app`.**
  - `script-src 'self' 'nonce-…' 'strict-dynamic'`, with no `unsafe-eval` and no `unsafe-inline` for scripts. The only
    `unsafe-inline` is in `style-src`, for React style attributes.
  - `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, plus `X-Frame-Options: DENY`.
  - `frame-src` lists only the chess, Lichess and WalletConnect pages. `connect-src` is exactly `lib/egress-policy.json`,
    unchanged since AM-2.
  - `Referrer-Policy: no-referrer`, `COOP: same-origin`, `nosniff`, HSTS, `noindex`.
  - Each HTML response sends `Cache-Control: private, no-store`, and every `<script>` in it carries the nonce (§1 scan:
    no inline script without a nonce on any route).
  - The SVG policy is `default-src 'none'; … sandbox`.
  - The landing page's CSP is `'self'` only, with `form-action 'none'`.
- **Permissions are asked only after a tap.**
  - `Notification.requestPermission` runs from "Turn on" (`lib/notify/device.ts:57`, `lib/push/device.ts:84`, "From a
    tap").
  - `getUserMedia` runs on the press of the voice, journal voice-note, task voice-note and barcode buttons
    (`components/ai/voice-engine.ts:72-96`, `compose-media.tsx:35`, `task-attachments.tsx:58`,
    `barcode-food-lookup.tsx:59`).
  - `navigator.storage.persist` runs on the tap in Help and Settings. After a person's own save it runs once, only in
    browsers that never prompt (`lib/keep-data/persist-once.ts`, owner amendment 5 of ADR-045), never on view and never
    in the Showcase.
  - The backup folder asks for `requestPermission` only with `ask`. Bluetooth `requestDevice` needs a gesture anyway.
- **The service worker keeps no private data.**
  - It caches only same-origin GETs, never `/api/*`, only `200 basic` answers without `content-disposition`.
  - Pages are kept only with no query (other than `_rsc`), never `/app/share` or the Spotify callback, and never a
    prefetch.
  - Erase sends `zigoals:sw-forget`, which empties every `zigoals-` cache (`public/sw.js:322-344`).
  - Records live in storage, not in the HTML. A cached page replaying its own nonce offline was accepted in AK
    (`SESSION_AK_RM12.md` R1-I4).
- **Messages and redirects are safe.**
  - There is no cross-window `message` listener. The only listeners are the service worker's (same-origin clients only)
    and own workers and BroadcastChannels.
  - Return paths are allow-listed (`safeBack`: `/app…`, no `..`, never the callback itself, `lib/music/spotify/oauth.ts:23`).
  - `window.open` is used only for same-origin pages, the five AI apps' home pages (nothing in the address,
    `lib/ai/apps.ts`) and chess pop-ups with `noopener,noreferrer`.
- **Every network request matches the privacy pages.**
  - The browser can reach only `connect-src`, which is unchanged since AW's audit (whose 47-row inventory still holds).
  - No new outside host was added in the code since AW.
  - On every route, empty and Showcase, the browser asked for no outside host at all.
- **Nothing sensitive goes to the logs.** The one `console.*` in app code is a fixed sentence (`lib/vault/crypto.ts:33`).
  `workers/` has none, and no console line in any sweep carried the marker.

## 4. Score

**Score before: 8/10.** No Blocker. No script or HTML injection was possible on any route under empty, Showcase and heavy profiles with 780 to 1,147 poisoned fields, or through any importer, export, reply or the share target. The defences are layered (no HTML sinks, a parsed Markdown tree, a nonce CSP with Trusted Types enforced). ZIP, XML and prototype-pollution defences held against hostile files, and both scans are clean. Two points off for SEC-1: money amounts and typed or shared words reach the server in page addresses, the same class of leak the app already fixed once for the Wealth total. The rest are Minors (size checks before reading, silent ZIP skips, food words in a query, stale Bluetooth docs).

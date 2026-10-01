# Landing V4 — post-import QA

Every figure here was measured in this repository, against the imported bytes, after the import. Nothing is carried over from the standalone package's own report.

## How it was run

The page was served by the real Workers-Assets runtime, not a generic static server, so the checked bytes are the deployable bytes and `_headers` is applied the way Cloudflare applies it:

```sh
pnpm --filter @zigoals/web exec wrangler dev --config ../../landing/wrangler.jsonc --name zigoals --port 8788 --ip 127.0.0.1
```

Browser checks ran against `http://127.0.0.1:8788` in Chrome (the `chrome` channel, Playwright 1.63.0 driving it), Node 24.19.0, pnpm 11.19.0. **65 checks, 65 passed.**

## Repository checks

| command | result |
| --- | --- |
| `node scripts/doctor.mjs` | pass (Rust/Docker warnings only, irrelevant to the landing) |
| `pnpm check:deploy-configs` | pass |
| `WRANGLER_SEND_METRICS=false pnpm check:landing` | pass — Wrangler 4.144.0 read 225 entries (204 files + 21 directories) |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test` | 213 files passed, 8 skipped; 1987 tests passed, 12 skipped |
| `pnpm exec vitest run scripts/check-deployment-configs.test.ts` | 59 passed |
| `pnpm --filter @zigoals/web exec playwright test tests/landing.spec.ts --workers=2` | 6 passed, 2 platform skips |

`apps/web/tests/landing.spec.ts` is the repository's own landing contract, and the import invalidated every assertion in it — it asserted the old `Explore the Alpha →` CTA, the old `.alpha-note` copy, the old `.consumer-slogan` markup and a `data:` URI favicon, and it served `index.html` alone from an in-memory server, which cannot render a multi-file site. It is rewritten against V4 rather than trimmed: the harness now serves the real `landing/` directory with Cloudflare's content types, and every original assertion has a V4 equivalent (CTA target and `rel`, honesty copy, the two-line slogan and its right edge at 320/390/768/1024/1280/1440, no horizontal overflow at each width, a loadable declared icon). Four assertions are new: no third-party request, no Google Fonts link, the stepped equation reveal, and the reduced-motion settled state. The same two ported assertions were applied to `tests/run9-2-visual.spec.ts` (opt-in capture) and `scripts/verify-hosted-alpha.mjs` (the live-apex verifier), which would otherwise have failed the first time they ran against the new page.

The reveal check was verified as a negative control: forcing `motion.js` to activate every word at once makes it fail, and only it — the other three landing tests still pass.

The deploy-config rules were also run as negative controls before being trusted: the real tree validates clean, and each of 34 deliberately broken variants produces its specific error — a missing leading `*`, each of nine forbidden negations, each of nine missing type denials, and a planted `.wrangler/`, `docs/`, `node_modules/`, `review/`, `tools/`, `backups/`, `assets/product/source/` directory or stray `.md`, `.json`, `.jsonc`, `.py`, `.sh`, `.test.mjs`, `.env.local` file.

## Upload shape

Served locally by the Workers-Assets runtime:

| path | result |
| --- | --- |
| `/` | HTTP 200, `text/html; charset=utf-8` |
| `/wrangler.jsonc` | HTTP 404 — not uploaded |
| `/.assetsignore` | HTTP 404 — not uploaded |
| `/_headers` | HTTP 404 — not uploaded, while Wrangler logs `✨ Parsed 1 valid header rule.` |

Response headers on `/` carried the full policy: `content-security-policy`, `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy` and `cross-origin-opener-policy`. The CSP is live, not nominal: a `data:` image injected during testing was refused by `img-src 'self'`.

## Five viewport sizes

1920×1080, 1440×900, 768×1024, 430×932 and 390×844, each loaded and then scrolled from top to bottom. Per viewport, all passing:

- no horizontal overflow on load, and none after a full scroll (`scrollWidth` equals `clientWidth` at every width);
- every rendered image decoded — no broken image at any width;
- zero third-party network requests;
- zero failed requests;
- zero page errors;
- zero console errors or warnings.

## Film

- Desktop autoplay occurs muted (`video.muted === true` while playing) and only at ≥951 CSS pixels.
- The sound control reads **"Play with sound ↗"** — audio is opt-in and never starts on its own.
- Playing the film to its end switches the control to **"Replay film ↻"**.
- On a 390×844 phone the film element stays hidden with no `src` and the poster remains: the phone downloads no video at all.

## Origami scroll

- At the hero, zero origami frames are requested (`performance.getEntriesByType("resource")` filtered to `/assets/origami-scroll/`: 0).
- Scrolling renders all six chapters in order: **swan → lotus → butterfly → heart → bull → z**.
- The canvas is `aria-hidden="true"`.
- Native scrolling throughout; no scroll interception, no scroll-triggered audio.

## The equation's stepped reveal — a defect inherited from the approved package

The equation section is authored to reveal in four scroll steps: **Goals**, then **+ Habits**, then **+ Health**, then **= Wealth**, with the four progress bars below advancing in step. Measured against the Workers-Assets server at 1440×900, scrolling the section from top to bottom:

| scroll progress | `.active` words | `.active` ticks | computed opacity of the four words |
| ---: | --- | --- | --- |
| 0.00 | `Goals` | 1 of 4 | 1.00 1.00 1.00 1.00 |
| 0.19 | `Goals` `Habits` | 2 of 4 | 1.00 1.00 1.00 1.00 |
| 0.39 | `Goals` `Habits` `Health` | 3 of 4 | 1.00 1.00 1.00 1.00 |
| 0.70 | all four | 4 of 4 | 1.00 1.00 1.00 1.00 |

So the state machine in `scripts/motion.js` is correct and the **progress bars do advance one per step**, but the words themselves never dim: they are fully opaque from the first frame.

Cause, confirmed by reading the cascade and by removing the rule and re-measuring. `styles/motion.css` dims an inactive word with

```css
html.equation-enabled:not(.motion-off) [data-equation]{opacity:.13;transform:translateY(10px);…}
```

and `styles/final-v4.css`, which loads last, carries an unconditional rule with the *same* selector and specificity:

```css
html.equation-enabled:not(.motion-off) [data-equation]{opacity:1;transform:none;transition:none}
```

The later rule wins, so no word is ever dim.

Removing that one rule does not restore the authored effect either, and this is the part that matters: V4 moved the nebula spectrum onto the **parent** (`.equation-inputs` paints one continuous gradient with `background-clip: text`, and forces `color: transparent !important` on its children). A child's `opacity` therefore cannot dim a glyph whose fill is painted by the parent. Measured with the rule removed: `= Wealth` fades correctly — `data-equation="3"` sits on `.equation-result`, which owns its own gradient — while `Goals`, `Habits` and `Health` stay fully bright and merely shift 10px. That is almost certainly why the override was added.

Restoring a four-step *visual* reveal therefore needs a small design decision, not a one-line fix, because the only ways to dim a parent-painted word all change something the owner has protected:

1. give each word its own gradient — breaks the single continuous spectrum across `Goals + Habits + Health`;
2. dim inactive words with a scrim in the page background colour — preserves the spectrum exactly, but is new CSS authored into an approved design;
3. swap `opacity` for an opaque dim `color` on inactive words, letting the parent gradient show only on active ones — smallest change, but the dim state becomes a flat colour rather than a 13% tint of that word's own gradient stop.

**No change was made.** `styles/final-v4.css` and `scripts/motion.js` are byte-identical to the approved source, verified with `diff`. This is a latent defect in the approved V4 package, not an import regression: the standalone directory has the same bytes and therefore the same behaviour.

Two related notes for anyone previewing locally: `python3 -m http.server` serves `.mjs` as `application/octet-stream`, so the browser refuses `scripts/origami-scroll.mjs` and the scroll artwork silently disappears — use the `wrangler dev` command above instead. And with macOS "Reduce motion" on, every step is active from the first frame by design, which looks identical to the defect above.

## Reduced motion

With `prefers-reduced-motion: reduce`:

- the scroll canvas stays hidden;
- zero transition frames are downloaded;
- settled stills render instead;
- the film keeps its poster.

## Keyboard and semantics

- The first 14 tab stops each show a real focus outline.
- FAQ `<details>` open and close from the keyboard.
- The screenshot dialog opens from its button and closes on `Escape`.
- The mobile menu opens, closes on `Escape`, and returns focus to the menu button.

## Links

Every external destination on the page is one of the four approved ones, every one is `target="_blank" rel="noopener noreferrer"`, and every in-page anchor resolves to a real element.

| destination | status |
| --- | --- |
| `https://alpha.zigoals.app/app` | HTTP 200 |
| `https://x.com/ZIGoals` | HTTP 200 |
| `https://x.com/ZIGFluencer` | HTTP 200 |
| `https://github.com/reyals1111-ux/ZIGoals` | HTTP 200 |

X refuses automated browsers — Playwright's request client gets HTTP 403 and automated Chrome gets `ERR_HTTP_RESPONSE_CODE_FAILURE`. The two X destinations were therefore confirmed with an ordinary client sending a desktop browser user agent, which returns 200 for both. That is X's bot protection, not a page defect, but it means the two X links are the one pair worth a manual click before release.

## Payload

| group | files | bytes |
| --- | ---: | ---: |
| `index.html` | 1 | 39,902 |
| stylesheets | 7 | 81,691 |
| scripts | 4 | 17,156 |
| brand + favicon | 4 | 123,573 |
| 19 product captures | 19 | 971,356 |
| film (web + mobile + poster) | 3 | 3,487,711 |
| origami desktop frames | 120 | 1,934,676 |
| origami mobile frames | 36 | 258,896 |
| origami settled stills | 6 | 200,488 |
| social card | 1 | 364,851 |
| deployment control files | 3 | 870 |
| **total** | **204** | **7,481,170** |

First-view payload — HTML, all CSS, all JS, the preloaded brand mark and the favicon — is **220,290 bytes across 14 files**. The hero requests no origami frame and no video: `preload="none"` on the film, and the scroll canvas does not load until the visitor leaves the hero. Below-fold imagery is `loading="lazy"`.

The standalone package's own frame measurements reproduce exactly after import: 120 desktop frames / 1,934,676 bytes, 36 mobile frames / 258,896 bytes, six stills / 200,488 bytes. The film encodes likewise: 2,601,932 and 814,441 bytes, matching the 2.60 MB / 0.81 MB figures in the handover.

## Contrast

The standalone QA flagged "the violet large-text stop at 2.89:1". That figure comes from a synthetic all-white backdrop; the page never renders brand text on white. Measured against the real backgrounds the page actually uses:

| foreground | on page `#020918` | on surface `#0a1121` |
| --- | ---: | ---: |
| cyan stop `#7cebf6` | 14.29:1 | 13.52:1 |
| blue stop `#87b9ff` | 9.87:1 | 9.34:1 |
| violet stop `#b595ff` | 8.25:1 | 7.81:1 |
| pink stop `#eea0e7` | 10.26:1 | 9.70:1 |
| body `--muted #a2adc2` | 8.81:1 | 8.33:1 |
| smallest `--quiet #8491aa` | 6.27:1 | 5.93:1 |
| decorative `--section-number #6a7c9c` | 4.72:1 | 4.46:1 |

Those are palette figures. Because the origami layer sits over the page in `mix-blend-mode: screen` and can lighten the field behind text, rendered pixels were sampled too, at the scroll position where that layer is at its strongest:

| element | font-size | origami layer opacity | measured |
| --- | ---: | ---: | ---: |
| Goals chapter title | 129.6px | 0.220 | 11.82:1 |
| Goals chapter subtitle | 48.96px | 0.220 | 14.11:1 |
| Goals body copy | 18px | 0.220 | 13.04:1 |
| Goals footnote | 15px | 0.215 | 9.23:1 |
| Wealth chapter title | 129.6px | 0.220 | 14.16:1 |
| Wealth principle copy | 17px | 0.000 | 7.40:1 |
| Equation slogan | 38px | 0.023 | 17.95:1 |
| Equation quiet note | 16px | 0.023 | 14.89:1 |
| Overview card copy | 17px | 0.220 | 13.72:1 |
| Health chapter subtitle | 60.48px | 0.220 | 9.14:1 |

Nothing measured falls below 7.4:1, against a 4.5:1 AA requirement for body text and 3:1 for large text. **The 2.89:1 finding does not reproduce on the real page**, and no change is proposed to the approved design.

One genuine gap remains, and is left for the owner to decide separately: the stylesheets handle `prefers-reduced-motion` and `forced-colors: active`, but not `prefers-contrast: more`. The minimal fix would be additive — one media block that hides the origami layer and paints gradient headings in the solid `--text` token — and is deliberately **not** included in this pull request.

Font sizes meet the readability floor: meaningful supporting copy is 15–16px at its smallest, body copy 17–19px.

## Not verified

- Physical iPhone Safari, in the foreground, on a real device.
- Low Power Mode, slow connections, back/forward cache restoration, screen readers, browser zoom.
- Core Web Vitals or any hosted performance measurement.
- Range-request behaviour, which the local dev server does not implement.

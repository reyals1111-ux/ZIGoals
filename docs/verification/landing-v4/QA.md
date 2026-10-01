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

# Session AF — review captures (ADR-028)

Orphan branch for review only; never merged. Fictional data only (the Showcase), a fixed clock (2026-10-16 09:30 UTC),
every `/api` call answered 503 (no third party), Chrome (the Chrome channel), DPR 1. Pages over 1 MB are WebP quality 90
(the very tall phone pages stay PNG: WebP's limit is 16,383 px); crops are lossless PNG.

| Folder | What |
|---|---|
| `before/` | `main` `4f92495` (Alpha #44), its own production build on :3103 (2026-10-18 22:20 Brussels): every page Session AF changes in Nebula, Light and Dark at 1440 (`-d`) and 390 (`-p`), full page; the sidebar top and scrolled per theme; the footer banner per theme at 1440 and 390; Habits' 28-day blocks per theme; the hero slogan at 768 and 1920; Today's rail at 1100; Wealth's holdings chips at 1440; the launchers |
| `reference/` | Public pages of the ecosystem apps and providers (desktop and 390), never logged in, never a wallet — for the "what you'll see" illustrations (added in Part 0's reference pass) |
| `after/` | Gate C: the final head's build, the same views plus the new pages |
| `tools/` | `capture-af.mjs` (`node capture-af.mjs <base> <out>`, `THEMES=nebula,light,dark`, `ONLY=<regex>`), `to-webp.mjs` |

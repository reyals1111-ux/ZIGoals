# Session AD captures (ADR-026)
- `before/`: `main` `61204c3` (Alpha #42), its own production build, Showcase, fixed clock 2026-10-16 09:30 UTC, every `/api` call answered 503 (no third party). Chrome (Playwright Chromium as the channel), device scale 1.
- `after/`: this branch's head (added at Gate C), same settings, plus each theme.
- Names: `banner-{d,t,p}` (1440/1024/390), `banner-d-motionoff`, `banner-strip-*ms` (the opening moment, frames), `hero-{unfolded,scrolled,folded}-{d,t,p}`, `<theme>-<page>-{d,p}`, `sync-*`, `restore-*`.
- Script: `capture.mjs` (`node capture.mjs <base> <out>`, `THEMES=nebula,light,dark`, `ONLY=<regex>`).

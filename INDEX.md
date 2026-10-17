# Session AE — review captures (ADR-027)

Orphan branch for review only; never merged. Fictional data only (the Showcase), a fixed clock (2026-10-16 09:30 UTC),
every `/api` call answered 503 (no third party), Chromium (the Chrome channel), DPR 1 unless named `-2x`. Large pages are
WebP quality 90; crops are lossless PNG.

| Folder | What |
|---|---|
| `before/` | `main` `11d8408` (Alpha #43), its own production build: Today's hero (1440/1024/768/390, seams), the banner (+ its frame strip), launchers, sidebars (2x), Habits S3/S4, every page in Nebula/Light/Dark |
| `variants/part1-hero/` | ADR-027 G10: variants A (exact), B (masks on the original), D1 (1.15×, **kept**), D2 (1.3×) — pages with seam crops (`pages/`), art-only renders (`art-only/`), contact sheets |
| `variants/part2-finale/` | ADR-027 G12: finale variants S1, S2 (**kept**, "aurora") and S3 — frames every 400 ms from 2.4 s to 7.2 s (`frames/`) and one strip per variant |
| `after/` | Gate C: the final head's build, the same views as `before/` plus the new ones (added at Gate C) |
| `tools/` | The capture scripts (`node capture.mjs <base> <out>`, `THEMES=nebula,light,dark`, `ONLY=<regex>`) |

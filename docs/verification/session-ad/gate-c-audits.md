# Session AD Gate C — layout and contrast audits (local, production build of 262c0c8c+)

`tests/audit/layout-audit.mjs`, Chrome, every audit state (Showcase and a new device), reduced motion.

| Run | Widths | States | Findings | Report |
|---|---|---|---|---|
| Nebula, every state | 390, 1440 | 133 | 1 overlap: Journey's "8" over "level" at 1440 (4 px), the same on `main` | `gate-c-audit-nebula.md` |
| Light, every state | 390, 1440 | 133 | 90 contrast (goal templates' area tags, the grocery list's aisle headings: runtime colours) — fixed in `ee1eaf53`, re-run clean (`gate-c-audit-light-after.md`); the Journey overlap | `gate-c-audit-light.md` |
| Dark, every state | 390, 1440 | 133 | the Journey overlap only | `gate-c-audit-dark.md` |
| Nebula, the changed pages | 320, 768, 1024, 1920 | 33 | 6 overlaps: the Today hero slogan's two line boxes (4–5 px) at 768 and 1920 — the same 6 on `main` `61204c3` (measured there); this sandbox's font (Inter), not CI's (part5-hero-768.txt); the protected hero, unchanged | `gate-c-audit-widths.md` |

Earlier per-theme passes (Part 3): `part3-audits.md`. Touch (`--touch`) and stress (`--stress`) modes were not re-run; no
layout changed for them beyond the footer, hero and themes covered above.

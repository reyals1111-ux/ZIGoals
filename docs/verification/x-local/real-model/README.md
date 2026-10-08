# Real-model runs (Session X-Local Part 6)

Evidence files, one per run, written by the harness and the browser specs; never edited by hand. Fictional Showcase
records only; the base URL is redacted; no key exists in this session.

- `<host>-<model>-<mode>-<cases>-<timestamp>.json` — the Node harness (`apps/web/lib/ai/evals/real-model.test.ts`):
  `summary` (model, host, mode, cases, repeat, runs, passed, rate, byKind, latency medians, tokens) and `runs`
  (per case and repeat: the checks with their details, cards, rejected blocks, the hint, latency, tokens, the tool
  calls, the reply text, an error if the wire failed).
- `ui-<model>.json` — `tests/zigi-real-model.spec.ts`, one entry per UI-driven case (the ask as typed, the stored reply,
  the cards as shown, the tools the turn recorded, the score without facts and hints, the time to a final reply).
- `conversations-<model>.json` — `tests/zigi-conversations.spec.ts` (plan → correct → accept → undo, with the
  accepted-means-correct checks per step).
- `pages-<model>.json` — `tests/zigi-pages-conversations.spec.ts` (ten asks per page, desktop and phone).
- `day-in-the-life-<model>.json` — `tests/zigi-day-in-the-life.spec.ts` (three scenarios, ZIGi's state per step).

The document that reads them: `../ZIGI_REAL_MODEL_TEST.md`.

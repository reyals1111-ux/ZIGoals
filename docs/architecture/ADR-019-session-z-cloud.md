# ADR-019: Session Z-Cloud, "ZIGi's new face + friends-ready": session decisions

Status: **In progress** on `feature/session-z-cloud`, from `main` `12a3ef9` (Merge #80, Session Y; live as Alpha deploy
#35). This record holds every decision Session Z-Cloud took without asking the owner (the brief asks for the safest option
that keeps the project's promises), and the owner's own decisions. A parallel lane, Session Z-Local
(`feature/session-z-local`), owns ZIGi's brain; the two lanes talk through `docs/handoff/Z_CLOUD_TO_LOCAL.md` and
`docs/handoff/Z_LOCAL_TO_CLOUD.md`.

## Owner decisions (2026-10-10, plan approval)
- **The brief:** nine parts in the owner's priority order (ZIGi's chat premium and clean; voice in English and Dutch; the
  accepted persona decisions except item 4; the security and account decisions A5, A6, C4, Y38, A7; ZIGi for friends on
  Claude Sonnet through the hosted relay, ready but not activated; quality and CI; friends-readiness docs; a fresh-eyes
  persona round) and three gates; one PR, merge commits only, Tier 3 in its own commits; never merge, deploy, dispatch,
  approve, log in or handle secrets; no new dependency; English only, USD and EUR only, no French anywhere added.
- **Persona pack (PERSONA_DECISIONS_Y.md):** every recommendation accepted except item 4 (currencies stay USD and EUR).
  A5 "60 codes a day", A6 option (a), C4 option (a) testnet only, home GPU "not now", Y26 "not now".
- **Plan edits (approved with the plan):**
  1. iPhone voice: the voice engine is preloaded when the panel or the launcher becomes visible; `start()` runs
     synchronously inside the gesture; a launcher hold before the engine has loaded opens the panel with the microphone
     highlighted ("Tap the mic to talk"); speech synthesis is unlocked in the same gesture; a spec proves `start()` runs in
     the gesture's own task; owner rows for iPhone Safari and the home-screen app (which may lack speech recognition).
  2. Long-press on phones: no text selection, callout or context menu on the launcher and the microphone; a hold is not a
     scroll; Y44 and H7 kept; a hold never moves the launcher; specs for a hold on the resting and the corner launcher.
  3. The session runs past the weekly reset (Sunday 13:00 Brussels) through every part, gate and the stretch list.
  4. A6's server half is additive: #32–#35 ignore the verifier; the private-sync Worker's enforcement sits behind an owner
     switch (a Worker var, on in this PR's config) so an app rollback to #35 can turn it off; both settings proven in
     Miniflare; nothing #35 needs for unlock or sync is ever refused. Otherwise the client half ships alone.
  5. A5 uses the auth-abuse Worker's existing storage and bindings where possible; a new Durable Object class only if
     unavoidable, with its migration, owner steps and a decision here.
  6. Z-Local's handoff items for ZIGi's face are in this lane's scope at every gate ("Handoff applied" below).
  7. Weights: every new always-loaded byte measured at Gate A; room made with on-use imports; no budget raised.
  8. Delete for good: prove from the code that habit deletions already sync as tombstones before building on it;
     otherwise the tombstone is a `[TIER 3] (data formats)` change with #32–#35 readers and a two-device test.
  9. Personal suggestions never include anything from Health when Health is not shared with ZIGi, are shown only on the
     device that recorded them, and "What ZIGi knows" lists them with a one-tap "Forget all".

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| C1 | — | The owner-named branch `feature/session-z-cloud` is used; the harness's designated branch is not. Node 24.19.0 (the repository's `.node-version`) was fetched from nodejs.org, checked against the release's `SHASUMS256.txt` and linked ahead of the sandbox's Node 22; nothing was installed into the repository (as Y2). | The owner named the branch in the brief; Z-Local and the owner look for it there. Release compatibility is only established under the pinned Node. |

## Handoff applied (from Z_LOCAL_TO_CLOUD.md)
None yet (no `feature/session-z-local` branch on 2026-10-10 14:10 UTC).

## Assertions changed (deliberate, listed)
None yet.

## Rejected options
None yet.

## Consequences
Filled at the end of the session.

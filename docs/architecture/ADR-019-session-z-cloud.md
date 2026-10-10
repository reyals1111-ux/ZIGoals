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
- **Owner follow-up (2026-10-10, during Part 1):**
  1. Independent agents are allowed, one at a time and never in parallel, only for: Part 9's persona round (an agent that
     has not seen this branch's code; 6 personas, about 20 sessions, raw findings returned and fixed here with tests); an
     independent security read of each `[TIER 3]` commit after Part 5 (A5, A6, Y38, delete-habit sync) and again at Gate C;
     Gate C's audit of every changed test file for weakened assertions. No exploratory or search agents.
  2. Z-Local sends the exact Anthropic request rules in its handoff (`cache_control` placement, `output_config.effort`, never
     thinking disabled on Opus 5.5, the usage fields, `lib/ai/pricing.ts` as the one price table). The relay follows them
     exactly and counts friends' budgets with the same accounting; until that entry lands, the relay's request body sits
     behind one function that is easy to align.
  3. Voice languages follow Z-Local's `lib/ai/settings.ts` (French removed there; an old `fr` value reads as the device
     default): `zigoals:zigi-voice:v1` and the voice UI offer the same four, en-GB, en-US, nl-BE, nl-NL.
  4. `proposal-list.tsx`: Z-Local pushes the WebKit freeze fix early in its own commit and announces the lines; this lane's
     receipt-collapse there is render-only; whichever PR merges second keeps both changes.

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| C1 | — | The owner-named branch `feature/session-z-cloud` is used; the harness's designated branch is not. Node 24.19.0 (the repository's `.node-version`) was fetched from nodejs.org, checked against the release's `SHASUMS256.txt` and linked ahead of the sandbox's Node 22; nothing was installed into the repository (as Y2). | The owner named the branch in the brief; Z-Local and the owner look for it there. Release compatibility is only established under the pinned Node. |

| C2 | 1 | **The verifier's REST row ends in "no further digit or dot"** (`(?![\d.])`), built by `reviewedRestPattern()` in `scripts/lib/hosted-alpha-review.mjs` so a unit test feeds it the panel's exact textContent ("…v5.1.2Goal Manager…"). Every other script and spec was searched for the same version-then-`\b` shape: only `verify-hosted-alpha.mjs` built it. Proved read-only on #35 (the old pattern fails on the live text, the new one passes). | The narrowest change that matches exactly the reviewed versions and nothing longer ("v5.1.20", "v5.1.2.1" stay refused), whatever text follows. |
| C3 | 2 | **The name is "ZIGi · Your Personal AI Companion"** with the app's middle dot (the owner wrote a dash; every other title in the app uses the dot, and a dash beside "AI" read as a minus at 14 px). Both halves wear the nebula flow (`components/ai/zigi-title.tsx`); in a narrow header the dot folds away and the role takes its own line, so nothing is clipped. Anchors and ids (`#your-ai`, `your-ai-title`) are unchanged. Strings in `lib/ai` (Z-Local's) still say "ZIGi · your AI": asked for in the handoff. | One separator across the app; ids stay stable for every link and test. |
| C4 | 2 | **One header row:** figure · title and a small status line · New chat, Expand/Shrink and Pop out (computers only), "⋯", Close, each a 44 px glyph button with a name and a tooltip in the launcher chevron's nebula stroke. "⋯" is a disclosure (a button and the entries it shows, Escape closes and returns the focus, arrows move) holding History, Customize, Settings, Meet ZIGi, Help and, with an AI connected, "Change model". The model switcher moved from the status line into "⋯" so the status stays a small line (a 44 px switcher in it made the header 100–131 px). | The owner's list; a disclosure keeps each entry's role and name (no new ARIA menu semantics to get wrong); the status line stays small. |
| C5 | 2 | **The tab's panel is portalled to the end of `<body>`.** At 768–900 px the app's top bar (`z-index: 30`) painted over the panel's header, which lived inside `.app-content`'s isolated stacking context: its controls could not be clicked (audit B1). The mini window and the phone sheet are unchanged. | Fixes the cause (the stacking context) without raising z-indexes across the app. |
| C6 | 2 | **The computer panel is 500 px wide** (was 440) so the full name fits in two lines beside five buttons. Expanded and the mini window are unchanged. | The owner allows the panel to change on desktop and tablet in this part (freeze check). |
| C7 | 2 | **A new chat is one greeting and the box.** The built-in chips, the brief, Your week, Patterns and the first-run tips moved into the Suggestions sheet (tabs Ideas · Your day · Yours) opened from a chip by the box; the data-mode sentence moved inside "What your AI sees"; not connected is one compact line ("Not connected to an AI yet" · Set up · "Which setup fits me?") above the box. | The owner's "clean chat"; everything stays one tap away and nothing is sent before a tap. |
| C8 | 2 | **Your own suggestions** (`zigoals:zigi-suggestions:v1`, `[TIER 3] (storage)`): a question is normalised (case, spacing and punctuation fold; numbers kept, "2,5" = "2.5"); three asks within 30 days make a "Yours" card; at most 12 shown (pinned first, then the newest), 200 tracked (least recently asked dropped, never a pinned one); Remove deletes the words and the asks (three more asks bring it back); nothing is written when nothing would be kept; nothing is kept on a private screen or for a photo-only message. Health: an English and Dutch vocabulary (weight, sleep, water, meals, steps, heart, meditation…, deliberately broad) marks a Health question; none is kept while Health is not shared with ZIGi, and one kept while it was shows only while it still is. | Owner plan edit 9; a broad vocabulary errs towards keeping less. |
| C9 | 2 | **Acted-on cards are one-line receipts; an earlier reply's untouched cards fold** into "N earlier cards, not added" once a newer reply brings cards. Rendering only: `claimAuto`, `reserve`, the add, undo and dismiss calls and their order are untouched (announced in the handoff; Z-Local's WebKit fix may land in the same file). | The owner's "no leftover choices"; nothing about writing changes. |
| C10 | 2 | **Turn off ZIGi, Disconnect and the account's erase remove the suggestions;** the voice choices (a display preference, like ZIGi's look) stay. | The brief names the suggestions; a display preference survives like the existing look-and-feel record. |
| C11 | 2 | **The audit is a script outside the repository** measuring every state and width on two production builds (overlaps by bounding boxes, hit-tests, clipping, contrast against the real backgrounds, targets, header rows, the composer's line); its images and JSON go to `review/session-z-cloud-screens`; the lasting checks are `tests/zigi-face-z.spec.ts`. | Evidence without adding a dependency or a long spec to CI. |

## Handoff applied (from Z_LOCAL_TO_CLOUD.md)
None yet (no `feature/session-z-local` branch on 2026-10-10 14:10 UTC).

## Assertions changed (deliberate, listed)
- **Part 2, the new name (as strict):** `tests/help-page.spec.ts` (the topic list) and `tests/send-feedback.spec.ts` (the Known
  limitations link) expect "ZIGi · Your Personal AI Companion" where they expected "ZIGi · your AI";
  `tests/zigi-part-boundary.spec.ts` expects that heading in Settings' ZIGi section (was "Your own AI, page by page.", now its
  eyebrow); `tests/zigi-mini-window.spec.ts` matches the launcher's new closing name.
- **Part 2, controls moved into "⋯" (mechanics only, every assertion unchanged):** `zigi-tools`, `zigi-chat-polish`,
  `zigi-safety` open "⋯" before "Chat history"; `zigi-alive`, `zigi-knock`, `zigi-a11y-pass` before "Customize ZIGi".
  `zigi-chat-polish`'s "?" check focuses "New chat" (a control outside the box, as History was) instead of History.
- **Part 2, suggestions in their sheet (mechanics, as strict):** `zigi-proactive` (three tests), `zigi-on-device` ("Say it
  nicer · on this computer") and `zigi-a11y-pass` open the Suggestions sheet's tab before the brief, the chips, Your week and
  Patterns; `zigi-a11y-pass` now also runs its accessibility check with the sheet open (stricter); `zigi-chat-polish` finds the
  first-run tips in the sheet, and after the reload opens the sheet before asserting they are gone (stricter: the sheet is
  shown, so the absence is real); after "Back to the chat" `zigi-proactive` checks the greeting, then the brief in the sheet.
- **Part 2, the not-connected line (as strict):** `your-ai`, `zigi-on-device`, `zigi-local-answers` expect the compact line
  ("Not connected to an AI yet", link "Set up" to `/app/settings#your-ai`) where they expected "Connect your own AI to
  start" and "Set up in Settings"; `zigi-local-answers` expects the new local greeting and finds the example questions in the
  sheet's group "Questions ZIGi answers here" (was `.ai-local-intro .ai-chip`).

## Rejected options
None yet.

## Consequences
Filled at the end of the session.

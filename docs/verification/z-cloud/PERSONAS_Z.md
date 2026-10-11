# Session Z-Cloud Part 9 — Fresh-eyes persona round

Evidence: local (production build `PUBLIC_ALPHA_UNDEPLOYED`, `next start`, the branch at `4cfc2b1`), 2026-10-11, 01:30–02:50 UTC.
Every AI answer was a MOCK (a local OpenAI-compatible server answered by the agent's own scripts); all data fictional.

## How it ran
One independent agent ran the sessions (owner follow-up 1: one agent at a time, for this round). It had not seen this
branch's code, design notes or earlier findings, and it read no file of the repository: it worked only through the
browser with its own Playwright scripts. Every `/api` request got a 503 fixture and every request off 127.0.0.1 was
blocked. Speech was a fake `SpeechRecognition` and `getUserMedia` stub; its "AI" a stub at 127.0.0.1:1234.

It ran 20 sessions across six personas, at 320, 390, 1024 and 1440 px, empty and Showcase:
1. a new phone user who has never used ZIGi (S01–S03, S15, S20)
2. a ZIGi power user with a local AI (S04, S05, S14)
3. a Dutch speaker who talks to ZIGi (S06, S07, S16)
4. a habit tidy-upper (S08, S09, S19)
5. a US-units health and wealth tracker (S10, S11, S18)
6. a keyboard-only and screen-reader user (S12, S13, S17)

Screenshots and notes stayed in the agent's scratch folder (fictional data only), not in the repository.

## Outcome by issue
Severity is the agent's: **B** broken, **C** confusing, **U** unfinished, **P** polish. "Fixed" means fixed in this PR with a
regression test (named) unless the row says otherwise. "#35" means the same happens on Alpha #35 (`12a3ef9`'s own build,
measured side by side where it mattered).

| # | Sev | Issue (sessions) | Outcome |
|---|---|---|---|
| 1 | B | A chat reopened from History or the mini window offered its added cards again; "Add all" wrote the water twice and the goal note twice (S04, S14) | **Fixed** (#35 too). Each reply's cards keep their outcome on this device (`zigoals:zigi-cards:v1`, `[TIER 3] (storage)`, ADR-019 C50): added, added by ZIGi, opened, dismissed, undone or replaced, and whether edited; no words. A reopened chat shows receipts; an edited card's receipt says "edited". `lib/zigi-cards.test.ts`; `zigi-face-z` "a chat reopened from History, or after a reload…" (nothing written twice). |
| 2 | B | No AI: "Which habits are open today?" (ZIGi's own example), "How many habits do I have?" fall back; older replies lose their examples (S02, S03, S08) | **Z-Local's lane** (on-device answers, `lib/ai/local-answers`): handoff entry 2026-10-11. |
| 3 | B | Dutch words in Quick add: "2 glazen water" → 2 mL; "twee glazen water" → 1 glass (S06) | **Fixed.** Quick add reads English lines; a number followed by a word it does not know now asks for the unit instead of reading mL or fl oz ("2 bottles of water" was wrong in English too). ZIGi's answer made on this device offers no Quick add card for a question spoken in Dutch. `lib/quick-add/parse.test.ts` (four phrases); the Voice note and Help say on-device answers read English questions. |
| 4 | B | Dutch spoken question without an AI → English fallback (S06, S16) | **Z-Local's lane** (Dutch understanding is on its branch, ADR-020 L6); the Voice note and Help now say "questions in English" for this build. |
| 5 | B | Showcase: water added, Exit, Load again → gone; the banner says it stays (S15) | **#35, owner item.** The Showcase keeps its own storage and "Load" resets it by design (X-Cloud); the banner's sentence and Load's reset disagree: a wording or behaviour choice for the owner. |
| 6 | B | US fl oz: the water target is still typed in mL ("64" became "2 fl oz") (S10) | **Fixed** (Part 4.7 made the display fl oz). The target is typed in the preferred unit (whole US fl oz or mL), kept in mL as before; changing the unit converts what is typed. `persona-z` 7b (64 fl oz → 1,893 mL, back to "1893" in mL). |
| 7 | C | Wealth with "Share this page's data" off: a water question still sent the Drink-water habit's numbers; nothing under the answer says so (S04) | **By design, checked.** The page switch covers the page's own data; the Habits area's switch was on, so ZIGi's question records came from Habits, shown as removable chips by the box before Send (code unchanged since #35). **Owner item:** a "Records used" line under such an answer. |
| 8 | C | The screen-reader status said "Your AI replied." for an answer made on this device (S02, S12, S16) | **Fixed.** It names who answered ("ZIGi answered on this device.", Chrome's model, ZIGoals AI, your AI) and says when a spoken question's reply stays silent for the quiet hours. |
| 9 | C | A receipt kept "Undo is available for ten seconds" after Undo had gone, and dropped the amount (S04) | **Fixed.** The Undo line goes with the window; a receipt reads "Added · Add water · 300 mL" (its name stays "Add water"). `zigi-face-z` receipts test (stricter). |
| 10 | C | History's Delete removes a chat at once, no confirm or Undo (S04) | **#35, owner item** (Session V's design; "Delete all chats" asks). |
| 11 | C | "Which setup fits me?" with a phone and "Nothing leaves my computer" suggests the subscription bridge (S02) | **Z-Local's lane** (`lib/ai/setup-chooser`): handoff entry. |
| 12 | C | Numbers that disagree between pages in the Showcase (attention counts, water, steps, a month's check-ins, review week, Bitcoin's value) (S03, S11, S18) | **#35, owner items.** Fictional Showcase data and existing per-page rules (each page counts its own records; Portfolio is apart from Wealth); listed for a Showcase data pass. |
| 13 | C | US units: the week still "Water · mL", Activity "Weight recorded 82.735 kg" (S10, S11) | **Fixed** (Part 4.7 left them). The week reads US fl oz and Activity pounds when chosen. `persona-z` 7b; `lib/health.test.ts`. "2 Health entries for 3 logged" (Your week) is #35's counting: owner item. |
| 14 | C | Archiving takes effect tomorrow; "Delete for good" appears once it does; a restored habit keeps its scheduled line (S08, S09) | **By design** (C44: never a nameless habit due today on a #32–#35 device); the card says when it appears. |
| 15 | C | ZIGi's edit-habit card says "from today" while the form says tomorrow (S19) | **Z-Local's lane** (the planner): handoff entry. |
| 16 | C | A spoken reply was read at 11:40 but silently not at 04:39; Settings pointed to quiet hours in Customize, which has none (S06, S07) | **Fixed.** Settings and Help say "never between 22:00 and 08:00" (no setting writes other hours); the status line says when a reply stays silent for them. |
| 17 | C | "Portfolio has the analysis" on Wealth, but Portfolio stays apart from Wealth (S10) | **Fixed** (Part 4.5's words): "Portfolio is a separate tracker for coins, kept apart from Wealth." |
| 18 | C | "3,250.50" refused in an account; currency defaults to EUR (S10) | **#35, by design** (QA2: grouped amounts refused in inputs) and an owner item (the default currency). |
| 19 | C | Today, Wealth and Markets ask `/api/market-quotes` for held assets' public ids on load; the page says prices update on request (S20) | **#35, owner item.** Ids only, no amounts (as Help says); the "on request" wording predates this PR. |
| 20 | C | The Voice card said "On this device" while the first-use notice says audio goes to Google or Apple (S07) | **Fixed.** "These choices stay on this device; your browser's speech service hears what you say (below), and ZIGoals never stores audio." |
| 21 | C | "See how it works" is the 16-second brand film, not a how-to (S02) | **#35, owner item.** |
| 22 | P | Cut text on phones: "This device o…", "Connect Kep", the Jump pill's words, chips, the status line, a card's "where" (S01–S03, S06, S14) | **Fixed:** the storage line is in full in the Status sheet; the sheet's wallet buttons stack under 400 px; the Jump pill is as wide as its words. **By design (round 2):** chips, the status line and a card's "where" end in "…" with the full text in their tooltip. `phone-shell` Status sheet test (stricter). |
| 23 | P | Sideways scroll at 320: Meet ZIGi (385 px) and Help's local-model answer (558 px) (S02) | **Fixed** (#35 too): the sizes wrap; a long command breaks inside its answer. `persona-z` "Meet ZIGi and Help's local-model answer…". |
| 24 | P | A reply's "⋯" cut off by the Suggestions sheet; the Jump pill covers a reply's buttons; Expand and pop-out scroll to the top (S02, S04, S05, S14) | **Fixed:** the reply's "⋯" opens upward when there is no room below. **By design:** the pill floats over the log until the person jumps. **Owner item:** keep the scroll place on Expand. |
| 25 | P | A Markdown link shows raw; Copy's name stays "Copy" (S04) | Links stay text by design (no link from a model is followed); Copy's name changes to "Copied" once the copy succeeds (the code sets both together; not reproduced here). |
| 26 | P | Today's interest cards expose no pressed state; the mute chip changed its name and its pressed state (S12) | **Fixed (mute):** one name, "Mute ZIGi's voice", with the visible word "Mute" in it and its state in `aria-pressed` (WCAG 2.5.3). `zigi-voice-z` (stricter). Interest cards: #35, owner item. |
| 27 | P | Wording: "1 readings", "2 Gold troy ounces", "switch is off..", "Added: Add water.", both water fields "(optional)", "on every device you sync" with sync off (S10, S04, S08) | **Fixed:** the doubled stop, the receipt, "here and on any device you sync". **#35:** "1 readings", troy ounces (owner items). **Z-Local:** the water card's fields (handoff). |
| 28 | P | Footer links 17 px, Quick add's × alone at 320, the Hide-ZIGi toast see-through, the music button over a card with ZIGi on the left, a duplicate "Stretch" from a card, the knock offer in every new chat (S02, S04, S05, S17) | **#35, owner items** (footer links are in-sentence links, 2.5.8's exception); **Z-Local:** a duplicate habit from a card, the knock offer's rule (`lib/ai/knock/offer.ts`: until answered). |

Also fixed on the way, found by CI on `001e363` while the round ran: Settings' ZIGi name under WCAG text spacing (it was
nowrap; now one line by its size), Wealth's phone order counting "What you have", and Habits' hero on phones (the
two links join "+ New habit"'s row, so the first figure is back on the first screen). `a11y-wcag-x`, `phone-pages`,
`motion-arrival`, `persona-z` 10b, `zigi-oneline-z` "Settings: ZIGi's name…".

## What worked well (the agent's words, shortened)
- No request left 127.0.0.1 in any session. With Health off, "What your AI sees" left out water, steps and meals.
- Setting up a local model was quick; Add, Edit with validation, Undo and "Add all" worked; the edit-habit, skip,
  check-in and create-habit cards applied correctly.
- Keyboard use was solid: a visible 3 px focus everywhere, Ctrl+K, focus kept in the panel, Escape closing the inner menu
  first and returning focus.
- The Dutch voice language reached recognition and read-aloud (nl-NL, nl-BE); hold to talk, mute and "Tap ZIGi to talk"
  worked.
- Delete for good needs the typed name and has a working ten-second Undo; net worth matched between Wealth and ZIGi.

# ADR-038 — Session AM: "NOVA, ALWAYS ON"

- **Status:** in progress (branch `feature/session-am-nova`, [PR #101](https://github.com/reyals1111-ux/ZIGoals/pull/101); not merged, not deployed)
- **Base:** `main` `c65882f3` (Merge #100, Session AL), live as Alpha #54
- **Scope sources:** the owner's brief for Session AM (11 Nov 2026), `review/session-am-refs:REFERENCES.md` (43 owner mockups and four described screenshots; read-only, never merged), ADR-036 (N1–N12, M2, M4), ADR-037 (O5, Q11, Q14, Q16), `docs/research/session-ak/NOVA.md`, `docs/review/session-ak/NOVA_DESIGN_REVIEW.md`. Art direction: [`docs/design/NOVA_AM_ART_DIRECTION.md`](../design/NOVA_AM_ART_DIRECTION.md).

## Why this session exists
NOVA today is a holographic HUD: eighteen widgets that are always on the stage around a small SVG orb. The owner wants the opposite resting state and a far higher ceiling: a calm, nearly empty stage with one living star that is the agent, and widgets that are *made on request* for the answer the person asked for, in the look of the owner's mockups, good enough that a person keeps NOVA open all day. One task; everything else in the app stays as it is.

## Owner decisions (11 Nov 2026)
- **O1 Outside data.** Only free, keyless services; OFF until the person turns them on; each named in the plan for approval; CSP/egress changes are TIER 3 commits. Without them, the widget explains how to turn it on (never fake data).
- **O2 Sync.** NOVA's history, pinned widgets and layout join the existing end-to-end encrypted sync as an additive domain (TIER 3 sync), behaviour-preserving for existing data. On the public Alpha (no accounts) they stay on the device, and NOVA says so.
- **O3 Dependencies and budgets.** A new dependency or a route-weight budget change only if proposed in the plan with its size and reason; otherwise hand-written WebGL/Canvas/CSS, with heavy visuals loaded after first paint.
- **O4 Rename.** Renaming NOVA is a Premium feature, built now, available to everyone, labelled "Premium · free during the Alpha". Every other feature is for everyone.
- **O5 One plan, one approval.** After it: no questions; decisions are made by the session and recorded here.
- **Standing rules that still hold:** consumer first, chain invisible; private by design (no analytics); non-custodial (no AI signs, holds keys or moves funds); no fake integrations or simulated data shown as real (the Showcase is labelled); unknown is not zero; every figure names its source and as-of; no projection as a guarantee; never a film or comic reference in copy, commits or docs ("personal AI command centre"); the deterministic safety guard, the privacy modes, the page-data switches (ADR-037 Q14) and the Health rule (Q16) hold on every new path; the NOVA motion exception (ADR-037 O5) and no pointer tracking; the readability minimums; the protected list (Checklist orbit path, footer finale, Today hero and slogan, swan intro, Light's dark islands, shell navigation except NOVA's own side bars, the locked ZIGi look); no wallet, contract-signing or key changes.

## Decisions (made by the session; D-numbers are referenced from code comments)

### The stage
- **D1 One stage, one list.** The stage is AK's Orbit layout (the star in the centre, two columns, a band below). Widgets that are made on request and widgets the person arranged are the same object in the same grid, drawn by the same frame. Bento, Focus and Minimal stay as they are.
- **D2 Calm by default.** A NOVA with no arrangement of its own shows no widgets: the star, the greeting, the day line, the one-tap requests and the command bar. AL's rule that a brand-new NOVA starts on the Command preset, and AK's eight default widgets for a record without a widget list, both end (owner brief: "With real data, the stage starts calm and nearly empty"). A person who arranged widgets keeps exactly those, as pinned widgets. The Showcase seeds a fully populated stage and says it is the Showcase's. Specs that relied on the defaults arrange the Command preset first; their assertions stay as strict (each change carries `Session AM (D2, deliberate)`).
- **D3 Made, pinned, hidden, closed.** A widget made by a request is *on the stage* until the person closes it, and leaves by itself after 12 hours unless pinned. *Pin* keeps it (it joins the arranged list). *Hide* folds it into the dock as a chip; a tap brings it back. *Close* removes it, with Undo. *Open* goes to its full page with the morph; Back returns to the same stage. One widget per kind: asking again about the same thing re-targets the widget (a new range, another goal) and it is made again in place.
- **D4 The catalogue is closed.** NOVA and a connected model choose *which* widget from a fixed catalogue and with which small, validated parameters (a range, a record's id). The figures always come from the person's own records on the device, through the pages' own stores. A model can never put words, numbers or markup into a widget.
- **D5 Gates on a widget.** A widget made by a request reads under the same switches as NOVA's on-device answers (the page-data switches, Q14; NOVA → Permissions; Health only with NOVA's Health permission and the device's Health gate, Q16). Closed means the *locked* state: which switch, and nothing else. A message the safety guard answers makes no widget.

### The agent
- **D6 One engine, still.** Requests go through ZIGi's engine on NOVA's surface (ADR-036 N1): the safety guard first, then on-device answers, then the person's model. The session adds a deterministic **summon** step beside it: the question (English or Dutch, typed or spoken) and the lookups the answer used are mapped to widgets. With no model the mapping is the whole story; with a model the lookups it ran are mapped the same way.
- **D7 Answer in place.** The command bar answers on the stage: NOVA's words under the star, the widgets beside it. The conversation stays mounted and opens as a panel on request, and by itself when an answer needs a decision (a confirm card, a choice, a failure). Nothing is sent before Enter.
- **D8 Writes.** Unchanged: every change is a confirm card with Undo; money is only a pre-filled card the person signs themselves; nothing is signed, sent or moved by NOVA.
- **D9 Voice.** Speech input and read-aloud keep their rules (off until turned on; the disclosure before first use; Strict only on the device). The star shows listening, thinking and speaking; every state is also text.

### The centre node
- **D10 A hand-written WebGL star system**, one fragment shader on one canvas, no library (art direction §5). The SVG orb stays as the fallback (no WebGL, a lost context, low-end, battery saver, Save-Data, phones) and for the mini window, the chat header and the guides.
- **D11 Rest.** The star's loop has three rates: active (30 fps), resting (≤ 6 fps at half resolution, after 60 s without a key, tap or request, or when the window is not focused) and stopped (hidden, frozen, Motion Off, reduced motion: one still frame per state). Activity is never read from pointer movement. A governor steps quality down when frames are slow.

### Outside data (O1)
- **D12 One service, one host: MET Norway (`https://api.met.no`).** Locationforecast 2.0 and Sunrise 3.0. Free, keyless, global, CC BY 4.0 / NLOD ("Data from MET Norway"), and its terms allow any purpose, paid apps included; a browser identifies itself by its Origin, as the terms ask. Open-Meteo was the better technical fit but its free tier is for non-commercial use only and names apps with subscriptions as commercial, and ZIGoals shows placeholder plans; it is not used. No air-quality widget: no keyless service with terms that fit was found.
- **D13 Off until turned on, and what leaves.** NOVA → Permissions gets "Weather (outside data)". Off: the weather widget explains the switch and what would be sent. On: the browser asks api.met.no for a place rounded to two decimals (about 1 km); the service sees that place and the device's network address, nothing else. No account, no key, no cookie.
- **D14 The place without a geocoder.** The person picks a city from a list that ships with the app (loaded on use), or types coordinates. The browser's location permission stays denied by the Permissions-Policy (unchanged). No geocoding service is called.
- **D15 Cache.** One reading per place is kept on the device until the service's `Expires` time (at least 30 minutes), never fetched while hidden, never without a weather widget on the stage or a weather question. The widget names the service and the reading's time.

### Stored formats and sync (O2)
- **D16 One new record, `zigoals:nova-stage:v1`** (additive; loose object, version 1, every field optional, every list bounded): the widgets made on request (`made`), the small parameters of widgets (`params`), the dock (`hidden`), and the history of requests (`asks`: when, the words, the widgets it made, phone or computer, on-device or model; at most 200). A chat that is not kept writes no request. In Export everything, restore, the encrypted backup, erase and the catalog.
- **D17 One new record, `zigoals:nova-world:v1`** (additive, device-only): outside data on or off, the place, the cached reading. Exported and erased; restored without its cache.
- **D18 Sync: an additive extras section `nova`,** after the pattern of AK's `checklist` section. It carries `zigoals:nova-stage:v1` and, from `zigoals:nova:v1`, the layout and the arranged (pinned) widgets; every other field of `zigoals:nova:v1` (the side bars' state, the persona, the names, the instructions, the wake phrase, the start page, the opening) stays on each device (`deviceFields`). Consent: the account's (nothing in it is Health data: a request's words are the person's own, as a note's are; widgets carry kinds and ids, never figures). Effective once the owner redeploys `private-sync`; until then, and on the public Alpha, nothing travels and NOVA says "On this device only".
- **D19 A phone's requests on the computer.** A request asked on a phone is kept in `asks` with its widgets; with sync, the computer shows it under Requests ("from your phone") and one tap makes its widgets there. Nothing is projected by itself.

### Shape of the code
- **D20 No new dependency, no budget change.** WebGL, Canvas, SVG and CSS by hand. The star, the widget kit, the summon step, the weather module and the city list are chunks loaded after first paint or on use; `/app/nova` stays inside 458 kB.
- **D21 Rename (O4).** "Make NOVA yours" keeps the name field; it is labelled "Premium · free during the Alpha" and linked to Plans. No gate.
- **D22 Protected surfaces.** Nothing outside NOVA's own page, its side bars, its guides and its entries is redesigned. A "Back to NOVA" return on a page opened from a widget is the browser's Back (the stage is restored as it was).

## Lessons carried in
- The time of day and the weekday are test conditions (AL). NOVA's specs set the clock.
- Prove on an empty profile and on the Showcase (AL lesson 3), at 1440, 1024 and 390 px, in Nebula, Light and Dark.
- A lane that moves copy runs `vitest run scripts` (AL).
- AI changes need phrasing families in English and Dutch, with and without a model (AL lesson 6).

## Closing table
Filled at the end of the session (each part: commits and evidence).

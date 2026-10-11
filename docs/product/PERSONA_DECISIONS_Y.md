# Persona decisions (Session Y Part 7): twelve items, options and a recommendation each

**For the owner, about 15 minutes.** Each item below comes from X-Cloud's persona round (`docs/verification/x-cloud/PERSONAS_X.md`)
or its live pass, and was left as an owner decision. Each has two or three options with what a person sees, the effort,
the tier, what it does to data and sync, the risk and a recommendation. Fill in the one line "Owner answer" and Session Z
(or a later session) builds it. Nothing here is built. The "after" screenshots are **MOCK**: this branch's production
build, patched in the browser at capture time by a script kept in a scratch folder (styles and text only, never app
code, never on this branch), each image marked "MOCK" in its corner. They live on the orphan branch
[`review/session-y-screens`](https://github.com/reyals1111-ux/ZIGoals/tree/review/session-y-screens) (desktop 1440,
tablet 1024 where the item is about it, phone 390; before and after; the Showcase's records). Evidence labels as in
docs/STATUS.md.

**Effort:** S (under a day), M (one to three days), L (more). **Tier:** as in CONTRIBUTING (1 docs, 2 visible, 3 risky
areas). Every option here keeps the stored data as it is unless its row says otherwise.

**Screens** (`review/session-y-screens` at `6797283`; MOCK marked in each "after"; local production build, 2026-10-10):

| Item | Folder | Widths |
|---|---|---|
| 1 | [01-today-column](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/01-today-column) | 1440, 1024 |
| 2 | [02-phone-banners](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/02-phone-banners) | 390 (and the sheet open) |
| 3 | [03-crypto-words](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/03-crypto-words) | 1440, 390 |
| 4 | [04-goal-currencies](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/04-goal-currencies) | 1440, 390 |
| 5 | [05-money-systems](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/05-money-systems) | 1440, 390 (full page) |
| 6 | [06-delete-habit](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/06-delete-habit) | 1440, 390 |
| 7 | [07-lb-history](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/07-lb-history) | 1440, 390 (full page) |
| 8 | [08-grouping](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/08-grouping) | 1440, 390 |
| 9 | [09-goal-cards](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/09-goal-cards) | 390 (full page) |
| 10 | [10-habits-ask-zigi](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/10-habits-ask-zigi) | 1440 |
| 11 | [11-help-nav](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/11-help-nav) | 1440 (full page), 390 (More) |
| 12 | [12-floating-buttons](https://github.com/reyals1111-ux/ZIGoals/tree/67972831/12-floating-buttons) | 390, Showcase |

## 1. Today's empty right column in the non-financial layouts (two layouts)
"Habits + Health" and "Habits only" leave Today's right column empty on desktop and tablet, because that column holds the
Wealth modules.
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. One column, centred, at a reading width (recommended)** | Today reads as one calm column (max about 760 px) in those two layouts; the financial layouts are unchanged | S, Tier 2 (desktop and tablet freeze: these two layouts change on purpose) | None | Long Today pages scroll a little further |
| b. Move "For you" and the week into the right column | Two columns stay, the right one holds the week and the suggestions | M, Tier 2 | None | Reorders the accepted Today on desktop; the phone order must stay as is |
| c. Keep as is | — | — | — | The empty column reads as something failed to load (s02, s45) |
**Owner answer: ___**

## 2. Phone status banners filling the first screen
On a phone, the testnet bar, the mode strip and page notices can take about half of the first screen (s02, s08, s17, s22).
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. One compact status line, details on tap (recommended)** | A single 44 px line ("Demo · no real money") that opens a sheet with the full notices | M, Tier 2 (phone only) | None | A notice is one tap away instead of on screen; the testnet warning must stay visible somewhere on every page (it does: the line) |
| b. Dismiss each banner for the session | Banners as today, each with a close button | S, Tier 2 | A session-only flag | A dismissed warning returns on every visit |
| c. Keep as is | — | — | — | Half the first screen is chrome |
**Owner answer: ___**

## 3. Crypto words for people without crypto
"No crypto needed" meets: the testnet banner, Keplr, ZIG, "Give your ZIG a purpose", "Local demo" (s01, s03, s04, s05, s29).
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. Plain words by default, crypto words where a person chose crypto (recommended)** | Without a wallet: "Practice money (no real value)" instead of the testnet banner, "Demo records" instead of "Local demo", Today's hero "Give your savings a purpose"; with Keplr connected, today's words | M, Tier 2 (copy in the shell, Today and Goals) | None | Two vocabularies to keep in step; tests assert both |
| b. A one-line glossary under each crypto word | Today's words with a small "What's this?" | S, Tier 2 | None | Adds text instead of removing confusion |
| c. Keep as is | — | — | — | People without crypto read a crypto app |
**Owner answer: ___**

## 4. Goal currencies beyond USD and EUR
Goals, the setup and Portfolio offer only USD or EUR (s01, s03, s14, s15, s34).
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. Add GBP and CHF, priced the same way (recommended)** | Two more currencies in the Goal setup and Portfolio | M, Tier 3 (data formats: a position's `quoteCurrency` accepts USD and EUR only; the market coordinator's quote currencies) | A goal already stores its currency as text, so a GBP goal needs no format change; a position quoted in GBP does: #32–#34 would refuse such a record as unreadable, so it needs the versioned-reader pattern first | Market quotes in GBP/CHF must exist for every listed asset |
| b. Any ISO currency, manual valuation only | Every currency, with "prices are yours to enter" outside USD/EUR | L, Tier 3 | As (a), plus manual FX records | Mixed automatic and manual totals are easy to misread |
| c. Keep USD/EUR, say so in Known limitations | A sentence in Help | S, Tier 1 | None | People outside the euro and dollar areas convert by hand |
**Owner answer: ___**

## 5. Accounts and assets as two money systems (+ Portfolio)
Wealth has accounts and debts (balances) and assets (holdings); Portfolio and the evidence portfolio are two more views
(s14, s15, s17).
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. One "What you have" list with filters (recommended)** | Wealth lists accounts, assets and debts together with a filter row (All · Accounts · Assets · Debts); Portfolio stays the analysis view, linked from it | M, Tier 2 | None (presentation only) | A long list for people with many holdings |
| b. Merge accounts into assets as a "Cash account" asset kind | One system | L, Tier 3 (data migration) | A format change both ways; rollback needs a reader | Highest risk; not recommended before friends |
| c. Keep as is, explain the split on Wealth | One sentence and a link | S, Tier 1 | None | The two systems stay |
**Owner answer: ___**

## 6. Deleting a habit
Archiving is the only way to remove a habit today; it keeps the history (s09).
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. "Delete habit" inside the archive, with its history, after a typed confirmation (recommended)** | In Archived habits, each habit gets "Delete for good"; confirm by typing its name; Undo for ten seconds | M, Tier 3 (data: a deletion that sync must carry) | Sync's merge already carries deletions (edit/delete conflicts are reviewed); the deleted habit's check-ins go too | A deleted habit cannot come back after Undo; Goal links to it are removed |
| b. Delete straight from the card's menu | One step closer | M, Tier 3 | As (a) | Easy to lose years of history by mistake |
| c. Keep archive only, say so in Help | — | S, Tier 1 | None | People expect a delete |
**Owner answer: ___**

## 7. lb and fl oz in history
Choosing lb or fl oz changes only the inputs; history, charts and summaries stay in kg and mL (s33).
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. Display everywhere in the chosen unit, store as today (recommended)** | Weight history, Health charts and the weekly review read lb or fl oz when chosen | M, Tier 2 (display only; the stored grams and millilitres stay) | None | Rounding in display (one decimal for lb, whole fl oz) must never be written back |
| b. Store in the chosen unit | — | L, Tier 3 | A format change; sync between devices with different units | Not recommended |
| c. Keep as is | — | — | — | Half-converted screens |
**Owner answer: ___**

## 8. Grouping asset quantities ("300000 ZIG")
Asset quantities print without grouping ("300000 ZIG"), while values are grouped.
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. Group quantities in the person's locale (recommended)** | "300,000 ZIG" (en), "300 000 ZIG" (fr); inputs stay ungrouped | S, Tier 2 | None | Copy-paste of a grouped quantity into an input is refused today (QA2 rule: grouped amounts are refused, never guessed); the input keeps showing the ungrouped form |
| b. Group only above 9,999 | "300,000 ZIG", "1500 ZIG" | S, Tier 2 | None | Inconsistent |
| c. Keep as is | — | — | — | Long numbers are hard to read |
**Owner answer: ___**

## 9. Goal cards about 607 px tall on phones (J053)
On a phone each goal card is about 607 px tall; the charter hoped for a third of a screen.
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. A compact phone card (name, ring, next step), details on tap (recommended)** | About 240 px per card; the plan, milestones and history open in the goal's page | M, Tier 2 (phone only; the accepted desktop/tablet Goals stay) | None | One more tap to see milestones on a phone |
| b. Collapse the plan and milestones inside the card | The card opens in place | S, Tier 2 | None | Still tall once opened |
| c. Keep as is (the accepted baseline) | — | — | — | Three cards need five screens |
**Owner answer: ___**

## 10. Habits' per-card "Ask ZIGi" in the three-column layout
In the three-column Habits layout every card carries "Ask ZIGi", crowding the cards.
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. Move it into each card's menu, keep one "Ask ZIGi about my habits" at the top (recommended)** | Cleaner cards; the question about one habit is in its menu | S, Tier 2 | None | One more tap per habit question |
| b. Show it on hover and focus only (desktop) | Hidden until needed | S, Tier 2 | None | Hidden actions are harder to discover; touch screens need another path |
| c. Keep as is | — | — | — | Crowded three-column layout |
**Owner answer: ___**

## 11. Help in navigation, and the footer's "Report a bug" (persona row 21)
Help was missing from the sidebar and More; "Report a bug" went to GitHub. X-Cloud fixed both partly (Help reachable;
feedback by mail). What is left: where Help sits, and the footer link's words.
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. Help as the last item of the sidebar and of More; the footer says "Send feedback" (recommended)** | Help is always one tap away; the footer opens the feedback form | S, Tier 2 | None | One more sidebar item |
| b. Help only in Settings and the footer | — | S, Tier 2 | None | Harder to find |
| c. Keep as is | — | — | — | — |
**Owner answer: ___**

## 12. Floating buttons in a phone's first-screen corners (persona row 26)
The music button and ZIGi's launcher float in the phone's corners and can cover "+ New habit" or other first-screen
actions in the Showcase (X-Local's resting place, S81, keeps the launcher clear on most pages).
| Option | What a person sees | Effort, tier | Data and sync | Risk |
|---|---|---|---|---|
| **a. One floating button: ZIGi; music moves into ZIGi's menu and the More sheet (recommended)** | A single corner button | M, Tier 2 (phone) | None | Music is one tap further |
| b. Both float, never over a first-screen action (each page reserves its corner) | Both stay | M, Tier 2 | None | Page-by-page layout rules |
| c. Keep as is | — | — | — | Covered actions on some pages |
**Owner answer: ___**

## Other owner decisions (owner edit 7; text only, no mocks)

### A5 — a global daily ceiling on sign-in emails (FIX_PLAN A5, Q-AUTH-07)
Today the admission Worker (`workers/auth-abuse`) limits sends per address and per network group (/64), with no
project-wide ceiling. Resend's free plan sends at most 100 emails a day (`docs/business/COST_MODEL.md`, source 2026-09-24). FIX_PLAN A5
(`docs/security/review-2026-10/FIX_PLAN.md`) leaves the number to the owner.
| Option | What a person sees | Effort, tier | Risk |
|---|---|---|---|
| **a. 60 codes a day across the Alpha (recommended)** | Nothing, until the 61st request of a UTC day: "Sign-in codes are paused for today; try again tomorrow." Codes already sent still work | S, `[TIER 3] (Workers)` in the admission Worker, a Miniflare test (N+1 sends from distinct /64s) and IPv6 /48 grouping for sends | A burst of real sign-ins on a busy day waits until tomorrow; with an invite-only Alpha of about 10–20 people (two or three codes each on a first day) 60 leaves room for the owner's own tests and stays well under Resend's 100 |
| b. 90 a day | As (a), later | S, same | Closer to Resend's 100: an abuser can still spend most of the day's free quota |
| c. No ceiling (today) | Nothing | — | A distributed abuser can exhaust the free quota and block every real sign-in for the day |
**Owner answer: ___** (a number; Session Z or a later session builds it).

### A6 — a step-up for destructive actions and an expiry on remembering (FIX_PLAN A6, Q-AUTH-04)
| Option | What a person sees | Effort, tier | Risk |
|---|---|---|---|
| **a. Step-up with the recovery secret, remembering expires after 30 days (recommended)** | "Delete cloud data", "Delete account", "Delete section", "Revoke other sessions" and "Rotate" ask for the vault recovery secret first (already needed to open the vault on a new device); a remembered device asks for the secret again 30 days after it was remembered | M, `[TIER 3] (auth/sync)`: server-side refusal without the step-up (Miniflare), the expiry read from the record's `createdAt` | One more step for rare actions; a monthly secret entry on remembered devices |
| b. Step-up with a fresh email code, remembering expires after 90 days | The same actions send an email code first | M, plus an email per action (counts against A5's ceiling) | A stolen inbox is enough to delete; email delays |
| c. No step-up, no expiry (today) | Nothing | — | An unlocked device left open can delete the cloud data or revoke the owner's other sessions |
**Owner answer: ___**

### C4 / FIX_PLAN check 9 — mainnet reads on the public Alpha
`/api/positions` reads testnet positions today; reading mainnet addresses on the public Alpha means real balances are
fetched for any address typed in, by this server, under the Alpha's rate limits.
| Option | What a person sees | Effort, tier | Risk |
|---|---|---|---|
| **a. Testnet only on the public Alpha (recommended for now)** | Unchanged: mainnet tracking stays manual (typed quantities) | S: the 60 s cache, the paginated validator list and a rate limit land as planned, mainnet refused with a plain sentence | People with mainnet ZIG keep typing their holdings |
| b. Mainnet reads, read-only, cached 60 s per network and address, rate-limited | Mainnet balances appear for an address the person adds | M, `[TIER 3] (Workers/app API)`, a counting-fetcher test (≤10 upstream calls per request) | A public endpoint that fetches any mainnet address: abuse, cost and privacy (addresses in server logs, which the app does not keep) to weigh |
**Owner answer: ___**

### A home GPU by `.local` name (ADR-017 S20, ADR-016 X24)
A person's own model (Ollama) on their home network, reached as `http://<box>.local:<port>` from Chrome 142+ (Local
Network Access, `targetAddressSpace: 'local'`).
| Option | What a person sees | Effort, tier | Risk |
|---|---|---|---|
| **a. Not now (recommended)** | ZIGi's local options stay: Chrome's on-device model, a server on this computer (`127.0.0.1`/`localhost`) | — | People with a home GPU run the model on the computer they browse from |
| b. Allow `.local` names only | A "Home network (name.local)" choice in ZIGi's setup, Chrome 142+ only | M, `[TIER 3] (security/CSP)`: `connect-src` gains `http://*.local:*`; the Alpha gate and the CSP tests change | Any `.local` device on the person's network becomes reachable from the app's origin (plain http, no certificate): a compromised page could probe it; Safari and Firefox lack Local Network Access |
| c. Raw private IPs or an HTTPS proxy on the box | — | L | Wider `connect-src`; proxies need certificates the person must manage |
**Owner answer: ___**

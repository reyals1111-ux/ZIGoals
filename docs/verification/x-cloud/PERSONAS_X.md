# Session X P2.1 — Fresh-eyes persona round

Evidence: local (production build `PUBLIC_ALPHA_UNDEPLOYED`, `next start`), 2026-10-08, 09:31–10:31 UTC.

## How it ran
An independent agent ran the sessions. It had not seen the code, the design notes or anyone's earlier findings, and it
read only one file: the fictional export fixtures it used to build import files. It drove the browser with its own
Playwright scripts. Every `/api` request got a 503 fixture, every non-local request was blocked, and all data was
fictional.

It ran 45 sessions across eight personas:
1. a new user who knows nothing about crypto
2. a habit enthusiast
3. a health tracker importing Apple Health and Google Takeout exports
4. a wealth tracker with five currencies
5. a keyboard-only and screen-reader user
6. a phone-only user (iPhone 13)
7. a traveller (Brussels, New York, Tokyo, and across midnight and the end of daylight saving)
8. a friend opening an Alpha invite

Viewports were 1440, 1024 and 390, on an empty device and on the Showcase. The server restarted twice; sessions s25
and s34 straddled a restart and were finished after it. Screenshots and notes stayed in the agent's scratch folder
(fictional data only); they are not part of the repository.

## Outcome by issue
Severity is the agent's: **B** broken, **C** confusing, **U** unfinished, **P** polish. "Fixed" means fixed in this PR
with a regression test in `tests/persona-x.spec.ts` or a unit test, unless the row says otherwise.

| # | Sev | Issue (sessions) | Outcome |
|---|---|---|---|
| 1 | B | Complete, then Undo, marked today "Failed" on Habits and Today; a weekly habit showed "Partial" (s19, s20) | **Fixed** (`lib/habits.ts`). An undone check-in leaves a 0, and today with nothing done is Due, with any note kept. A logged 0 is no progress in a week. Past days are unchanged (a 0 is still Failed). Unit and browser tests. |
| 2 | B | Records added in the Showcase vanish on exit with no warning; Exit lands on Settings (s29, s30) | **Fixed.** The banner says "anything you add here stays in the demo when you exit", and Exit returns to Today. The demo keeps its own storage by design. |
| 3 | B | Funding a EUR Goal defaulted to "USD Cash", then hit a dead end and saved a EUR asset named "USD Cash" (s03, s15) | **Fixed.** A value Goal's contribution opens the picker in the Goal's currency, and the suggested name follows the currency until the person types one. A refusal now gives the reason (ZIGoals never converts currencies) and what to choose, not an action the screen doesn't offer. |
| 4 | B | "Connect Keplr" without the extension switched the app into Testnet mode and dropped the demo balance (s01) | **Fixed** (`goal-provider.tsx`). Without the extension nothing switches; only the reason is shown. |
| 5 | B | The "Habits + Health" layout said "Health-only layout"; a blank first hero icon; an empty right column (s02, s45) | **Fixed:** the line names the areas shown ("Habits and Health", "Habits only", "Health only"). **Not reproduced:** the icon draws in a still frame; the screenshot caught its entrance animation. **Owner decision:** Today's right column is empty in the non-financial layouts; Today's layout is the protected baseline. |
| 6 | B | A debt payment doesn't lower the balance, and an overpayment is accepted (s16) | **By design.** The balance follows the statement, and the confirmation says "Enter the new balance when your statement shows it". The "usual" figure and the plain "300 USD a month" follow the app's style for figures people type, as on Goals. |
| 7 | B | Activity put records under the wrong day in another time zone; its Health filter left water out (s26) | **Fixed.** Day headings and times follow the journal's zone when one is chosen, as Habits and Health do. Water entries appear under Health. Sleep and meditation keep their own histories on Health; adding them would load their code on Today. |
| 8 | B | Phone: the net-worth heading squeezed into a 117 px column (s17) | **Fixed** (`phone-wealth.css`). The accounts heading's button goes under the text, and the title keeps the card's width. |
| 9 | B | Wrong or inconsistent numbers (s08, s10, s12, s13, s15, s29, s31, s38) | **Fixed:** the Health week's water reads whole mL, not "986.588". One Goal read 42%, 41.7% and 41.66%; the Goals timeline and the weekly review now use the ring's figure. Habit counts are grouped like other everyday numbers ("8,000"). **Kept:** 60 g at 372 kcal/100 g reads 224, because a food stores whole kcal per serving; finer storage would be a data-format change. The kg value of an imported lb reading is exact ("69.989 kg"); see row 20. Asset quantities stay ungrouped ("300000 ZIG"), the recorded convention for exact quantities (`formatPlainDecimal`, asserted by a dozen specs); an owner decision if grouping is wanted. |
| 10 | C | Accounts and assets are two money systems; Portfolio and the evidence portfolio are two more (s14, s15, s17) | **Owner decision** (product structure). |
| 11 | C | Goals, the setup and Portfolio offer only USD or EUR (s01, s03, s14, s15, s34) | **Owner decision** (Goal currencies are a product limit; Known limitations names it). |
| 12 | C | Crypto words despite "No crypto needed": the testnet banner, Keplr, ZIG, "Give your ZIG a purpose", "Local demo" (s01, s03, s04, s05, s29) | **Owner decision** (positioning; the shell and Today are the protected baseline). |
| 13 | C | Phone: status banners fill about half of every first screen (s02, s08, s17, s22) | **Owner decision** (the phone shell's chrome); listed with handoff H7. |
| 14 | C | First-timers are offered a review of the week before they began, and "What's new" (s01, s41) | **Fixed:** a week that ended before the person began (nothing recorded in it, no habit due in it, no Goal made by its end) isn't offered for review; every later week is, as designed, and a draft always comes back. The Guide follows the same state. **Kept:** "What's new" after the welcome, because the welcome's Not now, Skip and an empty Finish write only the seen flag (a recorded rule, `tests/onboarding.spec.ts`); the card is dismissed once. "See how it works" opening the brand film is the owner's design. |
| 15 | C | Habit wording: "Every day · Avoid times", "0 / 0 times per day", "3× per week · 1 per week" (s06, s07, s09) | **Fixed.** A quit habit reads "Avoid completely" (or "Avoid <unit>") and "0 times today". A several-times-a-period habit drops the meaningless "1 per week" (a larger target reads "each time") and counts "today"; a once-a-period habit keeps "500 USD per month". Partial past days counting as Failed is the target rule. A counter's +1-only control is a feature request. |
| 16 | C | Vacation said "marked for 6 habits" when weekly habits got no days; no bulk removal later (s06) | **Fixed:** the message names the habits that got days and says why the weekly or monthly ones didn't. Clearing a range right after marking exists; clearing it later is a feature request. |
| 17 | C | No way to delete a habit (s09) | **Owner decision** (archive is the deletion path today, which keeps history). |
| 18 | C | A Loop import added "Meditate" and "Run" beside existing habits with no warning (s32) | **Fixed:** the preview names exported habits that share a name with one already here, and says they come in separately (habits are matched by Loop's own id, never by name). |
| 19 | C | Validation: "3,250.40" got "Enter a non-negative decimal amount."; an empty Goal target the same; currency "XYZ" accepted (s01, s03, s12, s14, s15) | **Fixed:** a grouped amount is still refused (never guessed), now with the reason and the text to type ("Type “3,250.40” without the thousands separator: 3250.40."). An empty target says "Enter your target." **Kept:** any three-letter code is accepted, because accounts keep each currency as typed and nothing converts. Error messages are announced, but marking the field itself is noted for a later pass. |
| 20 | C | lb and fl oz change only the inputs; history stays in kg and mL; several time-zone settings (s33) | **Owner decision** (unit display is a feature; the zone layering is ADR'd in TIMEZONE_PHASE4_DECISIONS). |
| 21 | C | Help missing from the sidebar and More; "Report a bug" goes to GitHub; Settings says sync keeps your records when sync is off; desktop install leads with iPhone (s05, s22, s29) | **Fixed:** Export everything says the encrypted backup, and account sync where it is on, keep your records. **Owner decision:** navigation and the footer link. |
| 22 | U | Unstyled browser file inputs and radios (s11, s02, s13) | Noted (polish for a later pass; the controls work and are labelled). |
| 23 | U | Editing an asset can't change its unit; an archived asset reads "Holding value Unavailable" (s44) | Feature request; the archived value is honest ("Unavailable", never zero). |
| 24 | U | No confirmation after Export everything; a completed habit isn't announced; the Goal wizard drops focus between steps (s19, s21, s35) | **Fixed:** each wizard step takes focus, and a habit's new state is announced politely. Export everything already confirms ("Your export is ready and downloading"). |
| 25 | P | Wording | **Fixed:** "1 records of 1 other kinds", "(1 days)", "Etc/GMT+4" (now "UTC−04:00"), "From fitbit" and other source codes (now "Fitbit", "Oura (linked)"…), a repository path shown in the importer, "Favorites" (now "Favourites", as elsewhere), "Manual value · Manual value" on Wealth, "MANUAL · MANUAL" on Staking, "DATA & PRIVACY" twice in Settings, "Add Meditate today to Today" (now "… check-in to Today"), "Close" for ending a health goal (now "End goal"), imported weights under "Manual readings" (now "Your readings"). **Kept:** the goal card's art label beside its eyebrow (the card's accepted design), a Contribution entry's category chip beside its title, "liters" (the habit's own unit), and "PUBLIC_ALPHA_UNDEPLOYED", which only a local build shows. |
| 26 | P | Phone layering: the music button over "+ New habit" in the Showcase; the translucent sticky header (s04, s08) | **Owner decision** with H7 (floating buttons in a first screen's corners); the header is the protected phone shell. |

The ZIGi findings (the launcher's overlap, a suggestion chip that loops, focus after Send with the mouse, spacing) were
handed to X-LOCAL as handoff H10. X-LOCAL fixed the chip and the focus (ADR-017 S71); the launcher's overlap stays an
owner decision with H7. The goal page's spacing was in this lane's markup and is fixed here (the badge keeps 12 px from
"Ask ZIGi about this goal", tested); the per-card "Ask ZIGi" in the three-column Habits layout is an owner decision.

## Also found while fixing
- `tests/music.spec.ts:75` failed 1 run in 5 on its own. The music panel moved focus in an effect keyed on `open`
  alone, which could run before this device's music settings were read (when the panel draws nothing) and never run
  again. It now waits for the panel to be drawn.

## What worked (the agent's words, condensed)
Keyboard and screen-reader basics (skip link, a visible focus ring, dialogs that take and return focus, one h1 per
page); offline honesty (every 503 handled, unknown never zero); the importers' previews, duplicate handling and undo;
time handling (midnight rollover, a night across the clock change, the saved home zone); reminders, auto check-ins,
challenges, stacking, the sleep flow and the meditation timer; phone forms with the keyboard open; Quick add's honest
"I didn't understand that yet"; the Showcase's banner and per-tab separation; the feedback email's optional device
details.

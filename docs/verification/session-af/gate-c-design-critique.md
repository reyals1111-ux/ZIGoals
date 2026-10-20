# Session AF Gate C — design critique (G12, review 2 of 3)

Tue 20 Oct 2026, 15:12–18:10 Brussels. Three fresh, read-only reviewers looked at the after captures of the final code
(`cac3b73e`, the Checklist redesign merged; a local production build, Chromium headless, the Showcase, fixed clock Fri 16 Oct
2026 09:30 UTC, Earn from its recorded answers, every other `/api` call 503): 17 pages in Nebula, Light and Dark at 1440,
1024, 768 and 390 px in viewport-high clips, the linked-wallet states, Today's market watch at 320–1920 px, and the
Checklist's final design set — each beside the captures of `main` before this session. One reviewer per area: the money
pages; Today and the extras; the pillar pages, the shell and the copy. One fix round followed, split by area so no two
writers shared a file (ADR-028 H137): helper A the money pages, helper B Today and the extras, helper C the shell, Help and
the pillar pages; the lead took Light and the theme generator, the public-safety wording and the capture tool. Captures:
`review/session-af-screens` (`after/`, re-shot on the fixed build).

Evidence label: design review of screenshots (not a usability test, not a device).

## Verdicts before the fix round
- Money pages: premium in Nebula and Dark at 1440; Light, 768 and 390 fell short (matte pieces, a squeezed tablet hero,
  launchers over controls, a clipped phone table, a ragged phone grid); Wealth's disagreeing categories the one content defect.
- Today and the extras: not premium at every width — two Today cards broken in every theme (the Checklist card at 1024,
  My universe at 768 and 1440) and the Day timeline's controls under the launchers at 1024.
- Pillar pages, shell, copy: Nebula and Dark one premium product at every width; Light still deepened some non-text
  colours and had one unreadable figure; the launchers over controls, the sidebar losing Settings and Help at 900 px and
  Help's broken link wrapping kept the shell and the copy pages from feeling finished.

## Findings and what happened to them

| Area | Finding (severity) | Outcome |
|---|---|---|
| Today | Checklist card at 1024: Continue over the NEXT label, spilling past the panel (high) | Fixed (B): the card's layout follows its own width (a container query); 390/768/1440 unchanged |
| Today | My universe at 768/1440: planets 191 × 200 px in a 72 px row, over the names and the line (high) | Fixed (B): the picture is exactly the row's height, planets scaled inside, names 8 px below |
| Timeline | Launchers over "Give it a time" and a note at 1024 (medium-high) | Fixed (B): the launcher lane (64/72 px) while they are on the right; 1440 unchanged |
| Market watch | "ZIG"/"SOL" badges wider than their tiles (medium) | Fixed (B): 11 px letters in letter orbs |
| Market watch | A missing price said four ways; "Current" beside "Not verified yet" (medium) | Fixed (B): "Price unavailable" once; "24h change not verified yet" when only that is missing |
| Market watch | Wrapped names push prices down; chip placement varies; breaks at "·" (medium) | Fixed (B); Solana alone on the last row left (no clean fix) |
| Stories | Each cover shows its number twice (medium) | Fixed (B) |
| Journey | My universe on a phone: 25 px planets, a label on the wrong planet, a beige Wealth planet in Light (medium) | Fixed (B): a 2 × 2 grid on phones; an unlit planet dims over a dark shade of its own colour |
| Today | 1024/1280: the rail's column reserved after it ends (medium) | Fixed (B): For you spans both columns after them |
| Today, Journey | Four "your week" cards with three windows and different counts (low-medium) | Fixed (B): every window named and what each counts said; the counting rules unchanged |
| Today | The timeline card leaves out a Checklist planet (low) | Fixed (B): it reads the registered sources (still three rows) |
| Today | Bare "Hide" bars; three fold styles on phones (low) | Fixed (B): "Hide 6 cards" with the shared hint; the phones' paired chips keep their chevron (an earlier decision) |
| Today | Waiting mini planets pastel; door icons faint in Light (low) | Fixed: planets flat in their own hue (B); the three door tiles became night islands (lead) |
| Today | Guide's actions and What's new cramped on phones (low) | Fixed (B): stacked below 480 px |
| Timeline | Ragged action column; "Change time" wraps (low) | Fixed (B) |
| Wealth | VOO filed under two classes; percentages at two precisions (high) | Fixed (A): one class map (`wealthClassOf`), shares to the basis point that add to 100 % |
| Wealth | Three totals that read as contradictions (medium) | Fixed (A): each labelled with what it counts and its date |
| Wealth | Donut classes hard to tell apart (medium) | Fixed (A): Stocks blue, ETFs violet, Property coral, Cash green, in every theme |
| Portfolio | The table clipped and scrolled sideways on phones (medium) | Fixed (A): one stacked card per holding below 480 px |
| Staking | Six "—" tiles in a ragged phone grid (medium) | Fixed (A): one empty-state card until a wallet is linked |
| Wealth | The hero squeezed at 768 and on computers (medium) | Fixed (A) |
| Money pages | Launchers over Governance's back button, Add money's step and Earn's disclaimer (medium) | Fixed (A): the lane on Governance and Add money; Earn's disclaimer and Add money's first line clear of ZIGi on phones |
| Earn | Icons borrowed from other meanings (medium) | Fixed (A) from the existing icon set (no coin, fuel, shield or percent icon exists; none added) |
| Earn | Permapod's caution reads as a button (medium) | Fixed (A): a full-width line above the links |
| Light | Matte pieces: Earn's keys tag, Wealth's chosen currency, Add money's faint rings (medium) | Fixed (lead): white, ink or deep gold words; rings that meet 3:1 (WCAG 1.4.11) |
| Portfolio | "Record a transaction" without an open marker (low) | Fixed (A) |
| Governance | The chosen tile unmarked; a repeated line like a third option (low) | Fixed (A): a checked ring; a small "Chosen network" note |
| Add money | "What's this?" links between tiles, misaligned (low) | Fixed (A): inside each tile's foot |
| Earn | Two navigations on phones, both starting "Start here" (low) | Fixed (A): the phone doors list only the ecosystem apps |
| Linked states | The linked-wallet captures showed no wallet (high, the capture) | Fixed (lead): the Showcase never reads a linked wallet, so the linked set is a device with only the wallet; re-shot |
| Help | In-sentence links unable to break; "(" stranded (high) | Fixed (C): inline at the sentence's size; standalone links keep 44 px |
| Settings | "About this alpha" said the Alpha does not support mainnet (high) | Fixed (lead, `TIER 3 (public-safety labels)` `deba704d`) |
| Goals | "72 % balance" black on a navy disc in Light (high) | Fixed (lead): the balance wheel is a night island |
| Shell | Checklist, Settings and Help below a 900 px-tall window (medium-high) | Fixed (C): a smaller logo up to 1000 px tall; all 16 destinations show, Help ends at 864 px |
| Shell | Launchers over controls on the pillar pages (medium) | Kept, by the owner's earlier decision (they float over content; H137); an app-wide lane is an owner item |
| Light | Health's meal bar, Habits' rhythm bar and meters deepened; stars khaki (medium) | Fixed (lead): `--glass-ink` is a paint (the generator's name rule had read it as a word), the white sheen stays white, a deep gold star |
| Light | Health's counter icons washed out (medium) | Fixed (lead): the medallions are night islands |
| Light | A grey glow on Settings' mode line (medium) | Fixed (lead) |
| Footer | The phone ribbon through the step texts (medium) | Fixed (C): the texts stop 26 px short; the ribbon unchanged |
| Habits | Streaks beside empty days; a two-state legend (medium) | Fixed (C): skipped days explained as rest days; the legend shows every shade |
| Habits | Eyebrows wrap with "·" at a line start (low-medium) | Fixed (C) |
| Goals | A black ₿ on maroon; heavy dark ring tracks in Light (low-medium) | Fixed (lead): the cover art is a night island; ring tracks the day's neutral line |
| Health | "kcal logged" against the figure on phones (low) | Fixed (C) |
| Shell | The tablet navigation 8 · 2 · 6, a tagline only at 768, "Back to top" alone (low) | Fixed (C): rows 5 · 5 · 6, no tagline, one row |
| Help | Twenty chips before the first answer on phones (low) | Fixed (C): six plus "All topics" |

Copy audit (all three reviewers): fixed — "dots" → "planets" (timeline intro, badges, What's new), market types cased,
money in one format, one minus sign, distinct card titles, words kept whole, "Lit today", one date style for Stories,
plain source names and UTC on Earn, "relative difference", no repeated tile titles, curly apostrophes, plain units,
"Halfway", "Cost unknown", Help's question wording and topic names, ZIGi's one name, push described one way, Spotify
"invited accounts only, for now", "jailed" explained, Settings' strategy and storage facts in plain words. Left: Earn's
"5.06 %" (a no-break space keeps number and unit together, round 2) beside Wealth's "3.58%"; "Transactional local storage"
and Spotify's player error (pinned word for word by their specs); the favourites' type labels live in the market watch
(fixed there).

## Verification of the fix round
On the merged code (`25858cb2`): unit 5,895 passed (58 skipped); lint 0 errors; the three helpers' focused specs together
on one production build, Chromium, 2 workers: 994 passed, 0 failed (108 skipped: the other project's or WebKit's); theme
parity on every changed page 0 disallowed differences; every page within its weight budget. Each helper's moved assertions
are listed in the test audit (G12, review 3 of 3).

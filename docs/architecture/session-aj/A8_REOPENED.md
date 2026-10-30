# A8: every item Session AH recorded rather than changed (M41, M43, M47, AF13, H3)

Session AJ, item 24, owner amendment A8 (ADR-035). Each item has one status: **fixed** (in this change: the files), **protected** (the rule that keeps it), **not reproduced** (how it was checked), or **out of scope / owner** (why). Checked on `feature/session-aj-big-leap` at `6b043618`. No browser or build ran in this lane, so "not reproduced" rests on reading the code. Where it rests on Session AH's own browser probes, the row says so.

## How the list was built (re-check completeness with these)
1. The ADR-033 lines that cite the three readings and the two ids:
   `grep -n "M41\|M43\|M47\|AF13\|H3" docs/architecture/ADR-033-session-ah.md`
   This gives the readings (lines 106–114, 120–126, 143–150) and the closing-table rows 453, 454, 458, 461 (Part 11), 468, 471, 472, 476, 477, 479 (Part 12), and 491, 492, 493, 495, 499, 501, 504 (Part 13).
2. Every finding id that those rows give to M41, M43 or M47, which are the ids before "recorded (M41)", "(M43)", "M47" or "(M45, M47)". Every item the readings name without an id is listed too: the TO5 bullets, H3's two parts, AF13, E3, F1, F3, AF15's four parts and SE3. Ids the same rows mark as fixed are left out, except T-098 and M-133. M41 recorded those two, and Part 13 then fixed them.
3. What each id says. The Grok reports that hold the per-id text are not in the repository. Neither docs/ nor any review branch has them (`grep -rl "M-112" docs/` finds only ADR-033). The owner-approved scope file has each row's claims followed by its ids:
   `gh api -H "Accept: application/vnd.github.raw" "repos/reyals1111-ux/ZIGoals/contents/owner-scope/AH_SCOPE.md?ref=review/session-ah-scope"`, then
   `grep -n '^- \*\*\(TO5\|TO7\|TO11\|SE1\|SE3\|SE4\|SE5\|SE9\|SE10\|SE13\|LA5\|LA6\|LA7\|LA9\|E3\|F1\|F3\|H3\|AF13\|AF15\)\*\*'` (lines 146, 147, 151, 156, 158–160, 163, 164, 166, 174–176, 178, 234–236, 239, 274, 276).
   Some ids are tied to one claim by ADR-033 or another closing-table row: T-098/M-133, D-073, N-039, T-113, M-067, L-007/B-095, D-182 (ST4), D-192 (HA15), D-016 (also LA9) and M-128 (also SE1). Every other id is tied to a claim by its order in the scope row, marked *(inferred)*.

Count: 71 rows. **Fixed 6 · protected 26 · not reproduced 30 · out of scope / owner 7 · being built by the lead 2** (SE5 T-113 is item 18; E3 is item 20). SE3's remaining anchor gap is item 19 (lead); its rows count as "not reproduced" because Session AI already built the card.

## M41: Part 11 items recorded rather than changed
| id | what it says | where | status | evidence / reason |
|---|---|---|---|---|
| TO5 · M-112 | The Undo toast disappears after about 5 s *(inferred)* | `components/ui/undo-toast.tsx` | not reproduced | `TOAST_MS = 8000` (line 52). The timer stops while the pointer or focus rests on the toast. A named "Close message" button sits beside Undo. Checked in code. |
| TO5 · M-110 | The Checklist's 12-week history is missing on phones *(inferred)* | `components/checklist/checklist-page.tsx:199–203` | not reproduced | On phones it is a fold, "Orbit consistency · last 12 weeks", that loads when opened. The Checklist is also on the PROTECTED list. |
| TO5 · M-013 | The sticky bars leave about 55 % of a phone screen for the path *(inferred)* | `/app/checklist` | protected | PROTECTED list: the Checklist and everything AG Polish 1–3 shipped. Its top bar changed only under the owner's Part 18 exception (ADR-033 lines 39–40, M53). |
| TO5 · D-170 | The same sticky-bar share, on a computer *(inferred)* | `/app/checklist` | protected | Same as M-013. |
| TO7 · T-098 | Today shows Quick add twice (tablet top bar and hero) | `components/navigation.css:113` | not reproduced | Fixed after M41 by AH Part 13 (`f33fd251`; ADR-033 line 502): on Today the tablet top bar's copy steps aside. |
| TO7 · M-133 | Same duplicate Quick add | same | not reproduced | Same as T-098. |
| TO7 · D-134 | Today's right third is empty *(inferred)* | `/app` (Today) | not reproduced | Since Session Z, Today is one centred column when no rail card sits beside it. Help says so ("What else changed", `components/help/help-page.tsx:143`). |
| TO7 · D-016 | Today's hero feature row is clipped. The same id appears under LA9 as "the header differs per page" *(inferred)* | Today hero | protected | PROTECTED: the Today hero and slogan (AF9) and the approved page headers (accepted baseline rule, STATUS line 7342). |
| TO7 · D-028 | About 173 Tab stops on Today *(inferred)* | Today | out of scope / owner | Fewer stops means folding or merging Today's cards, a Today redesign that needs the owner (accepted baseline). The shell's skip link jumps to the content (ADR-034 E3 row). |
| TO11 · N-110 | Search results move while typing, so a click lands on "Ask ZIGi" | `components/search/search-palette.tsx:108–116` | protected | Owner request 36 put the pillar shortcuts "before typing" (the palette's own comment), and live results reorder by nature. By design: ADR-033 line 114. No small fix exists that does not change that design. |
| TO11 · N-139 | The pillar rows above the results leave on the first key *(inferred)* | same | protected | Same as N-110 (owner request 36; ADR-033 line 114). |
| H3 (swan) | Two swan logos on the first visit | `components/logo-intro.tsx`, sidebar mark | protected | PROTECTED list: the first-visit swan intro. ADR-033 line 112. |
| H3 (widgets) | Duplicate widgets on the first visit | `lib/dashboard-settings.ts:72` (`summary`, not hideable) | protected | By design: ADR-033 line 112. The "Widget summary" built-in collects the pinned widgets. Removing it would redesign Today (accepted baseline). |
| AF13 | Today repeats some facts across its cards | `components/dashboard/today-focus.tsx:77`, `today-dashboard.tsx:261` | protected | By design: ADR-033 line 113. Checked in code: the Focus habits tile steps aside when the habits widget shows (`!habitsWidget`). The other repeats come from the Widget summary, as in H3. |

## M43: Part 12 items kept as they are
| id | what it says | where | status | evidence / reason |
|---|---|---|---|---|
| SE1 · B-023 | Help says accounts and sync are not open, while Settings has sign-in and sync | `components/help/help-page.tsx` ("Where your data lives") | **fixed** | Fixed in this change: `components/help/help-page.tsx`, `components/help/install-guide.tsx`. On the Alpha, accounts are by invitation, and Help itself says only invited addresses can sign in (line 128). So "Before accounts open" / "Once accounts open" became "Without an account" / "With an account (by invitation during the Alpha)". No sentence any spec checks was changed. |
| SE1 · M-022 | Help says your data lives only on this device | same, and Install ("Protect what's on this device") | **fixed** | Fixed in this change: the same two files. The sentence now starts "Without an account, …". |
| SE1 · M-029 | The "backed up" and sync claims read as if accounts were closed *(inferred)* | same, and Export everything (line 290) | **fixed** | Fixed in this change: `help-page.tsx`. "(and, once accounts open, so does sync)" became "(and, with an account, so does sync)". |
| SE1 · B-108 | The Portfolio sync claim contradicts "accounts aren't open" *(inferred)* | `help-page.tsx:130`, `install-guide.tsx:28` | **fixed** | Fixed in this change: the same two files. The Portfolio sync answer (shown while `SYNC_WRITES` is on) now sits under the "With an account" wording. The Safari move reads "With an account, there's another way". |
| SE4 · D-133 | The changelog (release topics) crowds Help | `/app/help` | protected | By design: ADR-033 line 124 (H5). The 18 topics are checked exactly, in order, with their links (`tests/help-page.spec.ts:32, 38–61`). AH added a Help search with a result count instead. |
| SE4 · N-184 | 17 topic pills *(inferred)* | `components/help/help-topics.tsx` | not reproduced | On a phone, 6 topics show with an "All topics" button (AF Gate C; `help-page.spec.ts:41–51`). Computers list them all by design. |
| SE4 · M-126 | Cryptic anchors (`#aa`, `#ab`, `#abd`, …) *(inferred)* | `help-page.tsx:16–19` | protected | Specs check each topic's href (`tests/help-page.spec.ts:59`), and What's new and the feature panels link to `#help-aa-…`, `#help-af-…`. Renaming them would break those links. |
| SE4 · L-020 | Links without names *(inferred)* | `components/help/*.tsx` | not reproduced | Checked in code: every `<a>` and `<Link>` in Help has visible text, and the topic links carry their labels. |
| SE4 · Denver S-14 | Denver: take the release notes out of Help *(inferred)* | `/app/help` | out of scope / owner | Needs a new page and an owner call on H5. AH kept the notes (ADR-033 line 124), and the topic list is spec-checked. |
| SE5 · T-113 | Undo from the Activity log | `components/activity-feed.tsx` | being built in Session AJ item 18 (lead) | ADR-035 verify-then-do row SE5. Activity code was not touched in this lane. |
| SE9 · N-039 | The sidebar is scrolled after switching to Light | theme switch, sidebar | not reproduced | AH found no repeat at 360, 768 or 1440 px (ADR-033 line 126). Checked in code here: the switch sets only `data-theme` on `<html>` and swaps a stylesheet (`lib/ui-prefs/theme.ts:46–55`). The sidebar code has no scroll call (`components/app-nav.tsx`). |
| SE10 · M-067 | Help & diagnostics shows two contact addresses and a "leaked" build string | Help, Settings diagnostics, `docs/PRIVACY.md:73` | protected | By design: ADR-033 line 122. There is one address per purpose. contact@zigoals.app is for feedback and sign-in help (`help-page.tsx:128`, `lib/feedback.ts`). hello@zigoals.app is the private security contact, named as such beside it (`components/help/send-feedback.tsx:27`, as in SECURITY.md). Both are checked by `tests/help-page.spec.ts:128–136`. The build identity is documented in PRIVACY.md:73 and is part of the feedback email ("App version:", `tests/help-page.spec.ts:133`). |
| SE13 · L-007 | A Permissions-Policy warning on every page (`bluetooth=()`) | `lib/egress-policy.json` | protected | A security header (TIER 3 headers), checked by `lib/public-safety.test.ts:42`. Health uses Web Bluetooth (`bluetooth=(self)` on Health), so the feature is named on purpose. By design: ADR-033 line 121. |
| SE13 · B-095 | A manifest `enctype` warning | `public/manifest.webmanifest` | not reproduced | Checked in the file: `share_target` is `GET` with no `enctype`, so there is nothing to remove. `public/` is outside this lane anyway (PWA, TIER 3). |

## M47: Part 13 items recorded rather than changed
| id | what it says | where | status | evidence / reason |
|---|---|---|---|---|
| LA5 · D-174 | Light: the hero is a dark island *(inferred)* | Today hero | protected | PROTECTED: Light's dark islands and the Today hero (AF9). ADR-033 line 144. |
| LA5 · D-175 | Light: the wallet card is a dark island *(inferred)* | wallet card | protected | PROTECTED: Light's dark islands. |
| LA5 · D-177 | Light: gradient words wash out *(inferred)* | hero slogan | protected | PROTECTED: the slogan (AF9, accepted baseline). The owner took AF9 out of AH (scope file, "Owner, 25 Oct 22:37"). |
| LA5 · D-179 | Light: the Staking card is near-black *(inferred)* | `/app/staking` | protected | PROTECTED: Light's dark islands. ADR-033 line 437 (ST4) keeps Staking's hero card dark. |
| LA5 · D-181 | Light: the Ecosystem tiles are blank *(inferred)* | `/app/ecosystem` | not reproduced | Fixed in AH Part 9, as M47 records (ADR-033 line 144). Light gets logo tiles (WE15 row, `8a7e9727`). |
| LA5 · D-182 | Light: Staking's empty card (also listed under ST4) | `/app/staking` | protected | The size was fixed in `facc2b0f` (ST4). The dark ground is a Light dark island (PROTECTED). |
| LA5 · D-188 | Light: faint hover *(inferred)* | links, cards | not reproduced | LA10 fixed it in AH Part 13 (`f33fd251`): text links underline on hover everywhere. |
| LA5 · D-189 | Light: faint hover *(inferred)* | same | not reproduced | Same as D-188. |
| LA5 · D-233 | Light: the dock stays dark *(inferred)* | Earn dock | protected | PROTECTED: Light's dark islands (the dock, ADR-033 line 144). |
| LA5 · D-063 | Light: the Ecosystem glow and eyebrow *(inferred)* | `/app/ecosystem` | not reproduced | AF10, the owner's "calm the ecosystem header by day", lowered Light's glows in AH Part 13 (`f33fd251`; ADR-033 line 500). |
| LA5 · N-188 | Light on a phone: the dark islands (hero and wallet) *(inferred)* | phone | protected | PROTECTED: Light's dark islands and the Today hero. |
| LA5 · N-189 | Light on a phone: the dock stays dark *(inferred)* | phone | protected | PROTECTED: Light's dark islands. |
| LA6 · D-192 | Dark: white numbers on pale heatmap cells | Habits heatmap | not reproduced | Fixed in AH Part 7 (`e6e55ec4`, HA15 D-192): the level follows the day's share, with per-theme colours (`themes/{light,dark}.ah-habits.css`). |
| LA6 · D-198 | Dark: grey footnotes of about 10 px | all pages | not reproduced | Checked in code. `grep -rnE "font-size: ?(([0-9]\|1[01])(\.[0-9]+)?px\|0?\.[0-6][0-9]*r?em)" --include=*.css components app` finds no footnote under 12 px. It finds only the "%" inside progress rings (`components/ui/premium.css:31`, the exception ADR-033 line 145 names), the 11 px initials in letter orbs, the Earn illustration's SVG labels, a badge digit and the Alpha notice's bold line under 360 px (that notice is replaced in item 17, lead). |
| LA6 · D-196 | Dark: column widths differ between pages *(inferred)* | unnamed pages | out of scope / owner | The finding names no page or width. Checking it needs a browser layout measurement, which this lane may not run. AH's probe found no clipping at 375–1280 px (ADR-033 line 130). |
| LA6 · D-194 | Header icons differ per page | page headers | protected | The approved page headers (accepted baseline rule, STATUS line 7342). "Pages keep their own header icons": ADR-033 line 145. |
| LA7 · L-080 | An invalid `<dl>` on Portfolio *(inferred)* | `components/portfolio/portfolio-coin-view.tsx:81,89,133` | not reproduced | Checked in code: each `<dl>` holds `<div><dt><dd>` groups, which is valid HTML. AH's probe found no invalid `<dl>` (ADR-033 line 131; E2 already fixed). |
| LA7 · N-119 | The Checklist launcher sits outside any landmark *(inferred)* | `components/checklist/checklist-launcher.tsx` | protected | PROTECTED: the Checklist and everything AG Polish shipped. A floating launcher, like ZIGi's. It is named "Open the Checklist: today's path". |
| LA7 · N-187 | Duplicate landmarks *(inferred)* | cards | not reproduced | AH probe (ADR-033 line 131): the repeated "header" elements are card headers, not page landmarks. |
| LA7 · N-190 | Live regions *(inferred)* | shell | not reproduced | Checked in code: the one toast region is `role="status" aria-live="polite"` (`undo-toast.tsx`), and Help search and the search palette announce counts in a status. AH probe: ADR-033 line 131. |
| LA7 · N-124 | Focus after save *(inferred)* | forms | not reproduced | AH M24 (ADR-033 line 79): forms with field errors mark and focus the field, and a confirm takes focus where it opens. |
| LA7 · N-176 | Toasts cannot be dismissed from the keyboard *(inferred)* | `components/ui/undo-toast.tsx` | not reproduced | Checked in code: a Tab-reachable "Close message" button beside Undo. Focus holds the timer. |
| LA7 · M-091 | Quick add's focus order *(inferred)* | shell | not reproduced | `tests/page-marks.spec.ts` checks Quick add after Help in tab order (ADR-033 line 141). |
| LA7 · N-186 | Quick add's focus order or tap targets at 485 px *(inferred)* | shell | not reproduced | Same check as M-091. N-115, the row's tap-target id, was fixed in Part 13 (24 px or more on computers and tablets; phones 44 px). |
| E3 (skip link) | The Goal wizard needs 20–30 Tabs; a skip link is "later" | `components/unified-goal-wizard.tsx` | being built in Session AJ item 20 (lead) | ADR-035 verify-then-do row E3. |
| LA9 · D-013 | The header differs per page *(inferred)* | page headers | protected | Approved headers (accepted baseline). Removing the phone page name was the owner's Part 18 (M53). |
| LA9 · D-016 | Same id as under TO7: header and top bar differ | page headers | protected | Same as D-013 and TO7 · D-016. |
| LA9 · M-075 | Journey's phone title says "ZIGoals" | `components/phone/phone-chrome.tsx` (`phoneRoute`) | **fixed** | Fixed in this change: `components/phone/phone-chrome.tsx` and the new unit test `apps/web/lib/phone-route-titles.test.ts`. The top bar's screen-reader title (visually hidden since Part 18) fell back to "ZIGoals" on every page outside the navigation. Journey, Life review, Journal, Guided journeys, What ZIGi remembers and Shared with ZIGoals now name themselves in the words of their tab titles, and the test reads each page's metadata. |
| LA9 · N-177 | Same, on a phone | same | **fixed** | Same as M-075. |
| LA9 · Denver S-09 | Denver: one top bar for every page | shell | protected | Owner decision M46 (the tablet rail, desktop sidebar and phone bottom bar are on the PROTECTED list) and Part 18's phone top bar (M53). |
| F1 | 358 KB ZIGi idle animation on every page | first load | not reproduced | AH M45 (ADR-033 line 133): no longer downloaded on first load. The remaining first-load file is the logo intro, which is PROTECTED (the first-visit swan intro). |
| F3 | Cold load 1.3–1.4 s | all routes | out of scope / owner | Needs production builds and browser timing, which this lane may not run. Session AI measured no change (ADR-034 N39), and every route is within its weight budget. No small fix exists. |
| AF15 (Habits headings) | Habits' time headings measure just under 3:1 | `/app/habits` | not reproduced | AH re-measured them in all three themes (ADR-033 line 149). Contrast is reopened in AJ item 21 (lead). |
| AF15 (Checklist name) | A Checklist name runs past two lines on a phone's path | `/app/checklist` | protected | PROTECTED: the Checklist (path, labels). ADR-033 line 149. |
| AF15 (Health import) | Two readings in Health's import view, with stress records only | `/app/health` import | out of scope / owner | Shows only with the audit's stress records. Checking it needs the browser layout audit (AF H138), which this lane may not run. |
| AF15 (Academy name) | An Academy name under the "Jump to your next lesson" bubble while scrolling | Earn's Start-here path | out of scope / owner | Earn's path is being rebuilt with the Checklist's orbit look in AJ item 16 (D3, lead). `components/earn/*` is outside this lane. |
| SE3 · D-005 | Settings is an ~8,000 px wall *(inferred)* | `/app/settings` | out of scope / owner | Shortening Settings is a redesign. The tabs already jump to sections, the phone drill-down is tidy, and Settings code is outside this lane. |
| SE3 · D-127 | Chips without state *(inferred)* | Settings section tabs | not reproduced | AH Part 13 (`f33fd251`; ADR-033 line 150): the section tabs mark the group on screen. |
| SE3 · D-224 | Three overlapping import and restore areas *(inferred)* | Settings | not reproduced | Session AI built one "Backup & restore" card (`966cd39c`, ADR-034 N35; `app/app/settings/page.tsx:124`). Item 19 (lead) closes the remaining anchor gap. |
| SE3 · D-062 | Same overlap *(inferred)* | Settings | not reproduced | Same as D-224. |
| SE3 · D-251 | Same overlap *(inferred)* | Settings | not reproduced | Same as D-224. |
| SE3 · M-128 | Help's and Settings' backup areas overlap (also listed under SE1) | Settings, Help | not reproduced | Same as D-224. Help's links (`#private-vault`) still land, because each part kept its anchor (N35). |
| SE3 · Denver S-05 | Denver: one "Backup & restore" card | Settings | not reproduced | Built by Session AI (`966cd39c`, N35). |

## What changed in this lane (not committed)
- `apps/web/components/help/help-page.tsx`: three sentences and two `h3`s in "Where your data lives", "Protect what's on this device" and "Can I get all my data out?" now say "without an account" / "with an account". No link, id or heading that a spec reads changed.
- `apps/web/components/help/install-guide.tsx`: "Once accounts open, there's another way" became "With an account, there's another way".
- `apps/web/components/phone/phone-chrome.tsx`: `phoneRoute` names the pages that are outside the navigation (`OFF_NAV_TITLES`). Visible chrome is unchanged: there is no new back link, and the title stays screen-reader-only.
- `apps/web/lib/phone-route-titles.test.ts` (new): each such page's title equals its own metadata title, and the navigation pages and earlier special cases keep theirs.
- No CSS, stored format, sync, auth, wallet, signing, deploy or PROTECTED area was touched.

Browser specs that cover the changed areas, for the lead to run: `tests/help-page.spec.ts`, `tests/install-guide.spec.ts`, `tests/send-feedback.spec.ts`, `tests/help-settings-link.spec.ts`, `tests/a11y-wcag-x.spec.ts` (Help), `tests/ah-part18.spec.ts`, `tests/phone-shell.spec.ts`, `tests/journey.spec.ts`, `tests/page-titles.spec.ts` (phone top bar and titles). No spec line pins the copy that changed. A grep for "accounts open", "Before accounts", "Already started", "so does sync" and "another way" in `tests/` and `scripts/` finds nothing.

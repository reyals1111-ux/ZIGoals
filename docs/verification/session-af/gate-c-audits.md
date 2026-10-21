# Session AF Gate C — layout and contrast audits (G4)

`tests/audit/layout-audit.mjs` (Session AB-Design's audit: sideways scroll, clipped, spilled and overlapping text, broken
numbers, ring labels, touch targets, covered text, contrast against the pixels behind; this session added the AF states —
Earn, live Earn, What's this, the Checklist's path, list and edit, Governance, Add money and its return, the Day timeline,
Stories, each also on a new device — and every gradient word's weakest stop, `ed7c6b10`) against a local production build
on :3101, Chrome channel, headless, `TZ=UTC`, the Showcase and a new device. Runs 1–2 on `ec8f5570`'s app code (the
Checklist redesign, the design critique's and the test audit's fix rounds); runs 3–8 on `512e4b42`'s, with the audit's
first fixes (run 8 with the regenerated Light sheet); runs 9–14 on `499fff64`'s, with the stress and Light fixes. The audit
tool's own corrections are in `512e4b42` and `499fff64` (measurement fixes; no threshold changed). Runs are listed in order;
each fix was followed by a re-run of the states it touched.

Evidence label: local (this Mac, Chrome headless). WebKit's layout is covered by CI's WebKit job, never run here (owner
rule, 19 Oct).

| Run | Theme | Widths | States | Findings | Outcome |
|---|---|---|---|---|---|
| 1 | Nebula | 320, 390, 768, 1024, 1440, 1920 | 500 | 26 contrast, 5 covered, 10 overlap, 24 target, 8 could not run. At 320: the Day timeline's "Give it a time" / "Change time" ran under Complete (covered, 1.4:1); Earn's Start-here labels touched the next step's note (6–10 px). At 320/390: Valdora's "FAQ" link 43 px wide. At 768–1920 with a mouse: Earn's in-sentence links 18 px tall ("its economics page", "Zignaly's notice", "The vault page", "Valdora's FAQ"). The Checklist's list (320/390) and edit (every width) states could not open (the redesign moved both into its ⋯ menu). The hero slogan's gradient words (20 rows, 1.15–4.28:1) and Habits' "Afternoon" heading at 320 (2.85:1 against 3:1) | fixed in `512e4b42`: the timeline's two actions take their own row below 380 px; Earn's path steps stand 40 px apart on a stage under 360 px; the link reads "Valdora's FAQ"; Earn's in-sentence links have 24 px of height with a mouse (WCAG 2.5.8); the audit's Checklist states open the menu first. The slogan and "Afternoon": below |
| 2 | Nebula, touch (coarse pointer) | 768, 1024 | 166 | 7 contrast (the slogan 6; Habits' "Morning" heading on a new habit, 2.96:1 against 3:1), 8 target (the FAQ link), 2 could not run (Checklist edit) | as run 1 |
| 3 | Nebula, the touched states | 320–1920 | 66 | the timeline, Earn's labels and links clean; 19 contrast: "Afternoon" (as run 1); a Start-here note at 320 (3.01:1); 14 in the Checklist's edit state (1.3–2.6:1) | the audit, not the app (`512e4b42`): the edit state's texts were the path's names behind the open sheet (an open Checklist sheet is now checked alone, as any sheet is); the note sat just under a phone slice's top, where Earn's sticky top bar and chip rail are taller than the slices' old 120 px overlap (now 240 px) — read on the page, 8.4:1 |
| 4 | Nebula, the touched states again | 320–1920 | 36 | none | — |
| 5 | Nebula, touch, the touched states | 768, 1024 | 22 | none | — |
| 6 | Nebula, stress records (names of 40+ characters, US$1,234,567,890.12, a 4-digit day count) | 320–1920 | 500 | 28 contrast, 4 clip, 4 spill, 2 covered, 1 overlap. At 1440 a long timed habit in the Checklist's Focus tile pushed the Checklist 62 px sideways; at 768/1024 Wealth's 13-digit class total ran into the next card; the Checklist's List view and path cut a 47-character name (the List view's ellipsis without its full words; the path's two lines); a Today goal value at 390 (1.02:1) and Health's import note at 390 (2.31:1); the slogan and "Afternoon" as before | fixed: the timer tiles' columns may shrink, the line ends in its ellipsis with its full words as its title; Wealth's class totals fit their card (never larger than before, never wrapped mid-number); the List view's name carries its full words as its title. The audit, not the app: a text clipped by its own box (an ellipsis) no longer counts as running past its card (the List view's name is 212 px wide on a 320 px screen). Re-runs: runs 9 and 12 |
| 7 | Light | 320–1920 | 500 | 128 contrast: the day's deepened gradient words on page eyebrows and headings at 4.2–4.5:1 against 4.5:1 (5.2:1 on white measured less on the panels and their mist; most at 320/390), the ecosystem page's eyebrow and title on its header glow (2.9–4.2:1), Today's "ZIG reward reserve" and "Staked ZIG" at 1024 (4.1:1), a goal title on the board at 1024 (2.7:1 against 3:1), Earn's "Spotting scams" in the What's this state at 320 (1.25:1), the slogan | fixed: the generator's gradient-word target 5.8:1 on white (was 5.2; H130's own floor of 4.5:1 on the panels); the ecosystem header's gradient words take deeper shades of their hues (8.2:1 on white) because its glows stay Nebula's by day (H13, H75). Re-runs: runs 10 and 11 |
| 8 | Light, touch, on the regenerated sheet (5.8:1) | 768, 1024 | 166 | 7 contrast: the slogan 6, a vision tile's two-line title on the Goals board at 1024 (2.7:1: it climbs above the shade's fade into the tile's night art) | fixed: by day a tile's caption sits on a frosted white band (a neutral surface and shade; nothing moves) |
| 9 | Rebuilt :3101 (`499fff64`'s code): Nebula stress on the states it flagged | 320–1920 | 30 | the Checklist no longer scrolls sideways at 1440 and Wealth's totals no longer overlap; left: an ellipsis with its title reported as "cut off", a goal value on a swipeable card half past a 390 px window read against the capture's edge column, Health's import note (below), the path's two-line clamp, the slogan | the audit, not the app: an ellipsis with its full text is never "cut off"; a line past the window's side is not read |
| 10 | Light on the pages whose eyebrows fell short | 320, 390 | 30 | every eyebrow passes but the ecosystem page's, whose cyan stop reads 3.2–3.7:1 on the header's teal glow; Earn's "Spotting scams" (as run 7) | below |
| 11 | Light: Today, the Goals board, the ecosystem page, the month review | 768, 1024 | 10 | the slogan only | — |
| 12 | Nebula stress, Today and the Checklist, after the tool's last fixes | 320, 390, 1440 | 9 | the slogan and the path's two-line clamp only | — |
| 13 | Dark, on the final code | 320–1920 | 500 | 17 contrast, every one the hero slogan | — |
| 14 | Dark, touch, on the final code | 768, 1024 | 166 | 6 contrast, every one the hero slogan | — |

## Judged, not changed
- **The hero slogan's gradient words** ("Habits & Health", "Wealth"; 1.15–4.28:1 by the gradient-word measure, at every
  width): the hero is the accepted baseline (docs/STATUS.md; no change without the owner). The measure compares each
  stop of the gradient with the point under the word that is closest to it in colour, wherever on the word that point is
  (at 1440 the cyan stop of "Habits" against the planet's rim under "Health"), and leaves out the words' dark halo
  (`drop-shadow`); an owner item.
- **Habits' time headings** ("Afternoon" 2.85:1 at 320, "Morning" 2.96:1 at 768 touch, against 3:1 for large text): the stop
  that falls short (the gradient's violet end) paints the word's last letters, on the dark card; the light glow behind the
  section's icon lies under its first letters, painted near-white (a clip of the 320 px state checked).
- **The ecosystem page's eyebrow by day at 320/390** (3.2–3.7:1): its header card keeps Nebula's purple and teal glows by
  day (the owner's Light rule, H13; theme parity H75 allows no chromatic change), and the eyebrow's mid-word cyan cannot go
  deeper without losing its colour (chroma under the parity rule's 0.07); the words' ends now hold 4.5:1 on the glow, and
  the title passes. An owner item: let that header's glows calm by day, or accept the eyebrow as it is.
- **A Checklist name longer than two lines on a phone's path** (the 47-character stress name): the path keeps a name to two
  lines on a phone (round 9's rule) and cuts the rest; its full words are the planet's spoken name, the List view's title and
  Edit path's.
- **Health's import note and a day label under stress** (390: the note's last line 2.31:1; 320: "Wed 21" 3.34:1): on the page
  the note's lines read 10–13:1 except its last, where the footer's art begins once the stress records lengthen the page; the
  second "Wed 21" passes under ZIGi's floating button, which floats over content by the owner's decision (H137a).
- **Earn's "Spotting scams" in the What's this state at 320 by day** (1.25:1): the Academy path's floating "Jump to your
  next lesson" bubble (above the tab bar) passes over that name in the slice it is read from (a clip shows it); a floating
  control over content while the page scrolls, as the right-edge launchers do (H137a). Off the bubble the name is ink on
  white.

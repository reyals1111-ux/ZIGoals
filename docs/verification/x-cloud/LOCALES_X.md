# Session X P2.5 — Locales

Evidence: local (production build `PUBLIC_ALPHA_UNDEPLOYED`, `next start`, Chromium), 2026-10-08.

## The rule being checked
`lib/visual-format.ts` sets one display rule:
- Numbers and money follow the browser's locale; each currency keeps its own code and nothing is converted.
- Dates written only in digits follow the browser's locale.
- Dates and times that contain words are English, with the region's conventions.
- Form inputs are never localised.
- The server render and hydration use en-US; the page switches once, right after hydration.

## What was wrong, and fixed
Reading every `Intl` and `toLocale…` call outside ZIGi's lane found eleven places that bypassed the rule (`8399818`):
- Chess's game dates used the browser's language for month names.
- Fasting's times were forced to US 12-hour.
- The focus-sound and music "stops at" times were forced to British 24-hour.
- These used fixed English grouping beside the locale's own figures: Sleep's and Meditation's chart labels, Health goals'
  lines, auto check-in amounts, the weekly review's steps and weight, and storage sizes.

Earlier in Phase 2 (`402ec38`), Today's "Your week" now ends on the journal's day: a traveller's records fell outside it.

**Kept:** the importer's summary counts are written inside its Web Worker, which has no display locale, so they keep
English grouping.

## The sweep
Every main page was swept: Today, Goals, Habits, Health, Sleep, Wealth, Markets, Portfolio, Staking, Activity, Settings
and Help. The Showcase was loaded and the time zone was Brussels. It ran on desktop 1440 and iPhone 13, under seven
browser locales. The script is a local Playwright sweep, and every `/api` request got a fixture.

| Locale | Page or hydration errors | Broken output (NaN, Invalid Date, undefined…) | Sideways scroll | Portfolio's $8,450 vs the browser's own Intl |
|---|---|---|---|---|
| nl-BE | 0 / 0 | 0 | 0 | `US$ 8.450,00` = Intl |
| fr-BE | 0 / 0 | 0 | 0 | `8 450,00 $US` = Intl |
| en-US | 0 / 0 | 0 | 0 | `$8,450.00` = Intl |
| en-GB | 0 / 0 | 0 | 0 | `US$8,450.00` = Intl |
| de-DE | 0 / 0 | 0 | 0 | `8.450,00 $` = Intl |
| ja-JP | 0 / 0 | 0 | 0 | `$8,450.00` = Intl |
| ar | 0 / 0 | 0 | 0 | `‏8,450.00 US$` = Intl (with the right-to-left mark) |

Each row covers both desktop and phone.

**Right-to-left names (ar, desktop and phone):** "تمرين الصباح" and "Walk 10 دقائق مع Sam" were created as habits through
the form. Both show whole on their cards: the text is the same as typed and nothing is cut.

## Kept in CI
`tests/display-locale.spec.ts` now covers all seven locales on both projects (14 tests, passing locally):
- en-US, de-DE, nl-BE and ja-JP, with exact figures.
- fr-BE, en-GB and ar: the Wealth total matches the browser's own Intl output, Habits' weekday names stay English, and
  no hydration error appears.

`tests/ambient.spec.ts` checks the 24-hour clock under nl-BE and en-GB. Unit tests check Health goals and auto
check-ins under nl-BE and de-DE.

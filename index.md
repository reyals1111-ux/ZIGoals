# Session W screens: "Your whole life, one app" (review only, never merge)

Source: [PR #77](https://github.com/reyals1111-ux/ZIGoals/pull/77), branch `feature/session-w-whole-life` at `5d6a3b4`
(Parts 1–25 and the Part 2 switch fix), production build (`NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED`,
`next start`), captured 2026-10-07 by [`capture.mjs`](capture.mjs) (run it from `apps/web` against a running build).

- Viewports: 1440×900 (`desktop-1440/`), 1024×768 (`tablet-1024/`), 390×844 with phone touch emulation (`phone-390/`).
  Each picture is one screen: a page's first screen, or the named section scrolled to the top. JPEG, quality 72.
- **Reduced motion** throughout. **The Showcase** (Settings → Load Showcase Demo): fictional records only.
- **Offline:** every `/api` request was answered 503, so nothing reached a network. Market prices, Markets' lists and
  logos show their "not available" states; Portfolio shows the Showcase's own fixture prices, labelled as such.
- Headless Chromium has no Web Bluetooth, so Devices says this browser cannot connect one; Chrome or Edge on a computer
  shows the pair buttons. The ZIGi figure is still the placeholder.
- Not captured (covered by the specs and the owner checklist in `docs/product/WHOLE_LIFE_W.md`): the first-run welcome,
  an import preview, a connected Spotify (needs the owner's registration; MOCKED in tests), a running meditation, and
  the chess embeds (third-party frames load only on a tap).
- Found while capturing: every switch in Settings → Your pages & buttons sat above its name, and on phones the track
  shrank with the knob outside it. Fixed in `5d6a3b4` before these captures, with a test on both projects.

| # | View | desktop-1440 | tablet-1024 | phone-390 |
|---|---|---|---|---|
| 01 | Today (Showcase): the first screen; the music button sits opposite ZIGi (Part 20) | [jpg](desktop-1440/01-today.jpg) | [jpg](tablet-1024/01-today.jpg) | [jpg](phone-390/01-today.jpg) |
| 02 | Today: the My links card (Part 19), then Your week | [jpg](desktop-1440/02-today-links.jpg) | [jpg](tablet-1024/02-today-links.jpg) | [jpg](phone-390/02-today-links.jpg) |
| 03 | Health → Sleep (Part 4): Tonight, "I'm going to bed", the wind-down reminder | [jpg](desktop-1440/03-health-sleep.jpg) | [jpg](tablet-1024/03-health-sleep.jpg) | [jpg](phone-390/03-health-sleep.jpg) |
| 04 | Health → Meditation (Part 5): a timer or the breathing guide, length, mood before | [jpg](desktop-1440/04-health-meditation.jpg) | [jpg](tablet-1024/04-health-meditation.jpg) | [jpg](phone-390/04-health-meditation.jpg) |
| 05 | Health → Devices (Part 8): Bluetooth availability (none in this browser), linked accounts that need setup | [jpg](desktop-1440/05-health-devices.jpg) | [jpg](tablet-1024/05-health-devices.jpg) | [jpg](phone-390/05-health-devices.jpg) |
| 06 | Habits: the first screen, with "Habit ideas" (Part 10) | [jpg](desktop-1440/06-habits.jpg) | [jpg](tablet-1024/06-habits.jpg) | [jpg](phone-390/06-habits.jpg) |
| 07 | Habits → Habit ideas (Part 10): categories, Add or "As a 30-day challenge" | [jpg](desktop-1440/07-habit-ideas.jpg) | [jpg](tablet-1024/07-habit-ideas.jpg) | [jpg](phone-390/07-habit-ideas.jpg) |
| 08 | Goals: the first screen | [jpg](desktop-1440/08-goals.jpg) | [jpg](tablet-1024/08-goals.jpg) | [jpg](phone-390/08-goals.jpg) |
| 09 | A goal's Milestones (Part 11): segments, done ticks, a target date kept on this device | [jpg](desktop-1440/09-goal-milestones.jpg) | [jpg](tablet-1024/09-goal-milestones.jpg) | [jpg](phone-390/09-goal-milestones.jpg) |
| 10 | Wealth → Accounts, debts & net worth (Part 12): one net worth per currency, the formula | [jpg](desktop-1440/10-wealth-accounts.jpg) | [jpg](tablet-1024/10-wealth-accounts.jpg) | [jpg](phone-390/10-wealth-accounts.jpg) |
| 11 | Chess (Part 14): ratings from chess.com and Lichess (fictional) | [jpg](desktop-1440/11-chess.jpg) | [jpg](tablet-1024/11-chess.jpg) | [jpg](phone-390/11-chess.jpg) |
| 12 | Portfolio (Part 15): the first screen | [jpg](desktop-1440/12-portfolio.jpg) | [jpg](tablet-1024/12-portfolio.jpg) | [jpg](phone-390/12-portfolio.jpg) |
| 13 | Portfolio → Holdings (Part 15): the Showcase's own labelled fixture prices | [jpg](desktop-1440/13-portfolio-holdings.jpg) | [jpg](tablet-1024/13-portfolio-holdings.jpg) | [jpg](phone-390/13-portfolio-holdings.jpg) |
| 14 | Markets (Part 16): the first screen; no market data offline | [jpg](desktop-1440/14-markets.jpg) | [jpg](tablet-1024/14-markets.jpg) | [jpg](phone-390/14-markets.jpg) |
| 15 | Settings (Part 24): the six group chips, Data & privacy first | [jpg](desktop-1440/15-settings.jpg) | [jpg](tablet-1024/15-settings.jpg) | [jpg](phone-390/15-settings.jpg) |
| 16 | Settings → Your pages & buttons (Part 2, with the switch fix 5d6a3b4) | [jpg](desktop-1440/16-settings-pages.jpg) | [jpg](tablet-1024/16-settings-pages.jpg) | [jpg](phone-390/16-settings-pages.jpg) |
| 17 | Settings → Music (Part 20) and My links (Part 19) | [jpg](desktop-1440/17-settings-music.jpg) | [jpg](tablet-1024/17-settings-music.jpg) | [jpg](phone-390/17-settings-music.jpg) |
| 18 | Help → "New: your whole life" (Part 24) | [jpg](desktop-1440/18-help-whole-life.jpg) | [jpg](tablet-1024/18-help-whole-life.jpg) | [jpg](phone-390/18-help-whole-life.jpg) |
| 19 | The music player, "Your soundtrack" (Part 20): focus sounds | [jpg](desktop-1440/19-music-panel.jpg) | [jpg](tablet-1024/19-music-panel.jpg) | [jpg](phone-390/19-music-panel.jpg) |

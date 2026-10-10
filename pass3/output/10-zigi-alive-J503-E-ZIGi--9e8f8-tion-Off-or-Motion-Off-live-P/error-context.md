# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 10-zigi-alive.spec.ts >> J503 [E] ZIGi breathes while it waits (Calm), and holds still with its animation Off or Motion Off @live
- Location: human-x/kit.ts:18:9

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "F001-idle.anim.webp"
Received: ""
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main"
  - generic [ref=e4]:
    - link "ZIGoals home" [ref=e5] [cursor=pointer]:
      - /url: /app
      - img "ZIGoals" [ref=e6]
    - paragraph [aria-hidden] [ref=e7]: Today
    - generic [ref=e8]:
      - button "+ Quick add" [ref=e9] [cursor=pointer]
      - link "Wealth" [ref=e10] [cursor=pointer]:
        - /url: /app/wealth
      - link "Settings" [ref=e13] [cursor=pointer]:
        - /url: /app/settings
  - generic [ref=e16]:
    - banner [ref=e17]:
      - generic [ref=e18]:
        - strong [ref=e19]: ZIGCHAIN TESTNET · PUBLIC ALPHA
        - button "Status details" [ref=e20] [cursor=pointer]
      - generic [ref=e23]:
        - button "Local demo" [pressed] [ref=e24] [cursor=pointer]
        - button "Connect Keplr" [ref=e25] [cursor=pointer]
    - generic [ref=e31]:
      - generic [ref=e32]:
        - status [ref=e33]: This device only · account sync is off
        - link "Storage & sync settings →" [ref=e34] [cursor=pointer]:
          - /url: /app/settings#encrypted-sync
      - generic [ref=e35]:
        - generic [ref=e36]:
          - text: "LOCAL SIMULATION · Mode: this tab · Stored in this browser · No blockchain transactions"
          - generic [ref=e38]: 1000 ZIG demo balance
        - button "Unlock layout to rearrange" [ref=e40] [cursor=pointer]
      - main [ref=e45]:
        - generic [ref=e46]:
          - generic [ref=e47]:
            - generic [ref=e48]:
              - region [ref=e49]:
                - generic [ref=e50]:
                  - paragraph [ref=e51]: YOUR FINANCIAL ORBIT
                  - heading "Today's Goals, Habits & Health = Tomorrow's Wealth" [level=1] [ref=e52]:
                    - generic [ref=e53]:
                      - generic [ref=e54]: Today's Goals, Habits & Health
                      - generic [ref=e55]: = Tomorrow's Wealth
                  - paragraph [ref=e56]: Set goals. Build habits. Protect your health.Make room for a brighter tomorrow.
                  - generic [ref=e57]:
                    - button "+ Quick add" [ref=e58] [cursor=pointer]
                    - button [ref=e59] [cursor=pointer]
                  - paragraph [ref=e63]: Testnet Alpha · simulated financial progress · private daily tracking
                - group "Your connected journey" [ref=e64]:
                  - generic [ref=e69]:
                    - strong [ref=e70]: Your goals
                    - generic [ref=e71]: Give your ZIG a purpose.
                  - generic [ref=e76]:
                    - strong [ref=e77]: Your future
                    - generic [ref=e78]: Build habits. Live well.
                  - generic [ref=e83]:
                    - strong [ref=e84]: Onchain
                    - generic [ref=e85]: ZIGChain vision · Alpha simulation.
              - region [ref=e86]:
                - paragraph [ref=e87]: Welcome to ZIGoals
                - heading "Set up your first goal and habit in about a minute." [level=2] [ref=e88]
                - paragraph [ref=e89]: No wallet or account needed. What you add stays in this browser.
                - generic [ref=e90]:
                  - link "Start setup" [ref=e91] [cursor=pointer]:
                    - /url: /app/welcome
                  - button "Explore the demo" [ref=e92] [cursor=pointer]
                  - button "Not now" [ref=e93] [cursor=pointer]
              - generic [ref=e94]:
                - heading "Make Today yours." [level=2] [ref=e95]
                - paragraph [ref=e96]: Start with your interests. Your records stay as they are, and no wallet or account is required.
                - generic [ref=e97]:
                  - button "Balanced Goals, daily rhythm, Health and Wealth." [ref=e98] [cursor=pointer]:
                    - strong [ref=e99]: Balanced
                    - generic [ref=e100]: Goals, daily rhythm, Health and Wealth.
                  - button "Wealth Your assets and financial destinations." [ref=e101] [cursor=pointer]:
                    - strong [ref=e102]: Wealth
                    - generic [ref=e103]: Your assets and financial destinations.
                  - button "Habits + Health Daily routines and caring for yourself." [ref=e104] [cursor=pointer]:
                    - strong [ref=e105]: Habits + Health
                    - generic [ref=e106]: Daily routines and caring for yourself.
                  - button "Health-only Meals, water, movement and measurements." [ref=e107] [cursor=pointer]:
                    - strong [ref=e108]: Health-only
                    - generic [ref=e109]: Meals, water, movement and measurements.
                - button "Keep Balanced and continue" [ref=e110] [cursor=pointer]
                - paragraph [ref=e111]:
                  - text: Saved locally. Explore account, backup and encrypted-sync options in
                  - link "Settings" [ref=e112] [cursor=pointer]:
                    - /url: /app/settings
                  - text: .
              - region "Your Today widgets" [ref=e113]:
                - status
                - generic [ref=e114]:
                  - region "Life and Wealth snapshot" [ref=e117]:
                    - generic [ref=e118]:
                      - paragraph [ref=e119]: TODAY BUILDS TOMORROW
                      - heading [level=2] [ref=e120]:
                        - generic [ref=e121]: Your whole life.Moving together.
                      - paragraph [ref=e122]: Give your plans a little attention. Make room for the things that keep you well.
                      - link "See your full wealth picture →" [ref=e123] [cursor=pointer]:
                        - /url: /app/wealth
                      - generic [ref=e124]:
                        - generic [ref=e125]: Known tracked wealth · currencies kept separate
                        - strong [ref=e126]: Your first asset starts here
                        - generic [ref=e127]: 0 assets · 0 need attention
                    - generic [ref=e128]:
                      - link "No Habits scheduled today Your daily rhythm 0 of 0 Habits complete Create your first habit to see today’s rhythm." [ref=e129] [cursor=pointer]:
                        - /url: /app/habits
                        - progressbar "Habits completed today" [ref=e130]:
                          - generic [aria-hidden] [ref=e131]:
                            - text: "0"
                            - generic [ref=e132]: "%"
                        - generic [ref=e133]:
                          - heading "Your daily rhythm" [level=3] [ref=e134]
                          - strong [ref=e135]: 0 of 0 Habits complete
                          - generic [ref=e136]: Create your first habit to see today’s rhythm.
                      - link "Care for your day Your Health diary 0 meals & snacks · 0 steps" [ref=e137] [cursor=pointer]:
                        - /url: /app/health
                        - generic [ref=e139]:
                          - heading "Care for your day" [level=3] [ref=e140]
                          - strong [ref=e141]: Your Health diary
                          - generic [ref=e142]: 0 meals & snacks · 0 steps
                      - link "0 Destinations in motion Goals with a purpose 0 completed · celebrate every step." [ref=e143] [cursor=pointer]:
                        - /url: /app/goals
                        - generic [ref=e144]: "0"
                        - generic [ref=e145]:
                          - heading "Destinations in motion" [level=3] [ref=e146]
                          - strong [ref=e147]: Goals with a purpose
                          - generic [ref=e148]: 0 completed · celebrate every step.
                  - region [ref=e151]:
                    - generic [ref=e153]:
                      - paragraph [ref=e154]: MAKE ROOM FOR PROGRESS
                      - heading "Your funding agenda" [level=2] [ref=e155]
                      - paragraph [ref=e156]: Contribution plans and recorded funding, in one place.
                    - paragraph [ref=e157]: Set a contribution plan on a financial Goal to see its next funding date.
                    - paragraph [ref=e158]: Only contributions explicitly linked to a scheduled date satisfy that installment.
                  - region [ref=e161]:
                    - generic [ref=e163]:
                      - paragraph [ref=e164]: YOUR NEXT USEFUL STEP
                      - heading "Needs attention 0" [level=2] [ref=e165]:
                        - text: Needs attention
                        - generic [ref=e166]: "0"
                    - generic [ref=e167]:
                      - generic [aria-hidden] [ref=e168]: ✓
                      - heading "A clear view ahead" [level=3] [ref=e169]
                      - paragraph [ref=e170]: No funding or valuation issues need your attention right now.
                      - link "Explore your Goals →" [ref=e171] [cursor=pointer]:
                        - /url: /app/goals
                  - button "Your market watch" [ref=e174] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e176]: Show
                  - region "Your goals" [ref=e180]:
                    - generic [ref=e181]:
                      - generic [ref=e182]:
                        - heading "Your goals" [level=2] [ref=e183]
                        - paragraph [ref=e184]: Small steps. A bigger future.
                      - link "View all goals →" [ref=e185] [cursor=pointer]:
                        - /url: /app/goals
                    - generic [ref=e187]:
                      - heading "A plan with your name on it." [level=3] [ref=e190]
                      - paragraph [ref=e191]: Choose what matters. Set a target. See the next step.
                      - link "Create your first goal →" [ref=e192] [cursor=pointer]:
                        - /url: /app/goals/new
                    - paragraph [ref=e193]: Local demo · simulated ZIG, never wallet funds
                  - button "Your progress" [ref=e196] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e198]: Show
                  - region [ref=e202]:
                    - generic [ref=e203]:
                      - generic [ref=e204]:
                        - paragraph [ref=e205]: Your daily cadence
                        - heading "Small steps, steady rhythm." [level=2] [ref=e206]
                      - generic [aria-hidden] [ref=e207]: ✦
                    - paragraph [ref=e208]: A small daily action can support a bigger goal. Create your first habit, or make space for today.
                    - link "Build your rhythm →" [ref=e209] [cursor=pointer]:
                      - /url: /app/habits
                  - region "Today's health" [ref=e211]:
                    - generic [ref=e212]:
                      - generic [ref=e213]:
                        - paragraph [ref=e214]: HEALTH · PRIVATE
                        - heading "Your daily balance." [level=2] [ref=e215]
                      - generic [aria-hidden] [ref=e216]: ↗
                    - paragraph [ref=e217]: Make room for feeling good. Set your own targets and log your first meal.
                    - link "Open Health →" [ref=e219] [cursor=pointer]:
                      - /url: /app/health
                  - region "Your selected widgets" [ref=e221]:
                    - generic [ref=e222]:
                      - generic [ref=e223]:
                        - paragraph [ref=e224]: YOUR DAILY SPACE, AT A GLANCE
                        - heading "Your snapshot, your way." [level=2] [ref=e225]
                        - paragraph [ref=e226]: Each card follows the record you chose; currencies and units stay separate.
                      - button "Customize Today" [ref=e227] [cursor=pointer]
                    - generic [ref=e228]:
                      - 'link "Your destinations: 0 active Goals" [ref=e229] [cursor=pointer]':
                        - /url: /app/goals
                        - generic [ref=e233]:
                          - generic [ref=e234]: Your destinations
                          - strong [ref=e235]: 0 active Goals
                          - generic [ref=e236]: 0 completed · recorded progress
                      - 'link "Daily Habits: No Habits due today" [ref=e237] [cursor=pointer]':
                        - /url: /app/habits
                        - generic [ref=e241]:
                          - generic [ref=e242]: Daily Habits
                          - strong [ref=e243]: No Habits due today
                          - generic [ref=e244]: Your natural schedule and current rules
                      - 'link "Meals today: No meals recorded" [ref=e245] [cursor=pointer]':
                        - /url: /app/health
                        - generic [ref=e249]:
                          - generic [ref=e250]: Meals today
                          - strong [ref=e251]: No meals recorded
                          - generic [ref=e252]: 0 meals & snacks · 2026-10-10
                      - 'link "Tracked Wealth · USD: No recorded value" [ref=e253] [cursor=pointer]':
                        - /url: /app/wealth
                        - generic [ref=e257]:
                          - generic [ref=e258]: Tracked Wealth · USD
                          - strong [ref=e259]: No recorded value
                          - generic [ref=e260]: Known values only · currencies stay separate
                  - button "Your destinations" [ref=e263] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e265]: Show
                  - button "Daily Habits" [ref=e270] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e272]: Show
                  - button "Meals today" [ref=e277] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e279]: Show
                  - button "Tracked Wealth · USD" [ref=e284] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e286]: Show
            - complementary "Your next chapter" [ref=e289]:
              - generic [ref=e291]:
                - button "Your wallet" [ref=e292] [cursor=pointer]:
                  - generic [aria-hidden] [ref=e294]: Show
                - text: ●
              - button "Staking" [ref=e299] [cursor=pointer]:
                - generic [aria-hidden] [ref=e301]: Show
              - button "Plan a new destination" [ref=e306] [cursor=pointer]:
                - generic [aria-hidden] [ref=e308]: Show
              - button "Recent activity" [ref=e313] [cursor=pointer]:
                - generic [aria-hidden] [ref=e315]: Show
          - button "How it works" [ref=e319] [cursor=pointer]:
            - generic [aria-hidden] [ref=e321]: Show
          - button "Your week" [ref=e325] [cursor=pointer]:
            - generic [aria-hidden] [ref=e327]: Show
      - generic [ref=e331]:
        - button "Open ZIGi, your AI (⌘K or Ctrl+K)" [ref=e332] [cursor=pointer]
        - button "Hide ZIGi" [ref=e335] [cursor=pointer]
      - contentinfo [ref=e338]:
        - generic [ref=e339]:
          - generic [ref=e340]: ZIGoals
          - generic [ref=e341]: Same you. A brighter tomorrow.
        - generic [ref=e342]: Your goals. Onchain. · PUBLIC_ALPHA_UNDEPLOYED
        - generic [ref=e343]: Independent project · Unaudited alpha · Idle strategy only
        - generic [ref=e344]:
          - link "Report a bug" [ref=e345] [cursor=pointer]:
            - /url: https://github.com/reyals1111-ux/ZIGoals/issues/new?template=bug_report.yml
          - text: ·
          - link "Private security contact" [ref=e346] [cursor=pointer]:
            - /url: mailto:hello@zigoals.app
          - text: · Never share secrets, private backups or wallet details.
  - navigation "Main navigation" [ref=e347]:
    - generic [ref=e348]:
      - link "Today" [ref=e349] [cursor=pointer]:
        - /url: /app
      - link "Goals" [ref=e353] [cursor=pointer]:
        - /url: /app/goals
      - link "Habits" [ref=e357] [cursor=pointer]:
        - /url: /app/habits
      - link "Health" [ref=e361] [cursor=pointer]:
        - /url: /app/health
      - button "More" [ref=e365] [cursor=pointer]
    - text: Every asset, with its source Prices you follow · watch-only Public ZIG staking and positions · read-only Coins you hold or plan · on this device ZIGChain projects · research only Your recent steps, in order Backups, privacy, motion and Showcase
  - alert [ref=e369]
  - status [ref=e370]
```

# Test source

```ts
  1  | import {expect, type Page} from '@playwright/test';
  2  | import {ZIGI_KEY} from '../lib/ai/store/keys';
  3  | import manifest from '../components/zigi/manifest.json';
  4  | import {journey, open, snap, type Journey} from './kit';
  5  | 
  6  | // Session Y Part 11: X-Local's ZIGi without any provider (ADR-017), as a person meets it, for the live pass on #34. The
  7  | // launcher's Studio-2 art and its resting place, Meet ZIGi, the idle motion (Calm by default, Off, Motion Off) and the
  8  | // Showcase. No key, no model and no chat request: nothing here leaves the device.
  9  | const launcher = (page: Page) => page.getByTestId('ai-launcher');
  10 | const figure = (page: Page) => page.locator('.ai-launcher-button .zigi img');
  11 | const file = (page: Page) => figure(page).evaluate(el => (el as HTMLImageElement).currentSrc.split('/').pop() ?? '');
  12 | const playing = (page: Page) => figure(page).evaluate(el => el.getAttribute('data-playing') !== null);
  13 | async function stillPoster(page: Page) {
  14 |   await expect(figure(page)).not.toHaveAttribute('data-playing', '');
  15 |   expect(await file(page)).toMatch(/^F001-idle(-2x)?\.webp$/);
  16 |   expect(await figure(page).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  17 | }
  18 | /** The launcher keeps clear of the page's first action (ADR-017 S81, the resting place). */
  19 | async function clearOf(j: Journey, action: ReturnType<Page['getByRole']>) {
  20 |   const [a, b] = [await launcher(j.page).boundingBox(), await action.boundingBox()];
  21 |   expect(a && b, 'both on screen').toBeTruthy();
  22 |   const overlap = !(a!.x + a!.width <= b!.x || b!.x + b!.width <= a!.x || a!.y + a!.height <= b!.y || b!.y + b!.height <= a!.y);
  23 |   expect(overlap, 'the launcher covers the page\'s first action').toBe(false);
  24 | }
  25 | 
  26 | journey('J501', 'ZIGi\'s launcher shows its art on every main page and rests clear of the first action', {views: 'all', data: ['E'], live: true}, async j => {
  27 |   for (const path of ['/app', '/app/habits', '/app/health', '/app/wealth', '/app/goals']) {
  28 |     await open(j.page, path);
  29 |     await expect(launcher(j.page)).toBeVisible();
  30 |     await expect.poll(() => file(j.page)).toMatch(/^F001-idle(\.anim)?(-2x)?\.webp$/);
  31 |   }
  32 |   await open(j.page, '/app/habits');
  33 |   await clearOf(j, j.page.getByRole('button', {name: '+ New habit', exact: true}));
  34 |   await snap(j, 'J501', 'habits');
  35 | });
  36 | 
  37 | journey('J502', 'Meet ZIGi from Settings: every state with its code, nothing written on view', {views: 'all', data: ['E'], live: true}, async j => {
  38 |   await open(j.page, '/app');
  39 |   await j.page.goto('/app/settings#zigi-look');
  40 |   await j.page.locator('#zigi-look').getByRole('link', {name: /Meet ZIGi/}).click();
  41 |   await expect(j.page).toHaveURL(/\/app\/zigi$/);
  42 |   await expect(j.page.getByRole('heading', {level: 1, name: 'Meet ZIGi.'})).toBeVisible();
  43 |   const before = await j.page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  44 |   const states = Object.values(manifest.states);
  45 |   await expect(j.page.locator('.meet-zigi-card')).toHaveCount(states.length);
  46 |   for (const state of states) await expect(j.page.getByRole('article', {name: state.label, exact: true})).toContainText(state.code);
  47 |   await snap(j, 'J502', 'meet');
  48 |   expect(await j.page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
  49 | });
  50 | 
  51 | journey('J503', 'ZIGi breathes while it waits (Calm), and holds still with its animation Off or Motion Off', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  52 |   await open(j.page, '/app');
  53 |   await expect.poll(() => playing(j.page), {timeout: 15_000}).toBe(true);
> 54 |   expect(await file(j.page)).toBe('F001-idle.anim.webp');
     |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  55 |   await j.page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [ZIGI_KEY, JSON.stringify({version: 1, animation: 'off'})]);
  56 |   await open(j.page, '/app');
  57 |   await stillPoster(j.page);
  58 |   await j.page.evaluate(key => { localStorage.removeItem(key); localStorage.setItem('zigoals:motion:v1', 'off'); }, ZIGI_KEY);
  59 |   await open(j.page, '/app');
  60 |   await expect(j.page.locator('html')).toHaveAttribute('data-app-motion', 'off');
  61 |   await stillPoster(j.page);
  62 |   await snap(j, 'J503', 'motion-off');
  63 | });
  64 | 
  65 | journey('J504', 'in the Showcase ZIGi is the same and Meet ZIGi shows nothing personal', {views: ['D', 'P'], data: ['S'], live: true}, async j => {
  66 |   await expect(launcher(j.page)).toBeVisible();
  67 |   await j.page.goto('/app/zigi');
  68 |   await expect(j.page.getByRole('heading', {level: 1, name: 'Meet ZIGi.'})).toBeVisible();
  69 |   await expect(j.page.locator('.meet-zigi-card')).toHaveCount(Object.values(manifest.states).length);
  70 |   await expect(j.page.locator('main')).not.toContainText('@');
  71 |   await snap(j, 'J504', 'showcase');
  72 | });
  73 | 
```
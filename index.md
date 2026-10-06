# Session V screens: ZIGi v2 (review only, never merge)

Source: [PR #76](https://github.com/reyals1111-ux/ZIGoals/pull/76), branch `feature/session-v-zigi-v2` at `d157fbc` (Part 18), production build (`PUBLIC_ALPHA_UNDEPLOYED`, `next start`), captured 2026-10-06 by `apps/web/tests/zigi-v2-captures.spec.ts` (`ZIGI_V2_CAPTURES=1`).

- Viewports: 1440×900 (`desktop-1440/`), 1024×768 (`tablet-1024/`), 390×844 (`phone-390/`).
- **Reduced motion** throughout (ZIGi holds still; the breath and one-shots are covered by the zigi-alive spec).
- Showcase-style fictional records on a fixed clock (2026-09-20 19:00 UTC). Every AI answer is a **MOCK** served by the test; nothing reached a provider.
- The ZIGi figure is still the placeholder (the figure set is an owner item, ZIGI_ASSET_SPEC.md).
- **Mini window:** headless Chromium runs no event loop inside a Document Picture-in-Picture window (ADR-014 §13), so its web font never loads there and it renders in the fallback font, at the capture page's size. In Chrome the window opens at 420×640 in the app's font. The phone has no mini window by design.
- Not captured: Chrome's on-device model and browser agents (WebMCP) exist only in a Chrome that offers them. Their Settings cards are absent here by design; the owner test v2 covers them (Part V, V7–V8). ZIGoals hosted is off in every build.

| # | State | desktop-1440 | tablet-1024 | phone-390 |
|---|---|---|---|---|
| 01 | The launcher at the three sizes (Customize → Size), Today, Showcase | [S](desktop-1440/01-launcher-size-s.png) · [M](desktop-1440/01-launcher-size-m.png) · [L](desktop-1440/01-launcher-size-l.png) | [S](tablet-1024/01-launcher-size-s.png) · [M](tablet-1024/01-launcher-size-m.png) · [L](tablet-1024/01-launcher-size-l.png) | [S](phone-390/01-launcher-size-s.png) · [M](phone-390/01-launcher-size-m.png) · [L](phone-390/01-launcher-size-l.png) |
| 02 | "Hide ZIGi" (the chevron): the button goes, a 10 s Undo toast | [png](desktop-1440/02-launcher-hidden-undo.png) | [png](tablet-1024/02-launcher-hidden-undo.png) | [png](phone-390/02-launcher-hidden-undo.png) |
| 03 | Hidden: the "Show ZIGi" edge tab | [png](desktop-1440/03-edge-tab.png) | [png](tablet-1024/03-edge-tab.png) | [png](phone-390/03-edge-tab.png) |
| 04 | Customize in the panel: look, animation, side, size, greeting, edge tab, knock | [png](desktop-1440/04-customize.png) | [png](tablet-1024/04-customize.png) | [png](phone-390/04-customize.png) |
| 05 | Meet ZIGi (/app/zigi): every state at three sizes | [png](desktop-1440/05-meet-zigi.png) | [png](tablet-1024/05-meet-zigi.png) | [png](phone-390/05-meet-zigi.png) |
| 06 | The panel before any AI is connected: the setup pointer, "Which setup fits me?", and a box answered on the device | [png](desktop-1440/06-panel-before-setup.png) | [png](tablet-1024/06-panel-before-setup.png) | [png](phone-390/06-panel-before-setup.png) |
| 07 | "How many minutes did I meditate this month?" on Health: "Answered on your device · no AI used" | [png](desktop-1440/07-local-answer.png) | [png](tablet-1024/07-local-answer.png) | [png](phone-390/07-local-answer.png) |
| 08 | The same answer with "Records used" open | [png](desktop-1440/08-local-answer-records.png) | [png](tablet-1024/08-local-answer-records.png) | [png](phone-390/08-local-answer-records.png) |
| 09 | Two matching habits: choice chips, never a guess | [png](desktop-1440/09-local-answer-choice.png) | [png](tablet-1024/09-local-answer-choice.png) | [png](phone-390/09-local-answer-choice.png) |
| 10 | "Your week" on the device | [png](desktop-1440/10-your-week.png) | [png](tablet-1024/10-your-week.png) | [png](phone-390/10-your-week.png) |
| 11 | "Patterns": a pattern, not proof | [png](desktop-1440/11-patterns.png) | [png](tablet-1024/11-patterns.png) | [png](phone-390/11-patterns.png) |
| 12 | A MOCK tool call: "ZIGi looked at" chips under the reply | [png](desktop-1440/12-tool-chips.png) | [png](tablet-1024/12-tool-chips.png) | [png](phone-390/12-tool-chips.png) |
| 13 | The records ZIGi chose for the question, as removable chips before sending | [png](desktop-1440/13-question-chips.png) | [png](tablet-1024/13-question-chips.png) | [png](phone-390/13-question-chips.png) |
| 14 | Log mode: the brief's breakfast as five cards, "Add all" | [png](desktop-1440/14-cards-breakfast.png) | [png](tablet-1024/14-cards-breakfast.png) | [png](phone-390/14-cards-breakfast.png) |
| 15 | plan-goal: a goal draft plus supporting habit cards | [png](desktop-1440/15-cards-plan-goal.png) | [png](tablet-1024/15-cards-plan-goal.png) | [png](phone-390/15-cards-plan-goal.png) |
| 16 | create-recipe and grocery-item cards | [png](desktop-1440/16-cards-recipe-groceries.png) | [png](tablet-1024/16-cards-recipe-groceries.png) | [png](phone-390/16-cards-recipe-groceries.png) |
| 17 | Settings → ZIGi · your AI in five groups (Connection shown first) | [png](desktop-1440/17-settings-groups.png) | [png](tablet-1024/17-settings-groups.png) | [png](phone-390/17-settings-groups.png) |
| 18 | The context pack: areas, period, the warning, the preview | [png](desktop-1440/18-context-pack.png) | [png](tablet-1024/18-context-pack.png) | [png](phone-390/18-context-pack.png) |
| 19 | "Which setup fits me?": answers and the suggestion | [png](desktop-1440/19-setup-chooser.png) | [png](tablet-1024/19-setup-chooser.png) | [png](phone-390/19-setup-chooser.png) |
| 20 | "ZIGi's reminders" (Reminders group) | [png](desktop-1440/20-zigi-reminders.png) | [png](tablet-1024/20-zigi-reminders.png) | [png](phone-390/20-zigi-reminders.png) |
| 21 | The knock on Habits for a due habit (knocking on) | [png](desktop-1440/21-knock.png) | [png](tablet-1024/21-knock.png) | [png](phone-390/21-knock.png) |
| 22 | "Do it now": the check-in card inside the knock | [png](desktop-1440/22-knock-do-it-now.png) | [png](tablet-1024/22-knock-do-it-now.png) | [png](phone-390/22-knock-do-it-now.png) |
| 23 | The tab after "Pop out" (computers only) | [png](desktop-1440/23-mini-window-tab.png) | [png](tablet-1024/23-mini-window-tab.png) | — (by design) |
| 24 | The mini window itself (computers only) | [png](desktop-1440/24-mini-window.png) | [png](tablet-1024/24-mini-window.png) | — (by design) |

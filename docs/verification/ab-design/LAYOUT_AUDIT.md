# Layout audit — Session AB-Design Phase 2, Gate C (final build)

The owner's closing pass, item 2: every route and every state the tool can open (dialogs, sheets, menus), in the
Showcase and on a new empty device, checked for sideways scroll, clipped or spilled text, overlaps, numbers broken
across lines, ring labels outside their inner circle, targets below 44 px on the touch layout (24 px and WCAG 2.5.8's
spacing rule on the pointer layout), text covered by another box, and text contrast against the pixels behind it. The
empty device's states are part of the main Chrome and WebKit runs.

**Build:** production build of `feature/session-ab-design` at `30806b17` on :3104 (local, this Mac), 2026-10-15.
**Tool:** `apps/web/tests/audit/layout-audit.mjs` (usage in its header); one run per report, nothing in parallel.

| Report | Engine | Widths | States | Findings |
|---|---|---|---|---|
| [layout-audit-chrome.md](layout-audit-chrome.md) | Chrome | 320, 390, 430, 768, 1024, 1280, 1440, 1920 | 531 | none |
| [layout-audit-chrome-stress.md](layout-audit-chrome-stress.md) | Chrome, stress records (the Showcase's records rewritten: 40+ character names, US$1,234,567,890.12 and its euro twin, a 4-digit counter day, a goal at 0 %) | 320, 390, 1440 | 200 | none |
| [layout-audit-chrome-touch.md](layout-audit-chrome-touch.md) | Chrome, touch (coarse pointer) | 768, 1024 | 132 | none |
| [layout-audit-webkit.md](layout-audit-webkit.md) | WebKit | 390 | 67 | none |

The "Advisory" lists in the Chrome reports are pointer-layout controls between 24 and 44 px that meet WCAG 2.5.8. They
are not findings, because 44 px applies on touch layouts, where the touch report finds none. ZIGi's launcher, the music
button and Point & tell float over content by the owner's decision (ADR-024 P1) and are left out.

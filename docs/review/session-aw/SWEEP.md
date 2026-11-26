# Session AW — whole-app sweep (owner amendment 6)

**What ran.** Every page of the app (45 routes under `/app`, every page without a record id), on a production build of
`79f2f851` (`NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED`), Chromium, each with the person's data **empty** and
with the **Showcase** loaded, in four views:

| View | Window | Theme |
|---|---|---|
| 320 | 320 × 640 | Nebula |
| 390 | 390 × 844 | Light |
| 1440 | 1440 × 900 | Light |
| 200 % zoom | 640 × 450 CSS px (a 1280 × 900 window at 200 %) | Nebula |

360 page views in all. Every `/api` call answered 503 (nothing left the machine). For each view: the page's console
errors and uncaught errors, the text of `<main>` scanned for `NaN`, `undefined`, `Infinity` and `[object Object]`, the
document's sideways scroll (`scrollWidth − innerWidth`, with the elements past the edge), and axe-core (WCAG 2.0–2.2 A
and AA, the repository's own helper `tests/p6-helpers.ts`), serious and critical findings. The sweep script is a one-off
probe (not a suite): its results are summarised here.

## Result

| Check | Views with a finding |
|---|---|
| Console or uncaught errors | 0 of 360 |
| `NaN` / `undefined` / `Infinity` / `[object Object]` in the page | 0 of 360 |
| Sideways scroll (cut off at 320 px or 200 % zoom) | 0 of 360 |
| Accessible names (axe: button-name, link-name, label, aria-*) | 0 of 360 |
| axe, any serious or critical finding | 3 of 360, all `target-size` (below) |

### The three `target-size` findings
| Page | View | Element |
|---|---|---|
| `/app/settings/reminders` | 200 % zoom, empty and Showcase | the reminder switches (`.reminders-switch input`) |
| `/app/goals/new` | 390, Showcase | the third goal idea (`.goal-idea`) |

Each appears in one view only, at the foot of the first screen: axe reads the page from its top, where the phone and
200 % views' fixed bars cover the lower edge of the window. The verdict per finding is recorded after the probe below.

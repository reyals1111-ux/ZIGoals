# Visual V2 — one ZIGoals product

Run 7 evolves the existing application into **ZIGoals — Goals, Habits & Health**. The financial Goal layer and the original ZIGChain roadmap remain foundational. Today connects destination, plan, repeated action and private wellbeing; no new server or financial authority is introduced.

## Composition and brand

The owner-supplied Final UI Mockup V2 is the visual reference. The implementation uses a fixed desktop sidebar, cinematic planetary hero, compact illustrated Goal cards with orbital progress, statistics, actionable daily previews and an asymmetric companion rail. V2.1 uses owner-authorized, text-free local artwork reconstructed from the reference for the hero, wallet, destination, shared starfield and footer. Real HTML supplies every heading, value and control. The approved simplified home, mountain and garden Goal illustrations remain SVG. [Artwork provenance and size](../design/V21_ARTWORK.md) document the six optimized WebPs; the original V2 vector-only evidence remains historical.

The palette runs cyan → electric blue → violet → magenta/pink over near-black navy, with a restrained warm tip in featured text. Stable decorative Goal/Habit colors are derived from IDs and never replace semantic status colors. Normal cards remain quiet; action surfaces have selective edge lighting; hero/destination scenes carry depth. Goals use orbits, Habits constellation/cadence history, Health calmer aurora/gauges, Ecosystem a network motif and Activity a timeline. No new runtime dependency, remote font, animation package or remote image domain was added.

**Orbit Weave** is the temporary original ZG monogram. Three candidates and a comparison are in [brand exploration](../brand/run7/README.md). `BrandMark` consumes a single static `public/icon.svg`; `Wordmark` is separate text. V2.1 emphasizes the large gradient text wordmark in the sidebar and keeps the mark/favicon replaceable for a later owner choice. Replacing the shared asset updates every BrandMark consumer and the favicon. Alternative concepts remain documentation only.

## Routes and semantics

| Route | Role |
|---|---|
| `/app` | Today, preserving the public Alpha entry URL |
| `/app/goals` | All destinations, Active/All/Closed filters |
| `/app/goals/new`, `/app/goals/[id]` | Existing planning and detail flows, visually refined |
| `/app/habits` | Private schedules, counts, streaks and history |
| `/app/health` | Private nutrition, foods/recipes, body trends and manual activity |
| `/app/activity` | Unified private projections plus preserved separate Goal receipts |
| `/app/ecosystem` | Existing read-only references and truthful pending integrations |
| `/app/settings` | Account/network/contract, modules, private recovery and secondary diagnostics |

Goal Engine inputs, calculations, financial actions and wallet state are unchanged. Supporting Habit links include chain + owner + Goal ID, preventing accidental linkage across wallet or local/testnet scopes. A Habit may stand alone. Health measurements and targets are optional; no AI or medical decision is fabricated.

## Local data and recovery

Existing Goal metadata, ledger, backup and reconnect namespaces are unchanged. Habits and Health use independent strict version 1 envelopes, Web Locks, validated durable writes and a 2 MB byte limit. All personal fields remain in browser storage; there is no new API, query-string serialization, telemetry or chain message. This is private local storage, **not encryption** or cloud sync. Anyone with access to the same browser profile can read it.

Settings exports each module separately to preserve the proven Goal backup format. Import validates the entire module, requires an explicit replacement choice, preserves exact previous bytes under a recovery key and refuses downgrading a newer stored version. Incorrect drafts keep their forms; unreadable stores block edits. Files contain personal data and no wallet credentials. Domain detail: [Habits](HABITS_V1.md), [Health](HEALTH_V1.md).

## Responsive and motion

The sidebar becomes compact navigation below 900px; all seven destinations remain available. Mobile uses a horizontally browsable Goal strip, compact metrics and touch-sized completion controls, rather than only stacking desktop cards. Verification covers 1440, 1280, 768, 390 and 320×800. Native headings, labeled forms, semantic progress, keyboard focus and text status complement color.

Motion uses CSS: short control/route transitions, card lift, ring/gauge progress and slow ambient glow. `prefers-reduced-motion` disables animation/transition while retaining the composition. There is no animation loop, WebGL, particle engine or video.

## Honest limits

Daily and selected-weekday Habits are supported; exotic recurrence is deferred. Archive is reversible; no permanent Habit deletion workflow is introduced. Health has no photo recognition, wearable sync, remote food lookup or medical advice. Nutrition targets are user supplied, not recommendations. Activity reflects current saved logs, not an immutable audit ledger. No contract is deployed, no adapter is enabled, and public Alpha financial signing/broadcast remain disabled. Duplicate dynamic HSTS/X-Robots-Tag values remain the documented pre-existing minor issue.

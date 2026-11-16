# ADR-041 — Session AR: "NOVA, COMPOSED"

- **Status:** in progress (branch `feature/session-ar-nova-composed`, Draft PR; not merged, not deployed)
- **Base:** `main` `7106630107b97cb1c131756263a97384cb719546` (Merge #101), live as Alpha #56
- **Scope sources:** the owner's brief for Session AR (16 Nov 2026); ADR-038 Q11–Q13 (rounds 4–7 of the critique and what
  they left open); `docs/design/NOVA_AM_ART_DIRECTION.md`; `review/session-am-refs` (43 owner mockups; still the bar).

## Why this session exists
Four rounds with two fresh critics each left NOVA at star 7–8, widgets 7, stage 6–7 (ADR-038 Q11). Three rounds running
the critics asked for the same thing: one dominant instrument a widget, panels of differing size and weight as satellites
of the star instead of two equal wings, and a star that the stage is built around at 1440 px. That is a structure, not a
polish pass. The cause, read from the code: `placeOrbit` fills two columns with same-width panels in rows of one, two or
four units; the Showcase's ten widgets are seven medium and three small; and at 1440 × 900 the star is capped by the stack
of words around it (about 400 px). Session AR rebuilds the composition, bounds the critique at three rounds, and closes the
leftovers that need judgement. A later Opus session takes the small polish items.

## Owner decisions (16 Nov 2026)
**Approved: the plan below and its four approval items.**
- **P1 Orbits on Today = one additive, device-only record** `zigoals:today-orbits:v1` (`{version: 1, shown?: boolean}`),
  off by default, added from Today's own controls; TIER 3 stored format; in Export, backup format 4, restore, erase and the
  catalogue; never synced. Reason: a new widget kind or metric in the synced settings record is refused by older builds
  (ADR-040 D16b).
- **P2 Deliberate test changes** carry `Session AR (<id>, deliberate)` with an equally strict replacement. `hud-fit`'s
  counts stay (at least 3 panels whole at 1440, 4 at 1920, the four pillar HUDs beside the star, nothing cut).
- **P3 Display tiers override the drawn size, not the stored one.** A widget stored as M may be drawn as a hero or a
  compact plate; Arrange still sets S / M / L, and L always wins a hero place.
- **P4 New words on the stage:** one honest line for a star whose code did not load. Nothing else in NOVA's copy changes.

**The owner's change to the composition, "the star makes room" (verbatim in substance):**
- **S1** Widgets never cover the star's core or bezel, and the star never sits over a widget's content; only its outer
  light may pass behind a panel's glass.
- **S2** The star's size follows how full the stage is. An empty stage, or one or two widgets: the large star (at least
  45 % of the stage at 1440). As more widgets are made on request it shrinks smoothly to make room (a one-time motion;
  instant with Motion Off or reduced motion), never below its size on `main` today (about 400 px at 1440). At 1440 with
  four or more widgets, each wing shows at least a hero and a supporting panel beside the star.
- **S3** A newly made widget still arrives as its wing's hero with the beam from the star; older ones step down to
  supporting, compact, then the band. `hud-fit`'s counts stay as they are.
- **S4** The critique captures show it: empty, two widgets, the full Showcase.

**Standing rules** (unchanged): consumer first, chain invisible; private by design; non-custodial (money only as a
pre-filled confirm card the person signs); no fake or simulated data shown as real (the Showcase is labelled); no
projection as a guarantee; never a film or comic reference; no pointer tracking; Motion Off and reduced motion still and
complete; everything paused when hidden; idle near zero; readability (labels ≥ 14 px, body 15–16 px, targets ≥ 44 px,
contrast ≥ 4.5:1); the protected list outside NOVA; no new dependency, service, CSP change, wallet, signing or key change;
route weights inside every budget; stored data only additive.

## The plan as approved (the composition, in words)
**Principle: a star with satellites.** Every widget on the stage has a *tier* that is worked out, never stored: **hero**
(one a wing: a large panel, one dominant instrument, a 48–64 px figure), **supporting** (a medium panel: instrument and
figure), **compact** (a one-unit plate: the figure and a micro-instrument). Bodies already draw three sizes, so a tier is
handed to a body as its display size (hero → L, supporting → M, compact → S); the catalogue, the gates, the summon step
and the stage record are untouched. Reading order on a computer: the left hero (top left, the thing asked for), the star
and NOVA's answer, the right hero (bottom right: the right wing is the left one upside down, so the eye crosses the star
on a diagonal), the supporting panels, the satellites.
- **2560 × 1440:** the star's column is the widest; a wing is a hero across its width with two supporting panels side by
  side; compact plates are a satellite strip under the star, inside the first view.
- **1920 × 1080:** the same order with narrower wings (hero + one supporting stacked).
- **1440 × 900:** built around the star; with S2 the star gives way as the stage fills, and from four widgets each wing
  holds a hero and a supporting panel.
- **Empty stage:** calm, unchanged. **Tablet:** layout untouched. **Phone:** the chat agent, in the same language.
- **Bento, Focus, Minimal, arranging, presets, drag and arrow keys:** mechanics unchanged; while arranging, panels show in
  their stored sizes.

## Decisions (made by the session; D-numbers are referenced from code comments)
Filled as the work goes.

## Critique rounds (at most three; two fresh critics a round, shown only the references and the newest captures)
| Round | Build | Critic | Star | Widgets | Stage | Verdict | Remaining gaps |
|---|---|---|---|---|---|---|---|

## Before and after, per surface
Filled at the end.

## Closing table
Filled at the end (each part: commits and evidence).

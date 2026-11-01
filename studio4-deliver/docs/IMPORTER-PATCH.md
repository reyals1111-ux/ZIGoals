# Importer patch (constants only) — `scripts/zigi/import-studio.mjs`

The Studio-4 delivery is a pure file swap for everything today's importer knows. Three constant tables need new entries for
the rest; no logic changes. `deliver/app-swap-now/` passes the importer as it is; `deliver/app/` passes it with this patch
(verified by `scripts/verify_delivery.py --patched`, a Python port of `checkFile` / `parseName`).

## 1. STATE_BY_CODE += the fourteen new states (manifest keys as in `components/zigi/manifest.json`)

```js
const STATE_BY_CODE = {F001: 'idle', F002: 'greeting', F003: 'insight', F004: 'listening', F005: 'speaking', F006: 'presenting', F007: 'attention', F008: 'sleepy', F009: 'celebrate', T001: 'thinking', E001: 'error',
  F010: 'reading-your-data', F011: 'writing-proposal', F012: 'success', F013: 'proud', F014: 'curious', F015: 'surprised', F016: 'confused', F017: 'empathetic',
  F018: 'encouraging', F019: 'wave-goodbye', F020: 'reminder', F021: 'offline', F022: 'peek', F023: 'loading-model'};
```

## 2. LOOPS += the loop clips the contract names as loops

```js
const LOOPS = new Set(['F001', 'F004', 'F005', 'F007', 'F008', 'T001', 'X010', 'X011', 'X020', 'X021', 'X022',
  'F010', 'F011', 'F021', 'F022', 'F023', 'R003', 'R010', 'R011', 'X012', 'X050', 'X051', 'X052', 'X053']);
```

Note on X020–X022 (gaze): today's importer lists them as loops, so their animated files are encoded with loop count 0. The
clips are NEUTRAL-seamed 2 s glances; looping repeats the glance every 2 s. A held-gaze version needs an app change.

## 3. EXTRA_SLOT += the new extras and the variant pack

```js
const EXTRA_SLOT = {X001: ['transitions', 'greetingInPlace'], X010: ['idleVariants', 'X010'], X011: ['idleVariants', 'X011'], X020: ['gaze', 'chatInput'], X021: ['gaze', 'viewer'], X022: ['gaze', 'target'],
  X012: ['idleVariants', 'X012'], X030: ['celebrations', 'cheer'],
  X050: ['variants', 'speakingB'], X051: ['variants', 'speakingC'], X052: ['variants', 'listeningB'], X053: ['variants', 'thinkingB'], X054: ['variants', 'celebrateSmall']};
```

`fillManifest` creates `skin.extras` with `reactions / idleVariants / transitions / gaze`; add `celebrations: {}` and
`variants: {}` to that default so the two new groups have a holder.

## 4. The 192×253 animated set (optional, recommended)

```js
export const PIXELS = {'1x': [96, 126], '2x': [192, 253], large: [480, 632], animated: [192, 253], animatedFallback: [96, 126]};
export const BUDGETS = {'1x': 40_000, '2x': 100_000, large: 200_000, animated: 1_200_000};   // see INTEGRATION-HANDOFF.md "Budgets"
```

With this, `deliver/app-2x-anim/` replaces the animated WebPs (same names); the APNG fallbacks stay 96×126. Without it,
`deliver/app/` ships the 96×126 animated set inside today's 400 KB.

## 5. Tests to touch

- `brand-assets.test`: the `-2x` count pinned at 28 becomes the delivered count (see INTEGRATION-HANDOFF.md).
- `zigi-assets.test`: the loop list above.
- `zigi-alive.spec`: the optical centre (re-measured value in the handoff).

// Landing V5 fold interludes: pure maths, no DOM. A stage's runway is `runway` px tall and holds a sticky stage one
// viewport (`viewport` px) tall. progress is 0 when the runway's top reaches the bottom of the screen and 1 when its
// bottom does, so the stage is pinned from viewport / runway to 1.

// Measured change between consecutive frames of each 20-frame set (see docs/verification/landing-v5/ASSET_MANIFEST.md),
// and the twelve frames each phone set keeps: the first, the last and ten that split the change evenly.
export const PACE = {
  swan: [0, 0, 0, 0, 0, 6, 18, 11, 4, 11, 9, 15, 6, 10, 9, 14, 9, 1, 0],
  lotus: [0, 0, 0, 0, 0, 0, 0, 15, 22, 7, 4, 10, 7, 10, 11, 5, 10, 20, 22],
  butterfly: [0, 0, 0, 0, 0, 12, 32, 22, 2, 4, 6, 4, 5, 7, 7, 12, 7, 9, 1],
  heart: [0, 0, 0, 0, 18, 19, 6, 1, 5, 6, 4, 3, 5, 7, 18, 14, 10, 2, 0],
  bull: [0, 0, 0, 0, 0, 24, 29, 15, 13, 10, 4, 12, 9, 14, 11, 13, 7, 9, 5],
  z: [0, 0, 0, 0, 7, 14, 14, 11, 11, 11, 6, 8, 10, 9, 4, 15, 16, 9, 0],
};
export const PHONE = {
  swan: [0, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 19],
  lotus: [0, 7, 8, 9, 11, 12, 13, 15, 16, 17, 18, 19],
  butterfly: [0, 5, 6, 7, 8, 10, 12, 13, 15, 16, 17, 19],
  heart: [0, 4, 5, 6, 8, 10, 12, 14, 15, 16, 17, 19],
  bull: [0, 6, 7, 8, 9, 10, 12, 13, 14, 16, 17, 19],
  z: [0, 5, 6, 7, 8, 10, 11, 13, 14, 16, 17, 19],
};
/** Wide screens hold all twenty frames of a set. */
export const WIDE = Array.from({ length: 20 }, (_, i) => i);

export const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const x = clamp(n); return x * x * (3 - 2 * x); };
const between = (p, from, to) => smooth((p - from) / (to - from));

export function progress(top, runway, viewport) {
  if (!(runway > 0)) return 1;
  return clamp((viewport - top) / runway);
}

/** Everything a stage shows at progress p. Only transforms and opacities, plus which frames to draw.
 * With the 170svh runway in styles/final-v5.css the stage is pinned from p = 1 / 1.7 (about 0.59) to 1: the figure
 * arrives about a third folded, folds the rest of the way while pinned, and holds still before the stage leaves. */
export function pose(p) {
  const fold = between(p, 0.36, 0.9);
  return {
    fold,
    // The paper folds while it rises into place and settles with a last small turn.
    figure: { opacity: between(p, 0.26, 0.42), scale: 0.9 + 0.1 * fold, y: 46 * (1 - between(p, 0.2, 0.62)), rotate: -3 * (1 - fold) },
    // Depth: the far stars barely move, the near ones more, the planet rises the most.
    far: { y: -40 * (p - 0.5) },
    near: { y: -110 * (p - 0.5) },
    planet: { y: 120 * (1 - between(p, 0.1, 0.95)), opacity: 0.25 + 0.6 * between(p, 0.15, 0.7) },
    slogan: { opacity: between(p, 0.55, 0.75), y: 28 * (1 - between(p, 0.55, 0.8)) },
  };
}

/** How far into a 20-frame set fold progress f is, as a fractional frame index from 0 to 19. Each step between two
 * frames gets scroll in proportion to how much the picture changes (`pace`: the measured change between consecutive
 * frames, 19 numbers, recorded in docs/verification/landing-v5/ASSET_MANIFEST.md). Held frames still get a little
 * scroll and a burst of change is capped, so the paper keeps moving at an even pace. */
export function filmPosition(f, pace) {
  const weights = pace.map(change => 1.5 + Math.min(change, 14));
  let left = clamp(f) * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < weights.length; i++) {
    if (left <= weights[i]) return i + left / weights[i];
    left -= weights[i];
  }
  return weights.length;
}

/** The two loaded frames to blend at a film position. `at` lists which frames of the 20 a set holds, in order (all
 * twenty on wide screens, twelve on phones). The blend happens in the middle of each step, so a frame is seen whole
 * before the next one takes over and two shapes are never doubled for long. */
export function frames(position, at) {
  const last = at.length - 1;
  if (!(position > at[0])) return { a: 0, b: 0, mix: 0 };
  if (position >= at[last]) return { a: last, b: last, mix: 0 };
  let a = 0;
  while (at[a + 1] < position) a++;
  return { a, b: a + 1, mix: smooth((position - at[a]) / (at[a + 1] - at[a]) * 1.6 - 0.3) };
}

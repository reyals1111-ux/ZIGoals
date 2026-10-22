import {existsSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {PLANET_DESIGNS} from './planet-designs';
import {orbitPoint} from './planet-orbit';

/** Session AG Polish (owner Part 4, non-negotiable 8): the planets' files exist, are WebP, and weigh ≤ 60 kB together. */
const PUBLIC = join(__dirname, '..', '..', 'public');
describe('the orbit planets\' assets and geometry', () => {
  test('every layer exists as WebP and each planet\'s layers together weigh 60 kB or less', () => {
    for (const d of Object.values(PLANET_DESIGNS)) {
      const files = [d.sphere.src, d.sphere.srcSm, ...d.moons.map(m => m.src)];
      let bytes = 0;
      for (const f of files) { expect(f, d.id).toMatch(/\.webp$/); const p = join(PUBLIC, f); expect(existsSync(p), f).toBe(true); bytes += statSync(p).size; }
      expect(bytes, `${d.id}: ${bytes} bytes`).toBeLessThanOrEqual(60_000);
    }
  });
  test('every moon passes behind its sphere on its run (fully hidden at its farthest point) and rests clear of it on the far side', () => {
    for (const d of Object.values(PLANET_DESIGNS)) for (const m of d.moons) {
      const far = orbitPoint(m.orbit, .75), lo = Math.min(m.from, m.to), hi = Math.max(m.from, m.to);
      const passes = [.75, -.25, 1.75].some(t => t > lo && t < hi);
      expect(passes, `${d.id}: the run goes round the far side`).toBe(true);
      expect(Math.hypot(far.x, far.y) + m.size / 2, `${d.id}: hidden behind the sphere at its farthest`).toBeLessThanOrEqual(50.5);
      // (At rest on the far side a moon stands clear of the sphere's disc — never half-clipped; on the near side it may stand in front of it.)
      for (const t of [m.from, m.to]) { const p = orbitPoint(m.orbit, t); if (p.near < 0) expect(Math.hypot(p.x, p.y), `${d.id}: rests clear of the sphere`).toBeGreaterThan(50 + m.size / 2 - 1); }
    }
  });
});

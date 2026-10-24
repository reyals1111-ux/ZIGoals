# Checklist orbit planets

The seven "orbit planets" on the Checklist path: one larger node per orbit. Each is matte until its orbit is complete, then lit with a one-time animation.

## Provenance

The owner made these planets with Grok Imagine and owns the artworks. The originals (784×1168 RGB pictures on a starfield) are **not** in this repository. Only the cut-outs below are, made from those originals by `scripts/checklist/prepare-planets.py`.

## Files

One folder per planet id (`04` … `10`):

| File | What it is |
| --- | --- |
| `sphere.webp` | 256×256, the planet's sphere alone on full transparency: an exact anti-aliased disc (diameter 254 px, ~1.25 px feathered edge, a 1-px margin that is fully clear: alpha 0 all round the file's edge) with its own surface and rim light. There is no starfield and no halo. Where a ring crossed in front of the sphere in the art, that strip has been retouched out, because the ring is drawn again in SVG. |
| `sphere-sm.webp` | The same sphere at 128×128 (diameter 126 px). |
| `moon-1.webp`, `moon-2.webp` | Moons as anti-aliased discs at 2× their display size next to a 128-px sphere. Planets 04 and 07 have one moon, 08 has two, the others have none. |

| Planet | Art | Files |
| --- | --- | --- |
| 04 | teal sphere, one wide glowing tilted band, one moon | sphere, sphere-sm, moon-1 |
| 05 | cyan glowing sphere, no ring | sphere, sphere-sm |
| 06 | blue electric sphere, double ring | sphere, sphere-sm |
| 07 | magenta sphere, dusty rubble ring, one moon | sphere, sphere-sm, moon-1 |
| 08 | teal sphere, thin orbit line, two moons | sphere, sphere-sm, moon-1, moon-2 |
| 09 | dark purple sphere, three crossing neon orbits with two small glowing bodies | sphere, sphere-sm |
| 10 | green-teal sphere, wide banded ring | sphere, sphere-sm |

Each planet's files total under 17 kB.

Session AG Polish 3 (owner Part 2): the feather had reached the file's edge at the middle of each side (alpha up to 25 of 255). Every file's 1-px edge was cleared by rewriting only its lossless alpha chunk; the colour data is byte for byte the same. The script now keeps that edge clear, and `apps/web/tests/checklist-planet-halo.spec.ts` checks every file.

## Rings, orbits, moons and mist are drawn in code

Only the spheres and moons are pictures. Rings, orbits, neon traces, the bodies on the neon orbits, the glow and the mist are drawn in SVG/CSS from `apps/web/lib/path/planet-designs.ts`. That file holds the geometry measured from the art in sphere units (radius 50, origin at the sphere's centre, +y down): each ring's centre, radii, tilt, width, strands and colours; each moon's size, orbit and from/to positions; and the layout extent. A ring's far half is drawn behind the sphere and its near half in front, so the moons pass behind the sphere.

## Regenerating

With the originals in a folder of your own (named `04-planet-….jpg` … `10-planet-….jpg`):

```sh
python3 -I scripts/checklist/prepare-planets.py --refs /path/to/originals
# optional: --out DIR (default apps/web/public/art/checklist/planets), --debug DIR (mask and retouch images), planet ids
```

The script needs only Python 3 with Pillow (WebP support) and numpy. The per-planet constants at the top of the script (first circle fit, front-ring masks, moon circles) were measured on the originals. The script measures the limb itself, so the sphere's rim ends exactly at the disc edge. If the art changes, measure again and update `planet-designs.ts` to match.

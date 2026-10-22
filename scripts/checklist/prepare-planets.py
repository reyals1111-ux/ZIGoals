#!/usr/bin/env python3
"""Cut the owner's seven planet artworks into the Checklist's layered "orbit planet" assets.

The owner made the artworks (Grok Imagine) and owns them. The originals are NOT in this repository; pass the folder that
holds them. Each original is a 784x1168 RGB picture of one planet on a starfield. For every planet this writes, into
<out>/<id>/:

  sphere.webp      256x256, the sphere alone on full transparency: an exact anti-aliased disc (diameter 254 px, a 1-px
                   transparent margin, ~1.25 px feathered edge). The art's limb is measured per angle and warped onto
                   that circle, so the sphere's own rim light ends exactly at the disc edge (no starfield, no halo).
                   Where a ring or orbit passes IN FRONT of the sphere in the art, those pixels are retouched out
                   (masked diffusion for the shading + the sphere's own texture copied from beside the gap), because the
                   app draws that ring again in SVG from apps/web/lib/path/planet-designs.ts.
  sphere-sm.webp   the same at 128x128 (diameter 126 px).
  moon-1.webp ...  each moon cut out as a disc (diameter = size - 2 px) at 2x its display size next to a 128-px sphere.

Usage (run with an isolated interpreter; needs only Pillow with WebP and numpy):
  python3 -I scripts/checklist/prepare-planets.py [--refs DIR] [--out DIR] [--debug DIR]
The geometry constants below were measured on the originals (edge analysis + ridge/profile fits, checked by eye).
"""
from __future__ import annotations

import argparse
import glob
import math
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DEFAULT_REFS = '/tmp/claude-0/-home-user-ZIGoals/e139674f-46ec-506b-a27a-a3dad519e95d/scratchpad/owner-refs'
DEFAULT_OUT = os.path.join(ROOT, 'apps', 'web', 'public', 'art', 'checklist', 'planets')

# Per planet, in art pixels of the original:
#   circle  - first circle fit of the limb (cx, cy, r); the per-angle limb is then measured around it.
#   window  - how far inside/outside that circle the limb search runs (px).
#   front   - rings/orbits whose NEAR half crosses the sphere in front: ('line', ellipse, inner_px, outer_px) masks the
#             near half of the ellipse widened by inner_px toward its centre and outer_px away from it (perpendicular
#             distance; the masks cover the band's glow too). ellipse = (cx, cy, rx, ry, tilt_deg) is the band's centre
#             line over the sphere; the near half is the half whose unrotated y > 0.
#   moons   - (cx, cy, r) of each moon.
PLANETS = {
    '04': dict(circle=(403.25, 651.98, 202.91), window=(8, 12),
               front=[('line', (387.71, 637.0, 345.76, 57.85, -18.51), 24, 42)],
               moons=[(629.70, 431.90, 38.95)]),
    '05': dict(circle=(390.19, 584.66, 162.21), window=(8, 8), front=[], moons=[]),
    '06': dict(circle=(397.24, 576.59, 233.86), window=(10, 10),
               front=[('line', (395.11, 582.33, 341.48, 138.23, -26.28), 30, 30)],
               moons=[]),
    '07': dict(circle=(386.04, 575.76, 223.03), window=(8, 14),
               front=[('line', (406.67, 573.95, 334.96, 71.08, -20.31), 24, 30)],
               moons=[(632.82, 280.54, 35.25)]),
    '08': dict(circle=(390.90, 581.79, 172.64), window=(8, 10),
               front=[('line', (399.8, 558.5, 274.6, 117.9, -20.38), 7, 7)],
               moons=[(554.22, 410.81, 28.49), (633.45, 647.55, 23.26)]),
    '09': dict(circle=(392.08, 569.06, 225.54), window=(8, 16),
               front=[('line', (397.0, 555.5, 338.6, 119.5, 32.20), 16, 16),
                      ('line', (390.5, 543.8, 326.0, 118.3, -30.12), 16, 16),
                      ('line', (395.9, 592.0, 333.5, 127.7, -14.76), 16, 16)],
               moons=[]),
    '10': dict(circle=(400.84, 583.10, 171.83), window=(8, 10),
               front=[('line', (406.42, 583.32, 289.44, 79.3, -20.55), 36, 34)],
               moons=[]),
}

SPHERE_SIZES = {'sphere.webp': 256, 'sphere-sm.webp': 128}
SM_SPHERE = 128  # moons are sized for a 128-px sphere, then stored at 2x
FEATHER = 1.25   # px, width of the alpha ramp at the disc edge
INSET = 1.0      # art px: colours are taken this far inside the measured limb, so no background reaches the edge
WEBP = dict(quality=82, alpha_quality=90, method=6)


# ---------------------------------------------------------------------------------------------------------------- utils
def bilinear(img: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    x = np.clip(x, 0, w - 1.001)
    y = np.clip(y, 0, h - 1.001)
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx = x - x0
    fy = y - y0
    if img.ndim == 3:
        fx = fx[..., None]
        fy = fy[..., None]
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy)
            + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)


def blur(img: np.ndarray, sigma: float) -> np.ndarray:
    r = int(math.ceil(sigma * 3))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    out = img.astype(float)
    for axis in (0, 1):
        pad = [(0, 0)] * out.ndim
        pad[axis] = (r, r)
        p = np.pad(out, pad, mode='edge')
        acc = np.zeros_like(out)
        for i, kv in enumerate(k):
            sl = [slice(None)] * out.ndim
            sl[axis] = slice(i, i + out.shape[axis])
            acc += kv * p[tuple(sl)]
        out = acc
    return out


def ellipse_coords(e, x: np.ndarray, y: np.ndarray):
    """Unrotated coordinates of points relative to ellipse e, plus the scale s (s=1 on the ellipse)."""
    cx, cy, rx, ry, tilt = e
    a = math.radians(tilt)
    dx, dy = x - cx, y - cy
    u = dx * math.cos(a) + dy * math.sin(a)
    v = -dx * math.sin(a) + dy * math.cos(a)
    s = np.sqrt((u / rx) ** 2 + (v / ry) ** 2)
    return u, v, s


# -------------------------------------------------------------------------------------------------------- limb measure
def limb_profile(lum: np.ndarray, circle, window, order: int = 4):
    """Per-angle limb radius r(theta). The limb is traced as one continuous edge: a shortest path over (angle, radius)
    that follows the outward brightness drop near the first circle fit while staying smooth (so a ring crossing the limb
    or a dark limb with a weak edge cannot pull it off), then a low-order Fourier series is fitted to that path, weighting
    angles by edge strength. Returns the Fourier coefficients and diagnostics."""
    cx, cy, r0 = circle
    win_in, win_out = window
    step = 0.25
    th = np.radians(np.arange(0, 360, 1.0))
    rs = np.arange(r0 - win_in, r0 + win_out, step)
    X = cx + np.outer(np.cos(th), rs)
    Y = cy + np.outer(np.sin(th), rs)
    v = bilinear(lum, X, Y)
    k = np.ones(5) / 5
    v = np.apply_along_axis(lambda row: np.convolve(row, k, mode='same'), 1, v)
    g = np.zeros_like(v)
    g[:, 3:-3] = np.maximum(-(v[:, 4:-2] - v[:, 2:-4]) / 2, 0)  # outward drop
    g /= max(np.percentile(g, 99), 1e-6)
    na, nr = g.shape
    # Viterbi over two laps (circular), at most 1 px change per degree, quadratic smoothness penalty.
    K = int(round(1.0 / step))
    lam = 0.004
    cost = -np.minimum(g, 1.5)
    D = cost[0].copy()
    back = np.zeros((2 * na, nr), int)
    for i in range(1, 2 * na):
        best = np.full(nr, np.inf)
        arg = np.zeros(nr, int)
        for d in range(-K, K + 1):
            prev = np.full(nr, np.inf)
            if d >= 0:
                prev[d:] = D[:nr - d] if d else D
            else:
                prev[:d] = D[-d:]
            c = prev + lam * d * d
            better = c < best
            best[better] = c[better]
            arg[better] = (np.arange(nr) - d)[better]
        D = best + cost[i % na]
        back[i] = arg
    path = np.zeros(2 * na, int)
    path[-1] = int(np.argmin(D))
    for i in range(2 * na - 1, 0, -1):
        path[i - 1] = back[i, path[i]]
    lap = path[na:]  # the second lap is independent of the arbitrary start
    re = rs[lap] + 0.0
    strength = g[np.arange(na), lap]

    def design(t):
        cols = [np.ones_like(t)]
        for n in range(1, order + 1):
            cols += [np.cos(n * t), np.sin(n * t)]
        return np.stack(cols, 1)

    A = design(th)
    w = np.clip(strength, 0.05, 1.0)
    reg = np.diag([0.0] + [0.5 * n * n for n in range(1, order + 1) for _ in (0, 1)])
    Aw = A * w[:, None]
    coef = np.linalg.solve(Aw.T @ A + reg, Aw.T @ re)
    res = re - A @ coef
    keep = strength > 0.15
    return coef, dict(theta=th, measured=re, keep=keep, sd=float(np.std(res[keep])), inliers=float(keep.mean()))


def limb_radius(coef, theta: np.ndarray) -> np.ndarray:
    order = (len(coef) - 1) // 2
    r = np.full_like(theta, coef[0], dtype=float)
    for n in range(1, order + 1):
        r += coef[2 * n - 1] * np.cos(n * theta) + coef[2 * n] * np.sin(n * theta)
    return r


# ----------------------------------------------------------------------------------------------------------- retouch
def front_mask(shape, origin, fronts):
    h, w = shape
    oy, ox = origin
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    xx += ox
    yy += oy
    m = np.zeros(shape, bool)
    for f in fronts:
        _, e, inner, outer = f
        cx, cy, rx, ry, tilt = e
        u, v, s = ellipse_coords(e, xx, yy)
        gs = np.sqrt((u / (rx * rx)) ** 2 + (v / (ry * ry)) ** 2) / np.maximum(s, 1e-6)
        d = (s - 1) / np.maximum(gs, 1e-9)  # signed perpendicular distance, + outside
        m |= (v > 0) & (d >= -inner) & (d <= outer)
    return m


def diffuse(values: np.ndarray, known: np.ndarray, domain: np.ndarray, iters: int = 120) -> np.ndarray:
    """Fill domain & ~known by repeated neighbour averaging (coarse-to-fine), keeping known pixels fixed."""
    h, w = known.shape
    unknown = domain & ~known
    out = values.copy()
    if not unknown.any():
        return out
    if min(h, w) > 24:
        H2, W2 = (h + 1) // 2, (w + 1) // 2
        pv = np.zeros((H2 * 2, W2 * 2, values.shape[2]))
        pk = np.zeros((H2 * 2, W2 * 2))
        pd = np.zeros((H2 * 2, W2 * 2), bool)
        pv[:h, :w] = values * known[..., None]
        pk[:h, :w] = known
        pd[:h, :w] = domain
        sv = pv.reshape(H2, 2, W2, 2, -1).sum((1, 3))
        sk = pk.reshape(H2, 2, W2, 2).sum((1, 3))
        sd = pd.reshape(H2, 2, W2, 2).any((1, 3))
        cv = sv / np.maximum(sk, 1)[..., None]
        coarse = diffuse(cv, sk > 0, sd, iters)
        up = np.repeat(np.repeat(coarse, 2, 0), 2, 1)[:h, :w]
        out[unknown] = up[unknown]
    else:
        out[unknown] = values[known].mean(0)
    dom = domain.astype(float)
    pad_d = np.pad(dom, 1)
    shifts = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    cnt = sum(pad_d[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy, dx in shifts)
    cnt = np.maximum(cnt, 1)[..., None]
    for _ in range(iters):
        p = np.pad(out * dom[..., None], ((1, 1), (1, 1), (0, 0)))
        acc = sum(p[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy, dx in shifts)
        avg = acc / cnt
        out[unknown] = avg[unknown]
    return out


def copied_detail(detail: np.ndarray, known: np.ndarray, unknown: np.ndarray) -> np.ndarray:
    """High-frequency texture for unknown pixels, copied from the sphere's own surface one mask-height above (or below,
    or two heights away) with a single offset for the whole mask, so the copied grain is not sheared or mirrored."""
    h, w = unknown.shape
    out = np.zeros_like(detail)
    runs = unknown.sum(0)
    if not runs.any():
        return out
    lmax = int(runs.max()) + 6
    ys, xs = np.nonzero(unknown)
    done = np.zeros(len(ys), bool)
    for oy, ox in [(-lmax, 0), (lmax, 0), (-2 * lmax, 0), (2 * lmax, 0), (-lmax, -lmax), (-lmax, lmax), (lmax, -lmax),
                   (lmax, lmax)]:
        sy, sx = ys + oy, xs + ox
        ok = ~done & (sy >= 0) & (sy < h) & (sx >= 0) & (sx < w)
        ok[ok] = known[sy[ok], sx[ok]]
        out[ys[ok], xs[ok]] = detail[sy[ok], sx[ok]]
        done |= ok
    return out


def retouch(img: np.ndarray, sphere_dom: np.ndarray, origin, fronts):
    if not fronts:
        return img, np.zeros(sphere_dom.shape, bool)
    m = front_mask(sphere_dom.shape, origin, fronts) & sphere_dom
    known = sphere_dom & ~m
    kf = known.astype(float)
    sig = 2.0
    low_known = blur(img * kf[..., None], sig) / np.maximum(blur(kf, sig), 1e-6)[..., None]
    detail = np.where(known[..., None], img - low_known, 0)
    low = diffuse(np.where(known[..., None], low_known, 0), known, sphere_dom, iters=150)
    tex = copied_detail(detail, known, m)
    out = img.copy()
    out[m] = low[m] + 0.85 * tex[m]
    return out, m


# -------------------------------------------------------------------------------------------------------- rendering
def render_disc(img: np.ndarray, centre, radius_fn, size: int, ss: int = 3) -> Image.Image:
    """Warp the region inside radius_fn(theta) onto an exact disc of diameter size-2, with colours clamped just inside
    the limb (no background at the edge) and an analytic anti-aliased alpha."""
    cx, cy = centre
    R = (size - 2) / 2.0
    n = size * ss
    c = np.arange(n) / ss + 0.5 / ss
    X, Y = np.meshgrid(c - size / 2.0, c - size / 2.0)
    d = np.hypot(X, Y)
    th = np.arctan2(Y, X)
    rho = np.minimum(d / R, (R - 1.0) / R)
    src_r = rho * (radius_fn(th) - INSET)
    rgb = bilinear(img, cx + src_r * np.cos(th), cy + src_r * np.sin(th))
    rgb = rgb.reshape(size, ss, size, ss, 3).mean((1, 3))
    c1 = np.arange(size) + 0.5 - size / 2.0
    X1, Y1 = np.meshgrid(c1, c1)
    alpha = np.clip(0.5 + (R - np.hypot(X1, Y1)) / FEATHER, 0, 1)
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).round().astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')


def moon_file_size(moon_r: float, sphere_r: float) -> int:
    display = math.ceil(moon_r / sphere_r * SM_SPHERE - 1e-9)  # moon diameter / sphere diameter * 128
    return 2 * display


def find_ref(refs: str, pid: str) -> str:
    hits = sorted(glob.glob(os.path.join(refs, f'{pid}-planet-*.jpg')))
    if not hits:
        sys.exit(f'no original for planet {pid} in {refs} (expected {pid}-planet-*.jpg)')
    return hits[0]


def process(pid: str, refs: str, out_dir: str, debug: str | None):
    cfg = PLANETS[pid]
    img = np.asarray(Image.open(find_ref(refs, pid)).convert('RGB')).astype(float)
    lum = img.mean(axis=2)  # the mean, not the max: bright rims saturate G/B, the edge shows in all three
    coef, info = limb_profile(lum, cfg['circle'], cfg['window'])
    cx, cy, _ = cfg['circle']
    radius_fn = lambda t: limb_radius(coef, t)  # noqa: E731

    # Work on a crop around the sphere.
    rmax = float(limb_radius(coef, np.linspace(0, 2 * np.pi, 720)).max()) + 4
    x0, y0 = int(cx - rmax), int(cy - rmax)
    x1, y1 = int(math.ceil(cx + rmax)) + 1, int(math.ceil(cy + rmax)) + 1
    crop = img[y0:y1, x0:x1]
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(float)
    th = np.arctan2(yy - cy, xx - cx)
    dom = np.hypot(xx - cx, yy - cy) <= radius_fn(th) - INSET + 1.5
    fixed, mask = retouch(crop, dom, (y0, x0), cfg['front'])
    work = img.copy()
    work[y0:y1, x0:x1] = fixed

    pdir = os.path.join(out_dir, pid)
    os.makedirs(pdir, exist_ok=True)
    sizes = {}
    for name, size in SPHERE_SIZES.items():
        im = render_disc(work, (cx, cy), radius_fn, size)
        path = os.path.join(pdir, name)
        im.save(path, 'WEBP', **WEBP)
        sizes[name] = os.path.getsize(path)
    mean_r = float(coef[0])
    for i, (mx, my, mr) in enumerate(cfg['moons'], 1):
        size = moon_file_size(mr, mean_r)
        im = render_disc(img, (mx, my), lambda t, mr=mr: np.full_like(t, mr), size)
        path = os.path.join(pdir, f'moon-{i}.webp')
        im.save(path, 'WEBP', **WEBP)
        sizes[f'moon-{i}.webp'] = os.path.getsize(path)

    if debug:
        os.makedirs(debug, exist_ok=True)
        dbg = crop.copy()
        dbg[mask] = dbg[mask] * 0.4 + np.array([255, 0, 0]) * 0.6
        Image.fromarray(np.clip(dbg, 0, 255).astype(np.uint8)).save(os.path.join(debug, f'{pid}-mask.png'))
        Image.fromarray(np.clip(fixed, 0, 255).astype(np.uint8)).save(os.path.join(debug, f'{pid}-retouched.png'))
        np.save(os.path.join(debug, f'{pid}-limb.npy'), coef)
    rr = limb_radius(coef, np.linspace(0, 2 * np.pi, 360, endpoint=False))
    total = sum(sizes.values())
    print(f'{pid}: centre ({cx:.2f}, {cy:.2f}) limb r mean {mean_r:.2f} (min {rr.min():.1f}, max {rr.max():.1f}; '
          f'fit sd {info["sd"]:.2f}, inliers {info["inliers"]:.0%}) | '
          + ', '.join(f'{k} {v / 1024:.1f} kB' for k, v in sizes.items()) + f' | total {total / 1024:.1f} kB')
    return total


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--refs', default=os.environ.get('PLANET_REFS', DEFAULT_REFS), help='folder with the originals')
    ap.add_argument('--out', default=DEFAULT_OUT, help='output folder (one sub-folder per planet id)')
    ap.add_argument('--debug', default=None, help='optional folder for mask/retouch debug images')
    ap.add_argument('ids', nargs='*', default=sorted(PLANETS), help='planet ids (default: all)')
    a = ap.parse_args()
    for pid in a.ids:
        total = process(pid, a.refs, a.out, a.debug)
        if total > 60 * 1024:
            print(f'  warning: planet {pid} is {total / 1024:.1f} kB (budget 60 kB)')


if __name__ == '__main__':
    main()

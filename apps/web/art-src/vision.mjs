// Session AB-Design (owner request 16): the Showcase vision board's eight illustrations, one nebula style, generated from
// shared sky/star/glow helpers so they read as one set. Run: node apps/web/art-src/vision.mjs [01 07 …] → public/showcase/vision/vision-NN.svg (all eight when no numbers).
// Replace any of them with a licensed photo under the same number (see docs/product/OWNER_UI_REQUESTS_AB.md).
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const W = 800, H = 600;
let seed = 7;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const f = n => Math.round(n * 10) / 10;
const stars = (n, yMax = H * 0.6) => Array.from({length: n}, () => `<circle cx="${f(rand() * W)}" cy="${f(rand() * yMax)}" r="${f(0.5 + rand() * 1.2)}" fill="#fff" opacity="${f(0.25 + rand() * 0.6)}"/>`).join('');
const defs = (extra = '') => `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05040f"/><stop offset=".45" stop-color="#0c0f2c"/><stop offset="1" stop-color="#1a1240"/></linearGradient>
<radialGradient id="glowV" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#9273ff" stop-opacity=".55"/><stop offset="1" stop-color="#9273ff" stop-opacity="0"/></radialGradient>
<radialGradient id="glowC" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#23eaff" stop-opacity=".45"/><stop offset="1" stop-color="#23eaff" stop-opacity="0"/></radialGradient>
<radialGradient id="glowM" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f06dff" stop-opacity=".5"/><stop offset="1" stop-color="#f06dff" stop-opacity="0"/></radialGradient>
<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6e8"/><stop offset=".18" stop-color="#ffd3ae"/><stop offset=".45" stop-color="#ff86c8" stop-opacity=".6"/><stop offset="1" stop-color="#ff86c8" stop-opacity="0"/></radialGradient>
<linearGradient id="neb" x1="0" x2="1"><stop offset="0" stop-color="#23eaff"/><stop offset=".5" stop-color="#9273ff"/><stop offset="1" stop-color="#f06dff"/></linearGradient>
<linearGradient id="nebV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7bddff"/><stop offset=".55" stop-color="#9273ff"/><stop offset="1" stop-color="#f06dff"/></linearGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1f5c"/><stop offset="1" stop-color="#0a0820"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bfefff" stop-opacity=".55"/><stop offset=".5" stop-color="#6fa8ff" stop-opacity=".22"/><stop offset="1" stop-color="#1a1240" stop-opacity=".1"/></linearGradient>
<linearGradient id="dark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2d5e"/><stop offset="1" stop-color="#0b0a24"/></linearGradient>
<linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b4fd6"/><stop offset=".35" stop-color="#2a2466"/><stop offset="1" stop-color="#0b0a24"/></linearGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="rim" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#cfe9ff"/><stop offset=".6" stop-color="#4a4f9a"/><stop offset="1" stop-color="#0b0a24"/></radialGradient>
<linearGradient id="light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8f4ff"/><stop offset="1" stop-color="#8fb3ff"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe6a8"/><stop offset="1" stop-color="#d98a3a"/></linearGradient>
<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fd6ff"/><stop offset="1" stop-color="#0d2a6e"/></linearGradient>
<linearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9b0"/><stop offset="1" stop-color="#7a4f6b"/></linearGradient>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="softer" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
${extra}
</defs>`;
const sky = (glows) => `<rect width="${W}" height="${H}" fill="url(#sky)"/>${glows}<g>${stars(140)}</g>`;
const glow = (id, cx, cy, rx, ry, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})" transform="rotate(${rot} ${cx} ${cy})"/>`;
const haze = (y, color = '#9273ff', op = .16) => `<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="${color}" opacity="${op}" filter="url(#soft)"/>`;
/** A filled runner in mid-stride (no stick figure): wide rounded strokes in one gradient read as a silhouette. */
/** Filled-silhouette primitives. Every shape winds the same way, so one <path> unions them under the nonzero rule. */
const cap = (x1, y1, w1, x2, y2, w2) => {
  const L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L, ny = (x2 - x1) / L, r1 = w1 / 2, r2 = w2 / 2;
  return `M${f(x1 + nx * r1)} ${f(y1 + ny * r1)}L${f(x2 + nx * r2)} ${f(y2 + ny * r2)}A${r2} ${r2} 0 0 0 ${f(x2 - nx * r2)} ${f(y2 - ny * r2)}L${f(x1 - nx * r1)} ${f(y1 - ny * r1)}A${r1} ${r1} 0 0 0 ${f(x1 + nx * r1)} ${f(y1 + ny * r1)}Z`;
};
const dot = (cx, cy, r) => `M${f(cx + r)} ${cy}A${r} ${r} 0 1 0 ${f(cx - r)} ${cy}A${r} ${r} 0 1 0 ${f(cx + r)} ${cy}Z`;
const poly = pts => { let a = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }); if (a > 0) pts.reverse(); return `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`; };
/** A running shoe from heel to toe: flat sole, rounded toe spring, ankle collar rising at the heel. */
const shoe = (hx, hy, tx, ty) => {
  const L = Math.hypot(tx - hx, ty - hy), ux = (tx - hx) / L, uy = (ty - hy) / L, nx = uy, ny = -ux;
  return poly([[-3, 1.5], [0, -.5], [L - 2, -.5], [L + 2.5, 2.5], [L + 2, 6], [L - 5, 9], [L * .5, 12.5], [L * .22, 16.5], [3, 16], [-3.5, 10]].map(([a, b]) => [hx + ux * a + nx * b, hy + uy * a + ny * b]));
};
/** A runner in mid-stride, facing right, ground at y 0, about 205 units tall: forward lean, knee drive, push-off leg, bent arms. */
const RUNNER = [
  'M26 -178C16 -176 8 -168 4 -156C0 -144 -4 -132 -6 -124C-10 -116 -18 -110 -17 -100C-16 -92 0 -92 12 -98C16 -108 18 -118 24 -128C28 -138 36 -146 36 -158C36 -170 32 -178 26 -178Z',
  cap(29, -173, 12.5, 34, -183, 11), dot(37, -193, 13.5), cap(27, -199, 8, 13, -195, 6), cap(13, -195, 6, 3, -187, 3),
  // push-off leg: thigh, shin, calf, shoe on its toe with the heel lifted
  cap(-4, -108, 26, -28, -66, 17), cap(-28, -66, 15, -58, -30, 9), cap(-34, -64, 17, -47, -49, 11), shoe(-68, -24, -41, -1),
  // drive leg: thigh near horizontal, shin hanging back, calf, dorsiflexed shoe
  cap(4, -110, 26, 51, -91, 17), cap(51, -91, 15, 35, -44, 9), cap(43, -80, 17, 37, -62, 11), shoe(27, -35, 58, -38),
  // arms: far arm forward with the fist at chest height, near arm swung back
  dot(28, -163, 8.5), cap(28, -161, 12, 47, -133, 10), cap(47, -133, 10, 64, -154, 8), dot(66, -157, 6.5),
  cap(25, -162, 12, -6, -146, 10), cap(-6, -146, 10, -19, -122, 8), dot(-20, -118, 6),
].join('');
/** Runner silhouette in one fill; with `rim`, a light copy shows a thin rim on the sun side (top/right). */
const runner = (x, y, s = 1, fill = 'url(#nebV)', rim = '') => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="118" rx="44" ry="9" fill="#000" opacity=".45"/><g transform="translate(0 118)">${rim ? `<path d="${RUNNER}" fill="${rim}" opacity=".3" filter="url(#softer)"/><path d="${RUNNER}" fill="${rim}"/>` : ''}<path d="${RUNNER}" fill="${fill}"${rim ? ' transform="translate(-2.4 1.6)"' : ''}/></g></g>`;
const wrap = (title, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">${body}</svg>\n`;
/** A soft horizontal light trail: a thin rect whose gradient fades in from the left (userSpace, so zero-height bboxes never bite). */
const trail = (x1, x2, y, h, color, op = 1) => `<rect x="${x1}" y="${f(y - h / 2)}" width="${x2 - x1}" height="${h}" rx="${h / 2}" fill="${color}" opacity="${op}"/>`;
/** Perspective projection for the library room: eye at the origin looking down +Z, vanishing point (400, 300). */
const P = (X, Y, Z) => `${f(400 + 400 * X / Z)} ${f(300 + 400 * Y / Z)}`;
const quad = (a, b, c, d) => `M${a}L${b}L${c}L${d}Z`;
const scenes = {
  // 01 — a sleek electric sports coupé (no badges) on a wet night road, city glow behind
  '01': () => {
    seed = 101;
    const BODY = 'M172 438C167 420 167 405 172 394L178 382C186 377 196 374 210 371C266 351 342 330 432 326C468 326 496 334 520 348C532 355 542 360 554 365C600 372 646 380 678 390C692 395 700 405 701 416C702 430 697 442 686 447L629.1 450A56 56 0 1 0 530.9 450L311.1 450A56 56 0 1 0 212.9 450L186 448Z';
    const GLASS = 'M238 362C290 343 352 330.5 432 329C466 329 492 336 516 349C528 355 538 360 548 364.5C450 366.5 336 366 238 362Z';
    // distant city: blocks with a scatter of lit windows, two hill bands behind
    let city = '', win = {g: '', c: '', m: ''};
    for (let x = -6; x < 806;) {
      const w = 12 + rand() * 26, tall = 1 + 1.4 * Math.exp(-(((x - 600) / 150) ** 2)) + .6 * Math.exp(-(((x - 150) / 90) ** 2)), h = (8 + rand() * 34) * tall;
      city += `M${f(x)} 346V${f(346 - h)}h${f(w)}V346Z`;
      for (let k = Math.floor(w * h / 140); k > 0; k--) { const c = rand(); win[c < .6 ? 'g' : c < .85 ? 'c' : 'm'] += `M${f(x + 2 + rand() * (w - 5))} ${f(346 - h + 3 + rand() * (h - 7))}h1.8v1.8h-1.8Z`; }
      x += w + 1 + rand() * 4;
    }
    const lamps = [40, 150, 260, 370, 480, 590, 700, 790];
    const vp = [400, 346], persp = Array.from({length: 13}, (_, i) => { const xb = -1400 + i * 300, t = (356 - vp[1]) / (600 - vp[1]); return `<path d="M${f(vp[0] + (xb - vp[0]) * t)} 356L${xb} 600"/>`; }).join('');
    const spokes = Array.from({length: 10}, (_, i) => `<path d="M-1.6 -7L-3.6 -29.5L1.2 -30L1.6 -7Z" transform="rotate(${i * 36 + (i % 2 ? 9 : 0)})"/>`).join('');
    return wrap('An electric sports car on a night road', `${defs(`
<linearGradient id="cPaint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3a6ff"/><stop offset=".17" stop-color="#6f5ff2"/><stop offset=".42" stop-color="#2f2696"/><stop offset=".72" stop-color="#130f4a"/><stop offset=".9" stop-color="#0a0828"/><stop offset="1" stop-color="#3a1a62"/></linearGradient>
<linearGradient id="cRefl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f06dff" stop-opacity=".55"/><stop offset=".3" stop-color="#f06dff" stop-opacity="0"/><stop offset=".7" stop-color="#23eaff" stop-opacity="0"/><stop offset="1" stop-color="#23eaff" stop-opacity=".45"/></linearGradient>
<linearGradient id="cGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4fa8"/><stop offset=".5" stop-color="#121a4a"/><stop offset="1" stop-color="#05061a"/></linearGradient>
<linearGradient id="cSheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f06dff" stop-opacity=".35"/><stop offset=".55" stop-color="#9273ff" stop-opacity=".05"/><stop offset="1" stop-color="#23eaff" stop-opacity=".4"/></linearGradient>
<radialGradient id="cDisc" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3a3f7a"/><stop offset=".7" stop-color="#5a5f9a"/><stop offset="1" stop-color="#1a1840"/></radialGradient>
<linearGradient id="cSpoke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f7ff"/><stop offset=".5" stop-color="#a9b4ec"/><stop offset="1" stop-color="#4a4f9a"/></linearGradient>
<linearGradient id="cRoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1650"/><stop offset=".35" stop-color="#0f0b30"/><stop offset="1" stop-color="#05040f"/></linearGradient>
<linearGradient id="cHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2c86"/><stop offset="1" stop-color="#140f3a"/></linearGradient>
<linearGradient id="cBeam" gradientUnits="userSpaceOnUse" x1="696" y1="0" x2="810" y2="0"><stop offset="0" stop-color="#e9fbff" stop-opacity=".6"/><stop offset="1" stop-color="#23eaff" stop-opacity="0"/></linearGradient>
<linearGradient id="cTrailM" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="180" y2="0"><stop offset="0" stop-color="#f06dff" stop-opacity="0"/><stop offset="1" stop-color="#ff5fb8"/></linearGradient>
<linearGradient id="cTrailC" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="800" y2="0"><stop offset="0" stop-color="#23eaff" stop-opacity="0"/><stop offset=".5" stop-color="#23eaff"/><stop offset="1" stop-color="#23eaff" stop-opacity="0"/></linearGradient>
<linearGradient id="cTrailG" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="800" y2="0"><stop offset="0" stop-color="#ffd27a"/><stop offset=".6" stop-color="#ffd27a" stop-opacity=".1"/><stop offset="1" stop-color="#ffd27a" stop-opacity=".8"/></linearGradient>
<linearGradient id="cFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="cMask"><rect x="0" y="470" width="800" height="130" fill="url(#cFade)"/></mask>
<clipPath id="cGl"><path d="${GLASS}"/></clipPath>
<filter id="cB1" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>
<g id="cWheel" transform="scale(1.12)"><circle r="42" fill="#06051a"/><circle r="39.5" fill="none" stroke="#25214f" stroke-width="3"/><path d="M-31 -25A40 40 0 0 1 12 -38" fill="none" stroke="#9aa2e8" stroke-width="2" opacity=".55"/><circle r="31.5" fill="#0d0c28"/><circle r="25" fill="url(#cDisc)"/><circle r="25" fill="none" stroke="#7d84c8" stroke-width=".8" stroke-dasharray="2 3" opacity=".6"/><circle cx="-4" cy="-17" r="14" fill="#f06dff" opacity=".5" filter="url(#softer)"/><path d="M-20 -14A24 24 0 0 1 9 -22.5L6.5 -15A16 16 0 0 0 -13 -9Z" fill="#ff7ad6"/><g fill="url(#cSpoke)">${spokes}</g><circle r="31" fill="none" stroke="#c9d3ff" stroke-width="3"/><circle r="31" fill="none" stroke="#3a3f7a" stroke-width="1" transform="scale(.94)"/><circle r="7.5" fill="url(#light)"/><circle r="2.6" fill="#0b0a24"/><path d="M-25 -17A30 30 0 0 1 -6 -29.5" fill="none" stroke="#fff" stroke-width="1.6" opacity=".8"/></g>
<g id="car">
<circle cx="262" cy="424" r="55" fill="#04030f"/><circle cx="580" cy="424" r="55" fill="#04030f"/>
<path d="${BODY}" fill="url(#cPaint)"/><path d="${BODY}" fill="url(#cRefl)"/>
<path d="M190 392C260 382 330 380 400 380C470 380 560 385 654 396L662 403C560 395 470 391 400 391C330 391 260 394 188 401Z" fill="#05040f" opacity=".28"/><ellipse cx="430" cy="440" rx="250" ry="12" fill="#f06dff" opacity=".22" filter="url(#softer)"/>
<path d="${GLASS}" fill="url(#cGlass)"/>
<g clip-path="url(#cGl)"><path d="${GLASS}" fill="url(#cSheen)"/><path d="M368 366V344C368 334 386 332 388 341L390 366Z" fill="#03020c" opacity=".7"/><path d="M458 368L470 346C476 340 484 344 482 351L472 368Z" fill="#03020c" opacity=".5"/><path d="M296 322H334L300 372H262Z" fill="#fff" opacity=".16"/><path d="M346 322H360L326 372H312Z" fill="#fff" opacity=".1"/><path d="M468 322H482L448 372H434Z" fill="#cfe9ff" opacity=".14"/></g>
<path d="M408 330L414 364" stroke="#05040f" stroke-width="3.5" opacity=".75"/>
<path d="M238 363C336 366.5 450 367.5 548 365.5" fill="none" stroke="#cfe9ff" stroke-width="1.3" opacity=".7"/>
<path d="M222 365C278 345 346 328 432 327C466 327 493 334 518 347" fill="none" stroke="#fff" stroke-width="1.6" opacity=".75"/>
<path d="M188 387C260 378 330 376 400 376C470 376 560 381 650 392" fill="none" stroke="#fff" stroke-width="2.4" opacity=".55" filter="url(#cB1)"/>
<path d="M300 377C360 375 420 375 470 376" fill="none" stroke="#fff" stroke-width="1.2" opacity=".85"/>
<path d="M558 367C600 374 640 381 676 391" fill="none" stroke="#fff" stroke-width="3" opacity=".5" filter="url(#cB1)"/><path d="M572 370C610 376 640 382 664 388" fill="none" stroke="#fff" stroke-width="1" opacity=".9"/>
<path d="M200 398C224 378 282 372 318 386" fill="none" stroke="#d9d2ff" stroke-width="1.5" opacity=".55"/><path d="M522 394C546 378 606 376 638 394" fill="none" stroke="#d9d2ff" stroke-width="1.5" opacity=".5"/>
<path d="M324 394C352 389 374 391 388 398L380 424C360 420 342 418 322 419Z" fill="#05040f" opacity=".85"/><path d="M324 394C352 389 374 391 388 398" fill="none" stroke="#bfefff" stroke-width="1" opacity=".6"/><g stroke="#2a2466" stroke-width="1.2"><path d="M336 396L332 418M350 395L346 419M364 396L360 420"/></g>
<path d="M518 367C513 392 513 420 521 445M406 367C403 394 404 422 410 445" fill="none" stroke="#05040f" stroke-width="1.4" opacity=".55"/>
<path d="M420 386H448" stroke="#e8f4ff" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>
<path d="M314 447H528" stroke="url(#neb)" stroke-width="2.5"/><path d="M314 447H528" stroke="#23eaff" stroke-width="6" opacity=".35" filter="url(#cB1)"/>
<path d="M522 358C528 347 550 345 559 353C555 361 538 363 522 358Z" fill="url(#cPaint)"/><path d="M526 354C534 348 548 348 555 352" fill="none" stroke="#fff" stroke-width="1" opacity=".8"/>
<path d="M650 436C668 434 684 435 696 439L692 444C676 442 662 442 648 442Z" fill="#05040f" opacity=".8"/>
<path d="M176 440L210 448M182 433L212 441" stroke="#05040f" stroke-width="2" opacity=".8"/>
<path d="M648 393C670 397 688 403 699 412" fill="none" stroke="#23eaff" stroke-width="9" stroke-linecap="round" opacity=".55" filter="url(#softer)"/><path d="M648 393C670 397 688 403 699 412" fill="none" stroke="#f4feff" stroke-width="3" stroke-linecap="round"/>
<path d="M171 397C173 389 175 384 179 380L214 371" fill="none" stroke="#f06dff" stroke-width="11" stroke-linecap="round" opacity=".6" filter="url(#softer)"/><path d="M171 397C173 389 175 384 179 380L214 371" fill="none" stroke="#ff4d9a" stroke-width="3.5" stroke-linecap="round"/><path d="M178 381C188 376 198 373 214 369" fill="none" stroke="#fff" stroke-width="1" opacity=".7"/><path d="M174 392L178 383" stroke="#ffd3ee" stroke-width="1.5" stroke-linecap="round"/>
<path d="M318 432C400 424 470 422 526 426" fill="none" stroke="#a99bff" stroke-width="1.2" opacity=".35"/><use href="#cWheel" x="262" y="423"/><use href="#cWheel" x="580" y="423" transform="rotate(14 580 423)"/>
</g>
`)}${sky(glow('glowV', 560, 170, 360, 180) + glow('glowM', 200, 230, 320, 150) + glow('glowC', 640, 300, 260, 70))}
<path d="M-10 346L-10 300C60 286 120 296 190 282C260 270 330 290 410 280C500 268 560 286 640 276C710 268 760 280 810 274V346Z" fill="url(#cHill)" opacity=".75"/>
<path d="M-10 346V318C80 306 160 316 240 306C330 296 420 314 520 304C620 294 720 310 810 300V346Z" fill="#1a1450" opacity=".9"/>
<ellipse cx="560" cy="330" rx="330" ry="44" fill="#f06dff" opacity=".22" filter="url(#soft)"/><ellipse cx="160" cy="336" rx="220" ry="30" fill="#23eaff" opacity=".14" filter="url(#soft)"/>
<path d="${city}" fill="#0d0a2c"/><path d="${win.g}" fill="#ffd27a" opacity=".85"/><path d="${win.c}" fill="#7bf2ff" opacity=".8"/><path d="${win.m}" fill="#f9a6ff" opacity=".8"/>
${haze(300, '#9273ff', .12)}
<rect x="0" y="346" width="800" height="254" fill="url(#cRoad)"/>
<g fill="#ffd27a">${lamps.map(x => `<rect x="${x - 1}" y="320" width="2" height="30" fill="#2a2466"/><circle cx="${x}" cy="320" r="2.6"/><circle cx="${x}" cy="320" r="9" opacity=".35" filter="url(#softer)"/><rect x="${x - 1.5}" y="356" width="3" height="80" opacity=".2" filter="url(#softer)"/>`).join('')}</g>
<path d="M0 352H800" stroke="#23eaff" stroke-width="2" opacity=".6"/><path d="M0 352H800" stroke="#23eaff" stroke-width="7" opacity=".25" filter="url(#softer)"/>
${trail(0, 800, 362, 1.6, 'url(#cTrailG)', .55)}${trail(0, 800, 368, 1, 'url(#cTrailC)', .5)}
<g stroke="#9fe6ff" opacity=".1">${persp}</g>
<ellipse cx="400" cy="400" rx="460" ry="26" fill="#f06dff" opacity=".1" filter="url(#soft)"/>
<path d="M0 396H800" stroke="#e8f4ff" stroke-width="1.4" stroke-dasharray="22 30" opacity=".35"/>
<path d="M-20 548H820" stroke="#e8f4ff" stroke-width="5" stroke-dasharray="80 64" opacity=".42"/><path d="M-20 548H820" stroke="#9fe6ff" stroke-width="14" stroke-dasharray="80 64" opacity=".12" filter="url(#softer)"/>
<path d="M0 590H800" stroke="#9273ff" stroke-width="3" opacity=".35"/>
<ellipse cx="434" cy="468" rx="290" ry="16" fill="#000" opacity=".7" filter="url(#softer)"/>
<g mask="url(#cMask)"><use href="#car" transform="matrix(1 0 0 -1 0 940)" filter="url(#cB1)" opacity=".9"/></g>
<ellipse cx="180" cy="500" rx="22" ry="40" fill="#f06dff" opacity=".18" filter="url(#soft)"/><ellipse cx="690" cy="500" rx="30" ry="44" fill="#23eaff" opacity=".14" filter="url(#soft)"/>
<path d="M700 410L812 384V452Z" fill="url(#cBeam)" filter="url(#softer)"/><path d="M700 410L812 370V470Z" fill="url(#cBeam)" opacity=".4" filter="url(#soft)"/><ellipse cx="770" cy="476" rx="90" ry="10" fill="#9fe6ff" opacity=".25" filter="url(#softer)"/>
${trail(-10, 176, 386, 3, 'url(#cTrailM)', .9)}${trail(-10, 170, 392, 1.5, 'url(#cTrailM)', .6)}${trail(-10, 160, 430, 2, 'url(#cTrailM)', .35)}${trail(-10, 150, 512, 2, 'url(#cTrailM)', .3)}
<use href="#car"/>
<ellipse cx="262" cy="470" rx="44" ry="3.5" fill="#000" opacity=".8"/><ellipse cx="580" cy="470" rx="44" ry="3.5" fill="#000" opacity=".8"/>
<circle cx="701" cy="411" r="16" fill="#e9fbff" opacity=".55" filter="url(#softer)"/><circle cx="174" cy="388" r="12" fill="#ff5fb8" opacity=".55" filter="url(#softer)"/>`);
  },
  // 02 — a grand piano in a spotlight
  '02': () => (seed = 3671409719, wrap('A grand piano under a soft spotlight', `${defs()}${sky(glow('glowM', 400, 120, 300, 160) + glow('glowC', 160, 300, 220, 140))}
<path d="M0 440 L800 440 L800 600 L0 600Z" fill="url(#ground)"/>
<ellipse cx="420" cy="470" rx="300" ry="60" fill="#9273ff" opacity=".22" filter="url(#soft)"/>
<path d="M400 40 L280 460 L520 460Z" fill="#fff" opacity=".07" filter="url(#soft)"/>
<g fill="#fff" opacity=".35">${Array.from({length: 40}, () => `<circle cx="${f(330 + rand() * 140)}" cy="${f(120 + rand() * 300)}" r="${f(0.6 + rand() * 1.2)}"/>`).join('')}</g>
<g opacity=".2" transform="translate(0 800) scale(1 -1)"><path d="M210 300 C200 220 300 180 430 190 C560 200 620 250 610 330 C600 380 560 400 520 400 L300 400 C240 400 214 360 210 300Z" fill="url(#nebV)" filter="url(#soft)"/></g>
<g>
<path d="M210 300 C200 220 300 180 430 190 C560 200 620 250 610 330 C600 380 560 400 520 400 L300 400 C240 400 214 360 210 300Z" fill="url(#body)" stroke="url(#neb)" stroke-width="3"/>
<path d="M230 290 C230 230 320 200 430 208 C540 216 590 260 580 320 L240 330Z" fill="url(#gloss)"/>
<path d="M430 160 L430 230" stroke="#9fe6ff" stroke-width="3" opacity=".6"/><path d="M400 228 L470 222 L472 250 L402 256Z" fill="url(#dark)" stroke="#9fe6ff" stroke-width="1.5"/>
<path d="M300 190 L560 160 L600 220 L440 240Z" fill="url(#glass)" stroke="#9fe6ff" stroke-width="2"/>
<path d="M560 160 L600 220" stroke="#f06dff" stroke-width="3"/>
<path d="M240 335 L520 335 L520 372 L240 372Z" fill="#0b0a24"/>
<path d="M248 340 L512 340 L512 366 L248 366Z" fill="url(#light)"/>
<g stroke="#0b0a24" stroke-width="2">${Array.from({length: 18}, (_, i) => `<path d="M${262 + i * 14} 340 V366"/>`).join('')}</g>
<g fill="#0b0a24">${Array.from({length: 13}, (_, i) => `<rect x="${269 + i * 14 + ([2,5,9,12].includes(i % 7) ? 14 : 0)}" y="340" width="7" height="16"/>`).join('')}</g>
<path d="M240 400 L236 500 M520 400 L516 500 M600 320 L612 480" stroke="url(#nebV)" stroke-width="7" stroke-linecap="round"/>
<path d="M232 400 L232 450 L240 450" fill="none" stroke="#9fe6ff" stroke-width="2" opacity=".6"/>
<ellipse cx="420" cy="290" rx="120" ry="40" fill="#fff" opacity=".06"/>
</g>
<g fill="url(#neb)" opacity=".9"><path d="M650 140 q0 -26 20 -26 q-4 20 -20 26z"/><circle cx="650" cy="150" r="6"/><path d="M690 100 q0 -26 20 -26 q-4 20 -20 26z"/><circle cx="690" cy="110" r="6"/></g>`)),
  // 03 — a dream home with warm windows on a hill
  '03': () => (seed = 1347330399, wrap('A dream home with warm windows on a hill at night', `${defs()}${sky(glow('glowV', 620, 150, 320, 170) + glow('glowM', 150, 180, 260, 140))}
<circle cx="640" cy="120" r="46" fill="url(#light)"/><circle cx="640" cy="120" r="80" fill="url(#glowC)"/>
<path d="M0 470 Q200 400 400 440 T800 430 L800 600 L0 600Z" fill="url(#ground)"/>
<path d="M0 470 Q200 400 400 440 T800 430" stroke="url(#neb)" stroke-width="2" fill="none" opacity=".6"/>
<g>
<path d="M260 420 L260 300 L420 200 L580 300 L580 420Z" fill="url(#dark)" stroke="url(#neb)" stroke-width="3"/>
<path d="M232 306 L420 182 L608 306" fill="none" stroke="url(#nebV)" stroke-width="8" stroke-linecap="round"/>
<rect x="300" y="320" width="60" height="50" rx="4" fill="url(#gold)"/><rect x="480" y="320" width="60" height="50" rx="4" fill="url(#gold)"/>
<rect x="390" y="330" width="60" height="90" rx="6" fill="url(#gold)"/>
<path d="M330 320 V370 M300 345 H360 M510 320 V370 M480 345 H540" stroke="#2a1f5c" stroke-width="3"/>
<rect x="470" y="220" width="26" height="60" fill="url(#dark)" stroke="#9fe6ff" stroke-width="2"/>
<rect x="296" y="316" width="68" height="58" fill="#ffd27a" opacity=".35" filter="url(#softer)"/><rect x="476" y="316" width="68" height="58" fill="#ffd27a" opacity=".35" filter="url(#softer)"/>
</g>
<g>${[[120, 440, 1], [660, 430, 1.1], [60, 470, .7], [740, 460, .8]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="0" cy="0" rx="54" ry="10" fill="#000" opacity=".35"/><path d="M0 -140 L-52 0 L52 0Z" fill="url(#dark)"/><path d="M0 -140 L-40 -40 L40 -40Z" fill="#3b2f7a"/><path d="M0 -140 L-26 -80 L26 -80Z" fill="#5b4fd6" opacity=".9"/><path d="M0 -140 L-52 0 L52 0" fill="none" stroke="url(#neb)" stroke-width="2"/></g>`).join('')}</g>
<g fill="#ffd27a" opacity=".22"><path d="M300 372 L270 470 L390 470 L360 372Z" filter="url(#softer)"/><path d="M480 372 L450 470 L570 470 L540 372Z" filter="url(#softer)"/></g>
<g fill="#4a3f8a" stroke="#9fe6ff" stroke-width="1" opacity=".9">${[[420, 440], [412, 470], [428, 500], [416, 530], [430, 560]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="8"/>`).join('')}</g>
${haze(430, '#9fe6ff', .08)}
<g fill="#ffd27a" opacity=".8">${Array.from({length: 14}, () => `<circle cx="${f(100 + rand() * 600)}" cy="${f(300 + rand() * 260)}" r="${f(1.5 + rand() * 2)}"/>`).join('')}</g>`)),
  // 04 — a mountain summit with a flag at dawn
  '04': () => (seed = 2523923073, wrap('A mountain summit at dawn', `${defs()}${sky(glow('glowM', 600, 260, 360, 180) + glow('glowC', 180, 140, 260, 150))}
<circle cx="610" cy="250" r="90" fill="url(#sun)"/>
<path d="M-20 600 L80 380 L200 440 L320 300 L460 420 L620 330 L820 600Z" fill="#3b2f7a" opacity=".45"/>
<path d="M-20 600 L160 330 L260 420 L400 150 L520 340 L600 290 L820 600Z" fill="url(#dark)"/>
<path d="M400 150 L260 420 L520 340Z" fill="#000" opacity=".25"/>
<path d="M400 150 L350 240 L380 232 L412 262 L445 236 L470 260 L520 340" fill="#e8f4ff" opacity=".9"/>
<path d="M400 150 L350 240 L380 232 L412 262 L445 236 L470 260 L520 340 L400 150" fill="url(#light)" opacity=".8"/>
<path d="M-20 600 L160 330 L260 420 L400 150 L520 340 L600 290 L820 600" fill="none" stroke="url(#neb)" stroke-width="3"/>
<path d="M160 330 L130 380 L150 372 L176 400 L200 380" fill="#e8f4ff" opacity=".7"/>
<path d="M600 290 L580 322 L600 316 L624 340 L646 320" fill="#e8f4ff" opacity=".6"/>
<path d="M400 150 L400 90" stroke="#fff" stroke-width="3"/><path d="M400 90 L446 104 L400 118Z" fill="url(#neb)"/>
<circle cx="400" cy="88" r="12" fill="#fff" opacity=".6" filter="url(#softer)"/>
<g fill="#e8f4ff" opacity=".55" filter="url(#soft)"><ellipse cx="120" cy="500" rx="170" ry="34"/><ellipse cx="640" cy="520" rx="200" ry="38"/><ellipse cx="380" cy="560" rx="260" ry="40"/></g>
<path d="M0 520 Q200 480 400 500 T800 480 L800 600 L0 600Z" fill="#9273ff" opacity=".18" filter="url(#soft)"/>
<g transform="translate(372 150) scale(.18)"><path d="M0 -40 L4 30 M4 30 L-30 92 M4 30 L36 70 M0 -20 L-40 10 M0 -20 L40 -2" fill="none" stroke="#0b0a24" stroke-width="26" stroke-linecap="round"/><circle cx="2" cy="-66" r="22" fill="#0b0a24"/></g>`)),
  // 05 — a beach at sunset with palms and a far sail
  '05': () => (seed = 2725153329, wrap('A beach at sunset with palms and a sail far out', `${defs()}${sky(glow('glowM', 400, 200, 420, 200) + glow('glowV', 120, 100, 240, 130))}
<circle cx="400" cy="270" r="120" fill="url(#sun)"/>
<path d="M0 300 L800 300 L800 480 L0 480Z" fill="url(#water)"/>
<path d="M0 300 L800 300" stroke="#fff" stroke-width="1.5" opacity=".5"/>
<g stroke="#ffd3ae" opacity=".55">${Array.from({length: 9}, (_, i) => `<path d="M${330 + i * 7} ${320 + i * 16} h${140 - i * 10}" stroke-width="${2 + (i % 3)}"/>`).join('')}</g>
<path d="M0 460 Q220 420 440 470 T800 440 L800 600 L0 600Z" fill="url(#sand)"/>
<path d="M0 462 Q220 422 440 472 T800 442" stroke="#fff" stroke-width="2" opacity=".5" fill="none"/>
<path d="M560 296 L560 236 L612 296Z M556 296 L556 250 L520 296Z" fill="#fff" opacity=".85"/>
<g stroke="url(#nebV)" stroke-width="10" stroke-linecap="round" fill="none"><path d="M120 470 C140 400 150 340 200 300"/><path d="M700 480 C690 410 680 360 640 320"/></g>
<g fill="url(#dark)" stroke="url(#neb)" stroke-width="2"><path d="M200 300 C240 250 300 250 330 280 C280 272 240 290 200 300Z"/><path d="M200 300 C170 240 190 190 240 180 C210 220 205 260 200 300Z"/><path d="M200 300 C150 270 110 280 90 320 C130 300 170 300 200 300Z"/><path d="M640 320 C660 270 720 270 750 300 C700 292 670 310 640 320Z"/><path d="M640 320 C610 270 630 220 680 210 C650 250 645 280 640 320Z"/><path d="M640 320 C600 290 560 300 540 340 C580 320 610 320 640 320Z"/></g>`)),
  // 06 — a marathon finish: tape, arch, confetti
  '06': () => (seed = 3836057057, wrap('A marathon finish line under an arch, confetti in the air', `${defs()}${sky(glow('glowV', 400, 120, 400, 180) + glow('glowC', 400, 380, 300, 120))}
<path d="M0 440 L800 440 L800 600 L0 600Z" fill="url(#ground)"/>
<g stroke="#fff" stroke-width="2" opacity=".35">${Array.from({length: 6}, (_, i) => `<path d="M${80 + i * 130} 440 L${40 + i * 160} 600"/>`).join('')}</g>
<path d="M150 440 L150 160 Q400 60 650 160 L650 440" fill="none" stroke="url(#nebV)" stroke-width="18" stroke-linecap="round"/>
<path d="M150 440 L150 160 Q400 60 650 160 L650 440" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>
<rect x="300" y="110" width="200" height="54" rx="12" fill="url(#dark)" stroke="url(#neb)" stroke-width="3"/>
<g fill="#fff">${Array.from({length: 10}, (_, i) => `<rect x="${310 + i * 19}" y="${120 + (i % 2) * 17}" width="17" height="17"/>`).join('')}</g>
<path d="M150 400 Q400 430 650 400" stroke="url(#neb)" stroke-width="8" stroke-linecap="round" fill="none"/>
<path d="M150 400 Q400 430 650 400" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>
<g>${Array.from({length: 60}, (_, i) => { const x = f(100 + rand() * 600), y = f(40 + rand() * 360), c = ['#23eaff', '#9273ff', '#f06dff', '#ffd27a'][i % 4]; return `<rect x="${x}" y="${y}" width="10" height="6" fill="${c}" transform="rotate(${f(rand() * 360)} ${x} ${y})" opacity=".9"/>`; }).join('')}</g>
<g fill="#1a1240" opacity=".9">${Array.from({length: 30}, (_, i) => `<ellipse cx="${20 + i * 27}" cy="${430 + (i % 3) * 6}" rx="16" ry="${34 + (i % 4) * 6}"/>`).join('')}</g>
<g fill="url(#neb)" opacity=".8">${Array.from({length: 12}, (_, i) => `<rect x="${40 + i * 64}" y="${360 + (i % 2) * 10}" width="4" height="40"/><rect x="${44 + i * 64}" y="${360 + (i % 2) * 10}" width="26" height="18" rx="3"/>`).join('')}</g>
${runner(400, 320, 1.15)}
<ellipse cx="400" cy="450" rx="140" ry="18" fill="#23eaff" opacity=".2" filter="url(#soft)"/>`)),
  // 07 — a reading room in one-point perspective: tall shelves, rolling ladder, arched night window, armchair, warm lamp
  '07': () => {
    seed = 707;
    const pal = ['#2f6d8f', '#4a3fa8', '#7a3a8f', '#a3456f', '#b8863f', '#2a4f7a', '#5b2d5f', '#3a7a74', '#8a5a9f', '#c9a86a', '#6b2f3f', '#3b3f86'];
    const books = {}, add = (d, c = pal[Math.floor(rand() * pal.length)]) => { books[c] = (books[c] || '') + d; };
    let bands = '';
    const flush = () => { const out = Object.entries(books).map(([c, d]) => `<path d="${d}" fill="${c}"/>`).join('') + (bands ? `<path d="${bands}" fill="#ffd27a" opacity=".55"/>` : ''); for (const k in books) delete books[k]; bands = ''; return out; };
    // book spines are many and small: whole-pixel corners, and only the ones that reach the canvas
    const Pi = (X, Y, Z) => `${Math.round(400 + 400 * X / Z)} ${Math.round(300 + 400 * Y / Z)}`, onCanvas = (Y, Z) => 300 + 400 * Y / Z > -2;
    const ROWS = [0.5, 0.265, 0.03, -0.205, -0.44, -0.675, -0.91], UP = [0.86, 1.14, 1.42, 1.71, 2.0];
    // a side-wall bookcase: back at X = s, front at .86 s, books on every board, uprights facing the viewer
    const side = s => {
      const Xf = .86 * s, Xb = .875 * s, surf = [], edge = [], ups = [];
      for (const Y of ROWS) { surf.push(quad(P(s, Y, .8), P(s, Y, 2), P(Xf, Y, 2), P(Xf, Y, .8))); edge.push(quad(P(Xf, Y, .8), P(Xf, Y, 2), P(Xf, Y + .025, 2), P(Xf, Y + .025, .8))); }
      for (const Z of UP) ups.push(quad(P(s, -1.2, Z), P(Xf, -1.2, Z), P(Xf, .6, Z), P(s, .6, Z)) + quad(P(Xf, -1.2, Z), P(Xf, -1.2, Z + .03), P(Xf, .6, Z + .03), P(Xf, .6, Z)));
      for (let j = 0; j < UP.length - 1; j++) ROWS.forEach((Yb, i) => {
        const room = Yb - (i < ROWS.length - 1 ? ROWS[i + 1] + .025 : -1.2), end = UP[j + 1] - .004;
        for (let z = UP[j] + .032 + rand() * .01; z < end - .014;) {
          const r = rand();
          if (r < .05) { z += .02 + rand() * .03; continue; }
          if (r < .13 && end - z > .1) {
            let y = Yb; const dz = .075 + rand() * .02;
            for (let k = 2 + Math.floor(rand() * 3); k > 0; k--) { const th = .022 + rand() * .01; if (onCanvas(y, z)) add(quad(Pi(Xb, y, z), Pi(Xb, y - th, z), Pi(Xb, y - th, z + dz), Pi(Xb, y, z + dz))); y -= th; }
            z += dz + .008; continue;
          }
          const t = .015 + rand() * .02, h = room * (.6 + rand() * .36), lean = r > .95 && end - z > t + .06 ? .045 : 0;
          const vis = onCanvas(Yb, z), band = rand() < .3;
          if (vis) add(quad(Pi(Xb, Yb, z), Pi(Xb, Yb - h, z + lean), Pi(Xb, Yb - h, z + t + lean), Pi(Xb, Yb, z + t)));
          if (vis && band && !lean && onCanvas(Yb - h * .8, z)) bands += quad(Pi(Xb, Yb - h * .86, z), Pi(Xb, Yb - h * .8, z), Pi(Xb, Yb - h * .8, z + t), Pi(Xb, Yb - h * .86, z + t));
          z += t + lean + .0015;
        }
      });
      return `<path d="${quad(P(s, -1.3, .6), P(s, -1.3, 2), P(s, .6, 2), P(s, .6, .6))}" fill="#0a0820"/><path d="${surf.join('')}" fill="#3a2440"/><path d="${ups.join('')}" fill="url(#lWood)"/>${flush()}<path d="${edge.join('')}" fill="#6a4630"/><path d="${quad(P(Xf, .5, .8), P(Xf, .5, 2), P(Xf, .6, 2), P(Xf, .6, .8))}" fill="#24152a"/>`;
    };
    const leftHtml = side(-1), rightHtml = side(1);
    // back-wall cases either side of the window, books face-on
    let back = '';
    for (const x0 of [204, 504]) {
      back += `<rect x="${x0}" y="74" width="92" height="346" fill="#0a0820" stroke="#4a3040" stroke-width="4"/>`;
      const ys = [74, 128, 182, 236, 290, 344, 404];
      for (let i = 1; i < ys.length; i++) {
        back += `<rect x="${x0}" y="${ys[i]}" width="92" height="4" fill="#6a4630"/>`;
        for (let bx = x0 + 4; bx < x0 + 84;) { const w = 3 + rand() * 4.5, h = (ys[i] - ys[i - 1] - 8) * (.55 + rand() * .42); if (rand() < .06) { bx += 6; continue; } add(`M${Math.round(bx)} ${ys[i]}v${-Math.round(h)}h${Math.round(w)}v${Math.round(h)}Z`); bx += w + .5; }
      }
    }
    const backBooks = flush();
    const winStars = Array.from({length: 46}, () => `<circle cx="${f(324 + rand() * 152)}" cy="${f(92 + rand() * 230)}" r="${f(.5 + rand())}" fill="#fff" opacity="${f(.35 + rand() * .6)}"/>`).join('');
    const ladder = (() => { const a1 = [-.84, -1.05, 1.22], a2 = [-.52, .6, 1.22], b1 = [-.84, -1.05, 1.4], b2 = [-.52, .6, 1.4], at = (p, q, t) => P(...p.map((v, i) => v + (q[i] - v) * t)); let rungs = ''; for (let k = 1; k < 12; k++) rungs += `M${at(a1, a2, k / 12)}L${at(b1, b2, k / 12)}`; return `<path d="M${P(-.84, -1.05, .8)}L${P(-.84, -1.05, 2)}" stroke="#ffd27a" stroke-width="2.5" opacity=".75"/><path d="${rungs}" stroke="#7a5236" stroke-width="4"/><path d="M${P(...a1)}L${P(...a2)}" stroke="#5a3a2a" stroke-width="7"/><path d="M${P(...b1)}L${P(...b2)}" stroke="#5a3a2a" stroke-width="6"/><path d="M${P(...a1)}L${P(...a2)}M${P(...b1)}L${P(...b2)}" stroke="#ffd27a" stroke-width="1.2" opacity=".5" transform="translate(2 0)"/><circle cx="${P(...a2).split(' ')[0]}" cy="${P(...a2).split(' ')[1]}" r="4.5" fill="#1a1020" stroke="#ffd27a" stroke-width="1"/><circle cx="${P(...b2).split(' ')[0]}" cy="${P(...b2).split(' ')[1]}" r="4" fill="#1a1020" stroke="#ffd27a" stroke-width="1"/>`; })();
    const boards = Array.from({length: 15}, (_, i) => { const x0 = -900 + i * 180; return `M${x0} 600L${f(x0 + (400 - x0) * .6)} 420`; }).join('');
    const rug = (k) => quad(P(-.55 + k, .6, 1.1 + k), P(.55 - k, .6, 1.1 + k), P(.55 - k, .6, 1.75 - k), P(-.55 + k, .6, 1.75 - k));
    const motes = Array.from({length: 20}, () => `<circle cx="${f(600 + rand() * 200)}" cy="${f(220 + rand() * 260)}" r="${f(.6 + rand() * .9)}" opacity="${f(.3 + rand() * .5)}"/>`).join('');
    const buttons = [[532, 352], [560, 346], [588, 352], [546, 372], [574, 372], [532, 394], [560, 390], [588, 394], [546, 414], [574, 414]];
    return wrap('A home library with tall shelves and a reading lamp', `${defs(`
<linearGradient id="lWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120e34"/><stop offset="1" stop-color="#1e1546"/></linearGradient>
<linearGradient id="lFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24163a"/><stop offset="1" stop-color="#0c0818"/></linearGradient>
<linearGradient id="lWood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2236"/><stop offset="1" stop-color="#1c1026"/></linearGradient>
<linearGradient id="lVel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4fd0"/><stop offset=".5" stop-color="#2f2890"/><stop offset="1" stop-color="#150f44"/></linearGradient>
<linearGradient id="lVelIn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4438b0"/><stop offset=".6" stop-color="#3a32a0"/><stop offset="1" stop-color="#7a5fc0"/></linearGradient>
<linearGradient id="lPil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".55" stop-color="#e0a060"/><stop offset="1" stop-color="#b0507a"/></linearGradient>
<linearGradient id="lShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9b8"/><stop offset="1" stop-color="#ffc062"/></linearGradient>
<linearGradient id="lCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></linearGradient>
<linearGradient id="lCurt" x1="0" y1="0" x2="1" y2="0" spreadMethod="reflect"><stop offset="0" stop-color="#2a1858"/><stop offset=".5" stop-color="#5a3a9a"/><stop offset="1" stop-color="#2a1858"/></linearGradient>
<radialGradient id="lWarm" gradientUnits="userSpaceOnUse" cx="724" cy="330" r="420"><stop offset="0" stop-color="#ffd27a" stop-opacity=".5"/><stop offset=".35" stop-color="#ffb070" stop-opacity=".16"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></radialGradient>
<radialGradient id="lVig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#05040f" stop-opacity="0"/><stop offset="1" stop-color="#05040f" stop-opacity=".75"/></radialGradient>
<clipPath id="lWin"><path d="M322 384V170A78 78 0 0 1 478 170V384Z"/></clipPath>
<clipPath id="lFl"><path d="M0 579L228 420H572L800 579V600H0Z"/></clipPath>
`)}
<rect width="800" height="600" fill="#08071a"/>
<path d="M139 0H661L600 70H200Z" fill="#0c0a24"/><path d="M139 0L200 70H600L661 0" fill="none" stroke="#4a3040" stroke-width="3"/>
<rect x="200" y="70" width="400" height="350" fill="url(#lWall)"/>
<ellipse cx="400" cy="240" rx="170" ry="190" fill="#9273ff" opacity=".22" filter="url(#soft)"/>
<g clip-path="url(#lWin)"><rect x="322" y="92" width="156" height="292" fill="url(#sky)"/>${glow('glowM', 360, 180, 110, 60, -20)}${glow('glowC', 450, 260, 90, 50, 15)}${glow('glowV', 400, 130, 120, 70)}${winStars}
<path d="M424 128A20 20 0 1 0 446 154A16 16 0 1 1 424 128Z" fill="#fff4dc"/><circle cx="432" cy="142" r="30" fill="#fff4dc" opacity=".18" filter="url(#softer)"/>
<path d="M322 350C350 336 372 344 400 334C428 326 450 338 478 330V384H322Z" fill="#1a1244"/><path d="M322 366C352 356 380 362 410 354C440 348 460 356 478 352V384H322Z" fill="#0c0a26"/><g fill="#ffd27a"><circle cx="352" cy="364" r="1.4"/><circle cx="430" cy="358" r="1.2"/><circle cx="458" cy="362" r="1.4"/></g>
<path d="M330 100L370 100L330 220Z" fill="#fff" opacity=".06"/><path d="M380 384L440 200L470 200L410 384Z" fill="#fff" opacity=".04"/></g>
<path d="M322 384V170A78 78 0 0 1 478 170V384Z" fill="none" stroke="#4a3040" stroke-width="8"/>
<path d="M400 92V384M322 250H478M322 170H478M400 170L345 115M400 170L455 115" stroke="#4a3040" stroke-width="3"/>
<path d="M310 384H490L498 394H302Z" fill="#6a4630"/><rect x="302" y="394" width="196" height="26" fill="#1c1230"/><path d="M312 400H488V414H312Z" fill="none" stroke="#3a2440" stroke-width="1.5"/>
${back}${backBooks}
<path d="M280 90H520" stroke="#ffd27a" stroke-width="3" stroke-linecap="round"/><circle cx="278" cy="90" r="4" fill="#ffd27a"/><circle cx="522" cy="90" r="4" fill="#ffd27a"/>
${[1, -1].map(m => `<path d="M${400 - m * 112} 92H${400 - m * 58}C${400 - m * 62} 160 ${400 - m * 72} 220 ${400 - m * 80} 262C${400 - m * 72} 300 ${400 - m * 62} 360 ${400 - m * 58} 420H${400 - m * 116}C${400 - m * 112} 360 ${400 - m * 106} 300 ${400 - m * 100} 262C${400 - m * 106} 220 ${400 - m * 110} 160 ${400 - m * 112} 92Z" fill="url(#lCurt)"/><path d="M${400 - m * 94} 92C${400 - m * 92} 180 ${400 - m * 90} 230 ${400 - m * 90} 262C${400 - m * 88} 320 ${400 - m * 86} 380 ${400 - m * 86} 420" fill="none" stroke="#1a0e3a" stroke-width="2" opacity=".6"/><ellipse cx="${400 - m * 92}" cy="262" rx="12" ry="4" fill="#ffd27a" opacity=".8"/>`).join('')}
<path d="M0 579L228 420H572L800 579V600H0Z" fill="url(#lFloor)"/>
<g clip-path="url(#lFl)"><path d="${boards}" stroke="#05040f" stroke-width="1.5" opacity=".55"/><path d="M322 420H478L560 600H240Z" fill="#7bddff" opacity=".07" filter="url(#softer)"/></g>
<path d="${rug(0)}" fill="#3a1a4a"/><path d="${rug(.04)}" fill="#7a3a6f"/><path d="${rug(.07)}" fill="#2a1a52"/><path d="${rug(.1)}" fill="none" stroke="#c99a5a" stroke-width="1.5" opacity=".7"/>
<ellipse cx="400" cy="472" rx="74" ry="14" fill="#7a3a8f"/><ellipse cx="400" cy="472" rx="58" ry="10" fill="none" stroke="#ffd27a" stroke-width="1.5" opacity=".7"/><ellipse cx="400" cy="472" rx="30" ry="5.5" fill="#c9a86a" opacity=".6"/>
<path d="M${P(-.55, .6, 1.1)}L${P(.55, .6, 1.1)}" stroke="#c99a5a" stroke-width="3" stroke-dasharray="1.5 2.5" transform="translate(0 3)" opacity=".7"/>
${leftHtml}${rightHtml}
${ladder}
<path d="M90 560h60v-8h-60Z" fill="#a3456f"/><path d="M96 552h52v-7h-52Z" fill="#2f6d8f"/><path d="M92 545h50v-9h-50Z" fill="#b8863f"/><path d="M94 555h54M98 548h48" stroke="#ffd27a" stroke-width=".8" opacity=".5"/>
<rect width="800" height="600" fill="url(#lWarm)"/>
<path d="M700 342H748L812 530H636Z" fill="url(#lCone)" filter="url(#softer)"/><path d="M710 300H738L776 150H672Z" fill="url(#lCone)" opacity=".35" filter="url(#soft)" transform="rotate(180 724 225)"/>
<ellipse cx="690" cy="512" rx="170" ry="32" fill="#ffd27a" opacity=".3" filter="url(#soft)"/>
<ellipse cx="566" cy="506" rx="104" ry="10" fill="#000" opacity=".55" filter="url(#softer)"/>
<path d="M488 490H496L494 509H490ZM624 490H632L630 509H626Z" fill="#6a4630"/>
<path d="M496 470V420C488 404 482 380 484 360C486 338 500 322 524 317C546 313 574 313 596 317C620 322 634 338 636 360C638 380 632 404 624 420V470Z" fill="url(#lVel)"/>
<path d="M508 446V368C508 346 520 334 540 331C553 329 567 329 580 331C600 334 612 346 612 368V446Z" fill="url(#lVelIn)"/>
<path d="M532 352L546 372L532 394L546 414M560 346L546 372L560 390L546 414M560 346L574 372L560 390L574 414M588 352L574 372L588 394L574 414" fill="none" stroke="#1a1450" stroke-width="1" opacity=".45"/>
<g fill="#16113f">${buttons.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>
<path d="M466 470H654V490C654 494 650 497 646 497H474C470 497 466 494 466 490Z" fill="#1c1652"/><path d="M466 476H654" stroke="#5a4fd0" stroke-width="1" opacity=".6"/>
<path d="M518 446L522 430H598L602 446Z" fill="#6a5fe0"/><path d="M516 446H604V466C604 470 600 472 596 472H524C520 472 516 470 516 466Z" fill="url(#lVel)"/><path d="M516 446H604" stroke="#a99bff" stroke-width="1.5" opacity=".7"/>
<ellipse cx="562" cy="436" rx="36" ry="5" fill="#0e0a30" opacity=".5"/><g transform="rotate(-8 560 408)"><rect x="530" y="382" width="60" height="52" rx="14" fill="url(#lPil)"/><rect x="537" y="389" width="46" height="38" rx="9" fill="none" stroke="#7a3a5f" stroke-width="1" opacity=".5"/><path d="M536 390C548 384 566 384 580 388" stroke="#fff" stroke-width="2" opacity=".5" fill="none"/></g>
<path d="M470 414C468 404 466 400 460 396V484L466 497H470Z" fill="#120d38"/>
${[470, 600].map(x => `<path d="M${x} 492V420C${x} 404 ${x + 10} 396 ${x + 25} 396C${x + 40} 396 ${x + 50} 404 ${x + 50} 420V492Z" fill="url(#lVel)"/><ellipse cx="${x + 25}" cy="412" rx="17" ry="13" fill="none" stroke="#7a6ff0" stroke-width="1.5" opacity=".7"/><ellipse cx="${x + 25}" cy="413" rx="7" ry="5" fill="#16113f" opacity=".5"/><path d="M${x + 4} 404C${x + 10} 396 ${x + 20} 393 ${x + 30} 394" fill="none" stroke="#b9adff" stroke-width="1.5" opacity=".6"/>`).join('')}
<path d="M474 394L490 387L494 396L478 401ZM494 396L490 387L508 389L510 397Z" fill="#efe2c4"/><path d="M494 396L490 387" stroke="#b8a070" stroke-width="1"/>
<path d="M650 492V420C650 404 640 396 625 396M604 446V466M598 430L602 446" fill="none" stroke="#ffd27a" stroke-width="2" opacity=".75"/><ellipse cx="636" cy="420" rx="44" ry="86" fill="#ffd27a" opacity=".16" filter="url(#soft)"/><path d="M516 430V470M604 430V470" stroke="#0e0a30" stroke-width="3" opacity=".6"/>
<path d="M666 404V411A46 9 0 0 0 758 411V404Z" fill="#3a2230"/><ellipse cx="712" cy="404" rx="46" ry="9" fill="#6a4630"/><ellipse cx="712" cy="403" rx="46" ry="9" fill="none" stroke="#ffd27a" stroke-width="1" opacity=".6"/>
<path d="M707 413H717L720 486H704Z" fill="#3a2230"/><path d="M714 413L716 486" stroke="#ffd27a" stroke-width="1.5" opacity=".6"/><ellipse cx="712" cy="490" rx="28" ry="6" fill="#3a2230"/>
<path d="M676 404h34v-6h-34Z" fill="#7a3a8f"/><path d="M680 398h28v-5h-28Z" fill="#2f6d8f"/>
<path d="M716 404C711 394 714 383 724 379C734 383 737 394 732 404Z" fill="url(#gold)"/><path d="M723 380V342" stroke="#d9a858" stroke-width="3"/>
<circle cx="724" cy="322" r="70" fill="#ffd27a" opacity=".35" filter="url(#soft)"/>
<path d="M700 342H748L738 300H710Z" fill="url(#lShade)"/><ellipse cx="724" cy="342" rx="24" ry="4" fill="#fff8e0"/><ellipse cx="724" cy="300" rx="14" ry="2.5" fill="#fff8e0"/>
<g fill="#ffe6a8">${motes}</g>
<rect width="800" height="600" fill="url(#lVig)"/>`);
  },
  // 08 — a runner on a ridge path at sunrise: layered ranges, valley mist, sun rays, rim-lit silhouette
  '08': () => {
    seed = 808;
    const sx = 612, sy = 420;
    const rays = Array.from({length: 11}, (_, i) => { const a = (-172 + i * 16.4) * Math.PI / 180, b = a + .035 + (i % 3) * .012, R = 900; return `M${sx} ${sy}L${f(sx + R * Math.cos(a))} ${f(sy + R * Math.sin(a))}L${f(sx + R * Math.cos(b))} ${f(sy + R * Math.sin(b))}Z`; }).join('');
    let grass = '';
    for (let x = -4; x < 804; x += 3 + rand() * 5) { const y = x < 250 ? 500 - (x / 250) * 48 + (x / 250) ** 2 * 0 : x < 450 ? 452 + ((x - 300) / 150) ** 2 * 6 : 458 + (x - 450) * .17, h = 4 + rand() * 9, l = (rand() - .5) * 6; grass += `M${f(x - 1.2)} ${f(y + 2)}L${f(x + l)} ${f(y - h)}L${f(x + 1.2)} ${f(y + 2)}Z`; }
    const pine = (x, y, k) => `M${x} ${f(y - 34 * k)}L${f(x - 7 * k)} ${f(y - 16 * k)}H${f(x - 3 * k)}L${f(x - 11 * k)} ${y}H${f(x + 11 * k)}L${f(x + 3 * k)} ${f(y - 16 * k)}H${f(x + 7 * k)}Z`;
    const flowers = Array.from({length: 34}, () => { const x = rand() * 800, y = 480 + (x > 400 ? (x - 400) * .09 : (400 - x) * .1) + rand() * 70; return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.8 + rand() * 1.3)}" fill="${rand() < .6 ? '#ffd27a' : '#f06dff'}" opacity="${f(.35 + rand() * .5)}"/>`; }).join('');
    let knoll = '';
    for (let x = 500; x < 806; x += 3 + rand() * 4) { const y = 600 - 44 * Math.sin(Math.min(1, (x - 500) / 160) * Math.PI / 2) + (x > 660 ? (x - 660) * .02 : 0), h = 6 + rand() * 12, l = (rand() - .3) * 7; knoll += `M${f(x - 1.4)} ${f(y + 3)}L${f(x + l)} ${f(y - h)}L${f(x + 1.4)} ${f(y + 3)}Z`; }
    const birds = [[440, 238, 1.4], [474, 222, 1.1], [500, 252, 1.25], [532, 232, .9], [418, 266, .8]].map(([x, y, k]) => `M${x} ${y}q${f(6 * k)} ${f(-6 * k)} ${f(12 * k)} 0q${f(6 * k)} ${f(-6 * k)} ${f(12 * k)} 0`).join('');
    return wrap('A sunrise run along a ridge path', `${defs(`
<linearGradient id="rSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05040f"/><stop offset=".26" stop-color="#100d36"/><stop offset=".44" stop-color="#2e1d66"/><stop offset=".56" stop-color="#6c3290"/><stop offset=".64" stop-color="#c8579e"/><stop offset=".7" stop-color="#ff9a7e"/><stop offset=".76" stop-color="#ffd690"/><stop offset="1" stop-color="#ffe9c0"/></linearGradient>
<radialGradient id="rRay" gradientUnits="userSpaceOnUse" cx="${sx}" cy="${sy}" r="520"><stop offset="0" stop-color="#ffe6b0" stop-opacity=".55"/><stop offset=".5" stop-color="#ffb08a" stop-opacity=".14"/><stop offset="1" stop-color="#ff86c8" stop-opacity="0"/></radialGradient>
<radialGradient id="rGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7e0" stop-opacity=".9"/><stop offset=".25" stop-color="#ffd27a" stop-opacity=".55"/><stop offset=".6" stop-color="#ff7fae" stop-opacity=".18"/><stop offset="1" stop-color="#ff7fae" stop-opacity="0"/></radialGradient>
<linearGradient id="rFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c77aa6"/><stop offset="1" stop-color="#6a4790"/></linearGradient>
<linearGradient id="rMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a8a"/><stop offset="1" stop-color="#2a1d5c"/></linearGradient>
<linearGradient id="rNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1440"/><stop offset="1" stop-color="#07061a"/></linearGradient>
<linearGradient id="rRim" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="800" y2="0"><stop offset="0" stop-color="#ffd27a" stop-opacity=".15"/><stop offset=".75" stop-color="#ffd27a" stop-opacity=".95"/><stop offset="1" stop-color="#ffd27a" stop-opacity=".5"/></linearGradient>
<linearGradient id="rWarm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff9a7e" stop-opacity="0"/><stop offset=".6" stop-color="#ff9a7e" stop-opacity=".08"/><stop offset="1" stop-color="#ffb07a" stop-opacity=".22"/></linearGradient>
<linearGradient id="rTrail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0a088"/><stop offset="1" stop-color="#5a3a6a"/></linearGradient>
`)}
<rect width="800" height="600" fill="url(#rSky)"/>${glow('glowV', 200, 120, 300, 130)}${glow('glowC', 120, 60, 200, 90)}<g>${stars(70, 230)}</g>
<path d="${rays}" fill="url(#rRay)" filter="url(#softer)"/>
<g filter="url(#softer)"><path d="M120 300C220 290 330 296 420 304C330 308 220 308 120 300Z" fill="#ffb3a0" opacity=".35"/><path d="M470 330C560 318 680 322 760 332C680 338 560 338 470 330Z" fill="#ffd3a0" opacity=".45"/><path d="M40 352C140 344 240 346 300 352C220 356 120 358 40 352Z" fill="#ff9ab8" opacity=".3"/></g>
<circle cx="${sx}" cy="${sy}" r="150" fill="url(#rGlow)"/><circle cx="${sx}" cy="${sy}" r="30" fill="#fff6e0"/><circle cx="${sx}" cy="${sy}" r="44" fill="#fff1c8" opacity=".4" filter="url(#softer)"/>
<path d="M-10 404C30 396 60 392 90 398C120 386 150 380 180 390C220 384 250 380 290 392C330 386 360 378 400 388C440 380 470 378 510 392C550 404 590 424 640 424C670 412 700 396 740 402C770 398 790 394 810 396V600H-10Z" fill="#b277aa" opacity=".5"/>
<path d="M-10 430C30 418 60 410 100 418C130 404 160 398 190 408C230 400 270 406 300 416C340 404 370 402 410 410C450 400 480 398 520 410C560 422 600 434 650 432C690 418 720 408 760 414C790 410 800 408 810 408V600H-10Z" fill="url(#rFar)"/>
<path d="M410 410C450 400 480 398 520 410C560 422 600 434 650 432C690 418 720 408 760 414" fill="none" stroke="#ffe0a8" stroke-width="1.6" opacity=".75"/>
<g fill="#fff0f4" filter="url(#soft)"><ellipse cx="160" cy="436" rx="220" ry="16" opacity=".55"/><ellipse cx="620" cy="440" rx="260" ry="18" opacity=".6"/></g>
<path d="M-10 448C50 436 90 432 140 440C190 428 230 426 280 436C330 428 380 424 430 432C480 424 530 420 580 430C630 436 680 426 730 432C770 436 790 432 810 434V600H-10Z" fill="#7a4f9a" opacity=".85"/><path d="M430 432C480 424 530 420 580 430C630 436 680 426 730 432" fill="none" stroke="#ffd0a0" stroke-width="1.2" opacity=".55"/>
<g fill="#fff0f4" filter="url(#soft)"><ellipse cx="420" cy="452" rx="260" ry="12" opacity=".4"/></g>
<path d="M-10 466C60 452 120 446 170 456C230 440 262 434 300 446C360 436 420 430 470 440C540 428 600 432 660 442C720 448 770 440 810 444V600H-10Z" fill="url(#rMid)"/>
<path d="M470 440C540 428 600 432 660 442C720 448 770 440 810 444" fill="none" stroke="#ffcf9a" stroke-width="1.5" opacity=".6"/>
<g fill="#1e1546">${[[480, 446, .7], [500, 444, .55], [520, 440, .8], [700, 452, .7], [722, 450, .9], [744, 448, .6], [610, 440, .6]].map(([x, y, k]) => pine(x, y, k)).join('')}</g>
<g fill="#ffe4ea" filter="url(#soft)"><ellipse cx="640" cy="478" rx="220" ry="16" opacity=".55"/><ellipse cx="80" cy="490" rx="160" ry="12" opacity=".35"/></g>
<path d="M-10 504C80 488 170 466 250 456C320 448 390 450 450 459C540 472 640 494 810 516V600H-10Z" fill="url(#rNear)"/>
<path d="M-10 504C80 488 170 466 250 456C320 448 390 450 450 459C540 472 640 494 810 516V600H-10Z" fill="url(#rWarm)"/><path d="M-10 504C80 488 170 466 250 456C320 448 390 450 450 459C540 472 640 494 810 516" fill="none" stroke="url(#rRim)" stroke-width="2"/>
<path d="M120 600C190 560 250 510 300 470C330 456 380 456 450 463C540 474 640 496 810 520L810 523C640 500 540 479 450 467C390 462 340 462 316 472C280 504 250 560 236 600Z" fill="url(#rTrail)" opacity=".75"/>
<path d="M316 472C340 462 390 462 450 467C540 479 640 500 810 523" fill="none" stroke="#ffd9a8" stroke-width="1" opacity=".7"/>
<path d="${grass}" fill="#0c0a22"/>${flowers}
<g fill="#100c2a">${[[190, 540, 16, 7], [214, 548, 8, 4], [404, 480, 10, 4], [520, 492, 12, 5]].map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/><path d="M${x - rx * .7} ${y - ry * .6}Q${x} ${y - ry * 1.3} ${x + rx * .8} ${y - ry * .5}" fill="none" stroke="#ffcf9a" stroke-width="1" opacity=".6"/>`).join('')}</g>
<path d="M500 600C560 576 620 560 700 556C750 554 790 558 810 560V600Z" fill="#06051a"/><path d="${knoll}" fill="#06051a"/>
<ellipse cx="290" cy="468" rx="74" ry="3.5" fill="#07061a" opacity=".6"/>
${runner(350, 363, .88, '#0d0a24', '#ffd9a0')}
<path d="${birds}" fill="none" stroke="#1e1440" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M0 600V560C200 540 600 540 800 560V600Z" fill="#f06dff" opacity=".1" filter="url(#soft)"/>
<circle cx="520" cy="380" r="10" fill="#fff" opacity=".08"/><circle cx="470" cy="352" r="18" fill="#ffd27a" opacity=".06"/>`);
  },
};
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'showcase', 'vision');
// Each scene seeds its own random stream, so `node apps/web/art-src/vision.mjs 01 07` rewrites only those files, byte-stable.
const pick = process.argv.slice(2).map(a => a.replace(/^vision-|\.svg$/g, '').padStart(2, '0'));
for (const n of pick.length ? pick : Object.keys(scenes)) {
  if (!scenes[n]) throw new Error(`no scene ${n}; have ${Object.keys(scenes).join(' ')}`);
  const svg = scenes[n]();
  writeFileSync(join(dir, `vision-${n}.svg`), svg); console.log(`vision-${n}.svg ${svg.length} bytes`);
}

// Session AB-Design (owner request 16): the Showcase vision board's eight illustrations, one nebula style, generated from
// shared sky/star/glow helpers so they read as one set. Run: node apps/web/art-src/vision.mjs → public/showcase/vision/vision-01…08.svg.
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
const runner = (x, y, s = 1, stroke = 'url(#nebV)') => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="118" rx="44" ry="9" fill="#000" opacity=".45"/><path d="M0 -40 L4 30 M4 30 L-30 92 L-46 110 M4 30 L36 70 L26 112 M0 -20 L-40 10 L-52 -6 M0 -20 L40 -2 L54 -28" fill="none" stroke="${stroke}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 -40 L4 30" stroke="${stroke}" stroke-width="30" stroke-linecap="round"/><circle cx="2" cy="-66" r="21" fill="url(#light)"/></g>`;
const wrap = (title, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">${body}</svg>\n`;

const scenes = {
  // 01 — an electric sports car, no badges, on a lit road under the nebula
  '01': wrap('An electric sports car on a night road', `${defs()}${sky(glow('glowV', 560, 170, 360, 180) + glow('glowM', 200, 240, 300, 150))}
<path d="M0 420 L800 380 L800 600 L0 600Z" fill="url(#ground)"/>
<path d="M0 470 Q400 430 800 455" stroke="url(#neb)" stroke-width="3" fill="none" opacity=".7"/>
<path d="M60 520 Q400 500 740 515" stroke="#23eaff" stroke-width="1.5" fill="none" opacity=".35" stroke-dasharray="40 26"/>
${haze(380, '#9273ff', .14)}
<g stroke="#9fe6ff" opacity=".18">${Array.from({length: 7}, (_, i) => `<path d="M${400 + (i - 3) * 60} 380 L${400 + (i - 3) * 260} 600"/>`).join('')}</g>
<ellipse cx="400" cy="462" rx="330" ry="26" fill="#000" opacity=".55" filter="url(#soft)"/>
<g opacity=".28" transform="translate(0 900) scale(1 -1)"><path d="M150 428 C170 392 230 356 330 352 L470 348 C540 348 600 372 640 410 L672 418 C690 422 694 438 684 444 L120 450 C112 444 118 432 150 428Z" fill="url(#nebV)" filter="url(#soft)"/></g>
<g>
<path d="M150 428 C170 392 230 356 330 352 L470 348 C540 348 600 372 640 410 L672 418 C690 422 694 438 684 444 L120 450 C112 444 118 432 150 428Z" fill="url(#dark)"/>
<path d="M160 426 C190 398 250 372 330 366 L470 362 C540 362 590 382 626 412 L160 426Z" fill="url(#body)" opacity=".9"/>
<path d="M330 352 L470 348 C520 348 560 358 596 380 L336 384Z" fill="#fff" opacity=".07"/>
<path d="M190 394 C250 360 330 356 470 350 C540 352 592 374 626 406 L190 406Z" fill="url(#glass)"/>
<path d="M150 428 C170 392 230 356 330 352 L470 348 C540 348 600 372 640 410" fill="none" stroke="url(#nebV)" stroke-width="3"/>
<path d="M126 436 L676 426" stroke="url(#neb)" stroke-width="2" opacity=".9"/>
<path d="M240 362 L250 392 M470 352 L478 398" stroke="#0a0820" stroke-width="2" opacity=".6"/>
<path d="M640 410 L690 414 L688 428 L640 430Z" fill="#f06dff" opacity=".9"/><path d="M660 416 L692 418" stroke="#fff" stroke-width="3" opacity=".9" filter="url(#softer)"/>
<path d="M128 440 L112 426 L160 422 L162 434Z" fill="#23eaff" opacity=".85"/><circle cx="118" cy="430" r="10" fill="#fff" opacity=".8" filter="url(#softer)"/>
${[[236, 446, '#23eaff'], [560, 440, '#f06dff']].map(([cx, cy, c]) => `<circle cx="${cx}" cy="${cy}" r="36" fill="#05040f"/><circle cx="${cx}" cy="${cy}" r="24" fill="url(#rim)" stroke="url(#neb)" stroke-width="3"/><g stroke="#e8f4ff" stroke-width="3" opacity=".8">${[0,60,120].map(a => `<path d="M${cx} ${cy - 20} L${cx} ${cy + 20}" transform="rotate(${a} ${cx} ${cy})"/>`).join('')}</g><circle cx="${cx}" cy="${cy}" r="6" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="30" fill="${c}" opacity=".18" filter="url(#softer)"/>`).join('')}
<path d="M240 368 L420 358" stroke="#bfefff" stroke-width="2" opacity=".5"/>
</g>
<path d="M118 432 L-10 470 L-10 410Z" fill="#23eaff" opacity=".12" filter="url(#soft)"/>
<path d="M690 420 L820 400 L820 452Z" fill="#f06dff" opacity=".14" filter="url(#soft)"/>
<g stroke="#f06dff" stroke-width="3" opacity=".7" stroke-linecap="round"><path d="M700 424 H820"/><path d="M696 432 H800" opacity=".5"/></g>`),
  // 02 — a grand piano in a spotlight
  '02': wrap('A grand piano under a soft spotlight', `${defs()}${sky(glow('glowM', 400, 120, 300, 160) + glow('glowC', 160, 300, 220, 140))}
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
<g fill="url(#neb)" opacity=".9"><path d="M650 140 q0 -26 20 -26 q-4 20 -20 26z"/><circle cx="650" cy="150" r="6"/><path d="M690 100 q0 -26 20 -26 q-4 20 -20 26z"/><circle cx="690" cy="110" r="6"/></g>`),
  // 03 — a dream home with warm windows on a hill
  '03': wrap('A dream home with warm windows on a hill at night', `${defs()}${sky(glow('glowV', 620, 150, 320, 170) + glow('glowM', 150, 180, 260, 140))}
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
<g fill="#ffd27a" opacity=".8">${Array.from({length: 14}, () => `<circle cx="${f(100 + rand() * 600)}" cy="${f(300 + rand() * 260)}" r="${f(1.5 + rand() * 2)}"/>`).join('')}</g>`),
  // 04 — a mountain summit with a flag at dawn
  '04': wrap('A mountain summit at dawn', `${defs()}${sky(glow('glowM', 600, 260, 360, 180) + glow('glowC', 180, 140, 260, 150))}
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
<g transform="translate(372 150) scale(.18)"><path d="M0 -40 L4 30 M4 30 L-30 92 M4 30 L36 70 M0 -20 L-40 10 M0 -20 L40 -2" fill="none" stroke="#0b0a24" stroke-width="26" stroke-linecap="round"/><circle cx="2" cy="-66" r="22" fill="#0b0a24"/></g>`),
  // 05 — a beach at sunset with palms and a far sail
  '05': wrap('A beach at sunset with palms and a sail far out', `${defs()}${sky(glow('glowM', 400, 200, 420, 200) + glow('glowV', 120, 100, 240, 130))}
<circle cx="400" cy="270" r="120" fill="url(#sun)"/>
<path d="M0 300 L800 300 L800 480 L0 480Z" fill="url(#water)"/>
<path d="M0 300 L800 300" stroke="#fff" stroke-width="1.5" opacity=".5"/>
<g stroke="#ffd3ae" opacity=".55">${Array.from({length: 9}, (_, i) => `<path d="M${330 + i * 7} ${320 + i * 16} h${140 - i * 10}" stroke-width="${2 + (i % 3)}"/>`).join('')}</g>
<path d="M0 460 Q220 420 440 470 T800 440 L800 600 L0 600Z" fill="url(#sand)"/>
<path d="M0 462 Q220 422 440 472 T800 442" stroke="#fff" stroke-width="2" opacity=".5" fill="none"/>
<path d="M560 296 L560 236 L612 296Z M556 296 L556 250 L520 296Z" fill="#fff" opacity=".85"/>
<g stroke="url(#nebV)" stroke-width="10" stroke-linecap="round" fill="none"><path d="M120 470 C140 400 150 340 200 300"/><path d="M700 480 C690 410 680 360 640 320"/></g>
<g fill="url(#dark)" stroke="url(#neb)" stroke-width="2"><path d="M200 300 C240 250 300 250 330 280 C280 272 240 290 200 300Z"/><path d="M200 300 C170 240 190 190 240 180 C210 220 205 260 200 300Z"/><path d="M200 300 C150 270 110 280 90 320 C130 300 170 300 200 300Z"/><path d="M640 320 C660 270 720 270 750 300 C700 292 670 310 640 320Z"/><path d="M640 320 C610 270 630 220 680 210 C650 250 645 280 640 320Z"/><path d="M640 320 C600 290 560 300 540 340 C580 320 610 320 640 320Z"/></g>`),
  // 06 — a marathon finish: tape, arch, confetti
  '06': wrap('A marathon finish line under an arch, confetti in the air', `${defs()}${sky(glow('glowV', 400, 120, 400, 180) + glow('glowC', 400, 380, 300, 120))}
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
<ellipse cx="400" cy="450" rx="140" ry="18" fill="#23eaff" opacity=".2" filter="url(#soft)"/>`),
  // 07 — a home library with a reading lamp
  '07': wrap('A home library with tall shelves and a reading lamp', `${defs()}${sky(glow('glowV', 400, 300, 420, 240))}
<rect width="800" height="600" fill="#0b0a24" opacity=".55"/>
<path d="M0 470 L800 470 L800 600 L0 600Z" fill="url(#ground)"/>
<g>${[80, 300, 520].map(x => `<rect x="${x}" y="80" width="200" height="400" rx="8" fill="url(#dark)" stroke="url(#neb)" stroke-width="2"/>${[0,1,2,3,4].map(r => `<path d="M${x + 8} ${150 + r * 70} H${x + 192}" stroke="#9fe6ff" stroke-width="2" opacity=".5"/>${Array.from({length: 11}, (_, i) => { const h = 36 + ((i * 7 + r * 3) % 20), c = ['#23eaff', '#9273ff', '#f06dff', '#ffd27a', '#7bddff', '#c45cff'][(i + r) % 6]; return `<rect x="${x + 12 + i * 16}" y="${150 + r * 70 - h}" width="13" height="${h}" rx="2" fill="${c}" opacity=".85"/>`; }).join('')}`).join('')}`).join('')}</g>
<ellipse cx="400" cy="470" rx="150" ry="22" fill="#ffd27a" opacity=".25" filter="url(#soft)"/>
<path d="M360 470 L360 360 L440 360 L440 470Z" fill="url(#dark)" stroke="url(#neb)" stroke-width="2"/><path d="M340 470 L460 470 L470 486 L330 486Z" fill="url(#dark)" stroke="#9fe6ff" stroke-width="1.5"/>
<path d="M520 470 L520 330" stroke="url(#nebV)" stroke-width="6" stroke-linecap="round"/><path d="M480 330 L560 330 L545 290 L495 290Z" fill="url(#gold)"/><circle cx="520" cy="340" r="26" fill="#ffd27a" opacity=".5" filter="url(#softer)"/>
<path d="M372 376 L428 376 L428 392 L372 392Z M376 398 L424 398" stroke="#ffd27a" stroke-width="2" fill="#2a1f5c"/>
<path d="M740 90 L740 470 M700 160 L780 160 M700 240 L780 240 M700 320 L780 320 M700 400 L780 400" stroke="url(#nebV)" stroke-width="5" stroke-linecap="round" opacity=".9"/><path d="M700 60 L700 480" stroke="url(#nebV)" stroke-width="5" stroke-linecap="round"/>
<ellipse cx="400" cy="540" rx="220" ry="34" fill="url(#body)" opacity=".8" stroke="url(#neb)" stroke-width="2"/>
<g transform="translate(150 470)"><path d="M-30 0 L30 0 L22 -40 L-22 -40Z" fill="url(#dark)" stroke="#9fe6ff" stroke-width="1.5"/><g fill="#23eaff" opacity=".85"><ellipse cx="-20" cy="-70" rx="30" ry="12" transform="rotate(-30 -20 -70)"/><ellipse cx="22" cy="-80" rx="30" ry="12" transform="rotate(25 22 -80)"/><ellipse cx="0" cy="-100" rx="12" ry="30"/></g></g>`),
  // 08 — a sunrise run along a ridge path
  '08': wrap('A sunrise run along a ridge path', `${defs()}${sky(glow('glowM', 560, 300, 400, 200) + glow('glowC', 160, 160, 260, 140))}
<circle cx="560" cy="330" r="110" fill="url(#sun)"/>
<path d="M-20 600 L120 420 L260 480 L420 380 L600 460 L820 360 L820 600Z" fill="url(#dark)"/>
<path d="M-20 600 L120 420 L260 480 L420 380 L600 460 L820 360" fill="none" stroke="url(#neb)" stroke-width="3"/>
<path d="M0 520 Q300 470 800 500" stroke="#ffd3ae" stroke-width="5" fill="none" opacity=".7"/>
<path d="M0 530 Q300 480 800 510" stroke="#fff" stroke-width="1.5" fill="none" opacity=".3" stroke-dasharray="18 14"/>
<g fill="#1a1240">${[[80, 440], [140, 455], [560, 455], [700, 400], [760, 385]].map(([x, y]) => `<path d="M${x} ${y} L${x - 16} ${y + 40} L${x + 16} ${y + 40}Z"/><path d="M${x} ${y + 14} L${x - 22} ${y + 60} L${x + 22} ${y + 60}Z"/>`).join('')}</g>
<g fill="#e8f4ff" opacity=".35" filter="url(#soft)"><ellipse cx="200" cy="520" rx="200" ry="30"/><ellipse cx="620" cy="540" rx="220" ry="34"/></g>
${runner(300, 372, 1)}
<g fill="none" stroke="#e8f4ff" stroke-width="2" opacity=".7"><path d="M640 120 q10 -10 20 0 q10 -10 20 0"/><path d="M700 150 q8 -8 16 0 q8 -8 16 0"/></g>
<g fill="#fff" opacity=".7"><circle cx="110" cy="120" r="2"/><circle cx="140" cy="90" r="1.5"/></g>
<path d="M0 560 Q400 520 800 560 L800 600 L0 600Z" fill="#f06dff" opacity=".12" filter="url(#soft)"/>`),
};
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'showcase', 'vision');
for (const [n, svg] of Object.entries(scenes)) { writeFileSync(join(dir, `vision-${n}.svg`), svg); console.log(`vision-${n}.svg ${svg.length} bytes`); }

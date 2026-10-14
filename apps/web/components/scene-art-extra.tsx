import type {ReactNode} from 'react';
/**
 * Session AB-Design (owner request 17): all fifteen drawn scenes for the goal cards — the five originals (horizon,
 * mountains, home, garden, aurora), redrawn to match, and ten more — on SceneArt's shared sky, stars, ambient light and
 * palette variables (one SVG, viewBox 1000×500, sliced). This file is a lazy chunk, so none of it weighs on the page
 * bundle. `ref(name)` resolves the base gradients and clip of components/scene-art.tsx: sky, edge, light, planet, sun,
 * ice, water, globe.
 * Each scene is layered far → mid → near, with haze between the layers, its own light (moon, sun, lamp, window) and a
 * reflection where there is water or glass. Local gradients take their ids from `ref`'s per-instance prefix plus the
 * scene's own name, so several cards on one page never share an id.
 */
type Ref = (name: string) => string;
type B = readonly [number, number, number];
type Stop = readonly [number, string, number];
const WL = 'var(--window-light)', SD = 'var(--space-deep)', SB = 'var(--space-blue)', SP = 'var(--space-purple)', MS = 'var(--mountain-snow)', MF = 'var(--mountain-far)';
const CY = 'var(--brand-cyan)', VI = 'var(--brand-violet)', MG = 'var(--brand-magenta)', BL = 'var(--brand-blue)', TX = 'var(--text)';
const HW = 'var(--house-wall)', HR = 'var(--house-roof)', GD = 'var(--garden-dark)', GM = 'var(--garden-mid)';
const BOOK = [CY, VI, MG, WL, BL] as const;
/** A stable pseudo-random 0–1 (integer hash, so server and client agree). */
const h = (i: number) => ((i * 2654435761) >>> 0) % 997 / 997;
const r1 = (n: number) => Math.round(n * 10) / 10;
/** [id, url] makers: `ref`'s per-instance prefix + the scene's name + the local name. */
const ids = (ref: Ref, scene: string) => { const p = `${ref('').slice(5, -1)}${scene}-`; return [(n: string) => p + n, (n: string) => `url(#${p}${n})`] as const; };
const lin = (id: string, stops: readonly Stop[], x2 = 0, y2 = 1) => <linearGradient id={id} x2={x2} y2={y2}>{stops.map(([o, c, a]) => <stop key={o} offset={o} stopColor={c} stopOpacity={a}/>)}</linearGradient>;
const rad = (id: string, c: string, a = 1) => <radialGradient id={id}><stop stopColor={c} stopOpacity={a}/><stop offset=".4" stopColor={c} stopOpacity={a * .3}/><stop offset="1" stopColor={c} stopOpacity="0"/></radialGradient>;
const spark = (x: number, y: number, r: number) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z`;
/** Buildings standing on `base`, with a seeded scatter of lit windows. */
const city = (bs: readonly B[], base: number, fill: string, lit: number, seed: number) => bs.map(([x, w, t], i) => { const cols = Math.floor((w - 8) / 13), rows = Math.floor((t - 24) / 18); return <g key={i}><path d={`M${x} ${base}V${base - t}h${w}V${base}z`} fill={fill}/>{Array.from({length: cols * rows}, (_, k) => h(k * 3 + i * 101 + seed) < lit ? <rect key={k} x={x + 7 + (k % cols) * 13} y={base - t + 14 + Math.floor(k / cols) * 18} width="6" height="9" fill={h(k + i * 7 + seed) < .12 ? MG : WL} opacity={r1(.35 + h(k * 5 + i + seed) * .55)}/> : null)}</g>; });
const birds = (x: number, y: number) => <g fill="none" stroke={TX} strokeWidth="2" opacity=".55" strokeLinecap="round"><path d={`M${x} ${y}q8-8 16 0q8-8 16 0`}/><path d={`M${x + 46} ${y - 20}q6-6 12 0q6-6 12 0`}/></g>;
/** One tiered pine standing on `b`, `t` tall, as a path fragment; `pines` scatters a seeded row of them. */
const pine = (x: number, b: number, t: number) => { const p = (dx: number, dy: number) => `${r1(x + dx * t)} ${r1(b - dy * t)}`; return `M${p(0, 1)}L${p(.18, .6)}L${p(.09, .6)}L${p(.26, .28)}L${p(.15, .28)}L${p(.32, 0)}L${p(-.32, 0)}L${p(-.15, .28)}L${p(-.26, .28)}L${p(-.09, .6)}L${p(-.18, .6)}z`; };
const pines = (n: number, x0: number, x1: number, b: number, t0: number, t1: number, seed: number) => Array.from({length: n}, (_, i) => pine(r1(x0 + (x1 - x0) * (i + h(i + seed) * .7) / n), r1(b + h(i + seed * 3) * 8), r1(t0 + (t1 - t0) * h(i * 7 + seed)))).join('');
const moon = (x: number, y: number, r: number, halo: string) => <><ellipse cx={x} cy={y} rx={r * 6} ry={r * 5.4} fill={halo}/><circle cx={x} cy={y} r={r} fill={MS}/><circle cx={r1(x - r * .3)} cy={r1(y - r * .25)} r={r1(r * .24)} fill={MF} opacity=".22"/><circle cx={r1(x + r * .36)} cy={r1(y + r * .3)} r={r1(r * .16)} fill={MF} opacity=".22"/></>;
const fireflies = (n: number, x0: number, x1: number, y0: number, y1: number, seed: number) => <g fill={WL}>{Array.from({length: n}, (_, i) => { const x = r1(x0 + h(i + seed) * (x1 - x0)), y = r1(y0 + h(i + seed + 40) * (y1 - y0)); return <g key={i}><circle cx={x} cy={y} r="8" opacity=".13"/><circle cx={x} cy={y} r="2" opacity=".85"/></g>; })}</g>;
export const EXTRA_SCENES: Record<string, (ref: Ref) => ReactNode> = {
  horizon: ref => { const [id, u] = ids(ref, 'hor'), limb = 'M-100 100C250-65 710 87 1040 495';
    return <>
      <defs>{rad(id('mh'), CY, .4)}{rad(id('night'), SD, .85)}</defs>
      <g fill="none" stroke={ref('edge')} opacity=".12">{Array.from({length: 9}, (_, i) => <path key={i} d={`M${610 + i * 19} -30Q${1010 - i * 12} ${95 + i * 6} ${825 + i * 12} 254T1080 ${415 + i * 12}`} strokeWidth={i % 3 === 0 ? 14 : 2}/>)}</g>
      {moon(936, 92, 12, u('mh'))}<circle cx="936" cy="92" r="12" fill={SD} opacity=".55" transform="translate(5 -3)"/>
      <path d={`${limb}L-100 570Z`} fill={ref('planet')}/>
      <g clipPath={ref('globe')}>
        <g fill="var(--planet-land)" stroke="var(--planet-coast)" strokeWidth=".7" opacity=".7">
          <path d="M370 121l29-31 44 9 26 19 32-4 23 24 43 8 14 22-21 13 12 24-24 16 6 24-36 1-18 24-14-21-36-10-14-24-22 5-2-27-31-19z"/>
          <path d="M562 195l40-24 52 15 16 23 35 8 25 32-23 22-14 45-31 34-7 49-31-8-23-42-25-20-5-43-29-19z"/>
          <path d="M736 292l33-20 40 17 16 24 54 20 16 28-7 33-27 2-24-39-31-11-27 12-31-34zM699 159l30 5 19 24-23 8-26-10zM180 210l40-12 30 20-6 30-38 6-30-18z"/>
        </g>
        <ellipse cx="160" cy="460" rx="520" ry="360" fill={u('night')}/>
        <g fill="var(--city-light)">{Array.from({length: 125}, (_, i) => <circle key={i} cx={365 + (i * 71) % 480} cy={145 + (i * 37) % 275} r={i % 13 === 0 ? 1.7 : .65} opacity={.25 + (i % 4) * .15}/>)}{Array.from({length: 40}, (_, i) => <circle key={`n${i}`} cx={r1(150 + h(i + 3) * 300)} cy={r1(190 + h(i + 60) * 200)} r=".8" opacity=".5"/>)}</g>
        <g fill="none" stroke="var(--mountain-snow)" opacity=".1" strokeLinecap="round"><path d="M390 129q190 10 315 145t220 100" strokeWidth="11"/><path d="M497 209q50 13 67 50t84 56" strokeWidth="6"/><path d="M208 340q123-13 229 44t218 6" strokeWidth="4"/><path d="M120 180q90-30 190 10t160 60" strokeWidth="8"/><path d="M640 160q60 20 90 60" strokeWidth="5"/></g>
      </g>
      <path d={limb} fill="none" stroke={CY} strokeWidth="70" opacity=".05"/>
      <path d={limb} fill="none" stroke={ref('edge')} strokeWidth="32" opacity=".12"/>
      <path d={limb} fill="none" stroke={ref('edge')} strokeWidth="12" opacity=".24"/>
      <path d={limb} fill="none" stroke={ref('edge')} strokeWidth="2.5"/>
      <g fill="none" stroke={BL} opacity=".13">
        <path d="M220 88l110 10 25 38 88 2 64 45 89 15 45 59 100 46 65 70"/>
        <path d="M270 133l-23 41 92 8 10 41 95 11 34 59 145 24 12 47 100 34"/>
        <path d="M468 144l11 31 51 4 62 76 71 8 33 78 119 65"/>
        <ellipse cx="308" cy="438" rx="660" ry="250" transform="rotate(20 308 438)"/>
        <ellipse cx="308" cy="438" rx="550" ry="215" transform="rotate(20 308 438)"/>
      </g>
      <ellipse cx="828" cy="281" rx="200" ry="160" fill={ref('sun')}/>
      <path d="M747 281h166M828 240v82" stroke="var(--star)" opacity=".55" strokeWidth=".7"/>
      <g fill={TX}>{([[560, 60, 7], [880, 40, 5], [700, 150, 4]] as const).map(([x, y, r]) => <path key={x} d={spark(x, y, r)} opacity=".8"/>)}</g>
      <path d="M0 476Q500 349 1000 424" fill="none" stroke={ref('edge')} strokeWidth="2" opacity=".65"/>
      <path d="M0 487Q550 370 1000 440" fill="none" stroke={VI} strokeWidth="9" opacity=".08"/>
    </>; },
  mountains: ref => { const [id, u] = ids(ref, 'mtn'), big: B[] = [[250, 176, 250], [520, 96, 290], [800, 150, 260]], small: B[] = [[60, 246, 160], [380, 236, 130], [660, 226, 140], [960, 236, 170]];
    const pk = ([x, t, w]: B) => { const H = 400 - t, p = (dx: number, dy: number) => `${r1(x + dx * w)} ${r1(t + dy * H)}`; return <g key={x}>
      <path d={`M${x} ${t}L${x - w} 400H${x + w}z`} fill={ref('ice')}/>
      <path d={`M${x} ${t}L${p(-.3, .3)}L${p(-.21, .25)}L${p(-.13, .37)}L${p(-.04, .29)}L${p(.07, .4)}L${p(.18, .28)}L${p(.3, .3)}z`} fill={MS} opacity=".9"/>
      <path d={`M${x} ${t}L${p(.05, .3)}L${p(-.04, .55)}L${p(.1, .78)}L${p(.02, 1)}H${x + w}z`} fill={SB} opacity=".6"/>
      <path d={`M${p(-.13, .37)}L${p(-.22, .64)}L${p(-.3, .8)}M${p(-.04, .29)}L${p(-.08, .6)}M${p(-.21, .25)}L${p(-.4, .5)}`} fill="none" stroke={MS} strokeWidth="2" opacity=".3"/>
    </g>; };
    return <>
      <defs>{rad(id('mh'), CY, .45)}{lin(id('hz'), [[0, SP, 0], [1, VI, .32]])}{lin(id('fd'), [[0, SD, 0], [1, SD, .7]])}</defs>
      {moon(230, 128, 22, u('mh'))}
      <path d="M0 330L70 270l70 30 90-80 100 70 90-50 100 60 90-70 90 50 90-70 90 60 120-40V400H0z" fill={MF} opacity=".45"/>
      <path d="M0 220h1000v180H0z" fill={u('hz')}/>
      {small.map(pk)}
      <path d="M0 300h1000v100H0z" fill={u('hz')} opacity=".8"/>
      {big.map(pk)}
      <path d="M0 340h1000v60H0z" fill={u('hz')} opacity=".6"/>
      <path d="M0 400h1000v100H0z" fill={ref('water')}/>
      <g transform="matrix(1 0 0 -1 0 800)" opacity=".32">{big.map(pk)}</g>
      <path d="M0 400h1000v100H0z" fill={u('fd')}/>
      <g stroke={MS} strokeWidth="2.5">{Array.from({length: 9}, (_, i) => <path key={i} d={`M${r1(220 - i * 4 + h(i) * 10)} ${408 + i * 9}h${14 + i * 7}`} opacity={r1(.65 - i * .06)}/>)}</g>
      <g stroke={CY} strokeWidth="1.2" opacity=".25">{Array.from({length: 12}, (_, i) => <path key={i} d={`M${r1(h(i + 30) * 920)} ${410 + i * 7}h${r1(30 + h(i) * 60)}`}/>)}</g>
      <path d="M0 400h1000" stroke={CY} strokeWidth="1.5" opacity=".35"/>
      <path d="M0 500V426q60-10 110 6t50 68zM1000 500V404q-100-4-190 22t-130 74z" fill={SD}/>
      <path fill={SD} d={pines(5, -10, 130, 430, 46, 96, 3) + pines(7, 800, 1010, 410, 44, 110, 9)}/>
    </>; },
  home: ref => { const [id, u] = ids(ref, 'home'), win = [[344, 327], [400, 226], [556, 324], [640, 320], [482, 334]] as const;
    return <>
      <defs>{rad(id('mh'), WL, .45)}{rad(id('win'), WL, .65)}{lin(id('sw'), [[0, HW, 1], [1, SD, 1]], 1, 0)}{lin(id('rf'), [[0, HR, 1], [1, SD, 1]])}{lin(id('hz'), [[0, SP, 0], [1, VI, .3]])}{lin(id('pv'), [[0, MF, 1], [1, HW, 1]])}{lin(id('pn'), [[0, GM, 1], [1, SD, 1]])}</defs>
      {moon(784, 108, 24, u('mh'))}
      <path d="M0 330q120-50 260-30t260-14t260 20t220-12V390H0z" fill={MF} opacity=".5"/>
      <g fill={WL}>{Array.from({length: 14}, (_, i) => <rect key={i} x={r1(h(i + 4) * 990)} y={r1(318 + h(i + 19) * 26)} width="4" height="4" opacity={r1(.3 + h(i) * .5)}/>)}</g>
      <path d="M0 280h1000v110H0z" fill={u('hz')}/>
      <path d="M0 500V384q250-40 500-16t500-8V500z" fill={GD}/>
      <path d="M500 270l200-8v148l-200 10z" fill={u('sw')}/>
      <path d="M400 164l208-4 108 108-210 10z" fill={u('rf')}/>
      <path d="M556 196v-70h28v62z" fill={HR}/><path d="M550 120h40v10h-40z" fill={HW}/>
      <g fill="none" stroke={MS} strokeLinecap="round" opacity=".12"><path d="M570 112q-16-24 6-46t-4-50" strokeWidth="10"/><path d="M574 110q-12-20 4-38" strokeWidth="4"/></g>
      <path d="M300 270l100-94 100 94v150H300z" fill={HW}/>
      <path d="M286 282l114-118 114 118" fill="none" stroke={HR} strokeWidth="12" strokeLinejoin="round"/>
      <path d="M286 282l114-118 108 112M400 164l208-4M506 278l210-10" fill="none" stroke={ref('edge')} strokeWidth="2" opacity=".6"/>
      {win.map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="78" ry="64" fill={u('win')}/>)}
      <g fill={WL}><path d="M316 300h56v54h-56zM530 297l50-2v58l-50 2zM614 293l50-2v58l-50 2z"/><circle cx="400" cy="226" r="17"/></g>
      <path d="M538 312l34-1v34l-34 1z" fill={MG} opacity=".22"/>
      <path d="M344 300v54M316 327h56M555 296v58M530 324h50M639 292v58M614 320h50M400 209v34M383 226h34" stroke={HR} strokeWidth="5"/>
      <path d="M422 420v-86q24-14 48 0v86z" fill={HR}/><path d="M432 342h28v22h-28z" fill={WL} opacity=".8"/><circle cx="462" cy="384" r="3" fill={WL}/>
      <circle cx="482" cy="334" r="5" fill={WL}/>
      <path d="M422 420h48l90 80H330z" fill={u('pv')}/>
      <g fill={MS} opacity=".18">{([[446, 432, 18], [450, 452, 24], [455, 478, 32]] as const).map(([x, y, r]) => <ellipse key={y} cx={x} cy={y} rx={r} ry={r / 3.5}/>)}</g>
      <g fill={WL} opacity=".1"><ellipse cx="344" cy="432" rx="80" ry="12"/><ellipse cx="600" cy="424" rx="110" ry="12"/></g>
      <g>{Array.from({length: 16}, (_, i) => { const x = i < 6 ? 304 + i * 20 : 488 + i * 14, y = 416 - (i < 6 ? 0 : (i - 6) * .7); return <g key={i}><circle cx={r1(x)} cy={r1(y)} r={14 + (i % 3) * 3} fill={GD}/><circle cx={r1(x + 5)} cy={r1(y - 6)} r="3" fill={[MG, WL, CY][i % 3]} opacity=".75"/></g>; })}</g>
      <path d={`${Array.from({length: 13}, (_, i) => `M${30 + i * 21} 444v-36`).join('')}${Array.from({length: 12}, (_, i) => `M${736 + i * 22} 440v-36`).join('')}M24 418h276M24 432h276M730 414h270M730 428h270`} stroke={HW} strokeWidth="5" opacity=".75"/>
      <path fill={u('pn')} d={pines(3, 110, 260, 436, 150, 230, 5)}/>
      <g transform="translate(902 446)"><path d="M0 0V-140" stroke={HR} strokeWidth="14"/>{([[-50, -160, 56], [40, -186, 62], [0, -226, 50], [54, -132, 46], [-42, -118, 42]] as const).map(([cx, cy, r]) => <g key={cy}><circle cx={cx} cy={cy} r={r} fill={GD}/><path d={`M${r1(cx - r * .95)} ${r1(cy - r * .3)}a${r} ${r} 0 0 1 ${r1(r * .66)} ${r1(-r * .66)}`} fill="none" stroke={GM} strokeWidth="5" opacity=".7"/></g>)}</g>
      {fireflies(9, 40, 960, 330, 480, 13)}
      <ellipse cx="30" cy="506" rx="170" ry="46" fill={SD}/><ellipse cx="990" cy="506" rx="160" ry="40" fill={SD}/>
    </>; },
  garden: ref => { const [id, u] = ids(ref, 'gdn'), beds = [[190, 410], [450, 670], [710, 930]] as const, far = (x: number) => r1(480 + (x - 480) * .5);
    const leaves = (a: number, b: number) => Array.from({length: 30}, (_, i) => { const f = .1 + Math.floor(i / 5) * .17, y = 370 + 120 * f, s = (y - 250) / 240, x = r1(far(a) + (a - far(a)) * f + ((i % 5) + .5) / 5 * (far(b) - far(a) + (b - a - far(b) + far(a)) * f)), k = (n: number) => r1(n * s);
      return `M${x} ${r1(y)}q${k(-8)} ${k(-12)} ${k(-16)} ${k(-5)}q${k(8)} ${k(8)} ${k(16)} ${k(5)}zM${x} ${r1(y)}q${k(8)} ${k(-14)} ${k(17)} ${k(-8)}q${k(-8)} ${k(10)} ${k(-17)} ${k(8)}z`; }).join('');
    return <>
      <defs>{rad(id('mh'), CY, .45)}{lin(id('gl'), [[0, CY, .3], [1, GM, .14]])}{rad(id('lt'), WL, .7)}{lin(id('lf'), [[0, GM, 1], [1, GD, 1]], 1, 1)}{lin(id('bed'), [[0, HR, 1], [1, SD, 1]])}{lin(id('pot'), [[0, MF, 1], [1, HR, 1]])}{lin(id('mist'), [[0, CY, 0], [1, CY, .14]])}</defs>
      {moon(290, 108, 22, u('mh'))}
      <g fill={MF} opacity=".55">{Array.from({length: 23}, (_, i) => <circle key={i} cx={r1(i * 46 + h(i) * 20)} cy={r1(292 + h(i + 5) * 18)} r={r1(24 + h(i + 9) * 22)}/>)}<path d="M0 300h1000v50H0z"/></g>
      <path d="M0 240h1000v110H0z" fill={u('mist')}/>
      <path d="M0 500V342q500-16 1000 0v158z" fill={GD}/>
      <ellipse cx="752" cy="272" rx="190" ry="130" fill={u('lt')} opacity=".7"/>
      <path d="M622 342V232h260v110zM610 234l142-72 142 72z" fill={u('gl')}/>
      <g fill={GD} opacity=".75">{Array.from({length: 9}, (_, i) => <circle key={i} cx={640 + i * 28} cy={r1(328 - h(i + 2) * 22)} r={r1(12 + h(i + 8) * 12)}/>)}</g>
      <path d="M622 342V232h260v110M610 234l142-72 142 72M622 288h260M752 162v180M674 208v134M830 208v134M666 342v-110M700 342v-110M804 342v-110M838 342v-110" fill="none" stroke={HW} strokeWidth="3.5"/>
      <path d="M610 234l142-72 142 72" fill="none" stroke={ref('edge')} strokeWidth="2.5" opacity=".7"/>
      <path d="M736 342v-40h32v40z" fill={WL} opacity=".55"/>
      <ellipse cx="752" cy="350" rx="190" ry="12" fill={WL} opacity=".1"/>
      <path d={`${[40, 160, 280, 400, 520].map(x => `M${x} 352v-48`).join('')}`} stroke={HR} strokeWidth="6"/>
      <path d="M40 306q60 22 120 0t120 0t120 0t120 0" fill="none" stroke={HW} strokeWidth="1.5"/>
      <g>{Array.from({length: 12}, (_, i) => { const t = (i % 3 + 1) / 4, x = r1(40 + Math.floor(i / 3) * 120 + t * 120), y = r1(306 + 44 * t * (1 - t)); return <g key={i} fill={[WL, MG, CY][i % 3]}><circle cx={x} cy={y} r="11" opacity=".2"/><circle cx={x} cy={y} r="3.5"/></g>; })}</g>
      {beds.map(([a, b], i) => <g key={a}>
        <path d={`M${a} 490L${far(a)} 370H${far(b)}L${b} 490z`} fill={SD} stroke={u('bed')} strokeWidth="8" strokeLinejoin="round"/>
        <path fill={i === 1 ? GD : GM} d={leaves(a, b)}/>
        {i === 1 ? <g>{Array.from({length: 15}, (_, k) => { const f = .1 + Math.floor(k / 5) * .34, y = 370 + 120 * f, s = (y - 250) / 240, x = r1(far(a) + (a - far(a)) * f + ((k % 5) + .5) / 5 * ((far(b) - far(a)) + ((b - a) - (far(b) - far(a))) * f)); return <circle key={k} cx={x} cy={r1(y - 16 * s)} r={r1(6 * s)} fill={BOOK[k % 5]} opacity=".85"/>; })}</g> : null}
        <path d={`M${a - 6} 486h${b - a + 12}v20h${a - b - 12}z`} fill={HR}/><path d={`M${a - 6} 486h${b - a + 12}`} stroke={WL} strokeWidth="2" opacity=".3"/>
      </g>)}
      <path d="M30 506l16-86h128l16 86z" fill={u('pot')}/><path d="M36 410h148v14H36z" fill={HR} stroke={ref('edge')} strokeWidth="2" strokeOpacity=".6"/><path d="M46 432h128" stroke={MS} strokeWidth="3" opacity=".15"/>
      <path d="M110 410V250M110 360l-36-24M110 320l40-30" stroke={GM} strokeWidth="5" fill="none"/>
      <g fill={u('lf')}>{([[64, 332, 78, -30], [158, 300, 82, -40], [84, 274, 70, 50], [142, 236, 64, 60], [106, 222, 52, -80], [62, 386, 66, 15], [160, 372, 70, -15], [40, 304, 56, 30]] as const).map(([x, y, w, a]) => <ellipse key={y} cx={x} cy={y} rx={w * .5} ry={w * .22} transform={`rotate(${a} ${x} ${y})`}/>)}</g>
      <g stroke={MS} strokeWidth="1.5" opacity=".25">{([[64, 332, 58, -30], [158, 300, 62, -40], [84, 274, 52, 50], [70, 380, 46, 15], [156, 372, 50, -15]] as const).map(([x, y, w, a]) => <path key={y} d={`M${x - w * .45} ${y}h${w * .9}`} transform={`rotate(${a} ${x} ${y})`}/>)}</g>
      {([[962, 230, 18], [990, 268, 14], [936, 292, 12]] as const).map(([x, y, r]) => <g key={x}><path d={`M${x} ${y}V500`} stroke={GD} strokeWidth="5"/><circle cx={x} cy={y} r={r} fill="none" stroke={WL} strokeWidth={r * .6} strokeDasharray="4 3" opacity=".85"/><circle cx={x} cy={y} r={r * .5} fill={HR}/></g>)}
      {fireflies(10, 200, 940, 300, 470, 21)}
    </>; },
  aurora: ref => { const [id, u] = ids(ref, 'aur'), xs = Array.from({length: 27}, (_, i) => i * 40 - 20);
    const band = (y: number, a: number, f: number, p: number, ht: number, seed: number, fill: string) => { const w = (x: number) => r1(y + a * Math.sin(x * f + p)), edge = xs.map(x => `${x} ${w(x)}`).join('L');
      return <g key={seed}>
        <path d={`M${edge}L${xs.map((x, i) => `${x} ${r1(w(x) - ht * (.5 + h(i + seed) * .5))}`).reverse().join('L')}z`} fill={fill} opacity=".35"/>
        {Array.from({length: 72}, (_, i) => { const x = r1(i * 14 + h(i + seed) * 8), l = r1(ht * (.3 + h(i * 3 + seed) * .8)); return <rect key={i} x={x} y={r1(w(x) - l)} width={i % 4 ? 2 : 5} height={l} fill={fill} opacity={r1(.2 + h(i + seed * 2) * .5)}/>; })}
        <path d={`M${edge}`} fill="none" stroke={CY} strokeWidth="2" opacity=".45"/>
      </g>; };
    const sky = <>{band(196, 30, .007, 2, 120, 7, u('c2'))}{band(246, 40, .009, 0, 150, 1, u('c1'))}</>, ridge = 'M0 344L60 300l60 18 80-56 70 38 60-20 90 38 80-48 80 40 80-60 80 50 80-24 80 34 100-30V350H0z';
    return <>
      <defs>{lin(id('c1'), [[0, CY, 0], [.7, CY, .22], [1, CY, .75]])}{lin(id('c2'), [[0, MG, 0], [.6, VI, .35], [1, VI, .75]])}{lin(id('hz'), [[0, SP, 0], [1, VI, .3]])}{lin(id('fd'), [[0, SD, .1], [1, SD, .85]])}{rad(id('lt'), WL, .8)}</defs>
      {sky}
      <g fill={TX}>{([[120, 70, 6], [860, 56, 5], [640, 40, 4]] as const).map(([x, y, r]) => <path key={x} d={spark(x, y, r)} opacity=".8"/>)}</g>
      <path d="M0 250h1000v100H0z" fill={u('hz')}/>
      <path d={ridge} fill={MF} opacity=".8"/>
      <path d="M200 262l-16 12 8-1 8 6 8-6 9 1zM530 274l-15 10 7-1 8 5 7-5 8 1zM770 254l-18 13 9-2 9 7 9-7 9 2z" fill={MS} opacity=".45"/>
      <path d="M0 300h1000v50H0z" fill={u('hz')} opacity=".6"/>
      <path d="M0 350h1000v150H0z" fill={ref('water')}/>
      <g transform="matrix(1 0 0 -1 0 700)" opacity=".28">{sky}<path d={ridge} fill={MF}/></g>
      <path d="M0 350h1000v150H0z" fill={u('fd')}/>
      <g stroke={CY} strokeWidth="1.4" opacity=".3">{Array.from({length: 16}, (_, i) => <path key={i} d={`M${r1(h(i + 50) * 940)} ${358 + i * 8}h${r1(30 + h(i) * 80)}`}/>)}</g>
      <path d="M0 350h1000" stroke={CY} strokeWidth="1.5" opacity=".4"/>
      <path d="M0 500V368q100-8 200 8t110 50t30 74zM1000 500V362q-120-2-220 20t-110 118z" fill={SD}/>
      <path fill={SD} d={pines(9, -20, 220, 374, 50, 120, 2) + pines(9, 760, 1020, 368, 46, 128, 11)}/>
      <ellipse cx="826" cy="372" rx="60" ry="40" fill={u('lt')} opacity=".7"/>
      <path d="M804 386v-26l22-18 22 18v26z" fill={HR}/><path d="M798 362l28-24 28 24" fill="none" stroke={SD} strokeWidth="5"/><path d="M819 364h14v11h-14z" fill={WL}/>
      <g stroke={WL} strokeWidth="2">{[0, 1, 2, 3].map(i => <path key={i} d={`M${820 - i * 2} ${394 + i * 9}h${12 + i * 4}`} opacity={r1(.5 - i * .1)}/>)}</g>
    </>; },
  skyline: ref => { const [id, u] = ids(ref, 'sky'), near: B[] = [[-10, 96, 118], [96, 64, 186], [168, 100, 96], [282, 74, 246], [368, 112, 136], [492, 66, 168], [570, 104, 92], [686, 84, 116], [782, 104, 156], [898, 112, 196]];
    const far = Array.from({length: 26}, (_, i): B => [i * 40 - 14, r1(30 + h(i + 3) * 24), r1(90 + h(i + 50) * 140)]), mid = Array.from({length: 15}, (_, i): B => [i * 70 - 26, r1(46 + h(i + 9) * 30), r1(120 + h(i + 31) * 150)]);
    return <>
      <defs>{lin(id('hz'), [[0, VI, 0], [.65, MG, .3], [1, VI, .1]])}{lin(id('bd'), [[0, MF, 1], [1, SD, 1]])}{lin(id('mist'), [[0, SP, 0], [1, VI, .3]])}{lin(id('fd'), [[0, SD, .1], [1, SD, .9]])}</defs>
      <ellipse cx="736" cy="150" rx="170" ry="160" fill={ref('sun')} opacity=".8"/>
      <circle cx="736" cy="150" r="30" fill={MS} opacity=".9"/><circle cx="726" cy="142" r="7" fill={MF} opacity=".2"/><circle cx="748" cy="161" r="5" fill={MF} opacity=".2"/>
      <path d="M0 170h1000v210H0z" fill={u('hz')}/>
      <g fill={MF} opacity=".6">{far.map(([x, w, t], i) => <path key={i} d={`M${x} 380V${r1(380 - t)}h${w}V380z`}/>)}</g>
      <path d="M0 250h1000v130H0z" fill={u('mist')}/>
      {city(mid, 380, u('bd'), .14, 7)}
      <path d="M0 300h1000v80H0z" fill={u('mist')} opacity=".8"/>
      <path d="M319 134V86" stroke={MS} strokeWidth="3"/><circle cx="319" cy="84" r="10" fill={MG} opacity=".35"/><circle cx="319" cy="84" r="3.5" fill={MG}/>
      {city(near, 380, SD, .26, 3)}
      <g fill={CY} opacity=".45">{near.map(([x, w, t], i) => <rect key={i} x={x} y={380 - t} width={w} height="2.5"/>)}</g>
      <path d="M0 380h1000v120H0z" fill={ref('water')}/>
      <g transform="matrix(1 0 0 -1 0 760)" opacity=".3">{city(near, 380, SD, .26, 3)}</g>
      <path d="M0 380h1000v120H0z" fill={u('fd')}/>
      <g stroke={MS} strokeWidth="2.5">{Array.from({length: 11}, (_, i) => <path key={i} d={`M${r1(724 - i * 5 + h(i) * 12)} ${388 + i * 10}h${16 + i * 9}`} opacity={r1(.7 - i * .05)}/>)}</g>
      <g stroke={CY} strokeWidth="1.2" opacity=".3">{Array.from({length: 16}, (_, i) => <path key={i} d={`M${r1(h(i + 70) * 940)} ${392 + i * 7}h${r1(30 + h(i) * 70)}`}/>)}</g>
      <path d="M0 380h1000" stroke={CY} strokeWidth="1.5" opacity=".4"/>
    </>; },
  sailboat: ref => { const [id, u] = ids(ref, 'sail'), sails = <><path d="M378 364V100q122 124 200 264z" fill={u('ms')}/><path d="M364 364V130L206 364z" fill={u('jb')}/></>;
    return <>
      <defs>{lin(id('dusk'), [[0, VI, 0], [.7, MG, .26], [1, WL, .42]])}{lin(id('sea'), [[0, MG, .35], [.18, SB, .95], [1, SD, 1]])}{lin(id('ms'), [[0, MS, .95], [1, WL, .92]], 1, 0)}{lin(id('jb'), [[0, MF, .95], [1, MS, .82]], 1, 0)}{lin(id('hl'), [[0, HR, 1], [1, SD, 1]])}</defs>
      <path d="M0 110h1000v200H0z" fill={u('dusk')}/>
      <g fill={MG} opacity=".25">{([[650, 196, 190], [860, 236, 140], [470, 248, 120], [170, 168, 150], [300, 214, 90]] as const).map(([x, y, w]) => <ellipse key={x} cx={x} cy={y} rx={w} ry="6"/>)}</g>
      <g stroke={WL} strokeWidth="2" opacity=".35">{([[650, 196, 190], [860, 236, 140], [470, 248, 120]] as const).map(([x, y, w]) => <path key={x} d={`M${x - w * .6} ${y + 5}h${w * 1.2}`}/>)}</g>
      <ellipse cx="790" cy="300" rx="280" ry="230" fill={ref('sun')}/>
      <circle cx="790" cy="300" r="36" fill={WL}/>
      <path d="M0 311V290q40-22 92-14q42-26 104-8q36-8 70 12l40 21z" fill={MF} opacity=".85"/><path d="M870 311q36-20 74-14q30-4 56 4v10z" fill={MF} opacity=".7"/>
      <path d="M0 270h1000v41H0z" fill={u('dusk')} opacity=".6"/>
      <path d="M598 306V280l14 26z" fill={MS} opacity=".5"/><path d="M592 306h24l-3 4h-18z" fill={SD} opacity=".7"/>
      <path d="M0 310h1000v190H0z" fill={u('sea')}/>
      <g stroke={WL} strokeLinecap="round">{Array.from({length: 16}, (_, i) => <path key={i} d={`M${r1(790 - 14 - i * 9 + h(i) * 16)} ${314 + i * 6 + i * i * .5}h${28 + i * 16}`} strokeWidth={r1(1.5 + i * .25)} opacity={r1(.75 - i * .04)}/>)}</g>
      <g stroke={MS} fill="none">{Array.from({length: 18}, (_, i) => <path key={i} d={`M${r1(h(i + 20) * 900)} ${r1(318 + i * 8 + i * i * .15)}q${10 + i * 3} -3 ${20 + i * 6} 0`} strokeWidth={r1(1 + i * .08)} opacity={r1(.1 + h(i) * .14)}/>)}</g>
      <g transform="matrix(1 0 0 -1 0 790)" opacity=".16">{sails}</g>
      <g stroke={SB} strokeWidth="3" opacity=".7">{Array.from({length: 8}, (_, i) => <path key={i} d={`M190 ${406 + i * 12}h${380 - i * 20}`}/>)}</g>
      <path d="M372 368V94" stroke={TX} strokeWidth="4"/>
      {sails}
      <path d="M378 100q122 124 200 264" fill="none" stroke={WL} strokeWidth="2.5" opacity=".8"/>
      <g stroke={HW} strokeWidth="1.5" opacity=".25">{[0, 1, 2, 3].map(i => <path key={i} d={`M378 ${160 + i * 52}l${48 + i * 34} ${12 + i * 4}`}/>)}</g>
      <path d="M378 364h204" stroke={TX} strokeWidth="3"/>
      <path d="M372 94l36-16-2 20z" fill={MG}/>
      <path d="M170 370h432q-14 28-58 40H228q-42-12-58-40z" fill={u('hl')} stroke={ref('edge')} strokeWidth="3"/>
      <path d="M200 384h372" stroke={VI} strokeWidth="3" opacity=".6"/>
      {birds(520, 160)}
    </>; },
  library: ref => { const [id, u] = ids(ref, 'lib'), Y = (f: number, x: number) => r1(-26 + 106 * x / 220 + f * (464 - 204 * x / 220)), X = (k: number) => r1(216 * (1 - .87 ** k));
    const wall = (seed: number) => <g>
      <path d={`M0 ${Y(.03, 0)}L206 ${Y(.03, 206)}V${Y(.99, 206)}L0 ${Y(.99, 0)}z`} fill={HR}/>
      {[.04, .23, .42, .61, .8].map((f, r) => Array.from({length: 15}, (_, k) => { const a = X(k) + 1, b = X(k + 1) - 1, s = f + .19, t = s - .19 * (.55 + h(k * 7 + r * 31 + seed) * .35); return <path key={`${r}-${k}`} d={`M${a} ${Y(s, a)}V${Y(t, a)}L${b} ${Y(t, b)}V${Y(s, b)}z`} fill={BOOK[(k + r + seed) % 5]} opacity={r1(.4 + h(k + r * 5 + seed) * .4)}/>; }))}
      {[.04, .23, .42, .61, .8, .99].map(f => <path key={f} d={`M0 ${Y(f, 0)}L206 ${Y(f, 206)}`} stroke={HW} strokeWidth="5"/>)}
      <path d={`M206 ${Y(.02, 206)}V${Y(.99, 206)}`} stroke={HW} strokeWidth="9"/>
    </g>;
    return <>
      <defs>{lin(id('bw'), [[0, SP, 1], [1, SD, 1]])}{lin(id('lw'), [[0, HR, 1], [1, SD, 1]], 1, 0)}{lin(id('fl'), [[0, SD, 1], [1, HW, 1]])}{lin(id('sh'), [[0, CY, .2], [1, CY, 0]])}{lin(id('cone'), [[0, WL, .32], [1, WL, .02]])}</defs>
      <path d="M0 -26L220 80h560L1000 -26z" fill={SD}/>
      <path d="M220 80h560v260H220z" fill={u('bw')}/>
      <path d="M0 -26L220 80V340L0 438z" fill={u('lw')}/><path d="M1000 -26L780 80V340L1000 438z" fill={u('lw')}/>
      {[236, 586].map((x, s) => <g key={x}><path d={`M${x} 96h178v242H${x}z`} fill={HR}/>{[0, 1, 2, 3].map(r => Array.from({length: 14}, (_, k) => { const t = 34 + h(k * 3 + r * 17 + s * 50) * 18; return <rect key={`${r}-${k}`} x={x + 6 + k * 12} y={r1(152 + r * 60 - t)} width="10" height={r1(t)} fill={BOOK[(k + r * 2 + s) % 5]} opacity={r1(.35 + h(k + r + s * 9) * .35)}/>; }))}{[0, 1, 2, 3].map(r => <path key={r} d={`M${x} ${154 + r * 60}h178`} stroke={HW} strokeWidth="4"/>)}</g>)}
      <path d="M440 322V170a60 60 0 0 1 120 0V322z" fill={ref('sky')}/>
      <g fill={TX} opacity=".8">{Array.from({length: 9}, (_, i) => <circle key={i} cx={r1(450 + h(i + 3) * 100)} cy={r1(130 + h(i + 40) * 170)} r={i % 3 ? .9 : 1.6}/>)}</g>
      <circle cx="526" cy="158" r="13" fill={MS}/><circle cx="532" cy="153" r="11" fill={SD} opacity=".9"/>
      <path d="M500 112V322M440 236h120" stroke={HW} strokeWidth="5"/><path d="M440 322V170a60 60 0 0 1 120 0V322z" fill="none" stroke={ref('edge')} strokeWidth="4"/>
      <path d="M0 438L220 340h560L1000 438V500H0z" fill={u('fl')}/>
      <g stroke={SD} strokeWidth="2" opacity=".4">{Array.from({length: 11}, (_, i) => <path key={i} d={`M${220 + i * 56} 340L${r1(500 + (i * 56 - 280) * 2.28)} 500`}/>)}</g>
      <path d="M440 322h120l78 150H362z" fill={u('sh')}/>
      {wall(0)}<g transform="matrix(-1 0 0 1 1000 0)">{wall(3)}</g>
      <g stroke={HW} strokeWidth="6" strokeLinecap="round"><path d="M838 494L880 64M872 498L914 68"/>{Array.from({length: 9}, (_, i) => { const t = (i + 1) / 10; return <path key={i} d={`M${r1(838 + 42 * t)} ${r1(494 - 430 * t)}L${r1(872 + 42 * t)} ${r1(498 - 430 * t)}`} strokeWidth="4"/>; })}</g>
      <path d="M330 412h340l76 70H254z" fill={MG} opacity=".14" stroke={VI} strokeWidth="3"/>
      <ellipse cx="300" cy="200" rx="260" ry="220" fill={ref('light')}/>
      <path d="M278 166L196 376h208L322 166z" fill={u('cone')}/>
      <ellipse cx="300" cy="412" rx="170" ry="34" fill={WL} opacity=".12"/>
      <path d="M300 0V140" stroke={HW} strokeWidth="2"/><path d="M274 168h52l-10-30h-32z" fill={WL}/><ellipse cx="300" cy="168" rx="20" ry="4" fill={TX}/>
      <path d="M206 382v62M394 382v62" stroke={HR} strokeWidth="7"/>
      <path d="M196 382h208l-22-24H218z" fill={HW} stroke={ref('edge')} strokeWidth="2"/>
      <path d="M262 368q19-7 38 0q19-7 38 0l-4-10q-17-6-34 0q-17-6-34 0z" fill={MS}/>
    </>; },
  studio: ref => { const [id, u] = ids(ref, 'stu');
    return <>
      <defs>{lin(id('wall'), [[0, SP, .96], [1, SD, .96]])}{lin(id('beam'), [[0, VI, .24], [1, CY, 0]])}{lin(id('fl'), [[0, HR, 1], [1, HW, 1]])}{lin(id('pt'), [[0, VI, 1], [.6, MG, 1], [1, WL, 1]])}{lin(id('hz'), [[0, SP, 0], [1, VI, .35]])}{rad(id('bulb'), WL, .6)}</defs>
      <path d="M0 0h1000v392H0z" fill={u('wall')}/>
      <path d="M560 46h380v290H560z" fill={ref('sky')}/>
      <g fill={TX} opacity=".8">{Array.from({length: 14}, (_, i) => <circle key={i} cx={r1(570 + h(i + 5) * 360)} cy={r1(56 + h(i + 60) * 180)} r={i % 4 ? .9 : 1.7}/>)}</g>
      <ellipse cx="850" cy="112" rx="110" ry="100" fill={ref('sun')} opacity=".9"/><circle cx="850" cy="112" r="17" fill={MS}/>
      <g fill={MF} opacity=".8">{Array.from({length: 14}, (_, i) => <path key={i} d={`M${560 + i * 28} 336v-${r1(30 + h(i + 2) * 74)}h24V336z`}/>)}</g>
      <g fill={WL}>{Array.from({length: 26}, (_, i) => <rect key={i} x={r1(566 + h(i + 90) * 370)} y={r1(272 + h(i + 30) * 56)} width="4" height="5" opacity={r1(.3 + h(i) * .5)}/>)}</g>
      <path d="M560 230h380v106H560z" fill={u('hz')}/>
      <path d="M560 46h380v290H560z" fill="none" stroke={HW} strokeWidth="12"/><path d="M687 46v290M813 46v290M560 190h380" stroke={HW} strokeWidth="6"/>
      <path d="M552 38h396v306H552z" fill="none" stroke={ref('edge')} strokeWidth="2.5" opacity=".7"/>
      <path d="M0 392h1000v108H0z" fill={u('fl')}/>
      <g stroke={SD} strokeWidth="2" opacity=".45">{[412, 438, 470].map((y, i) => <path key={y} d={`M0 ${y}h1000M${120 + i * 210} ${y}v${[26, 32, 30][i]}M${560 + i * 150} ${y}v${[26, 32, 30][i]}`}/>)}</g>
      <path d="M540 344h420l-200 156H120z" fill={u('beam')}/>
      <g fill={VI} opacity=".2">{[0, 1, 2].map(c => [0, 1].map(r => <path key={`${c}${r}`} d={`M${330 + c * 126 - r * 46} ${404 + r * 44}h110l-36 38h-112z`}/>))}</g>
      <path d="M548 336h404v12H548z" fill={HW}/>
      <g transform="rotate(-8 830 392)"><path d="M770 250h120v142H770z" fill={HR} stroke={HW} strokeWidth="5"/></g>
      <path d="M860 300h84v92h-84z" fill={u('pt')} opacity=".75" stroke={HW} strokeWidth="5"/>
      <path d="M48 392l10-58h84l10 58z" fill={HR} stroke={ref('edge')} strokeWidth="2"/>
      <g fill={GM}>{([[100, 280, 70, -30], [70, 300, 56, 30], [130, 300, 60, -60], [96, 250, 48, 10]] as const).map(([x, y, w, a]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx={w * .5} ry={w * .22} transform={`rotate(${a} ${x} ${y})`}/>)}</g>
      <path d="M100 334V270" stroke={GD} strokeWidth="4"/>
      <path d="M178 330h126v62H178z" fill={HR} stroke={HW} strokeWidth="3"/>
      {([[188, 40, CY], [218, 30, MG], [246, 46, VI], [274, 26, WL]] as const).map(([x, t, c]) => <g key={x}><rect x={x} y={330 - t} width="22" height={t} rx="4" fill={c} opacity=".8"/><rect x={x - 2} y={326 - t} width="26" height="6" rx="3" fill={HW}/></g>)}
      <path d="M196 292l-10-44M200 292l4-50M204 292l14-40" stroke={WL} strokeWidth="3" strokeLinecap="round" opacity=".8"/>
      <ellipse cx="360" cy="452" rx="120" ry="10" fill={SD} opacity=".55"/>
      <path d="M360 118L290 450M360 118L430 450M360 140V452" stroke={HW} strokeWidth="9" strokeLinecap="round"/>
      <path d="M262 318h196" stroke={HW} strokeWidth="9" strokeLinecap="round"/>
      <path d="M248 148h224v164H248z" fill={MS}/>
      <path d="M260 160h200v140H260z" fill={u('pt')}/>
      <circle cx="400" cy="212" r="24" fill={WL} opacity=".35"/><circle cx="400" cy="212" r="15" fill={WL}/>
      <path d="M260 300v-42q50-38 100-12t100-16v70z" fill={GM}/><path d="M260 300v-18q80-32 200-4v22z" fill={GD}/>
      <path d="M248 148h224v164H248z" fill="none" stroke={ref('edge')} strokeWidth="2.5"/>
      <path d="M506 372l-12 80M584 372l12 80M524 372l-4 80M566 372l4 80" stroke={HW} strokeWidth="6" strokeLinecap="round"/>
      <path d="M496 362h98v12h-98z" fill={HW}/>
      <ellipse cx="545" cy="356" rx="48" ry="11" fill={WL} opacity=".9"/>
      {[CY, MG, VI, BL].map((c, i) => <circle key={c} cx={516 + i * 18} cy={354 + (i % 2) * 3} r="5" fill={c}/>)}
      <path d="M470 0V72" stroke={HW} strokeWidth="2"/><ellipse cx="470" cy="84" rx="130" ry="120" fill={u('bulb')}/><circle cx="470" cy="82" r="9" fill={WL}/>
    </>; },
  track: ref => { const [id, u] = ids(ref, 'trk');
    return <>
      <defs>{lin(id('dawn'), [[0, CY, 0], [.7, CY, .12], [1, WL, .34]])}{lin(id('tr'), [[0, MG, .78], [1, VI, .6]])}{lin(id('hz'), [[0, SP, 0], [1, VI, .3]])}{rad(id('fl'), WL, .75)}</defs>
      <path d="M0 140h1000v170H0z" fill={u('dawn')}/>
      <ellipse cx="170" cy="250" rx="290" ry="230" fill={ref('sun')}/><circle cx="170" cy="262" r="30" fill={WL}/>
      <path d="M0 282q130-44 260-20t280-12t250-10t210 16V320H0z" fill={MF} opacity=".55"/>
      <path d="M0 230h1000v90H0z" fill={u('hz')}/>
      <ellipse cx="500" cy="640" rx="910" ry="404" fill={HR}/>
      <g fill="none" stroke={SD} strokeWidth="2" opacity=".6">{[0, 1, 2, 3].map(i => <ellipse key={i} cx="500" cy="640" rx={892 - i * 18} ry={392 - i * 13}/>)}</g>
      <g>{Array.from({length: 140}, (_, i) => { const x = h(i) * 1000, ry = 350 + h(i + 500) * 46, rx = ry * 2.25, d = (x - 500) / rx; return <circle key={i} cx={r1(x)} cy={r1(640 - ry * Math.sqrt(Math.max(0, 1 - d * d)))} r="1.7" fill={BOOK[i % 5]} opacity={r1(.25 + h(i + 9) * .45)}/>; })}</g>
      <ellipse cx="500" cy="640" rx="910" ry="404" fill="none" stroke={ref('edge')} strokeWidth="3" opacity=".8"/>
      {[92, 908].map(x => <g key={x}><path d={`M${x} 310V100`} stroke={HW} strokeWidth="5"/><path d={`M${x - 26} 84h52v20h-52z`} fill={WL}/><ellipse cx={x} cy="94" rx="110" ry="84" fill={u('fl')}/><path d={`M${x - 20} 104L${x - 130} 340h260L${x + 20} 104z`} fill={WL} opacity=".05"/></g>)}
      <ellipse cx="500" cy="640" rx="820" ry="340" fill={u('tr')}/>
      <g fill="none" stroke={MS} strokeWidth="1.6" opacity=".5">{Array.from({length: 6}, (_, i) => <ellipse key={i} cx="500" cy="640" rx={790 - i * 30} ry={328 - i * 12}/>)}</g>
      <ellipse cx="500" cy="640" rx="640" ry="268" fill={GD}/>
      <g fill="none" stroke={GM} strokeWidth="18" opacity=".14">{[0, 1, 2].map(i => <ellipse key={i} cx="500" cy="640" rx={590 - i * 70} ry={246 - i * 28}/>)}</g>
      <ellipse cx="500" cy="640" rx="640" ry="268" fill="none" stroke={TX} strokeWidth="3" opacity=".6"/>
      <g>{Array.from({length: 18}, (_, i) => <rect key={i} x={494 + (i % 2) * 7} y={300 + Math.floor(i / 2) * 8} width="7" height="8" fill={(i + Math.floor(i / 2)) % 2 ? SD : TX} opacity=".85"/>)}</g>
      <path d="M528 300V196" stroke={TX} strokeWidth="3"/><path d="M528 198l44 12-44 16z" fill={ref('edge')}/>
      <g stroke={TX} strokeWidth="2.5" opacity=".7" fill="none">{([[96, 430, 1], [196, 400, .8], [804, 400, .8], [904, 430, 1]] as const).map(([x, y, k]) => <path key={x} d={`M${x - 20 * k} ${y}v${-26 * k}M${x + 20 * k} ${y}v${-26 * k}M${x - 24 * k} ${y - 26 * k}h${48 * k}`}/>)}</g>
    </>; },
  path: ref => { const [id, u] = ids(ref, 'gp'), stones = Array.from({length: 9}, (_, i) => { const y = 348 + 152 * .8 ** i, k = (y - 340) / 160; return <ellipse key={i} cx={r1(505 + 95 * (500 - y) / 152 - 30 * k * (1 - k))} cy={r1(y)} rx={r1(44 * k)} ry={r1(13 * k)}/>; });
    return <>
      <defs>{lin(id('mist'), [[0, CY, 0], [1, CY, .16]])}{lin(id('pv'), [[0, MF, 1], [1, HW, 1]])}{rad(id('lt'), WL, .85)}</defs>
      <ellipse cx="820" cy="150" rx="200" ry="190" fill={ref('sun')} opacity=".75"/><circle cx="820" cy="150" r="26" fill={MS}/>
      <path d="M0 300q140-60 300-34t300-26t400 24V350H0z" fill={MF} opacity=".5"/>
      <path d="M0 250h1000v100H0z" fill={u('mist')}/>
      <path d="M0 332q200-40 420-12t580-14V362H0z" fill={GD}/>
      <g>{Array.from({length: 24}, (_, i) => { const x = r1(i * 44 + h(i) * 20), y = r1(322 + h(i + 5) * 14), r = r1(20 + h(i + 9) * 22); return <g key={i}><circle cx={x} cy={y} r={r} fill={GD}/><circle cx={r1(x + r * .25)} cy={r1(y - r * .25)} r={r1(r * .7)} fill={GM} opacity=".35"/></g>; })}</g>
      <path d="M0 290h1000v80H0z" fill={u('mist')}/>
      <path d="M0 500V348q500-34 1000 0v152z" fill={GD}/>
      <path d="M270 500C380 440 480 400 594 348h16C580 400 650 440 740 500z" fill={u('pv')}/>
      <path d="M610 348C580 400 650 440 740 500" fill="none" stroke={MS} strokeWidth="2" opacity=".35"/>
      <g fill={MS} opacity=".2">{stones}</g>
      {([[300, 486, 1], [446, 410, .6], [548, 370, .36], [716, 486, 1], [646, 410, .6], [618, 370, .36]] as const).map(([x, y, k]) => <g key={x}><ellipse cx={x} cy={y - 64 * k} rx={56 * k} ry={52 * k} fill={u('lt')}/><path d={`M${x} ${y}v${-56 * k}`} stroke={HR} strokeWidth={5 * k}/><rect x={x - 7 * k} y={y - 72 * k} width={14 * k} height={16 * k} rx={3 * k} fill={WL}/></g>)}
      {([[120, 1, 1], [900, -1, .85]] as const).map(([x, s, k]) => <g key={x} transform={`translate(${x} 470) scale(${k})`}><path d="M0 0V-170" stroke={HR} strokeWidth="16"/>{([[-46, -200, 66], [34, -232, 76], [62, -164, 58], [-34, -140, 56], [0, -270, 50]] as const).map(([cx, cy, r]) => <g key={cy}><circle cx={cx * s} cy={cy} r={r} fill={GD}/><path d={`M${cx * s + r * .3} ${cy - r * .95}a${r} ${r} 0 0 1 ${r * .66} ${r * .66}`} fill="none" stroke={GM} strokeWidth="5" opacity=".8"/></g>)}</g>)}
      <ellipse cx="40" cy="500" rx="180" ry="72" fill={SD}/><ellipse cx="970" cy="500" rx="170" ry="66" fill={SD}/>
      <g>{Array.from({length: 44}, (_, i) => { const l = i % 2, x = l ? h(i) * 210 : 790 + h(i) * 210; return <circle key={i} cx={r1(x)} cy={r1(440 + h(i + 3) * 60)} r={i % 3 ? 3 : 4.5} fill={[MG, WL, CY][i % 3]} opacity={r1(.5 + h(i + 7) * .45)}/>; })}</g>
      <g fill={WL}>{Array.from({length: 12}, (_, i) => <g key={i}><circle cx={r1(200 + h(i + 31) * 640)} cy={r1(250 + h(i + 77) * 150)} r="8" opacity=".14"/><circle cx={r1(200 + h(i + 31) * 640)} cy={r1(250 + h(i + 77) * 150)} r="2.2" opacity=".85"/></g>)}</g>
    </>; },
  telescope: ref => { const [id, u] = ids(ref, 'tel');
    return <>
      <defs>{rad(id('mw'), VI, .55)}{lin(id('tb'), [[0, MS, 1], [1, BL, 1]])}{lin(id('hz'), [[0, SP, 0], [1, VI, .3]])}{rad(id('lt'), WL, .85)}</defs>
      <g transform="rotate(-16 560 160)"><ellipse cx="560" cy="160" rx="640" ry="74" fill={u('mw')}/><ellipse cx="560" cy="160" rx="520" ry="24" fill={ref('light')} opacity=".6"/>{Array.from({length: 90}, (_, i) => <circle key={i} cx={r1(h(i) * 1200 - 40)} cy={r1(160 + (h(i + 400) - .5) * 130 * h(i + 800))} r={i % 11 ? .9 : 1.8} fill={TX} opacity={r1(.3 + h(i + 9) * .6)}/>)}</g>
      <g transform="rotate(-18 250 130)" fill="none" stroke={MS} strokeWidth="4"><path d="M164 130a86 16 0 0 1 172 0" opacity=".45"/></g>
      <circle cx="250" cy="130" r="40" fill={ref('planet')}/><circle cx="250" cy="130" r="40" fill="none" stroke={ref('edge')} strokeWidth="2" opacity=".7"/>
      <g transform="rotate(-18 250 130)" fill="none" stroke={MS} strokeWidth="4"><path d="M164 130a86 16 0 0 0 172 0" opacity=".8"/></g>
      <path d="M700 74l120-40" stroke={TX} strokeWidth="6" strokeLinecap="round" opacity=".1"/><path d="M730 64l90-30" stroke={TX} strokeWidth="2" strokeLinecap="round" opacity=".8"/>
      <path d="M0 330l80-34 70 18 110-56 120 52 100-36 140 46 120-64 130 54 130-20V380H0z" fill={MF} opacity=".5"/>
      <path d="M716 257a24 24 0 0 1 48 0z" fill={HW}/><path d="M738 235h5v22h-5z" fill={WL}/><ellipse cx="740" cy="250" rx="40" ry="30" fill={u('lt')} opacity=".6"/>
      <path d="M0 240h1000v140H0z" fill={u('hz')}/>
      <path d="M0 372q120-30 240-16t260-20t260 10t240-14V420H0z" fill={HR} opacity=".9"/>
      <path d="M0 330h1000v90H0z" fill={u('hz')} opacity=".7"/>
      <path d="M0 500V420q260-70 560-56t440 26V500z" fill={SD}/>
      <path d="M0 420q260-70 560-56t440 26" fill="none" stroke={ref('edge')} strokeWidth="2" opacity=".5"/>
      <ellipse cx="792" cy="364" rx="90" ry="60" fill={u('lt')}/><path d="M784 348h16v22h-16z" fill={WL}/><path d="M782 348h20l-4-6h-12z" fill={HW}/>
      <path d="M680 300L640 376M680 300L686 380M680 300L724 374" stroke={HW} strokeWidth="6" strokeLinecap="round"/>
      <path d="M726 318L546 247" stroke={u('tb')} strokeWidth="24"/>
      <path d="M722 309L548 240" stroke={TX} strokeWidth="3" opacity=".35"/>
      <path d="M560 252l-22-9" stroke={HW} strokeWidth="32"/>
      <path d="M690 290L624 264" stroke={HW} strokeWidth="7" strokeLinecap="round"/>
      <path d="M716 308l8-16" stroke={HW} strokeWidth="7" strokeLinecap="round"/>
      <circle cx="536" cy="242" r="22" fill={CY} opacity=".18"/><circle cx="536" cy="242" r="7" fill={CY}/>
    </>; },
  bicycle: ref => { const [id, u] = ids(ref, 'bike'), wheel = (x: number) => <g key={x}>
      <circle cx={x} cy="392" r="74" fill="none" stroke={SD} strokeWidth="12"/><circle cx={x} cy="392" r="70" fill="none" stroke={ref('edge')} strokeWidth="4"/>
      <g stroke={MS} strokeWidth="1.2" opacity=".55">{Array.from({length: 12}, (_, i) => <path key={i} d={`M${x} 392l${r1(66 * Math.cos(i * .5236))} ${r1(66 * Math.sin(i * .5236))}`}/>)}</g>
      <circle cx={x} cy="392" r="7" fill={MS}/><path d={`M${x - 66} 380a67 67 0 0 1 54-54`} fill="none" stroke={WL} strokeWidth="3" opacity=".7"/>
    </g>;
    return <>
      <defs>{lin(id('dusk'), [[0, MG, 0], [.7, MG, .2], [1, WL, .4]])}{lin(id('road'), [[0, HW, 1], [1, SD, 1]])}</defs>
      <path d="M0 120h1000v220H0z" fill={u('dusk')}/>
      <ellipse cx="260" cy="250" rx="290" ry="240" fill={ref('sun')}/><circle cx="260" cy="270" r="34" fill={WL}/>
      <path d="M0 276q130-40 260-14t300 4t240-30t200 22V340H0z" fill={MF} opacity=".4"/>
      <path d="M0 250h1000v90H0z" fill={u('dusk')} opacity=".7"/>
      <path d="M0 306q170-30 340 0t330-12t330 12V350H0z" fill={MF} opacity=".75"/>
      <g fill={HR}>{([[700, 286, 9, 34], [724, 292, 8, 28], [904, 292, 10, 38], [928, 300, 7, 24]] as const).map(([x, y, rx, ry]) => <ellipse key={x} cx={x} cy={y} rx={rx} ry={ry}/>)}</g>
      <path d="M0 446V330q500-30 1000 0v116z" fill={GD}/>
      <g stroke={GM} strokeWidth="2" opacity=".2">{Array.from({length: 17}, (_, i) => <path key={i} d={`M${260 + (i - 8) * 6} 334L${260 + (i - 8) * 150} 446`}/>)}</g>
      <g stroke={HR} strokeLinecap="round">{Array.from({length: 10}, (_, i) => { const k = .8 ** i; return <path key={i} d={`M${r1(260 + 720 * k)} ${r1(334 + 90 * k)}v${r1(-10 - 44 * k)}`} strokeWidth={r1(2 + 4 * k)}/>; })}</g>
      <path d={`M980 368${Array.from({length: 9}, (_, i) => { const k = .8 ** (i + 1); return `L${r1(260 + 720 * k)} ${r1(334 + 90 * k - 10 - 44 * k)}`; }).join('')}`} fill="none" stroke={HR} strokeWidth="2"/>
      <path d="M0 440h1000v60H0z" fill={u('road')}/><path d="M0 440h1000" stroke={WL} strokeWidth="2" opacity=".4"/>
      <g stroke={WL} strokeWidth="4" opacity=".45">{Array.from({length: 9}, (_, i) => <path key={i} d={`M${i * 120 - 20} 482h50`}/>)}</g>
      <ellipse cx="600" cy="468" rx="320" ry="10" fill={SD} opacity=".55"/>
      {wheel(330)}{wheel(650)}
      <path d="M480 370L330 382M480 414L330 402" stroke={MS} strokeWidth="2" opacity=".45"/>
      <circle cx="480" cy="392" r="22" fill="none" stroke={MS} strokeWidth="4"/>
      <path d="M330 392L444 256L480 392H330M444 256H568M480 392L576 282M570 248L650 392M444 256l-8-26" fill="none" stroke={MG} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M446 250H566M332 384L440 254" stroke={WL} strokeWidth="2" opacity=".5"/>
      <path d="M414 228q24-10 48-2l-4 8q-20-4-42 2z" fill={HR} stroke={ref('edge')} strokeWidth="2"/>
      <path d="M566 252l-4-22M546 230q26-8 38 6q6 12-6 20" fill="none" stroke={HR} strokeWidth="8" strokeLinecap="round"/>
      <path d="M592 236h66l-8 36h-52z" fill={WL} opacity=".35" stroke={WL} strokeWidth="3"/>
      {([[606, 228, MG], [624, 222, WL], [642, 228, CY], [616, 214, VI]] as const).map(([x, y, c]) => <circle key={`${x}${y}`} cx={x} cy={y} r="8" fill={c}/>)}
      <path d="M480 392l18 34M490 428h22" stroke={HR} strokeWidth="7" strokeLinecap="round"/>
      {birds(360, 170)}
    </>; },
  kitchen: ref => { const [id, u] = ids(ref, 'kit');
    return <>
      <defs>{lin(id('wall'), [[0, HR, .97], [1, SD, .97]])}{lin(id('cab'), [[0, HW, 1], [1, HR, 1]])}{lin(id('ul'), [[0, WL, .34], [1, WL, 0]])}{rad(id('lamp'), WL, .55)}{lin(id('ov'), [[0, WL, .9], [1, MG, .6]])}{lin(id('cone'), [[0, WL, .2], [1, WL, 0]])}</defs>
      <path d="M0 0h1000v500H0z" fill={u('wall')}/>
      <path d="M690 80h220v190H690z" fill={ref('sky')}/>
      <g fill={TX} opacity=".8">{Array.from({length: 8}, (_, i) => <circle key={i} cx={r1(700 + h(i + 11) * 200)} cy={r1(90 + h(i + 23) * 110)} r={i % 3 ? .9 : 1.6}/>)}</g>
      <ellipse cx="854" cy="122" rx="70" ry="64" fill={ref('sun')}/><circle cx="854" cy="122" r="14" fill={MS}/>
      <path d="M690 270v-40q60-30 110-10t110-16v66z" fill={MF} opacity=".75"/>
      <path d="M690 80h220v190H690z" fill="none" stroke={HW} strokeWidth="10"/><path d="M800 80v190M690 175h220" stroke={HW} strokeWidth="5"/>
      <path d="M676 270h248v12H676z" fill={HW}/>
      <path d="M712 270l4-22h28l4 22z" fill={MG} opacity=".8"/>{[-40, 0, 40].map(a => <ellipse key={a} cx="730" cy="236" rx="7" ry="18" fill={GM} transform={`rotate(${a} 730 250)`}/>)}
      <ellipse cx="800" cy="180" rx="230" ry="170" fill={ref('light')} opacity=".7"/>
      {[0, 1, 2, 3].map(i => <g key={i}><path d={`M${70 + i * 142} 64h132v140H${70 + i * 142}z`} fill={u('cab')} stroke={SD} strokeWidth="2"/><path d={`M${82 + i * 142} 76h108v116H${82 + i * 142}z`} fill="none" stroke={MS} strokeWidth="1.5" opacity=".14"/><rect x={i % 2 ? 76 + i * 142 + 10 : 70 + i * 142 + 112} y="170" width="5" height="22" rx="2" fill={WL} opacity=".7"/></g>)}
      <path d="M70 206h560v110H70z" fill={u('ul')}/>
      <g stroke={MS} strokeWidth="1" opacity=".08">{[232, 258, 284].map(y => <path key={y} d={`M0 ${y}h680`}/>)}{Array.from({length: 17}, (_, i) => <path key={i} d={`M${i * 40 + (i % 2) * 20} 206v110`}/>)}</g>
      <path d="M0 316h1000v18H0z" fill={MS} opacity=".85"/><path d="M0 334h1000v5H0z" fill={HW}/>
      <path d="M0 339h1000v100H0z" fill={u('cab')}/>
      <g stroke={SD} strokeWidth="2" opacity=".6">{Array.from({length: 7}, (_, i) => <path key={i} d={`M${130 + i * 130 + (i > 1 ? 70 : 0)} 339v100`}/>)}</g>
      <path d="M400 346h200v82H400z" fill={SD} stroke={ref('edge')} strokeWidth="2"/><rect x="420" y="360" width="160" height="52" rx="6" fill={u('ov')} opacity=".75"/>
      <ellipse cx="500" cy="386" rx="170" ry="60" fill={u('lamp')}/>
      <g fill="none" stroke={SD} strokeWidth="3" opacity=".5"><ellipse cx="450" cy="322" rx="34" ry="5"/><ellipse cx="552" cy="322" rx="34" ry="5"/></g>
      <path d="M424 318q-6-50 26-56q32 6 26 56z" fill={MG} opacity=".9"/><path d="M432 270q18-26 36 0" fill="none" stroke={HW} strokeWidth="5"/><path d="M474 292l22-14" stroke={MG} strokeWidth="7" strokeLinecap="round"/>
      <path d="M436 304q0-24 14-34" fill="none" stroke={MS} strokeWidth="3" opacity=".5"/>
      <g fill="none" stroke={MS} strokeWidth="3" opacity=".35" strokeLinecap="round"><path d="M498 270q-12-20 0-38t0-38"/><path d="M514 262q-10-16 0-30t0-30"/></g>
      {([[110, 40, CY], [146, 52, VI], [182, 34, WL]] as const).map(([x, t, c]) => <g key={x}><rect x={x} y={316 - t} width="28" height={t} rx="5" fill={c} opacity=".55"/><rect x={x - 2} y={312 - t} width="32" height="7" rx="3" fill={HW}/></g>)}
      <rect x="240" y="300" width="96" height="16" rx="6" fill={WL} opacity=".55"/>
      {[250, 560].map(x => <g key={x}><path d={`M${x} 0V100`} stroke={HW} strokeWidth="2"/><path d={`M${x - 120} 420L${x - 26} 128h52L${x + 120} 420z`} fill={u('cone')}/><ellipse cx={x} cy="150" rx="170" ry="140" fill={u('lamp')}/><path d={`M${x - 34} 130a34 32 0 0 1 68 0z`} fill={HW} stroke={ref('edge')} strokeWidth="2"/><ellipse cx={x} cy="131" rx="26" ry="5" fill={WL}/></g>)}
      <path d="M30 430h940v16H30z" fill={HW}/><path d="M30 430h940" stroke={WL} strokeWidth="2" opacity=".5"/>
      <path d="M46 446h908v60H46z" fill={SD}/>
      <g fill={WL} opacity=".45"><ellipse cx="250" cy="438" rx="70" ry="3"/><ellipse cx="560" cy="438" rx="70" ry="3"/></g>
      <path d="M660 430q50 32 100 0z" fill={MS} opacity=".85"/>
      {([[684, 420, 14, MG], [708, 414, 15, WL], [734, 421, 13, CY], [696, 404, 11, VI]] as const).map(([x, y, r, c]) => <circle key={x + y} cx={x} cy={y} r={r} fill={c}/>)}
    </>; },
  treasure: ref => { const [id, u] = ids(ref, 'tre');
    return <>
      <defs>{lin(id('ch'), [[0, HR, 1], [1, SD, 1]])}{lin(id('fl'), [[0, HR, 1], [1, SD, 1]])}{rad(id('gl'), WL, .9)}</defs>
      <ellipse cx="660" cy="150" rx="130" ry="120" fill={ref('sun')}/><circle cx="660" cy="150" r="18" fill={MS}/>
      <path d="M0 300h1000v140H0z" fill={ref('water')}/><path d="M0 300h1000" stroke={MS} strokeWidth="1.5" opacity=".5"/>
      <g stroke={MS} strokeWidth="2">{Array.from({length: 7}, (_, i) => <path key={i} d={`M${652 - i * 6} ${306 + i * 8}h${16 + i * 12}`} opacity={r1(.6 - i * .06)}/>)}</g>
      <path d="M300 300l12-40 22-8 12 48zM770 300l8-26 16-4 6 30z" fill={MF} opacity=".6"/>
      <path fillRule="evenodd" d="M0 0h1000v500H0zM140 420C120 300 200 140 360 92C520 44 700 76 810 170C900 250 890 360 870 420z" fill={SD}/>
      <path d="M140 420C120 300 200 140 360 92C520 44 700 76 810 170C900 250 890 360 870 420" fill="none" stroke={MF} strokeWidth="16" opacity=".3"/>
      <path d="M140 420C120 300 200 140 360 92C520 44 700 76 810 170C900 250 890 360 870 420" fill="none" stroke={ref('edge')} strokeWidth="2.5" opacity=".5"/>
      <g fill={SD}>{([[290, 108, 44], [340, 90, 60], [420, 66, 32], [590, 58, 50], [646, 66, 30], [722, 100, 40], [180, 200, 36]] as const).map(([x, y, l]) => <path key={x} d={`M${x} ${y}l10 ${l}l10-${l}z`}/>)}</g>
      <path d="M0 500V410q500-50 1000 0v90z" fill={u('fl')}/>
      <ellipse cx="500" cy="330" rx="330" ry="210" fill={ref('light')}/>
      <g fill={WL}>{Array.from({length: 9}, (_, i) => { const a = (i - 4) * .3, b = .045; return <path key={i} d={`M500 330L${r1(500 + 250 * Math.sin(a - b))} ${r1(330 - 250 * Math.cos(a - b))}L${r1(500 + 250 * Math.sin(a + b))} ${r1(330 - 250 * Math.cos(a + b))}z`} opacity={i % 2 ? .07 : .13}/>; })}</g>
      <ellipse cx="500" cy="300" rx="150" ry="90" fill={u('gl')}/>
      <path d="M402 338L422 246q78-30 156 0l20 92z" fill={u('ch')} stroke={WL} strokeWidth="3" opacity=".95"/>
      <path d="M416 330l14-70q70-22 140 0l14 70z" fill={WL} opacity=".22"/>
      <path d="M404 342q20-42 60-40q36-22 72 0q40-2 60 40z" fill={WL}/>
      <g fill={WL} stroke={HR} strokeWidth="1.5" strokeOpacity=".35">{Array.from({length: 12}, (_, i) => <circle key={i} cx={r1(430 + h(i + 2) * 140)} cy={r1(338 - h(i + 12) * 34)} r="6"/>)}</g>
      <path d="M600 338l34-14v84l-34 16z" fill={SD} stroke={WL} strokeWidth="2" opacity=".9"/>
      <path d="M400 338h200v86H400z" fill={u('ch')} stroke={ref('edge')} strokeWidth="2"/>
      <path d="M400 368h200M400 398h200" stroke={SD} strokeWidth="2" opacity=".6"/>
      <path d="M432 338v86M568 338v86" stroke={WL} strokeWidth="7" opacity=".85"/><path d="M396 338h208" stroke={WL} strokeWidth="8"/>
      <path d="M486 352h28v32h-28z" fill={WL}/><circle cx="500" cy="364" r="4" fill={SD}/><path d="M498 364h4v10h-4z" fill={SD}/>
      <ellipse cx="510" cy="438" rx="260" ry="26" fill={ref('light')} opacity=".8"/>
      <g fill={WL} opacity=".85">{Array.from({length: 14}, (_, i) => <ellipse key={i} cx={r1(350 + h(i + 41) * 330)} cy={r1(424 + h(i + 5) * 30)} rx="9" ry="3.5"/>)}</g>
      <g>{([[384, 430, MG], [628, 436, CY], [548, 450, MG], [470, 330, CY], [560, 324, MG]] as const).map(([x, y, c]) => <path key={x} d={`M${x} ${y - 11}l8 11-8 11-8-11z`} fill={c}/>)}</g>
      <g fill={TX}>{([[452, 296, 13], [566, 286, 10], [628, 352, 7], [376, 384, 8], [520, 238, 11], [668, 420, 6]] as const).map(([x, y, r]) => <path key={x} d={spark(x, y, r)}/>)}</g>
      <path d="M0 500V440q60-34 120-12q40-20 84 10l34 62zM1000 500V430q-70-28-130-4q-34-6-64 16l-22 58z" fill={SD}/>
    </>; },
};
export const EXTRA_SCENE_IDS = Object.keys(EXTRA_SCENES);

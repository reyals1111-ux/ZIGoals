import type {ReactNode} from 'react';
/**
 * Session AB-Design (owner request 17): ten more drawn scenes for the goal cards, in the five originals' style (the same
 * sky, stars, ambient light and palette variables; one SVG, viewBox 1000×500, sliced). `ref(name)` resolves the base
 * gradients of components/scene-art.tsx: sky, edge, light, planet, sun, ice, water.
 */
type Ref = (name: string) => string;
const win = (x: number, y: number, w: number, h: number, on = true) => <rect x={x} y={y} width={w} height={h} rx="2" fill={on ? 'var(--window-light)' : 'var(--space-deep)'} opacity={on ? .9 : .8}/>;
export const EXTRA_SCENES: Record<string, (ref: Ref) => ReactNode> = {
  skyline: ref => <>
    <ellipse cx="760" cy="150" rx="70" ry="70" fill={ref('sun')} opacity=".9"/>
    <path d="M0 500V300h60V250h40v50h30V180h50v120h40V220h40v-60h50v80h30V120h60v180h40V200h50v100h40V160h60v140h30V240h40v60h50V210h50v90h40V140h50v160h60v40H0z" fill="var(--mountain-far)" opacity=".55"/>
    <path d="M0 500V340h80V280h50v60h40V200h60v140h50V260h40v80h50V150h70v190h40V240h50v100h60V190h60v150h40V270h50v70h60V220h60v120h40V300h50v200H0z" fill="var(--space-deep)"/>
    <g>{Array.from({length: 90}, (_, i) => { const x = 90 + (i * 61) % 820, y = 240 + (i * 29) % 230; return <rect key={i} x={x} y={y} width="7" height="10" fill={i % 7 === 0 ? 'var(--brand-magenta)' : 'var(--window-light)'} opacity={.35 + (i % 4) * .15}/>; })}</g>
    <path d="M0 500V400h1000v100z" fill={ref('water')} opacity=".9"/>
    <g stroke="var(--brand-cyan)" opacity=".25">{Array.from({length: 9}, (_, i) => <path key={i} d={`M${120 + i * 100} ${410 + (i % 3) * 20}h${50 + (i % 4) * 20}`} strokeWidth="1.2"/>)}</g>
    <path d="M0 400h1000" stroke={ref('edge')} strokeWidth="2" opacity=".7"/>
  </>,
  sailboat: ref => <>
    <ellipse cx="700" cy="170" rx="90" ry="90" fill={ref('sun')} opacity=".8"/>
    <path d="M0 500V330Q250 300 500 330T1000 320V500z" fill={ref('water')}/>
    <path d="M0 330Q250 300 500 330T1000 320" fill="none" stroke="var(--mountain-snow)" strokeWidth="1.5" opacity=".6"/>
    <g stroke="var(--brand-cyan)" opacity=".3">{Array.from({length: 12}, (_, i) => <path key={i} d={`M${60 + i * 80} ${360 + (i % 4) * 25}q30 -6 60 0`} strokeWidth="2" fill="none"/>)}</g>
    <path d="M330 350L330 120L560 350z" fill="var(--mountain-snow)" opacity=".92"/>
    <path d="M318 350L318 160L160 350z" fill="var(--mountain-snow)" opacity=".75"/>
    <path d="M330 120v240" stroke="var(--text)" strokeWidth="4"/>
    <path d="M140 352h460l-40 42H180z" fill="var(--space-deep)" stroke={ref('edge')} strokeWidth="3"/>
    <path d="M330 120l36 -22" stroke="var(--brand-magenta)" strokeWidth="4" strokeLinecap="round"/>
    <path d="M340 365h250" stroke="var(--brand-violet)" strokeWidth="3" opacity=".5"/>
    <path d="M150 420q190 30 400 0t400 20" fill="none" stroke="var(--mountain-snow)" strokeWidth="2" opacity=".3"/>
  </>,
  library: ref => <>
    <path d="M0 0h1000v500H0z" fill="var(--space-deep)" opacity=".5"/>
    {[90, 400, 710].map(x => <g key={x}><rect x={x} y="70" width="200" height="360" rx="8" fill="var(--space-deep)" stroke={ref('edge')} strokeWidth="2.5"/>{[0, 1, 2, 3, 4].map(r => <g key={r}><path d={`M${x + 8} ${140 + r * 70}h184`} stroke="var(--brand-cyan)" strokeWidth="2" opacity=".5"/>{Array.from({length: 10}, (_, i) => <rect key={i} x={x + 12 + i * 18} y={140 + r * 70 - 34 - ((i * 7 + r * 3) % 18)} width="14" height={34 + ((i * 7 + r * 3) % 18)} rx="2" fill={['var(--brand-cyan)', 'var(--brand-violet)', 'var(--brand-magenta)', 'var(--window-light)', 'var(--brand-blue)'][(i + r) % 5]} opacity=".85"/>)}</g>)}</g>)}
    <path d="M0 500V430h1000v70z" fill="var(--house-wall)"/>
    <path d="M330 430V330h80v100z" fill="var(--space-deep)" stroke={ref('edge')} strokeWidth="2"/>
    <path d="M580 430V320" stroke={ref('edge')} strokeWidth="6" strokeLinecap="round"/><path d="M540 320h80l-14-40h-52z" fill="var(--window-light)"/>
    <ellipse cx="580" cy="330" rx="40" ry="14" fill="var(--window-light)" opacity=".35"/>
    <ellipse cx="500" cy="470" rx="220" ry="22" fill="var(--brand-violet)" opacity=".25"/>
  </>,
  studio: ref => <>
    <path d="M0 0h1000v500H0z" fill="var(--space-deep)" opacity=".45"/>
    <path d="M0 500V380h1000v120z" fill="var(--house-wall)"/>
    <path d="M700 80h180v200H700z" fill={ref('sky')} stroke={ref('edge')} strokeWidth="3"/><path d="M790 80v200M700 180h180" stroke={ref('edge')} strokeWidth="3"/>
    <path d="M420 380V200l-60 -40h200l-60 40v180" fill="none" stroke="var(--brand-violet)" strokeWidth="8" strokeLinecap="round"/>
    <path d="M330 170h260v150H330z" fill="var(--mountain-snow)" opacity=".95"/>
    <path d="M360 300c40 -80 80 -60 120 -20s60 -60 90 -30" fill="none" stroke={ref('edge')} strokeWidth="10" strokeLinecap="round"/>
    <circle cx="420" cy="230" r="22" fill="var(--brand-magenta)" opacity=".8"/>
    <g>{[140, 180, 220, 260].map((x, i) => <rect key={x} x={x} y={300 + i * 10} width="26" height={80 - i * 10} rx="4" fill={['var(--brand-cyan)', 'var(--brand-violet)', 'var(--brand-magenta)', 'var(--window-light)'][i]}/>)}</g>
    <ellipse cx="460" cy="420" rx="200" ry="20" fill="var(--brand-violet)" opacity=".2"/>
  </>,
  track: ref => <>
    <ellipse cx="760" cy="140" rx="80" ry="80" fill={ref('sun')} opacity=".8"/>
    <path d="M0 500V300q500 -120 1000 0v200z" fill="var(--garden-dark)"/>
    {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M-100 ${500 - i * 40}q600 -${160 - i * 20} 1200 0`} fill="none" stroke="var(--mountain-snow)" strokeWidth="2" opacity=".35"/>)}
    <path d="M-100 460q600 -140 1200 0" fill="none" stroke="var(--brand-magenta)" strokeWidth="60" opacity=".35"/>
    <path d="M-100 460q600 -140 1200 0" fill="none" stroke="var(--brand-violet)" strokeWidth="2" opacity=".7"/>
    <g fill="var(--text)">{Array.from({length: 12}, (_, i) => <rect key={i} x={120 + i * 70} y={315 + Math.sin(i / 2) * 6} width="28" height="8" rx="2" opacity=".6"/>)}</g>
    <path d="M520 300h8v-110h-8z" fill="var(--text)"/><path d="M528 192l54 14-54 16z" fill={ref('edge')}/>
    <g fill="var(--space-deep)" stroke={ref('edge')} strokeWidth="2">{[200, 300, 700, 800].map(x => <rect key={x} x={x} y="240" width="40" height="46" rx="6"/>)}</g>
  </>,
  path: ref => <>
    <ellipse cx="820" cy="150" rx="60" ry="60" fill={ref('sun')} opacity=".8"/>
    <path d="M0 500V320q500 -60 1000 0v180z" fill="var(--garden-dark)"/>
    <path d="M420 500q40 -120 180 -200" fill="none" stroke="var(--house-wall)" strokeWidth="110" strokeLinecap="round" opacity=".9"/>
    <path d="M420 500q40 -120 180 -200" fill="none" stroke="var(--mountain-snow)" strokeWidth="2" opacity=".3" strokeDasharray="6 16"/>
    {[[160, 340, 1.1], [300, 300, .8], [720, 330, 1], [880, 300, .7], [600, 260, .5]].map(([x, y, k], i) => <g key={i} transform={`translate(${x} ${y}) scale(${k})`}><path d="M0 0v-90" stroke="var(--garden-mid)" strokeWidth="8" strokeLinecap="round"/><ellipse cx="0" cy="-110" rx="46" ry="38" fill="var(--garden-mid)"/><ellipse cx="-20" cy="-125" rx="26" ry="22" fill="var(--brand-cyan)" opacity=".25"/></g>)}
    <g fill="var(--brand-magenta)" opacity=".85">{Array.from({length: 26}, (_, i) => <circle key={i} cx={(i * 97 + 40) % 1000} cy={340 + (i * 37) % 140} r={i % 3 ? 3 : 5}/>)}</g>
    <g fill="var(--window-light)" opacity=".7">{Array.from({length: 10}, (_, i) => <circle key={i} cx={(i * 193 + 80) % 1000} cy={300 + (i * 53) % 120} r="2.2"/>)}</g>
    <path d="M0 320q500 -60 1000 0" fill="none" stroke={ref('edge')} strokeWidth="2" opacity=".5"/>
  </>,
  telescope: ref => <>
    <ellipse cx="300" cy="120" rx="40" ry="40" fill={ref('sun')} opacity=".9"/>
    <g fill="none" stroke="var(--brand-violet)" opacity=".3"><ellipse cx="300" cy="120" rx="120" ry="34"/><ellipse cx="300" cy="120" rx="180" ry="52"/></g>
    <path d="M0 500V380q500 -60 1000 0v120z" fill="var(--space-deep)"/>
    <path d="M520 380V300l-60 80M520 300l60 80" stroke="var(--brand-blue)" strokeWidth="10" strokeLinecap="round"/>
    <path d="M520 300L720 150" stroke={ref('edge')} strokeWidth="34" strokeLinecap="round"/>
    <path d="M520 300L720 150" stroke="var(--mountain-snow)" strokeWidth="6" strokeLinecap="round" opacity=".35"/>
    <circle cx="726" cy="146" r="22" fill="var(--brand-cyan)" opacity=".9"/><circle cx="726" cy="146" r="40" fill="var(--brand-cyan)" opacity=".2"/>
    <path d="M520 300l18 24" stroke="var(--brand-magenta)" strokeWidth="8" strokeLinecap="round"/>
    <g fill="var(--text)" opacity=".8">{Array.from({length: 8}, (_, i) => <circle key={i} cx={(i * 131 + 60) % 1000} cy={(i * 71 + 30) % 260} r="2.4"/>)}</g>
    <path d="M0 380q500 -60 1000 0" fill="none" stroke={ref('edge')} strokeWidth="2" opacity=".5"/>
  </>,
  bicycle: ref => <>
    <ellipse cx="780" cy="160" rx="70" ry="70" fill={ref('sun')} opacity=".8"/>
    <path d="M0 500V360q500 -80 1000 0v140z" fill="var(--garden-dark)"/>
    <path d="M0 400q500 -60 1000 0" fill="none" stroke="var(--house-wall)" strokeWidth="70" opacity=".9"/>
    <g fill="none" stroke={ref('edge')} strokeWidth="8"><circle cx="330" cy="380" r="78"/><circle cx="650" cy="380" r="78"/></g>
    <g fill="none" stroke="var(--mountain-snow)" strokeWidth="2" opacity=".5">{[0, 45, 90, 135].map(a => <g key={a}><path d="M252 380h156" transform={`rotate(${a} 330 380)`}/><path d="M572 380h156" transform={`rotate(${a} 650 380)`}/></g>)}</g>
    <path d="M330 380L440 240L560 240L650 380M440 240L480 380L560 240M480 380L330 380M520 230L580 230M440 240L420 212" fill="none" stroke="var(--brand-magenta)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M400 206h40" stroke="var(--brand-cyan)" strokeWidth="10" strokeLinecap="round"/>
    <circle cx="480" cy="380" r="14" fill="var(--space-deep)" stroke="var(--brand-cyan)" strokeWidth="4"/>
  </>,
  kitchen: ref => <>
    <path d="M0 0h1000v500H0z" fill="var(--space-deep)" opacity=".5"/>
    <path d="M0 500V320h1000v180z" fill="var(--house-wall)"/>
    <path d="M60 320V120h880v200" fill="none" stroke={ref('edge')} strokeWidth="3" opacity=".6"/>
    <g>{[120, 300, 480, 660, 840].map(x => <rect key={x} x={x} y="140" width="120" height="100" rx="8" fill="var(--space-deep)" stroke="var(--brand-violet)" strokeWidth="2"/>)}</g>
    <path d="M0 320h1000v26H0z" fill="var(--mountain-snow)" opacity=".85"/>
    <path d="M400 346h200v154H400z" fill="var(--space-deep)" stroke={ref('edge')} strokeWidth="3"/>
    <g fill="var(--brand-cyan)" opacity=".9">{[0, 1, 2, 3].map(i => <circle key={i} cx={430 + (i % 2) * 140} cy={380 + Math.floor(i / 2) * 60} r="12"/>)}</g>
    <rect x="130" y="270" width="110" height="50" rx="8" fill="var(--brand-magenta)" opacity=".8"/><rect x="150" y="250" width="70" height="20" rx="6" fill="var(--brand-violet)"/>
    <path d="M720 260c0 -40 60 -40 60 0v60h-60z" fill="var(--window-light)" opacity=".9"/>
    <g stroke="var(--window-light)" strokeWidth="3" opacity=".6"><path d="M740 240q-10 -20 0 -40"/><path d="M760 236q-10 -20 0 -40"/></g>
  </>,
  treasure: ref => <>
    <ellipse cx="500" cy="260" rx="260" ry="160" fill={ref('light')} opacity=".9"/>
    <path d="M0 500V380q500 -60 1000 0v120z" fill="var(--space-deep)"/>
    <path d="M330 420V300h340v120z" fill="var(--house-roof)" stroke={ref('edge')} strokeWidth="3"/>
    <path d="M330 300q170 -110 340 0z" fill="var(--house-roof)" stroke={ref('edge')} strokeWidth="3"/>
    <path d="M330 300h340M500 300v120" stroke="var(--brand-cyan)" strokeWidth="6" opacity=".7"/>
    <rect x="474" y="286" width="52" height="40" rx="8" fill="var(--window-light)"/>
    <g fill="var(--window-light)">{Array.from({length: 18}, (_, i) => <circle key={i} cx={360 + (i * 37) % 280} cy={290 - (i * 13) % 40} r={6 + (i % 3) * 2} opacity=".95"/>)}</g>
    <g fill="var(--brand-magenta)" opacity=".9">{[[400, 250], [560, 240], [620, 270]].map(([x, y], i) => <path key={i} d={`M${x} ${y}l10 -14 10 14 -10 14z`}/>)}</g>
    <g stroke="var(--window-light)" strokeWidth="3" opacity=".5">{[0, 30, 60, 90, 120, 150].map(a => <path key={a} d="M500 260v-170" transform={`rotate(${a - 75} 500 260)`}/>)}</g>
  </>,
};
export const EXTRA_SCENE_IDS = Object.keys(EXTRA_SCENES);

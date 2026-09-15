import { useId } from "react";
type Scene = "horizon" | "mountains" | "home" | "garden" | "aurora";
/** Original, lightweight vector scenery. Decorative and independent of financial state. */
export function SceneArt({ scene = "horizon", className = "" }: { scene?: Scene; className?: string }) {
  const id = useId();
  const ref = (name: string) => `url(#${id}-${name})`;
  return <svg className={`scene-art scene-${scene} ${className}`} viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-sky`} x2="1" y2="1"><stop stopColor="var(--space-deep)"/><stop offset=".55" stopColor="var(--space-blue)"/><stop offset="1" stopColor="var(--space-purple)"/></linearGradient>
      <linearGradient id={`${id}-edge`} x2="1" y2=".3"><stop stopColor="var(--brand-cyan)"/><stop offset=".42" stopColor="var(--brand-blue)"/><stop offset=".72" stopColor="var(--brand-violet)"/><stop offset="1" stopColor="var(--brand-magenta)"/></linearGradient>
      <radialGradient id={`${id}-light`}><stop stopColor="var(--brand-magenta)" stopOpacity=".8"/><stop offset=".25" stopColor="var(--brand-violet)" stopOpacity=".35"/><stop offset="1" stopColor="var(--brand-blue)" stopOpacity="0"/></radialGradient>
      <radialGradient id={`${id}-planet`} cx=".8" cy=".2" r=".85"><stop stopColor="var(--planet-edge)"/><stop offset=".22" stopColor="var(--space-blue)"/><stop offset=".68" stopColor="var(--space-deep)"/><stop offset="1" stopColor="var(--surface-0)"/></radialGradient>
      <radialGradient id={`${id}-sun`}><stop stopColor="var(--text)"/><stop offset=".035" stopColor="var(--window-light)"/><stop offset=".09" stopColor="var(--brand-magenta)" stopOpacity=".85"/><stop offset=".28" stopColor="var(--brand-violet)" stopOpacity=".3"/><stop offset="1" stopColor="var(--brand-magenta)" stopOpacity="0"/></radialGradient>
      <linearGradient id={`${id}-ice`} x2=".5" y2="1"><stop stopColor="var(--mountain-snow)"/><stop offset="1" stopColor="var(--space-blue)"/></linearGradient>
      <linearGradient id={`${id}-water`} x2=".3" y2="1"><stop stopColor="var(--brand-violet)" stopOpacity=".5"/><stop offset=".4" stopColor="var(--space-blue)"/><stop offset="1" stopColor="var(--space-deep)"/></linearGradient>
      <clipPath id={`${id}-globe`}><path d="M-100 100C250-65 710 87 1040 495L-100 570Z"/></clipPath>
    </defs>
    <path fill={ref("sky")} d="M0 0h1000v500H0z"/>
    <g fill="var(--star)" opacity=".6">{Array.from({length: 78}, (_, i) => <circle key={i} cx={(i * 137 + 31) % 1000} cy={(i * 73 + 17) % 480} r={i % 9 === 0 ? 1.6 : .7}/>)}</g>
    <ellipse className="ambient-light" cx="815" cy="188" rx="350" ry="290" fill={ref("light")}/>
    {scene === "horizon" ? <>
      <g fill="none" stroke={ref("edge")} opacity=".12">{Array.from({length: 9}, (_, i) => <path key={i} d={`M${610+i*19} -30Q${1010-i*12} ${95+i*6} ${825+i*12} 254T1080 ${415+i*12}`} strokeWidth={i % 3 === 0 ? 14 : 2}/>)}</g>
      <path d="M-100 100C250-65 710 87 1040 495L-100 570Z" fill={ref("planet")}/>
      <g clipPath={ref("globe")}>
        <g fill="var(--planet-land)" stroke="var(--planet-coast)" strokeWidth=".7" opacity=".7">
          <path d="M370 121l29-31 44 9 26 19 32-4 23 24 43 8 14 22-21 13 12 24-24 16 6 24-36 1-18 24-14-21-36-10-14-24-22 5-2-27-31-19z"/>
          <path d="M562 195l40-24 52 15 16 23 35 8 25 32-23 22-14 45-31 34-7 49-31-8-23-42-25-20-5-43-29-19z"/>
          <path d="M736 292l33-20 40 17 16 24 54 20 16 28-7 33-27 2-24-39-31-11-27 12-31-34zM699 159l30 5 19 24-23 8-26-10z"/>
        </g>
        <g fill="var(--city-light)">{Array.from({length: 125}, (_, i) => { const x=365+(i*71)%480, y=145+(i*37)%275; return <circle key={i} cx={x} cy={y} r={i%13===0?1.7:.65} opacity={.25+(i%4)*.15}/>; })}</g>
        <g fill="none" stroke="var(--mountain-snow)" opacity=".1" strokeLinecap="round"><path d="M390 129q190 10 315 145t220 100" strokeWidth="11"/><path d="M497 209q50 13 67 50t84 56" strokeWidth="6"/><path d="M208 340q123-13 229 44t218 6" strokeWidth="4"/></g>
      </g>
      <path d="M-100 100C250-65 710 87 1040 495" fill="none" stroke={ref("edge")} strokeWidth="32" opacity=".12"/>
      <path d="M-100 100C250-65 710 87 1040 495" fill="none" stroke={ref("edge")} strokeWidth="12" opacity=".24"/>
      <path d="M-100 100C250-65 710 87 1040 495" fill="none" stroke={ref("edge")} strokeWidth="2.5"/>
      <g fill="none" stroke="var(--brand-blue)" opacity=".13">
        <path d="M220 88l110 10 25 38 88 2 64 45 89 15 45 59 100 46 65 70"/>
        <path d="M270 133l-23 41 92 8 10 41 95 11 34 59 145 24 12 47 100 34"/>
        <path d="M468 144l11 31 51 4 62 76 71 8 33 78 119 65"/>
        <ellipse cx="308" cy="438" rx="660" ry="250" transform="rotate(20 308 438)"/>
        <ellipse cx="308" cy="438" rx="550" ry="215" transform="rotate(20 308 438)"/>
      </g>
      <ellipse cx="828" cy="281" rx="200" ry="160" fill={ref("sun")}/>
      <path d="M747 281h166M828 240v82" stroke="var(--star)" opacity=".55" strokeWidth=".7"/>
      <path d="M0 476Q500 349 1000 424" fill="none" stroke={ref("edge")} strokeWidth="2" opacity=".65"/>
      <path d="M0 487Q550 370 1000 440" fill="none" stroke="var(--brand-violet)" strokeWidth="9" opacity=".08"/>
    </> : scene === "mountains" ? <>
      <ellipse cx="742" cy="224" rx="310" ry="205" fill={ref("sun")} opacity=".6"/>
      <path d="M0 374L118 286l84 46 172-208 180 207 83-45 157-164 206 194v184H0Z" fill="var(--mountain-far)" opacity=".45"/>
      <path d="M0 440L194 194l73 107L467 99l204 246 120-167 209 217v105H0Z" fill={ref("ice")}/>
      <path d="M194 194l-4 145 77-38zM467 99l-6 179 75 50 135 17zM791 178l-27 148 162 45z" fill="var(--space-blue)"/>
      <g fill="none" stroke="var(--mountain-snow)" opacity=".25"><path d="M467 122l-48 153-62 58m110-211 25 168 84 38m-382-119-25 117-82 74m704-202-71 124-48 49"/><path d="M458 157l-20 97 19 32-47 28m365-93-3 56-43 25"/></g>
      <path d="M194 194l-40 100 40-20 25 29 14-29zM467 99l-79 156 76-45 41 35 32-61zM791 178l-37 105 30-31 47 16z" fill="var(--mountain-snow)" opacity=".8"/>
      <path d="M0 470l225-141 160 97 201-139 217 156 197-42v99H0Z" fill="var(--space-deep)"/>
      <path d="M292 500l257-116 183 116" fill={ref("water")}/>
      <g stroke="var(--brand-cyan)" opacity=".2">{Array.from({length:8}, (_, i) => <path key={i} d={`M${526-i*17} ${405+i*12}h${30+i*26}`} strokeWidth=".7"/>)}</g>
    </> : scene === "home" ? <>
      <path d="M0 450Q200 330 480 411T1000 362V500H0Z" fill="var(--garden-dark)"/>
      <path d="M251 259h463v225H251Z" fill="var(--house-wall)"/>
      <path d="M208 266l265-183 291 183z" fill="var(--house-roof)"/>
      <path d="M240 262L473 108 727 262" fill="none" stroke="var(--mountain-snow)" strokeWidth="5" opacity=".5"/>
      <path d="M428 346h94v138h-94zM289 297h77v82h-77zM591 297h78v82h-78z" fill="var(--window-light)"/>
      <path d="M328 297v82M630 297v82M289 337h77M591 337h78" stroke="var(--house-roof)" strokeWidth="7"/>
      <path d="M105 482V322m0 15-39 60m39-51 35 49M876 482V299m0 46-40 59m40-80 38 49" stroke="var(--garden-mid)" strokeWidth="20" strokeLinecap="round"/>
    </> : scene === "garden" ? <>
      <path d="M0 427H1000V500H0Z" fill="var(--house-wall)"/>
      <path d="M296 406l22 90h109l23-90zM574 360l27 136h151l31-136z" fill="var(--mountain-far)"/>
      <path d="M374 415V255M680 370V170" fill="none" stroke="var(--garden-mid)" strokeWidth="9"/>
      <g fill="var(--garden-mid)"><ellipse cx="337" cy="290" rx="68" ry="25" transform="rotate(28 337 290)"/><ellipse cx="407" cy="329" rx="67" ry="23" transform="rotate(-31 407 329)"/><ellipse cx="622" cy="213" rx="100" ry="32" transform="rotate(29 622 213)"/><ellipse cx="725" cy="261" rx="94" ry="28" transform="rotate(-37 725 261)"/></g>
    </> : <g fill="none" stroke={ref("edge")}>
      <path d="M-20 392Q190 54 410 252T1030 131" strokeWidth="70" opacity=".06"/>
      <path d="M-20 392Q190 54 410 252T1030 131" strokeWidth="2" opacity=".7"/>
      <path d="M-20 412Q220 101 433 282T1030 164" strokeWidth="1" opacity=".4"/>
    </g>}
  </svg>;
}

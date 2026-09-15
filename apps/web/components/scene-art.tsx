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
      <radialGradient id={`${id}-planet`} cx=".7" cy=".02" r="1"><stop stopColor="var(--planet-edge)"/><stop offset=".13" stopColor="var(--space-blue)"/><stop offset=".4" stopColor="var(--space-deep)"/><stop offset="1" stopColor="var(--surface-0)"/></radialGradient>
    </defs>
    <path fill={ref("sky")} d="M0 0h1000v500H0z"/>
    <g fill="var(--star)" opacity=".6">{Array.from({length: 44}, (_, i) => <circle key={i} cx={(i * 137 + 31) % 1000} cy={(i * 73 + 17) % 480} r={i % 9 === 0 ? 1.6 : .7}/>)}</g>
    <ellipse className="ambient-light" cx="815" cy="188" rx="350" ry="290" fill={ref("light")}/>
    {scene === "horizon" ? <>
      <path d="M-100 100C250-65 710 87 1040 495L-100 570Z" fill={ref("planet")}/>
      <path d="M-100 100C250-65 710 87 1040 495" fill="none" stroke={ref("edge")} strokeWidth="22" opacity=".06"/>
      <path d="M-100 100C250-65 710 87 1040 495" fill="none" stroke={ref("edge")} strokeWidth="9" opacity=".19"/>
      <path d="M-100 100C250-65 710 87 1040 495" fill="none" stroke={ref("edge")} strokeWidth="2.5"/>
      <g fill="none" stroke="var(--brand-blue)" opacity=".13">
        <path d="M220 88l110 10 25 38 88 2 64 45 89 15 45 59 100 46 65 70"/>
        <path d="M270 133l-23 41 92 8 10 41 95 11 34 59 145 24 12 47 100 34"/>
        <path d="M468 144l11 31 51 4 62 76 71 8 33 78 119 65"/>
        <ellipse cx="308" cy="438" rx="660" ry="250" transform="rotate(20 308 438)"/>
        <ellipse cx="308" cy="438" rx="550" ry="215" transform="rotate(20 308 438)"/>
      </g>
      <path d="M0 476Q500 349 1000 424" fill="none" stroke={ref("edge")} strokeWidth="2" opacity=".65"/>
      <path d="M0 487Q550 370 1000 440" fill="none" stroke="var(--brand-violet)" strokeWidth="9" opacity=".08"/>
    </> : scene === "mountains" ? <>
      <path d="M0 440L194 194l73 107L467 99l204 246 120-167 209 217v105H0Z" fill="var(--mountain-far)"/>
      <path d="M194 194l-40 100 40-20 25 29 14-29zM467 99l-79 156 76-45 41 35 32-61zM791 178l-37 105 30-31 47 16z" fill="var(--mountain-snow)" opacity=".8"/>
      <path d="M0 470l225-141 160 97 201-139 217 156 197-42v99H0Z" fill="var(--space-deep)"/>
      <path d="M316 500l229-102 140 102" fill={ref("edge")} opacity=".19"/>
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

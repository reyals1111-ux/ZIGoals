'use client';
import {useEffect, useId, useRef, type CSSProperties, type ReactNode} from 'react';
import {linePath, polar, smoothPath} from '../../../lib/nova/holo/geometry';
import {condition, MET_CREDIT, MET_LICENCE_URL, MET_SITE_URL, type Condition} from '../../../lib/nova/world/met';
import type {WorldReading} from '../../../lib/nova/world/record';
import {clockTime, degrees, umbrella} from '../../../lib/nova/world/words';
import {formatWeekday} from '../../../lib/visual-format';
import {CardFoot, CardNotice, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable, HoloUnread, Orn} from '../holo/parts';
import {useWeather} from './use-weather';
import '../cards/world-cards.css';

/**
 * Session AM (ADR-038 D12–D15, A2; art direction §4): the weather widget — the owner's example of a themed widget. Its
 * look IS the weather, drawn with the same strokes as everything else (no photographs, no emoji): a sun with ray ticks, a
 * crescent with rim light at night, glass cloud outlines, slanted rain, slow snow, fog bands, and one bolt for thunder
 * that brightens once when the widget is made. The frame's rim takes the sky's colour.
 *
 * Off until the person turns on "Weather (outside data)" in NOVA → Permissions: until then it says what it would show,
 * which service it would ask and what that service receives, and shows no number. On, it shows the reading this device
 * holds, credits "Data from MET Norway" with a link to the CC BY 4.0 licence, and names the place and the time of the
 * reading. In the Showcase it shows example values, labelled as an example and credited to nobody.
 */
const PERMISSIONS = '/app/nova#nova-permissions';
const CLOUD = 'M14 34a9 9 0 0 1 2-17.8A12 12 0 0 1 39 14a10 10 0 0 1 9 20Z', CLOUD_SHINE = 'M11.2 22.5a7.4 7.4 0 0 1 4.6-4.4M19.6 12.6a10.4 10.4 0 0 1 9.4-5.2';
const SPARK = 'M0 -2.6.7 -.7 2.6 0 .7 .7 0 2.6 -.7 .7 -2.6 0 -.7 -.7Z', flake = (x: number, y: number) => `M${x - 2.2} ${y}h4.4M${x} ${y - 2.2}v4.4M${x - 1.5} ${y - 1.5}l3 3M${x + 1.5} ${y - 1.5}l-3 3`;
const raysOf = (r: number) => Array.from({length: 16}, (_, i) => { const a = polar(0, 0, r * 1.62, i * 22.5), b = polar(0, 0, r * (i % 2 ? 1.98 : 2.42), i * 22.5); return `M${a.x} ${a.y}L${b.x} ${b.y}`; }).join('');
/**
 * The scene for a condition: decoration only (the condition is also said in words beside it). AM-2: the sky itself, as
 * light — a sun with a white-hot core, a ring and ray ticks; a rim-lit crescent with sparks; clouds of glass (a tinted
 * fill, a bright rim, a highlight); slanted rain, flakes, fog bands, one bolt. `live` (the scene of now): the rays are
 * their own layer that turns slowly (an ornament: `holo-spin`); the small scenes of the hours and days are still.
 */
export function WeatherScene({sky, size = 96, live = false}: {sky: Condition; size?: number; live?: boolean}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), {kind, night} = sky, wet = kind === 'rain' || kind === 'drizzle' || kind === 'thunder' || kind === 'sleet';
  const orb = kind === 'clear' || kind === 'partly', cloudy = kind === 'cloud' || wet || kind === 'snow', sun = kind === 'partly' ? {x: 24, y: 23, r: 7.4} : {x: 32, y: 31, r: 9.6}, reach = sun.r * 2.5, turning = live && orb && !night;
  // A cloud's bloom is a wide dim stroke under its rim, never a filter: the cloud drifts, and a drifting layer stays cheap (B2).
  const cloud = (shine = true) => <><path className="nw-cloud-glow" d={CLOUD}/><path className="nw-cloud" fill={`url(#${id}c)`} d={CLOUD}/>{shine && <path className="nw-cloud-shine" d={CLOUD_SHINE}/>}</>;
  const front: ReactNode = <>
    {kind === 'partly' && <g transform="translate(9 17) scale(.86)"><g className="nw-cloud-drift">{cloud()}</g></g>}
    {cloudy && <><g transform="translate(15 1) scale(.74)"><g className="nw-cloud-back">{cloud(false)}</g></g><g transform="translate(2 6)"><g className="nw-cloud-drift">{cloud()}</g></g></>}
    {kind === 'fog' && <g className="nw-fog">{['M8 22h44', 'M14 31h42', 'M6 40h40', 'M16 49h38'].map(d => <path key={d} d={d}/>)}</g>}
    {wet && <g className="nw-rain" data-light={kind === 'drizzle' || undefined}>{[18, 27, 36, 45].map(x => <path key={x} d={`M${x} 45.5l-3.6 9.5`}/>)}{[23, 32, 41].map(x => <path key={x} d={`M${x} 49l-2.4 6.4`}/>)}</g>}
    {(kind === 'snow' || kind === 'sleet') && <g className="nw-snow">{[[19, 49], [32, 55], [45, 49], [25.5, 59.5], [39, 60]].map(([x, y]) => <path key={`${x}`} d={flake(x!, y!)}/>)}</g>}
    {kind === 'thunder' && <path className="nw-bolt" fill={`url(#${id}b)`} d="M35 37l-9 13h7.4l-3.2 10.5L41 46h-7.6z"/>}
  </>;
  return <span className="nw-scene" data-kind={kind} data-night={night || undefined} data-live={live || undefined} style={{'--nw-s': `${size}px`} as CSSProperties} aria-hidden="true">
    <svg viewBox="0 0 64 64" focusable="false">
      <defs>
        <radialGradient id={`${id}s`}><stop offset="0" className="nw-stop-hot"/><stop offset=".5" className="nw-stop-sun"/><stop offset="1" className="nw-stop-sun-edge"/></radialGradient>
        <radialGradient id={`${id}h`}><stop offset="0" className="nw-stop-halo"/><stop offset="1" className="nw-stop-none"/></radialGradient>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="nw-stop-glass-a"/><stop offset="1" className="nw-stop-glass-b"/></linearGradient>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" className="nw-stop-moon-a"/><stop offset="1" className="nw-stop-moon-b"/></linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="nw-stop-hot"/><stop offset="1" className="nw-stop-bolt"/></linearGradient>
      </defs>
      {orb && (night ? <g className="nw-moon">
        <circle className="nw-orb-halo" cx="36" cy="28" r="24" fill={`url(#${id}h)`}/>
        <path className="nw-moon-body" fill={`url(#${id}m)`} d="M40 13a15.5 15.5 0 1 0 12.4 25A12.4 12.4 0 0 1 40 13Z"/>
        {[[14, 15, 1], [24, 8, .7], [55, 11, .85]].map(([x, y, k]) => <path key={`${x}`} className="nw-star" transform={`translate(${x} ${y}) scale(${k})`} d={SPARK}/>)}
      </g> : <g className="nw-sun">
        <circle className="nw-orb-halo" cx={sun.x} cy={sun.y} r={sun.r * 2.9} fill={`url(#${id}h)`}/>
        <circle className="nw-sun-ring" cx={sun.x} cy={sun.y} r={sun.r * 1.34}/>
        <circle className="nw-sun-core" cx={sun.x} cy={sun.y} r={sun.r} fill={`url(#${id}s)`}/>
        {!turning && <path className="nw-rays" transform={`translate(${sun.x} ${sun.y})`} d={raysOf(sun.r)}/>}
      </g>)}
      {!turning && front}
    </svg>
    {turning && <>
      <span className="nw-rays-box" style={{left: `${(sun.x - reach) / .64}%`, top: `${(sun.y - reach) / .64}%`, width: `${reach * 2 / .64}%`, height: `${reach * 2 / .64}%`}}><Orn view={`${-reach} ${-reach} ${reach * 2} ${reach * 2}`}><path className="nw-rays" d={raysOf(sun.r)}/></Orn></span>
      {kind === 'partly' && <svg viewBox="0 0 64 64" focusable="false">{front}</svg>}
    </>}
  </span>;
}
/** The frame takes the sky's colour: the widget's own panel gets `data-sky` (and `data-night`) while this body is on it. */
function useSkyOnFrame(sky: Condition | null) {
  const ref = useRef<HTMLDivElement>(null), key = sky ? `${sky.kind}${sky.night ? ' night' : ''}` : '';
  useEffect(() => {
    const panel = ref.current?.closest<HTMLElement>('.nova-widget');
    if (!panel || !key) return;
    const [kind, night] = key.split(' ');
    panel.dataset.sky = kind!; if (night) panel.dataset.night = ''; else delete panel.dataset.night;
    return () => { delete panel.dataset.sky; delete panel.dataset.night; };
  }, [key]);
  return ref;
}
export function WeatherOff({what}: {what: string}) {
  return <CardNotice kind="off" ghost="sky" title="Weather is off" href={PERMISSIONS} action="Turn it on in Permissions">
    {what} Turn it on and this device asks MET Norway, which then sees your network address and your place, rounded to about 1 km. Nothing is asked until then.
  </CardNotice>;
}
/** The foot. Design review AM-D32: the Showcase's is one line; AM-D38: the service's credit and licence stay whole (they may wrap). */
export function Credit({reading, place, example}: {reading: WorldReading; place: string; example: boolean}) {
  if (example) return <CardFoot source="Showcase example · not a real reading"/>;
  return <CardFoot source={place} asOf={`read ${clockTime(reading.now.at)}`} wrap>
    <span className="nw-credit"> · <a href={MET_SITE_URL} target="_blank" rel="noreferrer noopener">{MET_CREDIT}</a> (<a href={MET_LICENCE_URL} target="_blank" rel="noreferrer noopener">CC BY 4.0</a>)</span>
  </CardFoot>;
}
export default function WeatherWidget({size = 'M'}: Partial<CardProps>) {
  const w = useWeather(), sky = w.kind === 'live' ? condition(w.reading.now.symbol) : null, frame = useSkyOnFrame(sky), uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (w.kind === 'reading-record') return <HoloReading/>;
  if (w.kind === 'unreadable') return <HoloUnread what="Your weather choice"/>;
  if (w.kind === 'off') return <WeatherOff what="The weather where you are."/>;
  if (w.kind === 'no-place') return <CardNotice kind="empty" ghost="sky" title="Choose your place" href={PERMISSIONS} action="Choose a place">Weather is on. Pick a city from the list, or type a position, and the weather for it shows here.</CardNotice>;
  if (w.kind === 'asking') return <div ref={frame} className="nc-body"><p className="nova-reading" role="status">Asking MET Norway for {w.place.name}…</p></div>;
  if (w.kind === 'failed') return <div ref={frame} className="nc-body"><CardNotice kind="empty" ghost="sky" title="No reading yet">{w.words} NOVA asks again in ten minutes, never more often.</CardNotice></div>;
  // Design review AM-D19 (L): precipitation as bars on one scale with one label, on the peak; each day states its lowest
  // AND its highest; wind, humidity and UV on one line; the source line is the body's last line, always in view.
  // AM-2: the hours are one outlook — up to 24 hours as a temperature line over the precipitation bars, with six (L:
  // eight) of its hours named under it at even steps (every hour of a short reading, every third or fourth of a long
  // one); the days are capsules from lowest to highest on their shared scale.
  const {reading, place} = w, now = reading.now, brolly = umbrella(reading), days = reading.days.slice(0, 5);
  const count = size === 'L' ? 8 : 6, step = Math.max(1, Math.min(4, Math.floor((reading.hours.length - 1) / (count - 1)) || 1));
  const hours = Array.from({length: count}, (_, i) => reading.hours[i * step]).filter((h): h is WorldReading['hours'][number] => !!h), all = reading.hours.slice(0, (hours.length - 1) * step + 1), n = hours.length;
  const lo = Math.min(...days.map(d => d.min)), hi = Math.max(...days.map(d => d.max)), span = hi - lo || 1;
  const wetOf = (h: {precip?: number}) => typeof h.precip === 'number' && h.precip > 0 ? h.precip : 0, rain = hours.map(wetOf), rainTop = Math.max(0, ...rain), peak = rainTop > 0 ? rain.indexOf(rainTop) : -1;
  // The outlook's drawing: one column per named hour (its point at the column's centre), the hours between them on the same
  // line. The plot is the body's elastic row (world-cards.css): the drawing stretches with it, the bars under it do not.
  const PW = n * 40, PH = 40, base = 12, keep = rainTop > 0 ? (size === 'L' ? 36 : 16) : 0, tLo = Math.min(...all.map(h => h.t)), tHi = Math.max(...all.map(h => h.t)), tSpan = tHi - tLo || 1;
  const px = (j: number) => +((j / step + .5) * 40).toFixed(2), py = (t: number) => +(6 + (1 - (t - tLo) / tSpan) * (PH - base)).toFixed(2);
  const pts = all.map((h, j) => ({x: px(j), y: py(h.t)})), curve = pts.length > 2 ? smoothPath(pts) : linePath(pts);
  const facts: (readonly [string, string])[] = [];
  if (typeof now.wind === 'number') facts.push(['Wind', `${Math.round(now.wind * 3.6)} km/h`]);
  if (typeof now.humidity === 'number') facts.push(['Humidity', `${Math.round(now.humidity)}%`]);
  if (typeof now.uv === 'number') facts.push(['UV (clear sky)', String(Math.round(now.uv))]);
  return <div ref={frame} className="nc-body nw-weather" data-size={size}>
    <div className="nw-now">
      <WeatherScene sky={sky!} size={size === 'S' ? 36 : size === 'M' ? 84 : 96} live/>
      <div className="nw-now-words">
        <p className="nw-temp"><span className="holo-num nw-temp-num">{degrees(now.t)}</span><span className="nw-temp-unit">C</span></p>
        <p className="nw-condition">{sky!.words}</p>
        {(size === 'L' || (size === 'M' && brolly.expected)) && <p className="nw-umbrella">{brolly.words}</p>}
      </div>
    </div>
    {size !== 'S' && n > 1 && <div className="nw-outlook" data-rain={rainTop > 0 ? '' : undefined} style={{'--nw-plot': `${(size === 'L' ? 46 : 36) + keep}px`, '--nw-keep': `${keep}px`, '--nw-n': n} as CSSProperties}>
      <div className="nw-outlook-plot" aria-hidden="true"><div className="nw-outlook-line">
        <svg viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="none" focusable="false">
          <defs>
            <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="nc-fill-a"/><stop offset=".6" className="nc-fill-m"/><stop offset="1" className="nc-fill-b"/></linearGradient>
            <linearGradient id={`${uid}s`} gradientUnits="userSpaceOnUse" x1={pts[0]!.x} y1="0" x2={pts.at(-1)!.x} y2="0"><stop offset="0" className="nc-g-b"/><stop offset="1" className="nc-g-a"/></linearGradient>
          </defs>
          <path className="nc-trend-fill" fill={`url(#${uid}f)`} d={`${curve}L${pts.at(-1)!.x} ${PH}L${pts[0]!.x} ${PH}Z`}/>
          <path className="nc-trend-glow nc-glow" d={curve}/><path className="nc-trend-line nc-draw" pathLength={1} stroke={`url(#${uid}s)`} d={curve}/><path className="nc-glint nc-trend-glint" d={curve}/>
        </svg>
        {hours.map((h, i) => <i key={h.at} className="nw-outlook-dot" data-lead={i === 0 || undefined} style={{left: `${((i + .5) / n * 100).toFixed(2)}%`, top: `${(py(h.t) / PH * 100).toFixed(2)}%`}}/>)}
      </div></div>
      <ol className="nw-hours" aria-label="The next hours">{hours.map((h, i) => <li key={h.at}>
        <span className="nw-hour-time">{clockTime(h.at)}</span>
        <WeatherScene sky={condition(h.symbol)} size={24}/>
        <span className="nw-hour-temp">{degrees(h.t)}</span>
        {rainTop > 0 && <span className="nw-hour-rain">{size === 'L' && i === peak && <b>{rain[i]} mm</b>}{rain[i]! > 0 && <i aria-hidden="true" style={{'--nw-rain': (rain[i]! / rainTop).toFixed(3), '--nc-i': i} as CSSProperties}/>}</span>}
      </li>)}</ol>
    </div>}
    {size === 'L' && days.length > 1 && <div className="nw-days"><p className="holo-label">The next days · lowest to highest</p>
      <ol className="nw-daycols">{days.map((d, i) => <li key={d.date}>
        <span className="nw-day-name">{formatWeekday(d.date).slice(0, 3)}</span>
        <WeatherScene sky={condition(d.symbol)} size={26}/>
        <span className="nw-day-lo"><span className="sr-only">lowest </span>{degrees(d.min)}</span>
        <span className="nw-day-track nc-capsule-track" aria-hidden="true"><i style={{bottom: `${((d.min - lo) / span * 100).toFixed(1)}%`, top: `${((hi - d.max) / span * 100).toFixed(1)}%`, '--nc-i': i} as CSSProperties}/></span>
        <span className="nw-day-hi"><span className="sr-only">highest </span>{degrees(d.max)}</span>
      </li>)}</ol></div>}
    {size === 'L' && facts.length > 0 && <p className="nw-facts">{facts.map(([label, value]) => <span key={label}>{label} <b>{value}</b></span>)}</p>}
    {w.stale && <p className="nc-foot" role="status">{w.stale} The last reading stays.</p>}
    <HoloTable caption={`Weather in ${place.name}`} rows={[['Now', `${degrees(now.t)}C, ${sky!.words}`], ['Next hours', brolly.words], ...hours.map(h => [clockTime(h.at), `${degrees(h.t)}C, ${condition(h.symbol).words}`] as const), ...days.map(d => [formatWeekday(d.date), `${degrees(d.min)} to ${degrees(d.max)}C, ${condition(d.symbol).words}`] as const)]}/>
    <Credit reading={reading} place={place.name} example={w.example}/>
  </div>;
}

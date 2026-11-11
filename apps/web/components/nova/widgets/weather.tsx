'use client';
import {useEffect, useRef, type CSSProperties, type ReactNode} from 'react';
import {condition, MET_CREDIT, MET_LICENCE_URL, MET_SITE_URL, type Condition} from '../../../lib/nova/world/met';
import type {WorldReading} from '../../../lib/nova/world/record';
import {clockTime, degrees, umbrella} from '../../../lib/nova/world/words';
import {formatWeekday} from '../../../lib/visual-format';
import {CardFoot, CardNotice, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable, HoloUnread} from '../holo/parts';
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
const CLOUD = 'M14 34a9 9 0 0 1 2-17.8A12 12 0 0 1 39 14a10 10 0 0 1 9 20Z';
/** The scene for a condition: decoration only (the condition is also said in words beside it). */
export function WeatherScene({sky, size = 96}: {sky: Condition; size?: number}) {
  const {kind, night} = sky, wet = kind === 'rain' || kind === 'drizzle' || kind === 'thunder' || kind === 'sleet';
  const body: ReactNode = night
    ? <g className="nw-moon"><path d="M40 14a15 15 0 1 0 12 24A12 12 0 0 1 40 14Z"/><circle cx="14" cy="14" r="1.2" className="nw-star"/><circle cx="24" cy="8" r=".9" className="nw-star"/><circle cx="54" cy="10" r="1" className="nw-star"/></g>
    : <g className="nw-sun"><circle cx="32" cy="28" r="10"/><path className="nw-rays" d="M32 8v6M32 42v6M12 28h6M46 28h6M17.9 13.9l4.2 4.2M41.9 37.9l4.2 4.2M17.9 42.1l4.2-4.2M41.9 18.1l4.2-4.2"/></g>;
  return <svg className="nw-scene" data-kind={kind} data-night={night || undefined} viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
    {(kind === 'clear' || kind === 'partly') && body}
    {kind === 'partly' && <path className="nw-cloud" d={CLOUD} transform="translate(6 14) scale(.9)"/>}
    {(kind === 'cloud' || wet || kind === 'snow') && <><g transform="translate(12 0) scale(.78)"><path className="nw-cloud nw-cloud-back" d={CLOUD}/></g><path className="nw-cloud" d={CLOUD} transform="translate(2 6)"/></>}
    {kind === 'fog' && <g className="nw-fog"><path d="M8 22h48M12 32h44M8 42h40M16 52h36"/></g>}
    {wet && <g className="nw-rain" data-light={kind === 'drizzle' || undefined}><path d="M20 46l-4 9M30 46l-4 9M40 46l-4 9M50 46l-4 9"/></g>}
    {(kind === 'snow' || kind === 'sleet') && <g className="nw-snow"><circle cx="20" cy="50" r="1.6"/><circle cx="32" cy="56" r="1.6"/><circle cx="44" cy="50" r="1.6"/><circle cx="26" cy="60" r="1.2"/><circle cx="40" cy="60" r="1.2"/></g>}
    {kind === 'thunder' && <path className="nw-bolt" d="M34 38l-8 12h7l-3 10 10-14h-7z"/>}
  </svg>;
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
  return <CardNotice kind="off" title="Weather is off" href={PERMISSIONS} action="Turn it on in Permissions">
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
  const w = useWeather(), sky = w.kind === 'live' ? condition(w.reading.now.symbol) : null, frame = useSkyOnFrame(sky);
  if (w.kind === 'reading-record') return <HoloReading/>;
  if (w.kind === 'unreadable') return <HoloUnread what="Your weather choice"/>;
  if (w.kind === 'off') return <WeatherOff what="The weather where you are."/>;
  if (w.kind === 'no-place') return <CardNotice kind="empty" title="Choose your place" href={PERMISSIONS} action="Choose a place">Weather is on. Pick a city from the list, or type a position, and the weather for it shows here.</CardNotice>;
  if (w.kind === 'asking') return <div ref={frame} className="nc-body"><p className="nova-reading" role="status">Asking MET Norway for {w.place.name}…</p></div>;
  if (w.kind === 'failed') return <div ref={frame} className="nc-body"><CardNotice kind="empty" title="No reading yet">{w.words} NOVA asks again in ten minutes, never more often.</CardNotice></div>;
  // Design review AM-D19 (L): six hourly columns (eight where the panel is 460 px or wider: world-cards.css), precipitation
  // as bars on one scale with one label, on the peak; each day as a row that states its lowest AND its highest; wind,
  // humidity and UV on one line; the source line is the body's last line, always in view.
  const {reading, place} = w, now = reading.now, brolly = umbrella(reading), hours = reading.hours.slice(0, size === 'L' ? 8 : 6), days = reading.days.slice(0, 5);
  const lo = Math.min(...days.map(d => d.min)), hi = Math.max(...days.map(d => d.max)), span = hi - lo || 1;
  const rain = hours.map(h => typeof h.precip === 'number' && h.precip > 0 ? h.precip : 0), rainTop = Math.max(0, ...rain);
  const peakOf = (count: number) => { const part = rain.slice(0, count), top = Math.max(0, ...part); return top > 0 ? part.indexOf(top) : -1; }, peak6 = peakOf(6), peak8 = peakOf(8);
  const facts: (readonly [string, string])[] = [];
  if (typeof now.wind === 'number') facts.push(['Wind', `${Math.round(now.wind * 3.6)} km/h`]);
  if (typeof now.humidity === 'number') facts.push(['Humidity', `${Math.round(now.humidity)}%`]);
  if (typeof now.uv === 'number') facts.push(['UV (clear sky)', String(Math.round(now.uv))]);
  return <div ref={frame} className="nc-body nw-weather" data-size={size}>
    <div className="nw-now">
      <WeatherScene sky={sky!} size={size === 'S' ? 46 : size === 'M' ? 64 : 96}/>
      <div className="nw-now-words">
        <p className="nw-temp"><span className="holo-num nw-temp-num">{degrees(now.t)}</span><span className="nw-temp-unit">C</span></p>
        <p className="nw-condition">{sky!.words}</p>
        {(size === 'L' || (size === 'M' && brolly.expected)) && <p className="nw-umbrella">{brolly.words}</p>}
      </div>
    </div>
    {size !== 'S' && hours.length > 1 && <ol className="nw-hours" aria-label="The next hours" data-rain={size === 'L' && rainTop > 0 ? '' : undefined}>{hours.map((h, i) => { const c = condition(h.symbol); return <li key={h.at}>
      <span className="nw-hour-time">{clockTime(h.at)}</span>
      <WeatherScene sky={c} size={26}/>
      <span className="nw-hour-temp">{degrees(h.t)}</span>
      {size === 'L' && rainTop > 0 && <span className="nw-hour-rain" data-peak6={i === peak6 || undefined} data-peak8={i === peak8 || undefined}>
        <span className="nw-rain-bar" aria-hidden="true"><i style={{'--nw-rain': (rain[i]! / rainTop).toFixed(3)} as CSSProperties}/></span>
        <b>{rain[i]! > 0 ? `${rain[i]} mm` : ''}</b>
      </span>}
    </li>; })}</ol>}
    {size === 'L' && days.length > 1 && <div className="nw-days"><p className="holo-label">The next days · lowest to highest</p>
      <ol className="nw-dayrows">{days.map(d => <li key={d.date}>
        <span className="nw-day-name">{formatWeekday(d.date).slice(0, 3)}</span>
        <WeatherScene sky={condition(d.symbol)} size={22}/>
        <span className="nw-day-lo"><span className="sr-only">lowest </span>{degrees(d.min)}</span>
        <span className="nw-day-track" aria-hidden="true"><i style={{left: `${((d.min - lo) / span * 100).toFixed(1)}%`, right: `${((hi - d.max) / span * 100).toFixed(1)}%`}}/></span>
        <span className="nw-day-hi"><span className="sr-only">highest </span>{degrees(d.max)}</span>
      </li>)}</ol></div>}
    {size === 'L' && facts.length > 0 && <p className="nw-facts">{facts.map(([label, value]) => <span key={label}>{label} <b>{value}</b></span>)}</p>}
    {w.stale && <p className="nc-foot" role="status">{w.stale} The last reading stays.</p>}
    <HoloTable caption={`Weather in ${place.name}`} rows={[['Now', `${degrees(now.t)}C, ${sky!.words}`], ['Next hours', brolly.words], ...hours.map(h => [clockTime(h.at), `${degrees(h.t)}C, ${condition(h.symbol).words}`] as const), ...days.map(d => [formatWeekday(d.date), `${degrees(d.min)} to ${degrees(d.max)}C, ${condition(d.symbol).words}`] as const)]}/>
    <Credit reading={reading} place={place.name} example={w.example}/>
  </div>;
}

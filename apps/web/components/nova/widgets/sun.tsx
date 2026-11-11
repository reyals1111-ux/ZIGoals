'use client';
import {useState} from 'react';
import {clockTime} from '../../../lib/nova/world/words';
import {CardNotice, Fact, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {useWeather} from './use-weather';
import {Credit, WeatherOff} from './weather';
import '../cards/world-cards.css';

/**
 * Session AM (ADR-038 D12–D15): "Sun" — sunrise, sunset and the length of the day for the person's place, from the same
 * reading as the weather widget (one request serves both). The day is an arc from sunrise to sunset with the sun's place
 * on it now; before sunrise and after sunset the sun rests at its end. Where the sun does not rise or set today (a polar
 * day or night) it says so. Off until outside data is on; an example in the Showcase.
 */
const PERMISSIONS = '/app/nova#nova-permissions';
export default function SunWidget({size = 'S'}: Partial<CardProps>) {
  const w = useWeather(), [now] = useState(() => Date.now());
  if (w.kind === 'reading-record') return <HoloReading/>;
  if (w.kind === 'unreadable') return <HoloUnread what="Your weather choice"/>;
  if (w.kind === 'off') return <WeatherOff what="Sunrise, sunset and the length of the day where you are."/>;
  if (w.kind === 'no-place') return <CardNotice kind="empty" title="Choose your place" href={PERMISSIONS} action="Choose a place">Pick a city and the sun&rsquo;s times for it show here.</CardNotice>;
  if (w.kind === 'asking') return <p className="nova-reading" role="status">Asking MET Norway for {w.place.name}…</p>;
  if (w.kind === 'failed') return <CardNotice kind="empty" title="No reading yet">{w.words}</CardNotice>;
  const {rise, set} = w.reading.sun ?? {};
  if (!rise || !set) return <div className="nc-body"><CardNotice kind="empty" title="No sunrise or sunset today">Where you are the sun does not rise or does not set today.</CardNotice><Credit reading={w.reading} place={w.place.name} example={w.example}/></div>;
  const a = Date.parse(rise), b = Date.parse(set), at = w.example ? a + (b - a) * 0.3 : now, share = Math.max(0, Math.min(1, (at - a) / (b - a))), minutes = Math.round((b - a) / 60_000);
  const angle = Math.PI * (1 - share), x = 60 + 48 * Math.cos(angle), y = 56 - 44 * Math.sin(angle), length = `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
  return <div className="nc-body nw-sunbody" data-size={size}>
    <div className="nw-sunarc">
      {size !== 'S' && <svg viewBox="0 0 120 64" aria-hidden="true" focusable="false">
        <path className="nw-arc-track" d="M12 56A48 44 0 0 1 108 56"/>
        <path className="nw-arc-done nc-draw" pathLength={1} style={{'--nc-len': share.toFixed(4)} as React.CSSProperties} d="M12 56A48 44 0 0 1 108 56"/>
        <path className="nw-horizon" d="M4 56h112"/>
        <circle className="nw-arc-sun" cx={x.toFixed(2)} cy={y.toFixed(2)} r="5"/>
      </svg>}
      <p className="nw-sun-times"><span><b>{clockTime(rise)}</b> sunrise</span><span><b>{clockTime(set)}</b> sunset</span></p>
    </div>
    {size !== 'S' && <div className="nc-facts"><Fact label="Daylight" value={length}/></div>}
    <HoloTable caption={`The sun in ${w.place.name}`} rows={[['Sunrise', clockTime(rise)], ['Sunset', clockTime(set)], ['Daylight', length]]}/>
    <Credit reading={w.reading} place={w.place.name} example={w.example}/>
  </div>;
}

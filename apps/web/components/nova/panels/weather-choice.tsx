'use client';
import {useId, useState} from 'react';
import {MET_CREDIT, MET_LICENCE_URL, MET_SITE_URL} from '../../../lib/nova/world/met';
import {NOVA_WORLD, placeOf, setPlace, setWorldOn, worldOn, type WorldPlace} from '../../../lib/nova/world/record';
import type {City} from '../../../lib/nova/world/cities';
import {Switch} from '../../ai/ai-switch';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useShowcase} from '../../showcase-controls';

/**
 * Session AM (ADR-038 D12–D14, A2): the person's own switch for outside data, in NOVA → Permissions. Off unless turned on.
 * It says, before anything is asked, which service it is and what that service sees. The place is chosen from a list that
 * ships with the app (loaded when the field is first used) or typed as a position: no geocoding service is called and the
 * browser's location is never requested. Only the person can change this: NOVA and a connected model have no way to.
 */
export function WeatherChoice() {
  const world = useDeviceRecord(NOVA_WORLD), showcase = useShowcase(), id = useId();
  const [query, setQuery] = useState(''), [found, setFound] = useState<City[]>([]), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const data = world.unreadable ? {version: 1 as const} : world.data, on = worldOn(data), place = placeOf(data);
  const save = (change: Parameters<typeof world.update>[0], text: string) => { try { world.update(change); setMessage({text}); } catch (e) { setMessage({text: `Not saved on this device. ${e instanceof Error ? e.message : ''}`.trim(), failed: true}); } };
  const search = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) { setFound([]); return; }
    try { const {searchCities} = await import('../../../lib/nova/world/cities'); setFound(searchCities(text, 6)); } catch { setFound([]); }
  };
  const choose = (p: WorldPlace) => { save(r => setPlace(r, p), `Your place for the weather is ${p.name}. MET Norway is asked for that place, rounded to about 1 km.`); setQuery(''); setFound([]); };
  const typed = async () => {
    try {
      const {parseCoordinates} = await import('../../../lib/nova/world/cities'), p = parseCoordinates(query);
      if (p) choose({...p, name: 'My place'}); else setMessage({text: 'Type a city’s name and pick it from the list, or a position such as 50.85, 4.35.', failed: true});
    } catch { setMessage({text: 'The place list could not be loaded just now.', failed: true}); }
  };
  if (!world.loaded) return <p className="ai-note" role="status">Reading your choice…</p>;
  return <section className="nova-weather-choice" aria-labelledby={`${id}-h`}>
    <h4 id={`${id}-h`}>Outside data</h4>
    {showcase && <p className="ai-note">In the Showcase no service is ever asked: its weather widget shows example values. This switch works on your own data.</p>}
    <div className="ai-switch-list">
      <Switch checked={on} onChange={next => save(r => setWorldOn(r, next), next ? 'Weather is on. Choose your place below.' : 'Weather is off. Nothing is asked from MET Norway.')} label="Weather (outside data)"
        note="Off unless you turn it on. On: when a weather widget is on the stage, this device asks MET Norway for the weather at your place. MET Norway then sees your network address and that place, rounded to about 1 km, and keeps both in its logs. No account, no key, nothing else."/>
    </div>
    {on && <div className="nova-weather-place">
      <p className="ai-note" role="status">{place ? `Your place: ${place.name} (${place.lat.toFixed(2)}, ${place.lon.toFixed(2)}).` : 'No place chosen yet.'}</p>
      <label className="nova-weather-label" htmlFor={`${id}-q`}>Find your city, or type a position</label>
      <div className="nova-weather-row">
        <input id={`${id}-q`} className="nova-weather-input" value={query} onChange={e => void search(e.target.value.slice(0, 60))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (found[0]) choose(found[0]); else void typed(); } }} placeholder="Brussels, or 50.85, 4.35" autoComplete="off" aria-describedby={`${id}-help`}/>
        <button type="button" className="secondary" onClick={() => { if (found[0]) choose(found[0]); else void typed(); }}>Use this place</button>
      </div>
      <p id={`${id}-help`} className="ai-note">The city list is part of ZIGoals: typing here asks no service, and your device’s location is never requested.</p>
      {found.length > 0 && <ul className="nova-weather-found" aria-label="Matching cities">{found.map(c => <li key={`${c.name}-${c.country}-${c.lat}`}><button type="button" className="secondary" onClick={() => choose({name: c.name, lat: c.lat, lon: c.lon})}>{c.name}, {c.country}</button></li>)}</ul>}
      {place && <button type="button" className="text-link" onClick={() => save(r => setPlace(r, null), 'Your place is removed, with the reading for it.')}>Remove my place</button>}
    </div>}
    <p className="ai-note">Credit: <a href={MET_SITE_URL} target="_blank" rel="noreferrer noopener">{MET_CREDIT}</a>, under the <a href={MET_LICENCE_URL} target="_blank" rel="noreferrer noopener">CC BY 4.0</a> licence. A forecast is not a promise.</p>
    {message && <p role={message.failed ? 'alert' : 'status'} className="ai-note">{message.text}</p>}
  </section>;
}

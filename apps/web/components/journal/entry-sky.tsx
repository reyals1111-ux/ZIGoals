'use client';
import {useId, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL_DISPLAY, journalDisplaySchema, type JournalDisplay} from '../../lib/on-this-day/store';
import {MOON_MARK, SKY_CITIES, moonOn, readCoordinates, skyLine, skyPlace} from '../../lib/journal/sky';
import {showStatus} from '../ui/undo-toast';

/**
 * Session AV lane 2 (r6-notes; LEDGER #409, Diarium): the day's sunrise, sunset and moon. `SkyLine` (lazy, in an entry's
 * "That day") says them in one line; `SkyPlaceSettings` (lazy, its own fold) chooses the place — a city from the
 * built-in list, a typed latitude and longitude, this device's time zone's city, or none. Computed on this device;
 * nothing is looked up. Weather is not shown: it would need an outside service.
 */
const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
export default function SkyLine({day}: {day: string}) {
  const display = useDeviceRecord(JOURNAL_DISPLAY);
  if (!display.loaded || display.data.sky?.off) return null;
  const place = skyPlace(display.data.sky, deviceZone()), moon = moonOn(day);
  return <p className="fine journal-sky-line"><span aria-hidden="true">{MOON_MARK[moon.phase]} </span>{skyLine(day, place)}{place ? '' : ' (choose a place under Sun and moon for the sunrise and sunset)'}.</p>;
}
export function SkyPlaceSettings() {
  const display = useDeviceRecord(JOURNAL_DISPLAY), id = useId(), sky = display.data.sky, zone = deviceZone();
  const [lat, setLat] = useState(typeof sky?.lat === 'number' ? String(sky.lat) : ''), [lon, setLon] = useState(typeof sky?.lon === 'number' ? String(sky.lon) : ''), [problem, setProblem] = useState('');
  const choice = sky?.off ? 'off' : sky?.city ?? (typeof sky?.lat === 'number' ? 'typed' : 'zone');
  const put = (next: JournalDisplay['sky'] | undefined, said: string) => {
    try { display.update(d => { const out = {...d}; if (next) out.sky = next; else delete out.sky; return journalDisplaySchema.parse(out); }); showStatus(said); setProblem(''); }
    catch { setProblem('This could not be saved on this device.'); }
  };
  const zoneCity = SKY_CITIES.find(c => c.zone === zone);
  const pick = (v: string) => {
    if (v === 'off') put({off: true}, 'No sun or moon is shown on your entries.');
    else if (v === 'zone') put(undefined, zoneCity ? `Sunrise and sunset are reckoned for ${zoneCity.name}, from this device's time zone.` : 'Only the moon shows: this time zone has no city in the list.');
    else if (v === 'typed') { setProblem(''); requestAnimationFrame(() => document.getElementById(`${id}-lat`)?.focus()); }
    else { const c = SKY_CITIES.find(x => x.id === v); if (c) put({city: c.id}, `Sunrise and sunset are reckoned for ${c.name}.`); }
  };
  const saveTyped = (event: FormEvent) => {
    event.preventDefault();
    const got = readCoordinates(lat, lon);
    if (typeof got === 'string') { setProblem(got); return; }
    put({lat: got.lat, lon: got.lon}, `Sunrise and sunset are reckoned for ${got.lat}, ${got.lon}, in this device's time zone.`);
  };
  const [typing, setTyping] = useState(choice === 'typed');
  return <div className="journal-sky-settings">
    <p className="fine">Each entry&rsquo;s &ldquo;That day&rdquo; shows the day&rsquo;s sunrise and sunset and the moon. They are worked out on this device from the place below; nothing is looked up, and the times are good to a few minutes.</p>
    <label className="field"><span>Place</span><select value={typing ? 'typed' : choice} onChange={e => { setTyping(e.target.value === 'typed'); pick(e.target.value); }}>
      <option value="zone">{zoneCity ? `${zoneCity.name} (this device’s time zone)` : 'This device’s time zone (only the moon)'}</option>
      {SKY_CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      <option value="typed">A latitude and longitude I type</option>
      <option value="off">None: show no sun or moon</option>
    </select></label>
    {typing && <form className="journal-sky-typed" onSubmit={saveTyped} aria-label="Your place as a latitude and longitude" noValidate>
      <label className="field"><span>Latitude</span><input id={`${id}-lat`} inputMode="decimal" value={lat} maxLength={10} onChange={e => setLat(e.target.value)} placeholder="52.37"/></label>
      <label className="field"><span>Longitude</span><input inputMode="decimal" value={lon} maxLength={11} onChange={e => setLon(e.target.value)} placeholder="4.90"/></label>
      <button type="submit" className="secondary">Use this place</button>
    </form>}
    {problem && <p className="field-error" role="alert">{problem}</p>}
    <p className="fine">The weather of a day is not shown: it would need an outside service.</p>
  </div>;
}

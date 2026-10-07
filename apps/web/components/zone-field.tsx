'use client';
import {useId, useState} from 'react';

/**
 * A time zone field (Session W Part 17): an IANA name typed or picked from the browser's own list
 * (`Intl.supportedValuesOf('timeZone')`, filled only when the field is first focused, so no page ships 400 options).
 * Names are written out ("Europe/Brussels", never "CET"). The value is validated by the caller (timeZoneSchema). The hint
 * sits outside the label (described-by), so the field's name is exactly its label.
 */
export function ZoneField({name, label, defaultValue, hint}: {name: string; label: string; defaultValue: string; hint?: string}) {
  const [zones, setZones] = useState<string[] | null>(null);
  const id = useId(), list = `${id}-zones`, hintId = `${id}-hint`;
  return <div className="zone-field">
    <label className="field">{label}
      <input name={name} required maxLength={100} defaultValue={defaultValue} list={list} autoComplete="off" spellCheck={false} aria-describedby={hint ? hintId : undefined}
        onFocus={() => { if (zones === null) { try { setZones([...Intl.supportedValuesOf('timeZone'), 'UTC']); } catch { setZones([]); } } }}/>
    </label>
    {zones && <datalist id={list}>{zones.map(zone => <option key={zone} value={zone}/>)}</datalist>}
    {hint && <span id={hintId} className="fine">{hint}</span>}
  </div>;
}

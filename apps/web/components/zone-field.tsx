'use client';
import {useId, useState} from 'react';

/**
 * A time zone field (Session W Part 17): an IANA name typed or picked from the browser's own list
 * (`Intl.supportedValuesOf('timeZone')`, filled only when the field is first focused, so no page ships 400 options).
 * Names are written out ("Europe/Brussels", never "CET"). The value is validated by the caller (timeZoneSchema). The hint
 * sits outside the label (described-by), so the field's name is exactly its label.
 */
export function ZoneField({name, label, defaultValue, hint, required = true, error}: {name: string; label: string; defaultValue: string; hint?: string;
  /** Session AL (BN-029): Settings lets an empty field mean "follow this device", so it is not browser-required there. */
  required?: boolean;
  /** Session AL (BN-029, P-BN-63): the caller's message for this field, shown right under it (aria-invalid, described-by). */
  error?: string}) {
  const [zones, setZones] = useState<string[] | null>(null);
  const id = useId(), list = `${id}-zones`, hintId = `${id}-hint`;
  return <div className="zone-field">
    <label className="field">{label}
      <input id={`${id}-input`} name={name} required={required} maxLength={100} defaultValue={defaultValue} list={list} autoComplete="off" spellCheck={false} aria-invalid={error ? true : undefined} aria-describedby={[hint ? hintId : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
        onFocus={() => { if (zones === null) { try { setZones([...Intl.supportedValuesOf('timeZone'), 'UTC']); } catch { setZones([]); } } }}/>
    </label>
    {/* Session AL (BN-102, P-BN-38): the list element is always there (filled on first focus), so the field is a combobox
        from the start instead of a text box that turns into one. */}
    <datalist id={list}>{zones?.map(zone => <option key={zone} value={zone}/>)}</datalist>
    {error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}
    {hint && <span id={hintId} className="fine">{hint}</span>}
  </div>;
}

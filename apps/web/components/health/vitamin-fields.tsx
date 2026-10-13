'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {HEALTH_VITAMINS, VITAMINS, parseVitamin, setFoodVitamins, vitaminText, type VitaminKey, type Vitamins} from '../../lib/health-vitamins/schema';
import {getAppStorage} from '../../lib/showcase-storage';
import {readHealth} from '../../lib/sync-homes-store';

/**
 * Session AB-Cloud Part 4 (ADR-023 C20): the vitamin inputs on the food form. Blank is unknown, never zero. They are saved
 * with the form (its submit), in the label's basis: per 100 g or 100 mL values are scaled to the food's serving, as the
 * food form does for the seven. The food's earlier diary entries keep the vitamins they were logged with.
 * One element in FoodEditor; AB-Design may restyle it.
 */
export function VitaminFields({foodId, basis, amount}: {foodId: string; basis: string; amount: string}) {
  const id = useId(), record = useDeviceRecord(HEALTH_VITAMINS), root = useRef<HTMLFieldSetElement>(null);
  const held: Vitamins | undefined = record.loaded && !record.unreadable ? record.data.foods?.[foodId] : undefined;
  const [values, setValues] = useState<Partial<Record<VitaminKey, string>> | null>(null), [error, setError] = useState('');
  const shown = values ?? Object.fromEntries(VITAMINS.map(([k]) => [k, vitaminText(held?.[k])]));
  const latest = useRef({shown, basis, amount, record, foodId});
  latest.current = {shown, basis, amount, record, foodId};
  useEffect(() => {
    const form = root.current?.closest('form');
    if (!form) return;
    const onSubmit = () => { void (async () => {
      const {shown: now, basis: b, amount: a, record: rec, foodId: fid} = latest.current;
      if (values === null) return; // nothing typed here: the held vitamins stay exactly as they are (never rescaled)
      try {
        const parsed: Vitamins = {};
        for (const [k] of VITAMINS) { const v = parseVitamin(now[k] ?? ''); if (v !== null) parsed[k] = v; }
        // Per 100 g / 100 mL label values scale to one serving (the food form's own rule for the seven).
        const serving = Number(a.replace(',', '.'));
        if (b !== 'serving') { if (!(serving > 0)) return; for (const k of Object.keys(parsed) as VitaminKey[]) parsed[k] = Math.round(parsed[k]! * serving / 100); }
        const health = await readHealth(getAppStorage());
        rec.update(c => setFoodVitamins(c, health, fid, Object.keys(parsed).length ? parsed : null));
        setError('');
      } catch (e) { setError(e instanceof Error ? `Vitamins not saved: ${e.message}` : 'Vitamins not saved on this device.'); }
    })(); };
    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, [values]);
  return <fieldset ref={root} className="health-vitamin-fields" data-region="vitamin-fields">
    <legend>Vitamins (optional)</legend>
    <div className="health-form-grid">{VITAMINS.map(([k, label, unit]) => <label key={k} className="field" htmlFor={id + k}><span>{label} ({unit})</span><input id={id + k} type="text" inputMode="decimal" value={shown[k] ?? ''} onChange={e => { setValues({...shown, [k]: e.target.value}); setError(''); }} aria-describedby={id + 'vit-note'} /></label>)}</div>
    <p className="fine" id={id + 'vit-note'}>In the label&rsquo;s basis above. Leave a vitamin blank when the label does not give it; blank stays unknown, never zero.</p>
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}

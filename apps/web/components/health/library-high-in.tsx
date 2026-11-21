'use client';
import {useEffect, useState} from 'react';
import {formatNutrient} from '../../lib/health';
import type {HighInKey} from '../../lib/food-generic/search';

/**
 * Session AV (owner follow-up 1, F-HIGH-IN; Cronometer's Oracle): beside "Which of my foods are high in…", the offline
 * food library's richest foods in the chosen nutrient, per 100 g as eaten; for a nutrient to reach ("at least") with a
 * gap left today, what 100 g of each would add towards it. Information from public food tables, not advice. The library
 * loads on the press (its own chunk and data, kept on this device).
 * Session AV (q3 #28): foods as people eat them — no dried herbs, spices, seaweed or powders — ranked by a usual portion
 * (30 g of nuts, 250 g of milk), and the gap line says what that portion covers, not 100 g of anything.
 */
type Found = {name: string; sourceName: string; per100g: number; portionGrams: number; perPortion: number};
export default function LibraryHighIn({nutrient, label, unit, scale, gap}: {nutrient: HighInKey; label: string; unit: string; scale: number; /** What is left to reach today, in the nutrient's stored unit; null when none is left or it is an "at most". */ gap: number | null}) {
  const [found, setFound] = useState<Found[] | null | 'failed'>(null);
  useEffect(() => {
    let live = true;
    queueMicrotask(() => { if (live) setFound(null); });
    void Promise.all([import('../../lib/food-generic/load'), import('../../lib/food-generic/search')]).then(async ([load, search]) => {
      const {sources} = await load.loadGenericLibrary();
      if (live) setFound(sources.length ? search.highInEaten(sources, nutrient) : 'failed');
    }).catch(() => { if (live) setFound('failed'); });
    return () => { live = false; };
  }, [nutrient]);
  if (found === null) return <p className="fine" role="status">Opening the offline food library…</p>;
  if (found === 'failed') return <p className="fine" role="status">The offline food library could not be opened on this device just now. Your own foods above are unchanged.</p>;
  if (!found.length) return <p className="fine">No food in the offline library has a value for {label.toLowerCase()}.</p>;
  return <div className="health-rich-library">
    <h4>In the offline food library</h4>
    <ol aria-label={`Foods high in ${label.toLowerCase()}, by a usual portion`}>{found.map(f => <li key={`${f.sourceName}-${f.name}`}>{f.name} <small>· {formatNutrient(f.perPortion / scale)} {unit} in a usual portion of {f.portionGrams} g ({formatNutrient(f.per100g / scale)} {unit} per 100 g){gap !== null && gap > 0 ? ` · that portion covers ${Math.min(100, Math.round(100 * f.perPortion / gap))}% of today’s gap` : ''} · {f.sourceName}</small></li>)}</ol>
    <p className="fine">From public food tables, ranked by a rough usual portion; dried herbs, spices, seaweed and powders are left out. Information, not advice.</p>
  </div>;
}

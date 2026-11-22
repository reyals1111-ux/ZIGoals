'use client';
import {useEffect, useState} from 'react';
import {ENERGY_KEY} from '../../lib/energy/schema';
import {getAppStorage} from '../../lib/showcase-storage';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';

/**
 * Session AV lane 2 (LEDGER #68, Bearable's "mark day complete"): "✓ Day logged" under Health's date bar when the evening
 * check-in marked the chosen day (the energy record's `checkin.logged`). A plain read after mount, so the Health page's
 * first chunk carries no schema for it; nothing shows for a day not logged (the check-in's own strip shows the gaps).
 */
export function DayLogged({date, today}: {date: string; today: string}) {
  const [logged, setLogged] = useState(false);
  useEffect(() => {
    const read = () => { try { const r = JSON.parse(getAppStorage().getItem(ENERGY_KEY) ?? 'null') as {checkin?: {logged?: Record<string, unknown>}} | null; setLogged(typeof r?.checkin?.logged?.[date > today ? today : date] === 'string'); } catch { setLogged(false); } };
    read();
    window.addEventListener(ZIGI_STORE_EVENT, read); window.addEventListener('storage', read);
    return () => { window.removeEventListener(ZIGI_STORE_EVENT, read); window.removeEventListener('storage', read); };
  }, [date, today]);
  return logged ? <p className="health-day-logged" data-testid="health-day-logged"><span aria-hidden="true">✓ </span>Day logged</p> : null;
}

'use client';
import {useEffect, useState} from 'react';

/**
 * Session AL (P-MO-22, MO-098): a page still opening after 10 s says so and offers Reload (a reload fixed the stuck
 * skeleton the bot saw). Nothing shows before then. Used by Health and its full views.
 */
export function SlowReload({after = 10_000}: {after?: number}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setSlow(true), after); return () => window.clearTimeout(t); }, [after]);
  return slow ? <p className="fine health-slow-load" role="status">This is taking longer than usual. <button type="button" className="secondary" onClick={() => window.location.reload()}>Reload</button></p> : null;
}


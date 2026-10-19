'use client';
import {useEffect, useState} from 'react';
import {usePathname} from 'next/navigation';
import {registerNavExtra} from '../nav-extras';
// Two literals instead of their modules (the shell's weight): `zigoals:game:v1` is GAME_KEY in lib/aa-device-keys.ts, `zigoals:zigi-store` is ZIGI_STORE_EVENT in lib/ai/store/keys.ts; lib/game/game.test.ts keeps them equal.
const GAME_KEY = 'zigoals:game:v1', ZIGI_STORE_EVENT = 'zigoals:zigi-store';
/**
 * Registers the game cards in the progress slots once the page is on the client (AA-Cloud's shell mounts this once since
 * the merge, ADR-022 B52, so every page's slot fills), and keeps Journey in the navigation (sidebar, the phone's More
 * sheet, search) while the game layer is on. Renders nothing. The game module is imported here at run time, never in a
 * page's first load, and the on/off flag is read from the record's bytes without its schema: the shell carries none of
 * the game layer, so the weight budgets never rise.
 */
function gameOn(): boolean { try { const raw = window.localStorage.getItem(GAME_KEY); if (!raw) return false; const v = JSON.parse(raw) as {enabled?: unknown}; return v?.enabled === true; } catch { return false; } }
/** The pages with a named place (AA-Cloud's progress slots, Today's and Settings' places, the Life review's); Help, the welcome, Share and ZIGi's own page have none, so they never fetch the game module (send-feedback.spec.ts watches Help for requests). */
const SLOT_PAGES = ['/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth', '/app/markets', '/app/portfolio', '/app/activity', '/app/settings', '/app/review', '/app/journey'];
const hasSlots = (path: string | null) => !!path && SLOT_PAGES.some(p => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'));
export function GameRegistrar() {
  const path = usePathname(), slots = hasSlots(path);
  // Session AF (CI's WebKit, webkit-earn): a navigation can cancel this chunk's stylesheet mid-load; WebKit then rejects the
  // import, and the next page registers again, so a cancelled load is not an error.
  useEffect(() => { if (!slots) return; let on = true; void import('./register').then(m => { if (on) m.registerGameCards(); }).catch(() => undefined); return () => { on = false; }; }, [slots]);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const read = () => setEnabled(gameOn()); read();
    const onStore = (e: Event) => { if (!(e instanceof CustomEvent) || e.detail === GAME_KEY) read(); };
    window.addEventListener('storage', read); window.addEventListener(ZIGI_STORE_EVENT, onStore);
    return () => { window.removeEventListener('storage', read); window.removeEventListener(ZIGI_STORE_EVENT, onStore); };
  }, []);
  useEffect(() => { if (!enabled) return; return registerNavExtra(['/app/journey', 'Journey', 'journey']); }, [enabled]);
  return null;
}

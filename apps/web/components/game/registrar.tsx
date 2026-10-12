'use client';
import {useEffect} from 'react';
/**
 * Registers the game cards in the progress slots once the page is on the client (AA-Cloud's shell mounts this after the
 * merge, so every page's slot fills; until then the Habits, Health and Journey pages mount it). Renders nothing. The game
 * module is imported here at run time, never in a page's first load: the weight budgets (Gate A) never rise.
 */
export function GameRegistrar() { useEffect(() => { let on = true; void import('./register').then(m => { if (on) m.registerGameCards(); }); return () => { on = false; }; }, []); return null; }

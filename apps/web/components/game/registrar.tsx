'use client';
import {useEffect} from 'react';
import {registerGameCards} from './register';
/**
 * Registers the game cards in the progress slots once the page is on the client (AA-Cloud's shell mounts this after the
 * merge, so every page's slot fills; until then the Habits, Health and Journey pages mount it). Renders nothing.
 */
export function GameRegistrar() { useEffect(() => { registerGameCards(); }, []); return null; }

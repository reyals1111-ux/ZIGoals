'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {GAME} from '../../lib/game/schema';
/** Whether the game layer is on (ADR-022 B2): false on the server snapshot and until the record is read, so nothing flashes. */
export function useGameEnabled(): boolean { const g = useDeviceRecord(GAME); return g.loaded && !g.unreadable && g.data.enabled; }

'use client';
import {useDeviceRecord, type DeviceRecordState} from '../../components/ai/use-device-record';
import {UI_PREFS, type UiPrefs} from './schema';

/**
 * The UI preferences in a component (ADR-024 D4): read after mount through the app storage (per account; the tab's
 * session storage in the Showcase), read again after a save anywhere on the page, a change in another tab or an account
 * change. `update` writes one choice and tells every other reader; unreadable bytes read as the defaults.
 */
export function useUiPrefs(): DeviceRecordState<UiPrefs> { return useDeviceRecord(UI_PREFS); }

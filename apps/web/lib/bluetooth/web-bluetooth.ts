import {documentAllowsFeature} from '../health-navigation';
import {parseBodyComposition, parseHeartRate, parseWeight, type BodyCompositionReading, type HeartRateReading, type WeightReading} from './gatt';

/**
 * Web Bluetooth for a heart-rate monitor and a scale (Session W Part 8). Feature-detected: the API exists in Chrome and
 * Edge on desktop and in Chrome on Android, not in Safari, Firefox or on iOS; the document must also allow it, which only
 * a page loaded as /app/health does (`bluetooth=(self)`). The browser shows its own chooser; only the standard services
 * named here can be used (heart_rate, weight_scale, body_composition). Readings stay in this page.
 */
type Characteristic = EventTarget & {value: DataView | null; startNotifications(): Promise<unknown>; stopNotifications(): Promise<unknown>};
type Service = {getCharacteristic(name: string): Promise<Characteristic>};
type Server = {connected: boolean; connect(): Promise<Server>; disconnect(): void; getPrimaryService(name: string): Promise<Service>};
type Device = EventTarget & {name?: string; gatt?: Server};
type BluetoothApi = {requestDevice(options: {filters: {services: string[]}[]; optionalServices?: string[]}): Promise<Device>};
export type Support = 'ok' | 'no-api' | 'policy';
/** Whether this page can offer Bluetooth: the API, then the document's policy. */
export function bluetoothSupport(doc: Document = document, nav: Navigator = navigator): Support {
  const api = (nav as Navigator & {bluetooth?: BluetoothApi}).bluetooth;
  if (!api || typeof api.requestDevice !== 'function') return 'no-api';
  return documentAllowsFeature(doc, 'bluetooth') ? 'ok' : 'policy';
}
const api = () => (navigator as Navigator & {bluetooth?: BluetoothApi}).bluetooth!;
/** Plain words for what went wrong (the person closing the chooser is not an error). */
export function bluetoothProblem(error: unknown): string | null {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : '';
  if (name === 'NotFoundError' || name === 'AbortError') return null;
  if (name === 'SecurityError' || name === 'NotAllowedError') return 'This browser did not allow Bluetooth here.';
  if (name === 'NetworkError') return 'The device disconnected. Wake it and try again.';
  return 'The device could not be connected.';
}
export type Connection = {name: string; stop: () => void};
async function subscribe(service: Service, characteristic: string, onValue: (view: DataView) => void): Promise<() => void> {
  const c = await service.getCharacteristic(characteristic);
  const listener = () => { if (c.value) onValue(c.value); };
  c.addEventListener('characteristicvaluechanged', listener);
  await c.startNotifications();
  return () => { c.removeEventListener('characteristicvaluechanged', listener); void c.stopNotifications().catch(() => undefined); };
}
/** Asks for a heart-rate monitor (the browser's chooser) and reports each reading until stopped or disconnected. */
export async function connectHeartRate(onReading: (reading: HeartRateReading) => void, onGone: () => void): Promise<Connection> {
  const device = await api().requestDevice({filters: [{services: ['heart_rate']}]});
  const server = await device.gatt!.connect();
  const unsubscribe = await subscribe(await server.getPrimaryService('heart_rate'), 'heart_rate_measurement', view => { const r = parseHeartRate(view); if (r) onReading(r); });
  const gone = () => { device.removeEventListener('gattserverdisconnected', gone); onGone(); };
  device.addEventListener('gattserverdisconnected', gone);
  return {name: device.name || 'Heart-rate monitor', stop: () => { unsubscribe(); device.removeEventListener('gattserverdisconnected', gone); if (server.connected) server.disconnect(); }};
}
/** Asks for a scale (weight scale or body composition service) and reports each measurement until stopped. */
export async function connectScale(onWeight: (reading: WeightReading) => void, onBody: (reading: BodyCompositionReading) => void, onGone: () => void): Promise<Connection> {
  const device = await api().requestDevice({filters: [{services: ['weight_scale']}, {services: ['body_composition']}], optionalServices: ['weight_scale', 'body_composition']});
  const server = await device.gatt!.connect(), stops: (() => void)[] = [];
  try { stops.push(await subscribe(await server.getPrimaryService('weight_scale'), 'weight_measurement', view => { const r = parseWeight(view); if (r) onWeight(r); })); } catch { /* a body-composition-only scale */ }
  try { stops.push(await subscribe(await server.getPrimaryService('body_composition'), 'body_composition_measurement', view => { const r = parseBodyComposition(view); if (r) onBody(r); })); } catch { /* a weight-only scale */ }
  if (!stops.length) { server.disconnect(); throw Error('This scale offers neither a weight nor a body composition measurement.'); }
  const gone = () => { device.removeEventListener('gattserverdisconnected', gone); onGone(); };
  device.addEventListener('gattserverdisconnected', gone);
  return {name: device.name || 'Scale', stop: () => { for (const s of stops) s(); device.removeEventListener('gattserverdisconnected', gone); if (server.connected) server.disconnect(); }};
}

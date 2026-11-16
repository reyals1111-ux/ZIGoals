import type {WorldPlace, WorldReading} from './record';

/**
 * Session AM: the Showcase's example weather. It is NOT a reading: the Showcase never asks any service, so the weather
 * widget shows these fixed values with the label "Showcase example · not a real reading" and no service's credit.
 */
export const SHOWCASE_PLACE: WorldPlace = {name: 'Example city', lat: 0, lon: 0};
export function showcaseReading(day: string): WorldReading {
  const at = (h: number) => `${day}T${String(h).padStart(2, '0')}:00:00.000Z`, symbols = ['partlycloudy_day', 'partlycloudy_day', 'cloudy', 'lightrain', 'lightrain', 'cloudy', 'clearsky_night', 'clearsky_night'];
  const next = (n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  return {
    lat: 0, lon: 0, fetchedAt: at(9), expires: at(23),
    now: {at: at(9), t: 14, symbol: 'partlycloudy_day', wind: 3.4, humidity: 71, uv: 2, cloud: 45},
    hours: symbols.map((symbol, i) => ({at: at(Math.min(23, 9 + i * 2)), t: [14, 15, 16, 15, 13, 12, 10, 9][i]!, symbol, precip: symbol === 'lightrain' ? 0.6 : 0})),
    days: [{min: 9, max: 16, symbol: 'partlycloudy_day', precip: 1.2}, {min: 8, max: 13, symbol: 'rain', precip: 6.4}, {min: 6, max: 12, symbol: 'cloudy'}, {min: 5, max: 14, symbol: 'clearsky_day'}, {min: 7, max: 15, symbol: 'fair_day'}].map((d, i) => ({date: next(i), ...d})),
    sun: {rise: at(7), set: at(17)},
  };
}

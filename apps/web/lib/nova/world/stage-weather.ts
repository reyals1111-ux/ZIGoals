import type {StageWeather} from '../../ai/tools/nova-stage';
import {readDeviceRecord} from '../../device-record';
import {NOVA_WORLD, placeOf, readingOf, worldOn} from './record';
import {weatherSentence} from './words';

/**
 * Session AM (ADR-038 A4, D13): what the `weather` lookup may tell a connected model — whether the person turned outside
 * data on, the place's name, and the reading this device already holds as one sentence. It reads the device record only;
 * nothing is fetched here (the weather widget fetches, under the service's rules, lib/nova/world/met.ts).
 */
export function stageWeather(storage: Pick<Storage, 'getItem'>): StageWeather {
  const read = readDeviceRecord(storage, NOVA_WORLD);
  if (read.unreadable || !worldOn(read.data)) return {on: false};
  const place = placeOf(read.data), reading = readingOf(read.data);
  if (!place) return {on: true};
  if (!reading) return {on: true, place: place.name};
  let sentence = '';
  try { sentence = weatherSentence(reading, place, 'en'); } catch { sentence = ''; }
  return sentence ? {on: true, place: place.name, sentence, asOf: reading.now.at} : {on: true, place: place.name};
}

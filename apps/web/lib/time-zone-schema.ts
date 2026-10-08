import * as z from 'zod';
import {isTimeZone} from '@zigoals/goal-engine/time';

/**
 * An IANA time zone name, as the stored formats keep it (docs/product/TIMEZONE_DESIGN.md, timezone phase 3): what
 * Intl accepts, minus the fixed offsets Intl also takes ("+05:30", "UTC-3", "GMT+2"), which carry no daylight-saving
 * rules. "UTC" and the Etc/ names ("Etc/GMT+12") are IANA names and stay allowed.
 */
export const timeZoneSchema=z.string().min(1).max(100).refine(zone=>isTimeZone(zone)&&!/^(?:UTC|GMT)?[+-]\d/i.test(zone),'Choose an IANA time zone name, for example Europe/Brussels.');
export type TimeZoneName=z.infer<typeof timeZoneSchema>;

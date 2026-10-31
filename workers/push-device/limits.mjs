/**
 * The device push Worker's fixed limits (ADR-036 Q3, A5), in their own module: workerd reads every export of the main
 * module as an entrypoint, so plain values live here and worker.mjs exports only its handler and the two classes.
 * Sized for the free Workers and Durable Objects plan at 1,000 devices (docs/run11/PUSH_PUBLIC_ALPHA.md, "Cost").
 */
export const DEVICE_LIMITS=Object.freeze({
 /** Recurring wakes plus one-off wakes a device may hold. */ wakes:48,
 /** Instants a device may ask to skip (a habit already done today, for example). */ skips:96,
 /** How far ahead a one-off wake may lie, and how far ahead a skip. */ onceAheadMs:31*86_400_000,skipAheadMs:3*86_400_000,
 /** Registrations (PUT) per device per clock hour and per UTC day (a refresh of a known device counts only here), test sends per device per clock hour. */ putsPerHour:30,putsPerDay:48,testsPerHour:3,
 /** Sends per device per UTC day, and the least time between two sends to one device. */ sendsPerDay:24,gapMs:60_000,
 /** A wake fired more than this late is skipped, never sent late. */ staleMs:600_000,
 /** A device not refreshed for 30 days is deleted. Five failed sends in a row delete it too (the page registers again). */ ttlMs:30*86_400_000,failuresBeforeDelete:5,
 /**
  * The whole deployment: NEW devices per clock hour, in all and per client group (an IPv4 address or an IPv6 /48), and
  * sends per UTC day (the daily budget, A5). Sized for the free plan's 100,000 Durable Object rows written a day
  * (docs/run11/PUSH_PUBLIC_ALPHA.md, "Cost"): 20,000 sends at about 4 rows = 80,000; 100 new devices an hour at about
  * 3 rows (budget row, device record, alarm) = 7,200 a day; the rest (about 12,800) is left for refreshes at 2 rows each.
  */ globalPutsPerHour:100,groupPutsPerHour:10,globalSendsPerDay:20000,
 /** Request body cap, VAPID token reuse per push-service origin. */ bodyBytes:4096,tokenMs:6*3_600_000,
});
/** A device id is a random UUID v4; the device secret is 32 random bytes in base64url (43 characters). */
export const DEVICE_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const DEVICE_SECRET=/^[A-Za-z0-9_-]{43}$/;

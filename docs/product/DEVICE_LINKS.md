# Health → Devices (Session W Part 8)

`/app/health?view=devices` (Health's roadmap card → "Open Devices"). What can bring readings into the Health journal from here, platform by platform, and what cannot yet. Nothing connects until the person asks. Decisions: ADR-015 S70–S79. Owner activation of linked accounts: [HEALTH_LINK_ACTIVATION.md](../run11/HEALTH_LINK_ACTIVATION.md). All sources below were read 2026-10-07.

## On this device, by Bluetooth
- **Where it works:** browsers with Web Bluetooth: Chrome 70+ on Windows, Linux (not on by default) and ChromeOS, Chrome 56+ on macOS and Android, Edge 79+, Opera, Samsung Internet. Not Safari (macOS or iOS), Firefox, or any iPhone browser ([MDN compatibility data](https://bcd.developer.mozilla.org/bcd/api/v0/current/api.Bluetooth.json), [Chrome](https://developer.chrome.com/docs/capabilities/bluetooth)). Without it the page says so and points to the importer.
- **Only on Health:** the documents' Permissions-Policy says `bluetooth=()` everywhere and `bluetooth=(self)` only on `/app/health` (one source, `lib/egress-policy.json`; the feature's default is `self` per the [Web Bluetooth spec](https://webbluetoothcg.github.io/web-bluetooth/) and [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/bluetooth)). Policy is decided when a document loads, so Health reached by an in-app navigation from another page cannot use Bluetooth; the page offers "Reload Health for Bluetooth" (the camera's rule, `lib/health-navigation.ts`).
- **Chooser:** the browser's own device chooser, filtered to the one standard service asked for (`heart_rate`, or `weight_scale` and `body_composition`); no other service is reachable ([spec](https://webbluetoothcg.github.io/web-bluetooth/)). A secure context and a tap are required.
- **Heart-rate monitor** (Heart Rate service 0x180D, Heart Rate Measurement 0x2A37, notifications): the bpm in uint8 or uint16 as the flags say, the sensor-contact bits ("no skin contact" shown, those readings not counted), Energy Expended skipped (the specifications disagree on its unit), RR intervals read (1/1024 s) but not kept ([GATT Specification Supplement](https://www.bluetooth.com/specifications/gss/) §3.126, [HRS 1.0](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/HRS_v1.0/out/en/index-en.html)). The monitor stays connected while the person moves around ZIGoals (one connection for the page; a reload ends it). Readings live in memory only (six hours at most); **a meditation session can keep the lowest, average and highest of its own minutes** if the person ticks the unticked box when saving (at least 10 readings), and nothing else is ever stored. ZIGoals does not estimate calories from heart rate.
- **Scale** (Weight Scale 0x181D / Weight Measurement 0x2A9D, Body Composition 0x181B / 0x2A9C, indications): weight in 0.005 kg or 0.01 lb steps as the flags say, 0xFFFF ("measurement unsuccessful") ignored ([GSS](https://www.bluetooth.com/specifications/gss/) §3.276 and §3.37, [WSS 1.0.1](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/WSS_v1.0.1/out/en/index-en.html), [BCS 1.0](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/BCS_v1.0/out/en/index-en.html)). Each reading waits for "Save as today's weight"; a day that already has a weight says so and "Replace today's weight" replaces it (the journal keeps one weight a day). Body fat is shown, not saved: the journal has no place for it yet. Showcase saves nothing.
- **Evidence:** parsing unit tests on byte layouts from the specifications; Playwright with a MOCK `navigator.bluetooth` (a fictional strap and scale). No physical device was used in this session.

## Linked accounts (built, off)
Oura, Withings, Polar and Strava each need ZIGoals registered with them and a client secret only ZIGoals' server may hold. Until the owner does that ([activation](../run11/HEALTH_LINK_ACTIVATION.md)), each says "Needs setup by ZIGoals" with what it would bring and the way to bring the data in today.

| Service | Brings (when on) | Not kept, and why |
|---|---|---|
| Oura | nights and naps (asleep, latency, stages when complete), a day's steps and active energy, meditation and breathing sessions, workouts | the lowest heart rate in sleep (not a resting rate; its unit is not stated) |
| Withings | nights (asleep from "total sleep time", or "asleepduration" for nights from another source), weight, a day's steps, active and resting energy (total − active, as Withings defines), workouts | meditation and breathing sessions (no home yet), body fat |
| Polar | nights (unplaced sleep counts as asleep and leaves the stages out), a day's steps, exercises | daily calories (the reference does not state their unit) |
| Strava | activities (elapsed time, the activity's own time zone) | calories (not in the list answer) |

A day's totals arrive once the day has ended in the journal's time zone, so the figure kept is final; nights, sessions and workouts arrive as soon as they have ended. Imported records show their source ("Imported from Oura (linked)").

## Bring your history instead
- **Apple Health** (iPhone, Apple Watch): no web access; export from the Health app and import the file.
- **Health Connect** (Android): no web access; import from the app that writes to it (Samsung Health, Google Health).
- **Fitbit:** the Web API is turned off on 30 October 2026 and the Google Health API takes no new projects; Google Takeout and import.
- **Garmin:** the Health API is for approved businesses and the export layout is unpublished, so ZIGoals does not read it yet (ADR-015 S60); Garmin Connect can share with Apple Health or Health Connect.
Settings → Switch to ZIGoals (docs/product/IMPORT_FORMATS.md).

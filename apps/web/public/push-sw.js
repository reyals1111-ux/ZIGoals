// ZIGoals push reminders (ADR-010; Session V Part 13, ADR-014): a push-only service worker. It shows one notification
// per push, tells an open ZIGoals window (its reminder cards refresh, and ZIGi knocks if the person turned that on), and
// opens or focuses the app when the notification is tapped, where ZIGi greets once.
// It has no fetch handler, no cache and writes no storage. The one thing it may read: the table of reminder names,
// `zigoals-push-labels-v1`, which the page keeps only after the person turned on "Show what a reminder is for in
// notifications" (off by default). It never creates, changes or deletes it; without it the text is the generic line.
const GENERIC = 'A reminder from ZIGoals';
const LABELS_DB = 'zigoals-push-labels-v1', LABELS_STORE = 'labels', WINDOW_MINUTES = 30, READ_MS = 1500;
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
// The same rule as labelText in lib/push/labels.ts (a test runs both on the same cases): the names of the reminders due
// in the last 30 minutes on their own weekday, at most three; otherwise the generic line.
function zoneClock(now, zone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(now);
    const get = type => (parts.find(p => p.type === type) || {}).value || '';
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return weekday < 0 ? null : { clock: `${get('hour')}:${get('minute')}`, weekday };
  } catch { return null; }
}
const minutes = clock => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
function labelText(rows, now) {
  const names = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row.label !== 'string' || typeof row.time !== 'string' || typeof row.zone !== 'string' || typeof row.weekdays !== 'number') continue;
    const here = zoneClock(now, row.zone);
    if (!here || !(row.weekdays & (1 << ((here.weekday + 6) % 7)))) continue;
    const late = minutes(here.clock) - minutes(row.time);
    if (late >= 0 && late <= WINDOW_MINUTES && !names.includes(row.label)) names.push(row.label);
  }
  if (!names.length) return GENERIC;
  const shown = names.slice(0, 3).join(', '), more = names.length - 3;
  return `${names.length === 1 ? 'Reminder' : 'Reminders'}: ${shown}${more > 0 ? ` and ${more} more` : ''}`;
}
// The opted-in names, read only. Never opted in or emptied: no table, and opening does not create one (the upgrade a
// missing database would need is aborted, which leaves no database behind).
function readLabels() {
  const read = new Promise(resolve => {
    let request;
    try { request = indexedDB.open(LABELS_DB); } catch { resolve([]); return; }
    request.onupgradeneeded = () => { request.transaction.abort(); };
    request.onerror = () => resolve([]);
    request.onblocked = () => resolve([]);
    request.onsuccess = () => {
      const db = request.result;
      try {
        if (!db.objectStoreNames.contains(LABELS_STORE)) { db.close(); resolve([]); return; }
        const all = db.transaction(LABELS_STORE, 'readonly').objectStore(LABELS_STORE).getAll();
        all.onsuccess = () => { db.close(); resolve(all.result); };
        all.onerror = () => { db.close(); resolve([]); };
      } catch { db.close(); resolve([]); }
    };
  });
  return Promise.race([read, new Promise(resolve => setTimeout(() => resolve([]), READ_MS))]);
}
self.addEventListener('push', event => {
  // The body is always the encrypted {"v":1}; nothing in it is shown. The text is the generic line, or the person's
  // own reminder names when they opted in, composed here on the device.
  let version = null;
  try { version = event.data ? event.data.json().v : null; } catch { version = null; }
  const shown = readLabels().then(rows => labelText(rows, new Date()), () => GENERIC)
    .then(body => self.registration.showNotification('ZIGoals', { body, tag: 'zigoals-reminder', icon: '/brand/figures/zigi-reminder.png', image: '/brand/figures/zigi-reminder-wide.png', data: { url: '/app', v: version } }));
  const told = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => { for (const client of clients) client.postMessage({ type: 'zigoals:push-reminder' }); });
  event.waitUntil(Promise.all([shown, told]));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const open = clients.find(client => typeof client.focus === 'function');
    // ZIGi greets once on the page the person comes back to.
    if (open) { open.postMessage({ type: 'zigoals:push-open' }); return open.focus(); }
    return self.clients.openWindow('/app?zigi=hello');
  }));
});

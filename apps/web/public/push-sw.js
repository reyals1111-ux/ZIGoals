// ZIGoals push reminders (ADR-010): a push-only service worker. It shows the one fixed notification, tells an open
// ZIGoals window to refresh its reminder cards, and opens or focuses the app when the notification is tapped.
// It has no fetch handler, no cache and no storage, so it changes nothing about how the app loads or keeps data.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('push', event => {
  // The body is always the encrypted {"v":1}; nothing in it is shown. The text below is the whole message.
  let version = null;
  try { version = event.data ? event.data.json().v : null; } catch { version = null; }
  const shown = self.registration.showNotification('ZIGoals', { body: 'A reminder from ZIGoals', tag: 'zigoals-reminder', icon: '/icons/zigoals-192.png', data: { url: '/app', v: version } });
  const told = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => { for (const client of clients) client.postMessage({ type: 'zigoals:push-reminder' }); });
  event.waitUntil(Promise.all([shown, told]));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const open = clients.find(client => typeof client.focus === 'function');
    return open ? open.focus() : self.clients.openWindow('/app');
  }));
});

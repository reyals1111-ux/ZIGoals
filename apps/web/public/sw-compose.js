// ZIGoals notifications, composed on the device (Session AK Part 2, ADR-036 A1, A2). Loaded by /sw.js with
// importScripts and by the unit tests in a sandbox; it only defines functions on `self`, reads nothing and writes nothing.
// A push carries no payload: the service worker reads this device's snapshot (zigoals-notify-v1) and turns the items due
// around now into one notification. Names appear only when the snapshot holds them (the person opted in to names and the
// device lock is off); otherwise the text counts. A push that finds nothing due still shows a calm line (A2).
(function (scope) {
  'use strict';
  var BEFORE = 35 * 60000, AFTER = 3 * 60000;
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
  function dueItems(snapshot, now) {
    var items = snapshot && Array.isArray(snapshot.items) ? snapshot.items : [];
    return items.filter(function (i) { return i && typeof i.at === 'number' && i.at >= now - BEFORE && i.at <= now + AFTER && typeof i.kind === 'string'; });
  }
  function summaryLine(snapshot) {
    var s = snapshot && snapshot.summary;
    if (s && typeof s.total === 'number' && s.total > 0 && typeof s.done === 'number') return 'Today: ' + s.done + ' of ' + s.total + ' done.';
    return '';
  }
  function compose(snapshot, now) {
    var due = dueItems(snapshot, now), named = !!(snapshot && snapshot.labels), lines = [], kinds = {};
    due.forEach(function (i) { (kinds[i.kind] = kinds[i.kind] || []).push(i); });
    var habits = kinds.habit || [];
    if (habits.length) {
      var names = named ? habits.map(function (h) { return h.label; }).filter(Boolean) : [];
      lines.push(names.length === habits.length ? names.slice(0, 3).join(' · ') + (names.length > 3 ? ' and ' + (names.length - 3) + ' more' : '') : plural(habits.length, 'habit due', 'habits due'));
    }
    (kinds.water || []).slice(0, 1).forEach(function (w) { lines.push(w.detail ? 'Water: ' + w.detail : 'Time for some water'); });
    var money = kinds.contribution || [];
    if (money.length) lines.push(named && money.every(function (c) { return c.label; }) ? money.slice(0, 2).map(function (c) { return c.label + (c.detail ? ' · ' + c.detail : ''); }).join(' · ') : plural(money.length, 'contribution due', 'contributions due'));
    var bills = kinds.bill || [];
    if (bills.length) lines.push(named && bills.every(function (b) { return b.label; }) ? bills.slice(0, 2).map(function (b) { return b.label + (b.detail ? ' · ' + b.detail : ''); }).join(' · ') : plural(bills.length, 'bill due tomorrow', 'bills due tomorrow'));
    if (kinds.windDown) lines.push('Time to wind down');
    if (kinds.review) lines.push('Your weekly Life review is ready');
    var summary = summaryLine(snapshot);
    if (kinds.morning) lines.unshift(summary ? 'Good morning. ' + summary : 'Good morning. Your orbit is ready.');
    if (kinds.evening) lines.unshift(summary ? 'Evening wrap-up. ' + summary : 'Evening wrap-up: how did today go?');
    var first = due[0], actionable = habits.filter(function (h) { return h.actionable; });
    var url = kinds.morning ? '/app/checklist' : first && typeof first.href === 'string' && first.href.charAt(0) === '/' ? first.href : '/app';
    if (!lines.length) return {title: 'ZIGoals', body: summary ? summary + ' Nothing is due right now.' : 'Nothing is due right now.', tag: 'zigoals-summary', actions: [], data: {url: '/app', items: []}};
    var actions = actionable.length ? [{action: 'done', title: 'Done'}, {action: 'snooze', title: 'Snooze 1 h'}] : (kinds.morning || kinds.evening || kinds.review) ? [] : [{action: 'snooze', title: 'Snooze 1 h'}];
    return {title: 'ZIGoals', body: lines.join(' · ').slice(0, 240), tag: 'zigoals-reminder', actions: actions, data: {url: url, date: snapshot && snapshot.summary ? snapshot.summary.date : null, items: due.filter(function (i) { return i.kind !== 'morning' && i.kind !== 'evening'; }).map(function (i) { return {kind: i.kind, id: i.id, at: i.at}; })}};
  }
  // A price alert crossed (the same rule as lib/price-alerts/engine.ts): the quote's integer price over its decimals,
  // compared with the alert's decimal figure, both scaled to 12 decimals.
  function scaled(text, decimals) {
    var parts = String(text).split('.'), whole = parts[0] || '0', part = (parts[1] || '').slice(0, 12);
    if (!/^\d+$/.test(whole) || !/^\d*$/.test(part)) return null;
    if (decimals === undefined) return BigInt(whole) * 1000000000000n + BigInt((part + '000000000000').slice(0, 12));
    var digits = String(text); if (!/^\d+$/.test(digits) || decimals < 0 || decimals > 30) return null;
    var value = BigInt(digits); return decimals <= 12 ? value * 10n ** BigInt(12 - decimals) : value / 10n ** BigInt(decimals - 12);
  }
  function crossedAlerts(watches, quotes) {
    var out = [];
    (Array.isArray(watches) ? watches : []).forEach(function (w) {
      var q = (Array.isArray(quotes) ? quotes : []).find(function (x) { return x && x.currency === w.currency && x.providerAssetId === w.coin; });
      if (!q || typeof q.price !== 'string' || typeof q.priceDecimals !== 'number') return;
      var price = scaled(q.price, q.priceDecimals), limit = scaled(w.price);
      if (price === null || limit === null) return;
      if ((w.direction === 'above' && price >= limit) || (w.direction === 'below' && price <= limit)) out.push(w);
    });
    return out;
  }
  scope.zigoalsCompose = compose;
  scope.zigoalsCrossedAlerts = crossedAlerts;
})(typeof self !== 'undefined' ? self : this);

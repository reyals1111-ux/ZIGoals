#!/usr/bin/env node
/**
 * Session AX (review helper, TEST ONLY): a deterministic "heavy profile" — two years of realistic records in every pillar,
 * ending on the run date — for performance and review runs. Nothing under apps/web imports this file except the
 * Playwright helper apps/web/tests/helpers/heavy-profile.ts (tests are never part of the Alpha artifact); the unit test
 * scripts/heavy-profile/heavy-profile.test.ts checks every record with the app's own schemas and restore reader.
 *
 * Plain Node, no dependencies: a seeded PRNG (mulberry32) and a stored ZIP written with node:zlib's crc32.
 *
 *   node scripts/heavy-profile/generate.mjs --out heavy.zip [--end 2026-11-26] [--seed 20261126] [--records records.json]
 *
 * `--out` writes an "Export everything" ZIP (everything.json plus the journal's photo files) that Settings → Your data →
 * Restore from a backup reads. `--records` writes the raw localStorage records ({key: string value}) that the Playwright
 * helper seeds. `--end` defaults to today's local date; the same seed and end date always give the same bytes.
 *
 * Caps of the app this profile meets (see HEAVY_PROFILE.md): Tasks keeps at most 500 tasks (MAX_TASKS), the money log
 * 10,000 entries, the journal's photo store 400 photos, each private module (Health, Habits, Goals and Wealth) 2 MB.
 */
import {writeFileSync} from 'node:fs';
import {crc32} from 'node:zlib';

export const DEFAULT_SEED = 20261126;
export const TIME_ZONE = 'Europe/Amsterdam';
/** The counts the profile aims at (tasks are capped by the app at 500; see the header). */
export const TARGETS = {moneyEntries: 9800, tasks: 500, journalEntries: 700, journalPhotos: 180, foodLogs: 5000, sleepNights: 365, workouts: 156, habits: 8, moodDays: 365, notes: 300, goals: 6};
/** A 1×1 lossless WebP (26 bytes of image data), the stub every journal photo uses. */
export const PHOTO_WEBP_BASE64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

export const KEYS = {
  platform: 'zigoals:platform:v1', habits: 'zigoals:habits:v1', health: 'zigoals:health:v1', portfolio: 'zigoals:portfolio:v1',
  moneyLog: 'zigoals:money-log:v1', accounts: 'zigoals:accounts:v1', budgets: 'zigoals:budgets:v1', bills: 'zigoals:bills:v1',
  tasks: 'zigoals:tasks:v1', journal: 'zigoals:journal:v1', energy: 'zigoals:energy:v1', workouts: 'zigoals:workouts:v1',
  notes: 'zigoals:notes:v1', averageGoals: 'zigoals:average-goals:v1',
};
/** Where each record sits in everything.json (lib/export/everything.ts MODULE_KEYS and DEVICE_KEYS). */
const MODULE_NAMES = {platform: 'finance', habits: 'habits', health: 'health'};
const DEVICE_NAMES = ['moneyLog', 'accounts', 'budgets', 'bills', 'tasks', 'journal', 'energy', 'workouts', 'notes', 'averageGoals'];
export const ONBOARDING_KEY = 'zigoals:onboarding:v1';

// ---- deterministic helpers ---------------------------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pad = (n, w = 2) => String(n).padStart(w, '0');
const DAY_MS = 86_400_000;
const dayMs = day => Date.parse(`${day}T00:00:00.000Z`);
export const addDays = (day, n) => new Date(dayMs(day) + n * DAY_MS).toISOString().slice(0, 10);
const at = (day, hour = 12, minute = 0, second = 0) => `${day}T${pad(hour)}:${pad(minute)}:${pad(second)}.000Z`;
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const money = cents => `${Math.floor(cents / 100)}.${pad(cents % 100)}`;
const month = day => day.slice(0, 7);

/**
 * Builds the heavy profile. Returns the parsed records by key (`records`), their localStorage strings (`storage`), the
 * journal photo ids, the ids reviewers need for dynamic routes, and the counts.
 */
export function buildHeavyProfile({end = localToday(), seed = DEFAULT_SEED} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) throw Error('end must be YYYY-MM-DD');
  const rnd = mulberry32(seed);
  const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const pick = list => list[Math.floor(rnd() * list.length)];
  const chance = p => rnd() < p;
  const hex = n => Array.from({length: n}, () => Math.floor(rnd() * 16).toString(16)).join('');
  const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(['8', '9', 'a', 'b'])}${hex(3)}-${hex(12)}`;
  const start = addDays(end, -729), yearStart = addDays(end, -364);
  const days = Array.from({length: 730}, (_, i) => addDays(start, i)), year = days.slice(-365);
  const created = at(start, 7, 30);
  const records = {};

  // ---- Money: accounts with balances, ~10,000 log entries (some imported from bank files), budgets and bills ----------
  const accountSpecs = [
    {name: 'ING Current', kind: 'cash', institution: 'ING', base: 250_000, label: 'ING Current NL12INGB0001234567'},
    {name: 'Rabo Savings', kind: 'savings', institution: 'Rabobank', base: 1_200_000, label: 'Rabo Savings NL44RABO0123456789'},
    {name: 'Amex Card', kind: 'credit-card', institution: 'American Express', base: 85_000, label: 'Amex ****1009'},
    {name: 'DEGIRO Brokerage', kind: 'investment', institution: 'DEGIRO', base: 3_400_000},
    {name: 'Home mortgage', kind: 'mortgage', institution: 'ABN AMRO', base: 28_500_000, rate: '3.85'},
    {name: 'Bunq Joint', kind: 'cash', institution: 'bunq', base: 120_000, label: 'bunq Joint NL98BUNQ2045678901'},
  ];
  const accounts = accountSpecs.map(spec => {
    const id = uuid();
    const snapshots = Array.from({length: 24}, (_, i) => {
      const d = addDays(end, -(23 - i) * 30), drift = spec.kind === 'mortgage' ? -i * 60_000 : i * Math.round(spec.base * 0.015);
      return {id: uuid(), date: d, value: String(Math.max(1, spec.base + drift + int(-spec.base * 0.03, spec.base * 0.03) | 0)), decimals: 2};
    });
    const payments = spec.kind === 'mortgage' || spec.kind === 'credit-card' ? Array.from({length: 24}, (_, i) => ({id: uuid(), date: addDays(end, -(23 - i) * 30 + 2), value: String(spec.kind === 'mortgage' ? 145_000 : int(20_000, 90_000)), decimals: 2})) : [];
    return {id, kind: spec.kind, name: spec.name, currency: 'EUR', institution: spec.institution, ...(spec.rate ? {ratePercent: spec.rate} : {}), snapshots, payments, createdAt: created, updatedAt: at(end, 9)};
  });
  records.accounts = {version: 1, items: accounts};

  const shops = {
    'Groceries': ['Albert Heijn', 'Jumbo', 'Lidl', 'Picnic', 'Ekoplaza'], 'Food & drink': ['Starbucks', 'Bakkerij Bart', 'Thuisbezorgd', 'Cafe de Jaren', 'Vapiano'],
    'Transport': ['NS Reizen', 'GVB', 'Shell', 'Swapfiets', 'Uber'], 'Shopping': ['Bol.com', 'HEMA', 'Zara', 'Coolblue', 'IKEA'], 'Fun': ['Pathe', 'Spotify concert', 'Escape room', 'Bowling'],
    'Health': ['Etos', 'Kruidvat', 'Apotheek', 'Basic-Fit'], 'Home': ['Gamma', 'Action', 'Praxis'], 'Gifts': ['Rituals', 'Bloemist', 'Bol.com gift'], 'Other': ['Post NL', 'Gemeente', 'Misc'],
  };
  const daily = ['Groceries', 'Groceries', 'Food & drink', 'Food & drink', 'Food & drink', 'Transport', 'Transport', 'Shopping', 'Fun', 'Health', 'Home', 'Gifts', 'Other'];
  const billSpecs = [
    ['Rent', 'Bills', 145_000, 1], ['Vattenfall energy', 'Bills', 14_500, 3], ['Ziggo internet', 'Subscriptions', 5_200, 8], ['Netflix', 'Subscriptions', 1_399, 12],
    ['Spotify', 'Subscriptions', 1_099, 15], ['Zilveren Kruis health insurance', 'Health', 14_850, 1], ['Waternet', 'Bills', 3_100, 20], ['KPN mobile', 'Subscriptions', 2_500, 22],
    ['Gym membership', 'Health', 2_999, 5], ['iCloud storage', 'Subscriptions', 299, 18], ['Car insurance', 'Bills', 6_400, 25], ['Newspaper', 'Subscriptions', 2_200, 10],
  ];
  const entries = [];
  let n = 0;
  const add = (entry, account) => {
    n++;
    const id = `hp-m${pad(n, 5)}`;
    const imported = account && chance(0.55);
    entries.push({id, ...entry, ...(imported ? {account: account.label, ref: `${entry.kind === 'income' ? 'in' : 'out'}|${entry.currency}|${account.institution.slice(0, 4).toUpperCase()}-${entry.date.replaceAll('-', '')}-${pad(n, 5)}`} : {})});
  };
  const banked = accountSpecs.filter(a => a.label);
  for (const day of days) {
    const dom = Number(day.slice(8, 10));
    if (dom === 25) add({kind: 'income', amount: money(int(412_000, 418_000)), currency: 'EUR', category: 'Salary', note: 'Acme BV salary', date: day, createdAt: at(day, 9)}, banked[0]);
    if (dom === 3 && chance(0.6)) add({kind: 'income', amount: money(int(20_000, 90_000)), currency: 'EUR', category: 'Freelance', note: 'Design invoice', date: day, createdAt: at(day, 10)}, banked[0]);
    for (const [title, category, cents, due] of billSpecs) if (dom === due) add({kind: 'expense', amount: money(cents), currency: 'EUR', category, note: title, date: day, createdAt: at(day, 8, 15)}, banked[0]);
  }
  const fixed = entries.length, perDay = (TARGETS.moneyEntries - fixed) / days.length;
  let carry = 0;
  for (const day of days) {
    carry += perDay;
    for (; carry >= 1; carry--) {
      const category = pick(daily), usd = chance(0.03);
      const cents = category === 'Groceries' ? int(800, 9_500) : category === 'Food & drink' ? int(250, 4_500) : category === 'Shopping' ? int(900, 18_000) : int(300, 6_000);
      add({kind: 'expense', amount: money(cents), currency: usd ? 'USD' : 'EUR', category, note: pick(shops[category]), date: day, createdAt: at(day, int(7, 22), int(0, 59), int(0, 59)),
        ...(chance(0.06) ? {paidWith: pick(['cash', 'debit', 'credit'])} : {})}, usd ? undefined : pick(banked));
    }
  }
  while (entries.length > TARGETS.moneyEntries) entries.pop();
  entries.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  records.moneyLog = {version: 1, entries, weekStartsOn: 'monday', currency: 'EUR', budget: {weekly: '350', currency: 'EUR'},
    accounts: {notes: {[accounts[0].id]: 'Main account; salary lands here.'}, order: accounts.map(a => a.id)}};
  const budgetCats = [['Groceries', 450], ['Food & drink', 220], ['Transport', 160], ['Shopping', 250], ['Fun', 120], ['Health', 200], ['Home', 100], ['Subscriptions', 140], ['Bills', 1_700], ['Gifts', 60]];
  records.budgets = {version: 1, budgets: budgetCats.map(([category, monthly], i) => ({id: `hp-budget-${i + 1}`, category, currency: 'EUR', monthly: String(monthly), rollover: i % 3 === 0, since: month(start), order: i}))};
  records.bills = {version: 1, dismissed: [], bills: billSpecs.map(([title, category, cents, due], i) => {
    let next = `${end.slice(0, 8)}${pad(due)}`; if (next < end) next = `${month(addDays(`${end.slice(0, 8)}01`, 32))}-${pad(due)}`;
    return {id: `hp-bill-${i + 1}`, title, amount: money(cents), currency: 'EUR', cadence: 'monthly', nextDue: next, origin: i % 2 ? 'detected' : 'manual', category, ...(i % 4 === 0 ? {autopay: true} : {}), createdAt: created};
  })};

  // ---- Goals and Wealth: manual positions, six goals with plans and two years of contributions ------------------------
  const positionSpecs = [
    ['hp-cash', 'Emergency cash', 'EUR', 'Cash', '1250000', 2, '1250000', 'EUR'], ['hp-vwrl', 'Vanguard FTSE All-World', 'VWRL', 'Stocks', '180', 0, '2142000', 'EUR'],
    ['hp-btc', 'Bitcoin cold wallet', 'BTC', 'Crypto', '35000000', 8, '2100000', 'USD'], ['hp-gold', 'Gold bars', 'GOLD', 'Precious Metals', '4', 0, '1040000', 'USD'],
    ['hp-home', 'Apartment Oost', 'HOME', 'Property', '1', 0, '41000000', 'EUR'], ['hp-savings', 'Rabo savings goal pot', 'EUR', 'Cash', '1830000', 2, '1830000', 'EUR'],
  ];
  const positions = positionSpecs.map(([id, name, asset, assetClass, quantity, decimals, value, currency]) => ({id, providerId: name, sourceType: 'MANUAL', network: 'manual', account: 'heavy-profile', asset, denom: asset, quantity, decimals, assetClass,
    valuationMode: 'manual', quoteCurrency: currency, valuation: {value, currency, decimals: 2, source: 'MANUAL', observedAt: at(end, 8)}, liquidity: assetClass === 'Property' ? 'LOCKED' : 'LIQUID', verification: 'MANUAL', sync: 'MANUAL',
    observedAt: at(end, 8), trackingStartedAt: created, provenance: 'Manual entry', notes: name, risk: '', executionAuthority: 'NONE'}));
  const goalSpecs = [
    ['7001', 'Emergency fund', 'Emergency Fund', '1500000', 'hp-cash', '1250000', 25_000], ['7002', 'House renovation', 'First Home', '3000000', 'hp-savings', '1830000', 40_000],
    ['7003', 'Financial freedom by 50', 'Financial Freedom', '50000000', 'hp-vwrl', '180', 60_000], ['7004', 'Japan trip 2027', 'Travel', '600000', 'hp-savings', '0', 20_000],
    ['7005', 'Master degree fund', 'Education', '1200000', 'hp-cash', '0', 15_000], ['7006', 'New bike', 'Custom', '250000', 'hp-cash', '0', 10_000],
  ];
  const goals = goalSpecs.map(([id, name, category, target, , , plan], i) => ({id, name, network: 'zigchain-1', category, ...(i === 0 ? {pinned: true} : {}), type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target,
    notes: `Two-year plan · ${name}`, createdAt: created, targetDate: addDays(end, 180 + i * 120), plan: {amount: String(plan), asset: 'EUR', decimals: 2, cadence: 'monthly', nextDate: addDays(end, 5), active: true},
    milestones: [{id: `${id}-m1`, title: 'Quarter of the way', done: true}, {id: `${id}-m2`, title: 'Halfway', done: i % 2 === 0}]}));
  const allocations = goalSpecs.filter(g => g[5] !== '0').map(([goalId, , , , positionId, quantity]) => ({goalId, positionId, quantity: positionId === 'hp-vwrl' ? '90' : String(Math.floor(Number(quantity) / 2))}));
  const contributions = [];
  for (const [goalId, , , , positionId, , plan] of goalSpecs) for (let m = 0; m < 24; m++) {
    const d = addDays(start, m * 30 + 26);
    contributions.push({id: `hp-c-${goalId}-${m}`, goalId, goalScope: 'private', positionId, direction: 'IN', quantity: String(plan), asset: 'EUR', decimals: 2, occurredAt: at(d, 18), provenance: 'MANUAL_ATTRIBUTION', fundingMode: 'HISTORY_ONLY', note: 'Monthly transfer'});
  }
  const valuationSnapshots = [];
  for (const p of positions) for (let m = 0; m < 24; m++) {
    const growth = 700 + m * 13 + int(-20, 20);
    valuationSnapshots.push({id: `hp-v-${p.id}-${m}`, positionId: p.id, quantity: p.quantity, quantityDecimals: p.decimals, value: String(BigInt(p.valuation.value) * BigInt(growth) / 1000n), decimals: 2, currency: p.valuation.currency, source: 'MANUAL', capturedAt: at(addDays(start, m * 30 + 1), 8)});
  }
  records.platform = {schemaVersion: 3, kind: 'zigoals-platform', positions, goals, allocations, snapshots: [], contributions, valuationSnapshots, goalHistory: [], watchlist: [],
    assetEvents: positions.map((p, i) => ({id: `hp-asset-${i}`, positionId: p.id, name: p.providerId, assetClass: p.assetClass, kind: 'added', at: created, provenance: 'PRIVATE_EDIT'}))};

  // ---- Portfolio: one real portfolio, three coins, two years of buys and a few sells --------------------------------
  const coins = [['bitcoin', 'Bitcoin', 'BTC', 60_000], ['ethereum', 'Ethereum', 'ETH', 2_800], ['cardano', 'Cardano', 'ADA', 0.45]].map(([id, name, symbol, price]) => ({ref: {provider: 'coingecko', kind: 'coin', id}, name, symbol, price}));
  const transactions = [];
  for (let m = 0; m < 24; m++) for (const c of coins) {
    const d = addDays(start, m * 30 + 3), price = c.price * (0.7 + m * 0.025), qty = (150 / price);
    transactions.push({id: `hp-tx-${c.ref.id}-${m}`, coin: `coingecko:coin:${c.ref.id}`, kind: m % 9 === 8 ? 'sell' : 'buy', quantity: qty.toFixed(c.ref.id === 'cardano' ? 2 : 6), price: price.toFixed(2), fee: '1.5', date: d, note: m % 9 === 8 ? 'Rebalance' : 'Monthly DCA', createdAt: at(d, 19)});
  }
  records.portfolio = {version: 1, portfolios: [{id: 'hp-portfolio', name: 'Long-term coins', kind: 'real', currency: 'EUR', createdAt: created, coins: coins.map(({ref, name, symbol}) => ({ref, name, symbol})), transactions}]};

  // ---- Tasks: 500 (the app's cap), projects, sections, labels, due dates, some done, some repeating, a few comments -----
  const projectNames = ['Home', 'Work · Q-planning', 'Side project', 'Health admin', 'Finance admin', 'Garden', 'Travel Japan', 'Learning'];
  const projects = projectNames.map((name, i) => ({id: `hp-proj-${i + 1}`, name, colour: ['blue', 'red', 'violet', 'green', 'orange', 'teal', 'pink', 'yellow'][i], order: i}));
  const sections = projects.flatMap((p, i) => ['Next', 'Later'].map((name, j) => ({id: `hp-sec-${i + 1}-${j + 1}`, projectId: p.id, name, order: j})));
  const labels = ['errand', 'phone', 'computer', 'deep-work', 'quick', 'waiting', 'weekend', 'money', 'family', 'urgent'];
  const verbs = ['Call', 'Email', 'Buy', 'Fix', 'Plan', 'Review', 'Book', 'Pay', 'Clean', 'Write', 'Read', 'Update', 'Cancel', 'Order', 'Check'];
  const objects = ['dentist appointment', 'insurance renewal', 'bike tyres', 'quarterly report', 'birthday gift for Sam', 'tax return', 'garden shed', 'flight to Osaka', 'kitchen tap', 'budget sheet', 'passport photos', 'team offsite', 'library books', 'boiler service', 'phone contract'];
  const tasks = [];
  for (let i = 1; i <= TARGETS.tasks; i++) {
    const project = chance(0.8) ? pick(projects) : undefined, createdDay = days[int(0, days.length - 1)];
    const t = {id: `hp-task-${pad(i, 4)}`, title: `${pick(verbs)} ${pick(objects)}${chance(0.3) ? ` #${i}` : ''}`, priority: 'normal', level: int(1, 4), createdAt: at(createdDay, 9, int(0, 59))};
    t.priority = t.level <= 2 ? 'high' : t.level === 3 ? 'normal' : 'low';
    if (project) { t.projectId = project.id; if (chance(0.6)) t.sectionId = `${project.id.replace('proj', 'sec')}-${int(1, 2)}`; }
    if (chance(0.5)) t.labels = [...new Set([pick(labels), ...(chance(0.3) ? [pick(labels)] : [])])];
    if (chance(0.7)) t.due = addDays(end, int(-40, 60));
    if (chance(0.2)) t.time = `${pad(int(8, 19))}:${pick(['00', '15', '30', '45'])}`;
    if (i <= 60) { // repeating, with their history of completions
      t.recur = pick([{every: 'day', interval: 1}, {every: 'week', interval: 1}, {every: 'week', interval: 2}, {every: 'month', interval: 1}]);
      t.due = addDays(end, int(0, 6));
      const step = t.recur.every === 'day' ? 1 : t.recur.every === 'week' ? 7 * t.recur.interval : 30;
      t.completions = Array.from({length: Math.min(60, Math.floor(700 / step))}, (_, k) => { const d = addDays(t.due, -step * (k + 1)); return {at: at(d, 18), due: d}; }).reverse();
    } else if (i <= 210) { const d = addDays(end, -int(0, 28)); t.doneAt = at(d, 17, int(0, 59)); }
    if (i % 11 === 0) t.comments = Array.from({length: int(1, 4)}, (_, k) => ({id: `hp-cm-${i}-${k}`, at: at(addDays(createdDay, k), 12), text: pick(['Waiting for a reply.', 'Asked again on the phone.', 'Done half; rest on Saturday.', 'Price was €45, cheaper elsewhere?', 'See the email from Tuesday.'])}));
    if (i % 17 === 0) t.notes = 'Keep the receipt.\n- check the warranty\n- note the order number';
    tasks.push(t);
  }
  records.tasks = {version: 1, tasks, projects, sections, labelColors: {urgent: 'red', money: 'green', family: 'pink'}};

  // ---- Journal: 700 entries over two years, ~180 photo stubs ----------------------------------------------------------
  const moods = ['Quiet day.', 'Long walk by the canal.', 'Work was busy but good.', 'Cooked for friends.', 'Tired, early night.', 'Rainy, read a lot.', 'Ran 5 km before work.', 'Call with mum.', 'Finished the chapter.', 'Grateful for small things.'];
  const tagsPool = ['work', 'family', 'gratitude', 'health', 'travel', 'reading', 'friends', 'run'];
  const journalDays = days.filter(() => chance(700 / 730)).slice(-TARGETS.journalEntries);
  while (journalDays.length < TARGETS.journalEntries) journalDays.unshift(addDays(journalDays[0] ?? end, -1));
  const photoIds = [];
  const journalEntries = journalDays.map((day, i) => {
    const e = {id: `hp-j${pad(i + 1, 4)}`, date: day, text: `${pick(moods)} ${pick(moods)}${chance(0.3) ? `\n\n${pick(moods)}` : ''}`, createdAt: at(day, 21, int(0, 59))};
    if (chance(0.6)) e.tags = [...new Set([pick(tagsPool), pick(tagsPool)])];
    if (chance(0.05)) e.star = true;
    if (photoIds.length < TARGETS.journalPhotos && i % 4 === 1) { const count = i % 20 === 1 ? 2 : 1; e.photos = Array.from({length: count}, (_, k) => `m-hp${pad(i + 1, 4)}p${k}`); photoIds.push(...e.photos); }
    return e;
  });
  records.journal = {version: 1, entries: journalEntries, shareWithAi: false, followUps: true, journals: [{id: 'j-personal', name: 'Personal', theme: 'violet'}]};

  // ---- Health: foods, 5,000 food logs, weights, steps, a year of sleep and moods -----------------------------------
  const foodSpecs = [
    ['Oatmeal with milk', 250, 290, 11000, 45000, 7000, 'Breakfast'], ['Greek yoghurt', 150, 146, 15000, 6000, 7500, 'Breakfast'], ['Whole wheat toast', 35, 90, 4000, 15000, 1200, 'Breakfast'],
    ['Banana', 120, 107, 1300, 27000, 400, 'Snacks'], ['Apple', 180, 94, 500, 25000, 300, 'Snacks'], ['Coffee with milk', 200, 35, 2000, 3000, 1500, 'Breakfast'],
    ['Chicken salad', 300, 420, 32000, 14000, 24000, 'Lunch'], ['Cheese sandwich', 150, 380, 17000, 38000, 17000, 'Lunch'], ['Tomato soup', 300, 150, 4000, 22000, 5000, 'Lunch'],
    ['Pasta bolognese', 400, 610, 30000, 75000, 19000, 'Dinner'], ['Salmon with rice', 380, 560, 34000, 55000, 20000, 'Dinner'], ['Vegetable curry', 400, 480, 12000, 62000, 18000, 'Dinner'],
    ['Stamppot', 400, 450, 14000, 52000, 19000, 'Dinner'], ['Almonds', 30, 174, 6300, 6500, 15000, 'Snacks'], ['Dark chocolate', 20, 110, 1500, 9000, 8000, 'Snacks'], ['Protein shake', 300, 190, 30000, 8000, 3500, 'Snacks'],
  ];
  const foods = foodSpecs.map(([name, grams, kcal, proteinMg, carbsMg, fatMg], i) => ({id: `health_food-${pad(i + 1, 4)}`, name, brand: '', servingGrams: grams, nutrients: {kcal, proteinMg, carbsMg, fatMg}, createdAt: created, updatedAt: created}));
  const diary = [];
  const perFoodDay = TARGETS.foodLogs / days.length;
  let foodCarry = 0, d = 0;
  for (const day of days) {
    foodCarry += perFoodDay;
    for (; foodCarry >= 1; foodCarry--) {
      d++;
      const fi = int(0, foods.length - 1), food = foods[fi], meal = foodSpecs[fi][6];
      diary.push({id: `health_d${pad(d, 7)}`, sourceId: food.id, sourceKind: 'food', snapshot: {name: food.name, servingGrams: food.servingGrams, nutrients: food.nutrients}, date: day, meal, quantityMilli: pick([500, 1000, 1000, 1000, 1500, 2000]), createdAt: at(day, 12), updatedAt: at(day, 12)});
    }
  }
  while (diary.length < TARGETS.foodLogs) { d++; const food = foods[0]; diary.push({id: `health_d${pad(d, 7)}`, sourceId: food.id, sourceKind: 'food', snapshot: {name: food.name, servingGrams: food.servingGrams, nutrients: food.nutrients}, date: end, meal: 'Breakfast', quantityMilli: 1000, createdAt: at(end, 8), updatedAt: at(end, 8)}); }
  const weights = days.filter((_, i) => i % 7 === 0).map((day, i) => ({id: `health_w${pad(i + 1, 7)}`, date: day, grams: 82_000 - i * 40 + int(-400, 400), createdAt: at(day, 7), updatedAt: at(day, 7)}));
  const activity = year.map((day, i) => ({id: `health_a${pad(i + 1, 7)}`, date: day, name: 'Walking', steps: int(3_000, 14_000), minutes: int(20, 90), createdAt: at(day, 21), updatedAt: at(day, 21)}));
  const nights = year.map((day, i) => {
    const bed = int(22 * 60 + 15, 24 * 60 + 45), length = int(360, 510), s = dayMs(addDays(day, -1)) + bed * 60_000;
    return {id: `health_sleep-hp${pad(i + 1, 6)}`, kind: 'night', start: new Date(s).toISOString(), end: new Date(s + length * 60_000).toISOString(), timeZone: TIME_ZONE, latencyMin: int(5, 30), awakeMin: int(0, 40),
      quality: int(2, 5), ...(chance(0.25) ? {tags: [pick(['caffeine', 'alcohol', 'screens', 'exercise', 'stress'])]} : {}), source: 'manual', createdAt: at(day, 7, 30), updatedAt: at(day, 7, 30)};
  });
  const moodDays = Object.fromEntries(year.map(day => [day, {mood: int(2, 5), ...(chance(0.15) ? {note: pick(['Calm', 'Busy day', 'Good run', 'Slept badly'])} : {}), at: at(day, 20)}]));
  records.health = {schemaVersion: 4, kind: 'zigoals-health', targets: {kcal: 2300, proteinMg: 120_000, carbsMg: null, fatMg: null, weightGrams: 78_000, steps: 8000},
    foods, recipes: [], diary, weights, activity, sleep: {version: 1, nights, goal: {minutes: 450, updatedAt: created}}, moods: {version: 1, days: moodDays}};
  records.energy = {version: 1, days: Object.fromEntries(year.map(day => [day, {energy: int(2, 5), at: at(day, 20, 5)}]))};

  // ---- Workouts: a year, three a week ------------------------------------------------------------------------------
  const plans = {
    'Push day': [['bench-press', 'Bench press', 60], ['overhead-press', 'Overhead press', 35], ['triceps-pushdown', 'Triceps pushdown', 25]],
    'Pull day': [['deadlift', 'Deadlift', 100], ['barbell-row', 'Barbell row', 50], ['bicep-curl', 'Bicep curl', 12]],
    'Leg day': [['squat', 'Squat', 80], ['romanian-deadlift', 'Romanian deadlift', 60], ['calf-raise', 'Calf raise', 60]],
  };
  const workouts = [];
  for (let w = 0; w < TARGETS.workouts; w++) {
    const day = addDays(yearStart, Math.floor(w * 365 / TARGETS.workouts)), id = `hp-w${pad(w + 1, 4)}`;
    if (w % 4 === 3) { workouts.push({id, name: 'Easy run', date: day, type: 'cardio', startedAt: at(day, 18), endedAt: at(day, 18, 32), exercises: [{id: `${id}-e0`, exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: `${id}-e0-s0`, kind: 'normal', distanceKm: 5 + (w % 3), seconds: 1700 + int(0, 400), done: true}]}]}); continue; }
    const name = ['Push day', 'Pull day', 'Leg day'][w % 3], bump = Math.floor(w / 12) * 2.5;
    workouts.push({id, name, date: day, type: 'strength', startedAt: at(day, 7), endedAt: at(day, 7, 50), exercises: plans[name].map(([exerciseId, label, kg], i) => ({id: `${id}-e${i}`, exerciseId, name: label, measure: 'weight-reps',
      sets: Array.from({length: 4}, (_, j) => ({id: `${id}-e${i}-s${j}`, kind: j === 0 ? 'warmup' : 'normal', weightKg: j === 0 ? Math.round(kg / 2) : kg + bump, reps: j === 0 ? 10 : int(5, 9), done: true}))}))});
  }
  records.workouts = {version: 1, workouts, templates: [], exercises: [], restSeconds: 90};

  // ---- Habits: eight habits with a year of check-ins ----------------------------------------------------------------
  const habitSpecs = [['Meditate 10 minutes', 'Mind', 'morning', 0.8], ['Drink 2 L water', 'Health', 'anytime', 0.7], ['Read 20 pages', 'Learning', 'evening', 0.6], ['Stretch', 'Fitness', 'morning', 0.5],
    ['No phone after 22:00', 'Sleep', 'evening', 0.55], ['Walk 8,000 steps', 'Fitness', 'anytime', 0.65], ['Journal', 'Mind', 'evening', 0.75], ['Practise Japanese', 'Learning', 'afternoon', 0.6]];
  const habits = habitSpecs.map(([title, category, timeOfDay, rate]) => {
    const rule = {from: yearStart, schedule: {kind: 'daily'}, type: 'build', measurement: {kind: 'boolean'}, target: 1, targetPeriod: 'day', endCondition: {kind: 'none'}, state: 'active'};
    const entries = year.filter(() => chance(rate)).map(day => ({date: day, count: 1, disposition: 'logged', note: '', ...(chance(0.1) ? {mood: pick(['energized', 'good', 'neutral', 'calm'])} : {}), updatedAt: at(day, 20, 30)}));
    return {id: uuid(), title, category, description: '', notes: '', timeOfDay, endCondition: {kind: 'none'}, startDate: yearStart, createdAt: at(yearStart, 8), updatedAt: at(end, 20, 30), rules: [rule], entries};
  });
  records.habits = {schemaVersion: 2, kind: 'zigoals-habits', timeZone: TIME_ZONE, habits};

  // ---- Notes: 300 (inbox, daily and topic notes; some Markdown) ----------------------------------------------------
  const topics = ['Recipe ideas', 'Book notes', 'Trip planning', 'Meeting notes', 'Garden plan', 'Gift ideas', 'Workout log thoughts', 'Budget review', 'Project ideas', 'Quotes'];
  const notes = Array.from({length: TARGETS.notes}, (_, i) => {
    const day = days[Math.floor(i * days.length / TARGETS.notes)], kind = i % 5 === 0 ? 'daily' : i % 3 === 0 ? 'inbox' : 'topic', markdown = i % 2 === 0;
    const body = markdown ? `# ${pick(topics)}\n\n- **${pick(objects)}**\n- ${pick(moods)}\n\n> ${pick(moods)}\n\n1. First\n2. Second\n\n[[${pick(topics)}]]` : `${pick(moods)} ${pick(moods)}`;
    return {id: `hp-note-${pad(i + 1, 4)}`, kind, title: kind === 'daily' ? '' : `${pick(topics)} ${i + 1}`, body, ...(kind === 'daily' ? {day} : {}), source: 'text', ...(chance(0.4) ? {tags: [pick(tagsPool)]} : {}), ...(i < 5 ? {pinned: true} : {}), createdAt: at(day, 13), updatedAt: at(day, 13, 30)};
  });
  records.notes = {version: 1, notes, voice: false};

  // ---- Average goals (Goals → average) -------------------------------------------------------------------------------
  records.averageGoals = {version: 1, goals: [
    {id: 'hp-avg-sleep', name: 'Sleep 7.5 hours', metric: 'sleep-hours', unit: 'h a night', target: 7.5, direction: 'at-least', windowDays: 30, status: 'active', createdAt: at(yearStart, 8), entries: []},
    {id: 'hp-avg-steps', name: 'Walk 8,000 steps a day', metric: 'steps', unit: 'steps a day', target: 8000, direction: 'at-least', windowDays: 14, status: 'active', createdAt: at(yearStart, 8), entries: []},
    {id: 'hp-avg-screen', name: 'Screen time under 2 h', metric: 'custom', unit: 'h a day', target: 2, direction: 'at-most', windowDays: 7, status: 'active', createdAt: at(yearStart, 8), entries: year.map(day => ({day, value: Math.round((1 + rnd() * 2.5) * 10) / 10}))},
  ]};

  const storage = Object.fromEntries(Object.entries(records).map(([name, value]) => [KEYS[name], JSON.stringify(value)]));
  const ids = {
    goals: goals.map(g => g.id), trackedGoals: goals.map(g => g.id), averageGoals: records.averageGoals.goals.map(g => g.id), wealthAssets: positions.map(p => p.id),
    portfolioCoins: coins.map(c => c.ref.id), portfolio: 'hp-portfolio', accounts: accounts.map(a => a.id),
  };
  const counts = {
    moneyEntries: entries.length, importedMoneyEntries: entries.filter(e => e.ref).length, accounts: accounts.length, budgets: records.budgets.budgets.length, bills: records.bills.bills.length,
    tasks: tasks.length, doneTasks: tasks.filter(t => t.doneAt).length, repeatingTasks: tasks.filter(t => t.recur).length, taskComments: tasks.reduce((s, t) => s + (t.comments?.length ?? 0), 0), projects: projects.length,
    journalEntries: journalEntries.length, journalPhotos: photoIds.length, foodLogs: diary.length, sleepNights: nights.length, moodDays: Object.keys(moodDays).length, weights: weights.length, activityDays: activity.length,
    workouts: workouts.length, habits: habits.length, habitCheckIns: habits.reduce((s, h) => s + h.entries.length, 0), notes: notes.length, markdownNotes: notes.filter(x => x.body.startsWith('# ')).length,
    goals: goals.length, averageGoals: records.averageGoals.goals.length, contributions: contributions.length, portfolioTransactions: transactions.length,
  };
  const bytes = Object.fromEntries(Object.entries(storage).map(([k, v]) => [k, v.length]));
  return {end, seed, start, records, storage, photoIds, ids, counts, chars: Object.values(bytes).reduce((a, b) => a + b, 0), bytes};
}

/** The parsed everything.json of an "Export everything" holding the profile (lib/export/everything.ts EverythingJson). */
export function everythingJson(profile) {
  const {records, end} = profile;
  return {format: 'zigoals-everything', version: 1, exportedAt: at(end, 20), app: {version: 'heavy-profile', commit: 'test-only'},
    note: 'Heavy profile (test-only, generated by scripts/heavy-profile/generate.mjs). Fictional records.',
    modules: Object.fromEntries(Object.entries(MODULE_NAMES).map(([name, module]) => [module, records[name]])),
    portfolio: records.portfolio, device: Object.fromEntries(DEVICE_NAMES.map(name => [name, records[name]])), unreadable: []};
}

// ---- a stored (uncompressed) ZIP, enough for lib/import/zip-stream.ts -------------------------------------------------
export function storedZip(files, modified = new Date()) {
  const dosTime = ((modified.getUTCHours() << 11) | (modified.getUTCMinutes() << 5) | (modified.getUTCSeconds() >> 1)) & 0xffff;
  const dosDate = (((modified.getUTCFullYear() - 1980) << 9) | ((modified.getUTCMonth() + 1) << 5) | modified.getUTCDate()) & 0xffff;
  const locals = [], centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8'), data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data), crc = crc32(data) >>> 0;
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12); central.writeUInt16LE(dosDate, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, data); centrals.push(central, name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = centrals.reduce((s, b) => s + b.length, 0), endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); endRecord.writeUInt16LE(files.length, 8); endRecord.writeUInt16LE(files.length, 10); endRecord.writeUInt32LE(centralSize, 12); endRecord.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, endRecord]);
}

/** The "Export everything" ZIP of the profile: everything.json and one WebP stub per journal photo. */
export function heavyProfileZip(profile) {
  const photo = Buffer.from(PHOTO_WEBP_BASE64, 'base64');
  return storedZip([{name: 'everything.json', data: JSON.stringify(everythingJson(profile), null, 1)}, ...profile.photoIds.map(id => ({name: `journal/photos/${id}.webp`, data: photo}))], new Date(at(profile.end, 20)));
}

function main(argv) {
  const arg = name => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
  const out = arg('out'), recordsOut = arg('records');
  if (!out && !recordsOut) { console.error('Usage: node scripts/heavy-profile/generate.mjs --out <file.zip> [--records <file.json>] [--end YYYY-MM-DD] [--seed N]'); process.exit(2); }
  const profile = buildHeavyProfile({end: arg('end') ?? localToday(), seed: arg('seed') ? Number(arg('seed')) : DEFAULT_SEED});
  if (out) writeFileSync(out, heavyProfileZip(profile));
  if (recordsOut) writeFileSync(recordsOut, JSON.stringify({end: profile.end, seed: profile.seed, storage: profile.storage, photoIds: profile.photoIds, ids: profile.ids, counts: profile.counts}));
  console.log(JSON.stringify({end: profile.end, seed: profile.seed, counts: profile.counts, localStorageChars: profile.chars, bytesPerKey: profile.bytes, ids: profile.ids}, null, 1));
}
// Run as a script only (no import.meta: Playwright's loader turns this module into CommonJS for the helper).
if (/[\\/]heavy-profile[\\/]generate\.mjs$/.test(process.argv[1] ?? '')) main(process.argv.slice(2));

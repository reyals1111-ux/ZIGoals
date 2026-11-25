import {normalize, type SearchItem} from '../search/engine';
import type {SettingsGroupId} from '../settings-folds';

/**
 * Session AW Part 3 (simplicity c): the search on the Settings page, over a static index of every section and anchor in
 * Settings, the lower groups (components/settings/settings-later.tsx) and the ZIGi/NOVA group included. Nothing here
 * imports a section's component, so the page's first scripts stay as they are and the lower groups keep their own chunk;
 * the field (components/settings/settings-search.tsx) loads this module only when it is first used.
 *
 * Each entry names the element id it covers (`anchor`), where its result jumps (`jump`, when the anchor is a card that
 * shows only in some browsers or with an AI connected) or the page it opens (`href`), its group, and words a person
 * might type, in English and in Dutch. A jump to a fragment already opens the right fold and lays the groups out in full
 * (SettingsRenderAll, KeepSettingsJump, settings-late-jump.ts). The index is kept honest by index.test.ts, which reads
 * the Settings source files and fails when an anchor there is missing here.
 * Global Search (lib/search/static.ts) can read the same entries through `settingsSearchItems`.
 */
export type SettingsEntry = {
  /** The element id this entry covers (unique per entry together with `label`). */
  anchor: string;
  label: string;
  group: SettingsGroupId;
  en: readonly string[];
  nl: readonly string[];
  /** Where the result jumps when it is not `anchor` itself (an element that is always there). */
  jump?: string;
  /** A page of its own instead of a jump within Settings. */
  href?: string;
  /** Shown only once the chain is chosen (lib/chain-choice.ts), as its section is. */
  chain?: true;
};

/** The groups' titles, as app/app/settings/page.tsx's SETTINGS_GROUPS has them (index.test.ts checks). */
export const SETTINGS_GROUP_TITLES: Readonly<Record<SettingsGroupId, string>> = {
  'settings-look': 'Appearance',
  'settings-data': 'Data & privacy',
  'settings-app': 'Your app',
  'settings-areas': 'Your areas',
  'settings-account': 'Account & devices',
  'settings-zigi': 'Your assistant',
  'settings-help': 'Help & diagnostics',
};

const E = (anchor: string, group: SettingsGroupId, label: string, en: readonly string[], nl: readonly string[], more: Partial<Pick<SettingsEntry, 'jump' | 'href' | 'chain'>> = {}): SettingsEntry => ({anchor, label, group, en, nl, ...more});

/** Every section and anchor in Settings, in page order. */
export const SETTINGS_INDEX: readonly SettingsEntry[] = [
  // Appearance
  E('settings-look', 'settings-look', 'Appearance', ['appearance', 'look', 'display', 'screen'], ['uiterlijk', 'weergave', 'scherm']),
  E('appearance', 'settings-look', 'Theme: Nebula, Dark or Light', ['theme', 'dark mode', 'dark', 'light mode', 'light', 'nebula', 'colours', 'colors', 'night mode', 'black'], ['thema', 'donkere modus', 'donker', 'lichte modus', 'licht', 'kleuren', 'nachtmodus', 'zwart']),
  E('appearance', 'settings-look', 'Motion: Full, Calm or Off', ['motion', 'animation', 'animations', 'reduced motion', 'reduce motion', 'moving', 'still', 'calm', 'stars'], ['beweging', 'animatie', 'animaties', 'minder beweging', 'stilstaand', 'rustig', 'sterren']),
  E('customize-title', 'settings-look', 'Font, text size, density and glow', ['font', 'letters', 'text size', 'bigger text', 'larger text', 'large', 'density', 'compact', 'glow', 'dyslexia', 'reading-friendly', 'readable', 'serif', 'pure black', 'oled', 'high contrast', 'contrast'], ['lettertype', 'tekstgrootte', 'grotere letters', 'groter', 'dichtheid', 'compact', 'gloed', 'dyslexie', 'leesbaar', 'puur zwart', 'hoog contrast', 'contrast'], {jump: 'appearance'}),
  // Data & privacy
  E('settings-data', 'settings-data', 'Data & privacy', ['data', 'privacy', 'records', 'my data'], ['gegevens', 'privacy', 'mijn gegevens']),
  E('privacy', 'settings-data', 'Privacy & storage', ['privacy', 'private', 'storage', 'browser', 'this device', 'what is stored', 'encryption'], ['privacy', 'privé', 'opslag', 'browser', 'dit apparaat', 'opgeslagen', 'versleuteling']),
  E('your-data', 'settings-data', 'Your data: where each part lives', ['your data', 'data health', 'where is my data', 'what zigi can see', 'catalogue', 'device'], ['jouw gegevens', 'waar staan mijn gegevens', 'wat zigi ziet', 'overzicht'], {href: '/app/settings/data'}),
  E('restore', 'settings-data', 'Restore a backup', ['restore', 'restore backup', 'bring back', 'import backup', 'zip', 'new phone', 'recover'], ['terugzetten', 'herstellen', 'reservekopie terugzetten', 'nieuwe telefoon'], {href: '/app/settings/data#restore'}),
  E('backup-restore', 'settings-data', 'Backup & restore', ['backup', 'back up', 'backups', 'restore', 'copy', 'save a copy', 'safe'], ['reservekopie', 'back-up', 'backup', 'terugzetten', 'kopie', 'veilig bewaren']),
  E('private-vault', 'settings-data', 'Encrypted backup (a protected copy)', ['encrypted backup', 'protected copy', 'recovery secret', 'password', 'vault', 'secure'], ['versleutelde reservekopie', 'beveiligde kopie', 'herstelgeheim', 'wachtwoord', 'kluis', 'beveiligd']),
  E('backup-platform', 'settings-data', 'Backup of Goals and Wealth', ['goals backup', 'wealth backup', 'positions', 'money backup'], ['doelen', 'vermogen', 'reservekopie doelen']),
  E('backup-habits', 'settings-data', 'Backup of Habits', ['habits backup', 'check-ins'], ['gewoontes', 'reservekopie gewoontes']),
  E('backup-health', 'settings-data', 'Backup of Health', ['health backup', 'food', 'meals', 'weight'], ['gezondheid', 'reservekopie gezondheid', 'voeding']),
  E('export-everything', 'settings-data', 'Export everything', ['export', 'download', 'zip', 'csv', 'all my data', 'take my data', 'data out', 'gdpr', 'spreadsheet'], ['exporteren', 'alles exporteren', 'downloaden', 'al mijn gegevens', 'gegevens meenemen', 'avg']),
  E('switch-import', 'settings-data', 'Import from other apps', ['import', 'switch', 'other app', 'apple health', 'samsung health', 'oura', 'loop', 'daylio', 'habitica', 'ynab', 'strong', 'hevy', 'csv'], ['importeren', 'overstappen', 'andere app', 'gegevens binnenhalen']),
  E('erase-everything', 'settings-data', 'Erase everything on this device', ['erase', 'erase everything', 'delete', 'delete all', 'wipe', 'clear', 'remove', 'reset', 'start over', 'factory reset'], ['wissen', 'alles wissen', 'verwijderen', 'alles verwijderen', 'leegmaken', 'opnieuw beginnen', 'resetten']),
  E('settings-hide-figures-title', 'settings-data', 'Calories and weight on screen', ['hide calories', 'hide weight', 'calories', 'weight', 'numbers', 'figures', 'scale'], ['calorieën verbergen', 'gewicht verbergen', 'calorieën', 'gewicht', 'cijfers']),
  // Your app
  E('settings-app', 'settings-app', 'Your app', ['app', 'preferences', 'options', 'extras'], ['app', 'voorkeuren', 'opties', 'extra']),
  E('showcase', 'settings-app', 'Showcase demo', ['showcase', 'demo', 'example data', 'examples', 'sample', 'tour', 'try it'], ['voorbeeld', 'demo', 'voorbeeldgegevens', 'rondleiding', 'uitproberen']),
  E('plan', 'settings-app', 'Your plan', ['plan', 'premium', 'price', 'pricing', 'subscription', 'free', 'pay'], ['abonnement', 'prijs', 'gratis', 'betalen']),
  E('your-pages', 'settings-app', 'Your pages & buttons', ['pages', 'hide pages', 'hide', 'show', 'menu', 'navigation', 'buttons', 'start page', 'home page', 'quick add', 'sidebar', 'tabs', 'cycle log'], ['pagina', 'paginas', 'pagina verbergen', 'verbergen', 'tonen', 'menu', 'knoppen', 'startpagina', 'snel toevoegen', 'zijbalk', 'tabbladen', 'cyclus']),
  E('day-goal', 'settings-app', 'Checklist and your day goal', ['checklist', 'day goal', 'dots', 'path', 'orbit', 'done for the day'], ['checklist', 'dagdoel', 'stippen', 'pad', 'baan', 'klaar voor vandaag']),
  E('settings-app', 'settings-app', 'My universe, Day timeline and Stories', ['universe', 'my universe', 'timeline', 'day timeline', 'stories', 'milestones', 'forget'], ['universum', 'tijdlijn', 'verhalen', 'mijlpalen', 'vergeten']),
  E('time-zone', 'settings-app', 'Time zone', ['time zone', 'timezone', 'zone', 'travel', 'abroad', 'clock'], ['tijdzone', 'reizen', 'buitenland', 'klok']),
  E('day-ends', 'settings-app', 'My day ends at', ['day ends', 'end of day', 'late', 'night owl', 'after midnight', 'midnight', 'new day', 'day starts'], ['dag eindigt', 'einde van de dag', 'laat', 'nachtbraker', 'na middernacht', 'middernacht', 'nieuwe dag']),
  E('wrap-up', 'settings-app', 'Evening wrap-up', ['wrap-up', 'wrap up', 'evening', 'end of the day', 'review the day', 'open tasks'], ['avond', 'afsluiting', 'dagafsluiting', 'dag afsluiten']),
  E('music', 'settings-app', 'Music & focus sounds', ['music', 'spotify', 'apple music', 'sounds', 'focus sounds', 'player', 'soundtrack'], ['muziek', 'geluiden', 'focusgeluiden', 'speler']),
  E('links', 'settings-app', 'Your links on Today', ['links', 'my links', 'socials', 'social media', 'websites', 'apps'], ['links', 'koppelingen', 'sociale media', 'websites']),
  E('welcome', 'settings-app', 'Show the welcome again', ['welcome', 'setup', 'set up again', 'onboarding', 'first run', 'get started'], ['welkom', 'opnieuw instellen', 'instellen', 'beginnen'], {href: '/app/welcome'}),
  // Your areas
  E('settings-areas', 'settings-areas', 'Your areas', ['areas', 'pillars', 'life areas'], ['gebieden', 'levensgebieden']),
  E('habits-settings', 'settings-areas', 'Habit settings', ['habits', 'habit', 'rhythm', 'schedule', 'targets', 'streaks', 'history', 'habit reminder'], ['gewoontes', 'gewoonte', 'ritme', 'schema', 'doelen', 'reeks', 'reeksen', 'geschiedenis']),
  E('weekly-review-day', 'settings-areas', 'Weekly review day', ['weekly review', 'review day', 'week review', 'weekday'], ['weekoverzicht', 'wekelijkse terugblik', 'terugblik', 'weekdag']),
  E('health-settings', 'settings-areas', 'Health targets', ['health', 'targets', 'nutrition', 'calories', 'water', 'steps', 'weight goal', 'units', 'kilograms', 'pounds'], ['gezondheid', 'doelen', 'voeding', 'calorieën', 'water', 'stappen', 'streefgewicht', 'eenheden', 'kilo', 'pond']),
  E('chess', 'settings-areas', 'Chess usernames', ['chess', 'chess.com', 'lichess', 'username', 'rating'], ['schaken', 'schaak', 'gebruikersnaam']),
  E('guide', 'settings-areas', 'Guide on this device', ['guide', 'coach', 'tips', 'calm notes', 'suggestions'], ['gids', 'coach', 'tips', 'suggesties']),
  E('install', 'settings-areas', 'Install ZIGoals', ['install', 'home screen', 'app', 'pwa', 'iphone', 'android', 'add to home screen', 'offline'], ['installeren', 'beginscherm', 'app', 'zet op beginscherm', 'offline']),
  E('notifications', 'settings-areas', 'Notifications', ['notifications', 'notification', 'alerts', 'push', 'notify', 'badge'], ['meldingen', 'melding', 'notificaties', 'pushberichten', 'waarschuwingen']),
  E('reminders', 'settings-areas', 'Reminders when ZIGoals is closed', ['reminders', 'reminder', 'remind me', 'push reminders', 'alarm', 'quiet hours', 'bedtime', 'water reminder'], ['herinneringen', 'herinnering', 'herinner me', 'wekker', 'stille uren', 'bedtijd']),
  E('market-data', 'settings-areas', 'Market data sources', ['market data', 'prices', 'coingecko', 'quotes', 'crypto prices', 'stock prices', 'source'], ['marktgegevens', 'koersen', 'prijzen', 'bron']),
  // Account & devices
  E('settings-account', 'settings-account', 'Account & devices', ['account', 'devices', 'my account'], ['account', 'apparaten', 'mijn account']),
  E('encrypted-sync', 'settings-account', 'Account & sync', ['sync', 'synchronise', 'synchronize', 'sign in', 'log in', 'login', 'sign out', 'email', 'devices', 'cloud', 'other devices', 'delete account'], ['synchroniseren', 'synchronisatie', 'inloggen', 'aanmelden', 'uitloggen', 'e-mail', 'apparaten', 'cloud', 'account verwijderen']),
  E('device-lock', 'settings-account', 'Screen cover with a PIN', ['pin', 'lock', 'screen lock', 'passcode', 'code', 'cover', 'privacy screen', 'lock app'], ['pincode', 'vergrendelen', 'schermvergrendeling', 'toegangscode', 'code', 'app vergrendelen']),
  E('wallet-network', 'settings-account', 'Wallet & network (advanced)', ['wallet', 'keplr', 'network', 'zigchain', 'chain'], ['portemonnee', 'wallet', 'netwerk'], {chain: true}),
  E('account', 'settings-account', 'Wallet account', ['wallet account', 'address', 'local demo'], ['walletaccount', 'adres'], {chain: true}),
  E('network', 'settings-account', 'ZIGChain networks', ['network', 'testnet', 'practice network', 'zig-test-2', 'zigchain-1', 'mainnet'], ['netwerk', 'testnetwerk', 'oefennetwerk'], {chain: true}),
  E('contract', 'settings-account', 'Goals contract', ['contract', 'goal manager', 'code id', 'financial layer'], ['contract', 'financiële laag'], {chain: true}),
  E('tracked-wallets', 'settings-account', 'Tracked wallets', ['tracked wallets', 'watch wallet', 'rename wallet', 'remove wallet'], ['gevolgde wallets', 'wallet hernoemen', 'wallet verwijderen'], {chain: true}),
  // Your assistant
  E('settings-zigi', 'settings-zigi', 'Your assistant', ['assistant', 'ai', 'zigi', 'nova'], ['assistent', 'ai', 'zigi', 'nova']),
  E('your-ai', 'settings-zigi', 'ZIGi · your companion', ['zigi', 'ai', 'assistant', 'chatbot', 'chatgpt', 'claude', 'gemini', 'grok', 'openai', 'model', 'own ai'], ['zigi', 'ai', 'assistent', 'chatbot', 'eigen ai']),
  E('zigi-connection-title', 'settings-zigi', 'Connect your own AI', ['connect', 'connection', 'api key', 'key', 'provider', 'ollama', 'local model', 'openrouter', 'subscription', 'change model', 'disconnect'], ['verbinden', 'koppelen', 'verbinding', 'api-sleutel', 'sleutel', 'aanbieder', 'lokaal model', 'ontkoppelen']),
  E('zigi-setup', 'settings-zigi', 'Which setup fits me?', ['which setup', 'setup chooser', 'which ai', 'help me choose'], ['welke opzet', 'keuzehulp', 'welke ai', 'help kiezen']),
  E('zigi-on-device', 'settings-zigi', 'Chrome’s on-device model', ['on-device', 'on device', 'chrome', 'gemini nano', 'built-in ai', 'offline ai'], ['op het apparaat', 'ingebouwde ai', 'offline ai'], {jump: 'zigi-connection-title'}),
  E('zigi-hosted', 'settings-zigi', 'ZIGoals hosted', ['hosted', 'invited', 'hosted assistant'], ['gehost', 'uitgenodigd'], {jump: 'zigi-connection-title'}),
  E('zigi-privacy-title', 'settings-zigi', 'ZIGi: privacy & data', ['zigi privacy', 'what zigi sees', 'what is sent', 'data sharing'], ['zigi privacy', 'wat zigi ziet', 'wat wordt verstuurd', 'delen']),
  E('zigi-page-share-title', 'settings-zigi', 'What each page may share', ['share', 'page data', 'include health', 'health sharing', 'permissions'], ['delen', 'paginagegevens', 'gezondheid delen', 'toestemming', 'rechten']),
  E('zigi-notes', 'settings-zigi', 'What ZIGi knows about me', ['memory', 'notes', 'remember', 'about me', 'what zigi knows', 'forget'], ['geheugen', 'notities', 'onthouden', 'over mij', 'wat zigi weet', 'vergeten']),
  E('zigi-plans', 'settings-zigi', 'ZIGi’s plans', ['plans', 'zigi plans', 'proposed plan', 'steps'], ['plannen', 'plan van zigi', 'stappen']),
  E('zigi-pack', 'settings-zigi', 'Context pack for my AI', ['context pack', 'pack', 'project knowledge', 'claude projects', 'chatgpt projects', 'gems'], ['contextpakket', 'pakket', 'projectkennis']),
  E('zigi-agents', 'settings-zigi', 'Browser AI agents', ['agents', 'browser agent', 'webmcp', 'ai agent'], ['agenten', 'browseragent', 'ai-agent'], {jump: 'zigi-privacy-title'}),
  E('zigi-look-group-title', 'settings-zigi', 'ZIGi’s look and feel', ['zigi button', 'show the zigi button', 'hide zigi', 'launcher'], ['zigi knop', 'zigi verbergen', 'knop tonen']),
  E('zigi-look', 'settings-zigi', 'Customise ZIGi', ['customise', 'customize', 'zigi look', 'size', 'side', 'greeting', 'avatar', 'tab'], ['aanpassen', 'uiterlijk van zigi', 'grootte', 'kant', 'begroeting']),
  E('zigi-voice', 'settings-zigi', 'Voice: talk to ZIGi', ['voice', 'microphone', 'mic', 'speech', 'talk', 'speak', 'dictation', 'read aloud', 'language', 'dutch', 'english'], ['stem', 'microfoon', 'spraak', 'praten', 'spreken', 'dicteren', 'voorlezen', 'taal', 'nederlands', 'engels']),
  E('zigi-reminders-group-title', 'settings-zigi', 'ZIGi’s reminders', ['zigi reminders', 'knock', 'check-in', 'weekly reminder'], ['herinneringen van zigi', 'kloppen', 'wekelijkse herinnering']),
  E('zigi-reminders', 'settings-zigi', 'ZIGi’s weekly reminders', ['reminders list', 'goal check-ins', 'remove reminder'], ['lijst van herinneringen', 'herinnering verwijderen']),
  E('zigi-your-day', 'settings-zigi', 'Morning brief and evening recap', ['morning brief', 'brief', 'evening recap', 'recap', 'daily summary', 'summary'], ['ochtendoverzicht', 'avondoverzicht', 'samenvatting', 'dagoverzicht']),
  E('zigi-auto-accept', 'settings-zigi', 'Auto-accept ZIGi’s cards', ['auto-accept', 'automatic', 'without a tap', 'daily cap'], ['automatisch accepteren', 'automatisch', 'zonder tik', 'daglimiet'], {jump: 'your-ai'}),
  E('zigi-advanced', 'settings-zigi', 'ZIGi advanced: spend, instructions, turn off', ['tokens', 'cost', 'spend', 'spend protection', 'cap', 'usage', 'custom instructions', 'instructions', 'turn off zigi', 'delete chats'], ['kosten', 'uitgaven', 'limiet', 'gebruik', 'instructies', 'zigi uitzetten', 'chats verwijderen'], {jump: 'your-ai'}),
  E('nova-settings', 'settings-zigi', 'NOVA, ZIGi’s command center', ['nova', 'command center', 'command centre', 'brain', 'brain setup', 'what nova can see', 'allow health', 'memory', 'cost cap'], ['nova', 'commandocentrum', 'brein', 'wat nova ziet', 'gezondheid toestaan', 'geheugen', 'kostenlimiet']),
  // Help & diagnostics
  E('settings-help', 'settings-help', 'Help & diagnostics', ['help', 'support', 'faq'], ['hulp', 'ondersteuning', 'vragen']),
  E('storage-internals', 'settings-help', 'How this browser keeps your records', ['storage health', 'storage', 'indexeddb', 'space', 'full', 'storage full', 'upgrade storage'], ['opslag', 'opslagruimte', 'vol', 'geheugen vol']),
  E('diagnostics', 'settings-help', 'Advanced diagnostics', ['diagnostics', 'debug', 'connection', 'troubleshoot', 'problem', 'not working', 'error'], ['diagnose', 'probleem', 'verbinding', 'werkt niet', 'fout']),
  E('send-feedback', 'settings-help', 'Send feedback', ['feedback', 'bug', 'report', 'report a bug', 'contact', 'email us', 'idea', 'problem'], ['feedback', 'fout melden', 'melden', 'contact', 'mailen', 'idee', 'probleem']),
  E('point-tell', 'settings-help', 'Point & tell', ['point and tell', 'point', 'tell', 'mark', 'screenshot', 'show what'], ['aanwijzen', 'vertellen', 'markeren', 'schermafbeelding']),
  E('about-this-alpha', 'settings-help', 'About this alpha', ['about', 'version', 'alpha', 'build', 'release', 'what version'], ['over', 'versie', 'alpha', 'welke versie']),
];

/** Where an entry's result goes: its own page, or a jump within Settings. */
export const entryHref = (entry: SettingsEntry): string => entry.href ?? `#${entry.jump ?? entry.anchor}`;

const toItem = (entry: SettingsEntry, i: number): SearchItem => ({id: `setting-search:${i}`, kind: 'setting', title: entry.label, subtitle: SETTINGS_GROUP_TITLES[entry.group], href: entryHref(entry), keywords: [...entry.en, ...entry.nl]});

/** The entries that show on this device (chain-only ones only once the chain is chosen). */
export const shownEntries = ({chain = false}: {chain?: boolean} = {}) => SETTINGS_INDEX.filter(e => chain || !e.chain);

const words = (s: string) => normalize(s).split(' ').filter(Boolean);
/**
 * How well one entry matches the query, or null when a word matches nowhere. As global Search ranks (lib/search/engine.ts),
 * with one more step: a word that is one of the entry's own words outright ranks above a word that only starts one
 * ("herinneringen" is the Reminders section, before "herinneringen van zigi").
 */
export function scoreEntry(entry: SettingsEntry, query: string): number | null {
  const q = words(query);
  if (!q.length) return null;
  const label = words(entry.label), labelText = normalize(entry.label), whole = normalize(query);
  const phrases = [...entry.en, ...entry.nl, SETTINGS_GROUP_TITLES[entry.group]].map(normalize);
  const kw = phrases.flatMap(p => p.split(' '));
  let score = 0;
  for (const w of q) {
    if (label.includes(w)) score += 12;
    else if (label.some(t => t.startsWith(w))) score += 9;
    else if (labelText.includes(w)) score += 5;
    else if (kw.includes(w)) score += 4;
    else if (kw.some(t => t.startsWith(w))) score += 3;
    else if (phrases.some(p => p.includes(w))) score += 1;
    else return null;
  }
  if (labelText.startsWith(whole)) score += 6;
  if (labelText === whole) score += 10;
  if (phrases.includes(whole)) score += 5;
  return score - Math.min(4, label.length / 4);
}

/** The best matches for a query, best first (every word must match a word of the label, its group or its EN/NL words;
 *  accents and case never matter). */
export function searchSettings(query: string, {chain = false, limit = 8}: {chain?: boolean; limit?: number} = {}): SettingsEntry[] {
  const hits: {entry: SettingsEntry; score: number; i: number}[] = [];
  SETTINGS_INDEX.forEach((entry, i) => {
    if (entry.chain && !chain) return;
    const score = scoreEntry(entry, query);
    if (score !== null) hits.push({entry, score, i});
  });
  hits.sort((a, b) => b.score - a.score || a.i - b.i);
  return hits.slice(0, limit).map(h => h.entry);
}

/** The same entries as global Search items (`/app/settings#…`), for lib/search/static.ts. */
export function settingsSearchItems({chain = false}: {chain?: boolean} = {}): SearchItem[] {
  return SETTINGS_INDEX.flatMap((entry, i) => entry.chain && !chain ? [] : [{...toItem(entry, i), id: `setting-index:${entry.anchor}:${i}`, href: entry.href ?? `/app/settings#${entry.jump ?? entry.anchor}`}]);
}

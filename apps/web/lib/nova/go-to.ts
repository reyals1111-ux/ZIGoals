/**
 * Session AM (ADR-038 A1; art direction §3, "Left bar: everything in the app"): NOVA's "go to" list. Every page of the app
 * a person can open and the places inside pages people look for by name (Sleep inside Health, Bills inside Wealth, a new
 * goal, today's tasks), each with the address that opens it and the English and Dutch words that find it. Pure: the left
 * bar shows the pages by section and filters the whole list as the person types.
 *
 * Every address is one a page really answers (lib/nova/go-to.test.ts reads the routes, the views and the anchors from the
 * pages' own code). `needs` names the switch that shows the entry: a page hidden under Settings → Your pages & buttons, an
 * app switched off on this device, Earn, Governance or anything of the chain the person did not choose is left out, so no
 * chain word shows for a person who never chose it.
 */
/** What must be switched on for an entry to show (the left bar answers each from the app's own records). */
export type GoToNeed =
  | 'today' | 'goals' | 'habits' | 'health' | 'wealth' | 'markets' | 'staking' | 'portfolio' | 'ecosystem' | 'chess' | 'activity' | 'music'
  | 'tasks' | 'notes' | 'journal' | 'agenda' | 'earn' | 'governance' | 'chain';
/** The left bar's sections, in the order they show. Today stands alone above them. */
export const GO_TO_SECTIONS = ['pillars', 'day', 'mind', 'money', 'more'] as const;
export type GoToSection = (typeof GO_TO_SECTIONS)[number];
export const GO_TO_SECTION_LABEL: Readonly<Record<GoToSection, string>> = {pillars: 'Your pillars', day: 'Your day', mind: 'Your mind', money: 'Money', more: 'More'};
export type GoToEntry = {
  id: string;
  /** The name shown and matched first. "NOVA" stands for the persona's name (the bar writes the person's own). */
  label: string;
  /** The page a deep place is inside ("Health"); absent for a page. */
  where?: string;
  href: string;
  /** Words that find it, beside its name: English and Dutch. */
  en: readonly string[]; nl: readonly string[];
  needs?: GoToNeed;
  /** A page of the left bar: its section ('today' is the bar's first link) and its icon (components/nova/icons.tsx). */
  section?: GoToSection | 'today'; icon?: string;
};
const page = (id: string, label: string, href: string, section: GoToEntry['section'], icon: string, en: readonly string[], nl: readonly string[], needs?: GoToNeed): GoToEntry => ({id, label, href, section, icon, en, nl, ...(needs ? {needs} : {})});
const place = (id: string, label: string, where: string, href: string, en: readonly string[], nl: readonly string[], needs?: GoToNeed): GoToEntry => ({id, label, where, href, en, nl, ...(needs ? {needs} : {})});

export const GO_TO: readonly GoToEntry[] = [
  // ---- Pages ----
  // /app/today is Today's own address (app/app/today/page.tsx): a chosen start page does not move it.
  page('today', 'Today', '/app/today', 'today', 'today', ['home', 'dashboard', 'overview', 'my day', 'start'], ['vandaag', 'thuis', 'overzicht', 'mijn dag', 'start'], 'today'),
  page('goals', 'Goals', '/app/goals', 'pillars', 'goals', ['targets', 'dreams', 'vision board', 'life balance'], ['doelen', 'doel', 'dromen', 'levensbalans'], 'goals'),
  page('habits', 'Habits', '/app/habits', 'pillars', 'habits', ['streaks', 'check in', 'routine'], ['gewoontes', 'gewoonten', 'gewoonte', 'reeksen', 'afvinken'], 'habits'),
  page('health', 'Health', '/app/health', 'pillars', 'health', ['wellbeing', 'body', 'nutrition'], ['gezondheid', 'welzijn', 'lichaam', 'voeding'], 'health'),
  page('wealth', 'Wealth', '/app/wealth', 'pillars', 'wealth', ['net worth', 'assets', 'savings', 'finance'], ['vermogen', 'geld', 'bezittingen', 'spaargeld', 'financien'], 'wealth'),
  page('agenda', 'Agenda', '/app/agenda', 'day', 'agenda', ['calendar', 'schedule', 'week', 'month', 'appointments'], ['agenda', 'kalender', 'planning', 'afspraken', 'week', 'maand'], 'agenda'),
  page('tasks', 'Tasks', '/app/tasks', 'day', 'tasks', ['to-do', 'todo', 'to do', 'projects'], ['taken', 'taak', 'takenlijst', 'projecten'], 'tasks'),
  page('checklist', 'Checklist', '/app/checklist', 'day', 'checklist', ['daily list', 'favourites', 'favorites', 'path'], ['checklist', 'afvinklijst', 'daglijst', 'favorieten']),
  page('focus', 'Focus', '/app/journey#focus', 'day', 'focus', ['focus session', 'timer', 'deep work', 'concentrate'], ['focus', 'concentratie', 'timer', 'focussessie']),
  page('notes', 'Notes', '/app/notes', 'mind', 'notes', ['thoughts', 'ideas', 'capture'], ['notities', 'notitie', 'aantekeningen', 'gedachten']),
  page('journal', 'Journal', '/app/journal', 'mind', 'journal', ['diary', 'mood', 'feeling', 'reflection'], ['dagboek', 'stemming', 'gevoel', 'reflectie'], 'journal'),
  page('review', 'Life review', '/app/review', 'mind', 'review', ['review', 'weekly review', 'look back', 'summary'], ['terugblik', 'weekoverzicht', 'levensoverzicht', 'samenvatting']),
  page('bills', 'Bills', '/app/wealth?view=bills', 'money', 'bills', ['bill', 'subscriptions', 'rent', 'due'], ['rekeningen', 'rekening', 'abonnementen', 'huur', 'vaste lasten'], 'wealth'),
  page('budgets', 'Budgets', '/app/wealth?view=budgets', 'money', 'budgets', ['budget', 'categories', 'monthly budget'], ['budget', 'budgetten', 'begroting', 'maandbudget'], 'wealth'),
  page('markets', 'Markets', '/app/markets', 'money', 'markets', ['prices', 'watchlist', 'stocks', 'crypto'], ['markten', 'koersen', 'prijzen', 'aandelen', 'volglijst'], 'markets'),
  page('portfolio', 'Portfolio', '/app/portfolio', 'money', 'portfolio', ['returns', 'performance', 'gains'], ['portefeuille', 'rendement', 'winst'], 'portfolio'),
  page('earn', 'Earn', '/app/earn', 'money', 'earn', ['yield', 'ways to earn'], ['verdienen', 'opbrengst', 'rendement'], 'earn'),
  page('staking', 'Staking', '/app/staking', 'money', 'staking', ['stake', 'rewards', 'validators'], ['staken', 'beloningen', 'validators'], 'staking'),
  page('governance', 'Governance', '/app/governance', 'money', 'governance', ['vote', 'voting', 'proposals'], ['bestuur', 'stemmen', 'voorstellen'], 'governance'),
  page('ecosystem', 'Ecosystem', '/app/ecosystem', 'money', 'ecosystem', ['apps', 'directory'], ['ecosysteem', 'apps', 'overzicht'], 'ecosystem'),
  page('journey', 'Journey', '/app/journey', 'more', 'journey', ['level', 'quests', 'badges', 'xp', 'game'], ['reis', 'niveau', 'badges', 'opdrachten', 'spel']),
  page('stories', 'Stories', '/app/stories', 'more', 'stories', ['recap', 'week story', 'month story', 'year story'], ['verhalen', 'terugblik', 'weekverhaal', 'jaarverhaal']),
  page('timeline', 'Day timeline', '/app/timeline', 'more', 'timeline', ['timeline', 'today as a timeline', 'hour by hour'], ['tijdlijn', 'dagtijdlijn', 'uur per uur']),
  page('activity', 'Activity', '/app/activity', 'more', 'activity', ['history', 'log', 'what changed'], ['activiteit', 'geschiedenis', 'logboek'], 'activity'),
  page('music', 'Music', '/app/music', 'more', 'music', ['sounds', 'calm sounds', 'playlist', 'focus music'], ['muziek', 'geluiden', 'afspeellijst', 'rustige geluiden'], 'music'),
  page('chess', 'Chess', '/app/chess', 'more', 'chess', ['rating', 'puzzles', 'games'], ['schaken', 'schaak', 'rating', 'puzzels'], 'chess'),
  page('plans', 'Plans and prices', '/app/plans', 'more', 'plans', ['pricing', 'price', 'cost', 'free', 'premium'], ['abonnementen', 'prijzen', 'prijs', 'kosten', 'gratis']),
  page('help', 'Help', '/app/help', 'more', 'help', ['questions', 'faq', 'support', 'how does it work'], ['hulp', 'vragen', 'uitleg', 'ondersteuning']),
  page('settings', 'Settings', '/app/settings', 'more', 'settings', ['preferences', 'options'], ['instellingen', 'voorkeuren', 'opties']),

  // ---- Inside Health (components/health/health-app.tsx: ?view=, ?add= and its anchors) ----
  place('health-sleep', 'Sleep', 'Health', '/app/health?view=sleep', ['nights', 'bedtime', 'sleep log'], ['slaap', 'slapen', 'nachten', 'bedtijd'], 'health'),
  place('health-water', 'Water', 'Health', '/app/health#water', ['drink', 'hydration', 'glass', 'log water'], ['water', 'drinken', 'glas', 'vocht'], 'health'),
  place('health-weight', 'Weight', 'Health', '/app/health?view=weight', ['scale', 'kg', 'lb', 'weight trend'], ['gewicht', 'weegschaal', 'kilo', 'gewichtstrend'], 'health'),
  place('health-log-weight', 'Log your weight', 'Health', '/app/health?add=weight', ['weigh in', 'add weight', 'new weight'], ['gewicht invoeren', 'wegen', 'gewicht toevoegen'], 'health'),
  place('health-food', 'Food diary', 'Health', '/app/health?view=diary', ['food', 'meals', 'calories', 'eating', 'nutrition'], ['eten', 'voeding', 'eetdagboek', 'maaltijden', 'calorieen'], 'health'),
  place('health-log-meal', 'Log a meal', 'Health', '/app/health?add=entry', ['add food', 'add a meal', 'breakfast', 'lunch', 'dinner', 'snack'], ['maaltijd invoeren', 'eten toevoegen', 'ontbijt', 'lunch', 'avondeten'], 'health'),
  place('health-foods', 'Foods and recipes', 'Health', '/app/health?view=foods', ['recipe', 'ingredients', 'my foods'], ['recepten', 'recept', 'voedingsmiddelen', 'ingredienten'], 'health'),
  place('health-planner', 'Meal planner', 'Health', '/app/health?view=planner', ['plan meals', 'grocery list', 'shopping list'], ['maaltijdplanner', 'weekmenu', 'boodschappenlijst'], 'health'),
  place('health-workouts', 'Workouts', 'Health', '/app/health?view=workouts', ['gym', 'training', 'exercise', 'lift'], ['trainingen', 'training', 'sporten', 'sportschool', 'oefeningen'], 'health'),
  place('health-meditation', 'Meditation', 'Health', '/app/health?view=meditation', ['mindfulness', 'breathing', 'calm'], ['meditatie', 'mediteren', 'ademhaling', 'rust'], 'health'),
  place('health-activity', 'Steps and movement', 'Health', '/app/health?view=activity', ['steps', 'walking', 'movement', 'activity'], ['stappen', 'wandelen', 'beweging', 'bewegen'], 'health'),
  place('health-measurements', 'Your numbers', 'Health', '/app/health?view=measurements', ['measurements', 'blood pressure', 'waist', 'pulse'], ['metingen', 'bloeddruk', 'taille', 'hartslag'], 'health'),
  place('health-targets', 'Health targets', 'Health', '/app/health?view=targets', ['calorie target', 'protein target', 'water target'], ['gezondheidsdoelen', 'streefwaarden', 'calorie doel'], 'health'),
  place('health-insights', 'Food insights', 'Health', '/app/health?view=insights', ['patterns', 'protein', 'nutrition history'], ['inzichten', 'patronen', 'eiwit'], 'health'),
  place('health-fasting', 'Fasting timer', 'Health', '/app/health#fasting', ['fasting', 'fast', 'intermittent'], ['vasten', 'vastentimer', 'periodiek vasten'], 'health'),
  place('health-devices', 'Devices', 'Health', '/app/health?view=devices', ['watch', 'wearable', 'linked services'], ['apparaten', 'horloge', 'koppelingen'], 'health'),

  // ---- Inside Goals and Habits ----
  place('goal-new', 'Create a goal', 'Goals', '/app/goals/new', ['new goal', 'add goal', 'add a goal', 'start a goal'], ['nieuw doel', 'doel toevoegen', 'doel maken'], 'goals'),
  place('goal-templates', 'Goal templates', 'Goals', '/app/goals/templates', ['goal ideas', 'examples', 'library'], ['doelsjablonen', 'voorbeelden', 'ideeen'], 'goals'),
  place('guided', 'Guided journeys', 'Goals', '/app/guided', ['guided', 'programme', 'program', 'a step a day'], ['begeleide trajecten', 'programma', 'stap per dag']),
  place('habit-new', 'Add a habit', 'Habits', '/app/habits?add=habit', ['new habit', 'create a habit', 'start a habit'], ['nieuwe gewoonte', 'gewoonte toevoegen', 'gewoonte maken'], 'habits'),
  place('habit-routines', 'Routines', 'Habits', '/app/habits#routines', ['morning routine', 'evening routine', 'habit stack'], ['routines', 'ochtendroutine', 'avondroutine'], 'habits'),
  place('habit-year', 'Year view', 'Habits', '/app/habits#year', ['habit calendar', 'heatmap', 'year'], ['jaaroverzicht', 'jaar', 'kalender'], 'habits'),

  // ---- Inside Tasks, Notes, the Journal and the Life review ----
  // components/tasks/tasks-nav.tsx readView: inbox, today, upcoming, all, overdue, completed; ?add=1 focuses the add field.
  place('tasks-today', 'Today’s tasks', 'Tasks', '/app/tasks?view=today', ['tasks today', 'due today', 'to do today'], ['taken van vandaag', 'vandaag te doen', 'taken vandaag'], 'tasks'),
  place('tasks-upcoming', 'Upcoming tasks', 'Tasks', '/app/tasks?view=upcoming', ['next tasks', 'this week', 'later'], ['komende taken', 'deze week', 'binnenkort'], 'tasks'),
  place('tasks-overdue', 'Overdue tasks', 'Tasks', '/app/tasks?view=overdue', ['late', 'missed', 'behind'], ['te late taken', 'achterstallig', 'verlopen'], 'tasks'),
  place('tasks-inbox', 'Task inbox', 'Tasks', '/app/tasks?view=inbox', ['unsorted tasks', 'inbox'], ['taken inbox', 'postvak taken', 'ongesorteerd'], 'tasks'),
  place('tasks-done', 'Completed tasks', 'Tasks', '/app/tasks?view=completed', ['done tasks', 'finished'], ['afgeronde taken', 'klaar', 'voltooid'], 'tasks'),
  place('task-new', 'Add a task', 'Tasks', '/app/tasks?add=1', ['new task', 'create a task', 'add to do'], ['nieuwe taak', 'taak toevoegen', 'taak maken'], 'tasks'),
  // components/notes/notes-workspace.tsx: ?capture=1 and ?view=inbox|graph|files.
  place('note-new', 'Capture a note', 'Notes', '/app/notes?capture=1', ['new note', 'add a note', 'quick note', 'write a note'], ['nieuwe notitie', 'notitie maken', 'snel noteren'], 'notes'),
  place('notes-inbox', 'Notes inbox', 'Notes', '/app/notes?view=inbox', ['unsorted notes', 'inbox'], ['notities inbox', 'postvak notities', 'ongesorteerd'], 'notes'),
  place('notes-graph', 'Notes graph', 'Notes', '/app/notes?view=graph', ['linked notes', 'map of notes'], ['notitiegrafiek', 'verbonden notities', 'kaart'], 'notes'),
  place('journal-today', 'Write in your journal today', 'Journal', '/app/journal#journal-write', ['journal today', 'write', 'new entry', 'how was your day'], ['dagboek vandaag', 'schrijven', 'vandaag schrijven', 'nieuw dagboekbericht'], 'journal'),
  place('journal-scales', 'Your own scales', 'Journal', '/app/journal#your-scales', ['stress', 'pain', 'mood scale', 'rating'], ['eigen schalen', 'stress', 'pijn', 'stemmingsschaal'], 'journal'),
  place('review-week', 'Weekly reflection', 'Life review', '/app/review#weekly-reflection', ['reflect', 'this week', 'week in review'], ['weekreflectie', 'wekelijkse reflectie', 'deze week']),

  // ---- Inside Wealth (components/platform/wealth-view.tsx WEALTH_VIEWS and its anchors) ----
  place('wealth-spending', 'Spending', 'Wealth', '/app/wealth#spending', ['room to spend', 'expenses', 'weekly budget', 'money spent'], ['uitgaven', 'besteden', 'weekbudget', 'kosten'], 'wealth'),
  place('wealth-holdings', 'What you have', 'Wealth', '/app/wealth#holdings', ['holdings', 'assets', 'accounts', 'savings'], ['bezit', 'bezittingen', 'rekeningen', 'spaargeld'], 'wealth'),
  place('wealth-calculator', 'Compound interest calculator', 'Wealth', '/app/wealth/calculator', ['calculator', 'interest', 'growth', 'invest'], ['rekenmachine', 'rente', 'samengestelde rente', 'groei'], 'wealth'),
  place('wealth-target', 'Your target mix', 'Wealth', '/app/wealth?view=target', ['allocation', 'target mix', 'balance'], ['doelverdeling', 'verdeling', 'spreiding'], 'wealth'),
  place('wealth-add-money', 'Add money', 'Wealth', '/app/wealth/add-money', ['buy', 'deposit', 'card'], ['geld toevoegen', 'kopen', 'storten'], 'chain'),

  // ---- Focus, the Journey and Music ----
  place('focus-pomodoro', 'Pomodoro timer', 'Focus', '/app/journey?focus=pomodoro#focus', ['pomodoro', '25 minutes', 'work timer'], ['pomodoro', 'pomodorotimer', '25 minuten']),
  place('journey-universe', 'My universe', 'Journey', '/app/journey#universe', ['universe', 'planets', 'milestones'], ['mijn universum', 'planeten', 'mijlpalen']),
  place('journey-wrapped', 'Your year in a few cards', 'Journey', '/app/journey?wrapped=open', ['wrapped', 'year in review', 'recap'], ['jaaroverzicht', 'wrapped', 'terugblik op het jaar']),
  place('music-spotify', 'Spotify', 'Music', '/app/music/spotify', ['spotify', 'playlists'], ['spotify', 'afspeellijsten'], 'music'),

  // ---- NOVA and ZIGi (components/nova/nova-dashboard.tsx: #briefs and #nova-<panel>) ----
  place('nova-permissions', 'Permissions', 'NOVA', '/app/nova#nova-permissions', ['what nova can see', 'access', 'privacy', 'page data'], ['toestemmingen', 'rechten', 'toegang', 'wat nova mag zien']),
  place('nova-setup', 'Setup guide', 'NOVA', '/app/nova/setup', ['build your own nova', 'set up', 'brain setup', 'connect a model'], ['installatiegids', 'instellen', 'opzetten', 'eigen nova bouwen']),
  place('nova-hermes', 'Hermes Agent', 'NOVA', '/app/nova/hermes', ['hermes', 'connect hermes', 'own agent'], ['hermes', 'hermes koppelen', 'eigen agent']),
  place('nova-briefs', 'Your day: morning brief and evening recap', 'NOVA', '/app/nova#briefs', ['briefs', 'morning brief', 'evening recap', 'daily brief'], ['briefings', 'ochtendbriefing', 'avondoverzicht', 'dagoverzicht']),
  place('nova-memory', 'Memory', 'NOVA', '/app/nova#nova-memory', ['what nova remembers', 'remembered notes'], ['geheugen', 'wat nova onthoudt', 'onthouden']),
  place('nova-workflows', 'Workflows', 'NOVA', '/app/nova#nova-workflows', ['automations', 'routines for nova'], ['werkstromen', 'automatiseringen']),
  place('nova-cost', 'Cost meter and daily cap', 'NOVA', '/app/nova#nova-cost', ['cost', 'usage', 'spend limit', 'tokens'], ['kosten', 'verbruik', 'daglimiet']),
  place('nova-models', 'Models per task', 'NOVA', '/app/nova#nova-models', ['models', 'which model', 'routing'], ['modellen', 'welk model']),
  place('nova-activity', 'What NOVA did', 'NOVA', '/app/nova#nova-activity', ['nova activity', 'actions', 'changes made'], ['wat nova deed', 'acties', 'wijzigingen']),
  place('zigi-meet', 'Meet ZIGi', 'ZIGi', '/app/zigi', ['zigi', 'assistant', 'companion'], ['zigi', 'assistent', 'maatje']),
  place('zigi-memory', 'What ZIGi remembers', 'ZIGi', '/app/zigi/memory', ['zigi memory', 'zigi notes'], ['wat zigi onthoudt', 'zigi geheugen']),

  // ---- Settings and Help (lib/search/static.ts names the same sections) ----
  place('settings-pages', 'Your pages and buttons', 'Settings', '/app/settings#your-pages', ['hide a page', 'show a page', 'switch pages on'], ['paginas en knoppen', 'pagina verbergen', 'pagina tonen']),
  place('settings-appearance', 'Appearance and motion', 'Settings', '/app/settings#appearance', ['theme', 'dark', 'light', 'animations', 'reduced motion'], ['uiterlijk', 'thema', 'donker', 'licht', 'beweging', 'animaties']),
  place('settings-data', 'Your data', 'Settings', '/app/settings/data', ['storage', 'where is my data', 'export', 'privacy'], ['jouw gegevens', 'opslag', 'exporteren', 'privacy']),
  place('settings-backup', 'Keep a copy of your progress', 'Settings', '/app/settings#privacy', ['backup', 'back up', 'restore'], ['back-up', 'reservekopie', 'herstellen', 'kopie bewaren']),
  place('settings-account', 'Account and devices', 'Settings', '/app/settings#settings-account', ['sign in', 'sync', 'devices', 'email'], ['account en apparaten', 'inloggen', 'synchroniseren', 'apparaten']),
  place('settings-reminders', 'Reminders', 'Settings', '/app/settings/reminders', ['notifications', 'quiet hours', 'remind me'], ['herinneringen', 'meldingen', 'stille uren']),
  place('settings-time-zone', 'Time zone', 'Settings', '/app/settings#time-zone', ['travel', 'clock'], ['tijdzone', 'reizen', 'klok']),
  place('settings-zigi', 'ZIGi, your assistant', 'Settings', '/app/settings#your-ai', ['ai settings', 'model', 'voice', 'key'], ['zigi instellingen', 'ai instellingen', 'stem', 'sleutel']),
  place('settings-feedback', 'Send feedback', 'Settings', '/app/settings#send-feedback', ['report a problem', 'bug', 'contact'], ['feedback sturen', 'probleem melden', 'contact']),
  place('help-start', 'Getting started', 'Help', '/app/help#getting-started', ['first steps', 'how to start', 'introduction'], ['aan de slag', 'eerste stappen', 'beginnen']),
  place('help-nova', 'Help with NOVA, notes and tasks', 'Help', '/app/help#nova', ['what is nova', 'nova help'], ['hulp bij nova', 'wat is nova']),
];

/** Lower case, accents dropped, a possessive "'s" dropped, everything that is not a letter or a digit read as a space. */
export const foldWords = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/['’]s\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const folded = new Map<string, {label: string; labelWords: string[]; keys: string[]; keyWords: string[]}>();
function wordsOf(e: GoToEntry) {
  let f = folded.get(e.id);
  if (!f) {
    const label = foldWords(e.label), keys = [...e.en, ...e.nl].map(foldWords);
    f = {label, labelWords: label.split(' '), keys, keyWords: [...keys.flatMap(k => k.split(' ')), ...foldWords(e.where ?? '').split(' ')].filter(Boolean)};
    folded.set(e.id, f);
  }
  return f;
}
/**
 * How well an entry answers the typed words (higher is better), or null when it does not: its name itself (100), its name
 * starting with the words (90), one of its find words exactly (80), every typed word beginning a word of its name (70), a
 * find word starting with the words (60), or every typed word beginning a word of its name, its page or its find words.
 */
export function goToScore(entry: GoToEntry, query: string): number | null {
  const q = foldWords(query);
  if (!q) return null;
  const f = wordsOf(entry);
  if (f.label === q) return 100;
  if (f.label.startsWith(q)) return 90;
  if (f.keys.includes(q)) return 80;
  const typed = q.split(' ');
  let strong = 0;
  for (const w of typed) {
    if (f.labelWords.some(l => l.startsWith(w))) strong++;
    else if (!f.keyWords.some(k => k.startsWith(w))) return f.keys.some(k => k.startsWith(q)) ? 60 : null;
  }
  const score = 40 + Math.round(30 * strong / typed.length);
  return f.keys.some(k => k.startsWith(q)) ? Math.max(score, 60) : score;
}
/** The entries this person can open (`has` answers each need), in the list's order. */
export const goToFor = (has: (need: GoToNeed) => boolean, entries: readonly GoToEntry[] = GO_TO): GoToEntry[] => entries.filter(e => !e.needs || has(e.needs));
/** The left bar's pages of one section, in order. */
export const goToPages = (entries: readonly GoToEntry[], section: GoToSection | 'today'): GoToEntry[] => entries.filter(e => e.section === section);
/** What the typed words find, best first (a page before a place inside one on a tie, then the list's order); at most `limit`. */
export function goToMatches(query: string, has: (need: GoToNeed) => boolean = () => true, limit = 8, entries: readonly GoToEntry[] = GO_TO): GoToEntry[] {
  const hits: {entry: GoToEntry; score: number; at: number}[] = [];
  goToFor(has, entries).forEach((entry, at) => { const score = goToScore(entry, query); if (score !== null) hits.push({entry, score, at}); });
  return hits.sort((a, b) => b.score - a.score || Number(!!b.entry.section) - Number(!!a.entry.section) || a.at - b.at).slice(0, limit).map(h => h.entry);
}
/** An address inside NOVA itself (`#briefs`, `#nova-permissions`): the bar opens it in place, as the page's own links do. */
export const NOVA_PATH_PREFIX = '/app/nova#';
export const inNovaHash = (href: string): string | null => href.startsWith(NOVA_PATH_PREFIX) ? href.slice(NOVA_PATH_PREFIX.length - 1) : null;

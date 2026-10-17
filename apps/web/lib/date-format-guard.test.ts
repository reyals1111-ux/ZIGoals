import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, it} from 'vitest';

/**
 * Session AD item 8 (ADR-026): every date a page shows goes through lib/visual-format.ts (formatDate, formatTime,
 * formatDateTime, formatMonth, formatWeekday, formatRelativeDay), so one format holds everywhere. This guard reads every
 * .ts and .tsx file under components/ and app/ (tests left out) and fails on date formatting written by hand. A machine
 * use that must stay is listed below with its file, its count and why.
 */
const ROOT = join(__dirname, '..');
const RULES: {id: string; pattern: RegExp}[] = [
  {id: 'toLocaleDateString', pattern: /\.toLocaleDateString\(/g},
  {id: 'toLocaleTimeString', pattern: /\.toLocaleTimeString\(/g},
  // Number#toLocaleString is a number, not a date: only a date's receiver or date options count.
  {id: 'Date#toLocaleString', pattern: /(?:new Date\([^()]*\)|\b\w*(?:[dD]ate|[tT]ime|At|[dD]ay))\.toLocaleString\(|\.toLocaleString\([^)]*\b(?:dateStyle|timeStyle|weekday|hour|minute|month)\b/g},
  {id: 'Date#toDateString/toTimeString/toUTCString', pattern: /\.(?:toDateString|toTimeString|toUTCString)\(/g},
  // The device's zone (Intl.DateTimeFormat().resolvedOptions().timeZone) is not formatting.
  {id: 'Intl.DateTimeFormat', pattern: /Intl\.DateTimeFormat\((?!\)\.resolvedOptions\(\)\.timeZone)/g},
  {id: 'Intl.RelativeTimeFormat', pattern: /Intl\.RelativeTimeFormat\(/g},
  // An ISO date or time put on the page: toISOString() or a stamp's first 7, 10 or 16 characters inside JSX braces or
  // a template string (attributes such as dateTime={…} and keys are machine fields and do not count).
  // An object literal ({at: now.toISOString()}) holds a machine field and does not count either.
  {id: 'ISO date shown', pattern: /(?<![$=\w])\{[^{}<>=:;]*\.toISOString\(\)(?:\.(?:slice|replace|substring)\([^()]*\))*\s*\}|(?<![=\w])\$?\{[\w.!?[\]]*?(?:At|at|[dD]ate|[dD]ay)!?\.slice\(0, ?(?:7|10|16)\)\}/g},
  {id: 'month or weekday names by hand', pattern: /\[\s*['"](?:Jan|January)['"]\s*,\s*['"]Feb|\[\s*['"](?:Sun|Sunday|Mon|Monday)['"]\s*,\s*['"](?:Mon|Monday|Tue|Tuesday)['"]/g},
  {id: 'date getters shown', pattern: /(?<![$=\w])\{[^{}<>=:;]*\.get(?:UTC)?(?:Date|Month|FullYear|Hours|Minutes)\(\)[^{}<>=:;]*\}/g},
];
/** The machine uses that stay, each with its count in that file: a new one in the same file still fails. */
const ALLOWED: {file: string; rule: string; count: number; reason: string}[] = [
  {file: 'components/ai/ai-chat.tsx', rule: 'Date#toDateString/toTimeString/toUTCString', count: 1, reason: 'the device clock as "HH:MM", compared with the quiet hours; never shown'},
  {file: 'components/ai/zigi-reminders-panel.tsx', rule: 'month or weekday names by hand', count: 1, reason: 'the weekday of a weekly reminder ("Monday at 9:00 AM"), a schedule, not a date'},
  {file: 'components/weekly-review/weekly-review-day.tsx', rule: 'month or weekday names by hand', count: 1, reason: 'the options of the weekly review day choice, a schedule, not a date'},
  {file: 'components/habits/habit-editor.tsx', rule: 'month or weekday names by hand', count: 1, reason: 'the weekday choices of a habit schedule, not a date'},
];
function files(dir: string): string[] { return readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? files(path) : [path]; }); }
// Comments may name what they replace; only code counts.
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
export function findings(source: string): Map<string, number> {
  const found = new Map<string, number>(), text = code(source);
  for (const rule of RULES) { const n = text.match(rule.pattern)?.length ?? 0; if (n) found.set(rule.id, n); }
  return found;
}
const sources = ['components', 'app'].flatMap(dir => files(join(ROOT, dir))).filter(f => /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\.(ts|tsx)$/.test(f));

describe('one date format: no date formatting by hand in components/ or app/', () => {
  it('reads the pages it guards', () => {
    expect(sources.length).toBeGreaterThan(300);
    expect(sources.map(f => relative(ROOT, f))).toEqual(expect.arrayContaining(['app/app/activity/page.tsx', 'components/activity-feed.tsx', 'components/habits/plan-skip.tsx']));
  });
  it('finds none outside the listed machine uses, and each listed use is still there', () => {
    const unexpected: string[] = [], seen = new Set<string>();
    for (const file of sources) {
      const name = relative(ROOT, file);
      for (const [rule, n] of findings(readFileSync(file, 'utf8'))) {
        const allowed = ALLOWED.find(a => a.file === name && a.rule === rule);
        if (allowed) seen.add(`${name}|${rule}`);
        if (!allowed || n > allowed.count) unexpected.push(`${name}: ${n} × ${rule}${allowed ? ` (${allowed.count} allowed)` : ''}; use lib/visual-format.ts`);
      }
    }
    expect(unexpected).toEqual([]);
    expect(ALLOWED.filter(a => !seen.has(`${a.file}|${a.rule}`)).map(a => a.file), 'an allowed use is gone: take it off the list').toEqual([]);
  });
  // The guard itself: each form it exists for is caught, and the machine forms are not.
  it('catches every hand-written form it guards against', () => {
    const caught = [
      'const longDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });',
      '{date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}',
      '<time title={date.toLocaleString()}>',
      '`${new Date(item.updatedAt).toLocaleString(undefined, {dateStyle: "short", timeStyle: "short"})}`',
      'const dayText = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(Date.parse(date));',
      '<time dateTime={new Date(start).toISOString()}>{new Date(start).toISOString().slice(0,10)}</time>',
      '<p>Exported {preview.opened.json.exportedAt.slice(0, 10)}.</p>',
      '`Manual · corrected ${a.updatedAt.slice(0, 10)}`',
      '<small>Ended {goal.updatedAt.slice(0, 10)}</small>',
      "const MONTH_SHORT = ['Jan', 'Feb', 'Mar'];",
      "const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue'];",
      '<span>{d.getDate()} {MONTHS[d.getMonth()]}</span>',
      '<dd>{new Date(event.at).toISOString()}</dd>',
      'new Intl.RelativeTimeFormat("en").format(-1, "day")',
      'const t = new Date().toUTCString();',
    ];
    for (const line of caught) expect(findings(line).size, line).toBeGreaterThan(0);
  });
  it('leaves numbers, zones, machine fields and comments alone', () => {
    const kept = [
      "{used.requests.toLocaleString('en-US')}",
      'const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;',
      '<time dateTime={new Date(p.at).toISOString()}>{formatDateTime(p.at)}</time>',
      'a.download = `zigoals-notes-${new Date().toISOString().slice(0, 10)}.txt`;',
      'const today = new Date().toISOString().slice(0, 10);',
      'const [month, setMonth] = useState(store.today.slice(0, 7));',
      '<li key={entry.date}>{formatDate(entry.date)}</li>',
      '// was toLocaleDateString("en-US")',
      '/* Intl.DateTimeFormat("en-GB") once wrote this */',
      'hour={new Date().getHours()}',
      'const record = {...batch, id: crypto.randomUUID(), at: now.toISOString()};',
      '{clock(new Date(Date.parse(running.startedAt) + target).toISOString(), running.timeZone)}',
    ];
    for (const line of kept) expect([...findings(line).keys()], line).toEqual([]);
  });
});

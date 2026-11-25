import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session AW (p5-fixes; FR-L-17): the phone's Settings list had no Erase everything row (FRIENDS_GUIDE §8 sends people
 * there) and no Notifications row. Both now go to their sections' own ids, Erase last in Data & privacy as on the page,
 * and the Showcase (where Erase everything is not shown) leaves its row out.
 */
const WEB = join(__dirname, '..', '..'), read = (...p: string[]) => readFileSync(join(WEB, ...p), 'utf8');
describe('FR-L-17: Erase everything and Notifications on the phone\'s Settings list', () => {
  const list = read('components', 'phone', 'phone-settings.tsx');
  test('the rows name the sections\' ids, Erase last in Data & privacy and Notifications before Reminders when closed', () => {
    const data = list.slice(list.indexOf('title: "Data & privacy"'), list.indexOf('title: "Your app"'));
    expect(data.trim().split('\n').filter(l => l.trim().startsWith('["')).at(-1)?.trim()).toBe('["Erase everything", "Remove every ZIGoals record from this browser", "erase-everything"],');
    const areas = list.slice(list.indexOf('title: "Your areas"'), list.indexOf('title: "Extras"')).split('\n').filter(l => l.trim().startsWith('["')).map(l => l.trim());
    expect(areas.indexOf('["Notifications", "Habits, tasks, bills and more, on time", "notifications"],')).toBe(areas.findIndex(l => l.startsWith('["Reminders when closed"')) - 1);
    expect(list).toContain('const NOT_IN_SHOWCASE = new Set(["erase-everything"]);');
  });
  test('each target is a section id on the Settings page', () => {
    expect(read('components', 'settings', 'erase-everything.tsx')).toContain('id="erase-everything"');
    expect(read('components', 'notify', 'notifications-card.tsx')).toContain('id="notifications"');
    // Erase everything is the last part of Backup & restore, so the guide's words stay true on a computer.
    const page = read('app', 'app', 'settings', 'page.tsx'), card = page.slice(page.indexOf('id="backup-restore"'), page.indexOf('</section>', page.indexOf('id="backup-restore"')));
    expect(card.trim().split('\n').filter(l => l.includes('<Later>')).at(-1)?.trim()).toBe('<Later><EraseEverything/></Later>');
  });
});

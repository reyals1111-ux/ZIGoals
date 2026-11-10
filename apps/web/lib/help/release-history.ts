/**
 * Session AL Part 15 (AL-COMPETITOR-GAP-178, C-DVG-90): the release history Help shows, newest first, as Griply, Wealthfolio
 * and Ghostfolio keep a public changelog. Help opens for anyone, with no account, so this list is public. Each entry is a
 * published Alpha: its number, the day it went live where the release record (docs/STATUS.md) gives one, else its month,
 * what it brought in plain words, and the Help section that explains it. Versions still in testing are not listed: Help's
 * "What's new" covers the version you are using.
 */
/** `help` is a Help section's id, or with `question` a Help answer's (its element id is `help-<id>`, components/help/help-question.tsx). */
export type Release = {alpha: string; date: string; title: string; help?: string; question?: true};
export const releaseHref = (r: Release) => r.help ? `#${r.question ? 'help-' : ''}${r.help}` : undefined;
export const RELEASES: readonly Release[] = [
  {alpha: '#53', date: '4 Nov 2026', title: 'Notifications on this device, ZIGoals offline once installed, food, money tools and your own days', help: 'ak'},
  {alpha: '#52', date: '30 Oct 2026', title: 'Price alerts, Guided journeys, sleep balance and your own look', help: 'aj'},
  {alpha: '#51', date: '28 Oct 2026', title: 'ZIGi, your companion: speak a line, several items in one line, and more', help: 'your-ai'},
  {alpha: '#50', date: 'October 2026', title: 'A polish of every page'},
  {alpha: '#46–#49', date: 'October 2026', title: 'The Checklist: your day as one path of planets, then three passes to finish it', help: 'ag-polish', question: true},
  {alpha: '#45', date: 'October 2026', title: 'Earn, staking in your own wallet, wallets and Add money, governance', help: 'af'},
  {alpha: '#44', date: 'October 2026', title: 'Today’s scene from top to end, the sidebar and linked wallets', help: 'ae'},
  {alpha: '#41', date: 'October 2026', title: 'One look for every page: Goals, Habits, Health and Wealth', help: 'abd'},
  {alpha: '#39', date: 'October 2026', title: 'Deeper Habits and Health, and the game layer', help: 'aa'},
  {alpha: '#33–#38', date: 'October 2026', title: 'ZIGi comes alive, its new face, and every page in order with Goals, the calculator, search and the Life review', help: 'earlier-changes'},
];

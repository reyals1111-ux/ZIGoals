import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {CHESS_COMPUTER_KEY} from '../lib/chess/computer-record';

/**
 * Session AV lane 2 (roadmap, BL-10; GAP-131): Chess → Play against ZIGoals' own engine. Its Web Worker starts only
 * when a game begins; the three levels say how deep and how long each looks; the game is kept on this device and can
 * be continued after a reload; a finished game counts at its level; Lichess play is still offered as before. At 390 and
 * 1440 in Nebula, Light and Dark, axe-clean, focus on the board after Start, no sideways scroll at 320. Nothing is sent.
 */
const kept = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as {game?: {moves: string[]; level: string}; tally?: Record<string, {won: number; lost: number; drawn: number}>} | null, CHESS_COMPUTER_KEY);
async function openPlay(page: Page) {
  await page.goto('/app/settings'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await page.evaluate(() => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.goto('/app/chess#play'); await settle(page);
  const game = page.locator('section.chess-computer');
  await expect(game).toBeVisible({timeout: 15_000});
  return game;
}

for (const theme of THEMES) test(`${theme}: a game against the engine, kept and continued, then counted`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const workers: string[] = []; page.on('worker', w => workers.push(w.url()));
  const game = await openPlay(page);
  // The levels say what each does; the engine is not running yet.
  const levels = game.getByRole('group', {name: 'Level'});
  await expect(levels.getByRole('radio')).toHaveCount(3);
  await expect(levels).toContainText('Easy · looks one move ahead');
  await expect(levels).toContainText('Medium · looks up to three moves ahead, about a second');
  await expect(levels).toContainText('Hard · looks up to eight moves ahead, up to three seconds');
  expect(workers).toEqual([]);
  // Lichess play is still there, unchanged, beside it.
  await expect(page.locator('.chess-play-panel')).toContainText('Lichess');
  const f = await axe(page, game);
  expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]);

  await levels.getByRole('radio', {name: /^Medium/}).check();
  await game.getByRole('button', {name: 'Start the game'}).click();
  await expect(game.getByRole('gridcell').and(page.locator('[tabindex="0"]'))).toBeFocused();
  await game.getByLabel('Type a move (e2e4 or Nf3)').fill('e4');
  await game.getByRole('button', {name: 'Play move'}).click();
  await expect(game.locator('.chess-moves li').first().locator('span')).toHaveCount(2, {timeout: 15_000});
  await expect(game.getByRole('status')).toContainText('Your move (White)');
  await expect(game).toContainText(/its last move looked [1-3] moves? ahead/);
  expect(workers.length).toBe(1);
  await expect.poll(async () => (await kept(page))?.game?.moves.length).toBe(2);
  const g = await axe(page, game);
  expect(g.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(g)).toEqual([]);

  // A reload: the game waits, and continues where it was.
  await page.reload(); await settle(page);
  await expect(game.getByRole('group', {name: /A game is waiting/})).toContainText('you play White, Medium, 1 move in');
  await game.getByRole('button', {name: 'Continue the game'}).click();
  await expect(game.locator('.chess-moves li').first().locator('span')).toHaveCount(2);
  await game.getByRole('button', {name: 'Resign'}).click();
  await expect(game.getByRole('status')).toHaveText('Resigned. The computer won.');
  await expect.poll(async () => await kept(page)).toEqual({version: 1, tally: {medium: {won: 0, lost: 1, drawn: 0}}});
  await expect(game).toContainText('Against Medium: 0 won · 1 lost · 0 drawn.');
});

test('at 320 px the board and the levels fit with no sideways scroll; playing Black, the engine moves first', async ({page}) => {
  await offline(page);
  await page.setViewportSize({width: 320, height: 700});
  const game = await openPlay(page);
  await game.getByRole('group', {name: 'You play'}).getByRole('radio', {name: 'Black'}).check();
  await game.getByRole('button', {name: 'Start the game'}).click();
  await expect(game.locator('.chess-moves li').first().locator('span')).toHaveCount(1, {timeout: 15_000});
  await expect(game.getByRole('status')).toContainText('Your move (Black)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  // Change side or level keeps the game for later and gives focus back to Start.
  await game.getByRole('button', {name: 'Change side or level'}).click();
  await expect(game.getByRole('button', {name: 'Start a new game'})).toBeFocused();
  await expect(game.getByRole('button', {name: 'Continue the game'})).toBeVisible();
});

import {expect, type Page} from '@playwright/test';
import {DEFAULT_WIDGETS, FIRST_WIDGETS, isBrandNew, type NovaRecord, type NovaWidget} from '../lib/nova/store';

/**
 * Session AM (ADR-038 D2, deliberate): NOVA's stage starts empty. Before, a NOVA record without a widget list showed an
 * arrangement by itself: a brand-new NOVA (no record, or nothing but its version) was given the Command arrangement once
 * its opening was seen, and a record that existed without a list (the specs' usual `{version: 1, openingSeen: true}`)
 * read as AK's eight "Everyday" widgets. The specs written for those arrangements now arrange them first, as a person
 * does under View, and keep every assertion they had. Both lists come from the app's own code (lib/nova/store.ts,
 * lib/nova/layout.ts), so they cannot drift from what View puts on the stage.
 */
/** The Command arrangement (View → Command; what a brand-new NOVA opened on before D2). */
export const commandWidgets = (): NovaWidget[] => FIRST_WIDGETS();
/** AK's eight "Everyday" widgets (what a record without a list read as before D2). */
export const everydayWidgets = (): NovaWidget[] => DEFAULT_WIDGETS.map(w => ({...w}));
/**
 * `record` (NOVA's stored record, `zigoals:nova:v1`) with the arrangement it showed before D2 when it holds none of its
 * own: Command for a brand-new record, the Everyday eight for any other. A record with its own list is returned as it is.
 */
export function withEarlierWidgets<T extends Record<string, unknown>>(record: T | null | undefined): T & {widgets: NovaWidget[]} | T {
  const r = (record ?? {version: 1}) as T;
  if (Array.isArray(r.widgets)) return r;
  return {...r, widgets: isBrandNew(r as unknown as NovaRecord) ? commandWidgets() : everydayWidgets()};
}
/** The same, on a record already stored in the page (after a seed that wrote NOVA's record, or none). */
export const arrangeEarlierWidgets = (page: Page) => page.evaluate(([command, everyday]) => {
  const key = 'zigoals:nova:v1', r = JSON.parse(localStorage.getItem(key) ?? '{"version":1}') as Record<string, unknown>;
  if (Array.isArray(r.widgets)) return;
  localStorage.setItem(key, JSON.stringify({...r, widgets: Object.keys(r).every(k => k === 'version') ? command : everyday}));
}, [commandWidgets(), everydayWidgets()] as const);

/** NOVA's conversation (on a computer it is always in the page, hidden until it opens: ADR-038 D7). */
export const novaChat = (page: Page) => page.locator('section.nova-chat');
/**
 * Session AM (D7, deliberate): words the stage has a widget for are answered under the star (`.ns-answer`) with the
 * conversation closed; this is the answer's button that opens it ("Open the conversation", or "Open to decide" when a
 * card waits for a choice).
 */
export const novaAnswerOpen = (page: Page) => page.locator('.ns-answer').getByRole('button', {name: /^Open (?:the conversation|to decide)$/});
/**
 * After words were sent from the dashboard's command field: the conversation is open, either at once (any words the
 * stage has no widget for, and everything the safety guard answers) or after a press on the answer's button, as a
 * person would. It ends open and visible, which is what the earlier specs read next.
 */
export async function openNovaConversation(page: Page, timeout = 15_000) {
  await expect(novaChat(page).or(novaAnswerOpen(page)).filter({visible: true}).first()).toBeVisible({timeout});
  // The conversation can open by itself (a card to decide) in the moment between the look and the press: the press is then not needed.
  if (!await novaChat(page).isVisible()) await novaAnswerOpen(page).click({timeout: 3_000}).catch(() => undefined);
  await expect(novaChat(page)).toBeVisible();
}

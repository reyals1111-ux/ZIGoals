import type {Chat} from '../ai/chats';
import type {DelegatedTurn, NovaBridge} from './bridge';

/**
 * The Showcase's example of NOVA and ZIGi working together (Session AK, owner follow-up 2 N1; the lead wires it into the
 * Showcase loader): one conversation started in NOVA, with a Health task NOVA handed to ZIGi, labelled as an example in its
 * title and every answer. Fictional words only (no figure from anyone's records), stored like any chat of the Showcase
 * scope (the tab's session storage) plus its marks in `zigoals:nova-bridge:v1`, so it shows in NOVA's list and ZIGi's
 * History, in two voices, and leaves nothing behind when the Showcase ends.
 */
export const SHOWCASE_NOVA_CHAT_ID = 'showcase-nova-duo';
/** NOVA_BRIDGE_KEY, named here so the Showcase loader does not load the bridge (and ZIGi's panel helpers); a test keeps them equal. */
export const SHOWCASE_NOVA_BRIDGE_KEY = 'zigoals:nova-bridge:v1';
export function showcaseNovaChat(scope: string, now: Date): {chat: Chat; bridge: NovaBridge} {
  const at = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const chat: Chat = {version: 1, id: SHOWCASE_NOVA_CHAT_ID, scope, title: 'Example: my week, with ZIGi on Health', provider: null, model: null, createdAt: at(30), updatedAt: at(26), turns: [
    {id: 'sx-u1', role: 'user', text: 'How did my week go?', at: at(30)},
    {id: 'sx-a1', role: 'assistant', text: 'Showcase example. A steady week: most habits were checked in on most days, and one goal moved forward. Ask me to look closer at any part of it.', at: at(30), provider: null, model: null, usage: null},
    {id: 'sx-u2', role: 'user', text: 'Ask ZIGi how my water went this week.', at: at(27)},
    {id: 'sx-a2', role: 'assistant', text: 'Showcase example. Water was logged on most days, a little lower midweek. If you like, I can propose one glass now as a card: nothing is saved until you add it.', at: at(26), provider: null, model: null, usage: null},
  ]};
  const delegated: Record<string, DelegatedTurn> = {'sx-u2': {chat: SHOWCASE_NOVA_CHAT_ID, area: 'health', role: 'task'}, 'sx-a2': {chat: SHOWCASE_NOVA_CHAT_ID, area: 'health', role: 'reply'}};
  return {chat, bridge: {version: 1, origins: {[SHOWCASE_NOVA_CHAT_ID]: at(30)}, delegated}};
}

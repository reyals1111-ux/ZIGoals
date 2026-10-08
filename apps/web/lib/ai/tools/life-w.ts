import {z} from 'zod';
import {formatUnits} from '@zigoals/chain-config';
import {balanceOn, moneyText, netWorth} from '../../accounts/net-worth';
import {emptyAccounts, isDebtKind, type AccountKind} from '../../accounts/schema';
import {milestoneDateOf, milestoneState} from '../../goals/milestones';
import {challengeOf} from '../../habits-v2/challenge';
import {goalProgress as platformGoalProgress} from '../../positions';
import {CONTROL_NAME, currentRatings, goalProgress as chessGoalProgress, results, SITE_NAME} from '../../skills/chess/engine';
import type {ToolEnv} from './env';
import {capRows, ok, plural, provenance, refuse, text} from './format';
import {findGoal} from './goals';
import {parseRange} from './range';
import {NO_ARGS, type ToolDefinition} from './types';

/**
 * Session W Part 21 (W7): ZIGi reads the other areas Session W added, each under its own area switch like every tool:
 * accounts and net worth (Wealth), milestones (Goals), challenges (Habits), chess and My links (Today). Money is the
 * accounts' own exact text in their own currency, one total per currency and never converted; a balance or a value that
 * is not known is said so, never 0. No account number, bank login, chess username, game link or link address exists in
 * these results. Nothing here can move money: an account's balance is only ever pre-filled for the person to save.
 */
const KIND_WORDS: Readonly<Record<AccountKind, string>> = {cash: 'cash', savings: 'savings', investment: 'investment', pension: 'pension', property: 'property', vehicle: 'vehicle', 'other-asset': 'other asset', loan: 'loan', mortgage: 'mortgage', 'credit-card': 'credit card', 'other-debt': 'other debt'};

export const accountsTool: ToolDefinition<{include_archived?: boolean}> = {
  name: 'accounts', title: 'Accounts and debts', area: 'wealth',
  description: 'The person\'s own accounts and debts kept on this device: kind, name, currency, the latest balance and its date (for a debt, what is owed) and an interest rate only when they typed one. Never converted between currencies; no account number or bank link exists.',
  parameters: {type: 'object', properties: {include_archived: {type: 'boolean', description: 'Also list archived accounts (default false).'}}},
  args: z.object({include_archived: z.boolean().optional()}),
  label: () => 'Accounts and debts',
  run(args, env, label) {
    const items = (env.accounts?.items ?? []).filter(a => args.include_archived || !a.archivedAt);
    const rows = items.map(a => {
      const b = balanceOn(a);
      return {kind: KIND_WORDS[a.kind], debt: isDebtKind(a.kind), name: text(a.name, 60), currency: a.currency, ...(b ? {latest: `${moneyText(b)} ${a.currency}`, asOf: b.date} : {latest: 'no balance yet'}),
        ...(a.ratePercent ? {yourRatePercent: a.ratePercent} : {}), ...(a.archivedAt ? {archived: true} : {})};
    });
    const capped = capRows(rows, env, false);
    return ok('accounts', label, provenance(env, 'accounts', null, null, null), {accounts: capped.rows, count: rows.length,
      note: rows.length ? 'Accounts stay on this device until account sync carries them. Each account keeps its own currency; nothing is converted.' : 'No accounts or debts yet (Wealth → Accounts and debts).'}, capped.truncated);
  },
};

export const netWorthTool: ToolDefinition<Record<string, never>> = {
  name: 'net_worth', title: 'Net worth', area: 'wealth',
  description: 'Net worth per currency, never converted: the accounts\' latest balances (assets minus debts) plus the Wealth holdings that have a value in that currency, how many accounts have no balance yet and how many holdings have no value (counted, never as zero), with the formula.',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'Net worth',
  run(_args, env, label) {
    const {rows, unvaluedHoldings} = netWorth(env.accounts ?? emptyAccounts(), env.habitDay, env.platform.positions);
    const perCurrency = rows.map(r => ({currency: r.currency, netWorth: `${moneyText(r.net)} ${r.currency}`, assets: `${moneyText(r.assets)} ${r.currency}`, debts: `${moneyText(r.debts)} ${r.currency}`, holdingsWithAValue: `${moneyText(r.holdings)} ${r.currency}`,
      accounts: r.accounts, ...(r.noBalance ? {accountsWithoutABalance: r.noBalance} : {})}));
    return ok('net_worth', label, provenance(env, 'accounts and Wealth holdings', null, null, null), {perCurrency, holdingsWithoutAValue: unvaluedHoldings,
      formula: 'net worth = assets + holdings with a value − debts, for each currency on its own; never converted, so two currencies are two totals',
      ...(perCurrency.length ? {} : {note: 'No account, debt or valued holding yet.'})});
  },
};

/** A goal's milestones with their state: the person's tick, or reached once the recorded progress passes the value. */
function milestoneRows(env: ToolEnv, goalId: string) {
  const goal = env.platform.goals.find(g => g.id === goalId);
  if (!goal) return null;
  let current: bigint | null = null;
  try { current = BigInt(platformGoalProgress(env.platform, goal.id, env.now.getTime(), env.quotes).current); } catch { current = null; }
  const rows = goal.milestones.map(m => {
    const date = env.milestoneDates ? milestoneDateOf(env.milestoneDates, goal.id, m.id) : undefined;
    return {title: text(m.title, 100), ...(m.target !== undefined && goal.type !== 'PROJECT' ? {value: `${formatUnits(m.target, goal.decimals)} ${goal.asset}`} : {}), ...(date ? {targetDate: date} : {}),
      state: m.done ? 'done (your tick)' : current === null ? 'open' : milestoneState(m, current) === 'reached' ? 'reached (recorded progress passed it)' : 'open'};
  });
  return {goal, rows};
}
export const milestonesTool: ToolDefinition<{goal?: string}> = {
  name: 'milestones', title: 'Milestones', area: 'goals',
  description: 'The milestones of the person\'s goals: the goal with its handle, each milestone\'s title, its value in the goal\'s own currency when set, its target date when set on this device, and whether it is done (their tick), reached (the recorded progress passed its value) or open.',
  parameters: {type: 'object', properties: {goal: {type: 'string', description: 'Only this goal: a handle from this conversation (g1) or its name as the person said it.'}}},
  args: z.object({goal: z.string().trim().min(1).max(120).optional()}),
  label: args => args.goal ? `Milestones · ${text(args.goal, 40)}` : 'Milestones',
  run(args, env, label) {
    let ids: string[];
    if (args.goal) {
      const found = findGoal(env, args.goal, 'milestones'); if (!found.ok) return found;
      if (!found.goal.key.startsWith('private:')) return refuse('milestones', label, 'not-found', 'This goal is a simulation goal; its steps are on its own page.');
      ids = [found.goal.key.slice('private:'.length)];
    } else ids = env.platform.goals.filter(g => g.status !== 'closed' && g.milestones.length).map(g => g.id);
    const goals = ids.flatMap(id => { const m = milestoneRows(env, id); return m ? [{handle: env.handles.add('goal', `private:${m.goal.id}`, m.goal.name), goal: text(m.goal.name), milestones: m.rows, done: m.goal.milestones.filter(x => x.done).length, total: m.goal.milestones.length}] : []; });
    const capped = capRows(goals, env, false);
    return ok('milestones', label, provenance(env, 'Goals', args.goal ? text(args.goal, 40) : null, null, null), {goals: capped.rows, count: goals.length,
      ...(goals.length ? {} : {note: args.goal ? 'This goal has no milestones yet.' : 'No open goal has milestones yet.'})}, capped.truncated);
  },
};

export const challengesTool: ToolDefinition<{include_finished?: boolean}> = {
  name: 'challenges', title: 'Challenges', area: 'habits',
  description: 'The person\'s habit challenges (a habit with its own end date): the habit with its handle, start and end dates, which day of the challenge today is, the scheduled days done so far (rest days are neutral), and whether it has finished.',
  parameters: {type: 'object', properties: {include_finished: {type: 'boolean', description: 'Also list challenges that have ended (default false).'}}},
  args: z.object({include_finished: z.boolean().optional()}),
  label: () => 'Challenges',
  run(args, env, label) {
    // A check-in that a Health link filled in is held back while Health is not shared, as in the other habit tools.
    const rows = env.habits.habits.flatMap(h => {
      const c = challengeOf(env.health ? h : {...h, entries: h.entries.filter(e => e.source !== 'health')}, env.habitDay);
      if (!c || (c.finished && !args.include_finished)) return [];
      return [{handle: env.handles.add('habit', h.id, h.title), habit: text(h.title, 60), started: c.start, ends: c.end, today: c.finished ? 'finished' : `day ${c.dayNumber} of ${c.days}`, doneSoFar: `${c.done} of ${c.scheduled} scheduled days`, finished: c.finished}];
    });
    const capped = capRows(rows, env, false);
    return ok('challenges', label, provenance(env, 'Habits journal', null, null, env.habitZone), {challenges: capped.rows, count: rows.length,
      ...(rows.length ? {} : {note: 'No challenge running. A challenge is a habit with its own end date (Habits → a habit → Start a challenge).'})}, capped.truncated);
  },
};

export const chessRatings: ToolDefinition<Record<string, never>> = {
  name: 'chess_ratings', title: 'Chess ratings', area: 'today',
  description: 'The person\'s chess ratings as chess.com and Lichess published them, from what this device last read: site, time control, rating and the day it was read, which sites are followed, and their own rating goals with how far each is. No username or game link.',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'Chess ratings',
  run(_args, env, label) {
    const cache = env.chess?.cache, settings = env.chess?.settings;
    const ratings = cache ? currentRatings(cache).map(r => ({site: SITE_NAME[r.site], control: CONTROL_NAME[r.control], rating: r.rating, readOn: r.at.slice(0, 10)})) : [];
    const goals = cache && settings ? settings.goals.filter(g => g.status === 'active').map(g => { const p = chessGoalProgress(cache, g); return {site: SITE_NAME[g.site], control: CONTROL_NAME[g.control], yourTarget: g.target, now: p.rating ?? 'no rating yet', ...(p.left !== null ? {left: p.left} : {}), reached: p.reached}; }) : [];
    return ok('chess_ratings', label, provenance(env, 'chess records', 'as the sites published them', null, null), {ratings, followed: {chesscom: settings?.chesscom ? 'yes' : 'no', lichess: settings?.lichess ? 'yes' : 'no'}, yourGoals: goals,
      ...(ratings.length ? {} : {note: 'No ratings yet: add a chess.com or Lichess username in Settings → Chess.'})});
  },
};

export const chessGames: ToolDefinition<{range?: string}> = {
  name: 'chess_games', title: 'Chess games', area: 'today',
  description: 'The person\'s recent chess games as the sites list them, for a period: day, site, time control, colour, result, the opponent\'s rating, the opening and whether it was rated, with wins, draws and losses by colour and by time control. No username, opponent name or game link.',
  parameters: {type: 'object', properties: {range: {type: 'string', description: 'A period such as "this week", "last month" or "the last 30 days". Default: the last 30 days.'}}},
  args: z.object({range: z.string().trim().max(80).optional()}),
  label: args => `Chess games · ${args.range?.trim() || 'the last 30 days'}`,
  run(args, env, label) {
    const range = parseRange(args.range?.trim() || 'the last 30 days', env.habitDay);
    if (!range.ok) return refuse('chess_games', label, 'range', range.message);
    const games = (env.chess?.cache.games ?? []).filter(g => { const day = g.endedAt.slice(0, 10); return day >= range.from && day <= range.to; }).sort((a, b) => a.endedAt.localeCompare(b.endedAt));
    const rows = games.map(g => ({day: g.endedAt.slice(0, 10), site: SITE_NAME[g.site], control: CONTROL_NAME[g.control], colour: g.color, result: g.result, ...(g.opponentRating !== null ? {opponentRating: g.opponentRating} : {}), ...(g.opening ? {opening: text(g.opening, 60)} : {}), rated: g.rated}));
    const r = results(games), capped = capRows(rows, env);
    return ok('chess_games', label, provenance(env, 'chess records', 'as the sites listed them', {from: range.from, to: range.to, label: range.label}, null), {games: capped.rows, count: rows.length,
      results: {total: r.total, asWhite: r.white, asBlack: r.black, byControl: r.byControl.map(c => ({control: CONTROL_NAME[c.control], ...c.record}))}, ...(rows.length ? {} : {note: 'No game in this period, as far as this device last read.'})}, capped.truncated);
  },
};

export const linksCount: ToolDefinition<Record<string, never>> = {
  name: 'links_count', title: 'My links', area: 'today',
  description: 'How many links the person keeps in My links (Settings → My links) and nothing else: their names and addresses stay on the device and are never shared with ZIGi.',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'My links',
  run(_args, env, label) {
    const count = env.linksCount ?? 0;
    return ok('links_count', label, provenance(env, 'settings', null, null, null), {count, note: count ? `${plural(count, 'link')} in My links; their names and addresses are not shared with ZIGi.` : 'No links in My links yet.'});
  },
};

export const ACCOUNT_TOOLS = [accountsTool, netWorthTool] as const;
export const SKILL_TOOLS = [chessRatings, chessGames, linksCount] as const;

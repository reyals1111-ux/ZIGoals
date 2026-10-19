import * as z from 'zod';
import {ok, provenance, text} from './format';
import type {ToolDefinition} from './types';

/**
 * Session AF (L4, P8.5; ADR-028 H17, H69): `earn_rates`, the Earn coach's only source of figures. It quotes the Earn
 * snapshot — what the Earn page (or the Staking page's preview) read in this visit — each figure as `{value, source,
 * asOf}`, and when there is none it says so instead of a figure: ZIGi states no rate, fee or time without a source and
 * an "as of". It never fetches, never computes, never ranks options by rate; every figure is the provider's or the
 * chain's own claim, not ZIGoals' and not advice. Public figures only: nothing about the person's wallet.
 */
export const EARN_OPTIONS = ['native-staking', 'valdora', 'valdora-vaults', 'oroswap', 'nawa', 'defa', 'permapod', 'stablecoins'] as const;
/** The option's name as Earn's own index says it (the chip a person sees beside a question), never its internal id. */
export const EARN_OPTION_NAMES: Record<(typeof EARN_OPTIONS)[number], string> = {'native-staking': 'Native staking', valdora: 'Valdora stZIG', 'valdora-vaults': 'USDC vaults', oroswap: 'OroSwap', nawa: 'Nawa', defa: 'DeFa', permapod: 'Permapod', stablecoins: 'Stablecoins'};
export const EARN_RULE = 'Figures are the chain\'s or the provider\'s own claims as the Earn page read them, each with its source and "as of"; not ZIGoals\' and not advice. Quote them as given; state no figure that is not here, and never rank the options by rate.';
export const earnRates: ToolDefinition<{option?: (typeof EARN_OPTIONS)[number]}> = {
  name: 'earn_rates', title: 'Earn figures', area: 'wealth',
  description: 'The live figures of the ways to earn on ZIGChain (staking APR as the issuance and measured figures, unbonding time, fees, vault totals), exactly as the Earn page read them, each with its source and "as of"; none when not read yet.',
  parameters: {type: 'object', properties: {option: {type: 'string', enum: EARN_OPTIONS, description: 'Only one way to earn (optional).'}}},
  args: z.object({option: z.enum(EARN_OPTIONS).optional()}),
  label: args => args.option ? `Earn figures · ${EARN_OPTION_NAMES[args.option]}` : 'Earn figures',
  run(args, env, label) {
    const snapshot = env.earn, figures = (snapshot?.figures ?? []).filter(f => !args.option || f.option === args.option || (args.option === 'stablecoins' && /vault|usdc/i.test(f.id)));
    const families = Object.values(snapshot?.families ?? {}).map(f => f!.status === 'ok' ? {family: f!.family, status: 'read', source: text(f!.source, 80), asOf: f!.asOf, ...(f!.stale ? {stale: true} : {})} : {family: f!.family, status: 'unavailable', reason: text(f!.words, 140)});
    const data: Record<string, unknown> = {rule: EARN_RULE, figures: figures.slice(0, env.limits.rows).map(f => ({option: f.option, figure: text(f.label, 160), value: text(f.value, 40), source: text(f.source, 80), asOf: f.asOf})), families};
    if (!figures.length) data.unavailable = snapshot?.updatedAt ? 'No figure for that was read in this visit; the Earn page shows it with its source.' : 'Not read yet in this visit: the Earn page reads them live when it is open. State no figure; point to the Earn page.';
    if (snapshot?.disagree) data.note = 'The issuance and the measured staking figures disagree; both stay, side by side.';
    return ok('earn_rates', label, provenance(env, 'Earn page reads in this visit (public figures, as read)', args.option ?? null, null, null), data);
  },
};

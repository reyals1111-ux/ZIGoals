'use client';
import {useEffect, useMemo} from 'react';
import {DEFAULT_NOVA_SCOPES, type NovaScopes} from '../../../lib/ai/context-pack/nova';
import type {ToolEnv} from '../../../lib/ai/tools/env';
import {novaLocalEnv} from '../../../lib/nova/local-env';
import {scopesOf} from '../../../lib/nova/scopes';
import {NOVA_SETUP} from '../../../lib/nova/setup';
import {useAiContext} from '../../ai/use-ai-context';
import {useAiSettings} from '../../ai/use-ai-settings';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useSensitiveScreen} from '../../ai/use-sensitive-screen';
import {useChainChoice} from '../../chain/use-chain-choice';
import type {StageGates} from './use-stage';

/**
 * Session AM (D5): what a made widget may read — the same switches NOVA's on-device answers read under (Q14, Q16).
 * Security review AM-S2: Today, Notes and the Journal are three permissions of NOVA's; the environment's Today area is
 * open when any of them is, so each gate is read from its own scope. A private screen closes every gate; an environment
 * that is not read yet gives no gates (a made widget then says "Reading…").
 */
const CLOSED: StageGates = {today: false, notes: false, journal: false, goals: false, habits: false, wealth: false, health: false};
export function stageGatesOf(env: ToolEnv | null, sensitive: boolean, scopes: NovaScopes): StageGates | null {
  if (sensitive) return CLOSED;
  if (!env) return null;
  return {today: env.areas.today && scopes.today, notes: env.areas.today && scopes.notes, journal: env.areas.today && scopes.journal, goals: env.areas.goals, habits: env.areas.habits, wealth: env.areas.wealth, health: env.areas.health && env.health !== null};
}

/**
 * Security review AM-S12: the gates while NOVA's conversation is not mounted (a phone with its sheet closed). The
 * conversation publishes the gates itself while it is open; without it this reads the same settings, permissions and
 * records, so a permission turned off in the Permissions sheet locks a made widget at once. Renders nothing.
 */
export default function StageGatesWatch({setGates}: {setGates: (gates: StageGates | null) => void}) {
  const settings = useAiSettings(), sensitive = useSensitiveScreen(), context = useAiContext(settings.data, 'your AI', sensitive);
  const setup = useDeviceRecord(NOVA_SETUP), scopes = useMemo(() => setup.unreadable ? {...DEFAULT_NOVA_SCOPES} : scopesOf(setup.data), [setup.unreadable, setup.data]);
  const chainChosen = useChainChoice().chosen;
  useEffect(() => {
    setGates(stageGatesOf(sensitive ? null : novaLocalEnv({sources: context.toolSources(), gates: context.gates, scopes, chainChosen}), sensitive, scopes));
  }, [setGates, context, scopes, chainChosen, sensitive]);
  return null;
}

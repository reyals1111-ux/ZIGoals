'use client';
import {useMemo} from 'react';
import {toolEnv} from '../../../lib/ai/tools/env';
import {scopedEnv, type BriefScopes} from '../../../lib/nova/briefs';
import type {WorkflowSources} from '../../../lib/nova/workflows/readers';
import {FOCUS_SESSIONS} from '../../../lib/focus-sessions/schema';
import {TASKS} from '../../../lib/tasks/schema';
import {NOTES} from '../../../lib/notes/schema';
import {NOVA_SETUP} from '../../../lib/nova/setup';
import {scopesOf} from '../../../lib/nova/scopes';
import {useAiContext} from '../../ai/use-ai-context';
import {useAiSettings} from '../../ai/use-ai-settings';
import {useDeviceRecord} from '../../ai/use-device-record';

/**
 * What NOVA's briefs and workflows may read (Session AK, owner follow-up 2 N4/N6), from ZIGi's one context: the same stores
 * and gates, narrowed by NOVA's eight permissions (lib/nova/scopes.ts in `zigoals:nova-setup:v1`, lane NE's `NovaScopes`:
 * Health, Notes and the Journal off by default; Health also through ZIGi's three-part gate). `local` is what NOVA reads to
 * show on this device; `send` is what may go to the person's model (null while no model is connected), read through the
 * provider path's gates (ZIGi's page switches still apply there). Nothing is read on a private screen.
 */
export type NovaSources = {ready: boolean; local: WorkflowSources | null; send: WorkflowSources | null; scopes: BriefScopes; healthShared: boolean; connected: boolean};
export function useNovaSources(): NovaSources {
  const settings = useAiSettings(), context = useAiContext(settings.data, 'your AI', false);
  const focus = useDeviceRecord(FOCUS_SESSIONS), tasks = useDeviceRecord(TASKS), notes = useDeviceRecord(NOTES), setup = useDeviceRecord(NOVA_SETUP);
  const {toolSources, gates, ready} = context, connected = settings.data.enabled;
  const stored = useMemo(() => scopesOf(setup.unreadable ? {version: 1} : setup.data), [setup.data, setup.unreadable]);
  return useMemo<NovaSources>(() => {
    const scopes: BriefScopes = {...stored, health: stored.health && gates.localHealth};
    const base = {scopes, healthShared: scopes.health, connected};
    const sources = settings.loaded ? toolSources() : null;
    if (!sources) return {...base, ready: settings.loaded && ready, local: null, send: null};
    const extra = {focus: focus.loaded && !focus.unreadable ? focus.data : null, tasks: tasks.loaded && !tasks.unreadable ? tasks.data : null, notes: scopes.notes && notes.loaded && !notes.unreadable ? notes.data : null};
    const local = {env: scopedEnv(toolEnv(sources, gates, 'local'), scopes), scopes, ...extra};
    const send = connected ? {env: scopedEnv(toolEnv(sources, gates, 'provider'), scopes), scopes, ...extra} : null;
    return {...base, ready: ready && focus.loaded && tasks.loaded && notes.loaded && setup.loaded, local, send};
  }, [stored, setup.loaded, gates, connected, settings.loaded, toolSources, ready, focus.loaded, focus.unreadable, focus.data, tasks.loaded, tasks.unreadable, tasks.data, notes.loaded, notes.unreadable, notes.data]);
}

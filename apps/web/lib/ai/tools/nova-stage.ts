import * as z from 'zod';
import {WIDGET_RANGES} from '../../nova/stage/record';
import {WIDGETS, widgetSpec} from '../../nova/widgets/catalog';
import type {ToolEnv} from './env';
import {refuse} from './format';
import type {ToolDefinition} from './types';

/**
 * Session AM (ADR-038 D4, A4): the two tools only NOVA's stage offers a connected model.
 *
 * `stage_widget` lets the model show, pin, hide or close a widget of the closed catalogue on the person's own screen. It
 * is read-only like every tool: it reads nothing, writes nothing and returns only "noted". The stage itself applies the
 * call after the reply arrives (components/nova/stage/use-summoner.ts), and the widget then draws its own figures from the
 * person's records on the device, under the stage's gates — so a model chooses *which* widget, never a word or a number
 * inside it. There is no argument for free text or markup, and no tool or action anywhere that changes a permission, the
 * outside-data switch, the privacy mode or a page-data switch: only the person can (lib/ai/tools/nova-stage.test.ts).
 *
 * `weather` hands the model the reading the person's device already holds, or says that weather is off or not read yet.
 * It never fetches: only the weather widget does, and only once the person turned outside data on.
 */
export type StageWeather = {on: boolean; place?: string; sentence?: string; asOf?: string};
/** What NOVA's surface tells the tools about its stage (set on NOVA's own environment only; absent everywhere else). */
export type StageInfo = {kinds: readonly string[]; weather?: StageWeather};
export const STAGE_ACTIONS = ['show', 'pin', 'hide', 'close'] as const;
export type StageAction = (typeof STAGE_ACTIONS)[number];
const KINDS = WIDGETS.map(w => w.id);
const stageArgs = z.object({action: z.enum(STAGE_ACTIONS), widget: z.string().max(40), range: z.enum(WIDGET_RANGES).optional()}).strict();
export type StageWidgetArgs = z.infer<typeof stageArgs>;
const stageOf = (env: ToolEnv): StageInfo | null => env.stage ?? null;

export const stageWidgetTool: ToolDefinition<StageWidgetArgs> = {
  name: 'stage_widget',
  title: 'NOVA’s stage',
  description: 'Show, pin, hide or close ONE widget on NOVA’s stage on the person’s screen. The widget draws its own figures from the person’s records on their device; you only choose which. "show" when a picture helps, "pin" to keep, "hide" or "close" to put away. It changes no record, permission or setting. Never state a figure you did not look up.',
  area: 'today',
  surface: 'nova',
  parameters: {type: 'object', properties: {
    action: {type: 'string', enum: STAGE_ACTIONS, description: 'What to do with the widget.'},
    widget: {type: 'string', enum: KINDS, description: `Which widget: ${WIDGETS.map(w => `${w.id} (${w.title})`).join(', ')}.`},
    range: {type: 'string', enum: WIDGET_RANGES, description: 'For a widget over time (weight, steps, workouts, net-worth, spending): how far back.'},
  }, required: ['action', 'widget']},
  args: stageArgs,
  label: args => `${args.action[0]!.toUpperCase()}${args.action.slice(1)} · ${widgetSpec(args.widget)?.title ?? 'a widget'}`,
  run(args, env, label) {
    const stage = stageOf(env), spec = widgetSpec(args.widget);
    if (!stage) return refuse('stage_widget', label, 'area', 'NOVA’s stage is not open here.');
    if (!spec || !stage.kinds.includes(args.widget)) return refuse('stage_widget', label, 'not-found', 'That widget cannot show here. Use one of the widgets listed.');
    return {ok: true, tool: 'stage_widget', label, provenance: 'NOVA’s stage on this device', truncated: null,
      data: {noted: `${args.action} ${spec.title}`, widget: spec.title, about: spec.about, note: 'The widget shows its own figures from the person’s records. Say what is on the stage; never state a figure you did not look up.'}};
  },
};

const weatherArgs = z.object({}).strict();
export const weatherTool: ToolDefinition<z.infer<typeof weatherArgs>> = {
  name: 'weather',
  title: 'Weather',
  description: 'The weather reading the person’s device already holds for the place they chose (outside data from MET Norway, only if they turned it on). Never guess the weather: if this says it is off or not read yet, say so.',
  area: 'today',
  surface: 'nova',
  parameters: {type: 'object', properties: {}},
  args: weatherArgs,
  label: () => 'Weather',
  run(_args, env, label) {
    const stage = stageOf(env);
    if (!stage) return refuse('weather', label, 'area', 'Weather is part of NOVA’s stage, which is not open here.');
    const w = stage.weather;
    if (!w?.on) return {ok: true, tool: 'weather', label, provenance: 'NOVA → Permissions on this device', truncated: null,
      data: {state: 'off', say: 'Weather (outside data) is off. Only the person can turn it on, in NOVA → Permissions. Do not guess the weather.'}};
    if (!w.sentence) return {ok: true, tool: 'weather', label, provenance: 'NOVA’s weather widget on this device', truncated: null,
      data: {state: 'not read yet', place: w.place ?? 'no place chosen', say: 'No reading is on this device yet; the weather widget fetches it when it is on the stage. Do not guess the weather.'}};
    return {ok: true, tool: 'weather', label, provenance: 'Data from MET Norway, as read by this device', truncated: null,
      data: {state: 'read', place: w.place ?? '', reading: w.sentence, asOf: w.asOf ?? '', note: 'A forecast, not a promise. Credit: Data from MET Norway.'}};
  },
};
export const STAGE_TOOLS = [stageWidgetTool, weatherTool] as const;

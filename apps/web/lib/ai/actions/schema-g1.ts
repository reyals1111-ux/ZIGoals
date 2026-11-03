import * as z from 'zod';
import {BP_LIMITS, NOTE_MAX} from '../../health-numbers/store';
import {SCALE_NAME_MAX} from '../../scales/store';

/**
 * Owner follow-up 2 (G8, "tools for G1"): the cards ZIGi and NOVA (one engine) propose for BUILD list 2's features where
 * no existing kind fits. Each is a confirm card with its Undo, never automatic (auto-accept's never list):
 * - `log-blood-pressure`: a blood pressure reading (and pulse) into Health → Your numbers (`zigoals:health-numbers:v1`)
 *   through its own `bpEntry`; the card says the numbers and nothing about them (not a diagnosis); Undo removes it;
 * - `rate-scale`: one of the person's own 1–5 scales rated for a day (`zigoals:scales:v1`, `rateScale`); Undo puts the
 *   day's rating back as it was;
 * - `move-task`: the evening wrap-up's two choices for an open task (lib/wrap-up-tasks): move it to tomorrow, or let it go
 *   (it stays in Tasks with no day); Undo puts the task back as it was.
 * Money keeps its kinds: `log-expense` and `log-income` take a sum as their amount ("12,50+3,20", worked out by
 * lib/money-calc, no eval), and stay never automatic. The arguments are data: a scale or a task is named and matched on the
 * device (one match, never a guess).
 */
const day = z.union([z.literal('today'), z.literal('yesterday'), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'A day is YYYY-MM-DD.').refine(v => !Number.isNaN(Date.parse(`${v}T12:00:00Z`)), 'That day does not exist.')]);
const whole = (key: keyof typeof BP_LIMITS, label: string) => z.number().int(`${label} is a whole number.`).min(BP_LIMITS[key][0]).max(BP_LIMITS[key][1]);
export const MOVE_TASK_TO = ['tomorrow', 'let-go'] as const;
export const G1_ACTION_SCHEMAS = [
  z.strictObject({kind: z.literal('log-blood-pressure'), systolic: whole('systolic', 'The upper number'), diastolic: whole('diastolic', 'The lower number'), pulse: whole('pulse', 'The pulse').optional(),
    day: day.default('today'), note: z.string().trim().max(NOTE_MAX).optional()})
    .refine(a => a.diastolic < a.systolic, 'The upper number (systolic) is the larger one.'),
  z.strictObject({kind: z.literal('rate-scale'), scale: z.string().trim().min(1).max(SCALE_NAME_MAX + 10), value: z.number().int().min(1).max(5), day: day.default('today')}),
  z.strictObject({kind: z.literal('move-task'), task: z.string().trim().min(1).max(140), to: z.enum(MOVE_TASK_TO).default('tomorrow')}),
] as const;
export const G1_ACTION_KINDS = ['log-blood-pressure', 'rate-scale', 'move-task'] as const;
export const G1_ALIASES = {
  'log_blood_pressure': 'log-blood-pressure', 'blood-pressure': 'log-blood-pressure', 'blood_pressure': 'log-blood-pressure', 'log-bp': 'log-blood-pressure', bp: 'log-blood-pressure', 'add-blood-pressure': 'log-blood-pressure', 'bloeddruk': 'log-blood-pressure',
  'rate_scale': 'rate-scale', 'rate-my-scale': 'rate-scale', 'scale-rating': 'rate-scale', 'log-scale': 'rate-scale', 'my-scale': 'rate-scale',
  'move_task': 'move-task', 'postpone-task': 'move-task', 'reschedule-task': 'move-task', 'task-to-tomorrow': 'move-task', 'move-to-tomorrow': 'move-task', 'let-task-go': 'move-task', 'let-go': 'move-task',
} as const;

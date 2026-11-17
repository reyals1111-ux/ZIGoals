import type {WidgetParams} from '../stage/record';
import {AX_DAY_LINES} from './ax-lines-day';
import {AX_HABIT_LINES} from './ax-lines-habits';
import {AX_HEALTH_LINES} from './ax-lines-health';
import {AX_MONEY_LINES} from './ax-lines-money';
import type {LineData, LineLang} from './lines';
import {sentenceCut} from './words';

/**
 * Session AS (ADR-042 Part 2): the one-line summary of an answer widget, for the moments the stage speaks for a widget
 * itself (pinned from the gallery, shown again from the requests). When an answer made the widget, the answer's own
 * words stand under the star instead (lib/nova/summon/words.ts `stageAnswerText`). Each line is written from the same
 * selector as its widget, cut to two sentences. `undefined`: not one of these kinds; `null`: nothing honest to say.
 */
export type AxLine = (params: WidgetParams | undefined, data: LineData, lang: LineLang, now: Date) => string | null;
const LINES: Readonly<Record<string, AxLine>> = {...AX_HABIT_LINES, ...AX_HEALTH_LINES, ...AX_MONEY_LINES, ...AX_DAY_LINES};
export function axLine(id: string, params: WidgetParams | undefined, data: LineData, lang: LineLang, now: Date): string | null | undefined {
  const line = LINES[id];
  if (!line) return undefined;
  const text = line(params, data, lang, now);
  return text ? sentenceCut(text, 2, 190) : null;
}

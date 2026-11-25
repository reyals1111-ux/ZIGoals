import {addLocalDays} from '../local-date';
import {BODY_EXTRAS_KEY, bodyExtrasSchema} from './schema';

/**
 * Session AW (X6; LEDGER #456, #457): the Showcase's labelled examples in zigoals:body-extras:v1 — two days named ahead
 * ("Example · The wedding", "Example · A holiday") for the trend's estimate, and two notes on the Showcase's own weigh-ins
 * (`health_weight-012` and `-024`, from lib/showcase-data.ts, one every fourth day). No height and no milestones, as before,
 * so the BMI and milestone answers stay as they were. In this tab's Showcase storage only; nothing else changes.
 */
export function withX6BodyShowcase(records: Record<string, string>, day: string): Record<string, string> {
  records[BODY_EXTRAS_KEY] = JSON.stringify(bodyExtrasSchema.parse({version: 1,
    namedDays: [{id: 'nd-showcase-wedding', name: 'Example · The wedding', on: addLocalDays(day, 33)}, {id: 'nd-showcase-holiday', name: 'Example · A holiday', on: addLocalDays(day, 75)}],
    weighNotes: [{id: 'health_weight-012', note: 'Example · after the holiday'}, {id: 'health_weight-024', note: 'Example · new scale'}]}));
  return records;
}

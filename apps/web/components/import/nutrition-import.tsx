'use client';
import {useMemo, useState} from 'react';
import {HEALTH_MEALS, type HealthData} from '../../lib/health';
import {NUTRITION_FIELDS, applyNutritionImport, distinctMeals, guessMeal, planNutritionImport, type Meal, type NutritionBasis, previewLine} from '../../lib/import/nutrition';
import type {ImportRecord} from '../../lib/import/undo-schema';
import {localDate} from '../../lib/local-date';
import {FileStep, MappingStep, RecentImports, RefusedRows, StepActions, StepHeading, setupFromText, withGuesses, type CsvFile, type CsvSetup, type SetupOptions} from './csv-import-steps';
import {detectNutritionPreset, type NutritionPreset} from '../../lib/import/nutrition-presets';
import type {ImportUndoStore} from './use-import-undo';
import {plainErrorMessage} from '../../lib/plain-error';

const OPTIONS: SetupOptions = {fields: NUTRITION_FIELDS, numberFields: ['quantity', 'servingAmount', 'kcal', 'protein', 'carbs', 'fat'], dateField: 'date'};
const REQUIRED = ['date', 'food'];
const PREVIEW_ID = 'preview', PREVIEW_AT = '2000-01-01T00:00:00.000Z';
/**
 * I1: meals from a nutrition CSV into Health's diary. Blank stays unknown; a food joins the library only when the file
 * says what a serving weighs or measures; the apply is one validated Health write. Session W Part 7: a MyFitnessPal or
 * Cronometer file is recognised by its header and its column matches are pre-filled, flagged as community-documented,
 * for the person to check in the same step.
 */
export function NutritionImportPanel({update, imports, onUndo, onClose}: {data: HealthData; update: (fn: (d: HealthData) => HealthData) => Promise<unknown>; imports: ImportUndoStore; onUndo: (record: ImportRecord) => Promise<void>; onClose: () => void}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1), [file, setFile] = useState<CsvFile | null>(null), [setup, setSetup] = useState<CsvSetup | null>(null);
  const [basis, setBasis] = useState<NutritionBasis>('serving'), [mealMap, setMealMap] = useState<Record<string, Meal>>({});
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState<{id: string; entries: number; foods: number; note: string} | null>(null), [preset, setPreset] = useState<NutritionPreset | null>(null);
  const today = localDate();
  const meals = useMemo(() => setup ? distinctMeals(setup.parsed.rows, setup.mapping) : [], [setup]);
  const plan = useMemo(() => setup ? planNutritionImport({rows: setup.parsed.rows, mapping: setup.mapping, numberStyle: setup.numberStyle, dateFormat: setup.dateFormat, basis, mealMap, today, importId: PREVIEW_ID, at: PREVIEW_AT}) : null, [setup, basis, mealMap, today]);
  const mappingReady = !!setup && REQUIRED.every(id => setup.mapping[id] !== undefined) && !setup.ambiguousDates;
  const mealFor = (text: string) => mealMap[text] ?? guessMeal(text) ?? 'Snacks';
  function chooseFile(f: CsvFile): string | null {
    try { let next = setupFromText(f.text, OPTIONS); const found = detectNutritionPreset(next.parsed.header); if (found) next = withGuesses({...next, mapping: found.mapping}, OPTIONS, {numbers: true, dates: true}); setPreset(found); setSetup(next); setFile(f); setMealMap({}); setBasis('serving'); setDone(null); setError(''); setStep(2); return null; }
    catch (cause) { return plainErrorMessage(cause, 'This file could not be read.'); }
  }
  async function confirm() {
    if (!setup) return;
    setBusy(true); setError('');
    const importId = crypto.randomUUID(), at = new Date().toISOString();
    const final = planNutritionImport({rows: setup.parsed.rows, mapping: setup.mapping, numberStyle: setup.numberStyle, dateFormat: setup.dateFormat, basis, mealMap, today, importId, at});
    try { await update(d => applyNutritionImport(d, final)); }
    catch (cause) { setError(plainErrorMessage(cause, 'The file was not imported. Nothing was changed.')); setBusy(false); return; }
    let note = '';
    try { imports.record({id: importId, kind: 'nutrition', at, label: `${final.entries.length} ${final.entries.length === 1 ? 'entry' : 'entries'} and ${final.foods.length} ${final.foods.length === 1 ? 'food' : 'foods'} imported`, createdIds: [...final.foods.map(f => f.id), ...final.entries.map(e => e.id)]}); }
    catch { note = 'The import went through, but the undo note could not be saved on this device.'; }
    setDone({id: importId, entries: final.entries.length, foods: final.foods.length, note}); setBusy(false);
  }
  // Session AL third pass (MO-138): once Undo has removed this import, the line says so instead of "… imported".
  // MO-051: the file picker stays right here, so a second file needs no reopening.
  const undone = !!done && !done.note && imports.loaded && !imports.live.some(r => r.id === done.id);
  if (done) return <section className="import-panel import-done" aria-label="Import meals">
    <p role="status">{undone ? 'Import undone. Its entries and foods were removed from your journal.' : `${done.entries} ${done.entries === 1 ? 'entry' : 'entries'} and ${done.foods} ${done.foods === 1 ? 'food' : 'foods'} imported.`}</p>
    {done.note && <p className="notice">{done.note}</p>}
    <RecentImports imports={imports} kind="nutrition" onUndo={onUndo} />
    <h3>Import another file</h3>
    <FileStep onFile={chooseFile} />
    <div className="actions"><button type="button" className="secondary" onClick={onClose}>Done</button></div>
  </section>;
  return <section className="import-panel" aria-label="Import meals">
    <h2>Import meals</h2>
    {step === 1 && <><StepHeading step={1} title="Choose a file" /><FileStep onFile={chooseFile} />
      <RecentImports imports={imports} kind="nutrition" onUndo={onUndo} /><StepActions onBack={onClose} /></>}
    {step === 2 && setup && file && <><StepHeading step={2} title="Match the columns" />{preset && <p className="notice import-preset" role="status">{preset.note}</p>}<MappingStep setup={setup} options={OPTIONS} text={file.text} onChange={setSetup}>
      <fieldset className="import-basis"><legend>Nutrient values are per</legend>
        <label><input type="radio" name="import-basis" checked={basis === 'serving'} onChange={() => setBasis('serving')} />the row’s serving</label>
        <label><input type="radio" name="import-basis" checked={basis === 'per-100g'} onChange={() => setBasis('per-100g')} />100 g</label>
        <label><input type="radio" name="import-basis" checked={basis === 'per-100ml'} onChange={() => setBasis('per-100ml')} />100 mL</label>
        <p className="fine">Without a serving weight or volume, entries are logged with an unknown serving measure, and no food is added to your library.</p>
      </fieldset>
      {setup.mapping.meal !== undefined && meals.length > 0 && <fieldset className="import-meals"><legend>Meals in this file</legend>
        {meals.map(text => <label key={text}><span>{text || '(blank)'}</span><select value={mealFor(text)} onChange={event => setMealMap({...mealMap, [text]: event.target.value as Meal})}>{HEALTH_MEALS.map(meal => <option key={meal}>{meal}</option>)}</select></label>)}
      </fieldset>}
      {setup.mapping.meal === undefined && <p className="fine">No meal column: every entry goes under Snacks.</p>}
    </MappingStep><StepActions onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!mappingReady} /></>}
    {step === 3 && plan && <><StepHeading step={3} title="Preview" />
      <p className="import-summary" aria-live="polite">{plan.foods.length} {plan.foods.length === 1 ? 'food' : 'foods'} will be added to your library · {plan.entries.length} diary {plan.entries.length === 1 ? 'entry' : 'entries'} on {plan.days} {plan.days === 1 ? 'day' : 'days'} · {plan.withoutMeasure} {plan.withoutMeasure === 1 ? 'entry' : 'entries'} without a serving measure · {plan.refused.length} {plan.refused.length === 1 ? 'row' : 'rows'} refused</p>
      {plan.entries.length > 0 && <div className="import-preview"><ul className="import-preview-lines" aria-label="The first entries that will be imported">{plan.entries.slice(0, 50).map(e => <li key={e.id}>{previewLine(e)}</li>)}</ul>
        {plan.entries.length > 50 && <p className="fine">… and {plan.entries.length - 50} more entries.</p>}</div>}
      <RefusedRows refused={plan.refused} />
      {plan.warnings.length > 0 && <div className="notice import-warnings" role="note"><p>{plan.warnings.length} {plan.warnings.length === 1 ? 'row' : 'rows'} to check (kept):</p><ul>{plan.warnings.slice(0, 50).map(w => <li key={w.row}>{w.reason}</li>)}</ul></div>}
      {plan.entries.length === 0 && <p role="alert">Nothing to import: every row was refused.</p>}
      <StepActions onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={plan.entries.length === 0} />
    </>}
    {step === 4 && plan && <><StepHeading step={4} title="Confirm" />
      <p className="import-summary">{plan.entries.length} {plan.entries.length === 1 ? 'entry' : 'entries'} on {plan.days} {plan.days === 1 ? 'day' : 'days'}{plan.foods.length ? `, ${plan.foods.length} ${plan.foods.length === 1 ? 'food' : 'foods'} in your library` : ''}.</p>
      <p className="fine">You can undo this import from the banner until you change any of these records. Blank cells stay unknown; nothing is estimated.</p>
      {error && <p role="alert">{error}</p>}
      <StepActions onBack={() => setStep(3)} onNext={() => void confirm()} nextLabel={`Import ${plan.entries.length} ${plan.entries.length === 1 ? 'entry' : 'entries'}`} busy={busy} primary />
    </>}
  </section>;
}

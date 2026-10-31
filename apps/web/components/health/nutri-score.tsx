'use client';
import {useEffect, useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {FOOD_DISPLAY, gradesFor, nutriGrade, rememberGrade, setAbFirst, setNutriScore, showsNutriScore, type NutriGrade} from '../../lib/food-display/schema';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import './nutri-score.css';

/**
 * Session AK (COMPETITORS.md N4, item 15): the food quality letter, off by default. Each part is small and loaded on its
 * own: the setting (beside the barcode lookup), the letter on an Open Food Facts product, and the library's "A and B
 * foods first". A letter is always written out ("Nutri-Score B"), never a colour alone; generic foods never get one.
 */
export function NutriScoreBadge({grade}: {grade: NutriGrade}) {
  return <span className="nutri-score" data-grade={grade}><span aria-hidden="true" className="nutri-score-letter">{grade.toUpperCase()}</span><span className="nutri-score-words">Nutri-Score {grade.toUpperCase()}</span></span>;
}

/** The on/off switch, with what it does. */
export function NutriScoreSetting() {
  const id = useId(), record = useDeviceRecord(FOOD_DISPLAY), on = record.loaded && !record.unreadable && showsNutriScore(record.data);
  const [note, setNote] = useState('');
  const toggle = () => {
    try { record.update(r => setNutriScore(r, !showsNutriScore(r))); setNote(on ? 'Food quality letters are hidden, and the letters this device remembered are forgotten.' : 'Barcode foods from Open Food Facts now show their Nutri-Score letter when it has one.'); }
    catch (e) { setNote(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); }
  };
  return <div className="nutri-score-setting" role="group" aria-labelledby={`${id}-t`}>
    <p id={`${id}-t`} className="nutri-score-setting-title">Food quality letter (Nutri-Score)</p>
    <p className="fine">Off by default. When on, a barcode food shows the A to E letter Open Food Facts gives it, when there is one. Generic foods never get a letter. A letter is a summary of one product, not advice.</p>
    <div className="actions"><button type="button" className="secondary" aria-pressed={on} disabled={!record.loaded || record.unreadable} onClick={toggle}>{on ? 'Hide food quality letters' : 'Show food quality letters'}</button></div>
    {record.unreadable && <p className="fine" role="alert">This setting could not be read on this device, so letters stay hidden. Nothing was changed.</p>}
    {note && <p className="fine" role="status">{note}</p>}
  </div>;
}

/** The letter on a looked-up Open Food Facts product (when on and present), remembered by barcode for the library. */
export function NutriScoreProduct({barcode, grade}: {barcode: string; grade: string | undefined}) {
  const record = useDeviceRecord(FOOD_DISPLAY), on = record.loaded && !record.unreadable && showsNutriScore(record.data), g = nutriGrade(grade);
  useEffect(() => { if (on && g) { try { record.update(r => rememberGrade(r, barcode, g)); } catch { /* the letter still shows */ } } }, [on, g, barcode]); // eslint-disable-line react-hooks/exhaustive-deps -- once per product and grade
  if (!on || !g) return null;
  return <p className="nutri-score-line"><NutriScoreBadge grade={g}/> <small className="fine">from Open Food Facts</small></p>;
}

/** The library's letters and order: calls `onChange` with each food's letter and the A/B choice, or null when off. */
export type LibraryQuality = {grades: Record<string, NutriGrade>; abFirst: boolean};
export function FoodQualityLibrary({foods, onChange}: {foods: readonly {id: string; provenance?: {barcode: string}}[]; onChange: (q: LibraryQuality | null) => void}) {
  const record = useDeviceRecord(FOOD_DISPLAY), on = record.loaded && !record.unreadable && showsNutriScore(record.data), first = on && record.data.abFirst === true;
  const key = on ? JSON.stringify(gradesFor(record.data, foods)) : '';
  useEffect(() => { onChange(on ? {grades: JSON.parse(key) as Record<string, NutriGrade>, abFirst: first} : null); }, [on, first, key, onChange]);
  if (!on) return null;
  return <label className="checkbox nutri-score-first"><input type="checkbox" checked={first} onChange={e => { try { record.update(r => setAbFirst(r, e.target.checked)); } catch { /* the order stays */ } }}/>Show A and B foods first</label>;
}

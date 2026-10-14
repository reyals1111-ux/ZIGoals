'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {HEALTH_VITAMINS, VITAMINS, VITAMIN_SCALE, recipeVitamins} from '../../lib/health-vitamins/schema';
import {formatNutrient, type HealthRecipe} from '../../lib/health';

/** Session AB-Cloud Part 4 (ADR-023 C20): a recipe's vitamins per portion, only those every ingredient gives (as its nutrients). */
export function VitaminRecipeLine({recipe}: {recipe: HealthRecipe}) {
  const record = useDeviceRecord(HEALTH_VITAMINS);
  if (!record.loaded || record.unreadable) return null;
  const v = recipeVitamins(record.data, recipe), known = VITAMINS.filter(([k]) => v[k] !== undefined);
  if (!known.length) return null;
  return <small className="health-vitamin-line">Vitamins per portion: {known.map(([k, label, unit]) => `${label.replace('Vitamin ', '')} ${formatNutrient(v[k]! / VITAMIN_SCALE)} ${unit}`).join(' · ')}</small>;
}

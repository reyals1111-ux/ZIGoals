/** Contribution cadences in their stored form; labels are display-only. */
export const CADENCES=['weekly','monthly','yearly','irregular'] as const;
export type Cadence=typeof CADENCES[number];
export const cadenceLabel=(cadence:Cadence)=>cadence[0]!.toUpperCase()+cadence.slice(1);

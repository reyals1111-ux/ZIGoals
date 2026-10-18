/** Types for ranges.mjs (Session AF, `TIER 3 (data formats)`). */
export declare const RANGES: Readonly<Record<string, readonly [number, number]>>;
export declare function inRange(name: string, value: number | string): boolean;
export declare function chainFailures(data: unknown): string[];
export declare function valdoraFailures(data: unknown): string[];
export declare function oroswapFailures(data: unknown): string[];
export declare function defillamaFailures(data: unknown): string[];

# Original ZG exploration — Run 7

[Compare all three](concepts.png). Each is original vector work made for this run; no external mark traced.

- **Orbit Weave — selected temporary mark.** Interlocking solid Z/G with a round open counter; strongest balance of readable letters and a compact silhouette beside the cinematic UI. The small-size monochrome comparison remains identifiable.
- **Open Orbit.** A lighter monoline orbital G surrounding a diagonal Z; closer to a navigation instrument, but less substantial at favicon size.
- **Compass Link.** Angular shared-stroke Z/G; crisp and compact, but more technical than the selected consumer-facing form.

One runtime source: `apps/web/public/icon.svg`. `BrandMark` references it directly through an unoptimized local SVG image; root metadata already uses the same static favicon. `Wordmark` and theme colors remain separate. Replace the single SVG to update both. These alternative source files and comparison are documentation-only, outside the runtime bundle. CSS monochrome rendering provides a fallback.

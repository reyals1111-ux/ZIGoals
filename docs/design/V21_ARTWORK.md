# V2.1 decorative artwork

The owner explicitly authorized decorative extraction, cleanup and responsive optimization of the supplied mockup artwork. These local assets contain **no UI, words, buttons or financial data**. All visible UI remains HTML/React. Existing simplified SVG Goal illustrations and replaceable Orbit Weave favicon remain intact; the sidebar now leads with the gradient ZIGoals wordmark.

| Asset | Source reference | Cleanup | Dimensions | Bytes |
| --- | --- | --- | --- | --- |
| `hero.webp` | 19_26_38 hero crop | Remove safety banner, headings, handwritten slogan, buttons, icons and labels; reconstruct original blue planetary horizon, magenta flare, nebula and lower terrain | 1774 × 887 | 126518 |
| `space.webp` | Clean wallet | Crop the text-free starfield at left (0,0,700,700) for a quiet shared backdrop | 700 × 700 | 16496 |
| `horizon.webp` | Clean hero | Crop the lower terrain (0,620,1774,267) for footer continuity | 1774 × 267 | 30246 |
| `hero-mobile.webp` | Clean hero | Resize only | 960 × 480 | 40312 |
| `wallet.webp` | 19_26_09 wallet crop | Remove card frame, all text/data, badges and button; retain right planet, cyan rim, violet flare, orbital trail and mountain foreground; extend dark left | 1000 × 455 | 33526 |
| `destination.webp` | 19_26_23 destination crop | Remove all words, CTA and stage icons; retain globe arc, city light texture, cyan rim and magenta flare with dark central reading area | 1000 × 689 | 47134 |

Imagegen performed reference-guided cleanup; installed Next/Sharp performed WebP conversion (quality 83; mobile 80). Total: 294232 bytes, approximately 287 KiB. No external runtime image service, new dependency, remote font or CSP change. Shared CSS reuses the same art for page, sidebar and footer continuity. Mobile selects the smaller hero at 540px and below. Files live in `apps/web/public/art/v21/` and are served as static assets, separate from executable Worker code.

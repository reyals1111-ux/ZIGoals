# Landing V5 — asset manifest

New and retired files under `landing/` in Session N, with the SHA-256 of the committed bytes. Everything not listed
here is unchanged from Landing V4 and keeps its row in `docs/verification/landing-v4/ASSET_MANIFEST.md`.
Bytes are file bytes; 1 KB = 1,000 bytes.

## Equation figures and the planet rim (copies, byte-identical)

The four equation figures are the owner's transparent figure set (`docs/brand/ASSETS_2026-10-01.md`, "figures/"),
copied from `apps/web/public/brand/figures/`. The planet rim behind the fold stages is the V21 artwork's footer
crop (`docs/design/V21_ARTWORK.md`, `horizon.webp`), copied from `apps/web/public/art/v21/`. Each copy hashes the
same as its source.

| file | bytes | SHA-256 |
| --- | ---: | --- |
| `assets/brand/figures/goals-lotus.webp` | 69,416 | `f7c386fca7e7bad2628bcdc269cd3bbacb7516435bc7baec04ae87cbd3d2893c` |
| `assets/brand/figures/goals-lotus@2x.webp` | 175,606 | `88a4c391e4ef6b9d8fc64a5ea8d4e244919cb1452da0407e8bcf5c065769f6b3` |
| `assets/brand/figures/habits-butterfly.webp` | 55,076 | `d13959194f8548fce5cab5e79d890412e3a4ed3a693e791bbc67ae90acdeada2` |
| `assets/brand/figures/habits-butterfly@2x.webp` | 133,276 | `993b6c860ac69f2bc2c70352a4eacd9f7ce861f820085aeebec0392a8e85b93b` |
| `assets/brand/figures/health-heart.webp` | 53,810 | `7ad51e2a4093023df2370c8d56a9cbe38addf28e8e372ed0e1a97ea53efed2c1` |
| `assets/brand/figures/health-heart@2x.webp` | 142,178 | `34aabbdf8bd34d72f4427e18c6762f9d8c62a5a9a66cbb14bdde4307232a2ba6` |
| `assets/brand/figures/wealth-bull.webp` | 59,842 | `177c9112fbea979488a16fe4d9a9b8d380cbf740c20d5f08fb34971a04332079` |
| `assets/brand/figures/wealth-bull@2x.webp` | 138,096 | `e6f0b308faad8f46cc3583551bef34b37b2cf2f18b3c0e92918c3759bb48b841` |
| `assets/art/horizon.webp` | 30,246 | `b230e5c547bdb0eace288358516efbb1ae2985c7ef7b05a9db3eae66a10abd97` |

## Fold stages: frames

The six fold stages reuse V4's frame sets from the approved brand film (provenance in the V4 manifest: the frames come
from `zigoals-origami-master-reference.mp4`, SHA-256 `219ecaae…bd447e`). Unchanged: the 120 wide-screen frames
(`assets/origami-scroll/<figure>/00.webp`–`19.webp`, 1024 × 648) and the six settled stills
(`assets/origami-scroll/<figure>.webp`, also 1024 × 648; each matches its set's frame 19 to a mean difference of 0.15–0.24
on a 0–255 scale).

### Retired: V4's 6-frame phone sets

`assets/origami-scroll/<figure>/mobile/00.webp`–`05.webp` (36 files, 640 × 405, 258,896 bytes). Six frames give only
five cross-fades, and a 12-step scroll-through of the lotus stage at 390 px showed two different shapes on top of each
other in three of the twelve steps: the "steppy" case of owner decision N16.

### New: 12-frame phone sets

`assets/origami-scroll/<figure>/phone/NN.webp`: 72 files, 768 × 486 (the same 1024 × 648 shape), 640,886 bytes in all.
`NN` is the number of the wide-screen frame it was made from, so a name means the same moment at either size.

- **Source:** the committed wide-screen frames, not a new extraction from the 1080p web film. They are the same approved
  master's frames, cut to exactly the stills' framing, and they are sharper than the H.264 web encode
  (`zigoals-origami-web.mp4`, 1920 × 1080, 24 fps, 16.5 s). This keeps N16's intent (12 frames, phone budget up to
  1.8 MB) with a cleaner source; it is recorded here as the one change to the plan's wording.
- **Which frames:** for each set, the first, the last and ten that split the measured change (below) evenly:

  | set | frames kept |
  | --- | --- |
  | swan | 0 6 7 8 9 11 12 13 14 15 16 19 |
  | lotus | 0 7 8 9 11 12 13 15 16 17 18 19 |
  | butterfly | 0 5 6 7 8 10 12 13 15 16 17 19 |
  | heart | 0 4 5 6 8 10 12 14 15 16 17 19 |
  | bull | 0 6 7 8 9 10 12 13 14 16 17 19 |
  | z | 0 5 6 7 8 10 11 13 14 16 17 19 |

- **Command** (FFmpeg 6.1.1 with libwebp, Ubuntu `6.1.1-3ubuntu5`), once per kept frame:

  ```sh
  ffmpeg -nostdin -i <figure>/NN.webp -vf "scale=768:486:flags=lanczos" \
    -c:v libwebp -quality 72 -compression_level 6 -preset picture <figure>/phone/NN.webp
  ```

  Quality 72 was chosen from a side-by-side crop upscaled to an iPhone's 3× density: it kept the paper texture of
  the 1024 px frame, where V4's 640 px frame looked softer.

## Fold pacing (the `PACE` table in `scripts/fold-state.mjs`)

Most sets hold the previous figure still for their first 4–7 frames, so a plain frame-per-scroll mapping spent about a
third of each fold on a figure that does not move. The pace table is the measured change between consecutive
wide-screen frames: each frame is scaled to 128 × 81 grayscale with FFmpeg
(`-vf scale=128:81:flags=area,format=gray -f rawvideo`), and the mean absolute difference of each consecutive pair is
rounded to a whole number. `filmPosition` gives each step `1.5 + min(change, 14)` of the scroll, so held frames pass
quickly and a burst of change is not dragged out.

| set | change between frames 0→1 … 18→19 |
| --- | --- |
| swan | 0 0 0 0 0 6 18 11 4 11 9 15 6 10 9 14 9 1 0 |
| lotus | 0 0 0 0 0 0 0 15 22 7 4 10 7 10 11 5 10 20 22 |
| butterfly | 0 0 0 0 0 12 32 22 2 4 6 4 5 7 7 12 7 9 1 |
| heart | 0 0 0 0 18 19 6 1 5 6 4 3 5 7 18 14 10 2 0 |
| bull | 0 0 0 0 0 24 29 15 13 10 4 12 9 14 11 13 7 9 5 |
| z | 0 0 0 0 7 14 14 11 11 11 6 8 10 9 4 15 16 9 0 |

### Phone frames, file by file

| file | bytes | SHA-256 |
| --- | ---: | --- |
| `assets/origami-scroll/swan/phone/00.webp` | 11,420 | `3b9bb970dd64ff362142cd98a94a01f5452c1016af8b8e5c05cde9e630baac03` |
| `assets/origami-scroll/swan/phone/06.webp` | 11,398 | `55ab0098ca1a83c042125f0568b1de9a4bb72c8d53e88f64818660624feb3533` |
| `assets/origami-scroll/swan/phone/07.webp` | 8,358 | `4afcd6b765bd2def36aaf41c34e3cd7c80727f656fcb20ddac603d46806acffd` |
| `assets/origami-scroll/swan/phone/08.webp` | 6,198 | `42d28317ee496cabcdfd2e936ac126770fc5b8da368a544e3944ac4677b03f75` |
| `assets/origami-scroll/swan/phone/09.webp` | 6,006 | `4249d1e090f032d5ae7ce22179d133bcfd9ebfeaa9f58e5494f7fd6f1242f0ac` |
| `assets/origami-scroll/swan/phone/11.webp` | 9,112 | `2d8ded91ced4479e63cabc32ffafbab45be193892f4688136c60709b3b12324d` |
| `assets/origami-scroll/swan/phone/12.webp` | 6,120 | `e8d4fe66320af959d06973b7eddf58559b757bfdb5d8b66b27517ab3430494ff` |
| `assets/origami-scroll/swan/phone/13.webp` | 5,200 | `2423bf672f6de64258bfcc24b7fde754ee18f12f960fd2eec8135cfb10d58a79` |
| `assets/origami-scroll/swan/phone/14.webp` | 5,244 | `0a8bb5020194039e73c9f9978d337bdc39c0043b28a5fba39628f2b817a9af5e` |
| `assets/origami-scroll/swan/phone/15.webp` | 6,514 | `260adce557bf01bc81b8eadb029734a076a2531b47d850e019ffcaa6740e341c` |
| `assets/origami-scroll/swan/phone/16.webp` | 9,068 | `24034b853968588ba2a2801adbe6c9b28686e5d9dad6c8a260dc79107d6b4b34` |
| `assets/origami-scroll/swan/phone/19.webp` | 10,510 | `536da32fd6de3e6d3f32c435f358e3b0fc869e3015b4ff85f327c7b8fc5d9249` |
| `assets/origami-scroll/lotus/phone/00.webp` | 10,602 | `474f7b51e51732983dbeeca99896f5507204abada2f6caac3227456639a73159` |
| `assets/origami-scroll/lotus/phone/07.webp` | 10,550 | `f689d73bf87a85cb16a37297928f64c44829dd66588948441771cb1faa02cc29` |
| `assets/origami-scroll/lotus/phone/08.webp` | 10,780 | `242c01d78c4d01f1f03f5fdab60f4622217b45bb390f6cd832c85a990ddbc79b` |
| `assets/origami-scroll/lotus/phone/09.webp` | 6,104 | `a997deacae1c9018d45ddfefe49fbf38609debf77a4bfa15840d3687c929da57` |
| `assets/origami-scroll/lotus/phone/11.webp` | 5,910 | `e0c8eb59db861ca227b466e14978a138cc3d276ee56f4d42d74b0e93797e1f38` |
| `assets/origami-scroll/lotus/phone/12.webp` | 7,362 | `95e4cbd50f747cdc996558684d249e20aa208b869fbef7cd51dc3cbafc1c152a` |
| `assets/origami-scroll/lotus/phone/13.webp` | 7,020 | `59d1c9a04c4e7e1b35b1d4f751550ce7024b2fc7dff9115ae29bdf5ce96abe40` |
| `assets/origami-scroll/lotus/phone/15.webp` | 6,810 | `6444bb4dcceebd0085f5dce6b959841166f932dc219b82dffe6bcba800a45083` |
| `assets/origami-scroll/lotus/phone/16.webp` | 6,692 | `8be4fb98689e2c309855e500b9efce07a872420db3a7a8dbb5ae8bb1223a2e7b` |
| `assets/origami-scroll/lotus/phone/17.webp` | 5,486 | `d3403284b7e95656ce96d01fbba61f04978603eeb0643e8f5b1992c7ecc63612` |
| `assets/origami-scroll/lotus/phone/18.webp` | 10,594 | `c8c5875194dfebae212ba07718a63cd26c4a99b319b1877e4e094ee9fd9190a5` |
| `assets/origami-scroll/lotus/phone/19.webp` | 14,270 | `8f0c772afc70b7ada7899ecf0194815da702d437a5a8ebb50027f355d1c19295` |
| `assets/origami-scroll/butterfly/phone/00.webp` | 15,704 | `9cf2ac30c9d03f53884ccfa2516572880879217739854aa1b2c5a2b08c8b8bd8` |
| `assets/origami-scroll/butterfly/phone/05.webp` | 15,852 | `2826b9c9317f1e4bc4b54b2a158715cf1548f9ba1cf79115c2ea50bf3d415cd1` |
| `assets/origami-scroll/butterfly/phone/06.webp` | 16,448 | `86702b65e83677c52699c522da70f05c6109bc7a88556be6e0eab3918e402273` |
| `assets/origami-scroll/butterfly/phone/07.webp` | 12,484 | `69814f02f7412f66ef01fe671f73effbc0abe02fcba03a32b4e4d53b2af5c2a0` |
| `assets/origami-scroll/butterfly/phone/08.webp` | 5,974 | `43c171e9bad65284c3f65a41d0d1a2fbb16dea4e8e29e9d9562b17afc9b6fe2f` |
| `assets/origami-scroll/butterfly/phone/10.webp` | 5,636 | `db14ab43b101226f7b428620ff01840e9fa1f66e07337be76ee3882209004ef2` |
| `assets/origami-scroll/butterfly/phone/12.webp` | 6,294 | `2eeedf03f9d74c75099573d0db7629bd865f0ef050c0a216c2a33f5a365c7086` |
| `assets/origami-scroll/butterfly/phone/13.webp` | 6,758 | `2754fbafc0b9b6108dd21fc405f71593467d0cf037198a332663b26d8d76b833` |
| `assets/origami-scroll/butterfly/phone/15.webp` | 6,066 | `0874e3f1d776e787c87742006d1ab2001c79db4f6fae39523f17deae0f0dbc7f` |
| `assets/origami-scroll/butterfly/phone/16.webp` | 6,600 | `088c9b99a9daea04a31f624e559f78f4a3d87b8d62b08334879ff378a22f3e35` |
| `assets/origami-scroll/butterfly/phone/17.webp` | 8,172 | `8678a68068910e7cb95b1396a97fe171c79d21f8f2d5fd1825026148842c6eab` |
| `assets/origami-scroll/butterfly/phone/19.webp` | 12,146 | `b870c16f9e42daf9327866b80da8eadba22b638d50d0a92b743e832422276c98` |
| `assets/origami-scroll/heart/phone/00.webp` | 12,244 | `7fd95f66ccd8c20cab7351df6dbef706f1398a15cdb198cbbfb149a8b9c3d2d0` |
| `assets/origami-scroll/heart/phone/04.webp` | 12,234 | `abc662bd5893799deffa8fdbdc4bca107bbe2560ae3cc47e3d2eb5bde5deaf67` |
| `assets/origami-scroll/heart/phone/05.webp` | 10,110 | `bebbbe2cbce8cdc29076d54011aeadbc623c520a64428280adca1f4df58298a5` |
| `assets/origami-scroll/heart/phone/06.webp` | 5,944 | `ea3938843411ce663e182bfb38c4b8956328eff70e47403c6f3071be39ac93c6` |
| `assets/origami-scroll/heart/phone/08.webp` | 5,740 | `1a2b1b8f93b6f9455cf2c58e5a16ccfcbc843c32538b34f26a7d668019e1ec09` |
| `assets/origami-scroll/heart/phone/10.webp` | 6,008 | `b682c89f78c7f7474263c6062f47b4dbdd091d26e7c3e63d83eddf993c06bf1d` |
| `assets/origami-scroll/heart/phone/12.webp` | 6,170 | `6df84cb7488faee634cafb1dd0e8ed853db912f0184b5ff987efc8facf5b7c56` |
| `assets/origami-scroll/heart/phone/14.webp` | 5,880 | `c90642d3cd9ffa717ececb2edd946c393de4342e5cd49d82a666b83778671f2c` |
| `assets/origami-scroll/heart/phone/15.webp` | 6,908 | `ed15a49e5197d46488f3e4ad3d90d682c4c6ab394511b34d4aad09b287d35d60` |
| `assets/origami-scroll/heart/phone/16.webp` | 9,378 | `85c6fa9e224777023c41f324477a9cf947bbb73c1db47e6f5048fe7b07948642` |
| `assets/origami-scroll/heart/phone/17.webp` | 11,838 | `9d58f47579177b6c7b5ff31efe0b11aab604bc2ea56d6e84d195eb2901b47a2e` |
| `assets/origami-scroll/heart/phone/19.webp` | 11,796 | `366973616d02dd74e920b716b1faca882783ae965ce95400af8a9a0a7f8a112d` |
| `assets/origami-scroll/bull/phone/00.webp` | 11,770 | `2f631bc209d5fecc4767ce24a70e758b84e060a717d58ba86d27aca3279ec307` |
| `assets/origami-scroll/bull/phone/06.webp` | 11,340 | `cfd3f9b8b36322f4eefc39aba3ecbde79604664c02dd94da8b0af1a15420502a` |
| `assets/origami-scroll/bull/phone/07.webp` | 9,420 | `876fd3241edb8d603ebb79d0ac27f446fe85c084d9c373df0a21694eb043d029` |
| `assets/origami-scroll/bull/phone/08.webp` | 10,982 | `49343457739a1fd1629ee14aac706f34834febca21acc8a375c69c09176b79f2` |
| `assets/origami-scroll/bull/phone/09.webp` | 7,962 | `f49dc4d5b92f4957a6ef61698e499b3f61ac00c6e93afdb21b39457ff9c95903` |
| `assets/origami-scroll/bull/phone/10.webp` | 6,156 | `80f9c733c1c48a4962c1270e96e457c2eb92b9398808f120e792acb7f54b59f1` |
| `assets/origami-scroll/bull/phone/12.webp` | 7,742 | `c73851521393efca420288025707afc37883d9bb0a28ca45ec1b995ebe3d32e4` |
| `assets/origami-scroll/bull/phone/13.webp` | 9,186 | `998004bc6f0dbbe90b39d650699e46ba0e54b995f4db6c46585b0c0dbda2cb9c` |
| `assets/origami-scroll/bull/phone/14.webp` | 5,782 | `a2cb979c2078af3a8336d9cf37d8e3e52efb5ff9f6dcca83a72e938924cd1f61` |
| `assets/origami-scroll/bull/phone/16.webp` | 5,342 | `e460b721f696f62b671d7f64929089a02fd0b07abaad73b558cbb799928caa1d` |
| `assets/origami-scroll/bull/phone/17.webp` | 7,166 | `ff9ffcc6325426860070658eecb5fe86080329252a95b50d267ce288c17b3779` |
| `assets/origami-scroll/bull/phone/19.webp` | 11,504 | `e4a7786af2b4998f18887b68257719bf5b8439a6fe5ac903efe7e321529102f6` |
| `assets/origami-scroll/z/phone/00.webp` | 11,642 | `40530b99bd5e69a911e780f241f8c753acfd9b83393a7c15a36db9f154e76972` |
| `assets/origami-scroll/z/phone/05.webp` | 11,892 | `e24473feeaa410e5ebd9cc1a993ed2c173391bf2a7df99d1ece18ea435e6f8c0` |
| `assets/origami-scroll/z/phone/06.webp` | 11,226 | `c16f8d0c5a4c6de8d8662b271931ed4a1ffb8ee57a60175fd29781056c69b2e6` |
| `assets/origami-scroll/z/phone/07.webp` | 9,662 | `596fcf64f49466ee30989dafd066e8091cd5a3c1b8165a710a2e61a9f8999b5d` |
| `assets/origami-scroll/z/phone/08.webp` | 9,194 | `53fa7de6f7894549fc41aeebc8cc41673d635485acc6268086c753e8b8228a21` |
| `assets/origami-scroll/z/phone/10.webp` | 8,416 | `75024753ddc18897851499ab9829eb208b66d6b13d9c93b36daf6b64126574e6` |
| `assets/origami-scroll/z/phone/11.webp` | 7,874 | `7e1746e103b80ec561268e30bbc762ddb8947a6b6e8913c482c911e194523762` |
| `assets/origami-scroll/z/phone/13.webp` | 8,974 | `2efb71ae4c6ab14bab221b7f6f60fdb21b18753825c4807eed8c5d6823d29701` |
| `assets/origami-scroll/z/phone/14.webp` | 9,184 | `4a2815e54caeec1544a994cb3f1037a7f893cfb12b584e7c824193d33bf44bcd` |
| `assets/origami-scroll/z/phone/16.webp` | 7,290 | `573e8a1899b29ffaa8a806721a4a4e5b0651d75963b6f062fa19e36d6cd97b5e` |
| `assets/origami-scroll/z/phone/17.webp` | 10,074 | `30fe409788d3ec933535a7540b59fabf9fd763a6a13c5dd4c9a38c4fb2cde310` |
| `assets/origami-scroll/z/phone/19.webp` | 11,394 | `717baf7c0f6a62ffb6494dc40747e71f6ea6fbbdbc587d3a890d4f49a1ba6b8e` |

## Product captures (refreshed from main's Showcase)

All 19 files keep their V4 names and widths; heights follow the captured region, and `index.html` carries the new sizes
with a `?v=v5-1` tag so a cached V4 image is never shown at the new shape. 19 files, 822,276 bytes (V4: 971,356).

- **Source:** a production build of `main` at `57275a6` (`NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED`,
  `next start` on 127.0.0.1), Settings → Load Showcase Demo. Every `/api/**` call answered by a local 503, clock fixed at
  `2026-10-02T10:00:00.000Z`, reduced motion, dark scheme, onboarding marked as seen. So prices read "Price unavailable" and
  positions say "no wallet observation", which is what the captions say.
- **Tool:** `apps/web/tests/landing-v5-captures.spec.ts` (opt-in, `LANDING_CAPTURE=1`), Playwright's Chromium 141.0.7390.37.
  Desktop regions at a 1440 × 900 viewport, phone regions at 430 × 932, each at the density that makes it exactly
  its V4 width. Fixed-position chrome (the phone tab bar) is hidden for the capture, as in V4's captures.
- **Font:** the app's font stack starts with Inter, which the app does not ship, so a capture machine without it falls
  back to a wider font (here DejaVu Sans). The captures were rendered with Inter: `InterVariable.ttf` from
  `https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/InterVariable.ttf` (SIL OFL 1.1, 879,708 bytes,
  SHA-256 `4989b125924991b90d05b2d16e0e388c48f7d5bb8b30539bbf9c755278d0ccaf`), given only to the capture browser on the app's own
  origin. Nothing was added to the app or the landing.
- **Encoding:** FFmpeg 6.1.1 libwebp, `-quality 82 -compression_level 6 -preset picture`, Lanczos to the exact size.
- **Privacy:** every image was opened and read. Only fictional Showcase records appear (Emergency fund, First home
  deposit, Japan adventure, the $501,800.00 fictional total, the Bitcoin, Ethereum and USD Coin manual examples). No
  address, name, account, real balance or real price.
- **Seen while reading them (app, Session M's lane):** on phones the Goal card's progress ring overlaps the start of its
  text by 4 px at each width measured (320, 360, 375, 390, 414, 430 and 600 px), with Inter and with the fallback font
  ("$11,000.00 remaining" in `goals-mobile.webp`); at 768 px it is clear by 18 px. Listed as a follow-up; recapture `goals-mobile` once it is fixed.

| file | size | viewport and density | bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `today-desktop.webp` | 1150 × 688 | 1440 × 900 at 1.3956× | 52,022 | `cedd64a59dabde7c7fe72a14a5d76765bae2e6fc4d412857f4150cb7b2547cd8` |
| `today-mobile.webp` | 398 × 720 | 430 × 932 at 1× | 27,828 | `2de9ac9e928b1eb78c49b7c261923393a58ff1c426ea3aab7401a79a8553c098` |
| `goal-detail-desktop.webp` | 1548 × 1067 | 1440 × 900 at 1.3208× | 47,732 | `4e7880847c5528d84e2c94256436a2100810125b99e2a15b8bda0373d366c9e2` |
| `goal-detail-mobile.webp` | 398 × 644 | 430 × 932 at 1× | 19,154 | `4c164b5f9cad9408f45be9dcb38d757c69122e206dc41e0fe3976dd98770f4e7` |
| `goal-creator-desktop.webp` | 710 × 600 | 1440 × 900 at 1× | 19,726 | `3ae5e56154429ed7bc7f87b774c8e5af2f02a3e2703945fc65ccda9c56f5ea7b` |
| `goals-overview-desktop.webp` | 1548 × 1306 | 1440 × 900 at 1.2857× | 118,884 | `c463fdb0477eee00d8d67d45d74397e8127a615cb9933c2737d334b18311e4cd` |
| `goals-mobile.webp` | 398 × 608 | 430 × 932 at 1× | 20,912 | `302e1b4742884e0d20e39eabbe3297934149ad6e862cd190777c5eebdb663116` |
| `habits-desktop.webp` | 1548 × 1042 | 1440 × 900 at 1.3208× | 64,630 | `b501f999e047177a40c19cfa56a36f29b489bc5aa6bdf319b0e6087ba88b1321` |
| `habits-mobile.webp` | 398 × 771 | 430 × 932 at 1.1339× | 23,026 | `33dfbe2cb92f92ac89468be5cff90258a8c30f43eb5da6ebcb534913f7a8dc22` |
| `health-desktop.webp` | 1548 × 1133 | 1440 × 900 at 1.3208× | 62,204 | `b820cfba81b878845a609154603b35865e22c5c78ae36d6034128f61db2cf6b6` |
| `health-mobile.webp` | 398 × 562 | 430 × 932 at 1× | 19,728 | `085b1958f6b2d9e5e92fce12463023018658ceded2e92831871536e5d2872791` |
| `wealth-desktop.webp` | 1548 × 862 | 1440 × 900 at 1.3208× | 65,644 | `661916a4585afb0b688383a02dae84f63029bf6094fde56a7b417882ce017ca8` |
| `wealth-mobile.webp` | 398 × 797 | 430 × 932 at 1× | 30,712 | `9baff74f3221445dfef6875a18682d276bbba037d1acac34deabad5784fe4898` |
| `positions-desktop.webp` | 1548 × 1265 | 1440 × 900 at 1.2857× | 89,938 | `7a5f34587e8e30503ff3db00e40c487834964d8459784855fbc5a79356e271fc` |
| `positions-card.webp` | 502 × 1166 | 1440 × 900 at 1.3351× | 29,990 | `8c240dcc83b12fa258ccd132ae273f2a13d2ebdac8fae79ee9d46687509949dc` |
| `markets-desktop.webp` | 1548 × 960 | 1440 × 900 at 1.3208× | 62,316 | `27548ec350f7c00c3eea0299d08e8d5c877dfd0c7bc915a6a60bf793ad919771` |
| `markets-card.webp` | 374 × 430 | 1440 × 900 at 0.9868× | 9,544 | `47f0740e049f2da06f3543e9e3552e1d434dc31cbaaa02835ffaedfbe845398e` |
| `ecosystem-desktop.webp` | 1548 × 724 | 1440 × 900 at 1.2857× | 36,188 | `892fd5a61405e27bf4956acbf9a0f71c1fb12f9ad1cd8638155667aa6b57bbf1` |
| `ecosystem-mobile.webp` | 398 × 704 | 430 × 932 at 1× | 22,098 | `eb47ea8abc07c24552be6f26a3adf2f8e1cad3c106ffcce44dcf2933ad84d82b` |

## Retired scripts

`scripts/origami-scroll.mjs` and `scripts/origami-state.mjs` (V4's single fixed background canvas) are removed; the
fold stages replace them (`scripts/fold-stage.mjs`, `scripts/fold-state.mjs`).

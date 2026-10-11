# Landing V4 — asset manifest

Every file under `landing/`, with the SHA-256 of the committed bytes. Generated after import, not copied from the standalone package.

## Totals

| group | files | bytes |
| --- | ---: | ---: |
| Page | 1 | 39,902 |
| Stylesheets | 7 | 81,691 |
| Scripts | 4 | 17,156 |
| Brand | 4 | 123,573 |
| Product captures | 19 | 971,356 |
| Film | 3 | 3,487,711 |
| Origami — desktop frames | 120 | 1,934,676 |
| Origami — mobile frames | 36 | 258,896 |
| Origami — settled stills | 6 | 200,488 |
| Social card | 1 | 364,851 |
| Deployment control files | 3 | 870 |
| **Total** | **204** | **7,481,170** |

Three of those files are never uploaded: `wrangler.jsonc` and `.assetsignore` are Wrangler's own, and `_headers` is parsed into response headers and then excluded (both verified against a local Workers-Assets server: HTTP 404 for each, with the header rule applied).

## Film provenance

The six origami shapes are frames of the approved brand film. `assets/origami-scroll/provenance.json` in the standalone package names its source as `zigoals-origami-master-reference.mp4` with SHA-256 `219ecaae2c928fdd6e000d7931358043ff068a38988cedaefdd1f44237bd447e`; that file on disk hashes to `219ecaae2c928fdd6e000d7931358043ff068a38988cedaefdd1f44237bd447e`, so the imported frames provably come from the approved master. The 15,737,961-byte master itself is **not** committed — only the web encodes below are.

| file | bytes | SHA-256 |
| --- | ---: | --- |
| `assets/video/zigoals-origami-mobile.mp4` | 814,441 | `090f3d8156c33f73563c6fb4b34ebe49e52af606f61779688066c6d23aa17317` |
| `assets/video/zigoals-origami-poster.webp` | 71,338 | `05da8a37041b448aadee76189c3a6a9591c3363d683816b5467b5d4dd9459ede` |
| `assets/video/zigoals-origami-web.mp4` | 2,601,932 | `e28eb50ffb54755512f91d9e66c59fc967c1ba745afb1f14a5bda68a942958fa` |

## Product captures

Nineteen captures of the real public Alpha, every one referenced by `index.html`. Three further captures in the standalone package (`activity-desktop.webp`, `habits-detail.webp`, `today-full-desktop.webp`) are unreferenced and were not imported, nor were the 30 superseded loose WebPs or the 34 MB `assets/product/source/` intake tree.

| file | bytes | SHA-256 |
| --- | ---: | --- |
| `assets/product/final/ecosystem-desktop.webp` | 39,654 | `9f92d8c0be73a4afa579a448ca9edebb1da7793176e99038e550c462d72eb08b` |
| `assets/product/final/ecosystem-mobile.webp` | 37,466 | `5370eddb5e87240aa845ebfd6c713c647d742d60f465adaffa46a467b580e81c` |
| `assets/product/final/goal-creator-desktop.webp` | 27,108 | `844ea62868defcf694d17f39d32af318a9fca5667d2cb0c26bfb290d4c436297` |
| `assets/product/final/goal-detail-desktop.webp` | 51,060 | `d5b5c57ad85248ed1de329350d555086eb2888027268d027d79ff40dd59b4670` |
| `assets/product/final/goal-detail-mobile.webp` | 28,852 | `e249edf27e6cda622463f93ff28d8234672bbd9dafcc58890dfb9f4c41149094` |
| `assets/product/final/goals-mobile.webp` | 31,140 | `3464d0be40ab71c2312d846dc7c071594ab769b23a1d58a0b2584f2cd5725e5f` |
| `assets/product/final/goals-overview-desktop.webp` | 120,620 | `5f6f54cdb72a6916c29bc9e98253d2bab6b0df8c0e70e36881b3c1a2cd6d9030` |
| `assets/product/final/habits-desktop.webp` | 72,524 | `13d9a4b61e6f74f85b802aef95bd6a320f5f616205ae00dd50daec3aa093a739` |
| `assets/product/final/habits-mobile.webp` | 33,912 | `296f402bc4e709ab9d5ecdd1f6da1e0353fac9ea73b8d3dab3ec7131e973a4eb` |
| `assets/product/final/health-desktop.webp` | 72,692 | `c72fb0e4f3d77e819cf4a5870ea0083f024573e5ba1915990f9a475702958e04` |
| `assets/product/final/health-mobile.webp` | 34,034 | `56435fac0fe287bea7c8bc5054ee5c3d4667843327fcc274d788e118e8bbc29f` |
| `assets/product/final/markets-card.webp` | 13,044 | `b4c34e644a0dc7cf65e5e77ae1c56feffc2b476d29815df773fd82666ae9cb61` |
| `assets/product/final/markets-desktop.webp` | 72,866 | `fcd5efad74b45b474033dba3ae7a17b7e9247d602d8fb1239f715ab4e380d207` |
| `assets/product/final/positions-card.webp` | 27,960 | `77e6b00a5ac6475de7cee30b4f030d44eeaee58f8448a47b86c9905c51b9e8f5` |
| `assets/product/final/positions-desktop.webp` | 88,920 | `47e8ba666e3b1db84b005f4a745938d580f05562f122c755a7911435c835b09e` |
| `assets/product/final/today-desktop.webp` | 50,240 | `c649a71a932457dd00ed49e52b78775f794c55a74cf7f57bf3849f4be6d3709f` |
| `assets/product/final/today-mobile.webp` | 44,702 | `a52f4b1094b5c0d0440d8f279e6c41fe555ee0d282360f7796ec65891fc4ef63` |
| `assets/product/final/wealth-desktop.webp` | 74,022 | `29af6a620a5909d1e80e12c2031a3b5ff530e2bb2bef49599f6208f495aceb7e` |
| `assets/product/final/wealth-mobile.webp` | 50,540 | `d01ead7be8ed5495ce5d5e4ee94b4901a7130f607cec5182e8c13f8a3d30e65c` |

## Page, styles, scripts, brand and social

| file | bytes | SHA-256 |
| --- | ---: | --- |
| `.assetsignore` | 181 | `e1388b8c5e34299c917b79790c6ea454786e6ee85316154ac949dbcfcbf74807` |
| `_headers` | 587 | `f0ce45672bd3f660045212fd1424d674b2fb98418ddfbc6906ea310a48bd31de` |
| `assets/brand/apple-touch-icon.png` | 36,088 | `18702f271a92f226b03ad6fe9829e302e9bf3ff3400ad26eb5af31e16a20fec1` |
| `assets/brand/favicon.svg` | 16,177 | `18073a3a3542db93c1b5c433d0c0f313235de261f03331eb165a0bcc85e84b33` |
| `assets/brand/zigoals-mark-v3.webp` | 65,538 | `2b694f3f330201266d8d77351d96cb41251f491565173ddeb2085e65f9fdb943` |
| `assets/social/zigoals-social.png` | 364,851 | `d0069b1103744f26b1adc2ae912f905a31d244b00286c56774c1749ca0d0a858` |
| `favicon.ico` | 5,770 | `518ae3e48d3a659f20f1150539c7280c91297795cd88713228b2aa53e4f2952a` |
| `index.html` | 39,902 | `f8cfb1b6acc2f08cc2772585c2c20929c947d9cb32981115484ab641fa769400` |
| `scripts/main.js` | 7,136 | `c2c2e832239cc138c4fef0918201ad88b694f994232347830d82d2547989dee3` |
| `scripts/motion.js` | 3,629 | `3f4d3a3a1bf99a5333cfe155da8e2652d32ba96972214d54e704cdacaed2440b` |
| `scripts/origami-scroll.mjs` | 5,333 | `b544fee86b24d863299501a544565d46def38a21a70c9d3bdea98a9cd0615021` |
| `scripts/origami-state.mjs` | 1,058 | `c4d82816d2a9819b4fa03934bbb426c32b25d7f4f56a4b1e0e3fd11c6344b56c` |
| `styles/base.css` | 3,415 | `fa69a360cbbb728219bbad75474196bd2b4ac1dcce8776940ed3fbf05e543f1e` |
| `styles/components.css` | 20,667 | `fd43a7ae9da8c5b4d152dc7711157c7a01ba13fbdb0f034b225b84c66a6bbb6e` |
| `styles/final-v3.css` | 19,735 | `e157ad35308204b7d539a9a2f599bd420f875473e394c07641534999e218e7ad` |
| `styles/final-v4.css` | 6,249 | `f5b00411907166ff55fb8eb0e2f3dd78c5fc274f296c10e5a0e7458bbdc15f35` |
| `styles/motion.css` | 2,656 | `10d213ebf60ff6a52ac284c936f78116fdc43699824b07aac9fddae84047dbfa` |
| `styles/refinements.css` | 17,926 | `acbb15d1745b7b75ddce537424d09d607fe1d35d111e984d63fcb3efd829d948` |
| `styles/responsive.css` | 11,043 | `cc0b6b90a6d111c0a061f0177f3897bdf89958dce9efe316987f036bae6b7a16` |
| `wrangler.jsonc` | 102 | `d583deaacaca47ceb71a0a0b0fa9fae9aa28a70deca5916e9479a4e0cbe43ca4` |

## Origami scroll frames

Six shapes — swan, lotus, butterfly, heart, bull, z — each with 20 desktop frames (`NN.webp`), 6 mobile frames (`mobile/NN.webp`) and one settled still (`<shape>.webp`): 162 files.

| file | bytes | SHA-256 |
| --- | ---: | --- |
| `assets/origami-scroll/bull.webp` | 30,326 | `f9b2f9488de96b5a6119971202f83f3325626553c9316e304e729b72ed7ab9c7` |
| `assets/origami-scroll/bull/00.webp` | 22,528 | `c0709846696b616f88b48ee89948e5f3c582f52c0afe90bd0b135870bcb7ec01` |
| `assets/origami-scroll/bull/01.webp` | 22,528 | `c0709846696b616f88b48ee89948e5f3c582f52c0afe90bd0b135870bcb7ec01` |
| `assets/origami-scroll/bull/02.webp` | 22,526 | `7c488188defe7ff69bde043ae949c5e15c18dec902cb1fc7c0efe0507497f524` |
| `assets/origami-scroll/bull/03.webp` | 22,528 | `e32de6e52f9f69367755affaa27fdc16067157e8bb63c2c3c661b923324e1c0d` |
| `assets/origami-scroll/bull/04.webp` | 22,478 | `eb26067003d94f8120d5ab7b942b9338dc7bcdf4aaf579085b777ff0271e5c63` |
| `assets/origami-scroll/bull/05.webp` | 22,490 | `f23a5574cd71bf1a9389276d714e778993668264daae318d1758a51f884e2ec6` |
| `assets/origami-scroll/bull/06.webp` | 20,368 | `6dd84070ec550123842246b2a3f3bea4747d5d2c3ef4d100973ba1c0bd642a1b` |
| `assets/origami-scroll/bull/07.webp` | 15,712 | `9cbd9d50b774cca97914e2bf7d1e80a521e4cb8e6ab0c6941a50411fc232e8bb` |
| `assets/origami-scroll/bull/08.webp` | 18,366 | `e418f65419ecb00315fb500d8024dd887439acf57ad5a1e7dccee173cb8759e7` |
| `assets/origami-scroll/bull/09.webp` | 14,288 | `2f8d3c30729e6628b5723a2c99fd2cab230e7a82ec742d56156d2099641d8577` |
| `assets/origami-scroll/bull/10.webp` | 10,722 | `cf972188c465b966246bfc883d347e001da4c7943392e2abe4d325b3b4a4c55f` |
| `assets/origami-scroll/bull/11.webp` | 10,584 | `8d4f869750834e6df0c4c01b7acd6c3158dc13dc26449179f26adbd1b28f56a8` |
| `assets/origami-scroll/bull/12.webp` | 13,846 | `f7e6654407a9b64f236369fba91fa4ec5666d48302961bc055002bc6b6d48c2e` |
| `assets/origami-scroll/bull/13.webp` | 16,190 | `8d7e96e6d1c120752cbe018cda93c2f2478194587faed4b70c84f268cdac9225` |
| `assets/origami-scroll/bull/14.webp` | 9,820 | `58c20ca1a7b692e451670ce1d29f55e121c1aeb26334a9b420ad809686f88938` |
| `assets/origami-scroll/bull/15.webp` | 14,450 | `ecdd079848013e8dba51e1a66e5e19c30ead93c7e75a53b6318f02910106c7f9` |
| `assets/origami-scroll/bull/16.webp` | 8,634 | `829d6584079df0ccb4921c8fbefb8e8898e8d77413b2f2f0117e9b675e763f3d` |
| `assets/origami-scroll/bull/17.webp` | 12,000 | `66633542ce5be2784f476193a110e3da297706ed972bde03372ccf399ecd4ad2` |
| `assets/origami-scroll/bull/18.webp` | 17,224 | `c32ad7c950e4d089f79a84fa627b8b6f29c44ddd9c4106cb758685f6eb2744e0` |
| `assets/origami-scroll/bull/19.webp` | 19,000 | `7b556f4b35de04aa08362e51799b57c2be3f51f985f1331d8a68b81162c5db11` |
| `assets/origami-scroll/bull/mobile/00.webp` | 8,664 | `777a293a3bbbbb78dfc5ac0a9c3723e9646d0ae5e54e1f8101a69a7e036f5f88` |
| `assets/origami-scroll/bull/mobile/01.webp` | 8,642 | `5b2e3274de319d1eca3aa50a69e7c674b867dabe77822db7b2dee8852bc79b1b` |
| `assets/origami-scroll/bull/mobile/02.webp` | 8,134 | `429e2397f71c607586020b94b972d3c7dc6077f5c69cc204d6c302c9a09d4ad5` |
| `assets/origami-scroll/bull/mobile/03.webp` | 4,456 | `c5a6caad8d4572525a9a8eed004415b262cf691fe4206c13dcd0cbbecef2a1b4` |
| `assets/origami-scroll/bull/mobile/04.webp` | 6,304 | `18c4ee976580b8ac4378db8ff681d885ead6bf654f97a89eb793dffdb9f21bd1` |
| `assets/origami-scroll/bull/mobile/05.webp` | 8,376 | `407c68c389184d1b6f3d75c225e233deff9d71bff6eaef15ff4e697479a38b91` |
| `assets/origami-scroll/butterfly.webp` | 31,900 | `53e4f7387694390f85510cffab69be6630cfd40dada4c26e5613c05b9fef4529` |
| `assets/origami-scroll/butterfly/00.webp` | 28,170 | `ad066bb76d5934f89542f9c8174447647947a5682dc2ce29266ef817225705a8` |
| `assets/origami-scroll/butterfly/01.webp` | 28,162 | `d3065269ec6df59a6531fd5e935b372f0e9749bbbc8cede53535c96963a5de2d` |
| `assets/origami-scroll/butterfly/02.webp` | 28,124 | `8c9a8fbbc0dd553a29fa59d86b7015fcad346513fef0e4dc40a099621561f2a6` |
| `assets/origami-scroll/butterfly/03.webp` | 28,136 | `947a1dee6e630c8e076b1f3d34fec1480ddb89ec71a19b0973b5ca3899b0ef0e` |
| `assets/origami-scroll/butterfly/04.webp` | 28,130 | `88c29eb6cc9b061b9ce89446fc7a1d1722b6637ad880836c62816d6fbc05d611` |
| `assets/origami-scroll/butterfly/05.webp` | 28,182 | `7f07a600d5882b2d250b6b5ad7742deeea87045844c82837e973b6c721b91ea5` |
| `assets/origami-scroll/butterfly/06.webp` | 28,518 | `b201d42d2c8db1daa9eae7ddf8ee9caddc1d07898a5692bcc788a796a0e2f856` |
| `assets/origami-scroll/butterfly/07.webp` | 20,952 | `5a15f19624d5f26db9b927df4911e5692b8d8cf6f1a5fd9a9ecc330bc5cddba6` |
| `assets/origami-scroll/butterfly/08.webp` | 10,122 | `41b7d3d2743fbe4ace6cb098709ab07562e3d498726008a125a457d84ceb20fe` |
| `assets/origami-scroll/butterfly/09.webp` | 9,124 | `2327891a4367cf19f59a2254ac78d6b88bca38511966054da03cf51e72010d3f` |
| `assets/origami-scroll/butterfly/10.webp` | 9,716 | `909abe836c7f2f270026600fc24b8b92005ba4f3840e35b82592804c46bdcb8c` |
| `assets/origami-scroll/butterfly/11.webp` | 9,866 | `6160fe2c211a0eb9ae40a3f2bfca0a4b400c11127ff14d532ac289176e6365a8` |
| `assets/origami-scroll/butterfly/12.webp` | 10,264 | `a50c7c4f3c218ded9923b1c108d774937be3a661280c0c34ff14a6e292abb8fd` |
| `assets/origami-scroll/butterfly/13.webp` | 11,578 | `625fbf42131f621d0c78d012dfcd5b77931f620b9218288ba72389e522876634` |
| `assets/origami-scroll/butterfly/14.webp` | 11,904 | `33c94d82d068edf7567197ba58a32820a06fc1bdb82751772502a0c14434552f` |
| `assets/origami-scroll/butterfly/15.webp` | 10,276 | `fcff6abd6a1f7a2fe90bc7fefc80b4133e30c746bf2024ed815821475960acf5` |
| `assets/origami-scroll/butterfly/16.webp` | 10,722 | `92314b6a8c1dd22e0b75c62d9e61c0e62482b7e4e1e5db8b264800fef04c5293` |
| `assets/origami-scroll/butterfly/17.webp` | 13,530 | `fac44f1e32f4ef63c00c8fa672f1771f2e4a5bff71bdb5c28bdb7e5d39f92564` |
| `assets/origami-scroll/butterfly/18.webp` | 19,586 | `a038c38a7443d31007eab03520d634565bdc2953110acfec08b925f99a9b6793` |
| `assets/origami-scroll/butterfly/19.webp` | 20,048 | `3f11f0c08dee783962f5a1ec2293112a49e9009f5cf723e5f88395ac12955c6b` |
| `assets/origami-scroll/butterfly/mobile/00.webp` | 11,476 | `393dcab29fff8e715949799db76e847c17768b5c5a3654f4549657b0cf46dffa` |
| `assets/origami-scroll/butterfly/mobile/01.webp` | 11,558 | `a7237ab51a7505c763043136a8d63e203e064cd646daef2d60540ed80472e813` |
| `assets/origami-scroll/butterfly/mobile/02.webp` | 4,486 | `eb181875cdf2c47fe85894d4fd7eec6813f8cb475d6685cdc43fdd705515a5e2` |
| `assets/origami-scroll/butterfly/mobile/03.webp` | 4,234 | `c14b322018f702033bb7e881fdc30a29e62a0420c3daf18b50146319f58c7f4d` |
| `assets/origami-scroll/butterfly/mobile/04.webp` | 4,484 | `b2261803aae81d252c903d573af8b9c08631ce20e2b9f60951ed817a90775a7c` |
| `assets/origami-scroll/butterfly/mobile/05.webp` | 9,000 | `5e22ace01d026f4a5f66289ee2c12dd9769c006071b6c6862f7c785a7d6a1165` |
| `assets/origami-scroll/heart.webp` | 39,728 | `7c1b54dacd2688631a1c022dc169ce396c962611df9d2cadf17120279020e6f5` |
| `assets/origami-scroll/heart/00.webp` | 19,962 | `7f2c67741428ef1218ad5d223882be3205707c0bc53afb17f99eda9cb1d2a939` |
| `assets/origami-scroll/heart/01.webp` | 20,024 | `e8c87ca0ff46e310c5d919f7b463dc8130aa8a02576be9d47a09f5ef6479bd58` |
| `assets/origami-scroll/heart/02.webp` | 19,986 | `b57b6f0d345acbdf7520db01e871fad84561ca0ab2f9020ed2c07049c485e73c` |
| `assets/origami-scroll/heart/03.webp` | 19,986 | `ff75c39ee1b81f1fd41175e930b0772bfd602de460a65acf0c2815d5080090b9` |
| `assets/origami-scroll/heart/04.webp` | 19,914 | `6e2d189aefcf7649f0ca56be5f8f9f820e54635466cfa499f3b74cbfa7865775` |
| `assets/origami-scroll/heart/05.webp` | 16,672 | `f852b5102a70a6a33fd15c3c88de36228a9e93e25b908c9d182b3540df1f0ae5` |
| `assets/origami-scroll/heart/06.webp` | 9,664 | `a6ce88f839244c90e3aac7c17e45bce4ad602f5eb722d380ada4d8eb80b43df0` |
| `assets/origami-scroll/heart/07.webp` | 9,246 | `fe689025c202039fdbad75b95fb744bda75e37f0fc4d3105556a88d05069e01b` |
| `assets/origami-scroll/heart/08.webp` | 9,322 | `1b307d25bfa44dfa53928e9e8a93272c1f771a5d93cf9d4942baa1f9ad9bcf93` |
| `assets/origami-scroll/heart/09.webp` | 10,236 | `7fba7d7a3a4e1261e4c6d2783208a5fcaa1c7de2ce1f7d95f0d0d306063f2424` |
| `assets/origami-scroll/heart/10.webp` | 10,158 | `3b0b83251cb8e24ee9ecd120c1e8e7e7ce44b8ee120b2633051c49391e0c9885` |
| `assets/origami-scroll/heart/11.webp` | 9,844 | `3f7be031b2877273a9cbda451981ffa9f96d820472d0a8dbc235ec341199942c` |
| `assets/origami-scroll/heart/12.webp` | 10,350 | `ebc94ce770cdd82ed60b9c75e86705968597a5457ca953432008b8eeb53e6f01` |
| `assets/origami-scroll/heart/13.webp` | 7,810 | `539e3408525015224b2b9a80c33fb350146a988fa22c223299ddcddb08898fd8` |
| `assets/origami-scroll/heart/14.webp` | 9,794 | `630103789af3ef2e22ca0083fbdba1a55dfc8fdd92403b356b4584eacd015a1d` |
| `assets/origami-scroll/heart/15.webp` | 12,736 | `e4f36741fecdd927970319a8dc434cff59db1e5a5cb0430daf6063e250fccdca` |
| `assets/origami-scroll/heart/16.webp` | 17,818 | `3b42ad2e6609cdec723acb57a9b8ca46e92752572934c4f338851b15d273b509` |
| `assets/origami-scroll/heart/17.webp` | 22,238 | `5fd8ff64d60fa443f2435fc36395511ab8d9ec173f86d08d303c76d54e3f9b77` |
| `assets/origami-scroll/heart/18.webp` | 22,578 | `7deae2a6730f0451402b5637c554e5479945879eb19975a51efcef7a42074919` |
| `assets/origami-scroll/heart/19.webp` | 22,554 | `b93d8169dc0beb91790f15413ef5118d65d2741c483e5e8527f1d3bcd3706e2a` |
| `assets/origami-scroll/heart/mobile/00.webp` | 9,034 | `d13c4998e83e397aac5f389d2b98e01d3f408f99173ec7eefa7c52ca1c468023` |
| `assets/origami-scroll/heart/mobile/01.webp` | 8,978 | `f0d217e9650a33b7601d3aa5c0c7757679b9732e346f75d29597b92248e894e9` |
| `assets/origami-scroll/heart/mobile/02.webp` | 4,108 | `a3d3a26b07179d466710a655a3a7b8dd6be5d952fdafd9b1414a47d4206b523d` |
| `assets/origami-scroll/heart/mobile/03.webp` | 4,264 | `e00c6e9476f3b31da8b937eb8aef468c6eb14357e76d76425cfc35b429ea7c11` |
| `assets/origami-scroll/heart/mobile/04.webp` | 5,162 | `85e51d3ec1b1521ca26136976302c91769fc6e5e4bc14a2f43f6aa75c404af14` |
| `assets/origami-scroll/heart/mobile/05.webp` | 8,686 | `53b8f3ccba13492b067764ce0751e4af3d973b3dd49df55cf3c44eed817f55a4` |
| `assets/origami-scroll/lotus.webp` | 40,416 | `364531c1738c2d95a87beca24c01d0e4b14ec2dfc993318a73e4751b1e8a4d3b` |
| `assets/origami-scroll/lotus/00.webp` | 17,938 | `14d5aae35ec9abd80d41011b59420e198962a83a2fe1672f63878ccf7723abe0` |
| `assets/origami-scroll/lotus/01.webp` | 17,924 | `d47ff8eeb7a128ede274862e2310104277580cd201d52ef6626512bf125fa9d6` |
| `assets/origami-scroll/lotus/02.webp` | 17,874 | `ae2099a715f77b04b054bf90d791a7eb01983374b527d2b4b383acf07b1a26b3` |
| `assets/origami-scroll/lotus/03.webp` | 17,820 | `8319a9e517076c4740220e2bb07c8c5c7ccc8136e1afb658eec9cdfbf2313ec7` |
| `assets/origami-scroll/lotus/04.webp` | 17,820 | `8319a9e517076c4740220e2bb07c8c5c7ccc8136e1afb658eec9cdfbf2313ec7` |
| `assets/origami-scroll/lotus/05.webp` | 17,822 | `74a0f424ac9d8bbfaad2db71d773a3e83692318d20b9bae063c1b9a804f58042` |
| `assets/origami-scroll/lotus/06.webp` | 17,812 | `bd62ca192e7f2bd7f04c6366584f0acff7f3d857a8debb2b197755a41b20eb3a` |
| `assets/origami-scroll/lotus/07.webp` | 17,860 | `e313202c0ad47a52484c5e8bce74845a73d8fb690194c3214561c318984f3551` |
| `assets/origami-scroll/lotus/08.webp` | 19,080 | `caa4c9b778825d57f09708e35f61b958c08b8a54024e43f179a2fc45b32d3e63` |
| `assets/origami-scroll/lotus/09.webp` | 10,170 | `c7e348436ed452dd6bf92c966d7d3604bdcecf08fb3062fc9154a5ae3094f8cb` |
| `assets/origami-scroll/lotus/10.webp` | 11,138 | `5072c24ee211fd624181d803b0197dd2eaf11b6c3dda49640c16cc5f84da23cc` |
| `assets/origami-scroll/lotus/11.webp` | 10,150 | `4c450c5b11b4bc6ed9eee76407a163a9feb4fcbcf9bbcb639e93e9ef4b66cfa4` |
| `assets/origami-scroll/lotus/12.webp` | 13,024 | `81401993c4c096693577430677ab71207524d3e12c0601ecf93682254afe7160` |
| `assets/origami-scroll/lotus/13.webp` | 11,838 | `aaf3cc1e668cc014f765952fc6699c81bc6f39c1907c8b2c18a15e7a65849d17` |
| `assets/origami-scroll/lotus/14.webp` | 10,038 | `9847206d149d1087c35846e3b5a9d9f0ae1b1d2357a298ed289cd0928d7d776f` |
| `assets/origami-scroll/lotus/15.webp` | 11,632 | `89b42edbf97483e93fec4caed3c0a394266e59d0881cd4b2168a369777948660` |
| `assets/origami-scroll/lotus/16.webp` | 11,648 | `234cffb13dc75d9ffd06429aa28cd8ebed75a9282f809db2c220612c669a8143` |
| `assets/origami-scroll/lotus/17.webp` | 9,348 | `d29878fb73a834c0af634eacfb1ce3ca11679873397f4ed21c11477dcb48f982` |
| `assets/origami-scroll/lotus/18.webp` | 17,946 | `038c9a8456e583e4e5ae5e7eef65121bd7f1a9a354c87fa350708c9a76ff9379` |
| `assets/origami-scroll/lotus/19.webp` | 24,654 | `52244b4d518b2d151b4c7074b35775d1292edddb3fa407f65eb332f48dc4bc61` |
| `assets/origami-scroll/lotus/mobile/00.webp` | 7,710 | `657bb5f1d1731e3a6d72e25bb24606ffa5f3db21ca7ae402c79330e85c21a6de` |
| `assets/origami-scroll/lotus/mobile/01.webp` | 7,556 | `200bec39e5887cb93dd70c40850310dec5ff138aa71f3c67332be11548b2e0d7` |
| `assets/origami-scroll/lotus/mobile/02.webp` | 8,126 | `8bda71668978440bc0aaf2fa88f2980105989efe6dadf7c6be169f91af1aec97` |
| `assets/origami-scroll/lotus/mobile/03.webp` | 4,404 | `e2dd092361d0aba9a3ac1c4005499cb1dda25c2ea4568719ab249b89c6b24b0b` |
| `assets/origami-scroll/lotus/mobile/04.webp` | 5,030 | `d3e99762ed6c4641eac578a81e2ecb0e984bd08123b58aaf1de96b4dbc9f6f53` |
| `assets/origami-scroll/lotus/mobile/05.webp` | 10,614 | `4e8aa5033b69169420612ca29ecbd2c3d86419b2b9b0018d680f3712ef0ab3ef` |
| `assets/origami-scroll/swan.webp` | 29,274 | `24c9aeb24e9e5fb97caf945f8014356679fde41b4c288fd319a367b75904384e` |
| `assets/origami-scroll/swan/00.webp` | 18,504 | `c03022dad40f2b9800546bf44ac5c5ee6f54460f3cfba5328c765ffa3d7db675` |
| `assets/origami-scroll/swan/01.webp` | 18,494 | `4ea96a16b03db99adcfa9d25c63b1578ac9a9b3865e6d79e05bd36074796ac3b` |
| `assets/origami-scroll/swan/02.webp` | 18,492 | `6fa7fca007b08ecba00b00d258edb647c2c1a5649b465a8a545f5a25abee182b` |
| `assets/origami-scroll/swan/03.webp` | 18,492 | `6fa7fca007b08ecba00b00d258edb647c2c1a5649b465a8a545f5a25abee182b` |
| `assets/origami-scroll/swan/04.webp` | 18,494 | `0ffd9744761a6aa6eb54e3f1fa3a0ba898b1f83a11d2a60718bb091411a898e1` |
| `assets/origami-scroll/swan/05.webp` | 18,454 | `07d842681b835250c9bf23b05811a692f81360cb074721e493671239c6cf6150` |
| `assets/origami-scroll/swan/06.webp` | 18,556 | `6c64b7d4cdf4cbdf1d28bd0ade4fa5cb81319ab433c13a7678ed341d93638c69` |
| `assets/origami-scroll/swan/07.webp` | 13,306 | `09adca158cb5fceb8896b7e450d583a019d8f016abd0e229091d70dc7b23b841` |
| `assets/origami-scroll/swan/08.webp` | 10,268 | `6b1fe3b0655605c3b96cfd3210019c15ff275524c045c8159064c8681521ad64` |
| `assets/origami-scroll/swan/09.webp` | 10,058 | `8965b4a0d841d54bb4b70987895e05cc61caed7fbfb9bfa732e3e9cd14ed5026` |
| `assets/origami-scroll/swan/10.webp` | 13,276 | `5747827f73dbc33c5e260be4f6e1cb049dcabf8e185538a2a774e3aa775bd821` |
| `assets/origami-scroll/swan/11.webp` | 15,526 | `b2111a9418977ddbf185210cd28a41701619ba89c3eaf72987f47c3a711987ac` |
| `assets/origami-scroll/swan/12.webp` | 10,400 | `20bacf2585efe64b6021b647a374585e04bccdaa01ece601136aac553a89551c` |
| `assets/origami-scroll/swan/13.webp` | 8,910 | `4b3605ac30fb4d3f3d45db8524ef04779cb8a8dfb39ecd629ee2826d680314d5` |
| `assets/origami-scroll/swan/14.webp` | 8,790 | `2438932ca7e2c87c4a85702fdccb520b5c1081ae5fef75f46f8d0add24ee8a78` |
| `assets/origami-scroll/swan/15.webp` | 10,704 | `239fed23eb5bf204421b418aaf8fc3e0122fcf50ae4b21e7ee19bc2373f13a44` |
| `assets/origami-scroll/swan/16.webp` | 15,580 | `28fce9a5d7f863a206ba069e1440b542bf4f6c8e7531cf226e896edeedfea91c` |
| `assets/origami-scroll/swan/17.webp` | 17,556 | `3f5978f58687707efcf7843abcccbfc6523a5624841ca629feb44beae04bc13b` |
| `assets/origami-scroll/swan/18.webp` | 17,818 | `163e229d8bba387a60836197ac44e8f562eabbcb73d2de724c9ffd785acd930c` |
| `assets/origami-scroll/swan/19.webp` | 17,866 | `208e0b1e5347f7000aebe57039cffd757d99076b9b85e6e6cf617595ab81e16b` |
| `assets/origami-scroll/swan/mobile/00.webp` | 8,662 | `5c668ede65a533b9b26912537553ffe1a8ad8c87cfafdd17c3106ebcf8ac8f19` |
| `assets/origami-scroll/swan/mobile/01.webp` | 8,722 | `2b2975411bd20080cdc9619f398dc72e0698924ab73bbfc1c25dbc9990c371c0` |
| `assets/origami-scroll/swan/mobile/02.webp` | 4,586 | `dba89f888c1369285bddd6bbbcbf81d4e51afbf65670d4a23b5b838be5c77791` |
| `assets/origami-scroll/swan/mobile/03.webp` | 6,558 | `44627c46cee3ec424a8b00a1bd251aa8acc0d591501ca63bac2769e50cdb3c81` |
| `assets/origami-scroll/swan/mobile/04.webp` | 4,914 | `95e4c9c5a2d28fccc1fc7ab5ecbf7e2bf4e35b93b0c735a2d66244947efca414` |
| `assets/origami-scroll/swan/mobile/05.webp` | 7,656 | `705f2c55cabd023605f7725c01a8f99c78a31e23915efdbe20561a97cd8a5f3b` |
| `assets/origami-scroll/z.webp` | 28,844 | `cb2976ed8b3f7ff2fce068c15fe1002a9aba14c3c44876f7e62b1f9a9b0f33ca` |
| `assets/origami-scroll/z/00.webp` | 18,950 | `d81b5a495a017f707d817f86573672ee6196ba15e59cbfef3543b9a88e4058cf` |
| `assets/origami-scroll/z/01.webp` | 18,990 | `97d14b8484eb9e588daff94b4d7ac7ad2c4b0a6243530184061d3b8e25d0e3a2` |
| `assets/origami-scroll/z/02.webp` | 18,984 | `bbd0ea3f8f7b6be052cfe6389dd566df0329148e23cee033c4dca0a462ef8223` |
| `assets/origami-scroll/z/03.webp` | 18,984 | `01e5d540b56a13ff039417cd649bdac05ef1f9d47ef0bf446552d773820213ed` |
| `assets/origami-scroll/z/04.webp` | 18,984 | `7b9885852276582d0b06c755f1c3e593c63589649a10e6d429c853f23d105afd` |
| `assets/origami-scroll/z/05.webp` | 19,658 | `93407592c96d2d4f90dc795dc6cdc478911cf531d522fc72fbcb24651cff07c0` |
| `assets/origami-scroll/z/06.webp` | 18,838 | `2bbc37ad5cf2bc2e6a3e947a8a3e357ee0cd7066da29838b8b7403289ac278ed` |
| `assets/origami-scroll/z/07.webp` | 15,734 | `3c06e8e8819e687771d8fd995287165e99da7ca62e3b55742abd712950bdc650` |
| `assets/origami-scroll/z/08.webp` | 15,130 | `6fc553b3de50683f3eb08a739a700260f363bc89586faa533edd46f33be06bfb` |
| `assets/origami-scroll/z/09.webp` | 14,932 | `74e779df195262934d65128f7b4a55988ea3c4775cb1b7f0b8f9f07750672d23` |
| `assets/origami-scroll/z/10.webp` | 13,534 | `22a7db79e20a5d2f654aaa996340991eb9046539914d3d98d4174c9a41f5788d` |
| `assets/origami-scroll/z/11.webp` | 12,708 | `f54394eeb9c401e7a9557caddbc62e882b0f601c18bab789d2811e1aa69ec890` |
| `assets/origami-scroll/z/12.webp` | 13,614 | `f149265ed8583837097f163d271a0e05ee14c763a4ca93d7883433e7f9ffa6c3` |
| `assets/origami-scroll/z/13.webp` | 14,604 | `5e8b94ff46ff671d57ce9a0f4fe8097d00216acfaf4e746a72882992a26560d6` |
| `assets/origami-scroll/z/14.webp` | 15,614 | `b9677ebe543e5f042d4e28f14daafd9d723539b296f33bcdc8a4bd296c6aca40` |
| `assets/origami-scroll/z/15.webp` | 15,166 | `6d33562c22b8303e5fbd89835d49666f6e844372dd9a72545d722abc7e8a8b2e` |
| `assets/origami-scroll/z/16.webp` | 11,726 | `555e945babfd5aba5ae4516cd3c78aba0814d99bc13da7853550e75acbbe84a8` |
| `assets/origami-scroll/z/17.webp` | 16,592 | `acc1302eb661ef5e787ba8d122eb032de7c35396f00a3ecc89419f954885d571` |
| `assets/origami-scroll/z/18.webp` | 18,246 | `50ab1a1374fa45a9cd619f9c2c28a859a32b2e3f43fce932f328a3c98cf6e031` |
| `assets/origami-scroll/z/19.webp` | 18,324 | `e076c6f7936320d439e475c52052b38837aa4f7a2936de0e5e827947c2a405aa` |
| `assets/origami-scroll/z/mobile/00.webp` | 8,400 | `284e212a3e8db626f60ebfa1655393016c48bef55b1e220852597a040f1e7176` |
| `assets/origami-scroll/z/mobile/01.webp` | 8,440 | `fe4d3c4a867bf2f898d2fbe3eea677b8011ba084c42f1994914d119e932dc563` |
| `assets/origami-scroll/z/mobile/02.webp` | 6,704 | `b028df97faee86065bc0f29418ecf0d2d182f678b048e97f3800a0e5dc9c4873` |
| `assets/origami-scroll/z/mobile/03.webp` | 5,446 | `042dc9323342d19d9963458c49d024ae4de3df7649ae59f559198a75cb2c405d` |
| `assets/origami-scroll/z/mobile/04.webp` | 6,592 | `ab11c6a4f0f82eecf489ac99a6c31dbc92ae098cb0aef92dadb420710206ad8d` |
| `assets/origami-scroll/z/mobile/05.webp` | 8,730 | `c3354ad91579bd5bdb13b526e751c0ec2b7bfa57427731f97e76f1ae18043c68` |


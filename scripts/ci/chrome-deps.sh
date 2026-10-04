#!/usr/bin/env bash
# Chrome for Playwright in CI without the slow Ubuntu mirror (Session P, 1.6).
#
#   bash scripts/ci/chrome-deps.sh            # install what is missing
#   ZIGOALS_CHROME_DRY_RUN=1 bash scripts/ci/chrome-deps.sh   # only say what would happen
#
# `playwright install --with-deps chrome` did two slow things on every job:
# it downloaded Chrome again (on CI Playwright skips its "already installed"
# check), and it asked apt for Playwright's whole Ubuntu list, about 21 MB of
# fonts for scripts no spec renders (CJK, Thai, unifont, X11 bitmap fonts), from
# a mirror that at times delivered under 40 KB/s and timed the step out (STATUS,
# "Known CI intermittents"). The GitHub ubuntu-24.04 image already ships Google
# Chrome stable at Playwright's `chrome` channel path, with the libraries its
# package depends on.
#
# So this script: (1) keeps the runner's Chrome when it starts, else installs
# the `chrome` channel without --with-deps; (2) installs Playwright's ffmpeg
# (video recording; a small download from Playwright's CDN); (3) asks dpkg
# which of Chromium's runtime libraries (Playwright's own Ubuntu 24.04 list)
# and fonts-liberation are missing, and installs only those, with no
# recommends. In the usual case nothing is missing and apt is never called. The specs assert DOM text and
# geometry, not glyphs, so the extra fonts are left out; fonts-liberation is
# what Chrome's package itself depends on. install-chrome.sh wraps this with
# its retries and lock waits, unchanged.
#
# The ZIGOALS_CHROME_* settings exist for chrome-deps.test.mjs; CI sets none.
set -euo pipefail

chrome=${ZIGOALS_CHROME_BINARY:-/opt/google/chrome/chrome}
install=${ZIGOALS_CHROME_INSTALL:-pnpm --filter @zigoals/web exec playwright install chrome}
# Playwright's own ffmpeg build (about 2.5 MB from Playwright's CDN, not the Ubuntu mirror): the video-recording spec
# (tests/run11-motion-recording.spec.ts) needs it, and `playwright install --with-deps chrome` used to bring it along.
ffmpeg=${ZIGOALS_CHROME_FFMPEG:-pnpm --filter @zigoals/web exec playwright install ffmpeg}
dpkg_query=${ZIGOALS_CHROME_DPKG:-dpkg -s}
apt=${ZIGOALS_CHROME_APT:-sudo apt-get}
dry=${ZIGOALS_CHROME_DRY_RUN:-}
# Playwright 1.63, Ubuntu 24.04, "chromium" libraries (node_modules/playwright-core/lib/server/registry/nativeDeps.js),
# plus the font package Chrome's own .deb depends on.
read -r -a packages <<< "${ZIGOALS_CHROME_PACKAGES:-libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 libatspi2.0-0t64 libcairo2 libcups2t64 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0t64 libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2 fonts-liberation}"

run() { if [ -n "$dry" ]; then echo "would run: $*"; else "$@"; fi; }

if [ -x "$chrome" ] && version=$("$chrome" --version 2>/dev/null) && [ -n "$version" ]; then
  echo "Using the runner's Chrome at $chrome: $version (no download)."
else
  echo "No working Chrome at $chrome: installing Playwright's chrome channel (no --with-deps)."
  # shellcheck disable=SC2086
  run $install
fi

echo "Installing Playwright's ffmpeg for video recording."
# shellcheck disable=SC2086
run $ffmpeg

missing=()
for package in "${packages[@]}"; do
  # shellcheck disable=SC2086
  if ! $dpkg_query "$package" >/dev/null 2>&1; then missing+=("$package"); fi
done
if [ "${#missing[@]}" -eq 0 ]; then
  echo "All ${#packages[@]} Chrome packages are installed; apt not needed."
else
  echo "Installing ${#missing[@]} missing Chrome package(s): ${missing[*]}"
  # shellcheck disable=SC2086
  run $apt update
  # shellcheck disable=SC2086
  run $apt install -y --no-install-recommends "${missing[@]}"
fi

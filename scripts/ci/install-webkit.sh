#!/usr/bin/env bash
# Session AI (TIER 3 (CI), ADR-034 N16): Playwright's WebKit and its system packages for the web-webkit job, from a cache
# when one exists. A slow Ubuntu mirror cost two 45-minute jobs (Session AH), so the .deb files apt downloads for WebKit
# (and the Chrome shards' font, fonts-liberation) are kept in ~/.cache/webkit-debs and the browser in ~/.cache/ms-playwright,
# both restored by actions/cache keyed on the runner image and the Playwright version.
# - Cache hit: the packages install from the cached files with no mirror access; if that fails for any reason (an image
#   update moved a dependency), the normal install runs instead. Nothing about the tests changes.
# - Cache miss: the normal install (`playwright install --with-deps webkit`, then fonts-liberation) with apt told to keep
#   what it downloads, then those files are copied into the cache folder for the next run.
set -euo pipefail
DEBS="$HOME/.cache/webkit-debs"
web() { pnpm --filter @zigoals/web exec "$@"; }
from_cache() {
  compgen -G "$DEBS/*.deb" > /dev/null || return 1
  echo "WebKit system packages: $(ls "$DEBS"/*.deb | wc -l) files from the cache"
  sudo apt-get install -y --no-install-recommends "$DEBS"/*.deb
}
fresh() {
  echo "WebKit system packages: the normal install (no usable cache)"
  echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' | sudo tee /etc/apt/apt.conf.d/01zigoals-keep-debs > /dev/null
  web playwright install --with-deps webkit
  sudo apt-get install -y --no-install-recommends fonts-liberation
  mkdir -p "$DEBS"
  if compgen -G "/var/cache/apt/archives/*.deb" > /dev/null; then cp /var/cache/apt/archives/*.deb "$DEBS"/; fi
  echo "Kept $(ls "$DEBS" | wc -l) package files for the next run"
}
if from_cache; then
  # The browser itself: a no-op when ~/.cache/ms-playwright came back from the cache, a download otherwise.
  web playwright install webkit
else
  rm -rf "$DEBS"
  fresh
fi

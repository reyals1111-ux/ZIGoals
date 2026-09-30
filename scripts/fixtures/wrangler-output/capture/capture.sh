#!/bin/bash
# Captures what a real `wrangler deploy` writes to WRANGLER_OUTPUT_FILE_PATH, without any Cloudflare account.
#   unshare -rn scripts/fixtures/wrangler-output/capture/capture.sh <wrangler binary> <output dir>
# Run it only inside `unshare -rn`: that network namespace has no route off this machine, so wrangler can reach
# nothing but the local mock API on 127.0.0.1 (the token and account ID are dummies). The script refuses to run
# when an outside host is reachable.
set -euo pipefail
D=$(cd "$(dirname "$0")" && pwd); WRANGLER=$1; OUT=$(mkdir -p "$2" && cd "$2" && pwd)
python3 "$D/lo-up.py"
if node -e "require('node:dns').lookup('api.cloudflare.com',e=>process.exit(e?1:0))"; then echo "Refusing: api.cloudflare.com resolves; run inside unshare -rn." >&2; exit 2; fi
: > "$OUT/mock-api-requests.txt"; rm -f "$OUT/deploy-mock-api.jsonl" "$OUT/mock-api-requests.txt.body"
node "$D/mock-api.mjs" 8787 "$OUT/mock-api-requests.txt" & MOCK=$!
trap 'kill $MOCK' EXIT
sleep 0.5
cd "$D/worker"
env -u HTTPS_PROXY -u https_proxy -u HTTP_PROXY -u http_proxy \
 CLOUDFLARE_API_BASE_URL=http://127.0.0.1:8787/client/v4 CLOUDFLARE_API_TOKEN=dummy-token-not-real \
 CLOUDFLARE_ACCOUNT_ID=00000000000000000000000000000000 WRANGLER_SEND_METRICS=false CI=true \
 WRANGLER_OUTPUT_FILE_PATH="$OUT/deploy-mock-api.jsonl" \
 "$WRANGLER" deploy --config wrangler.jsonc --name zigoals-alpha --secrets-file secrets.json
grep -a '^{' "$OUT/mock-api-requests.txt.body" > "$OUT/upload-metadata.json"; rm -f "$OUT/mock-api-requests.txt.body"

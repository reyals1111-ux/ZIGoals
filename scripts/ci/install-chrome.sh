#!/usr/bin/env bash
# Installs Chrome for Playwright in CI, with bounded retries.
#
#   bash scripts/ci/install-chrome.sh <install command...>
#
# Chrome comes from dl.google.com, which intermittently resets the download
# (curl HTTP/2 INTERNAL_ERROR) or hangs. Up to 3 attempts of at most 3 min
# each (normally about 30 s), 15 s then 45 s apart.
#
# A timed-out attempt can leave its apt-get behind: `timeout` stops pnpm, but
# the apt-get that `playwright install --with-deps` started through sudo keeps
# running and keeps the dpkg lock, so the next attempts failed at once with
# "Could not get lock /var/lib/dpkg/lock-frontend" (PR #53, run 36875302540).
# Before each retry this script waits, bounded and logged, until no process
# holds an apt/dpkg lock. It never kills apt-get, which could interrupt dpkg.
# Holders are read from /proc/locks and matched by device and inode, so no
# extra package or sudo is needed.
#
# The whole step stays within 12 min: an attempt starts only if it can still
# finish in time, and the lock wait shrinks to fit. Without lock waits the
# worst case is 630 s, as before. The ZIGOALS_CHROME_* settings exist for
# install-chrome.test.mjs; CI sets none of them.
#
# The lock wait has no fixed ceiling of its own (Session M): it may use all the
# time the 12-min step still has after keeping room for one full attempt, about
# 325 s after a first attempt that ran out of time. It used to stop at 240 s,
# and in run 37034640434 a timed-out attempt's apt-get was still downloading
# fonts from a slow mirror at 241 s. ZIGOALS_CHROME_LOCK_WAIT_SECONDS can still
# set a ceiling for the tests.
set -uo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <install command...>" >&2
  exit 2
fi

attempts=${ZIGOALS_CHROME_ATTEMPTS:-3}
attempt_seconds=${ZIGOALS_CHROME_ATTEMPT_SECONDS:-180}
kill_after=${ZIGOALS_CHROME_KILL_AFTER_SECONDS:-10}
read -r -a backoffs <<< "${ZIGOALS_CHROME_BACKOFF_SECONDS:-15 45}"
lock_wait=${ZIGOALS_CHROME_LOCK_WAIT_SECONDS:-}
poll=${ZIGOALS_CHROME_LOCK_POLL_SECONDS:-5}
report_every=${ZIGOALS_CHROME_LOCK_REPORT_SECONDS:-15}
step_limit=${ZIGOALS_CHROME_STEP_SECONDS:-720}
read -r -a lock_files <<< "${ZIGOALS_CHROME_LOCK_FILES:-/var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/lib/apt/lists/lock /var/cache/apt/archives/lock}"
deadline=$((SECONDS + step_limit))

# Prints the PID of each process holding a lock on one of the lock files, one
# per line ("unknown" for an open-file-description lock, which has no PID).
lock_holders() {
  local file major minor inode wanted=""
  for file in "${lock_files[@]}"; do
    [ -e "$file" ] || continue
    read -r major minor inode < <(stat -c '%Hd %Ld %i' -- "$file") || continue
    wanted+=" $(printf '%02x:%02x:%s' "$major" "$minor" "$inode")"
  done
  [ -n "$wanted" ] || return 0
  # /proc/locks: "1: POSIX ADVISORY WRITE <pid> <maj>:<min>:<inode> 0 EOF".
  # Lines with "->" are processes waiting for a lock, not holding one.
  awk -v wanted="$wanted" '
    BEGIN { n = split(wanted, list, " "); for (i = 1; i <= n; i++) want[list[i]] = 1 }
    $2 != "->" && ($6 in want) { print ($5 == "-1" ? "unknown" : $5) }
  ' /proc/locks | sort -u
}

describe_holders() {
  local pid args out=""
  for pid in $1; do
    args=""
    if [ "$pid" != unknown ]; then
      args=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | cut -c1-160)
      args=${args% }
    fi
    out+="${out:+, }PID $pid (${args:-command unknown})"
  done
  echo "$out"
}

wait_for_locks() {
  local bound=$1 start=$SECONDS next_report=0 waited holders
  while :; do
    waited=$((SECONDS - start))
    holders=$(lock_holders | tr '\n' ' ')
    holders=${holders% }
    if [ -z "$holders" ]; then
      if [ "$waited" -gt 0 ]; then echo "apt/dpkg locks released after $waited s."; fi
      return 0
    fi
    if [ "$waited" -ge "$bound" ]; then
      echo "::error::An apt/dpkg lock is still held after $waited s by $(describe_holders "$holders"). A timed-out attempt's apt-get probably has not exited; it was not killed, because that could interrupt dpkg. Re-run the job once; if it fails again, investigate."
      return 1
    fi
    if [ "$waited" -ge "$next_report" ]; then
      echo "Waiting for the apt/dpkg lock held by $(describe_holders "$holders"): $waited s of at most $bound s."
      next_report=$((waited + report_every))
    fi
    sleep "$poll"
  done
}

for ((attempt = 1; attempt <= attempts; attempt++)); do
  if [ "$attempt" -gt 1 ]; then
    sleep "${backoffs[attempt - 2]:-0}"
    # Leave room for one full attempt after the wait.
    bound=$((deadline - SECONDS - attempt_seconds - kill_after))
    if [ -n "$lock_wait" ] && [ "$bound" -gt "$lock_wait" ]; then bound=$lock_wait; fi
    if [ "$bound" -lt 0 ]; then bound=0; fi
    wait_for_locks "$bound" || exit 1
  fi
  if [ $((SECONDS + attempt_seconds + kill_after)) -gt "$deadline" ]; then
    echo "::error::Chrome install stopped before attempt $attempt of $attempts: it could not finish within the step's $step_limit s limit. Re-run the job once; if it fails again, investigate."
    exit 1
  fi
  if timeout -k "$kill_after" "$attempt_seconds" "$@"; then exit 0; fi
  echo "Chrome install attempt $attempt of $attempts failed."
done
echo "::error::Chrome install failed after $attempts attempts (infrastructure: dl.google.com or playwright install). Re-run the job once; if it fails again, investigate."
exit 1

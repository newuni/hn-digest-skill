#!/usr/bin/env bash
set -euo pipefail

TZ_NAME="Europe/Madrid"
SCRIPT_DIR="/root/clawd/skills/hn-digest/skills/hn-digest/scripts"
CACHE_DIR="/root/clawd/skills/hn-digest/skills/hn-digest/.cache"
STATE_FILE="$CACHE_DIR/last_sent_date.txt"

mkdir -p "$CACHE_DIR"

TODAY="$(TZ="$TZ_NAME" date +%F)"

if [[ -f "$STATE_FILE" ]] && grep -qx "$TODAY" "$STATE_FILE"; then
  echo "HN Digest already sent today ($TODAY); skipping catch-up."
  exit 0
fi

# Anti-repeat window across digests: 336h = 14 days.
# Increase if you still see repeats.
SEEN_TTL_HOURS="336"

node "$SCRIPT_DIR/hn_digest.js" \
  --list topstories \
  --top 30 \
  --topFetch 250 \
  --minPoints 80 \
  --tz "$TZ_NAME" \
  --seenTtlHours "$SEEN_TTL_HOURS" \
  --summarize \
  --summarizeLength short \
  --summarizeLanguage es \
  --summarizeModel cli/codex/gpt-5.2 \
  --summarizeTimeoutMs 20000 \
  --summarizeConcurrency 4

# If we got here, assume success.
echo "$TODAY" > "$STATE_FILE"

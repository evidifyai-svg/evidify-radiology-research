#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

EMOJI_PATTERN='\\p{Extended_Pictographic}|\\x{FE0F}|\\x{FE0E}|\\x{200D}'

echo "Checking for emoji characters in runtime UI strings..."
if rg --pcre2 -n "$EMOJI_PATTERN" frontend/src src; then
  echo "Emoji characters detected in frontend/src or src."
  exit 1
fi

echo "No emoji characters found."

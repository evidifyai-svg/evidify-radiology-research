#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMG_ROOT="$REPO_ROOT/frontend/public/images"
TARGET_DIR="$IMG_ROOT/inbreast"
TARGET_ZIP="$IMG_ROOT/inbreast.zip"

mkdir -p "$IMG_ROOT"

# If already populated, succeed (idempotent)
if [[ -d "$TARGET_DIR" ]] && [[ "$(ls -A "$TARGET_DIR" 2>/dev/null | wc -l | tr -d ' ')" -gt 5 ]]; then
  echo "OK: inbreast already installed at: $TARGET_DIR"
  exit 0
fi

# If zip exists, unzip it
if [[ -f "$TARGET_ZIP" ]]; then
  echo "Unzipping: $TARGET_ZIP -> $IMG_ROOT"
  rm -rf "$TARGET_DIR"
  unzip -q "$TARGET_ZIP" -d "$IMG_ROOT"
  if [[ -d "$TARGET_DIR" ]]; then
    echo "OK: installed to: $TARGET_DIR"
    exit 0
  fi
  echo "ERROR: unzip completed but $TARGET_DIR not found"
  exit 1
fi

cat <<MSG
ERROR: INBREAST not found.

Expected ONE of:
  1) Unpacked dir: $TARGET_DIR
  2) Zip file:     $TARGET_ZIP

You already have working images in your repo; if you are onboarding a new machine,
place inbreast.zip at the path above and re-run.

MSG
exit 1

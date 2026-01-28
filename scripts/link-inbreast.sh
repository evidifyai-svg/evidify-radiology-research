#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Allow overrides, but default to repo-local assets
INBREAST_ZIP="${INBREAST_ZIP:-$REPO_ROOT/frontend/public/images/inbreast.zip}"
INBREAST_DIR="${INBREAST_DIR:-$REPO_ROOT/frontend/public/images/inbreast}"

TARGET_DIR="$REPO_ROOT/frontend/public/images/inbreast"
mkdir -p "$REPO_ROOT/frontend/public/images"

# If already populated, succeed (idempotent)
if [[ -d "$TARGET_DIR" ]] && [[ "$(ls -A "$TARGET_DIR" 2>/dev/null | wc -l | tr -d ' ')" -gt 5 ]]; then
  echo "OK: inbreast already present at: $TARGET_DIR"
  exit 0
fi

# If we have an unpacked dir, link/copy it in
if [[ -d "$INBREAST_DIR" ]]; then
  echo "Linking dataset dir -> $TARGET_DIR"
  rm -rf "$TARGET_DIR"
  ln -s "$INBREAST_DIR" "$TARGET_DIR"
  echo "OK: linked $INBREAST_DIR -> $TARGET_DIR"
  exit 0
fi

# Otherwise, try to unzip if zip exists
if [[ -f "$INBREAST_ZIP" ]]; then
  echo "Unzipping $INBREAST_ZIP -> $REPO_ROOT/frontend/public/images/"
  rm -rf "$TARGET_DIR"
  unzip -q "$INBREAST_ZIP" -d "$REPO_ROOT/frontend/public/images"
  if [[ -d "$TARGET_DIR" ]]; then
    echo "OK: unzipped to $TARGET_DIR"
    exit 0
  fi
fi

echo "ERROR: Could not locate dataset."
echo "Tried:"
echo "  INBREAST_DIR: $INBREAST_DIR"
echo "  INBREAST_ZIP: $INBREAST_ZIP"
echo ""
echo "Fix options:"
echo "  1) Put inbreast.zip at: $REPO_ROOT/frontend/public/images/inbreast.zip"
echo "  2) Set INBREAST_DIR=/path/to/inbreast_png and rerun"
exit 1

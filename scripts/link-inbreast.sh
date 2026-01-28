#!/usr/bin/env bash
set -euo pipefail

DATASET_DIR="${1:-/Users/OldMaroon/Downloads/inbreast_png}"
TARGET="frontend/public/images/inbreast"

if [ ! -d "$DATASET_DIR" ]; then
  echo "ERROR: dataset dir not found: $DATASET_DIR"
  echo "Run: bash scripts/setup-inbreast.sh"
  exit 1
fi

rm -rf "$TARGET"
mkdir -p "frontend/public/images"
ln -s "$DATASET_DIR" "$TARGET"

echo "Linked $TARGET -> $DATASET_DIR"
ls -la "$TARGET" | head

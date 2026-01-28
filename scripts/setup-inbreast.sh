#!/usr/bin/env bash
set -euo pipefail

ZIP="${1:-/Users/OldMaroon/Downloads/inbreast.zip}"
WORK="${2:-/Users/OldMaroon/Downloads/inbreast_unzipped}"
OUT="${3:-/Users/OldMaroon/Downloads/inbreast_png}"

if [ ! -f "$ZIP" ]; then
  echo "ERROR: zip not found: $ZIP"
  exit 1
fi

mkdir -p "$WORK" "$OUT"
echo "Unzipping..."
unzip -q "$ZIP" -d "$WORK"

# Find the AllDICOMs folder
ALLDICOMS="$(find "$WORK" -type d -name AllDICOMs | head -1)"
if [ -z "${ALLDICOMS:-}" ] || [ ! -d "$ALLDICOMS" ]; then
  echo "ERROR: Could not locate AllDICOMs under $WORK"
  exit 1
fi

echo "Converting DICOM -> PNG..."
python3 scripts/dcm_to_png.py "$ALLDICOMS" "$OUT"

echo "Linking into repo..."
bash scripts/link-inbreast.sh "$OUT"

echo "Done. PNGs live at: $OUT"

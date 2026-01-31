#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "Evidify Radiology/Research Verifier"
echo "----------------------------------"
echo "Usage:"
echo "  ./VERIFY_PACK.command fixtures"
echo "  ./VERIFY_PACK.command ../EXPORTS/<unpacked-pack-folder>"
echo ""

TARGET="${1:-fixtures}"
if [[ "$TARGET" == "fixtures" ]]; then
  TARGET="tools/radiology-verifier/fixtures/pack-valid-mini"
fi

node "tools/radiology-verifier/verify-radiology.cjs" "$TARGET"
echo ""
echo "DONE."

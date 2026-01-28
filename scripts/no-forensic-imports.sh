#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

RUNTIME_PATHS=(
  "frontend/src"
  "src"
)

PATTERNS=(
  "tools/forensic-"
  "verification/"
  "canonical\\.json"
  "gate_report\\.canon\\.json"
)

for pattern in "${PATTERNS[@]}"; do
  if rg -n "${pattern}" "${RUNTIME_PATHS[@]}"; then
    echo "✗ Forbidden forensic reference found for pattern: ${pattern}"
    exit 1
  fi
done

echo "✓ No forensic imports/references in runtime paths"

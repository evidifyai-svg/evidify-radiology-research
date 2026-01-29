#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

failures=0

report_matches() {
  local label="$1"
  local pattern="$2"
  local matches
  matches=$(rg -n "$pattern" frontend/src src || true)
  if [ -n "$matches" ]; then
    echo "✗ ${label}"
    echo "$matches"
    failures=$((failures + 1))
  fi
}

report_matches "Runtime imports must not reference tools/forensic-" "\\bimport\\b[^\n]*['\"][^'\"]*tools/forensic-"
report_matches "Runtime requires must not reference tools/forensic-" "\\brequire\\(['\"][^'\"]*tools/forensic-"
report_matches "Runtime literal references to canonical.json or gate_report.canon.json are forbidden" "canonical\\.json|gate_report\\.canon\\.json"

if [ "$failures" -gt 0 ]; then
  exit 1
fi

echo "✓ No forbidden forensic imports or literals detected"

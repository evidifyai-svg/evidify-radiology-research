#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Only scan radiology runtime code (hard constraint)
SCAN_DIRS=(
  "$ROOT/frontend/src"
  "$ROOT/src"
)

# Ignore patterns
GREP_EXCLUDES=(--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git)

fail() {
  echo "✗ no-forensic-imports: $1"
  exit 1
}

echo "Running no-forensic-imports guardrail..."

# 1) Forbid ANY references to forensic tooling paths from runtime code
#    (simple + strict: catches imports, requires, string paths, comments)
if grep -RIn "${GREP_EXCLUDES[@]}" -E "tools/forensic-|(^|[^a-zA-Z0-9_])verification/" "${SCAN_DIRS[@]}" >/dev/null 2>&1; then
  echo
  echo "Found forbidden forensic tooling references in runtime code:"
  grep -RIn "${GREP_EXCLUDES[@]}" -E "tools/forensic-|(^|[^a-zA-Z0-9_])verification/" "${SCAN_DIRS[@]}" || true
  fail "forensic tooling reference detected under frontend/src or src"
fi

# 2) Forbid forensic-only artifact names in runtime code
#    (canonical.json + gate_report.canon.json are forensic semantics)
if grep -RIn "${GREP_EXCLUDES[@]}" -E "canonical\.json|gate_report\.canon\.json" "${SCAN_DIRS[@]}" >/dev/null 2>&1; then
  echo
  echo "Found forbidden forensic artifact references in runtime code:"
  grep -RIn "${GREP_EXCLUDES[@]}" -E "canonical\.json|gate_report\.canon\.json" "${SCAN_DIRS[@]}" || true
  fail "forensic artifact reference detected under frontend/src or src"
fi

echo "✓ no-forensic-imports passed"

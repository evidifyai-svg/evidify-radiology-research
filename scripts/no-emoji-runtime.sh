#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SCAN_DIRS=(
  "$ROOT/frontend/src"
  "$ROOT/src"
)

IGNORE_DIRS=("node_modules" "dist" ".git")

fail() {
  echo "✗ no-emoji-runtime: $1"
  exit 1
}

echo "Running no-emoji-runtime guardrail..."

python3 - "$ROOT" "${SCAN_DIRS[@]}" <<'PY'
import os
import re
import sys

root = sys.argv[1]
scan_dirs = sys.argv[2:]

emoji_re = re.compile(
    "["
    "\U0001F300-\U0001F5FF"
    "\U0001F600-\U0001F64F"
    "\U0001F680-\U0001F6FF"
    "\U0001F700-\U0001F77F"
    "\U0001F780-\U0001F7FF"
    "\U0001F800-\U0001F8FF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FAFF"
    "\U00002700-\U000027BF"
    "\U00002600-\U000026FF"
    "]"
    "|[✅⚠️📌🧠🔒📦🧪]"
)

ignore_dirs = {"node_modules", "dist", ".git"}

matches = []

for base in scan_dirs:
    if not os.path.isdir(base):
        continue
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
        for filename in filenames:
            path = os.path.join(dirpath, filename)
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as handle:
                    for idx, line in enumerate(handle, 1):
                        if emoji_re.search(line):
                            rel_path = os.path.relpath(path, root)
                            matches.append((rel_path, idx, line.rstrip()))
            except OSError:
                continue

if matches:
    print("\nFound emoji glyphs in runtime code:")
    for rel_path, idx, line in matches:
        print(f"{rel_path}:{idx}: {line}")
    sys.exit(1)

print("✓ no-emoji-runtime passed")
PY


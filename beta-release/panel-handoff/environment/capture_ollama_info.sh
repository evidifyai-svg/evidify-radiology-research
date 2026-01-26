#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_FILE="${OUT_DIR}/ollama_info.txt"

{
  echo "Captured (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""
  if command -v ollama >/dev/null 2>&1; then
    echo "ollama --version:"
    ollama --version || true
    echo ""
    echo "ollama list:"
    ollama list || true
  else
    echo "ollama: NOT INSTALLED (or not on PATH)"
  fi
} > "${OUT_FILE}"

echo "Wrote: ${OUT_FILE}"

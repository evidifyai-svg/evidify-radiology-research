#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_FILE="${OUT_DIR}/system_info.md"

{
  echo "# System info (PHI-free)"
  echo ""
  echo "Captured (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""
  echo "## macOS"
  sw_vers || true
  echo ""
  echo "## Hardware"
  system_profiler SPHardwareDataType 2>/dev/null || true
  echo ""
  echo "## Memory (topline)"
  sysctl hw.memsize 2>/dev/null || true
  echo ""
  echo "## CPU"
  sysctl -n machdep.cpu.brand_string 2>/dev/null || true
} > "${OUT_FILE}"

echo "Wrote: ${OUT_FILE}"

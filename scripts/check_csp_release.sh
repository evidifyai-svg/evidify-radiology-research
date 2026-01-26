#!/bin/bash
# check_csp_release.sh - Verify production CSP doesn't contain dev allowances
#
# Usage: ./scripts/check_csp_release.sh [path/to/tauri.conf.json]
#
# Returns exit code 0 if CSP is safe for production
# Returns exit code 1 if CSP contains forbidden dev tokens

set -euo pipefail

CONFIG_FILE="${1:-src-tauri/tauri.conf.json}"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Config file not found: $CONFIG_FILE"
  exit 1
fi

echo "🔍 Checking CSP in: $CONFIG_FILE"

# Extract CSP JSON line (best-effort; config is small)
CSP_LINE=$(grep -o '"csp"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | head -1 || true)

if [ -z "${CSP_LINE:-}" ]; then
  echo "❌ No CSP found in config"
  exit 1
fi

# Strip leading JSON key to get raw CSP string
CSP=$(echo "$CSP_LINE" | sed -E 's/^.*"csp"[[:space:]]*:[[:space:]]*"(.*)"$/\1/')

FOUND_ISSUES=0

# 1) Hard-ban websocket allowances in prod
for pattern in "ws://" "wss://"; do
  if echo "$CSP" | grep -q "$pattern"; then
    echo "❌ Found forbidden websocket pattern: $pattern"
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
  fi
done

# 2) Hard-ban localhost allowances (prod should not rely on them)
for pattern in "http://localhost" "https://localhost"; do
  if echo "$CSP" | grep -q "$pattern"; then
    echo "❌ Found forbidden localhost pattern: $pattern"
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
  fi
done

# 3) Ban unsafe-eval in production
if echo "$CSP" | grep -q "'unsafe-eval'"; then
  echo "❌ Found forbidden pattern: 'unsafe-eval'"
  FOUND_ISSUES=$((FOUND_ISSUES + 1))
fi

# 4) Loopback policy: allow ONLY http://127.0.0.1:11434 (Ollama)
LOOPBACK_PORTS=$(echo "$CSP" | grep -oE "127\.0\.0\.1:[0-9]+" | sort -u || true)
if [ -n "${LOOPBACK_PORTS:-}" ]; then
  while read -r port; do
    if [ -n "$port" ] && [ "$port" != "127.0.0.1:11434" ]; then
      echo "❌ Found forbidden loopback allowance in CSP: $port (only 127.0.0.1:11434 is allowed)"
      FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
  done <<< "$LOOPBACK_PORTS"
  if echo "$LOOPBACK_PORTS" | grep -q "127.0.0.1:11434"; then
    echo "✅ Ollama loopback (127.0.0.1:11434) - OK"
  fi
fi

# 5) Optional: forbid external allowlists in prod CSP (keeps "offline-first" claims clean)
for pattern in "api.github.com" "github.com"; do
  if echo "$CSP" | grep -q "$pattern"; then
    echo "❌ Found forbidden external allowlist in production CSP: $pattern"
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
  fi
done

if [ $FOUND_ISSUES -gt 0 ]; then
  echo ""
  echo "❌ CSP CHECK FAILED: Found $FOUND_ISSUES issue(s)"
  echo ""
  echo "This configuration is NOT safe for production release."
  echo "Dev allowances (HMR websockets, localhost wildcards) should only be in tauri.conf.dev.json"
  exit 1
fi

echo ""
echo "✅ CSP CHECK PASSED: No forbidden patterns found"
echo "This configuration is safe for production release."
exit 0

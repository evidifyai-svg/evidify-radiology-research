#!/usr/bin/env bash
#
# smoke-test-demo-pack.sh - Validate demo pack server and assets
#
# Starts the demo server, curls key URLs, and verifies responses.
# Exits non-zero if any check fails.
#
# Usage:
#   bash scripts/smoke-test-demo-pack.sh [pack-dir]
#
# Default pack-dir: /tmp/evidify_demo_pack
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PACK_DIR="${1:-/tmp/evidify_demo_pack}"
PORT=5174  # Use different port than default to avoid conflicts
SERVER_PID=""
FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED=1
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

cleanup() {
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        log_info "Stopping server (PID: $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT

# ============================================================================
# Validate pack directory
# ============================================================================
if [ ! -d "$PACK_DIR" ]; then
    log_fail "Pack directory not found: $PACK_DIR"
    echo ""
    echo "Run 'bash scripts/make-demo-pack.sh' first to create the demo pack."
    exit 1
fi

if [ ! -f "$PACK_DIR/server.mjs" ]; then
    log_fail "server.mjs not found in $PACK_DIR"
    exit 1
fi

if [ ! -d "$PACK_DIR/app" ]; then
    log_fail "app/ directory not found in $PACK_DIR"
    exit 1
fi

log_info "Testing demo pack at: $PACK_DIR"
echo ""

# ============================================================================
# Start server
# ============================================================================
log_info "Starting server on port $PORT..."

cd "$PACK_DIR"
node server.mjs "$PORT" &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Check if server is running
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    log_fail "Server failed to start"
    exit 1
fi

log_success "Server started (PID: $SERVER_PID)"
echo ""

# ============================================================================
# Test URLs
# ============================================================================
BASE_URL="http://127.0.0.1:$PORT"

test_url() {
    local url="$1"
    local desc="$2"
    local expected_content="${3:-}"

    log_info "Testing: $desc"
    log_info "  URL: $url"

    # Get response with status code
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
    status_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "200" ]; then
        # Check content if specified
        if [ -n "$expected_content" ]; then
            if echo "$body" | grep -q "$expected_content"; then
                log_success "$desc - Status: $status_code, Content: OK"
            else
                log_fail "$desc - Status: $status_code, Content: Missing expected content"
            fi
        else
            log_success "$desc - Status: $status_code"
        fi
    else
        log_fail "$desc - Status: $status_code (expected 200)"
    fi
    echo ""
}

# Test main HTML page
test_url "$BASE_URL/research-demo.html" "Research Demo HTML" "<!DOCTYPE html>"

# Test root redirect
test_url "$BASE_URL/" "Root URL (should serve research-demo.html)" "<!DOCTYPE html>"

# Find and test JS assets
log_info "Scanning for JS assets..."
js_files=$(find "$PACK_DIR/app/assets" -name "*.js" 2>/dev/null | head -3 || true)

if [ -z "$js_files" ]; then
    log_warn "No JS files found in app/assets/"
else
    js_count=0
    while IFS= read -r js_file; do
        if [ -n "$js_file" ]; then
            relative_path="${js_file#$PACK_DIR/app/}"
            test_url "$BASE_URL/$relative_path" "JS Asset: $relative_path" "function\|const\|var\|export\|import"
            js_count=$((js_count + 1))
        fi
    done <<< "$js_files"

    if [ "$js_count" -lt 2 ]; then
        log_warn "Only $js_count JS files tested (expected at least 2)"
    fi
fi

# Test CSS assets if any
css_files=$(find "$PACK_DIR/app/assets" -name "*.css" 2>/dev/null | head -1 || true)
if [ -n "$css_files" ]; then
    while IFS= read -r css_file; do
        if [ -n "$css_file" ]; then
            relative_path="${css_file#$PACK_DIR/app/}"
            test_url "$BASE_URL/$relative_path" "CSS Asset: $relative_path"
        fi
    done <<< "$css_files"
fi

# Test other HTML entry points if they exist
if [ -f "$PACK_DIR/app/vault.html" ]; then
    test_url "$BASE_URL/vault.html" "Vault HTML" "<!DOCTYPE html>"
fi

if [ -f "$PACK_DIR/app/index.html" ]; then
    test_url "$BASE_URL/index.html" "Index HTML" "<!DOCTYPE html>"
fi

# ============================================================================
# Test 404 handling
# ============================================================================
log_info "Testing 404 handling..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/nonexistent-file-12345.xyz" 2>/dev/null || echo "000")
status_code=$(echo "$response" | tail -1)

if [ "$status_code" = "404" ]; then
    log_success "404 handling - correctly returns 404 for nonexistent file"
else
    log_warn "404 handling - returned $status_code instead of 404 (may be SPA fallback)"
fi
echo ""

# ============================================================================
# Test verifier presence
# ============================================================================
log_info "Checking verifier tool..."
if [ -f "$PACK_DIR/tools/radiology-verifier/verify-radiology.cjs" ]; then
    log_success "Verifier tool present"
else
    log_fail "Verifier tool missing"
fi

if [ -d "$PACK_DIR/tools/radiology-verifier/fixtures/pack-valid-mini" ]; then
    log_success "Test fixture present"
else
    log_warn "Test fixture not found (optional)"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "========================================"
if [ "$FAILED" -eq 0 ]; then
    log_success "All smoke tests passed!"
    echo "========================================"
    exit 0
else
    log_fail "Some smoke tests failed"
    echo "========================================"
    exit 1
fi

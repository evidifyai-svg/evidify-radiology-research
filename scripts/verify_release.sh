#!/bin/bash
# verify_release.sh - Pre-release verification script
#
# Runs all checks required before a release can ship.
# Exit code 0 = all checks pass
# Exit code 1 = one or more checks failed
#
# Usage: ./scripts/verify_release.sh [--ci]
#   --ci: Enable CI mode (stricter, fails fast)

set -e

CI_MODE=false
if [ "$1" = "--ci" ]; then
    CI_MODE=true
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0
WARNINGS=0

pass() {
    echo -e "${GREEN}✓${NC} $1"
}

fail() {
    echo -e "${RED}✗${NC} $1"
    FAILED=$((FAILED + 1))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

section() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================
# Version Consistency
# ============================================
section "Version Consistency"

# Extract versions
CARGO_VERSION=$(grep '^version' "$ROOT_DIR/src-tauri/Cargo.toml" | head -1 | cut -d'"' -f2)
TAURI_VERSION=$(grep '"version"' "$ROOT_DIR/src-tauri/tauri.conf.json" | head -1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
NPM_VERSION=$(grep '"version"' "$ROOT_DIR/frontend/package.json" | head -1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')

echo "  Cargo.toml:      $CARGO_VERSION"
echo "  tauri.conf.json: $TAURI_VERSION"
echo "  package.json:    $NPM_VERSION"

if [ "$CARGO_VERSION" = "$TAURI_VERSION" ] && [ "$TAURI_VERSION" = "$NPM_VERSION" ]; then
    pass "All versions match: $CARGO_VERSION"
else
    fail "Version mismatch detected"
fi

# ============================================
# CSP Check
# ============================================
section "Content Security Policy"

if [ -f "$SCRIPT_DIR/check_csp_release.sh" ]; then
    if bash "$SCRIPT_DIR/check_csp_release.sh" "$ROOT_DIR/src-tauri/tauri.conf.json" > /dev/null 2>&1; then
        pass "Production CSP is clean (no dev allowances)"
    else
        fail "Production CSP contains forbidden patterns"
        bash "$SCRIPT_DIR/check_csp_release.sh" "$ROOT_DIR/src-tauri/tauri.conf.json" 2>&1 | head -10
    fi
else
    warn "CSP check script not found"
fi

# ============================================
# Frontend Build
# ============================================
section "Frontend Build"

cd "$ROOT_DIR/frontend"

if npm run build > /tmp/npm_build.log 2>&1; then
    pass "Frontend builds successfully"
else
    fail "Frontend build failed"
    tail -20 /tmp/npm_build.log
fi

# TypeScript check
if npx tsc --noEmit > /tmp/tsc.log 2>&1; then
    pass "TypeScript type check passes"
else
    fail "TypeScript errors found"
    tail -20 /tmp/tsc.log
fi

cd "$ROOT_DIR"

# ============================================
# Rust Checks (if cargo available)
# ============================================
section "Rust Checks"

if command -v cargo &> /dev/null; then
    cd "$ROOT_DIR/src-tauri"
    
    # Format check
    if cargo fmt --check > /dev/null 2>&1; then
        pass "Rust code is formatted"
    else
        warn "Rust code needs formatting (cargo fmt)"
    fi
    
    # Clippy (warnings as errors in CI)
    if [ "$CI_MODE" = true ]; then
        if cargo clippy -- -D warnings > /tmp/clippy.log 2>&1; then
            pass "Clippy passes (no warnings)"
        else
            fail "Clippy warnings found"
            tail -20 /tmp/clippy.log
        fi
    else
        if cargo clippy > /tmp/clippy.log 2>&1; then
            pass "Clippy passes"
        else
            warn "Clippy has warnings"
        fi
    fi
    
    # Tests
    if cargo test > /tmp/cargo_test.log 2>&1; then
        pass "Rust tests pass"
    else
        fail "Rust tests failed"
        tail -30 /tmp/cargo_test.log
    fi
    
    cd "$ROOT_DIR"
else
    warn "Cargo not available - skipping Rust checks"
fi

# ============================================
# Documentation Checks
# ============================================
section "Documentation"

# INSTALL.md version
INSTALL_VERSION=$(grep -o 'Version:.*[0-9]\+\.[0-9]\+\.[0-9]\+' "$ROOT_DIR/INSTALL.md" | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "not found")
if [ "$INSTALL_VERSION" = "$CARGO_VERSION" ]; then
    pass "INSTALL.md version matches ($INSTALL_VERSION)"
else
    fail "INSTALL.md version mismatch: $INSTALL_VERSION vs $CARGO_VERSION"
fi

# Required docs exist
for doc in README.md INSTALL.md SECURITY_FIXES.md; do
    if [ -f "$ROOT_DIR/$doc" ]; then
        pass "$doc exists"
    else
        fail "$doc missing"
    fi
done

# ============================================
# Security Checks
# ============================================
section "Security Checks"

# Devtools in production
if grep -q '"devtools"' "$ROOT_DIR/src-tauri/Cargo.toml"; then
    if grep '"devtools"' "$ROOT_DIR/src-tauri/Cargo.toml" | grep -q 'default'; then
        fail "Devtools is in default features (should be optional)"
    else
        pass "Devtools is optional (not in default features)"
    fi
else
    pass "Devtools not referenced in Cargo.toml"
fi

# Filesystem scope
FS_SCOPE=$(grep -A5 '"fs"' "$ROOT_DIR/src-tauri/tauri.conf.json" | grep 'scope' || echo "")
if echo "$FS_SCOPE" | grep -q 'DOCUMENT\|HOME'; then
    fail "Filesystem scope too broad (contains DOCUMENT or HOME)"
else
    pass "Filesystem scope is restricted"
fi

# ============================================
# Summary
# ============================================
section "Summary"

echo ""
if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo "This build is ready for release."
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}$WARNINGS warning(s), 0 failures${NC}"
    echo "Review warnings before release."
    exit 0
else
    echo -e "${RED}$FAILED failure(s), $WARNINGS warning(s)${NC}"
    echo "Fix failures before release."
    exit 1
fi

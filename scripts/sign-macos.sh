#!/bin/bash
# Evidify macOS Code Signing & Notarization Script
# 
# Prerequisites:
#   - Apple Developer ID ($99/year)
#   - Developer ID Application certificate in Keychain
#   - App-specific password for notarytool (store in Keychain as AC_PASSWORD)
#
# Usage:
#   ./scripts/sign-macos.sh path/to/Evidify.app [--notarize]
#
# Environment variables (or modify defaults below):
#   APPLE_TEAM_ID       - Your Apple Developer Team ID
#   APPLE_ID            - Your Apple ID email
#   SIGNING_IDENTITY    - Full signing identity string

set -e

# ============================================
# Configuration
# ============================================

# Defaults - override with environment variables
APPLE_TEAM_ID="${APPLE_TEAM_ID:-XXXXXXXXXX}"
APPLE_ID="${APPLE_ID:-developer@evidify.ai}"
SIGNING_IDENTITY="${SIGNING_IDENTITY:-Developer ID Application: Evidify Inc ($APPLE_TEAM_ID)}"
KEYCHAIN_PASSWORD_ITEM="AC_PASSWORD"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# Helper Functions
# ============================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for codesign
    if ! command -v codesign &> /dev/null; then
        log_error "codesign not found. Are you on macOS with Xcode installed?"
        exit 1
    fi
    
    # Check for notarytool
    if ! command -v xcrun &> /dev/null; then
        log_error "xcrun not found. Install Xcode Command Line Tools."
        exit 1
    fi
    
    # Check for signing identity
    if ! security find-identity -v | grep -q "$SIGNING_IDENTITY"; then
        log_error "Signing identity not found in keychain: $SIGNING_IDENTITY"
        log_info "Available identities:"
        security find-identity -v
        exit 1
    fi
    
    log_info "All prerequisites satisfied"
}

# ============================================
# Signing Functions
# ============================================

sign_app() {
    local app_path="$1"
    
    log_info "Signing application: $app_path"
    
    # Sign all nested components first (frameworks, libraries)
    log_info "Signing nested components..."
    
    # Sign all dylibs
    find "$app_path" -name "*.dylib" -type f | while read dylib; do
        log_info "  Signing: $dylib"
        codesign --force --options runtime \
            --sign "$SIGNING_IDENTITY" \
            --timestamp \
            "$dylib"
    done
    
    # Sign all frameworks
    find "$app_path" -name "*.framework" -type d | while read framework; do
        log_info "  Signing framework: $framework"
        codesign --force --deep --options runtime \
            --sign "$SIGNING_IDENTITY" \
            --timestamp \
            "$framework"
    done
    
    # Sign all executables in MacOS folder
    find "$app_path/Contents/MacOS" -type f -perm +111 | while read executable; do
        log_info "  Signing executable: $executable"
        codesign --force --options runtime \
            --sign "$SIGNING_IDENTITY" \
            --timestamp \
            "$executable"
    done
    
    # Sign the main app bundle
    log_info "Signing main bundle..."
    codesign --force --deep --options runtime \
        --sign "$SIGNING_IDENTITY" \
        --timestamp \
        --entitlements "$(dirname "$0")/Entitlements.plist" \
        "$app_path"
    
    # Verify signature
    log_info "Verifying signature..."
    codesign --verify --deep --strict --verbose=2 "$app_path"
    
    if [ $? -eq 0 ]; then
        log_info "Signature verified successfully"
    else
        log_error "Signature verification failed"
        exit 1
    fi
}

create_dmg() {
    local app_path="$1"
    local dmg_path="$2"
    
    log_info "Creating DMG: $dmg_path"
    
    # Remove existing DMG if present
    rm -f "$dmg_path"
    
    # Check if create-dmg is available
    if command -v create-dmg &> /dev/null; then
        create-dmg \
            --volname "Evidify" \
            --volicon "$app_path/Contents/Resources/icon.icns" \
            --window-pos 200 120 \
            --window-size 800 400 \
            --icon-size 100 \
            --icon "Evidify.app" 200 190 \
            --hide-extension "Evidify.app" \
            --app-drop-link 600 185 \
            "$dmg_path" \
            "$app_path"
    else
        # Fallback to hdiutil
        log_warn "create-dmg not found, using hdiutil (less pretty)"
        local temp_dir=$(mktemp -d)
        cp -R "$app_path" "$temp_dir/"
        hdiutil create -volname "Evidify" \
            -srcfolder "$temp_dir" \
            -ov -format UDZO \
            "$dmg_path"
        rm -rf "$temp_dir"
    fi
    
    # Sign the DMG
    log_info "Signing DMG..."
    codesign --force --sign "$SIGNING_IDENTITY" --timestamp "$dmg_path"
}

notarize() {
    local dmg_path="$1"
    
    log_info "Submitting for notarization..."
    
    # Submit for notarization
    xcrun notarytool submit "$dmg_path" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "@keychain:$KEYCHAIN_PASSWORD_ITEM" \
        --wait
    
    if [ $? -ne 0 ]; then
        log_error "Notarization failed"
        log_info "To check status: xcrun notarytool log <submission-id> --apple-id $APPLE_ID --team-id $APPLE_TEAM_ID"
        exit 1
    fi
    
    # Staple the notarization ticket
    log_info "Stapling notarization ticket..."
    xcrun stapler staple "$dmg_path"
    
    # Verify
    log_info "Verifying notarization..."
    spctl --assess --type open --context context:primary-signature --verbose=2 "$dmg_path"
    
    log_info "Notarization complete!"
}

# ============================================
# Main
# ============================================

main() {
    if [ $# -lt 1 ]; then
        echo "Usage: $0 <path/to/Evidify.app> [--notarize]"
        echo ""
        echo "Options:"
        echo "  --notarize    Also notarize the app (requires network)"
        echo ""
        echo "Environment variables:"
        echo "  APPLE_TEAM_ID       Your Apple Developer Team ID"
        echo "  APPLE_ID            Your Apple ID email"
        echo "  SIGNING_IDENTITY    Full signing identity string"
        exit 1
    fi
    
    local app_path="$1"
    local do_notarize=false
    
    if [ "$2" = "--notarize" ]; then
        do_notarize=true
    fi
    
    # Validate app path
    if [ ! -d "$app_path" ]; then
        log_error "App not found: $app_path"
        exit 1
    fi
    
    if [[ ! "$app_path" == *.app ]]; then
        log_error "Path must be a .app bundle"
        exit 1
    fi
    
    # Get app name for DMG
    local app_name=$(basename "$app_path" .app)
    local dmg_path="$(dirname "$app_path")/${app_name}.dmg"
    
    check_prerequisites
    
    log_info "=========================================="
    log_info "Evidify macOS Signing"
    log_info "=========================================="
    log_info "App: $app_path"
    log_info "Team ID: $APPLE_TEAM_ID"
    log_info "Identity: $SIGNING_IDENTITY"
    log_info "Notarize: $do_notarize"
    log_info "=========================================="
    
    # Sign the app
    sign_app "$app_path"
    
    # Create DMG
    create_dmg "$app_path" "$dmg_path"
    
    # Notarize if requested
    if [ "$do_notarize" = true ]; then
        notarize "$dmg_path"
    fi
    
    log_info "=========================================="
    log_info "Done!"
    log_info "Output: $dmg_path"
    log_info "=========================================="
    
    # Verification commands
    echo ""
    log_info "Verification commands:"
    echo "  codesign --verify --deep --strict '$app_path'"
    echo "  spctl --assess --verbose '$dmg_path'"
}

main "$@"

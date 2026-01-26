#!/bin/bash
# Evidify v4.2.6-beta - Build & Test Execution Script
# Run this on your local Mac to complete Steps 1-4

set -e

echo "=========================================="
echo "  Evidify v4.2.6-beta Build & Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "🔍 Checking prerequisites..."

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $1 found"
        return 0
    else
        echo -e "  ${RED}✗${NC} $1 not found"
        return 1
    fi
}

MISSING=0
check_command "rustc" || MISSING=1
check_command "cargo" || MISSING=1
check_command "node" || MISSING=1
check_command "npm" || MISSING=1

if [ $MISSING -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}Install missing tools:${NC}"
    echo "  Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo "  Node: brew install node (or use nvm)"
    echo ""
    exit 1
fi

echo ""
echo "=========================================="
echo "  STEP 1: Build Application (30 min)"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "src-tauri/Cargo.toml" ]; then
    echo -e "${RED}Error: Run this script from the evidify-v9 directory${NC}"
    echo "  cd path/to/evidify-v9"
    echo "  ./build-and-test.sh"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build
cd ..

# Build Tauri app
echo "🦀 Building Rust backend + Tauri app..."
echo "   (This takes 5-15 minutes on first build)"
cargo tauri build

echo ""
echo -e "${GREEN}✓ Build complete!${NC}"
echo ""

# Find the built app
if [ -d "src-tauri/target/release/bundle/macos/Evidify.app" ]; then
    APP_PATH="src-tauri/target/release/bundle/macos/Evidify.app"
    echo "📍 App location: $APP_PATH"
elif [ -d "src-tauri/target/release/bundle/dmg" ]; then
    DMG=$(ls src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null | head -1)
    echo "📍 DMG location: $DMG"
fi

echo ""
echo "=========================================="
echo "  STEP 2: Functional Test (20 min)"
echo "=========================================="
echo ""
echo "Open the app and complete this checklist:"
echo ""
echo "  □ 1. CREATE VAULT"
echo "      - Launch Evidify"
echo "      - Enter passphrase: TestPass123!"
echo "      - Confirm vault created"
echo ""
echo "  □ 2. CREATE CLIENT"
echo "      - Click 'New Client'"
echo "      - Name: Test Patient Alpha"
echo "      - Save"
echo ""
echo "  □ 3. CREATE NOTE"
echo "      - Select client"
echo "      - Click 'New Note'"
echo "      - Enter sample session note:"
echo "        'Patient presented for intake. Chief complaint: anxiety and sleep difficulties."
echo "         Reports onset 3 months ago following job loss. Denies SI/HI.'"
echo "      - Save note"
echo ""
echo "  □ 4. AI ANALYSIS (if Ollama running)"
echo "      - Click 'Structure with AI'"
echo "      - Review generated SOAP/DAP structure"
echo ""
echo "  □ 5. EXPORT NOTE"
echo "      - Click 'Export'"
echo "      - Choose PDF format"
echo "      - Save to Desktop"
echo "      - Verify PDF opens correctly"
echo ""
echo "  □ 6. LOCK/UNLOCK"
echo "      - Lock vault (menu or timeout)"
echo "      - Re-enter passphrase"
echo "      - Verify data still present"
echo ""
echo "  □ 7. VIEW AUDIT LOG"
echo "      - Go to Settings > Audit"
echo "      - Verify entries for all actions"
echo ""

echo "Press Enter when Step 2 is complete..."
read

echo ""
echo "=========================================="
echo "  STEP 3: Screen Recording (1 hour)"
echo "=========================================="
echo ""
echo "Record a 5-7 minute video showing:"
echo ""
echo "  0:00 - 0:30  App launch, vault creation"
echo "  0:30 - 1:30  Create client, enter profile info"
echo "  1:30 - 3:00  Create note with clinical content"
echo "  3:00 - 4:00  AI structuring (show before/after)"
echo "  4:00 - 5:00  Export to PDF, show result"
echo "  5:00 - 6:00  View audit log, verify chain"
echo "  6:00 - 7:00  Lock vault, re-unlock, close"
echo ""
echo "Recording tips:"
echo "  - Use QuickTime Player > File > New Screen Recording"
echo "  - Select 'Record Selected Portion' for just the app window"
echo "  - Speak briefly to explain each action"
echo "  - Show the 'Working Offline' indicator"
echo ""
echo "Save as: Evidify_v4.2.6_Beta_Walkthrough.mov"
echo ""

echo "Press Enter when Step 3 is complete..."
read

echo ""
echo "=========================================="
echo "  STEP 4: Restore Drill (30 min)"
echo "=========================================="
echo ""
echo "Execute the restore drill to prove DR capability:"
echo ""
echo "  1. BACKUP"
echo "     cp ~/Library/Application\\ Support/com.evidify.app/vault.db ~/Desktop/vault-backup.db"
echo ""
echo "  2. SIMULATE DISASTER"
echo "     - Quit Evidify"
echo "     - Delete: ~/Library/Application\\ Support/com.evidify.app/vault.db"
echo "     - Delete keychain entries (Keychain Access > search 'evidify')"
echo ""
echo "  3. RESTORE"
echo "     cp ~/Desktop/vault-backup.db ~/Library/Application\\ Support/com.evidify.app/vault.db"
echo ""
echo "  4. VERIFY"
echo "     - Launch Evidify"
echo "     - Enter passphrase"
echo "     - Confirm all data accessible"
echo "     - Verify audit chain intact"
echo ""
echo "  5. DOCUMENT"
echo "     - Fill out restore drill report template"
echo "     - Record time to complete each step"
echo ""

echo "Press Enter when Step 4 is complete..."
read

echo ""
echo "=========================================="
echo -e "  ${GREEN}ALL STEPS COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Deliverables created:"
echo "  □ Built app at: $APP_PATH"
echo "  □ Screen recording: Evidify_v4.2.6_Beta_Walkthrough.mov"
echo "  □ Restore drill report (fill out template)"
echo ""
echo "Next: Share these with your analyst for re-scoring"
echo ""

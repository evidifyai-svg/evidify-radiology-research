#!/bin/bash
# Evidify Beta Installer for macOS
# Run with: curl -fsSL [url] | bash
# Or: bash install.sh

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Evidify Beta Installer for macOS                   ║"
echo "║                    v4.1.2-hotfix14                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_installed() {
    command -v "$1" &> /dev/null
}

print_status() {
    if [ "$2" = "ok" ]; then
        echo -e "${GREEN}✓${NC} $1"
    elif [ "$2" = "missing" ]; then
        echo -e "${RED}✗${NC} $1"
    else
        echo -e "${YELLOW}→${NC} $1"
    fi
}

echo "Checking prerequisites..."
echo ""

# Check for Homebrew
if check_installed brew; then
    print_status "Homebrew" "ok"
else
    print_status "Homebrew not found - installing..." "pending"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    print_status "Homebrew installed" "ok"
fi

# Check for Node.js
if check_installed node; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_status "Node.js $(node --version)" "ok"
    else
        print_status "Node.js version too old, upgrading..." "pending"
        brew install node@20
        print_status "Node.js updated" "ok"
    fi
else
    print_status "Node.js not found - installing..." "pending"
    brew install node@20
    print_status "Node.js installed" "ok"
fi

# Check for Rust
if check_installed rustc; then
    print_status "Rust $(rustc --version | cut -d' ' -f2)" "ok"
else
    print_status "Rust not found - installing..." "pending"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    print_status "Rust installed" "ok"
fi

# Check for Ollama
if check_installed ollama; then
    print_status "Ollama" "ok"
else
    print_status "Ollama not found - installing..." "pending"
    brew install ollama
    print_status "Ollama installed" "ok"
fi

echo ""
echo "Setting up AI model..."

# Start Ollama if not running
if ! pgrep -x "ollama" > /dev/null; then
    print_status "Starting Ollama service..." "pending"
    ollama serve &>/dev/null &
    sleep 3
fi

# Check if model exists
if ollama list 2>/dev/null | grep -q "qwen2.5:7b-instruct"; then
    print_status "AI model (qwen2.5:7b-instruct)" "ok"
else
    print_status "Downloading AI model (~5GB, this may take a few minutes)..." "pending"
    ollama pull qwen2.5:7b-instruct
    print_status "AI model downloaded" "ok"
fi

echo ""
echo "Setting up Evidify..."

# Find and extract the zip file
EVIDIFY_ZIP=$(find ~/Downloads -name "evidify-beta-*.zip" -type f 2>/dev/null | head -1)

if [ -z "$EVIDIFY_ZIP" ]; then
    echo -e "${YELLOW}Note: No evidify-beta zip found in ~/Downloads${NC}"
    echo "Please download the beta zip and run this script again,"
    echo "or manually extract and run:"
    echo "  cd evidify-v9/frontend && npm ci && cd .."
    echo "  cargo tauri dev"
else
    EVIDIFY_DIR=$(dirname "$EVIDIFY_ZIP")
    cd "$EVIDIFY_DIR"
    
    # Remove old extracted folder if exists
    rm -rf evidify-v9 2>/dev/null || true
    
    print_status "Extracting $EVIDIFY_ZIP..." "pending"
    unzip -q "$EVIDIFY_ZIP"
    
    cd evidify-v9/frontend
    print_status "Installing dependencies..." "pending"
    npm ci --silent
    
    print_status "Evidify ready!" "ok"
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo -e "${GREEN}Installation complete!${NC}"
    echo ""
    echo "To run Evidify:"
    echo -e "  ${YELLOW}cd $EVIDIFY_DIR/evidify-v9${NC}"
    echo -e "  ${YELLOW}cargo tauri dev${NC}"
    echo ""
    echo "First build takes 2-5 minutes. Subsequent launches are fast."
    echo ""
    echo "Notes:"
    echo "  • Keep Ollama running (it started automatically)"
    echo "  • You'll see keychain prompts - enter your Mac password"
    echo "  • Create a vault passphrase on first launch (no recovery!)"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════════"

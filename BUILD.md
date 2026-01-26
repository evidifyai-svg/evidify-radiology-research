# Evidify v4.2.6-beta Build Guide

## Prerequisites

### macOS
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install Tauri CLI
cargo install tauri-cli
```

### Windows
1. Install [Rust](https://rustup.rs/)
2. Install [Node.js 18+](https://nodejs.org/)
3. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
4. `cargo install tauri-cli`

## Quick Build

```bash
# Install frontend dependencies
cd frontend
npm install

# Build frontend
npm run build

# Build Tauri app (from project root)
cd ..
cargo tauri build
```

## Development Mode

```bash
# Start dev server with hot reload
cargo tauri dev
```

## Build Outputs

| Platform | Location |
|----------|----------|
| macOS DMG | `src-tauri/target/release/bundle/dmg/Evidify_4.2.6-beta_aarch64.dmg` |
| macOS App | `src-tauri/target/release/bundle/macos/Evidify.app` |
| Windows EXE | `src-tauri/target/release/bundle/msi/Evidify_4.2.6-beta_x64.msi` |

## Verification

After building, verify the app:

1. **Launch**: Open the built app
2. **Create Vault**: Enter a test passphrase
3. **Create Client**: Add a test client
4. **Create Note**: Write a test note
5. **Export**: Export note to PDF
6. **Lock/Unlock**: Verify vault locks and unlocks correctly

## Troubleshooting

### SQLCipher Build Issues (macOS)
```bash
# If OpenSSL errors, install via Homebrew
brew install openssl
export OPENSSL_DIR=$(brew --prefix openssl)
```

### Node Memory Issues
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Keychain Access (macOS)
The app requires keychain access for secure key storage. Grant access when prompted.

## Version Check

All versions should show `4.2.6-beta`:
- `src-tauri/Cargo.toml` 
- `src-tauri/tauri.conf.json`
- `frontend/package.json`

## Next Steps After Build

1. Run the verification steps above
2. Create a 5-7 minute screen recording showing the workflow
3. Execute the restore drill procedure
4. Package for beta testers

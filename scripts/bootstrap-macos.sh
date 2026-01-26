#!/usr/bin/env bash
set -euo pipefail

echo "== Evidify bootstrap (macOS) =="

command -v rustup >/dev/null 2>&1 || {
  echo "rustup not found. Install Rust first: https://rustup.rs";
  exit 1;
}

echo "Pinning Rust toolchain to 1.78.0 for this repo"
rustup toolchain install 1.78.0 >/dev/null
rustup override set 1.78.0

echo "Node version: $(node --version 2>/dev/null || echo 'not found')"
echo "Rust version: $(rustc --version)"

echo "Installing frontend dependencies"
pushd frontend >/dev/null
npm ci
npm run build
popd >/dev/null

if ! cargo --list | grep -q "tauri"; then
  echo "Installing tauri-cli (cargo tauri)"
  cargo install tauri-cli --version 1.5.14
fi

echo "Bootstrap complete. Run: cargo tauri dev"

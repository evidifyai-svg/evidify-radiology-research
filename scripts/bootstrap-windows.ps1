$ErrorActionPreference = "Stop"

Write-Host "== Evidify bootstrap (Windows) =="

if (-not (Get-Command rustup -ErrorAction SilentlyContinue)) {
  throw "rustup not found. Install Rustup first (Rustlang.Rustup via winget)."
}

Write-Host "Pinning Rust toolchain to 1.78.0 for this repo"
rustup toolchain install 1.78.0 | Out-Null
rustup override set 1.78.0 | Out-Null

Write-Host "Installing frontend dependencies"
Push-Location frontend
npm ci
npm run build
Pop-Location

# Ensure `cargo tauri` exists
$cargoList = cargo --list
if ($cargoList -notmatch "tauri") {
  Write-Host "Installing tauri-cli (cargo tauri)"
  cargo install tauri-cli --version 1.5.14
}

Write-Host "Bootstrap complete. Run: cargo tauri dev"

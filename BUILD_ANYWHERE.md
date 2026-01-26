# Build Evidify (Clinical + Forensic + EDU) on Any Computer

This repo is a **local-first, offline-capable** desktop app built with:

* **Frontend:** Vite + React + TypeScript (in `frontend/`)
* **Desktop shell/backend:** Rust + Tauri (in `src-tauri/`)

The quickest path to a clean build is to **pin toolchains**:

* Node.js: **20.x LTS**
* Rust: **1.78.x** (known-compatible with `tauri-cli` v1.5.x)

This eliminates the two common failure modes you hit in the past:

* Node 24+ breaking older toolchains
* Rust 1.90+ breaking older dependencies used by the Tauri CLI

---

## 1) Prerequisites

### macOS

1. Install Homebrew (if needed)
2. Install Node 20
3. Install rustup + Rust toolchain

```bash
brew install node@20
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
rustup toolchain install 1.78.0
```

### Windows (PowerShell)

1. Install Node 20 LTS (installer) or with winget
2. Install Rust via rustup
3. Install MSVC build tools (Visual Studio Build Tools)

```powershell
winget install OpenJS.NodeJS.LTS
winget install Rustlang.Rustup
rustup toolchain install 1.78.0
```

---

## 2) Pin toolchains for this repo

From the repo root:

```bash
cd evidify-v9

# Pin Rust for this repo only
rustup override set 1.78.0

# Confirm
rustc --version
node --version
```

If you use `nvm`:

```bash
nvm install 20
nvm use 20
```

---

## 3) Install dependencies

### Frontend

```bash
cd frontend
npm ci
npm run build
cd ..
```

---

## 4) Install Tauri CLI (if missing)

Evidify uses the Cargo subcommand `cargo tauri`.

```bash
cargo install tauri-cli --version 1.5.14
```

If `cargo install` fails, confirm you pinned Rust 1.78.0 (above), then retry.

---

## 5) Run in dev mode

```bash
cargo tauri dev
```

---

## 6) Build installable artifacts

```bash
cargo tauri build
```

* macOS outputs: `src-tauri/target/release/bundle/dmg` and/or `.app`
* Windows outputs: `src-tauri/target/release/bundle/msi`

---

## 7) Where the modules live

* Clinical: `frontend/src/App.tsx` + clinical screens and backend commands
* Forensic: `frontend/src/components/ForensicWorkspace.tsx` + `verification/`
* EDU: `frontend/src/components/EduWorkspace.tsx` + `docs/edu/`

---

## 8) Sanity checks

* `npm run build` passes with no TypeScript errors
* `cargo tauri dev` launches and you can open:
  * Forensic workspace
  * EDU workspace
* `cargo tauri build` completes and produces bundle artifacts

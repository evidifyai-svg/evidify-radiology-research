# Evidify v4 - Local-First Clinical Documentation Platform

## Security Architecture (v4 - Contradictions Resolved)

**Single Source of Truth:** All security claims are in `SPEC-v4.md`. No separate security documents.

This is a security-hardened clinical documentation platform that addresses all issues from enterprise security reviews:

| Issue | v4 Resolution |
|-------|---------------|
| Network statement contradictions | Two explicit modes: Enterprise (fully offline) vs Default (optional updates) |
| SOC 2 overclaim | "SOC 2-aligned pack provided; not certified (no servers)" |
| Ollama auth vapor | Removed all fake auth; explicit same-trust-zone model |
| CSP unsafe-inline | Documented compensating controls; backlog item to remove |
| Full paths in audit | Path hashes only (PHI risk) |
| Crash hygiene unclear | Product vs customer controls explicitly separated |

## Security Properties (Verifiable)

See SPEC-v4.md Section 8 "Claims Ledger" for complete test procedures.

| Claim | Test | Invalidated By |
|-------|------|----------------|
| No PHI network egress | `lsof -i -P \| grep evidify` shows only localhost | Enabling custom integrations |
| Passphrase required each session | Close app → reopen → prompt | N/A (hardcoded) |
| Audit chain integrity | `evidify --verify-audit` | Manual DB tampering (detected) |
| No full paths in audit | Export audit, grep for "/" | N/A (hardcoded) |
| Ollama prompts not logged | grep storage for test PHI | N/A (hardcoded) |

## Prerequisites

1. **Rust 1.80+** - https://rustup.rs
2. **Node.js 18+** - https://nodejs.org
3. **Tauri CLI** - `cargo install tauri-cli`
4. **System dependencies** (Ubuntu/Debian):
   ```bash
   sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev librsvg2-dev
   ```

## Build Instructions

```bash
cd evidify-v9

# Install frontend dependencies
cd frontend && npm install && cd ..

# Development
cargo tauri dev

# Production build (signed)
cargo tauri build
```

## Project Structure

```
evidify-v9/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── crypto.rs       # Wrapped key model (Argon2id + AES-256-GCM)
│   │   ├── vault.rs        # SQLCipher-only storage
│   │   ├── ethics.rs       # Offset-based detection (no evidence storage)
│   │   ├── audit.rs        # PHI-impossible hash-chained logs
│   │   ├── ai.rs           # Ollama (same-trust-zone, no fake auth)
│   │   ├── export.rs       # OS-native path classification
│   │   ├── models.rs       # Data structures
│   │   └── commands.rs     # Tauri IPC
│   └── Cargo.toml
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.tsx         # Main application
│   │   └── lib/tauri.ts    # Type-safe API bindings
│   └── package.json
│
├── SPEC-v4.md              # Single source of truth (security, claims)
├── ROADMAP.md              # Version tiers and development plan
└── README.md
```

## Key Security Features

### Encryption
- **At rest**: SQLCipher (AES-256) for entire database
- **Key derivation**: Argon2id (m=64MB, t=3, p=4)
- **Key storage**: Wrapped key in OS keychain (passphrase required to unwrap)

### PHI Protection
- No PHI transmitted over network (verifiable via CSP + Rust layer)
- Local Ollama sees PHI but is authenticated and isolated
- Audit logs contain IDs only, never content
- Detection evidence reconstructed on demand from encrypted notes

### Export Controls
- OS-native cloud sync detection (xattr on macOS, registry on Windows)
- Symlink resolution before classification
- Enterprise mode: block unsafe sinks, no override
- Solo mode: warn with attestation override

### Audit Trail
- Typed, PHI-impossible schema
- Hash-chained entries for tamper detection
- External verification tool

## AI Integration

Requires Ollama running locally:

```bash
ollama pull qwen2.5:7b-instruct
```

**Ollama Security Model (SPEC-v4.md Section 3):**

Ollama is treated as **same-trust-zone**. We do NOT authenticate Ollama - there is no `/api/verify`, no mutual auth token, no custom handshake. Security boundary is the host OS.

**PHI-in-LLM Containment:**
- Prompts/responses are NOT logged (hardcoded in ai.rs)
- Model hashes verified against allowlist
- User responsible for Ollama network isolation

**Hardening (Customer Responsibility):**
```bash
# Run Ollama in network-isolated container
docker run --network=none ollama/ollama
```

## Procurement Readiness

See `SPEC-v4.md` for:
- Network-capable component matrix (Section 2.1)
- Claims ledger with test procedures (Section 8)
- Security questionnaire responses (Section 10)
- Crash hygiene (Section 6)
- CSP compensating controls (Section 2.4)

**Note:** We do NOT claim SOC 2 certification. We provide SOC 2-aligned control documentation.

## License

Proprietary - Evidify

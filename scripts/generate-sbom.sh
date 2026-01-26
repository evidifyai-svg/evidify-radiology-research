#!/bin/bash
# Evidify SBOM (Software Bill of Materials) Generator
#
# Generates CycloneDX format SBOM for:
#   - Rust dependencies (from Cargo.lock)
#   - Node.js dependencies (from package-lock.json)
#   - System dependencies (documented manually)
#
# Prerequisites:
#   - cargo-sbom: cargo install cargo-sbom
#   - cyclonedx-npm: npm install -g @cyclonedx/cyclonedx-npm
#   - jq: brew install jq (macOS) / apt install jq (Linux)
#
# Usage:
#   ./scripts/generate-sbom.sh [version]
#
# Output:
#   - evidify-sbom-{version}.json (merged CycloneDX SBOM)
#   - evidify-sbom-{version}.csv (human-readable summary)

set -e

# ============================================
# Configuration
# ============================================

VERSION="${1:-$(cat src-tauri/Cargo.toml | grep '^version' | head -1 | cut -d'"' -f2)}"
OUTPUT_DIR="sbom"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# Prerequisite Checks
# ============================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing=()
    
    if ! command -v cargo-sbom &> /dev/null; then
        missing+=("cargo-sbom (install: cargo install cargo-sbom)")
    fi
    
    # Check for cyclonedx-npm or @cyclonedx/cdxgen
    if ! command -v cyclonedx-npm &> /dev/null && ! npx @cyclonedx/cyclonedx-npm --version &> /dev/null 2>&1; then
        missing+=("cyclonedx-npm (install: npm install -g @cyclonedx/cyclonedx-npm)")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing+=("jq (install: brew install jq)")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing prerequisites:"
        for m in "${missing[@]}"; do
            echo "  - $m"
        done
        exit 1
    fi
    
    log_info "All prerequisites satisfied"
}

# ============================================
# SBOM Generation
# ============================================

generate_rust_sbom() {
    log_info "Generating Rust SBOM..."
    
    cd "$PROJECT_ROOT/src-tauri"
    
    # Generate using cargo-sbom
    cargo sbom --output-format cyclonedx-json > "$PROJECT_ROOT/$OUTPUT_DIR/sbom-rust.json" 2>/dev/null || {
        # Fallback: use cargo metadata and convert
        log_warn "cargo-sbom failed, using fallback method..."
        cargo metadata --format-version=1 | jq '{
            bomFormat: "CycloneDX",
            specVersion: "1.4",
            version: 1,
            metadata: {
                timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
                tools: [{
                    vendor: "cargo",
                    name: "cargo-metadata",
                    version: "1.0"
                }],
                component: {
                    type: "application",
                    name: "evidify-backend",
                    version: .packages[0].version
                }
            },
            components: [.packages[] | {
                type: "library",
                name: .name,
                version: .version,
                purl: "pkg:cargo/\(.name)@\(.version)",
                licenses: (if .license then [{license: {id: .license}}] else [] end),
                externalReferences: (if .repository then [{type: "vcs", url: .repository}] else [] end)
            }]
        }' > "$PROJECT_ROOT/$OUTPUT_DIR/sbom-rust.json"
    }
    
    cd "$PROJECT_ROOT"
    log_info "Rust SBOM generated: $OUTPUT_DIR/sbom-rust.json"
}

generate_node_sbom() {
    log_info "Generating Node.js SBOM..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Generate using cyclonedx-npm
    if command -v cyclonedx-npm &> /dev/null; then
        cyclonedx-npm --output-format json --output-file "$PROJECT_ROOT/$OUTPUT_DIR/sbom-node.json" 2>/dev/null || true
    else
        npx @cyclonedx/cyclonedx-npm --output-format json --output-file "$PROJECT_ROOT/$OUTPUT_DIR/sbom-node.json" 2>/dev/null || {
            log_warn "cyclonedx-npm failed, using fallback method..."
            # Fallback: parse package-lock.json directly
            cat package-lock.json | jq '{
                bomFormat: "CycloneDX",
                specVersion: "1.4",
                version: 1,
                metadata: {
                    timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
                    component: {
                        type: "application",
                        name: "evidify-frontend",
                        version: .version
                    }
                },
                components: [.packages | to_entries[] | select(.key != "") | {
                    type: "library",
                    name: (.key | split("node_modules/")[-1]),
                    version: .value.version,
                    purl: "pkg:npm/\(.key | split("node_modules/")[-1])@\(.value.version)"
                }]
            }' > "$PROJECT_ROOT/$OUTPUT_DIR/sbom-node.json"
        }
    fi
    
    cd "$PROJECT_ROOT"
    log_info "Node.js SBOM generated: $OUTPUT_DIR/sbom-node.json"
}

generate_system_sbom() {
    log_info "Generating system dependencies SBOM..."
    
    cat > "$PROJECT_ROOT/$OUTPUT_DIR/sbom-system.json" << 'EOF'
{
    "bomFormat": "CycloneDX",
    "specVersion": "1.4",
    "version": 1,
    "metadata": {
        "component": {
            "type": "application",
            "name": "evidify-system-deps",
            "version": "1.0.0"
        }
    },
    "components": [
        {
            "type": "application",
            "name": "SQLCipher",
            "version": "4.5.x",
            "description": "Encrypted SQLite database",
            "purl": "pkg:generic/sqlcipher@4.5",
            "licenses": [{"license": {"id": "BSD-3-Clause"}}],
            "externalReferences": [{"type": "website", "url": "https://www.zetetic.net/sqlcipher/"}]
        },
        {
            "type": "application",
            "name": "Ollama",
            "version": "0.1.x",
            "description": "Local LLM runtime (optional, user-installed)",
            "purl": "pkg:generic/ollama@0.1",
            "licenses": [{"license": {"id": "MIT"}}],
            "externalReferences": [{"type": "website", "url": "https://ollama.ai/"}]
        },
        {
            "type": "application",
            "name": "whisper.cpp",
            "version": "1.x",
            "description": "Local speech-to-text (optional, user-installed)",
            "purl": "pkg:generic/whisper-cpp@1",
            "licenses": [{"license": {"id": "MIT"}}],
            "externalReferences": [{"type": "website", "url": "https://github.com/ggerganov/whisper.cpp"}]
        },
        {
            "type": "framework",
            "name": "Tauri",
            "version": "1.x",
            "description": "Desktop application framework",
            "purl": "pkg:cargo/tauri@1",
            "licenses": [{"license": {"id": "MIT"}}],
            "externalReferences": [{"type": "website", "url": "https://tauri.app/"}]
        }
    ]
}
EOF
    
    log_info "System SBOM generated: $OUTPUT_DIR/sbom-system.json"
}

merge_sboms() {
    log_info "Merging SBOMs..."
    
    local output_file="$PROJECT_ROOT/$OUTPUT_DIR/evidify-sbom-$VERSION.json"
    
    jq -s '{
        bomFormat: "CycloneDX",
        specVersion: "1.4",
        serialNumber: "urn:uuid:\(now | tostring | gsub("[^0-9]"; "") | .[0:8])-\(.[8:12])-\(.[12:16])-\(.[16:20])-\(.[20:32])",
        version: 1,
        metadata: {
            timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
            tools: [{
                vendor: "Evidify",
                name: "sbom-generator",
                version: "1.0.0"
            }],
            component: {
                type: "application",
                "bom-ref": "evidify",
                name: "Evidify",
                version: $version,
                description: "Local-first clinical documentation platform for behavioral health",
                licenses: [{license: {id: "Proprietary"}}],
                externalReferences: [{type: "website", url: "https://evidify.ai"}]
            }
        },
        components: [.[].components[]?] | unique_by(.name + "@" + .version)
    }' --arg version "$VERSION" \
        "$PROJECT_ROOT/$OUTPUT_DIR/sbom-rust.json" \
        "$PROJECT_ROOT/$OUTPUT_DIR/sbom-node.json" \
        "$PROJECT_ROOT/$OUTPUT_DIR/sbom-system.json" \
        > "$output_file"
    
    log_info "Merged SBOM: $output_file"
    
    # Generate summary CSV
    local csv_file="$PROJECT_ROOT/$OUTPUT_DIR/evidify-sbom-$VERSION.csv"
    
    echo "name,version,type,purl,license" > "$csv_file"
    jq -r '.components[] | [.name, .version, .type, .purl, (.licenses[0].license.id // "Unknown")] | @csv' \
        "$output_file" >> "$csv_file"
    
    log_info "Summary CSV: $csv_file"
    
    # Print summary
    local component_count=$(jq '.components | length' "$output_file")
    log_info "Total components: $component_count"
}

# ============================================
# License Analysis
# ============================================

analyze_licenses() {
    log_info "Analyzing licenses..."
    
    local sbom_file="$PROJECT_ROOT/$OUTPUT_DIR/evidify-sbom-$VERSION.json"
    
    echo ""
    echo "License Summary:"
    echo "================"
    
    jq -r '[.components[].licenses[0].license.id // "Unknown"] | group_by(.) | map({license: .[0], count: length}) | sort_by(-.count) | .[] | "\(.license): \(.count)"' \
        "$sbom_file"
    
    echo ""
    
    # Check for problematic licenses
    local problematic=$(jq -r '.components[] | select(.licenses[0].license.id | test("GPL|AGPL|SSPL"; "i")) | .name' "$sbom_file" 2>/dev/null || true)
    
    if [ -n "$problematic" ]; then
        log_warn "Components with copyleft licenses (review required):"
        echo "$problematic"
    else
        log_info "No copyleft licenses detected"
    fi
}

# ============================================
# Main
# ============================================

main() {
    cd "$PROJECT_ROOT"
    
    log_info "==========================================="
    log_info "Evidify SBOM Generator"
    log_info "==========================================="
    log_info "Version: $VERSION"
    log_info "Output: $OUTPUT_DIR/"
    log_info "==========================================="
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    check_prerequisites
    
    generate_rust_sbom
    generate_node_sbom
    generate_system_sbom
    merge_sboms
    analyze_licenses
    
    log_info "==========================================="
    log_info "SBOM generation complete!"
    log_info "==========================================="
    log_info "Files:"
    log_info "  - $OUTPUT_DIR/evidify-sbom-$VERSION.json (CycloneDX)"
    log_info "  - $OUTPUT_DIR/evidify-sbom-$VERSION.csv (Summary)"
    log_info "==========================================="
}

main "$@"

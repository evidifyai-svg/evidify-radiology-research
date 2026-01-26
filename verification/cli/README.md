# Evidify CLI - Headless Pack Runner

Runs test packs programmatically without UI for CI integration.

## Usage

### Run a Test Pack

```bash
node evidify-cli.cjs run-pack <pack-id> --scenario PASS|FAIL --export <output-dir>
```

### Examples

```bash
# Generate PASS export
node evidify-cli.cjs run-pack CC-001 --scenario PASS --export out/pass/

# Generate FAIL export  
node evidify-cli.cjs run-pack CC-001 --scenario FAIL --export out/fail/

# List available packs
node evidify-cli.cjs list-packs
```

### Output Structure

```
<output-dir>/
├── canonical/
│   └── canonical.json
├── audit/
│   ├── audit.log
│   └── audit_digest.json
├── verification/
│   ├── gate_report.canon.json
│   └── gate_report.meta.json
└── manifest.json
```

## CI Integration

```bash
#!/bin/bash
set -e

# Run pack
node evidify-cli.cjs run-pack CC-001 --scenario PASS --export out/

# Verify
node ../verifier/verify-v1.1.cjs out/ --golden ../../packs/CC-001/golden/gate_report.canon.json

echo "CI PASS"
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | PASS (all gates pass) |
| 1 | FAIL (blocking violations) |
| 2 | Error |

## Available Packs

| Pack ID | Description | Scenarios |
|---------|-------------|-----------|
| CC-001 | Competency Case (Criminal) | PASS, FAIL |

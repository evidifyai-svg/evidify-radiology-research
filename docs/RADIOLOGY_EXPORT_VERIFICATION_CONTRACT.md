# Radiology Export Verification Contract (v1.0)

This document defines the verification contract for radiology export packs.

## Required files

Every radiology export pack **must** include the following files:

- `export_manifest.json`
- `ledger.json`
- `events.jsonl`
- `trial_manifest.json`
- `verifier_output.json`
- `derived_metrics.csv`
- `codebook.md`

`_DEBUG_SENTINEL.txt` is **optional** (present in some packs for debugging).

## Verification checks

The radiology verifier (`tools/radiology-verifier/verify-v1.0.cjs`) performs:

### Required file presence
All required files above must exist. Optional files are reported as warnings when absent.

### Manifest integrity
`export_manifest.json` contains `entries[]` with:

- `path`: relative file path
- `bytes`: file size in bytes
- `sha256`: lowercase hex SHA-256

The verifier checks that each entry exists, the file size matches `bytes`, and the SHA-256 matches `sha256`.

### Ledger integrity
`ledger.json` is an array of entries with:

- `seq` (strictly increments by 1, starting at 1)
- `previousHash` (first entry must be 64 zeros)
- `chainHash`

Chain integrity requires:

1. `seq` strictly increments by 1, starting at 1.
2. `previousHash` equals the prior entry’s `chainHash` (genesis is 64 zeros).
3. `chainHash` equals SHA-256 of the canonical preimage string:

```
seq|eventId|eventType|timestamp|contentHash|previousHash
```

For compatibility with existing packs, the verifier **warns** (but does not fail) if
the legacy preimage format is detected:

```
previousHash|contentHash|timestamp
```

### Verifier output shape (warn-only)
If `verifier_output.json` is present, the verifier checks for:

- `result` (string)
- `timestamp` (string)
- `verifierVersion` (string)
- `checks` (array of `{ name, status, message }`)

Missing keys or invalid JSON are reported as warnings.

## Not claimed

The radiology verifier **does not** claim:

- Independent timestamp trust (timestamps are generated client-side).
- External notarization or third-party attestation.
- Clinical or regulatory validity of the data or interpretation.
- Completeness of any source dataset beyond what the export includes.

## Example commands

```bash
node tools/radiology-verifier/verify-v1.0.cjs artifacts/export_unpack
node tools/radiology-verifier/verify-v1.0.cjs artifacts/export_unpack --json
```

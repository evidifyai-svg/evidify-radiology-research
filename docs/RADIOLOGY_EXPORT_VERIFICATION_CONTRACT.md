# Radiology Export Verification Contract (v1.0)

This contract defines the minimum, deterministic checks performed by the
radiology export verifier (`tools/radiology-verifier/verify-v1.0.cjs`).
It is scoped to **offline validation of a single export pack directory**.

## Required Files

The verifier **fails** if any required file is missing:

- `export_manifest.json`
- `ledger.json`
- `events.jsonl`

## Optional Files (warn-only)

Missing optional files produce warnings only:

- `derived_metrics.csv`
- `codebook.md`
- `trial_manifest.json`
- `verifier_output.json`

## Checks Performed (v1.0)

1. **File presence** for required and optional files.
2. **Parseability** of `export_manifest.json` (JSON parse + `entries[]` array).
3. **Manifest integrity** when `entries[]` include `{ path, sha256, bytes }` fields.
4. **Parseability** of `ledger.json` (JSON array).
5. **Ledger chain integrity** using the same structured hash input as the exporter
   (`seq`, `previousHash`, `eventId`, `timestamp`, `contentHash`).
6. **Stream parsing** of `events.jsonl` (JSON per non-empty line).

The verifier emits a human-readable report by default and JSON output with
`--json`.

## Explicitly NOT Claimed

The verifier does **not** claim or validate:

- Trustworthiness of timestamps or clock sources.
- Cryptographic signatures, key custody, or identity of the exporter.
- Semantic correctness of event payloads or derived metrics.
- Content hash correctness against event payloads (only ledger chain integrity).
- Completeness of the dataset beyond the required filenames.
- Any forensic chain-of-custody beyond the checks listed above.

## Implementation Notes

- Ledger chain hashing is a JavaScript port of the structured hashing logic used in
  `src/lib/ExportPack.ts` (TypeScript), to keep the verifier self-contained.

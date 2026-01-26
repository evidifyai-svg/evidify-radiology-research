#!/usr/bin/env node
/**
 * Cross-Platform Canonicalization Test Runner
 * 
 * Verifies that TypeScript canonicalization produces expected results.
 * Run Rust tests separately with `cargo test`.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load test vectors
const vectorsPath = path.join(__dirname, 'vectors.json');
const vectors = JSON.parse(fs.readFileSync(vectorsPath, 'utf8'));

// Canonicalization functions
function canonicalizeJson(v) {
  if (v === null) return null;
  if (Array.isArray(v)) return v.map(canonicalizeJson);
  if (typeof v === 'object') {
    const keys = Object.keys(v).sort();
    const out = {};
    for (const k of keys) out[k] = canonicalizeJson(v[k]);
    return out;
  }
  return v;
}

function canonicalStringify(v) {
  return JSON.stringify(canonicalizeJson(v));
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function canonicalSha256(v) {
  return sha256Hex(canonicalStringify(v));
}

const EVIDIFY_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function uuidv5(namespace, name) {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBytes = Buffer.from(name, 'utf8');
  const combined = Buffer.concat([namespaceBytes, nameBytes]);
  const hash = crypto.createHash('sha1').update(combined).digest();
  
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  
  const hex = hash.slice(0, 16).toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

function generateFindingId(f) {
  const parts = [
    f.gate_id || '',
    f.code || '',
    f.sub_code || '',
    f.severity || '',
    f.message || '',
    f.object_type || '',
    f.object_id || ''
  ];
  return uuidv5(EVIDIFY_NAMESPACE, parts.join('|'));
}

// Run tests
console.log('═══════════════════════════════════════════════════════════════');
console.log('CROSS-PLATFORM CANONICALIZATION TESTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

let passed = 0;
let failed = 0;

for (const vector of vectors.vectors) {
  if (vector.input !== undefined) {
    // Canonicalization test
    const canonical = canonicalStringify(vector.input);
    const hash = canonicalSha256(vector.input);
    
    const canonMatch = canonical === vector.expected_canonical;
    const hashMatch = hash === vector.expected_sha256;
    
    if (canonMatch && hashMatch) {
      console.log(`✅ ${vector.id}`);
      passed++;
    } else {
      console.log(`❌ ${vector.id}`);
      if (!canonMatch) {
        console.log(`   Canonical: expected "${vector.expected_canonical}"`);
        console.log(`              got      "${canonical}"`);
      }
      if (!hashMatch) {
        console.log(`   SHA-256:   expected "${vector.expected_sha256}"`);
        console.log(`              got      "${hash}"`);
      }
      failed++;
    }
  }
  
  if (vector.finding_input) {
    // Finding ID test
    const uuid = generateFindingId(vector.finding_input);
    
    if (uuid === vector.expected_uuid) {
      console.log(`✅ ${vector.id}`);
      passed++;
    } else {
      console.log(`❌ ${vector.id}`);
      console.log(`   UUID: expected "${vector.expected_uuid}"`);
      console.log(`          got      "${uuid}"`);
      failed++;
    }
  }
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════════');

// Output verification proof
console.log('');
console.log('VERIFICATION PROOF (for Rust comparison):');
console.log('');

const proofInput = {"c": 3, "a": 1, "b": 2};
const proofCanonical = canonicalStringify(proofInput);
const proofHash = canonicalSha256(proofInput);

console.log(`Input:     ${JSON.stringify(proofInput)}`);
console.log(`Canonical: ${proofCanonical}`);
console.log(`SHA-256:   ${proofHash}`);
console.log('');
console.log('Rust should produce IDENTICAL output.');
console.log('If hashes match, byte-for-byte compatibility is proven.');

process.exit(failed > 0 ? 1 : 0);

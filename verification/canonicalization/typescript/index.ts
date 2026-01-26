/**
 * Evidify Canonicalization Library (TypeScript)
 * 
 * Provides deterministic JSON serialization and hashing for
 * court-defensible audit trails.
 */

import { createHash } from 'crypto';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/**
 * Recursively canonicalize a JSON value.
 * 
 * - Objects: keys sorted lexicographically
 * - Arrays: preserved in original order (must be pre-sorted upstream)
 * - Primitives: unchanged
 */
export function canonicalizeJson(v: Json): Json {
  if (v === null) return null;
  if (Array.isArray(v)) return v.map(canonicalizeJson);
  if (typeof v === 'object') {
    const keys = Object.keys(v).sort();
    const out: Record<string, Json> = {};
    for (const k of keys) out[k] = canonicalizeJson(v[k]);
    return out;
  }
  return v;
}

/**
 * Serialize a JSON value to canonical string (minified, sorted keys).
 */
export function canonicalStringify(v: Json): string {
  return JSON.stringify(canonicalizeJson(v));
}

/**
 * Compute SHA-256 hash of a string, returning lowercase hex.
 */
export function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * Compute canonical SHA-256 of a JSON value.
 */
export function canonicalSha256(v: Json): string {
  return sha256Hex(canonicalStringify(v));
}

/**
 * Evidify namespace for finding IDs (DNS namespace UUID)
 */
export const EVIDIFY_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Generate UUIDv5 from namespace and name.
 */
export function uuidv5(namespace: string, name: string): string {
  const crypto = require('crypto');
  
  // Parse namespace UUID
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBytes = Buffer.from(name, 'utf8');
  
  // Concatenate and hash with SHA-1
  const combined = Buffer.concat([namespaceBytes, nameBytes]);
  const hash = crypto.createHash('sha1').update(combined).digest();
  
  // Set version (5) and variant bits
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  
  // Format as UUID
  const hex = hash.slice(0, 16).toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

/**
 * Finding interface for ID generation
 */
export interface Finding {
  gate_id: string;
  code: string;
  sub_code: string;
  severity: string;
  message: string;
  object?: {
    type: string;
    id: string;
  };
}

/**
 * Generate stable finding ID from finding object.
 */
export function generateFindingId(finding: Finding): string {
  const parts = [
    finding.gate_id || '',
    finding.code || '',
    finding.sub_code || '',
    finding.severity || '',
    finding.message || '',
    finding.object?.type || '',
    finding.object?.id || ''
  ];
  return uuidv5(EVIDIFY_NAMESPACE, parts.join('|'));
}

// Export for CommonJS compatibility
module.exports = {
  canonicalizeJson,
  canonicalStringify,
  sha256Hex,
  canonicalSha256,
  EVIDIFY_NAMESPACE,
  uuidv5,
  generateFindingId
};

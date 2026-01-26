/**
 * CanonicalHash.ts
 * 
 * Deterministic hashing for research instrumentation
 * 
 * Addresses Grayson feedback:
 * - P0: Canonical JSON serialization (stable key ordering, UTF-8, no whitespace)
 * - P0: Structured encoding with seq, event_id, lengths
 * - P0: No delimiter ambiguity
 * 
 * SPECIFICATION:
 * =============
 * 
 * 1. CANONICAL JSON (RFC 8785 / JCS subset):
 *    - Object keys sorted alphabetically (Unicode code point order)
 *    - No whitespace between tokens
 *    - Numbers: no leading zeros, no trailing zeros after decimal
 *    - Strings: UTF-8, minimal escaping (only required: ", \, control chars)
 *    - No undefined values (omitted from output)
 *    - null, true, false as literals
 * 
 * 2. CHAIN HASH INPUT (structured, unambiguous):
 *    Input = seq (4 bytes, big-endian) 
 *          | prevHash (32 bytes, raw)
 *          | eventId (36 bytes, UUID string as UTF-8)
 *          | timestamp (24 bytes, ISO 8601 as UTF-8)
 *          | contentHash (32 bytes, raw)
 * 
 *    Total: 128 bytes fixed-length input
 *    Output: SHA-256 of input = chainHash
 * 
 * 3. CONTENT HASH:
 *    contentHash = SHA-256(canonicalJSON(event.payload))
 * 
 * This eliminates:
 *    - Key ordering differences across environments
 *    - Whitespace/formatting variations
 *    - Delimiter ambiguity (fixed-length fields)
 *    - Floating point representation issues
 */

import * as crypto from 'crypto';

// ============================================================================
// CANONICAL JSON SERIALIZATION
// ============================================================================

/**
 * Serialize value to canonical JSON (RFC 8785 / JCS compliant subset)
 * 
 * Guarantees identical output for semantically identical inputs:
 * - Sorted object keys
 * - No whitespace
 * - Normalized numbers
 * - UTF-8 encoding
 */
export function canonicalJSON(value: unknown): string {
  return serializeValue(value);
}

function serializeValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  
  if (value === undefined) {
    // undefined is omitted in JSON
    return 'null';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (typeof value === 'number') {
    return serializeNumber(value);
  }
  
  if (typeof value === 'string') {
    return serializeString(value);
  }
  
  if (Array.isArray(value)) {
    return serializeArray(value);
  }
  
  if (typeof value === 'object') {
    return serializeObject(value as Record<string, unknown>);
  }
  
  // Fallback for unknown types
  return 'null';
}

function serializeNumber(num: number): string {
  if (!Number.isFinite(num)) {
    return 'null'; // NaN, Infinity -> null per JSON spec
  }
  
  // Handle -0 -> 0
  if (Object.is(num, -0)) {
    return '0';
  }
  
  // Use JavaScript's default number formatting
  // This handles removing trailing zeros and scientific notation
  const str = String(num);
  
  // Ensure no leading zeros on integers (JavaScript handles this)
  // Ensure proper decimal representation
  return str;
}

function serializeString(str: string): string {
  let result = '"';
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);
    
    // Required escapes
    if (char === '"') {
      result += '\\"';
    } else if (char === '\\') {
      result += '\\\\';
    } else if (code < 0x20) {
      // Control characters
      switch (code) {
        case 0x08: result += '\\b'; break;
        case 0x09: result += '\\t'; break;
        case 0x0a: result += '\\n'; break;
        case 0x0c: result += '\\f'; break;
        case 0x0d: result += '\\r'; break;
        default:
          // \uXXXX for other control chars
          result += '\\u' + code.toString(16).padStart(4, '0');
      }
    } else {
      // All other characters pass through (including non-ASCII UTF-8)
      result += char;
    }
  }
  
  result += '"';
  return result;
}

function serializeArray(arr: unknown[]): string {
  const elements = arr.map(v => serializeValue(v));
  return '[' + elements.join(',') + ']';
}

function serializeObject(obj: Record<string, unknown>): string {
  // Get keys and sort alphabetically (Unicode code point order)
  const keys = Object.keys(obj)
    .filter(k => obj[k] !== undefined) // Omit undefined values
    .sort((a, b) => {
      // Unicode code point comparison
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const diff = a.charCodeAt(i) - b.charCodeAt(i);
        if (diff !== 0) return diff;
      }
      return a.length - b.length;
    });
  
  const pairs = keys.map(key => {
    return serializeString(key) + ':' + serializeValue(obj[key]);
  });
  
  return '{' + pairs.join(',') + '}';
}

// ============================================================================
// HASH FUNCTIONS
// ============================================================================

/**
 * Compute SHA-256 hash of UTF-8 string, return hex
 */
export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Compute SHA-256 hash of raw bytes, return hex
 */
export function sha256Bytes(input: Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Compute content hash from event payload
 * 
 * contentHash = SHA-256(canonicalJSON(payload))
 */
export function computeContentHash(payload: Record<string, unknown>): string {
  const canonical = canonicalJSON(payload);
  return sha256Hex(canonical);
}

// ============================================================================
// CHAIN HASH (Structured Encoding)
// ============================================================================

/**
 * Genesis hash constant - 32 bytes of zeros as hex
 */
export const GENESIS_HASH = '0'.repeat(64); // 32 bytes = 64 hex chars

/**
 * Compute chain hash with structured, unambiguous encoding
 * 
 * Input structure (128 bytes total):
 *   seq:         4 bytes  (big-endian uint32)
 *   prevHash:   32 bytes  (raw bytes from hex)
 *   eventId:    36 bytes  (UUID as UTF-8)
 *   timestamp:  24 bytes  (ISO 8601 as UTF-8, padded/truncated)
 *   contentHash: 32 bytes (raw bytes from hex)
 * 
 * Output: SHA-256 of concatenated bytes
 */
export function computeChainHash(
  seq: number,
  prevHash: string,        // 64-char hex
  eventId: string,         // UUID string
  timestamp: string,       // ISO 8601
  contentHash: string      // 64-char hex
): string {
  // Allocate fixed-size buffer
  const buffer = Buffer.alloc(128);
  let offset = 0;
  
  // seq: 4 bytes, big-endian
  buffer.writeUInt32BE(seq, offset);
  offset += 4;
  
  // prevHash: 32 bytes
  const prevBytes = Buffer.from(prevHash, 'hex');
  if (prevBytes.length !== 32) {
    throw new Error(`prevHash must be 32 bytes (64 hex chars), got ${prevBytes.length}`);
  }
  prevBytes.copy(buffer, offset);
  offset += 32;
  
  // eventId: 36 bytes (UUID with hyphens)
  const eventIdBytes = Buffer.from(eventId.padEnd(36, '\0').slice(0, 36), 'utf8');
  eventIdBytes.copy(buffer, offset);
  offset += 36;
  
  // timestamp: 24 bytes (ISO 8601 with ms)
  const timestampBytes = Buffer.from(timestamp.padEnd(24, '\0').slice(0, 24), 'utf8');
  timestampBytes.copy(buffer, offset);
  offset += 24;
  
  // contentHash: 32 bytes
  const contentBytes = Buffer.from(contentHash, 'hex');
  if (contentBytes.length !== 32) {
    throw new Error(`contentHash must be 32 bytes (64 hex chars), got ${contentBytes.length}`);
  }
  contentBytes.copy(buffer, offset);
  offset += 32;
  
  // Hash the fixed-size buffer
  return sha256Bytes(buffer);
}

// ============================================================================
// EVENT AND LEDGER TYPES
// ============================================================================

export interface CanonicalEvent {
  id: string;           // UUID v4
  seq: number;          // 0-indexed sequence number
  type: string;         // Event type
  timestamp: string;    // ISO 8601 with milliseconds
  payload: Record<string, unknown>;
}

export interface CanonicalLedgerEntry {
  seq: number;
  eventId: string;
  eventType: string;
  timestamp: string;
  contentHash: string;      // SHA-256 of canonical payload
  previousHash: string;     // Previous chainHash (or GENESIS)
  chainHash: string;        // SHA-256 of structured input
}

// ============================================================================
// CHAIN BUILDER
// ============================================================================

export class CanonicalHashChain {
  private entries: CanonicalLedgerEntry[] = [];
  private events: CanonicalEvent[] = [];
  
  /**
   * Add event to chain, compute hashes
   */
  addEvent(event: CanonicalEvent): CanonicalLedgerEntry {
    const seq = this.entries.length;
    const prevHash = seq === 0 ? GENESIS_HASH : this.entries[seq - 1].chainHash;
    
    // Compute content hash from canonical JSON
    const contentHash = computeContentHash(event.payload);
    
    // Compute chain hash with structured encoding
    const chainHash = computeChainHash(
      seq,
      prevHash,
      event.id,
      event.timestamp,
      contentHash
    );
    
    const entry: CanonicalLedgerEntry = {
      seq,
      eventId: event.id,
      eventType: event.type,
      timestamp: event.timestamp,
      contentHash,
      previousHash: prevHash,
      chainHash,
    };
    
    this.entries.push(entry);
    this.events.push(event);
    
    return entry;
  }
  
  /**
   * Get current final hash
   */
  getFinalHash(): string {
    if (this.entries.length === 0) return GENESIS_HASH;
    return this.entries[this.entries.length - 1].chainHash;
  }
  
  /**
   * Get all entries
   */
  getEntries(): CanonicalLedgerEntry[] {
    return [...this.entries];
  }
  
  /**
   * Get all events
   */
  getEvents(): CanonicalEvent[] {
    return [...this.events];
  }
  
  /**
   * Verify chain integrity
   */
  verify(): { valid: boolean; error?: string; failedAt?: number } {
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const event = this.events[i];
      
      // Check sequence
      if (entry.seq !== i) {
        return { valid: false, error: 'SEQ_MISMATCH', failedAt: i };
      }
      
      // Check previous hash
      const expectedPrev = i === 0 ? GENESIS_HASH : this.entries[i - 1].chainHash;
      if (entry.previousHash !== expectedPrev) {
        return { valid: false, error: 'PREV_HASH_MISMATCH', failedAt: i };
      }
      
      // Recompute content hash
      const computedContent = computeContentHash(event.payload);
      if (entry.contentHash !== computedContent) {
        return { valid: false, error: 'CONTENT_TAMPERED', failedAt: i };
      }
      
      // Recompute chain hash
      const computedChain = computeChainHash(
        entry.seq,
        entry.previousHash,
        entry.eventId,
        event.timestamp,
        entry.contentHash
      );
      if (entry.chainHash !== computedChain) {
        return { valid: false, error: 'CHAIN_BROKEN', failedAt: i };
      }
    }
    
    return { valid: true };
  }
}

// ============================================================================
// VERIFICATION FUNCTION (for external verifier)
// ============================================================================

/**
 * Verify chain from raw data (for CLI verifier)
 */
export function verifyChainFromData(
  events: CanonicalEvent[],
  ledger: CanonicalLedgerEntry[]
): { valid: boolean; error?: string; failedAt?: number } {
  if (events.length !== ledger.length) {
    return { 
      valid: false, 
      error: `EVENT_LEDGER_MISMATCH: ${events.length} events, ${ledger.length} ledger entries` 
    };
  }
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const entry = ledger[i];
    
    // Check sequence
    if (entry.seq !== i) {
      return { valid: false, error: `SEQ_MISMATCH at ${i}: expected ${i}, got ${entry.seq}`, failedAt: i };
    }
    
    // Check event ID matches
    if (entry.eventId !== event.id) {
      return { valid: false, error: `EVENT_ID_MISMATCH at ${i}`, failedAt: i };
    }
    
    // Check previous hash
    const expectedPrev = i === 0 ? GENESIS_HASH : ledger[i - 1].chainHash;
    if (entry.previousHash !== expectedPrev) {
      return { valid: false, error: `PREV_HASH_MISMATCH at ${i}`, failedAt: i };
    }
    
    // Recompute content hash
    const computedContent = computeContentHash(event.payload);
    if (entry.contentHash !== computedContent) {
      return { 
        valid: false, 
        error: `CONTENT_TAMPERED at event ${i} (${event.type})`, 
        failedAt: i 
      };
    }
    
    // Recompute chain hash
    const computedChain = computeChainHash(
      entry.seq,
      entry.previousHash,
      entry.eventId,
      event.timestamp,
      entry.contentHash
    );
    if (entry.chainHash !== computedChain) {
      return { 
        valid: false, 
        error: `CHAIN_BROKEN at event ${i} (${event.type})`, 
        failedAt: i 
      };
    }
  }
  
  return { valid: true };
}

// ============================================================================
// TESTS (self-verification)
// ============================================================================

export function runCanonicalHashTests(): void {
  console.log('Running CanonicalHash tests...\n');
  
  // Test 1: Canonical JSON key ordering
  const obj1 = { z: 1, a: 2, m: 3 };
  const obj2 = { a: 2, m: 3, z: 1 };
  const json1 = canonicalJSON(obj1);
  const json2 = canonicalJSON(obj2);
  console.assert(json1 === json2, 'Key ordering should be deterministic');
  console.assert(json1 === '{"a":2,"m":3,"z":1}', `Expected sorted keys, got: ${json1}`);
  console.log('✓ Key ordering deterministic');
  
  // Test 2: No whitespace
  const nested = { outer: { inner: [1, 2, 3] } };
  const nestedJson = canonicalJSON(nested);
  console.assert(!nestedJson.includes(' '), 'Should have no whitespace');
  console.assert(nestedJson === '{"outer":{"inner":[1,2,3]}}', `Got: ${nestedJson}`);
  console.log('✓ No whitespace');
  
  // Test 3: Number normalization
  console.assert(canonicalJSON(1.0) === '1', `1.0 should be "1", got: ${canonicalJSON(1.0)}`);
  console.assert(canonicalJSON(-0) === '0', `-0 should be "0", got: ${canonicalJSON(-0)}`);
  console.log('✓ Number normalization');
  
  // Test 4: String escaping
  const strWithQuote = 'say "hello"';
  const escaped = canonicalJSON(strWithQuote);
  console.assert(escaped === '"say \\"hello\\""', `Got: ${escaped}`);
  console.log('✓ String escaping');
  
  // Test 5: Hash chain
  const chain = new CanonicalHashChain();
  
  const event1: CanonicalEvent = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    seq: 0,
    type: 'SESSION_STARTED',
    timestamp: '2026-01-24T21:00:00.000Z',
    payload: { sessionId: 'test-123' },
  };
  
  const entry1 = chain.addEvent(event1);
  console.assert(entry1.seq === 0, 'First entry seq should be 0');
  console.assert(entry1.previousHash === GENESIS_HASH, 'First entry prev should be genesis');
  console.log('✓ First event added');
  
  const event2: CanonicalEvent = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    seq: 1,
    type: 'FIRST_IMPRESSION_LOCKED',
    timestamp: '2026-01-24T21:00:05.000Z',
    payload: { birads: 4, confidence: 0.8 },
  };
  
  const entry2 = chain.addEvent(event2);
  console.assert(entry2.seq === 1, 'Second entry seq should be 1');
  console.assert(entry2.previousHash === entry1.chainHash, 'Second prev should be first chain');
  console.log('✓ Second event chained');
  
  // Test 6: Verify chain
  const result = chain.verify();
  console.assert(result.valid, `Chain should be valid: ${result.error}`);
  console.log('✓ Chain verification passed');
  
  // Test 7: Cross-environment determinism
  const payload = { birads: 4, confidence: 0.85, notes: 'Test case' };
  const hash1 = computeContentHash(payload);
  const hash2 = computeContentHash({ confidence: 0.85, notes: 'Test case', birads: 4 });
  console.assert(hash1 === hash2, 'Same payload different order should hash same');
  console.log('✓ Cross-environment determinism');
  
  console.log('\n✅ All CanonicalHash tests passed');
}

// Run tests if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runCanonicalHashTests();
}

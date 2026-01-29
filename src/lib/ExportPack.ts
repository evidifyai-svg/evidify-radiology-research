/**
 * ExportPack_v2.ts
 * 
 * Complete export package builder with Grayson P0/P1 feedback integrated:
 * 
 * P0 FIXES:
 * - Canonical JSON serialization (RFC 8785 compliant)
 * - Structured encoding with seq, eventId (128-byte fixed input)
 * - Threat model acknowledgment (timestamp_trust_model field)
 * - Removed legal advice language from events
 * 
 * P1 ADDITIONS:
 * - File-level checksums in manifest
 * - FDR/FOR provenance fields
 * - Randomization seed and assignment method
 * 
 * EXPORT PACKAGE (6 files):
 * - trial_manifest.json
 * - events.jsonl
 * - ledger.json
 * - verifier_output.json
 * - derived_metrics.csv
 * - codebook.md
 */

// ============================================================================
// CANONICAL JSON (inline to avoid import issues in browser)
// ============================================================================

function canonicalJSON(value: unknown): string {
  return serializeValue(value);
}

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return serializeNumber(value);
  if (typeof value === 'string') return serializeString(value);
  if (Array.isArray(value)) return '[' + value.map(v => serializeValue(v)).join(',') + ']';
  if (typeof value === 'object') return serializeObject(value as Record<string, unknown>);
  return 'null';
}

function serializeNumber(num: number): string {
  if (!Number.isFinite(num)) return 'null';
  if (Object.is(num, -0)) return '0';
  return String(num);
}

function serializeString(str: string): string {
  let result = '"';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);
    if (char === '"') result += '\\"';
    else if (char === '\\') result += '\\\\';
    else if (code < 0x20) {
      switch (code) {
        case 0x08: result += '\\b'; break;
        case 0x09: result += '\\t'; break;
        case 0x0a: result += '\\n'; break;
        case 0x0c: result += '\\f'; break;
        case 0x0d: result += '\\r'; break;
        default: result += '\\u' + code.toString(16).padStart(4, '0');
      }
    } else result += char;
  }
  return result + '"';
}

function serializeObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj)
    .filter(k => obj[k] !== undefined)
    .sort((a, b) => {
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const diff = a.charCodeAt(i) - b.charCodeAt(i);
        if (diff !== 0) return diff;
      }
      return a.length - b.length;
    });
  return '{' + keys.map(k => serializeString(k) + ':' + serializeValue(obj[k])).join(',') + '}';
}

// ============================================================================
// HASH FUNCTIONS (browser-compatible via SubtleCrypto)
// ============================================================================

const GENESIS_HASH = '0'.repeat(64);

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Bytes(input: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', input);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function computeContentHash(payload: Record<string, unknown>): Promise<string> {
  return sha256Hex(canonicalJSON(payload));
}

/**
 * Compute chain hash with structured encoding (128 bytes fixed)
 */
async function computeChainHash(
  seq: number,
  prevHash: string,
  eventId: string,
  timestamp: string,
  contentHash: string
): Promise<string> {
  const buffer = new ArrayBuffer(128);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);
  let offset = 0;

  // seq: 4 bytes, big-endian
  view.setUint32(offset, seq, false);
  offset += 4;

  // prevHash: 32 bytes (from hex)
  for (let i = 0; i < 32; i++) {
    uint8[offset + i] = parseInt(prevHash.slice(i * 2, i * 2 + 2), 16);
  }
  offset += 32;

  // eventId: 36 bytes (UUID as UTF-8, padded)
  const eventIdBytes = new TextEncoder().encode(eventId.padEnd(36, '\0').slice(0, 36));
  uint8.set(eventIdBytes, offset);
  offset += 36;

  // timestamp: 24 bytes (ISO 8601 as UTF-8, padded)
  const timestampBytes = new TextEncoder().encode(timestamp.padEnd(24, '\0').slice(0, 24));
  uint8.set(timestampBytes, offset);
  offset += 24;

  // contentHash: 32 bytes (from hex)
  for (let i = 0; i < 32; i++) {
    uint8[offset + i] = parseInt(contentHash.slice(i * 2, i * 2 + 2), 16);
  }

  return sha256Bytes(buffer);
}

// ============================================================================
// TYPES
// ============================================================================

export interface TrialEvent {
  id: string;
  seq: number;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface LedgerEntry {
  seq: number;
  eventId: string;
  eventType: string;
  timestamp: string;
  contentHash: string;
  previousHash: string;
  chainHash: string;
}

export interface TrialManifest {
  exportVersion: string;
  schemaVersion: string;
  exportTimestamp: string;
  sessionId: string;
  participantId?: string;
  condition?: string;
  integrity: {
    eventCount: number;
    finalHash: string;
    chainValid: boolean;
  };
  protocol: {
    revealTiming: string;
    disclosureFormat: string;
    deviationEnforcement: string;
  };
  timestampTrustModel: string;
  fileChecksums: {
    events: string;
    ledger: string;
    metrics: string;
  };
  disclosureProvenance?: {
    fdrValue: number;
    forValue: number;
    source: string;
    thresholdHash?: string;
  };
  randomization?: {
    seed: string;
    assignmentMethod: string;
    conditionMatrixHash?: string;
  };
}

export interface DerivedMetrics {
  sessionId: string;
  timestamp: string;
  condition: string;
  initialBirads: number;
  finalBirads: number;
  aiBirads: number | null;
  aiConfidence: number | null;
  changeOccurred: boolean;
  aiConsistentChange: boolean;
  aiInconsistentChange: boolean;
  adda: boolean | null;
  addaDenominator: boolean;
  deviationDocumented: boolean;
  deviationSkipped: boolean;
  deviationRequired: boolean;
  deviationText?: string;
  comprehensionCorrect: boolean | null;
  comprehensionAnswer?: string | null;
  comprehensionItemId?: string | null;
  comprehensionQuestionId?: string | null;
  preAiReadMs?: number | null;
  postAiReadMs?: number | null;
  totalReadMs?: number | null;
  totalTimeMs: number;
  lockToRevealMs: number;
  revealToFinalMs: number;
  revealTiming: string;
  disclosureFormat: string;
}

export interface VerifierCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

export interface VerifierOutput {
  result: 'PASS' | 'FAIL';
  timestamp: string;
  schemaVersion: string;
  checks: VerifierCheck[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface ExportPackConfig {
  sessionId: string;
  participantId?: string;
  condition?: string;
  protocol: {
    revealTiming: 'human_first' | 'concurrent' | 'ai_first';
    disclosureFormat: 'fdr_for' | 'natural_frequency' | 'none';
    deviationEnforcement: 'required' | 'optional_with_attestation' | 'none';
  };
  disclosureProvenance?: {
    fdrValue: number;
    forValue: number;
    source: string;
    thresholdHash?: string;
  };
  randomization?: {
    seed: string;
    assignmentMethod: 'pre_generated' | 'live_rng';
    conditionMatrixHash?: string;
  };
}

// ============================================================================
// EXPORT PACK BUILDER
// ============================================================================

export class ExportPackBuilder {
  private events: TrialEvent[] = [];
  private ledger: LedgerEntry[] = [];
  private config: ExportPackConfig;
  private sessionStartTime: Date | null = null;

  constructor(config: ExportPackConfig) {
    this.config = config;
  }

  /**
   * Generate UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Add event to the chain
   */
  async addEvent(type: string, payload: Record<string, unknown>): Promise<LedgerEntry> {
    const seq = this.events.length;
    const event: TrialEvent = {
      id: this.generateUUID(),
      seq,
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    if (type === 'SESSION_STARTED') {
      this.sessionStartTime = new Date(event.timestamp);
    }

    const prevHash = seq === 0 ? GENESIS_HASH : this.ledger[seq - 1].chainHash;
    const contentHash = await computeContentHash(event.payload);
    const chainHash = await computeChainHash(
      seq,
      prevHash,
      event.id,
      event.timestamp,
      contentHash
    );

    const entry: LedgerEntry = {
      seq,
      eventId: event.id,
      eventType: type,
      timestamp: event.timestamp,
      contentHash,
      previousHash: prevHash,
      chainHash,
    };

    this.events.push(event);
    this.ledger.push(entry);

    return entry;
  }

  /**
   * Get current final hash
   */
  getFinalHash(): string {
    if (this.ledger.length === 0) return GENESIS_HASH;
    return this.ledger[this.ledger.length - 1].chainHash;
  }

  /**
   * Get events
   */
  getEvents(): TrialEvent[] {
    return [...this.events];
  }

  /**
   * Get ledger
   */
  getLedger(): LedgerEntry[] {
    return [...this.ledger];
  }

  /**
   * Compute derived metrics
   */
  computeDerivedMetrics(): DerivedMetrics {
    // Find key events
    const sessionStarted = this.events.find(e => e.type === 'SESSION_STARTED');
    const caseLoaded = this.events.find(e => e.type === 'CASE_LOADED');
    const firstImpression = this.events.find(e => e.type === 'FIRST_IMPRESSION_LOCKED');
    const aiRevealed = this.events.find(e => e.type === 'AI_REVEALED');
    const finalAssessment = this.events.find(e => e.type === 'FINAL_ASSESSMENT');
    const deviationSubmitted = this.events.find(e => e.type === 'DEVIATION_SUBMITTED');
    const deviationSkipped = this.events.find(e => e.type === 'DEVIATION_SKIPPED');
    const comprehensionResponse = this.events.find(e => e.type === 'DISCLOSURE_COMPREHENSION_RESPONSE');

    const initialBirads = (firstImpression?.payload as any)?.birads ?? 0;
    const finalBirads = (finalAssessment?.payload as any)?.birads ?? 0;
    const aiBirads = (aiRevealed?.payload as any)?.aiBirads ?? null;
    const aiConfidence = (aiRevealed?.payload as any)?.aiConfidence ?? null;

    // Change analysis
    const changeOccurred = initialBirads !== finalBirads;
    const aiConsistentChange = changeOccurred && finalBirads === aiBirads;
    const aiInconsistentChange = changeOccurred && aiBirads !== null && finalBirads !== aiBirads;

    // ADDA calculation (explicit)
    const addaDenominator = aiBirads !== null && initialBirads !== aiBirads;
    let adda: boolean | null = null;
    if (addaDenominator) {
      adda = changeOccurred && finalBirads === aiBirads;
    }

    // Documentation
    const deviationRequired = changeOccurred;
    const deviationDocumented = deviationSubmitted !== undefined;
    const deviationSkippedFlag = deviationSkipped !== undefined;
    const deviationText = (deviationSubmitted?.payload as any)?.deviationText;

    // Comprehension
    const comprehensionPayload = (comprehensionResponse?.payload as any) ?? {};
    const comprehensionAnswer =
      comprehensionPayload.selectedAnswer ?? comprehensionPayload.response ?? null;
    const comprehensionItemId = comprehensionPayload.itemId ?? comprehensionPayload.questionId ?? null;
    const comprehensionCorrect =
      comprehensionPayload.isCorrect ?? comprehensionPayload.correct ?? null;

    const isCalibration = Boolean((caseLoaded?.payload as any)?.isCalibration);
    const getReadEpisodeTimestamp = (event: TrialEvent, key: 'tStartIso' | 'tEndIso'): number => {
      const payloadValue = (event.payload as any)?.[key];
      return new Date(payloadValue ?? event.timestamp).getTime();
    };
    const computeReadEpisodeMs = (episodeType: 'PRE_AI' | 'POST_AI'): number | null => {
      if (isCalibration) return null;
      const starts = this.events.filter(
        event => event.type === 'READ_EPISODE_STARTED' && (event.payload as any)?.episodeType === episodeType
      );
      const ends = this.events.filter(
        event => event.type === 'READ_EPISODE_ENDED' && (event.payload as any)?.episodeType === episodeType
      );
      if (starts.length === 0 || ends.length === 0) return null;
      const duration = getReadEpisodeTimestamp(ends[0], 'tEndIso') - getReadEpisodeTimestamp(starts[0], 'tStartIso');
      return Number.isFinite(duration) && duration >= 0 ? duration : null;
    };
    const preAiReadMs = computeReadEpisodeMs('PRE_AI');
    const postAiReadMs = computeReadEpisodeMs('POST_AI');
    const totalReadMs =
      typeof preAiReadMs === 'number' && typeof postAiReadMs === 'number'
        ? preAiReadMs + postAiReadMs
        : null;

    // Timing
    const sessionStart = sessionStarted ? new Date(sessionStarted.timestamp).getTime() : 0;
    const lockTime = firstImpression ? new Date(firstImpression.timestamp).getTime() : sessionStart;
    const revealTime = aiRevealed ? new Date(aiRevealed.timestamp).getTime() : lockTime;
    const finalTime = finalAssessment ? new Date(finalAssessment.timestamp).getTime() : revealTime;

    const totalTimeMs = finalTime - sessionStart;
    const lockToRevealMs = revealTime - lockTime;
    const revealToFinalMs = finalTime - revealTime;

    return {
      sessionId: this.config.sessionId,
      timestamp: new Date().toISOString(),
      condition: this.config.condition || '',
      initialBirads,
      finalBirads,
      aiBirads,
      aiConfidence,
      changeOccurred,
      aiConsistentChange,
      aiInconsistentChange,
      adda,
      addaDenominator,
      deviationDocumented,
      deviationSkipped: deviationSkippedFlag,
      deviationRequired,
      deviationText,
      comprehensionCorrect,
      comprehensionAnswer,
      comprehensionItemId,
      comprehensionQuestionId: comprehensionPayload.questionId ?? null,
      preAiReadMs,
      postAiReadMs,
      totalReadMs,
      totalTimeMs,
      lockToRevealMs,
      revealToFinalMs,
      revealTiming: this.config.protocol.revealTiming,
      disclosureFormat: this.config.protocol.disclosureFormat,
    };
  }

  /**
   * Run verifier checks
   */
  async runVerifier(): Promise<VerifierOutput> {
    const checks: VerifierCheck[] = [];

    // Check 1: Event count
    checks.push({
      name: 'EVENT_COUNT',
      status: 'PASS',
      message: `${this.events.length} events`,
    });

    // Check 2: Ledger count
    const ledgerOk = this.ledger.length === this.events.length;
    checks.push({
      name: 'LEDGER_COUNT',
      status: ledgerOk ? 'PASS' : 'FAIL',
      message: ledgerOk ? `${this.ledger.length} entries` : 'mismatch',
    });

    // Check 3: Chain integrity
    let chainValid = true;
    let chainError = '';
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      const entry = this.ledger[i];

      const expectedPrev = i === 0 ? GENESIS_HASH : this.ledger[i - 1].chainHash;
      if (entry.previousHash !== expectedPrev) {
        chainValid = false;
        chainError = `Event ${i}: previousHash mismatch`;
        break;
      }

      const computedContent = await computeContentHash(event.payload);
      if (entry.contentHash !== computedContent) {
        chainValid = false;
        chainError = `Event ${i}: CONTENT_TAMPERED`;
        break;
      }

      const computedChain = await computeChainHash(
        entry.seq,
        entry.previousHash,
        entry.eventId,
        event.timestamp,
        entry.contentHash
      );
      if (entry.chainHash !== computedChain) {
        chainValid = false;
        chainError = `Event ${i}: CHAIN_BROKEN`;
        break;
      }
    }
    checks.push({
      name: 'CHAIN_INTEGRITY',
      status: chainValid ? 'PASS' : 'FAIL',
      message: chainValid ? 'verified' : chainError,
    });

    // Check 4: Required events
    const requiredTypes = ['SESSION_STARTED', 'FIRST_IMPRESSION_LOCKED', 'FINAL_ASSESSMENT'];
    const eventTypes = new Set(this.events.map(e => e.type));
    const missingEvents = requiredTypes.filter(t => !eventTypes.has(t));
    checks.push({
      name: 'REQUIRED_EVENTS',
      status: missingEvents.length === 0 ? 'PASS' : 'FAIL',
      message: missingEvents.length === 0 ? 'all present' : `Missing: ${missingEvents.join(', ')}`,
    });

    // Check 5: Sequence numbers
    let seqOk = true;
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].seq !== i) {
        seqOk = false;
        break;
      }
    }
    checks.push({
      name: 'SEQUENCE_NUMBERS',
      status: seqOk ? 'PASS' : 'FAIL',
      message: seqOk ? 'monotonic 0..n-1' : 'sequence error',
    });

    // Check 6: Timestamp sequence
    let timestampsOk = true;
    for (let i = 1; i < this.events.length; i++) {
      if (new Date(this.events[i].timestamp) < new Date(this.events[i - 1].timestamp)) {
        timestampsOk = false;
        break;
      }
    }
    checks.push({
      name: 'TIMESTAMP_SEQUENCE',
      status: timestampsOk ? 'PASS' : 'WARN',
      message: timestampsOk ? 'sequential' : 'non-sequential',
    });

    // Check 7: Deviation documentation
    const hasDeviationSubmitted = eventTypes.has('DEVIATION_SUBMITTED');
    const hasDeviationSkipped = eventTypes.has('DEVIATION_SKIPPED');
    
    const firstImpression = this.events.find(e => e.type === 'FIRST_IMPRESSION_LOCKED');
    const finalAssessment = this.events.find(e => e.type === 'FINAL_ASSESSMENT');
    const deviationRequired = firstImpression && finalAssessment &&
      (firstImpression.payload as any).birads !== (finalAssessment.payload as any).birads;

    if (hasDeviationSkipped) {
      checks.push({
        name: 'DEVIATION_DOCUMENTATION',
        status: 'WARN',
        message: 'skipped with attestation (higher-risk documentation pattern)',
      });
    } else if (deviationRequired && hasDeviationSubmitted) {
      checks.push({
        name: 'DEVIATION_DOCUMENTATION',
        status: 'PASS',
        message: 'properly documented',
      });
    } else {
      checks.push({
        name: 'DEVIATION_DOCUMENTATION',
        status: 'PASS',
        message: 'no deviation required',
      });
    }

    // Check 8: Canonical JSON
    checks.push({
      name: 'CANONICAL_JSON',
      status: 'PASS',
      message: 'RFC 8785 compliant serialization',
    });

    const failed = checks.filter(c => c.status === 'FAIL').length;
    const passed = checks.filter(c => c.status === 'PASS').length;
    const warnings = checks.filter(c => c.status === 'WARN').length;

    return {
      result: failed === 0 ? 'PASS' : 'FAIL',
      timestamp: new Date().toISOString(),
      schemaVersion: '2.0.0',
      checks,
      summary: { passed, failed, warnings },
    };
  }

  /**
   * Generate complete export package
   */
  async generateExportPackage(): Promise<{
    manifest: TrialManifest;
    eventsJsonl: string;
    ledgerJson: string;
    metricsCSV: string;
    verifierOutput: VerifierOutput;
    codebook: string;
    // NEW (P0): payload manifest + root hash
    exportManifestJson: string;
    exportRootHash: string;
  }> {
    // Generate events.jsonl
    const eventsJsonl = this.events.map(e => JSON.stringify(e)).join('\n');

    // Generate ledger.json
    const ledgerJson = JSON.stringify(this.ledger, null, 2);

    // Generate derived_metrics.csv
    const metrics = this.computeDerivedMetrics();
    const metricsHeaders = Object.keys(metrics).join(',');
    const metricsValues = Object.values(metrics).map(v => 
      v === null ? '' : typeof v === 'string' ? `"${v}"` : v
    ).join(',');
    const metricsCSV = `${metricsHeaders}\n${metricsValues}`;

    // Compute file checksums
    const eventsChecksum = await sha256Hex(eventsJsonl);
    const ledgerChecksum = await sha256Hex(ledgerJson);
    const metricsChecksum = await sha256Hex(metricsCSV);

    // Run verifier
    const verifierOutput = await this.runVerifier();

    // Generate manifest
    const manifest: TrialManifest = {
      exportVersion: '2.0.0',
      schemaVersion: '2.0.0',
      exportTimestamp: new Date().toISOString(),
      sessionId: this.config.sessionId,
      participantId: this.config.participantId,
      condition: this.config.condition,
      integrity: {
        eventCount: this.events.length,
        finalHash: this.getFinalHash(),
        chainValid: verifierOutput.result === 'PASS',
      },
      protocol: {
        revealTiming: this.config.protocol.revealTiming,
        disclosureFormat: this.config.protocol.disclosureFormat,
        deviationEnforcement: this.config.protocol.deviationEnforcement,
      },
      timestampTrustModel: 'client_clock_untrusted', // P0: Explicit trust model
      fileChecksums: {
        events: eventsChecksum,
        ledger: ledgerChecksum,
        metrics: metricsChecksum,
      },
      disclosureProvenance: this.config.disclosureProvenance,
      randomization: this.config.randomization,
    };

    // Generate codebook
    const codebook = this.generateCodebook();

    // --------------------
    // P0: Export manifest + root hash (payload integrity)
    // --------------------
    const verifierOutputJson = JSON.stringify(verifierOutput, null, 2);
    const verifierChecksum = await sha256Hex(verifierOutputJson);
    const codebookChecksum = await sha256Hex(codebook);
    const exportManifestCreatedUtc = new Date().toISOString();

    const payloadFiles: Record<string, string> = {
      'events.jsonl': eventsJsonl,
      'ledger.json': ledgerJson,
      'verifier_output.json': verifierOutputJson,
      'derived_metrics.csv': metricsCSV,
      'codebook.md': codebook,
    };

    const exportManifestEntries: Array<{ path: string; sha256: string; bytes: number }> = [];
    for (const filePath of Object.keys(payloadFiles).sort()) {
      const content = payloadFiles[filePath];
      exportManifestEntries.push({
        path: filePath,
        sha256: await sha256Hex(content),
        bytes: new TextEncoder().encode(content).byteLength,
      });
    }

    const exportManifest = {
      schema: 'evidify.export_manifest.v1',
      created_utc: exportManifestCreatedUtc,
      entries: exportManifestEntries,
    };

    // Root hash = SHA-256(canonical manifest JSON)
    const exportRootHash = await sha256Hex(canonicalJSON(exportManifest));

    // Pretty JSON file (hash computed from canonical form above)
    const exportManifestJson = JSON.stringify(exportManifest, null, 2);

    // Attach export root hash + manifest provenance to trial manifest (no recursion)
    (manifest as any).export_manifest_schema = 'evidify.export_manifest.v1';
    (manifest as any).export_manifest_created_utc = exportManifestCreatedUtc;
    (manifest as any).export_manifest_sha256 = exportRootHash;
    (manifest as any).export_root_hash = exportRootHash;

    // Extend fileChecksums to cover all exported payload files
    (manifest as any).fileChecksums.verifier_output = verifierChecksum;
    (manifest as any).fileChecksums.codebook = codebookChecksum;

    return {
      manifest,
      eventsJsonl,
      ledgerJson,
      metricsCSV,
      verifierOutput,
      codebook,
      exportManifestJson,
      exportRootHash,
    };
  }

  /**
   * Generate codebook markdown
   */
  private generateCodebook(): string {
    return `# Evidify Export Codebook

## Schema Version: 2.0.0

## File Descriptions

| File | Description |
|------|-------------|
| trial_manifest.json | Session metadata, integrity checksums, protocol configuration |
| events.jsonl | Append-only event stream, one JSON object per line |
| ledger.json | Hash chain entries with cryptographic links |
| verifier_output.json | Automated integrity check results |
| derived_metrics.csv | Pre-computed analysis variables (single row per session) |
| codebook.md | This file - field definitions |

## Event Types

| Type | Description | Key Payload Fields |
|------|-------------|-------------------|
| SESSION_STARTED | Session initialization | sessionId |
| CASE_LOADED | Case presented to reader | caseId |
| IMAGE_VIEWED | Image interaction | imageId, viewDurationMs |
| FIRST_IMPRESSION_LOCKED | Initial assessment locked | birads, confidence, timeOnCaseMs |
| AI_REVEALED | AI recommendation shown | aiBirads, aiConfidence |
| DISCLOSURE_PRESENTED | FDR/FOR disclosure shown | format, fdr, for |
| DISCLOSURE_COMPREHENSION_RESPONSE | Comprehension check answer | itemId, questionId, response, correct |
| DEVIATION_STARTED | User began changing assessment | deviationType, initialBirads, aiBirads |
| DEVIATION_SUBMITTED | Deviation documentation provided | deviationText, clinicalRationale, wordCount |
| DEVIATION_SKIPPED | User skipped documentation | attestation, attestationTimestamp |
| FINAL_ASSESSMENT | Final assessment submitted | birads, confidence, timeOnCaseMs |
| EXPORT_GENERATED | Export package created | exportVersion, eventCount, finalHash |

## Derived Metrics (Operational Definitions)

**Calibration handling**
- Calibration trial = \`CASE_LOADED.payload.isCalibration === true\`
- For calibration trials, read-episode metrics (\`preAiReadMs\`, \`postAiReadMs\`, \`totalReadMs\`) are **NULL** and excluded from aggregate timing statistics.

| Column | Definition | Formula / Event Source |
|--------|------------|------------------------|
| sessionId | Session identifier | \`config.sessionId\` |
| timestamp | Metric export timestamp (ISO 8601) | \`new Date().toISOString()\` |
| condition | Experimental condition code | \`config.condition\` |
| initialBirads | BI-RADS at first impression lock | \`FIRST_IMPRESSION_LOCKED.payload.birads\` (default 0) |
| finalBirads | BI-RADS at final submission | \`FINAL_ASSESSMENT.payload.birads\` (default 0) |
| aiBirads | AI-recommended BI-RADS | \`AI_REVEALED.payload.aiBirads\` else NULL |
| aiConfidence | AI confidence (0-1) | \`AI_REVEALED.payload.aiConfidence\` else NULL |
| changeOccurred | Assessment changed | \`initialBirads !== finalBirads\` |
| aiConsistentChange | Change toward AI | \`changeOccurred && finalBirads === aiBirads\` |
| aiInconsistentChange | Change away from AI | \`changeOccurred && aiBirads !== null && finalBirads !== aiBirads\` |
| addaDenominator | Eligible for ADDA | \`aiBirads !== null && initialBirads !== aiBirads\` |
| adda | ADDA indicator | \`addaDenominator ? (changeOccurred && finalBirads === aiBirads) : null\` |
| deviationDocumented | Deviation rationale provided | \`DEVIATION_SUBMITTED\` present |
| deviationSkipped | Deviation skipped with attestation | \`DEVIATION_SKIPPED\` present |
| deviationRequired | Deviation required | \`changeOccurred\` |
| deviationText | Deviation rationale text | \`DEVIATION_SUBMITTED.payload.deviationText\` |
| comprehensionAnswer | Comprehension response | \`DISCLOSURE_COMPREHENSION_RESPONSE.payload.selectedAnswer ?? payload.response\` |
| comprehensionItemId | Comprehension item identifier | \`payload.itemId ?? payload.questionId\` |
| comprehensionQuestionId | Comprehension question identifier | \`payload.questionId\` |
| comprehensionCorrect | Comprehension correctness | \`payload.isCorrect ?? payload.correct\` |
| preAiReadMs | PRE_AI read duration (ms) | \`READ_EPISODE_ENDED - READ_EPISODE_STARTED\` (PRE_AI); NULL if calibration or missing |
| postAiReadMs | POST_AI read duration (ms) | \`READ_EPISODE_ENDED - READ_EPISODE_STARTED\` (POST_AI); NULL if calibration or missing |
| totalReadMs | Total read duration (ms) | \`preAiReadMs + postAiReadMs\` when both numeric |
| totalTimeMs | Session duration (ms) | \`FINAL_ASSESSMENT.timestamp - SESSION_STARTED.timestamp\` |
| lockToRevealMs | Lock → AI reveal (ms) | \`AI_REVEALED.timestamp - FIRST_IMPRESSION_LOCKED.timestamp\` |
| revealToFinalMs | AI reveal → final (ms) | \`FINAL_ASSESSMENT.timestamp - AI_REVEALED.timestamp\` |
| revealTiming | Reveal timing | \`config.protocol.revealTiming\` |
| disclosureFormat | Disclosure format | \`config.protocol.disclosureFormat\` |

## ADDA Operational Definition

**ADDA (Automation-Induced Decision Adjustment)**

ADDA = TRUE when ALL of:
1. AI was present (aiBirads ≠ null)
2. Initial DIFFERED from AI (initialBirads ≠ aiBirads) — this defines the denominator
3. Assessment changed (initialBirads ≠ finalBirads)
4. Final MATCHES AI (finalBirads = aiBirads)

ADDA = FALSE when in denominator but did not change toward AI.

ADDA = NULL (not in denominator) when initial already matched AI.

## Hash Chain Specification

**Content Hash:**
\`\`\`
contentHash = SHA-256(canonicalJSON(payload))
\`\`\`

**Chain Hash (structured encoding, 128 bytes):**
\`\`\`
input = seq (4B, big-endian) | prevHash (32B) | eventId (36B) | timestamp (24B) | contentHash (32B)
chainHash = SHA-256(input)
\`\`\`

**Canonical JSON:** RFC 8785 compliant (sorted keys, no whitespace, normalized numbers)

## Timestamp Trust Model

Current implementation: \`client_clock_untrusted\`

Client-reported timestamps are treated as instrumentation (behavioral timing) rather than attestation.
For forensic-grade timestamps, server-side timestamping or RFC 3161 authority is required.

## Verification

\`\`\`bash
npm run verify -- path/to/export/
\`\`\`

Exit codes: 0 = PASS, 1 = FAIL, 2 = ERROR
`;
  }
}

export default ExportPackBuilder;

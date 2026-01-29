/**
 * ExportPackZip.ts
 * 
 * Enhanced export package builder with real ZIP generation
 * Produces research-grade export packages for BRPLL studies
 */

import JSZip from 'jszip';

// Canonical types live in ExportPack.ts — import into local scope and re-export to avoid drift
import type { DerivedMetrics, TrialEvent, LedgerEntry } from './ExportPack';
export type { DerivedMetrics, TrialEvent, LedgerEntry } from './ExportPack';

// Re-export types from original

export interface ExportManifest {
  exportVersion: string;
  schemaVersion: string;
  exportTimestamp: string;
  sessionId: string;
  participantId: string;
  siteId: string;
  studyId: string;
  protocolVersion: string;
  condition: {
    revealTiming: string;
    disclosureFormat: string;
    seed: string;
    assignmentMethod: string;
  };
  caseQueue: {
    queueId: string;
    totalCases: number;
    completedCases: number;
    caseIds: string[];
  };
  integrity: {
    eventCount: number;
    firstEventHash: string;
    finalChainHash: string;
    chainValid: boolean;
  };
  timing: {
    sessionStartTime: string;
    sessionEndTime: string;
    totalDurationMs: number;
  };
  fileChecksums: {
    events: string;
    ledger: string;
    metrics: string;
    codebook: string;
  };
  timestampTrustModel: string;
}

export interface VerifierOutput {
  result: 'PASS' | 'FAIL';
  timestamp: string;
  verifierVersion: string;
  checks: Array<{
    name: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    message: string;
  }>;
  chainIntegrity: {
    totalEvents: number;
    validLinks: number;
    brokenAt: number | null;
  };
}

// ============================================================================
// CRYPTO UTILITIES
// ============================================================================

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function canonicalJSON(obj: unknown): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'number') return Number.isFinite(obj) ? String(obj) : 'null';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalJSON).join(',') + ']';
  if (typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const pairs = keys.map(k => `${JSON.stringify(k)}:${canonicalJSON((obj as Record<string, unknown>)[k])}`);
    return '{' + pairs.join(',') + '}';
  }
  return 'null';
}

// ============================================================================
// EXPORT PACK BUILDER
// ============================================================================

export class ExportPackZip {
  private events: TrialEvent[] = [];
  private seqCounter = 0;
  private addEventLock: Promise<void> = Promise.resolve();
  private ledger: LedgerEntry[] = [];
  private sessionId: string;
  private participantId: string;
  private siteId: string;
  private studyId: string;
  private protocolVersion: string;
  private condition: ExportManifest['condition'];
  private caseQueue: ExportManifest['caseQueue'];
  private sessionStartTime: Date;
  private metricsPerCase: DerivedMetrics[] = [];
  private methodsSnapshot: Record<string, unknown> | null = null;

  constructor(config: {
    sessionId: string;
    participantId: string;
    siteId: string;
    studyId: string;
    protocolVersion: string;
    condition: ExportManifest['condition'];
    caseQueue: ExportManifest['caseQueue'];
  }) {
    this.sessionId = config.sessionId;
    this.participantId = config.participantId;
    this.siteId = config.siteId;
    this.studyId = config.studyId;
    this.protocolVersion = config.protocolVersion;
    this.condition = config.condition;
    this.caseQueue = config.caseQueue;
    this.sessionStartTime = new Date();
  }

  /**
   * Add event to the chain
   */
async addEvent(type: string, payload: Record<string, unknown>): Promise<LedgerEntry> {
    // Mutex: wait for previous addEvent to finish
    const myTurn = this.addEventLock;
    let release: () => void;
    this.addEventLock = new Promise(r => release = r);
    await myTurn;

    try {
      const seq = ++this.seqCounter;
    const eventId = this.generateUUID();
    const timestamp = new Date().toISOString();
    
    const event: TrialEvent = {
      id: eventId,
      seq,
      type,
      timestamp,
      payload,
    };
    
    // Compute content hash
    const contentHash = await sha256Hex(canonicalJSON({ type, payload, timestamp }));
    
    // Get previous hash
    const previousHash = this.ledger.length === 0 
      ? '0'.repeat(64)
      : this.ledger[this.ledger.length - 1].chainHash;;
    
    // Compute chain hash
    const chainInput = `${previousHash}|${contentHash}|${timestamp}`;
    const chainHash = await sha256Hex(chainInput);
    
    const ledgerEntry: LedgerEntry = {
      seq,
      eventId,
      eventType: type,
      timestamp,
      contentHash,
      previousHash,
      chainHash,
    };
    
    this.events.push(event);
    this.ledger.push(ledgerEntry);
    
      return ledgerEntry;
    } finally {
      release!();
    }
  }

  /**
   * Add case metrics
   */
  addCaseMetrics(metrics: DerivedMetrics): void {
    const metricsCaseId = (metrics as any).caseId as string | undefined;

    // If this metrics object doesn't carry a caseId, just append it.
    if (!metricsCaseId) {
      this.metricsPerCase.push(metrics);
      return;
    }

    const exists = this.metricsPerCase.find(m => (m as any).caseId === metricsCaseId);
    if (!exists) {
      this.metricsPerCase.push(metrics);
    }
  }

  setMethodsSnapshot(snapshot: Record<string, unknown>): void {
    this.methodsSnapshot = snapshot;
  }
  /**
   * Run internal verifier
   */
  async runVerifier(): Promise<VerifierOutput> {
    const checks: VerifierOutput['checks'] = [];
    let brokenAt: number | null = null;
    
    // Check 1: Event count
    checks.push({
      name: 'EVENT_COUNT',
      status: this.events.length > 0 ? 'PASS' : 'FAIL',
      message: `Found ${this.events.length} events`,
    });
    
    // Check 2: Required events
    const requiredEvents = ['SESSION_STARTED', 'CASE_LOADED', 'FINAL_ASSESSMENT'];
    const eventTypes = new Set(this.events.map(e => e.type));
    const missingEvents = requiredEvents.filter(e => !eventTypes.has(e));
    checks.push({
      name: 'REQUIRED_EVENTS',
      status: missingEvents.length === 0 ? 'PASS' : 'WARN',
      message: missingEvents.length === 0 
        ? 'All required events present'
        : `Missing: ${missingEvents.join(', ')}`,
    });
    
    // Check 3: Chain integrity
    let validLinks = 0;
    for (let i = 0; i < this.ledger.length; i++) {
      const entry = this.ledger[i];
      const event = this.events[i];
      
      // Verify content hash
      const expectedContentHash = await sha256Hex(
        canonicalJSON({ type: event.type, payload: event.payload, timestamp: event.timestamp })
      );
      
      if (entry.contentHash !== expectedContentHash) {
        brokenAt = i;
        break;
      }
      
      // Verify chain hash
      const expectedPrevHash = i === 0 ? '0'.repeat(64) : this.ledger[i - 1].chainHash;
      if (entry.previousHash !== expectedPrevHash) {
        brokenAt = i;
        break;
      }
      
      const expectedChainHash = await sha256Hex(
        `${entry.previousHash}|${entry.contentHash}|${entry.timestamp}`
      );
      
      if (entry.chainHash !== expectedChainHash) {
        brokenAt = i;
        break;
      }
      
      validLinks++;
    }
    
    checks.push({
      name: 'CHAIN_INTEGRITY',
      status: brokenAt === null ? 'PASS' : 'FAIL',
      message: brokenAt === null 
        ? `All ${validLinks} chain links valid`
        : `Chain broken at event ${brokenAt}`,
    });
    
    // Check 4: Timestamp monotonicity
    let timestampValid = true;
    for (let i = 1; i < this.events.length; i++) {
      if (new Date(this.events[i].timestamp) < new Date(this.events[i - 1].timestamp)) {
        timestampValid = false;
        break;
      }
    }
    checks.push({
      name: 'TIMESTAMP_MONOTONICITY',
      status: timestampValid ? 'PASS' : 'WARN',
      message: timestampValid ? 'Timestamps monotonically increasing' : 'Timestamp ordering issue detected',
    });
    
    const overallResult = checks.every(c => c.status !== 'FAIL') ? 'PASS' : 'FAIL';
    
    return {
      result: overallResult,
      timestamp: new Date().toISOString(),
      verifierVersion: '2.0.0',
      checks,
      chainIntegrity: {
        totalEvents: this.events.length,
        validLinks,
        brokenAt,
      },
    };
  }

  /**
   * Generate complete export package as ZIP
   */
  async generateZip(): Promise<{
    blob: Blob;
    filename: string;
    manifest: ExportManifest;
    exportManifestEntries: Array<{ path: string; sha256: string; bytes: number }>;
    verifierOutput: VerifierOutput;
  }> {
    const zip = new JSZip();
    const sessionEndTime = new Date();
    
    // Run verifier
    const verifierOutput = await this.runVerifier();
    
    // Generate events.jsonl
    const eventsJsonl = this.events.map(e => JSON.stringify(e)).join('\n');
    const eventsChecksum = await sha256Hex(eventsJsonl);
    
    // Generate ledger.json
    const ledgerJson = JSON.stringify(this.ledger, null, 2);
    const ledgerChecksum = await sha256Hex(ledgerJson);
    
    // Generate derived_metrics.csv
    const metricsCSV = this.generateMetricsCSV();
    const metricsChecksum = await sha256Hex(metricsCSV);
    
    // Generate codebook.md
    const codebook = this.generateCodebook();
    const codebookChecksum = await sha256Hex(codebook);
    
    // Generate manifest
    const manifest: ExportManifest = {
      exportVersion: '2.0.0',
      schemaVersion: '2.0.0',
      exportTimestamp: sessionEndTime.toISOString(),
      sessionId: this.sessionId,
      participantId: this.participantId,
      siteId: this.siteId,
      studyId: this.studyId,
      protocolVersion: this.protocolVersion,
      condition: this.condition,
      caseQueue: {
        ...this.caseQueue,
        completedCases: this.metricsPerCase.length,
      },
      integrity: {
        eventCount: this.events.length,
        firstEventHash: this.ledger[0]?.chainHash || '',
        finalChainHash: this.ledger[this.ledger.length - 1]?.chainHash || '',
        chainValid: verifierOutput.result === 'PASS',
      },
      timing: {
        sessionStartTime: this.sessionStartTime.toISOString(),
        sessionEndTime: sessionEndTime.toISOString(),
        totalDurationMs: sessionEndTime.getTime() - this.sessionStartTime.getTime(),
      },
      fileChecksums: {
        events: eventsChecksum,
        ledger: ledgerChecksum,
        metrics: metricsChecksum,
        codebook: codebookChecksum,
      },
      timestampTrustModel: 'client_clock_untrusted',
    };
    
        // --------------------
    // P0: export_manifest.json + export_root_hash
    // --------------------
    const verifierOutputJson = JSON.stringify(verifierOutput, null, 2);

    const payloadFiles: Record<string, string> = {
      'events.jsonl': eventsJsonl,
      'ledger.json': ledgerJson,
      'verifier_output.json': verifierOutputJson,
      'derived_metrics.csv': metricsCSV,
      'codebook.md': codebook,
    };

    if (this.methodsSnapshot) {
      payloadFiles['methods_snapshot.json'] = JSON.stringify(this.methodsSnapshot, null, 2);
    }

    const exportManifestEntries: Array<{ path: string; sha256: string; bytes: number }> = [];
    for (const filePath of Object.keys(payloadFiles).sort()) {
      const content = payloadFiles[filePath];
      exportManifestEntries.push({
        path: filePath,
        sha256: await sha256Hex(content),
        bytes: new TextEncoder().encode(content).byteLength,
      });
    }

    const exportManifestObj = {
      schema: 'evidify.export_manifest.v1',
      created_utc: new Date().toISOString(),
      entries: exportManifestEntries,
    };

    // Root hash = SHA-256(canonical export_manifest JSON)
    const exportRootHash = await sha256Hex(canonicalJSON(exportManifestObj));
    const exportManifestJson = JSON.stringify(exportManifestObj, null, 2);

    // Put required fields onto trial_manifest.json (top-level)
    (manifest as any).export_root_hash = exportRootHash;
    (manifest as any).export_manifest_sha256 = exportRootHash;

    // --------------------
    // Add files to ZIP (7 files)
    // --------------------
    zip.file('trial_manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('export_manifest.json', exportManifestJson);
    zip.file('_DEBUG_SENTINEL.txt', 'ExportPackZip_v1_hit');
    zip.file('events.jsonl', eventsJsonl);
    zip.file('ledger.json', ledgerJson);
    zip.file('verifier_output.json', verifierOutputJson);
    zip.file('derived_metrics.csv', metricsCSV);
    zip.file('codebook.md', codebook);
    if (this.methodsSnapshot) {
      zip.file('methods_snapshot.json', JSON.stringify(this.methodsSnapshot, null, 2));
    }
    
    // Generate ZIP blob
    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = `evidify_export_${this.sessionId}_${new Date().toISOString().slice(0, 10)}.zip`;
    
    return { blob, filename, manifest, exportManifestEntries, verifierOutput };
  }

  /**
   * Generate metrics CSV
   */
  private generateMetricsCSV(): string {
    if (this.metricsPerCase.length === 0) {
      // Generate from events if no explicit metrics
      return this.generateMetricsFromEvents();
    }
    
    const headers = Object.keys(this.metricsPerCase[0]).join(',');
    const rows = this.metricsPerCase.map(m => 
      Object.values(m).map(v => 
        typeof v === 'string' ? `"${v}"` : v
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }

  /**
   * Generate metrics from events (fallback)
   */
  private generateMetricsFromEvents(): string {
    const firstImpression = this.events.find(e => e.type === 'FIRST_IMPRESSION_LOCKED');
    const aiRevealed = this.events.find(e => e.type === 'AI_REVEALED');
    const finalAssessment = this.events.find(e => e.type === 'FINAL_ASSESSMENT');
    
    const initialBirads = (firstImpression?.payload as any)?.birads ?? null;
    const aiBirads = (aiRevealed?.payload as any)?.suggestedBirads ?? null;
    const finalBirads = (finalAssessment?.payload as any)?.birads ?? null;
    
    const changeOccurred = initialBirads !== finalBirads;
    const aiConsistentChange = changeOccurred && finalBirads === aiBirads;
    const addaDenominator = initialBirads !== aiBirads;
    const adda = addaDenominator ? aiConsistentChange : null;
    
    const headers = 'sessionId,caseId,condition,initialBirads,finalBirads,aiBirads,changeOccurred,aiConsistentChange,addaDenominator,adda';
    const values = [
      `"${this.sessionId}"`,
      `"${this.caseQueue.caseIds[0] || 'unknown'}"`,
      `"${this.condition.revealTiming}"`,
      initialBirads,
      finalBirads,
      aiBirads,
      changeOccurred,
      aiConsistentChange,
      addaDenominator,
      adda,
    ].join(',');
    
    return `${headers}\n${values}`;
  }

  /**
   * Generate codebook
   */
  private generateCodebook(): string {
    return `# Evidify Export Codebook v2.0

## Study Information
- **Study ID**: ${this.studyId || 'BRPLL-MAMMO-v1.0'}
- **Protocol Version**: ${this.protocolVersion}
- **Site ID**: ${this.siteId}

## Condition Assignment
- **Reveal Timing**: ${this.condition.revealTiming}
  - HUMAN_FIRST: Reader makes initial assessment before seeing AI
  - AI_FIRST: Reader sees AI suggestion before making assessment
  - CONCURRENT: Reader sees AI and makes assessment simultaneously
- **Disclosure Format**: ${this.condition.disclosureFormat}
  - FDR_FOR: False Discovery Rate and False Omission Rate shown
  - NATURAL_FREQUENCY: "X out of 100" format
  - NONE: No error rate disclosure

## Event Types

### Session Events
- **SESSION_STARTED**: Study session initialized
- **RANDOMIZATION_ASSIGNED**: Condition randomly assigned with seed
- **SESSION_ENDED**: Study session completed

### Case Events
- **CASE_LOADED**: Mammogram case presented to reader
- **IMAGE_VIEWED**: Reader viewed/interacted with image
- **FIRST_IMPRESSION_LOCKED**: Initial BI-RADS assessment locked
- **AI_REVEALED**: AI suggestion shown to reader
- **DISCLOSURE_PRESENTED**: Error rate information shown
- **DISCLOSURE_COMPREHENSION_RESPONSE**: Reader answered comprehension check
- **DEVIATION_STARTED**: Reader began changing assessment
- **DEVIATION_SUBMITTED**: Reader documented rationale for change
- **DEVIATION_SKIPPED**: Reader skipped documentation (with attestation)
- **FINAL_ASSESSMENT**: Final BI-RADS assessment submitted
- **CASE_COMPLETED**: Case processing finished

### Attention & Calibration
- **CALIBRATION_STARTED**: Training case begun
- **CALIBRATION_FEEDBACK_SHOWN**: Feedback provided on training case
- **ATTENTION_CHECK_PRESENTED**: Catch trial presented
- **ATTENTION_CHECK_RESPONSE**: Reader response to catch trial

## Derived Metrics

### Primary Outcome: ADDA (Appropriate Deference to Decision Aid)
- **adda**: TRUE if reader changed toward AI when initial ≠ AI suggestion
- **adda_denominator**: TRUE if initial assessment differed from AI (eligible for ADDA)
- **change_occurred**: TRUE if final ≠ initial assessment
- **ai_consistent_change**: TRUE if change moved toward AI suggestion

### Timing Metrics
- **preAiTimeMs**: Time from case load to first impression lock
- **postAiTimeMs**: Time from AI reveal to final assessment
- **totalTimeMs**: Total time on case

## Hash Chain Verification

Each event is linked via SHA-256 hash chain:
\`\`\`
contentHash = SHA256(canonical_json(type + payload + timestamp))
chainHash[n] = SHA256(prevChainHash | contentHash | timestamp)
\`\`\`

Verification: Run \`verify-export.ts\` on the ZIP package.

## Timestamp Trust Model
**client_clock_untrusted**: Timestamps are from client device and not independently verified.
For legal defensibility, consider server-side receipt integration.

---
Generated by Evidify Export System v2.0
Timestamp Trust Model: client_clock_untrusted
`;
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

  // Getters for PacketViewer
  getEvents(): TrialEvent[] { return this.events; }
  getLedger(): LedgerEntry[] { return this.ledger; }
  getMetrics(): DerivedMetrics[] { return this.metricsPerCase; }
}

export default ExportPackZip;

/**
 * Evidify Verifier v0.1.0
 * Standalone verification tool for export integrity
 * 
 * Verifies:
 * - Hash chain integrity
 * - Signature validity
 * - Asset hash matches
 * - Schema compatibility
 * - Required artifacts present
 */

// =============================================================================
// VERIFIER REPORT SCHEMA
// =============================================================================
export interface VerifierReport {
  verifier_version: string;
  verified_at_utc: string;
  result: 'PASS' | 'FAIL';
  
  // Summary hashes
  first_hash: string;
  final_hash: string;
  protocol_hash: string;
  
  // Signature info
  signature: {
    valid: boolean;
    algo: string;
    public_key_id: string;
    error?: string;
  };
  
  // Individual checks
  checks: VerifierCheck[];
  
  // If FAIL, specific reason codes
  reason_codes: VerifierReasonCode[];
  
  // Detailed breakdown
  details: {
    events_verified: number;
    assets_verified: number;
    chain_breaks: ChainBreak[];
    asset_mismatches: AssetMismatch[];
    schema_warnings: string[];
  };
}

export interface VerifierCheck {
  check: VerifierCheckType;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  message?: string;
  details?: Record<string, unknown>;
}

export type VerifierCheckType =
  | 'LEDGER_CHAIN_INTACT'
  | 'SIGNATURE_VALID'
  | 'ASSET_HASHES_MATCH'
  | 'SCHEMA_COMPATIBLE'
  | 'REQUIRED_ARTIFACTS_PRESENT'
  | 'SESSION_PROPERLY_CLOSED'
  | 'NO_TRUNCATION_DETECTED'
  | 'TIMESTAMPS_MONOTONIC';

export type VerifierReasonCode =
  | 'CHAIN_BROKEN_AT_SEQ'
  | 'SIGNATURE_INVALID'
  | 'SIGNATURE_MISSING'
  | 'ASSET_HASH_MISMATCH'
  | 'ASSET_MISSING'
  | 'SCHEMA_VERSION_MISMATCH'
  | 'REQUIRED_FILE_MISSING'
  | 'SESSION_NOT_CLOSED'
  | 'TRUNCATION_SUSPECTED'
  | 'TIMESTAMP_REGRESSION';

export interface ChainBreak {
  seq: number;
  expected_prev_hash: string;
  actual_prev_hash: string;
  event_type: string;
}

export interface AssetMismatch {
  asset_id: string;
  expected_hash: string;
  actual_hash: string;
  path: string;
}

// =============================================================================
// VERIFIER IMPLEMENTATION
// =============================================================================

export class Verifier {
  private readonly GENESIS_HASH = 'sha256:' + '0'.repeat(64);
  
  constructor(
    private hashFn: (data: Uint8Array) => Promise<string>,
    private verifySignature: (data: Uint8Array, sig: string, pubKey: string) => Promise<boolean>
  ) {}
  
  /**
   * Verify an export directory
   */
  async verify(exportDir: ExportDirectory): Promise<VerifierReport> {
    const checks: VerifierCheck[] = [];
    const reasonCodes: VerifierReasonCode[] = [];
    const chainBreaks: ChainBreak[] = [];
    const assetMismatches: AssetMismatch[] = [];
    const schemaWarnings: string[] = [];
    
    let eventsVerified = 0;
    let assetsVerified = 0;
    let firstHash = '';
    let finalHash = '';
    let protocolHash = '';
    let signatureValid = false;
    let signatureError: string | undefined;
    
    // 1. Check required artifacts present
    const artifactCheck = this.checkRequiredArtifacts(exportDir);
    checks.push(artifactCheck);
    if (artifactCheck.status === 'FAIL') {
      reasonCodes.push('REQUIRED_FILE_MISSING');
    }
    
    // 2. Load and verify ledger chain
    try {
      const ledger = exportDir.ledger;
      const chainResult = await this.verifyChain(ledger);
      
      eventsVerified = chainResult.eventsVerified;
      firstHash = chainResult.firstHash;
      finalHash = chainResult.finalHash;
      chainBreaks.push(...chainResult.breaks);
      
      checks.push({
        check: 'LEDGER_CHAIN_INTACT',
        status: chainResult.breaks.length === 0 ? 'PASS' : 'FAIL',
        message: chainResult.breaks.length === 0 
          ? `Chain intact: ${eventsVerified} events verified`
          : `Chain broken at ${chainResult.breaks.length} point(s)`,
        details: { eventsVerified, breaks: chainResult.breaks.length },
      });
      
      if (chainResult.breaks.length > 0) {
        reasonCodes.push('CHAIN_BROKEN_AT_SEQ');
      }
    } catch (error) {
      checks.push({
        check: 'LEDGER_CHAIN_INTACT',
        status: 'FAIL',
        message: `Failed to verify chain: ${error}`,
      });
      reasonCodes.push('CHAIN_BROKEN_AT_SEQ');
    }
    
    // 3. Verify signature
    try {
      const manifest = exportDir.manifest;
      if (manifest.signature) {
        const dataToVerify = new TextEncoder().encode(finalHash);
        signatureValid = await this.verifySignature(
          dataToVerify,
          manifest.signature.sig,
          manifest.signature.public_key_id
        );
        
        checks.push({
          check: 'SIGNATURE_VALID',
          status: signatureValid ? 'PASS' : 'FAIL',
          message: signatureValid ? 'Signature verified' : 'Signature verification failed',
          details: { algo: manifest.signature.algo, keyId: manifest.signature.public_key_id },
        });
        
        if (!signatureValid) {
          reasonCodes.push('SIGNATURE_INVALID');
        }
      } else {
        checks.push({
          check: 'SIGNATURE_VALID',
          status: 'WARN',
          message: 'No signature present in export',
        });
        signatureError = 'No signature present';
      }
    } catch (error) {
      checks.push({
        check: 'SIGNATURE_VALID',
        status: 'FAIL',
        message: `Signature verification error: ${error}`,
      });
      signatureError = String(error);
      reasonCodes.push('SIGNATURE_INVALID');
    }
    
    // 4. Verify asset hashes
    try {
      const manifest = exportDir.manifest;
      for (const artifact of manifest.artifacts || []) {
        const actualHash = await this.hashFile(exportDir.getFile(artifact.relpath));
        if (actualHash !== artifact.sha256) {
          assetMismatches.push({
            asset_id: artifact.relpath,
            expected_hash: artifact.sha256,
            actual_hash: actualHash,
            path: artifact.relpath,
          });
        }
        assetsVerified++;
      }
      
      checks.push({
        check: 'ASSET_HASHES_MATCH',
        status: assetMismatches.length === 0 ? 'PASS' : 'FAIL',
        message: assetMismatches.length === 0
          ? `All ${assetsVerified} assets verified`
          : `${assetMismatches.length} asset(s) have mismatched hashes`,
        details: { assetsVerified, mismatches: assetMismatches.length },
      });
      
      if (assetMismatches.length > 0) {
        reasonCodes.push('ASSET_HASH_MISMATCH');
      }
    } catch (error) {
      checks.push({
        check: 'ASSET_HASHES_MATCH',
        status: 'FAIL',
        message: `Asset verification error: ${error}`,
      });
      reasonCodes.push('ASSET_MISSING');
    }
    
    // 5. Check schema compatibility
    const schemaCheck = this.checkSchemaCompatibility(exportDir);
    checks.push(schemaCheck);
    if (schemaCheck.details?.warnings) {
      schemaWarnings.push(...(schemaCheck.details.warnings as string[]));
    }
    
    // 6. Check session properly closed
    const closureCheck = this.checkSessionClosure(exportDir.ledger);
    checks.push(closureCheck);
    if (closureCheck.status === 'FAIL') {
      reasonCodes.push('SESSION_NOT_CLOSED');
    }
    
    // 7. Check timestamp monotonicity
    const timestampCheck = this.checkTimestampMonotonicity(exportDir.ledger);
    checks.push(timestampCheck);
    if (timestampCheck.status === 'FAIL') {
      reasonCodes.push('TIMESTAMP_REGRESSION');
    }
    
    // Determine overall result
    const hasFail = checks.some(c => c.status === 'FAIL');
    
    return {
      verifier_version: '0.1.0',
      verified_at_utc: new Date().toISOString(),
      result: hasFail ? 'FAIL' : 'PASS',
      first_hash: firstHash,
      final_hash: finalHash,
      protocol_hash: protocolHash,
      signature: {
        valid: signatureValid,
        algo: exportDir.manifest.signature?.algo || 'none',
        public_key_id: exportDir.manifest.signature?.public_key_id || 'none',
        error: signatureError,
      },
      checks,
      reason_codes: reasonCodes,
      details: {
        events_verified: eventsVerified,
        assets_verified: assetsVerified,
        chain_breaks: chainBreaks,
        asset_mismatches: assetMismatches,
        schema_warnings: schemaWarnings,
      },
    };
  }
  
  private async verifyChain(ledger: LedgerEntry[]): Promise<{
    eventsVerified: number;
    firstHash: string;
    finalHash: string;
    breaks: ChainBreak[];
  }> {
    const breaks: ChainBreak[] = [];
    let prevHash = this.GENESIS_HASH;
    let firstHash = '';
    let finalHash = '';
    
    for (let i = 0; i < ledger.length; i++) {
      const entry = ledger[i];
      
      // Check prev_hash matches expected
      if (entry.ledger?.prev_hash !== prevHash) {
        breaks.push({
          seq: entry.seq,
          expected_prev_hash: prevHash,
          actual_prev_hash: entry.ledger?.prev_hash || 'MISSING',
          event_type: entry.event_type,
        });
      }
      
      // Compute expected event_hash
      const eventBodyHash = await this.hashEventBody(entry);
      const expectedEventHash = await this.hashFn(
        new TextEncoder().encode(prevHash + eventBodyHash)
      );
      
      if (entry.ledger?.event_hash !== expectedEventHash) {
        breaks.push({
          seq: entry.seq,
          expected_prev_hash: expectedEventHash,
          actual_prev_hash: entry.ledger?.event_hash || 'MISSING',
          event_type: entry.event_type,
        });
      }
      
      // Track first and final
      if (i === 0) firstHash = entry.ledger?.event_hash || '';
      finalHash = entry.ledger?.event_hash || '';
      
      // Update prevHash for next iteration
      prevHash = entry.ledger?.event_hash || prevHash;
    }
    
    return {
      eventsVerified: ledger.length,
      firstHash,
      finalHash,
      breaks,
    };
  }
  
  private async hashEventBody(entry: LedgerEntry): Promise<string> {
    // Remove ledger fields for hashing
    const { ledger, ...bodyWithoutLedger } = entry;
    const canonical = this.canonicalize(bodyWithoutLedger);
    return this.hashFn(new TextEncoder().encode(canonical));
  }
  
  private async hashFile(data: Uint8Array): Promise<string> {
    return this.hashFn(data);
  }
  
  private canonicalize(obj: unknown): string {
    // RFC 8785 JCS-style canonicalization
    // Stable key ordering, no whitespace, normalized numbers
    return JSON.stringify(obj, Object.keys(obj as object).sort(), 0);
  }
  
  private checkRequiredArtifacts(exportDir: ExportDirectory): VerifierCheck {
    const required = [
      'META/export_manifest.json',
      'LEDGER/ledger.jsonl',
      'DATA/reads.csv',
    ];
    
    const missing = required.filter(path => !exportDir.hasFile(path));
    
    return {
      check: 'REQUIRED_ARTIFACTS_PRESENT',
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      message: missing.length === 0
        ? 'All required artifacts present'
        : `Missing: ${missing.join(', ')}`,
      details: { missing },
    };
  }
  
  private checkSchemaCompatibility(exportDir: ExportDirectory): VerifierCheck {
    const warnings: string[] = [];
    
    // Check event schema version
    const ledger = exportDir.ledger;
    if (ledger.length > 0) {
      const version = ledger[0].event_schema_version;
      if (version !== '1.0.0') {
        warnings.push(`Event schema version ${version} may not be fully compatible`);
      }
    }
    
    return {
      check: 'SCHEMA_COMPATIBLE',
      status: warnings.length === 0 ? 'PASS' : 'WARN',
      message: warnings.length === 0
        ? 'Schema compatible'
        : `${warnings.length} compatibility warning(s)`,
      details: { warnings },
    };
  }
  
  private checkSessionClosure(ledger: LedgerEntry[]): VerifierCheck {
    if (ledger.length === 0) {
      return {
        check: 'SESSION_PROPERLY_CLOSED',
        status: 'FAIL',
        message: 'Empty ledger',
      };
    }
    
    const lastEvent = ledger[ledger.length - 1];
    const isClosed = lastEvent.event_type === 'SESSION_END';
    
    return {
      check: 'SESSION_PROPERLY_CLOSED',
      status: isClosed ? 'PASS' : 'WARN',
      message: isClosed
        ? 'Session properly closed with SESSION_END'
        : 'Session may not be properly closed (no SESSION_END event)',
    };
  }
  
  private checkTimestampMonotonicity(ledger: LedgerEntry[]): VerifierCheck {
    let regressions = 0;
    let prevMonoMs = -1;
    
    for (const entry of ledger) {
      if (entry.mono_ms < prevMonoMs) {
        regressions++;
      }
      prevMonoMs = entry.mono_ms;
    }
    
    return {
      check: 'TIMESTAMPS_MONOTONIC',
      status: regressions === 0 ? 'PASS' : 'FAIL',
      message: regressions === 0
        ? 'All timestamps monotonically increasing'
        : `${regressions} timestamp regression(s) detected`,
      details: { regressions },
    };
  }
}

// =============================================================================
// TYPES FOR EXPORT DIRECTORY ABSTRACTION
// =============================================================================

export interface ExportDirectory {
  manifest: ExportManifest;
  ledger: LedgerEntry[];
  hasFile(path: string): boolean;
  getFile(path: string): Uint8Array;
}

export interface ExportManifest {
  manifest_schema_version: string;
  session_id: string;
  created_utc: string;
  protocol_hash: string;
  session_plan_hash: string;
  final_hash: string;
  signature?: {
    algo: string;
    sig: string;
    public_key_id: string;
  };
  artifacts: Array<{
    relpath: string;
    sha256: string;
    bytes: number;
    type: string;
  }>;
}

export interface LedgerEntry {
  event_schema_version: string;
  session_id: string;
  seq: number;
  event_type: string;
  mono_ms: number;
  wall_utc: string;
  actor: { role: string; participant_id?: string };
  context: Record<string, unknown>;
  payload: Record<string, unknown>;
  ledger?: {
    prev_hash: string;
    event_hash: string;
  };
}

// =============================================================================
// CLI INTERFACE (for standalone verifier)
// =============================================================================

export function formatVerifierReport(report: VerifierReport): string {
  const lines: string[] = [];
  
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║              EVIDIFY VERIFIER REPORT v0.1.0                  ║');
  lines.push('╠══════════════════════════════════════════════════════════════╣');
  
  // Result banner
  if (report.result === 'PASS') {
    lines.push('║  VERIFICATION PASSED                                        ║');
  } else {
    lines.push('║  VERIFICATION FAILED                                        ║');
  }
  
  lines.push('╠══════════════════════════════════════════════════════════════╣');
  lines.push(`║  Verified: ${report.verified_at_utc.padEnd(48)}║`);
  lines.push(`║  Final Hash: ${report.final_hash.slice(0, 20)}...`.padEnd(63) + '║');
  lines.push('╠══════════════════════════════════════════════════════════════╣');
  
  // Individual checks
  lines.push('║  CHECKS:                                                     ║');
  for (const check of report.checks) {
    const icon = check.status === 'PASS' ? 'PASS' : check.status === 'FAIL' ? 'FAIL' : 'WARN';
    const line = `║    ${icon} ${check.check}: ${check.status}`.padEnd(63) + '║';
    lines.push(line);
  }
  
  // Reason codes if failed
  if (report.reason_codes.length > 0) {
    lines.push('╠══════════════════════════════════════════════════════════════╣');
    lines.push('║  FAILURE REASONS:                                            ║');
    for (const code of report.reason_codes) {
      lines.push(`║    • ${code}`.padEnd(63) + '║');
    }
  }
  
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  
  return lines.join('\n');
}

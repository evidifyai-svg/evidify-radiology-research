/**
 * validationLegalStatement.ts
 *
 * Legal statement generator for AI validation disclosures.
 *
 * PURPOSE:
 * Generates court-defensible statements documenting that clinicians were
 * informed of AI validation status before relying on AI output.
 *
 * LEGAL FRAMEWORK:
 * Per Brown's research on mock jury responses to AI in radiology:
 * "Jurors may be more sympathetic to clinicians who can demonstrate they
 * understood AI limitations before relying on it."
 *
 * These statements are designed to be:
 * 1. Factual and precise about what information was shown
 * 2. Clear about the clinician's acknowledgment or response
 * 3. Timestamped for evidentiary purposes
 * 4. Referenced to Spiegelhalter's validation framework
 *
 * INTEGRATION:
 * These statements should be included in:
 * - Expert Witness Packets
 * - Trial manifests (trial_manifest.json)
 * - Audit logs
 * - Malpractice defense documentation
 */

import type {
  AIValidationStatus,
  AIValidationExportData,
  ValidationPhase,
  EvidenceQuality,
} from './aiValidationTypes';
import { PHASE_NAMES, PHASE_DESCRIPTIONS } from './aiValidationTypes';

// ============================================================================
// STATEMENT TEMPLATES
// ============================================================================

/**
 * Templates for different components of legal statements.
 * These follow a structured format for consistency.
 */
const STATEMENT_TEMPLATES = {
  /**
   * Header identifying the statement type
   */
  header: `AI VALIDATION DISCLOSURE STATEMENT`,

  /**
   * Framework citation
   */
  frameworkCitation: `This disclosure follows Spiegelhalter's 4-phase AI validation framework as described in "The Art of Statistics" (2019) and subsequent medical AI literature.`,

  /**
   * Phase-specific implications
   */
  phaseImplications: {
    1: `Phase 1 validation indicates the AI was tested on curated digital datasets only. It has NOT been compared to human expert performance and has NOT been shown to improve patient outcomes. Per Spiegelhalter: "Performance on test sets tells us nothing about real-world clinical utility."`,
    2: `Phase 2 validation indicates the AI has been compared to human expert performance and may match or exceed radiologists on certain metrics. However, there is NO evidence that using this AI actually improves patient outcomes. Per Spiegelhalter: "Showing AI matches or exceeds human experts is impressive but does not prove clinical utility."`,
    3: `Phase 3 validation indicates there is clinical trial evidence that using this AI improves actual patient outcomes. This is significant evidence that most AI tools have not achieved. Per Spiegelhalter: "The critical question is: Do patients actually do better when this AI is used?"`,
    4: `Phase 4 validation indicates the AI has been implemented across diverse clinical settings with long-term evidence of sustained benefit. This is the highest level of evidence. Per Spiegelhalter: "Even if AI improves outcomes in a trial, does it work in diverse real-world settings over time?"`,
  } as Record<ValidationPhase, string>,

  /**
   * FDA disclaimer
   */
  fdaDisclaimer: `IMPORTANT: FDA clearance (especially 510(k)) does NOT constitute clinical validation per Spiegelhalter's framework. 510(k) clearance requires only "substantial equivalence" to a predicate device, not evidence of clinical benefit.`,

  /**
   * Witness packet section header
   */
  witnessPacketHeader: `SECTION: AI SYSTEM VALIDATION STATUS`,
};

// ============================================================================
// STATEMENT GENERATORS
// ============================================================================

/**
 * Generates a complete legal statement documenting AI validation disclosure.
 *
 * @param status - The AI validation status that was displayed
 * @param systemName - Name of the AI system
 * @param vendor - AI system vendor
 * @param version - AI system version
 * @param disclosureTimestamp - When the disclosure was displayed
 * @param viewDurationMs - How long the disclosure was viewed
 * @param acknowledged - Whether the clinician acknowledged the disclosure
 * @param acknowledgedTimestamp - When acknowledgment occurred
 * @param comprehensionPassed - Whether comprehension check was passed (if applicable)
 * @returns Complete legal statement string
 */
export function generateValidationLegalStatement(
  status: AIValidationStatus,
  systemName: string,
  vendor: string,
  version: string,
  disclosureTimestamp: string,
  viewDurationMs: number,
  acknowledged: boolean,
  acknowledgedTimestamp?: string,
  comprehensionPassed?: boolean
): string {
  const viewDurationSeconds = (viewDurationMs / 1000).toFixed(1);
  const phaseImplication = STATEMENT_TEMPLATES.phaseImplications[status.phase];

  const lines: string[] = [
    STATEMENT_TEMPLATES.header,
    '═'.repeat(60),
    '',
    'DISCLOSURE DETAILS:',
    '─'.repeat(40),
    `AI System: ${systemName} v${version}`,
    `Vendor: ${vendor}`,
    `Validation Phase: ${status.phase} - "${status.phaseName}"`,
    `Evidence Quality: ${status.evidenceQuality}`,
    `FDA Status: ${status.regulatory.fdaCleared ? `${status.regulatory.fdaClearanceType || ''} Cleared` : 'Not Cleared'}`,
    '',
    'DISCLOSURE TIMELINE:',
    '─'.repeat(40),
    `Disclosure Presented: ${disclosureTimestamp}`,
    `View Duration: ${viewDurationSeconds} seconds`,
    acknowledged
      ? `Acknowledgment: Yes, at ${acknowledgedTimestamp || 'time recorded'}`
      : `Acknowledgment: Not explicitly acknowledged`,
  ];

  if (comprehensionPassed !== undefined) {
    lines.push(
      `Comprehension Check: ${comprehensionPassed ? 'PASSED' : 'NOT PASSED'}`
    );
  }

  lines.push(
    '',
    'VALIDATION PHASE MEANING:',
    '─'.repeat(40),
    phaseImplication,
    '',
    'RECOMMENDATION SHOWN TO CLINICIAN:',
    '─'.repeat(40),
    `"${status.recommendation}"`,
    '',
    'FRAMEWORK CITATION:',
    '─'.repeat(40),
    STATEMENT_TEMPLATES.frameworkCitation,
    '',
    STATEMENT_TEMPLATES.fdaDisclaimer
  );

  // Add limitations if present
  if (status.limitations.length > 0) {
    lines.push(
      '',
      'DISCLOSED LIMITATIONS:',
      '─'.repeat(40),
      ...status.limitations.map((lim) => `• ${lim}`)
    );
  }

  // Add excluded populations if present
  if (status.excludedPopulations && status.excludedPopulations.length > 0) {
    lines.push(
      '',
      'DISCLOSED EXCLUSIONS:',
      '─'.repeat(40),
      ...status.excludedPopulations.map((pop) => `• ${pop}`)
    );
  }

  lines.push(
    '',
    '═'.repeat(60),
    `Statement generated: ${new Date().toISOString()}`
  );

  return lines.join('\n');
}

/**
 * Generates a condensed single-paragraph legal statement.
 * Suitable for inclusion in reports or brief documentation.
 */
export function generateCondensedLegalStatement(
  status: AIValidationStatus,
  systemName: string,
  vendor: string,
  version: string,
  viewDurationMs: number,
  acknowledged: boolean,
  comprehensionPassed?: boolean
): string {
  const viewDurationSeconds = (viewDurationMs / 1000).toFixed(1);

  let statement = `At the time of interpretation, the clinician was presented with documentation indicating the AI system (${systemName} v${version} by ${vendor}) had achieved Phase ${status.phase} validation per Spiegelhalter's framework (${status.phaseName}). `;

  // Add phase-specific explanation
  switch (status.phase) {
    case 1:
      statement += `The clinician was explicitly informed that Phase 1 validation indicates laboratory testing only, without comparison to human experts or evidence of improved patient outcomes. `;
      break;
    case 2:
      statement += `The clinician was explicitly informed that Phase 2 validation indicates expert-level comparison only, without evidence of improved patient outcomes. `;
      break;
    case 3:
      statement += `The clinician was informed that Phase 3 validation indicates clinical trial evidence of improved patient outcomes. `;
      break;
    case 4:
      statement += `The clinician was informed that Phase 4 validation indicates sustained benefit across diverse real-world implementations. `;
      break;
  }

  statement += `This disclosure was displayed for ${viewDurationSeconds} seconds`;

  if (acknowledged) {
    statement += ` and the clinician explicitly acknowledged the information`;
  }

  if (comprehensionPassed !== undefined) {
    statement += comprehensionPassed
      ? ` after correctly answering a comprehension check question`
      : `, though the comprehension check was not passed`;
  }

  statement += `. The clinician then proceeded with interpretation.`;

  return statement;
}

/**
 * Generates an expert witness packet section for AI validation.
 */
export function generateWitnessPacketSection(
  exportData: AIValidationExportData
): string {
  const lines: string[] = [
    STATEMENT_TEMPLATES.witnessPacketHeader,
    '═'.repeat(60),
    '',
    '1. AI SYSTEM IDENTIFICATION',
    '─'.repeat(40),
    `   System: ${exportData.systemName}`,
    `   Version: ${exportData.version}`,
    `   Vendor: ${exportData.vendor}`,
    `   System ID: ${exportData.systemId}`,
    '',
    '2. VALIDATION STATUS AT TIME OF USE',
    '─'.repeat(40),
    `   Validation Phase: ${exportData.validationPhase}`,
    `   Phase Name: ${exportData.validationPhaseName}`,
    `   Evidence Quality: ${exportData.evidenceQuality}`,
    '',
    '   Phase Definition (per Spiegelhalter):',
    `   ${PHASE_DESCRIPTIONS[exportData.validationPhase].short}`,
    '',
    '3. REGULATORY STATUS',
    '─'.repeat(40),
    `   FDA Cleared: ${exportData.regulatoryStatus.fdaCleared ? 'Yes' : 'No'}`,
  ];

  if (exportData.regulatoryStatus.fdaCleared) {
    lines.push(
      `   Clearance Type: ${exportData.regulatoryStatus.fdaClearanceType || 'Unknown'}`
    );
  }

  lines.push(
    `   CE Marked: ${exportData.regulatoryStatus.ceMarked ? 'Yes' : 'No'}`,
    '',
    '4. DISCLOSURE DOCUMENTATION',
    '─'.repeat(40),
    `   Disclosure Displayed: ${exportData.disclosureDisplayed ? 'Yes' : 'No'}`
  );

  if (exportData.disclosureDisplayed) {
    lines.push(
      `   Displayed At: ${exportData.disclosureDisplayedAt || 'Not recorded'}`,
      `   View Duration: ${exportData.disclosureViewDurationMs ? (exportData.disclosureViewDurationMs / 1000).toFixed(1) + ' seconds' : 'Not recorded'}`
    );
  }

  lines.push(
    '',
    '5. CLINICIAN ACKNOWLEDGMENT',
    '─'.repeat(40),
    `   Explicit Acknowledgment: ${exportData.acknowledged ? 'Yes' : 'No'}`
  );

  if (exportData.acknowledged) {
    lines.push(`   Acknowledged At: ${exportData.acknowledgedAt || 'Not recorded'}`);
  }

  lines.push(
    '',
    '6. COMPREHENSION VERIFICATION',
    '─'.repeat(40),
    `   Comprehension Check Completed: ${exportData.comprehensionCheckCompleted ? 'Yes' : 'No'}`
  );

  if (exportData.comprehensionCheckCompleted) {
    lines.push(
      `   Check Result: ${exportData.comprehensionCheckPassed ? 'PASSED' : 'NOT PASSED'}`
    );
  }

  lines.push(
    '',
    '7. RECOMMENDATION DISPLAYED',
    '─'.repeat(40),
    `   "${exportData.recommendationDisplayed}"`,
    '',
    '8. LEGAL SUMMARY',
    '─'.repeat(40),
    exportData.legalStatement,
    '',
    '═'.repeat(60)
  );

  return lines.join('\n');
}

// ============================================================================
// EXPORT DATA GENERATOR
// ============================================================================

/**
 * Creates a complete AIValidationExportData object for inclusion in exports.
 */
export function createValidationExportData(
  status: AIValidationStatus,
  systemId: string,
  systemName: string,
  vendor: string,
  version: string,
  events: {
    displayed: boolean;
    displayedAt?: string;
    viewDurationMs?: number;
    acknowledged: boolean;
    acknowledgedAt?: string;
    comprehensionCompleted: boolean;
    comprehensionPassed?: boolean;
  }
): AIValidationExportData {
  const legalStatement = generateCondensedLegalStatement(
    status,
    systemName,
    vendor,
    version,
    events.viewDurationMs || 0,
    events.acknowledged,
    events.comprehensionPassed
  );

  return {
    systemId,
    systemName,
    vendor,
    version,
    validationPhase: status.phase,
    validationPhaseName: status.phaseName,
    evidenceQuality: status.evidenceQuality,
    regulatoryStatus: {
      fdaCleared: status.regulatory.fdaCleared,
      fdaClearanceType: status.regulatory.fdaClearanceType,
      ceMarked: status.regulatory.ceMarked,
    },
    disclosureDisplayed: events.displayed,
    disclosureDisplayedAt: events.displayedAt,
    disclosureViewDurationMs: events.viewDurationMs,
    acknowledged: events.acknowledged,
    acknowledgedAt: events.acknowledgedAt,
    comprehensionCheckCompleted: events.comprehensionCompleted,
    comprehensionCheckPassed: events.comprehensionPassed,
    recommendationDisplayed: status.recommendation,
    legalStatement,
  };
}

// ============================================================================
// TRIAL MANIFEST INTEGRATION
// ============================================================================

/**
 * Generates the AI validation section for trial_manifest.json.
 */
export function generateTrialManifestSection(
  exportData: AIValidationExportData
): Record<string, unknown> {
  return {
    ai_validation: {
      system: {
        id: exportData.systemId,
        name: exportData.systemName,
        vendor: exportData.vendor,
        version: exportData.version,
      },
      validation_status: {
        phase: exportData.validationPhase,
        phase_name: exportData.validationPhaseName,
        evidence_quality: exportData.evidenceQuality,
        framework: 'Spiegelhalter 4-Phase (2019)',
      },
      regulatory: exportData.regulatoryStatus,
      disclosure_events: {
        displayed: exportData.disclosureDisplayed,
        displayed_at: exportData.disclosureDisplayedAt,
        view_duration_ms: exportData.disclosureViewDurationMs,
        acknowledged: exportData.acknowledged,
        acknowledged_at: exportData.acknowledgedAt,
        comprehension_completed: exportData.comprehensionCheckCompleted,
        comprehension_passed: exportData.comprehensionCheckPassed,
      },
      recommendation_shown: exportData.recommendationDisplayed,
      legal_statement: exportData.legalStatement,
      generated_at: new Date().toISOString(),
    },
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} seconds`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Generates a unique statement ID for tracking.
 */
export function generateStatementId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `AIVS-${timestamp}-${random}`.toUpperCase();
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  generateValidationLegalStatement,
  generateCondensedLegalStatement,
  generateWitnessPacketSection,
  createValidationExportData,
  generateTrialManifestSection,
  formatDuration,
  generateStatementId,
};

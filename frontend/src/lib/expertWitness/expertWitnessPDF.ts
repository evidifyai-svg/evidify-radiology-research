/**
 * Expert Witness Packet PDF Generator
 *
 * Generates professional, court-ready PDF documents from the
 * enhanced expert witness packet.
 *
 * Uses jsPDF for PDF generation with custom formatting for
 * legal document standards.
 */

import { jsPDF } from 'jspdf';
import {
  EnhancedExpertWitnessPacket,
  PDFGenerationOptions,
} from './expertWitnessTypes';

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN_LEFT = 25;
const MARGIN_RIGHT = 25;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 30;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const FONTS = {
  TITLE: 16,
  SECTION_HEADER: 14,
  SUBSECTION_HEADER: 12,
  BODY: 10,
  SMALL: 8,
  MONO: 9,
};

const COLORS = {
  PRIMARY: '#1a1a1a',
  SECONDARY: '#666666',
  ACCENT: '#0066cc',
  SUCCESS: '#166534',
  WARNING: '#854d0e',
  ERROR: '#991b1b',
  BORDER: '#dddddd',
  BACKGROUND_LIGHT: '#f5f5f5',
};

// =============================================================================
// DEFAULT OPTIONS
// =============================================================================

export const DEFAULT_PDF_OPTIONS: PDFGenerationOptions = {
  includeTableOfContents: true,
  includePageNumbers: true,
  includeHeaderFooter: true,
  sections: {
    executiveSummary: true,
    workflowCompliance: true,
    caseDifficulty: true,
    errorClassification: true,
    cognitiveLoad: true,
    aiDisclosure: true,
    attentionAnalysis: true,
    cryptographicVerification: true,
    appendices: {
      fullEventLog: false,
      heatmap: false,
      caseImages: false,
      aiSpecs: true,
      citations: true,
      glossary: true,
    },
  },
  colorScheme: 'professional',
  fontSize: 'normal',
  anonymizeClinicianId: true,
  redactPatientInfo: true,
};

// =============================================================================
// PDF GENERATOR CLASS
// =============================================================================

export class ExpertWitnessPDFGenerator {
  private doc: jsPDF;
  private packet: EnhancedExpertWitnessPacket;
  private options: PDFGenerationOptions;
  private currentY: number = MARGIN_TOP;
  private pageNumber: number = 1;
  private tocEntries: Array<{ title: string; page: number }> = [];

  constructor(
    packet: EnhancedExpertWitnessPacket,
    options: Partial<PDFGenerationOptions> = {}
  ) {
    this.packet = packet;
    this.options = { ...DEFAULT_PDF_OPTIONS, ...options };
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
  }

  /**
   * Generate the PDF and return as Buffer
   */
  generate(): Uint8Array {
    this.setupDocument();
    this.renderCoverPage();

    if (this.options.includeTableOfContents) {
      this.addPage();
      this.renderTableOfContents();
    }

    // Render sections
    if (this.options.sections.executiveSummary) {
      this.addPage();
      this.renderExecutiveSummary();
    }

    if (this.options.sections.workflowCompliance) {
      this.addPage();
      this.renderWorkflowCompliance();
    }

    if (this.options.sections.caseDifficulty) {
      this.addPage();
      this.renderCaseDifficulty();
    }

    if (this.options.sections.errorClassification && this.packet.errorClassification) {
      this.addPage();
      this.renderErrorClassification();
    }

    if (this.options.sections.cognitiveLoad) {
      this.addPage();
      this.renderCognitiveLoad();
    }

    if (this.options.sections.aiDisclosure) {
      this.addPage();
      this.renderAIDisclosure();
    }

    if (this.options.sections.attentionAnalysis) {
      this.addPage();
      this.renderAttentionAnalysis();
    }

    if (this.options.sections.cryptographicVerification) {
      this.addPage();
      this.renderCryptographicVerification();
    }

    // Render appendices
    this.addPage();
    this.renderAppendices();

    // Add page numbers if requested
    if (this.options.includePageNumbers) {
      this.addPageNumbers();
    }

    return this.doc.output('arraybuffer') as unknown as Uint8Array;
  }

  /**
   * Generate PDF as Blob for download
   */
  toBlob(): Blob {
    const buffer = this.generate();
    return new Blob([buffer], { type: 'application/pdf' });
  }

  /**
   * Generate PDF as data URL
   */
  toDataURL(): string {
    this.generate();
    return this.doc.output('dataurlstring');
  }

  /**
   * Trigger download of PDF
   */
  download(filename?: string): void {
    this.generate();
    const name = filename || `expert-witness-packet-${this.packet.packetId}.pdf`;
    this.doc.save(name);
  }

  // ===========================================================================
  // SETUP & UTILITIES
  // ===========================================================================

  private setupDocument(): void {
    this.doc.setFont('helvetica');
    this.doc.setFontSize(FONTS.BODY);
    this.doc.setTextColor(COLORS.PRIMARY);
  }

  private addPage(): void {
    if (this.pageNumber > 1 || this.currentY > MARGIN_TOP + 50) {
      this.doc.addPage();
      this.pageNumber++;
      this.currentY = MARGIN_TOP;
    }

    if (this.options.includeHeaderFooter) {
      this.renderHeader();
    }
  }

  private renderHeader(): void {
    const headerY = 15;
    this.doc.setFontSize(FONTS.SMALL);
    this.doc.setTextColor(COLORS.SECONDARY);
    this.doc.text(`Case ID: ${this.packet.executiveSummary.caseId}`, MARGIN_LEFT, headerY);
    this.doc.text(`Packet ID: ${this.packet.packetId}`, PAGE_WIDTH - MARGIN_RIGHT, headerY, { align: 'right' });

    // Header line
    this.doc.setDrawColor(COLORS.BORDER);
    this.doc.line(MARGIN_LEFT, headerY + 3, PAGE_WIDTH - MARGIN_RIGHT, headerY + 3);

    this.doc.setTextColor(COLORS.PRIMARY);
  }

  private addPageNumbers(): void {
    const totalPages = this.doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(FONTS.SMALL);
      this.doc.setTextColor(COLORS.SECONDARY);
      this.doc.text(
        `Page ${i} of ${totalPages}`,
        PAGE_WIDTH / 2,
        PAGE_HEIGHT - 15,
        { align: 'center' }
      );
    }
  }

  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > PAGE_HEIGHT - MARGIN_BOTTOM) {
      this.addPage();
    }
  }

  private addTocEntry(title: string): void {
    this.tocEntries.push({ title, page: this.pageNumber });
  }

  private renderSectionTitle(title: string): void {
    this.checkPageBreak(15);
    this.doc.setFontSize(FONTS.SECTION_HEADER);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, MARGIN_LEFT, this.currentY);
    this.currentY += 3;

    // Underline
    this.doc.setDrawColor(COLORS.PRIMARY);
    this.doc.setLineWidth(0.5);
    this.doc.line(MARGIN_LEFT, this.currentY, PAGE_WIDTH - MARGIN_RIGHT, this.currentY);
    this.currentY += 8;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(FONTS.BODY);

    this.addTocEntry(title);
  }

  private renderSubsectionTitle(title: string): void {
    this.checkPageBreak(12);
    this.doc.setFontSize(FONTS.SUBSECTION_HEADER);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, MARGIN_LEFT, this.currentY);
    this.currentY += 6;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(FONTS.BODY);
  }

  private renderParagraph(text: string, indent: number = 0): void {
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH - indent);
    const lineHeight = 5;

    for (const line of lines) {
      this.checkPageBreak(lineHeight);
      this.doc.text(line, MARGIN_LEFT + indent, this.currentY);
      this.currentY += lineHeight;
    }
    this.currentY += 3;
  }

  private renderBulletPoint(text: string, indent: number = 5): void {
    const bullet = '•';
    this.checkPageBreak(5);
    this.doc.text(bullet, MARGIN_LEFT + indent, this.currentY);

    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH - indent - 8);
    let first = true;
    for (const line of lines) {
      if (!first) {
        this.checkPageBreak(5);
      }
      this.doc.text(line, MARGIN_LEFT + indent + 5, this.currentY);
      this.currentY += 5;
      first = false;
    }
  }

  private renderCheckItem(passed: boolean, text: string): void {
    const icon = passed ? '✓' : '✗';
    const color = passed ? COLORS.SUCCESS : COLORS.ERROR;

    this.checkPageBreak(6);
    this.doc.setTextColor(color);
    this.doc.text(icon, MARGIN_LEFT + 5, this.currentY);
    this.doc.setTextColor(COLORS.PRIMARY);

    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH - 15);
    let first = true;
    for (const line of lines) {
      if (!first) {
        this.checkPageBreak(5);
      }
      this.doc.text(line, MARGIN_LEFT + 12, this.currentY);
      this.currentY += 5;
      first = false;
    }
  }

  private renderStatusBadge(status: string, color: string): void {
    const width = this.doc.getTextWidth(status) + 6;
    const height = 6;

    // Background
    this.doc.setFillColor(color);
    this.doc.roundedRect(MARGIN_LEFT, this.currentY - 4, width, height, 1, 1, 'F');

    // Text
    this.doc.setTextColor('#ffffff');
    this.doc.setFontSize(FONTS.SMALL);
    this.doc.text(status, MARGIN_LEFT + 3, this.currentY);
    this.doc.setTextColor(COLORS.PRIMARY);
    this.doc.setFontSize(FONTS.BODY);

    this.currentY += 8;
  }

  private renderTable(
    headers: string[],
    rows: string[][],
    columnWidths?: number[]
  ): void {
    const defaultWidth = CONTENT_WIDTH / headers.length;
    const widths = columnWidths || headers.map(() => defaultWidth);
    const rowHeight = 7;
    const padding = 2;

    // Check if we need a page break for the header
    this.checkPageBreak(rowHeight * 2);

    let startX = MARGIN_LEFT;

    // Header row
    this.doc.setFillColor(COLORS.BACKGROUND_LIGHT);
    this.doc.rect(MARGIN_LEFT, this.currentY - 4, CONTENT_WIDTH, rowHeight, 'F');
    this.doc.setFont('helvetica', 'bold');

    for (let i = 0; i < headers.length; i++) {
      this.doc.text(headers[i], startX + padding, this.currentY);
      startX += widths[i];
    }

    this.doc.setFont('helvetica', 'normal');
    this.currentY += rowHeight;

    // Data rows
    for (const row of rows) {
      this.checkPageBreak(rowHeight);
      startX = MARGIN_LEFT;

      // Draw row border
      this.doc.setDrawColor(COLORS.BORDER);
      this.doc.line(MARGIN_LEFT, this.currentY + 3, PAGE_WIDTH - MARGIN_RIGHT, this.currentY + 3);

      for (let i = 0; i < row.length; i++) {
        const text = row[i] || '';
        const truncated = text.length > 50 ? text.substring(0, 47) + '...' : text;
        this.doc.text(truncated, startX + padding, this.currentY);
        startX += widths[i];
      }

      this.currentY += rowHeight;
    }

    this.currentY += 5;
  }

  // ===========================================================================
  // SECTION RENDERERS
  // ===========================================================================

  private renderCoverPage(): void {
    // Title
    this.currentY = 80;
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('EXPERT WITNESS PACKET', PAGE_WIDTH / 2, this.currentY, { align: 'center' });

    this.currentY += 15;
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Clinical Decision Documentation', PAGE_WIDTH / 2, this.currentY, { align: 'center' });

    // Divider
    this.currentY += 20;
    this.doc.setDrawColor(COLORS.PRIMARY);
    this.doc.setLineWidth(1);
    this.doc.line(60, this.currentY, PAGE_WIDTH - 60, this.currentY);

    // Case info
    this.currentY += 20;
    this.doc.setFontSize(FONTS.BODY);

    const info = [
      ['Packet ID:', this.packet.packetId],
      ['Case ID:', this.packet.executiveSummary.caseId],
      ['Session ID:', this.packet.executiveSummary.sessionId],
      ['Clinician ID:', this.packet.executiveSummary.clinicianId],
      ['Generated:', new Date(this.packet.generatedAt).toLocaleString()],
      ['Version:', this.packet.version],
    ];

    for (const [label, value] of info) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(label, 60, this.currentY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(value, 100, this.currentY);
      this.currentY += 7;
    }

    // Footer notice
    this.currentY = PAGE_HEIGHT - 50;
    this.doc.setFontSize(FONTS.SMALL);
    this.doc.setTextColor(COLORS.SECONDARY);
    this.doc.text('CONFIDENTIAL - FOR LEGAL PURPOSES ONLY', PAGE_WIDTH / 2, this.currentY, { align: 'center' });
    this.currentY += 5;
    this.doc.text('Generated by Evidify Clinical Decision Documentation Platform', PAGE_WIDTH / 2, this.currentY, { align: 'center' });
    this.doc.setTextColor(COLORS.PRIMARY);
  }

  private renderTableOfContents(): void {
    this.renderSectionTitle('TABLE OF CONTENTS');

    const sections = [
      { num: '1', title: 'Executive Summary', enabled: this.options.sections.executiveSummary },
      { num: '2', title: 'Workflow Compliance', enabled: this.options.sections.workflowCompliance },
      { num: '3', title: 'Case Difficulty Analysis', enabled: this.options.sections.caseDifficulty },
      { num: '4', title: 'Error Classification', enabled: this.options.sections.errorClassification && !!this.packet.errorClassification },
      { num: '5', title: 'Cognitive Load Analysis', enabled: this.options.sections.cognitiveLoad },
      { num: '6', title: 'AI Disclosure Compliance', enabled: this.options.sections.aiDisclosure },
      { num: '7', title: 'Attention Analysis', enabled: this.options.sections.attentionAnalysis },
      { num: '8', title: 'Cryptographic Verification', enabled: this.options.sections.cryptographicVerification },
      { num: '9', title: 'Appendices', enabled: true },
    ];

    for (const section of sections) {
      if (section.enabled) {
        this.doc.text(`${section.num}. ${section.title}`, MARGIN_LEFT + 10, this.currentY);
        this.currentY += 7;
      }
    }
  }

  private renderExecutiveSummary(): void {
    const summary = this.packet.executiveSummary;
    this.renderSectionTitle('1. EXECUTIVE SUMMARY');

    // Case identification table
    this.renderTable(
      ['Field', 'Value'],
      [
        ['Case ID', summary.caseId],
        ['Session ID', summary.sessionId],
        ['Clinician ID', summary.clinicianId],
      ],
      [60, 100]
    );

    // Summary paragraph
    this.renderSubsectionTitle('Summary');
    this.renderParagraph(summary.executiveSummary);

    // Key Findings
    this.renderSubsectionTitle('Key Findings');
    this.renderTable(
      ['Finding', 'Status'],
      [
        ['Workflow Compliance', summary.keyFindings.workflowCompliance],
        ['Case Difficulty', `${summary.keyFindings.caseDifficulty.compositeScore}/100 (${summary.keyFindings.caseDifficulty.difficultyLevel})`],
        ['AI Disclosure Score', `${summary.keyFindings.aiDisclosureCompliance.overallScore}/4 (${summary.keyFindings.aiDisclosureCompliance.complianceLevel})`],
        ['Workload Status', summary.keyFindings.workloadStatus.thresholdStatus],
      ],
      [80, 80]
    );

    // Liability Assessment
    this.renderSubsectionTitle('Liability Assessment');

    const levelColor = summary.liabilityAssessment.level === 'LOW' ? COLORS.SUCCESS :
      summary.liabilityAssessment.level === 'MODERATE' ? COLORS.WARNING : COLORS.ERROR;
    this.renderStatusBadge(`${summary.liabilityAssessment.level} RISK`, levelColor);

    if (summary.liabilityAssessment.mitigatingFactors.length > 0) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Mitigating Factors:', MARGIN_LEFT, this.currentY);
      this.doc.setFont('helvetica', 'normal');
      this.currentY += 5;

      for (const factor of summary.liabilityAssessment.mitigatingFactors) {
        this.renderBulletPoint(factor);
      }
    }

    if (summary.liabilityAssessment.aggravatingFactors.length > 0) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Aggravating Factors:', MARGIN_LEFT, this.currentY);
      this.doc.setFont('helvetica', 'normal');
      this.currentY += 5;

      for (const factor of summary.liabilityAssessment.aggravatingFactors) {
        this.renderBulletPoint(factor);
      }
    }

    this.currentY += 3;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Recommendation: ', MARGIN_LEFT, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    const recLines = this.doc.splitTextToSize(summary.liabilityAssessment.recommendation, CONTENT_WIDTH - 30);
    this.doc.text(recLines, MARGIN_LEFT + 30, this.currentY);
    this.currentY += recLines.length * 5 + 5;
  }

  private renderWorkflowCompliance(): void {
    const compliance = this.packet.workflowCompliance;
    this.renderSectionTitle('2. WORKFLOW COMPLIANCE REPORT');

    const statusColor = compliance.overallStatus === 'COMPLIANT' ? COLORS.SUCCESS :
      compliance.overallStatus === 'PARTIAL' ? COLORS.WARNING : COLORS.ERROR;
    this.renderStatusBadge(compliance.overallStatus, statusColor);

    // Checks
    this.renderSubsectionTitle('Compliance Checks');
    this.renderCheckItem(
      compliance.checks.independentAssessmentRecorded.passed,
      compliance.checks.independentAssessmentRecorded.description
    );
    this.renderCheckItem(
      compliance.checks.assessmentCryptographicallyLocked.passed,
      compliance.checks.assessmentCryptographicallyLocked.description
    );
    this.renderCheckItem(
      compliance.checks.aiRevealAfterLock.passed,
      compliance.checks.aiRevealAfterLock.description
    );
    this.renderCheckItem(
      compliance.checks.deviationDocumented.passed,
      compliance.checks.deviationDocumented.description
    );
    this.renderCheckItem(
      compliance.checks.hashChainVerified.passed,
      compliance.checks.hashChainVerified.description
    );

    // Timeline
    this.renderSubsectionTitle('Workflow Timeline');
    this.renderTable(
      ['Stage', 'Timestamp', 'Description'],
      compliance.timeline.map(t => [t.stage, t.timestamp, t.description]),
      [50, 60, 50]
    );
  }

  private renderCaseDifficulty(): void {
    const cdi = this.packet.caseDifficultyAnalysis;
    this.renderSectionTitle('3. CASE DIFFICULTY ANALYSIS');

    // Score summary
    this.renderTable(
      ['Metric', 'Value'],
      [
        ['Composite Difficulty Score', `${cdi.compositeScore}/100`],
        ['Difficulty Level', cdi.difficultyLevel],
        ['Percentile', `${cdi.percentile}th (harder than ${cdi.percentile}% of comparison cases)`],
        ['RADPEER Prediction', `Score ${cdi.radpeerPrediction.expectedScore} - "${cdi.radpeerPrediction.scoreDescription}"`],
      ],
      [60, 100]
    );

    // Factors
    this.renderSubsectionTitle('Difficulty Factors');
    const factorRows: string[][] = [];

    if (cdi.factors.breastDensity) {
      factorRows.push(['Breast Density', `BI-RADS ${cdi.factors.breastDensity.biradsCategory}`, `${cdi.factors.breastDensity.score}/5`]);
    }
    if (cdi.factors.findingConspicuity) {
      factorRows.push(['Finding Conspicuity', cdi.factors.findingConspicuity.type, `${cdi.factors.findingConspicuity.score}/5`]);
    }
    if (cdi.factors.findingSize) {
      factorRows.push(['Finding Size', `${cdi.factors.findingSize.sizeMm}mm`, `${cdi.factors.findingSize.score}/5`]);
    }
    if (cdi.factors.findingLocation) {
      factorRows.push(['Location', cdi.factors.findingLocation.location, `${cdi.factors.findingLocation.score}/5`]);
    }
    if (cdi.factors.distractors) {
      factorRows.push(['Distractors', `${cdi.factors.distractors.count} present`, `${cdi.factors.distractors.score}/5`]);
    }

    if (factorRows.length > 0) {
      this.renderTable(['Factor', 'Value', 'Score'], factorRows, [50, 70, 40]);
    }

    // Scientific basis
    this.renderSubsectionTitle('Scientific Basis');
    this.renderParagraph(cdi.scientificBasis);

    this.doc.setFont('helvetica', 'bold');
    this.renderParagraph(cdi.missRateExpectation);
    this.doc.setFont('helvetica', 'normal');
  }

  private renderErrorClassification(): void {
    const classification = this.packet.errorClassification;
    if (!classification) return;

    this.renderSectionTitle('4. WOLFE ERROR CLASSIFICATION');

    if (classification.primaryError === 'NO_ERROR') {
      this.renderParagraph('No diagnostic error occurred.');
      return;
    }

    // Classification summary
    this.renderTable(
      ['Metric', 'Value'],
      [
        ['Classification', classification.primaryError.replace(/_/g, ' ')],
        ['Confidence', `${classification.confidence}%`],
      ],
      [60, 100]
    );

    // Evidence
    this.renderSubsectionTitle('Evidence Supporting Classification');
    this.renderCheckItem(classification.evidence.regionViewed, `Region was ${classification.evidence.regionViewed ? 'viewed' : 'NOT viewed'}`);
    this.renderBulletPoint(`Dwell time: ${(classification.evidence.dwellTimeMs / 1000).toFixed(1)} seconds`);
    this.renderBulletPoint(`Zoom level: ${classification.evidence.zoomLevel.toFixed(1)}x`);
    this.renderCheckItem(!classification.evidence.notedInInitialAssessment, `Finding was ${classification.evidence.notedInInitialAssessment ? '' : 'not '}noted in initial assessment`);

    // Scientific context
    this.renderSubsectionTitle('Scientific Context');
    this.renderParagraph(classification.scientificContext);
    this.renderParagraph(`Expected rate range: ${classification.expectedRateRange.min}% - ${classification.expectedRateRange.max}%`);

    // Liability implications
    this.renderSubsectionTitle('Liability Implications');
    this.renderParagraph(classification.liabilityImplications);
  }

  private renderCognitiveLoad(): void {
    const workload = this.packet.cognitiveLoadAnalysis;
    this.renderSectionTitle('5. COGNITIVE LOAD ANALYSIS');

    // Session stats
    this.renderSubsectionTitle('Session Workload at Time of Error');
    this.renderTable(
      ['Metric', 'Value'],
      [
        ['Cases completed', `${workload.casesCompletedInSession} of ${workload.totalSessionCases}`],
        ['Session duration', `${workload.sessionDurationMinutes.toFixed(0)} minutes`],
        ['Average time per case', `${workload.averageTimePerCaseMinutes.toFixed(1)} minutes`],
        ['Cases per hour', workload.casesPerHour.toFixed(1)],
      ],
      [60, 100]
    );

    // Threshold status
    const statusColor = workload.thresholdStatus === 'GREEN' ? COLORS.SUCCESS :
      workload.thresholdStatus === 'YELLOW' ? COLORS.WARNING : COLORS.ERROR;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('MACKNIK THRESHOLD STATUS: ', MARGIN_LEFT, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.renderStatusBadge(workload.thresholdStatus, statusColor);

    this.renderParagraph(workload.thresholdStatusExplanation);

    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`FATIGUE INDEX: ${workload.fatigueIndex}/100 (${workload.fatigueLevel})`, MARGIN_LEFT, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.currentY += 8;

    // Scientific basis
    this.renderSubsectionTitle('Scientific Basis');
    this.renderParagraph(workload.scientificBasis);

    // Conclusion
    this.renderSubsectionTitle('Conclusion');
    this.doc.setFont('helvetica', 'bold');
    this.renderParagraph(workload.conclusion);
    this.doc.setFont('helvetica', 'normal');
  }

  private renderAIDisclosure(): void {
    const openness = this.packet.aiDisclosureCompliance;
    this.renderSectionTitle('6. AI DISCLOSURE COMPLIANCE (SPIEGELHALTER FRAMEWORK)');

    // Summary
    this.renderTable(
      ['Metric', 'Value'],
      [
        ['Disclosure Format', openness.disclosureContent.format],
        ['AI Validation Phase', `Phase ${openness.validationPhase.phase}`],
      ],
      [60, 100]
    );

    const complianceColor = openness.complianceLevel === 'FULL' ? COLORS.SUCCESS :
      openness.complianceLevel === 'SUBSTANTIAL' ? COLORS.WARNING : COLORS.ERROR;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`INTELLIGENT OPENNESS SCORE: ${openness.overallScore}/4`, MARGIN_LEFT, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.currentY += 5;
    this.renderStatusBadge(`${openness.complianceLevel} COMPLIANCE`, complianceColor);

    // Four pillars
    this.renderSubsectionTitle('Four Pillars of Intelligent Openness');
    this.renderCheckItem(openness.pillars.accessible.met, `Accessible: ${openness.pillars.accessible.explanation}`);
    this.renderCheckItem(openness.pillars.intelligible.met, `Intelligible: ${openness.pillars.intelligible.explanation}`);
    this.renderCheckItem(openness.pillars.usable.met, `Usable: ${openness.pillars.usable.explanation}`);
    this.renderCheckItem(openness.pillars.assessable.met, `Assessable: ${openness.pillars.assessable.explanation}`);

    // Conclusion
    this.renderSubsectionTitle('Conclusion');
    this.doc.setFont('helvetica', 'bold');
    this.renderParagraph(openness.conclusion);
    this.doc.setFont('helvetica', 'normal');
  }

  private renderAttentionAnalysis(): void {
    const attention = this.packet.attentionAnalysis;
    this.renderSectionTitle('7. ATTENTION ANALYSIS');

    // Summary
    this.renderTable(
      ['Metric', 'Value'],
      [
        ['Image Coverage', `${attention.imageCoveragePercent}% of anatomical regions viewed`],
        ['Total Viewing Time', `${(attention.preAIViewingTimeMs / 1000).toFixed(0)}s (pre-AI) + ${(attention.postAIViewingTimeMs / 1000).toFixed(0)}s (post-AI)`],
      ],
      [60, 100]
    );

    // Region coverage
    if (attention.regionAnalysis.length > 0) {
      this.renderSubsectionTitle('Region Coverage');
      this.renderTable(
        ['Status', 'Region', 'Dwell Time', 'Zoom'],
        attention.regionAnalysis.map(r => [
          r.visited ? '✓' : '✗',
          r.regionName,
          `${(r.dwellTimeMs / 1000).toFixed(1)}s`,
          `${r.zoomLevel.toFixed(1)}x`,
        ]),
        [20, 60, 40, 40]
      );
    }

    // Finding location
    if (attention.findingLocation) {
      this.renderSubsectionTitle('Finding Location vs Attention');
      this.renderParagraph(`Finding was in ${attention.findingLocation.region}, which received:`);
      this.renderBulletPoint(`${(attention.findingLocation.dwellTimeMs / 1000).toFixed(1)} seconds of attention`);
      this.renderBulletPoint(`${attention.findingLocation.zoomLevel.toFixed(1)}x zoom magnification`);
      this.renderBulletPoint(`${attention.findingLocation.viewingEpisodes} separate viewing episode(s)`);
    }

    // Conclusion
    this.renderSubsectionTitle('Conclusion');
    const conclusion = attention.imageCoveragePercent >= 90
      ? 'Visual search was thorough. The error was not due to inadequate coverage of the image.'
      : attention.imageCoveragePercent >= 70
        ? 'Visual search covered most of the image. Some regions received limited attention.'
        : 'Visual search coverage was limited. Image coverage may have contributed to the error.';
    this.renderParagraph(conclusion);
  }

  private renderCryptographicVerification(): void {
    const crypto = this.packet.cryptographicVerification;
    this.renderSectionTitle('8. CRYPTOGRAPHIC VERIFICATION');

    const statusColor = crypto.hashChainStatus === 'VERIFIED' ? COLORS.SUCCESS : COLORS.ERROR;
    this.renderStatusBadge(`${crypto.hashChainStatus} ✓`, statusColor);

    // Summary
    this.renderTable(
      ['Metric', 'Value'],
      [
        ['Total Events', crypto.totalEvents.toString()],
        ['Chain Integrity', crypto.chainIntegrity],
      ],
      [60, 100]
    );

    // Verification details
    this.renderSubsectionTitle('Verification Details');
    this.renderTable(
      ['Check', 'Status'],
      [
        ['Genesis hash verified', crypto.verificationDetails.genesisVerified ? 'Yes' : 'INVALID'],
        ['Final hash verified', crypto.verificationDetails.finalVerified ? 'Yes' : 'INVALID'],
        ['All intermediate hashes valid', crypto.verificationDetails.allIntermediateHashesValid ? 'Yes' : 'INVALID'],
        ['Tampering detected', crypto.verificationDetails.tamperingDetected ? 'YES - ALERT' : 'No'],
      ],
      [80, 80]
    );

    // TSA attestation
    if (crypto.tsaAttestation.checkpointCount > 0) {
      this.renderSubsectionTitle('TSA Timestamp Attestation');
      this.renderCheckItem(true, `${crypto.tsaAttestation.checkpointCount} checkpoints attested`);
      this.renderCheckItem(true, `Coverage: ${crypto.tsaAttestation.coveragePercent}% of events`);
      this.renderCheckItem(true, `Earliest: ${crypto.tsaAttestation.earliestAttestation}`);
      this.renderCheckItem(true, `Latest: ${crypto.tsaAttestation.latestAttestation}`);
    }

    // Conclusion
    this.doc.setFont('helvetica', 'bold');
    this.renderParagraph(crypto.conclusion);
    this.doc.setFont('helvetica', 'normal');
  }

  private renderAppendices(): void {
    const appendices = this.packet.appendices;
    this.renderSectionTitle('9. APPENDICES');

    // A: Event Log
    this.renderSubsectionTitle('A: Full Event Log');
    this.renderParagraph(`${appendices.fullEventLog.length} events recorded. See JSON export for full details.`);

    // B: Heatmap
    this.renderSubsectionTitle('B: Viewport Attention Heatmap');
    this.renderParagraph(appendices.viewportHeatmapData ? 'Heatmap data available in export.' : 'No heatmap data available.');

    // C: Case Images
    this.renderSubsectionTitle('C: Case Images');
    this.renderParagraph(appendices.caseImagesIncluded ? 'Images included.' : 'Images not included for privacy/legal considerations.');

    // D: AI Specs
    if (this.options.sections.appendices.aiSpecs) {
      this.renderSubsectionTitle('D: AI System Specifications');
      this.renderTable(
        ['Specification', 'Value'],
        [
          ['Model Name', appendices.aiSystemSpecs.modelName],
          ['Version', appendices.aiSystemSpecs.modelVersion],
          ['Validation Phase', appendices.aiSystemSpecs.validationPhase.toString()],
        ],
        [60, 100]
      );
    }

    // E: Citations
    if (this.options.sections.appendices.citations) {
      this.checkPageBreak(50);
      this.renderSubsectionTitle('E: Research Citations');

      for (let i = 0; i < appendices.researchCitations.length; i++) {
        const c = appendices.researchCitations[i];
        const citation = `${i + 1}. ${c.authors.join(', ')} (${c.year}). ${c.title}. ${c.journal}${c.volume ? `, ${c.volume}` : ''}${c.pages ? `, ${c.pages}` : ''}.`;
        this.renderParagraph(citation, 5);
      }
    }

    // F: Glossary
    if (this.options.sections.appendices.glossary) {
      this.checkPageBreak(50);
      this.renderSubsectionTitle('F: Glossary of Terms');

      for (const g of appendices.glossary) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(g.term, MARGIN_LEFT, this.currentY);
        this.doc.setFont('helvetica', 'normal');
        this.currentY += 5;
        this.renderParagraph(g.definition, 5);
      }
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Generate a PDF from an EnhancedExpertWitnessPacket
 */
export function generateExpertWitnessPDF(
  packet: EnhancedExpertWitnessPacket,
  options?: Partial<PDFGenerationOptions>
): ExpertWitnessPDFGenerator {
  return new ExpertWitnessPDFGenerator(packet, options);
}

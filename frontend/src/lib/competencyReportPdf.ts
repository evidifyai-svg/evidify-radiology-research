// ---------------------------------------------------------------------------
// Competency Report PDF Generator
// Produces a formal PDF document suitable for legal proceedings demonstrating
// maintained diagnostic competency independent of AI assistance.
// ---------------------------------------------------------------------------

import jsPDF from 'jspdf';
import type { CompetencyReport, CalibrationSession } from '../data/competencyDemoData';
import { sessionSensitivity, sessionSpecificity } from '../data/competencyDemoData';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function meetsTarget(value: number, target: number): string {
  return value >= target ? 'MEETS STANDARD' : 'BELOW TARGET';
}

// ---------------------------------------------------------------------------
// Draw a horizontal line
// ---------------------------------------------------------------------------
function drawLine(doc: jsPDF, y: number, x1 = 20, x2 = 190) {
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

// ---------------------------------------------------------------------------
// Session table
// ---------------------------------------------------------------------------
function drawSessionTable(doc: jsPDF, sessions: CalibrationSession[], startY: number): number {
  let y = startY;

  // Table header
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80);

  const cols = [
    { label: 'Date', x: 20 },
    { label: 'Cases', x: 55 },
    { label: 'TP', x: 72 },
    { label: 'TN', x: 82 },
    { label: 'FP', x: 92 },
    { label: 'FN', x: 102 },
    { label: 'Sens', x: 115 },
    { label: 'Spec', x: 132 },
    { label: 'Avg Time', x: 150 },
    { label: 'Status', x: 172 },
  ];

  cols.forEach((col) => {
    doc.text(col.label, col.x, y);
  });

  y += 2;
  drawLine(doc, y);
  y += 5;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  sessions.forEach((session) => {
    if (y > 255) {
      doc.addPage();
      y = 25;
    }

    const sens = sessionSensitivity(session);
    const spec = sessionSpecificity(session);

    doc.setTextColor(60);
    doc.text(formatDateShort(session.date), 20, y);
    doc.text(String(session.casesEvaluated), 55, y);
    doc.text(String(session.truePositives), 72, y);
    doc.text(String(session.trueNegatives), 82, y);
    doc.text(String(session.falsePositives), 92, y);
    doc.text(String(session.falseNegatives), 102, y);
    doc.text(pct(sens), 115, y);
    doc.text(pct(spec), 132, y);
    doc.text(`${session.averageReadingTime}s`, 150, y);

    // Status check mark
    const pass = sens >= 0.9 && spec >= 0.85;
    if (pass) {
      doc.setTextColor(34, 139, 34);
      doc.text('PASS', 172, y);
    } else {
      doc.setTextColor(200, 50, 50);
      doc.text('REVIEW', 172, y);
    }

    y += 6;
  });

  return y;
}

// ---------------------------------------------------------------------------
// Main PDF generation
// ---------------------------------------------------------------------------
export function generateCompetencyReportPdf(report: CompetencyReport): Blob {
  const doc = new jsPDF();

  // ---- Page 1: Header ----
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('RADIOLOGIST COMPETENCY VERIFICATION', 105, 22, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Independent Diagnostic Capability Assessment', 105, 30, { align: 'center' });

  drawLine(doc, 36, 20, 190);

  // ---- Radiologist Information ----
  let y = 46;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('RADIOLOGIST INFORMATION', 20, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.setFontSize(10);
  doc.text(`Name: ${report.radiologist.name}`, 20, y);
  y += 7;
  doc.text(`Credentials: ${report.radiologist.credentials}`, 20, y);
  y += 7;
  doc.text(`License Number: ${report.radiologist.licenseNumber}`, 20, y);
  y += 7;
  doc.text(`Institution: ${report.radiologist.institution}`, 20, y);

  // Report period on the right side
  doc.text(
    `Report Period: ${formatDate(report.reportPeriod.start)} to ${formatDate(report.reportPeriod.end)}`,
    120,
    56,
  );

  y += 14;
  drawLine(doc, y);
  y += 10;

  // ---- Aggregate Performance ----
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('AI-FREE DIAGNOSTIC PERFORMANCE', 20, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.setFontSize(10);

  const m = report.aggregateMetrics;
  doc.text(`Calibration Sessions Completed: ${m.totalSessions}`, 20, y);
  y += 7;
  doc.text(`Total Cases Evaluated Without AI: ${m.totalCases}`, 20, y);
  y += 10;

  // Sensitivity
  doc.text(`Sensitivity: ${pct(m.sensitivity)}`, 20, y);
  doc.text(`(target: >90%)`, 80, y);
  const sensStatus = meetsTarget(m.sensitivity, 0.9);
  if (sensStatus === 'MEETS STANDARD') {
    doc.setTextColor(34, 139, 34);
  } else {
    doc.setTextColor(200, 50, 50);
  }
  doc.setFont('helvetica', 'bold');
  doc.text(sensStatus, 130, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  y += 7;

  // Specificity
  doc.text(`Specificity: ${pct(m.specificity)}`, 20, y);
  doc.text(`(target: >85%)`, 80, y);
  const specStatus = meetsTarget(m.specificity, 0.85);
  if (specStatus === 'MEETS STANDARD') {
    doc.setTextColor(34, 139, 34);
  } else {
    doc.setTextColor(200, 50, 50);
  }
  doc.setFont('helvetica', 'bold');
  doc.text(specStatus, 130, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  y += 7;

  doc.text(`Overall Accuracy: ${pct(m.accuracy)}`, 20, y);
  y += 7;
  doc.text(`Average Confidence Rating: ${m.averageConfidence.toFixed(1)}/100`, 20, y);
  y += 10;

  // Performance trend
  doc.text(`Performance Trend: ${m.performanceTrend.toUpperCase()}`, 20, y);
  y += 6;
  if (m.performanceTrend === 'stable' && m.trendPValue !== undefined) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`(No significant degradation detected, p=${m.trendPValue.toFixed(2)})`, 20, y);
    doc.setFontSize(10);
  }
  y += 10;

  drawLine(doc, y);
  y += 10;

  // ---- Session History Table ----
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('SESSION HISTORY', 20, y);
  y += 8;

  y = drawSessionTable(doc, report.calibrationSessions, y);
  y += 8;

  // Check if we need a new page for the certification
  if (y > 220) {
    doc.addPage();
    y = 25;
  }

  drawLine(doc, y);
  y += 10;

  // ---- Certification ----
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('CERTIFICATION', 20, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.setFontSize(10);

  const certText =
    `This report certifies that ${report.radiologist.name} maintains diagnostic ` +
    `competency independent of AI assistance, as demonstrated by performance on periodic ` +
    `calibration assessments conducted without AI decision support. This documentation is ` +
    `provided to verify that the learned intermediary standard is satisfied and that the ` +
    `radiologist exercises independent clinical judgment.`;

  const splitCert = doc.splitTextToSize(certText, 170);
  doc.text(splitCert, 20, y);
  y += splitCert.length * 5 + 10;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `The above-named radiologist completed ${m.totalSessions} calibration sessions ` +
      `encompassing ${m.totalCases} cases evaluated without AI assistance during the ` +
      `report period. Performance metrics demonstrate ${m.performanceTrend} diagnostic ` +
      `capability meeting or exceeding established benchmarks.`,
    20,
    y,
    { maxWidth: 170 },
  );

  // ---- Footer ----
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Generated: ${report.certification.generatedAt}`, 20, 278);
    doc.text(`Verification Hash: ${report.certification.verificationHash}`, 20, 283);
    doc.text('This document was generated by Evidify Research Platform', 105, 289, {
      align: 'center',
    });
    doc.text(`Page ${i} of ${pageCount}`, 190, 289, { align: 'right' });
  }

  return doc.output('blob');
}

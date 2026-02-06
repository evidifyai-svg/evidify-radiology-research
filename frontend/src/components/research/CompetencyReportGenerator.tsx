// ---------------------------------------------------------------------------
// CompetencyReportGenerator.tsx
// Study 4: Corporate Negligence & Physician Deskilling
//
// Generates an exportable "competency dossier" showing maintained AI-free
// diagnostic performance across periodic calibration sessions. Designed for
// use in legal proceedings to demonstrate that a radiologist maintains
// independent diagnostic capability despite routine AI use.
// ---------------------------------------------------------------------------

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Minus,
  TrendingDown,
  BarChart3,
  Shield,
  Clock,
} from 'lucide-react';
import type { CompetencyReport, CalibrationSession } from '../../data/competencyDemoData';
import { sessionSensitivity, sessionSpecificity } from '../../data/competencyDemoData';
import { generateCompetencyReportPdf } from '../../lib/competencyReportPdf';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CompetencyReportGeneratorProps {
  report: CompetencyReport;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif";
const MONO = "JetBrains Mono, Consolas, Monaco, 'Courier New', monospace";

const C = {
  bg: '#0a0f1a',
  bgCard: '#111827',
  border: '#1e293b',
  borderLight: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  green: '#4ade80',
  greenBg: 'rgba(74, 222, 128, 0.08)',
  greenBorder: 'rgba(74, 222, 128, 0.2)',
  yellow: '#fbbf24',
  yellowBg: 'rgba(251, 191, 36, 0.08)',
  yellowBorder: 'rgba(251, 191, 36, 0.2)',
  red: '#f87171',
  redBg: 'rgba(248, 113, 113, 0.08)',
  redBorder: 'rgba(248, 113, 113, 0.2)',
  blue: '#3b82f6',
  blueBg: 'rgba(59, 130, 246, 0.08)',
  blueBorder: 'rgba(59, 130, 246, 0.2)',
  cyan: '#22d3ee',
};

const SENSITIVITY_TARGET = 0.9;
const SPECIFICITY_TARGET = 0.85;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function trendIcon(trend: 'improving' | 'stable' | 'declining') {
  switch (trend) {
    case 'improving':
      return <TrendingUp size={16} style={{ color: C.green }} />;
    case 'stable':
      return <Minus size={16} style={{ color: C.blue }} />;
    case 'declining':
      return <TrendingDown size={16} style={{ color: C.red }} />;
  }
}

function trendColor(trend: 'improving' | 'stable' | 'declining'): string {
  switch (trend) {
    case 'improving':
      return C.green;
    case 'stable':
      return C.blue;
    case 'declining':
      return C.red;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MetricBarProps {
  label: string;
  value: number;
  target: number;
  targetLabel: string;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value, target, targetLabel }) => {
  const meets = value >= target;
  const barWidth = Math.min(value * 100, 100);
  const targetPct = target * 100;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ color: C.textSecondary, fontSize: 14, fontFamily: FONT }}>{label}</span>
        <span style={{ color: C.textPrimary, fontSize: 20, fontWeight: 700, fontFamily: MONO }}>
          {pct(value)}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          height: 8,
          borderRadius: 4,
          backgroundColor: C.border,
          overflow: 'visible',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 4,
            width: `${barWidth}%`,
            backgroundColor: meets ? C.green : C.red,
            transition: 'width 0.5s ease',
          }}
        />
        {/* Target marker */}
        <div
          style={{
            position: 'absolute',
            left: `${targetPct}%`,
            top: -3,
            width: 2,
            height: 14,
            backgroundColor: C.textMuted,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 6,
        }}
      >
        <span style={{ color: C.textDim, fontSize: 12 }}>Target: {targetLabel}</span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: meets ? C.green : C.red,
          }}
        >
          {meets ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {meets ? 'MEETS STANDARD' : 'BELOW TARGET'}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Chart tooltip
// ---------------------------------------------------------------------------

interface SessionChartTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}

const SessionChartTooltip: React.FC<SessionChartTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: C.bgCard,
        border: `1px solid ${C.borderLight}`,
        borderRadius: 8,
        padding: '10px 14px',
        fontFamily: FONT,
        fontSize: 12,
      }}
    >
      <div style={{ color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color }} />
          <span style={{ color: C.textSecondary }}>
            {p.dataKey === 'sensitivity' ? 'Sensitivity' : 'Specificity'}: {pct(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const CompetencyReportGenerator: React.FC<CompetencyReportGeneratorProps> = ({ report }) => {
  // Prepare chart data
  const chartData = useMemo(
    () =>
      report.calibrationSessions.map((s) => ({
        date: formatDate(s.date),
        sensitivity: sessionSensitivity(s),
        specificity: sessionSpecificity(s),
      })),
    [report.calibrationSessions],
  );

  // Export handlers
  const handleExportPdf = () => {
    const blob = generateCompetencyReportPdf(report);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competency-report-${report.radiologist.licenseNumber}-${report.reportPeriod.start}-${report.reportPeriod.end}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competency-report-${report.radiologist.licenseNumber}-${report.reportPeriod.start}-${report.reportPeriod.end}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const m = report.aggregateMetrics;

  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', padding: '32px 24px', fontFamily: FONT }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* ---- Title ---- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Shield size={28} style={{ color: C.blue }} />
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: C.textPrimary,
              margin: 0,
            }}
          >
            Competency Report Generator
          </h1>
        </div>
        <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 32, marginTop: 4 }}>
          Study 4: Deskilling prevention — periodic AI-free calibration documentation
        </p>

        {/* ---- Radiologist Information Card ---- */}
        <div
          style={{
            backgroundColor: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.textDim,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 16px 0',
            }}
          >
            Radiologist Information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px' }}>
            <div>
              <span style={{ color: C.textDim, fontSize: 12 }}>Name</span>
              <div style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600 }}>
                {report.radiologist.name}
              </div>
            </div>
            <div>
              <span style={{ color: C.textDim, fontSize: 12 }}>License Number</span>
              <div style={{ color: C.textPrimary, fontSize: 15, fontFamily: MONO }}>
                {report.radiologist.licenseNumber}
              </div>
            </div>
            <div>
              <span style={{ color: C.textDim, fontSize: 12 }}>Credentials</span>
              <div style={{ color: C.textSecondary, fontSize: 14 }}>
                {report.radiologist.credentials}
              </div>
            </div>
            <div>
              <span style={{ color: C.textDim, fontSize: 12 }}>Institution</span>
              <div style={{ color: C.textSecondary, fontSize: 14 }}>
                {report.radiologist.institution}
              </div>
            </div>
          </div>
        </div>

        {/* ---- Report Period ---- */}
        <div
          style={{
            backgroundColor: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '14px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Clock size={16} style={{ color: C.textDim }} />
          <span style={{ color: C.textMuted, fontSize: 13 }}>Report Period:</span>
          <span style={{ color: C.textPrimary, fontSize: 14, fontWeight: 600 }}>
            {formatDateLong(report.reportPeriod.start)} &mdash;{' '}
            {formatDateLong(report.reportPeriod.end)}
          </span>
        </div>

        {/* ---- Aggregate Performance Section ---- */}
        <div
          style={{
            backgroundColor: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
            }}
          >
            <BarChart3 size={18} style={{ color: C.blue }} />
            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.textDim,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              Aggregate Performance (AI-Free Cases)
            </h2>
          </div>

          {/* Summary row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 28,
            }}
          >
            {/* Sessions */}
            <div
              style={{
                backgroundColor: C.greenBg,
                border: `1px solid ${C.greenBorder}`,
                borderRadius: 8,
                padding: '14px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Sessions
              </div>
              <div style={{ color: C.green, fontSize: 22, fontWeight: 700, fontFamily: MONO }}>
                {m.totalSessions}/{m.totalSessions}
              </div>
              <div style={{ color: C.green, fontSize: 11, marginTop: 2 }}>
                <CheckCircle size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                Complete
              </div>
            </div>

            {/* Cases */}
            <div
              style={{
                backgroundColor: C.blueBg,
                border: `1px solid ${C.blueBorder}`,
                borderRadius: 8,
                padding: '14px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Cases Evaluated
              </div>
              <div style={{ color: C.blue, fontSize: 22, fontWeight: 700, fontFamily: MONO }}>
                {m.totalCases}
              </div>
              <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>Without AI</div>
            </div>

            {/* Accuracy */}
            <div
              style={{
                backgroundColor: C.blueBg,
                border: `1px solid ${C.blueBorder}`,
                borderRadius: 8,
                padding: '14px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Accuracy
              </div>
              <div style={{ color: C.blue, fontSize: 22, fontWeight: 700, fontFamily: MONO }}>
                {pct(m.accuracy)}
              </div>
              <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>Overall</div>
            </div>

            {/* Trend */}
            <div
              style={{
                backgroundColor:
                  m.performanceTrend === 'stable'
                    ? C.blueBg
                    : m.performanceTrend === 'improving'
                      ? C.greenBg
                      : C.redBg,
                border: `1px solid ${
                  m.performanceTrend === 'stable'
                    ? C.blueBorder
                    : m.performanceTrend === 'improving'
                      ? C.greenBorder
                      : C.redBorder
                }`,
                borderRadius: 8,
                padding: '14px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Trend
              </div>
              <div
                style={{
                  color: trendColor(m.performanceTrend),
                  fontSize: 16,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {trendIcon(m.performanceTrend)}
                {m.performanceTrend.toUpperCase()}
              </div>
              {m.trendPValue !== undefined && (
                <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>
                  p={m.trendPValue.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Metric bars */}
          <MetricBar
            label="Sensitivity"
            value={m.sensitivity}
            target={SENSITIVITY_TARGET}
            targetLabel=">90%"
          />
          <MetricBar
            label="Specificity"
            value={m.specificity}
            target={SPECIFICITY_TARGET}
            targetLabel=">85%"
          />

          {/* Confidence */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <span style={{ color: C.textMuted, fontSize: 13 }}>Average Confidence:</span>
            <span style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600, fontFamily: MONO }}>
              {m.averageConfidence.toFixed(1)}
            </span>
            <span style={{ color: C.textDim, fontSize: 12 }}>/100</span>
          </div>
        </div>

        {/* ---- Performance Trend Chart ---- */}
        <div
          style={{
            backgroundColor: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.textDim,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 16px 0',
            }}
          >
            Performance Over Time
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis
                dataKey="date"
                tick={{ fill: C.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: C.border }}
              />
              <YAxis
                domain={[0.7, 1.0]}
                tick={{ fill: C.textDim, fontSize: 11 }}
                tickFormatter={(v: number) => pct(v)}
                tickLine={false}
                axisLine={{ stroke: C.border }}
              />
              <Tooltip content={<SessionChartTooltip />} />
              <ReferenceLine
                y={SENSITIVITY_TARGET}
                stroke={C.green}
                strokeDasharray="6 3"
                strokeOpacity={0.4}
                label={{
                  value: 'Sens Target',
                  position: 'right',
                  fill: C.textDim,
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                y={SPECIFICITY_TARGET}
                stroke={C.cyan}
                strokeDasharray="6 3"
                strokeOpacity={0.4}
                label={{
                  value: 'Spec Target',
                  position: 'right',
                  fill: C.textDim,
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="sensitivity"
                stroke={C.green}
                strokeWidth={2}
                dot={{ fill: C.green, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="specificity"
                stroke={C.cyan}
                strokeWidth={2}
                dot={{ fill: C.cyan, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 24,
              marginTop: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted }}>
              <div style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: C.green }} />
              Sensitivity
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted }}>
              <div style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: C.cyan }} />
              Specificity
            </div>
          </div>
        </div>

        {/* ---- Session History Table ---- */}
        <div
          style={{
            backgroundColor: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.textDim,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 16px 0',
            }}
          >
            Session History
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: FONT,
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  {['Date', 'Cases', 'TP', 'TN', 'FP', 'FN', 'Sensitivity', 'Specificity', 'Avg Time', 'Status'].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderBottom: `1px solid ${C.borderLight}`,
                          color: C.textDim,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {report.calibrationSessions.map((session) => {
                  const sens = sessionSensitivity(session);
                  const spec = sessionSpecificity(session);
                  const pass = sens >= SENSITIVITY_TARGET && spec >= SPECIFICITY_TARGET;

                  return (
                    <tr key={session.sessionId}>
                      <td style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, color: C.textSecondary }}>
                        {formatDate(session.date)}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          borderBottom: `1px solid ${C.border}`,
                          color: C.textSecondary,
                          fontFamily: MONO,
                        }}
                      >
                        {session.casesEvaluated}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          borderBottom: `1px solid ${C.border}`,
                          color: C.textMuted,
                          fontFamily: MONO,
                        }}
                      >
                        {session.truePositives}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          borderBottom: `1px solid ${C.border}`,
                          color: C.textMuted,
                          fontFamily: MONO,
                        }}
                      >
                        {session.trueNegatives}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          borderBottom: `1px solid ${C.border}`,
                          color: C.textMuted,
                          fontFamily: MONO,
                        }}
                      >
                        {session.falsePositives}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          borderBottom: `1px solid ${C.border}`,
                          color: C.textMuted,
                          fontFamily: MONO,
                        }}
                      >
                        {session.falseNegatives}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          borderBottom: `1px solid ${C.border}`,
                          color: sens >= SENSITIVITY_TARGET ? C.green : C.red,
                          fontFamily: MONO,
                          fontWeight: 600,
                        }}
                      >
                        {pct(sens)}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          borderBottom: `1px solid ${C.border}`,
                          color: spec >= SPECIFICITY_TARGET ? C.green : C.red,
                          fontFamily: MONO,
                          fontWeight: 600,
                        }}
                      >
                        {pct(spec)}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          borderBottom: `1px solid ${C.border}`,
                          color: C.textMuted,
                          fontFamily: MONO,
                        }}
                      >
                        {session.averageReadingTime}s
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        {pass ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: C.green,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle size={14} />
                            Pass
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: C.yellow,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <AlertTriangle size={14} />
                            Review
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Certification Section ---- */}
        <div
          style={{
            backgroundColor: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.textDim,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 16px 0',
            }}
          >
            Certification
          </h2>

          <p
            style={{
              color: C.textSecondary,
              fontSize: 14,
              lineHeight: 1.7,
              margin: '0 0 20px 0',
            }}
          >
            This report certifies that the above-named radiologist maintains diagnostic competency
            independent of AI assistance, as demonstrated by performance on periodic calibration
            assessments without AI decision support. This documentation is provided to verify that the
            learned intermediary standard is satisfied and that the radiologist exercises independent
            clinical judgment.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              padding: 16,
              backgroundColor: 'rgba(59, 130, 246, 0.04)',
              border: `1px solid ${C.blueBorder}`,
              borderRadius: 8,
            }}
          >
            <div>
              <span style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                Generated
              </span>
              <div style={{ color: C.textMuted, fontSize: 13, fontFamily: MONO, marginTop: 2 }}>
                {report.certification.generatedAt}
              </div>
            </div>
            <div>
              <span style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                Verification Hash
              </span>
              <div
                style={{
                  color: C.textMuted,
                  fontSize: 11,
                  fontFamily: MONO,
                  marginTop: 2,
                  wordBreak: 'break-all',
                }}
              >
                {report.certification.verificationHash}
              </div>
            </div>
          </div>
        </div>

        {/* ---- Export Buttons ---- */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
          <button
            onClick={handleExportPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              backgroundColor: C.blue,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: FONT,
              cursor: 'pointer',
            }}
          >
            <Download size={16} />
            Export PDF
          </button>
          <button
            onClick={handleExportJson}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: `1px solid ${C.borderLight}`,
              borderRadius: 8,
              color: C.textSecondary,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: FONT,
              cursor: 'pointer',
            }}
          >
            <FileText size={16} />
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompetencyReportGenerator;

/**
 * WorkloadDashboard.tsx
 *
 * Full-page workload monitoring view for the StudySelector.
 * Shows session metrics, throughput zones, and cohort comparison
 * to demonstrate how practice-level data provides defense context.
 *
 * Key demo thesis for Grayson: "Can practice-level average time
 * serve as defense context?" — Yes, by showing this reader's pace
 * is within normal clinical parameters.
 *
 * All styles are inline — no Tailwind.
 */

import React, { useState } from 'react';
import type { WorkloadMetrics, WorkloadThresholds } from '../../types/workloadTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkloadDashboardProps {
  currentSession: WorkloadMetrics;
  cohortData: CohortComparison;
}

export interface CohortComparison {
  practiceName: string;
  practiceSize: number;
  periodLabel: string;
  metrics: {
    avgCasesPerHour: number;
    medianCasesPerHour: number;
    avgTimePerCaseMs: number;
    medianTimePerCaseMs: number;
    avgSessionDurationMin: number;
    p25CasesPerHour: number;
    p75CasesPerHour: number;
    p25TimePerCaseMs: number;
    p75TimePerCaseMs: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTimePerCase(ms: number): string {
  if (ms === 0) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function statusColor(status: WorkloadMetrics['workloadStatus']): string {
  switch (status) {
    case 'GREEN': return '#4ade80';
    case 'YELLOW': return '#fbbf24';
    case 'RED': return '#f87171';
  }
}

function statusBg(status: WorkloadMetrics['workloadStatus']): string {
  switch (status) {
    case 'GREEN': return 'rgba(34, 197, 94, 0.15)';
    case 'YELLOW': return 'rgba(251, 191, 36, 0.15)';
    case 'RED': return 'rgba(248, 113, 113, 0.15)';
  }
}

function statusLabel(status: WorkloadMetrics['workloadStatus']): string {
  switch (status) {
    case 'GREEN': return 'Normal';
    case 'YELLOW': return 'Elevated';
    case 'RED': return 'High';
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const MetricCard: React.FC<{
  label: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
}> = ({ label, value, subtitle, accentColor = '#e2e8f0' }) => (
  <div style={{
    backgroundColor: '#111827',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '20px',
    flex: 1,
    minWidth: '160px',
  }}>
    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '8px' }}>
      {label}
    </div>
    <div style={{ color: accentColor, fontSize: '28px', fontWeight: 700, fontFamily: 'JetBrains Mono, Consolas, monospace', lineHeight: 1.1 }}>
      {value}
    </div>
    {subtitle && (
      <div style={{ color: '#475569', fontSize: '12px', marginTop: '6px' }}>
        {subtitle}
      </div>
    )}
  </div>
);

const ZoneBar: React.FC<{
  currentRate: number;
  thresholds: WorkloadThresholds;
}> = ({ currentRate, thresholds }) => {
  const maxDisplay = thresholds.casesPerHourRed * 1.5;
  const greenEnd = (thresholds.casesPerHourYellow / maxDisplay) * 100;
  const yellowEnd = (thresholds.casesPerHourRed / maxDisplay) * 100;
  const markerPos = Math.min((currentRate / maxDisplay) * 100, 100);

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: '#64748b', fontSize: '11px' }}>0 cases/hr</span>
        <span style={{ color: '#64748b', fontSize: '11px' }}>{Math.round(maxDisplay)} cases/hr</span>
      </div>
      <div style={{
        position: 'relative' as const,
        height: '24px',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
      }}>
        {/* Green zone */}
        <div style={{ width: `${greenEnd}%`, backgroundColor: 'rgba(34, 197, 94, 0.3)', height: '100%' }} />
        {/* Yellow zone */}
        <div style={{ width: `${yellowEnd - greenEnd}%`, backgroundColor: 'rgba(251, 191, 36, 0.3)', height: '100%' }} />
        {/* Red zone */}
        <div style={{ flex: 1, backgroundColor: 'rgba(248, 113, 113, 0.3)', height: '100%' }} />
        {/* Current position marker */}
        <div style={{
          position: 'absolute' as const,
          left: `${markerPos}%`,
          top: '0',
          bottom: '0',
          width: '3px',
          backgroundColor: '#f8fafc',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 8px rgba(248, 250, 252, 0.5)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ color: '#4ade80', fontSize: '10px', fontWeight: 600 }}>NORMAL</span>
        <span style={{ color: '#fbbf24', fontSize: '10px', fontWeight: 600 }}>ELEVATED ({thresholds.casesPerHourYellow}+)</span>
        <span style={{ color: '#f87171', fontSize: '10px', fontWeight: 600 }}>HIGH ({thresholds.casesPerHourRed}+)</span>
      </div>
    </div>
  );
};

const CohortComparisonPanel: React.FC<{
  session: WorkloadMetrics;
  cohort: CohortComparison;
}> = ({ session, cohort }) => {
  const isWithinNorm = session.casesPerHour <= cohort.metrics.p75CasesPerHour;
  const percentile = session.casesPerHour <= cohort.metrics.p25CasesPerHour
    ? 'below 25th percentile (slower than average)'
    : session.casesPerHour <= cohort.metrics.medianCasesPerHour
    ? 'below median (normal pace)'
    : session.casesPerHour <= cohort.metrics.p75CasesPerHour
    ? 'between median and 75th percentile (normal pace)'
    : 'above 75th percentile (faster than typical)';

  return (
    <div style={{
      backgroundColor: '#111827',
      border: '1px solid #1e293b',
      borderRadius: '12px',
      padding: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 700, margin: 0 }}>
            Cohort Comparison
          </h3>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>
            {cohort.practiceName} • {cohort.practiceSize} radiologists • {cohort.periodLabel}
          </p>
        </div>
        <div style={{
          padding: '6px 14px',
          borderRadius: '8px',
          backgroundColor: isWithinNorm ? 'rgba(34, 197, 94, 0.12)' : 'rgba(248, 113, 113, 0.12)',
          color: isWithinNorm ? '#4ade80' : '#f87171',
          fontSize: '12px',
          fontWeight: 700,
        }}>
          {isWithinNorm ? '✓ Within Normal Range' : '⚠ Above Typical Range'}
        </div>
      </div>

      {/* Comparison table */}
      <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid #1e293b' }}>Metric</th>
            <th style={{ textAlign: 'center', padding: '10px 12px', color: '#64748b', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid #1e293b' }}>This Reader</th>
            <th style={{ textAlign: 'center', padding: '10px 12px', color: '#64748b', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid #1e293b' }}>Practice Median</th>
            <th style={{ textAlign: 'center', padding: '10px 12px', color: '#64748b', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid #1e293b' }}>IQR (25th–75th)</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.5)' }}>
            <td style={{ padding: '12px', color: '#cbd5e1' }}>Cases per hour</td>
            <td style={{ padding: '12px', textAlign: 'center', color: '#f8fafc', fontWeight: 600, fontFamily: 'JetBrains Mono, Consolas, monospace' }}>{session.casesPerHour.toFixed(1)}</td>
            <td style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontFamily: 'JetBrains Mono, Consolas, monospace' }}>{cohort.metrics.medianCasesPerHour.toFixed(1)}</td>
            <td style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontFamily: 'JetBrains Mono, Consolas, monospace' }}>{cohort.metrics.p25CasesPerHour.toFixed(1)}–{cohort.metrics.p75CasesPerHour.toFixed(1)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.5)' }}>
            <td style={{ padding: '12px', color: '#cbd5e1' }}>Time per case</td>
            <td style={{ padding: '12px', textAlign: 'center', color: '#f8fafc', fontWeight: 600, fontFamily: 'JetBrains Mono, Consolas, monospace' }}>{formatTimePerCase(session.averageTimePerCaseMs)}</td>
            <td style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontFamily: 'JetBrains Mono, Consolas, monospace' }}>{formatTimePerCase(cohort.metrics.medianTimePerCaseMs)}</td>
            <td style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontFamily: 'JetBrains Mono, Consolas, monospace' }}>{formatTimePerCase(cohort.metrics.p75TimePerCaseMs)}–{formatTimePerCase(cohort.metrics.p25TimePerCaseMs)}</td>
          </tr>
          <tr>
            <td style={{ padding: '12px', color: '#cbd5e1' }}>Session duration index</td>
            <td style={{ padding: '12px', textAlign: 'center', color: '#f8fafc', fontWeight: 600, fontFamily: 'JetBrains Mono, Consolas, monospace' }}>{session.sessionDurationIndex}%</td>
            <td style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }} colSpan={2}>—</td>
          </tr>
        </tbody>
      </table>

      {/* Defense context statement */}
      <div style={{
        marginTop: '20px',
        padding: '16px 20px',
        backgroundColor: isWithinNorm ? 'rgba(34, 197, 94, 0.05)' : 'rgba(248, 113, 113, 0.05)',
        border: `1px solid ${isWithinNorm ? 'rgba(34, 197, 94, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
        borderRadius: '8px',
      }}>
        <div style={{ color: isWithinNorm ? '#4ade80' : '#f87171', fontSize: '12px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>
          Defense Context Statement
        </div>
        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.7', margin: 0, fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {isWithinNorm
            ? `This reader's throughput of ${session.casesPerHour.toFixed(1)} cases/hour falls ${percentile} for the ${cohort.practiceName} practice (n=${cohort.practiceSize}, ${cohort.periodLabel}). The reading pace was consistent with established clinical norms and does not suggest time-pressured or inattentive behavior.`
            : `This reader's throughput of ${session.casesPerHour.toFixed(1)} cases/hour is ${percentile} for the ${cohort.practiceName} practice (n=${cohort.practiceSize}, ${cohort.periodLabel}). Further review of individual case timing is recommended.`
          }
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const WorkloadDashboard: React.FC<WorkloadDashboardProps> = ({ currentSession, cohortData }) => {
  const [showResearchContext, setShowResearchContext] = useState(false);

  return (
    <div style={{ padding: '32px 40px', backgroundColor: '#0f172a', minHeight: '100%' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ color: '#f8fafc', fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Workload Monitoring & Cohort Comparison
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '6px 0 0 0' }}>
            Practice-level context for defensible documentation of reading pace
          </p>
        </div>

        {/* Status badge + session info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: statusBg(currentSession.workloadStatus),
            border: `1px solid ${statusColor(currentSession.workloadStatus)}33`,
          }}>
            <span style={{ color: statusColor(currentSession.workloadStatus), fontSize: '16px' }}>●</span>
            <span style={{ color: statusColor(currentSession.workloadStatus), fontSize: '13px', fontWeight: 700 }}>
              {statusLabel(currentSession.workloadStatus)} Workload
            </span>
          </div>
          <span style={{
            padding: '6px 12px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#94a3b8',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, Consolas, monospace',
          }}>
            {currentSession.sessionId}
          </span>
        </div>

        {/* Metric cards row */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' as const }}>
          <MetricCard
            label="Cases Completed"
            value={String(currentSession.casesCompleted)}
            subtitle={`of ${currentSession.thresholds.maxSessionCases} max recommended`}
          />
          <MetricCard
            label="Throughput"
            value={`${currentSession.casesPerHour.toFixed(1)}/hr`}
            subtitle="current rate"
            accentColor={statusColor(currentSession.workloadStatus)}
          />
          <MetricCard
            label="Avg Time/Case"
            value={formatTimePerCase(currentSession.averageTimePerCaseMs)}
            subtitle="this session"
          />
          <MetricCard
            label="Session Duration"
            value={formatDuration(currentSession.totalReadingTimeMs)}
            subtitle={`of ${currentSession.thresholds.maxSessionMinutes}m max`}
          />
        </div>

        {/* Throughput zone bar */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
        }}>
          <h3 style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>
            Throughput Zone
          </h3>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px 0' }}>
            Current reading rate relative to research-based thresholds
          </p>
          <ZoneBar
            currentRate={currentSession.casesPerHour}
            thresholds={currentSession.thresholds}
          />
        </div>

        {/* Cohort Comparison */}
        <div style={{ marginBottom: '24px' }}>
          <CohortComparisonPanel session={currentSession} cohort={cohortData} />
        </div>

        {/* Research Context (collapsible) */}
        <div style={{
          border: '1px solid #334155',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setShowResearchContext(prev => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              backgroundColor: showResearchContext ? '#1e293b' : 'rgba(30, 41, 59, 0.5)',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left' as const,
            }}
          >
            <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
              Research Basis: Workload & Diagnostic Accuracy
            </span>
            <span style={{
              color: '#64748b',
              fontSize: '18px',
              transform: showResearchContext ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>
              ▾
            </span>
          </button>

          {showResearchContext && (
            <div style={{
              padding: '20px 24px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderTop: '1px solid rgba(51, 65, 85, 0.6)',
            }}>
              <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.7' }}>
                <p style={{ marginTop: 0, marginBottom: '16px' }}>
                  Peer-reviewed research has established a relationship between radiologist
                  workload volume and diagnostic accuracy. Studies show measurable performance
                  degradation when case throughput exceeds approximately 30–40 cases per hour,
                  with increased miss rates and false positive findings.
                </p>
                <p style={{ marginTop: 0, marginBottom: '16px' }}>
                  By continuously monitoring throughput and comparing to practice-level norms,
                  Evidify provides two key capabilities: (1) real-time workload advisories that
                  encourage readers to take breaks before accuracy degrades, and (2)
                  retrospective defense documentation showing that a given reader's pace was
                  within established clinical parameters.
                </p>
                <p style={{ marginTop: 0, marginBottom: '0' }}>
                  The cohort comparison panel contextualizes individual performance within the
                  practice's normative data, making it possible to demonstrate that reading
                  behavior was typical rather than rushed — a critical defense against
                  allegations of negligent review speed.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default WorkloadDashboard;

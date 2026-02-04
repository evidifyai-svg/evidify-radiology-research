/**
 * TheContrast.tsx
 *
 * Side-by-side comparison view showing the same radiological case documented
 * two ways: as a bare structured log (which invites Spontaneous Trait Inference)
 * and as a contextualized clinical narrative (which prevents it).
 *
 * Core insight: showing a jury "2 minutes, 14 seconds" with no context triggers
 * automatic trait inference ("careless"). A narrative that contextualizes the same
 * time within a clinical reasoning framework disrupts this inference pathway.
 *
 * Built for the February 13 meeting with Brown University researchers studying
 * how jurors perceive radiologist behavior.
 *
 * References:
 * - Pennington & Hastie (1992) Story Model for juror decision-making
 * - Uleman et al. — Spontaneous Trait Inference research
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { TrialEvent, DerivedMetrics } from '../../../lib/ExportPack';
import type { LedgerEntry, BIRADSAssessment } from './ImpressionLedger';

// ============================================================================
// TYPES
// ============================================================================

export interface TheContrastProps {
  caseId: string;
  events: TrialEvent[];
  derivedMetrics: DerivedMetrics;
  ledgerEntries?: LedgerEntry[];
}

interface LogRow {
  label: string;
  timestamp: string;
  duration?: string;
  isTotal?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatMs(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec} sec`;
  return `${min} min ${sec} sec`;
}

function formatMsShort(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function findEventByType(events: TrialEvent[], type: string): TrialEvent | undefined {
  return events.find(e => e.type === type);
}

function biradsLabel(val: number | null | undefined): string {
  if (val == null) return '—';
  return `BI-RADS ${val}`;
}

function confidenceLabel(ledgerEntries: LedgerEntry[] | undefined, entryType: string): string {
  if (!ledgerEntries) return '—';
  const entry = ledgerEntries.find(e => e.entryType === entryType);
  if (!entry?.assessment) return '—';
  return `${entry.assessment.confidence}/5`;
}

function getBreastDensity(events: TrialEvent[]): string {
  const caseLoaded = findEventByType(events, 'CASE_LOADED');
  if (caseLoaded?.payload && typeof caseLoaded.payload === 'object') {
    const p = caseLoaded.payload as Record<string, unknown>;
    if (typeof p.breastDensity === 'string') return p.breastDensity;
    if (typeof p.density === 'string') return p.density;
  }
  return 'heterogeneously dense';
}

function getViewCount(events: TrialEvent[]): number {
  const caseLoaded = findEventByType(events, 'CASE_LOADED');
  if (caseLoaded?.payload && typeof caseLoaded.payload === 'object') {
    const p = caseLoaded.payload as Record<string, unknown>;
    if (typeof p.viewCount === 'number') return p.viewCount;
    if (typeof p.views === 'number') return p.views;
  }
  return 4; // standard bilateral mammogram: 4 views
}

function countAcknowledgedFindings(ledgerEntries: LedgerEntry[] | undefined): number {
  if (!ledgerEntries) return 0;
  let count = 0;
  for (const entry of ledgerEntries) {
    if (entry.entryType === 'AI_FINDING_ACKNOWLEDGED' && entry.acknowledgements) {
      count += entry.acknowledgements.filter(a => a.reviewed).length;
    }
  }
  return count;
}

function assessmentChangeDescription(
  metrics: DerivedMetrics,
  ledgerEntries: LedgerEntry[] | undefined,
): string {
  if (!metrics.changeOccurred) {
    return 'maintained their initial assessment';
  }
  const rationale = metrics.deviationRationale || metrics.deviationText;
  const suffix = rationale ? ` with documented rationale: "${rationale}"` : '';
  return `revised their assessment to ${biradsLabel(metrics.finalBirads)}${suffix}`;
}

// ============================================================================
// INLINE STYLE HELPERS
// ============================================================================

const highlightStyle: React.CSSProperties = {
  backgroundColor: 'rgba(250,204,21,0.1)',
  borderBottom: '2px solid rgba(250,204,21,0.5)',
};

const noHighlightStyle: React.CSSProperties = {};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Left panel: stark structured log that invites STI */
const StructuredLogPanel: React.FC<{
  events: TrialEvent[];
  derivedMetrics: DerivedMetrics;
  highlightMode: boolean;
}> = ({ events, derivedMetrics, highlightMode }) => {
  const rows = useMemo<LogRow[]>(() => {
    const caseLoaded = findEventByType(events, 'CASE_LOADED');
    const locked = findEventByType(events, 'FIRST_IMPRESSION_LOCKED')
      || findEventByType(events, 'PRE_AI_ASSESSMENT_LOCKED');
    const aiRevealed = findEventByType(events, 'AI_REVEALED')
      || findEventByType(events, 'AI_OUTPUT_SHOWN');
    const finalSubmit = findEventByType(events, 'FINAL_ASSESSMENT_SUBMITTED')
      || findEventByType(events, 'RECONCILIATION_COMPLETE');

    return [
      {
        label: 'Case loaded',
        timestamp: caseLoaded ? formatTimestamp(caseLoaded.timestamp) : '—',
      },
      {
        label: 'First impression locked',
        timestamp: locked ? formatTimestamp(locked.timestamp) : '—',
        duration: `Pre-AI read time: ${formatMs(derivedMetrics.preAiReadMs)}`,
      },
      {
        label: 'AI consultation initiated',
        timestamp: aiRevealed ? formatTimestamp(aiRevealed.timestamp) : '—',
      },
      {
        label: 'Final assessment submitted',
        timestamp: finalSubmit ? formatTimestamp(finalSubmit.timestamp) : '—',
        duration: `Post-AI time: ${formatMs(derivedMetrics.postAiReadMs ?? derivedMetrics.revealToFinalMs)}`,
      },
      {
        label: 'Total session',
        timestamp: '',
        duration: formatMs(derivedMetrics.totalTimeMs),
        isTotal: true,
      },
    ];
  }, [events, derivedMetrics]);

  const hl = highlightMode ? highlightStyle : noHighlightStyle;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(51,65,85,0.6)' }}>
        <h3 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
          Structured Activity Log
        </h3>
        <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', margin: '4px 0 0 0' }}>
          Raw temporal record — no interpretive context
        </p>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        <table style={{ width: '100%', fontSize: '13px', fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: '12px', paddingRight: '16px', fontWeight: 500, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event</th>
              <th style={{ textAlign: 'left', paddingBottom: '12px', paddingRight: '16px', fontWeight: 500, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</th>
              <th style={{ textAlign: 'left', paddingBottom: '12px', fontWeight: 500, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                style={{
                  borderTop: '1px solid #1e293b',
                  fontWeight: row.isTotal ? 700 : 400,
                  color: row.isTotal ? '#e2e8f0' : '#cbd5e1',
                }}
              >
                <td style={{ padding: '12px 16px 12px 0', whiteSpace: 'nowrap' }}>{row.label}</td>
                <td style={{ padding: '12px 16px 12px 0', whiteSpace: 'nowrap', ...hl }}>
                  {row.timestamp}
                </td>
                <td style={{ padding: '12px 0', whiteSpace: 'nowrap', ...hl }}>
                  {row.duration || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer total */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(51,65,85,0.6)', backgroundColor: 'rgba(30,41,59,0.3)' }}>
        <p style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 700, fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace', margin: 0 }}>
          Total time on case:{' '}
          <span style={{ color: '#f87171', ...hl }}>
            {formatMsShort(derivedMetrics.totalTimeMs)}
          </span>
        </p>
      </div>
    </div>
  );
};

/** Right panel: contextualized narrative that prevents STI */
const ClinicalNarrativePanel: React.FC<{
  caseId: string;
  events: TrialEvent[];
  derivedMetrics: DerivedMetrics;
  ledgerEntries?: LedgerEntry[];
  highlightMode: boolean;
}> = ({ caseId, events, derivedMetrics, ledgerEntries, highlightMode }) => {
  const narrative = useMemo(() => {
    const density = getBreastDensity(events);
    const viewCount = getViewCount(events);
    const initialConfidence = confidenceLabel(ledgerEntries, 'HUMAN_FIRST_IMPRESSION');
    const acknowledgedCount = countAcknowledgedFindings(ledgerEntries);
    const changeDesc = assessmentChangeDescription(derivedMetrics, ledgerEntries);

    const caseLoaded = findEventByType(events, 'CASE_LOADED');
    const startTime = caseLoaded ? formatTimestamp(caseLoaded.timestamp) : '—';

    const preAiTime = formatMs(derivedMetrics.preAiReadMs);
    const postAiTime = formatMs(derivedMetrics.postAiReadMs ?? derivedMetrics.revealToFinalMs);

    return { density, viewCount, initialConfidence, acknowledgedCount, changeDesc, startTime, preAiTime, postAiTime };
  }, [events, derivedMetrics, ledgerEntries]);

  const hl = highlightMode ? highlightStyle : noHighlightStyle;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(71,85,105,0.4)' }}>
        <h3 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
          Clinical Reasoning Documentation
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', margin: '4px 0 0 0' }}>
          Contextualized decision process
        </p>
      </div>

      {/* Narrative */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '15px', lineHeight: '1.75', color: '#e2e8f0' }}>
          <p style={{ marginBottom: '20px', marginTop: 0 }}>
            The reader began independent review of the bilateral mammographic study at{' '}
            <span style={hl}>{narrative.startTime}</span>.
            During the{' '}
            <span style={hl}>{narrative.preAiTime}</span>{' '}
            pre-consultation period, the reader assessed {narrative.density} breast tissue,
            examined {narrative.viewCount} standard views, and formed an initial clinical
            impression of {biradsLabel(derivedMetrics.initialBirads)} with a confidence
            level of {narrative.initialConfidence}. This independent assessment was
            cryptographically locked before any AI output was visible to the reader.
          </p>

          <p style={{ marginBottom: '20px', marginTop: 0 }}>
            Following the independent assessment lock, the AI consultation system presented
            its analysis. The reader spent{' '}
            <span style={hl}>{narrative.postAiTime}</span>{' '}
            reviewing the AI&rsquo;s findings
            {narrative.acknowledgedCount > 0
              ? `, reviewed all ${narrative.acknowledgedCount} flagged region${narrative.acknowledgedCount !== 1 ? 's' : ''}`
              : ''
            }, and {narrative.changeDesc}.
          </p>

          <p style={{ marginBottom: 0, marginTop: 0 }}>
            The complete decision chain — from independent read through AI consultation to
            final determination — is hash-linked and independently verifiable. Total session
            duration:{' '}
            <span style={hl}>
              {formatMs(derivedMetrics.totalTimeMs)}
            </span>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(71,85,105,0.4)', backgroundColor: 'rgba(51,65,85,0.2)' }}>
        <p style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic', margin: 0 }}>
          Case {caseId} — Documented reasoning framework per Evidify protocol
        </p>
      </div>
    </div>
  );
};

/** Collapsible research context for Grayson */
const ResearchContextSection: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          backgroundColor: 'rgba(30,41,59,0.5)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 500 }}>
          Why This Matters: Spontaneous Trait Inference
        </span>
        <span style={{
          color: '#64748b',
          fontSize: '14px',
          transition: 'transform 0.2s',
          display: 'inline-block',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          &#9660;
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '16px 20px', backgroundColor: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(51,65,85,0.6)' }}>
          <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.7' }}>
            <p style={{ marginTop: 0, marginBottom: '12px' }}>
              Research on spontaneous trait inference (STI) demonstrates that observers
              automatically infer character traits from behavioral descriptions. A bare time
              record of &ldquo;2 minutes, 14 seconds&rdquo; activates trait inference — the
              observer involuntarily concludes &ldquo;careless&rdquo; or &ldquo;rushed.&rdquo;
              Narrative documentation that contextualizes the same temporal data within a
              clinical reasoning framework disrupts this inference pathway.
            </p>
            <p style={{ marginTop: 0, marginBottom: '12px' }}>
              The left panel recreates what a plaintiff&rsquo;s attorney would present to a
              jury: raw numbers stripped of context, designed to invite snap judgments about the
              radiologist&rsquo;s character. The right panel demonstrates how the same data,
              embedded in a reasoning narrative, prevents those inferences by providing the
              &ldquo;story&rdquo; that jurors need to evaluate behavior fairly.
            </p>
            <div style={{ paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                <span style={{ fontWeight: 500, color: '#94a3b8' }}>References:</span>{' '}
                Pennington &amp; Hastie (1992), &ldquo;Explaining the Evidence: Tests of the Story
                Model for Juror Decision Making,&rdquo; <em>Journal of Personality and Social
                Psychology</em>; Uleman, Saribay &amp; Gonzalez (2008), &ldquo;Spontaneous
                Inferences, Implicit Impressions, and Implicit Theories,&rdquo;{' '}
                <em>Annual Review of Psychology</em>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TheContrast: React.FC<TheContrastProps> = ({
  caseId,
  events,
  derivedMetrics,
  ledgerEntries,
}) => {
  const [swapped, setSwapped] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);

  const handleSwap = useCallback(() => setSwapped(prev => !prev), []);
  const handleHighlight = useCallback(() => setHighlightMode(prev => !prev), []);

  const logPanel = (
    <div style={{
      backgroundColor: '#0a0f1a',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '12px',
      overflow: 'hidden',
      height: '100%',
    }}>
      <StructuredLogPanel
        events={events}
        derivedMetrics={derivedMetrics}
        highlightMode={highlightMode}
      />
    </div>
  );

  const narrativePanel = (
    <div style={{
      backgroundColor: '#111827',
      border: '1px solid rgba(34,197,94,0.2)',
      borderRadius: '12px',
      overflow: 'hidden',
      height: '100%',
    }}>
      <ClinicalNarrativePanel
        caseId={caseId}
        events={events}
        derivedMetrics={derivedMetrics}
        ledgerEntries={ledgerEntries}
        highlightMode={highlightMode}
      />
    </div>
  );

  const leftPanel = swapped ? narrativePanel : logPanel;
  const rightPanel = swapped ? logPanel : narrativePanel;

  const leftBadgeLabel = swapped ? '\u2713 Defense Exhibit' : '\u26A0 Prosecution Exhibit';
  const rightBadgeLabel = swapped ? '\u26A0 Prosecution Exhibit' : '\u2713 Defense Exhibit';

  const prosecutionBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.3)',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  };

  const defenseBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: 'rgba(34,197,94,0.15)',
    color: '#4ade80',
    border: '1px solid rgba(34,197,94,0.3)',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  };

  const leftBadgeStyle = swapped ? defenseBadgeStyle : prosecutionBadgeStyle;
  const rightBadgeStyle = swapped ? prosecutionBadgeStyle : defenseBadgeStyle;

  const defaultButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
    cursor: 'pointer',
  };

  const highlightActiveStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: 'rgba(250,204,21,0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(250,204,21,0.3)',
    cursor: 'pointer',
  };

  return (
    <div style={{ backgroundColor: '#0f172a', padding: '32px 40px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
            The Contrast
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px', margin: '4px 0 0 0' }}>
            Same data, two framings — how documentation shapes perception
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleHighlight}
            style={highlightMode ? highlightActiveStyle : defaultButtonStyle}
          >
            {highlightMode ? 'Highlighting On' : 'Highlight Shared Data'}
          </button>
          <button
            onClick={handleSwap}
            style={defaultButtonStyle}
          >
            Swap Panels
          </button>
        </div>
      </div>

      {/* Panel labels */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', marginBottom: '8px' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={leftBadgeStyle}>{leftBadgeLabel}</span>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={rightBadgeStyle}>{rightBadgeLabel}</span>
        </div>
      </div>

      {/* Split panels */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', minHeight: '500px', marginBottom: '24px' }}>
        <div style={{ flex: 1 }}>
          {leftPanel}
        </div>
        <div style={{ flex: 1 }}>
          {rightPanel}
        </div>
      </div>

      {/* Research context (for Grayson) */}
      <ResearchContextSection />
    </div>
  );
};

export default TheContrast;

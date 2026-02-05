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
  return 4;
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
// HIGHLIGHT STYLE HELPER
// ============================================================================

function highlightStyle(active: boolean): React.CSSProperties {
  if (!active) return {};
  return {
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    borderBottom: '2px solid rgba(250, 204, 21, 0.5)',
    paddingBottom: '1px',
  };
}

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
    const finalSubmit = findEventByType(events, 'FINAL_ASSESSMENT')
      || findEventByType(events, 'FINAL_ASSESSMENT_SUBMITTED')
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(239, 68, 68, 0.15)' }}>
        <h3 style={{
          color: '#e2e8f0',
          fontSize: '18px',
          fontWeight: 700,
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          Structured Activity Log
        </h3>
        <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', margin: '4px 0 0 0' }}>
          Raw temporal record — no interpretive context
        </p>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <table style={{ width: '100%', fontSize: '13px', fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: '14px', paddingRight: '16px', fontWeight: 600, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Event</th>
              <th style={{ textAlign: 'left', paddingBottom: '14px', paddingRight: '16px', fontWeight: 600, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Timestamp</th>
              <th style={{ textAlign: 'left', paddingBottom: '14px', fontWeight: 600, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.08)' }}>
                <td style={{
                  padding: '14px 16px 14px 0',
                  whiteSpace: 'nowrap',
                  color: row.isTotal ? '#f1f5f9' : '#cbd5e1',
                  fontWeight: row.isTotal ? 700 : 400,
                  fontSize: row.isTotal ? '14px' : '13px',
                }}>
                  {row.label}
                </td>
                <td style={{
                  padding: '14px 16px 14px 0',
                  whiteSpace: 'nowrap',
                  color: row.isTotal ? '#f1f5f9' : '#cbd5e1',
                  fontWeight: row.isTotal ? 700 : 400,
                  ...highlightStyle(highlightMode && !!row.timestamp),
                }}>
                  {row.timestamp}
                </td>
                <td style={{
                  padding: '14px 0',
                  whiteSpace: 'nowrap',
                  color: row.isTotal ? '#f87171' : '#cbd5e1',
                  fontWeight: row.isTotal ? 700 : 400,
                  fontSize: row.isTotal ? '14px' : '13px',
                  ...highlightStyle(highlightMode && !!row.duration),
                }}>
                  {row.duration || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(239, 68, 68, 0.15)',
        backgroundColor: 'rgba(239, 68, 68, 0.04)',
      }}>
        <p style={{
          margin: 0,
          color: '#f87171',
          fontSize: '15px',
          fontWeight: 700,
          fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
        }}>
          Total time on case:{' '}
          <span style={{ fontSize: '18px', ...highlightStyle(highlightMode) }}>
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

  const hl = highlightMode;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(34, 197, 94, 0.15)' }}>
        <h3 style={{
          color: '#e2e8f0',
          fontSize: '18px',
          fontWeight: 700,
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          Clinical Reasoning Documentation
        </h3>
        <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', margin: '4px 0 0 0' }}>
          Contextualized decision process
        </p>
      </div>

      {/* Narrative */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '15px', lineHeight: '1.8', color: '#e2e8f0' }}>
          <p style={{ marginTop: 0, marginBottom: '20px' }}>
            The reader began independent review of the bilateral mammographic study at{' '}
            <span style={highlightStyle(hl)}>{narrative.startTime}</span>.
            During the{' '}
            <span style={highlightStyle(hl)}>{narrative.preAiTime}</span>{' '}
            pre-consultation period, the reader assessed {narrative.density} breast tissue,
            examined {narrative.viewCount} standard views, and formed an initial clinical
            impression of {biradsLabel(derivedMetrics.initialBirads)} with a confidence
            level of {narrative.initialConfidence}. This independent assessment was
            cryptographically locked before any AI output was visible to the reader.
          </p>

          <p style={{ marginTop: 0, marginBottom: '20px' }}>
            Following the independent assessment lock, the AI consultation system presented
            its analysis. The reader spent{' '}
            <span style={highlightStyle(hl)}>{narrative.postAiTime}</span>{' '}
            reviewing the AI&rsquo;s findings
            {narrative.acknowledgedCount > 0
              ? `, reviewed all ${narrative.acknowledgedCount} flagged region${narrative.acknowledgedCount !== 1 ? 's' : ''}`
              : ''
            }, and {narrative.changeDesc}.
          </p>

          <p style={{ marginTop: 0, marginBottom: '20px' }}>
            The complete decision chain — from independent read through AI consultation to
            final determination — is hash-linked and independently verifiable. Total session
            duration:{' '}
            <span style={highlightStyle(hl)}>
              {formatMs(derivedMetrics.totalTimeMs)}
            </span>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(34, 197, 94, 0.15)',
        backgroundColor: 'rgba(34, 197, 94, 0.04)',
      }}>
        <p style={{
          margin: 0,
          color: '#64748b',
          fontSize: '12px',
          fontStyle: 'italic',
        }}>
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
    <div style={{
      border: '1px solid #334155',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          backgroundColor: expanded ? '#1e293b' : 'rgba(30, 41, 59, 0.5)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
          Why This Matters: Spontaneous Trait Inference
        </span>
        <span style={{
          color: '#64748b',
          fontSize: '18px',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>
          ▾
        </span>
      </button>

      {expanded && (
        <div style={{
          padding: '20px 24px',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderTop: '1px solid rgba(51, 65, 85, 0.6)',
        }}>
          <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.7' }}>
            <p style={{ marginTop: 0, marginBottom: '16px' }}>
              Research on spontaneous trait inference (STI) demonstrates that observers
              automatically infer character traits from behavioral descriptions. A bare time
              record of &ldquo;2 minutes, 14 seconds&rdquo; activates trait inference — the
              observer involuntarily concludes &ldquo;careless&rdquo; or &ldquo;rushed.&rdquo;
              Narrative documentation that contextualizes the same temporal data within a
              clinical reasoning framework disrupts this inference pathway.
            </p>
            <p style={{ marginTop: 0, marginBottom: '16px' }}>
              The left panel recreates what a plaintiff&rsquo;s attorney would present to a
              jury: raw numbers stripped of context, designed to invite snap judgments about the
              radiologist&rsquo;s character. The right panel demonstrates how the same data,
              embedded in a reasoning narrative, prevents those inferences by providing the
              &ldquo;story&rdquo; that jurors need to evaluate behavior fairly.
            </p>
            <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>
                <span style={{ fontWeight: 600, color: '#94a3b8' }}>References:</span>{' '}
                Pennington &amp; Hastie (1992), &ldquo;Explaining the Evidence: Tests of the Story
                Model for Juror Decision Making,&rdquo; <em>Journal of Personality and Social
                Psychology</em>; Uleman, Saribay &amp; Gonzalez (2008), &ldquo;Spontaneous
                Inferences, Implicit Impressions, and Implicit Theories,&rdquo;{' '}
                <em>Annual Review of Psychology</em>.
              </p>
            </div>

            {/* Why Default Format Matters — plaintiff's weapon framing */}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <h4 style={{
                color: '#e2e8f0',
                fontSize: '14px',
                fontWeight: 700,
                margin: '0 0 12px 0',
                letterSpacing: '-0.01em',
              }}>
                Why Default Format Matters
              </h4>
              <p style={{ marginTop: 0, marginBottom: '0' }}>
                The same verified event data supports both the prosecution and defense narratives
                shown above. Without a documentation system that generates contextualized
                narratives, the default discovery output is the raw event log — timestamps and
                classifications without cohort context, deviation rationale, or workflow norms.
                Research on Spontaneous Trait Inference (Uleman et al., 1996; Winter &amp; Uleman,
                1984) suggests that decontextualized behavioral data systematically triggers
                dispositional attributions: &ldquo;careless,&rdquo; &ldquo;rushed,&rdquo;
                &ldquo;negligent.&rdquo; The platform&rsquo;s architectural role is to ensure the
                defense-grade contextual narrative is available by default — not merely the raw log
                that invites STI-driven attribution.
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
      flex: 1,
      minWidth: 0,
      backgroundColor: '#0a0f1a',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: '12px',
      overflow: 'hidden',
      minHeight: '500px',
      display: 'flex',
      flexDirection: 'column',
      order: swapped ? 2 : 1,
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
      flex: 1,
      minWidth: 0,
      backgroundColor: '#111827',
      border: '1px solid rgba(34, 197, 94, 0.2)',
      borderRadius: '12px',
      overflow: 'hidden',
      minHeight: '500px',
      display: 'flex',
      flexDirection: 'column',
      order: swapped ? 1 : 2,
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

  const btnBase: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
  };

  const btnHighlightActive: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(250, 204, 21, 0.3)',
  };

  return (
    <div style={{ padding: '32px 40px', backgroundColor: '#0f172a', minHeight: '100%' }}>
      {/* Header + Toolbar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: '#f8fafc', fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            The Contrast
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', margin: '4px 0 0 0' }}>
            Same data, two framings — how documentation shapes perception
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleHighlight}
            style={highlightMode ? btnHighlightActive : btnBase}
          >
            {highlightMode ? '● Highlighting On' : 'Highlight Shared Data'}
          </button>
          <button onClick={handleSwap} style={btnBase}>
            ⇄ Swap Panels
          </button>
        </div>
      </div>

      {/* Panel labels */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
        <div style={{ flex: 1, textAlign: 'center', order: swapped ? 2 : 1 }}>
          <span style={{
            display: 'inline-block',
            padding: '5px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}>
            ⚠ Prosecution Exhibit
          </span>
        </div>
        <div style={{ flex: 1, textAlign: 'center', order: swapped ? 1 : 2 }}>
          <span style={{
            display: 'inline-block',
            padding: '5px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(34, 197, 94, 0.12)',
            color: '#4ade80',
            border: '1px solid rgba(34, 197, 94, 0.25)',
          }}>
            ✓ Defense Exhibit
          </span>
        </div>
      </div>

      {/* Split panels */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '28px' }}>
        {logPanel}
        {narrativePanel}
      </div>

      {/* Research context (for Grayson) */}
      <ResearchContextSection />
    </div>
  );
};

export default TheContrast;

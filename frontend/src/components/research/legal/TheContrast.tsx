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

  const highlightClass = highlightMode
    ? 'underline decoration-yellow-400/60 decoration-2 underline-offset-2'
    : '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/60">
        <h3 className="text-slate-200 text-lg font-semibold tracking-tight">
          Structured Activity Log
        </h3>
        <p className="text-slate-500 text-xs mt-1">
          Raw temporal record — no interpretive context
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-5 py-4">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-slate-500 text-xs uppercase tracking-wider">
              <th className="text-left pb-3 pr-4 font-medium">Event</th>
              <th className="text-left pb-3 pr-4 font-medium">Timestamp</th>
              <th className="text-left pb-3 font-medium">Duration</th>
            </tr>
          </thead>
          <tbody className="text-slate-400">
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-t border-slate-800 ${row.isTotal ? 'font-bold text-slate-200' : ''}`}
              >
                <td className="py-3 pr-4 whitespace-nowrap">{row.label}</td>
                <td className={`py-3 pr-4 whitespace-nowrap ${highlightClass}`}>
                  {row.timestamp}
                </td>
                <td className={`py-3 whitespace-nowrap ${highlightClass}`}>
                  {row.duration || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer total */}
      <div className="px-5 py-4 border-t border-slate-700/60 bg-slate-800/30">
        <p className="text-slate-300 text-sm font-bold font-mono">
          Total time on case:{' '}
          <span className={highlightClass}>
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

    const highlightSpan = highlightMode
      ? 'underline decoration-yellow-400/60 decoration-2 underline-offset-2'
      : '';

    return { density, viewCount, initialConfidence, acknowledgedCount, changeDesc, startTime, preAiTime, postAiTime, highlightSpan };
  }, [events, derivedMetrics, ledgerEntries, highlightMode]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-600/40">
        <h3 className="text-slate-100 text-lg font-semibold tracking-tight">
          Clinical Reasoning Documentation
        </h3>
        <p className="text-slate-400 text-xs mt-1">
          Contextualized decision process
        </p>
      </div>

      {/* Narrative */}
      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="prose-sm text-slate-300 leading-relaxed space-y-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          <p>
            The reader began independent review of the bilateral mammographic study at{' '}
            <span className={narrative.highlightSpan}>{narrative.startTime}</span>.
            During the{' '}
            <span className={narrative.highlightSpan}>{narrative.preAiTime}</span>{' '}
            pre-consultation period, the reader assessed {narrative.density} breast tissue,
            examined {narrative.viewCount} standard views, and formed an initial clinical
            impression of {biradsLabel(derivedMetrics.initialBirads)} with a confidence
            level of {narrative.initialConfidence}. This independent assessment was
            cryptographically locked before any AI output was visible to the reader.
          </p>

          <p>
            Following the independent assessment lock, the AI consultation system presented
            its analysis. The reader spent{' '}
            <span className={narrative.highlightSpan}>{narrative.postAiTime}</span>{' '}
            reviewing the AI&rsquo;s findings
            {narrative.acknowledgedCount > 0
              ? `, reviewed all ${narrative.acknowledgedCount} flagged region${narrative.acknowledgedCount !== 1 ? 's' : ''}`
              : ''
            }, and {narrative.changeDesc}.
          </p>

          <p>
            The complete decision chain — from independent read through AI consultation to
            final determination — is hash-linked and independently verifiable. Total session
            duration:{' '}
            <span className={narrative.highlightSpan}>
              {formatMs(derivedMetrics.totalTimeMs)}
            </span>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-600/40 bg-slate-700/20">
        <p className="text-slate-400 text-xs italic">
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
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-5 py-3 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
      >
        <span className="text-slate-300 text-sm font-medium">
          Why This Matters: Spontaneous Trait Inference
        </span>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 py-4 bg-slate-900/50 border-t border-slate-700/60">
          <div className="text-slate-400 text-sm leading-relaxed space-y-3">
            <p>
              Research on spontaneous trait inference (STI) demonstrates that observers
              automatically infer character traits from behavioral descriptions. A bare time
              record of &ldquo;2 minutes, 14 seconds&rdquo; activates trait inference — the
              observer involuntarily concludes &ldquo;careless&rdquo; or &ldquo;rushed.&rdquo;
              Narrative documentation that contextualizes the same temporal data within a
              clinical reasoning framework disrupts this inference pathway.
            </p>
            <p>
              The left panel recreates what a plaintiff&rsquo;s attorney would present to a
              jury: raw numbers stripped of context, designed to invite snap judgments about the
              radiologist&rsquo;s character. The right panel demonstrates how the same data,
              embedded in a reasoning narrative, prevents those inferences by providing the
              &ldquo;story&rdquo; that jurors need to evaluate behavior fairly.
            </p>
            <div className="pt-2 border-t border-slate-800">
              <p className="text-slate-500 text-xs">
                <span className="font-medium text-slate-400">References:</span>{' '}
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
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden h-full">
      <StructuredLogPanel
        events={events}
        derivedMetrics={derivedMetrics}
        highlightMode={highlightMode}
      />
    </div>
  );

  const narrativePanel = (
    <div className="bg-slate-800/60 border border-slate-600/50 rounded-lg overflow-hidden h-full">
      <ClinicalNarrativePanel
        caseId={caseId}
        events={events}
        derivedMetrics={derivedMetrics}
        ledgerEntries={ledgerEntries}
        highlightMode={highlightMode}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight">
            The Contrast
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Same data, two framings — how documentation shapes perception
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleHighlight}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              highlightMode
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {highlightMode ? 'Highlighting On' : 'Highlight Shared Data'}
          </button>
          <button
            onClick={handleSwap}
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            Swap Panels
          </button>
        </div>
      </div>

      {/* Panel labels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`text-center ${swapped ? 'md:order-2' : 'md:order-1'}`}>
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            Prosecution Exhibit
          </span>
        </div>
        <div className={`text-center ${swapped ? 'md:order-1' : 'md:order-2'}`}>
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Defense Exhibit
          </span>
        </div>
      </div>

      {/* Split panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[420px]">
        <div className={swapped ? 'md:order-2' : 'md:order-1'}>
          {logPanel}
        </div>
        <div className={swapped ? 'md:order-1' : 'md:order-2'}>
          {narrativePanel}
        </div>
      </div>

      {/* Research context (for Grayson) */}
      <ResearchContextSection />
    </div>
  );
};

export default TheContrast;

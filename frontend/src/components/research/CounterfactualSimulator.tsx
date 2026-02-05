import React, { useState } from 'react';
import {
  GitBranch,
  Clock,
  AlertTriangle,
  Scale,
  FileDown,
  ChevronRight,
  Eye,
  ShieldAlert,
  Cpu,
  User,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Minus,
} from 'lucide-react';
import type {
  CounterfactualCase,
  CounterfactualEvent,
  OutcomeMetric,
  LegalFrame,
  ScenarioId,
  Scenario,
} from '../../data/counterfactualDemoData';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CounterfactualSimulatorProps {
  caseData: CounterfactualCase;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const colors = {
  bg: '#020617',
  cardBg: 'rgba(15, 23, 42, 0.8)',
  cardBorder: '#1e293b',
  headerText: '#f8fafc',
  bodyText: '#e2e8f0',
  mutedText: '#94a3b8',
  dimText: '#64748b',
  blue: '#3b82f6',
  blueDim: 'rgba(59, 130, 246, 0.15)',
  amber: '#f59e0b',
  amberDim: 'rgba(245, 158, 11, 0.15)',
  emerald: '#10b981',
  emeraldDim: 'rgba(16, 185, 129, 0.15)',
  red: '#ef4444',
  redDim: 'rgba(239, 68, 68, 0.15)',
  purple: '#8b5cf6',
  purpleDim: 'rgba(139, 92, 246, 0.15)',
  divider: '#1e293b',
};

const card: React.CSSProperties = {
  backgroundColor: colors.cardBg,
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: '12px',
  padding: '24px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: colors.dimText,
  marginBottom: '16px',
};

const mono: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(ms: number): string {
  if (ms < 1000) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function eventTypeColor(type: string): string {
  if (type.startsWith('AI_') || type === 'DISCLOSURE_PRESENTED') return colors.purple;
  if (type === 'FIRST_IMPRESSION' || type === 'REVISED_IMPRESSION') return colors.blue;
  if (type === 'REPORT_SIGNED' || type === 'CASE_CLOSED') return colors.emerald;
  if (type === 'SECOND_LOOK' || type === 'WORKLIST_FLAG') return colors.amber;
  return colors.dimText;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const Badge: React.FC<{ children: React.ReactNode; color?: string; bg?: string }> = ({
  children,
  color = colors.blue,
  bg = colors.blueDim,
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 10px',
      borderRadius: '9999px',
      fontSize: '11px',
      fontWeight: 600,
      color,
      backgroundColor: bg,
      letterSpacing: '0.02em',
    }}
  >
    {children}
  </span>
);

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

const Header: React.FC = () => (
  <div style={{ marginBottom: '32px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
      <GitBranch size={28} color={colors.blue} />
      <h1
        style={{
          fontSize: '28px',
          fontWeight: 700,
          color: colors.headerText,
          letterSpacing: '-0.02em',
          margin: 0,
        }}
      >
        Counterfactual Analysis Engine
      </h1>
      <Badge>Research Preview</Badge>
    </div>
    <p style={{ color: colors.mutedText, fontSize: '15px', margin: 0, lineHeight: 1.6 }}>
      Reconstruct alternative decision pathways for the same case
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// Case Summary Panel
// ---------------------------------------------------------------------------

const CaseSummary: React.FC<{ caseData: CounterfactualCase }> = ({ caseData }) => (
  <div style={{ ...card, marginBottom: '20px' }}>
    <div style={sectionTitle}>Case Summary</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
      <div>
        <div style={{ fontSize: '11px', color: colors.dimText, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Case ID
        </div>
        <div style={{ ...mono, color: colors.bodyText, fontSize: '14px' }}>{caseData.caseId}</div>
      </div>
      <div>
        <div style={{ fontSize: '11px', color: colors.dimText, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Modality
        </div>
        <div style={{ color: colors.bodyText, fontSize: '14px' }}>{caseData.modality}</div>
      </div>
      <div>
        <div style={{ fontSize: '11px', color: colors.dimText, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Study Date
        </div>
        <div style={{ ...mono, color: colors.bodyText, fontSize: '14px' }}>{caseData.studyDate}</div>
      </div>
    </div>

    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '11px', color: colors.dimText, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Patient
      </div>
      <div style={{ color: colors.bodyText, fontSize: '14px', lineHeight: 1.5 }}>{caseData.patientSummary}</div>
    </div>

    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '11px', color: colors.red, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        Actual Outcome
      </div>
      <div
        style={{
          color: colors.bodyText,
          fontSize: '14px',
          lineHeight: 1.6,
          padding: '12px 16px',
          backgroundColor: colors.redDim,
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.red}`,
        }}
      >
        {caseData.actualOutcome}
      </div>
    </div>

    <div>
      <div style={{ fontSize: '11px', color: colors.dimText, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Key Timestamps
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {caseData.keyTimestamps.map((ts, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#0f172a',
              borderRadius: '6px',
              border: '1px solid #1e293b',
              fontSize: '12px',
            }}
          >
            <Clock size={12} color={colors.dimText} />
            <span style={{ color: colors.mutedText }}>{ts.date}</span>
            <ChevronRight size={10} color={colors.dimText} />
            <span style={{ color: colors.bodyText }}>{ts.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Scenario Tabs
// ---------------------------------------------------------------------------

interface ScenarioTabsProps {
  scenarios: Scenario[];
  activeId: ScenarioId;
  onChange: (id: ScenarioId) => void;
}

const scenarioIcons: Record<ScenarioId, React.ReactNode> = {
  actual: <User size={16} />,
  'with-ai': <Eye size={16} />,
  'without-ai': <ShieldAlert size={16} />,
  'ai-only': <Cpu size={16} />,
};

const ScenarioTabs: React.FC<ScenarioTabsProps> = ({ scenarios, activeId, onChange }) => (
  <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
    {scenarios.map((s) => {
      const active = s.id === activeId;
      return (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            border: active ? `1px solid ${colors.blue}` : '1px solid #1e293b',
            backgroundColor: active ? colors.blueDim : 'transparent',
            color: active ? colors.blue : colors.mutedText,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: active ? 600 : 400,
            transition: 'all 0.15s ease',
          }}
        >
          {scenarioIcons[s.id]}
          {s.label}
        </button>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------------
// Timeline Event Row
// ---------------------------------------------------------------------------

const TimelineEventRow: React.FC<{
  event: CounterfactualEvent;
  isLast: boolean;
  side: 'actual' | 'counterfactual';
}> = ({ event, isLast, side }) => {
  const dotColor = event.isDivergence ? colors.amber : eventTypeColor(event.eventType);
  const dotSize = event.isDivergence ? 12 : 8;

  return (
    <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
      {/* Dot + line */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '20px',
          flexShrink: 0,
          paddingTop: '4px',
        }}
      >
        <div
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: '50%',
            backgroundColor: dotColor,
            boxShadow: event.isDivergence ? `0 0 8px ${colors.amber}` : 'none',
            flexShrink: 0,
          }}
        />
        {!isLast && (
          <div
            style={{
              width: '1px',
              flex: 1,
              backgroundColor: '#334155',
              marginTop: '4px',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          paddingBottom: isLast ? 0 : '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ ...mono, fontSize: '11px', color: colors.dimText }}>
            {formatTimestamp(event.timestamp)}
          </span>
          <span
            style={{
              ...mono,
              fontSize: '10px',
              color: side === 'counterfactual' && event.isDivergence ? colors.amber : colors.dimText,
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor:
                side === 'counterfactual' && event.isDivergence ? colors.amberDim : '#0f172a',
            }}
          >
            {event.eventType}
          </span>
          {event.isDivergence && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <AlertTriangle size={10} color={colors.amber} />
              <span style={{ fontSize: '10px', color: colors.amber, fontWeight: 600 }}>DIVERGENCE</span>
            </span>
          )}
        </div>
        <div style={{ color: colors.bodyText, fontSize: '13px', lineHeight: 1.4 }}>
          {event.label}
        </div>
        {event.decision && (
          <div style={{ color: colors.mutedText, fontSize: '12px', marginTop: '2px' }}>
            {event.decision}
          </div>
        )}
        {event.confidence !== undefined && (
          <div style={{ marginTop: '4px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#0f172a',
                fontSize: '11px',
                color: colors.mutedText,
              }}
            >
              Confidence: <span style={{ color: colors.bodyText, fontWeight: 600 }}>{event.confidence}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Timeline Panel
// ---------------------------------------------------------------------------

const TimelinePanel: React.FC<{
  title: string;
  events: CounterfactualEvent[];
  side: 'actual' | 'counterfactual';
  accent: string;
}> = ({ title, events, side, accent }) => (
  <div
    style={{
      ...card,
      flex: 1,
      minWidth: 0,
      borderTop: `2px solid ${accent}`,
    }}
  >
    <div
      style={{
        fontSize: '14px',
        fontWeight: 600,
        color: accent,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {side === 'actual' ? <User size={16} /> : <GitBranch size={16} />}
      {title}
    </div>
    <div>
      {events.map((event, i) => (
        <TimelineEventRow
          key={event.id}
          event={event}
          isLast={i === events.length - 1}
          side={side}
        />
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Timeline Comparison View
// ---------------------------------------------------------------------------

const TimelineComparison: React.FC<{
  actualTimeline: CounterfactualEvent[];
  counterfactualTimeline: CounterfactualEvent[];
  counterfactualLabel: string;
}> = ({ actualTimeline, counterfactualTimeline, counterfactualLabel }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={sectionTitle}>Timeline Comparison</div>
    <div style={{ display: 'flex', gap: '16px' }}>
      <TimelinePanel
        title="Actual Workflow"
        events={actualTimeline}
        side="actual"
        accent={colors.mutedText}
      />
      <TimelinePanel
        title={counterfactualLabel}
        events={counterfactualTimeline}
        side="counterfactual"
        accent={colors.blue}
      />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Outcome Comparison Panel
// ---------------------------------------------------------------------------

const OutcomeComparison: React.FC<{ outcomes: OutcomeMetric[] }> = ({ outcomes }) => {
  if (outcomes.length === 0) return null;

  const sideIcon = (side: OutcomeMetric['favorsSide']) => {
    if (side === 'plaintiff') return <CheckCircle2 size={14} color={colors.red} />;
    if (side === 'defense') return <CheckCircle2 size={14} color={colors.emerald} />;
    return <Minus size={12} color={colors.dimText} />;
  };

  const sideLabel = (side: OutcomeMetric['favorsSide']) => {
    if (side === 'plaintiff') return 'Favors Plaintiff';
    if (side === 'defense') return 'Favors Defense';
    return 'Neutral';
  };

  const sideColor = (side: OutcomeMetric['favorsSide']) => {
    if (side === 'plaintiff') return colors.red;
    if (side === 'defense') return colors.emerald;
    return colors.dimText;
  };

  return (
    <div style={{ ...card, marginBottom: '20px' }}>
      <div style={sectionTitle}>Outcome Comparison</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Metric', 'Actual', 'Counterfactual', 'Implication'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    borderBottom: `1px solid ${colors.divider}`,
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: colors.dimText,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {outcomes.map((o, i) => (
              <tr
                key={i}
                style={{
                  backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(15, 23, 42, 0.5)',
                }}
              >
                <td style={{ padding: '10px 14px', fontSize: '13px', color: colors.bodyText, fontWeight: 500 }}>
                  {o.metric}
                </td>
                <td style={{ padding: '10px 14px', fontSize: '13px', color: colors.mutedText, ...mono }}>
                  {o.actual}
                </td>
                <td style={{ padding: '10px 14px', fontSize: '13px', color: colors.bodyText, ...mono }}>
                  {o.counterfactual}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {sideIcon(o.favorsSide)}
                    <span style={{ fontSize: '12px', color: sideColor(o.favorsSide) }}>
                      {sideLabel(o.favorsSide)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Legal Framing Panel
// ---------------------------------------------------------------------------

const LegalFrameCard: React.FC<{ frame: LegalFrame; isActive: boolean }> = ({ frame, isActive }) => {
  const isPlaintiff = frame.side === 'plaintiff';
  const accentColor = isPlaintiff ? colors.red : colors.emerald;
  const accentBg = isPlaintiff ? colors.redDim : colors.emeraldDim;

  return (
    <div
      style={{
        ...card,
        flex: 1,
        minWidth: 0,
        borderTop: `2px solid ${accentColor}`,
        opacity: isActive ? 1 : 0.4,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        {isPlaintiff ? <XCircle size={18} color={accentColor} /> : <ShieldAlert size={18} color={accentColor} />}
        <span style={{ fontSize: '14px', fontWeight: 600, color: accentColor }}>
          {isPlaintiff ? 'Plaintiff Frame' : 'Defense Frame'}
        </span>
      </div>
      <h4 style={{ fontSize: '15px', fontWeight: 600, color: colors.headerText, margin: '0 0 10px 0' }}>
        {frame.title}
      </h4>
      <p style={{ fontSize: '13px', color: colors.bodyText, lineHeight: 1.6, marginBottom: '16px' }}>
        {frame.summary}
      </p>
      <div style={{ fontSize: '11px', color: colors.dimText, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        Key Points
      </div>
      <ul style={{ margin: 0, paddingLeft: '18px' }}>
        {frame.keyPoints.map((pt, i) => (
          <li
            key={i}
            style={{
              fontSize: '12px',
              color: colors.mutedText,
              lineHeight: 1.6,
              marginBottom: '6px',
            }}
          >
            {pt}
          </li>
        ))}
      </ul>
    </div>
  );
};

const LegalFraming: React.FC<{ frames: LegalFrame[] }> = ({ frames }) => {
  const [activeView, setActiveView] = useState<'both' | 'plaintiff' | 'defense'>('both');

  if (frames.length === 0) return null;

  const plaintiff = frames.find((f) => f.side === 'plaintiff');
  const defense = frames.find((f) => f.side === 'defense');

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ ...sectionTitle, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={14} color={colors.dimText} />
            Legal Framing — Same Data, Two Narratives
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['both', 'plaintiff', 'defense'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: activeView === v ? `1px solid ${colors.blue}` : '1px solid transparent',
                backgroundColor: activeView === v ? colors.blueDim : 'transparent',
                color: activeView === v ? colors.blue : colors.dimText,
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {v === 'both' ? 'Both' : v === 'plaintiff' ? 'Plaintiff' : 'Defense'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        {plaintiff && (
          <LegalFrameCard
            frame={plaintiff}
            isActive={activeView === 'both' || activeView === 'plaintiff'}
          />
        )}
        {defense && (
          <LegalFrameCard
            frame={defense}
            isActive={activeView === 'both' || activeView === 'defense'}
          />
        )}
      </div>
      <div
        style={{
          marginTop: '12px',
          padding: '10px 16px',
          backgroundColor: colors.amberDim,
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.amber}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
        }}
      >
        <AlertTriangle size={14} color={colors.amber} style={{ marginTop: '2px', flexShrink: 0 }} />
        <span style={{ fontSize: '12px', color: colors.amber, lineHeight: 1.5 }}>
          <strong>STI Principle:</strong> These two narratives use identical underlying data.
          The framing determines whether a jury infers "negligent" or "reasonable" — this is
          Spontaneous Trait Inference applied to litigation. Evidify documents both to prevent
          one-sided presentation.
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Export Options
// ---------------------------------------------------------------------------

const ExportOptions: React.FC<{ caseId: string }> = ({ caseId }) => {
  const handleExport = (type: string) => {
    alert(`Export "${type}" for case ${caseId}\n\nIn production, this generates a downloadable ${type.includes('JSON') ? 'JSON' : 'PDF'} file.`);
  };

  const exportButtons = [
    { label: 'Export Plaintiff Analysis', type: 'Plaintiff Analysis (PDF)', color: colors.red, bg: colors.redDim },
    { label: 'Export Defense Analysis', type: 'Defense Analysis (PDF)', color: colors.emerald, bg: colors.emeraldDim },
    { label: 'Export Raw Comparison Data', type: 'Raw Comparison (JSON)', color: colors.blue, bg: colors.blueDim },
  ];

  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileDown size={14} color={colors.dimText} />
          Export Options
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {exportButtons.map((btn) => (
          <button
            key={btn.label}
            onClick={() => handleExport(btn.type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: `1px solid ${btn.color}33`,
              backgroundColor: btn.bg,
              color: btn.color,
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            <FileDown size={14} />
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Single-timeline view (for "actual" and "without-ai" scenarios)
// ---------------------------------------------------------------------------

const SingleTimeline: React.FC<{
  timeline: CounterfactualEvent[];
  label: string;
}> = ({ timeline, label }) => (
  <div style={{ ...card, marginBottom: '20px' }}>
    <div style={sectionTitle}>Workflow Timeline</div>
    <div
      style={{
        fontSize: '14px',
        fontWeight: 600,
        color: colors.mutedText,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <User size={16} />
      {label}
    </div>
    {timeline.map((event, i) => (
      <TimelineEventRow
        key={event.id}
        event={event}
        isLast={i === timeline.length - 1}
        side="actual"
      />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Not Applicable Banner
// ---------------------------------------------------------------------------

const NotApplicableBanner: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      ...card,
      marginBottom: '20px',
      borderLeft: `3px solid ${colors.amber}`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}
  >
    <AlertTriangle size={20} color={colors.amber} />
    <div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: colors.amber, marginBottom: '4px' }}>
        Scenario Not Applicable
      </div>
      <div style={{ fontSize: '13px', color: colors.mutedText, lineHeight: 1.5 }}>
        {message}
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Scenario Content
// ---------------------------------------------------------------------------

const ScenarioContent: React.FC<{
  scenario: Scenario;
  actualTimeline: CounterfactualEvent[];
}> = ({ scenario, actualTimeline }) => {
  // "actual" scenario — just show the actual timeline
  if (scenario.id === 'actual') {
    return (
      <>
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #1e293b',
            marginBottom: '20px',
            fontSize: '13px',
            color: colors.mutedText,
            lineHeight: 1.5,
          }}
        >
          {scenario.description}
        </div>
        <SingleTimeline timeline={scenario.timeline} label="Actual Workflow (Baseline)" />
      </>
    );
  }

  // "without-ai" — not applicable for this case
  if (scenario.id === 'without-ai') {
    return (
      <>
        <NotApplicableBanner message={scenario.description} />
        <SingleTimeline timeline={scenario.timeline} label="Actual Workflow (same as baseline — AI was not used)" />
      </>
    );
  }

  // "with-ai" or "ai-only" — show full comparison
  return (
    <>
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          marginBottom: '20px',
          fontSize: '13px',
          color: colors.mutedText,
          lineHeight: 1.5,
        }}
      >
        {scenario.description}
      </div>
      <TimelineComparison
        actualTimeline={actualTimeline}
        counterfactualTimeline={scenario.timeline}
        counterfactualLabel={scenario.label}
      />
      <OutcomeComparison outcomes={scenario.outcomes} />
      <LegalFraming frames={scenario.legalFrames} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Divergence Summary
// ---------------------------------------------------------------------------

const DivergenceSummary: React.FC<{ scenario: Scenario }> = ({ scenario }) => {
  const divergences = scenario.timeline.filter((e) => e.isDivergence);
  if (divergences.length === 0) return null;

  return (
    <div
      style={{
        ...card,
        marginBottom: '20px',
        borderLeft: `3px solid ${colors.amber}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          fontSize: '13px',
          fontWeight: 600,
          color: colors.amber,
        }}
      >
        <AlertTriangle size={14} />
        {divergences.length} Divergence Point{divergences.length !== 1 ? 's' : ''} Detected
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {divergences.map((d) => (
          <div
            key={d.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              backgroundColor: colors.amberDim,
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <ArrowRight size={12} color={colors.amber} />
            <span style={{ color: colors.bodyText }}>{d.label}</span>
            {d.decision && (
              <span style={{ color: colors.mutedText, ...mono, marginLeft: 'auto' }}>
                {d.decision}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const CounterfactualSimulator: React.FC<CounterfactualSimulatorProps> = ({ caseData }) => {
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('with-ai');

  const currentScenario = caseData.scenarios.find((s) => s.id === activeScenario);
  const actualTimeline = caseData.scenarios.find((s) => s.id === 'actual')?.timeline ?? [];

  if (!currentScenario) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.bg,
        padding: '32px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Header />
        <CaseSummary caseData={caseData} />
        <ScenarioTabs
          scenarios={caseData.scenarios}
          activeId={activeScenario}
          onChange={setActiveScenario}
        />
        <DivergenceSummary scenario={currentScenario} />
        <ScenarioContent scenario={currentScenario} actualTimeline={actualTimeline} />
        <ExportOptions caseId={caseData.caseId} />
      </div>
    </div>
  );
};

export default CounterfactualSimulator;

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Area,
  ComposedChart,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Calendar,
  User,
  FileText,
  BarChart3,
  Activity,
  Shield,
  Eye,
} from 'lucide-react';
import type {
  RadiologistData,
  DailyMetrics,
  CaseRecord,
  AutomationBiasIndicator,
  JianTrustScore,
  TrustEvent,
} from '../../data/trustTrajectoryDemoData';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TrustTrajectoryDashboardProps {
  data: Record<string, RadiologistData>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATE_RANGES = [
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
] as const;

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif";
const MONO = "JetBrains Mono, Consolas, Monaco, 'Courier New', monospace";

// Colors
const C = {
  bg: '#0a0f1a',
  bgCard: '#111827',
  bgCardHover: '#1a2332',
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
  purple: '#a78bfa',
  cyan: '#22d3ee',
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | number | React.ReactNode): string {
  const d = new Date(String(iso));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function trendArrow(current: number, previous: number): { icon: React.ReactNode; color: string; label: string } {
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return { icon: <Minus size={14} />, color: C.textMuted, label: 'Stable' };
  if (diff > 0) return { icon: <TrendingUp size={14} />, color: C.green, label: `+${diff.toFixed(1)}%` };
  return { icon: <TrendingDown size={14} />, color: C.red, label: `${diff.toFixed(1)}%` };
}

function computeRollingAverage(data: DailyMetrics[], field: keyof DailyMetrics, window: number): number[] {
  const values = data.map((d) => d[field] as number);
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

function getRangeColor(val: number): string {
  if (val > 90) return C.red;
  if (val > 80) return C.yellow;
  if (val >= 60) return C.green;
  if (val >= 50) return C.textMuted;
  return C.red;
}

function getOverrideRangeColor(val: number): string {
  if (val >= 8 && val <= 20) return C.green;
  if (val >= 5 && val <= 25) return C.yellow;
  return C.red;
}

function getAdoptionRangeColor(val: number): string {
  if (val <= 25) return C.green;
  if (val <= 30) return C.yellow;
  return C.red;
}

// ---------------------------------------------------------------------------
// Sub-components: Sparkline
// ---------------------------------------------------------------------------

const Sparkline: React.FC<{ data: number[]; color: string; width?: number; height?: number }> = ({
  data,
  color,
  width = 80,
  height = 28,
}) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Sub-component: MetricCard
// ---------------------------------------------------------------------------

interface MetricCardProps {
  label: string;
  value: string;
  trend: { icon: React.ReactNode; color: string; label: string };
  sparkData: number[];
  sparkColor: string;
  statusColor: string;
  subtitle?: string;
  alert?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  sparkData,
  sparkColor,
  statusColor,
  subtitle,
  alert,
}) => (
  <div
    style={{
      backgroundColor: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: '12px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* Status accent line */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        backgroundColor: statusColor,
        opacity: 0.7,
      }}
    />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
      <span style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: FONT }}>
        {label}
      </span>
      <Sparkline data={sparkData} color={sparkColor} />
    </div>

    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
      <span style={{ fontSize: '32px', fontWeight: 700, color: C.textPrimary, fontFamily: MONO, lineHeight: 1 }}>
        {value}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: trend.color, fontSize: '13px', fontFamily: MONO }}>
        {trend.icon}
        <span>{trend.label}</span>
      </div>
    </div>

    {subtitle && (
      <p style={{ fontSize: '12px', color: C.textDim, margin: 0, fontFamily: FONT }}>{subtitle}</p>
    )}
    {alert && (
      <div
        style={{
          marginTop: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          color: C.yellow,
          fontFamily: FONT,
        }}
      >
        <AlertTriangle size={12} />
        <span>{alert}</span>
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Sub-component: IndicatorChecklist
// ---------------------------------------------------------------------------

const IndicatorChecklist: React.FC<{
  title: string;
  titleColor: string;
  indicators: AutomationBiasIndicator[];
  icon: React.ReactNode;
}> = ({ title, titleColor, indicators, icon }) => (
  <div
    style={{
      backgroundColor: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: '12px',
      padding: '20px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <span style={{ color: titleColor }}>{icon}</span>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: titleColor, margin: 0, fontFamily: FONT }}>
        {title}
      </h3>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {indicators.map((ind) => (
        <div key={ind.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, marginTop: '2px' }}>
            {ind.met ? (
              ind.severity === 'critical' ? (
                <XCircle size={16} style={{ color: C.red }} />
              ) : ind.severity === 'warning' ? (
                <AlertTriangle size={16} style={{ color: C.yellow }} />
              ) : (
                <CheckCircle size={16} style={{ color: C.green }} />
              )
            ) : (
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  border: `1.5px solid ${C.borderLight}`,
                }}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: ind.met
                  ? ind.severity === 'critical'
                    ? C.red
                    : ind.severity === 'warning'
                    ? C.yellow
                    : C.green
                  : C.textMuted,
                margin: '0 0 2px 0',
                fontFamily: FONT,
              }}
            >
              {ind.label}
            </p>
            <p style={{ fontSize: '11px', color: C.textDim, margin: 0, lineHeight: 1.4, fontFamily: FONT }}>
              {ind.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Sub-component: Custom Recharts Tooltip
// ---------------------------------------------------------------------------

const TrajectoryTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
  events?: TrustEvent[];
}> = ({ active, payload, label, events }) => {
  if (!active || !payload || !label) return null;
  const dayEvent = events?.find((e) => e.date === label);

  return (
    <div
      style={{
        backgroundColor: '#1a2332',
        border: `1px solid ${C.borderLight}`,
        borderRadius: '8px',
        padding: '12px 16px',
        fontFamily: FONT,
        minWidth: '180px',
      }}
    >
      <p style={{ fontSize: '12px', fontWeight: 600, color: C.textSecondary, margin: '0 0 8px 0' }}>
        {formatDate(label)}
      </p>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontSize: '11px', color: C.textMuted }}>
            {p.dataKey === 'rollingAgreement'
              ? 'Agreement (7d avg)'
              : p.dataKey === 'agreementRate'
              ? 'Agreement'
              : p.dataKey === 'overrideRate'
              ? 'Override'
              : p.dataKey === 'adoptionRate'
              ? 'Adoption'
              : p.dataKey}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: p.color, fontFamily: MONO }}>
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}%
          </span>
        </div>
      ))}
      {dayEvent && (
        <div
          style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: `1px solid ${C.border}`,
            fontSize: '11px',
            color: C.cyan,
          }}
        >
          {dayEvent.label}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-component: Case Table
// ---------------------------------------------------------------------------

type SortField = 'timestamp' | 'aiConfidence' | 'action' | 'agreed';
type SortDir = 'asc' | 'desc';

const CaseTable: React.FC<{ cases: CaseRecord[]; dateRange: number }> = ({ cases, dateRange }) => {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dateRange);
    return d.toISOString();
  }, [dateRange]);

  const filteredCases = useMemo(() => {
    let fc = cases.filter((c) => c.timestamp >= cutoff);
    if (filterAction !== 'all') fc = fc.filter((c) => c.action === filterAction);
    fc.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'timestamp') cmp = a.timestamp.localeCompare(b.timestamp);
      else if (sortField === 'aiConfidence') cmp = a.aiConfidence - b.aiConfidence;
      else if (sortField === 'action') cmp = a.action.localeCompare(b.action);
      else if (sortField === 'agreed') cmp = (a.agreed ? 1 : 0) - (b.agreed ? 1 : 0);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return fc;
  }, [cases, cutoff, filterAction, sortField, sortDir]);

  const pageCount = Math.ceil(filteredCases.length / PAGE_SIZE);
  const pageCases = filteredCases.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '11px',
    fontWeight: 700,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
    fontFamily: FONT,
    whiteSpace: 'nowrap',
    borderBottom: `1px solid ${C.border}`,
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '12px',
    color: C.textSecondary,
    fontFamily: MONO,
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: 'nowrap',
  };

  const actionColor = (action: string): string => {
    if (action === 'override') return C.yellow;
    if (action === 'adopt') return C.blue;
    return C.green;
  };

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: FONT }}>Filter:</span>
        {['all', 'confirm', 'adopt', 'override'].map((f) => (
          <button
            key={f}
            onClick={() => { setFilterAction(f); setPage(0); }}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: FONT,
              fontWeight: 600,
              cursor: 'pointer',
              border: filterAction === f ? `1px solid ${C.blue}` : `1px solid ${C.border}`,
              backgroundColor: filterAction === f ? C.blueBg : 'transparent',
              color: filterAction === f ? C.blue : C.textMuted,
            }}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ fontSize: '12px', color: C.textDim, fontFamily: MONO, marginLeft: 'auto' }}>
          {filteredCases.length} cases
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: C.bgCard }}>
          <thead>
            <tr>
              <th style={thStyle}>Case ID</th>
              <th style={thStyle} onClick={() => handleSort('timestamp')}>
                Date {sortField === 'timestamp' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={thStyle}>AI Rec</th>
              <th style={thStyle} onClick={() => handleSort('aiConfidence')}>
                AI Conf {sortField === 'aiConfidence' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={thStyle}>Initial</th>
              <th style={thStyle}>Final</th>
              <th style={thStyle} onClick={() => handleSort('agreed')}>
                Agreed {sortField === 'agreed' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={thStyle} onClick={() => handleSort('action')}>
                Action {sortField === 'action' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={thStyle}>Rationale</th>
            </tr>
          </thead>
          <tbody>
            {pageCases.map((c) => (
              <tr key={c.caseId} style={{ transition: 'background-color 0.15s' }}>
                <td style={{ ...tdStyle, fontWeight: 600, color: C.textPrimary }}>{c.caseId}</td>
                <td style={tdStyle}>{formatDate(c.timestamp)}</td>
                <td style={tdStyle}>{c.aiRecommendation}</td>
                <td style={{ ...tdStyle, color: c.aiConfidence >= 80 ? C.green : c.aiConfidence >= 60 ? C.yellow : C.textMuted }}>
                  {c.aiConfidence}%
                </td>
                <td style={tdStyle}>{c.initialAssessment}</td>
                <td style={tdStyle}>{c.finalAssessment}</td>
                <td style={tdStyle}>
                  <span style={{ color: c.agreed ? C.green : C.red }}>{c.agreed ? 'Yes' : 'No'}</span>
                </td>
                <td style={{ ...tdStyle, color: actionColor(c.action), fontWeight: 600 }}>
                  {c.action.charAt(0).toUpperCase() + c.action.slice(1)}
                </td>
                <td style={tdStyle}>
                  {c.rationaleDocumented ? (
                    <CheckCircle size={14} style={{ color: C.green }} />
                  ) : (
                    <XCircle size={14} style={{ color: C.textDim }} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: page === 0 ? 'default' : 'pointer',
              border: `1px solid ${C.border}`,
              backgroundColor: 'transparent',
              color: page === 0 ? C.textDim : C.textSecondary,
              fontFamily: FONT,
              opacity: page === 0 ? 0.4 : 1,
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: MONO }}>
            {page + 1} / {pageCount}
          </span>
          <button
            onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
            disabled={page >= pageCount - 1}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: page >= pageCount - 1 ? 'default' : 'pointer',
              border: `1px solid ${C.border}`,
              backgroundColor: 'transparent',
              color: page >= pageCount - 1 ? C.textDim : C.textSecondary,
              fontFamily: FONT,
              opacity: page >= pageCount - 1 ? 0.4 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-component: Jian Trust Panel
// ---------------------------------------------------------------------------

const JianTrustPanel: React.FC<{ scores: JianTrustScore[]; behavioralAgreement: number }> = ({
  scores,
  behavioralAgreement,
}) => {
  const latestScore = scores[scores.length - 1];
  const selfReportedTrust = latestScore?.trustScore ?? 0;
  const discrepancy = Math.abs(selfReportedTrust / 7 * 100 - behavioralAgreement);
  const hasDiscrepancy = discrepancy > 20;

  return (
    <div
      style={{
        backgroundColor: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Shield size={16} style={{ color: C.purple }} />
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, margin: 0, fontFamily: FONT }}>
          Jian Trust Scale (Self-Report)
        </h3>
      </div>

      {/* Score chart */}
      <div style={{ width: '100%', height: 180, marginBottom: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scores} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              stroke={C.textDim}
              tick={{ fontSize: 10, fontFamily: MONO }}
            />
            <YAxis
              domain={[1, 7]}
              ticks={[1, 2, 3, 4, 5, 6, 7]}
              stroke={C.textDim}
              tick={{ fontSize: 10, fontFamily: MONO }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a2332',
                border: `1px solid ${C.borderLight}`,
                borderRadius: '8px',
                fontFamily: FONT,
                fontSize: '12px',
              }}
              labelFormatter={formatDate}
            />
            <Line type="monotone" dataKey="trustScore" stroke={C.purple} strokeWidth={2} dot={{ r: 4 }} name="Overall Trust" />
            <Line type="monotone" dataKey="reliabilitySubscale" stroke={C.blue} strokeWidth={1.5} dot={{ r: 3 }} name="Reliability" />
            <Line type="monotone" dataKey="competenceSubscale" stroke={C.green} strokeWidth={1.5} dot={{ r: 3 }} name="Competence" />
            <Line type="monotone" dataKey="predictabilitySubscale" stroke={C.yellow} strokeWidth={1.5} dot={{ r: 3 }} name="Predictability" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
        {[
          { label: 'Overall', color: C.purple },
          { label: 'Reliability', color: C.blue },
          { label: 'Competence', color: C.green },
          { label: 'Predictability', color: C.yellow },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '3px', backgroundColor: item.color, borderRadius: '2px' }} />
            <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: FONT }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Discrepancy alert */}
      {hasDiscrepancy && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: C.yellowBg,
            border: `1px solid ${C.yellowBorder}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <AlertTriangle size={14} style={{ color: C.yellow, flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: C.yellow, margin: '0 0 2px 0', fontFamily: FONT }}>
              Trust-Behavior Discrepancy
            </p>
            <p style={{ fontSize: '11px', color: C.textMuted, margin: 0, fontFamily: FONT }}>
              Self-reported trust ({selfReportedTrust.toFixed(1)}/7 = {(selfReportedTrust / 7 * 100).toFixed(0)}%)
              differs from behavioral agreement rate ({behavioralAgreement.toFixed(0)}%) by {discrepancy.toFixed(0)} points.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const TrustTrajectoryDashboard: React.FC<TrustTrajectoryDashboardProps> = ({ data }) => {
  const radiologistIds = Object.keys(data);
  const [selectedRadiologist, setSelectedRadiologist] = useState(radiologistIds[0]);
  const [dateRange, setDateRange] = useState<number>(90);
  const [casesExpanded, setCasesExpanded] = useState(false);
  const [jianExpanded, setJianExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentData = data[selectedRadiologist];
  const { radiologist, dailyMetrics, cases, events, jianScores } = currentData;

  // Filter metrics by date range
  const filteredMetrics = useMemo(() => {
    return dailyMetrics.slice(-dateRange);
  }, [dailyMetrics, dateRange]);

  // Compute summary metrics
  const summary = useMemo(() => {
    const recent = filteredMetrics.slice(-14);
    const prior = filteredMetrics.slice(-28, -14);
    const recentAvg = (arr: DailyMetrics[], field: keyof DailyMetrics) =>
      arr.reduce((s, d) => s + (d[field] as number), 0) / (arr.length || 1);

    const agreementCurrent = recentAvg(recent, 'agreementRate');
    const agreementPrior = recentAvg(prior, 'agreementRate');
    const overrideCurrent = recentAvg(recent, 'overrideRate');
    const overridePrior = recentAvg(prior, 'overrideRate');
    const adoptionCurrent = recentAvg(recent, 'adoptionRate');
    const adoptionPrior = recentAvg(prior, 'adoptionRate');
    const preAiTimeCurrent = recentAvg(recent, 'preAiAssessmentTimeSec');
    const preAiTimePrior = recentAvg(prior, 'preAiAssessmentTimeSec');

    return {
      agreementCurrent,
      agreementPrior,
      overrideCurrent,
      overridePrior,
      adoptionCurrent,
      adoptionPrior,
      preAiTimeCurrent,
      preAiTimePrior,
    };
  }, [filteredMetrics]);

  // Rolling average data for the main chart
  const chartData = useMemo(() => {
    const rolling7 = computeRollingAverage(filteredMetrics, 'agreementRate', 7);
    return filteredMetrics.map((d, i) => ({
      ...d,
      rollingAgreement: Math.round(rolling7[i] * 10) / 10,
    }));
  }, [filteredMetrics]);

  // Sparkline data
  const agreementSpark = useMemo(() => filteredMetrics.slice(-30).map((d) => d.agreementRate), [filteredMetrics]);
  const overrideSpark = useMemo(() => filteredMetrics.slice(-30).map((d) => d.overrideRate), [filteredMetrics]);
  const adoptionSpark = useMemo(() => filteredMetrics.slice(-30).map((d) => d.adoptionRate), [filteredMetrics]);
  const preAiTimeSpark = useMemo(
    () => filteredMetrics.slice(-30).map((d) => d.preAiAssessmentTimeSec),
    [filteredMetrics],
  );

  // Profile badge
  const profileBadge = useMemo(() => {
    if (radiologist.profile === 'healthy')
      return { label: 'Healthy Calibration', color: C.green, bg: C.greenBg, border: C.greenBorder };
    if (radiologist.profile === 'automation-bias')
      return { label: 'Automation Bias Risk', color: C.red, bg: C.redBg, border: C.redBorder };
    return { label: 'Under-Utilization', color: C.yellow, bg: C.yellowBg, border: C.yellowBorder };
  }, [radiologist.profile]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: C.bg,
        color: C.textPrimary,
        fontFamily: FONT,
        padding: '32px 24px',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* ----------------------------------------------------------------- */}
        {/* Header */}
        {/* ----------------------------------------------------------------- */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <TrendingUp size={28} style={{ color: C.blue }} />
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Trust Trajectory Dashboard
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: C.textMuted, margin: '0 0 20px 0' }}>
            Longitudinal measurement of human-AI trust calibration &mdash; Grayson Baird, Psychometric Measurement
          </p>

          {/* Controls row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            {/* Radiologist selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${C.borderLight}`,
                  backgroundColor: C.bgCard,
                  color: C.textPrimary,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: FONT,
                  minWidth: '200px',
                }}
              >
                <User size={16} style={{ color: C.textMuted }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{radiologist.name}</span>
                <ChevronDown size={14} style={{ color: C.textMuted }} />
              </button>
              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: C.bgCard,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    zIndex: 50,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  {radiologistIds.map((id) => {
                    const r = data[id].radiologist;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          setSelectedRadiologist(id);
                          setDropdownOpen(false);
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          border: 'none',
                          backgroundColor: id === selectedRadiologist ? C.blueBg : 'transparent',
                          color: id === selectedRadiologist ? C.blue : C.textSecondary,
                          fontSize: '13px',
                          fontWeight: id === selectedRadiologist ? 600 : 400,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: FONT,
                        }}
                      >
                        {r.name}
                        <span style={{ display: 'block', fontSize: '11px', color: C.textDim }}>
                          {r.specialty} &bull; {r.yearsExperience}yr
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Date range selector */}
            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
              {DATE_RANGES.map((dr) => (
                <button
                  key={dr.value}
                  onClick={() => setDateRange(dr.value)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: dateRange === dr.value ? C.blueBg : C.bgCard,
                    color: dateRange === dr.value ? C.blue : C.textMuted,
                    fontFamily: FONT,
                    borderRight: `1px solid ${C.border}`,
                  }}
                >
                  {dr.label}
                </button>
              ))}
            </div>

            {/* Profile badge */}
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                color: profileBadge.color,
                backgroundColor: profileBadge.bg,
                border: `1px solid ${profileBadge.border}`,
                fontFamily: FONT,
              }}
            >
              {profileBadge.label}
            </span>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Export buttons */}
            <button
              onClick={() => alert('Export Trust Report (PDF) — demo placeholder')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                backgroundColor: 'transparent',
                color: C.textMuted,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              <FileText size={14} />
              Export Report
            </button>
            <button
              onClick={() => alert('Export Raw Data (CSV) — demo placeholder')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                backgroundColor: 'transparent',
                color: C.textMuted,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Primary Metric Cards */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <MetricCard
            label="Agreement Rate"
            value={`${summary.agreementCurrent.toFixed(1)}%`}
            trend={trendArrow(summary.agreementCurrent, summary.agreementPrior)}
            sparkData={agreementSpark}
            sparkColor={getRangeColor(summary.agreementCurrent)}
            statusColor={getRangeColor(summary.agreementCurrent)}
            subtitle="Cases matching AI recommendation"
            alert={
              summary.agreementCurrent > 90
                ? 'Automation bias risk'
                : summary.agreementCurrent < 50
                ? 'Under-utilization flag'
                : undefined
            }
          />
          <MetricCard
            label="Override Rate"
            value={`${summary.overrideCurrent.toFixed(1)}%`}
            trend={trendArrow(summary.overrideCurrent, summary.overridePrior)}
            sparkData={overrideSpark}
            sparkColor={getOverrideRangeColor(summary.overrideCurrent)}
            statusColor={getOverrideRangeColor(summary.overrideCurrent)}
            subtitle="Healthy range: 8–20%"
            alert={
              summary.overrideCurrent < 5
                ? 'Critically low override rate'
                : summary.overrideCurrent > 30
                ? 'High override rate'
                : undefined
            }
          />
          <MetricCard
            label="Adoption Rate"
            value={`${summary.adoptionCurrent.toFixed(1)}%`}
            trend={trendArrow(summary.adoptionCurrent, summary.adoptionPrior)}
            sparkData={adoptionSpark}
            sparkColor={getAdoptionRangeColor(summary.adoptionCurrent)}
            statusColor={getAdoptionRangeColor(summary.adoptionCurrent)}
            subtitle="Changed to match AI after reveal"
            alert={summary.adoptionCurrent > 25 ? 'Possible automation bias' : undefined}
          />
          <MetricCard
            label="Pre-AI Assessment Time"
            value={`${summary.preAiTimeCurrent.toFixed(0)}s`}
            trend={trendArrow(summary.preAiTimeCurrent, summary.preAiTimePrior)}
            sparkData={preAiTimeSpark}
            sparkColor={C.blue}
            statusColor={C.blue}
            subtitle="Mean time before AI reveal"
            alert={
              summary.preAiTimeCurrent < summary.preAiTimePrior * 0.8
                ? 'Decreasing deliberation time'
                : undefined
            }
          />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Trust Trajectory Chart */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            backgroundColor: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Activity size={18} style={{ color: C.blue }} />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Trust Trajectory</h2>
          </div>
          <p style={{ fontSize: '12px', color: C.textDim, margin: '0 0 20px 0' }}>
            Rolling 7-day agreement rate with calibration zones &bull; Reference: Jian et al. (2000)
          </p>

          {/* Chart legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
            {[
              { label: 'Agreement (7d avg)', color: C.blue },
              { label: 'Daily Agreement', color: 'rgba(59, 130, 246, 0.3)' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '3px', backgroundColor: item.color, borderRadius: '2px' }} />
                <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: FONT }}>{item.label}</span>
              </div>
            ))}
            {[
              { label: 'Healthy (60-80%)', color: C.green },
              { label: 'Watch (80-90%)', color: C.yellow },
              { label: 'Risk (>90%)', color: C.red },
              { label: 'Distrust (<50%)', color: C.textDim },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{ width: '12px', height: '12px', backgroundColor: item.color, borderRadius: '2px', opacity: 0.2 }}
                />
                <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: FONT }}>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={{ width: '100%', height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                {/* Calibration zones */}
                <ReferenceArea y1={90} y2={100} fill={C.red} fillOpacity={0.06} />
                <ReferenceArea y1={80} y2={90} fill={C.yellow} fillOpacity={0.06} />
                <ReferenceArea y1={60} y2={80} fill={C.green} fillOpacity={0.06} />
                <ReferenceArea y1={50} y2={60} fill={C.textDim} fillOpacity={0.04} />
                <ReferenceArea y1={0} y2={50} fill={C.red} fillOpacity={0.04} />

                {/* Event annotation lines */}
                {events.map((evt) => (
                  <ReferenceLine
                    key={evt.date}
                    x={evt.date}
                    stroke={C.cyan}
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    label={{
                      value: evt.label,
                      position: 'insideTopRight',
                      fill: C.cyan,
                      fontSize: 9,
                      fontFamily: FONT,
                    }}
                  />
                ))}

                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
                  stroke={C.textDim}
                  tick={{ fontSize: 10, fontFamily: MONO }}
                  interval={Math.max(1, Math.floor(chartData.length / 12))}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 50, 60, 80, 90, 100]}
                  stroke={C.textDim}
                  tick={{ fontSize: 10, fontFamily: MONO }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  content={<TrajectoryTooltip events={events} />}
                />
                {/* Daily dots (faded) */}
                <Area
                  type="monotone"
                  dataKey="agreementRate"
                  stroke="rgba(59, 130, 246, 0.3)"
                  fill="rgba(59, 130, 246, 0.05)"
                  strokeWidth={1}
                  dot={false}
                />
                {/* Rolling average line */}
                <Line
                  type="monotone"
                  dataKey="rollingAgreement"
                  stroke={C.blue}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: C.blue, stroke: C.bgCard, strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Secondary charts row: Override + Adoption + Pre-AI Time */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Override & Adoption Rate Chart */}
          <div
            style={{
              backgroundColor: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0' }}>Override & Adoption Rates</h3>
            <p style={{ fontSize: '11px', color: C.textDim, margin: '0 0 16px 0' }}>
              Daily rates with 7-day rolling average
            </p>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    stroke={C.textDim}
                    tick={{ fontSize: 9, fontFamily: MONO }}
                    interval={Math.max(1, Math.floor(chartData.length / 8))}
                  />
                  <YAxis
                    domain={[0, 50]}
                    stroke={C.textDim}
                    tick={{ fontSize: 9, fontFamily: MONO }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    content={<TrajectoryTooltip events={events} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="overrideRate"
                    stroke={C.yellow}
                    strokeWidth={1.5}
                    dot={false}
                    name="Override"
                  />
                  <Line
                    type="monotone"
                    dataKey="adoptionRate"
                    stroke={C.purple}
                    strokeWidth={1.5}
                    dot={false}
                    name="Adoption"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '3px', backgroundColor: C.yellow, borderRadius: '2px' }} />
                <span style={{ fontSize: '11px', color: C.textMuted }}>Override</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '3px', backgroundColor: C.purple, borderRadius: '2px' }} />
                <span style={{ fontSize: '11px', color: C.textMuted }}>Adoption</span>
              </div>
            </div>
          </div>

          {/* Pre-AI Assessment Time Chart */}
          <div
            style={{
              backgroundColor: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0' }}>Pre-AI Assessment Time</h3>
            <p style={{ fontSize: '11px', color: C.textDim, margin: '0 0 16px 0' }}>
              Deliberation time before AI reveal (seconds)
            </p>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    stroke={C.textDim}
                    tick={{ fontSize: 9, fontFamily: MONO }}
                    interval={Math.max(1, Math.floor(chartData.length / 8))}
                  />
                  <YAxis
                    stroke={C.textDim}
                    tick={{ fontSize: 9, fontFamily: MONO }}
                    tickFormatter={(v: number) => `${v}s`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a2332',
                      border: `1px solid ${C.borderLight}`,
                      borderRadius: '8px',
                      fontFamily: FONT,
                      fontSize: '12px',
                    }}
                    labelFormatter={formatDate}
                    formatter={(value: number | string | undefined) => [`${value ?? 0}s`, 'Time']}
                  />
                  <Area
                    type="monotone"
                    dataKey="preAiAssessmentTimeSec"
                    stroke={C.cyan}
                    fill="rgba(34, 211, 238, 0.08)"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Behavioral Pattern Analysis */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <IndicatorChecklist
            title="Automation Bias Indicators"
            titleColor={C.red}
            indicators={currentData.automationBiasIndicators}
            icon={<AlertTriangle size={16} />}
          />
          <IndicatorChecklist
            title="Under-Utilization Indicators"
            titleColor={C.yellow}
            indicators={currentData.underUtilizationIndicators}
            icon={<Eye size={16} />}
          />
          <IndicatorChecklist
            title="Healthy Calibration Indicators"
            titleColor={C.green}
            indicators={currentData.healthyCalibrationIndicators}
            icon={<CheckCircle size={16} />}
          />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Jian Trust Scale (collapsible) */}
        {/* ----------------------------------------------------------------- */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setJianExpanded(!jianExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '16px 20px',
              borderRadius: jianExpanded ? '12px 12px 0 0' : '12px',
              border: `1px solid ${C.border}`,
              borderBottom: jianExpanded ? 'none' : `1px solid ${C.border}`,
              backgroundColor: C.bgCard,
              color: C.textPrimary,
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: FONT,
              textAlign: 'left',
            }}
          >
            {jianExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Shield size={16} style={{ color: C.purple }} />
            Jian Trust Scale Integration
            <span style={{ fontSize: '11px', color: C.textDim, fontWeight: 400, marginLeft: '8px' }}>
              Self-reported trust scores (biweekly survey)
            </span>
          </button>
          {jianExpanded && (
            <div
              style={{
                borderRadius: '0 0 12px 12px',
                border: `1px solid ${C.border}`,
                borderTop: 'none',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '4px' }}>
                <JianTrustPanel scores={jianScores} behavioralAgreement={summary.agreementCurrent} />
              </div>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Case-Level Drill-Down (collapsible) */}
        {/* ----------------------------------------------------------------- */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setCasesExpanded(!casesExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '16px 20px',
              borderRadius: casesExpanded ? '12px 12px 0 0' : '12px',
              border: `1px solid ${C.border}`,
              borderBottom: casesExpanded ? 'none' : `1px solid ${C.border}`,
              backgroundColor: C.bgCard,
              color: C.textPrimary,
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: FONT,
              textAlign: 'left',
            }}
          >
            {casesExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <BarChart3 size={16} style={{ color: C.blue }} />
            Case-Level Drill-Down
            <span style={{ fontSize: '11px', color: C.textDim, fontWeight: 400, marginLeft: '8px' }}>
              {cases.length} total cases
            </span>
          </button>
          {casesExpanded && (
            <div
              style={{
                borderRadius: '0 0 12px 12px',
                border: `1px solid ${C.border}`,
                borderTop: 'none',
                padding: '20px',
                backgroundColor: C.bgCard,
              }}
            >
              <CaseTable cases={cases} dateRange={dateRange} />
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Action Row */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '20px',
            backgroundColor: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <button
            onClick={() => alert('Export Trust Report (PDF) — demo placeholder')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: `1px solid ${C.blueBorder}`,
              backgroundColor: C.blueBg,
              color: C.blue,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            <FileText size={16} />
            Export Trust Report (PDF)
          </button>
          <button
            onClick={() => alert('Export Raw Data (CSV) — demo placeholder')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: `1px solid ${C.border}`,
              backgroundColor: 'transparent',
              color: C.textMuted,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            <Download size={16} />
            Export Raw Data (CSV)
          </button>
          <button
            onClick={() => alert('Schedule Calibration Test — demo placeholder')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: `1px solid ${C.border}`,
              backgroundColor: 'transparent',
              color: C.textMuted,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            <Calendar size={16} />
            Schedule Calibration Test
          </button>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Research Context */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.04)',
            border: `1px solid rgba(59, 130, 246, 0.12)`,
            marginBottom: '16px',
          }}
        >
          <p style={{ fontSize: '12px', color: C.textDim, margin: '0 0 4px 0', fontWeight: 600, fontFamily: FONT }}>
            Research Context
          </p>
          <p style={{ fontSize: '11px', color: C.textDim, margin: 0, lineHeight: 1.5, fontFamily: FONT }}>
            Trust calibration zones based on automation bias literature (Parasuraman & Riley, 1997; Goddard et al., 2012).
            Behavioral indicators derived from Jian et al. (2000) trust measurement framework. Agreement rates in the
            60–80% range indicate healthy independent assessment while appropriately leveraging AI assistance. Sustained
            rates above 85% warrant investigation for automation bias onset. This dashboard is a research measurement
            tool and does not provide clinical recommendations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrustTrajectoryDashboard;

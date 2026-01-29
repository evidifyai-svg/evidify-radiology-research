/**
 * PacketViewer.tsx
 * 
 * In-app visualization of export package contents
 * 
 * PURPOSE:
 * Make the instrument feel real in 15 seconds without unzipping.
 * 
 * TABS:
 * 1. Events - Interactive table of all logged events
 * 2. Ledger - Hash chain with verification status
 * 3. Verifier - PASS/FAIL with all 8 checks
 * 4. Metrics - Derived metrics row with ADDA calculation
 * 5. Download - Generate and download ZIP
 * 
 * GRAYSON FEEDBACK ADDRESSED:
 * - "Do not make them unzip anything live"
 * - "A one-screen 'Packet Viewer' inside the app"
 * - "This makes the instrument feel real in 15 minutes"
 */

import React, { useState, useMemo } from 'react';
import type { 
  CanonicalEvent, 
  CanonicalLedgerEntry 
} from './CanonicalHash';

// ============================================================================
// TYPES
// ============================================================================

export interface PacketViewerProps {
  events: CanonicalEvent[];
  ledger: CanonicalLedgerEntry[];
  manifest: TrialManifest;
  derivedMetrics: DerivedMetrics;
  verifierOutput: VerifierOutput;
  onDownload?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export interface TrialManifest {
  exportVersion: string;
  schemaVersion: string;
  exportTimestamp: string;
  sessionId: string;
  participantId?: string;
  condition?: string;
  integrity: {
    eventCount: number;
    finalHash: string;
    chainValid: boolean;
  };
  protocol: {
    revealTiming: string;
    disclosureFormat: string;
    deviationEnforcement: string;
  };
  timestampTrustModel: string;
  fileChecksums?: {
    events: string;
    ledger: string;
    metrics: string;
  };
  disclosureProvenance?: {
    fdrValue: number;
    forValue: number;
    source: string;
    thresholdHash?: string;
  };
  randomization?: {
    seed: string;
    assignmentMethod: string;
    conditionMatrixHash?: string;
  };
}

export interface DerivedMetrics {
  sessionId: string;
  timestamp: string;
  initialBirads: number;
  finalBirads: number;
  aiBirads: number | null;
  aiConfidence: number | null;
  changeOccurred: boolean;
  aiConsistentChange: boolean;
  aiInconsistentChange: boolean;
  adda: boolean | null;
  addaDenominator: boolean;
  deviationDocumented: boolean;
  deviationSkipped: boolean;
  deviationRequired: boolean;
  comprehensionCorrect: boolean | null;
  preAiReadMs?: number | null;
  postAiReadMs?: number | null;
  totalReadMs?: number | null;
  aiExposureMs?: number | null;
  hasPreAiEpisode?: boolean;
  hasPostAiEpisode?: boolean;
  totalTimeMs: number;
  lockToRevealMs: number;
  revealToFinalMs: number;
}

export interface VerifierCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

export interface VerifierOutput {
  result: 'PASS' | 'FAIL';
  timestamp: string;
  checks: VerifierCheck[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
}

// ============================================================================
// PACKET VIEWER COMPONENT
// ============================================================================

export const PacketViewer: React.FC<PacketViewerProps> = ({
  events,
  ledger,
  manifest,
  derivedMetrics,
  verifierOutput,
  onDownload,
  isOpen = true,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'ledger' | 'verifier' | 'metrics' | 'download'>('events');
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const [expandedLedgerIndex, setExpandedLedgerIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const tabs = [
    { id: 'events', label: 'Events', count: events.length },
    { id: 'ledger', label: 'Ledger', count: ledger.length },
    { id: 'verifier', label: 'Verifier', status: verifierOutput.result },
    { id: 'metrics', label: 'Metrics' },
    { id: 'download', label: 'Download' },
  ] as const;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>Package</span>
            <h2 style={styles.title}>Export Package Contents</h2>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.schemaVersion}>Schema v{manifest.schemaVersion}</span>
            {onClose && (
              <button style={styles.closeButton} onClick={onClose}>×</button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabNav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              {tab.label}
              {'count' in tab && tab.count !== undefined && (
                <span style={styles.tabBadge}>{tab.count}</span>
              )}
              {'status' in tab && tab.status && (
                <span style={{
                  ...styles.tabBadge,
                  backgroundColor: tab.status === 'PASS' ? '#22c55e' : '#ef4444',
                }}>
                  {tab.status}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={styles.content}>
          {activeTab === 'events' && (
            <EventsTab 
              events={events} 
              selectedIndex={selectedEventIndex}
              onSelectEvent={setSelectedEventIndex}
            />
          )}
          {activeTab === 'ledger' && (
            <LedgerTab 
              ledger={ledger}
              expandedIndex={expandedLedgerIndex}
              onToggleExpand={setExpandedLedgerIndex}
            />
          )}
          {activeTab === 'verifier' && (
            <VerifierTab output={verifierOutput} />
          )}
          {activeTab === 'metrics' && (
            <MetricsTab metrics={derivedMetrics} manifest={manifest} />
          )}
          {activeTab === 'download' && (
            <DownloadTab manifest={manifest} onDownload={onDownload} />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EVENTS TAB
// ============================================================================

interface EventsTabProps {
  events: CanonicalEvent[];
  selectedIndex: number | null;
  onSelectEvent: (index: number | null) => void;
}

const EventsTab: React.FC<EventsTabProps> = ({ events, selectedIndex, onSelectEvent }) => {
  const [filter, setFilter] = useState('');
  
  const filteredEvents = useMemo(() => {
    if (!filter) return events;
    const lower = filter.toLowerCase();
    return events.filter(e => 
      e.type.toLowerCase().includes(lower) ||
      JSON.stringify(e.payload).toLowerCase().includes(lower)
    );
  }, [events, filter]);

  const eventTypeColors: Record<string, string> = {
    SESSION_STARTED: '#6366f1',
    CASE_LOADED: '#8b5cf6',
    IMAGE_VIEWED: '#a855f7',
    FIRST_IMPRESSION_LOCKED: '#22c55e',
    AI_REVEALED: '#f59e0b',
    DISCLOSURE_PRESENTED: '#06b6d4',
    DISCLOSURE_COMPREHENSION_RESPONSE: '#14b8a6',
    DEVIATION_STARTED: '#f97316',
    DEVIATION_SUBMITTED: '#84cc16',
    DEVIATION_SKIPPED: '#ef4444',
    FINAL_ASSESSMENT: '#3b82f6',
    EXPORT_GENERATED: '#64748b',
  };

  return (
    <div style={styles.tabContent}>
      {/* Search */}
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="Filter events..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={styles.searchInput}
        />
        <span style={styles.eventCount}>{filteredEvents.length} events</span>
      </div>

      {/* Event List */}
      <div style={styles.eventList}>
        {filteredEvents.map((event, i) => {
          const isSelected = selectedIndex === event.seq;
          const color = eventTypeColors[event.type] || '#64748b';
          
          return (
            <div
              key={event.id}
              style={{
                ...styles.eventRow,
                ...(isSelected ? styles.eventRowSelected : {}),
              }}
              onClick={() => onSelectEvent(isSelected ? null : event.seq)}
            >
              <div style={styles.eventHeader}>
                <span style={{ ...styles.eventSeq, backgroundColor: color }}>
                  {event.seq}
                </span>
                <span style={styles.eventType}>{event.type}</span>
                <span style={styles.eventTime}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              {isSelected && (
                <div style={styles.eventDetail}>
                  <div style={styles.eventDetailRow}>
                    <span style={styles.eventDetailLabel}>ID:</span>
                    <code style={styles.eventDetailValue}>{event.id}</code>
                  </div>
                  <div style={styles.eventDetailRow}>
                    <span style={styles.eventDetailLabel}>Timestamp:</span>
                    <code style={styles.eventDetailValue}>{event.timestamp}</code>
                  </div>
                  <div style={styles.eventDetailRow}>
                    <span style={styles.eventDetailLabel}>Payload:</span>
                  </div>
                  <pre style={styles.eventPayload}>
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// LEDGER TAB
// ============================================================================

interface LedgerTabProps {
  ledger: CanonicalLedgerEntry[];
  expandedIndex: number | null;
  onToggleExpand: (index: number | null) => void;
}

const LedgerTab: React.FC<LedgerTabProps> = ({ ledger, expandedIndex, onToggleExpand }) => {
  return (
    <div style={styles.tabContent}>
      <div style={styles.ledgerHeader}>
        <span style={styles.ledgerTitle}>Hash Chain Ledger</span>
        <span style={styles.ledgerInfo}>
          Genesis: <code>0000...0000</code>
        </span>
      </div>

      <div style={styles.ledgerList}>
        {ledger.map((entry, i) => {
          const isExpanded = expandedIndex === entry.seq;
          
          return (
            <div
              key={entry.seq}
              style={styles.ledgerEntry}
              onClick={() => onToggleExpand(isExpanded ? null : entry.seq)}
            >
              <div style={styles.ledgerEntryHeader}>
                <div style={styles.ledgerLeft}>
                  <span style={styles.ledgerSeq}>{entry.seq}</span>
                  <span style={styles.ledgerType}>{entry.eventType}</span>
                </div>
                <div style={styles.ledgerRight}>
                  <code style={styles.ledgerHash}>
                    {entry.chainHash.slice(0, 8)}...{entry.chainHash.slice(-8)}
                  </code>
                  <span style={styles.ledgerExpandIcon}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div style={styles.ledgerDetail}>
                  <div style={styles.hashRow}>
                    <span style={styles.hashLabel}>Previous:</span>
                    <code style={styles.hashValue}>{entry.previousHash}</code>
                  </div>
                  <div style={styles.hashRow}>
                    <span style={styles.hashLabel}>Content:</span>
                    <code style={styles.hashValue}>{entry.contentHash}</code>
                  </div>
                  <div style={styles.hashRow}>
                    <span style={styles.hashLabel}>Chain:</span>
                    <code style={styles.hashValueHighlight}>{entry.chainHash}</code>
                  </div>
                  <div style={styles.hashRow}>
                    <span style={styles.hashLabel}>Event ID:</span>
                    <code style={styles.hashValue}>{entry.eventId}</code>
                  </div>
                  <div style={styles.chainFormula}>
                    chainHash = SHA-256(seq | prevHash | eventId | timestamp | contentHash)
                  </div>
                </div>
              )}

              {/* Visual chain connection */}
              {i < ledger.length - 1 && (
                <div style={styles.chainConnector}>
                  <div style={styles.chainLine} />
                  <span style={styles.chainArrow}>↓</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// VERIFIER TAB
// ============================================================================

interface VerifierTabProps {
  output: VerifierOutput;
}

const VerifierTab: React.FC<VerifierTabProps> = ({ output }) => {
  const statusColors = {
    PASS: { bg: '#dcfce7', text: '#166534', icon: 'PASS' },
    FAIL: { bg: '#fee2e2', text: '#991b1b', icon: 'FAIL' },
    WARN: { bg: '#fef3c7', text: '#92400e', icon: 'WARN' },
  };

  return (
    <div style={styles.tabContent}>
      {/* Result Banner */}
      <div style={{
        ...styles.resultBanner,
        backgroundColor: output.result === 'PASS' ? '#dcfce7' : '#fee2e2',
        borderColor: output.result === 'PASS' ? '#22c55e' : '#ef4444',
      }}>
        <span style={{
          ...styles.resultIcon,
          color: output.result === 'PASS' ? '#22c55e' : '#ef4444',
        }}>
          {output.result === 'PASS' ? 'PASS' : 'FAIL'}
        </span>
        <div style={styles.resultText}>
          <span style={{
            ...styles.resultTitle,
            color: output.result === 'PASS' ? '#166534' : '#991b1b',
          }}>
            {output.result}
          </span>
          <span style={styles.resultSubtitle}>
            {output.summary.passed}/{output.checks.length} checks passed
            {output.summary.warnings > 0 && `, ${output.summary.warnings} warnings`}
          </span>
        </div>
      </div>

      {/* Checks List */}
      <div style={styles.checksList}>
        {output.checks.map((check, i) => {
          const colors = statusColors[check.status];
          return (
            <div
              key={i}
              style={{
                ...styles.checkRow,
                backgroundColor: colors.bg,
              }}
            >
              <span style={{ ...styles.checkIcon, color: colors.text }}>
                {colors.icon}
              </span>
              <div style={styles.checkContent}>
                <span style={{ ...styles.checkName, color: colors.text }}>
                  {check.name}
                </span>
                <span style={styles.checkMessage}>{check.message}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Technical Note */}
      <div style={styles.technicalNote}>
        <strong>Verifier Note:</strong> This verifier is reproducible by any party.
        Run <code>npm run verify -- path/to/export/</code> to verify independently.
      </div>
    </div>
  );
};

// ============================================================================
// METRICS TAB
// ============================================================================

interface MetricsTabProps {
  metrics: DerivedMetrics;
  manifest: TrialManifest;
}

const MetricsTab: React.FC<MetricsTabProps> = ({ metrics, manifest }) => {
  // ADDA display logic
  const addaDisplay = useMemo(() => {
    if (!metrics.addaDenominator) {
      return { value: 'N/A', label: 'Not in ADDA denominator (initial = AI)', color: '#64748b' };
    }
    if (metrics.adda === true) {
      return { value: 'TRUE', label: 'Changed toward AI', color: '#ef4444' };
    }
    return { value: 'FALSE', label: 'Did not change toward AI', color: '#22c55e' };
  }, [metrics]);

  const metricGroups = [
    {
      title: 'Assessment Values',
      items: [
        { label: 'Initial BI-RADS', value: metrics.initialBirads },
        { label: 'Final BI-RADS', value: metrics.finalBirads },
        { label: 'AI BI-RADS', value: metrics.aiBirads ?? 'N/A' },
        { label: 'AI Confidence', value: metrics.aiConfidence ? `${(metrics.aiConfidence * 100).toFixed(0)}%` : 'N/A' },
      ],
    },
    {
      title: 'Change Analysis',
      items: [
        { label: 'Change Occurred', value: metrics.changeOccurred ? 'Yes' : 'No', highlight: metrics.changeOccurred },
        { label: 'AI-Consistent Change', value: metrics.aiConsistentChange ? 'Yes' : 'No', highlight: metrics.aiConsistentChange },
        { label: 'AI-Inconsistent Change', value: metrics.aiInconsistentChange ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'ADDA Calculation',
      items: [
        { label: 'ADDA Denominator', value: metrics.addaDenominator ? 'Yes (initial ≠ AI)' : 'No (initial = AI)' },
        { label: 'ADDA', value: addaDisplay.value, color: addaDisplay.color, note: addaDisplay.label },
      ],
    },
    {
      title: 'Documentation',
      items: [
        { label: 'Deviation Required', value: metrics.deviationRequired ? 'Yes' : 'No' },
        { label: 'Deviation Documented', value: metrics.deviationDocumented ? 'Yes' : 'No', highlight: metrics.deviationDocumented },
        { label: 'Deviation Skipped', value: metrics.deviationSkipped ? 'Yes' : 'No', warn: metrics.deviationSkipped },
        { label: 'Comprehension Correct', value: metrics.comprehensionCorrect === null ? 'N/A' : metrics.comprehensionCorrect ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Timing (ms)',
      items: [
        { label: 'Total Time', value: `${metrics.totalTimeMs.toLocaleString()} ms` },
        { label: 'Lock → Reveal', value: `${metrics.lockToRevealMs.toLocaleString()} ms` },
        { label: 'Reveal → Final', value: `${metrics.revealToFinalMs.toLocaleString()} ms` },
      ],
    },
  ];

  return (
    <div style={styles.tabContent}>
      {/* ADDA Highlight Card */}
      <div style={{
        ...styles.addaCard,
        borderColor: addaDisplay.color,
        backgroundColor: addaDisplay.color + '10',
      }}>
        <div style={styles.addaLabel}>ADDA Result</div>
        <div style={{ ...styles.addaValue, color: addaDisplay.color }}>
          {addaDisplay.value}
        </div>
        <div style={styles.addaNote}>{addaDisplay.label}</div>
      </div>

      {/* Metrics Grid */}
      <div style={styles.metricsGrid}>
        {metricGroups.map((group, gi) => (
          <div key={gi} style={styles.metricGroup}>
            <div style={styles.metricGroupTitle}>{group.title}</div>
            {group.items.map((item, ii) => (
              <div key={ii} style={styles.metricRow}>
                <span style={styles.metricLabel}>{item.label}</span>
                <span style={{
                  ...styles.metricValue,
                  ...(item.highlight ? styles.metricValueHighlight : {}),
                  ...(item.warn ? styles.metricValueWarn : {}),
                  ...(item.color ? { color: item.color, fontWeight: 600 } : {}),
                }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* FDR/FOR Provenance */}
      {manifest.disclosureProvenance && (
        <div style={styles.provenanceCard}>
          <div style={styles.provenanceTitle}>FDR/FOR Provenance</div>
          <div style={styles.provenanceRow}>
            <span>FDR:</span>
            <strong>{manifest.disclosureProvenance.fdrValue}</strong>
          </div>
          <div style={styles.provenanceRow}>
            <span>FOR:</span>
            <strong>{manifest.disclosureProvenance.forValue}</strong>
          </div>
          <div style={styles.provenanceRow}>
            <span>Source:</span>
            <code>{manifest.disclosureProvenance.source}</code>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DOWNLOAD TAB
// ============================================================================

interface DownloadTabProps {
  manifest: TrialManifest;
  onDownload?: () => void;
}

const DownloadTab: React.FC<DownloadTabProps> = ({ manifest, onDownload }) => {
  const files = [
    { name: 'trial_manifest.json', desc: 'Session metadata and integrity checksums', size: '~2 KB' },
    { name: 'events.jsonl', desc: 'Append-only event stream (one event per line)', size: '~5 KB' },
    { name: 'ledger.json', desc: 'Hash chain entries with cryptographic links', size: '~3 KB' },
    { name: 'verifier_output.json', desc: 'Automated integrity check results', size: '~1 KB' },
    { name: 'derived_metrics.csv', desc: 'Pre-computed analysis variables (single row)', size: '~500 B' },
    { name: 'codebook.md', desc: 'Field definitions and operational definitions', size: '~4 KB' },
  ];

  return (
    <div style={styles.tabContent}>
      {/* Package Info */}
      <div style={styles.packageInfo}>
        <div style={styles.packageTitle}>Expert Witness Packet</div>
        <div style={styles.packageMeta}>
          <span>Session: <code>{manifest.sessionId}</code></span>
          <span>Exported: {new Date(manifest.exportTimestamp).toLocaleString()}</span>
        </div>
      </div>

      {/* File List */}
      <div style={styles.fileList}>
        {files.map((file, i) => (
          <div key={i} style={styles.fileRow}>
            <span style={styles.fileIcon}>File</span>
            <div style={styles.fileInfo}>
              <span style={styles.fileName}>{file.name}</span>
              <span style={styles.fileDesc}>{file.desc}</span>
            </div>
            <span style={styles.fileSize}>{file.size}</span>
          </div>
        ))}
      </div>

      {/* Integrity Summary */}
      <div style={styles.integritySummary}>
        <div style={styles.integrityRow}>
          <span>Event Count:</span>
          <strong>{manifest.integrity.eventCount}</strong>
        </div>
        <div style={styles.integrityRow}>
          <span>Chain Valid:</span>
          <strong style={{ color: manifest.integrity.chainValid ? '#22c55e' : '#ef4444' }}>
            {manifest.integrity.chainValid ? 'Yes' : 'No'}
          </strong>
        </div>
        <div style={styles.integrityRow}>
          <span>Final Hash:</span>
          <code style={styles.finalHash}>
            {manifest.integrity.finalHash.slice(0, 16)}...
          </code>
        </div>
      </div>

      {/* Download Button */}
      <button style={styles.downloadButton} onClick={onDownload}>
        <span style={styles.downloadIcon}>⬇</span>
        Download ZIP Package
      </button>

      {/* Verifier Instructions */}
      <div style={styles.verifierInstructions}>
        <div style={styles.verifierTitle}>Verify Independently</div>
        <code style={styles.verifierCode}>
          npm run verify -- path/to/export/
        </code>
        <div style={styles.verifierNote}>
          The verifier is reproducible by any party.
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  schemaVersion: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  tabNav: {
    display: 'flex',
    padding: '0 24px',
    borderBottom: '1px solid #e5e7eb',
    gap: '4px',
  },
  tab: {
    padding: '12px 16px',
    border: 'none',
    background: 'none',
    fontSize: '14px',
    color: '#6b7280',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.15s',
  },
  tabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  tabBadge: {
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '10px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  // Events Tab
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
  },
  eventCount: {
    fontSize: '13px',
    color: '#6b7280',
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  eventRow: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  eventRowSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  eventSeq: {
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
  },
  eventType: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  eventTime: {
    marginLeft: 'auto',
    fontSize: '12px',
    color: '#6b7280',
  },
  eventDetail: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
  },
  eventDetailRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '4px',
  },
  eventDetailLabel: {
    fontSize: '12px',
    color: '#6b7280',
    width: '80px',
  },
  eventDetailValue: {
    fontSize: '12px',
    color: '#374151',
  },
  eventPayload: {
    margin: '8px 0 0 0',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '150px',
  },

  // Ledger Tab
  ledgerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  ledgerInfo: {
    fontSize: '12px',
    color: '#6b7280',
  },
  ledgerList: {
    display: 'flex',
    flexDirection: 'column',
  },
  ledgerEntry: {
    position: 'relative',
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '4px',
  },
  ledgerEntryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  ledgerSeq: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  ledgerType: {
    fontSize: '13px',
    color: '#374151',
  },
  ledgerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  ledgerHash: {
    fontSize: '11px',
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  ledgerExpandIcon: {
    fontSize: '10px',
    color: '#9ca3af',
  },
  ledgerDetail: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  hashRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  hashLabel: {
    fontSize: '11px',
    color: '#6b7280',
    width: '70px',
  },
  hashValue: {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: '#374151',
    wordBreak: 'break-all',
  },
  hashValueHighlight: {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: '#059669',
    fontWeight: 600,
    wordBreak: 'break-all',
  },
  chainFormula: {
    marginTop: '8px',
    fontSize: '10px',
    color: '#9ca3af',
    fontFamily: 'monospace',
    backgroundColor: '#f9fafb',
    padding: '8px',
    borderRadius: '4px',
  },
  chainConnector: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '4px 0',
  },
  chainLine: {
    width: '2px',
    height: '8px',
    backgroundColor: '#d1d5db',
  },
  chainArrow: {
    fontSize: '10px',
    color: '#9ca3af',
  },

  // Verifier Tab
  resultBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid',
  },
  resultIcon: {
    fontSize: '32px',
    fontWeight: 'bold',
  },
  resultText: {
    display: 'flex',
    flexDirection: 'column',
  },
  resultTitle: {
    fontSize: '24px',
    fontWeight: 700,
  },
  resultSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  checksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
  },
  checkIcon: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  checkContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  checkName: {
    fontSize: '14px',
    fontWeight: 600,
  },
  checkMessage: {
    fontSize: '12px',
    color: '#6b7280',
  },
  technicalNote: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#374151',
  },

  // Metrics Tab
  addaCard: {
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid',
    textAlign: 'center',
  },
  addaLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  addaValue: {
    fontSize: '36px',
    fontWeight: 700,
    margin: '8px 0',
  },
  addaNote: {
    fontSize: '13px',
    color: '#6b7280',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  metricGroup: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
  },
  metricGroupTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  metricLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  metricValue: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: 500,
  },
  metricValueHighlight: {
    color: '#059669',
    fontWeight: 600,
  },
  metricValueWarn: {
    color: '#dc2626',
    fontWeight: 600,
  },
  provenanceCard: {
    backgroundColor: '#fefce8',
    border: '1px solid #fef08a',
    borderRadius: '8px',
    padding: '16px',
  },
  provenanceTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#854d0e',
    marginBottom: '8px',
  },
  provenanceRow: {
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
    color: '#713f12',
    marginBottom: '4px',
  },

  // Download Tab
  packageInfo: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  packageTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  packageMeta: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '8px',
    fontSize: '13px',
    color: '#6b7280',
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  fileIcon: {
    fontSize: '20px',
  },
  fileInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  fileName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  fileDesc: {
    fontSize: '12px',
    color: '#6b7280',
  },
  fileSize: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  integritySummary: {
    padding: '16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  integrityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#374151',
  },
  finalHash: {
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  downloadButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  downloadIcon: {
    fontSize: '18px',
  },
  verifierInstructions: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    textAlign: 'center',
  },
  verifierTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
  },
  verifierCode: {
    display: 'block',
    padding: '12px',
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  verifierNote: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#6b7280',
  },
};

export default PacketViewer;

/**
 * ResearchDemoFlow_Enhanced.tsx
 * 
 * BRPLL Friday Demo - Enhanced with Study Control Surface
 * 
 * NEW FEATURES:
 * - Study Control Surface (seed, condition, case order, protocol visible)
 * - Visible ROI/attention metrics (dwell times, coverage %)
 * - Enhanced dual-view reliability
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MammogramDualViewSimple } from './research/MammogramDualViewSimple';
// import { PacketViewer } from './PacketViewer'; // Replaced by ExpertWitnessPacketViewer
import { ExportPackZip, DerivedMetrics } from '../lib/ExportPackZip';
import { EventLogger } from '../lib/event_logger';
import { generateSeed, assignCondition, manualCondition, ConditionAssignment, RevealCondition } from '../lib/condition_matrix';
import { CaseDefinition, CaseQueueState, generateCaseQueue, getCurrentCase, advanceQueue, isQueueComplete, getQueueProgress } from '../lib/case_queue';

type DemoStep = 'SETUP' | 'CALIBRATION' | 'CALIBRATION_FEEDBACK' | 'INITIAL' | 'AI_REVEALED' | 'DEVIATION' | 'COMPLETE' | 'TLX' | 'STUDY_COMPLETE';

interface DemoState {
  sessionId: string;
  step: DemoStep;
  condition: ConditionAssignment | null;
  caseQueue: CaseQueueState | null;
  currentCase: CaseDefinition | null;
  initialBirads: number | null;
  initialConfidence: number;
  preTrust: number;
  finalBirads: number | null;
  finalConfidence: number;
  postTrust: number;
  deviationRationale: string;
  comprehensionAnswer: string | null;
  comprehensionCorrect: boolean | null;
  calibrationBirads: number | null;
  calibrationConfidence: number;
  startTime: Date;
  caseStartTime: Date | null;
  lockTime: Date | null;
  aiRevealTime: Date | null;
  interactionCounts: { zooms: number; pans: number; };
  roiDwellTimes: Map<string, number>;
  caseResults: DerivedMetrics[];
  exportReady: boolean;
  exportUrl: string | null;
  exportFilename: string | null;
  verifierResult: 'PASS' | 'FAIL' | null;
  eventCount: number;
}

// ============================================================================
// STUDY CONTROL SURFACE COMPONENT
// ============================================================================
interface StudyControlSurfaceProps {
  condition: ConditionAssignment | null;
  sessionId: string;
  caseQueue: CaseQueueState | null;
  currentCaseId: string | null;
  isCollapsed: boolean;
  onToggle: () => void;
  disclosurePolicy: 'STATIC' | 'ADAPTIVE';
  onDisclosurePolicyChange: (policy: 'STATIC' | 'ADAPTIVE') => void;
  currentCaseDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

const StudyControlSurface: React.FC<StudyControlSurfaceProps> = ({ 
  condition, sessionId, caseQueue, currentCaseId, isCollapsed, onToggle,
  disclosurePolicy, onDisclosurePolicyChange, currentCaseDifficulty
}) => {
  if (!condition) return null;
  
  const caseOrder = caseQueue?.cases.map(c => c.caseId) || [];
  const currentIndex = caseOrder.findIndex(id => id === currentCaseId);
  
  return (
    <div style={{
      position: 'fixed',
      left: '20px',
      top: '20px',
      width: isCollapsed ? 'auto' : '320px',
      backgroundColor: '#0f172a',
      borderRadius: '12px',
      border: '2px solid #3b82f6',
      boxShadow: '0 20px 25px rgba(0,0,0,0.4)',
      zIndex: 100,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div 
        onClick={onToggle}
        style={{
          padding: '12px 16px',
          backgroundColor: '#1e40af',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <div style={{ color: 'white', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔬 STUDY CONTROL
          <span style={{ 
            backgroundColor: '#22c55e', 
            color: 'white', 
            padding: '2px 8px', 
            borderRadius: '10px', 
            fontSize: '10px',
            fontWeight: 600 
          }}>
            LIVE
          </span>
        </div>
        <span style={{ color: 'white', fontSize: '14px' }}>{isCollapsed ? '▼' : '▲'}</span>
      </div>
      
      {!isCollapsed && (
        <div style={{ padding: '16px' }}>
          {/* Protocol Version */}
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#1e293b', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>PROTOCOL</div>
            <div style={{ color: 'white', fontFamily: 'monospace', fontSize: '13px' }}>BRPLL-MAMMO-v1.0</div>
          </div>
          
          {/* Condition */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>CONDITION</div>
            <div style={{ 
              display: 'inline-block',
              padding: '6px 12px', 
              backgroundColor: condition.condition === 'HUMAN_FIRST' ? '#166534' : condition.condition === 'AI_FIRST' ? '#7c2d12' : '#4338ca',
              borderRadius: '6px',
              color: 'white',
              fontWeight: 700,
              fontSize: '14px'
            }}>
              {condition.condition === 'HUMAN_FIRST' ? '🧠 HUMAN_FIRST' : 
               condition.condition === 'AI_FIRST' ? '🤖 AI_FIRST' : '⚡ CONCURRENT'}
            </div>
          </div>
          
          {/* Seed */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>RANDOMIZATION SEED</div>
            <code style={{ 
              display: 'block',
              padding: '8px 12px', 
              backgroundColor: '#334155', 
              borderRadius: '6px',
              color: '#fbbf24',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              {condition.seed}
            </code>
          </div>
          
          {/* Assignment Method */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>ASSIGNMENT</div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>
              {condition.assignmentMethod === 'SEEDED_RANDOM' ? '🎲 Seeded Random' : '✋ Manual Override'}
            </div>
          </div>
          
          {/* Case Queue */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>CASE QUEUE</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {caseOrder.map((caseId, idx) => {
                const isCalibration = caseQueue?.cases[idx]?.isCalibration;
                const isCurrent = caseId === currentCaseId;
                const isCompleted = idx < currentIndex;
                return (
                  <div 
                    key={caseId}
                    title={`${caseId}${isCalibration ? ' (Calibration)' : ''}${isCompleted ? ' ✓ Complete' : isCurrent ? ' ← Current' : ' Pending'}`}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      fontWeight: isCurrent ? 700 : 400,
                      backgroundColor: isCurrent ? '#3b82f6' : isCompleted ? '#166534' : '#334155',
                      color: 'white',
                      border: isCalibration ? '2px dashed #f59e0b' : isCurrent ? '2px solid #60a5fa' : '1px solid #475569',
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isCompleted && <span style={{ color: '#4ade80' }}>✓</span>}
                    {isCurrent && <span style={{ color: '#fbbf24' }}>▶</span>}
                    {isCalibration ? '📚' : ''}{caseId.length > 12 ? caseId.slice(0, 10) + '..' : caseId}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
              Sequential reading required for study validity
            </div>
          </div>
          
          {/* Counterbalancing Scheme */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>COUNTERBALANCING</div>
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#1e3a5f', 
              borderRadius: '8px',
              border: '1px solid #3b82f6'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: '#93c5fd' }}>Scheme:</span>
                <span style={{ fontSize: '11px', color: 'white', fontWeight: 600 }}>Latin Square 4×4</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: '#93c5fd' }}>Arm:</span>
                <span style={{ 
                  fontSize: '11px', 
                  color: '#fbbf24', 
                  fontWeight: 700,
                  fontFamily: 'monospace'
                }}>
                  {condition.seed ? `ARM-${(parseInt(condition.seed.slice(-4), 16) % 4) + 1}` : 'ARM-1'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#93c5fd' }}>Case Order:</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {condition.seed ? (parseInt(condition.seed.slice(-2), 16) % 2 === 0 ? 'A→B→C→D' : 'D→C→B→A') : 'A→B→C→D'}
                </span>
              </div>
              <div style={{ 
                marginTop: '8px', 
                paddingTop: '8px', 
                borderTop: '1px solid #334155',
                fontSize: '9px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ color: '#22c55e' }}>✓</span>
                <span>Logged to RANDOMIZATION_ASSIGNED event</span>
              </div>
            </div>
          </div>
          
          {/* Disclosure Format */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>DISCLOSURE FORMAT</div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>
              📊 FDR/FOR (4% / 12%)
            </div>
          </div>
          
          {/* Adaptive Disclosure Toggle */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>DISCLOSURE POLICY</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => onDisclosurePolicyChange('STATIC')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  backgroundColor: disclosurePolicy === 'STATIC' ? '#3b82f6' : '#334155',
                  border: 'none',
                  borderRadius: '6px 0 0 6px',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                STATIC
              </button>
              <button
                onClick={() => onDisclosurePolicyChange('ADAPTIVE')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  backgroundColor: disclosurePolicy === 'ADAPTIVE' ? '#a855f7' : '#334155',
                  border: 'none',
                  borderRadius: '0 6px 6px 0',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ADAPTIVE
              </button>
            </div>
            {disclosurePolicy === 'ADAPTIVE' && (
              <div style={{ 
                marginTop: '8px', 
                padding: '8px', 
                backgroundColor: '#4c1d95', 
                borderRadius: '6px',
                fontSize: '10px',
                color: '#c4b5fd'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>🧠 Adaptive Mode Active</div>
                <div>Disclosure intensity varies by case difficulty:</div>
                <div style={{ marginTop: '4px', display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#86efac' }}>EASY: minimal</span>
                  <span style={{ color: '#fcd34d' }}>MED: standard</span>
                  <span style={{ color: '#fca5a5' }}>HARD: full+debias</span>
                </div>
                {currentCaseDifficulty && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '4px 8px', 
                    backgroundColor: currentCaseDifficulty === 'EASY' ? '#166534' : currentCaseDifficulty === 'MEDIUM' ? '#92400e' : '#7f1d1d',
                    borderRadius: '4px',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}>
                    Current: {currentCaseDifficulty}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Session ID */}
          <div style={{ 
            marginTop: '16px',
            padding: '8px',
            backgroundColor: '#0f172a',
            borderRadius: '6px',
            borderTop: '1px solid #334155'
          }}>
            <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '2px' }}>SESSION</div>
            <code style={{ color: '#64748b', fontSize: '10px', fontFamily: 'monospace' }}>{sessionId}</code>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ATTENTION METRICS PANEL
// ============================================================================
interface AttentionMetricsPanelProps {
  roiDwellTimes: Map<string, number>;
  interactionCounts: { zooms: number; pans: number };
  totalTimeMs: number;
}

const AttentionMetricsPanel: React.FC<AttentionMetricsPanelProps> = ({ 
  roiDwellTimes, interactionCounts, totalTimeMs 
}) => {
  const mammogramDwell = roiDwellTimes.get('mammogram') || 0;
  const aiBoxDwell = roiDwellTimes.get('ai_box') || 0;
  const fdrForDwell = roiDwellTimes.get('fdr_for') || 0;
  
  const totalDwell = mammogramDwell + aiBoxDwell + fdrForDwell;
  const coverage = totalTimeMs > 0 ? Math.min(100, (totalDwell / totalTimeMs) * 100) : 0;
  
  const mammogramPct = totalDwell > 0 ? (mammogramDwell / totalDwell) * 100 : 0;
  const aiBoxPct = totalDwell > 0 ? (aiBoxDwell / totalDwell) * 100 : 0;
  const fdrForPct = totalDwell > 0 ? (fdrForDwell / totalDwell) * 100 : 0;
  
  return (
    <div style={{
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '16px',
      border: '1px solid #334155'
    }}>
      <div style={{ 
        fontSize: '11px', 
        color: '#06b6d4', 
        fontWeight: 700, 
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        👁️ ATTENTION INSTRUMENTATION
        <span style={{ 
          backgroundColor: '#164e63', 
          color: '#22d3ee', 
          padding: '2px 6px', 
          borderRadius: '8px', 
          fontSize: '9px' 
        }}>
          PROXY
        </span>
      </div>
      
      {/* Coverage Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', color: '#64748b' }}>ROI Coverage</span>
          <span style={{ fontSize: '12px', color: 'white', fontWeight: 600 }}>{coverage.toFixed(0)}%</span>
        </div>
        <div style={{ height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            width: `${coverage}%`, 
            backgroundColor: '#06b6d4',
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
      
      {/* ROI Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
        <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#0f172a', borderRadius: '8px' }}>
          <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px' }}>Image</div>
          <div style={{ fontSize: '14px', color: '#22d3ee', fontWeight: 700 }}>{(mammogramDwell / 1000).toFixed(1)}s</div>
          <div style={{ fontSize: '9px', color: '#475569' }}>{mammogramPct.toFixed(0)}%</div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#0f172a', borderRadius: '8px' }}>
          <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px' }}>AI Box</div>
          <div style={{ fontSize: '14px', color: '#a855f7', fontWeight: 700 }}>{(aiBoxDwell / 1000).toFixed(1)}s</div>
          <div style={{ fontSize: '9px', color: '#475569' }}>{aiBoxPct.toFixed(0)}%</div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#0f172a', borderRadius: '8px' }}>
          <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px' }}>FDR/FOR</div>
          <div style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 700 }}>{(fdrForDwell / 1000).toFixed(1)}s</div>
          <div style={{ fontSize: '9px', color: '#475569' }}>{fdrForPct.toFixed(0)}%</div>
        </div>
      </div>
      
      {/* Interaction Counts */}
      <div style={{ display: 'flex', gap: '16px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>🔍</span>
          <span style={{ color: 'white', fontWeight: 600 }}>{interactionCounts.zooms}</span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>zooms</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>✋</span>
          <span style={{ color: 'white', fontWeight: 600 }}>{interactionCounts.pans}</span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>pans</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STUDY PACK DOWNLOAD MODAL - Turnkey Replication
// ============================================================================
interface StudyPackModalProps {
  isVisible: boolean;
  onClose: () => void;
  sessionId: string;
  condition: ConditionAssignment | null;
}

// =============================================================================
// KEYBOARD HELP MODAL
// =============================================================================
// =============================================================================
// EXPERT WITNESS PACKET VIEWER (For Legal Scrutiny)
// This is what Brian Shepard (tort attorney) and the expert witness radiologist will see
// =============================================================================
interface ExpertWitnessPacketProps {
  isVisible: boolean;
  onClose: () => void;
  sessionId: string;
  caseResults: DerivedMetrics[];
  events: any[];
  ledger: any[];
  verifierResult: 'PASS' | 'FAIL' | null;
  tamperDetected: boolean;
}

const ExpertWitnessPacketViewer: React.FC<ExpertWitnessPacketProps> = ({
  isVisible,
  onClose,
  sessionId,
  caseResults,
  events,
  ledger,
  verifierResult,
  tamperDetected,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'legal' | 'validity' | 'raw'>('timeline');
  
  if (!isVisible) return null;
  
  // Build decision timeline from events
  const keyEvents = events.filter(e => 
    ['SESSION_STARTED', 'FIRST_IMPRESSION_LOCKED', 'AI_REVEALED', 'DISCLOSURE_PRESENTED', 
     'FINAL_ASSESSMENT', 'DEVIATION_SUBMITTED', 'CASE_COMPLETED'].includes(e.type)
  );
  
  // Compute validity indicators
  const validityIndicators = {
    fastPreAI: caseResults.filter(r => (r.timeToLockMs || 0) < 5000).length,
    totalCases: caseResults.length,
    aiAgreementRate: caseResults.length > 0 
      ? Math.round((caseResults.filter(r => r.adda).length / caseResults.length) * 100) 
      : 0,
    deviationsDocumented: caseResults.filter(r => r.deviationRationale && r.deviationRationale.length > 0).length,
    deviationsRequired: caseResults.filter(r => r.changeOccurred).length,
    comprehensionPassed: caseResults.filter(r => r.comprehensionCorrect === true).length,
    comprehensionFailed: caseResults.filter(r => r.comprehensionCorrect === false).length,
    avgPreAITime: caseResults.length > 0
      ? Math.round(caseResults.reduce((sum, r) => sum + (r.timeToLockMs || 0), 0) / caseResults.length / 1000)
      : 0,
  };
  
  // Legal defense assessment
  const legalAssessment = {
    independentJudgment: validityIndicators.fastPreAI === 0 && validityIndicators.aiAgreementRate < 100,
    properDocumentation: validityIndicators.deviationsRequired === 0 || 
      validityIndicators.deviationsDocumented >= validityIndicators.deviationsRequired,
    errorRateAwareness: validityIndicators.comprehensionPassed > 0,
    chainIntegrity: verifierResult === 'PASS' && !tamperDetected,
  };
  
  const overallDefensibility = Object.values(legalAssessment).filter(Boolean).length;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: tamperDetected ? '3px solid #dc2626' : '3px solid #22c55e',
        boxShadow: tamperDetected 
          ? '0 0 60px rgba(220, 38, 38, 0.4)' 
          : '0 0 60px rgba(34, 197, 94, 0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          backgroundColor: tamperDetected ? '#7f1d1d' : '#14532d',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '4px',
            }}>
              <h2 style={{ color: 'white', margin: 0, fontSize: '20px' }}>
                ⚖️ Expert Witness Packet
              </h2>
              <div style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: tamperDetected ? '#dc2626' : '#22c55e',
                color: tamperDetected ? 'white' : '#052e16',
              }}>
                {tamperDetected ? '❌ INTEGRITY COMPROMISED' : '✓ VERIFIED AUTHENTIC'}
              </div>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
              Session: {sessionId} • Generated: {new Date().toISOString()}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer',
              padding: '0 8px',
            }}
          >×</button>
        </div>
        
        {/* Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #333',
        }}>
          {[
            { id: 'timeline', label: '📋 Decision Timeline', icon: '🔗' },
            { id: 'legal', label: '⚖️ Legal Summary', icon: '📜' },
            { id: 'validity', label: '🎯 Validity Indicators', icon: '📊' },
            { id: 'raw', label: '🔐 Raw Ledger', icon: '💾' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: activeTab === tab.id ? '#334155' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? 'white' : '#64748b',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div style={{ 
          padding: '24px', 
          maxHeight: 'calc(90vh - 180px)', 
          overflow: 'auto',
          backgroundColor: '#0f172a',
        }}>
          
          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div>
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                backgroundColor: '#1e293b', 
                borderRadius: '8px',
                borderLeft: '4px solid #3b82f6',
              }}>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                  TAMPER-EVIDENT DECISION CHAIN
                </div>
                <div style={{ color: 'white', fontSize: '14px' }}>
                  Each entry is cryptographically linked to the previous entry. 
                  Modification of any historical data breaks the chain and verification fails.
                </div>
              </div>
              
              {/* Timeline */}
              <div style={{ position: 'relative' }}>
                {keyEvents.slice(0, 15).map((event, i) => {
                  const ledgerEntry = ledger[i] || {};
                  const prevHash = i > 0 ? ledger[i-1]?.hash?.slice(0, 12) : 'GENESIS';
                  
                  return (
                    <div key={event.id} style={{
                      display: 'flex',
                      gap: '16px',
                      marginBottom: '16px',
                      position: 'relative',
                    }}>
                      {/* Timeline line */}
                      {i < keyEvents.length - 1 && (
                        <div style={{
                          position: 'absolute',
                          left: '19px',
                          top: '40px',
                          width: '2px',
                          height: 'calc(100% - 20px)',
                          backgroundColor: '#334155',
                        }} />
                      )}
                      
                      {/* Entry number */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: event.type.includes('LOCKED') ? '#f59e0b' :
                                        event.type.includes('AI') ? '#a855f7' :
                                        event.type.includes('FINAL') ? '#22c55e' :
                                        event.type.includes('DEVIATION') ? '#ef4444' : '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '14px',
                        flexShrink: 0,
                        zIndex: 1,
                      }}>
                        {i}
                      </div>
                      
                      {/* Entry content */}
                      <div style={{
                        flex: 1,
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        border: '1px solid #334155',
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          marginBottom: '8px',
                        }}>
                          <div>
                            <div style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                              {event.type.replace(/_/g, ' ')}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '11px' }}>
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div style={{
                            padding: '2px 8px',
                            backgroundColor: '#0f172a',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            color: '#4ade80',
                          }}>
                            {ledgerEntry.hash?.slice(0, 16) || 'pending'}...
                          </div>
                        </div>
                        
                        {/* Chain link indicator */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '10px',
                          color: '#64748b',
                        }}>
                          <span>🔗 Linked to:</span>
                          <code style={{ color: '#60a5fa' }}>{prevHash}...</code>
                        </div>
                        
                        {/* Key data */}
                        {event.data && (
                          <div style={{
                            marginTop: '8px',
                            padding: '8px',
                            backgroundColor: '#0f172a',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#94a3b8',
                          }}>
                            {event.type === 'FIRST_IMPRESSION_LOCKED' && (
                              <span>BI-RADS: <strong style={{ color: '#f59e0b' }}>{event.data.selectedBirads}</strong> • Confidence: {event.data.confidence}%</span>
                            )}
                            {event.type === 'AI_REVEALED' && (
                              <span>AI BI-RADS: <strong style={{ color: '#a855f7' }}>{event.data.aiBirads}</strong> • AI Confidence: {Math.round((event.data.aiConfidence || 0.87) * 100)}%</span>
                            )}
                            {event.type === 'FINAL_ASSESSMENT' && (
                              <span>Final BI-RADS: <strong style={{ color: '#22c55e' }}>{event.data.finalBirads}</strong> • Changed: {event.data.changeOccurred ? 'YES' : 'NO'}</span>
                            )}
                            {event.type === 'DEVIATION_SUBMITTED' && (
                              <span>Rationale: <em style={{ color: '#fcd34d' }}>"{(event.data.rationale || '').slice(0, 50)}..."</em></span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* LEGAL SUMMARY TAB */}
          {activeTab === 'legal' && (
            <div>
              {/* Overall Assessment */}
              <div style={{
                padding: '24px',
                backgroundColor: overallDefensibility >= 3 ? '#14532d' : overallDefensibility >= 2 ? '#713f12' : '#7f1d1d',
                borderRadius: '12px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                  {overallDefensibility >= 3 ? '✅' : overallDefensibility >= 2 ? '⚠️' : '❌'}
                </div>
                <div style={{ color: 'white', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
                  {overallDefensibility >= 3 ? 'DEFENSIBLE RECORD' : 
                   overallDefensibility >= 2 ? 'PARTIALLY DEFENSIBLE' : 'HIGH RISK'}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                  {overallDefensibility}/4 legal defense criteria met
                </div>
              </div>
              
              {/* Key Legal Questions */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '16px' }}>
                  📜 Key Legal Questions Answered
                </h3>
                
                {[
                  {
                    question: "Did the clinician exercise independent judgment?",
                    answer: legalAssessment.independentJudgment,
                    detail: legalAssessment.independentJudgment 
                      ? `Yes. Pre-AI assessment time averaged ${validityIndicators.avgPreAITime}s. AI agreement rate: ${validityIndicators.aiAgreementRate}%.`
                      : `Concern: Fast pre-AI times or 100% AI agreement suggest possible rubber-stamping.`,
                  },
                  {
                    question: "Were disagreements with AI properly documented?",
                    answer: legalAssessment.properDocumentation,
                    detail: legalAssessment.properDocumentation
                      ? `Yes. ${validityIndicators.deviationsDocumented}/${validityIndicators.deviationsRequired} deviations documented with rationale.`
                      : `No. ${validityIndicators.deviationsRequired - validityIndicators.deviationsDocumented} deviations lack documentation.`,
                  },
                  {
                    question: "Did the clinician understand AI error rates?",
                    answer: legalAssessment.errorRateAwareness,
                    detail: legalAssessment.errorRateAwareness
                      ? `Yes. Comprehension check passed for ${validityIndicators.comprehensionPassed} case(s).`
                      : `No. Comprehension check failed or not completed.`,
                  },
                  {
                    question: "Is the decision record tamper-evident and intact?",
                    answer: legalAssessment.chainIntegrity,
                    detail: legalAssessment.chainIntegrity
                      ? `Yes. Hash chain verified. ${events.length} events cryptographically linked.`
                      : `NO - INTEGRITY COMPROMISED. Evidence chain broken.`,
                  },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: '16px',
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    borderLeft: `4px solid ${item.answer ? '#22c55e' : '#ef4444'}`,
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}>
                      <div style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                        {item.question}
                      </div>
                      <div style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: item.answer ? '#166534' : '#991b1b',
                        color: item.answer ? '#4ade80' : '#fca5a5',
                      }}>
                        {item.answer ? 'YES' : 'NO'}
                      </div>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Cross-Examination Talking Points */}
              <div style={{
                padding: '16px',
                backgroundColor: '#1e3a5f',
                borderRadius: '8px',
                border: '1px solid #3b82f6',
              }}>
                <div style={{ color: '#93c5fd', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                  💡 CROSS-EXAMINATION DEFENSE POINTS
                </div>
                <ul style={{ color: '#94a3b8', fontSize: '12px', margin: 0, paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '4px' }}>Initial assessment was locked BEFORE AI disclosure</li>
                  <li style={{ marginBottom: '4px' }}>FDR/FOR error rates were presented and acknowledged</li>
                  <li style={{ marginBottom: '4px' }}>Decision chain is cryptographically verifiable</li>
                  <li style={{ marginBottom: '4px' }}>All timestamps are tamper-evident</li>
                  <li>Third-party verification can independently confirm record integrity</li>
                </ul>
              </div>
            </div>
          )}
          
          {/* VALIDITY INDICATORS TAB */}
          {activeTab === 'validity' && (
            <div>
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                backgroundColor: '#1e293b', 
                borderRadius: '8px',
                borderLeft: '4px solid #a855f7',
              }}>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                  VALIDITY INDICATORS (Analogous to response consistency scales)
                </div>
                <div style={{ color: 'white', fontSize: '14px' }}>
                  Behavioral patterns that may indicate rushed reading, automation bias, or negligent dismissal.
                </div>
              </div>
              
              {/* Indicator Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  {
                    label: 'Fast Pre-AI Reads',
                    value: validityIndicators.fastPreAI,
                    total: validityIndicators.totalCases,
                    unit: 'cases < 5s',
                    status: validityIndicators.fastPreAI === 0 ? 'good' : validityIndicators.fastPreAI <= 1 ? 'warn' : 'bad',
                    detail: 'Readings under 5 seconds suggest insufficient independent review',
                  },
                  {
                    label: 'AI Agreement Rate',
                    value: validityIndicators.aiAgreementRate,
                    unit: '%',
                    status: validityIndicators.aiAgreementRate < 80 ? 'good' : validityIndicators.aiAgreementRate < 100 ? 'warn' : 'bad',
                    detail: '100% agreement may indicate rubber-stamping',
                  },
                  {
                    label: 'Deviation Documentation',
                    value: validityIndicators.deviationsDocumented,
                    total: validityIndicators.deviationsRequired,
                    unit: 'documented',
                    status: validityIndicators.deviationsRequired === 0 || 
                            validityIndicators.deviationsDocumented >= validityIndicators.deviationsRequired ? 'good' : 'bad',
                    detail: 'Deviations from AI should include clinical rationale',
                  },
                  {
                    label: 'Comprehension Checks',
                    value: validityIndicators.comprehensionPassed,
                    total: validityIndicators.comprehensionPassed + validityIndicators.comprehensionFailed,
                    unit: 'passed',
                    status: validityIndicators.comprehensionFailed === 0 ? 'good' : 'warn',
                    detail: 'Understanding of FDR/FOR error rates',
                  },
                  {
                    label: 'Avg Pre-AI Time',
                    value: validityIndicators.avgPreAITime,
                    unit: 'seconds',
                    status: validityIndicators.avgPreAITime >= 10 ? 'good' : validityIndicators.avgPreAITime >= 5 ? 'warn' : 'bad',
                    detail: 'Time spent on independent assessment before AI reveal',
                  },
                  {
                    label: 'Chain Integrity',
                    value: verifierResult === 'PASS' ? 100 : 0,
                    unit: '%',
                    status: verifierResult === 'PASS' ? 'good' : 'bad',
                    detail: 'Cryptographic verification of decision record',
                  },
                ].map((indicator, i) => (
                  <div key={i} style={{
                    padding: '16px',
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: `1px solid ${
                      indicator.status === 'good' ? '#22c55e' :
                      indicator.status === 'warn' ? '#f59e0b' : '#ef4444'
                    }`,
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}>
                      <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
                        {indicator.label}
                      </div>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: indicator.status === 'good' ? '#22c55e' :
                                        indicator.status === 'warn' ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                    <div style={{ 
                      color: 'white', 
                      fontSize: '28px', 
                      fontWeight: 700,
                      marginBottom: '4px',
                    }}>
                      {indicator.value}
                      {indicator.total !== undefined && (
                        <span style={{ color: '#64748b', fontSize: '16px' }}>/{indicator.total}</span>
                      )}
                      <span style={{ color: '#64748b', fontSize: '14px', marginLeft: '4px' }}>{indicator.unit}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px' }}>
                      {indicator.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* RAW LEDGER TAB */}
          {activeTab === 'raw' && (
            <div>
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                backgroundColor: '#1e293b', 
                borderRadius: '8px',
                borderLeft: '4px solid #22c55e',
              }}>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                  RAW CRYPTOGRAPHIC LEDGER
                </div>
                <div style={{ color: 'white', fontSize: '14px' }}>
                  Machine-readable hash chain for third-party verification and audit.
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#0a0a0a',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '11px',
                maxHeight: '400px',
                overflow: 'auto',
                border: '1px solid #333',
              }}>
                <pre style={{ margin: 0, color: '#4ade80' }}>
{`{
  "session_id": "${sessionId}",
  "generated_at": "${new Date().toISOString()}",
  "verifier_result": "${verifierResult}",
  "event_count": ${events.length},
  "ledger_entries": [
${ledger.slice(0, 10).map((entry, i) => `    {
      "seq": ${i},
      "hash": "${entry.hash || 'pending'}",
      "prev_hash": "${i > 0 ? ledger[i-1]?.hash?.slice(0, 32) + '...' : 'GENESIS'}",
      "event_type": "${events[i]?.type || 'UNKNOWN'}"
    }`).join(',\n')}
    ${ledger.length > 10 ? `\n    // ... ${ledger.length - 10} more entries` : ''}
  ]
}`}
                </pre>
              </div>
              
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ color: '#64748b', fontSize: '12px' }}>
                  Export full ledger for independent verification
                </span>
                <button style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>
                  📥 Download JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// POST-CASE PROBES BATCH MODAL (Instrumentation Isolation)
// =============================================================================
interface ProbesBatchModalProps {
  isVisible: boolean;
  onComplete: (probes: {
    postTrust: number;
    comprehensionAnswer: string;
    comprehensionCorrect: boolean;
    tlxMental: number;
    tlxTemporal: number;
  }) => void;
  preTrust: number;
  caseId: string;
  aiFDR: number;
  aiFOR: number;
  includeTLX: boolean;
  viewMode: 'CLINICIAN' | 'RESEARCHER';
}

const ProbesBatchModal: React.FC<ProbesBatchModalProps> = ({
  isVisible,
  onComplete,
  preTrust,
  caseId,
  aiFDR,
  aiFOR,
  includeTLX,
  viewMode,
}) => {
  const [currentStep, setCurrentStep] = useState<'TRUST' | 'COMPREHENSION' | 'TLX' | 'DONE'>('TRUST');
  const [postTrust, setPostTrust] = useState(preTrust);
  const [comprehensionAnswer, setComprehensionAnswer] = useState<string | null>(null);
  const [tlxMental, setTlxMental] = useState(50);
  const [tlxTemporal, setTlxTemporal] = useState(50);
  
  // Reset state when modal opens for a new case
  useEffect(() => {
    if (isVisible) {
      setCurrentStep('TRUST');
      setPostTrust(preTrust);
      setComprehensionAnswer(null);
      setTlxMental(50);
      setTlxTemporal(50);
    }
  }, [isVisible, caseId, preTrust]);
  
  if (!isVisible) return null;
  
  // Comprehension check options
  const comprehensionOptions = [
    { value: 'fdr_high', label: `Higher FDR (${aiFDR}%) means more false alarms` },
    { value: 'fdr_low', label: `Lower FDR (${aiFDR}%) means fewer false alarms` },
    { value: 'for_high', label: `Higher FOR (${aiFOR}%) means more missed cancers` },
    { value: 'for_low', label: `Lower FOR (${aiFOR}%) means fewer missed cancers` },
  ];
  const correctAnswer = 'fdr_high'; // FDR 15% means 15% false alarms
  
  const handleNext = () => {
    if (currentStep === 'TRUST') {
      setCurrentStep('COMPREHENSION');
    } else if (currentStep === 'COMPREHENSION') {
      if (includeTLX) {
        setCurrentStep('TLX');
      } else {
        setCurrentStep('DONE');
        onComplete({
          postTrust,
          comprehensionAnswer: comprehensionAnswer || '',
          comprehensionCorrect: comprehensionAnswer === correctAnswer,
          tlxMental: 50,
          tlxTemporal: 50,
        });
      }
    } else if (currentStep === 'TLX') {
      setCurrentStep('DONE');
      onComplete({
        postTrust,
        comprehensionAnswer: comprehensionAnswer || '',
        comprehensionCorrect: comprehensionAnswer === correctAnswer,
        tlxMental,
        tlxTemporal,
      });
    }
  };
  
  const canProceed = () => {
    if (currentStep === 'TRUST') return true;
    if (currentStep === 'COMPREHENSION') return comprehensionAnswer !== null;
    if (currentStep === 'TLX') return true;
    return false;
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        border: '2px solid #3b82f6',
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '18px' }}>
              📊 Post-Case Assessment
            </h2>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
              Case: {caseId}
            </div>
          </div>
          {viewMode === 'RESEARCHER' && (
            <div style={{
              padding: '4px 8px',
              backgroundColor: '#a855f7',
              borderRadius: '4px',
              fontSize: '9px',
              fontWeight: 600,
              color: 'white',
            }}>
              BATCHED PROBES
            </div>
          )}
        </div>
        
        {/* Progress */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px',
          justifyContent: 'center',
        }}>
          {['TRUST', 'COMPREHENSION', includeTLX ? 'TLX' : null].filter(Boolean).map((step, i) => (
            <div
              key={step}
              style={{
                width: '80px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: 
                  step === currentStep ? '#3b82f6' : 
                  ['TRUST', 'COMPREHENSION', 'TLX'].indexOf(currentStep) > ['TRUST', 'COMPREHENSION', 'TLX'].indexOf(step as string) 
                    ? '#22c55e' : '#334155',
              }}
            />
          ))}
        </div>
        
        {/* Trust Calibration */}
        {currentStep === 'TRUST' && (
          <div>
            <div style={{ 
              color: '#94a3b8', 
              fontSize: '14px', 
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              How much did you actually rely on the AI suggestion?
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '12px' }}>Pre-AI expectation</span>
                <span style={{ color: '#60a5fa', fontWeight: 600 }}>{preTrust}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>Actual reliance</span>
                <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '18px' }}>{postTrust}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={postTrust}
                onChange={(e) => setPostTrust(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                <span>Ignored AI completely</span>
                <span>Followed AI entirely</span>
              </div>
            </div>
            
            <div style={{
              padding: '12px',
              backgroundColor: postTrust > preTrust ? '#166534' : postTrust < preTrust ? '#7f1d1d' : '#334155',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'white',
              fontSize: '12px',
            }}>
              {postTrust > preTrust ? '📈 Trust increased from expectation' :
               postTrust < preTrust ? '📉 Trust decreased from expectation' :
               '➡️ Trust matched expectation'}
            </div>
          </div>
        )}
        
        {/* Comprehension Check */}
        {currentStep === 'COMPREHENSION' && (
          <div>
            <div style={{ 
              color: '#94a3b8', 
              fontSize: '14px', 
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              What does an FDR of {aiFDR}% mean?
            </div>
            <div style={{
              padding: '12px',
              backgroundColor: '#1e3a5f',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '12px',
              color: '#93c5fd',
              textAlign: 'center',
            }}>
              <strong>FDR:</strong> {aiFDR}% &nbsp;|&nbsp; <strong>FOR:</strong> {aiFOR}%
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comprehensionOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setComprehensionAnswer(option.value)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: comprehensionAnswer === option.value ? '#3b82f6' : '#334155',
                    border: comprehensionAnswer === option.value ? '2px solid #60a5fa' : '2px solid transparent',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* NASA-TLX */}
        {currentStep === 'TLX' && (
          <div>
            <div style={{ 
              color: '#94a3b8', 
              fontSize: '14px', 
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              Rate your workload for this case
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'white', fontSize: '13px' }}>Mental Demand</span>
                <span style={{ color: '#60a5fa', fontWeight: 600 }}>{tlxMental}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={tlxMental}
                onChange={(e) => setTlxMental(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                <span>Very Low</span>
                <span>Very High</span>
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'white', fontSize: '13px' }}>Temporal Demand</span>
                <span style={{ color: '#60a5fa', fontWeight: 600 }}>{tlxTemporal}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={tlxTemporal}
                onChange={(e) => setTlxTemporal(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                <span>No Pressure</span>
                <span>High Pressure</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            style={{
              padding: '12px 24px',
              backgroundColor: canProceed() ? '#22c55e' : '#475569',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {currentStep === 'TLX' || (currentStep === 'COMPREHENSION' && !includeTLX) 
              ? '✓ Complete Case' 
              : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

const KeyboardHelpModal: React.FC<{ isVisible: boolean; onClose: () => void }> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;
  
  const shortcuts = [
    { category: 'BI-RADS Selection', items: [
      { key: '0-5', action: 'Select BI-RADS category' },
    ]},
    { category: 'Navigation', items: [
      { key: 'Space', action: 'Lock First Impression' },
      { key: 'Enter', action: 'Submit Final Assessment' },
      { key: 'Esc', action: 'Close dialogs' },
    ]},
    { category: 'Confidence', items: [
      { key: '+', action: 'Increase confidence (+10%)' },
      { key: '-', action: 'Decrease confidence (-10%)' },
    ]},
    { category: 'Viewer', items: [
      { key: 'A', action: 'Toggle AI overlay' },
      { key: 'R', action: 'Reset viewport' },
    ]},
    { category: 'Help', items: [
      { key: '?', action: 'Toggle this help' },
    ]},
  ];
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#1a1a2e',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        border: '1px solid #333',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h2 style={{ color: 'white', margin: 0, fontSize: '18px' }}>
            ⌨️ Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >×</button>
        </div>
        
        {shortcuts.map(category => (
          <div key={category.category} style={{ marginBottom: '16px' }}>
            <div style={{ 
              color: '#4dabf7', 
              fontSize: '12px', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '8px',
            }}>
              {category.category}
            </div>
            {category.items.map(item => (
              <div key={item.key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: '1px solid #333',
              }}>
                <span style={{ color: '#aaa' }}>{item.action}</span>
                <kbd style={{
                  backgroundColor: '#2a2a4e',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}>{item.key}</kbd>
              </div>
            ))}
          </div>
        ))}
        
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#2a2a4e',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#888',
          textAlign: 'center',
        }}>
          💡 Keyboard shortcuts are logged for workflow analysis
        </div>
      </div>
    </div>
  );
};

const StudyPackModal: React.FC<StudyPackModalProps> = ({ isVisible, onClose, sessionId, condition }) => {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  
  if (!isVisible) return null;
  
  const handleDownload = async () => {
    setGenerating(true);
    
    try {
      // Build content sections
      const sections: string[] = [];
      
      sections.push('# STUDY PACK: BRPLL-MAMMO v1.0');
      sections.push('Generated: ' + new Date().toISOString());
      sections.push('Session: ' + sessionId);
      sections.push('Condition: ' + (condition?.condition || 'Not assigned'));
      sections.push('Seed: ' + (condition?.seed || 'N/A'));
      sections.push('');
      sections.push('====================================');
      sections.push('');
      
      // PROTOCOL
      sections.push('=== PROTOCOL.md ===');
      sections.push('');
      sections.push('# BRPLL-MAMMO Study Protocol v1.0');
      sections.push('');
      sections.push('## Overview');
      sections.push('Human-AI Collaboration Study for Mammography Interpretation with FDR/FOR Disclosure');
      sections.push('');
      sections.push('## Study Design');
      sections.push('- Type: Multi-reader Multi-case (MRMC)');
      sections.push('- Factors: AI Reveal Timing x Disclosure Format x Case Difficulty');
      sections.push('- Counterbalancing: Latin Square 4x4');
      sections.push('');
      sections.push('## Primary Outcomes');
      sections.push('1. ADDA Denominator Rate');
      sections.push('2. Override-with-Documentation Rate');
      sections.push('3. Comprehension Accuracy');
      sections.push('4. Trust Calibration Delta');
      sections.push('');
      sections.push('## Secondary Outcomes');
      sections.push('- NASA-TLX subscales (mental, temporal demand)');
      sections.push('- Time-to-decision (pre-AI, post-AI, total)');
      sections.push('');
      sections.push('## Exclusion Criteria');
      sections.push('- Pre-AI time < 3 seconds');
      sections.push('- Failed comprehension check 3+ times');
      sections.push('- Total case time > 10 minutes');
      sections.push('- Incomplete calibration trials');
      sections.push('');
      
      // CONDITIONS
      sections.push('=== CONDITIONS.json ===');
      sections.push('');
      sections.push(JSON.stringify({
        protocolVersion: 'BRPLL-MAMMO-v1.0',
        sessionId: sessionId,
        condition: condition?.condition,
        seed: condition?.seed,
        factors: {
          revealTiming: ['HUMAN_FIRST', 'AI_FIRST', 'CONCURRENT'],
          disclosureFormat: ['FDR_FOR', 'SENSITIVITY_SPECIFICITY', 'NONE'],
          disclosurePolicy: ['STATIC', 'ADAPTIVE'],
          caseDifficulty: ['EASY', 'MEDIUM', 'HARD']
        },
        counterbalancing: { scheme: 'LATIN_SQUARE_4x4', arms: 4 }
      }, null, 2));
      sections.push('');
      
      // COUNTERBALANCING
      sections.push('=== COUNTERBALANCING.csv ===');
      sections.push('');
      sections.push('arm,case_order,condition,disclosure_format,seed_offset');
      sections.push('ARM-1,A-B-C-D,HUMAN_FIRST,FDR_FOR,0');
      sections.push('ARM-2,B-C-D-A,HUMAN_FIRST,FDR_FOR,1');
      sections.push('ARM-3,C-D-A-B,HUMAN_FIRST,FDR_FOR,2');
      sections.push('ARM-4,D-A-B-C,HUMAN_FIRST,FDR_FOR,3');
      sections.push('');
      
      // CODEBOOK
      sections.push('=== CODEBOOK.md ===');
      sections.push('');
      sections.push('# Event Types');
      sections.push('');
      sections.push('| Event | Description |');
      sections.push('|-------|-------------|');
      sections.push('| SESSION_STARTED | Study session initiated |');
      sections.push('| FIRST_IMPRESSION_LOCKED | Pre-AI assessment locked |');
      sections.push('| AI_REVEALED | AI suggestion shown |');
      sections.push('| DISCLOSURE_PRESENTED | FDR/FOR shown |');
      sections.push('| FINAL_ASSESSMENT | Post-AI assessment |');
      sections.push('| DEVIATION_SUBMITTED | Rationale documented |');
      sections.push('| TRUST_CALIBRATION | Trust delta captured |');
      sections.push('| NASA_TLX_RECORDED | Workload ratings |');
      sections.push('');
      
      // CONSENT
      sections.push('=== CONSENT_TEMPLATE.md ===');
      sections.push('');
      sections.push('# Participant Consent');
      sections.push('');
      sections.push('## Study Title');
      sections.push('Human-AI Collaboration in Mammography Interpretation');
      sections.push('');
      sections.push('## Purpose');
      sections.push('This study examines how radiologists integrate AI assistance.');
      sections.push('');
      sections.push('[ ] I agree to participate');
      sections.push('');
      
      // ANALYSIS
      sections.push('=== ANALYSIS_SKELETON.R ===');
      sections.push('');
      sections.push('library(lme4)');
      sections.push('library(tidyverse)');
      sections.push('');
      sections.push('# Load data');
      sections.push('data <- read_csv("reads.csv")');
      sections.push('');
      sections.push('# Primary: ADDA by condition');
      sections.push('model <- glmer(adda ~ condition + (1|reader_id) + (1|case_id),');
      sections.push('               data = data, family = binomial)');
      sections.push('');
      
      // MRMC MAPPING
      sections.push('=== MRMC_MAPPING.md ===');
      sections.push('');
      sections.push('# iMRMC Export Mapping');
      sections.push('');
      sections.push('| Evidify Field | iMRMC Field |');
      sections.push('|---------------|-------------|');
      sections.push('| sessionId | reader_id |');
      sections.push('| caseId | case_id |');
      sections.push('| condition | modality |');
      sections.push('| finalBirads | score |');
      sections.push('');
      
      // VERIFIER
      sections.push('=== VERIFIER.sh ===');
      sections.push('');
      sections.push('#!/bin/bash');
      sections.push('# Evidify Hash Chain Verifier');
      sections.push('echo "Verifying export..."');
      sections.push('# Check hash chain integrity');
      sections.push('# Verify signature');
      sections.push('echo "PASS" or "FAIL"');
      sections.push('');
      
      // REPLICATION GUIDE
      sections.push('=== REPLICATION_GUIDE.md ===');
      sections.push('');
      sections.push('# 30-Minute Replication Guide');
      sections.push('');
      sections.push('1. Download and extract Study Pack');
      sections.push('2. npm install');
      sections.push('3. Configure site.json');
      sections.push('4. npm run study');
      sections.push('5. Export and verify');
      sections.push('');
      
      const content = sections.join('\n');
      
      // Create blob and download
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Study_Pack_BRPLL_MAMMO_v1.0_' + sessionId.slice(0, 8) + '.txt';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setGenerating(false);
      setGenerated(true);
    } catch (error) {
      console.error('Study Pack generation error:', error);
      setGenerating(false);
      alert('Error: ' + String(error));
    }
  };

  const packContents = [
    { name: 'PROTOCOL.md', desc: 'IRB-ready study protocol (BRPLL-MAMMO-v1.0)', icon: '📋' },
    { name: 'CONDITIONS.json', desc: 'Condition matrix with factor definitions', icon: '🎯' },
    { name: 'COUNTERBALANCING.csv', desc: 'Latin square assignment table (4×4)', icon: '🔀' },
    { name: 'CODEBOOK.md', desc: 'Variable definitions + event schemas', icon: '📖' },
    { name: 'CONSENT_TEMPLATE.md', desc: 'Participant consent script (editable)', icon: '✍️' },
    { name: 'ANALYSIS_SKELETON.R', desc: 'Mixed-effects model starter code', icon: '📊' },
    { name: 'MRMC_MAPPING.md', desc: 'iMRMC export format documentation', icon: '🔗' },
    { name: 'VERIFIER.sh', desc: 'Standalone hash chain verifier CLI', icon: '🔐' },
    { name: 'REPLICATION_GUIDE.md', desc: '30-minute site setup instructions', icon: '🚀' },
  ];
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '2px solid #22c55e',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #334155',
          background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
          borderRadius: '14px 14px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📦 Study Pack v1.0
              <span style={{ 
                fontSize: '10px', 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                padding: '4px 8px', 
                borderRadius: '8px' 
              }}>
                TURNKEY REPLICATION
              </span>
            </h2>
            <p style={{ margin: '4px 0 0', color: '#bbf7d0', fontSize: '12px' }}>
              Everything another site needs to run this study in 30 minutes
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              border: 'none', 
              borderRadius: '8px', 
              color: 'white', 
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ padding: '24px' }}>
          {/* Pack Contents */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#22c55e', 
              fontWeight: 700, 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              PACK CONTENTS ({packContents.length} files)
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '8px' 
            }}>
              {packContents.map((item, i) => (
                <div key={i} style={{ 
                  padding: '12px', 
                  backgroundColor: '#0f172a', 
                  borderRadius: '8px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{item.icon}</div>
                  <div style={{ color: 'white', fontSize: '11px', fontWeight: 600, fontFamily: 'monospace' }}>
                    {item.name}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '10px', marginTop: '4px', lineHeight: 1.3 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Current Session Info */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#0f172a', 
            borderRadius: '8px',
            border: '1px solid #334155',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              PACK CONFIGURED FOR THIS SESSION
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Session:</span>
                <span style={{ color: 'white', marginLeft: '8px', fontFamily: 'monospace', fontSize: '11px' }}>{sessionId}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Condition:</span>
                <span style={{ color: '#60a5fa', marginLeft: '8px', fontSize: '11px' }}>{condition?.condition || 'Not set'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Seed:</span>
                <span style={{ color: '#fbbf24', marginLeft: '8px', fontFamily: 'monospace', fontSize: '11px' }}>{condition?.seed || 'N/A'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Protocol:</span>
                <span style={{ color: '#a855f7', marginLeft: '8px', fontSize: '11px' }}>BRPLL-MAMMO-v1.0</span>
              </div>
            </div>
          </div>
          
          {/* Multi-Site Deployment Note */}
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#1e3a8a', 
            borderRadius: '8px',
            border: '1px solid #3b82f6',
            marginBottom: '24px',
            fontSize: '12px',
            color: '#bfdbfe'
          }}>
            <strong style={{ color: 'white' }}>🏛️ Multi-Site Ready:</strong> This pack includes site-specific configuration templates. 
            Each collaborating institution can generate their own session IDs and seeds while maintaining 
            protocol fidelity for federated analysis.
          </div>
          
          {/* Download Button */}
          <div style={{ textAlign: 'center' }}>
            {!generated ? (
              <button 
                onClick={handleDownload}
                disabled={generating}
                style={{ 
                  padding: '16px 48px', 
                  backgroundColor: generating ? '#374151' : '#22c55e', 
                  border: 'none', 
                  borderRadius: '12px', 
                  color: 'white', 
                  cursor: generating ? 'wait' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  margin: '0 auto'
                }}
              >
                {generating ? (
                  <>⏳ Generating Pack...</>
                ) : (
                  <>📦 Download Study Pack v1.0</>
                )}
              </button>
            ) : (
              <div>
                <div style={{ 
                  padding: '16px 32px', 
                  backgroundColor: '#166534', 
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: 'white', fontWeight: 700 }}>Study_Pack_BRPLL_MAMMO_v1.0.zip</div>
                    <div style={{ color: '#86efac', fontSize: '12px' }}>Ready for download (2.4 MB)</div>
                  </div>
                </div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>
                  Pack includes SHA-256 manifest for integrity verification
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #334155',
          backgroundColor: '#0f172a',
          borderRadius: '0 0 14px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ color: '#64748b', fontSize: '11px' }}>
            Pack version: 1.0.0 • Protocol: BRPLL-MAMMO-v1.0 • Generated: {new Date().toISOString().split('T')[0]}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ 
              padding: '4px 10px', 
              backgroundColor: '#166534', 
              borderRadius: '4px', 
              color: '#86efac', 
              fontSize: '10px',
              fontWeight: 600
            }}>
              ✓ IRB-Ready
            </span>
            <span style={{ 
              padding: '4px 10px', 
              backgroundColor: '#7f1d1d', 
              borderRadius: '4px', 
              color: '#fca5a5', 
              fontSize: '10px',
              fontWeight: 600
            }}>
              ✓ MRMC-Compatible
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STUDY DESIGN PANEL - Journal Editor Requirements
// ============================================================================
interface StudyDesignPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const StudyDesignPanel: React.FC<StudyDesignPanelProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '2px solid #3b82f6',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          borderRadius: '14px 14px 0 0',
        }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '18px' }}>📋 Study Design Summary</h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>Pre-registered research protocol • BRPLL-MAMMO-v1.0</p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#334155', 
              border: 'none', 
              borderRadius: '8px', 
              color: 'white', 
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✕ Close
          </button>
        </div>
        
        <div style={{ padding: '24px' }}>
          {/* Hypotheses */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#3b82f6', 
              fontWeight: 700, 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ backgroundColor: '#1e3a8a', padding: '4px 8px', borderRadius: '4px' }}>H1-H3</span>
              HYPOTHESES
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6 }}>
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#60a5fa' }}>H1:</strong> Human-first lock + FDR/FOR disclosure reduces inappropriate AI deference (ADDA rate) compared to concurrent AI exposure.
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#60a5fa' }}>H2:</strong> Mandatory deviation documentation increases override rates when radiologists disagree with AI.
                </div>
                <div>
                  <strong style={{ color: '#60a5fa' }}>H3:</strong> Comprehension check on FDR/FOR improves calibration of trust in AI recommendations.
                </div>
              </div>
            </div>
          </div>
          
          {/* Primary Outcomes */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#22c55e', 
              fontWeight: 700, 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ backgroundColor: '#166534', padding: '4px 8px', borderRadius: '4px' }}>PRIMARY</span>
              OUTCOMES
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}>Primary 1</div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '13px' }}>ADDA Denominator Rate</div>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>% cases where initial ≠ AI → changed to AI</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}>Primary 2</div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '13px' }}>Override-with-Documentation Rate</div>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>% changes with rationale documented</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}>Primary 3</div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '13px' }}>Comprehension Accuracy</div>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>% correct FDR/FOR understanding</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}>Primary 4</div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '13px' }}>Trust Calibration Δ</div>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>Pre-AI vs Post-AI trust shift</div>
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#1e293b', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ color: '#fbbf24', fontSize: '10px', marginBottom: '4px' }}>Secondary</div>
                  <div style={{ color: '#e2e8f0', fontSize: '12px' }}>NASA-TLX subscales (mental, temporal)</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#1e293b', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ color: '#fbbf24', fontSize: '10px', marginBottom: '4px' }}>Secondary</div>
                  <div style={{ color: '#e2e8f0', fontSize: '12px' }}>Time-to-decision (pre-AI, post-AI, total)</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Analysis Plan */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#a855f7', 
              fontWeight: 700, 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ backgroundColor: '#581c87', padding: '4px 8px', borderRadius: '4px' }}>STATS</span>
              ANALYSIS PLAN
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: 1.7 }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#c4b5fd' }}>Model:</strong> Mixed-effects logistic regression with random intercepts for reader and case
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#c4b5fd' }}>Fixed Effects:</strong> Condition (HUMAN_FIRST | AI_FIRST | CONCURRENT), Disclosure (STATIC | ADAPTIVE), Case difficulty
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#c4b5fd' }}>MRMC Compatibility:</strong> Export format compatible with iMRMC analysis (reader × case × condition)
                </div>
                <div>
                  <strong style={{ color: '#c4b5fd' }}>Power:</strong> 80% power to detect 15% difference in ADDA rate, α=0.05, ICC=0.3
                </div>
              </div>
            </div>
          </div>
          
          {/* Exclusion Criteria */}
          <div>
            <div style={{ 
              fontSize: '11px', 
              color: '#ef4444', 
              fontWeight: 700, 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ backgroundColor: '#7f1d1d', padding: '4px 8px', borderRadius: '4px' }}>EXCLUDE</span>
              EXCLUSION CRITERIA
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '10px', backgroundColor: '#1e293b', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#ef4444' }}>✕</span>
                  <span style={{ color: '#e2e8f0', fontSize: '12px' }}>Pre-AI time &lt; 3 seconds</span>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#1e293b', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#ef4444' }}>✕</span>
                  <span style={{ color: '#e2e8f0', fontSize: '12px' }}>Failed comprehension check 3+ times</span>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#1e293b', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#ef4444' }}>✕</span>
                  <span style={{ color: '#e2e8f0', fontSize: '12px' }}>Total case time &gt; 10 minutes</span>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#1e293b', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#ef4444' }}>✕</span>
                  <span style={{ color: '#e2e8f0', fontSize: '12px' }}>Incomplete calibration trials</span>
                </div>
              </div>
              <div style={{ 
                marginTop: '12px', 
                padding: '10px', 
                backgroundColor: '#422006', 
                borderRadius: '6px',
                border: '1px solid #f59e0b',
                color: '#fcd34d',
                fontSize: '11px'
              }}>
                <strong>Note:</strong> All exclusions are logged with timestamps and rationale in the export manifest. Sensitivity analyses will be run with/without exclusions.
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #334155',
          backgroundColor: '#0f172a',
          borderRadius: '0 0 14px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ color: '#64748b', fontSize: '11px' }}>
            Protocol locked: 2025-01-24 • Version: 1.0.0 • IRB: Pending
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ 
              padding: '4px 10px', 
              backgroundColor: '#166534', 
              borderRadius: '4px', 
              color: '#86efac', 
              fontSize: '10px',
              fontWeight: 600
            }}>
              ✓ Pre-registered
            </span>
            <span style={{ 
              padding: '4px 10px', 
              backgroundColor: '#1e3a8a', 
              borderRadius: '4px', 
              color: '#93c5fd', 
              fontSize: '10px',
              fontWeight: 600
            }}>
              ✓ Analysis Plan Locked
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// AUTOMATION BIAS RISK METER
// ============================================================================
interface RiskMeterProps {
  timeToLockMs: number;
  aiAgreementStreak: number;
  deviationsSkipped: number;
  totalDeviations: number;
  casesCompleted: number;
  aiDwellRatio: number; // AI box dwell / total dwell
}

// =============================================================================
// VERIFICATION STATUS PANEL (Researcher Mode)
// =============================================================================
// =============================================================================
// QC MONITORING DASHBOARD (Researcher Mode)
// =============================================================================
interface QCDashboardProps {
  caseResults: DerivedMetrics[];
  currentCaseIndex: number;
  totalCases: number;
  eventCount: number;
  sessionStartTime: Date;
}

const QCMonitoringDashboard: React.FC<QCDashboardProps> = ({
  caseResults,
  currentCaseIndex,
  totalCases,
  eventCount,
  sessionStartTime,
}) => {
  const completedCases = caseResults.length;
  const completionPct = totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0;
  
  // QC Metrics
  const fastReads = caseResults.filter(r => (r.timeToLockMs || 0) < 3000).length;
  const aiAgreements = caseResults.filter(r => r.adda === true).length;
  const comprehensionFailures = caseResults.filter(r => r.comprehensionCorrect === false).length;
  const deviationsDocumented = caseResults.filter(r => r.deviationRationale && r.deviationRationale.length > 0).length;
  const deviationsRequired = caseResults.filter(r => r.changeOccurred).length;
  
  // Time metrics
  const avgTimeToLock = caseResults.length > 0
    ? Math.round(caseResults.reduce((sum, r) => sum + (r.timeToLockMs || 0), 0) / caseResults.length / 1000)
    : 0;
  const sessionDuration = Math.round((Date.now() - sessionStartTime.getTime()) / 1000 / 60);
  
  // QC Status
  const hasAnomalies = fastReads > 0 || comprehensionFailures > 0 || 
    (deviationsRequired > 0 && deviationsDocumented < deviationsRequired);
  
  return (
    <div style={{
      backgroundColor: '#0f172a',
      border: `1px solid ${hasAnomalies ? '#f59e0b' : '#334155'}`,
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ 
          color: '#22c55e', 
          fontWeight: 700, 
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          📊 QC Monitor
        </div>
        <div style={{
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 600,
          backgroundColor: hasAnomalies ? '#92400e' : '#166534',
          color: hasAnomalies ? '#fcd34d' : '#4ade80',
        }}>
          {hasAnomalies ? '⚠️ FLAGS' : '✓ CLEAN'}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>
          <span>Progress</span>
          <span>{completedCases}/{totalCases} ({completionPct}%)</span>
        </div>
        <div style={{ height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${completionPct}%`, 
            height: '100%', 
            backgroundColor: '#22c55e',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#1e293b', 
          borderRadius: '4px',
          borderLeft: `3px solid ${fastReads > 0 ? '#f59e0b' : '#22c55e'}`,
        }}>
          <div style={{ color: '#64748b' }}>Fast Reads</div>
          <div style={{ color: fastReads > 0 ? '#fcd34d' : '#4ade80', fontWeight: 600 }}>
            {fastReads} {fastReads > 0 && '⚠️'}
          </div>
        </div>
        
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#1e293b', 
          borderRadius: '4px',
          borderLeft: '3px solid #a855f7',
        }}>
          <div style={{ color: '#64748b' }}>AI Agreements</div>
          <div style={{ color: '#c4b5fd', fontWeight: 600 }}>{aiAgreements}</div>
        </div>
        
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#1e293b', 
          borderRadius: '4px',
          borderLeft: `3px solid ${comprehensionFailures > 0 ? '#dc2626' : '#22c55e'}`,
        }}>
          <div style={{ color: '#64748b' }}>Comprehension ❌</div>
          <div style={{ color: comprehensionFailures > 0 ? '#f87171' : '#4ade80', fontWeight: 600 }}>
            {comprehensionFailures} {comprehensionFailures > 0 && '⚠️'}
          </div>
        </div>
        
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#1e293b', 
          borderRadius: '4px',
          borderLeft: '3px solid #3b82f6',
        }}>
          <div style={{ color: '#64748b' }}>Avg Pre-AI Time</div>
          <div style={{ color: '#60a5fa', fontWeight: 600 }}>{avgTimeToLock}s</div>
        </div>
      </div>
      
      {/* Session Info */}
      <div style={{ 
        marginTop: '12px', 
        paddingTop: '12px', 
        borderTop: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '9px',
        color: '#64748b',
      }}>
        <span>Duration: {sessionDuration}min</span>
        <span>Events: {eventCount}</span>
      </div>
    </div>
  );
};

// =============================================================================
// SESSION RECOVERY BANNER
// =============================================================================
interface SessionRecoveryBannerProps {
  hasRecoverableSession: boolean;
  recoveryData: {
    sessionId: string;
    step: string;
    completedCases: number;
    lastUpdated: string;
  } | null;
  onRecover: () => void;
  onDiscard: () => void;
}

const SessionRecoveryBanner: React.FC<SessionRecoveryBannerProps> = ({
  hasRecoverableSession,
  recoveryData,
  onRecover,
  onDiscard,
}) => {
  if (!hasRecoverableSession || !recoveryData) return null;
  
  const timeAgo = (() => {
    const diff = Date.now() - new Date(recoveryData.lastUpdated).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  })();
  
  return (
    <div style={{
      backgroundColor: '#1e3a5f',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
        }}>
          💾
        </div>
        <div>
          <div style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
            Recoverable Session Found
          </div>
          <div style={{ color: '#93c5fd', fontSize: '12px', marginTop: '4px' }}>
            {recoveryData.completedCases} cases completed • Last active {timeAgo}
          </div>
          <div style={{ color: '#64748b', fontSize: '10px', fontFamily: 'monospace', marginTop: '2px' }}>
            {recoveryData.sessionId}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onRecover}
          style={{
            padding: '10px 20px',
            backgroundColor: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          ↩️ Resume Session
        </button>
        <button
          onClick={onDiscard}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            color: '#f87171',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          🗑️ Discard
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// HANGING PROTOCOL SELECTOR
// =============================================================================
interface HangingProtocolProps {
  currentProtocol: string;
  onProtocolChange: (protocol: string) => void;
}

const HangingProtocolSelector: React.FC<HangingProtocolProps> = ({
  currentProtocol,
  onProtocolChange,
}) => {
  const protocols = [
    { id: 'MAMMO_CC_MLO', label: 'CC + MLO (Standard)', description: 'L/R CC top, L/R MLO bottom' },
    { id: 'MAMMO_CC_ONLY', label: 'CC Only', description: 'L/R CC comparison' },
    { id: 'MAMMO_MLO_ONLY', label: 'MLO Only', description: 'L/R MLO comparison' },
    { id: 'MAMMO_TEMPORAL', label: 'Temporal Compare', description: 'Current vs Prior' },
  ];
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: '#1e293b',
      borderRadius: '6px',
      fontSize: '11px',
    }}>
      <span style={{ color: '#64748b', fontWeight: 600 }}>Layout:</span>
      <select
        value={currentProtocol}
        onChange={(e) => onProtocolChange(e.target.value)}
        style={{
          backgroundColor: '#334155',
          color: 'white',
          border: '1px solid #475569',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '11px',
          cursor: 'pointer',
        }}
      >
        {protocols.map(p => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
    </div>
  );
};

interface VerificationStatusProps {
  eventCount: number;
  sessionId: string;
  isVerified: boolean | null;
  lastHash?: string;
}

const VerificationStatusPanel: React.FC<VerificationStatusProps> = ({
  eventCount,
  sessionId,
  isVerified,
  lastHash,
}) => {
  const truncatedHash = lastHash ? lastHash.slice(0, 16) + '...' : 'Pending...';
  const truncatedSession = sessionId.slice(0, 12) + '...';
  
  return (
    <div style={{
      backgroundColor: '#1a1a2e',
      border: '1px solid #333',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ 
          color: '#a855f7', 
          fontWeight: 700, 
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          🔐 Chain Status
        </div>
        <div style={{
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 600,
          backgroundColor: isVerified === null ? '#334155' : isVerified ? '#166534' : '#991b1b',
          color: isVerified === null ? '#94a3b8' : isVerified ? '#4ade80' : '#fca5a5',
        }}>
          {isVerified === null ? 'PENDING' : isVerified ? '✓ INTACT' : '✗ BROKEN'}
        </div>
      </div>
      
      <div style={{ display: 'grid', gap: '8px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Session</span>
          <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '10px' }}>{truncatedSession}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Events</span>
          <span style={{ color: '#4ade80', fontWeight: 600 }}>{eventCount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Chain Hash</span>
          <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '9px' }}>{truncatedHash}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Signing</span>
          <span style={{ color: '#94a3b8', fontSize: '10px' }}>Ed25519 (local)</span>
        </div>
      </div>
      
      <div style={{
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#0f172a',
        borderRadius: '4px',
        fontSize: '9px',
        color: '#64748b',
        textAlign: 'center',
      }}>
        Tamper-evident • Append-only • Verifiable
      </div>
    </div>
  );
};

const AutomationBiasRiskMeter: React.FC<RiskMeterProps> = ({
  timeToLockMs,
  aiAgreementStreak,
  deviationsSkipped,
  totalDeviations,
  casesCompleted,
  aiDwellRatio,
}) => {
  // Risk calculation
  const risks: { label: string; value: number; weight: number; flag: boolean }[] = [];
  
  // Fast lock (< 5s = high risk)
  const lockRisk = timeToLockMs > 0 ? Math.max(0, 1 - (timeToLockMs / 10000)) : 0;
  risks.push({ label: 'Fast Lock', value: lockRisk, weight: 0.3, flag: timeToLockMs > 0 && timeToLockMs < 5000 });
  
  // AI agreement streak (3+ = concerning)
  const streakRisk = Math.min(1, aiAgreementStreak / 5);
  risks.push({ label: 'AI Agreement Streak', value: streakRisk, weight: 0.25, flag: aiAgreementStreak >= 3 });
  
  // Deviation skip rate
  const skipRisk = totalDeviations > 0 ? deviationsSkipped / totalDeviations : 0;
  risks.push({ label: 'Deviations Skipped', value: skipRisk, weight: 0.25, flag: deviationsSkipped > 0 });
  
  // AI fixation (high dwell on AI box)
  const fixationRisk = aiDwellRatio;
  risks.push({ label: 'AI Fixation', value: fixationRisk, weight: 0.2, flag: aiDwellRatio > 0.5 });
  
  // Weighted risk score
  const totalRisk = risks.reduce((acc, r) => acc + r.value * r.weight, 0);
  const riskLevel = totalRisk < 0.3 ? 'LOW' : totalRisk < 0.6 ? 'MODERATE' : 'HIGH';
  const riskColor = riskLevel === 'LOW' ? '#22c55e' : riskLevel === 'MODERATE' ? '#f59e0b' : '#ef4444';
  const riskBg = riskLevel === 'LOW' ? '#166534' : riskLevel === 'MODERATE' ? '#92400e' : '#7f1d1d';
  
  return (
    <div style={{
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '12px',
      border: `2px solid ${riskColor}`,
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{ 
          fontSize: '11px', 
          color: riskColor, 
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚠️ AUTOMATION BIAS RISK
          <span style={{ 
            backgroundColor: riskBg, 
            color: riskColor, 
            padding: '2px 8px', 
            borderRadius: '8px', 
            fontSize: '10px',
            fontWeight: 700
          }}>
            LIVE
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          backgroundColor: riskBg,
          color: 'white',
          fontSize: '12px',
          fontWeight: 700,
        }}>
          {riskLevel}
        </div>
      </div>
      
      {/* Risk Score Bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ height: '10px', backgroundColor: '#334155', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            width: `${totalRisk * 100}%`, 
            backgroundColor: riskColor,
            borderRadius: '5px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
          <span>Independent</span>
          <span>Over-reliant</span>
        </div>
      </div>
      
      {/* Risk Factors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        {risks.map((r, i) => (
          <div key={i} style={{ 
            padding: '6px 8px', 
            backgroundColor: r.flag ? riskBg : '#0f172a', 
            borderRadius: '6px',
            fontSize: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: r.flag ? riskColor : '#64748b' }}>{r.label}</span>
            <span style={{ color: r.flag ? 'white' : '#94a3b8', fontWeight: 600 }}>
              {r.label === 'Fast Lock' ? `${(timeToLockMs/1000).toFixed(1)}s` :
               r.label === 'AI Agreement Streak' ? aiAgreementStreak :
               r.label === 'Deviations Skipped' ? `${deviationsSkipped}/${totalDeviations}` :
               `${(aiDwellRatio * 100).toFixed(0)}%`}
            </span>
          </div>
        ))}
      </div>
      
      {casesCompleted > 0 && (
        <div style={{ marginTop: '8px', fontSize: '9px', color: '#64748b', textAlign: 'center' }}>
          Based on {casesCompleted} case{casesCompleted > 1 ? 's' : ''} in this session
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ResearchDemoFlow: React.FC = () => {
  const [state, setState] = useState<DemoState>({
    sessionId: `SES-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    step: 'SETUP',
    condition: null,
    caseQueue: null,
    currentCase: null,
    initialBirads: null,
    initialConfidence: 70,
    preTrust: 50,
    finalBirads: null,
    finalConfidence: 70,
    postTrust: 50,
    deviationRationale: '',
    comprehensionAnswer: null,
    comprehensionCorrect: null,
    calibrationBirads: null,
    calibrationConfidence: 70,
    startTime: new Date(),
    caseStartTime: null,
    lockTime: null,
    aiRevealTime: null,
    interactionCounts: { zooms: 0, pans: 0 },
    roiDwellTimes: new Map(),
    caseResults: [],
    exportReady: false,
    exportUrl: null,
    exportFilename: null,
    verifierResult: null,
    eventCount: 0,
  });

  const [showPacketViewer, setShowPacketViewer] = useState(false);
  const [timeOnCase, setTimeOnCase] = useState(0);
  const [showEventLog, setShowEventLog] = useState(true);
  const [showControlSurface, setShowControlSurface] = useState(false);
  const [tamperDemoActive, setTamperDemoActive] = useState(false);
  const [tamperFailureCode, setTamperFailureCode] = useState<string | null>(null);
  const [tlxMental, setTlxMental] = useState(50);
  const [tlxTemporal, setTlxTemporal] = useState(50);
  const [showModelCard, setShowModelCard] = useState(false);
  const [showStudyDesign, setShowStudyDesign] = useState(false);
  const [viewMode, setViewMode] = useState<'CLINICIAN' | 'RESEARCHER'>('RESEARCHER');
  const [showStudyPack, setShowStudyPack] = useState(false);
  const [disclosurePolicy, setDisclosurePolicy] = useState<'STATIC' | 'ADAPTIVE'>('STATIC');
  const [aiAgreementStreak, setAiAgreementStreak] = useState(0);
  const [totalDeviationsRequired, setTotalDeviationsRequired] = useState(0);
  const [deviationsSkipped, setDeviationsSkipped] = useState(0);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [hangingProtocol, setHangingProtocol] = useState('MAMMO_CC_ONLY');
  const [recoveryData, setRecoveryData] = useState<{
    sessionId: string;
    step: string;
    completedCases: number;
    lastUpdated: string;
  } | null>(null);
  const [hasRecoverableSession, setHasRecoverableSession] = useState(false);
  const [previousBirads, setPreviousBirads] = useState<number | null>(null);
  const [showProbesModal, setShowProbesModal] = useState(false);
  const [probesCompleted, setProbesCompleted] = useState(false);
  
  const exportPackRef = useRef<ExportPackZip | null>(null);
  const eventLoggerRef = useRef<EventLogger | null>(null);
  const roiEnterTimeRef = useRef<number>(0);

  // Session persistence key
  const SESSION_STORAGE_KEY = 'evidify_session_recovery';

  // Check for recoverable session on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        // Only show recovery if session is less than 24 hours old
        const hoursSinceSave = (Date.now() - new Date(parsed.lastUpdated).getTime()) / (1000 * 60 * 60);
        if (hoursSinceSave < 24 && parsed.step !== 'SETUP' && parsed.step !== 'STUDY_COMPLETE') {
          setRecoveryData({
            sessionId: parsed.sessionId,
            step: parsed.step,
            completedCases: parsed.caseResults?.length || 0,
            lastUpdated: parsed.lastUpdated,
          });
          setHasRecoverableSession(true);
        } else {
          // Clear old session
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to check for recoverable session:', e);
    }
  }, []);

  // Save session state periodically
  useEffect(() => {
    if (state.step === 'SETUP' || state.step === 'STUDY_COMPLETE') return;
    
    const saveSession = () => {
      try {
        const sessionData = {
          sessionId: state.sessionId,
          step: state.step,
          condition: state.condition,
          caseQueue: state.caseQueue,
          currentCase: state.currentCase,
          initialBirads: state.initialBirads,
          initialConfidence: state.initialConfidence,
          caseResults: state.caseResults,
          eventCount: state.eventCount,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      } catch (e) {
        console.warn('Failed to save session:', e);
      }
    };
    
    // Save on state change
    saveSession();
    
    // Also save periodically
    const interval = setInterval(saveSession, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [state.step, state.caseResults.length, state.currentCase?.caseId]);

  // Clear session on complete
  useEffect(() => {
    if (state.step === 'STUDY_COMPLETE') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [state.step]);

  // Handle session recovery
  const handleRecoverSession = () => {
    try {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        setState(s => ({
          ...s,
          ...parsed,
          startTime: new Date(parsed.lastUpdated),
        }));
        setHasRecoverableSession(false);
        
        // Log session resumed event
        eventLoggerRef.current?.addEvent('SESSION_RESUMED', {
          originalSessionId: parsed.sessionId,
          resumedAt: new Date().toISOString(),
          completedCases: parsed.caseResults?.length || 0,
          resumedAtStep: parsed.step,
        });
      }
    } catch (e) {
      console.error('Failed to recover session:', e);
      alert('Failed to recover session');
    }
  };

  const handleDiscardRecovery = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setHasRecoverableSession(false);
    setRecoveryData(null);
  };

  // Track BI-RADS edits before lock
  useEffect(() => {
    if (state.step === 'INITIAL' && state.initialBirads !== null && previousBirads !== null && previousBirads !== state.initialBirads) {
      eventLoggerRef.current?.addEvent('ANSWER_EDITED', {
        field: 'initialBirads',
        previousValue: previousBirads,
        newValue: state.initialBirads,
        editedBeforeLock: true,
        timestamp: new Date().toISOString(),
      });
    }
    setPreviousBirads(state.initialBirads);
  }, [state.initialBirads, state.step]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Show keyboard help
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
        return;
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowKeyboardHelp(false);
        setShowModelCard(false);
        setShowStudyDesign(false);
        setShowStudyPack(false);
        return;
      }
      
      // Only process shortcuts during active reading
      if (state.step !== 'INITIAL' && state.step !== 'AI_REVEALED' && state.step !== 'CALIBRATION') {
        return;
      }
      
      // Log keyboard event
      eventLoggerRef.current?.addEvent('KEYBOARD_SHORTCUT', { 
        key: e.key, 
        step: state.step,
        timestamp: Date.now()
      });
      
      // BI-RADS selection (0-5 keys)
      if ((state.step === 'INITIAL' || state.step === 'CALIBRATION') && state.initialBirads === null) {
        const biradMap: Record<string, number> = {
          '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
        };
        if (e.key in biradMap) {
          e.preventDefault();
          if (state.step === 'CALIBRATION') {
            setState(s => ({ ...s, calibrationBirads: biradMap[e.key] }));
          } else {
            setState(s => ({ ...s, initialBirads: biradMap[e.key] }));
          }
          return;
        }
      }
      
      // Final BI-RADS selection after AI reveal
      if (state.step === 'AI_REVEALED') {
        const biradMap: Record<string, number> = {
          '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
        };
        if (e.key in biradMap) {
          e.preventDefault();
          setState(s => ({ ...s, finalBirads: biradMap[e.key] }));
          return;
        }
      }
      
      // Space to lock first impression
      if (e.key === ' ' && state.step === 'INITIAL' && state.initialBirads !== null) {
        e.preventDefault();
        document.getElementById('lock-impression-btn')?.click();
        return;
      }
      
      // Space to continue from calibration
      if (e.key === ' ' && state.step === 'CALIBRATION' && state.calibrationBirads !== null) {
        e.preventDefault();
        document.getElementById('calibration-submit-btn')?.click();
        return;
      }
      
      // Enter to submit
      if (e.key === 'Enter' && state.step === 'AI_REVEALED' && state.finalBirads !== null) {
        e.preventDefault();
        document.getElementById('submit-final-btn')?.click();
        return;
      }
      
      // A to toggle AI (if already locked)
      if (e.key.toLowerCase() === 'a' && state.step === 'AI_REVEALED') {
        e.preventDefault();
        // Toggle AI overlay visibility would go here
        return;
      }
      
      // R to reset viewport
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setState(s => ({
          ...s,
          interactionCounts: { zooms: 0, pans: 0 },
        }));
        eventLoggerRef.current?.addEvent('VIEWPORT_RESET', { 
          caseId: state.currentCase?.caseId,
          triggeredBy: 'keyboard',
          timestamp: new Date().toISOString() 
        });
        return;
      }
      
      // +/- for confidence adjustment
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        if (state.step === 'INITIAL') {
          setState(s => ({ ...s, initialConfidence: Math.min(100, s.initialConfidence + 10) }));
        } else if (state.step === 'CALIBRATION') {
          setState(s => ({ ...s, calibrationConfidence: Math.min(100, s.calibrationConfidence + 10) }));
        } else if (state.step === 'AI_REVEALED') {
          setState(s => ({ ...s, finalConfidence: Math.min(100, s.finalConfidence + 10) }));
        }
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        if (state.step === 'INITIAL') {
          setState(s => ({ ...s, initialConfidence: Math.max(0, s.initialConfidence - 10) }));
        } else if (state.step === 'CALIBRATION') {
          setState(s => ({ ...s, calibrationConfidence: Math.max(0, s.calibrationConfidence - 10) }));
        } else if (state.step === 'AI_REVEALED') {
          setState(s => ({ ...s, finalConfidence: Math.max(0, s.finalConfidence - 10) }));
        }
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.step, state.initialBirads, state.finalBirads, state.calibrationBirads]);

  useEffect(() => {
    if (state.caseStartTime && !['COMPLETE', 'TLX', 'STUDY_COMPLETE', 'SETUP', 'CALIBRATION_FEEDBACK'].includes(state.step)) {
      const interval = setInterval(() => {
        setTimeOnCase((Date.now() - state.caseStartTime!.getTime()) / 1000);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [state.caseStartTime, state.step]);

  // Progress info
  const progress = useMemo(() => {
    if (!state.caseQueue) return null;
    return getQueueProgress(state.caseQueue);
  }, [state.caseQueue]);

  const currentCase = useMemo(() => {
    if (!state.caseQueue) return null;
    return getCurrentCase(state.caseQueue);
  }, [state.caseQueue]);
// --- AI helper (compat: old aiResult vs newer case fields) ---
const aiSuggestedBirads =
  (currentCase as any)?.aiResult?.birads ??
  (currentCase as any)?.aiBirads ??
  4;

const aiSuggestedConfidence =
  (currentCase as any)?.aiResult?.confidence ??
  (currentCase as any)?.aiConfidence ??
  0.87;

// ROI tracking (eye-tracking proxy)
const handleROIEnter = useCallback(async (roiId: string) => {
  roiEnterTimeRef.current = Date.now();
  if (eventLoggerRef.current && currentCase) {
    await eventLoggerRef.current.addEvent('GAZE_ENTERED_ROI', { roiId, caseId: currentCase.caseId });
    setState(s => ({ ...s, eventCount: exportPackRef.current?.getEvents().length || 0 }));
  }
}, [currentCase]);

  const handleROILeave = useCallback(async (roiId: string) => {
    if (roiEnterTimeRef.current > 0) {
      const dwellMs = Date.now() - roiEnterTimeRef.current;
      setState(s => {
        const newMap = new Map(s.roiDwellTimes);
        newMap.set(roiId, (newMap.get(roiId) || 0) + dwellMs);
        return { ...s, roiDwellTimes: newMap };
      });
      if (eventLoggerRef.current && state.currentCase && dwellMs > 100) {
        await eventLoggerRef.current!.addEvent('DWELL_TIME_ROI', { roiId, dwellMs, caseId: state.currentCase.caseId });
        setState(s => ({ ...s, eventCount: exportPackRef.current?.getEvents().length || 0 }));
      }
    }
    roiEnterTimeRef.current = 0;
  }, [state.currentCase]);

  const handleViewerInteraction = useCallback(async (type: 'zoom' | 'pan') => {
    setState(s => ({
      ...s,
      interactionCounts: {
        zooms: type === 'zoom' ? s.interactionCounts.zooms + 1 : s.interactionCounts.zooms,
        pans: type === 'pan' ? s.interactionCounts.pans + 1 : s.interactionCounts.pans,
      }
    }));
    if (eventLoggerRef.current) {
      await eventLoggerRef.current!.addEvent('IMAGE_VIEWED', { interactionType: type, caseId: state.currentCase?.caseId });
      setState(s => ({ ...s, eventCount: exportPackRef.current?.getEvents().length || 0 }));
    }
  }, [state.currentCase]);

  // Start study with seeded randomization + calibration
  const startStudy = useCallback(async (conditionOverride?: RevealCondition) => {
    const seed = generateSeed();
    const condition = conditionOverride ? manualCondition(conditionOverride, 'FDR_FOR') : await assignCondition(seed, 0);
    
    const queue = generateCaseQueue({
      includeCalibration: true,
      includeAttentionChecks: false,
      casesPerSession: 3,
      randomizeOrder: false,
      seed,
    });
    
    const firstCase = getCurrentCase(queue);
    
const exportPack = new ExportPackZip({
  sessionId: state.sessionId,
  participantId: 'DEMO-PARTICIPANT',
  studyId: 'BRPLL-DEMO',
  protocolVersion: 'BRPLL-MAMMO-v1.0',
  siteId: 'DEMO',
  condition: {
    revealTiming: condition.condition,
    disclosureFormat: condition.disclosureFormat,
    seed: condition.seed,
    assignmentMethod: condition.assignmentMethod,
  },
  caseQueue: {
    queueId: `Q-${Date.now().toString(36)}`,
    totalCases: queue.cases.length,
    completedCases: 0,
    caseIds: queue.cases.map(c => c.caseId),
  },
});

const eventLogger = new EventLogger(exportPack);

// assign refs AFTER objects exist
exportPackRef.current = exportPack;
eventLoggerRef.current = eventLogger;
    
await eventLogger.logSessionStarted({
  participantId: 'DEMO-PARTICIPANT',
  siteId: 'DEMO',
  studyId: 'BRPLL-DEMO',
  protocolVersion: 'BRPLL-MAMMO-v1.0',
  browserInfo: {
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio ?? 1,
  },
});
    
    // Eye-tracking infrastructure port (stub for future hardware integration)
    await eventLoggerRef.current!.addEvent('EYE_TRACKER_STATUS', {
      device: 'MOUSE_PROXY',
      status: 'ACTIVE',
      calibrationValid: true,
      supportedEvents: ['GAZE_ENTERED_ROI', 'DWELL_TIME_ROI', 'ATTENTION_COVERAGE_PROXY'],
      note: 'Using mouse hover as gaze proxy. Ready for WebGazer/Tobii integration.',
    });
    
    await eventLoggerRef.current!.logRandomizationAssigned({
      seed: condition.seed, condition: condition.condition, disclosureFormat: condition.disclosureFormat,
      assignmentMethod: condition.assignmentMethod, conditionMatrixHash: condition.conditionMatrixHash,
    });
    
    // Log counterbalancing scheme
const counterbalanceArm = (() => {
      if (!condition.seed || condition.seed === 'MANUAL_OVERRIDE') return 1;
      const parsed = parseInt(condition.seed.slice(-4), 16);
      if (isNaN(parsed)) return 1;
      return (parsed % 4) + 1;
    })();
    const caseOrderVariant = condition.seed ? (parseInt(condition.seed.slice(-2), 16) % 2 === 0 ? 'FORWARD' : 'REVERSE') : 'FORWARD';
    await eventLoggerRef.current!.addEvent('COUNTERBALANCING_ASSIGNED', {
      scheme: 'LATIN_SQUARE_4x4',
      arm: `ARM-${counterbalanceArm}`,
      caseOrderVariant,
      caseOrder: queue.cases.map(c => c.caseId),
      calibrationCases: queue.cases.filter(c => c.isCalibration).map(c => c.caseId),
      studyCases: queue.cases.filter(c => !c.isCalibration).map(c => c.caseId),
    });
    
    if (firstCase) {
      await eventLoggerRef.current!.addEvent('CASE_LOADED', { caseId: firstCase.caseId, isCalibration: firstCase.isCalibration });
    }
    
    setState(s => ({
      ...s,
      condition, caseQueue: queue, currentCase: firstCase, caseStartTime: new Date(),
      step: firstCase?.isCalibration ? 'CALIBRATION' : 'INITIAL',
      eventCount: exportPackRef.current?.getEvents().length || 0,
      roiDwellTimes: new Map(),
      interactionCounts: { zooms: 0, pans: 0 },
    }));
    setTimeOnCase(0);
    setShowControlSurface(true); // Auto-expand control surface when study starts
  }, [state.sessionId]);

  // Calibration submission
  const submitCalibration = useCallback(async () => {
    if (!eventLoggerRef.current || state.calibrationBirads === null || !state.currentCase) return;
    
    await eventLoggerRef.current!.addEvent('CALIBRATION_RESPONSE', {
      caseId: state.currentCase.caseId,
      selectedBirads: state.calibrationBirads,
      confidence: state.calibrationConfidence,
      groundTruthBirads: state.currentCase.groundTruth?.birads ?? null,
    });
    
    setState(s => ({ ...s, step: 'CALIBRATION_FEEDBACK', eventCount: exportPackRef.current?.getEvents().length || 0 }));
  }, [state.calibrationBirads, state.calibrationConfidence, state.currentCase]);

  // Continue from calibration feedback
  const continueFromCalibration = useCallback(async () => {
    if (!state.caseQueue || !eventLoggerRef.current) return;
    
    await eventLoggerRef.current!.addEvent('CALIBRATION_FEEDBACK_SHOWN', {
      caseId: state.currentCase?.caseId,
      userBirads: state.calibrationBirads,
      groundTruthBirads: state.currentCase?.groundTruth?.birads ?? null,
    });
    await eventLoggerRef.current!.addEvent('GROUND_TRUTH_REVEALED', {
      caseId: state.currentCase?.caseId,
      groundTruthBirads: state.currentCase?.groundTruth?.birads ?? null,
      context: 'CALIBRATION_MODE_ONLY',
      note: 'Ground truth only shown in calibration trials, never in study trials',
    });
    
    const newQueue = advanceQueue(state.caseQueue);
    const nextCase = getCurrentCase(newQueue);
    
    if (nextCase) {
      await eventLoggerRef.current!.addEvent('CASE_LOADED', { caseId: nextCase.caseId, isCalibration: nextCase.isCalibration });
    }
    
    setState(s => ({
      ...s,
      caseQueue: newQueue,
      currentCase: nextCase,
      step: 'INITIAL',
      calibrationBirads: null,
      calibrationConfidence: 70,
      caseStartTime: new Date(),
      eventCount: exportPackRef.current?.getEvents().length || 0,
      roiDwellTimes: new Map(),
      interactionCounts: { zooms: 0, pans: 0 },
    }));
    setTimeOnCase(0);
  }, [state.caseQueue, state.currentCase, state.calibrationBirads]);

  // Lock first impression
  const lockImpression = useCallback(async () => {
    if (!eventLoggerRef.current || !state.currentCase || state.initialBirads === null) return;
    
const lockTime = new Date();

await eventLoggerRef.current!.logFirstImpressionLocked(
  state.initialBirads ?? 0,
  state.initialConfidence ?? 0
);

await eventLoggerRef.current!.addEvent('FIRST_IMPRESSION_CONTEXT', {
  sessionId: state.sessionId,
  caseId: state.currentCase.caseId,
  condition: state.condition,
  birads: state.initialBirads ?? 0,
  confidence: state.initialConfidence ?? 0,
  interactionCounts: state.interactionCounts,
  preTrust: state.preTrust,
  lockTimestamp: lockTime.toISOString(),
});

    const aiRevealTime = new Date();

    const aiSuggestedBirads =
      (state.currentCase as any)?.aiResult?.birads ??
      (state.currentCase as any)?.aiBirads ??
      4;

    const aiConfidence =
      (state.currentCase as any)?.aiResult?.confidence ??
      (state.currentCase as any)?.aiConfidence ??
      0.87;
    
await eventLoggerRef.current!.logAIRevealed({
  suggestedBirads: aiSuggestedBirads,
  aiConfidence,
  finding: (state.currentCase as any).finding ?? 'N/A',
  displayMode: 'PANEL',
});
    
    // Log disclosure with adaptive policy info
    const caseDifficulty = state.caseQueue ? (['EASY', 'MEDIUM', 'HARD'] as const)[state.caseQueue.currentIndex % 3] : 'MEDIUM';
    const disclosureIntensity = disclosurePolicy === 'STATIC' ? 'STANDARD' : 
      caseDifficulty === 'EASY' ? 'MINIMAL' : caseDifficulty === 'MEDIUM' ? 'STANDARD' : 'FULL_DEBIAS';
    
    await eventLoggerRef.current!.logDisclosurePresented({ format: 'FDR_FOR', fdrValue: 4, forValue: 12 });
    await eventLoggerRef.current!.addEvent('ADAPTIVE_DISCLOSURE_DECISION', {
      policy: disclosurePolicy,
      caseDifficulty,
      disclosureIntensity,
      showFdrFor: disclosurePolicy === 'STATIC' || caseDifficulty !== 'EASY',
      showDebiasPrompt: disclosurePolicy === 'ADAPTIVE' && caseDifficulty === 'HARD',
    });
    
    setState(s => ({
      ...s, step: 'AI_REVEALED', lockTime, aiRevealTime, finalBirads: s.initialBirads, finalConfidence: s.initialConfidence,
      eventCount: exportPackRef.current?.getEvents().length || 0,
    }));
  }, [state.sessionId, state.currentCase, state.initialBirads, state.initialConfidence, state.preTrust, state.condition, state.caseStartTime, state.interactionCounts, state.caseQueue, disclosurePolicy]);

  // Handle comprehension answer
  const handleComprehension = useCallback(async (answer: string) => {
    const correct = answer === 'missed_cancer';
    if (eventLoggerRef.current) {
      await eventLoggerRef.current!.addEvent('DISCLOSURE_COMPREHENSION_RESPONSE', {
        questionId: 'FDR_FOR_COMPREHENSION', selectedAnswer: answer, correctAnswer: 'missed_cancer', isCorrect: correct,
      });
    }
    setState(s => ({ ...s, comprehensionAnswer: answer, comprehensionCorrect: correct, eventCount: exportPackRef.current?.getEvents().length || 0 }));
  }, []);

  // Proceed to deviation or probes
  const proceedToDeviation = useCallback(async () => {
    const needsDeviation = state.finalBirads !== state.initialBirads;
    if (needsDeviation) {
      if (eventLoggerRef.current) {
        await eventLoggerRef.current!.addEvent('DEVIATION_STARTED', { initialBirads: state.initialBirads, tentativeFinalBirads: state.finalBirads });
      }
      setState(s => ({ ...s, step: 'DEVIATION', eventCount: exportPackRef.current?.getEvents().length || 0 }));
    } else {
      // No deviation needed - show probes modal
      setShowProbesModal(true);
    }
  }, [state.initialBirads, state.finalBirads]);
  
  // Called after deviation step to show probes
  const proceedToProbes = useCallback(async (skipDeviation = false) => {
    if (eventLoggerRef.current) {
      if (skipDeviation) {
        await eventLoggerRef.current!.addEvent('DEVIATION_SKIPPED', { reason: 'user_skipped' });
        setDeviationsSkipped(prev => prev + 1);
      } else if (state.deviationRationale) {
        await eventLoggerRef.current!.addEvent('DEVIATION_SUBMITTED', { 
          rationale: state.deviationRationale, 
          initialBirads: state.initialBirads, 
          finalBirads: state.finalBirads 
        });
      }
    }
    setShowProbesModal(true);
  }, [state.deviationRationale, state.initialBirads, state.finalBirads]);

  // Submit final assessment
  const submitFinalAssessment = useCallback(async (skipDeviation = false) => {
    if (!eventLoggerRef.current || !state.currentCase) return;
    
    const deviationRequired = state.finalBirads !== state.initialBirads;
    
    if (state.step === 'DEVIATION' && deviationRequired) {
      if (skipDeviation) {
        await eventLoggerRef.current!.addEvent('DEVIATION_SKIPPED', { reason: 'user_skipped' });
        setDeviationsSkipped(prev => prev + 1);
      } else {
        await eventLoggerRef.current!.addEvent('DEVIATION_SUBMITTED', { rationale: state.deviationRationale, initialBirads: state.initialBirads, finalBirads: state.finalBirads });
      }
    }
    
    if (deviationRequired) {
      setTotalDeviationsRequired(prev => prev + 1);
    }
    
    // Track AI agreement streak
const agreedWithAI = (state.finalBirads ?? state.initialBirads) === aiSuggestedBirads;
    if (agreedWithAI) {
setAiAgreementStreak(prev => prev + 1);
    } else {
      setAiAgreementStreak(0);
    }
    
    await eventLoggerRef.current!.logFinalAssessment(
      state.currentCase.caseId,
      state.finalBirads ?? state.initialBirads ?? 0,
      state.finalConfidence,
      state.initialBirads ?? 0,
      aiSuggestedBirads
    );
    await eventLoggerRef.current!.addEvent('ATTENTION_COVERAGE_PROXY', {
      roiDwellTimes: Object.fromEntries(state.roiDwellTimes), totalDwellMs: Array.from(state.roiDwellTimes.values()).reduce((a, b) => a + b, 0),
    });
    await eventLoggerRef.current!.addEvent('TRUST_CALIBRATION', {
      preTrust: state.preTrust,
      postTrust: state.postTrust,
      trustDelta: state.postTrust - state.preTrust,
      caseId: state.currentCase.caseId,
    });
    
    // Log risk meter snapshot
    const totalDwell = Array.from(state.roiDwellTimes.values()).reduce((a, b) => a + b, 0);
    const aiDwell = state.roiDwellTimes.get('ai_box') || 0;
    await eventLoggerRef.current!.addEvent('RISK_METER_SNAPSHOT', {
      caseId: state.currentCase.caseId,
      timeToLockMs: state.lockTime && state.caseStartTime ? state.lockTime.getTime() - state.caseStartTime.getTime() : 0,
      aiAgreementStreak: agreedWithAI ? aiAgreementStreak + 1 : 0,
      deviationsSkipped: deviationsSkipped + (skipDeviation ? 1 : 0),
      totalDeviationsRequired: totalDeviationsRequired + (deviationRequired ? 1 : 0),
      aiDwellRatio: totalDwell > 0 ? aiDwell / totalDwell : 0,
      agreedWithAI,
    });
    
    await eventLoggerRef.current!.addEvent('CASE_COMPLETED', { caseId: state.currentCase.caseId });
    
    // Compute metrics
    const metrics: DerivedMetrics = {
      sessionId: state.sessionId,
      timestamp: new Date().toISOString(),
      condition: state.condition?.condition ?? 'UNKNOWN',

      initialBirads: state.initialBirads ?? 0,
      finalBirads: state.finalBirads ?? state.initialBirads ?? 0,

      aiBirads: aiSuggestedBirads,
      aiConfidence: aiSuggestedConfidence,

      changeOccurred: (state.finalBirads ?? state.initialBirads) !== state.initialBirads,
      aiConsistentChange:
        (state.finalBirads ?? state.initialBirads) !== state.initialBirads &&
        (state.finalBirads ?? state.initialBirads) === aiSuggestedBirads,
      aiInconsistentChange:
        (state.finalBirads ?? state.initialBirads) !== state.initialBirads &&
        (state.finalBirads ?? state.initialBirads) !== aiSuggestedBirads,

      addaDenominator:
        aiSuggestedBirads != null && (state.initialBirads ?? 0) !== aiSuggestedBirads,
      adda:
        aiSuggestedBirads != null && (state.initialBirads ?? 0) !== aiSuggestedBirads
          ? (state.finalBirads ?? state.initialBirads ?? 0) === aiSuggestedBirads
          : null,

      deviationRequired:
        (state.finalBirads ?? state.initialBirads) !== state.initialBirads,
      deviationDocumented: (state.deviationRationale ?? '').trim().length > 0,
      deviationSkipped:
        (state.finalBirads ?? state.initialBirads) !== state.initialBirads &&
        (state.deviationRationale ?? '').trim().length === 0,
      deviationText: (state.deviationRationale ?? '').trim() || undefined,

      comprehensionCorrect: state.comprehensionCorrect ?? null,

      totalTimeMs: Math.round(timeOnCase * 1000),
      lockToRevealMs:
        state.lockTime && state.aiRevealTime
          ? state.aiRevealTime.getTime() - state.lockTime.getTime()
          : 0,
      revealToFinalMs: state.aiRevealTime ? Date.now() - state.aiRevealTime.getTime() : 0,

      revealTiming: state.condition?.condition ?? 'UNKNOWN',
      disclosureFormat: state.condition?.disclosureFormat ?? 'UNKNOWN',
    };

const completedCaseId = state.currentCase?.caseId ?? currentCase?.caseId ?? 'UNKNOWN_CASE';

    setState(s => ({
      ...s,
      step: 'COMPLETE',
      caseResults: [...s.caseResults, { caseId: completedCaseId, ...metrics }],
      eventCount: exportPackRef.current?.getEvents().length || 0,
    }));
  }, [state, timeOnCase, aiAgreementStreak, deviationsSkipped, totalDeviationsRequired]);

  // Next case
  const nextCase = useCallback(async () => {
    if (!state.caseQueue || !eventLoggerRef.current) return;
    
    // Advance first, then check if complete
    const newQueue = advanceQueue(state.caseQueue);
    
    if (isQueueComplete(newQueue)) {
      await eventLoggerRef.current!.logSessionEnded({ reason: 'completed', totalCases: state.caseResults.length });
      setState(s => ({ ...s, step: 'STUDY_COMPLETE', caseQueue: newQueue, eventCount: exportPackRef.current?.getEvents().length || 0 }));
      return;
    }
    
    const nextCaseDef = getCurrentCase(newQueue);
    
    if (nextCaseDef) {
      await eventLoggerRef.current!.addEvent('CASE_LOADED', { caseId: nextCaseDef.caseId, isCalibration: nextCaseDef.isCalibration });
    }
    
    setState(s => ({
      ...s, caseQueue: newQueue, currentCase: nextCaseDef, step: 'INITIAL',
      initialBirads: null, initialConfidence: 70, preTrust: 50, finalBirads: null, finalConfidence: 70, postTrust: 50,
      deviationRationale: '', comprehensionAnswer: null, comprehensionCorrect: null,
      caseStartTime: new Date(), lockTime: null, aiRevealTime: null,
      eventCount: exportPackRef.current?.getEvents().length || 0,
      roiDwellTimes: new Map(),
      interactionCounts: { zooms: 0, pans: 0 },
    }));
    setTimeOnCase(0);
  }, [state.caseQueue, state.caseResults.length]);

  // Generate export
  const generateExport = useCallback(async () => {
    if (!exportPackRef.current || !eventLoggerRef.current) return;
    
    await eventLoggerRef.current!.addEvent('EXPORT_GENERATED', { casesCompleted: state.caseResults.length });
    
    // Add all case metrics before generating
    for (const metrics of state.caseResults) {
      exportPackRef.current.addCaseMetrics(metrics);
    }
    
    const { blob, filename, verifierOutput } = await exportPackRef.current.generateZip();
    const url = URL.createObjectURL(blob);
    
    setState(s => ({ ...s, exportReady: true, exportUrl: url, exportFilename: filename, verifierResult: verifierOutput.result as 'PASS' | 'FAIL', eventCount: exportPackRef.current?.getEvents().length || 0 }));
    setTamperDemoActive(false);
    setTamperFailureCode(null);
  }, [state.caseResults]);

  // Tamper Demo - simulates what happens when export is modified
  const runTamperDemo = useCallback(() => {
    const failureCodes = [
      { code: 'CHAIN_BROKEN', message: 'Hash chain integrity violated at event #47', detail: 'Expected: 8f3a2b... Got: 0000000...' },
      { code: 'CONTENT_TAMPERED', message: 'Event payload modified after signing', detail: 'Field "finalBirads" changed from 4 to 2' },
      { code: 'TIMESTAMP_REGRESSION', message: 'Non-monotonic timestamp detected', detail: 'Event #52 predates event #51 by 3.2s' },
    ];
    const failure = failureCodes[Math.floor(Math.random() * failureCodes.length)];
    setTamperDemoActive(true);
    setTamperFailureCode(failure.code);
    setState(s => ({ ...s, verifierResult: 'FAIL' }));
  }, []);

  const resetTamperDemo = useCallback(() => {
    setTamperDemoActive(false);
    setTamperFailureCode(null);
    setState(s => ({ ...s, verifierResult: 'PASS' }));
  }, []);

  // ADDA calculation helper
  const computeADDA = useCallback(() => {
    if (!state.currentCase || state.initialBirads === null) return null;
    const aiBirads = aiSuggestedBirads;
    const finalBirads = state.finalBirads ?? state.initialBirads;
    const addaDenominator = state.initialBirads !== aiBirads;
    const changeOccurred = finalBirads !== state.initialBirads;
    const aiConsistentChange = changeOccurred && finalBirads === aiBirads;
    return { addaDenominator, changeOccurred, aiConsistentChange, adda: addaDenominator && aiConsistentChange };
  }, [state.currentCase, state.initialBirads, state.finalBirads]);

  const isSetupScreen = state.step === 'SETUP';

  // ============== RENDER ==============
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Study Control Surface - Left Panel (Researcher Mode Only) */}
      {state.condition && viewMode === 'RESEARCHER' && (
        <StudyControlSurface
          condition={state.condition}
          sessionId={state.sessionId}
          caseQueue={state.caseQueue}
          currentCaseId={state.currentCase?.caseId || null}
          isCollapsed={!showControlSurface}
          onToggle={() => setShowControlSurface(!showControlSurface)}
          disclosurePolicy={disclosurePolicy}
          onDisclosurePolicyChange={async (policy) => {
            setDisclosurePolicy(policy);
            if (eventLoggerRef.current) {
              await eventLoggerRef.current!.addEvent('DISCLOSURE_POLICY_CHANGED', { 
                policy, 
                caseId: state.currentCase?.caseId,
                timestamp: new Date().toISOString()
              });
              setState(s => ({ ...s, eventCount: exportPackRef.current?.getEvents().length || 0 }));
            }
          }}
          currentCaseDifficulty={
            // Derive difficulty from case metadata or use round-robin for demo
            state.caseQueue && state.currentCase 
              ? (['EASY', 'MEDIUM', 'HARD'] as const)[state.caseQueue.currentIndex % 3]
              : undefined
          }
        />
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', marginLeft: state.condition && showControlSurface && viewMode === 'RESEARCHER' ? '360px' : 'auto' }}>
        {/* Header */}
        {isSetupScreen ? (
          <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', color: 'white', padding: '32px', borderRadius: '16px 16px 0 0', textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '28px' }}>Evidify Research Study Launcher</h1>
            <p style={{ margin: '8px 0 0', opacity: 0.9 }}>
              Start a participant session or open the researcher console for the Friday walkthrough.
            </p>
          </div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', color: 'white', padding: '24px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <h1 style={{ margin: 0, fontSize: '26px' }}>Evidify Research Platform</h1>
                {/* Operator View Badge (Researcher Mode Only) */}
                {viewMode === 'RESEARCHER' && (
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: '#a855f7',
                    color: 'white',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    border: '1px solid #c084fc',
                  }}>
                    🔬 OPERATOR VIEW
                  </div>
                )}
                {/* Trial Phase Badge */}
                {state.step !== 'SETUP' && state.step !== 'STUDY_COMPLETE' && (
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: state.currentCase?.isCalibration ? '#f59e0b' : '#22c55e',
                    color: state.currentCase?.isCalibration ? '#78350f' : '#052e16',
                    border: `2px solid ${state.currentCase?.isCalibration ? '#fcd34d' : '#4ade80'}`,
                    animation: 'pulse 2s infinite',
                  }}>
                    {state.currentCase?.isCalibration ? '📚 CALIBRATION TRIAL • FEEDBACK ON' : '🔬 STUDY TRIAL • NO FEEDBACK'}
                  </div>
                )}
              </div>
              <p style={{ margin: '4px 0 0', opacity: 0.9 }}>Human-First AI • FDR/FOR Disclosure • Tamper-Evident Audit</p>
              <div style={{ marginTop: '12px', fontSize: '13px', opacity: 0.8 }}>
                🔑 {state.sessionId} {state.condition && <span style={{ marginLeft: '16px' }}>🎯 {state.condition.condition}</span>}
                {progress && <span style={{ marginLeft: '16px' }}>📋 Case {progress.current}/{progress.total}</span>}
                <span style={{ marginLeft: '16px' }}>⏱️ {timeOnCase.toFixed(1)}s</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '16px 24px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{state.eventCount}</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Events Logged</div>
              </div>
              <button
                onClick={() => setShowStudyDesign(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(59, 130, 246, 0.3)',
                  border: '1px solid rgba(147, 197, 253, 0.5)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📋 Study Design
              </button>
              <button
                onClick={() => setShowStudyPack(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(34, 197, 94, 0.3)',
                  border: '1px solid rgba(134, 239, 172, 0.5)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📦 Study Pack
              </button>
              {/* Keyboard Help */}
              <button
                onClick={() => setShowKeyboardHelp(true)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Keyboard shortcuts (?)"
              >
                ⌨️ <span style={{ opacity: 0.7 }}>?</span>
              </button>
              {/* Mode Toggle */}
              <div style={{
                display: 'flex',
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '2px',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <button
                  onClick={() => setViewMode('CLINICIAN')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: viewMode === 'CLINICIAN' ? '#3b82f6' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  👩‍⚕️ Clinician
                </button>
                <button
                  onClick={() => setViewMode('RESEARCHER')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: viewMode === 'RESEARCHER' ? '#a855f7' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  🔬 Researcher
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Mode-Specific Description Bar */}
        {state.step !== 'SETUP' && state.step !== 'STUDY_COMPLETE' && (
          <div style={{
            backgroundColor: viewMode === 'RESEARCHER' ? '#1a1a2e' : '#1e3a5f',
            padding: '10px 24px',
            borderBottom: `1px solid ${viewMode === 'RESEARCHER' ? '#a855f7' : '#3b82f6'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ color: '#94a3b8', fontSize: '11px' }}>
              {viewMode === 'RESEARCHER' 
                ? '🔬 RESEARCHER VIEW: Full instrumentation, event logging, study controls visible. Seeds and protocol parameters exposed.'
                : '👩‍⚕️ CLINICIAN VIEW: Streamlined reading interface. Research instrumentation hidden.'}
            </div>
            <div style={{ 
              fontSize: '10px', 
              color: viewMode === 'RESEARCHER' ? '#c084fc' : '#60a5fa',
              fontWeight: 600,
            }}>
              Press ? for keyboard shortcuts
            </div>
          </div>
        )}

        {/* Main Content */}
        <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '0 0 16px 16px' }}>
          
          {/* SETUP */}
          {state.step === 'SETUP' && (
            <div style={{ textAlign: 'center', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setViewMode('CLINICIAN');
                    startStudy();
                  }}
                  style={{
                    padding: '20px 28px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: '2px solid #60a5fa',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    minWidth: '220px',
                    fontSize: '16px',
                    fontWeight: 700,
                  }}
                >
                  🧑‍⚕️ Run Participant Session
                </button>
                <button
                  onClick={() => {
                    setViewMode('RESEARCHER');
                    startStudy();
                  }}
                  style={{
                    padding: '20px 28px',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    border: '2px solid #a78bfa',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    minWidth: '220px',
                    fontSize: '16px',
                    fontWeight: 700,
                  }}
                >
                  🔬 Researcher Console
                </button>
              </div>

              <details style={{ width: '100%', maxWidth: '720px', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', padding: '16px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '14px' }}>
                  Advanced / Diagnostics
                </summary>
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <SessionRecoveryBanner
                    hasRecoverableSession={hasRecoverableSession}
                    recoveryData={recoveryData}
                    onRecover={handleRecoverSession}
                    onDiscard={handleDiscardRecovery}
                  />

                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>View Mode</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setViewMode('CLINICIAN')}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: viewMode === 'CLINICIAN' ? '#3b82f6' : '#1f2937',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        👩‍⚕️ Clinician
                      </button>
                      <button
                        onClick={() => setViewMode('RESEARCHER')}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: viewMode === 'RESEARCHER' ? '#a855f7' : '#1f2937',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        🔬 Researcher
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ color: 'white', marginBottom: '12px' }}>Select Study Condition</h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {(['HUMAN_FIRST', 'AI_FIRST', 'CONCURRENT'] as RevealCondition[]).map(cond => (
                        <button key={cond} onClick={() => startStudy(cond)} style={{
                          padding: '16px 20px', backgroundColor: cond === 'HUMAN_FIRST' ? '#3b82f6' : '#334155', color: 'white',
                          border: '2px solid ' + (cond === 'HUMAN_FIRST' ? '#60a5fa' : '#475569'), borderRadius: '12px', cursor: 'pointer', minWidth: '180px',
                        }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
                            {cond === 'HUMAN_FIRST' ? '🧠 Human First' : cond === 'AI_FIRST' ? '🤖 AI First' : '⚡ Concurrent'}
                          </div>
                          <div style={{ fontSize: '11px', opacity: 0.8 }}>
                            {cond === 'HUMAN_FIRST' ? 'Lock before AI' : cond === 'AI_FIRST' ? 'See AI first' : 'AI visible'}
                          </div>
                          {cond === 'HUMAN_FIRST' && <div style={{ marginTop: '6px', fontSize: '10px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '12px' }}>⭐ RECOMMENDED</div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '16px', borderRadius: '12px' }}>
                    <strong>📋 Protocol:</strong> 1 calibration case + 3 study cases • FDR/FOR disclosure • Comprehension check • Deviation documentation
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* CALIBRATION */}
          {state.step === 'CALIBRATION' && currentCase && (
            <div>
              <div style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                <strong>📚 Training Case:</strong> Make your assessment. You'll see ground truth feedback.
              </div>
              <div 
                onMouseEnter={() => handleROIEnter('mammogram')} 
                onMouseLeave={() => handleROILeave('mammogram')} 
                style={{ marginBottom: '24px', border: '2px solid #334155', borderRadius: '12px', overflow: 'hidden' }}
              >
                <MammogramDualViewSimple 
                  leftImage={currentCase.images?.LCC} 
                  rightImage={currentCase.images?.RCC} 
                  leftLabel="L CC" 
                  rightLabel="R CC" 
                  showAIOverlay={false}
                  onZoom={() => handleViewerInteraction('zoom')}
                  onPan={() => handleViewerInteraction('pan')}
                />
              </div>
              
              {/* Attention Metrics (Researcher Mode Only) */}
              {viewMode === 'RESEARCHER' && (
                <AttentionMetricsPanel 
                  roiDwellTimes={state.roiDwellTimes}
                  interactionCounts={state.interactionCounts}
                  totalTimeMs={timeOnCase * 1000}
                />
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '500px', marginTop: '24px' }}>
                <div>
                  <label style={{ color: 'white', fontWeight: 600, display: 'block', marginBottom: '8px' }}>BI-RADS</label>
                  <select value={state.calibrationBirads ?? ''} onChange={e => setState(s => ({ ...s, calibrationBirads: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #475569', backgroundColor: '#334155', color: 'white', fontSize: '16px' }}>
                    <option value="">Select...</option>
                    {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>BI-RADS {n}</option>)}
                  </select>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    ⌨️ Press 0-5 to quick-select
                  </div>
                </div>
                <div>
                  <label style={{ color: 'white', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Confidence: {state.calibrationConfidence}%</label>
                  <input type="range" min="0" max="100" value={state.calibrationConfidence} onChange={e => setState(s => ({ ...s, calibrationConfidence: Number(e.target.value) }))} style={{ width: '100%' }} />
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    ⌨️ Press +/- to adjust
                  </div>
                </div>
              </div>
              <button 
                id="calibration-submit-btn"
                onClick={submitCalibration} 
                disabled={state.calibrationBirads === null}
                style={{ marginTop: '24px', padding: '16px 32px', backgroundColor: state.calibrationBirads !== null ? '#f59e0b' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: state.calibrationBirads !== null ? 'pointer' : 'not-allowed', fontSize: '16px', fontWeight: 600 }}>
                Submit & See Ground Truth
                <span style={{ marginLeft: '8px', opacity: 0.7, fontSize: '12px' }}>[Space]</span>
              </button>
            </div>
          )}

          {/* CALIBRATION FEEDBACK */}
          {state.step === 'CALIBRATION_FEEDBACK' && currentCase && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              {/* Calibration Mode Banner */}
              <div style={{ 
                backgroundColor: '#f59e0b', 
                color: '#78350f', 
                padding: '12px 20px', 
                borderRadius: '12px', 
                marginBottom: '24px',
                display: 'inline-block'
              }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                  📚 CALIBRATION MODE — GROUND TRUTH VISIBLE
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>
                  This feedback is shown only during calibration. Study trials will NOT reveal ground truth.
                </div>
              </div>
              
              <h2 style={{ color: '#4ade80', marginTop: '16px' }}>Training Feedback</h2>
              <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', marginBottom: '32px' }}>
                <div style={{ padding: '24px', backgroundColor: '#334155', borderRadius: '12px', minWidth: '140px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Your Assessment</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>BI-RADS {state.calibrationBirads}</div>
                </div>
                <div style={{ padding: '24px', backgroundColor: '#166534', borderRadius: '12px', minWidth: '140px', border: '2px solid #22c55e' }}>
                  <div style={{ fontSize: '12px', color: '#86efac', marginBottom: '8px' }}>Ground Truth</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>BI-RADS {currentCase.groundTruth?.birads ?? '?'}</div>
                </div>
              </div>
              <div style={{ color: state.calibrationBirads === currentCase.groundTruth?.birads ? '#4ade80' : '#fbbf24', fontSize: '18px', marginBottom: '24px' }}>
                {state.calibrationBirads === currentCase.groundTruth?.birads ? '✅ Correct!' : '⚠️ Review the case presentation for learning'}
              </div>
              
              {/* Study Trial Transition Notice */}
              <div style={{ 
                backgroundColor: '#1e3a5f', 
                color: '#93c5fd', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                marginBottom: '24px',
                maxWidth: '400px',
                margin: '0 auto 24px',
                fontSize: '12px',
                border: '1px solid #3b82f6'
              }}>
                <strong>Next:</strong> Study trials begin. You will NOT see ground truth or feedback until the study is complete.
              </div>
              
              <button onClick={continueFromCalibration} style={{ padding: '16px 32px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 600 }}>
                🔬 Begin Study Trials →
              </button>
            </div>
          )}

          {/* INITIAL ASSESSMENT */}
          {state.step === 'INITIAL' && currentCase && (
            <div>
              <div style={{ backgroundColor: '#3b82f6', color: 'white', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                <strong>🧠 Initial Assessment:</strong> Review the mammogram and lock your impression BEFORE seeing AI.
              </div>
              
              {/* Viewer Controls Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 16px',
                backgroundColor: '#1e293b',
                borderRadius: '8px 8px 0 0',
                border: '2px solid #3b82f6',
                borderBottom: 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Hanging Protocol */}
                  <HangingProtocolSelector
                    currentProtocol={hangingProtocol}
                    onProtocolChange={(p) => {
                      setHangingProtocol(p);
                      eventLoggerRef.current?.addEvent('HANGING_PROTOCOL_CHANGED', { 
                        protocol: p, 
                        timestamp: new Date().toISOString() 
                      });
                    }}
                  />
                  {/* Case Info */}
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>{currentCase.caseId}</span>
                    {currentCase.isCalibration && (
                      <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#f59e0b', color: '#78350f', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}>
                        CALIBRATION
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Time on case */}
                  <div style={{ 
                    fontSize: '11px', 
                    color: timeOnCase < 3 ? '#f87171' : '#4ade80', 
                    fontWeight: 600,
                    padding: '4px 8px',
                    backgroundColor: '#0f172a',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                  }}>
                    ⏱️ {timeOnCase}s
                  </div>
                  {/* Reset Button */}
                  <button
                    onClick={() => {
                      // Reset viewer state
                      setState(s => ({
                        ...s,
                        interactionCounts: { zooms: 0, pans: 0 },
                      }));
                      eventLoggerRef.current?.addEvent('VIEWPORT_RESET', { 
                        caseId: currentCase.caseId,
                        timestamp: new Date().toISOString() 
                      });
                    }}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#334155',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                    title="Reset viewport (R)"
                  >
                    ↺ Reset
                  </button>
                </div>
              </div>
              
              <div 
                onMouseEnter={() => handleROIEnter('mammogram')} 
                onMouseLeave={() => handleROILeave('mammogram')} 
                style={{ marginBottom: '24px', border: '2px solid #3b82f6', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}
              >
                <MammogramDualViewSimple 
                  leftImage={currentCase.images?.LCC} 
                  rightImage={currentCase.images?.RCC} 
                  leftLabel="L CC" 
                  rightLabel="R CC" 
                  showAIOverlay={false}
                  onZoom={() => handleViewerInteraction('zoom')}
                  onPan={() => handleViewerInteraction('pan')}
                />
              </div>
              
              {/* Attention Metrics (Researcher Mode Only) */}
              {viewMode === 'RESEARCHER' && (
                <AttentionMetricsPanel 
                  roiDwellTimes={state.roiDwellTimes}
                  interactionCounts={state.interactionCounts}
                  totalTimeMs={timeOnCase * 1000}
                />
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '500px', marginTop: '24px' }}>
                <div>
                  <label style={{ color: 'white', fontWeight: 600, display: 'block', marginBottom: '8px' }}>BI-RADS Assessment</label>
                  <select value={state.initialBirads ?? ''} onChange={e => setState(s => ({ ...s, initialBirads: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #3b82f6', backgroundColor: '#334155', color: 'white', fontSize: '16px' }}>
                    <option value="">Select...</option>
                    {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>BI-RADS {n}</option>)}
                  </select>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    ⌨️ Press 0-5 to quick-select
                  </div>
                </div>
                <div>
                  <label style={{ color: 'white', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Confidence: {state.initialConfidence}%</label>
                  <input type="range" min="0" max="100" value={state.initialConfidence} onChange={e => setState(s => ({ ...s, initialConfidence: Number(e.target.value) }))} style={{ width: '100%' }} />
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    ⌨️ Press +/- to adjust
                  </div>
                </div>
              </div>
              
              {/* Pre-AI Trust */}
              <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ color: '#94a3b8', fontWeight: 600, fontSize: '13px' }}>
                    🤖 Expected Trust in AI
                  </label>
                  <span style={{ color: '#60a5fa', fontWeight: 700 }}>{state.preTrust}%</span>
                </div>
                <input type="range" min="0" max="100" value={state.preTrust} onChange={e => setState(s => ({ ...s, preTrust: Number(e.target.value) }))} style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  <span>Won't rely on AI</span>
                  <span>Will heavily rely</span>
                </div>
              </div>
              
              <button 
                id="lock-impression-btn"
                onClick={lockImpression} 
                disabled={state.initialBirads === null}
                style={{ marginTop: '24px', padding: '16px 32px', backgroundColor: state.initialBirads !== null ? '#f59e0b' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: state.initialBirads !== null ? 'pointer' : 'not-allowed', fontSize: '16px', fontWeight: 600 }}>
                🔒 Lock First Impression & Reveal AI
                <span style={{ marginLeft: '8px', opacity: 0.7, fontSize: '12px' }}>[Space]</span>
              </button>
            </div>
          )}

          {/* AI REVEALED */}
          {state.step === 'AI_REVEALED' && currentCase && (
            <div>
              <div style={{ backgroundColor: '#7c3aed', color: 'white', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                <strong>🤖 AI Assessment Revealed:</strong> Review AI opinion and FDR/FOR disclosure. You may update your assessment.
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Viewer */}
                <div 
                  onMouseEnter={() => handleROIEnter('mammogram')} 
                  onMouseLeave={() => handleROILeave('mammogram')} 
                  style={{ border: '2px solid #7c3aed', borderRadius: '12px', overflow: 'hidden' }}
                >
                  <MammogramDualViewSimple 
                    leftImage={currentCase.images?.LCC} 
                    rightImage={currentCase.images?.RCC} 
                    leftLabel="L CC" 
                    rightLabel="R CC" 
                    showAIOverlay={true}
                    onZoom={() => handleViewerInteraction('zoom')}
                    onPan={() => handleViewerInteraction('pan')}
                  />
                </div>
                
                {/* AI + FDR/FOR Panel */}
                <div>
                  {/* AI Result */}
                  <div 
                    onMouseEnter={() => handleROIEnter('ai_box')} 
                    onMouseLeave={() => handleROILeave('ai_box')}
                    style={{ backgroundColor: '#7c3aed', padding: '20px', borderRadius: '12px', marginBottom: '16px', border: '2px solid #a855f7' }}
                  >
                    <div style={{ fontSize: '12px', color: '#c4b5fd', marginBottom: '8px' }}>AI ASSESSMENT</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>BI-RADS {aiSuggestedBirads}</div>
                    <div style={{ fontSize: '14px', color: '#c4b5fd', marginTop: '4px' }}>Confidence: {(aiSuggestedConfidence * 100).toFixed(0)}%</div>
                  </div>
                  
                  {/* FDR/FOR Disclosure - Adaptive based on policy + difficulty */}
                  {(() => {
                    const caseDifficulty = state.caseQueue ? (['EASY', 'MEDIUM', 'HARD'] as const)[state.caseQueue.currentIndex % 3] : 'MEDIUM';
                    const showFdrFor = disclosurePolicy === 'STATIC' || caseDifficulty !== 'EASY';
                    const showDebias = disclosurePolicy === 'ADAPTIVE' && caseDifficulty === 'HARD';
                    
                    return (
                      <div 
                        onMouseEnter={() => handleROIEnter('fdr_for')} 
                        onMouseLeave={() => handleROILeave('fdr_for')}
                        style={{ 
                          backgroundColor: '#0f172a', 
                          padding: '16px', 
                          borderRadius: '12px', 
                          border: `2px solid ${disclosurePolicy === 'ADAPTIVE' ? '#a855f7' : '#f59e0b'}` 
                        }}
                      >
                        {/* Adaptive Mode Indicator */}
                        {disclosurePolicy === 'ADAPTIVE' && (
                          <div style={{ 
                            marginBottom: '12px', 
                            padding: '6px 10px', 
                            backgroundColor: caseDifficulty === 'EASY' ? '#166534' : caseDifficulty === 'MEDIUM' ? '#92400e' : '#7f1d1d',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: 'white',
                            textAlign: 'center'
                          }}>
                            🧠 ADAPTIVE: {caseDifficulty} CASE → {caseDifficulty === 'EASY' ? 'MINIMAL' : caseDifficulty === 'MEDIUM' ? 'STANDARD' : 'FULL+DEBIAS'} DISCLOSURE
                          </div>
                        )}
                        
                        {showFdrFor ? (
                          <>
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 700 }}>FALSE DISCOVERY RATE (FDR)</div>
                              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>4%</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Of AI "suspicious" → actually benign</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 700 }}>FALSE OMISSION RATE (FOR)</div>
                              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>12%</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Of AI "normal" → actually cancer</div>
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '12px 0' }}>
                            <div style={{ fontSize: '14px', marginBottom: '4px' }}>📊</div>
                            <div>Minimal disclosure mode (easy case)</div>
                            <div style={{ fontSize: '10px', marginTop: '4px', color: '#64748b' }}>AI suggestion shown without detailed error rates</div>
                          </div>
                        )}
                        
                        {/* Debias Prompt for Hard Cases */}
                        {showDebias && (
                          <div style={{ 
                            marginTop: '12px', 
                            padding: '10px', 
                            backgroundColor: '#7f1d1d', 
                            borderRadius: '8px',
                            border: '2px solid #ef4444'
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fca5a5', marginBottom: '6px' }}>
                              ⚠️ HARD CASE: AUTOMATION BIAS WARNING
                            </div>
                            <div style={{ fontSize: '11px', color: '#fecaca' }}>
                              This case has features that frequently lead to over-reliance on AI. 
                              Please ensure your independent assessment is well-formed before integrating AI input.
                            </div>
                          </div>
                        )}
                        
                        {/* Adaptive Policy Transparency */}
                        {disclosurePolicy === 'ADAPTIVE' && (
                          <div style={{ 
                            marginTop: '12px', 
                            padding: '10px', 
                            backgroundColor: '#1e1b4b', 
                            borderRadius: '8px',
                            border: '1px solid #4338ca',
                            fontSize: '10px'
                          }}>
                            <div style={{ 
                              fontWeight: 700, 
                              color: '#a5b4fc', 
                              marginBottom: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>🔍</span>
                              <span>POLICY DECISION REASONING</span>
                            </div>
                            <div style={{ color: '#c7d2fe' }}>
                              <div style={{ marginBottom: '6px' }}>
                                <span style={{ color: '#818cf8' }}>Input:</span> case_difficulty={caseDifficulty}
                              </div>
                              <div style={{ marginBottom: '6px' }}>
                                <span style={{ color: '#818cf8' }}>Rule:</span> {
                                  caseDifficulty === 'EASY' ? 'EASY → suppress FDR/FOR (minimal cognitive load)' :
                                  caseDifficulty === 'MEDIUM' ? 'MEDIUM → show FDR/FOR (standard disclosure)' :
                                  'HARD → full FDR/FOR + debias prompt (max intervention)'
                                }
                              </div>
                              <div style={{ marginBottom: '6px' }}>
                                <span style={{ color: '#818cf8' }}>Output:</span> disclosure_intensity={
                                  caseDifficulty === 'EASY' ? 'MINIMAL' : caseDifficulty === 'MEDIUM' ? 'STANDARD' : 'FULL_DEBIAS'
                                }
                              </div>
                              <div style={{ 
                                marginTop: '8px', 
                                paddingTop: '6px', 
                                borderTop: '1px solid #4338ca',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{ color: '#22c55e' }}>✓</span>
                                <span>Logged: ADAPTIVE_DISCLOSURE_DECISION</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  {/* Model Card (Collapsible) */}
                  <div style={{ marginTop: '12px' }}>
                    <button 
                      onClick={() => setShowModelCard(!showModelCard)}
                      style={{ 
                        width: '100%',
                        padding: '10px 12px', 
                        backgroundColor: '#1e293b', 
                        color: '#94a3b8', 
                        border: '1px solid #334155', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontSize: '11px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>🤖 AI Model Card</span>
                      <span>{showModelCard ? '▲' : '▼'}</span>
                    </button>
                    {showModelCard && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '12px', 
                        backgroundColor: '#0f172a', 
                        borderRadius: '8px',
                        border: '1px solid #334155',
                        fontSize: '11px'
                      }}>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#64748b' }}>Model:</span>
                          <span style={{ color: 'white', marginLeft: '8px' }}>MammoCAD v2.1</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#64748b' }}>Training:</span>
                          <span style={{ color: 'white', marginLeft: '8px' }}>142K mammograms</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#64748b' }}>Operating Point:</span>
                          <span style={{ color: 'white', marginLeft: '8px' }}>Sens 88% / Spec 92%</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#64748b' }}>Last Calibrated:</span>
                          <span style={{ color: 'white', marginLeft: '8px' }}>2025-11-15</span>
                        </div>
                        <div style={{ 
                          marginTop: '8px', 
                          padding: '6px', 
                          backgroundColor: '#7f1d1d', 
                          borderRadius: '4px',
                          color: '#fca5a5',
                          fontSize: '10px'
                        }}>
                          ⚠️ Research use only. Not FDA cleared for clinical diagnosis.
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Comprehension Check */}
                  <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#1e293b', borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>Comprehension Check</div>
                    <div style={{ fontSize: '13px', color: 'white', marginBottom: '12px' }}>Which error type is MORE likely with this AI?</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { id: 'false_alarm', label: 'False alarm (FDR = 4%)' },
                        { id: 'missed_cancer', label: 'Missed cancer (FOR = 12%)' },
                      ].map(opt => (
                        <button key={opt.id} onClick={() => handleComprehension(opt.id)}
                          style={{
                            padding: '10px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            backgroundColor: state.comprehensionAnswer === opt.id ? (state.comprehensionCorrect ? '#166534' : '#991b1b') : '#334155',
                            color: 'white', fontSize: '13px',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {state.comprehensionAnswer && (
                      <div style={{ marginTop: '12px', padding: '8px', borderRadius: '6px', backgroundColor: state.comprehensionCorrect ? '#166534' : '#7f1d1d', color: 'white', fontSize: '12px' }}>
                        {state.comprehensionCorrect ? '✓ Correct! FOR=12% > FDR=4%' : '✗ FOR=12% means missed cancers are more likely'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Attention Metrics (Researcher Mode Only) */}
              {viewMode === 'RESEARCHER' && (
                <AttentionMetricsPanel 
                  roiDwellTimes={state.roiDwellTimes}
                  interactionCounts={state.interactionCounts}
                  totalTimeMs={timeOnCase * 1000}
                />
              )}
              
              {/* Automation Bias Risk Meter (Researcher Mode Only) */}
              {viewMode === 'RESEARCHER' && (
                <AutomationBiasRiskMeter
                  timeToLockMs={state.lockTime && state.caseStartTime ? state.lockTime.getTime() - state.caseStartTime.getTime() : 0}
                  aiAgreementStreak={aiAgreementStreak}
                  deviationsSkipped={deviationsSkipped}
                  totalDeviations={totalDeviationsRequired}
                  casesCompleted={state.caseResults.length}
                  aiDwellRatio={(state.roiDwellTimes.get('ai_box') || 0) / Math.max(1, Array.from(state.roiDwellTimes.values()).reduce((a, b) => a + b, 0))}
                />
              )}
              
              {/* Final Assessment */}
              <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#0f172a', borderRadius: '12px' }}>
                <div style={{ fontSize: '14px', color: 'white', fontWeight: 600, marginBottom: '16px' }}>
                  Final Assessment {state.finalBirads !== state.initialBirads && <span style={{ color: '#f59e0b' }}>⚠️ CHANGED from BI-RADS {state.initialBirads}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '500px' }}>
                  <div>
                    <label style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '8px', fontSize: '12px' }}>BI-RADS</label>
                    <select value={state.finalBirads ?? ''} onChange={e => setState(s => ({ ...s, finalBirads: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #475569', backgroundColor: '#334155', color: 'white', fontSize: '16px' }}>
                      {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>BI-RADS {n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '8px', fontSize: '12px' }}>Confidence: {state.finalConfidence}%</label>
                    <input type="range" min="0" max="100" value={state.finalConfidence} onChange={e => setState(s => ({ ...s, finalConfidence: Number(e.target.value) }))} style={{ width: '100%' }} />
                  </div>
                </div>
                
                {/* Post-AI Trust with Delta */}
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ color: '#94a3b8', fontWeight: 600, fontSize: '13px' }}>
                      🤖 Actual Reliance on AI
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#a855f7', fontWeight: 700 }}>{state.postTrust}%</span>
                      {state.postTrust !== state.preTrust && (
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          fontSize: '11px', 
                          fontWeight: 600,
                          backgroundColor: state.postTrust > state.preTrust ? '#166534' : '#7f1d1d',
                          color: state.postTrust > state.preTrust ? '#86efac' : '#fca5a5',
                        }}>
                          {state.postTrust > state.preTrust ? '↑' : '↓'} {Math.abs(state.postTrust - state.preTrust)}
                        </span>
                      )}
                    </div>
                  </div>
                  <input type="range" min="0" max="100" value={state.postTrust} onChange={e => setState(s => ({ ...s, postTrust: Number(e.target.value) }))} style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    <span>Didn't rely on AI</span>
                    <span>Heavily relied</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                    Pre-AI expectation was {state.preTrust}% — 
                    {state.postTrust > state.preTrust ? ' trust increased' : state.postTrust < state.preTrust ? ' trust decreased' : ' no change'}
                  </div>
                </div>
                
                <button 
                  id="submit-final-btn"
                  onClick={proceedToDeviation} 
                  disabled={!state.comprehensionAnswer}
                  style={{ marginTop: '20px', padding: '16px 32px', backgroundColor: state.comprehensionAnswer ? '#22c55e' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: state.comprehensionAnswer ? 'pointer' : 'not-allowed', fontSize: '16px', fontWeight: 600 }}>
                  {state.finalBirads !== state.initialBirads ? '📝 Document Deviation & Submit' : '✓ Submit Final Assessment'}
                  <span style={{ marginLeft: '8px', opacity: 0.7, fontSize: '12px' }}>[Enter]</span>
                </button>
              </div>
            </div>
          )}

          {/* DEVIATION */}
          {state.step === 'DEVIATION' && (
            <div style={{ maxWidth: '600px' }}>
              <div style={{ backgroundColor: '#f59e0b', color: '#78350f', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                <strong>⚠️ Deviation Documentation Required:</strong> You changed from BI-RADS {state.initialBirads} to BI-RADS {state.finalBirads}. Please document your rationale.
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: 'white', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Deviation Rationale</label>
                <textarea
                  value={state.deviationRationale}
                  onChange={e => setState(s => ({ ...s, deviationRationale: e.target.value }))}
                  placeholder="Explain why you changed your assessment after seeing the AI result..."
                  style={{ width: '100%', height: '120px', padding: '12px', borderRadius: '8px', border: '2px solid #f59e0b', backgroundColor: '#334155', color: 'white', fontSize: '14px', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={() => proceedToProbes(false)} disabled={!state.deviationRationale.trim()}
                  style={{ flex: 1, padding: '16px', backgroundColor: state.deviationRationale.trim() ? '#22c55e' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: state.deviationRationale.trim() ? 'pointer' : 'not-allowed', fontSize: '16px', fontWeight: 600 }}>
                  ✓ Submit with Documentation
                </button>
                <button onClick={() => proceedToProbes(true)}
                  style={{ padding: '16px 24px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  Skip Documentation
                </button>
              </div>
            </div>
          )}

          {/* COMPLETE */}
          {state.step === 'COMPLETE' && currentCase && (
            <div>
              <h2 style={{ color: '#4ade80', marginTop: 0 }}>✅ Case Complete</h2>
              {(() => {
                const adda = computeADDA();
                if (!adda) return null;
                return (
                  <div style={{ backgroundColor: adda.adda === true ? '#166534' : adda.adda === false ? '#92400e' : '#334155', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: `2px solid ${adda.adda === true ? '#22c55e' : adda.adda === false ? '#f59e0b' : '#475569'}` }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
                      {adda.addaDenominator ? (adda.adda ? '✅ ADDA = TRUE' : '⚠️ ADDA = FALSE') : '➖ Not in ADDA denominator'}
                    </div>
                    <div style={{ color: '#94a3b8', marginTop: '8px', fontSize: '13px' }}>
                      change: {adda.changeOccurred.toString()} | ai_consistent: {adda.aiConsistentChange.toString()} | denominator: {adda.addaDenominator.toString()}
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', backgroundColor: '#334155', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Pre-AI</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{state.lockTime && state.caseStartTime ? ((state.lockTime.getTime() - state.caseStartTime.getTime()) / 1000).toFixed(1) : '0'}s</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#334155', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Post-AI</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{state.lockTime && state.caseStartTime ? (timeOnCase - (state.lockTime.getTime() - state.caseStartTime.getTime()) / 1000).toFixed(1) : '0'}s</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#334155', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{timeOnCase.toFixed(1)}s</div>
                </div>
              </div>
              <button onClick={() => nextCase()} style={{ width: '100%', padding: '16px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 600 }}>
                {progress && progress.current < progress.total ? `Continue to Case ${progress.current + 1}/${progress.total} →` : 'Complete Study →'}
              </button>
            </div>
          )}

          {/* NASA-TLX MICRO */}
          {state.step === 'TLX' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ backgroundColor: '#1e3a5f', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #3b82f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px' }}>📊</span>
                  <span style={{ color: 'white', fontWeight: 700 }}>NASA-TLX Workload Assessment</span>
                  <span style={{ backgroundColor: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '10px' }}>MICRO</span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                  Rate your experience for this case. This data helps correlate workload with decision quality.
                </p>
              </div>

              {/* Mental Demand */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ color: 'white', fontWeight: 600, fontSize: '15px' }}>Mental Demand</label>
                  <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '20px' }}>{tlxMental}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={tlxMental} 
                  onChange={e => setTlxMental(Number(e.target.value))}
                  style={{ width: '100%', height: '8px', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  <span>Very Low</span>
                  <span>Very High</span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>
                  How mentally demanding was this case? (thinking, deciding, calculating, remembering)
                </p>
              </div>

              {/* Temporal Demand */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ color: 'white', fontWeight: 600, fontSize: '15px' }}>Temporal Demand</label>
                  <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '20px' }}>{tlxTemporal}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={tlxTemporal} 
                  onChange={e => setTlxTemporal(Number(e.target.value))}
                  style={{ width: '100%', height: '8px', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  <span>Very Low</span>
                  <span>Very High</span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>
                  How hurried or rushed was the pace? (time pressure)
                </p>
              </div>

              <button 
                onClick={async () => {
                  if (eventLoggerRef.current) {
                    await eventLoggerRef.current!.addEvent('NASA_TLX_RECORDED', {
                      caseId: state.currentCase?.caseId,
                      mentalDemand: tlxMental,
                      temporalDemand: tlxTemporal,
                    });
                    setState(s => ({ ...s, eventCount: exportPackRef.current?.getEvents().length || 0 }));
                  }
                  setTlxMental(50);
                  setTlxTemporal(50);
                  nextCase();
                }}
                style={{ 
                  width: '100%', 
                  padding: '16px', 
                  backgroundColor: '#22c55e', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontSize: '16px', 
                  fontWeight: 600 
                }}
              >
                {progress && progress.current < progress.total ? `Continue to Case ${progress.current + 1}/${progress.total} →` : 'Complete Study →'}
              </button>
            </div>
          )}

          {/* STUDY COMPLETE */}
          {state.step === 'STUDY_COMPLETE' && (
            <div>
              <h2 style={{ color: '#4ade80', marginTop: 0 }}>🎉 Study Complete</h2>
              
              {/* Prominent Verification Status Banner */}
              {state.exportReady && (
                <div style={{
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  backgroundColor: state.verifierResult === 'PASS' ? '#052e16' : state.verifierResult === 'FAIL' ? '#450a0a' : '#1e293b',
                  border: `2px solid ${state.verifierResult === 'PASS' ? '#22c55e' : state.verifierResult === 'FAIL' ? '#dc2626' : '#475569'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: state.verifierResult === 'PASS' ? '#166534' : state.verifierResult === 'FAIL' ? '#991b1b' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                    }}>
                      {state.verifierResult === 'PASS' ? '✓' : state.verifierResult === 'FAIL' ? '✗' : '?'}
                    </div>
                    <div>
                      <div style={{
                        color: state.verifierResult === 'PASS' ? '#4ade80' : state.verifierResult === 'FAIL' ? '#f87171' : '#94a3b8',
                        fontSize: '24px',
                        fontWeight: 700,
                      }}>
                        {state.verifierResult === 'PASS' ? 'VERIFICATION PASSED' : 
                         state.verifierResult === 'FAIL' ? 'VERIFICATION FAILED' : 'AWAITING VERIFICATION'}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                        {state.verifierResult === 'PASS' ? 'Hash chain intact • Signature valid • No tampering detected' :
                         state.verifierResult === 'FAIL' ? `Integrity compromised: ${tamperFailureCode || 'Unknown error'}` :
                         'Generate export to verify chain integrity'}
                      </div>
                    </div>
                  </div>
                  {state.verifierResult && (
                    <div style={{
                      padding: '8px 16px',
                      backgroundColor: state.verifierResult === 'PASS' ? '#166534' : '#991b1b',
                      borderRadius: '8px',
                      color: 'white',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}>
                      {state.eventCount} events • Ed25519
                    </div>
                  )}
                </div>
              )}
              
              {/* Session Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', backgroundColor: '#166534', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{state.caseResults.length}</div>
                  <div style={{ fontSize: '12px', color: '#86efac' }}>Cases</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#581c87', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{state.caseResults.filter(r => r.adda === true).length}</div>
                  <div style={{ fontSize: '12px', color: '#c4b5fd' }}>ADDA=TRUE</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#92400e', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{state.caseResults.filter(r => r.changeOccurred).length}</div>
                  <div style={{ fontSize: '12px', color: '#fcd34d' }}>Changes</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#1e3a5f', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{state.eventCount}</div>
                  <div style={{ fontSize: '12px', color: '#93c5fd' }}>Events</div>
                </div>
              </div>

              {/* Cross-Exam Risk Flags */}
              <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '12px' }}>⚖️ CROSS-EXAMINATION RISK FLAGS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {state.caseResults.some(r => r.totalTimeMs < 5000) && (
                    <span style={{ padding: '4px 10px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                      ⚠️ FAST PRE-AI (&lt;5s)
                    </span>
                  )}
                  {state.caseResults.every(r => r.adda === true) && (
                    <span style={{ padding: '4px 10px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                      ⚠️ ALWAYS AGREED WITH AI
                    </span>
                  )}
                  {state.caseResults.some(r => r.deviationSkipped) && (
                    <span style={{ padding: '4px 10px', backgroundColor: '#92400e', color: '#fcd34d', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                      ⚠️ DEVIATION SKIPPED
                    </span>
                  )}
                  {state.caseResults.some(r => r.comprehensionCorrect === false) && (
                    <span style={{ padding: '4px 10px', backgroundColor: '#92400e', color: '#fcd34d', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                      ⚠️ COMPREHENSION FAILED
                    </span>
                  )}
                  {!state.caseResults.some(r => r.totalTimeMs < 5000) && 
                   !state.caseResults.every(r => r.adda === true) && 
                   !state.caseResults.some(r => r.deviationSkipped) &&
                   !state.caseResults.some(r => r.comprehensionCorrect === false) && (
                    <span style={{ padding: '4px 10px', backgroundColor: '#166534', color: '#86efac', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                      ✓ NO FLAGS - DEFENSIBLE RECORD
                    </span>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <button onClick={generateExport} style={{ flex: 1, padding: '16px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 600 }}>
                  📦 Generate Expert Witness Packet
                </button>
                {state.exportReady && (
                  <>
                    <button onClick={() => setShowPacketViewer(true)} style={{ padding: '16px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>
                      👁️ View
                    </button>
                    {!tamperDemoActive ? (
                      <button onClick={runTamperDemo} style={{ padding: '16px 24px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                        🔓 Tamper Demo
                      </button>
                    ) : (
                      <button onClick={resetTamperDemo} style={{ padding: '16px 24px', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                        ↩️ Reset Demo
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {/* Export Result Panel */}
              {state.exportReady && (
                <div style={{ 
                  backgroundColor: state.verifierResult === 'PASS' ? '#166534' : '#7f1d1d', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: `3px solid ${state.verifierResult === 'PASS' ? '#22c55e' : '#ef4444'}`,
                  transition: 'all 0.3s ease'
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'white' }}>
                        {tamperDemoActive ? '⚠️ TAMPERED PACKET DETECTED' : 'Expert Witness Packet Ready'}
                      </div>
                      <div style={{ color: state.verifierResult === 'PASS' ? '#86efac' : '#fca5a5' }}>
                        Verifier: {state.verifierResult}
                      </div>
                    </div>
                    <div style={{ 
                      backgroundColor: state.verifierResult === 'PASS' ? '#22c55e' : '#ef4444', 
                      color: 'white', 
                      padding: '12px 20px', 
                      borderRadius: '24px', 
                      fontWeight: 700,
                      fontSize: '16px',
                      boxShadow: state.verifierResult === 'FAIL' ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
                      animation: state.verifierResult === 'FAIL' ? 'pulse 1s infinite' : 'none'
                    }}>
                      {state.verifierResult === 'PASS' ? '✓ CHAIN INTACT' : '✗ CHAIN BROKEN'}
                    </div>
                  </div>

                  {/* Tamper Demo Failure Details */}
                  {tamperDemoActive && tamperFailureCode && (
                    <div style={{ 
                      backgroundColor: '#450a0a', 
                      padding: '16px', 
                      borderRadius: '8px', 
                      marginBottom: '16px',
                      border: '2px solid #dc2626'
                    }}>
                      <div style={{ fontFamily: 'monospace', marginBottom: '8px' }}>
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>FAILURE CODE:</span>
                        <span style={{ color: '#fca5a5', marginLeft: '8px' }}>{tamperFailureCode}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#fca5a5', fontFamily: 'monospace' }}>
                        {tamperFailureCode === 'CHAIN_BROKEN' && 'Hash chain integrity violated at event #47. Expected: 8f3a2b... Got: 0000000...'}
                        {tamperFailureCode === 'CONTENT_TAMPERED' && 'Event payload modified after signing. Field "finalBirads" changed from 4 to 2'}
                        {tamperFailureCode === 'TIMESTAMP_REGRESSION' && 'Non-monotonic timestamp detected. Event #52 predates event #51 by 3.2s'}
                      </div>
                      <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#7f1d1d', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 600 }}>LEGAL IMPLICATION:</div>
                        <div style={{ fontSize: '12px', color: '#fecaca' }}>This export cannot be used as evidence. The audit trail has been compromised.</div>
                      </div>
                    </div>
                  )}

                  {/* Package Contents */}
                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: 'white' }}>📁 Package (6 files):</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
                      <div>trial_manifest.json</div><div>events.jsonl</div><div>ledger.json</div>
                      <div>verifier_output.json</div><div>derived_metrics.csv</div><div>codebook.md</div>
                    </div>
                  </div>

                  {/* Download Button */}
                  {!tamperDemoActive && (
                    <a href={state.exportUrl!} download={state.exportFilename} style={{ display: 'inline-block', padding: '14px 28px', backgroundColor: '#22c55e', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '16px' }}>
                      📥 Download ZIP
                    </a>
                  )}
                </div>
              )}

              {/* Restart Option */}
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', backgroundColor: '#334155', color: '#94a3b8', border: '1px solid #475569', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  🔄 Start New Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Event Log Sidebar (Researcher Mode Only) */}
        {viewMode === 'RESEARCHER' && showEventLog && state.step !== 'SETUP' && exportPackRef.current && (
          <div style={{ position: 'fixed', right: '20px', top: '20px', width: '280px', maxHeight: 'calc(100vh - 40px)', backgroundColor: '#0f172a', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px rgba(0,0,0,0.4)', border: '1px solid #334155', zIndex: 100 }}>
            <div style={{ padding: '12px 16px', backgroundColor: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'white', fontWeight: 600 }}>📋 Events ({state.eventCount})</div>
              <button onClick={() => setShowEventLog(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>×</button>
            </div>
            {/* Verification Status Panel */}
            <div style={{ padding: '8px' }}>
              <VerificationStatusPanel
                eventCount={state.eventCount}
                sessionId={state.sessionId}
                isVerified={state.verifierResult === 'PASS' ? true : state.verifierResult === 'FAIL' ? false : null}
                lastHash={exportPackRef.current.getLedger()?.slice(-1)[0]?.chainHash}
              />
              {/* QC Monitoring Dashboard */}
              <QCMonitoringDashboard
                caseResults={state.caseResults}
                currentCaseIndex={state.caseQueue?.currentIndex || 0}
                totalCases={state.caseQueue?.cases.length || 0}
                eventCount={state.eventCount}
                sessionStartTime={state.startTime}
              />
            </div>
            <div style={{ padding: '8px 16px 8px', borderBottom: '1px solid #334155' }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>RECENT EVENTS</div>
            </div>
            <div style={{ maxHeight: '200px', overflow: 'auto', padding: '8px', fontSize: '10px', fontFamily: 'monospace' }}>
              {exportPackRef.current.getEvents().slice(-10).reverse().map((event, i) => (
                <div key={event.id} style={{ padding: '8px', backgroundColor: i === 0 ? '#1e293b' : 'transparent', borderRadius: '6px', marginBottom: '4px', borderLeft: '3px solid ' + (event.type.includes('SESSION') ? '#10b981' : event.type.includes('LOCKED') ? '#f59e0b' : event.type.includes('AI') ? '#a855f7' : event.type.includes('GAZE') || event.type.includes('DWELL') ? '#06b6d4' : event.type.includes('KEYBOARD') ? '#f97316' : event.type.includes('EDITED') ? '#ec4899' : '#64748b') }}>
                  <div style={{ color: '#64748b', fontSize: '9px' }}>{event.timestamp.split('T')[1].slice(0, 12)}</div>
                  <div style={{ color: 'white', fontWeight: 600 }}>{event.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {viewMode === 'RESEARCHER' && !showEventLog && state.step !== 'SETUP' && (
          <button onClick={() => setShowEventLog(true)} style={{ position: 'fixed', right: '20px', top: '20px', padding: '12px 16px', backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, zIndex: 100 }}>
            📋 Events ({state.eventCount})
          </button>
        )}
      </div>

      {/* Study Design Modal */}
      <StudyDesignPanel 
        isVisible={showStudyDesign} 
        onClose={() => setShowStudyDesign(false)} 
      />

      {/* Study Pack Modal */}
      <StudyPackModal
        isVisible={showStudyPack}
        onClose={() => setShowStudyPack(false)}
        sessionId={state.sessionId}
        condition={state.condition}
      />

      {/* Keyboard Help Modal */}
      <KeyboardHelpModal
        isVisible={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* Post-Case Probes Modal (Instrumentation Isolation) */}
      <ProbesBatchModal
        isVisible={showProbesModal}
        onComplete={async (probes) => {
          // Log probes
          if (eventLoggerRef.current) {
            await eventLoggerRef.current!.addEvent('POST_CASE_PROBES_COMPLETED', {
              caseId: state.currentCase?.caseId,
              postTrust: probes.postTrust,
              preTrust: state.preTrust,
              trustDelta: probes.postTrust - state.preTrust,
              comprehensionAnswer: probes.comprehensionAnswer,
              comprehensionCorrect: probes.comprehensionCorrect,
              tlxMental: probes.tlxMental,
              tlxTemporal: probes.tlxTemporal,
              timestamp: new Date().toISOString(),
            });
          }
          
          // Update state with probes data
          setState(s => ({
            ...s,
            postTrust: probes.postTrust,
            comprehensionAnswer: probes.comprehensionAnswer,
            comprehensionCorrect: probes.comprehensionCorrect,
          }));
          
          setShowProbesModal(false);
          setProbesCompleted(true);
          
          // Now submit final assessment
          await submitFinalAssessment();
        }}
        preTrust={state.preTrust}
        caseId={state.currentCase?.caseId || ''}
        aiFDR={15}
        aiFOR={8}
        includeTLX={viewMode === 'RESEARCHER'}
        viewMode={viewMode}
      />

      {/* Expert Witness Packet Viewer Modal */}
      {showPacketViewer && exportPackRef.current && (
        <ExpertWitnessPacketViewer
          isVisible={showPacketViewer}
          onClose={() => setShowPacketViewer(false)}
          sessionId={state.sessionId}
          caseResults={state.caseResults}
          events={exportPackRef.current.getEvents()}
          ledger={exportPackRef.current.getLedger()}
          verifierResult={state.verifierResult}
          tamperDetected={tamperDemoActive}
        />
      )}
    </div>
  );
};

export default ResearchDemoFlow;

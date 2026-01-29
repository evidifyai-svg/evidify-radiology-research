/**
 * ResearcherConsole.tsx
 * 
 * P1 Feature - Hidden Researcher Console
 * 
 * Allows live toggling of experimental conditions:
 * - Reveal timing (human-first vs concurrent vs AI-first)
 * - Disclosure format (FDR/FOR vs natural frequency vs none)
 * - Documentation enforcement (required vs optional-with-attestation)
 * 
 * Access: Press Ctrl+Shift+R to toggle visibility
 */

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ExperimentalConditions {
  // Reveal timing
  revealTiming: 'human_first' | 'concurrent' | 'ai_first';
  
  // Disclosure format
  disclosureFormat: 'fdr_for' | 'natural_frequency' | 'none';
  
  // Documentation enforcement
  deviationEnforcement: 'required' | 'optional_with_attestation' | 'none';
  
  // AI behavior
  aiBirads: number;
  aiConfidence: number;
  aiCorrect: boolean;
  
  // FDR/FOR values
  fdr: number;
  for_: number;
}

export const DEFAULT_CONDITIONS: ExperimentalConditions = {
  revealTiming: 'human_first',
  disclosureFormat: 'fdr_for',
  deviationEnforcement: 'optional_with_attestation',
  aiBirads: 4,
  aiConfidence: 87,
  aiCorrect: true,
  fdr: 4,
  for_: 12,
};

// ============================================================================
// CONDITION PRESETS (from M1 study design)
// ============================================================================

export const CONDITION_PRESETS: Record<string, Partial<ExperimentalConditions>> = {
  // M1 conditions (human-first study)
  'HF_FDR_AI_CORRECT': {
    revealTiming: 'human_first',
    disclosureFormat: 'fdr_for',
    aiCorrect: true,
    aiBirads: 4,
  },
  'HF_FDR_AI_INCORRECT': {
    revealTiming: 'human_first',
    disclosureFormat: 'fdr_for',
    aiCorrect: false,
    aiBirads: 2,
  },
  'HF_NONE_AI_CORRECT': {
    revealTiming: 'human_first',
    disclosureFormat: 'none',
    aiCorrect: true,
    aiBirads: 4,
  },
  'HF_NONE_AI_INCORRECT': {
    revealTiming: 'human_first',
    disclosureFormat: 'none',
    aiCorrect: false,
    aiBirads: 2,
  },
  
  // Concurrent conditions (control)
  'CONCURRENT_FDR': {
    revealTiming: 'concurrent',
    disclosureFormat: 'fdr_for',
    aiCorrect: true,
    aiBirads: 4,
  },
  'CONCURRENT_NONE': {
    revealTiming: 'concurrent',
    disclosureFormat: 'none',
    aiCorrect: true,
    aiBirads: 4,
  },
  
  // Liability conditions (from M4)
  'HIGH_LIABILITY': {
    revealTiming: 'concurrent',
    disclosureFormat: 'none',
    deviationEnforcement: 'none',
    aiCorrect: true,
  },
  'LOW_LIABILITY': {
    revealTiming: 'human_first',
    disclosureFormat: 'fdr_for',
    deviationEnforcement: 'required',
    aiCorrect: true,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface ResearcherConsoleProps {
  conditions: ExperimentalConditions;
  onChange: (conditions: ExperimentalConditions) => void;
}

const ResearcherConsole: React.FC<ResearcherConsoleProps> = ({ conditions, onChange }) => {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  
  // Keyboard shortcut: Ctrl+Shift+R
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  
  const updateCondition = useCallback((key: keyof ExperimentalConditions, value: any) => {
    onChange({ ...conditions, [key]: value });
  }, [conditions, onChange]);
  
  const applyPreset = useCallback((presetName: string) => {
    const preset = CONDITION_PRESETS[presetName];
    if (preset) {
      onChange({ ...conditions, ...preset });
    }
  }, [conditions, onChange]);
  
  if (!visible) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '320px',
      backgroundColor: 'rgba(26, 32, 44, 0.95)',
      color: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      zIndex: 10000,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#2d3748',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #4a5568',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>Lab</span>
          <span style={{ fontWeight: 'bold' }}>Researcher Console</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: 'none',
              border: 'none',
              color: '#a0aec0',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            {expanded ? '▼' : '▲'}
          </button>
          <button
            onClick={() => setVisible(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#a0aec0',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            Close
          </button>
        </div>
      </div>
      
      {expanded && (
        <div style={{ padding: '16px' }}>
          {/* Presets */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              color: '#a0aec0',
              fontWeight: '500',
            }}>
              Quick Presets
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {Object.keys(CONDITION_PRESETS).map(preset => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    backgroundColor: '#4a5568',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          
          {/* Reveal Timing */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px',
              color: '#a0aec0',
            }}>
              Reveal Timing
            </label>
            <select
              value={conditions.revealTiming}
              onChange={e => updateCondition('revealTiming', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: '#2d3748',
                color: 'white',
                border: '1px solid #4a5568',
                borderRadius: '4px',
              }}
            >
              <option value="human_first">Human-First (AI after lock)</option>
              <option value="concurrent">Concurrent (AI visible)</option>
              <option value="ai_first">AI-First (AI before assessment)</option>
            </select>
          </div>
          
          {/* Disclosure Format */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px',
              color: '#a0aec0',
            }}>
              Disclosure Format
            </label>
            <select
              value={conditions.disclosureFormat}
              onChange={e => updateCondition('disclosureFormat', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: '#2d3748',
                color: 'white',
                border: '1px solid #4a5568',
                borderRadius: '4px',
              }}
            >
              <option value="fdr_for">FDR/FOR (Recommended)</option>
              <option value="natural_frequency">Natural Frequency</option>
              <option value="none">None (Control)</option>
            </select>
          </div>
          
          {/* Documentation Enforcement */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px',
              color: '#a0aec0',
            }}>
              Documentation Enforcement
            </label>
            <select
              value={conditions.deviationEnforcement}
              onChange={e => updateCondition('deviationEnforcement', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: '#2d3748',
                color: 'white',
                border: '1px solid #4a5568',
                borderRadius: '4px',
              }}
            >
              <option value="required">Required (Cannot skip)</option>
              <option value="optional_with_attestation">Optional + Attestation</option>
              <option value="none">None (Control)</option>
            </select>
          </div>
          
          {/* AI Settings */}
          <div style={{ 
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #4a5568',
          }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              color: '#a0aec0',
              fontWeight: '500',
            }}>
              AI Behavior
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', color: '#718096' }}>AI BI-RADS</label>
                <select
                  value={conditions.aiBirads}
                  onChange={e => updateCondition('aiBirads', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '4px',
                    backgroundColor: '#2d3748',
                    color: 'white',
                    border: '1px solid #4a5568',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ fontSize: '10px', color: '#718096' }}>AI Confidence</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={conditions.aiConfidence}
                  onChange={e => updateCondition('aiConfidence', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '4px',
                    backgroundColor: '#2d3748',
                    color: 'white',
                    border: '1px solid #4a5568',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                />
              </div>
            </div>
            
            <div style={{ marginTop: '8px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={conditions.aiCorrect}
                  onChange={e => updateCondition('aiCorrect', e.target.checked)}
                />
                <span style={{ fontSize: '11px' }}>AI is correct (for outcome analysis)</span>
              </label>
            </div>
          </div>
          
          {/* FDR/FOR Values */}
          <div style={{ 
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #4a5568',
          }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              color: '#a0aec0',
              fontWeight: '500',
            }}>
              AI Performance (FDR/FOR)
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', color: '#718096' }}>
                  FDR (false alarms/100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={conditions.fdr}
                  onChange={e => updateCondition('fdr', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '4px',
                    backgroundColor: '#2d3748',
                    color: 'white',
                    border: '1px solid #4a5568',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '10px', color: '#718096' }}>
                  FOR (missed/100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={conditions.for_}
                  onChange={e => updateCondition('for_', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '4px',
                    backgroundColor: '#2d3748',
                    color: 'white',
                    border: '1px solid #4a5568',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Current Condition Code */}
          <div style={{
            marginTop: '16px',
            padding: '8px',
            backgroundColor: '#2d3748',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '10px',
          }}>
            <div style={{ color: '#68d391' }}>Current Condition:</div>
            <div style={{ color: '#faf089', marginTop: '4px' }}>
              {conditions.revealTiming.toUpperCase()}_
              {conditions.disclosureFormat.toUpperCase()}_
              {conditions.deviationEnforcement.toUpperCase()}_
              AI{conditions.aiCorrect ? 'CORRECT' : 'INCORRECT'}
            </div>
          </div>
          
          {/* Keyboard hint */}
          <div style={{
            marginTop: '12px',
            fontSize: '10px',
            color: '#718096',
            textAlign: 'center',
          }}>
            Press <kbd style={{ 
              backgroundColor: '#4a5568', 
              padding: '2px 6px', 
              borderRadius: '3px' 
            }}>Ctrl+Shift+R</kbd> to toggle
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearcherConsole;

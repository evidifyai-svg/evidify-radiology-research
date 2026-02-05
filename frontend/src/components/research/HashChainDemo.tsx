/**
 * HashChainDemo.tsx
 *
 * Standalone hash chain visualization for the StudySelector.
 * Shows how cryptographic hash chaining proves documentation sequence integrity.
 * All styles are inline — no Tailwind.
 */

import React, { useState, useMemo } from 'react';
import type { TimelineEvent } from './legal/ExpertWitnessExport';

// ============================================================================
// TYPES
// ============================================================================

export interface HashChainDemoProps {
  timeline: TimelineEvent[];
  chainValid: boolean;
  sessionId?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const HashChainDemo: React.FC<HashChainDemoProps> = ({ timeline, chainValid, sessionId }) => {
  const [showTamperDemo, setShowTamperDemo] = useState(false);

  // Filter to key events + SESSION_START + final event, deduplicated
  const displayEvents = useMemo(() => {
    const lastIdx = timeline.length - 1;
    const seen = new Set<number>();
    return timeline.filter((e, i) => {
      if (!(e.isKeyEvent || e.eventType === 'SESSION_START' || i === lastIdx)) return false;
      if (seen.has(e.sequenceNumber)) return false;
      seen.add(e.sequenceNumber);
      return true;
    });
  }, [timeline]);

  if (displayEvents.length === 0) return null;

  return (
    <div style={{ padding: '32px 40px', backgroundColor: '#0f172a', minHeight: '100%' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: '#f8fafc', fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Hash Chain Verification
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '6px 0 0 0' }}>
            Cryptographic proof of documentation sequence integrity
          </p>
          {sessionId && (
            <span style={{
              display: 'inline-block',
              marginTop: '12px',
              padding: '4px 12px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#94a3b8',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            }}>
              {sessionId}
            </span>
          )}
        </div>

        {/* Section 1: Vertical Chain Diagram */}
        <div style={{
          backgroundColor: '#0a0f1a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '28px',
          marginBottom: '24px',
        }}>
          <h3 style={{
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            margin: '0 0 24px 0',
          }}>
            Sequence Integrity Walkthrough
          </h3>

          <div style={{ marginBottom: '8px' }}>
            {displayEvents.map((event, idx) => (
              <React.Fragment key={event.sequenceNumber}>
                {/* Event Node */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  {/* Number circle */}
                  <div style={{ flexShrink: 0, width: '36px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                      width: event.isKeyEvent ? '36px' : '28px',
                      height: event.isKeyEvent ? '36px' : '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: event.isKeyEvent ? '14px' : '12px',
                      backgroundColor: event.isKeyEvent ? '#8b5cf6' : '#475569',
                      color: event.isKeyEvent ? '#ffffff' : '#cbd5e1',
                    }}>
                      {idx + 1}
                    </div>
                  </div>
                  {/* Event details */}
                  <div style={{ flex: 1, paddingTop: '2px' }}>
                    <div style={{
                      fontWeight: event.isKeyEvent ? 600 : 400,
                      color: event.isKeyEvent ? '#f1f5f9' : '#94a3b8',
                      fontSize: event.isKeyEvent ? '14px' : '13px',
                    }}>
                      {event.eventLabel}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '3px' }}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                    <div style={{
                      color: '#475569',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                      marginTop: '2px',
                    }}>
                      {event.hash.slice(0, 8)}…
                    </div>
                  </div>
                </div>

                {/* Chain Link Indicator */}
                {idx < displayEvents.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '6px 0' }}>
                    <div style={{ flexShrink: 0, width: '36px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{
                        position: 'relative' as const,
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {/* Vertical line */}
                        <div style={{
                          position: 'absolute' as const,
                          width: '1px',
                          height: '100%',
                          backgroundColor: chainValid ? '#334155' : 'rgba(239, 68, 68, 0.3)',
                        }} />
                        {/* Status circle */}
                        <div style={{
                          position: 'relative' as const,
                          zIndex: 1,
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          backgroundColor: chainValid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: chainValid ? '#4ade80' : '#f87171',
                        }}>
                          {chainValid ? '✓' : '✗'}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: chainValid ? 'rgba(74, 222, 128, 0.8)' : 'rgba(248, 113, 113, 0.8)',
                    }}>
                      {chainValid ? 'Hash incorporates previous step' : 'Chain broken — tampering detected'}
                    </span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Section 2: Plain-Language Explanation */}
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h4 style={{ color: '#60a5fa', fontSize: '14px', fontWeight: 700, margin: '0 0 16px 0' }}>
            How This Proves the Sequence
          </h4>
          <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.7' }}>
            <p style={{ margin: '0 0 12px 0' }}>
              Each step in this documentation chain incorporates a mathematical fingerprint (hash) of
              the previous step. This means:
            </p>
            <div style={{ marginLeft: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                <span style={{ color: '#60a5fa', marginTop: '2px', flexShrink: 0 }}>•</span>
                <span>
                  Step 2's record contains proof that Step 1 existed in its exact form before Step 2 was created
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                <span style={{ color: '#60a5fa', marginTop: '2px', flexShrink: 0 }}>•</span>
                <span>
                  If anyone altered Step 1 after the fact, Step 2's proof would no longer match — the tampering would be automatically detectable
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                <span style={{ color: '#60a5fa', marginTop: '2px', flexShrink: 0 }}>•</span>
                <span>
                  An independent verification tool can reconstruct this chain from raw data and confirm every link is intact
                </span>
              </div>
            </div>
            <p style={{
              margin: '16px 0 0 0',
              paddingTop: '12px',
              borderTop: '1px solid rgba(59, 130, 246, 0.1)',
              color: '#94a3b8',
              fontSize: '12px',
            }}>
              This is the same principle used in blockchain technology and is recognized as
              self-authenticating evidence under Federal Rules of Evidence 902(13)/(14) and
              Vermont statute 12 V.S.A. §1913.
            </p>
          </div>
        </div>

        {/* Section 3: Tamper Detection Demo */}
        <div style={{
          border: '1px solid #334155',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setShowTamperDemo(prev => !prev)}
            style={{
              width: '100%',
              padding: '14px 20px',
              textAlign: 'left' as const,
              fontSize: '14px',
              fontWeight: 600,
              color: '#e2e8f0',
              backgroundColor: showTamperDemo ? '#1e293b' : 'rgba(30, 41, 59, 0.5)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>🔍 See What Tampering Looks Like</span>
            <span style={{
              color: '#64748b',
              fontSize: '16px',
              transform: showTamperDemo ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>
              ▾
            </span>
          </button>

          {showTamperDemo && (
            <div style={{ padding: '20px 24px', borderTop: '1px solid #334155' }}>
              <div style={{ marginBottom: '20px' }}>
                {displayEvents.slice(0, Math.min(displayEvents.length, 4)).map((event, idx) => (
                  <React.Fragment key={`tamper-${event.sequenceNumber}`}>
                    {/* Tampered node */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{ flexShrink: 0, width: '36px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '14px',
                          backgroundColor: idx === 0 ? '#ef4444' : '#475569',
                          color: idx === 0 ? '#ffffff' : '#64748b',
                        }}>
                          {idx + 1}
                        </div>
                      </div>
                      <div style={{ flex: 1, paddingTop: '2px' }}>
                        <div style={{
                          fontWeight: 600,
                          color: idx === 0 ? '#f87171' : '#64748b',
                          fontSize: '14px',
                        }}>
                          {event.eventLabel}
                          {idx === 0 && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '10px',
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              color: '#f87171',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.03em',
                            }}>
                              ALTERED
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                          marginTop: '4px',
                        }}>
                          {idx === 0 ? (
                            <span style={{ color: '#f87171' }}>
                              <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>
                                {event.hash.slice(0, 8)}
                              </span>
                              {' '}
                              <span>????????</span>
                            </span>
                          ) : (
                            <span style={{ color: '#475569' }}>{event.hash.slice(0, 8)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Broken chain link */}
                    {idx < Math.min(displayEvents.length, 4) - 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '6px 0' }}>
                        <div style={{ flexShrink: 0, width: '36px', display: 'flex', justifyContent: 'center' }}>
                          <div style={{
                            position: 'relative' as const,
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <div style={{
                              position: 'absolute' as const,
                              width: '1px',
                              height: '100%',
                              backgroundColor: 'rgba(239, 68, 68, 0.3)',
                            }} />
                            <div style={{
                              position: 'relative' as const,
                              zIndex: 1,
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              color: '#f87171',
                            }}>
                              ✗
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'rgba(248, 113, 113, 0.7)' }}>
                          Chain broken — hash mismatch detected
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Explanation */}
              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#cbd5e1',
                lineHeight: '1.6',
              }}>
                If the Step 1 assessment were altered after the fact, every subsequent hash link
                would fail verification. The alteration is not just detectable — it is precisely
                locatable to the modified step.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default HashChainDemo;

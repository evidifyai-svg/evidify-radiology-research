import React from 'react';
import type { TimelineEvent } from './legal/ExpertWitnessExport';

export interface HashChainDemoProps {
  timeline: TimelineEvent[];
  chainValid: boolean;
  sessionId?: string;
}

const HashChainDemo: React.FC<HashChainDemoProps> = ({ timeline, chainValid, sessionId }) => {
  const [showTamperDemo, setShowTamperDemo] = React.useState(false);

  // Filter to key events + SESSION_START + final event, deduplicated
  const lastIdx = timeline.length - 1;
  const seen = new Set<number>();
  const displayEvents = timeline.filter((e, i) => {
    if (!(e.isKeyEvent || e.eventType === 'SESSION_START' || i === lastIdx)) return false;
    if (seen.has(e.sequenceNumber)) return false;
    seen.add(e.sequenceNumber);
    return true;
  });

  if (displayEvents.length === 0) return null;

  return (
    <div style={{ padding: '32px 40px', backgroundColor: '#0f172a' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <h2 style={{ color: '#f8fafc', fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0', fontFamily: 'system-ui, sans-serif' }}>
          Hash Chain Verification
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0', fontFamily: 'system-ui, sans-serif' }}>
          Cryptographic proof of documentation sequence integrity
        </p>
        {sessionId && (
          <div style={{
            display: 'inline-block',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '4px 10px',
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            fontSize: '11px',
            color: '#94a3b8',
            marginBottom: '24px',
          }}>
            Session: {sessionId}
          </div>
        )}

        {/* SECTION 1 — Vertical Chain Diagram */}
        <div style={{ padding: '24px 0', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
          <h3 style={{
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            marginBottom: '24px',
            marginTop: 0,
            fontFamily: 'system-ui, sans-serif',
          }}>
            Temporal Proof Walkthrough
          </h3>

          <div style={{ marginBottom: '32px' }}>
            {displayEvents.map((event, idx) => (
              <React.Fragment key={event.sequenceNumber}>
                {/* Event Node */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flexShrink: 0, width: '32px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      ...(event.isKeyEvent
                        ? { width: '32px', height: '32px', backgroundColor: '#8b5cf6', color: '#ffffff', fontSize: '14px' }
                        : { width: '24px', height: '24px', backgroundColor: '#475569', color: '#cbd5e1', fontSize: '12px' }),
                    }}>
                      {idx + 1}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: event.isKeyEvent ? 600 : 400,
                      color: event.isKeyEvent ? '#f1f5f9' : '#94a3b8',
                      fontSize: event.isKeyEvent ? '14px' : '13px',
                      fontFamily: 'system-ui, sans-serif',
                    }}>
                      {event.eventLabel}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px', fontFamily: 'system-ui, sans-serif' }}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                    <div style={{
                      color: '#475569',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, Consolas, monospace',
                      marginTop: '2px',
                    }}>
                      {event.hash.slice(0, 8)}
                    </div>
                  </div>
                </div>

                {/* Chain Link Indicator */}
                {idx < displayEvents.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                    <div style={{ flexShrink: 0, width: '32px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ position: 'relative', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', width: '1px', height: '100%', backgroundColor: '#334155' }} />
                        <div style={{
                          position: 'relative',
                          zIndex: 1,
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          ...(chainValid
                            ? { backgroundColor: 'rgba(34,197,94,0.2)', color: '#4ade80' }
                            : { backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171' }),
                        }}>
                          {chainValid ? '\u2713' : '\u2717'}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '12px',
                      fontFamily: 'system-ui, sans-serif',
                      ...(chainValid
                        ? { color: 'rgba(74,222,128,0.8)' }
                        : { color: 'rgba(248,113,113,0.8)' }),
                    }}>
                      {chainValid
                        ? 'Hash incorporates previous step'
                        : 'Chain broken \u2014 tampering detected'}
                    </span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* SECTION 2 — Plain-Language Explanation */}
        <div style={{
          backgroundColor: 'rgba(59,130,246,0.05)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '24px',
          marginBottom: '24px',
        }}>
          <h4 style={{ color: '#60a5fa', fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', fontFamily: 'system-ui, sans-serif' }}>
            How This Proves the Sequence
          </h4>
          <div style={{ fontSize: '14px', color: '#cbd5e1', fontFamily: 'system-ui, sans-serif' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              Each step in this documentation chain incorporates a mathematical fingerprint (hash) of
              the previous step. This means:
            </p>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: '0', listStyle: 'none' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#60a5fa', marginTop: '2px' }}>{'\u2022'}</span>
                <span>
                  {"Step 2\u2019s record contains proof that Step 1 existed in its exact form before Step 2 was created"}
                </span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#60a5fa', marginTop: '2px' }}>{'\u2022'}</span>
                <span>
                  {"If anyone altered Step 1 after the fact, Step 2\u2019s proof would no longer match \u2014 the tampering would be automatically detectable"}
                </span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#60a5fa', marginTop: '2px' }}>{'\u2022'}</span>
                <span>
                  An independent verification tool can reconstruct this chain from raw data and confirm every link is intact
                </span>
              </li>
            </ul>
            <p style={{
              color: '#94a3b8',
              fontSize: '12px',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(59,130,246,0.1)',
              marginBottom: 0,
            }}>
              This is the same principle used in blockchain technology and is recognized as
              self-authenticating evidence under Federal Rules of Evidence 902(13)/(14) and
              Vermont statute 12 V.S.A. {'\u00A7'}1913.
            </p>
          </div>
        </div>

        {/* SECTION 3 — Tamper Detection Demo */}
        <div style={{ border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
          <button
            onClick={() => setShowTamperDemo(prev => !prev)}
            style={{
              width: '100%',
              padding: '12px 16px',
              textAlign: 'left' as const,
              fontSize: '14px',
              fontWeight: 500,
              color: '#cbd5e1',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <span>See What Tampering Looks Like</span>
            <span style={{ color: '#64748b', fontSize: '12px' }}>{showTamperDemo ? '\u25B2' : '\u25BC'}</span>
          </button>
          {showTamperDemo && (
            <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #334155' }}>
              <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                {displayEvents.slice(0, Math.min(displayEvents.length, 4)).map((event, idx) => (
                  <React.Fragment key={`tamper-${event.sequenceNumber}`}>
                    {/* Tampered node */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flexShrink: 0, width: '32px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '14px',
                          ...(idx === 0
                            ? { backgroundColor: '#ef4444', color: '#ffffff' }
                            : { backgroundColor: '#334155', color: '#64748b' }),
                        }}>
                          {idx + 1}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 500,
                          color: idx === 0 ? '#f87171' : '#64748b',
                          fontSize: '14px',
                          fontFamily: 'system-ui, sans-serif',
                        }}>
                          {event.eventLabel}
                          {idx === 0 && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '11px',
                              backgroundColor: 'rgba(239,68,68,0.2)',
                              color: '#f87171',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}>
                              ALTERED
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, Consolas, monospace',
                          marginTop: '2px',
                        }}>
                          {idx === 0 ? (
                            <span style={{ color: '#f87171' }}>
                              <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>{event.hash.slice(0, 8)}</span>
                              {' '}
                              <span>{'????????'}</span>
                            </span>
                          ) : (
                            <span style={{ color: '#475569' }}>{event.hash.slice(0, 8)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Broken chain link */}
                    {idx < Math.min(displayEvents.length, 4) - 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                        <div style={{ flexShrink: 0, width: '32px', display: 'flex', justifyContent: 'center' }}>
                          <div style={{ position: 'relative', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ position: 'absolute', width: '1px', height: '100%', backgroundColor: 'rgba(239,68,68,0.3)' }} />
                            <div style={{
                              position: 'relative',
                              zIndex: 1,
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              backgroundColor: 'rgba(239,68,68,0.2)',
                              color: '#f87171',
                            }}>
                              {'\u2717'}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', color: 'rgba(248,113,113,0.7)', fontFamily: 'system-ui, sans-serif' }}>
                          Chain broken {'\u2014'} hash mismatch detected
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#cbd5e1',
                fontFamily: 'system-ui, sans-serif',
              }}>
                If the Step 1 assessment were altered after the fact, every subsequent hash link
                would fail verification. The alteration is not just detectable {'\u2014'} it is precisely
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

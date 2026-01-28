/**
 * SimpleDemoFlow_Hardened.tsx
 * 
 * BRPLL Demo Hardening - P0 Requirements
 * 
 * Fixes from Grayson feedback:
 * 1. FDR/FOR disclosure (not FNR)
 * 2. Deviation gate: enforce documentation OR explicit attestation
 * 3. Correct ADDA display with explicit labeling
 * 4. Complete event logging for all required events
 * 5. Export generates verifiable packet
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import ExportPackBuilder, { TrialEvent, EventType } from '../lib/ExportPack';

// ============================================================================
// TYPES
// ============================================================================

interface DemoState {
  step: 'initial' | 'ai_revealed' | 'deviation' | 'complete';
  
  // Session
  sessionId: string;
  caseId: string;
  condition: string;
  startTime: Date;
  
  // First impression
  initialBirads: number | null;
  initialConfidence: number;
  lockTime: Date | null;
  
  // AI
  aiBirads: number;
  aiConfidence: number;
  aiRevealTime: Date | null;
  
  // Disclosure (P0: FDR/FOR)
  disclosurePresented: boolean;
  fdr: number;  // False Discovery Rate (false alarms per 100)
  for_: number; // False Omission Rate (missed cancers per 100)
  comprehensionResponse: boolean | null;
  
  // Final
  finalBirads: number | null;
  finalConfidence: number;
  submitTime: Date | null;
  
  // Deviation (P0: Enforce or attestation)
  deviationRequired: boolean;
  deviationType: 'toward_ai' | 'away_from_ai' | null;
  deviationText: string;
  deviationSkipped: boolean;
  skipAttestation: string;
  
  // Events
  events: TrialEvent[];
}

// ============================================================================
// EVENT LOGGER
// ============================================================================

const createEvent = (type: EventType, payload: Record<string, unknown>): TrialEvent => ({
  id: crypto.randomUUID(),
  type,
  timestamp: new Date().toISOString(),
  payload,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SimpleDemoFlowHardened: React.FC = () => {
  const [state, setState] = useState<DemoState>({
    step: 'initial',
    sessionId: crypto.randomUUID(),
    caseId: 'BRPLL-DEMO-001',
    condition: 'human_first_fdr_for',
    startTime: new Date(),
    
    initialBirads: null,
    initialConfidence: 70,
    lockTime: null,
    
    aiBirads: 4,
    aiConfidence: 87,
    aiRevealTime: null,
    
    disclosurePresented: false,
    fdr: 4,   // 4 false alarms per 100
    for_: 12, // 12 missed cancers per 100
    comprehensionResponse: null,
    
    finalBirads: null,
    finalConfidence: 70,
    submitTime: null,
    
    deviationRequired: false,
    deviationType: null,
    deviationText: '',
    deviationSkipped: false,
    skipAttestation: '',
    
    events: [],
  });
  
  const [timeOnCase, setTimeOnCase] = useState(0);
  const [showComprehensionCheck, setShowComprehensionCheck] = useState(false);
  const [exportPack, setExportPack] = useState<ExportPackBuilder | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [verifierResult, setVerifierResult] = useState<'PASS' | 'FAIL' | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeOnCase(t => t + 0.1);
    }, 100);
    
    // Log SESSION_STARTED
    const sessionEvent = createEvent('SESSION_STARTED', {
      participantId: 'demo-user',
      sessionId: state.sessionId,
      protocolVersion: '1.0.0',
    });
    
    const caseEvent = createEvent('CASE_LOADED', {
      caseId: state.caseId,
      condition: state.condition,
      conditionCode: 'HF_FDR_FOR',
    });
    
    setState(s => ({
      ...s,
      events: [...s.events, sessionEvent, caseEvent],
    }));
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  
  // ============================================================================
  // STEP 1: Lock First Impression
  // ============================================================================
  
  const lockFirstImpression = useCallback(() => {
    if (state.initialBirads === null) return;
    
    const lockTime = new Date();
    const preAiTimeMs = Math.round(timeOnCase * 1000);
    
    const event = createEvent('FIRST_IMPRESSION_LOCKED', {
      birads: state.initialBirads,
      confidence: state.initialConfidence,
      timeOnCaseMs: preAiTimeMs,
    });
    
    setState(s => ({
      ...s,
      step: 'ai_revealed',
      lockTime,
      events: [...s.events, event],
    }));
    
    // After a brief delay, reveal AI
    setTimeout(() => {
      const aiEvent = createEvent('AI_REVEALED', {
        aiBirads: state.aiBirads,
        aiConfidence: state.aiConfidence,
        revealTiming: 'human_first',
      });
      
      // P0: Log DISCLOSURE_PRESENTED with FDR/FOR
      const disclosureEvent = createEvent('DISCLOSURE_PRESENTED', {
        format: 'fdr_for',
        fdr: state.fdr,
        for: state.for_,
      });
      
      setState(s => ({
        ...s,
        aiRevealTime: new Date(),
        disclosurePresented: true,
        events: [...s.events, aiEvent, disclosureEvent],
      }));
      
      // Show comprehension check after disclosure
      setShowComprehensionCheck(true);
    }, 500);
  }, [state.initialBirads, state.initialConfidence, state.aiBirads, state.aiConfidence, state.fdr, state.for_, timeOnCase]);
  
  // ============================================================================
  // Comprehension Check (P0)
  // ============================================================================
  
  const handleComprehensionResponse = useCallback((response: 'fdr' | 'for') => {
    // Question: "Which is more likely: a false alarm or a missed cancer?"
    // Correct answer depends on FDR vs FOR values
    const correct = state.for_ > state.fdr ? (response === 'for') : (response === 'fdr');
    
    const event = createEvent('DISCLOSURE_COMPREHENSION_RESPONSE', {
      questionId: 'fdr_for_comparison',
      response,
      correct,
      responseTimeMs: Math.round(timeOnCase * 1000),
    });
    
    setState(s => ({
      ...s,
      comprehensionResponse: correct,
      events: [...s.events, event],
    }));
    
    setShowComprehensionCheck(false);
  }, [state.fdr, state.for_, timeOnCase]);
  
  // ============================================================================
  // STEP 2: Final Assessment with Deviation Gate
  // ============================================================================
  
  const submitFinalAssessment = useCallback(() => {
    if (state.finalBirads === null) return;
    
    // Determine if deviation documentation is needed
    const changedFromInitial = state.initialBirads !== state.finalBirads;
    const movedTowardAI = state.finalBirads === state.aiBirads;
    const movedAwayFromAI = !movedTowardAI && changedFromInitial;
    
    // P0: Determine deviation requirement
    // If user changed their assessment, they need to document OR attest
    if (changedFromInitial) {
      const deviationType = movedTowardAI ? 'toward_ai' : 'away_from_ai';
      
      const startEvent = createEvent('DEVIATION_STARTED', {
        deviationType,
        initialBirads: state.initialBirads,
        aiBirads: state.aiBirads,
      });
      
      setState(s => ({
        ...s,
        step: 'deviation',
        deviationRequired: true,
        deviationType,
        events: [...s.events, startEvent],
      }));
    } else {
      // No change, go straight to complete
      finishAssessment(false);
    }
  }, [state.initialBirads, state.finalBirads, state.aiBirads]);
  
  // ============================================================================
  // STEP 3: Deviation Documentation (P0: Enforce or Attestation)
  // ============================================================================
  
  const submitDeviation = useCallback(() => {
    if (state.deviationText.trim().length < 10) {
      alert('Please provide a clinical rationale (at least 10 characters)');
      return;
    }
    
    const event = createEvent('DEVIATION_SUBMITTED', {
      deviationText: state.deviationText,
      clinicalRationale: state.deviationText,
      wordCount: state.deviationText.split(/\s+/).length,
      deviationType: state.deviationType,
    });
    
    setState(s => ({
      ...s,
      events: [...s.events, event],
    }));
    
    finishAssessment(true);
  }, [state.deviationText, state.deviationType]);
  
  const skipDeviation = useCallback(() => {
    // P0: Require explicit attestation to skip
    const attestation = `I acknowledge that I am proceeding without documenting my rationale for changing from BI-RADS ${state.initialBirads} to BI-RADS ${state.finalBirads}. Timestamp: ${new Date().toISOString()}`;
    
    const event = createEvent('DEVIATION_SKIPPED', {
      attestation,
      attestationTimestamp: new Date().toISOString(),
      skipReason: 'user_choice',
    });
    
    setState(s => ({
      ...s,
      deviationSkipped: true,
      skipAttestation: attestation,
      events: [...s.events, event],
    }));
    
    finishAssessment(false);
  }, [state.initialBirads, state.finalBirads]);
  
  // ============================================================================
  // Finish and Generate Export
  // ============================================================================
  
  const finishAssessment = useCallback((hasDeviation: boolean) => {
    const submitTime = new Date();
    const totalTimeMs = Math.round(timeOnCase * 1000);
    
    const event = createEvent('FINAL_ASSESSMENT', {
      birads: state.finalBirads,
      confidence: state.finalConfidence,
      timeOnCaseMs: totalTimeMs,
      changedFromInitial: state.initialBirads !== state.finalBirads,
    });
    
    setState(s => ({
      ...s,
      step: 'complete',
      submitTime,
      events: [...s.events, event],
    }));
    
    // Clear timer
    if (timerRef.current) clearInterval(timerRef.current);
  }, [state.finalBirads, state.finalConfidence, state.initialBirads, timeOnCase]);
  
  // ============================================================================
  // Generate Export Pack
  // ============================================================================
  const generateExport = useCallback(async () => {
    // Build export using src/lib/ExportPack.ts (no builder.setManifest / builder.build)
    const builder = new ExportPackBuilder({
      sessionId: state.sessionId,
      participantId: 'demo-user',
      condition: state.condition,
      protocol: {
        revealTiming: 'human_first',
        disclosureFormat: 'fdr_for',
        deviationEnforcement: 'optional_with_attestation',
      },
      disclosureProvenance: {
        fdrValue: state.fdr,
        forValue: state.for_,
        source: 'demo_ui',
      },
      randomization: {
        seed: state.sessionId,
        assignmentMethod: 'live_rng',
      },
    });

    // Re-add events into the builder chain
    // NOTE: This will re-timestamp events (OK for demo); we can preserve timestamps later if needed.
    for (const e of state.events) {
      await builder.addEvent(e.type, (e.payload ?? {}) as any);
    }

    const pack = await builder.generateExportPackage();

    // Assemble ZIP here
    const zip = new JSZip();

    zip.file('_DEBUG_SENTINEL.txt', 'generateExport_v3_hit');

    zip.file('trial_manifest.json', JSON.stringify(pack.manifest, null, 2));
    zip.file('export_manifest.json', pack.exportManifestJson);
    zip.file('events.jsonl', pack.eventsJsonl);
    zip.file('ledger.json', pack.ledgerJson);
    zip.file('verifier_output.json', JSON.stringify(pack.verifierOutput, null, 2));
    zip.file('derived_metrics.csv', pack.metricsCSV);
    zip.file('codebook.md', pack.codebook);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);

    setExportPack(builder);
    setExportUrl(url);
    setVerifierResult(pack.verifierOutput.result);
  }, [state]);
  
  // ============================================================================
  // ADDA Calculation (P0: Correct labeling)
  // ============================================================================
  
  const calculateADDA = useCallback(() => {
    if (state.initialBirads === null || state.finalBirads === null) return null;
    
    const changeOccurred = state.initialBirads !== state.finalBirads;
    const aiConsistentChange = state.finalBirads === state.aiBirads && changeOccurred;
    const inDenominator = state.initialBirads !== state.aiBirads;
    
    // ADDA is only calculated when in denominator
    if (!inDenominator) {
      return {
        adda: null,
        label: 'Not in ADDA denominator',
        explanation: 'Initial assessment agreed with AI',
        changeOccurred,
        aiConsistentChange,
        inDenominator: false,
      };
    }
    
    const adda = aiConsistentChange;
    
    return {
      adda,
      label: adda ? 'ADDA = TRUE' : 'ADDA = FALSE',
      explanation: adda 
        ? 'Changed TOWARD AI suggestion'
        : changeOccurred 
          ? 'Changed AWAY FROM AI suggestion'
          : 'No change (maintained initial)',
      changeOccurred,
      aiConsistentChange,
      inDenominator: true,
    };
  }, [state.initialBirads, state.finalBirads, state.aiBirads]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif', 
      maxWidth: '900px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%)',
        color: 'white',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
      }}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>Evidify Demo — SENTINEL</h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>
          Human-First AI Workflow with FDR/FOR Disclosure
        </p>
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginTop: '16px',
          fontSize: '14px',
          opacity: 0.8,
        }}>
          <span>Case: {state.caseId}</span>
          <span>Condition: {state.condition}</span>
          <span>Time: {timeOnCase.toFixed(1)}s</span>
        </div>
      </div>
      
      {/* Progress Indicator */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '8px', 
        marginBottom: '24px' 
      }}>
        {['initial', 'ai_revealed', 'deviation', 'complete'].map((step, i) => (
          <div key={step} style={{
            width: '120px',
            padding: '8px',
            textAlign: 'center',
            backgroundColor: state.step === step ? '#3182ce' : 
              ['initial', 'ai_revealed', 'deviation', 'complete'].indexOf(state.step) > i ? '#38a169' : '#e2e8f0',
            color: state.step === step || ['initial', 'ai_revealed', 'deviation', 'complete'].indexOf(state.step) > i ? 'white' : '#718096',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: state.step === step ? 'bold' : 'normal',
          }}>
            {i + 1}. {step.charAt(0).toUpperCase() + step.slice(1).replace('_', ' ')}
          </div>
        ))}
      </div>
      
      {/* STEP 1: Initial Assessment */}
      {state.step === 'initial' && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '24px', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ marginTop: 0 }}>Step 1: Your Initial Assessment</h2>
          <p style={{ color: '#666' }}>
            Review the mammography image and provide your initial BI-RADS assessment.
            AI suggestion will be revealed AFTER you lock your impression.
          </p>
          
          {/* Simulated image placeholder */}
          <div style={{
            backgroundColor: '#1a202c',
            height: '200px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#718096',
            marginBottom: '24px',
          }}>
            [Mammography Image Placeholder]
          </div>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                BI-RADS Category
              </label>
              <select
                value={state.initialBirads ?? ''}
                onChange={e => setState(s => ({ ...s, initialBirads: Number(e.target.value) }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                }}
              >
                <option value="">Select BI-RADS...</option>
                {[0, 1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>BI-RADS {n}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                Confidence: {state.initialConfidence}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={state.initialConfidence}
                onChange={e => setState(s => ({ ...s, initialConfidence: Number(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>
            
            <button
              onClick={lockFirstImpression}
              disabled={state.initialBirads === null}
              style={{
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: state.initialBirads !== null ? '#3182ce' : '#cbd5e0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: state.initialBirads !== null ? 'pointer' : 'not-allowed',
              }}
            >
               Lock First Impression
            </button>
          </div>
        </div>
      )}
      
      {/* STEP 2: AI Revealed with FDR/FOR Disclosure */}
      {state.step === 'ai_revealed' && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '24px', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ marginTop: 0 }}>Step 2: AI Suggestion Revealed</h2>
          
          {/* First Impression Summary */}
          <div style={{
            backgroundColor: '#edf2f7',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <strong>Your First Impression (LOCKED):</strong>
            <div>BI-RADS {state.initialBirads} at {state.initialConfidence}% confidence</div>
            <div style={{ fontSize: '12px', color: '#718096' }}>
              Locked after {((state.lockTime!.getTime() - state.startTime.getTime()) / 1000).toFixed(1)}s
            </div>
          </div>
          
          {/* AI Suggestion */}
          <div style={{
            backgroundColor: '#ebf8ff',
            padding: '16px',
            borderRadius: '8px',
            border: '2px solid #3182ce',
            marginBottom: '16px',
          }}>
            <strong> AI Suggestion:</strong>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2b6cb0' }}>
              BI-RADS {state.aiBirads} ({state.aiConfidence}% confidence)
            </div>
            <div style={{ fontSize: '14px', color: '#4a5568', marginTop: '8px' }}>
              "Suspicious mass detected in upper outer quadrant"
            </div>
          </div>
          
          {/* P0: FDR/FOR Disclosure (NOT FNR) */}
          <div style={{
            backgroundColor: '#fffaf0',
            padding: '16px',
            borderRadius: '8px',
            border: '2px solid #ed8936',
            marginBottom: '16px',
          }}>
            <strong> AI Performance Disclosure</strong>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px',
              marginTop: '12px',
            }}>
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#feebc8', 
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '12px', color: '#744210' }}>
                  False Discovery Rate (FDR)
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#c05621' }}>
                  {state.fdr}
                </div>
                <div style={{ fontSize: '12px', color: '#744210' }}>
                  false alarms per 100 "positive" calls
                </div>
              </div>
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#fed7d7', 
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '12px', color: '#742a2a' }}>
                  False Omission Rate (FOR)
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#c53030' }}>
                  {state.for_}
                </div>
                <div style={{ fontSize: '12px', color: '#742a2a' }}>
                  missed cancers per 100 "negative" calls
                </div>
              </div>
            </div>
          </div>
          
          {/* P0: Comprehension Check */}
          {showComprehensionCheck && (
            <div style={{
              backgroundColor: '#f0fff4',
              padding: '16px',
              borderRadius: '8px',
              border: '2px solid #48bb78',
              marginBottom: '16px',
            }}>
              <strong> Comprehension Check</strong>
              <p>Based on this AI's performance, which is more likely?</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleComprehensionResponse('fdr')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#edf2f7',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  A false alarm (AI says positive, but it's benign)
                </button>
                <button
                  onClick={() => handleComprehensionResponse('for')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#edf2f7',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  A missed cancer (AI says negative, but it's malignant)
                </button>
              </div>
            </div>
          )}
          
          {state.comprehensionResponse !== null && (
            <div style={{
              backgroundColor: state.comprehensionResponse ? '#c6f6d5' : '#fed7d7',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              {state.comprehensionResponse 
                ? ' Correct understanding of AI error rates'
                : ' Incorrect - review the FDR/FOR values above'}
            </div>
          )}
          
          {/* Final Assessment */}
          <div style={{ marginTop: '24px' }}>
            <h3>Your Final Assessment</h3>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  Final BI-RADS Category
                </label>
                <select
                  value={state.finalBirads ?? ''}
                  onChange={e => setState(s => ({ ...s, finalBirads: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0',
                  }}
                >
                  <option value="">Select BI-RADS...</option>
                  {[0, 1, 2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>BI-RADS {n}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  Confidence: {state.finalConfidence}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.finalConfidence}
                  onChange={e => setState(s => ({ ...s, finalConfidence: Number(e.target.value) }))}
                  style={{ width: '100%' }}
                />
              </div>
              
              <button
                onClick={submitFinalAssessment}
                disabled={state.finalBirads === null}
                style={{
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: state.finalBirads !== null ? '#38a169' : '#cbd5e0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: state.finalBirads !== null ? 'pointer' : 'not-allowed',
                }}
              >
                Submit Final Assessment
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* STEP 3: Deviation Documentation (P0: Gate) */}
      {state.step === 'deviation' && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '24px', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ marginTop: 0, color: '#c53030' }}>
            Assessment Change Detected
          </h2>
          
          <div style={{
            backgroundColor: '#fff5f5',
            padding: '16px',
            borderRadius: '8px',
            border: '2px solid #fc8181',
            marginBottom: '24px',
          }}>
            <p style={{ margin: 0 }}>
              <strong>You changed from BI-RADS {state.initialBirads} to BI-RADS {state.finalBirads}</strong>
            </p>
            <p style={{ margin: '8px 0 0 0', color: '#742a2a' }}>
              {state.deviationType === 'toward_ai' 
                ? `This moves TOWARD the AI suggestion (BI-RADS ${state.aiBirads})`
                : `This moves AWAY FROM the AI suggestion (BI-RADS ${state.aiBirads})`}
            </p>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
              Clinical Rationale (Required for Audit Trail)
            </label>
            <textarea
              value={state.deviationText}
              onChange={e => setState(s => ({ ...s, deviationText: e.target.value }))}
              placeholder="Explain the clinical reasoning for your assessment change..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '12px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
              {state.deviationText.split(/\s+/).filter(w => w).length} words 
              (minimum 10 characters required)
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={submitDeviation}
              disabled={state.deviationText.trim().length < 10}
              style={{
                flex: 2,
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: state.deviationText.trim().length >= 10 ? '#38a169' : '#cbd5e0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: state.deviationText.trim().length >= 10 ? 'pointer' : 'not-allowed',
              }}
            >
               Submit Documentation
            </button>
            
            {/* P0: Skip requires explicit attestation */}
            <button
              onClick={() => {
                if (confirm(
                  'Are you sure you want to proceed WITHOUT documenting your rationale?\n\n' +
                  'This will be flagged as DEVIATION_SKIPPED in the audit trail.\n\n' +
                  'A plaintiff-side attorney may use this against you.'
                )) {
                  skipDeviation();
                }
              }}
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '14px',
                backgroundColor: '#fff5f5',
                color: '#c53030',
                border: '2px solid #fc8181',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Skip (with attestation)
            </button>
          </div>
          
          <div style={{ 
            marginTop: '16px', 
            fontSize: '12px', 
            color: '#718096',
            backgroundColor: '#f7fafc',
            padding: '12px',
            borderRadius: '8px',
          }}>
            <strong>Note:</strong> Skipping documentation creates a DEVIATION_SKIPPED flag 
            in the export. This may be used as evidence that documentation safeguards 
            were available but not utilized.
          </div>
        </div>
      )}
      
      {/* STEP 4: Complete */}
      {state.step === 'complete' && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '24px', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ marginTop: 0, color: '#38a169' }}> Case Complete</h2>
          
          {/* Summary */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#edf2f7', 
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: '#718096' }}>First Impression</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                BI-RADS {state.initialBirads}
              </div>
              <div style={{ fontSize: '12px' }}>{state.initialConfidence}% conf</div>
            </div>
            
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#ebf8ff', 
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: '#718096' }}>AI Suggestion</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2b6cb0' }}>
                BI-RADS {state.aiBirads}
              </div>
              <div style={{ fontSize: '12px' }}>{state.aiConfidence}% conf</div>
            </div>
            
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#f0fff4', 
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: '#718096' }}>Final Assessment</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#276749' }}>
                BI-RADS {state.finalBirads}
              </div>
              <div style={{ fontSize: '12px' }}>{state.finalConfidence}% conf</div>
            </div>
          </div>
          
          {/* P0: Correct ADDA Display */}
          {(() => {
            const addaResult = calculateADDA();
            if (!addaResult) return null;
            
            return (
              <div style={{
                padding: '16px',
                backgroundColor: addaResult.adda === true ? '#fff5f5' : 
                  addaResult.adda === false ? '#f0fff4' : '#f7fafc',
                borderRadius: '8px',
                border: `2px solid ${addaResult.adda === true ? '#fc8181' : 
                  addaResult.adda === false ? '#68d391' : '#e2e8f0'}`,
                marginBottom: '24px',
              }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  color: addaResult.adda === true ? '#c53030' : 
                    addaResult.adda === false ? '#276749' : '#4a5568',
                }}>
                  {addaResult.label}
                </div>
                <div style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
                  {addaResult.explanation}
                </div>
                
                {/* P0: Explicit metrics */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '8px',
                  marginTop: '12px',
                  fontSize: '12px',
                }}>
                  <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                    <strong>change_occurred:</strong> {addaResult.changeOccurred ? 'TRUE' : 'FALSE'}
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                    <strong>ai_consistent_change:</strong> {addaResult.aiConsistentChange ? 'TRUE' : 'FALSE'}
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                    <strong>adda_denominator:</strong> {addaResult.inDenominator ? 'TRUE' : 'FALSE'}
                  </div>
                </div>
              </div>
            );
          })()}
          
          {/* Deviation Status */}
          {state.deviationSkipped && (
            <div style={{
              padding: '16px',
              backgroundColor: '#fffaf0',
              borderRadius: '8px',
              border: '2px solid #ed8936',
              marginBottom: '24px',
            }}>
              <div style={{ color: '#c05621', fontWeight: 'bold' }}>
                DEVIATION_SKIPPED = true
              </div>
              <div style={{ fontSize: '12px', color: '#744210', marginTop: '4px' }}>
                Documentation was skipped with attestation
              </div>
            </div>
          )}
          
          {/* Timing */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            marginBottom: '24px',
          }}>
            <div style={{ padding: '12px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#718096' }}>Pre-AI Time</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {((state.lockTime!.getTime() - state.startTime.getTime()) / 1000).toFixed(1)}s
              </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#718096' }}>Post-AI Time</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {((state.submitTime!.getTime() - state.aiRevealTime!.getTime()) / 1000).toFixed(1)}s
              </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#718096' }}>Total Time</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {timeOnCase.toFixed(1)}s
              </div>
            </div>
          </div>
          
          {/* Event Log */}
          <div style={{ marginBottom: '24px' }}>
            <h3>Event Log ({state.events.length} events)</h3>
            <div style={{ 
              maxHeight: '200px', 
              overflow: 'auto',
              backgroundColor: '#1a202c',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}>
              {state.events.map((event, i) => (
                <div key={event.id} style={{ color: '#a0aec0', marginBottom: '4px' }}>
                  <span style={{ color: '#68d391' }}>{i.toString().padStart(2, '0')}</span>
                  {' '}
                  <span style={{ color: '#90cdf4' }}>{event.timestamp.split('T')[1].slice(0, 12)}</span>
                  {' '}
                  <span style={{ color: '#faf089' }}>{event.type}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Export */}
          <button
            onClick={generateExport}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
             Generate Expert Witness Packet
          </button>
          
          {exportUrl && (
            <div style={{
              padding: '16px',
              backgroundColor: verifierResult === 'PASS' ? '#f0fff4' : '#fff5f5',
              borderRadius: '8px',
              border: `2px solid ${verifierResult === 'PASS' ? '#68d391' : '#fc8181'}`,
            }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: verifierResult === 'PASS' ? '#276749' : '#c53030',
                marginBottom: '8px',
              }}>
                Verifier: {verifierResult}
              </div>
              
              <a
                href={exportUrl}
                download={`evidify_export_${state.caseId}_${new Date().toISOString().slice(0, 10)}.zip`}
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#2b6cb0',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                }}
              >
                Download Export Pack (ZIP)
              </a>
              
              <div style={{ fontSize: '12px', color: '#718096', marginTop: '12px' }}>
                Contains: trial_manifest.json, events.jsonl, ledger.json, 
                verifier_output.json, derived_metrics.csv, codebook.md
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleDemoFlowHardened;

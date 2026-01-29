/**
 * LiabilityPostureMeter.tsx
 * 
 * P1 "WOW" Feature - Based on Baird's Research Findings
 * 
 * Displays liability posture based on documented workflow patterns.
 * NOT legal advice - this is an experiment display mapping to conditions.
 * 
 * Key Patterns (from Baird's work):
 * - HIGHEST LIABILITY: "Read twice, AI disagreed, changed toward AI" (crucifixion condition)
 * - LOWER LIABILITY: "Read twice + documented + FDR/FOR disclosed + did not change"
 */

import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface LiabilityInputs {
  // Workflow
  humanFirstLock: boolean;       // Did reader lock before AI?
  aiRevealed: boolean;           // Was AI shown?
  
  // Assessment changes
  initialBirads: number;
  aiBirads: number | null;
  finalBirads: number;
  
  // Disclosure
  disclosurePresented: boolean;
  disclosureFormat: 'fdr_for' | 'natural_frequency' | 'none';
  comprehensionVerified: boolean;
  
  // Documentation
  deviationDocumented: boolean;
  deviationSkipped: boolean;
  
  // Outcome (for vignette scenarios only)
  harmOccurred?: boolean;
  aiWasCorrect?: boolean;
}

export interface LiabilityPosture {
  level: 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW';
  score: number;  // 0-100, higher = more protected
  pattern: string;
  factors: LiabilityFactor[];
  bairdCondition?: string;  // Map to his experimental conditions
}

export interface LiabilityFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

// ============================================================================
// LIABILITY CALCULATION
// ============================================================================

export function calculateLiabilityPosture(inputs: LiabilityInputs): LiabilityPosture {
  const factors: LiabilityFactor[] = [];
  let score = 50; // Start neutral
  
  // Factor 1: Human-first lock
  if (inputs.humanFirstLock) {
    factors.push({
      name: 'Human-First Assessment',
      impact: 'positive',
      weight: 15,
      description: 'Reader formed independent judgment before AI reveal',
    });
    score += 15;
  } else {
    factors.push({
      name: 'No Independent Assessment',
      impact: 'negative',
      weight: -10,
      description: 'AI shown before reader locked assessment',
    });
    score -= 10;
  }
  
  // Factor 2: Change toward AI (Baird's "crucifixion" pattern)
  const changeOccurred = inputs.initialBirads !== inputs.finalBirads;
  const changedTowardAI = inputs.aiBirads !== null && inputs.finalBirads === inputs.aiBirads;
  
  if (changeOccurred && changedTowardAI) {
    factors.push({
      name: 'Changed Toward AI',
      impact: 'negative',
      weight: -25,
      description: 'Modified assessment to match AI suggestion (high scrutiny pattern)',
    });
    score -= 25;
  } else if (changeOccurred && !changedTowardAI) {
    factors.push({
      name: 'Changed Away from AI',
      impact: 'positive',
      weight: 10,
      description: 'Maintained clinical independence despite AI suggestion',
    });
    score += 10;
  } else if (!changeOccurred && inputs.initialBirads !== inputs.aiBirads) {
    factors.push({
      name: 'Maintained Against AI',
      impact: 'positive',
      weight: 15,
      description: 'Held initial assessment despite AI disagreement',
    });
    score += 15;
  }
  
  // Factor 3: Disclosure
  if (inputs.disclosurePresented) {
    if (inputs.disclosureFormat === 'fdr_for') {
      factors.push({
        name: 'FDR/FOR Disclosure Viewed',
        impact: 'positive',
        weight: 10,
        description: 'AI error rates presented in clinically meaningful format',
      });
      score += 10;
    } else if (inputs.disclosureFormat === 'natural_frequency') {
      factors.push({
        name: 'Natural Frequency Disclosure',
        impact: 'positive',
        weight: 8,
        description: 'AI error rates presented in natural frequency format',
      });
      score += 8;
    }
    
    if (inputs.comprehensionVerified) {
      factors.push({
        name: 'Comprehension Verified',
        impact: 'positive',
        weight: 5,
        description: 'Reader demonstrated understanding of AI limitations',
      });
      score += 5;
    }
  }
  
  // Factor 4: Deviation documentation
  if (changeOccurred) {
    if (inputs.deviationDocumented) {
      factors.push({
        name: 'Deviation Documented',
        impact: 'positive',
        weight: 20,
        description: 'Clinical rationale for change is on record',
      });
      score += 20;
    } else if (inputs.deviationSkipped) {
      factors.push({
        name: 'Documentation Skipped',
        impact: 'negative',
        weight: -15,
        description: 'Safeguard available but not utilized (DEVIATION_SKIPPED flag)',
      });
      score -= 15;
    } else {
      factors.push({
        name: 'No Documentation',
        impact: 'negative',
        weight: -20,
        description: 'Assessment changed without documented rationale',
      });
      score -= 20;
    }
  }
  
  // Factor 5: Outcome (if available - for vignette scenarios)
  if (inputs.harmOccurred !== undefined) {
    if (inputs.harmOccurred) {
      factors.push({
        name: 'Adverse Outcome',
        impact: 'negative',
        weight: -10,
        description: 'Patient experienced harm (hindsight applies)',
      });
      score -= 10;
      
      // AI correctness in harm scenarios
      if (inputs.aiWasCorrect) {
        factors.push({
          name: 'AI Was Correct',
          impact: 'negative',
          weight: -15,
          description: 'AI suggested correct course; reader deviated',
        });
        score -= 15;
      }
    }
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  // Determine level
  let level: LiabilityPosture['level'];
  if (score >= 75) level = 'LOW';
  else if (score >= 50) level = 'MODERATE';
  else if (score >= 25) level = 'ELEVATED';
  else level = 'HIGH';
  
  // Identify Baird condition
  let bairdCondition: string | undefined;
  if (changeOccurred && changedTowardAI && !inputs.deviationDocumented) {
    bairdCondition = 'CRUCIFIXION: Changed toward AI without documentation';
  } else if (inputs.humanFirstLock && inputs.disclosurePresented && inputs.deviationDocumented) {
    bairdCondition = 'PROTECTED: Human-first + disclosure + documented';
  } else if (!inputs.humanFirstLock && changedTowardAI) {
    bairdCondition = 'AUTOMATION_BIAS: AI-first with concordant change';
  }
  
  // Generate pattern description
  const patternParts: string[] = [];
  if (inputs.humanFirstLock) patternParts.push('Human-first');
  if (inputs.aiRevealed) patternParts.push('AI revealed');
  if (changeOccurred) {
    patternParts.push(changedTowardAI ? 'Changed toward AI' : 'Changed away from AI');
  } else {
    patternParts.push('No change');
  }
  if (inputs.disclosurePresented) patternParts.push(`${inputs.disclosureFormat} disclosure`);
  if (inputs.deviationDocumented) patternParts.push('Documented');
  if (inputs.deviationSkipped) patternParts.push('Skip-attested');
  
  return {
    level,
    score,
    pattern: patternParts.join(' → '),
    factors,
    bairdCondition,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

interface LiabilityPostureMeterProps {
  inputs: LiabilityInputs;
}

const LiabilityPostureMeter: React.FC<LiabilityPostureMeterProps> = ({ inputs }) => {
  const posture = calculateLiabilityPosture(inputs);
  
  const levelColors = {
    LOW: { bg: '#c6f6d5', border: '#38a169', text: '#22543d' },
    MODERATE: { bg: '#fefcbf', border: '#d69e2e', text: '#744210' },
    ELEVATED: { bg: '#fed7aa', border: '#dd6b20', text: '#7b341e' },
    HIGH: { bg: '#fed7d7', border: '#e53e3e', text: '#742a2a' },
  };
  
  const colors = levelColors[posture.level];
  
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Liability Posture Analysis
        <span style={{ 
          fontSize: '10px', 
          backgroundColor: '#e2e8f0', 
          padding: '2px 8px', 
          borderRadius: '4px',
          fontWeight: 'normal',
        }}>
          NOT LEGAL ADVICE
        </span>
      </h3>
      
      {/* Score Meter */}
      <div style={{
        backgroundColor: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ 
              fontSize: '14px', 
              color: colors.text,
              marginBottom: '4px',
            }}>
              Documentation Protection Score
            </div>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: 'bold',
              color: colors.text,
            }}>
              {posture.score}
              <span style={{ fontSize: '18px', fontWeight: 'normal' }}>/100</span>
            </div>
          </div>
          <div style={{
            backgroundColor: colors.border,
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
          }}>
            {posture.level} RISK
          </div>
        </div>
        
        {/* Progress bar */}
        <div style={{
          height: '8px',
          backgroundColor: '#e2e8f0',
          borderRadius: '4px',
          marginTop: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${posture.score}%`,
            backgroundColor: colors.border,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
      
      {/* Pattern */}
      <div style={{
        backgroundColor: '#f7fafc',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
      }}>
        <strong>Workflow Pattern:</strong>
        <div style={{ marginTop: '4px', color: '#4a5568' }}>
          {posture.pattern}
        </div>
      </div>
      
      {/* Baird Condition (if applicable) */}
      {posture.bairdCondition && (
        <div style={{
          backgroundColor: posture.level === 'HIGH' || posture.level === 'ELEVATED' 
            ? '#fff5f5' 
            : '#f0fff4',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: `1px solid ${posture.level === 'HIGH' || posture.level === 'ELEVATED' 
            ? '#fc8181' 
            : '#68d391'}`,
        }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#718096',
            marginBottom: '4px',
          }}>
            Experimental Condition Mapping
          </div>
          <div style={{ fontWeight: 'bold' }}>
            {posture.bairdCondition}
          </div>
        </div>
      )}
      
      {/* Factors */}
      <div>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold',
          marginBottom: '8px',
        }}>
          Contributing Factors
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {posture.factors.map((factor, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: factor.impact === 'positive' ? '#f0fff4' :
                factor.impact === 'negative' ? '#fff5f5' : '#f7fafc',
              borderRadius: '6px',
              fontSize: '13px',
            }}>
              <span style={{ 
                fontSize: '16px',
                width: '24px',
              }}>
                {factor.impact === 'positive' ? 'Positive' : 
                 factor.impact === 'negative' ? 'Negative' : 'Neutral'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500' }}>{factor.name}</div>
                <div style={{ fontSize: '11px', color: '#718096' }}>
                  {factor.description}
                </div>
              </div>
              <div style={{
                fontWeight: 'bold',
                color: factor.impact === 'positive' ? '#38a169' : 
                  factor.impact === 'negative' ? '#e53e3e' : '#718096',
              }}>
                {factor.weight > 0 ? '+' : ''}{factor.weight}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Disclaimer */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#edf2f7',
        borderRadius: '8px',
        fontSize: '11px',
        color: '#718096',
      }}>
        <strong>Disclaimer:</strong> This analysis maps documented workflow patterns to 
        experimental conditions studied in mock juror research. It does not constitute 
        legal advice and should not be used to predict actual legal outcomes. Actual 
        liability is determined by courts based on all facts and circumstances of a case.
      </div>
    </div>
  );
};

export default LiabilityPostureMeter;

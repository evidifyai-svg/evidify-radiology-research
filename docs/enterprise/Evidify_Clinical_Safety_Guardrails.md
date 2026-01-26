# Evidify Clinical Safety Guardrails Specification
## AI-Assisted Documentation Safety Framework

**Version:** 1.0  
**Date:** January 9, 2026  
**Classification:** Clinical Operations  
**Alignment:** NIST AI RMF (GOVERN/MAP/MEASURE/MANAGE)

---

## Executive Summary

This specification defines the clinical safety guardrails that prevent AI-assisted documentation from creating patient safety risks. It addresses the core concern: **AI must augment, never replace, clinical judgment.**

### Core Principles

1. **Clinician Remains Author**: AI generates drafts; clinicians own the final documentation
2. **Safety-Critical Content Requires Human Verification**: SI/HI, abuse, mandated reporting
3. **No Hallucinated Facts in Clinical Record**: AI suggestions clearly marked, tracked
4. **Automation Bias Prevention**: Forced review checkpoints before finalization
5. **Audit Trail**: Complete history of AI involvement in each note

---

## 1. Safety Keyword Detection System

### 1.1 Trigger Categories

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SAFETY KEYWORD CATEGORIES                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ CATEGORY A: SUICIDE/SELF-HARM (Highest Priority)                       │
│ ─────────────────────────────────────────────────────────────────────  │
│ Keywords: suicide, suicidal, SI, self-harm, self-injury, cutting,     │
│           overdose, kill myself, end my life, not worth living,        │
│           better off dead, plan to die, means, method, attempt,        │
│           ideation, hopeless, no reason to live                        │
│                                                                         │
│ Trigger: Force SAFETY ASSESSMENT SECTION completion                    │
│                                                                         │
│ CATEGORY B: HOMICIDE/VIOLENCE                                          │
│ ─────────────────────────────────────────────────────────────────────  │
│ Keywords: homicide, homicidal, HI, kill, murder, harm someone,        │
│           violent thoughts, hurt them, threat, weapon                  │
│                                                                         │
│ Trigger: Force VIOLENCE RISK ASSESSMENT completion                     │
│                                                                         │
│ CATEGORY C: ABUSE/NEGLECT (Mandated Reporting)                        │
│ ─────────────────────────────────────────────────────────────────────  │
│ Keywords: abuse, neglect, hit, beaten, molest, inappropriate touch,   │
│           bruises, CPS, APS, mandated report, vulnerable adult,        │
│           elder abuse, child abuse, domestic violence, DV              │
│                                                                         │
│ Trigger: Force MANDATED REPORTING SECTION completion                   │
│                                                                         │
│ CATEGORY D: GRAVE DISABILITY / ACUTE RISK                             │
│ ─────────────────────────────────────────────────────────────────────  │
│ Keywords: gravely disabled, danger to self, danger to others,         │
│           involuntary, 5150, 5250, M1 hold, psychiatric emergency,     │
│           unable to care for self, decompensating                      │
│                                                                         │
│ Trigger: Force ACUTE RISK ASSESSMENT completion                        │
│                                                                         │
│ CATEGORY E: SUBSTANCE/MEDICAL EMERGENCY                               │
│ ─────────────────────────────────────────────────────────────────────  │
│ Keywords: withdrawal, detox, intoxicated, overdose, seizure,          │
│           chest pain, difficulty breathing, medical emergency          │
│                                                                         │
│ Trigger: Force MEDICAL COORDINATION note                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Detection Implementation

```typescript
interface SafetyKeywordConfig {
  category: 'suicide_self_harm' | 'homicide_violence' | 'abuse_neglect' | 'grave_disability' | 'medical_emergency';
  keywords: string[];
  requiredSection: string;
  blockExportUntilComplete: boolean;
  auditLogLevel: 'info' | 'warn' | 'critical';
}

const SAFETY_KEYWORDS: SafetyKeywordConfig[] = [
  {
    category: 'suicide_self_harm',
    keywords: [
      'suicide', 'suicidal', '\\bsi\\b', 'self-harm', 'self-injury', 
      'cutting', 'overdose', 'kill myself', 'end my life', 
      'not worth living', 'better off dead', 'plan to die',
      'ideation', 'hopeless', 'no reason to live'
    ],
    requiredSection: 'SAFETY_ASSESSMENT',
    blockExportUntilComplete: true,
    auditLogLevel: 'critical'
  },
  // ... additional categories
];

function detectSafetyKeywords(text: string): SafetyKeywordMatch[] {
  const matches: SafetyKeywordMatch[] = [];
  const normalizedText = text.toLowerCase();
  
  for (const config of SAFETY_KEYWORDS) {
    for (const keyword of config.keywords) {
      const regex = new RegExp(keyword, 'gi');
      if (regex.test(normalizedText)) {
        matches.push({
          category: config.category,
          keyword: keyword,
          requiredSection: config.requiredSection,
          blockExport: config.blockExportUntilComplete
        });
      }
    }
  }
  
  return matches;
}
```

### 1.3 User Experience Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SAFETY KEYWORD TRIGGER FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. User types or AI generates content containing safety keyword        │
│                         ↓                                               │
│  2. System detects keyword in real-time                                │
│                         ↓                                               │
│  3. Safety indicator appears:                                          │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ ⚠️ Safety-related content detected                          │    │
│     │ Complete the required safety assessment before exporting.   │    │
│     │ [Open Safety Assessment]                                    │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                         ↓                                               │
│  4. If user tries to export without completing:                        │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ ❌ Export Blocked                                           │    │
│     │                                                             │    │
│     │ This note contains safety-related content that requires    │    │
│     │ documented assessment before export.                        │    │
│     │                                                             │    │
│     │ Required: Safety Assessment Section                         │    │
│     │                                                             │    │
│     │ [Complete Assessment]  [Cancel]                            │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                         ↓                                               │
│  5. Safety Assessment Modal opens with structured fields               │
│                         ↓                                               │
│  6. After completion, export enabled                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Required Safety Assessment Sections

### 2.1 Suicide/Self-Harm Assessment Template

When suicide-related keywords detected, this section is **required**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SAFETY ASSESSMENT - SUICIDE/SELF-HARM                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Suicidal Ideation:                                                      │
│ ( ) None reported  ( ) Passive  ( ) Active without plan               │
│ ( ) Active with plan  ( ) Active with plan and intent                 │
│                                                                         │
│ If present, document:                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ Frequency: ____________________________________________              ││
│ │ Duration: _____________________________________________              ││
│ │ Plan details (if any): ________________________________              ││
│ │ Access to means: ______________________________________              ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ Self-Harm Behavior:                                                     │
│ ( ) None reported  ( ) Historical only  ( ) Recent (past 30 days)     │
│ ( ) Current/ongoing                                                    │
│                                                                         │
│ Protective Factors:                                                     │
│ [ ] Reasons for living identified                                      │
│ [ ] Social support                                                     │
│ [ ] Future orientation                                                 │
│ [ ] Engaged in treatment                                               │
│ [ ] Religious/spiritual beliefs                                        │
│ [ ] Responsibility to family/children                                  │
│ [ ] Fear of death/pain                                                 │
│ Other: _______________________________________________                  │
│                                                                         │
│ Risk Level Assessment:                                                  │
│ ( ) Low  ( ) Moderate  ( ) High  ( ) Imminent                         │
│                                                                         │
│ Safety Plan:                                                            │
│ ( ) Existing safety plan reviewed                                      │
│ ( ) New safety plan created                                            │
│ ( ) Safety plan updated                                                │
│ ( ) N/A - no current risk                                              │
│                                                                         │
│ Intervention:                                                           │
│ [ ] Crisis resources provided                                          │
│ [ ] Emergency contact identified                                       │
│ [ ] Means restriction discussed                                        │
│ [ ] Hospitalization considered                                         │
│ [ ] Consultation obtained                                              │
│ [ ] No intervention needed                                             │
│                                                                         │
│ Clinician Attestation:                                                  │
│ [ ] I have personally assessed suicide risk for this patient          │
│     and documented my clinical judgment above.                         │
│                                                                         │
│ [Save Assessment]                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Violence Risk Assessment Template

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SAFETY ASSESSMENT - VIOLENCE RISK                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Homicidal Ideation:                                                     │
│ ( ) None reported  ( ) Vague/non-specific                             │
│ ( ) Specific target identified  ( ) Plan articulated                  │
│                                                                         │
│ If present, document:                                                   │
│ Target (if identified): ______________________________________          │
│ Relationship to target: ______________________________________          │
│ Specific plan/method: _______________________________________          │
│ Access to weapons: __________________________________________          │
│                                                                         │
│ History of Violence:                                                    │
│ ( ) None known  ( ) Verbal aggression  ( ) Physical aggression        │
│ ( ) Weapon involvement  ( ) Arrests/convictions                       │
│                                                                         │
│ Current Risk Factors:                                                   │
│ [ ] Substance intoxication                                             │
│ [ ] Command hallucinations                                             │
│ [ ] Persecutory delusions                                              │
│ [ ] Recent significant stressor                                        │
│ [ ] Recent loss of stabilizing factors                                │
│ [ ] Treatment non-adherence                                            │
│                                                                         │
│ Duty to Warn/Protect Assessment:                                       │
│ ( ) Not applicable - no identifiable victim                           │
│ ( ) Assessed - duty NOT triggered                                      │
│ ( ) Assessed - duty triggered, action taken (document below)          │
│                                                                         │
│ Action Taken (if duty triggered):                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │                                                                     ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ Risk Level: ( ) Low  ( ) Moderate  ( ) High  ( ) Imminent             │
│                                                                         │
│ [ ] I have personally assessed violence risk and documented above.    │
│                                                                         │
│ [Save Assessment]                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Mandated Reporting Template

```
┌─────────────────────────────────────────────────────────────────────────┐
│ MANDATED REPORTING ASSESSMENT                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Type of Suspected Abuse/Neglect:                                       │
│ [ ] Child abuse/neglect                                                │
│ [ ] Elder abuse/neglect                                                │
│ [ ] Dependent adult abuse/neglect                                      │
│ [ ] Domestic violence (if applicable)                                  │
│ [ ] Institutional abuse                                                │
│                                                                         │
│ Assessment of Reporting Obligation:                                    │
│ ( ) Report NOT required - no reasonable suspicion                     │
│ ( ) Report required - reasonable suspicion exists                     │
│ ( ) Uncertain - consultation obtained                                  │
│                                                                         │
│ If report required:                                                     │
│ Report made to: _____________________________________________           │
│ Date/time of report: ________________________________________           │
│ Report number (if provided): _________________________________          │
│ Person contacted: ___________________________________________           │
│                                                                         │
│ Summary of report:                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │                                                                     ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ If report NOT made, rationale:                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │                                                                     ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ [ ] I have assessed mandated reporting obligations and documented     │
│     my clinical and legal reasoning above.                             │
│                                                                         │
│ [Save Assessment]                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. AI Involvement Tracking

### 3.1 Metadata Schema

Every note tracks AI involvement:

```typescript
interface AIInvolvementMetadata {
  // Whether AI was used at all
  ai_assisted: boolean;
  
  // Breakdown of AI involvement
  ai_sections: {
    section_id: string;
    section_name: string;
    ai_generated: boolean;      // AI created initial content
    ai_suggested: boolean;      // AI offered suggestions
    human_edited: boolean;      // Clinician modified AI content
    human_authored: boolean;    // Clinician wrote from scratch
  }[];
  
  // AI generation events
  ai_events: {
    timestamp: string;
    event_type: 'draft_generated' | 'suggestion_offered' | 'content_accepted' | 'content_modified' | 'content_rejected';
    section_id: string;
    original_length?: number;
    final_length?: number;
    edit_distance?: number;     // How much clinician changed it
  }[];
  
  // Final attestation
  clinician_attestation: {
    timestamp: string;
    statement: 'reviewed_and_approved';
  };
}
```

### 3.2 UI Indicators

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AI INVOLVEMENT INDICATORS (shown in editor)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Visual markers in editor:                                               │
│                                                                         │
│ ┌─ AI-generated section ───────────────────────────────────────────┐   │
│ │ [AI] Patient presents with reported difficulty concentrating     │   │
│ │      at work over the past 6 months. [✏️ Edit] [✓ Approve]       │   │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─ AI-suggested, human-edited ─────────────────────────────────────┐   │
│ │ [AI→✏️] Assessment reveals symptoms consistent with ADHD-        │   │
│ │         Combined presentation. (edited by clinician)             │   │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─ Human-authored section ─────────────────────────────────────────┐   │
│ │ [👤] I discussed treatment options including medication and      │   │
│ │      behavioral interventions. Patient expressed preference...   │   │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Legend:                                                                 │
│ [AI] = AI-generated, not yet reviewed                                  │
│ [AI ✓] = AI-generated, clinician approved                             │
│ [AI→✏️] = AI-generated, clinician edited                               │
│ [👤] = Human-authored                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Export Disclosure

All exports include AI involvement disclosure:

```
───────────────────────────────────────────────────────────────────────────
DOCUMENTATION METHODOLOGY DISCLOSURE

This clinical note was created with AI-assisted documentation tools.

AI Involvement Summary:
• AI-generated draft sections: 3 (65% of content)
• Clinician-edited AI sections: 2
• Clinician-authored sections: 2 (35% of content)

All content was reviewed and approved by the signing clinician.
The clinician is the author of record and responsible for accuracy.

Tool: Evidify v4.2.6-beta
───────────────────────────────────────────────────────────────────────────
```

---

## 4. Required Review Checkpoints

### 4.1 Pre-Export Checklist

Before any export, user must complete:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PRE-EXPORT REVIEW CHECKLIST                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ☑️ Required before export:                                              │
│                                                                         │
│ [ ] I have reviewed all AI-generated content in this note              │
│                                                                         │
│ [ ] I have verified the accuracy of:                                   │
│     [ ] Patient identifying information                                │
│     [ ] Reported symptoms and history                                  │
│     [ ] Assessment and diagnostic impressions                          │
│     [ ] Treatment plan and recommendations                             │
│                                                                         │
│ [ ] I have completed required safety assessments (if applicable)       │
│                                                                         │
│ [ ] I attest that this note accurately reflects my clinical           │
│     encounter and professional judgment                                │
│                                                                         │
│ By clicking "Export," I confirm I am the author of this clinical      │
│ documentation and take responsibility for its accuracy and            │
│ completeness.                                                          │
│                                                                         │
│                              [Cancel]  [Export]                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Checkpoint Triggers

| Trigger | Checkpoint | Can Skip? |
|---------|------------|-----------|
| Any AI content present | Basic review attestation | No |
| Safety keywords detected | Safety assessment completion | No |
| Note > 24 hours old | Staleness warning | Yes (with acknowledgment) |
| Copy-forward content | Copy-forward review | No |
| Diagnosis present | Diagnosis confirmation | No (enterprise mode) |

---

## 5. Copy-Forward Contamination Prevention

### 5.1 Copy-Forward Detection

```typescript
interface CopyForwardCheck {
  // Detect if content was copied from previous notes
  detectCopyForward(currentNote: string, previousNotes: string[]): CopyForwardMatch[];
}

interface CopyForwardMatch {
  sourceNoteId: string;
  sourceNoteDate: string;
  matchedContent: string;
  matchPercentage: number;
  riskLevel: 'low' | 'medium' | 'high';
  contentType: 'mse' | 'risk_assessment' | 'diagnosis' | 'treatment_plan' | 'other';
}
```

### 5.2 High-Risk Copy-Forward Sections

These sections require explicit confirmation if copied:

- **Mental Status Exam (MSE)**: Must reflect current presentation
- **Risk Assessment**: Must be current, not historical
- **Vital Signs/Physical**: Must be from current encounter
- **Safety Plan**: Must be verified as still current
- **Medication List**: Must reflect current regimen

### 5.3 User Warning

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ COPY-FORWARD CONTENT DETECTED                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ The following content appears to be copied from a previous note:       │
│                                                                         │
│ Section: Mental Status Examination                                     │
│ Source: Note dated 2025-12-15 (25 days ago)                           │
│ Match: 95%                                                             │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ "Patient is alert and oriented x4. Mood described as 'okay.'       ││
│ │  Affect congruent, full range. Thought process linear and goal-    ││
│ │  directed. No evidence of hallucinations or delusions..."          ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ⚠️ Risk: MSE should reflect TODAY'S presentation, not historical.     │
│                                                                         │
│ Please confirm:                                                        │
│                                                                         │
│ ( ) This MSE accurately reflects today's presentation                 │
│ ( ) I need to update this section                                      │
│                                                                         │
│                    [Update Section]  [Confirm Current]                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Hallucination Prevention

### 6.1 Factual Claim Constraints

AI is instructed to:
- **Never fabricate** patient statements, dates, or specific clinical details
- **Use hedging language** for inferences: "Patient reports..." not "Patient stated..."
- **Explicitly mark** uncertainty: "[Confirm with patient]"
- **Not assume** what wasn't documented

### 6.2 High-Risk Hallucination Categories

| Category | Risk | Mitigation |
|----------|------|------------|
| Patient quotes | High | AI uses "Patient reports..." not direct quotes unless transcribed |
| Specific dates | High | AI uses "[DATE]" placeholder |
| Medication names/doses | High | AI uses "[VERIFY MEDICATION]" placeholder |
| Lab values | Critical | AI never generates; requires clinician input |
| Denial statements | Critical | AI never generates "Patient denied X" without source |

### 6.3 Denial Statement Warning

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ DENIAL STATEMENT VERIFICATION                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ The AI generated the following denial statement:                       │
│                                                                         │
│   "Patient denied suicidal ideation."                                  │
│                                                                         │
│ ⚠️ Important: This statement should only be included if you           │
│    specifically asked about suicidal ideation and the patient         │
│    explicitly denied it.                                               │
│                                                                         │
│ Please confirm:                                                        │
│                                                                         │
│ ( ) I asked about SI and patient denied                               │
│ ( ) I did not ask - remove this statement                             │
│ ( ) I asked but patient's response was different - I will edit        │
│                                                                         │
│                              [Confirm]                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Audit Trail for Safety Events

### 7.1 Safety-Specific Audit Entries

```json
{
  "audit_entries": [
    {
      "event_type": "SAFETY_KEYWORD_DETECTED",
      "timestamp": "2026-01-09T15:30:00Z",
      "details": {
        "note_id": "abc123",
        "category": "suicide_self_harm",
        "keyword_detected": "suicidal",
        "assessment_required": true
      }
    },
    {
      "event_type": "SAFETY_ASSESSMENT_STARTED",
      "timestamp": "2026-01-09T15:31:00Z",
      "details": {
        "note_id": "abc123",
        "assessment_type": "SUICIDE_RISK"
      }
    },
    {
      "event_type": "SAFETY_ASSESSMENT_COMPLETED",
      "timestamp": "2026-01-09T15:35:00Z",
      "details": {
        "note_id": "abc123",
        "assessment_type": "SUICIDE_RISK",
        "risk_level_selected": "moderate",
        "interventions_selected": ["crisis_resources", "safety_plan_updated"]
      }
    },
    {
      "event_type": "EXPORT_ALLOWED",
      "timestamp": "2026-01-09T15:36:00Z",
      "details": {
        "note_id": "abc123",
        "safety_assessments_completed": ["SUICIDE_RISK"],
        "clinician_attestation": true
      }
    }
  ]
}
```

---

## 8. Enterprise Policy Configuration

### 8.1 Safety Guardrail Policies

```json
{
  "clinical_safety": {
    "safety_keyword_detection": {
      "enabled": true,
      "categories": ["suicide_self_harm", "homicide_violence", "abuse_neglect", "grave_disability"],
      "block_export_on_detection": true,
      "require_assessment_completion": true
    },
    "ai_involvement_tracking": {
      "enabled": true,
      "include_in_export": true,
      "require_review_attestation": true
    },
    "copy_forward_detection": {
      "enabled": true,
      "warn_threshold_days": 7,
      "block_threshold_days": 30,
      "high_risk_sections": ["mse", "risk_assessment", "safety_plan"]
    },
    "denial_statement_verification": {
      "enabled": true,
      "require_confirmation": true
    },
    "pre_export_checklist": {
      "enabled": true,
      "required_items": [
        "reviewed_ai_content",
        "verified_accuracy",
        "safety_assessments_complete",
        "author_attestation"
      ]
    }
  }
}
```

---

## 9. NIST AI RMF Alignment

### 9.1 GOVERN

- **Policy Framework**: This specification defines governance for AI use in clinical documentation
- **Roles**: Clinician is author; AI is assistant; Organization sets policy
- **Accountability**: Audit trail assigns responsibility

### 9.2 MAP

- **Context**: Behavioral health documentation with safety-critical content
- **Stakeholders**: Clinicians, patients, supervisors, compliance
- **Risks**: Hallucination, automation bias, safety omissions, copy-forward errors

### 9.3 MEASURE

- **Metrics**:
  - Safety assessment completion rate
  - Time-to-complete safety assessments
  - AI content edit rate (low = potential automation bias)
  - Copy-forward detection trigger rate
  - Export block rate (safety keywords)

### 9.4 MANAGE

- **Interventions**: Mandatory checkpoints, blocked exports, forced assessments
- **Monitoring**: Audit trail analysis for patterns
- **Continuous Improvement**: Keyword list updates, threshold tuning

---

## 10. Testing & Validation

### 10.1 Must-Pass Safety Test Cases

| Test ID | Scenario | Expected Behavior | Pass Criteria |
|---------|----------|-------------------|---------------|
| SAFE-001 | Note contains "suicidal ideation" | Safety assessment required | Export blocked until assessment complete |
| SAFE-002 | Note contains "patient denied SI" | Denial verification prompt | Cannot proceed without confirmation |
| SAFE-003 | MSE copied from 30-day-old note | Copy-forward warning | Must confirm or edit |
| SAFE-004 | AI generates "Patient stated..." | No direct quotes from AI | Only "Patient reports..." allowed |
| SAFE-005 | Export attempted without review | Checklist required | Cannot export without attestation |
| SAFE-006 | Homicidal ideation mentioned | Violence risk assessment | Must complete duty-to-warn evaluation |
| SAFE-007 | Child abuse keyword detected | Mandated reporting section | Must document reporting decision |

### 10.2 Automated Testing

```typescript
describe('Clinical Safety Guardrails', () => {
  test('SAFE-001: Suicide keyword triggers assessment', async () => {
    const note = createNote({ content: 'Patient expressed suicidal ideation' });
    const result = await attemptExport(note);
    
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('safety_assessment_required');
    expect(result.requiredAssessment).toBe('SUICIDE_RISK');
  });
  
  test('SAFE-002: Denial statement requires verification', async () => {
    const note = createNote({ content: 'Patient denied suicidal ideation' });
    const aiSections = detectAISections(note);
    
    expect(aiSections).toContainEqual(
      expect.objectContaining({
        requiresVerification: true,
        verificationType: 'denial_statement'
      })
    );
  });
  
  // Additional test cases...
});
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 9, 2026 | Initial release |

---

*This specification is designed to meet enterprise clinical safety requirements while enabling efficient AI-assisted documentation.*

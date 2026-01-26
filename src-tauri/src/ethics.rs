// Ethics Detection Module v3
// 
// Key changes:
// - Detections store match offsets, not evidence text
// - Evidence is reconstructed on demand from note content
// - This prevents PHI leakage into logs/support bundles

use regex::Regex;
use serde::{Deserialize, Serialize};
use crate::models::{EthicsDetection, EthicsAnalysis, StoredDetection, DetectionSeverity};

// ============================================
// Re-exported Types for Other Modules
// ============================================

/// Detection category for ethics alerts
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Category {
    SuicidalIdeation,
    HomicidalIdeation,
    SelfHarm,
    ChildAbuse,
    ElderAbuse,
    SubstanceUse,
    ClinicalRisk,
    Safety,
    Documentation,
    Billing,
}

/// Severity level for detections
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

/// A detection instance for attestation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Detection {
    pub id: String,
    pub category: Category,
    pub severity: Severity,
    pub title: String,
    pub description: String,
    pub suggestion: String,
    pub evidence: String,
    pub start_offset: usize,
    pub end_offset: usize,
}

impl Detection {
    /// Whether this detection requires attestation (based on severity)
    pub fn requires_attestation(&self) -> bool {
        matches!(self.severity, Severity::Critical | Severity::High)
    }
}

impl From<&EthicsDetection> for Detection {
    fn from(ed: &EthicsDetection) -> Self {
        Detection {
            id: ed.id.clone(),
            category: match ed.category.as_str() {
                "safety" => Category::Safety,
                "documentation" => Category::Documentation,
                "billing" => Category::Billing,
                _ => Category::ClinicalRisk,
            },
            severity: match ed.severity {
                DetectionSeverity::Attest => Severity::High,
                DetectionSeverity::Flag => Severity::Medium,
                DetectionSeverity::Coach => Severity::Low,
            },
            title: ed.title.clone(),
            description: ed.description.clone(),
            suggestion: ed.suggestion.clone(),
            evidence: ed.evidence.clone(),
            start_offset: 0,
            end_offset: 0,
        }
    }
}

struct DetectionPattern {
    id: &'static str,
    category: &'static str,
    severity: DetectionSeverity,
    patterns: Vec<&'static str>,
    exclusions: Vec<&'static str>,
    title: &'static str,
    description: &'static str,
    suggestion: &'static str,
    policy_ref: Option<&'static str>,
}

lazy_static::lazy_static! {
    static ref PATTERNS: Vec<DetectionPattern> = vec![
        // ============================================
        // P0 - CLINICAL SAFETY (CRITICAL)
        // ============================================
        
        // Safety - SI Euphemisms
        DetectionPattern {
            id: "safety-si-euphemism",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(power down|not.{0,10}be a person|disappear|go away|not wake up|end it all|no point)\b",
                r"(?i)\b(dark thoughts?|dark place)\b",
            ],
            exclusions: vec![
                r"(?i)\bdenied\b.{0,30}\b(dark|thoughts?|ideation)\b",
                r"(?i)\b(no|denies|denied).{0,20}\b(suicid|si|ideation)\b",
            ],
            title: "Safety Language Detected",
            description: "Passive death-wish or euphemistic safety language",
            suggestion: "Document ideation, plan, intent, protective factors, and clinical assessment",
            policy_ref: Some("Clinical standard of care"),
        },
        
        // Safety - SI Rehearsal Imagery (CRITICAL - NEW)
        DetectionPattern {
            id: "safety-si-rehearsal",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(imagine|imagines|imagining|think about|picture|visualize).{0,25}(bridge|building|roof|ledge|tracks|train|highway|overpass)\b",
                r"(?i)\b(bridge|building|ledge|roof).{0,20}(on my|during|commute|drive|route|way)\b",
                r"(?i)\b(rehearsal|rehearse|practice|practiced).{0,20}(dying|death|suicide|ending)\b",
                r"(?i)\b(know (exactly )?how|figured out|planned).{0,15}(do it|end it|die)\b",
            ],
            exclusions: vec![],
            title: "Suicide Rehearsal Imagery",
            description: "Specific location or method visualization suggests elevated risk",
            suggestion: "Assess frequency/intensity/controllability of imagery; complete full safety assessment; document specificity of ideation",
            policy_ref: Some("Columbia Protocol / SSI"),
        },
        
        // Safety - Means Access with Ambiguity (CRITICAL - NEW)
        DetectionPattern {
            id: "safety-means-access",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(clean(ed|ing)?|load(ed|ing)?|check(ed|ing)?|look(ed|ing) at).{0,15}(gun|firearm|pistol|rifle|weapon)\b",
                r"(?i)\b(gun|firearm|weapon).{0,25}(locked|safe|away).{0,20}(don.?t|no|not).{0,10}access\b",
                r"(?i)\bhave.{0,10}(gun|firearm|weapon).{0,15}(but|though)\b",
                r"(?i)\b(stockpil|sav(ed|ing)|collect(ed|ing)).{0,15}(pill|medication|med|prescription)\b",
                r"(?i)\b(know where|access to).{0,15}(gun|weapon|pills|medication)\b",
            ],
            exclusions: vec![],
            title: "Means Access - Clarification Needed",
            description: "Lethal means mentioned with ambiguous access status",
            suggestion: "Clarify actual access; document means restriction counseling; consider third-party verification; assess willingness to restrict",
            policy_ref: Some("Lethal Means Counseling"),
        },
        
        // Safety - Fitness-for-Duty Letter Request (CRITICAL - NEW)
        DetectionPattern {
            id: "safety-fitness-letter",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(letter|note|documentation).{0,25}(safe to|fit to|able to|cleared to).{0,10}work\b",
                r"(?i)\b(not a danger|no danger|no risk|no threat).{0,20}(letter|documentation|note|statement)\b",
                r"(?i)\b(clear(ed)?|certif(y|ied)).{0,15}(return to work|work|job|employment)\b",
                r"(?i)\b(fitness.for.duty|fit for duty|FFD)\b",
            ],
            exclusions: vec![],
            title: "Fitness-for-Duty Letter Request",
            description: "Request for documentation asserting safety/fitness to work",
            suggestion: "Document scope limitations; consider collateral/formal eval; avoid absolute statements; clarify role (treating vs evaluating clinician)",
            policy_ref: Some("APA Ethics 9.01 - Forensic limitations"),
        },
        
        // Safety - Dissociation While Driving (CRITICAL - NEW)
        DetectionPattern {
            id: "safety-driving-dissociation",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(drive|driving|drove).{0,25}(don.?t remember|can.?t remember|blank|blackout|lost time)\b",
                r"(?i)\b(lose|lost|losing) time.{0,25}(driv|behind the wheel|in the car)\b",
                r"(?i)\b(dissociat|zoned out|spaced out|autopilot).{0,20}(driv|car|highway|road)\b",
                r"(?i)\b(found myself|ended up|woke up).{0,15}(driving|in the car|on the road|different place)\b",
            ],
            exclusions: vec![],
            title: "Dissociation While Driving - Immediate Safety Risk",
            description: "Reported dissociative episodes while operating vehicle",
            suggestion: "Document driving safety counseling; assess capacity and impairment; create emergency plan for recurrence; consider duty to warn/protect",
            policy_ref: Some("Public safety / duty to protect"),
        },
        
        // Safety - Substance + Risk Combination (NEW)
        DetectionPattern {
            id: "safety-substance-risk",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(shot|drink|beer|alcohol|drunk).{0,50}(dissociat|blackout|blank|don.?t remember)\b",
                r"(?i)\b(dissociat|blackout).{0,50}(shot|drink|beer|alcohol|drunk)\b",
                r"(?i)\b(few (shot|drink|beer)).{0,30}(earlier|last|before|prior)\b",
            ],
            exclusions: vec![],
            title: "Substance Use + Risk Factors",
            description: "Alcohol/substance use combined with dissociation or safety concerns",
            suggestion: "Complete substance screen; document interaction with risk/impairment; assess for substance use disorder",
            policy_ref: Some("Substance safety assessment"),
        },
        
        // Safety - Documentation Coercion/Pressure (CRITICAL - NEW)
        DetectionPattern {
            id: "safety-doc-coercion",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\bif you (write|document|put|include|note).{0,30}(ruin|destroy|hurt|damage|end).{0,15}(me|my|career|life|case)\b",
                r"(?i)\b(don.?t|do not).{0,10}(write|document|put|include).{0,20}(any of that|that|this)\b.{0,20}(ruin|damage|hurt|legal)\b",
                r"(?i)\b(pressure|pressur(ed|ing)|demand|insist).{0,20}(document|write|note|record)\b",
                r"(?i)\bdocument.{0,10}(no risk|stable|fine|ok|good)\b",
            ],
            exclusions: vec![],
            title: "External Pressure to Under-Document",
            description: "Client pressure to minimize or alter clinical documentation",
            suggestion: "Document the coercion attempt itself; explain documentation standards; assess for safety concerns behind the request",
            policy_ref: Some("Documentation integrity / Medical records"),
        },
        
        // Safety - HI
        DetectionPattern {
            id: "safety-hi-threat",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(want to|going to|plan to|will|gonna)\b.{0,15}\b(kill|attack|shoot|stab|beat)\b",
                r"(?i)\b(learn not to mess|teach them a lesson|make them pay|get even|revenge)\b",
            ],
            exclusions: vec![
                r"(?i)\b(hurt|harm).{0,20}\b(later|reputation|case|career|chances|application)\b",
            ],
            title: "Potential Violence Language",
            description: "Language suggesting potential harm to others",
            suggestion: "Document target, plan, intent, means, duty to warn consideration",
            policy_ref: Some("Tarasoff duty"),
        },
        
        // ============================================
        // P0 - TELEHEALTH COMPLIANCE (CRITICAL)
        // ============================================
        
        // Telehealth - Location Change (CRITICAL - NEW)
        DetectionPattern {
            id: "telehealth-location-change",
            category: "telehealth",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\blocation.{0,10}(parking lot|car|vehicle|public|outside|different|changed)\b",
                r"(?i)\b(previously|before|last time|used to be).{0,15}(home|house|office).{0,20}(now|currently|today).{0,15}(parking|car|lot|public)\b",
                r"(?i)\b(now|currently|today).{0,10}(in|at|from).{0,10}(parking|car|vehicle|lot)\b",
            ],
            exclusions: vec![],
            title: "Patient Location Changed - Verify",
            description: "Patient location different from expected or from unsafe environment",
            suggestion: "Verify current physical location (address/city/state); complete privacy check; confirm emergency resources for current location",
            policy_ref: Some("Telehealth jurisdiction / PSYPACT"),
        },
        
        // Telehealth - Unsafe Setting (CRITICAL - NEW)
        DetectionPattern {
            id: "telehealth-unsafe-setting",
            category: "telehealth",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(session|joined|call|video).{0,15}(from|in).{0,10}(parking|car|vehicle|public|bathroom|hallway|restaurant|cafe|coffee)\b",
                r"(?i)\b(in (the|my)|at a).{0,5}(parking lot|car|vehicle|public place|bathroom)\b.{0,20}(session|call|appointment)\b",
            ],
            exclusions: vec![],
            title: "Unsafe Telehealth Environment",
            description: "Session from potentially unsafe or non-private location",
            suggestion: "Assess privacy limitations; document safety check; consider rescheduling if privacy compromised; verify location for licensing",
            policy_ref: Some("Telehealth privacy / Safety protocols"),
        },
        
        // Telehealth - Jurisdiction
        DetectionPattern {
            id: "telehealth-jurisdiction",
            category: "telehealth",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(traveling|on the road|not sure (what|which) state)\b",
                r"(?i)\bjoined from.{0,15}(phone|mobile).{0,15}(traveling|driving)\b",
            ],
            exclusions: vec![],
            title: "Jurisdiction Unclear",
            description: "Client location may be unclear",
            suggestion: "Verify and document location for licensing compliance",
            policy_ref: Some("Telehealth jurisdiction"),
        },
        
        // Telehealth - Privacy
        DetectionPattern {
            id: "telehealth-privacy",
            category: "telehealth",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(lowered.{0,10}voice|whisper|can.?t talk freely)\b",
            ],
            exclusions: vec![
                r"(?i)\b(stays?|kept?|leave|left) in the car\b",  // Storage context, not session
            ],
            title: "Privacy Limitations",
            description: "Session with potential privacy limitations",
            suggestion: "Document privacy status and limitations",
            policy_ref: Some("Telehealth privacy"),
        },
        
        // ============================================
        // P0 - SECURITY / INTEGRITY (CRITICAL)
        // ============================================
        
        // Security - Prompt Injection Tokens (CRITICAL - NEW)
        DetectionPattern {
            id: "security-injection",
            category: "security",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\.\./|\.\.%2f|%2e%2e",  // Path traversal
                r"(?i)javascript:|file:///|data:",  // Protocol injection
                r"(?i)<script|onclick=|onerror=",  // XSS vectors
                r"(?i)C:\\Users|C:/Users|/Users/",  // Absolute paths
                r"(?i)\\x[0-9a-f]{2}|%[0-9a-f]{2}",  // Encoded characters
            ],
            exclusions: vec![],
            title: "SECURITY: Potential Injection Detected",
            description: "Content contains path traversal, script injection, or system manipulation tokens",
            suggestion: "QUARANTINE this content; do not pass to AI/export/file operations; verify no commands executed; review for contamination",
            policy_ref: Some("Application security / Input validation"),
        },
        
        // Security - Egress Surface References (CRITICAL - NEW)
        DetectionPattern {
            id: "security-egress",
            category: "security",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(export|save|copy).{0,15}(to|USB|AirDrop|OneDrive|iCloud|Dropbox|Google Drive)\b",
                r"(?i)\bOneDrive|iCloud|Dropbox|Google Drive\b",
                r"(?i)\bUSB|flash drive|external drive|thumb drive\b",
                r"(?i)\bAirDrop|Share to Notes|Share.to\b",
            ],
            exclusions: vec![],
            title: "SECURITY: Egress Surface Referenced",
            description: "Content references cloud/external storage or sharing mechanisms",
            suggestion: "Block external export per policy; apply egress gates if user attempts share/export",
            policy_ref: Some("Data loss prevention / Egress policy"),
        },
        
        // Security - Audit Manipulation (CRITICAL - NEW)
        DetectionPattern {
            id: "security-audit-manipulation",
            category: "security",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(delete|remove|undo|clear|overwrite).{0,15}(audit|log|entry|record|history)\b",
                r"(?i)\baudit.{0,10}(log|trail|history).{0,15}(delete|remove|clear|undo)\b",
            ],
            exclusions: vec![],
            title: "SECURITY: Audit Manipulation Attempt",
            description: "Content contains language attempting to modify audit trail",
            suggestion: "Audit logs are immutable; document this attempt; review for integrity concerns",
            policy_ref: Some("Audit integrity / HIPAA"),
        },
        
        // ============================================
        // P0 - INTEGRITY (CRITICAL)
        // ============================================
        
        // Integrity - Omission
        DetectionPattern {
            id: "integrity-omit",
            category: "integrity",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(don.?t|do not) want.{0,20}(in writing|in the (note|record|chart|file)|documented)\b",
                r"(?i)\b(off the record|between us|just between|our secret)\b",
                r"(?i)\bdon.?t (write|document|put|include|mention).{0,20}(down|this|that|it|about)\b",
            ],
            exclusions: vec![],
            title: "Documentation Omission Request",
            description: "Client requested content be omitted",
            suggestion: "Document this request and your response per policy",
            policy_ref: Some("Documentation standards"),
        },
        
        // Integrity - Alter
        DetectionPattern {
            id: "integrity-alter",
            category: "integrity",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(delete|erase|remove|take out|clean up).{0,20}(from|the|that|this|it|last|note|record)\b",
                r"(?i)\b(keep|make).{0,10}(it )?(vague|generic|brief)\b.{0,15}(going forward|from now)\b",
            ],
            exclusions: vec![],
            title: "Record Alteration Request",
            description: "Request to modify or delete documentation",
            suggestion: "Explain amendment policy; document the request",
            policy_ref: Some("Medical record procedures"),
        },
        
        // ============================================
        // P1 - DOCUMENTATION COMPLETENESS
        // ============================================
        
        // Documentation - Risk vs Intervention Mismatch (NEW)
        DetectionPattern {
            id: "doc-risk-intervention",
            category: "documentation",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\brisk.{0,10}(moderate|elevated|high)\b",
            ],
            exclusions: vec![],
            title: "Elevated Risk Level - Verify Interventions",
            description: "Moderate or higher risk documented",
            suggestion: "Verify plan matches risk level: lethal means counseling, crisis resources, follow-up interval, welfare check criteria if needed",
            policy_ref: Some("Risk-intervention congruence"),
        },
        
        // Documentation - Diagnosis Deferred (NEW)
        DetectionPattern {
            id: "doc-dx-deferred",
            category: "documentation",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(dx|diagnosis|diagnostic).{0,15}(deferred|refused|declined|pending)\b",
                r"(?i)\b(refuses?|declined?).{0,15}(diagnostic|diagnosis|dx)\b",
            ],
            exclusions: vec![],
            title: "Diagnosis Deferred - Document Rationale",
            description: "Diagnosis deferred or declined by patient",
            suggestion: "Document rationale; ensure treatment focus clear; verify medical necessity for billing if applicable",
            policy_ref: Some("Medical necessity documentation"),
        },
        
        // ============================================
        // P1 - PRIVACY
        // ============================================
        
        // Privacy - Recording
        DetectionPattern {
            id: "privacy-recording",
            category: "privacy",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(record|recording|recorded).{0,15}(this |the )?(session|appointment|call)\b",
                r"(?i)\balready started recording\b",
            ],
            exclusions: vec![],
            title: "Session Recording",
            description: "Client indicated recording of session",
            suggestion: "Clarify policy; document consent status",
            policy_ref: Some("Recording consent policy"),
        },
        
        // Privacy - PHI transmission
        DetectionPattern {
            id: "privacy-phi-email",
            category: "privacy",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(send|email|text).{0,30}(personal email|gmail|yahoo|hotmail)\b",
                r"(?i)\b(email|text|send).{0,25}(details|notes|plan|summary|history)\b",
            ],
            exclusions: vec![],
            title: "PHI Transmission Request",
            description: "Request to send clinical content via potentially unsecure channel",
            suggestion: "Use HIPAA-compliant channels; document boundary response",
            policy_ref: Some("HIPAA Security Rule"),
        },
        
        // ============================================
        // P1 - BOUNDARY
        // ============================================
        
        // Boundary - Contact
        DetectionPattern {
            id: "boundary-contact",
            category: "boundary",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\basked if.{0,10}(they |I )?can (message|text|call|contact|email)\b",
                r"(?i)\b(message|text|call).{0,10}(me|you).{0,15}(when|if|between|outside)\b",
                r"(?i)\bcan I.{0,15}(message|text|call|email).{0,10}(you|between|outside)\b",
            ],
            exclusions: vec![],
            title: "Between-Session Contact Request",
            description: "Request for between-session contact",
            suggestion: "Clarify boundaries; document crisis resources",
            policy_ref: Some("APA Ethics 3.05"),
        },
        
        // Boundary - Gift
        DetectionPattern {
            id: "boundary-gift",
            category: "boundary",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(bring|brought|give|gave|get|got).{0,15}(something|gift|present|coffee|card|flowers)\b",
                r"(?i)\bsmall.{0,10}like (coffee|card|gift|something)\b",
            ],
            exclusions: vec![],
            title: "Gift Offer/Exchange",
            description: "Gift mentioned",
            suggestion: "Document boundary response per policy",
            policy_ref: Some("APA Ethics 3.05"),
        },
        
        // Boundary - Online Search
        DetectionPattern {
            id: "boundary-search",
            category: "boundary",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(looked (you |me )?up|googled|searched|found).{0,20}(online|profile|linkedin|facebook|background)\b",
            ],
            exclusions: vec![],
            title: "Online Searching",
            description: "Client searched clinician online",
            suggestion: "Address and document boundary discussion",
            policy_ref: Some("APA Ethics 3.05"),
        },
        
        // Boundary - Dependency
        DetectionPattern {
            id: "boundary-dependency",
            category: "boundary",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(best part of|favorite part of|look forward to).{0,15}(my |their )?(week|day)\b",
                r"(?i)\b(only (person|one)|you.?re the only).{0,20}\b(understand|get|listen|care|help)\b",
            ],
            exclusions: vec![],
            title: "Dependency Language",
            description: "Strong attachment or dependency expressed",
            suggestion: "Consider discussing support network",
            policy_ref: Some("APA Ethics 3.05"),
        },
        
        // ============================================
        // P2 - SAFETY FLAGS
        // ============================================
        
        // Surveillance
        DetectionPattern {
            id: "surveillance-monitoring",
            category: "safety",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(check|monitor|track|watch).{0,20}(schedule|location|whereabouts|when.{0,10}there)\b",
                r"(?i)\b(drove by|driving by|showed up at).{0,30}(office|work|house|home|their)\b",
                r"(?i)\bkeeping receipts\b",
            ],
            exclusions: vec![],
            title: "Surveillance Behavior",
            description: "Monitoring behavior toward another",
            suggestion: "Assess for stalking pattern; document reasoning",
            policy_ref: Some("Duty to warn/protect"),
        },
        
        // Protection/Weapon
        DetectionPattern {
            id: "surveillance-protection",
            category: "safety",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(something|got something|have something).{0,15}(for protection|to protect|in case|just in case)\b",
                r"(?i)\b(bought|have|got).{0,15}(protection|weapon).{0,10}(car|home|on me)\b",
            ],
            exclusions: vec![],
            title: "Protection/Weapon Reference",
            description: "Reference to protection or potential weapon",
            suggestion: "Clarify nature; assess safety if weapon",
            policy_ref: Some("Lethal means counseling"),
        },
        
        // Forensic/Letter
        DetectionPattern {
            id: "forensic-letter",
            category: "legal",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(write|need|want|get).{0,20}(letter|note|documentation).{0,30}(work|employer|HR|disability|accommodation)\b",
                r"(?i)\b(make it|sound).{0,10}(sound |more )?(medical|official|clinical|professional)\b",
            ],
            exclusions: vec![],
            title: "Accommodation Letter Request",
            description: "Request for documentation letter",
            suggestion: "Verify scope; document letter limits",
            policy_ref: Some("APA Ethics 9.01"),
        },
        
        // Substance
        DetectionPattern {
            id: "substance-ambiguous",
            category: "safety",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(taking|using).{0,15}(whatever.?s around|something|anything|stuff).{0,15}(sleep|knock|out|relax)\b",
                r"(?i)\bleftover.{0,15}(medication|meds|pills|stuff)\b",
                r"(?i)\ba little something.{0,10}(sleep|calm|relax)\b",
            ],
            exclusions: vec![],
            title: "Substance Use Concern",
            description: "Ambiguous or concerning substance use",
            suggestion: "Clarify substance type and assess safety",
            policy_ref: Some("Substance safety"),
        },
        
        // ============================================
        // P2 - COACHING
        // ============================================
        
        // Stigma
        DetectionPattern {
            id: "stigma-language",
            category: "ethics",
            severity: DetectionSeverity::Coach,
            patterns: vec![
                r"(?i)\b(manipulat(ive|ing)|attention[- ]?seeking|malingering|drug[- ]?seeking)\b",
            ],
            exclusions: vec![],
            title: "Stigmatizing Language",
            description: "Potentially stigmatizing terminology",
            suggestion: "Consider person-first, behavior-descriptive language",
            policy_ref: Some("APA Ethics 3.04"),
        },
        
        // Placeholder
        DetectionPattern {
            id: "placeholder",
            category: "integrity",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"\[insert",
                r"\[TODO",
                r"\[PLACEHOLDER",
                r"\[NAME\]",
                r"\[DATE\]",
                r"XXX",
            ],
            exclusions: vec![],
            title: "Placeholder Text",
            description: "Incomplete text detected",
            suggestion: "Replace placeholder with actual content",
            policy_ref: None,
        },
        
        // ============================================
        // P0 - MANDATORY REPORTING (CRITICAL)
        // ============================================
        
        // Child Abuse/Neglect - Mandatory Reporting
        DetectionPattern {
            id: "safety-abuse-child",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(child|minor|kid|son|daughter).{0,30}(abuse|abused|abusing|neglect|neglected|hit|hitting|beat|beaten|hurt|harmed)\b",
                r"(?i)\b(parent|caregiver|guardian|father|mother|mom|dad|stepparent).{0,30}(hit|hits|hitting|beat|beating|hurt|hurting|harm|harming|punish).{0,20}(child|kid|son|daughter|them|him|her)\b",
                r"(?i)\b(bruise|mark|injury|burn|welt|scar).{0,30}(unexplained|suspicious|couldn't explain|won't explain|no explanation)\b",
                r"(?i)\b(afraid|scared|frightened).{0,20}(go home|of parent|of dad|of mom|of father|of mother)\b",
                r"(?i)\b(disclosure|disclosed|discloses|reporting|reported).{0,20}(abuse|neglect|hitting|beating)\b",
                r"(?i)\b(CPS|child protective|DCFS|DCS|ACS|social services).{0,30}(involved|investigating|called|contacted|reported)\b",
            ],
            exclusions: vec![
                r"(?i)\b(denied|denies|no evidence|no indication|not substantiated|unfounded)\b.{0,30}\b(abuse|neglect)\b",
                r"(?i)\b(reported to|notified|contacted).{0,15}(CPS|child protective|authorities|police)\b",
            ],
            title: "MANDATORY REPORTING: Potential Child Abuse/Neglect",
            description: "Content suggests possible child abuse or neglect - mandatory reporting may apply",
            suggestion: "Review mandatory reporting requirements for your jurisdiction. Document: specific concerns, source of information, actions taken. If reportable, file report and document report number/date.",
            policy_ref: Some("State Mandatory Reporting Laws"),
        },
        
        // Elder Abuse/Neglect - Mandatory Reporting
        DetectionPattern {
            id: "safety-abuse-elder",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(elder|elderly|senior|older adult|aging parent|grandmother|grandfather).{0,30}(abuse|abused|neglect|neglected|exploit|exploited|mistreat)\b",
                r"(?i)\b(caregiver|family member|aide|nursing home|facility).{0,30}(neglect|mistreat|exploit|abuse|steal|taking money)\b",
                r"(?i)\b(financial|money|assets|savings|accounts).{0,30}(taking|stolen|missing|exploit|abuse|control)\b.{0,20}(elderly|senior|parent|grandparent)\b",
                r"(?i)\b(bruise|bedsore|malnutrition|dehydration|unexplained injury).{0,20}(elderly|senior|nursing home|care facility)\b",
                r"(?i)\b(APS|adult protective|elder abuse hotline).{0,30}(involved|investigating|called|contacted|reported)\b",
            ],
            exclusions: vec![
                r"(?i)\b(denied|denies|no evidence|no indication|APS notified|reported to APS)\b.{0,30}\b(abuse|neglect|exploitation)\b",
            ],
            title: "MANDATORY REPORTING: Potential Elder Abuse/Neglect",
            description: "Content suggests possible elder abuse, neglect, or financial exploitation",
            suggestion: "Review Adult Protective Services reporting requirements. Document specific concerns and source of information. File report if mandated and document actions taken.",
            policy_ref: Some("Adult Protective Services / Elder Abuse Reporting"),
        },
        
        // Vulnerable Adult Abuse
        DetectionPattern {
            id: "safety-abuse-vulnerable",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(disabled|disability|developmental|intellectual disability|dependent adult).{0,30}(abuse|abused|neglect|neglected|exploit|mistreat)\b",
                r"(?i)\b(group home|residential facility|day program).{0,30}(abuse|neglect|mistreat|restraint|seclusion)\b",
            ],
            exclusions: vec![
                r"(?i)\b(denied|denies|no evidence|reported to)\b",
            ],
            title: "MANDATORY REPORTING: Vulnerable Adult Concern",
            description: "Content suggests potential abuse or neglect of a vulnerable adult",
            suggestion: "Review reporting requirements for vulnerable adults in your jurisdiction. Document concerns and actions taken.",
            policy_ref: Some("Vulnerable Adult Protection"),
        },
        
        // ============================================
        // P0 - DUTY TO WARN / TARASOFF (CRITICAL)
        // ============================================
        
        // Duty to Warn - Identified Victim
        DetectionPattern {
            id: "safety-duty-warn",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(want|plan|going|gonna|will|intend).{0,15}(to )?(kill|shoot|stab|attack|hurt|harm).{0,20}(my|his|her|the|their).{0,15}(wife|husband|spouse|partner|ex|boss|neighbor|coworker|mother|father|brother|sister)\b",
                r"(?i)\bthreat.{0,30}(identified|specific|named|particular).{0,15}(person|victim|individual|target)\b",
                r"(?i)\b(know where|know when|found out where|following).{0,20}(live|work|go|be)\b.{0,30}(harm|hurt|kill|attack)\b",
                r"(?i)\b(bought|getting|have|got).{0,15}(gun|weapon|knife).{0,30}(for|use on|against)\b",
                r"(?i)\b(made|making|have).{0,15}(plan|plans).{0,20}(kill|harm|hurt|attack).{0,15}(specific|named|identified)\b",
            ],
            exclusions: vec![
                r"(?i)\b(denied|denies|no plan|no intent|no identified|general|non-specific|hypothetical)\b",
                r"(?i)\b(warn|warned|notified|contacted).{0,15}(potential victim|police|authorities)\b",
            ],
            title: "DUTY TO WARN: Potential Threat to Identifiable Third Party",
            description: "Content suggests threat to an identifiable person - Tarasoff duty may apply",
            suggestion: "Assess: (1) Is threat credible and imminent? (2) Is victim identifiable and reachable? (3) Does your jurisdiction require warning? Consult supervisor/legal if uncertain. Document assessment, actions taken, and rationale.",
            policy_ref: Some("Tarasoff v. Regents / Duty to Protect"),
        },
        
        // Duty to Warn - Escalating Threats
        DetectionPattern {
            id: "safety-threat-escalation",
            category: "safety",
            severity: DetectionSeverity::Attest,
            patterns: vec![
                r"(?i)\b(next time|if.{0,10}again|won't stop|can't stop).{0,20}(hurt|harm|kill|attack|violent)\b",
                r"(?i)\b(getting|becoming).{0,10}(harder|difficult).{0,15}(control|stop|resist).{0,15}(urge|impulse|thought|feeling).{0,15}(hurt|harm|kill|attack)\b",
                r"(?i)\b(closer|close).{0,10}(to )?(doing|acting|carrying out|following through)\b.{0,20}(threat|plan|idea)\b",
            ],
            exclusions: vec![
                r"(?i)\b(denied|denies|no plan|de-escalating|improving|better control)\b",
            ],
            title: "Threat Escalation Pattern",
            description: "Content suggests escalating risk of violence toward others",
            suggestion: "Complete violence risk assessment. Consider duty to warn if identifiable victim. Document risk factors, protective factors, and interventions.",
            policy_ref: Some("Violence Risk Assessment"),
        },
        
        // ============================================
        // P1 - CAPACITY AND DECISION-MAKING
        // ============================================
        
        // Capacity Concerns
        DetectionPattern {
            id: "doc-capacity-concern",
            category: "documentation",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(lacks|lacking|impaired|diminished|questionable).{0,20}(capacity|judgment|decision.?making|competence|competency)\b",
                r"(?i)\b(cannot|can't|unable).{0,20}(understand|comprehend|appreciate|make decisions|manage|care for)\b",
                r"(?i)\b(guardian|conservator|surrogate|power of attorney|POA|healthcare proxy).{0,20}(needed|required|consider|recommend|suggested)\b",
                r"(?i)\b(cognitive decline|dementia|confusion|disoriented|impaired judgment)\b.{0,30}(significant|severe|worsening|interfering)\b",
            ],
            exclusions: vec![
                r"(?i)\b(has capacity|demonstrates capacity|decisional capacity intact|no impairment|fully competent)\b",
            ],
            title: "Capacity Concern - Document Assessment",
            description: "Content suggests concerns about decision-making capacity",
            suggestion: "Consider formal capacity evaluation if not yet completed. Document specific functional deficits observed. Clarify which decisions are affected. Consider guardianship/conservatorship consultation if persistent.",
            policy_ref: Some("Capacity Assessment Standards"),
        },
        
        // Guardianship/Conservatorship
        DetectionPattern {
            id: "doc-guardianship",
            category: "documentation",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(has|under).{0,10}(guardian|conservator|legal representative)\b",
                r"(?i)\b(guardianship|conservatorship).{0,20}(in place|established|pending|seeking)\b",
                r"(?i)\b(ward of|legal custody|court-appointed)\b",
            ],
            exclusions: vec![],
            title: "Guardianship Status - Verify Consent",
            description: "Client may have guardian or conservator involvement",
            suggestion: "Verify guardian/conservator identity and authority. Ensure appropriate consents obtained. Document communication with legal representative.",
            policy_ref: Some("Consent and Guardianship"),
        },
        
        // ============================================
        // P1 - INFORMED CONSENT CONCERNS
        // ============================================
        
        // Consent Questions
        DetectionPattern {
            id: "doc-consent-unclear",
            category: "documentation",
            severity: DetectionSeverity::Flag,
            patterns: vec![
                r"(?i)\b(didn't|did not|never).{0,15}(sign|signed|consent|agree)\b.{0,20}(form|treatment|release|authorization)\b",
                r"(?i)\b(refuses?|declined?|won't).{0,15}(sign|consent|authorize|agree)\b",
                r"(?i)\b(pressured|forced|made).{0,10}(to )?(sign|consent|agree)\b",
            ],
            exclusions: vec![],
            title: "Consent Status - Clarification Needed",
            description: "Content suggests consent status may be unclear or contested",
            suggestion: "Review consent documentation. Address any concerns about informed consent process. Document discussion and resolution.",
            policy_ref: Some("Informed Consent Requirements"),
        },
    ];
}

fn normalize_text(text: &str) -> String {
    text
        .replace('\u{2019}', "'")  // right single quote
        .replace('\u{2018}', "'")  // left single quote
        .replace('\u{201C}', "\"") // left double quote
        .replace('\u{201D}', "\"") // right double quote
        .replace('\u{2013}', "-")  // en dash
        .replace('\u{2014}', "-")  // em dash
}

/// Analyze text for ethics issues
/// 
/// Returns both:
/// - EthicsAnalysis with full detection info (for display)
/// - StoredDetection list (for database, no evidence)
pub fn analyze(text: &str) -> EthicsAnalysis {
    let normalized = normalize_text(text);
    let mut detections = Vec::new();
    let mut stored_detections = Vec::new();
    
    for pattern_def in PATTERNS.iter() {
        // Check exclusions
        let excluded = pattern_def.exclusions.iter().any(|excl| {
            Regex::new(excl).map(|re| re.is_match(&normalized)).unwrap_or(false)
        });
        
        if excluded {
            continue;
        }
        
        // Check patterns
        for pattern_str in &pattern_def.patterns {
            if let Ok(re) = Regex::new(pattern_str) {
                if let Some(m) = re.find(&normalized) {
                    let detection_id = format!("{}-{}", pattern_def.id, m.start());
                    
                    // Store detection (offsets only, no text)
                    stored_detections.push(StoredDetection {
                        id: detection_id.clone(),
                        pattern_id: pattern_def.id.to_string(),
                        severity: pattern_def.severity,
                        match_start: m.start(),
                        match_end: m.end(),
                    });
                    
                    // Full detection with evidence (for display)
                    let evidence = extract_context(text, m.start(), m.end(), 50);
                    
                    detections.push(EthicsDetection {
                        id: detection_id,
                        severity: pattern_def.severity,
                        category: pattern_def.category.to_string(),
                        title: pattern_def.title.to_string(),
                        description: pattern_def.description.to_string(),
                        evidence,
                        suggestion: pattern_def.suggestion.to_string(),
                        policy_ref: pattern_def.policy_ref.map(|s| s.to_string()),
                        requires_attestation: pattern_def.severity == DetectionSeverity::Attest,
                    });
                    
                    break; // One detection per pattern type
                }
            }
        }
    }
    
    let attest_count = detections.iter().filter(|d| d.severity == DetectionSeverity::Attest).count();
    let flag_count = detections.iter().filter(|d| d.severity == DetectionSeverity::Flag).count();
    let coach_count = detections.iter().filter(|d| d.severity == DetectionSeverity::Coach).count();
    
    EthicsAnalysis {
        detections,
        stored_detections,
        attest_count,
        flag_count,
        coach_count,
    }
}

fn extract_context(text: &str, start: usize, end: usize, context_size: usize) -> String {
    let ctx_start = start.saturating_sub(context_size);
    let ctx_end = (end + context_size).min(text.len());
    
    let mut result = String::new();
    if ctx_start > 0 {
        result.push_str("...");
    }
    if let Some(slice) = text.get(ctx_start..ctx_end) {
        result.push_str(slice);
    }
    if ctx_end < text.len() {
        result.push_str("...");
    }
    result
}

/// Reconstruct detections with evidence from stored detections and note content
pub fn hydrate_detections(stored: &[StoredDetection], note_content: &str) -> Vec<EthicsDetection> {
    stored.iter().filter_map(|sd| {
        let pattern_def = PATTERNS.iter().find(|p| p.id == sd.pattern_id)?;
        let evidence = sd.get_evidence(note_content, 50);
        
        Some(EthicsDetection {
            id: sd.id.clone(),
            severity: sd.severity,
            category: pattern_def.category.to_string(),
            title: pattern_def.title.to_string(),
            description: pattern_def.description.to_string(),
            evidence,
            suggestion: pattern_def.suggestion.to_string(),
            policy_ref: pattern_def.policy_ref.map(|s| s.to_string()),
            requires_attestation: sd.severity == DetectionSeverity::Attest,
        })
    }).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_note_6_integrity() {
        let text = "they don't want it in writing";
        let analysis = analyze(text);
        assert!(analysis.detections.iter().any(|d| d.id.starts_with("integrity-omit")));
    }
    
    #[test]
    fn test_note_6_substance() {
        let text = "taking 'whatever's around' to knock themselves out";
        let analysis = analyze(text);
        assert!(analysis.detections.iter().any(|d| d.id.starts_with("substance")));
    }
    
    #[test]
    fn test_note_6_euphemism() {
        let text = "want to 'power down for a while'";
        let analysis = analyze(text);
        assert!(analysis.detections.iter().any(|d| d.id.starts_with("safety-si")));
    }
    
    #[test]
    fn test_note_8_boundary() {
        let text = "asked if they can message me 'when things spike'";
        let analysis = analyze(text);
        assert!(analysis.detections.iter().any(|d| d.id.starts_with("boundary-contact")));
    }
    
    #[test]
    fn test_note_9_no_false_telehealth() {
        let text = "it stays in the car";
        let analysis = analyze(text);
        assert!(!analysis.detections.iter().any(|d| d.id.starts_with("telehealth-privacy")));
    }
    
    #[test]
    fn test_note_10_no_hi() {
        let text = "could hurt them later in the case";
        let analysis = analyze(text);
        assert!(!analysis.detections.iter().any(|d| d.id.starts_with("safety-hi")));
    }
    
    #[test]
    fn test_stored_detection_evidence_reconstruction() {
        let text = "The client said they want to power down for a while and not be around.";
        let analysis = analyze(text);
        
        // Evidence should be reconstructable from offsets
        for stored in &analysis.stored_detections {
            let evidence = stored.get_evidence(text, 50);
            assert!(!evidence.is_empty());
        }
    }
}

import React, { useState, useEffect } from 'react';
import {
  Columns,
  Link,
  Play,
  Activity,
  Brain,
  FileCheck,
  GitBranch,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Rocket,
  Shield,
  Info,
  TrendingUp,
  BookOpen,
  X,
  ChevronRight as ChevronRightIcon,
  ClipboardCheck,
  Clock,
  Users,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StudyStatus = 'ready' | 'in-progress' | 'planned';

interface StudyCard {
  id: string;
  title: string;
  description: string;
  researchBasis: string;
  status: StudyStatus;
  icon: React.ReactNode;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const STUDIES: StudyCard[] = [
  {
    id: 'fullsession',
    title: 'Full Reading Session Demo',
    description:
      'End-to-end workflow: calibration \u2192 pre-AI assessment \u2192 AI exposure \u2192 reconciliation \u2192 export pack. Includes configurable accountability notification banner (Bernstein et al. 2023).',
    researchBasis: 'Human\u2013AI workflow / disclosure literature; Bernstein et al. (European Radiology, 2023) accountability effects',
    status: 'ready',
    icon: <Play size={24} />,
  },
  {
    id: 'inspector',
    title: 'Export Pack Inspector',
    description:
      'Inspect and verify completed export packs. Includes derived metrics CSV, event logs, ledger entries, and independent verification results.',
    researchBasis: '',
    status: 'ready',
    icon: <FileCheck size={24} />,
  },
  {
    id: 'hashchain',
    title: 'Sequence Integrity: Hash Chain Verification',
    description:
      'Verifies recorded event ordering and detects tampering via hash chaining.',
    researchBasis: 'Tamper-evident records; evidentiary authentication context (jurisdiction-dependent)',
    status: 'ready',
    icon: <Link size={24} />,
  },
  {
    id: 'contrast',
    title: 'The Contrast: STI Prevention',
    description:
      'Side-by-side: structured event log vs narrative summary to study attribution effects.',
    researchBasis: 'Pennington & Hastie (1992); Uleman STI framework',
    status: 'ready',
    icon: <Columns size={24} />,
  },
  {
    id: 'workload',
    title: 'Workload Monitoring & Cohort Comparison',
    description:
      'Descriptive timing metrics with cohort context (percentiles, medians) for research analysis.',
    researchBasis: 'Throughput\u2013accuracy / fatigue / vigilance literature (see Methods)',
    status: 'ready',
    icon: <Activity size={24} />,
  },
  {
    id: 'trust-trajectory',
    title: 'Trust Trajectory Dashboard',
    description:
      'Longitudinal measurement of human-AI trust calibration and behavioral patterns.',
    researchBasis: 'Jian et al. (2000) trust scale; automation bias literature',
    status: 'ready',
    icon: <TrendingUp size={24} />,
  },
  {
    id: 'counterfactual',
    title: 'Counterfactual Simulator',
    description:
      'Reconstruct alternative decision pathways: what if AI was/wasn\'t consulted?',
    researchBasis: 'T.J. Hooper doctrine; failure-to-utilize analysis',
    status: 'ready',
    icon: <GitBranch size={24} />,
  },
  {
    id: 'competency-report',
    title: 'Competency Report Generator',
    description:
      'Exportable competency dossier showing maintained AI-free diagnostic performance across periodic calibration sessions.',
    researchBasis: 'Deskilling prevention; corporate negligence / learned intermediary doctrine',
    status: 'ready',
    icon: <ClipboardCheck size={24} />,
  },
  {
    id: 'aiassistant',
    title: 'AI Research Assistant',
    description:
      'Research query capture and protocol notes (planned). Queries would be logged in the event record.',
    researchBasis: '',
    status: 'planned',
    icon: <Brain size={24} />,
    disabled: true,
  },
];

// ---------------------------------------------------------------------------
// Guided Demo Flow — step definitions
// ---------------------------------------------------------------------------

interface DemoStepDef {
  studyId: string;
  stepNumber: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
}

const DEMO_STEPS: DemoStepDef[] = [
  {
    studyId: 'fullsession',
    stepNumber: 'Step 1 of 5',
    title: 'Independent Assessment Capture',
    subtitle:
      'The radiologist reads and locks an impression before AI is available. No self-report, no extra clicks. The system documents what\u2019s already happening.',
    buttonLabel: 'Begin Reading Session',
  },
  {
    studyId: 'hashchain',
    stepNumber: 'Step 2 of 5',
    title: 'Sequence Integrity Verification',
    subtitle:
      'Every event is cryptographically chained. If anything is altered, reordered, or removed, the chain breaks. This is how the jury trusts the sequence.',
    buttonLabel: 'View Hash Chain',
  },
  {
    studyId: 'contrast',
    stepNumber: 'Step 3 of 5',
    title: 'Jury Attribution: Same Data, Two Framings',
    subtitle:
      'Identical verified events presented as a raw log vs. a contextualized narrative. Research on Spontaneous Trait Inference predicts which framing triggers \u201Ccareless\u201D and which doesn\u2019t.',
    buttonLabel: 'View The Contrast',
  },
  {
    studyId: 'workload',
    stepNumber: 'Step 4 of 5',
    title: 'Timing in Context',
    subtitle:
      'Individual read times rendered against practice-level percentiles and medians. \u201C2 minutes\u201D alone invites attribution. \u201C2 minutes at P45 for this practice\u201D neutralizes it.',
    buttonLabel: 'View Workload Metrics',
  },
  {
    studyId: 'inspector',
    stepNumber: 'Step 5 of 5',
    title: 'The Research & Legal Artifact',
    subtitle:
      'The complete export: events, ledger, derived metrics, verification results. Three views \u2014 Legal Defense, Clinical QA, and Research \u2014 from the same underlying record.',
    buttonLabel: 'Inspect Export Pack',
  },
];

// ---------------------------------------------------------------------------
// Journal-Ready Studies Data
// ---------------------------------------------------------------------------

type JournalCategory = 'radiology' | 'nejm-ai' | 'ajr-jacr' | 'other';

interface JournalStudy {
  id: number;
  title: string;
  researchQuestion: string;
  whyItMatters: string;
  design: string[];
  primaryEndpoint: string;
  secondaryEndpoints: string[];
  tertiaryEndpoint?: string;
  sampleSize: string;
  platformRequirements: string[];
  targetJournal: string;
  secondaryJournal: string;
  journalRationale: string;
  collaborators: string[];
  timeline: string;
  timelineBreakdown: string;
  journalCategory: JournalCategory;
  claimNote?: string;
}

const JOURNAL_STUDIES: JournalStudy[] = [
  {
    id: 1,
    title: 'Documentation Accountability and Automation Bias Mitigation',
    researchQuestion:
      'Does awareness of forensic documentation reduce automation bias in AI-assisted radiology?',
    whyItMatters:
      'Bernstein et al. (European Radiology, 2023) proved that telling radiologists their AI interaction would be "kept" in patient files reduced false positives (p=0.03). But that was a verbal manipulation. This study tests whether a DEPLOYABLE documentation system\u2014Evidify\u2019s forensic audit trail\u2014produces the same behavioral change. If it does, it provides the first evidence-based intervention for automation bias that practices can actually implement.',
    design: [
      'Design: Prospective, fully-crossed MRMC reader study with crossover',
      'Readers: 16 board-certified radiologists stratified by experience (4 subspecialists, 8 general, 4 fellows)',
      'Cases: 200 chest radiographs (100 with actionable findings, 100 normal), including 24 sham-AI cases (16 false positives, 8 false negatives) calibrated to 0.87 AUC',
      'Condition A: Standard PACS + AI without documentation awareness',
      'Condition B: Evidify audit trail active with explicit notification that decision sequence is being documented for potential review',
      'Washout: 4 weeks between sessions',
      'Randomization: Reader order and case order randomized; AI suggestions fixed across conditions',
    ],
    primaryEndpoint:
      'AUC difference between conditions (hypothesis: documentation awareness improves AUC by reducing both false positives from uncritical AI acceptance and false negatives from automation complacency)',
    secondaryEndpoints: [
      'False positive rate on sham-AI incorrect suggestions',
      'False negative rate on sham-AI missed findings',
      'Reading time per case (seconds)',
      'Confidence ratings (0\u2013100 continuous scale)',
      'AI agreement rate (% cases where final assessment matches AI)',
      'Override rate with vs without documented rationale',
    ],
    sampleSize:
      'Based on Dratsch et al. (2023) effect sizes, 16 readers \u00d7 200 cases provides 85% power to detect 0.04 AUC difference at \u03b1=0.05 using DBM-MRMC analysis (iMRMC calculator)',
    platformRequirements: [
      'Full Reading Session workflow',
      'HUMAN_FIRST enforcement',
      'Hash-chained event logging',
      'Documentation awareness notification',
      'Export Pack generation',
    ],
    targetJournal: 'Radiology',
    secondaryJournal: 'European Radiology',
    journalRationale:
      'Directly extends Bernstein et al. (2023) methodology with deployable technology. Radiology published Dratsch automation bias study (2023) and Gaube explanation study (2024). Framing: "From proof-of-concept to implementation: documentation accountability as an automation bias intervention"',
    collaborators: [
      'Grayson Baird: MRMC statistical design, power analysis, DBM-MRMC analysis plan',
      'Mike Bruno: Clinical workflow realism review, reader recruitment, case selection',
      'Mike Bernstein: Sham AI calibration methodology, replication of "kept vs deleted" paradigm',
    ],
    timeline: '18 months',
    timelineBreakdown: '6 months IRB + setup, 8 months data collection with washout, 4 months analysis + writing',
    journalCategory: 'radiology',
    claimNote: 'Will be completed at submission per Radiology: AI requirements',
  },
  {
    id: 2,
    title: 'Calibration Testing for Deskilling Prevention',
    researchQuestion:
      'Does periodic AI-free assessment maintain diagnostic accuracy and provide defensible competency documentation?',
    whyItMatters:
      'Colonoscopy studies show physician detection skills dropped when AI assistance was removed (deskilling effect). Hospitals face corporate negligence liability if radiologists become dependent on AI. The "learned intermediary" doctrine requires physicians to exercise independent judgment\u2014but no one has tested whether that capability persists after months of AI-assisted practice, or whether documentation of maintained competency provides legal protection.',
    design: [
      'Design: Longitudinal cohort with parallel control, 12-month follow-up',
      'Intervention Group: 20 radiologists at 2 sites using AI-assisted reading with monthly "calibration day" (20 cases read without AI via Evidify\u2019s Calibration Mode)',
      'Control Group: 20 radiologists at 2 matched sites using AI-assisted reading without calibration testing',
      'Assessment Schedule: Baseline, 3-month, 6-month, 12-month diagnostic accuracy testing on standardized case sets (50 cases each timepoint, held constant across sites)',
    ],
    primaryEndpoint:
      'Diagnostic accuracy (sensitivity + specificity) on AI-free test sets at 12 months, compared to baseline',
    secondaryEndpoints: [
      'Accuracy trajectory (slope of performance over time)',
      'Self-reported confidence on AI-free cases (NASA-TLX workload subscale)',
      'Trust Trajectory Dashboard metrics (agreement rate trend, override rate trend)',
      'Time-to-diagnosis on AI-free cases',
      'Qualitative feedback on calibration experience',
    ],
    tertiaryEndpoint:
      'Legal Validation: Generate "competency dossier" for each radiologist showing maintained accuracy. Mock deposition with tort attorney (Brian Shepherd) testing whether dossier provides defensible evidence of independent judgment capability. Rate: testimony survival, document credibility, attorney assessment of legal utility.',
    sampleSize:
      '20 radiologists per arm provides 80% power to detect 8% difference in sensitivity at 12 months (\u03b1=0.05, SD=12% based on published reader variability)',
    platformRequirements: [
      'Calibration Mode',
      'Trust Trajectory Dashboard',
      'Competency Report Generator',
      'Session-level performance analytics',
    ],
    targetJournal: 'Academic Radiology',
    secondaryJournal: 'Radiology Education section',
    journalRationale:
      'Academic Radiology publishes clinical education and QA studies. Framing: "Maintaining the learned intermediary: a calibration-based approach to AI deskilling prevention"',
    collaborators: [
      'Grayson Baird: Longitudinal design, mixed-effects modeling, trajectory analysis',
      'Mike Bruno: Multi-site coordination, clinical implementation, radiologist recruitment',
      'Brian Shepherd: Mock deposition protocol, legal utility assessment',
    ],
    timeline: '24 months',
    timelineBreakdown: '6 months setup + IRB, 12 months data collection, 6 months analysis + legal validation + writing',
    journalCategory: 'other',
  },
  {
    id: 3,
    title: 'Uncertainty Display and Dual-Outcome Liability Protection',
    researchQuestion:
      'Does displaying AI uncertainty metrics reduce BOTH automation bias in radiologists AND liability attribution by jurors?',
    whyItMatters:
      'Bernstein et al. (NEJM AI, 2025) showed that providing AI error rate context reduced perceived liability from 72.9% to 48.8%. But that study only measured juror perception\u2014not whether uncertainty display also changes radiologist behavior. This study bridges both: testing whether a single UI intervention (uncertainty metrics) produces benefits at BOTH the clinical decision level AND the legal attribution level. If successful, it provides the first evidence for an uncertainty display standard that protects radiologists on two fronts.',
    design: [
      'Phase 1 (Behavioral): MRMC reader study \u2014 12 radiologists reading 150 mammography cases with AI assistance',
      'Phase 1 Conditions: (A) AI with binary output only (B) AI with confidence score + false discovery rate + false omission rate',
      'Phase 1: Crossover design, 4-week washout',
      'Phase 2 (Legal Attribution): Jury simulation \u2014 600 Prolific participants (mock jurors), between-subjects design',
      'Phase 2 Vignette: AI-assisted mammography read with missed cancer, radiologist disagreed with AI',
      'Phase 2 Conditions: (A) No uncertainty information (B) Uncertainty metrics displayed and shown to jury (C) Uncertainty metrics displayed but radiologist ignored them',
      'Phase 3 (Integration): Link behavioral data to legal perception \u2014 for each Phase 1 override case, create vignette for Phase 2. Test whether documented uncertainty-informed override reduces liability attribution.',
    ],
    primaryEndpoint:
      'Phase 1: AUC difference between conditions. Phase 2: % finding radiologist negligent.',
    secondaryEndpoints: [
      'Reading time and AI agreement rate stratified by AI confidence level',
      'Override rate when AI confidence <70%',
      'Perceived radiologist competence and willingness to assign liability (Phase 2)',
      'Causal attribution: dispositional vs situational (Phase 2)',
    ],
    sampleSize:
      'Phase 1: 12 readers \u00d7 150 cases = 80% power for 0.05 AUC difference (DBM-MRMC). Phase 2: 200 participants per condition \u00d7 3 = 80% power to detect 15% difference in liability attribution (based on Bernstein et al. effect sizes).',
    platformRequirements: [
      'Configurable AI uncertainty display',
      'Confidence score / FDR / FOR metrics',
      'Override documentation with rationale',
      'TheContrast visualization',
      'Legal Defense export',
    ],
    targetJournal: 'NEJM AI',
    secondaryJournal: 'AJR',
    journalRationale:
      'Direct extension of Bernstein NEJM AI (2025). First study to measure dual outcomes (behavioral + legal) from same intervention. Framing: "Uncertainty as a dual-protection mechanism: effects on radiologist behavior and juror attribution"',
    collaborators: [
      'Grayson Baird: Phase 2 jury simulation design, replication of NEJM AI methodology',
      'Mike Bernstein: Phase 1 reader study design, integration of behavioral and legal endpoints',
      'Mike Bruno: Clinical validation of uncertainty display, mammography case selection',
    ],
    timeline: '20 months',
    timelineBreakdown: '4 months design + IRB, 6 months Phase 1, 4 months Phase 2, 2 months Phase 3 integration, 4 months analysis + writing',
    journalCategory: 'nejm-ai',
  },
  {
    id: 4,
    title: 'Forensic Documentation Format and Liability Attribution',
    researchQuestion:
      'Does Evidify-style forensic documentation reduce juror negligence attribution compared to standard medical records?',
    whyItMatters:
      'When AI-assisted reads result in missed findings, the radiologist\u2019s only defense is documentation showing they exercised independent judgment. Standard records (timestamps, final report) don\u2019t capture the decision PROCESS. Evidify\u2019s forensic documentation (timestamped assessment before AI reveal, reconciliation rationale, hash-verified sequence) creates a richer evidentiary record. This study tests whether that documentation format changes legal outcomes.',
    design: [
      'Design: Randomized vignette experiment (between-subjects)',
      'Participants: 800 adults via Prolific (mock jurors), stratified by education level',
      'Vignette: Malpractice scenario \u2014 AI-assisted chest radiograph, missed lung nodule, 14-month delayed cancer diagnosis',
      'Condition A: Standard documentation \u2014 timestamp of report, final impression, AI was available',
      'Condition B: Forensic documentation \u2014 Evidify export showing pre-AI assessment locked at 10:42:03, AI revealed at 10:43:17, radiologist maintained original assessment with documented rationale, hash verification of sequence integrity',
      'Condition C: Raw event log \u2014 timestamps only without narrative framing (control for STI hypothesis)',
      'Condition D: No documentation \u2014 verbal testimony only (baseline)',
    ],
    primaryEndpoint:
      '% of mock jurors finding radiologist negligent',
    secondaryEndpoints: [
      'Perceived radiologist competence (7-point scale)',
      'Perceived radiologist diligence (7-point scale)',
      'Spontaneous Trait Inference ratings (carelessness, rushedness \u2014 validates STI prevention thesis)',
      'Causal attribution (dispositional vs situational)',
      'Confidence in verdict',
    ],
    sampleSize:
      '200 per condition \u00d7 4 = 800 total. Provides 90% power to detect 12% difference between any two conditions (based on Bernstein NEJM AI effect sizes, \u03b1=0.05 with Bonferroni correction)',
    platformRequirements: [
      'Legal Defense export',
      'TheContrast visualization',
      'Hash verification display',
      'Cohort percentile contextualization',
    ],
    targetJournal: 'AJR',
    secondaryJournal: 'JACR',
    journalRationale:
      'AJR published Bernstein commentary on malpractice risk (2025). JACR covers medicolegal policy. Framing: "Documentation format as a liability intervention: how forensic AI audit trails affect juror perception"',
    collaborators: [
      'Brian Shepherd: Vignette development based on real malpractice patterns, legal accuracy review',
      'Grayson Baird: Experimental design, STI measurement methodology',
      'Mike Bernstein: Replication of NEJM AI jury simulation methodology',
    ],
    timeline: '12 months',
    timelineBreakdown: '3 months design + IRB, 2 months pilot testing, 3 months data collection, 4 months analysis + writing',
    journalCategory: 'ajr-jacr',
  },
  {
    id: 5,
    title: 'Workload Documentation and Institutional Liability',
    researchQuestion:
      'Can session-level fatigue metrics shift liability attribution from individual negligence to institutional responsibility?',
    whyItMatters:
      'Human factors research shows diagnostic accuracy degrades with fatigue and case volume. If errors occur late in long shifts, institutional understaffing may be the proximate cause. But current records don\u2019t capture workload context. Evidify\u2019s WorkloadMonitor tracks session duration, cases read, and cohort percentiles. This study tests whether presenting that context changes who jurors blame\u2014the individual radiologist or the institution that overworked them.',
    design: [
      'Phase 1 (Epidemiological): Retrospective analysis of Evidify deployment data \u2014 10,000+ cases from Study 1/2 sites',
      'Phase 1 Model: Error rate ~ f(session hour, cumulative cases, time-of-day, case complexity)',
      'Phase 1: Identify thresholds where accuracy significantly degrades (hypothesis: >6 hours, >50 cases)',
      'Phase 2 (Attribution): Jury simulation \u2014 400 Prolific participants (mock jurors), between-subjects',
      'Phase 2 Vignette: Missed finding on case 47 of a 12-hour shift',
      'Condition A: No workload context',
      'Condition B: Workload context showing radiologist in hour 10, case 47, above 95th percentile for daily volume',
      'Condition C: Workload context + explicit institutional understaffing pattern ("exceeded safe workload thresholds on 23 of last 30 days")',
    ],
    primaryEndpoint:
      'Phase 1: Odds ratio for error as function of session metrics. Phase 2: % attributing negligence to institution vs individual.',
    secondaryEndpoints: [
      'Perceived fairness of holding radiologist liable',
      'Recommended remediation (individual retraining vs institutional staffing change)',
      'Willingness to award damages against institution vs individual',
    ],
    sampleSize:
      'Phase 2: ~130 per condition \u00d7 3 = 400 total. Provides 80% power to detect 15% difference in attribution (based on analogous jury simulation studies)',
    platformRequirements: [
      'WorkloadMonitor',
      'Session duration tracking',
      'Cases-read counter',
      'Cohort percentile bands (P25/P50/P75/P95)',
      'Fatigue flag system',
      'Aggregated practice-level reporting',
    ],
    targetJournal: 'BMJ Quality & Safety',
    secondaryJournal: 'JACR',
    journalRationale:
      'BMJ QS publishes patient safety and systems-level analyses. JACR covers practice management and liability. Framing: "From individual blame to system accountability: workload documentation and liability attribution in AI-assisted radiology"',
    collaborators: [
      'Mike Bruno: Phase 1 data access, clinical interpretation of fatigue thresholds',
      'Grayson Baird: Phase 2 experimental design, attribution measurement',
      'Brian Shepherd: Institutional vs individual liability legal framework',
    ],
    timeline: '16 months',
    timelineBreakdown: '4 months Phase 1 analysis, 3 months IRB + Phase 2 design, 3 months data collection, 6 months integration + writing',
    journalCategory: 'other',
  },
];

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

const KEY_CITATIONS: string[] = [
  'Dratsch T et al. (2023). Automation Bias in Mammography. Radiology. 307(4):e222176.',
  'Bernstein MH et al. (2023). Can Incorrect AI Results Impact Radiologists? European Radiology. 33:8367\u20138376.',
  'Bernstein MH et al. (2025). Randomized Study of AI Impact on Perceived Legal Liability. NEJM AI. 2(1).',
  'Gaube S et al. (2024). Care to Explain? AI Explanation Types and Trust. Radiology. 310(1):e231286.',
  'Brady AP et al. (2024). Multi-Society Statement on AI in Radiology. JACR. 21(8):1292\u20131310.',
  'Rajpurkar P & Topol E. (2025). Beyond Assistance: Role Separation in AI. Radiology. 312(1):e243347.',
  'CLAIM Checklist (2024 Update). Radiology: AI. 6(1):e240300.',
];

const JOURNAL_TARGETING_SUMMARY =
  'Studies designed to meet specific journal requirements: Study 1 follows Radiology MRMC standards with CLAIM compliance. Studies 3\u20134 extend Bernstein NEJM AI methodology. Study 2 targets Academic Radiology education focus. Study 5 targets BMJ Quality & Safety systems perspective. All studies developed in consultation with Brown University BRPLL.';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusLabel(status: StudyStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'in-progress':
      return 'In Progress';
    case 'planned':
      return 'Planned';
  }
}

function statusClasses(status: StudyStatus): string {
  switch (status) {
    case 'ready':
      return 'bg-emerald-500/10 text-emerald-400';
    case 'in-progress':
      return 'bg-amber-500/10 text-amber-400';
    case 'planned':
      return 'bg-slate-500/10 text-slate-500';
  }
}

function journalBadgeClasses(category: JournalCategory): string {
  switch (category) {
    case 'radiology':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'nejm-ai':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'ajr-jacr':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'other':
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const Header: React.FC = () => (
  <header className="mb-12">
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Shield size={32} className="text-blue-400" />
          <h1 className="text-4xl font-semibold text-white tracking-tight">
            Evidify Research Platform
          </h1>
        </div>
        <p className="text-slate-400 text-lg mb-2 max-w-2xl leading-relaxed">
          Research instrumentation for documenting AI-assisted radiology reading workflows.
        </p>
        <p className="text-slate-500 text-sm mb-3">
          Joshua M. Henderson, PhD &mdash; Research Platform Architect
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700">
            Research Preview &mdash; Feb 2026
          </span>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Local-first
          </span>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Tamper-evident sequencing
          </span>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Research record (not clinical decision support)
          </span>
        </div>
      </div>
      <span className="hidden md:inline-block text-xs text-slate-600 font-mono mt-2">
        v0.9.0
      </span>
    </div>
  </header>
);

const Footer: React.FC = () => (
  <footer className="mt-16 pt-8 border-t border-slate-800 text-center text-sm text-slate-500 space-y-2">
    <p className="font-medium text-slate-400">
      Evidify Research Platform v0.9.0
    </p>
    <p>Local-first &bull; Hash-verified &bull; Designed for evidentiary scrutiny</p>
    <p className="flex flex-wrap justify-center gap-x-1.5">
      <a href="./docs/irb-tech-description.docx" download className="text-blue-400 hover:text-blue-300 underline underline-offset-2">IRB Technology Description</a> <span className="text-slate-600">&bull;</span>
      <a href="./docs/proof-of-concept-draft.docx" download className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Proof-of-Concept Paper Draft</a> <span className="text-slate-600">&bull;</span>
      <a href="./docs/observer-mode-spec.docx" download className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Observer Mode Spec</a> <span className="text-slate-600">&bull;</span>
      <a href="./docs/construct-model.docx" download className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Construct Model</a>
    </p>
    <p>Proposed for research collaboration with Brown University BRPLL</p>
    <p className="text-slate-600 text-xs mt-3">
      &copy; 2026 Evidify. All rights reserved.
    </p>
  </footer>
);

// ---------------------------------------------------------------------------
// CTA Row
// ---------------------------------------------------------------------------

interface CTARowProps {
  onLaunch: (id: string) => void;
}

const CTARow: React.FC<CTARowProps> = ({ onLaunch }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
    <button
      type="button"
      onClick={() => onLaunch('fullsession')}
      className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-all duration-200"
    >
      <Play size={18} />
      Start Reading Session
    </button>
    <button
      type="button"
      onClick={() => onLaunch('inspector')}
      className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-all duration-200"
    >
      <FileCheck size={18} />
      Inspect Export Pack
    </button>
    <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-sm text-slate-400">
      <Info size={16} className="flex-shrink-0 mt-0.5 text-slate-500" />
      <span>
        <span className="font-medium text-slate-300">Methods posture:</span>{' '}
        Records interaction events and timing in the UI. Hash chaining supports tamper-evident
        sequencing of recorded events. This is research instrumentation and does not provide
        diagnostic recommendations or clinical gating.
      </span>
    </div>
  </div>
);

interface CardProps {
  study: StudyCard;
  onSelect: (id: string) => void;
}

const Card: React.FC<CardProps> = ({ study, onSelect }) => {
  const disabled = study.disabled === true;

  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(study.id)}
      disabled={disabled}
      className={`
        text-left w-full rounded-xl p-6 border transition-all duration-200
        ${
          disabled
            ? 'bg-slate-900/30 border-slate-800/50 cursor-not-allowed opacity-50'
            : 'bg-slate-900/50 backdrop-blur-sm border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-900/50 hover:-translate-y-0.5 cursor-pointer'
        }
      `}
    >
      {/* Icon + status row */}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-slate-800/80 text-slate-400">
          {study.icon}
        </div>
        <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses(study.status)}`}
        >
          {statusLabel(study.status)}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2 leading-snug">
        {study.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-slate-400 leading-relaxed mb-3">
        {study.description}
      </p>

      {/* Research basis */}
      {study.researchBasis && (
        <p className="text-xs text-slate-500 italic mt-2">
          {study.researchBasis}
        </p>
      )}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Detail panel shown after selecting a study
// ---------------------------------------------------------------------------

interface DetailPanelProps {
  study: StudyCard;
  onLaunch: (id: string) => void;
  onBack: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ study, onLaunch, onBack }) => (
  <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
    <div className="flex items-start gap-4 mb-6">
      <div className="p-3 rounded-lg bg-slate-800/80 text-slate-400">
        {study.icon}
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-bold text-white mb-1">{study.title}</h2>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses(study.status)}`}
        >
          {statusLabel(study.status)}
        </span>
      </div>
    </div>

    <p className="text-slate-300 leading-relaxed mb-2">{study.description}</p>
    {study.researchBasis && (
      <p className="text-slate-500 text-sm italic mb-4">
        Methods context: {study.researchBasis}
      </p>
    )}
    {study.id === 'fullsession' && (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/50 mb-6">
        <Shield size={14} className="text-amber-400 flex-shrink-0" />
        <span className="text-amber-200 text-xs">
          Accountability banner active &mdash; configurable in Advanced settings (off / standard / explicit)
        </span>
      </div>
    )}

    <div className="flex gap-3 mt-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-400 hover:text-white transition-all duration-200"
      >
        <ArrowLeft size={16} />
        Back to Studies
      </button>
      <button
        type="button"
        onClick={() => onLaunch(study.id)}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold shadow-lg shadow-blue-600/20 transition-all duration-200"
      >
        <Rocket size={16} />
        Launch Study
      </button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Guided Demo Flow
// ---------------------------------------------------------------------------

interface GuidedDemoFlowProps {
  step: number;
  onLaunchStudy: (id: string) => void;
  onStepChange: (step: number) => void;
  onExit: () => void;
}

const GuidedDemoFlow: React.FC<GuidedDemoFlowProps> = ({
  step,
  onLaunchStudy,
  onStepChange,
  onExit,
}) => {
  const isComplete = step >= DEMO_STEPS.length;

  return (
    <div className="min-h-screen bg-slate-950/95 backdrop-blur-sm flex items-center justify-center px-6 relative">
      {/* Back to Studies — top left */}
      <button
        type="button"
        onClick={onExit}
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-all duration-200"
      >
        <ArrowLeft size={14} />
        Back to Studies
      </button>

      {isComplete ? (
        /* ---- Completion screen ---- */
        <div className="max-w-xl w-full mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center">
          <div className="text-blue-400 font-mono text-sm tracking-wider uppercase mb-4">
            Complete
          </div>
          <h2 className="text-2xl font-bold text-white">Demo Complete</h2>
          <p className="text-slate-400 leading-relaxed mt-3 mb-8">
            All five components documented a single workflow: capture &rarr;
            verify &rarr; contextualize &rarr; export.
          </p>

          {/* Progress dots — all filled */}
          <div className="flex items-center gap-1.5 justify-center mb-8">
            {DEMO_STEPS.map((_, i) => (
              <div key={i} className="h-1 w-10 rounded-full bg-blue-500" />
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-all duration-200"
            >
              <ArrowLeft size={16} />
              Back to Studies
            </button>
            <button
              type="button"
              onClick={() => onStepChange(0)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold shadow-lg shadow-blue-600/20 transition-all duration-200"
            >
              <RotateCcw size={16} />
              Restart Demo
            </button>
          </div>
        </div>
      ) : (
        /* ---- Transition screen ---- */
        <div className="max-w-xl w-full mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-8">
          <div className="text-blue-400 font-mono text-sm tracking-wider uppercase mb-2">
            {DEMO_STEPS[step].stepNumber}
          </div>
          <h2 className="text-2xl font-bold text-white">
            {DEMO_STEPS[step].title}
          </h2>
          <p className="text-slate-400 leading-relaxed mt-3 mb-8">
            {DEMO_STEPS[step].subtitle}
          </p>

          {/* Progress bar */}
          <div className="flex items-center gap-1.5 mb-8">
            {DEMO_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-blue-500' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Launch button */}
          <button
            type="button"
            onClick={() => onLaunchStudy(DEMO_STEPS[step].studyId)}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold shadow-lg shadow-blue-600/20 transition-all duration-200"
          >
            {DEMO_STEPS[step].buttonLabel}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Demo Flow Banner (landing page button)
// ---------------------------------------------------------------------------

interface DemoFlowBannerProps {
  onStart: () => void;
  onViewResearch: () => void;
}

const DemoFlowBanner: React.FC<DemoFlowBannerProps> = ({ onStart, onViewResearch }) => (
  <div className="mb-8">
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onStart}
        className="flex items-center gap-3 px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-lg font-semibold transition-all duration-200 shadow-lg shadow-blue-600/25"
      >
        <Play size={22} />
        Run BRPLL Demo Flow
      </button>
      <button
        type="button"
        onClick={onViewResearch}
        className="flex items-center gap-3 px-8 py-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-lg font-semibold transition-all duration-200"
      >
        <BookOpen size={22} />
        Proposed Studies
      </button>
    </div>
    <p className="text-slate-500 text-sm mt-2.5">
      Guided 5-step walkthrough &mdash; ~15 minutes
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// Research Opportunities Modal — Journal-Ready Studies
// ---------------------------------------------------------------------------

interface ResearchOpportunitiesModalProps {
  onClose: () => void;
}

const ResearchOpportunitiesModal: React.FC<ResearchOpportunitiesModalProps> = ({ onClose }) => {
  const [expandedStudies, setExpandedStudies] = useState<Set<number>>(new Set());
  const [showCitations, setShowCitations] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const toggleStudy = (id: number) => {
    setExpandedStudies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`relative bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col transition-all duration-300 ${animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-800 p-6 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Journal-Ready Research Studies
              </h2>
              <p className="text-slate-400 text-sm">
                5 studies designed for radiology journal publication, developed with Brown University BRPLL
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {JOURNAL_STUDIES.map((study) => {
            const isExpanded = expandedStudies.has(study.id);
            return (
              <div
                key={study.id}
                className="border border-slate-800 rounded-xl bg-slate-900/50 overflow-hidden"
              >
                {/* Collapsed header */}
                <button
                  type="button"
                  onClick={() => toggleStudy(study.id)}
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-800/30 transition-colors duration-200"
                >
                  <ChevronRightIcon
                    size={18}
                    className={`flex-shrink-0 mt-0.5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-blue-400">
                        {String(study.id).padStart(2, '0')}
                      </span>
                      <h3 className="text-base font-semibold text-white">
                        {study.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-300 italic mb-2">
                      &ldquo;{study.researchQuestion}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${journalBadgeClasses(study.journalCategory)}`}
                      >
                        {study.targetJournal}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={12} />
                        {study.timeline}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-5 ml-7 border-t border-slate-800/50 pt-4 space-y-5">
                    {/* Why It Matters */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Why It Matters for Radiology Practice
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {study.whyItMatters}
                      </p>
                    </div>

                    {/* Study Design */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Study Design
                      </h4>
                      <ul className="space-y-1.5">
                        {study.design.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="flex-shrink-0 w-1 h-1 mt-2 rounded-full bg-blue-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Primary Endpoint */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Primary Endpoint
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {study.primaryEndpoint}
                      </p>
                    </div>

                    {/* Secondary Endpoints */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Secondary Endpoints
                      </h4>
                      <ul className="space-y-1">
                        {study.secondaryEndpoints.map((ep, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="flex-shrink-0 w-1 h-1 mt-2 rounded-full bg-slate-500" />
                            {ep}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Tertiary Endpoint (if present) */}
                    {study.tertiaryEndpoint && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                          Tertiary Endpoint (Legal Validation)
                        </h4>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {study.tertiaryEndpoint}
                        </p>
                      </div>
                    )}

                    {/* Sample Size */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Sample Size Justification
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {study.sampleSize}
                      </p>
                    </div>

                    {/* Platform Requirements */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Evidify Platform Requirements
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {study.platformRequirements.map((req) => (
                          <span
                            key={req}
                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-800/50"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Target Journal */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Target Journal
                      </h4>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${journalBadgeClasses(study.journalCategory)}`}
                        >
                          {study.targetJournal}
                        </span>
                        <span className="text-xs text-slate-500">primary</span>
                        <span className="text-slate-700 mx-1">/</span>
                        <span className="text-xs text-slate-400">{study.secondaryJournal}</span>
                        <span className="text-xs text-slate-500">secondary</span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed italic">
                        {study.journalRationale}
                      </p>
                    </div>

                    {/* Collaborators */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <Users size={12} />
                        Key Collaborators
                      </h4>
                      <ul className="space-y-1">
                        {study.collaborators.map((collab, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="flex-shrink-0 w-1 h-1 mt-2 rounded-full bg-emerald-400" />
                            {collab}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Timeline */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <Clock size={12} />
                        Timeline
                      </h4>
                      <p className="text-sm text-slate-300">
                        <span className="font-medium text-white">{study.timeline}</span>
                        <span className="text-slate-500 ml-2">({study.timelineBreakdown})</span>
                      </p>
                    </div>

                    {/* CLAIM Note */}
                    {study.claimNote && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-900/20 border border-blue-800/30">
                        <Info size={14} className="flex-shrink-0 mt-0.5 text-blue-400" />
                        <p className="text-xs text-blue-300">
                          <span className="font-medium">CLAIM Checklist:</span> {study.claimNote}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Journal Targeting Summary */}
          <div className="mt-4 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-sm text-slate-400 leading-relaxed">
              <span className="font-medium text-slate-300">Journal Targeting:</span>{' '}
              {JOURNAL_TARGETING_SUMMARY}
            </p>
          </div>

          {/* Citations — collapsible */}
          <div className="mt-2 border border-slate-800 rounded-xl bg-slate-900/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCitations(!showCitations)}
              className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-800/30 transition-colors duration-200"
            >
              <ChevronRightIcon
                size={16}
                className={`flex-shrink-0 text-slate-500 transition-transform duration-200 ${showCitations ? 'rotate-90' : ''}`}
              />
              <BookOpen size={16} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-300">
                Key References
              </h3>
              <span className="text-xs text-slate-500">
                ({KEY_CITATIONS.length})
              </span>
            </button>
            {showCitations && (
              <div className="px-4 pb-4 ml-7 border-t border-slate-800/50 pt-3">
                <ul className="space-y-2">
                  {KEY_CITATIONS.map((citation, i) => (
                    <li key={i} className="text-xs text-slate-400 leading-relaxed">
                      {citation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-800 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Interested in collaborating?{' '}
            <a
              href="mailto:evidify.ai@gmail.com"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              evidify.ai@gmail.com
            </a>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface StudySelectorProps {
  /** Called when the user launches a study. Receives the study id string. */
  onLaunchStudy?: (studyId: string) => void;
  /** Current guided demo step (null = not in guided mode, 0-4 = step index, 5 = complete). */
  guidedStep?: number | null;
  /** Callback to change the guided step (null exits guided mode). */
  onGuidedStepChange?: (step: number | null) => void;
}

const StudySelector: React.FC<StudySelectorProps> = ({
  onLaunchStudy,
  guidedStep,
  onGuidedStepChange,
}) => {
  const [selectedStudy, setSelectedStudy] = useState<string | null>(null);
  const [showResearchModal, setShowResearchModal] = useState(false);

  const selected = STUDIES.find((s) => s.id === selectedStudy) ?? null;

  const handleLaunch = (id: string) => {
    if (onLaunchStudy) {
      onLaunchStudy(id);
    } else {
      alert(`Launching study: ${id}\n\nThis will be wired to the full component in a follow-up integration step.`);
    }
  };

  // Show guided demo flow when active
  if (guidedStep !== null && guidedStep !== undefined && onGuidedStepChange) {
    return (
      <GuidedDemoFlow
        step={guidedStep}
        onLaunchStudy={handleLaunch}
        onStepChange={onGuidedStepChange}
        onExit={() => onGuidedStepChange(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <Header />

        {/* Guided demo banner — shown when parent supports guided mode */}
        {onGuidedStepChange ? (
          <DemoFlowBanner
            onStart={() => onGuidedStepChange(0)}
            onViewResearch={() => setShowResearchModal(true)}
          />
        ) : (
          <div className="mb-8">
            <button
              type="button"
              onClick={() => setShowResearchModal(true)}
              className="flex items-center gap-3 px-8 py-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-lg font-semibold transition-all duration-200"
            >
              <BookOpen size={22} />
              Proposed Studies
            </button>
          </div>
        )}

        <CTARow onLaunch={handleLaunch} />

        {/* Study cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STUDIES.map((study) => (
            <Card
              key={study.id}
              study={study}
              onSelect={(id) => setSelectedStudy(id)}
            />
          ))}
        </div>

        {/* Detail panel for selected study */}
        {selected && (
          <DetailPanel
            study={selected}
            onLaunch={handleLaunch}
            onBack={() => setSelectedStudy(null)}
          />
        )}

        <Footer />
      </div>

      {/* Research Opportunities Modal */}
      {showResearchModal && (
        <ResearchOpportunitiesModal onClose={() => setShowResearchModal(false)} />
      )}
    </div>
  );
};

export default StudySelector;

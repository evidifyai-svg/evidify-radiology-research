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
      'End-to-end workflow: calibration \u2192 pre-AI assessment \u2192 AI exposure \u2192 reconciliation \u2192 export pack.',
    researchBasis: 'Human\u2013AI workflow / disclosure literature (see Methods)',
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
// Research Themes Data
// ---------------------------------------------------------------------------

type JournalTier = 'high' | 'specialty' | 'niche';

interface JournalTarget {
  name: string;
  tier: JournalTier;
  isPrimary?: boolean;
}

interface ResearchTheme {
  id: number;
  title: string;
  summary: string;
  researchQuestion: string;
  legalContext: string;
  studyDesign: string[];
  platformFeatures: string[];
  targetPublications: JournalTarget[];
  keyCollaborators: string;
}

const RESEARCH_THEMES: ResearchTheme[] = [
  {
    id: 1,
    title: 'Automation Bias & Uncertainty as Liability Shield',
    summary:
      'Can AI uncertainty metrics reduce liability when radiologists disagree with AI?',
    researchQuestion:
      'Does exposing jurors to AI uncertainty metrics reduce negligence attribution when radiologists disagree with AI?',
    legalContext:
      'Bernstein et al. (2025, Nature Health) showed jurors judged radiologists liable in ~75% of cases when AI caught something the radiologist missed, vs ~56% baseline. Critically, informing jurors of AI error rates significantly reduced blame.',
    studyDesign: [
      'Phase 1 (Behavioral): Instrument 30 radiologists reading 100 mammography cases each via Evidify. Randomize AI display: (A) binary output only, (B) confidence score + FDR/FOR. Measure automation bias via agreement rates, pre-AI assessment time, override patterns.',
      'Phase 2 (Jury Simulation): Create vignettes from Evidify logs. Present to 400 Prolific mock jurors (between-subjects). IV: uncertainty disclosure (present/absent). DV: negligence attribution, perceived competence, liability assignment.',
      'Power: 80% power to detect medium effect (d=0.4) with n=200/group.',
    ],
    platformFeatures: [
      'Event logging with timestamps',
      'AI confidence capture',
      'WorkloadMonitor cohort percentiles',
      'TheContrast dual-framing export',
    ],
    targetPublications: [
      { name: 'Radiology', tier: 'high', isPrimary: true },
      { name: 'NEJM AI', tier: 'high' },
      { name: 'Journal of the American College of Radiology', tier: 'specialty' },
    ],
    keyCollaborators:
      'Grayson Baird (MRMC design, jury attribution), Mike Bernstein (experimental design, replication of his Nature Health paradigm)',
  },
  {
    id: 2,
    title: 'Defining the AI Standard of Care (T.J. Hooper Threshold)',
    summary:
      'At what performance threshold does failure to use AI constitute negligence?',
    researchQuestion:
      'At what performance threshold does failure to use AI constitute negligence?',
    legalContext:
      'The T.J. Hooper doctrine (1932) established that failing to use available beneficial technology can be negligence even if not yet industry custom. In radiology, AI now detects some cancers earlier than humans in research settings. The question is when "reasonable care" legally requires AI consultation.',
    studyDesign: [
      'Observational Phase: Deploy Evidify Observer Mode across 3 sites (estimated 10,000 cases over 6 months). Compare diagnostic accuracy, miss rates, time-to-diagnosis for AI-assisted vs. unassisted reads.',
      'Threshold Analysis: Use ROC analysis to identify inflection points where AI assistance yields statistically significant outcome improvements (target: NNT < 20 for clinically significant findings).',
      'Legal Survey: Present aggregated outcome data to panel of 20 malpractice attorneys and 20 risk managers. Structured interviews on standard-of-care implications.',
      'Retrospective Validation: Apply Counterfactual Simulator to 50 closed malpractice claims (partnership with insurer) \u2014 reconstruct what Evidify documentation would have shown.',
    ],
    platformFeatures: [
      'Observer Mode (passive PACS-adjacent capture)',
      'Counterfactual Simulator',
      'Outcome tracking integration',
    ],
    targetPublications: [
      { name: 'Radiology', tier: 'high', isPrimary: true },
      { name: 'JAMA Health Forum', tier: 'high' },
      { name: 'Lancet Digital Health', tier: 'high' },
    ],
    keyCollaborators:
      'Mike Bruno (clinical workflow, multi-site coordination), Brian Shepherd (legal analysis, insurer connections)',
  },
  {
    id: 3,
    title: 'Informed Consent for AI-Assisted Diagnosis',
    summary:
      'Which disclosure format maximizes patient comprehension without increasing refusal rates?',
    researchQuestion:
      'Which disclosure format maximizes patient comprehension without increasing refusal rates?',
    legalContext:
      'AMA ethics guidance states patients should have option to receive AI-enabled care or not. However, "black box" AI complicates meaningful consent \u2014 if physicians can\u2019t explain AI reasoning, can consent be truly informed? (Does Black Box AI Compromise Informed Consent?, Springer 2025)',
    studyDesign: [
      'Randomized A/B/C trial embedded in radiology scheduling workflow.',
      'Conditions: (A) Plain disclosure: "AI tool assists, ~90% accurate, radiologist reviews everything" (B) Technical disclosure: "Deep learning algorithm, black-box, small error chance" (C) Visual infographic with confidence intervals.',
      'N=600 patients (200/group), stratified by age and education.',
      'Primary outcomes: comprehension quiz score (5 items), consent rate, time spent on form.',
      'Secondary outcomes: trust in diagnostic process (validated scale), qualitative concerns.',
      'Evidify logs interaction with consent interface (scroll depth, time on each section, "learn more" clicks).',
    ],
    platformFeatures: [
      'Consent module with interaction logging',
      'Comprehension quiz integration',
      'Demographic capture',
    ],
    targetPublications: [
      { name: 'Journal of Medical Ethics', tier: 'specialty', isPrimary: true },
      { name: 'Patient Education and Counseling', tier: 'specialty' },
      { name: 'AJOB', tier: 'niche' },
    ],
    keyCollaborators: 'Mike Bernstein (experimental design), IRB liaison',
  },
  {
    id: 4,
    title: 'Preventing Deskilling via Calibration Testing',
    summary:
      'Does periodic AI-free assessment maintain radiologist competency and provide liability documentation?',
    researchQuestion:
      'Does periodic AI-free assessment maintain radiologist competency and provide liability documentation?',
    legalContext:
      'Colonoscopy AI studies show physician detection skills dropped when AI assistance removed (deskilling effect). Hospitals face corporate negligence liability if they fail to ensure staff competency when implementing AI. The "learned intermediary" doctrine requires physicians to actually exercise independent judgment.',
    studyDesign: [
      'Longitudinal cohort: 40 radiologists across 4 institutions, 12-month follow-up.',
      'Intervention: Monthly "calibration day" \u2014 20 cases read without AI (Evidify withholds AI output).',
      'Control: Standard AI-assisted workflow only (matched historical cohort).',
      'Primary outcome: Diagnostic accuracy on no-AI cases at months 1, 6, 12.',
      'Secondary outcomes: Self-reported confidence (NASA-TLX workload), Trust Trajectory Dashboard metrics, time-to-diagnosis.',
      'Competency documentation: Generate quarterly "competency dossier" for each radiologist showing maintained skills.',
      'Legal validation: Mock deposition with Brian Shepherd using competency dossier as evidence.',
    ],
    platformFeatures: [
      'Calibration Mode (selective AI withholding)',
      'Trust Trajectory Dashboard',
      'Performance analytics',
      'Competency report generator',
    ],
    targetPublications: [
      { name: 'Academic Radiology', tier: 'specialty', isPrimary: true },
      { name: 'Journal of Digital Imaging', tier: 'specialty' },
      { name: 'Radiology', tier: 'high' },
    ],
    keyCollaborators:
      'Grayson Baird (psychometrics, longitudinal design), Mike Bruno (clinical implementation)',
  },
  {
    id: 5,
    title: 'Counterfactual Analysis for Litigation Support',
    summary:
      'Can systematic counterfactual reconstruction inform both plaintiff and defense strategies?',
    researchQuestion:
      'Can systematic counterfactual reconstruction inform both plaintiff and defense strategies?',
    legalContext:
      'Malpractice litigation hinges on causation. Plaintiffs argue "AI would have caught this"; defense argues "AI also missed" or "AI had high false positive rate." Neither side currently has tools to systematically reconstruct alternative scenarios.',
    studyDesign: [
      'Retrospective case series: 100 closed radiology malpractice claims (partnership with malpractice insurer).',
      'For each case: (1) Reconstruct what Evidify would have documented (2) Run Counterfactual Simulator \u2014 what would AI have recommended? (3) Assess whether outcome documentation would have changed verdict/settlement.',
      'Classify cases: AI-would-have-caught, AI-also-missed, AI-false-positive-risk.',
      'Develop taxonomy of documentation gaps that Evidify addresses.',
      'Calculate ROI: estimated settlement reduction if Evidify documentation available.',
    ],
    platformFeatures: [
      'Counterfactual Simulator',
      'Legal Defense export',
      'Research export (complete event stream)',
    ],
    targetPublications: [
      { name: 'Journal of the American College of Radiology', tier: 'specialty', isPrimary: true },
      { name: 'DePaul Journal of Health Care Law', tier: 'niche' },
      { name: 'Journal of Law and the Biosciences', tier: 'niche' },
    ],
    keyCollaborators:
      'Brian Shepherd (litigation expertise, insurer introductions)',
  },
  {
    id: 6,
    title: 'Workload Documentation as Mitigating Factor',
    summary:
      'Can session-level fatigue metrics shift liability from individual to institutional negligence?',
    researchQuestion:
      'Can session-level fatigue metrics shift liability from individual to institutional negligence?',
    legalContext:
      'Human factors research shows diagnostic accuracy degrades with fatigue and case volume. If errors occur late in long shifts, institutional understaffing may be the proximate cause, not individual carelessness.',
    studyDesign: [
      'Retrospective analysis of Evidify logs from Theme 2 deployment (10,000 cases).',
      'Model: Error rate ~ f(session hour, cumulative cases, time-of-day, case complexity).',
      'Identify thresholds: At what point does accuracy drop significantly? (Hypothesis: >6 hours continuous, >50 cases/day).',
      'Legal framing study: Present 200 mock jurors with identical error case, varying only workload documentation. IV: workload context (absent, present showing hour-8 of shift, present showing institutional understaffing pattern). DV: individual vs. institutional negligence attribution.',
    ],
    platformFeatures: [
      'WorkloadMonitor with session duration',
      'Cases-read counter',
      'Cohort percentile bands',
      'Fatigue flag alerts',
    ],
    targetPublications: [
      { name: 'BMJ Quality & Safety', tier: 'high', isPrimary: true },
      { name: 'Human Factors', tier: 'high' },
      { name: 'Academic Radiology', tier: 'specialty' },
    ],
    keyCollaborators:
      'Mike Bruno (clinical operations data), Grayson Baird (attribution study design)',
  },
  {
    id: 7,
    title: 'Longitudinal Trust Calibration Dynamics',
    summary:
      'Can behavioral metrics predict automation bias onset before it causes errors?',
    researchQuestion:
      'Can behavioral metrics predict automation bias onset before it causes errors?',
    legalContext:
      'Automation bias develops gradually. Early detection enables intervention before patient harm. The platform can serve as both measurement instrument and early warning system.',
    studyDesign: [
      'Prospective cohort: All radiologists from Theme 4 (n=40), 12-month follow-up.',
      'Weekly metrics: Agreement rate, override rate, pre-AI assessment time, AI confidence correlation.',
      'Monthly surveys: Jian et al. (2000) Trust in Automation scale, NASA-TLX.',
      'Define "automation bias trajectory" phenotypes: (A) Stable calibration (B) Gradual drift toward over-trust (C) Rapid onset (D) Under-utilization.',
      'Validation: Correlate trajectories with diagnostic accuracy, error patterns.',
      'Intervention arm (exploratory): When trajectory enters "warning zone," trigger feedback + calibration session.',
    ],
    platformFeatures: [
      'Trust Trajectory Dashboard',
      'Jian scale integration',
      'Behavioral pattern detection',
      'Alert system',
    ],
    targetPublications: [
      { name: 'Human Factors', tier: 'high', isPrimary: true },
      { name: 'Applied Ergonomics', tier: 'specialty' },
      { name: 'JAMIA', tier: 'specialty' },
    ],
    keyCollaborators: 'Grayson Baird (psychometrics, trust measurement)',
  },
  {
    id: 8,
    title: 'Expert Witness Testimony Effectiveness',
    summary:
      'Does structured narrative export improve expert testimony coherence and jury comprehension?',
    researchQuestion:
      'Does structured narrative export improve expert testimony coherence and jury comprehension?',
    legalContext:
      'Expert witnesses must translate technical logs into jury-comprehensible narratives. Raw timestamps and event logs may trigger Spontaneous Trait Inference (Uleman et al., 1996; Pennington & Hastie Story Model, 1992). Structured narratives with cohort context may neutralize this effect.',
    studyDesign: [
      'Phase 1 (Expert preparation): 10 board-certified radiologists who serve as expert witnesses. Each receives same malpractice case. Randomize: (A) Raw Evidify event log (B) Legal Defense export with cohort framing. Measure: time to prepare testimony, self-rated confidence.',
      'Phase 2 (Mock trial): Video-record expert testimony from each condition. Present to 200 mock jurors. Measure: perceived expert credibility, comprehension of timeline, verdict preference.',
      'Phase 3 (Cross-examination): Brian Shepherd conducts mock cross-examination of each expert. Rate: testimony survival, consistency, vulnerability to impeachment.',
    ],
    platformFeatures: [
      'Legal Defense export',
      'Research export (raw)',
      'TheContrast side-by-side visualization',
    ],
    targetPublications: [
      { name: 'Journal of Forensic Sciences', tier: 'niche', isPrimary: true },
      { name: 'Law and Human Behavior', tier: 'niche' },
      { name: 'JACR', tier: 'specialty' },
    ],
    keyCollaborators:
      'Brian Shepherd (mock cross-examination, expert witness coaching)',
  },
];

// ---------------------------------------------------------------------------
// Key References
// ---------------------------------------------------------------------------

const KEY_REFERENCES: string[] = [
  'Bernstein et al. (2025). AI assistance and diagnostic accuracy. Nature Health.',
  'Jian, Bisantz & Drury (2000). Foundations for an empirically determined scale of trust in automated systems. International Journal of Cognitive Ergonomics.',
  'Pennington & Hastie (1992). Explaining the evidence: Tests of the Story Model for juror decision making. Journal of Personality and Social Psychology.',
  'Uleman, Newman & Moskowitz (1996). People as flexible interpreters: Evidence and issues from spontaneous trait inference. Advances in Experimental Social Psychology.',
  'T.J. Hooper, 60 F.2d 737 (2d Cir. 1932).',
  'AMA Council on Ethics (2024). Augmented Intelligence in Health Care.',
];

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

function journalTierClasses(tier: JournalTier): string {
  switch (tier) {
    case 'high':
      return 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50';
    case 'specialty':
      return 'bg-blue-900/30 text-blue-300 border-blue-800/50';
    case 'niche':
      return 'bg-slate-700/30 text-slate-400 border-slate-600/50';
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
      <p className="text-slate-500 text-sm italic mb-6">
        Methods context: {study.researchBasis}
      </p>
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
// Research Opportunities Modal
// ---------------------------------------------------------------------------

interface ResearchOpportunitiesModalProps {
  onClose: () => void;
}

const ResearchOpportunitiesModal: React.FC<ResearchOpportunitiesModalProps> = ({ onClose }) => {
  const [expandedThemes, setExpandedThemes] = useState<Set<number>>(new Set());
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

  const toggleTheme = (id: number) => {
    setExpandedThemes((prev) => {
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
        className={`relative bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col transition-all duration-300 ${animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-800 p-6 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Research Opportunities Enabled by Evidify
              </h2>
              <p className="text-slate-400 text-sm">
                Proposed studies leveraging the platform&rsquo;s unique data capture capabilities
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
          {RESEARCH_THEMES.map((theme) => {
            const isExpanded = expandedThemes.has(theme.id);
            return (
              <div
                key={theme.id}
                className="border border-slate-800 rounded-xl bg-slate-900/50 overflow-hidden"
              >
                {/* Collapsible header */}
                <button
                  type="button"
                  onClick={() => toggleTheme(theme.id)}
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-800/30 transition-colors duration-200"
                >
                  <ChevronRightIcon
                    size={18}
                    className={`flex-shrink-0 mt-0.5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-blue-400">
                        {String(theme.id).padStart(2, '0')}
                      </span>
                      <h3 className="text-base font-semibold text-white">
                        {theme.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-400">{theme.summary}</p>
                  </div>
                </button>

                {/* Expandable details */}
                {isExpanded && (
                  <div className="px-4 pb-5 ml-7 border-t border-slate-800/50 pt-4 space-y-4">
                    {/* Research Question */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Research Question
                      </h4>
                      <p className="text-sm text-blue-200 leading-relaxed italic">
                        &ldquo;{theme.researchQuestion}&rdquo;
                      </p>
                    </div>

                    {/* Legal Context */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Legal Context
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {theme.legalContext}
                      </p>
                    </div>

                    {/* Study Design */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Study Design
                      </h4>
                      <ul className="space-y-1.5">
                        {theme.studyDesign.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Platform Features */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Platform Features Required
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {theme.platformFeatures.map((feature) => (
                          <span
                            key={feature}
                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-800/50"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Target Publications */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Target Publications
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {theme.targetPublications.map((pub) => (
                          <span
                            key={pub.name}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${journalTierClasses(pub.tier)}`}
                          >
                            {pub.isPrimary && (
                              <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                            )}
                            {pub.name}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-900/50 border border-emerald-800/50" />
                          High-impact
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-900/50 border border-blue-800/50" />
                          Specialty
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-slate-700/50 border border-slate-600/50" />
                          Niche/Legal
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Primary target
                        </span>
                      </div>
                    </div>

                    {/* Key Collaborators */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Key Collaborators
                      </h4>
                      <p className="text-sm text-slate-300">
                        {theme.keyCollaborators}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Journal Target Summary */}
          <div className="mt-4 p-4 rounded-xl bg-slate-800/30 border border-slate-800">
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300">Journal target summary:</span>{' '}
              Primary targets include <span className="text-emerald-400">Radiology</span> (Themes 1, 2, 4),{' '}
              <span className="text-blue-300">Academic Radiology</span> (Theme 4),{' '}
              <span className="text-emerald-400">BMJ Quality &amp; Safety</span> (Theme 6),{' '}
              <span className="text-emerald-400">Human Factors</span> (Theme 7), and specialty legal/ethics journals.
              Study designs developed in consultation with Brown University BRPLL.
            </p>
          </div>

          {/* Key References — collapsible */}
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
              <BookOpen size={16} className="flex-shrink-0 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-300">
                Key References
              </h3>
            </button>
            {showCitations && (
              <div className="px-4 pb-4 ml-7 border-t border-slate-800/50 pt-3">
                <ul className="space-y-2">
                  {KEY_REFERENCES.map((ref, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                      <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-slate-500" />
                      {ref}
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

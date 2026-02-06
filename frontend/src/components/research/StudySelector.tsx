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
// Research Themes Data
// ---------------------------------------------------------------------------

interface ResearchTheme {
  id: number;
  title: string;
  summary: string;
  legalContext: string;
  hypothesis: string;
  studyDesign: string[];
  platformFeatures: string[];
  targetPublications: string[];
  keyCollaborator: string;
}

const RESEARCH_THEMES: ResearchTheme[] = [
  {
    id: 1,
    title: 'Automation Bias & Disagreement Liability',
    summary: 'Can AI uncertainty metrics serve as a \u201Cliability shield\u201D for radiologists?',
    legalContext:
      'Radiologists face heightened liability when they disagree with AI. Mock jury studies show jurors judge radiologists more harshly when AI catches something they missed.',
    hypothesis:
      'Exposing clinicians and jurors to AI uncertainty metrics (confidence levels, error rates) will mitigate automation bias and reduce liability attribution.',
    studyDesign: [
      'Instrument reading sessions with varying AI transparency levels',
      'Create malpractice vignettes from Evidify logs',
      'Present to mock jurors, measure negligence attribution',
      'Compare scenarios with/without uncertainty disclosure',
    ],
    platformFeatures: ['Event logging', 'AI confidence capture', 'Legal Defense export', 'TheContrast visualization'],
    targetPublications: ['NEJM AI', 'JACR', 'Journal of Law and the Biosciences'],
    keyCollaborator: 'Grayson Baird (jury perception), Mike Bernstein (experimental design)',
  },
  {
    id: 2,
    title: 'Failure to Utilize AI (T.J. Hooper Risk)',
    summary: 'At what point does AI assistance become legally obligatory?',
    legalContext:
      'The T.J. Hooper doctrine holds that failing to use available, beneficial technology can be negligence. AI tools now outperform humans on some tasks.',
    hypothesis:
      'There exists a measurable clinical threshold at which AI assistance becomes part of the standard of care.',
    studyDesign: [
      'Multi-site comparison: outcomes with vs. without AI assistance',
      'Quantify miss rates, time to diagnosis, patient outcomes',
      'Identify inflection point where AI benefit is statistically significant',
      'Survey legal experts on standard of care implications',
    ],
    platformFeatures: ['Observer Mode (passive capture)', 'Counterfactual Simulator', 'Outcome tracking'],
    targetPublications: ['Radiology', 'JAMA', 'Lancet Digital Health'],
    keyCollaborator: 'Mike Bruno (clinical workflow), Brian Shepherd (legal analysis)',
  },
  {
    id: 3,
    title: 'Informed Consent & Black Box Disclosure',
    summary: 'How should AI involvement be disclosed to patients?',
    legalContext:
      'Patient autonomy requires informed consent. AI \u201Cblack boxes\u201D complicate disclosure \u2014 if doctors can\u2019t explain AI reasoning, can consent be meaningful?',
    hypothesis:
      'Simplified, transparent disclosure methods yield better patient comprehension without increasing refusal rates.',
    studyDesign: [
      'A/B test different AI consent form versions',
      'Measure comprehension scores, consent rates, patient attitudes',
      'Track interaction with consent interface via Evidify',
      'Compare plain language vs. technical disclosure',
    ],
    platformFeatures: ['Consent module', 'Interaction logging', 'Comprehension tracking'],
    targetPublications: ['Journal of Medical Ethics', 'Patient Education and Counseling', 'Lancet Digital Health'],
    keyCollaborator: 'Mike Bernstein (experimental design)',
  },
  {
    id: 4,
    title: 'Corporate Negligence & Physician Deskilling',
    summary: 'Can periodic \u201CAI-off\u201D tests prevent skill atrophy and reduce institutional liability?',
    legalContext:
      'Over-reliance on AI may erode clinical skills. Hospitals face corporate liability if they fail to ensure staff competency when implementing AI.',
    hypothesis:
      'Regular calibration tests where radiologists read without AI will maintain skills and provide documentation that institutions took reasonable steps.',
    studyDesign: [
      'Periodic no-AI reading sessions (Evidify withholds AI output)',
      'Compare performance with/without AI over 6\u201312 months',
      'Track skill trajectory, provide feedback on misses',
      'Compile competency documentation for legal defense',
    ],
    platformFeatures: ['Calibration Mode', 'Trust Trajectory Dashboard', 'Performance analytics'],
    targetPublications: ['Academic Radiology', 'Journal of Digital Imaging', 'JAMA Network Open'],
    keyCollaborator: 'Grayson Baird (psychometrics), Mike Bruno (clinical implementation)',
  },
  {
    id: 5,
    title: 'Counterfactual Litigation Analysis',
    summary: 'Reconstruct \u201Cwhat would have happened\u201D for both plaintiff and defense.',
    legalContext:
      'Litigation hinges on causation \u2014 would AI have caught the miss? Did AI also miss (supporting defense)?',
    hypothesis:
      'Systematic counterfactual analysis can inform both plaintiff claims and defense strategies.',
    studyDesign: [
      'Retrospective analysis of closed malpractice cases',
      'For each case, simulate what Evidify would have documented',
      'Determine how many outcomes would have changed',
    ],
    platformFeatures: ['Counterfactual Simulator', 'Event reconstruction', 'Dual-framing export'],
    targetPublications: ['Health law journals', 'JACR'],
    keyCollaborator: 'Brian Shepherd (litigation strategy)',
  },
  {
    id: 6,
    title: 'Fatigue & Workload as Mitigating Factor',
    summary: 'Can session metrics shift liability from individual to institutional negligence?',
    legalContext:
      'Errors late in long shifts may reflect systemic understaffing, not individual carelessness.',
    hypothesis:
      'Documented workload metrics can serve as mitigating evidence in malpractice defense.',
    studyDesign: [
      'Correlate timing metrics with error rates',
      'Identify thresholds (hour 6? case 40?) where accuracy drops',
      'Frame excessive workload as institutional failure',
    ],
    platformFeatures: ['Workload Monitor', 'Session duration tracking', 'Cohort percentiles'],
    targetPublications: ['BMJ Quality & Safety', 'Academic Radiology'],
    keyCollaborator: 'Mike Bruno (clinical operations)',
  },
  {
    id: 7,
    title: 'Trust Calibration Dynamics',
    summary: 'How does radiologist\u2013AI trust evolve over time?',
    legalContext:
      'Automation bias may develop gradually. Early detection enables intervention.',
    hypothesis:
      'Longitudinal tracking of agreement rates can predict automation bias onset.',
    studyDesign: [
      'Track individual radiologist\u2019s AI agreement rate over months',
      'Correlate with Jian trust scale self-reports',
      'Flag sudden shifts or concerning trends',
      'Intervene with targeted training',
    ],
    platformFeatures: ['Trust Trajectory Dashboard', 'Jian scale integration', 'Behavioral pattern detection'],
    targetPublications: ['Human Factors', 'Applied Ergonomics', 'JAMIA'],
    keyCollaborator: 'Grayson Baird (psychometrics)',
  },
  {
    id: 8,
    title: 'Expert Witness Preparation',
    summary: 'How should experts use Evidify data to construct testimony?',
    legalContext:
      'Expert witnesses need to translate technical logs into jury-comprehensible narratives.',
    hypothesis:
      'Structured narrative exports improve testimony coherence and jury comprehension.',
    studyDesign: [
      'Give experts same case with raw logs vs. Legal Defense export',
      'Measure testimony coherence, cross-examination survival',
      'Jury comprehension study',
    ],
    platformFeatures: ['Legal Defense export', 'Expert Witness Prep Mode (proposed)', 'TheContrast'],
    targetPublications: ['Law journals', 'Forensic psychology outlets'],
    keyCollaborator: 'Brian Shepherd (expert witness experience)',
  },
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
                    {/* Legal Context */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Legal Context
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {theme.legalContext}
                      </p>
                    </div>

                    {/* Hypothesis */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Hypothesis
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {theme.hypothesis}
                      </p>
                    </div>

                    {/* Study Design */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Study Design
                      </h4>
                      <ul className="space-y-1">
                        {theme.studyDesign.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="text-blue-400 mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-blue-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Platform Features */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Platform Features Used
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
                      <p className="text-sm text-slate-300">
                        {theme.targetPublications.join(' \u2022 ')}
                      </p>
                    </div>

                    {/* Key Collaborator */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Key Collaborator Role
                      </h4>
                      <p className="text-sm text-slate-300">
                        {theme.keyCollaborator}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-800 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Interested in collaborating?{' '}
            <a
              href="mailto:josh@evidify.ai"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              josh@evidify.ai
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

import React, { useState } from 'react';
import {
  Columns,
  Link,
  Play,
  Activity,
  Brain,
  FileCheck,
  ArrowLeft,
  Rocket,
  Shield,
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
    id: 'contrast',
    title: 'The Contrast: STI Prevention',
    description:
      'Side-by-side comparison of structured log vs. narrative documentation. Demonstrates how documentation format affects spontaneous trait inference.',
    researchBasis: 'Pennington & Hastie (1992); Uleman STI framework',
    status: 'ready',
    icon: <Columns size={24} />,
  },
  {
    id: 'hashchain',
    title: 'Temporal Proof: Hash Chain Verification',
    description:
      "Cryptographic proof that the radiologist's independent assessment was recorded before AI consultation. Visual walkthrough of tamper-evident documentation chain.",
    researchBasis: 'FRE 902(13)/(14); 12 V.S.A. §1913',
    status: 'ready',
    icon: <Link size={24} />,
  },
  {
    id: 'fullsession',
    title: 'Full Reading Session Demo',
    description:
      'Complete radiology reading workflow: calibration \u2192 independent read \u2192 AI consultation \u2192 deviation documentation \u2192 export pack generation with verification.',
    researchBasis: 'Bernstein et al. 2025 (Nature Health)',
    status: 'ready',
    icon: <Play size={24} />,
  },
  {
    id: 'workload',
    title: 'Workload Monitoring & Cohort Comparison',
    description:
      'Real-time throughput tracking with session duration index. Shows individual radiologist timing in context of practice cohort median.',
    researchBasis: 'Throughput-accuracy degradation literature',
    status: 'ready',
    icon: <Activity size={24} />,
  },
  {
    id: 'aiassistant',
    title: 'AI Research Assistant',
    description:
      'Literature-grounded AI consultation for clinical reasoning support. Queries are logged as part of the documentation chain.',
    researchBasis: '',
    status: 'planned',
    icon: <Brain size={24} />,
    disabled: true,
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
      return 'bg-green-500/20 text-green-400';
    case 'in-progress':
      return 'bg-amber-500/20 text-amber-400';
    case 'planned':
      return 'bg-slate-500/20 text-slate-400';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const Header: React.FC = () => (
  <header className="text-center mb-10">
    <div className="flex items-center justify-center gap-3 mb-4">
      <Shield size={32} className="text-blue-400" />
      <h1 className="text-3xl font-bold text-white tracking-tight">
        Evidify Research Platform
      </h1>
    </div>
    <p className="text-slate-300 text-lg mb-2">
      Radiology AI Governance Research Platform
    </p>
    <p className="text-slate-500 text-sm mb-3">
      Joshua M. Henderson, PhD &mdash; Research Platform Architect
    </p>
    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
      Research Preview &mdash; February 2026
    </span>
  </header>
);

const Footer: React.FC = () => (
  <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-sm text-slate-500 space-y-1">
    <p className="font-medium text-slate-400">
      Evidify Research Platform v0.9.0
    </p>
    <p>Local-first &bull; Hash-verified &bull; Daubert-ready</p>
    <p><a href="./docs/irb-tech-description.docx" download className="text-blue-400 hover:text-blue-300 underline">IRB Technology Description</a> &bull; <a href="./docs/proof-of-concept-draft.docx" download className="text-blue-400 hover:text-blue-300 underline">Proof-of-Concept Paper Draft</a></p>
    <p>Proposed for research collaboration with Brown University BRPLL</p>
    <p className="text-slate-600 text-xs mt-2">
      &copy; 2026 Evidify. All rights reserved.
    </p>
  </footer>
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
        text-left w-full rounded-xl p-5 border transition-all duration-200
        ${
          disabled
            ? 'bg-slate-800/40 border-slate-700/50 cursor-not-allowed opacity-60'
            : 'bg-slate-800/80 border-slate-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 hover:scale-[1.02] cursor-pointer'
        }
      `}
    >
      {/* Icon + status row */}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-slate-700/60 text-blue-400">
          {study.icon}
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses(study.status)}`}
        >
          {statusLabel(study.status)}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold mb-2 leading-snug">
        {study.title}
      </h3>

      {/* Description */}
      <p className="text-slate-400 text-sm leading-relaxed mb-3">
        {study.description}
      </p>

      {/* Research basis */}
      {study.researchBasis && (
        <p className="text-slate-500 text-xs italic">
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
  <div className="mt-8 rounded-xl border border-slate-700 bg-slate-800/60 p-8">
    <div className="flex items-start gap-4 mb-6">
      <div className="p-3 rounded-lg bg-slate-700/60 text-blue-400">
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
        Research basis: {study.researchBasis}
      </p>
    )}

    <div className="flex gap-3 mt-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Studies
      </button>
      <button
        type="button"
        onClick={() => onLaunch(study.id)}
        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
      >
        <Rocket size={16} />
        Launch Study
      </button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface StudySelectorProps {
  /** Called when the user launches a study. Receives the study id string. */
  onLaunchStudy?: (studyId: string) => void;
}

const StudySelector: React.FC<StudySelectorProps> = ({ onLaunchStudy }) => {
  const [selectedStudy, setSelectedStudy] = useState<string | null>(null);

  const selected = STUDIES.find((s) => s.id === selectedStudy) ?? null;

  const handleLaunch = (id: string) => {
    if (onLaunchStudy) {
      onLaunchStudy(id);
    } else {
      alert(`Launching study: ${id}\n\nThis will be wired to the full component in a follow-up integration step.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Header />

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
    </div>
  );
};

export default StudySelector;

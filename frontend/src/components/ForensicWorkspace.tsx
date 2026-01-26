// ForensicWorkspace.tsx
// ---------------------------------------------------------------------------
// Unified forensic evaluation interface (beta).
//
// This file previously contained an aspirational “all-in-one” shell that mixed
// evolving component APIs (props/types) across multiple iterations. That caused
// TypeScript build failures under `strict: true`.
//
// This v4.3.0-beta workspace is intentionally conservative:
// - It compiles cleanly.
// - It wires the major forensic components with valid props.
// - It uses PHI-free demo data by default (replace with real persistence later).

import React, { useMemo, useState } from 'react';
import {
  FileText,
  Upload,
  ListChecks,
  Clock,
  Fingerprint,
  Scale,
  ShieldCheck,
  Download,
} from 'lucide-react';

import { SidebarLayout, NavigationHeader, NavItem, Card, StatCard } from './ui-primitives';

import { EvidenceViewer } from './EvidenceViewer';
import { ClaimLedgerView } from './ClaimLedgerView';
import { ContradictionIntelligence } from './ContradictionIntelligence';
import { CrossExamReadinessMeter } from './CrossExamReadinessMeter';
import { MethodologyAppendixGenerator } from './MethodologyAppendixGenerator';
import { TimelineBuilder } from './TimelineBuilder';
import { FinalizeGates } from './FinalizeGates';
import { ReaderPackExport } from './ReaderPackExport';
import { OpinionChainExplainer } from './OpinionChainExplainer';

// ---------------------------------------------------------------------------
// Minimal shared shapes (structurally compatible with child components)
// ---------------------------------------------------------------------------

type CaseType = 'competency' | 'custody' | 'disability' | 'capacity' | 'fitness' | 'other';

interface ForensicCase {
  id: string;
  case_number: string;
  case_type: CaseType;
  evaluee_pseudonym: string;
  referral_source: string;
  referral_date: string;
  evaluation_date?: string;
}

interface EvidenceItem {
  id: string;
  filename: string;
  evidence_type: string | Record<string, unknown>;
  file_hash?: string;
  date_received?: string;
  relied_upon?: boolean;
  authenticity_status?: string;
}

interface Claim {
  id: string;
  claim_text?: string;
  text?: string;
  claim_type: string;
  section_id: string;
  citations: unknown[];
  verified?: boolean;
  vulnerability_tags?: string[];
}

interface Contradiction {
  id: string;
  claim_a_id: string;
  claim_b_id: string;
  type: string;
  resolution_status: 'unresolved' | 'resolved' | 'partially_resolved';
  resolution_note?: string;
  impacts_opinion: boolean;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

interface ReportSection {
  id: string;
  title: string;
  section_type: string;
  content?: string;
}

interface ValidationResult {
  is_valid: boolean;
  issues: Array<{ issue_type: string; message: string; claim_id?: string }>;
  warnings: Array<{ issue_type: string; message: string }>;
}

type ViewId =
  | 'overview'
  | 'evidence'
  | 'claims'
  | 'opinions'
  | 'contradictions'
  | 'timeline'
  | 'methodology'
  | 'gates'
  | 'export';

// ---------------------------------------------------------------------------
// Demo data (PHI-free)
// ---------------------------------------------------------------------------

function makeDemoCase(): ForensicCase {
  return {
    id: 'CASE-DEMO-001',
    case_number: 'DEMO-2026-001',
    case_type: 'competency',
    evaluee_pseudonym: 'Evaluee A',
    referral_source: 'Court Order (Demo)',
    referral_date: '2026-01-10',
    evaluation_date: '2026-01-12',
  };
}

function makeDemoEvidence(): EvidenceItem[] {
  return [
    {
      id: 'EV-001',
      filename: 'Police_Report_Excerpt.pdf',
      evidence_type: 'record',
      file_hash: 'demo_hash_001',
      date_received: '2026-01-10',
      relied_upon: true,
      authenticity_status: 'unverified',
    },
    {
      id: 'EV-002',
      filename: 'Collateral_Interview_Notes.txt',
      evidence_type: 'collateral',
      file_hash: 'demo_hash_002',
      date_received: '2026-01-11',
      relied_upon: true,
      authenticity_status: 'unverified',
    },
  ];
}

function makeDemoSections(): ReportSection[] {
  return [
    { id: 'SEC-1', title: 'Sources of Information', section_type: 'sources' },
    { id: 'SEC-2', title: 'Behavioral Observations', section_type: 'observations' },
    { id: 'SEC-3', title: 'Opinion', section_type: 'opinion' },
    { id: 'SEC-4', title: 'Limitations', section_type: 'limitations' },
  ];
}

function makeDemoClaims(): Claim[] {
  return [
    {
      id: 'CLM-001',
      claim_text: 'Evaluee A reported difficulty recalling the sequence of events.',
      claim_type: 'self_report',
      section_id: 'SEC-2',
      citations: [{ evidence_id: 'EV-002', excerpt: '...difficulty recalling...' }],
      verified: false,
    },
    {
      id: 'CLM-002',
      claim_text: 'Record indicates Evaluee A was oriented to person and place at booking.',
      claim_type: 'record_fact',
      section_id: 'SEC-1',
      citations: [{ evidence_id: 'EV-001', excerpt: '...oriented x2...' }],
      verified: true,
    },
    {
      id: 'CLM-OP-001',
      claim_text:
        'Based on the above, it is more likely than not that Evaluee A had adequate factual understanding at the time of evaluation.',
      claim_type: 'forensic_opinion',
      section_id: 'SEC-3',
      citations: [],
      verified: true,
    },
  ];
}

function makeDemoContradictions(): Contradiction[] {
  return [
    {
      id: 'CON-001',
      claim_a_id: 'CLM-001',
      claim_b_id: 'CLM-002',
      type: 'direct',
      resolution_status: 'unresolved',
      impacts_opinion: true,
      severity: 'medium',
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ForensicWorkspace({ onBack, onHome }: { onBack?: () => void; onHome?: () => void }) {
  const [view, setView] = useState<ViewId>('overview');
  const [currentCase] = useState<ForensicCase>(() => makeDemoCase());
  const [evidence] = useState<EvidenceItem[]>(() => makeDemoEvidence());
  const [sections] = useState<ReportSection[]>(() => makeDemoSections());
  const [claims, setClaims] = useState<Claim[]>(() => makeDemoClaims());
  const [contradictions, setContradictions] = useState<Contradiction[]>(() => makeDemoContradictions());

  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  const selectedEvidence = useMemo(
    () => evidence.find((e) => e.id === selectedEvidenceId) || null,
    [evidence, selectedEvidenceId]
  );

  const limitations = useMemo(() => ['Demo limitation: backend persistence not enabled.'], []);

  const validation = useMemo<ValidationResult>(
    () => ({ is_valid: true, issues: [], warnings: [] }),
    []
  );

  const referralQuestions = useMemo(() => ['Competency-related referral question (demo).'], []);

  const nav = useMemo(
    () =>
      [
        { id: 'overview' as const, label: 'Overview', icon: FileText },
        { id: 'evidence' as const, label: 'Evidence', icon: Upload },
        { id: 'claims' as const, label: 'Claim Ledger', icon: ListChecks },
        { id: 'opinions' as const, label: 'Opinion Chain', icon: Scale },
        { id: 'contradictions' as const, label: 'Contradictions', icon: ShieldCheck },
        { id: 'timeline' as const, label: 'Timeline', icon: Clock },
        { id: 'methodology' as const, label: 'Methodology', icon: Fingerprint },
        { id: 'gates' as const, label: 'Gates', icon: ShieldCheck },
        { id: 'export' as const, label: 'Export', icon: Download },
      ],
    []
  );

  const headerSubtitle = `${currentCase.case_number} • ${currentCase.case_type.toUpperCase()} • ${currentCase.evaluee_pseudonym}`;
const handleHome = onHome ?? onBack ?? (() => {});

return (
  <SidebarLayout
    sidebar={
      <div className="p-4">
        <div className="mb-4">
          <div className="text-xs text-slate-400 uppercase tracking-wide">Forensic</div>
          <div className="text-sm font-semibold text-white">{currentCase.case_number}</div>
          <div className="text-xs text-slate-400 mt-1">{currentCase.referral_source}</div>
        </div>

        <div className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavItem
                key={item.id}
                icon={<Icon className="w-4 h-4" />}
                label={item.label}
                isActive={view === item.id}
                onClick={() => setView(item.id)}
              />
            );
          })}
        </div>

        <div className="mt-6">
          <Card padding="sm" className="bg-slate-900/50 border border-slate-700">
            <div className="text-xs text-slate-400">Evaluee (pseudonym)</div>
            <div className="text-sm font-semibold text-white">{currentCase.evaluee_pseudonym}</div>
            <div className="text-xs text-slate-400 mt-2">Case Type</div>
            <div className="text-sm text-slate-200">{currentCase.case_type.toUpperCase()}</div>
            <div className="text-xs text-slate-400 mt-2">Referral Date</div>
            <div className="text-sm text-slate-200">{currentCase.referral_date}</div>
          </Card>
        </div>
      </div>
    }
    sidebarWidth="w-72"
  >
    <div className="p-6">
      <NavigationHeader
        onHome={handleHome}
        showBack={!!onBack}
        onBack={onBack}
        title="Forensic Workspace"
        subtitle={headerSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('gates')}
              className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors"
              title="Go to Gates"
            >
              Gates
            </button>
            <button
              onClick={() => setView('export')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
              title="Go to Export"
            >
              Export
            </button>
          </div>
        }
      />

      <Card className="bg-slate-900/60 border border-slate-800">
        {view === 'overview' && (
          <div className="space-y-6">
            <div>
              <div className="text-lg font-semibold text-white">Workspace overview</div>
              <p className="text-sm text-slate-400 mt-1">
                This is a PHI-free demo workspace showing the forensic workflow: evidence → claims → contradictions → gates → export.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                icon={<Upload className="w-5 h-5 text-blue-400" />}
                value={String(evidence.length)}
                label="Evidence items"
              />
              <StatCard
                icon={<ListChecks className="w-5 h-5 text-purple-400" />}
                value={String(claims.length)}
                label="Claims"
              />
            </div>

            <Card padding="sm" className="bg-slate-950/30 border border-slate-800">
              <div className="text-sm font-semibold text-white mb-2">What this workspace demonstrates</div>
              <ul className="list-disc pl-5 text-slate-300 space-y-1 text-sm">
                <li>Claim Ledger + citations as the primary forensic object</li>
                <li>Contradiction surfacing aligned to cross-examination risk</li>
                <li>Finalization gates before export</li>
                <li>Reader-pack export that can be independently verified</li>
              </ul>
            </Card>
          </div>
        )}

        {view === 'evidence' && (
          <div className="space-y-4">
            <div className="text-lg font-semibold text-white">Evidence Inventory (demo)</div>

            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/40">
                  <tr>
                    <th className="px-3 py-2 text-left">File</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Relied</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.map((e) => (
                    <tr key={e.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{e.filename}</td>
                      <td className="px-3 py-2">
                        {typeof e.evidence_type === 'string' ? e.evidence_type : 'object'}
                      </td>
                      <td className="px-3 py-2">{e.relied_upon ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => setSelectedEvidenceId(e.id)}
                          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedEvidence && (
              <EvidenceViewer
                evidence={selectedEvidence as any}
                pdfData={null as any}
                onClose={() => setSelectedEvidenceId(null)}
              />
            )}
          </div>
        )}

        {view === 'claims' && (
          <ClaimLedgerView
            claims={claims as any}
            evidence={evidence as any}
            sections={sections as any}
            contradictions={contradictions as any}
            onClaimClick={(c: any) => console.log('Claim clicked', c?.id)}
            onAddCitation={(claimId: string) => console.log('Add citation', claimId)}
          />
        )}

        {view === 'opinions' && (
          <OpinionChainExplainer
            claims={claims as any}
            evidence={evidence as any}
            onSelectOpinion={(id: string) => console.log('Selected opinion', id)}
          />
        )}

        {view === 'contradictions' && (
          <div className="space-y-6">
            <CrossExamReadinessMeter
              claims={claims as any}
              evidence={evidence as any}
              contradictions={contradictions as any}
              validation={validation as any}
              sections={sections as any}
              referralQuestions={referralQuestions}
            />
            <ContradictionIntelligence
              contradictions={contradictions as any}
              claims={claims as any}
              sections={sections as any}
              onResolveContradiction={(id: string, resolution: string) => {
                setContradictions((prev) =>
                  prev.map((c) =>
                    c.id === id
                      ? { ...c, resolution_status: 'resolved', resolution_note: resolution }
                      : c
                  )
                );
              }}
            />
          </div>
        )}

        {view === 'timeline' && (
          <TimelineBuilder
            evidence={evidence as any}
            events={[]}
            conflicts={[]}
            onAddEvent={(e: any) => console.log('Add event', e)}
          />
        )}

        {view === 'methodology' && (
          <MethodologyAppendixGenerator
            evidence={evidence as any}
            evaluationType={
              currentCase.case_type === 'custody'
                ? 'child_custody'
                : currentCase.case_type
            }
            onGenerate={(content: string) => console.log('Generated methodology appendix', content)}
          />
        )}

        {view === 'gates' && (
          <FinalizeGates
            claims={claims as any}
            contradictions={contradictions as any}
            evidence={evidence as any}
            sections={sections as any}
            validation={validation as any}
            referralQuestions={referralQuestions}
            onExport={() => setView('export')}
            onOverride={(gateId: string, reason: string) =>
              console.log('Override gate', gateId, reason)
            }
          />
        )}

        {view === 'export' && (
          <ReaderPackExport
            reportId={'REPORT-DEMO-001'}
            caseId={currentCase.id}
            caseNumber={currentCase.case_number}
            evaluatorName={'Evaluator (Demo)'}
            claims={claims as any}
            evidence={evidence as any}
            contradictions={contradictions as any}
            sections={sections as any}
            limitations={limitations}
            onExport={(format) => console.log('Export requested', format)}
          />
        )}
      </Card>
    </div>
  </SidebarLayout>
);
}

export default ForensicWorkspace;

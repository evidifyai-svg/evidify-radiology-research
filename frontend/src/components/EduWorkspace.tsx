// EduWorkspace.tsx
// ---------------------------------------------------------------------------
// Evidify EDU (504/IEP) — Module shell designed to be:
// - Visually consistent with Clinical + Forensic (uses ui-primitives)
// - Safe by default (demo-only / PHI-free)
// - Incrementally extensible without touching Forensic verification assets
//
// NOTE: This is a UI-first integration. The verifier/golden-CI pieces for EDU
// live under /verification and are invoked at export time in later sprints.

import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  FileText,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Download,
  ShieldCheck,
} from 'lucide-react';

import { SidebarLayout, NavigationHeader, NavItem, Card, StatCard, Button, Badge } from './ui-primitives';

type EduViewId = 'overview' | 'intake' | 'data' | 'report' | 'gates' | 'export';

interface EduCase {
  id: string;
  case_number: string;
  student_pseudonym: string;
  school: string;
  referral_date: string; // ISO
  meeting_date?: string; // ISO
  case_type: '504' | 'IEP' | 'eligibility' | 'reeval' | 'other';
}

interface GateStatus {
  id: string;
  title: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

function makeDemoEduCase(): EduCase {
  return {
    id: 'EDU-DEMO-001',
    case_number: 'EDU-2026-001',
    student_pseudonym: 'Student A',
    school: 'Demo Middle School',
    referral_date: new Date().toISOString().slice(0, 10),
    meeting_date: undefined,
    case_type: 'IEP',
  };
}

function demoGates(): GateStatus[] {
  return [
    {
      id: 'GATE-EDU-001',
      title: 'Consent / Authority Recorded',
      status: 'warn',
      message: 'Consent date not set. Record parent consent or legal authority before evaluation activities.',
    },
    {
      id: 'GATE-EDU-002',
      title: 'Timeline Consistency',
      status: 'pass',
      message: 'All key dates appear internally consistent.',
    },
    {
      id: 'GATE-EDU-003',
      title: 'Recommendations Have Basis Links',
      status: 'fail',
      message: '2 recommendations lack linked supporting data sources. Add basis links or mark as team decision.',
    },
  ];
}

export function EduWorkspace({
  onHome,
  onBack,
}: {
  onHome?: () => void;
  onBack?: () => void;
}) {
  const [activeView, setActiveView] = useState<EduViewId>('overview');
  const [currentCase, setCurrentCase] = useState<EduCase>(() => makeDemoEduCase());

  const gates = useMemo(() => demoGates(), []);
  const passCount = gates.filter(g => g.status === 'pass').length;
  const failCount = gates.filter(g => g.status === 'fail').length;
  const warnCount = gates.filter(g => g.status === 'warn').length;

  const nav: Array<{ id: EduViewId; label: string; icon: React.ReactNode }>= [
    { id: 'overview', label: 'Overview', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'intake', label: 'Referral / Intake', icon: <Calendar className="w-4 h-4" /> },
    { id: 'data', label: 'Data Sources', icon: <FileText className="w-4 h-4" /> },
    { id: 'report', label: 'Report Builder', icon: <FileText className="w-4 h-4" /> },
    { id: 'gates', label: 'Pre-flight Gates', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'export', label: 'Freeze & Export', icon: <Download className="w-4 h-4" /> },
  ];

  return (
    <SidebarLayout
      sidebar={
        <div className="space-y-2">
          {nav.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeView === item.id}
              onClick={() => setActiveView(item.id)}
            />
          ))}
        </div>
      }
    >
      <div className="space-y-6">
        <NavigationHeader
          title="Evidify EDU"
          subtitle="504 / IEP defensibility workspace (beta)"
          onHome={onHome ?? (() => {})}
          showBack={!!onBack}
          onBack={onBack}
          actions={
<div className="flex items-center gap-2">
                          <Badge variant={failCount > 0 ? 'danger' : warnCount > 0 ? 'warning' : 'success'}>
                            {failCount > 0 ? `${failCount} blocking` : warnCount > 0 ? `${warnCount} advisory` : 'Ready'}
                          </Badge>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              alert('EDU export is UI-only in v0.1. Next sprint will generate a verifier-backed export pack.');
                            }}
                          >
                            <Download className="w-4 h-4" />
                            Export
                          </Button>
                        </div>
          }
        />
      {activeView === 'overview' && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-100">Case Header</div>
              <div className="text-xs text-slate-400">PHI-free demo case (replace with real persistence later)</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Case Number</label>
                <input
                  value={currentCase.case_number}
                  onChange={(e) => setCurrentCase(c => ({ ...c, case_number: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Student Pseudonym</label>
                <input
                  value={currentCase.student_pseudonym}
                  onChange={(e) => setCurrentCase(c => ({ ...c, student_pseudonym: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">School</label>
                <input
                  value={currentCase.school}
                  onChange={(e) => setCurrentCase(c => ({ ...c, school: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Case Type</label>
                <select
                  value={currentCase.case_type}
                  onChange={(e) => setCurrentCase(c => ({ ...c, case_type: e.target.value as EduCase['case_type'] }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm"
                >
                  <option value="IEP">IEP</option>
                  <option value="504">504</option>
                  <option value="eligibility">Eligibility</option>
                  <option value="reeval">Re-evaluation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Gates Passing" value={String(passCount)} icon={<CheckCircle className="w-4 h-4" />} />
            <StatCard label="Advisories" value={String(warnCount)} icon={<AlertTriangle className="w-4 h-4" />} />
            <StatCard label="Blocking" value={String(failCount)} icon={<AlertTriangle className="w-4 h-4" />} />
          </div>

          <Card>
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-100">What Evidify EDU is</div>
              <div className="text-xs text-slate-400">Positioning: not an IEP platform replacement</div>
            </div>
            <ul className="list-disc pl-6 text-sm text-slate-300 space-y-2">
              <li>
                A defensibility wrapper for the documentation that is most likely to be reviewed in due process, OCR complaints, or state audits.
              </li>
              <li>
                Offline-first by default: no cloud sync, no student data egress unless you intentionally export.
              </li>
              <li>
                Freeze & Export is designed to produce a deterministic, verifier-checkable pack (next sprint integration).
              </li>
            </ul>
          </Card>
        </div>
      )}

      {activeView === 'intake' && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-100">Referral / Intake</div>
              <div className="text-xs text-slate-400">Dates here feed the timeline gate</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Referral Date</label>
                <input
                  type="date"
                  value={currentCase.referral_date}
                  onChange={(e) => setCurrentCase(c => ({ ...c, referral_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Meeting Date (IEP/504)</label>
                <input
                  type="date"
                  value={currentCase.meeting_date || ''}
                  onChange={(e) => setCurrentCase(c => ({ ...c, meeting_date: e.target.value || undefined }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">
              In v0.1, these are UI-only. In v0.2, they will be validated by the EDU gate engine (GATE-EDU-002).
            </div>
          </Card>
        </div>
      )}

      {activeView === 'data' && (
        <Card>
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-100">Data Sources</div>
              <div className="text-xs text-slate-400">Attach tests, observations, records (UI-only in v0.1)</div>
            </div>
          <div className="text-sm text-slate-300">
            Planned: structured source types, basis-linking, and per-source reliability scoring.
          </div>
        </Card>
      )}

      {activeView === 'report' && (
        <Card>
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-100">Report Builder</div>
              <div className="text-xs text-slate-400">Draft report sections with basis-linked recommendations</div>
            </div>
          <div className="text-sm text-slate-300">
            Planned: eligibility-domain scaffolds, language discipline presets, and export-ready report templates.
          </div>
        </Card>
      )}

      {activeView === 'gates' && (
        <Card>
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-100">Pre-flight Gates</div>
              <div className="text-xs text-slate-400">Blocking gates prevent Freeze & Export in later sprints</div>
            </div>
          <div className="space-y-3">
            {gates.map(g => (
              <div key={g.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-700 bg-slate-900/40">
                <div className="mt-0.5">
                  {g.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-400" />}
                  {g.status === 'warn' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  {g.status === 'fail' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-white text-sm">{g.id}: {g.title}</div>
                    <Badge variant={g.status === 'pass' ? 'success' : g.status === 'warn' ? 'warning' : 'danger'}>
                      {g.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-300 mt-1">{g.message}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeView === 'export' && (
        <Card>
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-100">Freeze & Export</div>
              <div className="text-xs text-slate-400">Deterministic export packs come in v0.2</div>
            </div>
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              The EDU module will reuse the Forensic defensibility architecture:
              canonicalization → freeze pocket → hash-chained audit → verifier.
            </p>
            <p className="text-slate-400">
              For now, this tab is a placeholder so we can iterate on the UI/UX without risking the Forensic golden CI assets.
            </p>
            <Button
              variant="primary"
              onClick={() => alert('Coming next: Freeze & Export (EDU) → produces export_manifest.json + ledger.json + events.jsonl')}
            >
              <ShieldCheck className="w-4 h-4" />
              Freeze & Export (coming)
            </Button>
          </div>
        </Card>
      )}
    
  </div>
</SidebarLayout>
  );
}

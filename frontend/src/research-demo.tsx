import './index.css';
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ResearchDemoFlow } from './components/ResearchDemoFlow';
import StudySelector from './components/research/StudySelector';
import TheContrast from './components/research/legal/TheContrast';
import HashChainDemo from './components/research/HashChainDemo';
import WorkloadDashboard from './components/research/WorkloadDashboard';
import { PacketViewer } from './components/PacketViewer';
import { DEMO_CASE_ID, DEMO_EVENTS, DEMO_DERIVED_METRICS } from './data/contrastDemoData';
import { DEMO_HASH_TIMELINE, DEMO_CHAIN_VALID, DEMO_HASH_SESSION_ID } from './data/hashChainDemoData';
import { DEMO_WORKLOAD_SESSION, DEMO_COHORT_DATA } from './data/workloadDemoData';
import TrustTrajectoryDashboard from './components/research/TrustTrajectoryDashboard';
import { DEMO_TRUST_DATA } from './data/trustTrajectoryDemoData';
import CounterfactualSimulator from './components/research/CounterfactualSimulator';
import { DEMO_COUNTERFACTUAL_CASE } from './data/counterfactualDemoData';
import CompetencyReportGenerator from './components/research/CompetencyReportGenerator';
import { DEMO_COMPETENCY_REPORT } from './data/competencyDemoData';
import {
  DEMO_PACK_EVENTS,
  DEMO_PACK_LEDGER,
  DEMO_PACK_MANIFEST,
  DEMO_PACK_METRICS,
  DEMO_PACK_VERIFIER,
} from './data/exportPackDemoData';

const headerBarStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderBottom: '1px solid #334155',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'relative',
  zIndex: 1100,
  backgroundColor: '#0f172a',
};

const backBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#334155',
  border: '1px solid #475569',
  borderRadius: '8px',
  color: '#f8fafc',
  cursor: 'pointer',
  fontSize: '13px',
};

const ResearchDemoShell: React.FC = () => {
  const [activeStudy, setActiveStudy] = useState<string | null>(null);
  const [guidedStep, setGuidedStep] = useState<number | null>(null);

  // When in guided mode, backing out of a study advances to the next transition
  // screen instead of returning to the study selector grid.
  const handleBack = () => {
    if (guidedStep !== null) {
      setGuidedStep(guidedStep + 1);
    }
    setActiveStudy(null);
  };

  const backLabel = guidedStep !== null ? 'Continue Demo →' : '← Back to Studies';

  if (activeStudy === 'fullsession') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <div style={headerBarStyle}>
          <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '18px', fontFamily: 'system-ui, sans-serif' }}>
            Full Reading Session Demo
          </h2>
          <button onClick={handleBack} style={backBtnStyle}>
            {backLabel}
          </button>
        </div>
        <ResearchDemoFlow />
      </div>
    );
  }

  if (activeStudy === 'contrast') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <div style={headerBarStyle}>
          <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '18px', fontFamily: 'system-ui, sans-serif' }}>
            The Contrast: STI Prevention Study
          </h2>
          <button onClick={handleBack} style={backBtnStyle}>
            {backLabel}
          </button>
        </div>
        <TheContrast
          caseId={DEMO_CASE_ID}
          events={DEMO_EVENTS}
          derivedMetrics={DEMO_DERIVED_METRICS}
        />
      </div>
    );
  }

  if (activeStudy === 'hashchain') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <div style={headerBarStyle}>
          <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '18px', fontFamily: 'system-ui, sans-serif' }}>
            Hash Chain Verification Study
          </h2>
          <button onClick={handleBack} style={backBtnStyle}>
            {backLabel}
          </button>
        </div>
        <HashChainDemo
          timeline={DEMO_HASH_TIMELINE}
          chainValid={DEMO_CHAIN_VALID}
          sessionId={DEMO_HASH_SESSION_ID}
        />
      </div>
    );
  }

  if (activeStudy === 'workload') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <div style={headerBarStyle}>
          <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '18px', fontFamily: 'system-ui, sans-serif' }}>
            Workload Monitoring & Cohort Comparison
          </h2>
          <button onClick={handleBack} style={backBtnStyle}>
            {backLabel}
          </button>
        </div>
        <WorkloadDashboard
          currentSession={DEMO_WORKLOAD_SESSION}
          cohortData={DEMO_COHORT_DATA}
        />
      </div>
    );
  }
if (activeStudy === 'trust-trajectory') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <div style={headerBarStyle}>
          <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '18px', fontFamily: 'system-ui, sans-serif' }}>
            Trust Trajectory Dashboard
          </h2>
          <button onClick={handleBack} style={backBtnStyle}>
            {backLabel}
          </button>
        </div>
        <TrustTrajectoryDashboard data={DEMO_TRUST_DATA} />
      </div>
    );
  }

  if (activeStudy === 'counterfactual') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <div style={headerBarStyle}>
          <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '18px', fontFamily: 'system-ui, sans-serif' }}>
            Counterfactual Analysis Engine
          </h2>
          <button onClick={handleBack} style={backBtnStyle}>
            {backLabel}
          </button>
        </div>
        <CounterfactualSimulator caseData={DEMO_COUNTERFACTUAL_CASE} />
      </div>
    );
  }
  if (activeStudy === 'competency-report') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <div style={headerBarStyle}>
          <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '18px', fontFamily: 'system-ui, sans-serif' }}>
            Competency Report Generator
          </h2>
          <button onClick={handleBack} style={backBtnStyle}>
            {backLabel}
          </button>
        </div>
        <CompetencyReportGenerator report={DEMO_COMPETENCY_REPORT} />
      </div>
    );
  }

  if (activeStudy === 'inspector') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <div style={headerBarStyle}>
          <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '18px', fontFamily: 'system-ui, sans-serif' }}>
            Export Pack Inspector
          </h2>
          <button onClick={handleBack} style={backBtnStyle}>
            {backLabel}
          </button>
        </div>
        <PacketViewer
          events={DEMO_PACK_EVENTS}
          ledger={DEMO_PACK_LEDGER}
          manifest={DEMO_PACK_MANIFEST}
          derivedMetrics={DEMO_PACK_METRICS}
          verifierOutput={DEMO_PACK_VERIFIER}
          isOpen={true}
        />
      </div>
    );
  }

  if (activeStudy) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '500px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
            {activeStudy.charAt(0).toUpperCase() + activeStudy.slice(1)} Study
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
            This view will be connected in a follow-up integration step.
          </p>
          <button
            onClick={handleBack}
            style={{ padding: '10px 20px', backgroundColor: '#334155', border: '1px solid #475569', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '14px' }}
          >
            {backLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <StudySelector
      onLaunchStudy={(id) => setActiveStudy(id)}
      guidedStep={guidedStep}
      onGuidedStepChange={setGuidedStep}
    />
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ResearchDemoShell />
  </React.StrictMode>
);

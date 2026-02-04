import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ResearchDemoFlow } from './components/ResearchDemoFlow';
import StudySelector from './components/research/StudySelector';
import TheContrast from './components/research/legal/TheContrast';
import HashChainDemo from './components/research/HashChainDemo';
import { DEMO_CASE_ID, DEMO_EVENTS, DEMO_DERIVED_METRICS } from './data/contrastDemoData';
import { DEMO_HASH_TIMELINE, DEMO_CHAIN_VALID, DEMO_HASH_SESSION_ID } from './data/hashChainDemoData';

const headerBarStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderBottom: '1px solid #334155',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
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

  if (activeStudy === 'fullsession') {
    return <ResearchDemoFlow />;
  }

  if (activeStudy === 'contrast') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <div style={headerBarStyle}>
          <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '18px', fontFamily: 'system-ui, sans-serif' }}>
            The Contrast: STI Prevention Study
          </h2>
          <button onClick={() => setActiveStudy(null)} style={backBtnStyle}>
            ← Back to Studies
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
          <button onClick={() => setActiveStudy(null)} style={backBtnStyle}>
            ← Back to Studies
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
            onClick={() => setActiveStudy(null)}
            style={{ padding: '10px 20px', backgroundColor: '#334155', border: '1px solid #475569', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '14px' }}
          >
            ← Back to Studies
          </button>
        </div>
      </div>
    );
  }

  return <StudySelector onLaunchStudy={(id) => setActiveStudy(id)} />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ResearchDemoShell />
  </React.StrictMode>
);

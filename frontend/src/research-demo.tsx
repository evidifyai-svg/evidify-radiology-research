import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ResearchDemoFlow } from './components/ResearchDemoFlow';
import StudySelector from './components/research/StudySelector';
import { ArrowLeft } from 'lucide-react';

// ---------------------------------------------------------------------------
// Root shell: routes between StudySelector and individual study views
// ---------------------------------------------------------------------------

const ResearchDemoShell: React.FC = () => {
  const [activeStudy, setActiveStudy] = useState<string | null>(null);

  // Full session → render the existing ResearchDemoFlow
  if (activeStudy === 'fullsession') {
    return <ResearchDemoFlow />;
  }

  // Other studies → placeholder with back navigation
  if (activeStudy) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <h2 className="text-2xl font-bold mb-3">
            {activeStudy.charAt(0).toUpperCase() + activeStudy.slice(1)} Study
          </h2>
          <p className="text-slate-400 mb-8">
            This view will be connected in a follow-up integration step.
          </p>
          <button
            type="button"
            onClick={() => setActiveStudy(null)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Studies
          </button>
        </div>
      </div>
    );
  }

  // Default → StudySelector landing page
  return <StudySelector onLaunchStudy={(id) => setActiveStudy(id)} />;
};

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ResearchDemoShell />
  </React.StrictMode>
);

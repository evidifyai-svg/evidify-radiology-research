# Evidify Legal Module Integration Guide

## Step 1: Add Files to Your Repo

```bash
# From your evidify-forensic-new directory
mkdir -p src/components/research/legal

# Copy the new components (assuming you downloaded from Claude outputs)
cp ~/Downloads/evidify-legal/*.tsx src/components/research/legal/
cp ~/Downloads/evidify-legal/index.ts src/components/research/legal/
```

Your structure should look like:
```
src/components/research/
├── legal/                    # NEW FOLDER
│   ├── index.ts
│   ├── ImpressionLedger.tsx
│   ├── DeviationBuilder.tsx
│   ├── DisclosureConfig.tsx
│   ├── ExpertWitnessExport.tsx
│   └── StudyProtocol.tsx
├── RadiologyViewer.tsx       # Existing
├── AIScoreCard.tsx           # Existing (needs update)
├── OutcomeCapture.tsx        # Existing (needs update)
├── DemoFlow.tsx              # Existing (needs update)
├── DataExport.tsx            # Existing (add new format)
└── ...
```

---

## Step 2: Update DemoFlow.tsx (Main Integration Point)

This is where the Impression Ledger wraps your experiment flow.

```tsx
// src/components/research/DemoFlow.tsx

// ADD these imports at top
import {
  ImpressionLedgerProvider,
  useImpressionLedger,
  DeviationBuilder,
  DisclosureDisplay,
  DISCLOSURE_CONDITIONS,
  generateExpertWitnessPacket,
  type DeviationDocumentation,
} from './legal';

// WRAP your DemoFlow component
export const DemoFlow: React.FC<DemoFlowProps> = ({ participantId, cases, ... }) => {
  return (
    <ImpressionLedgerProvider caseId={currentCase.id} readerId={participantId}>
      <DemoFlowInner participantId={participantId} cases={cases} ... />
    </ImpressionLedgerProvider>
  );
};

// Your existing DemoFlow logic goes in DemoFlowInner
const DemoFlowInner: React.FC<DemoFlowProps> = ({ ... }) => {
  const { state, actions, computed } = useImpressionLedger();
  
  // State for deviation
  const [showDeviationBuilder, setShowDeviationBuilder] = useState(false);
  const [currentDeviation, setCurrentDeviation] = useState<DeviationDocumentation | null>(null);
  
  // Disclosure config (can come from study protocol)
  const disclosureConfig = DISCLOSURE_CONDITIONS['numeric_fdr_for'];

  // --- PHASE 1: Record first impression ---
  const handlePhase1Submit = async (assessment: BIRADSAssessment) => {
    await actions.recordFirstImpression(assessment);
    // Then reveal AI...
  };

  // --- AI REVEAL: Record exposure ---
  const handleAIReveal = async () => {
    const aiFindings = [{
      id: 'finding_1',
      score: currentCase.aiScore,
      flagged: currentCase.aiFlagged,
      region: currentCase.aiRegion,
    }];
    
    await actions.recordAIExposure(aiFindings, {
      shown: disclosureConfig.enabled,
      format: disclosureConfig.format,
      metrics: disclosureConfig.metrics,
    });
  };

  // --- PHASE 2: Record reconciliation ---
  const handlePhase2Submit = async (assessment: BIRADSAssessment) => {
    // Check if reader disagrees with AI
    const aiExposure = computed.aiExposure;
    const agreesWithAI = aiExposure?.aiFindings?.[0]?.flagged 
      ? assessment.category >= 4
      : assessment.category < 4;
    
    if (!agreesWithAI && !currentDeviation) {
      // Show deviation builder before allowing submit
      setShowDeviationBuilder(true);
      return;
    }
    
    await actions.recordReconciliation(assessment, currentDeviation);
    
    // Move to next case or complete
  };

  // --- DEVIATION HANDLING ---
  const handleDeviationComplete = (doc: DeviationDocumentation) => {
    setCurrentDeviation(doc);
    setShowDeviationBuilder(false);
    // Now they can submit Phase 2
  };

  // --- EXPORT at end of session ---
  const handleSessionComplete = () => {
    const ledger = actions.exportLedger();
    const expertPacket = generateExpertWitnessPacket(ledger, currentDeviation);
    
    // Add to your existing export...
    console.log('Expert Witness Packet:', expertPacket);
  };

  return (
    <div>
      {/* Your existing UI */}
      
      {/* ADD: Deviation Builder modal */}
      {showDeviationBuilder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <DeviationBuilder
              aiFinding={{
                id: 'finding_1',
                score: currentCase.aiScore,
                flagged: currentCase.aiFlagged,
                region: currentCase.aiRegion,
              }}
              readerAssessment={`BI-RADS ${phase2Assessment.category}`}
              onComplete={handleDeviationComplete}
              onCancel={() => setShowDeviationBuilder(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Step 3: Update AIScoreCard.tsx (Add Disclosure)

```tsx
// src/components/research/AIScoreCard.tsx

// ADD import
import { DisclosureDisplay, DisclosureConfig, DISCLOSURE_CONDITIONS } from './legal';

interface AIScoreCardProps {
  score: number;
  flagged: boolean;
  // ADD these props
  disclosureConfig?: DisclosureConfig;
  onDisclosureExposure?: (timestamp: string, format: string) => void;
  onDisclosureAcknowledge?: (timestamp: string) => void;
}

export const AIScoreCard: React.FC<AIScoreCardProps> = ({
  score,
  flagged,
  disclosureConfig = DISCLOSURE_CONDITIONS['numeric_fdr_for'],
  onDisclosureExposure,
  onDisclosureAcknowledge,
}) => {
  return (
    <div className="...">
      {/* Your existing score gauge, flag badge, etc. */}
      
      {/* ADD: Disclosure component */}
      <DisclosureDisplay
        config={disclosureConfig}
        aiFlagged={flagged}
        onExposure={onDisclosureExposure}
        onAcknowledge={onDisclosureAcknowledge}
      />
    </div>
  );
};
```

---

## Step 4: Update DataExport.tsx (Add Expert Witness Format)

```tsx
// src/components/research/DataExport.tsx

// ADD imports
import {
  generateExpertWitnessPacket,
  ExpertWitnessPacketView,
  type ExpertWitnessPacket,
  type ImpressionLedgerExport,
} from './legal';

// ADD new export function
export function exportExpertWitnessPacket(
  ledger: ImpressionLedgerExport,
  deviation: DeviationDocumentation | null
): ExpertWitnessPacket {
  return generateExpertWitnessPacket(ledger, deviation);
}

// ADD to your export UI
interface DataExportProps {
  // ... existing props
  ledger?: ImpressionLedgerExport;
  deviation?: DeviationDocumentation | null;
}

export const DataExport: React.FC<DataExportProps> = ({ ledger, deviation, ... }) => {
  const [showExpertPacket, setShowExpertPacket] = useState(false);
  const [expertPacket, setExpertPacket] = useState<ExpertWitnessPacket | null>(null);

  const handleExportExpertWitness = () => {
    if (!ledger) return;
    const packet = generateExpertWitnessPacket(ledger, deviation ?? null);
    setExpertPacket(packet);
    setShowExpertPacket(true);
    
    // Also download as JSON
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expert_witness_packet_${packet.packetId}.json`;
    a.click();
  };

  return (
    <div>
      {/* Your existing export buttons */}
      
      {/* ADD: Expert Witness export button */}
      {ledger && (
        <button onClick={handleExportExpertWitness}>
          Export Expert Witness Packet
        </button>
      )}
      
      {/* ADD: Packet viewer modal */}
      {showExpertPacket && expertPacket && (
        <div className="fixed inset-0 bg-black/50 overflow-auto p-4 z-50">
          <div className="max-w-4xl mx-auto">
            <button onClick={() => setShowExpertPacket(false)}>Close</button>
            <ExpertWitnessPacketView packet={expertPacket} />
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Step 5: Update ResearcherDashboard.tsx (Add Rubber-Stamp Alerts)

```tsx
// src/components/research/ResearcherDashboard.tsx

// ADD imports
import {
  detectRubberStampIndicators,
  calculateRubberStampRiskLevel,
  type RubberStampIndicator,
} from './legal';

// In your dashboard, add a risk indicator panel
const RubberStampPanel: React.FC<{ ledger: ImpressionLedgerExport }> = ({ ledger }) => {
  const indicators = detectRubberStampIndicators(ledger, null);
  const riskLevel = calculateRubberStampRiskLevel(indicators);
  
  const flaggedIndicators = indicators.filter(i => i.detected);
  
  return (
    <div className={`p-4 rounded-lg ${
      riskLevel === 'high' ? 'bg-red-500/20 border-red-500' :
      riskLevel === 'medium' ? 'bg-yellow-500/20 border-yellow-500' :
      'bg-green-500/20 border-green-500'
    } border`}>
      <h4 className="font-medium">Rubber-Stamp Risk: {riskLevel.toUpperCase()}</h4>
      {flaggedIndicators.length > 0 && (
        <ul className="mt-2 text-sm">
          {flaggedIndicators.map(ind => (
            <li key={ind.indicator}>
               {ind.indicator}: {ind.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## Step 6: Wire Up Session State

The key architectural change is that **ImpressionLedger replaces your manual phase tracking**. 

```tsx
// BEFORE (manual tracking)
const [phase, setPhase] = useState<'phase1' | 'ai_reveal' | 'phase2'>('phase1');
const [phase1Assessment, setPhase1Assessment] = useState(null);
const [phase2Assessment, setPhase2Assessment] = useState(null);

// AFTER (ledger-driven)
const { state, computed } = useImpressionLedger();

// Phase is derived from ledger state
const currentPhase = computed.canRecordFirstImpression ? 'phase1' :
                     computed.canRecordAIExposure ? 'ai_reveal' :
                     computed.canRecordReconciliation ? 'phase2' : 'complete';

// Assessments are in the ledger
const firstImpression = computed.firstImpression?.assessment;
const finalAssessment = computed.reconciliation?.assessment;
```

---

## Step 7: Test the Integration

1. **Run your dev server**
   ```bash
   npm run dev
   ```

2. **Complete a full session**
   - Submit Phase 1 assessment
   - View AI reveal
   - Submit Phase 2 (try one that disagrees with AI)
   - Complete deviation documentation
   - Export Expert Witness Packet

3. **Verify the export contains:**
   - Three ledger entries with valid hashes
   - Timeline with timestamps
   - Deviation rationale (if applicable)
   - Rubber-stamp indicators

---

## Quick Reference: What Calls What

```
DemoFlow
  └── ImpressionLedgerProvider (wraps everything)
        └── DemoFlowInner
              ├── OutcomeCapture → actions.recordFirstImpression()
              ├── AIScoreCard
              │     └── DisclosureDisplay
              ├── OutcomeCapture → actions.recordReconciliation()
              ├── DeviationBuilder (modal, if needed)
              └── DataExport
                    └── ExpertWitnessPacketView
```

---

## Minimal Viable Integration (Just for Friday Demo)

If you're short on time, just do this:

1. Copy the `legal/` folder to `src/components/research/legal/`

2. Create a standalone demo page:

```tsx
// src/pages/LegalDemo.tsx
import {
  ImpressionLedgerProvider,
  useImpressionLedger,
  LedgerTimeline,
  DeviationBuilder,
  DisclosureDisplay,
  DISCLOSURE_CONDITIONS,
  ExpertWitnessPacketView,
  generateExpertWitnessPacket,
} from '../components/research/legal';

export const LegalDemo = () => {
  // Hardcoded demo - just to show the components
  // Wire up to real flow later
};
```

This lets you demo the new components without touching your working code.

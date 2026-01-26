// MethodologyAppendixGenerator.tsx - Auto-generates Daubert/Frye ready methodology
// Creates a structured methodology section tailored to the case type

import { useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface EvidenceItem {
  id: string;
  filename: string;
  evidence_type: string | Record<string, unknown>;
  date_received?: string;
  author?: string;
}

interface TestAdministered {
  name: string;
  date: string;
  mode: 'in_person' | 'telehealth';
  validityConsidered: boolean;
  normGroup?: string;
}

interface Interview {
  subject: string;
  role: string;
  date: string;
  duration?: string;
  mode: 'in_person' | 'telehealth' | 'phone';
}

interface MethodologyConfig {
  evaluationType: string;
  jurisdiction?: string;
  evaluationDates: string[];
  evaluationSetting: 'in_person' | 'telehealth' | 'mixed';
  evaluationLocation?: string;
  totalDuration?: string;
  language?: string;
  interpreter?: boolean;
  testsAdministered: TestAdministered[];
  interviews: Interview[];
  recordsReviewed: EvidenceItem[];
  methodsUsed: string[];
  limitationsNoted: string[];
  whatWasNotDone: string[];
}

interface MethodologyAppendixGeneratorProps {
  evidence: EvidenceItem[];
  evaluationType: string;
  onGenerate: (content: string) => void;
  existingContent?: string;
}

// ============================================================================
// METHODOLOGY TEMPLATES BY EVALUATION TYPE
// ============================================================================

const METHODOLOGY_TEMPLATES: Record<string, {
  requiredSections: string[];
  standardMethods: string[];
  commonLimitations: string[];
  standardTests: string[];
}> = {
  child_custody: {
    requiredSections: [
      'Evaluation Procedures',
      'Sources of Information', 
      'Psychological Testing',
      'Parent Interviews',
      'Child Interviews',
      'Collateral Contacts',
      'Behavioral Observations',
      'Limitations',
    ],
    standardMethods: [
      'Clinical interviews with each parent',
      'Clinical interview(s) with the child(ren)',
      'Parent-child interaction observations',
      'Review of relevant records',
      'Psychological testing of parents',
      'Collateral contacts',
    ],
    commonLimitations: [
      'This evaluation represents a snapshot in time',
      'Collateral information was obtained from potentially biased sources',
      'Children\'s statements may be influenced by situational factors',
      'Custody recommendations are based on current circumstances',
    ],
    standardTests: [
      'Validity indicators (standardized response consistency scales)',
      'PAI',
      'Parenting Stress Index',
      'CBCL (Child Behavior Checklist)',
      'Parent-Child Relationship Inventory',
    ],
  },
  competency: {
    requiredSections: [
      'Evaluation Procedures',
      'Sources of Information',
      'Competency Assessment Methods',
      'Mental Status Examination',
      'Relevant History',
      'Limitations',
    ],
    standardMethods: [
      'Clinical interview focused on competency-related abilities',
      'Structured competency assessment instrument',
      'Mental status examination',
      'Review of legal records and charges',
      'Review of psychiatric/medical records',
    ],
    commonLimitations: [
      'Competency is situation-specific and may change over time',
      'Defendant\'s presentation may differ in actual court proceedings',
      'Assessment reflects current functioning only',
    ],
    standardTests: [
      'MacCAT-CA',
      'ECST-R',
      'CAST-MR (if intellectual disability suspected)',
      'Cognitive screening',
    ],
  },
  criminal_responsibility: {
    requiredSections: [
      'Evaluation Procedures',
      'Sources of Information',
      'Mental State at Time of Offense Assessment',
      'Psychological Testing',
      'Relevant History',
      'Limitations',
    ],
    standardMethods: [
      'Detailed clinical interview about the offense',
      'Timeline reconstruction of the offense period',
      'Review of police reports and witness statements',
      'Psychiatric history review',
      'Substance use assessment',
    ],
    commonLimitations: [
      'Retrospective assessment of mental state is inherently limited',
      'Self-report of mental state at time of offense cannot be independently verified',
      'Time elapsed since offense affects accuracy of recollection',
    ],
    standardTests: [
      'R-CRAS',
      'MSE-3R',
      'Validity indicators / PAI',
      'Structured malingering measures',
    ],
  },
  disability: {
    requiredSections: [
      'Evaluation Procedures',
      'Sources of Information',
      'Functional Assessment',
      'Psychological Testing',
      'Work History',
      'Limitations',
    ],
    standardMethods: [
      'Clinical interview focusing on functional limitations',
      'Detailed work history review',
      'Activities of daily living assessment',
      'Symptom validity testing',
      'Review of medical records',
    ],
    commonLimitations: [
      'Functional capacity may vary day to day',
      'Assessment represents a single point in time',
      'Self-reported limitations require corroboration',
    ],
    standardTests: [
      'Validity indicators / PAI',
      'Cognitive testing (as indicated)',
      'Symptom validity tests',
      'Functional capacity measures',
    ],
  },
  default: {
    requiredSections: [
      'Evaluation Procedures',
      'Sources of Information',
      'Methods and Measures',
      'Limitations',
    ],
    standardMethods: [
      'Clinical interview',
      'Review of relevant records',
      'Psychological testing (as indicated)',
      'Collateral contacts (as appropriate)',
    ],
    commonLimitations: [
      'This evaluation represents a snapshot in time',
      'Conclusions are based on available information',
    ],
    standardTests: [],
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function MethodologyAppendixGenerator({
  evidence,
  evaluationType,
  onGenerate,
  existingContent,
}: MethodologyAppendixGeneratorProps) {
  const template = METHODOLOGY_TEMPLATES[evaluationType] || METHODOLOGY_TEMPLATES.default;
  
  // Configuration state
  const [config, setConfig] = useState<MethodologyConfig>({
    evaluationType,
    evaluationDates: [],
    evaluationSetting: 'in_person',
    testsAdministered: [],
    interviews: [],
    recordsReviewed: evidence,
    methodsUsed: template.standardMethods,
    limitationsNoted: template.commonLimitations,
    whatWasNotDone: [],
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customLimitation, setCustomLimitation] = useState('');
  
  // Generate methodology content
  const generatedContent = useMemo(() => {
    const lines: string[] = [];
    
    // Header
    lines.push('## METHODOLOGY AND PROCEDURES\n');
    
    // Evaluation Setting
    lines.push('### Evaluation Setting and Procedures\n');
    lines.push(`This evaluation was conducted ${config.evaluationSetting === 'telehealth' ? 'via telehealth' : 'in person'}${config.evaluationLocation ? ` at ${config.evaluationLocation}` : ''}.`);
    if (config.evaluationDates.length > 0) {
      lines.push(` Evaluation session(s) occurred on: ${config.evaluationDates.join(', ')}.`);
    }
    if (config.totalDuration) {
      lines.push(` Total evaluation time was approximately ${config.totalDuration}.`);
    }
    if (config.language && config.language !== 'English') {
      lines.push(` The evaluation was conducted in ${config.language}${config.interpreter ? ' with interpreter assistance' : ''}.`);
    }
    lines.push('\n');
    
    // Methods Used
    lines.push('### Methods Employed\n');
    lines.push('The following methods were used in this evaluation:\n');
    config.methodsUsed.forEach(method => {
      lines.push(`- ${method}`);
    });
    lines.push('\n');
    
    // Sources of Information
    lines.push('### Sources of Information\n');
    lines.push(`A total of ${config.recordsReviewed.length} documents/records were reviewed:\n`);
    config.recordsReviewed.slice(0, 15).forEach(record => {
      const evidenceType = typeof record.evidence_type === 'string' 
        ? record.evidence_type 
        : 'document';
      lines.push(`- ${record.filename} (${evidenceType})`);
    });
    if (config.recordsReviewed.length > 15) {
      lines.push(`- ... and ${config.recordsReviewed.length - 15} additional documents (see Evidence Inventory)`);
    }
    lines.push('\n');
    
    // Interviews
    if (config.interviews.length > 0) {
      lines.push('### Interviews Conducted\n');
      config.interviews.forEach(interview => {
        lines.push(`- ${interview.subject} (${interview.role}): ${interview.date}, ${interview.mode}${interview.duration ? `, approximately ${interview.duration}` : ''}`);
      });
      lines.push('\n');
    }
    
    // Psychological Testing
    if (config.testsAdministered.length > 0) {
      lines.push('### Psychological Testing\n');
      lines.push('The following measures were administered:\n');
      config.testsAdministered.forEach(test => {
        let testLine = `- ${test.name} (${test.date}, ${test.mode})`;
        if (test.validityConsidered) {
          testLine += ' - validity indices reviewed';
        }
        lines.push(testLine);
      });
      lines.push('\n');
    }
    
    // Telehealth considerations
    if (config.evaluationSetting === 'telehealth') {
      lines.push('### Telehealth Considerations\n');
      lines.push('This evaluation was conducted via telehealth technology. The following considerations apply:\n');
      lines.push('- Visual and audio connection quality was monitored throughout');
      lines.push('- The evaluee confirmed they were in a private location');
      lines.push('- Certain observational data (e.g., full range of psychomotor behavior) may be limited');
      lines.push('- Test administration followed telehealth-adapted protocols where available');
      lines.push('\n');
    }
    
    // What was NOT done
    if (config.whatWasNotDone.length > 0) {
      lines.push('### Procedures Not Performed\n');
      lines.push('The following procedures were not performed in this evaluation:\n');
      config.whatWasNotDone.forEach(item => {
        lines.push(`- ${item}`);
      });
      lines.push('\n');
    }
    
    // Limitations
    lines.push('### Limitations\n');
    lines.push('The following limitations apply to this evaluation:\n');
    config.limitationsNoted.forEach(limitation => {
      lines.push(`- ${limitation}`);
    });
    lines.push('\n');
    
    // Error mitigation
    lines.push('### Error Mitigation\n');
    lines.push('To mitigate potential sources of error, this evaluation employed:\n');
    lines.push('- Multi-method assessment approach');
    lines.push('- Corroboration of self-report with records and collateral information');
    if (config.testsAdministered.some(t => t.validityConsidered)) {
      lines.push('- Review of validity indices on psychological measures');
    }
    lines.push('- Consideration of alternative explanations');
    lines.push('\n');
    
    return lines.join('\n');
  }, [config]);
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-white">
        <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          📋 Methodology Appendix Generator
        </h2>
        <p className="text-sm text-slate-500">
          Auto-generates Daubert/Frye ready methodology section
        </p>
      </div>
      
      {/* Quick Config */}
      <div className="p-4 border-b space-y-4">
        {/* Setting */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Evaluation Setting
          </label>
          <div className="flex gap-2">
            {(['in_person', 'telehealth', 'mixed'] as const).map(setting => (
              <button
                key={setting}
                onClick={() => setConfig(c => ({ ...c, evaluationSetting: setting }))}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  config.evaluationSetting === setting
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {setting === 'in_person' ? 'In Person' : setting === 'telehealth' ? 'Telehealth' : 'Mixed'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Methods Used */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Methods Used
          </label>
          <div className="space-y-1">
            {template.standardMethods.map((method, i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.methodsUsed.includes(method)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setConfig(c => ({ ...c, methodsUsed: [...c.methodsUsed, method] }));
                    } else {
                      setConfig(c => ({ ...c, methodsUsed: c.methodsUsed.filter(m => m !== method) }));
                    }
                  }}
                  className="rounded"
                />
                {method}
              </label>
            ))}
          </div>
        </div>
        
        {/* Standard Tests */}
        {template.standardTests.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tests Administered
            </label>
            <div className="space-y-1">
              {template.standardTests.map((test, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.testsAdministered.some(t => t.name === test)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setConfig(c => ({
                          ...c,
                          testsAdministered: [
                            ...c.testsAdministered,
                            { name: test, date: '', mode: c.evaluationSetting === 'telehealth' ? 'telehealth' : 'in_person', validityConsidered: true }
                          ]
                        }));
                      } else {
                        setConfig(c => ({
                          ...c,
                          testsAdministered: c.testsAdministered.filter(t => t.name !== test)
                        }));
                      }
                    }}
                    className="rounded"
                  />
                  {test}
                </label>
              ))}
            </div>
          </div>
        )}
        
        {/* Limitations */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Limitations to Include
          </label>
          <div className="space-y-1">
            {template.commonLimitations.map((limitation, i) => (
              <label key={i} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.limitationsNoted.includes(limitation)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setConfig(c => ({ ...c, limitationsNoted: [...c.limitationsNoted, limitation] }));
                    } else {
                      setConfig(c => ({ ...c, limitationsNoted: c.limitationsNoted.filter(l => l !== limitation) }));
                    }
                  }}
                  className="rounded mt-0.5"
                />
                <span className="text-slate-600">{limitation}</span>
              </label>
            ))}
          </div>
          
          {/* Add custom limitation */}
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={customLimitation}
              onChange={(e) => setCustomLimitation(e.target.value)}
              placeholder="Add custom limitation..."
              className="flex-1 px-3 py-1.5 text-sm border rounded-lg"
            />
            <button
              onClick={() => {
                if (customLimitation.trim()) {
                  setConfig(c => ({ ...c, limitationsNoted: [...c.limitationsNoted, customLimitation.trim()] }));
                  setCustomLimitation('');
                }
              }}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
        
        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showAdvanced ? '▼ Hide Advanced Options' : '▶ Show Advanced Options'}
        </button>
        
        {showAdvanced && (
          <div className="space-y-3 pt-2 border-t">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                What Was NOT Done (and Why)
              </label>
              <textarea
                value={config.whatWasNotDone.join('\n')}
                onChange={(e) => setConfig(c => ({ 
                  ...c, 
                  whatWasNotDone: e.target.value.split('\n').filter(Boolean) 
                }))}
                placeholder="e.g., Neuropsychological testing was not performed due to time constraints..."
                className="w-full px-3 py-2 text-sm border rounded-lg"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Duration
                </label>
                <input
                  type="text"
                  value={config.totalDuration || ''}
                  onChange={(e) => setConfig(c => ({ ...c, totalDuration: e.target.value }))}
                  placeholder="e.g., 6 hours"
                  className="w-full px-3 py-1.5 text-sm border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Language
                </label>
                <input
                  type="text"
                  value={config.language || ''}
                  onChange={(e) => setConfig(c => ({ ...c, language: e.target.value }))}
                  placeholder="English"
                  className="w-full px-3 py-1.5 text-sm border rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Preview */}
      <div className="p-4 border-t bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-700">Preview</h3>
          <button
            onClick={() => onGenerate(generatedContent)}
            className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            ✓ Use This Content
          </button>
        </div>
        <div className="bg-white border rounded-lg p-4 max-h-64 overflow-y-auto">
          <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
            {generatedContent}
          </pre>
        </div>
      </div>
    </div>
  );
}

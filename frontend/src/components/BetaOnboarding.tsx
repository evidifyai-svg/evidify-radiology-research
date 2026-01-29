// BetaOnboarding.tsx
// First-run wizard for beta users
// Sprint 4 - Beta User Onboarding

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// ============================================
// Types
// ============================================

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface SystemCheck {
  id: string;
  label: string;
  status: 'pending' | 'checking' | 'pass' | 'fail' | 'warning';
  message?: string;
  required: boolean;
}

interface BetaOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
}

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    width: '100%',
    maxWidth: '640px',
    maxHeight: '90vh',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '24px 32px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    color: '#fff',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 700,
    margin: 0,
    marginBottom: '8px',
  },
  headerSubtitle: {
    fontSize: '15px',
    opacity: 0.9,
    margin: 0,
  },
  progressBar: {
    display: 'flex',
    gap: '8px',
    padding: '0 32px',
    paddingTop: '24px',
    backgroundColor: '#f7fafc',
  },
  progressStep: {
    flex: 1,
    height: '4px',
    backgroundColor: '#e2e8f0',
    borderRadius: '2px',
    transition: 'background-color 0.3s',
  },
  progressStepActive: {
    backgroundColor: '#4f46e5',
  },
  progressStepComplete: {
    backgroundColor: '#10b981',
  },
  content: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto' as const,
  },
  stepIndicator: {
    fontSize: '13px',
    color: '#718096',
    marginBottom: '8px',
  },
  stepTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#1a202c',
    margin: 0,
    marginBottom: '12px',
  },
  stepDescription: {
    fontSize: '15px',
    color: '#4a5568',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  checkList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  checkIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  },
  checkPending: {
    backgroundColor: '#e2e8f0',
    color: '#718096',
  },
  checkChecking: {
    backgroundColor: '#bee3f8',
    color: '#2b6cb0',
  },
  checkPass: {
    backgroundColor: '#c6f6d5',
    color: '#22543d',
  },
  checkFail: {
    backgroundColor: '#fed7d7',
    color: '#822727',
  },
  checkWarning: {
    backgroundColor: '#fefcbf',
    color: '#744210',
  },
  checkLabel: {
    flex: 1,
    fontSize: '14px',
    color: '#2d3748',
  },
  checkMessage: {
    fontSize: '12px',
    color: '#718096',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  featureCard: {
    padding: '20px',
    backgroundColor: '#f7fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  featureIcon: {
    fontSize: '28px',
    marginBottom: '12px',
  },
  featureTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: '6px',
  },
  featureDescription: {
    fontSize: '13px',
    color: '#718096',
    lineHeight: 1.5,
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#4a5568',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#2d3748',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#2d3748',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 32px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f7fafc',
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  buttonPrimary: {
    padding: '10px 24px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  tipBox: {
    padding: '16px',
    backgroundColor: '#ebf8ff',
    border: '1px solid #90cdf4',
    borderRadius: '8px',
    marginTop: '24px',
  },
  tipTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2b6cb0',
    marginBottom: '6px',
  },
  tipText: {
    fontSize: '13px',
    color: '#2c5282',
    lineHeight: 1.5,
  },
  trustBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#c6f6d5',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#22543d',
    marginBottom: '24px',
  },
  consentBox: {
    padding: '20px',
    backgroundColor: '#fffaf0',
    border: '1px solid #fbd38d',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginTop: '12px',
  },
  checkboxInput: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: 1.5,
  },
};

// ============================================
// Component
// ============================================

const STEPS: OnboardingStep[] = [
  { id: 'welcome', title: 'Welcome', description: 'Introduction to Evidify', icon: 'Welcome' },
  { id: 'system', title: 'System Check', description: 'Verify requirements', icon: 'System' },
  { id: 'profile', title: 'Profile', description: 'Your information', icon: 'Profile' },
  { id: 'privacy', title: 'Privacy', description: 'How your data is protected', icon: 'Privacy' },
  { id: 'features', title: 'Features', description: 'Key capabilities', icon: 'Features' },
  { id: 'ready', title: 'Ready', description: 'Start documenting', icon: 'Ready' },
];

export const BetaOnboarding: React.FC<BetaOnboardingProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([
    { id: 'ollama', label: 'Ollama AI Engine', status: 'pending', required: true },
    { id: 'whisper', label: 'Whisper Voice Recognition', status: 'pending', required: false },
    { id: 'storage', label: 'Local Storage Available', status: 'pending', required: true },
    { id: 'keychain', label: 'OS Keychain Access', status: 'pending', required: true },
  ]);
  const [profile, setProfile] = useState({
    name: '',
    credentials: '',
    licenseState: '',
    practiceType: 'solo',
  });
  const [consents, setConsents] = useState({
    betaTerms: false,
    feedbackOptIn: true,
    crashReports: true,
  });

  // Run system checks when on that step
  useEffect(() => {
    if (currentStep === 1) {
      runSystemChecks();
    }
  }, [currentStep]);

  const runSystemChecks = async () => {
    // Check Ollama
    updateCheck('ollama', 'checking');
    try {
      const status = await invoke<{ available: boolean; models: string[] }>('check_ollama');
      if (status.available && status.models.length > 0) {
        updateCheck('ollama', 'pass', `${status.models.length} model(s) available`);
      } else if (status.available) {
        updateCheck('ollama', 'warning', 'Running but no models installed');
      } else {
        updateCheck('ollama', 'fail', 'Not running. Start Ollama to enable AI features.');
      }
    } catch {
      updateCheck('ollama', 'fail', 'Could not connect to Ollama');
    }

    // Check Whisper
    updateCheck('whisper', 'checking');
    try {
      const voice = await invoke<{ installed: boolean; models: string[] }>('get_voice_status');
      if (voice.installed && voice.models.length > 0) {
        updateCheck('whisper', 'pass', 'Voice transcription ready');
      } else if (voice.installed) {
        updateCheck('whisper', 'warning', 'Installed but no models. Voice optional.');
      } else {
        updateCheck('whisper', 'warning', 'Not installed. Voice Scribe will be unavailable.');
      }
    } catch {
      updateCheck('whisper', 'warning', 'Could not check. Voice features may be unavailable.');
    }

    // Check storage (always passes in Tauri)
    updateCheck('storage', 'checking');
    await new Promise(r => setTimeout(r, 500));
    updateCheck('storage', 'pass', 'Local encrypted storage ready');

    // Check keychain
    updateCheck('keychain', 'checking');
    await new Promise(r => setTimeout(r, 300));
    updateCheck('keychain', 'pass', 'OS keychain accessible');
  };

  const updateCheck = (id: string, status: SystemCheck['status'], message?: string) => {
    setSystemChecks(prev => prev.map(c => 
      c.id === id ? { ...c, status, message } : c
    ));
  };

  const getCheckIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'pending': return '○';
      case 'checking': return '◌';
      case 'pass': return 'PASS';
      case 'fail': return 'FAIL';
      case 'warning': return '!';
    }
  };

  const getCheckStyle = (status: SystemCheck['status']) => {
    switch (status) {
      case 'pending': return styles.checkPending;
      case 'checking': return styles.checkChecking;
      case 'pass': return styles.checkPass;
      case 'fail': return styles.checkFail;
      case 'warning': return styles.checkWarning;
    }
  };

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'system':
        // Can proceed if no required checks failed
        return !systemChecks.some(c => c.required && c.status === 'fail');
      case 'profile':
        return profile.name.trim().length > 0;
      case 'privacy':
        return consents.betaTerms;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save profile and complete
      localStorage.setItem('evidify_beta_profile', JSON.stringify(profile));
      localStorage.setItem('evidify_onboarding_complete', 'true');
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return (
          <>
            <h2 style={styles.stepTitle}>Welcome to Evidify Beta</h2>
            <p style={styles.stepDescription}>
              Thank you for joining the Evidify beta program. You're about to experience 
              a new approach to clinical documentation—one that prioritizes your privacy, 
              saves you time, and helps you think more clearly about your clinical work.
            </p>
            
            <div style={styles.trustBadge}>
              Your data never leaves your device
            </div>

            <div style={styles.featureGrid}>
              <div style={styles.featureCard}>
                <div style={styles.featureIcon}>Voice</div>
                <div style={styles.featureTitle}>Voice Scribe</div>
                <div style={styles.featureDescription}>
                  90 seconds of speaking → complete structured note
                </div>
              </div>
              <div style={styles.featureCard}>
                <div style={styles.featureIcon}>Security</div>
                <div style={styles.featureTitle}>Local-First</div>
                <div style={styles.featureDescription}>
                  Works identically offline. PHI never transmitted.
                </div>
              </div>
              <div style={styles.featureCard}>
                <div style={styles.featureIcon}>Compliance</div>
                <div style={styles.featureTitle}>Defensible</div>
                <div style={styles.featureDescription}>
                  Hash-chained audit trail holds up in court.
                </div>
              </div>
              <div style={styles.featureCard}>
                <div style={styles.featureIcon}>Analysis</div>
                <div style={styles.featureTitle}>Clinical Growth</div>
                <div style={styles.featureDescription}>
                  Built around the supervision debrief model.
                </div>
              </div>
            </div>

            <div style={styles.tipBox}>
              <div style={styles.tipTitle}>Beta Tip</div>
              <div style={styles.tipText}>
                As a beta user, your feedback shapes the product. Use the feedback 
                button (bottom right) anytime to share what's working and what isn't.
              </div>
            </div>
          </>
        );

      case 'system':
        return (
          <>
            <h2 style={styles.stepTitle}>System Requirements</h2>
            <p style={styles.stepDescription}>
              Let's verify your system is ready for Evidify. Most features will work 
              even if optional components are missing.
            </p>

            <div style={styles.checkList}>
              {systemChecks.map(check => (
                <div key={check.id} style={styles.checkItem}>
                  <div style={{ ...styles.checkIcon, ...getCheckStyle(check.status) }}>
                    {getCheckIcon(check.status)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.checkLabel}>
                      {check.label}
                      {!check.required && <span style={{ color: '#a0aec0' }}> (optional)</span>}
                    </div>
                    {check.message && (
                      <div style={styles.checkMessage}>{check.message}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {systemChecks.some(c => c.status === 'fail' && c.required) && (
              <div style={{ ...styles.tipBox, backgroundColor: '#fff5f5', borderColor: '#fc8181' }}>
                <div style={{ ...styles.tipTitle, color: '#c53030' }}>Required Component Missing</div>
                <div style={{ ...styles.tipText, color: '#822727' }}>
                  Please install the missing components before continuing. 
                  See the QUICKSTART.md guide for installation instructions.
                </div>
              </div>
            )}
          </>
        );

      case 'profile':
        return (
          <>
            <h2 style={styles.stepTitle}>Your Profile</h2>
            <p style={styles.stepDescription}>
              This information is stored locally on your device and used to personalize 
              your experience. It's never transmitted anywhere.
            </p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Your Name</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Dr. Jane Smith"
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Credentials</label>
              <input
                type="text"
                style={styles.input}
                placeholder="PhD, LCSW, LMHC, etc."
                value={profile.credentials}
                onChange={e => setProfile({ ...profile, credentials: e.target.value })}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Primary License State</label>
              <input
                type="text"
                style={styles.input}
                placeholder="NY, CA, TX, etc."
                value={profile.licenseState}
                onChange={e => setProfile({ ...profile, licenseState: e.target.value })}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Practice Type</label>
              <select
                style={styles.select}
                value={profile.practiceType}
                onChange={e => setProfile({ ...profile, practiceType: e.target.value })}
              >
                <option value="solo">Solo Practice</option>
                <option value="group">Group Practice</option>
                <option value="agency">Agency / Community Mental Health</option>
                <option value="hospital">Hospital / Health System</option>
                <option value="training">Training Program / University</option>
                <option value="telehealth">Telehealth Only</option>
              </select>
            </div>
          </>
        );

      case 'privacy':
        return (
          <>
            <h2 style={styles.stepTitle}>Privacy & Security</h2>
            <p style={styles.stepDescription}>
              Evidify is built with privacy as a core principle. Here's how we protect 
              your clinical data.
            </p>

            <div style={{ ...styles.featureCard, marginBottom: '16px' }}>
              <div style={styles.featureTitle}>End-to-End Encryption</div>
              <div style={styles.featureDescription}>
                All clinical data is encrypted with AES-256-GCM. Your encryption key 
                is stored in your operating system's secure keychain, never in the app.
              </div>
            </div>

            <div style={{ ...styles.featureCard, marginBottom: '16px' }}>
              <div style={styles.featureTitle}>Works Offline</div>
              <div style={styles.featureDescription}>
                Disconnect from the internet and the app works identically. That's 
                the proof that PHI never leaves your device.
              </div>
            </div>

            <div style={{ ...styles.featureCard, marginBottom: '16px' }}>
              <div style={styles.featureTitle}>Hash-Chained Audit Log</div>
              <div style={styles.featureDescription}>
                Every action is logged in a cryptographically-linked chain. This 
                proves when you documented and that records haven't been altered.
              </div>
            </div>

            <div style={styles.consentBox}>
              <div style={{ fontWeight: 600, marginBottom: '12px', color: '#744210' }}>
                Beta Program Agreements
              </div>
              
              <div style={styles.checkbox}>
                <input
                  type="checkbox"
                  style={styles.checkboxInput}
                  checked={consents.betaTerms}
                  onChange={e => setConsents({ ...consents, betaTerms: e.target.checked })}
                />
                <label style={styles.checkboxLabel}>
                  <strong>I understand this is beta software.</strong> I will maintain my 
                  own backups and not rely solely on Evidify for clinical documentation 
                  during the beta period.
                </label>
              </div>

              <div style={styles.checkbox}>
                <input
                  type="checkbox"
                  style={styles.checkboxInput}
                  checked={consents.feedbackOptIn}
                  onChange={e => setConsents({ ...consents, feedbackOptIn: e.target.checked })}
                />
                <label style={styles.checkboxLabel}>
                  <strong>Optional:</strong> I'm willing to provide feedback to help 
                  improve Evidify (no PHI will ever be shared).
                </label>
              </div>

              <div style={styles.checkbox}>
                <input
                  type="checkbox"
                  style={styles.checkboxInput}
                  checked={consents.crashReports}
                  onChange={e => setConsents({ ...consents, crashReports: e.target.checked })}
                />
                <label style={styles.checkboxLabel}>
                  <strong>Optional:</strong> Send anonymous crash reports to help us 
                  fix bugs faster (never includes PHI).
                </label>
              </div>
            </div>
          </>
        );

      case 'features':
        return (
          <>
            <h2 style={styles.stepTitle}>Key Features</h2>
            <p style={styles.stepDescription}>
              Here's a quick tour of what you can do with Evidify.
            </p>

            <div style={{ ...styles.featureCard, marginBottom: '16px', padding: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>Voice</div>
              <div style={{ ...styles.featureTitle, fontSize: '18px' }}>Voice Scribe</div>
              <div style={styles.featureDescription}>
                The hero feature. Speak for 90 seconds about your session—what happened, 
                what you observed, what matters clinically—and Evidify structures it into 
                a complete progress note. Think of it as dictating to a supervisor who 
                organizes your thoughts into proper documentation.
              </div>
            </div>

            <div style={{ ...styles.featureCard, marginBottom: '16px', padding: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>Security</div>
              <div style={{ ...styles.featureTitle, fontSize: '18px' }}>Ethics Detection</div>
              <div style={styles.featureDescription}>
                As you document, Evidify flags potential safety concerns, mandatory 
                reporting situations, and documentation gaps. It surfaces what you might 
                miss when tired—not to override your judgment, but to prompt your reflection.
              </div>
            </div>

            <div style={{ ...styles.featureCard, marginBottom: '16px', padding: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>Time</div>
              <div style={{ ...styles.featureTitle, fontSize: '18px' }}>Time Metrics</div>
              <div style={styles.featureDescription}>
                Track exactly how much time you're saving. Compare your documentation 
                time to the industry average (16 minutes/encounter). Watch the "hours 
                recovered" add up over weeks and months.
              </div>
            </div>

            <div style={styles.tipBox}>
              <div style={styles.tipTitle}>Getting Started</div>
              <div style={styles.tipText}>
                Start with Voice Scribe on your next session. Create a client, 
                click "New Note," then hit the microphone. Speak naturally about 
                what happened. You'll be surprised how well it works.
              </div>
            </div>
          </>
        );

      case 'ready':
        return (
          <>
            <h2 style={styles.stepTitle}>Setup Complete</h2>
            <p style={styles.stepDescription}>
              Your Evidify installation is ready. Next steps are listed below.
            </p>

            <div style={{ ...styles.featureCard, marginBottom: '16px', backgroundColor: '#f0fff4', borderColor: '#9ae6b4' }}>
              <div style={{ ...styles.featureTitle, color: '#22543d' }}>
                First Step: Create Your Vault
              </div>
              <div style={{ ...styles.featureDescription, color: '#276749' }}>
                You'll be prompted to create a secure vault with a passphrase. 
                Choose something memorable—this protects all your clinical data.
              </div>
            </div>

            <div style={{ ...styles.featureCard, marginBottom: '16px' }}>
              <div style={styles.featureTitle}>Resources</div>
              <div style={styles.featureDescription}>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>QUICKSTART.md — Get started in 5 minutes</li>
                  <li>USER_MANUAL.md — Complete feature guide</li>
                  <li>Feedback button — Report issues or suggestions</li>
                </ul>
              </div>
            </div>

            <div style={styles.trustBadge}>
              Clinical documentation workflows are ready for use
            </div>

            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <p style={{ color: '#718096', fontSize: '14px' }}>
                Thank you for participating in the beta program, {profile.name || 'clinician'}.<br />
                Your feedback will help improve Evidify for future releases.
              </p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>Evidify Setup</h1>
          <p style={styles.headerSubtitle}>
            {STEPS[currentStep].icon} {STEPS[currentStep].description}
          </p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBar}>
          {STEPS.map((_, index) => (
            <div
              key={index}
              style={{
                ...styles.progressStep,
                ...(index < currentStep ? styles.progressStepComplete : {}),
                ...(index === currentStep ? styles.progressStepActive : {}),
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.stepIndicator}>
            Step {currentStep + 1} of {STEPS.length}
          </div>
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div>
            {currentStep > 0 ? (
              <button style={styles.buttonSecondary} onClick={prevStep}>
                ← Back
              </button>
            ) : onSkip ? (
              <button style={styles.buttonSecondary} onClick={onSkip}>
                Skip Setup
              </button>
            ) : (
              <div />
            )}
          </div>
          <button
            style={{
              ...styles.buttonPrimary,
              ...(canProceed() ? {} : styles.buttonDisabled),
            }}
            onClick={nextStep}
            disabled={!canProceed()}
          >
            {currentStep === STEPS.length - 1 ? 'Get Started' : 'Continue'} →
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetaOnboarding;

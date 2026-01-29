// PolicySettings.tsx
// Organization policy configuration UI
// Sprint 2 - Policy Configuration

import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// ============================================
// Types
// ============================================

type ExportAction = 'Allow' | 'Warn' | 'Block' | 'RequireApproval';
type CredentialLevel = 'intern' | 'trainee' | 'postdoc' | 'provisionally_licensed' | 'licensed' | 'supervisor';

interface ExportPolicy {
  cloud_sync: ExportAction;
  network_share: ExportAction;
  removable_media: ExportAction;
  unknown_destination: ExportAction;
  audit_pack_required_above: number | null;
  allowed_formats: string[];
  blocked_paths: string[];
}

interface AttestationPolicy {
  required_attestations: string[];
  recommended_attestations: string[];
  supervisor_review_required: string | null;
  attestation_timeout: number;
  allow_not_relevant: boolean;
  require_explanation_for_not_relevant: boolean;
}

interface RecordingPolicy {
  consent_required: boolean;
  auto_delete_audio_after_signing: boolean;
  max_audio_retention_days: number;
  reconsent_each_session: boolean;
  jurisdiction_rules: Record<string, JurisdictionRule>;
}

interface JurisdictionRule {
  two_party_consent: boolean;
  written_consent_required: boolean;
  notice_text: string | null;
}

interface SupervisionPolicy {
  cosign_required_for: CredentialLevel[];
  max_review_delay_hours: number;
  review_high_risk_notes: boolean;
  competency_tracking_enabled: boolean;
}

interface RetentionPolicy {
  note_retention_days: number;
  audit_log_retention_days: number;
  auto_archive_after_days: number;
  require_destruction_certificate: boolean;
}

interface OrganizationPolicy {
  id: string;
  version: string;
  organization: string;
  effective_date: string;
  expires_at: string | null;
  signed_by: string;
  signature: string;
  export_policy: ExportPolicy;
  attestation_policy: AttestationPolicy;
  recording_policy: RecordingPolicy;
  supervision_policy: SupervisionPolicy;
  retention_policy: RetentionPolicy;
  custom_rules: Record<string, unknown>;
}

interface PolicyVersionInfo {
  id: string;
  version: string;
  organization: string;
  effective_date: string;
  expires_at: string | null;
  last_sync: string | null;
}

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1a202c',
    margin: 0,
  },
  versionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#edf2f7',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#4a5568',
  },
  section: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    marginBottom: '20px',
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
    cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#2d3748',
    margin: 0,
  },
  sectionIcon: {
    fontSize: '20px',
    color: '#718096',
  },
  sectionContent: {
    padding: '20px',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#4a5568',
    marginBottom: '6px',
  },
  helpText: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '4px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#2d3748',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#2d3748',
    boxSizing: 'border-box' as const,
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 0',
  },
  checkboxInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#2d3748',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  tagContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginTop: '8px',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: '#edf2f7',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#4a5568',
  },
  tagRemove: {
    cursor: 'pointer',
    color: '#a0aec0',
    fontSize: '16px',
    lineHeight: 1,
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  buttonPrimary: {
    padding: '10px 20px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  alertSuccess: {
    backgroundColor: '#c6f6d5',
    color: '#22543d',
    border: '1px solid #9ae6b4',
  },
  alertError: {
    backgroundColor: '#fed7d7',
    color: '#822727',
    border: '1px solid #fc8181',
  },
  alertInfo: {
    backgroundColor: '#bee3f8',
    color: '#2a4365',
    border: '1px solid #63b3ed',
  },
  credentialGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
};

// ============================================
// Component
// ============================================

interface PolicySettingsProps {
  onClose?: () => void;
  readOnly?: boolean;
}

export const PolicySettings: React.FC<PolicySettingsProps> = ({ 
  onClose,
  readOnly = false 
}) => {
  const [policy, setPolicy] = useState<OrganizationPolicy | null>(null);
  const [versionInfo, setVersionInfo] = useState<PolicyVersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['export', 'attestation']));

  // Load policy on mount
  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const [activePolicy, version] = await Promise.all([
        invoke<OrganizationPolicy>('get_active_policy'),
        invoke<PolicyVersionInfo>('get_policy_version'),
      ]);
      setPolicy(activePolicy);
      setVersionInfo(version);
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to load policy: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const updateExportPolicy = useCallback((field: keyof ExportPolicy, value: unknown) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      export_policy: { ...policy.export_policy, [field]: value },
    });
  }, [policy]);

  const updateAttestationPolicy = useCallback((field: keyof AttestationPolicy, value: unknown) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      attestation_policy: { ...policy.attestation_policy, [field]: value },
    });
  }, [policy]);

  const updateRecordingPolicy = useCallback((field: keyof RecordingPolicy, value: unknown) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      recording_policy: { ...policy.recording_policy, [field]: value },
    });
  }, [policy]);

  const updateSupervisionPolicy = useCallback((field: keyof SupervisionPolicy, value: unknown) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      supervision_policy: { ...policy.supervision_policy, [field]: value },
    });
  }, [policy]);

  const updateRetentionPolicy = useCallback((field: keyof RetentionPolicy, value: unknown) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      retention_policy: { ...policy.retention_policy, [field]: value },
    });
  }, [policy]);

  const toggleCredentialLevel = (level: CredentialLevel) => {
    if (!policy) return;
    const current = policy.supervision_policy.cosign_required_for;
    const updated = current.includes(level)
      ? current.filter(l => l !== level)
      : [...current, level];
    updateSupervisionPolicy('cosign_required_for', updated);
  };

  const addFormat = (format: string) => {
    if (!policy || policy.export_policy.allowed_formats.includes(format)) return;
    updateExportPolicy('allowed_formats', [...policy.export_policy.allowed_formats, format]);
  };

  const removeFormat = (format: string) => {
    if (!policy) return;
    updateExportPolicy('allowed_formats', policy.export_policy.allowed_formats.filter(f => f !== format));
  };

  const savePolicy = async () => {
    if (!policy) return;
    try {
      setSaving(true);
      // In production, this would call a save_policy command
      // For now, we export to JSON for manual deployment
      const json = JSON.stringify(policy, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidify-policy-${policy.version}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Policy exported. Deploy via MDM or manual copy.' });
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to export: ${err}` });
    } finally {
      setSaving(false);
    }
  };

  const importPolicy = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as OrganizationPolicy;
        setPolicy(imported);
        setMessage({ type: 'info', text: 'Policy imported. Review settings before saving.' });
      } catch (err) {
        setMessage({ type: 'error', text: `Invalid policy file: ${err}` });
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#718096' }}>
          Loading policy settings...
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.alert, ...styles.alertError }}>
          Failed to load policy. Using defaults.
        </div>
      </div>
    );
  }

  const exportActionOptions: ExportAction[] = ['Allow', 'Warn', 'Block', 'RequireApproval'];
  const credentialLevels: { value: CredentialLevel; label: string }[] = [
    { value: 'intern', label: 'Intern' },
    { value: 'trainee', label: 'Trainee' },
    { value: 'postdoc', label: 'Postdoc' },
    { value: 'provisionally_licensed', label: 'Provisionally Licensed' },
    { value: 'licensed', label: 'Licensed' },
    { value: 'supervisor', label: 'Supervisor' },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Policy Settings</h1>
        <div style={styles.versionBadge}>
          <span>Organization: {policy.organization}</span>
          <span>•</span>
          <span>v{policy.version}</span>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div style={{
          ...styles.alert,
          ...(message.type === 'success' ? styles.alertSuccess : 
              message.type === 'error' ? styles.alertError : styles.alertInfo)
        }}>
          {message.text}
          <button 
            onClick={() => setMessage(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      )}

      {/* Export Policy Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader} onClick={() => toggleSection('export')}>
          <h2 style={styles.sectionTitle}>Export Controls</h2>
          <span style={styles.sectionIcon}>{expandedSections.has('export') ? '▼' : '▶'}</span>
        </div>
        {expandedSections.has('export') && (
          <div style={styles.sectionContent}>
            <div style={styles.grid}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Cloud-Synced Folders</label>
                <select
                  style={styles.select}
                  value={policy.export_policy.cloud_sync}
                  onChange={e => updateExportPolicy('cloud_sync', e.target.value as ExportAction)}
                  disabled={readOnly}
                >
                  {exportActionOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <p style={styles.helpText}>iCloud, OneDrive, Dropbox, Google Drive</p>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Network Shares</label>
                <select
                  style={styles.select}
                  value={policy.export_policy.network_share}
                  onChange={e => updateExportPolicy('network_share', e.target.value as ExportAction)}
                  disabled={readOnly}
                >
                  {exportActionOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <p style={styles.helpText}>Mapped network drives, SMB shares</p>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Removable Media</label>
                <select
                  style={styles.select}
                  value={policy.export_policy.removable_media}
                  onChange={e => updateExportPolicy('removable_media', e.target.value as ExportAction)}
                  disabled={readOnly}
                >
                  {exportActionOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <p style={styles.helpText}>USB drives, external disks</p>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Unknown Destinations</label>
                <select
                  style={styles.select}
                  value={policy.export_policy.unknown_destination}
                  onChange={e => updateExportPolicy('unknown_destination', e.target.value as ExportAction)}
                  disabled={readOnly}
                >
                  {exportActionOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <p style={styles.helpText}>Fallback for unrecognized paths</p>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Audit Pack Required Above (notes)</label>
              <input
                type="number"
                style={{ ...styles.input, width: '120px' }}
                value={policy.export_policy.audit_pack_required_above ?? ''}
                onChange={e => updateExportPolicy('audit_pack_required_above', 
                  e.target.value ? parseInt(e.target.value) : null)}
                placeholder="No limit"
                disabled={readOnly}
              />
              <p style={styles.helpText}>Require full audit pack for bulk exports exceeding this count</p>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Allowed Export Formats</label>
              <div style={styles.tagContainer}>
                {policy.export_policy.allowed_formats.map(format => (
                  <span key={format} style={styles.tag}>
                    {format.toUpperCase()}
                    {!readOnly && (
                      <span style={styles.tagRemove} onClick={() => removeFormat(format)}>×</span>
                    )}
                  </span>
                ))}
                {!readOnly && (
                  <select 
                    style={{ ...styles.select, width: 'auto', padding: '4px 8px' }}
                    onChange={e => { addFormat(e.target.value); e.target.value = ''; }}
                    defaultValue=""
                  >
                    <option value="" disabled>+ Add format</option>
                    {['pdf', 'docx', 'json', 'txt', 'html', 'csv', 'ccda'].map(f => (
                      <option key={f} value={f}>{f.toUpperCase()}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attestation Policy Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader} onClick={() => toggleSection('attestation')}>
          <h2 style={styles.sectionTitle}>Attestation Requirements</h2>
          <span style={styles.sectionIcon}>{expandedSections.has('attestation') ? '▼' : '▶'}</span>
        </div>
        {expandedSections.has('attestation') && (
          <div style={styles.sectionContent}>
            <div style={styles.checkbox}>
              <input
                type="checkbox"
                id="allowNotRelevant"
                style={styles.checkboxInput}
                checked={policy.attestation_policy.allow_not_relevant}
                onChange={e => updateAttestationPolicy('allow_not_relevant', e.target.checked)}
                disabled={readOnly}
              />
              <label htmlFor="allowNotRelevant" style={styles.checkboxLabel}>
                Allow "Not Clinically Relevant" dismissal
              </label>
            </div>

            <div style={styles.checkbox}>
              <input
                type="checkbox"
                id="requireExplanation"
                style={styles.checkboxInput}
                checked={policy.attestation_policy.require_explanation_for_not_relevant}
                onChange={e => updateAttestationPolicy('require_explanation_for_not_relevant', e.target.checked)}
                disabled={readOnly}
              />
              <label htmlFor="requireExplanation" style={styles.checkboxLabel}>
                Require explanation for "Not Relevant" dismissals
              </label>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Attestation Timeout (seconds)</label>
              <input
                type="number"
                style={{ ...styles.input, width: '120px' }}
                value={policy.attestation_policy.attestation_timeout}
                onChange={e => updateAttestationPolicy('attestation_timeout', parseInt(e.target.value) || 0)}
                placeholder="0 = unlimited"
                disabled={readOnly}
              />
              <p style={styles.helpText}>0 = no timeout. Forces deliberate review.</p>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Required Attestations</label>
              <p style={styles.helpText}>
                Detection patterns that MUST be attested before signing:
                {' '}{policy.attestation_policy.required_attestations.length} patterns
              </p>
              <div style={styles.tagContainer}>
                {policy.attestation_policy.required_attestations.slice(0, 5).map(pattern => (
                  <span key={pattern} style={{ ...styles.tag, backgroundColor: '#fed7d7' }}>
                    {pattern}
                  </span>
                ))}
                {policy.attestation_policy.required_attestations.length > 5 && (
                  <span style={styles.tag}>
                    +{policy.attestation_policy.required_attestations.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recording Policy Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader} onClick={() => toggleSection('recording')}>
          <h2 style={styles.sectionTitle}>Recording & Consent</h2>
          <span style={styles.sectionIcon}>{expandedSections.has('recording') ? '▼' : '▶'}</span>
        </div>
        {expandedSections.has('recording') && (
          <div style={styles.sectionContent}>
            <div style={styles.checkbox}>
              <input
                type="checkbox"
                id="consentRequired"
                style={styles.checkboxInput}
                checked={policy.recording_policy.consent_required}
                onChange={e => updateRecordingPolicy('consent_required', e.target.checked)}
                disabled={readOnly}
              />
              <label htmlFor="consentRequired" style={styles.checkboxLabel}>
                Require documented consent before recording
              </label>
            </div>

            <div style={styles.checkbox}>
              <input
                type="checkbox"
                id="autoDelete"
                style={styles.checkboxInput}
                checked={policy.recording_policy.auto_delete_audio_after_signing}
                onChange={e => updateRecordingPolicy('auto_delete_audio_after_signing', e.target.checked)}
                disabled={readOnly}
              />
              <label htmlFor="autoDelete" style={styles.checkboxLabel}>
                Auto-delete audio after note is signed
              </label>
            </div>

            <div style={styles.checkbox}>
              <input
                type="checkbox"
                id="reconsentSession"
                style={styles.checkboxInput}
                checked={policy.recording_policy.reconsent_each_session}
                onChange={e => updateRecordingPolicy('reconsent_each_session', e.target.checked)}
                disabled={readOnly}
              />
              <label htmlFor="reconsentSession" style={styles.checkboxLabel}>
                Require re-consent each session (vs. standing consent)
              </label>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Maximum Audio Retention (days)</label>
              <input
                type="number"
                style={{ ...styles.input, width: '120px' }}
                value={policy.recording_policy.max_audio_retention_days}
                onChange={e => updateRecordingPolicy('max_audio_retention_days', parseInt(e.target.value) || 0)}
                placeholder="0 = unlimited"
                disabled={readOnly}
              />
              <p style={styles.helpText}>0 = no automatic deletion</p>
            </div>
          </div>
        )}
      </div>

      {/* Supervision Policy Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader} onClick={() => toggleSection('supervision')}>
          <h2 style={styles.sectionTitle}>Supervision Requirements</h2>
          <span style={styles.sectionIcon}>{expandedSections.has('supervision') ? '▼' : '▶'}</span>
        </div>
        {expandedSections.has('supervision') && (
          <div style={styles.sectionContent}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Co-signature Required For</label>
              <div style={styles.credentialGrid}>
                {credentialLevels.map(({ value, label }) => (
                  <div key={value} style={styles.checkbox}>
                    <input
                      type="checkbox"
                      id={`credential-${value}`}
                      style={styles.checkboxInput}
                      checked={policy.supervision_policy.cosign_required_for.includes(value)}
                      onChange={() => toggleCredentialLevel(value)}
                      disabled={readOnly}
                    />
                    <label htmlFor={`credential-${value}`} style={styles.checkboxLabel}>
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Maximum Review Delay (hours)</label>
              <input
                type="number"
                style={{ ...styles.input, width: '120px' }}
                value={policy.supervision_policy.max_review_delay_hours}
                onChange={e => updateSupervisionPolicy('max_review_delay_hours', parseInt(e.target.value) || 0)}
                disabled={readOnly}
              />
              <p style={styles.helpText}>Alert if notes pending review exceed this</p>
            </div>

            <div style={styles.checkbox}>
              <input
                type="checkbox"
                id="reviewHighRisk"
                style={styles.checkboxInput}
                checked={policy.supervision_policy.review_high_risk_notes}
                onChange={e => updateSupervisionPolicy('review_high_risk_notes', e.target.checked)}
                disabled={readOnly}
              />
              <label htmlFor="reviewHighRisk" style={styles.checkboxLabel}>
                Require supervisor review for high-risk notes
              </label>
            </div>

            <div style={styles.checkbox}>
              <input
                type="checkbox"
                id="competencyTracking"
                style={styles.checkboxInput}
                checked={policy.supervision_policy.competency_tracking_enabled}
                onChange={e => updateSupervisionPolicy('competency_tracking_enabled', e.target.checked)}
                disabled={readOnly}
              />
              <label htmlFor="competencyTracking" style={styles.checkboxLabel}>
                Enable competency tracking (for training programs)
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Retention Policy Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader} onClick={() => toggleSection('retention')}>
          <h2 style={styles.sectionTitle}>Data Retention</h2>
          <span style={styles.sectionIcon}>{expandedSections.has('retention') ? '▼' : '▶'}</span>
        </div>
        {expandedSections.has('retention') && (
          <div style={styles.sectionContent}>
            <div style={styles.grid}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Note Retention (days)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={policy.retention_policy.note_retention_days}
                  onChange={e => updateRetentionPolicy('note_retention_days', parseInt(e.target.value) || 0)}
                  disabled={readOnly}
                />
                <p style={styles.helpText}>0 = retain indefinitely</p>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Audit Log Retention (days)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={policy.retention_policy.audit_log_retention_days}
                  onChange={e => updateRetentionPolicy('audit_log_retention_days', parseInt(e.target.value) || 0)}
                  disabled={readOnly}
                />
                <p style={styles.helpText}>Minimum 2555 days (7 years) recommended</p>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Auto-Archive After (days)</label>
              <input
                type="number"
                style={{ ...styles.input, width: '120px' }}
                value={policy.retention_policy.auto_archive_after_days}
                onChange={e => updateRetentionPolicy('auto_archive_after_days', parseInt(e.target.value) || 0)}
                disabled={readOnly}
              />
              <p style={styles.helpText}>Move to archive storage after inactivity</p>
            </div>

            <div style={styles.checkbox}>
              <input
                type="checkbox"
                id="destructionCert"
                style={styles.checkboxInput}
                checked={policy.retention_policy.require_destruction_certificate}
                onChange={e => updateRetentionPolicy('require_destruction_certificate', e.target.checked)}
                disabled={readOnly}
              />
              <label htmlFor="destructionCert" style={styles.checkboxLabel}>
                Generate destruction certificates when data is purged
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!readOnly && (
        <div style={styles.buttonRow}>
          <button style={styles.buttonSecondary} onClick={importPolicy}>
            Import Policy
          </button>
          <button style={styles.buttonSecondary} onClick={loadPolicy}>
            Reset to Current
          </button>
          {onClose && (
            <button style={styles.buttonSecondary} onClick={onClose}>
              Cancel
            </button>
          )}
          <button 
            style={styles.buttonPrimary} 
            onClick={savePolicy}
            disabled={saving}
          >
            {saving ? 'Exporting...' : 'Export Policy JSON'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PolicySettings;

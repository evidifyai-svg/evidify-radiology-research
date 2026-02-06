/**
 * ShamAIConfig.tsx
 *
 * Admin-only configuration panel for sham AI research studies.
 * Enables researchers to upload a sham AI manifest that injects deliberately
 * incorrect AI suggestions at controlled rates, following the methodology of
 * Dratsch et al. (Radiology, 2023) and Bernstein et al. (European Radiology, 2023).
 */

import React, { useState, useCallback } from 'react';
import {
  FlaskConical,
  Upload,
  CheckCircle,
  AlertTriangle,
  Trash2,
  BarChart3,
  X,
} from 'lucide-react';
import { shamAIManager } from '../../lib/shamAIManager';
import type { ShamAIManifest } from '../../lib/shamAIManager';
import { DEMO_SHAM_MANIFEST } from '../../data/shamAIDemoData';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ShamAIConfigProps {
  /** Called when a manifest is loaded or cleared */
  onManifestChange?: (manifest: ShamAIManifest | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ShamAIConfig: React.FC<ShamAIConfigProps> = ({ onManifestChange }) => {
  const [manifest, setManifest] = useState<ShamAIManifest | null>(
    shamAIManager.getManifest(),
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Manifest upload
  // -------------------------------------------------------------------------

  const loadAndActivate = useCallback(
    (parsed: ShamAIManifest) => {
      shamAIManager.loadManifest(parsed);
      setManifest(parsed);
      setUploadError(null);
      onManifestChange?.(parsed);
    },
    [onManifestChange],
  );

  const handleManifestUpload = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as ShamAIManifest;

        // Validate manifest structure
        if (!parsed.studyId || typeof parsed.studyId !== 'string') {
          throw new Error('Invalid manifest: missing or invalid studyId');
        }
        if (!parsed.cases || !Array.isArray(parsed.cases)) {
          throw new Error('Invalid manifest: missing cases array');
        }
        if (typeof parsed.totalCases !== 'number' || parsed.totalCases < 1) {
          throw new Error('Invalid manifest: totalCases must be a positive number');
        }
        if (typeof parsed.shamCaseCount !== 'number') {
          throw new Error('Invalid manifest: missing shamCaseCount');
        }
        if (!parsed.shamDistribution || typeof parsed.shamDistribution.falsePositives !== 'number' || typeof parsed.shamDistribution.falseNegatives !== 'number') {
          throw new Error('Invalid manifest: missing or invalid shamDistribution');
        }

        // Validate each case
        const validShamTypes = new Set(['FALSE_POSITIVE', 'FALSE_NEGATIVE', 'CORRECT']);
        const validTruth = new Set(['NORMAL', 'ABNORMAL']);
        parsed.cases.forEach((c, i) => {
          if (!c.caseId) {
            throw new Error(`Invalid case at index ${i}: missing caseId`);
          }
          if (!validTruth.has(c.groundTruth)) {
            throw new Error(`Invalid case "${c.caseId}": groundTruth must be NORMAL or ABNORMAL`);
          }
          if (!validTruth.has(c.shamAIRecommendation)) {
            throw new Error(`Invalid case "${c.caseId}": shamAIRecommendation must be NORMAL or ABNORMAL`);
          }
          if (!validShamTypes.has(c.shamType)) {
            throw new Error(`Invalid case "${c.caseId}": shamType must be FALSE_POSITIVE, FALSE_NEGATIVE, or CORRECT`);
          }
        });

        loadAndActivate(parsed);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error parsing manifest';
        setUploadError(message);
      }
    },
    [loadAndActivate],
  );

  const handleLoadDemo = useCallback(() => {
    loadAndActivate(DEMO_SHAM_MANIFEST);
  }, [loadAndActivate]);

  const handleClear = useCallback(() => {
    shamAIManager.unloadManifest();
    setManifest(null);
    setUploadError(null);
    onManifestChange?.(null);
  }, [onManifestChange]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div style={{
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <FlaskConical size={24} color="#a855f7" />
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', margin: 0 }}>
          Sham AI Research Mode
        </h2>
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: 'rgba(168, 85, 247, 0.2)',
          color: '#c084fc',
          fontSize: '11px',
          fontWeight: 600,
        }}>
          Admin Only
        </span>
      </div>

      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
        Upload a sham AI manifest to inject deliberately incorrect AI suggestions
        at controlled rates. This enables automation bias measurement following
        the methodology of Dratsch et al. (2023) and Bernstein et al. (2023).
      </p>

      {/* File upload zone */}
      {!manifest && (
        <>
          <div style={{
            border: '2px dashed #475569',
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            <input
              type="file"
              accept=".json"
              onChange={(e) => e.target.files?.[0] && handleManifestUpload(e.target.files[0])}
              style={{ display: 'none' }}
              id="sham-manifest-upload"
            />
            <label htmlFor="sham-manifest-upload" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <Upload size={32} color="#64748b" />
              </div>
              <p style={{ color: '#94a3b8', margin: '0 0 4px 0' }}>
                Upload Sham AI Manifest (JSON)
              </p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                Fields: caseId, groundTruth, shamAIRecommendation, shamType
              </p>
            </label>
          </div>

          {/* Load demo button */}
          <button
            onClick={handleLoadDemo}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#1e1b4b',
              color: '#a5b4fc',
              border: '1px solid #4338ca',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <BarChart3 size={14} />
            Load Demo Manifest (Bernstein et al. parameters)
          </button>
        </>
      )}

      {/* Upload error */}
      {uploadError && (
        <div style={{
          backgroundColor: 'rgba(127, 29, 29, 0.3)',
          border: '1px solid #b91c1c',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <X size={16} color="#f87171" />
          <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{uploadError}</p>
        </div>
      )}

      {/* Manifest summary */}
      {manifest && (
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: 'white', fontWeight: 500, margin: 0, fontSize: '15px' }}>
              Loaded Manifest
            </h3>
            <button
              onClick={handleClear}
              style={{
                padding: '4px 10px',
                backgroundColor: 'rgba(127, 29, 29, 0.3)',
                color: '#f87171',
                border: '1px solid #7f1d1d',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Trash2 size={12} />
              Clear
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
            {manifest.description}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Study ID:</span>
              <span style={{ color: 'white', marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px' }}>{manifest.studyId}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Total Cases:</span>
              <span style={{ color: 'white', marginLeft: '8px' }}>{manifest.totalCases}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Sham Cases:</span>
              <span style={{ color: '#c084fc', marginLeft: '8px', fontWeight: 600 }}>{manifest.shamCaseCount}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Sham Rate:</span>
              <span style={{ color: '#c084fc', marginLeft: '8px' }}>
                {manifest.totalCases > 0 ? ((manifest.shamCaseCount / manifest.totalCases) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>False Positives:</span>
              <span style={{ color: '#f87171', marginLeft: '8px', fontWeight: 600 }}>{manifest.shamDistribution.falsePositives}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>False Negatives:</span>
              <span style={{ color: '#fbbf24', marginLeft: '8px', fontWeight: 600 }}>{manifest.shamDistribution.falseNegatives}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Target AUC:</span>
              <span style={{ color: 'white', marginLeft: '8px' }}>{manifest.targetAUC}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Cases in Manifest:</span>
              <span style={{ color: 'white', marginLeft: '8px' }}>{manifest.cases.length}</span>
            </div>
          </div>

          {/* Active indicator */}
          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #334155',
          }}>
            <p style={{
              color: '#4ade80',
              fontSize: '13px',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <CheckCircle size={16} />
              Sham AI Mode Active — AI suggestions will be manipulated per manifest
            </p>
          </div>
        </div>
      )}

      {/* Research use warning */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: 'rgba(146, 64, 14, 0.15)',
        border: '1px solid rgba(217, 119, 6, 0.3)',
        borderRadius: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <AlertTriangle size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ color: '#fde68a', fontSize: '13px', fontWeight: 600, margin: '0 0 4px 0' }}>
              Research Use Only
            </p>
            <p style={{ color: 'rgba(253, 230, 138, 0.6)', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
              Sham AI mode is for controlled research studies only. Radiologists in the study
              should be blinded to which cases contain sham suggestions. All sham interactions
              are logged with SHAM_AI event types in the tamper-evident hash chain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShamAIConfig;

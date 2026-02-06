/**
 * AccountabilityBanner.tsx
 *
 * Configurable documentation-awareness notification banner for reading sessions.
 *
 * Research basis: Bernstein et al. (European Radiology, 2023) demonstrated that
 * telling radiologists their AI interaction would be "kept" versus "deleted" from
 * patient files changed behavior — reducing false positives (p = 0.03). This
 * component is the deployable technology version of that verbal manipulation.
 *
 * Three configurable modes:
 *   OFF      — No banner displayed (control condition)
 *   STANDARD — Brief quality-assurance framing
 *   EXPLICIT — Detailed audit-trail framing with legal context
 */

import React, { useState, useEffect, useRef } from 'react';
import { Shield, X } from 'lucide-react';
import type { AccountabilityMode } from '../../data/studyConfig';

// ============================================================================
// Banner text per mode
// ============================================================================

const BANNER_TEXT: Record<Exclude<AccountabilityMode, 'off'>, string> = {
  standard:
    'Your assessment sequence is being documented for quality assurance review.',
  explicit:
    'Your decision sequence, timing, and AI interactions are being recorded in a tamper-evident audit trail and may be reviewed for research, quality assurance, or legal purposes.',
};

// ============================================================================
// Props
// ============================================================================

export interface AccountabilityBannerProps {
  mode: AccountabilityMode;
  /** Called when the clinician acknowledges / dismisses the banner. */
  onDismiss?: () => void;
  /** Study identifier — included in logged events. */
  studyId: string;
  /**
   * Optional event logger callback. When provided the banner will emit
   * ACCOUNTABILITY_NOTIFICATION_DISPLAYED and _DISMISSED events through it.
   * Signature: (type: string, payload: unknown) => Promise<unknown>
   */
  logEvent?: (type: string, payload: unknown) => Promise<unknown>;
}

// ============================================================================
// Component
// ============================================================================

const AccountabilityBanner: React.FC<AccountabilityBannerProps> = ({
  mode,
  onDismiss,
  studyId,
  logEvent,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const loggedRef = useRef(false);

  // Log that the banner was displayed (once per mount / mode change)
  useEffect(() => {
    if (mode === 'off' || loggedRef.current) return;
    loggedRef.current = true;

    logEvent?.('ACCOUNTABILITY_NOTIFICATION_DISPLAYED', {
      studyId,
      mode,
      timestamp: new Date().toISOString(),
    });
  }, [mode, studyId, logEvent]);

  // Reset logged flag if mode changes back to off then on again
  useEffect(() => {
    if (mode === 'off') {
      loggedRef.current = false;
    }
  }, [mode]);

  const handleDismiss = () => {
    logEvent?.('ACCOUNTABILITY_NOTIFICATION_DISMISSED', {
      studyId,
      timestamp: new Date().toISOString(),
    });
    setDismissed(true);
    onDismiss?.();
  };

  if (mode === 'off' || dismissed) return null;

  return (
    <div
      style={{
        backgroundColor: 'rgba(120, 53, 15, 0.2)',
        borderBottom: '1px solid rgba(180, 83, 9, 0.5)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Shield
          size={20}
          style={{ color: '#fbbf24', flexShrink: 0 }}
        />
        <span style={{ color: '#fde68a', fontSize: '13px', lineHeight: 1.5 }}>
          {BANNER_TEXT[mode]}
        </span>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#fbbf24',
          cursor: 'pointer',
          fontSize: '13px',
          textDecoration: 'underline',
          flexShrink: 0,
          padding: '4px 8px',
        }}
      >
        Understood
      </button>
    </div>
  );
};

export default AccountabilityBanner;

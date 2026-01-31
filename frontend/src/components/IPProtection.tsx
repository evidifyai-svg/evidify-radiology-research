/**
 * IPProtection.tsx
 *
 * IP Protection components for Evidify demo:
 * - Fixed footer with copyright and confidentiality notice
 * - Splash modal that appears once per session
 */

import React, { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';

const SESSION_STORAGE_KEY = 'evidify_ip_acknowledged';

/**
 * Fixed footer component displaying IP protection notice
 */
export const IPProtectionFooter: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0f172a',
        borderTop: '1px solid #334155',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: '#94a3b8',
        zIndex: 9998,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <Shield size={14} style={{ color: '#6366f1' }} />
      <span>
        <strong style={{ color: '#c7d2fe' }}>Evidify™ Research Platform</strong>
        {' — '}
        <span style={{ color: '#f59e0b' }}>Confidential Preview Build</span>
        {' | '}
        © 2026 Josh Henderson
        {' | '}
        For evaluation only
        {' | '}
        <a
          href="mailto:evidify.ai@gmail.com"
          style={{ color: '#60a5fa', textDecoration: 'none' }}
        >
          evidify.ai@gmail.com
        </a>
      </span>
    </div>
  );
};

/**
 * Splash modal that appears once per session
 */
export const IPProtectionSplash: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already acknowledged this session
    const acknowledged = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!acknowledged) {
      setIsVisible(true);
    }
  }, []);

  const handleAcknowledge = () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '520px',
          width: '90%',
          border: '2px solid #6366f1',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
        }}
      >
        {/* Logo/Shield Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#4f46e5',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto 24px',
          }}
        >
          <Shield size={32} style={{ color: 'white' }} />
        </div>

        {/* Title */}
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: '28px',
            fontWeight: 700,
            color: 'white',
          }}
        >
          Evidify™ Research Platform
        </h1>

        {/* Subtitle */}
        <div
          style={{
            display: 'inline-block',
            padding: '6px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            marginBottom: '24px',
          }}
        >
          CONFIDENTIAL PREVIEW BUILD
        </div>

        {/* Body */}
        <p
          style={{
            margin: '0 0 32px',
            fontSize: '15px',
            lineHeight: 1.6,
            color: '#cbd5e1',
          }}
        >
          This demo is provided for evaluation by Brown University Radiology
          Human Factors Lab only. All materials, code, and concepts remain the
          intellectual property of Josh Henderson.
        </p>

        {/* Button */}
        <button
          onClick={handleAcknowledge}
          style={{
            width: '100%',
            padding: '16px 32px',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4338ca')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
        >
          I Understand — Continue to Demo
        </button>
      </div>
    </div>
  );
};

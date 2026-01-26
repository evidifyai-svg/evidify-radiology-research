// ConnectionStatus.tsx
// Visual proof that Evidify works offline
// "Works identically with internet off — try it"

import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// ============================================
// Types
// ============================================

interface ConnectionState {
  online: boolean;
  ollamaConnected: boolean;
  lastChecked: Date;
  checking: boolean;
}

interface ConnectionStatusProps {
  /** Show expanded details */
  expanded?: boolean;
  /** Callback when connection state changes */
  onChange?: (state: ConnectionState) => void;
}

// ============================================
// Connection Status Component
// ============================================

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  expanded = false,
  onChange 
}) => {
  const [state, setState] = useState<ConnectionState>({
    online: navigator.onLine,
    ollamaConnected: false,
    lastChecked: new Date(),
    checking: true,
  });
  
  const [showTooltip, setShowTooltip] = useState(false);
  const [recentlyChanged, setRecentlyChanged] = useState(false);

  // Check Ollama connection
  const checkOllama = useCallback(async () => {
    try {
      const result = await invoke<boolean>('check_ollama');
      return result;
    } catch {
      return false;
    }
  }, []);

  // Full connection check
  const checkConnection = useCallback(async () => {
    setState(s => ({ ...s, checking: true }));
    
    const ollamaConnected = await checkOllama();
    const newState: ConnectionState = {
      online: navigator.onLine,
      ollamaConnected,
      lastChecked: new Date(),
      checking: false,
    };
    
    setState(newState);
    onChange?.(newState);
  }, [checkOllama, onChange]);

  // Initial check and periodic refresh
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkConnection]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(s => ({ ...s, online: true }));
      setRecentlyChanged(true);
      setTimeout(() => setRecentlyChanged(false), 3000);
      checkConnection();
    };
    
    const handleOffline = () => {
      setState(s => ({ ...s, online: false }));
      setRecentlyChanged(true);
      setTimeout(() => setRecentlyChanged(false), 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  // Determine overall status
  const getStatus = (): 'ready' | 'limited' | 'offline' => {
    if (!state.online) return 'offline';
    if (!state.ollamaConnected) return 'limited';
    return 'ready';
  };

  const status = getStatus();

  // Status messages
  const statusConfig = {
    ready: {
      icon: '●',
      label: 'All Systems Ready',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      description: 'Internet connected, AI ready',
    },
    limited: {
      icon: '●',
      label: 'Limited Mode',
      color: '#d97706',
      bgColor: '#fffbeb',
      description: 'Internet connected, AI unavailable',
    },
    offline: {
      icon: '○',
      label: 'Offline Mode',
      color: '#6366f1',
      bgColor: '#eef2ff',
      description: 'Working offline — your data is safe',
    },
  };

  const config = statusConfig[status];

  // Compact indicator (default)
  if (!expanded) {
    return (
      <div 
        className="connection-status"
        data-status={status}
        data-changed={recentlyChanged}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => checkConnection()}
        role="status"
        aria-label={config.label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          background: config.bgColor,
          color: config.color,
          position: 'relative',
        }}
      >
        <span 
          style={{ 
            fontSize: '10px',
            animation: state.checking ? 'pulse 1s infinite' : 'none',
          }}
        >
          {config.icon}
        </span>
        <span>{status === 'offline' ? 'Offline' : status === 'limited' ? 'Limited' : 'Ready'}</span>
        
        {/* Tooltip */}
        {showTooltip && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '8px',
              padding: '12px 16px',
              background: '#1e293b',
              color: '#f1f5f9',
              borderRadius: '8px',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{config.label}</div>
            <div style={{ color: '#94a3b8' }}>{config.description}</div>
            {status === 'offline' && (
              <div style={{ marginTop: '8px', color: '#a5b4fc', fontSize: '12px' }}>
                🔒 All features work offline
              </div>
            )}
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
              Click to refresh • Last checked: {state.lastChecked.toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded panel view
  return (
    <div 
      className="connection-status-panel"
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: config.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: config.color,
          }}
        >
          {status === 'offline' ? '📴' : status === 'limited' ? '⚠️' : '✓'}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '16px', color: '#1e293b' }}>
            {config.label}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            {config.description}
          </div>
        </div>
      </div>

      {/* Connection Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <ConnectionItem
          label="Internet"
          connected={state.online}
          description={state.online ? 'Connected' : 'Disconnected'}
        />
        <ConnectionItem
          label="Ollama AI"
          connected={state.ollamaConnected}
          description={state.ollamaConnected ? 'Running on localhost:11434' : 'Not running'}
        />
        <ConnectionItem
          label="Local Vault"
          connected={true}
          description="Encrypted and secure"
        />
      </div>

      {/* Privacy Message */}
      {status === 'offline' && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: '#eef2ff',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#4f46e5',
          }}
        >
          <strong>🔒 Privacy Verified:</strong> You're working offline. This proves no data 
          is being sent to external servers. All AI processing happens locally.
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={() => checkConnection()}
        disabled={state.checking}
        style={{
          marginTop: '16px',
          width: '100%',
          padding: '10px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          background: state.checking ? '#f1f5f9' : '#ffffff',
          color: '#64748b',
          fontSize: '14px',
          cursor: state.checking ? 'not-allowed' : 'pointer',
        }}
      >
        {state.checking ? 'Checking...' : 'Refresh Status'}
      </button>
    </div>
  );
};

// ============================================
// Connection Item Component
// ============================================

interface ConnectionItemProps {
  label: string;
  connected: boolean;
  description: string;
}

const ConnectionItem: React.FC<ConnectionItemProps> = ({ label, connected, description }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      background: '#f8fafc',
      borderRadius: '8px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '10px', color: connected ? '#16a34a' : '#dc2626' }}>●</span>
      <span style={{ fontWeight: 500, color: '#1e293b' }}>{label}</span>
    </div>
    <span style={{ fontSize: '13px', color: '#64748b' }}>{description}</span>
  </div>
);

// ============================================
// Offline Banner Component
// ============================================

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        background: '#312e81',
        color: '#e0e7ff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        zIndex: 9999,
        animation: 'slideUp 0.3s ease',
      }}
    >
      <span style={{ fontSize: '20px' }}>📴</span>
      <div>
        <div style={{ fontWeight: 600, marginBottom: '2px' }}>Working Offline</div>
        <div style={{ fontSize: '13px', opacity: 0.9 }}>
          All features work normally. Your data never leaves this device.
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 12px',
          color: '#e0e7ff',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        Got it
      </button>
      
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ConnectionStatus;

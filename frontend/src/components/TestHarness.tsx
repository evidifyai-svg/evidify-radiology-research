// TestHarness.tsx
// Quick test harness for v4.2.1-beta features
// Run: Import this component and render it to test all new features

import React, { useState } from 'react';
import { PolicySettings } from './PolicySettings';
import { BetaOnboarding } from './BetaOnboarding';
import { 
  getPerformanceStats, 
  clearCaches, 
  optimizeDatabase,
  getActivePolicy,
  getPolicyVersion,
} from '../lib/tauri';
import {
  FrontendCache,
  debounce,
  throttle,
  memoize,
  calculateVirtualList,
  measureRender,
} from '../lib/performance';

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a202c',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#718096',
    fontSize: '14px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    marginRight: '8px',
    marginBottom: '8px',
  },
  buttonSecondary: {
    padding: '8px 16px',
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    marginRight: '8px',
    marginBottom: '8px',
  },
  output: {
    backgroundColor: '#1a202c',
    color: '#68d391',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'Monaco, Consolas, monospace',
    whiteSpace: 'pre-wrap' as const,
    maxHeight: '200px',
    overflow: 'auto',
    marginTop: '12px',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  badgeSuccess: {
    backgroundColor: '#c6f6d5',
    color: '#22543d',
  },
  badgeError: {
    backgroundColor: '#fed7d7',
    color: '#822727',
  },
  badgeInfo: {
    backgroundColor: '#bee3f8',
    color: '#2a4365',
  },
  modal: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto',
  },
};

// ============================================
// Component
// ============================================

export const TestHarness: React.FC = () => {
  const [output, setOutput] = useState<Record<string, string>>({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const log = (section: string, message: string) => {
    setOutput(prev => ({
      ...prev,
      [section]: `${prev[section] || ''}${message}\n`,
    }));
  };

  const clearLog = (section: string) => {
    setOutput(prev => ({ ...prev, [section]: '' }));
  };

  // ============================================
  // Policy Tests
  // ============================================

  const testGetPolicy = async () => {
    clearLog('policy');
    try {
      log('policy', '→ Calling getActivePolicy()...');
      const policy = await getActivePolicy();
      log('policy', `✓ Organization: ${policy.organization}`);
      log('policy', `✓ Version: ${policy.version}`);
      log('policy', `✓ Export Policy: ${JSON.stringify(policy.export_policy, null, 2)}`);
    } catch (e) {
      log('policy', `✗ Error: ${e}`);
    }
  };

  const testGetPolicyVersion = async () => {
    try {
      log('policy', '→ Calling getPolicyVersion()...');
      const version = await getPolicyVersion();
      log('policy', `✓ Version Info: ${JSON.stringify(version, null, 2)}`);
    } catch (e) {
      log('policy', `✗ Error: ${e}`);
    }
  };

  // ============================================
  // Performance Tests
  // ============================================

  const testPerformanceStats = async () => {
    clearLog('perf');
    try {
      log('perf', '→ Calling getPerformanceStats()...');
      const stats = await getPerformanceStats();
      log('perf', `✓ Cache entries: ${stats.cache.entries}`);
      log('perf', `✓ Cache hit rate: ${(stats.cache.hit_rate * 100).toFixed(1)}%`);
      log('perf', `✓ Memory (RSS): ${stats.memory.rss_mb.toFixed(2)} MB`);
      log('perf', `✓ Pending tasks: ${stats.pending_background_tasks}`);
    } catch (e) {
      log('perf', `✗ Error: ${e}`);
    }
  };

  const testClearCaches = async () => {
    try {
      log('perf', '→ Calling clearCaches()...');
      await clearCaches();
      log('perf', '✓ Caches cleared');
    } catch (e) {
      log('perf', `✗ Error: ${e}`);
    }
  };

  const testOptimizeDb = async () => {
    try {
      log('perf', '→ Calling optimizeDatabase()...');
      await optimizeDatabase();
      log('perf', '✓ Database optimization triggered');
    } catch (e) {
      log('perf', `✗ Error: ${e}`);
    }
  };

  // ============================================
  // Frontend Utils Tests
  // ============================================

  const testFrontendCache = () => {
    clearLog('utils');
    const cache = new FrontendCache<string>(5, 3000);
    
    log('utils', '→ Testing FrontendCache...');
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    const v1 = cache.get('key1');
    const v2 = cache.get('key2');
    const v3 = cache.get('key3');
    
    log('utils', `✓ get('key1'): ${v1}`);
    log('utils', `✓ get('key2'): ${v2}`);
    log('utils', `✓ get('key3'): ${v3} (should be null)`);
    log('utils', `✓ Stats: ${JSON.stringify(cache.stats())}`);
  };

  const testDebounceThrottle = () => {
    let debounceCount = 0;
    let throttleCount = 0;
    
    const debouncedFn = debounce(() => debounceCount++, 100);
    const throttledFn = throttle(() => throttleCount++, 100);
    
    log('utils', '→ Testing debounce/throttle (10 rapid calls)...');
    
    for (let i = 0; i < 10; i++) {
      debouncedFn();
      throttledFn();
    }
    
    setTimeout(() => {
      log('utils', `✓ Debounce called: ${debounceCount} time(s) (expected: 1)`);
      log('utils', `✓ Throttle called: ${throttleCount} time(s) (expected: 1-2)`);
    }, 200);
  };

  const testMemoize = () => {
    let computeCount = 0;
    const expensive = memoize((n: number) => {
      computeCount++;
      return n * n;
    });
    
    log('utils', '→ Testing memoize...');
    const r1 = expensive(5);
    const r2 = expensive(5);
    const r3 = expensive(5);
    const r4 = expensive(10);
    
    log('utils', `✓ expensive(5) = ${r1}, ${r2}, ${r3}`);
    log('utils', `✓ expensive(10) = ${r4}`);
    log('utils', `✓ Compute count: ${computeCount} (expected: 2)`);
  };

  const testVirtualList = () => {
    log('utils', '→ Testing calculateVirtualList...');
    
    const result = calculateVirtualList(1000, 500, {
      itemHeight: 50,
      overscan: 5,
      containerHeight: 400,
    });
    
    log('utils', `✓ Result: ${JSON.stringify(result)}`);
    log('utils', `  - startIndex: ${result.startIndex}`);
    log('utils', `  - endIndex: ${result.endIndex}`);
    log('utils', `  - offsetY: ${result.offsetY}`);
    log('utils', `  - visibleCount: ${result.visibleCount}`);
  };

  const testRenderMeasure = () => {
    log('utils', '→ Testing measureRender...');
    const endMeasure = measureRender('TestComponent');
    
    // Simulate some work
    let sum = 0;
    for (let i = 0; i < 1000000; i++) sum += i;
    
    const duration = endMeasure();
    log('utils', `✓ Render time: ${duration.toFixed(2)}ms`);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🧪 Evidify v4.2.1-beta Test Harness</h1>
        <p style={styles.subtitle}>
          Test all new features before beta release
        </p>
      </div>

      {/* Test Cards */}
      <div style={styles.grid}>
        {/* Policy Settings */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            🎛️ Policy Configuration
            <span style={{ ...styles.badge, ...styles.badgeInfo }}>Sprint 2</span>
          </h3>
          <button style={styles.button} onClick={() => setShowPolicy(true)}>
            Open Policy UI
          </button>
          <button style={styles.buttonSecondary} onClick={testGetPolicy}>
            Get Policy
          </button>
          <button style={styles.buttonSecondary} onClick={testGetPolicyVersion}>
            Get Version
          </button>
          {output.policy && <pre style={styles.output}>{output.policy}</pre>}
        </div>

        {/* Beta Onboarding */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            🎓 Beta Onboarding
            <span style={{ ...styles.badge, ...styles.badgeInfo }}>Sprint 4</span>
          </h3>
          <button style={styles.button} onClick={() => setShowOnboarding(true)}>
            Launch Onboarding Wizard
          </button>
          <button 
            style={styles.buttonSecondary} 
            onClick={() => {
              localStorage.removeItem('evidify_onboarding_complete');
              localStorage.removeItem('evidify_beta_profile');
              log('onboard', '✓ Onboarding state reset');
            }}
          >
            Reset Onboarding
          </button>
          {output.onboard && <pre style={styles.output}>{output.onboard}</pre>}
        </div>

        {/* Backend Performance */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            ⚡ Backend Performance
            <span style={{ ...styles.badge, ...styles.badgeInfo }}>Sprint 4</span>
          </h3>
          <button style={styles.button} onClick={testPerformanceStats}>
            Get Stats
          </button>
          <button style={styles.buttonSecondary} onClick={testClearCaches}>
            Clear Caches
          </button>
          <button style={styles.buttonSecondary} onClick={testOptimizeDb}>
            Optimize DB
          </button>
          {output.perf && <pre style={styles.output}>{output.perf}</pre>}
        </div>

        {/* Frontend Utils */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            🔧 Frontend Utilities
            <span style={{ ...styles.badge, ...styles.badgeInfo }}>Sprint 4</span>
          </h3>
          <button style={styles.button} onClick={testFrontendCache}>
            Test Cache
          </button>
          <button style={styles.buttonSecondary} onClick={testDebounceThrottle}>
            Debounce/Throttle
          </button>
          <button style={styles.buttonSecondary} onClick={testMemoize}>
            Memoize
          </button>
          <button style={styles.buttonSecondary} onClick={testVirtualList}>
            Virtual List
          </button>
          <button style={styles.buttonSecondary} onClick={testRenderMeasure}>
            Measure Render
          </button>
          {output.utils && <pre style={styles.output}>{output.utils}</pre>}
        </div>
      </div>

      {/* MDM Info */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>
          📦 MDM Packages
          <span style={{ ...styles.badge, ...styles.badgeInfo }}>Sprint 3</span>
        </h3>
        <p style={{ color: '#718096', fontSize: '14px', marginBottom: '12px' }}>
          MDM packages require manual testing. Files located at:
        </p>
        <pre style={{ ...styles.output, color: '#90cdf4' }}>
{`Jamf Pro (macOS):
  mdm/jamf/evidify-config.mobileconfig
  mdm/jamf/postinstall.sh

Microsoft Intune (Windows):
  mdm/intune/Install-Evidify.ps1

Documentation:
  mdm/README.md`}
        </pre>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button 
          style={{ ...styles.button, backgroundColor: '#22543d' }}
          onClick={() => setOutput({})}
        >
          Clear All Output
        </button>
        <button 
          style={styles.buttonSecondary}
          onClick={() => window.location.reload()}
        >
          Reload App
        </button>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <BetaOnboarding
          onComplete={() => {
            setShowOnboarding(false);
            log('onboard', '✓ Onboarding completed!');
          }}
          onSkip={() => {
            setShowOnboarding(false);
            log('onboard', '→ Onboarding skipped');
          }}
        />
      )}

      {/* Policy Modal */}
      {showPolicy && (
        <div style={styles.modal} onClick={() => setShowPolicy(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <PolicySettings onClose={() => setShowPolicy(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TestHarness;

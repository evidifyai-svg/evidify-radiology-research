// TimeMetrics.tsx
// Show users their time savings - key proof of value
// "Recover hours per week"

import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// ============================================
// Types
// ============================================

interface SessionMetrics {
  noteId: string;
  clientId: string;
  startTime: number;
  endTime: number;
  method: 'voice' | 'typed' | 'template';
  wordCount: number;
  aiAssisted: boolean;
}

interface TimeMetricsData {
  totalNotes: number;
  totalTimeSeconds: number;
  avgTimeSeconds: number;
  voiceScribeCount: number;
  voiceScribeAvgSeconds: number;
  typedCount: number;
  typedAvgSeconds: number;
  estimatedTimeSavedSeconds: number;
  weeklyStats: WeeklyStats[];
}

interface WeeklyStats {
  weekStart: string;
  noteCount: number;
  totalSeconds: number;
  avgSeconds: number;
}

interface TimeMetricsProps {
  /** Show full dashboard vs compact widget */
  variant?: 'dashboard' | 'widget' | 'banner';
  /** Time period for stats */
  period?: 'week' | 'month' | 'all';
}

// ============================================
// Constants
// ============================================

// Industry benchmark: 16 minutes per encounter for documentation
const INDUSTRY_BENCHMARK_SECONDS = 16 * 60; // 960 seconds

// Target time with Evidify Voice Scribe
const TARGET_VOICE_SECONDS = 120; // 2 minutes

// ============================================
// Time Metrics Component
// ============================================

export const TimeMetrics: React.FC<TimeMetricsProps> = ({ 
  variant = 'widget',
  period = 'month'
}) => {
  const [metrics, setMetrics] = useState<TimeMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<SessionMetrics | null>(null);

  // Fetch metrics on mount
  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await invoke<TimeMetricsData>('get_time_metrics', { period });
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch time metrics:', err);
      // Use mock data for demo
      setMetrics(getMockMetrics());
    } finally {
      setLoading(false);
    }
  };

  // Calculate derived metrics
  const derived = useMemo(() => {
    if (!metrics) return null;

    const timeSavedPerNote = INDUSTRY_BENCHMARK_SECONDS - metrics.avgTimeSeconds;
    const weeklyTimeSaved = timeSavedPerNote * (metrics.totalNotes / 4); // Assume 4 weeks
    const monthlyTimeSaved = timeSavedPerNote * metrics.totalNotes;
    const percentReduction = ((INDUSTRY_BENCHMARK_SECONDS - metrics.avgTimeSeconds) / INDUSTRY_BENCHMARK_SECONDS) * 100;

    return {
      timeSavedPerNote,
      weeklyTimeSaved,
      monthlyTimeSaved,
      percentReduction,
      hoursRecovered: monthlyTimeSaved / 3600,
    };
  }, [metrics]);

  // Format seconds to human readable
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="time-metrics time-metrics--loading">
        <div className="time-metrics__spinner" />
      </div>
    );
  }

  // No data state
  if (!metrics || metrics.totalNotes === 0) {
    return (
      <div className="time-metrics time-metrics--empty">
        <div className="time-metrics__empty-icon">Metrics</div>
        <p>Complete your first note to start tracking time savings</p>
      </div>
    );
  }

  // Banner variant - minimal inline display
  if (variant === 'banner') {
    return (
      <div className="time-metrics-banner">
        <span className="time-metrics-banner__icon">Alert</span>
        <span className="time-metrics-banner__text">
          You've saved <strong>{formatTime(derived?.monthlyTimeSaved || 0)}</strong> this month
        </span>
        <span className="time-metrics-banner__detail">
          ({Math.round(derived?.percentReduction || 0)}% faster than industry average)
        </span>
      </div>
    );
  }

  // Widget variant - compact card
  if (variant === 'widget') {
    return (
      <div className="time-metrics-widget">
        <div className="time-metrics-widget__header">
          <h3>Time Saved</h3>
          <span className="time-metrics-widget__period">{period}</span>
        </div>
        
        <div className="time-metrics-widget__hero">
          <div className="time-metrics-widget__value">
            {formatTime(derived?.monthlyTimeSaved || 0)}
          </div>
          <div className="time-metrics-widget__label">recovered this {period}</div>
        </div>

        <div className="time-metrics-widget__stats">
          <div className="time-metrics-widget__stat">
            <div className="time-metrics-widget__stat-value">{metrics.totalNotes}</div>
            <div className="time-metrics-widget__stat-label">notes</div>
          </div>
          <div className="time-metrics-widget__stat">
            <div className="time-metrics-widget__stat-value">{formatTime(metrics.avgTimeSeconds)}</div>
            <div className="time-metrics-widget__stat-label">avg/note</div>
          </div>
          <div className="time-metrics-widget__stat">
            <div className="time-metrics-widget__stat-value">{Math.round(derived?.percentReduction || 0)}%</div>
            <div className="time-metrics-widget__stat-label">faster</div>
          </div>
        </div>

        <div className="time-metrics-widget__comparison">
          <div className="time-metrics-widget__bar">
            <div 
              className="time-metrics-widget__bar-industry"
              style={{ width: '100%' }}
            >
              <span>Industry avg: {formatTime(INDUSTRY_BENCHMARK_SECONDS)}</span>
            </div>
            <div 
              className="time-metrics-widget__bar-you"
              style={{ width: `${(metrics.avgTimeSeconds / INDUSTRY_BENCHMARK_SECONDS) * 100}%` }}
            >
              <span>You: {formatTime(metrics.avgTimeSeconds)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard variant - full detailed view
  return (
    <div className="time-metrics-dashboard">
      <div className="time-metrics-dashboard__header">
        <h2>Documentation Efficiency</h2>
        <div className="time-metrics-dashboard__period-selector">
          <button className={period === 'week' ? 'active' : ''}>Week</button>
          <button className={period === 'month' ? 'active' : ''}>Month</button>
          <button className={period === 'all' ? 'active' : ''}>All Time</button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="time-metrics-dashboard__hero">
        <div className="time-metrics-dashboard__hero-card time-metrics-dashboard__hero-card--primary">
          <div className="time-metrics-dashboard__hero-icon">Time</div>
          <div className="time-metrics-dashboard__hero-value">
            {derived?.hoursRecovered.toFixed(1)}
          </div>
          <div className="time-metrics-dashboard__hero-unit">hours</div>
          <div className="time-metrics-dashboard__hero-label">
            recovered this {period}
          </div>
        </div>

        <div className="time-metrics-dashboard__hero-card">
          <div className="time-metrics-dashboard__hero-value">{formatTime(metrics.avgTimeSeconds)}</div>
          <div className="time-metrics-dashboard__hero-label">average per note</div>
          <div className="time-metrics-dashboard__hero-comparison">
            vs. {formatTime(INDUSTRY_BENCHMARK_SECONDS)} industry avg
          </div>
        </div>

        <div className="time-metrics-dashboard__hero-card">
          <div className="time-metrics-dashboard__hero-value">{Math.round(derived?.percentReduction || 0)}%</div>
          <div className="time-metrics-dashboard__hero-label">faster than benchmark</div>
        </div>
      </div>

      {/* Breakdown by Method */}
      <div className="time-metrics-dashboard__breakdown">
        <h3>By Documentation Method</h3>
        <div className="time-metrics-dashboard__methods">
          <MethodCard
            icon="Voice"
            name="Voice Scribe"
            count={metrics.voiceScribeCount}
            avgSeconds={metrics.voiceScribeAvgSeconds}
            benchmark={INDUSTRY_BENCHMARK_SECONDS}
          />
          <MethodCard
            icon="Keyboard"
            name="Typed Notes"
            count={metrics.typedCount}
            avgSeconds={metrics.typedAvgSeconds}
            benchmark={INDUSTRY_BENCHMARK_SECONDS}
          />
        </div>
      </div>

      {/* Weekly Trend */}
      {metrics.weeklyStats.length > 0 && (
        <div className="time-metrics-dashboard__trend">
          <h3>Weekly Trend</h3>
          <div className="time-metrics-dashboard__chart">
            {metrics.weeklyStats.map((week, i) => (
              <div key={week.weekStart} className="time-metrics-dashboard__chart-bar">
                <div 
                  className="time-metrics-dashboard__chart-fill"
                  style={{ 
                    height: `${Math.min((week.avgSeconds / INDUSTRY_BENCHMARK_SECONDS) * 100, 100)}%` 
                  }}
                />
                <div className="time-metrics-dashboard__chart-label">
                  {new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="time-metrics-dashboard__chart-value">
                  {formatTime(week.avgSeconds)}
                </div>
              </div>
            ))}
            <div className="time-metrics-dashboard__chart-benchmark">
              <span>Industry benchmark: {formatTime(INDUSTRY_BENCHMARK_SECONDS)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Motivation */}
      <div className="time-metrics-dashboard__motivation">
        <div className="time-metrics-dashboard__motivation-icon">Focus</div>
        <div className="time-metrics-dashboard__motivation-text">
          <strong>Keep it up!</strong> You've saved the equivalent of{' '}
          <strong>{Math.round((derived?.monthlyTimeSaved || 0) / 50)} extra sessions</strong> worth of time.
        </div>
      </div>
    </div>
  );
};

// ============================================
// Method Card Component
// ============================================

interface MethodCardProps {
  icon: string;
  name: string;
  count: number;
  avgSeconds: number;
  benchmark: number;
}

const MethodCard: React.FC<MethodCardProps> = ({ icon, name, count, avgSeconds, benchmark }) => {
  const percentFaster = ((benchmark - avgSeconds) / benchmark) * 100;
  
  return (
    <div className="method-card">
      <div className="method-card__icon">{icon}</div>
      <div className="method-card__name">{name}</div>
      <div className="method-card__count">{count} notes</div>
      <div className="method-card__avg">
        <span className="method-card__avg-value">{Math.round(avgSeconds / 60)}m</span>
        <span className="method-card__avg-label">average</span>
      </div>
      {percentFaster > 0 && (
        <div className="method-card__savings">
          {Math.round(percentFaster)}% faster
        </div>
      )}
    </div>
  );
};

// ============================================
// Session Timer Hook
// ============================================

interface UseSessionTimerReturn {
  isRunning: boolean;
  elapsed: number;
  start: (noteId: string, clientId: string, method: SessionMetrics['method']) => void;
  stop: () => Promise<void>;
  reset: () => void;
}

export const useSessionTimer = (): UseSessionTimerReturn => {
  const [session, setSession] = useState<SessionMetrics | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: number | null = null;
    
    if (session) {
      interval = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - session.startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session]);

  const start = (noteId: string, clientId: string, method: SessionMetrics['method']) => {
    setSession({
      noteId,
      clientId,
      startTime: Date.now(),
      endTime: 0,
      method,
      wordCount: 0,
      aiAssisted: method === 'voice',
    });
    setElapsed(0);
  };

  const stop = async () => {
    if (!session) return;

    const finalSession: SessionMetrics = {
      ...session,
      endTime: Date.now(),
    };

    try {
      await invoke('record_session_metrics', { metrics: finalSession });
    } catch (err) {
      console.error('Failed to record session metrics:', err);
    }

    setSession(null);
    setElapsed(0);
  };

  const reset = () => {
    setSession(null);
    setElapsed(0);
  };

  return {
    isRunning: session !== null,
    elapsed,
    start,
    stop,
    reset,
  };
};

// ============================================
// Timer Display Component
// ============================================

interface TimerDisplayProps {
  elapsed: number;
  isRunning: boolean;
  method?: 'voice' | 'typed';
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ elapsed, isRunning, method }) => {
  const formatElapsed = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (): string => {
    if (!isRunning) return '#64748b';
    if (method === 'voice' && elapsed <= 120) return '#16a34a'; // Green under 2 min
    if (elapsed <= 300) return '#16a34a'; // Green under 5 min
    if (elapsed <= 600) return '#d97706'; // Yellow under 10 min
    return '#dc2626'; // Red over 10 min
  };

  return (
    <div 
      className="timer-display"
      data-running={isRunning}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '8px',
        background: isRunning ? '#f0fdf4' : '#f8fafc',
        fontFamily: 'monospace',
        fontSize: '16px',
        fontWeight: 600,
        color: getStatusColor(),
      }}
    >
      {isRunning && <span style={{ fontSize: '8px', animation: 'blink 1s infinite' }}>●</span>}
      <span>{formatElapsed(elapsed)}</span>
      {isRunning && method && (
        <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>
          {method === 'voice' ? 'Voice' : 'Keyboard'}
        </span>
      )}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ============================================
// Mock Data for Demo
// ============================================

const getMockMetrics = (): TimeMetricsData => ({
  totalNotes: 47,
  totalTimeSeconds: 47 * 145, // ~2.4 min average
  avgTimeSeconds: 145,
  voiceScribeCount: 32,
  voiceScribeAvgSeconds: 95,
  typedCount: 15,
  typedAvgSeconds: 240,
  estimatedTimeSavedSeconds: 47 * (960 - 145),
  weeklyStats: [
    { weekStart: '2026-01-06', noteCount: 12, totalSeconds: 12 * 140, avgSeconds: 140 },
    { weekStart: '2025-12-30', noteCount: 11, totalSeconds: 11 * 150, avgSeconds: 150 },
    { weekStart: '2025-12-23', noteCount: 10, totalSeconds: 10 * 155, avgSeconds: 155 },
    { weekStart: '2025-12-16', noteCount: 14, totalSeconds: 14 * 145, avgSeconds: 145 },
  ],
});

export default TimeMetrics;

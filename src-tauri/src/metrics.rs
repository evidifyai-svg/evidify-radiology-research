// Metrics Module v4 - Usage Analytics (No PHI)
//
// Track time savings, efficiency gains, and defensibility metrics.
// All data is aggregate and anonymized - no PHI ever recorded.
//
// Key metrics:
// 1. Time to complete note
// 2. AI assistance usage
// 3. Attestation patterns
// 4. Risk detection rates

use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{Utc, Duration};

// ============================================
// Metric Types
// ============================================

/// Session metrics (per note creation)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetrics {
    pub id: String,
    pub timestamp: i64,
    
    // Timing
    pub capture_duration_ms: Option<i64>,     // Raw input time
    pub ai_processing_ms: Option<i64>,        // AI structuring time
    pub review_duration_ms: Option<i64>,      // Attestation review time
    pub total_duration_ms: i64,               // End-to-end
    
    // Content (counts only, no PHI)
    pub word_count: i32,
    pub voice_words: i32,                     // Words from voice scribe
    pub typed_words: i32,                     // Words typed manually
    
    // AI usage
    pub ai_structured: bool,
    pub ai_model_used: Option<String>,
    pub ai_edit_percentage: f32,              // % of AI output edited
    
    // Detections
    pub detection_count: i32,
    pub attestation_count: i32,
    pub critical_detections: i32,
    
    // Outcome
    pub completed: bool,
    pub exported: bool,
}

/// Aggregate metrics for dashboard
#[derive(Debug, Clone, Serialize)]
pub struct DashboardMetrics {
    pub period_start: i64,
    pub period_end: i64,
    
    // Volume
    pub total_notes: i32,
    pub total_words: i64,
    pub notes_per_day: f32,
    
    // Time savings
    pub avg_time_per_note_ms: i64,
    pub estimated_typing_time_ms: i64,        // Based on 40 WPM baseline
    pub time_saved_ms: i64,
    pub time_saved_percentage: f32,
    
    // AI adoption
    pub ai_assist_rate: f32,                  // % of notes using AI
    pub voice_capture_rate: f32,              // % using voice scribe
    pub avg_ai_edit_rate: f32,                // Average edit % after AI
    
    // Defensibility
    pub detection_rate: f32,                  // Detections per note
    pub attestation_compliance: f32,          // % properly attested
    pub critical_addressed_rate: f32,         // % critical items addressed
    
    // Trends
    pub time_trend: Vec<TrendPoint>,          // Time savings over time
    pub volume_trend: Vec<TrendPoint>,        // Notes per day over time
}

#[derive(Debug, Clone, Serialize)]
pub struct TrendPoint {
    pub date: String,
    pub value: f32,
}

/// Benchmark comparisons
#[derive(Debug, Clone, Serialize)]
pub struct Benchmarks {
    pub industry_avg_note_time_ms: i64,       // ~15 min = 900,000ms
    pub typing_speed_wpm: i32,                // 40 WPM baseline
    pub target_ai_acceptance: f32,            // 80% AI text accepted
}

impl Default for Benchmarks {
    fn default() -> Self {
        Benchmarks {
            industry_avg_note_time_ms: 900_000,  // 15 minutes
            typing_speed_wpm: 40,
            target_ai_acceptance: 0.80,
        }
    }
}

// ============================================
// Metric Recording
// ============================================

/// Initialize metrics table
pub fn init_metrics_table(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(r#"
        CREATE TABLE IF NOT EXISTS session_metrics (
            id TEXT PRIMARY KEY,
            timestamp INTEGER NOT NULL,
            capture_duration_ms INTEGER,
            ai_processing_ms INTEGER,
            review_duration_ms INTEGER,
            total_duration_ms INTEGER NOT NULL,
            word_count INTEGER NOT NULL,
            voice_words INTEGER DEFAULT 0,
            typed_words INTEGER DEFAULT 0,
            ai_structured INTEGER DEFAULT 0,
            ai_model_used TEXT,
            ai_edit_percentage REAL DEFAULT 0,
            detection_count INTEGER DEFAULT 0,
            attestation_count INTEGER DEFAULT 0,
            critical_detections INTEGER DEFAULT 0,
            completed INTEGER DEFAULT 0,
            exported INTEGER DEFAULT 0
        );
        
        CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON session_metrics(timestamp);
    "#)?;
    Ok(())
}

/// Record session metrics
pub fn record_session(conn: &Connection, metrics: &SessionMetrics) -> Result<(), rusqlite::Error> {
    conn.execute(
        r#"INSERT OR REPLACE INTO session_metrics 
           (id, timestamp, capture_duration_ms, ai_processing_ms, review_duration_ms,
            total_duration_ms, word_count, voice_words, typed_words, ai_structured,
            ai_model_used, ai_edit_percentage, detection_count, attestation_count,
            critical_detections, completed, exported)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)"#,
        params![
            &metrics.id,
            metrics.timestamp,
            metrics.capture_duration_ms,
            metrics.ai_processing_ms,
            metrics.review_duration_ms,
            metrics.total_duration_ms,
            metrics.word_count,
            metrics.voice_words,
            metrics.typed_words,
            metrics.ai_structured as i32,
            &metrics.ai_model_used,
            metrics.ai_edit_percentage,
            metrics.detection_count,
            metrics.attestation_count,
            metrics.critical_detections,
            metrics.completed as i32,
            metrics.exported as i32,
        ],
    )?;
    Ok(())
}

// ============================================
// Metric Aggregation
// ============================================

/// Calculate dashboard metrics for a time period
pub fn calculate_dashboard_metrics(
    conn: &Connection,
    days: i32,
) -> Result<DashboardMetrics, rusqlite::Error> {
    let now = Utc::now().timestamp_millis();
    let period_start = now - (days as i64 * 24 * 60 * 60 * 1000);
    let benchmarks = Benchmarks::default();
    
    // Aggregate queries
    let (total_notes, total_words, total_time, ai_count, voice_count): (i32, i64, i64, i32, i32) = 
        conn.query_row(
            r#"SELECT 
                COUNT(*) as total_notes,
                COALESCE(SUM(word_count), 0) as total_words,
                COALESCE(SUM(total_duration_ms), 0) as total_time,
                COALESCE(SUM(ai_structured), 0) as ai_count,
                COALESCE(SUM(CASE WHEN voice_words > 0 THEN 1 ELSE 0 END), 0) as voice_count
               FROM session_metrics 
               WHERE timestamp >= ?1 AND completed = 1"#,
            params![period_start],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )?;
    
    let (total_detections, total_attestations, critical_detections, critical_attested): (i32, i32, i32, i32) = 
        conn.query_row(
            r#"SELECT 
                COALESCE(SUM(detection_count), 0),
                COALESCE(SUM(attestation_count), 0),
                COALESCE(SUM(critical_detections), 0),
                COALESCE(SUM(CASE WHEN critical_detections > 0 AND attestation_count >= critical_detections THEN critical_detections ELSE 0 END), 0)
               FROM session_metrics 
               WHERE timestamp >= ?1"#,
            params![period_start],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )?;
    
    let avg_edit_rate: f32 = conn.query_row(
        "SELECT COALESCE(AVG(ai_edit_percentage), 0) FROM session_metrics WHERE timestamp >= ?1 AND ai_structured = 1",
        params![period_start],
        |row| row.get(0),
    )?;
    
    // Calculate derived metrics
    let avg_time = if total_notes > 0 { total_time / total_notes as i64 } else { 0 };
    let estimated_typing_time = (total_words * 60 * 1000) / benchmarks.typing_speed_wpm as i64;
    let time_saved = estimated_typing_time.saturating_sub(total_time);
    let time_saved_pct = if estimated_typing_time > 0 {
        (time_saved as f32 / estimated_typing_time as f32) * 100.0
    } else {
        0.0
    };
    
    let notes_per_day = if days > 0 { total_notes as f32 / days as f32 } else { 0.0 };
    let ai_assist_rate = if total_notes > 0 { ai_count as f32 / total_notes as f32 } else { 0.0 };
    let voice_rate = if total_notes > 0 { voice_count as f32 / total_notes as f32 } else { 0.0 };
    let detection_rate = if total_notes > 0 { total_detections as f32 / total_notes as f32 } else { 0.0 };
    let attestation_compliance = if total_detections > 0 { 
        total_attestations as f32 / total_detections as f32 
    } else { 
        1.0 
    };
    let critical_addressed = if critical_detections > 0 {
        critical_attested as f32 / critical_detections as f32
    } else {
        1.0
    };
    
    // Calculate trends (daily for last N days)
    let time_trend = calculate_trend(conn, period_start, "AVG(total_duration_ms)")?;
    let volume_trend = calculate_trend(conn, period_start, "COUNT(*)")?;
    
    Ok(DashboardMetrics {
        period_start,
        period_end: now,
        total_notes,
        total_words,
        notes_per_day,
        avg_time_per_note_ms: avg_time,
        estimated_typing_time_ms: estimated_typing_time,
        time_saved_ms: time_saved,
        time_saved_percentage: time_saved_pct,
        ai_assist_rate,
        voice_capture_rate: voice_rate,
        avg_ai_edit_rate: avg_edit_rate,
        detection_rate,
        attestation_compliance,
        critical_addressed_rate: critical_addressed,
        time_trend,
        volume_trend,
    })
}

fn calculate_trend(
    conn: &Connection,
    period_start: i64,
    metric: &str,
) -> Result<Vec<TrendPoint>, rusqlite::Error> {
    let sql = format!(
        r#"SELECT 
            date(timestamp / 1000, 'unixepoch') as day,
            {} as value
           FROM session_metrics 
           WHERE timestamp >= ?1 AND completed = 1
           GROUP BY day
           ORDER BY day"#,
        metric
    );
    
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![period_start], |row| {
        Ok(TrendPoint {
            date: row.get(0)?,
            value: row.get(1)?,
        })
    })?;
    
    rows.collect()
}

// ============================================
// Export for Sales/Marketing
// ============================================

/// Generate metrics report for sales demos
#[derive(Debug, Clone, Serialize)]
pub struct MetricsReport {
    pub generated_at: i64,
    pub period_days: i32,
    
    // Headline numbers
    pub headline: HeadlineMetrics,
    
    // Detailed breakdowns
    pub time_analysis: TimeAnalysis,
    pub ai_analysis: AIAnalysis,
    pub defensibility_analysis: DefensibilityAnalysis,
}

#[derive(Debug, Clone, Serialize)]
pub struct HeadlineMetrics {
    pub time_saved_hours: f32,
    pub time_saved_percentage: f32,
    pub notes_completed: i32,
    pub compliance_rate: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct TimeAnalysis {
    pub avg_note_minutes: f32,
    pub baseline_minutes: f32,
    pub time_saved_per_note_minutes: f32,
    pub daily_time_saved_minutes: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct AIAnalysis {
    pub ai_assist_rate: f32,
    pub voice_capture_rate: f32,
    pub avg_edit_rate: f32,
    pub ai_acceptance_rate: f32,  // 1 - edit_rate
}

#[derive(Debug, Clone, Serialize)]
pub struct DefensibilityAnalysis {
    pub detections_per_note: f32,
    pub attestation_compliance: f32,
    pub critical_addressed: f32,
    pub zero_incidents: bool,
}

/// Generate report from dashboard metrics
pub fn generate_report(dashboard: &DashboardMetrics, days: i32) -> MetricsReport {
    let benchmarks = Benchmarks::default();
    
    let time_saved_hours = dashboard.time_saved_ms as f32 / (1000.0 * 60.0 * 60.0);
    let avg_note_min = dashboard.avg_time_per_note_ms as f32 / (1000.0 * 60.0);
    let baseline_min = benchmarks.industry_avg_note_time_ms as f32 / (1000.0 * 60.0);
    let saved_per_note = baseline_min - avg_note_min;
    let daily_saved = saved_per_note * dashboard.notes_per_day;
    
    MetricsReport {
        generated_at: Utc::now().timestamp_millis(),
        period_days: days,
        
        headline: HeadlineMetrics {
            time_saved_hours,
            time_saved_percentage: dashboard.time_saved_percentage,
            notes_completed: dashboard.total_notes,
            compliance_rate: dashboard.attestation_compliance * 100.0,
        },
        
        time_analysis: TimeAnalysis {
            avg_note_minutes: avg_note_min,
            baseline_minutes: baseline_min,
            time_saved_per_note_minutes: saved_per_note,
            daily_time_saved_minutes: daily_saved,
        },
        
        ai_analysis: AIAnalysis {
            ai_assist_rate: dashboard.ai_assist_rate * 100.0,
            voice_capture_rate: dashboard.voice_capture_rate * 100.0,
            avg_edit_rate: dashboard.avg_ai_edit_rate * 100.0,
            ai_acceptance_rate: (1.0 - dashboard.avg_ai_edit_rate) * 100.0,
        },
        
        defensibility_analysis: DefensibilityAnalysis {
            detections_per_note: dashboard.detection_rate,
            attestation_compliance: dashboard.attestation_compliance * 100.0,
            critical_addressed: dashboard.critical_addressed_rate * 100.0,
            zero_incidents: dashboard.critical_addressed_rate >= 1.0,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_benchmarks() {
        let b = Benchmarks::default();
        assert_eq!(b.industry_avg_note_time_ms, 900_000);
        assert_eq!(b.typing_speed_wpm, 40);
    }
}

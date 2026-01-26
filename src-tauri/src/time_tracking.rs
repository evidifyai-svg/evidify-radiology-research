// Time Tracking Module
//
// Records and analyzes documentation time metrics
// Key proof of value: "Recover hours per week"
//
// Tracks:
// - Time per note (start to sign)
// - Method used (voice scribe, typed, template)
// - Comparison to industry benchmarks
// - Cumulative time savings

use chrono::{DateTime, Utc, Duration, Datelike};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================
// Constants
// ============================================

/// Industry benchmark: 16 minutes per clinical encounter documentation
/// Source: MGMA benchmarks, time-motion studies
pub const INDUSTRY_BENCHMARK_SECONDS: u64 = 16 * 60; // 960 seconds

/// Target for Voice Scribe: 2 minutes
pub const VOICE_SCRIBE_TARGET_SECONDS: u64 = 120;

/// Target for typed notes with AI assist: 5 minutes
pub const TYPED_AI_TARGET_SECONDS: u64 = 300;

// ============================================
// Types
// ============================================

/// Method used for documentation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DocumentationMethod {
    /// Voice Scribe (90-second debrief)
    Voice,
    /// Typed with AI structuring
    Typed,
    /// Template-based entry
    Template,
    /// Manual (no AI assist)
    Manual,
}

/// Single session timing record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetrics {
    /// Note ID
    pub note_id: String,
    /// Client ID
    pub client_id: String,
    /// When documentation started
    pub start_time: DateTime<Utc>,
    /// When documentation completed (note signed)
    pub end_time: DateTime<Utc>,
    /// Method used
    pub method: DocumentationMethod,
    /// Final word count
    pub word_count: u32,
    /// Whether AI was used for structuring
    pub ai_assisted: bool,
}

impl SessionMetrics {
    /// Duration in seconds
    pub fn duration_seconds(&self) -> u64 {
        (self.end_time - self.start_time).num_seconds().max(0) as u64
    }
    
    /// Time saved vs industry benchmark
    pub fn time_saved_seconds(&self) -> i64 {
        INDUSTRY_BENCHMARK_SECONDS as i64 - self.duration_seconds() as i64
    }
}

/// Aggregated time metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeMetricsData {
    /// Total notes in period
    pub total_notes: u32,
    /// Total documentation time (seconds)
    pub total_time_seconds: u64,
    /// Average time per note (seconds)
    pub avg_time_seconds: f64,
    /// Number of Voice Scribe notes
    pub voice_scribe_count: u32,
    /// Average Voice Scribe time
    pub voice_scribe_avg_seconds: f64,
    /// Number of typed notes
    pub typed_count: u32,
    /// Average typed note time
    pub typed_avg_seconds: f64,
    /// Estimated time saved vs benchmark
    pub estimated_time_saved_seconds: i64,
    /// Weekly breakdown
    pub weekly_stats: Vec<WeeklyStats>,
}

/// Weekly statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeeklyStats {
    /// Week start date (ISO string)
    pub week_start: String,
    /// Notes completed this week
    pub note_count: u32,
    /// Total seconds this week
    pub total_seconds: u64,
    /// Average seconds per note
    pub avg_seconds: f64,
}

/// Time period for queries
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimePeriod {
    Week,
    Month,
    Quarter,
    Year,
    All,
}

impl TimePeriod {
    /// Get the start date for this period
    pub fn start_date(&self) -> DateTime<Utc> {
        let now = Utc::now();
        match self {
            TimePeriod::Week => now - Duration::days(7),
            TimePeriod::Month => now - Duration::days(30),
            TimePeriod::Quarter => now - Duration::days(90),
            TimePeriod::Year => now - Duration::days(365),
            TimePeriod::All => DateTime::from_timestamp(0, 0).unwrap(),
        }
    }
}

// ============================================
// Time Tracker
// ============================================

/// Tracks documentation time metrics
pub struct TimeTracker {
    /// All session records
    sessions: Vec<SessionMetrics>,
}

impl TimeTracker {
    pub fn new() -> Self {
        Self {
            sessions: Vec::new(),
        }
    }
    
    /// Record a new session
    pub fn record_session(&mut self, session: SessionMetrics) {
        log::info!(
            "Recording session: note={}, method={:?}, duration={}s",
            session.note_id,
            session.method,
            session.duration_seconds()
        );
        self.sessions.push(session);
    }
    
    /// Get metrics for a time period
    pub fn get_metrics(&self, period: TimePeriod) -> TimeMetricsData {
        let start_date = period.start_date();
        
        // Filter sessions in period
        let sessions: Vec<&SessionMetrics> = self.sessions.iter()
            .filter(|s| s.end_time >= start_date)
            .collect();
        
        if sessions.is_empty() {
            return TimeMetricsData {
                total_notes: 0,
                total_time_seconds: 0,
                avg_time_seconds: 0.0,
                voice_scribe_count: 0,
                voice_scribe_avg_seconds: 0.0,
                typed_count: 0,
                typed_avg_seconds: 0.0,
                estimated_time_saved_seconds: 0,
                weekly_stats: vec![],
            };
        }
        
        // Calculate totals
        let total_notes = sessions.len() as u32;
        let total_time_seconds: u64 = sessions.iter()
            .map(|s| s.duration_seconds())
            .sum();
        let avg_time_seconds = total_time_seconds as f64 / total_notes as f64;
        
        // Voice Scribe stats
        let voice_sessions: Vec<&&SessionMetrics> = sessions.iter()
            .filter(|s| s.method == DocumentationMethod::Voice)
            .collect();
        let voice_scribe_count = voice_sessions.len() as u32;
        let voice_scribe_avg_seconds = if voice_scribe_count > 0 {
            voice_sessions.iter()
                .map(|s| s.duration_seconds())
                .sum::<u64>() as f64 / voice_scribe_count as f64
        } else {
            0.0
        };
        
        // Typed stats
        let typed_sessions: Vec<&&SessionMetrics> = sessions.iter()
            .filter(|s| s.method == DocumentationMethod::Typed)
            .collect();
        let typed_count = typed_sessions.len() as u32;
        let typed_avg_seconds = if typed_count > 0 {
            typed_sessions.iter()
                .map(|s| s.duration_seconds())
                .sum::<u64>() as f64 / typed_count as f64
        } else {
            0.0
        };
        
        // Time saved
        let estimated_time_saved_seconds: i64 = sessions.iter()
            .map(|s| s.time_saved_seconds())
            .sum();
        
        // Weekly breakdown
        let weekly_stats = self.calculate_weekly_stats(&sessions);
        
        TimeMetricsData {
            total_notes,
            total_time_seconds,
            avg_time_seconds,
            voice_scribe_count,
            voice_scribe_avg_seconds,
            typed_count,
            typed_avg_seconds,
            estimated_time_saved_seconds,
            weekly_stats,
        }
    }
    
    /// Calculate weekly breakdown
    fn calculate_weekly_stats(&self, sessions: &[&SessionMetrics]) -> Vec<WeeklyStats> {
        let mut weekly_map: HashMap<String, (u32, u64)> = HashMap::new();
        
        for session in sessions {
            // Get Monday of the week
            let date = session.end_time.date_naive();
            let weekday = date.weekday().num_days_from_monday();
            let week_start = date - Duration::days(weekday as i64);
            let week_key = week_start.format("%Y-%m-%d").to_string();
            
            let entry = weekly_map.entry(week_key).or_insert((0, 0));
            entry.0 += 1;
            entry.1 += session.duration_seconds();
        }
        
        let mut weeks: Vec<WeeklyStats> = weekly_map.into_iter()
            .map(|(week_start, (count, total))| WeeklyStats {
                week_start,
                note_count: count,
                total_seconds: total,
                avg_seconds: total as f64 / count as f64,
            })
            .collect();
        
        // Sort by date descending
        weeks.sort_by(|a, b| b.week_start.cmp(&a.week_start));
        
        // Keep last 8 weeks
        weeks.truncate(8);
        
        weeks
    }
    
    /// Get sessions for a specific client
    pub fn get_client_sessions(&self, client_id: &str) -> Vec<&SessionMetrics> {
        self.sessions.iter()
            .filter(|s| s.client_id == client_id)
            .collect()
    }
    
    /// Get efficiency score (0-100)
    pub fn get_efficiency_score(&self, period: TimePeriod) -> u32 {
        let metrics = self.get_metrics(period);
        
        if metrics.total_notes == 0 {
            return 50; // Neutral score if no data
        }
        
        // Score based on how much faster than benchmark
        // 100% of benchmark = 50 points
        // 50% of benchmark = 75 points
        // 25% of benchmark = 88 points
        // Below target = 95+ points
        
        let ratio = metrics.avg_time_seconds / INDUSTRY_BENCHMARK_SECONDS as f64;
        
        let score = if ratio <= 0.125 { // Under 2 min
            100
        } else if ratio <= 0.25 { // Under 4 min
            95
        } else if ratio <= 0.5 { // Under 8 min
            85
        } else if ratio <= 0.75 { // Under 12 min
            70
        } else if ratio <= 1.0 { // At benchmark
            50
        } else { // Over benchmark
            (50.0 - (ratio - 1.0) * 25.0).max(10.0) as u32
        };
        
        score
    }
}

impl Default for TimeTracker {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================
// Tauri Commands
// ============================================

use tauri::State;
use std::sync::RwLock;
use crate::commands::AppState;

pub struct TimeTrackerState {
    pub tracker: RwLock<TimeTracker>,
}

impl Default for TimeTrackerState {
    fn default() -> Self {
        Self {
            tracker: RwLock::new(TimeTracker::new()),
        }
    }
}

/// Record session timing - persists to vault database
#[tauri::command]
pub fn record_time_metrics(
    app_state: State<'_, AppState>,
    _tracker_state: State<'_, TimeTrackerState>,
    note_id: String,
    client_id: String,
    start_time: String,
    end_time: String,
    method: String,
    word_count: u32,
    ai_assisted: bool,
) -> Result<(), String> {
    let start = DateTime::parse_from_rfc3339(&start_time)
        .map_err(|e| e.to_string())?
        .with_timezone(&Utc);
    let end = DateTime::parse_from_rfc3339(&end_time)
        .map_err(|e| e.to_string())?
        .with_timezone(&Utc);
    
    // Save to vault database for persistence
    let vault = app_state.vault.lock().map_err(|e| e.to_string())?;
    if vault.is_unlocked() {
        vault.record_session_metric(
            &note_id,
            &client_id,
            start.timestamp(),
            end.timestamp(),
            &method,
            word_count as i32,
            ai_assisted,
        ).map_err(|e| e.to_string())?;
        
        log::info!("Recorded session metric: note={}, method={}, duration={}s", 
            note_id, method, (end - start).num_seconds());
    } else {
        log::warn!("Vault not unlocked, cannot save session metrics");
    }
    
    Ok(())
}

/// Get time metrics for period - reads from vault database
#[tauri::command]
pub fn get_time_metrics(
    app_state: State<'_, AppState>,
    _tracker_state: State<'_, TimeTrackerState>,
    period: String,
) -> Result<TimeMetricsData, String> {
    // Calculate since_timestamp based on period
    let now = Utc::now();
    let since = match period.as_str() {
        "week" => now - Duration::days(7),
        "month" => now - Duration::days(30),
        "quarter" => now - Duration::days(90),
        "year" => now - Duration::days(365),
        _ => now - Duration::days(365 * 10), // "all" - 10 years back
    };
    
    let vault = app_state.vault.lock().map_err(|e| e.to_string())?;
    if !vault.is_unlocked() {
        // Return empty metrics if vault not unlocked
        return Ok(TimeMetricsData {
            total_notes: 0,
            total_time_seconds: 0,
            avg_time_seconds: 0.0,
            voice_scribe_count: 0,
            voice_scribe_avg_seconds: 0.0,
            typed_count: 0,
            typed_avg_seconds: 0.0,
            estimated_time_saved_seconds: 0,
            weekly_stats: vec![],
        });
    }
    
    // Get metrics from vault database
    let sessions = vault.get_session_metrics(since.timestamp())
        .map_err(|e| e.to_string())?;
    
    // Calculate aggregated metrics
    let total_notes = sessions.len() as u32;
    let total_time_seconds: u64 = sessions.iter()
        .map(|s| (s.end_time - s.start_time).max(0) as u64)
        .sum();
    
    let avg_time_seconds = if total_notes > 0 {
        total_time_seconds as f64 / total_notes as f64
    } else {
        0.0
    };
    
    let voice_sessions: Vec<_> = sessions.iter().filter(|s| s.method == "voice").collect();
    let voice_scribe_count = voice_sessions.len() as u32;
    let voice_total: u64 = voice_sessions.iter()
        .map(|s| (s.end_time - s.start_time).max(0) as u64)
        .sum();
    let voice_scribe_avg_seconds = if voice_scribe_count > 0 {
        voice_total as f64 / voice_scribe_count as f64
    } else {
        0.0
    };
    
    let typed_sessions: Vec<_> = sessions.iter().filter(|s| s.method == "typed" || s.method == "manual").collect();
    let typed_count = typed_sessions.len() as u32;
    let typed_total: u64 = typed_sessions.iter()
        .map(|s| (s.end_time - s.start_time).max(0) as u64)
        .sum();
    let typed_avg_seconds = if typed_count > 0 {
        typed_total as f64 / typed_count as f64
    } else {
        0.0
    };
    
    // Industry benchmark: 15 minutes (900 seconds) per note
    let benchmark_seconds = 900_i64;
    let estimated_time_saved_seconds = (total_notes as i64 * benchmark_seconds) - total_time_seconds as i64;
    
    // Build weekly stats
    let weekly_stats = build_weekly_stats(&sessions);
    
    Ok(TimeMetricsData {
        total_notes,
        total_time_seconds,
        avg_time_seconds,
        voice_scribe_count,
        voice_scribe_avg_seconds,
        typed_count,
        typed_avg_seconds,
        estimated_time_saved_seconds,
        weekly_stats,
    })
}

/// Build weekly statistics from sessions
fn build_weekly_stats(sessions: &[crate::vault::SessionMetricRow]) -> Vec<WeeklyStats> {
    use std::collections::HashMap;
    
    let mut weeks: HashMap<String, (u32, u64)> = HashMap::new();
    
    for session in sessions {
        // Get week start (Monday)
        let dt = DateTime::from_timestamp(session.start_time, 0)
            .unwrap_or_else(Utc::now);
        let week_start = dt - Duration::days(dt.weekday().num_days_from_monday() as i64);
        let week_key = week_start.format("%Y-%m-%d").to_string();
        
        let duration = (session.end_time - session.start_time).max(0) as u64;
        let entry = weeks.entry(week_key).or_insert((0, 0));
        entry.0 += 1;
        entry.1 += duration;
    }
    
    let mut stats: Vec<WeeklyStats> = weeks.into_iter()
        .map(|(week_start, (count, total))| WeeklyStats {
            week_start,
            note_count: count,
            total_seconds: total,
            avg_seconds: if count > 0 { total as f64 / count as f64 } else { 0.0 },
        })
        .collect();
    
    stats.sort_by(|a, b| b.week_start.cmp(&a.week_start));
    stats
}

/// Get efficiency score
#[tauri::command]
pub fn get_efficiency_score(
    state: State<'_, TimeTrackerState>,
    period: String,
) -> Result<u32, String> {
    let period = match period.as_str() {
        "week" => TimePeriod::Week,
        "month" => TimePeriod::Month,
        _ => TimePeriod::Month,
    };
    
    let tracker = state.tracker.read().map_err(|e| e.to_string())?;
    Ok(tracker.get_efficiency_score(period))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_session_duration() {
        let session = SessionMetrics {
            note_id: "test".to_string(),
            client_id: "client".to_string(),
            start_time: Utc::now() - Duration::seconds(120),
            end_time: Utc::now(),
            method: DocumentationMethod::Voice,
            word_count: 150,
            ai_assisted: true,
        };
        
        assert_eq!(session.duration_seconds(), 120);
        assert!(session.time_saved_seconds() > 0);
    }
    
    #[test]
    fn test_time_tracker() {
        let mut tracker = TimeTracker::new();
        
        // Add some sessions
        for i in 0..10 {
            tracker.record_session(SessionMetrics {
                note_id: format!("note-{}", i),
                client_id: "client-1".to_string(),
                start_time: Utc::now() - Duration::seconds(120),
                end_time: Utc::now(),
                method: if i % 2 == 0 { DocumentationMethod::Voice } else { DocumentationMethod::Typed },
                word_count: 150,
                ai_assisted: true,
            });
        }
        
        let metrics = tracker.get_metrics(TimePeriod::Month);
        assert_eq!(metrics.total_notes, 10);
        assert_eq!(metrics.voice_scribe_count, 5);
        assert!(metrics.estimated_time_saved_seconds > 0);
    }
}

// Voice Module v4 - Offline Speech-to-Text
//
// Real-time voice capture and transcription using local Whisper model.
// No audio data leaves the device.
//
// Architecture:
// 1. Audio capture via cpal (cross-platform)
// 2. Transcription via whisper-cpp CLI (local Whisper.cpp)
// 3. Streaming results to frontend
// 4. Optional: pipe to LLM for structuring

use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use std::path::{Path, PathBuf};
use std::process::Command;
use thiserror::Error;
use tokio::sync::mpsc;
use serde::{Deserialize, Serialize};

#[derive(Error, Debug)]
pub enum VoiceError {
    #[error("Whisper model not found: {0}")]
    ModelNotFound(String),
    
    #[error("whisper-cpp not installed")]
    WhisperNotInstalled,
    
    #[error("Audio device error: {0}")]
    AudioDevice(String),
    
    #[error("Transcription error: {0}")]
    Transcription(String),
    
    #[error("Recording not active")]
    NotRecording,
    
    #[error("Already recording")]
    AlreadyRecording,
    
    #[error("Audio conversion failed: {0}")]
    ConversionFailed(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Transcription segment with timing
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TranscriptSegment {
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub confidence: f32,
    /// If this segment contains a detected risk phrase
    pub risk_detected: Option<String>,
}

/// Voice capture and transcription state
pub struct VoiceCapture {
    is_recording: Arc<AtomicBool>,
    model_path: PathBuf,
    /// Channel to send transcript segments
    tx: Option<mpsc::Sender<TranscriptSegment>>,
    /// Accumulated transcript
    transcript: Arc<Mutex<Vec<TranscriptSegment>>>,
    /// Audio buffer for processing
    audio_buffer: Arc<Mutex<Vec<f32>>>,
}

impl VoiceCapture {
    pub fn new(model_path: PathBuf) -> Self {
        VoiceCapture {
            is_recording: Arc::new(AtomicBool::new(false)),
            model_path,
            tx: None,
            transcript: Arc::new(Mutex::new(Vec::new())),
            audio_buffer: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    /// Check if Whisper model is available
    pub fn model_available(&self) -> bool {
        self.model_path.exists()
    }
    
    /// Get available Whisper models in the models directory
    pub fn list_models(models_dir: &PathBuf) -> Vec<WhisperModelInfo> {
        let mut models = Vec::new();
        
        // Standard Whisper model files
        let model_files = [
            ("ggml-tiny.bin", "tiny", 75),
            ("ggml-tiny.en.bin", "tiny.en", 75),
            ("ggml-base.bin", "base", 142),
            ("ggml-base.en.bin", "base.en", 142),
            ("ggml-small.bin", "small", 466),
            ("ggml-small.en.bin", "small.en", 466),
            ("ggml-medium.bin", "medium", 1500),
            ("ggml-medium.en.bin", "medium.en", 1500),
            ("ggml-large-v3.bin", "large-v3", 2900),
        ];
        
        for (filename, name, size_mb) in model_files {
            let path = models_dir.join(filename);
            if path.exists() {
                models.push(WhisperModelInfo {
                    name: name.to_string(),
                    path: path.to_string_lossy().to_string(),
                    size_mb,
                    multilingual: !name.ends_with(".en"),
                });
            }
        }
        
        models
    }
    
    /// Start recording and transcription
    pub async fn start_recording(
        &mut self,
        tx: mpsc::Sender<TranscriptSegment>,
    ) -> Result<(), VoiceError> {
        if self.is_recording.load(Ordering::SeqCst) {
            return Err(VoiceError::AlreadyRecording);
        }
        
        if !self.model_available() {
            return Err(VoiceError::ModelNotFound(
                self.model_path.to_string_lossy().to_string()
            ));
        }
        
        self.tx = Some(tx);
        self.is_recording.store(true, Ordering::SeqCst);
        
        // Clear previous transcript
        {
            let mut transcript = self.transcript.lock().unwrap();
            transcript.clear();
        }
        
        log::info!("Voice recording started");
        Ok(())
    }
    
    /// Stop recording
    pub fn stop_recording(&mut self) -> Result<Vec<TranscriptSegment>, VoiceError> {
        if !self.is_recording.load(Ordering::SeqCst) {
            return Err(VoiceError::NotRecording);
        }
        
        self.is_recording.store(false, Ordering::SeqCst);
        self.tx = None;
        
        let transcript = self.transcript.lock().unwrap().clone();
        log::info!("Voice recording stopped, {} segments", transcript.len());
        
        Ok(transcript)
    }
    
    /// Get current transcript
    pub fn get_transcript(&self) -> Vec<TranscriptSegment> {
        self.transcript.lock().unwrap().clone()
    }
    
    /// Get full transcript as text
    pub fn get_transcript_text(&self) -> String {
        self.transcript
            .lock()
            .unwrap()
            .iter()
            .map(|s| s.text.as_str())
            .collect::<Vec<_>>()
            .join(" ")
    }
    
    pub fn is_recording(&self) -> bool {
        self.is_recording.load(Ordering::SeqCst)
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct WhisperModelInfo {
    pub name: String,
    pub path: String,
    pub size_mb: u32,
    pub multilingual: bool,
}

/// Whisper transcription context
/// 
/// In production, this wraps whisper-rs. For now, this is a stub
/// that would be replaced with actual whisper-rs integration.
pub struct WhisperContext {
    model_path: PathBuf,
    // In production: whisper_rs::WhisperContext
}

impl WhisperContext {
    pub fn new(model_path: PathBuf) -> Result<Self, VoiceError> {
        if !model_path.exists() {
            return Err(VoiceError::ModelNotFound(
                model_path.to_string_lossy().to_string()
            ));
        }
        
        // In production:
        // let ctx = whisper_rs::WhisperContext::new(&model_path.to_string_lossy())
        //     .map_err(|e| VoiceError::Transcription(e.to_string()))?;
        
        Ok(WhisperContext { model_path })
    }
    
    /// Transcribe audio buffer
    /// 
    /// Input: PCM audio at 16kHz, mono, f32
    /// Output: Transcript segments with timing
    pub fn transcribe(&self, audio: &[f32]) -> Result<Vec<TranscriptSegment>, VoiceError> {
        // In production, this would use whisper-rs:
        //
        // let mut params = whisper_rs::FullParams::new(
        //     whisper_rs::SamplingStrategy::Greedy { best_of: 1 }
        // );
        // params.set_language(Some("en"));
        // params.set_print_special(false);
        // params.set_print_progress(false);
        // params.set_print_realtime(false);
        // params.set_print_timestamps(false);
        // 
        // let mut state = self.ctx.create_state()
        //     .map_err(|e| VoiceError::Transcription(e.to_string()))?;
        // 
        // state.full(params, audio)
        //     .map_err(|e| VoiceError::Transcription(e.to_string()))?;
        // 
        // let num_segments = state.full_n_segments()
        //     .map_err(|e| VoiceError::Transcription(e.to_string()))?;
        // 
        // let mut segments = Vec::new();
        // for i in 0..num_segments {
        //     let text = state.full_get_segment_text(i)
        //         .map_err(|e| VoiceError::Transcription(e.to_string()))?;
        //     let start = state.full_get_segment_t0(i)
        //         .map_err(|e| VoiceError::Transcription(e.to_string()))?;
        //     let end = state.full_get_segment_t1(i)
        //         .map_err(|e| VoiceError::Transcription(e.to_string()))?;
        //     
        //     segments.push(TranscriptSegment {
        //         text,
        //         start_ms: start * 10, // Whisper uses centiseconds
        //         end_ms: end * 10,
        //         confidence: 1.0,
        //         risk_detected: None,
        //     });
        // }
        
        // Stub implementation for compilation
        log::info!("Transcribing {} samples", audio.len());
        
        Ok(vec![TranscriptSegment {
            text: "[Whisper transcription placeholder - integrate whisper-rs]".to_string(),
            start_ms: 0,
            end_ms: (audio.len() as f32 / 16000.0 * 1000.0) as i64,
            confidence: 0.0,
            risk_detected: None,
        }])
    }
}

// ============================================
// Whisper CLI Integration
// ============================================

/// Configuration for whisper-cpp CLI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhisperConfig {
    /// Path to the model file
    pub model_path: PathBuf,
    /// Language code (e.g., "en", "auto")
    pub language: String,
    /// Number of CPU threads
    pub threads: u32,
    /// Translate to English (for non-English audio)
    pub translate: bool,
}

impl Default for WhisperConfig {
    fn default() -> Self {
        let model_dir = dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("whisper-models");
        
        Self {
            model_path: model_dir.join("ggml-base.en.bin"),
            language: "en".to_string(),
            threads: 4,
            translate: false,
        }
    }
}

/// Full transcription result from whisper-cpp
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    /// Full transcribed text
    pub text: String,
    /// Individual segments with timing
    pub segments: Vec<TranscriptSegment>,
    /// Detected or specified language
    pub language: String,
    /// Processing time in milliseconds
    pub processing_time_ms: u64,
    /// Model used
    pub model_name: String,
}

/// Check if whisper-cpp CLI is available
pub fn check_whisper_available() -> Result<String, VoiceError> {
    // Try whisper-cpp (Homebrew name)
    if let Ok(output) = Command::new("whisper-cpp").arg("--help").output() {
        if output.status.success() || !output.stderr.is_empty() {
            return Ok("whisper-cpp".to_string());
        }
    }
    
    // Try whisper (alternative name)
    if let Ok(output) = Command::new("whisper").arg("--help").output() {
        if output.status.success() || !output.stderr.is_empty() {
            return Ok("whisper".to_string());
        }
    }
    
    // Try main (built from source)
    if let Ok(output) = Command::new("main").arg("--help").output() {
        if output.status.success() || !output.stderr.is_empty() {
            return Ok("main".to_string());
        }
    }
    
    Err(VoiceError::WhisperNotInstalled)
}

/// Get the default whisper models directory
pub fn get_models_directory() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("whisper-models")
}

/// List available Whisper models
pub fn list_available_models() -> Vec<WhisperModelInfo> {
    let model_dir = get_models_directory();
    
    if !model_dir.exists() {
        return vec![];
    }
    
    let model_specs = [
        ("ggml-tiny.bin", "tiny", 75, true),
        ("ggml-tiny.en.bin", "tiny.en", 75, false),
        ("ggml-base.bin", "base", 142, true),
        ("ggml-base.en.bin", "base.en", 142, false),
        ("ggml-small.bin", "small", 466, true),
        ("ggml-small.en.bin", "small.en", 466, false),
        ("ggml-medium.bin", "medium", 1500, true),
        ("ggml-medium.en.bin", "medium.en", 1500, false),
        ("ggml-large-v3.bin", "large-v3", 2900, true),
    ];
    
    model_specs
        .iter()
        .filter_map(|(filename, name, size_mb, multilingual)| {
            let path = model_dir.join(filename);
            if path.exists() {
                Some(WhisperModelInfo {
                    name: name.to_string(),
                    path: path.to_string_lossy().to_string(),
                    size_mb: *size_mb,
                    multilingual: *multilingual,
                })
            } else {
                None
            }
        })
        .collect()
}

/// Convert audio file to 16kHz WAV (required by Whisper)
pub fn convert_to_wav(input_path: &Path) -> Result<PathBuf, VoiceError> {
    let output_path = input_path.with_extension("converted.wav");
    
    // Check if ffmpeg is available
    if Command::new("ffmpeg").arg("-version").output().is_err() {
        return Err(VoiceError::ConversionFailed(
            "ffmpeg not found. Install with: brew install ffmpeg".to_string()
        ));
    }
    
    let status = Command::new("ffmpeg")
        .args([
            "-y",                           // Overwrite output
            "-i", input_path.to_str().unwrap(),
            "-ar", "16000",                 // Sample rate: 16kHz
            "-ac", "1",                     // Mono
            "-c:a", "pcm_s16le",           // 16-bit PCM
            "-f", "wav",                    // WAV format
            output_path.to_str().unwrap(),
        ])
        .output()?;
    
    if !status.status.success() {
        return Err(VoiceError::ConversionFailed(
            String::from_utf8_lossy(&status.stderr).to_string()
        ));
    }
    
    Ok(output_path)
}

/// Transcribe audio file using whisper-cpp CLI
pub fn transcribe_file(
    audio_path: &Path,
    config: &WhisperConfig,
) -> Result<TranscriptionResult, VoiceError> {
    let start_time = std::time::Instant::now();
    
    // Check model exists
    if !config.model_path.exists() {
        return Err(VoiceError::ModelNotFound(
            config.model_path.to_string_lossy().to_string()
        ));
    }
    
    // Find whisper-cpp command
    let whisper_cmd = check_whisper_available()?;
    
    // Convert to WAV if needed
    let wav_path = if audio_path.extension().map(|e| e == "wav").unwrap_or(false) {
        // Check if already 16kHz
        audio_path.to_path_buf()
    } else {
        convert_to_wav(audio_path)?
    };
    
    // Build command
    let mut cmd = Command::new(&whisper_cmd);
    cmd.args([
        "-m", config.model_path.to_str().unwrap(),
        "-f", wav_path.to_str().unwrap(),
        "-l", &config.language,
        "-t", &config.threads.to_string(),
        "-oj",  // Output JSON
        "--no-prints",  // Suppress progress output
    ]);
    
    if config.translate {
        cmd.arg("--translate");
    }
    
    log::info!("Running whisper-cpp: {:?}", cmd);
    
    let output = cmd.output()?;
    
    if !output.status.success() {
        // Clean up temp file
        if wav_path != audio_path.to_path_buf() {
            let _ = std::fs::remove_file(&wav_path);
        }
        
        return Err(VoiceError::Transcription(
            String::from_utf8_lossy(&output.stderr).to_string()
        ));
    }
    
    // Parse JSON output
    let json_path = wav_path.with_extension("wav.json");
    
    let result = if json_path.exists() {
        parse_whisper_json(&json_path)?
    } else {
        // Fallback: parse stdout
        parse_whisper_stdout(&output.stdout)?
    };
    
    // Clean up temp files
    if wav_path != audio_path.to_path_buf() {
        let _ = std::fs::remove_file(&wav_path);
    }
    let _ = std::fs::remove_file(&json_path);
    
    let model_name = config.model_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    
    Ok(TranscriptionResult {
        text: result.0,
        segments: result.1,
        language: config.language.clone(),
        processing_time_ms: start_time.elapsed().as_millis() as u64,
        model_name,
    })
}

/// Parse whisper-cpp JSON output
fn parse_whisper_json(json_path: &Path) -> Result<(String, Vec<TranscriptSegment>), VoiceError> {
    let json_content = std::fs::read_to_string(json_path)?;
    
    let parsed: serde_json::Value = serde_json::from_str(&json_content)
        .map_err(|e| VoiceError::Transcription(format!("JSON parse error: {}", e)))?;
    
    let mut full_text = String::new();
    let mut segments = Vec::new();
    
    if let Some(transcription) = parsed.get("transcription").and_then(|t| t.as_array()) {
        for segment in transcription {
            if let Some(text) = segment.get("text").and_then(|t| t.as_str()) {
                let trimmed = text.trim();
                if !trimmed.is_empty() {
                    full_text.push_str(trimmed);
                    full_text.push(' ');
                    
                    let start_ms = segment
                        .get("offsets")
                        .and_then(|o| o.get("from"))
                        .and_then(|f| f.as_f64())
                        .map(|ms| (ms * 1000.0) as i64)
                        .unwrap_or(0);
                    
                    let end_ms = segment
                        .get("offsets")
                        .and_then(|o| o.get("to"))
                        .and_then(|t| t.as_f64())
                        .map(|ms| (ms * 1000.0) as i64)
                        .unwrap_or(0);
                    
                    segments.push(TranscriptSegment {
                        text: trimmed.to_string(),
                        start_ms,
                        end_ms,
                        confidence: 1.0,
                        risk_detected: None,
                    });
                }
            }
        }
    }
    
    Ok((full_text.trim().to_string(), segments))
}

/// Parse whisper-cpp stdout (fallback if JSON not available)
fn parse_whisper_stdout(stdout: &[u8]) -> Result<(String, Vec<TranscriptSegment>), VoiceError> {
    let output = String::from_utf8_lossy(stdout);
    
    // Simple extraction: take all lines that look like transcript
    let text: String = output
        .lines()
        .filter(|line| {
            !line.starts_with('[') && 
            !line.starts_with("whisper") &&
            !line.is_empty()
        })
        .collect::<Vec<_>>()
        .join(" ");
    
    Ok((text.trim().to_string(), vec![TranscriptSegment {
        text: text.trim().to_string(),
        start_ms: 0,
        end_ms: 0,
        confidence: 1.0,
        risk_detected: None,
    }]))
}

/// Voice status for frontend
#[derive(Debug, Clone, Serialize)]
pub struct VoiceStatus {
    pub whisper_installed: bool,
    pub whisper_command: Option<String>,
    pub models_available: Vec<String>,
    pub models_directory: String,
    pub recommended_model: String,
    pub ffmpeg_installed: bool,
}

/// Check voice system status
pub fn get_voice_status() -> VoiceStatus {
    let whisper_result = check_whisper_available();
    let models = list_available_models();
    let ffmpeg_ok = Command::new("ffmpeg").arg("-version").output().is_ok();
    
    VoiceStatus {
        whisper_installed: whisper_result.is_ok(),
        whisper_command: whisper_result.ok(),
        models_available: models.iter().map(|m| m.name.clone()).collect(),
        models_directory: get_models_directory().to_string_lossy().to_string(),
        recommended_model: "ggml-base.en.bin".to_string(),
        ffmpeg_installed: ffmpeg_ok,
    }
}

// ============================================
// Real-time Risk Detection During Transcription
// ============================================

/// Check transcript segment for risk phrases in real-time
pub fn check_segment_for_risks(segment: &mut TranscriptSegment) {
    use crate::ethics;
    use crate::models::DetectionSeverity;
    
    let analysis = ethics::analyze(&segment.text);
    
    // Find highest severity detection
    if let Some(highest) = analysis.detections.iter()
        .filter(|d| d.severity == DetectionSeverity::Attest)
        .next()
    {
        segment.risk_detected = Some(highest.id.clone());
    }
}

// ============================================
// Audio Processing Utilities
// ============================================

/// Resample audio to 16kHz mono (required by Whisper)
pub fn resample_to_16k(audio: &[f32], source_rate: u32) -> Vec<f32> {
    if source_rate == 16000 {
        return audio.to_vec();
    }
    
    let ratio = source_rate as f64 / 16000.0;
    let output_len = (audio.len() as f64 / ratio) as usize;
    let mut output = Vec::with_capacity(output_len);
    
    for i in 0..output_len {
        let src_idx = (i as f64 * ratio) as usize;
        if src_idx < audio.len() {
            output.push(audio[src_idx]);
        }
    }
    
    output
}

/// Convert stereo to mono
pub fn stereo_to_mono(audio: &[f32]) -> Vec<f32> {
    audio
        .chunks(2)
        .map(|chunk| {
            if chunk.len() == 2 {
                (chunk[0] + chunk[1]) / 2.0
            } else {
                chunk[0]
            }
        })
        .collect()
}

/// Normalize audio to -1.0 to 1.0 range
pub fn normalize_audio(audio: &mut [f32]) {
    let max = audio.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
    if max > 0.0 {
        for sample in audio.iter_mut() {
            *sample /= max;
        }
    }
}

// ============================================
// Voice-to-Note Pipeline
// ============================================

use crate::ai;
use crate::models::NoteType;

/// Complete voice-to-structured-note pipeline
pub async fn voice_to_note(
    transcript: &str,
    note_type: NoteType,
    model: &str,
) -> Result<String, VoiceError> {
    // Use AI module to structure the transcript
    ai::structure_note(model, transcript, note_type)
        .await
        .map_err(|e| VoiceError::Transcription(format!("AI structuring failed: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_resample() {
        let audio: Vec<f32> = (0..48000).map(|i| (i as f32 / 48000.0).sin()).collect();
        let resampled = resample_to_16k(&audio, 48000);
        assert_eq!(resampled.len(), 16000);
    }
    
    #[test]
    fn test_stereo_to_mono() {
        let stereo = vec![0.5, 0.5, 1.0, 0.0, -0.5, -0.5];
        let mono = stereo_to_mono(&stereo);
        assert_eq!(mono.len(), 3);
        assert_eq!(mono[0], 0.5);
        assert_eq!(mono[1], 0.5);
        assert_eq!(mono[2], -0.5);
    }
}

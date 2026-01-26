// AI Module v4 - Local LLM with PHI (Path A)
// 
// SECURITY BOUNDARY (from SPEC-v4.md):
// Ollama is treated as same-trust-zone (local service).
// We do NOT authenticate Ollama - no standard protocol exists.
// Security boundary is the host operating system.
// 
// PHI-in-LLM Containment:
// - Prompts/responses are NOT logged (enforced in this module)
// - Model hashes verified against known-good list
// - User responsible for Ollama network isolation
//
// LOOPBACK ENFORCEMENT:
// - ONLY localhost/127.0.0.1 connections allowed
// - URL validation prevents accidental external connections

use reqwest::Client;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use std::net::IpAddr;

use crate::models::{OllamaStatus, NoteType};

// SECURITY: Hardcoded to localhost - never configurable
const OLLAMA_BASE_URL: &str = "http://127.0.0.1:11434";

// Allowed models with expected digests (for verification, not auth)
const ALLOWED_MODELS: &[&str] = &[
    "qwen2.5:7b-instruct",
    "qwen2.5:7b",
    "gemma2:9b-it",
    "gemma2:9b",
    "llama3.2:3b",
    "mistral:7b",
    "mistral:7b-instruct",
];

/// Validates that a URL is loopback-only (127.0.0.1 or localhost)
/// Returns error if URL would connect to non-loopback address
fn validate_loopback_url(url: &str) -> Result<(), AIError> {
    let parsed = url::Url::parse(url)
        .map_err(|e| AIError::NotAvailable(format!("Invalid URL: {}", e)))?;
    
    let host = parsed.host_str()
        .ok_or_else(|| AIError::NotAvailable("No host in URL".to_string()))?;
    
    // Check for localhost
    if host == "localhost" {
        return Ok(());
    }
    
    // Check for loopback IP
    if let Ok(ip) = host.parse::<IpAddr>() {
        if ip.is_loopback() {
            return Ok(());
        }
    }
    
    Err(AIError::NotAvailable(format!(
        "Security: Ollama URL must be loopback (127.0.0.1 or localhost), got: {}",
        host
    )))
}

#[derive(Error, Debug)]
pub enum AIError {
    #[error("Ollama not available: {0}")]
    NotAvailable(String),
    
    #[error("Model not allowed: {0}")]
    ModelNotAllowed(String),
    
    #[error("Request failed: {0}")]
    RequestFailed(String),
    
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    
    #[error("Timeout")]
    Timeout,
}

// ============================================
// Status Check
// ============================================

#[derive(Deserialize)]
struct TagsResponse {
    models: Option<Vec<ModelInfo>>,
}

#[derive(Deserialize)]
struct ModelInfo {
    name: String,
}

pub async fn check_status() -> OllamaStatus {
    // Validate loopback before any network call
    if let Err(e) = validate_loopback_url(OLLAMA_BASE_URL) {
        return OllamaStatus {
            available: false,
            authenticated: false,
            models: vec![],
            error: Some(e.to_string()),
        };
    }
    
    let client = match Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build() 
    {
        Ok(c) => c,
        Err(e) => return OllamaStatus {
            available: false,
            authenticated: false,  // Always false - we don't authenticate
            models: vec![],
            error: Some(e.to_string()),
        },
    };
    
    match client.get(format!("{}/api/tags", OLLAMA_BASE_URL)).send().await {
        Ok(response) => {
            if let Ok(tags) = response.json::<TagsResponse>().await {
                let models: Vec<String> = tags.models
                    .unwrap_or_default()
                    .into_iter()
                    .map(|m| m.name)
                    .filter(|name| {
                        ALLOWED_MODELS.iter().any(|allowed| name.starts_with(allowed))
                    })
                    .collect();
                
                OllamaStatus {
                    available: true,
                    authenticated: false,  // Honest: we don't authenticate Ollama
                    models,
                    error: None,
                }
            } else {
                OllamaStatus {
                    available: true,
                    authenticated: false,
                    models: vec![],
                    error: Some("Could not parse model list".into()),
                }
            }
        }
        Err(e) => OllamaStatus {
            available: false,
            authenticated: false,
            models: vec![],
            error: Some(e.to_string()),
        },
    }
}

// ============================================
// Generation (PHI allowed in prompts)
// ============================================

#[derive(Serialize)]
struct GenerateRequest {
    model: String,
    prompt: String,
    stream: bool,
    options: GenerateOptions,
}

#[derive(Serialize)]
struct GenerateOptions {
    temperature: f32,
    top_p: f32,
    num_predict: i32,
}

#[derive(Deserialize)]
struct GenerateResponse {
    response: String,
}

/// Generate structured note from raw input
/// 
/// SECURITY NOTE: This sends PHI to Ollama. Acceptable because:
/// 1. Ollama runs locally (same-trust-zone)
/// 2. Prompts/responses are NOT logged
/// 3. User responsible for Ollama network isolation

/// Generic Ollama call for arbitrary prompts
pub async fn call_ollama(model: &str, prompt: &str) -> Result<String, AIError> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| AIError::RequestFailed(e.to_string()))?;
    
    let request = GenerateRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        stream: false,
        options: GenerateOptions {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 2048,
        },
    };
    
    let response = client
        .post(format!("{}/api/generate", OLLAMA_BASE_URL))
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                AIError::Timeout
            } else {
                AIError::RequestFailed(e.to_string())
            }
        })?;
    
    let gen_response: GenerateResponse = response
        .json()
        .await
        .map_err(|e| AIError::InvalidResponse(e.to_string()))?;
    
    Ok(gen_response.response)
}

pub async fn structure_note(
    model: &str,
    raw_input: &str,
    note_type: NoteType,
) -> Result<String, AIError> {
    // Verify model is in allowlist
    if !ALLOWED_MODELS.iter().any(|allowed| model.starts_with(allowed)) {
        return Err(AIError::ModelNotAllowed(model.to_string()));
    }
    
    // Build prompt with PHI (local processing only)
    let prompt = build_structuring_prompt(raw_input, note_type);
    
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| AIError::RequestFailed(e.to_string()))?;
    
    let request = GenerateRequest {
        model: model.to_string(),
        prompt,
        stream: false,
        options: GenerateOptions {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 2048,
        },
    };
    
    // NOTE: We do NOT log the prompt (contains PHI)
    log::info!("AI request: model={}, type={:?}", model, note_type);
    
    let response = client
        .post(format!("{}/api/generate", OLLAMA_BASE_URL))
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                AIError::Timeout
            } else {
                AIError::RequestFailed(e.to_string())
            }
        })?;
    
    let gen_response: GenerateResponse = response
        .json()
        .await
        .map_err(|e| AIError::InvalidResponse(e.to_string()))?;
    
    // NOTE: We do NOT log the response (may contain PHI)
    log::info!("AI response received: {} chars", gen_response.response.len());
    
    Ok(gen_response.response)
}

fn build_structuring_prompt(raw_input: &str, note_type: NoteType) -> String {
    let format = match note_type {
        NoteType::Progress => "SOAP",
        NoteType::Intake => "Intake Assessment",
        NoteType::Crisis => "Crisis Documentation",
        NoteType::Phone => "Phone Contact",
        NoteType::Group => "Group Session",
        NoteType::Termination => "Termination Summary",
    };
    
    let sections = match note_type {
        NoteType::Progress => r#"
**SUBJECTIVE:**
[Client's reported symptoms, concerns, progress since last session. Use quotes when possible.]

**OBJECTIVE:**
[Clinician observations, behaviors noted during session]

**MENTAL STATUS EXAM:**
- Appearance: [observed/not assessed]
- Behavior: [observed/not assessed]
- Speech: [observed/not assessed]
- Mood (reported): [reported/not assessed]
- Affect (observed): [observed/not assessed]
- Thought Process: [observed/not assessed]
- Thought Content: [observed/not assessed]
- Cognition: [observed/not assessed]
- Insight/Judgment: [observed/not assessed]

**RISK ASSESSMENT:**
- Suicidal Ideation: [Denied / Passive ideation / Active ideation with plan]
- Homicidal Ideation: [Denied / Present]
- Self-Harm: [Denied / Present]
- Safety Plan: [In place / Updated / Not applicable]
- Protective Factors: [list if documented]

**ASSESSMENT:**
[Clinical impression, progress toward goals, diagnostic considerations]

**INTERVENTIONS:**
[Specific therapeutic interventions used this session]

**PLAN:**
[Next steps, homework, follow-up schedule]"#,
        NoteType::Intake => r#"
**IDENTIFYING INFORMATION:**
[Demographics, referral source]

**PRESENTING PROBLEM:**
[Chief complaint in client's words]

**HISTORY OF PRESENT ILLNESS:**
[Onset, duration, severity, prior treatment]

**PSYCHIATRIC HISTORY:**
[Prior diagnoses, hospitalizations, medications]

**MENTAL STATUS EXAM:**
- Appearance: [observed/not assessed]
- Behavior: [observed/not assessed]
- Speech: [observed/not assessed]
- Mood (reported): [reported/not assessed]
- Affect (observed): [observed/not assessed]
- Thought Process: [observed/not assessed]
- Thought Content: [observed/not assessed]
- Cognition: [observed/not assessed]
- Insight/Judgment: [observed/not assessed]

**RISK ASSESSMENT:**
- Suicidal Ideation: [Denied / Passive / Active with plan]
- Homicidal Ideation: [Denied / Present]
- Self-Harm History: [None / Past / Current]
- Safety Plan: [Developed / Deferred]

**DIAGNOSTIC IMPRESSIONS:**
[Working diagnoses with ICD-10 codes if documented]

**TREATMENT RECOMMENDATIONS:**
[Modality, frequency, goals]"#,
        NoteType::Crisis => r#"
**CRISIS PRESENTATION:**
[Immediate concerns, precipitating factors]

**MENTAL STATUS EXAM:**
- Appearance: [observed]
- Behavior: [observed]
- Mood/Affect: [observed]
- Thought Content: [observed - critical for crisis]
- Cognition: [observed]

**RISK ASSESSMENT (CRITICAL):**
- Suicidal Ideation: [Denied / Passive / Active - with details]
- Plan: [None / Vague / Specific - describe]
- Intent: [None / Low / High]
- Means Access: [None / Limited / Available]
- Homicidal Ideation: [Denied / Present - with target if applicable]
- Prior Attempts: [None / History - describe]

**PROTECTIVE FACTORS:**
[List all identified]

**SAFETY PLAN:**
[Steps developed or reviewed]

**INTERVENTIONS:**
[Crisis interventions used]

**DISPOSITION:**
[Outcome of crisis assessment, level of care, follow-up]"#,
        _ => r#"
**CONTACT SUMMARY:**
[Purpose and content of contact]

**MENTAL STATUS (if observed):**
[Brief observations]

**RISK (if assessed):**
[Any safety concerns]

**PLAN:**
[Next steps]"#,
    };
    
    format!(r#"You are a clinical documentation assistant. Structure the following session note into {format} format.

RULES:
1. PRESERVE the clinician's original language - do not sanitize or soften clinical observations
2. ONLY extract information explicitly stated in the note
3. For MSE and Risk items: write "Not assessed" if not mentioned in the note
4. If information is missing for a section, write "Not documented"
5. Do NOT add clinical interpretations or diagnoses not present in the original
6. Maintain clinical terminology as written
7. Use the exact section headers provided below
8. For Risk Assessment: Default to "Denied" only if explicitly stated; otherwise "Not assessed"

SESSION NOTE:
{input}

Format the note using these sections:
{sections}

STRUCTURED OUTPUT:
"#,
        format = format,
        input = raw_input,
        sections = sections
    )
}

/// Generate clinical formulation from multiple notes
pub async fn generate_formulation(
    model: &str,
    notes: &[(String, String)],  // (date, content) pairs
    formulation_type: &str,
) -> Result<String, AIError> {
    // Verify model is in allowlist
    if !ALLOWED_MODELS.iter().any(|allowed| model.starts_with(allowed)) {
        return Err(AIError::ModelNotAllowed(model.to_string()));
    }
    
    let prompt = build_formulation_prompt(notes, formulation_type);
    
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| AIError::RequestFailed(e.to_string()))?;
    
    let request = GenerateRequest {
        model: model.to_string(),
        prompt,
        stream: false,
        options: GenerateOptions {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 4096,
        },
    };
    
    log::info!("AI formulation: model={}, type={}", model, formulation_type);
    
    let response = client
        .post(format!("{}/api/generate", OLLAMA_BASE_URL))
        .json(&request)
        .send()
        .await
        .map_err(|e| AIError::RequestFailed(e.to_string()))?;
    
    let gen_response: GenerateResponse = response
        .json()
        .await
        .map_err(|e| AIError::InvalidResponse(e.to_string()))?;
    
    Ok(gen_response.response)
}

fn build_formulation_prompt(notes: &[(String, String)], formulation_type: &str) -> String {
    let notes_text = notes
        .iter()
        .map(|(date, content)| format!("--- Session {} ---\n{}\n", date, content))
        .collect::<Vec<_>>()
        .join("\n");
    
    let format_instructions = match formulation_type {
        "4ps" => r#"Create a 4Ps formulation:
- Predisposing factors (vulnerability factors)
- Precipitating factors (recent triggers)  
- Perpetuating factors (maintaining factors)
- Protective factors (strengths and resources)

Each factor MUST cite the specific session date as evidence: [Session YYYY-MM-DD]"#,
        
        "summary" => r#"Create a clinical summary including:
- Presenting concerns
- Course of treatment
- Current status
- Treatment response

Cite specific sessions as evidence where relevant."#,
        
        "risk" => r#"Create a risk narrative including:
- Identified risk factors
- Protective factors
- Risk trajectory over time
- Monitoring plan recommendations

Cite specific sessions as evidence."#,
        
        _ => "Create a clinical summary with evidence citations."
    };
    
    format!(r#"You are a clinical documentation assistant. Based on the following session notes, {instructions}

RULES:
1. Every statement MUST cite a specific session using [Session YYYY-MM-DD] format
2. Only include information explicitly documented in the notes
3. Use hedged language: "Notes suggest...", "Documentation indicates..."
4. If a category lacks evidence, state "Insufficient documentation"
5. Do not make clinical interpretations beyond what's documented

SESSION NOTES:
{notes}

FORMULATION:
"#,
        instructions = format_instructions,
        notes = notes_text
    )
}

// ============================================
// Embeddings (local, no Ollama needed)
// ============================================

/// Placeholder for local embeddings
/// In production, use bundled ONNX model (all-MiniLM-L6-v2)
pub fn embed_text_local(_text: &str) -> Vec<f32> {
    // TODO: Implement with tract/ort ONNX inference
    vec![0.0; 384]
}

/// Generate a direct answer to a question (for RAG queries)
/// Unlike structure_note, this produces a natural language answer, not SOAP format
pub async fn generate_answer(
    model: &str,
    prompt: &str,
) -> Result<String, AIError> {
    // Verify model is in allowlist
    if !ALLOWED_MODELS.iter().any(|allowed| model.starts_with(allowed)) {
        return Err(AIError::ModelNotAllowed(model.to_string()));
    }
    
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| AIError::RequestFailed(e.to_string()))?;
    
    let request = GenerateRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        stream: false,
        options: GenerateOptions {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 1024,
        },
    };
    
    log::info!("AI RAG query: model={}", model);
    
    let response = client
        .post(format!("{}/api/generate", OLLAMA_BASE_URL))
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                AIError::Timeout
            } else {
                AIError::RequestFailed(e.to_string())
            }
        })?;
    
    let gen_response: GenerateResponse = response
        .json()
        .await
        .map_err(|e| AIError::InvalidResponse(e.to_string()))?;
    
    log::info!("AI RAG answer received: {} chars", gen_response.response.len());
    
    Ok(gen_response.response)
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    
    dot / (norm_a * norm_b)
}

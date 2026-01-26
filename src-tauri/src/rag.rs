// RAG Module v4 - Retrieval-Augmented Generation
//
// Local vector search for cross-note queries.
// All embeddings stored in encrypted vault, no data leaves device.
//
// Architecture:
// 1. Embedding generation via local ONNX model (all-MiniLM-L6-v2)
// 2. Vector storage in SQLCipher vault
// 3. HNSW-style approximate nearest neighbor search
// 4. RAG prompts to LLM with retrieved context

use std::collections::HashMap;
use rusqlite::{Connection, params};
use thiserror::Error;

use crate::ai;

#[derive(Error, Debug)]
pub enum RAGError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("Embedding error: {0}")]
    Embedding(String),
    
    #[error("No results found")]
    NoResults,
    
    #[error("Model not loaded")]
    ModelNotLoaded,
}

/// Safely slice a string respecting UTF-8 character boundaries
/// Returns the original string if bounds are invalid
fn safe_string_slice(s: &str, start: usize, end: usize) -> String {
    // Validate bounds
    if start >= s.len() || end > s.len() || start >= end {
        return s.to_string();
    }
    
    // Find valid UTF-8 boundaries
    let mut actual_start = start;
    let mut actual_end = end;
    
    // Adjust start to a valid char boundary
    while actual_start > 0 && !s.is_char_boundary(actual_start) {
        actual_start -= 1;
    }
    
    // Adjust end to a valid char boundary
    while actual_end < s.len() && !s.is_char_boundary(actual_end) {
        actual_end += 1;
    }
    
    // Final safety check
    if actual_start < actual_end && actual_end <= s.len() {
        s[actual_start..actual_end].to_string()
    } else {
        s.to_string()
    }
}

/// Embedding model configuration
pub const EMBEDDING_DIM: usize = 384;  // all-MiniLM-L6-v2
pub const EMBEDDING_MODEL_ID: &str = "all-MiniLM-L6-v2";

/// A chunk of text with its embedding
#[derive(Debug, Clone)]
pub struct EmbeddedChunk {
    pub id: String,
    pub note_id: String,
    pub chunk_index: i32,
    pub chunk_start: i32,
    pub chunk_end: i32,
    pub text: String,
    pub embedding: Vec<f32>,
}

/// Search result with relevance score
#[derive(Debug, Clone, serde::Serialize)]
pub struct SearchResult {
    pub note_id: String,
    pub chunk_text: String,
    pub score: f32,
    pub note_date: Option<String>,
    pub note_type: Option<String>,
    pub client_id: Option<String>,
}

/// RAG context for augmented generation
#[derive(Debug, Clone)]
pub struct RAGContext {
    pub query: String,
    pub results: Vec<SearchResult>,
    pub total_tokens: usize,
    pub client_profile: Option<String>,
}

// ============================================
// Embedding Generation (Ollama + TF-IDF fallback)
// ============================================

/// Generate embedding for text
/// 
/// Strategy:
/// 1. Try Ollama's embedding endpoint (if available) - best quality
/// 2. Fall back to TF-IDF style word-frequency embeddings - still useful for search
pub fn generate_embedding(text: &str) -> Result<Vec<f32>, RAGError> {
    // Try Ollama embedding first (blocking call for sync interface)
    if let Ok(embedding) = generate_ollama_embedding_sync(text) {
        return Ok(embedding);
    }
    
    // Fallback to TF-IDF style embedding
    generate_tfidf_embedding(text)
}

/// Try to get embedding from Ollama
fn generate_ollama_embedding_sync(text: &str) -> Result<Vec<f32>, RAGError> {
    use std::io::{Read, Write};
    use std::net::TcpStream;
    use std::time::Duration;
    
    // Check if Ollama is available (quick TCP check)
    let stream = TcpStream::connect_timeout(
        &"127.0.0.1:11434".parse().unwrap(),
        Duration::from_millis(100)
    ).map_err(|_| RAGError::Embedding("Ollama not available".to_string()))?;
    drop(stream);
    
    // Build request - try nomic-embed-text first, fallback to all-minilm
    let request_body = serde_json::json!({
        "model": "nomic-embed-text",
        "prompt": text
    });
    
    let body_str = request_body.to_string();
    let request = format!(
        "POST /api/embeddings HTTP/1.1\r\n\
         Host: 127.0.0.1:11434\r\n\
         Content-Type: application/json\r\n\
         Content-Length: {}\r\n\
         Connection: close\r\n\
         \r\n\
         {}",
        body_str.len(),
        body_str
    );
    
    // Send request
    let mut stream = TcpStream::connect_timeout(
        &"127.0.0.1:11434".parse().unwrap(),
        Duration::from_secs(5)
    ).map_err(|e| RAGError::Embedding(format!("Connection failed: {}", e)))?;
    
    stream.set_read_timeout(Some(Duration::from_secs(10))).ok();
    stream.write_all(request.as_bytes())
        .map_err(|e| RAGError::Embedding(format!("Write failed: {}", e)))?;
    
    // Read response
    let mut response = String::new();
    stream.read_to_string(&mut response)
        .map_err(|e| RAGError::Embedding(format!("Read failed: {}", e)))?;
    
    // Parse response - find JSON body after headers
    let body_start = response.find("\r\n\r\n")
        .ok_or_else(|| RAGError::Embedding("Invalid response".to_string()))?;
    let body = &response[body_start + 4..];
    
    // Parse JSON
    let json: serde_json::Value = serde_json::from_str(body)
        .map_err(|e| RAGError::Embedding(format!("JSON parse error: {}", e)))?;
    
    // Extract embedding array
    let embedding_array = json.get("embedding")
        .and_then(|v| v.as_array())
        .ok_or_else(|| RAGError::Embedding("No embedding in response".to_string()))?;
    
    let embedding: Vec<f32> = embedding_array.iter()
        .filter_map(|v| v.as_f64().map(|f| f as f32))
        .collect();
    
    if embedding.is_empty() {
        return Err(RAGError::Embedding("Empty embedding".to_string()));
    }
    
    // Resize to standard dimension if needed
    let mut result = vec![0.0f32; EMBEDDING_DIM];
    for (i, val) in embedding.iter().enumerate() {
        if i < EMBEDDING_DIM {
            result[i] = *val;
        }
    }
    
    Ok(result)
}

/// Generate TF-IDF style embedding from text
/// Uses word frequencies and position weighting
fn generate_tfidf_embedding(text: &str) -> Result<Vec<f32>, RAGError> {
    use std::collections::HashMap;
    
    // Common clinical/psychology terms with weights
    let domain_terms: HashMap<&str, f32> = [
        // Mental health terms
        ("anxiety", 2.0), ("depression", 2.0), ("mood", 1.5), ("affect", 1.5),
        ("suicidal", 3.0), ("ideation", 2.5), ("trauma", 2.0), ("ptsd", 2.0),
        ("panic", 1.8), ("obsessive", 1.8), ("compulsive", 1.8), ("adhd", 2.0),
        ("autism", 2.0), ("asd", 2.0), ("spectrum", 1.5), ("sensory", 1.5),
        // Clinical documentation
        ("subjective", 1.5), ("objective", 1.5), ("assessment", 1.5), ("plan", 1.5),
        ("intervention", 1.8), ("cbt", 2.0), ("dbt", 2.0), ("emdr", 2.0),
        ("medication", 1.5), ("symptom", 1.5), ("diagnosis", 1.8), ("prognosis", 1.5),
        // Risk and safety
        ("risk", 2.0), ("safety", 2.0), ("harm", 2.5), ("danger", 2.5),
        ("protective", 1.5), ("factors", 1.0), ("hospitalization", 2.0),
        // Progress indicators
        ("improved", 1.5), ("deteriorated", 1.8), ("stable", 1.2), ("progress", 1.3),
        ("regression", 1.8), ("breakthrough", 1.5), ("insight", 1.5),
        // Relationships
        ("family", 1.3), ("relationship", 1.3), ("conflict", 1.5), ("support", 1.2),
        ("isolation", 1.5), ("attachment", 1.5),
    ].iter().cloned().collect();
    
    let text_lower = text.to_lowercase();
    let words: Vec<&str> = text_lower
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| w.len() >= 3)
        .collect();
    
    // Count word frequencies
    let mut word_counts: HashMap<&str, usize> = HashMap::new();
    for word in &words {
        *word_counts.entry(*word).or_insert(0) += 1;
    }
    
    // Generate embedding dimensions
    let mut embedding = vec![0.0f32; EMBEDDING_DIM];
    
    // Dimension 0-127: Word hash buckets with TF-IDF weighting
    for (word, count) in &word_counts {
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        use std::hash::{Hash, Hasher};
        word.hash(&mut hasher);
        let bucket = (hasher.finish() as usize) % 128;
        
        // TF-IDF-like weighting
        let tf = (*count as f32).ln() + 1.0;  // Log-scaled term frequency
        let idf = domain_terms.get(*word).copied().unwrap_or(1.0);  // Domain importance
        
        embedding[bucket] += tf * idf;
    }
    
    // Dimension 128-191: Bigram features
    for window in words.windows(2) {
        let bigram = format!("{}_{}", window[0], window[1]);
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        use std::hash::{Hash, Hasher};
        bigram.hash(&mut hasher);
        let bucket = 128 + (hasher.finish() as usize) % 64;
        embedding[bucket] += 1.0;
    }
    
    // Dimension 192-255: Document-level features
    embedding[192] = (words.len() as f32).ln();  // Document length
    embedding[193] = word_counts.len() as f32 / words.len().max(1) as f32;  // Vocabulary richness
    
    // Clinical domain activation
    let clinical_score: f32 = words.iter()
        .filter_map(|w| domain_terms.get(w))
        .sum();
    embedding[194] = clinical_score / words.len().max(1) as f32;
    
    // Risk indicators
    let risk_words = ["suicide", "suicidal", "harm", "kill", "death", "danger", "crisis"];
    let risk_score: f32 = words.iter()
        .filter(|w| risk_words.contains(&w.as_ref()))
        .count() as f32;
    embedding[195] = risk_score;
    
    // Progress indicators
    let positive_words = ["improved", "better", "progress", "stable", "insight", "breakthrough"];
    let negative_words = ["worse", "deteriorated", "regression", "decline", "crisis"];
    let positive_count = words.iter().filter(|w| positive_words.contains(&w.as_ref())).count();
    let negative_count = words.iter().filter(|w| negative_words.contains(&w.as_ref())).count();
    embedding[196] = positive_count as f32 - negative_count as f32;
    
    // Normalize to unit vector
    let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm > 0.0 {
        for x in embedding.iter_mut() {
            *x /= norm;
        }
    }
    
    Ok(embedding)
}

/// Batch generate embeddings (more efficient)
pub fn generate_embeddings_batch(texts: &[&str]) -> Result<Vec<Vec<f32>>, RAGError> {
    texts.iter().map(|t| generate_embedding(t)).collect()
}

// ============================================
// Chunking Strategy
// ============================================

/// Chunk text into overlapping segments for embedding
pub fn chunk_text(text: &str, chunk_size: usize, overlap: usize) -> Vec<TextChunk> {
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut chunks = Vec::new();
    
    if words.is_empty() {
        return chunks;
    }
    
    let mut start = 0;
    let mut chunk_index = 0;
    
    while start < words.len() {
        let end = (start + chunk_size).min(words.len());
        let chunk_words = &words[start..end];
        let chunk_text = chunk_words.join(" ");
        
        // Calculate character offsets
        let char_start = if start == 0 {
            0
        } else {
            text.find(chunk_words[0]).unwrap_or(0)
        };
        let char_end = char_start + chunk_text.len();
        
        chunks.push(TextChunk {
            index: chunk_index,
            text: chunk_text,
            start: char_start,
            end: char_end,
        });
        
        chunk_index += 1;
        
        if end >= words.len() {
            break;
        }
        
        start = end - overlap;
    }
    
    chunks
}

#[derive(Debug, Clone)]
pub struct TextChunk {
    pub index: i32,
    pub text: String,
    pub start: usize,
    pub end: usize,
}

// ============================================
// Vector Storage & Search
// ============================================

/// Store embedding in vault
pub fn store_embedding(
    conn: &Connection,
    note_id: &str,
    chunk: &TextChunk,
    embedding: &[f32],
) -> Result<String, RAGError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();
    
    // Serialize embedding to bytes
    let vector_bytes: Vec<u8> = embedding
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect();
    
    conn.execute(
        "INSERT INTO embeddings (id, note_id, chunk_index, chunk_start, chunk_end, vector, model_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            &id,
            note_id,
            chunk.index,
            chunk.start as i32,
            chunk.end as i32,
            vector_bytes,
            EMBEDDING_MODEL_ID,
            now
        ],
    )?;
    
    Ok(id)
}

/// Delete embeddings for a note (e.g., when note is updated)
pub fn delete_note_embeddings(conn: &Connection, note_id: &str) -> Result<usize, RAGError> {
    let count = conn.execute(
        "DELETE FROM embeddings WHERE note_id = ?1",
        params![note_id],
    )?;
    Ok(count)
}

/// Search for similar content across all notes
pub fn search_similar(
    conn: &Connection,
    query: &str,
    limit: usize,
    client_id: Option<&str>,
) -> Result<Vec<SearchResult>, RAGError> {
    // Generate query embedding
    let query_embedding = generate_embedding(query)?;
    
    // Build query based on whether we're filtering by client
    let sql = if client_id.is_some() {
        r#"
        SELECT e.note_id, e.chunk_start, e.chunk_end, e.vector,
               n.session_date, n.note_type, n.client_id, n.raw_input
        FROM embeddings e
        JOIN notes n ON e.note_id = n.id
        WHERE n.client_id = ?1
        "#
    } else {
        r#"
        SELECT e.note_id, e.chunk_start, e.chunk_end, e.vector,
               n.session_date, n.note_type, n.client_id, n.raw_input
        FROM embeddings e
        JOIN notes n ON e.note_id = n.id
        "#
    };
    
    let mut stmt = conn.prepare(sql)?;
    
    // Collect all matching rows
    let mut embedding_rows: Vec<EmbeddingRow> = Vec::new();
    
    let mapper = |row: &rusqlite::Row<'_>| -> rusqlite::Result<EmbeddingRow> {
        Ok(EmbeddingRow {
            note_id: row.get(0)?,
            chunk_start: row.get(1)?,
            chunk_end: row.get(2)?,
            vector: row.get(3)?,
            session_date: row.get(4)?,
            note_type: row.get(5)?,
            client_id: row.get(6)?,
            raw_input: row.get(7)?,
        })
    };
    
    if let Some(cid) = client_id {
        let rows = stmt.query_map(params![cid], mapper)?;
        for row_result in rows {
            embedding_rows.push(row_result?);
        }
    } else {
        let rows = stmt.query_map([], mapper)?;
        for row_result in rows {
            embedding_rows.push(row_result?);
        }
    }
    
    // Calculate similarity scores and rank
    let mut results: Vec<(f32, SearchResult)> = Vec::new();
    
    for row in embedding_rows {
        
        // Deserialize embedding
        let embedding = bytes_to_embedding(&row.vector);
        
        // Calculate cosine similarity
        let score = cosine_similarity(&query_embedding, &embedding);
        
        // Extract chunk text from raw_input (safely handling UTF-8 boundaries)
        let chunk_text = safe_string_slice(
            &row.raw_input,
            row.chunk_start as usize,
            row.chunk_end as usize
        );
        
        results.push((score, SearchResult {
            note_id: row.note_id,
            chunk_text,
            score,
            note_date: Some(row.session_date),
            note_type: Some(row.note_type),
            client_id: Some(row.client_id),
        }));
    }
    
    // Sort by score descending
    results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    
    // Take top N
    let top_results: Vec<SearchResult> = results
        .into_iter()
        .take(limit)
        .map(|(_, r)| r)
        .collect();
    
    if top_results.is_empty() {
        return Err(RAGError::NoResults);
    }
    
    Ok(top_results)
}

struct EmbeddingRow {
    note_id: String,
    chunk_start: i32,
    chunk_end: i32,
    vector: Vec<u8>,
    session_date: String,
    note_type: String,
    client_id: String,
    raw_input: String,
}

fn bytes_to_embedding(bytes: &[u8]) -> Vec<f32> {
    bytes
        .chunks(4)
        .map(|chunk| {
            let arr: [u8; 4] = chunk.try_into().unwrap_or([0; 4]);
            f32::from_le_bytes(arr)
        })
        .collect()
}

/// Cosine similarity between two vectors
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

// ============================================
// RAG Query Pipeline
// ============================================

/// Build RAG context from search results
pub fn build_rag_context(query: &str, results: Vec<SearchResult>, max_tokens: usize) -> RAGContext {
    build_rag_context_with_profile(query, results, max_tokens, None)
}

/// Build RAG context from search results with optional client profile
pub fn build_rag_context_with_profile(query: &str, results: Vec<SearchResult>, max_tokens: usize, client_profile: Option<String>) -> RAGContext {
    let mut context_parts = Vec::new();
    let mut total_tokens = 0;
    
    // Account for profile tokens
    if let Some(ref profile) = client_profile {
        total_tokens += profile.len() / 4;
    }
    
    for result in results {
        // Rough token estimate: 1 token ≈ 4 chars
        let chunk_tokens = result.chunk_text.len() / 4;
        
        if total_tokens + chunk_tokens > max_tokens {
            break;
        }
        
        context_parts.push(result);
        total_tokens += chunk_tokens;
    }
    
    RAGContext {
        query: query.to_string(),
        results: context_parts,
        total_tokens,
        client_profile,
    }
}

/// Generate RAG prompt with retrieved context
pub fn build_rag_prompt(context: &RAGContext, question: &str) -> String {
    let mut prompt = String::from(
        r#"You are a clinical documentation assistant. Answer the question based on the provided context from past session notes and client profile information.

RULES:
1. First check client profile information for demographic and administrative details
2. Use information from the context, citing session dates: [Session YYYY-MM-DD]
3. If the context contains partial information, provide what's available and note what's missing
4. Only say "Not found in available notes" if the context is completely empty or irrelevant
5. Do not make clinical interpretations beyond what's documented
6. Use hedged language: "Notes indicate...", "Documentation suggests...", "Based on available notes..."

"#
    );
    
    // Add client profile if present
    if let Some(profile) = &context.client_profile {
        prompt.push_str("CLIENT PROFILE:\n");
        prompt.push_str(profile);
        prompt.push_str("\n\n");
    }
    
    prompt.push_str("CONTEXT FROM PAST NOTES:\n");
    
    for result in &context.results {
        if let Some(date) = &result.note_date {
            prompt.push_str(&format!("\n--- Session {} ---\n", date));
        }
        prompt.push_str(&result.chunk_text);
        prompt.push_str("\n");
    }
    
    prompt.push_str(&format!("\nQUESTION: {}\n\nANSWER:", question));
    
    prompt
}

/// Execute RAG query: search + generate answer
pub async fn rag_query(
    conn: &Connection,
    question: &str,
    client_id: Option<&str>,
    model: &str,
) -> Result<RAGAnswer, RAGError> {
    // Search for relevant chunks - increased to 10 for better coverage
    let results = search_similar(conn, question, 10, client_id)?;
    
    // Get client profile if client_id is provided
    let client_profile = if let Some(cid) = client_id {
        get_client_profile_text(conn, cid).ok()
    } else {
        None
    };
    
    // Build context with profile (limit to ~3000 tokens for better answers)
    let context = build_rag_context_with_profile(question, results, 3000, client_profile);
    
    // Generate RAG prompt
    let prompt = build_rag_prompt(&context, question);
    
    // Call LLM with generate_answer (not structure_note!)
    let answer = ai::generate_answer(model, &prompt)
        .await
        .map_err(|e| RAGError::Embedding(format!("LLM error: {}", e)))?;
    
    Ok(RAGAnswer {
        answer,
        sources: context.results.iter().map(|r| RAGSource {
            note_id: r.note_id.clone(),
            note_date: r.note_date.clone(),
            relevance: r.score,
        }).collect(),
    })
}

/// Get client profile as searchable text
fn get_client_profile_text(conn: &Connection, client_id: &str) -> Result<String, RAGError> {
    let sql = r#"
        SELECT display_name, date_of_birth, phone, email, emergency_contact,
               insurance_info, diagnosis_codes, treatment_start_date, referring_provider, notes
        FROM clients WHERE id = ?1
    "#;
    
    let result: Result<(String, Option<String>, Option<String>, Option<String>, Option<String>,
                        Option<String>, Option<String>, Option<String>, Option<String>, Option<String>), _> = 
        conn.query_row(sql, params![client_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
            ))
        });
    
    match result {
        Ok((name, dob, phone, email, emergency, insurance, dx, start_date, referring, notes)) => {
            let mut profile = format!("Client: {}\n", name);
            if let Some(d) = dob { profile.push_str(&format!("Date of Birth: {}\n", d)); }
            if let Some(p) = phone { profile.push_str(&format!("Phone: {}\n", p)); }
            if let Some(e) = email { profile.push_str(&format!("Email: {}\n", e)); }
            if let Some(ec) = emergency { profile.push_str(&format!("Emergency Contact: {}\n", ec)); }
            if let Some(i) = insurance { profile.push_str(&format!("Insurance: {}\n", i)); }
            if let Some(dx) = dx { profile.push_str(&format!("Diagnosis Codes: {}\n", dx)); }
            if let Some(sd) = start_date { profile.push_str(&format!("Treatment Start: {}\n", sd)); }
            if let Some(rp) = referring { profile.push_str(&format!("Referring Provider: {}\n", rp)); }
            if let Some(n) = notes { profile.push_str(&format!("Notes: {}\n", n)); }
            Ok(profile)
        },
        Err(e) => Err(RAGError::Database(e)),
    }
}

/// Synchronous version of rag_query for use in Tauri commands
pub fn rag_query_sync(
    conn: &Connection,
    question: &str,
    client_id: Option<&str>,
    model: &str,
) -> Result<RAGAnswer, RAGError> {
    // Search for relevant chunks
    let results = search_similar(conn, question, 5, client_id)?;
    
    // Get client profile if client_id is provided
    let client_profile = if let Some(cid) = client_id {
        get_client_profile_text(conn, cid).ok()
    } else {
        None
    };
    
    // Build context with profile (limit to ~2000 tokens)
    let context = build_rag_context_with_profile(question, results, 2000, client_profile);
    
    // Generate RAG prompt
    let prompt = build_rag_prompt(&context, question);
    
    // Call LLM synchronously using tokio's block_in_place
    let answer = tokio::task::block_in_place(|| {
        tokio::runtime::Handle::current().block_on(async {
            ai::generate_answer(model, &prompt).await
        })
    }).map_err(|e| RAGError::Embedding(format!("LLM error: {}", e)))?;
    
    Ok(RAGAnswer {
        answer,
        sources: context.results.iter().map(|r| RAGSource {
            note_id: r.note_id.clone(),
            note_date: r.note_date.clone(),
            relevance: r.score,
        }).collect(),
    })
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RAGAnswer {
    pub answer: String,
    pub sources: Vec<RAGSource>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RAGSource {
    pub note_id: String,
    pub note_date: Option<String>,
    pub relevance: f32,
}

// ============================================
// Index Management
// ============================================

/// Index a note for RAG search
pub fn index_note(
    conn: &Connection,
    note_id: &str,
    content: &str,
) -> Result<usize, RAGError> {
    // Delete existing embeddings
    delete_note_embeddings(conn, note_id)?;
    
    // Chunk the content
    let chunks = chunk_text(content, 100, 20); // 100 words per chunk, 20 word overlap
    
    // Generate and store embeddings
    let mut count = 0;
    for chunk in chunks {
        let embedding = generate_embedding(&chunk.text)?;
        store_embedding(conn, note_id, &chunk, &embedding)?;
        count += 1;
    }
    
    log::info!("Indexed note {} with {} chunks", note_id, count);
    Ok(count)
}

/// Reindex all notes (e.g., after model update)
pub fn reindex_all_notes(conn: &Connection) -> Result<usize, RAGError> {
    // Get all notes
    let mut stmt = conn.prepare("SELECT id, raw_input FROM notes")?;
    let notes: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .filter_map(|r| r.ok())
        .collect();
    
    let mut total = 0;
    for (note_id, content) in notes {
        total += index_note(conn, &note_id, &content)?;
    }
    
    log::info!("Reindexed all notes: {} total chunks", total);
    Ok(total)
}

/// Get indexing stats
pub fn get_index_stats(conn: &Connection) -> Result<IndexStats, RAGError> {
    let total_embeddings: i64 = conn.query_row(
        "SELECT COUNT(*) FROM embeddings",
        [],
        |row| row.get(0),
    )?;
    
    let total_notes: i64 = conn.query_row(
        "SELECT COUNT(*) FROM notes",
        [],
        |row| row.get(0),
    )?;
    
    let indexed_notes: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT note_id) FROM embeddings",
        [],
        |row| row.get(0),
    )?;
    
    Ok(IndexStats {
        total_embeddings: total_embeddings as usize,
        total_notes: total_notes as usize,
        indexed_notes: indexed_notes as usize,
        embedding_model: EMBEDDING_MODEL_ID.to_string(),
        embedding_dim: EMBEDDING_DIM,
    })
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct IndexStats {
    pub total_embeddings: usize,
    pub total_notes: usize,
    pub indexed_notes: usize,
    pub embedding_model: String,
    pub embedding_dim: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_chunking() {
        let text = "This is a test sentence. It has multiple words. We want to chunk it properly.";
        let chunks = chunk_text(text, 5, 2);
        
        assert!(!chunks.is_empty());
        assert!(chunks.len() >= 2);
    }
    
    #[test]
    fn test_embedding_deterministic() {
        let text = "Patient reported improved sleep patterns";
        let emb1 = generate_embedding(text).unwrap();
        let emb2 = generate_embedding(text).unwrap();
        
        // Same text should give same embedding
        assert_eq!(emb1, emb2);
    }
    
    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let c = vec![0.0, 1.0, 0.0];
        
        assert!((cosine_similarity(&a, &b) - 1.0).abs() < 0.001);
        assert!(cosine_similarity(&a, &c).abs() < 0.001);
    }
}

#!/bin/bash
#
# Evidify Post-Install Script for Jamf Pro
#
# This script runs after Evidify.app is installed via Jamf.
# It handles:
# - Policy file deployment
# - Ollama installation check
# - Whisper model download
# - First-run configuration
#
# Deploy via: Jamf Pro > Scripts > Add
# Assign to: Policy that installs Evidify.app
#

set -e

# ============================================
# Configuration
# ============================================

EVIDIFY_APP="/Applications/Evidify.app"
EVIDIFY_SUPPORT="$HOME/Library/Application Support/ai.evidify"
POLICY_FILE="$EVIDIFY_SUPPORT/policy.json"
LOG_FILE="/var/log/evidify-install.log"
OLLAMA_URL="https://ollama.ai/download/mac"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ============================================
# Pre-flight Checks
# ============================================

log "Starting Evidify post-install script"
log "User: $USER"
log "Home: $HOME"

# Verify app was installed
if [ ! -d "$EVIDIFY_APP" ]; then
    log "ERROR: Evidify.app not found at $EVIDIFY_APP"
    exit 1
fi
log "Evidify.app found"

# Create support directory
mkdir -p "$EVIDIFY_SUPPORT"
log "Support directory created: $EVIDIFY_SUPPORT"

# ============================================
# Deploy Organization Policy
# ============================================

# Check if policy was deployed via MDM
MDM_POLICY="/Library/Managed Preferences/ai.evidify.plist"
if [ -f "$MDM_POLICY" ]; then
    log "MDM policy found, converting to JSON"
    
    # Convert plist to JSON for Evidify
    /usr/bin/plutil -convert json -o "$POLICY_FILE" "$MDM_POLICY" 2>/dev/null || {
        log "WARNING: Could not convert MDM policy"
    }
fi

# If no policy exists, create default
if [ ! -f "$POLICY_FILE" ]; then
    log "Creating default policy file"
    cat > "$POLICY_FILE" << 'EOF'
{
  "id": "default",
  "version": "1.0.0",
  "organization": "Solo Practice",
  "effective_date": "2026-01-01T00:00:00Z",
  "expires_at": null,
  "signed_by": "system",
  "signature": "",
  "export_policy": {
    "cloud_sync": "Warn",
    "network_share": "Warn",
    "removable_media": "Warn",
    "unknown_destination": "Warn",
    "audit_pack_required_above": 10,
    "allowed_formats": ["pdf", "docx", "json"],
    "blocked_paths": []
  },
  "attestation_policy": {
    "required_attestations": [
      "safety-si-direct",
      "safety-si-plan",
      "safety-hi-direct",
      "safety-hi-threat",
      "safety-abuse-child",
      "safety-abuse-elder",
      "safety-duty-warn"
    ],
    "recommended_attestations": [
      "safety-si-euphemism",
      "safety-si-passive",
      "doc-capacity-concern"
    ],
    "supervisor_review_required": null,
    "attestation_timeout": 0,
    "allow_not_relevant": true,
    "require_explanation_for_not_relevant": true
  },
  "recording_policy": {
    "consent_required": true,
    "auto_delete_audio_after_signing": true,
    "max_audio_retention_days": 0,
    "reconsent_each_session": false,
    "jurisdiction_rules": {}
  },
  "supervision_policy": {
    "cosign_required_for": [],
    "max_review_delay_hours": 72,
    "review_high_risk_notes": false,
    "competency_tracking_enabled": false
  },
  "retention_policy": {
    "note_retention_days": 0,
    "audit_log_retention_days": 2555,
    "auto_archive_after_days": 0,
    "require_destruction_certificate": false
  },
  "custom_rules": {}
}
EOF
    log "Default policy created"
fi

# ============================================
# Check/Install Ollama
# ============================================

check_ollama() {
    if command -v ollama &> /dev/null; then
        log "Ollama is installed"
        
        # Check if running
        if pgrep -x "ollama" > /dev/null; then
            log "Ollama is running"
            
            # Check for models
            MODELS=$(ollama list 2>/dev/null | tail -n +2 | wc -l | tr -d ' ')
            log "Ollama has $MODELS model(s) installed"
            
            if [ "$MODELS" -eq 0 ]; then
                log "Pulling llama3.2 model..."
                ollama pull llama3.2 &
                log "Model pull started in background"
            fi
        else
            log "Ollama installed but not running. Starting..."
            open -a "Ollama"
            sleep 3
        fi
        return 0
    else
        log "Ollama not installed"
        return 1
    fi
}

if ! check_ollama; then
    log "Ollama not found. Evidify AI features will be unavailable until installed."
    log "Install from: $OLLAMA_URL"
    
    # Optionally auto-install (uncomment if desired)
    # log "Downloading Ollama..."
    # curl -fsSL https://ollama.ai/install.sh | sh
fi

# ============================================
# Check Whisper
# ============================================

check_whisper() {
    # Check for whisper-cpp in common locations
    WHISPER_PATHS=(
        "/usr/local/bin/whisper-cpp"
        "/opt/homebrew/bin/whisper-cpp"
        "$HOME/.local/bin/whisper-cpp"
    )
    
    for path in "${WHISPER_PATHS[@]}"; do
        if [ -x "$path" ]; then
            log "whisper-cpp found at $path"
            return 0
        fi
    done
    
    log "whisper-cpp not found. Voice Scribe will be unavailable."
    return 1
}

check_whisper

# ============================================
# Set Permissions
# ============================================

# Ensure support directory is writable
chmod 755 "$EVIDIFY_SUPPORT"

# Remove quarantine if present
xattr -dr com.apple.quarantine "$EVIDIFY_APP" 2>/dev/null || true
log "Quarantine attribute removed"

# ============================================
# Create Launch Agent (optional auto-start)
# ============================================

# Uncomment to enable auto-start on login
# LAUNCH_AGENT="$HOME/Library/LaunchAgents/ai.evidify.plist"
# if [ ! -f "$LAUNCH_AGENT" ]; then
#     cat > "$LAUNCH_AGENT" << EOF
# <?xml version="1.0" encoding="UTF-8"?>
# <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
# <plist version="1.0">
# <dict>
#     <key>Label</key>
#     <string>ai.evidify</string>
#     <key>ProgramArguments</key>
#     <array>
#         <string>/Applications/Evidify.app/Contents/MacOS/Evidify</string>
#     </array>
#     <key>RunAtLoad</key>
#     <true/>
# </dict>
# </plist>
# EOF
#     launchctl load "$LAUNCH_AGENT"
#     log "Launch agent created"
# fi

# ============================================
# Cleanup
# ============================================

log "Post-install completed successfully"
log "Evidify is ready to use"

exit 0

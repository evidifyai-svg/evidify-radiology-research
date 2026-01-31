#!/usr/bin/env bash
#
# make-demo-pack.sh - Build "Brown-ready" demo pack for non-technical users
#
# Creates a self-contained ZIP that runs without file:// CORS errors
# Includes: one-click launcher, validation tooling, guided demo script
#
# Usage:
#   bash scripts/make-demo-pack.sh
#
# Output:
#   dist/evidify_demo_pack_<YYYY-MM-DD>.zip
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATE_STAMP=$(date +%Y-%m-%d)
STAGING_DIR="/tmp/evidify_demo_pack"
OUTPUT_DIR="$REPO_ROOT/dist"
OUTPUT_FILE="$OUTPUT_DIR/evidify_demo_pack_${DATE_STAMP}.zip"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================================
# STEP 1: Build frontend
# ============================================================================
log_info "Building frontend..."
cd "$REPO_ROOT"

if ! npm -C frontend ci; then
    log_error "npm ci failed"
    exit 1
fi

if ! npm -C frontend run build; then
    log_error "npm run build failed"
    exit 1
fi

log_success "Frontend build complete"

# ============================================================================
# STEP 2: Run verifier on test fixture
# ============================================================================
log_info "Running radiology verifier on test fixture..."
VERIFIER_PATH="$REPO_ROOT/tools/radiology-verifier/verify-radiology.cjs"
FIXTURE_PATH="$REPO_ROOT/tools/radiology-verifier/fixtures/pack-valid-mini"

if ! node "$VERIFIER_PATH" "$FIXTURE_PATH"; then
    log_error "Verifier check failed on pack-valid-mini fixture"
    exit 1
fi

log_success "Verifier passed on test fixture"

# ============================================================================
# STEP 3: Clean and create staging directory
# ============================================================================
log_info "Preparing staging directory..."
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# ============================================================================
# STEP 4: Stage app files
# ============================================================================
log_info "Staging app files..."
mkdir -p "$STAGING_DIR/app"
cp -r "$REPO_ROOT/frontend/dist/"* "$STAGING_DIR/app/"

# ============================================================================
# STEP 5: Stage radiology verifier
# ============================================================================
log_info "Staging radiology verifier..."
mkdir -p "$STAGING_DIR/tools/radiology-verifier"
cp -r "$REPO_ROOT/tools/radiology-verifier/"* "$STAGING_DIR/tools/radiology-verifier/"

# ============================================================================
# STEP 6: Create server.mjs
# ============================================================================
log_info "Creating server.mjs..."
cat > "$STAGING_DIR/server.mjs" << 'SERVEREOF'
/**
 * Evidify Demo Server
 *
 * Simple HTTP server for running the Evidify demo locally.
 * Avoids file:// CORS issues that break modern web apps.
 *
 * Usage:
 *   node server.mjs [port]
 *   Default port: 5173
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.argv[2] || '5173', 10);
const APP_DIR = path.join(__dirname, 'app');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  const mimeType = getMimeType(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // Default to research-demo.html for root
  if (urlPath === '/' || urlPath === '') {
    urlPath = '/research-demo.html';
  }

  // Try exact path first
  let filePath = path.join(APP_DIR, urlPath);

  // If path doesn't exist and doesn't have extension, try .html
  if (!fs.existsSync(filePath) && !path.extname(urlPath)) {
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    }
  }

  // Security: prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(APP_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    // For SPA routing, fallback to research-demo.html
    if (!path.extname(urlPath)) {
      serveFile(res, path.join(APP_DIR, 'research-demo.html'));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  // Serve directory index
  if (fs.statSync(resolvedPath).isDirectory()) {
    serveFile(res, path.join(resolvedPath, 'index.html'));
    return;
  }

  serveFile(res, resolvedPath);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('  EVIDIFY RADIOLOGY RESEARCH DEMO');
  console.log('='.repeat(60));
  console.log('');
  console.log(`  Server running at: http://127.0.0.1:${PORT}`);
  console.log('');
  console.log('  Quick Links:');
  console.log(`    - Research Demo:  http://127.0.0.1:${PORT}/research-demo.html`);
  console.log(`    - Vault App:      http://127.0.0.1:${PORT}/vault.html`);
  console.log('');
  console.log('  Press Ctrl+C to stop the server');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
SERVEREOF

log_success "Created server.mjs"

# ============================================================================
# STEP 7: Create RUN_DEMO.command (Mac)
# ============================================================================
log_info "Creating RUN_DEMO.command..."
cat > "$STAGING_DIR/RUN_DEMO.command" << 'MACEOF'
#!/bin/bash
#
# Evidify Demo Launcher (macOS)
# Double-click this file to start the demo
#

cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "  EVIDIFY RADIOLOGY RESEARCH DEMO"
echo "========================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo ""
    echo "Please install Node.js from: https://nodejs.org/"
    echo "Download the LTS version and run the installer."
    echo ""
    echo "Press Enter to close..."
    read
    exit 1
fi

NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"
echo ""

# Start server
echo "Starting demo server..."
echo ""
echo "The demo will open in your browser automatically."
echo "If it doesn't, open this URL manually:"
echo ""
echo "  http://127.0.0.1:5173/research-demo.html"
echo ""
echo "Press Ctrl+C to stop the server when done."
echo ""
echo "========================================"
echo ""

# Open browser after brief delay
(sleep 2 && open "http://127.0.0.1:5173/research-demo.html") &

# Run server
node server.mjs

MACEOF
chmod +x "$STAGING_DIR/RUN_DEMO.command"

log_success "Created RUN_DEMO.command"

# ============================================================================
# STEP 8: Create RUN_DEMO.bat (Windows)
# ============================================================================
log_info "Creating RUN_DEMO.bat..."
cat > "$STAGING_DIR/RUN_DEMO.bat" << 'WINEOF'
@echo off
REM Evidify Demo Launcher (Windows)
REM Double-click this file to start the demo

cd /d "%~dp0"

echo.
echo ========================================
echo   EVIDIFY RADIOLOGY RESEARCH DEMO
echo ========================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed.
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Download the LTS version and run the installer.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%
echo.

echo Starting demo server...
echo.
echo The demo will open in your browser automatically.
echo If it doesn't, open this URL manually:
echo.
echo   http://127.0.0.1:5173/research-demo.html
echo.
echo Close this window to stop the server when done.
echo.
echo ========================================
echo.

REM Open browser after brief delay
start "" timeout /t 2 /nobreak >nul && start "" "http://127.0.0.1:5173/research-demo.html"

REM Alternative: just start the browser
start "" "http://127.0.0.1:5173/research-demo.html"

REM Run server
node server.mjs

pause
WINEOF

log_success "Created RUN_DEMO.bat"

# ============================================================================
# STEP 9: Create README_START_HERE.txt
# ============================================================================
log_info "Creating README_START_HERE.txt..."
cat > "$STAGING_DIR/README_START_HERE.txt" << 'READMEEOF'
================================================================================
  EVIDIFY RADIOLOGY RESEARCH DEMO - QUICK START GUIDE
================================================================================

Thank you for reviewing the Evidify Radiology Research platform!

IMPORTANT WARNING
-----------------
DO NOT open the HTML files directly by double-clicking them!

Modern web applications cannot run from file:// URLs due to browser security
restrictions (CORS policy). The demo MUST be served via HTTP.

This package includes a simple one-click launcher that handles this for you.


STEP 1: INSTALL NODE.JS (if you don't have it)
----------------------------------------------
1. Go to https://nodejs.org/
2. Download the LTS version (recommended for most users)
3. Run the installer with default settings
4. Restart your computer if prompted


STEP 2: START THE DEMO
----------------------

For macOS:
  Double-click: RUN_DEMO.command

For Windows:
  Double-click: RUN_DEMO.bat

The demo will automatically open in your default web browser.
If it doesn't open automatically, navigate to:

  http://127.0.0.1:5173/research-demo.html


STEP 3: FOLLOW THE DEMO SCRIPT
------------------------------
See DEMO_SCRIPT_10_MINUTES.txt for a guided walkthrough of all features.
See FEATURE_CHECKLIST.md for a complete feature inventory with checkboxes.


STOPPING THE SERVER
-------------------
To stop the demo server:
  - macOS: Press Ctrl+C in the terminal window
  - Windows: Close the command prompt window


VERIFYING EXPORT PACKS
----------------------
The tools/radiology-verifier directory contains the verification tool.
To verify an export pack:

  node tools/radiology-verifier/verify-radiology.cjs <path-to-export>


TROUBLESHOOTING
---------------
1. "Node.js not found" error
   -> Install Node.js from https://nodejs.org/

2. Browser shows blank page
   -> Make sure you're using http://127.0.0.1:5173/, NOT file://

3. Port 5173 already in use
   -> Close other development servers or use: node server.mjs 5174

4. Demo runs slowly
   -> Close unnecessary browser tabs/applications


SUPPORT
-------
For technical support, please contact the Evidify team.


================================================================================
  Generated: ${DATE_STAMP}
================================================================================
READMEEOF

log_success "Created README_START_HERE.txt"

# ============================================================================
# STEP 10: Create DEMO_SCRIPT_10_MINUTES.txt
# ============================================================================
log_info "Creating DEMO_SCRIPT_10_MINUTES.txt..."
cat > "$STAGING_DIR/DEMO_SCRIPT_10_MINUTES.txt" << 'DEMOEOF'
================================================================================
  EVIDIFY RADIOLOGY RESEARCH DEMO - 10-MINUTE GUIDED SCRIPT
================================================================================

This script guides you through all key features of the Evidify platform.
Estimated time: 10 minutes


BEFORE YOU BEGIN
----------------
1. Start the demo using RUN_DEMO.command (Mac) or RUN_DEMO.bat (Windows)
2. Open http://127.0.0.1:5173/research-demo.html in your browser
3. Have this script open alongside your browser


================================================================================
PART 1: STUDY SETUP (2 minutes)
================================================================================

[ ] 1.1 OBSERVE THE STUDY CONTROL PANEL (top-left)
    - Note the PROTOCOL: BRPLL-MAMMO-v1.0
    - Note the CONDITION assignment (HUMAN_FIRST, AI_FIRST, or CONCURRENT)
    - Note the RANDOMIZATION SEED (cryptographic session ID)
    - Note the CASE QUEUE showing the reading order

[ ] 1.2 TOGGLE THE VIEW MODE
    - Find the "Researcher Mode" toggle
    - Toggle ON to see additional panels
    - Toggle "Advanced Panels" ON for full visibility

[ ] 1.3 CHECK THE STUDY CONFIGURATION
    - Find the Study Configuration panel (in Researcher Mode)
    - Note disclosure condition, randomization details
    - Note comprehension check status

[ ] 1.4 NOTE THE COUNTERBALANCING
    - Latin Square 4x4 design
    - ARM assignment based on session seed
    - Case order (A->B->C->D or D->C->B->A)


================================================================================
PART 2: READING A CASE (3 minutes)
================================================================================

[ ] 2.1 CALIBRATION CASE
    - Complete the initial calibration case
    - This establishes your baseline reading time
    - Note: No AI is shown for calibration

[ ] 2.2 EXAMINE THE MAMMOGRAM VIEWER
    - View the dual-view mammogram display
    - Try ZOOM controls (mouse wheel or buttons)
    - Try PAN controls (click and drag)
    - Note the view density (L-CC, L-MLO, R-CC, R-MLO)

[ ] 2.3 LOCK FIRST IMPRESSION
    - Select your initial BI-RADS assessment (1-5)
    - Click "Lock Assessment"
    - Note: This is IMMUTABLE once locked

[ ] 2.4 AI REVELATION
    - Observe the AI suggestion appear
    - Note the FDR/FOR disclosure (4% / 12%)
    - This is the "error rate transparency" feature

[ ] 2.5 FINAL ASSESSMENT
    - Confirm or change your assessment
    - If changed: provide deviation rationale
    - Complete the case


================================================================================
PART 3: "HOLY SHIT" FEATURES - RESEARCHER PANELS (3 minutes)
================================================================================

Enable Researcher Mode + Advanced Panels to see all of these.

[ ] 3.1 VALIDITY & RESPONSE STYLE PANEL (for Grayson - Psychometrician)
    - Find the panel with MMPI-inspired indicators:
      * HRI: Hasty Review Index (pre-AI time vs session median)
      * CPI: Conformity Pattern Index (AI agreement rate)
      * DAI: Documentation Avoidance Index
      * ENG: Engagement Index
    - Note the traffic-light color coding (green/yellow/red)
    - Read the auto-generated Interpretive Summary

[ ] 3.2 LIABILITY RISK CLASSIFICATION (for Brian - Tort Attorney)
    - Find the Liability Posture panel
    - Note the Baird 22-condition framework classification:
      * LOW / MODERATE / HIGH / CRITICAL
    - View Cross-Examination Vulnerability Analysis:
      * Attack vectors (rushed review, AI deference)
      * Defensive strengths (independent read, hash chain)
    - Observe Hash Chain Visualization (4-block linked diagram)

[ ] 3.3 "WATCHING THE WATCHER" METRICS (for Mike Bruno - Radiologist)
    - Find the Reader Behavior Metrics panel
    - View time context display:
      * Pre-AI reading time
      * Session median comparison
      * Percentage metrics
    - Note interaction counts (zooms, pans, density)
    - Look for Eye Tracking Ready badge
    - Read the Error Context Note (Wolf 3-4% miss rate)

[ ] 3.4 EXPORT PREVIEW PANEL (for Mike Bernstein - Experimentalist)
    - Find the Export Preview panel
    - Note metrics count, event count
    - Note verification status (chain integrity)


================================================================================
PART 4: EXPORT & VERIFICATION (2 minutes)
================================================================================

[ ] 4.1 COMPLETE A FULL SESSION
    - Read through all queued cases
    - Or use demo controls to skip ahead

[ ] 4.2 GENERATE EXPORT PACK
    - Click "Export Study Data"
    - Note the export includes:
      * events.jsonl (timestamped event log)
      * derived_metrics.csv (computed metrics)
      * ledger.json (hash-chained audit trail)
      * export_manifest.json (integrity metadata)

[ ] 4.3 VIEW EXPORT PACKET
    - Toggle the Packet Viewer panel
    - Browse the generated files
    - Note the hash chain verification status

[ ] 4.4 VERIFY WITH EXTERNAL TOOL
    - Save the export ZIP
    - Run: node tools/radiology-verifier/verify-radiology.cjs <export-path>
    - Confirm PASS status


================================================================================
FEATURE SUMMARY CHECKLIST
================================================================================

Core Research Features:
[ ] Randomized condition assignment
[ ] Case queue with counterbalancing
[ ] Dual-view mammogram display
[ ] First impression lock (immutable)
[ ] AI revelation with FDR/FOR disclosure
[ ] Deviation documentation requirement
[ ] Comprehension checks
[ ] Hash-chained event logging

Advanced Panels ("Holy Shit" Features):
[ ] Validity & Response Style (HRI/CPI/DAI/ENG)
[ ] Liability Risk Classification (Baird 22-condition)
[ ] Cross-Examination Vulnerability Analysis
[ ] Hash Chain Visualization
[ ] Reader Behavior Metrics
[ ] Eye Tracking Ready indicator
[ ] Study Configuration panel
[ ] Export Preview panel

Export & Verification:
[ ] events.jsonl with SHA-256 chain
[ ] derived_metrics.csv (computed by export)
[ ] ledger.json with integrity proofs
[ ] External verifier tool
[ ] Analytics replay verification


================================================================================
  END OF DEMO SCRIPT

  For complete feature documentation, see FEATURE_CHECKLIST.md
================================================================================
DEMOEOF

log_success "Created DEMO_SCRIPT_10_MINUTES.txt"

# ============================================================================
# STEP 11: Create FEATURE_CHECKLIST.md
# ============================================================================
log_info "Creating FEATURE_CHECKLIST.md..."
cat > "$STAGING_DIR/FEATURE_CHECKLIST.md" << 'FEATUREEOF'
# Evidify Radiology Research - Feature Checklist

Complete inventory of platform capabilities with verification checkboxes.

---

## Core Study Infrastructure

### Session Management
- [ ] **Cryptographic Session ID** - Unique identifier for each study session
- [ ] **Randomization Seed** - Reproducible condition assignment
- [ ] **Protocol Version** - BRPLL-MAMMO-v1.0 tracking

### Condition Assignment
- [ ] **HUMAN_FIRST** - Reader makes independent assessment before AI
- [ ] **AI_FIRST** - AI suggestion shown before reader assessment
- [ ] **CONCURRENT** - AI and reader assess simultaneously
- [ ] **Seeded Random Assignment** - Deterministic based on seed
- [ ] **Manual Override** - For demonstration purposes

### Case Queue Management
- [ ] **Latin Square 4x4 Design** - Counterbalanced case order
- [ ] **Calibration Cases** - Baseline establishment
- [ ] **Sequential Reading Requirement** - No skipping for validity
- [ ] **Progress Tracking** - Visual case queue indicator

---

## Mammogram Viewer

### Display Features
- [ ] **Dual-View Display** - Side-by-side mammogram views
- [ ] **View Labels** - L-CC, L-MLO, R-CC, R-MLO
- [ ] **High-Resolution Rendering** - Clinical-quality display

### Interaction Controls
- [ ] **Zoom** - Mouse wheel and button controls
- [ ] **Pan** - Click-and-drag navigation
- [ ] **Window/Level Adjustment** - Brightness/contrast (if available)
- [ ] **Interaction Logging** - All actions timestamped

---

## Assessment Workflow

### First Impression Lock
- [ ] **BI-RADS Selection** - Categories 1-5
- [ ] **Confidence Rating** - Slider 0-100%
- [ ] **Immutable Lock** - Cannot be changed after submission
- [ ] **Timestamp Recording** - Precise timing capture

### AI Revelation
- [ ] **AI BI-RADS Suggestion** - Model recommendation
- [ ] **AI Confidence Display** - Model certainty level
- [ ] **FDR/FOR Disclosure** - Error rate transparency
- [ ] **Disclosure Comprehension Check** - Understanding verification

### Final Assessment
- [ ] **Confirm or Change** - Reader's final decision
- [ ] **Deviation Detection** - Automatic comparison
- [ ] **Rationale Requirement** - Mandatory for changes
- [ ] **Post-Decision Trust Rating** - Actual reliance measure

---

## Validity & Response Style Panel (Grayson - Psychometrician)

### MMPI-Inspired Validity Indicators
- [ ] **HRI - Hasty Review Index** - Pre-AI time vs session median
- [ ] **CPI - Conformity Pattern Index** - AI agreement rate tracking
- [ ] **DAI - Documentation Avoidance Index** - Override documentation rate
- [ ] **ENG - Engagement Index** - Viewer interactions + time

### Traffic Light Display
- [ ] **Green** - Acceptable range
- [ ] **Yellow** - Borderline/warning
- [ ] **Red** - Concern threshold exceeded

### Interpretive Summary
- [ ] **Auto-Generated Text** - Clinical language summary
- [ ] **Per-Indicator Details** - Specific explanations
- [ ] **Overall Profile** - Aggregate validity assessment

---

## Liability Risk Classification (Brian - Tort Attorney)

### Baird 22-Condition Framework
- [ ] **LOW Risk** - Minimal liability exposure
- [ ] **MODERATE Risk** - Some concern areas
- [ ] **HIGH Risk** - Significant exposure
- [ ] **CRITICAL Risk** - Major liability concern

### Case-by-Case Breakdown
- [ ] **Individual Risk Factors** - Per-case analysis
- [ ] **Logic Display** - Reasoning for classification
- [ ] **Aggregate Summary** - Session-level risk

### Cross-Examination Vulnerability Analysis
- [ ] **Attack Vectors** - Potential weaknesses
  - [ ] Rushed review patterns
  - [ ] AI deference/anchoring
  - [ ] Documentation gaps
- [ ] **Defensive Strengths** - Protective factors
  - [ ] Independent first read
  - [ ] Hash chain integrity
  - [ ] Comprehension verification

### Hash Chain Visualization
- [ ] **4-Block Linked Diagram** - Visual chain representation
- [ ] **Block Details** - Hash values, timestamps
- [ ] **Chain Integrity Status** - PASS/FAIL indicator

---

## Reader Behavior Metrics (Mike Bruno - Radiologist)

### Time Context Display
- [ ] **Pre-AI Reading Time** - Milliseconds
- [ ] **Session Median** - Comparison baseline
- [ ] **Percentage Comparison** - vs median

### Interaction Metrics
- [ ] **Zoom Count** - Number of zoom actions
- [ ] **Pan Count** - Number of pan actions
- [ ] **ROI Dwell Times** - Time per region (if eye tracking)
- [ ] **Total Interaction Density** - Composite score

### Session Summary Statistics
- [ ] **Cases Completed** - Count
- [ ] **Average Read Time** - Across session
- [ ] **Deviation Rate** - Changes after AI

### Annotations
- [ ] **Eye Tracking Ready Badge** - Integration status
- [ ] **Error Context Note** - Wolf et al. 3-4% miss rate reference

---

## Study Configuration Panel (Mike Bernstein - Experimentalist)

### Configuration Display
- [ ] **Disclosure Condition** - Current assignment
- [ ] **Randomization Seed** - Session identifier
- [ ] **Case Order** - Queue sequence
- [ ] **Comprehension Check Status** - Enabled/disabled

### Mode Controls
- [ ] **Intervention Mode Toggle** - Show/hide participant text
- [ ] **Disclosure Policy** - STATIC vs ADAPTIVE
- [ ] **Case Difficulty Display** - EASY/MEDIUM/HARD (adaptive mode)

### Export Preview Panel
- [ ] **Metrics Count** - Number of derived metrics
- [ ] **Events Count** - Total logged events
- [ ] **Verification Status** - Chain integrity check
- [ ] **Export Size Estimate** - Approximate file sizes

---

## Export & Verification System

### Export Files
- [ ] **events.jsonl** - Newline-delimited JSON event log
- [ ] **derived_metrics.csv** - Computed trial metrics
- [ ] **ledger.json** - Hash-chained audit trail
- [ ] **export_manifest.json** - Integrity metadata

### Hash Chain Integrity
- [ ] **SHA-256 Algorithm** - Cryptographic hashing
- [ ] **Previous Hash Linking** - Chain structure
- [ ] **Content Hash** - Per-event integrity
- [ ] **Chain Hash** - Computed verification

### Verification Tool
- [ ] **File Presence Check** - Required files exist
- [ ] **Manifest Integrity** - Size and hash validation
- [ ] **Ledger Chain Verification** - Link integrity
- [ ] **Analytics Replay** - Derived metrics match events
- [ ] **JSON and Human Output** - Dual format support

---

## UI Convenience Features

### Demo Helpers
- [ ] **Copy Demo URL Button** - Quick sharing
- [ ] **Demo Script Panel** - Interactive checklist
- [ ] **Researcher Mode Toggle** - Show/hide advanced panels
- [ ] **Advanced Panels Toggle** - Full feature access

### Accessibility
- [ ] **Keyboard Navigation** - Tab support
- [ ] **High Contrast** - Dark theme
- [ ] **Responsive Layout** - Multiple screen sizes

---

## Verification Commands

```bash
# Verify an export pack
node tools/radiology-verifier/verify-radiology.cjs <export-directory>

# Verify with JSON output
node tools/radiology-verifier/verify-radiology.cjs <export-directory> --json
```

---

*Generated for Evidify Radiology Research Platform*
*Version: 4.3.0-beta*
FEATUREEOF

log_success "Created FEATURE_CHECKLIST.md"

# ============================================================================
# STEP 12: Create output directory and ZIP
# ============================================================================
log_info "Creating ZIP archive..."
mkdir -p "$OUTPUT_DIR"

# Remove old zip if exists
rm -f "$OUTPUT_FILE"

# Create zip from staging directory
cd "$STAGING_DIR"
zip -r "$OUTPUT_FILE" . -x "*.DS_Store" -x "__MACOSX/*"

# ============================================================================
# STEP 13: Summary
# ============================================================================
echo ""
echo "========================================"
log_success "Demo pack created successfully!"
echo "========================================"
echo ""
echo "Output: $OUTPUT_FILE"
echo ""
echo "Size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "Contents:"
echo "  - app/               (built frontend)"
echo "  - tools/             (radiology-verifier)"
echo "  - server.mjs         (HTTP server)"
echo "  - RUN_DEMO.command   (Mac launcher)"
echo "  - RUN_DEMO.bat       (Windows launcher)"
echo "  - README_START_HERE.txt"
echo "  - DEMO_SCRIPT_10_MINUTES.txt"
echo "  - FEATURE_CHECKLIST.md"
echo ""
echo "To test locally:"
echo "  cd /tmp/evidify_demo_pack && node server.mjs"
echo ""

# Clean up staging directory (optional, leave for debugging)
# rm -rf "$STAGING_DIR"

exit 0

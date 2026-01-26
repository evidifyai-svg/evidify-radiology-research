# check_csp_release.ps1 - Verify production CSP doesn't contain dev allowances
#
# Usage: .\scripts\check_csp_release.ps1 [-ConfigFile path\to\tauri.conf.json]
#
# Returns exit code 0 if CSP is safe for production
# Returns exit code 1 if CSP contains forbidden dev tokens

param(
    [string]$ConfigFile = "src-tauri\tauri.conf.json"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ConfigFile)) {
    Write-Host "❌ Config file not found: $ConfigFile" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Checking CSP in: $ConfigFile" -ForegroundColor Cyan

# Read and parse JSON
$config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
$csp = $config.tauri.security.csp

if (-not $csp) {
    Write-Host "❌ No CSP found in config" -ForegroundColor Red
    exit 1
}

# Forbidden patterns in production CSP
$forbiddenPatterns = @(
    "ws://localhost",
    "wss://localhost",
    "ws://",
    "wss://",
    "http://localhost",
    "https://localhost",
    "127.0.0.1:\*",
    "'unsafe-eval'"
)

$foundIssues = 0

foreach ($pattern in $forbiddenPatterns) {
    if ($csp -match [regex]::Escape($pattern)) {
        Write-Host "❌ Found forbidden pattern: $pattern" -ForegroundColor Red
        $foundIssues++
    }
}

# Allowed: http://127.0.0.1:11434 (Ollama specific port only)
if ($csp -match "127.0.0.1:11434") {
    Write-Host "✅ Ollama loopback (127.0.0.1:11434) - OK" -ForegroundColor Green
}

if ($foundIssues -gt 0) {
    Write-Host ""
    Write-Host "❌ CSP CHECK FAILED: Found $foundIssues forbidden pattern(s)" -ForegroundColor Red
    Write-Host ""
    Write-Host "This configuration is NOT safe for production release." -ForegroundColor Yellow
    Write-Host "Dev allowances (ws://, localhost wildcards) should only be in tauri.conf.dev.json" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host ""
    Write-Host "✅ CSP CHECK PASSED: No forbidden patterns found" -ForegroundColor Green
    Write-Host "This configuration is safe for production release." -ForegroundColor Green
    exit 0
}

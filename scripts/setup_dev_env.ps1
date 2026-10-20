<#
.SYNOPSIS
    Automated environment initialization script for Windows (PowerShell).
.DESCRIPTION
    Checks Python and Node.js prerequisites, creates virtual environments,
    and installs requirements for backend and ML modules.
#>

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " PhishGuard AI - Development Environment Setup (Windows)  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Python
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "[ERROR] Python is not installed or not in your PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}
$pyVersion = python --version
Write-Host "[OK] Detected: $pyVersion" -ForegroundColor Green

# 2. Check Node
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[WARNING] Node.js not detected. Dashboard setup will be skipped." -ForegroundColor Yellow
} else {
    $nodeVersion = node --version
    Write-Host "[OK] Detected Node.js: $nodeVersion" -ForegroundColor Green
}

# 3. Setup .env from .env.example if missing
if (-not (Test-Path ".env")) {
    Write-Host "[INFO] Creating .env from .env.example..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env"
    Write-Host "[OK] Created .env" -ForegroundColor Green
}

# 4. Backend venv
Write-Host "`n[INFO] Setting up Backend virtual environment..." -ForegroundColor Cyan
Set-Location -Path "backend"
if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "[OK] Created backend/venv" -ForegroundColor Green
}
& ".\venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\venv\Scripts\pip.exe" install -r requirements.txt
Set-Location -Path ".."

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Setup complete! See README.md for next steps.             " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

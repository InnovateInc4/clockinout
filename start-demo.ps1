$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$realDump = Join-Path $repoRoot 'database\real_municipal_db.sql'
$useRealDatabase = Test-Path $realDump

Write-Host ''
if ($useRealDatabase) {
    Write-Host 'MCMS - Real Project Database' -ForegroundColor Cyan
    Write-Host '----------------------------'
} else {
    Write-Host 'MCMS Portable Demo' -ForegroundColor Cyan
    Write-Host '------------------'
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host 'Docker Desktop is not installed or Docker is not on PATH.' -ForegroundColor Red
    Write-Host 'Install Docker Desktop once, then run this file again.' -ForegroundColor Yellow
    Read-Host 'Press Enter to close'
    exit 1
}

try {
    docker info *> $null
} catch {
    Write-Host 'Docker Desktop is installed but is not currently running.' -ForegroundColor Red
    Write-Host 'Start Docker Desktop, wait until it says Docker is running, then try again.' -ForegroundColor Yellow
    Read-Host 'Press Enter to close'
    exit 1
}

if ($useRealDatabase) {
    Write-Host 'Real database dump found: database\real_municipal_db.sql' -ForegroundColor Green
    Write-Host 'Starting MySQL, backend and frontend with the REAL project data...' -ForegroundColor Cyan

    # Stop the older demo stack if it was previously running from this folder.
    try { docker compose down --remove-orphans *> $null } catch { }

    docker compose -f docker-compose.real.yml up --build -d
} else {
    Write-Host 'No real database dump is currently bundled, so the synthetic demo database will be used.' -ForegroundColor Yellow
    Write-Host 'Starting MySQL, backend and frontend...' -ForegroundColor Cyan
    docker compose up --build -d
}

if ($LASTEXITCODE -ne 0) {
    Write-Host 'The Docker stack could not be started.' -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}

Write-Host 'Waiting for the website to become ready...' -ForegroundColor Cyan
$ready = $false

for ($i = 0; $i -lt 60; $i++) {
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    Write-Host 'The containers started, but the website did not become ready in time.' -ForegroundColor Yellow
    if ($useRealDatabase) {
        Write-Host 'Run: docker compose -f docker-compose.real.yml logs' -ForegroundColor Yellow
    } else {
        Write-Host 'Run: docker compose logs' -ForegroundColor Yellow
    }
    Read-Host 'Press Enter to close'
    exit 1
}

Write-Host ''
Write-Host 'MCMS is ready.' -ForegroundColor Green
Write-Host 'Website: http://localhost:3000'
Write-Host ''

if ($useRealDatabase) {
    Write-Host 'REAL DATABASE MODE is active.' -ForegroundColor Green
    Write-Host 'Use the same application login accounts/passwords that existed in the exported municipal_db database.' -ForegroundColor Cyan
    Write-Host 'No SQL import, local MySQL setup, .env setup or npm install is required.' -ForegroundColor Green
} else {
    Write-Host 'Demo login accounts:' -ForegroundColor Cyan
    Write-Host 'Admin:      admin.demo@ncpg.gov.za'
    Write-Host 'Manager:    manager.demo@ncpg.gov.za'
    Write-Host 'Supervisor: supervisor.demo@ncpg.gov.za'
    Write-Host 'HR Admin:   hr.demo@ncpg.gov.za'
    Write-Host 'Finance:    finance.demo@ncpg.gov.za'
    Write-Host 'Worker:     worker.demo@ncpg.gov.za'
    Write-Host 'Password for all demo accounts: Demo1234!'
    Write-Host ''
    Write-Host 'No MySQL import, .env setup or npm install is required for this demo.' -ForegroundColor Green
}

Write-Host ''
Start-Process 'http://localhost:3000'
Read-Host 'Press Enter to close this launcher (the containers will keep running)'

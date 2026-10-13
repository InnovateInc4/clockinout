$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host 'MCMS Portable Demo' -ForegroundColor Cyan
Write-Host '------------------'

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

Write-Host 'Starting MySQL, backend and frontend...' -ForegroundColor Cyan
docker compose up --build -d

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
    Write-Host 'Run: docker compose logs' -ForegroundColor Yellow
    Read-Host 'Press Enter to close'
    exit 1
}

Write-Host ''
Write-Host 'MCMS is ready.' -ForegroundColor Green
Write-Host 'Website: http://localhost:3000'
Write-Host ''
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
Write-Host ''

Start-Process 'http://localhost:3000'
Read-Host 'Press Enter to close this launcher (the containers will keep running)'

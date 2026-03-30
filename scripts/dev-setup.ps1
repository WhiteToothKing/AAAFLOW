# AAAFLOW: Python venv, npm deps, Docker Postgres/Redis, Alembic migrations.
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts\dev-setup.ps1
$ErrorActionPreference = "Stop"
$RepoRoot = (Get-Item $PSScriptRoot).Parent.FullName

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [System.Environment]::GetEnvironmentVariable("Path", "User")

Write-Host "==> Repo: $RepoRoot"

Push-Location $RepoRoot

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python not found. Install with: winget install Python.Python.3.12"
}

# Backend venv + pip
$Backend = Join-Path $RepoRoot "backend"
Push-Location $Backend
if (-not (Test-Path "venv\Scripts\python.exe")) {
    python -m venv venv
}
& .\venv\Scripts\python.exe -m pip install --upgrade pip
& .\venv\Scripts\pip.exe install -r requirements.txt
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created backend\.env from .env.example (add API keys)."
}
Pop-Location

# Frontend npm
$Frontend = Join-Path $RepoRoot "frontend"
Push-Location $Frontend
if (Test-Path "package-lock.json") { npm ci } else { npm install }
Pop-Location

# Docker Postgres + Redis
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Warning "Docker not in PATH. Install Docker Desktop, start it, then re-run this script."
} else {
    docker compose -f (Join-Path $RepoRoot "docker-compose.yml") up -d postgres redis
    $ready = $false
    1..36 | ForEach-Object {
        try {
            docker info 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        } catch { }
        Start-Sleep -Seconds 5
    }
    if (-not $ready) {
        Write-Warning "Docker daemon not ready; start Docker Desktop and run: cd backend; .\venv\Scripts\alembic.exe upgrade head"
    } else {
        Start-Sleep -Seconds 8
    }
}

# Migrations (requires Postgres on localhost:5432, e.g. docker compose postgres)
Push-Location $Backend
& .\venv\Scripts\alembic.exe upgrade head
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Alembic exited $LASTEXITCODE. When Postgres is ready: cd backend; .\venv\Scripts\alembic.exe upgrade head"
    exit $LASTEXITCODE
}
Pop-Location

Pop-Location
Write-Host "==> Done. Backend: cd backend; .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
Write-Host "==> Frontend: cd frontend; npm run dev"

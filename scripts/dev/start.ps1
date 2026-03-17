Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location (Resolve-Path "$PSScriptRoot\..\..")
try {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; ..\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
  Start-Sleep -Seconds 2
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; pnpm dev"
} finally {
  Pop-Location
}

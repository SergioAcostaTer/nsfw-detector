Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location (Resolve-Path "$PSScriptRoot\..\..")
try {
  if (-not (Test-Path "venv\Scripts\python.exe")) {
    py -m venv venv
  }
  .\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
  Push-Location frontend
  try {
    pnpm install
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}

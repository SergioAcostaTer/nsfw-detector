#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd frontend
pnpm dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait

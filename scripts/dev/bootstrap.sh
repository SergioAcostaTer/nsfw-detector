#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

if [ ! -f "venv/bin/python" ]; then
  python -m venv venv
fi

./venv/bin/python -m pip install -r backend/requirements.txt
cd frontend
pnpm install

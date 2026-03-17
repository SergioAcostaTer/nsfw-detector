#!/bin/bash
echo "Starting NSFW Scanner..."

cd backend || exit 1
pip install -r requirements.txt -q
uvicorn app.api:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ../frontend || exit 1
pnpm install -q
pnpm dev &
FRONTEND_PID=$!

echo ""
echo "Backend  -> http://localhost:8000"
echo "Frontend -> http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait

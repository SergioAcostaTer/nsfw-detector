@echo off
echo Starting NSFW Scanner...

start "NSFW Backend" cmd /k "cd backend && pip install -r requirements.txt && uvicorn app.api:app --host 0.0.0.0 --port 8000"
timeout /t 3
start "NSFW Frontend" cmd /k "cd frontend && pnpm install && pnpm dev"

echo.
echo Backend  -^> http://localhost:8000
echo Frontend -^> http://localhost:5173
echo.
pause

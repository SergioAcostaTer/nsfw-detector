@echo off
pushd "%~dp0"
echo Starting NSFW Scanner...

if exist venv\Scripts\activate (
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

start "NSFW Backend" cmd /k "pushd ""%~dp0backend"" && ""%PYTHON_EXE%"" -m pip install -r requirements.txt && ""%PYTHON_EXE%"" init_db.py && ""%PYTHON_EXE%"" -m uvicorn app.api:app --host 0.0.0.0 --port 8000"
timeout /t 3
start "NSFW Frontend" cmd /k "pushd ""%~dp0frontend"" && pnpm install && pnpm dev"

echo.
echo Backend  -^> http://localhost:8000
echo Frontend -^> http://localhost:5173
echo.
pause
popd

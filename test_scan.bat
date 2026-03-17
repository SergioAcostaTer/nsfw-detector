@echo off
SETLOCAL EnableDelayedExpansion

echo 🛡️ NSFW Detector - Test Script
echo ===============================

:: 1. Setup Virtual Environment
if not exist "venv" (
    echo [1/4] Creating virtual environment...
    python -m venv venv
) else (
    echo [1/4] Virtual environment already exists.
)

:: 2. Activate and Install
echo [2/4] Installing dependencies...
call venv\Scripts\activate
pip install -r requirements.txt

:: 3. Run Scan
echo [3/4] Starting scan in C:\Users\Sergio\Videos...
python -m app.main scan "C:\Users\Sergio"

:: 4. Start GUI
echo [4/4] Launching Review Dashboard...
echo Dashboard will open in your browser shortly...
python -m streamlit run app/gui.py

echo Done.
pause

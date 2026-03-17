# Architecture & MVP Scope

## Pipeline
1. **Target**: Directory of images.
2. **Scanner (app/scanner/scan.py)**: Hashes files, skips already scanned, passes to Detector.
3. **Detector (app/scanner/detector.py)**: Runs ONNX model via GPU/CPU.
4. **Decision (app/scanner/decision.py)**: Applies threshold logic (Safe, Borderline, Explicit).
5. **Storage (app/db)**: Saves file path, score, and decision to SQLite.
6. **GUI (app/gui.py)**: Streamlit dashboard to visually review flagged content.

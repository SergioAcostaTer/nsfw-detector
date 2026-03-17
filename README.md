# 🛡️ NSFW Scanner

A powerful, local AI-powered image scanner to detect explicit content using `ONNX` and `OpenCV`. This tool helps you automatically identify and manage NSFW images in your local folders.

## ✨ Features
- **Fast GPU/CPU Inference**: Uses `onnxruntime` for high-performance detection.
- **Incremental Scanning**: Only scans new or modified files.
- **Review Dashboard**: Beautiful Streamlit-based GUI to review flagged content.
- **Automation Tools**: Commands to move explicit files to quarantine or delete them.

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.9+
- An NVIDIA GPU (optional, for CUDA acceleration)

### 2. Setup
1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd nsfw-detector
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Add the Model**:
   Place your NudeNet ONNX model (e.g., `nudenet.onnx`) in the `models/` directory.
   - Expected path: `models/nudenet.onnx`

### 3. Usage

#### 🔍 Scan a Folder
Run the scanner on any directory containing images. Always run from the project root using the `-m` flag to ensure proper imports:
```bash
python -m app.main scan "C:/Users/YourName/Pictures"
```
Or use the entry point:
```bash
python run.py scan "C:/Users/YourName/Pictures"
```

#### 🖥️ Review Flagged Images
Start the dashboard to review "explicit" and "borderline" detections:
```bash
python -m streamlit run app/gui.py
```

#### 📦 Management Commands
- **Quarantine**: Move all `explicit` detected images to the `./quarantine/` folder:
  ```bash
  python -m app.main quarantine
  ```
- **Delete**: Permanently delete all `explicit` detected images:
  ```bash
  python -m app.main delete
  ```

## 🛠️ Configuration
You can adjust thresholds and supported extensions in `app/config.py`.
- `EXPLICIT_THRESHOLD`: Default `0.6`
- `BORDERLINE_THRESHOLD`: Default `0.4`

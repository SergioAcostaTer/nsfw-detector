FROM python:3.11-slim

WORKDIR /app

# System dependencies for OpenCV and ONNX
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Keep the container running for CLI execs, or override in docker-compose
CMD ["tail", "-f", "/dev/null"]

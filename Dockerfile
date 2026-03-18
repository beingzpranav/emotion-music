# ── Base image ────────────────────────────────────────────────────────────────
FROM python:3.10-slim

# ── System dependencies required by OpenCV / DeepFace ─────────────────────────
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# ── Working directory ──────────────────────────────────────────────────────────
WORKDIR /app

# ── Install Python dependencies ────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy backend source ────────────────────────────────────────────────────────
COPY . .

# ── Hugging Face Spaces runs on port 7860 ─────────────────────────────────────
ENV PORT=7860

# ── Expose port ───────────────────────────────────────────────────────────────
EXPOSE 7860

# ── Start Flask ────────────────────────────────────────────────────────────────
CMD ["python", "app.py"]

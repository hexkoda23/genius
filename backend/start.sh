#!/bin/bash
# ── MathGenius Production Server Startup ─────────────────────────────────────
# Uses gunicorn with uvicorn workers for true multi-process concurrency.
# Replace the single-process "uvicorn app.main:app" dev command with this.
#
# WORKER COUNT formula:   (2 × CPU cores) + 1
#   1 core  → 3 workers
#   2 cores → 5 workers   ← most free hosting VPS
#   4 cores → 9 workers
#
# Adjust --workers below to match your server's CPU count.

exec gunicorn app.main:app \
  --workers 5 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --graceful-timeout 30 \
  --keepalive 5 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --log-level info \
  --access-logfile - \
  --error-logfile -

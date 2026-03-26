#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill anything still holding our ports
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true
sleep 1

# Start backend
cd "$SCRIPT_DIR/backend" && uvicorn main:app --host localhost --port 8000 &
BACKEND_PID=$!

# Start frontend static server
cd "$SCRIPT_DIR" && python3 serve_frontend.py &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID

#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$SCRIPT_DIR/backend" && uvicorn main:app --host localhost --port 8000 &
BACKEND_PID=$!

cd "$SCRIPT_DIR" && python3 serve_frontend.py &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID

#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill anything still holding our ports
fuser -k 5000/tcp 2>/dev/null || true
sleep 1

# Start the unified backend+frontend server on port 5000
cd "$SCRIPT_DIR/backend" && uvicorn main:app --host 0.0.0.0 --port 5000

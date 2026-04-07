#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHONLIBS="$SCRIPT_DIR/.pythonlibs"

# Kill anything still holding our ports
fuser -k 5000/tcp 2>/dev/null || true
sleep 1

# Export PYTHONPATH so Python finds installed packages
export PYTHONPATH="$PYTHONLIBS/lib/python3.12/site-packages"
export PATH="$PYTHONLIBS/bin:$PATH"

# Start the unified backend+frontend server on port 5000
cd "$SCRIPT_DIR/backend" && "$PYTHONLIBS/bin/python3" -m uvicorn main:app --host 0.0.0.0 --port 5000

#!/bin/bash
set -e

echo "=== Dynamo AI Post-Merge Setup ==="

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r backend/requirements.txt --quiet --disable-pip-version-check

echo "=== Post-Merge Setup Complete ==="

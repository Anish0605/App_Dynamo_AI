#!/bin/bash
# ============================================================
# Dynamo AI — Upload Files to Hostinger VPS
# Run this from your LOCAL machine (not Replit):
#
#   bash upload_to_hostinger.sh
#
# Requirements: ssh & scp installed on your local machine
# ============================================================

SERVER_IP="145.79.212.22"
SERVER_USER="root"         # Change if your SSH user is different
REMOTE_DIR="/var/www/dynamo-ai"

echo "📦 Uploading Dynamo AI files to Hostinger VPS..."

# Create remote directory structure
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_DIR}/backend ${REMOTE_DIR}/frontend ${REMOTE_DIR}/scripts"

# Upload backend
scp -r backend/ ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/
echo "✅ Backend uploaded"

# Upload frontend
scp -r frontend/ ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/
echo "✅ Frontend uploaded"

# Upload app.py (root entry point)
scp app.py ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/
echo "✅ app.py uploaded"

# Upload setup script
scp scripts/setup_hostinger.sh ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/
echo "✅ Setup script uploaded"

echo ""
echo "============================================================"
echo "✅ Files uploaded! Now SSH into your server and run:"
echo ""
echo "  ssh ${SERVER_USER}@${SERVER_IP}"
echo "  cd ${REMOTE_DIR}"
echo "  bash setup_hostinger.sh"
echo ""
echo "Then create your .env file (see .env.example)"
echo "============================================================"

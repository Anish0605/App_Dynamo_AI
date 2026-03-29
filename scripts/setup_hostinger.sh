#!/bin/bash
# ============================================================
# Dynamo AI — Hostinger VPS Setup Script
# Run this ONCE on your Hostinger server via SSH:
#   bash setup_hostinger.sh
# ============================================================

set -e

APP_DIR="/var/www/dynamo-ai"
SERVICE_NAME="dynamo-ai"

echo "🚀 Setting up Dynamo AI on Hostinger VPS..."

# 1. Update system & install dependencies
apt-get update -y
apt-get install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx

# 2. Create app directory
mkdir -p "$APP_DIR"
echo "✅ App directory: $APP_DIR"

# 3. Create Python virtual environment
python3 -m venv "$APP_DIR/venv"
source "$APP_DIR/venv/bin/activate"

# 4. Install Python packages
pip install --upgrade pip
pip install -r "$APP_DIR/backend/requirements.txt"
pip install gunicorn uvicorn[standard]
echo "✅ Python packages installed"

# 5. Create systemd service to keep app running
cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Dynamo AI FastAPI App
After=network.target

[Service]
User=root
WorkingDirectory=${APP_DIR}
Environment="PATH=${APP_DIR}/venv/bin"
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/venv/bin/gunicorn --bind=0.0.0.0:5000 --reuse-port --workers=2 -k uvicorn.workers.UvicornWorker app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
echo "✅ Systemd service created"

# 6. Configure Nginx reverse proxy
cat > /etc/nginx/sites-available/dynamo-ai << EOF
server {
    listen 80;
    server_name app.dynamoai.in;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/dynamo-ai /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
echo "✅ Nginx configured"

# 7. Get SSL certificate (HTTPS)
echo ""
echo "🔐 Getting SSL certificate for app.dynamoai.in..."
certbot --nginx -d app.dynamoai.in --non-interactive --agree-tos -m admin@dynamoai.in
echo "✅ SSL certificate installed"

echo ""
echo "============================================================"
echo "✅ SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "Next steps:"
echo "1. Upload your .env file to: ${APP_DIR}/.env"
echo "2. Start the app: systemctl start ${SERVICE_NAME}"
echo "3. Check status:  systemctl status ${SERVICE_NAME}"
echo "4. View logs:     journalctl -u ${SERVICE_NAME} -f"
echo ""

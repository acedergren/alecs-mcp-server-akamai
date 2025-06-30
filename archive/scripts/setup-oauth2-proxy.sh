#!/bin/bash

# OAuth2-Proxy Setup Script for GitHub Authentication

echo "Setting up OAuth2-Proxy for GitHub authentication..."

# Check if oauth2-proxy is installed
if ! command -v oauth2-proxy &> /dev/null; then
    echo "Installing oauth2-proxy..."
    
    # Download latest release
    LATEST_VERSION=$(curl -s https://api.github.com/repos/oauth2-proxy/oauth2-proxy/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
    wget "https://github.com/oauth2-proxy/oauth2-proxy/releases/download/v${LATEST_VERSION}/oauth2-proxy-v${LATEST_VERSION}.linux-amd64.tar.gz"
    
    # Extract and install
    tar -xzf "oauth2-proxy-v${LATEST_VERSION}.linux-amd64.tar.gz"
    sudo mv "oauth2-proxy-v${LATEST_VERSION}.linux-amd64/oauth2-proxy" /usr/local/bin/
    rm -rf "oauth2-proxy-v${LATEST_VERSION}.linux-amd64"*
    
    echo "OAuth2-proxy installed successfully"
fi

# Create directories
sudo mkdir -p /etc/oauth2-proxy
sudo mkdir -p /var/log/oauth2-proxy

# Generate cookie secret if not provided
if [ -z "$COOKIE_SECRET" ]; then
    echo "Generating cookie secret..."
    COOKIE_SECRET=$(openssl rand -base64 32 | tr -- '+/' '-_')
    echo "Cookie secret generated: $COOKIE_SECRET"
fi

# Setup systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/oauth2-proxy.service > /dev/null <<EOF
[Unit]
Description=OAuth2 Proxy
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
ExecStart=/usr/local/bin/oauth2-proxy --config=/etc/oauth2-proxy/oauth2-proxy.cfg
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=oauth2-proxy

[Install]
WantedBy=multi-user.target
EOF

# Instructions
echo ""
echo "OAuth2-Proxy setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a GitHub OAuth App:"
echo "   - Go to https://github.com/settings/developers"
echo "   - Click 'New OAuth App'"
echo "   - Application name: 'Code Server Access'"
echo "   - Homepage URL: https://code.yourdomain.com"
echo "   - Authorization callback URL: https://code.yourdomain.com/oauth2/callback"
echo ""
echo "2. Update the configuration file: /home/alex/alecs-mcp-server-akamai/config/oauth2-proxy.cfg"
echo "   - Set client_id from GitHub"
echo "   - Set client_secret from GitHub"
echo "   - Set cookie_secret to: $COOKIE_SECRET"
echo ""
echo "3. Copy config and start the service:"
echo "   sudo cp /home/alex/alecs-mcp-server-akamai/config/oauth2-proxy.cfg /etc/oauth2-proxy/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable oauth2-proxy"
echo "   sudo systemctl start oauth2-proxy"
echo ""
echo "4. Configure Nginx and get SSL certificates"
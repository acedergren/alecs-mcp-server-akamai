# Remote MCP Server Deployment Guide

This guide covers setting up the MCP Akamai server for remote access with secure authentication.

## Architecture Overview

```
Internet → Nginx (SSL) → OAuth2-Proxy (GitHub Auth) → Code-Server/MCP Server
                     ↓
              web01.cloud.solutionsedge.io
                     ↓
        ┌────────────┴────────────┐
        │                         │
    /code/ (IDE)            /api/mcp/ (API)
        │                         │
    Code-Server              MCP Server
    (port 8080)             (port 3000)
```

## Prerequisites

- Ubuntu/Debian server with root access
- Domain name pointing to your server (web01.cloud.solutionsedge.io)
- GitHub account for OAuth authentication
- Node.js 18+ installed
- PM2 installed globally: `npm install -g pm2`

## Step 1: Build and Install MCP Server

```bash
cd /home/alex/alecs-mcp-server-akamai

# Install dependencies
npm install

# Build the project (after TypeScript fixes are complete)
npm run build

# Create logs directory
mkdir -p logs
```

## Step 2: Set up PM2 Process Manager

```bash
# Start MCP servers with PM2
./scripts/pm2-setup.sh all

# Or start only specific servers:
# ./scripts/pm2-setup.sh full      # Full server only
# ./scripts/pm2-setup.sh essentials # Essentials only
# ./scripts/pm2-setup.sh modular    # Modular servers

# Check status
pm2 status

# View logs
pm2 logs mcp-akamai-full
```

## Step 3: Configure GitHub OAuth

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Application name: `SolutionsEdge Code Server`
   - Homepage URL: `https://web01.cloud.solutionsedge.io`
   - Authorization callback URL: `https://web01.cloud.solutionsedge.io/oauth2/callback`
4. Save the Client ID and Client Secret

## Step 4: Set up OAuth2-Proxy

```bash
# Run the setup script
./scripts/setup-oauth2-proxy.sh

# Edit the configuration
nano config/oauth2-proxy.cfg

# Update these values:
# - client_id = "your-github-client-id"
# - client_secret = "your-github-client-secret"
# - cookie_secret = "generated-secret-from-script"
# - redirect_url = "https://web01.cloud.solutionsedge.io/oauth2/callback"

# Copy config and start service
sudo cp config/oauth2-proxy.cfg /etc/oauth2-proxy/
sudo systemctl daemon-reload
sudo systemctl enable oauth2-proxy
sudo systemctl start oauth2-proxy

# Check status
sudo systemctl status oauth2-proxy
```

## Step 5: Configure Code-Server

```bash
# Edit code-server config
nano ~/.config/code-server/config.yaml

# Set it to:
# bind-addr: 127.0.0.1:8080
# auth: none  # OAuth2-proxy handles auth
# cert: false

# Restart code-server
sudo systemctl restart code-server@$USER
```

## Step 6: Set up SSL Certificates

```bash
# Edit the script to add your email
nano scripts/setup-ssl-certificates.sh

# Run the script
sudo ./scripts/setup-ssl-certificates.sh

# Verify certificate
sudo certbot certificates
```

## Step 7: Configure Nginx

```bash
# Copy the configuration
sudo cp nginx/web01-cloud-solutionsedge.conf /etc/nginx/sites-available/

# Enable the site
sudo ln -s /etc/nginx/sites-available/web01-cloud-solutionsedge.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 8: Create Landing Page (Optional)

```bash
# Create web directory
sudo mkdir -p /var/www/web01

# Create a simple landing page
sudo tee /var/www/web01/index.html > /dev/null <<'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>SolutionsEdge Development Platform</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .link { display: inline-block; margin: 10px; padding: 10px 20px;
                background: #007bff; color: white; text-decoration: none;
                border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>SolutionsEdge Development Platform</h1>
        <p>Secure development environment with GitHub authentication.</p>
        <a href="/code/" class="link">Open Code Server</a>
        <a href="/api/mcp/" class="link">MCP API Endpoint</a>
    </div>
</body>
</html>
EOF
```

## Step 9: Test the Setup

1. **Test OAuth2-Proxy**: `curl -I http://localhost:4180/ping`
2. **Test Code-Server**: `curl -I http://localhost:8080`
3. **Test MCP Server**: `curl -I http://localhost:3000/health`
4. **Test Nginx**: Visit https://web01.cloud.solutionsedge.io

## Security Checklist

- [ ] SSL certificates installed and auto-renewal configured
- [ ] OAuth2-proxy configured with GitHub authentication
- [ ] Code-server auth disabled (handled by OAuth2-proxy)
- [ ] Firewall configured to only allow ports 80, 443
- [ ] PM2 configured to auto-start on reboot
- [ ] Nginx security headers configured
- [ ] Regular backups configured

## Monitoring

```bash
# View PM2 dashboard
pm2 monit

# Check logs
pm2 logs

# View Nginx access logs
sudo tail -f /var/log/nginx/web01-access.log

# View OAuth2-proxy logs
sudo journalctl -u oauth2-proxy -f

# View code-server logs
sudo journalctl -u code-server@$USER -f
```

## Troubleshooting

### OAuth2-Proxy Issues

- Check GitHub OAuth app settings match your domain
- Verify cookie_secret is properly set
- Check logs: `sudo journalctl -u oauth2-proxy -n 100`

### SSL Certificate Issues

- Ensure port 80 is open during certificate generation
- Check DNS is properly configured
- Verify with: `sudo certbot certificates`

### Code-Server Issues

- Ensure it's bound to localhost only (127.0.0.1:8080)
- Check WebSocket upgrade headers in Nginx
- Verify with: `sudo systemctl status code-server@$USER`

### MCP Server Issues

- Check PM2 logs: `pm2 logs mcp-akamai-full`
- Verify build completed successfully
- Test locally: `curl http://localhost:3000/health`

## Maintenance

### Update MCP Server

```bash
cd /home/alex/alecs-mcp-server-akamai
git pull
npm install
npm run build
pm2 reload all
```

### Renew SSL Certificates

Certificates auto-renew, but to manually renew:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### View Resource Usage

```bash
pm2 status
pm2 show mcp-akamai-full
htop
```

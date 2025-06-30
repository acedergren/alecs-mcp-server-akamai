# Claude Desktop WebSocket Integration Guide

This guide explains how to connect Claude Desktop to a remote ALECS MCP server using WebSocket.

## Overview

ALECS supports WebSocket connections, allowing you to:
- Run ALECS on a server or cloud instance
- Connect from Claude Desktop on your local machine
- Access all 180+ Akamai tools remotely
- Use secure token-based authentication

## Prerequisites

1. **Server Requirements**:
   - Node.js 18+ installed
   - ALECS server set up and configured
   - Port 8082 open for WebSocket connections
   - Valid Akamai API credentials in `~/.edgerc`

2. **Client Requirements**:
   - Claude Desktop installed
   - Network access to the ALECS server
   - Generated API token from ALECS

## Server Setup

### 1. Install and Configure ALECS

```bash
# Clone and install ALECS
git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
cd alecs-mcp-server-akamai
npm install
npm run build

# Configure Akamai credentials
cp .edgerc.example ~/.edgerc
# Edit ~/.edgerc with your Akamai API credentials
```

### 2. Start the WebSocket Server

```bash
# Start in development mode
npm run start:websocket

# Or use PM2 for production
npm run deploy:websocket

# Verify it's running
pm2 status
```

### 3. Generate Authentication Token

```bash
# Generate a new API token
npm run generate-token

# Example output:
# ✅ API Token Generated Successfully
# Token: NJn6J0Z7Hq0WkXGCGnv5ESzGJZTiabHIe9I9u509OyI
# Token ID: tok_95c60907606b4856
# ⚠️ IMPORTANT: Save this token securely. It will not be shown again.
```

### 4. Configure Firewall (if needed)

```bash
# Ubuntu/Debian
sudo ufw allow 8082

# Red Hat/CentOS
sudo firewall-cmd --add-port=8082/tcp --permanent
sudo firewall-cmd --reload
```

## Claude Desktop Configuration

### Method 1: WebSocket Client Bridge (Recommended)

This method uses a local client script to bridge stdio to WebSocket.

1. **On your local machine**, clone the repository:
   ```bash
   git clone https://github.com/acedergren/alecs-mcp-server-akamai.git
   cd alecs-mcp-server-akamai
   npm install ws
   ```

2. **Edit Claude Desktop config**:
   
   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   **Linux**: `~/.config/claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "alecs-akamai": {
         "command": "node",
         "args": ["/path/to/alecs-mcp-server-akamai/websocket-client.js"],
         "env": {
           "ALECS_WS_URL": "ws://your-server-ip:8082/mcp",
           "ALECS_TOKEN": "your-generated-token"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop**

### Method 2: Direct WebSocket (Future Support)

When Claude Desktop adds native WebSocket support:

```json
{
  "mcpServers": {
    "alecs-akamai": {
      "transport": "websocket",
      "url": "ws://your-server-ip:8082/mcp",
      "headers": {
        "Authorization": "Bearer your-generated-token"
      }
    }
  }
}
```

### Method 3: SSH Tunnel (Most Secure)

For maximum security, use an SSH tunnel:

1. **Create SSH tunnel**:
   ```bash
   ssh -L 8082:localhost:8082 user@your-server-ip
   ```

2. **Configure Claude Desktop** to use localhost:
   ```json
   {
     "mcpServers": {
       "alecs-akamai": {
         "command": "node",
         "args": ["/path/to/websocket-client.js"],
         "env": {
           "ALECS_WS_URL": "ws://localhost:8082/mcp",
           "ALECS_TOKEN": "your-generated-token"
         }
       }
     }
   }
   ```

## Secure WebSocket (WSS) Setup

### Option 1: Built-in SSL Support

1. **Generate SSL certificates**:
   ```bash
   # Using Let's Encrypt
   sudo certbot certonly --standalone -d your-domain.com
   ```

2. **Configure ALECS environment**:
   ```bash
   # Create .env file
   cat > .env << EOF
   ALECS_SSL_CERT=/etc/letsencrypt/live/your-domain.com/fullchain.pem
   ALECS_SSL_KEY=/etc/letsencrypt/live/your-domain.com/privkey.pem
   ALECS_WS_PORT=8082
   EOF
   ```

3. **Update Claude Desktop config**:
   ```json
   {
     "env": {
       "ALECS_WS_URL": "wss://your-domain.com:8082/mcp"
     }
   }
   ```

### Option 2: Nginx Reverse Proxy

1. **Configure nginx**:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location /mcp {
           proxy_pass http://localhost:8082;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Authorization $http_authorization;
           proxy_read_timeout 3600s;
       }
   }
   ```

2. **Update Claude Desktop**:
   ```json
   {
     "env": {
       "ALECS_WS_URL": "wss://your-domain.com/mcp"
     }
   }
   ```

## Token Management

### List Active Tokens
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list-api-tokens"},"id":1}' | node dist/index-full.js
```

### Revoke a Token
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"revoke-api-token","arguments":{"tokenId":"tok_xxx"}},"id":1}' | node dist/index-full.js
```

### Set Token Expiration
When generating tokens, you can set expiration:
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"generate-api-token","arguments":{"description":"Claude Desktop","expiresInDays":30}},"id":1}' | node dist/index-full.js
```

## Verification

1. **Test WebSocket connection**:
   ```bash
   # Install wscat globally
   npm install -g wscat
   
   # Test connection
   wscat -c ws://your-server:8082/mcp -H "Authorization: Bearer your-token"
   ```

2. **Check server logs**:
   ```bash
   pm2 logs mcp-akamai-websocket
   ```

3. **Verify in Claude Desktop**:
   - Open Claude Desktop
   - The ALECS server should appear in the MCP servers list
   - Try a simple command like "list Akamai properties"

## Troubleshooting

### Connection Refused
- Check server is running: `pm2 status`
- Verify port is open: `netstat -tuln | grep 8082`
- Check firewall settings
- Test locally first: `ws://localhost:8082/mcp`

### Authentication Failed
- Verify token is correct (no extra spaces)
- Check token hasn't been revoked
- Ensure Authorization header format: `Bearer <token>`
- Generate a new token if needed

### Connection Drops
- Check `pm2 logs` for errors
- Increase timeout settings
- Verify network stability
- Enable WebSocket keepalive

### SSL/Certificate Issues
- Verify certificate paths are correct
- Check certificate validity: `openssl x509 -in cert.pem -text`
- Ensure intermediate certificates are included
- Check nginx error logs if using reverse proxy

## Security Best Practices

1. **Always use SSL/TLS in production**
2. **Set token expiration dates**
3. **Rotate tokens regularly**
4. **Use environment variables for sensitive data**
5. **Restrict server access with firewall rules**
6. **Monitor access logs regularly**
7. **Use SSH tunnels for maximum security**

## Advanced Configuration

### Environment Variables
```bash
ALECS_WS_PORT=8082           # WebSocket port
ALECS_WS_HOST=0.0.0.0        # Listen on all interfaces
ALECS_WS_PATH=/mcp           # WebSocket path
TOKEN_MASTER_KEY=secret      # Master key for token encryption
ALECS_SSL_CERT=/path/to/cert # SSL certificate
ALECS_SSL_KEY=/path/to/key   # SSL private key
```

### Docker Deployment
```yaml
version: '3.8'
services:
  alecs-websocket:
    build: .
    ports:
      - "8082:8082"
    environment:
      - TOKEN_MASTER_KEY=${TOKEN_MASTER_KEY}
    volumes:
      - ~/.edgerc:/root/.edgerc:ro
```

## Support

- [GitHub Issues](https://github.com/acedergren/alecs-mcp-server-akamai/issues)
- [Wiki Documentation](https://github.com/acedergren/alecs-mcp-server-akamai/wiki)
- [MCP Protocol Docs](https://modelcontextprotocol.io)
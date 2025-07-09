#!/bin/bash

# ALECS MCP Server - Cursor IDE One-Click Installer
# This script installs ALECS and configures Cursor IDE automatically

set -e

echo "🎯 ALECS MCP Server - Cursor IDE Installer"
echo "=========================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if Cursor is installed
CURSOR_FOUND=false
if command -v cursor &> /dev/null; then
    CURSOR_FOUND=true
elif [[ "$OSTYPE" == "darwin"* ]] && [ -d "/Applications/Cursor.app" ]; then
    CURSOR_FOUND=true
elif [[ "$OSTYPE" == "linux-gnu"* ]] && command -v cursor &> /dev/null; then
    CURSOR_FOUND=true
fi

if [ "$CURSOR_FOUND" = false ]; then
    echo "⚠️  Warning: Cursor IDE not found"
    echo "Please install Cursor from: https://cursor.sh/"
    echo "Continuing with installation..."
fi

echo "📦 Step 1: Installing ALECS MCP Server..."
npm install -g alecs-mcp-server-akamai

echo "✅ ALECS installed successfully!"
echo ""

echo "🔧 Step 2: Configuring Cursor IDE..."

# Create the MCP server configuration for Cursor
MCP_CONFIG='{
  "alecs-akamai": {
    "command": "alecs",
    "args": [],
    "env": {
      "MCP_TRANSPORT": "stdio"
    }
  }
}'

# Base64 encode the configuration
BASE64_CONFIG=$(echo "$MCP_CONFIG" | base64 | tr -d '\n')

# Create the Cursor deep link
CURSOR_DEEP_LINK="cursor://anysphere.cursor-deeplink/mcp/install?name=alecs-akamai&config=$BASE64_CONFIG"

echo "🎯 Cursor Deep Link Generated!"
echo "You can install ALECS in Cursor using one of these methods:"
echo ""
echo "Method 1: Click the deep link (if running in a browser/terminal that supports it)"
echo "$CURSOR_DEEP_LINK"
echo ""
echo "Method 2: Manual installation in Cursor"
echo "1. Copy this deep link: $CURSOR_DEEP_LINK"
echo "2. Paste it in your browser or terminal"
echo "3. Cursor will prompt to install the MCP server"
echo ""
echo "Method 3: Traditional settings configuration"
echo "1. Open Cursor Settings"
echo "2. Add MCP server configuration:"
echo "$MCP_CONFIG"
echo ""

# Try to open the deep link automatically
if command -v open &> /dev/null; then
    echo "🚀 Attempting to open Cursor deep link automatically..."
    open "$CURSOR_DEEP_LINK" 2>/dev/null && echo "✅ Deep link opened successfully!" || echo "⚠️  Could not open deep link automatically"
elif command -v xdg-open &> /dev/null; then
    echo "🚀 Attempting to open Cursor deep link automatically..."
    xdg-open "$CURSOR_DEEP_LINK" 2>/dev/null && echo "✅ Deep link opened successfully!" || echo "⚠️  Could not open deep link automatically"
else
    echo "⚠️  Cannot open deep link automatically. Please copy and paste the link manually."
fi

echo ""

echo "📝 Step 3: Setting up Akamai credentials..."
EDGERC_FILE="$HOME/.edgerc"

if [ ! -f "$EDGERC_FILE" ]; then
    echo "Creating template .edgerc file..."
    cat > "$EDGERC_FILE" << 'EOF'
[default]
client_secret = your_client_secret_here
host = your_host.luna.akamaiapis.net
access_token = your_access_token_here
client_token = your_client_token_here

# Optional: Add more customer sections
# [customer2]
# client_secret = customer2_client_secret
# host = customer2_host.luna.akamaiapis.net
# access_token = customer2_access_token
# client_token = customer2_client_token
EOF
    
    chmod 600 "$EDGERC_FILE"
    echo "⚠️  Please edit $EDGERC_FILE with your Akamai API credentials"
    echo "   You can get these from: https://control.akamai.com/apps/auth-api"
else
    echo "✅ .edgerc file already exists"
fi

echo ""
echo "🎉 Installation Complete!"
echo "========================"
echo ""
echo "Next steps:"
echo "1. Edit $EDGERC_FILE with your Akamai API credentials"
echo "2. Restart Cursor IDE"
echo "3. Open Command Palette (Cmd/Ctrl + Shift + P)"
echo "4. Search for 'MCP' to verify ALECS is available"
echo "5. Try asking: 'List my Akamai properties'"
echo ""
echo "Configuration files:"
echo "- Cursor settings: $SETTINGS_FILE"
echo "- Akamai credentials: $EDGERC_FILE"
echo ""
echo "Manual setup instructions:"
echo "1. Open Cursor Settings (Cmd/Ctrl + ,)"
echo "2. Search for 'MCP' or navigate to Extensions → MCP"
echo "3. Verify 'alecs-akamai' server is listed"
echo ""
echo "For help and documentation:"
echo "- GitHub: https://github.com/acedergren/alecs-mcp-server-akamai"
echo "- Run: alecs --help"
echo ""
echo "Happy coding! 🎯"
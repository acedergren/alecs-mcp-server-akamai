#!/bin/bash

# ALECS MCP Server - Claude Desktop One-Click Installer
# This script installs ALECS and configures Claude Desktop automatically

set -e

echo "🚀 ALECS MCP Server - Claude Desktop Installer"
echo "=============================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if Claude Desktop is installed
CLAUDE_CONFIG_DIR=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
    if [ ! -d "/Applications/Claude.app" ]; then
        echo "⚠️  Warning: Claude Desktop not found in /Applications/"
        echo "Please install Claude Desktop from: https://claude.ai/download"
        echo "Continuing with configuration..."
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash/Cygwin)
    CLAUDE_CONFIG_DIR="$APPDATA/Claude"
else
    echo "❌ Error: Unsupported operating system: $OSTYPE"
    exit 1
fi

echo "📦 Step 1: Installing ALECS MCP Server..."
npm install -g alecs-mcp-server-akamai

echo "✅ ALECS installed successfully!"
echo ""

echo "🔧 Step 2: Configuring Claude Desktop..."

# Create Claude config directory if it doesn't exist
mkdir -p "$CLAUDE_CONFIG_DIR"

# Create Claude Desktop configuration
CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
cat > "$CONFIG_FILE" << 'EOF'
{
  "mcpServers": {
    "alecs-akamai": {
      "command": "alecs",
      "args": [],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
EOF

echo "✅ Claude Desktop configured successfully!"
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
echo "2. Restart Claude Desktop"
echo "3. Try asking: 'List my Akamai properties'"
echo ""
echo "Configuration files:"
echo "- Claude Desktop: $CONFIG_FILE"
echo "- Akamai credentials: $EDGERC_FILE"
echo ""
echo "For help and documentation:"
echo "- GitHub: https://github.com/acedergren/alecs-mcp-server-akamai"
echo "- Run: alecs --help"
echo ""
echo "Happy automating! 🚀"
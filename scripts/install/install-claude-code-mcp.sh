#!/bin/bash

# ALECS MCP Server - Claude Code MCP Integration Installer
# Uses Claude Code's native MCP support with simple command

set -e

echo "⚡ ALECS MCP Server - Claude Code MCP Integration Installer"
echo "========================================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if Claude Code is installed
CLAUDE_CODE_FOUND=false
if command -v claude &> /dev/null; then
    CLAUDE_CODE_FOUND=true
fi

if [ "$CLAUDE_CODE_FOUND" = false ]; then
    echo "⚠️  Warning: Claude Code CLI not found"
    echo "Installing Claude Code CLI..."
    npm install -g claude-code || {
        echo "❌ Error: Failed to install Claude Code CLI"
        echo "Please install manually: npm install -g claude-code"
        exit 1
    }
fi

echo "📦 Step 1: Installing ALECS MCP Server..."
npm install -g alecs-mcp-server-akamai

echo "✅ ALECS installed successfully!"
echo ""

echo "🔧 Step 2: Adding ALECS to Claude Code..."

# Add ALECS MCP server to Claude Code
echo "Adding ALECS MCP server to Claude Code..."
claude mcp add alecs-akamai alecs || {
    echo "❌ Error: Failed to add ALECS to Claude Code"
    echo "Please try manually: claude mcp add alecs-akamai alecs"
    exit 1
}

echo "✅ ALECS MCP server added to Claude Code successfully!"
echo ""

echo "🔍 Step 3: Verifying installation..."

# Verify the installation
echo "Verifying ALECS is listed in Claude Code MCP servers..."
if claude mcp list | grep -q "alecs-akamai"; then
    echo "✅ ALECS MCP server verified in Claude Code!"
else
    echo "⚠️  ALECS may not be properly registered. Please check manually:"
    echo "Run: claude mcp list"
fi

echo ""

echo "📝 Step 4: Setting up Akamai credentials..."
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
echo "2. Test the installation:"
echo "   claude mcp list"
echo "3. Start using ALECS with Claude Code:"
echo "   claude \"List my Akamai properties\""
echo ""
echo "Configuration files:"
echo "- Akamai credentials: $EDGERC_FILE"
echo "- Claude Code MCP config: Managed automatically by Claude Code"
echo ""
echo "Useful Claude Code commands:"
echo "- claude mcp list              # List all MCP servers"
echo "- claude mcp remove alecs-akamai  # Remove ALECS if needed"
echo "- claude mcp add alecs-akamai alecs  # Re-add ALECS if needed"
echo "- claude --help                # Show Claude Code help"
echo ""
echo "Example usage:"
echo "- claude \"Show my Akamai properties\""
echo "- claude \"Create DNS zone for example.com\""
echo "- claude \"Purge cache for /images/*\""
echo "- claude \"Check SSL certificate status\""
echo ""
echo "For help and documentation:"
echo "- GitHub: https://github.com/acedergren/alecs-mcp-server-akamai"
echo "- Run: alecs --help"
echo "- Claude Code: claude --help"
echo ""
echo "Lightning fast automation! ⚡"
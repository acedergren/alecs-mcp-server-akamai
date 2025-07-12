#!/bin/bash

# ALECS MCP Server - Windsurf MCP Integration Installer
# Uses Windsurf's native MCP support with mcp_config.json configuration

set -e

echo "🌊 ALECS MCP Server - Windsurf MCP Integration Installer"
echo "======================================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if Windsurf is installed
WINDSURF_FOUND=false
if command -v windsurf &> /dev/null; then
    WINDSURF_FOUND=true
elif [[ "$OSTYPE" == "darwin"* ]] && [ -d "/Applications/Windsurf.app" ]; then
    WINDSURF_FOUND=true
elif [[ "$OSTYPE" == "linux-gnu"* ]] && command -v windsurf &> /dev/null; then
    WINDSURF_FOUND=true
fi

if [ "$WINDSURF_FOUND" = false ]; then
    echo "⚠️  Warning: Windsurf not found"
    echo "Please install Windsurf from: https://windsurf.ai/"
    echo "Continuing with installation..."
fi

echo "📦 Step 1: Installing ALECS MCP Server..."
npm install -g alecs-mcp-server-akamai

echo "✅ ALECS installed successfully!"
echo ""

echo "🔧 Step 2: Configuring Windsurf MCP..."

# Determine Windsurf config directory
WINDSURF_CONFIG_DIR="$HOME/.codeium/windsurf"
mkdir -p "$WINDSURF_CONFIG_DIR"

# Create MCP configuration file
MCP_CONFIG_FILE="$WINDSURF_CONFIG_DIR/mcp_config.json"

# Check if config file already exists
if [ -f "$MCP_CONFIG_FILE" ]; then
    echo "⚠️  MCP configuration file already exists at $MCP_CONFIG_FILE"
    echo "Creating backup..."
    cp "$MCP_CONFIG_FILE" "$MCP_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Try to merge with existing config
    echo "Attempting to merge with existing configuration..."
    TEMP_FILE=$(mktemp)
    
    # Use jq to merge if available, otherwise manual merge
    if command -v jq &> /dev/null; then
        jq '.mcpServers."alecs-akamai" = {
          "command": "alecs",
          "args": [],
          "env": {
            "MCP_TRANSPORT": "stdio"
          }
        }' "$MCP_CONFIG_FILE" > "$TEMP_FILE"
        mv "$TEMP_FILE" "$MCP_CONFIG_FILE"
        echo "✅ Configuration merged successfully using jq"
    else
        echo "⚠️  jq not available for automatic merging"
        echo "Please manually add the following to your $MCP_CONFIG_FILE:"
        echo '"alecs-akamai": {'
        echo '  "command": "alecs",'
        echo '  "args": [],'
        echo '  "env": {'
        echo '    "MCP_TRANSPORT": "stdio"'
        echo '  }'
        echo '}'
    fi
else
    # Create new config file
    echo "Creating new MCP configuration..."
    cat > "$MCP_CONFIG_FILE" << 'EOF'
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
    echo "✅ Windsurf MCP configuration created successfully!"
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
echo "2. Restart Windsurf"
echo "3. Open the Cascade panel (AI assistant)"
echo "4. Verify ALECS tools are available in the tool list"
echo "5. Try asking: 'List my Akamai properties'"
echo ""
echo "Configuration files:"
echo "- Windsurf MCP config: $MCP_CONFIG_FILE"
echo "- Akamai credentials: $EDGERC_FILE"
echo ""
echo "Alternative installation methods:"
echo "1. Plugin Store (if available):"
echo "   - Open Windsurf → Plugins → Search for 'ALECS'"
echo "   - Click 'Install' if available"
echo ""
echo "2. Manual configuration:"
echo "   - Open Windsurf Settings → Cascade → Plugins"
echo "   - Add MCP server configuration manually"
echo ""
echo "Enterprise users:"
echo "- MCP must be manually enabled via settings"
echo "- Team admins can whitelist approved MCP servers"
echo ""
echo "Tool limit: 100 total tools per Cascade instance"
echo ""
echo "For help and documentation:"
echo "- GitHub: https://github.com/acedergren/alecs-mcp-server-akamai"
echo "- Run: alecs --help"
echo ""
echo "Surf the waves of automation! 🌊"
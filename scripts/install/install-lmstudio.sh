#!/bin/bash

# ALECS MCP Server - LM Studio MCP Integration Installer
# Uses LM Studio's native MCP support with deep link configuration

set -e

echo "🎬 ALECS MCP Server - LM Studio MCP Integration Installer"
echo "========================================================"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if LM Studio is installed
LMSTUDIO_FOUND=false
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if [ -d "/Applications/LM Studio.app" ]; then
        LMSTUDIO_FOUND=true
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if [ -d "$HOME/.local/share/LM Studio" ] || [ -d "/opt/LM Studio" ]; then
        LMSTUDIO_FOUND=true
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    if [ -d "$APPDATA/LM Studio" ] || [ -d "$LOCALAPPDATA/LM Studio" ]; then
        LMSTUDIO_FOUND=true
    fi
fi

if [ "$LMSTUDIO_FOUND" = false ]; then
    echo "⚠️  Warning: LM Studio not found"
    echo "Please install LM Studio from: https://lmstudio.ai/"
    echo "Continuing with installation..."
fi

echo "📦 Step 1: Installing ALECS MCP Server..."
npm install -g alecs-mcp-server-akamai

echo "✅ ALECS installed successfully!"
echo ""

echo "🔗 Step 2: Generating LM Studio deep link..."

# Generate deep link using our button generator
if [ -f "scripts/generate-lmstudio-button.js" ]; then
    DEEP_LINK=$(node scripts/generate-lmstudio-button.js | grep "lmstudio://" | head -1)
else
    # Fallback manual generation
    CONFIG='{"alecs-akamai":{"command":"alecs","args":[],"env":{"MCP_TRANSPORT":"stdio"}}}'
    BASE64_CONFIG=$(echo -n "$CONFIG" | base64 | tr -d '\n')
    DEEP_LINK="lmstudio://mcp/install?name=alecs-akamai&config=$BASE64_CONFIG"
fi

echo "✅ Deep link generated: $DEEP_LINK"
echo ""

echo "🎬 Step 3: Installing ALECS in LM Studio..."

# Try to open the deep link
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$DEEP_LINK" 2>/dev/null || {
        echo "⚠️  Could not open deep link automatically."
        echo "Please click this link manually: $DEEP_LINK"
    }
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "$DEEP_LINK" 2>/dev/null || {
        echo "⚠️  Could not open deep link automatically."
        echo "Please click this link manually: $DEEP_LINK"
    }
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    start "$DEEP_LINK" 2>/dev/null || {
        echo "⚠️  Could not open deep link automatically."
        echo "Please click this link manually: $DEEP_LINK"
    }
else
    echo "⚠️  Could not open deep link automatically."
    echo "Please click this link manually: $DEEP_LINK"
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
echo "2. Open LM Studio"
echo "3. Go to the My Models tab"
echo "4. Look for 'ALECS' in the MCP tools section"
echo "5. If not installed, click the deep link again: $DEEP_LINK"
echo "6. Start a chat and try: 'List my Akamai properties'"
echo ""
echo "Configuration files:"
echo "- LM Studio MCP config: Managed automatically by LM Studio"
echo "- Akamai credentials: $EDGERC_FILE"
echo ""
echo "Manual installation (if deep link fails):"
echo "1. Open LM Studio"
echo "2. Go to My Models → Developer"
echo "3. Click 'Add MCP Server'"
echo "4. Name: alecs-akamai"
echo "5. Command: alecs"
echo "6. Arguments: (leave empty)"
echo "7. Environment: MCP_TRANSPORT=stdio"
echo ""
echo "LM Studio features:"
echo "- Local LLM execution with MCP tools"
echo "- No internet required for model inference"
echo "- Support for 100+ open-source models"
echo "- Tool usage tracking and analytics"
echo ""
echo "For help and documentation:"
echo "- GitHub: https://github.com/acedergren/alecs-mcp-server-akamai"
echo "- Run: alecs --help"
echo "- LM Studio: https://lmstudio.ai/docs"
echo ""
echo "Lights, camera, automation! 🎬"
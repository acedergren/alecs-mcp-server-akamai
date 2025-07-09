#!/bin/bash

# ALECS MCP Server - Homebrew Installation Script
# Installs ALECS via Homebrew for macOS and Linux

set -e

echo "🍺 ALECS MCP Server - Homebrew Installation"
echo "=========================================="
echo ""

# Check if running on supported OS
if [[ "$OSTYPE" != "darwin"* ]] && [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ Error: Homebrew installation is only supported on macOS and Linux"
    echo "Please use npm installation instead:"
    echo "npm install -g alecs-mcp-server-akamai"
    exit 1
fi

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Error: Homebrew is not installed"
    echo "Install Homebrew first:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    else
        echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    fi
    exit 1
fi

echo "📦 Step 1: Updating Homebrew..."
brew update

echo "🔧 Step 2: Installing ALECS via Homebrew..."

# Check if our tap exists (for future use)
if brew tap-info acedergren/alecs &> /dev/null; then
    echo "Using custom tap: acedergren/alecs"
    brew install acedergren/alecs/alecs
else
    # For now, install via npm through node
    echo "Installing ALECS via npm (using Homebrew's node)..."
    if ! brew list node &> /dev/null; then
        echo "Installing Node.js via Homebrew..."
        brew install node
    fi
    
    # Install ALECS globally via npm
    npm install -g alecs-mcp-server-akamai
fi

echo "✅ ALECS installed successfully!"
echo ""

echo "🔍 Step 3: Verifying installation..."
if command -v alecs &> /dev/null; then
    echo "✅ ALECS command is available"
    alecs --version
else
    echo "❌ ALECS command not found in PATH"
    echo "You may need to restart your terminal or add npm global binaries to PATH"
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
echo "2. Choose your AI client integration:"
echo ""
echo "   Available integration commands:"
echo "   • Claude Desktop:    curl -sSL https://raw.githubusercontent.com/acedergren/alecs-mcp-server-akamai/main/scripts/install-claude-desktop.sh | bash"
echo "   • Cursor IDE:        curl -sSL https://raw.githubusercontent.com/acedergren/alecs-mcp-server-akamai/main/scripts/install-cursor.sh | bash"
echo "   • LM Studio:         curl -sSL https://raw.githubusercontent.com/acedergren/alecs-mcp-server-akamai/main/scripts/install-lmstudio.sh | bash"
echo "   • VS Code:           curl -sSL https://raw.githubusercontent.com/acedergren/alecs-mcp-server-akamai/main/scripts/install-vscode.sh | bash"
echo "   • Windsurf:          curl -sSL https://raw.githubusercontent.com/acedergren/alecs-mcp-server-akamai/main/scripts/install-windsurf.sh | bash"
echo "   • Claude Code:       claude mcp add alecs-akamai alecs"
echo ""
echo "3. Test the installation:"
echo "   alecs --help"
echo ""
echo "Homebrew management:"
echo "- Update ALECS:    brew upgrade alecs-mcp-server-akamai"
echo "- Uninstall:       brew uninstall alecs-mcp-server-akamai"
echo "- List versions:   brew list --versions alecs-mcp-server-akamai"
echo ""
echo "For help and documentation:"
echo "- GitHub: https://github.com/acedergren/alecs-mcp-server-akamai"
echo "- Run: alecs --help"
echo ""
echo "Cheers to automation! 🍺"
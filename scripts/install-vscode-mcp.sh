#!/bin/bash

# ALECS MCP Server - VS Code MCP Integration Installer
# Uses VS Code's native MCP support with .vscode/mcp.json configuration

set -e

echo "💻 ALECS MCP Server - VS Code MCP Integration Installer"
echo "======================================================"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if VS Code is installed
CODE_FOUND=false
CODE_CMD="code"
if command -v code &> /dev/null; then
    CODE_FOUND=true
elif [[ "$OSTYPE" == "darwin"* ]] && [ -d "/Applications/Visual Studio Code.app" ]; then
    CODE_FOUND=true
    CODE_CMD="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
elif [[ "$OSTYPE" == "linux-gnu"* ]] && command -v code &> /dev/null; then
    CODE_FOUND=true
fi

if [ "$CODE_FOUND" = false ]; then
    echo "⚠️  Warning: VS Code not found"
    echo "Please install VS Code from: https://code.visualstudio.com/"
    echo "Continuing with configuration..."
fi

echo "📦 Step 1: Installing ALECS MCP Server..."
npm install -g alecs-mcp-server-akamai

echo "✅ ALECS installed successfully!"
echo ""

echo "🔧 Step 2: Creating VS Code MCP Configuration..."

# Create .vscode directory if it doesn't exist
mkdir -p .vscode

# Create MCP configuration file
MCP_CONFIG_FILE=".vscode/mcp.json"

cat > "$MCP_CONFIG_FILE" << 'EOF'
{
  "inputs": [
    {
      "type": "promptString",
      "id": "akamai-edgerc-path",
      "description": "Path to your .edgerc file",
      "default": "~/.edgerc"
    }
  ],
  "servers": {
    "alecs-akamai": {
      "type": "stdio",
      "command": "alecs",
      "args": [],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "EDGERC_PATH": "${input:akamai-edgerc-path}"
      },
      "description": "ALECS MCP Server for Akamai CDN management"
    }
  }
}
EOF

echo "✅ VS Code MCP configuration created: $MCP_CONFIG_FILE"
echo ""

echo "🔌 Step 3: Installing GitHub Copilot Chat Extension (if needed)..."
if [ "$CODE_FOUND" = true ]; then
    # Install GitHub Copilot Chat extension (required for MCP support)
    echo "Installing GitHub Copilot Chat extension..."
    $CODE_CMD --install-extension GitHub.copilot-chat --force || {
        echo "⚠️  Could not install GitHub Copilot Chat extension automatically"
        echo "Please install it manually from VS Code Extensions marketplace"
        echo "Extension ID: GitHub.copilot-chat"
    }
else
    echo "⚠️  Cannot install extension - VS Code not found"
    echo "Please install GitHub Copilot Chat extension manually after installing VS Code"
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
echo "2. Open VS Code in this directory: code ."
echo "3. Open the Chat view (⌃⌘I on Mac, Ctrl+Alt+I on Windows/Linux)"
echo "4. Select 'Agent mode' from the dropdown"
echo "5. Click the 'Tools' button to see ALECS tools"
echo "6. Try asking: 'List my Akamai properties'"
echo ""
echo "Configuration files:"
echo "- VS Code MCP config: $MCP_CONFIG_FILE"
echo "- Akamai credentials: $EDGERC_FILE"
echo ""
echo "Manual setup instructions:"
echo "1. Ensure you have GitHub Copilot Chat extension installed"
echo "2. Create .vscode/mcp.json with the server configuration"
echo "3. Use Chat view in Agent mode with Tools enabled"
echo ""
echo "Command-line alternative:"
echo "code --add-mcp alecs-akamai"
echo ""
echo "For help and documentation:"
echo "- GitHub: https://github.com/acedergren/alecs-mcp-server-akamai"
echo "- Run: alecs --help"
echo ""
echo "Happy coding with VS Code! 💻"
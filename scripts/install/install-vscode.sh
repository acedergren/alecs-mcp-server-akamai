#!/bin/bash

# ALECS MCP Server - VS Code One-Click Installer
# This script installs ALECS, MCP extension, and configures VS Code automatically

set -e

echo "💻 ALECS MCP Server - VS Code Installer"
echo "======================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if VS Code is installed
CODE_FOUND=false
if command -v code &> /dev/null; then
    CODE_FOUND=true
elif [[ "$OSTYPE" == "darwin"* ]] && [ -d "/Applications/Visual Studio Code.app" ]; then
    CODE_FOUND=true
    alias code="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
elif [[ "$OSTYPE" == "linux-gnu"* ]] && command -v code &> /dev/null; then
    CODE_FOUND=true
fi

if [ "$CODE_FOUND" = false ]; then
    echo "⚠️  Warning: VS Code not found"
    echo "Please install VS Code from: https://code.visualstudio.com/"
    echo "Continuing with installation..."
fi

echo "📦 Step 1: Installing ALECS MCP Server..."
npm install -g alecs-mcp-server-akamai

echo "✅ ALECS installed successfully!"
echo ""

echo "🔌 Step 2: Installing MCP Extension for VS Code..."
if [ "$CODE_FOUND" = true ]; then
    # Install MCP extension (using placeholder extension ID)
    echo "Installing MCP extension..."
    code --install-extension modelcontextprotocol.mcp-vscode || {
        echo "⚠️  Could not install MCP extension automatically"
        echo "Please install it manually from VS Code Marketplace"
        echo "Search for: 'Model Context Protocol'"
    }
else
    echo "⚠️  Cannot install extension - VS Code not found"
    echo "Please install MCP extension manually after installing VS Code"
fi

echo ""

echo "🔧 Step 3: Configuring VS Code..."

# Determine VS Code settings directory
VSCODE_SETTINGS_DIR=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    VSCODE_SETTINGS_DIR="$HOME/Library/Application Support/Code/User"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    VSCODE_SETTINGS_DIR="$HOME/.config/Code/User"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash/Cygwin)
    VSCODE_SETTINGS_DIR="$APPDATA/Code/User"
else
    echo "❌ Error: Unsupported operating system: $OSTYPE"
    exit 1
fi

# Create VS Code settings directory if it doesn't exist
mkdir -p "$VSCODE_SETTINGS_DIR"

# Create or update VS Code settings
SETTINGS_FILE="$VSCODE_SETTINGS_DIR/settings.json"
TEMP_FILE=$(mktemp)

if [ -f "$SETTINGS_FILE" ]; then
    # Update existing settings
    echo "Updating existing VS Code settings..."
    
    # Check if MCP settings already exist
    if grep -q "mcp.servers" "$SETTINGS_FILE"; then
        echo "⚠️  MCP settings already exist in VS Code settings"
        echo "Please manually add ALECS configuration to $SETTINGS_FILE"
        echo ""
        echo "Add this to your MCP servers configuration:"
        echo '"alecs-akamai": {'
        echo '  "command": "alecs",'
        echo '  "args": [],'
        echo '  "env": {'
        echo '    "MCP_TRANSPORT": "stdio"'
        echo '  }'
        echo '}'
    else
        # Add MCP settings to existing file
        # Remove last brace, add MCP settings, then add closing brace
        sed '$ d' "$SETTINGS_FILE" > "$TEMP_FILE"
        cat >> "$TEMP_FILE" << 'EOF'
  "mcp.servers": {
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
        mv "$TEMP_FILE" "$SETTINGS_FILE"
        echo "✅ VS Code settings updated successfully!"
    fi
else
    # Create new settings file
    echo "Creating new VS Code settings..."
    cat > "$SETTINGS_FILE" << 'EOF'
{
  "mcp.servers": {
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
    echo "✅ VS Code settings created successfully!"
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
echo "2. Restart VS Code"
echo "3. Open Command Palette (Cmd/Ctrl + Shift + P)"
echo "4. Search for 'MCP: Add Server' to verify setup"
echo "5. Try asking: 'List my Akamai properties'"
echo ""
echo "Configuration files:"
echo "- VS Code settings: $SETTINGS_FILE"
echo "- Akamai credentials: $EDGERC_FILE"
echo ""
echo "Manual setup instructions:"
echo "1. Install MCP extension from VS Code Marketplace"
echo "2. Open Command Palette (Cmd/Ctrl + Shift + P)"
echo "3. Run 'MCP: Add Server'"
echo "4. Configure:"
echo "   - Name: alecs-akamai"
echo "   - Command: alecs"
echo "   - Transport: stdio"
echo ""
echo "For help and documentation:"
echo "- GitHub: https://github.com/acedergren/alecs-mcp-server-akamai"
echo "- Run: alecs --help"
echo ""
echo "Happy coding! 💻"
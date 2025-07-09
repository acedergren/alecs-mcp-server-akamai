#!/bin/bash

# ALECS MCP Server - Windsurf One-Click Installer
# This script installs ALECS and configures Windsurf automatically

set -e

echo "🌊 ALECS MCP Server - Windsurf Installer"
echo "========================================"
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

echo "🔧 Step 2: Configuring Windsurf..."

# Determine Windsurf settings directory
WINDSURF_SETTINGS_DIR=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    WINDSURF_SETTINGS_DIR="$HOME/Library/Application Support/Windsurf/User"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    WINDSURF_SETTINGS_DIR="$HOME/.config/Windsurf/User"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash/Cygwin)
    WINDSURF_SETTINGS_DIR="$APPDATA/Windsurf/User"
else
    echo "❌ Error: Unsupported operating system: $OSTYPE"
    exit 1
fi

# Create Windsurf settings directory if it doesn't exist
mkdir -p "$WINDSURF_SETTINGS_DIR"

# Create or update Windsurf settings
SETTINGS_FILE="$WINDSURF_SETTINGS_DIR/settings.json"
TEMP_FILE=$(mktemp)

if [ -f "$SETTINGS_FILE" ]; then
    # Update existing settings
    echo "Updating existing Windsurf settings..."
    
    # Check if MCP settings already exist
    if grep -q "mcp.servers" "$SETTINGS_FILE"; then
        echo "⚠️  MCP settings already exist in Windsurf settings"
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
        echo "✅ Windsurf settings updated successfully!"
    fi
else
    # Create new settings file
    echo "Creating new Windsurf settings..."
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
    echo "✅ Windsurf settings created successfully!"
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
echo "3. Open Windsurf settings to verify MCP configuration"
echo "4. Try asking: 'List my Akamai properties'"
echo ""
echo "Configuration files:"
echo "- Windsurf settings: $SETTINGS_FILE"
echo "- Akamai credentials: $EDGERC_FILE"
echo ""
echo "Manual setup instructions:"
echo "1. Open Windsurf Settings"
echo "2. Navigate to MCP Servers section"
echo "3. Add new server:"
echo "   - Name: alecs-akamai"
echo "   - Command: alecs"
echo "   - Transport: stdio"
echo "4. Save and restart Windsurf"
echo ""
echo "For help and documentation:"
echo "- GitHub: https://github.com/acedergren/alecs-mcp-server-akamai"
echo "- Run: alecs --help"
echo ""
echo "Surf the waves of automation! 🌊"
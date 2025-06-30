#!/bin/bash

# Setup script for ALECS Modular Servers in Claude Desktop

echo "🚀 ALECS Modular Server Setup for Claude Desktop"
echo "================================================"

# Get the current directory
CURRENT_DIR=$(pwd)

# Claude Desktop config path
CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

echo ""
echo "📍 Current directory: $CURRENT_DIR"
echo "📍 Claude Desktop config: $CONFIG_PATH"

# Check if config exists
if [ ! -f "$CONFIG_PATH" ]; then
    echo "❌ Claude Desktop config not found at $CONFIG_PATH"
    echo "Creating new config file..."
    mkdir -p "$(dirname "$CONFIG_PATH")"
    echo '{"mcpServers": {}}' > "$CONFIG_PATH"
fi

# Create backup
cp "$CONFIG_PATH" "$CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Generate the modular server configuration
cat > claude_desktop_config_modular_temp.json << EOF
{
  "mcpServers": {
    "alecs-property": {
      "command": "node",
      "args": ["$CURRENT_DIR/dist/servers/property-server.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "$HOME/.edgerc"
      }
    },
    "alecs-dns": {
      "command": "node",
      "args": ["$CURRENT_DIR/dist/servers/dns-server.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "$HOME/.edgerc"
      }
    },
    "alecs-certs": {
      "command": "node",
      "args": ["$CURRENT_DIR/dist/servers/certs-server.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "$HOME/.edgerc"
      }
    },
    "alecs-reporting": {
      "command": "node",
      "args": ["$CURRENT_DIR/dist/servers/reporting-server.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "$HOME/.edgerc"
      }
    },
    "alecs-security": {
      "command": "node",
      "args": ["$CURRENT_DIR/dist/servers/security-server.js"],
      "env": {
        "AKAMAI_EDGERC_PATH": "$HOME/.edgerc"
      }
    }
  }
}
EOF

echo ""
echo "📋 Generated configuration:"
cat claude_desktop_config_modular_temp.json

echo ""
echo "Choose an option:"
echo "1) Replace entire Claude Desktop config (⚠️  removes other MCP servers)"
echo "2) Add ALECS servers to existing config (recommended)"
echo "3) Show config and exit (manual setup)"

read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "Replacing entire config..."
        mv claude_desktop_config_modular_temp.json "$CONFIG_PATH"
        echo "✅ Config replaced"
        ;;
    2)
        echo "Merging with existing config..."
        # Use jq if available, otherwise use Python
        if command -v jq &> /dev/null; then
            jq -s '.[0] * .[1]' "$CONFIG_PATH" claude_desktop_config_modular_temp.json > "$CONFIG_PATH.new"
            mv "$CONFIG_PATH.new" "$CONFIG_PATH"
        elif command -v python3 &> /dev/null; then
            python3 << 'PYTHON_SCRIPT'
import json
import sys

with open("$CONFIG_PATH", 'r') as f:
    existing = json.load(f)

with open("claude_desktop_config_modular_temp.json", 'r') as f:
    new_servers = json.load(f)

# Merge the configurations
if "mcpServers" not in existing:
    existing["mcpServers"] = {}

existing["mcpServers"].update(new_servers["mcpServers"])

with open("$CONFIG_PATH", 'w') as f:
    json.dump(existing, f, indent=2)
PYTHON_SCRIPT
        else
            echo "❌ Neither jq nor python3 found. Please install one of them or merge manually."
            exit 1
        fi
        echo "✅ ALECS servers added to config"
        ;;
    3)
        echo "Manual setup - copy the configuration above to your Claude Desktop config"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Cleanup
rm -f claude_desktop_config_modular_temp.json

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop to load the new configuration"
echo "2. Look for the ALECS servers in Claude Desktop:"
echo "   - alecs-property (32 tools)"
echo "   - alecs-dns (24 tools)"
echo "   - alecs-certs (22 tools)"
echo "   - alecs-reporting (25 tools)"
echo "   - alecs-security (95 tools)"
echo ""
echo "3. Test with: 'List my Akamai properties using alecs-property'"
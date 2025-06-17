#!/bin/bash

# Claude Desktop Setup Script for ALECS MCP Server
# This script helps configure Claude Desktop to use ALECS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

# Detect OS and set config path
if [[ "$OSTYPE" == "darwin"* ]]; then
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    CLAUDE_CONFIG_DIR="$APPDATA/Claude"
else
    echo "⚠️  Unknown OS: $OSTYPE"
    echo "Please manually configure Claude Desktop"
    exit 1
fi

CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

echo "🚀 ALECS MCP Server - Claude Desktop Setup"
echo "=========================================="
echo ""
echo "📁 Project Directory: $PROJECT_DIR"
echo "📄 Claude Config: $CLAUDE_CONFIG_FILE"
echo ""
echo "Available server configurations:"
echo "  1) Full Server (180 tools) - All Akamai services"
echo "  2) Essential Server (15 tools) - Core functionality only"
echo "  3) Modular Servers (coming soon) - Individual service modules"
echo ""
read -p "Which configuration would you like to install? (1-3) [1]: " CONFIG_CHOICE
CONFIG_CHOICE=${CONFIG_CHOICE:-1}

# Check if Claude config directory exists
if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    echo "❌ Claude Desktop config directory not found!"
    echo "   Please ensure Claude Desktop is installed."
    exit 1
fi

# Build the project if dist doesn't exist
if [ ! -f "$PROJECT_DIR/dist/index.js" ]; then
    echo "🔨 Building ALECS..."
    cd "$PROJECT_DIR"
    npm install
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed! Please run 'npm install && npm run build' manually."
        exit 1
    fi
fi

# Determine which config to use based on user choice
case $CONFIG_CHOICE in
    2)
        echo ""
        echo "📦 Configuring Essential Server (15 tools)..."
        SERVER_NAME="alecs-essential"
        INDEX_FILE="$PROJECT_DIR/dist/index-essential.js"
        DEV_INDEX_FILE="src/index-essential.ts"
        ;;
    3)
        echo ""
        echo "📦 Configuring Modular Servers..."
        echo ""
        echo "Available modules:"
        echo "  a) alecs-property - Property Manager (32 tools)"
        echo "  b) alecs-dns - DNS Management (24 tools)"
        echo "  c) alecs-certs - Certificate Management (22 tools)"
        echo "  d) alecs-reporting - Analytics & Reporting (25 tools)"
        echo "  e) alecs-security - Security & Protection (95 tools)"
        echo "  f) All modules"
        echo ""
        read -p "Which modules would you like to install? (a-f) [f]: " MODULE_CHOICE
        MODULE_CHOICE=${MODULE_CHOICE:-f}
        MODULAR_CONFIG=true
        ;;
    *)
        echo ""
        echo "📦 Configuring Full Server (180 tools)..."
        SERVER_NAME="alecs-mcp-server-akamai"
        INDEX_FILE="$PROJECT_DIR/dist/index.js"
        DEV_INDEX_FILE="src/index.ts"
        ;;
esac

# Create config JSON
if [ "$MODULAR_CONFIG" = "true" ]; then
    # Handle modular configuration
    CONFIG_JSON='{\n  "mcpServers": {\n'
    
    add_module() {
        local name=$1
        local file=$2
        if [ "$CONFIG_JSON" != '{\n  "mcpServers": {\n' ]; then
            CONFIG_JSON+=",\n"
        fi
        CONFIG_JSON+="    \"$name\": {\n"
        CONFIG_JSON+="      \"command\": \"node\",\n"
        CONFIG_JSON+="      \"args\": [\"$PROJECT_DIR/dist/servers/$file\"],\n"
        CONFIG_JSON+="      \"cwd\": \"$PROJECT_DIR\",\n"
        CONFIG_JSON+="      \"env\": {\n"
        CONFIG_JSON+="        \"DEBUG\": \"0\",\n"
        CONFIG_JSON+="        \"DEFAULT_CUSTOMER\": \"default\",\n"
        CONFIG_JSON+="        \"NODE_ENV\": \"production\"\n"
        CONFIG_JSON+="      }\n"
        CONFIG_JSON+="    }"
    }
    
    case $MODULE_CHOICE in
        a) add_module "alecs-property" "property-server.js" ;;
        b) add_module "alecs-dns" "dns-server.js" ;;
        c) add_module "alecs-certs" "certs-server.js" ;;
        d) add_module "alecs-reporting" "reporting-server.js" ;;
        e) add_module "alecs-security" "security-server.js" ;;
        f|*)
            add_module "alecs-property" "property-server.js"
            add_module "alecs-dns" "dns-server.js"
            add_module "alecs-certs" "certs-server.js"
            add_module "alecs-reporting" "reporting-server.js"
            add_module "alecs-security" "security-server.js"
            ;;
    esac
    
    CONFIG_JSON+="\n  }\n}"
    CONFIG_JSON=$(echo -e "$CONFIG_JSON")
else
    # Single server configuration
    CONFIG_JSON=$(cat <<EOF
{
  "mcpServers": {
    "$SERVER_NAME": {
      "command": "node",
      "args": ["$INDEX_FILE"],
      "cwd": "$PROJECT_DIR",
      "env": {
        "DEBUG": "0",
        "DEFAULT_CUSTOMER": "default",
        "NODE_ENV": "production"
      }
    },
    "${SERVER_NAME}-dev": {
      "command": "npx",
      "args": ["tsx", "$DEV_INDEX_FILE"],
      "cwd": "$PROJECT_DIR",
      "env": {
        "DEBUG": "1",
        "DEFAULT_CUSTOMER": "default",
        "NODE_ENV": "development"
      }
    }
  }
}
EOF
)
fi

# Check if config file exists
if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    echo "⚠️  Existing Claude Desktop config found!"
    echo ""
    echo "Please add the following to your $CLAUDE_CONFIG_FILE:"
    echo ""
    echo "----------------------------------------"
    echo "$CONFIG_JSON"
    echo "----------------------------------------"
    echo ""
    echo "You'll need to merge this with your existing mcpServers section."
else
    # Create new config file
    echo "$CONFIG_JSON" > "$CLAUDE_CONFIG_FILE"
    echo "✅ Created Claude Desktop config at: $CLAUDE_CONFIG_FILE"
fi

# Check for .edgerc
if [ ! -f "$HOME/.edgerc" ]; then
    echo ""
    echo "⚠️  Warning: No .edgerc file found at ~/.edgerc"
    echo "   You'll need to create this file with your Akamai credentials."
    echo "   See: https://developer.akamai.com/api/getting-started"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop"
if [ "$MODULAR_CONFIG" = "true" ]; then
    echo "2. Look for your selected modules in the MCP menu (🔌):"
    case $MODULE_CHOICE in
        a) echo "   - alecs-property" ;;
        b) echo "   - alecs-dns" ;;
        c) echo "   - alecs-certs" ;;
        d) echo "   - alecs-reporting" ;;
        e) echo "   - alecs-security" ;;
        f|*)
            echo "   - alecs-property"
            echo "   - alecs-dns"
            echo "   - alecs-certs"
            echo "   - alecs-reporting"
            echo "   - alecs-security"
            ;;
    esac
    echo "3. Test with module-specific commands:"
    echo "   - Property: 'List my Akamai properties'"
    echo "   - DNS: 'List my DNS zones'"
    echo "   - Certs: 'List certificate enrollments'"
    echo "   - Reporting: 'Get traffic report for my properties'"
    echo "   - Security: 'List network lists'"
else
    echo "2. Look for '$SERVER_NAME' in the MCP menu (🔌)"
    if [ "$CONFIG_CHOICE" = "2" ]; then
        echo "3. Test with essential tools: 'List my Akamai properties' or 'List DNS zones'"
        echo ""
        echo "ℹ️  Note: The Essential Server includes only 15 core tools."
        echo "   If you need full functionality, re-run setup and choose option 1."
    else
        echo "3. Test by asking: 'List my Akamai properties'"
    fi
fi
echo ""
echo "For troubleshooting, see CLAUDE_DESKTOP_SETUP.md"
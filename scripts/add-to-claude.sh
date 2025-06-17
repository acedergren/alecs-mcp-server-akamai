#!/bin/bash

# Script to add ALECS MCP servers to Claude Desktop from terminal

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Claude Desktop config path
CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if a server is already configured
server_exists() {
    local server_name=$1
    if [ -f "$CONFIG_PATH" ]; then
        grep -q "\"$server_name\"" "$CONFIG_PATH" && return 0 || return 1
    fi
    return 1
}

# Function to add a server to config
add_server() {
    local server_name=$1
    local server_path=$2
    local description=$3
    
    if server_exists "$server_name"; then
        print_color $YELLOW "⚠️  $server_name already exists in config"
        return 1
    fi
    
    # Create config object for this server
    local server_config=$(cat <<EOF
    "$server_name": {
      "command": "node",
      "args": ["$server_path"],
      "env": {
        "AKAMAI_EDGERC_PATH": "$HOME/.edgerc"
      }
    }
EOF
)
    
    # Add to config using jq or python
    if command -v jq &> /dev/null; then
        # Use jq to add the server
        local temp_file=$(mktemp)
        jq --arg name "$server_name" \
           --arg path "$server_path" \
           '.mcpServers[$name] = {"command": "node", "args": [$path], "env": {"AKAMAI_EDGERC_PATH": "'"$HOME/.edgerc"'"}}' \
           "$CONFIG_PATH" > "$temp_file" && mv "$temp_file" "$CONFIG_PATH"
    else
        # Use Python as fallback
        python3 -c "
import json
import sys

config_path = '$CONFIG_PATH'
server_name = '$server_name'
server_path = '$server_path'

try:
    with open(config_path, 'r') as f:
        config = json.load(f)
except:
    config = {'mcpServers': {}}

if 'mcpServers' not in config:
    config['mcpServers'] = {}

config['mcpServers'][server_name] = {
    'command': 'node',
    'args': [server_path],
    'env': {'AKAMAI_EDGERC_PATH': '$HOME/.edgerc'}
}

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
"
    fi
    
    print_color $GREEN "✅ Added $server_name - $description"
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  all              Add all ALECS servers (property, dns, certs, reporting, security)"
    echo "  essentials       Add essentials server only"
    echo "  property         Add property server only"
    echo "  dns              Add DNS server only"
    echo "  certs            Add certificate server only"
    echo "  reporting        Add reporting server only"
    echo "  security         Add security server only"
    echo "  remove <name>    Remove a specific server"
    echo "  list             List currently configured ALECS servers"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 all           # Add all modular servers"
    echo "  $0 property dns  # Add property and DNS servers"
    echo "  $0 remove alecs-security  # Remove security server"
}

# Function to list configured ALECS servers
list_servers() {
    if [ ! -f "$CONFIG_PATH" ]; then
        print_color $RED "❌ Claude Desktop config not found"
        return 1
    fi
    
    print_color $BLUE "📋 Configured ALECS Servers:"
    
    if command -v jq &> /dev/null; then
        jq -r '.mcpServers | to_entries[] | select(.key | startswith("alecs")) | .key' "$CONFIG_PATH" 2>/dev/null || echo "None found"
    else
        python3 -c "
import json
config = json.load(open('$CONFIG_PATH'))
servers = [k for k in config.get('mcpServers', {}).keys() if k.startswith('alecs')]
print('\n'.join(servers) if servers else 'None found')
"
    fi
}

# Function to remove a server
remove_server() {
    local server_name=$1
    
    if [ ! -f "$CONFIG_PATH" ]; then
        print_color $RED "❌ Claude Desktop config not found"
        return 1
    fi
    
    if command -v jq &> /dev/null; then
        local temp_file=$(mktemp)
        jq "del(.mcpServers[\"$server_name\"])" "$CONFIG_PATH" > "$temp_file" && mv "$temp_file" "$CONFIG_PATH"
    else
        python3 -c "
import json
config = json.load(open('$CONFIG_PATH'))
if 'mcpServers' in config and '$server_name' in config['mcpServers']:
    del config['mcpServers']['$server_name']
    json.dump(config, open('$CONFIG_PATH', 'w'), indent=2)
    print('Removed')
else:
    print('Not found')
" | grep -q "Removed"
    fi
    
    if [ $? -eq 0 ]; then
        print_color $GREEN "✅ Removed $server_name"
    else
        print_color $YELLOW "⚠️  $server_name not found in config"
    fi
}

# Main script
main() {
    # Check if config directory exists
    if [ ! -d "$(dirname "$CONFIG_PATH")" ]; then
        print_color $RED "❌ Claude Desktop not found. Please install Claude Desktop first."
        exit 1
    fi
    
    # Create config file if it doesn't exist
    if [ ! -f "$CONFIG_PATH" ]; then
        print_color $YELLOW "Creating new Claude Desktop config..."
        mkdir -p "$(dirname "$CONFIG_PATH")"
        echo '{"mcpServers": {}}' > "$CONFIG_PATH"
    fi
    
    # Create backup
    cp "$CONFIG_PATH" "$CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Check if project is built
    if [ ! -d "$PROJECT_DIR/dist" ]; then
        print_color $RED "❌ Project not built. Run 'npm run build' first."
        exit 1
    fi
    
    # Parse arguments
    if [ $# -eq 0 ]; then
        usage
        exit 0
    fi
    
    case "$1" in
        all)
            print_color $BLUE "🚀 Adding all ALECS modular servers..."
            add_server "alecs-property" "$PROJECT_DIR/dist/servers/property-server.js" "Property management (32 tools)"
            add_server "alecs-dns" "$PROJECT_DIR/dist/servers/dns-server.js" "DNS management (24 tools)"
            add_server "alecs-certs" "$PROJECT_DIR/dist/servers/certs-server.js" "Certificate management (22 tools)"
            add_server "alecs-reporting" "$PROJECT_DIR/dist/servers/reporting-server.js" "Analytics & reporting (25 tools)"
            add_server "alecs-security" "$PROJECT_DIR/dist/servers/security-server.js" "Security & protection (95 tools)"
            ;;
        essentials)
            print_color $BLUE "🎯 Adding essentials server..."
            add_server "alecs-essentials" "$PROJECT_DIR/dist/index-essential.js" "Core features only (~60 tools)"
            ;;
        property)
            add_server "alecs-property" "$PROJECT_DIR/dist/servers/property-server.js" "Property management (32 tools)"
            ;;
        dns)
            add_server "alecs-dns" "$PROJECT_DIR/dist/servers/dns-server.js" "DNS management (24 tools)"
            ;;
        certs)
            add_server "alecs-certs" "$PROJECT_DIR/dist/servers/certs-server.js" "Certificate management (22 tools)"
            ;;
        reporting)
            add_server "alecs-reporting" "$PROJECT_DIR/dist/servers/reporting-server.js" "Analytics & reporting (25 tools)"
            ;;
        security)
            add_server "alecs-security" "$PROJECT_DIR/dist/servers/security-server.js" "Security & protection (95 tools)"
            ;;
        remove)
            if [ -z "$2" ]; then
                print_color $RED "❌ Please specify server name to remove"
                exit 1
            fi
            remove_server "$2"
            ;;
        list)
            list_servers
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            # Handle multiple servers
            for server in "$@"; do
                case "$server" in
                    property|dns|certs|reporting|security)
                        $0 "$server"
                        ;;
                    *)
                        print_color $RED "❌ Unknown option: $server"
                        ;;
                esac
            done
            ;;
    esac
    
    if [ "$1" != "list" ] && [ "$1" != "help" ] && [ "$1" != "--help" ] && [ "$1" != "-h" ]; then
        echo ""
        print_color $YELLOW "⚠️  Please restart Claude Desktop to apply changes"
        echo ""
        print_color $GREEN "📝 Next steps:"
        echo "  1. Quit Claude Desktop completely"
        echo "  2. Start Claude Desktop again"
        echo "  3. Test with a command like: 'List my Akamai properties'"
    fi
}

main "$@"
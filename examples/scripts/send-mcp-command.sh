#!/bin/bash

# Script to send MCP commands to the running server
# This script automatically detects its location and finds the project root

# Detect the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Calculate project root (two directories up from scripts directory)
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Define important paths relative to project root
PROPERTY_SERVER_PATH="$PROJECT_ROOT/dist/servers/property-server.js"
MAIN_SERVER_PATH="$PROJECT_ROOT/dist/index.js"

# Verify that the project structure is correct
if [ ! -d "$PROJECT_ROOT/dist" ]; then
    echo "❌ Error: Could not find dist directory at: $PROJECT_ROOT/dist"
    echo "   Please ensure you are running this script from within the alecs-mcp-server-akamai project"
    echo "   and that the project has been built (npm run build)"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "   Please install Node.js to run the MCP server"
    exit 1
fi

echo "🚀 Sending command to running MCP server..."
echo "   Project root: $PROJECT_ROOT"
echo ""

# First, let's list available tools
echo '📋 Listing available tools...'
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | nc -N localhost 3000 2>/dev/null || {
    # If netcat doesn't work, the server might be using stdio
    # Let's create a command file
    echo "Server might be using stdio. Let me create a command to test..."
    
    # Check if it's the property server or main server
    if ps aux | grep -q "property-server.js"; then
        echo "Property server is running with onboarding tools!"
    else
        echo "Main server is running. Checking available tools..."
    fi
}

echo ""
echo "To onboard code.solutionsedge.io, you can:"
echo ""
echo "1. If using stdio (most likely), send this to the server's stdin:"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"onboard-property","arguments":{"hostname":"code.solutionsedge.io","originHostname":"origin-code.solutionsedge.io","contractId":"ctr_1-5C13O2","groupId":"grp_18543","useCase":"web-app","notificationEmails":["test@solutionsedge.io"],"dnsProvider":"edge-dns"}}}'
echo ""
echo "2. Or restart with the property server for full onboarding support:"
echo "   pkill -f 'node.*alecs-mcp-server'"

# Check if property server exists before suggesting to run it
if [ -f "$PROPERTY_SERVER_PATH" ]; then
    echo "   node \"$PROPERTY_SERVER_PATH\""
else
    echo "   ⚠️  Warning: Property server not found at: $PROPERTY_SERVER_PATH"
    echo "   Please build the project first with: npm run build"
fi

# Exit successfully
exit 0
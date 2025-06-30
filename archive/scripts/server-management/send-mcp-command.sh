#!/bin/bash

# Script to send MCP commands to the running server
# The server is already running on PID 398146

echo "🚀 Sending command to running MCP server..."
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
echo "   node /home/alex/alecs-mcp-server-akamai/dist/servers/property-server.js"
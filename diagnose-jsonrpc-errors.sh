#!/bin/bash

# Diagnostic script for JSON-RPC errors in ALECS MCP Server

echo "=== ALECS MCP Server JSON-RPC Diagnostics ==="
echo

# Function to test JSON-RPC communication
test_jsonrpc() {
    local server_path="$1"
    local server_name="$2"
    
    echo "Testing $server_name..."
    
    # Create a temporary file for the response
    RESPONSE_FILE=$(mktemp)
    
    # Send a valid JSON-RPC request to list tools
    echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | \
        timeout 2 node "$server_path" 2>/dev/null | \
        head -n 1 > "$RESPONSE_FILE"
    
    if [ -s "$RESPONSE_FILE" ]; then
        echo "✅ Server responds to JSON-RPC requests"
        echo "Response: $(cat "$RESPONSE_FILE")"
    else
        echo "❌ Server did not respond"
    fi
    
    # Test for prompts/list (expected to fail)
    echo '{"jsonrpc":"2.0","method":"prompts/list","params":{},"id":2}' | \
        timeout 2 node "$server_path" 2>/dev/null | \
        head -n 1 > "$RESPONSE_FILE"
    
    if grep -q "Method not found" "$RESPONSE_FILE" 2>/dev/null; then
        echo "✅ Correctly returns 'Method not found' for unsupported prompts/list"
    else
        echo "Response to prompts/list: $(cat "$RESPONSE_FILE")"
    fi
    
    rm -f "$RESPONSE_FILE"
    echo
}

# Test unified server
test_jsonrpc "dist/index.js" "Unified Orchestrator"

# Test individual servers
test_jsonrpc "dist/servers/property-server.js" "Property Server"

echo "=== Common JSON-RPC Errors Explained ==="
echo
echo "1. 'Method not found' for prompts/list:"
echo "   - This is EXPECTED behavior"
echo "   - ALECS servers only implement tools, not prompts"
echo "   - Claude Desktop checks for all capabilities"
echo "   - Safe to ignore these errors"
echo
echo "2. If you see other JSON-RPC errors:"
echo "   - Check that Node.js version is 18+"
echo "   - Ensure .edgerc file exists and has valid credentials"
echo "   - Look for console.log statements that might pollute stdout"
echo
echo "=== Checking for Common Issues ==="
echo

# Check Node version
NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"
if [[ "$NODE_VERSION" < "v18" ]]; then
    echo "❌ Node.js version is too old. Please upgrade to v18 or higher"
else
    echo "✅ Node.js version is compatible"
fi

# Check .edgerc
if [ -f "$HOME/.edgerc" ]; then
    echo "✅ .edgerc file exists"
else
    echo "❌ .edgerc file not found in home directory"
fi

# Check for console.log pollution
echo
echo "Checking for console.log statements that might cause issues..."
if grep -r "console\.log" src/ --include="*.ts" | grep -v "safe-console" | grep -v "test" > /dev/null; then
    echo "⚠️  Found console.log statements that might pollute stdout"
    echo "   The safe-console module should redirect these to stderr"
else
    echo "✅ No problematic console.log statements found"
fi

echo
echo "=== Recommendations ==="
echo
echo "If you're seeing JSON-RPC errors other than 'Method not found' for prompts:"
echo "1. Run: npm run build"
echo "2. Restart Claude Desktop completely"
echo "3. Check Claude Desktop logs for more details"
echo "4. Try the unified server configuration (see fix-claude-desktop.sh)"